---
layout: post
title: "State of DevOps: Interview Questions"
date: 2026-10-06 00:30:00 +0530
categories: [projects, state-of-devops]
tags: [Projects, State of DevOps, Interview Prep, Architecture]
description: "Software architect interview questions answered through State of DevOps: cronjobs on AKS, dated JSON on Azure Files, and a FastAPI + React dashboard."
project: state-of-devops
project_interview: true
image:
  path: /assets/img/projects/state-of-devops/interview-questions.webp
  alt: "State of DevOps: Interview Questions - Projects hero image"
---

"Tell me about something you designed end to end" is the question every architect interview gets to
sooner or later. State of DevOps is a good answer to it, because it has every layer you can be asked
about (a React frontend, a FastAPI backend, a data store, scheduled jobs, external APIs, Kubernetes,
GitOps) and a few decisions that go against the textbook, like having no database at all. The
questions below are generic. The answers are how I'd answer them with this project. Click a question to
open the answer, and follow the links to the playbook when the interviewer pushes for detail.

<!-- more -->

{% include project-nav.html %}

{% include project-iq-roles.html %}

The one-line pitch I open with: *"I built a platform that audits DevOps best practices across four
GitHub organizations every night, with thirteen Kubernetes cronjobs writing dated JSON to a file share
and a FastAPI + React dashboard on top, so leadership sees adoption as a trend instead of a status
update."*

## Project Overview and Your Role
{: #project-overview-and-your-role }

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q1">
<summary>Walk me through a frontend or backend application you designed and built end to end.</summary>

<div class="iq-role" data-role="architect" markdown="1">

State of DevOps is a full-stack internal platform that measures how well DevOps best practices are
adopted across four GitHub organizations and the enterprise account. It has two halves:

- **Jobs that measure.** Thirteen Python cronjobs on AKS, in tiers: collectors pull data from the
  GitHub, Container Registry and Packages APIs; analyzers each inspect one domain (repo hygiene,
  pipelines, IaC, GHAS, enterprise compliance, cost); aggregators compute trends and pre-compute the
  Home page. Every job writes dated JSON to one Azure File Share.
- **A dashboard that shows.** A FastAPI backend reads those files (with Redis memoizing expensive
  aggregations), and a React frontend gives each analyzer its own tab, with drill-down from
  organization to repository and a button that turns a finding into a Jira story.

I designed and built it, from the data layout to the Helm charts and the GitOps release flow. The
architecture rests on one sentence I repeat a lot: *jobs write files, the dashboard reads files*.
Nothing calls anything else at run time, which is why one person could build it and a team could
later take it over.

Deeper: [System context](/posts/projects/state-of-devops/05-technical-architecture/#system-context-and-component-architecture),
[functional requirements](/posts/projects/state-of-devops/02-requirements-gathering/#functional-requirements).

</div>

<div class="iq-role" data-role="developer" markdown="1">

As the developer, I'd walk it as three codebases in one monorepo:

- **Jobs (Python 3.11 / 3.12):** each cronjob is a folder with `src/main.py`, a `config.yaml`, a
  Dockerfile and a Helm chart. `devops-repo-analyzer` is the biggest: an orchestrator class that loads
  config, builds a `GitHubAPIClient` with per-org GitHub App auth, and fans out with a
  `ThreadPoolExecutor` (10 repos and 2 orgs at a time by default) into sub-analyzers such as
  `codeowners_analyzer.py` and `rulesets_analyzer.py`. Shared code lives in `cronjobs/common/`.
- **API (FastAPI):** one `main.py` with about 57 routes, plus `storage_client.py` (reads dated JSON from
  `/data`), `cache_client.py` (async Redis) and `cache_warmer.py`. Responses are Pydantic models from
  `models.py`.
- **UI (React 18, Create React App):** `App.js` defines the routes, `api.js` wraps every Axios call, and
  each page is a function component in `components/`.

```bash
task local-development                       # uvicorn --reload on :8000 + react-scripts start on :3000
python devops-repo-analyzer/src/main.py      # run one job locally (PYTHONPATH with cronjobs/common)
task build-state-of-devops-all               # build every image
```

</div>

<div class="iq-role" data-role="devops" markdown="1">

As the DevOps engineer, the same system is **13 container images, 13 Helm charts and one GitOps
flow**:

- Each component has a multi-stage or slim Dockerfile, built only when its folder changes
  (`docker-detect-changes` then a matrix build), pushed to JFrog with the 7-character SHA, scanned by
  JFrog Xray in the build.
- CronJobs come from a shared **library chart** (`cronjob-library`), so each job's chart is mostly
  values: schedule, resources, `configYaml`. The library sets `concurrencyPolicy: Forbid`,
  `restartPolicy: OnFailure` and `ttlSecondsAfterFinished: 3600`.
- `cronjob-shared-infra` creates the ServiceAccount (workload identity), ExternalSecrets from Key Vault
  and the shared Azure Files PVC.
- Releases re-tag the tested image (`jf rt docker-promote`) and open promotion PRs in a GitOps repo that
  Argo CD syncs.

```bash
task build-state-of-devops-all && task state-of-devops-deploy-local   # k3d
kubectl get cronjobs -n cronjobs
make promote SERVICE=devops-repo-analyzer VERSION=vX.Y.Z               # prod promotion PR
```

</div>

</details>

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q2">
<summary>What business problem did it solve, and how did you know it was working?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Nobody had a single view of repo hygiene, pipeline coverage, GitHub Advanced Security findings or
platform cost across the organizations, and only the DevOps team had the access to look. So progress
on best practices was reported by people in meetings: "we're rolling out CODEOWNERS". You can't chart
that, compare it month to month or hand it to an auditor.

The goal I set was **measure, don't ask**: anything that can be checked through an API is checked by a
job every night. That turned progress into numbers that trend, gaps into a ranked list, and audit
evidence for HIPAA, PCI and IT audits into a daily snapshot instead of a scramble.

How I know it works: the numbers move when the work is done, and people can see them climb after a
push. Status questions now get a link, not a meeting. The real product metric I'd point to is
remediation stories raised from the dashboard and then closed, because visits show interest and closed
stories show impact.

> **TODO:** Add the headline before/after numbers (for example "stale repos down from X to Y" or
> CODEOWNERS coverage at go-live versus today). This is the strongest line in the whole interview.
{: .prompt-warning }

Deeper: [Business problem](/posts/projects/state-of-devops/01-vision-and-business-context/#business-problem-and-opportunity),
[KPIs](/posts/projects/state-of-devops/01-vision-and-business-context/#success-metrics-and-business-kpis).

</div>

</details>

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q3">
<summary>What was your role, and which architectural decisions did you own?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I built it as an individual contribution and carried it for the first 8 to 10 months, after which the
DevOps team started contributing. So I owned every architectural decision, and I'd name these as the
ones that shaped it:

| Decision | Why |
|---|---|
| Dated JSON on Azure Files, no database | Write-once daily snapshots, many readers, trivially debuggable |
| One cronjob per domain, idempotent per day | Jobs fail and rerun independently |
| A central GitHub collector | Removed duplicated API calls across jobs (my main lesson learned) |
| Pre-computed Home page | Executives get an instant first screen |
| Per-org GitHub Apps, Workload Identity, Key Vault | No long-lived secrets in images |
| FastAPI serves the built React app | One image, one ingress |
| Build once, release by re-tagging, deploy with ArgoCD | What was tested is what ships |

Owning everything alone has a cost: there was no one to review my decisions. I compensated with CI
gates (SonarQube, CodeQL), a written component doc per job, and a Taskfile so every operation was
reproducible by someone else.

Deeper: [ADRs](/posts/projects/state-of-devops/05-technical-architecture/#architectural-decision-records).

</div>

<div class="iq-role" data-role="developer" markdown="1">

As the developer I wrote every component in the first months, so I'd name the code-level decisions I
own:

- **A sub-analyzer per family of checks** (`branching`, `codeowners`, `secrets`, `rulesets`,
  `pr_health`…), each a small class with an `analyze` method, so a new check is a new file plus a test.
- **Shared clients in `cronjobs/common/`**: `github_api_client.py` (retries only on 429 and 5xx, never on
  4xx), `github_app_auth.py` (installation tokens cached until 5 minutes before expiry), `analyzer_storage_client.py`
  (`format_date_path`).
- **A pre-built-cache API**: list endpoints try a Redis list first, and on a miss compute inline and
  kick off `asyncio.create_task(cache_warmer.warm_repo_summary(org, date))`.
- **A thin React app**: one Axios client (`api.js`), function components with hooks, a React Context
  (`JiraPageContext`) so the header's Jira button knows what page you're on.

What I'd admit as a developer: the dashboard has almost no tests (`backend/tests/test_config.py` only,
none in the frontend), and `main.py` has grown to 2,000 lines; splitting it into `APIRouter` modules
per domain is overdue.

</div>

<div class="iq-role" data-role="devops" markdown="1">

On the DevOps side I owned the path from commit to cluster:

- the **CI workflow** (`ci.yaml`): change detection, a matrix build per changed component with OIDC to
  JFrog, Xray and build scans, SonarQube per component, CodeQL weekly and on changes, Helm chart
  packaging;
- the **release flow**: `versions.yaml` bump → `release.yaml` re-tags `<sha>` as `vX.Y.Z` with
  `jf rt docker-promote` (no rebuild) → chart publish → GitHub Release → dev promotion PR;
- **promotion to production** through `promote.yaml`, gated by a GitHub `production` environment;
- **PR previews** (`pr-preview.yaml` / `pr-preview-teardown.yaml`) with a 15-minute approval watchdog;
- the **Helm library chart** and shared infra chart;
- the **Taskfile**, so every local operation is one command.

The rule I held myself to: if I did something twice by hand, it became a task or a workflow.

</div>

</details>

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q4">
<summary>Who were the users and stakeholders, and how did their needs shape the design?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The dashboard is open to everyone in the organization, but it's built mainly for stakeholders and
C-level executives, and its executive sponsor is the VP of Platform Engineering. Three personas cover
almost every visit:

- **Executive** (weekly, two minutes): opens Home, reads the headline numbers and trends, leaves.
- **DevOps engineer** (daily): drills from an org into a repo and raises Jira stories.
- **Repository owner** (occasionally): lands from a link, wants their repo's findings and the fix.

Those needs drove concrete architecture. The executive's "must load instantly" is the reason the
`devops-summary-generator` exists: Home reads one pre-computed JSON file instead of scanning every
analyzer output. The engineer's drill-down is why every analyzer has an identical org → repo list →
repo detail flow. The owner's "what do I do about it" is why the only write action in the system is
Jira story creation, two clicks from any finding.

Security and auditors are stakeholders too, and they shaped the non-PHI rule and the decision to keep
every daily output as evidence.

Deeper: [Personas](/posts/projects/state-of-devops/01-vision-and-business-context/#target-users-and-personas),
[user flows](/posts/projects/state-of-devops/04-user-experience-and-design/#user-flows).

</div>

</details>

## System Design and Architecture
{: #system-design-and-architecture }

<details class="project-iq" markdown="1" id="system-design-and-architecture-q1">
<summary>If you had to design this application from scratch on a whiteboard, with a frontend, a backend and a data store, how would you approach it?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I'd go in four steps, and I'd say them out loud so the interviewer can follow:

1. **Clarify the questions the system answers and how fresh the answers must be.** Here: "how healthy
   is each repo and org, and is it getting better?", with data no older than a day. That single
   freshness requirement turns the design into **batch, not real time**.
2. **Split write path from read path.** Nightly jobs collect and analyze; a dashboard only reads. They
   share nothing but the storage contract.
3. **Pick the store from the access pattern.** Writes are once a day per domain, org and date; reads
   are "this org, this date" or "the last 30 days". That fits a partitioned file layout
   (`<domain>/{org}/{YYYY}/{MM}/{DD}/`) better than a relational schema.
4. **Make the read path cheap.** A summary job pre-computes Home, Redis memoizes aggregations keyed by
   date, and the frontend is a tab per domain.

Then I'd draw the tiers: collectors → analyzers → aggregators → share → FastAPI + Redis → React
(the [animated system diagram](/posts/projects/state-of-devops/05-technical-architecture/#system-context-and-component-architecture)
is the picture I'd sketch).

I'd finish with what changes at scale: if data moved to hourly, or users needed ad-hoc queries, I'd
put a columnar store or Postgres behind the same API and keep the frontend untouched.

</div>

<div class="iq-role" data-role="developer" markdown="1">

From a developer's whiteboard, I'd draw the **contracts first**, because they let three codebases evolve
independently:

1. **The file contract:** `/data/devops-state/<domain>/<org>/<YYYY>/<MM>/<DD>/<repo>.json`, with the JSON
   shape per sub-analyzer. Jobs write it; the API reads it.
2. **The API contract:** `GET /api/<domain>/organizations/{org}/repositories?date=` returning a Pydantic
   `RepositoryListResponse` (`organization`, `analysis_date`, `repositories`, `total`).
3. **The UI contract:** one function in `api.js` per endpoint, so components never build URLs.

Then the code shape per tier: a job is `main.py` + analyzers + a storage client; the API is routes →
storage client → cache client; the UI is routes → page components → shared components.

The developer trade-off I'd call out: files instead of a database means **no ORM, no migrations, no
query language**, and reads are "open a path". It made the first versions fast to build, and the cost is
that every aggregation (pass rates, org summaries) is Python code over many files, which is why the
cache and warmer exist.

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q2">
<summary>What are the main components, and how are responsibilities split between them?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Four tiers, each with one job:

| Tier | Components | Responsibility |
|---|---|---|
| Collectors | `github-data-collector`, new/stale repo jobs, two registry scanners | Pull raw data from GitHub REST, GraphQL, Container Registry and Packages |
| Analyzers | repo, pipeline, infra, enterprise, GHAS, cost | Inspect one domain, write structured JSON |
| Aggregators | `devops-trends-analyzer`, `devops-summary-generator` | Trends, and a pre-computed Home page |
| UI | `devops-state-dashboard` (FastAPI + React, Redis) | Serve it to people |

Two rules keep the boundaries clean. First, **one writer per folder**: each folder under `/data` is
owned by exactly one job, so jobs never need locks. Second, **the backend never calls an analyzer**; it
only reads files, so the UI stays up even if every job is failing.

Inside the repo analyzer the same idea repeats at a smaller scale: sub-analyzers (branching, rulesets,
CODEOWNERS, docs, secrets, environments, PR health) each answer one family of questions. Adding a
domain means adding a component to a tier: a cronjob folder, a data folder and a tab.

Deeper: [Components](/posts/projects/state-of-devops/05-technical-architecture/#system-context-and-component-architecture),
[data ownership](/posts/projects/state-of-devops/07-data-and-integration/#data-ownership-and-classification).

</div>

<div class="iq-role" data-role="developer" markdown="1">

In code, the split looks like this:

| Tier | Entry point | Key modules |
|---|---|---|
| Collector | `github-data-collector/src/main.py` | ETag requests, writes `/data/github-data/` |
| Analyzer | `devops-repo-analyzer/src/main.py` | `DevOpsRepoAnalyzer`, sub-analyzers, `storage_client.py` |
| Aggregator | `devops-summary-generator`, `devops-trends-analyzer` | Read many files, write one |
| API | `backend/main.py` | `StorageClient`, `CacheClient`, `CacheWarmer`, `GHASService`, `ApplicationsService` |
| UI | `frontend/src/App.js` | Route table, `api.js`, components |

The API wires services at import time, module-level singletons, and FastAPI's startup and shutdown
events connect Redis and start or stop the warmer:

```python
@app.on_event("startup")
async def startup_event():
    await cache_client.connect()
    cache_warmer.start()
```

A developer note: `on_event` is deprecated in newer FastAPI in favour of a `lifespan` context manager,
which is an easy modernization.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Operationally the components map to Kubernetes objects:

| Component | Kubernetes object | Namespace |
|---|---|---|
| 13 jobs | `CronJob` from the `cronjob-library` chart | `cronjobs` |
| Shared infra | ServiceAccount, ExternalSecrets, PVC | `cronjobs` |
| Dashboard | Deployment (1 replica), Service, Ingress, ConfigMap, PV/PVC, ExternalSecrets | `state-of-devops` |
| Local Redis | Deployment + Service (`redis:7-alpine`) | local only; Azure Cache for Redis in AKS |

Each is its own Argo CD application, so a bad analyzer release can be rolled back without touching the
dashboard. The library chart keeps the 13 CronJobs consistent (`concurrencyPolicy: Forbid`, history
limits, TTL after finish, workload identity label), and the dashboard's init container waits for Redis
(`until nc -z $REDIS_HOST $REDIS_PORT`) before the API starts.

```bash
kubectl get cronjobs,jobs -n cronjobs
kubectl get deploy,svc,ingress,pvc -n state-of-devops
argocd app list | grep devops
```

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q3">
<summary>Which non-functional requirements drove the architecture the most?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Four of them, and none is the "high availability, low latency" pair people expect:

- **Freshness: one day.** Daily jobs finish by about 07:00 UTC. That allowed batch jobs, files and a
  clock schedule instead of streams or queues.
- **GitHub API rate limits.** The real capacity constraint. It led to per-org GitHub Apps (each has
  its own hourly budget), ETag-based incremental collection (a `304 Not Modified` doesn't count against
  the limit), `tenacity` retries, and later the central collector.
- **An instant Home page.** It led to the summary generator and to Redis.
- **Compliance: only non-PHI data.** The system stores metadata, counts and findings, never file
  contents or secret values, which kept it out of PHI scope.

Availability was deliberately modest: best effort, business hours. A missed nightly run is annoying,
not an incident. Being honest about that let me avoid a lot of machinery a solo build couldn't afford.

Deeper: [Non-functional requirements](/posts/projects/state-of-devops/02-requirements-gathering/#non-functional-requirements).

</div>

<div class="iq-role" data-role="sre" markdown="1">

As SRE, I'd translate the NFRs into things I can measure:

| NFR | SLI | Target I'd propose |
|---|---|---|
| Freshness | Time `home-overview.json` was written | Ready by 08:00 UTC on 95% of days |
| Instant Home | p95 latency of `/api/home-overview` | Under 1 s |
| Analysis tabs | p95 latency of list endpoints, warm cache | Under 3 s |
| Business-hours availability | Successful probes / synthetic checks | 99.5% |
| Rate-limit headroom | `X-RateLimit-Remaining` at job start | Above 1,000 (the analyzer already warns below this) |

The NFR that most shapes operations is **"best effort, business hours"**: nothing pages at night, and a
missed nightly run is a ticket, not an incident. The one I'd watch closest is freshness, because the
dashboard can be perfectly up while showing yesterday's numbers.

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q4">
<summary>Which architectural options did you consider and reject, and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The ones worth discussing:

- **A relational database.** Rejected for this phase. The data is write-once daily snapshots read by
  date and org, there are no cross-entity transactions, and a database would add a schema, migrations,
  backups and a service to run, all for one developer. Files on a share are debuggable with `ls` and
  `jq`. The trade-off is no ad-hoc querying, which I'd revisit if users needed it.
- **A message bus or event-driven pipeline.** Rejected; nothing needs sub-day latency. The cost is that
  the job order is implicit (by clock), which I now consider the weakest part of the design.
- **One big job instead of thirteen.** Rejected: one failing domain would block all others, and the
  enterprise scorecard phase needs domains to be added independently.
- **Each job collecting its own GitHub data.** That's what I did first, and I reversed it. The
  duplicated calls cost rate limit and run time, so collection moved into one central job.
- **A separate frontend deployment.** FastAPI serves the built React app instead: one image, one
  ingress, no CORS.

Deeper: [ADR table](/posts/projects/state-of-devops/05-technical-architecture/#architectural-decision-records).

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q5">
<summary>Monolith, modular monolith or microservices, what did you choose and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Neither label fits cleanly, and I'd say so. The **dashboard is a small monolith**: one FastAPI process
that serves both the API and the built React app, with internal services (`storage_client`,
`cache_client`, `ghas_service`, `applications_service`, `cache_warmer`) as modules, not network hops.
The **jobs are independent batch components**: thirteen images in one monorepo, each with its own Helm
chart, schedule and version, sharing code through `cronjobs/common/`.

So the deployable units look like microservices, but they don't talk to each other. They coordinate
through files, which avoids most microservice pain (service discovery, retries between services,
distributed tracing) while keeping independent deploys and failure isolation.

Why this shape? Domains change at different speeds and fail independently (the cost API can be down
while GitHub is fine), so jobs deserved separate deploys. The dashboard had no such pressure, so
splitting it would have been cost without benefit. The monorepo with change detection in CI keeps
thirteen components manageable for a small team.

Deeper: [Build automation](/posts/projects/state-of-devops/12-cicd-and-release-management/#build-automation).

</div>

<div class="iq-role" data-role="developer" markdown="1">

For a developer, "modular monolith" shows up in how you change code:

- **The API is one FastAPI app** in one `main.py`, with services as plain classes injected at module
  level. Adding an endpoint means a route function plus a storage method; there's no network hop to
  mock. The cost is a 2,000-line `main.py`; I'd split it with `APIRouter` per domain (`repo`, `pipeline`,
  `infra`, `cost`, `compliance`) and `app.include_router(...)`.
- **Each job is its own program** with its own `requirements.txt`, so a dependency bump in the cost
  analyzer can't break the GHAS analyzer. Shared code is copied into each image from `cronjobs/common/`,
  which is why a change there needs a forced full build.
- **The UI is one SPA** with route-level components.

```python
from fastapi import APIRouter
router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])

@router.get("/organizations/{org}/repositories")
async def list_pipeline_repositories(org: str, date: str | None = None): ...
```

</div>

<div class="iq-role" data-role="devops" markdown="1">

Deployment-wise it behaves like microservices: **13 images, 13 versions, 13 Argo CD apps**, each in
`versions.yaml` with its own semantic version. The monorepo keeps that manageable:

- CI builds only changed components (a `workflow_dispatch` input can force one or all);
- a release bumps one service at a time (`make release SERVICE=<svc> [BUMP=minor]`);
- promotion is per service (`make promote SERVICE=<svc> VERSION=vX.Y.Z`).

The things a microservice platform usually needs and this one doesn't: service discovery, a mesh,
inter-service auth or distributed tracing, because the components never call each other. The only
coupling is the file share and the schedule, which is why **don't promote analyzers during the
02:00 to 07:00 UTC run window** is the one deployment rule.

</div>

</details>

## Technology Choices
{: #technology-choices }

<details class="project-iq" markdown="1" id="technology-choices-q1">
<summary>Which technologies did you use across the stack, and why those?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Layer | Choice | Why |
|---|---|---|
| Jobs | Python 3.11 / 3.12 slim images | GitHub, JFrog and Azure SDKs make API work quick; readable for a DevOps team |
| Retries | `tenacity` | Rate limits and flaky APIs are the normal case |
| Scheduling | Kubernetes CronJobs | Already on the platform, no extra scheduler |
| Backend | FastAPI + Uvicorn, Pydantic 2 | Async handlers, typed models, free OpenAPI docs |
| Frontend | React 18, Create React App, React Router 6, Axios, Recharts | Familiar, enough for a tab-based internal UI |
| Cache | Redis (Azure Cache for Redis in prod) | Memoize aggregations across requests and pods |
| Storage | Azure Files | Many small JSON files, many readers, two namespaces |
| Packaging | Docker, Helm 3 with a shared library chart | One template for 13 similar CronJobs |
| Delivery | GitHub Actions, JFrog, ArgoCD | The organization's standard path |
| Security | GitHub Apps, Workload Identity, External Secrets + Key Vault | No secrets in images |

The common thread is **boring and already supported**: I picked what the platform and the team already
ran, so the novelty budget went into the data design instead of the tooling. The one choice I'd revisit
is Create React App, which is no longer maintained; a move to Vite is planned.

Deeper: [Technology selection](/posts/projects/state-of-devops/05-technical-architecture/#technology-and-framework-selection).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The developer-level stack, with what each piece does here:

- **Python 3.11 / 3.12** for jobs: `requests` sessions, `tenacity` retries, `PyYAML` config,
  `ThreadPoolExecutor` for concurrency.
- **FastAPI 0.109 + Uvicorn**: async route functions, `Query(...)` parameters, `HTTPException` for
  404/500, `response_model=` for Pydantic 2 responses and free OpenAPI docs at `/docs`.
- **`redis.asyncio`** (`redis[hiredis]`) for the cache: `get`, `setex` with TTLs, connect and socket
  timeouts of 5 s.
- **React 18 + Create React App** (`react-scripts` 5.0.1), **React Router 6**, **Axios**, **Recharts**.
- **Azure SDKs** (`azure-storage-file-share`, `azure-identity`) where jobs talk to storage directly.

```bash
pip install -r requirements.txt && uvicorn backend.main:app --reload --port 8000
cd frontend && npm ci && npm start            # CRA dev server, proxies /api to :8000
npm run build                                 # production bundle into frontend/build
```

</div>

<div class="iq-role" data-role="devops" markdown="1">

The delivery stack:

- **Docker**: the dashboard is multi-stage (Node builds the React app, a Python Alpine image runs
  Uvicorn), on hardened base images from the internal registry, with base images as build args so CI
  can pin them.
- **Helm 3** with a **library chart** for 13 near-identical CronJobs.
- **GitHub Actions** built from the organization's reusable workflows (detect changes, Docker build with
  Xray, SonarQube, CodeQL, Helm package), with **OIDC to JFrog**, so no registry password is stored.
- **JFrog Artifactory** for images and charts; **Argo CD** for GitOps; **External Secrets + Key Vault**;
  **Azure Workload Identity**; **k3d** locally; **Taskfile** for everything.

A DevOps gap I'd point out myself: the Dockerfile sets `npm config set strict-ssl false` and installs
pip packages with `--trusted-host`, to cope with TLS interception differences between corporate and
GitHub-hosted runners. It works, but it weakens supply-chain checks; the better fix is installing the
right CA bundle in the build stage.

</div>

</details>

<details class="project-iq" markdown="1" id="technology-choices-q2">
<summary>How do you evaluate and choose between competing technologies?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I score options against a short list, in this order:

1. **Fit to the access pattern and NFRs.** An I/O-bound read API with typed responses suited FastAPI's
   async handlers and Pydantic models.
2. **Operational cost.** Who runs it at 2 a.m., and is it already on the platform? Kubernetes
   CronJobs won over Airflow for that reason alone.
3. **Team familiarity.** The people taking it over are DevOps engineers, so Python over Go for jobs.
4. **Exit cost.** How hard is it to replace later? Files on a share have near-zero lock-in; the API
   hides the storage from the frontend, so a database can come later.
5. **Ecosystem and maintenance health.** This is where CRA lost points over time.

For a decision that's hard to reverse I write an ADR with the options and consequences. For example,
ADR-001 records "dated JSON on Azure Files, not a database" with the trade-off spelled out (no ad-hoc
queries, cheap migrations).

The interview point I'd make: the "best" technology is the one whose weaknesses don't matter for this
workload. Redis's lack of durability is fine here because it's only a cache.

</div>

<div class="iq-role" data-role="developer" markdown="1">

As a developer I'd add three practical criteria to the architect's list:

1. **Does it make the common change easy?** A new check had to be one class and one test. Plain Python
   classes beat a plugin framework for that.
2. **Is it boring to debug?** FastAPI gives typed models, readable tracebacks and `/docs` to try
   endpoints; files on disk can be inspected with `jq`.
3. **How alive is the ecosystem?** This is where Create React App lost: it's unmaintained, `react-scripts`
   pins an old webpack and Jest, and upgrades get harder. For the next frontend change I'd move to Vite:

```bash
npm create vite@latest frontend -- --template react
# then: move src/, rename REACT_APP_* to VITE_* (import.meta.env), and set server.proxy for /api
```

I also check **what a library forces on the code**: Redux would have added boilerplate to an app whose
state is "what did the last fetch return", so local state, Context and URL parameters were enough.

</div>

</details>

<details class="project-iq" markdown="1" id="technology-choices-q3">
<summary>Where did you build, and where did you buy or reuse?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Reused:** everything the platform already provided. AKS, ArgoCD, External Secrets Operator, Key
Vault, JFrog, the organization's reusable GitHub Actions workflows for build, SonarQube and CodeQL,
and Azure Cache for Redis as a managed service. That saved months.

**Built:** the part that's specific to the organization, which is the checks themselves (the analyzers
and their configurable rules), the data layout, and the dashboard. No off-the-shelf product combined
repo hygiene, pipeline coverage, GHAS, IaC usage and cost across four orgs with organization-specific
and HIPAA-driven rules.

**Built once, shared everywhere:** clients for each integration in `cronjobs/common/`
(`github_api_client`, `GitHubAppTokenManager`, the file share client, Jira and Teams clients) and a Helm
library chart. Writing these once was what made the tenth analyzer cheaper than the first.

My rule of thumb: buy or reuse the commodity, build the differentiator, and wrap every external
dependency in one client so it can be replaced.

Deeper: [Integration development](/posts/projects/state-of-devops/09-implementation/#integration-development).

</div>

<div class="iq-role" data-role="devops" markdown="1">

From the DevOps seat, "reuse" was most of the delivery stack:

- the organization's **reusable workflows** (`docker-detect-changes`, `docker-jfrog-ci`,
  `sonarqube-python-ci`, `codeql-ci`, `helm-jfrog-ci`), so the repo's CI is mostly configuration;
- **hardened base images** from the internal registry;
- the platform's **AKS, Argo CD, External Secrets, Key Vault and JFrog**.

What I built was the glue specific to this repo: the **Helm library chart**, the **release and promote
workflows** (re-tag, chart publish, GitOps PRs), **PR preview** deploys with an approval watchdog, and a
**Taskfile** with tasks for build, import into k3d, deploy, and per-job test runs
(`task test-state-of-devops` triggers every analyzer).

One caution I'd raise about reuse: the reusable workflows are referenced by `@main`, so a change in the
shared repo changes this CI without a commit here. Pinning them to tags or SHAs is the safer default.

</div>

</details>

## Frontend Architecture
{: #frontend-architecture }

<details class="project-iq" markdown="1" id="frontend-architecture-q1">
<summary>How is the frontend (or user-facing interface) structured, in terms of framework, routing, components and state?</summary>

<div class="iq-role" data-role="architect" markdown="1">

It's a React 18 single-page app built with Create React App, and its structure mirrors the data:
**one analyzer, one tab**. React Router 6 maps each tab to the same three-page pattern: an org list
(`OrganizationList`, `PipelineOrganizationList`, …), a paginated repository list, and a repository
detail page that shows every sub-analyzer's result.

Shared components give every tab the same chrome: `Sidebar`, `Pagination`, refresh buttons, and
`JiraCreateButton` / `JiraCreateModal` for the main write action. All HTTP calls go through one Axios API
client, so base URL, error handling and headers live in one place. Charts are Recharts.

State is deliberately simple: server data fetched per page, plus URL state (org, repo, `?date=`).
There's no Redux or global store, because the data changes once a day and every page is a read of one
endpoint. Putting the date in the URL also makes any past snapshot linkable.

One design choice I like: the sidebar comes from `GET /api/sidebar-config`, so tabs can be switched off
per environment without a frontend release. A half-finished analyzer can ship with its tab hidden.

Deeper: [Information architecture](/posts/projects/state-of-devops/04-user-experience-and-design/#information-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The React concepts, as this app uses them:

- **SPA and routing:** `BrowserRouter` + `<Routes>`/`<Route>` in `App.js`; dynamic segments such as
  `/repo-analysis/org/:org/repo/:repo` read with `useParams()`; navigation with `<Link to=…>`. FastAPI has a
  catch-all route that returns `index.html`, so deep links work on refresh.
- **Components and JSX:** function components per page (`RepositoryList`, `RepositoryDetail`) and shared
  ones (`Sidebar`, `Pagination`, `JiraCreateModal`); JSX with `className` and inline style objects.
- **Props:** e.g. {% raw %}`<RefreshButton cacheType="org" params={{ org }} onRefresh={loadRepositories} />`{% endraw %}
  passes data and a callback down.
- **State:** `useState` for data, `loading`, `error`, `currentPage`, `searchTerm`.
- **Lifecycle via effects:** `useEffect(() => { loadRepositories(); }, [org])` refetches when the route
  parameter changes.
- **Context:** `JiraPageContext` (`createContext`, a provider in `App.js`, a `useJiraPageContext()`
  custom hook) shares page data with the header's Jira button without prop drilling.
- **StrictMode** in `index.js`, which double-invokes effects in development to surface bugs.

```jsx
const { org } = useParams();
const [repositories, setRepositories] = useState([]);
useEffect(() => { loadRepositories(); }, [org]);
```

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-architecture-q2">
<summary>How does the user interface handle loading, errors and large data sets?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Large data sets:** repository lists are paginated **in the browser** through the shared
`Pagination` component (10 rows a page), with a client-side search box. That's fine at today's
size; at tens of thousands of repos I'd move paging and search to the server. Four orgs' worth of repos never reaches the browser in one response.
The Home page is one small pre-computed file, so the heaviest view for executives is also the lightest.

**Loading:** data changes once a day, so there's no polling. Pages fetch on navigation, and explicit
refresh buttons re-fetch on demand. Redis on the backend makes repeated views cheap, so a refresh is
fast after the first hit.

**Errors and missing data:** the acceptance criterion I set was that every tab handles "no data for
today" without crashing. The important distinction is **no data versus zero**: an analyzer that didn't
run must not look like a perfect score. I'd make that visible with a fixed status palette (pass, warn,
fail, no data) used identically in tables, badges and charts, plus an "as of" date on every page.

What I'd add next is a data-quality banner on Home, written by the summary generator when a domain is
missing or stale.

Deeper: [Interaction patterns](/posts/projects/state-of-devops/04-user-experience-and-design/#interaction-patterns),
[content and messaging](/posts/projects/state-of-devops/04-user-experience-and-design/#content-and-messaging).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The patterns in code:

- **Conditional rendering with early returns:**
  `if (loading) return <div className="loading">…</div>;` and
  `if (error) return <div className="error">Error: {error}</div>;`.
- **try / catch / finally** around the fetch, so `setLoading(false)` always runs.
- **Parallel requests:** `Promise.all([api.listRepositories(org), api.getOrganizationSummary(org).catch(() => null)])`
  loads the list and summary together, and the `.catch` makes the summary optional.
- **Lists and the `key` prop:** every `.map()` renders with a stable key (`key={repo.name}`,
  `key={page}` in `Pagination`, `key={section.id}` in the sidebar) so React's reconciliation updates rows
  instead of re-creating them.
- **Client-side pagination and search:** `filteredRepos` is derived from state on each render, then
  sliced by `currentPage` and `ITEMS_PER_PAGE = 10`.
- **Event handlers:** `onChange={(e) => setSearchTerm(e.target.value)}` for a controlled search input.

A developer improvement I'd make: wrap derived data in `useMemo` and debounce the search input, and
show an empty state ("no repositories match") rather than an empty table.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-architecture-q3">
<summary>How do you keep the frontend fast and accessible?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Fast** mostly comes from the backend contract rather than frontend tricks: Home reads a single
pre-computed file, Redis absorbs repeated aggregations, and a background warmer pre-builds the
repository lists. On the
client, each tab only loads its own data, and there's no live polling. The p95 target I'd hold is
under 1 second for Home and under 3 seconds for analysis tabs with a warm cache.

**Accessible** is an honest gap I'd raise myself. Recharts needs care, and these are the first fixes,
in order of value:

1. Never use colour alone for pass/fail; add an icon or label.
2. A colour-blind-safe palette with directly labelled series.
3. A "view as table" toggle for every chart (it also helps people who export numbers).
4. Keyboard-operable sidebar and modal, with focus returned when the Jira modal closes.
5. An automated axe or Lighthouse check in CI against the built app.

> **TODO:** Has the dashboard been checked with a screen reader or an automated accessibility tool?
{: .prompt-warning }

Deeper: [Accessibility design](/posts/projects/state-of-devops/04-user-experience-and-design/#accessibility-design).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Performance concepts that apply here:

- **Virtual DOM and reconciliation:** React diffs the new tree against the previous one and patches the
  real DOM; stable `key`s on list rows are what make that cheap.
- **Avoiding unnecessary renders:** `useMemo` already builds the Jira epic options only when the config
  changes; `useCallback` keeps `setPageData` stable in the Context provider so consumers don't re-render.
- **Effect cleanup:** the Jira modal clears its timers in a cleanup function, and `App.js` removes its
  `storage` listener and interval on unmount, which prevents leaks.
- **Bundle:** CRA's production build minifies and hashes assets; route-level code splitting with
  `React.lazy` and `<Suspense>` would cut the initial bundle, since 40+ page components load up front.

One thing I'd fix: `App.js` polls `localStorage` every 300 ms to sync the sidebar's collapsed state.
Lifting that state into Context removes the timer entirely.

**Accessibility, as code:** use `<button>` (not clickable `<div>`s) for actions, label every form
control, and return focus to the trigger when the Jira modal closes (`useRef` + `.focus()`).

</div>

<div class="iq-role" data-role="sre" markdown="1">

As SRE, "fast" is something I'd measure, not assume:

- **SLIs:** p95 latency of the API calls each page makes (`/api/home-overview` under 1 s, list endpoints
  under 3 s warm), plus front-end timings if we add Real User Monitoring (Core Web Vitals such as LCP).
- **Dependency on the cache:** most pages are fast only because Redis holds pre-built lists. If Redis is
  down, `CacheClient` disables itself and pages fall back to reading many files per request, so latency
  degrades rather than failing. That's the behaviour I'd alert on: a cache hit ratio drop is an early
  warning.
- **Synthetic check:** a scheduled request to Home and one analysis list, from inside the network, gives
  an availability and latency signal even when nobody's using it.

```bash
curl -s -o /dev/null -w '%{time_total}\n' https://<dashboard-host>/api/home-overview
kubectl exec -n state-of-devops deploy/devops-state-dashboard -- python -c "print('ok')"
```

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-architecture-q4">
<summary>How is the frontend built, configured per environment and served?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The React app is built with `react-scripts` into static files and **served by FastAPI** from the same
container image as the API (ADR-006). That gives one image, one Helm chart and one ingress, and the
browser calls `/api/...` on the same origin, so CORS isn't needed. (The app still adds a permissive
CORS middleware, `allow_origins=["*"]` with credentials, which I'd remove.)

Locally, `task local-development` runs uvicorn with reload on port 8000 and the CRA dev server on 3000,
which proxies `/api` to the backend through the `proxy` field in `package.json`. A hard-won tip from the
project docs: use `127.0.0.1`, not `localhost`, because IPv6 resolution kept breaking the proxy.

Environment differences don't live in the frontend build at all. The same image runs everywhere, and
anything environment-specific (like which tabs are visible) comes from the backend at run time through
`/api/sidebar-config`. That's what makes "build once, deploy many" possible for the UI too.

What I'd change: CRA is unmaintained, so moving to Vite is on the roadmap. For an app this size it's
mostly configuration (entry point, env prefix, proxy).

Deeper: [Local development setup](/posts/projects/state-of-devops/08-development-preparation/#local-development-setup).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The build pipeline for the UI, step by step:

- **Local:** `npm start` runs the CRA dev server on :3000 with hot reload; `"proxy": "http://localhost:8000"`
  in `package.json` forwards `/api` calls to Uvicorn. The docs recommend `127.0.0.1` because `localhost`
  can resolve to IPv6 and break the proxy.
- **Environment variables:** CRA inlines `REACT_APP_*` variables at **build time**; `api.js` uses
  `process.env.REACT_APP_API_URL || "/api"`. Production leaves it unset, so calls are same-origin.
- **Build:** `npx react-scripts build` writes `build/` with hashed JS and CSS under `build/static/`.
- **Serve:** FastAPI mounts `/static` with `StaticFiles` and returns `index.html` for every non-API path,
  so React Router handles client-side routes.

```python
app.mount("/static", StaticFiles(directory=str(frontend_path / "static")), name="static")

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not Found")
    return FileResponse(str(frontend_path / "index.html"))
```

</div>

<div class="iq-role" data-role="devops" markdown="1">

Packaging the UI is the first stage of the dashboard's multi-stage Dockerfile:

```dockerfile
FROM ${NODE_BASE_IMAGE} AS frontend-build
WORKDIR /app/frontend
COPY devops-state-dashboard/frontend/package.json devops-state-dashboard/frontend/package-lock.json* ./
RUN npm ci --no-audit --no-fund          # cached unless package files change
COPY devops-state-dashboard/frontend/ ./
RUN npx react-scripts build

FROM ${PYTHON_BASE_IMAGE}
# ... pip install, copy backend ...
COPY --from=frontend-build /app/frontend/build ./frontend/build
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Points I'd make: copying the package files before the source keeps `npm ci` in a cached layer; the Node
toolchain never reaches the runtime image; and the image is identical for every environment because the
UI reads nothing environment-specific at build time. Per-environment differences (hostname, sidebar
flags such as `SIDEBAR_ADMIN`) come from Helm values and the ConfigMap at run time.

```bash
docker build -f devops-state-dashboard/Dockerfile -t devops-state-dashboard:dev .
helm template devops-state-dashboard/helm -f devops-state-dashboard/helm/values-local.yaml | less
```

</div>

</details>

## Backend and API Design
{: #backend-and-api-design }

<details class="project-iq" markdown="1" id="backend-and-api-design-q1">
<summary>How do CRUD operations work in the backend, from request to persisted data?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I'd answer this one carefully, because the honest answer is that this system is **not CRUD-shaped**,
and seeing that was a design decision. Mapped onto CRUD:

| Operation | Who does it | How |
|---|---|---|
| Create | Cronjobs | Each job writes today's JSON into its own dated folder |
| Read | Dashboard API | FastAPI builds the dated path, reads the JSON, caches in Redis |
| Update | Cronjobs | A rerun overwrites the same dated folder (idempotent per day) |
| Delete | Retention | Old reports age out; history is otherwise kept as audit evidence |

User-initiated writes are few. The main one is `POST /api/jira/create-story`: Pydantic validates the
body, the Jira client creates the story, and the API returns the story key; the system of record is
Jira, not us. The others are a CSV upload of dormant users (written to a dated folder on the share,
with the enterprise name validated against path traversal) and maintenance endpoints that clear,
warm or invalidate the cache.

If the interviewer wants the classic case, I'd describe how I'd add it here: say, exemptions managed
from the UI. That's a real table in Postgres, a router with Pydantic request and response models, a
service layer with the business rules, a repository layer using SQLAlchemy in a transaction, Alembic
migrations, optimistic concurrency with a version column, and an audit row for every change.

Deeper: [API architecture](/posts/projects/state-of-devops/05-technical-architecture/#api-and-integration-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

In FastAPI terms, a read is a route function plus a storage call, and the one real "create" is the Jira
endpoint:

- **Routing and parameters:** `@app.get("/api/organizations/{org}/repositories")` takes `org` from the
  path and `date: Optional[str] = Query(None, …)` from the query string.
- **Response model:** `response_model=RepositoryListResponse` validates and documents the output.
- **Errors:** `raise HTTPException(status_code=404, detail=f"No analysis found for organization {org}")`
  when there's no data; a broad `except Exception` turns anything else into a 500 (after re-raising
  `HTTPException` so 404s survive).
- **Create:** `POST /api/jira/create-story` takes a Pydantic request body; the React modal builds it from
  the form and page context.
- **Upload:** `POST /api/enterprise/{enterprise}/dormant-users/upload` takes `UploadFile = File(...)`
  (multipart, via `python-multipart`) and writes a dated file.

```python
@app.get("/api/organizations/{org}/repositories", response_model=RepositoryListResponse)
async def list_repositories(org: str, date: Optional[str] = Query(None)):
    if not date:
        date = await storage_client.get_latest_analysis_date(org)
        if not date:
            raise HTTPException(status_code=404, detail=f"No analysis found for organization {org}")
```

If I added real CRUD, I'd use dependency injection (`Depends(get_session)`) for a SQLAlchemy session,
separate request and response schemas, and `status_code=201` on create.

</div>

</details>

<details class="project-iq" markdown="1" id="backend-and-api-design-q2">
<summary>How did you design the API, in terms of style, resources, versioning, pagination and errors?</summary>

<div class="iq-role" data-role="architect" markdown="1">

It's **read-mostly REST, grouped by domain, with the same shape in every group**:

```text
GET /api/<domain>/organizations                         # orgs with latest analysis date
GET /api/<domain>/organizations/{org}/repositories      # ?date= for a past snapshot
GET /api/<domain>/organizations/{org}/repositories/{repo}
GET /api/<domain>/organizations/{org}/summary
```

Around those sit `/api/home-overview`, cost endpoints, `/api/health`, `/api/sidebar-config` and the one
write, `POST /api/jira/create-story`. The uniform shape is what lets the frontend reuse one page pattern
for every analyzer.

- **Time is a parameter, not a resource.** `?date=` selects a snapshot, since storage is partitioned
  by day.
- **Pagination** happens in the browser today: an org's repository list comes back in one response
  (served from a pre-built Redis list), and the UI pages it. Server-side `page`/`limit` is the change
  I'd make if an org grew to thousands of repos.
- **Errors:** the convention I hold to is 400 for invalid input (like a bad path) and 404 when an org
  or date has no data, which the UI shows as "no data" rather than as an error page.
- **Versioning:** the API has one consumer, shipped in the same image, so URL versioning would be
  ceremony. The data contract is the part that's versioned (`metadata.json`). If a second consumer
  appeared, I'd introduce `/api/v1`.

FastAPI's generated OpenAPI docs are the API reference.

</div>

<div class="iq-role" data-role="developer" markdown="1">

The developer view of the API design:

- **Uniform paths per domain** (`/api/organizations`, `/api/pipeline/organizations`,
  `/api/infra/organizations`), so `api.js` has the same three or four functions per domain.
- **Optional query parameters** for time travel (`?date=YYYY-MM-DD`) and filters (`component=`).
- **Typed responses:** Pydantic models in `models.py` (`OrganizationListResponse`,
  `RepositoryAnalysisResponse`, `ComponentSummaryResponse`…) give validation and an OpenAPI schema at
  `/docs` and `/openapi.json` for free.
- **Status codes:** 404 for "no data for that org or date", 500 for unexpected errors, and the catch-all
  frontend route returns 404 for unknown `api/` paths so they don't fall through to `index.html`.

Two developer improvements I'd make: return a consistent error body (`{"error": code, "detail": …}`)
with an exception handler instead of `detail=str(e)`, which can leak internals; and parse `date` as a
`datetime.date` so FastAPI rejects bad input with a 422 before any file path is built.

```bash
curl -s http://127.0.0.1:8000/openapi.json | jq '.paths | keys | length'
curl -s "http://127.0.0.1:8000/api/organizations/org-a/repositories?date=2026-09-01" | jq '.total'
```

</div>

</details>

<details class="project-iq" markdown="1" id="backend-and-api-design-q3">
<summary>How is the backend structured internally, and where does background work run?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The FastAPI app is thin routers over services:

| Service | Responsibility |
|---|---|
| `storage_client` | Reads files from a local path (k3d) or Azure Files (AKS) behind one interface |
| `cache_client` | Redis memoization of expensive aggregations |
| `ghas_service`, `applications_service` | Domain logic for GHAS output and app-to-Jira-epic mapping |
| `cache_warmer` | Pre-fetches popular endpoints on startup |

Routers handle HTTP and validation, services hold logic, and the storage client hides where the bytes
live. That last abstraction is why the same code runs on a laptop and in AKS.

**Background work runs almost entirely outside the API**, in the cronjobs. That's the key structural
decision: anything slow or failure-prone (GitHub calls, analysis, aggregation) happens on a schedule,
never in a request. The API's only background task is the cache warmer: it starts with the app and
re-warms repo, pipeline and infra summaries every 30 minutes. With several
replicas it should take a short Redis lock (`SET warm:<date> NX EX 600`) so three pods don't warm the
cache three times.

Inside the jobs, the same layering applies: shared clients in `cronjobs/common/`, an orchestrator per
job, and small sub-analyzers with one `analyze()` method each.

Deeper: [API and UI implementation](/posts/projects/state-of-devops/09-implementation/#api-and-ui-implementation).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Inside the API process:

- **Module-level singletons:** `config = Config.load()` (env vars), then `CacheClient`, `StorageClient`,
  `ApplicationsService`, `GHASService` and `CacheWarmer`, created at import and shared by every request.
- **Startup and shutdown hooks** connect Redis and start the warmer, then stop the warmer and disconnect.
- **Background work:** `CacheWarmer` runs an `asyncio` loop that warms repo, pipeline and infra summaries
  every 30 minutes (`REFRESH_INTERVAL = 1800`), and list endpoints also fire
  `asyncio.create_task(cache_warmer.warm_repo_summary(org, date))` after a cache miss.
- **Blocking work:** trend files are read with `asyncio.to_thread(...)`, which keeps the event loop free.
  Repo-analysis files are still read with a plain `open()`, which I'd move to `to_thread` too.

```python
data = await asyncio.to_thread(self._load_trends_local, org, analysis_type, period, date)
```

Inside the **jobs**, background work is the whole program: `DevOpsRepoAnalyzer.run()` iterates orgs
(2 in parallel) and repos (10 in parallel) with `ThreadPoolExecutor` and `as_completed`, counting
analyzed, failed and skipped repos.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Where the work runs is a deployment decision:

| Work | Runs as | Config |
|---|---|---|
| API and cache warmer | Deployment, 1 replica, Uvicorn on :8000 | ConfigMap env (`STORAGE_PATH`, `REDIS_HOST`, `CACHE_ENABLED`, `SIDEBAR_*`) |
| Jobs | CronJobs, `concurrencyPolicy: Forbid` | Schedule and `configYaml` in Helm values |
| Redis | Azure Cache for Redis in AKS; a `redis:7-alpine` Deployment locally | Host and password from Key Vault |

`concurrencyPolicy: Forbid` matters for batch work: if last night's analyzer is still running, the next
schedule is skipped instead of starting a second copy that writes the same folders. `restartPolicy:
OnFailure` retries a crashed pod, and `ttlSecondsAfterFinished: 3600` cleans up finished Jobs.

One deployment caveat: because the cache warmer runs inside every API pod, scaling the Deployment to
three replicas means three warmers. That's harmless (idempotent writes to Redis) but wasteful; a Redis
lock or a separate warmer CronJob would fix it.

```bash
kubectl create job --from=cronjob/devops-repo-analyzer manual-$(date +%s) -n cronjobs
kubectl logs -f deploy/devops-state-dashboard -n state-of-devops | grep -i warm
```

</div>

</details>

<details class="project-iq" markdown="1" id="backend-and-api-design-q4">
<summary>How do you validate input and keep operations safe to repeat?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Validation.** The input risk in this API is easy to miss: org and repo names in URLs become
**filesystem paths**. `GET /api/organizations/{org}/repositories/{repo}` reads a file, so `../../` must
never reach `open()`. The jobs build paths in their storage clients from their own config, but the dashboard
builds them directly from URL parameters today; only the upload endpoint validates its input. That's
the gap I'd close first, with one helper every endpoint uses:

```python
def safe_path(*parts: str) -> Path:
    path = DATA_ROOT.joinpath(*parts).resolve()
    if not path.is_relative_to(DATA_ROOT):
        raise HTTPException(status_code=400, detail="invalid path")
    return path
```

Pydantic models validate the Jira request body. The `date=` filter is still a plain string today; it
should be typed as a date so FastAPI rejects bad input with a 422 before any path is built.

**Safe to repeat.** Every job is idempotent per day: a rerun overwrites the same dated folder, so
"rerun the failed job" is always a safe runbook step. The non-idempotent operation is Jira creation:
the acceptance criterion is exactly one story per click. I'd harden it with an idempotency key (a hash
of repo, check and date) checked before creating, so a double-click or a retry can't open duplicates.

Deeper: [Input validation](/posts/projects/state-of-devops/06-security-and-privacy/#input-validation-and-secure-coding).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Validation and idempotency in code:

- **Pydantic** validates request bodies (the Jira story) and response shapes; FastAPI returns 422 on bad
  bodies automatically.
- **Path parameters become file paths**, so they need explicit validation. The upload endpoint does it
  ("Validate the enterprise name to prevent path traversal"); the read endpoints don't yet. The fix:

```python
import re
NAME = re.compile(r"^[A-Za-z0-9._-]{1,100}$")

def check_name(value: str) -> str:
    if not NAME.fullmatch(value) or value in {".", ".."}:
        raise HTTPException(status_code=400, detail="invalid name")
    return value
```

  wrapped in a FastAPI dependency (`async def valid_org(org: str) -> str: return check_name(org)`, then
  `org: str = Depends(valid_org)` in each route), plus a `resolve()` check against the data root.
- **Idempotent jobs:** the analyzer writes `<org>/<YYYY>/<MM>/<DD>/<repo>.json` with a stable filename,
  so a rerun overwrites rather than duplicates.
- **Safe retries:** `tenacity` retries GitHub calls only when `_is_retryable_error` says so (network
  errors, 429, 5xx), never a 4xx, because retrying a 403 just burns rate limit.
- **Non-idempotent Jira create:** the modal disables the button while `isSubmitting`, which stops
  double clicks; a server-side idempotency key would also stop retries.

</div>

<div class="iq-role" data-role="sre" markdown="1">

As SRE I care about what "safe to repeat" means during an incident:

- **Rerunning a job is always safe**, which makes it the first runbook step:
  `kubectl create job --from=cronjob/<job> rerun-$(date +%s) -n cronjobs`. Same date, same paths,
  overwritten files.
- **`concurrencyPolicy: Forbid`** prevents two copies of a job racing on the same folder.
- **Retries are bounded**: three attempts with exponential backoff (4 to 10 seconds) on transient
  errors. Unbounded retries against a rate-limited API turn a blip into an outage.
- **Cache operations are safe to repeat**: `POST /api/cache/clear/{org}` and `/api/cache/warm` just
  rebuild derived data. After rerunning a job for today, clearing that org's cache is the second step,
  because entries for the latest date live for up to an hour.
- **Validation failures should be visible**: a burst of 400s or 422s is a signal (a broken client or a
  probe), so I'd count them by route.

</div>

</details>

## Database and Data Modeling
{: #database-and-data-modeling }

<details class="project-iq" markdown="1" id="database-and-data-modeling-q1">
<summary>Which data store did you choose, and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

There's **no database**. The store is a directory tree of JSON files on one Azure File Share, and
Redis is a cache in front of it. I'd defend that choice from the access pattern:

- Writes happen once a day per domain, org and date, by exactly one job. No concurrent writers, no
  transactions across entities.
- Reads are "this org on this date" or "the last N days": a path lookup, not a join.
- Files are write-once history, which is exactly what audit evidence should be.
- Azure Files supports many readers across namespaces, so the dashboard mounts the same share. (It's
  mounted read-write today because of the dormant-users upload; I'd make it read-only and give the
  upload its own small path.)
- Debugging is `ls` and `jq`, and a laptop can mount the same layout with k3d.

What I gave up: ad-hoc querying ("all repos without CODEOWNERS across orgs, by team"), referential
integrity, and server-side aggregation. The summary generator and Redis cover the aggregation; the
other two haven't been needed yet.

When would I switch? If users needed ad-hoc queries, or if data went from daily to near-real-time,
I'd load the same JSON into Postgres (JSONB) or a columnar store behind the existing API. Because the
frontend only knows the API, that would be an invisible change.

Deeper: [ADR-001 and data architecture](/posts/projects/state-of-devops/05-technical-architecture/#data-architecture-and-data-models).

</div>

<div class="iq-role" data-role="developer" markdown="1">

For a developer, "no database" means the data layer is a class that maps parameters to paths:

```python
def _load_analysis_local(self, org, repo, date):
    year, month, day = date.split('-')
    file_path = (Path(self.local_storage_path) / "devops-state" / "repo-analysis"
                 / org / year / month / day / f"{repo}.json")
    if not file_path.exists():
        return None
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)
```

Concepts that replace database ones:

- **"Primary key"** is the path (`org`, `date`, `repo`).
- **"Index"** is the folder structure: listing `<org>/<YYYY>/<MM>/` finds dates; the latest date is the
  newest folder (`get_latest_analysis_date`).
- **"Query cache"** is Redis: each `load_analysis` result is cached under
  `devops-state:{org}:{repo}:{date}:repo-analysis`.
- **"Materialized view"** is the pre-built repo list in Redis and `home-overview.json` on disk.

The developer cost: aggregations (pass rates per component) are loops in Python, so they're slow on a
cold cache. That's the reason for the warmer.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Operationally, the store is an **Azure File Share** mounted as a Kubernetes volume:

- a **PersistentVolume** with the Azure Files CSI driver and a **PVC**, both `ReadWriteMany`, so pods in
  two namespaces can mount it, with `persistentVolumeReclaimPolicy: Retain` so deleting the chart never
  deletes data;
- jobs use the shared `cron-jobs-data-pvc` from `cronjob-shared-infra`; the dashboard has its own
  PV/PVC to the same share;
- locally, k3d bind-mounts a host folder at `/data` (set up by `k3d/setup-fileshare-resources.sh`),
  so you can read last night's output with `ls` and `jq`.

What I'd change: mount the dashboard's volume read-only (`readOnly: true` on the volume mount) except for
the upload path, since the dashboard otherwise only reads.

```bash
kubectl get pv,pvc -A | grep -i devops
kubectl exec -n state-of-devops deploy/devops-state-dashboard -- ls /data/devops-state
```

</div>

</details>

<details class="project-iq" markdown="1" id="database-and-data-modeling-q2">
<summary>How is the data modeled, and how did the access patterns shape the model?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The model is the path:

```text
/data/devops-state/<domain>/{org}/{YYYY}/{MM}/{DD}/<sub-analyzer>/<stable-name>.json
                                                    metadata.json   # analyzer version + generated_at
```

Each part of the path exists because of a query:

- **Domain first**, because every tab reads one domain.
- **Org next**, because every page is scoped to an org.
- **Date as `YYYY/MM/DD` in UTC**, because "today" and "the last 30 days" are the two main reads, and
  zero-padded UTC dates make "today" a deterministic path. Weekly reports use ISO weeks (`YYYY/W{WW}`).
- **Stable filenames** inside a dated folder, so no listing is needed to find today's file.
- `metadata.json` in every folder, so any number traces back to a job version and time.

Two derived models exist purely for reads: `trends/` (daily for 30 days, weekly for 7 weeks, monthly for
30 months) and `summaries/{date}/home-overview.json`. That's denormalization, the same move you'd make
with a materialized view.

The jobs build these paths in their storage clients (the collector through
`AnalyzerStorageClient.format_date_path`). The dashboard hand-builds its read paths from URL parameters, which is exactly where the path-traversal gap is.

Deeper: [Schema as folder layout](/posts/projects/state-of-devops/07-data-and-integration/#database-schema-and-migrations).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The shapes a developer works with:

- **Per-repo analysis file:** `repository` metadata plus `components.<name>.summary` with
  `total_checks`, `passed`, `failed`, `warnings`, and the individual check results. The API's list
  endpoint reads only the summaries of ten components (`repository_settings`, `code_review`, `branching`,
  `documentation`, `codeowners`, `secrets`, `environments`, `properties`, `pr_health`, `collaborators`).
- **Org metadata and summaries** per date, used for the org overview.
- **Trends** files per org, type and period (daily, weekly, monthly).
- **`home-overview.json`** per date for Home.

In the UI, a score is derived, not stored:

```js
const calculateScore = (components) => {
  let total = 0, passed = 0;
  Object.values(components).forEach((c) => { total += c.total_checks || 0; passed += c.passed || 0; });
  return total > 0 ? Math.round((passed / total) * 100) : 0;
};
```

The modeling lesson: store raw check results once, derive scores in one place. Today the score is
derived in both the warmer and the UI; I'd compute it once in the API so every page agrees.

</div>

</details>

<details class="project-iq" markdown="1" id="database-and-data-modeling-q3">
<summary>How were schema changes and data migrations handled?</summary>

<div class="iq-role" data-role="architect" markdown="1">

With no database there are no DDL migrations, but there is a schema: the JSON shape of each file, read
by the dashboard, the trends analyzer and the summary generator. A renamed field is a breaking change.

The approach is **never rewrite history, version the shape**:

1. The analyzer bumps its version in `metadata.json` when its output shape changes.
2. Readers that accept both shapes ship **first** (keyed on that version).
3. The analyzer writing the new shape ships second.
4. Old-shape support stays as long as old files are read, which, for trends, is a long time.

It's the expand-and-contract pattern you'd use for a zero-downtime database migration, applied to
files. To make it enforceable rather than a convention, I'd put shared Pydantic models in
`cronjobs/common/`, imported by both writer and reader, with contract tests on both sides.

The real "data migration" was moving to the central collector, where every consumer switched from its
own API calls to the shared cache without changing its output. The safe way to do that is to run old
and new side by side and diff outputs per org before cutting over.

> **TODO:** How was the central-collector switch rolled out (all at once or job by job), and did any
> numbers change?
{: .prompt-warning }

Deeper: [Database deployment strategy](/posts/projects/state-of-devops/12-cicd-and-release-management/#database-deployment-strategy).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Schema changes, in code:

- **Version in the data:** analyzers write a `metadata.json` with a version and `generated_at`.
- **Tolerant readers:** the API reads fields with `.get(..., default)` (for example
  `comp_summary.get('total_checks', 0)`), so a missing field degrades to zero instead of a `KeyError`.
  That's forgiving, but it can hide a renamed field as a silent zero.
- **Typed models as the contract:** the safer pattern is a Pydantic model per file shape, shared by the
  writer and the reader, so a renamed field fails a test:

```python
class ComponentSummary(BaseModel):
    total_checks: int = 0
    passed: int = 0
    failed: int = 0
    warnings: int = 0
```

- **Expand-and-contract:** add the new field and keep writing the old one for a release; update readers;
  then stop writing the old field. History keeps the old shape, so readers must keep handling it.

The Taskfile even has a one-off data migration (`migrate-state-of-devops-blob-to-fileshare`) from when
storage moved from Blob to Azure Files, which is the file-store equivalent of a backfill script.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Shipping a data-shape change is a release-ordering problem:

1. Release the **readers** first (dashboard, trends analyzer, summary generator) that accept old and new
   shapes.
2. Release the **writer** (the analyzer) after.
3. Never promote analyzers inside the 02:00 to 07:00 UTC window, so one night's run doesn't mix
   versions.

Because each component has its own version in `versions.yaml`, that's two promotions in order:

```bash
make release SERVICE=devops-state-dashboard          # readers first
make promote SERVICE=devops-state-dashboard VERSION=vX.Y.Z
make release SERVICE=devops-repo-analyzer BUMP=minor  # then the writer
```

After a shape change, clear the dashboard cache so old cached aggregations don't mix with new data:
`curl -X POST https://<dashboard-host>/api/cache/clear`. Redis needs no migration otherwise; keys
include the date.

</div>

</details>

<details class="project-iq" markdown="1" id="database-and-data-modeling-q4">
<summary>How do you handle data retention, backup and restore?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I split the data by **whether it can be regenerated**, because that decides everything:

| Data | Regenerate? | Retention | Backup |
|---|---|---|---|
| `github-data/` collector cache | Yes, next run | Overwritten each run | None |
| Today's analyzer outputs | Yes, rerun the job | Indefinite today | None needed for today |
| Historical daily outputs and trends | **No**, GitHub only shows current state | Indefinite | **Required** |
| New/stale and registry reports | Partly | 90 days | Optional |

The history is the one asset Git can't rebuild, and trends depend on months of it, so the share is
protected by **Azure Backup share snapshots, and a restore has been tested**. A backup you've never
restored is a hope, not a backup, so I'd keep that restore test on a schedule.

The gap I'd call out: daily outputs are kept forever with no pruning job. I'd keep trends forever and
prune raw daily outputs after the audit retention period.

> **TODO:** How long must daily outputs be kept for audits? That number sets both the pruning job
> and the snapshot retention.
{: .prompt-warning }

Deeper: [Retention](/posts/projects/state-of-devops/07-data-and-integration/#data-retention-and-deletion),
[backup](/posts/projects/state-of-devops/07-data-and-integration/#backup-and-restore-strategy).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Backup is infrastructure, so it's DevOps work:

- **Azure Backup** for the file share, with share snapshots on a daily policy and retention matching the
  audit requirement; a restore has been tested.
- **`persistentVolumeReclaimPolicy: Retain`** on the PV, so a `helm uninstall` or a deleted PVC never
  deletes the data.
- **Retention in config:** the new and stale repository reports and registry scans are kept 90 days; a
  pruning CronJob for raw daily outputs is the missing piece once the audit period is agreed.

```bash
az storage share snapshot --name <share> --account-name <storage-account>    # ad-hoc snapshot
az storage share list --account-name <storage-account> --include-snapshots -o table
```

A restore of one folder from a snapshot, then rerunning the trends analyzer for that period, is the
drill I'd repeat on a schedule.

</div>

<div class="iq-role" data-role="sre" markdown="1">

As SRE I'd frame this as **RPO and RTO for the one irreplaceable dataset**, trend history:

| Data | Lost means | Recovery | RPO / RTO I'd hold |
|---|---|---|---|
| Today's outputs | A late morning | Rerun the jobs | Not needed |
| Historical daily outputs and trends | Trends can't be rebuilt; GitHub only shows today | Restore from share snapshots | RPO 1 day, RTO a few hours |
| Redis | Slower pages | Rebuilds itself (warmer) | None |

Signals I'd alert on: a **backup missing** for more than 26 hours, and a **restore drill** overdue. And I'd
measure storage growth per month, because raw daily outputs are kept indefinitely and growth is the
slow failure mode.

```bash
kubectl exec -n state-of-devops deploy/devops-state-dashboard -- du -sh /data/devops-state/*
```

</div>

</details>

## Frontend, Backend and Database Communication
{: #frontend-backend-and-database-communication }

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q1">
<summary>How does the frontend connect to the backend?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Over HTTPS, as JSON REST calls on the **same origin**. FastAPI serves both the built React app and
`/api/*`, so the browser loads the SPA and then calls relative paths like
`/api/organizations/{org}/repositories?date=...` through one shared Axios client. Same origin means no
CORS configuration and no second ingress.

In production the path is: browser → internal DNS name → nginx ingress (TLS, SSL redirect) →
Kubernetes Service → dashboard pod. Locally, the CRA dev server on port 3000 proxies `/api` to uvicorn
on `127.0.0.1:8000`, so the frontend code uses the same relative URLs in both places.

The contract between them is the uniform domain API, which is why one page pattern works for every
tab. And the backend is **never** a proxy to the jobs: it reads their files. If every cronjob failed
tonight, the dashboard would still serve yesterday's data.

Users sign in with Entra ID through an enterprise app registration before they reach any of this, so
every API call comes from an authenticated organization account.

Deeper: [API architecture](/posts/projects/state-of-devops/05-technical-architecture/#api-and-integration-architecture),
[networking](/posts/projects/state-of-devops/11-infrastructure-and-environments/#networking-and-dns).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The wiring, end to end:

- **`api.js`** exports one object with an async function per endpoint, each using Axios and returning
  `response.data`. The base URL is `process.env.REACT_APP_API_URL || "/api"`, so in production every call
  is relative and same-origin.
- **Components call it in effects:** `const data = await api.listRepositories(org);` inside
  `loadRepositories()`, triggered by `useEffect`.
- **Query parameters** are passed as an object: `axios.get(url, { params })`, where
  `params = date ? { date } : {}`.
- **Locally**, CRA's `proxy` forwards `/api` from :3000 to :8000.
- **The backend** declares a permissive CORS middleware (`allow_origins=["*"]` with credentials). It isn't
  needed for same-origin calls, and `*` plus credentials is a combination I'd remove.

```js
const API_BASE_URL = process.env.REACT_APP_API_URL || "/api";
export const api = {
  listRepositories: async (org, date = null) => {
    const params = date ? { date } : {};
    const response = await axios.get(`${API_BASE_URL}/organizations/${org}/repositories`, { params });
    return response.data;
  },
};
```

</div>

<div class="iq-role" data-role="devops" markdown="1">

On the network:

```text
browser → internal DNS → nginx ingress (TLS, ssl-redirect, force-ssl-redirect)
        → Service (port 80) → Pod :8000 (Uvicorn serving /api and the React build)
```

- **Ingress** annotations force HTTPS; the TLS certificate is provided at the ingress, not in the app.
- **One Service, one container**: the React build ships in the API image, so there's no second
  deployment and no cross-origin traffic.
- **Locally**, a port-forward replaces the ingress.

```bash
kubectl get ingress -n state-of-devops
kubectl port-forward -n state-of-devops-dev svc/devops-state-dashboard 9001:80   # local k3d namespace
curl -s http://127.0.0.1:9001/api/health
```

What I'd add from the DevOps side: SSO at the ingress (oauth2-proxy or the ingress's external auth) so
every request is authenticated before it reaches the pod.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q2">
<summary>Trace a single user request from the browser to the data store and back.</summary>

<div class="iq-role" data-role="architect" markdown="1">

Take "show me org X's repositories on the 1st of last month":

1. **Browser:** React Router renders the repository list page; the API client calls
   `GET /api/organizations/X/repositories?date=2026-09-01`.
2. **Ingress:** nginx terminates TLS and routes to the dashboard Service and pod.
3. **FastAPI router:** validates `org` and parses `date` as a date; bad input is a 400.
4. **Cache:** checks Redis for the pre-built list, `devops-state:summary:repo-list:X:2026-09-01`. A hit
   (the normal case, since the warmer builds it) returns immediately.
5. **Storage:** on a miss, `storage_client` builds
   `/data/devops-state/repo-analysis/X/2026/09/01/<repo>.json` per repository and reads each file from
   the Azure Files mount, caching each one (1 hour for the latest date, 24 hours for older dates).
6. **Aggregate:** it builds the per-component summary for each repo and returns it, and schedules a
   background task to warm the full org list so the next request is a cache hit.
7. **Response:** JSON back through the ingress; React pages and filters the table in the browser.

A missing folder becomes "no data for this date", not an error page. Because the date is part of the
key, a new day is automatically a new cache entry. No invalidation logic is needed.

</div>

<div class="iq-role" data-role="developer" markdown="1">

The same request, as code paths:

1. `RepositoryList` mounts; `useEffect` calls `loadRepositories()`.
2. `api.listRepositories(org)` → `GET /api/organizations/X/repositories`.
3. FastAPI's `list_repositories(org, date=None)` asks `storage_client.get_latest_analysis_date(org)`
   (newest dated folder) when no date is given.
4. It checks Redis for `devops-state:summary:repo-list:X:<date>`; a hit returns a
   `RepositoryListResponse` straight away.
5. On a miss it lists the repos for that date, calls `load_analysis` for each (each cached
   individually), builds per-component summaries, and calls
   `asyncio.create_task(cache_warmer.warm_repo_summary(org, date))`.
6. The React component stores `data.repositories` in state; `calculateScore` and `getScoreBadge` derive
   the badges; `Pagination` slices ten rows.

```bash
curl -s "http://127.0.0.1:8000/api/organizations/org-a/repositories" | jq '{date: .analysis_date, total}'
```

The developer gotcha: on a cold cache, step 5 opens one file per repository, sequentially, inside an
async handler. For a large org that's the slow request, and it's why the warmer exists.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Where I'd measure that request, and what can go wrong at each hop:

| Hop | Signal | Failure |
|---|---|---|
| Ingress | Request rate, 5xx, latency | Certificate or ingress controller issue |
| API | p95 latency per route, error rate | Exceptions → 500 with `detail` |
| Redis | Hit ratio, connection errors | Cache disabled: slower, still correct |
| File share | Read latency | Slow share blocks the event loop on misses |

The key SRE insight is that **latency is bimodal**: a cache hit is milliseconds; a cold miss for a big
org reads hundreds of files. So I'd watch p95 and p99, not the average, and alert on the cache hit ratio
dropping, which predicts the latency problem before users report it.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q3">
<summary>How does the backend connect to the data store, and how are connections, timeouts and concurrency handled?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Storage.** The "connection" is a Kubernetes volume. Azure Files is mounted into the pod through a
PV/PVC (ReadWriteMany; the dashboard's is read-write today, jobs use `cron-jobs-data-pvc`). Authentication
uses Azure Workload Identity on the pod's ServiceAccount, with a credential chain (storage key, service
principal, managed identity, `DefaultAzureCredential`) for other contexts. The code sees a filesystem,
which is why k3d can use a host bind mount instead.

**Concurrency.** FastAPI is async, and the trends reads run in a thread (`asyncio.to_thread`). The
repo-analysis reads, though, use a plain `open()` inside async handlers, which blocks the event loop
on a slow share; moving them to `to_thread` (or `aiofiles`, already a dependency) is a small fix. On the write side there's no contention at all, because of the
one-writer-per-folder rule.

**Redis.** One shared client per process with connection pooling (`redis[hiredis]`), TLS in production.
Redis is outside the pods (Azure Cache for Redis), so every replica sees the same cache.

**Timeouts.** This is where I'd tighten things. The liveness probe stays dumb so a slow share doesn't
restart pods, while readiness checks that Redis is reachable and `/data` is readable. I'd also set
explicit Redis timeouts and treat a Redis failure as a cache miss, so losing the cache costs speed,
not availability.

If this were a database, the same principles apply: a pooled client per process, bounded pool size per
replica, statement timeouts, and readiness tied to the dependency.

</div>

<div class="iq-role" data-role="developer" markdown="1">

Connections in code:

- **Redis:** `redis.asyncio.Redis(host, port, password, db, decode_responses=False,
  socket_connect_timeout=5, socket_timeout=5)`, connected once at startup and pinged. If the connection
  fails, the client logs a warning and sets `self.enabled = False`, so the app keeps working without a
  cache.
- **Values** are JSON-encoded by hand and stored with `setex(key, ttl, value)`.
- **Files:** opened per request from the mounted path; no pool needed.
- **Concurrency:** handlers are `async def`. Anything blocking (file reads, JSON parsing of big files)
  should run in `asyncio.to_thread` so one slow read doesn't stall every request on the worker.

```python
self.client = await redis.Redis(host=self.redis_host, port=self.redis_port,
                                password=self.redis_password, db=self.redis_db,
                                decode_responses=False,
                                socket_connect_timeout=5, socket_timeout=5)
await self.client.ping()
```

One thing to verify: in AKS the chart points at port 6380 (Azure Cache for Redis's TLS port), but the
client passes no `ssl=True`. If production really talks to 6380, the cache may be silently disabled.

</div>

<div class="iq-role" data-role="sre" markdown="1">

From a reliability view, the connection design has one strength and one blind spot:

- **Strength:** Redis is optional. Timeouts are 5 s and a failed connect disables the cache rather than
  crashing, so a Redis outage is a performance incident, not an availability one.
- **Blind spot:** the cache disables itself **silently** for the life of the pod. Nothing alerts, and the
  health endpoint still says `healthy`. I'd export a `cache_enabled` gauge and alert when it's 0, and have
  the client retry the connection periodically instead of once at startup.

Probes today: both liveness and readiness call `/api/health`, which returns a fixed `healthy`. An init
container waits for Redis with `nc -z` before the app starts. I'd keep liveness dumb, but make readiness
check that `/data` is readable, so a pod that lost its mount stops getting traffic.

```bash
kubectl describe pod -n state-of-devops -l app.kubernetes.io/name=devops-state-dashboard | grep -A3 -i probe
kubectl logs deploy/devops-state-dashboard -n state-of-devops | grep -i "redis\|cache will be disabled"
```

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q4">
<summary>Where do you cache, and how do you keep cached data correct?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Three levels, from cheapest to most dynamic:

1. **Pre-computed files.** `devops-summary-generator` writes `home-overview.json` at 07:00 UTC, and the
   trends analyzer writes pre-aggregated series. These are caches you can't get wrong at read time.
2. **Redis memoization** of expensive aggregations, keyed by inputs: `summary:<domain>:<org>:<date>`,
   with a TTL as a safety net: 1 hour for the latest date, 24 hours for historical dates.
3. **Cache warmer**, a background loop started with the app that pre-builds repo, pipeline and infra
   summaries and lists every 30 minutes, so the first executive of the day doesn't pay for a cold cache.

Correctness is easy here because **the data only changes once a day and the date is in the key**. A new
day is a new key, so there's no invalidation problem. The one case that needs care is a job **rerun**
for today after a fix: the old aggregation could stay cached until its TTL expires. The runbook handles
that by regenerating the summary, and I'd add a small step that deletes `*:<today>` keys after a rerun.

Redis holds nothing that can't be rebuilt, so a flush only costs a slower first request. That's the
property I want from any cache.

Deeper: [Implementation](/posts/projects/state-of-devops/09-implementation/#api-and-ui-implementation).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The caching code, concretely:

| Key | Holds | TTL |
|---|---|---|
| `devops-state:{org}:{repo}:{date}:repo-analysis` | One repo's analysis file | 1 h for the latest date, 24 h for older dates |
| `devops-state:summary:repo-list:{org}:{date}` | Pre-built repo list for an org | Set by the warmer |
| `devops-state:summary:repo:{org}:{date}` (and pipeline, infra) | Org summaries | Set by the warmer |

Correctness comes from **the date in the key**: a new day's data is a new key, so no invalidation is
needed for normal operation. Historical dates never change, so they can live longer (24 h); the latest
date gets 1 h because a rerun can rewrite it.

For the exception (a rerun today), there are explicit endpoints: `POST /api/cache/clear/{org}`,
`POST /api/cache/clear/{org}/{repo}`, `POST /api/cache/invalidate` and `/api/cache/warm`, plus a
`RefreshButton` in the UI that clears the relevant cache type and reloads.

```python
ttl = 3600 if date == latest_date else 86400
await self.cache.set(cache_key, data, ttl)
```

</div>

<div class="iq-role" data-role="sre" markdown="1">

What I'd watch about the cache:

- **Hit ratio** per key family; a drop means either the warmer stopped or Redis is unreachable.
- **Warmer health:** it runs every 30 minutes; log a duration and a success timestamp, and alert if the
  last successful warm is older than an hour.
- **Memory and evictions** on Redis; evictions turn into latency.
- **Stale-after-rerun:** the runbook after rerunning a job is "regenerate the summary, then clear that
  org's cache". If people forget, the latest-date TTL caps the staleness at an hour.

The cache maintenance endpoints (`/api/cache/clear`, `/warm`, `/invalidate`) are unauthenticated
`POST`s today. From an SRE and security view they should be restricted to maintainers, because a loop
calling `clear` would push every request to the slow path.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q5">
<summary>Where did you use synchronous and where asynchronous communication, and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Synchronous:** browser → API, and API → Redis/Azure Files. A person is waiting, so it has to be a
request-response, and it's fast because it only reads pre-computed data. The API → Jira call is also
synchronous, because the user wants the story key back in the modal.

**Asynchronous, through storage:** jobs → dashboard. Jobs write files; the dashboard reads them later.
This is async communication without a broker: the share is the "queue" and the dated folder is the
"message". It gives the main benefits of async (decoupling, independent failure, retries by rerun)
without running Kafka or Service Bus.

**Asynchronous, push:** jobs → Microsoft Teams webhooks for the weekly new and stale repository
reports, fire-and-forget with retries.

**Asynchronous I/O inside the API:** `async` FastAPI handlers with an async Redis client, so one pod
serves many concurrent cache hits (file reads on a miss still need moving off the event loop).

The weak spot is ordering between jobs: it's implied by the clock (the summary at 07:00 assumes
everything else finished). If I added real async messaging, it would be completion events (or a
`_SUCCESS` marker per job) that trigger dependants, not a bus for its own sake.

Deeper: [Event and messaging contracts](/posts/projects/state-of-devops/07-data-and-integration/#event-and-messaging-contracts).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Sync and async, as a developer meets them:

- **Python `async`:** FastAPI handlers are coroutines; `await` on Redis and on `asyncio.to_thread(...)`
  lets one worker serve other requests while waiting. A plain `open()` inside an `async def` does not
  yield, which is the subtle bug to avoid.
- **Fire-and-forget:** `asyncio.create_task(cache_warmer.warm_repo_summary(org, date))` returns the
  response immediately and warms in the background. Keep a reference or log exceptions in the task,
  otherwise failures vanish.
- **Threads in jobs:** analyzers use `ThreadPoolExecutor` because the work is blocking HTTP with
  `requests`; `as_completed` collects results as they finish.
- **JavaScript async:** `async/await` in effects, `Promise.all` for parallel requests, and `.catch(() =>
  null)` to make one of them optional.

```python
with ThreadPoolExecutor(max_workers=max_concurrent) as executor:
    future_to_repo = {executor.submit(self.analyze_repository, repo, org): repo for repo in repos}
    for future in as_completed(future_to_repo):
        result = future.result()
```

</div>

</details>

## Integrations and Background Processing
{: #integrations-and-background-processing }

<details class="project-iq" markdown="1" id="integrations-and-background-processing-q1">
<summary>Which external systems does the application integrate with, and how?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| System | Direction | Protocol and auth | Used by |
|---|---|---|---|
| GitHub REST and GraphQL | Read | HTTPS, per-org GitHub App installation tokens | Collectors, analyzers |
| GitHub Enterprise API | Read | HTTPS, enterprise App | Cost analyzer (seats) |
| Container Registry, Packages API | Read | HTTPS / OCI | Registry scanners (SBOM lookups) |
| JFrog Artifactory | Read | HTTPS, access token | Cost analyzer |
| Azure Cost Management | Read | HTTPS, `azure-identity` | Cost analyzer |
| Microsoft Teams | Write | Incoming webhook | New and stale repo reports |
| Jira | Write | HTTPS, API token | Dashboard `create-story` |
| Azure Files | Read/write | SMB via PVC, Workload Identity | Everything |

Two design rules matter more than the list. First, **every integration has exactly one client** in
`cronjobs/common/` (`github_api_client`, `github_app_auth`, `fileshare_storage_client`, Jira and Teams
clients), so retries, auth and logging are written once. Second, **outbound calls live in the jobs, not
the dashboard**. The dashboard's only outbound call is Jira, so an external outage never takes the UI
down.

GitHub auth deserves a sentence: a shared `GitHubAppTokenManager` signs a JWT per org, exchanges it for
an installation token and caches it with a five-minute pre-expiry buffer.

Deeper: [External systems](/posts/projects/state-of-devops/07-data-and-integration/#external-systems-and-third-party-integrations).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Each integration has one client class in `cronjobs/common/`:

- **`GitHubAPIClient`**: a `requests` session with REST and GraphQL methods, decorated with `tenacity`
  retries, reading `X-RateLimit-Remaining` from responses.
- **`github_app_auth.py`**: signs a JWT with the App's private key, exchanges it for an installation
  token, and caches it per installation, reusing it until five minutes before expiry.
- **`github_data_reader.py`**: lets analyzers read the collector's cache instead of calling GitHub.
- **`fileshare_storage_client.py`**, **`jira_api_client.py`**, **`teams_notifier.py`**.

```python
cached = self._cache.get(installation_id)
if cached and cached.get("token") and int(cached.get("expires_at_ts", 0)) > now + 300:
    return cached["token"]           # reuse until 5 minutes before expiry
```

The collector uses **ETag conditional requests** (`If-None-Match`): a `304 Not Modified` means "use what
you stored", and it doesn't count against the rate limit. The analyzer tests check this directly, for
example `test_full_analyze_passes_using_collected_repo_details_without_live_call`.

Clients are constructed once per run and passed into analyzers, which keeps analyzers testable with
fakes.

</div>

</details>

<details class="project-iq" markdown="1" id="integrations-and-background-processing-q2">
<summary>How do you handle rate limits, retries and partial failures from external APIs?</summary>

<div class="iq-role" data-role="architect" markdown="1">

GitHub rate limits were the binding constraint of the whole system, so this got layered defences:

- **Spread the budget.** One GitHub App per org, and each installation has its own hourly limit.
- **Don't ask twice.** The central collector uses ETags; a `304 Not Modified` doesn't count against the
  limit. Other jobs read the collector's cache and only call the API for domain-specific detail.
- **Retry with backoff.** Every client uses `tenacity` with exponential backoff, because 429s and
  transient 5xx are normal.
- **Throttle explicitly** where APIs are strict: a 5-second per-repo delay in the container scanner and
  1 second between SBOM calls to stay under 100 requests per minute.
- **Limit concurrency.** The GHAS analyzer runs at most two orgs at a time (`max_concurrent_orgs: 2`).

**Partial failures** are contained by the design: each job, and each org within a job, writes its own
folder. One org failing leaves the others' data intact, and a rerun overwrites only what it rewrites.

What I'd add: a metric for rate limit remaining per App installation. When an App runs out of budget,
every job using it fails at once, so that panel is the early warning.

Deeper: [Capacity and quota planning](/posts/projects/state-of-devops/11-infrastructure-and-environments/#capacity-and-quota-planning).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The retry policy is deliberately selective:

```python
def _is_retryable_error(exc: BaseException) -> bool:
    """Retry only transient failures; never retry permanent 4xx client errors."""
    # network/timeout errors, 429 and 5xx → retry; 403, 404, 422 → don't

@retry(retry=retry_if_exception(_is_retryable_error),
       stop=stop_after_attempt(3),
       wait=wait_exponential(multiplier=1, min=4, max=10))
def _make_request(self, method, endpoint, **kwargs): ...
```

Concepts I'd explain with it:

- **Transient vs permanent errors:** a 403 or 404 won't change on retry; retrying only wastes rate
  limit and adds backoff delay.
- **Exponential backoff with a cap** (4 to 10 seconds, three attempts).
- **Rate-limit awareness:** the analyzer reads `X-RateLimit-Remaining` at start and warns below 1,000,
  suggesting fewer workers or a later run.
- **Bounded concurrency:** `max_concurrent_repos` (10) and `max_concurrent_orgs` (2) in `config.yaml`.
- **Partial failure:** each repo is a separate future; a failure increments `failed` and the run
  continues.

What I'd add: honour `Retry-After` on 429 and secondary rate limits, instead of a fixed backoff.

</div>

<div class="iq-role" data-role="sre" markdown="1">

As SRE I'd treat the GitHub rate limit as a **capacity SLI**:

- **Signal:** `X-RateLimit-Remaining` per App installation, logged at job start and end. Alert when an
  installation drops below 10% of its hourly budget during the window.
- **Failure mode:** when an App runs out, every job using it fails at once, which looks like a big
  outage but is one shared cause. The runbook is to wait for the reset (the `X-RateLimit-Reset`
  header), then rerun in schedule order.
- **Prevention:** the central collector with ETags, per-org Apps, bounded concurrency, and the 02:00 to
  07:00 UTC window, which keeps us away from working-hours usage by other tools on the same Apps.
- **Retry storms:** three attempts with backoff is a safe ceiling; I'd never allow unbounded retries
  against a rate-limited dependency.

```bash
kubectl logs job/<job> -n cronjobs | grep -i "rate limit\|requests remaining"
```

</div>

</details>

<details class="project-iq" markdown="1" id="integrations-and-background-processing-q3">
<summary>How are scheduled and background jobs designed and coordinated?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Each job is a **Kubernetes CronJob**, one per domain, built from a shared Helm library chart
(`cronjob-library`) so thirteen charts are mostly values: schedule, resources and `configYaml`. Daily
jobs run between 02:00 and 07:00 UTC, with weekly reports on weekends and Mondays.

The design properties I enforced:

- **Idempotent per day**: rerunning overwrites the same dated folder.
- **Independent**: one writer per folder, no job calls another.
- **Configurable rules**: thresholds, exemptions and toggles live in `config.yaml`, not code.
- **Dry-run mode** so Jira and Teams side effects can be switched off locally.

Coordination is the part I'd critique myself on. It's **by clock**: the summary generator at 07:00
assumes everything finished, and the trends and repo analyzers both start at 05:00, so trends can read
yesterday's repo data. Nothing enforces the order.

The fix I'd propose: each job writes a completion marker (`_SUCCESS` next to `metadata.json`), and
dependants wait for it, or a small orchestrator such as Argo Workflows runs the chain after the
collector. That turns an implicit contract into an explicit DAG.

Deeper: [Architecture reviews](/posts/projects/state-of-devops/18-continuous-improvement/#architecture-reviews).

</div>

<div class="iq-role" data-role="developer" markdown="1">

A job's code shape:

```text
devops-repo-analyzer/
├── Dockerfile, requirements.txt, config.yaml
├── src/main.py              # DevOpsRepoAnalyzer: load config → build clients → run()
├── src/*_analyzer.py        # one class per family of checks
├── src/storage_client.py    # writes <domain>/<org>/<YYYY>/<MM>/<DD>/<repo>.json
└── tests/                   # pytest, fakes for GitHub
```

- **Configuration:** `config.yaml` baked into the image, overridden by the chart's `configYaml`
  ConfigMap; secrets from environment variables.
- **Entry point:** `main()` builds the orchestrator and calls `run()`, which parses the org list,
  then processes orgs in parallel.
- **Filtering:** `_filter_repositories` and `_filter_by_update_time` skip archived or unchanged repos.
- **Logging:** `setup_logging()` from `cronjobs/common/utils.py`, with `LOG_LEVEL` from the environment.
- **Side effects behind flags:** jobs that notify (for example the stale-repository report) read
  `behavior.dry_run` from config, so a local run logs instead of posting to Teams.

```bash
cd devops-repo-analyzer && PYTHONPATH=..:src python src/main.py   # local run against real GitHub
pytest devops-repo-analyzer/tests -q
```

</div>

<div class="iq-role" data-role="devops" markdown="1">

Each job is a Kubernetes CronJob rendered from the shared library chart:

{% raw %}
```yaml
spec:
  schedule: {{ .Values.cronjob.schedule | quote }}
  concurrencyPolicy: {{ .Values.commonSettings.concurrencyPolicy | default "Forbid" }}
  successfulJobsHistoryLimit: 2
  failedJobsHistoryLimit: 2
  jobTemplate:
    spec:
      ttlSecondsAfterFinished: 3600
      template:
        metadata:
          labels:
            azure.workload.identity/use: "true"
        spec:
          restartPolicy: OnFailure
```
{% endraw %}

What each setting buys: `Forbid` stops overlapping runs; history limits keep the last two Jobs for
debugging; the TTL cleans up; the workload-identity label gives the pod an Azure token without secrets;
`OnFailure` restarts a crashed container in place.

The schedules (02:00 to 07:00 UTC daily, weekends and Mondays for weekly reports) live in each chart's
values, so changing one is a Git change reviewed in a PR.

```bash
kubectl get cronjobs -n cronjobs -o custom-columns=NAME:.metadata.name,SCHEDULE:.spec.schedule,LAST:.status.lastSuccessfulTime
kubectl create job --from=cronjob/devops-trends-analyzer manual-$(date +%s) -n cronjobs
```

</div>

</details>

## Security and Identity
{: #security-and-identity }

<details class="project-iq" markdown="1" id="security-and-identity-q1">
<summary>How do users authenticate, and how is authorization enforced?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I'd separate machine identity from people.

**Machines are in good shape.** Jobs use per-org GitHub Apps with short-lived installation tokens.
Azure access uses Workload Identity on two ServiceAccounts (`cron-jobs` and `state-of-devops`), so no
pod holds a long-lived Azure credential in the normal path. Apps have read-only permissions.

**People:** the dashboard is meant to be open to everyone in the organization, which still means
*authenticated*. Users sign in with **Entra ID through an enterprise app registration**. That's the
choice I'd defend in any internal app: the app never stores passwords, and access automatically
follows the organization's identity lifecycle (leavers lose access the day they leave), MFA and
Conditional Access policies.

**Authorization** is the next layer, and the same registration provides it: define app roles (or emit
group claims) and enforce one rule in the API, that only a DevOps or security role can call
`POST /api/jira/create-story` or see secret-scanning detail.

Why that split? Counts and pass/fail are safe to share widely; *which* repo has an exposed secret is
reconnaissance for an attacker. Reading broadly and acting narrowly is the right default for a tool like
this.

Deeper: [Authentication and authorization](/posts/projects/state-of-devops/06-security-and-privacy/#authentication-and-authorization).

</div>

<div class="iq-role" data-role="developer" markdown="1">

For a developer, today's authorization is **mostly absent in the code**, and I'd say so:

- The API has no auth dependency; every route is open to whoever reaches the ingress.
- The CORS middleware allows any origin with credentials, which I'd tighten or remove (same-origin
  doesn't need it).

If SSO sits at the ingress (oauth2-proxy), the app receives the user in a header such as
`X-Auth-Request-Email`, and authorization becomes a FastAPI dependency:

```python
from fastapi import Depends, Header, HTTPException

async def require_group(x_auth_request_groups: str = Header(default="")):
    if "devops-maintainers" not in x_auth_request_groups.split(","):
        raise HTTPException(status_code=403, detail="not allowed")

@app.post("/api/jira/create-story", dependencies=[Depends(require_group)])
async def create_jira_story(req: CreateJiraStoryRequest): ...
```

The same dependency would protect `/api/cache/*` and the dormant-users upload, the other writes. On the
frontend, I'd hide those buttons for users without the group, but the server check is the real control.

</div>

<div class="iq-role" data-role="devops" markdown="1">

The identity plumbing is DevOps work:

- **Workload identity:** pods carry the label `azure.workload.identity/use: "true"` and run as a
  ServiceAccount federated with an Azure managed identity, so Azure SDKs get tokens without secrets.
  Two ServiceAccounts: `cron-jobs` and `state-of-devops`.
- **GitHub Apps:** one per org, credentials synced from Key Vault into Kubernetes secrets named
  `github-app-<org-slug>` by External Secrets.
- **CI identity:** GitHub Actions authenticate to JFrog with **OIDC** (`id-token: write`,
  `oidc_provider_name`), so no registry password is stored, and releases re-tag with the same OIDC login.
- **People:** the place to add SSO is the nginx ingress (oauth2-proxy with Entra ID, or the ingress's
  external-auth annotations), which protects the API and UI without code changes.

```bash
kubectl get sa -n cronjobs cron-jobs -o yaml | grep -i azure.workload.identity
kubectl get externalsecrets -A
```

</div>

</details>

<details class="project-iq" markdown="1" id="security-and-identity-q2">
<summary>How are secrets and credentials managed?</summary>

<div class="iq-role" data-role="architect" markdown="1">

All secret material starts in **Azure Key Vault** and reaches pods through the **External Secrets
Operator** as Kubernetes secrets. Nothing is baked into images or committed to Git:

| Secret | Used by |
|---|---|
| `github-app-<org>` (App ID, private key, installation ID) | GitHub-facing cronjobs |
| `jira-secrets` | Dashboard Jira endpoint |
| `teams-webhook-secret` | New/stale repo notifications |
| `JFROG_ACCESS_TOKEN` | Cost analyzer |
| `azure-storage-secret` | Fallback for Azure Files auth |

Where possible there's no secret at all: Workload Identity for Azure, and GitHub OIDC for the JFrog
step that promotes release images, so the release pipeline holds no long-lived JFrog credential.
Locally, secrets come from a git-ignored setup script, never production values.

Two improvements I'd make, and I'd say them in an interview because they show judgment: remove the
storage-key fallback in production (a storage key is all-or-nothing access to the share) now that
Workload Identity works, and put rotation dates on the GitHub App keys and Jira token, tracked like
expiring certificates. The leak runbook is revoke, rotate in Key Vault, restart, review GitHub audit
logs.

Deeper: [Secrets and key management](/posts/projects/state-of-devops/06-security-and-privacy/#secrets-and-key-management).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The rule in code: **secrets only come from the environment**, never from files in the image or the repo.

- The dashboard's `Config.load()` reads `REDIS_PASSWORD`, Jira settings and the rest from environment
  variables.
- Jobs read GitHub App IDs, private keys and installation IDs from environment variables per org slug
  (`_org_auth_from_env`), and normalize the PEM key (newlines escaped in env vars are a classic bug).
- Locally, a git-ignored `.env` per cronjob, or `k3d/setup-local-secrets.sh` to create Kubernetes
  secrets in k3d.

```python
def _normalize_private_key(private_key_pem: str) -> str:
    """Normalize escaped newlines when key is provided through env vars."""
    return (private_key_pem or "").replace("\\n", "\n")

payload = {"iat": now - 60, "exp": now + 9 * 60, "iss": str(app_id)}   # JWT valid ~10 minutes
encoded = jwt.encode(payload, normalized_key, algorithm="RS256")
```

One finding I'd raise myself: the installation-token request is sent with `verify=False`, which turns off
TLS certificate checks on the call that returns a credential. It's a workaround for TLS interception and
should be replaced with the corporate CA bundle (`verify="/etc/ssl/certs/ca-certificates.crt"`).

Developer hygiene I'd insist on: never log tokens or headers, catch the JWT exchange error without
printing the key, and keep `.env` in `.gitignore` with secret scanning on the repo, so a mistake is
caught at push.

</div>

<div class="iq-role" data-role="devops" markdown="1">

The secret flow, end to end:

```text
Azure Key Vault ──(External Secrets Operator, SecretStore with workload identity)──▶
Kubernetes Secret (github-app-<org>, jira-secrets, azure-storage-secret, teams-webhook-secret)
──▶ envFrom / env in the CronJob or Deployment ──▶ process environment
```

- Rotation means updating the Key Vault value; External Secrets refreshes the Kubernetes secret on its
  interval; then restart the Deployment (CronJobs pick it up on the next run).
- **CI has no long-lived registry secret**: JFrog login is OIDC.
- **Build-time secrets**: none are needed in images; base-image CA bundles cover TLS.

```bash
kubectl get externalsecret -n cronjobs
kubectl annotate externalsecret <name> -n cronjobs force-sync=$(date +%s) --overwrite
kubectl rollout restart deploy/devops-state-dashboard -n state-of-devops
```

The DevOps improvements I'd push: drop the storage-key fallback secret now that workload identity works,
and add expiry monitoring for the GitHub App keys and the Jira token.

</div>

</details>

<details class="project-iq" markdown="1" id="security-and-identity-q3">
<summary>How is sensitive data protected, and which compliance constraints applied?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The organization works under HIPAA and PCI with regular IT audits, and the governing constraint was
**only non-PHI data**. The system reads metadata about repositories, workflows, alerts, packages and
spend. It must never copy source content, issue or PR bodies, or secret values into `/data`, even
though the APIs it calls could return them. Concretely:

- Secret scanning results are stored as counts and alert metadata, never the matched secret.
- Repository descriptions and topics are fine; nothing from inside files.
- Jira stories carry the finding, not copied repo data.

**Classification:** GHAS, enterprise and cost outputs are confidential; the rest is internal. Personal
data is limited to GitHub logins, treated as employee data.

**Protection:** TLS at the ingress and to outbound APIs, SMB 3 to Azure Files, platform encryption at
rest, and jobs write only their own folders. Two things I'd verify or tighten: the Redis client sets no
TLS flag even though the chart uses port 6380, and the dashboard's mount is read-write.

The project also *serves* compliance: the checks include organization-specific and HIPAA-driven rules,
and dated daily outputs double as audit evidence.

> **TODO:** Which HIPAA, PCI or SOC controls do the checks map to? A control-to-check table is a strong
> interview artifact.
{: .prompt-warning }

Deeper: [Privacy](/posts/projects/state-of-devops/06-security-and-privacy/#privacy-and-data-protection-requirements).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Data protection, as platform controls:

- **In transit:** HTTPS at the ingress with `ssl-redirect` and `force-ssl-redirect`; HTTPS to GitHub,
  JFrog, Jira and Azure; SMB 3 to Azure Files. Redis is the one to verify: the chart uses Azure Cache for
  Redis's TLS port, but the client doesn't set `ssl=True`.
- **At rest:** Azure Files and Redis are encrypted by the platform; secrets live in Key Vault.
- **Network:** an internal hostname only; I'd add NetworkPolicies (jobs: egress to GitHub, JFrog,
  Azure, Teams and Jira; dashboard: ingress only from the controller) and private endpoints for storage
  and Redis.
- **Supply chain:** Xray and build scans on every image, CodeQL and SonarQube in CI. The two weak spots
  are `npm config set strict-ssl false` and pip `--trusted-host` in the Dockerfile, which I'd replace with
  the right CA bundle.
- **Least privilege on storage:** mount the dashboard's volume read-only.

```bash
kubectl get networkpolicy -A
kubectl get ingress devops-state-dashboard -n state-of-devops -o yaml | grep -i ssl
```

</div>

</details>

<details class="project-iq" markdown="1" id="security-and-identity-q4">
<summary>Which threats did you design against?</summary>

<div class="iq-role" data-role="architect" markdown="1">

A lightweight STRIDE pass is enough for a system this size, and I'd walk it quickly:

| Threat | Risk here | Control |
|---|---|---|
| Spoofing | Anyone on the network reads findings or creates stories | Entra ID sign-in via an enterprise app registration |
| Tampering | A compromised job rewrites another domain's results | One writer per folder; make the dashboard mount read-only |
| Repudiation | Stories created with no record of who asked | Log the user on every create |
| Information disclosure | A list of vulnerable repos is an attacker's map | Restrict detail views; never store secret values |
| Denial of service | A runaway job exhausts the org's GitHub rate limit | Throttling, backoff, concurrency limits |
| Elevation of privilege | A leaked App key reads across an org | Read-only App permissions, keys only in Key Vault |

The one I'd spend time on is **information disclosure**, because it's specific to this product: the
dashboard's value is making gaps visible, and that's exactly what reconnaissance needs.

The other notable one is **path traversal**: org and repo names become filesystem paths, so every path
must be sanitized and checked against the data root, which the dashboard doesn't do yet. And there's the irony test: the repo must pass every
check it enforces on others (Dependabot, secret scanning, CODEOWNERS, rulesets).

Deeper: [Threat modeling](/posts/projects/state-of-devops/06-security-and-privacy/#threat-modeling).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Threats a developer controls in this code:

| Threat | Where in code | Fix |
|---|---|---|
| Path traversal | `Path(storage) / … / org / … / f"{repo}.json"` from URL params | Validate names; `resolve()` and check against the data root |
| Information leak in errors | `HTTPException(status_code=500, detail=str(e))` | Generic message to clients, details only in logs |
| Over-broad CORS | `allow_origins=["*"]`, `allow_credentials=True` | Remove, or list exact origins |
| Unauthenticated writes | Jira create, cache clear, upload | Auth dependency with a group check |
| Rendering untrusted text | Repo names, descriptions in the UI | React escapes text by default; never use `dangerouslySetInnerHTML` for API data |
| Secret values stored | Secrets analyzer | Store counts and alert metadata, never the matched secret |
| TLS verification off | `requests.post(..., verify=False)` for GitHub App tokens | Verify against the CA bundle |

```python
DATA_ROOT = Path(config["storage_path"]).resolve()
def safe_path(*parts: str) -> Path:
    p = DATA_ROOT.joinpath(*parts).resolve()
    if not p.is_relative_to(DATA_ROOT):
        raise HTTPException(status_code=400, detail="invalid path")
    return p
```

</div>

<div class="iq-role" data-role="devops" markdown="1">

Threats the platform has to cover:

- **Supply chain:** Xray and build scans on images, SonarQube and CodeQL in CI, pinned Python
  requirements, `npm ci` from a lockfile. Gaps: reusable workflows referenced by `@main` (and one by a
  feature branch), and TLS verification relaxed in the Docker build.
- **Leaked credentials:** OIDC instead of stored registry secrets in CI; Key Vault and External Secrets
  for runtime secrets; the leak runbook is revoke in GitHub or Jira, update Key Vault, force-sync,
  restart.
- **Unauthorized access:** internal-only ingress today; SSO at the ingress is the missing control.
- **Lateral movement:** NetworkPolicies so a compromised job pod can only reach the APIs it needs.
- **Runaway jobs:** `concurrencyPolicy: Forbid`, resource limits (analyzers request 200m / 512Mi, limit
  1000m / 1Gi), and bounded concurrency in config.

```bash
kubectl auth can-i --list --as=system:serviceaccount:state-of-devops:state-of-devops -n state-of-devops
```

</div>

</details>

## Performance and Scalability
{: #performance-and-scalability }

<details class="project-iq" markdown="1" id="performance-and-scalability-q1">
<summary>What load does the system handle, where are the bottlenecks, and how does it scale?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Two very different workloads:

**Jobs** process every repository in four GitHub organizations and the enterprise every night. Their
bottleneck isn't CPU or memory, it's **GitHub API rate limits** and the **schedule window**
(02:00 to 07:00 UTC). They scale by time and partitioning, not replicas: per-org Apps spread the
budget, the central collector with ETags avoids repeat calls, and heavy jobs cap concurrency. Adding an
org adds run time, so I'd track duration against the window and alert at 50% of the slot.

**Dashboard** traffic is low and spiky: an internal audience, heavier around executive reviews. Its
bottleneck would be aggregating many JSON files per request. It scales by **doing less per request**:
Home reads one pre-computed file, Redis memoizes aggregations, and the cache warmer pre-builds lists
every 30 minutes.

The known gap is that the dashboard runs as **one replica with no autoscaling**. That's more of an
availability problem than a load problem, and the fix is designed.

> **TODO:** How long does each daily job take today, and how many concurrent dashboard users are
> typical around an executive review?
{: .prompt-warning }

Deeper: [Scalability strategy](/posts/projects/state-of-devops/05-technical-architecture/#scalability-and-performance-strategy).

</div>

<div class="iq-role" data-role="sre" markdown="1">

Capacity, the SRE way:

| Resource | Today | Signal I'd watch |
|---|---|---|
| Dashboard pod | 1 replica; requests 100m / 128Mi, limits 500m / 512Mi | CPU throttling, memory near limit, p95 latency |
| Analyzer pods | Requests 200m / 512Mi, limits 1000m / 1Gi | OOMKilled, run duration |
| Job window | 02:00 to 07:00 UTC | Each job's duration vs its slot (alert at 50%) |
| GitHub API | Hourly budget per App installation | `X-RateLimit-Remaining` |
| Redis | Azure Cache for Redis | Memory, evictions, hit ratio |

The dashboard's capacity problem isn't load, it's **one replica**: every node drain or AKS upgrade is a
brief outage. The jobs' capacity problem is **time**: adding orgs adds run time, and the summary
generator at 07:00 assumes everything finished.

```bash
kubectl top pods -n state-of-devops
kubectl get jobs -n cronjobs -o custom-columns=NAME:.metadata.name,START:.status.startTime,END:.status.completionTime
```

</div>

</details>

<details class="project-iq" markdown="1" id="performance-and-scalability-q2">
<summary>How would the design change at ten times the users or data?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**10x users** is the easy one. The dashboard is stateless (cache in Redis, data on a shared file
share), so it scales horizontally: add the HPA template the chart is missing, minimum 2 and maximum
3 to start, with a PodDisruptionBudget and pods spread across nodes. I'd run a k6 or Locust test with a
cold and warm cache to size it, guard the cache warmer with a Redis lock so N pods don't warm N times,
and consider a CDN-style cache header on the static frontend.

**10x data** (say forty orgs, or the enterprise scorecard adding SRE, CloudOps and database checks)
changes more:

- **Jobs:** the 02:00 to 07:00 window won't hold. I'd partition work per org into parallel Jobs, move
  from clock scheduling to a dependency-aware workflow, and lean harder on GraphQL bulk queries and the
  central cache. Rate limits may require more App installations.
- **Storage:** daily outputs kept forever grow linearly, so retention and pruning become mandatory.
- **Queries:** at that size people will ask cross-org questions. That's when I'd load outputs into a
  queryable store (Postgres JSONB or a columnar warehouse) behind the same API.

The design holds because the boundaries (one domain per job, the API in front of storage) let each
part scale on its own.

</div>

<div class="iq-role" data-role="devops" markdown="1">

For 10x, the DevOps changes are mostly chart changes:

- **Dashboard HA:** an HPA template using the existing `autoscaling` values (min 2, max 3, CPU 70%), a
  PodDisruptionBudget (`minAvailable: 1`), `topologySpreadConstraints` across nodes, and the Deployment
  omitting `replicas:` when autoscaling is on so Argo CD doesn't fight the HPA.
- **Jobs:** split work per org into separate Jobs (an indexed Job or one CronJob per org from the library
  chart), so ten orgs run in parallel instead of in one long process.
- **Ordering:** replace clock-based ordering with completion markers or an Argo Workflows DAG.
- **Runner capacity:** CI already builds only changed components; at 10x components, larger runners or
  build caching would matter.

```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 3
  targetCPUUtilizationPercentage: 70
```

</div>

<div class="iq-role" data-role="sre" markdown="1">

At 10x I'd re-derive the SLOs before scaling anything:

- **Freshness** gets harder first: ten times the repos means ten times the API calls and run time inside
  the same window. I'd measure job duration growth per org added and plan the window before it breaks.
- **Rate limits** become the binding constraint; more App installations or GraphQL bulk queries are the
  levers.
- **Dashboard latency** depends on cache warmth; ten times the orgs means the 30-minute warmer takes
  longer, so I'd track warmer duration and alert if it approaches its interval.
- **Load test before go-live** of the scale-up: k6 against the list endpoints with a cold and a warm
  cache, to size replicas from data.

```bash
k6 run -e BASE=https://<dashboard-host> list-repos.js     # 20 virtual users, 5 minutes
```

</div>

</details>

<details class="project-iq" markdown="1" id="performance-and-scalability-q3">
<summary>How did you measure and improve performance?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The biggest performance improvements were architectural:

1. **Pre-computing Home.** The executive's first screen went from "scan every analyzer's output" to
   "read one file". That's why `devops-summary-generator` exists.
2. **The central collector.** Moving shared GitHub collection into one job with ETags made every job
   faster and cut API calls, since the others read the cache instead of calling GitHub again.
3. **Redis memoization with the date in the key**, so repeated views are cheap and invalidation is
   free.

For measurement, the targets I'd hold are Home under 1 second, analysis tabs under 3 seconds at p95
with a warm cache, and every daily job finishing inside its window. The signals I'd collect are API
latency and error rate per endpoint, Redis hit rate, Azure Files read latency, and job duration
against its schedule slot. OpenTelemetry auto-instrumentation on FastAPI would show whether a slow
request is a Redis miss or slow file reads.

The honest gap: these targets are designed, not yet baselined. I'd run a load test before tuning
anything, because guessing at bottlenecks usually optimizes the wrong thing.

Deeper: [Performance testing](/posts/projects/state-of-devops/10-quality-assurance/#performance-and-load-testing).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Code-level performance work I'd point to:

- **Pre-built lists:** the list endpoint returns a Redis list in one call; the cold path builds it and
  then warms it in the background.
- **Per-item caching with date-aware TTLs** (1 h latest, 24 h historical).
- **Offloading blocking I/O:** `asyncio.to_thread` for trend files.
- **Parallel jobs:** `ThreadPoolExecutor` with configurable workers, and the collector's ETags.
- **On the client:** `Promise.all` for parallel requests, `useMemo` for derived data.

The next improvements, with measurement first:

```python
import time, logging
t0 = time.perf_counter()
repo_list = await build_repo_list(org, date)
logging.info("repo_list built org=%s repos=%d ms=%.0f", org, len(repo_list), (time.perf_counter() - t0) * 1000)
```

then move the remaining `open()` reads into `to_thread` (or gather them concurrently), add `React.lazy`
code splitting, and debounce the search input. Profiling tools I'd use: `py-spy top` on the pod for the
API, the React Profiler in DevTools for renders.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Measuring performance as an SRE:

- **SLIs:** p50/p95/p99 latency and error rate per route from the ingress or OpenTelemetry; cache hit
  ratio; job duration per run; warmer duration.
- **Targets:** Home under 1 s, analysis lists under 3 s at p95 with a warm cache, every daily job inside
  its slot.
- **Dashboards before tuning:** a request-latency heatmap shows the bimodal hit/miss pattern clearly.
- **Tracing for the slow tail:** FastAPI OpenTelemetry auto-instrumentation shows whether a slow request
  is Redis, file reads or Python aggregation.

The honest status: the targets are defined, but the latency metrics aren't collected yet. Instrumenting
is the first task, then a baseline, then tuning.

</div>

</details>

## Reliability and Resilience
{: #reliability-and-resilience }

<details class="project-iq" markdown="1" id="reliability-and-resilience-q1">
<summary>What are the failure modes, and how does the system degrade when a part fails?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Failure | Effect | Degradation |
|---|---|---|
| One job fails | That domain has no data for today | Its tab shows "no data for today"; other tabs unaffected |
| One org fails in a job | That org's folder is missing | Other orgs' data intact |
| GitHub rate limit exhausted | Every job using that App fails | Rerun after reset; the per-App metric is the early warning |
| Redis down | Cache misses | Slower, still correct (Redis holds nothing that can't be rebuilt) |
| Azure Files unreachable | Dashboard can't read | Readiness fails, pod leaves rotation |
| Dashboard pod down | Outage (one replica today) | Fix: HPA min 2 with a PDB |
| Jira down | Story creation fails | Reading unaffected |

The design principle is **fault isolation through files**: no runtime calls between jobs, and the
dashboard never calls a job. So the worst common failure is stale data, not an outage.

That makes the dangerous failure mode a **silent** one: a wrong or missing number that looks fine. An
analyzer that failed must never look like a perfect score, which is why I care about "no data" versus
zero, `generated_at` freshness checks, and treating wrong numbers as incidents.

Deeper: [Resilience](/posts/projects/state-of-devops/05-technical-architecture/#resilience-and-disaster-recovery).

</div>

<div class="iq-role" data-role="sre" markdown="1">

Failure modes, with how I'd detect each:

| Failure | Detection | First response |
|---|---|---|
| A job failed | `kube_job_status_failed`, CronJob last success time | Logs, rerun |
| All jobs using one App failed | Rate-limit remaining near zero | Wait for reset, rerun in order |
| Data stale | `home-overview.json` not written by 08:00 UTC | Check jobs, regenerate summary |
| Redis down | Cache disabled log line; hit ratio 0 | Fix Redis; restart pod to reconnect |
| Share unreadable | 500s on reads | Check PVC and mount |
| Dashboard pod down | Probe failures, no ready pods | One replica, so this is an outage |
| Wrong numbers | Users, reconciliation checks | Hide tab via `SIDEBAR_*` flags, fix, rerun |

Two observations from the code: Redis failure **silently** disables the cache until the pod restarts,
and the health endpoint always says `healthy`, so neither shows up on probes. Those are the two gaps
I'd close first.

</div>

</details>

<details class="project-iq" markdown="1" id="reliability-and-resilience-q2">
<summary>What are the availability and recovery targets, and how are backup and disaster recovery handled?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The targets fit what the tool is, an internal business-hours reporting service:

- **Data freshness:** today's data ready by 08:00 UTC on 95% of days.
- **Dashboard availability:** 99.5% in business hours.
- **Correctness:** confirmed wrong-number reports fixed within five business days.

These SLOs are **agreed with stakeholders**. Freshness is the primary one, since that's what users
feel. If freshness misses its target in a month, reliability work goes
ahead of new checks.

**Disaster recovery** splits cleanly. Everything except data rebuilds from Git: images, Helm charts and
ArgoCD apps, so a new cluster is the go-live runbook (shared infra, collector, analyzers in schedule
order, dashboard). Today's data regenerates by rerunning jobs. The irreplaceable part is **trend
history** on the share, because GitHub only shows current state. It's protected by Azure Backup share
snapshots, and a restore has been tested. For a daily reporting tool I'd argue for an RPO of one day and
an RTO measured in hours.

> **TODO:** What RPO and RTO are formally agreed, and has the full rebuild from a fresh cluster been
> timed?
{: .prompt-warning }

Deeper: [SLOs](/posts/projects/state-of-devops/16-support-and-maintenance/#service-level-objectives).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Recovery, as infrastructure:

- **Rebuild from Git:** images in JFrog, charts in JFrog, Argo CD apps and values in the GitOps repo. A
  new cluster is the go-live runbook: shared infra, collector, analyzers in schedule order, dashboard.
- **Data:** Azure Files with Azure Backup snapshots (restore tested); the PV uses
  `persistentVolumeReclaimPolicy: Retain`.
- **Config and secrets:** Key Vault and External Secrets; nothing to restore by hand.

```bash
# first run on a new cluster, in schedule order
for j in github-data-collector devops-ghas-analyzer devops-pipeline-analyzer devops-infra-analyzer \
         devops-repo-analyzer devops-trends-analyzer devops-cost-analyzer devops-summary-generator; do
  kubectl create job --from=cronjob/$j first-$j -n cronjobs
  kubectl wait --for=condition=complete job/first-$j -n cronjobs --timeout=60m
done
kubectl rollout status deploy/devops-state-dashboard -n state-of-devops
```

Running the first day by hand avoids an empty dashboard until the next morning.

</div>

<div class="iq-role" data-role="sre" markdown="1">

The reliability targets I'd run with:

| SLO | Target | Error budget use |
|---|---|---|
| Daily data ready by 08:00 UTC | 95% of days per 30 | Misses pause new checks for reliability work |
| Dashboard available in business hours | 99.5% | Mostly spent by single-replica restarts today |
| Wrong-number reports fixed | 5 business days | Each one gets a regression fixture |

DR targets: **RPO one day** for trend history (daily snapshots) and **RTO of a few hours**, dominated by
rerunning jobs, not restoring files. The restore has been tested; I'd repeat it on a schedule and time
it, because the measured time *is* the RTO.

What uses the availability budget fastest is obvious from the chart: **one replica**. An HPA with a
minimum of two and a PDB would remove most of it.

</div>

</details>

<details class="project-iq" markdown="1" id="reliability-and-resilience-q3">
<summary>How do you make jobs and deployments safe to retry?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Jobs are idempotent per day.** Each writes to a dated folder with stable filenames, so a rerun
overwrites exactly what the failed run would have written. "Rerun it" is always a safe first move:

```bash
kubectl create job --from=cronjob/devops-repo-analyzer rerun-$(date +%s) -n cronjobs
kubectl create job --from=cronjob/devops-summary-generator resum-$(date +%s) -n cronjobs
```

Collection is incremental with ETags, so a missed day costs one run, not a backfill. Side effects
(Teams and Jira) have dry-run mode, and the Jira create path should carry an idempotency key so retries
can't duplicate stories.

**Deployments are immutable and repeatable.** Images are built once and tagged with the commit SHA; a
release re-tags that image as `vX.Y.Z`, and ArgoCD applies the declared state from the GitOps repo.
Applying the same state twice is a no-op, and rollback is promoting the previous version:

```bash
make promote SERVICE=devops-repo-analyzer VERSION=v1.0.0
```

The one rule on top: don't promote analyzers during the 02:00 to 07:00 UTC run window, or a job can run
on one version and its dependants on another.

Deeper: [Rollback](/posts/projects/state-of-devops/12-cicd-and-release-management/#rollback-and-roll-forward-procedures).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Making reruns safe is a coding discipline:

- **Deterministic output paths:** `<org>/<YYYY>/<MM>/<DD>/<repo>.json`, built from the run's UTC
  collection date, so a rerun on the same day overwrites the same file.
- **One writer per folder:** no job writes another job's folder, so reruns never collide.
- **Retry only what's safe:** `_is_retryable_error` allows network errors, 429 and 5xx, never 4xx.
- **Side effects behind `dry_run`:** notifications are skipped when `behavior.dry_run` is true, so a test
  rerun doesn't spam Teams.
- **Write, then announce:** jobs write their output before anything else reads it; the summary generator
  runs last.

One improvement I'd make: write to a temp file and `os.replace()` it into place, so a crash mid-write
never leaves a half-written JSON file for the dashboard to choke on.

```python
tmp = path.with_suffix(".json.tmp")
tmp.write_text(json.dumps(result), encoding="utf-8")
os.replace(tmp, path)          # atomic on the same filesystem
```

</div>

<div class="iq-role" data-role="devops" markdown="1">

Safe-to-retry deployments come from immutable artifacts and GitOps:

- **Build once:** CI pushes `<component>:<short-sha>`; a release re-tags that image as `vX.Y.Z` with
  `jf rt docker-promote`, no rebuild.
- **Declarative state:** Argo CD applies what the GitOps repo says; re-syncing is a no-op.
- **Rollback is a promotion:** `make promote SERVICE=<svc> VERSION=<previous>`.
- **Jobs:** `concurrencyPolicy: Forbid`, `restartPolicy: OnFailure`, and a manual rerun is
  `kubectl create job --from=cronjob/...`.
- **Approvals expire:** the release and preview approvals have 15-minute watchdogs, so a forgotten
  approval doesn't deploy hours later.

```bash
make promote SERVICE=devops-repo-analyzer VERSION=v1.0.0
argocd app sync devops-repo-analyzer && argocd app wait devops-repo-analyzer --health
```

</div>

</details>

## Testing and Quality
{: #testing-and-quality }

<details class="project-iq" markdown="1" id="testing-and-quality-q1">
<summary>What is your testing strategy across the frontend, backend and data?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The framing I'd lead with: for this system a bug usually means a **wrong number**, and nothing visibly
breaks. So the strategy is about trust in the output, not just "does it run".

| Layer | Tests |
|---|---|
| Unit | Each sub-analyzer's pass/fail logic on small hand-written repo payloads; date-path building (UTC day boundaries, ISO weeks); stale thresholds and exemption wildcards; token refresh before expiry |
| Contract | Shared Pydantic models for each output file, validated by the writer's and the reader's tests |
| Regression | Golden files: frozen collector output for a test org, run every analyzer, diff against expected |
| End to end | collector → analyzer → summary → `curl /api/home-overview` in k3d against a test org |
| Security | Path traversal on every `{org}`/`{repo}` parameter; grep `/data` for secret values |
| UAT | A domain owner checks five repos against the source system before a tab is switched on |

Every component has a `tests/` folder run in CI through SonarQube.

I'd also name the gap: the frontend has no tests yet. I'd start with the API client and the Jira
modal, since those are where a bug costs the most.

Deeper: [Quality Assurance](/posts/projects/state-of-devops/10-quality-assurance/#unit-testing).

</div>

<div class="iq-role" data-role="developer" markdown="1">

What the tests look like:

- **pytest classes with `MagicMock` fakes**, no live API. The repo analyzer tests check behaviour such as "uses
  collected repo details without a live call" and "falls back to a full GET when the cached value is
  null":

```python
def test_full_analyze_passes_using_collected_repo_details_without_live_call(self):
    client = MagicMock()
    data_reader = MagicMock()
    data_reader.read_repo_details.return_value = {"delete_branch_on_merge": True}
    analyzer = RepositoryAnalyzer(client, CONFIG, data_reader=data_reader)
    results = analyzer.analyze(_repo(None))      # cached list value is null
    assert results["checks"]["delete_branch_on_merge"]["status"] == "pass"
    client.get_repository.assert_not_called()   # answered from collected data
```

- **Shared code tests** in `cronjobs/common/tests/` (`test_path_utils.py`, `test_utils.py`).
- **Dashboard backend:** only `test_config.py` today.
- **Frontend:** none yet; CRA ships Jest and React Testing Library, so the first tests are cheap:

```jsx
render(<MemoryRouter initialEntries={["/repo-analysis/org/org-a"]}><App /></MemoryRouter>);
expect(await screen.findByText(/Repository Analysis/)).toBeInTheDocument();
```

```bash
pytest -q devops-repo-analyzer/tests cronjobs/common/tests
cd devops-state-dashboard/frontend && CI=true npm test
```

The test I'd add first for the API: FastAPI's `TestClient` with a temp `STORAGE_PATH`, asserting 404 for
an unknown org and 400 for `../`.

</div>

</details>

<details class="project-iq" markdown="1" id="testing-and-quality-q2">
<summary>How do you test integrations with external systems?</summary>

<div class="iq-role" data-role="architect" markdown="1">

With a ladder, and the rule is **use the lowest layer that answers your question**:

| Layer | Answers | Speed |
|---|---|---|
| 1. Local Python | Does the logic work against the real GitHub, Jira or JFrog APIs? | Seconds |
| 2. Local k3d | Do the image, Helm chart, config, secrets, mounts and schedule work? | Minutes |
| 3. AKS (dev cluster) | Do ExternalSecrets, ArgoCD and Azure Files work for real? | Slower |

Layer 1 runs `src/main.py` directly with dry-run on, so Jira and Teams side effects are logged instead
of sent. Unit tests use fakes (a `FakeGitHub` with a set of files) rather than live APIs.

For realistic data, a small **test GitHub org** with deliberate gaps (no CODEOWNERS, no branch
protection, an archived repo, a stale repo, a fork) means every check has a repo that fails it. Frozen
snapshots of that org's collector output make the golden-file tests deterministic.

Compatibility is part of integration testing too: pin GitHub API versions with `X-GitHub-Api-Version`,
and run the golden suite on both Python versions before a base image upgrade. And there's one contract
test worth having against Jira's create-issue shape.

Deeper: [Integration testing](/posts/projects/state-of-devops/10-quality-assurance/#integration-testing).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Testing integrations without hitting real services:

- **Fakes over mocks** for GitHub: a fake client that returns canned payloads, injected into analyzers.
- **The collector cache as a test seam:** a fake `GitHubDataReader` lets analyzer tests run entirely on
  stored data, which is also how production saves API calls.
- **Contract with the dashboard:** sample analysis files in a temp directory, read through the real
  `StorageClient`, so a renamed field fails a test instead of showing zeros.
- **HTTP-level fakes** when needed: `responses` or `requests-mock` to simulate 429 and 5xx, and assert
  `tenacity` retries three times and then gives up.

```python
@responses.activate
def test_retries_on_429_then_succeeds():
    responses.get(url, status=429)
    responses.get(url, json={"ok": True})
    assert client._make_request("GET", "/x")["ok"]
```

For the real thing, local runs against GitHub with `dry_run` on, then k3d.

</div>

<div class="iq-role" data-role="devops" markdown="1">

The environment ladder, as infrastructure:

| Layer | What runs | Command |
|---|---|---|
| Local Python | One job against real APIs, dry-run | `python src/main.py` |
| k3d | Images, charts, secrets, mounts, schedules | `task state-of-devops-deploy-local`, then `task test-state-of-devops` |
| PR preview | One component in the dev cluster as `<svc>:pr-<n>` | Approve "Review deployments" on the PR run |
| Dev AKS | The real path: ExternalSecrets, Argo CD, Azure Files | Merge and release |

`task test-state-of-devops` triggers every analyzer as a Job in k3d, which is the closest thing to an
end-to-end test today. PR previews use an Argo CD parameter override (no GitOps commit), and a teardown
workflow removes them when the PR closes.

```bash
task test-state-of-devops
kubectl get jobs -n cronjobs --sort-by=.metadata.creationTimestamp | tail
```

</div>

</details>

<details class="project-iq" markdown="1" id="testing-and-quality-q3">
<summary>Which quality gates does code pass before it merges and ships?</summary>

<div class="iq-role" data-role="architect" markdown="1">

In order, from PR to production:

1. **CI on every PR:** change detection builds only affected components; unit, contract and regression
   tests run per component in the SonarQube job; SonarQube quality gate; CodeQL on changes plus a
   weekly full scan.
2. **Code review:** CODEOWNERS gives every component a reviewer, and branch protection guards `main`.
3. **PR preview (piloted on the cost analyzer):** an approved "Review deployments" gate deploys
   `<svc>:pr-<number>` to the development cluster through an ArgoCD parameter override, with a
   15-minute watchdog that cancels unanswered approvals.
4. **Release:** a `versions.yaml` bump re-tags the tested image; nothing is rebuilt.
5. **Production:** a reviewer on the `production` GitHub environment, then the promotion PR in the
   GitOps repo.

There's also a project-specific gate I'd add to the review checklist: **"could this change move a
number on the dashboard?"** If yes, the PR includes a before/after comparison for at least one org,
because executives will notice the jump before the reviewer does.

The rule I hold to is that **gates block; they don't just report**. A gate that only reports turns
into a dashboard nobody reads, which would be ironic for this project. The merge policy on `main`:

| Check | Blocks the merge when |
|---|---|
| Tests (unit, contract, golden-file) | Any test fails |
| SonarQube quality gate (`sonar.qualitygate.wait=true`) | New bugs or vulnerabilities, unreviewed hotspots, new-code coverage under 80%, new-code duplication over 3% |
| CodeQL on the PR | A new high or critical alert |
| Review | No CODEOWNER approval, or the branch is behind `main` |

They're required status checks in a ruleset, with stale approvals dismissed on new pushes. Note the
quality gate applies to **new code**: you hold every change to the bar without blocking all work until
old debt is paid off.

Deeper: [Approval gates](/posts/projects/state-of-devops/12-cicd-and-release-management/#approval-gates).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The gates a developer meets, in order:

1. **Before pushing:** `pytest` for the component; `npm test` and `npm run build` for UI changes (CRA's
   ESLint config, `react-app`, runs during the build and fails it on errors in CI mode).
2. **On the PR:** SonarQube per changed component, which runs `tests/` for coverage
   (`test_path: "tests"`); CodeQL; the image build with Xray.
3. **Review:** CODEOWNERS; and the project-specific question, "could this change move a number on the
   dashboard?", which needs a before/after for one org.

```bash
pytest --cov=src --cov-report=term-missing devops-repo-analyzer/tests
ruff check devops-repo-analyzer
```

What I'd add as a developer: a pre-commit config (ruff, prettier, end-of-file fixers) so formatting never
reaches review, and a coverage floor on the components that compute scores.

</div>

<div class="iq-role" data-role="devops" markdown="1">

The pipeline gates, as configured:

- **Change detection** (`docker-detect-changes`), then a **matrix build** per changed component with
  `fail-fast: false`, so one broken component doesn't hide others.
- **Image build** with `xray_scan: true` and `build_scan: true`; images are pushed only on `main`
  ({% raw %}`push_image: ${{ github.ref == 'refs/heads/main' }}`{% endraw %}).
- **SonarQube** per component with its own project key; **CodeQL** on changes and weekly.
- **Approvals:** `preview-approval` and `release-approval` jobs bound to GitHub environments, each with an
  expiry watchdog after 15 minutes; `promote.yaml` uses the `production` environment.

What I'd tighten: make the Sonar and test jobs **required checks** in branch protection so they block the
merge, and pin reusable workflows to tags instead of `@main` or a feature branch.

</div>

</details>

## Infrastructure and Environments
{: #infrastructure-and-environments }

<details class="project-iq" markdown="1" id="infrastructure-and-environments-q1">
<summary>Where and how is the application hosted, and why there?</summary>

<div class="iq-role" data-role="architect" markdown="1">

On **AKS**, in two namespaces: `cronjobs` for the thirteen CronJobs and `state-of-devops` for the
dashboard Deployment.

| Resource | Production |
|---|---|
| Compute | AKS; one ArgoCD application per component |
| Images | JFrog Artifactory |
| Ingress | nginx with TLS and SSL redirect, internal hostname |
| Storage | Azure File Share: jobs through `cron-jobs-data-pvc`, dashboard through its own PVC |
| Cache | Azure Cache for Redis (port 6380) |
| Identity and secrets | Workload Identity; External Secrets from Key Vault |

Why AKS rather than, say, Azure Functions plus a static web app? Because the platform already provided
AKS with ArgoCD, External Secrets and the ingress, and CronJobs gave me scheduling for free. Functions
would have meant a second operational model, plus execution-time limits for jobs that walk four orgs.
Hosting next to the organization's other workloads also meant the DevOps team already knew how to run
it.

Sizing is modest: analyzers request `200m / 512Mi` (limit `1000m / 1Gi`), lighter jobs and the
dashboard less. The internal-only hostname fits an internal tool with security findings on it.

> **TODO:** Is production a dedicated AKS cluster or a shared platform cluster, and who owns it?
{: .prompt-warning }

Deeper: [Production environment](/posts/projects/state-of-devops/11-infrastructure-and-environments/#production-environment).

</div>

<div class="iq-role" data-role="devops" markdown="1">

The hosting, object by object:

| Need | Kubernetes / Azure resource |
|---|---|
| Run jobs | 13 `CronJob`s in `cronjobs`, from the `cronjob-library` chart |
| Run the API and UI | One `Deployment` (Uvicorn on :8000), `Service` on :80, nginx `Ingress` with forced SSL |
| Shared data | Azure Files through a CSI `PersistentVolume` + `PersistentVolumeClaim` (`ReadWriteMany`, `Retain`) |
| Cache | Azure Cache for Redis in AKS (`redis:7-alpine` Deployment locally) |
| Identity | ServiceAccounts with Azure Workload Identity |
| Secrets | `SecretStore` + `ExternalSecret` from Key Vault |
| Config | `ConfigMap` with env vars (`STORAGE_PATH`, `REDIS_HOST`, `CACHE_ENABLED`, `SIDEBAR_*`) |
| Delivery | One Argo CD application per component |

Why containers on AKS rather than Functions: jobs walk four orgs and can run for a long time, the
dashboard needs a long-running process with a cache warmer, and the platform already runs AKS, Argo CD
and External Secrets.

```bash
kubectl get all -n state-of-devops
kubectl get cronjobs -n cronjobs
```

</div>

<div class="iq-role" data-role="sre" markdown="1">

What the hosting means for reliability:

- **Single replica** for the dashboard: node drains, AKS upgrades and pod reschedules are outages of a
  minute or two. The chart has `autoscaling` values but no HPA template, and no PodDisruptionBudget.
- **Resource settings:** the dashboard requests 100m / 128Mi and is limited to 500m / 512Mi; I'd confirm
  from `kubectl top` that the warmer doesn't push it near the memory limit (OOMKilled restarts look like
  random outages).
- **Probes:** liveness and readiness both use `/api/health`, which always returns healthy, so Kubernetes
  can't detect a pod that lost its mount or its cache.
- **Init container** waiting for Redis means a Redis outage at deploy time blocks the rollout, which is
  safer than starting without a cache, but worth knowing during incidents.

```bash
kubectl get pdb,hpa -n state-of-devops
kubectl top pod -n state-of-devops
kubectl get events -n state-of-devops --sort-by=.lastTimestamp | tail
```

</div>

</details>

<details class="project-iq" markdown="1" id="infrastructure-and-environments-q2">
<summary>Which environments exist, and how close is local development to production?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Three places run the same Helm charts:

1. **Local k3d** (k3s in Docker) with a bundled registry: `k3d/create-cluster.sh`,
   `task build-state-of-devops-all`, `task state-of-devops-deploy-local`. `/data` is a host bind mount, so I
   can open last night's output with `ls` and `jq`.
2. **Development AKS**, which also hosts **PR previews**: an approved PR deploys `<svc>:pr-<n>` via an
   ArgoCD parameter override, without committing to the GitOps repo, and closing the PR removes it.
3. **Production AKS** behind ArgoCD.

There's no separate staging. For a read-only reporting tool, staging would mostly duplicate GitHub API
traffic. The one thing it would add (running a new analyzer on production-sized data) can be done
cheaper with a canary path, `/data/devops-state-canary/`, diffed against production for a few days.

**Parity** is full where it's cheap and deliberately broken where it isn't: same charts, Dockerfiles and
paths; different storage driver, secret source and ingress. The difference most likely to bite is
Redis: Azure Cache for Redis on 6380 in AKS versus a plain `redis:7-alpine` on 6379 locally, so the
TLS path only exists in the cloud, and the client code sets no TLS flag, which is worth verifying.

Deeper: [Environment parity](/posts/projects/state-of-devops/11-infrastructure-and-environments/#environment-parity).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The developer loops, fastest first:

1. **Dashboard only, hot reload:** `task local-development` starts Uvicorn with `--reload` on :8000
   (with `STORAGE_PATH` pointing at the k3d data folder) and the CRA dev server on :3000, which proxies
   `/api`.
2. **One job against real APIs:** run `src/main.py` with `PYTHONPATH` including the repo root (for
   `cronjobs.common`) and a git-ignored `.env`; notifications off via `dry_run`.
3. **Everything in k3d:** build all images, import them into the cluster, deploy, trigger every job.

```bash
task local-development
task build-state-of-devops-all && task import-state-of-devops-all
task state-of-devops-deploy-local
task test-state-of-devops                      # trigger every analyzer as a Job
kubectl port-forward -n state-of-devops-dev svc/devops-state-dashboard 9001:80
```

The parity detail a developer should know: locally `/data` is a host folder, so you can open
yesterday's analyzer output with `jq` and test the UI against real files.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Environment differences live in values files, not code:

| Aspect | Local (`values-local.yaml`) | AKS (`values.yaml` + GitOps values) |
|---|---|---|
| Cluster | k3d (`k3d/create-cluster.sh`) with a local registry | AKS |
| Images | Built locally, imported into k3d | JFrog, SHA and version tags |
| Storage | Host folder via `setup-fileshare-resources.sh` | Azure Files CSI volume |
| Secrets | `setup-local-secrets.sh` | External Secrets from Key Vault |
| Redis | `redis:7-alpine` in-cluster on 6379 | Azure Cache for Redis on 6380 |
| Ingress | traefik / port-forward | nginx with forced SSL |

Plus **PR previews** in the dev cluster, piloted on the cost analyzer: an approval on the PR run builds
`<svc>:pr-<n>` and points Argo CD at it with a parameter override; a teardown workflow removes it.

```bash
helm template devops-state-dashboard/helm -f devops-state-dashboard/helm/values-local.yaml > local.yaml
helm template devops-state-dashboard/helm -f devops-state-dashboard/helm/values.yaml > aks.yaml
diff local.yaml aks.yaml | less
```

</div>

</details>

<details class="project-iq" markdown="1" id="infrastructure-and-environments-q3">
<summary>How is the infrastructure provisioned and configured?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Kubernetes resources are fully in code**, in three Helm layers:

- `cronjob-library`: a library chart with the CronJob and ConfigMap templates every job uses.
- `cronjob-shared-infra`: the `cron-jobs` ServiceAccount, the ExternalSecrets, and the shared PVC.
- One chart per component, mostly values: schedule, resources and `configYaml`. The dashboard chart
  adds the Deployment, Service, Ingress, Redis and its Azure Files PV/PVC.

Promoted values live in a separate GitOps repo that ArgoCD watches, so the cluster's desired state is
always a Git commit.

**Configuration** follows one rule: no environment-specific values in `config.yaml`. Org lists,
thresholds and toggles are the same everywhere and baked into the image, overridable by the chart's
`configYaml`. Endpoints, identities and hostnames go in `values.yaml` (AKS) or `values-local.yaml`
(k3d), kept in sync except for cloud-only fields.

The gap I'd point out: the Azure resources underneath (storage account, Redis, Key Vault, federated
credentials) should be in Terraform too. The project's own infra analyzer checks other repos for
Terraform usage, so it should pass its own check.

> **TODO:** How are the Azure resources provisioned today: Terraform, portal, or platform team modules?
{: .prompt-warning }

Deeper: [Infrastructure as code](/posts/projects/state-of-devops/11-infrastructure-and-environments/#infrastructure-as-code).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Provisioning, layer by layer:

- **Kubernetes resources:** Helm. `cronjob-library` is a library chart (`type: library`) with a
  `_cronjob.tpl` template every job chart includes; `cronjob-shared-infra` creates the ServiceAccount,
  ExternalSecrets and the shared PVC; the dashboard chart adds Deployment, Service, Ingress, ConfigMap,
  PV/PVC, ExternalSecrets and a local Redis.
- **Promotion:** Argo CD applications per component, values in a separate GitOps repo.
- **Validation:** `helm lint` and `helm template` before merge; a `values.schema.json` would catch typos.
- **Azure resources** (storage account and share, Redis, Key Vault, managed identities, federated
  credentials) are the layer I'd move fully into Terraform, so the project's own infra analyzer would
  pass its own check.

```bash
helm dependency update devops-repo-analyzer/helm
helm lint devops-repo-analyzer/helm
helm template devops-repo-analyzer/helm | kubectl apply --dry-run=server -f -
```

</div>

</details>

## CI/CD and Deployment
{: #ci-cd-and-deployment }

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q1">
<summary>Walk me through the pipeline from commit to production.</summary>

<div class="iq-role" data-role="architect" markdown="1">

The principle is **build once, deploy many by re-tagging**.

```text
PR      ─▶ ci.yaml: detect changed components ─▶ build + test + SonarQube (matrix) ─▶ CodeQL
           (optional) approved PR preview ─▶ dev cluster as <svc>:pr-<n>
merge   ─▶ build changed images once ─▶ JFrog as <short-sha> (+ :latest) ─▶ charts published
release ─▶ versions.yaml bump ─▶ auto-release ─▶ re-tag <sha> as vX.Y.Z (no rebuild)
           ─▶ chart X.Y.Z ─▶ GitHub Release ─▶ promotion PR in GitOps repo (dev) ─▶ ArgoCD syncs dev
prod    ─▶ make promote SERVICE=<svc> VERSION=vX.Y.Z ─▶ approve `production` env
           ─▶ promotion PR (prod) ─▶ ArgoCD syncs prod
```

Change detection is what makes a thirteen-component monorepo affordable: a change in one analyzer
builds one image and one chart. Manual dispatch can force a full build, which you need after changing
`cronjobs/common/`, since every image copies it in.

Starting a release is one action: approve the post-merge release prompt, run the Version Bump workflow,
or `make release SERVICE=<svc>`. For fast iteration in the cloud, `task dev-pause` / `dev-push` pause
ArgoCD sync for one app and resume it afterwards.

What was tested is what ships, because nothing is rebuilt between dev and production.

Deeper: [Deployment automation](/posts/projects/state-of-devops/12-cicd-and-release-management/#deployment-automation).

</div>

<div class="iq-role" data-role="devops" markdown="1">

The workflows behind the pipeline:

| Workflow | Does |
|---|---|
| `ci.yaml` | On PR, push to `main` (path filters) and weekly: detect changed components → matrix build with OIDC to JFrog, Xray and build scans, push only on `main` → SonarQube per component → CodeQL → tag `latest` → Helm chart detect and package → preview and release approvals with 15-minute expiry |
| `pr-preview.yaml` / `pr-preview-teardown.yaml` | Deploy `<svc>:pr-<n>` to dev via an Argo CD override; remove it on close |
| `version-bump.yaml` / `auto-release.yaml` / `release.yaml` | Bump `versions.yaml`; re-tag `<sha>` → `vX.Y.Z` with `jf rt docker-promote`; publish chart; GitHub Release; dev promotion PR |
| `promote.yaml` | Production promotion PR, gated by the `production` environment |

```bash
gh workflow run version-bump.yaml -f service=devops-repo-analyzer -f bump=patch
make release SERVICE=devops-repo-analyzer BUMP=minor
make promote SERVICE=devops-repo-analyzer VERSION=v1.2.0
gh run watch
```

The property I'd stress: **the image that reaches production is the image CI built and scanned**;
releases only add tags.

</div>

</details>

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q2">
<summary>Which deployment strategy do you use, and how do you roll back?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**GitOps with ArgoCD**, per component. For the CronJobs, "deployment" just changes the image the next
scheduled run uses, so there's no traffic to shift. For the dashboard it's a Kubernetes rolling update.
With one replica that means a brief blip; with the planned HPA (minimum 2) and a PodDisruptionBudget
it becomes zero-downtime.

Blue-green or canary on traffic would be overkill for this audience. The canary that does matter here
is a **data canary**: run a new analyzer version writing to a separate path and diff its numbers
against production before it replaces the live job. A wrong number is worse than a slow rollout.

**Rollback** is promoting the previous immutable version:

```bash
make promote SERVICE=devops-repo-analyzer VERSION=v1.0.0
```

ArgoCD syncs it, and the next run uses it. For a bad *run* rather than a bad release, I **roll forward
on data**: fix the analyzer, rerun for the affected day (idempotent, so it overwrites the bad folder),
and put a note on the dashboard for anyone who saw the wrong number.

Deeper: [Rollback and roll-forward](/posts/projects/state-of-devops/12-cicd-and-release-management/#rollback-and-roll-forward-procedures).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Deployment mechanics:

- **CronJobs:** a deployment just changes the image in the CronJob spec; the next scheduled run uses it.
  Running Jobs finish on the old image.
- **Dashboard:** a Kubernetes rolling update of one replica, so there's a short gap. With two replicas
  and a PDB, `maxUnavailable: 0` / `maxSurge: 1` gives a zero-downtime rollout.
- **Data canary for analyzers:** run the new version in dev writing to a separate path, diff the numbers
  against production for a few days, then promote.

Rollback options, fastest first:

```bash
make promote SERVICE=devops-state-dashboard VERSION=<previous>   # the GitOps way, audited
argocd app rollback devops-state-dashboard <history-id>          # emergency, then fix Git
kubectl rollout undo deploy/devops-state-dashboard -n state-of-devops   # last resort; Argo CD will revert it
```

And for a bad **run** rather than a bad release: fix, rerun the job for the affected day, regenerate the
summary, clear the cache.

</div>

<div class="iq-role" data-role="sre" markdown="1">

From the SRE side, a deployment is a change, and changes cause most incidents:

- **Change windows:** no analyzer promotions between 02:00 and 07:00 UTC, and a measurement-change freeze
  before audits and executive reviews.
- **Verification after deploy:** `/api/health`, one list endpoint, and the next job's success. I'd make
  those a post-deploy smoke test rather than a manual check.
- **Watch for regressions:** error rate and p95 latency for an hour after a dashboard release; job
  duration and output counts after an analyzer release (a sudden drop in repos analyzed is a red flag).
- **Rollback criteria written down:** for example, error rate above 2% for 10 minutes, or an analyzer
  output count that differs by more than 10% from the previous day without a known cause.
- **Single replica:** today every dashboard deploy is a short outage; that alone justifies the HPA and
  PDB work.

</div>

</details>

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q3">
<summary>How do data and schema changes ship alongside application changes?</summary>

<div class="iq-role" data-role="architect" markdown="1">

There's no database migration step. The equivalent is a **change to an analyzer's output shape**, and
it ships in a fixed order:

1. Release the **readers** (dashboard, trends, summary) that accept both the old and new shapes, keyed
   on the version in `metadata.json`.
2. Release the **analyzer** that writes the new shape.
3. Keep old-shape support for as long as old files are read, which for trend history is a long time.

It's expand-and-contract, the same pattern I'd use for a zero-downtime relational migration (add a
nullable column, deploy code that writes both, backfill, switch reads, drop later). The difference is
that history is never rewritten, so the "contract" step may never happen for old data.

Redis needs no migration: keys include the date, and a flush only costs a slower first request.

There's a second kind of data change that people forget: a change to **what is measured** (a new check,
a threshold, a parsing fix). It ships with a release note in plain words and the date it takes effect,
so a jump on a trend chart isn't mistaken for progress. And I'd freeze measurement changes before
audits and executive reviews.

Deeper: [Database deployment strategy](/posts/projects/state-of-devops/12-cicd-and-release-management/#database-deployment-strategy).

</div>

<div class="iq-role" data-role="developer" markdown="1">

A data-shape change, as a developer ships it:

1. Change the analyzer to write the new field **and** keep the old one; bump the analyzer's output
   version in `metadata.json`.
2. Change readers (`storage_client.py`, the warmer, React components) to prefer the new field and fall
   back to the old:

```python
passed = comp_summary.get("passed_checks", comp_summary.get("passed", 0))
```

3. Add a test with a fixture file in the old shape and one in the new shape.
4. Release readers, then the writer.
5. Months later, remove the old field from the writer; keep the reader fallback while history has it.

On the frontend, the same idea: optional chaining and defaults (`summary?.component_metrics ?? {}`) so a
missing field renders as "no data", not a crash.

What I'd avoid: renaming a field in one PR across writer and readers and shipping it in one release,
because the dashboard will read yesterday's files in the old shape for as long as history exists.

</div>

<div class="iq-role" data-role="devops" markdown="1">

The release order is the deployment plan:

| Step | Component | Command |
|---|---|---|
| 1 | Readers (dashboard, trends, summary) | `make release SERVICE=devops-state-dashboard` then promote |
| 2 | Writer (analyzer) | `make release SERVICE=devops-repo-analyzer BUMP=minor` then promote, outside the run window |
| 3 | Cache | `POST /api/cache/clear` if aggregations changed |
| 4 | Verify | Rerun the analyzer for one org in dev and compare outputs |

Because every component has its own version in `versions.yaml`, the two releases are independent and
reviewable, and a rollback of the writer doesn't roll back the reader.

There's no schema migration job and no Helm hook, by design: the share is append-only history, and
compatibility is handled by readers.

</div>

</details>

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q4">
<summary>How do you manage configuration and versions across environments?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Versions:** each service has its own semantic version in `versions.yaml`, the single manifest of
"what version is what". Images are tagged `<short-sha>` on every build, `:latest` on `main`, and
`vX.Y.Z` on release; the chart version equals the release version; and a `<service>-vX.Y.Z` Git tag
plus GitHub Release marks the source commit. The GitOps repo records which version runs in dev and
prod, so "what's deployed?" is answered by Git, not by asking the cluster.

**Configuration** has three layers with clear ownership:

| Layer | Holds | Varies by environment? |
|---|---|---|
| `config.yaml` in the image | Org lists, thresholds, exemptions, toggles | No |
| `values.yaml` / `values-local.yaml` | Endpoints, identities, hostnames, resources | Yes |
| Key Vault → External Secrets | Credentials | Yes, never in Git |

Run-time switches that need no deploy (like hiding a tab) come from `/api/sidebar-config`.

The rule that keeps it sane: if a value differs per environment, it can't live in `config.yaml`. That
keeps the image identical from dev to prod.

Deeper: [Versioning](/posts/projects/state-of-devops/12-cicd-and-release-management/#versioning-and-release-notes),
[configuration](/posts/projects/state-of-devops/11-infrastructure-and-environments/#configuration-and-secret-management).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Configuration from a developer's view:

- **Job rules** live in each component's `config.yaml` (thresholds, exemptions with wildcards, enabled
  components and checks, concurrency), loaded with `yaml.safe_load` and overridable by the chart's
  `configYaml`.
- **Dashboard settings** come from environment variables in `Config.load()` (`STORAGE_PATH`,
  `CACHE_ENABLED`, `REDIS_*`, `LOG_LEVEL`, `SIDEBAR_*` feature flags).
- **Feature flags:** `SIDEBAR_APPLICATIONS=false` hides a section without a frontend release, because the
  UI asks `/api/sidebar-config` at startup.
- **Frontend build-time config:** only `REACT_APP_API_URL`, unset in production.

```python
'sidebar': {
    'devops_analysis': os.getenv('SIDEBAR_DEVOPS_ANALYSIS', 'true').lower() == 'true',
    'applications': os.getenv('SIDEBAR_APPLICATIONS', 'false').lower() == 'true',
},
```

The developer rule: no environment-specific values in `config.yaml`; endpoints, identities and hostnames
belong in Helm values.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Versions and config across environments:

- **`versions.yaml`** holds each component's release version (`components: devops-cost-analyzer: "1.0.5"`);
  a bump PR plus a `<svc>-v<version>` tag triggers the release. Which version runs in dev and prod is
  recorded in the GitOps repo's values, updated by promotion PRs.
- **Tags:** `<short-sha>` on every build, `latest` on `main`, `vX.Y.Z` on release; chart version equals
  release version.
- **Values:** `values.yaml` (AKS defaults), `values-local.yaml` (k3d), and per-environment values in the
  GitOps repo; Argo CD renders them.
- **Base images** are build args (`NODE_BASE_IMAGE`, `PYTHON_BASE_IMAGE`) so CI can pin them.

```bash
yq '.components."devops-repo-analyzer"' versions.yaml
argocd app get devops-repo-analyzer -o json | jq '.status.summary.images'
```

What I'd add: a `values.schema.json` per chart, and a CI check that fails when `values.yaml` and
`values-local.yaml` drift in keys.

</div>

</details>

## Monitoring and Observability
{: #monitoring-and-observability }

<details class="project-iq" markdown="1" id="monitoring-and-observability-q1">
<summary>How do you know the system is healthy in production?</summary>

<div class="iq-role" data-role="architect" markdown="1">

By asking the question users care about first: **did last night's jobs run, and is today's data
complete?** The dashboard can be perfectly healthy while showing yesterday's numbers, and nobody notices
until someone quotes them in a meeting. So health has three layers, in order of how often they cause
trouble:

| Layer | Healthy means |
|---|---|
| Jobs | Every CronJob's last run succeeded, inside its schedule window |
| Data | Today's folder exists per domain and org, `generated_at` is today, `home-overview.json` written after 07:00 UTC |
| Dashboard | Ready pods, latency and 5xx rate normal, Redis reachable, `/data` readable |

Kubernetes already exposes the job signals through kube-state-metrics
(`kube_cronjob_status_last_successful_time`, `kube_job_status_failed`). The data signals need a small
check, and the summary generator is the natural place for it since it reads everything anyway. It can
write a `quality` section into `home-overview.json` and show a banner on Home.

For the dashboard, `GET /api/health` backs the probes: a dumb liveness probe so a slow share doesn't
restart pods, and a readiness probe that checks Redis and the mount.

> **TODO:** Which monitoring stack covers the cluster today (Container Insights, Prometheus and Grafana,
> something else)?
{: .prompt-warning }

</div>

<div class="iq-role" data-role="devops" markdown="1">

What's deployed today for observability, and what I'd add:

- **Kubernetes state:** kube-state-metrics gives CronJob last-success times and failed Jobs; these exist
  in any AKS monitoring stack.
- **Logs:** every component logs to stdout through `logging.basicConfig` or `setup_logging()`; the
  cluster's log pipeline collects them.
- **Probes:** `/api/health` for liveness and readiness.
- **To add:** OpenTelemetry auto-instrumentation for FastAPI, a `/metrics` endpoint (Prometheus client)
  with cache hit ratio and warmer duration, and a data-freshness check written by the summary generator.

```bash
kubectl get cronjobs -n cronjobs -o custom-columns=NAME:.metadata.name,LAST_SUCCESS:.status.lastSuccessfulTime
kubectl logs -n cronjobs -l app=devops-repo-analyzer --tail=100
```

</div>

<div class="iq-role" data-role="sre" markdown="1">

My health model has three layers, checked in this order every morning:

1. **Jobs:** did every CronJob's last run succeed, inside its window?
2. **Data:** is today's folder present per domain and org, and was `home-overview.json` written after
   07:00 UTC?
3. **Dashboard:** ready pod, error rate and latency normal, cache enabled.

The middle layer matters most: the dashboard can be green while serving yesterday's numbers. I'd turn it
into one SLI, "minutes since `home-overview.json` was generated", with an alert at 08:00 UTC.

```promql
time() - kube_cronjob_status_last_successful_time{namespace="cronjobs"} > 26 * 3600
```

And I'd fix the health endpoint so readiness reflects reality (mount readable, cache state reported),
because today it always says healthy.

</div>

</details>

<details class="project-iq" markdown="1" id="monitoring-and-observability-q2">
<summary>What do you log, measure and alert on?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Logs:** every component logs through a shared `setup_logging`, which is the place to enforce JSON
lines with `component`, `org`, `run_date`, and for the API `path` and `status`. Then "everything the
repo analyzer logged about org X last night" is one query. Audit-relevant events (who created which
Jira story, deployments) follow the longer audit log policy; debug logs keep about 30 days.

**Metrics:** a CronJob × last-7-days grid, job duration against its window, data freshness per domain,
API p95 latency and error rate, Redis hit rate, and **GitHub rate limit remaining per App
installation**. That last one is the early warning for most job failures.

**Alerts**, each with an owner and a destination:

| Alert | Condition | Severity |
|---|---|---|
| Job failed | A daily CronJob's last run failed | Warning |
| Data stale | `home-overview.json` not written by 08:00 UTC | High |
| Dashboard down | No ready pods for 5 minutes | High |
| Rate limit low | An App below 10% of its hourly budget | Warning |
| Backup missing | No share snapshot in 26 hours | Warning |

It's a business-hours service, so alerts go to the DevOps Teams channel and on-call during working
hours. Nothing here justifies paging anyone at night.

Deeper: [Alerting](/posts/projects/state-of-devops/14-operations-and-observability/#alerting-and-escalation).

</div>

<div class="iq-role" data-role="developer" markdown="1">

What the code logs and what I'd add:

- **Format:** `'%(asctime)s - %(name)s - %(levelname)s - %(message)s'`, level from `LOG_LEVEL`, noisy
  Azure SDK loggers turned down to `WARNING`.
- **Useful lines already there:** cache misses and sets with TTLs (debug), "Cache will be disabled for
  this session", warnings when rate limit is below 1,000, per-org analyzed / failed / skipped counts.
- **Improvement:** structured JSON with `component`, `org`, `run_date`, `route`, `status`, `duration_ms`,
  so queries don't parse text.

```python
logger.info("repo_list_built", extra={"org": org, "date": date, "repos": len(repo_list),
                                       "cache": "miss", "ms": elapsed_ms})
```

- **Metrics in code:** `prometheus_client` counters for cache hits and misses and a histogram for route
  latency, or OpenTelemetry auto-instrumentation (`opentelemetry-instrument uvicorn ...`).
- **Never log** tokens, the Jira API token or request bodies with personal data.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Alerts I'd run, each with an owner and a destination:

| Alert | Condition | Severity |
|---|---|---|
| Job failed | A daily CronJob's last run failed | Warning, DevOps channel |
| Data stale | `home-overview.json` not written by 08:00 UTC | High |
| Dashboard down | No ready pods for 5 minutes | High, business-hours on-call |
| Cache disabled | Cache-disabled log line, or hit ratio at 0 for 15 minutes | Warning |
| Rate limit low | An App below 10% of its hourly budget | Warning |
| Backup missing | No share snapshot in 26 hours | Warning |

Rules I follow: alert on **symptoms users feel** (stale data, dashboard down) and use causes (job failed,
cache off) as tickets or warnings; every alert links to a runbook; nothing pages at night for a
business-hours tool.

</div>

</details>

<details class="project-iq" markdown="1" id="monitoring-and-observability-q3">
<summary>Walk me through how you would troubleshoot a production issue in this system.</summary>

<div class="iq-role" data-role="architect" markdown="1">

Say an executive reports "the GHAS numbers look wrong today". I'd go from symptom to source, following
the data path backwards:

1. **Contain first.** If the numbers are visibly wrong, hide or annotate the tab through
   `/api/sidebar-config` or a banner. A wrong number shown to executives costs more than downtime.
2. **Is it stale or wrong?** Check `generated_at` in that domain's `metadata.json` and today's folder:
   ```bash
   kubectl exec -n state-of-devops deploy/devops-state-dashboard -- \
     ls /data/devops-state/ghas-analysis/<org>/$(date -u +%Y/%m/%d)/
   ```
3. **If stale:** check CronJob status and logs. The usual causes are rate-limit exhaustion, an expired
   App key, or a GitHub API change.
4. **If wrong:** compare a few repos against the GitHub UI or API. Check whether a release changed the
   analyzer recently (the version in `metadata.json`), or whether it read a stale collector cache. The
   GHAS analyzer runs at 02:00 and reads the previous day's 04:00 collection.
5. **Cache?** If files are right but the UI isn't, a Redis entry from before a rerun may be stale.
6. **Fix and backfill:** fix, release, rerun for affected days (idempotent), regenerate the summary,
   then remove the note and tell the people who saw it.
7. **Prevent:** add a regression fixture so the same wrong number can't come back.

Deeper: [Incident response](/posts/projects/state-of-devops/16-support-and-maintenance/#incident-response).

</div>

<div class="iq-role" data-role="devops" markdown="1">

The commands I'd run, in order, for "the GHAS numbers look wrong today":

```bash
# 1. Did the job run, and with which image?
kubectl get jobs -n cronjobs -l app=devops-ghas-analyzer --sort-by=.metadata.creationTimestamp | tail -3
kubectl get cronjob devops-ghas-analyzer -n cronjobs -o jsonpath='{.spec.jobTemplate.spec.template.spec.containers[0].image}'

# 2. What did it log?
kubectl logs job/<latest-job> -n cronjobs | grep -iE "error|rate limit|analyzed"

# 3. What's on the share for today?
kubectl exec -n state-of-devops deploy/devops-state-dashboard -- ls /data/devops-state/ghas-analysis/<org>/$(date -u +%Y/%m/%d)

# 4. Recent releases?
argocd app history devops-ghas-analyzer

# 5. Fix forward: rerun, regenerate the summary, clear the cache
kubectl create job --from=cronjob/devops-ghas-analyzer rerun-$(date +%s) -n cronjobs
kubectl create job --from=cronjob/devops-summary-generator resum-$(date +%s) -n cronjobs
curl -X POST https://<dashboard-host>/api/cache/clear/<org>
```

</div>

<div class="iq-role" data-role="sre" markdown="1">

The incident approach, beyond the commands:

1. **Assess impact:** is it one org, one domain, or everything? Who has seen the wrong number?
2. **Contain:** hide the tab with its `SIDEBAR_*` flag (a ConfigMap change and restart), because a wrong
   number in front of executives costs more than downtime.
3. **Find the change:** a release of the analyzer, a GitHub API change, a rate-limit exhaustion, or a
   stale collector cache (the GHAS analyzer at 02:00 reads the collector's previous 04:00 run).
4. **Mitigate:** roll back the analyzer or fix forward, rerun the affected days.
5. **Recover:** regenerate the summary, clear the cache, unhide the tab, tell the people who saw it.
6. **Review:** blameless write-up, and one durable fix: a regression fixture, a plausibility check
   (repo counts shouldn't jump without cause), or an alert.

The metric I'd track over time: time from detection to the tab being hidden.

</div>

</details>

## Cost, Maintenance and Support
{: #cost-maintenance-and-support }

<details class="project-iq" markdown="1" id="cost-maintenance-and-support-q1">
<summary>What drives the cost of running the system, and how do you keep it under control?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The stack is cheap by design, and the reasons are architectural:

- **Jobs are short-lived pods** that run once a day and then release their CPU and memory. There's no
  always-on worker fleet.
- **No database** to license, size or back up as a separate service; storage is one Azure File Share.
- **Redis is a cache only**, so it can be small.
- **The dashboard is one small pod today** (two or three with the HPA).
- **It reuses the platform**: AKS, ArgoCD, JFrog and Key Vault were already paid for.

The levers I'd watch:

1. **Storage growth.** Daily outputs kept forever grow linearly; pruning raw outputs past the audit
   period, while keeping trends, is the main saving.
2. **Right-sizing jobs.** Analyzers request `200m / 512Mi`; real usage per run may allow less, or need
   more as orgs grow.
3. **API efficiency.** More reads from the central cache and GraphQL bulk queries mean fewer calls and
   shorter runs.

And one transparency point: the cost analyzer already reports GitHub, JFrog and Azure spend for the
organization, so the project's own cost should appear there as its own line.

Deeper: [Cost optimization](/posts/projects/state-of-devops/18-continuous-improvement/#cost-optimization).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Cost drivers and the knobs in the charts:

| Driver | Knob |
|---|---|
| Job pods | Requests and limits per chart (analyzers 200m / 512Mi → 1000m / 1Gi); `ttlSecondsAfterFinished: 3600` cleans up |
| Dashboard | 1 pod at 100m / 128Mi requests; 2 to 3 with an HPA |
| Storage | Azure Files capacity grows with daily outputs kept indefinitely |
| Redis | Azure Cache for Redis tier |
| CI | Change detection builds only what changed; `no_cache: true` on image builds trades speed for clean builds |

The cheapest wins: right-size job requests from actual usage (`kubectl top` during the window), add a
pruning CronJob for raw daily outputs past the audit period, and tag the project's Azure resources so its
own cost shows up in the cost analyzer it runs.

```bash
kubectl top pods -n cronjobs --containers
az storage share show --name <share> --account-name <storage-account> --query properties.quota
```

</div>

<div class="iq-role" data-role="sre" markdown="1">

Cost and reliability trade off in two places here:

- **Replicas:** going from one to two dashboard pods roughly doubles its compute cost and removes most
  of its downtime. For a business-hours tool, minimum two during the day and one at night (KEDA or a
  scheduled scaler) is a reasonable compromise.
- **Requests vs limits:** setting requests too low saves money until the scheduler packs pods onto a busy
  node and the warmer gets throttled. I'd set requests from the p95 usage, not the average.

And I'd treat **toil** as a cost: every manual rerun, cache clear or regenerate is engineer time. Turning
those runbooks into tasks, and the morning check into an alert, is cheaper than any infrastructure saving.

</div>

</details>

<details class="project-iq" markdown="1" id="cost-maintenance-and-support-q2">
<summary>How is the system maintained and supported after go-live?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The DevOps team owns it now, and support is organized around what users feel: **freshness and
correctness more than uptime**.

- **Triage once a week** with one ordering rule: correctness bugs first, then freshness, then UI. Every
  P1 (a check reporting pass for repos that fail it) gets a regression fixture before it's closed.
- **Incidents** come in three kinds with a first move each: jobs didn't run (rerun in schedule order,
  regenerate the summary); numbers are wrong (hide or annotate, fix, rerun, tell people);
  credential exposure (the leak runbook).
- **Patching:** rebuild base images monthly even with no code change, since a re-tag release reuses
  images; align every component on one Python version (it's mixed 3.11 / 3.12 today); test charts in
  k3d against the target AKS version before cluster upgrades.
- **Runbooks as tasks.** Rerun and regenerate commands should be `task` targets, in line with the
  project rule that every operation goes through the Taskfile.
- **Tech debt** is a labelled Jira epic with roughly one iteration in five spent on it.

The habit I'd highlight: any cause that recurs twice gets a design fix, not another rerun.

Deeper: [Support and maintenance](/posts/projects/state-of-devops/16-support-and-maintenance/#bug-triage).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Maintenance as routine work:

- **Images:** rebuild monthly even with no code change, so hardened base images pick up OS patches (a
  re-tag release reuses old images otherwise). Align Python versions (3.11 and 3.12 coexist today; the
  dashboard image runs 3.13).
- **Dependencies:** pinned `requirements.txt` per component and `package-lock.json`; Dependabot grouped
  updates; Xray findings triaged weekly.
- **Kubernetes and Helm:** test charts in k3d against the target AKS version before cluster upgrades;
  `kubectl convert` or `pluto` to catch deprecated APIs.
- **CI:** pin reusable workflows to tags; one currently points at a feature branch.
- **Runbooks as tasks**, so support doesn't depend on remembering commands.

```bash
pluto detect-helm -o wide
pip list --outdated
```

</div>

<div class="iq-role" data-role="sre" markdown="1">

Support with SLOs:

- **What we promise:** daily data by 08:00 UTC on 95% of days, 99.5% business-hours availability, wrong
  numbers fixed within five business days.
- **Triage order:** correctness, then freshness, then UI. Every P1 (a check passing for repos that fail
  it) gets a regression fixture before it's closed.
- **Error budget policy:** if freshness misses its target in a month, reliability work goes ahead of new
  checks.
- **Toil tracking:** count manual reruns and cache clears per month; a cause that recurs twice gets a
  design fix.
- **Reviews:** a monthly reliability review of job failures by cause, freshness misses and incidents.

</div>

</details>

## Leadership, Stakeholders and Governance
{: #leadership-stakeholders-and-governance }

<details class="project-iq" markdown="1" id="leadership-stakeholders-and-governance-q1">
<summary>How did you communicate the architecture and progress to stakeholders and executives?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The product *is* the communication. Before this project, progress was a verbal status update; after
it, progress is a number on a trend line that anyone can open. That changed the conversation with
executives from "are we doing it?" to "why did this number move?".

For different audiences I use different artifacts:

- **Executives:** the Home page and the monthly trend view. I designed Home for a two-minute weekly
  look, and I'd keep the message as "better or worse than last month, and where".
- **Engineering leadership:** per-org breakdowns and the ranked list of gaps.
- **Engineers:** the system diagram, the four-tier table, and component docs per job.

Two practices I'd call out. First, any release that changes **what is measured** gets a plain-language
note with its effective date, so a jump isn't mistaken for progress. Second, measurement changes freeze
before audits and executive reviews.

The framing I used to win support for the bigger picture: State of DevOps is the **first part** of an
enterprise-wide health scorecard covering other teams' best practices, security and compliance.

The executive sponsor is the **VP of Platform Engineering**, which matters for the next phase: the
enterprise scorecard spans every platform team, so it needs a sponsor above any one of them.

> **TODO:** Which forum reviews changes to what the scorecard measures today, and who sits in it?
{: .prompt-warning }

</div>

</details>

<details class="project-iq" markdown="1" id="leadership-stakeholders-and-governance-q2">
<summary>How do you document and govern architectural decisions?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Decisions as ADRs.** Seven decisions are worth recording, most important first: dated JSON instead of
a database, one cronjob per domain, a central collector, a pre-computed Home page, per-org GitHub Apps,
FastAPI serving the React app, and GitOps through ArgoCD. ADR-003 (central collection) is the one I'd
write out in full, because it came from experience: context, decision, and the consequence that jobs now
depend on the collector having run.

**Governance sized to the system.** Three forums are enough:

| Forum | Cadence | Decides |
|---|---|---|
| DevOps iteration review | Every 2 weeks | Backlog, releases, tech debt |
| Scorecard review with stakeholders | Monthly or quarterly | What's measured, thresholds, targets |
| Executive sponsor check-in | Quarterly | Roadmap and the enterprise phase |

The scorecard review is the one that matters: changing what's measured changes the numbers executives
watch, so it shouldn't happen in a PR with one reviewer. Technical approvals are already in the pipeline
(CODEOWNERS, environment reviewers, promotion PRs).

Docs that pay for themselves are short and specific: `cronjobs.md`, `storage.md`, `deployment.md`, and
the Taskfile, which is documentation by being executable.

> **TODO:** Are ADRs kept anywhere today, for example `docs/adr/` in the repo?
{: .prompt-warning }

Deeper: [Governance](/posts/projects/state-of-devops/17-governance-and-compliance/#project-governance).

</div>

</details>

<details class="project-iq" markdown="1" id="leadership-stakeholders-and-governance-q3">
<summary>How did you bring other engineers onto the project?</summary>

<div class="iq-role" data-role="architect" markdown="1">

After 8 to 10 months as a solo build, the DevOps team started contributing. The risk I planned for from
the start was "one person knows everything", and the mitigations were built in rather than written at
the end:

- **One folder shape per cronjob**, so knowing one component means knowing all thirteen.
- **A Taskfile for every operation.** A new contributor's first day is `k3d/create-cluster.sh`,
  `task build-state-of-devops-all`, `task state-of-devops-deploy-local`, open the dashboard, then read
  `architecture.md` and `cronjobs.md`.
- **A testing ladder** (local Python, k3d, AKS) with worked examples, so people can test safely.
- **CODEOWNERS** giving every component a reviewer, so ownership spreads instead of routing through me.
- **Instructions for AI coding agents** (`AGENTS.md`, Copilot instructions, prompts and skills), which
  double as living documentation, because an agent fails loudly when they're out of date.

What I'd add: a "how to add an analyzer" guide, since it's the most common task and the easiest one to
get subtly wrong, and a 45-minute session where we add a check live, from sub-analyzer to tab.

The result I'd quote: when the DevOps team joined, a new member made their **first merged change in
2 days**. Time to first merged change is the measure I trust most for onboarding, because it tests the
docs, the local setup and the review path all at once.

Deeper: [Onboarding](/posts/projects/state-of-devops/15-documentation-and-knowledge-transfer/#onboarding-documentation).

</div>

<div class="iq-role" data-role="developer" markdown="1">

What made the codebase approachable for the DevOps team when they joined:

- **One shape per job** (`src/main.py`, analyzers, `storage_client.py`, `config.yaml`, `tests/`, `helm/`):
  learn one, know all thirteen.
- **Shared clients in `cronjobs/common/`** with docstrings that explain *why* (for example, why 4xx
  errors are never retried).
- **Tests that document behaviour**, such as the repo analyzer tests named after the rule they prove
  (`test_null_cached_value_falls_back_to_full_repo_get_and_passes`).
- **A Taskfile for every command**, so nobody has to reverse-engineer a deploy.
- **A runnable local stack** in k3d with real data folders.

What I'd improve for the next developer: split the dashboard's 2,000-line `main.py` into routers per
domain, add API tests with `TestClient`, add the first frontend tests, and write the "how to add a check"
guide as a worked example with one real sub-analyzer.

```bash
task --list | grep -i state-of-devops
```

</div>

</details>

## Lessons Learned and Trade-offs
{: #lessons-learned-and-trade-offs }

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q1">
<summary>What was the hardest technical problem, and how did you solve it?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Collecting data from four GitHub organizations every night **within API rate limits**, without the jobs
stepping on each other.

At first every cronjob collected its own GitHub data, and much of it was the same: repository lists and
metadata. The duplicated calls burned rate limit and run time, and the same collection logic lived in
several jobs. As analyzers multiplied, the budget became the bottleneck for the whole system.

The solution had several parts:

1. **Centralize collection.** One job, `github-data-collector`, fetches the shared repository data for
   every org into `/data/github-data/`, using ETags so unchanged data returns `304 Not Modified` and
   doesn't count against the limit.
2. **Make other jobs read the cache first** and call the API only for the detail their domain needs.
3. **Spread the budget** across per-org GitHub Apps, with `tenacity` backoff and explicit throttling
   where APIs are strict.

The result: less redundant traffic, faster jobs, and collection logic in one place.

The trade-off it introduced is the lesson I'd add: jobs now **depend on the collector having run**, and
the clock-based schedule doesn't enforce that. Solving one coupling problem created an ordering one,
which is why dependency-based scheduling is first on my list.

Deeper: [ADR-003](/posts/projects/state-of-devops/05-technical-architecture/#architectural-decision-records).

</div>

<div class="iq-role" data-role="developer" markdown="1">

In code, the central-collector change looked like this: analyzers stopped asking GitHub for data the
collector already had, and only fall back to a live call when the cached value can't answer the question.

The repo analyzer tests capture the subtle part. The org repository **list** endpoint the collector uses
doesn't populate `delete_branch_on_merge` (it's `null`); only the full repository endpoint does. So the
analyzer reads the collected repo details first, and falls back to a full `GET` only when the value isn't
a real boolean:

```python
def test_null_cached_value_falls_back_to_full_repo_get_and_passes(self): ...
def test_full_analyze_passes_using_collected_repo_details_without_live_call(self): ...
```

The developer lesson: **cached data has gaps that look like valid values**. `null` is not `false`.
Every place that reads from a cache needs a rule for "unknown", or a check silently passes or fails on
missing data, which is exactly the wrong-number bug this product can't afford.

</div>

</details>

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q2">
<summary>What would you do differently if you started again?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The project's own retrospective, as I'd say it:

| Would change | Instead |
|---|---|
| Shared collection came as a refactor | Build the central collector **first** |
| Jobs ordered by clock | Completion markers and dependency-aware triggers from day one |
| One dashboard replica for too long | HPA with minimum 2 and a PDB at go-live |
| File contracts by convention | Shared Pydantic models for every output, tested on both sides |
| Docs drifted (CRA vs Vite) | Docs reviewed in the same PR as code |
| CRA for the frontend | Vite from the start |

And what I'd keep exactly the same, because it's what made a solo build possible: files on a share
(simple, debuggable, cheap), one folder shape per job, everything as a task, build once and release by
re-tagging, and a pre-computed Home page.

The broader lesson I'd share: **look for what's repeated, centralize it, and keep the specialized parts
small.** It's the pattern behind the collector, the shared clients, the Helm library chart, and the plan
for the enterprise scorecard.

Deeper: [Retrospectives](/posts/projects/state-of-devops/18-continuous-improvement/#retrospectives).

</div>

<div class="iq-role" data-role="developer" markdown="1">

What I'd do differently in the code:

| Would change | Instead |
|---|---|
| A 2,000-line `main.py` | `APIRouter` per domain from the start |
| Paths built from raw URL parameters | One `safe_path()` helper and validated names |
| `open()` inside async handlers | `asyncio.to_thread` or `aiofiles` everywhere |
| `detail=str(e)` in 500s | An exception handler with generic messages |
| Cache silently disabled on connect failure | Reconnect with backoff and a metric |
| `verify=False` on the token request | The CA bundle |
| Client-side pagination | Server-side `page`/`limit` once lists grow |
| Create React App | Vite |
| No frontend or API tests | `TestClient` and React Testing Library from day one |

What I'd keep: shared clients with selective retries, sub-analyzers as small classes, Pydantic response
models, date-keyed caching, and tests named after the rule they prove.

</div>

<div class="iq-role" data-role="devops" markdown="1">

DevOps changes I'd make on a restart:

- **HA from day one:** HPA (min 2), PDB and topology spread in the dashboard chart.
- **Real probes:** readiness that checks the mount and reports cache state.
- **Read-only data mount** for the dashboard, with uploads in their own path.
- **No TLS shortcuts in builds:** the right CA bundle instead of `strict-ssl false` and `--trusted-host`.
- **Pinned reusable workflows** and required status checks from the first PR.
- **Azure resources in Terraform** alongside the Helm charts.
- **Dependency-based scheduling** (completion markers or Argo Workflows) instead of clock order.

What I'd keep: the library chart, build once and re-tag, OIDC to the registry, GitOps promotions through
PRs, PR previews with expiring approvals, and a Taskfile for everything.

</div>

</details>

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q3">
<summary>What technical debt exists today, and how would you pay it down?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The debt is known and listable, which is the best kind:

| Debt | Why it matters | Paydown |
|---|---|---|
| Dashboard is 1 replica; `autoscaling` values exist but no HPA template | No redundancy during node drains or upgrades | HPA + PDB, min 2, omit `replicas:` when enabled, spread across nodes |
| Jobs ordered by clock | Trends can read yesterday's repo data | Completion markers, then an orchestrator |
| No pruning of daily outputs | Storage grows forever | Retention agreed with audit, pruning job |
| Create React App unmaintained | Build tooling ages out | Vite migration |
| Storage key fallback in production | Broad credential that isn't needed | Workload Identity only |
| Docs drifted (CRA vs Vite) | Wrong instructions for contributors | Docs in the same PR as code |
| No frontend tests | UI regressions undetected | Start with API client and Jira modal |

How I'd pay it: keep it as a labelled Jira epic, spend roughly one iteration in five on it, and order
by **risk to trust in the numbers** first (scheduling, contracts), then availability (HPA), then
tooling (Vite). Debt that can produce a wrong number beats debt that's just inconvenient.

Deeper: [Technical debt tracking](/posts/projects/state-of-devops/09-implementation/#technical-debt-tracking).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The code-level debt, as found in the repository:

| Debt | Where | Fix |
|---|---|---|
| Path traversal possible | Dashboard read endpoints | Name validation + `safe_path()` |
| Blocking file reads in async code | `storage_client._load_analysis_local` | `asyncio.to_thread` |
| Monolithic `main.py` | ~2,000 lines, ~57 routes | Routers per domain |
| TLS verification off | GitHub App token request | CA bundle |
| Permissive CORS with credentials | `CORSMiddleware(allow_origins=["*"])` | Remove |
| Internal errors in responses | `HTTPException(500, detail=str(e))` | Generic errors |
| Deprecated startup hooks | `@app.on_event` | `lifespan` |
| A leftover `*.old.js` component | `ComplianceOrganizationList.old.js` | Delete |
| Sidebar sync by polling | `setInterval` every 300 ms in `App.js` | Context |
| Few tests | Dashboard backend and frontend | `TestClient`, Testing Library |

I'd pay it down security first (paths, TLS, CORS, errors), then correctness and performance (blocking
reads), then structure (routers), within the one-iteration-in-five debt budget.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Platform-level debt:

| Debt | Fix |
|---|---|
| Dashboard single replica; `autoscaling` values unused | HPA + PDB templates |
| Probes always healthy | Readiness checks mount and cache |
| Dashboard volume mounted read-write | `readOnly: true`, separate upload path |
| `npm strict-ssl false`, pip `--trusted-host` in the Dockerfile | CA bundle in the build stage |
| Reusable workflows on `@main` and a feature branch | Pin to tags or SHAs |
| Redis client without TLS flag vs port 6380 | Verify and set `ssl=True` |
| Storage-key fallback secret | Workload identity only |
| No pruning of daily outputs | Retention CronJob |
| Mixed Python versions (3.11, 3.12, 3.13) | Align base images |

Order: anything that weakens security or hides failure first (TLS shortcuts, probes, read-write mount),
then availability (HPA), then hygiene.

</div>

</details>

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q4">
<summary>Where does the system go next, and how does the architecture support that?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Next is the reason the project has its current shape: an **enterprise health scorecard**. The plan is
to map the best practices of other teams (SRE, CloudOps, platform architecture, database and more)
against the actual infrastructure, and derive a score and progress card for the health of the enterprise
infrastructure, covering best practices, security and compliance.

The architecture supports it because **a new domain is additive**: a new cronjob folder, a new data
folder, a new tab. Nothing existing changes. To get there I'd add:

1. **A generic analyzer interface**, so every team's checks plug in the same way.
2. **Typed file contracts**, so many writers can't silently break readers.
3. **Dependency-based scheduling**, because more domains mean more ordering.
4. A **queryable store** behind the API once cross-team questions appear.

What State of DevOps teaches that phase: start with checks people already argue about; centralize
collection before multiplying analyzers; show a trend, not just a grade, and make every score break
down to the check that moved it; and give every check a fix path and a Jira button, or it's just a list
of complaints.

> **TODO:** Which team's best practices will the scorecard onboard first, and who owns the scoring model?
{: .prompt-warning }

Deeper: [Roadmap refinement](/posts/projects/state-of-devops/18-continuous-improvement/#roadmap-refinement).

</div>

</details>

{% include project-nav.html %}
