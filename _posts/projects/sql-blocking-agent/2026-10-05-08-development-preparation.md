---
layout: post
title: "SQL Blocking Agent: Development Preparation"
date: 2026-10-05 00:08:00 +0530
categories: [projects, sql-blocking-agent]
tags: [Projects, SQL Blocking Agent, Development, Workflow]
description: "Developing the SQL Blocking Agent: repo layout, a local loop against SQL Server Express, uv and ruff, the env flags that act as safety switches, and review rules."
project: sql-blocking-agent
project_step: 8
image:
  path: /assets/img/projects/sql-blocking-agent/08-development-preparation.webp
  alt: "SQL Blocking Agent: Development Preparation - Projects hero image"
---

The fastest way to understand this agent is to watch it kill a session on your own laptop. The repo is
set up for exactly that: a local SQL Server Express, a script that creates a blocking chain on demand,
`LOCAL=true` for console-only telemetry, and your own `az login` for the model. This post covers that
loop and the rules every change follows on its way to AKS.

<!-- more -->

{% include project-nav.html %}

## Repository and branching strategy
{: #repository-and-branching-strategy }

One repository, organized as a component monorepo: the agent lives in `sql-blocking-agent/`, and the
root holds what's shared across components (`versions.yaml` with per-environment versions, `.release/`,
`mkdocs.yml` for TechDocs, `catalog-info.yaml` for Backstage, the workflows). CI triggers only on changes
under `sql-blocking-agent/**`.

Branches are named after the Jira ticket (`SDO-16692-Strengthen-pre-KILL-session-identity-validation`),
merged through pull requests, and released by a workflow that creates its own release branch and PR
(`release-sql-blocking-agent-v1.0.34`). Larger changes carry an implementation tracker
(`SDO-*_CHANGELOG.md`) with scope, confirmed policy and test evidence. I'd move those trackers into
`docs/changes/` once merged, so the component root stays tidy.

## Coding standards
{: #coding-standards }

- Python 3.11 to 3.13 (`requires-python = ">=3.11,<3.14"`).
- `ruff` with a repo `ruff.toml`; SonarQube in CI.
- Every model output and every state transition is a Pydantic model.
- One LLM entry point (`agents/llm.py`, `ask_structured()`); no direct model calls elsewhere.
- Prompts live next to their agent as Markdown (`agents/determination/prompt.md`), so prompt changes show
  up in diffs and reviews like code.
- Deterministic tools never import the LLM module (none in `src/tools/` does today). That rule is what
  keeps the safety boundary from eroding over time.

## Project structure
{: #project-structure }

```text
sql-blocking-agent/
├── main.py                  # entry point: config, approval API, pollers (or Temporal)
├── approve.py               # HITL CLI: list | show | approve | deny
├── agent.yaml               # agent manifest: nodes, models, env
├── src/
│   ├── agents/              # detector, analyzer, determination, action, rca, notifier, llm.py
│   ├── orchestrator/        # workflow.py, state.py, config.py, router.py, telemetry.py, temporal_*
│   └── tools/               # blocking_check, log_safety, plan_cache, query_store, locks, scenario,
│                            # sql_query, sql_validator, kill_rate, exclusion_window, audit_log,
│                            # report_renderer, blob_storage, alert, pf1_report_contract
├── sql/                     # numbered schema and login scripts
├── tests/unit/              # 240 tests
├── tests/e2e/               # end-to-end, live kill harness, Temporal workflow
├── helm/                    # the chart Argo CD deploys
├── docs/                    # TechDocs source
├── Dockerfile               # with ODBC Driver 18
└── pyproject.toml, uv.lock, ruff.toml
```

## Local development setup
{: #local-development-setup }

```bash
# Prerequisites: Python 3.12, uv, ODBC Driver 18, a local SQL Server (Express is fine), Azure CLI
az login                                    # your identity calls Azure AI Foundry
cd sql-blocking-agent
uv sync                                     # from uv.lock
sqlcmd -S localhost\\SQLEXPRESS -i sql/01_config_db.sql   # then 02..07
# create .env: AZURE_OPENAI_ENDPOINT, CONFIG_DB_CONNECTION_STRING, LOG_DB_CONNECTION_STRING, LOCAL=true
uv run python main.py                       # DRY_RUN defaults to true
# in another terminal, create blocking and approve:
uv run python trigger_blocking_test.py
uv run python approve.py list
```

The live run analysis from July shows the full path working this way: a real `KILL` on a local SQL
Express instance, validation, RCA, report and audit rows.

There's no `.env.example` in the repo yet; the variables are spread across the engineer guide and
`config.py`. Adding one with every variable and a safe default would make these steps copy-paste ready.

## Environment configuration
{: #environment-configuration }

| Layer | Source | Examples |
|---|---|---|
| Environment defaults | Env vars (`.env` locally, ConfigMap and ExternalSecret on AKS) | `POLL_INTERVAL_SECONDS`, `DRY_RUN`, `REQUIRE_HUMAN_APPROVAL`, `AZURE_OPENAI_ENDPOINT` |
| Per-server overrides | `TargetServers` row | Poll interval, kill threshold, min victims, max kills per hour, DBA email |
| Per-server policy | `ProtectedLogins`, `ExclusionWindows` | Who's never killed, when the agent stays quiet |
| Per-agent model | `LLM_MODEL_ANALYZER`, `_DETERMINATION`, `_RCA`, plus `LLM_THINKING_*` | `gpt-5-mini` by default |
| Secrets | Key Vault through External Secrets | SQL logins |

Only a fixed list of keys can be overridden per server, so a row can't change, say, the LLM endpoint.

## Dependency management
{: #dependency-management }

`uv` with a committed `uv.lock`, so the image and every laptop resolve the same versions. The runtime
dependencies are deliberately few: `pydantic-ai-slim[openai]`, `pyodbc`, `fastapi`, `logfire`,
`azure-identity`, `temporalio` (optional mode). The ODBC driver is a system dependency, installed in the
Dockerfile (Driver 18) and by hand locally, which is the most common setup snag in the troubleshooting
guide.

## Feature flags
{: #feature-flags }

In this agent, flags are safety switches, and their defaults matter more than usual:

| Flag | Code default | Production | Effect |
|---|---|---|---|
| `DRY_RUN` | `true` | `true` (via Argo CD values) | Simulate the `KILL` |
| `REQUIRE_HUMAN_APPROVAL` | `true` | `true`, mandatory | Every `KILL` waits for a person |
| `APPROVAL_TIMEOUT_SECONDS` | `300` | Per values | Silence means deny |
| `RUN_MODE` | `loop` | `loop` | `temporal` for durable cycles |
| `ANALYSIS_COOLDOWN_SECONDS` | `300` | Per values | Skip re-analysis of the same blocker |
| `LOCAL` | `true` | `false` | Console telemetry vs Application Insights |
| `DB_BACKEND` | SQL Server | SQL Server | `postgres` exists but is out of scope |

One mismatch to fix: the Helm chart's `values.yaml` defaults `DRY_RUN` to `"false"`, while the code
defaults to `true`. Production is safe only because its environment values override the chart. A chart
default of `"true"` would make a missing override fail safe.

## Documentation standards
{: #documentation-standards }

The docs are TechDocs (MkDocs) published to Backstage, with five pages in the navigation (Home,
Architecture, End-to-End Process, Engineer Guide, Onboarding Guide) and several more in the folder. The
standard I'd hold: ARCHITECTURE.md describes the implemented runtime only (it already says so in its
first line), design history goes in decision documents like `WHY_PYDANTIC_AI.md`, and implementation
trackers are archived once merged.

## Development workflow and code review process
{: #development-workflow-and-code-review-process }

The repo has `.github/agents`, `instructions` and `prompts` for AI-assisted development, so assistants
follow the same conventions. Review rules for a PR:

1. Safety-relevant change (gates, prompt for Determination, action path, protection policy, approval)?
   Needs a database team reviewer and a negative test.
2. Does a deterministic tool now depend on model output? Reject.
3. New LLM call? Justify it; the budget is three per analyzed cycle.
4. Docs updated (ARCHITECTURE, Troubleshooting) when behavior changes.
5. Tested locally against SQL Express, ideally with the live harness for action-path changes.

## Checklist
{: #checklist }

- [ ] Chart default `DRY_RUN` is changed to `"true"`
- [ ] A `.env.example` lists every variable with safe defaults
- [ ] CODEOWNERS adds the database team on safety-relevant paths
- [ ] "Tools never import the LLM module" is enforced by a lint rule or test
- [ ] Implementation trackers move to `docs/changes/` after merge
- [ ] Local setup is verified on a clean machine from the docs alone

{% include project-nav.html %}
