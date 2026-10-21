---
layout: post
title: "Dunderly HR System: Implementation"
date: 2026-10-07 00:09:00 +0530
categories: [projects, dunderly]
tags: [Projects, Dunderly, Implementation]
description: "Dunderly HR build plan: eight two-week sprints in vertical slices, the payroll path first, and the code shapes for endpoints, Blazor pages, file writer and agent."
project: dunderly
project_step: 9
image:
  path: /assets/img/projects/dunderly/09-implementation.webp
  alt: "Dunderly HR System: Implementation - Projects hero image"
---

The order you build things in is a design decision. For Dunderly, the riskiest unknown is the legacy
payment system's file format, and the riskiest code is anything that turns HR data into money. So the plan
builds a thin payroll path early, against a sample file, while the obvious CRUD screens wait their turn.
Nobody ever lost sleep over an employee edit form.

<!-- more -->

{% include project-nav.html %}

## Sprint or iteration planning
{: #sprint-or-iteration-planning }

Two-week sprints, mapped to the [milestones](/posts/projects/dunderly/03-product-planning/#release-milestones)
(16 weeks under assumption A4):

| Sprint | Goal | Key stories |
|---|---|---|
| 1 | Walking skeleton | Repo, CI, Bicep dev, sign-in, one endpoint end to end, deployed |
| 2 | Employees | Employee CRUD, roles, audit events, list with paging |
| 3 | Documents + payroll spike | Upload/scan/download; **spike: generate a file in the legacy format from fake data** |
| 4 | Salary workflow | Request, approve, reject, withdraw; BR-1 to BR-5 |
| 5 | Leave | Entitlements, ledger, balance; leave approval behind a flag |
| 6 | Payroll run | Draft, review, approve, file, manifest; pickup agent v1 in test |
| 7 | Migration and hardening | Migration tool, reconciliation, pen-test fixes, load test |
| 8 | UAT and parallel run | UAT fixes, parallel payroll month, runbooks, go-live prep |

The sprint 3 spike is the important one: it produces a file the payment system's owner can try on a test
instance of their system, which turns the biggest unknown into a known by week 6.

Ceremonies stay light: a 30-minute planning, a 15-minute daily, a demo to HR at the end of each sprint
(they're the product owner's real audience), and a retro.

## Feature development
{: #feature-development }

Features are built as **vertical slices**: one story touches the Blazor page, the endpoint, the domain
rule, the migration and the tests, and ships to test in one PR. No "backend sprint, then frontend sprint".

The definition of done for a slice:

- Acceptance criteria pass as automated tests (unit or integration).
- Authorization tests for each role that should and shouldn't reach it.
- Audit events emitted for any write.
- No personal data in logs (checked in review).
- Deployed to test and shown to the product owner.
- Docs updated (runbook, ADR or README) if behaviour changed.

## API and UI implementation
{: #api-and-ui-implementation }

Endpoints are grouped per module with minimal APIs. The approval endpoint shows the shape: role check,
data rules in the domain, optimistic concurrency, problem details:

```csharp
public static class SalaryEndpoints
{
    public static RouteGroupBuilder MapSalary(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/salary-requests").WithTags("Salary");
        g.MapPost("/{id:int}/approval", Approve).RequireAuthorization(p => p.RequireRole("HR.Manager"));
        return g;
    }

    static async Task<IResult> Approve(int id, ApproveSalaryRequest body, ClaimsPrincipal user,
        SalaryService salary, CancellationToken ct)
    {
        var result = await salary.ApproveAsync(id, user.GetObjectId(), body.RowVersion, ct);
        return result.Match(
            ok        => Results.Ok(ok),
            notFound  => Results.Problem(statusCode: 404, title: "Request not found"),
            selfDecide=> Results.Problem(statusCode: 403, title: "You can't approve a request you raised"),
            conflict  => Results.Problem(statusCode: 409, title: "Request changed or is no longer Submitted"));
    }
}
```

On the Blazor side, pages call a typed client generated from the OpenAPI document, and the same
`SalaryRequestValidator` from `Dunderly.Hr.Shared` validates the form before it's sent:

```razor
@page "/team/salary-requests/new/{EmployeeId:int}"
@attribute [Authorize(Roles = "Manager,HR.Admin,HR.Manager")]

<EditForm Model="model" OnValidSubmit="SubmitAsync">
    <FluentValidationValidator />
    <FluentNumberField @bind-Value="model.ProposedAmount" Label="New annual salary" />
    <FluentDatePicker @bind-Value="model.EffectiveFrom" Label="Effective from" />
    <FluentTextArea @bind-Value="model.Justification" Label="Why" />
    <FluentButton Type="ButtonType.Submit" Appearance="Appearance.Accent">Submit for approval</FluentButton>
</EditForm>
```

## Database and infrastructure implementation
{: #database-and-infrastructure-implementation }

Database work follows the [migration rules](/posts/projects/dunderly/07-data-and-integration/#database-schema-and-migrations):
one migration per PR where possible, expand-only, reviewed. Temporal tables and the append-only audit
grants are created in the first migrations, not bolted on later.

Infrastructure is Bicep, built alongside the code from sprint 1 rather than at the end:

```bicep
module api 'br/public:avm/res/web/site:<version>' = {
  name: 'api'
  params: {
    name: 'app-dunderly-hr-api-${env}'
    kind: 'app,linux'
    serverFarmResourceId: plan.outputs.resourceId
    managedIdentities: { systemAssigned: true }
    virtualNetworkSubnetId: vnet.outputs.subnetResourceIds[0]
    siteConfig: { linuxFxVersion: 'DOTNETCORE|10.0', minTlsVersion: '1.2', healthCheckPath: '/health' }
    httpsOnly: true
  }
}
```

Role assignments (API identity → `Storage Blob Data Contributor` on documents, SQL contained user via a
deployment script) are in Bicep too, so a rebuilt environment has the same permissions. Details in
[Infrastructure as code](/posts/projects/dunderly/11-infrastructure-and-environments/#infrastructure-as-code).

## Integration development
{: #integration-development }

Two pieces: the file writer (Azure Function) and the pickup agent (on-premises console app). The writer
is idempotent by run ID and refuses to write a run that isn't `Approved`:

```csharp
[Function("WritePayrollFile")]
public async Task Run([QueueTrigger("payroll-approved")] PayrollRunApproved msg, CancellationToken ct)
{
    var run = await runs.GetAsync(msg.RunId, ct);
    if (run.Status != PayrollRunStatus.Approved) { log.LogWarning("Run {RunId} not approved", run.Id); return; }

    var blob = outbound.GetBlobClient($"{run.Period}/payroll-{run.Period}-run-{run.Id}.dat");
    if (await blob.ExistsAsync(ct)) { log.LogInformation("Run {RunId} already written", run.Id); return; }

    var (content, manifest) = LegacyPayrollFormat.Render(run);   // golden-file tested
    await blob.UploadAsync(content, ct);
    await outbound.GetBlobClient(blob.Name + ".manifest.json").UploadAsync(manifest.ToJson(), ct);
    await runs.MarkFileWrittenAsync(run.Id, manifest.Sha256, ct);
}
```

The agent runs every 15 minutes as a Windows scheduled task (or a systemd timer) on an Arc-enabled server:
list new files, download with AzCopy using the Arc managed identity, verify SHA-256 and record count,
move into the payment system's input folder, upload `receipt.json`. It logs to the Windows event log and,
through Azure Monitor Agent, to the same Log Analytics workspace.

> **TODO:** Which OS does the payment system's server run, and where is its input folder? It decides
> whether the agent is a scheduled task or a systemd timer, and how the file is moved atomically.
{: .prompt-warning }

## Technical debt tracking
{: #technical-debt-tracking }

Debt is visible or it doesn't exist. Every shortcut gets an issue labelled `type:debt` with what was
skipped, why, and the trigger to fix it. Known, accepted debt at MVP:

| Debt | Why accepted | Fix when |
|---|---|---|
| No WAF ([ADR-004](/posts/projects/dunderly/05-technical-architecture/#architectural-decision-records)) | Cost vs risk | Exposure changes |
| Reports are CSV only | MVP scope | HR asks for dashboards |
| Email-only notifications | MVP scope | After go-live |
| Single region, no warm standby | RTO allows it | RTO tightens |

Each sprint reserves about 15% capacity for debt and dependency updates. More in
[Technical debt management](/posts/projects/dunderly/16-support-and-maintenance/#technical-debt-management).

## Code reviews
{: #code-reviews }

Every PR is reviewed; payroll paths need two reviewers, one from `payroll-reviewers` (see
[CODEOWNERS](/posts/projects/dunderly/08-development-preparation/#development-workflow-and-code-review-process)).
Reviewers use a short checklist in the PR template:

- [ ] Business rule correct, and tested at the edges (period boundaries, zero, negative)
- [ ] Authorization: role *and* data scope checked
- [ ] Audit event for every write
- [ ] Migration is expand-only
- [ ] No salary amounts or personal data in logs, exceptions or notifications
- [ ] Docs or runbook updated

PRs over about 400 changed lines get split. Small PRs get better reviews.

## Developer documentation
{: #developer-documentation }

What a developer needs, and where it lives:

| Need | Where |
|---|---|
| Run it locally | `README.md` (one command) |
| Understand the design | `docs/architecture.md` (C4 context and container diagrams) + ADRs |
| Module rules | `src/Modules/README.md` |
| API | OpenAPI at `/openapi/v1.json` in dev and test, Scalar UI in dev only |
| Payroll file format | `docs/payroll-file-format.md`, with the golden files in tests |
| How to add a migration | `docs/how-to/migrations.md` |

The payroll file format document is the one that must never go stale: it's the contract with a system we
don't control. It's reviewed by the payment system's owner at every format change.

## Checklist
{: #checklist }

- [ ] Agree the sprint plan with the product owner and the legacy system's owner.
- [ ] Schedule the sprint 3 payroll file spike and its test on the payment system.
- [ ] Add the definition of done and reviewer checklist to the PR template.
- [ ] Generate the typed API client from OpenAPI in the build.
- [ ] Confirm the payment server's OS and input folder for the agent.
- [ ] Create `type:debt` issues for the accepted debt list.
- [ ] Write `docs/payroll-file-format.md` from the spec and a sample file.

{% include project-nav.html %}
