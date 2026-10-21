---
layout: post
title: "State of DevOps: Development Preparation"
date: 2026-10-05 00:08:00 +0530
categories: [projects, state-of-devops]
tags: [Projects, State of DevOps, Development, Workflow]
description: "Preparing the State of DevOps codebase: one monorepo, one folder shape per cronjob, a Taskfile for every operation, k3d locally and values files kept in sync."
project: state-of-devops
project_step: 8
image:
  path: /assets/img/projects/state-of-devops/08-development-preparation.webp
  alt: "State of DevOps: Development Preparation - Projects hero image"
---

The development setup for State of DevOps was built for a team of one, and it had to survive the
DevOps team joining 8 to 10 months later. The conventions that make that possible are simple. Every component has the same folder
shape, every operation is a `task`, and the whole platform runs on a laptop in k3d with the same Helm
charts as production. A new contributor learns one component and knows how all the others work.

<!-- more -->

{% include project-nav.html %}

## Repository and branching strategy
{: #repository-and-branching-strategy }

State of DevOps lives in a **monorepo** with one top-level folder per component, next to shared code
(`cronjobs/common/`), shared Helm charts (`cronjob-library/`, `cronjob-shared-infra/`), local cluster
setup (`k3d/`) and docs. The same repo also hosts a sibling productivity dashboard, which reuses the
same shared code.

A monorepo fits because the components change together more often than you'd expect: a change to
`github_api_client.py` affects every job. CI detects which components changed and builds only those,
so the monorepo doesn't cost build time.

Branching is short-lived feature branches off `main`, named after the Jira issue
(`<JIRA-KEY>-<number>-<short-description>`), merged by pull request. `main` is what CI tags `:latest`
and promotes.

> **TODO:** Which rulesets protect `main` (required reviews, required checks, linear history)? The
> repo should pass every check its own repo analyzer enforces.
{: .prompt-warning }

## Coding standards
{: #coding-standards }

The standards that matter most in this codebase are the ones that keep thirteen jobs consistent:

- **Use the shared clients.** GitHub calls go through `GitHubAPIClient` (rate limits, retries,
  GraphQL); storage through `FileShareStorageClient` and `analyzer_storage_client`, whose
  `format_date_path` builds the dated folders. A job that calls `requests.get` on GitHub directly is a review comment.
- **Config, not constants.** Thresholds, org lists, exemptions and toggles live in `config.yaml`.
- **Logging through `setup_logging`**, with the org and job name in every line.
- **Python type hints and Pydantic models** at the API boundary.
- SonarQube's Python rules in CI are the enforced baseline.

> **TODO:** Is a formatter or linter (ruff, black) enforced locally or in CI? If not, adding ruff with
> a pre-commit hook is a one-hour change that ends style discussions in review.
{: .prompt-warning }

## Project structure
{: #project-structure }

Every cronjob has the same shape:

```text
<component>/
├── Dockerfile
├── requirements.txt
├── config.yaml          # defaults; overridden by a ConfigMap in the cluster
├── helm/                # Chart.yaml, values.yaml, values-local.yaml, templates/
├── src/
│   └── main.py          # entrypoint
└── tests/
```

Each chart depends on the `cronjob-library` Helm library chart for the CronJob and ConfigMap templates,
so a component's `helm/` folder is mostly values. The dashboard follows the same idea with
`backend/`, `frontend/`, `helm/` and one `Dockerfile` that builds the React app and serves it from
FastAPI.

The payoff of a fixed shape is that scaffolding a new analyzer is a copy and a rename, which matters
for the [enterprise scorecard](/posts/projects/state-of-devops/03-product-planning/#product-roadmap) phase.

## Local development setup
{: #local-development-setup }

Two loops, for two kinds of change:

```bash
# Whole platform in a local cluster
task local-start
task build-state-of-devops-all
task import-state-of-devops-all
task state-of-devops-deploy-local
task port-forward-devops-state-dashboard    # http://127.0.0.1:8000

# Dashboard only, with hot reload
task local-development                      # backend :8000 (uvicorn --reload), frontend :3000
```

The frontend dev server is the Create React App one (`react-scripts start`), which proxies `/api` to
the backend through the `proxy` field in `package.json`. The docs carry a hard-won tip: always use
`127.0.0.1`, not `localhost`, because IPv6 resolution keeps causing failures. The CRA proxy is still
set to `http://localhost:8000`, so it's worth changing it to `127.0.0.1` to follow the project's own
advice.

To look at real data locally, the k3d server container exposes the share:

```bash
docker exec k3d-k8cron-cluster-server-0 ls /data/devops-state/
```

## Environment configuration
{: #environment-configuration }

Configuration has three layers, from least to most specific:

1. `config.yaml` baked into the image (defaults).
2. A ConfigMap from the chart's `configYaml` value, mounted over it in the cluster.
3. Environment variables for secrets and endpoints: `GITHUB_APP_<ORG_SLUG>_APP_ID` /
   `_PRIVATE_KEY` / `_INSTALLATION_ID`, `GITHUB_TOKEN` (fallback), `AZURE_STORAGE_ACCOUNT_NAME`,
   `JFROG_URL` and `JFROG_ACCESS_TOKEN`, `STORAGE_PATH`, `CONFIG_PATH`.

Per environment, each chart has `values.yaml` (AKS) and `values-local.yaml` (k3d). The rule is that a
change to one is reflected in the other, except deliberately cloud-only fields such as ingress hosts and
Workload Identity client IDs. Drift between the two is a classic source of "works locally".

## Dependency management
{: #dependency-management }

- Python dependencies are pinned per component in `requirements.txt`, so one job's upgrade can't
  break another.
- The frontend has `package.json` plus a lockfile.
- Image tags per component are recorded in `versions.yaml`; chart versions in each `Chart.yaml`.

Per-component pinning has a cost: a security fix in `requests` or `urllib3` has to be applied in
thirteen files. Dependabot grouped updates (one PR per ecosystem per week) handle that well.

## Feature flags
{: #feature-flags }

The dashboard has one simple, effective flag system: `GET /api/sidebar-config` tells the frontend which
tabs to render. A new analyzer's tab can ship to production hidden, be switched on once its data has
been checked, and be switched off again if its numbers look wrong, all without a frontend release.

On the job side, the flags are `config.yaml` toggles, for example turning code scanning, secret scanning
or Dependabot on or off in the GHAS analyzer. That's enough; a feature-flag service would be overkill
for this project.

## Documentation standards
{: #documentation-standards }

The docs live in the repo, next to the code, and are built with MkDocs. The State of DevOps section has
one page per concern: README (30-second tour), architecture, cronjobs, deployment, storage, UI and tech
stack. Each table links to the source path it describes, so a reader can check any claim against code.

Two standards I'd keep: a cronjob isn't done until its row in `cronjobs.md` (schedule, reads, writes,
env) exists, and docs are updated in the same PR as the behaviour. The CRA-vs-Vite mismatch that
existed in the docs is exactly what happens otherwise.

The repo also carries instructions for AI coding agents (`AGENTS.md`, Copilot instructions, prompts and
skills under `.github/`), which act as executable documentation for repetitive tasks such as release
versioning.

## Development workflow and code review process
{: #development-workflow-and-code-review-process }

1. Create a branch named after the Jira issue.
2. Develop against k3d (`task state-of-devops-<component>` builds, imports and deploys one component).
3. Open a PR; CI builds changed components, runs SonarQube, and CodeQL.
4. Review by a code owner (the repo has a `CODEOWNERS` file).
5. Merge to `main`; CI pushes images to JFrog; the chart is promoted and ArgoCD syncs to AKS.

For review, the checklist I'd pin to the PR template: uses shared clients, config not constants, tests
for new checks with a fixture repo, `values.yaml` and `values-local.yaml` in sync, docs updated.

## Checklist
{: #checklist }

- [ ] Every component follows the standard folder shape and uses `cronjob-library`
- [ ] Every operation available as a `task`; nobody needs raw `docker`, `helm` or `kubectl`
- [ ] CRA proxy switched to `127.0.0.1:8000`
- [ ] Linter and formatter enforced with pre-commit and in CI
- [ ] `values.yaml` / `values-local.yaml` drift check in review
- [ ] Dependabot grouped updates on for pip, npm and Docker
- [ ] PR template with the review checklist; CODEOWNERS covers every component

{% include project-nav.html %}
