---
layout: post
title: "Y-IaC: Interview Questions"
date: 2026-10-06 00:30:00 +0530
categories: [projects, y-iac]
tags: [Projects, Y-IaC, Interview Prep, Architecture]
description: "Software architect interview questions answered through Y-IaC: a shared Terraform and Terragrunt module platform with a YAML-driven Python CLI and gated GitHub Actions."
project: y-iac
project_interview: true
image:
  path: /assets/img/projects/y-iac/interview-questions.webp
  alt: "Y-IaC: Interview Questions - Projects hero image"
---

Y-IaC is the project I'd use when an interviewer wants to talk about **platform engineering for
infrastructure as code**: how you stop thirty repositories from each reinventing Terraform, without
turning the shared platform into a single point of failure. It has no web frontend and no database,
which makes the classic questions more interesting, not less: the "UI" is YAML, a CLI and a PR plan
summary, and the "database" is Terraform state. The questions below are generic. The answers are how I'd
answer them with this project. Click a question to open the answer, and follow the links to the playbook
when the interviewer pushes for detail.

<!-- more -->

{% include project-nav.html %}

{% include project-iq-roles.html %}

The one-line pitch I open with: *"We built a shared Terraform and Terragrunt platform where each
infrastructure repo only writes YAML, and one Python CLI plus reusable GitHub Actions turn it into a
generated, policy-checked, cost-estimated plan with an approved apply and weekly drift detection."*

## Project Overview and Your Role
{: #project-overview-and-your-role }

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q1">
<summary>Walk me through a frontend or backend application you designed and built end to end.</summary>

<div class="iq-role" data-role="architect" markdown="1">

Y-IaC is a backend platform with a command-line front door. Two kinds of repository take part:

- **Y-IaC itself:** 175 Terraform modules (146 for clouds such as Azure, AWS and GCP, 29 for providers
  like Kubernetes, Helm, ArgoCD and Grafana), Terragrunt unit templates, one `root.hcl` template, a
  Python 3.12 CLI package, and reusable GitHub Actions.
- **infra-\* consumers:** only YAML (`config.yaml`, a `common_vars.yaml` per environment, a
  `resources.yaml` per stack) plus an identical 86-line `entrypoint.py` stub.

One command runs the same way on a laptop or a runner: the stub finds the shared module, the CLI
bootstraps and validates, exports environment variables and authenticates, generates a
`terragrunt.stack.hcl` from `resources.yaml`, Terragrunt expands it into one unit per resource type,
`root.hcl` generates `provider.tf` and `backend.tf`, and Terraform runs. In CI, every plan goes through
OPA, Trivy or Wiz, and Infracost gates; applies need approval; a weekly drift scan opens Jira tickets.

The guiding rule: **Y-IaC is the source of truth**; shared code is never patched in a consumer's copy.

Deeper: [System context](/posts/projects/y-iac/05-technical-architecture/#system-context-and-component-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

How the code is laid out for a developer:

- **`src/<org>_iac/`**, a Python 3.12 package: `cli/` (parser, argument validation, env export, banner,
  dispatch, app), `bootstrap/`, `config/`, `core/`, `environment/` (backend, credentials, Azure auth,
  preflight), `generators/` (stack generator, common_vars merge, dependency graph, visualization),
  `handlers/` (Terragrunt, state lock, Ansible), `reporting/` (plan summary, redaction, error report),
  `validation/` (OPA, Trivy, Wiz, Infracost, repository guardrail, schema).
- **Modules** under `cloud/<cloud>/terraform/<type>/` and **unit templates** under
  `cloud/<cloud>/terragrunt/<type>/terragrunt.hcl`.
- **`template/root.hcl`**, included by every unit.
- **Consumers** carry an 86-line `entrypoint.py` that finds the shared module and calls the CLI:

```python
def _resolve_module_root(repo_root: str) -> str:
    if os.getenv("GITHUB_ACTIONS", "false").lower() == "true":
        return repo_root                                      # CI: checked out inside the consumer
    return os.path.abspath(os.path.join(repo_root, ".."))    # laptop: cloned next to it
```

```bash
python entrypoint.py --cloud azure --environment development --stack <stack> --terragrunt plan
pytest --cov=<org>_iac --cov-report=term-missing
ruff check src tests && ruff format --check src tests
```

</div>

<div class="iq-role" data-role="devops" markdown="1">

The delivery side:

- **Reusable workflows** in the shared repo: `detect-changes`, `terragrunt-ci` (plan), `terragrunt-cd`
  (apply), `terragrunt-summary-report`, `iac-scheduled-drift-scan`, `iac-drift-detection-analyze`,
  `iac-jira-drift-ticket`, `iac-teams-notification`, `github-jira-webhook`, `manual-dispatch`,
  `terragrunt-compatibilty`.
- **Composite actions**: `setup-environment` (Terragrunt, TFLint, kubelogin, Wiz CLI, cached by version),
  `resolve-credentials`, `build-terraform-block`, `terragrunt-init-plan`.
- **A consumer template** (`template/terragrunt-cicd.yaml`) that consumers copy once and that calls the
  reusable workflows, with `max-parallel: 1` on plan and apply matrices and `secrets: inherit`.

```bash
gh workflow run terragrunt-cicd.yaml -f environment=development
gh run list --workflow terragrunt-cicd.yaml --limit 5
```

What I'd fix first: the template's `uses:` lines point at `@main`, while the CLI checkout follows
`iac_shared_module_ref`. A consumer pinned to a tag still runs workflow YAML from `main`, so pinning has
to cover both, ideally from one value.

</div>

</details>

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q2">
<summary>What business problem did it solve, and how did you know it was working?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Infrastructure code is cheap to write once and expensive to keep consistent. When every team owns a full
Terraform setup, the same decisions get remade in every repo: which azurerm version, how state is keyed,
which tags are mandatory, which checks run before an apply. Some repos get them right; others drift, and
nobody notices until an audit or an outage.

Y-IaC puts those decisions in one place. A consumer like `infra-aws` shrinks to YAML, and everything that
should be the same everywhere *is* the same, because there's only one copy.

The outcome I value most isn't saved typing, it's **assurance**: every apply goes through the same gates,
which is something security and audit can rely on.

How I'd show it works: the platform has 684 commits since April 2025, a v1.0.0 tag, 19 consumer backends
configured, about 1,200 tests at 81% line coverage, and a plan-after-apply check on every apply. The
metrics I'd hold it to: platform-caused plan failures, plan-after-apply clean rate, drift ticket age, and
consumers on the latest release.

> **TODO:** Add a before/after number, for example time to onboard a new infra repo, or the number of
> duplicated modules retired.
{: .prompt-warning }

Deeper: [Business problem](/posts/projects/y-iac/01-vision-and-business-context/#business-problem-and-opportunity).

</div>

</details>

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q3">
<summary>What was your role, and which architectural decisions did you own?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The DevOps team owns and runs Y-IaC, including support and on-call. I wrote the platform's readiness
and delivery guide, the 18-section planning baseline this playbook is built on, so I'd speak to the
decisions as the team's, with the reasoning behind each:

| ADR | Decision |
|---|---|
| 001 | Per-repo backend in `config.yaml`, per-unit state key; local, azurerm, s3, gcs |
| 002 | Global provider pins, per-unit azurerm overrides |
| 003 | `mock_outputs` so a unit can plan before its dependency exists |
| 004 | Consumers pin a Y-IaC ref; a compatibility workflow checks releases |
| 005 | Three gate enforcement levels: advisory, soft-mandatory, mandatory |
| 006 | Opt-in, age-guarded state-lock recovery |
| 007 | Reusable workflows live in Y-IaC; consumers call, never copy |

The one I'd defend hardest is **the Python layer**. Terragrunt alone can't validate a subscription
mapping, choose credentials per subscription, lint YAML for duplicate keys or merge tags safely.

> **TODO:** Say which parts you personally designed or built (for example the CLI package, the gates or
> the drift loop), beyond writing the delivery guide.
{: .prompt-warning }

Deeper: [ADRs](/posts/projects/y-iac/05-technical-architecture/#architectural-decision-records).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Developer decisions that shaped the CLI:

- **Generate at run time**: `generators/stack_generator.py` turns `resources.yaml` into
  `terragrunt.stack.hcl`; nothing generated is committed.
- **Validate before calling clouds**: `generators/resources_lint.py` and `validation/` run first, so
  mistakes fail in seconds.
- **Safety in small, testable policy functions**: the state-lock decision is a pure function over a
  `LockInfo`:

```python
def evaluate(lock: LockInfo, threshold_minutes: int | None = None) -> ReleaseDecision:
    threshold = min_age_minutes() if threshold_minutes is None else max(0, threshold_minutes)
    if threshold == 0:
        return ReleaseDecision(True, "age guard disabled")
    if lock.age_minutes is None:
        return ReleaseDecision(False, f"lock creation time is unknown — set {ENV_MIN_AGE_MINUTES}=0 to release it anyway")
    ...
```

- **Docstrings that explain why**, so a "simplification" doesn't remove a fix.

The decision I'd revisit: the stub installs `PyYAML>=6.0` and `python-dotenv>=1.0` with `pip` at run
time if they're missing. Version ranges installed on demand make runs non-reproducible; a pinned
requirements file installed by the setup action is the fix.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Platform decisions I'd own:

- **Per-repo backends** declared in `config.yaml` (`type`, storage details, `key`), with an optional
  `backend_auth_alias` so state is written with different credentials from deployments.
- **One unit per resource type**, each with its own state file and lock.
- **Plans and applies one stack at a time** (`max-parallel: 1`) in CI.
- **Gates configured per consumer** (`policy_scanner`, `security_scanner`, each with `enabled`, `scanner`,
  `enforcement`).
- **Weekly drift scans** with Teams and Jira reporting.

```yaml
policy_scanner:
  enabled: true
  scanner: open-policy-agent
  enforcement: soft-mandatory
```

```bash
yq '.backend[0] | {type, key, backend_auth_alias}' config.yaml
yq '.workflow[0].iac_shared_module_ref' config.yaml
```

What I'd change: CI authenticates with service-principal client secrets from GitHub secrets, even though
the template already grants `id-token: write`. Moving to federated credentials removes every long-lived
CI secret.

</div>

</details>

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q4">
<summary>Who were the users and stakeholders, and how did their needs shape the design?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Persona | Needs | Shaped |
|---|---|---|
| Consumer engineers (app and platform teams) | Describe resources without knowing HCL | YAML-only consumers; folder names as configuration |
| Infrastructure contributors | Add a resource type safely | Module validator; one module per type; README with import example |
| Platform maintainers | Change shared code without breaking consumers | Compatibility workflow; generated-output diffs; pinned refs |
| CI/CD maintainers | One pipeline, not thirty | Reusable workflows called by ref |
| Reviewers and approvers | Understand a change quickly | Plan summary tables in the PR, not YAML diffs |
| Support and operators | Diagnose failures | Error catalog; lock recovery; drift tickets |
| Security and audit | Every change checked and recorded | Gates on every plan; approvals; evidence |

The biggest shaping need was **consumers who aren't Terraform experts**. That's why a consumer never
writes HCL, never touches a backend block and never edits a pipeline, and why the CLI prints a banner of
exactly what it's about to do before touching anything.

The second was **reviewers**: a YAML diff doesn't tell you a resource group is about to be replaced, a
plan summary does.

Deeper: [User flows](/posts/projects/y-iac/04-user-experience-and-design/#user-flows).

</div>

</details>

## System Design and Architecture
{: #system-design-and-architecture }

<details class="project-iq" markdown="1" id="system-design-and-architecture-q1">
<summary>If you had to design this application from scratch on a whiteboard, with a frontend, a backend and a data store, how would you approach it?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I'd map the classic layers onto an IaC platform first, because that framing makes the design obvious:

| Classic layer | Y-IaC equivalent |
|---|---|
| Frontend | YAML files, the CLI banner, the PR plan summary |
| Backend | Python CLI + Terragrunt + Terraform modules |
| Data store | Terraform state per unit, in a versioned backend |
| API contract | YAML shapes, module variables, environment variable names, workflow inputs |

Then the design steps:

1. **One source of truth** for modules, generation logic and pipelines; consumers hold only intent.
2. **Generate, don't copy.** Consumer YAML becomes Terragrunt units at run time, so improvements reach
   everyone through a ref change.
3. **Small blast radius in state:** one unit per resource type, each with its own state file and lock.
4. **Identity from the environment**, never from YAML; separate state credentials from deployment ones.
5. **Gates on the plan, not the code:** policy, security and cost run on plan JSON.
6. **Versioned delivery:** consumers pin a ref; releases are tested against real consumers.
7. **Close the loop:** plan-after-apply and scheduled drift detection.

The [animated system diagram](/posts/projects/y-iac/05-technical-architecture/#system-context-and-component-architecture)
and the two-part run walkthrough are the pictures I'd draw.

</div>

<div class="iq-role" data-role="developer" markdown="1">

On the whiteboard I'd add the code contracts:

1. **A YAML schema per resource type**, generated from each module's `variables.tf`, validated before
   generation.
2. **A generator that's a pure function**: YAML in, `terragrunt.stack.hcl` and merged `common_vars` out, so
   it's unit-testable with fixtures.
3. **Unit templates with `try()` defaults**, so minimal YAML still produces valid module inputs, and
   `mock_outputs` so a unit can plan before its dependencies exist.
4. **One credential resolver** (`environment/credentials.py`), environment variables only.
5. **Gates as plugins on plan JSON** (`validation/base.py` with one class per scanner).
6. **Redaction before anything leaves the run** (`reporting/redaction.py`).

```hcl
locals {
  config      = yamldecode(file(find_in_parent_folders("resources.yaml")))
  common_vars = yamldecode(file(find_in_parent_folders("common_vars.yaml")))
  include_azurerm_subnet = try(local.config.azurerm_subnet != null && length(local.config.azurerm_subnet) > 0, false)
}
```

That `locals` block is the whole contract between YAML and a unit: read both files, decide which
dependencies are enabled, and pass typed values to the module.

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q2">
<summary>What are the main components, and how are responsibilities split between them?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Component | Location | Job |
|---|---|---|
| Entrypoint stub | `entrypoint.py` (identical in every consumer) | Find the shared module, put `src/` on the path, call the CLI |
| Shared CLI | `src/<org>_iac/` | Parse, bootstrap, validate, authenticate, dispatch, generate, report |
| Terraform modules | `cloud/<cloud>/terraform/<type>/`, `providers/<provider>/terraform/<type>/` | The resources themselves |
| Terragrunt unit templates | `cloud/<cloud>/terragrunt/<type>/terragrunt.hcl` | Map YAML entries to module inputs |
| Root template | `template/root.hcl` | Generate `provider.tf` and `backend.tf`; retries; hooks |
| Config catalog | `config/` | Provider versions, backends, OPA, scanners, Infracost, Jira, error catalog |
| Automation | `.github/workflows/`, `.github/actions/` | Plan, apply, drift, summaries, notifications, compatibility |
| Module validator | `tools/validate_terraform_module.py` | fmt, init, schema, validate, TFLint, docs |

The CLI package itself is split by responsibility: `bootstrap`, `cli`, `config`, `core`, `environment`
(backend, credentials, Azure auth), `generators` (stack generation, merges, dependency graph),
`handlers` (Terragrunt, state lock, Ansible), `reporting` and `validation`.

The architectural fact I'd lead with: **a consumer contains no Terraform or Terragrunt logic at all.**
That's what makes the platform consistent, and also why a bug in the shared path is a bug in every
consumer.

Deeper: [Components](/posts/projects/y-iac/05-technical-architecture/#system-context-and-component-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Responsibilities in code:

| Concern | Module | Notes |
|---|---|---|
| Arguments | `cli/parser.py`, `cli/arg_validation.py` | `--cloud`, `--environment`, `--stack`, `--terragrunt`, gate flags |
| Environment | `cli/env_export.py` | `CLOUD`, `ENVIRONMENT`, `STACK`, gate and lock variables for `root.hcl` |
| Credentials | `environment/credentials.py`, `azure_auth.py` | Default and per-subscription credentials |
| Generation | `generators/stack_generator.py`, `common_vars_merge.py`, `dependency_graph.py` | Stack file, merged vars, waves |
| Running | `handlers/terragrunt/`, `handlers/statelock/` | Terragrunt calls, lock detect and release |
| Gates | `validation/opa.py`, `trivy.py`, `wiz.py`, `infracost.py`, `repository.py` | Plan JSON in, findings out |
| Output | `reporting/plan_summary.py`, `redaction.py`, `error_report.py`, `log_processor.py` | Summaries, redaction, catalog matches |

```bash
python -m <org>_iac --help
pytest tests -k "statelock or common_vars"
```

The boundary that matters most is `env_export.py`: the environment variable names it sets are read by
`root.hcl`. Rename one side without the other and every consumer silently gets a default, so that pair
deserves a contract test.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Responsibilities in CI:

| Job | Workflow | Runs |
|---|---|---|
| Build variables | Consumer template | Reads `config.yaml` with `yq`: org, shared repo, runner, `iac_shared_module_ref` |
| Change detection | `detect-changes.yaml` | Which stacks changed |
| Plan | `terragrunt-ci.yaml` (matrix, `max-parallel: 1`) | Setup, credentials, init and plan, gates |
| Summary | `terragrunt-summary-report.yaml` | PR summary |
| Apply | `terragrunt-cd.yaml` (matrix, `max-parallel: 1`, environment approval) | Apply |
| Verify | `terragrunt-ci.yaml` again | Plan after apply |
| Drift | `iac-scheduled-drift-scan.yaml` + analyze + Jira + Teams | Weekly |

```bash
gh api repos/<owner>/<consumer>/environments/production | jq '.protection_rules'
```

The runner is configurable (`iac_runner`); one consumer uses a self-hosted runner label. Self-hosted
runners for IaC need care: the same machine handles credentials for many runs, so they should be
ephemeral (one job per runner) to avoid cache and credential leakage between jobs.

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q3">
<summary>Which non-functional requirements drove the architecture the most?</summary>

<div class="iq-role" data-role="architect" markdown="1">

- **Reproducible and reviewable.** The same YAML at the same Y-IaC ref must produce the same generated
  files and the same plan. That's why everything generated is ignored by Git and rebuilt on every run, and
  why "run it again" is a safe instruction.
- **State safety first.** Losing or corrupting state makes Terraform think production resources don't
  exist. Per-unit state, versioned backends, age-guarded lock release and a rehearsed restore come from
  this.
- **Backward-compatible module inputs.** A renamed variable is a breaking change for every consumer, so
  unit templates accept old and new shapes for a release, and modules should use `moved` blocks (only
  one module has one today).
- **No secrets in committed config.** Credentials only arrive as environment variables.
- **Clear failures.** Every error should say what failed, where and what to do; the error catalog
  (`config/error_message_and_solutions.yaml`) is the mechanism.
- **Testable without production.** Module and CLI behaviour must be testable without live credentials.

The priority order from the guide is explicit and I'd quote it: **state safety and security first,
convenience last.** It decides arguments about the roadmap.

Deeper: [Non-functional requirements](/posts/projects/y-iac/02-requirements-gathering/#non-functional-requirements).

</div>

<div class="iq-role" data-role="sre" markdown="1">

The NFRs as measurable indicators:

| NFR | SLI |
|---|---|
| State safety | Lock releases that hit a live run (target 0); state restores needed |
| Reproducibility | Plan-after-apply clean rate |
| Backward compatibility | Consumer plans changed by a platform release (compatibility run diff) |
| Clear failures | Share of failures matched to an error-catalog entry |
| No secrets in config | Secret-scanner hits in consumer repos (target 0) |
| Fast feedback | p95 plan time per changed stack |

The SRE observation from the code: the retry block in `root.hcl` retries "state blob is already locked"
three times, 30 seconds apart. That smooths over a short overlap, but it also means a stuck lock costs
90 seconds before the lock handler gets involved, which is worth knowing when reading run durations.

```hcl
retryable_errors   = [".*Error: transient network issue.*", "(?s).*in use by.*and cannot be deleted.*", "(?s).*Error acquiring the state lock.*state blob is already locked.*"]
max_attempts       = 3
sleep_interval_sec = 30
```

(The list is shortened; those three patterns are in it.)

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q4">
<summary>Which architectural options did you consider and reject, and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

- **Each team owns full Terraform.** The status quo; rejected because decisions get remade and drift.
- **Copying shared modules into consumers.** Rejected: copies diverge and fixes don't propagate. Consumers
  sync from Y-IaC on each run, and a fix in a synced copy is overwritten by design.
- **Plain Terragrunt without a CLI.** Rejected: it can't validate subscription mappings, choose credentials
  per subscription, lint YAML for duplicate keys or merge tags safely.
- **One unit per resource instance.** Rejected for one unit per **resource type**: a stack with 40 key
  vaults is one unit, which keeps plan time and lock contention sane.
- **One state file per environment.** Rejected: one large state locks everything and widens the blast
  radius of any mistake.
- **Copying pipelines into consumers.** Rejected for reusable workflows called by ref.
- **Gates as code-only linting.** Not enough: policy, security and cost run on the **plan**, so a valid
  YAML that produces a non-compliant resource is still caught.
- **Floating "latest" versions.** Rejected: provider versions pinned centrally, consumers pin a Y-IaC ref.

One open option I'd mention: Terraform's licence change pushes some teams to OpenTofu, and nothing in the
design blocks that switch.

Deeper: [Technology selection](/posts/projects/y-iac/05-technical-architecture/#technology-and-framework-selection).

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q5">
<summary>Monolith, modular monolith or microservices, what did you choose and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Neither label applies to a platform that isn't deployed as a service, so I'd reframe it: Y-IaC is a
**modular monorepo delivered as a library**, executed inside each consumer's run.

- **One repository** holds modules, CLI, templates, config and workflows, so a change to a shared contract
  (say, an environment variable name used by both the CLI and `root.hcl`) lands atomically.
- **Strong internal modules:** each Terraform module is independent; the CLI package is split by
  responsibility with its own tests.
- **Execution is per consumer, per stack, per unit:** units run in dependency waves, each with its own
  state.

Why not split modules into separate repos (a "microservices" approach to modules)? Version skew. With 175
modules, separate versioning would make every consumer resolve a compatibility matrix by hand. A single
ref gives a consistent, tested set, and the compatibility workflow checks that set against real consumers.

The trade-off I'd own: **the shared path is a single point of failure.** The mitigations are that
consumers pin refs (so a bad release reaches them only when they move), releases are trialled on
volunteer consumers, and pinning back is the one-hour recovery.

Deeper: [Hosting model](/posts/projects/y-iac/05-technical-architecture/#hosting-and-deployment-model).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The modular monorepo in code:

- **Modules are independent Terraform roots** with their own `variables.tf`, `outputs.tf` and README; the
  validator runs on each touched module.
- **The CLI is one package** with internal boundaries by folder and tests per folder.
- **Unit templates** reference modules by path relative to the shared module:

```hcl
terraform {
  source = "${dirname(find_in_parent_folders("terragrunt_shared_module"))}/terragrunt_shared_module/cloud/azure/terraform/azurerm_key_vault"
}
```

That path-based source is what makes the whole thing a library rather than a set of published modules: a
consumer at a given ref gets exactly the modules at that ref, with no registry or version matrix.

Gotcha: because units find the shared module by searching parent folders, a stray folder named
`terragrunt_shared_module` higher up the tree (for example a second checkout) wins the search. The CI
layout avoids it; on laptops it's a real source of "it plans differently on my machine".

</div>

<div class="iq-role" data-role="devops" markdown="1">

Operationally, the monorepo ships as one ref:

- **One tag** (`v1.0.0` so far) covers modules, CLI, templates and workflows.
- **Consumers choose when to move**, by changing `iac_shared_module_ref` and the `uses:` refs.
- **The compatibility workflow** (`terragrunt-compatibilty.yaml`) plans real consumer stacks against a
  branch before a release.

```bash
gh workflow run terragrunt-compatibilty.yaml -f branch=<release-branch>
git tag -a v1.1.0 -m "Release v1.1.0" && git push origin v1.1.0
```

The single point of failure is the shared path, and the operational mitigation is adoption tracking: a
scheduled job that reads every consumer's `config.yaml` and lists `iac_shared_module_ref` per repo, so
before a breaking change you know who's still on `main` and will get it immediately.

</div>

</details>

## Technology Choices
{: #technology-choices }

<details class="project-iq" markdown="1" id="technology-choices-q1">
<summary>Which technologies did you use across the stack, and why those?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Choice | Why | Trade-off |
|---|---|---|
| Terraform | Provider coverage for every target: Azure, AWS, GCP, GitHub, JFrog, Grafana, Zscaler | Licence change; OpenTofu remains an option |
| Terragrunt stacks | Generated units, per-unit state, DRY root config, dependency ordering | Newer feature; CLI has changed between releases |
| Python 3.12 CLI | Validation, auth, generation and reporting in one testable place | Another runtime on every runner |
| YAML for consumers | Readable by non-HCL users; easy to lint | No type system; validation must be explicit |
| Reusable GitHub Actions | Consumers call shared workflows by ref | Ref management becomes a release concern |
| OPA, Trivy or Wiz, Infracost | Policy, security and cost on the same plan JSON | Three tools to keep configured |
| TFLint, yamllint, ruff, pytest | Quality at each layer | |
| Jira, Microsoft Teams | Drift tickets and notifications where teams already work | |
| Ansible (optional) | Configuration after provisioning | |

The theme: **pick the standard tool for each layer, and put the glue in one place you can test.** The
Python CLI is that glue, and it's why the platform can enforce things the tools alone can't, like
repo-to-subscription guardrails and duplicate-key detection in YAML.

Deeper: [Technology selection](/posts/projects/y-iac/05-technical-architecture/#technology-and-framework-selection).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The tools, as used:

- **Terraform** modules with pinned providers from `config/providers.yaml`.
- **Terragrunt stacks**: `terragrunt.stack.hcl` with one unit per resource type; `include "root"`;
  `dependency` blocks with `enabled` flags and `mock_outputs`.
- **Python 3.12**: `argparse` CLI, PyYAML, python-dotenv, `subprocess` for Terragrunt and Terraform,
  `hashlib` for content hashes and fingerprints, `pytest` and `ruff`.
- **OPA** policies in `config/opa/policies/` (azure, global, zscaler) run against plan JSON.
- **Trivy or Wiz** chosen per consumer (`--iac-scanner`), **Infracost** for cost, **TFLint** in the module
  validator.

```bash
terraform show -json tfplan > plan.json
opa eval -i plan.json -d config/opa/policies/azure --format json "data.terraform.deny"
```

That's the same `opa eval` call the CLI makes per policy (the query is `data.<package>.deny`), which is
how I'd reproduce a finding outside a run. Gotcha:
Terragrunt's stack commands changed between releases, so the Terragrunt version is pinned in the setup
action, and a local Terragrunt that's newer or older than CI's produces confusing differences.

</div>

<div class="iq-role" data-role="devops" markdown="1">

The CI toolchain:

| Tool | How it's installed | Pinned? |
|---|---|---|
| Terragrunt, TFLint, kubelogin | `setup-environment` action, cached by version | Yes, via inputs |
| Wiz CLI | Same action | Defaults to latest when the input is empty |
| Python deps | Stub `pip install` of ranges; `requirements.txt` in the repo | Ranges at run time |
| Terraform providers | `config/providers.yaml` | Yes |
| Runner | `iac_runner` from `config.yaml` | Label |

```yaml
- uses: actions/cache@v5
  with:
    path: |
      ~/.local/bin/tflint
      ~/.local/bin/kubelogin
      ~/.local/bin/wizcli
```

What I'd pin next: the Wiz CLI version (an unpinned scanner changes gate results without a code change),
and the reusable workflow refs in consumers.

</div>

</details>

<details class="project-iq" markdown="1" id="technology-choices-q2">
<summary>How do you evaluate and choose between competing technologies?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I evaluate on four axes, weighted for a shared platform:

1. **Blast radius of a mistake.** In a shared platform, every choice is multiplied by the number of
   consumers. Terragrunt's per-unit state won over larger state files on this alone.
2. **Who has to understand it.** Consumers write YAML because it's readable by people who don't know HCL;
   the cost (no type system) is paid once, in validation code.
3. **Testability.** Glue logic in Python can be unit-tested; the same logic in HCL functions can't easily
   be. That decided the CLI.
4. **Exit cost and lock-in.** Terraform vs OpenTofu is a live example: the design keeps the switch
   possible. Similarly `iac_scanner` lets a consumer choose Wiz, Trivy, both or none, so the security
   scanner isn't hard-wired.

For tools that run in CI, I add **pinning**: the Wiz CLI defaulting to "latest" when unpinned is a
finding, because a tool that changes behaviour on its own changes gate results without a code change.

The decisions that are hard to reverse go into ADRs (backend strategy, provider version policy,
enforcement levels), and the ones not yet made (deprecation policy) are listed as open, rather than
decided implicitly.

</div>

<div class="iq-role" data-role="developer" markdown="1">

How I'd evaluate a tool for this codebase:

1. **Can I test it without a cloud?** Fixture plan JSON made OPA easy to adopt (`test_opa.py`); a tool that
   only works against live resources is hard to gate on.
2. **Does it read the plan, or the code?** Plan-based tools catch what YAML produces; code linters miss
   generated values.
3. **Does it have a stable output format?** Gates parse JSON; a tool whose output changes between versions
   is a maintenance cost.
4. **Is the logic better in Python or HCL?** Anything with branching, merging or validation went into
   Python, because HCL functions are hard to test.

```python
def enforce(self, outcome: ValidationOutcome, override: bool = False) -> ValidationOutcome:
    if not outcome.findings:
        outcome.blocked = False
        return outcome
    level = self.enforcement_level
    if level == ADVISORY:
        outcome.blocked = False
    elif level == MANDATORY:
        outcome.blocked = True
    else:
        outcome.blocked = not override     # soft-mandatory: the --*-override flag lets it through
    return outcome
```

That's `BaseValidator.enforce()` in `validation/base.py`; each scanner subclasses `BaseValidator`, and
the default level is soft-mandatory. The design
choice that made adding Wiz cheap: a common base and a selector (`--iac-scanner wiz|trivy|both`), so a new
scanner is one module, not a pipeline change.

</div>

</details>

<details class="project-iq" markdown="1" id="technology-choices-q3">
<summary>Where did you build, and where did you buy or reuse?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Reused:** Terraform and its providers, Terragrunt (including the newer `stack` feature), OPA, Trivy,
Wiz (a commercial service), Infracost, TFLint, GitHub Actions, Jira and Teams. None of those were worth
rebuilding.

**Built**, because they encode how *we* want infrastructure done:

- **175 modules** with a consistent interface and a README with inputs, outputs, a YAML example and an
  import command;
- **unit templates** that map YAML to module inputs with sensible `try()` defaults;
- **`root.hcl`**, which generates providers and backends from config;
- **the CLI**: bootstrap sync, validation (including the repo-to-subscription guardrail and duplicate-key
  linting), credential resolution, stack generation, common-vars merging, dependency waves, state-lock
  recovery, auto-import, plan summaries, error reports with catalog matches, and visualization;
- **reusable workflows** for plan, approved apply, plan-after-apply, drift, Jira and Teams;
- **OPA policies** (10 rego files) for the organization's rules.

What I'd point out: we deliberately didn't build a portal or a service around it. A CLI plus GitHub
Actions meant no new runtime to operate.

Deeper: [Implementation](/posts/projects/y-iac/09-implementation/#feature-development).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Reused versus built, in delivery terms:

- **Reused**: GitHub Actions and environments, `actions/cache`, the Terraform registry, Infracost, Wiz (a
  service), Jira, Teams webhooks, GitHub Pages for the module docs.
- **Built**: every reusable workflow, the four composite actions, the drift analysis and Jira tool
  (`tools/jira_drift_ticket/`), the docs site builder, the module validator.

```bash
gh workflow run docs-pages.yaml
python tools/validate_terraform_module.py cloud/azure/terraform/azurerm_key_vault
```

What I'd buy or reuse instead of build next time: a managed IaC orchestration product would replace much
of the workflow layer, but at the cost of the YAML-only consumer model and the guardrails in the CLI.
For this organization, keeping the workflows in-house was right; I'd still evaluate it before writing a
fifth composite action.

</div>

</details>

## Frontend Architecture
{: #frontend-architecture }

<details class="project-iq" markdown="1" id="frontend-architecture-q1">
<summary>How is the frontend (or user-facing interface) structured, in terms of framework, routing, components and state?</summary>

<div class="iq-role" data-role="architect" markdown="1">

There's no web frontend; the user interface is **YAML, a CLI and the PR summary**, and it's designed
with the same care:

- **"Routing" is the folder layout.** `environments/<cloud>/<environment>/<stack>/` is parsed by
  `root.hcl` (the cloud folder picks the backend namespace) and maps one to one to the CLI's `--cloud`,
  `--environment` and `--stack` arguments. Folder names *are* configuration.
- **"Components" are YAML files with clear scopes:** `config.yaml` (backend and workflow settings per
  repo), `common_vars.yaml` (account, providers, tags, gates per environment, optionally overridden per
  stack) and `resources.yaml` (what to create, keyed by resource type).
- **"State"** is the merged view the CLI builds: environment and stack `common_vars` merged into
  `.terragrunt-stack/common_vars.yaml`.
- **The CLI banner** shows exactly what's about to happen (cloud, environment, stack, action, gates)
  before anything runs.
- **The PR plan summary** is the reviewer's screen: add, change and destroy counts per unit, gate results.
- **The docs site** (generated from module READMEs, published to GitHub Pages) is the catalog browser.

If I were asked to add a real UI, it would be a self-service form in the developer portal that writes
YAML into a PR, not a replacement for the YAML.

Deeper: [Information architecture](/posts/projects/y-iac/04-user-experience-and-design/#information-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The "UI" as code:

- **Routing is folders**: `environments/<cloud>/<environment>/<stack>/`; `root.hcl` parses the path, and
  the CLI's `--cloud`, `--environment` and `--stack` map one to one.
- **Components are YAML files**: `config.yaml` (repo), `common_vars.yaml` (environment, optionally
  stack), `resources.yaml` (stack), keyed by resource type:

```yaml
azurerm_resource_group:
  - name: <rg-name>
    location: eastus
azurerm_key_vault:
  - name: <kv-name>
    resource_group_name: <rg-name>
    private_endpoint:
      enabled: true
      subnet_name: <subnet>
```

- **State** is the merged view: stack and environment `common_vars` merged into
  `.terragrunt-stack/common_vars.yaml`.
- **Rendering** is the banner (`cli/banner.py`) and the plan summary tables (`reporting/tables.py`).

Gotcha: YAML keys are resource types, and lists hold instances, so a typo in a key (`azurerm_keyvault`)
isn't an error in YAML; it's a type with no unit template. The lint step should reject unknown keys
against the list of templates, not just duplicates.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-architecture-q2">
<summary>How does the user interface handle loading, errors and large data sets?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Errors** are where a CLI's UX lives or dies, and the platform treats them as a product feature:

- **An error catalog** (`config/error_message_and_solutions.yaml`) matches known failures and prints a
  suggested fix, so Tier 0 support is the CLI itself.
- **Validation before generation** catches YAML mistakes with a specific message: duplicate keys (YAML
  silently keeps the last one, which would quietly drop a resource), a `resources.yaml` with no resource
  lists (with an example of what was expected), unknown subscriptions.
- **Final reports** summarize what ran, what failed and why.

**Large output** is the "large data set" here: a 30-unit stack produces a lot of log. A log processor
shortens timestamps and abbreviates unit names (`[.terragrunt-stack/azurerm_windows_virtual_machine]`
becomes `[azwvm]`), so the log stays readable, and the PR summary condenses plans into a table per unit.

**Loading** is long-running work: plans can take minutes, so the CLI prints progress per unit and the
workflow shows each stack as its own job.

The UX rule: a failed run should tell you whether it's **your YAML, your cloud, or the platform**, because
that's the first question everyone asks.

Deeper: [Content and messaging](/posts/projects/y-iac/04-user-experience-and-design/#content-and-messaging).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Errors and large output, in code:

- **Duplicate keys**: PyYAML keeps the last duplicate silently, so `resources_lint.py` inspects the
  *composed node graph* (`compose_yaml` + `find_duplicate_keys`) rather than the parsed dictionary, and
  reports repeated types, repeated keys at any depth, and repeated names where the module keys `for_each`
  on the name. It's report-only by design: merging would mean guessing, and guessing wrong destroys
  infrastructure.
- **Empty resources**: a `resources.yaml` with no lists fails with an example of the expected shape.
- **Error catalog**: `reporting/error_catalog.py` matches output against
  `config/error_message_and_solutions.yaml` and prints a suggested fix.
- **Long logs**: `reporting/log_processor.py` shortens timestamps and abbreviates unit names
  (`[.terragrunt-stack/azurerm_windows_virtual_machine]` becomes `[azwvm]`).

```python
def find_duplicate_keys(node: yaml.Node | None, path: str = "") -> list[DuplicateKey]:
    if isinstance(node, yaml.MappingNode):
        return _mapping_duplicates(node, path)
    if isinstance(node, yaml.SequenceNode):
        duplicates: list[DuplicateKey] = []
        for index, item in enumerate(node.value):
            duplicates.extend(find_duplicate_keys(item, f"{path}[{index}]"))
        return duplicates
    return []
```

Gotcha: because it's report-only, a duplicate shows as a warning in the log and the plan then proposes a
destroy of the first block's resource. The plan summary's destroy count is the real safety net, so
reviewers have to read it.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-architecture-q3">
<summary>How do you keep the frontend fast and accessible?</summary>

<div class="iq-role" data-role="architect" markdown="1">

For a CLI and YAML interface, "fast" means **fast feedback** and "accessible" means **understandable by
people who aren't Terraform experts**.

**Fast feedback:**

- validation and linting run before any cloud call, so a typo fails in seconds;
- bootstrap sync only copies when the content hash changes;
- a plugin cache is configured for provider downloads (see the caching answer for a catch);
- CI only plans changed stacks;
- independent units run in parallel within dependency waves.

The target I'd set (an estimate, not yet measured): under 3 minutes for a single-unit change and under
10 minutes for a 30-unit stack on a hosted runner.

**Accessible:**

- YAML instead of HCL, with `try()` defaults so a minimal entry still produces a valid module input;
- yamllint config shipped to consumers;
- a persona-based getting-started path with numbered guides;
- module READMEs with a YAML example and an import command;
- plain-language plan summaries for reviewers.

What I'd add: a **JSON Schema per resource type**, generated from each module's `variables.tf`, so
editors validate `resources.yaml` as people type, and a cookbook of short YAML recipes, because people
copy examples far more than they read references.

Deeper: [Data validation](/posts/projects/y-iac/07-data-and-integration/#data-validation-and-quality).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Fast feedback and approachability in code:

- **Fail before any cloud call**: argument validation, YAML lint, the repository guardrail.
- **Content-hash bootstrap**: copy shared files only when their hash changes.
- **Dependency waves**: Terragrunt runs units in dependency order; `generators/dependency_graph.py`
  computes the same waves to print the graph, so you can see what will run in parallel.
- **`try()` defaults** in unit templates, so minimal YAML works.
- **Readable output**: the banner, short unit names, summary tables.

```python
while remaining:
    wave = sorted(unit for unit, deps in remaining.items() if deps <= completed)
    if not wave:                         # cycle, or a unit that was never generated
        wave = sorted(remaining)
    waves.append(wave)
    completed.update(wave)
    for unit in wave:
        remaining.pop(unit)
```

That's `compute_execution_waves()`: a Kahn-style topological layering that doesn't raise on a cycle, so
the graph still prints. The approachability feature I'd add
in code is a JSON Schema per resource type generated from `variables.tf`, so editors like VS Code validate
`resources.yaml` as you type. It's mostly a generator over files that already exist.

</div>

<div class="iq-role" data-role="sre" markdown="1">

"Fast" for a CLI platform, as SLIs:

| SLI | Target |
|---|---|
| Time to first error for invalid YAML | Seconds (no cloud calls) |
| p95 plan time, single-unit change | Under 3 minutes |
| p95 plan time, 30-unit stack | Under 10 minutes |
| Runner setup time (cache hit) | Under 1 minute |
| Weekly drift scan duration, largest consumer | Tracked, alert on doubling |

These come from GitHub Actions run data, which is the only telemetry the platform has. I'd export it with
a small scheduled job (`gh api` over each consumer's workflow runs) into a table, because without a
baseline nobody can tell whether a release made every consumer slower.

```bash
gh api "repos/<owner>/<consumer>/actions/workflows/terragrunt-cicd.yaml/runs?per_page=50" \
  | jq '.workflow_runs[] | {conclusion, run_started_at, updated_at}'
```

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-architecture-q4">
<summary>How is the frontend built, configured per environment and served?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The "frontend" is delivered by **bootstrap**, not a build:

- Each consumer has the identical `entrypoint.py` stub. On a laptop it finds Y-IaC cloned next to the
  consumer; in CI the reusable workflow checks out Y-IaC at the ref from the consumer's `config.yaml`
  (`iac_shared_module_ref`).
- Bootstrap syncs the needed pieces into the consumer when the content hash changes: the CLI, `root.hcl`,
  the consumer workflow template, a Taskfile and `.gitignore`.
- The stub installs its two runtime dependencies (PyYAML, python-dotenv) if missing.

**Per environment**, configuration is layered:

| Layer | Holds |
|---|---|
| Consumer `config.yaml` (then the shared one as fallback) | Backend entry, workflow settings, Y-IaC ref, runner |
| `common_vars.yaml` per environment, overridden per stack | Account or subscriptions, providers, tags, gate toggles |
| `config/providers.yaml` | Pinned provider versions, with per-unit azurerm overrides |
| Environment variables | Credentials only |

The **module reference docs** are built from READMEs by `docs/site/build_docs.py` and published to
GitHub Pages.

Deeper: [Hosting model](/posts/projects/y-iac/05-technical-architecture/#hosting-and-deployment-model).

</div>

<div class="iq-role" data-role="developer" markdown="1">

How the "frontend" reaches a consumer, in code:

- **`entrypoint.py`** resolves the shared module root (`GITHUB_ACTIONS` decides local or CI layout),
  installs PyYAML and python-dotenv if missing, puts `src/` (and the legacy root) on `sys.path`, and calls
  `<org>_iac.cli.app.main`, falling back to the old `python/lib` CLI.
- **Bootstrap** copies `root.hcl`, the workflow template, a Taskfile and `.gitignore` into the consumer when
  the content hash changes.
- **Config fallback**: the consumer's `config.yaml`, then the shared one.

```python
def _resolve_cli_main():
    try:
        from <org>_iac.cli.app import main as cli_main
        return cli_main
    except ImportError:
        from terragrunt_shared_module.python.lib.cli import main as cli_main
        return cli_main
```

Gotcha: that
fallback hides import errors in the new package, because any `ImportError` (a missing dependency inside
the CLI) silently drops to the old CLI. Catching only `ModuleNotFoundError` for the package name itself
would surface real errors.

</div>

<div class="iq-role" data-role="devops" markdown="1">

How the CLI and templates get onto runners:

1. The consumer workflow's build job reads `config.yaml` with `yq` and resolves the shared module version:
   `iac_shared_module_ref`, else the workflow input, else an env default.
2. Reusable jobs check out the shared repo at that ref inside the consumer workspace.
3. `setup-environment` installs tools from cache; `resolve-credentials` exports `ARM_*` and `BACKEND_*`
   variables from secrets, with per-subscription prefixes.

```bash
IAC_SHARED_MODULE_REF=$(yq -r '.workflow[0].iac_shared_module_ref // ""' config.yaml)
```

The **docs site** builds from module READMEs (`docs/site/build_docs.py`) and publishes with
`docs-pages.yaml`. Gotcha: a consumer on a feature-branch ref (one consumer is, while trialling a new
provider) gets that branch's CLI and workflows; when the branch is deleted after merge, its runs fail at
checkout. Moving trial consumers back to a tag right after merge is part of the release checklist.

</div>

</details>

## Backend and API Design
{: #backend-and-api-design }

<details class="project-iq" markdown="1" id="backend-and-api-design-q1">
<summary>How do CRUD operations work in the backend, from request to persisted data?</summary>

<div class="iq-role" data-role="architect" markdown="1">

For infrastructure, CRUD maps onto the Terraform lifecycle, driven declaratively from YAML:

| Operation | User action | What happens |
|---|---|---|
| Create | Add an entry to `resources.yaml` | Plan shows an add; approved apply creates it; state records it |
| Read | Plan, or `terragrunt output` / state commands | Terraform refreshes against the cloud API and compares with state |
| Update | Change the YAML entry | Plan shows an in-place change or a replacement; reviewers check which |
| Delete | Remove the entry (or `destroy`) | Plan shows a destroy; apply removes it |

The request path for one change: YAML in a PR → CLI validates and generates the stack → Terragrunt units
→ `root.hcl` generates provider and backend → Terraform plans against the provider API and the unit's
state → gates run on plan JSON → summary posted → merge → plan again on `main` → approval → apply →
state written to the backend → plan-after-apply must show no changes.

Two sharp edges I'd mention: an **update can be a replacement**, which for stateful resources needs a
restore path in the PR; and **removing a stack folder doesn't delete anything**. The resources and state
stay, unmanaged. Decommissioning is always `destroy` first, folder second.

Deeper: [Deployment runbook](/posts/projects/y-iac/13-deployment-and-go-live/#deployment-runbook).

</div>

<div class="iq-role" data-role="developer" markdown="1">

CRUD as code paths:

- **Create**: an entry under a resource-type key in `resources.yaml`; the generator emits a unit for that
  type; the unit template maps entries to module inputs (usually a map keyed by `name` for `for_each`).
- **Read**: `terragrunt run output`, or the CLI's plan summary; `reporting/plan_converter.py` turns the
  binary plan into JSON for summaries and gates.
- **Update**: change an attribute; the plan shows update in place or replace (`-/+`), and the summary
  counts it.
- **Delete**: remove the entry; the module's `for_each` drops the key; the plan shows a destroy.

```hcl
inputs = {
  keyvaults = {
    for keyvault in try(local.config.azurerm_key_vault, []) : keyvault.name => {
      name                = keyvault.name
      resource_group_name = keyvault.resource_group_name
      location            = try(keyvault.location, "")
      tenant_id           = try(keyvault.tenant_id, "")
      # …
    }
  }
}
```

That's the key vault unit template: a map keyed by `name`, with `try()` defaults. Two developer gotchas follow from
`for_each` on `name`: renaming an entry is a destroy and create unless the module has a `moved` block for
it, and two entries with the same name collapse into one (the lint reports that, but only as a warning).

</div>

</details>

<details class="project-iq" markdown="1" id="backend-and-api-design-q2">
<summary>How did you design the API, in terms of style, resources, versioning, pagination and errors?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Y-IaC has **no HTTP API**. Its contracts are files, environment variables and workflow inputs, and they
need the same discipline an API would:

| Contract | Producer → consumer | Versioned by |
|---|---|---|
| `resources.yaml`, `common_vars.yaml`, `config.yaml` shapes | Consumer → CLI and unit templates | Config reference docs |
| Module variables and outputs | Module → unit template → other units | Module README, validator |
| Dependency mock outputs | Unit template → first plan of a new stack | Unit template |
| Environment variable names | CLI → `root.hcl` → providers | `cli/env_export.py`, `root.hcl` |
| Reusable workflow inputs | Consumer workflow → Y-IaC workflows | The consumer's pinned ref |
| Plan JSON and report formats | Terraform → gates and reports | Terraform's JSON format version |
| Teams and Jira payloads | Drift workflows → Teams, Jira | Workflow and Jira config |

**Resources** are keyed by type (`aws_vpc`, `azurerm_key_vault`), one unit per type. **Versioning** is the
ref consumers pin, plus backward-compatible inputs for at least one release (a `try()` fallback in the
unit template) and a CHANGELOG entry saying when the old shape stops working. **Errors** are catalogued
with suggested fixes.

The design point: **a renamed module variable is a breaking API change for every consumer that sets it**,
so it's treated like one.

Deeper: [API and integration architecture](/posts/projects/y-iac/05-technical-architecture/#api-and-integration-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The "API" is files and variables, and the code treats them as contracts:

- **CLI arguments**: `cli/parser.py` defines `--cloud`, `--environment`, `--stack`, `--terragrunt`,
  per-gate `--*-skip` and `--*-override`, `--iac-scanner`, `--auto-release-lock`,
  `--lock-min-age-minutes`, auto-import options and more; `cli/arg_validation.py` checks combinations.
- **Environment variables**: `cli/env_export.py` exports what `root.hcl` reads (`CLOUD`, `ENVIRONMENT`,
  `STACK`, gate toggles, lock settings).
- **Credentials by prefix**: `environment/credentials.py` reads `<SUBSCRIPTION>_ARM_CLIENT_SECRET` before
  `ARM_CLIENT_SECRET`, normalizing the alias (`sb-sub-devops-01` → `SB_SUB_DEVOPS_01_`).

```python
def normalise_identifier(identifier: str | None) -> str | None:
    ...
    return identifier.replace("-", "_").upper()
```

Versioning a file contract means accepting old and new shapes in the unit template for a release
(`try(local.config.new_field, local.config.old_field, default)`). The gotcha with environment-variable
contracts is that a typo yields an empty string, not an error, because `get_env(name, "")` has a default;
a startup check that required variables are non-empty catches it.

</div>

</details>

<details class="project-iq" markdown="1" id="backend-and-api-design-q3">
<summary>How is the backend structured internally, and where does background work run?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The CLI package is layered by responsibility:

```text
src/<org>_iac/
├── bootstrap/    # sync, templates, content-hash cache
├── cli/          # parser, argument validation, env export, banner, dispatch, app
├── config/       # loaders, inheritance, provider versions, scan settings
├── core/         # shell, env, errors, logging, paths, serialization
├── environment/  # backend, credentials, Azure auth, preflight
├── generators/   # stack generator, common_vars merge, dependency graph, visualization
├── handlers/     # terragrunt, statelock, ansible
├── reporting/    # plan summary, error report, redaction, final report
└── validation/   # module, OPA, Trivy, Wiz, Infracost, repository guardrail, schema
```

One run: **stub → bootstrap → parse → validate → export environment → authenticate → generate →
Terragrunt expands units → merge common_vars → order into dependency waves → run → gates → report.**

**Background work** runs in GitHub Actions, not in a service: the PR plan, the approved apply, the
plan-after-apply, and a **weekly drift scan** (Sundays, 06:00 UTC) that plans every stack, opens or
updates a Jira ticket per repository, and posts to Teams.

A house rule I like: module docstrings explain *why* ("that silence is the reason this runs on every
generate…"), not just what, which makes a shared codebase reviewable by people who didn't write it.

Deeper: [Project structure](/posts/projects/y-iac/08-development-preparation/#project-structure).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Inside one run, in code order:

1. `entrypoint.main()` → `cli.app.main(repo_root=...)`.
2. Bootstrap (content-hash sync), parse and validate arguments, lint YAML.
3. `env_export` and credential resolution.
4. `stack_generator` writes `terragrunt.stack.hcl`; Terragrunt generates units into `.terragrunt-stack/`.
5. `generate_merged_common_vars()` writes the merged file into `.terragrunt-stack/`.
6. `handlers/terragrunt` runs the command; `handlers/statelock` watches for lock errors.
7. `validation/*` gates run on plan JSON; `reporting/*` writes summaries and the final report.

```python
STACK_DIRNAME = ".terragrunt-stack"

def generate_merged_common_vars(working_dir: str) -> bool:
    """Write the merged ``common_vars.yaml`` into ``.terragrunt-stack``."""
```

The reason step 5 writes *into* `.terragrunt-stack/` is in the module docstring: units search upward
with `find_in_parent_folders`, and from `.terragrunt-stack/<unit>/` the first candidate is
`.terragrunt-stack/` itself. That kind of "why" comment is what stops someone moving the file somewhere
tidier and silently breaking stack overrides.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Where background work runs:

| Work | Where | Trigger |
|---|---|---|
| PR plans | Consumer workflow → `terragrunt-ci.yaml` | `pull_request` |
| Applies | `terragrunt-cd.yaml` behind environment approval | Push to `main` |
| Plan-after-apply | `terragrunt-ci.yaml` | After apply |
| Drift | `iac-scheduled-drift-scan.yaml` → analyze → Jira, Teams | Cron `0 6 * * 0` (Sundays 06:00 UTC) |
| Manual runs | `manual-dispatch.yaml` | `workflow_dispatch` |

```bash
gh workflow run terragrunt-cicd.yaml -f environment=production
gh run view <run-id> --log | grep -E "Plan:|Apply complete|Error"
```

Gotcha in the repo: there's a stray `terragrunt-cicd.yamls` file next to the real template with a daily
cron. GitHub ignores it (wrong extension), but anyone reading the folder sees two schedules. Deleting it
removes the confusion behind "is drift daily or weekly?".

</div>

</details>

<details class="project-iq" markdown="1" id="backend-and-api-design-q4">
<summary>How do you validate input and keep operations safe to repeat?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Validation**, in the order a run hits it:

1. **Arguments and repository:** cloud, environment, stack and subscription must exist; the
   **repo-to-subscription guardrail** (`validation/repository.py`) restricts mapped repos to their
   allowed subscriptions.
2. **YAML:** duplicate-key linting (YAML silently keeps the last duplicate, which would drop a resource);
   rejection of files with no resource lists.
3. **Module schema:** the validator checks module arguments against the pinned provider's schema.
4. **Plan:** OPA, Trivy or Wiz, and Infracost on plan JSON, each advisory, soft-mandatory or mandatory.

**Safe to repeat** is a core property of declarative IaC, and the platform protects it:

- the same YAML at the same ref generates the same files, so reruns converge;
- `root.hcl` retries transient errors (3 attempts, 30 s apart);
- a partial apply only affects the failed unit; rerunning converges the rest;
- **state-lock recovery** is opt-in (`AUTO_RELEASE_LOCK`), only releases locks older than
  `LOCK_MIN_AGE_MINUTES`, and treats an unknown lock age as unsafe, so a live apply's lock is never broken;
- **plan-after-apply** must show no changes; if it does, the module doesn't converge, which is a bug.

Deeper: [Requirements](/posts/projects/y-iac/02-requirements-gathering/#functional-requirements).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Validation and repeat safety, in code:

- **Arguments**: `arg_validation.py` checks required flags and combinations before anything runs.
- **Repository guardrail**: `validation/repository.py` restricts mapped repos to allowed subscriptions.
- **YAML**: `resources_lint.py` reports duplicate keys from the composed node graph (report-only).
- **Plan gates**: `BaseValidator.enforce()` blocks on mandatory findings, blocks soft-mandatory findings
  unless `--*-override` is passed, and never blocks advisory ones.
- **State locks**: `statelock/policy.py` refuses to release a lock younger than `LOCK_MIN_AGE_MINUTES`
  or of unknown age; release prefers `terraform force-unlock` with the lock ID.

```python
if age < threshold:
    return ReleaseDecision(False, f"lock is only {age:.0f}m old (minimum {threshold}m) — "
                                  "it may belong to a run that is still in progress")
```

Repeat safety comes from determinism: the same YAML at the same ref generates the same files. The test
I'd add to protect it: generate a fixture stack twice and assert the outputs are byte-identical, which
catches anything time- or order-dependent sneaking into generation (unsorted dict iteration, timestamps
in headers).

</div>

<div class="iq-role" data-role="sre" markdown="1">

Safety of repeated runs, from the reliability side:

| Mechanism | Protects against | Watch |
|---|---|---|
| Per-unit state and lock | Two runs writing one state | Lock wait time per unit |
| Retry of lock errors (3 × 30 s) | Short overlaps | Runs that spend 90 s retrying |
| Age-guarded release | Breaking a live apply's lock | Releases performed, by age |
| Plan-after-apply | Non-converging modules | Clean rate |
| `max-parallel: 1` | Concurrent applies in one consumer | Queue time |

The scenario I'd rehearse: a runner killed mid-apply. Expected behaviour: the next run retries the lock
three times, the lock handler sees an age above the minimum (if configured), releases it with
`force-unlock`, and the plan shows only what the killed apply didn't finish. If the lock age is unknown,
it refuses and a human decides, which is the right default.

```bash
terraform force-unlock -force <lock-id>    # what the handler runs, in the unit directory
az storage blob lease break --container-name <c> --blob-name <key> --account-name <a>   # azurerm fallback
```

</div>

</details>

## Database and Data Modeling
{: #database-and-data-modeling }

<details class="project-iq" markdown="1" id="database-and-data-modeling-q1">
<summary>Which data store did you choose, and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

There's no application database. The data store that matters is **Terraform state**, and the choice is
the backend:

| Backend | Used for |
|---|---|
| `azurerm` (Blob Storage, versioned) | Configured consumers |
| `s3` | `infra-aws` |
| `gcs` | Template ready |
| `local` | Labs and development (`~/tf-backend`) |

The backend for each repo is an entry in `config.yaml` (19 entries in the shared one), matched by repo
folder name, with an optional override in `common_vars`. Separate **backend credentials** can be used so
the identity that writes state isn't the identity that creates resources.

Why per-repo backends in the consumer's own cloud: state belongs to the consumer, sits next to their
resources, and inherits their access controls. Why one state file **per unit**: small files lock
independently, and a mistake in one unit can't corrupt another.

The other durable data is in Git (consumer YAML), workflow artifacts (plans and reports, kept 7 days), and
Jira (drift tickets). Generated files are reproducible and never committed.

Deeper: [Data architecture](/posts/projects/y-iac/05-technical-architecture/#data-architecture-and-data-models).

</div>

<div class="iq-role" data-role="developer" markdown="1">

How code reaches the state store:

- **`root.hcl`** generates `backend.tf` per unit from the repo's backend entry: `backend_key =
  try(local.backend_config.key, "")`, plus the unit path, so each unit gets its own state key.
- **Backend credentials**: when `backend_auth_alias` is set, `root.hcl` reads `BACKEND_ARM_*` (or AWS and
  Google equivalents), so the state identity differs from the deployment identity.
- **`environment/backend.py`** resolves the repo's entry from `config.yaml` (consumer first, then shared).

```yaml
backend:
  - repo: <consumer>
    type: "azurerm"
    backend_auth_alias: <subscription-alias>
    container_name: "<container>"
    key: "<consumer>"
```

Gotcha: the backend entry is matched by **repo folder name**. Cloning a consumer into a folder with a
different name (a fork, `infra-x-old`) makes the CLI fall back to the shared config or fail to find a
backend, and a fallback to a shared default would point at the wrong state. Failing hard on "no entry for
this repo" is safer than any default.

</div>

<div class="iq-role" data-role="devops" markdown="1">

State storage as infrastructure:

- **Azure**: a storage account and container per consumer group in a dedicated state resource group,
  blob versioning and soft delete on; access through a backend service principal with Storage Blob Data
  Contributor on that container.
- **AWS**: an S3 bucket with versioning for the AWS consumer; **GCS** ready; **local** for labs.

```bash
az storage account blob-service-properties show --account-name <state-account> \
  --query "{versioning:isVersioningEnabled, softDelete:deleteRetentionPolicy}"
az storage blob list --container-name <c> --account-name <a> --prefix <key>/ -o table
aws s3api get-bucket-versioning --bucket <state-bucket>
```

What I'd add: a resource lock (`CanNotDelete`) on the state storage account, and network rules so state
is reachable only from the runners' network and the platform team. State reveals the whole estate, so it
deserves the same protection as a database.

</div>

</details>

<details class="project-iq" markdown="1" id="database-and-data-modeling-q2">
<summary>How is the data modeled, and how did the access patterns shape the model?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The data model is the **YAML hierarchy**, and it maps directly onto state:

```text
consumer repo ── config.yaml (backend + workflow)
  └─ environments/<cloud>/            ── root.hcl (generated)
       └─ <environment>/              ── common_vars.yaml (account, providers, tags, gates)
            └─ <stack>/               ── common_vars.yaml (optional overrides)
                 └─ resources.yaml    ── one key per resource type → one generated unit → one state file
```

The state key follows the same path: `<key>/<cloud>/<unit path>/terraform.tfstate`.

Access patterns shaped it:

- **Plans read one stack**, so units group by stack.
- **Locks are per state file**, so one unit per resource type keeps contention low while avoiding
  thousands of tiny states (40 key vaults are one unit).
- **Overrides are hierarchical**: environment defaults, stack overrides. The subtle bit is where the
  merged file goes. Unit templates search upward with `find_in_parent_folders("common_vars.yaml")`, so
  the merged file is written into `.terragrunt-stack/` itself; otherwise the search silently falls through
  to the environment file and you get a successful plan against the wrong variables.

The consequence I'd name: because the state key includes the path, **renaming a stack folder is a state
migration**, not a rename.

Deeper: [Data architecture](/posts/projects/y-iac/05-technical-architecture/#data-architecture-and-data-models).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The model in code:

- **Hierarchy**: `environments/<cloud>/<environment>/<stack>/resources.yaml`, with `common_vars.yaml` at
  environment and optionally stack level.
- **Merging**: `merge_common_vars()` deep-merges stack over environment, and the result is dumped with a
  header comment saying where it came from.
- **Keys are resource types**, values are lists of instances; some types nest (subnets under a virtual
  network entry).
- **Dependencies** between types are `dependency` blocks in unit templates, enabled only when the other
  type is present in the same stack (`include_azurerm_subnet = try(length(local.config.azurerm_subnet) > 0, false)`).

```hcl
dependency "azurerm_subnet" {
  enabled     = local.include_azurerm_subnet
  config_path = "../azurerm_subnet"
  mock_outputs_allowed_terraform_commands = ["init", "validate", "plan", "output"]
}
```

Gotcha: because a dependency is enabled only when the other type is in the *same* stack, a key vault that
references a subnet created in another stack can't use the dependency; it needs the subnet's ID by name
lookup (a data source) instead. That's where people get confused about "why is the subnet ID empty?".

</div>

</details>

<details class="project-iq" markdown="1" id="database-and-data-modeling-q3">
<summary>How were schema changes and data migrations handled?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The "schemas" are YAML shapes, resource addresses in state, and the state format itself:

- **YAML shapes:** when a module input changes, the unit template accepts both old and new shapes for at
  least one release (`try()` with a fallback), and the CHANGELOG says when the old shape stops working.
- **Resource addresses:** when a module renames or restructures a resource, it should use a **`moved`
  block** (today only the Helm release module has one),
  so existing state follows without a destroy and create. Without it, every consumer's next plan shows a
  replacement, which is the IaC equivalent of a destructive migration.
- **State format:** Terraform upgrades the format on write, and an older Terraform can't read it back.
  So Terraform is pinned per consumer and upgraded deliberately.
- **Code layout:** the move from `python/lib/` to the `src/` package kept a fallback import in the stub,
  so consumers that hadn't re-synced kept working. That's expand-and-contract for code.

**Data migrations** are state operations, each ending in a plan with no unexpected changes:

| Migration | Method |
|---|---|
| Resource between stacks | `state mv` across files, or remove and import |
| Backend change | `init -migrate-state` per unit |
| Stack rename | Treat as a backend migration |
| Adopting existing infrastructure | Import or auto-import |

Deeper: [Schema and migrations](/posts/projects/y-iac/07-data-and-integration/#database-schema-and-migrations).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Shape and address changes in code:

- **Module renames**: a `moved` block in the module, so state follows:

```hcl
moved {
  from = azurerm_key_vault.this["old-name"]
  to   = azurerm_key_vault.this["new-name"]
}
```

  (Terraform's syntax; today only the Helm release module has a `moved` block, so most renames would show
  as replacements in consumers. Making the module validator require one when an address changes is the fix.)
- **YAML shape changes**: unit templates accept old and new keys with `try()` for a release.
- **Layout migration in Python**: the stub keeps a fallback import to the old `python/lib` CLI.
- **Imports**: `--resource-address` and `--resource-id` for a manual import, auto-import flags
  (`--auto-import-prompt-each`, `--auto-import-no-confirmation`) for adopting existing resources.

```bash
python entrypoint.py --cloud azure --environment dev --stack <stack> \
  --terragrunt import --resource-address 'azurerm_key_vault.this["<name>"]' --resource-id <arm-id>
```

The success test for any of these is the same: the next plan shows no changes.

</div>

<div class="iq-role" data-role="devops" markdown="1">

State migrations as operations:

| Change | Commands |
|---|---|
| Move a resource between stacks | `terraform state mv -state-out=…` or `state rm` + `import` |
| Change backend | `terragrunt run init -- -migrate-state` per unit |
| Rename a stack folder | Treat as a backend change: the key includes the path |
| Restore | Promote a previous blob version, then plan |

```bash
az storage blob list --container-name <c> --account-name <a> --prefix <key>/azure/<unit-path> --include v -o table
az storage blob copy start --destination-blob <path>/terraform.tfstate --destination-container <c> \
  --account-name <a> --source-uri "https://<a>.blob.core.windows.net/<c>/<path>/terraform.tfstate?versionid=<id>"
```

The operational rule: before any state operation, pause the consumer's pipelines (disable the workflow) so
nothing applies mid-migration, and take a copy of the current state blob. The rollback is then a copy
back, not a reconstruction.

</div>

</details>

<details class="project-iq" markdown="1" id="database-and-data-modeling-q4">
<summary>How do you handle data retention, backup and restore?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**State is the only data that can't be regenerated.** YAML is in Git, generated files rebuild on every
run, plans can be recomputed. So backup is about state:

| Backend | Backup | Restore |
|---|---|---|
| azurerm | Blob versioning and soft delete | Promote a previous version, then plan to confirm |
| s3 | Bucket versioning | Restore the previous object version |
| gcs | Object versioning | Restore the previous generation |
| local | None (labs only) | Rebuild or re-import |

Versioning is **on** for the Azure Blob state storage, and a state restore has been **rehearsed**. The
restore runbook: stop pipelines for that consumer, copy the current state, restore the previous version,
plan, and expect only the changes made since that version. If it shows more, import or fix before any
apply. I'd hold S3 and GCS backends to the same standard and repeat the rehearsal on a schedule.

**Retention:** state is kept while the resource exists; state versions 30 to 90 days; plan artifacts 7
days, because binary plans can contain sensitive values; production evidence records six years and
non-production one year, following the regulatory baseline.

Deeper: [Backup](/posts/projects/y-iac/07-data-and-integration/#backup-and-restore-strategy).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Backup and retention configured on the platform:

- **Azure state**: blob versioning and soft delete (versioning is on, and a restore has been rehearsed).
- **S3 state**: bucket versioning; **GCS**: object versioning.
- **Plan artifacts**: retained 7 days in GitHub Actions, because binary plans can contain sensitive
  values.
- **Evidence**: exported separately for audits (production six years, non-production one year).

```bash
az storage account management-policy show --account-name <state-account> -g <rg>
gh api repos/<owner>/<consumer>/actions/artifacts --jq '.artifacts[] | {name, expired, created_at}' | head
```

What I'd add: a lifecycle rule that deletes old state *versions* after 90 days (current versions are
kept), so versions don't grow without bound, and a scheduled export of plan summaries and approvals
into long-term storage for the evidence requirement, since 7-day artifacts can't serve an annual audit.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Recovery objectives for state:

| Data | RPO | RTO | Recovery |
|---|---|---|---|
| Azure state | Last write (versioned) | Under 1 hour per unit | Promote previous version, plan |
| S3 / GCS state | Last write | Under 1 hour per unit | Restore previous version, plan |
| Local state (labs) | None | Rebuild | Re-import |
| Consumer YAML | Git | Minutes | Revert |

The restore is only finished when a plan shows exactly the changes made since that version; anything more
means import or reconcile before an apply. I'd rehearse it quarterly on the sandbox consumer, timing it,
because the RTO above is a guess until it's measured.

```bash
python entrypoint.py --cloud azure --environment sandbox --stack <stack> --terragrunt plan
```

</div>

</details>

## Frontend, Backend and Database Communication
{: #frontend-backend-and-database-communication }

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q1">
<summary>How does the frontend connect to the backend?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The "frontend" (a consumer's YAML and the command someone types) connects to the "backend" (the shared
CLI and modules) through the **entrypoint stub**:

- **On a laptop:** `python entrypoint.py --cloud aws --environment dev --stack hello-world --terragrunt plan`
  (or a Taskfile target). The stub finds Y-IaC in the parent folder, puts `src/` on `sys.path`, and calls
  the CLI. The engineer's Azure CLI login is the default identity.
- **In CI:** the consumer's workflow calls Y-IaC's reusable workflows at the ref written in its `uses:`
  lines (the template says `@main`), and the build job checks out the CLI at `iac_shared_module_ref`; it checks out
  Y-IaC into the runner, prepares tools with a composite action, injects credentials from GitHub secrets,
  and runs the same CLI.

The contract between them is the YAML shape and the arguments (`--cloud`, `--environment`, `--stack` map
one to one to folders). And the reviewer's "frontend", the PR summary, is written back by the workflow.

The important property: **local and CI run the same code path.** Only the identity source and the action
change. That's what makes a local plan a reliable preview of the CI plan.

Deeper: [System context](/posts/projects/y-iac/05-technical-architecture/#system-context-and-component-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

How the command reaches the CLI, in code:

```python
def main() -> None:
    repo_root = os.path.dirname(os.path.abspath(__file__))
    module_root = _resolve_module_root(repo_root)
    _prepare_sys_path(module_root)
    _ensure_dependencies()
    cli_main = _resolve_cli_main()
    cli_main(repo_root=repo_root)
```

- **Local**: the shared module is a sibling folder; your Azure CLI login is the default identity, or
  `--use-service-principal` reads a git-ignored `.env`.
- **CI**: `GITHUB_ACTIONS=true`, the shared module is checked out inside the consumer, credentials come
  from `resolve-credentials`.
- **Taskfile** targets wrap common commands.

```bash
python entrypoint.py --cloud aws --environment dev --stack hello-world --terragrunt plan
python entrypoint.py --cloud azure --environment development --stack <stack> --terragrunt plan --use-service-principal
```

Gotcha: because the stub calls `pip install` when PyYAML or python-dotenv is missing, the first run on a
fresh laptop modifies the active Python environment. A virtual environment per workspace keeps that from
polluting system Python.

</div>

<div class="iq-role" data-role="devops" markdown="1">

The CI connection path:

```text
consumer workflow (uses: …@<ref>) → reusable workflow → runner (iac_runner)
  → checkout consumer + shared module at iac_shared_module_ref
  → setup-environment (cached tools) → resolve-credentials (ARM_*, BACKEND_*, per-subscription prefixes)
  → terragrunt-init-plan → artifacts and PR summary
```

```bash
gh run view <run-id> --log | grep -E "Using iac_shared_module_ref|terragrunt version"
```

The thing to verify on every consumer: the `uses:` refs and `iac_shared_module_ref` agree. One consumer
pins both to the same feature branch while trialling a provider, which is correct; a consumer that pins
only `config.yaml` to a tag still runs `main`'s workflow YAML.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q2">
<summary>Trace a single user request from the browser to the data store and back.</summary>

<div class="iq-role" data-role="architect" markdown="1">

There's no browser, so I'd trace one command, `plan` for a stack with an `aws_vpc`:

1. **Stub:** finds the shared module, calls the CLI.
2. **Bootstrap:** syncs the CLI, `root.hcl` and templates if the content hash changed.
3. **Parse and validate:** reads `common_vars.yaml` and `resources.yaml`; checks the repo-to-subscription
   guardrail; lints YAML.
4. **Export and authenticate:** sets `CLOUD`, `ENVIRONMENT`, `STACK`, gate and lock variables; resolves
   credentials (`ARM_*`, `BACKEND_*`, or AWS equivalents).
5. **Generate:** `resources.yaml` → `terragrunt.stack.hcl`; Terragrunt expands one unit per resource
   type; common_vars are merged into `.terragrunt-stack/`; units are ordered into dependency waves.
6. **Inside the unit:** the template reads YAML and includes `root.hcl`, which reads merged variables, the
   backend entry and pinned provider versions, then generates `provider.tf` and `backend.tf`.
7. **Terraform:** init against the S3 backend, acquire the state lock, refresh against the AWS API,
   compute the plan.
8. **Gates:** plan JSON is redacted, then OPA, Trivy or Wiz, and Infracost run.
9. **Back to the user:** a summary table (adds, changes, destroys, gate results) in the console or the PR.

Deeper: [How one run works](/posts/projects/y-iac/05-technical-architecture/#system-context-and-component-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The same trace at code level:

1. `entrypoint.main()` → `cli.app.main`.
2. `cli/parser.py` parses; `arg_validation.py` checks.
3. `generators/resources_lint.py` reports duplicate keys; `validation/repository.py` checks the guardrail.
4. `cli/env_export.py` exports variables; `environment/credentials.py` resolves `ARM_*` with prefixes.
5. `generators/stack_generator.py` writes `terragrunt.stack.hcl`; Terragrunt generates units;
   `common_vars_merge` writes the merged file.
6. The unit template includes `root.hcl`, which generates `provider.tf` and `backend.tf`.
7. `handlers/terragrunt` runs plan; `reporting/plan_converter.py` makes plan JSON.
8. `reporting/redaction.py` replaces sensitive provider arguments with
   `***REDACTED_BY_tfplan_to_json***`.
9. `validation/opa.py` runs `opa eval -i plan.json -d <policy> ... data.<package>.deny`; Trivy or Wiz and
   Infracost follow; `BaseValidator.enforce()` decides blocking.
10. `reporting/plan_summary.py` and `final_report.py` print the result.

```python
["opa", "eval", "-i", plan_file, "-d", policy_file, "--format", "json", query]
```

Gotcha at step 8: redaction covers provider configuration keys in plan JSON. The generated `provider.tf`
and the binary plan still hold the literal secrets, which is why the fix belongs in `root.hcl`.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Where one run can stall or fail:

| Step | Failure | Signal |
|---|---|---|
| Checkout at ref | Ref deleted (merged feature branch) | Checkout error |
| Tool setup | Cache miss and download failure | Setup step duration |
| Credentials | Expired client secret | Auth error from the provider |
| Init | Backend timeout | Init retries in the log |
| Plan | Provider throttling, lock | "Error acquiring the state lock", 429 messages |
| Gates | Missing scanner binary | Wiz: "warn and skip" |

The SRE habit I'd bring: classify every failed run by this table automatically (the error catalog already
matches messages), and count by category per day across consumers. A spike in "credentials" across many
consumers is an expiring secret; a spike in "plan" right after a release is the platform.

```bash
gh run list --repo <owner>/<consumer> --status failure --limit 20 --json databaseId,displayTitle,createdAt
```

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q3">
<summary>How does the backend connect to the data store, and how are connections, timeouts and concurrency handled?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Connections:** `root.hcl` generates a `backend.tf` per unit from the repo's backend entry: `azurerm`,
`s3`, `gcs` or `local`, with the state key `<key>/<cloud>/<unit path>/terraform.tfstate`. When
`backend_auth_alias` is set, the backend uses **its own credentials** (`BACKEND_ARM_*`, `BACKEND_AWS_*`,
`BACKEND_GOOGLE_*`), separate from deployment credentials, so writing state and creating resources are
different permissions.

**Concurrency** is controlled at three levels:

- **State locks** per unit: two runs can't write the same state. Per-unit state means unrelated units
  never wait for each other.
- **Dependency waves:** independent units run in parallel; dependants wait.
- **Applies run one stack at a time** in CI (`max-parallel: 1`), trading speed for predictability.

**Timeouts and retries:** `root.hcl` retries transient errors (network, "in use by" on delete, SSH resets)
three times, 30 seconds apart; backend timeouts during init are retried by the runner.

**Stuck locks**, the classic failure: a killed CI job leaves a lock that blocks every later run. Release is
opt-in, age-guarded and retry-limited, and an unknown lock age is treated as unsafe.

Deeper: [State-lock recovery ADR](/posts/projects/y-iac/05-technical-architecture/#architectural-decision-records).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Connections and concurrency in code:

- **Backend config** is generated, never hand-written; `root.hcl` builds it from `config.yaml` and
  environment variables, including the `BACKEND_*` identity when `backend_auth_alias` is set.
- **Locks** are the backend's own (blob lease for azurerm, DynamoDB or native S3 locking for s3);
  `handlers/statelock/` detects the lock error text, parses the lock ID and age, and applies the policy.
- **Retries** are declarative in `root.hcl`'s `errors { retry "transient_errors" { ... } }`.
- **Parallelism** is Terragrunt's within a stack (dependency order) and `max-parallel: 1` across stacks in
  CI.

```hcl
errors {
  retry "transient_errors" {
    max_attempts       = 3
    sleep_interval_sec = 30
  }
  ignore "known_safe_errors" {
    ignorable_errors = [".*Error: safe warning.*"]
  }
}
```

(Retryable patterns omitted.) Gotcha: the `ignore` block's pattern looks like a placeholder; an ignore rule
that never matches is harmless, but one that's broadened later can hide real failures, so ignore rules
deserve the same review as policy changes.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Concurrency and timeouts from the reliability side:

- **Lock contention** is per unit, so it only happens between runs touching the same unit (a PR plan and an
  apply on the same stack, or a drift scan overlapping an apply).
- **The drift scan runs Sundays 06:00 UTC**; scheduling applies away from that window avoids the most
  likely overlap.
- **Lock retries** absorb overlaps under 90 seconds; longer waits need the lock handler or a human.
- **Release is opt-in** (`AUTO_RELEASE_LOCK`) with a minimum age, and an unknown age means "don't".

```bash
az storage blob show --container-name <c> --account-name <a> --name <key>/.../terraform.tfstate \
  --query "properties.lease"
```

What I'd measure: lock-wait seconds per run (from log timestamps between the first lock error and success),
and the number of lock releases per month. A rising release count means runs are being killed, which is a
runner or timeout problem to fix upstream.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q4">
<summary>Where do you cache, and how do you keep cached data correct?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Caches here are about speed of runs, and correctness comes from **content addressing and regeneration**:

| Cache | Key | Correctness |
|---|---|---|
| Bootstrap sync | Content hash of the shared module | Syncs again only when content changes |
| Terraform plugin cache (`root.hcl` sets `TERRAFORM_PLUGIN_CACHE_DIR`) | Provider and version | Versions are pinned, so a cached plugin is the right plugin. Catch: Terraform reads `TF_PLUGIN_CACHE_DIR`, so as written the cache may not be used at all; I'd confirm by watching whether `init` downloads providers every run |
| Tool installs in CI | Tool versions | Cache keyed on the pinned versions |
| `.terragrunt-cache/`, `.terragrunt-stack/` | Per run | Treated as disposable; regenerated; never committed |

The rule that keeps all of it correct: **generated artifacts are never sources of truth.** If in doubt,
delete them and rerun; the same YAML at the same ref produces the same files.

One caution I'd raise: `.terragrunt-cache/` isn't just a cache from a security point of view. Today the
generated `provider.tf` there can hold credentials as literals (see the security answers), so the cache
must be treated as sensitive until that's fixed at the source.

Deeper: [Scalability strategy](/posts/projects/y-iac/05-technical-architecture/#scalability-and-performance-strategy).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Caches in code:

- **Bootstrap**: content hash of the shared files, so a re-sync happens only on change.
- **The plugin cache**: `root.hcl` sets `TERRAFORM_PLUGIN_CACHE_DIR` for `init`, intending providers to
  download once per machine. Terraform's variable is `TF_PLUGIN_CACHE_DIR`, so as written I'd expect the
  cache to be unused; renaming it is a one-line fix.
- **`.terragrunt-cache/` and `.terragrunt-stack/`**: regenerated per run, git-ignored.

```bash
export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"
rm -rf .terragrunt-cache .terragrunt-stack     # always safe; the next run regenerates them
```

Gotcha: `.terragrunt-cache/` contains the generated `provider.tf`, where `root.hcl` interpolates
`get_env("ARM_CLIENT_SECRET", "")` at generation time, so the secret is written there as a literal. Treat
that folder as a secret store until the providers read credentials from the environment themselves, and
never zip it into an artifact.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Cache correctness and risk, operationally:

| Cache | Risk | Control |
|---|---|---|
| Plugin cache | Corrupted provider binary | Delete and re-download; versions pinned |
| Tool cache in CI (keyed by version) | A tool upgraded without a key change | Key includes the version input |
| `.terragrunt-cache/` | Contains secrets as literals | Ephemeral runners; never uploaded |
| Bootstrap hash | Stale shared files locally | Re-run bootstrap; hash comparison |

The one with security weight is `.terragrunt-cache/` on self-hosted runners: if runners are reused
between jobs, one job's cached `provider.tf` (with secrets) can sit on disk for the next job. Ephemeral
runners (one job per runner) or a cleanup step at job end closes it.

```yaml
- name: Clean generated files
  if: always()
  run: rm -rf .terragrunt-cache .terragrunt-stack tfplan*
```

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q5">
<summary>Where did you use synchronous and where asynchronous communication, and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Synchronous:** a CLI run. Generation, plan and apply happen in order for a stack, because each step
needs the previous one's output, and an apply must use exactly the plan that was reviewed.

**Asynchronous, human-gated:** the path from PR to production. The PR plan posts a summary; reviewers
read it later; merge triggers a new plan on `main`; the **apply waits for environment approval**. The rule
for approvers: approve only if the `main` plan matches the PR plan.

**Asynchronous, scheduled:** the weekly drift scan plans every stack and reports. The Jira contract is
designed for async consumers: one ticket per repository, new findings comment on the open ticket, and a
**fingerprint** in the body stops unchanged drift from adding duplicate comments. Priority escalates on
destroys or failed stacks.

**Fire-and-forget notifications:** Teams messages and the GitHub-to-Jira webhook. A failed notification
fails its own job but never affects the apply.

**Parallel within a run:** units in the same dependency wave run concurrently.

The principle: **synchronous where an action depends on exactly what was reviewed, asynchronous where a
human, a schedule or another team is in the loop.**

Deeper: [Event and messaging contracts](/posts/projects/y-iac/07-data-and-integration/#event-and-messaging-contracts).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Synchronous and asynchronous pieces in code:

- **Synchronous**: the CLI runs Terragrunt with `subprocess` and waits; the plan's JSON is produced after
  the plan finishes, and gates read it.
- **Parallel**: Terragrunt runs units concurrently within a wave; the CLI's `compute_execution_waves()`
  shows what will run together.
- **Asynchronous**: drift findings travel from the analyze job to the Jira tool as workflow outputs; the
  tool computes a fingerprint to avoid duplicate comments:

```python
def fingerprint(self) -> str:
    payload = json.dumps({"rows": sorted(self.rows), "failed": sorted(self.failed_stacks),
                          "totals": [self.total_add, self.total_change, self.total_destroy]}, sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:12]
```

Gotcha in that fingerprint: it hashes per-stack *counts* and failed stacks, not which resources drifted.
If last week one VM drifted and this week a different VM in the same stack drifts, the counts match and the
new drift is suppressed as a duplicate. Including the drifted resource addresses in the payload fixes it.

</div>

</details>

## Integrations and Background Processing
{: #integrations-and-background-processing }

<details class="project-iq" markdown="1" id="integrations-and-background-processing-q1">
<summary>Which external systems does the application integrate with, and how?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| System | Direction | Auth | Failure behavior |
|---|---|---|---|
| Azure, AWS, GCP APIs | Out | Service principal or user login; keys; ADC | Plan fails; transient errors retried |
| GitHub (github provider) | Out | `GH_TOKEN` | Plan fails |
| JFrog, Grafana, Zscaler, ArgoCD, Helm, Kubernetes | Out | Tokens and URLs from env | That unit fails |
| State backends | Both | `BACKEND_*` or the same identity | Init fails; timeouts retried |
| Terraform registry | In | None | Init fails |
| Wiz | Out | Client ID and secret | Missing binary or credentials: warn and skip |
| Infracost | Out | API key | Skipped when disabled |
| Microsoft Teams | Out | Webhook | Notification job fails; apply unaffected |
| Jira | Out | Username and API token | Job fails red; skipped if not configured |

Integration patterns I'd highlight:

- **Credentials only through the environment**, resolved by one module (`environment/credentials.py`),
  with per-subscription credentials for extra Azure subscriptions.
- **Gates read plan JSON**, so they integrate with Terraform's output format rather than its internals.
- **The "warn and skip" decision for Wiz** is one I'd revisit: friendly in development, but in a
  production pipeline a missing scanner silently turns a mandatory gate into no gate.

Deeper: [External systems](/posts/projects/y-iac/07-data-and-integration/#external-systems-and-third-party-integrations).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Integration code patterns:

- **Credentials**: one resolver (`environment/credentials.py`) with a prefixed lookup:

```python
def lookup(variable: str, identifier: str | None, local: bool | None = None) -> str | None:
    """Read a credential, preferring the subscription-prefixed name."""
    prefixed = os.environ.get(f"{prefix_for(identifier)}{variable}")
    ...
```

- **Providers** get configuration from generated `provider.tf` (`root.hcl`), including per-subscription
  aliased `azurerm` providers for stacks that span subscriptions.
- **Scanners** are subprocesses (`opa eval`, Trivy, Wiz CLI, Infracost) with JSON output parsed into
  `Finding` objects.
- **Jira** via a Python tool in `tools/jira_drift_ticket/` (one ticket per repo, comment on the open one,
  priority from a map).

Gotcha: several providers (Zscaler, Logfire and others) take tokens through `get_env` in `root.hcl` with
empty defaults, so a missing token renders an empty string and the provider fails later with an
authentication error far from the cause. A preflight that checks required variables per provider used in
the stack (`environment/preflight.py` is the natural home) fails earlier and clearer.

</div>

</details>

<details class="project-iq" markdown="1" id="integrations-and-background-processing-q2">
<summary>How do you handle rate limits, retries and partial failures from external APIs?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Retries:** `root.hcl` configures Terragrunt's `errors.retry`: three attempts, 30 seconds apart, for known
transient errors (network, "in use by" on delete, SSH resets). Backend timeouts during init are retried
by the runner. Failures that aren't transient fail fast with a catalogued message.

**Rate limits:** the limit I'd watch is **provider API throttling on large Azure stacks during the weekly
drift scan**, when every stack in a consumer plans at once. Controls: one unit per resource type (fewer,
larger API calls rather than thousands of tiny states), change detection so routine CI plans only touch
changed stacks, applies one stack at a time, and the option to scan non-production less often.

**Partial failures** are bounded by design:

- a failed unit doesn't affect other units' state; rerunning converges;
- a failed stack doesn't stop other stacks' plans in the same run;
- the drift report escalates priority when stacks fail to plan;
- notifications failing never affect the apply.

**The dangerous partial failure** is a lock left by a killed job. Releasing it is opt-in and age-guarded,
because releasing a live apply's lock corrupts state.

Deeper: [Resilience](/posts/projects/y-iac/05-technical-architecture/#resilience-and-disaster-recovery).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Retries and partial failures in code:

- **Declarative retries** in `root.hcl` for known transient patterns, three attempts 30 seconds apart.
- **Lock handling** in `handlers/statelock/` (`detect.py`, `policy.py`, `release.py`, `watcher.py`), with
  `force-unlock` preferred and a blob lease break as the azurerm fallback.
- **Scanner absence**: `BaseValidator.should_run()` decides whether a gate runs (enabled in config, tool
  installed, not skipped); for Wiz a missing binary or credentials means a warning and a skip.
- **Partial applies**: per-unit state; rerunning converges.

```python
def should_run(self, skip: bool = False) -> tuple[bool, str]:
    ...   # config enabled? --*-skip passed? tool installed?
```

(Signature from `validation/base.py`; body summarized.) The change I'd make: when a gate's enforcement is
`mandatory`, a missing tool should return "blocked", not "skipped", so a misconfigured runner can't turn
off a required check.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Partial failure and throttling as an SRE sees them:

| Failure | Effect | Signal |
|---|---|---|
| Provider throttling during the weekly drift scan | Some stacks fail to plan | Drift report's failed stacks |
| One unit fails in apply | That unit's resources unchanged | Plan-after-apply shows the rest |
| Scanner missing (Wiz) | Gate skipped | "warn and skip" line |
| Jira or Teams down | Report not delivered | Notification job red |
| Lock left by a killed job | Next runs wait or fail | Lock errors, releases |

```bash
gh run list --workflow iac-scheduled-drift-scan.yaml --limit 4 --json conclusion,createdAt
```

The SRE rule I'd add: the drift scan's *failed stacks* count is itself an SLI. A stack that can't be
planned is a stack whose drift is unknown, so "failed to plan" for two weeks running should page the owner
as loudly as real drift.

</div>

</details>

<details class="project-iq" markdown="1" id="integrations-and-background-processing-q3">
<summary>How are scheduled and background jobs designed and coordinated?</summary>

<div class="iq-role" data-role="architect" markdown="1">

All background work runs as **GitHub Actions workflows**, defined once in Y-IaC and called by consumers:

| Workflow | Trigger | Does |
|---|---|---|
| detect-changes | PR or push | Finds changed stacks |
| plan | PR | Plans each changed stack with gates; posts a summary |
| approved apply | Push to `main` | Plans again, waits for environment approval, applies one stack at a time |
| plan-after-apply | After apply | Must show no changes |
| drift scan | Weekly, Sundays 06:00 UTC | Plans every stack; analyzes drift |
| Teams notification, Jira drift ticket | After drift scan | Reports drift or failed plans |
| compatibility | Manual, before a release | Plans consumer stacks against a Y-IaC branch |

The drift loop is the design I'd walk through: a scheduled plan of everything, an analysis step, then one
Jira ticket per repository with a **fingerprint**, so unchanged drift doesn't create noise, and priority
escalation on destroys or failures. It closes the loop between "what YAML says" and "what exists".

Coordination is by workflow dependencies and **environment approvals**. Two refs decide what runs: the
ref in the consumer workflow's `uses:` lines picks the workflow versions, and `iac_shared_module_ref`
picks the CLI and modules the job checks out. The template defaults the first to `@main`, so a consumer
that pins only the second still gets workflow changes from `main`; pinning both together is the rule
I'd enforce.

A small debt item I'd own: the template comment says "Daily drift detection" while the cron is weekly.

Deeper: [CI/CD](/posts/projects/y-iac/12-cicd-and-release-management/#automated-test-execution).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The scheduled work in code:

- **Analyze**: `iac-drift-detection-analyze.yaml` parses plan results into a summary (stack, adds,
  changes, destroys) and a list of failed stacks.
- **Jira**: `tools/jira_drift_ticket/jira_drift_ticket.py` parses the summary rows, builds a
  `DriftContext`, finds an open ticket for the repo, comments if the fingerprint changed, or creates one;
  `resolve_priority()` picks a priority from the findings' severity.
- **Config**: `config/jira/drift-ticket.yaml` (consumer override, else shared default).

{% raw %}
```python
FINGERPRINT_MARKER = "iac-drift-fingerprint"
FINGERPRINT_RE = re.compile(rf"{FINGERPRINT_MARKER}:([0-9a-f]{{12}})")
```
{% endraw %}

The marker is embedded in the ticket body, and the regex reads it back from existing comments, so the tool
is stateless: Jira itself stores the last fingerprint. That's a neat way to make a scheduled job idempotent
without its own database.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Scheduling and coordination as configuration:

- **Cron** in the consumer template: `0 6 * * 0` (Sundays 06:00 UTC); the consumer can change it.
- **Matrix with `max-parallel: 1`** for plans and applies across stacks.
- **Environment approvals** on apply jobs.
- **`dry_run` input** on the Jira workflow for testing ticket formatting without creating tickets.

```yaml
on:
  schedule:
    - cron: "0 6 * * 0"   # Weekly on Sunday at 6 AM UTC
```

```bash
gh workflow run iac-jira-drift-ticket.yaml -f repository=<owner>/<consumer> -f workflow_url=<url> -f dry_run=true
```

Gotcha: every consumer copying the same cron means every drift scan in the organization starts at 06:00
on Sunday, hitting the same cloud APIs and the same runner pool at once. Staggering by consumer (a hash of
the repo name into the hour) spreads the load at no cost.

</div>

</details>

## Security and Identity
{: #security-and-identity }

<details class="project-iq" markdown="1" id="security-and-identity-q1">
<summary>How do users authenticate, and how is authorization enforced?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Authentication comes from the environment, never from YAML:**

| Context | Identity |
|---|---|
| Laptop (default) | The engineer's Azure CLI login |
| Laptop (`--use-service-principal`) | A service principal from a git-ignored `.env` |
| CI | A service principal from GitHub secrets |
| Extra Azure subscriptions | Per-subscription credentials |
| State backend | Separate `BACKEND_*` credentials when configured |

**Authorization has three layers:**

1. **GitHub:** who can merge to a consumer's `main`, and who is a required reviewer on its environments.
2. **The repo-to-subscription guardrail:** a mapped repo can only deploy to its allowed subscriptions.
   Unmapped repos are unrestricted, deliberately, so onboarding needs no platform change. I'd flip that
   default once every consumer is mapped.
3. **Cloud RBAC** on the service principals: Contributor scoped to what a consumer deploys,
   User Access Administrator only where a consumer manages role assignments (ideally with an ABAC
   condition), and Storage Blob Data Contributor on the state container only for the backend identity.

**My recommendation for CI** is OIDC federated credentials, one per consumer repo and environment. It
removes the long-lived client secret and makes the subject claim
(`repo:org/infra-x:environment:production`) part of the authorization.

Deeper: [Authentication and authorization](/posts/projects/y-iac/06-security-and-privacy/#authentication-and-authorization).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Identity in code:

- **Laptop default**: no credentials in the environment means the Azure CLI login is used.
- **`--use-service-principal`**: reads a git-ignored `.env` (python-dotenv) and exports `ARM_*`.
- **Per-subscription credentials**: `credentials.lookup()` prefers `<ALIAS>_ARM_CLIENT_ID` over
  `ARM_CLIENT_ID`; `root.hcl` renders one aliased `azurerm` provider per extra subscription, choosing
  credentials by `sub_config.mode`.
- **Authorization in code**: `validation/repository.py` maps repos to allowed subscriptions and rejects a run
  that targets another one; unmapped repos pass.

```hcl
client_secret = sub_config.mode == "resource" ? get_env("${upper(replace(sub_name, "-", "_"))}_ARM_CLIENT_SECRET", "") : ""
```

That line (from `root.hcl`) is the per-subscription credential pattern, and also the security problem in
one place: `get_env` runs at generation, so the rendered `provider.tf` contains the secret. The developer
fix is to set `use_cli`, `use_oidc` or leave credential arguments out entirely and let the provider read
`ARM_*` itself; aliased providers need the per-subscription values exported under the standard names in a
wrapper process instead.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Identity as configured:

- **CI**: service principals per consumer, secrets in GitHub (`ARM_CLIENT_ID`, `ARM_CLIENT_SECRET`,
  `ARM_TENANT_ID`, `ARM_SUBSCRIPTION_ID`, plus prefixed variants and `BACKEND_*`), passed with
  `secrets: inherit` and exported by the `resolve-credentials` action.
- **Approvals**: GitHub environments with required reviewers on apply jobs.
- **State**: a separate backend service principal when `backend_auth_alias` is set.

```bash
az ad sp credential list --id <ci-sp-app-id> --query "[].endDateTime" -o tsv
gh api repos/<owner>/<consumer>/environments/production --jq '.protection_rules[] | {type, reviewers}'
az role assignment list --assignee <ci-sp-app-id> --all -o table
```

The move I'd make: federated credentials per consumer repo and environment
(`repo:<owner>/<consumer>:environment:production`), which the template's `id-token: write` permission
already allows. That removes long-lived secrets and makes "only the production environment of this repo"
part of the cloud-side authorization.

</div>

</details>

<details class="project-iq" markdown="1" id="security-and-identity-q2">
<summary>How are secrets and credentials managed?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The rule is simple and mostly followed: **no secret ever appears in YAML.** Credentials arrive only as
environment variables, from a git-ignored `.env` locally or from GitHub secrets in CI (`secrets: inherit`
from the consumer workflow).

The exception is the finding I'd lead with, because it's subtle. `root.hcl` renders providers like this:

```hcl
provider "azurerm" {
  client_secret = "${get_env("ARM_CLIENT_SECRET", "")}"
}
```

Terragrunt resolves `get_env` when it **generates** the file, so the rendered `provider.tf` under
`.terragrunt-cache/` holds the secret as a literal, and Terraform records it in the binary plan. The
redaction module scrubs it from plan JSON before the scanners and artifact upload, but the cache and the
binary plan aren't protected.

**The fix is at the source:** drop credential arguments from generated provider blocks and let each
provider read its standard environment variables directly, or move to OIDC, so there's no secret to
leak.

Other hygiene: separate state credentials, a pinned Wiz CLI (it defaults to "latest" when unpinned), and
pinned runtime dependencies in the stub (it installs version ranges today).

Deeper: [Secrets and key management](/posts/projects/y-iac/06-security-and-privacy/#secrets-and-key-management).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Secrets in code:

- **Only environment variables**; `credentials.py` reads them, never YAML.
- **Redaction**: `reporting/redaction.py` replaces provider-config values whose keys are in
  `SENSITIVE_PROVIDER_KEYS` (`client_secret`, `client_certificate_password`, `oidc_token`, `access_token`,
  `token`, `password`, `api_key`, …) with `***REDACTED_BY_tfplan_to_json***` in plan JSON before scanners
  and artifact upload.
- **Escaping in HCL**: some values are rendered with `jsonencode(get_env(...))` (safer quoting), others
  with string interpolation.

```python
SENSITIVE_PROVIDER_KEYS = frozenset({
    "client_secret", "client_certificate", "client_certificate_password", "oidc_token", "msi_endpoint",
    "zpa_client_secret", "access_token", "auth", "token", "github_token", "password", "api_key",
})
```

Gotcha: redaction is a denylist of key names. A provider that names its secret `client_key` or `secret`
slips through. Redacting by the provider schema's `sensitive` flag (available from `terraform providers
schema -json`) would be an allowlist-free approach.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Secret plumbing in CI:

| Secret | Source | Reaches |
|---|---|---|
| Deployment SP | GitHub secrets (`ARM_*`, prefixed variants) | `resolve-credentials` → env |
| Backend SP | GitHub secrets (`BACKEND_ARM_*`) | `root.hcl` backend block |
| Wiz, Infracost, Jira, Teams | GitHub secrets | Gate and notification steps |
| Provider tokens (GitHub, JFrog, Grafana, Zscaler, …) | GitHub secrets | `root.hcl` via `get_env` |

```bash
gh secret list --repo <owner>/<consumer>
gh secret set ARM_CLIENT_SECRET --repo <owner>/<consumer> --env production
```

The risk I'd raise for runners: generated `provider.tf` files with literal secrets sit under
`.terragrunt-cache/` during the job. On GitHub-hosted runners the VM is discarded; on a reused self-hosted
runner they persist. An `if: always()` cleanup step and ephemeral runners are the immediate fix; removing
the interpolation is the real one.

</div>

</details>

<details class="project-iq" markdown="1" id="security-and-identity-q3">
<summary>How is sensitive data protected, and which compliance constraints applied?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The sensitive data in an IaC platform is easy to underestimate:

| Data | Why sensitive | Protection |
|---|---|---|
| Terraform state | Can hold secrets; reveals the estate | Per-repo backend, separate backend credentials, versioning |
| Plan files and plan JSON | Sensitive diffs and attribute values | Redaction before gates and upload; 7-day artifact retention |
| `.terragrunt-cache/` | Generated provider files (see secrets) | Never committed; treat as sensitive |
| Consumer YAML | Reveals topology | Internal classification; repo access |

**Compliance** is where a shared platform pays off: every production change produces the same evidence,
and an auditor's questions have fixed answers:

| Question | Evidence |
|---|---|
| Who requested it and why? | PR description, linked Jira ticket |
| Who reviewed it? | PR approvals, CODEOWNERS |
| What exactly changed? | Plan summary and artifacts |
| Was it checked against policy? | OPA, scanner and cost results |
| Who approved deployment? | GitHub environment approval |
| Did it do what the plan said? | Apply log, plan-after-apply |
| Is it still as approved? | Drift scan and tickets |

The weak link is retention: plan artifacts expire after seven days, so evidence for an annual audit needs
an explicit export. Production evidence records are kept six years, non-production one year.

Deeper: [Audit requirements](/posts/projects/y-iac/17-governance-and-compliance/#audit-requirements).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Protections around sensitive data:

| Asset | Control | To add |
|---|---|---|
| State | Per-repo containers, backend SP, versioning | Network rules, `CanNotDelete` lock, access reviews |
| Plan artifacts | Redacted JSON, 7-day retention | Never upload binary plans |
| Generated cache | Git-ignored | Cleanup step; no interpolated secrets |
| Consumer YAML | Repo access | No secrets ever (secret scanning on) |
| Evidence | PR, approvals, plan summaries | Export to long-term storage |

```bash
gh api repos/<owner>/<consumer> --jq '.security_and_analysis'
az storage account update -n <state-account> -g <rg> --default-action Deny
az lock create --name state-protect --resource-group <rg> --lock-type CanNotDelete
```

Compliance-wise, the platform's strength is that every consumer produces the same evidence trail. The
gap is retention: 7-day artifacts can't support a six-year evidence requirement without an export job.

</div>

</details>

<details class="project-iq" markdown="1" id="security-and-identity-q4">
<summary>Which threats did you design against?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The assets are **cloud control**, **state**, and **the shared code every consumer executes**. A
STRIDE-style pass:

| Surface | Threat | Control | Gap |
|---|---|---|---|
| Shared module ref | A malicious or broken change reaches every consumer | PR review, CODEOWNERS, pinned refs | Consumers tracking `main` |
| CI identity | Leaked client secret gives standing cloud access | GitHub secrets | Long-lived secrets; no OIDC yet |
| Generated `provider.tf` | Secrets as literals in cache and binary plan | Plan JSON redaction | Cache and binary plan |
| State backend | Read access reveals resources and secrets | Per-repo store, separate credentials | Access reviews |
| Consumer YAML | Wrong subscription targeted | Repo-to-subscription guardrail | Unmapped repos unrestricted |
| Runtime dependencies | Unpinned install at run time | Install only when missing | Ranges, not pins |
| Gate tools | "Latest" changes behaviour | Installed by a shared action | Wiz unpinned by default |

The threat that's specific to a shared platform, and the one I'd discuss: **a supply-chain change in the
shared path is copied into every consumer on its next sync.** That makes security a **release
requirement** for Y-IaC, which is why consumers should pin release tags, releases are trialled on volunteer
consumers first, and CODEOWNERS covers shared paths.

Deeper: [Threat modeling](/posts/projects/y-iac/06-security-and-privacy/#threat-modeling).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Threats visible in the code:

| Threat | Code | Gap |
|---|---|---|
| Secrets on disk | `root.hcl` interpolates `get_env(...)` into `provider.tf` | Fix at the source |
| Secret leakage in reports | `redaction.py` denylist | Key names outside the list |
| Wrong subscription | `validation/repository.py` guardrail | Unmapped repos pass |
| Gate bypass | `--opa-skip`, `--opa-override`, `--trivy-*`, `--wiz-*`, `--infracost-*` flags | Who can pass them in CI, and is it logged |
| Supply chain at run time | Stub `pip install` of ranges | Pin and hash |
| Code execution through YAML | Templates read YAML with `yamldecode`; no `eval` | None seen |

```python
elif level == MANDATORY:
    outcome.blocked = True
else:
    outcome.blocked = not override     # soft-mandatory: --*-override lets findings through
```

The override row is the one I'd raise in a review: soft-mandatory is the default level, so the override
flag is what decides most gate outcomes. Every override should be printed in the summary and recorded in
the PR, so an approver sees "OPA findings overridden" next to the plan.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Platform threats and controls:

| Threat | Control | To add |
|---|---|---|
| Malicious change in the shared repo | PR review, CODEOWNERS, protected `main` | Signed tags; consumers on tags |
| Consumer runs workflow YAML from `main` | Template default `@main` | Pin `uses:` to tags |
| Stolen CI secret | GitHub secrets, environments | OIDC; short-lived credentials |
| Unpinned scanner | Setup action inputs | Pin Wiz CLI |
| State tampering | Backend SP, versioning | Network rules, resource lock |
| Self-hosted runner persistence | Runner label per consumer | Ephemeral runners, cleanup step |

```bash
git -C <shared-repo> tag -s v1.1.0 -m "Release v1.1.0"
gh api repos/<owner>/<shared-repo>/branches/main/protection --jq '.required_pull_request_reviews'
```

The shared-platform-specific threat is a change in the shared path reaching every consumer on its next
run. Consumers on signed tags, with both refs pinned, turn that from "everyone at once" into "whoever
chooses to move".

</div>

</details>

## Performance and Scalability
{: #performance-and-scalability }

<details class="project-iq" markdown="1" id="performance-and-scalability-q1">
<summary>What load does the system handle, where are the bottlenecks, and how does it scale?</summary>

<div class="iq-role" data-role="architect" markdown="1">

"Load" for Y-IaC is **stacks, units per stack, provider API calls, runner capacity, plan size and state
backend throughput**. The design choices that help:

- **One unit per resource type**, not per instance: a stack with 40 key vaults is still one unit.
- **Per-unit state**: small files lock independently.
- **Dependency waves**: independent units run in parallel.
- **Plugin cache** (intended): providers download once per runner, once the variable name is fixed.
- **Change detection**: only changed stacks plan in routine CI.
- **Applies one stack at a time**: predictability over speed.

Bottlenecks, in the order I'd expect them:

1. **Provider API throttling** during the weekly drift scan on large Azure consumers, when every stack
   plans at once.
2. **Runner minutes** as consumers multiply, mostly from drift scans.
3. **Plan time for very large stacks**, which is why the stack boundary (what goes in one folder) matters.

Scaling is mostly horizontal by nature: each consumer and stack runs independently, and the shared repo
isn't a runtime service, so it never becomes a capacity bottleneck itself.

> **TODO:** How long does the largest consumer's drift scan take today, and has throttling been seen?
{: .prompt-warning }

Deeper: [Scalability strategy](/posts/projects/y-iac/05-technical-architecture/#scalability-and-performance-strategy).

</div>

<div class="iq-role" data-role="sre" markdown="1">

Load and bottlenecks, measured where possible:

- **Per run**: units per stack, provider API calls per unit, init time (provider downloads; see the plugin
  cache caveat), plan time.
- **Per week**: the drift scan plans every stack of every consumer at the same cron time.
- **Per platform**: runner minutes and concurrent jobs.

Likely bottlenecks, in order: provider throttling during the Sunday drift scan, runner capacity at that
moment, and init time if providers are downloaded on every unit.

```bash
gh run list --repo <owner>/<consumer> --workflow terragrunt-cicd.yaml --limit 20 \
  --json createdAt,updatedAt,conclusion | jq '.[] | {conclusion, mins: ((.updatedAt|fromdate) - (.createdAt|fromdate))/60}'
```

The quick experiment I'd run first: time `terragrunt run init` on a 10-unit stack with and without
`TF_PLUGIN_CACHE_DIR` set correctly. If the cache isn't working today, fixing one variable name could be
the largest performance win available.

> **TODO:** How long does the largest consumer's drift scan take, and has throttling been seen?
{: .prompt-warning }

</div>

</details>

<details class="project-iq" markdown="1" id="performance-and-scalability-q2">
<summary>How would the design change at ten times the users or data?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Ten times the **consumers** (say 200 repos instead of 20) changes three things:

- **Release management becomes the bottleneck.** The compatibility workflow can't plan every stack of 200
  consumers before each release. I'd move to a **representative set** of consumers per cloud, release
  candidates on volunteer consumers for a week, and adoption tracking (consumers per ref) to see who's
  behind.
- **Drift scans** need staggering by consumer and environment (production weekly, non-production less
  often), and skipping unchanged stacks where safe, to stay inside API limits and runner budgets.
- **Support** must scale through Tier 0: a richer error catalog, a cookbook, and the developer portal as a
  self-service front door writing YAML into PRs.

Ten times the **resources per stack** changes the unit boundary: I'd split very large stacks by lifecycle
(network, data, compute) so plans stay fast and blast radius stays small.

Ten times the **modules** is a governance problem: a module usage scan across consumers' `resources.yaml`
would show the long tail with no consumer at all, and those are maintenance cost with no return, so
deprecation policy (an open ADR today) becomes essential.

What doesn't change: one source of truth, generation, per-unit state and gates on every plan.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Platform changes for 10x consumers:

- **Staggered drift crons** (hour derived from the repo name) and lower frequency for non-production.
- **Runner capacity**: an autoscaling self-hosted runner pool (Actions Runner Controller) with ephemeral
  runners, or a larger hosted runner group, sized for the drift window.
- **Shared provider cache** on runners (with the right variable name), or a pre-baked runner image with
  pinned providers.
- **Compatibility runs** on a representative subset (the workflow already accepts a list of repositories).
- **Adoption tracking** by ref across consumers.

```bash
gh workflow run terragrunt-compatibilty.yaml -f repositories_to_test=<consumer-a>,<consumer-b>
```

(`repositories_to_test` takes a comma-separated list; there are also `test_scope`, `modified_resources`,
`modified_cloud` and `dry_run` inputs.) Of these, staggering is the cheapest and the most effective, because the load is a scheduling artefact, not
real demand.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Reliability at 10x:

| Risk | Guardrail |
|---|---|
| A bad release hits 200 consumers | Tags only for production consumers; release candidates on volunteers |
| Drift scan storms | Staggered crons; alert on failed-to-plan stacks |
| Runner exhaustion | Queue-time SLI with an alert |
| Lock contention | Lock-wait metric; applies scheduled away from scans |
| Support load | Error catalog coverage as an SLI |

The SLO I'd add at that scale: "95% of consumer plans start within 5 minutes of a push" (queue time),
because at 10x the first thing users notice is waiting for a runner, not the plan itself.

</div>

</details>

<details class="project-iq" markdown="1" id="performance-and-scalability-q3">
<summary>How did you measure and improve performance?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Improvements built into the design:

| Improvement | Effect |
|---|---|
| Content-hash bootstrap | Sync only when the shared module changes |
| Plugin cache (variable name to fix) | Providers download once per runner |
| Parallel tool install with a shared cache in CI | Faster runner setup |
| Change detection | Only changed stacks plan |
| Dependency waves | Independent units in parallel |
| Log processor | Readable logs for 30-unit stacks |

**Targets** (estimates, to be measured): under 3 minutes for a single-unit change and under 10 minutes for
a 30-unit stack on a hosted runner. Writing them down makes "reasonable performance" testable.

**Measurement** I'd put in place, from GitHub Actions run data across consumers: p50 and p95 plan time per
changed stack, queue time, and the duration of the weekly drift scan for the largest consumer. Then a
simple performance test: generate a synthetic 30-unit stack from fixtures and time generation and plan
against a local backend, so changes to the CLI can't silently slow every consumer.

The improvement I'd prioritize next isn't speed but **reliability of the measurement**: a dashboard of plan
success rate and duration by consumer is also how platform regressions get noticed first.

Deeper: [Performance testing](/posts/projects/y-iac/10-quality-assurance/#performance-and-load-testing).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Performance work in the CLI:

- **Content-hash bootstrap**: no copying when nothing changed.
- **Lint before cloud calls**: failures in seconds.
- **Readable output** for big stacks: `log_processor.py` abbreviates unit names.
- **Graph insight**: `compute_execution_waves()` shows how much parallelism a stack actually has; a stack
  that's one long chain can't run faster with more runners.

```bash
python -X importtime -m <org>_iac --help 2>&1 | sort -t'|' -k2 -n | tail -5
python -m cProfile -s cumtime entrypoint.py --cloud azure --environment dev --stack <s> --terragrunt plan | head -30
```

The performance test I'd add: generate a synthetic 30-unit stack from fixtures and time generation alone
in pytest (with a generous threshold), so a change that makes generation quadratic fails CI instead of
slowing every consumer. And the one-line fix with possibly the biggest effect: `TF_PLUGIN_CACHE_DIR` in
`root.hcl`.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Measurement plan:

| Metric | Source |
|---|---|
| p50 and p95 plan time per changed stack | Actions run data per consumer |
| Queue time | `run_started_at` minus `created_at` |
| Init time per unit | Log timestamps around init |
| Drift scan duration, largest consumer | Scheduled run data |
| Failure category per run | Error catalog matches |

A weekly job that pulls this from every consumer (`gh api` over workflow runs) into a small dataset, plus
a Grafana dashboard declared as code in a consumer (Grafana is already a provider target), is the whole
observability stack this platform needs.

```bash
gh api "repos/<owner>/<consumer>/actions/runs?per_page=100" \
  --jq '.workflow_runs[] | [.name, .conclusion, .run_started_at, .updated_at] | @tsv'
```

</div>

</details>

## Reliability and Resilience
{: #reliability-and-resilience }

<details class="project-iq" markdown="1" id="reliability-and-resilience-q1">
<summary>What are the failure modes, and how does the system degrade when a part fails?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Failure | Behaviour |
|---|---|
| Transient network error, "in use by" on delete, SSH reset | Retried 3 times, 30 s apart |
| State lock held by a dead run | Released only if older than the minimum age, opt-in |
| Backend timeout during init | Runner retries |
| One unit fails during apply | Other units' state unaffected; rerun converges |
| State corrupted or deleted | Restore from backend versioning (rehearsed) |
| A Y-IaC release breaks consumers | Consumers pin back to the previous ref |
| Scanner missing or misconfigured | Wiz warns and skips today (a gap for production) |
| Notification fails | Notification job fails; apply unaffected |

The principle is **deterministic re-runs**: the same YAML and ref give the same generated files, so "run
it again" is safe, and most failures degrade to "rerun".

The failure that's specific to a shared platform is **a bad release reaching many consumers at once**.
The degradation path there is the pin-back: consumers on tags are already safe; consumers on `main` pin
the last good ref. That's why I'd push every production consumer onto release tags: it turns a platform
incident into a non-event for them.

Deeper: [Resilience](/posts/projects/y-iac/05-technical-architecture/#resilience-and-disaster-recovery).

</div>

<div class="iq-role" data-role="sre" markdown="1">

Failure modes with detection:

| Failure | Behaviour | Detection |
|---|---|---|
| Transient provider error | Retried 3 × 30 s | Retry lines in logs |
| Stuck lock | Retried, then released if old enough (opt-in) | Lock errors, releases |
| Expired CI secret | Every plan in that consumer fails | Auth failure category |
| Scanner missing | Wiz warns and skips | "skipped" in gate summary |
| Bad shared release | Consumers on `main` fail together | Failure spike across consumers |
| Feature-branch ref deleted | Checkout fails | Checkout error |
| Drift scan can't plan a stack | Drift unknown for that stack | Failed stacks in the drift report |

```bash
for r in <consumer-a> <consumer-b> <consumer-c>; do gh run list --repo <owner>/$r --status failure --limit 3; done
```

The pattern to alert on is correlation: failures in several consumers within an hour of a shared-repo merge.
That's the platform's signature failure, and it's invisible if each consumer only watches itself.

</div>

</details>

<details class="project-iq" markdown="1" id="reliability-and-resilience-q2">
<summary>What are the availability and recovery targets, and how are backup and disaster recovery handled?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Classic availability doesn't fit a CLI, so the targets measure what consumers feel. These are my proposed
starting targets for the DevOps team, to review after a quarter of real data:

| SLI | Proposed SLO |
|---|---|
| Plans failing because of the platform (not YAML or cloud) | Under 2% per month |
| Time to a pin-back ref after a bad release | Under 1 hour |
| Plan-after-apply clean rate | 99% |
| Drift ticket age (median) | Under 10 working days |

**DR** splits cleanly. The platform itself is a Git repository: nothing to restore beyond Git. Consumer
YAML is in Git. Generated files rebuild on every run. **State** is the one thing that needs backup, and
it's covered: Blob versioning is on for Azure state storage, and a state restore has been rehearsed. The
runbook ends with a plan that should show only changes made since the restored version.

For **stateful resources** (databases, storage), the platform's job is to make replacements visible: any
plan that replaces a stateful resource needs a restore path written into the PR before approval.

Deeper: [Availability targets](/posts/projects/y-iac/14-operations-and-observability/#availability-and-performance-targets).

</div>

<div class="iq-role" data-role="devops" markdown="1">

DR as procedures:

- **Platform**: Git (the shared repo), nothing to restore; a lost tag is re-created from the commit.
- **Consumer config**: Git.
- **State**: versioned backends.

```bash
az storage blob list --container-name <c> --account-name <a> --prefix <key>/ --include v \
  --query "[?name=='<key>/azure/<unit>/terraform.tfstate'].{v:versionId, t:properties.lastModified}" -o table
# restore one version, then:
python entrypoint.py --cloud azure --environment <env> --stack <stack> --terragrunt plan
```

What I'd add: the state storage account itself in a second region (GRS or object replication), because
versioning protects against bad writes, not against losing the account or region. And the restore
runbook as a script, so a stressed engineer runs one command per unit rather than composing `az` calls.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Targets as SLOs:

| SLO | SLI | Target |
|---|---|---|
| Platform-caused plan failures | Failed runs categorized "platform" ÷ runs | < 2% monthly |
| Pin-back after a bad release | Time from detection to consumers on the last good ref | < 1 hour |
| Plan-after-apply clean | Clean ÷ applies | 99% |
| Drift visibility | Stacks planned successfully in the weekly scan ÷ stacks | 98% |
| State restore | Rehearsed restore time per unit | < 1 hour |

Error-budget rule I'd propose: if platform-caused failures exceed budget, releases pause (consumers stay
on their current tags) until the cause is fixed and a test is added.

> **TODO:** Confirm which of these targets the team has agreed.
{: .prompt-warning }

</div>

</details>

<details class="project-iq" markdown="1" id="reliability-and-resilience-q3">
<summary>How do you make jobs and deployments safe to retry?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Declarative IaC is idempotent by design, and the platform protects that property:

- **Deterministic generation:** the same YAML at the same ref produces the same files and the same plan.
- **Plan, then apply what was reviewed:** CI plans again on `main` before the approved apply, and approvers
  check it matches the PR plan.
- **Plan-after-apply** must show no changes. If it doesn't, the module or provider doesn't converge, which
  would make retries unpredictable, so it's a bug to fix before the next change.
- **Retries only for transient errors**, three times with a delay.
- **Lock release** is age-guarded so a retry never breaks a live run's lock.
- **Applies one stack at a time**, so a failure is contained and the retry scope is obvious.

**Releases** of Y-IaC are made safe to roll back by the ref model: consumers move forward by changing
`iac_shared_module_ref`, and roll back by changing it back. No artifact to rebuild.

**Imports** have a strict success criterion: the next plan shows **no changes**. If it shows changes, the
YAML doesn't match reality yet, and nobody applies until it does.

Deeper: [Deployment runbook](/posts/projects/y-iac/13-deployment-and-go-live/#deployment-runbook).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Retry safety in code:

- **Determinism**: generation depends only on YAML, config and the ref; outputs are regenerated each run.
- **Retries** limited to known transient patterns in `root.hcl`.
- **Lock policy** that refuses to release young or unknown-age locks.
- **Release mechanics** preferring `force-unlock` with the lock ID:

```python
# release.py (summary of the documented order)
# 1. terraform force-unlock <id> in the unit directory, whenever a lock ID is known
# 2. otherwise break the blob lease for that one state file (azurerm)
```

(Comment summarizes the module docstring.) The test that matters most here: a policy test matrix (age
below, at and above the threshold; unknown age; threshold 0) asserting the decision and the message,
because that function is the only thing between a retry and a corrupted state.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Deployment safety:

- **One stack at a time** (`max-parallel: 1`) for applies.
- **Plan again on `main`**, then environment approval, then apply, then plan-after-apply.
- **Platform rollback**: change `iac_shared_module_ref` and the `uses:` refs back to the last good tag.

```bash
yq -i '.workflow[0].iac_shared_module_ref = "v1.0.0"' config.yaml
sed -i 's/@main/@v1.0.0/; s/@<feature-branch>/@v1.0.0/' .github/workflows/terragrunt-cicd.yaml
git commit -am "Pin back to v1.0.0" && git push
```

Gotcha: the pin-back is two edits in two files. Doing only the `config.yaml` one rolls back the CLI and
modules but leaves the workflows on the bad version, which is exactly the half-rollback that makes an
incident confusing.

</div>

</details>

## Testing and Quality
{: #testing-and-quality }

<details class="project-iq" markdown="1" id="testing-and-quality-q1">
<summary>What is your testing strategy across the frontend, backend and data?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The real test for Y-IaC is: **does every consumer's next plan look exactly like it did before, unless we
meant to change it?** The layers that answer it:

| Layer | What exists |
|---|---|
| Unit (pytest) | 36 test files, about 1,200 test functions; **81% line coverage** of `src/` (last measured) |
| Generation | Fixture `resources.yaml` and `common_vars.yaml` → assert on `terragrunt.stack.hcl` and the merged file |
| Gate wiring | OPA against fixture plan JSON (`test_opa.py`, `test_validation_gates.py`) |
| Module validation | fmt, init, provider schema, validate, TFLint, README, HCL format per module |
| Compatibility | Plan real consumer stacks against a Y-IaC branch |
| Production signal | Plan-after-apply and drift scans |

The test areas line up with the package: CLI, bootstrap, config, environment and auth, generators,
handlers (including state lock), reporting and validation.

Gaps I'd name: no coverage floor is enforced yet (I'd set `--cov-fail-under=80` and raise it), and
**`root.hcl` has no direct test** even though it's the most shared file in the platform. A test that
renders a fixture unit with a local backend and asserts `provider.tf` contains exactly the requested
providers at pinned versions would close that.

Deeper: [Unit testing](/posts/projects/y-iac/10-quality-assurance/#unit-testing).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The test suite and how to run it:

```bash
pytest --cov=<org>_iac --cov-report=term-missing --cov-report=xml
pytest tests/test_opa.py tests/test_validation_gates.py
ruff check src tests && ruff format --check src tests
python tools/validate_terraform_module.py <module-path> --strict
```

- **36 test files, about 1,200 test functions**, organized by package area (CLI, bootstrap, config,
  environment, generators, handlers including state lock, reporting, validation).
- **Fixture-driven generation tests**: YAML in, generated HCL and merged YAML out.
- **Gate tests**: OPA against fixture plan JSON.
- **Banner tests** assert the provider cache directory shown (`.terraform.d/plugin-cache`), which is the
  directory configured, not proof Terraform uses it.

Gaps I'd fill: a `root.hcl` rendering test (the most shared file has none), the lock-policy matrix, a
determinism test (generate twice, compare bytes), and a coverage floor (`--cov-fail-under=80`) in the
quality workflow, which today only reports coverage.

</div>

</details>

<details class="project-iq" markdown="1" id="testing-and-quality-q2">
<summary>How do you test integrations with external systems?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Without credentials** wherever possible, because "testable without production" is a requirement:

- **Generation and gate tests** use fixtures: YAML in, generated files out; plan JSON in, policy results
  out.
- **The module validator** runs `init` and `validate` and checks arguments against the provider schema,
  catching arguments the pinned provider doesn't support, without creating anything.
- **Local backends** for labs (`~/tf-backend`), so experiments never touch shared state.

**With real providers**, in increasing risk:

- **The compatibility workflow** clones consumers, symlinks the branch's shared module into them, and
  plans every stack it finds. Plans are read-only, so this tests real provider behaviour safely.
- **A sandbox consumer** with its own subscription (there's a sandbox backend entry in the shared config)
  for applies of release candidates.
- **Release candidates on volunteer consumers** for a week before a release.
- **Plan-after-apply** in every consumer, which catches non-converging modules in real use.

Contract tests I'd add: every unit template's inputs exist in the module's `variables.tf`, and every
`mock_outputs` covers the outputs a unit reads, so a new stack can always plan before its dependencies
exist.

Deeper: [Contract testing](/posts/projects/y-iac/10-quality-assurance/#contract-testing).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Integration tests in code:

- **Without credentials**: fixtures for YAML and plan JSON; `terraform init` and `validate` in the
  module validator (with the provider schema check); local backends for labs.
- **With real providers, read-only**: the compatibility workflow clones consumers, links the branch's
  shared module, and runs plans.
- **Contract tests I'd add**: every key a unit template passes in `inputs` exists in the module's
  `variables.tf`, and every output a dependent unit reads exists in the dependency's `mock_outputs`.

```python
def test_unit_inputs_match_module_variables(resource_type):
    template_keys = parse_inputs(f"cloud/azure/terragrunt/{resource_type}/terragrunt.hcl")
    module_vars = parse_variables(f"cloud/azure/terraform/{resource_type}/variables.tf")
    assert template_keys <= module_vars
```

(A sketch; `parse_inputs` and `parse_variables` would use `python-hcl2`.) Parametrized over every resource
type, that one test catches the most common module change bug: a renamed variable that the template still
passes under the old name.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Integration test infrastructure:

- **The compatibility workflow** (`terragrunt-compatibilty.yaml`): manual dispatch with an optional list of
  repositories (default: every repo in the subscription mapping), clones each with `gh repo clone`, and
  plans their stacks against the branch.
- **A sandbox consumer** with its own subscription for applies of release candidates.
- **Module validation** in CI for touched modules.

```bash
gh workflow run terragrunt-compatibilty.yaml --ref <branch>
gh run watch
```

What I'd add: run the compatibility workflow automatically on PRs that touch `template/`, `src/` or a unit
template, against a small fixed set of consumers, and post the generated-output diff as a PR comment.
Today it's manual, so it only protects releases that someone remembers to test.

</div>

</details>

<details class="project-iq" markdown="1" id="testing-and-quality-q3">
<summary>Which quality gates does code pass before it merges and ships?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**For changes to Y-IaC itself:**

1. **PR checks:** Python quality (ruff check and format, pytest), code quality, and module validation for
   touched modules, all required on a protected `main`.
2. **CODEOWNERS** review for shared paths.
3. **Generated-output diff:** for anything in the shared path, a diff of generated files before and after
   is the best review artifact, because generated output is the real interface consumers depend on.
4. **Compatibility run** before a release, planning real consumer stacks against the branch.
5. **Release candidate** on volunteer consumers, then a tag and release notes.

**For every consumer change** (the gates the platform applies to others):

1. YAML validation and the repo-to-subscription guardrail.
2. Plan with **OPA, Trivy or Wiz, and Infracost**, each at advisory, soft-mandatory or mandatory.
3. A plan summary in the PR for reviewers.
4. Merge, plan again on `main`, **environment approval**, apply one stack at a time.
5. Plan-after-apply must be clean.

The decision I'd still push: per-environment enforcement levels written down, and **mandatory** gates in
production failing when a scanner is missing, rather than warning and skipping.

Deeper: [Static analysis and scanning](/posts/projects/y-iac/12-cicd-and-release-management/#static-analysis-and-security-scanning).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Gates for changes to the shared repo, from the developer side:

- `ruff check` and `ruff format --check` on `src` and `tests`.
- `pytest` with coverage (reported as an artifact).
- Module validation for touched modules: fmt, init, provider schema, validate, TFLint, README.
- CODEOWNERS review on shared paths.

```bash
ruff check src tests && ruff format --check src tests && pytest -q
python tools/validate_terraform_module.py cloud/azure/terraform/<module>
```

What I'd add: `--cov-fail-under=80`, a `moved`-block check in the module validator when a resource
address changes, and a generated-output diff (`terragrunt.stack.hcl`, `provider.tf`) for a fixture consumer
posted on PRs that touch the shared path, because that diff is the real interface consumers depend on.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Pipeline gates, both directions:

| Pipeline | Gates |
|---|---|
| Shared repo PR | `python-quality.yaml` (ruff, pytest, coverage), `code-quality-ci.yaml`, module validation, CODEOWNERS |
| Shared repo release | Compatibility run (manual), release candidate, tag |
| Consumer PR | YAML lint and guardrail, plan, OPA / Trivy or Wiz / Infracost at their enforcement levels, summary |
| Consumer apply | Plan on `main`, environment approval, `max-parallel: 1`, plan-after-apply |

```bash
gh api repos/<owner>/<shared-repo>/branches/main/protection --jq '.required_status_checks.contexts'
yq '.policy_scanner, .security_scanner' config.yaml
```

The consumer-side detail to check per repo: enforcement levels. One consumer runs OPA at soft-mandatory
and has the security scanner disabled, which is a legitimate choice for a development subscription but
should be a recorded exception, not a silent default.

</div>

</details>

## Infrastructure and Environments
{: #infrastructure-and-environments }

<details class="project-iq" markdown="1" id="infrastructure-and-environments-q1">
<summary>Where and how is the application hosted, and why there?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Y-IaC **isn't hosted anywhere**; it's a repository that consumers execute. That's a design choice worth
defending:

- **On a laptop:** a consumer clones Y-IaC next to itself; bootstrap syncs what's needed.
- **In CI:** the reusable workflow checks out Y-IaC on a GitHub-hosted runner (`ubuntu-latest` for the
  current consumers) at the consumer's pinned ref, and a composite action installs Terragrunt, TFLint,
  kubelogin and Wiz CLI in parallel with a shared cache.
- **The infrastructure it creates** lives in the consumer's targets: Azure subscriptions for most
  consumers, AWS for `infra-aws`, GitHub for `infra-github`, and SaaS providers where a stack asks.

Why no service: a running service would be one more thing to operate, secure and keep available, and a
single point of failure for every deployment. Running in each consumer's pipeline means each consumer
uses its own identity, its own runner and its own state, and the platform's availability is just Git's.

The trade-off: there's **no central place** to see every run. That's why the dashboard I'd build collects
GitHub Actions run data across consumers.

Deeper: [Hosting model](/posts/projects/y-iac/05-technical-architecture/#hosting-and-deployment-model).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Where things run:

| Piece | Runs on |
|---|---|
| CLI and Terragrunt | GitHub-hosted runners or a self-hosted label (`iac_runner` in `config.yaml`) |
| Tools | Installed by `setup-environment`, cached by version |
| State | Consumer backends (Azure Blob, S3, GCS) |
| Docs | GitHub Pages (`docs-pages.yaml`) |
| Created infrastructure | Consumer subscriptions, accounts and SaaS tenants |

```bash
yq '.workflow[0].iac_runner' config.yaml
gh api orgs/<owner>/actions/runners --jq '.runners[] | {name, status, labels: [.labels[].name]}'
```

For self-hosted runners I'd insist on ephemeral mode (one job per runner) because IaC jobs hold
high-privilege cloud credentials and write secrets into generated files; a persistent runner turns one
compromised job into access to the next consumer's credentials.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Hosting through an SRE lens:

- **No service to keep up**: the platform's availability is GitHub's and the clouds'.
- **Runner availability** is the real dependency; a self-hosted pool needs capacity and health monitoring.
- **No central view** of runs across consumers, so platform incidents are discovered by consumers.
- **Shared blast radius** through refs, not runtime.

```bash
gh api orgs/<owner>/actions/runners --jq '[.runners[] | select(.status=="offline")] | length'
```

The SLI I'd add for hosting: runner queue time per label, alerting when p95 exceeds 10 minutes. For a
platform with no servers, waiting for a runner is the closest thing to downtime.

</div>

</details>

<details class="project-iq" markdown="1" id="infrastructure-and-environments-q2">
<summary>Which environments exist, and how close is local development to production?</summary>

<div class="iq-role" data-role="architect" markdown="1">

"Environment" means two things here, and keeping them apart avoids most confusion:

**The platform's own environments:**

| Stage | What it is |
|---|---|
| Development | A laptop with Y-IaC and a consumer side by side; same CLI as CI; Azure CLI login; optional local backend |
| Test | The compatibility workflow planning real consumers against a branch |
| Sandbox | A sandbox consumer with its own subscription, for applies of release candidates |
| Staging | A consumer pinned to a release candidate ref for a week |
| Production | Consumers pinned to a release tag |

**The consumer environments the modules create:** folders such as `environments/aws/dev/`, each with its
own `common_vars.yaml` (account, providers, tags, gates) and backend.

**Parity** is the strongest property: **local and CI run the same CLI code path**; only the identity
source and the action differ. Local setup supports WSL and Ubuntu/Debian.

The one practice I'd formalize is staging as "a consumer pinned to a pre-release ref". Today `infra-aws`
points at a feature branch while it's being trialled, which is the right idea; tagging release candidates
makes it repeatable.

Deeper: [Environments](/posts/projects/y-iac/11-infrastructure-and-environments/#staging-environment).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Local development:

```bash
git clone <shared-repo> terragrunt_shared_module
git clone <consumer-repo> infra-x
cd infra-x
python entrypoint.py --cloud azure --environment development --stack <stack> --terragrunt plan
```

- The stub finds the shared module as a sibling folder, so edits in your shared checkout take effect on the
  next run, with no publish step.
- `--use-service-principal` uses a git-ignored `.env` instead of your CLI login.
- Labs can use a local backend (`~/tf-backend`) so experiments never touch shared state.

Parity gotcha: CI checks out the shared module *inside* the consumer at a pinned ref; locally it's
whatever your sibling checkout is on. Before trusting a local plan as a preview of CI, check the sibling's
branch matches `iac_shared_module_ref`.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Environments, as configured:

| Stage | How |
|---|---|
| Development | Laptop with sibling checkouts |
| Test | Compatibility workflow against a branch |
| Sandbox | A consumer with its own subscription (a sandbox backend entry exists) |
| Staging | A consumer pinned to a release candidate or feature branch |
| Production | Consumers pinned to a tag |

```bash
for r in <consumers>; do echo -n "$r "; gh api repos/<owner>/$r/contents/config.yaml --jq '.content' | base64 -d | yq '.workflow[0].iac_shared_module_ref'; done
```

That loop is the adoption report I'd automate: it shows who's on `main`, who's on a branch and who's on a
tag. Consumers on deleted branches show up there before their runs fail.

</div>

</details>

<details class="project-iq" markdown="1" id="infrastructure-and-environments-q3">
<summary>How is the infrastructure provisioned and configured?</summary>

<div class="iq-role" data-role="architect" markdown="1">

By Y-IaC itself: that's the product. For a consumer:

1. **Onboard:** bootstrap writes the stub, `root.hcl`, the workflow template, a Taskfile and `.gitignore`.
2. **Configure:** add a backend entry (`config.yaml`), environment `common_vars.yaml`, and a stack's
   `resources.yaml`.
3. **Provision:** plan in a PR, approved apply on `main`.

**Configuration layers**, from most shared to most specific:

| Layer | Example |
|---|---|
| `config/providers.yaml` (shared) | Pinned provider versions |
| Shared `config.yaml` | Backend entries, import normalization |
| Consumer `config.yaml` | Repo backend, Y-IaC ref, runner |
| Environment `common_vars.yaml` | Account or subscriptions, providers, tags, gate toggles |
| Stack `common_vars.yaml` | Overrides |
| Per-unit `override_versions` | An azurerm pin for one unit |
| Environment variables | Credentials only |

**Adopting existing infrastructure** is supported two ways: manual import through the CLI, with provider
path normalization, and **auto-import**, which describes per resource type how to find the real resource,
build the import ID, and when to ask for confirmation. Either way the success test is a plan with no
changes.

Deeper: [Import and export](/posts/projects/y-iac/07-data-and-integration/#import-and-export-requirements).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Provisioning and configuration layers:

- **Onboarding**: bootstrap writes the stub, `root.hcl`, the workflow template, a Taskfile and
  `.gitignore` into the consumer.
- **Backend entry** in `config.yaml`; **environment** `common_vars.yaml`; **stack** `resources.yaml`.
- **Provider pins** in `config/providers.yaml`, with per-unit `override_versions`.
- **Gates** per consumer (`policy_scanner`, `security_scanner`) and per environment toggles.

```yaml
backend:
  - repo: <consumer>
    type: "azurerm"
    backend_auth_alias: <subscription-alias>
    key: "<consumer>"
workflow:
  - iac_shared_module_ref: v1.0.0
    iac_runner: ubuntu-latest
```

The one thing I'd add to onboarding: create the state container and the backend role assignment with a
Y-IaC stack in a bootstrap consumer, so the platform provisions its own prerequisites instead of someone
doing it by hand in the portal.

</div>

</details>

## CI/CD and Deployment
{: #ci-cd-and-deployment }

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q1">
<summary>Walk me through the pipeline from commit to production.</summary>

<div class="iq-role" data-role="architect" markdown="1">

There are two pipelines, and the interview answer is clearer if I separate them.

**The consumer pipeline** (what Y-IaC provides to every infra repo):

```text
PR         -> detect changed stacks -> plan each (OPA, Trivy/Wiz, Infracost gates)
           -> summary report in the PR -> GitHub-to-Jira link
merge      -> plan again on main -> wait for environment approval
           -> apply one stack at a time -> plan-after-apply (must be clean)
weekly     -> plan every stack -> drift analysis -> Teams notification + Jira drift ticket
```

"Build" here means preparing the runner (tools installed in parallel with a cache) and generating the
stack at run time; nothing is compiled.

**The platform pipeline** (how Y-IaC itself ships):

```text
PR to Y-IaC -> ruff, pytest, code quality, module validation for touched modules
            -> CODEOWNERS review; generated-output diff for shared-path changes
release     -> compatibility run against consumer stacks -> release candidate on volunteers
            -> tag -> consumers move iac_shared_module_ref to the tag
```

The key insight: **for Y-IaC, the consumer's ref is the release mechanism.** A consumer on `main` gets
every change immediately; a consumer on a tag gets what that tag contains.

Deeper: [CI/CD](/posts/projects/y-iac/12-cicd-and-release-management/#deployment-automation).

</div>

<div class="iq-role" data-role="devops" markdown="1">

The consumer pipeline, job by job (from the template):

1. **`set-build-variables`**: reads `config.yaml` with `yq` (org, shared repo, runner,
   `iac_shared_module_ref`, falling back to a workflow input, then an env default).
2. **`detect-changes`** (reusable): which stacks changed.
3. **`terragrunt-plan`**: matrix over changed stacks, `max-parallel: 1`, calls `terragrunt-ci.yaml` with
   `secrets: inherit`; inside, `setup-environment`, `resolve-credentials` and `terragrunt-init-plan`.
4. **`invoke-jira-webhook-plan`** and **`generate-summary-report`**.
5. On `main`: **`terragrunt-apply`** (matrix, `max-parallel: 1`, environment approval) via
   `terragrunt-cd.yaml`, then **`terragrunt-plan-after-apply`**.
6. **`scheduled-drift-scan`** on the weekly cron; **`manual-dispatch`** for ad-hoc runs.

```bash
gh workflow run terragrunt-cicd.yaml -f environment=development
gh run view --log <run-id> | grep -E "Using iac_shared_module_ref|Plan:|Apply complete"
```

And the shared repo's own pipeline: `python-quality.yaml`, `code-quality-ci.yaml`, module validation, the
manual compatibility run, then a tag. What I'd change in the consumer template first: replace `@main` in
every `uses:` with a variable-free tag that a release bump updates together with `iac_shared_module_ref`.

</div>

</details>

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q2">
<summary>Which deployment strategy do you use, and how do you roll back?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**For infrastructure changes:** plan-review-approve-apply per stack, applied **one stack at a time**,
with plan-after-apply as the verification. The approver's rule is that the `main` plan must match the PR
plan, and any replacement of a stateful resource needs a restore path in the PR.

**Rollback for infrastructure is roll-forward by design**: revert the YAML in a PR and apply. There's no
"undo" for a deleted database, which is why replacements and destroys get extra scrutiny before approval,
not after. For state damage, restore the previous state version and plan.

**For platform releases, the strategy is a canary by ref:**

1. Compatibility plans against consumer stacks.
2. A release candidate on two or three volunteer consumers (and the sandbox) for a week.
3. Tag the release; consumers move when ready.

**Rollback for the platform** is a pin-back: consumers set `iac_shared_module_ref` to the last good tag,
which is also the incident containment step. The target I proposed is under one hour to a pin-back ref
after a bad release.

**Break-glass:** a local apply from a laptop is allowed only as an emergency, and recorded the same way as
a CI apply.

Deeper: [Rollback](/posts/projects/y-iac/12-cicd-and-release-management/#rollback-and-roll-forward-procedures).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Strategy and rollback, operationally:

- **Infrastructure**: plan in PR, plan again on `main`, approval, apply one stack at a time,
  plan-after-apply. Rollback is a revert PR and apply; state damage is a version restore.
- **Platform**: release candidate on volunteer consumers (pinning both refs to the candidate), then a tag;
  rollback is pinning back both refs.

```bash
git revert <commit> && git push                 # infrastructure roll-forward
yq -i '.workflow[0].iac_shared_module_ref = "<last-good-tag>"' config.yaml   # platform pin-back, part 1
# part 2: change the @<ref> on every uses: line in the consumer workflow
```

Gotcha: an environment approval only shows the job name and the commit; the approver has to open the
plan summary from the same run to know what they're approving. Linking the summary in the job's
environment URL (`environment.url`) puts it one click away from the approve button.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Release safety signals:

| Moment | Check |
|---|---|
| Before tagging | Compatibility run clean across representative consumers; generated-output diff reviewed |
| Candidate week | Platform-categorized failures in volunteer consumers = 0 |
| After a consumer moves | Next plan shows no unexpected changes |
| Any apply | Plan-after-apply clean |

Rollback triggers: any unexpected replacement in a consumer plan after a platform change (a missing
`moved` block or a provider default change), or a failure category spike across consumers. The
containment is the pin-back, and the target is under an hour from detection.

```bash
gh run list --repo <owner>/<consumer> --limit 10 --json conclusion,createdAt,headBranch
```

</div>

</details>

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q3">
<summary>How do data and schema changes ship alongside application changes?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The "data" that changes with a release is **YAML shapes, module interfaces and resource addresses in
state**, and each has a rule:

- **Module input changes** ship with a backward-compatible unit template (`try()` accepting old and new
  shapes) for at least one release, plus a CHANGELOG line saying when the old shape stops working.
- **Resource renames and restructures** ship with a **`moved` block**, so consumers' state follows
  without a destroy and create. A plan showing replacements across consumers after a release is a
  release bug.
- **Provider version bumps** go through the compatibility run, because a provider upgrade can change
  defaults and cause diffs in consumers nobody on the platform team has heard of. Per-unit azurerm
  overrides let a consumer stay on an older pin while it catches up.
- **Terraform version upgrades** are deliberate per consumer, since state format upgrades on write and
  can't go back.
- **Layout changes in the CLI** keep a fallback (the stub still imports the old `python/lib/` layout for
  consumers that haven't re-synced).

The review artifact that catches what tests don't is the **generated-output diff** in a scratch consumer:
if `provider.tf` or `terragrunt.stack.hcl` changes unexpectedly, the release isn't ready.

Deeper: [Feature development](/posts/projects/y-iac/09-implementation/#feature-development).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Shipping interface changes in code:

- **Module variable rename**: keep the old variable for a release (`default = null`) and coalesce in
  `locals`, or accept both keys in the unit template:

```hcl
sku_name = try(keyvault.sku_name, keyvault.sku, "standard")   # new key, old key, default
```

  (A sketch of the pattern; the key names are illustrative.)
- **Resource address change**: add a `moved` block in the same PR.
- **Provider bump** in `config/providers.yaml`: run the compatibility workflow; offer `override_versions`
  for consumers that need time.
- **CLI layout change**: keep fallbacks (the stub's legacy import) until every consumer re-syncs.

The test I'd require for any of these: a fixture consumer's generated output before and after, with the
diff reviewed in the PR. If `provider.tf` or `terragrunt.stack.hcl` changes unexpectedly, the change
isn't ready.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Ordering shape changes across repos:

1. Release the shared repo with backward-compatible templates (old and new keys accepted).
2. Consumers move to the new tag (both refs) and plan; plans should show no changes.
3. Consumers update their YAML to the new keys, in their own PRs.
4. A later release removes the old key support, announced in the CHANGELOG.

```bash
gh workflow run terragrunt-compatibilty.yaml -f test_scope=<scope> -f dry_run=true
grep -rn "<old_key>:" environments/      # in each consumer, to see who still uses the old shape
```

The DevOps piece that's missing is step 4's visibility: a scan across consumers' `resources.yaml` for old
keys tells you when it's safe to remove support. Without it, old shapes live forever.

</div>

</details>

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q4">
<summary>How do you manage configuration and versions across environments?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Versions:**

| What | Pinned where |
|---|---|
| Y-IaC itself | `iac_shared_module_ref` in each consumer's `config.yaml` |
| Provider versions | `config/providers.yaml`, with per-unit azurerm overrides |
| Terraform per consumer | Deliberate upgrade |
| CI tools (Terragrunt, TFLint, Wiz) | Setup action inputs (Wiz should always be pinned) |
| Reusable workflows | The ref in the consumer's `uses:` lines (template default `@main`), separate from `iac_shared_module_ref`, so moving a consumer means changing both |

There's one tag so far (`v1.0.0`). The policy I'd put in place: semantic version tags, consumers in
production pin tags, consumers in sandbox or dev may track release candidates, and a dashboard shows
**consumers per ref**, so we know who's behind before announcing a breaking change.

**Configuration** is layered from shared to specific (provider pins, shared backends, consumer
`config.yaml`, environment `common_vars`, stack overrides), with credentials only in environment
variables. Environment differences live in **folders and `common_vars`**, never in conditional logic in
templates, so a reviewer can see exactly how dev and production differ by diffing two YAML files.

Deeper: [Versioning](/posts/projects/y-iac/12-cicd-and-release-management/#versioning-and-release-notes).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Versions and config in code:

- **Provider pins**: `config/providers.yaml`, read by `root.hcl` when it generates `required_providers`;
  per-unit `override_versions` for exceptions.
- **Config inheritance**: `config/` loaders merge the consumer's `config.yaml` over the shared one.
- **Credentials**: environment only, with prefixes per subscription.
- **Version of the CLI**: whatever ref is checked out; the banner prints it.

```bash
yq '.provider[] | select(.name == "azurerm") | .version' config/providers.yaml
python entrypoint.py --cloud azure --environment development --stack <s> --terragrunt validate   # banner shows versions
```

The improvement I'd make in code: print the shared module's resolved ref and commit SHA in the banner and
in the PR summary, so every plan states exactly which platform version produced it. That's the provenance
an auditor (or an on-call engineer) asks for first.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Versions and config across consumers:

| Item | Where | Note |
|---|---|---|
| CLI and modules | `iac_shared_module_ref` | Tag, branch or `main` |
| Workflow YAML | `uses: …@<ref>` in the consumer workflow | Separate from the above |
| Providers | `config/providers.yaml` | Central |
| CI tools | `setup-environment` inputs | Wiz defaults to latest |
| Runner | `iac_runner` | Hosted or self-hosted label |

```bash
git -C <shared-repo> tag --list 'v*'
for r in <consumers>; do gh api repos/<owner>/$r/contents/.github/workflows/terragrunt-cicd.yaml --jq '.content' | base64 -d | grep -o '@[^ ]*' | sort -u; done
```

That second loop is how I'd audit the workflow refs today; making the release bump update both refs (a
small script or Renovate rule) is the durable fix.

</div>

</details>

## Monitoring and Observability
{: #monitoring-and-observability }

<details class="project-iq" markdown="1" id="monitoring-and-observability-q1">
<summary>How do you know the system is healthy in production?</summary>

<div class="iq-role" data-role="architect" markdown="1">

When Y-IaC is healthy, nobody notices it. When it isn't, the first symptom is a consumer's plan failing,
and the first question is **"is this my YAML, my cloud, or the platform?"** So health is watched in two
layers, deliberately apart:

| Layer | Signals | Owner |
|---|---|---|
| Platform health | Workflow success rate, duration, queue time, failure category; gate outcomes; compatibility results; lock errors; backend availability | DevOps team |
| Workload health | Metrics and alerts on the infrastructure the modules created | Consumer team |

A spike in failed plans across five consumers on the same day is a **platform** signal; one consumer's
failing plan after a portal change is a **workload** signal. The **failure category** from the error
catalog is what tells them apart, which is why the catalog matters operationally, not just for support.

Two signals are health checks in their own right:

- **Plan-after-apply clean rate:** a module that doesn't converge erodes trust in every plan.
- **The weekly drift scan:** proves what exists still matches what was approved.

Today each failure surfaces in the consumer that hit it; collecting run data centrally is the next step.

Deeper: [Monitoring](/posts/projects/y-iac/14-operations-and-observability/#application-and-infrastructure-monitoring).

</div>

<div class="iq-role" data-role="devops" markdown="1">

What exists to observe the platform, and what I'd wire:

- **Per run**: the banner, the final report, the PR summary, artifacts (7 days).
- **Per week**: the drift scan's Teams message and Jira ticket per repo.
- **Across consumers**: nothing central today.

```bash
gh api "repos/<owner>/<consumer>/actions/runs?per_page=100" --jq '.workflow_runs[] | [.name,.conclusion,.created_at] | @tsv'
```

What I'd wire: a scheduled workflow in the shared repo that collects run data from every consumer (name,
conclusion, duration, failure category from the error catalog) into a table, and a Grafana dashboard for
it, declared with Y-IaC's own Grafana modules in a consumer. The platform monitoring itself with its own
modules is a nice proof as well as a practical choice.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Health as SLIs:

| SLI | Healthy |
|---|---|
| Platform-categorized failure rate | < 2% of runs |
| Plan-after-apply clean rate | ≥ 99% |
| Drift scan coverage (stacks planned ÷ stacks) | ≥ 98% |
| Open drift tickets older than 10 working days | 0 |
| Consumers on a tag vs `main` | Rising toward 100% for production |
| Runner queue time p95 | < 10 minutes |

The distinguishing question, "my YAML, my cloud, or the platform?", is answered by failure category, so
the error catalog's coverage (share of failures it matches) is itself a health metric for the platform's
support model.

</div>

</details>

<details class="project-iq" markdown="1" id="monitoring-and-observability-q2">
<summary>What do you log, measure and alert on?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Logs:** CLI logs to console and workflow log; Terragrunt output through a log processor that keeps
30-unit logs readable; job summaries and reports as artifacts. Two rules: never print credentials or
sensitive provider attributes, and set log retention to match the evidence policy.

**Measure**, the dashboard I'd build from GitHub Actions run data across consumers:

| Panel | Metric |
|---|---|
| Plan and apply success rate | Per day, per consumer |
| Plan-after-apply clean rate | Runs with zero changes after apply |
| Failure categories | By error catalog entry (auth, lock, provider, YAML, gate) |
| Gate outcomes | Pass, advisory finding, blocked, overridden |
| Drift | Stacks with drift, open tickets, ticket age |
| Duration | p50 and p95 plan time per changed stack |
| Adoption | Consumers per Y-IaC ref |

Grafana is already a Y-IaC provider target, so the dashboard itself can be declared as code in a consumer.

**Alert:** a rise in platform-categorized failures across consumers (a likely bad release), plan-after-apply
failures, drift with destroys, gate overrides in production, and repeated lock errors.

Deeper: [Metrics](/posts/projects/y-iac/14-operations-and-observability/#metrics-and-dashboards).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Logging in the CLI:

- **Banner** at start (cloud, environment, stack, action, gates, provider cache directory).
- **Colored progress lines** per step; `log_processor.py` shortens Terragrunt's unit prefixes.
- **Error report** with catalog matches and suggested fixes (`error_report.py`, `error_catalog.py`).
- **Final report** summarizing units, results and gate outcomes.
- **Redaction** before plan JSON is written for scanners or artifacts.

```python
REDACTED_PLACEHOLDER = "***REDACTED_BY_tfplan_to_json***"
```

What I'd change: emit one machine-readable JSON line at the end of each run (consumer, stack, action,
shared ref, duration, units, adds/changes/destroys, gate outcomes, failure category). The human report
stays; the JSON line is what the cross-consumer dashboard parses, instead of scraping colored logs.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Alerts I'd configure:

| Alert | Condition | Route |
|---|---|---|
| Platform failure spike | ≥ 3 consumers failing with a "platform" category within 2 hours | Platform team, business hours |
| Plan-after-apply not clean | Any | Consumer team + platform (non-converging module) |
| Drift with destroys | Any | Consumer team (Jira priority already escalates) |
| Stacks failing to plan in the drift scan | Same stack two weeks running | Consumer team |
| Gate override in production | Any `--*-override` | Security, as evidence |
| Lock releases | > 5 in a week | Platform (runs being killed) |

The gate-override alert is the governance one: overrides are allowed by design at soft-mandatory, and the
control is that someone outside the team sees each one.

</div>

</details>

<details class="project-iq" markdown="1" id="monitoring-and-observability-q3">
<summary>Walk me through how you would troubleshoot a production issue in this system.</summary>

<div class="iq-role" data-role="architect" markdown="1">

Say "our production plan suddenly wants to replace a storage account":

1. **Stop:** don't approve. A plan is only a proposal; nothing has changed yet.
2. **Classify:** YAML, cloud or platform? Check what changed since the last clean plan:
   - the consumer's YAML (Git history);
   - the consumer's Y-IaC ref (did it move to a new release?);
   - provider pins in `config/providers.yaml` at that ref;
   - drift (did someone change the resource in the portal?).
3. **Read the plan detail:** which attribute forces replacement? A provider default change points at a
   version bump; a changed address points at a missing `moved` block; a changed attribute value points at
   YAML or drift.
4. **Contain:** if it's the platform, pin the consumer back to the last good ref and tell other consumers
   (the incident steps are: contain, assess applies that ran on the bad ref, fix with a test, recover,
   review).
5. **Fix at the right layer:** a `moved` block or a backward-compatible template in Y-IaC; a provider pin
   override for that unit; a YAML fix; or import/reconcile for drift.
6. **Verify:** a clean plan before any apply, then plan-after-apply.

For stuck runs, the other common case: a lock from a killed job, released only if older than the minimum
age.

Deeper: [Incident response](/posts/projects/y-iac/16-support-and-maintenance/#incident-response).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Commands for "the production plan wants to replace a storage account":

```bash
# 1. What changed since the last clean plan?
git log --oneline -10 -- environments/<cloud>/<env>/<stack>/ config.yaml .github/workflows/
yq '.workflow[0].iac_shared_module_ref' config.yaml
# 2. Which attribute forces replacement?
terraform -chdir=.terragrunt-stack/azurerm_storage_account show -json tfplan | jq '.resource_changes[] | select(.change.actions|index("delete")) | {address, replace_paths: .change.replace_paths}'
# 3. Did provider pins change at that ref?
git -C terragrunt_shared_module log -5 --oneline -- config/providers.yaml
# 4. Contain: pin back both refs if it's the platform
```

`replace_paths` in the plan JSON names exactly which attributes force the replacement, which is usually
the fastest way to tell drift (a portal change) from a provider default change from a YAML change.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Running the incident:

1. **Don't approve**; a plan is a proposal.
2. **Scope**: one consumer or many? Check other consumers' recent plans for the same symptom.
3. **Contain**: if platform-caused, pin back affected consumers and post in the consumer channel.
4. **Assess**: did any apply run on the bad ref? Plan-after-apply results tell you.
5. **Fix**: a `moved` block, a backward-compatible template, a provider override, or YAML.
6. **Verify**: clean plans in every affected consumer before unpinning.
7. **Review**: add a fixture to the generated-output tests and an error-catalog entry.

```bash
for r in <consumers>; do gh run list --repo <owner>/$r --limit 3 --json conclusion,headSha,createdAt; done
```

The reliability insight for a shared platform: the incident is often *in* one repo but *caused* by
another. Checking other consumers in step 2 is what turns "their problem" into "our release" quickly.

</div>

</details>

## Cost, Maintenance and Support
{: #cost-maintenance-and-support }

<details class="project-iq" markdown="1" id="cost-maintenance-and-support-q1">
<summary>What drives the cost of running the system, and how do you keep it under control?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Two kinds of cost, and the platform touches both:

**The platform's own cost** is small because there's no service to run: GitHub Actions minutes (mostly
from weekly drift scans across every stack), state storage, and scanner licences (Wiz). Levers:

- drift scans weekly for production and less often for non-production;
- skip unchanged stacks where safe;
- plugin and tool caches to shorten runs;
- change detection so routine CI only plans what changed.

**The cost of the infrastructure it creates** is where a platform can change behaviour. **Infracost** runs as a
gate on every plan (when enabled), so a PR shows the monthly cost change before anyone approves it. That
moves cost conversations from the monthly bill to the code review.

And the **people cost**: keeping 175 modules on 20 provider pins current. The lever there is the module
usage scan: modules with no consumer are maintenance with no return, and a deprecation policy lets us
retire them.

> **TODO:** What do Actions minutes and Wiz cost per month for the platform, and is Infracost enabled for
> production consumers?
{: .prompt-warning }

Deeper: [Cost optimization](/posts/projects/y-iac/18-continuous-improvement/#cost-optimization).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Cost levers:

| Cost | Lever |
|---|---|
| Actions minutes | Change detection; staggered and less frequent non-production drift scans; tool caches |
| Init time | Fix the plugin-cache variable (`TF_PLUGIN_CACHE_DIR`), or bake providers into the runner image |
| Wiz licence | Scanner choice per consumer (`--iac-scanner`) |
| State storage | Version lifecycle rules (delete non-current versions after 90 days) |
| Created infrastructure | Infracost gate on every plan where enabled |

```bash
gh api /orgs/<owner>/settings/billing/actions --jq '{total_minutes_used, included_minutes}'
az storage account management-policy create --account-name <state-account> -g <rg> --policy @lifecycle.json
```

The biggest lever on the platform's own cost is probably init: if providers download for every unit of
every stack on every run, fixing the cache variable cuts minutes and bandwidth across all consumers at once.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Cost as a signal:

- **Minutes per consumer per week**, split into PR plans, applies and drift scans.
- **Infracost deltas** per PR, aggregated per consumer per month (the gate already computes them).
- **Wiz scans per week**, if licensing is per scan.

```bash
gh run list --repo <owner>/<consumer> --limit 100 --json name,createdAt,updatedAt \
  | jq 'group_by(.name) | map({name: .[0].name, runs: length})'
```

The SRE angle: the drift scan is both the biggest recurring cost and the main reliability signal, so
tuning its frequency is a trade-off to make explicitly (weekly for production, monthly for sandbox), not
by default.

> **TODO:** What do Actions minutes and Wiz cost per month for the platform?
{: .prompt-warning }

</div>

</details>

<details class="project-iq" markdown="1" id="cost-maintenance-and-support-q2">
<summary>How is the system maintained and supported after go-live?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**The DevOps team owns platform support and on-call.** Business-hours cover is enough while production
consumers pin release tags, because a new release can't reach them unannounced.

**Support tiers:**

| Tier | Who | Handles |
|---|---|---|
| 0 | The CLI | Error report with a catalog match and a suggested fix |
| 1 | Consumer team | Their YAML, credentials, drift |
| 2 | DevOps team | Shared-path bugs, module defects, workflow failures, releases |
| 3 | Cloud, network, identity owners | Subscriptions, quotas, private networking, RBAC |

Tier 0 is the cheapest support there is, and every incident review should add a catalog entry.

**Maintenance is mostly keeping up**: 175 modules on 20 provider pins, plus Terraform, Terragrunt, TFLint,
Wiz CLI, Python and a dozen Actions, each releasing on its own schedule. Provider bumps go through the
compatibility run; triage weighs severity, affected module and **blast radius** (how many consumers).

**Proposed response targets:** a shared CLI failure blocking many consumers gets a first response in an
hour and a pin-back within an hour; a workflow failure in the shared path four working hours; a module
defect affecting one consumer, the next patch release.

Deeper: [Support model](/posts/projects/y-iac/16-support-and-maintenance/#support-model-and-ownership).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Routine maintenance:

- **Provider bumps** in `config/providers.yaml`, through the compatibility run.
- **Tool versions** in `setup-environment` (Terragrunt, TFLint, kubelogin, Wiz), with the Wiz version
  pinned.
- **Python dependencies** in `requirements.txt` and the stub's install list.
- **GitHub Actions** versions (`actions/checkout@v5`, `actions/cache@v5`) via Dependabot.
- **Repo hygiene**: remove `python_delete/`, the `.yamls` duplicate workflow, rename the
  `compatibilty` typo, fix the Backstage catalog entry.

```bash
terraform providers lock -platform=linux_amd64 -platform=darwin_arm64   # per module after a bump
gh workflow run terragrunt-compatibilty.yaml --ref <bump-branch>
```

The maintenance practice I'd add: a monthly "platform patch" release with grouped updates, so consumers
move once a month on a predictable cadence rather than chasing individual bumps.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Support from the reliability side:

| Tier | Tooling |
|---|---|
| 0 (the CLI) | Error catalog match with a suggested fix |
| 1 (consumer team) | Runbooks: YAML errors, credentials, drift, locks |
| 2 (platform) | Cross-consumer run data, compatibility runs, pin-back |
| 3 (cloud owners) | Quotas, RBAC, networking |

Toil to remove: manual lock releases (enable the age-guarded auto-release in CI where safe), manual
adoption checks (the ref report), and drift tickets for known, accepted drift (an ignore list per
consumer with an expiry date).

```bash
yq '.errors | length' config/error_message_and_solutions.yaml    # catalog size
yq '.errors[].id' config/error_message_and_solutions.yaml | tail -5
```

Each entry has an `id`, `match.fragments` (all or any) and `solutions`; tracking the count after each
incident shows whether Tier 0 is growing.

</div>

</details>

## Leadership, Stakeholders and Governance
{: #leadership-stakeholders-and-governance }

<details class="project-iq" markdown="1" id="leadership-stakeholders-and-governance-q1">
<summary>How did you communicate the architecture and progress to stakeholders and executives?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I wrote a **project readiness and delivery guide**: an 18-section planning baseline covering goals,
users, scope, what's consumer-owned versus shared, success measures, a risk-based priority order, the
MVP, six milestones and the list of open decisions. That document did most of the stakeholder work,
because it made the platform legible to people who'll never read HCL.

The framing I used with different audiences:

- **Leadership and security:** not "we saved typing" but **"every apply goes through the same gates"**:
  policy, security and cost checks on every plan, approvals and evidence by default. That's something
  audit can rely on.
- **Consumer teams:** "your repo becomes YAML", with an onboarding guide and a worked example.
- **Maintainers:** the priority order, **state safety and security first, convenience last**, so roadmap
  arguments have a referee.

**Progress** is reported against the six milestones (Foundation, Consumer scale, Module maturity,
Governance maturity, Operational maturity, Continuous improvement), with an honest "where we are" per
milestone. Today: foundation largely there, 19 consumer backends configured, gates in place, measurement
and the exception process still to do.

Deeper: [Release milestones](/posts/projects/y-iac/03-product-planning/#release-milestones).

</div>

</details>

<details class="project-iq" markdown="1" id="leadership-stakeholders-and-governance-q2">
<summary>How do you document and govern architectural decisions?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**ADRs:** eight are listed, several already decided in code (backend strategy, provider version policy,
conditional dependencies, release compatibility, enforcement levels, lock recovery, workflow ownership),
so the ADRs record them rather than decide them. One is explicitly **not decided**: deprecation policy.
Listing open decisions as open, instead of letting code decide them implicitly, is the habit I'd point to.

**Governance**, sized for a platform team:

| Forum | Cadence | Decides |
|---|---|---|
| Platform weekly | Weekly | Backlog, releases, incidents |
| Change review | Per PR | Shared-path and contract changes, through CODEOWNERS |
| Consumer forum | Monthly | Roadmap feedback, upcoming breaking changes, deprecations |
| Governance review | Quarterly | Gate defaults, exceptions, access reviews, KPIs |

**Decision rights:** new providers or public interfaces need the platform owner plus a maintainer; state,
auth, policy defaults and gates need the platform owner plus security; **gate exceptions are time-boxed
and approved by security**. The DevOps team holds the platform owner role, so I'd always add a security
approver for gate decisions: **a team should never approve its own exceptions.**

A shared IaC platform is a governance tool whether you plan it or not; the rules about changing the rules
matter as much as the rules.

Deeper: [Governance](/posts/projects/y-iac/17-governance-and-compliance/#project-governance).

</div>

</details>

<details class="project-iq" markdown="1" id="leadership-stakeholders-and-governance-q3">
<summary>How did you bring other engineers onto the project?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Y-IaC is already better documented than most internal platforms, and onboarding is built around
**personas**:

- **A getting-started index** where you choose a persona, then follow numbered guides: onboard a consumer,
  add a module, modify a module, the CI/CD workflows (one page each), Python internals, the consumer config
  reference, and a function-by-function trace of one CLI command.
- **A generated module reference site** on GitHub Pages, built from module READMEs.
- **The first rule, stated up front:** never change code inside a consumer's synced copy; the next
  bootstrap overwrites it.
- **A local loop that matches CI:** clone Y-IaC and a consumer side by side and run the real CLI.
- **Docstrings that explain why**, which make a shared codebase reviewable.
- **A backlog seed** of 92 stories in the repo, so new contributors can find well-scoped work.

What I'd add: a **cookbook** of short YAML recipes for consumers, ADRs for maintainers, and fixing the
Backstage catalog entry, which still has sample annotations from a template, because that's how people
find the platform's owner and docs.

> **TODO:** How long does a new consumer take to go from an empty repo to a first approved apply?
{: .prompt-warning }

Deeper: [User guides](/posts/projects/y-iac/15-documentation-and-knowledge-transfer/#user-guides).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The developer onboarding path:

1. **Clone both repos side by side** and run a plan against a sandbox stack.
2. **Read in order**: `entrypoint.py` (86 lines), `cli/app.py`, `generators/stack_generator.py`,
   `generators/common_vars_merge.py` (with its docstring about `find_in_parent_folders`), `template/root.hcl`,
   one unit template, `validation/base.py`.
3. **First change**: add an optional input to an existing module, end to end: `variables.tf`, the unit
   template's `inputs` with a `try()` default, the README's YAML example, a generation test.
4. **The rule**: never edit a consumer's synced copy of shared files; the next bootstrap overwrites it.

```bash
pytest tests -k generator -q
python tools/validate_terraform_module.py cloud/azure/terraform/<module>
```

What I'd add for new developers: a short "architecture in 15 minutes" page built around one traced
command (the function-by-function trace already exists), and ADRs so the "why" behind per-unit state and
the lock policy isn't only in docstrings.

> **TODO:** How long does a new contributor take to land their first module change?
{: .prompt-warning }

</div>

</details>

## Lessons Learned and Trade-offs
{: #lessons-learned-and-trade-offs }

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q1">
<summary>What was the hardest technical problem, and how did you solve it?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Making generated infrastructure behave exactly as if a person had written it, across dozens of repos,
without silent mistakes.** Generation is powerful, and its failures are quiet: a successful plan against
the wrong variables looks just like a successful plan against the right ones.

The clearest example is the **common_vars merge**. Unit templates find variables with
`find_in_parent_folders("common_vars.yaml")`. Searching upward from `.terragrunt-stack/<unit>/`, the first
match is `.terragrunt-stack/` itself. So the CLI writes the **merged** environment and stack variables
there. Without that, the search silently falls through to the environment file, stack-level overrides
vanish, and the plan succeeds against the wrong values.

The general solutions that came out of problems like this:

- **Validate before generating:** duplicate YAML keys (YAML silently keeps the last), empty resource
  files, unknown subscriptions.
- **Review generated output**, not just source: a diff of `terragrunt.stack.hcl` and `provider.tf` before
  and after a change is the best review artifact.
- **Close the loop:** plan-after-apply and drift scans catch what tests can't.
- **Explain the why in docstrings**, so the next person doesn't "simplify" the fix away.

Deeper: [How one run works](/posts/projects/y-iac/05-technical-architecture/#system-context-and-component-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The hardest problems were silent ones, and the code shows how each was caught:

- **Duplicate YAML keys** vanish in `yaml.safe_load`; the fix inspects the composed node graph instead
  (`find_duplicate_keys`), and reports rather than merges, because guessing wrong destroys infrastructure.
- **`find_in_parent_folders` resolution**: the merged `common_vars.yaml` is written into
  `.terragrunt-stack/` because that's the first folder the upward search checks; anywhere else, stack
  overrides silently disappear.
- **Lock release**: an unknown lock age is treated as "not safe", so a retry never breaks a live apply.

```python
if age is None:
    return ReleaseDecision(False, f"lock creation time is unknown — set {ENV_MIN_AGE_MINUTES}=0 to release it anyway")
```

The developer lesson: in a generator, every silent fallback (a default, a search that "finds something",
a parser that keeps the last key) is a potential wrong plan. Each one needs either a hard failure or a
loud report, and a docstring explaining which and why.

</div>

</details>

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q2">
<summary>What would you do differently if you started again?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Would change | Instead |
|---|---|
| Credentials interpolated into generated `provider.tf` | Providers read their own environment variables; OIDC from day one |
| Long-lived CI client secrets | Federated credentials per repo and environment |
| Consumers able to track `main` | Release tags from the first consumer; release candidates for trials |
| Unmapped repos unrestricted by the subscription guardrail | Every repo mapped at onboarding |
| Scanner missing means warn and skip | Mandatory gates fail closed in production |
| No coverage floor | `--cov-fail-under` from the start |
| No direct test for `root.hcl` | A rendering test for the most shared file |
| Deprecation policy left open | Decided before the module count grew |

What I'd **keep**: YAML-only consumers, one source of truth, generation at run time, one unit per
resource type with its own state, gates on the plan, plan-after-apply, drift tickets with fingerprints,
and the opt-in, age-guarded lock recovery.

The broader lesson: **a shared platform multiplies everything**, good defaults and bad ones. So the
defaults (pinning, fail-closed gates, least-privilege identities) deserve more design time than features.

Deeper: [Retrospectives](/posts/projects/y-iac/18-continuous-improvement/#retrospectives).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Code-level changes I'd make from the start:

| Instead of | I'd do |
|---|---|
| `get_env` interpolation of secrets into `provider.tf` | Providers reading `ARM_*` themselves |
| A denylist for redaction | Redaction from the provider schema's `sensitive` flags |
| A broad `except ImportError` fallback in the stub | Catch only the missing-package case |
| Runtime `pip install` of ranges | A pinned, hashed requirements file |
| `TERRAFORM_PLUGIN_CACHE_DIR` | `TF_PLUGIN_CACHE_DIR`, with a test |
| A drift fingerprint over counts | A fingerprint over drifted addresses |
| Optional `moved` blocks | A validator rule requiring them on address changes |
| No `root.hcl` test | A rendering test for the most shared file |

What I'd keep: YAML-only consumers, generation at run time, `BaseValidator` with enforcement levels, the
lock policy, and docstrings that explain why.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Platform choices I'd make differently:

- **OIDC from the first consumer**, not client secrets.
- **One ref** that pins both the workflows and the CLI, from day one.
- **Tags only** for production consumers; release candidates for trials.
- **Ephemeral runners** for any self-hosted pool.
- **Mandatory gates fail closed** when a scanner is missing.
- **Staggered drift crons**.
- **A cross-consumer run dataset** before the tenth consumer.

```yaml
permissions:
  id-token: write      # already in the template; the azure/login step with client-id + OIDC is what's missing
```

What I'd keep: reusable workflows, `max-parallel: 1` applies, plan-after-apply, environment approvals,
and Jira drift tickets with Jira itself storing the fingerprint.

</div>

</details>

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q3">
<summary>What technical debt exists today, and how would you pay it down?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Debt | Impact | Retire when |
|---|---|---|
| Generated `provider.tf` interpolates secrets | Secrets in cache and binary plans | Providers read env vars directly, or OIDC |
| `values` written to every unit but unused by 132 cloud templates | Two sources of truth | Templates use `values`, or the generator stops writing them |
| Legacy `python/` layout and fallback import | Two code paths | Every consumer re-synced to `src/` |
| Leftover `python_delete/` and duplicate templates | Confusion about what's live | Deleted |
| Template says "daily drift", cron is weekly | Misleading operators | Fixed |
| Default ZPA customer ID in `root.hcl` | Tenant identifier in shared code | Read from env only |
| Workflow filename typo (`compatibilty`) | Annoying, referenced in docs | Renamed |
| Plugin cache set via `TERRAFORM_PLUGIN_CACHE_DIR` (Terraform reads `TF_PLUGIN_CACHE_DIR`) | Providers likely downloaded on every init | Variable renamed and verified |
| Consumer template calls reusable workflows at `@main` | Pinning `iac_shared_module_ref` alone doesn't pin workflow YAML | One ref drives both |
| Drift fingerprint hashes counts, not resource addresses | New drift with the same counts is suppressed | Addresses in the fingerprint |
| Only one module uses `moved` blocks | Renames show as replacements in consumers | `moved` blocks required by the validator |
| "Pending Verification" CHANGELOG items | Unverified behaviour in production paths | Verified or reverted |

**How I'd pay it down:** 20% of every iteration is reserved for debt, because on a shared platform debt
compounds across consumers. **Order by risk**: the secrets-in-cache item first (security), then anything
that can make a plan wrong silently (`values` versus direct reads, unverified items), then cleanup.
Each item has a **retire-when condition**, so "done" is objective.

Deeper: [Technical debt](/posts/projects/y-iac/09-implementation/#technical-debt-tracking).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Code debt, with where it lives:

| Debt | Where | Fix |
|---|---|---|
| Secrets interpolated into generated providers | `template/root.hcl` | Drop credential arguments; env-var auth |
| Plugin cache variable name | `template/root.hcl` (`extra_arguments "custom_plugin_cache"`) | `TF_PLUGIN_CACHE_DIR` |
| Drift fingerprint over counts | `tools/jira_drift_ticket/jira_drift_ticket.py` | Include addresses |
| Broad `ImportError` fallback | `entrypoint.py` (all consumers) | Narrow the except |
| Duplicate-key lint is report-only | `generators/resources_lint.py` | Fail on duplicate resource types in CI |
| `values` written but unused by most templates | Generator and templates | Pick one source |
| Legacy `python/` and `python_delete/` | Repo root | Delete after re-sync |

Order: the security item first, then anything that can make a plan wrong silently (duplicates, `values`),
then performance (the cache), then hygiene.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Platform debt:

| Debt | Fix | Size |
|---|---|---|
| Workflows called at `@main` | Tag refs, bumped with `iac_shared_module_ref` | Small |
| Long-lived CI secrets | Federated credentials per repo and environment | Medium |
| Wiz CLI unpinned by default | Pin in the setup action | Trivial |
| Stray `terragrunt-cicd.yamls`, `compatibilty` typo | Delete, rename | Trivial |
| No cross-consumer metrics | Scheduled collector + dashboard | Medium |
| No version lifecycle on state storage | Management policy | Small |
| Simultaneous drift crons | Stagger by repo | Small |

I'd schedule them as a reserved share of each iteration, ordered by risk: the identity and ref items
first, because they decide what reaches every consumer and with what access.

</div>

</details>

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q4">
<summary>Where does the system go next, and how does the architecture support that?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The next two milestones, in the order I'd estimate:

1. **Governance maturity:** the gates exist, so measure them. Per-environment enforcement levels, a
   written time-boxed exception process approved by security, evidence export for audits, and fail-closed
   scanners in production.
2. **Module maturity:** fill uneven coverage (AWS has 5 modules and GCP 4, against 94 for Azure),
   compatibility plans for provider upgrades, and a deprecation policy.

Then **operational maturity**: the cross-consumer dashboard, reliability targets, DR drills on every
backend type, and adoption tracking by ref.

Platform-level improvements I'd add along the way: OIDC everywhere, JSON Schemas generated from module
variables for editor validation, a cookbook, and a self-service form in the developer portal that writes
YAML into a PR.

The architecture supports all of it because growth is **additive**: a new resource type is a module plus
a unit template; a new cloud is a folder and a backend entry; a new gate is a validation module reading
the same plan JSON; and a new consumer is a bootstrap command. The thing that must not change is the
contract: consumers write YAML, and everything else is generated from one source of truth.

Deeper: [Product roadmap](/posts/projects/y-iac/03-product-planning/#product-roadmap).

</div>

</details>

{% include project-nav.html %}
