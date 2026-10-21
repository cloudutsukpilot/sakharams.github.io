---
published: false
layout: post
title: "OnePlatform: Operations and Observability"
date: 2026-10-05 00:14:00 +0530
categories: [projects, oneplatform]
tags: [Projects, OnePlatform, Operations, Observability]
description: "Running OnePlatform: OpenTelemetry to Application Insights, health endpoints, run IDs in job logs, failure notifications, and the SLOs and alerts still to define."
project: oneplatform
project_step: 14
image:
  path: /assets/img/projects/oneplatform/14-operations-and-observability.webp
  alt: "OnePlatform: Operations and Observability - Projects hero image"
---

OnePlatform is a monitoring tool for other people's systems: the service map, the API gateway dashboard, file and SQL job monitoring. That makes it easy to forget the portal needs monitoring too. When it's down, operations loses its dashboards at the same moment it might need them. This post covers what we observe today, what we don't, and the targets I'd set.

<!-- more -->

{% include project-nav.html %}

## Application and infrastructure monitoring
{: #application-and-infrastructure-monitoring }

| Layer | What watches it |
|---|---|
| Portal backend | OpenTelemetry Node SDK with auto-instrumentation, exporting traces to Application Insights |
| Middleware API and Functions | OpenTelemetry with the Azure Monitor exporter |
| Pods and nodes | AKS cluster monitoring (configured outside these repos) |
| Template runs | Scaffolder task history; a poller turns failures into notifications every 30 seconds |
| Scheduled imports | Run-scoped logs (for example every FinOps log line carries a `FinOpsRunId`) |
| Dependencies the portal shows | Statuspage cards for vendor status |

The portal sets its cloud role name per environment (`[Production]/<portal>`), so one Application Insights resource can hold all three environments and still be filtered cleanly.

## Logging and log retention
{: #logging-and-log-retention }

The portal logs through a Winston logger wired into Backstage's logging service; the middleware uses structured `ILogger` with named parameters and a sanitizing wrapper on every provider, so user input can't forge log lines. Console logging in Azure is banned in the middleware rules. Logs land in Application Insights and the cluster's log pipeline.

> **TODO:** Log retention in Application Insights and the workspace for each environment, and whether audit-relevant logs need longer retention than the default.
{: .prompt-warning }

## Metrics and dashboards
{: #metrics-and-dashboards }

Backstage's own metrics service is replaced with a no-op in the portal, so plugin-level metrics aren't emitted today. What we do have:

- **Adoption Insights:** a portal page built on Kusto queries over the portal's own telemetry, showing which features each role uses.
- **Request and dependency metrics** from OpenTelemetry auto-instrumentation in Application Insights.
- **Health endpoints** for both apps.

What I'd add first: template runs per hour and their failure rate, catalog ingestion duration per provider, and middleware import duration per run. Those three would have shown the catalog lock problem before users did.

## Distributed tracing
{: #distributed-tracing }

Both apps export traces to Application Insights, so a portal request that calls the middleware shows as one trace across the two cloud roles, as long as trace context propagates over HTTP (the Node and .NET auto-instrumentations handle that). The irony: the portal's service map dashboard, built to visualize other teams' distributed traces, can visualize the portal's own.

## Health checks
{: #health-checks }

| App | Endpoint | Checks |
|---|---|---|
| Portal backend | `/healthcheck` | Process up, returns `{status: ok}` |
| Middleware API | `/healthz` | App Configuration plus five EF Core database contexts; 200 or 503 with environment metadata |

The middleware check is the better model. It fails when a dependency fails, so a probe or a load balancer can act on it. I'd extend the portal check to include database connectivity and make sure both are wired into Kubernetes readiness probes ([Architecture](/posts/projects/oneplatform/05-technical-architecture/#resilience-and-disaster-recovery)).

## Alerting and escalation
{: #alerting-and-escalation }

Today's alerting is user-facing more than operator-facing: template failures notify the requester (and can post to a Teams channel), and late or empty files raise Jira tickets for operations.

> **TODO:** What alerts exist for the portal itself: availability tests, failed sign-ins, ingestion failures, middleware 5xx? Who is paged, and in what hours? If the answer is "none", the first three I'd add are an availability test on sign-in, an ingestion-failure alert per provider, and a FOCUS import integrity failure alert.
{: .prompt-warning }

## Availability and performance targets
{: #availability-and-performance-targets }

No SLOs are recorded. A starting proposal for an internal portal used in business hours:

| SLI | Proposed SLO |
|---|---|
| Sign-in and home page available (synthetic check) | 99.5% during business hours, monthly |
| Template submit to task start | p95 under 5 s |
| Dashboard data load (middleware-backed) | p95 under 3 s |
| Daily FOCUS import complete with full integrity | 95% of days |
| Catalog provider runs succeeding | 99% of runs per provider |

> **TODO:** Agree these (or different) targets with stakeholders, especially operations, who rely on the dashboards during incidents.
{: .prompt-warning }

## Operational runbooks
{: #operational-runbooks }

Runbooks I'd keep next to the code, with what exists today:

| Situation | First steps |
|---|---|
| Users can't sign in | Check Entra app registration secret expiry, the standard-user group, and backend logs for the resolver |
| A template fails for everyone | Check the action's identity (service principal or GitHub App) for expiry or lost rights; check the target workflow repo |
| Catalog missing resources | Check per-subscription provider logs; one subscription failing doesn't stop the others |
| FinOps report stale | Query logs by `FinOpsRunId`; integrity failure means views were deliberately not refreshed |
| Middleware 503 | `/healthz` names the failing context; check database and App Configuration |
| Need to restart middleware | Run the restart-pods workflow for the environment |

## Incident and problem management
{: #incident-and-problem-management }

Looking at how the portal is built, the failures I'd expect most are **credential or upstream** problems (an expired secret, a retired API) rather than code. That points to two problem-management habits: track every credential's expiry in one place, and treat upstream deprecation notices (like GitHub's Copilot metrics API) as planned work with a date.

> **TODO:** Is there a post-incident review practice for the portal, and where are reviews recorded?
{: .prompt-warning }

## Capacity and cost monitoring
{: #capacity-and-cost-monitoring }

The portal can show the cost of any Azure resource on its entity page, including its own. The cheap win is to make OnePlatform's own resources (AKS share, PostgreSQL, Function Apps, Application Insights) catalog entities with the cost trend card, and review them monthly. For capacity, watch pod CPU and memory during catalog ingestion. That's the peak, not user traffic ([Infrastructure](/posts/projects/oneplatform/11-infrastructure-and-environments/#capacity-and-quota-planning)).

## Checklist
{: #checklist }

- [ ] Portal health check includes database connectivity; both apps wired to readiness probes
- [ ] Template run failure rate, ingestion duration and import duration emitted as metrics
- [ ] Availability test on sign-in with an alert
- [ ] Alerts on provider ingestion failure and FOCUS integrity failure
- [ ] SLOs agreed and reviewed monthly
- [ ] Runbook table moved into the repo docs and linked from the portal
- [ ] Credential expiry register with owners
- [ ] OnePlatform's own resources visible with cost trends in the catalog

{% include project-nav.html %}
