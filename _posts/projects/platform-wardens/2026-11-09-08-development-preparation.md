---
layout: post
title: "Platform Wardens: Development Preparation"
date: 2026-11-09 00:08:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Development, Workflow]
description: "One uv workspace, an agent template, import rules that keep Temporal and model clients in one place, and design docs that drive the code in Platform Wardens."
project: platform-wardens
project_step: 8
---

Platform Wardens is a repo where the design docs are written first and the code has to keep up with
them. Twenty-seven design categories, a conformance matrix, a module status table and a decision log all
say what the framework does and doesn't do yet. Getting ready to develop here mostly means learning the
two import rules and the one workspace, then reading the matrix before you touch a module.

<!-- more -->

{% include project-nav.html %}

## Repository and branching strategy
{: #repository-and-branching-strategy }

One repo for the standards, the framework and every agent:

```text
platform-wardens/
├── docs/            design categories, decisions, phases, plans, how-docs
├── contracts/       JSON Schemas (task, artifact, run record, manifest …)
├── framework/       the wardens package and its config
├── agents/<domain>/<agent>/
├── mcp-servers/     mcp-guard
├── templates/agent/ what every new agent starts from
├── evals/           routing and cross-agent scenarios
└── diagrams/        interactive diagrams, built from diagram.yml
```

Deployment isn't here: it lives in `homelab-gitops` (the shared `wardens-agent` chart and an `apps/<agent>`
folder each), and cloud identity in the infra repos. Branching is short-lived feature branches and a pull
request to `main` for every change; a push to `main` builds the images that change.

## Coding standards
{: #coding-standards }

The rules that matter are architectural, and review enforces them:

| Rule | Why |
|---|---|
| Agents import only the public API of `wardens` | Keeps the framework replaceable behind a stable surface |
| Only `wardens.durable` imports `temporalio` | Workflow code must stay deterministic |
| Only `wardens.llm` builds a model client | One place for auth, validation, middleware and cost |
| `workflow.py`: no I/O, clock, randomness or model calls | It runs as Temporal workflow code and is replayed |
| `worker.py`: no I/O at import | The Temporal sandbox re-imports it |
| Destructive actions are deterministic stages, never model-callable tools | Autonomy enforced in code |
| A value in angle brackets is unset: skip or refuse, never guess | No silent defaults in configuration |

Python 3.12 and Pydantic for every typed boundary. There's no linter in CI yet; the image build's
Semgrep and Hadolint gates are the only automated style and safety checks on the code.

## Project structure
{: #project-structure }

Every agent has the same anatomy, from `templates/agent/`, and each folder answers one question:

| Path | Holds |
|---|---|
| `manifest.yaml` | Purpose, `neverDoes`, owner and reviewer, lifecycle stage, identity, capabilities, schedules, tools, action catalog |
| `src/<pkg>/workflow.py`, `worker.py`, `activities.py`, `entrypoint.py` | Deterministic wiring, the Temporal binding, the I/O, the contract boundary |
| `stages/`, `tools/`, `policies/` | Domain logic, read and act tools, the agent's own gates; prompts sit next to stages as `*.prompt.md` |
| `schemas/`, `samples/`, `config/` | Input schemas, one-click console requests, data the policies read |
| `evals/scenarios/`, `gates/` | Evaluation cases and the evidence for each lifecycle gate |
| `docs/` | Why an agent, runbook, threat model, ROI, retirement |

terraform-drift is the reference for the whole path; a new agent copies its shape.

## Local development setup
{: #local-development-setup }

```bash
uv sync                                                   # one .venv for the workspace
uv run --directory framework pytest -q                    # starts a local Temporal dev server (downloaded once)
uv run --directory agents/devops/terraform-drift pytest -q tests/unit
uv run python -m wardens.runtime.console --dev-server     # console :8765, Temporal :7233, UI :8233
cd agents/devops/terraform-drift && GITHUB_READ_TOKEN=$(gh auth token) uv run python -m terraform_drift.worker run
```

Without `GITHUB_WRITE_TOKEN` a worker opens no pull requests, so a local run is safe by default.
`WARDENS_SKIP_TEMPORAL=1` skips the Temporal tests when you only want the unit tests.

## Environment configuration
{: #environment-configuration }

Configuration is files plus environment variables, never code:

- `framework/config/*.yaml`: notification audiences, channel policies per entry point, webhook rules,
  redaction keys, the ownership map, allowed handoffs, routing rules and threshold.
- An agent's `config/`: its scope (which repositories, which stacks), read by policies, never by a model.
- Environment: `WARDENS_LLM_*` (provider, base URL, model, key), `WARDENS_STATE_DSN` (the state store),
  `WARDENS_MCP_URL` / `WARDENS_MCP_API_KEY`, the OTLP endpoint, and the GitHub tokens or App keys.

`WorkerSettings` refuses a placeholder, so a worker with half its settings fails at start instead of
running with a guess.

## Dependency management
{: #dependency-management }

One uv workspace, one `uv.lock`, one `.venv`, so every agent runs against the same `wardens` and the
same library versions. Members are listed explicitly in the root `pyproject.toml`; a new agent has to be
added there. CI runs `uv sync --frozen`, so a stale lock fails the build. Packages first added with the
MCP client only take releases at least 14 days old on the day they were added (`exclude-newer-package`),
a small guard against a poisoned fresh release.

## Feature flags
{: #feature-flags }

There's no feature-flag service, and the agent lifecycle does that job:

| Lever | Effect |
|---|---|
| `lifecycle.stage` in the manifest | Only shadow, promote and operate agents are routable |
| `lifecycle.quarantined` | Takes an agent out of routing |
| The kill switch (a ConfigMap per agent, and the state store) | Stops the agent, fails closed |
| A missing write token | The agent reports but opens nothing |
| A channel's constraints | Caps the level and cost of anything that arrives on it |

## Documentation standards
{: #documentation-standards }

Design docs drive the code. A change to the framework updates the conformance matrix
(`docs/framework/README.md`) first, then the module status table in `framework/README.md`, which lists
what's built and what isn't for every module. Decisions go in `docs/decisions/NNNN-*.md`. Each agent has
a README header restating its manifest (purpose, owner, reviewer, stage, highest level) and its own
`CHANGELOG.md`. The how-docs answer "how does X work" for routing, guardrails, ingress, MCP and the rest.

## Development workflow and code review process
{: #development-workflow-and-code-review-process }

1. The step is in its phase table ([Product Planning](/posts/projects/platform-wardens/03-product-planning/#phase-steps)).
2. A large piece of work gets a plan in `docs/plans/` with a Progress table.
3. A branch and a pull request; the schema changes ship with every caller.
4. Tests and, for any change to a model, prompt, tool or policy, the agent's evals.
5. Review by someone other than the author, then merge. `main` builds the image; the digest commit in
   gitops is the deploy.

> **TODO:** Is review on the homelab done by the second account for every PR, or only for manifests?
> The independent reviewer rule applies to agents; the repo doesn't say it applies to every change.
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] `uv sync` and the framework tests pass on a fresh clone
- [ ] A new agent starts from `templates/agent/` and is added to the workspace members
- [ ] No agent imports `temporalio` or builds a model client
- [ ] Every configuration value is set or explicitly a placeholder the code refuses
- [ ] The conformance matrix and module table match the code after each change
- [ ] Each agent's README header matches its manifest
- [ ] The review rule for non-agent changes is written down

{% include project-nav.html %}
