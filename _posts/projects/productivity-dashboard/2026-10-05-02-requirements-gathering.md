---
layout: post
title: "Productivity Dashboard: Requirements Gathering"
date: 2026-10-05 00:02:00 +0530
categories: [projects, productivity-dashboard]
tags: [Projects, Productivity Dashboard, Requirements]
description: "Requirements for the Productivity Dashboard: per-person collection, AI summaries at four levels and three periods, search, refresh, and accuracy rules fit for performance reviews."
project: productivity-dashboard
project_step: 2
image:
  path: /assets/img/projects/productivity-dashboard/02-requirements-gathering.webp
  alt: "Productivity Dashboard: Requirements Gathering - Projects hero image"
---

The requirements for the Productivity Dashboard read simply ("summarize what people did"), but every
word hides a decision. *Which* people, from *which* tools, summarized for *whom*, how *often*, and how
*accurate* does it need to be when the summary ends up in a performance review? This post pins those
down.

<!-- more -->

{% include project-nav.html %}

## Functional requirements
{: #functional-requirements }

| # | The system must… | Delivered by |
|---|---|---|
| F1 | Collect each person's daily GitHub activity: commits, PRs, reviews | `prod-github-collector` |
| F2 | Collect each person's daily Jira activity: issues created and updated, comments, sprint issues | `prod-jira-collector` |
| F3 | Collect epics and their stories, and link GitHub branches to story keys | `prod-epic-data-collector` |
| F4 | Write AI summaries per person: daily, weekly, monthly | `prod-user-summary-generator` |
| F5 | Write AI summaries per team from the person summaries | `prod-team-summary-generator` |
| F6 | Write AI summaries per epic: daily, weekly and a consolidated narrative | `prod-epic-summary-generator` |
| F7 | Write AI summaries per POD (a cross-team group defined by a Jira label) | `prod-pod-summary-generator` |
| F8 | Show summaries by user, team, epic and POD, with period tabs | `productivity-ui` |
| F9 | Full-text search across all summaries | `SearchService`, `POST /api/search` |
| F10 | Regenerate a summary on demand | `RefreshService`, `POST /api/refresh` |
| F11 | Print or export a summary | `PrintExport` component |

## Non-functional requirements
{: #non-functional-requirements }

- **Freshness:** yesterday's summaries ready before the working day starts in the Americas; the
  generators run at 04:00 to 05:00 UTC for that reason.
- **Accuracy:** summaries must reflect the source data and nothing else. This is the requirement that
  matters most, and the hardest to test (see
  [Quality Assurance](/posts/projects/productivity-dashboard/10-quality-assurance/#user-acceptance-testing)).
- **Throughput:** many people per run without hitting AI rate limits; the user generator runs up to
  `MAX_PARALLEL_USERS` (default 4) in parallel.
- **Configurability:** adding a person, team or POD is configuration, never code.
- **Provider independence:** the AI provider is a setting (Azure OpenAI, OpenAI or a local LM Studio).
- **Security:** no static cloud keys in production; secrets from Key Vault.

## User journeys and use cases
{: #user-journeys-and-use-cases }

1. **Standup.** An engineer opens their user page, picks *Daily*, reads yesterday's summary, and uses
   it as their update. If something's missing because a ticket was updated late, they hit Refresh.
2. **Weekly team update.** A manager opens the team page on Friday, picks *Weekly*, and forwards or
   adapts it for stakeholders.
3. **Monthly executive view.** An executive opens an epic or POD page, picks *Monthly* or the
   consolidated epic narrative, and reads progress without any meeting.
4. **"What happened with X?"** Anyone searches "payment retry" across all summaries and lands on the
   days and people involved.

## Acceptance criteria
{: #acceptance-criteria }

```gherkin
Given a person with GitHub and Jira activity yesterday
When the daily pipeline has run
Then /data/{department}/{team}/Users/{user}/daily/{YYYY}/{MM}/{DD}/summary.md exists
And every PR and Jira key mentioned in it exists in that day's github.json or jira.json
And no PR or key from the data is silently dropped

Given a person with no activity yesterday
Then the collector writes no_activity: true
And the summary says so plainly instead of inventing work
```

The second clause of the first scenario is the important one. "Every key mentioned exists in the
source" is checkable by a script, which makes accuracy partly testable.

## Business rules
{: #business-rules }

- **Identity:** a person is a tuple of department, team, name, GitHub username and Jira email, set by
  environment variables (`department_*`, `team_*_*`, `name_*_*_*`, `github_username_*_*_*`,
  `jira_email_*_*_*`). Adding someone is four variables.
- **Teams** visible in the UI and to the epic collector are a list such as `DevOps, SRE, CNS`.
- **PODs** are cross-team groups keyed by a Jira label, with a member list, defined in Helm values.
- **Periods:** daily summarizes the previous day; weekly aggregates the dailies (regenerated each day
  within the week); monthly aggregates the weeklies.
- **Team summaries** wait for user summaries (polling up to `user_summary_wait_timeout`, 300 s by
  default) before running.

## Reporting and analytics requirements
{: #reporting-and-analytics-requirements }

The reports are the summaries themselves, in Markdown with GitHub-flavoured tables and task lists,
rendered with a table of contents. Around them:

- A timeline view of summaries along a date axis.
- Raw collector data per user and day (`/api/collector-data`) to check a summary against its source.
- Collector stats showing whether data exists for a given date.

> **TODO:** Are there any numbers reported alongside the prose (PRs merged, tickets closed per week),
> or is it summaries only? Numeric trends would make the monthly executive view stronger.
{: .prompt-warning }

## Accessibility and localization requirements
{: #accessibility-and-localization-requirements }

Summaries are English, generated from English source data; localization is out of scope. Dates and
schedules are UTC, which matters because the audience spans time zones: a "daily" summary is a UTC day.

Accessibility is helped by the format: summaries are semantic Markdown (headings, lists, tables)
rendered to HTML, which screen readers handle well. The rest of the UI needs the usual checks (see
[User Experience and Design](/posts/projects/productivity-dashboard/04-user-experience-and-design/#accessibility-design)).

## Regulatory, legal, and compliance requirements
{: #regulatory-legal-and-compliance-requirements }

This is a system that writes about named employees, and its output is used in performance reviews.
HR, legal and privacy reviewed it. The requirements that follow from that kind of use:

- People know their activity is summarized, and can read their own summaries.
- Summaries are built only from work systems (GitHub and Jira), which contain no PHI.
- A summary used in a review must be traceable to its source data (the raw data view exists for this).
- There should be a way for a person to flag an inaccurate summary about themselves.

> **TODO:** What did the HR, legal and privacy review conclude: retention limits, who may read
> individual summaries, and how a person disputes an inaccurate one? Those rules belong here.
{: .prompt-warning }

## Prioritization and release scope
{: #prioritization-and-release-scope }

Looking at the dependencies, the sensible order is: collectors and the user summary first (everything
else builds on them), then team summaries (the manager view), then the UI, then epics and PODs (the
initiative views), then search, refresh and export.

> **TODO:** What did the first live version include, and in what order did epics, PODs, search and
> refresh arrive during the 5 solo months?
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] Every summary level (user, team, epic, POD) and period mapped to a component
- [ ] Accuracy acceptance criteria scripted: every key in a summary exists in the source
- [ ] No-activity days produce an honest "no activity" summary
- [ ] People, teams and PODs configurable without code
- [ ] HR, legal and privacy rules (readership, retention, disputes) written down
- [ ] Raw data view available for every summary used in a review

{% include project-nav.html %}
