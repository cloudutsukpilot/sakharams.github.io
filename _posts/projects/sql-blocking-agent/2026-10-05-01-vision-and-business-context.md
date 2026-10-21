---
published: false
layout: post
title: "SQL Blocking Agent: Vision and Business Context"
date: 2026-10-05 00:01:00 +0530
categories: [projects, sql-blocking-agent]
tags: [Projects, SQL Blocking Agent, Vision, Business]
description: "Why the SQL Blocking Agent exists: blocking chains handled in minutes with evidence, and the platform org's first step into agentic AI done safely."
project: sql-blocking-agent
project_step: 1
image:
  path: /assets/img/projects/sql-blocking-agent/01-vision-and-business-context.webp
  alt: "SQL Blocking Agent: Vision and Business Context - Projects hero image"
---

Every DBA knows the pattern: an application slows down, someone opens a ticket, and twenty minutes later
a DBA finds one forgotten transaction holding locks that forty sessions are waiting on. The fix is often
a single `KILL`. Deciding whether that `KILL` is safe is the hard part. The SQL Blocking Agent does the
finding and the reasoning automatically, and leaves the decision to kill with a human. It was also the
platform engineering org's first agentic AI project, so it had to prove that "agentic" and "safe" can
live in the same sentence.

<!-- more -->

{% include project-nav.html %}

## Business problem and opportunity
{: #business-problem-and-opportunity }

SQL Server blocking is one of the most common causes of "the app is slow" incidents, and one of the
most tedious to diagnose by hand. A DBA has to:

1. notice the blocking (usually after users do);
2. walk `blocking_session_id` back to the head blocker;
3. work out what that session is doing, and whether killing it would trigger a long rollback;
4. check the transaction log, the isolation level, the plan, and whether the login belongs to
   something that must never be touched;
5. decide, act, and then write up what happened.

Steps 1 to 4 are mechanical and fast for software. Step 5's write-up is exactly the kind of structured
summary an LLM is good at. The decision itself, kill or not, is where a mistake costs data or an outage.

The opportunity is to split the problem along that line: **deterministic code for detection, safety
checks and execution; an LLM for analysis and explanation; a human for the irreversible step.** That
split is the whole design, and it's why the agent can run against production SQL Servers at all.

## Goals, objectives, and expected outcomes
{: #goals-objectives-and-expected-outcomes }

| Goal | How the agent delivers it |
|---|---|
| Detect blocking before users report it | Polls `sys.dm_exec_requests` per server every 15 seconds by default |
| Find the head blocker reliably | Deterministic walk of the blocking chain, no LLM |
| Explain the incident in minutes | Analyzer and RCA agents produce a structured diagnosis and report |
| Never make an unsafe kill | Hard gates R1, R2, R3, R6, R9 to R13 in code; human approval for any `KILL` |
| Leave an audit trail | Immutable rows in AgentLogDB, HTML report in Blob Storage, email to the DBA team |
| Keep LLM cost visible | Three LLM calls per analyzed cycle, token totals per cycle |
| Prove agentic AI in platform engineering | A working, reviewed reference for the next agents |

The last goal is easy to underrate. As the org's first agentic AI project, this agent is also the
template for how the next ones are built: framework choice, auth, safety gates, approval and
observability.

## Stakeholders, sponsors, and decision-makers
{: #stakeholders-sponsors-and-decision-makers }

| Group | Role in the project |
|---|---|
| DevOps team | Built the agent, owns the code, the Helm chart, the pipelines and the AKS namespace |
| Database team | Domain experts: defined what "safe to kill" means, own the monitored servers, review and approve kills |
| Platform engineering org | Sponsor of the first agentic AI implementation |
| Application owners | The people whose sessions are the victims; benefit from faster resolution |
| Security | Reviews identities, secrets, the approval API exposure and LLM data handling |

The DevOps and database teams built it together, and that collaboration shows in the design: the
governance rules read like a DBA's checklist because they are one.

> **TODO:** Who signs off on moving production from dry-run to real kills: the database team lead, the
> DevOps lead, or both together?
{: .prompt-warning }

## Target users and personas
{: #target-users-and-personas }

- **The on-call DBA.** Gets the email, reads the RCA, and approves or denies a proposed `KILL` with
  `approve.py`. Wants evidence, not a chat transcript.
- **The DBA team lead.** Tunes thresholds per server in `TargetServers`, maintains `ProtectedLogins` and
  `ExclusionWindows`, and reviews kill history.
- **The DevOps engineer.** Deploys and operates the agent on AKS, watches its health and cost, and adds
  monitored servers.
- **The agent developer.** Changes prompts, gates or tools, and has to prove the change is still safe.
- **The application owner.** Reads the RCA's recommendations (P1 to P4, with T-SQL) to fix the query or
  transaction pattern that caused the blocking.

## Success metrics and business KPIs
{: #success-metrics-and-business-kpis }

| KPI | How to measure |
|---|---|
| Time from blocking start to detection | Blocking event timestamps in `BlockingEventLog` |
| Time from detection to RCA delivered | Cycle duration in the cycle summary |
| Decision accuracy | DBA review of dry-run decisions: would they have made the same call? |
| Unsafe-kill count | Must be zero; any kill later judged unsafe is a Sev 1 for the agent |
| Approval turnaround | Time between pending approval and decision |
| LLM cost per incident | Token totals per cycle |
| Repeat incidents | Same head-blocker pattern within a week, from cooldown and audit data |

Dry-run in production is the measurement phase for "decision accuracy": every proposed decision is
recorded, and the DBA team can compare it with what they would have done.

> **TODO:** What was the typical time to resolve a blocking incident before the agent, and how many such
> incidents per month do the monitored servers see? That's the baseline the agent will be judged
> against.
{: .prompt-warning }

## Scope, assumptions, constraints, and dependencies
{: #scope-assumptions-constraints-and-dependencies }

**In scope:** detection, analysis, decision, human approval, `KILL` with validation, RCA, audit, reports
and notification for SQL Server (IaaS, PaaS and Managed Instance targets) listed in `TargetServers`.

**Out of scope:** fixing the query or schema that caused the blocking (the RCA recommends, people fix),
deadlocks (SQL Server resolves those itself), and moving the agent's own databases to PostgreSQL (the
migration is documented but deliberately out of scope for the Helm deployment).

**Constraints:**

- One active poller per server. There is no leader lock yet, so production runs a **single replica**.
- Human approval is **mandatory** in production (`REQUIRE_HUMAN_APPROVAL=true`).
- Production is in **dry-run** today; real kills are proven in development and local harnesses.
- LLM access only through Azure AI Foundry with keyless (`DefaultAzureCredential`) auth.

**Dependencies:** the monitored SQL Servers and their DMVs, AgentConfigDB and AgentLogDB, Azure AI
Foundry, Azure Blob Storage for reports, SMTP for email, AKS with Argo CD, and the external secrets
provider.

## Checklist
{: #checklist }

- [ ] Sign-off owner for enabling real kills is named
- [ ] Baseline incident count and resolution time are recorded
- [ ] DBA review of dry-run decisions is scheduled and its results kept
- [ ] "Zero unsafe kills" is written down as the non-negotiable KPI
- [ ] Out-of-scope items (deadlocks, query fixes, PostgreSQL) are stated in the README
- [ ] The design is shared as the reference pattern for the next agentic AI project

{% include project-nav.html %}
