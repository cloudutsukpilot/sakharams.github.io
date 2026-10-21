---
layout: post
title: "Y-IaC: Continuous Improvement"
date: 2026-10-05 00:18:00 +0530
categories: [projects, y-iac]
tags: [Projects, Y-IaC, Improvement]
description: "Improving Y-IaC from evidence: module usage analytics, consumer feedback, reliability and cost reviews, and how modules, providers and the platform retire."
project: y-iac
project_step: 18
image:
  path: /assets/img/projects/y-iac/18-continuous-improvement.webp
  alt: "Y-IaC: Continuous Improvement - Projects hero image"
---

Y-IaC will keep growing by default. Every consumer request adds a module, every incident adds a check,
every new provider adds a block to `root.hcl`. Continuous improvement is the discipline of also asking
which modules nobody uses, which checks nobody reads and which workflows cost more than they save, and
acting on the answers with data rather than opinion.

<!-- more -->

{% include project-nav.html %}

## Product analytics
{: #product-analytics }

The analytics that matter for a platform are about usage, and most of it can be derived from Git:

| Question | How to answer |
|---|---|
| Which modules are used, by how many consumers? | Scan consumer `resources.yaml` files for top-level resource types |
| Which Y-IaC ref is each consumer on? | `iac_shared_module_ref` in each consumer's `config.yaml` |
| Which CLI actions are used most? | Workflow inputs and banner logs |
| Where do runs fail? | Error catalog matches across runs |
| How long do consumers take to adopt a release? | Ref changes over time |

The module usage scan alone would change backlog conversations: of 175 modules, I'd expect a long tail
with no consumer at all, and those are maintenance cost with no return.

## User feedback
{: #user-feedback }

Feedback channels, from cheapest to richest:

- **Support questions**, tagged by area. Repeated questions are documentation or UX bugs.
- **A short survey** after onboarding (three questions: how long, where stuck, what's missing).
- **The monthly consumer forum** for roadmap input and breaking-change previews.
- **Usability sessions** twice a year, as described in
  [UX](/posts/projects/y-iac/04-user-experience-and-design/#usability-testing).

Close the loop visibly: when a change came from feedback, say so in the release notes.

## Retrospectives
{: #retrospectives }

Three kinds, at different cadences:

- **Iteration retros** every two weeks: what slowed us down, what broke, what to stop doing.
- **Release retros** after any release that needed a pin-back or a hotfix.
- **Incident reviews** after every Sev 1 or 2, blameless, with actions that become tests, validation
  rules or error catalog entries.

The output of a retro is a backlog item with an owner, or it didn't happen.

## Reliability reviews
{: #reliability-reviews }

Monthly, look at the platform SLIs from
[Operations](/posts/projects/y-iac/14-operations-and-observability/#availability-and-performance-targets)
and ask three questions: which failures were the platform's fault, which of those could a test have
caught, and which are getting worse. Plan-after-apply failures deserve special attention; each one is a
module that doesn't converge, and those erode trust in every plan.

## Cost optimization
{: #cost-optimization }

| Cost | Lever |
|---|---|
| CI minutes from drift scans | Weekly for production, less often for non-production; skip unchanged stacks where safe |
| Runner time for plans | Plugin cache, change detection, smaller stacks |
| Workload cloud spend | Infracost in advisory mode on every plan; `cost_controls.rego` for obvious waste |
| Commercial tools | Review Wiz and Infracost usage against value yearly |
| Maintainer time | Retire unused modules; automate dependency updates |

The biggest saving is probably maintainer time spent on modules nobody uses.

## Security reviews
{: #security-reviews }

Quarterly security review of the platform itself:

- progress on the high-priority items from [Security](/posts/projects/y-iac/06-security-and-privacy/#threat-modeling)
  (secrets in generated `provider.tf`, OIDC, guardrail default);
- open findings and exceptions, with ages;
- a fresh threat-model pass on anything added since the last review (new providers, new integrations);
- results of the negative-path gate tests.

Annually, an external or cross-team review of `root.hcl`, the auth code in `environment/` and the
reusable workflows, since those run with the most privilege.

## Architecture reviews
{: #architecture-reviews }

Twice a year, revisit the big decisions with fresh evidence:

- Is Terragrunt `stack` still the right orchestration, given how its CLI has moved?
- Should the unit templates consume `values` (and drop the direct YAML read), or should the generator
  stop writing them?
- Is the copy-and-sync bootstrap still needed, or could consumers run the CLI as an installed package
  pinned by version?
- Terraform or OpenTofu?

Each answer becomes an ADR, even when the answer is "no change".

## Roadmap refinement
{: #roadmap-refinement }

Every quarter, re-rank the [roadmap](/posts/projects/y-iac/03-product-planning/#product-roadmap) using what
the analytics, feedback, incidents, drift, cost and security reviews showed. The risk order from
[Requirements](/posts/projects/y-iac/02-requirements-gathering/#prioritization-and-release-scope) stays the
tie-breaker: state safety and security first, convenience last. Publish the result to the consumer forum
so consumers know what's coming and what isn't.

## Decommissioning and end-of-life planning
{: #decommissioning-and-end-of-life-planning }

Retirement happens at four levels, each with its own procedure:

| What retires | Procedure |
|---|---|
| A module | Confirm no consumer uses it; deprecate with CLI warnings for two releases; remove in a major |
| A provider version | Announce, move consumers off `override_versions` that pin it, remove the fallback |
| A consumer | `destroy` every stack (or transfer ownership), confirm empty state, archive the repo, remove its backend entry and subscription mapping, revoke its credentials |
| Y-IaC itself | Migration path to the replacement, state handed over unchanged, final support date announced |

For a consumer, the order is the part people get wrong: destroy or transfer first, delete the folder last.
Deleting the folder first leaves running, unmanaged resources and orphaned state.

## Checklist
{: #checklist }

- [ ] Module usage scan runs monthly across consumers
- [ ] Unused modules are listed and scheduled for deprecation
- [ ] Onboarding survey and consumer forum are in place
- [ ] Monthly reliability review uses real SLI data
- [ ] Infracost advisory mode gives cost data on every plan
- [ ] Twice-yearly architecture review produces ADRs
- [ ] Consumer decommissioning procedure is documented
- [ ] Roadmap is re-ranked quarterly and shared with consumers

{% include project-nav.html %}
