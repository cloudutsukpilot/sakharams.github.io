---
layout: post
title: "Dunderly HR System: Support and Maintenance"
date: 2026-10-07 00:16:00 +0530
categories: [projects, dunderly]
tags: [Projects, Dunderly, Support, Maintenance]
description: "Dunderly HR support: HR service desk first, a business-hours app team rota, payroll-week cover, weekly patching, quarterly restore tests and a yearly DR drill."
project: dunderly
project_step: 16
image:
  path: /assets/img/projects/dunderly/16-support-and-maintenance.webp
  alt: "Dunderly HR System: Support and Maintenance - Projects hero image"
---

After go-live, the four-person build team shrinks to a fraction of one developer's week. That's normal for
a system this size, and it shapes everything here: support has to be mostly self-service and HR-run,
maintenance has to be small and routine, and the one time the system needs full attention, payroll week,
is planned for in advance rather than discovered on payday.

<!-- more -->

{% include project-nav.html %}

## Support model and ownership
{: #support-model-and-ownership }

| Level | Who | Handles | Hours |
|---|---|---|---|
| L0 | Self-service | User guides, KB, in-app help | Always |
| L1 | HR service desk (HR operations) | How-to, access requests, data corrections within their role | Business hours |
| L2 | App team (developers on a rota) | Defects, outages, payroll run issues | Business hours; payroll-week cover |
| L3 | Microsoft (Azure support plan) | Platform faults in App Service, SQL, Storage, Entra ID | Per plan |
| — | Legacy payment system owner (IT) | Anything after the file reaches the input folder | Their hours |

**Ownership:** HR owns the data and the process; the app team owns the application and its Azure
resources; IT owns the payment system, the server farm and the network path. The boundary between the
app team and IT is the input folder: the receipt says the file got there.

> **Assumption:** After go-live, the app team is one developer at roughly 20% plus the architect on call
> for escalations, and Dunderly has (or buys) an Azure support plan.
{: .prompt-info }

> **TODO:** Which Azure support plan does Dunderly have? Basic has no technical support; a Developer or
> Standard plan is needed for L3 to exist.
{: .prompt-warning }

## Service-level objectives
{: #service-level-objectives }

The technical SLOs are in [Availability and performance targets](/posts/projects/dunderly/14-operations-and-observability/#availability-and-performance-targets).
The support targets:

| Severity | Example | Response | Resolve or workaround |
|---|---|---|---|
| Sev 1 | Payroll file not delivered in payroll week; data breach | 30 min (business hours) | Before the payroll deadline |
| Sev 2 | System down; nobody can approve | 2 hours | 1 business day |
| Sev 3 | A feature broken for some users | 1 business day | 1 week |
| Sev 4 | Cosmetic, how-to | 2 business days | Next release |

These are proposals. They're only real once the sponsor agrees, and once someone is actually rostered to meet them.

## Incident response
{: #incident-response }

How a ticket travels. Tick the box to see the more common case, a how-to question:

{% include flow-anim.html id="projects/dunderly/support-escalation" %}

For Sev 1 and Sev 2 incidents:

1. **Declare.** One person is incident lead; a Teams channel is the single place for updates.
2. **Contain.** Stop the harm: pause the payroll Function, disable a feature flag, swap back a release.
3. **Diagnose.** Correlation ID → trace in Application Insights → logs.
4. **Recover.** Fix forward or roll back (see [rollback](/posts/projects/dunderly/12-cicd-and-release-management/#rollback-and-roll-forward-procedures)).
5. **Communicate.** HR every hour for Sev 1; affected users when resolved.
6. **Review** within a week: blameless, timeline, contributing factors, actions with owners.

Security incidents add the privacy steps in [Security testing and incident response](/posts/projects/dunderly/06-security-and-privacy/#security-testing-and-incident-response).

## Bug triage
{: #bug-triage }

Weekly, 20 minutes, the developer on rota plus the HR product owner:

- New bugs get a severity, a label (`area:salary`, `risk:payroll`) and a decision: fix now, schedule, or
  won't fix (with a reason written down).
- Anything with `risk:payroll` is fixed before the next payroll cutoff or explicitly accepted by the
  payroll operator.
- Bugs that came from a missing test get a test with the fix.

## Patch and upgrade management
{: #patch-and-upgrade-management }

PaaS removes most patching, but not all:

| What | Who | Cadence |
|---|---|---|
| OS, web server, SQL engine | Microsoft (PaaS) | Continuous |
| .NET runtime patch versions on App Service and Functions | Platform, with our runtime version setting | Monthly; verified in test first |
| .NET major (LTS to LTS) | App team | Every 2 to 3 years, planned like a feature |
| Pickup agent host OS | IT (it's their server) | Their patch window, not in payroll week |
| AzCopy and the agent itself | App team | Quarterly |

> **TODO:** When is the payment server's patch window? It must not collide with the payroll pickup window.
{: .prompt-warning }

## Dependency updates
{: #dependency-updates }

Dependabot opens grouped PRs weekly. The rota developer merges them if CI is green, after a quick look at
release notes for anything in the payroll or auth path. Major version bumps (EF Core, Fluent UI) get their
own story. The goal is to never be more than one month behind, because small updates are cheap and a
two-year jump is a project.

## Security remediation
{: #security-remediation }

| Finding severity | Fix within | Source |
|---|---|---|
| Critical | 7 days (or mitigate immediately) | Dependabot, CodeQL, Defender, pen test |
| High | 30 days | Same |
| Medium | 90 days | Same |
| Low | Next convenient release | Same |

Exceptions are written down with a reason and an expiry date. Defender for Cloud's secure score is
reviewed monthly; new recommendations are either fixed or dismissed with a reason.

## Performance optimization
{: #performance-optimization }

Driven by data, not hunches. Each month, look at the slowest endpoints (p95) and the top SQL queries by
duration in Query Store. Typical fixes at this scale: a missing index, an N+1 in an EF Core query
(`Include` or a projection), a report that should be a view. If p95 stays under the SLO, the right
amount of optimization is none.

## Backup verification
{: #backup-verification }

Backups exist automatically (see [Backup and restore](/posts/projects/dunderly/07-data-and-integration/#backup-and-restore-strategy));
what needs doing is proving they restore:

- **Quarterly:** restore the prod SQL database to a point in time into an isolated resource group, run a
  row-count and checksum script against known tables, then delete it.
- **Quarterly:** restore a deleted document version from Blob soft delete.
- **Yearly:** read back a past payroll file and verify its hash against the run record.

Results go into `docs/runbooks/restore-sql.md` as "last tested", along with how long it took. That number is
the real RTO.

## Disaster recovery testing
{: #disaster-recovery-testing }

Once a year, outside payroll week: rebuild the system in North Europe from Bicep, geo-restore SQL, point a
test DNS name at it, and have HR check that it works. Measure the time from "start" to "HR can sign in"
against the one-business-day RTO (assumption A7). Then tear it down.

The first DR test usually finds a missing role assignment or a hard-coded region. Finding it in a drill is
the point.

## Technical debt management
{: #technical-debt-management }

The debt list from [Implementation](/posts/projects/dunderly/09-implementation/#technical-debt-tracking)
carries over, with two rules for the maintenance phase:

- About 20% of maintenance time goes to debt and dependency hygiene, not just to tickets.
- Every debt item has a trigger ("fix when the app is exposed beyond employees"); at each quarterly review,
  check whether any trigger has fired.

Feature flags past their rollout date count as debt and are removed first: they're cheap to remove and
confusing to keep.

## Checklist
{: #checklist }

- [ ] Agree the support model and severities with HR and IT.
- [ ] Confirm the Azure support plan.
- [ ] Set up the L2 rota, including payroll-week cover.
- [ ] Agree the payment server's patch window.
- [ ] Schedule quarterly restore tests and the yearly DR test.
- [ ] Set up the weekly bug triage and Dependabot routine.
- [ ] Record security remediation SLAs and the exception process.

{% include project-nav.html %}
