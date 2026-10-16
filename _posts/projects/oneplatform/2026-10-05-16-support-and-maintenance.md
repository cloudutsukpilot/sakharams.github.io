---
layout: post
title: "OnePlatform: Support and Maintenance"
date: 2026-10-05 00:16:00 +0530
categories: [projects, oneplatform]
tags: [Projects, OnePlatform, Support, Maintenance]
description: "Keeping OnePlatform healthy: ownership, Backstage upgrades from 1.21 to 1.53, grouped Dependabot updates, Sonar debt, and the backup and DR tests still to run."
project: oneplatform
project_step: 16
image:
  path: /assets/img/projects/oneplatform/16-support-and-maintenance.webp
  alt: "OnePlatform: Support and Maintenance - Projects hero image"
---

In January 2024 OnePlatform ran Backstage 1.21. In September 2026 it runs 1.53, after roughly twenty upgrade PRs, each touching dozens of custom plugins. That's what maintenance on a Backstage portal mostly is: keeping up with upstream without breaking what you've built on top. This post covers that, plus who owns what when something breaks.

<!-- more -->

{% include project-nav.html %}

## Support model and ownership
{: #support-model-and-ownership }

Ownership is recorded where Backstage expects it: the portal and middleware are catalog components owned by the platform team's group, and every template has a `spec.owner`. CODEOWNERS routes reviews. Each feature folder names the ticket, so the history of a feature is one search away.

For support, I'd make the tiers explicit:

| Tier | Who | Handles |
|---|---|---|
| 0 | Self-service | Template instructions, failure notification with the error and run link |
| 1 | Platform team channel / service desk | "My template failed", access questions, how-to |
| 2 | Feature owner on the platform team | Bugs, data issues in a specific plugin |
| 3 | Upstream owners | Azure, GitHub, Jira, the infrastructure repos templates call |

> **TODO:** What's the actual support entry point and on-call arrangement (business hours only?), and who owns each feature area within the team?
{: .prompt-warning }

## Service-level objectives
{: #service-level-objectives }

The targets are proposed in [Operations](/posts/projects/oneplatform/14-operations-and-observability/#availability-and-performance-targets). For support, I'd add response targets: acknowledge a P1 (portal down or a compliance workflow blocked) within 30 minutes in business hours, and a P3 (single template bug with a workaround) within two business days.

> **TODO:** Confirm or replace those response targets with what the team can actually staff.
{: .prompt-warning }

## Incident response
{: #incident-response }

For a portal-wide incident: post a **system alert** first, so users stop retrying and filing duplicate tickets. Then check the health endpoints, recent releases (roll back by tag if one just went out), and credential expiry. For a single failing template, the task log shows which action failed and with what error; most fixes are in the identity the action uses or in the workflow it dispatches.

## Bug triage
{: #bug-triage }

Bugs come in as Jira tickets in the same project as features. Triage questions, in order: does it block a compliance workflow (audit, termination, approval)? Is there a workaround? How many roles are affected? Fixes go through `/change-request`, which records the plan and the validation in the feature folder, so the next person to touch that code finds the bug history beside the design.

## Patch and upgrade management
{: #patch-and-upgrade-management }

Backstage versions over time, from the repo:

| Period | Versions | Notes |
|---|---|---|
| 2024 | 1.21 → 1.30 | Four upgrades after the initial 1.21 |
| 2025 | 1.31 → 1.44 | Roughly monthly in the first half, then a gap |
| 2026 | 1.46 → 1.53 | Includes the move to the new frontend system |

The gaps matter more than the count. Going from 1.44 (October 2025) to 1.46 (February 2026) skipped a release and four months, and big jumps are where breakage hides. The **pre-upgrade compatibility workflow** now runs every lane (unit on the Node matrix, integration, PostgreSQL 16 and 17, E2E, and an image preflight) before an upgrade merges, which makes smaller, more frequent upgrades cheap enough to do.

My rule: upgrade within a month of each Backstage release, one minor at a time, and never let the gap exceed two minors.

## Dependency updates
{: #dependency-updates }

Dependabot opens weekly grouped updates (minor updates grouped, majors separate) for npm, NuGet and GitHub Actions, resolved through the private registry. Since October 2025 that's about 60 Dependabot PRs in the portal alone, and the middleware's history is dominated by them. Rules that keep this sustainable:

- Backstage packages are excluded from Dependabot; they move together in the planned upgrade.
- Majors get a human read of the changelog.
- When a transitive package is vulnerable and its parent can't move, pin it and record why (`resolutions` in the portal, central transitive pins in the middleware).

## Security remediation
{: #security-remediation }

Sources of findings: Dependabot alerts, SonarQube, CodeQL in the middleware, and the container defender in production. There's a repository prompt that walks through refreshing Dependabot remediation, so a fix includes the parent-package reasoning, not just a version bump.

> **TODO:** Remediation time targets per severity (for example, critical within 7 days). Are they set by the security team?
{: .prompt-warning }

## Performance optimization
{: #performance-optimization }

Performance work so far has followed pain, and each fix is a reusable pattern:

| Problem | Fix |
|---|---|
| One ~10,000-entity catalog write locked the database | Per-subscription providers, staggered |
| Slow local startup | Lean `dev:local` backend; narrowed Graph ingestion |
| SQL compliance calculation froze the page | Moved to a Web Worker |
| Service map slow with many nodes | Viewport culling; grouped VMSS and Function App nodes |
| Cost reports slowed as data grew | Materialized views; APIs read only views |

## Backup verification
{: #backup-verification }

> **TODO:** No backup verification is recorded in the repos. I'd schedule a quarterly restore of the PostgreSQL server to a scratch instance, then check row counts for the owned schemas (user audits, terminations, Copilot requests, role maps, fragments) against production.
{: .prompt-warning }

## Disaster recovery testing
{: #disaster-recovery-testing }

The portal's DR story is better than it looks, because most of its state is rebuildable by re-ingestion, and worse than it looks, because the non-rebuildable part is compliance evidence. A useful DR test: stand up the portal from the charts repo in a fresh namespace pointed at a restored database, and time it.

> **TODO:** RTO/RPO targets and whether a DR test has ever been run.
{: .prompt-warning }

## Technical debt management
{: #technical-debt-management }

The debt register is in [Implementation](/posts/projects/oneplatform/09-implementation/#technical-debt-tracking). Sonar findings get dedicated cleanup PRs (about a hundred commits mention Sonar in the last year), which keeps the quality gate meaningful. I'd reserve a fixed share of each sprint for upgrades, Dependabot and Sonar, rather than fitting them into the gaps.

## Checklist
{: #checklist }

- [ ] Support tiers, entry point and on-call hours published in the portal
- [ ] Response targets agreed per priority
- [ ] Backstage upgraded within a month of each release, one minor at a time
- [ ] Pre-upgrade compatibility run green before every upgrade merge
- [ ] Remediation time targets per severity
- [ ] Quarterly restore test of PostgreSQL with owned-schema checks
- [ ] DR rehearsal: rebuild the portal in a fresh namespace and time it
- [ ] Fixed sprint share for upgrades, Dependabot and Sonar

{% include project-nav.html %}
