---
layout: post
title: "Productivity Dashboard: Data and Integration"
date: 2026-10-05 00:07:00 +0530
categories: [projects, productivity-dashboard]
tags: [Projects, Productivity Dashboard, Data, Integration]
description: "The Productivity Dashboard's data: per-person JSON and Markdown on Azure Files, GitHub and Jira contracts, the schedule as an event order, and what happens when someone changes team."
project: productivity-dashboard
project_step: 7
image:
  path: /assets/img/projects/productivity-dashboard/07-data-and-integration.webp
  alt: "Productivity Dashboard: Data and Integration - Projects hero image"
---

Everything the Productivity Dashboard knows lives in a folder tree shaped like the organization chart:
department, team, person, date. That makes it easy to browse and easy to reason about, and it has one
consequence that's easy to miss until it happens: when a person changes team, their history doesn't
move with them. This post covers the data, who owns it, how it flows, and the edge cases that come with
modelling people as paths.

<!-- more -->

{% include project-nav.html %}

## Data ownership and classification
{: #data-ownership-and-classification }

| Data | Writer | Classification |
|---|---|---|
| `…/{user}/daily/{date}/github.json`, `jira.json` | GitHub and Jira collectors | Confidential: employee activity |
| `…/Epics/{EPIC}/epic-metadata.json`, `jira-updates.json` | Epic data collector | Internal |
| `…/Users/{user}/{period}/…/summary.md` | User generator | **Confidential: about a named person, used in reviews** |
| `…/{team}/{period}/…/summary.md` | Team generator | Internal |
| `…/Epics/{EPIC}/…summary.md` | Epic generator | Internal |
| `{org_prefix}/PODS/{pod}/…` | POD generator | Internal (per-member files: confidential) |

Each path has exactly one writer; the UI only reads. Per-person data is the sensitive category: not
because of what's in it (work activity, no PHI) but because of how it's used.

## Data retention and deletion
{: #data-retention-and-deletion }

Today there's **no automated pruning**: every dated file is kept indefinitely. For an engineering
dashboard that would be fine; for personal data used in performance reviews it needs a decision:

- How long are per-person collector files and summaries kept? (A review cycle plus a margin is a
  common answer.)
- What happens to a person's data when they leave?
- Are team, epic and POD summaries, which are less personal, kept longer?

A pruning job is simple once the rules exist, for example a CronJob running
`find /data/<dept>/<team>/<user>/daily -mtime +N -delete` per rule. The rules are the hard part, and
they're HR's and legal's, not engineering's.

> **TODO:** What retention did the HR, legal and privacy review set for per-person data, and what
> happens to it when someone leaves?
{: .prompt-warning }

## Database schema and migrations
{: #database-schema-and-migrations }

The schema is the folder layout plus three file shapes:

| File | Shape |
|---|---|
| `github.json` | `metadata`, `commits[]`, `pull_requests[]`, `reviews[]`, `summary{}` |
| `jira.json` | `metadata`, `issues_created[]`, `issues_updated[]`, `comments[]`, `sprint_issues[]`, `summary{}` |
| `summary.md` | Markdown with the sections the prompt asks for |

Fields collected are configurable per collector (for example `comment_fields` in the Jira collector),
which makes the data scope a config change rather than a code change. That's useful, and also exactly
why the data scope should be reviewed whenever that config changes.

## Data validation and quality
{: #data-validation-and-quality }

- **No activity is explicit:** the GitHub collector writes `no_activity: true` for a day with nothing,
  so "no data" and "collector didn't run" are different states.
- **Coverage:** every configured person should have both files for each working day; a missing file is
  usually a wrong GitHub username or Jira email in the identity config.
- **Output check:** every PR number and Jira key in a summary should appear in that day's source files.
  This one check catches most hallucinations that matter.

The `CollectorStats` component already shows whether collector data exists for a date; turning that
into a daily coverage report per team would surface identity mistakes the day they happen.

## Import and export requirements
{: #import-and-export-requirements }

- **Import:** none; all data comes from GitHub and Jira.
- **Export:** summaries can be printed or exported from the UI (`PrintExport`), which is how they reach
  review documents and stakeholder emails.
- **Source export:** raw collector data for a user and date range (`/api/collector-data/aggregated`),
  which is the evidence behind any summary.

## External systems and third-party integrations
{: #external-systems-and-third-party-integrations }

| System | Direction | Auth | Used by |
|---|---|---|---|
| GitHub REST and GraphQL | Read | Per-org GitHub App; PAT fallback | GitHub and epic collectors |
| Jira Cloud REST | Read | Email + API token | Jira and epic collectors |
| Azure OpenAI | Read / write (prompts) | API key | All generators (production) |
| OpenAI, LM Studio | Same | API key / none | Alternatives; LM Studio for local development |
| Kubernetes API | Write (Jobs) | ServiceAccount + Role | UI refresh |
| Azure Files | Read / write | Workload Identity | All components |

The epic collector also links GitHub branches to Jira story keys, so code work shows up under the right
epic even when the PR doesn't mention the ticket in its title.

## Event and messaging contracts
{: #event-and-messaging-contracts }

There's no message bus; the contracts are files and time:

| UTC | Job | Reads | Writes |
|---|---|---|---|
| 02:00 | Epic data collector | Jira, GitHub | Epic data |
| 03:00 | Epic summary generator | Epic data | Epic summaries |
| 04:00 | User summary generator | Previous run's `github.json` / `jira.json` | User summaries |
| 04:00 | POD summary generator | User data filtered by Jira label | POD summaries |
| 05:00 | Team summary generator | User summaries (waits up to 300 s) | Team summaries |
| 06:00 | GitHub and Jira collectors | GitHub, Jira | Today's collector files |

Generators run **before** the collectors on the same day on purpose: they summarize the previous run's
collection, so yesterday's summaries are ready before the Americas' working day, and the 06:00
collection feeds tomorrow. The team generator's wait is the one explicit dependency; the others rely on
the clock.

> **TODO:** Which calendar day does the 06:00 UTC collection cover: the day that just ended, or the
> current UTC day? If it's the current day, a "daily" summary only sees activity before 06:00 UTC, which
> would miss most of the Americas' working day. Worth stating precisely in the docs.
{: .prompt-warning }

## Backup and restore strategy
{: #backup-and-restore-strategy }

| Data | Regenerable? | Backup need |
|---|---|---|
| Collector files | Partly; GitHub and Jira search windows and edits change history | Yes |
| Summaries | Only approximately; a new prompt or model writes different text | Yes, if used in reviews |
| Code, prompts, config | From Git | No |

Azure Files share snapshots through Azure Backup cover this, with a retention that matches the agreed
data retention (and no longer, since backups are also personal data).

## Data migration and reconciliation
{: #data-migration-and-reconciliation }

The migration that happens all the time is **people changing teams**. Paths include the department
and team, so after a move, new data lands under the new team while history stays under the old one. A
monthly summary in the month of the move only sees part of the month, and a user page for the new team
starts empty.

Two fixes, from cheapest to cleanest:

1. A small migration script run with each team change that moves the person's folders to the new path.
2. Key per-person data on a stable ID (for example the Jira account ID) instead of team-based paths,
   with the team as metadata.

Reconciliation for accuracy is a weekly sample: pick a few people and days, compare the summary with the
raw data view, and record the result as the accuracy KPI.

> **TODO:** How are team moves handled today?
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] Per-person data classified confidential, with readers agreed
- [ ] Retention and leaver rules from HR, legal and privacy implemented as a pruning job
- [ ] Collector field lists reviewed whenever they change
- [ ] Daily coverage report per team for identity mistakes
- [ ] Output key check against source on every summary
- [ ] Collection day boundary documented precisely
- [ ] Team moves handled by a script or stable IDs
- [ ] Share backups with retention equal to the data retention

{% include project-nav.html %}
