---
layout: post
title: "Productivity Dashboard: Product Planning"
date: 2026-10-05 00:03:00 +0530
categories: [projects, productivity-dashboard]
tags: [Projects, Productivity Dashboard, Planning, Roadmap]
description: "Planning the Productivity Dashboard: a five-month solo build, an MVP of one person's daily summary, per-component releases, and the risks of AI summaries."
project: productivity-dashboard
project_step: 3
image:
  path: /assets/img/projects/productivity-dashboard/03-product-planning.webp
  alt: "Productivity Dashboard: Product Planning - Projects hero image"
---

The Productivity Dashboard was a one-person project for its first five months; after that, a team took
it on. Planning for a solo build is mostly about order: which piece makes the next piece possible, and
which piece makes someone stop writing status updates soonest. The answer to both questions is the same: one
person's daily summary, end to end, before anything else.

<!-- more -->

{% include project-nav.html %}

## Product roadmap
{: #product-roadmap }

| Horizon | What it delivers | Status |
|---|---|---|
| **1. Summaries** | Daily GitHub and Jira collection; user, team, epic and POD summaries at daily, weekly and monthly periods; the dashboard with search, refresh and export | Live |
| **2. Trust and scale** | Measured accuracy, prompt and model tuning, a team maintaining it, more teams and PODs onboarded, HA dashboard | In progress (tuning is ongoing) |
| **3. Next** | To be decided | Open |

> **TODO:** What's next after horizon 2: more data sources (pull request review time, incidents,
> documentation), numeric trends alongside summaries, or summaries pushed to Teams or email?
{: .prompt-warning }

## MVP definition
{: #mvp-definition }

The smallest version that removes a status update:

- GitHub and Jira collectors for a handful of people in one team.
- The user summary generator with a daily prompt.
- Summaries written as Markdown on the share, readable even without a UI.

Team summaries, the dashboard, weekly and monthly roll-ups, epics, PODs, search and refresh all add
value on top, but the core claim ("you don't need to write your standup update") is proven by one
person's accurate daily summary.

> **TODO:** What was in the first version people actually used, and when did it go live?
{: .prompt-warning }

## Release milestones
{: #release-milestones }

Each component is released on its own: an image tag in `versions.yaml` and a chart version. All eight
productivity components (three collectors, four generators and the UI) are tracked there.
Product milestones are sets of component releases, such as "team summaries live" or "PODs live".

> **TODO:** Add the real milestones with dates: first daily summary, dashboard live, epics, PODs,
> search and refresh, team onboarding after month five.
{: .prompt-warning }

## Backlog structure
{: #backlog-structure }

- **Platform epics** per component (collectors, generators, UI).
- **Prompt epic**: prompt and model changes get their own backlog, because they change output for
  everyone at once and need review like code.
- **Onboarding stories**: one per team or POD added (identity variables, POD definitions, visible
  teams).

Prompt work deserves its own lane. In an AI product, the prompt is the product logic.

## Prioritization approach
{: #prioritization-approach }

1. **Accuracy issues first.** A summary that's wrong about a person is the most damaging bug this
   system can have, given performance-review use.
2. **Freshness second.** A daily summary that arrives after standup has failed at its job.
3. **New audiences third**: more teams, PODs and views.
4. **Polish last.**

## Budget and resource planning
{: #budget-and-resource-planning }

| Cost | Driver |
|---|---|
| Azure OpenAI | Tokens per summary × people × periods, plus team, epic and POD summaries |
| AKS | Short-lived CronJob pods; one UI pod and a Redis pod |
| Azure Files | Markdown and JSON files kept indefinitely (small) |
| People | One engineer for five months, then a team |

The AI line scales with headcount, so it's the one to watch as teams are added. Weekly and monthly
summaries are built from summaries, not raw data, which keeps their prompts small.

> **TODO:** What does Azure OpenAI cost per month, and per person summarized?
{: .prompt-warning }

## Risk and dependency management
{: #risk-and-dependency-management }

| Risk | Impact | Mitigation |
|---|---|---|
| AI writes something untrue about a person | High: reviews use it | Source-checked output, raw-data view, prompt rules against filler, dispute path |
| Missing activity (unmapped username, tool not covered) | High: looks like no work | Coverage checks per person; "no activity" said explicitly |
| Sensitive content reaches summaries | Medium | Data rules reviewed by HR, legal and privacy; collector field lists |
| AI provider outage or rate limits | Medium | Provider switch (Azure OpenAI, OpenAI, LM Studio); retries |
| One person knows everything (first 5 months) | High | Docs, Taskfile, team onboarding |
| Identity config drifts from reality | Medium | Review the people list with each team change |

## Change-control process
{: #change-control-process }

Code goes through pull requests, CI and GitOps promotion via ArgoCD. Two kinds of change need more
than a code review:

- **Prompt changes**, because they change every summary. Compare old and new output on a fixed set
  of days before release.
- **Data-scope changes** (a new field, a new source), because they change what is said about people.
  These should go back past whoever approved the data rules.

## Checklist
{: #checklist }

- [ ] Roadmap horizons agreed, including what follows trust and scale
- [ ] MVP and go-live date recorded
- [ ] Prompt changes tracked in their own backlog lane
- [ ] Accuracy bugs always prioritized first
- [ ] Azure OpenAI cost tracked per month and per person
- [ ] Risk register reviewed quarterly
- [ ] Prompt and data-scope changes have a review step beyond code review

{% include project-nav.html %}
