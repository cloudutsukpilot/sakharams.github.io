---
layout: post
title: "OpenTelemetry End to End: Understand and Review"
date: 2026-10-08 00:07:00 +0530
categories: [labs, opentelemetry-lab]
tags: [Labs, OpenTelemetry Lab, OpenTelemetry, Observability, Grafana, Kubernetes]
description: "What the six experiments proved about traces, logs and metrics, where this local OpenTelemetry setup stops, and what production would change."
lab: opentelemetry-lab
lab_part: 7
image:
  path: /assets/img/labs/opentelemetry-lab/07-understand-and-review.webp
  alt: "OpenTelemetry End to End: Understand and Review - Labs hero image"
---

You've followed a click through four services, broken the backend on purpose and watched it recover.
This last part puts the pieces back together: the full signal path once more, what each experiment
proved, the shortcuts this lab takes, and what you'd change before running anything like it for real.

<!-- more -->

{% include lab-nav.html %}

## The Full Signal Path
{: #the-full-signal-path }

Here is the architecture animation from Part 1 again. Every hop in it has now shown up in a screenshot,
so step through it and name the evidence for each one.

{% include flow-anim.html id="labs/opentelemetry-lab/architecture" %}

Read top to bottom, one click on **Call /api/demo** does this:

1. The browser SDK starts a span and sends `traceparent` with the `fetch`.
2. Traefik continues the trace with a gateway span and routes `/api` to the API.
3. FastAPI's auto-instrumentation opens a server span; HTTPX opens a client span and forwards
   `traceparent` to the backend.
4. The backend's spans join the same trace: the Redis `GET (cache hit|miss)`, and on a miss the manual
   `sqlite SELECT records` span and `SETEX`.
5. Every service pushes its spans over OTLP to the Collector; the browser's go through nginx's
   `/v1/traces` proxy.
6. The API prints one JSON line with the `trace_id`; the Collector tails it from `/var/log/pods` and
   copies the ID into the log record's trace context.
7. Traefik pushes request metrics over OTLP; nginx's counters are scraped from the exporter sidecar.
8. Tempo, Loki and Prometheus store the three signals; Grafana queries all of them.

The single idea underneath is **context propagation**. Nothing in the backend knows about the browser,
and nothing in Loki knows about Tempo. A 32-character trace ID, passed along in a header and written
into a log line, is what ties them together.

## What the Experiments Showed
{: #what-the-experiments-showed }

| Experiment | What it proved |
|---|---|
| [1. Reload the page](/posts/labs/opentelemetry-lab/06-experiments/#exp-reload) | Metrics and logs count different things: three files in the access log, 15 requests on nginx's counter, because probes and exports are counted but not logged |
| [2. Cache miss](/posts/labs/opentelemetry-lab/06-experiments/#exp-cache-miss) | One trace ID carried through four services and two languages: 13 spans, 18 ms, with SQLite (0.37 ms) the cheapest part |
| [3. Cache hit](/posts/labs/opentelemetry-lab/06-experiments/#exp-cache-hit) | A trace's shape shows which code path ran: 11 spans, no SQLite or SETEX; the backend got 3× faster, the request only 2 ms faster |
| [4. Traffic burst](/posts/labs/opentelemetry-lab/06-experiments/#exp-traffic) | Pushed metrics arrive in batches: Traefik's counter jumped by about 150 in one step, 30 to 60 seconds after the burst |
| [5. Log to trace](/posts/labs/opentelemetry-lab/06-experiments/#exp-log-to-trace) | Correlation is just a shared ID: the API's log line and its trace both carry `e6dc49ed…` |
| [6. Backend outage](/posts/labs/opentelemetry-lab/06-experiments/#exp-outage) | A failure shows in all three signals, and the trace tells *how* it failed: a 2 ms `ConnectError` here, a 5 s `ConnectTimeout` in another run |

Between them, those six cover the three ideas this lab set out to teach: **propagation** (2, 3, 5),
**transport and timing** (1, 4), and **correlation during failure** (6).

## Limits of This Setup
{: #limits-of-this-setup }

This lab optimises for being easy to run and easy to read. Taken from its own config, here is what it
gives up:

| Shortcut | Where | Why it's fine here | Why it isn't in production |
|---|---|---|---|
| All storage in `emptyDir` | `lgtm.yaml` | Restart = clean slate | You lose every trace, log and metric on a pod restart |
| One container for Tempo, Loki, Prometheus and Grafana | `grafana/otel-lgtm` | One image, one port | No scaling, no retention control, no HA |
| Anonymous admin in Grafana | otel-lgtm default | No login on a laptop | Anyone who can reach port 3002 can change anything |
| `/grafana-api/*` proxied by nginx | `nginx.conf` | Lets the page show its own telemetry | Exposes read access to all logs, traces and metrics to anyone who can load the site |
| OTLP receivers with no auth or TLS | Collector config | Cluster-internal only | Anything in the cluster could send (or flood) telemetry |
| `parentbased_always_on` sampling | Python Dockerfiles | Every trace is kept, so experiments are repeatable | At real traffic volumes, storing 100% of traces gets expensive |
| One replica of everything, one node | manifests, `cluster.yaml` | Simple and cheap | Any pod restart is an outage (experiment 6 is that outage) |
| Redis without persistence, SQLite in `/tmp` | `api-backend.yaml` | The data is one seeded row | Real data needs a real database and backups |
| No alerting | none configured | You are watching the screen | Nobody watches the screen at 3 a.m. |

None of these are bugs. They are the reason the lab starts with one command and fits on a laptop.

## Taking It to Production
{: #taking-it-to-production }

If this were a real service, these are the changes I'd make first, in roughly this order:

1. **Separate, durable backends.** Replace `grafana/otel-lgtm` with Loki, Tempo and Mimir (or managed
   equivalents) with object storage and retention policies. The applications don't change at all: they
   only know the Collector's address, which is the point of having one.
2. **Two Collector tiers.** Keep a DaemonSet agent per node for logs and local OTLP, and add a gateway
   Deployment that does the heavy work (tail-based sampling, filtering, routing to backends) and can
   scale independently.
3. **Sample deliberately.** Switch to tail-based sampling at the gateway so every error trace and slow
   trace is kept, and only a fraction of the fast, successful ones.
4. **Lock it down.** Grafana behind single sign-on, no telemetry proxy on the public site, TLS and
   authentication on OTLP endpoints, and NetworkPolicies so only the Collector talks to the backends.
5. **Alert on symptoms.** Error rate and latency SLOs from the metrics that already exist (Traefik's
   `traefik_entrypoint_requests_total` by `code`, and the request-duration histograms), with a link from
   each alert to example traces.
6. **Survive one failure.** At least two replicas of the API and backend, a PodDisruptionBudget, and a
   Redis that can lose a pod. Experiment 6 should then show a blip, not an outage.

## Tear Down
{: #tear-down }

```sh
make down
```

That runs `k3d cluster delete otel-demo`, which removes the cluster container, every pod, and all
the telemetry stored in the LGTM `emptyDir` volumes. The images you built stay in your local Docker
image cache; remove them with `docker image rm static-site:dev trace-lab-api:dev trace-lab-backend:dev`
if you want the space back. `make up` brings everything back from scratch.

## Go Further
{: #go-further }

Each of these needs only a small change, and each produces a signal you can predict:

- **Add a latency panel.** The API and backend already export `http_server_duration_milliseconds`
  histograms (and Traefik exports `http_server_request_duration_seconds`), but no panel uses them. Add
  `histogram_quantile(0.95, sum by (le, service_name) (rate(http_server_duration_milliseconds_bucket[5m])))`
  and run experiment 4 again. *Expect:* the backend's p95 well below the API's, since the API waits on it.
- **Make SQLite slow.** Add a `time.sleep(0.2)` inside the SQLite span and redeploy (`make build deploy`).
  *Expect:* misses about 200 ms longer than hits, and the gap visible in the waterfall at a glance.
- **Stop Redis instead of the backend.** `kubectl -n demo scale deploy/redis --replicas=0`. *Expect:*
  no 502 at all. The backend catches `RedisError`, sets `app.cache.result=unavailable` and reads SQLite
  every time; find those spans with `{ span.app.cache.result = "unavailable" }`.
- **Add a custom metric.** Count cache hits and misses with an OpenTelemetry counter in the backend.
  *Expect:* a new metric in Prometheus with a `result` label, with no Collector change, because it
  arrives through the existing `otlp` receiver.
- **Drop the browser SDK.** Remove the `<script>` that loads `/otel.js` and click again. *Expect:* the
  trace now starts at Traefik, and `state-site-browser` disappears from it.

## Check Your Understanding
{: #check-your-understanding }

<details markdown="1">
<summary>If you replaced grafana/otel-lgtm with separate Tempo, Loki and Mimir services, what would change in the API and backend?</summary>

Nothing. They export to the Collector. Only the Collector's exporter configuration would point
somewhere new.

</details>

<details markdown="1">
<summary>Why is the <code>/grafana-api/</code> proxy a security problem outside a laptop?</summary>

It lets anyone who can load the site query Loki, Tempo and Prometheus through nginx, without any
Grafana login. Logs and traces often contain user data, internal hostnames and error details.

</details>

<details markdown="1">
<summary>With tail-based sampling keeping 10% of successful traces, would experiment 6 still be easy to investigate?</summary>

Yes, if the policy keeps all error traces, which is the usual reason to sample at the tail: the
decision is made after the whole trace is seen, so failures can always be kept.

</details>

{% include lab-nav.html %}
