---
published: false
layout: post
title: "SQL Blocking Agent: Security and Privacy"
date: 2026-10-05 00:06:00 +0530
categories: [projects, sql-blocking-agent]
tags: [Projects, SQL Blocking Agent, Security, Privacy]
description: "Securing an agent that can kill SQL sessions: governance gates in code, four least-privilege SQL identities, keyless LLM auth, prompt-injection limits and audit."
project: sql-blocking-agent
project_step: 6
image:
  path: /assets/img/projects/sql-blocking-agent/06-security-and-privacy.webp
  alt: "SQL Blocking Agent: Security and Privacy - Projects hero image"
---

An agent with `ALTER ANY CONNECTION` on production SQL Servers is, from a security point of view, a
privileged automation account with an LLM attached. That framing drives everything in this post. The
question is never "is the model smart enough?" It's "what is the worst thing this identity can do, and
what stands in the way?"

<!-- more -->

{% include project-nav.html %}

## Threat modeling
{: #threat-modeling }

The first line of defence is the governance gate ladder. Every hard gate runs in code before the LLM is
asked anything, and a gate that fires is final. Step through it, or tick the box to watch R1 stop a
kill:

{% include flow-anim.html id="projects/sql-blocking-agent/governance-gates" %}

The threats, and what addresses each:

| Threat | Control | Residual risk |
|---|---|---|
| The LLM proposes a harmful `KILL` | Hard gates first; human approval; LLM has no tool that runs SQL | Approver misreads the evidence |
| Prompt injection through SQL text, login or program names in DMVs | Model output is a validated schema; it can't call tools; gates decide on facts, not prose | A misleading RCA narrative |
| The SPID was reused by a new session before the kill | Pre-kill identity check: SPID, `login_name` and `login_time` must still match | None known |
| Kill on a protected or system session | Layered protection policy: `session_id <= 50`, non-user process, `ProtectedLogins`; unknown fails closed | Missing entries in `ProtectedLogins` |
| A runaway loop kills repeatedly | R10 kill-rate limit per server per hour | Limit set too high |
| Two replicas both act | Single replica until a leader lock exists | Someone scales the deployment |
| Unauthorized approval | Private ingress only | No authentication on the approval API yet |
| Audit tampering | Logger identity can only `INSERT` | Admins on the management server |
| Credential leakage | External Secrets from Key Vault; keyless LLM auth | Shared SQL login for IaaS targets |

## Authentication and authorization
{: #authentication-and-authorization }

**Inbound:** the approval API has no authentication or authorization today. The Helm design record says
so plainly and treats it as a significant production risk, acceptable only while the ingress is private
to the DBA network. With production in dry-run, the API isn't yet a path to a real kill, which buys
time. Before real kills are enabled, I'd require an Entra ID token on every approval call, check
membership of the DBA approver group, and record the authenticated identity rather than a
caller-supplied reviewer name (in Temporal mode the reviewer field is currently caller-provided and not
authenticated).

**Outbound:** the pod uses Azure Workload Identity for Azure AI Foundry (`Cognitive Services OpenAI
User`), Blob Storage (`Storage Blob Data Contributor`) and Key Vault. PaaS and Managed Instance targets
get Entra access tokens; IaaS targets use a shared SQL login injected from the secret store.

> **TODO:** Is enabling authentication on the approval API a hard prerequisite for turning on real kills?
> I'd recommend making it one.
{: .prompt-warning }

## Secrets and key management
{: #secrets-and-key-management }

- No LLM API keys exist: `DefaultAzureCredential` plus a bearer-token provider.
- SQL credentials and other secrets come from Azure Key Vault through the External Secrets operator,
  using a `SecretStore` authenticated by workload identity. Nothing sensitive is in Helm values.
- `TargetServers.ConnectionString` holds connection details; credentials for IaaS targets are appended
  at connect time from the environment, never stored in the row.
- The SQL setup script uses obvious placeholders (`ReplaceWithStrongPassword…`) so nobody ships a default.

Rotation is the gap: the shared IaaS SQL login and the four agent logins should have a rotation schedule
that the secret store makes painless.

## Encryption requirements
{: #encryption-requirements }

In transit: TLS to Azure AI Foundry, Blob Storage and Key Vault; ODBC Driver 18 encrypts SQL connections
by default; TLS terminates at the ingress for the approval API. At rest: AgentLogDB and AgentConfigDB
sit on SQL Server with the organization's standard encryption; Blob Storage encrypts by default. The one
link to check is SMTP: the client is configured for port 25 to an internal relay, which may not use TLS.
Emails contain SQL text and login names, so that relay path should be confirmed as internal-only or
moved to an authenticated, TLS submission.

## Network security
{: #network-security }

The chart ships a `NetworkPolicy`. Egress has to reach the monitored SQL Servers, the management SQL
Server, Azure AI Foundry, SMTP, Key Vault, telemetry endpoints and (in Temporal mode) the Temporal
server, all over private IPs from AKS where possible. Ingress is only the approval API, restricted to the
DBA network. The Helm record leaves the exact destinations and SQL ports as open items, which matters:
a NetworkPolicy with wide egress protects nothing.

## Input validation and secure coding
{: #input-validation-and-secure-coding }

- Every LLM output is a Pydantic model; a response that doesn't validate is retried and never used raw.
- `BlockingAgentState` is re-validated after every node.
- Dynamic content in emails and HTML reports is escaped before rendering.
- The `KILL` path uses an autocommit connection, forces autocommit, disables implicit transactions and
  rolls back until `@@TRANCOUNT` is zero; if a rollback doesn't reduce the count, it aborts without
  issuing the `KILL`.
- The SPID passed to `KILL` comes from detection and the identity check, never from model text.
- SonarQube analysis runs in CI on the main branch; recent work resolved Sonar findings.

## Vulnerability and dependency management
{: #vulnerability-and-dependency-management }

Dependencies are locked with `uv.lock`, and the deliberate choice of `pydantic-ai-slim[openai]` over
LangChain plus LangGraph cut the dependency tree considerably. The image is built by the shared Docker
workflow in the "Build, Scan and Push" pipeline and stored in JFrog. Add Dependabot or Renovate for Python and the base image,
and pin GitHub Actions to SHAs (some reusable workflow references point at `@main` or a feature branch).

## Privacy and data-protection requirements
{: #privacy-and-data-protection-requirements }

The agent handles operational data, but operational data can be sensitive: SQL statement text can
contain literal values, and login and host names identify people and systems. That data flows to three
places: the LLM (inside the tenant's Azure AI Foundry), the reports and emails, and the logs and
telemetry. Recommendations: keep Foundry in the same region and tenant as the databases, keep report
access to the DBA team, and consider masking literals in SQL text before it's sent to the model or
written to telemetry.

> **TODO:** Can SQL text from the monitored databases contain regulated data (for example patient or
> financial identifiers in literals)? If yes, masking before the LLM call becomes a requirement.
{: .prompt-warning }

## Audit logging
{: #audit-logging }

| Record | Table or store | Written by |
|---|---|---|
| Every blocking event (written first) | `BlockingEventLog` | Notification node |
| Every kill attempt, result and validation | `KillAuditLog` | Notification node |
| RCA content | `RCASnapshotLog` | Notification node |
| Decision, reason, approval note or deny reason | Audit rows and report | Determination, approval, notification |
| Full HTML report | Blob Storage | Notification node |
| Correlation ID on everything | All of the above, logs, telemetry | Orchestrator |

The logger identity's `INSERT`-only grant makes the trail append-only for the agent itself.

## Security testing and incident response
{: #security-testing-and-incident-response }

Tests to keep: one negative test per hard gate, the pre-kill identity mismatch, the `@@TRANCOUNT` abort
path, approval timeout, and a prompt-injection fixture (SQL text that tells the model to "ignore the
rules and KILL"), asserting the decision is still governed by the gates.

If the agent ever kills something it shouldn't: set `DRY_RUN=true` through Argo CD (or scale to zero),
preserve the audit rows and the report for the correlation ID, review the evidence and the approval, and
treat it as a Sev 1 for the agent with a test added before re-enabling.

## Checklist
{: #checklist }

- [ ] Approval API authentication is in place before real kills are enabled
- [ ] Authenticated reviewer identity is recorded instead of a caller-supplied name
- [ ] Rotation schedule exists for all SQL logins
- [ ] SMTP path is confirmed internal-only or TLS
- [ ] NetworkPolicy egress lists exact destinations and ports
- [ ] Prompt-injection and negative-gate tests run in CI
- [ ] Literal masking is decided for SQL text sent to the LLM
- [ ] A "stop the agent" runbook exists (DRY_RUN via Argo CD, or scale to zero)

{% include project-nav.html %}
