---
layout: post
title: "DGX Spark to Azure Private Endpoint: Write the Code"
date: 2026-10-10 00:02:00 +0530
categories: [labs, azure-private-endpoint-lab]
tags: [Labs, Azure Private Endpoint Lab, Azure, Private Endpoint, WireGuard, DNS, DGX Spark, Microsoft Foundry]
description: "The lab repo file by file, and the probe that checks DNS, TCP, TLS and HTTP for each Foundry name and reports it all over OpenTelemetry."
lab: azure-private-endpoint-lab
lab_part: 2
image:
  path: /assets/img/labs/azure-private-endpoint-lab/02-write-the-code.webp
  alt: "DGX Spark to Azure Private Endpoint: Write the Code - Labs hero image"
---

This lab has very little application code. Most of it is `az` CLI and two config files. The one
program is the probe, about 200 lines of Python. It asks the DGX's own resolver for each Foundry
name, connects, and records what happened at each step. By the end of this part you'll know what
each probe metric means, which is everything the dashboard and the experiments rely on.

<!-- more -->

{% include lab-nav.html %}

## Repository Layout
{: #repository-layout }

```
private-connectivity-labs/
├── shared/signal.sh                  asks Grafana whether a signal arrived (used by verify-*)
└── azure-private-endpoint/           this lab
    ├── Makefile                      every step: azure-*, vm-*, probe-*, dgx-*, exp-*/verify-*
    ├── infra/                        the Azure side, az CLI only
    │   ├── lib.sh                    names, CIDRs, VM size; ensure_zone helper
    │   ├── keys.sh                   WireGuard key pairs (VM, DGX) and an SSH key, once
    │   ├── up.sh                     RG, VNet, Foundry account, private endpoint, 1 DNS zone, NSG, IP, VM
    │   ├── cloud-init.yaml           the VM's whole configuration: wg0, NAT, dnsmasq
    │   ├── outputs.sh                reads back IPs and the key into .state/lab.env
    │   ├── fix-zones.sh              experiment 4: the openai and services.ai zones
    │   ├── unfix-zones.sh            undo experiment 4, to run it again
    │   ├── vm.sh                     stop | start | status | ssh
    │   └── down.sh                   delete the RG, purge the soft-deleted account
    ├── dgx/render.sh                 writes the DGX's wg0.conf (tunnel only, or with split DNS)
    ├── probe/                        probe.py, requirements.txt, Dockerfile
    ├── observability/
    │   ├── docker-compose.yml        grafana/otel-lgtm + the probe (host network)
    │   ├── dashboard-provider.yaml   Grafana file provider
    │   └── dashboards/azure-pe-lab.json
    ├── scripts/dgx-step.sh           runs a sudo step, or waits for you to run it
    ├── .env.example                  overrides: LOCATION, RG, VM_SIZE, MY_IP
    └── .state/                       git-ignored: keys, lab.env, rendered configs
```

`.state/` is where everything secret lives: both WireGuard private keys, the SSH key for the VM and
the account's API key (in `lab.env`). It is git-ignored and created with mode `700`.

## The Application
{: #the-application }

`probe/probe.py` runs a check for each of the account's three names, in parallel, every 10 seconds:

```python
# label → (hostname, path). Each path is a GET that needs no deployment and costs no tokens.
TARGETS = {
    "cognitiveservices": (f"{ACCOUNT}.cognitiveservices.azure.com", "/openai/models?api-version=2024-10-21"),
    "openai": (f"{ACCOUNT}.openai.azure.com", "/openai/models?api-version=2024-10-21"),
    "services-ai": (f"{ACCOUNT}.services.ai.azure.com", "/openai/models?api-version=2024-10-21"),
}
```

`GET /openai/models` lists the base models the account can deploy. It answers `200` with an API
key and no deployments, so the probe can run all day for nothing.

**Step 1: DNS, through the system resolver.** The probe uses `dnspython`, but it doesn't bring its own
DNS servers. It reads `/etc/resolv.conf`, which on the DGX points at systemd-resolved's stub on
`127.0.0.53`. So it gets whatever answer any other program on the DGX would get, split DNS included.
Its cache is off, so every check asks resolved again:

```python
resolver = dns.resolver.Resolver()  # /etc/resolv.conf → 127.0.0.53 (systemd-resolved)
resolver.lifetime = TIMEOUT
resolver.cache = None                # every probe asks resolved; resolved keeps its own cache
```

The point of using `dnspython` rather than `socket.getaddrinfo` is the CNAME chain. `getaddrinfo`
returns only the final address. The DNS response has the whole chain, and the chain shows whether a
`privatelink` zone answered:

```python
    names, ip = [host], None
    for rrset in ans.response.answer:
        for rr in rrset:
            if rrset.rdtype == dns.rdatatype.CNAME:
                names.append(str(rr.target).rstrip("."))
            elif rrset.rdtype == dns.rdatatype.A and ip is None:
                ip = rr.address
```

Errors are kept as words, because experiment 5 is about them: `NXDOMAIN`, `SERVFAIL` (resolved
couldn't get an answer from any server for that domain) or `TIMEOUT`.

**Steps 2 to 4: TCP, TLS, HTTP by hand.** The probe connects to the IP it just resolved, does the TLS
handshake with the *public name* as SNI, and sends a plain HTTP/1.1 request:

```python
                with tracer.start_as_current_span("tcp.connect"):
                    t0 = time.perf_counter()
                    sock = socket.create_connection((ip, 443), timeout=TIMEOUT)
                    phases["connect"] = ms(t0)
                with tracer.start_as_current_span("tls.handshake"):
                    t0 = time.perf_counter()
                    sock = ssl.create_default_context().wrap_socket(sock, server_hostname=host)
                    phases["tls"] = ms(t0)
```

Doing it by hand times each step separately, and connects to exactly the IP that was resolved, so
the result always matches the DNS answer it logs. The TLS step also shows why you keep calling the
public name on the private path: the account's certificate is issued for `*.openai.azure.com` and so
on. If you called `https://10.60.1.5/` the handshake would fail on the name.

On a `4xx` the probe reads the error body. The account's firewall answers like this:

```json
{"error":{"code":"403","message": "Public access is disabled. Please configure private endpoint."}}
```

The code is just `"403"`, so the probe keeps the first sentence of the message instead.

**Three checks that don't use DNS.** Each round also checks whether `/sys/class/net/wg0` exists,
whether the VM answers on TCP 53 at its tunnel address `10.200.0.1`, and whether the private
endpoint's IP answers on TCP 443. These separate "the tunnel is broken" from "the tunnel is fine but
DNS is wrong". That's exactly the difference [Experiment 2](/posts/labs/azure-private-endpoint-lab/06-experiments/#exp-tunnel-up)
is about.

## Instrumentation
{: #instrumentation }

The probe uses the OpenTelemetry Python SDK directly (no auto-instrumentation) and pushes all three
signals over OTLP/HTTP. The endpoint comes from `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:14318`,
set in the compose file.

**Metrics** are gauges, so each one holds the latest value, labelled with `host`:

```python
g_private = meter.create_gauge("pe_probe_dns_private", description="1 private IP, 0 public IP, -1 no answer")
g_status = meter.create_gauge("pe_probe_http_status", description="HTTP status, 0 when no response")
g_ok = meter.create_gauge("pe_probe_ok", description="1 when the name is private and the call returned 2xx")
g_phase = meter.create_gauge("pe_probe_phase_ms", description="milliseconds per step")
g_wg0 = meter.create_gauge("pe_probe_wg0_present", description="1 when the wg0 interface exists")
g_peer = meter.create_gauge("pe_probe_vpn_peer_up", description="1 when the VM answers on its tunnel IP (TCP 53)")
g_pe = meter.create_gauge("pe_probe_pe_tcp_up", description="1 when the private endpoint IP answers on TCP 443")
```

A gauge rather than a counter, because the question is always "what is it *now*", never "how many".
The `PeriodicExportingMetricReader` pushes every 5 seconds. The names have no unit, so Prometheus
stores them exactly as written (`pe_probe_dns_private{host="openai"}`).

**Logs** go through Python's `logging` with the OpenTelemetry `LoggingHandler`, one line per check,
with the important fields also attached as attributes:

```python
    log.info(f"{label}: {short(chain)} [{path_word}] {result} ({sum(phases.values()):.0f} ms)",
             extra={"host": label, "dns_private": private, "http_status": status, "error_code": err_code,
                    "resolved_ip": ip or ""})
```

A public answer has eight hops (the privatelink CNAME, then Traffic Manager, API Management and a
regional host), so `short()` keeps the first two and the address. The full chain goes on the trace.
Loki stores the `extra` fields as structured metadata, so the dashboard can filter on `host`
without parsing the line.

**Traces**: one trace per check, with a root span `probe <label>` and a child span per step
(`dns.resolve`, `tcp.connect`, `tls.handshake`, `http.request`). The root span carries `net.path`
(`private` or `public`), which is what the experiment queries filter on:

```
{ resource.service.name = "pe-probe" && name = "probe cognitiveservices" && span.net.path = "private" }
```

All three are push. Nothing scrapes the probe, so a signal reaches Grafana within one check (up to
10 s) plus one export (up to 5 s for metrics; logs and spans are batched and flushed within a few
seconds).

## Build the Image
{: #build-the-image }

`probe/Dockerfile`:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY probe.py .
ENV PYTHONUNBUFFERED=1
CMD ["python", "probe.py"]
```

| Line | Why |
|---|---|
| `python:3.12-slim` | Multi-arch, so it builds natively on the DGX's Arm64 CPU |
| `requirements.txt` first | Dependencies are cached in their own layer; editing `probe.py` rebuilds in seconds |
| `PYTHONUNBUFFERED=1` | Log lines appear in `docker compose logs` immediately |

The pinned dependencies are `dnspython==2.8.0`, `opentelemetry-sdk==1.38.0` and
`opentelemetry-exporter-otlp-proto-http==1.38.0`.

There's no registry. Compose builds the image locally the first time you run `make probe-up`:

```yaml
  probe:
    build: ../probe
    image: pe-probe:dev
    # Host networking: the probe uses the DGX's own routes (wg0) and resolver (127.0.0.53, with the
    # split-DNS rules), so it sees exactly what any program on the DGX would see.
    network_mode: host
    env_file: ../.state/lab.env
```

`network_mode: host` is the one line that matters. On a normal bridge network Docker would give the
container its own resolver and its own routes, and the probe would report on Docker's network
instead of the DGX's. With host networking, the container's `/etc/resolv.conf` is the host's
(`nameserver 127.0.0.53`) and `wg0` is in its routing table.

## Check Your Understanding
{: #check-your-understanding }

<details markdown="1">
<summary>Why does the probe resolve the name itself instead of letting an HTTP library do it?</summary>

Two reasons. It wants the CNAME chain, which `getaddrinfo` (what HTTP libraries use) throws away.
And it wants to connect to exactly the IP it logged, so the log line, the metric and the HTTP result
always describe the same answer.

</details>

<details markdown="1">
<summary>What would the probe report if it ran on Docker's default bridge network?</summary>

Docker would give the container its own resolver configuration, usually the upstream servers from the
host rather than resolved's split DNS, and no route via `wg0`. Every name would stay public even
after experiments 2 and 3, and the dashboard would be wrong.

</details>

<details markdown="1">
<summary>Why call https://&lt;account&gt;.openai.azure.com on the private path instead of the IP?</summary>

TLS checks the certificate against the name you asked for. The certificate covers the public names,
not `10.60.1.5`. The private path changes what the name resolves to, not the name you call.

</details>

<details markdown="1">
<summary>pe_probe_dns_private is 1 but pe_probe_ok is 0. What could that mean?</summary>

DNS gave a private IP, but the call didn't return `2xx`. Either the connection failed (no route,
tunnel or VM down: look at the Tunnel panel), or the account answered with an error, such as a `401`
from a wrong API key.

</details>

{% include lab-nav.html %}
