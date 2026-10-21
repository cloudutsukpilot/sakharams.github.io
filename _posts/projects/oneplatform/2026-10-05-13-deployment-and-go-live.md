---
published: false
layout: post
title: "OnePlatform: Deployment and Go-Live"
date: 2026-10-05 00:13:00 +0530
categories: [projects, oneplatform]
tags: [Projects, OnePlatform, Deployment, GoLive]
description: "Going live with OnePlatform features: a per-feature readiness review, the promotion runbook, smoke checks, cutovers like Copilot v1 to v2, and in-portal comms."
project: oneplatform
project_step: 13
image:
  path: /assets/img/projects/oneplatform/13-deployment-and-go-live.webp
  alt: "OnePlatform: Deployment and Go-Live - Projects hero image"
---

OnePlatform had no launch day. It has had dozens of small ones, every time a template or dashboard became visible to a new role. That changes what "go-live" means: the platform is already live, and each feature has to earn its way in without breaking the 79 others. This post is the per-feature go-live process we use, plus the runbook for a release.

<!-- more -->

{% include project-nav.html %}

## Production readiness review
{: #production-readiness-review }

Before a feature is exposed to its users in production, the owner answers these in the feature's IMPLEMENTATION doc or PR:

| Question | Evidence |
|---|---|
| Who can use it, and is the denial case tested? | Permission key, role mapping, 403 test |
| Does it touch PHI, or produce audit evidence? | PHI filter call or "N/A"; audit table or task log |
| What external identity does it act as, and with what scope? | Service principal or App, and its rights |
| What happens when the external system is down? | Error state on the page; action fails cleanly with a message |
| Is there a migration, and is it backward compatible? | Migration name, apply order |
| How will we know it's used and working? | Adoption Insights, health check, notification on failure |
| Is the architecture doc updated? | ARCHITECTURE.md diff |

> **TODO:** Is this review formal (a sign-off on the ticket) or informal (the PR reviewer checks it)? I'd make it a PR template section, so the answers are always recorded.
{: .prompt-warning }

## Go-live checklist
{: #go-live-checklist }

For a feature, in order:

1. Released to development and tried by the requester.
2. Promoted to staging; the requester or a tester repeats the main journey.
3. Promoted to production.
4. Role mapping for navigation set, starting with Admin only if the rollout is cautious.
5. The template or page permission granted to the target roles.
6. A broadcast notification to the target group, or a system alert for anything disruptive.
7. Adoption checked after a week.

Steps 4 and 5 are the real go-live. The code can sit in production, invisible, until the permission and navigation say otherwise.

## Deployment runbook
{: #deployment-runbook }

The portal release, step by step:

```text
1. Actions → "Release" → Run workflow on main (or a commit).        Record the tag: 2026.MM.DD.N
2. Wait for Argo CD to sync development. Check /healthcheck and sign in.
3. Actions → "Promote to Staging" (tag defaults to dev's).           Check staging.
4. Actions → "Promote to Production" (tag defaults to staging's).    Approver approves.
5. Watch Argo CD sync, then check sign-in, Create page, catalog search, one dashboard.
6. Release notes are generated; post a broadcast if users need to know.
```

The middleware, when it changed:

```text
1. Build and apply EF migrations for the environment (if any).
2. Build the API image for the environment, then deploy with Helm.
3. Build and deploy Functions (if changed).
4. Check /healthz returns 200 with every database context healthy.
```

## Data migration plan
{: #data-migration-plan }

Most releases have no data migration. When one does, we use expand, migrate, contract. The SQL monitoring move from table storage to middleware endpoints followed it:

1. **Expand:** middleware endpoints and PostgreSQL schema deployed; portal still reads the old store.
2. **Migrate:** portal switched to the endpoints behind service wrappers and mapping adapters, so the UI didn't change; data copied.
3. **Contract:** old reads removed once the new path was proven.

> **TODO:** How was the SQL monitoring data copied and reconciled (script, one-off Function), and was there a freeze while it ran? It's a good detail for that feature's deep-dive.
{: .prompt-warning }

## Smoke tests
{: #smoke-tests }

After every production deploy, five checks that take two minutes:

- Portal `/healthcheck` returns ok; middleware `/healthz` returns 200 with all contexts healthy.
- Sign-in with Entra works and your role's navigation appears.
- Create page lists templates; open one form and check a picker loads (this proves backend, permissions and an Azure or GitHub call).
- Catalog search returns a known component.
- One middleware-backed dashboard loads data (file monitoring or FinOps).

These are manual today. The anonymous checks already exist in Playwright and could run against production after each sync. (Don't confuse these with the portal's *Smoke Tests* feature, which runs smoke tests for other applications.)

## Monitoring and alert validation
{: #monitoring-and-alert-validation }

For a new feature, check that its telemetry appears in Application Insights under the portal's cloud role for the environment, and that failures produce a notification. Scaffolder failures are polled every 30 seconds and can post to Teams. For a new scheduled job, check the first run's logs by its run ID scope (FinOps runs log a `FinOpsRunId`).

## Support team readiness
{: #support-team-readiness }

Before a feature reaches users, the people who'll get the questions need: the template's instructions text, the ARCHITECTURE.md for the feature, and the name of the owning engineer. For approval flows (Copilot, Key Vault), the approvers also need to know where the approval page is and what each option means.

> **TODO:** Who is first-line support for the portal (the platform team's channel, a service desk queue)? See [Support model](/posts/projects/oneplatform/16-support-and-maintenance/#support-model-and-ownership).
{: .prompt-warning }

## User and stakeholder communications
{: #user-and-stakeholder-communications }

The portal has its own channels now, which beats email:

- **Broadcast notifications** from admins to users or groups, with a sent history.
- **System alerts** for outages and maintenance, shown across the portal.
- **Release notes** generated on production promotion.
- **Run notifications** for individual template results.

For a feature that changes a process (Copilot requests moving to self-service with Finance approval), stakeholders hear before users: approvers first, then requesters.

## Cutover and rollback plan
{: #cutover-and-rollback-plan }

Cutovers keep the old path alive until the new one is proven. The Copilot license request moved from a manager-driven request on table storage (v1) to self-service with tiered licenses and multi-party approval in PostgreSQL (v2). The v2 action shipped beside v1, and v1 stays registered for backward compatibility, so in-flight requests finish where they started.

Rollback for any release is a promotion with the previous tag ([CI/CD](/posts/projects/oneplatform/12-cicd-and-release-management/#rollback-and-roll-forward-procedures)). For a feature, rollback is often just removing the permission from roles, which hides it without a deploy.

## Launch decision and sign-off
{: #launch-decision-and-sign-off }

The production approval in the promotion workflow is the release sign-off. Feature exposure (granting permission to roles) is decided by the platform team with the requesting stakeholder.

> **TODO:** Who has authority to expose a feature to a new role, and does anyone outside the platform team (security for PHI-adjacent features, finance for license flows) sign off? Record it per feature in its deep-dive.
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] Readiness questions in the PR template and answered for every feature
- [ ] Release runbook followed and the tag recorded on the ticket
- [ ] Middleware migrations applied before the API deploy
- [ ] Two-minute production smoke checks after each sync; automate the anonymous ones
- [ ] Feature exposed by permission and navigation, starting narrow
- [ ] Approvers briefed before an approval-flow feature reaches requesters
- [ ] Old path kept until the new one is proven, then removed

{% include project-nav.html %}
