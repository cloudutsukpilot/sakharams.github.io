---
layout: post
title: "Y-IaC: Deployment and Go-Live"
date: 2026-10-05 00:13:00 +0530
categories: [projects, y-iac]
tags: [Projects, Y-IaC, Deployment, GoLive]
description: "Go-live for Y-IaC means three things: a consumer onboarding, a platform release reaching consumers, and a production apply. Readiness, runbooks and sign-off for each."
project: y-iac
project_step: 13
image:
  path: /assets/img/projects/y-iac/13-deployment-and-go-live.webp
  alt: "Y-IaC: Deployment and Go-Live - Projects hero image"
---

Y-IaC goes live many times, in three different ways. A new consumer repository goes live the first time
its plan runs in CI. A platform release goes live when consumers' refs pick it up. And every production
apply is a small go-live for the resources it touches. The readiness questions overlap, so this post
uses one checklist with three columns rather than three separate processes.

<!-- more -->

{% include project-nav.html %}

## Production readiness review
{: #production-readiness-review }

The guide's readiness review, split by kind of go-live:

| Item | New consumer | Platform release | Production apply |
|---|---|---|---|
| Approved change, owner, risk, window | ✔ | ✔ | ✔ |
| Plan with no unexplained replacements or destroys | First plan | Compatibility plans | ✔ |
| Tests, policy, security, cost, compatibility gates pass | ✔ | ✔ | ✔ |
| Identity, backend access, state lock, quota, network, secrets verified | ✔ | n/a | ✔ |
| Backup/versioning and restore path | Backend versioning on | Previous tag known | Restore path for stateful resources |
| Runbook, smoke tests, monitoring | ✔ | Release notes | ✔ |
| Support coverage and contacts | Consumer owner named | Maintainer on call | Approver available |
| Cutover and rollback decision points | ✔ | Ref pin-back | Revert YAML |

The review is a conversation, not a form. For a production apply it can be five minutes between the
author and the approver, as long as both have read the plan.

## Go-live checklist
{: #go-live-checklist }

For onboarding a new consumer, which is the go-live I'd expect most often:

- [ ] Repo created from the template; `entrypoint.py` stub present
- [ ] Backend entry in the consumer's `config.yaml` (or the shared one), matched on the repo folder name
- [ ] State storage exists, with versioning and restricted access
- [ ] `common_vars.yaml` per environment: account or subscription, providers, tags, gates
- [ ] Repo listed in the repo-to-subscription guardrail with `allowed_subscriptions`
- [ ] CI secrets or OIDC credentials configured; `secrets: inherit` in the workflow
- [ ] GitHub environments with required reviewers for staging and production
- [ ] First stack plans locally, then in a PR
- [ ] Teams webhook and Jira project configured for drift
- [ ] Consumer owner named in the platform's consumer list

## Deployment runbook
{: #deployment-runbook }

The runbook for a production apply in a consumer, which is the one people actually execute:

1. **Before merge.** Read the PR's plan summary. Confirm add/change/destroy counts match intent; any
   replacement of a stateful resource needs a restore path written in the PR.
2. **Merge to `main`.** The workflow detects changes and plans again.
3. **Approve.** The apply job waits on the environment's reviewers. Approve only if the `main` plan
   matches the PR plan.
4. **Apply.** One stack at a time. Watch the log for retries (state lock, backend timeouts).
5. **Plan after apply.** Must show no changes. If not, open an issue before the next change.
6. **Record.** The run, approval and summary are the evidence; link them in the change ticket.

Local apply (`--terragrunt apply` from a laptop) should be reserved for break-glass and recorded the same
way.

## Data migration plan
{: #data-migration-plan }

Most go-lives move no data. The exceptions are importing existing resources during onboarding and
backend changes. For both, the plan is per unit:

| Step | Import onboarding | Backend migration |
|---|---|---|
| Prepare | List resources and IDs; write YAML that matches | Create the new backend entry and storage |
| Move | Import (manual or auto-import) | `init -migrate-state` per unit |
| Verify | Plan shows no changes | Plan shows no changes |
| Record | Original IDs and import commands in the PR | Old and new state locations |
| Clean up | n/a | Lock or delete old state after a grace period |

The details live in [Data and Integration](/posts/projects/y-iac/07-data-and-integration/#data-migration-and-reconciliation).

## Smoke tests
{: #smoke-tests }

After a production apply:

- The plan-after-apply shows no changes (automatic).
- The resource exists and has the expected tags (`az resource show`, `aws ec2 describe-*`, or the
  provider's console).
- Policies that should apply did (for example storage public access is off).
- Diagnostic settings are sending logs, if the stack configures them.
- Anything that depends on the resource still works (DNS resolves, the app can reach Key Vault, the
  repository has its environments).

After a platform release, the smoke test is a plan in two consumers per cloud on the new tag, showing
no unexpected changes.

## Monitoring and alert validation
{: #monitoring-and-alert-validation }

For a new consumer, validate the platform's alerting path once, deliberately: trigger a manual drift scan
(`drift_scan: true`) after changing a tag in the portal, and confirm a Teams message arrives and a Jira
ticket is created with the right labels and project. Then revert the change and confirm the next scan
comments rather than opening a duplicate.

For workload monitoring (metrics, diagnostic settings, alerts on the resources), the modules provide the
building blocks (Log Analytics, Application Insights, Monitor workspaces, diagnostic settings, Grafana);
whether alerts fire correctly is part of the consumer's go-live.

## Support team readiness
{: #support-team-readiness }

Before a new consumer goes live, someone on the platform side should know it exists, which clouds it
uses, who owns it and where its drift tickets land. Before a platform release, the support channel
should have the release notes and know which changes are likely to cause questions (gate default
changes, provider bumps, new required YAML keys).

Support is handled by the DevOps team, which also owns releases, so the same people answer consumer
questions during a release week.

## User and stakeholder communications
{: #user-and-stakeholder-communications }

| Event | Audience | Message |
|---|---|---|
| New consumer onboarded | Consumer team, security | Repo, owner, subscriptions, where drift goes |
| Platform release | All consumer owners | What changed, who's affected, action needed, rollback ref |
| Breaking change | All consumer owners, a week ahead | Migration steps, deadline, help offered |
| Gate default change | Consumers and security | Old and new enforcement, exception process |
| Incident in shared path | All consumers | What broke, which ref to pin, ETA |

Keep release announcements short and put the detail in the CHANGELOG. A long announcement gets skimmed.

## Cutover and rollback plan
{: #cutover-and-rollback-plan }

**New consumer cutover.** If resources were managed some other way before (portal, scripts, another
Terraform setup), the cutover is the moment Y-IaC's state becomes authoritative. Freeze changes in the
old path, import, confirm a no-change plan, then remove the old path's access. Rollback: remove the
units from Y-IaC state (`state rm`), never destroy.

**Platform release cutover.** Consumers move refs. Rollback: pin back.

**Production apply.** Decision points are the plan review (stop if counts surprise you), the approval
(stop if `main`'s plan differs from the PR's), and the plan-after-apply (stop further changes if it
isn't clean). Rollback is a YAML revert and apply, or a restore for stateful resources.

## Launch decision and sign-off
{: #launch-decision-and-sign-off }

Who signs off depends on the kind of go-live:

| Go-live | Sign-off |
|---|---|
| New consumer | Consumer owner and platform maintainer |
| Platform release (minor or patch) | Platform maintainer after compatibility and RC trial |
| Platform release (major or gate default change) | Platform owner, security, and two consumer representatives |
| Production apply | The GitHub environment reviewer |

Production reviewers are members of the DevOps team. GitHub's "prevent self-review" option on each
production environment should be on, so the author of a change can never approve their own apply.

## Checklist
{: #checklist }

- [ ] Readiness table is linked from the onboarding guide
- [ ] Onboarding go-live checklist is part of `01-onboard-consumer-repo.md`
- [ ] Deployment runbook is in the consumer template README
- [ ] Drift alert path is validated once for every new consumer
- [ ] Release announcement template exists
- [ ] Sign-off owners per go-live type are written in the operating agreement
- [ ] Self-approval of production applies is prevented

{% include project-nav.html %}
