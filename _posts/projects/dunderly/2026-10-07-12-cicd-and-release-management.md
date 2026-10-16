---
layout: post
title: "Dunderly HR System: CI/CD and Release Management"
date: 2026-10-07 00:12:00 +0530
categories: [projects, dunderly]
tags: [Projects, Dunderly, CICD, Release]
description: "Dunderly HR pipeline: GitHub Actions with OIDC, build once and promote, EF Core migration bundles, smoke-tested slot swaps, and no releases in payroll week."
project: dunderly
project_step: 12
image:
  path: /assets/img/projects/dunderly/12-cicd-and-release-management.webp
  alt: "Dunderly HR System: CI/CD and Release Management - Projects hero image"
---

The 2023 case study ended at "Write Architecture Document" and "Support the Team"; it never said how code
reaches Azure. For a team of four, the pipeline is the team's most productive member: it builds, tests,
scans, deploys and rolls back without needing a meeting. The one thing it isn't allowed to do on its own
is ship during payroll week.

<!-- more -->

{% include project-nav.html %}

## Build automation
{: #build-automation }

GitHub Actions, two workflows: `pr.yml` on pull requests and `release.yml` on pushes to `main`. The whole
path, from PR to production. Tick the box to see failing smoke tests stop a release:

{% include flow-anim.html id="projects/dunderly/cicd-pipeline" %}

The build is plain `dotnet` CLI with locked restores, so a CI build and a local build are the same build:

```bash
dotnet restore --locked-mode
dotnet build -c Release --no-restore
dotnet test -c Release --no-build --collect:"XPlat Code Coverage"
dotnet publish src/Dunderly.Hr.Api -c Release -o artifacts/api
dotnet publish src/Dunderly.Hr.Web -c Release -o artifacts/web
dotnet publish src/Dunderly.Hr.Functions -c Release -o artifacts/func
dotnet ef migrations bundle --project src/Dunderly.Hr.Api --self-contained -r linux-x64 -o artifacts/efbundle
```

More on .NET builds in CI in [DotNet Build](/posts/devops/build-tools/dotnet/dotnet-build/) and on Actions
basics in [GitHub Actions - Introduction](/posts/devops/cicd/github%20actions/github-actions/).

## Automated test execution
{: #automated-test-execution }

| Stage | Tests | Blocks |
|---|---|---|
| PR | Unit, integration (Testcontainers SQL + Azurite), authorization matrix, architecture tests, payroll golden files | Merge |
| Deploy to test | Playwright E2E journeys with axe, ZAP baseline | Promotion to prod |
| Nightly on test | Full E2E on Chromium, Firefox, WebKit | Nothing (reports) |
| Prod staging slot | Smoke tests | Swap |

Test results publish as a check summary; coverage goes to the PR as a comment. A flaky test is quarantined
with an issue, never retried silently into green.

## Static analysis and security scanning
{: #static-analysis-and-security-scanning }

- **CodeQL** (C#) on every PR and weekly on `main`.
- **Dependency review** action blocks PRs adding packages with known high/critical vulnerabilities or
  disallowed licenses.
- **Secret scanning** with push protection.
- **.NET analyzers** as errors (`TreatWarningsAsErrors`), `dotnet format --verify-no-changes`.
- **Bicep:** `az bicep lint` and a `what-if` against the target environment, posted to the PR.
- **OpenAPI diff** flags breaking API changes for an explicit decision.

## Artifact and container management
{: #artifact-and-container-management }

No containers in production: App Service and Functions run zip deployments, and Static Web Apps takes the
built `wwwroot`. The release workflow builds **once** and uploads the artifacts (`api.zip`, `func.zip`,
`web/`, `efbundle`) to the workflow run, stamped with the version (`1.4.0+<short sha>`). Every environment
deploys those exact files. Rebuilding per environment would mean prod runs something test never saw.

Artifacts are kept for 90 days in GitHub; tagged releases also attach them to the GitHub Release, so any
version can be redeployed.

## Deployment automation
{: #deployment-automation }

One reusable job deploys any environment, signed in with OIDC:

{% raw %}
```yaml
deploy:
  environment: ${{ inputs.environment }}          # dev | test | prod (prod has required reviewers)
  permissions: { id-token: write, contents: read }
  steps:
    - uses: azure/login@v2
      with:
        client-id: ${{ vars.AZURE_CLIENT_ID }}
        tenant-id: ${{ vars.AZURE_TENANT_ID }}
        subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
    - run: az deployment sub create -l westeurope -f infra/main.bicep -p infra/env/${{ inputs.environment }}.bicepparam
    - run: ./efbundle --connection "${{ steps.conn.outputs.sql }}"   # Entra auth, no password
    - uses: azure/webapps-deploy@v3
      with:
        app-name: app-dunderly-hr-api-${{ inputs.environment }}
        slot-name: ${{ inputs.environment == 'prod' && 'staging' || 'production' }}
        package: artifacts/api.zip
```
{% endraw %}

For prod the sequence is: Bicep → migrations → API to the staging slot → smoke tests → swap → Functions
→ Static Web Apps. The web app goes last so the UI never calls an API older than itself. PRs get a Static
Web Apps **preview environment** automatically, which is where HR reviews UI changes.

## Database deployment strategy
{: #database-deployment-strategy }

Migrations run **before** the new code, and are **expand-only** (see
[migrations](/posts/projects/dunderly/07-data-and-integration/#database-schema-and-migrations)). That
ordering is what makes the slot swap safe: during the swap, both the old and the new API version run against
a schema that suits both.

A destructive change (dropping a column) takes two releases: release N stops using it, release N+1 drops it.
The migration bundle runs as the pipeline's identity, which is the only principal with DDL rights in prod;
the API's identity has DML rights only. One practical catch: SQL has public network access disabled, so a
GitHub-hosted runner can't reach it. The bundle runs either on a small self-hosted runner in the VNet or as
an Azure deployment script attached to the VNet; I'd pick the deployment script, because there's no runner
to patch.

Before any migration in prod, the pipeline records the current time. Point-in-time restore to that moment
is the escape hatch if a data migration goes wrong, which is rare when migrations only add.

## Approval gates
{: #approval-gates }

| Gate | Who | Where |
|---|---|---|
| PR merge | One reviewer; two for payroll paths | Branch protection + CODEOWNERS |
| Deploy to test | Automatic | — |
| Deploy to prod | A named reviewer (tech lead or architect) | GitHub environment `prod` |
| Payroll-impacting release | Also the payroll operator | PR label `risk:payroll` + checklist |
| Payroll week | Blocked unless the fix is for payroll | Release calendar check |

The prod environment also has a wait timer of zero and a deployment branch rule: only `main` can deploy.

## Versioning and release notes
{: #versioning-and-release-notes }

Semantic versioning for the system as a whole (`MAJOR.MINOR.PATCH`). The API's URL version (`/api/v1`) only
changes for breaking API changes, which, with one client in the same repo, should be never.

Release notes are generated from PR titles (conventional commit prefixes: `feat:`, `fix:`, `chore:`) into
the GitHub Release, then a human writes a two-line summary for HR in plain language: "You can now withdraw
a salary request before HR decides." That second part is what users actually read.

## Rollback and roll-forward procedures
{: #rollback-and-roll-forward-procedures }

| Situation | Action | Time |
|---|---|---|
| Smoke tests fail in the slot | Don't swap; fix forward | 0 user impact |
| Problem found after swap | Swap back (old build is in the slot) | Minutes |
| Bad Functions deployment | Redeploy the previous `func.zip` from the release | Minutes |
| Bad web deployment | Redeploy the previous web artifact | Minutes |
| Bad data change | Point-in-time restore to a new database, repair data | Hours |

Because migrations only add, swapping back never needs a schema rollback. Default is roll forward for
anything that isn't actively hurting users; swap back when it is.

```bash
az webapp deployment slot swap -g rg-dunderly-hr-prod -n app-dunderly-hr-api-prod --slot staging --target-slot production
```

## Release calendar
{: #release-calendar }

Small releases, often, outside payroll week:

- **Normal cadence:** weekly, Tuesday to Thursday mornings, when the team is around to watch.
- **Freeze:** from the payroll cutoff to payday, every month (assumption A6). Payroll fixes only.
- **No Friday afternoon releases.** Not a superstition: nobody's watching at the weekend.
- **Year end:** freeze around leave carry-over and the first payroll of the year.

The calendar is a shared Outlook calendar plus a check in the workflow that reads the payroll cutoff dates
from a config file and fails a prod deploy in the freeze window unless the PR has the `payroll-fix` label.

## Checklist
{: #checklist }

- [ ] Create `pr.yml` and `release.yml` with the reusable deploy job.
- [ ] Configure OIDC federated credentials and GitHub environments with reviewers.
- [ ] Add the smoke test suite and wire it to the swap decision.
- [ ] Grant DDL to the pipeline identity only; DML to the API identity.
- [ ] Add the payroll-freeze check with this year's cutoff dates.
- [ ] Rehearse a swap-back in test.
- [ ] Write the plain-language release note template for HR.

{% include project-nav.html %}
