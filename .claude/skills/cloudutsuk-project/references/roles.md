# Role perspectives for interview answers

Every interview question is answered from the roles the bank lists for it in
`_data/project_framework.yml` (`interview.categories[].questions[].roles`). Architect is always first. A
role answer is what *that* person would say in an interview about this project: same facts, different
lens. Don't repeat the architect answer in other words; each role adds what only it would know.

## Markup

```markdown
<details class="project-iq" markdown="1" id="<category-anchor>-q<N>">
<summary>The bank's question, verbatim</summary>

<div class="iq-role" data-role="architect" markdown="1">

Architect answer…

</div>

<div class="iq-role" data-role="developer" markdown="1">

Developer answer…

</div>

</details>
```

- One `iq-role` div per role in the bank's list, in the bank's order, blank lines around the content.
- `{% include project-iq-roles.html %}` once, right after the first `project-nav` include. It turns the
  divs into tabs and adds the "Answer as" filter. Without JavaScript all roles show stacked and labelled.
- Tables, code blocks, callouts and Mermaid work inside the divs (`markdown="1"`). No flow-anim inside.
- Snippets with `{{ … }}` or `{% … %}` (Helm templates, GitHub Actions expressions, Jinja) must be wrapped
  in `{% raw %}` … `{% endraw %}`, or Jekyll's Liquid tries to run them and the build warns or breaks.

## Length and shape

120 to 300 words per role answer. Each non-architect answer has, where it fits:

1. **Concept checklist**: the key concepts of the technology involved, each **tied to this project's
   code** in one line ("Hooks: `useEffect(() => loadRepositories(), [org])` refetches when the route
   param changes"). This is what interviewers probe for a developer, DevOps or SRE role.
2. **A short real snippet** (5 to 15 lines) from the source, with identifiers redacted.
3. **Common commands** in a `bash` block, the ones you'd actually type for this project.
4. **One honest gap or gotcha** from the code, if there is one. Interviewers trust candidates who know
   where their system is weak.

## Ground it in the source

If the project's source repo is available, read it (read-only) before writing developer, DevOps and SRE
answers. Prefer what the code does over what the docs say, and when they disagree:

- write what the code does;
- fix the architect answer (and note it for the playbook posts) if it repeated the docs' claim;
- tell the user what you corrected.

Redact like the playbook: no company, org, product, host, registry, vault, subscription or ticket names.
Replace them with generic ones (`<registry>`, `org-a`, `<dashboard-host>`). Never quote secrets,
connection strings or customer data. Never invent code: if a detail isn't in the source or the playbook,
describe the concept generally and say what you'd check.

## Developer

Focus: how the code works, the framework concepts behind it, and how you'd work on it day to day.

**React frontend** (cover the ones the code actually uses):
single-page application and client-side routing; components (function components, composition);
JSX; React Router (`<Routes>`, `<Route>`, `useParams`, `<Link>`, catch-all on the server for SPA routes);
props and state (`useState`); component lifecycle as effects (`useEffect` with dependency arrays,
cleanup functions for timers and listeners); other hooks (`useMemo`, `useCallback`, `useRef`,
`useContext` and custom hooks); state management (local state, Context, lifting state up, server state,
URL state; Redux or React Query if used); virtual DOM and reconciliation; the `key` prop in lists;
event handling (`onClick`, `onChange`, `preventDefault`); controlled forms and submission; conditional
rendering (early returns for loading and error, `&&`, ternaries); data fetching (Axios or fetch, async
in effects, `Promise.all`); environment variables (`REACT_APP_*` for CRA, `VITE_*` for Vite); build
tooling (CRA, Vite), StrictMode, testing (Jest, React Testing Library). Common commands:
`npm ci`, `npm start` / `npm run dev`, `npm test`, `npm run build`.

**Other frontends**: map the same checklist to the framework (Angular modules, services, RxJS;
Vue components, reactivity, Pinia; Backstage plugins, API refs, extensions).

**Python API (FastAPI / Flask / Django)**:
ASGI vs WSGI and the server (Uvicorn, Gunicorn); routing and path/query parameters; request and
response models (Pydantic), validation and the automatic OpenAPI docs; `async def` vs `def`, the event
loop and not blocking it (`asyncio.to_thread`, `aiofiles`, async drivers); dependency injection
(`Depends`); error handling (`HTTPException`, status codes, exception handlers); middleware (CORS,
logging); startup and shutdown (lifespan or `on_event`); background tasks; configuration from
environment variables; serving static files; testing (`pytest`, `TestClient`/`httpx`). Common
commands: `uvicorn app.main:app --reload`, `pip install -r requirements.txt`, `pytest`, `ruff`.

**Other backends**: ASP.NET Core (controllers vs minimal APIs, DI container, middleware pipeline,
EF Core, `IOptions`, hosted services), Node/Express or Backstage backend plugins (routers, middleware,
`createBackendPlugin`, core services), Go (net/http, handlers, context). Same idea: concepts tied to code.

**Data access**: connection handling and pooling; ORM or query builder (SQLAlchemy, EF Core, Knex);
transactions; migrations (Alembic, EF migrations, Knex); parameterized queries; caching (Redis
`GET`/`SETEX`, key design, TTLs, invalidation); file-based storage (paths, encoding, atomic writes).

**Batch jobs and integrations**: entrypoints and configuration; HTTP clients and sessions; retries and
backoff (`tenacity`), which errors to retry; rate limits; pagination; auth flows (GitHub App JWT to
installation token, OAuth, tokens); concurrency (threads, asyncio); idempotency; structured logging.

## DevOps

Focus: how it's built, packaged, configured, deployed and promoted, as implemented.

Concepts to cover where relevant: multi-stage Dockerfiles, layer caching, base images, non-root users,
image tags (SHA, `latest`, semver) and registries; Kubernetes objects (Deployment, Service, Ingress,
ConfigMap, Secret, PV/PVC and access modes, CronJob with `concurrencyPolicy`, `backoffLimit`,
`ttlSecondsAfterFinished`, ServiceAccount, workload identity); Helm (charts, library charts, values per
environment, `values.schema.json`, `helm template`/`lint`); GitOps (Argo CD sync, promotion PRs,
`dev-pause`-style overrides); CI (change detection, matrix builds, reusable workflows, environments
and required reviewers, OIDC to registries and clouds); secrets (Key Vault, External Secrets, CSI
driver); IaC (Terraform, Terragrunt); local environments (k3d, kind, Docker Compose, Taskfile/Makefile).
Common commands: `docker build`, `helm template`, `helm upgrade --install`, `kubectl get/describe/logs`,
`kubectl create job --from=cronjob/...`, `kubectl port-forward`, `argocd app sync`, `task …`.

## SRE

Focus: how you know it works, how it fails, and what you do about it.

Concepts to cover where relevant: SLIs and SLOs (and error budgets) that match what users feel;
the golden signals (latency, traffic, errors, saturation); liveness vs readiness vs startup probes and
what each should check; alerting on symptoms, with severity and routing; dashboards; logs, metrics and
traces (OpenTelemetry), correlation IDs; capacity (requests and limits, HPA, PDB, topology spread);
dependency failure handling (timeouts, retries, circuit breakers, graceful degradation, caches as
optional); backups and tested restores, RPO and RTO; incident response (contain, diagnose, mitigate,
recover, review) and runbooks; toil reduction. Common commands: `kubectl top`, `kubectl get events`,
`kubectl rollout status/undo`, `kubectl logs -f`, a health `curl`, the queries you'd run.

## Architect

The existing answer style (see SKILL.md step 5): the decision, the trade-off, something concrete, and
`Deeper:` links to the playbook. Architect answers stay first in every question.
