---
layout: post
title: "Platform Wardens: Operations and Observability"
date: 2026-11-09 00:14:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Observability, Operations]
description: "One trace per incident keyed by the correlation id, run records, four Grafana dashboards and alert rules with P1 to P4 priorities for Platform Wardens' agents."
project: platform-wardens
project_step: 14
image:
  path: /assets/img/projects/platform-wardens/14-operations-and-observability.webp
  alt: "Platform Wardens: Operations and Observability - Projects hero image"
---

An agent you can't observe is an agent you can't promote: every gate reads evidence from runs, so
observability isn't a support feature here, it's the input to the lifecycle. Platform Wardens gives
every incident one trace whose id is the correlation id, every run a record, and every guardrail
decision a metric. The first week on the homelab showed how easy it is to get that subtly wrong.

<!-- more -->

{% include project-nav.html %}

## Application and infrastructure monitoring
{: #application-and-infrastructure-monitoring }

Telemetry goes to the platform's `mon` cluster (Grafana, Mimir, Loki, Tempo) through each cluster's
collector. Three layers are watched:

| Layer | Signals |
|---|---|
| The agents | Runs, findings, cost, tokens, guardrail decisions, handoffs, approvals, kill switch, agent info and cost ceilings |
| Temporal | The SDK's worker metrics; a worker observer every 15 seconds: running workflows by age, each schedule's last and next fire, paused state and last result |
| The platform | The `wardens` cluster's nodes and pods through the platform's monitoring pack; the event bus's relays, consumer, lag and dead letters |

Without an OTLP endpoint set, all of it is a no-op and never fails a run.

## Logging and log retention
{: #logging-and-log-retention }

Logs are structured where they matter: the GitHub relay writes one JSON line per delivery (delivery,
event, status and the answer), written whole under a lock so concurrent deliveries never share a line.
The Event Hubs SDK's chatty logs were turned down to WARNING, from about 10,500 lines an hour to a few.
Prompts and responses are logged only at debug level, and redacted. Retention is the platform's Loki
retention.

> **TODO:** Structured log export from the framework is still in the `telemetry` module's *Not yet*
> column. Which fields (correlation id, agent, task id) must every log line carry when it's built?
{: .prompt-warning }

## Metrics and dashboards
{: #metrics-and-dashboards }

| Dashboard | Answers |
|---|---|
| Fleet operations | Is anything failing, refused or stuck across all agents? |
| Agent detail | One agent's runs, findings, tools, handoffs and cost |
| Model usage and cost | Tokens and cost per agent and model, against ceilings |
| Temporal workflow operations | Runs in flight, schedules, worker health, a per-task-queue table |
| Wardens / Event bus | Publish latency, lag, dead letters, relay refusals |

Two lessons from building them are now design rules: workers export **cumulative** metrics, because
delta counters reached Mimir as one sample per run and left every `rate()` panel empty; and panels read
0 rather than "No data" for a counter that hasn't counted anything yet.

## Distributed tracing
{: #distributed-tracing }

**The correlation id is the trace id.** Spans written by different processes (the ingress consumer, the
incident workflow, each agent's worker) join one trace because their ids are deterministic: a hash of
the span's kind, the correlation id and a key. One alert reads as one trace:

```text
wardens.ingress            (consumer, from the relay's receipt)
└─ wardens.incident
   └─ wardens.entry        (channel, capability, guardrail point 1)
      └─ invoke_agent incident-triage
         ├─ chat           (model, tokens, cost, real call times)
         └─ execute_tool   (tool, read or act, status)
```

Framework spans carry `wardens.component`; every span carries `wardens.correlation_id`. The GenAI
semantic conventions aren't stable yet, so the version is pinned in `wardens.telemetry`.

## Health checks
{: #health-checks }

The console, both relays and the ingress consumer answer `/healthz` without sign-in. Workers have no
HTTP port; their health is whether they poll their task queue, which the workflow dashboard shows and an
alert watches ("a worker that stops polling").

## Alerting and escalation
{: #alerting-and-escalation }

Alert rules in Mimir, tested with promtool, each with a P1 to P4 priority label and a runbook link:

| Area | Examples |
|---|---|
| Safety | A guardrail denial at the tool point (P1), the kill switch engaged |
| Reliability | Run failures, a missed or paused schedule, a failed scheduled run, a run near its deadline, a worker that stops polling |
| Cost | A day over its ceiling (and at twice it), the average run over its per-run ceiling, cost per run twice its 7-day average |
| Approvals | Approvals timing out |
| Event bus | `WardensIngressDown`, `RelayRefusing`, `LagHigh`, `DeadLettered`, `BusReset` |

An agent in the shadow stage gets its alerts downgraded a priority: it can't act, so its failures matter
less at 3 am. Alerts go to Slack; each agent's own escalation audience is named in its manifest.

## Availability and performance targets
{: #availability-and-performance-targets }

The targets written down so far are design limits rather than SLOs: the kill switch stops an agent within
60 seconds; every expected run from a burst starts within 5 minutes; a drift run has a 2-hour deadline;
each run stays within its cost ceiling (drift: $0.50 a run, $20 a day).

> **TODO:** What availability and time-to-first-diagnosis targets apply once incident triage takes every
> critical alert? See [Service level objectives](/posts/projects/platform-wardens/16-support-and-maintenance/#service-level-objectives).
{: .prompt-warning }

## Operational runbooks
{: #operational-runbooks }

Each agent has `docs/runbook.md`: the kill switch (who, how, within how long, what it leaves, when it
was last tested, how to restore), how to demote, the common situations, and escalation. Each alert links
to its own runbook section. The framework-level how-docs cover the shared parts (routing, ingress, the
state store, MCP). Most agents' runbooks are still partly template; the first real entry is drift's
"worker exits at start with `UnpricedModelError`", which happened when the homelab's chat model was
renamed.

## Incident and problem management
{: #incident-and-problem-management }

An incident with an agent follows the containment order in the kill-switch design: quarantine in the
registry (seconds), cancel its workflows (seconds), revoke act credentials (under a minute), scale the
worker to zero (under a minute), and disable its identity only for a compromise. Problems that cost real
time become lessons in the Cloudutsuk Platform's
[lessons log](/posts/projects/cloudutsuk-platform/lessons-learned/), where the homelab work is recorded.

## Capacity and cost monitoring
{: #capacity-and-cost-monitoring }

Cost is watched per run, per agent and per day on the model usage and cost dashboard. Local models are
priced at the Foundry equivalent (an estimate, not a bill), so a run that calls the model shows a
realistic non-zero cost and the ceilings mean something. Capacity is the Temporal dashboard's backlog
and pollers per task queue, and the bus's lag.

## Checklist
{: #checklist }

- [ ] Every run produces a trace with the correlation id as the trace id
- [ ] Workers export cumulative metrics
- [ ] Every alert has a priority, a runbook link and a promtool test
- [ ] Each alert has fired once on purpose
- [ ] Every agent's runbook has its kill-switch section filled in
- [ ] Targets for incident triage are agreed
- [ ] Structured log export is built with the agreed fields

{% include project-nav.html %}
