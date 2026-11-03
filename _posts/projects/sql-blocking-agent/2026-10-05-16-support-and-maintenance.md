---
published: false
layout: post
title: "SQL Blocking Agent: Support and Maintenance"
date: 2026-10-05 00:16:00 +0530
categories: [projects, sql-blocking-agent]
tags: [Projects, SQL Blocking Agent, Support, Maintenance]
description: "Supporting the SQL Blocking Agent: shared DevOps and DBA ownership, triage by \"agent, server or decision\", model and dependency upgrades, and recovery."
project: sql-blocking-agent
project_step: 16
image:
  path: /assets/img/projects/sql-blocking-agent/16-support-and-maintenance.webp
  alt: "SQL Blocking Agent: Support and Maintenance - Projects hero image"
---

Support for this agent is shared by design. The DevOps team owns the software and its platform; the
database team owns the servers it watches and every decision to kill. Most support questions are really
one of three things: the agent isn't working, a server isn't reachable, or someone disagrees with a
decision. Routing them correctly is most of the job.

<!-- more -->

{% include project-nav.html %}

## Support model and ownership
{: #support-model-and-ownership }

| Area | Owner |
|---|---|
| Code, prompts, Helm chart, pipelines, AKS namespace | DevOps team |
| Monitored servers, thresholds, `ProtectedLogins`, `ExclusionWindows` | Database team |
| Approving or denying a `KILL` | Database team on-call |
| AgentConfigDB and AgentLogDB (backups, schema scripts) | Database team |
| Azure AI Foundry deployment and quota | DevOps team, with the platform AI owners |
| Safety rule changes | Both teams together |

> **TODO:** Are there named on-call rotations for the agent on both teams, and what hours do they cover?
> Real kills shouldn't be enabled for hours when no DBA can approve.
{: .prompt-warning }

## Service-level objectives
{: #service-level-objectives }

Proposed targets, to agree between the two teams:

| Situation | Response | Restore |
|---|---|---|
| A server silently unmonitored | 30 minutes | 2 hours |
| Agent down for all servers | 15 minutes | 1 hour (redeploy or roll back) |
| Disputed decision | Next working day | Gate or threshold change in the next release |
| Failed kill validation | 30 minutes (database team) | Manual intervention as needed |

## Incident response
{: #incident-response }

For an incident *in the agent*, the first decision is whether it could cause harm. If there's any doubt
about decisions, flip `DRY_RUN` to `true` through Argo CD first and investigate second. Then follow the
correlation ID: logs and telemetry, audit rows, the report, the approval note. Close the incident with a
test or a gate change, not just a fix.

## Bug triage
{: #bug-triage }

| Category | Example | Priority |
|---|---|---|
| Safety | A gate didn't fire; wrong session targeted; kill without approval | Highest; kill switch first |
| Coverage | A server isn't polled; detection misses blocking | High |
| Quality | Weak RCA, wrong KB scenario, noisy alerts | Normal |
| Cost | Token use spikes | Normal, high if sustained |
| Cosmetic | Report formatting | Low |

## Patch and upgrade management
{: #patch-and-upgrade-management }

| Component | How it's upgraded |
|---|---|
| Python dependencies | `uv lock --upgrade`, then the full test suite |
| Pydantic AI | Its own PR; re-run the recorded-incident comparison |
| Model (`gpt-5-mini` and thinking levels) | Change the env var per agent; compare decisions in dry-run first |
| ODBC driver and base image | Rebuild the image; run the live harness |
| Temporal SDK | Only matters in Temporal mode; its tests run without a server |
| AKS, Helm, Argo CD | Platform team cadence; re-render the chart against the new versions |

Model changes deserve special care. A new model version can change decisions without a line of code
changing, so treat it like a prompt change.

## Dependency updates
{: #dependency-updates }

With a committed `uv.lock`, updates are explicit. Add Dependabot or Renovate for the lockfile, the base
image and GitHub Actions, grouped weekly. Merge only when the Sonar job, which runs the tests, passes.

## Security remediation
{: #security-remediation }

The known security items, in the order I'd fix them: approval API authentication, then an authenticated
reviewer identity, then SMTP over TLS or confirmed internal-only, then pinned workflow references and
credential rotation. Sonar and image-scan findings follow the org's normal remediation times.

## Performance optimization
{: #performance-optimization }

The agent spends its time in three places: DMV queries (cheap, every poll), diagnostics (a few queries
per incident) and three LLM calls (seconds each). If detection-to-email time becomes a problem, the
levers are a lower thinking level for the RCA agent, running independent diagnostics concurrently, and
the cooldown setting. Measure first; the cycle summary already records duration.

## Backup verification
{: #backup-verification }

AgentConfigDB is the database whose loss stops monitoring (startup fails closed without server rows), so
it's the one to test restoring first. AgentLogDB holds the audit evidence. Both sit on the management
server and should be in its restore tests.

> **TODO:** Are AgentConfigDB and AgentLogDB covered by the management server's restore testing, and who
> runs it?
{: .prompt-warning }

## Disaster recovery testing
{: #disaster-recovery-testing }

| Scenario | Expected behavior | Test |
|---|---|---|
| Pod deleted | Argo CD and Kubernetes recreate it; next poll resumes | Delete the pod in development |
| AgentConfigDB unreachable at runtime | Existing pollers keep running with the last good config | Block the port in development |
| AgentConfigDB unreachable at startup | Fails closed: no monitoring | Same, then restart |
| Foundry unavailable | No LLM decision means no kill; detection and records continue | Wrong endpoint in development |
| AKS cluster lost | Redeploy from Git to another cluster; config is in the database | Annual exercise |

## Technical debt management
{: #technical-debt-management }

The debt list is in [Implementation](/posts/projects/sql-blocking-agent/09-implementation/#technical-debt-tracking).
Two items are support problems as much as debt: the API-only health check (a stuck poller looks
healthy) and the in-memory cooldown (a restart re-analyzes active incidents). Fixing those reduces
support load directly.

## Checklist
{: #checklist }

- [ ] Ownership table agreed and published
- [ ] On-call coverage matches the hours real kills are enabled
- [ ] SLO proposals agreed or replaced
- [ ] Model changes go through the dry-run comparison
- [ ] Dependabot or Renovate is enabled
- [ ] DR scenarios exercised once in development
- [ ] AgentConfigDB restore tested

{% include project-nav.html %}
