---
layout: post
title: "Dunderly HR System: Operations and Observability"
date: 2026-10-07 00:14:00 +0530
categories: [projects, dunderly]
tags: [Projects, Dunderly, Observability, Operations]
description: "Dunderly HR operations: OpenTelemetry into Application Insights, business-hours SLOs, a payroll receipt alert that matters more than CPU, and cost as a metric."
project: dunderly
project_step: 14
image:
  path: /assets/img/projects/dunderly/14-operations-and-observability.webp
  alt: "Dunderly HR System: Operations and Observability - Projects hero image"
---

The 2023 design had a Logging service fed by a queue, with logs queried for dashboards and alerts. The
instinct was right: you need to know what the system is doing. But the alert that matters most for
Dunderly isn't about CPU or error rates. It's "the payroll file hasn't been confirmed as delivered, and
payday is in four days". Operations here is built around that kind of signal.

<!-- more -->

{% include project-nav.html %}

## Application and infrastructure monitoring
{: #application-and-infrastructure-monitoring }

Everything lands in one Log Analytics workspace, with a workspace-based Application Insights resource per
environment ([ADR-006](/posts/projects/dunderly/05-technical-architecture/#architectural-decision-records)
replaces the custom logging service):

| Source | How | What we get |
|---|---|---|
| HR API | Azure Monitor OpenTelemetry Distro | Requests, dependencies (SQL, Blob), exceptions, traces, custom metrics |
| Payroll Functions | OpenTelemetry in the isolated worker | Executions, failures, queue retries |
| Blazor app | Application Insights JS SDK (page views, failed calls only) | Client errors, slow loads |
| Azure SQL, Storage, App Service, Key Vault | Diagnostic settings | Platform metrics and logs, SQL auditing |
| Pickup agent | Azure Monitor Agent on the Arc server | Event log entries for each pull |
| Availability | Standard availability test on `/health` every 5 min from 3 locations | Uptime as users see it |

Sampling is off: at this volume it would only lose the rare events we care about.

## Logging and log retention
{: #logging-and-log-retention }

Structured logs with message templates, always with a correlation ID (the W3C trace ID), which the UI shows
on error screens so a support ticket can carry it.

The hard rule: **no personal data or salary amounts in telemetry**. Logs carry IDs (`EmployeeId 1042`,
`RunId 41`), never names or numbers. An analyzer-backed review check and a scheduled KQL query that looks
for patterns like currency amounts or email addresses in `traces` enforce it.

| Data | Retention | Why |
|---|---|---|
| Application telemetry | 90 days interactive | Enough to investigate; personal-data-free |
| Platform logs, SQL audit | 90 days interactive, then archive to 1 year | Security investigations |
| Business audit (SQL) | Retention of the HR record | Legal, see [Audit logging](/posts/projects/dunderly/06-security-and-privacy/#audit-logging) |

> **Assumption:** 90 days of interactive telemetry retention. The 2023 estimate assumed 1 month for Log
> Analytics and 3 months for Application Insights.
{: .prompt-info }

## Metrics and dashboards
{: #metrics-and-dashboards }

Two workbooks (see [Azure Workbooks](/posts/cloud/azure/monitoring/azure-workbooks/)), each answering a
different person's question:

**"Is it working?" (engineering):** availability, request rate, p95 latency and failure rate per endpoint
group, SQL CPU and resume events, Function failures, queue depth, documents pending scan.

**"Is payroll on track?" (HR and engineering):** one row per month: run status, prepared/approved
timestamps, file written, picked up, receipt received, and days to payday. Green, amber, red.

Custom metrics emitted by the API and Functions:

```csharp
private static readonly Meter Meter = new("Dunderly.Hr");
private static readonly Counter<long> SalaryDecisions = Meter.CreateCounter<long>("hr.salary.decisions");
private static readonly Histogram<double> PayrollFileSeconds = Meter.CreateHistogram<double>("hr.payroll.file.duration", "s");

SalaryDecisions.Add(1, new KeyValuePair<string, object?>("outcome", "approved"));
```

## Distributed tracing
{: #distributed-tracing }

A request is traced from the browser through the API into SQL and Blob, and asynchronous work keeps the
trace going: the API writes the trace context into queue messages and outbox rows, and the Functions
continue it. So "HR approved March payroll at 10:02" and "the file was written at 10:02:07" are one trace
in the transaction search.

The pickup agent is outside Azure and doesn't join the trace, but it logs the run ID and file hash, which
are enough to join its events to the trace in a KQL query.

## Health checks
{: #health-checks }

ASP.NET Core health checks, split by purpose:

| Endpoint | Checks | Used by |
|---|---|---|
| `/health/live` | Process is up | App Service health check (instance replacement) |
| `/health/ready` | SQL reachable, Blob reachable, config valid | Smoke tests, slot warm-up |
| `/health` | Ready + a cheap read query | Availability test |

`/health/live` deliberately doesn't check SQL: if SQL is down, replacing API instances won't help, and the
platform would churn instances for nothing. Health endpoints are anonymous but return only status, no
details.

## Alerting and escalation
{: #alerting-and-escalation }

Alert on symptoms users or payroll feel, not on every metric. The whole catalogue:

| Alert | Condition | Severity | Goes to |
|---|---|---|---|
| Availability | `/health` fails from 2 of 3 locations for 10 min (business hours) | Sev 2 | App team rota |
| API errors | 5xx rate > 5% over 15 min | Sev 2 | App team rota |
| Payroll file not written | Run approved > 1 hour, no file | Sev 1 | App team + payroll operator |
| Payroll receipt missing | File written > 4 hours, no receipt | Sev 1 | App team + payroll operator + IT |
| Run not approved | 2 days before file deadline, run still draft | Sev 3 | Payroll operator |
| Document stuck in scan | Pending > 1 hour | Sev 3 | App team |
| Poison queue message | Any | Sev 2 | App team |
| Budget | 80% and 100% of monthly budget | Info | Architect, finance |

Alerts post to a Teams channel and email via action groups; Sev 1 also sends SMS. Escalation follows the
[support model](/posts/projects/dunderly/16-support-and-maintenance/#incident-response). Every alert links
to its runbook.

## Availability and performance targets
{: #availability-and-performance-targets }

> **Assumption:** These targets follow assumption A7 and the latency assumption in
> [Requirements](/posts/projects/dunderly/02-requirements-gathering/#non-functional-requirements). They
> need the sponsor's agreement before they're real SLOs.
{: .prompt-info }

| SLI | SLO | Window |
|---|---|---|
| Availability (availability test success, business hours) | 99.5% | 30 days |
| API latency (p95, excluding uploads) | < 500 ms | 30 days |
| Payroll file delivered and confirmed before cutoff + 1 day | 100% | Every month |

The third one is the SLO that matters; missing it once is a serious incident even if the others are
perfect. The first two get an error budget: if availability burns more than half its budget in a month,
the next sprint prioritizes reliability work over features.

## Operational runbooks
{: #operational-runbooks }

One Markdown file per task in `docs/runbooks/`, each with: when to use it, prerequisites, steps with exact
commands, how to verify, how to roll back.

| Runbook | Trigger |
|---|---|
| `payroll-monthly.md` | Every month: draft, review, approve, confirm receipt |
| `payroll-receipt-missing.md` | Alert: check agent, re-trigger pull, manual delivery fallback |
| `payroll-rerun.md` | Wrong file sent: correction process agreed with the payment system owner |
| `restore-sql.md` | Data loss or bad data change |
| `restore-document.md` | HR deleted a document by mistake |
| `access-request.md` | Assign or remove app roles |
| `dr-failover.md` | Region outage |
| `rotate-and-revoke.md` | Suspected credential compromise |

> **TODO:** Is there a manual fallback for delivering the payroll file (for example IT copies it by hand)?
> The receipt-missing runbook needs a last resort that doesn't depend on the agent.
{: .prompt-warning }

## Incident and problem management
{: #incident-and-problem-management }

Incidents follow a simple cycle: detect, triage (severity), mitigate, resolve, review. The detailed flow and
escalation are in [Support and Maintenance](/posts/projects/dunderly/16-support-and-maintenance/#incident-response).

Problem management is the slower loop: recurring incidents or near misses get a problem record (a GitHub
issue labelled `problem`), a root cause, and a fix tracked to completion. Example: if the agent misses
pulls twice because the payment server restarts for patching on the same night, the problem fix is to move
the patch window, not to keep re-triggering pulls.

## Capacity and cost monitoring
{: #capacity-and-cost-monitoring }

Capacity is not a concern at this size (see [Capacity and quota planning](/posts/projects/dunderly/11-infrastructure-and-environments/#capacity-and-quota-planning)),
so cost is the capacity metric:

- A **Cost Management budget** per environment with alerts at 80% and 100%.
- Tags on every resource (`app=dunderly-hr`, `env`, `owner`) so cost reports group cleanly.
- A monthly look at the cost by resource: SQL vCore-seconds, App Service plan, Defender scanning, storage,
  Log Analytics ingestion. Ingestion is the line that grows quietly if someone logs too much.

> **TODO:** The monthly budget figure, once the target design is re-priced (see
> [Budget](/posts/projects/dunderly/03-product-planning/#budget-and-resource-planning)).
{: .prompt-warning }

More on Azure cost practices: [Cloud FinOps in Azure](/posts/finops/cloud-finops-in-azure/).

## Checklist
{: #checklist }

- [ ] Wire the OpenTelemetry distro into the API and Functions; turn off sampling.
- [ ] Add the KQL check for personal data patterns in telemetry.
- [ ] Build the two workbooks.
- [ ] Create every alert in the catalogue with its runbook link.
- [ ] Agree the SLOs with the sponsor.
- [ ] Write the eight runbooks, starting with the payroll ones.
- [ ] Set budgets and tags per environment.

{% include project-nav.html %}
