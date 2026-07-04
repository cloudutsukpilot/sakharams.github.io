---
layout: post
title: GitHub Actions - NuGet Restore
categories: [devops, cicd, github actions]
tags: [DevOps, CICD, Github Actions]
---


Updated todo list

The file-creation tool is disabled in this session, so here is the blog post inline. Copy it into a markdown file wherever you'd like (e.g., `documentation/blog/nuget-ocsp-slow-restore.md`).

---

# The 26-Minute Mystery: How One Environment Variable Cut Our CI Time by 87%

*A war story about NuGet, certificate revocation, and a network you can't see through.*

## The Symptom

It started the way these things usually start: someone in Slack posting a screenshot of a red build.

Not a *failing* build. A *slow* one.

Our SonarQube analysis on .NET solutions was taking almost half an hour on our self-hosted `ehe-custom-runner-sectigo-ubuntu` runners. The same workflow on the standard runners breezed through in a few minutes. Same code. Same commit. Same tests. Wildly different timings.

The pipeline wasn't broken. It was just... waiting. For something. And nobody could immediately say what.

## What We Saw in the Logs

Once we looked at step timings, three lines jumped out:

- `dotnet tool install dotnet-coverage` — **242 seconds**
- `dotnet tool install dotnet-sonarscanner` — **241 seconds**
- `dotnet restore` (242 packages) — **1055 seconds**

That's ~26 minutes of overhead, on top of a build and a test run that were perfectly normal (~75s and ~90s respectively).

Downloading tools and restoring packages should take seconds. Something was silently stalling.

## Hypothesis #1: "NuGet.org is slow"

The classic first guess. It's almost never right, and it wasn't right here either.

We checked with a quick probe:

```bash
time curl -sI https://api.nuget.org/v3/index.json
```

Sub-second. NuGet.org was fine.

## Hypothesis #2: "The runner is slow"

Also easy to test. We ran a fresh `dotnet tool install` in the same runner environment. Two hundred and forty-three seconds. Then we set a single environment variable:

```bash
NUGET_CERT_REVOCATION_MODE=offline dotnet tool install --global dotnet-coverage
```

**1.66 seconds.**

That was the moment we knew this wasn't about CPU, disk, network throughput, or runner size. It was about *what NuGet was doing between the download and the finish*.

## Hypothesis #3: "NuGet is verifying package signatures... over the internet"

This turned out to be the answer. Let's unpack it.

When NuGet installs a signed package, it verifies:

1. The package hasn't been tampered with (hash check).
2. The signing certificate chain is trusted (local trust store).
3. The signing certificate hasn't been *revoked* (online OCSP/CRL check).

Steps 1 and 2 are local. Step 3 hits the internet — specifically, the **OCSP endpoints** of whichever CA signed the package.

We had 242 packages in the solution, signed by roughly 14 distinct certificate chains, backed by three OCSP endpoints:

- `http://oneocsp.microsoft.com/ocsp`
- `http://ocsp.digicert.com`
- `http://ocsp.sectigo.com`

None of them were reachable from the sectigo runner network.

Our egress firewall silently swallowed the requests. NuGet doesn't fail on an OCSP timeout — it waits, gives up after ~30-120 seconds per unique chain, marks the check as "unknown", *accepts the package anyway* and moves on. Which means the build never errored. It just… breathed slowly.

Thirteen inter-batch timeouts. Fourteen chains. Do the math and you get roughly 16 minutes of nothing, spread across three steps.

## The Investigation, Step by Step

We didn't get to the answer in one leap. Here's the actual path:

**Phase 1 — Network probe.** DNS was fast (75ms). IPv4 TLS to `api.nuget.org` was fast (274ms). IPv6 timed out. Interestingly, `oneocsp.microsoft.com` returned a TLS handshake in 4ms — so it wasn't *unreachable* at the transport layer for every path, which threw us off for a while.

**Phase 2 — Tool install comparison.** Same command with and without `NUGET_CERT_REVOCATION_MODE=offline`. 243s vs 1.66s. Root cause candidate confirmed.

**Phase 3 — Verbose restore.** `dotnet restore --verbosity detailed` showed all 242 packages downloading in 3 seconds. Then the log dumped into `PackageSignatureVerificationLog` entries — long pauses between batches, matching OCSP timeout intervals almost exactly.

**Phase 4 — HTTP transport diagnostics.** We forced HTTP/1.1 and swapped to `SocketsHttpHandler`. Zero effect. That definitively ruled out anything at the transport layer and put the finger firmly on revocation checking.

## The Fix

One line, at job scope:

```yaml
env:
  NUGET_CERT_REVOCATION_MODE: offline
```

That's it. That's the whole fix.

`NUGET_CERT_REVOCATION_MODE=offline` tells NuGet: *don't try to phone home for revocation status; rely on offline trust data instead.* Signature verification still runs. Certificate chain validation still runs. What we skip is only the "is this cert revoked right now?" online lookup.

We plumbed it through the reusable workflow as an input so callers on restricted networks can opt in without touching a shared secret:

```yaml
inputs:
  NUGET_CERT_REVOCATION_MODE:
    required: false
    type: string
    default: "online"
    description: "NuGet certificate revocation mode. Set to 'offline' on runners where OCSP endpoints are blocked."
```

Then in the job:

```yaml
env:
  NUGET_CERT_REVOCATION_MODE: ${{ inputs.NUGET_CERT_REVOCATION_MODE }}
```

Callers on the sectigo runner set `NUGET_CERT_REVOCATION_MODE: offline`. Everyone else gets the safe default.

## The Result

Same runner. Same solution. Same commit.

| Step | Before | After |
|---|---|---|
| `dotnet tool install dotnet-coverage` | 242s | 2s |
| `dotnet tool install dotnet-sonarscanner` | 241s | 2s |
| `dotnet restore` | 1055s | 9s |
| `dotnet build` | 75s | 77s |
| `dotnet test` | 92s | 96s |
| **Total** | **~29.5 min** | **~4.1 min** |

An 87% reduction, from a single environment variable.

## What About the Security Trade-off?

This is a fair question, and it deserves a straight answer.

Setting `NUGET_CERT_REVOCATION_MODE=offline` **does not** disable signature verification. Packages are still hash-checked. The signing certificate chain is still validated against locally trusted CAs.

What it **does** relax is the "is the signing cert revoked *right now*?" check. If a signing certificate were revoked by its CA after publication, NuGet in offline mode wouldn't notice.

For our runners, this is an acceptable trade because:

- Packages come from `api.nuget.org` and pinned versions in our `.csproj` / lockfiles.
- Signature and chain validation still run — a maliciously modified or unsigned package would still fail.
- The alternative (25 minutes of silent waits until offline fallback kicks in anyway) gave us *the same effective outcome* just much more slowly.

The right long-term answer is to unblock the OCSP endpoints at the network layer so `online` mode works everywhere. That work is tracked separately. Until then, this is a well-understood, targeted workaround.

## Lessons

Three things worth remembering:

**1. "Slow" is a symptom, not a diagnosis.** Reach for step timings and verbose logs before reaching for a bigger runner. Throwing hardware at a network wait doesn't help.

**2. Silent fallbacks are the sneakiest failure mode.** NuGet did exactly what it was designed to do: try, fail gracefully, accept the package. No red X. No stack trace. Just a sluggish pipeline and a confused engineer.

**3. Restricted networks change the meaning of "default settings."** Defaults are usually tuned for the open internet. On a locked-down runner, "phone home to a CA" isn't a fast operation — it's a slow failure waiting to happen.

If your .NET CI is inexplicably slow on a self-hosted runner, before anything else, run this:

```bash
time env NUGET_CERT_REVOCATION_MODE=offline dotnet restore YourApp.sln
```

If that's dramatically faster than the same command without the variable, you've just found your bottleneck.
