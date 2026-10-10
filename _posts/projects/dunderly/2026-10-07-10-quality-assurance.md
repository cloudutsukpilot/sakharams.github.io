---
layout: post
title: "Dunderly HR System: Quality Assurance"
date: 2026-10-07 00:10:00 +0530
categories: [projects, dunderly]
tags: [Projects, Dunderly, Testing, QA]
description: "Dunderly HR testing: business-rule unit tests, SQL in Testcontainers, golden payroll files, Playwright journeys, an authorization matrix, and a parallel payroll month."
project: dunderly
project_step: 10
image:
  path: /assets/img/projects/dunderly/10-quality-assurance.webp
  alt: "Dunderly HR System: Quality Assurance - Projects hero image"
---

In most systems a bug costs time. In Dunderly's HR system, a certain kind of bug costs someone their
correct salary, and nobody notices until payday. So the test strategy is lopsided on purpose: thorough
on business rules, authorization and the payroll file; pragmatic everywhere else. The final test isn't
automated at all. It's one real month of payroll run side by side with the old process.

<!-- more -->

{% include project-nav.html %}

## Unit testing
{: #unit-testing }

xUnit for the domain and application layers, with no database or HTTP involved. The targets are the
rules that move money or days:

- Salary: effective-date overlaps, period closed, four-eyes, one open request per employee.
- Leave: balance calculation from the ledger, part days, public holidays, carry-over at year end.
- Payroll: which salary applies in a period, joiners and leavers mid-month, unpaid leave deductions.

Date logic uses an injected `TimeProvider` (`FakeTimeProvider` in tests), so "the day before cutoff" is a
test case, not a calendar event. Coverage goal: 90%+ on domain projects; no number on the rest.

```csharp
[Theory]
[InlineData("2027-03-01", "2027-02-28", true)]   // effective 1 March, Feb closed: allowed
[InlineData("2027-02-15", "2027-02-28", false)]  // effective inside the closed period: refused
public void Effective_date_must_be_after_last_closed_period(string effective, string closedUntil, bool ok)
    => SalaryRules.CanTakeEffect(DateOnly.Parse(effective), DateOnly.Parse(closedUntil)).Should().Be(ok);
```

## Integration testing
{: #integration-testing }

The API runs in-process with `WebApplicationFactory`, against a real SQL Server in a container
(Testcontainers) and Azurite for Blob and queues. Real migrations run first, so temporal tables, constraints
and the append-only audit grants are tested as deployed.

Authentication is replaced by a test handler that issues claims for a chosen role and object ID. That's
what makes the **authorization matrix** cheap: one parameterized test per endpoint × role, asserting the
expected status (200, 403 or 404). Around 20 endpoints × 6 roles is 120 cases, generated from a table, run
in seconds.

## Contract testing
{: #contract-testing }

Two contracts matter:

| Contract | Consumer | How it's tested |
|---|---|---|
| HR API (OpenAPI) | Blazor app | The client is generated from the OpenAPI document in the build; a breaking change fails compilation. An OpenAPI diff check flags breaking changes in PRs. |
| Payroll file | Legacy payment system | **Golden files**: known runs rendered to files, compared byte for byte with approved samples. The samples are approved by the payment system's owner. |

The payroll golden files are the most valuable tests in the repo. A change to the renderer that alters a
single byte fails the test, and updating a golden file needs a payroll reviewer's approval (CODEOWNERS
covers `tests/Payroll/Golden/`).

## End-to-end testing
{: #end-to-end-testing }

Playwright (.NET) against the test environment, with test users per role in the test Entra tenant. Few
tests, each a full journey:

1. Manager raises a salary request → HR manager approves → salary history shows it.
2. Employee requests leave → manager approves → balance drops.
3. HR uploads a document → it becomes available after the scan → download works.
4. Payroll operator drafts a run → HR manager approves → status reaches "File written".
5. A manager can't see an employee outside their team.

These run after every deployment to test and nightly. They're slow and occasionally flaky by nature, so
they're kept to journeys, never used for rule edge cases.

## Regression testing
{: #regression-testing }

Regression is the automated suite: unit, integration, the authorization matrix, golden files and the E2E
journeys run on every PR (E2E on deploy). Every bug fixed gets a test that would have caught it, tagged with
the issue number.

Before each release with payroll impact, a manual **payroll regression**: re-render the last three months'
approved runs from their snapshots and compare the files with what was actually sent. They must be
identical.

## Performance and load testing
{: #performance-and-load-testing }

Load isn't the risk here, but two scenarios are worth a test with k6 against test:

| Scenario | Load | Pass criteria |
|---|---|---|
| Normal day | 10 concurrent users, mixed reads and writes, 30 min | p95 < 500 ms, no errors |
| Monday 9 am peak | 50 concurrent users opening the home page and leave balance | p95 < 1 s, no errors |
| Month end | Draft a payroll run for 500 synthetic employees | Completes under 1 minute |

The 50-user case is 5× the stated concurrency, which gives headroom for growth to 500 employees. Also check
SQL serverless resume time in dev/test, where auto-pause is on, so nobody mistakes a cold resume for a
performance bug.

## Security testing
{: #security-testing }

- **Every PR:** CodeQL, dependency and secret scanning, the authorization matrix.
- **Every deploy to test:** OWASP ZAP baseline (passive) scan.
- **Before go-live:** external penetration test of the API, uploads, roles and the payroll storage
  account; fixes verified.
- **Upload tests:** EICAR test file must be rejected; a renamed `.exe` with a `.pdf` extension must fail
  the magic-byte check; a 15 MB file must be refused.

See [Security testing and incident response](/posts/projects/dunderly/06-security-and-privacy/#security-testing-and-incident-response).

## Accessibility testing
{: #accessibility-testing }

- **Automated:** axe-core through Playwright on every page in the E2E run; any serious or critical
  violation fails.
- **Manual, each release with UI changes:** keyboard-only pass through the five journeys; a screen reader
  pass (NVDA on Windows) on the leave and salary forms; 200% zoom check.
- **Before go-live:** a short audit against WCAG 2.2 AA by someone outside the team.

Automated tools catch roughly a third of real problems, so the manual pass is not optional.

## Compatibility testing
{: #compatibility-testing }

Supported: current Edge and Chrome (the company standard, presumably managed by Intune), current Firefox
and Safari, plus Safari on iOS and Chrome on Android for the employee and manager screens. Playwright runs
the E2E suite on Chromium, Firefox and WebKit.

> **TODO:** Which browsers and devices does Dunderly manage? If everyone is on managed Edge, the matrix
> shrinks and Conditional Access can require it.
{: .prompt-warning }

## User acceptance testing
{: #user-acceptance-testing }

UAT runs in the test environment in week 15, with HR, the payroll operator, two managers and a few
employees. Scripts follow the acceptance criteria; testers also explore. Exit criteria: no open Sev-1 or
Sev-2 defects, Sev-3s triaged, and HR's written sign-off.

Then the **parallel run**: one payroll month processed in both the old way and the new system. The two
files (or the old manual totals) must match line by line, or every difference must be explained. This is
the real acceptance test, and it's the gate for go-live.

## Test data and test environment management
{: #test-data-and-test-environment-management }

**Never real HR data outside production.** Salary and personal data in a test environment is a breach
waiting to happen.

- A **synthetic data generator** (Bogus) creates a fake company of any size with a realistic structure:
  departments, a management hierarchy, salary bands, leave histories. Seeded, so every run is the same.
- The **migration rehearsals** need real-shaped data: they run in a dedicated, locked-down resource group
  with production-level access controls, and are deleted after each rehearsal.
- The test environment is reset to the synthetic seed each sprint.

## Checklist
{: #checklist }

- [ ] Get approved sample files for the payroll golden tests.
- [ ] Build the authorization matrix test from the role table.
- [ ] Set up Testcontainers SQL and Azurite in CI.
- [ ] Write the five Playwright journeys with axe checks.
- [ ] Run the k6 scenarios and record the baseline.
- [ ] Book the external pen test and the accessibility review.
- [ ] Agree UAT exit criteria and the parallel-run month with HR.

{% include project-nav.html %}
