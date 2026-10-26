---
layout: post
title: "Job Hunter Agent: Development Preparation"
date: 2026-10-22 00:08:00 +0530
categories: [projects, job-hunter-agent]
tags: [Projects, Job Hunter Agent, Development, Workflow]
description: "The repo, tooling and local setup behind Job Hunter Agent: uv, ruff, a Makefile, an in-memory mode with no database, and fakes for every outside system."
project: job-hunter-agent
project_step: 8
image:
  path: /assets/img/projects/job-hunter-agent/08-development-preparation.webp
  alt: "Job Hunter Agent: Development Preparation - Projects hero image"
---

The test of this project's development setup was simple: could I change a prompt, run the tests and see
the new draft against the real local model within a minute, without touching LinkedIn? Everything below
exists to make that loop fast and to keep LinkedIn out of it unless I really mean to call it.

<!-- more -->

{% include project-nav.html %}

## Repository and branching strategy
{: #repository-and-branching-strategy }

Three repos, each with one job:

| Repo | Holds | Changes by |
|---|---|---|
| `job-hunter-agent` (private) | App code, UI, migrations, tests, docs, CI | Small changes straight to `main`; schema changes through a PR |
| `homelab-gitops` | Argo CD app: Deployment, PVC, Ingress, NetworkPolicy, ExternalSecret, image digest | PR, merged by me; CI commits the image digest |
| `infra-local` | Keycloak client, OpenBao secrets script | PR |

Trunk-based with short-lived branches. A PR is mandatory when the change needs something done outside
git first (a Supabase migration, a secret), because merging deploys.

## Coding standards
{: #coding-standards }

- Ruff for lint and format, 125-character lines, isort with `supabase` marked third-party.
- Type hints everywhere; Pydantic models for every boundary (API bodies, LLM outputs, stored records).
- Comments explain *why*, at the density of the surrounding code; docstrings on modules and on anything
  with a non-obvious contract (for example, why tailoring returns edits).
- No `assert` in application code (Bandit flags it); no bare `except` without logging.
- UI: plain DOM through one `el()` helper that only ever sets `textContent`.

## Project structure
{: #project-structure }

```text
hunter/
  agents/        base.py (records every run, OTel span), scorer, resume, cover_letter, research
  api/           main.py (app factory), routes.py, auth.py (Keycloak), deps.py
  db/            base.py (Repository protocol), memory.py, supabase.py
  tools/         linkedin_mcp.py (client, page parsing), filters.py
  ui/            index.html, app.js, styles.css
  pipeline.py    discover, score_and_draft, evaluate_job, company research, transitions
  truthfulness.py, company_facts.py, scheduler.py, runs.py, notify.py, sources.py, llm.py, config.py
supabase/migrations/   timestamped SQL
tests/                 fakes in conftest.py, unit and integration tests
scripts/               smoke.py, fetch_postings.py, evaluate.py
docs/                  architecture, testing, plan, evaluation
examples/              sample jobs, postings, resumes
```

## Local development setup
{: #local-development-setup }

```bash
make install            # uv sync, including dev tools
cp .env.example .env    # add an LLM key; everything else has a working default
make dev                # uvicorn --reload on 127.0.0.1:8000, in-memory storage, no sign-in
make test               # pytest with fakes: no LLM, no LinkedIn, no network
make smoke              # with `make dev` running: sample jobs through the real local model
```

Optional pieces, only when I need them: `make supabase-start` for a local Supabase in Docker,
`make linkedin-login` then `make linkedin-mcp` for a local LinkedIn browser on `127.0.0.1:8765`. The
default local mode never talks to LinkedIn.

## Environment configuration
{: #environment-configuration }

All configuration is environment variables read by pydantic-settings, with defaults that work locally:

| Variable | Local default | Production |
|---|---|---|
| `STORAGE_BACKEND` | `memory` | `supabase` |
| `LLM_BASE_URL`, `LLM_CHAT_MODEL` | LiteLLM URL, `qwen3.5-35b-a3b` | same |
| `LINKEDIN_MCP_URL` | `http://127.0.0.1:8765/mcp` | `http://127.0.0.1:8080/mcp` (sidecar) |
| `OIDC_ISSUER` | empty (sign-in off) | Keycloak realm |
| `SCHEDULE_CRON`, `SCHEDULE_TIMEZONE` | empty, UTC | `0 8 * * 1-5`, Asia/Kolkata |
| `SLACK_WEBHOOK_URL` | empty (off) | from OpenBao |

Anything that changes per search lives on a profile in the database, not in configuration.

## Dependency management
{: #dependency-management }

`uv` with a committed `uv.lock`; the Dockerfile installs with `uv sync --frozen --no-dev`, so the image
gets exactly the locked versions. Adding one is `uv add <pkg>`, which updates both files (that's how
`defusedxml` came in for the news feed). The MCP SDK is on 2.x, whose client API differs from most
examples online; the wrapper in `tools/linkedin_mcp.py` keeps that in one place.

## Feature flags
{: #feature-flags }

Environment switches, not a flag service:

| Flag | Default | Effect |
|---|---|---|
| `LINKEDIN_ENABLED` | true | LinkedIn discovery, company pages, contacts |
| `INDEED_ENABLED` | false | Indeed scraping as a second source |
| `COMPANY_FACTS_ENABLED` | true | Wikidata and Google News lookups (off in tests) |
| `SLACK_NOTIFY_MANUAL` | false | Slack messages for manual runs too |
| Per profile: `enabled` | true | Whether the profile has a scheduled job |

## Documentation standards
{: #documentation-standards }

Docs change in the same commit as the code: the README's API table and configuration list, `docs/` for
design and evaluation, and these playbook posts for decisions. Every Kubernetes manifest starts with a
comment explaining what it's for and why it's shaped that way. User-facing strings explain what to do
next (see [Content and messaging](/posts/projects/job-hunter-agent/04-user-experience-and-design/#content-and-messaging)).

## Development workflow and code review process
{: #development-workflow-and-code-review-process }

1. Change the code and its test together; `make test` and `ruff` locally.
2. For UI changes, render the page with sample data in headless Chromium (desktop and phone, light and
   dark) and look at it.
3. Push or open a PR. CI runs the unit tests, the Supabase integration test and a Docker build; on `main`
   it also builds, scans, signs and promotes the image.
4. Argo CD rolls it out; I check the rollout and the feature in the live app.

Review is me reading every diff before it's pushed, plus the platform's scanners. I considered an
automated second reviewer on PRs that touch the riskiest code, the truthfulness checks
(`truthfulness.py`) and sign-in (`auth.py`), and decided against it for now. Both have tests that pin their
behaviour, CI runs them on every PR, and a one-person tool doesn't justify another review step. If the
project ever gets a second contributor, that's when to revisit it.

## Checklist
{: #checklist }

- [ ] `make dev` and `make test` work on a fresh clone with only an LLM key
- [ ] The default local mode can't reach LinkedIn
- [ ] Ruff clean and formatted before every push
- [ ] Every new outside system gets a fake in `tests/conftest.py`
- [ ] README tables updated with each API or setting change
- [ ] Migrations reviewed in a PR before merge

{% include project-nav.html %}
