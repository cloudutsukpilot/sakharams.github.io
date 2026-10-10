---
layout: post
title: "SQL Blocking Agent: Deployment and Go-Live"
date: 2026-10-05 00:13:00 +0530
categories: [projects, sql-blocking-agent]
tags: [Projects, SQL Blocking Agent, Deployment, GoLive]
description: "Going live with the SQL Blocking Agent twice: dry-run in production (done), then approved real kills, with readiness checks, a staged pilot and a kill switch."
project: sql-blocking-agent
project_step: 13
image:
  path: /assets/img/projects/sql-blocking-agent/13-deployment-and-go-live.webp
  alt: "SQL Blocking Agent: Deployment and Go-Live - Projects hero image"
---

The SQL Blocking Agent is live, and it hasn't killed anything in production yet. That's the first of
two go-lives. Going live in dry-run proved the agent could watch production servers safely and produce
useful reports. The second go-live, letting an approved `KILL` actually run, is the one that needs a
readiness review, because it's the first time an AI-assisted system in the org changes production
state on its own initiative.

<!-- more -->

{% include project-nav.html %}

## Production readiness review
{: #production-readiness-review }

| Area | Dry-run go-live (done) | Real-kill go-live (next) |
|---|---|---|
| Decision quality | Not required | Dry-run review signed off by the database team |
| Code | v1.0.6 | Current version, including the transaction-safe `KILL` connection |
| Safety gates | In place | Thresholds reviewed per pilot server |
| Approval | Mandatory | Mandatory, with an authenticated approver |
| Replicas | 1 | 1 (no leader lock yet) |
| Kill rate | Configured | Set low for the pilot |
| Monitoring | Logs and telemetry | Alerts on failed validation, repeated cycle errors, no successful poll |
| Runbooks | Troubleshooting guide | Plus the kill-switch and post-kill review runbooks |
| Rollback | Not needed | `DRY_RUN=true` through Argo CD, tested once |

## Go-live checklist
{: #go-live-checklist }

For the real-kill pilot:

- [ ] Dry-run review complete; every proposed `KILL` in the sample agreed by the database team
- [ ] Production promoted to the current version and observed in dry-run
- [ ] Approval API requires an authenticated DBA identity
- [ ] Pilot server chosen, with `ProtectedLogins` and `ExclusionWindows` reviewed for it
- [ ] `max_kills_per_hour` set low for the pilot server
- [ ] `KILL` login has `ALTER ANY CONNECTION` on the pilot server only
- [ ] Alerts for `STILL_PRESENT` validation and failed cycles reach the DevOps on-call
- [ ] Kill-switch change (`DRY_RUN=true`) prepared as a ready PR
- [ ] Communication sent to the pilot server's application owners

## Deployment runbook
{: #deployment-runbook }

The recommended rollout, as a staged pilot with a kill switch. Step through it, or tick the box to see
the rollback:

{% include flow-anim.html id="projects/sql-blocking-agent/real-kill-rollout" %}

The change itself is small: in the production values, `DRY_RUN` goes to `"false"` (with per-server
limits set in `TargetServers`), merged by PR and synced by Argo CD. Because `DRY_RUN` is an application
setting rather than a table column (since script 07), enabling kills for one server and not others needs
either a separate deployment for the pilot or a per-server override.

> **TODO:** How will the pilot limit real kills to one server, given `DRY_RUN` is now application-wide?
> Options: a per-server override key, or a pilot deployment that monitors only that server.
{: .prompt-warning }

## Data migration plan
{: #data-migration-plan }

No data migrates for the real-kill go-live. The schema scripts up to `07_remove_target_server_dry_run.sql`
must be applied before the current version is promoted, since that version expects connection strings in
`TargetServers` and no `DryRun` column. Apply them during a quiet period, then promote.

## Smoke tests
{: #smoke-tests }

After each promotion:

1. Startup log shows the configuration loaded, the server list, `dry_run`, and the LLM auth line
   (`DefaultAzureCredential`).
2. A cycle completes for every server ("Cycle <id> done").
3. `GET /health` on the approval API answers.
4. Token lines appear for the first analyzed incident.
5. In development, `trigger_blocking_test.py` produces a full incident with an email and a Blob report.

## Monitoring and alert validation
{: #monitoring-and-alert-validation }

Before real kills, deliberately trigger each alert once in development: a failed validation
(`STILL_PRESENT`), an approval timeout, an LLM authentication failure, an unreachable target server. The
Helm design record lists these alert conditions and leaves their thresholds and owners open, which makes
this the place to close them.

## Support team readiness
{: #support-team-readiness }

Two groups need to be ready. The **database team on-call** must know how to approve, deny and read the
evidence, and that silence means no kill. The **DevOps on-call** must know the kill switch, how to read a
cycle by correlation ID, and the Troubleshooting guide's 60-second triage.

## User and stakeholder communications
{: #user-and-stakeholder-communications }

| Audience | Message |
|---|---|
| Database team | Pilot server, dates, approval procedure, how to stop it |
| Application owners on the pilot server | The agent may terminate a blocking session after DBA approval; how they'll be told |
| Platform engineering leadership | First agentic AI system acting on production; safeguards in place |
| Security | Approval API now authenticated; identities and audit trail |

## Cutover and rollback plan
{: #cutover-and-rollback-plan }

Cutover is the Argo CD sync of the `DRY_RUN` change. Rollback is the reverse change, already prepared as
a PR, plus scaling to zero if anything looks wrong with the agent itself. Rollback doesn't undo a kill
that already happened; the post-kill review covers that: read the audit row, the report and the approval
note, and decide whether the gate or threshold needs to change before resuming.

## Launch decision and sign-off
{: #launch-decision-and-sign-off }

The real-kill launch should be signed off jointly by the database team lead (decision quality, server
choice, thresholds) and the DevOps lead (operability, kill switch, alerts), with security confirming the
approval API change.

> **TODO:** Who are the named sign-off owners from the database and DevOps teams for the real-kill launch?
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] Readiness table reviewed and every "next" item closed
- [ ] Pilot scoping mechanism for `DRY_RUN` decided
- [ ] Schema scripts applied before the version promotion
- [ ] Each alert condition triggered once in development
- [ ] Kill-switch PR prepared and tested
- [ ] Joint sign-off recorded

{% include project-nav.html %}
