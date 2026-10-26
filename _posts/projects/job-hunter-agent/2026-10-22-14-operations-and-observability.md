---
layout: post
title: "Job Hunter Agent: Operations and Observability"
date: 2026-10-22 00:14:00 +0530
categories: [projects, job-hunter-agent]
tags: [Projects, Job Hunter Agent, Observability, Operations]
description: "Running Job Hunter Agent day to day: probes, logs, run history as the main metric, Slack as a heartbeat, and the observability gaps I know about."
project: job-hunter-agent
project_step: 14
image:
  path: /assets/img/projects/job-hunter-agent/14-operations-and-observability.webp
  alt: "Job Hunter Agent: Operations and Observability - Projects hero image"
---

Job Hunter Agent's most useful monitoring signal turned out to be a Slack message: three times a weekday,
a scheduled run reports what it found and what failed. If it doesn't arrive, something's wrong. The rest
of this post is about the signals behind that message, and the ones still missing.

<!-- more -->

{% include project-nav.html %}

## Application and infrastructure monitoring
{: #application-and-infrastructure-monitoring }

| Layer | Signal | Where |
|---|---|---|
| Pod | Ready, restarts, OOMKilled | `kubectl`, Argo CD health, platform monitoring |
| App | `/readyz` for probes; `/healthz` for LLM key, storage, LinkedIn connection, SMTP, schedule, Slack | Header dots in the UI |
| Pipeline | Each run's status, counts and errors | Run history, Slack |
| Agents | Every call's success and error | `agent_results` table |
| LinkedIn | Session validity | Sidecar `--status`; discovery errors in runs |

## Logging and log retention
{: #logging-and-log-retention }

Both containers log to stdout: the app's standard logging (scheduled run summaries as JSON, warnings for
failed research, facts, news or Slack posts) and the MCP server's request lines. The platform's monitoring
pack ships every pod's logs to Loki on the `mon` cluster (about 500 lines an hour from this pod). Loki keeps
other namespaces 15 days, but `job-hunter` gets 30, through a per-stream rule: enough to look back over a
month of scheduled runs when reviewing the SLO targets.

```text
{k8s_cluster_name="platform", k8s_namespace_name="job-hunter", k8s_container_name="app"} |= "scheduled run"
```

Run history in Supabase is the longer-term log of what the pipeline did.

## Metrics and dashboards
{: #metrics-and-dashboards }

The Totals panel and run history are the dashboard: jobs found, analyzed, drafted, pending review,
approved, applied, rejected, and per run found / new / skipped / analyzed / drafted / below bar / duration.
There's no Prometheus endpoint; for one user, a table I already look at beats a Grafana panel I don't.

## Distributed tracing
{: #distributed-tracing }

Instrumented, not exported. The app creates OpenTelemetry spans for every request and every agent run
(attributes like `app.agent.type` and `app.agent.task`), and tests check them. But production has no
`OTEL_EXPORTER_OTLP_ENDPOINT`, so the spans stay in the process. Pointing it at the platform's OTLP gateway
is a one-line change and the fastest way to see where a 7-minute run spends its time.

## Health checks
{: #health-checks }

- `startupProbe`, `readinessProbe`, `livenessProbe` all hit `/readyz`, which checks nothing outside the
  process. That's deliberate: a slow LLM or a LinkedIn hiccup must not restart the pod (and kill a
  browser session in the middle of a run).
- `/healthz` checks dependencies and is for people: it needs a signed-in session.

## Alerting and escalation
{: #alerting-and-escalation }

| Event | How I hear about it | Still missing |
|---|---|---|
| Scheduled run finished with errors | Slack message with the first three errors | — |
| Scheduled run didn't happen, or keeps failing | `JobHunterProfileStale`: no successful run for a profile in 4 days | — |
| Runs failing outright | `JobHunterRunSLOBreached` (below 90% over 7 days) | — |
| Daily upkeep failing (no backup, no keep-alive) | `JobHunterUpkeepFailing` after 2 days | — |
| Metrics missing (pod or PodMonitor gone) | `JobHunterMetricsMissing` | — |
| UI down | `EndpointDown` from the blackbox probe; `JobHunterAvailabilitySLOBreached` over 7 days | — |
| Pod OOMKilled / crash-looping | `ContainerOOMKilled` (new, every namespace) and `KubePodCrashLooping` | — |
| LinkedIn session expired | Discovery errors in the run | A specific Slack message asking for a sign-in |

Escalation is to me; there's no one else.

## Availability and performance targets
{: #availability-and-performance-targets }

Written down in [ADR-0009](/posts/projects/job-hunter-agent/architecture-decision-records/#adr-0009), measured from the metrics the app serves on its own port
(scraped by the platform's collector) and the blackbox probe:

| SLO | Target | Window |
|---|---|---|
| Scheduled runs complete (`succeeded`, or finished with some errors) | 90% | 7 days |
| Every scheduled profile has a fully successful run | Within 4 days (covers a weekend) | Rolling |
| `/readyz` answers the blackbox probe | 99% | 7 days |
| Draft time per job | A few minutes with the local model | No target |

Why not 95%? Three profiles on weekdays make 15 runs a week. At 95%, a single failed run would break the
SLO; at 90%, one failure is within budget and two are not. The window is 7 days because Mimir keeps 15
days of metrics. With only 15 events a week, multi-window burn-rate alerts would make no sense: one failure
would trip every window. So it's a plain ratio with a minimum of five runs, plus the freshness check. The
targets are a first guess, to revisit after a month of data.

## Operational runbooks
{: #operational-runbooks }

| Situation | Do |
|---|---|
| Discovery errors mention sign-in or a redirect | Run the LinkedIn sign-in from [the deployment runbook](/posts/projects/job-hunter-agent/13-deployment-and-go-live/#deployment-runbook) |
| "SSE stream ended without a response" | Check the `linkedin` container for OOMKilled; it restarted mid-call |
| Every LLM call fails | Check the LiteLLM gateway and the virtual key; `/healthz` shows the key state |
| Profile saves fail after a deploy | A migration wasn't applied; run it in Supabase |
| No Slack messages | `POST /notifications/slack/test`; check the webhook in OpenBao and restart the pod after changes |

```bash
kubectl --context k3d-platform -n job-hunter get pods
kubectl --context k3d-platform -n job-hunter logs deploy/job-hunter -c app --tail=50
kubectl --context k3d-platform -n job-hunter get pod -l app.kubernetes.io/name=job-hunter \
  -o jsonpath='{range .items[0].status.containerStatuses[*]}{.name} {.lastState.terminated.reason}{"\n"}{end}'
```

## Incident and problem management
{: #incident-and-problem-management }

The incidents so far were all found by using the app, and each became a fix plus a written lesson:

| What happened | Cause | Fix |
|---|---|---|
| LinkedIn returned HTTP 429 and dropped the session | A session copied from another machine | Sign in inside the container only |
| Discovery failed mid-run | Chromium OOMKilled at 2 GiB | 3 GiB limit |
| Certificate wouldn't issue | DNS-01 checks hit the internal split-DNS zone | Public resolvers only |
| Company facts empty | Wikidata 403 without a descriptive User-Agent | Named User-Agent |

## Capacity and cost monitoring
{: #capacity-and-cost-monitoring }

Costs are near zero, so the things to watch are limits: the sidecar's memory (peaks during searches),
Supabase free-tier usage, and LinkedIn volume (searches and pages per day, visible in run history as
"found"). A monthly look is enough.

## Checklist
{: #checklist }

- [ ] OTLP endpoint set so traces reach the platform
- [x] Dead man's switch for scheduled runs (`JobHunterProfileStale`)
- [x] Alert for OOMKilled or crash-looping pods (`ContainerOOMKilled`, `KubePodCrashLooping`)
- [x] SLOs written down, with alerts
- [ ] Slack message for an expired LinkedIn session
- [x] Log shipping and retention confirmed (Loki, 30 days)
- [ ] Runbook table tried for each row once

{% include project-nav.html %}
