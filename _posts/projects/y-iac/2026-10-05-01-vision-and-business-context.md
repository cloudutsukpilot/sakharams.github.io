---
layout: post
title: "Y-IaC: Vision and Business Context"
date: 2026-10-05 00:01:00 +0530
categories: [projects, y-iac]
tags: [Projects, Y-IaC, Vision, Business]
description: "Why Y-IaC exists: one shared Terraform and Terragrunt platform, a YAML-driven Python CLI and reusable workflows, so infra-* repos stop copying HCL."
project: y-iac
project_step: 1
image:
  path: /assets/img/projects/y-iac/01-vision-and-business-context.webp
  alt: "Y-IaC: Vision and Business Context - Projects hero image"
---

Every infra-* repository I've seen grow on its own ends up with its own copy of a storage account module,
its own provider block, its own backend wiring and its own pipeline, each a little different from the
last one. Y-IaC is the shared Terraform and Terragrunt module platform that replaces those copies: a
consumer repo writes YAML, and Y-IaC turns it into a reviewed, policy-checked plan. This post is about
why that's worth running as a product, and how we'll know it's working.

<!-- more -->

{% include project-nav.html %}

## Business problem and opportunity
{: #business-problem-and-opportunity }

Infrastructure code is cheap to write once and expensive to keep consistent. When each team owns a full
Terraform setup, the same decisions get made over and over: which azurerm version, how state is keyed,
which tags are mandatory, which checks run before an apply. Some repos get them right. Others drift, and
nobody notices until an audit or an outage.

The shared module repository (`terragrunt_shared_module` on disk, `y-iac` on GitHub for the cloudutsukpilot
consumers) puts those decisions in one place:

- **175 Terraform modules**: 146 under `cloud/` (Azure alone has 94, plus AWS, GCP, Entra, GitHub, JFrog,
  k3d, minikube and Zscaler) and 29 under `providers/` (Kubernetes, Grafana, Helm, ArgoCD, Atlas, null).
- **One Python CLI**, reached through an identical `entrypoint.py` stub in every consumer.
- **One `root.hcl` template** that generates `provider.tf` and `backend.tf` for every unit.
- **Reusable GitHub Actions** for plan, approved apply, drift, summaries and notifications.

The opportunity is that a consumer like `infra-aws` shrinks to a `config.yaml`, a `common_vars.yaml` per
environment and a `resources.yaml` per stack. Everything that should be the same everywhere *is* the same,
because there's only one copy of it.

## Goals, objectives, and expected outcomes
{: #goals-objectives-and-expected-outcomes }

The guide behind this playbook lists seven goals. I've grouped them by what they change for people:

| Goal | What changes |
|---|---|
| Reusable modules with consistent interfaces and docs | A new resource type is added once and used by every consumer |
| Less duplicated Terragrunt, Terraform and CI/CD code | Consumers hold YAML, not HCL or pipeline logic |
| Visible changes through plans, reviews and summaries | Reviewers read a plan table, not a YAML diff |
| Consistent security, policy, cost and compatibility checks | OPA, Trivy or Wiz, and Infracost run on every plan |
| Faster onboarding for consumers and contributors | A new repo is a bootstrap command, not a copy-paste exercise |
| Safe provider and module evolution | Compatibility checks before a provider bump reaches consumers |
| Better import, state recovery, drift and visualization tooling | Operators have commands, not tribal knowledge |

The outcome I care about most is the fourth one. A shared platform that only saves typing is nice. A
shared platform that guarantees every apply went through the same gates is something security and audit
can rely on.

The DevOps team owns these goals. My estimate of the order for the next two quarters puts governance
first, because the gates already exist and only need measuring, and module maturity second (see the
[roadmap](/posts/projects/y-iac/03-product-planning/#product-roadmap)).

## Stakeholders, sponsors, and decision-makers
{: #stakeholders-sponsors-and-decision-makers }

The guide names the groups but no people, and I'll keep it that way here until the operating agreement
exists:

| Stakeholder | What they decide or care about |
|---|---|
| Platform DevOps team | Product ownership, standards, roadmap, releases, support model |
| Module maintainers | Module contracts, provider behavior, tests, docs, compatibility |
| Infrastructure and application teams | Onboarding, environment config, plans and deployments |
| Security and compliance | Scanning, policy enforcement, access control, audit evidence, exceptions |
| Cloud and network owners | Subscriptions, quotas, backend storage, connectivity, identity |
| CI/CD and release owners | Workflow templates, approvals, credentials, artifacts, rollback |
| Service and business owners | Workload outcomes, risk acceptance, budget, go-live |

The tension to manage is between the first and the fifth rows. The platform team wants to change shared
code quickly; cloud owners want nothing in their subscription to change without their say. The
[approval gates](/posts/projects/y-iac/12-cicd-and-release-management/#approval-gates) are where that
tension is resolved in practice.

In practice the DevOps team holds every row of the platform side of this table: product ownership,
module maintenance, CI/CD, releases and support. Breaking changes to a shared module are decided by the
DevOps team, after notice to the affected consumers.

## Target users and personas
{: #target-users-and-personas }

Y-IaC has no end users in the usual sense. Its users are engineers, and they come in four shapes, which
match the persona guides already in `docs/getting-started/`:

- **Consumer engineer.** Owns an infra-* repo. Wants to add a Key Vault or a GitHub repository by
  editing YAML, run a plan locally, and get it through CI without learning Terragrunt internals.
- **Module contributor.** Adds or changes a module under `cloud/` or `providers/`. Needs the module
  validator, a clear module contract and examples.
- **Platform maintainer.** Works on the Python package, `root.hcl` and the reusable workflows. Needs tests,
  compatibility checks and a way to see which consumers a change will hit.
- **Operator.** Diagnoses a failed plan, a stuck state lock, a drift ticket or an import. Needs runbooks
  and error messages that say what to do next.

A fifth, quieter persona is the **reviewer**: the security or cloud owner who approves an apply. They
never run the CLI, but the plan summary is written for them.

## Success metrics and business KPIs
{: #success-metrics-and-business-kpis }

The guide is clear that baselines and targets come first, then reporting. These are the measures I'd
track, and where the data already exists:

| KPI | Source today |
|---|---|
| Consumer onboarding lead time | Not measured; needs a start and end event |
| % of modules with README, examples, tests and passing validation | `tools/validate_terraform_module.py` across 175 modules |
| Plan-to-apply cycle time, deployment success rate | GitHub Actions run history of consumer `terragrunt-cicd.yaml` |
| % of changes passing required policy and security gates | Gate results in the summary report |
| Mean time to diagnose failed plans, state locks and drift | Not measured |
| Open critical security findings, and their age | Wiz or Trivy output |
| Provider upgrade lead time, compatibility failure rate | `terragrunt-compatibilty.yaml` runs |
| Drift coverage and remediation age | Jira drift tickets (one per repository) |
| Cost estimate coverage | Infracost, currently disabled by default |

There are no recorded baselines yet, so these are my estimates, to be replaced by measured values after
the first quarter of tracking:

| KPI | Estimated baseline | Target |
|---|---|---|
| Consumer onboarding lead time | 3 to 5 working days | 1 working day |
| Deployment (apply) success rate | ~90% | 97% |
| Modules passing the validator with README and example | ~70% | 95% |
| Changes passing required gates on first plan | ~80% | 90% |
| Median drift ticket age | Not tracked | Under 10 working days |

## Scope, assumptions, constraints, and dependencies
{: #scope-assumptions-constraints-and-dependencies }

**In scope:** reusable Terraform modules and their Terragrunt units, the Python CLI, consumer bootstrap
and sync, shared workflow templates and releases, validation, policy, security, cost, import, reporting,
visualization, and the docs that explain all of it.

**Consumer-owned:** application code, workload requirements, production topology and sizing, DNS and
certificates, data classification for the workload, and the workload's SLOs.

**Shared:** identity and subscription access, state backends, provider versions, environment config,
gates, release compatibility, incident routing and the upgrade procedure.

Assumptions and constraints I'm working with:

- The repository is the **source of truth**. Shared code is never patched inside a consumer's synced
  copy; the bootstrap sync would overwrite it on the next run anyway.
- The directory name `terragrunt_shared_module` is load-bearing. `entrypoint.py`, `root.hcl` and every
  unit template find the module by that name with `find_in_parent_folders`.
- Python 3.12 or newer, Terraform 1.9.8 or newer (from the generated `required_version`), and a
  Terragrunt release that supports `terragrunt stack`.
- External dependencies: cloud APIs, GitHub, the state backends, and the gate tools (OPA, Trivy or Wiz,
  Infracost), plus Teams and Jira for notifications.

## Checklist
{: #checklist }

- [ ] Product owner and escalation path for Y-IaC are named in the operating agreement
- [ ] The top two goals for the next two quarters are agreed with the sponsor
- [ ] Baselines exist for onboarding lead time, deployment success rate and gate pass rate
- [ ] The four personas are mapped to the guides in `docs/getting-started/`
- [ ] Consumer-owned vs shared responsibilities are written down and linked from the README
- [ ] Supported Python, Terraform and Terragrunt version ranges are published
- [ ] Every consumer knows that shared code is changed in Y-IaC, never in its synced copy

{% include project-nav.html %}
