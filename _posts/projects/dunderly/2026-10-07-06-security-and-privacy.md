---
layout: post
title: "Dunderly HR System: Security and Privacy"
date: 2026-10-07 00:06:00 +0530
categories: [projects, dunderly]
tags: [Projects, Dunderly, Security, Privacy]
description: "Dunderly HR security: STRIDE threats, Entra ID roles plus reporting-line checks, no stored secrets, private endpoints, malware-scanned uploads and GDPR."
project: dunderly
project_step: 6
image:
  path: /assets/img/projects/dunderly/06-security-and-privacy.webp
  alt: "Dunderly HR System: Security and Privacy - Projects hero image"
---

An HR system's most valuable data isn't valuable to hackers in the usual sense: nobody resells Dunderly's
leave balances. It's valuable to *insiders*. A curious employee who can see colleagues' salaries, or a
manager who can approve their own raise, does more damage here than most external attacks. So this post
spends as much time on "who can see what" as on firewalls, and replaces the 2023 design's IP-based rules
with identity.

<!-- more -->

{% include project-nav.html %}

## Threat modeling
{: #threat-modeling }

STRIDE over the [system context](/posts/projects/dunderly/05-technical-architecture/#system-context-and-component-architecture),
run as a one-hour workshop with the team and HR:

| Threat | Example at Dunderly | Main controls |
|---|---|---|
| **S**poofing | Phished HR manager credentials | Entra ID MFA, Conditional Access (compliant device for HR roles) |
| **T**ampering | Payroll file altered between Azure and the payment system | SHA-256 manifest, immutable container, verification by the agent |
| **R**epudiation | "I never approved that raise" | Append-only audit events with the Entra object ID, temporal tables |
| **I**nformation disclosure | Employee browses others' salaries via the API | Role plus reporting-line check on every call; tests for it |
| **D**enial of service | Scripted calls exhaust the API | Rate limiting per user; App Service autoscale; not mission critical |
| **E**levation of privilege | Manager approves own salary request | Four-eyes rule in code (BR-4); role separation |

Two threats get extra attention because they're specific to this system: a malicious document uploaded
into HR (below, with its own flow), and the payroll file, which is the one artifact where tampering turns
directly into money.

## Authentication and authorization
{: #authentication-and-authorization }

**Authentication:** Entra ID only. The Blazor app uses MSAL with authorization code + PKCE, gets an access
token for `dunderly-hr-api`, and the API validates it with `Microsoft.Identity.Web`. No local accounts, no
passwords in the HR database. Conditional Access requires MFA for everyone, and a compliant or
hybrid-joined device for the `HR.*`, `Payroll.Operator` and `Auditor` roles.

**Authorization** has two layers, and both must pass:

```csharp
// Salary module: raise a request
app.MapPost("/api/v1/salary-requests", async (CreateSalaryRequest cmd, ClaimsPrincipal user,
        IReportingLine lines, ISalaryRequests requests) =>
{
    var caller = user.GetObjectId();
    var isHr = user.IsInRole("HR.Admin") || user.IsInRole("HR.Manager");
    if (!isHr && !await lines.IsDirectManagerAsync(caller, cmd.EmployeeId))
        return Results.Problem(statusCode: 403, title: "Not your direct report");
    return Results.Created($"/api/v1/salary-requests/{(await requests.CreateAsync(cmd, caller)).Id}", null);
})
.RequireAuthorization(p => p.RequireRole("Manager", "HR.Admin", "HR.Manager"));
```

The role check is declarative; the data check is explicit and tested. Approval adds a third rule:
`DecidedBy` must differ from `RequestedBy`.

| Role | Employees | Salary | Leave | Payroll | Audit |
|---|---|---|---|---|---|
| Employee | Own profile (read) | Own (read) | Own | — | — |
| Manager | Direct reports (read) | Request for reports | Approve for reports | — | — |
| HR.Admin | All (write) | Request | All | — | — |
| HR.Manager | All (read) | Approve / reject | All | Approve run | — |
| Payroll.Operator | All (read) | Read | Read | Prepare run | — |
| Auditor | All (read) | Read | Read | Read | Read |

## Secrets and key management
{: #secrets-and-key-management }

The best secret is the one that doesn't exist. With managed identities, the list of real secrets is short:

| Credential | Approach |
|---|---|
| API → SQL, Blob, queues, Key Vault | System-assigned managed identity, Entra-only auth on SQL |
| Functions → SQL, storage, Graph | Managed identity |
| Pickup agent → payroll storage | Azure Arc-enabled server managed identity |
| GitHub Actions → Azure | OIDC federated credential, no client secret |
| Email via Microsoft Graph | Managed identity with `Mail.Send`, restricted by an application access policy to one mailbox |
| Anything left over | Key Vault (RBAC mode, private endpoint), referenced from app settings |

Key Vault also holds nothing exotic: TDE and storage encryption use Microsoft-managed keys.

> **TODO:** Does Dunderly's policy require customer-managed keys for HR data? If yes, Key Vault holds the
> SQL TDE protector and the storage keys, and key rotation becomes an operational task.
{: .prompt-warning }

## Encryption requirements
{: #encryption-requirements }

The case study had this right: Azure SQL and Storage encrypt at rest with AES-256 by default, and traffic
uses TLS. On top of that:

- **TLS 1.2 minimum** on every endpoint, HTTPS only, HSTS on the web app.
- **Payroll files** are protected in transit (HTTPS) and integrity-checked (SHA-256 manifest). If the
  payment system's owner wants confidentiality at rest on the file share too, the agent can decrypt from a
  PGP-encrypted file, but that adds key handling on-premises. I'd only do it if their policy requires it.
- **Backups** inherit encryption.
- **No salary data in logs** (see [Audit logging](#audit-logging)); telemetry is not an encryption boundary.

## Network security
{: #network-security }

The 2023 design proposed App Gateway WAF in front of the APIs, access restrictions from the gateway's
VNet, and firewall rules on SQL and Storage allowing the App Service outbound IPs. The modernized design
keeps the intent and changes the mechanism:

| 2023 | Now | Why |
|---|---|---|
| App Gateway WAF v2 | None in v1 ([ADR-004](/posts/projects/dunderly/05-technical-architecture/#architectural-decision-records)) | Cost vs risk for an SSO-only internal app |
| Access restrictions from gateway VNet | Entra token required on every API call; rate limiting | Staff use it from anywhere, so IP rules don't fit |
| SQL/Storage firewall with App Service outbound IPs | Private endpoints; public access disabled | Outbound IPs are shared with other tenants and can change |

The payroll storage account is the exception that touches the outside world: the on-premises agent must
reach it.

> **TODO:** Does Dunderly have a site-to-site VPN or ExpressRoute to Azure? If yes, the agent uses the
> private endpoint and the account has no public access at all. If not, the account allows only the
> server farm's egress IP, and the Arc managed identity is still required.
{: .prompt-warning }

## Input validation and secure coding
{: #input-validation-and-secure-coding }

Validation runs twice with one set of rules: FluentValidation validators live in a shared project, so the
Blazor forms and the API enforce the same rules. The API is the authority. EF Core parameterizes queries;
any raw SQL for reports uses `FromSql` with interpolated parameters, never string concatenation.

Uploads deserve their own flow, because HR will be handed files from outside the company (signed
contracts, certificates). Tick the box to see a malicious file:

{% include flow-anim.html id="projects/dunderly/document-upload" %}

The rules: allow-list of types checked by magic bytes, 10 MB limit, random blob names (never the user's
file name in a path), quarantine until scanned, `Content-Disposition: attachment` on download so a browser
never renders an uploaded file inline. See [API Security](/posts/communication/api/api-security/) for the
general checklist this follows.

## Vulnerability and dependency management
{: #vulnerability-and-dependency-management }

- **Dependabot** for NuGet, npm (build tooling only) and GitHub Actions, grouped weekly.
- **`dotnet list package --vulnerable --include-transitive`** fails the build on high or critical.
- **CodeQL** on every PR; **secret scanning with push protection** on the repo.
- **Defender for Cloud** (foundational CSPM free tier at least) for Azure misconfigurations, plus
  Defender for Storage for malware scanning.
- **Patch window:** platform patching is Microsoft's (PaaS); our patching is dependency updates and the
  .NET runtime, merged weekly, emergency fixes within the [remediation SLA](/posts/projects/dunderly/16-support-and-maintenance/#security-remediation).

## Privacy and data-protection requirements
{: #privacy-and-data-protection-requirements }

Under assumption A2 (GDPR applies), privacy is designed in:

- **Minimisation.** Store what HR and payroll need. No national ID scans unless the law requires them; bank
  details only if the payment system needs them from us.
- **Purpose limitation.** HR data is used for HR and payroll. Reports for other purposes need the DPO's okay.
- **Access by need.** The role table above; salary data never in notifications, emails or logs.
- **Subject rights.** An audit extract per employee answers access requests; rectification goes through HR.
- **Retention.** Enforced by data, not memory (see [retention](/posts/projects/dunderly/07-data-and-integration/#data-retention-and-deletion)).
- **DPIA** before go-live, because the data includes salary and health-related absence.

> **TODO:** Does the payment system need bank account details from the HR system, or does it hold them
> already? If it holds them, the HR system never stores bank data, which is a significant privacy win.
{: .prompt-warning }

## Audit logging
{: #audit-logging }

Two different kinds of logs, kept apart on purpose:

| | Business audit | Technical telemetry |
|---|---|---|
| What | Who changed what, when, before and after | Requests, errors, traces |
| Where | SQL `audit.AuditEvent` (append-only) + temporal tables | Application Insights / Log Analytics |
| Contains personal data | Yes, by necessity | No: IDs only, no names or amounts |
| Retention | Same as the HR record it describes | 90 days (assumption) |
| Who can read | Auditor role, HR manager | Engineering |

The audit table is append-only: the API's database user has `INSERT` but not `UPDATE` or `DELETE` on it.
Azure SQL auditing also goes to the Log Analytics workspace, to catch anyone reading tables directly.

## Security testing and incident response
{: #security-testing-and-incident-response }

**Testing:** authorization tests for every endpoint and role (the cheapest high-value security test here),
OWASP ZAP baseline scan against test in the pipeline (see the [OWASP ZAP post](/posts/devsecops/owaspzap/owaspzap/)),
and one external penetration test before go-live, scoped to the API, uploads and the payroll path.

**Incident response:** a short security playbook that extends the [incident process](/posts/projects/dunderly/16-support-and-maintenance/#incident-response):

1. Contain: disable the affected Entra account or app role assignment; rotate anything relevant.
2. Preserve: export the audit and sign-in logs for the window.
3. Assess: whose data, which fields. Salary and health data raise the severity.
4. Notify: DPO immediately; under GDPR, the supervisory authority within 72 hours if it's a reportable
   breach, and affected employees where required.
5. Review and fix.

> **TODO:** Who is Dunderly's DPO (or privacy contact), and who decides whether a breach is reportable?
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] Run the STRIDE workshop with HR and record new threats.
- [ ] Configure Conditional Access: MFA for all, compliant device for HR and payroll roles.
- [ ] Write authorization tests for every endpoint × role combination.
- [ ] Confirm VPN/ExpressRoute and the payroll storage network rules.
- [ ] Decide on customer-managed keys (policy question).
- [ ] Confirm whether the HR system needs bank details at all.
- [ ] Complete the DPIA before go-live.
- [ ] Book the external penetration test for week 13 or 14.

{% include project-nav.html %}
