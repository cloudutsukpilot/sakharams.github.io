---
layout: post
title: "Y-IaC: CI/CD and Release Management"
date: 2026-10-05 00:12:00 +0530
categories: [projects, y-iac]
tags: [Projects, Y-IaC, CICD, Release]
description: "Y-IaC's pipelines: plan on PR, approved apply on main, plan-after-apply, weekly drift, and releasing the platform itself through refs consumers pin."
project: y-iac
project_step: 12
image:
  path: /assets/img/projects/y-iac/12-cicd-and-release-management.webp
  alt: "Y-IaC: CI/CD and Release Management - Projects hero image"
---

Y-IaC has two pipelines, and they're easy to confuse. One is the pipeline every consumer runs: plan on a
pull request, approved apply on `main`, drift on a schedule. The other is how Y-IaC itself is released,
which, because consumers pull it by ref, is really a question of which ref each consumer points at. This
post covers both, with an animated walk through the first.

<!-- more -->

{% include project-nav.html %}

## Build automation
{: #build-automation }

Nothing in Y-IaC is compiled. "Build" means preparing a runner and generating the stack:

- `set-build-variables` reads the consumer's `config.yaml` workflow block: shared repo, Y-IaC ref
  (`iac_shared_module_ref`, falling back to the `TERRAGRUNT_SHARED_MODULE_VERSION` input, then `main`)
  and runner.
- The composite action `.github/actions/setup-environment` installs Terragrunt, TFLint, kubelogin and
  Wiz CLI in parallel, with a shared cache keyed on their versions.
- The CLI generates `terragrunt.stack.hcl`, the units and the merged variables at run time.

For Y-IaC itself, `code-quality-ci.yaml` and `python-quality.yaml` are the build: lint, format and tests
on every PR. `docs-pages.yaml` builds and publishes the module reference site.

## Automated test execution
{: #automated-test-execution }

| Trigger | What runs |
|---|---|
| PR to Y-IaC | Python quality (ruff, pytest), code quality, module validation for touched modules |
| Manual, before a release | `terragrunt-compatibilty.yaml`: init and plan across consumer stacks against the branch |
| Consumer PR | Plan for every changed stack, with gates |
| Consumer push to `main` | Plan, approved apply, plan-after-apply |
| Weekly schedule (Sunday 06:00 UTC) | Plan of every stack, drift analysis |

The plan-after-apply job is an underrated test. If a plan straight after a successful apply still shows
changes, the module or provider doesn't converge, and that's a bug to fix before anyone else hits it.

## Static analysis and security scanning
{: #static-analysis-and-security-scanning }

On the platform code: `ruff` for Python (with the security rules that make it flag `subprocess` calls,
which the package answers with argv-form calls and explicit `noqa` notes), TFLint and `terraform validate`
per module, `terragrunt hcl format --check` on unit templates, yamllint for YAML.

On every consumer plan: OPA policies, Trivy or Wiz on the redacted plan JSON (selected by
`iac_scanner`: `wiz`, `trivy`, `both` or `none`), Trivy's secret scan on the working directory, and
Infracost when enabled. A TFLint hook also runs before every `init` and `plan` through `root.hcl`, and
skips with a warning if TFLint isn't installed.

## Artifact and container management
{: #artifact-and-container-management }

Y-IaC produces no containers and no packages. The artifacts are:

| Artifact | Where | Kept |
|---|---|---|
| Plan files and plan JSON per unit | Workflow artifacts | 7 days (`retention-days: 7`) |
| Summary report | Job summary, PR | With the run |
| Wiz and Trivy reports | Workflow artifacts / local report retention in config | Per tool config |
| The platform itself | Git refs (branch or tag) | Forever |

Seven days is right for raw plan files, which can contain sensitive diffs. It's too short if those
plans are the audit evidence; the [retention decision](/posts/projects/y-iac/06-security-and-privacy/#audit-logging)
should export summaries elsewhere rather than keep plans longer.

## Deployment automation
{: #deployment-automation }

The consumer pipeline, generated from `template/terragrunt-cicd.yaml` by bootstrap. Step through a
pull request to an approved apply, or tick the box to see a rejected approval:

{% include flow-anim.html id="projects/y-iac/cicd-pipeline" %}

The jobs behind it, all calling reusable workflows in Y-IaC:

| Job | Reusable workflow | Runs when |
|---|---|---|
| `detect-changes` | `detect-changes.yaml` | Push or PR |
| `manual-dispatch` | `manual-dispatch.yaml` | Manual run (not a drift scan) |
| `scheduled-drift-scan` | `iac-scheduled-drift-scan.yaml` | Schedule or manual drift scan |
| `terragrunt-plan` | `terragrunt-ci.yaml` | Any of the above found changes |
| `generate-summary-report` | `terragrunt-summary-report.yaml` | After plan |
| `terragrunt-apply` | `terragrunt-cd.yaml` | Push to `main` (or manual apply on `main`), after plan and summary succeed |
| `terragrunt-plan-after-apply` | `terragrunt-ci.yaml` | After a successful apply |
| `drift-detection-analyze`, `-notify`, `-jira-ticket` | `iac-drift-detection-analyze.yaml`, `iac-teams-notification.yaml`, `iac-jira-drift-ticket.yaml` | Scheduled runs with drift or failed stacks |
| `invoke-jira-webhook-*` | `github-jira-webhook.yaml` | PR opened; apply on `main` |

## Database deployment strategy
{: #database-deployment-strategy }

Databases are mostly consumer business, but two parts touch the platform. First, data-bearing resources
(storage accounts, managed disks, FHIR services, Key Vaults) need the same care as schema changes: a
plan that replaces one must be treated as a migration, not a routine apply. The OPA and plan summary
gates should make any `delete` on these types impossible to miss.

Second, Y-IaC has an Atlas provider family (`providers/atlas/`, with `atlas_schema` and
`atlas_migration` modules). That brings declarative database schema changes into the same YAML, plan and
approval flow as infrastructure. I'd document when to use it and when a team's own migration tooling is
the better choice.

None of the consumers I could inspect declares Atlas resources, so I'd treat the Atlas modules as
**experimental** until a consumer adopts them and documents the pattern.

## Approval gates
{: #approval-gates }

Four gates stand between a YAML change and the cloud:

1. **PR review** on the consumer repo (branch protection, CODEOWNERS).
2. **Plan gates**: OPA, scanner and cost, each at advisory, soft-mandatory or mandatory.
3. **GitHub environment protection** on the apply job: required reviewers per environment, configured
   in the consumer's GitHub settings (for cloudutsukpilot, declared in `infra-github`).
4. **Serial applies** (`max-parallel: 1`), so a reviewer approves one stack at a time and an early
   failure stops the rest from piling up.

For Y-IaC itself, the gate is the PR plus the compatibility run for shared-path changes.

## Versioning and release notes
{: #versioning-and-release-notes }

The release mechanism is the ref each consumer pins in `config.yaml`:

```yaml
workflow:
  - iac_github_org: cloudutsukpilot
    iac_shared_repo: y-iac
    iac_runner: ubuntu-latest
    iac_shared_module_ref: v1.4.0     # a tag, not main
```

Today there's one tag (`v1.0.0`) and consumers point at `main` or a feature branch. That means every merge
is a release to every consumer on `main`. My recommendation:

- **Semantic versioning** on tags. Breaking a module input, a YAML shape, a generated file or a gate
  default is a major version.
- **CHANGELOG sections per release**, moving entries out of "Unreleased" and dropping the "Pending
  Verification" prefix only when verified.
- **Release notes** that list affected modules and the consumer action needed, if any.
- **Production consumers pin tags**; non-production can track `main` to catch problems early.

## Rollback and roll-forward procedures
{: #rollback-and-roll-forward-procedures }

Two kinds of rollback, with very different costs:

**Platform rollback** is cheap: point the consumer's `iac_shared_module_ref` back to the last good tag
and re-run. The bootstrap hash changes, so the consumer re-syncs the old version on the next run.

**Infrastructure rollback** is not a Y-IaC button. Terraform has no "undo"; you roll *forward* by
reverting the YAML change and applying again. For a change that destroyed or replaced a data-bearing
resource, that's a restore, covered in [Data and Integration](/posts/projects/y-iac/07-data-and-integration/#backup-and-restore-strategy).

The rule that keeps rollbacks rare: never approve an apply whose plan you didn't read, and never approve
a replacement of a stateful resource without a restore path.

## Release calendar
{: #release-calendar }

I'd release Y-IaC on a fixed cadence, every two weeks after the iteration, with exceptions only for
security fixes:

| When | What |
|---|---|
| Iteration end | Tag a release candidate, run compatibility, trial on volunteer consumers |
| +1 week | Tag the release, publish notes, announce in the platform channel |
| Monthly | Provider version review (`providers.yaml`) as its own release |
| Any time | Security fixes as patch releases |

Avoid releasing on Fridays or before holidays; consumers on `main` would pick the change up on their
next run with nobody around.

## Checklist
{: #checklist }

- [ ] Consumers' `iac_shared_module_ref` values are inventoried
- [ ] Semantic versioning and a tagging procedure are written down
- [ ] Production consumers pin a tag
- [ ] Plan-after-apply failures open an issue automatically
- [ ] Compatibility runs are required for shared-path PRs
- [ ] Artifact retention matches the audit decision (summaries exported if needed)
- [ ] Atlas provider usage is documented or marked experimental
- [ ] Release cadence is announced to consumers

{% include project-nav.html %}
