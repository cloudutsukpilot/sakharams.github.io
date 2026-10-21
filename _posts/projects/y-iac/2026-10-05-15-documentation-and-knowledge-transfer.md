---
layout: post
title: "Y-IaC: Documentation and Knowledge Transfer"
date: 2026-10-05 00:15:00 +0530
categories: [projects, y-iac]
tags: [Projects, Y-IaC, Documentation]
description: "Y-IaC's documentation map: persona guides, a generated module reference, feature and troubleshooting docs, and what's still missing for a new maintainer."
project: y-iac
project_step: 15
image:
  path: /assets/img/projects/y-iac/15-documentation-and-knowledge-transfer.webp
  alt: "Y-IaC: Documentation and Knowledge Transfer - Projects hero image"
---

Y-IaC is already better documented than most internal platforms: there are twelve numbered
getting-started guides, a generated module reference site and a function-by-function trace of one CLI
command. The risk isn't missing docs. It's docs that drift from the code, because on a shared platform a
wrong guide is copied into every consumer's habits. So this post is mostly about keeping what exists
true, and filling a few specific gaps.

<!-- more -->

{% include project-nav.html %}

## Product documentation
{: #product-documentation }

The layers, from the top:

| Layer | Document | Status |
|---|---|---|
| What and why | Readiness and delivery guide; this playbook | Exists |
| Repo overview | `README.md` with module tables by category | Exists; links to the docs site |
| Persona entry point | `docs/getting-started/README.md` | Exists |
| Feature docs | `docs/features/` (state-lock release, duplicate detection, module validation, credential resolution, visualization) | Exists |
| Release history | `CHANGELOG.md` | Exists; one "Unreleased" section |
| Service catalog entry | `catalog-info.yaml` (Backstage) | Exists, but still has sample annotations from a template (`artist-website` slug) |

The catalog entry is a quick fix with a real payoff: in Backstage, it's how people find the platform's
owner, docs and repo.

## User guides
{: #user-guides }

Users are consumer engineers, and their guides are the numbered series:

- **01** Onboard a consumer repo: template, layout, prerequisites, a worked `azurerm_resource_group`,
  local plan, branch to PR to gated apply, imports.
- **09** Consumer repo config reference: every key in `config.yaml` and `common_vars.yaml`.
- **04a to 04j** One page per reusable workflow.

The one I'd add is a **"cookbook"** of short YAML recipes: a resource group with tags, a Key Vault with a
private endpoint, a GitHub repository with environments, an S3 bucket. People copy examples far more
than they read references.

## API documentation
{: #api-documentation }

The "APIs" are module interfaces and YAML shapes. Each module README documents inputs, outputs, a YAML
example and the import command, and the module validator fails a module without the required sections.
`docs/site/build_docs.py` turns the READMEs into a searchable MkDocs site published to GitHub Pages by
`docs-pages.yaml`.

Two improvements: generate the inputs table from `variables.tf` (so it can't drift from the code), and
publish the Python package's docstrings as a reference for maintainers.

## Architecture documentation
{: #architecture-documentation }

- **This playbook's** [Technical Architecture](/posts/projects/y-iac/05-technical-architecture/#system-context-and-component-architecture)
  post, with the animated system context and the two-part run walkthrough.
- **`12-cli-init-reconfigure-flow.md`**, a top-down Mermaid trace of every function one command calls,
  plus a sequence diagram. It's the most precise architecture document in the repo.
- **`entrypoint.md`**, the step-by-step execution outline.
- **ADRs**, which don't exist yet; the list to write is in
  [Architectural decision records](/posts/projects/y-iac/05-technical-architecture/#architectural-decision-records).

There's also an older `flow_digram.mmd` at the repo root that describes the pre-package flow; it should
be removed or replaced by a link to guide 12, so nobody learns the old flow.

## Deployment instructions
{: #deployment-instructions }

Y-IaC isn't deployed, so its "deployment instructions" are two documents:

1. **How a consumer adopts a release**: change `iac_shared_module_ref`, run a plan, read the release
   notes. Short, and it belongs in guide 01.
2. **How a maintainer releases**: tag, CHANGELOG section, compatibility run, announcement. This doesn't
   exist yet and should, before the release process in
   [CI/CD](/posts/projects/y-iac/12-cicd-and-release-management/#versioning-and-release-notes) is adopted.

## Operations runbooks
{: #operations-runbooks }

The operator runbooks are listed in
[Operations](/posts/projects/y-iac/14-operations-and-observability/#operational-runbooks). The documentation
rule for them: each runbook starts with the symptom as the operator sees it (the error text), then the
diagnosis, then the fix, then how to confirm. A runbook that starts with background gets skipped in the
middle of an incident.

## Troubleshooting guides
{: #troubleshooting-guides }

Troubleshooting knowledge lives in four places today:

- `docs/troubleshooting/terragrunt.md`;
- `config/error_message_and_solutions.yaml`, the machine-readable error catalog the CLI matches against;
- `.github/skills/diagnose-terragrunt-failure/` and the troubleshoot prompt, for assisted diagnosis;
- this blog's [Terragrunt errors](/posts/devops/iac/terragrunt/terragrunt-errors/) post, for general
  Terragrunt failures.

The error catalog should be the source, and the Markdown guide generated from it, so a fix added for the
CLI is also documented for people.

## Support procedures
{: #support-procedures }

What a consumer should do when something breaks, in order:

1. Read the error report the CLI printed; it may already name the fix.
2. Check the troubleshooting guide and the CHANGELOG for a recent change.
3. Pin the previous Y-IaC ref and re-run, if the failure started after a release.
4. Ask in the platform channel with the run link, the command and the consumer repo.
5. For a security finding or blocked gate, request an exception through the governance process.

Help comes from the DevOps team. I'd recommend a single intake: issues on the Y-IaC repo for bugs and
requests, and the DevOps team's existing channel for quick questions, so nothing is lost in direct
messages.

## Onboarding documentation
{: #onboarding-documentation }

Two onboarding paths, and only one is complete:

- **New consumer:** guide 01, then 09. Complete.
- **New maintainer:** guides 05, 06 and 12 explain the Python package, but there's no "your first week"
  path. I'd add one: set up the sibling checkouts, run the tests, trace one command with guide 12 in a
  debugger, add a trivial module with guide 07, and shadow one release.

The usability sessions in [UX](/posts/projects/y-iac/04-user-experience-and-design/#usability-testing)
are the test for both paths.

## Training materials
{: #training-materials }

There's a platform presentation deck in `docs/` (around 1,100 lines of Markdown slides) that covers the
platform end to end. Paired with the animated diagrams in this playbook, it's a solid one-hour
introduction. What I'd add:

- a 30-minute hands-on lab: onboard a scratch consumer and plan one resource;
- a 30-minute lab for contributors: add a module and pass the validator;
- a recorded walkthrough of a failed plan diagnosed with the error report.

## Checklist
{: #checklist }

- [ ] `catalog-info.yaml` sample annotations are replaced with real owner, slug and links
- [ ] A YAML cookbook of common recipes is added
- [ ] Module input tables are generated from `variables.tf`
- [ ] `flow_digram.mmd` is removed or replaced by a link to guide 12
- [ ] A maintainer release guide exists
- [ ] The error catalog generates the troubleshooting page
- [ ] A "first week" path exists for new maintainers
- [ ] Hands-on labs exist for consumers and contributors

{% include project-nav.html %}
