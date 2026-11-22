---
layout: post
title: "RAG on Cloud: Operations and Observability"
date: 2026-11-18 00:14:00 +0530
categories: [projects, rag-on-cloud]
tags: [Projects, RAG on Cloud, Observability, Operations]
description: "Operating a lab that mostly isn't running: the budget and the Search switch first, then traces, eval-driven metrics and a short runbook for each session."
project: rag-on-cloud
project_step: 14
image:
  path: /assets/img/projects/rag-on-cloud/14-operations-and-observability.webp
  alt: "RAG on Cloud: Operations and Observability - Projects hero image"
---

Most of the time, RAG on Cloud isn't running. Nobody calls the API between lab sessions, the app scales to
zero, and the one resource that bills by the hour, the Search service, is meant to be gone. So operations here starts
with cost: knowing when something was left up. Traces, dashboards and alerts on quality matter too, but they arrive
with the API in Phases 1 and 3, and this post says which parts exist today and which are still plans.

<!-- more -->

{% include project-nav.html %}

## Application and infrastructure monitoring
{: #application-and-infrastructure-monitoring }

| What | Where | Status |
|---|---|---|
| Spend for the resource group | Cost Management budget, 100 a month | In review (2026-11-23) |
| Drift between Terraform and Azure | The infra repo's daily scheduled plan of every stack | Live |
| API requests, dependencies, exceptions | Application Insights `dv-appi-rag-01` | Resource exists; nothing sends to it until the API (Phase 1 step 4) |
| Search, Storage and Foundry resource logs | Log Analytics, through diagnostic settings | Not configured, on purpose (see below) |
| Service health | Azure Service Health for the region | Portal only |

There's no platform-level monitoring of this stack beyond the drift scan: it lives in another tenant from the
platform's monitoring, and a lab that's mostly off doesn't need uptime checks.

## Logging and log retention
{: #logging-and-log-retention }

Logs go to one Log Analytics workspace, `dv-log-rag-01`, with 30 days of retention and a 1 GB daily
ingestion cap on Application Insights. Both numbers come from the same reasoning: what I want to keep for months is
the eval results, which live in the lab repo, not in logs. Thirty days covers debugging a session, and the cap stops
a runaway loop from turning into a bill.

Resource logs for Search, Storage and Foundry aren't sent anywhere yet. The organisation's preference is no
diagnostics by default, because ingestion is the part of Log Analytics that costs, and Trivy's finding about storage
logging is accepted on that basis. When something needs debugging, a diagnostic setting for that one resource goes in
through a PR and comes out again afterwards.

## Metrics and dashboards
{: #metrics-and-dashboards }

The dashboard comes with Phase 3 step 3, and its metrics come from the evaluation rather than from
infrastructure:

| Metric | Source |
|---|---|
| p50 and p95 latency per answer mode | Application Insights request duration, tagged with `mode` |
| Tokens and cost per request | Spans for each model call, priced per deployment |
| Zero-result rate | Retrieval spans with no chunks |
| hit@5, MRR, groundedness, relevance | The eval harness, per run |
| Search queries and indexer runs | Search metrics in Azure Monitor (free platform metrics) |

Platform metrics such as Search query rate and Foundry token counts are available without diagnostic settings, so
the cost-free part of the dashboard can exist before any logs flow.

## Distributed tracing
{: #distributed-tracing }

Nothing is traced yet. From Phase 3 step 3 the API will emit OpenTelemetry spans to Application Insights: one trace per question, with
child spans for retrieval, each model call and, in the agentic modes, each tool call. The Foundry agent's own tracing
goes to the same Application Insights resource through the Foundry project, so a question asked through the Agent
Service will show the agent's steps in the same place as the API's. Each trace will carry the mode and the golden-set
question ID when it comes from an eval run, which is what lets the comparison tables link back to individual runs.

## Health checks
{: #health-checks }

The API will get a `/health` endpoint that checks it can get an Entra token and reach the Search index, used as the
Container Apps readiness probe. A liveness probe that calls the chat model would cost tokens on every probe, so it
doesn't. For the stack itself, the "health check" is the plan: a clean daily drift scan says Azure still matches the
code.

## Alerting and escalation
{: #alerting-and-escalation }

| Alert | Fires when | Goes to |
|---|---|---|
| Budget, 50% and 80% of actual spend | Cost data crosses the threshold | Email |
| Budget, forecast over 100% | The month's forecast passes 100 | Email |
| Error rate and p95 latency on the API | Phase 3 step 4 | Email |
| Drift | The daily plan shows changes | The platform's drift agent and its incident flow |

Escalation is me. The forecast notification is the one that matters most: it fires while the Search service is
still running, before the money is spent. Cost data lags spend by up to a day, so it's a backstop, not a real-time
alarm.

## Availability and performance targets
{: #availability-and-performance-targets }

No availability target: the API is off most of the time by design, and nobody depends on it. Performance
targets will be set from the first baseline run, not before, which is the same position the
[vision post](/posts/projects/rag-on-cloud/01-vision-and-business-context/#success-metrics-and-business-kpis) takes.

**Starting targets** (set 2026-11-23, to revise after the first baseline): p95 under 4 seconds per answer
for the standard RAG modes and under 15 seconds for the agentic modes, measured on a warm app over the golden set. The
agentic budget is wider because each tool call is another model round trip; if a mode can't meet it, the comparison
table says so rather than the target moving quietly.

## Operational runbooks
{: #operational-runbooks }

Two runbooks cover nearly everything, because a session has a start and an end:

**Start a session**

1. Restore the Search service: a PR that puts `dv-srch-rag-01` back in the stack, then merge (about ten minutes).
2. `make index`: recreate the index, skillset and indexer, and wait for the indexer run.
3. Check: a hybrid query returns chunks with post URLs.

**End a session**

1. A PR that empties the Search service list, then merge.
2. Check the next day's cost in Cost Management for the resource group.

Steps 1 and 2 of the start runbook become real with Phase 0 step 4 and Phase 1 step 2; until then, Search stays up
and the budget watches it.

## Incident and problem management
{: #incident-and-problem-management }

The realistic incidents are a bill and a failed apply, and both have happened in miniature: the first apply
failed on a tenant policy and a renamed role. The pattern for both is the same, fix forward in a PR, then log it:
every problem that costs real time becomes an entry in
[Lessons Learned](/posts/projects/rag-on-cloud/lessons-learned/), and anything that changes a decision becomes an ADR.
If spend spikes, the response is the end-of-session PR: remove Search and scale the app to zero, then look at the
logs.

## Capacity and cost monitoring
{: #capacity-and-cost-monitoring }

Cost is the operational signal for this lab, so it's watched three ways:

| Signal | Tool |
|---|---|
| Month to date and forecast | The 100 a month budget on `dv-rg-rag-01` |
| What a change will cost | Infracost on every plan (fixed monthly costs only; pay-per-token usage shows as $0) |
| What a question costs | Tokens per request in traces, priced per deployment (Phase 3) |

The arithmetic behind the budget: Search Basic at about $0.10 an hour is roughly $74 for a month left up, and
everything else is pay per use and small. Capacity is the model deployments' tokens per minute (50K each) and the
Search service's single replica; an eval run that hits 429s is the signal to raise the deployment capacity, not to add
Search replicas.

## Checklist
{: #checklist }

- [ ] Budget applied and its first notification received
- [ ] Search remove-and-restore runbook tried end to end, with timings
- [ ] API sends OpenTelemetry traces to Application Insights, tagged with mode
- [ ] Dashboard shows latency, tokens and cost per mode after an eval run
- [ ] Error-rate and p95 alerts fire on a forced failure and resolve
- [ ] Performance targets set from the first baseline

{% include project-nav.html %}
