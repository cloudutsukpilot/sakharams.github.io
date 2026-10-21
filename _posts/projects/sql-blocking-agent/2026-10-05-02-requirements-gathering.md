---
published: false
layout: post
title: "SQL Blocking Agent: Requirements Gathering"
date: 2026-10-05 00:02:00 +0530
categories: [projects, sql-blocking-agent]
tags: [Projects, SQL Blocking Agent, Requirements]
description: "SQL Blocking Agent requirements: what it must detect and decide, the R1–R13 governance rules as business rules, and acceptance criteria for a safe KILL."
project: sql-blocking-agent
project_step: 2
image:
  path: /assets/img/projects/sql-blocking-agent/02-requirements-gathering.webp
  alt: "SQL Blocking Agent: Requirements Gathering - Projects hero image"
---

The first requirement anyone wrote for this agent wasn't a feature. It was a sentence from the database
team: "it must never make things worse." Every other requirement follows from that one: what the agent
must detect, what it may decide, what it must prove before acting, and what it must leave behind for
the DBA who reads about it the next morning.

<!-- more -->

{% include project-nav.html %}

## Functional requirements
{: #functional-requirements }

| # | Requirement | Implemented in |
|---|---|---|
| F1 | Monitor every active, enabled server in `TargetServers`; pick up changes within a minute | `orchestrator/config.py`, refresh every `CONFIG_REFRESH_INTERVAL_MINUTES` |
| F2 | Detect blocking and identify the head blocker and victims | `tools/blocking_check.py` (DMVs, no LLM) |
| F3 | Collect diagnostics: log safety, plan cache, Query Store, locks, KB scenario | Analyzer tools in `tools/` |
| F4 | Produce a structured analysis and severity | Analyzer agent (Pydantic AI) |
| F5 | Decide `KILL`, `ALERT_ONLY` or `SKIP` with risk, reason and rule | Determination agent |
| F6 | Require human approval for a `KILL`; no answer means no kill | `orchestrator/router.py`, `approve.py` |
| F7 | Execute the `KILL` safely and validate the outcome | `tools/sql_query.py`, `tools/sql_validator.py` |
| F8 | Produce an RCA with business impact and P1 to P4 recommendations | RCA agent |
| F9 | Write an immutable audit trail, render HTML and Markdown reports, email the DBA team | Notification node, `audit_log.py`, `report_renderer.py`, `alert.py` |
| F10 | Avoid re-analyzing the same incident repeatedly | Incident cooldown (`analysis_cooldown_seconds`) |
| F11 | Respect maintenance windows | `ExclusionWindows` (R13) |

## Non-functional requirements
{: #non-functional-requirements }

- **Safety over speed.** A wrong `SKIP` costs a few minutes; a wrong `KILL` can cost hours of rollback.
  Every ambiguity resolves toward not killing.
- **Deterministic where it matters.** Detection, gates, execution and audit must not depend on model
  output.
- **Structured LLM output only.** Every model response is validated against a Pydantic schema, with
  automatic retries on schema errors.
- **Bounded work per incident.** At most three LLM calls per analyzed cycle and one analysis retry.
- **No stored keys for the LLM.** `DefaultAzureCredential` with a bearer-token provider.
- **Fail closed on configuration.** No usable `TargetServers` rows at startup means no monitoring; a
  failed refresh keeps the last good configuration rather than dropping servers.
- **Observable per incident.** One correlation ID across logs, telemetry, audit rows and reports.
- **Single active poller per server.** Two pollers could double-detect and double-kill.

> **TODO:** What's the target time from blocking start to a DBA receiving the RCA email (for example,
> under five minutes)? It sets the poll interval and the LLM timeout budget.
{: .prompt-warning }

## User journeys and use cases
{: #user-journeys-and-use-cases }

1. **A batch job holds locks at 10 am.** The agent detects 12 victims, the Analyzer finds an open
   transaction with a small log footprint, all gates pass, the LLM proposes `KILL`, the on-call DBA
   approves from `approve.py`, the session is killed, the chain clears, and the RCA explains which job
   to fix.
2. **A long data load is blocking.** The log usage is above `log_used_pct_threshold`, so R6 fires:
   `ALERT_ONLY`. The DBA team gets the RCA and decides themselves.
3. **A maintenance window.** Index rebuilds block for ten minutes inside an `ExclusionWindows` period:
   R13, `SKIP`, nothing sent beyond the record.
4. **The same blocker is still there next cycle.** Cooldown skips the LLM pipeline, so the agent doesn't
   spend tokens on an incident it already analyzed.
5. **Nobody answers the approval.** After the timeout (300 s by default) the decision becomes
   `ALERT_ONLY`; nothing is killed.

## Acceptance criteria
{: #acceptance-criteria }

For the core path, written so the database team can sign it off:

```gherkin
Given a blocking chain whose head blocker has waited longer than KillThresholdMs
And at least MinVictimCount victims, one of them an application account
And no hard gate fires (R1, R2, R3, R6, R9, R10, R11, R12, R13)
When the cycle runs with REQUIRE_HUMAN_APPROVAL=true and DRY_RUN=false
Then a pending approval is created with the full evidence
And no KILL is issued until a DBA approves
And after approval the KILL runs on an autocommit connection with @@TRANCOUNT = 0
And kill_validation is CONFIRMED_GONE or ROLLING_BACK
And BlockingEventLog, KillAuditLog and RCASnapshotLog each have a row with the cycle's correlation ID
And the DBA email links to the HTML RCA report in Blob Storage
```

And the negative ones matter more: each hard gate, when it fires, must produce its documented decision
without an LLM decision call and without any `KILL`.

## Business rules
{: #business-rules }

The governance rules are the business rules. Hard gates run in code, in this order, and the LLM can't
override them:

| Rule | Condition | Result |
|---|---|---|
| R13 | Server inside an `ExclusionWindows` maintenance period | `SKIP` |
| R3 / R2 | Protected session: `session_id <= 50`, not a user process (unknown fails closed), or login in `ProtectedLogins` | `ALERT_ONLY` |
| R1 | Rollback estimate is hours (`UNSAFE_ROLLBACK_WILL_TAKE_HOURS`) | `ALERT_ONLY`, critical |
| R9 | Transaction log above `log_size_kill_threshold_gb` | `ALERT_ONLY`, DBA approval |
| R6 | Log usage at or above `log_used_pct_threshold` | `ALERT_ONLY` |
| R10 | Real kills in the last hour at `max_kills_per_hour` | `ALERT_ONLY` |
| R12 | Isolation level in `skip_isolation_levels` (for example `SERIALIZABLE`) | `SKIP` |
| R11 | No victim is an application account | `SKIP` |

Then the LLM decides, guided by: **R4** wait below `kill_threshold_ms` → `SKIP`; **R5** fewer victims than
`min_victim_count` → `SKIP`; **R7** a better Query Store plan exists → flag it as a priority fix; **R8** an
object-level lock with a short wait → prefer `SKIP` (likely lock escalation). The full flow is animated
in [Security and Privacy](/posts/projects/sql-blocking-agent/06-security-and-privacy/#threat-modeling).

## Reporting and analytics requirements
{: #reporting-and-analytics-requirements }

| Report | Audience | Content |
|---|---|---|
| HTML RCA report (Blob) | DBA team, app owners | Decision, kill status, incident details, key findings, RCA, business impact, recommendations, rationale, token usage |
| DBA email | On-call DBA | Formatted summary with the report link; plain-text fallback |
| Audit tables | DBA lead, auditors | `BlockingEventLog`, `KillAuditLog`, `RCASnapshotLog` |
| Cycle summary log | DevOps | Decision, kill status, human decision, risk, errors, duration, tokens |

What's not there yet is trend reporting: incidents per server per week, top recurring head-blocker
patterns, dry-run decision accuracy. All of it can be queried from AgentLogDB.

## Accessibility and localization requirements
{: #accessibility-and-localization-requirements }

The user-facing outputs are emails, HTML reports and a CLI. Emails carry a plain-text alternative and the
dynamic incident content is escaped before rendering. Reports should use real headings and tables, and
never encode severity by colour alone (the decision and risk are always written as words). Localization
isn't needed: the DBA team works in English, and T-SQL is T-SQL.

## Regulatory, legal, and compliance requirements
{: #regulatory-legal-and-compliance-requirements }

Two areas need attention. First, **killing a session is a change to production**, so it needs the same
evidence as any change: who approved, why, what happened. The approval note, the audit rows and the
report provide it. Second, **the LLM sees incident data**: SQL text, login names, database names and
plans are sent to Azure AI Foundry. That stays inside the organization's Azure tenant, but it must be
covered by the data-handling rules for the monitored databases.

> **TODO:** Which compliance frameworks cover the monitored databases, and has the data-handling
> review approved sending SQL text and login names to the Azure AI Foundry deployment?
{: .prompt-warning }

## Prioritization and release scope
{: #prioritization-and-release-scope }

The order the project has followed, and should keep:

1. **Safe detection and decision in dry-run** (done, live in production).
2. **Human-approved kills** with validation (done in development and the live harness).
3. **Real kills in production** for a first set of servers (next, after the dry-run review).
4. **Operability:** leader lock for HA, poller heartbeat, alerting, trend reports.
5. **Durable execution** with Temporal and Platform One approvals (built, optional, not in production).

## Checklist
{: #checklist }

- [ ] Database team signs off the gate table and thresholds per server
- [ ] Acceptance criteria above are automated as tests, including every negative gate
- [ ] Target detection-to-email time is agreed
- [ ] Data-handling approval for LLM inputs is on record
- [ ] Trend reports are defined from AgentLogDB
- [ ] Release scope for enabling real kills is agreed

{% include project-nav.html %}
