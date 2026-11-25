---
layout: post
title: "Platform Wardens: Operations and Observability"
date: 2026-11-09 00:14:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Observability, Operations]
description: "One trace per incident keyed by the correlation id, JSON logs, Grafana dashboards, the console's Home tab, nightly eval gauges and P1 to P4 alerts for Platform Wardens."
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
| The agents | Runs, findings, cost, tokens, guardrail decisions, handoffs, approvals (registry and level 2), kill switch, agent info and cost ceilings |
| Evaluation | The nightly eval gauges per agent and measure: score, threshold, accepted baseline, last run, and how many cases are unlabelled |
| Temporal and the router | The SDK's worker metrics; a worker observer every 15 seconds (running workflows by age, each schedule's last and next fire, paused state and last result); the `wardens` version each agent's live workers report |
| The platform | The `wardens` cluster's nodes and pods through the platform's monitoring pack; the event bus's relays, consumer, lag and dead letters; the nightly database dumps |

Without an OTLP endpoint set, all of it is a no-op and never fails a run.

## Logging and log retention
{: #logging-and-log-retention }

Every process that uses `wardens` writes JSON log lines now (`wardens.telemetry.logs`, built in the
hardening phase), and agents log through plain `logging` and get that for free. Each line carries
`service.name`, `gen_ai.agent.name`, the correlation, task and run ids and the trace and span ids,
redacted; the binding sets the run's ids around every activity, so a line from deep inside a tool still
lands in the right incident. The GitHub relay writes one line per delivery, written whole under a lock so
concurrent deliveries never share a line. The Event Hubs SDK's chatty logs were turned down to WARNING,
from about 10,500 lines an hour to a few. Prompts and responses are logged only at debug level, and
redacted. Retention is the platform's Loki retention.

Two gaps are left on the list: the framework's CLIs still print rather than log, and the router's
activities don't set the log context yet.

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

Since `wardens` 0.10.0 the console opens on a **Home** tab that runs the same PromQL as the fleet and
agent dashboards: tiles for the last 24 hours, 7 or 30 days (waiting for approval, executions and success
rate, running now, failed, p95 run time, model cost, tool calls and errors, approvals decided), the recent
executions with approvals first, and a per-agent table that links to Grafana. It's built for a quick look,
phone included; Grafana is still where to go when a tile looks wrong.

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

Framework spans carry `wardens.component`; every span carries `wardens.correlation_id`. The binding
also opens a live span around every activity attempt, so a long run shows progress while it's still
going, with the activity's output as a size, a hash and (for data at Internal or lower) a short redacted
excerpt. The GenAI semantic conventions aren't stable yet, so the version is pinned in `wardens.telemetry`.

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
| Evaluation | `WardensEvalSafetyFailure`, `BelowThreshold`, `Regression`, `Stale` (from the nightly run) |
| Versions | An agent in the one-minor-behind warning window for more than 14 days |
| Event bus | `WardensIngressDown`, `RelayRefusing`, `LagHigh`, `DeadLettered`, `BusReset` |
| Backups | `WardensDumpTooOld` |

An agent in the shadow stage gets its alerts downgraded a priority: it can't act, so its failures matter
less at 3 am. Alerts go to Slack; each agent's own escalation audience is named in its manifest. The eval
alerts are noisy on purpose for now: terraform-drift's nightly gate fails on unlabelled harvested cases,
and the owner chose to see that warning every night rather than hide it until the cases are reviewed.

## Availability and performance targets
{: #availability-and-performance-targets }

The targets written down so far are mostly design limits rather than SLOs: the kill switch stops an agent
within 60 seconds; every expected run from a burst starts within 5 minutes; a drift run has a 2-hour
deadline; a level 2 approval waits at most 24 hours and expiry is a denial; each run stays within its
cost ceiling (drift: $0.50 a run, $20 a day). The one real SLO is the router's start latency, alerted from
homelab-gitops since the router got its own namespace.

> **TODO:** What availability and time-to-first-diagnosis targets apply once incident triage takes every
> critical alert? See [Service level objectives](/posts/projects/platform-wardens/16-support-and-maintenance/#service-level-objectives).
{: .prompt-warning }

## Operational runbooks
{: #operational-runbooks }

Runbooks now live in three places, each next to what it describes:

| Runbook | Covers |
|---|---|
| Each agent's `docs/runbook.md` | Kill switch, alerts and dashboards, hold and resume, replay and rollback, demote, common situations, escalation |
| The console's run book (platform-wardens) | The quarterly restore drill, holding and resuming an incident, ended chats, registry approvals, production feedback, judge calibration, Slack account links, installing the console on a phone |
| The alerts run book (homelab-gitops) | One section per alert, linked from the alert itself |

A GitHub Apps run book covers the Apps the wardens use, where each is installed and how the release and
bump Apps were created. Drift's runbook is the fullest: its first real entry was "worker exits at start
with `UnpricedModelError`", after the homelab's chat model was renamed, and the level 2 work added what to
do when a card times out, when an approval ends `refused-changed` because the pull request or plan moved,
and when a revert's apply gets a 403 because the App lacks `actions: write`.

## Incident and problem management
{: #incident-and-problem-management }

An incident with an agent follows the containment order in the kill-switch design: quarantine in the
registry (seconds), cancel its workflows (seconds), revoke act credentials (under a minute), scale the
worker to zero (under a minute), and disable its identity only for a compromise. There's now a softer
step before any of that: an editor can **Hold** a running incident from the console, with a reason that
goes into the audit log. The current activity finishes, nothing new starts, and if nobody resumes it within
its maximum hold (30 minutes by default) it escalates to the owner's team and ends.

A platform incident worth remembering: on 2026-11-21 the Event Hubs pod was recreated, Azurite lost the
consumer's checkpoint container with it, and the ingress consumer retried "container does not exist" every
15 seconds while reading nothing, until someone restarted it. Alerts and console sends both go through
that hub, so the fix (create the container again before every read, `wardens` 0.10.0) mattered more than
its size suggests. Problems that cost real
time become lessons in the Cloudutsuk Platform's
[lessons log](/posts/projects/cloudutsuk-platform/lessons-learned/), where the homelab work is recorded.

## Capacity and cost monitoring
{: #capacity-and-cost-monitoring }

Cost is watched per run, per agent and per day on the model usage and cost dashboard. Local models are
priced at the Foundry equivalent (an estimate, not a bill), so a run that calls the model shows a
realistic non-zero cost and the ceilings mean something. The nightly live evals spend through their own
LiteLLM key with its own budget, so they never eat into an agent's.

Capacity is the Temporal dashboard's backlog and pollers per task queue, and the bus's lag. The chat
model scales to zero, which shows up as cold starts rather than load: since 0.9.0 a run record says "the
model was likely asleep (scaled to zero) and didn't wake in time" instead of a bare "model unavailable",
so a wave of fallbacks after a quiet night reads as what it is.

## Checklist
{: #checklist }

- [ ] Every run produces a trace with the correlation id as the trace id
- [ ] Workers export cumulative metrics
- [ ] Every alert has a priority, a runbook link and a promtool test
- [ ] Each alert has fired once on purpose
- [ ] The eval alerts are quiet because the cases are labelled, not because the alerts were muted
- [ ] Every agent's runbook has its kill-switch section filled in
- [ ] Targets for incident triage are agreed
- [ ] The CLIs and the router's activities log with the run's context

{% include project-nav.html %}
