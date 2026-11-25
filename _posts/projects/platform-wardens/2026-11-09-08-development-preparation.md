---
layout: post
title: "Platform Wardens: Development Preparation"
date: 2026-11-09 00:08:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Development, Workflow]
description: "One repository per agent on a versioned wardens library, a copier template, lint and import rules in CI, and design docs that drive the code in Platform Wardens."
project: platform-wardens
project_step: 8
image:
  path: /assets/img/projects/platform-wardens/08-development-preparation.webp
  alt: "Platform Wardens: Development Preparation - Projects hero image"
---

Platform Wardens started as one repo holding the standards, the framework and every agent. Since
2026-11-19 it's several: platform-wardens keeps the standards, the `wardens` library and the services,
each agent lives in its own `warden-<agent>` repository pinned to a released `wardens`, and
wardens-deploy holds the registry of published agents. Getting ready to develop here means knowing which
repo a change belongs in, the import rules CI now enforces, and reading the conformance matrix before you
touch a module.

<!-- more -->

{% include project-nav.html %}

## Repository and branching strategy
{: #repository-and-branching-strategy }

Decision [0040](/posts/projects/platform-wardens/architecture-decision-records/#adr-0040) split the
monorepo: every agent moved to its own repository and imports `wardens` as a versioned library. The
framework enforces the platform's practices through the library, a check command, a reusable CI workflow
and a template, instead of a shared folder tree.

```text
platform-wardens/            standards, the wardens library, the services
├── docs/                    design categories, decisions (one log for everything), plans, runbooks
├── framework/               the wardens package: contracts and default config ship inside it; CHANGELOG
├── services/                wardens-services: router worker, console, webhooks, ingress
├── mcp-servers/mcp-guard
├── copier.yml, templates/agent/   the agent template
└── diagrams/

warden-<agent>/              one per agent, rendered from the template (six today)
wardens-deploy/              registry/<agent>/<version>/ and the deploy config that names agents
homelab-gitops/              the wardens-agent chart, apps/<agent>, the reusable agent-ci workflow
```

Branching is short-lived branches and a pull request to `main` everywhere. In an agent repo the rule is
explicit in its `CLAUDE.md`: never commit to `main`, because a `main` run publishes the image. Each agent
repo's first commit names the platform-wardens commit it came from, and the README's "Where the agents
went" table gives the last monorepo commit that still had each agent, so older history stays one
`git show` away.

## Coding standards
{: #coding-standards }

The rules are written down in `docs/reference/python-standards.md` (decision 0040 rule 10), and since
the hardening phase most of them fail CI rather than waiting for review:

| Rule | Why | Enforced by |
|---|---|---|
| Agents import only names in a subpackage's `__all__` | The public API is what semantic versioning covers | import-linter, a public-API test |
| Only `wardens.durable` imports `temporalio`; only `wardens.llm` builds a model | Workflow code stays deterministic; one place for model auth, validation and cost | `lint-imports` (layer contracts) |
| Agents never import `pydantic_ai`, `httpx` or `wardens_services`; HTTP goes through `wardens.clients` | Agents stay on the SDK surface | Ruff's banned APIs in the template |
| `workflow.py`: no I/O, clock, randomness or model calls | It runs as Temporal workflow code and is replayed | Review, replay tests |
| `worker.py`: no I/O at import | The Temporal sandbox re-imports it | Review |
| Acts are deterministic stages the binding guards, never model-callable tools | Autonomy enforced in code | The binding, `check-agent` |
| A value in angle brackets is unset: skip or refuse, never guess | No silent defaults | `WorkerSettings` |

Ruff (check and format), pyright (strict for `framework/src/wardens`) and `lint-imports` all fail the
pull request. Ruff's baseline of per-file ignores only shrinks: fixing a file drops its entry, and new code
never gets one. Python 3.12 and Pydantic for every typed boundary.

## Project structure
{: #project-structure }

Every agent repository is rendered from the copier template, so they all share one anatomy:

| Path | Holds |
|---|---|
| `manifest.yaml` | The source of truth: purpose, `neverDoes`, owner and reviewer, stage, identity, capabilities, schedules, tools, action catalog |
| `src/<pkg>/workflow.py`, `worker.py`, `activities.py`, `entrypoint.py` | Deterministic wiring, the Temporal binding, the I/O, the contract boundary |
| `stages/`, `tools/`, `policies/` | Domain logic, read and act tools, the agent's own gates; prompts sit next to stages as `*.prompt.md` |
| `schemas/`, `samples/`, `config/` | Input schemas, console requests, data the policies read |
| `evals/`, `gates/` | Eval cases (and `evals/accepted.json`), evidence for each lifecycle gate |
| `docs/` | A fixed set: design, model card, evaluation, data, threat model, runbook, why-an-agent, ROI, retirement, and `agent-card.md`, generated from the manifest |
| `README.md`, `CHANGELOG.md`, `CLAUDE.md` | The header restates the manifest; every change adds a changelog line |
| `Dockerfile`, `Makefile`, `apt-packages.txt`, `.copier-answers.yml`, `.github/` | Template-owned build and CI; the agent owns only its OS package list |

The split between agent-owned and template-owned files matters: tooling config, the Dockerfile, the
Makefile and CI arrive by `copier update` inside a `wardens bump` pull request, so a local edit there
conflicts with the next update. terraform-drift is still the reference for the whole path.

## Local development setup
{: #local-development-setup }

In platform-wardens:

```bash
set -a; source ~/.config/homelab/nexus.env; set +a        # packages come through the homelab Nexus proxy
uv sync                                                    # one .venv: framework, services, mcp-guard
uv run --directory framework pytest -q -m "not temporal"   # about 8 seconds without the Temporal tests
uv run --directory services pytest -q
uv run python -m wardens_services.console.app --dev-server # console :8765, Temporal :7233, UI :8233
```

In an agent repository:

```bash
make wheels          # the signed wardens wheel from Zot into .wheels/ (needs docker login)
uv sync --frozen
make check           # ruff, lint-imports, pyright, check-agent, the agent card, unit tests, eval gate
```

`make check` runs the same steps as the agent's CI, in the same order, so a green local run is a good
predictor. Without `GITHUB_WRITE_TOKEN` a worker opens no pull requests, so a local run is safe by default.

## Environment configuration
{: #environment-configuration }

Configuration is files plus environment variables, never code, and since `wardens` 0.6.0 it's split by
who owns it:

- **Framework defaults** (limits, cells, MCP servers, notify) ship inside the `wardens` package.
- **Deploy config** that names agents, cells or channels (routing, entry points, ownership, webhooks,
  redaction, chat) lives only in wardens-deploy's `config/`. A worker reads it through
  `WARDENS_CONFIG_DIR` and refuses to start without it. Tests read template-owned copies in
  `tests/fixtures/config/`.
- **Other agents' manifests** come from one registry directory, `WARDENS_REGISTRY_DIR`, never from walking
  a folder tree.
- **An agent's own `config/`**: its scope, read by policies, never by a model.
- **Environment**: `WARDENS_LLM_*`, `WARDENS_STATE_DSN`, `WARDENS_MCP_URL` / `WARDENS_MCP_API_KEY`, the
  OTLP endpoint, and the GitHub tokens or App keys.

`WorkerSettings` refuses a placeholder, so a worker with half its settings fails at start instead of
running with a guess.

## Dependency management
{: #dependency-management }

platform-wardens is one uv workspace with one `uv.lock`. Each agent repository has its own lock and pins
`wardens` in two places that must agree: `wardens==<version>` in `pyproject.toml` and
`ARG WARDENS_PY=…:<version>@sha256:…` in the Dockerfile. `check-agent`'s supply-chain rule refuses a
mismatch, and `wardens bump` moves both together.

Three supply-chain rules apply in every repo:

- **One index.** Packages install through the homelab's Nexus proxy, never straight from PyPI. Locally
  you load the Nexus account first; CI signs in through OpenBao, and image builds get the account as
  BuildKit secrets.
- **Fourteen days.** `[tool.uv] exclude-newer = "14 days"` is a rolling window, so every `uv lock` takes
  only releases at least two weeks old. An exception is a dated entry with the reason, kept for security
  fixes only (the older per-package dates were dropped on 2026-11-25 because they froze packages behind
  the window).
- **Renovate** opens the routine updates, extending the homelab's shared rules, whose minimum release
  age is the same 14 days. The `wardens` pin itself is never Renovate's job: only `wardens bump` moves it.

CI installs with `uv sync --frozen`, so a stale lock fails the build.

## Feature flags
{: #feature-flags }

There's no feature-flag service. The agent lifecycle and a few explicit switches do that job:

| Lever | Effect |
|---|---|
| `lifecycle.stage` in the manifest | Only shadow, promote and operate agents are routable |
| `lifecycle.quarantined` | Takes an agent out of routing |
| The kill switch (a ConfigMap per agent, and the state store) | Stops the agent, fails closed |
| A missing write token, or `GITHUB_APP_WRITE: "false"` | The agent reports but opens nothing |
| A channel's constraints | Caps the level and cost of anything that arrives on it |
| terraform-drift's `levelTwo` block | The L2 waiver for development and qa stacks; it ends by itself on 2026-12-21 |
| Repository variables (`WARDENS_BUMP_ENABLED`, `WARDENS_RELEASE_APP`, `WARDENS_EVALS_STATE_DB`) | Turn on the bump job, the release App and the nightly feedback read |

## Documentation standards
{: #documentation-standards }

Design docs drive the code. A framework change updates the conformance matrix (`docs/framework/README.md`)
first, then the module status table in `framework/README.md`, and `wardens docs check` fails the pull
request when they disagree, when a manifest field or reason code isn't described in the contracts
README, or when a relative link is broken. Every framework change adds a line under `## [Unreleased]` in
`framework/CHANGELOG.md`.

Each agent repository carries the fixed doc set from the template, its own `CHANGELOG.md`, a `CLAUDE.md`
with its rules, and an agent card generated from the manifest (`wardens docs agent . --check` in CI).
Decisions for the framework and every agent still go in one log, `docs/decisions/NNNN-*.md` in
platform-wardens.

## Development workflow and code review process
{: #development-workflow-and-code-review-process }

1. The step is in its phase table ([Product Planning](/posts/projects/platform-wardens/03-product-planning/#phase-steps)).
2. A large piece of work gets a plan in `docs/plans/` with a Progress table, updated in the work PR, never a
   PR of its own.
3. A branch and a pull request; a schema change ships with every caller, as an expansion first.
4. Run the checks locally and push once they pass: each push starts a CI run and cancels the older one,
   and the shared runners are the bottleneck.
5. For a change to a model, prompt, stage or tool, run the agent's evals before and after and say what
   changed.
6. Read the CI run before merging. On GitHub Free there are no required checks, so nothing stops a red merge
   except you.
7. Merge. In an agent repo, `main` publishes; in platform-wardens a framework change waits for the next
   release, which reaches agents through bump pull requests (see
   [CI/CD](/posts/projects/platform-wardens/12-cicd-and-release-management/#versioning-and-release-notes)).

> **TODO:** Each agent repo's `CODEOWNERS` names the reviewer's team on the manifest, evals, gates, threat
> model and CI, but GitHub Free can't require that review, and the owner may self-approve registry entries
> while being the only real reviewer. When does a second reviewer join, and does the two-person rule then
> cover every PR or only risk-raising ones?
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] `uv sync` and the framework tests pass on a fresh clone with the Nexus account loaded
- [ ] A new agent starts from `wardens new-agent`, not a copied folder
- [ ] `make check` passes in every agent repo before its PR is pushed
- [ ] No agent imports `temporalio`, `pydantic_ai`, `httpx` or `wardens_services`
- [ ] Every configuration value is set or explicitly a placeholder the code refuses
- [ ] The conformance matrix and module table match the code (`wardens docs check`)
- [ ] Each agent's card and README header match its manifest
- [ ] The review rule for non-risk-raising changes is written down

{% include project-nav.html %}
