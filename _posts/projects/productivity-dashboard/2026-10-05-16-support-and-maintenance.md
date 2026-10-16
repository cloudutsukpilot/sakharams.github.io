---
layout: post
title: "Productivity Dashboard: Support and Maintenance"
date: 2026-10-05 00:16:00 +0530
categories: [projects, productivity-dashboard]
tags: [Projects, Productivity Dashboard, Support, Maintenance]
description: "Keeping the Productivity Dashboard accurate and running: team ownership, coverage and accuracy SLOs, accuracy-first triage, model upgrades and restoring summaries used in reviews."
project: productivity-dashboard
project_step: 16
image:
  path: /assets/img/projects/productivity-dashboard/16-support-and-maintenance.webp
  alt: "Productivity Dashboard: Support and Maintenance - Projects hero image"
---

Maintenance on most systems keeps them running. On the Productivity Dashboard it also keeps them
*truthful*. Prompts are tuned continuously, models get new versions, and people join, leave and change
teams, and every one of those changes what the system writes about someone tomorrow morning. This post
is about the routines that keep both the pipeline and the summaries in good shape.

<!-- more -->

{% include project-nav.html %}

## Support model and ownership
{: #support-model-and-ownership }

For the first five months the builder was the developer, operator and support desk. After that a team
took it on. The ownership a team needs:

| Concern | Owner |
|---|---|
| Collectors, generators, UI, pipeline | Maintaining team |
| Prompts and model choice | A named prompt owner in that team |
| People, team and POD configuration | Maintaining team, on request from managers |
| Data scope and use in reviews | HR, legal and privacy (with the sponsor) |
| Cluster, storage, secrets, ArgoCD | Platform owner |
| Azure OpenAI deployment and quota | Platform or cloud owner |

> **TODO:** Who owns prompts and model choice today, and where do people report problems?
{: .prompt-warning }

## Service-level objectives
{: #service-level-objectives }

| SLO | Target |
|---|---|
| Coverage: configured people with yesterday's daily summary by the start of the Americas' day | 95% |
| Accuracy: sampled summaries with no factual error against source | Target set from the monthly sample |
| Reported inaccuracies corrected (regenerated or fixed) | Within 2 business days |
| UI availability in business hours | 99.5% |

Accuracy is the SLO that's new for most teams. It's measured by sampling (see
[Quality Assurance](/posts/projects/productivity-dashboard/10-quality-assurance/#user-acceptance-testing)),
and a miss should pause new features in favour of prompt work, the same way an error budget does.

## Incident response
{: #incident-response }

- **Missing summaries:** tell affected teams, re-collect or regenerate, then fix the cause (usually
  identity config or a job that ran out of order).
- **Wrong summaries:** regenerate, notify the person, and if the summary was used in a review, notify
  the reviewer too.
- **AI outage or throttling:** switch provider or reduce parallelism, then regenerate later in the day.
- **Credential exposure:** revoke, rotate in Key Vault, restart, review usage logs.

## Bug triage
{: #bug-triage }

| Priority | Example |
|---|---|
| P1 | A summary states something untrue about a person; a person's summaries are missing for days |
| P2 | A team or POD summary missing; refresh broken; search wrong |
| P3 | Formatting, slow pages, cosmetic issues |

Every P1 accuracy bug adds a case to the regression set, so the same mistake can't return with the next
prompt change.

## Patch and upgrade management
{: #patch-and-upgrade-management }

- **Base images:** rebuild monthly for OS patches; align Python versions (today 3.11 and 3.12 coexist).
- **Model versions:** treat an Azure OpenAI model version change like a major dependency upgrade:
  run the regression set on both, compare, then switch, outside review-cycle freezes.
- **Kubernetes and Helm:** test charts in k3d against the target AKS version before upgrades.
- **Redis:** keep the chart's Redis image on a supported version.

## Dependency updates
{: #dependency-updates }

Per-component `requirements.txt` pins and the frontend lockfile, updated through Dependabot grouped
updates (one PR per ecosystem per week). The AI SDK and HTTP client pins deserve a quick regression run
when they change, since they sit on the path to every summary.

## Security remediation
{: #security-remediation }

Fix critical findings (CodeQL, Dependabot, image scan) within a week and high within a month, or within
whatever the organization's security policy sets. For this system, the data-scope findings count as
security findings too: if a collector turns out to collect more than was approved, fixing it is a P1.

## Performance optimization
{: #performance-optimization }

- Tune `MAX_PARALLEL_USERS` against the AI quota, not CPU.
- Keep prompts small: summaries of summaries, and only the fields a prompt actually uses.
- Skip AI calls on no-activity days and write a fixed "no activity recorded" summary instead.
- Add a search index before history makes scanning slow.

## Backup verification
{: #backup-verification }

Summaries used in reviews are records, and regenerating them gives different text. Once a month,
restore one past day's folder for a team from a share snapshot into a scratch path and compare it with
the live copy. Keep backup retention aligned with the data retention rules, no longer.

## Disaster recovery testing
{: #disaster-recovery-testing }

Once a year: recreate the namespace from the GitOps repository, restore the share from a snapshot, sync,
run the smoke tests, and regenerate today's summaries. The measured time is the real RTO.

> **TODO:** Is the share backed up today, and what RTO and RPO are acceptable?
{: .prompt-warning }

## Technical debt management
{: #technical-debt-management }

The debt list is in
[Implementation](/posts/projects/productivity-dashboard/09-implementation/#technical-debt-tracking). The
order I'd pay it down: data scope alignment and retention first (people and policy), then duplicate
source trees and docs drift (they cause wrong changes), then the HA UI and dependency-based scheduling
(reliability), then the search index (performance).

## Checklist
{: #checklist }

- [ ] Ownership table published, with a named prompt owner
- [ ] Coverage and accuracy SLOs measured monthly
- [ ] Wrong-summary incidents notify the person and any reviewer
- [ ] Every P1 accuracy bug becomes a regression case
- [ ] Model version changes go through the regression set
- [ ] Monthly restore test of one past day
- [ ] Tech debt paid in the agreed order

{% include project-nav.html %}
