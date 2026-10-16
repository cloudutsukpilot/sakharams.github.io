---
layout: post
title: "Y-IaC: Requirements Gathering"
date: 2026-10-05 00:02:00 +0530
categories: [projects, y-iac]
tags: [Projects, Y-IaC, Requirements]
description: "Y-IaC requirements as platform contracts: the YAML-to-plan path, non-destructive changes, gates, state safety and acceptance criteria for each persona."
project: y-iac
project_step: 2
image:
  path: /assets/img/projects/y-iac/02-requirements-gathering.webp
  alt: "Y-IaC: Requirements Gathering - Projects hero image"
---

A requirement for Y-IaC has a twist: it isn't for one deployment, it's a contract that a few dozen
repositories will lean on at once. "The azurerm provider is pinned" sounds like a detail until a bump
replaces a resource group in a consumer nobody on the platform team has heard of. So I write Y-IaC
requirements as reusable contracts and keep each consumer's incidental config out of them.

<!-- more -->

{% include project-nav.html %}

## Functional requirements
{: #functional-requirements }

What the platform must do, per provider and module where it applies:

| # | Requirement | Where it lives today |
|---|---|---|
| F1 | Declare resources in YAML and generate Terragrunt from it | `generators/stack_generator.py` writes `terragrunt.stack.hcl` |
| F2 | Run init, plan, apply, destroy, import, state, taint, stack and DAG commands | `handlers/terragrunt/` |
| F3 | Validate modules: fmt, init, provider schema, validate, TFLint, README, HCL format | `tools/validate_terraform_module.py` |
| F4 | Conditional dependencies: a module works with or without a dependency's output | Terragrunt `mock_outputs` in unit templates |
| F5 | Provider version selection, with per-resource overrides | `config/providers.yaml` + `override_versions` in `common_vars.yaml` |
| F6 | Validate repo, subscription, environment and provider before running | `cli/arg_validation.py`, `validation/repository.py` |
| F7 | Security, policy and cost gates with configurable enforcement | `validation/opa.py`, `trivy.py`, `wiz.py`, `infracost.py` |
| F8 | Plan summaries, error reports, notifications, drift detection, ticketing | `reporting/`, drift and Jira workflows |
| F9 | Safe state-lock recovery with age and retry limits | `handlers/statelock/` |
| F10 | Ansible playbooks and resource inventory visualization | `handlers/ansible.py`, `--python visualize` |

Two of these deserve a sentence each. F4 matters because a stack's first plan runs before its
dependencies exist; without mocks, a brand-new stack can never plan. F9 matters because a lock left by a
killed CI job blocks every later run on that state file, and releasing the wrong lock corrupts state.

## Non-functional requirements
{: #non-functional-requirements }

- **Reproducible and reviewable.** The same YAML at the same Y-IaC ref produces the same generated files
  and the same plan.
- **Backward-compatible module inputs** wherever practical. A renamed variable is a breaking change for
  every consumer that sets it.
- **Clear failures.** Every error says what failed, where and what to do next. `config/error_message_and_solutions.yaml`
  is the start of a failure catalog for exactly this.
- **Deterministic validation** that doesn't modify the module it's validating.
- **No secrets in committed config.** Credentials only arrive as environment variables.
- **Reasonable performance** for the stack sizes we support.
- **Testable without production.** Module and CLI behavior can be tested without live credentials.
- **Versioned, searchable docs.** The generated module reference is published to GitHub Pages.

The target I'd set (an estimate, not yet measured): **under 10 minutes for a 30-unit stack on a
GitHub-hosted runner**, and under 3 minutes for a single-unit change. That makes "reasonable
performance" testable in
[Performance and load testing](/posts/projects/y-iac/10-quality-assurance/#performance-and-load-testing).

## User journeys and use cases
{: #user-journeys-and-use-cases }

The five representative use cases from the guide, each as a journey I'd want to demo end to end:

1. **Add a resource.** A consumer adds an `aws_vpc` entry to `environments/aws/dev/hello-world/resources.yaml`,
   runs `python entrypoint.py --cloud aws --environment dev --stack hello-world --terragrunt plan`,
   reviews the plan and opens a PR. CI plans again; after merge and approval, it applies.
2. **Add a module.** A contributor creates `cloud/azure/terraform/<type>/` and the matching
   `cloud/azure/terragrunt/<type>/terragrunt.hcl`, documents inputs and the import path, runs the module
   validator and the relevant tests.
3. **Import an existing resource.** An operator imports it, the provider path is normalized (for
   example `microsoft.insights` to `Microsoft.Insights` via `import_id_normalization`), and the next plan
   shows no changes.
4. **Change shared behavior.** A maintainer changes Python or a workflow, runs the tests, then checks
   the compatibility workflow against representative consumers.
5. **Review a blocked plan.** A security owner sees an OPA or Wiz failure in the summary, reads the
   evidence, and either rejects the change or grants a time-boxed exception.

## Acceptance criteria
{: #acceptance-criteria }

Written so a reviewer can tick them off, using use case 1 as the example:

```gherkin
Given infra-aws has an aws_vpc entry in hello-world/resources.yaml
When I run entrypoint.py with --terragrunt plan for aws/dev/hello-world
Then terragrunt.stack.hcl contains one unit "aws_vpc"
And .terragrunt-stack/aws_vpc/ contains a generated provider.tf pinning aws to the providers.yaml version
And the plan shows 1 to add, 0 to change, 0 to destroy
And the OPA and scanner gates report a result in the summary
And a second plan after apply shows no changes
```

General criteria for any platform change: plans succeed for the affected consumers, validation output is
as expected, existing resources are not replaced or destroyed unless the change says so, failure
behavior is documented, audit evidence (plan, gate results, approval) exists, and changes that touch
state or deployments have a rollback or recovery procedure.

## Business rules
{: #business-rules }

The rules the platform enforces or must make easy to enforce:

- **Subscription allow-lists.** A repo may only target subscriptions mapped to it
  (`validation/repository.py` checks the repo-subscription mapping).
- **Backend per repo.** Every consumer has exactly one backend entry, matched on the repo folder name, in
  its own `config.yaml` or the shared one. No entry, no run: `root.hcl` fails with an explicit message.
- **Required tags.** `common_tags` in `common_vars.yaml` are merged into every resource, and stack-level
  tags merge key by key so they never drop an environment tag. OPA has a tag compliance policy.
- **Provider version constraints** come from `config/providers.yaml`, with per-resource overrides only
  through `override_versions`.
- **Approval before apply.** Apply jobs wait on GitHub environment protection rules.
- **Ownership metadata.** Repos carry custom properties (cloud, cost centre, portfolio, tech stack), as
  `infra-github` shows for its own repositories.

## Reporting and analytics requirements
{: #reporting-and-analytics-requirements }

Reports exist for three audiences:

| Audience | Report | Produced by |
|---|---|---|
| Reviewer on a PR | Per-unit add/change/destroy table, gate outcomes, links to plan artifacts | `reporting/plan_summary.py`, `terragrunt-summary-report.yaml` |
| Operator after a failure | Error report with matched catalog entry and suggested fix | `reporting/error_report.py`, `error_catalog.py` |
| Platform owner | Drift findings, gate trends, validation status, release info | Drift workflows, Jira tickets; trends not yet aggregated |

The gap is the third row. Individual runs report well; nothing yet rolls them up across consumers. I'd
add that before promising any of the KPIs in
[Vision](/posts/projects/y-iac/01-vision-and-business-context/#success-metrics-and-business-kpis).

## Accessibility and localization requirements
{: #accessibility-and-localization-requirements }

Y-IaC's interface is a CLI, YAML, Markdown and workflow summaries, so accessibility is about readable
output rather than screen-reader support for a UI. In practice: clear headings and tables in docs,
descriptive link text, diagrams with text alternatives, and CLI and summary output that never carries
meaning by colour or emoji alone (every ✅ or ❌ sits next to a word like "passed" or "failed").

Localization is not a platform requirement; everything is in English. A consumer whose workload needs
localized content handles that in the workload.

## Regulatory, legal, and compliance requirements
{: #regulatory-legal-and-compliance-requirements }

The platform doesn't hold workload data, but it does produce artifacts that reveal infrastructure:
state files, plan JSON and logs contain resource names, addresses, tags and provider attributes. So:

- Regulatory controls are mapped **per subscription, resource type, workload and data classification**,
  not once for the platform.
- Plan JSON is redacted before scanning (sensitive provider config removed), and that redaction is a
  requirement, not a nice-to-have.
- Audit evidence (PR, plan, gate results, approval, apply log) must be retained for whatever period the
  strictest consumer needs.

The baseline I'd plan for: treat the strictest consumers as falling under **HIPAA** (the module catalog includes
FHIR and healthcare workspace modules) and **SOC 2**, with **ISO 27001**-style controls for access and change
management. That sets evidence retention at **six years** for plan summaries, approvals and apply records
(the HIPAA documentation period), exported to long-term storage, while raw plan files stay short-lived.

## Prioritization and release scope
{: #prioritization-and-release-scope }

The guide sets a risk-based order, and I'd hold every backlog conversation to it:

1. State safety, identity, security and policy enforcement.
2. Correct module contracts and non-destructive plans.
3. Consumer onboarding and CI/CD reliability.
4. Observability, reporting, drift, cost and support efficiency.
5. Convenience features and visualization.

This order means a nice visualization improvement waits behind a lock-recovery bug, every time. It also
means Infracost (currently disabled by default) only becomes a priority once the first two levels are
solid. The [MVP](/posts/projects/y-iac/03-product-planning/#mvp-definition) is cut from levels 1 to 3.

## Checklist
{: #checklist }

- [ ] Functional requirements F1 to F10 each have an owner and a test reference
- [ ] A plan-time target exists for the largest supported stack
- [ ] Each of the five use cases has a scripted demo in a scratch consumer
- [ ] Gherkin-style acceptance criteria exist for "add a resource" and "import a resource"
- [ ] Repo-subscription mappings are complete for every consumer
- [ ] Cross-consumer reporting requirements are agreed with the platform owner
- [ ] Applicable regulatory frameworks and evidence retention periods are recorded
- [ ] The risk-based priority order is written into the backlog guidelines

{% include project-nav.html %}
