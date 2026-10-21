---
layout: post
title: "Dunderly HR System: Governance and Compliance"
date: 2026-10-07 00:17:00 +0530
categories: [projects, dunderly]
tags: [Projects, Dunderly, Governance, Compliance]
description: "Dunderly HR governance: a small steering group, ADRs for decisions, quarterly access reviews of who sees salaries, Azure Policy guardrails and evidence that collects itself."
project: dunderly
project_step: 17
image:
  path: /assets/img/projects/dunderly/17-governance-and-compliance.webp
  alt: "Dunderly HR System: Governance and Compliance - Projects hero image"
---

Governance for a 250-person company's HR system should fit on a page, and most of it should run without
anyone remembering to do it. The two questions an auditor, a regulator or an unhappy employee will ask are
"who can see salaries?" and "who approved this change?". If the system answers both instantly, with
evidence, most of the governance work is already done.

<!-- more -->

{% include project-nav.html %}

## Project governance
{: #project-governance }

| Forum | Who | When | Decides |
|---|---|---|---|
| Steering group | Sponsor, HR manager, IT lead, architect | Every 2 weeks during build; quarterly after | Scope, budget, go-live, risk acceptance |
| Sprint review | Team + HR product owner (+ HR users) | Every sprint | Accept stories; reprioritize backlog |
| Architecture review | Architect + dev lead (+ IT for integration changes) | Monthly during build; quarterly after | ADRs |
| Change advisory (light) | Product owner + architect | As needed | Payroll-impacting releases |

The steering group gets a one-page status every two weeks: progress against milestones, top risks, decisions
needed, budget. Red items come with a proposed decision, not just a problem.

## Decision-making and approval authorities
{: #decision-making-and-approval-authorities }

| Decision | Who decides | Who's consulted |
|---|---|---|
| Scope and MVP changes | Sponsor | HR manager, architect |
| Business rules (salary, leave, payroll) | HR manager | Payroll operator, legal |
| Architecture and technology | Architect (via ADR) | Dev lead, IT |
| Payroll file format | Payment system owner + payroll operator | Architect |
| Production release | Tech lead / architect | Product owner; payroll operator if `risk:payroll` |
| Access to salary data (role assignments) | HR manager | IT |
| Risk acceptance | Sponsor | Architect, DPO |
| Go-live | Sponsor | Steering group |

Architecture decisions are written as ADRs in `docs/adr/` (see the
[ADR list](/posts/projects/dunderly/05-technical-architecture/#architectural-decision-records)). An ADR is
never edited after acceptance; a new one supersedes it. That's how the 2023 decisions and the modernized
ones can both stay visible, with the reasoning for each change.

## Audit requirements
{: #audit-requirements }

What has to be provable, and how:

| Requirement | Evidence |
|---|---|
| Every salary change was requested and approved by different people | `SalaryRequest` with `RequestedBy` ≠ `DecidedBy`, plus audit events |
| Every payroll run was prepared and approved by different people | `PayrollRun` prepared/approved fields; audit events |
| What was paid matches what was approved | Run snapshot + file SHA-256 + receipt |
| Who accessed or changed an employee's data | Audit events; SQL auditing for direct access |
| Who had access to salary data at any time | Entra ID group membership history + access review records |

> **TODO:** Does Dunderly have an external auditor who'll examine payroll controls (for example as part of
> the annual financial audit)? If so, share this table with them before go-live; they may want more.
{: .prompt-warning }

## Access reviews
{: #access-reviews }

Quarterly **Entra ID access reviews** on the groups that grant sensitive roles (`HR.Manager`, `HR.Admin`,
`Payroll.Operator`, `Auditor`), reviewed by the HR manager, with "deny if no response" so forgotten access
expires. Manager access needs no review: it's derived from the reporting line in the HR data, so it changes
when the org chart does.

Azure access (who can touch production resources) is reviewed the same way, and admin roles are
PIM-eligible rather than permanent. See [Access Reviews](/posts/iam/entraid/access-reviews/) and
[PIM](/posts/iam/entraid/privileged-identity-management/).

> **Assumption:** Dunderly has Entra ID P2 (or Entra ID Governance) for access reviews and PIM. Without it,
> the review is a manual quarterly export of group members, signed off by the HR manager.
{: .prompt-info }

## License management
{: #license-management }

Two kinds of licenses:

- **Software dependencies.** The dependency review action blocks copyleft licenses that would conflict with
  a closed-source internal app (GPL family) unless approved. Today's stack is MIT and Apache 2.0.
- **Microsoft licensing.** Entra ID P1 for Conditional Access (P2 for access reviews and PIM), and the Azure
  support plan. These are often already in a Microsoft 365 E3/E5 agreement; check before buying.

Fluent UI Blazor, EF Core, ASP.NET Core and the Azure SDKs are MIT licensed. Playwright, xUnit and k6 are
build-time only.

## Compliance reporting
{: #compliance-reporting }

A quarterly one-pager for the steering group and the DPO, mostly generated by queries:

- Salary changes in the quarter: count, all with four-eyes approval (yes/no).
- Payroll runs: all delivered on time, all receipts present.
- Access review completion and removals.
- Security: open findings by severity vs remediation SLA; Defender secure score.
- Privacy: subject access requests handled and time taken; retention purges run.
- Incidents and their reviews.

## Data governance
{: #data-governance }

HR is the data owner; the HR manager is the named owner for salary and payroll data. Practical rules:

- The HR system is the **source of truth** for employee, reporting line, salary and leave. Other systems
  read from it, never the other way round.
- Classification per data set (see [Data ownership](/posts/projects/dunderly/07-data-and-integration/#data-ownership-and-classification))
  decides where data may appear.
- Retention is enforced by the monthly job, and its runs are logged as evidence.
- Any new use of HR data (a report for finance, a feed to another system) needs the HR manager's and the
  DPO's approval, recorded as a change note.

## Vendor and third-party management
{: #vendor-and-third-party-management }

The third parties are few:

| Vendor | Role | Assurance |
|---|---|---|
| Microsoft (Azure, Entra ID, M365) | Hosting, identity | Microsoft's DPA and compliance reports (ISO 27001, SOC 2) via the Service Trust Portal |
| GitHub (Microsoft) | Source code, CI | Same; no HR data in GitHub, ever |
| Legacy payment system | Internal, but a separate owner | An internal interface agreement: file format, schedule, receipt, contacts |

The interface agreement with the payment system's owner is the one that matters most, because they're not
under the app team's control. It's written down, versioned with the file format doc, and reviewed whenever
either side changes.

## Policy enforcement
{: #policy-enforcement }

Guardrails as code, so they hold without anyone checking:

- **Azure Policy** on the HR subscription or resource groups: allowed regions (West Europe, North Europe),
  deny public network access on SQL and Key Vault, require TLS 1.2, require diagnostic settings, require
  tags, deny storage accounts with shared key access.
- **Branch protection and CODEOWNERS** for code and payroll review rules.
- **GitHub environment rules** for production deployments.
- **Conditional Access** for MFA and device compliance.
- **Database permissions**: append-only audit table; DDL only for the pipeline identity.

Policies start in `audit` mode in dev, then `deny` everywhere once nothing violates them.

## Evidence collection
{: #evidence-collection }

Evidence should collect itself:

| Evidence | Source | Kept |
|---|---|---|
| Approvals of salary and payroll | SQL audit events | With the HR record |
| Releases and who approved them | GitHub deployment history | GitHub retention + release notes |
| Code review | PR history | Repo |
| Access reviews | Entra ID access review history | Exported quarterly |
| Policy compliance | Azure Policy compliance state | Exported quarterly |
| Restore and DR tests | Runbook "last tested" entries + test notes | Repo |
| Pen test and remediation | Report + issues | Restricted folder |

Quarterly, a scheduled workflow exports the non-repo evidence into a restricted storage container with an
immutability policy, so the evidence for a quarter can't be edited afterwards.

## Checklist
{: #checklist }

- [ ] Set up the steering group and its two-weekly one-pager.
- [ ] Agree the decision table with the sponsor.
- [ ] Confirm Entra ID P1/P2 licensing for Conditional Access, access reviews and PIM.
- [ ] Create the quarterly access reviews for sensitive role groups.
- [ ] Assign the Azure Policy initiative, audit first then deny.
- [ ] Write the interface agreement with the payment system's owner.
- [ ] Ask whether an external auditor will examine payroll controls.

{% include project-nav.html %}
