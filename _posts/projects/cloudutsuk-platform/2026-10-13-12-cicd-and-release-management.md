---
layout: post
title: "Cloudutsuk Platform: CI/CD and Release Management"
date: 2026-10-13 00:12:00 +0530
categories: [projects, cloudutsuk-platform]
tags: [Projects, Cloudutsuk Platform, CICD, Release]
description: "How a commit reaches a pod on the DGX: ARC runners, gates that block the build, signed images in Zot, digest commits, Argo CD and Kyverno."
project: cloudutsuk-platform
project_step: 12
image:
  path: /assets/img/projects/cloudutsuk-platform/12-cicd-and-release-management.webp
  alt: "Cloudutsuk Platform: CI/CD and Release Management - Projects hero image"
---

A commit to a service on this platform reaches a running pod in about eight minutes, and nobody
touches anything along the way. A runner on the DGX tests it, scans it, builds it, signs it and
commits the new image digest to git. Argo CD notices, and Kyverno refuses the pod unless the image is
the one CI signed. This post is how that path works as built at the end of Phase 1 (2026-10-13), with
every gate on it. The one rule that shaped all of it: CI never gets a credential for a cluster. Git is
the only way to change what runs.

<!-- more -->

{% include project-nav.html %}

## Build automation
{: #build-automation }

Every change takes the same path. Tick *Simulate a failing scan* to see what happens when a gate
fails: nothing gets built, so nothing can be deployed. The nightly lane at the bottom is Phase 3a and
isn't built yet.

{% include flow-anim.html id="projects/cloudutsuk-platform/commit-to-deploy" %}

The pieces:

- **One reusable workflow.** `build-image.yaml` in `homelab-gitops` holds the gates, the build, the
  push, signing and the digest commit. A service's own workflow is about 40 lines: a `test` job, then
  a call to it with the image name, the Dockerfile and the folder in `homelab-gitops` to update.
- **Runners on the DGX.** Actions Runner Controller in the `platform` cluster runs the `homelab`
  scale set: up to three ephemeral arm64 runner pods, one job each, for the org's private repos only
  ([ADR 0019](/posts/projects/cloudutsuk-platform/architecture-decision-records/#adr-0019)). A second scale
  set, `homelab-iac`, belongs to `infra-local` alone and plans its Terraform.
- **Tools baked into the runner image.** Installing the ten scanners and signing tools in every job took 2 to 7.5 minutes,
  mostly waiting on GitHub's release CDN. Our own runner image carries them, pinned by checksum, and
  the step now takes under a second (lesson L046, ADR 0044).
- **One shared BuildKit.** A rootless BuildKit in `platform` keeps its layer cache between builds;
  runners reach it over the cluster network, and nothing else can.

Measured on 2026-10-13 for hello-world, from push to running pod:

| Stage | Time |
|---|---|
| Lint and unit tests (`test` job) | 13 s |
| Gates, build, image scan, push, signing (`build` job) | 51 to 54 s |
| Digest commit to `homelab-gitops` (`promote` job) | 12 s |
| Argo CD noticing the commit (3-minute poll plus jitter), syncing, smoke test | about 6 min |
| **Push to Healthy on the new SHA** | **8 min 25 s** |

Most of that is Argo CD's poll. A webhook would cut it to seconds, but it needs an inbound path from
GitHub, and nothing connects in here
([ADR 0008](/posts/projects/cloudutsuk-platform/architecture-decision-records/#adr-0008)). I'd rather wait.

## Automated test execution
{: #automated-test-execution }

Tests run in three places: before the build, after the deploy and, from Phase 3a, every night
against what's deployed. The matrix below is the testing half of
[ADR 0031](/posts/projects/cloudutsuk-platform/architecture-decision-records/#adr-0031), with what exists today.

| Test | Tool | When | Blocks | Status |
|---|---|---|---|---|
| Lint and format | Ruff | pre-commit, and every PR and `main` run | the build | Built (step 4c) |
| Unit tests | pytest | every PR and `main` run, before the image job | the build | Built (step 4c) |
| Policy unit tests | `conftest verify` | changes to the shared OPA rules | the check | Built |
| Dashboards and alert rules | `promtool check` and rule tests | changes to `dashboards/` or `alerts/` | the check | Built (Phase 2) |
| Smoke test | PostSync hook Job (curl) | every sync of the app | the sync | Built (step 6) |
| Integration | Testcontainers (Postgres, Redis, Qdrant) | every PR | the build | Phase 3, with the lab runner, the first service with a database |
| API contract | Schemathesis from each OpenAPI spec | every PR (fast), nightly (full) | the build | Phase 3a |
| User journeys | Playwright | nightly | opens an issue | Phase 3a |
| Load | Locust in a `perf` namespace | nightly | opens an issue | Phase 3a |
| Model and RAG quality | `vllm bench serve`, Phoenix evals | on change | the release | Phase 5 |

The unit tests arrived late. Writing this post, I found that hello-world had tests, but nothing in CI
ran them: the reusable workflow only ran the security gates. Step 4c added a `test` job that the image
job `needs`. In a throwaway pull request with a deliberately broken assertion, the job failed in
13 seconds and the image job never started.

The smoke test is a PostSync hook in the app's folder in `homelab-gitops`. hello-world's checks
`/readyz`, `/`, and that the running build reports a real commit SHA. A failing check fails Argo CD's
sync operation; a broken Service port, which left the Deployment Healthy, was caught that way in
step 6.

> **TODO:** Should a failed nightly run open a GitHub issue, page through Alertmanager, or both? It
> decides what "blocks" means for the Phase 3a rows above.
{: .prompt-warning }

## Static analysis and security scanning
{: #static-analysis-and-security-scanning }

Every run of `build-image.yaml`, pull requests included, runs these before anything is built. The
tools are pinned in `homelab-gitops/ci/tools`, the same versions on every runner.

| Check | Tool | Scope | Blocks on |
|---|---|---|---|
| Secrets | Gitleaks | the whole git history, every run | any finding |
| SAST | Semgrep CE (`p/default`) | the repo | HIGH or ERROR |
| Python SAST | Bandit | tracked `.py` files | HIGH |
| Dependencies | Trivy `fs` | lock files | HIGH or CRITICAL with a fixed version |
| IaC and Dockerfiles | Trivy `config` | manifests, Dockerfiles | HIGH or CRITICAL |
| IaC and workflows | Checkov | manifests, Dockerfiles, workflows | any failed check |
| House rules | Conftest (shared OPA rules) | the Dockerfile | any deny: unpinned base, root final user, `ADD` of a URL, `curl \| sh` |
| Dockerfile lint | Hadolint | the Dockerfile | error or warning |
| Image | Trivy image | the built image, before the push | HIGH or CRITICAL with a fix |
| SBOM | Syft | the built image | never; attested to the image |
| Licences | Trivy | the image | never; reported |

Exceptions live next to the code, in the caller's repo (`.gitleaksignore`, `# nosemgrep`, `# nosec`,
`.trivyignore`, `.checkov.yaml`, `.hadolint.yaml`), so a reviewer sees them in the diff. Results go to
a gate table in the job summary and a `security-reports-<image>` artifact for 30 days. I skipped PR
comments: they'd need write access to pull requests in every caller.

To check that the gates work, I pushed a deliberately bad commit (an unpinned base image, a root user
and `shell=True`). Six gates blocked it, and nothing was built.

The one gate that doesn't block is the image scan of our own runner image. The stock runner and the
newest scanner releases ship about 255 fixable HIGH or CRITICAL CVEs that only upstream can fix, so
that image reports them and builds anyway (ADR 0044). Every service image is gated.

Not built yet from [ADR 0032](/posts/projects/cloudutsuk-platform/architecture-decision-records/#adr-0032):
Renovate (GitHub's Dependabot alerts cover the gap for now), the nightly OWASP ZAP scan (Phase 3a),
and Trivy Operator for posture in each cluster.

## Artifact and container management
{: #artifact-and-container-management }

Every image lives in **Zot** in the `core` cluster (ADR 0034). Our images go under `platform/`; labs
will use `labs/`. Public images come through Zot's pull-through mirror: every node's containerd asks
Zot first, so a cluster never pulls straight from Docker Hub.

How an image gets there:

1. BuildKit writes an OCI layout to the runner instead of pushing. The scans run on that layout.
2. On `main` only, crane pushes those exact bytes and checks that the pushed digest equals the scanned
   one. What was scanned is what ships.
3. Cosign signs the digest and attests the CycloneDX SBOM. The key is a non-exportable transit key in
   OpenBao, and only `main` runs of the reusable workflow may use it (ADR 0033, ADR 0043). Signature
   and SBOM sit next to the image as OCI referrers.
4. Images are single arm64 manifests. BuildKit's provenance attestation would turn them into an index,
   and Kyverno resolves an index to linux/amd64, which we don't have (lesson L048).

Third-party images are pinned by digest everywhere: charts, add-ons, the runner image. One trap:
take the digest from the upstream registry, not from `kubectl get pod`. Zot converts Docker-format
manifest lists to OCI when it mirrors a tag, so the digest a pod reports can exist only in Zot
(lesson L052).

> **TODO:** How long should Zot keep old `platform/` images and their signatures? Nothing prunes them
> yet. A rollback needs the previous digest, so I'd keep at least the last 10 per image.
{: .prompt-warning }

## Deployment automation
{: #deployment-automation }

CI stops at git. The `promote` job mints a short-lived token for a GitHub App that can only write to
`homelab-gitops`, runs `kustomize edit set image` in the app's folder, commits, and revokes the token.
The commit message names the digest and the source commit:

```text
hello-world: deploy sha256:3b52ea5d99e2 from homelab-services@406ed1b
```

One central Argo CD in `platform` applies `homelab-gitops` to every cluster: an app-of-apps for the
cluster-specific apps, and ApplicationSets for the add-ons that every cluster labelled
`homelab/addons=true` gets. Every Application retries a failed sync with `refresh`, so a retry picks
up a fix commit instead of retrying the broken revision (lesson L049).

At admission, Kyverno denies a pod unless:

- its image is signed by CI and has a signed SBOM (`platform/*` and `labs/*`);
- every image comes from Zot or a registry it mirrors, has no `latest` tag, and public images are
  pinned by digest;
- the pod meets the restricted Pod Security Standard, has a read-only root filesystem, CPU and memory
  requests and a memory limit.

Four workloads have written exceptions: rootless BuildKit, the agent that reads node logs, Velero's
node agent and the runners' home directory. All seven policies have denied since step 5a (ADR 0033).

Infrastructure takes a different path. `infra-local` is Terraform through Terragrunt: a pull request
gets plans on the `homelab-iac` runners, and a merged pull request applies. A direct push to `main`
skips both, so it gets applied by hand from the DGX after reading the plan. Step 5a's Argo CD and
Velero changes went that way.

## Database deployment strategy
{: #database-deployment-strategy }

No deployed service has a database yet. hello-world owns no data; the first that does is the lab
runner in Phase 3, then inventory (Phase 4) and RAG (Phase 5). The ground rules are set already: each entity has
one writing service, and each service owns its schema in `platform-db` or `ai-db`
([ADR 0035](/posts/projects/cloudutsuk-platform/architecture-decision-records/#adr-0035)). Velero backs up
the database dumps nightly (ADR 0039).

What I'd do when the first schema lands:

- **Migrations as a PreSync hook.** The service's migration tool runs in an Argo CD PreSync Job with
  the new image, before the Deployment changes. A failed migration fails the sync, and the old pods
  keep serving.
- **Forward-only, expand then contract.** Add columns and tables in one release, start using them in
  the next, and drop the old ones a release later. Every image stays compatible with the schema before
  and after it, which is what makes a `git revert` of the image a safe rollback.
- **No down migrations in the rollback path.** If data has to go back, it comes from the last dump.

> **TODO:** Which migration tool: Alembic (SQLAlchemy) or plain SQL files with a small runner? It
> depends on whether the Phase 3 services use an ORM.
{: .prompt-warning }

## Approval gates
{: #approval-gates }

The honest version first: the repos are private on GitHub's free plan, which has no branch protection
and no required reviews for private repos. Nothing on GitHub stops a push to `main`. The gates hold
anyway, because each one sits where it can't be skipped:

| Gate | Enforced by | A direct push to `main`… |
|---|---|---|
| Tests and every scan | the `main` run itself: it repeats every PR check before it pushes | …still has to pass them before an image exists |
| Push to Zot and signing | OpenBao roles bound to `refs/heads/main` and to the reusable workflow's own path | …can't get the keys from any other workflow, or from a PR |
| Deploy | the writer App and Argo CD | …only deploys what's committed to `homelab-gitops` |
| Run | Kyverno at admission | …can't run an unsigned or non-compliant image, whatever git says |
| Infrastructure | `infra-local` applies only merged pull requests | …is applied by hand after reading the plan |

There's no human approval between a green `main` build and production, on purpose. It's a
one-operator platform, and the merge is the approval. The exceptions are the runner image, which
gets rolled out by hand because a broken one would stop the CI that could fix it (ADR 0044), and
infrastructure applies.

## Versioning and release notes
{: #versioning-and-release-notes }

A release here is a commit in `homelab-gitops`, so that repo's history is the release log. Each
digest commit says which image went out and which source commit built it. Each Application's history
in Argo CD shows when it reached the cluster.

- **Images** are tagged with the source commit SHA and deployed by digest. The tag is for people; the
  digest is what runs. The running service reports its commit at `/`, which the smoke test checks.
- **Charts and tools** are pinned to exact versions at least two weeks old, by digest or checksum. A
  bump is a commit with the version in its message.
- **Services** don't have semantic versions yet. Nothing outside the platform calls them, so a SHA is
  enough.

> **TODO:** Do you want generated release notes, for example a weekly summary of `homelab-gitops`
> digest commits grouped by app, or is the git log enough until the portal (Phase 3) can show it?
{: .prompt-warning }

## Rollback and roll-forward procedures
{: #rollback-and-roll-forward-procedures }

Argo CD can't roll back an app with automated sync, so the rollback is a commit
([ADR 0031](/posts/projects/cloudutsuk-platform/architecture-decision-records/#adr-0031) as built). Roll forward
is the default: fix the code, and the next green build deploys it. When that's slower than undoing:

| What broke | Roll back by | Takes |
|---|---|---|
| A service release | `git revert` of the digest commit in `homelab-gitops` | the next poll, about 3 to 6 minutes |
| A config or chart change in `homelab-gitops` | `git revert` of that commit | the same |
| The runner image | set the previous digest in `clusters/platform/arc-runner-homelab.yaml` | one sync |
| An `infra-local` release | revert, then plan and apply that stack | minutes |
| Data | restore the dump from Velero's backup (ADR 0039) | depends on size |

Two things make this work. Every Application retries with `refresh`, so after a failed sync the
revert is picked up on the next retry. Without it, Argo CD kept retrying the broken revision for up to
an hour (lesson L049). And deploys are by digest, so a revert returns exactly the bytes that ran
before, as long as Zot still has them.

The step 6 drill: a Service pointed at the wrong port left the Deployment Healthy, the smoke test
failed (`FAIL: GET /readyz`) and the sync failed. The revert synced about a minute after it was pushed.

## Release calendar
{: #release-calendar }

There's no release calendar: one operator, no users outside the homelab, and a deploy is a commit.
What exists is a few fixed times to avoid, and a cadence for bumps:

| When (IST) | What | Mind it because |
|---|---|---|
| Daily 02:00 | Velero nightly backups | don't restart stateful apps then |
| Sunday 02:30 | Velero weekly backups | the same |
| Sunday 11:30 | `infra-local` drift plan | a hand-applied change shows up as drift if it isn't in git |
| Two weeks after an upstream release | chart, tool and image bumps | the house rule for versions |
| When GitHub's next runner release is two weeks old | runner image rebuild and manual rollout | GitHub stops accepting old runner versions |

> **TODO:** Should Argo CD sync windows block syncs during the backup window, or is that too strict for
> a homelab?
{: .prompt-warning }

## Checklist
{: #checklist }

- [x] Every service builds through `build-image.yaml` on the `homelab` runners
- [x] Lint and unit tests run before the image job and block it
- [x] Gitleaks, Semgrep, Bandit, Trivy, Checkov, Conftest and Hadolint block the build
- [x] Images are scanned, pushed by digest, signed and SBOM-attested with the OpenBao transit key
- [x] CI's only path to a cluster is a digest commit by the writer App
- [x] Kyverno denies unsigned, unpinned or non-restricted pods on every cluster
- [x] A PostSync smoke test fails the sync, and a revert rolls back
- [ ] Integration tests with the lab runner, the first service with a database (Phase 3)
- [ ] Schemathesis, and nightly Playwright, ZAP and Locust against the deployed platform (Phase 3a)
- [ ] Renovate, image retention in Zot and a migration strategy for the first schema

{% include project-nav.html %}
