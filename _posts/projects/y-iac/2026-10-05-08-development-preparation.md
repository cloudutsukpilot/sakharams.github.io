---
layout: post
title: "Y-IaC: Development Preparation"
date: 2026-10-05 00:08:00 +0530
categories: [projects, y-iac]
tags: [Projects, Y-IaC, Development, Workflow]
description: "Y-IaC developer setup: repo rules, the sibling-checkout local loop, Python 3.12 tooling, the module validator, opt-in flags and agent prompt routing."
project: y-iac
project_step: 8
image:
  path: /assets/img/projects/y-iac/08-development-preparation.webp
  alt: "Y-IaC: Development Preparation - Projects hero image"
---

The first rule of working on Y-IaC is where *not* to make a change: never inside a consumer's synced
copy of `terragrunt_shared_module`. The next bootstrap sync overwrites it, and the fix disappears without
a trace. Everything in this post follows from that rule: one source of truth, a local loop that runs
the real CLI against a real consumer, and checks that prove a change is safe for every consumer.

<!-- more -->

{% include project-nav.html %}

## Repository and branching strategy
{: #repository-and-branching-strategy }

- **One repository** for modules, CLI, templates, config and workflows. Consumers never fork it.
- **Feature branches and pull requests** for every change, named after the ticket. The `infra-aws`
  consumer currently points `iac_shared_module_ref` at such a branch while it's being tested, which is
  exactly how a feature branch should be trialled before merge.
- **Protected `main`** with required reviews and required checks (code quality, Python quality, module
  validation for touched modules).
- **CODEOWNERS** (`.github/CODEOWNERS`) routes review to the right maintainers.
- **Tags for releases.** There's one tag so far (`v1.0.0`). Consumers should pin a tag, not a branch,
  once releases are regular; see [Versioning](/posts/projects/y-iac/12-cicd-and-release-management/#versioning-and-release-notes).

## Coding standards
{: #coding-standards }

| Language | Standard | Enforced by |
|---|---|---|
| Python | 3.12 target, typed, docstrings that explain *why*, argv-form subprocesses, `safe_load` only | `ruff check`, `ruff format`, pytest |
| Terraform | `terraform fmt`, one module per resource type, README with inputs and import example | Module validator, TFLint |
| Terragrunt HCL | `terragrunt hcl format` | Module validator |
| YAML | yamllint config shipped to consumers (`template/.yamllint`) | `task fmt:yaml` |

The Python package has a strong house style worth keeping: module docstrings explain the design reason
("That silence is the reason this runs on every generate…"), not just what the function does. I'd make
that a review criterion for any new module in `src/`.

## Project structure
{: #project-structure }

```text
terragrunt_shared_module/
├── entrypoint.py            # the stub every consumer copies
├── src/<org>_iac/           # the CLI package
│   ├── bootstrap/           # sync, templates, hash cache
│   ├── cli/                 # parser, validation, env export, banner, dispatch, app
│   ├── config/              # loaders, inheritance, provider versions, scan settings
│   ├── core/                # shell, env, errors, logging, paths, serialization
│   ├── environment/         # backend, credentials, Azure auth, preflight, kubernetes
│   ├── generators/          # stack generator, merges, dependency graph, visualization
│   ├── handlers/            # terragrunt, statelock, ansible
│   ├── reporting/           # plan summary, error report, redaction, final report
│   └── validation/          # module, OPA, Trivy, Wiz, Infracost, repository, schema
├── cloud/<cloud>/{terraform,terragrunt}/<type>/
├── providers/<provider>/{terraform,terragrunt}/<type>/
├── config/                  # providers.yaml, config.yaml, opa/, trivy/, wiz/, infracost/, jira/
├── template/                # root.hcl, terragrunt-cicd.yaml, .gitignore, .yamllint, .trivyignore
├── tests/                   # 34 test files
├── tools/                   # validate_terraform_module.py, jira_drift_ticket, github_jwt_token
├── python/                  # legacy layout, kept for consumers that haven't re-synced
└── docs/                    # getting-started, features, providers, troubleshooting, security
```

The pairing of `terraform/<type>` and `terragrunt/<type>` is the module contract: one can't exist
without the other.

## Local development setup
{: #local-development-setup }

The local loop needs two checkouts side by side, because that's how `entrypoint.py` finds the shared
module outside CI:

```bash
mkdir -p ~/gitrepos/cloudutsuk && cd ~/gitrepos/cloudutsuk
git clone git@github.com:cloudutsukpilot/y-iac.git terragrunt_shared_module   # directory name matters
git clone git@github.com:cloudutsukpilot/infra-aws.git

cd terragrunt_shared_module
python3.12 -m venv venv && . venv/bin/activate
pip install -r requirements.txt && pip install -e '.[visualize]'
bash docs/local-setup/local-setup.sh       # terragrunt, tflint, cloud CLIs

cd ../infra-aws
python entrypoint.py --cloud aws --environment dev --stack hello-world --terragrunt plan
```

A change in `../terragrunt_shared_module` is picked up on the consumer's next run, because the
bootstrap hash changes. To force it, pass `--script-clear-cache` or use `init -reconfigure`.

The script supports **WSL (Ubuntu) and native Ubuntu/Debian** only; it stops on anything else. macOS
contributors need to install Terraform, Terragrunt, TFLint and the cloud CLIs with Homebrew by hand, or
use a dev container. A macOS branch in the script is a reasonable backlog item.

## Environment configuration
{: #environment-configuration }

Configuration has layers, and each answers a different question:

| Layer | File | Answers |
|---|---|---|
| Platform defaults | `config/*.yaml` in Y-IaC | What every consumer gets unless it says otherwise |
| Repository | `config.yaml` in the consumer root | Backend, workflow ref, runner, gate positions for this repo |
| Environment | `environments/<cloud>/<env>/common_vars.yaml` | Account, providers, subscriptions, tags, gates |
| Stack | `<stack>/common_vars.yaml` (optional) | Overrides for one stack; tags merge key by key |
| Run | CLI flags and environment variables | One-off choices for this run |
| Secrets | `.env` locally, GitHub secrets in CI | Credentials only |

Gate settings resolve through the same four-layer inheritance (global, cloud, environment, repository) in
`config/inheritance.py`. One thing I'd add is a `.env.example` listing every variable the CLI and
`root.hcl` read, so a new developer learns which ones exist without seeing anyone's values.

## Dependency management
{: #dependency-management }

- **Python:** declared in `pyproject.toml` (with an optional `visualize` extra for Diagrams) and
  `requirements.txt`. The stub
  installs only `PyYAML` and `python-dotenv` when missing, so a consumer works before anything else is set
  up.
- **Terraform providers:** one list in `config/providers.yaml`. A bump is a change-controlled PR with a
  compatibility run, never a quiet edit.
- **Tools:** Terragrunt, TFLint, Wiz CLI, kubelogin installed by `.github/actions/setup-environment` in
  CI and by `local-setup.sh` locally. The versions should match; today that's by convention.

I'd add a Python lock file for CI and a single `tool-versions` file read by both the composite action
and the local script, so "works on my machine" and "works in CI" mean the same versions.

## Feature flags
{: #feature-flags }

Y-IaC uses environment variables and config keys as feature flags, and the good ones share three
properties: a safe default, a documented precedence and a way back.

| Flag | Default | Effect |
|---|---|---|
| `AUTO_RELEASE_LOCK` / `--auto-release-lock` | Off | Release stale state locks automatically and retry |
| `LOCK_MIN_AGE_MINUTES` / `--lock-min-age-minutes`, `LOCK_RETRY_ATTEMPTS` | `state_lock` block in `config.yaml` | Age guard and retry count for the above |
| `iac_scanner` / `--iac-scanner` | Per config | `wiz`, `trivy`, `both` or `none` |
| `OPA_SKIP`, `TRIVY_SKIP`, `WIZ_SKIP`, `INFRACOST_SKIP` | Off | Skip a gate for this run |
| `*_OVERRIDE` | Off | Run the gate but don't block on it |
| `cost_analyzer.enabled` | `false` | Infracost gate |
| `drift_scan` workflow input | `false` | Manual drift scan instead of a normal plan |

Every new flag should be documented in `09-consumer-repo-config-reference.md` with those three
properties before it merges.

## Documentation standards
{: #documentation-standards }

- **Every module** has a README with purpose, inputs, outputs, a YAML example and the Terragrunt import
  command. The module validator fails without the required sections.
- **Every user-visible behavior change** updates the narrowest guide that covers it and links to deeper
  references rather than repeating them.
- **Every CHANGELOG entry** says what changed, why, which files, and the migration step if any. The
  existing entries are long but complete, which is the right trade-off for a shared platform.
- **Docs live next to code**, so a PR that changes behavior and not docs is visibly incomplete.

## Development workflow and code review process
{: #development-workflow-and-code-review-process }

The repository routes AI-assisted work through `AGENTS.md`: a table of prompts and skills under
`.github/prompts/` and `.github/skills/` for new modules, provider onboarding, failure diagnosis, README
reconciliation, migrations and diagrams. That keeps assistant-generated changes on the same rails as
human ones.

The review checklist I'd apply to every PR:

1. Does the change belong in Y-IaC (not a consumer)?
2. Which consumers are affected, and what will their next plan show?
3. Tests: focused tests added or updated; full suite green.
4. Module changes: validator output attached for each touched module.
5. Backward compatibility: old YAML shapes and inputs still work, or the break is announced.
6. Security: no new secret paths, no widened permissions without a reason.
7. Docs and CHANGELOG updated.

## Checklist
{: #checklist }

- [ ] Branch protection on `main` requires review and the quality workflows
- [ ] CODEOWNERS covers `template/`, `config/providers.yaml` and `src/`
- [ ] Local setup is tested on Linux, macOS and WSL
- [ ] Tool versions come from one file used by CI and local setup
- [ ] A Python lock file is used in CI
- [ ] Every flag is documented with default, precedence and rollback
- [ ] The PR template includes consumer impact and validator output

{% include project-nav.html %}
