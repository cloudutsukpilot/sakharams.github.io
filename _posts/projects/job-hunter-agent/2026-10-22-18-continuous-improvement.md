---
layout: post
title: "Job Hunter Agent: Continuous Improvement"
date: 2026-10-22 00:18:00 +0530
categories: [projects, job-hunter-agent]
tags: [Projects, Job Hunter Agent, Improvement]
description: "How Job Hunter Agent keeps getting better: what the data says, what using it taught me in week one, and the roadmap and exit plan that follow."
project: job-hunter-agent
project_step: 18
image:
  path: /assets/img/projects/job-hunter-agent/18-continuous-improvement.webp
  alt: "Job Hunter Agent: Continuous Improvement - Projects hero image"
---

Almost every feature Job Hunter Agent gained after its first day came from using it, not from a plan:
an empty dropdown, a confusing warning, a browser that ran out of memory. This post turns that habit into
a loop: measure, listen (to myself), review, adjust, and know when to stop.

<!-- more -->

{% include project-nav.html %}

## Product analytics
{: #product-analytics }

The data is already collected; the questions I'll ask of it monthly:

| Question | Data |
|---|---|
| Which profile finds postings I actually approve? | `jobs.profile_id` → `applications.status` |
| Is the draft threshold (75) right? | Scores of approved vs. rejected applications |
| Which tailoring mode needs the fewest fixes? | Warnings per mode on `optimized_resumes` |
| Does the shortlist confidence predict anything? | Confidence vs. interviews, once there are outcomes |
| How much LinkedIn traffic does each profile cost? | `runs.stats.found` per profile |

Interview outcomes aren't recorded for now. Until they are, the shortlist confidence can't be checked
against reality, so it stays a guide, not a prediction. If that changes, the smallest step is an
"interview / no reply / rejected" field on applied applications.

## User feedback
{: #user-feedback }

I'm the user, so feedback is what annoyed me while using it. Week one's list and what changed:

| Feedback | Change |
|---|---|
| "The resume dropdown is empty" | Empty state, and resumes loaded |
| "Discover failed" | Sidecar memory 2 → 3 GiB |
| "Warnings make no sense" | Phrases with acronyms; plain-language messages |
| "Show skills vs. mine first, collapse the rest" | New review layout |
| "Don't skip crowded postings" | Applicant-count filter removed |
| "Several searches, each at its own time" | Profiles with their own resume, mode, tone and schedule |
| "Evaluate this one job" | Evaluate / Re-evaluate on the Jobs tab |
| "Tell me how the company is doing" | Financials, headcount, news from public sources |
| "Tell me when a run finishes" | Slack run reports |

## Retrospectives
{: #retrospectives }

What went well: reusing the platform (signed images, Keycloak, OpenBao) made "live in a day" possible;
deterministic checks around the model caught real fabrications; fakes kept tests fast and LinkedIn-free.

What went badly: copying a LinkedIn session from my laptop to test the cluster tripped LinkedIn's
defences (redirect loop, then HTTP 429) and logged me out, a mistake that cost a sign-in and some trust;
the in-cluster sign-in took three tries; the first discovery hit an OOMKill that a memory test would have
found. And one claim in these posts (that missed runs are caught up after a restart) was wrong until I
checked the scheduler's code, which is a reminder to verify behaviour rather than describe intent.

What I'd do next time: design the LinkedIn sign-in for Kubernetes from the start, and test with a real
search before calling a deploy done.

## Reliability reviews
{: #reliability-reviews }

A monthly ten-minute review of the run history: failure rate per profile, the most common error, sidecar
restarts and their reasons, any LinkedIn throttling. Output: one change, or "nothing to do".

## Cost optimization
{: #cost-optimization }

There's almost nothing to cut: free tiers, a local model, a pod on hardware I already run. The real cost
is LinkedIn goodwill, and the optimizations there are already in place: 5 postings per keyword, known
IDs skipped before page loads, one run per profile per weekday, profiles 4 hours apart.

## Security reviews
{: #security-reviews }

Re-check on every MCP server upgrade (the tool allow-list), every model change (re-run the evaluation for
fabrication rates), and every change to `auth.py` or `truthfulness.py`. Twice a year, a prompt-injection
test: a posting that tells the model to add a certification I don't have must get flagged.

## Architecture reviews
{: #architecture-reviews }

Questions for the next review: should the scheduler move out of the process (a Kubernetes CronJob per
profile would survive restarts, but needs the browser session shared)? Should tracing be exported? Is
Supabase still the right store, or would Postgres on the platform be simpler now that everything else is
local? None is urgent.

## Roadmap refinement
{: #roadmap-refinement }

Phase 4 candidates, roughly in order: pacing between LinkedIn requests inside a run; OTLP export; a
Slack message when the LinkedIn session expires; storing accepted warnings; interview outcomes on
applications; a data retention job; real ADR files. Each gets a row in the
[phase tables](/posts/projects/job-hunter-agent/03-product-planning/#product-roadmap) before it's built.

## Decommissioning and end-of-life planning
{: #decommissioning-and-end-of-life-planning }

This project has a happy ending built in: once I've found a role, it should stop.

1. Turn every profile off (stops all LinkedIn traffic at once).
2. Export approved and applied applications from Supabase for my own records.
3. Delete the LinkedIn session from the volume and sign out of all LinkedIn sessions.
4. Delete the Argo CD application and the `kv/platform/job-hunter` secrets; remove the Keycloak client.
5. Delete or pause the Supabase project.
6. Archive the repo, and keep this playbook as the record.

## Checklist
{: #checklist }

- [ ] Monthly look at the analytics questions
- [ ] Interview outcomes recorded on applications
- [ ] Monthly reliability review of the run history
- [ ] Prompt-injection test twice a year
- [ ] Phase 4 rows written before work starts
- [ ] Decommissioning steps kept current

{% include project-nav.html %}
