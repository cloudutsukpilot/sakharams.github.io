---
published: false
layout: post
title: "OnePlatform: Requirements Gathering"
date: 2026-10-05 00:02:00 +0530
categories: [projects, oneplatform]
tags: [Projects, OnePlatform, Requirements]
description: "How OnePlatform captures requirements: per-feature PLAN docs tied to Jira, role-scoped rules, PHI and SOX constraints, and testable acceptance criteria."
project: oneplatform
project_step: 2
image:
  path: /assets/img/projects/oneplatform/02-requirements-gathering.webp
  alt: "OnePlatform: Requirements Gathering - Projects hero image"
---

A developer portal never has one set of requirements. It has eighty small ones, arriving from DBAs, auditors, finance and SREs, each with its own idea of "done". On OnePlatform the discipline that keeps this manageable is simple: no feature starts without a PLAN document that records the problem, the users, the rules and the acceptance criteria. This post covers the platform-wide requirements and how each feature's requirements are captured.

<!-- more -->

{% include project-nav.html %}

## Functional requirements
{: #functional-requirements }

At platform level, OnePlatform must:

| # | Requirement | Where it lives |
|---|---|---|
| F1 | Sign users in with corporate SSO and resolve their roles from Entra groups | Auth and permission policy |
| F2 | Keep a catalog of components, APIs, systems, Azure resources, users and teams, with owners | Catalog and custom entity providers |
| F3 | Offer self-service templates that validate input, check permission and environment, then act | Scaffolder plus ~50 custom actions |
| F4 | Show operational dashboards (files, SQL jobs, smoke tests, service map, API gateway) | Custom plugins plus middleware |
| F5 | Run compliance workflows: access audits, terminations, license approvals | Plugins plus middleware with Jira and email |
| F6 | Report on cost, Copilot, GHAS, licenses, DORA and scorecards | Insights plugins plus scheduled imports |
| F7 | Let admins manage roles, navigation, notifications and system alerts without a deploy | Admin plugins with database-backed config |

Each feature then has its own functional list in its PLAN. The [feature catalog](/posts/projects/oneplatform/03-product-planning/#feature-catalog) is the index of those features.

## Non-functional requirements
{: #non-functional-requirements }

The ones that shaped the design:

- **Security first.** Every backend route checks the caller. Permission is enforced on the server, not by hiding buttons.
- **Data minimization.** PHI is redacted on the server for users who may not see it, and the browser never receives the raw value.
- **Auditability.** Any action that changes access or infrastructure leaves a record: a scaffolder task log, a database row, a Jira ticket or all three.
- **No catalog thrash.** Ingesting ~10,000 Azure resources must not lock the catalog database for everyone else. This became a real requirement after it happened ([Scalability](/posts/projects/oneplatform/05-technical-architecture/#scalability-and-performance-strategy)).
- **Upgradeability.** We must stay close to upstream Backstage, so customizations go in plugins and modules, not forks. Patches are a last resort (`patch-package`).
- **Testability.** Unit, integration and E2E lanes must pass before merge; SonarQube gates new code.

> **TODO:** What are the availability and latency targets for the portal and the middleware API? The repos have health checks but no recorded SLOs. See [Operations](/posts/projects/oneplatform/14-operations-and-observability/#availability-and-performance-targets).
{: .prompt-warning }

## User journeys and use cases
{: #user-journeys-and-use-cases }

Three journeys cover most of the portal's value:

**"I need a Function App in dev."** The engineer opens Create, picks *Create Azure Function App*, chooses subscription, environment and runtime from pickers that only list what they may use. The template checks name availability and prerequisites. It triggers the Terraform workflow, waits for it, and notifies the engineer.

**"Quarterly access review."** An audit manager creates an audit and starts it. Managers get review pages for their direct reports, reminders go out, changes become Jira tickets, and the closed audit is the evidence.

**"Is the nightly file in?"** An operations analyst opens Enterprise File Monitoring and sees which expected files arrived, which are late and which were zero bytes. Each late or empty file already has a Jira ticket.

Writing journeys like these in the PLAN, before any UI, is what stops a feature turning into a generic CRUD screen.

## Acceptance criteria
{: #acceptance-criteria }

Acceptance criteria are written as checks a reviewer can run, and every PLAN carries them. A trimmed example in the style we use, for the team-level Key Vault access redesign:

```text
Given a user with a role allowed to request Key Vault access
When they submit a request for an Entra group on a non-production vault
Then an approval request is recorded
And on approval, one Azure role assignment is created at vault scope for that group
And no per-secret, per-user role assignments are created
And a user without the permission sees the template disabled and the API returns 403
```

The last line matters. Every permission-gated feature includes a negative criterion, so a reviewer checks that the denial works and not only the happy path.

## Business rules
{: #business-rules }

Rules that the portal enforces in code, not in documentation:

| Rule | Enforced by |
|---|---|
| Create Function App and Web App only in development environments | Environment scoping in the permission policy |
| Start VM only in dev, QA and performance-test subscriptions | Same |
| Key Vault, App Config and Service Bus requests only for non-production | Same |
| Nobody creates or deletes catalog entities, or manages templates, through the UI | Hard-blocked permissions |
| Copilot licenses need Finance, DevOps and cost-centre-owner decisions | Approval routing in the request service |
| Inactive accounts get escalating notices, with termination at 90 days | Daily middleware job |
| PHI is visible only to users whose directory usage location is allowed | Backend PHI access check |

## Reporting and analytics requirements
{: #reporting-and-analytics-requirements }

Reporting turned out to be a third of the portal. The requirements we keep relearning:

- Reports must be **pre-aggregated**. FinOps reads materialized views, never the raw cost table, so a page load costs a few indexed lookups.
- Every report needs an **owner and a refresh schedule** written down (daily FOCUS import at 05:00 UTC, daily State of DevOps ingestion, weekly sprint predictability).
- **Exports.** Audits import and export CSV; many grids export.
- **Attribution.** GitHub data is only useful when tied to a person, which is why GitHub login and email sync exist.

## Accessibility and localization requirements
{: #accessibility-and-localization-requirements }

Localization doesn't apply: it's an internal, English-only tool. Accessibility does. The portal inherits Backstage's MUI components, and the light/dark theme work moved every shared component to semantic colours, which helped contrast.

> **TODO:** Is there a stated accessibility target (WCAG 2.1 AA?) for internal tools? If so, add it as an acceptance criterion for new pages. See [Accessibility testing](/posts/projects/oneplatform/10-quality-assurance/#accessibility-testing).
{: .prompt-warning }

## Regulatory, legal, and compliance requirements
{: #regulatory-legal-and-compliance-requirements }

- **PHI handling.** Application Insights telemetry can carry PHI inside SQL exception parameters. The backend must redact it for users outside the allowed location, fail closed, and never rely on the frontend.
- **SOX/SOC.** User-access reviews, termination and license approvals need complete, retained evidence.
- **Least privilege.** Templates act through service principals and GitHub Apps with scoped rights, so users never hold standing elevated access.

> **TODO:** Confirm the retention period compliance requires for audit and termination records. It decides the retention design in [Data and Integration](/posts/projects/oneplatform/07-data-and-integration/#data-retention-and-deletion).
{: .prompt-warning }

## Prioritization and release scope
{: #prioritization-and-release-scope }

The portal grew in the order the pain was felt: catalog and Azure resources first (2024), then self-service infrastructure templates, then access and licensing, then operations dashboards and audits (2025), then insights, FinOps and portal administration (2026). [Product Planning](/posts/projects/oneplatform/03-product-planning/#product-roadmap) shows that roadmap and the full catalog.

For each feature, the per-feature requirement record has a fixed shape, which is also the outline for the feature deep-dives I plan to write:

1. Problem and who asked
2. Users and roles affected
3. Functional and non-functional requirements
4. Business rules and permissions
5. Acceptance criteria, including the denial case
6. Out of scope

## Checklist
{: #checklist }

- [ ] Every feature in the catalog has a PLAN with problem, users, rules and acceptance criteria
- [ ] Each permission-gated feature has a negative (403) acceptance criterion
- [ ] Environment scoping rules reviewed with the cloud team for each Azure template
- [ ] Portal and middleware availability and latency targets agreed
- [ ] Audit and termination record retention confirmed with compliance
- [ ] Each report has an owner and a documented refresh schedule
- [ ] Accessibility target agreed and added to the PLAN template

{% include project-nav.html %}
