---
layout: post
title: "SQL Blocking Agent: Product Planning"
date: 2026-10-05 00:03:00 +0530
categories: [projects, sql-blocking-agent]
tags: [Projects, SQL Blocking Agent, Planning, Roadmap]
description: "SQL Blocking Agent roadmap: from a dry-run MVP to approved production kills, high availability and durable execution, with the safety-first rules for change."
project: sql-blocking-agent
project_step: 3
image:
  path: /assets/img/projects/sql-blocking-agent/03-product-planning.webp
  alt: "SQL Blocking Agent: Product Planning - Projects hero image"
---

The SQL Blocking Agent went from its first commit on 18 June 2026 to production in under three months, and
then deliberately stopped short of its most powerful feature: production runs in dry-run. That pause is
the plan, not a delay. The roadmap is built around earning the right to kill a session, one piece of
evidence at a time.

<!-- more -->

{% include project-nav.html %}

## Product roadmap
{: #product-roadmap }

What has happened so far, from the repository history:

| When | Milestone |
|---|---|
| Before June 2026 | A LangChain + LangGraph prototype, then the decision to move to Pydantic AI |
| June 2026 | This repository starts on Pydantic AI (18 June) |
| July 2026 | Live run on a local SQL Server: detection through a real `KILL`, validation, RCA and audit (10 July) |
| August 2026 | Pre-KILL session identity validation (SPID, login name and login time must still match); system-session protection policy |
| September 2026 | First releases, production at v1.0.6 (10 September); then `gpt-5-mini` models, RCA reports to Blob, connection strings moved into AgentConfigDB |
| Late September 2026 | Transaction-safe `KILL` connection (`@@TRANCOUNT` guard); R11 uses protected login names; reviewer field in approvals; development at v1.0.34 |

What comes next, in my recommended order:

1. **Promote the current development line to production** (still dry-run), so production runs the
   late-September safety work, above all the transaction-safe `KILL` path.
2. **Review dry-run decisions** with the database team and agree the go/no-go for real kills.
3. **Enable real kills** on a first set of servers, approval still mandatory.
4. **High availability**: a database leader lock, then more than one replica.
5. **Durable execution**: Temporal mode and Platform One approvals in production.
6. **Agent platform**: reuse the pattern for the next agentic AI use case.

## MVP definition
{: #mvp-definition }

The MVP was "a DBA gets a correct, explained incident report without lifting a finger, and nothing is
killed without them". In feature terms:

- deterministic detection and head-blocker identification;
- Analyzer, Determination and RCA agents with validated structured output;
- the hard governance gates;
- human approval with deny-by-default on timeout;
- audit tables, HTML report and DBA email;
- dry-run by default.

Production today is exactly that MVP. Real kills, HA and Temporal are post-MVP.

## Release milestones
{: #release-milestones }

| Milestone | Exit criteria |
|---|---|
| M1 Dry-run in production | Running on AKS, all target servers polled, reports reaching the DBA team (done) |
| M2 Current code in production | Production on the latest development version, including the transaction-safe `KILL` path |
| M3 Dry-run review complete | The database team has reviewed a sample of decisions and agrees with them |
| M4 First real kills | `DRY_RUN=false` for named servers, approval mandatory, kill-rate limit set conservatively |
| M5 HA | Leader lock implemented and tested; two replicas without duplicate cycles |
| M6 Durable mode | Temporal worker and schedules in production; Platform One approvals |

> **TODO:** Are there target dates for M2 (catching production up from v1.0.6) and M4 (first real
> kills)?
{: .prompt-warning }

## Backlog structure
{: #backlog-structure }

The repository already shows how work is organized: one Jira ticket per change (the branch names and
the `SDO-*_CHANGELOG.md` files carry the ticket key), and each larger change has an implementation
tracker with scope, confirmed policy and test evidence. I'd keep three epics:

- **Safety** (gates, pre-kill validation, protection policy, kill validation);
- **Intelligence** (prompts, diagnostics, KB scenarios, RCA quality, cost);
- **Platform** (Helm, CI/CD, HA, Temporal, observability, docs).

A safety story is never done without a negative test showing the agent refuses to kill.

## Prioritization approach
{: #prioritization-approach }

Safety beats features, every time. Then, within the remaining work, I'd rank by "what stands between us
and the next milestone". Right now that means:

1. Production catching up with development (v1.0.6 against v1.0.34 in development).
2. Evidence from the dry-run review.
3. The operability gaps the Helm design record lists: a poller heartbeat, alerting, approval API access
   control.

Cost and prompt quality improvements come after, unless token spend becomes a problem.

## Budget and resource planning
{: #budget-and-resource-planning }

The running costs are small but worth tracking:

| Cost | Driver |
|---|---|
| Azure AI Foundry tokens | Three calls per analyzed cycle; the July live run used about 9,600 tokens for one analyzed incident |
| AKS | One small pod (single replica) |
| SQL Server | AgentConfigDB and AgentLogDB on the existing management server |
| Blob Storage | HTML reports, small |
| People | DevOps team for the platform, database team for rules, reviews and approvals |

Cooldown matters for cost: without it, a blocker that persists for ten minutes would be analyzed forty
times at a 15-second poll interval.

> **TODO:** Is there a monthly budget for Azure AI Foundry usage by this agent, and who watches it?
{: .prompt-warning }

## Risk and dependency management
{: #risk-and-dependency-management }

| Risk | Mitigation |
|---|---|
| The agent kills the wrong session | Hard gates, human approval, pre-kill identity check, dry-run first |
| Two pollers act on the same incident | Single replica until a leader lock exists |
| LLM unavailable or throttled | Deterministic fallbacks; no LLM means no kill decision |
| Approval API reachable by the wrong people | Private ingress only; access control is an open item |
| Production drifts behind development | Regular promotion; M2 milestone |
| Prompt change alters decisions silently | Determination tests; dry-run comparison before release |
| Knowledge held by a few people | The engineer and onboarding guides; this playbook |

## Change-control process
{: #change-control-process }

Changes to these are safety-relevant and need a database team reviewer:

- governance gates and their thresholds;
- the Determination prompt;
- the action path (`sql_query.py`, `sql_validator.py`);
- the protection policy and `ProtectedLogins`;
- approval behavior and timeouts.

Everything else follows the normal PR, release and promote flow in
[CI/CD](/posts/projects/sql-blocking-agent/12-cicd-and-release-management/#deployment-automation). Turning
`DRY_RUN` off for a server is itself a change, made in Git (Argo CD values), reviewed, and announced.

## Checklist
{: #checklist }

- [ ] M2 to M4 have owners and target dates
- [ ] Safety, Intelligence and Platform epics exist in Jira
- [ ] Safety-relevant paths require a database team reviewer (CODEOWNERS)
- [ ] LLM budget and its owner are agreed
- [ ] The risk register is reviewed before enabling real kills
- [ ] Enabling real kills is a reviewed Git change, never a manual edit

{% include project-nav.html %}
