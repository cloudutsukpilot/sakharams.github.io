---
layout: post
title: "State of DevOps: Data and Integration"
date: 2026-10-05 00:07:00 +0530
categories: [projects, state-of-devops]
tags: [Projects, State of DevOps, Data, Integration]
description: "How State of DevOps stores dated JSON on Azure Files, why GitHub collection moved into one central job, and the file contracts between jobs and the dashboard."
project: state-of-devops
project_step: 7
image:
  path: /assets/img/projects/state-of-devops/07-data-and-integration.webp
  alt: "State of DevOps: Data and Integration - Projects hero image"
---

The most useful lesson from building State of DevOps was a data lesson. At first every cronjob
collected its own GitHub data, and much of it was the same data. Later I moved the common collection
into one job, and the other cronjobs now read that data and fetch only the extra detail their domain
needs. Less redundancy, faster jobs, fewer API calls. This post is about that shared data: where it
lives, who owns it, and the contracts that keep thirteen independent jobs and a dashboard in agreement.

<!-- more -->

{% include project-nav.html %}

## Data ownership and classification
{: #data-ownership-and-classification }

Every folder under `/data` has exactly one writer, and that writer owns its format:

| Data | Owner (only writer) | Classification |
|---|---|---|
| `/data/github-data/` | `github-data-collector` | Internal: repo metadata |
| `devops-state/repo-analysis/`, `pipeline-analysis/`, `infra-analysis/` | The matching analyzer | Internal |
| `devops-state/ghas-analysis/`, `enterprise/` | GHAS and enterprise analyzers | **Confidential**: security findings |
| `devops-state/cost-analysis/` | `devops-cost-analyzer` | Confidential: spend |
| `devops-state/trends/`, `summaries/` | The two aggregators | Internal |
| `github-{new,stale}-repositories/`, `weekly-routine/` | Collectors and scanners | Internal |

None of it is PHI, and that's a rule rather than an accident (see
[Security and Privacy](/posts/projects/state-of-devops/06-security-and-privacy/#privacy-and-data-protection-requirements)).
The "one writer per folder" rule is what lets jobs run independently without locks.

## Data retention and deletion
{: #data-retention-and-deletion }

| Data | Retention |
|---|---|
| Daily analyzer outputs | Indefinite (the trends analyzer reads history) |
| Trends and home overview | Indefinite (small) |
| New and stale repository reports | 90 days |
| Container and package registry scans | 90 days |
| `/data/github-data/` cache | Overwritten on every collection |

The 90-day values are applied at write time; there's no automated pruning job. "Indefinite" is fine
for trends, but full daily outputs for every repo in four orgs grow forever. I'd keep the trends
forever and prune raw daily outputs after a period long enough for audits and trend recomputation.

> **TODO:** How long must daily outputs be kept as audit evidence (one year, the audit cycle, longer)?
> That number decides the pruning job.
{: .prompt-warning }

## Database schema and migrations
{: #database-schema-and-migrations }

There's no database, so the "schema" is the folder layout plus the JSON shape of each file:

```text
/data/devops-state/<domain>/{org}/{YYYY}/{MM}/{DD}/<sub-analyzer>/<stable-name>.json
                                                    metadata.json   # version + generated_at
```

Conventions that act as the schema:

- Dated folders are `YYYY/MM/DD`, zero-padded, **UTC**; weekly buckets are `YYYY/W{WW}` (ISO week).
- Filenames inside a dated folder are stable, so "today" is a deterministic path.
- Paths are built in code, not configured: the collector uses `AnalyzerStorageClient.format_date_path`,
  and each analyzer's own `storage_client` formats `{org}/{YYYY}/{MM}/{DD}/{repo}.json`. One shared
  helper for every job (and the dashboard) is the change I'd make, so the layout lives in one place.

Migrations are cheap because old files are never rewritten: when a JSON shape changes, the analyzer
version in `metadata.json` changes, and readers handle both shapes until the old ones age out. That
only works if readers check the version, which is worth enforcing with Pydantic models in the backend.

## Data validation and quality
{: #data-validation-and-quality }

Wrong numbers are the fastest way to lose an executive audience, so data quality needs explicit checks:

- **Completeness:** every org in config has today's folder for every daily domain by 07:30 UTC.
- **Freshness:** `generated_at` in `metadata.json` is from today.
- **Plausibility:** repo counts per org don't change by more than a set percentage day over day
  without a known cause (for example a mass archive).
- **Distinguish no data from zero:** an analyzer that failed must not look like a perfect score.

The summary generator is the natural place to enforce these, since it reads everything anyway. It can
write a `quality` section into `home-overview.json` that the Home page shows as a warning banner.

## Import and export requirements
{: #import-and-export-requirements }

There's no import path; all data comes from APIs. Export is mostly about audits and executives:

- Every analyzer output is already a JSON file that can be handed over as evidence for a given date.
- The most-requested export for a tool like this is CSV of a repo table, for example "all repos
  without CODEOWNERS in org X", which is a small endpoint over data the API already returns.

> **TODO:** Is there an export feature today, and what format do auditors ask for?
{: .prompt-warning }

## External systems and third-party integrations
{: #external-systems-and-third-party-integrations }

| System | Direction | Protocol and auth | Used by |
|---|---|---|---|
| GitHub REST and GraphQL | Read | HTTPS, per-org GitHub App tokens | Collectors and analyzers |
| GitHub Enterprise API | Read | HTTPS, enterprise App | Cost analyzer (seat usage) |
| GitHub Container Registry, Packages API | Read | HTTPS / OCI | Registry scanners (SBOM lookup) |
| JFrog Artifactory | Read | HTTPS, access token or basic auth | Cost analyzer |
| Azure Cost Management | Read | HTTPS, `azure-identity` | Cost analyzer |
| Microsoft Teams | Write | Incoming webhook | New and stale repository reports |
| Jira | Write | HTTPS, API token | Dashboard `create-story` |
| Azure Files | Read / write | SMB via PVC, Workload Identity | Every component |

Every integration goes through `tenacity` retries with exponential backoff, because rate limits and
transient 5xx responses are normal. The registry scanners also throttle explicitly (a 5 s per-repo
delay in the container scanner, 1 s between SBOM calls to stay under 100 requests per minute).

## Event and messaging contracts
{: #event-and-messaging-contracts }

There's no message bus. The contracts are:

1. **File contracts.** Each folder's path pattern and JSON shape is an interface. The dashboard, the
   trends analyzer and the summary generator are consumers, so a field rename is a breaking change.
2. **Time contracts.** The schedule is an implicit event order: the GHAS analyzer at 02:00 reads the
   collector cache from the previous day's 04:00 run, and the summary generator at 07:00 assumes every
   analyzer has finished. Nothing enforces this.
3. **Teams messages.** The new and stale repository reports post a webhook payload with a fixed title
   ("New Repos Report", "OSPO Stale Repository Report") that people filter on.

The time contract is the weakest. The trends analyzer and the repo analyzer both start at 05:00, so
trends may read yesterday's repo analysis instead of today's. A completion marker (for example a
`_SUCCESS` file next to `metadata.json`) and a dependency-aware trigger would turn the implicit order
into an explicit one.

## Backup and restore strategy
{: #backup-and-restore-strategy }

Everything except `/data` can be rebuilt from Git. Within `/data`, the categories are different:

| Data | Can be regenerated? | Backup need |
|---|---|---|
| `github-data/` cache | Yes, next collector run | None |
| Today's analyzer outputs | Yes, rerun the job | None |
| **Historical daily outputs and trends** | **No**: GitHub only shows current state | Required |

Azure Backup is configured on the share, and a restore has been tested. Share snapshots cover this
well, as long as their retention matches the audit requirement for daily outputs.

## Data migration and reconciliation
{: #data-migration-and-reconciliation }

The centralized-collector change was the project's real data migration. Moving shared collection into
`github-data-collector` meant every consumer had to switch from its own API calls to the cache without
changing its output. The safe way to do a change like that is to run old and new side by side for a few
days and diff the outputs per org before cutting over.

The same idea gives an ongoing reconciliation check worth automating: pick a few repos per org each
week and compare the dashboard's values (branch protection, CODEOWNERS, alert counts) against the
GitHub UI or API directly. If they disagree, the dashboard is wrong until proven otherwise.

> **TODO:** How was the switch to the central collector rolled out (all jobs at once, or one by one),
> and did it change any numbers?
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] One writer per `/data` folder, documented in the storage docs
- [ ] Classification set for each domain; GHAS and cost marked confidential
- [ ] Audit retention period agreed and a pruning job built for raw daily outputs
- [ ] `metadata.json` version checked by every reader
- [ ] Data quality checks (completeness, freshness, plausibility) shown on Home
- [ ] Completion markers written by each analyzer; dependent jobs wait for them
- [ ] Azure Backup on the share, with a tested restore
- [ ] Weekly reconciliation of sample repos against GitHub

{% include project-nav.html %}
