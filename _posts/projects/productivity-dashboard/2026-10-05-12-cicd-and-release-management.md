---
layout: post
title: "Productivity Dashboard: CI/CD and Release Management"
date: 2026-10-05 00:12:00 +0530
categories: [projects, productivity-dashboard]
tags: [Projects, Productivity Dashboard, CICD, Release]
description: "Shipping the Productivity Dashboard: change-detected builds, SonarQube and CodeQL, build-once re-tag releases, ArgoCD promotion, and why a prompt change is a release."
project: productivity-dashboard
project_step: 12
image:
  path: /assets/img/projects/productivity-dashboard/12-cicd-and-release-management.webp
  alt: "Productivity Dashboard: CI/CD and Release Management - Projects hero image"
---

In the Productivity Dashboard, prompts ship inside the generator images. That makes a one-word change
to a prompt a full release: a new image, a version bump, a promotion through ArgoCD. It sounds heavy
for a text edit, and it's exactly right, because that one word changes what the system writes about
every person the next morning.

<!-- more -->

{% include project-nav.html %}

## Build automation
{: #build-automation }

The repo's CI workflow detects which components changed and builds only those: each of the
`prod-*` collectors and generators and `productivity-ui` has its own image and chart. Images are built
through a reusable JFrog Docker workflow and tagged with the 7-character Git SHA, plus `:latest` on
`main`. The UI image is a multi-stage build: Node builds the Vite frontend, then the Python image serves
it from FastAPI on port 9000.

## Automated test execution
{: #automated-test-execution }

Tests run per component in the SonarQube job, so coverage shows in the quality gate. For this project
the suites that should run on every PR are the unit and contract tests, and, for any change under a
`prompts/` folder or to `BaseAIClient`, the golden-week regression checks against a model (see
[Quality Assurance](/posts/projects/productivity-dashboard/10-quality-assurance/#regression-testing)).

> **TODO:** Do failing tests or the SonarQube quality gate block merges today?
{: .prompt-warning }

## Static analysis and security scanning
{: #static-analysis-and-security-scanning }

SonarQube per component and CodeQL (on changes and a weekly full scan) cover the code. Two additions
fit this project: an image scan before push, and a simple check in CI that fails when a collector's
field list changes without the data-scope page changing in the same PR.

## Artifact and container management
{: #artifact-and-container-management }

| Artifact | Tags |
|---|---|
| Images in JFrog | `<short-sha>`, `:latest` on `main`, `vX.Y.Z` on release |
| Helm charts | Chart version = release version |
| `versions.yaml` | One entry per component (all eight productivity components) |

Because prompts are inside images, the image tag is also the prompt version, which makes "which prompt
wrote this summary?" answerable if the generator records its version alongside each summary.

## Deployment automation
{: #deployment-automation }

The release flow is **build once, deploy by re-tagging**:

```text
merge to main            -> CI builds <component>:<sha> once
bump versions.yaml (PR)  -> release workflow re-tags <sha> as vX.Y.Z (no rebuild),
                            publishes the chart, creates a GitHub Release,
                            opens a dev promotion PR in the GitOps repo -> ArgoCD syncs dev
make promote SERVICE=prod-user-summary-generator VERSION=vX.Y.Z
                         -> approve the production environment -> prod promotion PR -> ArgoCD syncs prod
```

For fast cloud iteration, `task dev-pause` and `task dev-push` short-circuit the loop for one app.

## Database deployment strategy
{: #database-deployment-strategy }

No database. The equivalents:

- **Summary format changes** (new sections, renamed headings): the UI renders any Markdown, so they're
  safe, but search, export and anything parsing summaries should be checked.
- **Collector shape changes**: release generators that accept both shapes before the collector that
  writes the new one.
- **Redis**: a cache; `POST /api/cache/clear` after a release that changes response shapes.

## Approval gates
{: #approval-gates }

GitHub environments with required reviewers gate the post-merge release prompt and production
promotion; branch protection guards `main`; promotion PRs are reviewed in the GitOps repo. One gate I'd
add for this project: **prompt changes need approval from someone outside engineering**, such as a
manager who reads the summaries, because they're product changes as much as code changes.

## Versioning and release notes
{: #versioning-and-release-notes }

Each component has a semantic version in `versions.yaml`, and each release has a tag and GitHub Release.
For generators, release notes should say in plain words what will read differently ("weekly summaries
now group by epic"), with a sample, and go to the people who read summaries, not only to engineers.

## Rollback and roll-forward procedures
{: #rollback-and-roll-forward-procedures }

Rollback is promoting the previous version:

```bash
make promote SERVICE=prod-user-summary-generator VERSION=v1.0.0
```

For summaries already written by a bad version, roll forward: fix, release, then regenerate the
affected days with `TARGET_DATE` and `FORCE_REGENERATE`. If any of those summaries were already read or
exported for a review, tell the readers what changed.

## Release calendar
{: #release-calendar }

- No generator promotions during the nightly window (02:00 to 06:00 UTC).
- **Freeze prompt and model changes before performance review cycles**, so summaries used in reviews
  are written consistently for everyone being reviewed.
- Announce prompt changes a few days ahead to managers and executives.

> **TODO:** When are the review cycles, and is a freeze already practised around them?
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] Only changed components built; prompts ship in images
- [ ] Regression checks run on prompt and AI-client changes
- [ ] Image scan and a data-scope check in CI
- [ ] Generators record their version with each summary
- [ ] Prompt changes approved by a summary reader as well as an engineer
- [ ] Rollback by promoting the previous version, then regenerating affected days
- [ ] Freeze on prompt and model changes before review cycles

{% include project-nav.html %}
