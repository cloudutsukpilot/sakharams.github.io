---
layout: post
title: "State of DevOps: CI/CD and Release Management"
date: 2026-10-05 00:12:00 +0530
categories: [projects, state-of-devops]
tags: [Projects, State of DevOps, CICD, Release]
description: "The State of DevOps pipeline: build each changed component once, scan with SonarQube and CodeQL, re-tag on a versions.yaml bump, and promote through ArgoCD."
project: state-of-devops
project_step: 12
image:
  path: /assets/img/projects/state-of-devops/12-cicd-and-release-management.webp
  alt: "State of DevOps: CI/CD and Release Management - Projects hero image"
---

The release pipeline for State of DevOps follows one principle: **build once, deploy many by
re-tagging.** A merge to `main` builds each changed component's image and chart exactly once. A release
is a version bump in `versions.yaml` that re-tags that same image as `vX.Y.Z` and opens a promotion pull
request in the GitOps repository. Nothing is rebuilt between development and production, so what was
tested is what ships.

<!-- more -->

{% include project-nav.html %}

## Build automation
{: #build-automation }

CI is one GitHub Actions workflow (`ci.yaml`) built mostly from the organization's reusable workflows:

```text
prepare ─▶ detect-components ─▶ build-components (matrix: one job per changed component)
                              ├▶ sonarqube-scan (matrix)
                              └▶ tag-latest (main only)
detect-helm-charts ─▶ helm-charts (package + publish changed charts)
codeql-scan (on changes + weekly full scan, Mondays 06:00 UTC)
preview-approval / release-approval (+ 15-minute expiry watchdogs)
```

Change detection is what makes the monorepo affordable: a change in `devops-ghas-analyzer/` builds only
that image and chart. Manual dispatch inputs allow building one specific component, or forcing a build
of everything, which is useful after a change to `cronjobs/common/` that every image copies in.

## Automated test execution
{: #automated-test-execution }

Tests run in the SonarQube job per component (`test_path: tests`), so coverage is reported where
the quality gate can see it. The suites described in
[Quality Assurance](/posts/projects/state-of-devops/10-quality-assurance/) slot in by layer:

| Stage | Tests |
|---|---|
| Every PR | Unit tests, contract tests on file models, golden-file regression |
| PR preview (development cluster) | The changed job run once against the dev data path |
| After release to dev | End-to-end chain against a test org |

Gates block; they don't just report. The merge policy for `main`:

| Check | Blocks the merge when |
|---|---|
| Build and unit, contract and golden-file tests | Any test fails |
| SonarQube quality gate (`sonar.qualitygate.wait=true`, so the job fails with the gate) | New bugs or vulnerabilities, unreviewed security hotspots, coverage on new code under 80%, or duplication on new code over 3% |
| CodeQL on the PR | A new high or critical alert |
| Review | No approval from the component's CODEOWNER, or the branch is behind `main` |

These are required status checks in a ruleset on `main`, with stale approvals dismissed on new pushes,
so nothing reaches the build-once step without passing them. The weekly full CodeQL scan is the one
check that only reports, since it runs on `main` rather than on a PR; its findings become issues.

## Static analysis and security scanning
{: #static-analysis-and-security-scanning }

- **SonarQube** per component, with its own project key, for code quality, coverage and Python
  security rules.
- **CodeQL** through a reusable workflow, configured with a projects file, on changes and as a weekly
  full scan.
- **Image scanning** is in place: the CI build job calls the shared Docker and JFrog workflow with
  `xray_scan: true`, so JFrog Xray scans every built image, and the release workflow sets it again
  when it publishes. PR previews set `xray_scan: false` to stay fast. What's left is an agreed
  severity threshold that fails the build,
  which is the bar the
  [pipeline analyzer](/posts/projects/state-of-devops/02-requirements-gathering/#functional-requirements)
  checks other repos against.

## Artifact and container management
{: #artifact-and-container-management }

| Artifact | Where | Tags |
|---|---|---|
| Container images | JFrog Artifactory | `<short-sha>` on every build, `:latest` on `main`, `vX.Y.Z` on release |
| Helm charts | JFrog (chart repo) | Chart version = release version |
| Local images | k3d registry (`localhost:5000/k8cron/…`) | `:latest` |

The JFrog step that re-tags an image for a release (`jf rt docker-promote`) authenticates with
GitHub OIDC, so no long-lived JFrog credential is stored in the repo for releases. Image tags per
component are tracked in `versions.yaml`, which is the single manifest of "what version is what".

## Deployment automation
{: #deployment-automation }

Deployment is GitOps with two repositories: this one (code, Dockerfiles, charts, workflows,
`versions.yaml`) and a GitOps apps repository that ArgoCD watches.

```text
merge versions.yaml bump
  └▶ auto-release.yaml ─▶ release.yaml (per bumped service)
        retag-image     <service>:<sha> ─▶ <service>:vX.Y.Z      (no rebuild)
        publish-chart   chart <service> @ X.Y.Z
        github-release  tag <service>-vX.Y.Z + GitHub Release
        open-dev-pr     promotion PR in the apps repo (dev)  ─▶ merge ─▶ ArgoCD syncs dev

make promote SERVICE=<svc> VERSION=vX.Y.Z   (approve the production environment)
  └▶ promotion PR in the apps repo (prod) ─▶ merge ─▶ ArgoCD syncs prod
```

Starting a release is one action: approve the post-merge `release` prompt (patch bump), run the
"Version Bump" workflow from the Actions tab, or `make release SERVICE=<svc> [BUMP=minor]`. For quick
iteration in the cloud, `task dev-pause` / `task dev-push` short-circuit the loop for one app and resume
ArgoCD sync afterwards.

## Database deployment strategy
{: #database-deployment-strategy }

There's no database to migrate. The equivalent concern is **output format changes**: when a new
analyzer version changes its JSON shape, readers (dashboard, trends, summary) must handle both shapes
before the analyzer is released, because history keeps the old shape forever. The safe order is:

1. Release readers that accept both the old and new shapes (keyed on the version in `metadata.json`).
2. Release the analyzer that writes the new shape.
3. Leave the old-shape support in place for as long as old files are read.

Redis needs no migration: cache keys include the date, and a flush only costs a slower first request.

## Approval gates
{: #approval-gates }

Gates use GitHub environments with required reviewers:

| Environment | Gates | Expiry |
|---|---|---|
| `development` | PR preview deploy to the development cluster | 15-minute watchdog cancels the run |
| `release` | Post-merge "create a patch release?" prompt | 15 minutes; ignore it to release later |
| `production` | `promote.yaml`, the prod promotion | Until approved |

Plus the ordinary gates: branch protection on `main` (the only guard on the build-once step) and the
review of each promotion PR in the apps repository.

## Versioning and release notes
{: #versioning-and-release-notes }

Each service has its own semantic version in `versions.yaml`; shared charts (`cronjob-shared-infra`)
are versioned through their own `Chart.yaml`. A release creates a `<service>-vX.Y.Z` tag on the source
commit and a GitHub Release.

For this project, release notes have a second audience besides engineers: anyone who reads the trend
charts. Any release that changes **what is measured** (a new check, a threshold, a parsing fix) should
say so in plain words, with the date it takes effect, so a jump on the chart isn't mistaken for progress.

## Rollback and roll-forward procedures
{: #rollback-and-roll-forward-procedures }

Because images are immutable and every release is a tag, rollback is a promotion of the previous
version:

```bash
make promote SERVICE=devops-repo-analyzer VERSION=v1.0.0   # previous good version
```

ArgoCD syncs it, and the next scheduled run uses it. For a bad *run* rather than a bad release, roll
forward on data: fix the analyzer, then re-run it for the affected day; since outputs are idempotent per
date, the rerun overwrites the bad folder. Bad numbers already shown to people need a note on the
dashboard, not just a fix.

## Release calendar
{: #release-calendar }

There's no fixed release train, and a project like this doesn't need one. Two windows matter instead:

- **Don't promote analyzers during the nightly run window** (02:00 to 07:00 UTC), or a job can start
  on one version and its dependants on another.
- **Freeze measurement changes before audits and executive reviews**, so the numbers people are about
  to discuss don't move for reasons unrelated to the work.

> **TODO:** Are there recurring dates to freeze around (quarterly business reviews, audit fieldwork)?
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] Only changed components are built; a forced full build is available
- [ ] Failing tests and quality gates block the merge
- [ ] Xray image scan fails the build on an agreed severity
- [ ] Releases re-tag the tested image; nothing is rebuilt after merge
- [ ] Production promotion requires an approved `production` environment
- [ ] Release notes call out every change to what is measured
- [ ] Rollback by promoting the previous version rehearsed once
- [ ] No promotions inside the 02:00-07:00 UTC run window

{% include project-nav.html %}
