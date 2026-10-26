---
layout: post
title: "Job Hunter Agent: Interview Questions"
date: 2026-10-22 00:30:00 +0530
categories: [projects, job-hunter-agent]
tags: [Projects, Job Hunter Agent, Interview Prep, Architecture]
description: "Interview answers from architect, developer, DevOps and SRE angles, drawn from building an AI job-application agent with a manual approval gate."
project: job-hunter-agent
project_interview: true
image:
  path: /assets/img/projects/job-hunter-agent/interview-questions.webp
  alt: "Job Hunter Agent: Interview Questions - Projects hero image"
---

Use this page to rehearse talking about Job Hunter Agent in architect, developer, DevOps and SRE
interviews. Every answer is drawn from the playbook and the code; pick the role tab you're interviewing
for, or use "Answer as" to switch them all. Where an interviewer would want a number I don't have yet,
the answer says so.

*"I built a self-hosted AI agent that finds jobs on LinkedIn, scores them against my resume and drafts a
tailored resume and cover letter for each, with a deterministic check that blocks any claim my resume
doesn't support, and nothing goes out without my approval."*

<!-- more -->

{% include project-nav.html %}

{% include project-iq-roles.html %}

## Project Overview and Your Role
{: #project-overview-and-your-role }

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q1">
<summary>Walk me through a frontend or backend application you designed and built end to end.</summary>

<div class="iq-role" data-role="architect" markdown="1">

Job Hunter Agent is a FastAPI backend with a plain HTML/JS review UI, six LLM agents, Supabase for
storage and a LinkedIn browser in a sidecar, running in one pod on my homelab's Kubernetes platform.

The flow: a search profile's schedule fires; the app asks the LinkedIn MCP sidecar for new postings;
it filters duplicates, excluded companies and reposts; the scorer rates each against my resume; above 75
it researches the company, tailors my resume as line edits, writes a cover letter and suggests contacts;
deterministic checks flag anything invented; the draft waits in a review queue for me.

The trade-off I'd lead with: I traded autonomy for trust. The articles I started from auto-applied.
Mine can't, by design: no code path submits, and the LinkedIn client refuses any tool that isn't
read-only.

Deeper: [System context](/posts/projects/job-hunter-agent/05-technical-architecture/#system-context-and-component-architecture),
[Business problem](/posts/projects/job-hunter-agent/01-vision-and-business-context/#business-problem-and-opportunity)

</div>

<div class="iq-role" data-role="developer" markdown="1">

The backend is Python 3.12, FastAPI on Uvicorn, Pydantic v2 everywhere.

- **Routing:** one `APIRouter` in `api/routes.py`; path params like `/jobs/{job_id}/evaluate`.
- **Pydantic:** request bodies (`ProfileIn`) and every LLM output (`JobScore`, `ResumeEdits`) are models;
  the same model is the JSON schema the model must follow.
- **Async:** everything that waits (LLM, MCP, Supabase through `asyncio.to_thread`) is `async`.
- **Dependency injection:** `S = Annotated[AppState, Depends(state)]` hands each route the repo,
  pipeline and scheduler.
- **Lifespan:** starts the per-profile scheduler and shuts it down.

```python
@router.post("/jobs/{job_id}/evaluate", tags=["jobs"])
async def evaluate_job(job_id: str, s: S) -> dict:
    job = await get_or_404(s.repo, m.Job, job_id)
    _llm(s)  # 503 early if the gateway key is missing
    ...
```

```bash
make dev     # uvicorn --reload, in-memory storage
make test    # pytest with fakes
make lint
```

Gap: the UI has no automated tests; it's checked with headless screenshots.

</div>

<div class="iq-role" data-role="devops" markdown="1">

It ships as one image built by the platform's reusable workflow and runs as one pod with two containers.

- **Dockerfile:** base images pinned by digest, `uv sync --frozen --no-dev`, runs as UID 10001 with a
  read-only root filesystem.
- **Pipeline:** tests and a Supabase integration test on GitHub runners; on `main`, seven security gates,
  build, Trivy, SBOM, push to Zot, cosign signing, then the digest committed to homelab-gitops.
- **GitOps:** Argo CD syncs `apps/job-hunter`; Kyverno only admits signed, pinned images.
- **Pod:** `app` plus a `linkedin` sidecar (Chromium) on loopback, `Recreate` because one browser
  profile can have one writer, a PVC for the session.

```bash
kubectl --context k3d-platform -n job-hunter get pods
kubectl --context k3d-platform -n job-hunter rollout status deploy/job-hunter
kubectl --context k3d-platform -n argocd get application job-hunter
```

Gap: the sidecar's memory was undersized at first (OOMKilled at 2 GiB) and only showed up on a real search.

</div>

</details>

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q2">
<summary>What business problem did it solve, and how did you know it was working?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The problem was the cost of a *good* application: reading postings that don't fit, then an hour of
tailoring for the ones that do. The agent does the reading and the first drafts; I do the judging.

How I know it's working, honestly: the app records found, new, analyzed and drafted per run, and the
approve/reject ratio of drafts. In the first days it found real postings across three profiles and every
draft that tried to invent a skill was flagged before approval. The baseline I have is for effort, not
outcomes: by hand, I'd read 10 to 15 postings a day to apply for 2 to 4. The agent has to match that with
less reading. There's no interview count yet, so the business case is about time, not results.

The leading indicator I watch is the approve rate: low means the profiles are too broad or the threshold
too low.

Deeper: [Success metrics](/posts/projects/job-hunter-agent/01-vision-and-business-context/#success-metrics-and-business-kpis)

</div>

</details>

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q3">
<summary>What was your role, and which architectural decisions did you own?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I owned everything: it's a personal project, built with an AI coding assistant over two days and then
extended from my own use. The decisions I'd defend in a review:

| Decision | Why |
|---|---|
| Manual approval only | An auto-sent bad application can't be unsent |
| Local LLM via LiteLLM | My resume stays home |
| Line edits, not rewrites | A 28k-character rewrite timed out and drifted from facts |
| Deterministic truthfulness checks | The model will add tools the posting asks for |
| LinkedIn through a read-only MCP sidecar | No official API; the allow-list makes misuse impossible |
| One scheduled job per profile | Spreads LinkedIn traffic through the day |

Deeper: [Architectural decision records](/posts/projects/job-hunter-agent/05-technical-architecture/#architectural-decision-records)

</div>

<div class="iq-role" data-role="developer" markdown="1">

I wrote (with an AI assistant, reviewing every diff) the pipeline, the agents, the checks and the UI.
The pieces I'd talk through:

- **`apply_edits`:** applies a model's line edits only where the original line matches exactly once.
- **`truthfulness.py`:** pure functions; posting terms the output adds that the resume lacks.
- **`runs.track`:** wraps any long operation, records it, calls a finish hook (Slack).
- **`ProfileScheduler`:** one APScheduler job per profile, re-synced on profile changes, with a lock.

```python
report = await track(repo, user_id, "scheduled", "full", [profile.name], work, self.on_finish)
```

```bash
uv run pytest -q
uv run ruff check . && uv run ruff format --check .
```

Gap: `accept_warnings` isn't persisted on the application, so I can't later prove which approvals
overrode a flag.

</div>

<div class="iq-role" data-role="devops" markdown="1">

I owned the deployment end to end across three repos: the Keycloak client and the OpenBao secrets
script in infra-local, the Argo CD app in homelab-gitops, and the CI wiring in the app repo.

- **Secrets:** `configure.sh` fills `kv/platform/job-hunter` silently; one ExternalSecret maps it to env.
- **Networking:** Ingress with Let's Encrypt; NetworkPolicy admits only Traefik on 8000.
- **Sign-in to LinkedIn:** an exec-based procedure in the running sidecar.
- **Slack:** the alerts channel's webhook copied between OpenBao paths.

```bash
host/job-hunter/configure.sh            # secrets, nothing printed
kubectl -n job-hunter annotate externalsecret job-hunter force-sync=$(date +%s) --overwrite
kubectl -n job-hunter rollout restart deploy/job-hunter   # env from Secrets is read at start
```

Gap: cert-manager first failed DNS-01 because of split DNS; it needed public resolvers.

</div>

</details>

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q4">
<summary>Who were the users and stakeholders, and how did their needs shape the design?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The only user is me, so I designed for one real persona rather than a market: a senior architect who
wants a short queue to review in the evening, with a long master resume and two derived ones.

That shaped three things. The UI is a review tool, not a dashboard: skills and confidence first, drafts
collapsed. Profiles carry their own resume, mode and tone, because I apply for three kinds of role. And
the approval gate is absolute, because the stakeholders who matter most, recruiters and hiring managers,
never see the agent, only what I send them.

LinkedIn is an indirect stakeholder: its terms and rate limits set the volume rules (5 postings per
keyword, one run per profile per weekday, hours apart).

Deeper: [Stakeholders](/posts/projects/job-hunter-agent/01-vision-and-business-context/#stakeholders-sponsors-and-decision-makers),
[Target users](/posts/projects/job-hunter-agent/01-vision-and-business-context/#target-users-and-personas)

</div>

</details>

## System Design and Architecture
{: #system-design-and-architecture }

<details class="project-iq" markdown="1" id="system-design-and-architecture-q1">
<summary>If you had to design this application from scratch on a whiteboard, with a frontend, a backend and a data store, how would you approach it?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I'd start from the constraints, not the boxes: no job-search API, a model that will fabricate, one user,
and a website that bans bots. Then:

1. **Data store first:** profiles, resumes, jobs, scores, drafts, applications, runs. Postgres.
2. **Backend:** an API plus a pipeline (discover → score → draft → review), agents behind one interface,
   and a scheduler.
3. **Frontend:** a review queue, a jobs list, setup. Server-rendered or static; it's one user.
4. **Integrations at the edge**, each behind an interface: LinkedIn, the LLM, company facts, Slack.
5. **Safety in the middle:** deterministic checks between the model and the review queue, and no
   outbound action at all.

The whiteboard version matches what I built, which I'd say is the point: it's one deployable unit with
clear seams, not a distributed system.

Deeper: [System context](/posts/projects/job-hunter-agent/05-technical-architecture/#system-context-and-component-architecture)

</div>

<div class="iq-role" data-role="developer" markdown="1">

On a whiteboard I'd draw the seams as Python interfaces, because that's what made it testable:

- `Repository`: `insert / update / get / list / delete`; memory and Supabase implement it.
- `LLM`: `structured(system, user, schema)`.
- `JobSource`: `search(keywords, location, user_id, known_ids)`.
- `CompanyIntel` and `CompanyFactsSource`: company page, people, apply link; Wikidata and news.

```python
class Repository(Protocol):
    async def insert(self, record: T) -> T: ...
    async def list(self, model: type[T], **filters: Any) -> list[T]: ...
```

The pipeline only talks to these, so tests pass fakes and nothing else changes.

```bash
make test   # every interface faked
```

Gap: the Supabase repository filters by equality only; anything richer means a new method.

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q2">
<summary>What are the main components, and how are responsibilities split between them?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Component | Responsibility |
|---|---|
| FastAPI app | API, static UI, auth, scheduler |
| Pipeline | Discover, score and draft, evaluate one job, status transitions |
| Agents | One LLM task each: score, tailor, letter, job facts, research, contacts |
| Truthfulness checks | Deterministic, between the agents and the queue |
| LinkedIn MCP sidecar | The only thing that touches LinkedIn |
| Supabase | State |
| LiteLLM | The only path to the model |

The split I care about is decision vs. generation: agents generate, code decides (apply edits, flag
claims, enforce status transitions), and I approve.

Deeper: [Technical Architecture](/posts/projects/job-hunter-agent/05-technical-architecture/#system-context-and-component-architecture)

</div>

<div class="iq-role" data-role="developer" markdown="1">

In code the split is by module:

- `agents/base.py`: `BaseAgent.run()` stores an `agent_results` row and opens an OTel span for every call.
- `agents/*.py`: each agent's prompt and output model.
- `pipeline.py`: orchestration; owns the threshold and the status rules.
- `truthfulness.py`, `company_facts.py`: pure or I/O-only helpers.
- `api/routes.py`: thin handlers.

```python
class JobScorerAgent(BaseAgent[m.JobScore]):
    agent_type = "job_scorer"
    async def _run(self, job, resume) -> m.JobScore:
        return await self.llm.structured(SYSTEM, user, m.JobScore)
```

Gap: `pipeline.py` has grown (discovery, drafting, evaluation, research refresh); it's the first file I'd split.

</div>

<div class="iq-role" data-role="devops" markdown="1">

At runtime the split is by container:

| Container | Image | Port | User |
|---|---|---|---|
| `app` | `platform/job-hunter-agent@sha256:…` | 8000 | 10001 |
| `linkedin` | `mcp-server-linkedin` pinned by version and digest | 127.0.0.1:8080 | 1000 |
| init `home-dir` | same as `linkedin` | — | 1000 |

Shared: a PVC mounted at `/data` in the sidecar, `/tmp` and `/dev/shm` emptyDirs. The Service exposes
only 8000; the sidecar is unauthenticated, so nothing outside the pod may reach it.

```bash
kubectl -n job-hunter get deploy job-hunter -o jsonpath='{.spec.template.spec.containers[*].name}'
kubectl -n job-hunter logs deploy/job-hunter -c linkedin --tail=20
```

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q3">
<summary>Which non-functional requirements drove the architecture the most?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Three, in order:

1. **Truthfulness.** Nothing in an approved draft may claim experience my resume doesn't have. This
   produced the line-edit design and the deterministic checks.
2. **LinkedIn safety.** Low, spread-out, read-only traffic from one account. This produced the sidecar,
   the per-profile schedules and the 5-per-keyword cap.
3. **Privacy.** My resume only goes to a local model. This produced LiteLLM and accepting slower, less
   polished output.

Latency barely mattered (runs are unattended) and scale not at all. If I'd let latency drive, I'd have
picked a cloud model and lost on privacy.

Deeper: [Non-functional requirements](/posts/projects/job-hunter-agent/02-requirements-gathering/#non-functional-requirements)

</div>

<div class="iq-role" data-role="sre" markdown="1">

From an operations view the NFR that bites is LinkedIn's tolerance, not uptime:

- **Saturation signal:** HTTP 429 or redirect loops from LinkedIn, visible as discovery errors in runs.
- **Error budget, informally:** a missed weekday is fine; a restricted account is not.
- **Controls:** at most 5 postings per keyword, known IDs skipped before any page load, profiles at
  08:00, 12:00 and 16:00, and a lock so runs never overlap on the browser.

```bash
kubectl -n job-hunter logs deploy/job-hunter -c linkedin --since=24h | grep -c "POST /mcp"
```

Gap: there's no pacing *within* a run, so one profile's searches and page loads still arrive as a burst.

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q4">
<summary>Which architectural options did you consider and reject, and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Option | Why I rejected it |
|---|---|
| Auto-apply (the articles' design) | Irreversible actions by a model that fabricates |
| A cloud LLM | My resume leaves the house; costs money |
| Full resume rewrites | Timed out at 180 s and drifted from facts |
| A custom Playwright scraper | A maintained MCP server already does it, read-only |
| A Kubernetes CronJob per profile | Needs the sidecar's browser session; an in-process scheduler is simpler |
| A staging environment | Would need a second LinkedIn session |
| React | One user; vanilla JS without a build step is enough |

The one I'd revisit is the CronJob: in-process scheduling loses a run whose time passes while the pod is
restarting.

Deeper: [Technology selection](/posts/projects/job-hunter-agent/05-technical-architecture/#technology-and-framework-selection)

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q5">
<summary>Monolith, modular monolith or microservices, what did you choose and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

A modular monolith: one FastAPI process with clear modules and interfaces, plus one sidecar for the
part that genuinely has to be separate (a stateful browser with its own lifecycle and memory profile).

Microservices would have bought independent scaling and deploys I don't need, at the cost of network
hops, more images and more failure modes. The sidecar is the exception that proves the rule: it's
separate because it's a different runtime (Chromium), with a different user and memory limit, not because
of team boundaries.

Deeper: [Hosting and deployment model](/posts/projects/job-hunter-agent/05-technical-architecture/#hosting-and-deployment-model)

</div>

<div class="iq-role" data-role="developer" markdown="1">

Modules talk through function calls and Protocols, not HTTP:

- The pipeline gets `sources`, `intel` and `facts` injected in `create_app`, so tests pass fakes.
- The only network hop inside the pod is app → sidecar, over MCP.

```python
pipeline = Pipeline(settings, repo, llm_factory, sources, intel, facts)
scheduler = ProfileScheduler(pipeline, slack_notifier(settings, repo))
```

If a piece ever needed its own service (say, research), the interface is already the cut line.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Operationally the monolith is one image, one pipeline, one Argo CD app and one rollout:

- Deploy is a digest change; rollback is a git revert.
- The sidecar is pinned separately and upgraded deliberately.

```bash
grep -n "image:" homelab-gitops/apps/job-hunter/deployment.yaml
cat homelab-gitops/apps/job-hunter/kustomization.yaml   # the app's digest
```

Gap: because both containers share a pod, an app deploy also restarts the browser (`Recreate`).

</div>

</details>

## Technology Choices
{: #technology-choices }

<details class="project-iq" markdown="1" id="technology-choices-q1">
<summary>Which technologies did you use across the stack, and why those?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Layer | Choice | Why |
|---|---|---|
| Backend | Python 3.12, FastAPI, Pydantic v2 | Async I/O, schema-first LLM output |
| LLM | `qwen3.5-35b-a3b` via LiteLLM, OpenAI SDK | Local, any OpenAI-compatible backend |
| LinkedIn | `mcp-server-linkedin` sidecar | Maintained, read-only tools |
| Storage | Supabase (Postgres + REST) | Free tier, RLS, off-cluster copy |
| UI | Vanilla HTML/CSS/JS | No build step |
| Scheduling | APScheduler | In-process, one job per profile |
| Auth | Keycloak via Authlib | The platform's identity provider |
| Platform | k3d, Argo CD, Kyverno, OpenBao, Zot, cert-manager | Already there |

The theme: reuse the platform, keep the app boring, and spend the cleverness on safety.

Deeper: [Technology selection](/posts/projects/job-hunter-agent/05-technical-architecture/#technology-and-framework-selection)

</div>

<div class="iq-role" data-role="developer" markdown="1">

Libraries that do real work:

- **FastAPI / Starlette:** routes, `SessionMiddleware`, static files.
- **Pydantic / pydantic-settings:** models and env config.
- **openai:** chat completions with `response_format={"type": "json_schema", ...}`.
- **mcp:** streamable-HTTP client for the sidecar.
- **supabase-py:** PostgREST queries, run in a thread.
- **APScheduler:** `CronTrigger.from_crontab` per profile.
- **Authlib:** OIDC with PKCE.
- **pypdf, python-docx:** resume import/export; **defusedxml:** safe RSS parsing; **httpx:** Wikidata, news, Slack.

```bash
uv add defusedxml     # how the news feed's parser came in
uv run pytest -q
```

</div>

<div class="iq-role" data-role="devops" markdown="1">

On the platform side: k3d clusters, Argo CD for GitOps, Kyverno for admission, OpenBao + External Secrets
for secrets, Zot as the registry, cosign for signing, cert-manager with Let's Encrypt DNS-01, Traefik for
ingress, Velero for volume backups. The build gates are Gitleaks, Semgrep, Bandit, Trivy, Checkov,
Conftest and Hadolint; `uv` installs dependencies in the image.

```bash
kubectl -n job-hunter get externalsecret,certificate,ingress
cosign verify registry.core.home.cloudutsuk.com/platform/job-hunter-agent@sha256:<digest> --key <transit key>
```

</div>

</details>

<details class="project-iq" markdown="1" id="technology-choices-q2">
<summary>How do you evaluate and choose between competing technologies?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I ask three questions: does it serve a top NFR, does the platform already run it, and what's the exit?
For example, Supabase vs. SQLite on a PVC: SQLite is simpler, but Supabase gave an off-cluster copy,
row-level security for a future multi-user version, and it's what the source articles used, with an easy
exit (it's Postgres). For the LLM, the privacy NFR decided before any benchmark.

When it's close, I prototype the risky part: the evaluation on six real postings decided the default
resume mode (skills) more convincingly than any argument.

Deeper: [Technology selection](/posts/projects/job-hunter-agent/05-technical-architecture/#technology-and-framework-selection)

</div>

<div class="iq-role" data-role="developer" markdown="1">

For libraries I check maintenance, API stability and how testable they are. The MCP SDK is the cautionary
tale: version 2.x changed the client (a 2-tuple from `streamable_http_client`, `is_error` and
`structured_content` on results), so most examples online were wrong. I wrapped it once:

```python
async with streamable_http_client(self.url) as (read, write), ClientSession(read, write) as session:
    await session.initialize()
    self._session = session
    yield self
```

Lesson: wrap fast-moving SDKs behind your own small client, and pin them.

</div>

</details>

<details class="project-iq" markdown="1" id="technology-choices-q3">
<summary>Where did you build, and where did you buy or reuse?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Bought or reused: the whole platform (identity, secrets, registry, GitOps, certificates), the LLM runtime
and gateway, the LinkedIn browser automation, Postgres (Supabase), and public data (Wikidata, Google
News). Built: the parts that are the product's judgment: scoring and drafting prompts, edit application,
truthfulness checks, the approval workflow, the review UI, profiles and scheduling.

The rule: build what makes it trustworthy and specific to me; reuse everything generic.

Deeper: [Technology selection](/posts/projects/job-hunter-agent/05-technical-architecture/#technology-and-framework-selection)

</div>

<div class="iq-role" data-role="devops" markdown="1">

Reuse was most visible in delivery: the app's CI is one `uses:` line pointing at the platform's
reusable `build-image.yaml`, which brings the gates, signing, SBOM and promotion for free.

```yaml
image:
  if: vars.HOMELAB_DEPLOY == 'true' && github.event_name != 'pull_request'
  needs: [test, supabase]
  uses: cloudutsukpilot/homelab-gitops/.github/workflows/build-image.yaml@main
  with: {image: job-hunter-agent, gitops-path: apps/job-hunter}
```

What I built for delivery: the app's manifests and the secrets script. Nothing platform-wide.

</div>

</details>

## Frontend Architecture
{: #frontend-architecture }

<details class="project-iq" markdown="1" id="frontend-architecture-q1">
<summary>How is the frontend (or user-facing interface) structured, in terms of framework, routing, components and state?</summary>

<div class="iq-role" data-role="architect" markdown="1">

There's no framework: three static files (`index.html`, `app.js`, `styles.css`) served by FastAPI under
`/ui`. Three tabs (Review queue, Jobs, Setup & run), no client-side router, state held in a few
module-level variables and re-fetched from the API when a tab opens.

That's a deliberate choice for one user and about 800 lines of JS: no build step, nothing to upgrade, and
the security property I wanted (every string goes through `textContent`) is easy to enforce in one helper.
If it grew to several users or many screens, I'd move to a component framework, starting with the review
page.

Deeper: [Information architecture](/posts/projects/job-hunter-agent/04-user-experience-and-design/#information-architecture)

</div>

<div class="iq-role" data-role="developer" markdown="1">

The React checklist, mapped to what this code does instead:

- **Components:** render functions that return DOM (`skillsView`, `companyView`, `profileRow`).
- **JSX:** an `el(tag, attrs, ...children)` helper; attributes starting with `on` become listeners.
- **Routing:** tabs toggle `hidden` sections; `role="tab"` and `aria-selected` for accessibility.
- **State:** module variables (`profiles`, `resumes`, `openIds`, `evaluating`) plus the API as the source
  of truth; re-render by calling the load function again.
- **Effects:** tab clicks call `loadApplications`, `loadJobs` or `loadSetup`.
- **Forms:** `submit` handlers build JSON from the form and `PUT`/`POST` it.

```javascript
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat()) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
}
```

Gap: re-rendering a whole section loses focus and scroll position inside it.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-architecture-q2">
<summary>How does the user interface handle loading, errors and large data sets?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Loading: long operations keep their state on the control that started them ("Evaluating…" replaces the
button; run buttons disable and the run shows as "running" in history). Errors: the API returns
`{"detail": …}` with a real status code and the UI shows the message where the action happened (an alert
for a blocked approval, the run output box for pipeline errors). Large data: not a problem at this scale
(dozens of jobs, a handful of profiles), so there's no pagination; long content is collapsed instead.

Deeper: [Interaction patterns](/posts/projects/job-hunter-agent/04-user-experience-and-design/#interaction-patterns)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Fetch wrapper:** one `api(path, options)` that serializes `json`, parses JSON or text, and throws
  `Error(detail)` on non-2xx.
- **Loading state:** `runStep(button, label, fn)` disables the button, shows progress, always re-enables
  in `finally`.
- **Parallel loads:** `Promise.all([api("/resumes"), api("/profiles"), api("/schedule")])`.
- **Empty states:** "No resumes yet: upload one above" and the draft button disabled.

```javascript
async function runStep(button, label, fn) {
  button.disabled = true;
  show(`${label}… (the local model takes a few seconds per job)`);
  try { show(await fn()); } catch (err) { show(`${label} failed: ${err.message}`); }
  finally { button.disabled = false; loadHealth(); loadRuns(); }
}
```

Gap: a validation error with a list `detail` (FastAPI's 422) prints as "[object Object]".

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-architecture-q3">
<summary>How do you keep the frontend fast and accessible?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Fast: no framework, no bundle, three small files, and the slow parts (LLM work) never block the page.
Accessible: semantic controls, icons plus colour for every status, `aria-live` for results, light and
dark themes, layouts that reflow to one column on a phone. I checked each screen at 390 px and in both
themes. What I haven't done is an automated audit, so I wouldn't claim WCAG conformance.

Deeper: [Accessibility design](/posts/projects/job-hunter-agent/04-user-experience-and-design/#accessibility-design)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **CSS tokens:** `--ok`, `--warn`, `--bad` and friends, redefined under `prefers-color-scheme: dark`.
- **Responsive grids:** `grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr))`.
- **Accessible tables from divs:** `role="table"`, `row`, `cell`, and an `aria-label` on each status icon.
- **Announcements:** `aria-live="polite"` on health and run output.

```css
.skills-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr)); gap: .35rem; }
```

Gap: no visible focus styles beyond the browser's default.

</div>

<div class="iq-role" data-role="sre" markdown="1">

For a page this small, the SRE view is about the backend calls it makes: the Setup tab loads resumes,
profiles, schedule, stats, runs and health in parallel, and `/healthz` checks the LinkedIn connection,
which opens an MCP session. That's the slowest request on the page.

```bash
curl -s -o /dev/null -w '%{time_total}\n' -b "jh_session=<cookie>" https://jobs.platform.home.cloudutsuk.com/healthz
```

Gap: there's no frontend timing data at all (no RUM); I'd only find a slow page by feeling it.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-architecture-q4">
<summary>How is the frontend built, configured per environment and served?</summary>

<div class="iq-role" data-role="architect" markdown="1">

There's nothing to build: FastAPI mounts the `ui/` folder with `StaticFiles` and `/` redirects to `/ui/`.
Configuration per environment doesn't reach the browser at all; the UI asks the API (`/healthz`,
`/schedule`, `/auth/me`) for whatever it needs to show. Same files locally and in production.

Deeper: [Visual design](/posts/projects/job-hunter-agent/04-user-experience-and-design/#visual-design-and-design-system)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```python
app.mount("/ui", StaticFiles(directory=UI_DIR, html=True), name="ui")

@app.get("/", include_in_schema=False)
async def index() -> RedirectResponse:
    return RedirectResponse("/ui/")
```

- **No env vars in JS:** no `VITE_*` or `REACT_APP_*`; the API is same-origin, so `fetch("/jobs")` works
  everywhere.
- **Auth:** the session cookie travels automatically; `/auth/me` gives the name for the header.

```bash
make dev   # edit app.js, reload the browser
```

</div>

<div class="iq-role" data-role="devops" markdown="1">

The UI ships inside the app image (`COPY hunter ./hunter`), so a UI change is a normal image release
through the gates. It's served by Uvicorn behind Traefik with TLS; the session cookie is `Secure` because
`PUBLIC_URL` is HTTPS.

```bash
kubectl -n job-hunter exec deploy/job-hunter -c app -- grep -c "companyView" /app/hunter/ui/app.js   # is the new UI live?
```

Gap: no cache-busting on `app.js`; after a deploy a hard refresh is sometimes needed.

</div>

</details>

## Backend and API Design
{: #backend-and-api-design }

<details class="project-iq" markdown="1" id="backend-and-api-design-q1">
<summary>How do CRUD operations work in the backend, from request to persisted data?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Take "save a search profile": the browser `PUT`s JSON to `/profiles/{id}`; FastAPI validates it into
`ProfileIn`; the handler checks the profile exists, the name is unique, the resume exists and the
schedule is valid cron; the repository updates the row in Supabase over its REST API; then the scheduler
re-syncs its jobs; the updated profile is returned.

Every write goes through one `Repository` interface (`insert`, `update`, `get`, `list`, `delete`), so the
same handler works against Supabase in production and an in-memory store in tests.

Deeper: [API and integration architecture](/posts/projects/job-hunter-agent/05-technical-architecture/#api-and-integration-architecture)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```python
@router.put("/profiles/{profile_id}", tags=["profiles"])
async def update_profile(profile_id: str, body: ProfileIn, s: S) -> m.SearchProfile:
    await get_or_404(s.repo, m.SearchProfile, profile_id)
    profile = await s.repo.update(m.SearchProfile, profile_id, await _checked(body, s, profile_id))
    await s.scheduler.sync()
    return profile
```

- **Validation:** Pydantic body, then business checks in `_checked` (409 for a duplicate name, 422 for a
  bad cron or unknown resume).
- **Persistence:** `SupabaseRepository.update` runs the PostgREST call in `asyncio.to_thread`.
- **Response model:** the return annotation becomes the OpenAPI schema.

```bash
curl -X PUT .../profiles/<id> -H 'content-type: application/json' -d '{"name":"Cloud","keywords":["Cloud Architect"]}'
```

</div>

</details>

<details class="project-iq" markdown="1" id="backend-and-api-design-q2">
<summary>How did you design the API, in terms of style, resources, versioning, pagination and errors?</summary>

<div class="iq-role" data-role="architect" markdown="1">

REST-ish JSON over resources (`/profiles`, `/resumes`, `/jobs`, `/applications`, `/runs`), with actions as
sub-resources where they're really commands: `/applications/{id}/approve`, `/jobs/{id}/evaluate`,
`/research/{id}/refresh`. No versioning (one client, same origin, deployed together). No pagination
(small lists; `/runs?limit=`). Errors are FastAPI's `{"detail": "..."}` with meaningful codes: 404, 409
for conflicts like an illegal status transition, 422 for validation, 503 when the LLM key is missing.

Deeper: [API and integration architecture](/posts/projects/job-hunter-agent/05-technical-architecture/#api-and-integration-architecture)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Status transitions as endpoints** keep the rules in one place: `pipeline.transition()` checks
  `ALLOWED_TRANSITIONS` and raises `TransitionError` → 409.
- **OpenAPI** at `/docs` comes from the route annotations and docstrings.
- **Long operations** (discover, draft, evaluate) are synchronous requests that can take minutes; the UI
  waits on them.

```python
if target not in m.ALLOWED_TRANSITIONS[app.status]:
    raise TransitionError(f"cannot move an application from {app.status} to {target}")
```

Gap: minutes-long synchronous requests depend on proxy timeouts; a job queue with polling would be sturdier.

</div>

</details>

<details class="project-iq" markdown="1" id="backend-and-api-design-q3">
<summary>How is the backend structured internally, and where does background work run?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Layered inside one process: routes (HTTP only) → pipeline (orchestration, rules) → agents and helpers
(LLM tasks, pure checks) → repository and integration clients. Background work runs in the same process:
APScheduler on the event loop fires per-profile jobs, which call the same pipeline functions the buttons
do. Running in-process keeps it simple and shares the sidecar; the cost is that a restart loses a run
that was due at that moment.

Deeper: [Hosting and deployment model](/posts/projects/job-hunter-agent/05-technical-architecture/#hosting-and-deployment-model)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Lifespan** starts the scheduler: `await scheduler.start()` → `sync()` reads profiles and adds jobs.
- **One job per profile**, id = profile id, `replace_existing=True`, `max_instances=1`, `coalesce=True`.
- **A lock** serializes runs so two profiles never share the browser at once.

```python
self.scheduler.add_job(self._run, CronTrigger.from_crontab(cron, timezone=self.timezone),
                       id=profile_id, name=profile.name, kwargs={"profile_id": profile_id},
                       replace_existing=True, max_instances=1, coalesce=True)
```

Gap: jobs are in memory; a persistent job store would remember missed runs across restarts.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Because background work shares the process, one replica is a hard requirement (two would double every
scheduled run and fight over the browser profile). The Deployment pins `replicas: 1` and `Recreate`.
`SCHEDULE_CRON` and `SCHEDULE_TIMEZONE` are env vars; per-profile times are data.

```bash
kubectl -n job-hunter logs deploy/job-hunter -c app | grep "scheduled run for"
```

</div>

</details>

<details class="project-iq" markdown="1" id="backend-and-api-design-q4">
<summary>How do you validate input and keep operations safe to repeat?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Input: Pydantic validation at the edge, business rules in one checker, size caps on uploads, and the
UI never renders HTML from data. Safe to repeat: discovery is idempotent by design (jobs are unique per
source and external ID, and known IDs are skipped), status changes are guarded transitions (approving
twice is a 409, not a second approval), and re-evaluating a job replaces its drafts on the same
application rather than creating another one.

Deeper: [Input validation and secure coding](/posts/projects/job-hunter-agent/06-security-and-privacy/#input-validation-and-secure-coding)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```python
existing = (await self.repo.list(m.Application, job_id=job.id) or [None])[0]
if existing and existing.status in (m.ApplicationStatus.approved, m.ApplicationStatus.applied):
    raise TransitionError(f"this job's application is {existing.status.value}; reopen or reject it first")
...
if existing:
    app = await self.repo.update(m.Application, existing.id, {**fields, "status": m.ApplicationStatus.pending_review})
```

- **Idempotent discovery:** `seen = {(j.source, j.external_id) for j in existing}`.
- **Contacts replaced, not appended,** on re-evaluation.

Gap: two evaluate clicks at once on the same job could race; there's no lock per job.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Repeat-safety matters most for the scheduler: `coalesce=True` collapses several missed fires into one, and
`max_instances=1` stops a slow run from overlapping its next fire. Discovery re-runs cost LinkedIn nothing
for postings already stored. A failed run is simply re-run from the UI.

```bash
# re-run one profile now
curl -X POST ".../pipeline/discover?profile_id=<id>" -b "jh_session=<cookie>"
```

</div>

</details>

## Database and Data Modeling
{: #database-and-data-modeling }

<details class="project-iq" markdown="1" id="database-and-data-modeling-q1">
<summary>Which data store did you choose, and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Supabase, which is Postgres with a REST layer, on the free tier. Reasons: it's relational data with clear
relationships; I wanted a copy outside my homelab; row-level security is ready for multi-user; and the
articles I started from used it. The exit is cheap because it's plain Postgres and the app talks to it
through one repository interface. I passed on SQLite in a PVC (simpler, but the data would live and die
with one homelab volume).

Deeper: [Database schema and migrations](/posts/projects/job-hunter-agent/07-data-and-integration/#database-schema-and-migrations)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Client:** `supabase-py` (PostgREST), sync, wrapped in `asyncio.to_thread` so it doesn't block the loop.
- **Mapping:** `TABLES = {m.Job: "jobs", ...}`; `insert` sends `record.model_dump(mode="json")` and
  validates the returned row back into the model.
- **Lists and JSON:** `text[]` for lists, `jsonb` for nested models (resume changes, revenue series).

```python
async def insert(self, record: T) -> T:
    rows = await self._run(self._client.table(table_for(type(record))).insert(record.model_dump(mode="json")))
    return type(record).model_validate(rows[0])
```

</div>

<div class="iq-role" data-role="devops" markdown="1">

The app holds only the project URL and the service-role key (from OpenBao). No database password,
which is why migrations are pasted into the SQL editor rather than run from CI against production. CI
runs a local Supabase in Docker with `supabase start` and applies every migration.

```bash
make supabase-start && make test-supabase
make supabase-reset   # drop local data, re-apply migrations
```

</div>

</details>

<details class="project-iq" markdown="1" id="database-and-data-modeling-q2">
<summary>How is the data modeled, and how did the access patterns shape the model?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Modeled around the pipeline's stages: a search profile finds jobs; a job is scored against a resume;
a job above the threshold gets one application, which points at a tailored resume and a cover letter;
company research is cached per company; every LLM call is an `agent_results` row; every run is a `runs`
row. The access patterns are "everything for one user, newest first" and "everything about one
application", so every table has `user_id` and `created_at`, and the application detail is assembled
from a handful of lookups by ID.

Deeper: [Data architecture](/posts/projects/job-hunter-agent/05-technical-architecture/#data-architecture-and-data-models)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **IDs:** UUIDs generated in Python (`new_id()`), so records exist before they're stored.
- **Base record:** `id`, `user_id`, `created_at`, `updated_at` on every model.
- **Denormalized where cheap:** tailored resumes keep `job_title` and `company_name` for exports.

```python
class Application(Record):
    job_id: str
    score: int
    optimized_resume_id: str
    cover_letter_id: str
    status: ApplicationStatus = ApplicationStatus.pending_review
```

Gap: the newest score wins by sorting on `created_at`; re-scoring leaves older rows behind.

</div>

</details>

<details class="project-iq" markdown="1" id="database-and-data-modeling-q3">
<summary>How were schema changes and data migrations handled?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Every change is an additive, timestamped SQL migration in the repo (`add column if not exists … default
…`), so the running image keeps working against the new schema and a rollback never needs a down
migration. The order is fixed: migration in a PR, CI applies it to a fresh Supabase, I apply it in
production, then merge. Data migrations so far were defaults (the first profile became "Default") and
one recompute (truthfulness warnings re-run over stored drafts).

Deeper: [Database deployment strategy](/posts/projects/job-hunter-agent/12-cicd-and-release-management/#database-deployment-strategy)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```sql
-- 20261022030000_profile_schedule.sql
alter table search_profiles add column if not exists schedule text not null default '';
```

- The Pydantic model gets the field with the same default, so old rows validate.
- The integration test exercises the new column end to end.

Gap: deploying before the migration made profile saves fail until the column existed; the code doesn't
detect a missing column with a friendly message.

</div>

<div class="iq-role" data-role="devops" markdown="1">

CI's `supabase` job is the migration test:

```bash
supabase start -x studio,imgproxy,...    # local stack in Docker; applies supabase/migrations in order
eval "$(supabase status -o env | grep -E '^(API_URL|SERVICE_ROLE_KEY)=')"
SUPABASE_TEST_URL="$API_URL" SUPABASE_TEST_SERVICE_KEY="$SERVICE_ROLE_KEY" uv run pytest -q tests/test_supabase.py
```

Production is manual (SQL editor), which is the weakest link in the release. With a database password in
OpenBao I'd run `supabase db push` from a gated job instead.

</div>

</details>

<details class="project-iq" markdown="1" id="database-and-data-modeling-q4">
<summary>How do you handle data retention, backup and restore?</summary>

<div class="iq-role" data-role="architect" markdown="1">

A daily upkeep job deletes contact suggestions and rejected applications after six months (one setting),
and keeps approved and applied ones. Backup splits by what's irreplaceable: the LinkedIn session (Velero
file-system backup of its PVC) and my review history. Supabase's free plan takes no backups at all, so the
same job writes every table to a gzipped JSON export on a volume Velero copies off the host nightly.
Everything else regenerates by re-running the pipeline. The reasoning is
[ADR-0008](/posts/projects/job-hunter-agent/architecture-decision-records/#adr-0008).

Deeper: [Backup and restore strategy](/posts/projects/job-hunter-agent/07-data-and-integration/#backup-and-restore-strategy)

</div>

<div class="iq-role" data-role="devops" markdown="1">

- **PVCs:** annotated `backup.velero.io/backup-volumes: linkedin,backups` for file-system backup.
- **Supabase:** no `pg_dump` from the cluster (no DB password there); the app exports through its own API key.

```bash
uv run python -m hunter.maintenance restore job-hunter-20261031T220000Z.json.gz   # into an empty database
velero restore create --from-backup <nightly> --include-namespaces job-hunter
```

The export-and-restore round trip runs in CI against a real Postgres. The quarterly drill starts on
2026-10-31. Preparing it found that Velero's file-system backups on the platform cluster had been failing
since its server got a read-only root filesystem. The fix is a writable home for Kopia.

</div>

<div class="iq-role" data-role="sre" markdown="1">

RPO and RTO, honestly: the LinkedIn session's RPO doesn't matter (a fresh sign-in takes 5 minutes, and a
restored session may be rejected anyway). My review history's RPO is one day: the nightly export, since
the Supabase free plan has no backups of its own. RTO for the whole app is a pod start plus, worst case, a
sign-in; losing the Supabase project adds under an hour (new project, migrations, restore the export).
`JobHunterUpkeepFailing` fires if the export stops for two days.

</div>

</details>

## Frontend, Backend and Database Communication
{: #frontend-backend-and-database-communication }

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q1">
<summary>How does the frontend connect to the backend?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Same origin, plain `fetch` with JSON. The UI is served by the same FastAPI app as the API, so there's no
CORS, no API base URL to configure, and the session cookie goes with every request. Traefik terminates TLS
in front; inside the cluster it's HTTP to port 8000. I chose same-origin over a separate frontend host
because one deployable unit means one release and one auth story.

Deeper: [API and integration architecture](/posts/projects/job-hunter-agent/05-technical-architecture/#api-and-integration-architecture)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```javascript
async function api(path, options = {}) {
  const init = { ...options, headers: { ...(options.headers || {}) } };
  if (init.json !== undefined) {
    init.body = JSON.stringify(init.json);
    init.headers["Content-Type"] = "application/json";
    delete init.json;
  }
  const response = await fetch(path, init);
  const body = response.headers.get("content-type")?.includes("json") ? await response.json() : await response.text();
  if (!response.ok) throw new Error(typeof body === "object" ? body.detail ?? JSON.stringify(body) : body);
  return body;
}
```

- **Uploads:** `FormData` to `/resumes/upload` (multipart), no JSON.
- **Auth failures:** a 401 means the session expired; reloading sends the browser through Keycloak.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Path: browser → tailnet → Traefik (TLS, Let's Encrypt) → Service `job-hunter:80` → pod `:8000`. The
NetworkPolicy allows only Traefik's namespace to reach 8000. Uvicorn runs with `--proxy-headers` and
`--forwarded-allow-ips "*"` so redirects use `https`.

```bash
kubectl -n job-hunter get ingress,svc,networkpolicy
curl -sI https://jobs.platform.home.cloudutsuk.com/jobs    # 401 without a session
```

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q2">
<summary>Trace a single user request from the browser to the data store and back.</summary>

<div class="iq-role" data-role="architect" markdown="1">

"Approve this application":

1. Browser `POST /applications/{id}/approve` with the session cookie.
2. Traefik → app. `SessionMiddleware` loads the cookie; `RequireSession` lets it through.
3. The route calls `pipeline.transition(id, approved)`.
4. The pipeline reads the application (Supabase REST), checks the transition is allowed, reads the
   tailored resume and letter, refuses with 409 if either has truthfulness warnings and
   `accept_warnings` isn't set.
5. Otherwise it updates `status` and `approved_at`.
6. JSON back; the UI reloads the list and the detail.

Deeper: [User flows](/posts/projects/job-hunter-agent/04-user-experience-and-design/#user-flows)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```python
if target is m.ApplicationStatus.approved and not accept_warnings:
    resume = await self.repo.get(m.OptimizedResume, app.optimized_resume_id)
    letter = await self.repo.get(m.CoverLetter, app.cover_letter_id)
    warnings = [*(resume.truthfulness_warnings if resume else []), *(letter.truthfulness_warnings if letter else [])]
    if warnings:
        raise TransitionError("the tailored resume or cover letter has truthfulness warnings; ...")
```

The UI catches that 409, shows the warnings in a `confirm()`, and only then retries with
`accept_warnings: true`.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Each hop and what it costs: TLS at Traefik, a cookie signature check, then three or four Supabase REST
calls over the internet (the database isn't in the homelab). Those calls dominate the latency of any
read, so the review page's detail view, which assembles job, resume, letter, score, research and contacts,
is the slowest normal request.

```bash
kubectl -n job-hunter logs deploy/job-hunter -c app --tail=50   # uvicorn access lines
```

Gap: without exported traces I can't show the per-hop breakdown, only the total.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q3">
<summary>How does the backend connect to the data store, and how are connections, timeouts and concurrency handled?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Through Supabase's REST API with the service-role key, not a direct Postgres connection. So there's no
connection pool to tune: each call is an HTTPS request made by `supabase-py`'s client. Concurrency is
the event loop: the sync client runs in a thread via `asyncio.to_thread`, so a slow database call doesn't
block other requests. Timeouts are the client's defaults.

Deeper: [Database schema and migrations](/posts/projects/job-hunter-agent/07-data-and-integration/#database-schema-and-migrations)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```python
async def _run(self, query) -> list[dict[str, Any]]:
    response = await asyncio.to_thread(query.execute)
    return response.data or []
```

- **One client** created per repository (per app), reused across requests.
- **Filters** become `.eq(key, value)`; ordering is always `created_at desc`.
- **No transactions:** multi-step writes (unset the old default resume, set the new one) aren't atomic.

Gap: that last point; two concurrent "make default" saves could leave two defaults.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Failure mode: Supabase unreachable means every page and every run fails, visibly (500s, failed runs).
There's no local fallback, by choice; the data must be consistent. What I'd watch: REST latency to
Supabase from the homelab and free-tier limits.

```bash
kubectl -n job-hunter exec deploy/job-hunter -c app -- python -c "import httpx,os;print(httpx.get(os.environ['SUPABASE_URL']+'/rest/v1/',timeout=10).status_code)"
```

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q4">
<summary>Where do you cache, and how do you keep cached data correct?</summary>

<div class="iq-role" data-role="architect" markdown="1">

One deliberate cache: company research, stored in `company_research` keyed by the lower-cased company
name, so a company is researched once no matter how many of its jobs I see. Its facts and news go stale,
so they refresh when older than seven days, or on demand with a Refresh button. Job postings are cached
in effect too: known job IDs are skipped before any LinkedIn page loads. No HTTP or in-memory cache; the
data is small and the expensive parts are already stored.

Deeper: [Performance optimization](/posts/projects/job-hunter-agent/16-support-and-maintenance/#performance-optimization)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```python
FACTS_MAX_AGE = timedelta(days=7)

def _stale(research: m.CompanyResearch) -> bool:
    return research.facts_refreshed_at is None or m.now() - research.facts_refreshed_at > FACTS_MAX_AGE
```

- **Key design:** `company_key = company_name.strip().lower()`.
- **Invalidation:** time-based for facts and news; the LinkedIn summary itself isn't refreshed.

Gap: two companies with the same name share a cache entry.

</div>

<div class="iq-role" data-role="sre" markdown="1">

The cache is also a load-shedding device for third parties: Wikidata and Google News are hit at most
weekly per company, LinkedIn's company page once per company. If Wikidata is down, cached facts keep
showing and the refresh is recorded as a warning.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q5">
<summary>Where did you use synchronous and where asynchronous communication, and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Synchronous: UI to API (including minutes-long evaluations), app to LLM, app to Supabase, app to the
sidecar. Asynchronous: the scheduler (time-triggered work nobody waits on) and Slack (fire and forget
after a run). There's no queue, because there's one worker and one user. The trade-off I'd name: a
manual "Score & draft" over many jobs holds an HTTP request open for minutes. At more than one user I'd
put a job queue between the API and the pipeline and have the UI poll the run history.

</div>

<div class="iq-role" data-role="developer" markdown="1">

Everything is `async def`, so "synchronous" here means awaited in the request, not blocking:

```python
async def work() -> dict[str, DiscoveryReport]:
    return {p.name: await s.pipeline.discover(p) for p in profiles}

return await track(s.repo, user, "manual", "discover", names, work(), s.notify_manual)
```

The run is recorded as "running" before it starts, so the UI's history shows it while the request is
still open.

</div>

</details>

## Integrations and Background Processing
{: #integrations-and-background-processing }

<details class="project-iq" markdown="1" id="integrations-and-background-processing-q1">
<summary>Which external systems does the application integrate with, and how?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| System | How |
|---|---|
| LinkedIn | MCP over streamable HTTP to a sidecar running a signed-in Chromium; read-only tools only |
| LiteLLM / local model | OpenAI-compatible chat completions with JSON schema |
| Supabase | REST through `supabase-py` |
| Keycloak | OIDC with PKCE |
| Wikidata | Search and entity APIs, matched by the company's website |
| Google News | RSS search |
| Slack | Incoming webhook |
| Indeed | HTML scraping, off by default |

Each sits behind an interface so tests use fakes.

Deeper: [External systems](/posts/projects/job-hunter-agent/07-data-and-integration/#external-systems-and-third-party-integrations)

</div>

<div class="iq-role" data-role="developer" markdown="1">

The LinkedIn client is the interesting one:

```python
async def call(self, tool: str, **arguments: Any) -> Any:
    if tool not in READ_ONLY_TOOLS:
        raise LinkedInError(f"{tool} is not a read-only tool; this client never acts on your account")
    result = await self._session.call_tool(tool, {k: v for k, v in arguments.items() if v is not None})
    if result.is_error:
        raise LinkedInError(f"{tool}: {' '.join(texts)[:500]}")
    return result.structured_content or json.loads(joined)
```

`READ_ONLY_TOOLS` is search, job details, apply URL, company profile and posts, employees, company search.

</div>

</details>

<details class="project-iq" markdown="1" id="integrations-and-background-processing-q2">
<summary>How do you handle rate limits, retries and partial failures from external APIs?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Rate limits are avoided rather than handled: LinkedIn gets at most 5 postings per keyword, known IDs are
skipped, profiles run hours apart. Retries are narrow: the LLM gets one repair retry for invalid JSON;
nothing retries LinkedIn automatically, because retrying a rate limit makes it worse. Partial failures are
contained: one failing keyword or source is recorded in `errors` and the rest continue; research, facts,
news, contacts and apply links are warnings that never fail a draft.

Deeper: [Resilience](/posts/projects/job-hunter-agent/05-technical-architecture/#resilience-and-disaster-recovery)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```python
for keywords in profile.keywords:
    try:
        found += await source.search(keywords, profile.location, self.user_id, known)
    except Exception as exc:  # one failing source or query should not lose the others
        errors.append(f"{source.name} {keywords!r}: {type(exc).__name__}: {exc}")
```

Same pattern for research and facts: `try`, record a warning string, carry on. A test
(`test_failing_facts_are_warnings_not_failed_drafts`) pins it.

</div>

<div class="iq-role" data-role="sre" markdown="1">

What I'd alert on: discovery errors containing "429", "redirect" or "sign in" (LinkedIn pushing back or
the session gone). Today those land in the run's errors and the Slack message, which is the signal.

```bash
kubectl -n job-hunter logs deploy/job-hunter -c linkedin --since=6h | grep -iE "429|captcha|login"
```

Gap: no backoff between requests inside a run; the first sign of throttling should pause the profile.

</div>

</details>

<details class="project-iq" markdown="1" id="integrations-and-background-processing-q3">
<summary>How are scheduled and background jobs designed and coordinated?</summary>

<div class="iq-role" data-role="architect" markdown="1">

One APScheduler job per enabled search profile, each on its own cron (08:00, 12:00 and 16:00 IST on
weekdays), so LinkedIn traffic is spread out. Jobs are re-synced whenever a profile is saved or deleted.
A lock makes runs wait for each other, since they share one browser. Each run is recorded in `runs` and
posts to Slack when it finishes. Coordination is in-process, which is why there's exactly one replica.

Deeper: [Product roadmap, phase 3](/posts/projects/job-hunter-agent/03-product-planning/#phase-3-steps)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```python
async def _run(self, profile_id: str) -> None:
    profile = await self.pipeline.repo.get(m.SearchProfile, profile_id)
    if profile is None or not profile.enabled:
        return
    async with self._lock:
        work = run_once(self.pipeline, profile_id=profile_id)
        report = await track(self.pipeline.repo, self.pipeline.user_id, "scheduled", "full",
                             [profile.name], work, self.on_finish)
```

The profile is re-read at fire time, so a profile switched off after the last sync still won't run.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Schedules are data (a cron per profile in the database), with one env default (`SCHEDULE_CRON=0 8 * * 1-5`,
`SCHEDULE_TIMEZONE=Asia/Kolkata`). The Slack webhook comes from OpenBao.

```bash
curl -s -b "jh_session=<cookie>" https://jobs.platform.home.cloudutsuk.com/schedule | jq '.jobs[] | {profile, next_run}'
```

Gap: avoid deploying near a scheduled time; `Recreate` stops a run in progress.

</div>

</details>

## Security and Identity
{: #security-and-identity }

<details class="project-iq" markdown="1" id="security-and-identity-q1">
<summary>How do users authenticate, and how is authorization enforced?</summary>

<div class="iq-role" data-role="architect" markdown="1">

OIDC authorization code flow with PKCE against the platform's Keycloak, a confidential client. Only
`platform-admins` may use it, enforced twice: in Keycloak's browser flow and again in the app's callback
from the token's `groups` claim, so a misconfigured client can't open the door. After sign-in, a signed
cookie holds the session for 8 hours. Inside the app there's one role, so authorization beyond "signed in
and in the group" isn't needed.

Deeper: [Authentication and authorization](/posts/projects/job-hunter-agent/06-security-and-privacy/#authentication-and-authorization)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```python
def member_of(userinfo: dict, group: str) -> bool:
    groups = userinfo.get("groups") or []
    return not group or group in groups or f"/{group}" in groups

class RequireSession(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if request.url.path.startswith(PUBLIC_PATHS) or request.session.get("user"):
            return await call_next(request)
        if _wants_html(request):
            return RedirectResponse(f"/auth/login?next={quote(request.url.path)}")
        return JSONResponse({"detail": "sign in at /auth/login"}, status_code=401)
```

Middleware order matters: the session middleware is added last so it runs first.

</div>

<div class="iq-role" data-role="devops" markdown="1">

The Keycloak client is created by infra-local's `configure-realm.sh`; its secret is copied into
`kv/platform/job-hunter`. The app gets `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_REQUIRED_GROUP` and
`PUBLIC_URL` as env vars, the secrets from the ExternalSecret.

```bash
curl -s https://auth.core.home.cloudutsuk.com/realms/homelab/.well-known/openid-configuration | jq .issuer
```

</div>

</details>

<details class="project-iq" markdown="1" id="security-and-identity-q2">
<summary>How are secrets and credentials managed?</summary>

<div class="iq-role" data-role="architect" markdown="1">

All in OpenBao, delivered by one ExternalSecret: the Keycloak client secret, the session signing key,
a LiteLLM virtual key restricted to one model, the Supabase URL and service-role key, the Slack webhook.
A script fills OpenBao without printing values. The one credential that isn't in OpenBao is the most
sensitive: the LinkedIn session, which stays on the pod's volume and never leaves it.

Deeper: [Secrets and key management](/posts/projects/job-hunter-agent/06-security-and-privacy/#secrets-and-key-management)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **pydantic-settings** reads them as plain fields; nothing is logged.
- **Fail fast:** a missing LLM key raises `LLMError` and routes return 503.
- **Startup check:** with `OIDC_ISSUER` set, the app refuses to start without a client secret and a
  32+ character session secret.

```python
if not (settings.oidc_client_id and settings.oidc_client_secret and len(settings.session_secret) >= 32):
    raise RuntimeError("OIDC_ISSUER is set: OIDC_CLIENT_ID, OIDC_CLIENT_SECRET and a 32+ char SESSION_SECRET are required")
```

</div>

<div class="iq-role" data-role="devops" markdown="1">

```yaml
spec:
  refreshInterval: 1h
  secretStoreRef: {kind: ClusterSecretStore, name: openbao}
  target: {name: job-hunter, creationPolicy: Owner}
  data:
    - secretKey: SLACK_WEBHOOK_URL
      remoteRef: {key: platform/job-hunter, property: slack_webhook_url}
```

```bash
host/job-hunter/configure.sh --slack     # a dedicated webhook, typed in, not echoed
kubectl -n job-hunter annotate externalsecret job-hunter force-sync=$(date +%s) --overwrite
kubectl -n job-hunter rollout restart deploy/job-hunter
```

Gotcha: a key missing from OpenBao fails the whole Secret's sync, so add the key before the manifest.

</div>

</details>

<details class="project-iq" markdown="1" id="security-and-identity-q3">
<summary>How is sensitive data protected, and which compliance constraints applied?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The sensitive data is my resume, my review history and other people's names in contact suggestions.
Protections: the resume only goes to a local model; TLS on every hop off the pod; Supabase encryption at
rest; access only through Keycloak; contact suggestions used only to inform me and never messaged. The
compliance constraint that really applies is LinkedIn's user agreement, which forbids scraping; I accept
that risk personally and keep the traffic minimal and read-only.

Deeper: [Privacy and data protection](/posts/projects/job-hunter-agent/06-security-and-privacy/#privacy-and-data-protection-requirements)

</div>

<div class="iq-role" data-role="devops" markdown="1">

- Pod security: non-root users, read-only root filesystems, all capabilities dropped, seccomp
  `RuntimeDefault`, no service account token mounted.
- Network: only Traefik in; the sidecar has no Service port.
- Volume: the browser profile, backed up by Velero.

```bash
kubectl -n job-hunter get pod -o jsonpath='{.items[0].spec.securityContext}'
```

Gap: egress isn't restricted, and the host disk's encryption is unconfirmed.

</div>

</details>

<details class="project-iq" markdown="1" id="security-and-identity-q4">
<summary>Which threats did you design against?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The two I designed hardest against are unusual: **the model fabricating claims** (deterministic checks
block approval) and **prompt injection from job postings** (untrusted text goes straight into prompts, so
the model's output can't do anything without passing the checks and me). Then the usual ones: account
takeover of the LinkedIn session (never leaves the pod), the app acting on my behalf (read-only tool
allow-list), outsiders reaching the app (Keycloak, group check, NetworkPolicy), leaked secrets (OpenBao,
Gitleaks).

Deeper: [Threat modeling](/posts/projects/job-hunter-agent/06-security-and-privacy/#threat-modeling)

</div>

<div class="iq-role" data-role="developer" markdown="1">

The truthfulness check is the main defence, and it's plain code:

```python
for term in posting_terms(job.description, job.company_name):
    ...
    if not _supported(term, source, lowercase_words):
        flagged.append(term)
```

It finds tools and phrases in the posting (capitalised words, with their acronyms), keeps the ones the
draft uses, and flags those the original resume doesn't support. Numbers and unquoted "original" lines are
checked too. Also: the UI never uses `innerHTML`; RSS goes through `defusedxml`.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Supply chain: digest-pinned base images and actions, `uv.lock`, seven scanners, an SBOM and a signature
per image, Kyverno verifying signatures at admission. Runtime: restricted pod security and a
NetworkPolicy.

```bash
kubectl get clusterpolicy | grep -i verify
trivy image registry.core.home.cloudutsuk.com/platform/job-hunter-agent@sha256:<digest>
```

</div>

</details>

## Performance and Scalability
{: #performance-and-scalability }

<details class="project-iq" markdown="1" id="performance-and-scalability-q1">
<summary>What load does the system handle, where are the bottlenecks, and how does it scale?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The load is tiny: one user, three profiles, up to 30 job pages a day, about five LLM calls per drafted job.
The bottleneck is the local model's latency: each call can take tens of seconds, and a 28k-character
resume made a full rewrite time out at 180 s. It doesn't scale horizontally and doesn't need to: one
browser session and an in-process scheduler pin it to one replica. The real ceiling is LinkedIn's
tolerance, not CPU.

Deeper: [Scalability and performance strategy](/posts/projects/job-hunter-agent/05-technical-architecture/#scalability-and-performance-strategy)

</div>

<div class="iq-role" data-role="sre" markdown="1">

Saturation points I've seen: the sidecar's memory (Chromium hit 2 GiB and was OOMKilled during a search;
now 3 GiB, and `/dev/shm` counts against it) and the LLM timeout (300 s per call). Throughput is bounded
on purpose by the 5-per-keyword cap.

```bash
kubectl -n job-hunter top pod --containers
kubectl -n job-hunter get pod -o jsonpath='{.items[0].status.containerStatuses[*].lastState.terminated.reason}'
```

Gap: no memory alert; the OOMKill was found from an error in the UI.

</div>

</details>

<details class="project-iq" markdown="1" id="performance-and-scalability-q2">
<summary>How would the design change at ten times the users or data?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Ten times the users breaks three assumptions: one default user, one LinkedIn session, one in-process
scheduler. I'd move to real multi-user (Supabase auth or Keycloak subject as `user_id`, which the schema
and RLS already anticipate), one browser session per user (a pool of sidecars, or per-user pods), a job
queue with workers instead of in-request runs, and a persistent scheduler. Ten times the data is easy:
it's Postgres, and every query is per user and recent-first. LinkedIn at ten times the traffic from one
account isn't an option at all.

Deeper: [Architecture reviews](/posts/projects/job-hunter-agent/18-continuous-improvement/#architecture-reviews)

</div>

<div class="iq-role" data-role="devops" markdown="1">

Operationally: split the pod (the API scales, browsers don't), add a queue (Redis or Postgres-backed), run
workers as a Deployment with `replicas` per available browser session, move the scheduler to a
persistent job store or CronJobs, and give each browser its own PVC. The image and pipeline stay the same.

```bash
kubectl -n job-hunter scale deploy/job-hunter --replicas=2   # NOT today: doubles every scheduled run
```

</div>

<div class="iq-role" data-role="sre" markdown="1">

At 10x, I'd add the SLIs I can skip today: queue depth and age, draft latency per job, LLM error rate,
and LinkedIn errors per session. Capacity planning would be per browser session (memory) and per model
replica (requests in flight).

</div>

</details>

<details class="project-iq" markdown="1" id="performance-and-scalability-q3">
<summary>How did you measure and improve performance?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I measured the things that hurt: the full-resume rewrite timing out (fixed by switching to line edits),
a live discovery of 2 postings taking 23 s, and per-run durations in the run history. The biggest win
was architectural, not tuning: asking the model for edits instead of a document. Second: skipping known
job IDs before loading any LinkedIn page. Third: caching company research for a week.

Deeper: [Performance and load testing](/posts/projects/job-hunter-agent/10-quality-assurance/#performance-and-load-testing)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Edits, not rewrites:** `ResumeEdits` with at most 25 changes; `apply_edits` patches lines.
- **Thinking off:** `chat_template_kwargs.enable_thinking=False` for structured calls.
- **Prompt size:** contacts get the first 4,000 characters of the resume; pages are cut at 12,000.

```python
self._extra_body = {"chat_template_kwargs": {"enable_thinking": False}} if settings.llm_disable_thinking else None
```

Spans record tokens in and out per call (`gen_ai.usage.*`), ready for when traces are exported.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Run duration is in the history (`created_at` to `finished_at`), so I can see a profile getting slower.
Per-call timing exists as spans but isn't exported yet, which is the first thing I'd fix to find where a
7-minute run goes.

```yaml
# homelab-gitops apps/job-hunter/deployment.yaml, app container env: the one-line fix
- {name: OTEL_EXPORTER_OTLP_ENDPOINT, value: <platform OTLP gateway>}
```

</div>

</details>

## Reliability and Resilience
{: #reliability-and-resilience }

<details class="project-iq" markdown="1" id="reliability-and-resilience-q1">
<summary>What are the failure modes, and how does the system degrade when a part fails?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Part fails | System does |
|---|---|
| LinkedIn errors or throttles | That keyword's error recorded; other keywords and profiles run |
| Sidecar OOMKilled | Current call fails ("SSE stream ended"), container restarts, session survives |
| LLM bad JSON | One repair retry, then that job fails; the run goes on |
| Research, facts, news, contacts, apply link | Warning; draft completes |
| Slack | Logged; run unaffected |
| Supabase | UI and runs fail visibly |
| Pod restart | Session survives; a run due during the restart is skipped |

Graceful degradation is everywhere except the database, which I chose not to work around.

Deeper: [Resilience and disaster recovery](/posts/projects/job-hunter-agent/05-technical-architecture/#resilience-and-disaster-recovery)

</div>

<div class="iq-role" data-role="sre" markdown="1">

Probes check only the process (`/readyz`), so a slow LLM or LinkedIn blip never restarts the pod and kills
a browser session mid-run. Dependency health is in `/healthz` for people.

```bash
kubectl -n job-hunter describe pod -l app.kubernetes.io/name=job-hunter | grep -A3 "Last State"
kubectl -n job-hunter get events --sort-by=.lastTimestamp | tail
```

</div>

</details>

<details class="project-iq" markdown="1" id="reliability-and-resilience-q2">
<summary>What are the availability and recovery targets, and how are backup and disaster recovery handled?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Targets are written SLOs sized for a personal tool: 90% of scheduled runs complete over 7 days, every
profile succeeds within 4 days, and the UI answers 99% of probes. Recovery: the LinkedIn session is on a
Velero-backed PVC, though a fresh sign-in (5 minutes) is the real recovery path. The review history is in
Supabase, copied by a nightly export because the free plan has no backups. Everything else regenerates.
The DR plan for the whole app: Argo CD re-creates it from git, I sign in to LinkedIn, and if Supabase is
gone, the newest export goes into a new project.

Deeper: [Backup verification](/posts/projects/job-hunter-agent/16-support-and-maintenance/#backup-verification)

</div>

<div class="iq-role" data-role="devops" markdown="1">

```bash
velero backup get | grep platform
argocd app sync job-hunter                       # recreate from git
# then the LinkedIn sign-in runbook (kubectl exec into the sidecar, port-forward 6080)
```

The data restore is a runbook (`docs/runbooks/restore.md`) with a quarterly drill, the first on
2026-10-31. Until that runs, these are tested pieces (the export round trip in CI), not a rehearsed whole.

</div>

<div class="iq-role" data-role="sre" markdown="1">

RTO: a pod start (under a minute) plus, worst case, a manual sign-in. RPO for applications: one day (the
nightly export). The run SLO is 90% of scheduled runs completing over 7 days, not 95%: with 15 runs a
week, 95% would mean a single failure breaks it. The alert reads the app's Prometheus counter; the same
number comes from the `runs` table:

```sql
select date_trunc('week', created_at), count(*) filter (where status = 'succeeded') * 1.0 / count(*)
from runs where trigger = 'scheduled' group by 1 order by 1;
```

</div>

</details>

<details class="project-iq" markdown="1" id="reliability-and-resilience-q3">
<summary>How do you make jobs and deployments safe to retry?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Jobs: discovery is idempotent (jobs unique per source and external ID; known IDs skipped), re-evaluating a
job replaces drafts on the same application, approved and applied applications are frozen, and the
scheduler never overlaps runs. Deployments: the image is addressed by digest, so re-applying is a no-op;
migrations are additive with `if not exists`, so re-running one is harmless; a rollback is a git revert.

Deeper: [Rollback and roll-forward](/posts/projects/job-hunter-agent/12-cicd-and-release-management/#rollback-and-roll-forward-procedures)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- `filter_jobs(..., seen=...)` drops duplicates and adds each kept job to `seen`, so even one search's
  duplicates collapse.
- `track()` records a run even when it raises (status `failed`, with the error).
- A test (`test_a_run_that_raises_is_recorded_as_failed`) pins that.

```python
except Exception as exc:
    await _finish(repo, run, stored, {"status": "failed", "errors": [f"{type(exc).__name__}: {exc}"]}, on_finish)
    raise
```

</div>

<div class="iq-role" data-role="devops" markdown="1">

```sql
alter table runs add column if not exists ...;   -- every migration is re-runnable
```

```bash
git -C homelab-gitops revert <promote-commit>    # rollback = a new commit; Argo CD syncs
```

`Recreate` plus one replica means no two browsers ever share the profile during a rollout.

</div>

</details>

## Testing and Quality
{: #testing-and-quality }

<details class="project-iq" markdown="1" id="testing-and-quality-q1">
<summary>What is your testing strategy across the frontend, backend and data?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Fast, offline unit and API tests with a fake for every outside system (LLM, LinkedIn search, company
pages, company facts); one integration test of the whole flow against a real Supabase in CI; contract
tests for LinkedIn payload shapes and the MCP client against a local fake server; manual end-to-end
checks against the real model and LinkedIn, capped and on purpose. Plus an evaluation over six real
postings for drafting quality, which is the test a unit test can't be.

Deeper: [Quality Assurance](/posts/projects/job-hunter-agent/10-quality-assurance/#unit-testing)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **pytest + TestClient** against `create_app(settings, repo=MemoryRepository(), llm=FakeLLM(), ...)`.
- **Fixtures:** `make_client(**overrides)` builds an app with fakes and settings overrides.
- **Regression tests from real drafts:** BYOK, "Mentions Own", OpenTelemetry added to a skills line.

```python
def test_capitalized_phrases_are_one_term_with_their_acronym():
    ...
    assert unsupported_terms(tailored, resume, job) == ["Bring Your Own Key (BYOK)", "Customer-Managed Keys (CMK)"]
```

```bash
make test          # ~2 s
make test-supabase
```

</div>

</details>

<details class="project-iq" markdown="1" id="testing-and-quality-q2">
<summary>How do you test integrations with external systems?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Three levels: fakes that implement the same interfaces (most tests), recorded payload shapes for the
parsers (LinkedIn job pages, references, people lists), and a real local MCP server in tests for the
client. Against the real systems, only capped manual checks, because automated LinkedIn traffic in CI is
exactly what the volume rules forbid. Supabase is the exception: CI runs a real one locally.

Deeper: [Contract testing](/posts/projects/job-hunter-agent/10-quality-assurance/#contract-testing)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```python
async def test_client_lists_tools_and_refuses_account_actions(mcp_url):
    async with LinkedInClient(mcp_url).connect() as li:
        ...
```

`FakeFacts(fail=True)` and `FakeSource(fail=True)` simulate outages; the asserts check the failure became
a warning or an error entry, not a crash.

</div>

<div class="iq-role" data-role="devops" markdown="1">

CI's `supabase` job starts the real stack with only the services the app needs (`-x studio,imgproxy,...`),
reads its URL and key from `supabase status -o env`, and runs the integration test. Live checks after a
deploy are run from inside the pod with `kubectl exec`, using an in-memory repository so nothing is
stored.

</div>

</details>

<details class="project-iq" markdown="1" id="testing-and-quality-q3">
<summary>Which quality gates does code pass before it merges and ships?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Before merge: unit tests and ruff, the Supabase integration test, a Docker build. Before ship (main only):
Gitleaks, Semgrep, Bandit, Trivy (dependencies, IaC, image), Checkov, Conftest, Hadolint, then signing.
At admission: Kyverno. And in the product, one more gate that matters most: truthfulness warnings block
approval until I look.

Deeper: [Static analysis and security scanning](/posts/projects/job-hunter-agent/12-cicd-and-release-management/#static-analysis-and-security-scanning)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```bash
uv run ruff check . && uv run ruff format --check .   # E, F, I, B, UP, SIM; 125 columns
uv run pytest -q
```

Bandit's "no asserts" rule shaped the code: validation raises explicit exceptions. Gitleaks false
positives are suppressed by fingerprint in `.gitleaksignore`, never by disabling a rule.

</div>

<div class="iq-role" data-role="devops" markdown="1">

The gates live in the platform's reusable workflow, so this repo can't weaken them; it only passes
`image` and `gitops-path`. Reports are uploaded as artifacts per run.

```bash
gh run view <run-id> --log-failed
gh run download <run-id> -n security-reports-job-hunter-agent
```

</div>

</details>

## Infrastructure and Environments
{: #infrastructure-and-environments }

<details class="project-iq" markdown="1" id="infrastructure-and-environments-q1">
<summary>Where and how is the application hosted, and why there?</summary>

<div class="iq-role" data-role="architect" markdown="1">

On my homelab's `platform` k3d cluster, as one Argo CD application, because the platform already provides
everything a small app needs (identity, secrets, registry, signing, certificates, backups) and the local
LLM lives next door on the `ai` cluster. The database is Supabase cloud (free tier) so the data has a copy
outside the house. Cost: effectively zero.

Deeper: [Hosting and deployment model](/posts/projects/job-hunter-agent/05-technical-architecture/#hosting-and-deployment-model)

</div>

<div class="iq-role" data-role="devops" markdown="1">

```yaml
spec:
  replicas: 1
  strategy: {type: Recreate}
  template:
    spec:
      automountServiceAccountToken: false
      securityContext: {runAsNonRoot: true, fsGroup: 1000, seccompProfile: {type: RuntimeDefault}}
```

Plus a 2 GiB PVC, Ingress with cert-manager, NetworkPolicy, ExternalSecret, Zot pull secret.

```bash
kubectl --context k3d-platform -n job-hunter get all,pvc,ingress,networkpolicy,externalsecret
```

</div>

<div class="iq-role" data-role="sre" markdown="1">

The hosting choice means my homelab's availability is the app's availability. That's acceptable for a
personal tool; the scheduled runs are the only time-sensitive part, and missing one is cheap.

Gap: the database is outside the homelab, so an internet outage stops the app even when the cluster is fine.

</div>

</details>

<details class="project-iq" markdown="1" id="infrastructure-and-environments-q2">
<summary>Which environments exist, and how close is local development to production?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Two: my laptop and production. CI is a throwaway test environment per push. No staging, deliberately:
a second environment would need a second LinkedIn session (against LinkedIn's terms, or double the
traffic). Parity comes from using the same image, the same LLM gateway and model, and a CI test against a
real Supabase. The main gap is storage (memory locally) and sign-in (off locally).

Deeper: [Environment parity](/posts/projects/job-hunter-agent/11-infrastructure-and-environments/#environment-parity)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```bash
cp .env.example .env     # set LLM_API_KEY
make dev                 # STORAGE_BACKEND=memory, sign-in off, LinkedIn off by default
make supabase-start      # optional: real Postgres locally
make linkedin-mcp        # optional: a local browser session on 127.0.0.1:8765
```

Defaults are chosen so a fresh clone works with one key.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Production differs only by env vars: `STORAGE_BACKEND=supabase`, `OIDC_*`, `LINKEDIN_MCP_URL` pointing at
the sidecar, `SCHEDULE_*`, and secrets from OpenBao. Same image everywhere after CI.

</div>

</details>

<details class="project-iq" markdown="1" id="infrastructure-and-environments-q3">
<summary>How is the infrastructure provisioned and configured?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Declaratively, in three repos: homelab-gitops for the Kubernetes objects (Argo CD applies them),
infra-local for the Keycloak client and OpenBao secrets (idempotent scripts), and the app repo for the
database schema (SQL migrations). The one manual step is applying migrations in Supabase, which I'd
automate with a database password in OpenBao.

Deeper: [Infrastructure as code](/posts/projects/job-hunter-agent/11-infrastructure-and-environments/#infrastructure-as-code)

</div>

<div class="iq-role" data-role="devops" markdown="1">

```bash
# infra-local
host/keycloak/configure-realm.sh          # adds the job-hunter client
host/job-hunter/configure.sh --supabase   # fills kv/platform/job-hunter
# homelab-gitops
git add apps/job-hunter clusters/platform/job-hunter.yaml && git commit && gh pr create
```

All scripts are safe to re-run: they skip keys that already exist and never print values.

</div>

</details>

## CI/CD and Deployment
{: #ci-cd-and-deployment }

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q1">
<summary>Walk me through the pipeline from commit to production.</summary>

<div class="iq-role" data-role="architect" markdown="1">

Push to `main` → three GitHub-hosted jobs (unit tests and ruff, the Supabase integration test, a Docker
build) → if tests and Supabase pass, the platform's reusable `build-image` workflow on the homelab runner:
seven security gates, build, Trivy image scan, SBOM, push to Zot, cosign signing with a key in OpenBao →
a GitHub App commits the digest to homelab-gitops → Argo CD's webhook is pinged and it syncs → Kyverno
admits the signed, pinned image → `Recreate` rollout. No manual step for app code; pull requests stop
after the tests.

Deeper: [Build automation](/posts/projects/job-hunter-agent/12-cicd-and-release-management/#build-automation)
(with the animated pipeline)

</div>

<div class="iq-role" data-role="devops" markdown="1">

```yaml
image:
  if: vars.HOMELAB_DEPLOY == 'true' && github.event_name != 'pull_request'
  needs: [test, supabase]
  permissions: {contents: read, id-token: write}   # OIDC to OpenBao for registry and signing
  uses: cloudutsukpilot/homelab-gitops/.github/workflows/build-image.yaml@main
  with: {image: job-hunter-agent, gitops-path: apps/job-hunter}
```

```bash
gh run watch <run-id> --exit-status
kubectl --context k3d-platform -n argocd get application job-hunter -o jsonpath='{.status.sync.revision}'
kubectl --context k3d-platform -n job-hunter rollout status deploy/job-hunter
```

</div>

</details>

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q2">
<summary>Which deployment strategy do you use, and how do you roll back?</summary>

<div class="iq-role" data-role="architect" markdown="1">

`Recreate`, not rolling: the old pod must stop before the new one starts because only one Chromium can use
the LinkedIn profile. That means a few seconds of downtime per deploy, which is fine for one user, with
one rule: don't deploy near a scheduled run. Rollback is reverting the digest commit in homelab-gitops;
additive migrations mean the previous image still runs against the current schema.

Deeper: [Rollback and roll-forward](/posts/projects/job-hunter-agent/12-cicd-and-release-management/#rollback-and-roll-forward-procedures)

</div>

<div class="iq-role" data-role="devops" markdown="1">

```bash
git -C homelab-gitops log --oneline -3 -- apps/job-hunter/kustomization.yaml
git -C homelab-gitops revert <promote-commit> && git -C homelab-gitops push
kubectl -n job-hunter rollout status deploy/job-hunter
```

`kubectl rollout undo` would be undone by Argo CD's self-heal, so git is the only rollback lever.

</div>

<div class="iq-role" data-role="sre" markdown="1">

I verify a deploy with what the user sees: `/readyz` from inside the pod, the UI loads after sign-in, the
LinkedIn session is still valid (`--status` in the sidecar), and the next scheduled run's Slack message.

```bash
kubectl -n job-hunter exec deploy/job-hunter -c linkedin -- python -m linkedin_mcp_server --status --chrome-path=<path>
```

Gap: these checks are manual; a post-deploy smoke job would make them routine.

</div>

</details>

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q3">
<summary>How do data and schema changes ship alongside application changes?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Schema first, code second. Migrations are additive (`add column if not exists … default …`), reviewed in
a PR, applied by CI to a fresh Supabase, then applied by me in production, and only then is the code
merged. Additive means the old image keeps working, so the order never causes an outage, and rollback
never needs a down-migration. When I once skipped the production step, the cost was clear: profile saves
failed until the column existed.

Deeper: [Database deployment strategy](/posts/projects/job-hunter-agent/12-cicd-and-release-management/#database-deployment-strategy)

</div>

<div class="iq-role" data-role="developer" markdown="1">

Every model field added for a migration gets a default matching the column's, so rows written before
the migration validate:

```python
schedule: str = ""  # 5-field cron for this profile's runs; empty: the default SCHEDULE_CRON
```

```sql
alter table search_profiles add column if not exists schedule text not null default '';
```

And the integration test exercises the new field end to end.

</div>

<div class="iq-role" data-role="devops" markdown="1">

The weak spot is that production migrations are manual (SQL editor), because the app only has a REST key.
With a database password in OpenBao I'd add a gated job:

```bash
supabase link --project-ref <ref>
supabase db push        # applies pending migrations, records them in the history table
```

and run it before the image job.

</div>

</details>

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q4">
<summary>How do you manage configuration and versions across environments?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Configuration that changes per search is data (profiles: keywords, resume, mode, tone, schedule).
Configuration that changes per environment is env vars with safe local defaults. Secrets are in OpenBao.
Versions: the image digest is the version, the homelab-gitops commit is the release record, and the
sidecar is pinned separately by version and digest and upgraded on purpose.

Deeper: [Environment configuration](/posts/projects/job-hunter-agent/08-development-preparation/#environment-configuration)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```python
class Settings(BaseSettings):
    storage_backend: str = "memory"
    linkedin_mcp_url: str = "http://127.0.0.1:8765/mcp"
    schedule_cron: str = ""
    schedule_timezone: str = "UTC"
    slack_webhook_url: str = ""
    company_facts_enabled: bool = True
```

Tests build `Settings(_env_file=None, ...)` so a developer's `.env` never leaks into a test run.

</div>

<div class="iq-role" data-role="devops" markdown="1">

```yaml
- {name: SCHEDULE_CRON, value: "0 8 * * 1-5"}
- {name: SCHEDULE_TIMEZONE, value: Asia/Kolkata}
- {name: LINKEDIN_MAX_JOBS_PER_QUERY, value: "5"}
envFrom:
  - secretRef: {name: job-hunter}   # from the ExternalSecret
```

```bash
cat homelab-gitops/apps/job-hunter/kustomization.yaml   # images: newTag/digest set by CI
```

</div>

</details>

## Monitoring and Observability
{: #monitoring-and-observability }

<details class="project-iq" markdown="1" id="monitoring-and-observability-q1">
<summary>How do you know the system is healthy in production?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The best health signal is user-facing: after each scheduled run, a Slack message with found / new /
analyzed / drafted and any errors; no message at 08:00, 12:00 or 16:00 means something's wrong. Behind
it: Argo CD health, pod status and restarts, `/healthz` (LLM key, storage, LinkedIn connection, SMTP,
schedule, Slack), and the run history in the UI.

Deeper: [Operations and Observability](/posts/projects/job-hunter-agent/14-operations-and-observability/#application-and-infrastructure-monitoring)

</div>

<div class="iq-role" data-role="devops" markdown="1">

```bash
kubectl --context k3d-platform -n argocd get application job-hunter
kubectl --context k3d-platform -n job-hunter get pods
kubectl --context k3d-platform -n job-hunter logs deploy/job-hunter -c app --tail=50
```

Probes all hit `/readyz`, which checks only the process, so a slow dependency never restarts the pod.

</div>

<div class="iq-role" data-role="sre" markdown="1">

SLIs I'd define from data I already have: share of scheduled runs that succeed (from `runs`), share of
drafts with truthfulness flags, and LinkedIn errors per run. The golden signals at pod level (restarts,
memory) come from the platform.

A missing run used to produce silence. Now the app exports each profile's last successful scheduled run
as a gauge, seeded from the run history so a restart doesn't reset it. `JobHunterProfileStale` fires when
it's more than 4 days old, which a normal weekend never reaches.

</div>

</details>

<details class="project-iq" markdown="1" id="monitoring-and-observability-q2">
<summary>What do you log, measure and alert on?</summary>

<div class="iq-role" data-role="architect" markdown="1">

- **Logs:** app logs (scheduled run summaries as JSON, warnings for failed research, facts, news or Slack)
  and the sidecar's request lines, to stdout.
- **Measure:** per run counts and duration (`runs`), every agent call with its result (`agent_results`),
  OpenTelemetry spans per request and agent call (instrumented, not yet exported).
- **Alert:** Slack after each scheduled run, including errors. Pod-level alerts depend on the platform.

Deeper: [Alerting and escalation](/posts/projects/job-hunter-agent/14-operations-and-observability/#alerting-and-escalation)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```python
with tracer.start_as_current_span(f"agent {self.agent_type}") as span:
    span.set_attribute("app.agent.type", self.agent_type)
    span.set_attribute("app.agent.task", task_type)
    span.set_attribute("app.agent_result.id", record.id)
```

The span carries the `agent_results` id, so a slow span leads straight to the stored input and output.
LLM spans add model and token counts (`gen_ai.usage.input_tokens`).

</div>

<div class="iq-role" data-role="sre" markdown="1">

What I alert on, by symptom:
- runs completing below the SLO, or a profile without a success in 4 days;
- the daily upkeep failing for 2 days;
- the UI failing its probe;
- the sidecar OOMKilled or crash-looping.

Not on individual LLM retries or a single failed company lookup: those are warnings, not incidents. When
I checked the pod-level alerts the platform already sent for `job-hunter`, crash loops were covered but a
single OOM kill wasn't. So `ContainerOOMKilled` was added, for every namespace. Still missing: a specific
message for an expired LinkedIn session.

</div>

</details>

<details class="project-iq" markdown="1" id="monitoring-and-observability-q3">
<summary>Walk me through how you would troubleshoot a production issue in this system.</summary>

<div class="iq-role" data-role="architect" markdown="1">

Take the real one: "Discover jobs failed: SSE stream ended without a response." I'd go outside-in: the
run's error names LinkedIn, so the sidecar; pod status shows the `linkedin` container restarted; its last
state says OOMKilled; the limit was 2 GiB, and `/dev/shm` (a memory volume) counts against it. Fix: 3 GiB,
through a homelab-gitops PR. Verify: re-run discovery, no restart. Then write it down as a lesson.

Deeper: [Incident and problem management](/posts/projects/job-hunter-agent/14-operations-and-observability/#incident-and-problem-management)

</div>

<div class="iq-role" data-role="devops" markdown="1">

```bash
kubectl -n job-hunter get pods                                  # RESTARTS 1
kubectl -n job-hunter get pod -l app.kubernetes.io/name=job-hunter \
  -o jsonpath='{range .items[0].status.containerStatuses[*]}{.name} {.restartCount} {.lastState.terminated.reason}{"\n"}{end}'
kubectl -n job-hunter logs deploy/job-hunter -c linkedin --previous | tail
```

The fix shipped as a two-line change to `resources` in a PR; Argo CD rolled it out.

</div>

<div class="iq-role" data-role="sre" markdown="1">

My order: is it widespread (all profiles, or one keyword)? what changed (a deploy, a sidecar upgrade,
LinkedIn)? which hop (run errors name the source)? then the container's last state and logs. Mitigate
first (turn the profile off if LinkedIn is pushing back), fix second, write the lesson third.

```bash
kubectl -n job-hunter get events --sort-by=.lastTimestamp | tail -20
```

</div>

</details>

## Cost, Maintenance and Support
{: #cost-maintenance-and-support }

<details class="project-iq" markdown="1" id="cost-maintenance-and-support-q1">
<summary>What drives the cost of running the system, and how do you keep it under control?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Money: close to nothing. A local model, a pod on hardware I already run, Supabase and Slack free tiers,
free public data. The costs that matter are different: my time, and LinkedIn goodwill. Both are
controlled by design: the app does the reading and drafting, and the volume caps keep traffic low.
If I switched to a cloud LLM, tokens would become the main cost, at roughly five calls per drafted job.

Deeper: [Budget and resource planning](/posts/projects/job-hunter-agent/03-product-planning/#budget-and-resource-planning)

</div>

<div class="iq-role" data-role="devops" markdown="1">

Resource requests are sized from what I observed: `app` 50m / 192 MiB (limit 768 MiB), `linkedin`
100m / 1 GiB (limit 3 GiB after an OOMKill at 2 GiB). Nothing autoscales.

```bash
kubectl -n job-hunter top pod --containers
```

</div>

<div class="iq-role" data-role="sre" markdown="1">

Capacity to watch: sidecar memory peaks during searches, and Supabase free-tier limits (size, inactivity).
A monthly look at both is enough at this scale.

</div>

</details>

<details class="project-iq" markdown="1" id="cost-maintenance-and-support-q2">
<summary>How is the system maintained and supported after go-live?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I own it alone. Maintenance is mostly external change: LinkedIn's pages (contract tests catch parser
breaks), the MCP server (pinned, upgraded only to releases at least two weeks old), the model (re-run the
six-posting evaluation before switching), and dependencies (`uv lock --upgrade` plus the gates). Support
is a runbook table built from incidents that actually happened.

Deeper: [Support and Maintenance](/posts/projects/job-hunter-agent/16-support-and-maintenance/#patch-and-upgrade-management)

</div>

<div class="iq-role" data-role="devops" markdown="1">

Upgrading the sidecar:

```bash
crane digest docker.io/stickerdaniel/linkedin-mcp-server:<version>   # pin by digest
# edit deployment.yaml image, PR, merge; then
kubectl -n job-hunter exec deploy/job-hunter -c linkedin -- python -m linkedin_mcp_server --status --chrome-path=<path>
uv run pytest tests/test_linkedin.py      # contract tests in the app repo
```

The sidecar image isn't in Dependabot's scope (it's pinned in homelab-gitops, not this repo), so its
upgrades stay a deliberate step with the allow-list re-check.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Toil today: re-signing in to LinkedIn when the session expires, and applying migrations by hand. Both are
rare. The first one I'd reduce is noticing an expired session: a specific Slack message instead of a
generic discovery error.

</div>

</details>

## Leadership, Stakeholders and Governance
{: #leadership-stakeholders-and-governance }

<details class="project-iq" markdown="1" id="leadership-stakeholders-and-governance-q1">
<summary>How did you communicate the architecture and progress to stakeholders and executives?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The stakeholder was me, so "communication" was mostly writing things down for future me: phase tables
with "done when" criteria, a README that leads with what the tool will never do, and this playbook. If I
were pitching it to a team, I'd use the animated system diagram and three numbers from the run history
(postings found, drafts made, drafts flagged by the checks), and lead with the approval gate, because
"an AI applying for jobs in your name" is the fear to address first.

Deeper: [Product roadmap](/posts/projects/job-hunter-agent/03-product-planning/#product-roadmap)

</div>

</details>

<details class="project-iq" markdown="1" id="leadership-stakeholders-and-governance-q2">
<summary>How do you document and govern architectural decisions?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Decisions are recorded with their reasons in the architecture post's decision table and across this
playbook; platform changes go through pull requests even with one reviewer, so every change to how the
app runs has a dated record. Governance that matters is enforced in code: manual approval only, the
read-only tool allow-list, warnings that block approval, and the platform's admission policies.

The decisions are MADR files in the repo (`docs/adr`), nine so far, published on the
[Architecture Decision Records](/posts/projects/job-hunter-agent/architecture-decision-records/) page by the same sync script as the platform project.

Deeper: [Architectural decision records](/posts/projects/job-hunter-agent/05-technical-architecture/#architectural-decision-records)

</div>

</details>

<details class="project-iq" markdown="1" id="leadership-stakeholders-and-governance-q3">
<summary>How did you bring other engineers onto the project?</summary>

<div class="iq-role" data-role="architect" markdown="1">

There weren't others; I built it with an AI coding assistant, reviewing every change. The onboarding I
did invest in is the kind that would serve a new engineer: a quick start that works with one key, fakes
for every outside system so tests run offline in two seconds, and this playbook as the "why" tour. Working
with an AI assistant taught me the same thing onboarding a junior does: give it fast feedback (tests,
screenshots) and check its claims against the code.

Deeper: [Onboarding documentation](/posts/projects/job-hunter-agent/15-documentation-and-knowledge-transfer/#onboarding-documentation)

</div>

<div class="iq-role" data-role="developer" markdown="1">

A new developer's first hour:

```bash
git clone <repo> && cd job-hunter-agent
make install && cp .env.example .env    # set LLM_API_KEY
make test                               # all green, offline
make dev                                # UI at http://127.0.0.1:8000
```

Then read `tests/conftest.py` (the fakes explain every integration) and `pipeline.py` (the whole flow
in one file).

</div>

</details>

## Lessons Learned and Trade-offs
{: #lessons-learned-and-trade-offs }

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q1">
<summary>What was the hardest technical problem, and how did you solve it?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Keeping a helpful model honest. The local model, asked to tailor my resume, added tools the posting
wanted (OpenTelemetry, Backstage) and, given a 28k-character resume to rewrite, timed out or drifted. Two
changes solved it: ask for line edits that code applies (it can only rephrase lines that exist), and check
the output deterministically for numbers, tools and phrases the original doesn't have, blocking approval
on any flag. The second hardest was LinkedIn in Kubernetes: the in-cluster sign-in took three attempts.

Deeper: [Feature development](/posts/projects/job-hunter-agent/09-implementation/#feature-development)

</div>

<div class="iq-role" data-role="developer" markdown="1">

The check's subtle part was false positives: capitalised common words, compound words ("Azure-native"),
"Pub/Sub", and phrases split into words ("Bring", "Own", "Keys" from "Bring Your Own Key (BYOK)"). The
fix was to group consecutive capitalised words into one phrase with its acronym:

```python
if acronym := _ACRONYM_AFTER.match(description, run[-1].end()):
    phrase += f" ({acronym.group(1)})"
    acronyms_taken.add(acronym.start(1))
```

and to flag the phrase only if neither it, its acronym, nor each of its words is supported.

</div>

</details>

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q2">
<summary>What would you do differently if you started again?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Three things: design the LinkedIn sign-in for Kubernetes from day one (exec into the running sidecar, a
home folder on the volume, the image's own Chromium); put pacing between LinkedIn requests in from the
start instead of only capping volume; and use a persistent scheduler (or CronJobs) so a restart doesn't
lose a due run. I'd keep: manual approval, line edits, deterministic checks, reusing the platform.

Deeper: [Retrospectives](/posts/projects/job-hunter-agent/18-continuous-improvement/#retrospectives)

</div>

<div class="iq-role" data-role="developer" markdown="1">

I'd write the UI's render functions with tests from the start (even a small DOM test runner), store
`accept_warnings` with the approval, and wrap the multi-step "set default resume" in a database
transaction (an RPC) instead of two REST calls.

</div>

<div class="iq-role" data-role="devops" markdown="1">

I'd load-test the sidecar's memory with one real search before the first deploy (the OOMKill at 2 GiB
was predictable), set the OTLP endpoint on day one, and never test a copied LinkedIn session against the
real account: it triggered a redirect loop and HTTP 429 and logged me out.

</div>

</details>

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q3">
<summary>What technical debt exists today, and how would you pay it down?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Debt | Payoff plan |
|---|---|
| No pacing within a run | Random 20–60 s pauses between LinkedIn calls |
| Traces not exported | Set the OTLP endpoint |
| Scheduler in memory | Persistent job store or CronJobs |
| `accept_warnings` not stored | A column and a test |
| Manual production migrations | DB password in OpenBao, gated `supabase db push` |
| Single default user | Map Keycloak subject to `user_id`, use RLS |

One item per phase, so it shrinks.

Deeper: [Technical debt tracking](/posts/projects/job-hunter-agent/09-implementation/#technical-debt-tracking)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- `pipeline.py` does too much; split discovery, drafting and research.
- Re-scoring leaves old `job_scores` rows; reads take the newest.
- A validation error with a list `detail` shows as "[object Object]" in the UI.
- The DOCX-with-tables fix has no regression test.

</div>

<div class="iq-role" data-role="devops" markdown="1">

- No rehearsed restore yet (first drill 2026-10-31).
- Egress isn't restricted by NetworkPolicy.
- No specific alert for an expired LinkedIn session.

```bash
kubectl -n velero get podvolumebackups.velero.io | grep job-hunter   # the drill's step 4: both volumes copied
```

</div>

</details>

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q4">
<summary>Where does the system go next, and how does the architecture support that?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Next: pacing and an expired-session alert (LinkedIn safety), trace export and a run SLO (operability),
interview outcomes on applications (so the shortlist confidence can be checked against reality). The
architecture supports that because every integration is behind an interface and every run and agent call
is already recorded. Multi-user is the big one: the schema has `user_id` and RLS everywhere, so the work is
in auth and in giving each user their own browser session. And at the end, it's built to be switched off:
the decommissioning steps are written down.

Deeper: [Roadmap refinement](/posts/projects/job-hunter-agent/18-continuous-improvement/#roadmap-refinement)

</div>

</details>

{% include project-nav.html %}
