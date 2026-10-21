---
layout: post
title: "Y-IaC: Product Planning"
date: 2026-10-05 00:03:00 +0530
categories: [projects, y-iac]
tags: [Projects, Y-IaC, Planning, Roadmap]
description: "Y-IaC's roadmap as six milestones, an MVP cut from the risk order, a backlog split into six tracks, and change control for shared interfaces."
project: y-iac
project_step: 3
image:
  path: /assets/img/projects/y-iac/03-product-planning.webp
  alt: "Y-IaC: Product Planning - Projects hero image"
---

Y-IaC already works: there are 684 commits since April 2025, a v1.0.0 tag and 19 consumer backends configured.
So product planning here isn't about getting to a first release. It's about
deciding what "mature" means for a shared platform and sequencing the work so that state safety and
governance never wait behind a shiny feature.

<!-- more -->

{% include project-nav.html %}

## Product roadmap
{: #product-roadmap }

I run the backlog as six tracks. Each one has a different kind of owner and a different definition of
done:

| Track | Examples of work | Done means |
|---|---|---|
| Module coverage | New resource types, missing GCP and AWS modules (AWS has 5, GCP 4) | Module, unit template, README, import example, validator passes |
| CLI and tooling | Stack generation, import, visualization, error catalog | Tests, docs, no change to generated output unless intended |
| Workflow automation | Reusable workflows, drift, summaries, notifications | A consumer template update and release note |
| Security and compliance | OPA policies, Wiz and Trivy config, exception process | Policy tests, evidence documented |
| Documentation | Persona guides, module reference, troubleshooting | Linked from the getting-started index |
| Operational maturity | Lock recovery, dashboards, runbooks, DR | Runbook exercised at least once |

The roadmap is the order in which these tracks get attention, and that comes from the
[milestones](#release-milestones) below rather than from whoever asks loudest.

## MVP definition
{: #mvp-definition }

The guide's MVP is the line below which the platform isn't safe to hand to a new consumer:

- a documented onboarding path;
- a supported module catalog with consistent Terragrunt integration;
- the shared CLI for validation, environment setup and Terragrunt dispatch;
- PR plan and approval-based apply workflows;
- Terraform/Terragrunt validation and Python tests;
- required security and policy gates with an exception process;
- state backend conventions, import guidance and basic troubleshooting;
- ownership, release and support documentation.

Most of this exists in the repo today. The pieces I'd call unfinished are the **exception process** (the
override flags exist, the procedure around them isn't written) and **ownership and support
documentation** (the guide lists roles, not names). Those two are the MVP's remaining work, and they're
not code.

## Release milestones
{: #release-milestones }

| Milestone | Outcome | Where Y-IaC is |
|---|---|---|
| Foundation | Conventions, ownership, supported providers, local setup, baseline tests | Largely there; ownership not named |
| Consumer scale | Onboarding, config references, workflow templates, support paths stable | Template and config reference exist; 19 backends configured |
| Module maturity | Coverage, examples, validation, compatibility plans, upgrade guidance | Validator exists; coverage uneven across clouds |
| Governance maturity | Policy, security, cost, evidence, drift and exceptions are measurable | Gates exist; measurement and exceptions missing |
| Operational maturity | Reliability targets, dashboards, runbooks, DR drills, cost reporting | Not started as a programme |
| Continuous improvement | Roadmap driven by usage data, feedback and failures | Not started |

Estimated targets, assuming the DevOps team keeps its current capacity: **Governance maturity** within
two quarters of adopting this plan (measurement, exceptions and evidence export), and **Operational
maturity** within four (dashboards, SLOs, DR drills). The
[release calendar](/posts/projects/y-iac/12-cicd-and-release-management/#release-calendar) lines up with
these.

## Backlog structure
{: #backlog-structure }

Every backlog item, whatever the track, carries the same fields. The guide lists them and I'd make them
the issue template:

```markdown
### Provider / module
cloud/azure/terraform/azurerm_key_vault

### Consumer impact
Which consumers use this module? Will their plan change?

### Acceptance criteria
- ...

### Test evidence
Validator output, pytest names, scratch consumer plan

### Documentation impact
README, import example, getting-started guide

### Security impact
New permissions, new data exposure, policy changes

### Rollback plan
Pin consumers to the previous ref, or revert and re-sync
```

The "consumer impact" field is the one people skip, and it's the one that matters most on a shared
platform. A `grep` for the resource type across consumer `resources.yaml` files answers it in seconds.

## Prioritization approach
{: #prioritization-approach }

The ordering rule is the risk order from
[Requirements](/posts/projects/y-iac/02-requirements-gathering/#prioritization-and-release-scope): state
safety and security first, convenience last. Inside a level I'd break ties by **number of consumers
affected**, then by **effort**.

Two practical rules on top of that:

- **Bugs in shared paths beat features.** A bug in `root.hcl` or `stack_generator.py` hits every
  consumer; a bug in one module hits the consumers that use it.
- **Pending Verification is not done.** The CHANGELOG marks several recent changes (Jira drift tickets,
  Wiz scanning, k3d node taints) as "Pending Verification". I'd keep those at the top of the queue until
  someone has watched them work in a real consumer.

## Budget and resource planning
{: #budget-and-resource-planning }

The guide names the capacity this platform needs: module maintainers, Python maintainers, workflow
owners, security reviewers, cloud administrators and technical writers. It doesn't say how many of each
exist.

Costs to plan for, beyond people:

| Cost | Driver |
|---|---|
| GitHub Actions minutes | Plan matrix per changed stack, plan-after-apply, weekly drift scan per consumer |
| Self-hosted runners (if used) | `infra-aws` has tried both a self-hosted runner and `ubuntu-latest` |
| State storage | Azure Blob, S3 and GCS, small but with versioning |
| Wiz and Infracost licences | Only if those gates are enabled |

Y-IaC is built and run by the DevOps team; it covers all the roles above rather than having separate
module, Python and workflow teams. Wiz and Infracost should be budgeted with the security tooling, since
they serve the security and FinOps owners as much as the platform.

## Risk and dependency management
{: #risk-and-dependency-management }

The risks I'd put on the register first:

| Risk | Impact | Mitigation |
|---|---|---|
| A shared change breaks many consumers at once | High | Compatibility workflow, consumers pin `iac_shared_module_ref` |
| A provider bump forces resource replacement | High | `override_versions` per resource, plan review before the global bump |
| Stale lock released while a live apply holds it | High | Age guard (`LOCK_MIN_AGE_MINUTES`), opt-in `AUTO_RELEASE_LOCK` |
| Long-lived client secrets for CI | Medium | Move to OIDC federated credentials (see [Security](/posts/projects/y-iac/06-security-and-privacy/#secrets-and-key-management)) |
| Knowledge concentrated in few maintainers | Medium | Persona guides, ADRs, pairing on releases |
| External tools change behavior (Terragrunt `stack`, Wiz CLI) | Medium | Pin tool versions in `setup-environment` |

Dependencies: Terragrunt's stack feature, provider registries, GitHub Actions, the state backends, and
the gate tools.

## Change-control process
{: #change-control-process }

Changes to these need explicit impact analysis and release notes before merge:

- shared interfaces (module variables and outputs, YAML shapes);
- generated workflow behavior (`template/terragrunt-cicd.yaml`);
- backend handling and state operations;
- policy and gate defaults;
- provider versions in `config/providers.yaml`.

For each, the PR description says which consumers are affected, what their next plan will show, and how
to roll back. Emergency changes are allowed, but they get recorded afterwards with the reason, the
approver, the affected consumers and the follow-up work. I'd keep that record in the CHANGELOG under a
separate heading, so it can't be lost among normal entries.

## Checklist
{: #checklist }

- [ ] Six backlog tracks exist as labels or projects, each with an owner
- [ ] The issue template includes consumer impact and rollback plan
- [ ] Exception process for gate overrides is written (closes the MVP)
- [ ] Owners and support contacts are named (closes the MVP)
- [ ] "Pending Verification" CHANGELOG items are verified in a real consumer or reverted
- [ ] Risk register is reviewed monthly
- [ ] Target quarters exist for Governance and Operational maturity
- [ ] Change-control rules are linked from CONTRIBUTING or AGENTS.md

{% include project-nav.html %}
