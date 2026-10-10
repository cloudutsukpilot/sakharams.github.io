---
layout: post
title: "Productivity Dashboard: Vision and Business Context"
date: 2026-10-05 00:01:00 +0530
categories: [projects, productivity-dashboard]
tags: [Projects, Productivity Dashboard, Vision, Business]
description: "Why the Productivity Dashboard exists: replacing hand-typed status updates with AI summaries of real GitHub and Jira activity, for managers daily and executives monthly."
project: productivity-dashboard
project_step: 1
image:
  path: /assets/img/projects/productivity-dashboard/01-vision-and-business-context.webp
  alt: "Productivity Dashboard: Vision and Business Context - Projects hero image"
---

Every engineer has written the same status update three times in one week: once for standup, once for
the weekly team update, and once more when a manager needed something for stakeholders. The work was
already recorded in GitHub and Jira; the update was just a manual copy of it, in a different tool, from
memory. The Productivity Dashboard is the project I built to stop that: it collects each person's daily
activity from GitHub and Jira and has an AI write the summaries that people used to type.

<!-- more -->

{% include project-nav.html %}

## Business problem and opportunity
{: #business-problem-and-opportunity }

People work across different tools, and every status report depended on someone manually updating
it. That created three problems:

- **Time:** individual contributors spent time each day and week restating work they had already
  done in commits, pull requests and tickets.
- **Lag and gaps:** updates were only as fresh and complete as the last time someone remembered to
  write them.
- **Repetition up the chain:** managers then rewrote team updates for stakeholders, and again in a
  shorter form for executives.

The opportunity was that the source data already existed and was accurate. GitHub knows what was
committed, reviewed and merged; Jira knows what was created, moved and discussed. A system that reads
both every day and writes summaries at the right level for each audience removes the manual step
entirely.

## Goals, objectives, and expected outcomes
{: #goals-objectives-and-expected-outcomes }

| Objective | Outcome |
|---|---|
| Collect GitHub and Jira activity for every person, every day | No manual data entry for status |
| Write a **daily** summary per person and team | Managers and stakeholders see yesterday's work each morning |
| Write **weekly** and **monthly** roll-ups | Executives get a monthly view without anyone compiling it |
| Summaries per **epic** and per **POD** (cross-team group) | Progress on initiatives, not just people |
| One place to read and search them | Standups and weekly updates start from the summary |

The outcome the brief cares about is time: time back for every individual contributor, time back for
managers who report to stakeholders, and a monthly executive update that writes itself.

> **TODO:** Is there any measure of the time saved (for example minutes per person per week, or
> meetings shortened or dropped since go-live)? One number here would carry the whole series.
{: .prompt-warning }

## Stakeholders, sponsors, and decision-makers
{: #stakeholders-sponsors-and-decision-makers }

| Role | What they get |
|---|---|
| C-level executives | Weekly and monthly summaries across teams and initiatives |
| Managers and stakeholders | Daily summaries per person, team, epic and POD |
| Individual contributors | Their own summaries, ready for standup and weekly updates |
| HR, legal and privacy | Reviewed the system before and around its use in performance reviews |
| Platform owners | The AKS cluster, Azure OpenAI and secrets the system runs on |

> **TODO:** Who is the executive sponsor, and who decides what the summaries are allowed to be used
> for (beyond the HR, legal and privacy review)?
{: .prompt-warning }

## Target users and personas
{: #target-users-and-personas }

- **The engineer.** Opens their own daily summary before standup, checks it's right, and reads it out
  or pastes it. Wants accuracy above all: a summary that invents work, or misses it, is worse than
  none, especially since summaries feed performance reviews.
- **The manager.** Reads the team's daily summary each morning, and the weekly one before stakeholder
  updates. Wants to spot blockers and progress without asking each person.
- **The executive.** Reads monthly (and sometimes weekly) summaries for teams, epics and PODs. Wants
  outcomes, not ticket numbers.

These three read the same underlying data at different zoom levels, which is exactly how the system
is built: user summaries roll up into team summaries; daily into weekly into monthly.

## Success metrics and business KPIs
{: #success-metrics-and-business-kpis }

| KPI | Why it matters |
|---|---|
| Time saved per contributor and per manager on status updates | The main reason the project exists |
| Summary coverage: % of people with a daily summary each working day | Proves the pipeline is complete |
| Summary accuracy: % of sampled summaries with no factual errors | The trust metric, given performance-review use |
| Freshness: daily summaries ready before the working day | The point of a *daily* summary |
| Adoption: weekly readers by role | Shows managers and executives actually use it |
| AI cost per summary | Keeps the economics visible as teams are added |

> **TODO:** Which of these are tracked, and what are the current numbers (coverage, accuracy from
> spot checks, cost per month)?
{: .prompt-warning }

## Scope, assumptions, constraints, and dependencies
{: #scope-assumptions-constraints-and-dependencies }

**In scope:** daily GitHub and Jira collection per person; epic data with GitHub branch linking; AI
summaries per user, team, epic and POD at daily, weekly and monthly periods; a dashboard with search,
export and on-demand refresh.

**Constraints:**

- No PHI: GitHub and Jira contain engineering work, not patient data.
- The people being summarized know about it and can read their own summaries.
- Summaries are used in performance reviews, after HR, legal and privacy review. That raises the bar
  on accuracy and fairness more than any technical constraint does.

**Dependencies:** GitHub Apps per org; Jira Cloud API access; Azure OpenAI; an AKS cluster with Azure
Files, External Secrets and ArgoCD; and an up-to-date mapping of people to teams.

## Checklist
{: #checklist }

- [ ] Problem stated as "status updates are manual copies of data that already exists"
- [ ] Audience per summary level agreed: daily for managers, monthly for executives
- [ ] Executive sponsor and data-use owner named
- [ ] Time-saved baseline measured, with a method that can be repeated
- [ ] Accuracy KPI defined and sampled, given performance-review use
- [ ] HR, legal and privacy review outcome documented with the project
- [ ] Dependencies (GitHub Apps, Jira, Azure OpenAI, AKS platform) confirmed with owners

{% include project-nav.html %}
