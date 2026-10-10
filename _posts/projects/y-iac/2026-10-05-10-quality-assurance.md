---
layout: post
title: "Y-IaC: Quality Assurance"
date: 2026-10-05 00:10:00 +0530
categories: [projects, y-iac]
tags: [Projects, Y-IaC, Testing, QA]
description: "Y-IaC's test strategy: ~1,100 pytest tests, a per-module validator, consumer compatibility plans, gate negative tests and the gaps beyond Azure."
project: y-iac
project_step: 10
image:
  path: /assets/img/projects/y-iac/10-quality-assurance.webp
  alt: "Y-IaC: Quality Assurance - Projects hero image"
---

Y-IaC's real test isn't "does the code run". It's "does every consumer's next plan look exactly like it
did before, unless we meant to change it". The repo already has 34 test files with roughly 1,100 test
functions, a module validator and a workflow that plans real consumers against a branch. This post maps
those to the test layers and is honest about where coverage stops.

<!-- more -->

{% include project-nav.html %}

## Unit testing
{: #unit-testing }

Unit tests cover the Python package with pytest (`testpaths = ["tests"]`, `pytest-cov` for coverage).
The test files line up with the package areas:

| Area | Test files (examples) |
|---|---|
| CLI | `test_cli_app.py`, `test_cli_validation.py`, `test_cli_dispatch.py`, `test_cli_banner.py` |
| Bootstrap | `test_bootstrap.py` |
| Config | `test_config.py`, `test_import_normalization.py`, `test_auto_import_config.py` |
| Environment and auth | `test_environment.py`, `test_environment_auth.py`, `test_environment_handler.py` |
| Generators | `test_generators.py`, `test_generators_stack_reporting.py` |
| Handlers | `test_handlers_runner.py`, `test_handlers_lifecycle.py`, `test_terragrunt_dispatcher.py`, `test_statelock.py` |
| Reporting | `test_plan_summary.py`, `test_plan_converter.py`, `test_error_report.py`, `test_final_report.py` |
| Validation and gates | `test_validation_gates.py`, `test_opa.py`, `test_module_validation.py` |

Local commands: `python -m pytest`, `ruff check .`, `ruff format --check .`, `task test`.

Measured on the current code: **81% line coverage** of `src/` (10,813 statements). No floor is enforced in
CI yet. I'd set `--cov-fail-under=80` now and raise it as gaps close. In that run, one OPA test
(`test_azure_tag_policy_accepts_all_mandatory_tags_and_optional_tags`) failed and is worth a look.

## Integration testing
{: #integration-testing }

Integration here means "the pieces produce correct files together", without cloud credentials:

- **Generation tests.** Feed a fixture `resources.yaml` and `common_vars.yaml`, run the stack generator
  and the common_vars merge, assert on the generated `terragrunt.stack.hcl` and the merged
  `.terragrunt-stack/common_vars.yaml`.
- **`root.hcl` rendering.** Run `terragrunt render` (or generate) on a fixture unit with a local
  backend and assert `provider.tf` contains exactly the providers the fixture asked for, at the pinned
  versions.
- **Gate wiring.** Run OPA against a fixture plan JSON and check the right policies fire.

The first and third exist in the test suite. The second is the one I'd add, because `root.hcl` is the
most shared file in the platform and has no direct test.

## Contract testing
{: #contract-testing }

The contracts from [Technical Architecture](/posts/projects/y-iac/05-technical-architecture/#api-and-integration-architecture)
each need a test that fails when the contract breaks:

| Contract | Test |
|---|---|
| YAML shapes | Golden `resources.yaml` per resource type; generation must succeed |
| Module variables and outputs | Validator plus a check that every unit template's inputs exist in the module's `variables.tf` |
| Dependency mocks | Every `dependency` block with `mock_outputs` covers the outputs the unit reads |
| Env variable names | A test that every `get_env` name in `root.hcl` is exported or documented |
| Workflow inputs | `actionlint` on reusable workflows; consumer template inputs match callee inputs |
| Plan JSON | Plan converter tests on fixtures from the pinned Terraform version |

The second row is cheap and high value: a unit template passing an input the module doesn't declare is a
plan-time failure in every consumer that uses it.

## End-to-end testing
{: #end-to-end-testing }

End-to-end means bootstrap through plan, approval, apply, summary and notification, in a safe
environment. The cloudutsukpilot consumers are a natural fit: `infra-aws` (one VPC in a dev stack) and
`infra-github` (repositories, teams and custom properties in a personal org) are real, small and
cheap. An E2E run would:

1. Point a test consumer at the Y-IaC branch.
2. Plan, apply, plan again (expect no changes).
3. Change one attribute, plan (expect one change), apply.
4. Destroy, and confirm the state is empty.

`infra-azure` and `infra-gcp` exist but are still empty; filling them with one small stack each would
give the same coverage for Azure and GCP.

## Regression testing
{: #regression-testing }

The regression risk on a shared platform is "a consumer's plan changed and nobody meant it to". The
compatibility workflow (`terragrunt-compatibilty.yaml`) is the main defence: it discovers stacks in
consumer repos, symlinks the branch's shared module into each and runs init and plan, with up to five in
parallel.

Two gaps:

- It only scans `environments/azure/*`, so AWS, GCP, GitHub and SaaS stacks aren't covered.
- It proves plans *run*, not that they're *unchanged*. Comparing each plan's add/change/destroy counts
  with the same plan on `main` would turn it into a true regression test.

Known-failure regressions belong in the error catalog tests: every entry in
`config/error_message_and_solutions.yaml` should have a fixture log that matches it.

## Performance and load testing
{: #performance-and-load-testing }

What to measure, on the largest Azure consumer stack:

| Measure | Why |
|---|---|
| Time from command to first Terraform call | Python overhead: bootstrap, validation, auth |
| `terragrunt stack generate` time | Grows with resource types |
| Plan time per wave | Provider API latency and throttling |
| Total CI wall-clock per changed stack | What consumers feel |
| Drift scan duration across all stacks | Throttling risk when everything plans at once |

I'd record these per release so a slowdown shows up as a number. The non-functional target is still an
open question in [Requirements](/posts/projects/y-iac/02-requirements-gathering/#non-functional-requirements).

## Security testing
{: #security-testing }

- **Gates on every plan:** OPA, Trivy or Wiz, and Infracost when enabled.
- **Negative-path tests:** a fixture plan that violates each OPA policy must fail it; a mandatory gate
  with a finding must return a non-zero exit; an override must be visible in the summary.
- **Redaction tests:** a fixture plan with literal provider secrets must come out of `reporting/redaction.py`
  with none left.
- **Secret scanning:** Trivy's secret scan over `resources.yaml` and generated values, plus GitHub
  secret scanning on the Y-IaC repo.
- **Permission tests:** the repo-subscription guardrail rejects an unmapped subscription for a mapped
  repo.

## Accessibility testing
{: #accessibility-testing }

There's no UI, so this is light: check that CLI output and job summaries make sense with colours and
emoji removed (pipe the output through `sed` to strip ANSI codes and read it), and that the docs site and
diagrams have text alternatives. A quick review per release is enough.

## Compatibility testing
{: #compatibility-testing }

| Dimension | Tested today | Should be |
|---|---|---|
| Python | 3.12.3 in compatibility runs | 3.12 and 3.13 |
| Terraform | 1.13.2 pinned | Pinned version and the next minor |
| Terragrunt | 0.83.2 pinned | Pinned version and the next minor (the `stack` CLI moves) |
| Provider versions | Whatever `providers.yaml` says | Current pins and proposed bumps |
| Runners | `ubuntu-latest`, a self-hosted Ubuntu runner | Same, plus macOS for local use |
| Consumer patterns | Six Azure consumers | Plus one AWS, one GCP, one GitHub consumer |

## User acceptance testing
{: #user-acceptance-testing }

For a platform release, UAT is a consumer representative and the platform owner confirming four things:
the change does what the release note says; plans in their repos look as expected; the evidence (summary,
gate results) is usable; and support knows what changed. For a big change (a new gate default, a provider
major version), I'd run UAT with two or three consumers on the release branch for a week before tagging.

## Test data and test environment management
{: #test-data-and-test-environment-management }

- **Synthetic data only.** Fixtures use made-up names, IDs and subscriptions. No production state, plan
  or credential ever goes into `tests/`.
- **Local backend for tests.** `root.hcl` supports `type: local` and `common_vars.backend` overrides, so
  fixtures can generate and plan without remote state.
- **Isolated cloud test environments** (the cloudutsukpilot consumers or a sandbox subscription) with
  automatic destroy at the end of every E2E run.
- **Credentials for tests** are scoped to the sandbox and stored as separate CI secrets.

## Checklist
{: #checklist }

- [ ] Coverage is measured and a floor is enforced in CI
- [ ] `root.hcl` rendering has fixture tests
- [ ] Unit template inputs are checked against module variables automatically
- [ ] Compatibility workflow covers AWS, GCP and GitHub consumers
- [ ] Compatibility workflow compares plan counts with `main`
- [ ] An E2E run uses `infra-aws` or `infra-github` and destroys afterwards
- [ ] Every error catalog entry has a fixture log
- [ ] Negative-path tests exist for each mandatory gate

{% include project-nav.html %}
