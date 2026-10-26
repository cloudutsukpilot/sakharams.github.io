---
layout: post
title: "Job Hunter Agent: Product Planning"
date: 2026-10-22 00:03:00 +0530
categories: [projects, job-hunter-agent]
tags: [Projects, Job Hunter Agent, Planning, Roadmap]
description: "How Job Hunter Agent went from three articles to a live homelab app in two days, and the phases and steps that came after."
project: job-hunter-agent
project_step: 3
image:
  path: /assets/img/projects/job-hunter-agent/03-product-planning.webp
  alt: "Job Hunter Agent: Product Planning - Projects hero image"
---

Job Hunter Agent was planned in an afternoon and built in two days, which only worked because the plan
was small and the platform underneath already existed. This post records the phases as they actually
happened and the steps that make each one checkable.

<!-- more -->

{% include project-nav.html %}

## Product roadmap
{: #product-roadmap }

| Phase | Delivers | Status |
|---|---|---|
| 0. Plan | Read the HunterAgent articles, decide what to keep and what to refuse, write the plan | Done (2026-10-21) |
| 1. Core agent | Agents, truthfulness checks, review queue, UI, tests, local run against the real LLM | Done (2026-10-21) |
| 2. Homelab deploy | Image through the platform's build gates, Argo CD app, Keycloak sign-in, LinkedIn sidecar, Supabase | Done (2026-10-22) |
| 3. Daily use | Profiles, schedules, run history, review-page upgrades, company facts, Slack | Done (2026-10-22) |
| 4. Hardening | Tracing export, alerting, retention, pacing between LinkedIn requests | Not started |

### Phase 1 steps
{: #phase-1-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | Domain models, LLM client with JSON-schema output | job-hunter-agent | A score comes back from the local model | Done (2026-10-21) |
| 2 | Agents: scorer, resume optimizer, cover letter, research, contacts | job-hunter-agent | A draft exists for a sample job | Done (2026-10-21) |
| 3 | Truthfulness checks and the approval gate | job-hunter-agent | A draft with an invented tool can't be approved | Done (2026-10-21) |
| 4 | Review UI, resume import and export | job-hunter-agent | Approve a draft and download it as DOCX | Done (2026-10-21) |
| 5 | Evaluation on six real postings | job-hunter-agent | `docs/evaluation.md` written | Done (2026-10-21) |

### Phase 2 steps
{: #phase-2-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 6 | Keycloak client and secrets in OpenBao | infra-local | `kv/platform/job-hunter` has every key | Done (2026-10-22) |
| 7 | Argo CD app, sidecar, PVC, ingress, network policy | homelab-gitops | `jobs.platform.home.cloudutsuk.com` redirects to Keycloak | Done (2026-10-22) |
| 8 | Image through the platform's build gates | job-hunter-agent, homelab-gitops | CI commits a signed digest | Done (2026-10-22) |
| 9 | LinkedIn sign-in inside the cluster | homelab-gitops | `--status` reports a valid session after a pod restart | Done (2026-10-22) |
| 10 | Supabase schema on the cloud free tier | job-hunter-agent | Integration test passes against it | Done (2026-10-22) |

### Phase 3 steps
{: #phase-3-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 11 | Several search profiles, each with a resume, mode and tone | job-hunter-agent | Two profiles draft with different resumes | Done (2026-10-22) |
| 12 | Review page: skills table, shortlist confidence, collapsible drafts | job-hunter-agent | Tailored resumes are re-scored | Done (2026-10-22) |
| 13 | Setup page: collapsible profiles, editable resumes, run history | job-hunter-agent | Every run appears with its counts | Done (2026-10-22) |
| 14 | Evaluate / Re-evaluate per job | job-hunter-agent | A rejected job returns to pending review | Done (2026-10-22) |
| 15 | Company facts: About page, Wikidata, Google News | job-hunter-agent | Revenue by year shows for a listed company | Done (2026-10-22) |
| 16 | One scheduled job per profile; Slack run reports | job-hunter-agent, infra-local, homelab-gitops | A test message arrives; three profiles run hours apart | Done (2026-10-22) |

## MVP definition
{: #mvp-definition }

The MVP was "one profile, one resume, a queue I can approve from", running on my laptop against the real
local model. It deliberately had no scheduler, no Slack and no deployment. The test of the MVP was the
evaluation in step 5: six real postings, three resume modes each, and a count of how often the
truthfulness checks fired. That result (skills mode was clean, keyword mode added tools I don't have)
changed the defaults before anything was deployed.

## Release milestones
{: #release-milestones }

| Milestone | Date | Evidence |
|---|---|---|
| First draft from the local model | 2026-10-21 | Smoke script output |
| Evaluation report | 2026-10-21 | `docs/evaluation.md` |
| Live on the platform cluster behind Keycloak | 2026-10-22 | Argo CD Synced/Healthy, Let's Encrypt certificate |
| First live LinkedIn discovery from the cluster | 2026-10-22 | 2 postings in 23 s, nothing stored |
| Scheduled per-profile runs with Slack | 2026-10-22 | Test message sent, three jobs scheduled |

## Backlog structure
{: #backlog-structure }

There's no tracker. The backlog is the conversation with myself plus three places in git:
the phase tables above, `docs/plan.md` in the repo, and TODO callouts in these posts. That's enough for
one person. If a second contributor joined, I'd move it to GitHub Issues with one label per area of this
playbook.

## Prioritization approach
{: #prioritization-approach }

Use drove priority. After the first day of real runs I asked "what annoyed me today?" and built that
next: the resume dropdown was empty with no explanation, discovery crashed with an out-of-memory
browser, warnings read as nonsense ("Mentions Own"). Those went ahead of anything on a roadmap. Safety
items (the approval gate, the truthfulness checks) were never traded away for features.

## Budget and resource planning
{: #budget-and-resource-planning }

| Item | Cost |
|---|---|
| LLM | The homelab's local model; electricity only |
| Compute | One pod on the platform cluster: 150m CPU and about 1.2 GiB requested, 3.8 GiB memory limit |
| Database | Supabase free tier |
| Company facts and news | Wikidata and Google News, free |
| Slack | Existing workspace and webhook |

The real budget was my time: two days of building with an AI coding assistant, plus review.

## Risk and dependency management
{: #risk-and-dependency-management }

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| LinkedIn restricts the account | Medium | High | Read-only, ≤5 postings per keyword, profiles hours apart; it already happened once during testing (HTTP 429) |
| The model invents experience | High | High | Deterministic checks block approval |
| LinkedIn changes its page layout | Medium | Medium | Deterministic header parsing with an LLM fallback |
| Supabase free tier pauses the project | Medium | Medium | A daily upkeep job queries it every day, weekends included; an alert fires if the job stops succeeding |
| Local model is down | Low | Medium | Runs fail visibly in the history and Slack |

Supabase pauses a free project after a week without activity. Weekday runs alone would cover that, but
not a long holiday with schedules turned off, so the daily upkeep job (retention clean-up and backup export,
03:30 every day) doubles as the keep-alive. If it fails for two days, `JobHunterUpkeepFailing` fires,
leaving five days to fix it before the project pauses.

## Change-control process
{: #change-control-process }

For a personal project the process is light but real:

1. A new piece of work goes into a phase table above before it's built.
2. Small changes go straight to `main` in job-hunter-agent; anything with a database migration goes
   through a pull request, because the migration has to be applied to Supabase before the image deploys.
3. Platform changes (homelab-gitops, infra-local) always go through a pull request that I merge.
4. Each change ships with its docs: README, these posts, and a lesson when something cost real time.

## Checklist
{: #checklist }

- [ ] Phase 4 steps written with a "done when" for each
- [ ] Every shipped feature has a row in a phase table
- [ ] Evaluation re-run after changing prompts or the model
- [ ] Risk table reviewed monthly, especially the LinkedIn row
- [ ] Supabase inactivity policy checked
- [ ] Migrations always applied before merging the code that needs them

{% include project-nav.html %}
