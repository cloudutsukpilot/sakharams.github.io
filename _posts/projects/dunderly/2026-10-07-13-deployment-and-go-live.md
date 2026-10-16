---
layout: post
title: "Dunderly HR System: Deployment and Go-Live"
date: 2026-10-07 00:13:00 +0530
categories: [projects, dunderly]
tags: [Projects, Dunderly, Deployment, GoLive]
description: "Dunderly HR go-live: readiness review, a weekend cutover from spreadsheets, reconciliation, HR-first rollout and a rollback that loses nothing."
project: dunderly
project_step: 13
image:
  path: /assets/img/projects/dunderly/13-deployment-and-go-live.webp
  alt: "Dunderly HR System: Deployment and Go-Live - Projects hero image"
---

Going live with an HR system has one hard constraint that most launches don't: you can't pick just any
week, because a payroll cutoff is always coming. Dunderly's cutover is planned backwards from that date,
lands on a weekend right after a payday, and keeps the old records frozen but intact, so "roll back" means
"unfreeze the spreadsheets" rather than "restore and pray".

<!-- more -->

{% include project-nav.html %}

## Production readiness review
{: #production-readiness-review }

A one-hour review two weeks before go-live, with the architect, the dev lead, the QA/DevOps engineer, the
HR manager and IT. Each item has evidence, not a "yes":

| Area | Evidence |
|---|---|
| Functionality | UAT sign-off; parallel payroll month reconciled |
| Security | Pen test report with fixes verified; DPIA signed; Conditional Access live |
| Reliability | Restore test done (SQL PITR and a deleted Blob version); DR runbook rehearsed in test |
| Observability | Dashboards built; every alert fired at least once in test and reached the right people |
| Operations | Runbooks for payroll run, restore, access requests, incident; on-call rota set |
| Data | Final migration rehearsal reconciled with zero unexplained differences |
| Support | HR service desk trained; KB articles published |
| Cost | Budget and alert configured |

Anything red either gets fixed or gets an explicit, signed risk acceptance from the sponsor.

## Go-live checklist
{: #go-live-checklist }

The week before:

- [ ] Production infrastructure deployed and what-if clean.
- [ ] App roles assigned to the right Entra groups; HR manager and payroll roles double-checked.
- [ ] Production pickup agent installed on the payment server, test file pulled and verified.
- [ ] Custom domains and certificates live.
- [ ] Communications sent (see below).
- [ ] Cutover team and times confirmed, phone numbers shared.

On the day, the [deployment runbook](#deployment-runbook) and the [cutover plan](#cutover-and-rollback-plan)
drive everything.

## Deployment runbook
{: #deployment-runbook }

The application itself is deployed days earlier through the normal pipeline (it's empty and harmless until
data arrives). The runbook covers the cutover weekend:

| Time (Sat) | Step | Owner | Done when |
|---|---|---|---|
| 08:00 | Freeze old records (read-only share, spreadsheet protection) | IT | Write test fails |
| 08:30 | Final extract + document manifest | Dev lead | Files and manifest in the secure transfer location |
| 09:30 | Run migration tool against prod | Dev lead | Tool exit code 0, rejects file empty or explained |
| 12:00 | Reconciliation report | QA | All checks green |
| 13:00 | Smoke tests + HR spot-check of named employees | QA + HR | Signed checklist |
| 15:00 | Go/no-go call | Sponsor | Decision recorded |
| 15:30 | Enable HR role access | IT | HR can sign in |

> **TODO:** Who from HR is available on the cutover Saturday for the spot-check and the go/no-go? The plan
> doesn't work without them.
{: .prompt-warning }

## Data migration plan
{: #data-migration-plan }

The tool and its reconciliation are described in [Data migration and reconciliation](/posts/projects/dunderly/07-data-and-integration/#data-migration-and-reconciliation).
The plan around it:

1. **Rehearsal 1** (week 13): on a copy of real data in the locked-down rehearsal environment. Expect
   rejects; HR fixes them at source.
2. **Rehearsal 2** (week 14): fewer rejects; time the run.
3. **Rehearsal 3** (week 15): a full dress rehearsal with the runbook times. Must reconcile cleanly.
4. **Cutover:** the same tool, the same steps, on production.

Each rehearsal environment is deleted afterwards, because it held real HR data.

What isn't migrated: email approvals from the old process (archived as a PDF per employee into their
documents, so the history isn't lost), and anything past its retention period, which is a good moment to
let go of it.

## Smoke tests
{: #smoke-tests }

Automated smoke tests (the same suite as every release) plus a manual cutover set:

- Sign in as each role; each sees the right menu and nothing more.
- Open 20 named employees chosen by HR; compare salary, leave balance and documents with the source.
- Download two documents of each type.
- Create and cancel a test leave request; raise and withdraw a test salary request (then delete the
  audit noise in agreement with HR, or leave it as evidence, but decide beforehand).
- Run a **payroll dry run** for the coming month: draft only, compare totals with the expected figure from
  the old process.

## Monitoring and alert validation
{: #monitoring-and-alert-validation }

"We have alerts" isn't the same as "the alerts work". Before go-live, every alert in the
[alert catalogue](/posts/projects/dunderly/14-operations-and-observability/#alerting-and-escalation) is
triggered on purpose in test, and someone confirms the notification arrived, in the right channel, with
enough context to act:

| Alert | How it's triggered in test |
|---|---|
| API 5xx rate | A test endpoint that throws, called in a loop |
| Availability test failing | Stop the test App Service |
| Payroll receipt missing | Approve a test run and don't run the agent |
| Payroll file not written | Put a poison message on the queue |
| Document stuck in scan | Upload with the scanner disabled |
| Budget threshold | Temporary low budget |

## Support team readiness
{: #support-team-readiness }

- HR service desk (L1) trained in a 90-minute session: common tasks, access requests, how to find the
  correlation ID, when to escalate.
- Ten KB articles live before go-live: sign in, book leave, request a salary change, upload a document,
  what "pending scan" means, and so on.
- App team (L2) on an extended rota for the first two weeks, including the first payroll run.
- Escalation path documented (see [Support model](/posts/projects/dunderly/16-support-and-maintenance/#support-model-and-ownership)).

## User and stakeholder communications
{: #user-and-stakeholder-communications }

| When | Audience | Message | Channel |
|---|---|---|---|
| T-3 weeks | All staff | What's coming, why, when; no action needed | Email from the sponsor |
| T-1 week | Managers | How to approve leave and raise salary requests; training link | Email + 30-min session |
| T-2 days | HR | Cutover timing, freeze, who to call | Teams + calendar |
| Go-live (HR) | HR | It's live for you; report issues here | Teams |
| Week 2 | All staff | You can now sign in at `hr.<company domain>`; how to book leave | Email + intranet |
| Week 4 | Sponsor | First payroll run report; KPIs started | Email |

Messages are short and say what the reader has to *do*, if anything.

## Cutover and rollback plan
{: #cutover-and-rollback-plan }

The cutover, with its rollback path. Tick the box to see a no-go:

{% include flow-anim.html id="projects/dunderly/go-live-cutover" %}

The rollback is cheap because of two rules: the old records are **frozen, never deleted or altered**, and
nothing in the new system writes back to them. A no-go means unfreezing them, and the next attempt starts
from a fresh extract.

Timing: the cutover weekend falls right after a payday, giving almost a full month before the first live
payroll cutoff. The first payroll in the new system then runs with the old process in parallel one last time.

The point of no return is the first live payroll file. After that, rolling back means re-keying a month of
changes into the old records, so the go/no-go criteria have to be met before then, not hoped for.

## Launch decision and sign-off
{: #launch-decision-and-sign-off }

The go/no-go is a short meeting against written criteria:

- [ ] Reconciliation: zero unexplained differences.
- [ ] No open Sev-1 or Sev-2 defects.
- [ ] HR spot-check passed.
- [ ] Payroll dry run totals match the expectation.
- [ ] Support ready; rollback understood by everyone in the room.

Decision makers: the sponsor (final say), the HR manager, IT and the architect. The decision and any
accepted risks are recorded in `docs/changes/go-live.md` and emailed to the attendees.

> **TODO:** Confirm the sponsor's name (see [Stakeholders](/posts/projects/dunderly/01-vision-and-business-context/#stakeholders-sponsors-and-decision-makers))
> and that they'll attend the go/no-go in person or on a call.
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] Hold the production readiness review two weeks out.
- [ ] Complete three migration rehearsals; the third must reconcile cleanly.
- [ ] Fire every alert in test and confirm delivery.
- [ ] Train the HR service desk and publish the KB articles.
- [ ] Send the communications on the schedule above.
- [ ] Pick a cutover weekend right after a payday.
- [ ] Record the go/no-go decision and accepted risks.

{% include project-nav.html %}
