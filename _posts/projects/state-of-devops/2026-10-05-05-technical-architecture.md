---
layout: post
title: "State of DevOps: Technical Architecture"
date: 2026-10-05 00:05:00 +0530
categories: [projects, state-of-devops]
tags: [Projects, State of DevOps, Architecture]
description: "The State of DevOps architecture: 13 Kubernetes cronjobs writing dated JSON to Azure Files, a central GitHub collector, and a FastAPI + React dashboard."
project: state-of-devops
project_step: 5
mermaid: true
image:
  path: /assets/img/projects/state-of-devops/05-technical-architecture.webp
  alt: "State of DevOps: Technical Architecture - Projects hero image"
---

The whole architecture of State of DevOps follows from one decision: **jobs write files, the dashboard
reads files.** There's no database and no message bus, and no analyzer calls another one. Thirteen
Kubernetes cronjobs collect, analyze and aggregate into dated JSON on one Azure File Share, and a
FastAPI + React dashboard reads that share. It's a boring design, and that's why one person could build
it and a team could take it over.

<!-- more -->

{% include project-nav.html %}

## System context and component architecture
{: #system-context-and-component-architecture }

The components fall into four tiers:

| Tier | Components | Job |
|---|---|---|
| **Collectors** | `github-data-collector`, `github-new-repositories`, `github-stale-repositories`, `github-container-registry-scanner`, `github-package-registry-scanner` | Pull raw data from GitHub REST, Container Registry and Packages APIs |
| **Analyzers** | `devops-repo-analyzer`, `devops-pipeline-analyzer`, `devops-infra-analyzer`, `devops-enterprise-analyzer`, `devops-ghas-analyzer`, `devops-cost-analyzer` | Inspect one domain and write structured JSON |
| **Aggregators** | `devops-trends-analyzer`, `devops-summary-generator` | Compute trends and pre-compute the Home page |
| **UI** | `devops-state-dashboard` (FastAPI + React, Redis cache) | Serve it to people |

{% include flow-anim.html id="projects/state-of-devops/system-architecture" %}

Adding a domain means adding a component to a tier: a new cronjob folder, a new folder under
`/data/devops-state/`, and a new tab. That property is what makes the
[enterprise scorecard](/posts/projects/state-of-devops/03-product-planning/#product-roadmap) phase realistic.

## Technology and framework selection
{: #technology-and-framework-selection }

| Need | Choice | Why |
|---|---|---|
| Jobs | Python 3.11 / 3.12 slim images | The GitHub, JFrog and Azure SDKs and `requests` make API work quick; easy for a DevOps team to read |
| Retries | `tenacity` | Rate limits and flaky APIs are the normal case, not the exception |
| Scheduling | Kubernetes CronJobs | Already on the platform; no extra scheduler to run |
| Backend | FastAPI 0.109 + Uvicorn, Pydantic 2 | Async file reads, typed models, free OpenAPI docs |
| Frontend | React 18, Create React App (`react-scripts` 5.0.1), React Router 6, Axios, Recharts | Familiar, enough for a tab-based internal UI |
| Cache | Redis (`redis[hiredis]`) | Memoize expensive aggregations across requests |
| Packaging | Docker, Helm 3 with a shared library chart | One template for 13 similar CronJobs |
| Delivery | GitHub Actions, JFrog, ArgoCD | The organization's standard path |

One choice I'd revisit is Create React App. It still works, but it's no longer maintained, so a move
to Vite is worth planning before the next big frontend change (see
[Continuous Improvement](/posts/projects/state-of-devops/18-continuous-improvement/#architecture-reviews)).

## API and integration architecture
{: #api-and-integration-architecture }

The dashboard API is read-mostly REST, grouped by domain, with the same shape in each group:

```text
GET /api/<domain>/organizations                         # orgs with latest analysis date
GET /api/<domain>/organizations/{org}/repositories      # ?date= for a past snapshot
GET /api/<domain>/organizations/{org}/repositories/{repo}
GET /api/<domain>/organizations/{org}/summary
```

`<domain>` is the repo analysis root (`/api/organizations`), `pipeline`, `infra`, `ghas`,
`compliance` or `trends`. Around that sit `GET /api/home-overview` (one pre-computed file),
`GET /api/overview`, the cost endpoints (`/api/cost/{github,jfrog,azure}`), applications mapped to
Jira epics, `GET /api/health`, `GET /api/sidebar-config`, and the single write endpoint,
`POST /api/jira/create-story`.

Outbound integrations live in the jobs, not the dashboard: GitHub REST and GraphQL, GitHub Enterprise,
Container Registry and Packages APIs, JFrog Artifactory, Azure Cost Management and Teams webhooks. The
dashboard's only outbound call is to Jira. The **backend never calls an analyzer**; it reads their
files. That keeps the UI up even if every job is failing.

## Data architecture and data models
{: #data-architecture-and-data-models }

The "database" is a directory tree on Azure Files, partitioned by domain, org and UTC date:

```text
/data/
├── github-data/{org}/organization_repos/          # collector cache, overwritten
├── devops-state/
│   ├── repo-analysis/{org}/{YYYY}/{MM}/{DD}/<sub-analyzer>/
│   ├── pipeline-analysis/…  infra-analysis/…  ghas-analysis/…
│   ├── enterprise/…  cost-analysis/…  trends/…
│   ├── summaries/{YYYY}/{MM}/{DD}/home-overview.json
│   └── github-{new,stale}-repositories/
└── weekly-routine/{container,package}-registry-scanner/
```

Filenames inside a dated folder are stable, so "today's" data has a predictable path, and every
analyzer writes a `metadata.json` with its version and `generated_at`. The full layout and retention
rules are in [Data and Integration](/posts/projects/state-of-devops/07-data-and-integration/).

## Identity and access architecture
{: #identity-and-access-architecture }

There are three identity paths, all without secrets baked into images:

1. **GitHub:** one GitHub App per org (plus one for the enterprise). A shared
   `GitHubAppTokenManager` signs a JWT, exchanges it for an installation token and caches it with a
   5-minute pre-expiry buffer. A `GITHUB_TOKEN` PAT is the fallback.
2. **Azure Files and Azure APIs:** Azure Workload Identity on two ServiceAccounts, `cron-jobs` in
   the `cronjobs` namespace and `state-of-devops` for the dashboard. The storage client tries storage
   key, then service principal, then managed identity, then `DefaultAzureCredential`.
3. **Secrets:** External Secrets Operator syncs per-org GitHub App credentials, Jira, storage and Teams
   webhook secrets from Azure Key Vault into Kubernetes secrets.

How *people* sign in to the dashboard is covered in
[Security and Privacy](/posts/projects/state-of-devops/06-security-and-privacy/#authentication-and-authorization).

## Hosting and deployment model
{: #hosting-and-deployment-model }

| | Local | Production |
|---|---|---|
| Cluster | k3d (k3s in Docker) | AKS |
| Registry | `localhost:5000/k8cron/<component>` | JFrog Artifactory |
| Ingress | traefik | nginx, SSL redirect |
| Storage | Host bind mount as `/data` | Azure File Share via PVCs |
| Secrets | `values-local.yaml` / `kubectl create secret` | External Secrets + Key Vault |
| Delivery | `task state-of-devops-<component>` | GitHub Actions → JFrog → ArgoCD |

Each chart ships `values.yaml` (AKS) and `values-local.yaml` (k3d), kept in sync except for
cloud-only fields. Cronjobs run in the `cronjobs` namespace; the dashboard in `state-of-devops` mounts
the same share through its own PV and PVC. That mount is ReadWriteMany and not read-only, because the
dashboard writes the dormant-users upload there.

## Scalability and performance strategy
{: #scalability-and-performance-strategy }

The jobs scale by **time and partitioning**, not replicas. Each run handles four orgs, and the
heavy ones limit concurrency (`max_concurrent_orgs: 2` in the GHAS analyzer) and throttle API calls.
Adding orgs adds run time, so the schedule has headroom between 02:00 and 07:00 UTC.

The dashboard scales by **doing less per request**: the Home page reads one file, Redis memoizes
expensive aggregations, and a background cache warmer starts with the app and re-warms popular
endpoints on a timer. Large JSON reads are the weak spot: the trends endpoints move them off the event
loop with `asyncio.to_thread`, but repo-analysis reads still call a blocking `open()` inside `async`
handlers. Pagination and search happen in the browser (10 rows per page), so a big org still ships its
whole list in one response.

The known gap is that the dashboard runs as **one replica with no autoscaling**. The chart already
has an `autoscaling` block in `values.yaml` (`enabled: false`, 1 to 3 replicas, 80% CPU), but no
HorizontalPodAutoscaler template uses it. The fix is designed in
[Operations and Observability](/posts/projects/state-of-devops/14-operations-and-observability/#capacity-and-cost-monitoring).

## Resilience and disaster recovery
{: #resilience-and-disaster-recovery }

The design is naturally forgiving:

- Jobs are **idempotent per day**: re-running an analyzer overwrites the same dated folder.
- The dashboard only **reads** analysis results (its one write to the share is the dormant-users upload) and
  degrades to "no data for today" rather than failing.
- Collection is **incremental** (ETags), so a missed day costs one run, not a backfill.
- Everything except the data can be rebuilt from Git: images, charts and ArgoCD apps.

The data is the one thing Git can't rebuild. Trends depend on months of daily history, and that
history lives on one Azure File Share. That share is protected by Azure Backup share snapshots, and a
restore has been tested.

> **TODO:** What RPO and RTO are agreed for trend history?
{: .prompt-warning }

## Architectural decision records
{: #architectural-decision-records }

These are the decisions worth recording as ADRs, most important first:

| ADR | Decision |
|---|---|
| 001 | Store results as dated JSON on Azure Files, not in a database |
| 002 | One cronjob per domain, independent and rerunnable |
| 003 | Centralize GitHub collection in one collector job |
| 004 | Pre-compute the Home page in a summary generator |
| 005 | Per-org GitHub Apps with a PAT fallback |
| 006 | FastAPI serves the built React app (one image, one ingress) |
| 007 | GitOps delivery through ArgoCD, with `dev-pause` / `dev-push` for iteration |

ADR-003 is the one that came from experience, so it's the one I'd write out in full:

```markdown
# ADR-003: Centralize GitHub data collection

Status: Accepted
Context: Each cronjob originally collected its own GitHub data, and much of it was the same
  (repository lists and metadata). The duplicated calls cost API rate limit and run time, and
  each job had its own copy of the same collection logic.
Decision: A single job, github-data-collector, collects shared repository data for every org into
  /data/github-data/ with ETag-based incremental requests. Other cronjobs read that cache and call
  the API only for the extra detail their domain needs.
Consequences: Less redundant API traffic and faster jobs; collection logic in one place. Jobs that
  read the cache now depend on the collector having run, which the clock-based schedule doesn't
  enforce (see Continuous Improvement).
```

> **TODO:** Are ADRs kept anywhere today (for example `docs/adr/` in the repo)? If not, these seven are
> a good starting set.
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] Component map and tier table current in the repo docs
- [ ] Every new domain follows the pattern: one cronjob, one data folder, one tab
- [ ] The dashboard never calls an analyzer; it only reads `/data`
- [ ] No credentials in images: GitHub Apps, Workload Identity, External Secrets
- [ ] `values.yaml` and `values-local.yaml` in sync for every chart
- [ ] HPA template added and `autoscaling.enabled` switched on for the dashboard
- [ ] Azure Files backup and restore decided and tested
- [ ] ADRs 001-007 written down

{% include project-nav.html %}
