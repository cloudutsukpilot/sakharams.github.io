---
layout: post
title: "Job Hunter Agent: CI/CD and Release Management"
date: 2026-10-22 00:12:00 +0530
categories: [projects, job-hunter-agent]
tags: [Projects, Job Hunter Agent, CICD, Release]
description: "Every push to Job Hunter Agent is tested; every push to main is scanned by seven gates, signed, pinned by digest and rolled out by Argo CD without a manual step."
project: job-hunter-agent
project_step: 12
image:
  path: /assets/img/projects/job-hunter-agent/12-cicd-and-release-management.webp
  alt: "Job Hunter Agent: CI/CD and Release Management - Projects hero image"
---

A one-person project could get away with `docker build && kubectl apply`. Job Hunter Agent goes through
the same pipeline as everything else on the homelab platform instead, because the platform refuses
unsigned images, and because the pipeline costs nothing to reuse: one `uses:` line in the repo's CI.

<!-- more -->

{% include project-nav.html %}

## Build automation
{: #build-automation }

Step through it, and tick the box to see a failing gate:

{% include flow-anim.html id="projects/job-hunter-agent/cicd-pipeline" %}

The repo's `ci.yaml` has four jobs: `test`, `supabase`, `docker` on GitHub-hosted runners, and `image`,
which calls homelab-gitops' reusable `build-image.yaml` on the homelab runner. `image` runs only on
`main` (never for pull requests) and only when the repo variable `HOMELAB_DEPLOY` is `true`. A
`workflow_dispatch` trigger allows a manual rebuild.

## Automated test execution
{: #automated-test-execution }

`test` runs `pytest` and `ruff`; `supabase` starts a local Supabase, applies every migration and runs the
integration test; `docker` checks the Dockerfile still builds. The image job `needs` the test and
Supabase jobs, so either one red stops the release. See
[Quality Assurance](/posts/projects/job-hunter-agent/10-quality-assurance/#unit-testing).

## Static analysis and security scanning
{: #static-analysis-and-security-scanning }

| Gate | Looks at |
|---|---|
| Gitleaks | Secrets in the full git history |
| Semgrep | SAST rules |
| Bandit | Python-specific issues |
| Trivy | Dependencies, Dockerfiles and IaC, then the built image |
| Checkov | IaC, Dockerfiles and workflows |
| Conftest | The platform's own policies (for example, base images pinned by digest) |
| Hadolint | Dockerfile style and pitfalls |

Two Gitleaks hits were false positives (a variable name, then the ignore file's own comment). Both are
suppressed by fingerprint in `.gitleaksignore`, so the rule still catches real secrets.

## Artifact and container management
{: #artifact-and-container-management }

- Base images pinned by digest (`python:3.12-slim@sha256:…`, `uv` copied from a pinned image).
- `uv sync --frozen --no-dev`, runs as UID 10001, no writes needed (read-only root filesystem).
- Pushed to Zot as `platform/job-hunter-agent`; a CycloneDX SBOM from Syft is attested next to it.
- Signed with cosign using a key held in OpenBao's transit engine; Kyverno verifies signatures for
  `platform/*` images.

## Deployment automation
{: #deployment-automation }

The image job's last step commits the new digest to `apps/job-hunter/kustomization.yaml` in
homelab-gitops (through a GitHub App, not a personal token) and calls Argo CD's webhook so it syncs at
once. The Deployment uses `Recreate`: the old pod stops before the new one starts, because only one
Chromium may hold the LinkedIn profile.

## Database deployment strategy
{: #database-deployment-strategy }

Schema changes don't deploy themselves. The rule:

1. Write an additive migration (`add column if not exists … default …`) so the running image still works.
2. Open a PR; CI applies it to a fresh Supabase.
3. Paste it into the Supabase SQL editor.
4. Merge; the image deploys and starts using the new columns.

Skipping step 3 once meant profile saves failed until the column existed, which is why the order is
written down.

## Approval gates
{: #approval-gates }

There's no human approval between `main` and production for app code; the gates are automated. Human
gates exist where they matter: merging PRs in homelab-gitops and infra-local, applying migrations, and,
in the product itself, approving every application.

## Versioning and release notes
{: #versioning-and-release-notes }

The image digest is the version; the homelab-gitops commit that promoted it is the release record, and
its message names the job-hunter-agent commit. Release notes are the commit messages, written to say what
changed and why. The app reports `version` 0.2.0 in its OpenAPI document, which nobody bumps.

No semantic version tags, the same as every other app on the platform. The build workflow tags each image
with its commit SHA and deploys it by digest; the homelab-gitops commit that promotes it is the release
record. A version number nobody bumps would add nothing.

## Rollback and roll-forward procedures
{: #rollback-and-roll-forward-procedures }

- **Roll back:** revert the digest commit in homelab-gitops; Argo CD syncs the previous image. Because
  migrations are additive, the old image runs against the new schema.
- **Roll forward:** fix on `main`; the pipeline promotes the new digest in a few minutes.
- **LinkedIn session:** unaffected either way; it lives on the volume, not in the image.

```bash
git -C homelab-gitops revert <promote-commit> && git -C homelab-gitops push
kubectl --context k3d-platform -n job-hunter rollout status deploy/job-hunter
```

## Release calendar
{: #release-calendar }

No calendar; releases happen when something's ready. One soft rule: don't deploy close to a profile's
scheduled time (08:00, 12:00, 16:00 IST on weekdays), because `Recreate` restarts the pod and a run in
progress would stop. The scheduler keeps its jobs in memory, so a run that was due during the restart
is skipped until that profile's next slot.

## Checklist
{: #checklist }

- [ ] Image job runs only on main and only with `HOMELAB_DEPLOY`
- [ ] All seven gates green; suppressions only by fingerprint
- [ ] Rollback by reverting the digest commit tried once
- [ ] Migrations applied before merge, every time
- [ ] No deploys within 15 minutes of a scheduled run
- [x] Decide on version tags (no: digests, like every other platform app)

{% include project-nav.html %}
