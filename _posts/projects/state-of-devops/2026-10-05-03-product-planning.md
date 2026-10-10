---
layout: post
title: "State of DevOps: Product Planning"
date: 2026-10-05 00:03:00 +0530
categories: [projects, state-of-devops]
tags: [Projects, State of DevOps, Planning, Roadmap]
description: "Roadmap, MVP and milestones for State of DevOps: a solo build for 8-10 months, then a team, then the enterprise-wide health scorecard."
project: state-of-devops
project_step: 3
image:
  path: /assets/img/projects/state-of-devops/03-product-planning.webp
  alt: "State of DevOps: Product Planning - Projects hero image"
---

State of DevOps was planned by one person for most of its first year. I built it as an individual
contributor, and the DevOps team started contributing after 8 to 10 months of continued development.
That shaped every planning decision: the plan had to fit one person's evenings and gaps between other
work, and the code had to be easy enough for a team to pick up later without a rewrite.

<!-- more -->

{% include project-nav.html %}

## Product roadmap
{: #product-roadmap }

The roadmap has three horizons. Only the first is done.

| Horizon | What it delivers | Status |
|---|---|---|
| **1. DevOps scorecard** | Daily analysis of repos, pipelines, IaC, GHAS, enterprise policies and cost across four GitHub orgs; dashboard; trends; Jira integration | Live |
| **2. Team-owned and hardened** | DevOps team contributing; HA dashboard with autoscaling; dependency-based scheduling; data retention | In progress (this playbook proposes several items) |
| **3. Enterprise health scorecard** | Best practices of SRE, CloudOps, platform architecture, database and other teams mapped against real infrastructure; one score and progress card covering best practices, security and compliance | Planned |

Horizon 3 is the reason the architecture is a set of independent analyzers writing to a common
storage layout. A database-practices analyzer or an SRE analyzer is "just another cronjob" plus a
dashboard tab.

> **TODO:** Is there a target date or funding decision for the enterprise scorecard phase, and which
> team's best practices will be onboarded first?
{: .prompt-warning }

## MVP definition
{: #mvp-definition }

For a solo build, the MVP has to be the smallest thing that changes a conversation. My definition for
a project like this:

- One collector that caches repository data for all orgs.
- One analyzer (repo hygiene) with a handful of checks people already argue about: branch protection
  or rulesets, CODEOWNERS, README.
- A dashboard with an org list and a repo detail page.
- Daily runs on the cluster, output stored by date so history starts accumulating on day one.

Everything else (trends, cost, GHAS, Jira) is valuable, but none of it is needed to replace
"I think most repos have branch protection" with a number.

> **TODO:** What exactly was in the first version that went live, and when did it go live?
{: .prompt-warning }

## Release milestones
{: #release-milestones }

Releases are per component, not per product. Each cronjob and the dashboard has its own image tag,
recorded in `versions.yaml` at the repo root, and its own Helm chart version in `Chart.yaml`. A
release-versioning workflow bumps `versions.yaml` when a chart is promoted.

That gives two kinds of milestone:

| Kind | Example | Marked by |
|---|---|---|
| Component release | `devops-ghas-analyzer` adds Dependabot coverage | New image tag + chart version |
| Product milestone | "All daily analyzers live", "Trends live", "Team onboarded" | A set of component releases |

> **TODO:** Add the real product milestones with dates (first analyzer live, dashboard live, trends,
> cost, DevOps team onboarding).
{: .prompt-warning }

## Backlog structure
{: #backlog-structure }

Jira is already in the picture: the dashboard creates Jira stories from findings, and Jira epics map
to applications in the Applications tab. I'd structure the backlog in three layers to match:

- **Platform epics**, one per component (`devops-repo-analyzer`, `devops-state-dashboard`, …) for
  features and bugs in the tool itself.
- **Remediation stories**, created from the dashboard against the owning team's backlog: "Add
  CODEOWNERS to repo X". These are the point of the whole project.
- **Scorecard epics** for horizon 3, one per participating team.

Keeping remediation work out of the platform backlog matters. The DevOps team owns the measuring; the
repo owners own the fixing.

## Prioritization approach
{: #prioritization-approach }

Two questions decide what comes next:

1. **How many people ask this question today?** A check that answers a weekly question beats a clever
   check nobody asked for.
2. **Is it audit or security relevant?** Anything that produces HIPAA, PCI or IT audit evidence moves
   up, because it saves the most painful manual work.

For the tool's own backlog, reliability beats features once people depend on it. A missed nightly run
the week before an audit costs more trust than a missing chart.

## Budget and resource planning
{: #budget-and-resource-planning }

The running cost is small because the design avoids always-on compute:

| Item | Cost driver |
|---|---|
| 13 cronjobs | Short-lived pods once a day or week on a shared AKS cluster |
| Dashboard | One pod at 100m CPU / 128 Mi request (more once autoscaling is on) |
| Azure Files | Storage for daily JSON outputs kept indefinitely |
| Redis | Azure Cache for Redis in AKS |
| JFrog, GitHub | Existing enterprise subscriptions; images and API calls only |

People were the real budget: one engineer for 8 to 10 months, then a share of the DevOps team.

> **TODO:** What was the budget or time allocation (for example "20% of one engineer"), and what does
> the stack cost per month on Azure?
{: .prompt-warning }

## Risk and dependency management
{: #risk-and-dependency-management }

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| One person knows everything (first 8-10 months) | High | High | Docs per component, Taskfile for every operation, team onboarding |
| GitHub API rate limits | Medium | Medium | Central collector with ETag caching, per-org GitHub Apps, retries with backoff |
| Jobs chained by clock, not by dependency | Medium | Medium | Move to dependency-based triggers (see [Continuous Improvement](/posts/projects/state-of-devops/18-continuous-improvement/#architecture-reviews)) |
| Shared Azure Files outage | Low | High | Analyzers re-run idempotently; dashboard falls back to its Redis cache; share snapshots for restore |
| Scope creep from the enterprise scorecard | High | Medium | Keep horizon 3 as a separate phase with its own sponsor |
| Wrong numbers erode trust | Medium | High | Test fixtures per analyzer, `metadata.json` with versions and timestamps |

Dependencies on other teams are few but critical: GitHub org admins (App installs), the AKS platform
team (cluster, Azure Files, External Secrets, ArgoCD), and JFrog and Azure billing owners for cost data.

## Change-control process
{: #change-control-process }

Change control is GitOps. Every change goes through a pull request; CI builds the image, runs
SonarQube, and the chart is promoted; ArgoCD syncs it to AKS. Nobody `kubectl apply`s to production.

Two escape hatches exist for fast iteration in the cloud, and both keep Git as the source of truth:

```bash
task dev-pause -- devops-ghas-analyzer   # pause ArgoCD auto-sync for one app
task dev-push  -- devops-ghas-analyzer   # build + push to JFrog, update chart, resume sync
task dev-status                          # check sync status
```

Changes to *what is measured* (a new check, a changed threshold such as the 365-day stale rule) deserve
more care than code changes, because they move the numbers executives watch. I'd announce them with the
release notes and mark the date on the trend charts, so a sudden jump isn't read as progress.

## Checklist
{: #checklist }

- [ ] Roadmap horizons written down, with the enterprise scorecard as a separate phase
- [ ] MVP scope and go-live date recorded
- [ ] `versions.yaml` and chart versions bumped by the release workflow on every promotion
- [ ] Platform backlog separated from remediation stories
- [ ] Risk register reviewed each quarter
- [ ] Rule changes (thresholds, new checks) announced and annotated on trend charts
- [ ] Bus-factor risk closed: at least two people can release every component

{% include project-nav.html %}
