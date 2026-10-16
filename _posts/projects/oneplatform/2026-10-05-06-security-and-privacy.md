---
layout: post
title: "OnePlatform: Security and Privacy"
date: 2026-10-05 00:06:00 +0530
categories: [projects, oneplatform]
tags: [Projects, OnePlatform, Security, Privacy]
description: "Securing OnePlatform: Entra roles and a deny-by-default policy, backend PHI redaction, Key Vault with workload identity, scoped bots and audit trails."
project: oneplatform
project_step: 6
image:
  path: /assets/img/projects/oneplatform/06-security-and-privacy.webp
  alt: "OnePlatform: Security and Privacy - Projects hero image"
---

A developer portal that can start VMs, grant vault access and add people to GitHub organizations is a very attractive target. If someone compromises it, they hold every permission it holds. So on OnePlatform, security is mostly about the portal's own power: who can make it act, and what it may touch when it does. Telemetry in a health-care environment adds a second problem, keeping PHI away from people who shouldn't see it.

<!-- more -->

{% include project-nav.html %}

## Threat modeling
{: #threat-modeling }

The threats we design against, STRIDE-style, in the order I worry about them:

| Threat | Example | Main control |
|---|---|---|
| Elevation of privilege | A user runs a template their role doesn't allow by calling the API directly | Server-side permission policy on every route and template; hard blocks |
| Information disclosure | PHI in exception messages reaches a user outside the allowed location | Backend PHI filter, fail closed |
| Spoofing | A forged caller hits an internal backend route or webhook | Backstage service auth, static tokens for webhooks, JWT to middleware |
| Tampering | Catalog ownership changed to gain approval rights | UI catalog mutation hard-blocked; changes via Git or audited overlays |
| Repudiation | "I never approved that license" | Approval records with identity and time; Jira and audit tables |
| Supply chain | A compromised npm or NuGet package or GitHub Action | Pinned action SHAs, lockfiles, a private registry proxy, Dependabot, Sonar |

> **TODO:** Has a formal threat model been reviewed with the security team? If yes, link the review date; if not, this table is a good starting agenda.
{: .prompt-warning }

## Authentication and authorization
{: #authentication-and-authorization }

**Authentication.** Entra ID OAuth is the only production sign-in. The resolver checks the corporate email domain and membership of a standard-user group for the environment. Anyone outside it doesn't get a session at all. Idle sessions sign out after four hours, with a prompt first. A GitHub App sign-in is added only for actions that must act as the user on GitHub.

**Authorization** is one custom permission policy, deny by default:

- **13 role groups** from Entra map to permissions such as `template.azure-function.create` or `enterprise-user-audit.read`.
- **Environment scoping**: the same permission is allowed only in certain subscriptions and environments (Function Apps in development only; VM start in dev, QA and performance test).
- **Hard blocks** for everyone, admins included: creating or deleting catalog entities and managing templates through the UI.
- **Navigation follows permission**, but never replaces it. Hiding a sidebar item is UX; the 403 is the control.

Adding a permission has a written path (define it, gate the page or template, map roles, add the group), so new features don't invent their own checks.

## Secrets and key management
{: #secrets-and-key-management }

- **Production:** secrets live in Azure Key Vault and reach pods through the Key Vault CSI driver. The middleware uses **workload identity** and reads App Configuration with Key Vault references, so no connection strings sit in Helm values.
- **Local development:** developers used to keep about 50 plaintext credentials (four GitHub Apps, Jira OAuth, Datadog, SMTP, SonarQube, registry tokens, service principal secrets) in a local env file. A bootstrap step now fetches them from the development vault with the developer's own `az login`, at startup. That removed the most common way secrets leaked.
- **Builds:** the registry token goes into `docker build` as a BuildKit secret mount, never as a build arg or layer.
- **Runtime-resolved secrets:** Teams webhook URLs are resolved from Key Vault through a database name-to-secret mapping, not baked into config.

> **TODO:** What's the rotation policy and owner for the GitHub App keys and service principal secrets? Expiry of one of these is a likely outage.
{: .prompt-warning }

## Encryption requirements
{: #encryption-requirements }

In transit: TLS at the internal ingress with certificates from Key Vault, `ssl.require` with certificate verification on the PostgreSQL connection, and HTTPS to every external API. The middleware image trusts the corporate root and intermediate CA so it can verify internal services. At rest, we rely on the platform: Azure Storage, Key Vault and the PostgreSQL server encrypt by default.

> **TODO:** Is customer-managed key encryption required for the PostgreSQL server or storage holding audit data? If compliance requires it, it changes the infrastructure Terraform.
{: .prompt-warning }

## Network security
{: #network-security }

OnePlatform is internal only. Both the portal and the middleware API sit behind an internal ingress class, reachable from the corporate network, not the internet. The portal backend sets a Content Security Policy (with explicit frame sources for embedded Datadog dashboards) and a CORS allow-list. Production pods run with a container runtime defender for runtime threat detection.

Outbound, the backend reaches Azure, GitHub, Jira and the tool APIs. Package installs in CI go through the private registry proxy rather than the public npm registry.

## Input validation and secure coding
{: #input-validation-and-secure-coding }

- **Zod** schemas validate backend request bodies in newer plugins; template parameters are validated by an action before anything runs.
- **Parameterized SQL only.** Knex in the portal, EF Core in the middleware; unparameterized SQL is on the middleware's explicit "avoid" list.
- **Log forging:** the middleware wraps every logging provider with control-character escaping, and coding rules require `LogSanitizer.Sanitize()` for user input.
- **Sandboxed templates:** the scaffolder runs template expressions in `isolated-vm`.
- **No secrets in prompts or files:** the repository instructions say this explicitly for the Jira scripts and Sonar tokens, which matters when AI assistants are writing code.
- CodeQL extensions are configured in the middleware for custom sources and sinks.

## Vulnerability and dependency management
{: #vulnerability-and-dependency-management }

Dependabot runs weekly for npm, NuGet and GitHub Actions, with grouped minor updates so we get a handful of PRs instead of fifty. It resolves through the private registry with OIDC, not a stored token. GitHub Actions are pinned to commit SHAs. When a transitive package is vulnerable and its parent can't move yet, we pin it: the portal's `resolutions` block and the middleware's central package versions show this. A refresh prompt in the repo walks through Dependabot remediation. SonarQube gates new code in both repos.

## Privacy and data-protection requirements
{: #privacy-and-data-protection-requirements }

The portal shows Application Insights telemetry on the service map, and SQL exception parameters there can contain PHI. We filter it **on the server**:

{% include flow-anim.html id="projects/oneplatform/phi-filtering" %}

The rules live in one config file, with a master switch, the allowed locations and per-data-type rules. Changing a rule needs a backend redeploy and no frontend change. Generic filter helpers let any other API apply the same rules. Elsewhere we minimize what we copy: catalog users carry only the Graph fields we select, and E2E tests use a synthetic guest identity with synthetic data, never PHI, PII or real accounts.

## Audit logging
{: #audit-logging }

| Activity | Where it's recorded |
|---|---|
| Every template run (who, inputs, steps, result) | Scaffolder task history, plus run notifications |
| Jira tickets the platform creates or updates | Middleware Jira audit schema, queryable by date |
| User-access reviews and decisions | Middleware user audit schema, plus Jira tickets |
| Terminations | Termination logs per user and batch, reviewable in the portal |
| Copilot license decisions | Request table with approver, decision and chargeback fields |
| Role and navigation changes | Admin plugin tables |
| Notifications | Retained for one year |

> **TODO:** Are portal and middleware logs forwarded to the SIEM? If so, which events raise alerts (failed permission checks, admin changes)?
{: .prompt-warning }

## Security testing and incident response
{: #security-testing-and-incident-response }

Security tests that exist: permission tests per role in the backend, a 403 integration test for protected routes, and E2E checks that protected routes show the sign-in boundary when anonymous. SonarQube and CodeQL cover static analysis. One gap I'd close first: I couldn't find dedicated tests for the PHI filter rules. A table-driven test per rule (record in, redacted record out) is cheap and protects the most sensitive behaviour in the portal.

For incidents, the portal's own power is the first thing to cut: disable the affected template or permission (a policy change and redeploy), revoke the GitHub App installation or service principal secret, and check scaffolder history for what ran.

> **TODO:** Is there a written incident response runbook for a compromised portal identity, and has the portal had a penetration test?
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] Threat model reviewed with security and dated
- [ ] Every new route has a permission check and a 403 test
- [ ] Every telemetry route that can carry PHI calls the PHI filter, with a table-driven test per rule
- [ ] Rotation owner and schedule for GitHub App keys and service principal secrets
- [ ] No plaintext secrets in local env files; bootstrap covers every integration
- [ ] Portal and middleware logs flow to the SIEM with alerts on admin changes
- [ ] Incident runbook for a compromised portal identity written and rehearsed
- [ ] Penetration test scheduled

{% include project-nav.html %}
