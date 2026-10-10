---
layout: post
title: "Dunderly HR System: Data and Integration"
date: 2026-10-07 00:07:00 +0530
categories: [projects, dunderly]
tags: [Projects, Dunderly, Data, Integration]
description: "Dunderly HR data: ownership and retention, EF Core migrations, and a verified monthly payroll file for a legacy C++ system that only accepts files."
project: dunderly
project_step: 7
image:
  path: /assets/img/projects/dunderly/07-data-and-integration.webp
  alt: "Dunderly HR System: Data and Integration - Projects hero image"
---

Dunderly's legacy payment system is written in C++, lives in the company's server farm, accepts only
files, and gets one a month. It will never call an API, return an error code or tell us it's unhappy. That
makes the payroll file the most important contract in the system and the one with the least feedback, so
this post designs it the way you'd design a bank transfer: snapshot, approve, checksum, deliver, confirm.

<!-- more -->

{% include project-nav.html %}

## Data ownership and classification
{: #data-ownership-and-classification }

HR owns the data; the application team are custodians. Each data set has a classification that drives who
sees it and where it may appear:

| Data | Owner | Classification | Examples |
|---|---|---|---|
| Employee directory | HR | Internal | Name, job title, department, manager |
| Personal details | HR | Confidential | Address, date of birth, emergency contact |
| Salary and payroll | HR manager | Highly confidential | Salary history, payroll lines, files |
| Leave | HR | Confidential | Balances, bookings; sick leave is special-category health data |
| Documents | HR | Highly confidential | Contracts, reviews |
| Audit | HR + IT | Confidential | Who changed what |

Highly confidential data never leaves the HR system except in the payroll file (to the payment system)
and in exports by HR roles. It never appears in telemetry, emails or notifications.

## Data retention and deletion
{: #data-retention-and-deletion }

Employees aren't deleted, they leave. A leaver's record moves through states, and retention is enforced by
a monthly job, not by someone remembering:

| Data | Kept while employed | After leaving |
|---|---|---|
| Personnel record and documents | Yes | TODO (legal) |
| Salary and payroll history | Yes | TODO (legal; often several years for tax) |
| Leave records | Yes | TODO |
| Audit events | Same as the record they describe | Same |
| Payroll files and receipts (Blob) | Immutable for the retention period | Then deleted by lifecycle policy |

> **TODO:** Retention periods per data set from Dunderly's legal or HR advisor. Under assumption A2 (GDPR),
> keeping data "just in case" isn't allowed, so the system needs real numbers.
{: .prompt-warning }

Mechanics: when a record passes its retention date, the job anonymizes personal fields in SQL (name,
contact, date of birth), deletes the documents from Blob, and keeps the minimal payroll facts if a longer
tax period applies. Temporal history is purged for the same rows. Blob soft delete (30 days) means a
mistaken purge can be undone briefly, then it's gone.

## Database schema and migrations
{: #database-schema-and-migrations }

EF Core code-first migrations, one migrations history per module schema, generated in PRs and reviewed like
code. The model is in [Data architecture](/posts/projects/dunderly/05-technical-architecture/#data-architecture-and-data-models).

Rules:

- **Expand, then contract.** A release only adds (columns nullable or with defaults, new tables). Removals
  happen in a later release, once no running code uses them. This is what makes the
  [slot swap](/posts/projects/dunderly/12-cicd-and-release-management/#database-deployment-strategy) safe.
- **Migrations ship as a bundle** (`dotnet ef migrations bundle`), one executable per release, run by the
  pipeline with the deploy identity.
- **Temporal tables** are declared in the model (`ToTable(t => t.IsTemporal())`), so history tables are
  part of the migration, not hand-made.

```bash
dotnet ef migrations add AddLeaveCarryOver --project src/Dunderly.Hr.Api --context LeaveDbContext
dotnet ef migrations bundle --project src/Dunderly.Hr.Api --context LeaveDbContext -o artifacts/efbundle-leave
```

## Data validation and quality
{: #data-validation-and-quality }

Validation at the edge (shared FluentValidation rules), constraints in the database as the last line:
`CHECK (Amount > 0)`, unique `EmployeeNumber`, foreign keys everywhere, `EndDate >= StartDate`.

Data quality checks that run weekly and show on the HR dashboard:

- Active employees without a manager (except the CEO).
- Active employees without a current salary or leave entitlement.
- Managers who have left but still have direct reports.
- Documents stuck in `PendingScan` for more than an hour.

These matter most just before the payroll cutoff: an employee without a salary is a payroll line that
can't be built. The draft run lists them as blocking issues.

## Import and export requirements
{: #import-and-export-requirements }

- **Import:** the one-off migration (below) plus a CSV import for bulk changes HR occasionally needs
  (annual entitlement for everyone at year start). The import validates every row and applies all or
  nothing.
- **Export:** CSV for the [reports](/posts/projects/dunderly/02-requirements-gathering/#reporting-and-analytics-requirements),
  available to HR roles only, audited (who exported what, when).
- **The payroll file**, which is an export with much stricter rules, described next.

## External systems and third-party integrations
{: #external-systems-and-third-party-integrations }

The case study's facts: legacy system, C++, hosted in the company's server farm, input is files only, one
file a month. Here's the monthly run, end to end. Tick the box to see what happens when the file doesn't
verify:

{% include flow-anim.html id="projects/dunderly/payroll-run" %}

Why it's built this way:

- **Snapshot, then approve.** The draft run copies figures into `PAYROLL_LINE`. What HR approves is
  exactly what gets written.
- **Pull, not push** ([ADR-007](/posts/projects/dunderly/05-technical-architecture/#architectural-decision-records)).
  The pickup agent on-premises fetches the file. Nothing in Azure needs a route, a firewall hole or
  credentials into the server farm.
- **Manifest and receipt.** The manifest lets the agent check integrity; the receipt lets the HR system
  know delivery happened. A missing receipt is an alert days before payday, not a phone call on payday.
- **Idempotent.** The file name includes the run ID (`payroll-2027-03-run-41.dat`). Re-running the
  Function overwrites nothing (the container is immutable) and the agent skips files it has receipts for.

> **Assumption:** Payroll cutoff is five working days before payday (assumption A6), and the pickup agent
> polls every 15 minutes during the payroll window.
{: .prompt-info }

> **TODO:** The payment system's file specification: fixed-width or delimited, encoding, field list, how
> amounts and dates are formatted, and whether it needs one file per month or can accept a correction file.
> A sample file from a previous month would answer most of it.
{: .prompt-warning }

## Event and messaging contracts
{: #event-and-messaging-contracts }

The 2023 design used a queue for logs. The modernized design uses messaging only where work must survive a
failure, and keeps contracts small and versioned:

| Message | Transport | Producer → consumer | Payload |
|---|---|---|---|
| `PayrollRunApproved.v1` | Outbox, relayed to Storage queue `payroll-approved` | API → Payroll Functions | `{ runId, period, approvedBy, approvedAt }` |
| `PayrollReceiptCreated` | Event Grid (Blob created) | Storage → Functions | Blob URL of the receipt |
| `ScanResult` | Event Grid (Defender for Storage) | Defender → Functions | Blob URL, verdict |
| `Notification.v1` | Outbox table in SQL | API → outbox dispatcher Function | `{ template, recipientId, data }` |

The outbox matters for anything that leaves the API after a commit: the API writes the business change and
the message row in the **same transaction**, and a Function relays it afterwards (to the mailbox, or to the
`payroll-approved` queue). Either both happen or neither does, with no "approved but nobody was told" gap
and no approved payroll run whose queue message was lost. The relay can deliver twice, so every consumer is
idempotent. Messages carry IDs, never salary amounts.

Why no Service Bus? At this volume, Storage queues give us retries and poison queues for almost nothing.
If we ever need topics, sessions or ordering, Service Bus is a drop-in step up.

## Backup and restore strategy
{: #backup-and-restore-strategy }

| Store | Backup | Retention | Restore test |
|---|---|---|---|
| Azure SQL | Automatic: full weekly, differential, log every 5 to 10 minutes; geo-redundant | PITR 35 days; LTR monthly for 12 months, yearly for the legal period | Quarterly, to a new database in test |
| Documents (Blob) | Versioning + soft delete (30 days); GRS | Retention policy | Quarterly, restore a deleted version |
| Payroll files | Immutable container; GRS | Retention policy | Yearly, read back a past file and verify hash |
| Bicep, code, config | Git | Forever | Every deploy |

Restores are only real once they've been tested, which is why the restore column exists (and why
[backup verification](/posts/projects/dunderly/16-support-and-maintenance/#backup-verification) is a recurring task).

## Data migration and reconciliation
{: #data-migration-and-reconciliation }

> **Assumption:** The source is spreadsheets plus scanned documents on a file share (see
> [Business problem](/posts/projects/dunderly/01-vision-and-business-context/#business-problem-and-opportunity)).
{: .prompt-info }

At 250 employees and ~10 documents each, that's roughly 2,500 documents and about 12.5 GB to move, small
enough for a careful, repeatable tool rather than a migration product. The tool:

1. Reads the source CSVs and a document manifest (path, employee number, type, SHA-256).
2. Maps and validates every row; anything that fails goes into a rejects file for HR to fix at source.
3. Loads through the same domain code as the API, so business rules and audit events apply.
4. Uploads documents through the quarantine and scan path.
5. Is idempotent: re-running it updates rather than duplicates, so we can rehearse it as often as needed.

Reconciliation proves it worked: headcount, sum of current salaries, sum of leave balances and document
count and hashes, source vs target, all must match or be explained. The cutover itself is in
[Go-Live](/posts/projects/dunderly/13-deployment-and-go-live/#data-migration-plan).

## Checklist
{: #checklist }

- [ ] Get the payroll file specification and a sample file.
- [ ] Get retention periods per data set from legal.
- [ ] Confirm whether bank details are needed in the HR system.
- [ ] Build and test the pickup agent with the payment system's owner.
- [ ] Set up SQL LTR and Blob immutability policies to match retention.
- [ ] Write the migration tool and run the first rehearsal on a copy of real data.
- [ ] Agree the reconciliation checks with HR and finance.

{% include project-nav.html %}
