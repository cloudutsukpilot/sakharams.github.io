---
layout: post
title: "Dunderly HR System: Continuous Improvement"
date: 2026-10-07 00:18:00 +0530
categories: [projects, dunderly]
tags: [Projects, Dunderly, Improvement]
description: "Dunderly HR after go-live: measure what HR and staff actually use, review cost against the 2023 baseline, revisit the no-WAF decision, and plan the end of life."
project: dunderly
project_step: 18
image:
  path: /assets/img/projects/dunderly/18-continuous-improvement.webp
  alt: "Dunderly HR System: Continuous Improvement - Projects hero image"
---

Small internal systems rarely fail with a bang. They fade: a workaround here, a spreadsheet next to it
there, until HR is back to email approvals with a web app nobody trusts. Continuous improvement for
Dunderly's HR system is mostly about catching that drift early, with a few numbers, a few conversations,
and the discipline to revisit the decisions made in 2023 and again in this playbook.

<!-- more -->

{% include project-nav.html %}

## Product analytics
{: #product-analytics }

Measure behaviour that maps to the [KPIs](/posts/projects/dunderly/01-vision-and-business-context/#success-metrics-and-business-kpis),
using the telemetry already collected, with no third-party analytics tool:

| Question | Signal |
|---|---|
| Do employees self-serve? | Leave balance views per month vs HR leave-related tickets |
| Do managers use the workflow? | Salary and leave requests created in-app vs raised by HR on someone's behalf |
| Is payroll getting easier? | Time from draft to approved run, per month |
| Where do people get stuck? | Validation errors and abandoned forms by page |

Page views and feature usage come from Application Insights (with user IDs pseudonymized). Business counts
come from SQL views. Monthly, a short summary goes to the HR product owner.

If HR wants richer reporting later, a Power BI dataset with row-level security over reporting views is
the natural step, as noted in [Reporting requirements](/posts/projects/dunderly/02-requirements-gathering/#reporting-and-analytics-requirements).

## User feedback
{: #user-feedback }

- An in-app "Feedback" link next to "Help", which creates a GitHub issue (via a small API endpoint, without
  personal data) labelled `feedback`.
- A two-question survey to all staff three months after go-live: "How easy is it to do what you came to do?"
  (1 to 5) and "What's the one thing you'd change?".
- A 30-minute conversation with HR every quarter. Five people who use the system daily know more than any
  dashboard.

Feedback is triaged in the weekly [bug triage](/posts/projects/dunderly/16-support-and-maintenance/#bug-triage);
feature ideas go to the backlog with the requester's name so they hear back.

## Retrospectives
{: #retrospectives }

During the build, every sprint. After go-live, three specific ones:

1. **After the first live payroll run**, with the payroll operator and HR manager: what was slow, confusing
   or scary.
2. **After 90 days**, against the KPIs and the original assumptions (A1 to A7): which held, which didn't.
3. **After each Sev-1 or Sev-2 incident**, the blameless review.

Format: what went well, what didn't, what we'll try. Each "try" becomes an issue with an owner, or it
didn't happen.

## Reliability reviews
{: #reliability-reviews }

Monthly, 30 minutes, with the dashboards from [Operations](/posts/projects/dunderly/14-operations-and-observability/#metrics-and-dashboards):

- SLOs: met or not, and error budget left.
- Payroll SLO: this month's run timeline, end to end.
- Alerts: which fired, which were noise (tune or delete them), any incident detected by a user instead of
  an alert (add one).
- Top failures and slowest endpoints.

A reliability review that finds nothing for three months in a row can move to quarterly.

## Cost optimization
{: #cost-optimization }

The 2023 estimate ($848.07 a month) is the baseline to beat (see [Budget](/posts/projects/dunderly/03-product-planning/#budget-and-resource-planning)).
Quarterly, check:

- **SQL serverless:** actual vCore use. If it's flat and predictable, provisioned compute with a reservation
  may be cheaper; if it's spiky and low, serverless is right.
- **App Service plan:** if it never scales out, could a smaller tier work? (Keep slots and VNet integration.)
- **Log Analytics ingestion:** the line that grows quietly. Trim noisy logs.
- **Storage tiers:** documents older than 180 days move to cool by lifecycle policy; check it's running.
- **Dev and test:** auto-pause on, nothing oversized left running.
- **Reservations and savings plans** once usage is stable for six months.

## Security reviews
{: #security-reviews }

- **Quarterly:** Defender for Cloud recommendations, access review results, open findings vs SLAs.
- **Yearly:** threat model refresh (the STRIDE table in [Threat modeling](/posts/projects/dunderly/06-security-and-privacy/#threat-modeling)),
  and a penetration test if the system changed meaningfully.
- **On triggers:** a new integration, exposure beyond employees, or a new data type (bank details, health
  data) means a fresh threat model and DPIA update.

The no-WAF decision ([ADR-004](/posts/projects/dunderly/05-technical-architecture/#architectural-decision-records))
is checked at every yearly review against its "revisit when" conditions.

## Architecture reviews
{: #architecture-reviews }

Quarterly after go-live. Standing questions:

1. Are the ADRs still true? Any whose context has changed?
2. Is the modular monolith still the right shape? (Signals to split a module: separate team, separate
   release cadence, separate scaling need. None is expected at Dunderly's size.)
3. Has any assumption from the playbook been proven wrong?
4. Is anything approaching end of support (.NET LTS, SDK versions, Azure service retirements)?
5. What would we do differently if we started today?

The output is either "no change" (fine, and worth recording) or new or superseding ADRs. Reviews use the
[Azure Well-Architected Framework](/posts/cloud/azure/architect/azure-well-architected-framework/) pillars
as a checklist.

## Roadmap refinement
{: #roadmap-refinement }

Every quarter, the steering group re-orders the [roadmap](/posts/projects/dunderly/03-product-planning/#product-roadmap)
with what's been learned. Likely candidates, in my order of value:

1. **HR-driven Entra ID provisioning** (joiner, mover, leaver): closes the "leaver still has access" gap.
2. **Leave approval and self-service**, if not already shipped.
3. **Teams notifications and approvals** (adaptive cards): faster decisions without opening the app.
4. **E-signature** for contracts, so documents arrive signed and digital instead of scanned.
5. **Reporting dataset** for Power BI.

Anything touching payroll calculation stays out unless the legacy payment system is being replaced, which
would be its own project.

## Decommissioning and end-of-life planning
{: #decommissioning-and-end-of-life-planning }

Two end-of-life events to plan for:

**The old records (soon after go-live).** Spreadsheets and the old file share stay read-only for a fixed
period after go-live, then are archived (or deleted where retention allows) with the DPO's approval. Keeping
them forever means keeping a second, uncontrolled copy of salary data.

**The legacy payment system (some day).** It's C++, file-only and on-premises; it won't last forever. When
it's replaced, the payroll integration is the only part of this system that changes: the run, snapshot and
approval stay, and the file writer and pickup agent are replaced by whatever the new system accepts. That
isolation is deliberate.

**This system (eventually).** If Dunderly moves to a SaaS HR suite, the exit plan is: export everything via
the API and SQL (no proprietary formats), keep the audit trail and documents for their retention periods in
an archive storage account, then delete the Azure resources with Bicep. Nothing here locks the data in.

## Checklist
{: #checklist }

- [ ] Build the monthly usage summary for the HR product owner.
- [ ] Add the in-app feedback link and schedule the 3-month survey.
- [ ] Book the three post-go-live retrospectives.
- [ ] Start monthly reliability reviews and quarterly cost checks.
- [ ] Put ADR-004's "revisit when" conditions on the yearly security review agenda.
- [ ] Set the archive date for the old HR records with the DPO.
- [ ] Re-order the roadmap at the first quarterly steering group after go-live.

{% include project-nav.html %}
