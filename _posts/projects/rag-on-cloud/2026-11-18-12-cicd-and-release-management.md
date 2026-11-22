---
layout: post
title: "RAG on Cloud: CI/CD and Release Management"
date: 2026-11-18 00:12:00 +0530
categories: [projects, rag-on-cloud]
tags: [Projects, RAG on Cloud, CICD, Release]
description: "Two pipelines for one lab: the platform's Terraform plan-and-apply with Trivy and OPA gates for Azure, and the lab repo's own build, eval and deploy."
project: rag-on-cloud
project_step: 12
image:
  path: /assets/img/projects/rag-on-cloud/12-cicd-and-release-management.webp
  alt: "RAG on Cloud: CI/CD and Release Management - Projects hero image"
---

RAG on Cloud ships two kinds of change, and they travel different roads. Infrastructure goes through the
platform's Terraform pipeline in the infra repo, where a pull request plans and a merge applies. Code, prompts and the
search index go through the lab repo's own pipeline, which doesn't exist yet. The first road is live and has already
taught a lesson: a green plan isn't a successful apply when the tenant has policies the plan can't see.

<!-- more -->

{% include project-nav.html %}

## Build automation
{: #build-automation }

For infrastructure there's nothing to build: the "artifact" is the plan. Each pull request that touches
`environments/**` in the infra repo runs the platform's reusable workflows, pinned to the shared module's `main`:

1. **Detect changes**: only stacks whose files changed are planned, so a PR for this lab doesn't plan the
   platform's subscriptions.
2. **Generate and plan**: the shared module turns the stack's `resources.yaml` into one Terragrunt unit per resource
   type and plans every unit.
3. **Gates**: Trivy, OPA and Infracost run on the plan (more in
   [static analysis](#static-analysis-and-security-scanning)).
4. **Summary**: every unit's plan and every gate's result land in one report on the run.

{% include flow-anim.html id="projects/rag-on-cloud/iac-pipeline" %}

The lab repo's build comes with Phase 0 step 5 and Phase 1 step 5: `ruff` and `pytest` on every PR, then a container
image built in GitHub Actions on merge.

## Automated test execution
{: #automated-test-execution }

Three layers, each where it's cheapest to catch the problem:

| Layer | What runs | When |
|---|---|---|
| Shared module | `terraform test` with a mock provider for each module (the new budget module has five), the module validator, and a compatibility plan against a real consumer stack | On every shared-module PR |
| Stack | A real plan of `development/rag-on-cloud`, locally before the PR and in CI on it | On every infra PR |
| Lab code | `pytest` against a fake cloud adapter (no Azure needed), then the golden-set eval for changes to prompts, chunking or the index | Phase 0 step 5; eval in CI is Phase 3 step 2 |

The eval is the test that matters most for a RAG system, because a prompt change can pass every unit test and still
answer worse. Phase 3 step 2 makes it fail a PR on a regression beyond a threshold.

## Static analysis and security scanning
{: #static-analysis-and-security-scanning }

Every plan, local or CI, goes through the same gates:

| Gate | Checks | Enforcement here |
|---|---|---|
| Trivy | Terraform misconfigurations | Soft-mandatory: blocks unless overridden. Three findings on the storage account are accepted for the whole GitHub organisation, each with a reason ([Security and Privacy](/posts/projects/rag-on-cloud/06-security-and-privacy/#vulnerability-and-dependency-management)) |
| OPA | Tags, regions, VM SKUs, storage settings, and model deployment SKUs in this lab's tenant | Soft-mandatory, except the deployment-SKU rule, which is mandatory: Azure would deny it anyway, so an override can't help |
| Infracost | A cost estimate per plan | Advisory |

Infracost does run for this stack: its first plans printed "no summary found" and then nothing,
but the plan for the chat model and budget (2026-11-23) estimated **$0.00 a month**. That's correct rather than
broken. A budget is free, and a pay-per-token deployment has no fixed price, so without a usage file there's nothing
to add up. The resource that does cost money while idle, the Basic Search service, is already in the stack, so its
estimate appears only when a PR adds it back after a session. The gate is useful here for exactly that:
it flags a change that adds a fixed monthly cost.

The OPA rule for deployment SKUs is the lab's contribution to the gates. The first apply was green at plan time
and then failed on a tenant policy; now the same mistake fails the plan
([lesson L002](/posts/projects/rag-on-cloud/lessons-learned/#lesson-l002)).

For the lab code: `ruff`, Dependabot, and a scan of the container image before it's pushed.

## Artifact and container management
{: #artifact-and-container-management }

| Artifact | Where it lives | Kept for |
|---|---|---|
| Terraform plans | GitHub Actions artifacts of the infra repo's runs | 7 days; the apply on `main` plans again rather than reusing the PR's plan |
| Terraform state | The platform's state storage account in Azure, one state file per unit | Until the unit is destroyed |
| API container image | Container registry (Basic) in the lab's resource group, from Phase 1 step 5 | Tagged by Git SHA; pulled by Container Apps with its managed identity |
| Index definitions | JSON in the lab repo | Git history |
| Eval results | Dated files in the lab repo's `results/` | Git history; these are what get published |

No registry admin user and no pull secret: the app's identity gets `AcrPull`, GitHub Actions gets `AcrPush` through a
federated credential.

## Deployment automation
{: #deployment-automation }

Infrastructure deploys on merge, with no hand-run step. After a squash merge to `main`, the workflow
plans the changed stack again (because `main` may have moved since the PR's plan), checks whether there's anything to
do, and applies unit by unit in dependency order. A daily scheduled run plans every stack again to catch drift.
A manual dispatch can plan or apply one stack. The infra repo's dispatch list includes the sandbox subscription since
this lab arrived.

The two applies so far:

| Date | Change | Result |
|---|---|---|
| 2026-11-22 | The stack, 16 resources | 14 created; the embedding deployment (tenant policy) and one role (renamed) failed |
| 2026-11-22 | `Standard` SKU, Foundry User role | The 2 missing resources created, nothing else changed |

Index objects deploy separately with `make index`, because they're data-plane objects the Terraform provider doesn't
manage. The API deploys as a new Container Apps revision from Phase 1 step 5.

## Database deployment strategy
{: #database-deployment-strategy }

There's no database. The nearest thing is the search index, and its schema changes the way a database
migration should: never in place. A change to fields, the analyzer, chunking or the vectorizer goes into a new index
version (`blog-chunks-v2`) built beside the current one, the eval runs against both, and the API switches by config.
The old version is deleted once the new one wins. Because the index is rebuilt from the `posts` container anyway every
time Search comes back (ADR 0008), there's no data to migrate, only an indexer run to wait for.

## Approval gates
{: #approval-gates }

The only human gate is the pull request review. The apply job in the infra repo's workflow is named for an
approval, but the `development` environment has no required reviewers, so a merge applies straight away. For a lab
that's the right call: the review of the plan summary is the approval, and a second click adds nothing.

The automated gates are stricter than the human one: a mandatory OPA rule can't be overridden at all, and a Trivy or
OPA failure needs an explicit override flag on a local run.

**No required reviewer** (decided 2026-11-23). The PR review of the plan is the approval; the mandatory OPA rule
stops the deployment SKUs the tenant denies, and the budget watches spend. A second click after the merge would only
slow down the Search remove-and-restore PRs every session depends on. I'd add one if a second person starts merging
to this stack, or if the tenant's owners ask for it.

## Versioning and release notes
{: #versioning-and-release-notes }

| What | Version | Release notes |
|---|---|---|
| Infrastructure | The infra repo's commit on `main`; one squash commit per PR | The PR description: why, what changed, how it was checked |
| Shared module | Consumers use its `main`, not a pinned tag | Its CHANGELOG |
| API | Image tag = Git SHA; Container Apps revision | Lab repo PRs |
| Index | `blog-chunks-v<N>` | An ADR when a version changes a decision |
| Results | Dated results files | The playbook's comparison sections |

Using the shared module's `main` means a module change reaches this stack on its next plan without a PR here. That's
been convenient (the alias and Trivy fixes arrived that way) and it's a risk: a breaking module change shows up as a
failed plan in a lab I'm not looking at. The compatibility plan in the shared module's CI is the guard; this stack
joins it with the budget module.

## Rollback and roll-forward procedures
{: #rollback-and-roll-forward-procedures }

Infrastructure rolls forward. Undoing a change is a revert PR that goes through the same plan and gates;
there's no "apply the previous state" button, and I don't want one. The two failures so far were both fixed forward
in one PR each.

| Problem | Response |
|---|---|
| A bad stack change | Revert PR, plan, merge |
| A failed apply halfway | Fix forward; the units that succeeded stay, and the next apply only adds what's missing |
| A worse index version | Point the API back at the previous version in config; delete the new one later |
| A bad API revision | Shift traffic back to the previous Container Apps revision |
| Spend spiking | The PR that removes the Search service, which is also how every session ends |

## Release calendar
{: #release-calendar }

None. Releases happen when a lab session finishes something. The fixed points are the daily drift scan at
05:13 UTC, which plans every stack in the infra repo including this one, and the month boundary for the budget.

## Checklist
{: #checklist }

- [x] Infrastructure plans on PR and applies on merge
- [x] Trivy and OPA gate every plan; accepted findings have reasons
- [x] A plan-time rule for the tenant's deployment SKU policy
- [x] Infracost produces an estimate for this stack ($0.00 for usage-priced changes)
- [ ] Lab repo CI: `ruff` and `pytest` against the fake adapter
- [ ] Image built and pushed by GitHub Actions with a federated credential
- [ ] Eval in CI fails a PR on a regression
- [ ] Decision on a required reviewer for the sandbox subscription's applies

{% include project-nav.html %}
