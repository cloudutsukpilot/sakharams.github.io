---
published: false
layout: post
title: "OnePlatform: Continuous Improvement"
date: 2026-10-05 00:18:00 +0530
categories: [projects, oneplatform]
tags: [Projects, OnePlatform, Improvement, Roadmap]
description: "Improving OnePlatform: adoption data from its own telemetry, feedback that became features, reviews worth scheduling, the Backstage UI migration and what to retire."
project: oneplatform
project_step: 18
image:
  path: /assets/img/projects/oneplatform/18-continuous-improvement.webp
  alt: "OnePlatform: Continuous Improvement - Projects hero image"
---

OnePlatform measures other teams' DORA metrics, Copilot use and best-practice scores. The fair question is whether it measures itself as carefully. Partly: it has its own adoption telemetry and a written process for every change. Missing are the regular reviews that turn those signals into decisions. This last post covers both, and what comes next.

<!-- more -->

{% include project-nav.html %}

## Product analytics
{: #product-analytics }

Adoption Insights runs Kusto queries over the portal's own Application Insights telemetry and shows which pages and templates each role uses. The questions I'd ask of it every month:

- Which templates have runs, and which have had none for 90 days? (Candidates to retire.)
- Which roles log in, and which never do? (A role with no usage is either badly served or doesn't need the portal.)
- Where do template runs fail most? (The failure notifications give the reason.)
- Which dashboards are opened by people outside the team that asked for them? (Signs of value beyond the original request.)

> **TODO:** Share one real adoption number (monthly active users, or template runs per month) for this playbook, if you're comfortable publishing it anonymized.
{: .prompt-warning }

## User feedback
{: #user-feedback }

Feedback has shaped a lot of the catalog. A few features that came straight from user friction:

| The problem, as the feature's plan describes it | Became |
|---|---|
| Duplicate input across two similar Jira definition pages, and values lost on Back/Next | Jira definition cascade and navigation retention in file monitoring |
| Requesters couldn't see where their Copilot request stood | Copilot license self-service page with live status |
| One huge catalog write degraded the portal for everyone during Azure ingestion | Per-subscription ingestion |
| SQL Agent job visibility required SSMS access | Cross-server SQL Agent job dashboard |
| Gateway health lived in a standalone Streamlit script | API Management gateway dashboard |

What's missing is a channel that isn't a ticket. A feedback button in the portal header that creates a labelled ticket would catch the small annoyances people don't bother filing.

## Retrospectives
{: #retrospectives }

> **TODO:** Does the team run sprint retrospectives, and are there recurring themes worth sharing (for example, upgrade pain, review load, AI-assisted workflow lessons)?
{: .prompt-warning }

One retro-worthy lesson is already visible in the repo. The planning prompt moved unit tests into each implementation phase because tests written at the end missed details. That's a process change made from experience, written down where it's enforced.

## Reliability reviews
{: #reliability-reviews }

I'd add a monthly 30-minute reliability review: catalog provider failures by subscription, FOCUS import integrity results, template failure rate by template, middleware 5xx, and credential expiries in the next 60 days. Most of these need the metrics proposed in [Operations](/posts/projects/oneplatform/14-operations-and-observability/#metrics-and-dashboards) first.

## Cost optimization
{: #cost-optimization }

OnePlatform helps others cut cost (FinOps reports, short-lived server reports, Copilot budgets that managers can reallocate). For its own cost:

- Show its own Azure resources with cost trends on their catalog pages.
- Use the related-infrastructure cost view to see the portal's total footprint (AKS share, PostgreSQL, Functions, Application Insights).
- Watch Application Insights ingestion, usually the cost that grows quietly with auto-instrumentation.
- Review seat-based integrations (PATs and Apps tied to paid seats).

## Security reviews
{: #security-reviews }

Annual at minimum, and on any feature that touches PHI-adjacent data, approvals or production-capable templates: review the permission matrix against the 13 roles, the PHI rules, every external identity's scope, and the threat model in [Security](/posts/projects/oneplatform/06-security-and-privacy/#threat-modeling).

> **TODO:** When was the last security review of the portal, and who ran it?
{: .prompt-warning }

## Architecture reviews
{: #architecture-reviews }

The architecture model's change-impact rules give each structural change a mini review already. A quarterly review should look at the whole: plugin count and overlap (the build-decision guide's "extend, don't add" in practice), the portal/middleware boundary (is any portal plugin quietly becoming a data pipeline?), and the ADRs that need revisiting, such as catalog orphan strategy and the dual deployment path.

## Roadmap refinement
{: #roadmap-refinement }

What's visible as in progress or planned in the repos:

| Item | State |
|---|---|
| Migrate Copilot metrics off GitHub's legacy API | Plan in progress |
| Move frontend code from Material UI to Backstage UI | Plan written; internal source and dependency levels targeted first |
| Single GitOps path for staging and production | Promote workflows exist; direct deploy still maintained |
| Team owner management | Shipped; follow-up fixes ongoing |
| Related-infrastructure cost on entity pages | Shipped October 2026 |
| More HITL consumers beyond the SQL Blocking Agent | Contract v1 published |

Plus the gaps this playbook surfaced: SLOs and alerts, probes and resource limits, backup and DR tests, PHI filter tests, load tests, accessibility checks, and retention for evidence data.

> **TODO:** What's on the roadmap that isn't in the repos yet (new templates, new lines of business onboarding to the portal)?
{: .prompt-warning }

## Decommissioning and end-of-life planning
{: #decommissioning-and-end-of-life-planning }

The portal itself isn't going anywhere, but its parts should be retired deliberately:

- **Templates with no runs for 90 days**: confirm with the owner, then remove (keep the PLAN as history).
- **Superseded actions**: the v1 Copilot license action, once no v1 requests remain.
- **Legacy paths**: the direct AKS deploy workflow, once GitOps covers all environments.
- **Upstream retirements**: plan migrations when the vendor announces them, not when the API returns 410.

Retiring a feature follows the same feature lifecycle in reverse: a PLAN (who's affected, what replaces it), a broadcast notification, permission removed, code removed, catalog entry updated.

## Checklist
{: #checklist }

- [ ] Monthly adoption review with the four questions above
- [ ] In-portal feedback button that creates labelled tickets
- [ ] Monthly reliability review once the metrics exist
- [ ] Portal's own cost visible in its catalog and reviewed monthly
- [ ] Annual security review plus reviews for sensitive features
- [ ] Quarterly architecture review of plugin overlap and the portal/middleware boundary
- [ ] Unused templates retired after 90 days, with notice
- [ ] Backstage UI migration levels 1 and 2 scheduled

{% include project-nav.html %}
