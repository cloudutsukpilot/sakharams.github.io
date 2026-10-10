---
layout: post
title: "State of DevOps: Deployment and Go-Live"
date: 2026-10-05 00:13:00 +0530
categories: [projects, state-of-devops]
tags: [Projects, State of DevOps, Deployment, GoLive]
description: "Taking State of DevOps live: readiness review, runbook, smoke tests, and why history starts on day one so going live early beats going live polished."
project: state-of-devops
project_step: 13
image:
  path: /assets/img/projects/state-of-devops/13-deployment-and-go-live.webp
  alt: "State of DevOps: Deployment and Go-Live - Projects hero image"
---

Going live with State of DevOps had an unusual property: **history can't be backfilled.** GitHub tells
you what a repository looks like today, not whether it had CODEOWNERS last March. Every day the
analyzers aren't running in production is a day missing from the trend charts forever. That turns the
usual go-live instinct on its head: get the jobs running early, even while the dashboard is rough,
and polish the UI on top of data that's already accumulating.

<!-- more -->

{% include project-nav.html %}

## Production readiness review
{: #production-readiness-review }

For a read-only internal tool, a readiness review fits on one page. The questions I'd ask before any
component goes to production:

| Area | Question | Evidence |
|---|---|---|
| Correctness | Do the numbers match GitHub for five sample repos per org? | Reconciliation notes |
| Security | Secrets from Key Vault only? GitHub Apps read-only? SSO in front? | Chart values, App settings |
| Privacy | Nothing PHI, no secret values or file contents in `/data`? | Grep of a day's output |
| Operability | Health probe, logs, job failure alerts in place? | Probe config, alert rule |
| Recovery | Can we redeploy from Git and restore `/data`? | ArgoCD app, backup policy |
| Ownership | Who gets paged (or messaged) when a job fails? | Support model |

> **TODO:** When did State of DevOps go live in production, and was a readiness review held?
{: .prompt-warning }

## Go-live checklist
{: #go-live-checklist }

- GitHub Apps installed on all four orgs and the enterprise; installation IDs in Key Vault.
- ExternalSecrets synced in the `cronjobs` and `state-of-devops` namespaces.
- Shared PVC `cron-jobs-data-pvc` bound; dashboard PV and PVC bound to the same share.
- Every CronJob deployed with the agreed schedule (02:00 to 07:00 UTC daily, weekend and Monday weekly).
- Dashboard ingress, TLS and DNS working on the internal hostname.
- Redis reachable over TLS.
- Teams webhook tested with a dry-run message.
- `/api/sidebar-config` showing only the tabs whose data has been checked.

## Deployment runbook
{: #deployment-runbook }

First deployment to a new cluster, in order:

```bash
# 1. Shared infrastructure: ServiceAccount, ExternalSecrets, shared PVC
#    (ArgoCD app for cronjob-shared-infra, synced first)

# 2. The collector, then trigger it once instead of waiting for 04:00
kubectl create job --from=cronjob/github-data-collector first-collect -n cronjobs

# 3. Analyzers and aggregators (ArgoCD apps), then one manual run each, in schedule order:
#    ghas -> pipeline -> infra -> repo -> trends -> enterprise -> cost -> summary

# 4. Dashboard (ArgoCD app); wait for the health probe
kubectl rollout status deploy/devops-state-dashboard -n state-of-devops
```

Running the first day's jobs by hand in schedule order matters: otherwise day one has a dashboard with
an empty Home page until 07:00 the next morning.

## Data migration plan
{: #data-migration-plan }

There's no legacy data to migrate; the "before" was status updates in meetings. Two migration-like
decisions remain:

- **Moving from k3d to AKS:** local `/data` was test data and shouldn't be copied; production history
  starts clean.
- **Baselines:** capture day one's numbers as the official baseline for each KPI, and record them
  outside the dashboard too (in the project wiki or the vision doc), because that's the
  number every future "we improved by X%" is measured against.

> **TODO:** Were baselines recorded on go-live day? Those are the numbers the
> [success metrics](/posts/projects/state-of-devops/01-vision-and-business-context/#success-metrics-and-business-kpis)
> are measured against.
{: .prompt-warning }

## Smoke tests
{: #smoke-tests }

```bash
BASE=https://<dashboard-host>
curl -fsS $BASE/api/health
curl -fsS $BASE/api/sidebar-config | jq 'keys'
curl -fsS $BASE/api/home-overview  | jq '.generated_at'          # today's date, UTC
curl -fsS $BASE/api/organizations  | jq 'length'                 # 4 orgs
curl -fsS "$BASE/api/organizations/<org>/repositories" | jq 'length'
```

Plus one human smoke test: open Home in a browser, open one org, open one repo, and open (but don't
submit) the Jira modal.

## Monitoring and alert validation
{: #monitoring-and-alert-validation }

An alert that has never fired is an assumption. Before calling it live, prove each one:

- **Job failure:** suspend a test CronJob's secret or point it at a bad org and confirm the failure
  alert arrives.
- **Missing data:** delete today's summary in a test path and confirm the freshness check complains.
- **Dashboard down:** scale the deployment to zero in a non-production cluster and confirm the probe
  alert.

What to monitor is designed in
[Operations and Observability](/posts/projects/state-of-devops/14-operations-and-observability/).

## Support team readiness
{: #support-team-readiness }

During the solo phase, "support" was the person who built it. That's fine to go live with, as long as
it's explicit, and the DevOps team joining after 8 to 10 months is what closes that gap. Readiness means a
second person can answer three questions without help: did last night's jobs run, why is this number
wrong, and how do I re-run a job for a day.

## User and stakeholder communications
{: #user-and-stakeholder-communications }

The launch message matters more than usual, because the first numbers will look worse than people
expect. A dashboard that suddenly shows, say, a third of repos without CODEOWNERS can read as an accusation. The
framing that works: this is a baseline, not a report card; the point is the trend from here; and every
finding has a Jira button.

Channels: a short announcement to engineering leadership first, then a link in the DevOps Teams channel,
then the Monday new and stale repository reports as a recurring reminder that the tool exists.

> **TODO:** How was the launch announced, and how did leadership react to the first numbers?
{: .prompt-warning }

## Cutover and rollback plan
{: #cutover-and-rollback-plan }

The real cutover isn't technical, it's **the end of manual status reporting** for the areas the
dashboard covers. Running both side by side for a few weeks, then replacing the manual update with a
link to the dashboard, is the moment the project delivers its value.

Technical rollback is simple, because nothing depends on the dashboard: suspend the CronJobs and scale
the dashboard to zero. No other system is affected, and `/data` stays for a retry.

## Launch decision and sign-off
{: #launch-decision-and-sign-off }

Sign-off for a measurement tool should come from the people whose numbers it shows, not only from the
people who built it:

| Who | Signs off on |
|---|---|
| DevOps lead | Operability, support model |
| Security | GHAS and secret-scanning views, access control, non-PHI rule |
| Domain owners | Numbers in their area match the source |
| Executive sponsor | Launch, and the move away from manual status updates |

## Checklist
{: #checklist }

- [ ] Readiness review held with evidence for each row
- [ ] Shared infra, collector, analyzers and dashboard deployed in order
- [ ] First day's jobs run manually in schedule order
- [ ] Smoke tests pass; Home shows today's `generated_at`
- [ ] Every alert fired once on purpose
- [ ] KPI baselines recorded outside the dashboard
- [ ] Launch message framed as a baseline, not a report card
- [ ] Manual status reporting replaced by a dashboard link

{% include project-nav.html %}
