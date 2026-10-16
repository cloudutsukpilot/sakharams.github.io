---
layout: post
title: "Productivity Dashboard: Technical Architecture"
date: 2026-10-05 00:05:00 +0530
categories: [projects, productivity-dashboard]
tags: [Projects, Productivity Dashboard, Architecture]
description: "Architecture of the Productivity Dashboard: collectors write JSON, AI generators write Markdown summaries of summaries, and a FastAPI + React app reads, searches and refreshes them."
project: productivity-dashboard
project_step: 5
mermaid: true
image:
  path: /assets/img/projects/productivity-dashboard/05-technical-architecture.webp
  alt: "Productivity Dashboard: Technical Architecture - Projects hero image"
---

The Productivity Dashboard is a pipeline of plain files. Collectors write each person's daily GitHub
and Jira activity as JSON; AI generators read it and write Markdown summaries; higher-level generators
summarize the summaries; and a FastAPI + React app reads all of it from one Azure File Share. No
database, no queue, no service calling another. The AI is the only clever part, and it sits behind a
single client class that can point at Azure OpenAI, OpenAI or a model on a laptop.

<!-- more -->

{% include project-nav.html %}

## System context and component architecture
{: #system-context-and-component-architecture }

{% include flow-anim.html id="projects/productivity-dashboard/system-architecture" %}

| Tier | Components | Writes |
|---|---|---|
| Collectors | `prod-github-collector`, `prod-jira-collector`, `prod-epic-data-collector` | `github.json`, `jira.json`, epic metadata and daily `jira-updates.json` |
| Generators | `prod-user-summary-generator`, `prod-team-summary-generator`, `prod-epic-summary-generator`, `prod-pod-summary-generator` | `summary.md` per user, team, epic, POD and period |
| UI | `productivity-ui` (FastAPI, React, Redis) | Nothing on the share; creates refresh Jobs |

The generators don't call each other. Their order comes from the schedule, plus one explicit wait: the
team generator polls for user summaries before it starts.

## Technology and framework selection
{: #technology-and-framework-selection }

| Need | Choice | Why |
|---|---|---|
| Jobs | Python 3.11 / 3.12 slim | API clients and AI SDKs; readable for the team |
| AI | Azure OpenAI in production via `BaseAIClient`; OpenAI and LM Studio as alternatives | Enterprise tenancy in production; a free local model for development |
| Prompts | Plain text and Jinja2 templates in each generator's `prompts/` folder | Prompts versioned and reviewed like code |
| Retries | `tenacity` | GitHub, Jira and AI APIs all rate-limit |
| Backend | FastAPI + Uvicorn, Pydantic 2 | Typed API, async file reads |
| Frontend | React 18, Vite 5, Tailwind CSS 3, `react-markdown` 9 + `remark-gfm` | Fast builds; good Markdown rendering |
| Cache | Redis, as its own Deployment in the chart | Memoize reads and search results |
| Refresh | Kubernetes Python client | Launch one-shot Jobs from the API |

More on running models locally in
[Running LLMs on a home PC](/posts/homelab/local-llms-on-homepc/), and on the service itself in
[Azure OpenAI Service](/posts/cloud/azure/ai/azure-openai-service/).

## API and integration architecture
{: #api-and-integration-architecture }

The API is read-mostly REST, one group per summary level:

```text
GET  /api/summaries?user=&date=&period=        GET /api/team-summaries?team=&date=&period=
GET  /api/epics, /api/epic-summaries, /api/epic-team-summaries, /api/epic-stories
GET  /api/pod-summary?pod=&date=&period=       GET /api/pod-data
GET  /api/collector-data[/aggregated]          # raw source for a summary
POST /api/search                               # full text across all summaries
POST /api/refresh, GET /api/refresh/status     # on-demand regeneration
GET  /api/config, /api/metadata, /api/health, /api/storage-check, /api/cache/stats
POST /api/cache/clear
```

Outbound integrations live in the jobs: GitHub REST and GraphQL (per-org GitHub Apps), Jira Cloud REST
(email and API token), and the AI provider. The UI's one outward action is to the Kubernetes API, to
create refresh Jobs.

## Data architecture and data models
{: #data-architecture-and-data-models }

Data is organized the way people are: department, team, person, then period and date.

```text
/data/{department}/{team}/{user}/daily/{YYYY}/{MM}/{DD}/github.json | jira.json
/data/{department}/{team}/Users/{user}/{daily|weekly|monthly}/…/summary.md
/data/{department}/{team}/{daily|weekly|monthly}/…/summary.md
/data/{department}/{team}/Epics/{EPIC-KEY}/epic-metadata.json, {date}/jira-updates.json, epic-summary.md
/data/{org_prefix}/PODS/{pod_key}/{period}/…/summary.md   (+ per-member summaries)
```

The key modelling decision is **summaries of summaries**: weekly summaries are built from dailies,
monthly from weeklies, and team summaries from user summaries. That keeps every prompt small, and the
roll-ups consistent with what people already read at the lower level. The cost is that an error in a
daily summary can carry upward, which is one more reason accuracy is checked at the bottom.

## Identity and access architecture
{: #identity-and-access-architecture }

| From → to | Mechanism |
|---|---|
| Collectors → GitHub | Per-org GitHub App installation tokens via `GitHubAppTokenManager`; PAT fallback |
| Collectors → Jira | Basic auth with an email and API token |
| Generators → Azure OpenAI | API key |
| All pods → Azure Files | Workload Identity on the `productivity` ServiceAccount; storage key fallback |
| UI → Kubernetes API | A namespaced Role: create, get, list, watch, delete Jobs; read CronJobs, pods and logs |
| Secrets | External Secrets Operator from Azure Key Vault |

The people model is configuration: each person is a tuple of environment variables (department, team,
name, GitHub username, Jira email) indexed the same way in collectors and generators.

## Hosting and deployment model
{: #hosting-and-deployment-model }

Everything runs in the `productivity` namespace: AKS in production, k3d locally. The UI chart carries
the generator schedules in its values, and the collectors and generators have their own charts in the
repo. A `productivity-shared-infra` chart provides the ClusterSecretStore, the ExternalSecrets and the
shared PV/PVC. Images go to JFrog; ArgoCD deploys from a GitOps repository. Details in
[Infrastructure and Environments](/posts/projects/productivity-dashboard/11-infrastructure-and-environments/).

## Scalability and performance strategy
{: #scalability-and-performance-strategy }

- **People per run:** the user generator works in parallel (`MAX_PARALLEL_USERS`, default 4), bounded
  by the AI deployment's tokens-per-minute quota more than by CPU.
- **Prompt size:** summaries-of-summaries keep weekly, monthly and team prompts short regardless of
  team size.
- **Reads:** Redis memoizes expensive reads; summaries are small Markdown files.
- **Search:** full-text search scans summaries under `/data`. That's fine today, but the files are
  kept forever, so search time grows with history. A small index (SQLite FTS, or rebuilding an index
  nightly after the generators) would keep it fast.
- **UI replicas:** one, with an `autoscaling` block in `values.yaml` that no template uses yet. The fix
  is in [Operations and Observability](/posts/projects/productivity-dashboard/14-operations-and-observability/#capacity-and-cost-monitoring).

## Resilience and disaster recovery
{: #resilience-and-disaster-recovery }

- Generators are re-runnable per person and date (`TARGET_USER`, `TARGET_DATE`, `FORCE_REGENERATE`),
  which is exactly what the UI's Refresh uses.
- Collectors can re-collect (`days_to_collect`, `force_recollect`) to backfill missed days, within
  what the GitHub and Jira APIs still return.
- If the AI provider is down, the provider setting can switch to another backend and the jobs re-run.
- Code and config rebuild from Git. Summaries can be regenerated from collector data, but only
  approximately, since a new prompt or model writes different text; for anything used in a
  review, the original summary is the record.

> **TODO:** Is the file share backed up? Given that summaries feed performance reviews, the originals
> probably need a defined retention and backup, agreed with HR.
{: .prompt-warning }

## Architectural decision records
{: #architectural-decision-records }

| ADR | Decision |
|---|---|
| 001 | Files on Azure Files: JSON for collected data, Markdown for summaries; no database |
| 002 | Summaries of summaries for weekly, monthly and team levels |
| 003 | One provider-agnostic AI client (Azure OpenAI, OpenAI, LM Studio) |
| 004 | Prompts as versioned template files next to each generator |
| 005 | People, teams and PODs as configuration, never code |
| 006 | On-demand refresh as Kubernetes Jobs launched by the UI |
| 007 | UI views and lists driven by a ConfigMap through `/api/config` |

ADR-002 is the one with the most interesting trade-off, so it's the one I'd write out in full:

```markdown
# ADR-002: Build higher-level summaries from lower-level summaries

Status: Accepted
Context: Weekly, monthly, team and POD summaries could each be generated from raw GitHub and Jira data,
  but raw data grows with time and team size, and so would the prompts and the cost.
Decision: Weekly summaries are generated from daily summaries, monthly from weekly, team from user.
Consequences: Small, predictable prompts; roll-ups consistent with the dailies people already read.
  Errors in a daily summary propagate upward, so accuracy checks focus on dailies, and a refreshed
  daily should trigger regeneration of the weekly that contains it.
```

## Checklist
{: #checklist }

- [ ] Component map and schedule documented, including the team generator's wait
- [ ] AI access only through `BaseAIClient`; provider set by configuration
- [ ] Data layout built only through `path_utils`
- [ ] UI Role limited to Jobs in its own namespace
- [ ] Search index planned before history makes scanning slow
- [ ] HPA template added for the UI
- [ ] Backup and retention of original summaries agreed
- [ ] ADRs 001-007 written down

{% include project-nav.html %}
