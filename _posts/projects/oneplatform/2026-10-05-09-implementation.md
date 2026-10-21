---
published: false
layout: post
title: "OnePlatform: Implementation"
date: 2026-10-05 00:09:00 +0530
categories: [projects, oneplatform]
tags: [Projects, OnePlatform, Implementation]
description: "How OnePlatform features are built: an AI-assisted plan, design and phased-build loop, plugin and scaffolder action patterns, migrations, integrations and reviews."
project: oneplatform
project_step: 9
image:
  path: /assets/img/projects/oneplatform/09-implementation.webp
  alt: "OnePlatform: Implementation - Projects hero image"
---

OnePlatform adds features at a steady pace: around a hundred commits a month through 2026, across two codebases. What keeps that pace from turning into a mess is that every feature goes through the same loop, from a reuse check through written plans to a phased build with tests in each phase, and the loop is encoded in repository prompts the AI assistant follows. This post shows that loop and the code patterns it produces.

<!-- more -->

{% include project-nav.html %}

## Sprint or iteration planning
{: #sprint-or-iteration-planning }

The team works in sprints from the Jira backlog described in [Product Planning](/posts/projects/oneplatform/03-product-planning/#backlog-structure). A middleware job pulls each sprint's stories from Jira every week for predictability reporting, so we can see how much committed work actually lands. Within a sprint, a feature's IMPLEMENTATION checklist is the unit of planning: its phases are small enough (three to eight steps each) to finish and validate one at a time.

> **TODO:** Sprint length, ceremonies, and how platform chores (upgrades, Dependabot) are budgeted per sprint.
{: .prompt-warning }

## Feature development
{: #feature-development }

The lifecycle every feature in the [catalog](/posts/projects/oneplatform/03-product-planning/#feature-catalog) went through, with the small-change path as a second mode:

{% include flow-anim.html id="projects/oneplatform/feature-lifecycle" %}

Two things make this work better than "ask the AI to build it". The **pre-flight reuse check** runs before any plan, so we extend the GitHub plugin with a report tab instead of creating a fifth GitHub plugin. And **unit tests are written in the same phase as the code**. The planner says why: deferring tests to the end made the assistant forget the details it needed to test. Each doc also records its phase (`CURRENT_PHASE`, `LAST_UPDATED_PHASE`), so a session can resume where the last one stopped.

This loop is also the outline I'll use for the per-feature deep-dives:

| Stage | Source in the repo | What the deep-dive answers |
|---|---|---|
| Requirements | PLAN.md, the Jira ticket | What problem, for whom, which rules, what "done" means |
| Design | DESIGN.md, ARCHITECTURE.md | Components, API, data, permissions, and the alternatives rejected |
| Implementation | IMPLEMENTATION.md, the PRs | Phases, notable code, surprises |
| Testing | Phase tests, integration and E2E files | What was proven and how |
| Release | Release tag, promotion | When and how it reached users |
| Benefits | Adoption Insights, before/after numbers | What changed for users |

A worked example from one feature with full docs, per-subscription Azure ingestion:

| Stage | Summary |
|---|---|
| Requirement | Ingesting ~10,000 Azure entities in one write locked the catalog database and degraded the portal; one failing subscription could lose all the others' entities |
| Design | One entity provider per subscription, staggered schedules, independent writes; same entity refs so nothing is orphaned |
| Implementation | Refactor of the Azure resource provider into per-subscription providers (Backstage `EntityProvider` API) |
| Benefit | ~22 writes of ~500 entities instead of one of ~10,000; failures isolated and visible per subscription |

> **TODO:** For the worked example: what tests proved it (integration test of the provider? a load comparison?) and what measured improvement did users see? I'll fill those two rows once you confirm.
{: .prompt-warning }

## API and UI implementation
{: #api-and-ui-implementation }

**Backend plugins** use the new backend system. A plugin declares its dependencies and gets them injected:

```ts
export const myPlugin = createBackendPlugin({
  pluginId: 'my-feature',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        httpRouter: coreServices.httpRouter,
        httpAuth: coreServices.httpAuth,
        permissions: coreServices.permissions,
        database: coreServices.database,
      },
      async init(deps) {
        deps.httpRouter.use(await createRouter(deps)); // every route checks a permission
      },
    });
  },
});
```

Registration order in the backend is load-bearing. It's extracted into one `registerProductionFeatures()` function, and a composition test records the registration graph without starting a server.

**Scaffolder actions** follow validate-then-act. The Function App template chains `azure:function-app-prerequisites`, `azure:validate-createfunctionapp-permissions`, `azure:checkresourceexists` and `azure:storageAccountNameAvailability` before `github:trigger-action` starts Terraform. There are about 50 custom actions, grouped by domain (Azure VM, Key Vault, identity, GitHub repo, workflow, licensing, monitoring, audit, team and user).

**Frontend plugins** register an API client factory, a route and a nav item, and build pages from `common-ui`, React Query for data and MUI DataGrid for tables. Scaffolder field extensions (40+) are ordinary React components registered as extensions.

**Middleware controllers** stay thin: a controller per feature, logic in `Middleware.Services/<Feature>/Services`, data access in repositories.

## Database and infrastructure implementation
{: #database-and-infrastructure-implementation }

Portal plugins write Knex migrations in the plugin; the owned-migrations integration test runs them all on PostgreSQL 16. Middleware features add EF Core migrations per context, applied by workflow ([Data](/posts/projects/oneplatform/07-data-and-integration/#database-schema-and-migrations)).

The portal doesn't create infrastructure itself. Templates dispatch workflows in infrastructure repositories, which run Terraform plan and apply, and the action waits for the run to finish. That keeps Terraform state and modules with the teams that own them; for how such a module platform can look, see [Y-IaC](/tags/y-iac/). The portal's own infrastructure is in a separate Terraform repo.

## Integration development
{: #integration-development }

Patterns we reuse for every external system:

- **One client per system, in one backend plugin.** GitHub calls go through the GitHub backend's Octokit factory, which picks the App installation per organization.
- **Auth is a delegating handler, not code in each call.** The middleware's Jira client adds OAuth 2.0 in the `HttpClient` pipeline.
- **Wait explicitly.** Actions like `github:wait-for-action` and `github:wait-for-merge` make long-running steps visible in the task log instead of returning "triggered".
- **Propagation delays are real.** Adding a user to the SSO group that grants a GitHub seat needs a short wait before the org invitation succeeds. The action waits two seconds; it's in the code with a comment, not in tribal knowledge.
- **Version contracts.** The HITL contract is versioned (v1), so a second Temporal application can onboard without reading our code.

## Technical debt tracking
{: #technical-debt-tracking }

Debt we know about, and where it's tracked:

| Item | Why it exists | Plan |
|---|---|---|
| Copilot license v1 action kept beside v2 | Backward compatibility for in-flight requests | Remove once no v1 requests remain |
| GitHub's legacy Copilot metrics API | Upstream retirement | Migration in progress |
| `patch-package` patches on upstream packages | Upstream bugs | Drop on each upgrade if fixed |
| Transitive `resolutions` pins | Vulnerable transitive packages | Remove when parents update |
| Catalog `orphanStrategy: keep` | Safety during ingestion changes | Revisit now that ingestion is per subscription |
| Mixed legacy and new patterns in older plugins | Pre-date `common-ui` and the new frontend system | Migrate when touched |

Sonar findings are fixed in dedicated PRs ("sonar issues") rather than left to pile up.

## Code reviews
{: #code-reviews }

What a reviewer checks on OnePlatform, beyond correctness:

- Does the PR follow the PLAN and DESIGN, or record why it diverged? (There's a divergence protocol: update the doc, don't drift.)
- Every new route or template has a permission check and a denial test.
- Shared UI comes from `common-ui`; no copy-pasted headers or loaders.
- Architecture docs and the feature's ARCHITECTURE.md are updated.
- No secrets, tokens or real user data in code, tests or prompts.

CODEOWNERS assigns reviewers, with a smaller owner set for `.github/`, because workflow changes can deploy to production.

## Developer documentation
{: #developer-documentation }

Developer docs are layered so nobody has to read everything:

- **Onboarding path** in tiers: setup (day 1), orientation (week 1), before your first change, testing conventions, then deep reference only when needed.
- **Step-by-step guides** for a new backend plugin, a new frontend plugin and a new permission.
- **Reuse guides**, such as the license-request workflow guide for building another approval-style request.
- **Per-feature docs** in `docs/features/`, the historical record of why each feature looks the way it does.

## Checklist
{: #checklist }

- [ ] Pre-flight reuse check recorded in every new PLAN
- [ ] Unit tests land in the same phase as the code
- [ ] Every scaffolder action validates before it acts and logs what it changed
- [ ] Long-running external steps use an explicit wait action
- [ ] Debt table reviewed each quarter; v1 Copilot action removed when unused
- [ ] Reviewers check plan conformance and docs, not only code
- [ ] One feature deep-dive per month written from its PLAN, DESIGN and IMPLEMENTATION

{% include project-nav.html %}
