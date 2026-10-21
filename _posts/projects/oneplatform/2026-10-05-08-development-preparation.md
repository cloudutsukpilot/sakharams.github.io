---
published: false
layout: post
title: "OnePlatform: Development Preparation"
date: 2026-10-05 00:08:00 +0530
categories: [projects, oneplatform]
tags: [Projects, OnePlatform, Development, Setup]
description: "Preparing to build OnePlatform: two repos, a Yarn/Backstage monorepo layout, WSL or Dev Container setup, secrets from Key Vault, and AI-aware standards."
project: oneplatform
project_step: 8
image:
  path: /assets/img/projects/oneplatform/08-development-preparation.webp
  alt: "OnePlatform: Development Preparation - Projects hero image"
---

A Backstage monorepo with 45 custom plugins and fifty secrets can eat a new engineer's first week. On OnePlatform we turned that into a tiered onboarding path and two supported setups, and we put the coding rules where both humans and AI assistants read them. This post is what a new contributor needs before writing a line.

<!-- more -->

{% include project-nav.html %}

## Repository and branching strategy
{: #repository-and-branching-strategy }

Two repositories, split by stack and lifecycle:

| Repo | Contents | Released as |
|---|---|---|
| Portal | Backstage app, backend, ~45 plugins, templates, manifests, docs | One container image |
| Middleware | .NET API, Functions, services library, tests, Helm chart, TechDocs | API image, Function App package, EF migration bundle |

Charts for the portal's GitOps deploy live in a third, deployment-only repository. Infrastructure for the portal itself (database, vaults, identities) lives in a separate Terraform repository.

Branching is trunk-based on `main` with short-lived feature branches named after the ticket (`<TICKET>-short-description`). Everything merges through a pull request; `main` is always releasable, and releases are tags created by the release workflow, not branches.

## Coding standards
{: #coding-standards }

**Portal (TypeScript):** ESLint and Prettier through `lint-staged` on commit, with Spotify's Prettier config. `yarn lint` checks only what changed since `origin/main`. Backend plugins use the new backend system (`createBackendPlugin`, core services injected). Frontend plugins use the new frontend system and the shared `common-ui` components. SonarQube rules are written into the contributor instructions, so the common findings get fixed while coding.

**Middleware (.NET):** file-scoped namespaces, `_camelCase` private fields, `Async` suffixes, XML docs on public APIs, `required` and nullable annotations, `ArgumentNullException.ThrowIfNull`. Banned: lazy loading, swallowed exceptions, `async void`, hardcoded secrets, unparameterized SQL, console logging in Azure. A 13 KB `.editorconfig` enforces most of it.

## Project structure
{: #project-structure }

```text
portal/
├── packages/
│   ├── app/            # frontend shell: feature modules, API client registrations, nav
│   ├── backend/        # backend composition, auth, permission policy, scaffolder actions
│   ├── finops-common/  # shared types
│   └── test-utils/
├── plugins/            # <feature> and <feature>-backend pairs, common-ui, util
├── services/           # software templates grouped by domain (github/, insights/, …)
├── docs/               # onboarding, architecture, features/<ticket>_<name>/, testing
└── manifests/          # Kubernetes manifests for the AKS deploy path

middleware/
├── src/Middleware.Api/        # controllers, filters, Dockerfile
├── src/Middleware.Functions/  # one class per Function
├── src/Middleware.Services/<Feature>/{Data,Models,Repositories,Services}
├── test/Middleware.Tests.Unit/ and Middleware.Tests.Integration/
└── HelmCharts/
```

The build-decision guide answers "where does this go?" before code is written: catalog entity or database table, new plugin or extension of an existing one. It's the doc that most reduces duplicate work.

## Local development setup
{: #local-development-setup }

Two supported paths, and you pick one per checkout:

| Setup | When | What you get |
|---|---|---|
| WSL-native | You want tools installed directly in Ubuntu on WSL 2 | Node, Azure CLI, optional local PostgreSQL |
| Dev Container | You use Docker Desktop | Tools, corporate certificates and PostgreSQL in containers |

Then:

```bash
az login                 # your own identity; local secrets come from the dev Key Vault
yarn install
yarn dev                 # full frontend + backend (same as F5 in VS Code)
yarn dev:local           # lean backend: fewer plugins, no Jira enrichment, faster user ingestion
```

`yarn dev:local` exists because the full backend was slow to start locally: every Azure VM triggered a Jira lookup during ingestion, and the 30-minute catalog interval meant users weren't sign-in-ready for a while. The lean entry point comments each disabled service with when to turn it back on.

The middleware is simpler: `dotnet run --project src/Middleware.Api`, and `func start` for Functions, both reading configuration from App Configuration with your Azure login.

## Environment configuration
{: #environment-configuration }

- **Portal:** `app-config.yaml` with `${ENV_VAR}` substitution for every secret and environment-specific value; an E2E config for tests. Locally, `local.env` holds non-secret settings and a generated `local.keyvault.env` holds the secrets fetched from the vault.
- **Middleware:** two environment variables, `APPCONFIG_ENDPOINT` and `APPCONFIG_LABELS`. Everything else comes from Azure App Configuration with Key Vault references, through `DefaultAzureCredential`.
- **Per environment:** development, staging and production each have their own vault, App Configuration store, namespace and identities.

Adding a new integration secret has a one-page guide: add it to the vault, map it in the local secret map, reference it in config.

## Dependency management
{: #dependency-management }

Yarn 4 through Corepack, with the version pinned in `packageManager`. Installs resolve through the private registry proxy, and the `@internal`/private plugin scope resolves from its own repository. `resolutions` pin vulnerable transitive packages. `patch-package` patches upstream bugs we can't wait for. NuGet uses central package management in `Directory.Packages.props`. After any package change the middleware rules require a vulnerable-package scan and a full build, and dependency files must be in CI path filters.

Backstage itself is upgraded as a planned piece of work with its own compatibility run, not through Dependabot ([Support](/posts/projects/oneplatform/16-support-and-maintenance/#patch-and-upgrade-management)).

## Feature flags
{: #feature-flags }

There's no flag service. Flags are configuration, which is enough for an internal tool with one release train:

| Flag | Where | Effect |
|---|---|---|
| `SCAFFOLDER_NOTIFICATIONS_ENABLED` | app-config | Teams notifications for failed runs |
| `PR_REMINDER_ENABLED` | app-config | Scheduled PR reminder emails (off locally) |
| PHI `enabled` master switch | PHI config | All PHI filtering on or off |
| `enabled: false` per check | State of DevOps YAML | Disable a scorecard check without code |
| `storageMode` (`azure` or `local`) | routing sheets config | Blob storage vs local filesystem |
| E2E guest flag | browser flag in tests only | Exposes the guest sign-in for Playwright; production stays Entra-only |

Role-aware navigation acts as a soft rollout tool too: map a new page to the Admin role first, then widen.

## Documentation standards
{: #documentation-standards }

Docs live in the repo and are part of done:

- `docs/features/<ticket>_<name>/` holds PLAN, DESIGN, IMPLEMENTATION and ARCHITECTURE for anything beyond a small change.
- `docs/architecture/` holds the C4 diagrams, a machine-readable node and edge registry, change-impact rules and developer guides. A routing skill tells the AI assistant to update these when structure changes.
- The middleware publishes `docs/` as TechDocs on every push to main, so it's readable in the portal itself.
- Coding rules for the middleware say: update `docs/` for any feature, endpoint, schema, config or architecture change.

## Development workflow and code review process
{: #development-workflow-and-code-review-process }

1. Ticket in Jira (there are scripted prompts to create, read, update and transition tickets from the editor).
2. Plan: `/feature-planner` for features, `/change-request` for tracked changes. Output goes in the feature folder.
3. Implement phase by phase with `/feature-implement`. Unit tests go in with each phase, not at the end.
4. PR: CI runs build, type-check, unit, integration and Sonar. CODEOWNERS adds reviewers; `.github/` changes need a narrower set of owners.
5. Review checks the plan was followed and that architecture docs were updated.
6. Merge to main; release through the workflow.

How the AI-assisted part fits is covered in [Implementation](/posts/projects/oneplatform/09-implementation/#feature-development).

> **TODO:** How many approvals does a PR need, and are there branch protection rules beyond CODEOWNERS (required checks, signed commits)?
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] New contributor completes the tier 0 setup in a day with no plaintext secrets
- [ ] One setup path (WSL or Dev Container) chosen per checkout
- [ ] `yarn dev:local` documented for the plugin you're working on
- [ ] Build-decision guide consulted before creating a new plugin
- [ ] Branch protection and required checks documented
- [ ] New secrets added through the vault and the local secret map only
- [ ] Feature folder created with PLAN before implementation starts

{% include project-nav.html %}
