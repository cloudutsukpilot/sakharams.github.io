---
layout: post
title: "Productivity Dashboard: Documentation and Knowledge Transfer"
date: 2026-10-05 00:15:00 +0530
categories: [projects, productivity-dashboard]
tags: [Projects, Productivity Dashboard, Documentation]
description: "Documenting the Productivity Dashboard for a team hand-over and for its readers: architecture and API docs, a data-scope page, prompt changelog, runbooks and fair-use guidance."
project: productivity-dashboard
project_step: 15
image:
  path: /assets/img/projects/productivity-dashboard/15-documentation-and-knowledge-transfer.webp
  alt: "Productivity Dashboard: Documentation and Knowledge Transfer - Projects hero image"
---

The Productivity Dashboard has two audiences for documentation, and they need very different things.
The team that took over after five solo months needs to know how the pipeline works and how to change a
prompt safely. The people who read (and are written about in) the summaries need to know what the
system sees, what it doesn't, and how to use its output fairly. Most projects only write the first
kind.

<!-- more -->

{% include project-nav.html %}

## Product documentation
{: #product-documentation }

The repo docs open with a good README: a one-paragraph description, a topics table, a 30-second tour
(three collectors, three summary generators plus a POD generator, one UI with refresh) and a local quick
start. For readers outside engineering, a one-page "What the Productivity Dashboard is" should cover the
same ground as the launch message in
[Deployment and Go-Live](/posts/projects/productivity-dashboard/13-deployment-and-go-live/#user-and-stakeholder-communications),
linked from the UI's home page.

## User guides
{: #user-guides }

Short guides by role:

- **Everyone:** how to find your own summaries, check them against the raw data, refresh, and report a
  mistake.
- **Managers:** daily and weekly team views, epics and PODs, exporting a summary for stakeholders.
- **Executives:** where the monthly views are and how to read them.
- **Reviewers:** how summaries may be used in performance reviews (see below).

## API documentation
{: #api-documentation }

FastAPI publishes OpenAPI at `/docs` from the routes and the Pydantic models in `backend/models.py`.
The written UI page in the repo complements it with the full endpoint table and common query parameters
(`user`, `team`, `epic`, `pod`, `date`, `period`, `page`, `limit`, `search`). Adding a `summary` and
`description` to each route would make the generated docs self-explanatory.

## Architecture documentation
{: #architecture-documentation }

The architecture page has a component diagram, the daily schedule, an end-to-end sequence diagram,
the AI provider table, the identity and POD models, and authentication. It's thorough, and like all
docs it has drifted in places:

| Docs say | Repo shows |
|---|---|
| `prod-*` cronjobs have no in-tree `helm/` folder | Every component has a chart |
| POD generator is `pod-summary-generator` | `prod-pod-summary-generator` |
| `productivity-tools/` is out of scope | The images build their source and prompts from it |
| CI triggers GitOps promotion on merge | Promotion now follows a `versions.yaml` release |

Two habits keep it current: docs change in the same PR as behaviour, and every claim links to the source
path (which these pages already do well).

## Deployment instructions
{: #deployment-instructions }

The deployment page covers build, import and deploy tasks, CI, the UI chart's values for production and
local, secrets, the ConfigMap-driven UI behaviour and on-demand refresh. The repo-wide release guide
covers versioning and promotion. Together with `task --list`, that's enough for a new maintainer to ship.

## Operations runbooks
{: #operations-runbooks }

The runbooks this project needs, most used first:

1. Regenerate one person's, team's, epic's or POD's summary.
2. Re-collect missed days.
3. Add a person, team or POD.
4. Handle a person changing team (move history, update identity).
5. Handle AI throttling or switch provider.
6. Roll back a generator and regenerate affected days.
7. Rotate the GitHub App key, Jira token or AI key.

## Troubleshooting guides
{: #troubleshooting-guides }

| Symptom | Likely cause | Fix |
|---|---|---|
| A person has no summary | Wrong GitHub username or Jira email in identity config | Fix the env tuple; re-collect; regenerate |
| Team summary misses people | Team generator timed out waiting for user summaries | Regenerate the team summary; review timings |
| Refresh never completes | Job can't pull the image, or the Role lacks permissions | Check Job events and the Role |
| Prompt change had no effect | Edited the `prod-*/` copy; images build from `productivity-tools/` | Edit the right copy (or remove the duplicate) |
| Summary mentions unknown tickets | Hallucination or stale cache | Compare with raw data; clear cache; regenerate; log for tuning |
| Local API calls fail | `localhost` resolving to IPv6 | Use `127.0.0.1` |

## Support procedures
{: #support-procedures }

- **"My summary is wrong or incomplete":** check source data first. If the data is wrong or missing,
  fix collection; if the AI is wrong, regenerate and log the case for prompt tuning. If the summary was
  used in a review, tell the reviewer.
- **"Add my team or POD":** a values change, reviewed and released.
- **"Can it also include X?":** a data-scope change; route it through whoever owns the data rules.

## Onboarding documentation
{: #onboarding-documentation }

A new maintainer's first day: create the k3d cluster, build and deploy the productivity stack, run the
generators against LM Studio for two synthetic people, open the UI, then read the architecture and
storage pages. Their first change should be a small prompt tweak taken through the full process
(local run, before/after samples, review, release), because that's the most common and most delicate
change in this project.

> **TODO:** How long did it take the team that joined after month five to make their first change?
{: .prompt-warning }

## Training materials
{: #training-materials }

- **Maintainers (45 minutes):** pipeline walk-through and a live prompt change.
- **Managers and reviewers (20 minutes):** reading summaries well. They're grounded in GitHub and Jira
  and nothing else; they miss work that doesn't happen in those tools; they're a starting point for
  conversations and reviews, not a score; and here's how to check one against its source.

The second session matters more than the first. It's where the fair use of the summaries in performance
reviews is actually taught.

## Checklist
{: #checklist }

- [ ] One-page overview for non-engineers linked from the UI
- [ ] Role-based user guides, including "report a mistake"
- [ ] Doc drift fixed: charts, POD generator name, source location, release flow
- [ ] Runbooks 1-7 written
- [ ] Troubleshooting table kept current
- [ ] New maintainers' first change is a full prompt change cycle
- [ ] Managers and reviewers trained on fair use of summaries

{% include project-nav.html %}
