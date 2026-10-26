---
layout: post
title: "Job Hunter Agent: Requirements Gathering"
date: 2026-10-22 00:02:00 +0530
categories: [projects, job-hunter-agent]
tags: [Projects, Job Hunter Agent, Requirements]
description: "What Job Hunter Agent must do and how well: discovery, scoring, truthful tailoring and a manual approval gate, with the rules that keep it honest."
project: job-hunter-agent
project_step: 2
image:
  path: /assets/img/projects/job-hunter-agent/02-requirements-gathering.webp
  alt: "Job Hunter Agent: Requirements Gathering - Projects hero image"
---

Most of this project's requirements came from saying no to the articles it started from. HunterAgent
applied on its own; Job Hunter Agent must not. Everything below follows from two rules: a human approves
every application, and nothing in a draft may claim experience my resume doesn't have.

<!-- more -->

{% include project-nav.html %}

## Functional requirements
{: #functional-requirements }

| ID | The system shall… |
|---|---|
| FR-1 | Keep several **search profiles**, each with keywords, location, excluded companies, a resume, a tailoring mode, a cover-letter tone and a schedule |
| FR-2 | **Discover** postings from LinkedIn for a profile's keywords (Indeed optional), skipping duplicates, excluded companies and reposts |
| FR-3 | **Score** each new posting against the profile's resume (0–100) with matched skills, missing skills and a rationale |
| FR-4 | For postings at or above the threshold, **research** the company, **tailor** the resume, **write** a cover letter and **suggest** up to three contacts |
| FR-5 | Run **truthfulness checks** on every tailored resume and letter and block approval while flags are unresolved |
| FR-6 | Hold drafts in a **review queue** with the statuses pending review, approved, applied and rejected |
| FR-7 | Let me **evaluate or re-evaluate** any single job on demand |
| FR-8 | **Import** resumes from PDF, DOCX, TXT or Markdown and let me edit them; **export** tailored resumes to DOCX, Markdown or text |
| FR-9 | Run each profile **on its own schedule** and record every run with its counts |
| FR-10 | Post a **Slack** message when a scheduled run finishes |

None of these sends anything to an employer. FR-10 posts only to my own Slack.

## Non-functional requirements
{: #non-functional-requirements }

| Quality | Requirement | How it's met |
|---|---|---|
| Privacy | Resume and postings never leave my infrastructure for an LLM | Local model through LiteLLM |
| Truthfulness | No invented numbers, tools or claims reach an approved draft | Deterministic checks + approval gate |
| LinkedIn safety | Low, spread-out traffic from one account | At most 5 postings per keyword, one run per profile per day, profiles hours apart |
| Latency | A full draft in a few minutes, not seconds | 300 s LLM timeout; scheduled runs are unattended |
| Availability | Best effort; a run missed while the pod is down waits for the profile's next slot | One replica; a late but running scheduler still fires within an hour (`misfire_grace_time`) |
| Security | Only platform admins can open it | Keycloak OIDC, group check in the app as well as in Keycloak |
| Cost | Free | Homelab compute, Supabase free tier, local model |

The truthfulness requirement is the one I'd defend hardest in a review. The others can bend.

## User journeys and use cases
{: #user-journeys-and-use-cases }

1. **Morning queue.** Scheduled runs find new postings; Slack tells me how many drafts are waiting; I
   open the review queue, check the skills table and the confidence, read the letter, approve or reject.
2. **A posting a friend sent.** I add it by hand on the Jobs tab and click **Evaluate**. It's scored and
   drafted with my default resume, whatever the score.
3. **Apply.** After approving, **Open the application** takes me to the employer's link; I apply there
   myself and click **I applied**.
4. **Tune a search.** A profile brings noise, so I add an excluded company or change its resume mode,
   and its next scheduled run uses the new settings.
5. **Fix my resume.** I edit the master resume in the app; future drafts use the new text.

## Acceptance criteria
{: #acceptance-criteria }

A few written as Given/When/Then, because these are the ones that protect me:

```text
Given a tailored resume that adds "Bring Your Own Key (BYOK)" which my resume never mentions
When I click Approve
Then approval is refused with that warning, unless I explicitly accept the warnings

Given a job whose application is approved or applied
When I click Re-evaluate
Then nothing changes and I'm told to reopen or reject it first

Given LinkedIn is down during a scheduled run
When the run finishes
Then it's recorded with status "errors", the error text, and a Slack message, and other profiles still run
```

These map one-to-one to tests in the repo (see [Quality Assurance](/posts/projects/job-hunter-agent/10-quality-assurance/#unit-testing)).

## Business rules
{: #business-rules }

- **Manual approval only.** Status changes go pending review → approved → applied, or to rejected, and
  only through those transitions.
- **Draft threshold.** Scheduled and bulk runs draft only postings scoring 75 or more. A job I evaluate by
  hand is drafted whatever its score, because I asked for it.
- **Skip rules.** Duplicates, excluded companies and reposts are skipped. I removed an applicant-count
  rule (skip at 100+ applicants) after the first runs: it dropped roles I wanted to see.
- **One application per job.** Re-evaluating replaces its drafts; approved and applied ones are frozen.
- **Contacts come from LinkedIn only.** The model may choose people from a scraped list, never invent
  them, and profile links come from the scraped page, not the model.
- **Company figures come from sources.** Revenue and headcount appear only when Wikidata publishes them.

## Reporting and analytics requirements
{: #reporting-and-analytics-requirements }

Modest, because the user is me: a Totals panel (jobs found, analyzed, drafted, pending, approved,
applied, rejected), a run history table (trigger, profiles, status, found, new, skipped, analyzed,
drafted, duration, errors), and a Slack summary after each scheduled run. Every agent call is also stored
in `agent_results` with its input, output and error, which is the raw material for any deeper analysis
later.

## Accessibility and localization requirements
{: #accessibility-and-localization-requirements }

English only, one user, so localization is out. Accessibility still matters a little: the UI uses
semantic HTML, real buttons and labels, `aria-live` regions for run output, colour plus an icon (✓, ✗, +)
rather than colour alone in the skills table, and both light and dark themes. No formal audit was done.

## Regulatory, legal, and compliance requirements
{: #regulatory-legal-and-compliance-requirements }

Two things matter here:

- **LinkedIn's terms.** Automated scraping is against LinkedIn's user agreement. I kept the agent
  read-only, low-volume and signed in as me, and accept the risk of the account being restricted. That's
  a personal risk decision, not legal advice.
- **Personal data.** My resume is my own data. Contact suggestions contain other people's names and
  public titles from LinkedIn; they're stored only for the application they belong to and never messaged.

Contact suggestions and rejected applications are deleted after six months, by a daily job; the period is
a setting. See [Data retention](/posts/projects/job-hunter-agent/07-data-and-integration/#data-retention-and-deletion).

## Prioritization and release scope
{: #prioritization-and-release-scope }

I used MoSCoW for the first release and let real use reorder the rest:

| Must (release 1) | Should (week 1 follow-ups) | Could | Won't |
|---|---|---|---|
| Discovery, scoring, tailoring, letters, truthfulness checks, review queue, Keycloak sign-in | Several profiles, per-profile schedules, Slack, run history | Contacts, company financials, Indeed | Auto-apply, outreach, multi-user |

Most "Should" items came straight from my own use in the first two days, which is the best argument for
shipping the "Must" column quickly.

## Checklist
{: #checklist }

- [ ] Every functional requirement has at least one test
- [ ] The truthfulness rule has acceptance tests for numbers, tools and quoted lines
- [ ] LinkedIn volume limits written as numbers (per keyword, per run, per day)
- [ ] Draft threshold (75) reviewed after a few weeks of approve/reject data
- [ ] Retention rule decided for contacts and rejected applications
- [ ] Won't-list kept visible in the README
- [ ] Accessibility basics (labels, focus, contrast) re-checked after each UI change

{% include project-nav.html %}
