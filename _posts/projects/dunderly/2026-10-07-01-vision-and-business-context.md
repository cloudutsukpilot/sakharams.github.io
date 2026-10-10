---
layout: post
title: "Dunderly HR System: Vision and Business Context"
date: 2026-10-07 00:01:00 +0530
categories: [projects, dunderly]
tags: [Projects, Dunderly, Vision, Business]
description: "Why Dunderly, a 250-person paper supplies company, needs its own HR system, who it serves, and how we'll know the payroll hand-off got safer."
project: dunderly
project_step: 1
image:
  path: /assets/img/projects/dunderly/01-vision-and-business-context.webp
  alt: "Dunderly HR System: Vision and Business Context - Projects hero image"
---

Dunderly sells printer paper and envelopes, not software, and that's the point of this project. It needs
an HR system that 250 people (500 within five years) can trust with their salary, their leave and their
signed contract, built by a small team on Azure and .NET, and cheap enough that nobody in finance asks
why an HR app costs more than a delivery van. The single riskiest moment in the whole system is once a
month, when a file goes to a legacy C++ payment system that can't tell us if anything went wrong.

<!-- more -->

{% include project-nav.html %}

> **How to read this playbook.** Dunderly is the company from my 2023 architecture case study. That study
> gave the requirements, the volumes and a first Azure design. Everything it didn't cover is filled in here
> as an *ideal scenario* for a company of this size: facts I had to invent are marked **Assumption**, and
> questions only a real client could answer are left as **TODO**.
{: .prompt-tip }

## Business problem and opportunity
{: #business-problem-and-opportunity }

Dunderly needs a new HR system for four jobs: managing employees, managing salaries, managing vacations
and getting payments out. The case study didn't describe what they use today, and that matters, because
it's what we're replacing and migrating from.

> **Assumption:** Today HR runs on spreadsheets plus scanned documents on a shared drive, salary changes
> are approved by email, and someone in HR builds the monthly payment file by hand for the legacy payment
> system. This is the most common starting point at this size.
{: .prompt-info }

> **TODO:** What does Dunderly actually use today (spreadsheets, an old HR package, paper)? It decides the
> [data migration](/posts/projects/dunderly/07-data-and-integration/#data-migration-and-reconciliation)
> effort and the [cutover plan](/posts/projects/dunderly/13-deployment-and-go-live/#cutover-and-rollback-plan).
{: .prompt-warning }

If the assumption holds, the problems are familiar:

| Problem today | Why it hurts | What the new system does |
|---|---|---|
| Salary changes approved by email | No audit trail; the approval and the payroll file can disagree | A request-and-approve workflow with an immutable history |
| Vacation balances in a spreadsheet | Disputes, double bookings, manual year-end carry-over | A leave ledger that every employee can see |
| Contracts and reviews on a file share | Anyone with share access can read salaries and reviews | Role-based access to documents, malware-scanned, audited |
| Hand-built payment file | One typo pays someone the wrong amount; nobody knows if it arrived | A generated file with control totals and a delivery receipt |

The opportunity is modest but real: fewer payroll errors, less HR admin, and a defensible answer when an
auditor or an employee asks "who changed my salary, and who approved it?"

## Goals, objectives, and expected outcomes
{: #goals-objectives-and-expected-outcomes }

I'd frame the project around three goals and keep everything else secondary:

1. **One trusted record per employee.** Personal data, job, salary history, leave and documents in one
   place, with HR as the owner.
2. **Controlled money changes.** No salary change reaches payroll without a manager's request and an HR
   manager's approval, and every change is traceable.
3. **A payroll hand-off that can't silently fail.** The monthly file is generated, checked and confirmed
   as delivered, with an alert days before payday if it wasn't.

Expected outcomes, as the business would phrase them:

- Employees check their own leave balance instead of asking HR.
- Managers raise salary changes in the app, not by email.
- HR closes the monthly payroll in hours, not days.
- The system costs less to run than the 2023 design estimated (see
  [Budget](/posts/projects/dunderly/03-product-planning/#budget-and-resource-planning)).

Non-goals are just as important: this is **not** a payroll calculation engine (the legacy payment system
keeps doing tax and net pay), not a recruitment tool and not a performance-review platform. Reviews are
stored as documents, not workflows.

## Stakeholders, sponsors, and decision-makers
{: #stakeholders-sponsors-and-decision-makers }

The case study names roles, not people, so this is the shape I'd expect at a 250-person company:

| Role | Interest | Decides |
|---|---|---|
| Sponsor (HR director or COO) | HR efficiency, compliance, cost | Budget, scope, go-live |
| HR manager | Approves salary changes; owns HR data | Business rules, acceptance |
| HR administrators | Day-to-day users | UX feedback, UAT |
| Payroll operator | Prepares the monthly run | Payroll file sign-off |
| Line managers | Raise salary requests, approve leave | Feedback only |
| IT / server farm owner | Runs the legacy payment system and the network | Integration and connectivity |
| Finance | Cost of the platform; payroll totals | Budget approval |
| Data protection officer | Personal and salary data | Privacy sign-off |
| Architect (me) | Overall design | Technical decisions, through ADRs |

> **TODO:** Who is the named sponsor, and who has final say on go-live? A project without one person who
> can say "yes, ship it" tends to stall at the [launch decision](/posts/projects/dunderly/13-deployment-and-go-live/#launch-decision-and-sign-off).
{: .prompt-warning }

The IT owner of the legacy payment system is the stakeholder I'd meet first. Every other part of the
system is under our control; that integration isn't.

## Target users and personas
{: #target-users-and-personas }

Ten concurrent users out of 250 tells you this is a "lots of light users, a few heavy ones" system.

| Persona | Count (now → 5 years) | What they do | How often |
|---|---|---|---|
| Employee | 250 → 500 | View profile, leave balance, request leave, download own payslip-related documents | A few times a month |
| Manager | TODO | Approve leave, raise salary change requests for direct reports | Weekly |
| HR administrator | TODO | Maintain employees, upload documents, fix data | Daily |
| HR manager | 1 or 2 | Approve salary changes, approve payroll runs | Weekly, plus month end |
| Payroll operator | 1 | Prepare and review the monthly run | Monthly, intensively |
| Auditor | Occasional | Read-only access to history and audit trail | Yearly |

> **TODO:** How many managers and HR staff are there? This sizes the role assignments in
> [Identity and access](/posts/projects/dunderly/05-technical-architecture/#identity-and-access-architecture) and the UAT group.
{: .prompt-warning }

The persona that drives the design most is the **HR manager**: a few people with access to everyone's
salary. Their account is the one an attacker would want, so it gets the strongest controls.

## Success metrics and business KPIs
{: #success-metrics-and-business-kpis }

Good KPIs for a small HR system are boring and countable. I'd track these from go-live:

| KPI | Target | How it's measured |
|---|---|---|
| Payroll files delivered and confirmed before cutoff | 12 out of 12 months | Receipt blob per run |
| Payroll corrections caused by HR data errors | Down vs. baseline | Payroll operator log |
| Salary changes with a complete approval trail | 100% | Audit query |
| Leave requests handled in the app (not email) | > 90% after 3 months | Request counts |
| Time to close the monthly payroll | Down vs. baseline | Run timestamps (draft → approved) |
| Monthly Azure cost | Under budget | Cost Management budget alert |

> **TODO:** Baselines. How many payroll corrections a month happen today, and how long does closing payroll
> take? Without them, "down vs. baseline" can't be reported.
{: .prompt-warning }

Technical targets (availability, latency) live in
[Operations](/posts/projects/dunderly/14-operations-and-observability/#availability-and-performance-targets);
these are the numbers the sponsor cares about.

## Scope, assumptions, constraints, and dependencies
{: #scope-assumptions-constraints-and-dependencies }

**In scope:** employee records and documents, salary change requests and approvals, vacation (leave)
balances and requests, the monthly payroll file, audit, and the admin screens HR needs.

**Out of scope for v1:** payroll calculation, recruitment, performance-review workflows, expenses, mobile
apps, and provisioning Entra ID accounts from HR data (a good v2 item, see the
[roadmap](/posts/projects/dunderly/03-product-planning/#product-roadmap)).

**Constraints from the case study:** web based; Azure and .NET; 10 concurrent users; 250 employees growing
to 500; about 51 MB per employee (25.5 GB at 500); not mission critical; the payment system accepts only
files, once a month.

These are the assumptions the rest of the playbook builds on. Each one is a place a real project would
need an answer:

| # | Assumption | Used in |
|---|---|---|
| A1 | Azure region is West Europe (the 2023 estimate used it), DR in North Europe | Areas 5, 11 |
| A2 | Employees are in the EU, so GDPR applies | Areas 6, 7, 17 |
| A3 | Team: an architect, two .NET developers, one QA/DevOps engineer, and an HR product owner part-time | Areas 3, 9 |
| A4 | MVP in about 16 weeks | Area 3 |
| A5 | Dunderly already uses Microsoft 365, so staff have Entra ID accounts | Area 5 |
| A6 | Payroll cutoff is five working days before payday | Area 7 |
| A7 | Availability target 99.5% in business hours, RTO one business day, RPO 15 minutes | Areas 5, 14 |

**Dependencies:** the legacy payment system's file specification and its owner's time; a way for an
on-premises server to reach Azure Storage over HTTPS; Entra ID app registrations and Conditional Access
(tenant admin); and HR's time for UAT.

## Checklist
{: #checklist }

- [ ] Confirm what Dunderly uses today for HR records and payroll files.
- [ ] Name the sponsor and the person who signs off go-live.
- [ ] Get headcounts for managers, HR staff and payroll.
- [ ] Record KPI baselines (payroll corrections per month, time to close payroll).
- [ ] Confirm or replace assumptions A1 to A7 with the client.
- [ ] Meet the legacy payment system's owner and get the file specification.
- [ ] Agree the non-goals in writing (no payroll calculation, no recruitment).

{% include project-nav.html %}
