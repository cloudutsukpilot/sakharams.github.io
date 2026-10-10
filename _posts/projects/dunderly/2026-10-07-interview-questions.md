---
layout: post
title: "Dunderly HR System: Interview Questions"
date: 2026-10-07 00:30:00 +0530
categories: [projects, dunderly]
tags: [Projects, Dunderly, Interview Prep, Architecture]
description: "Dunderly HR System interview answers from architect, developer, DevOps and SRE seats: modular monolith, payroll file design, Azure PaaS and trade-offs."
project: dunderly
project_interview: true
image:
  path: /assets/img/projects/dunderly/interview-questions.webp
  alt: "Dunderly HR System: Interview Questions - Projects hero image"
---

This is the Dunderly HR System as I'd talk about it in an interview, answered from the architect,
developer, DevOps and SRE seats. One thing to say upfront, because interviewers respect it: Dunderly is a
design case study I took from a 2023 architecture exercise to a full 18-area playbook. It hasn't run in
production, so these answers describe the design and the planned code, and they say so where it matters.

*"I designed an HR system on Azure and .NET for a 250-person paper supplies company: employee records,
salary approvals, leave and a monthly payroll file to a legacy C++ system, and the most interesting
decision was merging the original three microservices into one modular API."*

<!-- more -->

{% include project-nav.html %}

{% include project-iq-roles.html %}

## Project Overview and Your Role
{: #project-overview-and-your-role }

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q1">
<summary>Walk me through a frontend or backend application you designed and built end to end.</summary>

<div class="iq-role" data-role="architect" markdown="1">

Dunderly sells paper supplies and needed an HR system for 250 employees (500 within five years): employee
records with scanned documents, a salary-change workflow where a manager asks and the HR manager approves,
vacation balances, and a monthly payment file for a legacy C++ system that only accepts files.

I'd be upfront that it's a design case study, not something I ran in production. The design: a Blazor
WebAssembly app on Static Web Apps, one modular ASP.NET Core API on App Service, Azure SQL for records,
Blob Storage for ~25 GB of documents, an Azure Functions app for the monthly payroll run, and an
on-premises agent that pulls the file. Entra ID does sign-in and roles; everything else uses managed
identities.

The story I tell is the evolution: the 2023 version had six services and an $848/month estimate. Revisiting
it, I merged three APIs into a modular monolith, dropped a $352/month WAF, and made the payroll hand-off
verifiable.

Deeper: [System context](/posts/projects/dunderly/05-technical-architecture/#system-context-and-component-architecture),
[ADRs](/posts/projects/dunderly/05-technical-architecture/#architectural-decision-records)

</div>

<div class="iq-role" data-role="developer" markdown="1">

On the code side it's a .NET 10 solution in one repo:

- **Blazor WebAssembly** (`Dunderly.Hr.Web`): routable components (`@page`), `[Authorize(Roles=…)]`,
  `EditForm` with FluentValidation, Fluent UI components, a typed `HttpClient` generated from OpenAPI.
- **ASP.NET Core minimal APIs** (`Dunderly.Hr.Api`): endpoints grouped per module with `MapGroup`, DI for
  services, `RequireAuthorization` with role policies, problem details for errors.
- **Modules** (`Employees`, `Salary`, `Leave`, `Payroll`, `Audit`): each has `Domain`, `Application`,
  `Infrastructure` (EF Core config, its own schema) and `Contracts`.
- **EF Core** with temporal tables and migration bundles.
- **Azure Functions (isolated worker)**: queue, timer and Event Grid triggers for payroll and scans.

```bash
dotnet run --project src/Dunderly.Hr.AppHost   # Aspire: SQL container, Azurite, API, Functions, web
dotnet test
dotnet ef migrations add <Name> --project src/Dunderly.Hr.Api --context SalaryDbContext
```

The gap I'd name: there's no production code behind this yet; the snippets are from the design.

Deeper: [Project structure](/posts/projects/dunderly/08-development-preparation/#project-structure)

</div>

<div class="iq-role" data-role="devops" markdown="1">

Three deployables plus infrastructure, all from one GitHub repo:

- **Infrastructure**: Bicep with Azure Verified Modules, one `main.bicep` and a `.bicepparam` per
  environment (dev, test, prod).
- **API**: zip deploy to App Service Linux, to the **staging slot** in prod, then a swap.
- **Functions**: zip deploy to a Flex Consumption app.
- **Web**: Static Web Apps, with PR preview environments.
- **Database**: an EF Core migration bundle run before the code.

Pipelines are GitHub Actions with OIDC to Azure, so there are no stored cloud secrets. Main builds once and
promotes the same artifacts dev → test → prod, with a required reviewer on prod and a payroll-week freeze.

```bash
az deployment sub what-if -l westeurope -f infra/main.bicep -p infra/env/prod.bicepparam
az webapp deployment slot swap -g rg-dunderly-hr-prod -n app-dunderly-hr-api-prod --slot staging --target-slot production
```

Deeper: [CI/CD](/posts/projects/dunderly/12-cicd-and-release-management/#deployment-automation)

</div>

</details>

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q2">
<summary>What business problem did it solve, and how did you know it was working?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The business problem: HR records in spreadsheets (an assumption I flag, the case study didn't say),
salary changes approved by email, and a payment file built by hand for a system that gives no feedback.
The risks were wrong pay, no audit trail, and salary data readable by anyone with share access.

How I'd know it works, as KPIs:

| KPI | Target |
|---|---|
| Payroll files delivered and confirmed before cutoff | 12 of 12 months |
| Salary changes with a complete four-eyes trail | 100% |
| Leave requests handled in the app | > 90% after 3 months |
| Payroll corrections from HR data errors | Down vs baseline |
| Monthly Azure cost | Under budget, and under the 2023 estimate |

The honest part: the baselines don't exist yet.

> **TODO:** Baseline payroll corrections per month and time to close payroll, from Dunderly's current
> process. Without them, "down vs baseline" can't be reported.
{: .prompt-warning }

The real acceptance test is a parallel payroll month: old and new process side by side, matching line by line.

Deeper: [Success metrics](/posts/projects/dunderly/01-vision-and-business-context/#success-metrics-and-business-kpis)

</div>

</details>

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q3">
<summary>What was your role, and which architectural decisions did you own?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I was the architect, end to end: requirements clarification, the architecture, and the playbook that takes
it to delivery. The decisions I owned, each written as an ADR:

- **ADR-001** one modular API instead of three services sharing one database.
- **ADR-003** Azure Functions instead of a WebJob for the payment interface.
- **ADR-004** no Application Gateway WAF in v1, with explicit revisit triggers.
- **ADR-005** private endpoints and managed identity instead of IP firewall rules.
- **ADR-007** a pull-based payroll file with a manifest and a receipt.
- **ADR-008** Azure SQL serverless with temporal tables.

I'd also say what I didn't own: business rules belong to the HR manager, and the file format belongs to the
payment system's owner. Knowing which decisions aren't yours is part of the role.

Deeper: [ADRs](/posts/projects/dunderly/05-technical-architecture/#architectural-decision-records),
[Decision authorities](/posts/projects/dunderly/17-governance-and-compliance/#decision-making-and-approval-authorities)

</div>

<div class="iq-role" data-role="developer" markdown="1">

As a developer on this design I'd own a module end to end, for example **Salary**: the request state machine
(Draft → Submitted → Approved/Rejected/Withdrawn → Paid), its rules (direct report only, one open request,
no closed periods, four eyes), the minimal API endpoints, the Blazor form and the tests.

Concepts I'd point to:

- **Domain logic in the domain layer**, returning result types instead of throwing for business outcomes.
- **Authorization in two layers**: the role policy on the endpoint, and the reporting-line check in code.
- **Optimistic concurrency** with a `rowversion` and `If-Match`, returning 412 or 409.
- **`TimeProvider`** injected, so "after cutoff" is testable.

```csharp
g.MapPost("/{id:int}/approval", Approve).RequireAuthorization(p => p.RequireRole("HR.Manager"));
```

```bash
dotnet test tests/Salary.Tests --filter "Category=Rules"
```

Deeper: [API and UI implementation](/posts/projects/dunderly/09-implementation/#api-and-ui-implementation)

</div>

<div class="iq-role" data-role="devops" markdown="1">

I'd own the platform: Bicep for three environments, the GitHub Actions pipelines, OIDC federated
credentials, private networking and DNS, and the release mechanics (migration bundle, slot swap, smoke
tests, swap-back).

Decisions in my lane:

- Build once, promote the same artifacts; never rebuild per environment.
- Use prod's staging slot instead of a fourth environment.
- DDL rights only for the pipeline identity; the API gets DML.
- A payroll-freeze check in the release workflow.
- Weekly drift detection with `what-if`.

```bash
az bicep lint --file infra/main.bicep
gh workflow run release.yml
az webapp log tail -g rg-dunderly-hr-prod -n app-dunderly-hr-api-prod
```

Deeper: [Infrastructure as code](/posts/projects/dunderly/11-infrastructure-and-environments/#infrastructure-as-code)

</div>

</details>

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q4">
<summary>Who were the users and stakeholders, and how did their needs shape the design?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Six user groups, and two shaped the design most:

| User | Need | Design impact |
|---|---|---|
| Employees (250 → 500) | Check leave, request it | Mobile-friendly, three-click leave booking |
| Managers | Approve leave, raise salary changes | Reporting-line authorization |
| HR admins | Maintain records and documents | One employee hub page with tabs |
| HR manager | Approve salaries and payroll runs | Strongest controls; four-eyes rules |
| Payroll operator | Close the month | Variance review, delivery status strip |
| IT (payment system owner) | Stable file interface | Pull model, interface agreement |

The **HR manager** drove security: a few accounts that can see everyone's salary are the main target, so
they get compliant-device Conditional Access. The **payment system owner** drove integration: their system
can't change, so we adapt to it and don't ask for an inbound hole into their server farm.

> **TODO:** Headcounts for managers and HR staff, which size role assignments and UAT.
{: .prompt-warning }

Deeper: [Personas](/posts/projects/dunderly/01-vision-and-business-context/#target-users-and-personas)

</div>

</details>

## System Design and Architecture
{: #system-design-and-architecture }

<details class="project-iq" markdown="1" id="system-design-and-architecture-q1">
<summary>If you had to design this application from scratch on a whiteboard, with a frontend, a backend and a data store, how would you approach it?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I'd start with the questions, not boxes, exactly as the case study did: how many users (10 concurrent),
how much data (25.5 GB at 500 employees), how critical (not very), and what the external system needs
(one file a month).

Then three boxes and an arrow:

1. **Frontend**: a SPA served statically (Static Web Apps), because there's no server rendering need.
2. **Backend**: one API, with modules for employees, salary, leave and payroll. At this scale a single
   deployable is the right default.
3. **Data**: relational for records (Azure SQL), object storage for documents (Blob), never documents in the DB.
4. **The arrow**: the payroll file, drawn separately because it's the time-critical, failure-prone part.

Then I'd layer identity (Entra ID), async work (Functions, queues) and observability, and finish with the
trade-offs I'd revisit: WAF, region strategy, RPO.

Deeper: [System context](/posts/projects/dunderly/05-technical-architecture/#system-context-and-component-architecture)

</div>

<div class="iq-role" data-role="developer" markdown="1">

From a developer's whiteboard, I'd draw the request path and the code seams:

- **Browser**: Blazor WASM. Components render from state; `HttpClient` with an MSAL message handler adds the
  bearer token.
- **API**: middleware pipeline (exception handling → authentication → authorization → rate limiting →
  endpoints), minimal API groups per module, DI-registered services.
- **Domain**: plain C# with rules and state transitions; no EF or HTTP types.
- **Data**: EF Core `DbContext` per module schema, with retries on transient SQL errors.

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddMicrosoftIdentityWebApiAuthentication(builder.Configuration);
builder.Services.AddEmployees(builder.Configuration).AddSalary(builder.Configuration);
var app = builder.Build();
app.UseAuthentication(); app.UseAuthorization();
app.MapGroup("/api/v1").MapEmployees().MapSalary();
app.Run();
```

Deeper: [Technology selection](/posts/projects/dunderly/05-technical-architecture/#technology-and-framework-selection)

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q2">
<summary>What are the main components, and how are responsibilities split between them?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Component | Responsibility |
|---|---|
| Blazor app (Static Web Apps) | UI only; no business rules it alone enforces |
| HR API (App Service) | All business logic, authorization, audit |
| Payroll Functions | Draft runs, write files, process receipts and scan results, send the outbox |
| Azure SQL | Records, salary history, leave ledger, payroll snapshots, audit |
| Blob (documents) | Scanned contracts and reviews, quarantine then clean |
| Blob (payroll outbound) | Files, manifests, receipts; immutable |
| Pickup agent (on-prem) | Pull, verify, hand to the payment system, write receipt |
| Entra ID / Key Vault / App Insights | Identity, the few secrets, telemetry |

The split rule: **synchronous user work in the API, anything that must survive failure or runs on a
schedule in Functions**, and anything that touches the server farm on-premises. The API never talks to the
payment system directly.

Deeper: [Component table](/posts/projects/dunderly/05-technical-architecture/#system-context-and-component-architecture)

</div>

<div class="iq-role" data-role="developer" markdown="1">

Inside the API, the split is by module, and the boundary is enforced:

- Each module owns a SQL schema (`salary`, `leave`…) and its EF configuration.
- Modules talk through `Contracts` interfaces, for example `IReportingLine` from Employees, used by Salary.
- A NetArchTest rule fails the build if one module references another's internals.
- Shared validators live in `Dunderly.Hr.Shared`, used by both Blazor and the API.

```csharp
[Fact]
public void Salary_does_not_depend_on_leave_internals() =>
    Types.InAssembly(typeof(SalaryModule).Assembly)
        .ShouldNot().HaveDependencyOn("Dunderly.Hr.Modules.Leave.Domain")
        .GetResult().IsSuccessful.Should().BeTrue();
```

The point of this structure is to keep "we could split it later" true without paying for it now.

Deeper: [Coding standards](/posts/projects/dunderly/08-development-preparation/#coding-standards)

</div>

<div class="iq-role" data-role="devops" markdown="1">

Operationally there are four deployable units, each with its own lifecycle:

| Unit | Target | Deploy |
|---|---|---|
| Web | Static Web Apps | SWA deploy action, previews per PR |
| API | App Service (P0v3) | Zip to staging slot, smoke, swap |
| Functions | Flex Consumption | Zip deploy after the API swap |
| Pickup agent | Arc-enabled on-prem server | Versioned package, installed with IT |

Plus the database (migration bundle) and the infrastructure (Bicep). Ordering matters: Bicep →
migrations → API → Functions → web, so the UI never calls an API older than itself.

```bash
az functionapp deployment source config-zip -g rg-dunderly-hr-prod -n func-dunderly-hr-prod --src artifacts/func.zip
```

Deeper: [Deployment automation](/posts/projects/dunderly/12-cicd-and-release-management/#deployment-automation)

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q3">
<summary>Which non-functional requirements drove the architecture the most?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Three NFRs drove it, and two of them pushed in the "smaller" direction:

1. **Scale (10 concurrent users, 500 employees, 25.5 GB).** It ruled out anything distributed for
   its own sake. That's the reason for a modular monolith, a serverless database and one App Service plan.
2. **"Not mission critical", with one exception.** The web app can be down for an afternoon, the payroll
   file can't be late. So single region and no warm standby, but a verified, alerted payroll path.
3. **Data sensitivity.** Salary and personal data meant identity-first security: Entra ID, role plus
   reporting-line checks, private endpoints, no personal data in telemetry.

The file-only payment interface was the constraint that shaped integration: pull, manifest, receipt.

> **Assumption:** RTO one business day and RPO 15 minutes; the case study only said "not very critical".
{: .prompt-info }

Deeper: [Non-functional requirements](/posts/projects/dunderly/02-requirements-gathering/#non-functional-requirements)

</div>

<div class="iq-role" data-role="sre" markdown="1">

From the reliability seat, the NFR that matters is the one the case study didn't quantify: what "not
critical" means. I'd turn it into SLOs:

| SLI | Proposed SLO |
|---|---|
| Availability test success, business hours | 99.5% / 30 days |
| API p95 latency | < 500 ms |
| Payroll file confirmed before cutoff + 1 day | 100%, every month |

The third one shapes operations: alerts for "approved but no file" (Sev 1 after an hour) and "file but no
receipt" (Sev 1 after four hours), each with a runbook. The first two get an error budget; burning half of
it moves reliability work up the backlog.

```kusto
requests | where timestamp > ago(30d) | summarize p95=percentile(duration,95) by name | order by p95 desc
```

The gap: these targets are proposals until the sponsor agrees them.

Deeper: [Targets](/posts/projects/dunderly/14-operations-and-observability/#availability-and-performance-targets)

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q4">
<summary>Which architectural options did you consider and reject, and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Option | Why rejected |
|---|---|
| Three services (2023 design) | Shared database, one UI page needs all three, 10 users: a distributed monolith |
| Application Gateway WAF v2 | 41.5% of the 2023 cost for an SSO-only internal app; revisit triggers recorded |
| App Service WebJob for payroll | No built-in redundancy, tied to the API's deployment |
| Push the file into the server farm | Needs inbound connectivity and credentials into a system we don't own |
| Service Bus | Storage queues and an outbox cover the volume; Service Bus is the step up if needed |
| AKS / containers | No team need and no scale need; App Service is simpler to run |
| Provisioned SQL, 3-year reserved | Pays for idle capacity; serverless fits a spiky, low load |
| Custom logging service | Application Insights already batches asynchronously |
| Power BI in v1 | Licensing and another copy of salary data; CSV exports first |

The pattern: I rejected things because they cost more than the risk they removed, and I wrote down when
each rejection should be revisited.

Deeper: [ADRs](/posts/projects/dunderly/05-technical-architecture/#architectural-decision-records)

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q5">
<summary>Monolith, modular monolith or microservices, what did you choose and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Modular monolith.** The 2023 case study split it into Employee, Salary and Vacation services, then
correctly chose a single shared data store because the data is shared. Three services on one database is
the worst of both: three pipelines and three App Services (~$219/month in 2023), but no independent
deployability, because a schema change touches all of them.

What I kept from the microservice idea is the **boundary**: modules with their own schema, a contracts
project, and an architecture test that enforces it. The signals that would justify splitting a module out:
a separate team, a separate release cadence, or a separate scaling need. At Dunderly's size none is
expected, but if the payroll module ever had to integrate with a new payroll SaaS on its own cadence, it's
the first candidate.

This is the answer I'd lead with, because it shows I can disagree with an earlier design, my own included.

Deeper: [ADR-001](/posts/projects/dunderly/05-technical-architecture/#architectural-decision-records)

</div>

<div class="iq-role" data-role="developer" markdown="1">

Day to day, a modular monolith means one solution, one debugger session, one transaction when I need one,
and no network calls between modules. The cost is discipline:

- **Schema per module**: `modelBuilder.HasDefaultSchema("salary")` in each `DbContext`.
- **No cross-module joins** in EF; read another module's data through its contract interface.
- **In-process events** for side effects (salary approved → audit event) via a simple dispatcher, and
  the outbox for anything leaving the process.
- **Architecture tests** keep it honest.

```csharp
public sealed class SalaryDbContext(DbContextOptions<SalaryDbContext> o) : DbContext(o)
{
    protected override void OnModelCreating(ModelBuilder b)
    {
        b.HasDefaultSchema("salary");
        b.Entity<SalaryRecord>().ToTable("SalaryRecord", t => t.IsTemporal());
    }
}
```

Deeper: [Data models](/posts/projects/dunderly/05-technical-architecture/#data-architecture-and-data-models)

</div>

<div class="iq-role" data-role="devops" markdown="1">

For DevOps the monolith is a clear win: one API artifact, one App Service plan, one slot swap, one set of
alerts. With three services I'd have three pipelines, three slots and a coordination problem every time a
shared schema changed, because they all shared the database.

What I'd still keep separate is what has a genuinely different lifecycle:

- **Functions**: event and schedule driven, scale to zero, different trigger model.
- **Web**: static hosting with PR previews.
- **Pickup agent**: deployed on-premises with IT, released rarely.

```bash
dotnet publish src/Dunderly.Hr.Api -c Release -o artifacts/api && (cd artifacts/api && zip -r ../api.zip .)
```

Deeper: [Artifacts](/posts/projects/dunderly/12-cicd-and-release-management/#artifact-and-container-management)

</div>

</details>

## Technology Choices
{: #technology-choices }

<details class="project-iq" markdown="1" id="technology-choices-q1">
<summary>Which technologies did you use across the stack, and why those?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Layer | Choice | Why |
|---|---|---|
| Frontend | Blazor WebAssembly + Fluent UI | .NET team, shared validators, Microsoft 365 look |
| Hosting (web) | Static Web Apps Standard | Static files, PR previews; kept from 2023 |
| API | ASP.NET Core minimal APIs on App Service Linux P0v3 | Slots, VNet integration, one plan |
| Background | Azure Functions, Flex Consumption | Timer, queue, Event Grid triggers; scale to zero |
| Data | Azure SQL serverless; Blob Storage | Relational + temporal; documents out of the DB |
| Identity | Entra ID, managed identities, Arc for on-prem | No passwords anywhere |
| Observability | Application Insights via OpenTelemetry | Replaces the custom logging service |
| IaC / CI | Bicep + AVM; GitHub Actions with OIDC | Azure-only estate; no state file |

The client asked for Azure and .NET, so the real choices were inside that box, and most of them were
"which managed service is the smallest that does the job".

Deeper: [Technology selection](/posts/projects/dunderly/05-technical-architecture/#technology-and-framework-selection)

</div>

<div class="iq-role" data-role="developer" markdown="1">

The developer-facing stack and why each piece earns its place:

- **.NET 10 LTS**: support window covers the first years.
- **Minimal APIs**: less ceremony than controllers; `MapGroup` per module and endpoint filters for cross-cutting concerns.
- **EF Core**: migrations, temporal tables, retries; raw SQL via `FromSql` for reports.
- **FluentValidation**: one validator class used in Blazor (`<FluentValidationValidator />`) and the API.
- **Microsoft.Identity.Web / MSAL**: token validation on the API, acquisition in the browser.
- **Fluent UI Blazor**: accessible components.
- **xUnit, Testcontainers, bUnit, Playwright**: tests at every level.

```bash
dotnet add src/Dunderly.Hr.Api package Microsoft.Identity.Web
dotnet list package --vulnerable --include-transitive
```

Deeper: [Dependency management](/posts/projects/dunderly/08-development-preparation/#dependency-management)

</div>

<div class="iq-role" data-role="devops" markdown="1">

- **GitHub Actions** with reusable workflows and environments (dev, test, prod with reviewers).
- **OIDC federated credentials** with `azure/login`, no client secrets.
- **Bicep with Azure Verified Modules** and `.bicepparam` files; `what-if` on every PR.
- **Zip deploy** to App Service and Functions; no containers, no registry to run.
- **EF Core migration bundles** as a self-contained executable.
- **Azure Monitor**: action groups, alerts, workbooks.
- **Azure Arc** to give the on-prem agent a managed identity.

```bash
az deployment sub create -l westeurope -f infra/main.bicep -p infra/env/test.bicepparam
./artifacts/efbundle --connection "<connection string using Active Directory Default auth>"
```

The gap: Flex Consumption has no deployment slots, so Functions deploy without a swap. Their jobs are
idempotent, which is the mitigation.

Deeper: [Build automation](/posts/projects/dunderly/12-cicd-and-release-management/#build-automation)

</div>

</details>

<details class="project-iq" markdown="1" id="technology-choices-q2">
<summary>How do you evaluate and choose between competing technologies?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I score options against the requirements that actually bind, then check the cost of being wrong.

For Dunderly the binding constraints were: Azure and .NET (client), a small team (assumption), 10 users,
sensitive data, a file-only integration. So my questions per choice were:

1. Does the team already know it? (Blazor over React for a .NET team.)
2. Is it the smallest managed service that does the job? (Functions over Batch or Logic Apps.)
3. What does it cost per month at *this* scale? (SQL serverless over reserved provisioned.)
4. How hard is it to reverse? (Bicep vs Terraform: both reversible; a WAF can be added later.)

Then I write an ADR with a "revisit when" line. The Functions decision shows the method: 2023 rejected
Functions as "lightweight"; re-scoring on reliability (queue retries, triggers) rather than weight flipped it.

Deeper: [ADRs](/posts/projects/dunderly/05-technical-architecture/#architectural-decision-records)

</div>

<div class="iq-role" data-role="developer" markdown="1">

I'd evaluate with a spike, not a slide. For Dunderly the one I'd actually run is **Blazor WebAssembly vs a
React SPA**:

- Build the same leave request form both ways in a day.
- Compare: shared validation (Blazor reuses the API's FluentValidation classes; React would duplicate them in
  TypeScript), first-load size, accessibility of the component library, and the team's speed.
- Blazor won on shared code and team fit; React would win on first-load size and the hiring pool.

For libraries, I check license, maintenance (recent releases, issues answered), and whether the
platform already covers it (`TimeProvider` instead of a clock library, `System.Text.Json` instead of
Newtonsoft).

```bash
dotnet new blazorwasm -o spike/BlazorLeave && dotnet run --project spike/BlazorLeave
```

Deeper: [Technology selection](/posts/projects/dunderly/05-technical-architecture/#technology-and-framework-selection)

</div>

</details>

<details class="project-iq" markdown="1" id="technology-choices-q3">
<summary>Where did you build, and where did you buy or reuse?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Bought (as managed services):** hosting, database, storage, identity, malware scanning (Defender for
Storage), monitoring, CI. None of these differentiate an HR system, and the team is too small to run them.

**Built:** the HR domain (salary workflow, leave ledger, payroll run), because the rules are Dunderly's;
and the payroll integration (file writer and pickup agent), because the legacy system's format is unique.

**Considered and not chosen:** a SaaS HR suite. It's the honest alternative, and I'd raise it with the
sponsor: a SaaS HR product could cover most of this. The case for building was the legacy file interface
and the client's explicit request for an Azure/.NET system; if those changed, I'd re-run that decision.
I also kept the exit path clean: no proprietary formats, export via API and SQL.

Deeper: [Decommissioning](/posts/projects/dunderly/18-continuous-improvement/#decommissioning-and-end-of-life-planning)

</div>

<div class="iq-role" data-role="devops" markdown="1">

On the platform side I reuse rather than build:

- **Azure Verified Modules** for Bicep instead of hand-written resource modules.
- **GitHub's own actions** (`azure/login`, `azure/webapps-deploy`, SWA deploy) instead of custom scripts.
- **AzCopy** in the pickup agent instead of writing a transfer client.
- **Azure Monitor** alerts and action groups instead of a separate paging tool.
- **Dependabot, CodeQL, secret scanning** built into GitHub.

What I'd build is thin glue: the reusable deploy workflow, the payroll-freeze check, and the drift what-if job.

```bash
azcopy copy "https://<payroll-account>.blob.core.windows.net/payroll-outbound/2027-03/*" "D:\payroll\incoming" --include-pattern "*.dat;*.json"
```

Deeper: [Integration development](/posts/projects/dunderly/09-implementation/#integration-development)

</div>

</details>

## Frontend Architecture
{: #frontend-architecture }

<details class="project-iq" markdown="1" id="frontend-architecture-q1">
<summary>How is the frontend (or user-facing interface) structured, in terms of framework, routing, components and state?</summary>

<div class="iq-role" data-role="architect" markdown="1">

A Blazor WebAssembly single-page app on Static Web Apps, with navigation shaped by role: everyone gets "Me",
managers add "My team", HR roles add the HR section, and items a role can't use aren't rendered at all.

- **Routing**: `@page` routes per feature, grouped by area (`/me/leave`, `/team/salary-requests`, `/hr/employees/{id}`).
- **Components**: Fluent UI Blazor for the design system; feature components per module.
- **State**: mostly server state, fetched per page; small in-memory caches for reference data; filters in
  the URL so views can be bookmarked.
- **Auth**: MSAL with PKCE; `AuthorizeView` and `[Authorize(Roles=…)]` hide what a role can't use. The API
  enforces it; the UI only avoids showing dead ends.

The employee detail page is the hub for HR (tabs for profile, salary, leave, documents, history), which is
also the UX argument for one API rather than three.

Deeper: [Information architecture](/posts/projects/dunderly/04-user-experience-and-design/#information-architecture)

</div>

<div class="iq-role" data-role="developer" markdown="1">

Blazor concepts, tied to this app:

- **Routable components**: `@page "/team/salary-requests/new/{EmployeeId:int}"` with a typed route parameter.
- **Parameters and state**: `[Parameter] public int EmployeeId`; form model in a private field; `StateHasChanged` rarely needed because events re-render.
- **Lifecycle**: `OnInitializedAsync` loads data; `OnParametersSetAsync` reloads when the route parameter changes.
- **Forms**: `EditForm` + `FluentValidationValidator` with the shared validator; `OnValidSubmit` posts.
- **Auth**: `CascadingAuthenticationState`, `AuthorizeView Roles="HR.Manager"`.
- **HTTP**: typed client generated from OpenAPI, `BaseAddressAuthorizationMessageHandler`-style handler adds the token.
- **DI**: services registered in `Program.cs` of the WASM host.

```razor
<AuthorizeView Roles="HR.Manager">
    <Authorized><FluentButton OnClick="ApproveAsync" Disabled="@isOwnRequest">Approve</FluentButton></Authorized>
</AuthorizeView>
```

```bash
dotnet watch --project src/Dunderly.Hr.Web
```

Deeper: [API and UI implementation](/posts/projects/dunderly/09-implementation/#api-and-ui-implementation)

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-architecture-q2">
<summary>How does the user interface handle loading, errors and large data sets?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Large data sets barely exist here (500 employees, an audit log that grows slowly), so the patterns are
simple and consistent:

- **Loading**: skeletons on first load, inline progress on actions; buttons disable while submitting so a
  double click can't approve twice (and the API is idempotent anyway).
- **Errors**: problem details from the API map to plain messages ("March payroll is already closed"), shown
  inline until fixed. A correlation ID is shown on unexpected errors so support can find the trace.
- **Large lists**: server-side paging, search and filters for employees and the audit log, with filters in
  the URL. Virtualization only for the audit view.
- **Concurrency**: a 412 from the API shows "someone changed this record" with the differences.

Deeper: [Interaction patterns](/posts/projects/dunderly/04-user-experience-and-design/#interaction-patterns)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Conditional rendering**: `@if (employees is null) { <FluentSkeleton /> } else if (error is not null) { … }`.
- **Paging**: `FluentDataGrid` with an `ItemsProvider` that calls `GET /employees?page=&pageSize=`.
- **Virtualization**: `<Virtualize ItemsProvider="LoadAuditAsync">` for the audit log.
- **Errors**: a `DelegatingHandler` turns problem details into a typed `ApiError`; an `ErrorBoundary` catches render failures.
- **Navigation state**: `NavigationManager` and `[SupplyParameterFromQuery]` keep filters in the URL.

```csharp
private async ValueTask<GridItemsProviderResult<EmployeeRow>> LoadAsync(GridItemsProviderRequest<EmployeeRow> req)
{
    var page = await api.GetEmployeesAsync(search, req.StartIndex / PageSize + 1, PageSize, req.CancellationToken);
    return GridItemsProviderResult.From(page.Items, page.TotalCount);
}
```

The gotcha: Blazor WASM's first download is larger than a JS SPA's; on office networks it's fine, on a
phone over 4G the first load needs watching.

Deeper: [Responsive behavior](/posts/projects/dunderly/04-user-experience-and-design/#responsive-behavior)

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-architecture-q3">
<summary>How do you keep the frontend fast and accessible?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Fast:** static hosting at the edge, AOT or trimmed WASM bundles, lazy-loaded assemblies for the HR-only
sections so employees never download them, and an API that answers in under 500 ms at p95. The one real
risk is first load on phones, so I'd measure it.

**Accessible:** WCAG 2.2 AA designed in: Fluent UI components with keyboard and ARIA support, visible focus,
4.5:1 contrast, labels and linked error messages, a list alternative to the leave calendar, session-timeout
warnings, 24 px targets. Then axe in every E2E run, and a manual keyboard and screen-reader pass per release.
Automated tools catch only part of the problems, so the manual pass isn't optional.

Deeper: [Accessibility design](/posts/projects/dunderly/04-user-experience-and-design/#accessibility-design),
[Accessibility testing](/posts/projects/dunderly/10-quality-assurance/#accessibility-testing)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Trimming and compression**: `PublishTrimmed` (default for WASM), Brotli served by Static Web Apps.
- **Lazy loading**: HR and payroll pages in separate assemblies loaded with `LazyAssemblyLoader` on navigation.
- **Avoid re-renders**: `@key` on list items, `ShouldRender` for heavy components, no work in `OnAfterRender`.
- **Accessibility in markup**: `Label` on every Fluent input; `aria-describedby` for errors; focus the first
  invalid field on submit.

```xml
<ItemGroup>
  <BlazorWebAssemblyLazyLoad Include="Dunderly.Hr.Web.Hr.wasm" />
  <BlazorWebAssemblyLazyLoad Include="Dunderly.Hr.Web.Payroll.wasm" />
</ItemGroup>
```

```bash
npx playwright test --project=chromium   # E2E with axe checks
```

Deeper: [Visual design](/posts/projects/dunderly/04-user-experience-and-design/#visual-design-and-design-system)

</div>

<div class="iq-role" data-role="sre" markdown="1">

I'd watch the frontend as users feel it:

- **Client telemetry**: Application Insights JS SDK for page views and failed calls only; page load times by
  route and device type.
- **Availability test**: a standard test from three locations hitting `/health`, plus the static site root.
- **Signals**: p95 first-load time for the home page, client error rate, and API p95 for the calls each page makes.

```kusto
pageViews | where timestamp > ago(7d)
| summarize p95=percentile(duration,95), n=count() by name, client_Type
```

The gap: synthetic tests can't sign in with MFA, so they check the static site and health endpoints, not a
real signed-in journey. Real-user page timings cover that.

Deeper: [Monitoring](/posts/projects/dunderly/14-operations-and-observability/#application-and-infrastructure-monitoring)

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-architecture-q4">
<summary>How is the frontend built, configured per environment and served?</summary>

<div class="iq-role" data-role="architect" markdown="1">

`dotnet publish` produces static files (`wwwroot`), deployed to Static Web Apps. Per-environment settings
are only public values (API base URL, client ID, scope), written into `wwwroot/appsettings.json` by the
pipeline. Nothing secret can go there: everything in a WebAssembly app is downloadable.

Static Web Apps gives a custom domain with a managed certificate, HTTP security headers via
`staticwebapp.config.json`, a fallback route so deep links reach the SPA, and a preview environment per pull
request, which is how HR reviews UI changes before they merge.

Deeper: [Environment configuration](/posts/projects/dunderly/08-development-preparation/#environment-configuration)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- `Program.cs` reads `builder.Configuration["Api:BaseUrl"]`; `wwwroot/appsettings.{Environment}.json` per environment.
- The environment comes from the `Blazor-Environment` header, which Static Web Apps can set per environment.
- MSAL settings (`Authority`, `ClientId`, `DefaultScopes`) bind from config.

```json
{
  "navigationFallback": { "rewrite": "/index.html", "exclude": ["/_framework/*", "/css/*"] },
  "globalHeaders": {
    "Content-Security-Policy": "default-src 'self'; connect-src 'self' https://hr-api.<company domain> https://login.microsoftonline.com",
    "X-Content-Type-Options": "nosniff"
  }
}
```

```bash
dotnet publish src/Dunderly.Hr.Web -c Release -o artifacts/web
```

Deeper: [Build automation](/posts/projects/dunderly/12-cicd-and-release-management/#build-automation)

</div>

<div class="iq-role" data-role="devops" markdown="1">

The web deploy is the last step of a release, so the UI never calls an API older than itself:

{% raw %}
```yaml
- uses: Azure/static-web-apps-deploy@v1
  with:
    azure_static_web_apps_api_token: ${{ secrets.SWA_TOKEN }}
    action: upload
    app_location: artifacts/web/wwwroot
    skip_app_build: true
```
{% endraw %}

- On PRs the same action creates a **preview environment** with its own URL; it's deleted on close.
- The `appsettings.json` rewrite per environment is a small `jq` step on the artifact.
- The deployment token is the one credential I can't replace with OIDC here, so it's an environment
  secret, rotated yearly.

Deeper: [Deployment automation](/posts/projects/dunderly/12-cicd-and-release-management/#deployment-automation)

</div>

</details>

## Backend and API Design
{: #backend-and-api-design }

<details class="project-iq" markdown="1" id="backend-and-api-design-q1">
<summary>How do CRUD operations work in the backend, from request to persisted data?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Take "update employee": the request carries the row version in `If-Match`. The endpoint checks the role
(`HR.Admin`), validates the body with the shared validator, loads the aggregate, applies the change through
domain methods that enforce rules, and saves in one transaction that also writes an audit event. EF Core's
concurrency token turns a stale row version into 412. The response returns the new version.

Three design rules make CRUD safe for HR:

- **Delete is deactivation** (`POST …/deactivation`), because records have retention periods.
- **History is automatic**: `EMPLOYEE` and `SALARY_RECORD` are temporal tables.
- **Audit in the same transaction**, so a change can't happen without its record.

Deeper: [API architecture](/posts/projects/dunderly/05-technical-architecture/#api-and-integration-architecture)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Routing**: `MapPut("/employees/{id:int}", Update)` with a route constraint.
- **Binding**: body to a record DTO; `[FromHeader(Name = "If-Match")]` for the version.
- **Validation**: an endpoint filter runs FluentValidation and returns 400 with problem details.
- **DI**: `EmployeesDbContext` and `IAuditWriter` injected.
- **Concurrency**: `Property(e => e.RowVersion).IsRowVersion()`; catch `DbUpdateConcurrencyException`.

```csharp
static async Task<IResult> Update(int id, UpdateEmployee dto, [FromHeader(Name = "If-Match")] string etag,
    EmployeesDbContext db, IAuditWriter audit, ClaimsPrincipal user, CancellationToken ct)
{
    var e = await db.Employees.FindAsync([id], ct);
    if (e is null) return Results.NotFound();
    db.Entry(e).Property(x => x.RowVersion).OriginalValue = Convert.FromBase64String(etag);
    var before = e.Snapshot(); e.Apply(dto);
    audit.Add("EmployeeUpdated", id, before, e.Snapshot(), user.GetObjectId());
    try { await db.SaveChangesAsync(ct); } catch (DbUpdateConcurrencyException) { return Results.StatusCode(412); }
    return Results.Ok(e.ToDto());
}
```

Deeper: [Feature development](/posts/projects/dunderly/09-implementation/#feature-development)

</div>

</details>

<details class="project-iq" markdown="1" id="backend-and-api-design-q2">
<summary>How did you design the API, in terms of style, resources, versioning, pagination and errors?</summary>

<div class="iq-role" data-role="architect" markdown="1">

- **Style**: REST over HTTPS, JSON, OpenAPI generated from code. Commands that aren't CRUD are modelled as
  sub-resources: `POST /salary-requests/{id}/approval`, `…/rejection`, `…/withdrawal`. It keeps the 2023
  case study's shape and makes each action separately authorizable and auditable.
- **Resources**: plural nouns everywhere (`/employees`, `/salary-requests`, `/payroll-runs`). The 2023
  tables mixed `employee` and `employees`; I normalized them.
- **Versioning**: path (`/api/v1`). With one client in the same repo, a v2 should never be needed.
- **Pagination**: `page` and `pageSize` (max 100), with `totalCount` in the response.
- **Errors**: RFC 9457 problem details with a stable `type` per business rule, so the UI can show a
  specific message.

Deeper: [API table](/posts/projects/dunderly/05-technical-architecture/#api-and-integration-architecture),
[REST API](/posts/communication/api/rest-api/)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- `builder.Services.AddOpenApi()` and `app.MapOpenApi()` for the document; typed results (`Results<Ok<T>, NotFound>`) so the schema is accurate.
- `AddProblemDetails()` plus an exception handler; business failures return `Results.Problem(type: "https://errors.<domain>/period-closed", …)`.
- Paging as a reusable record: `record Page<T>(IReadOnlyList<T> Items, int TotalCount)`.
- `WithTags`, `WithSummary` and `Produces` on endpoints for docs.

```csharp
g.MapGet("/", async ([AsParameters] EmployeeQuery q, EmployeesDbContext db, CancellationToken ct) =>
{
    var query = db.Employees.AsNoTracking().Where(e => q.Name == null || e.LastName.StartsWith(q.Name));
    var total = await query.CountAsync(ct);
    var items = await query.OrderBy(e => e.LastName).Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
        .Select(e => new EmployeeRow(e.EmployeeId, e.FirstName, e.LastName)).ToListAsync(ct);
    return TypedResults.Ok(new Page<EmployeeRow>(items, total));
});
```

Deeper: [Developer documentation](/posts/projects/dunderly/09-implementation/#developer-documentation)

</div>

</details>

<details class="project-iq" markdown="1" id="backend-and-api-design-q3">
<summary>How is the backend structured internally, and where does background work run?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Internally it's a **modular monolith**: modules for Employees (with Documents), Salary, Leave, Payroll and
Audit, each with domain, application and infrastructure layers and a contracts project. Cross-module calls go
through contracts; the architecture test enforces it.

**Background work never runs in the API process.** It runs in the Functions app:

| Job | Trigger |
|---|---|
| Draft payroll run | Timer, on cutoff day |
| Write payroll file | Storage queue `payroll-approved` |
| Mark run delivered | Event Grid, receipt blob created |
| Promote scanned document | Event Grid, Defender scan result |
| Send notifications | Timer, reads the outbox |
| Retention purge | Timer, monthly |

Why not hosted services in the API? Deployment slots: during a swap, two copies of the API run, and a
`BackgroundService` would run twice.

Deeper: [System context](/posts/projects/dunderly/05-technical-architecture/#system-context-and-component-architecture)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Layers per module**: `Domain` (entities, rules), `Application` (use cases like `SalaryService.ApproveAsync`),
  `Infrastructure` (EF config, Blob client), `Contracts` (interfaces other modules may use).
- **Registration**: each module exposes `AddSalary(IServiceCollection, IConfiguration)` and `MapSalary(RouteGroupBuilder)`.
- **Functions (isolated worker)**: `[QueueTrigger]`, `[TimerTrigger("0 0 6 * * *")]`, `[EventGridTrigger]`;
  they reference the same module projects, so business rules aren't duplicated.

```csharp
[Function("CreatePayrollRun")]
public Task Run([TimerTrigger("0 0 6 * * *")] TimerInfo t, CancellationToken ct)
    => payroll.CreateDraftIfCutoffTodayAsync(ct);   // no-op on other days; idempotent per period
```

The gotcha: the Functions app and the API must deploy compatible versions of the shared modules, which is
why they come from the same build.

Deeper: [Integration development](/posts/projects/dunderly/09-implementation/#integration-development)

</div>

<div class="iq-role" data-role="devops" markdown="1">

Two hosts, two plans, one build:

- **API**: App Service plan P0v3, Linux, `healthCheckPath: /health/live`, VNet integration, staging slot.
- **Functions**: Flex Consumption with VNet integration; storage queue and Event Grid subscriptions in Bicep.
- **Identities**: system-assigned managed identity each, with role assignments in Bicep (Storage Queue Data
  Contributor for the API on `payroll-approved`, Storage Blob Data Contributor for Functions on outbound).

```bash
az functionapp function list -g rg-dunderly-hr-prod -n func-dunderly-hr-prod -o table
az storage message peek --queue-name payroll-approved-poison --account-name <acct> --auth-mode login
```

The thing I'd check after each deploy: Event Grid subscriptions still point at the right function, because a
renamed function silently breaks them.

Deeper: [Compute, storage, and databases](/posts/projects/dunderly/11-infrastructure-and-environments/#compute-storage-and-databases)

</div>

</details>

<details class="project-iq" markdown="1" id="backend-and-api-design-q4">
<summary>How do you validate input and keep operations safe to repeat?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Validate** at the edge with shared FluentValidation rules, in the domain for business rules (period
closed, four eyes), and in the database as the last line (check constraints, unique keys, foreign keys).
Uploads add type checks by magic bytes, a size limit and malware scanning.

**Safe to repeat**:

- Commands are state transitions: approving an already-approved request returns 409, not a second salary row.
- `If-Match` row versions stop lost updates.
- The payroll file name includes the run ID, the container is immutable, and the writer exits early if the
  blob exists; queue retries can't produce a second file.
- The outbox marks messages sent; a re-run won't email twice.
- The migration tool upserts by employee number, so rehearsals can run repeatedly.

Deeper: [Input validation](/posts/projects/dunderly/06-security-and-privacy/#input-validation-and-secure-coding)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Endpoint filter** for validation, so handlers only see valid input.
- **State machine in the domain**: `Approve()` throws a domain error unless `Status == Submitted`.
- **Idempotent consumer** in Functions: check-then-write with the blob's existence, and blob immutability as the backstop.

```csharp
public sealed class ValidationFilter<T>(IValidator<T> validator) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        var arg = ctx.Arguments.OfType<T>().Single();
        var result = await validator.ValidateAsync(arg);
        return result.IsValid ? await next(ctx) : Results.ValidationProblem(result.ToDictionary());
    }
}
```

The gotcha: "exists then upload" isn't atomic; two concurrent executions could race. The immutable container
(and `If-None-Match: *` on upload) makes the second one fail instead of overwriting.

Deeper: [Integration development](/posts/projects/dunderly/09-implementation/#integration-development)

</div>

<div class="iq-role" data-role="sre" markdown="1">

What I'd watch so "safe to repeat" stays true in production:

- **Poison queue depth** on `payroll-approved-poison`: any message is a Sev 2.
- **409 rate** on approval endpoints: a spike means a UI double-submit bug or a race.
- **Duplicate detection query**: more than one file per payroll period, which should be impossible.
- **Retry behaviour**: Functions queue retries with backoff (max dequeue 5), SQL retry on transient errors.

```kusto
requests | where name has "approval" and resultCode == "409"
| summarize count() by bin(timestamp, 1h)
```

Deeper: [Alerting](/posts/projects/dunderly/14-operations-and-observability/#alerting-and-escalation)

</div>

</details>

## Database and Data Modeling
{: #database-and-data-modeling }

<details class="project-iq" markdown="1" id="database-and-data-modeling-q1">
<summary>Which data store did you choose, and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Azure SQL Database (serverless, General Purpose)** for records, and **Blob Storage** for documents.

Why relational: the data is relational (employees, managers, salaries, requests, payroll lines), the rules
need transactions (approve + new salary row + audit in one commit), and HR history needs **temporal tables**,
which Azure SQL gives natively. Why serverless: 10 users and a spiky month-end don't justify the 2023
estimate's reserved provisioned database ($256.63/month); serverless bills per second of use. Why Blob for
documents: ~25 GB of scans would bloat backups and cost more in the database.

Trade-off I'd name: serverless can auto-pause, and a one-minute resume on Monday morning is a bad first
impression, so auto-pause is off in production and on in dev and test.

Deeper: [ADR-008](/posts/projects/dunderly/05-technical-architecture/#architectural-decision-records)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **EF Core** with the SQL Server provider, one `DbContext` per module schema.
- **Entra-only auth**: connection string with `Authentication=Active Directory Default`; the managed identity
  in Azure, my own account locally against a dev database, or SQL auth only to the local container.
- **Resiliency**: `EnableRetryOnFailure()` for transient errors.
- **Temporal queries**: `TemporalAsOf` to answer "what was the salary on date X".

```csharp
var march = await db.SalaryRecords.TemporalAsOf(new DateTime(2027, 3, 31))
    .Where(s => s.EmployeeId == id).ToListAsync(ct);
```

```bash
dotnet ef dbcontext info --context SalaryDbContext
```

Deeper: [Data architecture](/posts/projects/dunderly/05-technical-architecture/#data-architecture-and-data-models)

</div>

<div class="iq-role" data-role="devops" markdown="1">

Provisioned in Bicep:

- Logical server with **Entra-only authentication** and an Entra admin group; no SQL logins.
- Database `GP_S_Gen5` serverless, max 2 vCores; `autoPauseDelay: -1` in prod, 60 in dev/test.
- Public network access disabled; private endpoint in `snet-pe`; private DNS zone linked.
- Backups: PITR 35 days, LTR policy, geo-redundant backup storage.
- Auditing to Log Analytics.
- Contained users for the API (DML) and the pipeline (DDL), created by a deployment script.

```bash
az sql db show -g rg-dunderly-hr-prod -s sql-dunderly-hr-prod -n sqldb-hr --query "{sku:sku.name,autoPause:autoPauseDelay}"
```

Deeper: [Compute, storage, and databases](/posts/projects/dunderly/11-infrastructure-and-environments/#compute-storage-and-databases)

</div>

</details>

<details class="project-iq" markdown="1" id="database-and-data-modeling-q2">
<summary>How is the data modeled, and how did the access patterns shape the model?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Three access patterns shaped the model:

1. **"What was X paid on date Y?"** → salaries as effective-dated rows, never updated, plus temporal tables.
2. **"How many leave days are left, and why?"** → a leave ledger (entitlements, bookings, adjustments);
   the balance is a sum, every number explainable.
3. **"What exactly did we send in March?"** → payroll runs snapshot their lines; later edits can't change a
   file that's gone.

Plus the reporting line (`ManagerId` self-reference) because authorization depends on it, and an append-only
audit table. Each module owns a schema. Indexes on every foreign key and on `(EmployeeId, EffectiveFrom)`.

The ER diagram is in the playbook; the case study's "1 MB per employee" means the whole relational store stays
under 1 GB for years, so modelling for clarity beats modelling for performance here.

Deeper: [Data models](/posts/projects/dunderly/05-technical-architecture/#data-architecture-and-data-models)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Entities and value objects**: `Money(decimal Amount, string Currency)` as an owned type; `DateOnly` for dates.
- **Self-reference**: `HasOne(e => e.Manager).WithMany().HasForeignKey(e => e.ManagerId)`.
- **Ledger balance**: a query, not a stored column.
- **Temporal**: `ToTable("Employee", t => t.IsTemporal())`.

```csharp
public Task<decimal> GetBalanceAsync(int employeeId, int year, CancellationToken ct) =>
    db.LeaveEntries.Where(l => l.EmployeeId == employeeId && l.Year == year && l.Status != LeaveStatus.Rejected)
        .SumAsync(l => l.Type == LeaveType.Entitlement ? l.Days : -l.Days, ct);
```

The gotcha: storing the balance would be faster, but then it can drift from the ledger. At 500 employees the
sum is cheap.

Deeper: [Data validation](/posts/projects/dunderly/07-data-and-integration/#data-validation-and-quality)

</div>

</details>

<details class="project-iq" markdown="1" id="database-and-data-modeling-q3">
<summary>How were schema changes and data migrations handled?</summary>

<div class="iq-role" data-role="architect" markdown="1">

EF Core code-first migrations, one history per module schema, reviewed in PRs, shipped as a **migration
bundle** that the pipeline runs before deploying code. The rule that makes it safe is **expand, then
contract**: a release only adds; removals come a release later. That's what lets the old and new API versions
both run during a slot swap.

Data migration from the old records (assumed spreadsheets and a file share, ~2,500 documents at 250
employees) is a separate idempotent tool, rehearsed three times on a locked-down copy, with reconciliation of
headcount, salary totals, leave totals and document hashes.

Deeper: [Schema and migrations](/posts/projects/dunderly/07-data-and-integration/#database-schema-and-migrations),
[Data migration](/posts/projects/dunderly/07-data-and-integration/#data-migration-and-reconciliation)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```bash
dotnet ef migrations add AddLeaveCarryOver --project src/Dunderly.Hr.Api --context LeaveDbContext
dotnet ef migrations script --idempotent --context LeaveDbContext -o out/leave.sql   # to review the SQL
dotnet ef migrations bundle --project src/Dunderly.Hr.Api --self-contained -r linux-x64 -o artifacts/efbundle
```

- **Review the generated SQL**, not just the C#: a rename can be generated as drop + add, which loses data.
- **Expand-only**: new columns nullable or with defaults; a column drop waits for the next release.
- **Data fixes** go in the migration with `migrationBuilder.Sql(...)` only if they're small and idempotent;
  otherwise a one-off tool.
- **Temporal tables** need care: altering a temporal table's columns updates the history table too, which EF handles,
  but review it.

Deeper: [Database deployment](/posts/projects/dunderly/12-cicd-and-release-management/#database-deployment-strategy)

</div>

<div class="iq-role" data-role="devops" markdown="1">

In the release workflow: record the time (for point-in-time restore), run the bundle as the pipeline's
identity (the only principal with DDL), then deploy the API to the staging slot.

```bash
date -u +%Y-%m-%dT%H:%M:%SZ > restore-point.txt
./artifacts/efbundle --connection "Server=tcp:<server>.database.windows.net;Database=sqldb-hr;Authentication=Active Directory Default"
```

If a migration fails, nothing has been deployed yet, so production keeps running the old code against a
schema that's either unchanged or only expanded. For the rare bad data change, PITR to a new database at the
recorded time, then repair.

Deeper: [Rollback](/posts/projects/dunderly/12-cicd-and-release-management/#rollback-and-roll-forward-procedures)

</div>

</details>

<details class="project-iq" markdown="1" id="database-and-data-modeling-q4">
<summary>How do you handle data retention, backup and restore?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Retention** is data-driven: a monthly job anonymizes personal fields and deletes documents once a leaver's
records pass their retention date, keeping minimal payroll facts if tax law needs them longer. Payroll files
sit in an immutable container for the retention period.

> **TODO:** Retention periods per data set from Dunderly's legal advisor; under GDPR (assumption A2), "keep
> forever" isn't an option.
{: .prompt-warning }

**Backup**: SQL automatic backups with 35-day PITR and long-term retention, geo-redundant; Blob versioning,
soft delete and GRS. **Restore** is tested quarterly, which is when a backup becomes a real thing.

Deeper: [Retention](/posts/projects/dunderly/07-data-and-integration/#data-retention-and-deletion),
[Backup and restore](/posts/projects/dunderly/07-data-and-integration/#backup-and-restore-strategy)

</div>

<div class="iq-role" data-role="devops" markdown="1">

Configured in Bicep, not the portal:

- SQL: `shortTermRetentionPolicies` 35 days; `longTermRetentionPolicies` (monthly 12 months, yearly for the legal period); `requestedBackupStorageRedundancy: 'Geo'`.
- Blob: `isVersioningEnabled`, `deleteRetentionPolicy` 30 days, lifecycle rule to cool after 180 days.
- Payroll container: time-based immutability policy.

```bash
az sql db restore -g rg-dunderly-hr-prod -s sql-dunderly-hr-prod -n sqldb-hr \
  --dest-name sqldb-hr-restoretest --time "2027-03-14T09:00:00Z"
az storage blob list --account-name <docs-acct> -c documents --include v --prefix <docId> --auth-mode login
```

Deeper: [Backup verification](/posts/projects/dunderly/16-support-and-maintenance/#backup-verification)

</div>

<div class="iq-role" data-role="sre" markdown="1">

Backups only count once restored. The SRE routine:

- **Quarterly** PITR restore into an isolated resource group, row-count and checksum checks, then delete.
  The time it takes is our measured RTO for data loss.
- **Quarterly** restore of a deleted document version.
- **Yearly** DR drill: geo-restore in North Europe and rebuild compute from Bicep; measure against the
  one-business-day RTO (assumption A7).

RPO: SQL log backups every 5 to 10 minutes give a PITR RPO of minutes; geo-restore across regions is
looser (up to about an hour).

> **TODO:** Is a 15-minute RPO firm for a regional outage? If so, an auto-failover group is needed, at the
> cost of a second database.
{: .prompt-warning }

Deeper: [Disaster recovery testing](/posts/projects/dunderly/16-support-and-maintenance/#disaster-recovery-testing)

</div>

</details>

## Frontend, Backend and Database Communication
{: #frontend-backend-and-database-communication }

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q1">
<summary>How does the frontend connect to the backend?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The Blazor app calls the API directly over HTTPS at its own hostname (`hr-api.<company domain>`), with an
Entra ID access token in the `Authorization` header. CORS on the API allows only the web app's origin.

I considered the Static Web Apps linked-backend feature (proxy `/api` to App Service, same origin, no CORS).
I chose direct calls with MSAL because the API's authorization is built on Entra **app roles** in the JWT,
which is standard and well supported by `Microsoft.Identity.Web`, while Static Web Apps' built-in auth
would put its own principal header in between and need extra role mapping. The cost is a CORS policy and a
second public hostname, both easy to get right.

No WAF in front (ADR-004): the API requires a valid token on every endpoint except health, and has rate limiting.

Deeper: [Identity and access](/posts/projects/dunderly/05-technical-architecture/#identity-and-access-architecture)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **MSAL in Blazor**: `AddMsalAuthentication` with the API scope as a default scope.
- **Message handler**: an `AuthorizationMessageHandler` configured for the API base URL attaches tokens and
  handles `AccessTokenNotAvailableException` by redirecting to sign-in.
- **Typed client**: generated from OpenAPI, registered with `AddHttpClient<HrApiClient>`.
- **CORS on the API**: one named policy, the web origin only.

```csharp
builder.Services.AddHttpClient<HrApiClient>(c => c.BaseAddress = new Uri(apiBase))
    .AddHttpMessageHandler(sp => sp.GetRequiredService<AuthorizationMessageHandler>()
        .ConfigureHandler(authorizedUrls: [apiBase], scopes: [$"api://{apiClientId}/HR.Access"]));
```

```csharp
builder.Services.AddCors(o => o.AddPolicy("web", p => p.WithOrigins(webOrigin).AllowAnyHeader().AllowAnyMethod()));
```

Deeper: [Authentication and authorization](/posts/projects/dunderly/06-security-and-privacy/#authentication-and-authorization)

</div>

<div class="iq-role" data-role="devops" markdown="1">

- Two custom domains, both with managed certificates: `hr.<company domain>` (Static Web Apps) and
  `hr-api.<company domain>` (App Service).
- The API's allowed CORS origin and the web app's API base URL both come from Bicep outputs, so they can't
  disagree between environments.
- App Service: `httpsOnly`, minimum TLS 1.2, HTTP/2 on.

```bash
az webapp config hostname add -g rg-dunderly-hr-prod --webapp-name app-dunderly-hr-api-prod --hostname hr-api.<company domain>
az staticwebapp hostname set -n swa-dunderly-hr-prod --hostname hr.<company domain>
```

> **TODO:** Dunderly's domain and who manages its DNS.
{: .prompt-warning }

Deeper: [Networking and DNS](/posts/projects/dunderly/11-infrastructure-and-environments/#networking-and-dns)

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q2">
<summary>Trace a single user request from the browser to the data store and back.</summary>

<div class="iq-role" data-role="architect" markdown="1">

"HR manager approves a salary request":

| Hop | What happens |
|---|---|
| Browser | Blazor posts `POST /api/v1/salary-requests/42/approval` with the row version and a bearer token |
| API middleware | TLS ends at App Service; JWT validated (issuer, audience, signature); role `HR.Manager` checked |
| Endpoint | Validation filter; `SalaryService.ApproveAsync` loads request 42 |
| Domain | Status must be Submitted; approver ≠ requester; effective date not in a closed period |
| SQL (private endpoint) | One transaction: request → Approved, new `SALARY_RECORD`, audit event, outbox row; row version checked |
| Response | 200 with the updated request; or 403, 404, 409, 412 as problem details |
| Later | Outbox Function emails the manager (no amount in the email) |

One trace ID follows it through, visible in Application Insights.

Deeper: [Salary journey](/posts/projects/dunderly/02-requirements-gathering/#user-journeys-and-use-cases)

</div>

<div class="iq-role" data-role="developer" markdown="1">

In code, the same request:

```csharp
// Application layer
public async Task<OneOf<SalaryRequestDto, NotFound, SelfDecision, Conflict>> ApproveAsync(
    int id, Guid approver, byte[] rowVersion, CancellationToken ct)
{
    var req = await db.Requests.SingleOrDefaultAsync(r => r.Id == id, ct);
    if (req is null) return new NotFound();
    if (req.RequestedBy == approver) return new SelfDecision();
    db.Entry(req).Property(r => r.RowVersion).OriginalValue = rowVersion;
    var record = req.Approve(approver, time.GetUtcNow());          // domain rules
    db.SalaryRecords.Add(record);
    audit.Add("SalaryApproved", req.Id, approver); outbox.Add(Notify.Requester(req));
    try { await db.SaveChangesAsync(ct); } catch (DbUpdateConcurrencyException) { return new Conflict(); }
    return req.ToDto();
}
```

One `SaveChangesAsync` means one transaction for the request, the new salary row, the audit event and the
outbox message.

Deeper: [API and UI implementation](/posts/projects/dunderly/09-implementation/#api-and-ui-implementation)

</div>

<div class="iq-role" data-role="sre" markdown="1">

I'd follow the trace, not guess. The UI shows the correlation ID on errors, and from there:

```kusto
union requests, dependencies, exceptions, traces
| where operation_Id == "<trace id>"
| project timestamp, itemType, name, duration, resultCode, message
| order by timestamp asc
```

Where time goes on this path: token validation (cached signing keys, microseconds), the SQL round trips
(two or three, single-digit milliseconds over the private endpoint), and the commit. If p95 drifts above
500 ms, the first suspects are SQL serverless scaling or an N+1 in a list endpoint, not this write.

Deeper: [Distributed tracing](/posts/projects/dunderly/14-operations-and-observability/#distributed-tracing)

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q3">
<summary>How does the backend connect to the data store, and how are connections, timeouts and concurrency handled?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The API connects to Azure SQL through a **private endpoint** using its **managed identity** (Entra-only
authentication), so there's no password and no public path.

- **Connections**: ADO.NET connection pooling via EF Core; one `DbContext` per request (scoped). At 10
  concurrent users, the default pool is far more than enough.
- **Timeouts**: command timeout 30 s by default; reports get their own higher timeout; HTTP requests honour
  cancellation tokens so an abandoned request stops its query.
- **Transient faults**: `EnableRetryOnFailure` with backoff, which matters for serverless scaling events.
- **Concurrency**: optimistic, with `rowversion` on aggregates that people edit; SQL's default READ COMMITTED
  SNAPSHOT isolation in Azure SQL avoids readers blocking writers.

Deeper: [Hosting](/posts/projects/dunderly/05-technical-architecture/#hosting-and-deployment-model)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```csharp
builder.Services.AddDbContext<SalaryDbContext>(o => o.UseSqlServer(
    builder.Configuration.GetConnectionString("Hr"),   // Authentication=Active Directory Default
    sql => { sql.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null); sql.CommandTimeout(30); }));
```

- **Scoped `DbContext`**, never shared across threads.
- **`AsNoTracking`** for reads; projections to DTOs so only needed columns are fetched.
- **Cancellation tokens** passed into every EF call.
- **Retry + transactions**: with a retrying strategy, explicit transactions go through
  `db.Database.CreateExecutionStrategy().ExecuteAsync(...)`, otherwise EF throws.

That last one is the gotcha that bites people the first time they combine retries with a manual transaction.

Deeper: [Coding standards](/posts/projects/dunderly/08-development-preparation/#coding-standards)

</div>

<div class="iq-role" data-role="sre" markdown="1">

- **Dependency telemetry** for every SQL call (duration, success) from OpenTelemetry.
- **SQL metrics**: CPU %, app CPU billed, and resume events for serverless; connections count.
- **Alert** on dependency failure rate rather than raw SQL CPU, because users feel failures, not CPU.

```kusto
dependencies | where type == "SQL" and timestamp > ago(1d)
| summarize p95=percentile(duration,95), failures=countif(success == false) by bin(timestamp, 15m)
```

The gotcha: on a serverless database with auto-pause (dev and test), the first request after a pause waits
for resume. That's why auto-pause is off in production, and why perf tests don't run against a paused DB.

Deeper: [Health checks](/posts/projects/dunderly/14-operations-and-observability/#health-checks)

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q4">
<summary>Where do you cache, and how do you keep cached data correct?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Very little, on purpose, because stale HR data is worse than slow HR data:

| What | Where | TTL | Why it's safe |
|---|---|---|---|
| Reference data (departments, leave types, public holidays) | API in-memory | 10 min | Changes rarely; HR edits evict it |
| Entra signing keys | Microsoft.Identity.Web | Library default | Standard |
| Static web assets | Static Web Apps / browser | Fingerprinted, long | New build = new file names |

Not cached: salaries, balances, anything user-specific. With 10 users and a sub-1 GB database, SQL answers
those fast enough. No Redis: it would add a service, a cost and a place where salary data could linger.

If two API instances run, each has its own memory cache; a reference-data edit evicts locally and the other
instance catches up within the TTL, which is acceptable for public holidays.

Deeper: [Scalability](/posts/projects/dunderly/05-technical-architecture/#scalability-and-performance-strategy)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```csharp
public Task<IReadOnlyList<LeaveType>> GetLeaveTypesAsync(CancellationToken ct) =>
    cache.GetOrCreateAsync("leave-types", async e =>
    {
        e.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);
        return (IReadOnlyList<LeaveType>)await db.LeaveTypes.AsNoTracking().ToListAsync(ct);
    })!;

public async Task UpdateLeaveTypeAsync(LeaveType t, CancellationToken ct)
{
    db.Update(t); await db.SaveChangesAsync(ct);
    cache.Remove("leave-types");                          // evict on write
}
```

`IMemoryCache` (or `HybridCache` if we ever add a distributed layer). Keys are constants per data set; no
user-specific keys, so there's no risk of serving one person's data to another.

Deeper: [Technology selection](/posts/projects/dunderly/05-technical-architecture/#technology-and-framework-selection)

</div>

<div class="iq-role" data-role="sre" markdown="1">

With so little cached, the cache can't cause an outage, which is the point. Two things I'd still check:

- After an HR edit to public holidays, the leave calendar can be up to 10 minutes stale on the other
  instance. If HR reports "my change didn't show", that's the first answer.
- Memory: reference data is tiny, so the App Service memory metric shouldn't move. If it does, something
  is caching what it shouldn't.

```bash
az monitor metrics list --resource <app-service-plan-id> --metric MemoryPercentage --interval PT1H
```

Deeper: [Troubleshooting guides](/posts/projects/dunderly/15-documentation-and-knowledge-transfer/#troubleshooting-guides)

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q5">
<summary>Where did you use synchronous and where asynchronous communication, and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Synchronous** for everything a user waits on: browser to API, API to SQL and Blob. The user needs the
answer ("approved", "403", "period closed") now, and at this scale the calls are fast.

**Asynchronous** where work must survive a failure, runs on a schedule, or reacts to an event:

| Flow | Mechanism | Why async |
|---|---|---|
| Payroll file after approval | Storage queue | Retries and a poison queue; the HR manager doesn't wait for a file |
| Notifications | Outbox in SQL + Function | Same transaction as the change; no "approved but nobody told" |
| Document scan result | Event Grid from Defender | Scanning takes seconds; the upload returns 202 |
| Receipt from on-prem | Event Grid on blob created | The agent runs on its own schedule |

The 2023 design made logging async via a queue. That instinct was right, and the OpenTelemetry exporter
already does it in-process, so no queue is needed.

Deeper: [Event and messaging contracts](/posts/projects/dunderly/07-data-and-integration/#event-and-messaging-contracts)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Upload returns 202 Accepted** with a `Location` for the document, whose status is `PendingScan`; the UI polls
  the status every two seconds for up to a minute.
- **Outbox pattern**: `OutboxMessage` rows added in the same `SaveChangesAsync`; a timer Function claims rows
  with `UPDATE TOP (20) … OUTPUT inserted.*` and sends them.
- **Queue message**: `PayrollRunApproved.v1` JSON with IDs only, also written to the outbox in the approval's
  transaction; the dispatcher relays it to the `payroll-approved` queue.

```csharp
run.Approve(approver, time.GetUtcNow());
outbox.Add(new PayrollRunApproved(run.Id, run.Period));   // same transaction as the approval
await db.SaveChangesAsync(ct);
```

The gotcha this avoids: sending to the queue straight after the commit leaves a gap where a crash loses the
message, and payroll silently never gets its file. The relay can deliver twice, which is why the file writer
is idempotent.

Deeper: [Integration development](/posts/projects/dunderly/09-implementation/#integration-development)

</div>

</details>

## Integrations and Background Processing
{: #integrations-and-background-processing }

<details class="project-iq" markdown="1" id="integrations-and-background-processing-q1">
<summary>Which external systems does the application integrate with, and how?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Four integrations, and one of them is the reason the system exists:

| System | Direction | How |
|---|---|---|
| Legacy payment system (C++, on-prem, file-only) | Out, monthly | Function writes file + manifest to an immutable container; Arc-enabled agent pulls, verifies, delivers, writes a receipt |
| Microsoft Entra ID | In | OIDC sign-in, app roles; later, HR-driven provisioning |
| Microsoft Graph (email) | Out | Notifications from a shared mailbox, managed identity, restricted by application access policy |
| Defender for Storage | In | Malware verdicts via Event Grid |

The payment system can't call us or return errors, so I designed for verification: what was approved is
snapshotted, the file is checksummed, delivery is confirmed by a receipt, and a missing receipt alerts days
before payday. Pull, not push, so nothing in Azure needs a route into the server farm.

> **TODO:** The payment system's file specification and a sample file.
{: .prompt-warning }

Deeper: [External systems](/posts/projects/dunderly/07-data-and-integration/#external-systems-and-third-party-integrations)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **File rendering**: a pure function `LegacyPayrollFormat.Render(run)` returning the bytes and a manifest; no
  I/O, so it's golden-file testable.
- **Writer Function**: queue trigger, checks status, writes once (see snippet in the playbook).
- **Pickup agent**: a .NET console app run by a scheduled task; `Azure.Identity`'s
  `ManagedIdentityCredential` works with Azure Arc, so it authenticates without a secret.
- **Receipt**: a small JSON blob `{ runId, sha256, pickedUpAt, host }`.

```csharp
var credential = new ManagedIdentityCredential();      // Azure Arc on the payment server
var container = new BlobContainerClient(new Uri(outboundUri), credential);
await foreach (var blob in container.GetBlobsAsync(prefix: period))
    if (blob.Name.EndsWith(".dat") && !await ReceiptExistsAsync(blob.Name)) await PullAndVerifyAsync(blob);
```

Deeper: [Integration development](/posts/projects/dunderly/09-implementation/#integration-development)

</div>

</details>

<details class="project-iq" markdown="1" id="integrations-and-background-processing-q2">
<summary>How do you handle rate limits, retries and partial failures from external APIs?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The integrations here aren't rate-limited APIs, so I'd reframe: the failure modes are a file not written,
not picked up, corrupted, or picked up twice.

| Failure | Handling |
|---|---|
| Function fails writing | Queue retry with backoff (5 attempts), then poison queue → Sev 2 alert |
| Agent offline | No receipt → Sev 1 alert after 4 hours; runbook has a manual fallback |
| Corrupted / tampered file | Agent's SHA-256 check fails → quarantined, never delivered |
| Picked up twice | Agent skips files with a receipt; the payment system never sees duplicates |
| Partial file | Written as one blob upload; the manifest is written after, so a file without a manifest is ignored |

For the real API calls we do make (Graph email), the Azure SDK's retry policy handles 429s and 5xx with
exponential backoff, and the outbox keeps unsent messages until they succeed.

Deeper: [Payroll run](/posts/projects/dunderly/07-data-and-integration/#external-systems-and-third-party-integrations)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Queue retries**: `host.json` `maxDequeueCount: 5`, visibility timeout with backoff.
- **SDK retries**: `BlobClientOptions.Retry` (exponential, max 5) and Graph's built-in retry handler for 429 with `Retry-After`.
- **Which errors to retry**: transient (timeouts, 5xx, 429) yes; 4xx validation or "run not approved" no,
  log and stop.
- **Ordering**: manifest uploaded after the data file, so the agent only acts on complete pairs.

```json
{ "version": "2.0", "extensions": { "queues": { "maxDequeueCount": 5, "visibilityTimeout": "00:00:30" } } }
```

Deeper: [Event and messaging contracts](/posts/projects/dunderly/07-data-and-integration/#event-and-messaging-contracts)

</div>

<div class="iq-role" data-role="sre" markdown="1">

The payroll path gets the strictest alerting in the system, because its SLO is 100%:

| Signal | Alert |
|---|---|
| Run approved, no file after 1 h | Sev 1 |
| File written, no receipt after 4 h | Sev 1 |
| Poison message on `payroll-approved` | Sev 2 |
| Agent heartbeat missing in the payroll window | Sev 2 |

```kusto
customEvents | where name in ("PayrollFileWritten", "PayrollReceiptReceived")
| summarize written=maxif(timestamp, name=="PayrollFileWritten"), received=maxif(timestamp, name=="PayrollReceiptReceived") by tostring(customDimensions.runId)
| where isnotempty(written) and (isempty(received) or received < written) and written < ago(4h)
```

> **TODO:** Is there a manual fallback for delivering the file if the agent can't run?
{: .prompt-warning }

Deeper: [Operational runbooks](/posts/projects/dunderly/14-operations-and-observability/#operational-runbooks)

</div>

</details>

<details class="project-iq" markdown="1" id="integrations-and-background-processing-q3">
<summary>How are scheduled and background jobs designed and coordinated?</summary>

<div class="iq-role" data-role="architect" markdown="1">

All scheduled and background work lives in one Functions app, separate from the API, so slot swaps can't
run jobs twice and jobs don't compete with user requests. Each job is **idempotent** and keyed by a natural ID
(payroll period, run ID, document ID), which is what makes retries safe.

Coordination is by **state in SQL**, not by job chaining: the timer creates a draft run for the period if none
exists; approval is a human step in the UI; approval enqueues the write; the receipt event marks delivery. A
job that finds the state isn't what it expects logs and exits. No orchestrator (Durable Functions) is needed,
because the human approval in the middle is already the coordinator.

Deeper: [Backend structure](/posts/projects/dunderly/05-technical-architecture/#system-context-and-component-architecture)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Timer triggers** with NCRONTAB: `"0 0 6 * * *"` daily at 06:00 UTC, checking "is today cutoff?" in code
  (cutoff dates depend on working days, which CRON can't express).
- **Queue trigger** for the file writer; **Event Grid triggers** for receipts and scan results.
- **Idempotency keys**: unique index on `PayrollRun(Period)` so a second draft insert fails cleanly.
- **Testing**: job logic lives in application services, so tests call `CreateDraftIfCutoffTodayAsync` with a `FakeTimeProvider`.

```csharp
public async Task CreateDraftIfCutoffTodayAsync(CancellationToken ct)
{
    var today = DateOnly.FromDateTime(time.GetLocalNow().Date);
    if (!calendar.IsCutoff(today)) return;
    if (await db.Runs.AnyAsync(r => r.Period == calendar.PeriodFor(today), ct)) return;   // idempotent
    db.Runs.Add(PayrollRun.Draft(calendar.PeriodFor(today), await snapshot.TakeAsync(ct)));
    await db.SaveChangesAsync(ct);
}
```

Deeper: [Unit testing](/posts/projects/dunderly/10-quality-assurance/#unit-testing)

</div>

<div class="iq-role" data-role="devops" markdown="1">

- Functions app on **Flex Consumption** with VNet integration, deployed after the API swap.
- Timer schedule and app settings from Bicep; `WEBSITE_TIME_ZONE` isn't supported on Flex Consumption, so schedules
  are UTC and the code converts.
- Queues and Event Grid system topics plus subscriptions defined in Bicep.
- To run a job by hand (for a runbook), an admin-only HTTP-triggered wrapper or the Functions admin API.

```bash
az functionapp function show -g rg-dunderly-hr-prod -n func-dunderly-hr-prod --function-name CreatePayrollRun
az storage message put --queue-name payroll-approved --content '{"runId":41,"period":"2027-03"}' --account-name <acct> --auth-mode login
```

The gotcha: the pickup agent is outside this pipeline. Its versions are tracked in the repo, but installing it
is an IT change on their server.

Deeper: [Deployment instructions](/posts/projects/dunderly/15-documentation-and-knowledge-transfer/#deployment-instructions)

</div>

</details>

## Security and Identity
{: #security-and-identity }

<details class="project-iq" markdown="1" id="security-and-identity-q1">
<summary>How do users authenticate, and how is authorization enforced?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Authentication**: Microsoft Entra ID only. The SPA uses authorization code flow with PKCE via MSAL; the API
validates JWTs. Conditional Access requires MFA for everyone and a compliant device for HR, payroll and
auditor roles. No local accounts or passwords in the HR database.

**Authorization**, in two layers that must both pass:

1. **Role** (Entra app roles via groups): `Employee`, `Manager`, `HR.Admin`, `HR.Manager`,
   `Payroll.Operator`, `Auditor`.
2. **Data scope** in the API: a manager acts only on their direct reports (from `ManagerId` in the HR data);
   an employee sees only themselves.

Plus separation of duties in code: nobody approves their own salary request or a payroll run they prepared.
An authorization matrix test covers every endpoint × role.

Deeper: [Authentication and authorization](/posts/projects/dunderly/06-security-and-privacy/#authentication-and-authorization)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- `AddMicrosoftIdentityWebApiAuthentication` validates issuer, audience and signature.
- App roles arrive in the `roles` claim; `RequireRole("HR.Manager")` on endpoint groups.
- Data scope in code via `IReportingLine.IsDirectManagerAsync(caller, employeeId)`.
- `user.GetObjectId()` (the `oid` claim) is the stable identity stored in audit records, not the email.
- On the client, `AuthorizeView` only hides UI; it is never the control.

```csharp
api.MapGroup("/payroll-runs").RequireAuthorization(p => p.RequireRole("Payroll.Operator", "HR.Manager"));
```

```bash
# inspect a token's roles during development
az account get-access-token --scope api://<api-client-id>/HR.Access --query accessToken -o tsv | cut -d. -f2 | base64 -d 2>/dev/null
```

Deeper: [Identity](/posts/projects/dunderly/05-technical-architecture/#identity-and-access-architecture)

</div>

<div class="iq-role" data-role="devops" markdown="1">

- App registrations (`dunderly-hr-web`, `dunderly-hr-api`) and app roles defined as code (Microsoft Graph
  Bicep extension or a script in the repo), per environment.
- Role assignment to **groups**, not users; group membership owned by HR via access reviews.
- Conditional Access policies owned by the tenant admins; documented in the repo.
- Workload identities: system-assigned managed identities, role assignments in Bicep.

```bash
az ad app show --id <api-client-id> --query "appRoles[].{role:value,enabled:isEnabled}" -o table
az role assignment list --assignee <api-principal-id> --all -o table
```

Deeper: [Access reviews](/posts/projects/dunderly/17-governance-and-compliance/#access-reviews)

</div>

</details>

<details class="project-iq" markdown="1" id="security-and-identity-q2">
<summary>How are secrets and credentials managed?</summary>

<div class="iq-role" data-role="architect" markdown="1">

By not having them. Every workload uses a **managed identity**: the API and Functions to SQL (Entra-only
auth), storage, queues and Key Vault; the on-premises agent through an **Azure Arc** managed identity;
GitHub Actions through **OIDC** federated credentials. Email goes through Graph with the Functions app's
identity, restricted by an application access policy to one mailbox.

What's left goes in **Key Vault** (RBAC mode, private endpoint), referenced from app settings. The one
credential I couldn't remove is the Static Web Apps deployment token, kept as a GitHub environment secret and
rotated yearly.

> **TODO:** Does Dunderly's policy require customer-managed keys for HR data? That would add key rotation
> as an operational task.
{: .prompt-warning }

Deeper: [Secrets and key management](/posts/projects/dunderly/06-security-and-privacy/#secrets-and-key-management)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- `DefaultAzureCredential` locally (my developer login) and `ManagedIdentityCredential` in Azure, through the
  Azure SDK clients registered with `AddAzureClients`.
- SQL connection string has no password: `Authentication=Active Directory Default`.
- Options bound from configuration with `ValidateOnStart`; Key Vault references resolve before the app sees them.
- Secret scanning with push protection stops accidental commits.

```csharp
builder.Services.AddAzureClients(c =>
{
    c.AddBlobServiceClient(new Uri(builder.Configuration["Storage:DocumentsUri"]!));
    c.AddQueueServiceClient(new Uri(builder.Configuration["Storage:QueuesUri"]!));
    c.UseCredential(new DefaultAzureCredential());
});
```

Deeper: [Environment configuration](/posts/projects/dunderly/08-development-preparation/#environment-configuration)

</div>

<div class="iq-role" data-role="devops" markdown="1">

{% raw %}
```yaml
permissions: { id-token: write, contents: read }
steps:
  - uses: azure/login@v2
    with:
      client-id: ${{ vars.AZURE_CLIENT_ID }}
      tenant-id: ${{ vars.AZURE_TENANT_ID }}
      subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
```
{% endraw %}

- One federated credential per GitHub environment (`repo:<org>/dunderly-hr:environment:prod`), so only the
  prod environment's jobs can get a prod token.
- Key Vault references in app settings: `@Microsoft.KeyVault(SecretUri=https://<vault>.vault.azure.net/secrets/<name>)`.
- No Azure secrets in GitHub; the variables above are IDs, not secrets.

```bash
az ad app federated-credential list --id <deploy-app-id> -o table
```

Deeper: [Configuration and secrets](/posts/projects/dunderly/11-infrastructure-and-environments/#configuration-and-secret-management)

</div>

</details>

<details class="project-iq" markdown="1" id="security-and-identity-q3">
<summary>How is sensitive data protected, and which compliance constraints applied?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The data is personal and some of it is highly confidential (salary, payroll, documents, sick leave). Under
assumption A2 (EU employees, GDPR):

- **Classification** per data set decides where it may appear; salary never in emails, notifications or logs.
- **Encryption**: TDE and storage encryption at rest (AES-256), TLS 1.2+ in transit, SHA-256 integrity on
  payroll files.
- **Access**: roles plus reporting line; quarterly access reviews on sensitive groups.
- **Network**: private endpoints; public access disabled on SQL and Key Vault.
- **Privacy**: minimisation (possibly no bank data at all), retention enforced by a job, DPIA before go-live,
  data kept in EU regions.
- **Audit**: append-only audit table, temporal history, SQL auditing.

> **TODO:** Which national employment laws and retention periods apply, and who is the DPO?
{: .prompt-warning }

Deeper: [Privacy](/posts/projects/dunderly/06-security-and-privacy/#privacy-and-data-protection-requirements)

</div>

<div class="iq-role" data-role="devops" markdown="1">

Enforced by Azure Policy rather than by hoping:

- Allowed regions: West Europe and North Europe.
- Deny public network access on SQL and Key Vault; require TLS 1.2; deny shared key access on storage.
- Require diagnostic settings to the Log Analytics workspace.
- Defender for Cloud (CSPM) and Defender for Storage malware scanning.

```bash
az policy state summarize --resource-group rg-dunderly-hr-prod
az sql server show -g rg-dunderly-hr-prod -n sql-dunderly-hr-prod --query publicNetworkAccess
```

Deeper: [Policy enforcement](/posts/projects/dunderly/17-governance-and-compliance/#policy-enforcement)

</div>

</details>

<details class="project-iq" markdown="1" id="security-and-identity-q4">
<summary>Which threats did you design against?</summary>

<div class="iq-role" data-role="architect" markdown="1">

A STRIDE pass over the system, with two threats specific to HR:

| Threat | Control |
|---|---|
| Insider browsing salaries via the API | Role + reporting-line check on every call; authorization matrix tests |
| Manager approving their own raise | Four-eyes rule in code |
| Phished HR manager account | MFA, compliant-device Conditional Access |
| Payroll file tampered between Azure and on-prem | SHA-256 manifest, immutable container, agent verification |
| Malicious upload into HR | Type allow-list, magic bytes, quarantine, Defender scan |
| "I never approved that" | Append-only audit with Entra object IDs |
| Scripted API abuse | Rate limiting; not mission critical |

What I'd say openly: there's no WAF in v1 (ADR-004). The trade-off is cost against an SSO-only internal app,
with explicit triggers to add Front Door WAF.

Deeper: [Threat modeling](/posts/projects/dunderly/06-security-and-privacy/#threat-modeling)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Broken object-level authorization** is the top risk in an HR API: every endpoint with `{id}` checks the
  caller's scope, and the matrix test proves it.
- **Injection**: EF Core parameterizes; raw SQL only via `FromSql` with interpolation.
- **Uploads**: magic bytes, size, random names, `Content-Disposition: attachment` on download.
- **Mass assignment**: DTOs per command; never bind to entities.
- **Rate limiting**: `AddRateLimiter` with a per-user fixed window.

```csharp
builder.Services.AddRateLimiter(o => o.AddPolicy("per-user", ctx =>
    RateLimitPartition.GetFixedWindowLimiter(ctx.User.GetObjectId().ToString(),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 120, Window = TimeSpan.FromMinutes(1) })));
```

Deeper: [Input validation](/posts/projects/dunderly/06-security-and-privacy/#input-validation-and-secure-coding),
[API Security](/posts/communication/api/api-security/)

</div>

<div class="iq-role" data-role="devops" markdown="1">

The pipeline's part of threat defence:

- CodeQL, dependency review, secret scanning with push protection on every PR.
- OWASP ZAP baseline against test on every deploy.
- No standing admin: PIM for Azure roles; deploys only through OIDC from `main`.
- Branch protection plus CODEOWNERS so payroll code needs a payroll reviewer: a supply-chain control against
  one person changing how money is calculated.
- Resource locks on prod.

```bash
docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t https://hr-api-test.<company domain>/health
```

Deeper: [Static analysis](/posts/projects/dunderly/12-cicd-and-release-management/#static-analysis-and-security-scanning)

</div>

</details>

## Performance and Scalability
{: #performance-and-scalability }

<details class="project-iq" markdown="1" id="performance-and-scalability-q1">
<summary>What load does the system handle, where are the bottlenecks, and how does it scale?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The case study's numbers: 10 concurrent users, 250 employees growing to 500, ~1 MB of records and ~50 MB of
documents per employee. That's a small load; I'd say so plainly in an interview rather than invent scale.

| Possible bottleneck | Why it's fine | What would show it |
|---|---|---|
| SQL vCores | Serverless max 2 handles month-end reports | CPU %, query duration |
| API instance | P0v3, autoscale 1 → 2 on CPU > 70% | CPU, p95 |
| Document downloads | 5 MB streamed through the API | Response time on download endpoints |
| First load of the WASM app | Lazy loading of HR sections | Page view duration on phones |

Scaling is "change a SKU" in Bicep. The tested headroom is 50 concurrent users, 5× the stated load.

Deeper: [Scalability](/posts/projects/dunderly/05-technical-architecture/#scalability-and-performance-strategy)

</div>

<div class="iq-role" data-role="sre" markdown="1">

- **Golden signals**: traffic (requests/min), latency (p95 per endpoint group), errors (5xx and dependency
  failures), saturation (App Service CPU and memory, SQL app CPU billed).
- **Capacity** is mostly a cost question here; budget alerts are the saturation signal for money.
- **Autoscale rule**: scale out at 70% CPU for 10 minutes, in at 30% for 20 minutes, min 1, max 2.

```bash
az monitor autoscale show -g rg-dunderly-hr-prod -n autoscale-hr-api --query "profiles[0].capacity"
az monitor metrics list --resource <sql-db-id> --metric app_cpu_percent --interval PT15M
```

Deeper: [Capacity and cost monitoring](/posts/projects/dunderly/14-operations-and-observability/#capacity-and-cost-monitoring)

</div>

</details>

<details class="project-iq" markdown="1" id="performance-and-scalability-q2">
<summary>How would the design change at ten times the users or data?</summary>

<div class="iq-role" data-role="architect" markdown="1">

At 5,000 employees and 100 concurrent users, honestly, very little changes:

- **SKUs**: App Service to P1v3 with 2 to 3 instances; SQL serverless max 4 to 8 vCores.
- **Reporting**: a read replica or a reporting view refreshed nightly, so reports don't compete with writes.
- **Documents**: ~250 GB; still Blob, lifecycle to cool tier matters more.
- **Payroll**: 5,000 lines is still a small file; the Function might need streaming writes.
- **Resilience**: at that size the business probably calls it more critical, so zone redundancy (P1v3+, SQL
  zone-redundant) becomes worth it.

What wouldn't change: the modular monolith. Ten times the users doesn't create a reason to split it. Ten
times the *teams* might.

Deeper: [Architecture reviews](/posts/projects/dunderly/18-continuous-improvement/#architecture-reviews)

</div>

<div class="iq-role" data-role="devops" markdown="1">

All parameterized in the `.bicepparam` files, so it's a PR:

```bicep
param appServiceSku = 'P1v3'
param apiMinInstances = 2
param apiMaxInstances = 3
param sqlMaxVCores = 8
param zoneRedundant = true
```

- Zone redundancy needs the right SKUs and at least 2 to 3 instances; check regional support first.
- Re-run the k6 load test with the new targets before and after.
- Re-price in the calculator and update the budget alert.

```bash
az deployment sub what-if -l westeurope -f infra/main.bicep -p infra/env/prod.bicepparam
```

Deeper: [Capacity and quota planning](/posts/projects/dunderly/11-infrastructure-and-environments/#capacity-and-quota-planning)

</div>

<div class="iq-role" data-role="sre" markdown="1">

- Re-baseline SLOs: at 100 concurrent users, latency SLOs per endpoint group make more sense than one global p95.
- Add **saturation alerts** (SQL CPU sustained > 80%, connection count) that don't matter today.
- Load-test the Monday 9 am peak and month end at the new size.
- Revisit RTO/RPO with the business; a bigger company may not accept a business day of downtime.

```bash
k6 run -e USERS=100 -e DURATION=30m tests/load/monday-peak.js
```

Deeper: [Performance and load testing](/posts/projects/dunderly/10-quality-assurance/#performance-and-load-testing)

</div>

</details>

<details class="project-iq" markdown="1" id="performance-and-scalability-q3">
<summary>How did you measure and improve performance?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I'd measure first and keep the bar honest: p95 < 500 ms for API calls and first page load under 3 s
(both assumptions until agreed).

1. **Baseline** with k6 in test: a normal day (10 users), a Monday peak (50), a month-end payroll draft for 500
   synthetic employees.
2. **Find the slowest** endpoints from Application Insights and the slowest queries from Query Store.
3. **Fix the cause**: missing index, N+1, over-fetching, an un-lazy-loaded WASM assembly.
4. **Re-measure**, and stop when the SLO is met with headroom.

There's no recorded performance improvement yet, because nothing has run; this is the method I'd follow and
the numbers I'd hold it to.

Deeper: [Performance optimization](/posts/projects/dunderly/16-support-and-maintenance/#performance-optimization)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **N+1**: listing employees with their manager name → one query with a projection, not lazy loading.
- **`AsNoTracking`** for read paths; **projections** to DTOs.
- **Indexes** from the access patterns: `(EmployeeId, EffectiveFrom)` on salary records, `(EmployeeId, Year)` on leave.
- **Streaming** downloads with `Results.Stream(blobStream, contentType)` instead of buffering 5 MB in memory.
- **Blazor**: `@key`, `Virtualize`, lazy-loaded assemblies.

```csharp
var rows = await db.Employees.AsNoTracking()
    .Select(e => new EmployeeRow(e.EmployeeId, e.FirstName, e.LastName, e.Manager!.LastName))
    .ToListAsync(ct);   // one SQL statement with a join
```

```bash
dotnet-counters monitor -n Dunderly.Hr.Api System.Runtime Microsoft.AspNetCore.Hosting
```

Deeper: [API and UI implementation](/posts/projects/dunderly/09-implementation/#api-and-ui-implementation)

</div>

<div class="iq-role" data-role="sre" markdown="1">

```kusto
requests | where timestamp > ago(7d) and name !has "documents"
| summarize p95=percentile(duration,95), n=count() by name
| top 10 by p95 desc
```

- Track p95 per endpoint week over week on the engineering workbook.
- Query Store top queries by duration after each release.
- k6 results stored with each release so regressions are visible.
- An error budget: if latency burns it, the next sprint spends time on performance.

The honest gap: the 500 ms target and the 50-user test are mine, not agreed with the business.

Deeper: [Metrics and dashboards](/posts/projects/dunderly/14-operations-and-observability/#metrics-and-dashboards)

</div>

</details>

## Reliability and Resilience
{: #reliability-and-resilience }

<details class="project-iq" markdown="1" id="reliability-and-resilience-q1">
<summary>What are the failure modes, and how does the system degrade when a part fails?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Failure | User impact | Degradation |
|---|---|---|
| One API instance restarts | Seconds of errors | Second instance during scale-out; reads retried |
| SQL transient fault or scaling | A failed request | EF Core retry |
| Blob unavailable | No document upload/download | Rest of the app works; uploads fail clearly |
| Defender scan delayed | Documents stay "pending" | Visible status; alert after an hour |
| Graph email down | Notifications late | Outbox keeps them; sent when it recovers |
| Functions failing | No payroll file | Queue retries, poison queue, Sev 1 alert |
| Pickup agent offline | File not delivered | Missing-receipt alert days before payday |
| Region outage | System down | Rebuild in North Europe within a business day |

The design principle: the web app may degrade or go down for hours; the payroll path must never fail
*silently*. Most failures are contained to one feature because the dependencies are separate services.

Deeper: [Resilience](/posts/projects/dunderly/05-technical-architecture/#resilience-and-disaster-recovery)

</div>

<div class="iq-role" data-role="sre" markdown="1">

- **Health checks** split by purpose: `/health/live` (process only, so SQL trouble doesn't make App Service
  churn instances), `/health/ready` (dependencies), `/health` for the availability test.
- **Timeouts and retries**: SQL retry with backoff; SDK retries for Blob, queues and Graph; no retry on 4xx.
- **No circuit breaker** today: at this traffic, retries with backoff are enough; Polly's circuit breaker
  via `AddStandardResilienceHandler` is ready if an outbound HTTP dependency appears.
- **Graceful degradation** in the UI: document features show "temporarily unavailable" instead of breaking the page.

```bash
curl -s https://hr-api.<company domain>/health/ready
az webapp log tail -g rg-dunderly-hr-prod -n app-dunderly-hr-api-prod
```

Deeper: [Health checks](/posts/projects/dunderly/14-operations-and-observability/#health-checks)

</div>

</details>

<details class="project-iq" markdown="1" id="reliability-and-resilience-q2">
<summary>What are the availability and recovery targets, and how are backup and disaster recovery handled?</summary>

<div class="iq-role" data-role="architect" markdown="1">

> **Assumption:** Availability 99.5% in business hours, RTO one business day, RPO 15 minutes (assumption A7).
> The case study only said "not very critical".
{: .prompt-info }

- **Backup**: SQL automatic backups (PITR 35 days, LTR, geo-redundant); Blob versioning, soft delete, GRS;
  immutable payroll containers.
- **DR**: rebuild compute in North Europe from Bicep, geo-restore SQL, repoint DNS. No warm standby: for a
  one-day RTO it would double the cost for little benefit.
- **The RPO tension**: geo-restore gives up to about an hour of possible loss for a regional outage. If 15
  minutes is firm, an auto-failover group is the answer.

> **TODO:** Confirm RTO/RPO with the sponsor, especially whether 15 minutes is firm.
{: .prompt-warning }

Deeper: [Backup and restore](/posts/projects/dunderly/07-data-and-integration/#backup-and-restore-strategy)

</div>

<div class="iq-role" data-role="devops" markdown="1">

DR is a pipeline run with a different parameter file, rehearsed yearly:

```bash
az deployment sub create -l northeurope -f infra/main.bicep -p infra/env/dr.bicepparam
az sql db geo-backup restore --dest-database sqldb-hr --dest-server sql-dunderly-hr-dr -g rg-dunderly-hr-dr \
  --geo-backup-id <recoverable-database-id>
```

Then redeploy the current release artifacts to the DR app names, update DNS CNAMEs, and switch the pickup
agent's container URI (a config value on the agent).

The first drill will find something hard-coded to West Europe. That's what drills are for.

Deeper: [Disaster recovery testing](/posts/projects/dunderly/16-support-and-maintenance/#disaster-recovery-testing)

</div>

<div class="iq-role" data-role="sre" markdown="1">

| Target | Value | How it's measured |
|---|---|---|
| Availability | 99.5% business hours | Availability test success rate |
| RTO | 1 business day | Timed in the yearly DR drill |
| RPO | 15 min (to confirm) | PITR granularity; geo-restore is looser |
| Payroll SLO | 100% confirmed before cutoff + 1 day | Receipt events |

The measured RTO comes from the quarterly restore tests and the DR drill, not from the design document; the
runbook records how long each one took.

```kusto
availabilityResults | where timestamp > ago(30d)
| summarize availability = 100.0 * countif(success == true) / count()
```

Deeper: [Availability targets](/posts/projects/dunderly/14-operations-and-observability/#availability-and-performance-targets)

</div>

</details>

<details class="project-iq" markdown="1" id="reliability-and-resilience-q3">
<summary>How do you make jobs and deployments safe to retry?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Jobs and deployments are safe to retry because each is either idempotent or a state transition that refuses
to happen twice:

| Thing | Why a retry is safe |
|---|---|
| Payroll file write | Keyed by run ID; immutable container; exits if the file exists |
| Draft payroll run | Unique index on period |
| Notifications | Outbox rows marked sent |
| Document promotion | Moves by document ID; second attempt finds it already promoted |
| Migration tool | Upserts by employee number |
| EF migrations | Bundle applies only pending migrations |
| Bicep | Declarative; re-running converges |
| API deploy | Same artifact to the slot; swap is reversible |

Deeper: [Input safety](/posts/projects/dunderly/05-technical-architecture/#api-and-integration-architecture)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Natural keys** for idempotency: `PayrollRun.Period` unique, file name from run ID.
- **Conditional writes**: `BlobUploadOptions { Conditions = new BlobRequestConditions { IfNoneMatch = ETag.All } }`
  so a concurrent second write fails rather than overwrites.
- **Status checks** at the start of every job: "is the run Approved and without a file?"

```csharp
try
{
    await blob.UploadAsync(content, new BlobUploadOptions { Conditions = new() { IfNoneMatch = ETag.All } }, ct);
}
catch (RequestFailedException e) when (e.Status == 409)
{
    log.LogInformation("Run {RunId} file already exists; nothing to do", run.Id);
}
```

Deeper: [Integration development](/posts/projects/dunderly/09-implementation/#integration-development)

</div>

<div class="iq-role" data-role="devops" markdown="1">

- **Build once, deploy the same artifact**: re-running a deploy job is harmless.
- **Bicep is declarative**: re-running converges; `what-if` shows the delta first.
- **Migration bundle** applies pending migrations only, so a re-run after success does nothing.
- **Slot swap** is reversible; re-running a failed swap is safe.
- **GitHub environments** with concurrency groups so two prod deploys can't overlap.

{% raw %}
```yaml
concurrency: { group: deploy-${{ inputs.environment }}, cancel-in-progress: false }
```
{% endraw %}

Deeper: [Rollback](/posts/projects/dunderly/12-cicd-and-release-management/#rollback-and-roll-forward-procedures)

</div>

</details>

## Testing and Quality
{: #testing-and-quality }

<details class="project-iq" markdown="1" id="testing-and-quality-q1">
<summary>What is your testing strategy across the frontend, backend and data?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Lopsided on purpose: thorough where a bug moves money or exposes data, pragmatic elsewhere.

| Layer | What | Why |
|---|---|---|
| Unit | Salary, leave and payroll rules with `FakeTimeProvider` | Where money is decided |
| Integration | API + real SQL (Testcontainers) + Azurite | Migrations, temporal tables, grants as deployed |
| Authorization matrix | Every endpoint × role | The top HR risk is data exposure |
| Contract | OpenAPI client generation; payroll golden files | The two contracts that matter |
| E2E | Five Playwright journeys with axe | The flows users depend on |
| Performance | k6: normal day, Monday peak, month end | Headroom, not scale |
| UAT + parallel run | One real payroll month in both systems | The real acceptance test |

Frontend logic is thin (the API enforces the rules), so Blazor components get bUnit tests only where they have
logic, plus E2E.

Deeper: [Quality Assurance](/posts/projects/dunderly/10-quality-assurance/)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```csharp
public class AuthorizationMatrix(ApiFactory api) : IClassFixture<ApiFactory>
{
    public static TheoryData<string, string, string, int> Cases => MatrixLoader.From("authz-matrix.csv");

    [Theory, MemberData(nameof(Cases))]
    public async Task Endpoint_enforces_role(string method, string path, string role, int expected)
    {
        var client = api.CreateClientAs(role, objectId: TestUsers.For(role));
        var res = await client.SendAsync(new HttpRequestMessage(new HttpMethod(method), path));
        ((int)res.StatusCode).Should().Be(expected);
    }
}
```

- **xUnit** + FluentAssertions; **Testcontainers** for SQL; **WebApplicationFactory** with a test auth handler.
- **bUnit** for components with logic (the leave day counter).
- **Bogus** for synthetic data.

```bash
dotnet test --filter "Category!=E2E"
```

Deeper: [Integration testing](/posts/projects/dunderly/10-quality-assurance/#integration-testing)

</div>

</details>

<details class="project-iq" markdown="1" id="testing-and-quality-q2">
<summary>How do you test integrations with external systems?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The payment system can't be called and may not have a test instance, so the strategy is layered:

1. **Golden files**: known payroll runs rendered and compared byte for byte with samples **approved by the
   payment system's owner**. This is the contract test.
2. **Agent tests** against Azurite and a fake input folder: checksum mismatch, duplicate file, missing manifest.
3. **End-to-end in test** with the payment system's test instance, if one exists; otherwise the owner checks
   sample files manually.
4. **Parallel run**: one real month in both systems, compared line by line.

> **TODO:** Does the payment system have a test instance?
{: .prompt-warning }

For Entra ID and Graph: real dev-tenant app registrations in test, fakes in unit tests.

Deeper: [Contract testing](/posts/projects/dunderly/10-quality-assurance/#contract-testing)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```csharp
[Fact]
public async Task March_run_matches_approved_golden_file()
{
    var run = GoldenRuns.March2027();                         // 12 employees: joiner, leaver, unpaid leave
    var (content, manifest) = LegacyPayrollFormat.Render(run);
    content.Should().Equal(await File.ReadAllBytesAsync("Golden/payroll-2027-03.dat"));
    manifest.RecordCount.Should().Be(12);
}
```

- Golden files live in `tests/Payroll/Golden/`, owned by `payroll-reviewers` in CODEOWNERS.
- Changing one requires the payment system owner's sign-off recorded in the PR.
- Edge cases each get a golden run: mid-month joiner, leaver, unpaid leave, salary change effective mid-period.

The gotcha: encodings and line endings. A golden test catches a stray `\r\n` that a "looks the same" review
never would.

Deeper: [Integration development](/posts/projects/dunderly/09-implementation/#integration-development)

</div>

<div class="iq-role" data-role="devops" markdown="1">

- **Azurite** as a service container in CI for Blob and queues; SQL Server via Testcontainers.
- A **test payroll storage account** and a test pickup agent in the test environment, pointed at the payment
  system's test instance or a stub folder.
- Golden-file tests run on every PR; the agent integration test runs on deploy to test.

```yaml
services:
  azurite:
    image: mcr.microsoft.com/azure-storage/azurite
    ports: ["10000:10000", "10001:10001"]
```

```bash
docker run -d -p 10000:10000 -p 10001:10001 mcr.microsoft.com/azure-storage/azurite
```

Deeper: [Test environment](/posts/projects/dunderly/11-infrastructure-and-environments/#test-or-qa-environment)

</div>

</details>

<details class="project-iq" markdown="1" id="testing-and-quality-q3">
<summary>Which quality gates does code pass before it merges and ships?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Gate | Blocks |
|---|---|
| Build, analyzers as errors, `dotnet format` | Merge |
| Unit, integration, authorization matrix, architecture tests, golden files | Merge |
| CodeQL, dependency review, secret scanning | Merge |
| Bicep lint and what-if | Merge (review) |
| One review; two for payroll paths | Merge |
| E2E + axe, ZAP baseline in test | Promotion to prod |
| Named reviewer; payroll-freeze check | Prod deploy |
| Smoke tests on the staging slot | Swap |

The gate I'd point to as specific to this system is the second reviewer on payroll code: it's a control
against one person changing how money is calculated.

Deeper: [Approval gates](/posts/projects/dunderly/12-cicd-and-release-management/#approval-gates)

</div>

<div class="iq-role" data-role="developer" markdown="1">

In practice, before I push:

```bash
dotnet format --verify-no-changes
dotnet build -warnaserror
dotnet test --filter "Category!=E2E"
dotnet list package --vulnerable --include-transitive
```

And the reviewer checklist I'd expect my PR to pass: rule tested at the edges, role and data scope checked,
audit event for every write, migration expand-only, no personal data in logs, docs updated. PRs over about
400 lines get split.

Deeper: [Code reviews](/posts/projects/dunderly/09-implementation/#code-reviews)

</div>

<div class="iq-role" data-role="devops" markdown="1">

- Branch protection: required checks, one review, linear history, no force push.
- CODEOWNERS: payroll paths need `payroll-reviewers`; `infra/` needs `devops`.
- GitHub environment `prod`: required reviewer, deploy only from `main`.
- A freeze check job that reads payroll cutoff dates and fails prod deploys in the window unless labelled `payroll-fix`.

```bash
gh api repos/<org>/dunderly-hr/branches/main/protection --jq '.required_status_checks.contexts'
```

Deeper: [Development workflow](/posts/projects/dunderly/08-development-preparation/#development-workflow-and-code-review-process)

</div>

</details>

## Infrastructure and Environments
{: #infrastructure-and-environments }

<details class="project-iq" markdown="1" id="infrastructure-and-environments-q1">
<summary>Where and how is the application hosted, and why there?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Azure PaaS in **West Europe** (assumption A1, as in the 2023 estimate), DR in North Europe:

| Piece | Service | Why |
|---|---|---|
| Web | Static Web Apps Standard | Static files, previews |
| API | App Service Linux P0v3 | Slots, VNet integration, one plan |
| Jobs | Functions Flex Consumption | Event and schedule driven, scale to zero |
| Data | Azure SQL serverless, Blob GRS | Pay per use; documents out of the DB |
| On-prem | Arc-enabled server running the agent | Next to the payment system |

Why PaaS and not containers or VMs: no team need, no scale need, and every hour not spent patching servers
goes to the HR domain. Why EU regions: employee data (assumption A2, GDPR).

Deeper: [Hosting](/posts/projects/dunderly/05-technical-architecture/#hosting-and-deployment-model)

</div>

<div class="iq-role" data-role="devops" markdown="1">

```bash
az resource list -g rg-dunderly-hr-prod --query "[].{name:name,type:type}" -o table
```

- Resource groups: `rg-dunderly-hr-{dev,test,prod}` plus `rg-dunderly-hr-shared` (Log Analytics, action groups).
- VNet per environment: `snet-app` (delegated, VNet integration) and `snet-pe` (private endpoints) with
  private DNS zones.
- Prod resource group lock `CanNotDelete`.
- Tags `app`, `env`, `owner` on everything for cost reports.

Deeper: [Production environment](/posts/projects/dunderly/11-infrastructure-and-environments/#production-environment)

</div>

<div class="iq-role" data-role="sre" markdown="1">

From a reliability view, the hosting gives me:

- App Service health check replaces unhealthy instances; autoscale 1 → 2.
- Platform-managed patching (no OS to patch), so maintenance shows up as brief instance restarts, covered by
  the second instance or retries.
- A single region: an accepted risk given the one-business-day RTO, with a rehearsed rebuild.

The thing I'd watch: one instance most of the time means platform maintenance can cause short blips.
If availability SLO burn shows it, min instances goes to 2.

```bash
az webapp show -g rg-dunderly-hr-prod -n app-dunderly-hr-api-prod --query "siteConfig.healthCheckPath"
```

Deeper: [Resilience](/posts/projects/dunderly/05-technical-architecture/#resilience-and-disaster-recovery)

</div>

</details>

<details class="project-iq" markdown="1" id="infrastructure-and-environments-q2">
<summary>Which environments exist, and how close is local development to production?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Three Azure environments plus local, and a deliberate absence:

| Env | Purpose | Data |
|---|---|---|
| Local | Development with .NET Aspire (SQL container, Azurite) | Synthetic |
| Dev | Proves Bicep, identities, private networking | Synthetic |
| Test | E2E, performance, ZAP, UAT | Synthetic |
| Prod (+ staging slot) | Production; the slot is staging | Real |

No separate staging environment: prod's staging slot runs on production infrastructure and configuration,
which is closer to prod than any copy. Test and prod come from the same Bicep with different parameter files.

The gap I'd admit: local uses containers instead of PaaS and can't run Defender scanning, so dev and test
catch what local can't.

Deeper: [Environment parity](/posts/projects/dunderly/11-infrastructure-and-environments/#environment-parity)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```bash
git clone <repo-url>/dunderly-hr && cd dunderly-hr
dotnet tool restore
dotnet run --project src/Dunderly.Hr.AppHost
```

- **.NET Aspire AppHost** starts SQL Server and Azurite containers, the API, Functions and the Blazor app,
  and wires connection strings; its dashboard shows logs and traces.
- **Seed data**: a fake company of 50 employees on startup in `Development`.
- **Auth**: a dev Entra app registration with test users per role, so authorization runs for real.
- **Fakes**: a dev-only scanner marks uploads clean after two seconds.

```csharp
var sql = builder.AddSqlServer("sql").AddDatabase("hr");
var storage = builder.AddAzureStorage("storage").RunAsEmulator();
builder.AddProject<Projects.Dunderly_Hr_Api>("api").WithReference(sql).WithReference(storage.AddBlobs("blobs"));
```

Deeper: [Local development](/posts/projects/dunderly/08-development-preparation/#local-development-setup)

</div>

<div class="iq-role" data-role="devops" markdown="1">

| Setting | Dev | Test | Prod |
|---|---|---|---|
| App Service | B1, no slots | P0v3 + slot | P0v3 + slot, 1–2 |
| SQL max vCores / auto-pause | 1 / 60 min | 2 / 60 min | 2 / off |
| Storage | LRS | LRS | GRS |
| Defender scanning | Off | On | On |

Everything else (network, identities, role assignments, diagnostics, policy) is identical, and the
parameter files are short enough to diff by eye.

```bash
diff infra/env/test.bicepparam infra/env/prod.bicepparam
```

Deeper: [Test environment](/posts/projects/dunderly/11-infrastructure-and-environments/#test-or-qa-environment)

</div>

</details>

<details class="project-iq" markdown="1" id="infrastructure-and-environments-q3">
<summary>How is the infrastructure provisioned and configured?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Bicep with Azure Verified Modules** (ADR-009), applied only by the pipeline, with `what-if` on every PR and
a weekly drift check. The 2023 design was configured in the portal (access restrictions, firewall rules set
by hand); infrastructure as code is what makes the three environments match and DR possible.

Why Bicep over Terraform: an Azure-only estate run by a .NET team, no state file to protect, and new Azure
features available immediately. Terraform would be an equally valid choice if Dunderly already used it.

Configuration (app settings, flags) is a Bicep output, so code and infrastructure agree per environment.

Deeper: [Infrastructure as code](/posts/projects/dunderly/11-infrastructure-and-environments/#infrastructure-as-code)

</div>

<div class="iq-role" data-role="devops" markdown="1">

```text
infra/
├── main.bicep          # subscription scope: RG + modules
├── modules/            # network, data, app, functions, monitoring (AVM wrappers)
└── env/{dev,test,prod}.bicepparam
```

```bash
az bicep lint --file infra/main.bicep
az deployment sub what-if  -l westeurope -f infra/main.bicep -p infra/env/prod.bicepparam
az deployment sub create   -l westeurope -f infra/main.bicep -p infra/env/prod.bicepparam
```

- AVM modules pinned to versions in the `br/public:avm/...` references.
- Role assignments and private DNS zone links in Bicep, so a rebuild has the same permissions.
- SQL contained users via a deployment script (needs Entra auth to the database).

The gotcha: app registrations live in Entra, not ARM, so they need the Graph Bicep extension or a script, and
tenant-level permissions the pipeline shouldn't have in prod.

Deeper: [Database and infrastructure implementation](/posts/projects/dunderly/09-implementation/#database-and-infrastructure-implementation)

</div>

</details>

## CI/CD and Deployment
{: #ci-cd-and-deployment }

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q1">
<summary>Walk me through the pipeline from commit to production.</summary>

<div class="iq-role" data-role="architect" markdown="1">

The animated pipeline is in the playbook; the shape:

1. **PR**: build, unit and integration tests, authorization matrix, golden files, CodeQL, dependency and secret
   scanning, Bicep what-if, a Static Web Apps preview for HR to click through.
2. **Merge to main**: build once (API and Functions zips, Blazor bundle, migration bundle), versioned.
3. **Dev**: Bicep, migrations, deploy.
4. **Test**: same artifacts; Playwright E2E with axe, ZAP baseline; UAT on release candidates.
5. **Prod approval**: named reviewer; blocked in payroll week unless it's a payroll fix.
6. **Prod**: Bicep → migrations → API to staging slot → smoke tests → swap → Functions → web.

The principle: what reaches prod is byte-for-byte what test approved.

Deeper: [CI/CD pipeline](/posts/projects/dunderly/12-cicd-and-release-management/#build-automation)

</div>

<div class="iq-role" data-role="devops" markdown="1">

{% raw %}
```yaml
jobs:
  build:   { uses: ./.github/workflows/build.yml }
  dev:     { needs: build, uses: ./.github/workflows/deploy.yml, with: { environment: dev } }
  test:    { needs: dev,   uses: ./.github/workflows/deploy.yml, with: { environment: test, e2e: true } }
  prod:    { needs: test,  uses: ./.github/workflows/deploy.yml, with: { environment: prod, slot: staging } }
```
{% endraw %}

- Reusable `deploy.yml` with OIDC login, Bicep, efbundle, zip deploy, smoke, swap.
- Artifacts uploaded once in `build`, downloaded by each deploy job.
- `prod` is a GitHub environment with a required reviewer and a `main`-only branch rule.

```bash
gh run list --workflow release.yml --limit 5
gh run watch
```

Deeper: [Deployment automation](/posts/projects/dunderly/12-cicd-and-release-management/#deployment-automation)

</div>

</details>

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q2">
<summary>Which deployment strategy do you use, and how do you roll back?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Blue-green via App Service deployment slots.** The new build goes to the staging slot, warms up, passes
smoke tests, then swaps into production. Rolling back is swapping again: the previous build is still in the
slot, so it takes minutes.

What makes it safe is the database rule: migrations run first and are **expand-only**, so both versions work
against the schema during and after the swap.

| Situation | Action |
|---|---|
| Smoke fails | Don't swap; fix forward |
| Problem after swap | Swap back |
| Bad Functions or web deploy | Redeploy the previous artifact |
| Bad data change | PITR to a new database, repair |

Default is roll forward unless users are being hurt right now.

Deeper: [Rollback and roll-forward](/posts/projects/dunderly/12-cicd-and-release-management/#rollback-and-roll-forward-procedures)

</div>

<div class="iq-role" data-role="devops" markdown="1">

```bash
az webapp deployment source config-zip -g rg-dunderly-hr-prod -n app-dunderly-hr-api-prod --slot staging --src artifacts/api.zip
curl -fsS https://app-dunderly-hr-api-prod-staging.azurewebsites.net/health/ready
az webapp deployment slot swap -g rg-dunderly-hr-prod -n app-dunderly-hr-api-prod --slot staging --target-slot production
# rollback
az webapp deployment slot swap -g rg-dunderly-hr-prod -n app-dunderly-hr-api-prod --slot staging --target-slot production
```

- Slot-sticky settings (`Hr__IsStagingSlot`) stay with the slot so the waiting build doesn't run once-only work.
- App Service's swap warm-up hits `applicationInitialization` paths before the swap completes.
- Functions on Flex Consumption have no slots, so they deploy after the swap; jobs are idempotent.

Deeper: [Staging environment](/posts/projects/dunderly/11-infrastructure-and-environments/#staging-environment)

</div>

<div class="iq-role" data-role="sre" markdown="1">

- **Watch after every swap** for 30 minutes: 5xx rate, p95, exceptions by version (the build version is a
  telemetry dimension).
- **Swap back** if the 5xx alert fires within that window, before diagnosing.
- **Release timing**: Tuesday to Thursday mornings, never Friday afternoon, never in payroll week.

```kusto
requests | where timestamp > ago(1h)
| summarize failures=countif(success == false), total=count() by application_Version, bin(timestamp, 5m)
```

Deeper: [Release calendar](/posts/projects/dunderly/12-cicd-and-release-management/#release-calendar)

</div>

</details>

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q3">
<summary>How do data and schema changes ship alongside application changes?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Migrations ship **in the same release** as the code, but run **before** it, and only expand. A destructive
change takes two releases: N stops using a column, N+1 drops it. That's the whole strategy, and it's what lets
the slot swap and swap-back work without schema rollbacks.

Data changes (backfills) are small, idempotent migrations or a one-off tool, never manual SQL in prod. The
pipeline records a timestamp before migrating so point-in-time restore has a clean target.

Payroll-impacting changes get a re-render of the last three months' approved runs, compared with what was
sent: they must be identical.

Deeper: [Database deployment strategy](/posts/projects/dunderly/12-cicd-and-release-management/#database-deployment-strategy)

</div>

<div class="iq-role" data-role="developer" markdown="1">

A two-step column rename, as I'd actually do it:

1. Release N: add `PreferredName`, write both columns, read the new one with fallback.
2. Backfill in the same migration: `UPDATE … SET PreferredName = KnownAs WHERE PreferredName IS NULL`.
3. Release N+1: stop writing `KnownAs`, then drop it.

```csharp
protected override void Up(MigrationBuilder mb)
{
    mb.AddColumn<string>("PreferredName", schema: "employees", table: "Employee", maxLength: 100, nullable: true);
    mb.Sql("UPDATE employees.Employee SET PreferredName = KnownAs WHERE PreferredName IS NULL");
}
```

The gotcha: EF will happily scaffold a rename as drop + add. Always read the generated migration.

Deeper: [Schema and migrations](/posts/projects/dunderly/07-data-and-integration/#database-schema-and-migrations)

</div>

<div class="iq-role" data-role="devops" markdown="1">

```bash
dotnet ef migrations bundle --project src/Dunderly.Hr.Api --self-contained -r linux-x64 -o artifacts/efbundle
./artifacts/efbundle --connection "$SQL_CONN"     # Active Directory Default auth, pipeline identity
```

- The pipeline identity is the only principal with DDL in prod; the API's identity has DML only.
- The bundle runs before the slot deploy; a failure stops the release with prod untouched.
- The SQL firewall is closed, so the runner reaches SQL over the private endpoint (a self-hosted runner in the
  VNet or a deployment script inside Azure).

That last point is the real-world gotcha: GitHub-hosted runners can't reach a private-only database.

Deeper: [Database deployment strategy](/posts/projects/dunderly/12-cicd-and-release-management/#database-deployment-strategy)

</div>

</details>

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q4">
<summary>How do you manage configuration and versions across environments?</summary>

<div class="iq-role" data-role="architect" markdown="1">

- **Configuration**: layered .NET configuration; per-environment values are Bicep outputs written to app
  settings; secrets (few) are Key Vault references; feature flags in configuration.
- **Versions**: one semantic version for the whole system, stamped on every artifact and on telemetry;
  `/api/v1` changes only for breaking API changes, which with one in-repo client should be never.
- **Promotion**: the same artifacts move through environments; only configuration differs.

This makes "what's running in prod?" a one-line answer: a version, and a parameter file in git.

Deeper: [Versioning](/posts/projects/dunderly/12-cicd-and-release-management/#versioning-and-release-notes)

</div>

<div class="iq-role" data-role="developer" markdown="1">

- `IOptions<T>` with `ValidateDataAnnotations().ValidateOnStart()` so a missing setting fails at startup.
- `Microsoft.FeatureManagement`: `[FeatureGate("LeaveApprovalWorkflow")]` on endpoints, `<FeatureGate>` in Blazor.
- Version from `<Version>` set by the pipeline (`-p:Version=1.4.0`), exposed via `/health` and as the
  telemetry `application_Version`.

```csharp
builder.Services.AddOptions<StorageOptions>().BindConfiguration("Storage").ValidateDataAnnotations().ValidateOnStart();
builder.Services.AddFeatureManagement();
```

Deeper: [Feature flags](/posts/projects/dunderly/08-development-preparation/#feature-flags)

</div>

<div class="iq-role" data-role="devops" markdown="1">

```bash
dotnet publish src/Dunderly.Hr.Api -c Release -p:Version=$VERSION -o artifacts/api
az webapp config appsettings list -g rg-dunderly-hr-prod -n app-dunderly-hr-api-prod -o table
```

- Version: from the git tag on release, `0.0.0-<sha>` otherwise; attached to the GitHub Release with artifacts.
- App settings come only from Bicep; a manual portal change is drift, caught by the weekly what-if.
- Feature flags per environment in the `.bicepparam` files, so turning one on in prod is a reviewed PR.

Deeper: [Configuration and secret management](/posts/projects/dunderly/11-infrastructure-and-environments/#configuration-and-secret-management)

</div>

</details>

## Monitoring and Observability
{: #monitoring-and-observability }

<details class="project-iq" markdown="1" id="monitoring-and-observability-q1">
<summary>How do you know the system is healthy in production?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Three questions, three signals:

1. **Can people use it?** An availability test on `/health` from three locations, plus the 5xx rate.
2. **Is it fast enough?** p95 latency per endpoint group against 500 ms.
3. **Will payroll land?** The payroll workbook: run status, file written, picked up, receipt, days to payday.

The third is what makes this system's observability different. CPU can be green while payroll is quietly
failing, so payroll has its own events and its own Sev 1 alerts. All telemetry goes to Application Insights and
Log Analytics through OpenTelemetry, which replaced the 2023 design's custom logging service (ADR-006).

Deeper: [Monitoring](/posts/projects/dunderly/14-operations-and-observability/#application-and-infrastructure-monitoring)

</div>

<div class="iq-role" data-role="devops" markdown="1">

All of it is Bicep:

- Workspace-based Application Insights per environment, one Log Analytics workspace in `rg-dunderly-hr-shared`.
- Diagnostic settings on every resource (SQL, storage, App Service, Key Vault, Functions).
- Standard availability test and metric/log alerts with action groups (Teams, email, SMS for Sev 1).
- Azure Monitor Agent with a data collection rule on the Arc-enabled payment server for the agent's event log.

```bash
az monitor scheduled-query list -g rg-dunderly-hr-shared -o table
az monitor app-insights component show -g rg-dunderly-hr-prod -a appi-dunderly-hr-prod --query connectionString
```

Deeper: [Monitoring and alert validation](/posts/projects/dunderly/13-deployment-and-go-live/#monitoring-and-alert-validation)

</div>

<div class="iq-role" data-role="sre" markdown="1">

| SLI | SLO | Source |
|---|---|---|
| Availability (business hours) | 99.5% / 30 days | `availabilityResults` |
| API p95 | < 500 ms | `requests` |
| Payroll confirmed before cutoff + 1 day | 100% monthly | `customEvents` (receipts) |

Health endpoints split by purpose (`live`, `ready`, full), and every alert was fired on purpose in test
before go-live, with someone confirming it arrived.

```kusto
availabilityResults | where timestamp > ago(1d) | summarize success=avg(todouble(success)) by location
```

> **TODO:** SLO agreement with the sponsor; the numbers above are proposals.
{: .prompt-warning }

Deeper: [Targets](/posts/projects/dunderly/14-operations-and-observability/#availability-and-performance-targets)

</div>

</details>

<details class="project-iq" markdown="1" id="monitoring-and-observability-q2">
<summary>What do you log, measure and alert on?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Log**: structured events with correlation IDs; IDs only (`EmployeeId`, `RunId`), **never names or salary
amounts**. Business audit (who changed what) goes to SQL, not telemetry, because it contains personal data
and has a different retention.

**Measure**: request rate, latency and failures per endpoint group; SQL and Blob dependency health; custom
metrics for salary decisions and payroll file duration; documents pending scan; queue and poison depth.

**Alert** on symptoms: availability, 5xx rate, payroll file not written (Sev 1), receipt missing (Sev 1), run
not approved near the deadline, document stuck in scan, poison messages, budget. Every alert links to a runbook.

Deeper: [Alerting and escalation](/posts/projects/dunderly/14-operations-and-observability/#alerting-and-escalation)

</div>

<div class="iq-role" data-role="developer" markdown="1">

```csharp
log.LogInformation("Salary request {RequestId} approved by {ApproverId}", req.Id, approver);   // no amount
SalaryDecisions.Add(1, new("outcome", "approved"));
```

- **Message templates**, never string interpolation, so properties are queryable.
- **Correlation**: OpenTelemetry propagates the trace through HTTP; for queues and the outbox I write the
  `traceparent` into the message and restore it in the Function.
- **Personal data guard**: a review rule plus a scheduled KQL check for email or currency patterns in `traces`.
- **Custom meter** `Dunderly.Hr` registered with `AddMeter`.

```bash
dotnet add src/Dunderly.Hr.Api package Azure.Monitor.OpenTelemetry.AspNetCore
```

Deeper: [Logging and log retention](/posts/projects/dunderly/14-operations-and-observability/#logging-and-log-retention)

</div>

<div class="iq-role" data-role="sre" markdown="1">

Alert design rules I'd hold to:

- Alert on what users or payroll feel; dashboards for everything else.
- Each alert has a severity, an owner and a runbook link, or it doesn't exist.
- Business-hours alerts for the app; the payroll alerts page out of hours in payroll week.
- Monthly review: delete or tune any alert that fired without needing action.

```kusto
traces | where timestamp > ago(1d)
| where message matches regex @"[\w.+-]+@[\w-]+\.\w+" or message matches regex @"\b\d{2,3}[,.]\d{3}\b"
| take 20      // personal-data leak check: should return nothing
```

Deeper: [Reliability reviews](/posts/projects/dunderly/18-continuous-improvement/#reliability-reviews)

</div>

</details>

<details class="project-iq" markdown="1" id="monitoring-and-observability-q3">
<summary>Walk me through how you would troubleshoot a production issue in this system.</summary>

<div class="iq-role" data-role="architect" markdown="1">

Picture a manager reporting "I can't approve leave" with an error screen. I'd go:

1. **Scope**: one user or everyone? Availability test and 5xx rate answer that in seconds.
2. **Trace**: the error screen shows a correlation ID → the end-to-end transaction in Application Insights.
3. **Classify**: 403 (role or reporting line, a data problem in HR), 409 (state changed), 5xx (our bug or a
   dependency).
4. **Mitigate** before root-causing if many are affected: swap back the last release, turn off a feature flag.
5. **Fix and review**: a test that would have caught it; a blameless review for Sev 1 and 2.

Most "bugs" in an HR system turn out to be data: a missing manager, an expired role. The troubleshooting guide
starts there.

Deeper: [Troubleshooting guides](/posts/projects/dunderly/15-documentation-and-knowledge-transfer/#troubleshooting-guides)

</div>

<div class="iq-role" data-role="devops" markdown="1">

```bash
az webapp log tail -g rg-dunderly-hr-prod -n app-dunderly-hr-api-prod
az monitor activity-log list -g rg-dunderly-hr-prod --offset 24h --query "[].{op:operationName.value,who:caller,when:eventTimestamp}" -o table
az webapp deployment slot swap -g rg-dunderly-hr-prod -n app-dunderly-hr-api-prod --slot staging --target-slot production
```

First question from the DevOps seat: **what changed?** The activity log shows infrastructure changes, GitHub
shows the last deployment, and telemetry is split by `application_Version`. If the problem started with a
release, swap back first.

Deeper: [Rollback](/posts/projects/dunderly/12-cicd-and-release-management/#rollback-and-roll-forward-procedures)

</div>

<div class="iq-role" data-role="sre" markdown="1">

```kusto
exceptions | where timestamp > ago(2h)
| summarize count() by type, outerMessage, application_Version | order by count_ desc

dependencies | where timestamp > ago(2h) and success == false
| summarize count() by target, resultCode
```

My order: user impact → recent changes → errors by version → dependency failures → resource saturation. For a
payroll alert, the order is different: run status in SQL → Function executions and poison queue → agent event
log on the payment server (via Log Analytics) → the network path. The payroll runbooks encode that.

Deeper: [Incident response](/posts/projects/dunderly/16-support-and-maintenance/#incident-response)

</div>

</details>

## Cost, Maintenance and Support
{: #cost-maintenance-and-support }

<details class="project-iq" markdown="1" id="cost-maintenance-and-support-q1">
<summary>What drives the cost of running the system, and how do you keep it under control?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The 2023 estimate was $848.07/month: Application Gateway WAF $352.15 (41.5%), SQL reserved $256.63 (30.3%),
three App Service S1s $219 (25.8%), with monitoring, Static Web Apps and storage under $21 combined.

The modernized design attacks the top three: no WAF in v1 (ADR-004), one App Service plan instead of three
(ADR-001), SQL serverless instead of reserved provisioned (ADR-008). It adds small lines: Defender malware
scanning, private endpoints, Key Vault, Functions, GRS.

> **TODO:** Re-price the target design in the Azure pricing calculator. I expect it well under $848, but
> that's an expectation, not a number I'd quote in an interview.
{: .prompt-warning }

Control: budgets with alerts per environment, tags for cost by app and environment, auto-pause in dev and
test, a quarterly cost check, and people cost (the real cost) kept low by PaaS.

Deeper: [Budget](/posts/projects/dunderly/03-product-planning/#budget-and-resource-planning)

</div>

<div class="iq-role" data-role="devops" markdown="1">

```bash
az consumption budget list -g rg-dunderly-hr-prod -o table
az costmanagement query --type ActualCost --timeframe MonthToDate \
  --scope /subscriptions/<sub>/resourceGroups/rg-dunderly-hr-prod --dataset-grouping name=ResourceType type=Dimension
```

- Budgets and alerts (80%, 100%) in Bicep per environment.
- Dev: B1, SQL auto-pause after an hour, LRS, no Defender scanning.
- Tags `app`, `env`, `owner` enforced by Azure Policy.
- Lifecycle rule moves old documents to cool tier.

Deeper: [Capacity and cost monitoring](/posts/projects/dunderly/14-operations-and-observability/#capacity-and-cost-monitoring),
[Cloud FinOps in Azure](/posts/finops/cloud-finops-in-azure/)

</div>

<div class="iq-role" data-role="sre" markdown="1">

The cost lines that can surprise you here, and how I'd watch them:

- **Log Analytics ingestion**: grows quietly with chatty logs. Watch `Usage` by table monthly.
- **SQL serverless**: billed vCore-seconds; a runaway report query costs money as well as latency.
- **Defender for Storage**: per-GB scanned; the migration's bulk upload is a one-off spike.

```kusto
Usage | where TimeGenerated > ago(30d) | summarize GB=sum(Quantity)/1024 by DataType | order by GB desc
```

Deeper: [Cost optimization](/posts/projects/dunderly/18-continuous-improvement/#cost-optimization)

</div>

</details>

<details class="project-iq" markdown="1" id="cost-maintenance-and-support-q2">
<summary>How is the system maintained and supported after go-live?</summary>

<div class="iq-role" data-role="architect" markdown="1">

After go-live the team shrinks to roughly one developer at 20% plus the architect for escalations
(assumption). The model:

| Level | Who |
|---|---|
| L0 | User guides, KB, in-app help |
| L1 | HR service desk: how-to, access, data fixes |
| L2 | App team rota (business hours, payroll-week cover) |
| L3 | Microsoft support for platform faults |

Maintenance is small and routine: weekly Dependabot merges, monthly runtime patches verified in test,
quarterly restore tests, a yearly DR drill, a .NET LTS upgrade every two to three years, and about 20% of
maintenance time on debt. The boundary with IT is the payment system's input folder.

> **TODO:** Which Azure support plan does Dunderly have? Without one, L3 doesn't exist.
{: .prompt-warning }

Deeper: [Support model](/posts/projects/dunderly/16-support-and-maintenance/#support-model-and-ownership)

</div>

<div class="iq-role" data-role="devops" markdown="1">

Routine maintenance I'd automate or calendar:

- Dependabot grouped weekly; merged when green.
- Runtime version bumps via a Bicep parameter, tested in test first.
- Weekly drift `what-if`; quarterly evidence export; yearly SWA token rotation.
- Pickup agent and AzCopy updates quarterly, installed with IT.

```bash
gh pr list --label dependencies
az webapp config show -g rg-dunderly-hr-prod -n app-dunderly-hr-api-prod --query linuxFxVersion
```

Deeper: [Patch and upgrade management](/posts/projects/dunderly/16-support-and-maintenance/#patch-and-upgrade-management)

</div>

<div class="iq-role" data-role="sre" markdown="1">

- **Incident response**: declare, contain, diagnose, recover, communicate, review. Sev 1 for payroll in payroll week.
- **Toil watch**: if a runbook is run by hand more than twice a month, automate it.
- **Restore and DR tests** produce the real RTO numbers.
- **Problem management**: recurring incidents get a root cause and a tracked fix (for example moving the
  payment server's patch window out of the pickup window).

```bash
gh issue list --label problem --state open
```

Deeper: [Incident and problem management](/posts/projects/dunderly/14-operations-and-observability/#incident-and-problem-management)

</div>

</details>

## Leadership, Stakeholders and Governance
{: #leadership-stakeholders-and-governance }

<details class="project-iq" markdown="1" id="leadership-stakeholders-and-governance-q1">
<summary>How did you communicate the architecture and progress to stakeholders and executives?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Different views for different people:

- **Sponsor and steering group**: a one-page status every two weeks: milestones, top risks, decisions needed,
  budget. Every red item comes with a proposed decision.
- **HR**: sprint demos in the PR preview environment, and the plain-language release note ("You can now
  withdraw a salary request").
- **Engineers**: the architecture doc, ADRs and the animated flows.
- **IT and the payment system owner**: the interface agreement and the file format doc.

For executives, the story was cost and risk: the 2023 estimate, where 41.5% was a WAF for ten users, and a
payroll file that can't fail silently. The animated system diagram did more work in reviews than any slide.

Deeper: [Project governance](/posts/projects/dunderly/17-governance-and-compliance/#project-governance)

</div>

</details>

<details class="project-iq" markdown="1" id="leadership-stakeholders-and-governance-q2">
<summary>How do you document and govern architectural decisions?</summary>

<div class="iq-role" data-role="architect" markdown="1">

ADRs in `docs/adr/`, one per decision: context, decision, consequences, and a **"revisit when"** line. An ADR
is never edited after acceptance; a new one supersedes it. That's how the 2023 decisions and their
replacements both stay readable, with the reasons for each change.

Governance around them:

| Decision type | Who decides |
|---|---|
| Architecture and technology | Architect, via ADR, reviewed monthly (quarterly after go-live) |
| Business rules | HR manager |
| File format | Payment system owner + payroll operator |
| Risk acceptance | Sponsor |

ADR-004 (no WAF) is my favourite example: the "revisit when" triggers (exposure beyond employees, a pen-test
finding, a regulator or insurer) go on the yearly security review agenda.

Deeper: [ADRs](/posts/projects/dunderly/05-technical-architecture/#architectural-decision-records)

</div>

</details>

<details class="project-iq" markdown="1" id="leadership-stakeholders-and-governance-q3">
<summary>How did you bring other engineers onto the project?</summary>

<div class="iq-role" data-role="architect" markdown="1">

With a first-week path rather than a document dump: run it locally with one command on day one, read the
architecture doc and ADRs on day two, walk the three key flows (salary approval, payroll run, document upload)
in the debugger, pick a `good-first-issue`, shadow a production deploy, and read the payroll runbooks
(shadowing the run if it's payroll week).

The structure helps: module boundaries mean a new developer can own one module without understanding all of
them, and the architecture tests stop them from accidentally crossing a boundary.

Deeper: [Onboarding documentation](/posts/projects/dunderly/15-documentation-and-knowledge-transfer/#onboarding-documentation)

</div>

<div class="iq-role" data-role="developer" markdown="1">

What I'd give a new developer, concretely:

```bash
git clone <repo-url>/dunderly-hr && cd dunderly-hr
dotnet tool restore && dotnet run --project src/Dunderly.Hr.AppHost
gh issue list --label good-first-issue
```

- Pair on the first PR; the reviewer checklist is in the PR template.
- Test users per role in the dev tenant, so they can see the app as a manager or HR manager.
- `docs/how-to/` for common tasks: add an endpoint, add a migration, add a feature flag.
- A rule: anything they found confusing in week one becomes a doc fix in week two.

Deeper: [Developer documentation](/posts/projects/dunderly/09-implementation/#developer-documentation)

</div>

</details>

## Lessons Learned and Trade-offs
{: #lessons-learned-and-trade-offs }

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q1">
<summary>What was the hardest technical problem, and how did you solve it?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The hardest problem is an integration with a system that can't talk back: a legacy C++ payment system that
accepts one file a month and gives no response. You can't get an error code, so you have to design certainty.

My solution: snapshot the run so what's approved is what's paid; four-eyes approval; a file plus a manifest
(record count, control total, SHA-256); an on-prem agent that **pulls** (no inbound path into the server farm),
verifies before delivering, and writes a receipt; an alert if the receipt is missing, days before payday.

The second-hardest was a people problem: disagreeing with the original design, my own 2023 one, about three
services. Writing it as ADR-001 with the reasons made it a decision rather than a reversal.

Deeper: [Payroll run](/posts/projects/dunderly/07-data-and-integration/#external-systems-and-third-party-integrations)

</div>

<div class="iq-role" data-role="developer" markdown="1">

The hardest code problem is date logic: effective-dated salaries, mid-month joiners and leavers, unpaid leave,
closed periods, and leave carry-over across years. It's where off-by-one bugs pay someone the wrong amount.

How I'd tame it:

- `DateOnly` everywhere, no times; an injected `TimeProvider`.
- Rules as pure functions, tested with `[Theory]` tables of edge dates.
- Golden payroll runs for each edge case.

```csharp
[Theory]
[InlineData("2027-03-15", 17, 31)]   // joiner on 15 March: 17 of 31 days
public void Prorates_joiner(string start, int paidDays, int daysInMonth)
    => Proration.PaidDays(DateOnly.Parse(start), new(2027, 3, 31)).Should().Be(paidDays);
```

> **TODO:** Does Dunderly prorate by calendar days or working days? It changes the rule, and the payment
> system may already do it.
{: .prompt-warning }

Deeper: [Unit testing](/posts/projects/dunderly/10-quality-assurance/#unit-testing)

</div>

</details>

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q2">
<summary>What would you do differently if you started again?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Three things:

1. **Start from one deployable.** The 2023 design started from services and had to discover the shared
   database. I'd start with a modular monolith and earn any split.
2. **Ask about the payroll file in week one, not as a box on a diagram.** The case study treated the payment
   interface as one component; it's actually the riskiest part of the project.
3. **Price the design before choosing it.** The WAF line was 41.5% of the 2023 total. Seeing the bill early
   would have prompted the "is it worth it?" conversation.

And one I'd keep: asking the awkward NFR questions first (users, data, criticality). That habit made the whole
design right-sized.

Deeper: [ADRs](/posts/projects/dunderly/05-technical-architecture/#architectural-decision-records)

</div>

<div class="iq-role" data-role="developer" markdown="1">

Since this is a design, "differently" means what I changed from the 2023 version and what I'd insist on from
the first sprint:

- **Background jobs in Functions from day one**, not `BackgroundService` in the API: during a slot swap two
  copies of the API run, and a hosted service would run twice.
- **Every post-commit message through the outbox**, including the payroll queue message. Sending to the queue
  straight after `SaveChangesAsync` leaves a gap where a crash loses the message.
- **The API client generated from OpenAPI from sprint 1**, so the contract is enforced by the compiler.

```csharp
outbox.Add(new PayrollRunApproved(run.Id, run.Period));   // relayed to the queue by the dispatcher
await db.SaveChangesAsync(ct);                             // same transaction as the approval
```

Deeper: [Event and messaging contracts](/posts/projects/dunderly/07-data-and-integration/#event-and-messaging-contracts)

</div>

<div class="iq-role" data-role="devops" markdown="1">

- **Plan for private networking in CI from the start.** A database with public access disabled can't be
  migrated from a GitHub-hosted runner; it needs a VNet-connected runner or a deployment script inside Azure.
- **Put Entra app registrations in code early.** They live outside ARM and drift easily.
- **Rehearse DR in the first quarter**, not the first year: the first drill always finds a hard-coded region.

```bash
az deployment sub what-if -l northeurope -f infra/main.bicep -p infra/env/dr.bicepparam
```

Deeper: [Infrastructure as code](/posts/projects/dunderly/11-infrastructure-and-environments/#infrastructure-as-code)

</div>

</details>

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q3">
<summary>What technical debt exists today, and how would you pay it down?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Known and accepted debt, each with a trigger:

| Debt | Trigger to pay it down |
|---|---|
| No WAF (ADR-004) | Exposure beyond employees, pen-test finding, insurer or regulator |
| Single region, no warm standby | RTO tightens below a business day |
| CSV-only reports | HR asks for dashboards → Power BI dataset with RLS |
| Email-only notifications | After go-live → Teams adaptive cards |
| Manual Entra provisioning | Roadmap: HR-driven joiner/mover/leaver |

How I pay it down: about 20% of maintenance time, a quarterly check of whether any trigger has fired, and flags
removed first because they're cheap. Plus the honest one: this is still a design. The first real debt will be
whatever the first sprint teaches us.

Deeper: [Technical debt management](/posts/projects/dunderly/16-support-and-maintenance/#technical-debt-management)

</div>

<div class="iq-role" data-role="developer" markdown="1">

Code-level debt I'd expect and track as `type:debt` issues:

- Outbox rows that are never purged after sending (a table that only grows).
- Feature flags past their rollout date.
- Reports written as raw SQL that should become views with tests.
- Any `FromSql` without a test that covers its parameters.

```bash
gh issue list --label type:debt --state open
grep -rn "TODO(debt)" src/ | wc -l
```

Deeper: [Technical debt tracking](/posts/projects/dunderly/09-implementation/#technical-debt-tracking)

</div>

<div class="iq-role" data-role="devops" markdown="1">

- **Static Web Apps deployment token**: the one remaining long-lived secret; rotate yearly until SWA
  deployment via OIDC replaces it.
- **Functions without slots** (Flex Consumption): mitigated by idempotent jobs; revisit if a job ever isn't.
- **CI reaching private SQL**: needs a VNet-connected runner or an in-Azure deployment script.
- **Pickup agent deployment** is manual with IT; package it (winget or an Arc extension) once it's stable.

```bash
gh secret list --env prod
```

Deeper: [Patch and upgrade management](/posts/projects/dunderly/16-support-and-maintenance/#patch-and-upgrade-management)

</div>

</details>

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q4">
<summary>Where does the system go next, and how does the architecture support that?</summary>

<div class="iq-role" data-role="architect" markdown="1">

In my order of value:

1. **HR-driven Entra ID provisioning** (joiner, mover, leaver). The HR system becomes the source of truth for
   who works here; leavers lose access the day they leave. The API and reporting-line model already support it.
2. **Leave approval and self-service**, behind flags today.
3. **Teams notifications and approvals**, through the existing outbox.
4. **E-signature** for contracts, which the document pipeline (quarantine, scan, promote) already accommodates.
5. **Reporting** via a Power BI dataset over SQL views.

And the big one: when the legacy payment system is replaced, only the file writer and the pickup agent change.
The run, the snapshot and the approvals stay. That isolation was deliberate, and it's the part of the
architecture I'd point to as built for the future.

Deeper: [Roadmap](/posts/projects/dunderly/03-product-planning/#product-roadmap),
[Decommissioning](/posts/projects/dunderly/18-continuous-improvement/#decommissioning-and-end-of-life-planning)

</div>

</details>

{% include project-nav.html %}
