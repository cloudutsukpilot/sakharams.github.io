---
layout: post
title: "OnePlatform: Interview Questions"
date: 2026-10-06 00:30:00 +0530
categories: [projects, oneplatform]
tags: [Projects, OnePlatform, Interview Prep, Architecture]
description: "Software architect interview questions answered through OnePlatform: a Backstage developer portal with a .NET middleware, role-gated self-service and PHI-aware telemetry."
project: oneplatform
project_interview: true
image:
  path: /assets/img/projects/oneplatform/interview-questions.webp
  alt: "OnePlatform: Interview Questions - Projects hero image"
---

OnePlatform is the project I'd pick when an interviewer wants depth on **platform engineering**:
a Backstage portal in TypeScript, a .NET 10 middleware, PostgreSQL, about 45 custom plugins and 50
custom scaffolder actions, 16 platform roles, PHI rules, and templates that can change real Azure and GitHub
resources. The questions below are generic. The answers are how I'd answer them with this project.
Click a question to open the answer, and follow the links to the playbook when the interviewer pushes
for detail.

<!-- more -->

{% include project-nav.html %}

{% include project-iq-roles.html %}

The one-line pitch I open with: *"We built an internal developer portal on Backstage, backed by a .NET
middleware, that turned Azure and GitHub requests, access reviews, monitoring, licensing and FinOps into
self-service workflows that check your role and environment on the server before they act, and leave
an audit trail."*

## Project Overview and Your Role
{: #project-overview-and-your-role }

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q1">
<summary>Walk me through a frontend or backend application you designed and built end to end.</summary>

<div class="iq-role" data-role="architect" markdown="1">

OnePlatform is our internal developer portal. It's two systems that look like one:

- **The Backstage portal** (Node 24, React 18, TypeScript, PostgreSQL 16) owns identity, permissions,
  the catalog and every self-service template. On top of stock Backstage we added about 45 frontend
  and backend plugins, about 50 scaffolder actions, 40+ form field extensions and 45+ templates.
- **A .NET 10 middleware** (an ASP.NET Core API on AKS plus Azure Functions) owns the data-heavy and
  scheduled work: user-access audits, FinOps cost imports, file and SQL Agent monitoring, terminations.

A typical flow: an engineer picks *Create Azure Function App*, fills a form whose pickers only list
subscriptions they may use, and submits. The backend checks their role and the target environment,
validates prerequisites, dispatches a Terraform workflow in the infrastructure repo, waits for it, and
notifies them. Every step is in the task log.

It grew from a read-only catalog in early 2024 to 80 features by late 2026, at roughly a hundred
commits a month.

Deeper: [System context](/posts/projects/oneplatform/05-technical-architecture/#system-context-and-component-architecture),
[feature catalog](/posts/projects/oneplatform/03-product-planning/#feature-catalog).

</div>

<div class="iq-role" data-role="developer" markdown="1">

How I'd walk a developer through the two codebases:

- **Portal monorepo** (Yarn 4 workspaces, TypeScript 5.9, Node 24, Backstage 1.53): `packages/app` is
  the frontend shell, `packages/backend` the backend (with `custom_services/` holding the scaffolder
  actions and `permissions/` the policy and PHI filter), and `plugins/` the feature plugins, usually as a
  `foo` + `foo-backend` pair.
- **Middleware** (.NET 10): `Middleware.Api` (controllers, `Program.cs`, extension methods per concern),
  `Middleware.Services/<Feature>` (services, repositories, a `DbContext` per feature),
  `Middleware.Functions` (timer functions), and unit and integration test projects.

A backend plugin, in the new backend system, declares the services it needs and gets them injected:

```ts
export const temporalHitlPlugin = createBackendPlugin({
  pluginId: 'temporal-hitl',
  register(env) {
    env.registerInit({
      deps: { database: coreServices.database, httpAuth: coreServices.httpAuth,
              httpRouter: coreServices.httpRouter, permissions: coreServices.permissions, /* … */ },
      async init({ database, httpRouter, /* … */ }) { /* migrate, build router */ },
    });
  },
});
```

```bash
yarn install && yarn tsc && yarn test        # unit lane
yarn start-backend:local & yarn start        # backend :7007, frontend :3000
dotnet test test/Middleware.Tests.Unit
```

</div>

<div class="iq-role" data-role="devops" markdown="1">

The deployable units and how they ship:

| Unit | Artifact | Deploy |
|---|---|---|
| Portal | One image (`node:24-trixie-slim`), tag `YYYY.MM.DD.<run>` | Argo CD from a charts repo; `promote-staging.yml` / `promote-prod.yml` copy the tag |
| Middleware API | Image per environment | Helm from `HelmCharts/`, manual dispatch |
| Middleware Functions | Function App package | `middleware-functions-deploy.yml` |
| EF migrations | Migration bundles (`efbundle-*`) | `middleware-ef-migrations-deploy.yml`, before the API |

The portal image is built with BuildKit: the registry token and the CA bundle are `--mount=type=secret`,
dependency installs use a skeleton of `package.json` files for layer caching, and the runtime stage is
production-only (`yarn workspaces focus backend --production`).

```bash
DOCKER_BUILDKIT=1 docker build . -t portal:local \
  --secret id=jfrog_token,env=REGISTRY_TOKEN --secret id=ca_bundle,src=./corp-ca.pem
gh workflow run "Platformone Release"
gh workflow run "Promote to Production" -f IMAGE_TAG=2026.10.05.3
```

What I'd fix first on the platform side: probes and resource requests on both workloads; neither the
portal manifest nor the middleware chart defines liveness or readiness probes.

</div>

</details>

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q2">
<summary>What business problem did it solve, and how did you know it was working?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The problem wasn't missing tools; it was too many tools, each behind its own gate. Azure resources sat
across more than twenty subscriptions, code across three GitHub organizations, and access to Key Vault,
App Configuration, Artifactory and SonarQube each had its own request path. Three costs kept recurring:

- **Waiting:** a routine change, like starting a QA VM, queued for someone with elevated rights.
- **Inconsistency:** two engineers creating "the same" Function App got different names and settings.
- **Evidence:** "who had access, and who approved it?" was spread across email, tickets and portal logs.

The portal fixed those by making requests into forms that check permissions, act through identities we
control, and record everything. Compliance became a by-product: access reviews, terminations and
license approvals produce their own evidence because they run through the portal.

How we know it works: Adoption Insights (Kusto over the portal's own telemetry) shows which roles use
which templates and dashboards, and scaffolder history gives run counts and success rates.

> **TODO:** Add the before/after numbers: ticket volume and turnaround for the top request types
> before the portal, and monthly active users or template runs now. This is the strongest line in the
> interview.
{: .prompt-warning }

Deeper: [Business problem](/posts/projects/oneplatform/01-vision-and-business-context/#business-problem-and-opportunity).

</div>

</details>

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q3">
<summary>What was your role, and which architectural decisions did you own?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I'm a team member and lead on the platform team that builds and runs OnePlatform, so I'd describe the
architecture as **ours**, and be specific about the decisions I'd defend in the room:

| Decision | Why |
|---|---|
| Backstage as the framework | Catalog, scaffolder, permissions and TechDocs out of the box; plugins for the rest |
| A separate .NET middleware for data pipelines | Different workload and skills; a 1 GB import never shares a process with the UI |
| Entra groups are roles | One source of truth, already covered by access reviews |
| Permission enforced on the server, with role-mapped permissions, environment scoping and hard blocks | Hiding a button is UX; the 403 is the control |
| PHI filtered in the backend, fail closed | Frontend filtering is bypassable with DevTools |
| One catalog provider per Azure subscription (built; not yet merged to `main`) | Fixes a database lock and isolates failures |
| GitOps with Argo CD, build once and promote by tag | Audit trail and rollback through Git |

The other thing I'd claim as a lead is the **process**: every feature goes through a reuse check, then
PLAN, DESIGN and IMPLEMENTATION documents, with tests written in the same phase as the code.

> **TODO:** Name the two or three of these decisions you personally drove, and the team size you led.
> Interviewers will ask "what did *you* do?" right after this answer.
{: .prompt-warning }

Deeper: [ADRs](/posts/projects/oneplatform/05-technical-architecture/#architectural-decision-records).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Developer-level decisions I'd own, with where they show up:

- **Plugin pairs** with a typed API client registered in the frontend and a router in the backend, so
  every feature has the same shape.
- **`common-ui`** for loading, error, empty and *Unauthorized* states, so pages look and fail the same way.
- **Validate-then-act scaffolder actions** built with `createTemplateAction` and Zod input schemas.
- **Server-side permission checks** in each router (`permissions.authorize(...)`), with a 403 test per
  route.
- **Tests in the same phase as the code**, split by suffix: `.test.ts` for the unit lane,
  `.integration.test.ts` for Testcontainers.

```ts
const decisions = await permissions.authorize(
  permissionsToCheck.map(permission => ({ permission })), { credentials });
if (decisions[0]?.result !== AuthorizeResult.ALLOW) {
  throw new NotAllowedError('Permission denied: HITL approval role required');
}
```

The decision I'd revisit: the central policy returns `ALLOW` for any permission that isn't in the role
map. Every router checks its own permission, but a newly defined permission that nobody adds to the map is
granted to everyone, so I'd flip unmapped custom permissions to `DENY`.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Platform decisions I'd claim:

- **Build once, promote by tag.** The release workflow creates the date tag, and promotion edits only
  `image.tag` in the charts repo with `yq`. `promote-prod.yml` refuses a tag that's malformed or already
  live.
- **Secrets never in images or Git.** BuildKit secret mounts at build time; the Key Vault CSI driver for
  the portal; workload identity plus App Configuration references for the middleware.
- **Migrations as a deploy step** for the middleware, from a bundle, never at startup.
- **A pre-upgrade compatibility workflow** for Backstage upgrades.

```bash
yq '.image.tag' helm-charts/platformone/values-staging.yaml
yq -i '.image.tag = "2026.10.05.3"' platformone/values-prod.yaml
```

What I'd change: there are two deploy paths, the GitOps promotions and an older direct AKS deploy
workflow (`AKS-Platformone-Deploy.yml`). Two paths means production can drift from Git, so retiring the
direct one is the first clean-up.

</div>

</details>

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q4">
<summary>Who were the users and stakeholders, and how did their needs shape the design?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The portal's 16 platform roles are the best description of its users, because each role exists because a
group needed a different set of tools: engineers and architects, SRE and DevOps, data engineers and
analysts, QA and testers, operations, team leads, leadership, audit managers, Copilot report viewers
and admins.

Their needs shaped the design directly:

- **Many personas, one product** → one Create page that lists every template *and* every dashboard,
  filtered by permission, plus role-aware navigation. A new dashboard needs no new menu item.
- **Occasional users** (people who log in twice a month) → pickers instead of text boxes, in-form
  validation, and results pushed as notifications rather than spinners.
- **Operations staff without GitHub seats** → they trigger GitHub-hosted smoke tests through the
  portal's GitHub App identity, which saves licenses and keeps them out of repositories.
- **Security and compliance** → server-side permissions, PHI redaction and audit records everywhere.
- **Finance and cost-centre owners** → approval chains for Copilot licenses with chargeback fields.

Stakeholders with decision rights (cloud team on which resources are self-service, security on the
role model) shaped the guardrails more than the screens.

Deeper: [Personas](/posts/projects/oneplatform/01-vision-and-business-context/#target-users-and-personas).

</div>

</details>

## System Design and Architecture
{: #system-design-and-architecture }

<details class="project-iq" markdown="1" id="system-design-and-architecture-q1">
<summary>If you had to design this application from scratch on a whiteboard, with a frontend, a backend and a data store, how would you approach it?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I'd go in this order, saying each step out loud:

1. **Identity and authorization first.** A portal that can act on Azure and GitHub is only as safe as
   its permission model. So: SSO, roles from directory groups, and a deny-by-default policy (which ours isn't yet; see below) checked on
   the server for every route and template, with environment scoping.
2. **Read before write.** Start with a catalog (who owns what) and dashboards. That's exactly what
   OnePlatform's MVP was: no self-service actions for the first ten months.
3. **Split by workload.** The interactive portal (frontend + backend for frontend) is one system; data
   pipelines and scheduled jobs are another. They talk over an authenticated API.
4. **Act through controlled identities.** The portal acts via service principals and GitHub Apps with
   scoped rights. Users never get standing elevated access.
5. **Don't own what you don't need to.** Infrastructure changes go through Terraform workflows in the
   repos that own the state.
6. **Data store per owner.** Each plugin and each middleware feature owns its schema and migrations;
   reports read pre-aggregated views.

Then I'd draw it: browser → portal backend (auth, permissions, catalog, scaffolder, plugins) →
middleware API and Functions → PostgreSQL, with Azure, Graph, GitHub and Jira on the side. The
[animated system diagram](/posts/projects/oneplatform/05-technical-architecture/#system-context-and-component-architecture)
is the picture I'd sketch.

</div>

<div class="iq-role" data-role="developer" markdown="1">

On the whiteboard I'd add the developer-level contracts under each box:

1. **Identity**: `httpAuth.credentials(req, { allow: ['user'] })` in every user route, or `['service']`
   for machine callers.
2. **Authorization**: a named permission per action (`temporal-hitl.approve`), checked with
   `permissions.authorize` in the router and mapped to roles centrally.
3. **Validation**: Zod schemas for every body (`z.object({...})`), `InputError` → 400.
4. **Data**: a plugin-owned database through `coreServices.database`, Knex migrations run with
   `migrate.latest` at init.
5. **Frontend**: an API client built on `discoveryApi` + `fetchApi`, React Query for server state, shared
   states from `common-ui`.
6. **Errors**: Backstage error types (`NotAllowedError`, `NotFoundError`, `InputError`) so the error
   middleware maps them to 403, 404 and 400 consistently.

```ts
const decisionSchema = z.object({ comment: z.string().max(4000).optional() });
```

That set of contracts is what makes 45 plugins maintainable: a new feature fills in the same six slots.

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q2">
<summary>What are the main components, and how are responsibilities split between them?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Unit | Runs as | Responsibility |
|---|---|---|
| Portal frontend (React 18, Backstage new frontend system, MUI) | Served by the portal backend | Pages, template forms, 40+ field extensions, dashboards |
| Portal backend (Node 24, Backstage new backend system) | AKS, 2 replicas | Auth, permission policy, catalog, scaffolder with ~50 actions, ~45 plugins |
| Middleware API (ASP.NET Core, .NET 10) | AKS via Helm | Audits, FinOps, file and SQL monitoring, terminations, scorecards |
| Middleware Functions (Azure Functions v4) | Function App | Timer jobs: FOCUS import, inactivity scan, sprint predictability |
| PostgreSQL 16 | Shared server, TLS required | Plugin databases and middleware schemas |

The line that matters is **portal versus middleware**. The portal owns everything about the user:
identity, permissions, the catalog, templates. The middleware owns data pipelines: things that import
gigabytes, run on timers, or connect to SQL Server dynamically. Keeping that line clean is what lets a
1 GB cost import run without touching the UI's latency.

Inside the portal, every feature is a frontend plugin plus a backend plugin pair, and inside the
middleware every feature has its own `Services/<Feature>` folder, `DbContext` and schema. One more
rule: the browser only ever talks to the portal backend.

Deeper: [Component architecture](/posts/projects/oneplatform/05-technical-architecture/#system-context-and-component-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The responsibilities as code:

| Concern | Where | Example |
|---|---|---|
| Composition | `packages/backend/src/features.ts` | One `registerProductionFeatures()` with a composition test |
| Permission policy | `packages/backend/permissions/permissions.ts` | `CorePermissionPolicy` with hard blocks and a role map |
| Scaffolder actions | `packages/backend/custom_services/*.ts` | `azure:check-resource-exists`, `github:trigger-action` |
| Feature backends | `plugins/*-backend/src/router.ts` | Express router with Zod and permission checks |
| Frontend shell | `packages/app/src/App.tsx` | `createApp`, frontend modules, `PageBlueprint` |
| Middleware features | `Middleware.Services/<Feature>` | Service, repository, `DbContext` |

```ts
if (blockedPermissions.includes(request.permission.name)) {
  return { result: AuthorizeResult.DENY };   // catalog create/delete, template management
}
```

A boundary rule I'd point out: the browser only calls the portal backend, and the middleware plugin in
the portal is the only thing holding a middleware token. That keeps the frontend free of secrets and
makes the portal backend a single place to test authorization.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Component to Kubernetes object:

| Component | Objects |
|---|---|
| Portal | Deployment (2 replicas), Service, internal nginx Ingress, `SecretProviderClass` for Key Vault CSI |
| Middleware API | Helm release: Deployment (1 replica), Service, Ingress (long timeouts, large bodies), workload identity |
| Middleware Functions | Azure Function App per environment |
| Cluster add-ons | CoreDNS custom config for corporate zones, a runtime defender in production |

```bash
kubectl get deploy,svc,ingress,secretproviderclass -n <portal-ns>
kubectl get configmap coredns-custom -n kube-system -o yaml
helm list -n <middleware-ns>
```

The CoreDNS forwarding config is the piece people forget: without it, pods can't resolve on-premises SQL
Servers and file servers by name, and a whole class of features (monitoring, terminations) fails with
DNS errors that look like application bugs.

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q3">
<summary>Which non-functional requirements drove the architecture the most?</summary>

<div class="iq-role" data-role="architect" markdown="1">

- **Security first.** Every backend route checks the caller; permission is enforced on the server.
  This drove the custom permission policy, environment scoping and hard blocks (nobody, admins
  included, creates catalog entities or manages templates through the UI).
- **Data minimization.** PHI in telemetry is redacted on the server for users outside the allowed
  location, and the browser never receives the raw value. That made the backend the only path to
  telemetry.
- **Auditability.** Anything that changes access or infrastructure leaves a record: task log,
  database row, Jira ticket, or all three.
- **No catalog thrash.** Ingesting ~10,000 Azure resources must not lock the catalog for everyone. This
  became a requirement after it happened, and it drove the per-subscription provider design, which is
  built on a branch but not yet merged.
- **Upgradeability.** Backstage releases monthly, so customizations go into plugins and modules, never
  forks; `patch-package` is a last resort.
- **Testability.** Unit, integration and E2E lanes must pass; SonarQube gates new code.

User load was *not* a driver. It's an internal portal; the heavy load is background ingestion, which
is why the scalability work went there.

Deeper: [Non-functional requirements](/posts/projects/oneplatform/02-requirements-gathering/#non-functional-requirements).

</div>

<div class="iq-role" data-role="sre" markdown="1">

The NFRs as SLIs:

| NFR | SLI |
|---|---|
| Security | 403 tests per gated route pass; zero unmapped custom permissions |
| Data minimization | PHI filter applied on every telemetry response (unit-tested rules) |
| No catalog thrash | p95 portal latency during Azure ingestion vs outside it |
| Upgradeability | Minor versions behind the latest Backstage release |
| Middleware health | `/healthz` status (App Configuration and seven `DbContext` checks) |
| Template reliability | Scaffolder task success rate per template |

The SRE observation from the code: the catalog-lock problem is still live on `main`, because the
per-subscription providers aren't merged. So "p95 latency during ingestion" is the SLI I'd put on a
dashboard first; it shows whether the lock still hurts users.

```kusto
requests
| where cloud_RoleName has "<portal>"
| summarize p95=percentile(duration,95) by bin(timestamp, 15m)
```

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q4">
<summary>Which architectural options did you consider and reject, and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

- **Building a portal from scratch.** Rejected. Catalog, scaffolder, TechDocs and a permission framework
  are the parts we'd build badly ourselves. The accepted cost is a monthly upgrade.
- **Putting everything in Backstage plugins.** Rejected for data pipelines. FOCUS cost files, SQL Agent
  history across servers and multi-application terminations with dynamic SQL connections are not portal
  features, and .NET with EF Core and Functions suited them. The cost is two stacks and two pipelines.
- **Frontend-only permission checks.** Rejected outright. Hiding a button is UX; anyone can call the API.
- **Filtering PHI in the browser.** Rejected for the same reason: DevTools would show it.
- **The portal running Terraform itself.** Rejected. It dispatches workflows in the repos that own the
  state and waits for them, so the portal never holds Terraform state.
- **One catalog provider for all Azure subscriptions.** That was the original design; it wrote ~10,000
  entities in one mutation and locked the catalog. The replacement, one provider per subscription, is
  built and documented on a feature branch; `main` still runs the single provider.
- **Editing catalog YAML from the UI.** Rejected; teams' YAML stays theirs. Gaps are filled with an
  overlay ("catalog stitching" fragments) instead.

Deeper: [Technology selection](/posts/projects/oneplatform/05-technical-architecture/#technology-and-framework-selection).

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q5">
<summary>Monolith, modular monolith or microservices, what did you choose and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The portal is a **modular monolith**, and that's Backstage's design: one backend process composed of
plugins, each with its own routes, database and dependencies injected through the new backend system.
One image, one deployment, two replicas. Modules are isolated in code and data but share a process,
which keeps calls cheap and deployment simple.

The middleware is a **second, separate service** rather than another module, because its workload is
different (large imports, timers, SQL Server connections), and isolation matters: a slow import must
not hurt the UI.

So the honest label is **two modular monoliths plus serverless timer jobs**, not microservices. I'd
justify it like this: the team is small, the domain boundaries live inside the codebase (plugin pairs,
per-feature schemas), and the only boundary that needed independent scaling and failure isolation was
portal versus pipelines. Splitting 45 plugins into 45 services would add network calls, tracing and
release coordination for no benefit.

The test I'd apply before splitting further: does this part need a different release cadence, scaling
profile or failure domain? Only the middleware did.

Deeper: [Project structure](/posts/projects/oneplatform/08-development-preparation/#project-structure).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The modular monolith in code:

- **Backend features** are registered in one place, in a fixed order, with a test that boots the real
  graph:

```ts
// packages/backend/src/features.ts
export function registerProductionFeatures(backend) {
  backend.add(import('@backstage/plugin-app-backend'));
  backend.add(permissionPolicyModule);
  // … catalog modules, scaffolder modules, ~45 plugin backends
}
```

- **Each plugin is isolated by convention**: its own router prefix (`/api/<pluginId>`), its own database
  (Backstage gives each plugin a separate database or schema), its own migrations.
- **Frontend features** are composed as extensions; `App.composition.test.ts` checks the feature graph
  without a browser.

The developer gotcha in a monolith like this is coupling through shared packages: a plugin importing
another plugin's internals (for example the scaffolder action importing `getSubscriptionId` from the Azure
provider backend) ties their release together. A small shared `azure-common` package would break that
dependency.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Two monoliths, two pipelines:

- **Portal**: one image, two replicas, one release cadence for 45 plugins. A bad plugin release is a
  portal release, so rollback is per portal, not per plugin.
- **Middleware**: API image and Functions package released separately, plus migration bundles, each
  with its own workflow and path filters.

```bash
gh run list --workflow middleware-ci-build.yml --limit 3
gh run list --workflow Platformone-Build-.yml --limit 3
```

The operational case for the split shows in the ingress: the middleware's Ingress allows hour-long
timeouts and large request bodies for imports, which you'd never want on the portal's user-facing
ingress. Separate services let each have the settings its workload needs.

</div>

</details>

## Technology Choices
{: #technology-choices }

<details class="project-iq" markdown="1" id="technology-choices-q1">
<summary>Which technologies did you use across the stack, and why those?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Layer | Choice | Why |
|---|---|---|
| Portal framework | Backstage (new backend and frontend systems) | Catalog, scaffolder, permissions, TechDocs, plugin model |
| Runtime and language | Node 24, TypeScript 5, Yarn 4 workspaces | Backstage's stack; one monorepo |
| UI | React 18, MUI (v4 in the app and most plugins, v5 in some), MUI X DataGrid, Chart.js, Recharts, React Query | Backstage's component base; dense grids and charts |
| Middleware | .NET 10, ASP.NET Core, Azure Functions v4, EF Core | Data pipelines, timers, SQL Server, strong typing |
| Database | PostgreSQL 16 | Backstage needs it; one engine for both apps |
| Identity | Entra ID OAuth, GitHub App sign-in (secondary) | Corporate SSO; act-as-user on GitHub only when needed |
| Hosting | AKS, internal nginx ingress, Key Vault CSI, workload identity | Platform standard; no secrets in Git |
| Delivery | GitHub Actions, private registry, Argo CD, Helm | GitOps with immutable date tags |
| Telemetry | OpenTelemetry → Application Insights | Traces across both apps |
| Testing | Jest, Testcontainers, Playwright, xUnit, SonarQube | Separate lanes per kind of risk |

The theme is **use what the framework and platform already expect**. PostgreSQL for both apps is the
best example: Backstage needs it anyway, and one engine is cheaper to run, back up and secure than two.

Deeper: [Technology selection](/posts/projects/oneplatform/05-technical-architecture/#technology-and-framework-selection).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The stack with how each piece is used:

- **Backstage new backend system**: `createBackendPlugin`, `coreServices` (`httpRouter`, `httpAuth`,
  `permissions`, `database`, `scheduler`, `logger`), Express routers.
- **Backstage new frontend system**: `createApp`, `createFrontendModule`, blueprints (`PageBlueprint`,
  `ApiBlueprint` in one central API module, `FormFieldBlueprint` for scaffolder fields).
- **React 18 + MUI (v4 in the app and most plugins, v5 in nine) + MUI X DataGrid**, **TanStack Query** for server state.
- **Zod** for request validation, **Knex** for plugin databases, **Octokit** for GitHub, Azure SDKs.
- **.NET 10**: ASP.NET Core controllers, EF Core with Npgsql, `HttpClientFactory` with delegating
  handlers, Azure Functions isolated worker with timer triggers.
- **Tests**: Jest via `backstage-cli repo test`, Testcontainers, Playwright; xUnit in .NET.

```bash
yarn backstage-cli repo test --testPathIgnorePatterns='.*\.integration\.test\.tsx?$'
yarn test:integration          # Testcontainers PostgreSQL, maxWorkers=1
dotnet build Middleware.sln && dotnet test
```

Gotcha: MUI 4 (`@material-ui/core`) and MUI 5 coexist in the app, because Backstage's own components
are still partly on v4. Mixing them in one component causes theme and styling surprises; new code should
pick one, and the planned move to Backstage UI is the way out.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Delivery and runtime technologies:

| Tech | Detail |
|---|---|
| Docker BuildKit | Secret mounts, apt and Yarn cache mounts, three stages |
| Base image | `node:24-trixie-slim`, corporate CA certificates added with `update-ca-certificates`, `NODE_USE_SYSTEM_CA=1` |
| Registry | Private registry; CI authenticates with OIDC |
| GitOps | Argo CD watching a charts repo; promotion by `yq` edits |
| Secrets | Key Vault CSI driver (portal), workload identity + App Configuration (middleware) |
| Ingress | Internal nginx with TLS from Key Vault |
| Telemetry | OpenTelemetry Node SDK (`instrumentation.js` preloaded with `--require`) and the .NET Azure Monitor exporter |

```bash
kubectl exec deploy/<portal> -n <ns> -- node -e "console.log(process.env.NODE_USE_SYSTEM_CA)"
```

Gotcha: the image has a Docker `HEALTHCHECK` calling `/healthcheck/ready`, which Kubernetes ignores.
The same URL should be the readiness probe in the manifest; today nothing tells Kubernetes the pod is
unready.

</div>

</details>

<details class="project-iq" markdown="1" id="technology-choices-q2">
<summary>How do you evaluate and choose between competing technologies?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I weigh four things, in this order:

1. **Fit to the workload.** The middleware is .NET rather than more Node plugins because its work is
   batch data processing with EF Core migrations, SQL Server access and timers; Azure Functions gives
   timers without running a scheduler.
2. **Operational cost over time.** For Backstage the big cost is staying current with monthly releases.
   We accepted it, and then reduced it with a pre-upgrade compatibility workflow.
3. **Security model.** How does the technology authenticate and where do secrets live? Workload identity
   and the Key Vault CSI driver won over Kubernetes secrets in Git.
4. **Reversibility.** Backstage's plugin model means a custom plugin can be replaced by a community one
   later, and vice versa.

We also have a written **build-decision guide** in the repo that answers "where does this go?" before
code is written: catalog entity or database table, new plugin or extension of an existing one. Its rule
of thumb is "extend, don't add": a new GitHub report becomes a tab in the existing GitHub plugin, not a
fifth GitHub plugin.

For anything hard to reverse, it gets an ADR with the consequence written down, for example "Backstage:
monthly upgrade cost".

</div>

<div class="iq-role" data-role="developer" markdown="1">

How I'd evaluate a library inside Backstage specifically:

1. **Does Backstage already provide it?** Discovery, fetch, identity, cache, scheduler and database are
   core services; adding axios or a cron library is usually a smell.
2. **Does it work with the new frontend and backend systems?** A community plugin without `/alpha`
   exports for the new frontend system means wrapping it ourselves (the app uses
   `@backstage-community/plugin-sonarqube/alpha` and similar).
3. **Can it be tested in our lanes?** Testcontainers support was a deciding factor for database work.
4. **What's the upgrade cost?** Every dependency is something the monthly Backstage upgrade has to
   carry; `patch-package` patches are the last resort.

```ts
import sonarQubeAlphaPlugin from '@backstage-community/plugin-sonarqube/alpha';
import datadogAlphaPlugin from '@roadiehq/backstage-plugin-datadog/alpha';
```

For the middleware the evaluation was different: EF Core migrations, SQL Server access and timers made
.NET with Functions the right fit, and the repo's build-decision guide records "where does this go?"
before anyone writes a new plugin.

</div>

</details>

<details class="project-iq" markdown="1" id="technology-choices-q3">
<summary>Where did you build, and where did you buy or reuse?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Reused:** Backstage itself (catalog, scaffolder, TechDocs, search, permission framework), community
plugins for SonarQube, Statuspage and Datadog cards, the platform's AKS, Argo CD, Key Vault and private
registry, and Azure Functions for timers.

**Built:** the parts that encode *our* organization:

- the **permission policy** with 16 roles and hard blocks, plus environment scoping in validation actions;
- ~50 **scaffolder actions** that validate before they act (permissions, prerequisites, name
  availability) and then call Azure, Graph, GitHub or Terraform workflows;
- ~45 **plugins** for operations dashboards, audits, Copilot and license management, FinOps and admin;
- the **PHI filter** framework;
- the **.NET middleware** for imports, audits and terminations;
- **`common-ui`**, a shared component library so every plugin looks and behaves the same.

**Extended rather than built:** where upstream almost fit, we used `patch-package` or overlays instead
of forks. Catalog stitching adds fields we don't own without editing teams' YAML.

My rule: build what's specific to how the organization works, reuse the framework for everything
generic, and keep the custom parts in plugins so upgrades stay possible.

Deeper: [Implementation](/posts/projects/oneplatform/09-implementation/#api-and-ui-implementation).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Reused versus built on the platform side:

- **Reused**: AKS, Argo CD, the internal ingress controller, Key Vault and the CSI driver, workload
  identity, the private registry and its npm proxy (`COREPACK_NPM_REGISTRY` points at it), Application
  Insights, the org's SonarQube.
- **Built for this repo**: the release and promotion workflows, the pre-upgrade compatibility workflow, the
  release-notes workflow, the CoreDNS forwarding config, the middleware's Helm chart and migration
  workflows.

```bash
gh workflow run platformone-pre-upgrade-compatibility.yml
gh run watch
```

The compatibility workflow is the piece I'd describe in an interview: it runs every lane (Node versions,
PostgreSQL 16 and 17, E2E, an image preflight) against an upgrade branch before it merges. It turns the
monthly Backstage upgrade from a gamble into a checklist.

</div>

</details>

## Frontend Architecture
{: #frontend-architecture }

<details class="project-iq" markdown="1" id="frontend-architecture-q1">
<summary>How is the frontend (or user-facing interface) structured, in terms of framework, routing, components and state?</summary>

<div class="iq-role" data-role="architect" markdown="1">

It's a React 18 single-page app on **Backstage's new frontend system**, which is plugin-based. Each
feature contributes an **API client** (registered in one central API module with `ApiBlueprint`), a
**route** and a **nav item**. The shell in `packages/app` composes them, and a composition test
(`App.composition.test.ts`) checks the real feature graph without a browser.

**Components** come from MUI plus our internal `common-ui` library (page header, loading and empty
states, expandable instructions, summary bubbles, a standard *Unauthorized* view). A repository rule
says contributors, and the AI assistant, reach for `common-ui` before writing a component.

**State** is mostly server state, handled with React Query (caching, refetching, loading and error
states). Tables are MUI X DataGrid. There's no global store; the source of truth is the backend.

**Forms** are where the portal is most custom: the scaffolder renders templates from YAML, and 40+
custom **field extensions** are ordinary React components registered as extensions. They render
pickers that only list valid choices (subscriptions, VMs, vaults, GitHub teams, Entra users).

Navigation is **role-aware**: admins map roles to sidebar entries in a database-backed admin page, but
it never replaces the server's permission check.

Deeper: [Information architecture](/posts/projects/oneplatform/04-user-experience-and-design/#information-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

React and Backstage concepts, as the app uses them:

- **SPA and routing**: `createApp` from `@backstage/frontend-defaults`; pages are extensions
  (`PageBlueprint.make({ params: { path, loader } })`), and React Router (`<Routes>`, `<Route>`) still
  appears inside pages.
- **Plugins and DI**: API clients are registered centrally in `packages/app/src/modules/apis/index.ts`
  (`ApiBlueprint.make` wrapping `createApiFactory`, about 44 of them), and components get them with
  `useApi(systemAlertsApiRef)`, which is Backstage's dependency injection.
- **Components and JSX**: function components with MUI and `common-ui` (`LoadingState`, `Unauthorized`).
- **State**: local `useState` for forms (`form`, `editingId`, `errorMessage`), React Query for server state.
- **Effects with cleanup**: a `mounted` flag in `useEffect` so a late promise doesn't set state after
  unmount.
- **Conditional rendering**: early returns for loading and unauthorized.

```tsx
const alertsQuery = useQuery({ queryKey: QUERY_KEY, queryFn: () => api.getAlerts(),
                               enabled: admin === true });
if (admin === null) return <LoadingState message="Checking system alert access" />;
if (!admin) return <Unauthorized />;
```

- **Forms in templates**: scaffolder fields are React components registered with `FormFieldBlueprint`,
  loaded lazily with `import()`.

Gotcha: that page decides "admin" in the browser from `ownershipEntityRefs`, which is UX only; the backend
route must (and does) check again. The client check should never be the reason data is safe.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-architecture-q2">
<summary>How does the user interface handle loading, errors and large data sets?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Loading and errors** are standardized through `common-ui`: every page uses the same loading,
formatted-error, empty and unauthorized states, so a 403 renders as a clear "you don't have access"
view instead of a broken page. React Query handles loading and retry state for server data. Template
runs can take ten minutes (a Terraform workflow), so instead of a spinner the result **finds the user**:
a poller turns run failures into sidebar notifications with the error and a link.

**Large data sets** are handled at three levels:

1. **Pre-aggregation on the server.** FinOps pages read materialized views, never the raw cost table.
2. **Grids built for size.** MUI X DataGrid with paging, sorting and CSV export.
3. **Heavy computation off the main thread.** SQL schedule compliance runs in a **Web Worker**, and
   the service map **culls nodes outside the viewport**. Both were fixes for real UI freezes.

The rule behind all three: the browser should render, not compute. If a page needs a lot of maths,
either the server pre-computes it or a worker does.

Deeper: [Scalability strategy](/posts/projects/oneplatform/05-technical-architecture/#scalability-and-performance-strategy).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Loading, errors and large data, in code:

- **React Query states**: `isLoading`, `isError`, `data`; mutations call
  `queryClient.invalidateQueries({ queryKey })` on success, so lists refresh without manual state copies.
- **Errors**: API clients throw on `!response.ok`; pages show `onError` messages, and 403s render
  `<Unauthorized />` from `common-ui`.
- **Large tables**: MUI X DataGrid with paging and sorting; CSV export.
- **Heavy work off the main thread**: the SQL and file monitoring hooks (`useSqlMonitoringData`,
  `useFileMonitoringData`) hand computation to a Web Worker.
- **Lists and `key`**: rows keyed by stable IDs from the API, never array indexes, because grids reorder.

```tsx
const saveMutation = useMutation({
  mutationFn: (input: SystemAlertInput) =>
    editingId ? api.updateAlert(editingId, input) : api.createAlert(input),
  onSuccess: () => { setForm(EMPTY_FORM); void queryClient.invalidateQueries({ queryKey: QUERY_KEY }); },
  onError: error => setErrorMessage(error.message),
});
```

Gotcha: some clients mix `fetchApi.fetch` with raw `globalThis.fetch` (the public active-alerts call
uses the latter), which skips Backstage's auth and proxy handling. That's deliberate there (no auth
needed), but it's an easy pattern to copy by mistake into an authenticated call.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-architecture-q3">
<summary>How do you keep the frontend fast and accessible?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Fast:** the biggest wins were structural. Reports read pre-aggregated views, dense pages use a Web
Worker or viewport culling, React Query caches server data, and the backend caches expensive upstream
calls (the Entra-to-GitHub identity map for 10 minutes, App Insights responses in the backend cache).
The Docker build produces an optimized frontend bundle served by the backend.

**Accessible:** we get keyboard and ARIA behaviour from MUI, and the light/dark theme work moved every
shared component to **semantic colours** from the active theme, which helped contrast in both modes.
Two rules we apply in design: every chart has its numbers available in a grid, and status is never shown
by colour alone (labels like *Watch*, *High*, *Saturated*).

The gap I'd name: there's no automated accessibility check yet. The cheapest fix is `@axe-core/playwright`
in the existing E2E spec for the root shell and the Create page, failing on serious violations.

> **TODO:** Is there an accessibility target (for example WCAG 2.1 AA) for internal tools, and should
> violations block a merge?
{: .prompt-warning }

Deeper: [Accessibility design](/posts/projects/oneplatform/04-user-experience-and-design/#accessibility-design).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Performance and accessibility techniques in the code:

- **Code splitting**: extensions load components with `import()` (form fields, pages), so a template's
  picker code loads only when that template is opened.
- **Server state caching**: React Query keys per resource, `enabled` flags to avoid requests the user can't
  make.
- **Web Workers** for the monitoring calculations; **viewport culling** in the service map.
- **Memoization** where props are heavy (`useMemo` for derived grid rows).
- **Accessibility**: MUI components bring keyboard handling and ARIA; theme-aware colours from the active
  palette; status as text labels.

```ts
field: async () => {
  const { UserManagementPicker } = await import('./components/…/UserManagementPicker');
  return createFormField({ name: 'UserManagementPickerField', component: UserManagementPicker as any });
},
```

Gotcha in that snippet: `as any` on the component hides prop-type mismatches between the field
component and what the scaffolder passes; typing the component as `FieldExtensionComponent` catches
breakage at compile time during a Backstage upgrade.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Frontend performance as SLIs:

| SLI | Source | Why |
|---|---|---|
| Page load and API p95 per plugin route | App Insights `requests` and `dependencies` | Finds the slow plugin among 45 |
| Browser exceptions per page | Front-end telemetry (if enabled) or E2E console-error checks | Regressions after upgrades |
| Long tasks on heavy pages | Performance API in E2E | The Web Worker fixes stay fixed |
| Portal latency during catalog ingestion | Requests p95 by 15 minutes | The catalog-lock symptom |

The E2E suite already fails on console errors in the shell, which is a cheap guard. I'd add a
Playwright check that measures time to interactive for the Create page and the heaviest dashboards, and
alert if it doubles release over release.

```bash
yarn playwright test --project=<app-e2e> --reporter=line
```

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-architecture-q4">
<summary>How is the frontend built, configured per environment and served?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The frontend is built **into the same container image as the portal backend**, which serves it. The
multi-stage Docker build installs dependencies from a skeleton of `package.json` files (for layer cache
efficiency), mounts the private registry token and corporate CA bundle as **BuildKit secrets** (never
build args or layers), builds frontend and backend, and assembles a production-only runtime on
`node:24-trixie-slim`.

**One image for every environment.** The image is tagged `YYYY.MM.DD.<run>` and promoted by copying the
tag between Helm values files, never rebuilt. So environment differences can't live in the frontend
bundle. Backstage's app config is resolved at runtime per environment (base URLs, feature flags,
catalog filters), with secrets mounted from Key Vault by the CSI driver.

**Locally**, there are two supported setups (WSL-native or a Dev Container), and a bootstrap step pulls
development secrets from the dev Key Vault with the developer's own `az login`, so nobody keeps ~50
plaintext credentials in a local env file.

Deeper: [Build automation](/posts/projects/oneplatform/12-cicd-and-release-management/#build-automation),
[local setup](/posts/projects/oneplatform/08-development-preparation/#local-development-setup).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Building and configuring the frontend:

- **Build**: `yarn --cwd packages/app build` (the Backstage CLI uses webpack/rspack under the hood),
  output bundled into the backend image and served by the app backend plugin.
- **Runtime config**: `app-config.yaml` plus environment overrides; frontend-visible keys are declared in
  config schema with `@visibility frontend`, so secrets can't leak into the bundle.
- **Local**: `yarn start` (frontend on :3000) and `yarn start-backend:local` (backend on :7007), with
  `local.env` loaded through `node --env-file-if-exists=local.env` for type-checks and scripts.

```bash
yarn tsc                     # uses local.env if present
yarn start-backend:local
yarn start
```

Gotcha: because one bundle serves every environment, anything environment-specific in the frontend must
come from config at runtime. A hard-coded URL in a plugin works in development and breaks in staging,
and the release process (copying one tag forward) guarantees it.

</div>

<div class="iq-role" data-role="devops" markdown="1">

How the frontend ships:

- **Built inside the image** with the backend: `yarn tsc`, `yarn tsc:build`, `yarn --cwd packages/app build`,
  `yarn --cwd packages/backend build`, with `NODE_OPTIONS=--max-old-space-size=6144` for the type-check.
- **Served by the backend** on port 7007; the runtime stage copies only the backend bundle, production
  `node_modules`, and `app-config.yaml`.
- **Runs as `USER node`**, starts with `node --require ./instrumentation.js packages/backend --config
  app-config.yaml`.

```dockerfile
RUN --mount=type=secret,id=jfrog_token,uid=1000 \
    --mount=type=secret,id=ca_bundle,uid=1000,required=false \
    YARN_NPM_AUTH_TOKEN="$(cat /run/secrets/jfrog_token)" yarn install --immutable
```

Gotchas: the build stage needs about 6 GB of heap for `tsc`, so CI runners must be sized for it; and the
runtime image deletes `better-sqlite3` and `keytar` after `workspaces focus`, so any code path that
expects SQLite (local dev defaults) fails in the image, which is intended but worth knowing.

</div>

</details>

## Backend and API Design
{: #backend-and-api-design }

<details class="project-iq" markdown="1" id="backend-and-api-design-q1">
<summary>How do CRUD operations work in the backend, from request to persisted data?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Two paths, one per backend. Take **user-access audits** in the middleware, a real CRUD resource:

1. The browser calls the portal backend (`/api/<plugin>`), never the middleware directly.
2. The portal backend authenticates the user, checks a permission such as
   `enterprise-user-audit.read`, and forwards to the middleware with a cached client-credentials JWT.
3. In the middleware, a **thin controller** validates the request and calls a **service** in
   `Middleware.Services/UserAudits/Services`, which holds the business rules (who may decide for whom,
   state transitions from created to started to closed).
4. A **repository** persists through the feature's own EF Core `DbContext` in its own PostgreSQL
   schema, with parameterized queries only.
5. Side effects follow the write: a Jira ticket for an access change, a reminder email, an audit row.

In the **portal**, the pattern is the same but in TypeScript: a backend plugin router (every route
checks a permission), Zod validation on the body, a store class using Knex against the plugin's own
tables. Copilot license requests are an example, with approvals and chargeback fields.

Delete is rare by design: catalog entities can't be created or deleted through the UI at all, and
compliance records are kept as evidence.

Deeper: [API and UI implementation](/posts/projects/oneplatform/09-implementation/#api-and-ui-implementation).

</div>

<div class="iq-role" data-role="developer" markdown="1">

CRUD on both stacks, as code:

**Portal (TypeScript):** an Express router per plugin, created by the plugin's `init` and mounted with
`httpRouter.use(...)`:

```ts
router.post('/requests/:id/decision', async (req, res) => {
  const credentials = await httpAuth.credentials(req, { allow: ['user'] });
  const body = decisionSchema.parse(req.body);          // Zod → InputError on failure
  /* permissions.authorize(...) → NotAllowedError if denied */
  res.json(await temporalHitl.decide(req.params.id, body, credentials));
});
```

(The route shape is illustrative; the auth, Zod and permission calls are the ones the HITL router uses.)
Persistence goes through a store class over Knex (`HitlApprovalDatabase(dbClient)`), with migrations in
the plugin's `migrations/` folder.

**Middleware (.NET):** `[ApiController]` + `[Authorize]` controllers, constructor-injected services and
repositories, and EF Core:

```csharp
services.AddDbContextPool<UserAuditDbContext>(opt =>
  opt.UseNpgsql(cs, o => {
    o.MigrationsHistoryTable("__EFMigrationsHistory", "UserAudits");
    o.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(30), errorCodesToAdd: null);
  }));
```

Gotcha in the middleware: `EnableRetryOnFailure` retries whole operations on transient errors, so any code
that opens an explicit transaction must use `Database.CreateExecutionStrategy().ExecuteAsync(...)`, or EF
throws at runtime.

</div>

</details>

<details class="project-iq" markdown="1" id="backend-and-api-design-q2">
<summary>How did you design the API, in terms of style, resources, versioning, pagination and errors?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Style:** REST over JSON, grouped by plugin. Each backend plugin owns a prefix (`/api/<plugin-id>`),
resolved by Backstage's discovery service, so the frontend never hard-codes hosts. The middleware
exposes REST per feature (audits, FinOps, file monitoring, terminations).

**Typed clients:** each frontend plugin has a typed API client (about 44 registrations in one central module), and
integration tests run the **production client against the real router**, so a renamed field fails a
test, not a page.

**Errors:** permission failures are 403s, tested explicitly, and the frontend renders them with the
shared *Unauthorized* view. The middleware plugin maps middleware errors without leaking the delegated
token into a response body; there's a test for that.

**Pagination:** report endpoints are designed so pages are cheap (materialized views, indexed lookups),
and grids page and sort.

**Versioning:** internal APIs ship with their only consumer, so they evolve together. **Published**
contracts are versioned: the human-in-the-loop (HITL) approval contract is v1, documented with full
request and response examples, so another team's Temporal workflow can integrate without reading our
code. That's the rule I'd state: version what other teams depend on, not what ships in the same image.

Deeper: [API architecture](/posts/projects/oneplatform/05-technical-architecture/#api-and-integration-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

API design details in code:

- **Prefix per plugin**: Backstage mounts each router at `/api/<pluginId>`, and clients resolve it with
  `discoveryApi.getBaseUrl('system-alerts')`.
- **Typed clients**: a class per API implementing an interface, injected with `useApi`.
- **Validation**: Zod at the edge; `z.string().uuid()` for IDs, `z.enum([...])` for reasons,
  `.max(4000)` on free text, `.datetime()` for timestamps.
- **Errors**: throw `InputError`, `NotAllowedError`, `NotFoundError`; Backstage's error handler turns them
  into 400, 403, 404 with a JSON body.
- **Body size**: the HITL router has a configurable `maxRequestBodyBytes`.
- **Middleware**: lowercase routes (`options.LowercaseUrls = true`), enums serialized as strings, Swagger
  through an extension method.

```ts
const resolveSchema = z.object({
  reason: z.enum(['timeout', 'cancelled', 'superseded', 'other']),
  detail: z.string().max(4000).optional(),
  resolved_at: z.string().datetime().optional(),
});
```

Gotcha: one HITL check returns `NotAllowedError('Permission denied: HITL request not found')` for a
missing request, deliberately a 403 rather than a 404 so callers can't probe which IDs exist. That's a
good pattern, but it should be a written convention, or the next plugin will return 404.

</div>

</details>

<details class="project-iq" markdown="1" id="backend-and-api-design-q3">
<summary>How is the backend structured internally, and where does background work run?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Portal backend:** composed from plugins with Backstage's new backend system. A plugin declares its
dependencies (logger, config, `httpRouter`, `httpAuth`, `permissions`, `database`) and gets them
injected. Registration order is load-bearing, so it lives in one `registerProductionFeatures()` function
with a composition test. Scaffolder actions sit in the backend package, grouped by domain.

**Middleware:** a controller per feature, logic in `Middleware.Services/<Feature>/Services`, data
access in repositories, one `DbContext` per feature. Logging goes through a sanitizing wrapper on every
provider.

**Background work** runs in three places, chosen by shape:

| Work | Where | Why |
|---|---|---|
| Catalog ingestion (22+ subscriptions, 3 GitHub orgs, Graph) | Portal backend schedulers, staggered | Belongs to the catalog |
| Long template runs (Terraform) | Scaffolder tasks, with explicit wait actions | Visible task log per run |
| Data pipelines (FOCUS import at 05:00 UTC, inactivity scan, sprint predictability) | Azure Functions timers | Isolated from the UI, scalable separately |

The rule: anything that imports data or runs on a clock and isn't about the catalog goes to the
middleware.

Deeper: [Implementation](/posts/projects/oneplatform/09-implementation/#api-and-ui-implementation).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Internal structure, by stack:

- **Portal backend**: plugins get dependencies injected (`coreServices.*` plus service refs like
  `catalogServiceRef`); background work uses `coreServices.scheduler`:

```ts
await scheduler.scheduleTask({
  id: 'azure-resource-provider-task',
  frequency: { minutes: this.scheduleFrequencyMinutes },
  timeout: { minutes: this.scheduleTimeOutMinutes },
  fn: async () => { this.run(); },
});
```

- **Middleware**: `Program.cs` calls extension methods per concern (`AddTelemetry`,
  `AddLogSanitization`, `AddCorsConfiguration`, `AddDbContexts`, `AddAuthenticationConfiguration`,
  `AddApplicationServices`, `AddHealthCheckServices`); Functions run on timers in a separate host.

The gotcha is in that snippet: `fn` calls `this.run()` without `await`, so the scheduled task finishes
immediately while the real work continues in the background. The scheduler's `timeout` never applies, and
a slow run can overlap the next one. `fn: async () => { await this.run(); }` fixes both.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Where background work runs, operationally:

| Work | Runtime | Scaling | Watch |
|---|---|---|---|
| Catalog providers | Inside the 2 portal pods (Backstage scheduler, with a database lock so one pod runs each task) | With the portal | Pod CPU during ingestion |
| Scaffolder tasks | Portal pods | With the portal | Task duration and failures |
| Timers | Function App (`0 0 5 * * *` FinOps import, others daily or weekly) | Function App plan | Function failures, duration |
| Migrations | A workflow job running `efbundle-*` | n/a | Workflow result |

```bash
az functionapp function list -g <rg> -n <function-app> -o table
az monitor app-insights query --app <appi> --analytics-query "traces | where message has 'FinOps run' | top 20 by timestamp"
```

What I'd add: dedicated portal replicas for ingestion (Backstage can run plugin subsets per deployment),
so catalog work never shares CPU with user requests.

</div>

</details>

<details class="project-iq" markdown="1" id="backend-and-api-design-q4">
<summary>How do you validate input and keep operations safe to repeat?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Validation, in layers:**

- **In the form:** pickers only list valid values, and the form checks name availability, "does this
  group exist" and "is this VM already running" before submit.
- **In the scaffolder:** actions follow *validate, then act*. The Function App template chains
  `azure:check-function-app-prerequisites`, `template:validate-createfunctionapp-permissions`,
  `azure:check-resource-exists` and `azure:storage-account-name-availability` before
  `github:trigger-action` starts Terraform.
- **On the API:** Zod schemas validate request bodies in newer plugins; EF Core and Knex keep SQL
  parameterized; user input is escaped before logging to prevent log forging.
- **Template expressions** run in `isolated-vm`.

**Safe to repeat:**

- The **FinOps import** is idempotent by design: per-blob status means a rerun skips completed blobs,
  and a partial tag failure is repaired from stored data on the next run.
- **Ingestion** is idempotent per provider; entity refs are stable, so reruns don't create duplicates.
- **Releases** are idempotent: promotion copies an immutable tag.
- **Infrastructure actions** check before creating (`azure:check-resource-exists`), and Terraform itself
  converges.

Deeper: [Input validation](/posts/projects/oneplatform/06-security-and-privacy/#input-validation-and-secure-coding).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Validation and idempotency in code:

- **Template inputs**: scaffolder actions declare Zod input schemas (`schema.input`), so bad inputs fail
  before the handler runs; output schemas document what downstream steps can use.
- **Check before act**: `azure:check-resource-exists` and `azure:storage-account-name-availability`
  run before `github:trigger-action`.
- **API bodies**: Zod in routers; parameterized Knex and EF queries.
- **Log forging**: the middleware wraps every logger in a `SanitizingLogger`, stripping control
  characters from user-supplied values.
- **Expression sandboxing**: template expressions in the scaffolder are evaluated in `isolated-vm`.

```ts
schema: {
  input: {
    resourceGroupName: z => z.string().describe('The resource group name'),
    resourceName:      z => z.string().describe('The resource name to check'),
    resourceType:      z => z.string().describe('The type of resource to check'),
  },
},
```

Idempotency: the FinOps import records status per blob and skips completed ones; catalog entities have
stable refs. Gotcha: scaffolder actions that create things (repositories, group memberships) aren't
idempotent on retry unless they check first, so every create action should pair with a check action.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Safety of repeated operations, as an SRE checks it:

| Operation | Repeat-safe? | Evidence |
|---|---|---|
| FinOps import | Yes | Per-blob status, integrity gate before view refresh |
| Catalog provider run | Yes | `full` mutation replaces the provider's set |
| Template run | Depends on the actions | Check actions before create actions |
| Middleware migration bundle | Yes | EF tracks applied migrations per schema |
| Promotion | Yes | Same tag twice is a no-op ("already in prod" check) |

The one that isn't safe by default is a template run after a partial failure, for example a GitHub
repository created but the team assignment failed. The task log shows where it stopped; the runbook
step is "fix the cause, then rerun from the template with the same inputs", which works only because the
create step checks for existence first.

```bash
curl -s -H "Authorization: Bearer $TOKEN" https://<portal>/api/scaffolder/v2/tasks?status=failed | jq '.tasks[] | {id, spec: .spec.templateInfo.entityRef}'
```

</div>

</details>

## Database and Data Modeling
{: #database-and-data-modeling }

<details class="project-iq" markdown="1" id="database-and-data-modeling-q1">
<summary>Which data store did you choose, and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**PostgreSQL 16 for both the portal and the middleware**, on one shared server with TLS required and
separate databases and schemas per owner.

Why PostgreSQL: Backstage needs it anyway (catalog, search, scaffolder tasks), it handles relational
compliance data well (audits, decisions, approvals), and its **materialized views** suited FinOps
reporting. Why one engine for both apps: one thing to run, back up, patch and secure, and the team only
needs one set of operational skills.

Two other stores are read, not owned:

- **SQL Server** is read-only to the middleware (SQL Agent job history, monitoring), except
  terminations, which build connections dynamically per configured application.
- **Blob Storage** holds FOCUS cost exports, which the import reads.

What I'd watch: a shared server is a shared failure domain and a shared capacity pool. Catalog
ingestion once locked tables for everyone, and that was fixed in the ingestion design, not with a
second server. If a middleware feature's load grew a lot, its schema is already isolated, so moving it
to its own server would be a connection-string change.

Deeper: [Data architecture](/posts/projects/oneplatform/05-technical-architecture/#data-architecture-and-data-models).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Working with PostgreSQL from each stack:

- **Portal plugins**: `const db = await database.getClient()` returns a Knex client for that plugin's own
  database; migrations run at init:

```ts
await dbClient.migrate.latest({
  directory: resolvePackagePath('@internal/backstage-plugin-temporal-hitl-backend', 'migrations'),
});
```

- **Middleware**: one `DbContext` per feature, pooled (`AddDbContextPool`), each with its own schema and
  migrations history table; a `DbContextFactory` where a service needs short-lived contexts (FinOps).
- **Testing**: Testcontainers PostgreSQL 16 in both stacks; `migrations.integration.test.ts` runs every
  owned migration against a real container.

Gotcha: all middleware contexts share one connection string, so "each feature can move to its own
server" needs a connection string per context first. It's a small change, but it isn't free the way the
schema isolation suggests.

</div>

<div class="iq-role" data-role="devops" markdown="1">

The database as infrastructure:

- **One PostgreSQL 16 server** (Azure Database for PostgreSQL flexible server, provisioned with
  Terraform), TLS required.
- **Portal**: Backstage creates a database per plugin (`backstage_plugin_<id>`) on that server, using
  credentials from Key Vault via the CSI driver.
- **Middleware**: one database with a schema per feature, connection string from App Configuration with a
  Key Vault reference, read through workload identity.

```bash
az postgres flexible-server show -g <rg> -n <server> --query "{version:version, ha:highAvailability.mode, backup:backup}"
psql "host=<server>.postgres.database.azure.com sslmode=require user=<admin>" -c '\l'
```

What I'd check in an interview answer about operations: the backup retention and whether geo-redundant
backup is on, because the owned data (audits, approvals, role mappings) can't be rebuilt from upstream.

</div>

</details>

<details class="project-iq" markdown="1" id="database-and-data-modeling-q2">
<summary>How is the data modeled, and how did the access patterns shape the model?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The first modeling decision was **ownership**: copies versus owned data.

| Data | System of record | Portal holds |
|---|---|---|
| Users, groups, repos, Azure resources | Entra, GitHub, ARM | Catalog copies, rebuildable |
| Telemetry | Application Insights | Pass-through with PHI filter |
| Cost | FOCUS exports | Imported rows plus views |
| Audits, terminations, Copilot approvals, role maps | **OnePlatform** | Owned, needs backup and retention |

Then, per owner:

- **Each portal plugin** owns its tables (Copilot requests, role-to-navigation maps, catalog fragments,
  notifications, system alerts, HITL requests).
- **Each middleware feature** owns a schema with its own `DbContext`: `UserAudits`, `FinOps`,
  `JiraAudits`, `FileMonitoring`, `TerminationAutomation`.

Access patterns shaped the details. Audits are relational and transactional (audit → users →
decisions → Jira tickets), so they're normalized. FinOps is read-heavy aggregate reporting, so raw FOCUS
rows feed **materialized views** (for example resource daily cost) and pages read only the views; the
cost of a page load doesn't grow with the data. The catalog is a document store of entities, which is
Backstage's model.

Deeper: [Data ownership](/posts/projects/oneplatform/07-data-and-integration/#data-ownership-and-classification).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The model as code:

- **Catalog entities**: Backstage's document model (`kind`, `metadata`, `spec`, `relations`), written by
  providers with stable `metadata.name` so reruns update rather than duplicate.
- **Plugin tables**: Knex migrations per plugin, e.g. `create_hitl_approval_requests` and
  `create_hitl_sql_blocking_reports` for the HITL plugin.
- **Middleware entities**: EF Core classes per feature (`Data/` folders), schemas such as `UserAudits`
  and `FinOps`, and materialized views for reporting (`mv_tag_type_cost_summary_historical` and others)
  refreshed by `MaterializedViewRefreshService`.

```csharp
"mv_tag_type_cost_summary_historical" =>
    $"""REFRESH MATERIALIZED VIEW "FinOps"."mv_tag_type_cost_summary_historical";""",
```

Design point: mapping each view name to a fixed SQL string (a `switch` over known names) instead of
interpolating the name means the refresh method can't be turned into SQL injection, even though view
names come from code.

</div>

</details>

<details class="project-iq" markdown="1" id="database-and-data-modeling-q3">
<summary>How were schema changes and data migrations handled?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Two mechanisms, deliberately different:

**Portal plugins** ship **Knex migrations** that Backstage runs at plugin startup, which is the
framework's design. To make that safe, an integration test runs **every owned migration against a real
PostgreSQL 16 container**, so a broken migration fails CI rather than a deploy.

**Middleware features** use **EF Core migrations per `DbContext`**, and they are **never applied at app
startup**. A workflow builds the migration bundle per environment and another applies it, so a schema
change is its own visible deploy step. The order is fixed:

```text
1. Apply EF migrations (backward compatible with the running API)
2. Deploy the new API image
3. Deploy Functions if they changed
4. Later release: remove what the old code needed
```

That's expand-and-contract. Destructive changes use a **swap pattern**: the FinOps reconciliation
migrations build replacement views, then swap names in one transaction, so rollback restores the old
views.

Data migrations followed one pattern too: SQL monitoring config moved from Azure Storage Tables to
PostgreSQL behind service wrappers and mapping adapters, so the UI didn't change; Copilot requests v1
stayed alongside v2 until no in-flight v1 requests remained.

Deeper: [Schema and migrations](/posts/projects/oneplatform/07-data-and-integration/#database-schema-and-migrations).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Writing migrations, per stack:

- **Knex** (portal): timestamped JavaScript files exporting `up` and `down`, e.g.
  `20260814000001_create_hitl_approval_requests.js`; run automatically at plugin start. They must be
  backward compatible, because two pods start during a rolling update.
- **EF Core** (middleware): `dotnet ef migrations add <Name> --context <Feature>DbContext`, then a bundle
  per context; never applied at startup.

```bash
dotnet ef migrations add AddDecisionComment --context UserAuditDbContext \
  --project src/Middleware.Services --startup-project src/Middleware.Api
dotnet ef migrations bundle --context UserAuditDbContext -o efbundle-useraudit
yarn test:integration -t migrations
```

Gotcha: Knex migrations run on whichever portal pod starts first, with Knex's own lock table. If a
migration is slow (a large backfill), the pod's startup stalls, and without readiness probes Kubernetes
may route traffic to it before the plugin is ready.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Running migrations as a pipeline:

1. `middleware-ef-migrations-build.yml` builds bundles per context (`efbundle-useraudit`,
   `efbundle-finops`, `efbundle-jiraaudit`, …).
2. `middleware-ef-migrations-deploy.yml` downloads them and runs each against the environment's
   database, with the connection string from the environment's secrets.
3. Then the API deploy, then Functions if changed.

```bash
gh workflow run middleware-ef-migrations-build.yml -f environment=staging
gh workflow run middleware-ef-migrations-deploy.yml -f environment=staging
./efbundle-finops --connection "$CONN"     # what the job runs, per bundle
```

For the portal there's no separate step; migrations ship in the image. So the DevOps control is the
integration lane that runs every migration against PostgreSQL 16 before the image is built, and the
pre-upgrade workflow that also tries PostgreSQL 17.

</div>

</details>

<details class="project-iq" markdown="1" id="database-and-data-modeling-q4">
<summary>How do you handle data retention, backup and restore?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The ownership split decides it: **copies can be rebuilt; owned data needs backups and retention
rules.** If the catalog database were lost, ingestion would rebuild most of it from Azure, Graph and
GitHub in hours. Audit records, termination logs, Copilot approvals, role mappings and fragments can't
be rebuilt; they're compliance evidence.

**Retention set in code today:** notifications one year; App Insights backfill 90 days; GHAS active
committers over the rolling 90-day billing window; SQL schedule compliance 60 days of history. The
catalog uses `orphanStrategy: keep`, which I'd revisit, because kept orphans make "who owns this?" lie.

**What I'd put in place:** point-in-time restore on the PostgreSQL server, quarterly restore tests of
the owned schemas, and explicit retention with purges for evidence data once compliance gives the
period.

> **TODO:** How is the PostgreSQL server backed up, when was a restore last tested, and what retention
> does compliance require for audit and termination records?
{: .prompt-warning }

Deeper: [Retention](/posts/projects/oneplatform/07-data-and-integration/#data-retention-and-deletion),
[backup](/posts/projects/oneplatform/07-data-and-integration/#backup-and-restore-strategy).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Retention and backup as configuration:

- **PostgreSQL**: the flexible server's automated backups (retention days and geo-redundancy set in
  Terraform); point-in-time restore to a new server.
- **App Insights**: workspace retention per table.
- **Retention in code**: notifications kept a year, App Insights backfill 90 days, SQL schedule compliance
  60 days of history.
- **Catalog**: `orphanStrategy: keep` in `app-config.yaml`, so entities whose source disappeared stay.

```bash
az postgres flexible-server update -g <rg> -n <server> --backup-retention 35
az postgres flexible-server restore -g <rg> -n <server>-restore --source-server <server> --restore-time "2026-10-05T06:00:00Z"
```

> **TODO:** Confirm the server's backup retention and whether geo-redundant backup is enabled.
{: .prompt-warning }

</div>

<div class="iq-role" data-role="sre" markdown="1">

Recovery objectives by data class:

| Data | RPO | RTO | Recovery |
|---|---|---|---|
| Catalog | n/a | Hours | Re-ingest from Azure, Graph, GitHub |
| Owned plugin data (approvals, role maps, alerts) | 5 min (PITR) | 4 h | Point-in-time restore |
| Middleware evidence (audits, terminations) | 5 min (PITR) | 4 h | Point-in-time restore of the schema |
| FinOps raw and views | 1 day | Hours | Re-import from FOCUS exports |
| Telemetry | n/a | n/a | Not restored |

The drill I'd run quarterly: restore the server to a new instance, point a staging middleware at it,
and confirm the audit pages show yesterday's data. The restore of evidence is a compliance control, so
the drill result belongs in the audit trail too.

</div>

</details>

## Frontend, Backend and Database Communication
{: #frontend-backend-and-database-communication }

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q1">
<summary>How does the frontend connect to the backend?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The browser talks **only to the portal backend**, over HTTPS on the internal ingress. Each frontend
plugin registers a typed API client that resolves its backend through Backstage's **discovery service**
(`/api/<plugin-id>`) and attaches the user's Backstage token through the fetch API. So the frontend
never hard-codes hosts and never holds a token for any other system.

The portal backend is effectively a **backend-for-frontend** in front of everything else:

- For **middleware** data, a middleware plugin logs in with client credentials (`POST /login`), caches
  the JWT and calls the middleware with `Authorization: Bearer …`. Users never hold a middleware token.
- For **Azure, GitHub and Jira**, the backend acts through service principals, GitHub Apps and OAuth
  clients we control.
- For **telemetry**, the backend applies the PHI filter before anything reaches the browser.

Why this design? It puts every security decision in one place: the backend authenticates the user,
checks the permission, chooses the identity to act as, and filters the response. The middleware's
ingress additionally allows CORS only from the portal origins.

Deeper: [API and integration architecture](/posts/projects/oneplatform/05-technical-architecture/#api-and-integration-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The client side:

```ts
export class SystemAlertsClient implements SystemAlertsApi {
  constructor(private readonly discoveryApi: DiscoveryApi,
              private readonly fetchApi: FetchApi,
              private readonly identityApi: IdentityApi) {}
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetchApi.fetch(`${await this.discoveryApi.getBaseUrl('system-alerts')}${path}`, init);
    if (!response.ok) throw new Error(`System alerts request failed: ${response.statusText}`);
    return (await response.json()) as T;
  }
}
```

- `discoveryApi` resolves `/api/system-alerts` for the current environment.
- `fetchApi` adds the user's Backstage token automatically; some clients also set it explicitly from
  `identityApi.getCredentials()`.
- Components never call `fetch` directly; they call the client through `useApi` inside React Query.

Gotcha: errors lose the response body (`statusText` only), so a 403 with a helpful message from the
backend shows up as "Forbidden". Using `ResponseError.fromResponse(response)` from `@backstage/errors`
keeps the server's message.

</div>

<div class="iq-role" data-role="devops" markdown="1">

The network path:

```text
browser → internal DNS → nginx ingress (TLS, cert from Key Vault) → portal Service → portal pod :7007
portal pod → middleware ingress (HTTPS) → middleware Service → middleware pod
portal pod / middleware pod → PostgreSQL (TLS) ; → Azure, Graph, GitHub, Jira over HTTPS
```

- **Middleware CORS** allows only the portal origins (`WithOrigins(appConfig.Cors.Origins)`), though
  browsers never call it directly.
- **Middleware auth** is a JWT the middleware issues itself from `POST /login` with a client ID and
  secret, signed with a symmetric key.

```bash
kubectl get ingress -A | grep -E "<portal>|<middleware>"
curl -s https://<middleware-host>/healthz | jq '.status'
```

What I'd change: the self-issued token has a one-month lifetime and the middleware doesn't validate
issuer or audience. Using Entra client-credentials tokens for the portal's identity (validated for
audience) removes the shared secret and the custom login endpoint.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q2">
<summary>Trace a single user request from the browser to the data store and back.</summary>

<div class="iq-role" data-role="architect" markdown="1">

Take an audit manager opening an access review:

1. **Browser:** the audit plugin's page calls its API client, which resolves `/api/<audit-plugin>` and
   sends the request with the user's Backstage token.
2. **Ingress:** internal nginx terminates TLS (certificate from Key Vault) and routes to a portal pod.
3. **Portal backend:** `httpAuth` resolves the user; the router asks the **permission policy** whether
   this role holds `enterprise-user-audit.read`. No → 403, rendered as the Unauthorized view.
4. **Delegation:** the middleware plugin uses its cached client-credentials JWT and calls the
   middleware API.
5. **Middleware:** the controller validates, the service applies rules, the repository queries the
   `UserAudits` schema through EF Core over TLS.
6. **Response:** JSON back to the portal backend, which maps errors (without leaking the delegated
   token) and returns it; React Query caches it and the DataGrid renders.

Because both apps export OpenTelemetry traces to Application Insights, this shows up as **one trace
across two cloud roles**, so a slow page can be pinned to the portal, the middleware or the query.

For a telemetry page, step 5 is Application Insights instead of PostgreSQL, and the PHI filter runs
before step 6.

</div>

<div class="iq-role" data-role="developer" markdown="1">

The same trace, as code:

1. **Component**: `useQuery({ queryKey: [...], queryFn: () => api.getAudit(id) })`.
2. **Client**: `fetchApi.fetch(discoveryApi.getBaseUrl('<plugin>') + path)` with the user token.
3. **Router**: `httpAuth.credentials(req, { allow: ['user'] })`, then
   `permissions.authorize([{ permission }], { credentials })`.
4. **Delegation**: the middleware service module calls `getToken()` (cached) and fetches the middleware
   route with `Authorization: Bearer`.
5. **Controller → service → repository → `DbContext`** in .NET, LINQ to SQL via Npgsql.
6. **Back**: JSON to the router, mapped errors (`[400, 401, 404, 409, 502].includes(error.status)`
   passes through), JSON to React Query, render.

```ts
const credentials = await httpAuth.credentials(req, { allow: ['user'] });
const decisions = await permissions.authorize([{ permission: enterpriseUserAuditRead }], { credentials });
```

(The second line shows the pattern; each router imports its own permission object.)

Gotcha at step 4: the cached middleware token is never refreshed (`resetTokenCache` is only used in
tests), so once it expires every middleware-backed page fails until the pod restarts.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Where that trace can fail, and what I'd look at:

| Hop | Failure | Signal |
|---|---|---|
| Ingress | TLS cert expired | Synthetic sign-in check |
| Portal auth | Entra app secret expired | Sign-in failures |
| Permission | Role mapping change | 403 rate per route |
| Delegation | Middleware token expired (pod older than a month) | 401s from the middleware, every page at once |
| Middleware | A `DbContext` unhealthy | `/healthz` 503 naming the context |
| Database | Lock during catalog ingestion | Portal p95 spikes on a schedule |

Because both apps export OpenTelemetry to Application Insights, one end-to-end transaction view shows
which hop is slow. The alert I'd add from this table: middleware 401s above a handful per minute, because
that one failure mode takes out every middleware-backed page and has a one-line fix (restart, then the
token refresh in code).

```kusto
dependencies
| where cloud_RoleName has "<portal>" and target has "<middleware-host>"
| summarize count() by resultCode, bin(timestamp, 5m)
```

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q3">
<summary>How does the backend connect to the data store, and how are connections, timeouts and concurrency handled?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Portal backend:** Backstage's `database` core service gives each plugin its own Knex connection pool
to its own database on the PostgreSQL server, with `ssl.require` and certificate verification.
Credentials come from Key Vault through the CSI driver.

**Middleware:** each feature's EF Core `DbContext` connects to PostgreSQL using connection details from
App Configuration with Key Vault references, through **workload identity**; only two variables
(`APPCONFIG_ENDPOINT`, `APPCONFIG_LABELS`) are set in Helm values. SQL Server credentials come from Key
Vault, and terminations build connections per configured application at runtime.

**Concurrency** was the hardest lesson. The Azure ingestion writes ~10,000 entities in one `full`
mutation and **locked the catalog database** for every user. The fix is architectural, not a bigger
pool: one provider per subscription, staggered schedules, ~500 entities per write. It's built and
documented on a feature branch, but `main` still runs the single provider, so merging it is the open
item. Smaller transactions are the best concurrency control.

**Timeouts:** the middleware ingress allows long timeouts (up to an hour) and large bodies for imports;
interactive routes should stay short. `/healthz` checks App Configuration and seven database contexts
(one reported only as degraded) and returns 503 if a required one fails, so a probe can act on it.

Deeper: [Scalability strategy](/posts/projects/oneplatform/05-technical-architecture/#scalability-and-performance-strategy).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Connection handling in code:

- **Knex pools** per plugin, created by the `database` core service from `backend.database` config
  (client `pg`, connection with `ssl`). Pool size comes from config; defaults are small, which suits
  plugins with light traffic.
- **EF Core pooling**: `AddDbContextPool` reuses `DbContext` instances; Npgsql pools connections
  underneath. `EnableRetryOnFailure(5, 30s)` handles transient errors.
- **SQL Server**: the middleware's SQL monitoring and terminations build connections at runtime from
  configured applications.
- **Concurrency in Node**: everything is async I/O on one event loop per pod; CPU-heavy work (ingestion
  transforms) shares that loop with requests.

```csharp
o.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(30), errorCodesToAdd: null);
```

Gotcha: the Azure provider builds every entity in memory and writes one `full` mutation. Besides the
database lock, that's a long synchronous transform on the event loop. Batching (the branch's ~500 per
write) helps both.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Timeouts, pools and probes from the reliability side:

- **Health**: the middleware's `/healthz` checks App Configuration and seven `DbContext`s and returns 503
  when a required one fails; the portal image's `HEALTHCHECK` calls `/healthcheck/ready`. Neither is
  wired as a Kubernetes probe.
- **Retries**: EF retries up to 5 times with up to 30 seconds between, so a database blip can hold a
  request for minutes; the ingress timeout should be shorter than that for interactive routes.
- **Locks**: the single Azure `full` mutation is the known lock source on the catalog database.

```yaml
readinessProbe:
  httpGet: { path: /healthcheck/ready, port: 7007 }
  periodSeconds: 10
livenessProbe:
  httpGet: { path: /healthcheck, port: 7007 }
  periodSeconds: 20
  failureThreshold: 6
```

That probe block for the portal is the change I'd make first; for the middleware, readiness on `/healthz`
and liveness on a trivial endpoint, so a database outage takes pods out of rotation without restarting
them.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q4">
<summary>Where do you cache, and how do you keep cached data correct?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The biggest cache in the system is one people don't call a cache: **the catalog is a cached copy** of
Entra, GitHub and Azure. It's kept correct by scheduled providers (Graph every 10 minutes; GitHub
discovery staggered per org and branch; Azure in one provider today), and its correctness rule is that copies
are never edited in place. Changes go to the source system or to an audited overlay.

The others:

| Cache | TTL / refresh | Correctness |
|---|---|---|
| Entra-to-GitHub identity map | 10 minutes | Short TTL; identity changes are rare |
| App Insights responses | Backend cache | Telemetry is append-only; staleness is acceptable |
| Materialized views (FinOps) | Refreshed only after a fully verified import | Integrity gate: if any check fails, views are **not** refreshed |
| React Query in the browser | Per query | Refetch on focus or on demand |
| Middleware JWT in the portal | Held for the pod's lifetime | No expiry check or re-login yet: a pod older than the token's one-month lifetime gets 401s until restarted |

The FinOps rule is the one I'd highlight: the views update only when every manifest, blob, row count and
tag record matches. A stale but correct report beats a fresh but wrong one.

Deeper: [Data validation](/posts/projects/oneplatform/07-data-and-integration/#data-validation-and-quality).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Caching in code:

- **React Query** in the browser: keys per resource; mutations invalidate keys; `enabled` flags prevent
  calls the user can't make.
- **Backend cache service** (`coreServices.cache`) for expensive upstream calls, with a TTL per entry.
- **Module-level caches**: the middleware token (`let cachedToken`), the Entra-to-GitHub identity map (10
  minutes).
- **Materialized views** in the middleware, refreshed only after the integrity service passes.

```ts
let cachedToken: string | null = null;
export async function getToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  /* POST /login, then */ cachedToken = token; return token;
}
```

The fix for that cache is small: store the expiry with the token (decode the JWT's `exp`), refresh a few
minutes before it, and on a 401 clear the cache and retry once.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Keeping caches honest operationally:

- **Catalog freshness**: alert when an entity provider hasn't completed in twice its schedule. The Azure
  provider's task currently finishes instantly (the un-awaited `run()`), so its duration metric is
  meaningless until that's fixed.
- **FinOps**: alert on integrity failures, because the design keeps yesterday's views on failure;
  "correct but stale" needs a timer on how stale.
- **Token cache**: alert on middleware 401s.
- **React Query**: no server-side action needed; a hard refresh clears it.

```kusto
traces
| where message has "FinOps run" and message has "Integrity="
| project timestamp, message
| top 7 by timestamp
```

The principle I'd state: every cache needs a freshness signal, and the cheapest one is "time since last
successful refresh", alerted at twice the expected interval.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q5">
<summary>Where did you use synchronous and where asynchronous communication, and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Synchronous:** browser → portal backend → middleware or PostgreSQL for reading pages and simple
writes, because a person is waiting and the work is quick.

**Asynchronous, and why each:**

- **Template runs** are scaffolder tasks. Submitting returns a task; steps run in the background, and
  the user gets a notification on success or failure. A Terraform workflow can take ten minutes, so
  holding an HTTP request open would be wrong.
- **Long external steps** use explicit wait actions (`github:wait-for-workflow` and a wait-for-merge action)
  so the task log shows the wait, instead of "triggered" and hoping.
- **GitHub webhooks** complete Copilot provisioning: once an invited user joins the org, the seat is
  assigned. That's event-driven because the trigger is someone else's action.
- **HITL approvals** with Temporal: an external workflow registers an approval, OnePlatform shows it to
  reviewers, and the decision goes back as **one Signal**. Human decisions are inherently async.
- **Notifications API**: CI pipelines and monitoring tools push in-app notifications.
- **Timers** in Azure Functions for imports and scans.

My rule: synchronous for reads and quick writes, asynchronous whenever a human, a slow external system
or a schedule is in the loop, and always with a visible status.

Deeper: [Event and messaging contracts](/posts/projects/oneplatform/07-data-and-integration/#event-and-messaging-contracts).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Sync and async, by mechanism:

- **Synchronous**: React Query → API client → router → middleware or database.
- **Scaffolder tasks**: `POST` creates a task and returns an ID; the frontend streams the task log; long
  steps use explicit wait actions (`github:wait-for-workflow` polls the workflow run until it completes).
- **Temporal HITL**: an external workflow registers a request (`registerSchema`: namespace, task queue,
  workflow ID, signal name, context, optional expiry); a reviewer's decision is sent back as one signal; an
  expiry sweep (`startHitlExpirySweep`) closes stale requests on the scheduler.
- **Notifications**: the backend pushes in-app notifications (Backstage notifications), and a poller turns
  failed task runs into notifications.

```ts
const registerSchema = z.object({
  source_app: z.string().min(1), temporal_namespace: z.string().min(1), task_queue: z.string().min(1),
  temporal_workflow_id: z.string().min(1), signal_name: z.string().min(1),
  context: z.record(z.unknown()), expires_at: z.string().datetime().optional(),
});
```

The design point in that schema: the caller tells the portal *how to call it back* (namespace, queue,
workflow, signal), which is what lets any Temporal workflow use the inbox without portal code changes.

</div>

</details>

## Integrations and Background Processing
{: #integrations-and-background-processing }

<details class="project-iq" markdown="1" id="integrations-and-background-processing-q1">
<summary>Which external systems does the application integrate with, and how?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Many: that's what a portal is for.

| System | Identity | Used for |
|---|---|---|
| Entra ID / Microsoft Graph | App registration | Users and groups into the catalog; group changes (which also grant Artifactory, SonarQube and GitHub SSO access) |
| Azure ARM, Monitor, Cost, Log Analytics, App Insights | Scoped service principals | Resource ingestion, VM start, role assignments, metrics, logs, cost |
| GitHub (three orgs plus enterprise) | One GitHub App per org; PAT only where an API requires it | Discovery, repos, teams, invitations, workflows, Copilot, GHAS |
| Terraform | `workflow_dispatch` into infrastructure repos | Resources templates create |
| Jira Cloud | OAuth 2.0 client credentials | Tickets for audits, late files, approvals |
| SQL Server | SQL logins from Key Vault | Agent jobs, monitoring, terminations |
| SonarQube, Statuspage, Datadog | Tokens via backend proxy | Entity page cards |
| Ansible, Zscaler, SMTP, Temporal | API credentials | Close files, network policy, email, HITL signals |

Patterns I'd name: **one client per system in one backend plugin** (the GitHub backend's Octokit factory
picks the App installation per org); **auth as a delegating handler**, not code in each call (the
middleware's Jira client adds OAuth in the `HttpClient` pipeline); and **identities we control**, so
users never hold standing access to these systems.

Deeper: [External systems](/posts/projects/oneplatform/07-data-and-integration/#external-systems-and-third-party-integrations).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Integration code patterns:

- **Azure**: SDK clients (`ResourceManagementClient`, `StorageManagementClient`) with
  `ClientSecretCredential` built from `AZURE_API_CLIENT_ID` and `AZURE_API_CLIENT_SECRET`; subscription
  resolved by name with a shared helper.
- **GitHub**: one GitHub App per organization, listed under `integrations.github[].apps` in
  `app-config.yaml`; Backstage's GitHub credentials provider picks the right installation for a repo's org,
  and a few services build `createAppAuth` from `@octokit/auth-app` directly.
- **Jira** (middleware): a `JiraOAuthMessageHandler : DelegatingHandler` adds the OAuth token in the
  `HttpClient` pipeline, so call sites never handle auth.
- **Temporal**: a `TemporalConnectionRegistry` keyed by namespace, from config.

```csharp
public class JiraOAuthMessageHandler : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        /* get or refresh the OAuth token, set request.Headers.Authorization */
        return await base.SendAsync(request, ct);
    }
}
```

(Body abbreviated; the class and base type are as in the code.) Gotcha: the Azure actions create a new
`ClientSecretCredential` per invocation, which means a fresh token request per action. A shared
credential per process lets the SDK cache tokens.

</div>

</details>

<details class="project-iq" markdown="1" id="integrations-and-background-processing-q2">
<summary>How do you handle rate limits, retries and partial failures from external APIs?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The quotas that bite here are **API rate limits, not CPU**: GitHub's per-App limit and Azure Resource
Graph and ARM throttling.

- **Spread the load in time.** GitHub discovery is staggered per org and branch (30 to 120 minutes
  apart); Azure runs as one provider today (per-subscription providers are on a branch); the GitHub
  backfill has a
  deliberate delay between calls.
- **Spread it across identities.** One GitHub App per organization, each with its own budget.
- **Cache what's stable**, like the Entra-to-GitHub identity map.

**Partial failures** should be isolated by design. Today a failing subscription is logged and skipped
inside the single Azure provider; the per-subscription providers on the feature branch make each one
fail on its own schedule. The FinOps import tracks status per blob,
so a rerun skips completed blobs, and a partial tag failure is repaired from stored data next time.

**Known quirks are encoded, not tribal.** Adding a user to the SSO group that grants a GitHub seat needs
a short propagation delay before the org invitation succeeds; the action waits two seconds, with a
comment in the code.

**Failures are visible:** a failed template run notifies the requester with the error and a link, and
can post to a Teams channel.

Deeper: [Capacity and quota planning](/posts/projects/oneplatform/11-infrastructure-and-environments/#capacity-and-quota-planning).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Rate limits and retries in code:

- **Spreading in time**: provider schedules per org and branch; the scheduler's `frequency` and an
  initial delay per task.
- **EF Core**: `EnableRetryOnFailure` for transient database errors.
- **Known delays encoded**: the GitHub seat flow waits two seconds after the SSO group change before the
  org invitation.
- **GitHub Apps per org** (configured in `integrations.github[].apps`), so each org has its own rate
  budget.

```ts
fn: async () => { await this.run(); },   // what the Azure task should be
```

What I'd add in code: Octokit's `throttling` and `retry` plugins (`@octokit/plugin-throttling`), which
honour `retry-after` and secondary rate limits automatically, and a typed retry helper for Azure SDK calls
(the SDK retries some errors itself; Resource Graph throttling needs back-off on 429).

</div>

<div class="iq-role" data-role="sre" markdown="1">

Partial failure and quotas from the reliability side:

| Integration | Failure | Effect | Signal |
|---|---|---|---|
| Azure ingestion | One subscription throws | Logged, skipped, the rest written in the same `full` mutation | Provider logs per subscription |
| GitHub | Rate limit on one App | That org's discovery stalls | 403/429 counts per org |
| Jira | OAuth token failure | Audit tickets not created | Jira dependency failures |
| FinOps import | Missing blob | Integrity fails, views not refreshed | `Integrity=` in the run summary |
| Middleware token | Expired | Every middleware page fails | 401 rate |

```kusto
dependencies
| where success == false
| summarize failures=count() by target, resultCode
| top 10 by failures
```

The one I'd watch closest is the Azure `full` mutation: a subscription that silently returns nothing
(rather than throwing) would make its entities disappear from the catalog in one write. The
per-subscription design fixes that by giving each subscription its own mutation scope.

</div>

</details>

<details class="project-iq" markdown="1" id="integrations-and-background-processing-q3">
<summary>How are scheduled and background jobs designed and coordinated?</summary>

<div class="iq-role" data-role="architect" markdown="1">

By ownership:

- **Catalog providers** run in the portal backend on Backstage's scheduler: per org for GitHub,
  staggered; one provider for all Azure subscriptions today (per-subscription on a branch).
- **Data pipelines** run as **Azure Functions timers** in the middleware: the daily FOCUS cost import at
  05:00 UTC, the daily inactivity scan, State of DevOps ingestion, and weekly sprint predictability from
  Jira.
- **User-triggered long work** runs as **scaffolder tasks**, with explicit wait steps.

The FinOps import is the design I'd walk through, because it treats quality as a gate:

1. Read the export manifest and each blob, tracking status per blob.
2. Load rows; check every manifest, blob, row count and tag record matches.
3. Only on **100% integrity**, refresh the materialized views. Otherwise leave yesterday's correct
   views in place and log under a run-scoped `FinOpsRunId`.

Coordination is mostly by **schedule and idempotency**: jobs are safe to rerun, and every log line
carries a run id so one run can be traced end to end. What I'd add is metrics for job duration and
failure per provider and per run, so a slow drift shows up before users notice.

Deeper: [Data validation](/posts/projects/oneplatform/07-data-and-integration/#data-validation-and-quality).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Background jobs, as code:

- **Azure Functions** (isolated worker): `[TimerTrigger("0 0 5 * * *")]` and others, with a
  `CancellationToken`, and a logging scope carrying a run ID:

```csharp
string finOpsRunId = Guid.NewGuid().ToString("N");
using IDisposable? runScope = _logger.BeginScope(new Dictionary<string, object>
{
  ["FinOpsRunId"] = finOpsRunId
});
```
- **Injected `TimeProvider`** so tests control time.
- **Portal schedulers**: `scheduler.scheduleTask({ id, frequency, timeout, fn })`.
- **HITL expiry sweep**: a scheduled task closing expired requests.

Gotcha: `IsPastDue` is logged but not acted on. When the Function App was down at 05:00 and the timer
fires late, the import still runs normally, which is what you want for an idempotent import, but worth a
comment so nobody adds "skip if past due" later.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Scheduled work, operationally:

- **Function App timers** (UTC): daily at 00:00, 05:00 (FinOps), 06:00, and weekly on Wednesday at 03:00,
  deployed by `middleware-functions-deploy.yml`.
- **Portal schedulers**: run inside the portal pods; Backstage's scheduler coordinates through the
  database so only one replica runs each task.
- **Configuration**: schedule frequency and timeouts from `app-config.yaml` (e.g.
  `azure.scheduleFrequencyMinutes`).

```bash
az functionapp function list -g <rg> -n <function-app> --query "[].name" -o tsv
az functionapp config appsettings set -g <rg> -n <function-app> --settings AzureWebJobs.FinOpsImporter.Disabled=true
```

The `AzureWebJobs.<Function>.Disabled` setting is the operational kill switch for one timer, which I'd
document in the runbook. For portal schedulers the equivalent is a config change and a rollout, which
is slower, so disabling a misbehaving provider deserves a feature flag in config.

</div>

</details>

## Security and Identity
{: #security-and-identity }

<details class="project-iq" markdown="1" id="security-and-identity-q1">
<summary>How do users authenticate, and how is authorization enforced?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Authentication:** Entra ID OAuth is the only production sign-in. The sign-in resolver checks the
corporate email domain and membership of a standard-user group for the environment; anyone else
doesn't get a session. Idle sessions sign out after four hours, with a prompt first. A GitHub App
sign-in is added only for actions that must act as the user on GitHub.

**Authorization:** one custom permission policy (`CorePermissionPolicy`):

- **16 Entra security groups are the platform roles**, mapped to permissions such as
  `template.azure-function.create`.
- **Environment scoping:** the same permission is allowed only in some subscriptions (Function Apps in
  development only; Start VM in dev, QA and performance test), checked by validation actions such as
  `template:validate-startvm-permissions` against `permissionConfiguration.ts`.
- **Unmapped permissions are allowed.** A permission that isn't in the role map falls through to
  `ALLOW`. That's what keeps built-in Backstage reads working, and it's also the gap I'd close: a new
  plugin permission someone forgets to map is open to every signed-in user. Deny-by-default for any
  permission with a custom plugin prefix fixes it.
- **Hard blocks** for everyone, admins included: creating or deleting catalog entities and managing
  templates through the UI.
- **Navigation follows permission but never replaces it.** Hiding a menu item is UX; the 403 is the
  control.

The design choice I'd defend: **role membership lives in Entra** (where access reviews already look),
and **role meaning lives in code** (where changes are reviewed and versioned). Adding a permission has
a written path, so features don't invent their own checks, and every gated feature has a 403 test.

Deeper: [Authentication and authorization](/posts/projects/oneplatform/06-security-and-privacy/#authentication-and-authorization).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Authentication and authorization in code:

- **Sign-in resolver** (`packages/backend/src/plugins/auth.ts`, Microsoft provider): requires an email,
  checks the domain, fetches the members of the environment's standard-user group, then
  `signInWithCatalogUser({ entityRef })`, so the session's ownership refs come from the catalog user and
  its groups.
- **Idle logout**: `auth.idleTimeoutMinutes: 240` in `app-config.yaml`, with the `autoLogoutExtension`
  in the app root.
- **Policy**: `CorePermissionPolicy.handle()` denies four hard-blocked permissions, allows mapped ones
  only for listed groups, and allows anything unmapped.
- **Routes**: `httpAuth.credentials(req, { allow: ['user'] })` then `permissions.authorize(...)`.

```ts
const allowedGroups = customPluginPermissionRoles[request.permission.name];
if (allowedGroups) {
  return allowedGroups.some(g => lowercaseUserGroups.includes(String(g).toLowerCase()))
    ? { result: AuthorizeResult.ALLOW } : { result: AuthorizeResult.DENY };
}
return { result: AuthorizeResult.ALLOW };
```

The change I'd make in that last line: deny any permission whose name starts with one of our plugin
prefixes but isn't mapped, and add a unit test that lists every permission defined in `plugins/*` and
fails if one isn't in the map.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Identity infrastructure:

- **Entra app registration** for portal sign-in (client secret in Key Vault, mounted by the CSI driver).
- **Entra security groups** per role and per environment's standard users; membership managed in Entra
  and reviewed there.
- **GitHub Apps** per org (`integrations.github[].apps`), keys in Key Vault.
- **Service principals** for Azure actions (`AZURE_API_CLIENT_ID`/`SECRET`), scoped per subscription.
- **Middleware**: workload identity on its ServiceAccount for App Configuration and Key Vault; a
  shared client ID and secret for the portal to obtain middleware tokens.

```bash
az ad app credential list --id <portal-app-id> --query "[].{name:displayName,end:endDateTime}" -o table
az ad sp credential list --id <actions-sp-id> --query "[].endDateTime" -o tsv
kubectl get secretproviderclass -n <portal-ns> -o yaml | yq '.items[].spec.parameters.objects'
```

What I'd add: a scheduled workflow that lists every credential's expiry date (app registrations, service
principals, GitHub App keys) and opens an issue 60 days before expiry. Expired credentials are the most
likely portal-wide outage.

</div>

</details>

<details class="project-iq" markdown="1" id="security-and-identity-q2">
<summary>How are secrets and credentials managed?</summary>

<div class="iq-role" data-role="architect" markdown="1">

- **Production:** secrets live in Azure Key Vault and reach portal pods through the **Key Vault CSI
  driver**. The middleware uses **workload identity** and reads App Configuration with Key Vault
  references, so no connection strings sit in Helm values.
- **Builds:** the registry token goes into `docker build` as a BuildKit secret mount, never a build arg
  or image layer. CI authenticates to the registry with OIDC.
- **Runtime-resolved secrets:** Teams webhook URLs are resolved from Key Vault through a database
  name-to-secret mapping.
- **Local development** was the biggest win. Developers used to keep about 50 plaintext credentials
  (four GitHub Apps, Jira OAuth, Datadog, SMTP, SonarQube, registry tokens, service principal secrets)
  in a local env file. A bootstrap step now fetches them from the development vault with the
  developer's own `az login`. That removed the most common way secrets leak.

The risk I'd name is **expiry**: a portal acting through many identities fails when one secret
expires, and "users can't sign in" or "a template fails for everyone" is usually an expired app secret
or a lost permission. So I'd keep a credential expiry register with owners.

> **TODO:** What's the rotation policy and owner for the GitHub App keys and service principal secrets?
{: .prompt-warning }

Deeper: [Secrets](/posts/projects/oneplatform/06-security-and-privacy/#secrets-and-key-management).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Secrets as the code sees them:

- **Environment variables** only (`AZURE_API_CLIENT_SECRET`, `PF1_API_CLIENT_SECRET`,
  `GITHUB_APP_PRIVATE_KEY`, …), populated in the pod from the CSI-mounted Key Vault secrets.
- **Config substitution**: `app-config.yaml` references them as `${GITHUB_APP_ID}`; frontend-visible
  config keys must be marked `@visibility frontend` in a `config.d.ts`, so secrets can't be exported to
  the browser by accident.
- **Local**: a bootstrap script fetches development secrets into `local.env` with the developer's own
  `az login`; scripts load it with `node --env-file-if-exists=local.env`.
- **Middleware**: `IOptions<AppConfig>` bound from App Configuration, with Key Vault references resolved
  by the configuration provider.

```yaml
integrations:
  github:
    - host: github.com
      apps:
        - appId: ${GITHUB_APP_ID}
```

Gotcha in the middleware login: client secrets are compared with `==`. A constant-time comparison
(`CryptographicOperations.FixedTimeEquals`) is the standard fix, even on an internal endpoint.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Secret plumbing:

| Workload | Mechanism | Rotation path |
|---|---|---|
| Portal | Key Vault CSI driver (`SecretProviderClass`), secrets synced to env vars | Update in Key Vault, restart pods |
| Middleware API | Workload identity → App Configuration → Key Vault references | Update in Key Vault; App Configuration refresh or restart |
| Functions | App settings with Key Vault references | Automatic on reference refresh |
| CI | OIDC to the registry; BuildKit secret mounts for build-time tokens | No long-lived CI secrets |

```bash
az keyvault secret set --vault-name <vault> --name <secret> --value '<new>'
kubectl rollout restart deploy/<portal> -n <ns>
az keyvault secret show --vault-name <vault> --name <secret> --query attributes.expires
```

Gotcha: the middleware signs its tokens with a symmetric key from configuration, and tokens live a
month. Rotating that key invalidates every issued token at once, and the portal caches its token without
refreshing, so a key rotation needs a portal restart in the same change.

</div>

</details>

<details class="project-iq" markdown="1" id="security-and-identity-q3">
<summary>How is sensitive data protected, and which compliance constraints applied?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**PHI** is the sharpest constraint. The service map shows Application Insights telemetry, and SQL
exception parameters there can contain PHI. So the backend filters it:

- Rules live in **one config file**: a master switch, the allowed locations, and per-data-type rules.
- The user's **directory usage location** decides whether they may see it.
- The filter **fails closed**, and the browser never receives the raw value; filtering in the frontend
  was rejected because DevTools would show it.
- Generic helpers let any other API apply the same rules.

**SOX/SOC evidence** for access reviews, terminations and license approvals means those records are
owned data with audit trails (task logs, audit schemas, Jira tickets).

**Least privilege:** templates act through scoped service principals and GitHub Apps, so users never
hold standing elevated access.

**Minimization:** catalog users carry only the Graph fields we select, and E2E tests use a synthetic
guest identity with synthetic data, never PHI, PII or real accounts.

The gap I'd close first: dedicated **table-driven tests for every PHI rule** (record in, redacted record
out), because it's the most sensitive behaviour in the portal.

Deeper: [Privacy](/posts/projects/oneplatform/06-security-and-privacy/#privacy-and-data-protection-requirements).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Data protection controls in the platform:

| Control | Where |
|---|---|
| TLS at the edge | Internal nginx ingress, certificates from Key Vault |
| TLS to PostgreSQL | `ssl` in the database config; server requires TLS |
| Internal-only exposure | Internal ingress class; no public DNS |
| Runtime protection | A container runtime defender in the production namespace |
| Secrets | Key Vault, CSI driver, workload identity |
| PHI | Backend filter in `packages/backend/permissions/phi-*.ts` |
| Evidence | Audit schemas in PostgreSQL (backup and retention to confirm) |

```bash
kubectl get pods -n <portal-ns> -o jsonpath='{range .items[*]}{.spec.containers[*].securityContext}{"\n"}{end}'
```

Gap I'd raise: the portal manifest sets no container `securityContext` beyond the image's `USER node`.
Adding `runAsNonRoot`, `allowPrivilegeEscalation: false`, dropped capabilities and a read-only root
filesystem (with an `emptyDir` for temp) is cheap hardening for a pod that holds this many credentials.

</div>

</details>

<details class="project-iq" markdown="1" id="security-and-identity-q4">
<summary>Which threats did you design against?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The framing: **the portal's own power is the main risk.** If someone compromises it, they hold every
permission it holds.

| Threat | Example | Control |
|---|---|---|
| Elevation of privilege | Calling a template's API directly to bypass the UI | Server-side policy on every route and template; hard blocks |
| Information disclosure | PHI in exception messages reaching the wrong user | Backend PHI filter, fail closed |
| Spoofing | A forged caller on an internal route or webhook | Backstage service auth; static tokens for webhooks; JWT to the middleware |
| Tampering | Changing catalog ownership to gain approval rights | UI catalog mutation hard-blocked; changes via Git or audited overlays |
| Repudiation | "I never approved that license" | Approval records with identity and time |
| Supply chain | A compromised npm/NuGet package or Action | SHA-pinned Actions, lockfiles, private registry proxy, Dependabot, Sonar |

Two controls I'd single out. **Ownership tampering** is subtle: in a portal, owning an entity can grant
approval rights, so ownership changes must go through Git or an audited overlay. And **incident
response starts with the portal's power**: disable the affected template or permission, revoke the App
installation or service principal secret, then read scaffolder history for what ran.

> **TODO:** Has the threat model been reviewed with the security team, and has the portal had a
> penetration test?
{: .prompt-warning }

Deeper: [Threat modeling](/posts/projects/oneplatform/06-security-and-privacy/#threat-modeling).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Threats with the code that addresses each:

| Threat | Code | Gap |
|---|---|---|
| Bypassing the UI | `httpAuth.credentials` + `permissions.authorize` in routers | Unmapped permissions allowed by the policy |
| Catalog tampering | Hard-blocked `catalog.entity.create/delete` | None |
| PHI leakage | `phi-filter.ts`, `phi-access-check.ts` (fails closed on lookup errors) | No dedicated rule tests |
| Log forging | `SanitizingLogger` replaces `\r` and `\n` with markers | Portal logs not sanitized the same way |
| Probing IDs | HITL returns 403 for unknown requests | Convention not written down |
| Template injection | Scaffolder expressions in `isolated-vm` | None |
| Weak service auth | Middleware HS256 token, issuer and audience not validated, one-month lifetime | Use Entra tokens |
| Anonymous side effects | One middleware email endpoint allows anonymous calls | Require the JWT |

```csharp
IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(appConfig.Identity.SigningKey)),
ValidateIssuerSigningKey = true, ValidateLifetime = true,
ValidateIssuer = false, ValidateAudience = false,
```

The last two rows are the ones I'd fix first: they're small changes with a big reduction in what someone
on the internal network could do.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Platform threats and controls:

| Threat | Control today | To add |
|---|---|---|
| Compromised portal pod | Key Vault CSI, internal ingress, runtime defender | Pod `securityContext`, NetworkPolicy egress allow-list |
| Supply chain (npm, NuGet, Actions) | Lockfiles, private registry proxy, SHA-pinned Actions, Dependabot | Image vulnerability scan before promotion |
| Secret leakage from builds | BuildKit secret mounts, OIDC | Scan built images for secrets |
| Drift from Git | Argo CD | Retire the direct AKS deploy workflow |
| Middleware reachable broadly | Internal ingress, CORS | NetworkPolicy: only portal pods to the middleware |

```bash
trivy image <registry>/platformone:<tag> --severity HIGH,CRITICAL --exit-code 1
kubectl get networkpolicy -A | grep -E "<portal-ns>|<middleware-ns>"
```

The scan step belongs in `promote-staging.yml` and `promote-prod.yml`: promotion is the moment an image
becomes more trusted, so it's the right gate.

</div>

</details>

## Performance and Scalability
{: #performance-and-scalability }

<details class="project-iq" markdown="1" id="performance-and-scalability-q1">
<summary>What load does the system handle, where are the bottlenecks, and how does it scale?</summary>

<div class="iq-role" data-role="architect" markdown="1">

User load is modest: an internal portal used in business hours. **Ingestion load is not**, and that's
where the bottlenecks were:

- **Catalog writes.** The Azure provider walked 22+ subscriptions in one task and wrote ~10,000 entities
  in one mutation, which locked the catalog database for everyone. The fix (~22 providers writing ~500
  entities each on staggered schedules) is built on a feature branch and not yet merged.
- **External API limits.** GitHub per-App limits and Azure throttling; handled by staggering and
  per-org Apps.
- **Heavy reports.** Solved with materialized views.
- **Browser-side computation.** SQL schedule compliance froze the UI thread; moved to a Web Worker. The
  service map culls nodes outside the viewport.

Scaling today: the portal runs **two replicas** on AKS, the middleware API is separate and can scale on
its own, and timer jobs run in a Function App. Capacity planning should be based on CPU and memory
**during ingestion**, not user traffic.

> **TODO:** How many active users at peak, and how long does a full catalog refresh take? Those two
> numbers say when two replicas stop being enough.
{: .prompt-warning }

Deeper: [Scalability strategy](/posts/projects/oneplatform/05-technical-architecture/#scalability-and-performance-strategy).

</div>

<div class="iq-role" data-role="sre" markdown="1">

Load and saturation, from the code:

- **User load**: two portal pods, async Node, modest traffic.
- **Ingestion**: the Azure provider builds all entities in memory and writes one `full` mutation per run;
  GitHub discovery per org; Graph users and groups every 10 minutes.
- **Sign-in**: the resolver fetches the members of the standard-user group from Graph on every sign-in,
  which grows with the group's size.
- **Middleware**: one replica; long imports run in Functions, not the API.

```bash
kubectl top pod -n <portal-ns>
kubectl get pod -n <portal-ns> -o jsonpath='{.items[*].spec.containers[*].resources}'
```

Saturation signals I'd chart: portal pod CPU and event-loop lag during the Azure run, catalog database
lock waits, sign-in latency. The missing resource requests mean the scheduler can place both portal pods
on a busy node, so CPU contention during ingestion is also a node-level question.

> **TODO:** How many active users at peak, and how long does a full Azure ingestion run take?
{: .prompt-warning }

</div>

</details>

<details class="project-iq" markdown="1" id="performance-and-scalability-q2">
<summary>How would the design change at ten times the users or data?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**10x users** (say, opening the portal to every employee for HR-style requests): the portal backend is
stateless apart from PostgreSQL, so horizontal scaling works. I'd add CPU and memory requests and
limits (missing today in most environments), a HorizontalPodAutoscaler, readiness probes wired to the
health checks, and a k6 baseline for search, catalog list and the heaviest dashboards to size it.

**10x data** is the more interesting case:

- **Catalog:** 100,000+ entities. Merging the per-subscription providers keeps writes small; I'd also look at
  separating ingestion workers from the user-facing backend (Backstage supports splitting backend
  instances by plugin), so ingestion CPU never competes with requests.
- **Database:** give the busiest middleware schemas their own server. Schemas are already isolated, so
  it's a configuration change.
- **FinOps:** partition the raw FOCUS table by month and keep pages on materialized views.
- **External APIs:** more GitHub App installations, GraphQL bulk queries, and webhooks instead of
  polling where the source supports them.

The design holds because the boundaries were chosen for this: per-provider ingestion, per-feature
schemas, and portal versus middleware.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Platform changes for 10x:

- **Resource requests and limits** on the portal and every middleware environment (today only the
  middleware's development values set them).
- **Split ingestion from serving**: a second portal Deployment running only catalog providers (Backstage
  supports running a subset of backend features per deployment), with its own resources.
- **HPA** on the serving Deployment once requests exist.
- **Middleware**: more than one replica, a PDB, and readiness on `/healthz`.
- **Database**: scale the PostgreSQL tier; separate servers for the busiest middleware schemas (needs a
  connection string per context first).

```bash
kubectl autoscale deploy/<portal> -n <ns> --min=2 --max=6 --cpu-percent=70
kubectl create pdb <portal> -n <ns> --selector=app=<portal> --min-available=1
```

The first change is the cheapest: requests and limits. Without them, an HPA has nothing to scale on and
the scheduler can't protect the portal from noisy neighbours.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Reliability at 10x:

| Risk | Guardrail |
|---|---|
| Catalog writes grow tenfold | Merge per-subscription providers; batch writes |
| Sign-in slows with group size | Cache group membership; check membership with a direct Graph `checkMemberGroups` call instead of listing members |
| Middleware single replica | 2+ replicas, PDB, readiness probes |
| External API limits | Octokit throttling plugin; Resource Graph instead of per-resource ARM calls |
| Telemetry cost | App Insights sampling and daily cap |

SLOs I'd hold at that scale: sign-in p95 under 3 seconds, template submit to task start p95 under 5
seconds, catalog entity freshness under twice the provider interval. Each needs a measurement that doesn't
exist yet, so instrumenting comes before scaling.

</div>

</details>

<details class="project-iq" markdown="1" id="performance-and-scalability-q3">
<summary>How did you measure and improve performance?</summary>

<div class="iq-role" data-role="architect" markdown="1">

So far, performance work has been **diagnosis-driven**, and I'd say that honestly. Each fix came from
a symptom users felt:

| Symptom | Diagnosis | Fix |
|---|---|---|
| Portal slow for everyone during Azure ingestion | One 10,000-entity mutation locking the catalog DB | Per-subscription providers, ~500-entity writes (on a branch, not merged) |
| SQL schedule compliance page freezing | Heavy computation on the UI thread | Web Worker |
| Service map sluggish | Rendering every node | Viewport culling |
| FinOps pages slowing as data grew | Queries on the raw cost table | Materialized views |

The tools: OpenTelemetry traces in Application Insights across portal and middleware (one trace per
request across both cloud roles), and request and dependency metrics from auto-instrumentation.

What I'd add to move from reactive to proactive: three metrics that would have shown the catalog lock
before users did (template runs per hour and failure rate, ingestion duration per provider, middleware
import duration per run), and a **k6 baseline** run against staging before each Backstage upgrade.

> **TODO:** No load tests exist yet. What's the expected peak (concurrent users, template runs per hour)?
{: .prompt-warning }

Deeper: [Performance testing](/posts/projects/oneplatform/10-quality-assurance/#performance-and-load-testing).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Performance fixes as code:

- **Web Worker** in `useSqlMonitoringData` / `useFileMonitoringData`: heavy schedule calculations move
  off the UI thread; the hook posts data in and receives results.
- **Viewport culling** in the service map: render only nodes in view.
- **Materialized views** for FinOps, with refresh gated by integrity.
- **Lazy loading**: page and form-field components loaded with `import()`.
- **Batching** (on the ingestion branch): ~500 entities per write.

```ts
const worker = new Worker(
  new URL('../../FileMonitoring/workers/scheduleComplianceWorker.ts', import.meta.url));
worker.onmessage = (event: MessageEvent<WorkerOutput>) => {
  worker.terminate();
  if (event.data.success) { resolve(event.data.summaries.map(deserializeSummary)); return; }
  reject(new Error(event.data.error));
};
worker.postMessage({ configs, audits, toleranceMinutes: DEFAULT_TOLERANCE_MINUTES, nowIso });
```

(Argument names shortened; the structure is the hook's.) A worker per calculation, terminated on
completion, wrapped in a Promise so React Query can await it. The improvement I'd make next: `await` the Azure provider's
`run()` so its duration is measurable, then record ingestion duration per run as a metric. You can't
improve what the scheduler can't see.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Measurement plan:

| What | How |
|---|---|
| Request latency per plugin route | OpenTelemetry auto-instrumentation → App Insights `requests` |
| Dependency latency (Graph, GitHub, middleware, PostgreSQL) | App Insights `dependencies` |
| Ingestion duration per provider | Custom metric (Backstage's metrics service is a no-op today: `noopMetricsServiceFactory` is registered first) |
| Template duration and failure rate | Scaffolder task table |
| Browser responsiveness | Playwright timing checks on heavy pages |

```kusto
dependencies
| where cloud_RoleName has "<portal>"
| summarize p95=percentile(duration,95), n=count() by target
| top 10 by p95
```

The first step I'd take is replacing the no-op metrics service with an OpenTelemetry-backed one, so
plugins can emit counters and histograms that land next to the traces.

</div>

</details>

## Reliability and Resilience
{: #reliability-and-resilience }

<details class="project-iq" markdown="1" id="reliability-and-resilience-q1">
<summary>What are the failure modes, and how does the system degrade when a part fails?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Failure | Effect | Degradation |
|---|---|---|
| One Azure subscription fails to ingest | Its resources go stale | Logged and skipped inside the single provider today; isolated once per-subscription providers merge |
| An expired secret or lost permission on an action's identity | That template fails for everyone | Requester notified with the error; others work |
| Middleware down | Audits, FinOps and monitoring pages fail | Catalog, templates and docs keep working (separate service) |
| FOCUS import incomplete | Reports would be wrong | Integrity gate keeps yesterday's correct views |
| One portal pod down | Brief blip | Second replica serves |
| Upstream API retired | A feature breaks | Planned migration (for example Copilot metrics) |

Looking at how the portal is built, I'd expect most incidents to be **credential or upstream** problems
rather than code. That leads to two habits: track every credential's expiry in one place, and treat
vendor deprecation notices as planned work with a date.

For a portal-wide incident, the first move is a **system alert** banner so users stop retrying and
filing duplicates, then health endpoints, recent releases (roll back by tag), and credential expiry.

The gap I'd fix: the health endpoints aren't wired into Kubernetes readiness probes in these repos, and
the portal's check doesn't test the database.

Deeper: [Resilience](/posts/projects/oneplatform/05-technical-architecture/#resilience-and-disaster-recovery).

</div>

<div class="iq-role" data-role="sre" markdown="1">

Failure modes with detection:

| Failure | Effect | Detection today | To add |
|---|---|---|---|
| Expired Entra app secret | Nobody can sign in | Users report it | Synthetic sign-in; expiry register |
| Expired action credential | One template fails for all | Requester notifications | Template failure rate alert |
| Middleware token expired | All middleware pages fail | Users | 401 rate alert |
| One subscription fails in ingestion | Its resources may vanish or go stale | Logs | Entity count per subscription |
| Middleware DB context down | `/healthz` 503 | Nothing acts on it | Readiness probe |
| Portal pod unhealthy | Still receives traffic | None (no probes) | Readiness probe |

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://<portal>/healthcheck/ready
curl -s https://<middleware>/healthz | jq '.entries | to_entries[] | {k: .key, s: .value.status}'
```

The pattern in this table: the system has good health endpoints and good user-facing error messages, but
nothing connects the two to an operator. Wiring probes and four alerts closes most of it.

</div>

</details>

<details class="project-iq" markdown="1" id="reliability-and-resilience-q2">
<summary>What are the availability and recovery targets, and how are backup and disaster recovery handled?</summary>

<div class="iq-role" data-role="architect" markdown="1">

No SLOs are recorded yet, so I'd present the proposal and how I'd use it:

| SLI | Proposed SLO |
|---|---|
| Sign-in and home page available (synthetic) | 99.5% in business hours, monthly |
| Template submit to task start | p95 under 5 s |
| Middleware-backed dashboard load | p95 under 3 s |
| Daily FOCUS import with full integrity | 95% of days |
| Catalog provider runs succeeding | 99% per provider |

Operations relies on the portal's dashboards **during** incidents, so availability matters most to them;
I'd agree targets with them first.

**DR** splits by ownership. Code, images and charts rebuild from Git and the registry. The catalog
rebuilds from Azure, Graph and GitHub in hours. Owned data (audits, terminations, approvals, role maps)
needs point-in-time restore on PostgreSQL and a tested restore.

> **TODO:** Are SLOs agreed? What RPO and RTO apply to the PostgreSQL server, which backup tier is it on,
> has a restore been tested, and is there a second region?
{: .prompt-warning }

Deeper: [Availability targets](/posts/projects/oneplatform/14-operations-and-observability/#availability-and-performance-targets).

</div>

<div class="iq-role" data-role="devops" markdown="1">

DR as concrete steps:

1. **Cluster**: Argo CD re-syncs the portal from the charts repo; the middleware redeploys with Helm.
2. **Secrets**: Key Vault (soft delete and purge protection on) re-mounts through CSI and workload
   identity.
3. **Database**: point-in-time restore of the PostgreSQL server; update the connection details in Key
   Vault and App Configuration.
4. **Catalog**: re-ingests on schedule.
5. **Functions**: redeploy the package; timers resume.

```bash
argocd app sync <portal-app>
helm upgrade --install <middleware> HelmCharts -f HelmCharts/values-prod.yaml --set image.tag=<tag>
az postgres flexible-server restore -g <rg> -n <new> --source-server <server> --restore-time <utc>
az keyvault show -n <vault> --query "properties.{softDelete:enableSoftDelete,purge:enablePurgeProtection}"
```

The step that takes longest is the one people forget: updating every connection reference (Key Vault
secrets for the portal, App Configuration for the middleware) to the restored server. A runbook with the
exact keys turns hours into minutes.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Targets I'd propose, as SLOs with owners:

| SLO | SLI | Target |
|---|---|---|
| Sign-in available | Synthetic sign-in success, business hours | 99.5% monthly |
| Pages work | Non-5xx ratio of portal API calls | 99.5% |
| Templates work | Successful runs ÷ runs, excluding validation failures | 95% per template |
| Middleware healthy | `/healthz` 200 ratio | 99.5% |
| FinOps fresh | Days with a successful integrity-checked import | 95% |

Recovery: RPO 5 minutes and RTO 4 hours for owned data via point-in-time restore; the catalog has no RPO
because it's rebuilt.

> **TODO:** Are SLOs agreed, and has a PostgreSQL restore been tested?
{: .prompt-warning }

</div>

</details>

<details class="project-iq" markdown="1" id="reliability-and-resilience-q3">
<summary>How do you make jobs and deployments safe to retry?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Jobs:**

- **FOCUS import:** per-blob status, so a rerun skips completed blobs; tag repair from stored data; views
  refreshed only after full integrity. Running it twice is safe.
- **Catalog providers:** stable entity refs, so reruns update rather than duplicate, and a failed run
  is simply retried on the next schedule.
- **Scaffolder actions:** check before create (`azure:check-resource-exists`, name availability), and the
  Terraform they trigger converges.
- **Termination automation:** logged per user and per batch, so a partial run can be reviewed and
  resumed.

**Deployments:**

- Images are immutable and tagged by date (`YYYY.MM.DD.<run>`); promotion copies a tag between values
  files, so re-running a promotion is a no-op.
- **Rollback** is a revert of the values change or a promotion run with an older tag; Argo CD syncs the
  old image back. The middleware rolls back with a Helm deploy of the previous tag.
- **Database changes roll forward, never back**, which is why EF migrations must stay backward compatible
  for one release and are applied before the API deploy.

The default for small defects is roll forward: fix, release, promote. The pipeline is short enough that
it's usually faster than a rollback.

Deeper: [Rollback](/posts/projects/oneplatform/12-cicd-and-release-management/#rollback-and-roll-forward-procedures).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Retry safety in code:

- **FinOps import**: per-blob status, so reruns skip finished blobs; views refreshed only after
  `FinOpsDataIntegrityService` passes.
- **Providers**: `applyMutation({ type: 'full', entities })` replaces the provider's set, so a rerun
  converges.
- **Actions**: check actions before create actions; Terraform converges.
- **Migrations**: EF tracks applied migrations per schema; Knex tracks per plugin.

```ts
await this.connection.applyMutation({
  type: 'full',
  entities: entities.map(entity => ({ entity })),
});
```

Gotcha with `full`: whatever the provider didn't emit is removed. If one subscription errors and is
skipped, its entities are dropped in that run (and come back next run), so pages briefly lose resources.
Per-subscription providers, or `delta` mutations for failed subscriptions, avoid that flicker.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Deployment safety:

- **Promotion is idempotent**: `promote-prod.yml` checks "tag not already in prod" and exits cleanly.
- **Format check**: tags must match `YYYY.MM.DD.<digits>`.
- **Rollback**: run the promotion with an older tag (both promote workflows accept one), or revert the
  values commit.
- **Middleware rollback**: Helm to the previous image tag; migrations roll forward only.

```bash
gh workflow run "Promote to Production" -f IMAGE_TAG=2026.09.28.2
git -C <charts-repo> log --oneline -5 -- platformone/values-prod.yaml
```

Gotcha: the production promotion pushes directly to the charts repo's branch (no PR), so the approval on
the `production` environment is the only human gate. That's fine if required reviewers are configured,
and worth checking, because otherwise production changes have no second pair of eyes.

</div>

</details>

## Testing and Quality
{: #testing-and-quality }

<details class="project-iq" markdown="1" id="testing-and-quality-q1">
<summary>What is your testing strategy across the frontend, backend and data?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Separate lanes, each owning one kind of risk.** The file suffix is the contract: `.test.ts` runs in
the unit lane, `.integration.test.ts` never does.

| Lane | Scale (one recorded green run) | Owns |
|---|---|---|
| Portal unit (Jest) | 2,693 tests, 221 suites, 27 projects | Logic, components, plugin registration, composition |
| Portal integration (Jest + Testcontainers PostgreSQL 16) | 356 tests, 62 suites | Migrations, routes, real API clients, schedulers, startup and shutdown |
| Portal E2E (Playwright) | 30 tests | Routing, sign-in boundaries, responsive shell, console errors |
| Middleware (xUnit) | ~1,850 test methods | Services with hand-rolled fakes; Testcontainers for PostgreSQL **and** SQL Server |

Two habits matter more than the counts. **Unit tests are written in the same phase as the code**: we
moved them there because tests written at the end missed details. And **every permission-gated feature
has a negative test**: the 403 is part of acceptance.

The scariest change is the monthly Backstage upgrade, so a **pre-upgrade compatibility workflow** runs
every lane (Node matrix, PostgreSQL 16 and 17, E2E, an image preflight) before an upgrade merges.

Gaps I'd name: no load tests, no automated accessibility checks, and no dedicated PHI-rule tests yet.

Deeper: [Quality Assurance](/posts/projects/oneplatform/10-quality-assurance/#unit-testing).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The lanes, as commands and conventions:

```bash
yarn test                    # unit: everything except *.integration.test.ts
yarn test:integration        # Testcontainers PostgreSQL, --maxWorkers=1, 120 s timeout
yarn test:leaks              # --detectOpenHandles, for hanging handles
yarn playwright test         # E2E, projects generated from packages with e2e-test folders
dotnet test test/Middleware.Tests.Unit
dotnet test test/Middleware.Tests.Integration
```

- **Unit**: Jest via `backstage-cli repo test`; routers tested with mocked core services
  (`permissions.authorize.mockResolvedValue([{ result: 'DENY' }])` for the 403 case).
- **Integration**: real routers, real migrations, real API clients against them.
- **E2E**: Playwright with a guest sign-in that exists only in `app-config.e2e.yaml`.
- **Middleware**: xUnit with hand-written fakes (`test/Middleware.Tests.Unit/Fakes`) and Testcontainers
  for PostgreSQL and SQL Server.

What I'd add: table-driven tests for every PHI rule (record in, redacted record out), and a test that
fails when a defined permission isn't mapped in the policy.

</div>

</details>

<details class="project-iq" markdown="1" id="testing-and-quality-q2">
<summary>How do you test integrations with external systems?</summary>

<div class="iq-role" data-role="architect" markdown="1">

By testing the **boundaries we own** against real infrastructure, and faking the systems we don't.

- **Databases are real.** Integration tests run against PostgreSQL 16 in Testcontainers, a fresh
  container per run; the middleware also runs SQL Server in Testcontainers, which matters for
  termination and SQL monitoring.
- **API contracts are real.** The production frontend API client runs against the real backend router,
  so a renamed field fails a test. The middleware plugin's router tests check request shape, the auth
  header, error mapping, and that the delegated token never leaks into a response.
- **External SaaS is synthetic.** E2E intercepts feature APIs with synthetic responses, and uses a guest
  sign-in provider that exists only in the E2E backend config. Never real Azure AD credentials, PHI,
  PII, production data or live services.
- **Published contracts** (HITL v1, the notifications API) are documented with full examples.
- **Side effects are redirected** outside production: the middleware email service can send
  non-production mail to test accounts.

We don't use a consumer-driven contract tool like Pact. The contracts that would break silently are
covered by the integration lane instead.

> **TODO:** Is there a test that runs the portal's middleware client against a real middleware build?
{: .prompt-warning }

Deeper: [Contract testing](/posts/projects/oneplatform/10-quality-assurance/#contract-testing).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Integration testing patterns:

- **Router + real client**: the production frontend client calls the real backend router in the
  integration lane, so field renames fail tests.
- **Permission paths**: tests assert `permissions.authorize` is called with the right permission and that
  a DENY produces `NotAllowedError`; service-only and user-only routes are tested with
  `httpAuth.credentials.mockRejectedValue(new NotAllowedError('User only'))`.
- **Databases**: Testcontainers PostgreSQL 16 (and SQL Server in the middleware).
- **External SaaS**: faked; E2E intercepts feature APIs with synthetic responses.

```ts
permissions.authorize.mockResolvedValue([{ result: 'DENY' }]);
await request(app).post(`/requests/${id}/approve`).send({}).expect(403);
```

(The mock line is from the HITL router tests; the request line shows how it's exercised.) The gap I'd
close: no test runs the portal's middleware client against a real middleware build, so a renamed
middleware field is caught only in development.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Test infrastructure:

- **Testcontainers** needs Docker on the CI runner; the integration lane runs with `--maxWorkers=1` to
  keep container counts predictable.
- **E2E** starts the app with `app-config.e2e.yaml` (guest auth) through Playwright's `webServer`.
- **Middleware** unit and integration workflows run separately (`middleware-ci-unit-tests.yml`,
  `middleware-ci-integration-tests.yml`).
- **The pre-upgrade workflow** runs all lanes, a Node matrix, PostgreSQL 16 and 17, and an image
  preflight.

```bash
gh workflow run platformone-pre-upgrade-compatibility.yml -f ref=<upgrade-branch>
docker ps --filter "label=org.testcontainers=true"
```

What I'd add for integration with the middleware: a job that builds the middleware image, runs it with a
PostgreSQL container, and runs the portal's middleware-client tests against it. It's the one contract
that crosses repositories.

</div>

</details>

<details class="project-iq" markdown="1" id="testing-and-quality-q3">
<summary>Which quality gates does code pass before it merges and ships?</summary>

<div class="iq-role" data-role="architect" markdown="1">

From PR to production:

1. **Local:** ESLint and Prettier via `lint-staged`; `yarn lint` on changed files.
2. **PR checks:** build and type-check, unit and integration lanes, a combined coverage run feeding
   **SonarQube**, which gates new code, in both repos. Middleware unit and integration tests run on PR
   too. ESLint on changed files; CodeQL configured in the middleware.
3. **Review:** CODEOWNERS assigns reviewers, with a smaller owner set for `.github/`, since workflow
   changes can deploy to production. Reviewers check plan conformance (PR follows PLAN and DESIGN, or
   the doc is updated), a permission check and denial test for every new route, `common-ui` use, and no
   secrets or real data.
4. **Upgrades:** the pre-upgrade compatibility run.
5. **Release:** dev deploys automatically; staging by promotion; **production needs an approver** on
   the `production` GitHub environment.
6. **Per-feature go-live:** a production readiness review (permission and 403 test, PHI, identity scope,
   failure behaviour, migration order, telemetry, architecture docs).

Gaps I'd close: anonymous E2E route checks on every PR (they take seconds) and an image vulnerability
scan before promotion.

Deeper: [Approval gates](/posts/projects/oneplatform/12-cicd-and-release-management/#approval-gates),
[readiness review](/posts/projects/oneplatform/13-deployment-and-go-live/#production-readiness-review).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Gates from the developer's side:

- **Pre-commit**: `lint-staged` with ESLint and Prettier.
- **PR**: build and type-check (`yarn tsc`), unit and integration lanes, coverage to SonarQube.
- **Review checklist**: permission check and 403 test per new route, `common-ui` for states, no secrets or
  real data in fixtures, PLAN/DESIGN docs updated if the implementation diverged.

```bash
yarn lint --since origin/main
yarn tsc
yarn test --coverage
```

What I'd add as automated checks rather than review items: an ESLint rule (or a small script) that fails
when a router file defines a route without a `permissions.authorize` call, and the
unmapped-permission test. Reviewers miss what tooling never does.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Pipeline gates:

| Stage | Gate |
|---|---|
| PR (portal) | `Platformone-Build-.yml`: build, type-check, tests; `sonarqube-scan.yml` |
| PR (middleware) | Build, unit and integration workflows, SonarQube, CodeQL |
| Release | `platformone-release.yml`: build the image once, date tag, Git tag, prerelease, dev values bump |
| Staging | `promote-staging.yml` |
| Production | `promote-prod.yml` behind the `production` environment |

```bash
gh api repos/<owner>/<portal-repo>/branches/main/protection | jq '.required_status_checks.contexts'
gh api repos/<owner>/<portal-repo>/environments/production | jq '.protection_rules'
```

Gaps I'd close: an image vulnerability scan before promotion, anonymous E2E route checks on every PR
(seconds to run), and confirming the SonarQube gate is a required status check, not just a report.

</div>

</details>

## Infrastructure and Environments
{: #infrastructure-and-environments }

<details class="project-iq" markdown="1" id="infrastructure-and-environments-q1">
<summary>Where and how is the application hosted, and why there?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Component | Hosting |
|---|---|
| Portal (frontend + backend) | AKS deployment, 2 replicas, one namespace per environment |
| Middleware API | AKS via Helm |
| Middleware Functions | Azure Function App per environment |
| Database | PostgreSQL 16 server, TLS required |
| Telemetry | Application Insights for both apps |

Both apps sit behind an **internal nginx ingress** with TLS certificates pulled from Key Vault: the
portal is internal only, never on the internet. Pods get secrets through the Key Vault CSI driver and
workload identity. A CoreDNS custom config forwards corporate DNS zones to internal resolvers, so pods
can reach on-premises SQL Servers and file servers by name. Production adds a container runtime defender
to the namespace.

Why AKS: it's the platform standard, Argo CD already runs there, and the portal needs long-running
processes (catalog schedulers) that suit containers. Why Functions for timers: the middleware's
scheduled jobs are bursty and isolated, so a Function App gives timers without running a scheduler.

The gap I'd fix: the portal manifests set no CPU or memory requests or limits (the middleware sets them
only in development). Without them, a catalog ingestion spike can starve neighbours on a shared node or
be evicted first.

Deeper: [Production environment](/posts/projects/oneplatform/11-infrastructure-and-environments/#production-environment).

</div>

<div class="iq-role" data-role="devops" markdown="1">

What's deployed:

| Object | Detail |
|---|---|
| Portal Deployment | 2 replicas, image `__akimage__` substituted at deploy, no probes, no resources |
| Key Vault CSI | `SecretProviderClass` per environment |
| Ingress | Internal nginx, TLS from Key Vault |
| CoreDNS custom | Forwards corporate zones to internal resolvers |
| Runtime defender | Production namespace |
| Middleware | Helm chart, 1 replica, resources only in development values |
| Functions | Function App per environment |

```bash
kubectl get deploy <portal> -n <ns> -o jsonpath='{.spec.template.spec.containers[0].resources}'
helm get values <middleware> -n <ns> | yq '.resources'
```

The manifest placeholders (`__akimage__`, `__akspcpfone__`) are substituted by the older direct deploy
workflow; the GitOps path uses Helm values in the charts repo. Two templating systems for one app is
part of why I'd retire the direct path.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Hosting through an SRE lens:

- **No probes on either workload**: Kubernetes can't take an unhealthy portal or middleware pod out of
  rotation, and rolling updates proceed without checking the new pods.
- **No resource requests on the portal**: the scheduler treats it as best-effort, so it's evicted first
  under node pressure, and ingestion CPU spikes can starve it.
- **Middleware single replica**: a node drain is an outage for every middleware-backed page.
- **Two portal replicas, no PDB**: a drain can take both down together.

```yaml
resources:
  requests: { cpu: "500m", memory: "1Gi" }
  limits:   { memory: "2Gi" }
```

(Starting values to tune from `kubectl top` during ingestion.) These four gaps are each a few lines of
YAML, and together they're the difference between "runs on AKS" and "operated on AKS".

</div>

</details>

<details class="project-iq" markdown="1" id="infrastructure-and-environments-q2">
<summary>Which environments exist, and how close is local development to production?</summary>

<div class="iq-role" data-role="architect" markdown="1">

There are **two kinds of environment**, and keeping them apart is the interesting part:

- **The portal's own:** development, staging, production. Each has its own namespace, Key Vault, App
  Configuration store, identities, middleware deployment and Function App.
- **The targets templates act on:** Azure subscriptions such as dev, QA and performance test. A
  template in the portal's *development* environment can start a VM in a QA subscription. Which targets
  are allowed is decided by the **permission policy's environment scoping**, not by which portal you use.

Development receives every release automatically and doubles as QA, where requesters try their
feature. Staging runs the **exact image** development ran, since promotion copies the tag.

**Local** has two supported setups (WSL-native or Dev Container), secrets pulled from the dev vault with
your own login, and deliberate differences: Graph ingestion narrowed to one group so startup is fast,
reminders and notifications off.

**Parity:** same image, chart, config shape and identity model everywhere. Accidental differences I'd
fix: resource limits, and a deployment path that's GitOps for development but still has a direct
workflow path for staging and production.

> **TODO:** Does staging connect to production Entra groups and real GitHub orgs, or to test copies?
{: .prompt-warning }

Deeper: [Environment parity](/posts/projects/oneplatform/11-infrastructure-and-environments/#environment-parity).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Local development, concretely:

```bash
az login
yarn install
yarn generate-local-secrets      # writes local.keyvault.env from the dev Key Vault with your identity
yarn dev                         # or yarn dev:local; frontend :3000, backend :7007
```

Only a handful of local-only values (ports, your local PostgreSQL credentials) go in `local.env` by
hand; integration credentials come from the vault.

- `index.local.ts` composes the backend for local use, next to `index.ts` (production) and
  `index.e2e.ts` (guest auth).
- Two supported setups: WSL-native or a Dev Container.
- The middleware runs with `dotnet run --project src/Middleware.Api`, reading App Configuration with your
  own Azure identity.

Parity gotcha: the local backend entry point is a different composition from production. A plugin that's
registered in `features.ts` but behaves differently under `index.local.ts` can pass locally and fail in
development; the composition test against the production feature list is the guard.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Environments as deployed:

| Env | Portal | Middleware | Deployed by |
|---|---|---|---|
| Development | Auto on each release (values-dev bump) | Manual dispatch | Argo CD / Helm |
| Staging | `promote-staging.yml` copies dev's tag | Manual dispatch with staging values | Argo CD / Helm |
| Production | `promote-prod.yml` copies staging's tag | Manual dispatch with prod values | Argo CD / Helm |

```bash
yq '.image.tag' helm-charts/platformone/values-{dev,staging,prod}.yaml
helm history <middleware> -n <ns>
```

Separate from these, templates act on target subscriptions (dev, QA, performance test), controlled by the
validation actions' environment rules. Keeping "which portal" and "which target" separate is the design
point; the operational risk is a template in the portal's development environment acting on a shared QA
subscription, so development's identities need the same scoping as production's.

</div>

</details>

<details class="project-iq" markdown="1" id="infrastructure-and-environments-q3">
<summary>How is the infrastructure provisioned and configured?</summary>

<div class="iq-role" data-role="architect" markdown="1">

In layers, each in its own repository:

| Layer | Repo | Tool |
|---|---|---|
| Portal's own infra: PostgreSQL 16, vaults, App Configuration, identities | Portal infrastructure repo | Terraform |
| Portal workloads per environment | Charts repo watched by Argo CD (and `manifests/`) | Helm values, Kubernetes YAML |
| Middleware workloads | `HelmCharts/` in the middleware repo | Helm |
| Things templates create for users | Infrastructure repos per resource type | Terraform via GitHub Actions |

The last row is the architectural point: **the portal never holds Terraform state.** It dispatches a
`workflow_dispatch` in the repo that owns the module and state, waits for the run, and reports the
result. Terraform modules and guardrails stay with the cloud team, and the portal is just a safe front
door to them.

**Configuration** is per environment: one Key Vault, one App Configuration store (labels select the
middleware's keys), one set of identities. The portal reads secrets as environment variables from the
CSI driver; the middleware reads App Configuration with Key Vault references via workload identity, with
only two variables in Helm values. Local development reads the dev vault.

Deeper: [Infrastructure as code](/posts/projects/oneplatform/11-infrastructure-and-environments/#infrastructure-as-code).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Provisioning layers:

- **Terraform** (portal infrastructure repo): PostgreSQL server, Key Vaults, App Configuration,
  identities.
- **Kubernetes YAML** in `manifests/` (portal, CoreDNS custom, runtime defender, infrastructure) and Helm
  values in the charts repo for GitOps.
- **Helm** for the middleware (`HelmCharts/` with `values.yaml`, `values-staging.yaml`, `values-prod.yaml`).
- **Terraform via GitHub Actions** in the infrastructure repos that templates dispatch to.

```bash
terraform -chdir=<portal-infra> plan -var-file=env/prod.tfvars
helm template <middleware> HelmCharts -f HelmCharts/values-prod.yaml | kubeconform -strict -summary
```

Gotcha: `manifests/platformone.yaml` and the charts repo's values describe the same Deployment in two
places. When someone adds probes or resources, they have to add them in both, or the GitOps path and the
direct path disagree. One source (the chart) is the fix.

</div>

</details>

## CI/CD and Deployment
{: #ci-cd-and-deployment }

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q1">
<summary>Walk me through the pipeline from commit to production.</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Portal: a release is a tag, not a branch.**

```text
PR      ─▶ build + type-check, unit, integration, coverage ─▶ SonarQube gate ─▶ CODEOWNERS review
release ─▶ build image once (multi-stage, BuildKit secrets) ─▶ tag YYYY.MM.DD.<run> ─▶ registry
           ─▶ Git tag + prerelease ─▶ bump values-dev.yaml in charts repo ─▶ Argo CD syncs dev
staging ─▶ "Promote to Staging": copy dev's tag into staging values ─▶ Argo CD syncs
prod    ─▶ "Promote to Production": copy staging's tag ─▶ approver ─▶ Argo CD syncs ─▶ release notes
```

Nothing is rebuilt after the release step, so production runs byte-for-byte what development ran.

**Middleware** uses separate workflows with path filters: solution build, unit tests with coverage,
integration tests, SonarQube, the API image per environment, the Functions package, the EF migration
bundle and TechDocs. Deploys are **manually dispatched** per environment: apply migrations, deploy the API
with Helm, deploy Functions if changed, check `/healthz`.

What I'd change: the portal still maintains an older direct AKS deploy workflow beside the GitOps
promotions. Two paths means two ways for production to drift from Git, so I'd retire the direct one.

Deeper: [Deployment automation](/posts/projects/oneplatform/12-cicd-and-release-management/#deployment-automation).

</div>

<div class="iq-role" data-role="devops" markdown="1">

The workflows, end to end:

**Portal**
1. `Platformone-Build-.yml` on PRs: install, type-check, tests; `sonarqube-scan.yml` for coverage and the
   quality gate.
2. `platformone-release.yml` (manual dispatch, optional commit SHA): generates the `YYYY.MM.DD.<run>` tag,
   builds the image once with BuildKit secrets, pushes it, creates a Git tag and prerelease, and bumps
   `values-dev.yaml` in the charts repo; Argo CD syncs development.
3. `promote-staging.yml` and `promote-prod.yml`: read the source environment's tag (or take one as input),
   validate the format, skip if already deployed, `yq -i` the target values file, push; production runs
   in the `production` environment.
4. `Release-Notes.yml` for notes; `AKS-Platformone-Deploy.yml` is the older direct path.

**Middleware**: build, unit, integration, SonarQube and TechDocs workflows on PRs; manual dispatch for
image build, EF bundle build and deploy, API deploy, Functions deploy, and a restart workflow.

```bash
gh workflow run "Platformone Release" -f repo_commit_id=<commit>
gh workflow run "Promote to Staging"
gh workflow run "Promote to Production"
```

The design property: nothing is rebuilt after the release step, so the bytes that ran in development are
the bytes in production.

</div>

</details>

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q2">
<summary>Which deployment strategy do you use, and how do you roll back?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**GitOps with immutable images** for the portal: Argo CD syncs whatever tag the environment's values file
names, as a Kubernetes rolling update across two replicas. For the middleware, Helm upgrades through
manual dispatch.

But the deployment strategy that matters most here is **dark launch through permissions**. A feature's
code can sit in production, invisible, until its permission and navigation say otherwise. The per-feature
go-live is:

1. Released to dev, tried by the requester; promoted to staging, journey repeated.
2. Promoted to production.
3. Role navigation set, starting with Admin only if the rollout is cautious.
4. Permission granted to the target roles.
5. A broadcast notification to the target group.
6. Adoption checked after a week.

Steps 3 and 4 are the real go-live, and they're reversible without a deploy.

**Rollback:** revert the values change, or run a promotion with an older tag (both promote workflows
accept an explicit tag); Argo CD syncs the old image. The middleware rolls back with Helm to the previous
tag. Database changes **roll forward**, so migrations stay backward compatible for one release.

Deeper: [Go-live checklist](/posts/projects/oneplatform/13-deployment-and-go-live/#go-live-checklist).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Strategy and rollback, as operations:

- **Portal**: Argo CD rolling update across 2 replicas. Without readiness probes, Kubernetes considers a
  new pod ready as soon as the container starts, so a broken image can take traffic before the backend has
  initialized. Probes are what make the rolling update safe.
- **Feature go-live**: permission mapping and role navigation, which can be reverted without a deploy.
- **Rollback**: promotion with an older tag, or a revert of the values commit.
- **Middleware**: `helm upgrade` with the previous tag; migrations roll forward.

```bash
gh workflow run "Promote to Production" -f IMAGE_TAG=<previous-tag>
argocd app history <portal-app> && argocd app rollback <portal-app> <id>   # emergency only; Git still says otherwise
helm rollback <middleware> <revision> -n <ns>
```

Gotcha: `argocd app rollback` with auto-sync on is undone at the next sync, because Git still names the
new tag. The rollback that sticks is the promotion with the old tag.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Release safety signals:

| When | Check |
|---|---|
| Before promoting | Development and staging error rates normal for the candidate tag |
| During rollout | Ready pods (needs probes), 5xx rate, sign-in synthetic |
| After | Template failure rate and middleware 401/5xx rate compared with the previous day |
| Backstage upgrade | Compatibility workflow green; one minor version at a time |

```kusto
requests
| where cloud_RoleName has "[Production]" and timestamp > ago(30m)
| summarize failures=countif(success == false), total=count() by bin(timestamp, 5m)
```

Rollback criteria I'd agree in advance: sign-in failing, any 5xx rate above 2% for 10 minutes, or a
gated route returning 200 to a role that should get 403. That last one is a security rollback, not a
quality one.

</div>

</details>

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q3">
<summary>How do data and schema changes ship alongside application changes?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Two rules, one per stack.

**Portal plugins:** Knex migrations run at plugin startup (Backstage's design), so a migration ships
inside the image. To keep that safe, every owned migration runs against PostgreSQL 16 in the
integration lane first. With two replicas starting during a rolling update, migrations must be
backward compatible with the old pods still running.

**Middleware:** migrations are a **separate, explicit deploy step**, never applied at startup:

```text
1. Build the EF Core migration bundle for the environment; apply it
   (backward compatible with the running API)
2. Deploy the new API image with Helm
3. Deploy Functions if they changed
4. Later release: remove columns or views the old code needed
```

That ordering is expand-and-contract, and it's why "database changes roll forward" is safe. For
destructive changes, the FinOps reconciliation migrations use a **swap**: build replacement views, then
rename in one transaction, so rollback restores the previous views.

Data migrations between stores (Storage Tables → PostgreSQL, Copilot requests v1 → v2) used adapters and
kept the old path until nothing depended on it, so the UI never noticed.

Deeper: [Database deployment strategy](/posts/projects/oneplatform/12-cicd-and-release-management/#database-deployment-strategy).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Shipping schema changes from the code side:

- **Knex (portal)**: add a migration file to the plugin's `migrations/` folder with `up` and `down`; it
  runs at plugin start in every environment. Make it additive, because two pods run during a rollout.
- **EF Core (middleware)**: `dotnet ef migrations add` per context; additive first; the code that needs
  the new column ships after the migration is applied.
- **Tests**: `migrations.integration.test.ts` runs every owned Knex migration against PostgreSQL 16.

```js
// plugins/<plugin>-backend/migrations/20261006000001_add_comment.js
exports.up = knex => knex.schema.alterTable('hitl_approval_requests', t => t.text('comment').nullable());
exports.down = knex => knex.schema.alterTable('hitl_approval_requests', t => t.dropColumn('comment'));
```

(A sketch of the pattern; the table name is from the HITL plugin's first migration.) Gotcha: `down`
functions are rarely exercised, because rollback means rolling forward. I'd still write them, but I
wouldn't rely on them in an incident.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Ordering schema and code, as pipeline steps:

**Middleware**
1. `middleware-ef-migrations-build.yml` → bundles.
2. `middleware-ef-migrations-deploy.yml` → applies them to the environment.
3. `middleware-api-aks-deploy.yml` → new API image.
4. `middleware-functions-deploy.yml` if Functions changed.

**Portal**: migrations ride in the image; the order is guaranteed by plugin startup.

```bash
gh workflow run middleware-ef-migrations-deploy.yml -f environment=prod
gh workflow run middleware-api-aks-deploy.yml -f environment=prod -f image_tag=<tag>
```

The gap I'd close: nothing stops someone from running step 3 before step 2. A check in the API deploy
workflow that compares the bundle's latest migration with `__EFMigrationsHistory` in each schema would
fail fast instead of letting the API hit a missing column.

</div>

</details>

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q4">
<summary>How do you manage configuration and versions across environments?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Versions:**

- The portal is versioned by **date tag** (`YYYY.MM.DD.<run>`), one per release run, immutable in
  practice; each run creates a Git tag and a GitHub prerelease. Branch names and SHAs are never used as
  deploy tags.
- The **charts repo** records which tag runs in each environment, so "what's deployed?" is a Git
  question.
- **Private plugins** (like the routing sheet frontend and backend) use semantic versions, are published
  to a plugin registry, and are pinned to exact versions in the host app, bumped in their own PR.
- **Backstage** moves as a planned upgrade; its packages are excluded from Dependabot.

**Configuration:**

| What | Where |
|---|---|
| Secrets | Key Vault per environment (CSI driver or App Configuration references) |
| Middleware settings | App Configuration, selected by labels |
| Portal runtime config | Backstage app config per environment |
| Who sees what | Permission policy (code) and role navigation (admin UI, database) |
| Cross-environment differences | Catalog filters, notification flags, replicas, runtime defender |

The principle: one image for every environment, and every difference either in Git or in a store with an
audit trail.

Deeper: [Versioning](/posts/projects/oneplatform/12-cicd-and-release-management/#versioning-and-release-notes).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Configuration in code:

- **Backstage config**: `app-config.yaml` with `${ENV_VAR}` substitution; typed reads
  (`config.getNumber('azure.scheduleFrequencyMinutes')`, `config.getOptionalNumber(...)`); schemas in
  `config.d.ts` with `@visibility` for anything the frontend may read.
- **Middleware**: one `AppConfig` class bound from App Configuration; options validated at startup for
  newer features:

```csharp
builder.Services.AddOptions<RelatedResourceCostOptions>()
  .Bind(builder.Configuration.GetSection(RelatedResourceCostOptions.SectionName))
  .ValidateDataAnnotations()
  .Validate(o => o.MaxRawResourceCount >= o.MaxResourceCount, "The raw resource limit must be at least the unique resource limit.")
  .ValidateOnStart();
```

- **Versions**: the image tag is the version; private plugins have semver and are pinned exactly.

That `ValidateOnStart` pattern is the one I'd spread to every options class. Today most settings are bound
to a big `AppConfig` without validation, so a missing key surfaces as a null at the first request.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Versions and config across environments:

- **Image tags** `YYYY.MM.DD.<run>`; the charts repo's `values-dev.yaml`, `values-staging.yaml` and
  `values-prod.yaml` say what runs where.
- **Middleware values** per environment in `HelmCharts/values*.yaml`; only `APPCONFIG_ENDPOINT` and
  `APPCONFIG_LABELS` carry configuration, everything else comes from App Configuration by label.
- **Key Vault** per environment.

```bash
for e in dev staging prod; do printf "%s " $e; yq '.image.tag' platformone/values-$e.yaml; done
az appconfig kv list -n <appconfig> --label <env> --query "[].key" -o tsv | head
```

Gotcha: App Configuration changes take effect without a deployment, which is the point, but they also
bypass Git review. Locking production labels so only a pipeline identity can write them keeps "every
difference is in Git or an audited store" true.

</div>

</details>

## Monitoring and Observability
{: #monitoring-and-observability }

<details class="project-iq" markdown="1" id="monitoring-and-observability-q1">
<summary>How do you know the system is healthy in production?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Today, through these signals:

| Layer | Signal |
|---|---|
| Portal backend | OpenTelemetry Node SDK → Application Insights; `/healthcheck` |
| Middleware API and Functions | OpenTelemetry with the Azure Monitor exporter; `/healthz` checks App Configuration and seven EF Core contexts, returning 503 with metadata if one fails |
| Template runs | Scaffolder task history; a poller turns failures into notifications every 30 seconds |
| Scheduled imports | Run-scoped logs (every FinOps line carries a `FinOpsRunId`) |
| Usage | Adoption Insights, Kusto over the portal's own telemetry |

Each environment sets its own cloud role name (`[Production]/<portal>`), so one Application Insights
resource can hold all three and still filter cleanly.

The honest answer is that today's monitoring is **user-facing more than operator-facing**: failures
notify the requester, and late files raise Jira tickets for operations. What I'd add first: an
availability test on sign-in, an ingestion-failure alert per provider, a FOCUS integrity failure alert,
and the portal's health check extended to test the database and wired to readiness probes.

The irony I'd mention: the portal's service map, built to visualize other teams' traces, can visualize
the portal's own.

Deeper: [Monitoring](/posts/projects/oneplatform/14-operations-and-observability/#application-and-infrastructure-monitoring).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Observability wiring:

- **Portal**: `instrumentation.js` preloaded with `node --require`, starting the OpenTelemetry Node SDK
  with an Azure Monitor exporter; each environment sets its cloud role name.
- **Middleware**: `AddTelemetry(...)` with the Azure Monitor exporter; `/healthz` with JSON details.
- **Backstage metrics**: `noopMetricsServiceFactory` is registered, so plugin metrics go nowhere today.
- **Health endpoints**: portal `/healthcheck` and `/healthcheck/ready`, middleware `/healthz`; none are
  probes yet.

```bash
kubectl exec deploy/<portal> -n <ns> -- printenv | grep -i -E "APPLICATIONINSIGHTS|OTEL_"
curl -s https://<portal>/healthcheck/ready
```

What I'd wire next, in order: readiness probes, an availability test on sign-in, alerts on middleware
401/5xx, and an OpenTelemetry-backed metrics service so ingestion and template metrics exist.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Health as SLIs:

| SLI | Source | Today |
|---|---|---|
| Sign-in success | Synthetic test | Missing |
| API availability per plugin | `requests` by route | Data exists, no SLO |
| Template success per template | Scaffolder tasks | Data exists, no alert |
| Catalog freshness per provider | Provider run logs | No metric |
| Middleware health | `/healthz` | Not probed or alerted |
| FinOps freshness | Run summary `Integrity=` | Not alerted |

The honest summary: the data to know the portal is healthy mostly exists in App Insights and the
database, but there are no SLOs or alerts built on it. The fastest win is four Kusto-based alerts, each
tested by causing the failure once in development.

```kusto
requests
| where cloud_RoleName has "[Production]"
| summarize availability = 100.0 * countif(success) / count() by bin(timestamp, 1h)
```

</div>

</details>

<details class="project-iq" markdown="1" id="monitoring-and-observability-q2">
<summary>What do you log, measure and alert on?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Logs:** the portal logs through Winston wired into Backstage's logging service; the middleware uses
structured `ILogger` with named parameters, and a **sanitizing wrapper on every provider** so user input
can't forge log lines. Console logging in Azure is banned in the middleware rules. Audit-relevant events
are in database tables, not only logs (task history, Jira audit, user audit, termination logs).

**Measure:** request and dependency metrics from OpenTelemetry auto-instrumentation, plus Adoption
Insights. Backstage's own metrics service is a no-op today, so plugin-level metrics aren't emitted. The
three I'd add, because they'd have shown the catalog lock before users did:

1. Template runs per hour and failure rate, per template.
2. Catalog ingestion duration per provider.
3. Middleware import duration per run.

**Alert:**

| Alert | Why |
|---|---|
| Sign-in availability test failing | Users locked out (often an expired app secret) |
| Provider ingestion failing | Catalog going stale for a subscription |
| FOCUS integrity failure | Reports frozen on yesterday |
| Middleware 5xx rate | Dashboards failing |
| Credential expiring within 60 days | The most likely outage cause |

> **TODO:** Which alerts exist for the portal itself today, who is paged, and in which hours?
{: .prompt-warning }

Deeper: [Alerting](/posts/projects/oneplatform/14-operations-and-observability/#alerting-and-escalation).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Logging and telemetry in code:

- **Portal**: Backstage's `LoggerService` (Winston underneath), passed to every plugin; `logger.info` with
  structured fields. Some older code still uses `console.log` (the Azure provider does), which bypasses
  levels and fields.
- **Middleware**: `ILogger<T>` with message templates (`"FinOps run {FinOpsRunId} completed. Outcome={Outcome}"`),
  scopes for run IDs, and `SanitizingLogger` around every provider, replacing `\r` and `\n` with `[CR]`
  and `[LF]`.

```csharp
_logger.LogInformation(
  "FinOps run {FinOpsRunId} completed. Outcome={Outcome}; SkipReason={SkipReason}; ImportSucceeded={ImportSucceeded}; Integrity={Integrity}; DurationMs={DurationMs}",
  finOpsRunId, outcome, skipReason, importSucceeded, integrity, ElapsedMilliseconds(runStartTimestamp));
```

That one line is a model for job logging: run ID, outcome, why it skipped, integrity and duration, all as
fields you can query. I'd bring the same shape to the portal's providers and replace their `console.log`
calls with the injected logger.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Alerts I'd configure, with thresholds:

| Alert | Condition | Severity |
|---|---|---|
| Sign-in synthetic failing | 2 consecutive failures | Page (business hours) |
| Middleware 401s | > 20 in 5 minutes | Page (business hours) |
| Middleware `/healthz` not 200 | 5 minutes | Ticket |
| Template failure rate | > 20% for a template over 1 hour | Ticket to the template owner |
| FinOps integrity failed | Any run | Ticket |
| Credential expiring | < 60 days | Ticket |
| App Insights ingestion | Daily cap reached | Ticket |

```kusto
traces
| where message has "FinOps run" and message has "Integrity=False"
```

Routing: platform team channel in business hours; nothing pages out of hours, since the portal is an
internal tool with workarounds, except sign-in during a business-critical window if operations agree.

</div>

</details>

<details class="project-iq" markdown="1" id="monitoring-and-observability-q3">
<summary>Walk me through how you would troubleshoot a production issue in this system.</summary>

<div class="iq-role" data-role="architect" markdown="1">

Say "the Create Function App template fails for everyone since this morning":

1. **Contain:** post a **system alert** so users stop retrying and filing duplicates.
2. **Read the task log.** Scaffolder history shows which action failed and the error. Here it's
   probably the Terraform dispatch step or a validation action.
3. **Check the identity first.** Most "fails for everyone" incidents are the action's identity: an
   expired GitHub App key or service principal secret, or lost Azure rights.
4. **Check the target.** Did the infrastructure repo's workflow change or fail? The portal only
   dispatches and waits, so the real error may be in that run.
5. **Check recent releases.** If a portal release went out this morning, compare tags in the charts
   repo; roll back by promoting the previous tag.
6. **Trace it.** If it's slow rather than failing, the OpenTelemetry trace across portal and middleware
   shows which hop.
7. **Fix, verify, close:** rerun one template as a test, remove the alert, and add the credential to the
   expiry register if that was the cause.

Other runbooks follow the same shape: sign-in failures → Entra app secret and the standard-user group;
missing catalog resources → Azure provider logs for that subscription; stale FinOps → logs by `FinOpsRunId`;
middleware 503 → `/healthz` names the failing context.

Deeper: [Runbooks](/posts/projects/oneplatform/14-operations-and-observability/#operational-runbooks).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Commands for "the Create Function App template fails for everyone":

```bash
# 1. What failed?
curl -s -H "Authorization: Bearer $TOKEN" "https://<portal>/api/scaffolder/v2/tasks?limit=20" | jq '.tasks[] | {id,status,created_at}'
# 2. Is it the identity?
az ad sp credential list --id <actions-sp-id> --query "[].endDateTime" -o tsv
# 3. Did the infrastructure workflow run and fail?
gh run list --repo <owner>/<infra-repo> --workflow <create-function-app>.yml --limit 5
# 4. Was there a portal release?
yq '.image.tag' platformone/values-prod.yaml && git -C <charts-repo> log -3 --oneline
# 5. Roll back if it's the release
gh workflow run "Promote to Production" -f IMAGE_TAG=<previous>
```

Then post a system alert in the portal so users stop retrying. The order matters: identity and upstream
first, because most "fails for everyone" incidents are an expired credential or a changed workflow in the
infrastructure repo, not portal code.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Running the incident:

1. **Declare and communicate**: system alert banner; one channel for updates.
2. **Scope**: one template or all; one role or all; since when (correlate with releases and credential
   expiry dates).
3. **Mitigate**: roll back by tag, rotate the credential, or remove the template's permission temporarily
   (a reversible "dark" switch).
4. **Verify**: run the template once as a test user.
5. **Review**: blameless; add a monitor that would have caught it (almost always an expiry or upstream
   check).

```kusto
exceptions
| where cloud_RoleName has "[Production]" and timestamp > ago(6h)
| summarize count() by outerMessage
| top 10 by count_
```

The SRE habit I'd bring: every incident review ends with "which alert would have told us first?", and the
answer gets built that week. For this portal, most answers will be "credential expiry" or "upstream
workflow failure rate".

</div>

</details>

## Cost, Maintenance and Support
{: #cost-maintenance-and-support }

<details class="project-iq" markdown="1" id="cost-maintenance-and-support-q1">
<summary>What drives the cost of running the system, and how do you keep it under control?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Running cost** is a share of AKS, the PostgreSQL server, Function Apps and Application Insights. The
one that grows quietly is **Application Insights ingestion** with auto-instrumentation, so that's the
first I'd watch.

**People cost** is bigger: staying current with Backstage (monthly releases touching 45 custom plugins)
and Dependabot (about 60 PRs in the portal since October 2025). We control it by grouping minor updates,
excluding Backstage packages from Dependabot so they move together, and running the compatibility
workflow before each upgrade.

**Seat cost** is an underrated lever: operations staff run smoke tests through the portal's GitHub App
instead of each holding a GitHub seat.

How we keep it visible: the portal can show the cost of any Azure resource on its entity page,
including its own. I'd make OnePlatform's resources catalog entities with the cost trend card and
review them monthly, using the related-infrastructure cost view to see the total footprint.

And the portal **saves** cost elsewhere, which is part of the business case: FinOps reports,
short-lived server reports, and Copilot budgets that managers can reallocate.

Deeper: [Cost optimization](/posts/projects/oneplatform/18-continuous-improvement/#cost-optimization).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Cost levers in the platform:

| Cost | Lever |
|---|---|
| App Insights ingestion | Sampling in the OpenTelemetry exporter; daily cap; table retention |
| AKS | Resource requests sized from real use (none set today, so capacity is guessed) |
| PostgreSQL | Tier sized to ingestion peaks; storage autogrow |
| Function App | Consumption or Flex plan for bursty timers |
| CI | Path filters; Docker layer and Yarn caches; one image per release |
| GitHub seats | Operations run smoke tests through the portal's App identity |

```bash
az monitor log-analytics workspace table list -g <rg> --workspace-name <ws> --query "[].{t:name,r:retentionInDays}" -o table
az monitor app-insights component billing show --app <appi> -g <rg>
```

The quickest saving is usually App Insights: auto-instrumentation records every dependency call,
including catalog provider loops, and that volume grows quietly. Sampling ingestion traffic at a lower
rate than user traffic is a config change.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Cost as something to monitor:

- **Telemetry volume per cloud role per day**, alerting on a jump after a release (a chatty new plugin).
- **Database CPU and storage** trend, since ingestion drives both.
- **Engineering time on upgrades** as a cost: track Backstage versions behind the latest; each gap month
  makes the next upgrade more expensive.

```kusto
union requests, dependencies, traces
| where timestamp > ago(1d)
| summarize GB = sum(estimate_data_size(*)) / 1e9 by cloud_RoleName, itemType
```

The SRE point for cost: reliability work (probes, resource requests) is also cost work, because without
requests the cluster can't bin-pack and you pay for headroom you don't know you need.

</div>

</details>

<details class="project-iq" markdown="1" id="cost-maintenance-and-support-q2">
<summary>How is the system maintained and supported after go-live?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Upgrades are the core of maintenance.** OnePlatform went from Backstage 1.21 in January 2024 to 1.53
in September 2026, in roughly twenty upgrade PRs, including the move to the new frontend system. The
lesson: **gaps matter more than counts**. Jumping from 1.44 to 1.46 skipped four months and was where
breakage hid. My rule: upgrade within a month of each release, one minor at a time, never more than two
minors behind, with the compatibility workflow green first.

**Dependencies:** Dependabot weekly for npm, NuGet and Actions, grouped minors; majors get a human read
of the changelog; vulnerable transitive packages are pinned with the reason recorded.

**Support** should be tiered: self-service (template instructions, failure notifications with error and
link), the platform team channel, the feature owner, and upstream owners (Azure, GitHub, Jira,
infrastructure repos). Ownership is recorded where Backstage expects it: the portal and middleware are
catalog components owned by the team's group, and every template has a `spec.owner`.

**Bugs** are triaged by: does it block a compliance workflow, is there a workaround, how many roles are
affected. Fixes go through `/change-request`, which records plan and validation beside the feature's
design.

> **TODO:** What's the actual support entry point and on-call arrangement, and are response targets set?
{: .prompt-warning }

Deeper: [Patch and upgrade management](/posts/projects/oneplatform/16-support-and-maintenance/#patch-and-upgrade-management).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Maintenance routines:

- **Backstage upgrades** monthly with `backstage-cli versions:bump`, one minor at a time, with the
  compatibility workflow green before merge; `patch-package` patches re-checked each time.
- **Dependabot** weekly for npm, NuGet and Actions, minors grouped; Backstage packages excluded so they
  move together.
- **Base images**: `node:24-trixie-slim` and the .NET runtime image rebuilt with each release.
- **Credentials**: an expiry register for app registrations, service principals, GitHub App keys and the
  middleware signing key.
- **Certificates**: the corporate CA files in `certs/` refreshed before expiry.

```bash
yarn backstage-cli versions:bump --release 1.54.0
yarn dedupe && yarn tsc && yarn test
gh workflow run platformone-pre-upgrade-compatibility.yml -f ref=<upgrade-branch>
```

Gotcha: `versions:bump` changes many packages at once, including transitive ones the `resolutions` pins
were holding back. Re-checking each pin after a bump is part of the upgrade, not a follow-up.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Support from the reliability side:

| Tier | Who | Tools |
|---|---|---|
| Self-service | Requesters | Failure notifications with error and link; template instructions |
| Platform team | On the team channel | Task logs, App Insights, `/healthz`, runbooks |
| Feature owner | Per plugin | Per-feature docs |
| Upstream | Cloud team, GitHub admins, Jira admins | Their runbooks |

Toil to remove: manual credential rotation (automate the expiry register), restarting pods after secret
rotation (CSI rotation with a reloader), and the middleware token expiry (fix the cache).

```bash
kubectl rollout restart deploy/<portal> -n <ns>     # today's fix for rotated secrets and the token cache
```

> **TODO:** What's the support entry point and on-call arrangement, and are response targets set?
{: .prompt-warning }

</div>

</details>

## Leadership, Stakeholders and Governance
{: #leadership-stakeholders-and-governance }

<details class="project-iq" markdown="1" id="leadership-stakeholders-and-governance-q1">
<summary>How did you communicate the architecture and progress to stakeholders and executives?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Three channels, each matched to an audience:

- **For stakeholders who asked for a feature:** the PLAN document. It records the problem, users,
  rules and acceptance criteria before build, so a DBA, an auditor or finance can review what they'll
  get in plain language, including what's out of scope.
- **For leadership:** the portal itself reports. Adoption Insights shows which roles use what, and
  leadership already uses OnePlatform for DORA, scorecards, Copilot and FinOps reports, so progress is
  visible where they already look.
- **For engineers and reviewers:** layered architecture docs (C4 levels 1 to 3, a plugin dependency
  graph, RBAC diagrams) and a machine-readable model with **change-impact rules**: "modify a backend
  router → affects every frontend plugin consuming it, permission checks and the contract → run those
  tests."

The roadmap told its own story: each phase answered the loudest complaint of the time, from catalog in
2024, to self-service, to compliance workflows, to insights and admin in 2026.

> **TODO:** Who is the executive sponsor, and is there a steering group where security, finance,
> operations and engineering leadership review the roadmap?
{: .prompt-warning }

Deeper: [Product roadmap](/posts/projects/oneplatform/03-product-planning/#product-roadmap).

</div>

</details>

<details class="project-iq" markdown="1" id="leadership-stakeholders-and-governance-q2">
<summary>How do you document and govern architectural decisions?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Decisions:** eight are worth ADRs, in a short form (decision, why, consequence): Backstage as the
framework; a separate .NET middleware; Entra groups as roles; deny catalog mutation in the UI; overlay
fragments for fields we don't own; PHI filtered in the backend; one provider per Azure subscription (pending merge);
GitOps for portal deploys. Each consequence is written down, for example "monthly upgrade cost".

**Per-feature docs** are the bigger governance mechanism. Every non-trivial feature has PLAN, DESIGN,
IMPLEMENTATION and ARCHITECTURE documents in `docs/features/<ticket>_<name>/`, produced through
repository prompts (feature-planner, feature-implement, change-request). There's a **divergence
protocol**: if the code departs from the design, update the doc in the same PR rather than drift.

**Decision rights** are explicit:

| Decision | Who |
|---|---|
| Who may use a template | Role-to-permission mapping in code, reviewed by the platform team |
| Who holds a role | Entra group membership |
| What each role sees in navigation | Admins, in the admin page |
| Production release | Approver on the `production` environment |

The model I'd defend: role membership in Entra, where access reviews look; role meaning in code, where
changes are reviewed and versioned.

Deeper: [Architecture documentation](/posts/projects/oneplatform/15-documentation-and-knowledge-transfer/#architecture-documentation).

</div>

</details>

<details class="project-iq" markdown="1" id="leadership-stakeholders-and-governance-q3">
<summary>How did you bring other engineers onto the project?</summary>

<div class="iq-role" data-role="architect" markdown="1">

A Backstage monorepo with 45 plugins and fifty secrets can eat a new engineer's first week, so we
designed onboarding like a feature:

- **Tiered onboarding path:** setup (day 1), orientation (week 1), before your first change, testing
  conventions, then deep reference only when needed. Nobody reads everything.
- **Two supported setups** (WSL-native or Dev Container), and secrets fetched from the dev vault with
  your own login, which removed the "ask someone for the env file" step.
- **Step-by-step guides** for a new backend plugin, a new frontend plugin and a new permission, plus the
  **build-decision guide** ("where does this go?") which most reduces duplicate work.
- **Per-feature docs** as the historical record of why things look the way they do.
- **Docs written for AI assistants too:** routing tables and change-impact rules. Writing for an
  assistant forced a precision that helps people; an assistant following stale instructions fails
  loudly.
- **CODEOWNERS** spreads review, with a narrower set for `.github/`.

> **TODO:** How long does a new engineer take to their first merged change? That's the metric I'd quote
> for onboarding.
{: .prompt-warning }

Deeper: [Onboarding documentation](/posts/projects/oneplatform/15-documentation-and-knowledge-transfer/#onboarding-documentation).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The developer onboarding path:

1. **Day 1**: `az login`, `yarn install`, `yarn dev`; open the portal locally with real-shaped data.
2. **Week 1**: read `features.ts` (what's registered), `permissions/` (how access works), one plugin pair
   end to end (router, client, page), and one scaffolder action.
3. **First change**: a small field on an existing plugin with a router test, a client test and a 403 test.
4. **Rules**: `common-ui` first; every route checks a permission; tests in the same phase; the
   build-decision guide before adding a plugin.

```bash
yarn new                 # Backstage CLI scaffolding for a new plugin
yarn test plugins/<plugin>-backend
yarn test:integration plugins/<plugin>-backend
```

What I'd add for developers: the unmapped-permission test, so the most important rule (server-side
checks backed by the role map) is enforced by CI rather than by onboarding docs.

> **TODO:** How long does a new engineer take to their first merged change?
{: .prompt-warning }

</div>

</details>

## Lessons Learned and Trade-offs
{: #lessons-learned-and-trade-offs }

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q1">
<summary>What was the hardest technical problem, and how did you solve it?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Catalog ingestion at scale.** The Azure resource provider walks 22+ subscriptions in one task and
writes about 10,000 entities in **one mutation**. That locked the catalog database and degraded the
portal for everyone during ingestion, and a failure in any one subscription lost the entities for all
of them.

The fix is to stop treating ingestion as one job:

- **One entity provider per subscription**, using Backstage's `EntityProvider` API.
- **Staggered schedules**, so providers don't all write at once.
- **~500 entities per write** instead of 10,000: roughly 22 small transactions.
- **Same entity refs** as before, so the change produced no orphans and needed no data migration.

Where it stands, honestly: the redesign is implemented and documented on a feature branch (its docs say
complete), but it isn't merged into `main`, which still runs the single provider. So in an interview I'd
present it as designed and built, with the merge and a before/after measurement as the open step. I'd
also fix one detail in the current provider while there: its scheduled task calls `this.run()` without
`await`, so the scheduler's timeout and overlap protection don't see the real work.

What I'd draw from it in an interview: the bottleneck wasn't users, it was **background work sharing a
database with interactive work**, and the fix was smaller transactions and fault isolation, not more
hardware. The same lesson shows up in the FinOps materialized views and the Web Worker.

> **TODO:** What tests proved the per-subscription change, and what measured improvement did users see?
{: .prompt-warning }

Deeper: [Feature development worked example](/posts/projects/oneplatform/09-implementation/#feature-development).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The code-level story behind the ingestion problem:

- **Before (and still on `main`)**: `AzureResourceProvider` walks every subscription, builds all entities
  in memory, and writes one `applyMutation({ type: 'full', entities })`. Its scheduled task calls
  `this.run()` without `await`.
- **The redesign (on a branch)**: an `AzureSubscriptionProvider-{subscriptionId}` per subscription, shared
  processing utilities extracted first, a configurable stagger (`azure.staggerDelaySeconds`, default 30),
  optional failure notifications to admins.

```ts
fn: async () => {
  this.run();          // un-awaited: the scheduler sees an instant success
},
```

The lessons I'd draw as a developer: refactor shared processing out before splitting (that was phase 1 of
the plan), keep entity refs identical so the change needs no data migration, and don't let a well-documented
redesign sit unmerged; the docs say "complete" while production still has the old behaviour.

</div>

</details>

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q2">
<summary>What would you do differently if you started again?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Keep:** read-only first. The MVP had no self-service actions at all; the first write action (Start VM)
arrived about ten months in, together with the permission policy that gates it. A template that creates
infrastructure without a role model and environment scoping behind it is a security incident waiting to
happen.

**Change:**

| Would change | Instead |
|---|---|
| Ingestion as one big provider | Per-source, small-batch providers from day one |
| Monitoring built for users more than operators | SLOs, readiness probes, resource limits and portal alerts at go-live |
| Two deployment paths for staging and production | GitOps only, from the start |
| Upgrade gaps of months | Monthly upgrades with the compatibility run from the beginning |
| Tests written at the end of a feature | Tests in each phase (we learned this and changed the process) |
| PHI filter without dedicated tests | Table-driven rule tests from the first rule |

**The broader lesson:** a portal's risk is its own power. Every design choice that reduced what the
portal could do on someone's behalf (environment scoping, hard blocks, acting through scoped identities,
Terraform in other repos) made it safer to give it more features later.

Deeper: [MVP definition](/posts/projects/oneplatform/03-product-planning/#mvp-definition).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Code-level changes I'd make from the start:

| Instead of | I'd do |
|---|---|
| A policy that allows unmapped permissions | Deny unmapped custom permissions, with a test listing all permissions |
| A module-level middleware token with no expiry | Token with `exp` tracking and retry on 401 |
| `console.log` in providers | The injected `LoggerService` |
| A new `ClientSecretCredential` per action call | One credential per process |
| Un-awaited scheduled work | `await` in every scheduler `fn` |
| `as any` on field components | Typed field extension components |
| Per-feature `AppConfig` binding without validation | `ValidateOnStart` options everywhere |

What I'd keep: plugin pairs, `common-ui`, Zod at every edge, Testcontainers integration tests, and the
validate-then-act scaffolder pattern.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Platform things I'd do differently:

- **One deploy path** (GitOps) from the start, with one source for the Deployment spec.
- **Probes, requests, limits, PDBs** on day one for both workloads.
- **Entra tokens** for portal-to-middleware calls instead of a custom login and symmetric key.
- **Image scanning** in the promotion workflows.
- **Pod security context** and NetworkPolicies.
- **Credential expiry automation** before the first template that acts through a service principal.

```bash
kubectl get deploy -A -o json | jq -r '.items[] | select(.spec.template.spec.containers[0].readinessProbe == null) | .metadata.namespace + "/" + .metadata.name'
```

What I'd keep: build once and promote by tag, BuildKit secret mounts, Key Vault through CSI and workload
identity, the CoreDNS forwarding config, and the pre-upgrade compatibility workflow.

</div>

</details>

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q3">
<summary>What technical debt exists today, and how would you pay it down?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Known debt, and where it's tracked:

| Debt | Why it exists | Plan |
|---|---|---|
| Copilot license v1 action beside v2 | In-flight v1 requests | Remove when none remain |
| GitHub's legacy Copilot metrics API | Upstream retirement | Migration in progress |
| `patch-package` patches on upstream packages | Upstream bugs | Drop on each upgrade if fixed |
| Transitive `resolutions` pins | Vulnerable transitive packages | Remove when parents update |
| Catalog `orphanStrategy: keep` | Safety during ingestion changes | Revisit once per-subscription ingestion merges |
| Per-subscription Azure providers not merged | Built and documented on a branch; `main` still has the single provider | Rebase, merge, measure |
| Unmapped permissions allowed by the policy | Keeps built-in reads working | Deny unmapped permissions with a custom prefix |
| Older plugins on legacy patterns | Pre-date `common-ui` and the new frontend system | Migrate when touched |
| Direct AKS deploy path | Predates GitOps promotions | Retire |
| Missing probes, resource limits, SLOs | Operational maturity lagged features | Next platform sprint items |

**How we pay it down:** Sonar findings get dedicated PRs instead of piling up; upgrade work is planned
rather than squeezed in; "migrate when touched" for UI patterns; and the debt table is reviewed
quarterly.

**How I'd prioritize:** compliance and security risk first (PHI rule tests, credential expiry), then
anything that can cause an outage (probes, limits, the second deploy path), then upstream deadlines
(Copilot metrics API), then consistency (legacy plugin patterns).

Deeper: [Technical debt tracking](/posts/projects/oneplatform/09-implementation/#technical-debt-tracking).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Code debt with locations:

| Debt | Where | Fix |
|---|---|---|
| Unmapped permissions allowed | `packages/backend/permissions/permissions.ts` | Deny by prefix; permission inventory test |
| Middleware token never refreshed | `pf1-middleware-backend/src/service/authentication/api.ts` | Track `exp`, retry on 401 |
| Per-subscription ingestion unmerged | Feature branch | Rebase, merge, measure |
| Un-awaited scheduler work | `azureResourceProvider.ts` | `await this.run()` |
| Anonymous email endpoint | Middleware `AuditController` | Require the JWT |
| Middleware JWT without issuer or audience checks | `AuthenticationExtensions.cs` | Entra tokens, or validate both |
| `console.log` in providers | Azure provider | Injected logger |
| No PHI rule tests | `permissions/phi-*.ts` | Table-driven tests |

Order: security (rows 1, 5, 6), then outages waiting to happen (2, 4), then the performance fix (3), then
hygiene. Each row is small; the risk is in leaving them.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Platform debt:

| Debt | Fix | Size |
|---|---|---|
| No probes (portal, middleware) | Readiness on `/healthcheck/ready` and `/healthz` | Small |
| No resource requests (portal; middleware outside dev) | Requests and limits from observed use | Small |
| Direct AKS deploy path | Retire `AKS-Platformone-Deploy.yml` | Small |
| Two Deployment specs (manifests and charts) | Charts only | Medium |
| No image scan before promotion | Trivy or registry scan step | Small |
| No pod security context or NetworkPolicy | Add both | Small |
| Middleware single replica, no PDB | 2 replicas, PDB | Small |
| No credential expiry automation | Scheduled workflow | Medium |

I'd run these as one operational-maturity epic, because individually each looks optional and together
they decide whether the next incident is a five-minute blip or a morning.

</div>

</details>

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q4">
<summary>Where does the system go next, and how does the architecture support that?</summary>

<div class="iq-role" data-role="architect" markdown="1">

What's in progress or planned:

- **Copilot metrics** off GitHub's legacy API.
- **Material UI → Backstage UI** migration, internal source and dependency levels first.
- **A single GitOps path** for staging and production.
- **More HITL consumers** beyond the SQL Blocking Agent, through the published v1 contract.
- **Operational maturity:** SLOs and alerts, probes and resource limits, backup and DR tests, PHI rule
  tests, load tests, accessibility checks, and retention for evidence data.

The architecture supports growth because new capability is **additive**:

- A new self-service request is a template, an action or two, and a permission key; no new menu (the
  Create page lists it).
- A new dashboard is a plugin pair registered as an insights "template".
- A new data pipeline is a middleware feature with its own schema and timer.
- A new approval workflow reuses the HITL contract or the license-request pattern, which has a reuse
  guide.

And retirement is part of the plan: templates with no runs for 90 days are candidates to remove, and
retiring a feature follows the same lifecycle in reverse (PLAN, notice, permission removed, code removed).

> **TODO:** What's on the roadmap that isn't in the repos yet, for example new lines of business
> onboarding to the portal?
{: .prompt-warning }

Deeper: [Roadmap refinement](/posts/projects/oneplatform/18-continuous-improvement/#roadmap-refinement).

</div>

</details>

{% include project-nav.html %}
