---
layout: post
title: "Productivity Dashboard: Continuous Improvement"
date: 2026-10-05 00:18:00 +0530
categories: [projects, productivity-dashboard]
tags: [Projects, Productivity Dashboard, Improvement]
description: "Improving the Productivity Dashboard: measuring time saved and accuracy, tuning prompts and models, cutting AI cost per summary, and fixing the architecture's sharp edges."
project: productivity-dashboard
project_step: 18
image:
  path: /assets/img/projects/productivity-dashboard/18-continuous-improvement.webp
  alt: "Productivity Dashboard: Continuous Improvement - Projects hero image"
---

The Productivity Dashboard is never finished in the way most dashboards are, because its core logic is
a set of prompts running on models that keep changing. The brief calls accuracy an ongoing process of
tuning prompts and models, and that's the right frame for the whole project: a loop of measuring what
the summaries get right and wrong, changing one thing, and measuring again. This last post sets up that
loop.

<!-- more -->

{% include project-nav.html %}

## Product analytics
{: #product-analytics }

What to measure, from the cheapest to the most useful:

- Readers per page type and role (from ingress logs, no tracking script needed).
- Refreshes per day: a high refresh rate on daily summaries means the data or schedule is late.
- Searches and their zero-result rate.
- "Flag this summary" reports per week: the most direct accuracy signal.
- **Time saved**: the project's reason to exist, measured with a short survey every quarter against
  the pre-launch baseline.

> **TODO:** Is any of this measured today? Even one quarter's survey on time saved would be the headline
> of this whole series.
{: .prompt-warning }

## User feedback
{: #user-feedback }

The people being summarized are the best reviewers of the output. Make it easy for them: a "flag this
summary" action with a short reason (missing work, wrong statement, wrong tone), routed to the prompt
owner. Managers' feedback on team and weekly summaries, and executives' on monthly ones, come through the
quarterly data-use review and sponsor check-ins.

## Retrospectives
{: #retrospectives }

| Went well | Would change | Try next |
|---|---|---|
| People, teams and PODs as configuration | Source and prompts duplicated in two folders | One source tree |
| Summaries of summaries keep prompts small | Paths keyed on team split history on moves | Stable person IDs |
| One AI client, free local development with LM Studio | Clock-based ordering of jobs | Completion markers and triggers |
| On-demand refresh from the UI | No retention rules for personal data | Pruning agreed with HR |
| Prompts versioned in images | Data scope drifted from intent (comments) | Data-scope page with a CI check |

With a team now maintaining it, a retrospective every few iterations keeps this table current.

## Reliability reviews
{: #reliability-reviews }

Monthly: coverage by team, generator failures and timeouts, AI throttling, refresh failures, and the
accuracy sample. A cause that appears twice gets a design fix. The most likely repeat offenders are
identity config errors and the team generator starting before user summaries are done.

## Cost optimization
{: #cost-optimization }

AI cost grows with headcount, so it's worth optimizing early:

- **Right model per level.** Daily summaries of structured data are a good fit for a smaller, cheaper
  model; monthly executive summaries may justify a larger one. `BaseAIClient` already makes the model
  a setting.
- **No AI for no-activity days.** Write a fixed summary instead.
- **Trim inputs.** Send only the fields each prompt uses.
- **Reuse.** Weekly summaries are regenerated every day of the week; generating them once at week end
  (with the daily view for the current week) cuts those calls by most of a week's worth.

> **TODO:** What does a summary cost today on average, and which generator uses the most tokens?
{: .prompt-warning }

## Security reviews
{: #security-reviews }

Yearly, and whenever the data scope changes: revisit the threat model in
[Security and Privacy](/posts/projects/productivity-dashboard/06-security-and-privacy/#threat-modeling),
re-test prompt injection with the current model, check that the UI's Role still only covers Jobs in its
namespace, and confirm the collectors collect no more than the data-use review approved.

## Architecture reviews
{: #architecture-reviews }

The changes I'd put on the table:

1. **Dependency-based scheduling.** Collectors write a completion marker; generators wait for it (the
   team generator's polling already does this for user summaries); or a small workflow engine runs the
   chain. This also settles which day the 06:00 collection covers.
2. **Stable person IDs** for per-person paths, with team as metadata, so team moves don't split history.
3. **One source tree** for collectors and generators, removing the duplicate under `productivity-tools/`
   or `prod-*/`.
4. **HA UI** with the HPA and PDB from
   [Operations and Observability](/posts/projects/productivity-dashboard/14-operations-and-observability/#capacity-and-cost-monitoring).
5. **A search index** rebuilt after the nightly run.
6. **Provenance in every summary**: generator version, model and generation time.

## Roadmap refinement
{: #roadmap-refinement }

The direction from the brief is clear: daily summaries for managers and stakeholders, weekly and
monthly for executives, and less manual status work for everyone. Refining the roadmap means deciding
which of these comes next, based on the analytics above:

- more teams and PODs;
- numeric trends next to the prose (PRs merged, tickets closed);
- pushing summaries to where people already are (a Teams message for the team's daily summary);
- better accuracy measurement before any new audience.

> **TODO:** What's the next priority after the current tuning work?
{: .prompt-warning }

## Decommissioning and end-of-life planning
{: #decommissioning-and-end-of-life-planning }

If the system is retired or replaced, the personal data is the part that needs a plan: keep summaries
that were used in reviews for as long as the review records require, delete everything else per the
retention rules, revoke the GitHub Apps and the Jira token, delete the Azure OpenAI deployment and the
Key Vault secrets, remove the ArgoCD apps and the DNS name, and tell the people who were summarized that
collection has stopped.

## Checklist
{: #checklist }

- [ ] Time saved measured quarterly against the pre-launch baseline
- [ ] "Flag this summary" reports routed to the prompt owner
- [ ] Retrospective table kept current
- [ ] Monthly reliability and accuracy review
- [ ] Model per summary level evaluated for cost
- [ ] Dependency-based scheduling, stable IDs and a single source tree on the roadmap
- [ ] Decommissioning plan covers personal data and notifying people

{% include project-nav.html %}
