---
layout: post
title: "SQL Blocking Agent: Operations and Observability"
date: 2026-10-05 00:14:00 +0530
categories: [projects, sql-blocking-agent]
tags: [Projects, SQL Blocking Agent, Observability, Operations]
description: "Operating the SQL Blocking Agent: correlation IDs, Logfire and Application Insights, the health signals a polling daemon needs, alerts, runbooks and LLM cost."
project: sql-blocking-agent
project_step: 14
image:
  path: /assets/img/projects/sql-blocking-agent/14-operations-and-observability.webp
  alt: "SQL Blocking Agent: Operations and Observability - Projects hero image"
---

An incident-response agent has an awkward property: when it's broken, the symptom is silence. No
blocking reports looks exactly like no blocking. So observability for this agent isn't only about
debugging a bad decision; it's about proving, continuously, that every server is still being watched.

<!-- more -->

{% include project-nav.html %}

## Application and infrastructure monitoring
{: #application-and-infrastructure-monitoring }

| Signal | Why | Source today |
|---|---|---|
| Last successful cycle per server | Silence must be detectable | Cycle summary logs (not yet a metric) |
| Cycle errors per server | SQL connectivity, permissions, config | Cycle summary `errors` |
| Decisions per day by type | Behavior drift | Audit tables |
| Approval outcomes and turnaround | Human loop health | Audit rows, router logs |
| Kill validation results | `STILL_PRESENT` needs attention | `KillAuditLog` |
| LLM latency, retries, tokens | Cost and model health | Pydantic AI instrumentation, token tracker |
| Pod restarts, CPU, memory | Platform health | AKS |

## Logging and log retention
{: #logging-and-log-retention }

Every cycle gets a short correlation ID that appears in logs, telemetry spans, audit rows, the report
filename and the cycle summary. The Troubleshooting guide's "filter by one session" section is built on
it: one grep or one KQL query shows a cycle end to end. Locally, telemetry is console-only (`LOCAL=true`);
deployed, it goes to Application Insights.

Retention needs a decision, because logs can contain SQL text and login names: keep them only as long as
needed for troubleshooting, and keep the audit tables as the long-term record.

## Metrics and dashboards
{: #metrics-and-dashboards }

The dashboard I'd build for the DevOps and database teams, mostly from AgentLogDB and Application
Insights:

| Panel | Query source |
|---|---|
| Minutes since last successful cycle, per server | Telemetry or a heartbeat table |
| Blocking incidents per server per day | `BlockingEventLog` |
| Decisions: KILL, ALERT_ONLY, SKIP, and which rule fired | Audit tables |
| Approvals: approved, denied, timed out; median time to decide | Audit rows |
| Kill validation outcomes | `KillAuditLog` |
| Tokens per day and per incident, by agent | Token tracker, Logfire |
| Top recurring head-blocker patterns | `BlockingEventLog` grouped by login and program |

The Helm design record leaves the metrics stack open (Prometheus, OpenTelemetry, Application Insights,
Logfire). Since telemetry already flows to Application Insights, I'd start there.

## Distributed tracing
{: #distributed-tracing }

A cycle is one process, but it crosses several systems: SQL Server, Azure AI Foundry, Blob, SMTP and, in
Temporal mode, the Temporal server and Platform One. Pydantic AI's instrumentation (through Logfire's
`instrument_pydantic_ai()`) traces each agent run with its tokens and retries, and the correlation ID ties
the spans together. In Temporal mode, the workflow ID becomes the natural trace root.

## Health checks
{: #health-checks }

Today the approval API's `GET /health` returns `{"status": "ok"}`, which proves the process answers HTTP,
not that pollers are polling. The Helm record asks for a real heartbeat, and I agree:

- **Liveness:** each poller writes a heartbeat timestamp after every completed cycle; liveness fails if
  any active server's heartbeat is older than, say, three poll intervals plus the LLM budget.
- **Readiness:** process and API up, initial configuration loaded.
- **Not a health failure:** a monitored SQL Server being unreachable. The design record is explicit that
  the pod stays ready and the problem shows up in logs and alerts instead.

## Alerting and escalation
{: #alerting-and-escalation }

| Alert | First responder | Escalate to |
|---|---|---|
| No successful cycle for a server in N minutes | DevOps on-call | Database team if the server is the problem |
| Repeated cycle errors (auth, permissions) | DevOps on-call | Identity or database team |
| LLM authentication failure or throttling | DevOps on-call | Platform AI owners |
| Approval timed out | Database team (it already means no kill) | DBA lead if it repeats |
| Kill validation `STILL_PRESENT` or chain not cleared | Database team | DevOps for agent behavior |
| R10 kill-rate limit reached | Database team | Both teams: something is wrong |

> **TODO:** Where should these alerts go (Teams channel, PagerDuty, email), and who owns the thresholds?
{: .prompt-warning }

## Availability and performance targets
{: #availability-and-performance-targets }

Proposals, to agree with the database team:

| SLI | Target |
|---|---|
| Servers with a successful cycle in the last 5 minutes | 99.5% of the time |
| Detection delay (blocking start to detection) | Within two poll intervals |
| Detection to RCA email | Under 5 minutes |
| Unsafe kills | Zero |

## Operational runbooks
{: #operational-runbooks }

The Troubleshooting guide is already the runbook, organized by symptom: startup and import failures,
`TargetServers` not loading, ODBC driver problems, Azure authentication, LLM validation and cost, detection
and DMV permissions, "it never kills" and "it kills too aggressively", kill validation states, approval
problems, deployed-container issues with KQL, and Temporal mode. Two to add: the **kill switch** (set
`DRY_RUN=true` through Argo CD, or scale to zero) and the **post-kill review** (correlation ID → audit
rows → report → approval note → gate and threshold review).

## Incident and problem management
{: #incident-and-problem-management }

There are two kinds of incident, and they shouldn't be confused:

- **The incidents the agent handles** (blocking chains): the agent's own output is the incident record,
  and problem management means acting on the RCA's P1 to P4 recommendations so the same blocker stops
  recurring.
- **Incidents in the agent** (silence, a wrong decision, a failed kill): Sev 1 for any kill later judged
  unsafe, Sev 2 for a server silently unmonitored, and the fix is a test or a gate, not just a code change.

## Capacity and cost monitoring
{: #capacity-and-cost-monitoring }

LLM spend is the cost to watch. The live run analysis is a useful reference: the second live session in July
used about 9,600 tokens (7,261 input, 2,359 output) for one analyzed incident, which took three model
requests. Quiet cycles cost nothing. Cooldown (300 s by default) and the one-retry limit cap the worst case.
A daily token total per server, with an alert on a sudden jump, catches both a prompt regression and a
server that's blocking all day.

## Checklist
{: #checklist }

- [ ] A heartbeat-based liveness probe replaces API-only health
- [ ] "Minutes since last cycle per server" is a dashboard panel and an alert
- [ ] Alert destinations and owners are agreed
- [ ] Kill-switch and post-kill review runbooks are added to Troubleshooting
- [ ] Log retention is set with SQL text sensitivity in mind
- [ ] Daily token totals per server are tracked with a spike alert

{% include project-nav.html %}
