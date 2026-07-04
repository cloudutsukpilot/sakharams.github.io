---
layout: post
title: Debugging a Stubborn TLS Handshake to get SonarQube MCP Server Back Online
categories: [ArtificialIntelligence, ModelContextProtocol]
tags: [Artificial Intelligence(AI), Model Context Protocol(MCP), TLS,]
---

# Debugging a Stubborn TLS Handshake: Getting the SonarQube MCP Server Back Online

## The Symptom

It started simply enough: I tried to spin up the SonarQube MCP server (`sonarsource/sonarqube-mcp`, running via Docker) and instead of a clean `initialize` handshake, the logs showed this:

```
Exception in thread "main" java.util.concurrent.CompletionException: javax.net.ssl.SSLHandshakeException: (certificate_unknown) The certificate chain is not trusted
	at java.base/java.util.concurrent.CompletableFuture.reportJoin(Unknown Source)
	at java.base/java.util.concurrent.CompletableFuture.join(Unknown Source)
```

No project list, no tools, just a JVM throwing its hands up over TLS. My first instinct was *"okay, something's wrong with the SonarQube token or URL"* — but `certificate_unknown` is a very specific error. It doesn't mean "bad credentials." It means the TLS handshake itself failed because the client (the JVM inside the container) couldn't validate the certificate presented by the server. That's a trust-chain problem, not an auth problem. So before touching any tokens, I focused on the cert chain.

The MCP server was configured in VSCode with the below configuration:

```json

"io.github.SonarSource/sonarqube-mcp-server": {
    "type": "stdio",
    "command": "docker",
    "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "SONARQUBE_TOKEN",
        "-e",
        "SONARQUBE_ORG",
        "-e",
        "SONARQUBE_URL",
        "sonarqube-mcp-corp:latest"
    ],
    "env": {
        "SONARQUBE_TOKEN": "${input:SONARQUBE_TOKEN}",
        "SONARQUBE_ORG": "${input:SONARQUBE_ORG}",
        "SONARQUBE_URL": "${input:SONARQUBE_URL}"
    },
    "gallery": "https://api.mcp.github.com",
    "version": "1.21.0"
}
```

## Step 1: Recognizing the Pattern

Working inside a corporate network, the first suspect for *any* unexplained `SSLHandshakeException` should always be TLS-inspecting proxies — Zscaler in our case. These proxies terminate outbound HTTPS, inspect it, and re-sign it with their own root CA. Your OS and browsers trust that CA because IT pushes it out via device management. But a brand-new Docker container? It has no idea that CA exists. It only trusts whatever CA bundle shipped with its base image.

So the logic was:
1. The host machine can talk to sonarcloud.io just fine (browser works).
2. The container, which shares the network but not the trust store, cannot.
3. Therefore, the missing ingredient is almost certainly the corporate root CA inside the container's trust store.

A quick check confirmed the Zscaler root CA was already sitting on the host at zscaler-root-ca.pem — so this wasn't something I needed to source, just something I needed to *deliver into the container*.

## Step 2: Understanding What's Actually Inside the Container

Before writing any Dockerfile, I wanted to know exactly what I was dealing with — no point guessing at cert paths and package managers. A one-off `docker run --entrypoint sh` gave me the facts:

- Base OS: **Alpine Linux 3.24**
- Java: **OpenJDK Temurin 21**, installed at `/opt/jdk/jdk-21`
- Runs as a non-root user: `appuser`
- Tools available: `update-ca-certificates`, `keytool`, `apk`

This mattered a lot. On Debian-based images, there's a package called `ca-certificates-java` that automatically syncs anything added via `update-ca-certificates` into the JVM's `cacerts` truststore. Alpine doesn't have that hook. So even if I dropped the Zscaler cert into ca-certificates and ran `update-ca-certificates`, the **OS** would trust it — but the **JVM** wouldn't, because Java keeps its own separate truststore (`cacerts`) and reads from that, not from the OS bundle.

That distinction is the crux of the whole problem: *this app's HTTP client is Java's own SSL stack, so the fix has to happen in Java's own trust store, not just the OS one.*

## Step 3: The First Fix (Almost There)

Armed with that, I built a small wrapper image on top of the official one:

```dockerfile
FROM docker.io/sonarsource/sonarqube-mcp:latest

USER root

COPY zscaler-root-ca.crt /usr/local/share/ca-certificates/zscaler-root-ca.crt

RUN update-ca-certificates && \
    keytool -importcert -noprompt -trustcacerts \
      -alias zscaler-root-ca \
      -file /usr/local/share/ca-certificates/zscaler-root-ca.crt \
      -keystore /opt/jdk/jdk-21/lib/security/cacerts \
      -storepass changeit

USER appuser
```

Key decisions baked into this:
- `USER root` before the `COPY`/`RUN`, because the default `appuser` doesn't have permission to write into ca-certificates or the JVM's `cacerts`.
- `keytool -importcert -trustcacerts` targeting the *exact* cacerts path we found in step 2 (`/opt/jdk/jdk-21/lib/security/cacerts`) with the well-known default password `changeit`.
- Switching back to `USER appuser` at the end, so we don't silently change the container's runtime security posture — we only needed root for the build step, not for execution.

I built it, pointed mcp.json at `sonarqube-mcp-corp:latest` instead of the upstream image, and restarted. Progress! The logs now showed:

```
Installing custom certificates from /usr/local/share/ca-certificates/...
Custom certificates installed successfully
```

...followed immediately by the exact same `certificate_unknown` exception as before.

## Step 4: "Wait, Why Is It *Still* Failing?"

This is the moment that separates guessing from troubleshooting. It would've been easy to assume "the fix didn't work" and start second-guessing the keytool command. But the logs told a clear story: certificate installation *succeeded*. So the Zscaler cert genuinely was in place. Yet the handshake still failed.

That meant one thing: **there was more than one hop in the trust chain that needed a cert**, and Zscaler's root CA was necessary but not sufficient. Corporate environments often layer multiple CAs — a Zscaler interception cert *and* an internal enterprise root CA (used for internal endpoints, or as an intermediate signer in the chain), especially when routing through SonarQube Cloud from within a segmented corporate network.

This is exactly the kind of tribal knowledge that lives in internal docs, not in error messages — so I pulled up company's internal "Getting Started" documentation (Confluence, CITI space) to check what certificates are officially required for this kind of egress. Sure enough, it called out two more: an company root CA and an company cloud CA, in addition to the Zscaler cert.

## Step 5: The Real Fix

Same pattern, just three certs instead of one:

```dockerfile
FROM docker.io/sonarsource/sonarqube-mcp:latest

USER root

COPY zscaler-root-ca.crt /usr/local/share/ca-certificates/zscaler-root-ca.crt
COPY company-root-ca.crt /usr/local/share/ca-certificates/company-root-ca.crt
COPY company-cloud-ca.crt /usr/local/share/ca-certificates/company-cloud-ca.crt

RUN update-ca-certificates && \
    keytool -importcert -noprompt -trustcacerts \
      -alias zscaler-root-ca \
      -file /usr/local/share/ca-certificates/zscaler-root-ca.crt \
      -keystore /opt/jdk/jdk-21/lib/security/cacerts \
      -storepass changeit && \
    keytool -importcert -noprompt -trustcacerts \
      -alias company-health-root-ca \
      -file /usr/local/share/ca-certificates/company-root-ca.crt \
      -keystore /opt/jdk/jdk-21/lib/security/cacerts \
      -storepass changeit && \
    keytool -importcert -noprompt -trustcacerts \
      -alias company-cloud-ca \
      -file /usr/local/share/ca-certificates/company-cloud-ca.crt \
      -keystore /opt/jdk/jdk-21/lib/security/cacerts \
      -storepass changeit

USER appuser
```

Rebuilt the image, reloaded the MCP server, and this time — no exceptions. Actually calling the tool to search my SonarQube projects returned a real list: `LetterTemplates`, `BabelMemberExtract`, `EVH-NIA_NextGenUM_...`, and dozens more.

## The Takeaway

A few lessons worth carrying forward:

1. **Read the exception class, not just the message.** `certificate_unknown` pointed straight at a trust-chain problem, saving time that could've been wasted checking tokens or URLs.
2. **Know your base image before you patch it.** Alpine vs. Debian changes *where* a fix needs to land — OS trust store, JVM trust store, or both. Assuming they behave the same would have led to a "fix" that silently did nothing for Java.
3. **"It said success" isn't the same as "it's fixed."** The OS-level cert install genuinely succeeded — but that was only half the chain. Watching the *next* log line (the actual handshake) rather than stopping at the first green message is what caught the second missing cert.
4. **Corporate trust chains are rarely single-hop.** Especially with TLS-inspecting proxies layered on top of internal PKI, budget for "there might be more than one cert" from the start, and check internal docs rather than guessing blindly.
5. **Minimize the blast radius of your fix.** Using `USER root` only for the build step and reverting to `USER appuser` kept the runtime behavior identical to the vendor image — we changed trust, not privilege.

End result: a small, reproducible wrapper image (`sonarqube-mcp-corp:latest`) that bakes in exactly the three certs our network requires, with the fix documented so the next time the upstream image updates, rebuilding is a one-line `docker build` away instead of another round of "why is this broken again?"