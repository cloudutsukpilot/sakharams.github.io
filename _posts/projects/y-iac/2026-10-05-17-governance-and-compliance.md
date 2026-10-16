---
layout: post
title: "Y-IaC: Governance and Compliance"
date: 2026-10-05 00:17:00 +0530
categories: [projects, y-iac]
tags: [Projects, Y-IaC, Governance, Compliance]
description: "Governing Y-IaC: who approves modules, gates and breaking changes, the evidence trail every apply leaves, access reviews, licences and policy as code."
project: y-iac
project_step: 17
image:
  path: /assets/img/projects/y-iac/17-governance-and-compliance.webp
  alt: "Y-IaC: Governance and Compliance - Projects hero image"
---

A shared IaC platform is a governance tool whether you plan it that way or not. Every policy in its OPA
bundle, every gate default and every provider pin is a rule applied to dozens of repositories at once.
That's powerful, and it's why the rules about *changing* the rules matter as much as the rules
themselves. This post is about who decides, and what evidence proves the decisions were followed.

<!-- more -->

{% include project-nav.html %}

## Project governance
{: #project-governance }

A light structure fits a platform team:

| Forum | Cadence | Decides |
|---|---|---|
| Platform weekly | Weekly | Backlog order, releases, incidents |
| Change review | Per PR | Shared-path and contract changes, through CODEOWNERS |
| Consumer forum | Monthly | Roadmap feedback, upcoming breaking changes, deprecations |
| Governance review | Quarterly | Gate defaults, exceptions, access reviews, KPIs |

The quarterly review is where this playbook's open TODOs get closed. Most of them are governance
decisions, not engineering ones.

## Decision-making and approval authorities
{: #decision-making-and-approval-authorities }

From the guide, the decisions that need a named approver:

| Decision | Proposed approver |
|---|---|
| New provider, module, resource type or public interface | Platform owner + one maintainer |
| State handling, authentication, policy defaults, security gates | Platform owner + security |
| Production workflow permissions | Platform owner + cloud owner |
| Gate exceptions | Security (time-boxed) |
| Emergency changes | Any maintainer, reviewed after the fact |
| Provider upgrades, deprecations, breaking releases, end-of-life | Platform owner after the consumer forum |

Today the DevOps team holds both the platform owner and day-to-day approver roles. For security-sensitive
decisions (gate defaults, exceptions), I'd still add a second approver from security, so the team never
approves its own exceptions.

## Audit requirements
{: #audit-requirements }

The questions an auditor will ask about a production change, and where the answer is:

| Question | Evidence |
|---|---|
| Who requested it and why? | PR description, linked Jira ticket (GitHub to Jira webhook) |
| Who reviewed it? | PR approvals, CODEOWNERS |
| What exactly changed? | Plan summary and plan artifacts |
| Was it checked against policy? | OPA, scanner and cost gate results in the summary |
| Who approved the deployment? | GitHub environment approval record |
| Did it do what the plan said? | Apply log, plan-after-apply |
| Is it still as approved? | Drift scan results and tickets |

The weak link is retention: plan artifacts expire after seven days. Summaries and approvals live longer
in GitHub, but evidence for an annual audit needs an explicit export.

## Access reviews
{: #access-reviews }

What to review, quarterly:

- **Y-IaC repo:** write and admin access, CODEOWNERS membership, branch protection settings.
- **Consumer repos:** who can merge and who can approve production environments.
- **CI identities:** service principal role assignments per subscription; federated credential subjects
  once OIDC is in place.
- **State storage:** who can read and write each container or bucket.
- **Shared secrets:** organization-level secrets and which repos can use them.

For cloudutsukpilot, `infra-github` already declares collaborators, teams and environments as code, so
an access review there is a diff review. That's the model to copy.

## License management
{: #license-management }

| Component | Licence consideration |
|---|---|
| Terraform | Business Source License since 1.6; internal use is fine, offering it as a service is restricted |
| Terragrunt, TFLint, OPA, Trivy | Open source (MIT, MPL, Apache 2.0) |
| Wiz CLI | Commercial, needs a Wiz subscription |
| Infracost | Open-source CLI; paid cloud features |
| Providers | Mostly MPL 2.0; check third-party providers individually |
| Python packages | Check with a licence scanner in CI |

If the BSL ever becomes a problem, OpenTofu is a drop-in for this codebase's usage; it would be a
compatibility-tested release like any other.

## Compliance reporting
{: #compliance-reporting }

The report I'd produce quarterly, per consumer:

- percentage of applies with a passing mandatory gate (or a valid exception);
- open exceptions, with expiry dates;
- drift tickets opened, closed and their median age;
- consumers not on a supported Y-IaC release;
- access review completion.

All of it can be computed from GitHub run data, Jira and the gate outputs. Nothing needs a manual
spreadsheet once the [dashboard](/posts/projects/y-iac/14-operations-and-observability/#metrics-and-dashboards)
exists.

## Data governance
{: #data-governance }

The platform's data governance is mostly about state and evidence: who can read state (it can hold
secrets), how long plans and logs are kept, and where they're stored. The rules are in
[Data and Integration](/posts/projects/y-iac/07-data-and-integration/#data-ownership-and-classification).
For workload data, the platform's contribution is policy: `region_restrictions.rego` for residency, the
storage policies for exposure, and required tags so every resource has an owner and a cost centre.

## Vendor and third-party management
{: #vendor-and-third-party-management }

Third parties the platform depends on: GitHub (hosting, Actions), HashiCorp and the provider authors,
Gruntwork (Terragrunt), Wiz, Infracost, Microsoft (Teams), Atlassian (Jira), and every third-party
GitHub Action. For each: is it approved, who owns the relationship, what happens if it disappears or
changes terms. For GitHub Actions specifically, pin third-party actions to commit SHAs and keep an
allowed-actions list at the organization level.

## Policy enforcement
{: #policy-enforcement }

Policy is code, versioned in `config/opa/` with ten Rego files in three packages:

| Package | Policies |
|---|---|
| `azure` | Allowed VM SKUs, network security, region restrictions, storage encryption and exposure, tag compliance |
| `global` | Cost controls, naming conventions, required tags, resource file placement |
| `zscaler` | Domain allowlist |

Each gate has three enforcement levels (advisory, soft-mandatory, mandatory), resolved through the
global, cloud, environment and repository layers in `config/inheritance.py`. Override and skip flags
exist per gate. The governance rules I'd attach:

- Changing a policy or a default enforcement level is a governed change with security sign-off.
- Every policy has tests (`tests/test_opa.py`) with a passing and a failing fixture.
- An override in a production run requires a linked exception with scope, owner, justification,
  compensating control, expiry and remediation plan.
- Exceptions are listed in one register and reviewed quarterly.

## Evidence collection
{: #evidence-collection }

Evidence should be collected by the pipeline, not assembled before an audit. Per production apply, a
small JSON record exported to a write-once store would do:

```json
{
  "consumer": "infra-aws",
  "stack": "aws/dev/hello-world",
  "y_iac_ref": "v1.4.0",
  "commit": "abc1234",
  "pr": 42,
  "plan_summary": {"add": 1, "change": 0, "destroy": 0},
  "gates": {"opa": "pass", "wiz": "pass", "infracost": "skipped"},
  "approver": "github-user",
  "apply_run": "https://github.com/.../actions/runs/...",
  "plan_after_apply_clean": true
}
```

That record answers every row of the audit table above without anyone opening a workflow log.

## Checklist
{: #checklist }

- [ ] Platform owner and security approver are named
- [ ] Approval authorities table is in the operating agreement
- [ ] Quarterly access review is scheduled, with `infra-github` as the model
- [ ] Licence scanning runs on Python dependencies
- [ ] Third-party actions are SHA-pinned and on an allow list
- [ ] Policy and enforcement-level changes require security sign-off
- [ ] Exception register exists with expiry dates
- [ ] Per-apply evidence record is exported to long-term storage

{% include project-nav.html %}
