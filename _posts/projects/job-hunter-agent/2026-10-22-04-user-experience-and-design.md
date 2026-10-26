---
layout: post
title: "Job Hunter Agent: User Experience and Design"
date: 2026-10-22 00:04:00 +0530
categories: [projects, job-hunter-agent]
tags: [Projects, Job Hunter Agent, UX, Design]
description: "A three-tab review UI in plain HTML and JavaScript, designed around one evening habit: read the queue, check the claims, approve or reject."
project: job-hunter-agent
project_step: 4
image:
  path: /assets/img/projects/job-hunter-agent/04-user-experience-and-design.webp
  alt: "Job Hunter Agent: User Experience and Design - Projects hero image"
---

The whole UI exists for one five-minute habit: open the review queue, see whether a job is worth it, check
what the agent changed, approve or reject. Everything that slows that down (a long diff on top, figures
without sources, warnings that don't explain themselves) got moved, collapsed or rewritten after I used
it for a day.

<!-- more -->

{% include project-nav.html %}

## Information architecture
{: #information-architecture }

Three tabs, in the order I use them:

| Tab | Holds |
|---|---|
| **Review queue** | Applications by status; the selected one's job, skills, confidence, warnings, letter, resume, company and contacts |
| **Jobs** | Every discovered or hand-added posting, the profile that found it, its evaluation, an Evaluate / Re-evaluate button |
| **Setup & run** | Three stacked sections: search profiles, resumes, and run (manual buttons, totals, scheduled runs, Slack, history) |

The header shows health dots for the model, LinkedIn connection, storage and email, plus the signed-in
name and a sign-out link. There's no settings page: configuration that changes often lives on profiles;
the rest is environment variables.

## User flows
{: #user-flows }

The review flow, which matters most:

1. A Slack message says "4 waiting for your review" and links to the UI.
2. Keycloak sign-in if the 8-hour session has expired, then straight back to the page I asked for.
3. **Review queue**, pending first: pick the highest score.
4. Read the skills table and the shortlist confidence. Most rejections happen here.
5. If it's worth it: resolve any truthfulness warnings (edit, or accept them knowingly), open the cover
   letter and the tailored resume, which are collapsed by default.
6. **Approve**. Then **Open the application**, apply on the employer's site, and click **I applied**.

The evaluate flow is shorter: Jobs tab → **Evaluate** → the row turns into "✓ 82 · pending review", which
links straight to that review.

## Wireframes and prototypes
{: #wireframes-and-prototypes }

No wireframes. The prototype was the product: plain HTML served by FastAPI, iterated from screenshots.
Each UI change was checked by rendering it with sample data in headless Chromium at desktop and phone
widths, light and dark, before deploying. For a one-user tool that loop (change, screenshot, look)
was faster and more honest than drawing boxes first.

## Visual design and design system
{: #visual-design-and-design-system }

A deliberately small system in one stylesheet:

- **Colour tokens** on `:root` (`--bg`, `--panel`, `--text`, `--muted`, `--line`, `--accent`, `--ok`,
  `--warn`, `--bad`), redefined for dark mode with `prefers-color-scheme`.
- **Meaning colours:** green for what I have or what's done, red for missing, amber for "check this"
  (skills added by tailoring, warnings, pending counts).
- **Components:** cards, collapsible rows (`details`), chips, stat tiles, a responsive table wrapper, bar
  series for revenue and headcount.
- System fonts, no icon font, no framework, no build step.

## Interaction patterns
{: #interaction-patterns }

- **Collapse by default** for long content (cover letter, tailored resume, profile and resume editors),
  and remember which rows I opened while the page is live.
- **Progressive disclosure on the review page:** decision data (skills, confidence) first, evidence
  (warnings) next, drafts last.
- **Long operations stay on the button:** "Evaluating…" replaces the button and the row updates when it
  finishes; run buttons disable themselves and the run appears in history as "running".
- **Confirm only destructive actions:** deleting a profile, approving despite warnings.
- **Explain refusals in the UI:** a blocked approval shows the warnings and offers "approve anyway after
  checking".

## Responsive behavior
{: #responsive-behavior }

Grids use `auto-fill` with `minmax(min(Npx, 100%), 1fr)`, so the skills table, profile forms and stat
tiles drop columns as the width shrinks and become one column on a phone. Wide tables (jobs, run history)
scroll sideways inside their own box instead of the page. I checked each screen at 390 px wide.

## Accessibility design
{: #accessibility-design }

- Status never relies on colour alone: ✓ / ✗ / + icons, and text for the amber case.
- Real `<button>`, `<label>` and `<select>` elements; `role="tab"` on the tabs with `aria-selected`.
- `aria-live="polite"` on health and run output, so results are announced.
- The skills grid uses table roles (`role="table"`, `row`, `cell`) with an `aria-label` on each status
  icon.

What's missing: keyboard focus styles beyond the browser default and a contrast audit of the dark theme.

## Usability testing
{: #usability-testing }

One user, many sessions. The changes that came from my own use in the first two days:

| What I hit | Change |
|---|---|
| Resume dropdown empty, no explanation | Empty state that says to upload one, and the draft button disabled |
| "Mentions Own, from the job posting" | Phrases kept whole with their acronym; warnings explain what to do |
| Long diff above everything | Skills and confidence first; letter and resume collapsed |
| Chip cloud of skills hard to scan | A table that fits as many columns as the screen allows |
| "you have" / "missing" labels next to colours | Labels removed; colour and icon already say it |
| Couldn't tell which profile found a job | Profile column on the Jobs tab |

## Content and messaging
{: #content-and-messaging }

Rules I applied to every string:

- Say what to do, not just what's wrong: "Adds "Bring Your Own Key (BYOK)": the job posting asks for it,
  but your original resume never mentions it. Keep it only if you have this experience."
- Name sources next to figures: "Sources: LinkedIn company page, Wikidata, Google News. Figures are
  shown only when a source publishes them."
- Be plain about estimates: the shortlist confidence says it's "an estimate, not a prediction of a
  recruiter's decision".
- The tagline is the contract: "Manual approval only. Nothing is submitted for you."

## Checklist
{: #checklist }

- [ ] Review queue usable in under five minutes per application
- [ ] Every status shown with an icon or text, not colour alone
- [ ] Each screen checked at 390 px and in both themes after a change
- [ ] Every warning and empty state tells me what to do next
- [ ] Keyboard focus styles added
- [ ] Dark-theme contrast checked

{% include project-nav.html %}
