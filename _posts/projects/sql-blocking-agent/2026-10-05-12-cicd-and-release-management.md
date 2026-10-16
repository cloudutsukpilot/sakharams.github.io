---
layout: post
title: "SQL Blocking Agent: CI/CD and Release Management"
date: 2026-10-05 00:12:00 +0530
categories: [projects, sql-blocking-agent]
tags: [Projects, SQL Blocking Agent, CICD, Release]
description: "SQL Blocking Agent CI/CD: shared build and Sonar workflows, JFrog images and charts, versions.yaml as the release record, PR previews and GitOps promotion."
project: sql-blocking-agent
project_step: 12
image:
  path: /assets/img/projects/sql-blocking-agent/12-cicd-and-release-management.webp
  alt: "SQL Blocking Agent: CI/CD and Release Management - Projects hero image"
---

The SQL Blocking Agent ships like any other platform service: an image and a Helm chart, built by shared
workflows, promoted through Git, synced by Argo CD. What's different is what a release can change. A new
prompt or gate threshold can change which sessions get killed, so the pipeline's job is not only "does it
build" but "does it still refuse the right things".

<!-- more -->

{% include project-nav.html %}

## Build automation
{: #build-automation }

`ci.yaml` ("CI - Build, Scan and Push") runs on pull requests and pushes to `main` that touch
`sql-blocking-agent/**`, and on demand. It uses the org's reusable workflows: detect changed Docker
components, build and push the image to JFrog, run SonarQube for Python, detect changed Helm charts and
package them. The Dockerfile installs ODBC Driver 18 and the locked Python dependencies.

## Automated test execution
{: #automated-test-execution }

The unit tests run in CI inside the shared SonarQube workflow, which executes them for coverage on every
pull request and `main` build that touches the component. Two things I'd still add: make that job a
required check on pull requests, so a failing gate test blocks the merge, and run the live kill harness in
a pre-release job with a disposable SQL Server container. The Temporal unit tests need no server and
already fit in the same run.

## Static analysis and security scanning
{: #static-analysis-and-security-scanning }

- **SonarQube** on the Python code, through the shared workflow, which also runs the unit tests for
  coverage (recent PRs resolved Sonar findings).
- **`ruff`** locally, with the repo's `ruff.toml`; worth adding to CI as its own check.
- **Image build and push** through the shared JFrog workflow in the "Build, Scan and Push" pipeline.
- **Helm**: `helm lint` and `helm template` with `values.schema.json` validation, which the Helm design
  record lists as required checks still to define.

One supply-chain note: the Sonar step references a reusable workflow by a feature branch name, and
others by `@main`. Pinning to tags or SHAs keeps CI from changing underneath the repo.

## Artifact and container management
{: #artifact-and-container-management }

| Artifact | Where | Versioned by |
|---|---|---|
| Container image | JFrog | Release version (the release workflow retags the tested image) |
| Helm chart | JFrog | Chart version, published with the release |
| Docs | Backstage TechDocs (Azure Blob publisher) | `techdocs.yml` on change |
| Per-environment version | `versions.yaml` in Git | development and production entries |

Retagging the already-built image at release, rather than rebuilding it, means the bytes that were
tested are the bytes that ship.

## Deployment automation
{: #deployment-automation }

From pull request to production, as the workflows implement it:

{% include flow-anim.html id="projects/sql-blocking-agent/cicd-pipeline" %}

The key properties: every environment change is a Git change (`versions.yaml` and environment values),
production promotion runs in a protected GitHub environment and opens a pull request rather than pushing,
and Argo CD is the only thing that changes the cluster.

## Database deployment strategy
{: #database-deployment-strategy }

The agent's databases are deployed separately from the agent, on purpose. The numbered scripts in `sql/`
are applied by the database team on the management server, ahead of the release that needs them. That
gives a simple ordering rule: **schema first, then code**, and every script additive or guarded so the
previous agent version keeps working against the new schema during the rollout. Script 07 (dropping the
`DryRun` column) is the kind that needs care, because older agent versions may still read it.

## Approval gates
{: #approval-gates }

| Gate | Where |
|---|---|
| PR review | GitHub, before merge |
| Replace an active PR preview in development | Promote workflow asks before replacing |
| Production promotion | Protected `production` GitHub environment |
| Production change itself | The `versions.yaml` pull request opened by the promote workflow |
| A real `KILL` | Human approval at run time, in every environment where `DRY_RUN=false` |

For changes to gates, prompts or the action path, I'd add one more: a database team approver on the PR,
enforced with CODEOWNERS.

## Versioning and release notes
{: #versioning-and-release-notes }

The release workflow bumps the development version (patch, minor or major), creates a release branch and
PR, retags the image, publishes the chart and creates a GitHub release. Versions are tracked per
environment in `versions.yaml`, which makes "what's running where" a one-file answer:

```yaml
components:
  sql-blocking-agent:
    development: "1.0.34"
    production: "1.0.6"
```

Release notes matter more than usual here. Each one should say, in plain words, whether the release
changes what the agent may decide or kill, so the database team knows which releases to look at closely.

## Rollback and roll-forward procedures
{: #rollback-and-roll-forward-procedures }

Three levers, from fastest to slowest:

1. **Kill switch:** set `DRY_RUN=true` in the environment values (or scale the deployment to zero) and
   let Argo CD sync. The agent keeps detecting and reporting but can't act. This is the first move for
   any doubt about decisions.
2. **Version rollback:** promote the previous version (a `versions.yaml` PR), or roll back the
   application in Argo CD.
3. **Roll forward:** fix, release, promote.

Schema changes are designed not to need rollback (additive first), which keeps lever 2 safe.

## Release calendar
{: #release-calendar }

Development releases are frequent and should stay that way. Production promotions should be deliberate:
I'd promote on a fixed cadence (every two weeks), only on working days when the database team is around,
and never on the same day as a change to `DRY_RUN`. Enabling real kills should be its own change, on its
own day, with nothing else in the release.

> **TODO:** Is there an agreed cadence for production promotions? Production has stayed on v1.0.6 while
> development moved to v1.0.34.
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] The Sonar job (which runs the tests) is a required check on PRs
- [ ] `ruff`, `helm lint` and `helm template` run in CI
- [ ] Reusable workflow references are pinned to tags or SHAs
- [ ] Release notes state whether decisions or kills are affected
- [ ] Database team is a required reviewer on safety-relevant paths
- [ ] The kill-switch procedure is written in the runbook
- [ ] A production promotion cadence is agreed

{% include project-nav.html %}
