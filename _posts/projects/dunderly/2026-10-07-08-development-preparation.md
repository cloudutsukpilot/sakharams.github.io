---
layout: post
title: "Dunderly HR System: Development Preparation"
date: 2026-10-07 00:08:00 +0530
categories: [projects, dunderly]
tags: [Projects, Dunderly, Development, Workflow]
description: "Dunderly HR dev setup: one .NET repo, trunk-based flow, .NET Aspire for local SQL and Azurite, central package management, and stricter review for payroll code."
project: dunderly
project_step: 8
image:
  path: /assets/img/projects/dunderly/08-development-preparation.webp
  alt: "Dunderly HR System: Development Preparation - Projects hero image"
---

A team of two developers and a part-time QA/DevOps engineer (assumption A3) can't afford a week of "it
works on my machine" or a repo layout nobody agrees on. Everything in this post is set up in the first two
weeks, before the first feature, and it has one opinionated rule that's specific to this system: code that
can change what someone is paid gets a second reviewer.

<!-- more -->

{% include project-nav.html %}

## Repository and branching strategy
{: #repository-and-branching-strategy }

**One repository**, `dunderly-hr`, for the web app, API, Functions, infrastructure and docs. They release
together, share contracts, and a single PR can change an endpoint, its UI and its Bicep in one review.

**Trunk-based development:** `main` is always releasable; feature branches live a day or two
(`feat/salary-withdrawal`, `fix/leave-balance-rounding`) and merge by squash. No long-lived `develop` or
release branches. Unfinished work hides behind [feature flags](#feature-flags).

Branch protection on `main`: PR required, one approving review (two for payroll paths, via CODEOWNERS),
all checks green, linear history, no force pushes. Releases are tags (`v1.4.0`) created by the pipeline.

## Coding standards
{: #coding-standards }

Enforced by tools rather than by review comments:

- `.editorconfig` with the .NET naming and formatting rules; `dotnet format --verify-no-changes` in CI.
- `<Nullable>enable</Nullable>` and `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` in
  `Directory.Build.props`, with the .NET analyzers at `AnalysisLevel` `latest-recommended`.
- Money is `decimal`, always with a currency; dates without times are `DateOnly`. No `double` for money,
  no `DateTime.Now` (use an injected `TimeProvider`, which also makes date logic testable).
- Module boundaries: a module may reference another module's `Contracts` project only. An architecture
  test (NetArchTest) fails the build if `Leave` reaches into `Salary` internals.
- Log messages use structured templates and never include salary amounts or personal fields.

## Project structure
{: #project-structure }

```text
dunderly-hr/
├── src/
│   ├── Dunderly.Hr.Web/              # Blazor WebAssembly app (Static Web Apps)
│   ├── Dunderly.Hr.Api/              # ASP.NET Core host, composes the modules
│   ├── Modules/
│   │   ├── Employees/                # Employees + Documents
│   │   ├── Salary/
│   │   ├── Leave/
│   │   ├── Payroll/
│   │   └── Audit/
│   ├── Dunderly.Hr.Shared/           # Validators and DTOs shared by Web and Api
│   ├── Dunderly.Hr.Functions/        # Payroll run, file writer, receipts, scan results, outbox
│   ├── Dunderly.Hr.PickupAgent/      # On-premises agent (console app, scheduled task)
│   └── Dunderly.Hr.AppHost/          # .NET Aspire local orchestration
├── tests/                            # Unit, integration, architecture, E2E (Playwright)
├── tools/Dunderly.Hr.Migration/      # One-off data migration tool
├── infra/                            # Bicep: main.bicep, modules/, env/*.bicepparam
├── docs/adr/  docs/runbooks/  docs/changes/
├── Directory.Build.props  Directory.Packages.props  .editorconfig
└── .github/workflows/  .github/CODEOWNERS
```

Each module folder has `Domain`, `Application`, `Infrastructure` (EF Core config, its schema) and
`Contracts`. That's enough structure to keep boundaries without a project per layer per module.

## Local development setup
{: #local-development-setup }

A new developer should go from clone to a running system in under 30 minutes:

```bash
git clone <repo-url>/dunderly-hr && cd dunderly-hr
dotnet tool restore                        # dotnet-ef and friends, pinned
dotnet run --project src/Dunderly.Hr.AppHost
```

The .NET Aspire AppHost starts a SQL Server container, Azurite (local Blob and queue), the API, the
Functions host and the Blazor app, wires their connection strings, and opens a dashboard with logs and
traces. The API applies migrations and seeds a fake company of 50 employees on startup in `Development`.

Authentication locally uses a **dev Entra app registration** with test users per role
(`hr-manager@<dev-tenant>`, `manager@…`), so role and reporting-line logic is exercised for real. Defender
scanning doesn't exist locally; a dev-only fake marks uploads clean after two seconds.

Prerequisites: .NET 10 SDK, Docker (or Podman), VS Code or Visual Studio, Azure CLI.

## Environment configuration
{: #environment-configuration }

Configuration follows .NET's layered model and the twelve-factor idea of config in the environment:

| Layer | Holds | Example |
|---|---|---|
| `appsettings.json` | Safe defaults | Page sizes, cache durations |
| `appsettings.{Environment}.json` | Non-secret per-environment values | Feature flag defaults |
| App Service / Functions app settings (from Bicep) | Endpoints, identities | `Sql__Server`, `Storage__DocumentsUri` |
| Key Vault references | Any remaining secret | (Few or none, see [Secrets](/posts/projects/dunderly/06-security-and-privacy/#secrets-and-key-management)) |

Options are bound to typed classes with `ValidateOnStart()`, so a missing setting fails the deployment's
health check instead of failing the first user. The Blazor app gets its few settings (API base URL, client
ID, scope) from `wwwroot/appsettings.json`, rewritten per environment in the pipeline; nothing secret goes
there, because everything in a WebAssembly app is public.

## Dependency management
{: #dependency-management }

- **Central Package Management** (`Directory.Packages.props`): one version per package across all projects.
- **Lock files** (`RestorePackagesWithLockFile`) and `dotnet restore --locked-mode` in CI, so builds are
  reproducible.
- **Dependabot** weekly, grouped (Microsoft packages together, test packages together).
- **Few dependencies by choice:** ASP.NET Core, EF Core, Microsoft.Identity.Web, FluentValidation, Fluent
  UI Blazor, Azure SDKs, OpenTelemetry. Each new package needs a line in the PR on why and its license.

More on restore and NuGet in CI: [DotNet Build](/posts/devops/build-tools/dotnet/dotnet-build/).

## Feature flags
{: #feature-flags }

`Microsoft.FeatureManagement` with flags in configuration, set per environment through Bicep app settings.
No Azure App Configuration service in v1: with a handful of flags and one team, changing an app setting is
fine.

| Flag | Purpose | Lifetime |
|---|---|---|
| `LeaveApprovalWorkflow` | Ship FR-7 dark, turn on after HR training | Remove after rollout |
| `PayrollFileV2Format` | Switch to a corrected file layout without a redeploy | Remove after one good month |
| `SelfServiceProfile` | Employees see their own profile | Remove after rollout |

Every flag has an owner and a removal issue. A flag that outlives its rollout is technical debt.

## Documentation standards
{: #documentation-standards }

Docs live in the repo next to the code they describe:

- `README.md`: what it is, how to run it, where things are.
- `docs/adr/`: one Markdown file per decision (see [ADRs](/posts/projects/dunderly/05-technical-architecture/#architectural-decision-records)).
- `docs/runbooks/`: one per operational task (payroll run, restore, rotate, DR).
- OpenAPI generated from the code and published with each build; XML comments on public endpoints.
- A PR that changes behaviour updates the relevant doc in the same PR; reviewers check it.

## Development workflow and code review process
{: #development-workflow-and-code-review-process }

1. Pick a ready story; branch from `main`.
2. Write tests with the code; run `dotnet test` locally.
3. Open a PR early (draft) with the PR template: what, why, how tested, screenshots, migration (yes/no),
   payroll impact (yes/no).
4. CI runs build, tests, scans and a Static Web Apps preview (see [CI/CD](/posts/projects/dunderly/12-cicd-and-release-management/)).
5. Review, then squash-merge.

```text
# .github/CODEOWNERS
*                                   @dunderly-hr/developers
/src/Modules/Payroll/               @dunderly-hr/developers @dunderly-hr/payroll-reviewers
/src/Dunderly.Hr.Functions/Payroll/ @dunderly-hr/developers @dunderly-hr/payroll-reviewers
/src/Dunderly.Hr.PickupAgent/       @dunderly-hr/developers @dunderly-hr/payroll-reviewers
/infra/                             @dunderly-hr/devops
```

What reviewers look for, in order: correctness of business rules, authorization checks, tests, migrations
(expand-only?), logging hygiene (no personal data), then style. Review turnaround target: same working day.

## Checklist
{: #checklist }

- [ ] Create the repo with the structure above, branch protection and CODEOWNERS.
- [ ] Add `Directory.Build.props`, `Directory.Packages.props`, `.editorconfig` and lock files.
- [ ] Set up the dev Entra tenant app registrations and test users per role.
- [ ] Make `dotnet run --project src/Dunderly.Hr.AppHost` work on a clean machine.
- [ ] Add the NetArchTest module boundary tests.
- [ ] Add the PR template with "payroll impact" and "migration" questions.
- [ ] Write ADR-001 to ADR-009 into `docs/adr/`.

{% include project-nav.html %}
