---
layout: post
title: "State of DevOps: Support and Maintenance"
date: 2026-10-05 00:16:00 +0530
categories: [projects, state-of-devops]
tags: [Projects, State of DevOps, Support, Maintenance]
description: "Keeping State of DevOps healthy: DevOps team ownership, freshness SLOs, wrong-number incidents, grouped dependency updates and a tested restore of trend history."
project: state-of-devops
project_step: 16
image:
  path: /assets/img/projects/state-of-devops/16-support-and-maintenance.webp
  alt: "State of DevOps: Support and Maintenance - Projects hero image"
---

A scorecard that measures other teams' maintenance discipline has to keep its own house in order.
State of DevOps checks for stale repos, unpatched dependencies and missing CODEOWNERS across four
organizations, so its own repo is the first one people will look at when they disagree with a number.
Support and maintenance for this project are about staying credible as much as staying up.

<!-- more -->

{% include project-nav.html %}

## Support model and ownership
{: #support-model-and-ownership }

The ownership changed over the project's life. For the first 8 to 10 months it was a one-person project:
the builder was the developer, operator and support desk. Since then the DevOps team
contributes too, and the table below is the ownership model a team needs.

| Concern | Owner |
|---|---|
| Platform (jobs, dashboard, pipeline) | DevOps team |
| Each analyzer's rules and correctness | A named DevOps engineer per analyzer |
| Fixing findings in repos | The repo's owning team (via Jira stories) |
| Cluster, Azure Files, ExternalSecrets, ArgoCD | The AKS platform owner |
| GitHub Apps on each org | Org admins |

Support is business hours, through the DevOps Teams channel and the platform's Jira backlog.

> **TODO:** Is there a named owner per analyzer, and is the support channel published on the dashboard?
{: .prompt-warning }

## Service-level objectives
{: #service-level-objectives }

SLOs should measure what users feel, which here is freshness and correctness more than uptime:

| SLO | Target | Measured by |
|---|---|---|
| Daily data ready by 08:00 UTC | 95% of days per 30 days | `generated_at` of `home-overview.json` |
| Dashboard available in business hours | 99.5% | Probe / synthetic check |
| Confirmed wrong-number reports fixed | Within 5 business days | Jira |
| Analysis tab p95 latency | Under 3 s | API metrics |

These targets are agreed with stakeholders (they're also listed in
[Operations and Observability](/posts/projects/state-of-devops/14-operations-and-observability/#availability-and-performance-targets)),
and the error budget idea applies: if freshness misses its target in a month, reliability work goes
ahead of new checks.

## Incident response
{: #incident-response }

Incidents come in three kinds, each with a first move:

1. **Jobs didn't run** (Home shows yesterday): check CronJob status and logs, re-run in schedule
   order, regenerate the summary.
2. **Numbers are wrong**: hide or annotate the tab first (`/api/sidebar-config` or a banner), then
   fix and re-run the affected days, then tell the people who saw the wrong numbers.
3. **Credential exposure**: follow the leak runbook in
   [Security and Privacy](/posts/projects/state-of-devops/06-security-and-privacy/#security-testing-and-incident-response).

The second kind is the one teams under-react to. A wrong number shown to executives, uncorrected, costs
the project more than an hour of downtime.

## Bug triage
{: #bug-triage }

Triage once a week, with one ordering rule: **correctness bugs first, then freshness, then UI.**

| Priority | Example |
|---|---|
| P1 | A check reports pass for repos that fail it (or the reverse) on a visible tab |
| P2 | A job fails for one org; trends missing a day |
| P3 | Slow tab, broken sort, cosmetic UI issue |

Every P1 gets a regression test with a fixture repo before it's closed, so the same wrong number can't
come back.

## Patch and upgrade management
{: #patch-and-upgrade-management }

Things that need regular upgrades, and how often:

- **Base images** (Python 3.11 and 3.12 slim): monthly rebuild to pick up OS patches, even with no code
  change, since a re-tag release reuses images.
- **Python** minor versions: align every component on one version (today it's mixed 3.11 / 3.12).
- **Kubernetes and Helm**: test charts in k3d against the AKS target version before each cluster
  upgrade.
- **Redis**: managed by Azure in production; keep the local `redis:7-alpine` on the same major.

## Dependency updates
{: #dependency-updates }

Each component pins its own `requirements.txt`, which isolates failures but multiplies updates by
thirteen. Dependabot with grouped updates keeps that manageable:

```yaml
# .github/dependabot.yml (excerpt)
version: 2
updates:
  - package-ecosystem: pip
    directories: ["/devops-*", "/github-*", "/devops-state-dashboard"]
    schedule: { interval: weekly }
    groups:
      python-deps: { patterns: ["*"] }
  - package-ecosystem: npm
    directory: /devops-state-dashboard/frontend
    schedule: { interval: weekly }
```

CI builds only changed components, so a grouped update rebuilds everything it touches in one run, which
is what you want.

## Security remediation
{: #security-remediation }

Remediation timelines should match what the organization expects of everyone else, because the
dashboard publishes those expectations:

| Severity | Fix within |
|---|---|
| Critical (CodeQL, Dependabot, image scan) | 7 days |
| High | 30 days |
| Medium and below | Next maintenance iteration |

> **TODO:** What remediation SLAs does the organization's security policy set? Use those numbers here
> instead of these defaults.
{: .prompt-warning }

## Performance optimization
{: #performance-optimization }

Performance work tends to land in three places:

- **Jobs:** more use of the central collector cache instead of live API calls; GraphQL for bulk
  fetches; concurrency limits tuned per job (`max_concurrent_orgs`).
- **Dashboard:** more aggregations pre-computed by the summary generator; Redis TTLs matched to the
  daily data cycle; every large read moved off the event loop (`asyncio.to_thread`, as the trends
  endpoints already do), since repo-analysis reads still use a blocking `open()`.
- **Storage:** fewer, larger files per day for the biggest domains, since Azure Files favours that over
  many tiny reads.

The rule I'd keep: measure the job duration or p95 first, change one thing, measure again.

## Backup verification
{: #backup-verification }

Backups that haven't been restored are hopes. Once a month, restore one random past day's folder
from a share snapshot into a scratch path and compare file counts and checksums with the live copy.
The trend history is the only part of this system that can't be rebuilt from Git or GitHub, so it's
the only part that needs this discipline.

## Disaster recovery testing
{: #disaster-recovery-testing }

A full DR test for this project is cheap enough to run once a year:

1. Create a fresh cluster (or namespace pair) from the GitOps repo.
2. Restore `/data` from the latest snapshot to a new share.
3. Point the charts at it, sync with ArgoCD, and run the smoke tests from
   [Deployment and Go-Live](/posts/projects/state-of-devops/13-deployment-and-go-live/#smoke-tests).
4. Record how long it took. That's the real RTO.

> **TODO:** Restoring the share has been tested. Has the full rebuild (steps 1 to 4) been timed, and
> what RTO and RPO are agreed for this tool?
{: .prompt-warning }

## Technical debt management
{: #technical-debt-management }

The debt list lives in
[Implementation](/posts/projects/state-of-devops/09-implementation/#technical-debt-tracking): the single
dashboard replica, clock-based scheduling, no pruning, Create React App, the storage key fallback and
doc drift. Managing it means three habits: keep it as a labelled Jira epic, spend about one iteration in
five on it, and pay down anything that affects correctness before anything that affects convenience.

## Checklist
{: #checklist }

- [ ] Ownership table published, with a named owner per analyzer
- [ ] Freshness and availability SLOs measured monthly
- [ ] Wrong-number incidents handled annotate-first
- [ ] Weekly triage, correctness bugs first; every P1 gets a regression test
- [ ] Monthly base-image rebuilds; one Python version across components
- [ ] Dependabot grouped updates for pip and npm
- [ ] Monthly restore test of one past day; yearly DR test with a measured RTO

{% include project-nav.html %}
