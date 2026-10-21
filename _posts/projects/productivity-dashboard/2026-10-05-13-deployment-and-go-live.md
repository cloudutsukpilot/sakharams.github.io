---
layout: post
title: "Productivity Dashboard: Deployment and Go-Live"
date: 2026-10-05 00:13:00 +0530
categories: [projects, productivity-dashboard]
tags: [Projects, Productivity Dashboard, Deployment, GoLive]
description: "Taking the Productivity Dashboard live: HR, legal and privacy sign-off, a transparency message to staff, first-week accuracy checks and retiring manual status updates."
project: productivity-dashboard
project_step: 13
image:
  path: /assets/img/projects/productivity-dashboard/13-deployment-and-go-live.webp
  alt: "Productivity Dashboard: Deployment and Go-Live - Projects hero image"
---

Going live with a system that writes about people every day isn't only a deployment; it's an
announcement. The technical go-live (CronJobs scheduled, UI reachable, first summaries written) is
the easy half. The other half is the people being summarized understanding what's collected, who reads
it, how it's used, and what to do when a summary is wrong. HR, legal and privacy have reviewed the
Productivity Dashboard, and people can read their own summaries; this post covers both halves.

<!-- more -->

{% include project-nav.html %}

## Production readiness review
{: #production-readiness-review }

| Area | Question | Evidence |
|---|---|---|
| People and policy | HR, legal and privacy sign-off on scope and use? | Review outcome (done) |
| Transparency | Do people know, and can they read their own summaries? | Announcement; user pages (done) |
| Data scope | Collected fields match what was approved? | Collector configs vs data-scope page |
| Accuracy | Sample of summaries checked against source data? | Spot-check notes |
| Coverage | Every configured person has collector data? | Collector stats per team |
| Operability | Health checks, job failure alerts, refresh working? | Probe config, alerts, a test refresh |
| Cost | Expected AI cost per month known? | Token estimate |

> **TODO:** When did the dashboard go live, and for which teams first?
{: .prompt-warning }

## Go-live checklist
{: #go-live-checklist }

- GitHub Apps installed, Jira service credentials and the Azure OpenAI key in Key Vault, ExternalSecrets
  synced in `productivity`.
- Shared volume bound; UI mount read-only.
- People, teams and PODs configured; each person's GitHub username and Jira email verified.
- CronJob schedules set in the UI chart values (epics 02:00 and 03:00, users and PODs 04:00, teams 05:00,
  collectors 06:00 UTC).
- UI Role allows Job creation in the namespace; a test refresh completes.
- Ingress and TLS on the internal hostname.

## Deployment runbook
{: #deployment-runbook }

1. Sync `productivity-shared-infra` (secret store, ExternalSecrets, volume).
2. Sync the collectors and run them once by hand (`kubectl create job --from=cronjob/…`), so data for
   the first day exists.
3. Sync the generators and run user, team, epic and POD generators once, in schedule order.
4. Sync `productivity-ui`; wait for `/api/health` to report storage and cache healthy.
5. Run the smoke tests below, then announce.

Running day one by hand avoids a launch where the dashboard is empty until the next morning.

## Data migration plan
{: #data-migration-plan }

There's no legacy data; the "before" was status updates typed into chats, documents and meetings. The
decisions at go-live are how far back to collect (`days_to_collect` can backfill a few days so weekly
summaries aren't empty on day one), and to start the time-saved baseline (how long status updates
took before) so the benefit can be measured later.

## Smoke tests
{: #smoke-tests }

```bash
BASE=https://<dashboard-host>
curl -fsS $BASE/api/health            | jq    # storage, cache, version
curl -fsS $BASE/api/storage-check     | jq
curl -fsS $BASE/api/config            | jq '.visible_views, .visible_teams'
curl -fsS $BASE/api/metadata          | jq 'keys'
curl -fsS "$BASE/api/summaries?user=<test-user>&date=<yesterday>&period=daily" | jq '.content' | head
```

Then, by hand: open a user page and a team page, run one refresh, and compare one summary with its raw
collector data.

## Monitoring and alert validation
{: #monitoring-and-alert-validation }

Fire each alert once on purpose before relying on it: break a test person's Jira email (coverage
alert), point a generator at an invalid AI key in a non-production namespace (generator failure), and
scale the UI to zero in development (availability). What to monitor is in
[Operations and Observability](/posts/projects/productivity-dashboard/14-operations-and-observability/).

## Support team readiness
{: #support-team-readiness }

During the five solo months, support was the builder. The questions support must be able to answer
from day one are specific to this system:

- "My summary is missing yesterday's work": check identity config and collector data for that date,
  then refresh.
- "My summary says something wrong": compare with the raw data view; fix the prompt or data issue;
  regenerate; note it if the summary was already used.
- "Can my team or POD be added?": a configuration change in the chart values.

## User and stakeholder communications
{: #user-and-stakeholder-communications }

For a system like this, the launch message is part of the product. It should say plainly:

- **What's collected:** GitHub commits, pull requests and reviews; Jira issues and activity.
- **What's produced:** AI-written daily, weekly and monthly summaries per person, team, epic and POD.
- **Who reads them:** they're open to read across the organization.
- **How they're used:** including as an input to performance reviews.
- **Your rights:** you can read your own summaries, check them against the source data, and report
  anything wrong.
- **What it doesn't see:** work outside GitHub and Jira (design, mentoring, incidents, meetings).

Executives and managers get a second, shorter message: where to find the daily, weekly and monthly
views, and that summaries are a starting point, not a verdict.

> **TODO:** How was the launch communicated to staff, and what questions came up?
{: .prompt-warning }

## Cutover and rollback plan
{: #cutover-and-rollback-plan }

The cutover is **retiring manual status updates**: standups start from the daily summary, weekly team
updates start from the weekly summary, and the monthly executive update is the monthly summary. A short
overlap where both exist builds confidence, then the manual version stops.

Technical rollback is simple and isolated: suspend the CronJobs and scale the UI to zero. Nothing else
depends on it, and people go back to writing updates by hand for as long as it's down.

## Launch decision and sign-off
{: #launch-decision-and-sign-off }

| Who | Signs off on |
|---|---|
| HR, legal and privacy | Scope, readership, use in reviews (done) |
| Engineering lead | Operability and support |
| A manager from a pilot team | Summaries are accurate and useful |
| Executive sponsor | Launch and retiring manual updates |

## Checklist
{: #checklist }

- [ ] HR, legal and privacy sign-off recorded with the project
- [ ] Identity of every configured person verified against GitHub and Jira
- [ ] Day one run by hand in schedule order
- [ ] Smoke tests and one manual source check pass
- [ ] Every alert fired once on purpose
- [ ] Launch message covers what, who, how it's used and how to report errors
- [ ] Time-saved baseline captured before manual updates stop

{% include project-nav.html %}
