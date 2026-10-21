---
published: false
layout: post
title: "OnePlatform: CI/CD and Release Management"
date: 2026-10-05 00:12:00 +0530
categories: [projects, oneplatform]
tags: [Projects, OnePlatform, CICD, Release]
description: "OnePlatform's pipelines: PR builds with test lanes and a Sonar gate, date-tagged images, Argo CD for dev, tag promotion to staging and prod, manual EF migrations."
project: oneplatform
project_step: 12
image:
  path: /assets/img/projects/oneplatform/12-cicd-and-release-management.webp
  alt: "OnePlatform: CI/CD and Release Management - Projects hero image"
---

A OnePlatform release is a tag, not a branch. CI builds the image once and stamps it with a date-based tag. After that, every environment is just a values file pointing at that tag, so what reaches production is byte-for-byte what development ran. This post walks the pipelines for both repositories and the controls between them.

<!-- more -->

{% include project-nav.html %}

## Build automation
{: #build-automation }

{% include flow-anim.html id="projects/oneplatform/release-promotion" %}

**Portal.** A reusable build workflow runs on pull requests and pushes. It enables Corepack, authenticates to the private registry with OIDC, runs `yarn install --immutable`, builds the backend and type-checks the workspace. The Docker build is multi-stage. It installs from a skeleton of `package.json` files for cache efficiency, mounts the registry token and CA bundle as BuildKit secrets, builds frontend and backend, and assembles a production-only runtime on `node:24-trixie-slim`.

**Middleware.** Separate workflows for the solution build, unit tests with coverage, integration tests, SonarQube, the API image (per environment), the Functions package, the EF migration bundle and TechDocs publishing. Path filters keep a docs change from rebuilding everything.

## Automated test execution
{: #automated-test-execution }

| Lane | Trigger | Repo |
|---|---|---|
| Unit (Jest) | PR, push | Portal |
| Integration (Jest + Testcontainers PostgreSQL) | PR, push | Portal |
| Full coverage for Sonar (unit + integration) | PR, push | Portal |
| E2E (Playwright) | Compatibility run, on demand | Portal |
| Pre-upgrade compatibility (Node matrix, PostgreSQL 16/17, E2E, image preflight) | Before a Backstage upgrade | Portal |
| Unit with coverage and badges | PR, push (badges on main) | Middleware |
| Integration (Testcontainers PostgreSQL and SQL Server) | PR, push | Middleware |

> **TODO:** Is the E2E lane required on every PR or only in the compatibility run? If only there, I'd add the anonymous route checks to every PR; they take seconds.
{: .prompt-warning }

## Static analysis and security scanning
{: #static-analysis-and-security-scanning }

SonarQube runs in both repos. The portal's scan reads LCOV from the combined Jest run (3,049 tests at the recorded baseline) and posts the PR check. The middleware uses a shared SonarQube workflow. ESLint runs on changed files. CodeQL extensions are configured in the middleware. Dependabot opens grouped weekly updates for npm, NuGet and Actions. Production images get runtime protection from the container defender in the cluster rather than only a build-time scan.

> **TODO:** Is there an image vulnerability scan (registry scanning or Trivy) before promotion? If not, that's the gap I'd close next in this pipeline.
{: .prompt-warning }

## Artifact and container management
{: #artifact-and-container-management }

- **Registry:** a private registry for images, npm (a remote proxy plus a dedicated repository for private plugins) and NuGet.
- **Tags:** `YYYY.MM.DD.<run number>`, one per release run, immutable in practice. Branch names and SHAs are never used as deploy tags unless that exact image was published.
- **Private plugins** (like the routing sheet frontend and backend) are published to the plugin repository and pinned to exact versions in the host app.
- **Pull:** clusters pull with a registry pull secret.

## Deployment automation
{: #deployment-automation }

The portal is moving to **GitOps for all environments**:

1. The release workflow builds and pushes the image, creates a Git tag and a prerelease, and bumps `values-dev.yaml` in the charts repo. Argo CD deploys development.
2. *Promote to Staging* reads the tag from the dev values and writes it to the staging values.
3. *Promote to Production* reads the staging tag, writes it to the production values, and triggers release notes.

The older path, a direct AKS deploy workflow that applies manifests to the staging or production namespace with an image reference, is still maintained. The deployment doc still names it as the stage and prod path, while the newer promote workflows do the same job through Git.

> **TODO:** Which path is used for staging and production today, and is there a date to retire the direct AKS deploy? Two paths means two ways for production to drift from Git.
{: .prompt-warning }

The middleware deploys through manually dispatched workflows: build the API image for an environment, deploy with Helm, and, separately, build and deploy the Functions package. A restart workflow restarts pods without a new deploy.

## Database deployment strategy
{: #database-deployment-strategy }

**Portal plugins** run their Knex migrations at startup, which Backstage does by design; each migration is tested against PostgreSQL in the integration lane first.

**Middleware** migrations are never applied at startup. A workflow builds the EF Core migration bundle per environment, and another applies it, so a schema change is its own, visible deploy step. That ordering is the rule:

```text
1. Apply EF migrations (backward compatible with the running API)
2. Deploy the new API image
3. Deploy Functions if they changed
4. Later release: remove what the old code needed
```

## Approval gates
{: #approval-gates }

- PRs need code-owner review, and `.github/` changes need the narrower owner set.
- SonarQube must pass.
- Staging and production promotion workflows run in GitHub environments (`staging`, `production`); production needs an approver.
- Middleware deploys are manual dispatches per environment, also bound to GitHub environments.

> **TODO:** Who are the production approvers (by role), and is a change record needed for production releases?
{: .prompt-warning }

## Versioning and release notes
{: #versioning-and-release-notes }

The portal is versioned by date tag; each release run creates a Git tag and a GitHub prerelease with that name. Promotion to production triggers a release notes workflow. Private plugins use semantic versions (0.9.1, 1.0.0, 1.0.3), and the host app bumps them in a PR of its own, so a plugin upgrade is visible in history.

## Rollback and roll-forward procedures
{: #rollback-and-roll-forward-procedures }

**Portal rollback** is a revert of the values change, or a promotion run with an older tag as input: both promote workflows accept an explicit tag. Argo CD syncs the old image back. Because images are immutable and tagged by date, "the last good one" is easy to find.

**Middleware rollback** is a Helm deploy of the previous image tag. Database changes are rolled forward, not back, which is why migrations must stay backward compatible for one release.

**Roll forward** is the default for small defects: fix, release, promote. The pipeline is short enough that this is usually faster than a rollback.

## Release calendar
{: #release-calendar }

There's no fixed calendar. Releases go to development whenever someone runs the release workflow. Promotion to production happens when staging has been checked.

> **TODO:** Is there a production release window (for example, not Friday afternoons or month-end close for FinOps users) or a freeze period? Write it down here even if it's informal.
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] One deployment path (GitOps) for staging and production; the direct AKS deploy retired
- [ ] Image vulnerability scan before promotion
- [ ] Anonymous E2E route checks on every PR
- [ ] EF migrations backward compatible for one release, applied before the API deploy
- [ ] Production approvers and change-record rule documented
- [ ] Rollback by tag rehearsed for portal and middleware
- [ ] Release window and freeze periods written down

{% include project-nav.html %}
