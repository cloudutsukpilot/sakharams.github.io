---
layout: post
title: "Productivity Dashboard: Development Preparation"
date: 2026-10-05 00:08:00 +0530
categories: [projects, productivity-dashboard]
tags: [Projects, Productivity Dashboard, Development, Workflow]
description: "Setting up to build the Productivity Dashboard: one folder shape per job plus prompts, k3d, a free local LLM through LM Studio, and configuration-driven people and teams."
project: productivity-dashboard
project_step: 8
image:
  path: /assets/img/projects/productivity-dashboard/08-development-preparation.webp
  alt: "Productivity Dashboard: Development Preparation - Projects hero image"
---

The most useful piece of development setup on this project costs nothing: a local LLM. Generators talk
to AI through one client that can point at Azure OpenAI, OpenAI or LM Studio, so on a laptop the whole
pipeline runs against a local model with no API key and no bill. Prompt iteration (the work that
matters most in this project) becomes free and fast. The rest of the setup is the discipline a team needs to
take over after five months of solo work: one folder shape, one Taskfile, one cluster
that runs on a laptop.

<!-- more -->

{% include project-nav.html %}

## Repository and branching strategy
{: #repository-and-branching-strategy }

The project lives in a monorepo that also hosts other cronjob-based tools, sharing a library of clients
in `cronjobs/common/` (GitHub, Jira, storage, AI, paths). Each component is a top-level folder:
`prod-github-collector/`, `prod-jira-collector/`, `prod-epic-data-collector/`, the four `prod-*-summary-generator/`
folders and `productivity-ui/`, plus `productivity-shared-infra/` for shared cluster resources.

One quirk to know on day one: the generator and collector source (including `prompts/`) exists twice,
in the top-level `prod-*/` folders and under `productivity-tools/cronjobs/<name>/`, and the Dockerfiles
copy from `productivity-tools/`. The two trees are identical today, but an edit to the wrong copy never
reaches an image. Picking one source of truth (and deleting the other) is a small change that removes a
whole class of "my prompt change didn't do anything" confusion.

Branches are short-lived and named after the Jira issue, merged to `main` by pull request. CI builds
only the components a change touches.

## Coding standards
{: #coding-standards }

- Use the shared clients: `GitHubAPIClient`, `JiraAPIClient`, `BaseAIClient`,
  `FileShareStorageClient`, and `path_utils` for every path.
- Configuration, not constants: people, teams, PODs, schedules and field lists live in config.
- **Prompts are code**: they live in `prompts/`, change by pull request, and are reviewed with sample
  output (see below).
- Type hints and Pydantic models at the API boundary (`backend/models.py`).
- SonarQube's rules in CI as the enforced baseline.

## Project structure
{: #project-structure }

```text
<component>/
├── Dockerfile
├── requirements.txt
├── config.yaml or src/config.py   # defaults
├── src/main.py                    # entrypoint
├── prompts/                       # generators only: daily/weekly/monthly .txt or Jinja2 .j2
├── helm/                          # CronJob chart (values, configYaml)
└── tests/
```

`productivity-ui/` has `backend/` (FastAPI services: storage, search, refresh, cache), `frontend/`
(Vite, Tailwind), `helm/` and a single multi-stage `Dockerfile`.

> **TODO:** The repo docs still say the `prod-*` cronjobs have no in-tree `helm/` folder and call the
> POD generator `pod-summary-generator`; the repo now has charts for every component and
> `prod-pod-summary-generator`. Worth updating the docs.
{: .prompt-warning }

## Local development setup
{: #local-development-setup }

```bash
# Whole stack in k3d
task k3d-create
task productivity-build-all
task productivity-import-all
task productivity-deploy-local
task port-forward-productivity-ui          # http://127.0.0.1:9000

# UI only, with hot reload
cd productivity-ui/backend  && uvicorn main:app --reload --host 0.0.0.0 --port 9000
cd productivity-ui/frontend && npm install && npm run dev     # Vite on :5173
```

For a generator, run `src/main.py` directly with `PYTHONPATH` including `cronjobs/common`, and the AI
provider set to LM Studio:

```bash
export ai_provider=lmstudio
export LMSTUDIO_ENDPOINT=http://127.0.0.1:1234        # host.k3d.internal:1234 from inside k3d
export TARGET_USER="Engineer A" TARGET_DATE=2026-10-01 FORCE_REGENERATE=true
python src/main.py
```

Use `127.0.0.1` rather than `localhost` everywhere; the repo docs call IPv6 resolution a recurring
papercut. For local models in general, see
[Running LLMs on a home PC](/posts/homelab/local-llms-on-homepc/).

## Environment configuration
{: #environment-configuration }

Three kinds of configuration:

1. **People and teams**, as environment variable tuples on each job:
   ```text
   department_0=<dept>    team_0_0=DevOps    name_0_0_0=Engineer A
   github_username_0_0_0=<github-login>      jira_email_0_0_0=<jira-email>
   ```
2. **UI behaviour**, in the UI chart's `config` block, rendered to a ConfigMap and read through
   `GET /api/config`: `visible_views`, `visible_teams` (for example `DevOps, SRE, CNS`), `period_tabs`,
   the POD list and the generator schedules.
3. **Providers and secrets**: `ai_provider` plus provider keys; GitHub App and Jira credentials from
   Key Vault.

Each chart has `values.yaml` (AKS) and `values-local.yaml` (k3d); any new key in one must appear in the
other.

## Dependency management
{: #dependency-management }

Python dependencies are pinned per component; the frontend uses `package.json` with a committed
lockfile; image versions are in `versions.yaml`. Dependabot grouped updates keep the per-component pins
from turning into a dozen separate PRs.

## Feature flags
{: #feature-flags }

The ConfigMap is the flag system. `visible_views` turns user, team, epic or POD pages on and off;
`visible_teams` controls which teams appear; `period_tabs` controls which periods show. A new view can
be deployed hidden and switched on once its summaries have been checked, with no frontend release.

For prompts, the equivalent of a flag is a second template: run old and new prompts side by side on the
same days and compare before switching.

## Documentation standards
{: #documentation-standards }

Docs live in the repo (MkDocs) with one page per concern: README, architecture, cronjobs, deployment,
storage, UI and tech stack, each linking to source paths. Two additions specific to this project:

- A **prompt changelog**: what changed in each prompt and why, with a before/after sample.
- A **data scope page**: exactly which fields are collected from GitHub and Jira, kept in sync with the
  collector configs. This is the page HR and privacy will ask for.

## Development workflow and code review process
{: #development-workflow-and-code-review-process }

1. Branch from `main`, named after the Jira issue.
2. Iterate locally with LM Studio; test in k3d.
3. Open a PR; CI builds changed components and runs SonarQube and CodeQL.
4. Review by a code owner. For prompt changes, the PR includes old and new output for the same
   sample days.
5. Merge; release by bumping `versions.yaml`; ArgoCD promotes.

## Checklist
{: #checklist }

- [ ] LM Studio set up for local generator runs
- [ ] Every component follows the folder shape, including `prompts/` for generators
- [ ] People, teams and PODs only in configuration
- [ ] Prompt changes reviewed with before/after samples
- [ ] Data scope page kept in sync with collector configs
- [ ] Docs updated for charts and the POD generator name
- [ ] `values.yaml` and `values-local.yaml` in sync

{% include project-nav.html %}
