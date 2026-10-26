---
layout: post
title: "Job Hunter Agent: Vision and Business Context"
date: 2026-10-22 00:01:00 +0530
categories: [projects, job-hunter-agent]
tags: [Projects, Job Hunter Agent, Vision, Business]
description: "Why I built a job-hunting agent that does the searching and drafting but never applies on its own, and how I'll know it's worth running."
project: job-hunter-agent
project_step: 1
image:
  path: /assets/img/projects/job-hunter-agent/01-vision-and-business-context.webp
  alt: "Job Hunter Agent: Vision and Business Context - Projects hero image"
---

Applying for architect roles is mostly reading: forty postings that all say "cloud", five that actually
fit, and for each of those a resume and a cover letter that need an hour of careful rewording. Job Hunter
Agent takes the reading and the first drafts off my plate. The one decision that shapes everything else
is that it never applies for me. It prepares; I approve.

<!-- more -->

{% include project-nav.html %}

## Business problem and opportunity
{: #business-problem-and-opportunity }

The problem isn't finding jobs. LinkedIn has plenty. It's the cost of each *good* application:

| Step | By hand | What the agent does |
|---|---|---|
| Search the same keywords every day | 15–30 min | Scheduled searches per profile, duplicates and reposts filtered |
| Read a posting and decide if it fits | 5–10 min each | Scores the fit against my resume, lists matched and missing skills |
| Research the company | 15 min | Company page, financials, headcount, recent news, cached |
| Tailor the resume | 30–60 min | Line edits to my own resume, checked for invented claims |
| Write a cover letter | 30 min | A draft in one of four tones, from my resume and the research |

The by-hand column is my own estimate, not a measurement.

The opportunity came from three dev.to articles by Mindy Jen describing an agent called HunterAgent. Her
design auto-applied; mine deliberately doesn't. A badly tailored application sent automatically costs more
than it saves: it's a recruiter's first impression, and it can't be unsent.

I also had the infrastructure already: a homelab platform with a local LLM behind a LiteLLM gateway,
Keycloak, OpenBao and Argo CD. So the project was mostly application code, not plumbing.

## Goals, objectives, and expected outcomes
{: #goals-objectives-and-expected-outcomes }

1. **Find relevant postings without me searching.** Each search profile runs once a weekday at its own
   time and stores only new postings.
2. **Decide quickly.** For every posting worth a look: a fit score, the skills I have and lack, and a
   shortlist confidence for the tailored resume.
3. **Draft, never send.** A tailored resume and a cover letter wait in a review queue. Approval is mine.
4. **Stay truthful.** The agent may reorder and rephrase my experience; it may not invent it. Anything it
   adds that my resume doesn't support is flagged and blocks approval.
5. **Keep my data at home.** My resume and the postings go to a local model, not a cloud API.

There's no numeric target yet. What success looks like is the daily routine without the scrolling: by
hand, I'd scroll through 10 to 15 postings to apply for 2 to 4 of them. The agent should hand me those 2 to
4, already tailored, so my time goes on the applications instead of on finding them. See
[Success metrics](#success-metrics-and-business-kpis).

## Stakeholders, sponsors, and decision-makers
{: #stakeholders-sponsors-and-decision-makers }

This is a personal project, so the stakeholder list is short and honest:

| Who | Role | What they care about |
|---|---|---|
| Me | Sponsor, product owner, only user, approver of every application | Better applications in less time, no embarrassing auto-sends |
| Recruiters and hiring managers | Indirect: they read what I send | A resume that matches the role and is true |
| LinkedIn | Indirect: its terms and rate limits | Low, human-like traffic from one signed-in account |
| The homelab platform | Hosting | The app follows the platform's policies (signed images, restricted pods) |

The recruiters are the reason the approval gate exists. They never see the agent, only its output.

## Target users and personas
{: #target-users-and-personas }

There's one real persona, and I designed for it rather than for an imagined market:

**The senior architect between roles (me).** Applies for platform, cloud and DevOps architect roles,
mostly in Pune or remote from India. Has one long master resume (about 28,000 characters) and two
derived versions. Wants to review a short queue each evening, not babysit a tool. Comfortable with a
technical UI; doesn't need onboarding.

A second persona I'd consider later is a friend in the same position, which would mean real multi-user
support. The data model already carries a `user_id` on every row and Supabase row-level security
policies, but the app runs as a single default user today. See
[Scope](#scope-assumptions-constraints-and-dependencies).

## Success metrics and business KPIs
{: #success-metrics-and-business-kpis }

What I can measure today, because the app records it:

| Metric | Where it comes from |
|---|---|
| Postings found and new per run | Run history (`runs.stats.found`, `saved`) |
| Postings analyzed and drafted | Run history and the Totals panel |
| Drafts approved, rejected, applied | Application status counts |
| Share of drafts with truthfulness flags | Stored warnings on each tailored resume and letter |
| Review time per application | Not measured |

The leading indicator I watch is the approve rate: if most drafts get rejected, the search profiles are
too broad or the scoring threshold (75) is too low.

The by-hand baseline is a rough one: in a day, I'd scroll 10 to 15 postings and apply for 2 to 4. There's
no count of interviews yet, so this is a baseline for effort, not outcomes. The comparison it allows is
simple: the agent should find at least as many postings worth applying for, with less reading per
application. The approve rate and the drafted count per day from the run history measure that.

## Scope, assumptions, constraints, and dependencies
{: #scope-assumptions-constraints-and-dependencies }

**In scope:** discovery from LinkedIn (Indeed as an optional, off-by-default source), scoring, company
research, resume tailoring, cover letters, contact suggestions, the review queue, scheduled runs, Slack
run reports, exports to DOCX, Markdown and text.

**Out of scope, on purpose:** submitting applications, sending LinkedIn connection requests or messages,
multi-user accounts, and any cloud-hosted LLM.

**Constraints:**

- LinkedIn has no job-search API for individuals, so discovery drives a real browser signed in as me,
  through an MCP server. That makes LinkedIn's rate limits a hard constraint: low volume, spread across
  the day.
- A local 35B-parameter model is slower and less consistent than a frontier model. Structured output with
  a JSON schema, one repair retry and a 300-second timeout compensate.
- Free tiers only: Supabase free tier for data, the homelab for compute.

**Dependencies:** LinkedIn and my signed-in session, the LiteLLM gateway and its model, Supabase, the
homelab platform (Keycloak, OpenBao, Argo CD, cert-manager, Traefik), Wikidata and Google News for
company facts, Slack for run reports.

## Checklist
{: #checklist }

- [x] By-hand baseline written down (10–15 postings read, 2–4 applications a day)
- [ ] A numeric success target, once there's data to set it against
- [ ] Manual approval written down as a non-negotiable, not a phase-one shortcut
- [ ] Search profiles agreed for each target role (cloud, platform, DevOps architect)
- [ ] LinkedIn volume limits accepted as a design constraint
- [ ] Local-LLM-only decision recorded, with the trade-off in speed and quality
- [ ] Out-of-scope list (auto-apply, outreach, multi-user) agreed
- [ ] Dependencies listed with an owner for each (all me, for now)

{% include project-nav.html %}
