---
layout: post
title: "Dunderly HR System: Product Planning"
date: 2026-10-07 00:03:00 +0530
categories: [projects, dunderly]
tags: [Projects, Dunderly, Planning, Roadmap]
description: "Dunderly HR roadmap, a 16-week MVP built around the payroll path, the 2023 cost baseline of $848 a month, and how the plan is allowed to change."
project: dunderly
project_step: 3
image:
  path: /assets/img/projects/dunderly/03-product-planning.webp
  alt: "Dunderly HR System: Product Planning - Projects hero image"
---

The 2023 design came with a cost estimate of $848.07 a month, and 41% of it was a web application
firewall in front of three APIs that ten people use. That one line is a good summary of what this plan is
about: ship the parts that carry money and personal data first and well, and stop paying for
infrastructure the risk doesn't justify.

<!-- more -->

{% include project-nav.html %}

## Product roadmap
{: #product-roadmap }

Three horizons, each with a theme rather than a feature list:

| Horizon | Theme | Contents |
|---|---|---|
| Now: MVP | Replace the spreadsheets and the hand-built payroll file | Employees and documents, salary requests and approval, leave entitlement and balances, monthly payroll file with receipt, audit, SSO |
| Next: 3 to 6 months after go-live | Self-service and polish | Leave request and approval (if not in MVP), employee self-service, Teams notifications, CSV reports, year-end leave carry-over |
| Later: 6 to 18 months | Integrate and automate | HR-driven provisioning of Entra ID accounts (joiner, mover, leaver), reporting dataset for Power BI with row-level security, e-signature for contracts, retention automation |

The "Later" provisioning item is the one with the biggest payoff. Once HR is the source of truth for who
works at Dunderly, it can create and disable Entra ID accounts, which closes the classic gap where a leaver
keeps their access for weeks.

## MVP definition
{: #mvp-definition }

The MVP is the smallest thing that lets HR switch off the spreadsheets **and** run one month of payroll
through the new system. Anything that doesn't serve those two outcomes waits.

**In the MVP:**

- Sign-in with Entra ID and MFA; roles for Employee, Manager, HR admin, HR manager, payroll operator, auditor.
- Employee records (create, edit, deactivate) and documents (upload with malware scan, download).
- Salary change request, approval and rejection, with effective-dated history.
- Leave entitlement set by HR, balances visible to employees, leave recorded by HR or the employee.
- Monthly payroll run: draft, review, approve, file, receipt, alert.
- Audit trail for every change; data migration from the old records.

**Not in the MVP:** leave approval by managers (a "should"), notifications beyond email, reports beyond
CSV exports.

The test for "MVP done" is concrete: one real month of payroll delivered from the new system, reconciled
against the old process run in parallel.

## Release milestones
{: #release-milestones }

> **Assumption:** A 16-week plan for the team in assumption A3, starting after requirements sign-off.
{: .prompt-info }

| Week | Milestone | Exit criteria |
|---|---|---|
| 0 to 2 | Foundations | Repo, CI, Bicep for dev, Entra app registrations, walking skeleton deployed |
| 3 to 6 | Employee core | Employee CRUD, documents with scanning, roles and audit, in test |
| 7 to 9 | Salary workflow | Request, approve, reject, history; BR-1 to BR-5 tested |
| 10 to 12 | Leave and payroll | Leave balances; payroll run and file generation; file accepted by the payment system in test |
| 13 to 14 | Migration and hardening | Dry-run migration reconciled; pen test; performance test; DR restore test |
| 15 | UAT and parallel run | HR signs off UAT; one payroll month run in parallel with the old process |
| 16 | Go-live | Production cutover (see [Go-Live](/posts/projects/dunderly/13-deployment-and-go-live/)) |

> **TODO:** When is the target go-live, and which payroll month should the parallel run use? Avoid a
> month with bonuses or year-end leave adjustments for the first live run.
{: .prompt-warning }

## Backlog structure
{: #backlog-structure }

I'd keep the backlog in GitHub Issues and Projects, next to the code, with three levels:

- **Epics**, one per capability: `Employees`, `Documents`, `Salary`, `Leave`, `Payroll`, `Identity`,
  `Audit`, `Migration`, `Platform`.
- **Stories**, each with Given/When/Then acceptance criteria and a link to the FR it serves
  (`FR-4`), so we can see coverage.
- **Tasks**, only when a story needs splitting across people.

Labels for `type:story|bug|debt|spike`, `area:<epic>` and `risk:payroll` (anything that can change what
someone is paid gets the label and an extra reviewer).

A "ready" story has acceptance criteria, any UI sketch, and the data it touches. A "done" story is merged,
deployed to test, has tests, and has its audit events in place.

## Prioritization approach
{: #prioritization-approach }

MoSCoW for scope (see [Requirements](/posts/projects/dunderly/02-requirements-gathering/#prioritization-and-release-scope)),
then a simple ordering rule inside each sprint:

1. Anything on the payroll path, ordered by how early it's needed for the first parallel run.
2. Security and audit items, because retrofitting them is expensive.
3. Everything else by HR's priority.

I'd avoid scoring frameworks like WSJF here. With one product owner and one team, a sorted list and a
weekly conversation work better than a spreadsheet of scores.

## Budget and resource planning
{: #budget-and-resource-planning }

The 2023 case study priced its design with the Azure pricing calculator:

![The 2023 Azure cost estimate for the original Dunderly design: $848.07 a month](/assets/img/projects/dunderly/2023-cost-estimate.png)
_The original 2023 estimate (West Europe; Static Web Apps in Central US)._

| 2023 line item | Monthly | Share |
|---|---|---|
| Application Gateway WAF v2 | $352.15 | 41.5% |
| Azure SQL GP Gen5, 3-year reserved | $256.63 | 30.3% |
| 3 × App Service S1 (Windows) | $219.00 | 25.8% |
| Azure Monitor | $10.57 | 1.2% |
| Static Web Apps Standard | $9.00 | 1.1% |
| Storage, 25 GB hot LRS | $0.71 | 0.1% |
| **Total** | **$848.07** | |

The modernized design changes the three biggest lines: no Application Gateway in v1 (see
[ADR-004](/posts/projects/dunderly/05-technical-architecture/#architectural-decision-records)), one App
Service plan instead of three, and Azure SQL serverless instead of provisioned. It adds small lines: Defender
for Storage malware scanning, private endpoints, Key Vault, a Functions app, and geo-redundant storage.

> **TODO:** Re-price the target design in the Azure pricing calculator for West Europe and record it here.
> I expect it well under the 2023 total, but that's an expectation, not a number.
{: .prompt-warning }

People cost dwarfs the cloud bill: the team in assumption A3 for 16 weeks, then about a fifth of one
developer for maintenance.

## Risk and dependency management
{: #risk-and-dependency-management }

| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Payment file spec unknown or undocumented | High | High | Get a sample file and spec in week 1; golden-file tests | Architect |
| Legacy system owner unavailable | Medium | High | Book their time for weeks 10 to 15 now | Sponsor |
| No network path from server farm to Azure | Medium | High | Confirm outbound HTTPS 443; fall back to VPN | IT |
| Migration data is messy | High | Medium | Dry runs from week 13; reconciliation report | Dev lead |
| HR unavailable for UAT at month end | Medium | Medium | Schedule UAT away from payroll week | Product owner |
| Scope creep into payroll calculation | Medium | High | Non-goal written into the charter | Sponsor |

Dependencies are tracked as issues with the `dependency` label and reviewed weekly. The first three risks
all point at one person, the legacy system's owner, which is why that meeting comes first.

## Change-control process
{: #change-control-process }

Light, because the team is small, but written down:

- **Inside a sprint:** the product owner can swap stories of similar size. No paperwork.
- **Scope change** (new requirement, or moving a "should" into the MVP): a one-paragraph change note
  in the repo (`docs/changes/`) with the impact on dates and cost, approved by the sponsor.
- **Anything touching payroll rules or the file format:** also needs the payroll operator's and the
  legacy system owner's agreement, because a mistake there is paid out.
- **Architecture changes:** a new or superseding ADR (see [Governance](/posts/projects/dunderly/17-governance-and-compliance/#decision-making-and-approval-authorities)).

## Checklist
{: #checklist }

- [ ] Agree the MVP definition and the "one parallel payroll month" exit test with the sponsor.
- [ ] Set the target go-live and the parallel-run month.
- [ ] Re-price the target design and record the monthly estimate.
- [ ] Create the epics and labels in GitHub Projects.
- [ ] Book the legacy system owner's time for integration and UAT weeks.
- [ ] Confirm outbound HTTPS from the server farm to Azure.
- [ ] Add the change-note template to the repo.

{% include project-nav.html %}
