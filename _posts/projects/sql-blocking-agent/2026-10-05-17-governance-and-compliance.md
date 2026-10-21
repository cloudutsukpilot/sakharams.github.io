---
published: false
layout: post
title: "SQL Blocking Agent: Governance and Compliance"
date: 2026-10-05 00:17:00 +0530
categories: [projects, sql-blocking-agent]
tags: [Projects, SQL Blocking Agent, Governance, Compliance]
description: "Governing an AI agent that can act on production: who owns the rules, who approves kills, AI usage policy, audit evidence and review of the R1–R13 gates."
project: sql-blocking-agent
project_step: 17
image:
  path: /assets/img/projects/sql-blocking-agent/17-governance-and-compliance.webp
  alt: "SQL Blocking Agent: Governance and Compliance - Projects hero image"
---

Governance for this agent has a second layer that most platform services don't: it's an AI system with
production authority, and it's the first one in the platform engineering org. The rules it follows, the
people who can approve its actions and the evidence it leaves behind will set expectations for every
agent that comes after it.

<!-- more -->

{% include project-nav.html %}

## Project governance
{: #project-governance }

| Forum | Members | Decides |
|---|---|---|
| Joint working group | DevOps and database teams | Backlog, releases, thresholds, dry-run review |
| Change review (per PR) | DevOps, plus database team for safety paths | Code, prompt and gate changes |
| Go-live board (one-off) | Both team leads, security | Enabling real kills |
| Platform engineering leadership | Sponsor | The agentic AI direction, reuse of the pattern |

## Decision-making and approval authorities
{: #decision-making-and-approval-authorities }

| Decision | Approver |
|---|---|
| A specific `KILL` at run time | Database team on-call, through the approval API |
| Gate rules, thresholds, protected logins, exclusion windows | Database team |
| Prompt and model changes | DevOps, with database team review for Determination |
| Production promotion | DevOps, through the protected `production` environment |
| Enabling real kills (and on which servers) | Database and DevOps leads jointly, security consulted |
| Approval API exposure and authentication | DevOps and security |

## Audit requirements
{: #audit-requirements }

For any production `KILL`, an auditor should be able to answer from records alone:

| Question | Evidence |
|---|---|
| Why did the agent think a kill was needed? | Analyzer findings, decision reason and rule in the audit rows and report |
| Which safety rules were checked? | Gate outcome recorded with the decision |
| Who approved, and with what note? | Approval decision, note or deny reason |
| What exactly was killed? | `KillAuditLog`: server, SPID, login, time, status |
| Did it work? | Kill validation and chain-cleared result |
| What was the impact and the follow-up? | RCA report in Blob, recommendations |

The gap to close before real kills: the approver's identity must be authenticated, not supplied by the
caller.

## Access reviews
{: #access-reviews }

Review quarterly:

- who can reach and use the approval API;
- membership of the DBA approver group, once authentication exists;
- the four SQL logins and where `sql_agent_killer` has `ALTER ANY CONNECTION`;
- the workload identity's Azure roles (Foundry, Blob, Key Vault);
- who can change production Helm values (and so `DRY_RUN`);
- who can edit `ProtectedLogins` and `ExclusionWindows`.

The `KILL` login is the most sensitive identity in the system. It should exist only on servers where real
kills are enabled.

## License management
{: #license-management }

The dependencies are permissively licensed open source (Pydantic AI, FastAPI, pyodbc, Logfire SDK,
azure-identity, the Temporal Python SDK). The services are commercial and covered by existing
agreements: Azure AI Foundry, Application Insights, SQL Server, JFrog, SonarQube. Microsoft's ODBC Driver
18 is installed with `ACCEPT_EULA=Y` in the Dockerfile, which is an explicit licence acceptance worth
noting in the component record.

## Compliance reporting
{: #compliance-reporting }

A monthly report to the database team lead and security, from AgentLogDB:

- incidents detected, by server;
- decisions by type and by rule;
- kills proposed, approved, denied, timed out, executed, validated;
- any kill later judged unsafe (target: zero);
- open governance actions (approval auth, rotation, retention).

## Data governance
{: #data-governance }

The agent sends incident data, including SQL text and login names, to Azure AI Foundry. The governance
rules I'd set: the model deployment stays in the organization's tenant and region; prompts and outputs
aren't used for model training (Azure OpenAI's default); SQL literals are masked if the monitored
databases hold regulated data; and reports and logs follow the same classification as the databases they
describe.

> **TODO:** Has the organization's AI usage policy (or AI review board, if there is one) approved this
> agent's use of Azure AI Foundry with production incident data?
{: .prompt-warning }

## Vendor and third-party management
{: #vendor-and-third-party-management }

The main external dependency is the model provider: model versions are retired on the provider's
schedule, and a forced model change is a behavior change. Track the retirement date of the deployed
`gpt-5-mini` version and plan the dry-run comparison for its successor ahead of time. Pydantic AI is the
other strategic dependency; its 1.x line is what the agent is built on.

## Policy enforcement
{: #policy-enforcement }

The governance rules are enforced in code, which is what makes them governance rather than guidance:

| Policy | Enforced by |
|---|---|
| Never act during maintenance | R13 in Determination |
| Never kill system or protected sessions | R3/R2 protection policy, failing closed |
| Never kill when rollback or log risk is high | R1, R9, R6 |
| Never exceed a kill rate | R10 |
| Only kill when applications are waiting | R11 |
| Never act on chosen isolation levels | R12 |
| A human approves every kill | `REQUIRE_HUMAN_APPROVAL=true`, mandatory in production |
| No answer means no kill | Approval timeout → `ALERT_ONLY` |
| LLM failure means no kill | Determination falls back to `ALERT_ONLY` |

Changes to any row in this table go through the database team.

## Evidence collection
{: #evidence-collection }

The evidence is produced automatically on every cycle: audit rows, the report in Blob, the email, the
logs and telemetry under one correlation ID. The project-level evidence that should be kept alongside it:
the dry-run review results, the go-live sign-off, the governance rules document (as Markdown, including
R13), and the ADRs.

## Checklist
{: #checklist }

- [ ] Approval authorities are written into the operating agreement
- [ ] Approver identity is authenticated before real kills
- [ ] Quarterly access review covers the `KILL` login and the approval API
- [ ] AI usage approval for production incident data is on record
- [ ] Model retirement dates are tracked
- [ ] Monthly compliance report from AgentLogDB is produced
- [ ] Governance rules document is Markdown and includes R13

{% include project-nav.html %}
