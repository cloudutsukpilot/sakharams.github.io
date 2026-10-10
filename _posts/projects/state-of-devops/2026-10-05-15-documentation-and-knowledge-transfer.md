---
layout: post
title: "State of DevOps: Documentation and Knowledge Transfer"
date: 2026-10-05 00:15:00 +0530
categories: [projects, state-of-devops]
tags: [Projects, State of DevOps, Documentation]
description: "Documenting State of DevOps for the hand-over from one builder to a team: MkDocs pages per concern, OpenAPI, runbooks, and AI-agent skills as living docs."
project: state-of-devops
project_step: 15
image:
  path: /assets/img/projects/state-of-devops/15-documentation-and-knowledge-transfer.webp
  alt: "State of DevOps: Documentation and Knowledge Transfer - Projects hero image"
---

Knowledge transfer on State of DevOps had a clear deadline: after 8 to 10 months as a one-person
project, the DevOps team started contributing. Everything that lived only in my head had to become
something a colleague could read, run or ask an AI agent about. This post covers what's documented,
where it lives, and what I'd still add.

<!-- more -->

{% include project-nav.html %}

## Product documentation
{: #product-documentation }

The product-level docs answer "what is this and why should I care" in under a minute. The State of
DevOps section of the repo's MkDocs site starts with a README that does exactly that: a two-paragraph
description, a topics table linking to the deeper pages, a 30-second tour (13 cronjobs, one share, one
dashboard, four orgs) and a local quick start.

What's missing at product level is the *why* for non-engineers: the vision and KPIs from
[Vision and Business Context](/posts/projects/state-of-devops/01-vision-and-business-context/) belong
in a one-page overview for executives, linked from the dashboard's Home page.

## User guides
{: #user-guides }

Dashboard users need short task guides, not a manual:

- How to read the Home page, and what "as of" means.
- How to find your org's or your repo's findings.
- How to raise a Jira story from a finding, and where it lands.
- What each check means and **how to fix it**: "No CODEOWNERS: add `.github/CODEOWNERS` with at
  least one team".

The last one is the highest-value page in the whole project. A finding with a fix link gets fixed; a
finding without one becomes a question to the DevOps team.

> **TODO:** Is there a "what each check means and how to fix it" page today, and is it linked from the
> dashboard?
{: .prompt-warning }

## API documentation
{: #api-documentation }

FastAPI generates OpenAPI from the routes and Pydantic models, so interactive docs at `/docs` and the
schema at `/openapi.json` come for free. The written `ui.md` page complements it with the API grouped
by domain and the tab-to-endpoint mapping.

Two improvements: add `summary` and `description` to each route so the generated docs explain intent,
not just shape; and document the file contracts under `/data` the same way, since the trends analyzer
and summary generator are API consumers of a sort.

## Architecture documentation
{: #architecture-documentation }

`architecture.md` is the strongest page in the repo: a Mermaid component map, a tier table, the daily
execution order in UTC, a sequence diagram of the nightly pipeline, the weekly cadence, shared modules,
both authentication chains and the deployment topology. `storage.md` and `tech-stack.md` back it up with
the `/data` tree and every library with its purpose.

The lesson from this project is that architecture docs drift quietly. The tech-stack page said the
frontend was Create React App while the UI page described a Vite dev server; CRA was right. Two habits
prevent that: update docs in the same PR as the behaviour, and link every claim to the source path
(which these pages already do), so a reviewer can check it.

## Deployment instructions
{: #deployment-instructions }

Deployment knowledge is spread over three pages, each with a clear job:

| Page | Covers |
|---|---|
| `deployment.md` | The build / import / deploy trio per component, roll-up tasks, chart locations, registries, secrets, hostnames |
| `RELEASE.md` | Build once, re-tag on `versions.yaml` bump, dev and prod promotion, required repo configuration |
| `PR-PREVIEW.md` | Preview deploys of open PRs on the development cluster |

And one file that is documentation by being executable: `Taskfile.yml`. Every operation is a task with a
`desc`, so `task --list` is the deployment index.

## Operations runbooks
{: #operations-runbooks }

The runbooks worth writing, most used first:

1. Re-run a failed job for today, then regenerate the summary.
2. Re-run a job for a past date (backfill one day after a bug fix).
3. A GitHub App hits its rate limit: what to pause, when it resets.
4. Rotate a GitHub App private key or the Jira token.
5. Restore `/data` from a share snapshot.
6. Roll back a component by promoting the previous version.
7. Hide a tab with wrong numbers through `/api/sidebar-config`.

The first two are in
[Operations and Observability](/posts/projects/state-of-devops/14-operations-and-observability/#operational-runbooks);
the rest should sit next to them in the repo docs.

## Troubleshooting guides
{: #troubleshooting-guides }

The troubleshooting entries that come up again and again in a stack like this:

| Symptom | Likely cause | Fix |
|---|---|---|
| Local frontend can't reach the API | `localhost` resolves to IPv6 | Use `127.0.0.1` everywhere, including the CRA proxy |
| Home shows yesterday | Summary generator ran before an analyzer finished, or failed | Re-run the analyzer, then the summary generator |
| One org missing from a tab | GitHub App token or installation ID wrong for that org | Check the `github-app-<org-slug>` secret and the App installation |
| All jobs fail at once | Rate limit or Key Vault sync | Check rate-limit headers and ExternalSecret status |
| Works in k3d, not in AKS | `values.yaml` and `values-local.yaml` drifted | Diff the two files |

The first row comes straight from the project docs, which flag IPv6 resolution as a recurring papercut.

## Support procedures
{: #support-procedures }

Support requests fall into three kinds, each with its own path:

- **"This number is wrong"**: reconcile against GitHub for the repo; if the dashboard is wrong, it's a
  bug in the analyzer's backlog; if GitHub agrees, explain the check.
- **"How do I fix this finding?"**: point to the check's fix page; if there isn't one, write it.
- **"Can you add a check for X?"**: a feature request, prioritized with the rules in
  [Product Planning](/posts/projects/state-of-devops/03-product-planning/#prioritization-approach).

The ownership side is in [Support and Maintenance](/posts/projects/state-of-devops/16-support-and-maintenance/#support-model-and-ownership).

## Onboarding documentation
{: #onboarding-documentation }

A new contributor's first day should be: clone, `task local-start`, `task build-state-of-devops-all`,
`task import-state-of-devops-all`, `task state-of-devops-deploy-local`, open the dashboard, then read `architecture.md` and `cronjobs.md`.
The testing guide then walks the local Python, k3d and AKS ladder with two real cronjobs as examples.

The repo also onboards AI coding agents: an `AGENTS.md`, Copilot instructions, prompts and skills under
`.github/` (release versioning is one). They work as living documentation, because an agent that follows
them fails loudly when they're out of date.

The best measure of onboarding docs is time to first merged change. When the DevOps team joined, a new
member got there in **2 days**.

## Training materials
{: #training-materials }

Two short sessions cover most of the audience:

- **For engineers (45 minutes):** the architecture walk-through, then adding a check live, from
  sub-analyzer to tab, using the "how to add an analyzer" guide.
- **For leaders (15 minutes):** how to read Home and Trends, what the numbers mean, and how findings
  become Jira stories.

Recording both and linking them from the docs README turns a one-time handover into something the next
team member can watch on their own schedule.

## Checklist
{: #checklist }

- [ ] One-page executive overview linked from the dashboard Home page
- [ ] "What each check means and how to fix it" page, linked from every finding
- [ ] Route summaries and descriptions in the FastAPI OpenAPI docs
- [ ] Docs updated in the same PR as behaviour; CRA/Vite-style drift caught in review
- [ ] Runbooks 1-7 written in the repo docs
- [ ] Troubleshooting table kept current
- [ ] Onboarding path tested by the newest team member
- [ ] Engineer and leader sessions recorded

{% include project-nav.html %}
