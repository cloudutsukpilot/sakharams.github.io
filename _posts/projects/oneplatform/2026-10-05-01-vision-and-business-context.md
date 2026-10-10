---
layout: post
title: "OnePlatform: Vision and Business Context"
date: 2026-10-05 00:01:00 +0530
categories: [projects, oneplatform]
tags: [Projects, OnePlatform, Vision, Business]
description: "Why we built OnePlatform, a Backstage developer portal that turned Azure, GitHub, access and audit tickets into self-service workflows."
project: oneplatform
project_step: 1
image:
  path: /assets/img/projects/oneplatform/01-vision-and-business-context.webp
  alt: "OnePlatform: Vision and Business Context - Projects hero image"
---

Before OnePlatform, starting a stopped test VM, getting a GitHub seat or answering a quarterly access audit meant a ticket, a wait and a person with the right Azure role doing it by hand. OnePlatform is our Backstage-based internal developer portal. It's where those requests became forms that check your permissions, call the right API and leave an audit trail. This post covers why it exists, who it serves and how we decide whether it's working.

<!-- more -->

{% include project-nav.html %}

## Business problem and opportunity
{: #business-problem-and-opportunity }

The problem wasn't missing tools. We had too many, each behind its own gate. Azure resources sat across more than twenty subscriptions. Code lived in three GitHub organizations. Access to Key Vault, App Configuration, Application Insights, Artifactory and SonarQube each had its own request path. Operations teams watched file drops and SQL Agent jobs in spreadsheets and SSMS. Compliance asked for periodic user-access reviews that were assembled by hand.

Three costs kept coming up:

- **Waiting.** A routine change, like starting a VM in a QA subscription or adding a Service Bus queue, waited in a queue for someone with elevated rights.
- **Inconsistency.** Two engineers creating "the same" Function App ended up with different names, tags and storage settings.
- **Evidence.** When an auditor asked who had access to what and who approved it, the answer was spread across email, tickets and portal logs.

Backstage gave us a framework to put a single front door on all of it. Its catalog, templates and plugin model fit the problem; we cover the alternatives in [Technical Architecture](/posts/projects/oneplatform/05-technical-architecture/#technology-and-framework-selection). The opportunity was bigger than a catalog, though. Once a portal knows who you are, what role you hold and which resources your team owns, it can safely do things on your behalf.

> **TODO:** What was the before-picture in numbers? For example, monthly ticket volume for VM starts, access requests and GitHub licenses, and the typical turnaround. This is the baseline for [Success metrics](#success-metrics-and-business-kpis).
{: .prompt-warning }

## Goals, objectives, and expected outcomes
{: #goals-objectives-and-expected-outcomes }

We set four goals, and they still hold:

1. **Self-service with guardrails.** Common infrastructure and access requests run from a template that validates input, checks the requester's role and the target environment, and only then calls Azure, GitHub or Terraform.
2. **One catalog of what we run.** Services, APIs, Azure resources, users and teams sit in one place with ownership, so "who owns this VM?" has an answer.
3. **Operational visibility without production access.** File monitoring, SQL jobs, smoke tests, service maps and API gateway health are visible to the people who need them, without granting server or portal rights.
4. **Compliance as a by-product.** Access reviews, terminations, license approvals and cost reports produce their own evidence because they run through the portal.

The expected outcome is fewer tickets for routine work, faster turnaround, and audits that take days instead of weeks. The last two depend on numbers we don't have recorded yet (see the TODO above).

## Stakeholders, sponsors, and decision-makers
{: #stakeholders-sponsors-and-decision-makers }

| Group | Interest in OnePlatform | Decides |
|---|---|---|
| Platform engineering (the portal team) | Builds and runs the portal and middleware | Architecture, plugin boundaries, release timing |
| Cloud / DevOps | Owns the Terraform and Azure guardrails the templates call | Which resources are self-service, in which environments |
| Security and identity | Entra groups, PHI handling, audit evidence | Role model, data exposure rules |
| Operations and DBA teams | File and SQL monitoring, smoke tests, DBA reports | What gets monitored and how alerts route |
| Finance and cost-centre owners | Copilot and license approvals, FinOps reports | Approval chains, chargeback |
| Engineering leadership | Adoption, DORA and scorecard reporting | Priorities across the backlog |

> **TODO:** Who is the executive sponsor, and who has final say on the roadmap when teams compete for the portal team's time? Name roles, not people, if you'd rather keep it anonymous.
{: .prompt-warning }

## Target users and personas
{: #target-users-and-personas }

The role model in the portal is the best description of our personas, because each role exists because a group of people needed a different set of tools:

| Persona | Typical day in OnePlatform |
|---|---|
| Software engineer, architect | Create a Function App or repo, request Key Vault or App Config access, read TechDocs |
| SRE / DevOps | Start VMs, add queues, run workflows, check the service map |
| Data engineer / analyst | Data-platform resources, SQL job dashboards |
| QA engineer, tester | Start test environments, run smoke tests |
| Operations | File and SQL monitoring rules, close a locked file, smoke tests |
| Team lead / manager | Manage team membership, review access audits, approve Copilot budgets |
| Leadership | DORA, scorecards, Copilot and FinOps reports |
| Auditors and audit managers | Enterprise user-access audits and their evidence |
| Portal admins | Roles, navigation, broadcasts, system alerts |

The interesting persona is the one with no GitHub seat. Operations staff trigger GitHub-hosted smoke tests through the portal, and the portal holds the GitHub App identity. That saves licenses and keeps those users out of repositories they don't need.

## Success metrics and business KPIs
{: #success-metrics-and-business-kpis }

What I'd measure, and where each number comes from. The portal already collects most of the raw data:

| KPI | Source in OnePlatform |
|---|---|
| Monthly active users, by role | Adoption Insights (portal telemetry in Application Insights) |
| Template runs per month, success rate | Scaffolder task history plus the run notifications |
| Median time from request to done, per template | Scaffolder task timestamps; approval timestamps for gated requests |
| Tickets avoided | Template runs that previously were tickets (needs the baseline) |
| Access-review cycle time | Enterprise user audit created/closed dates |
| Copilot seats requested vs approved vs used | Copilot license requests and usage reports |
| Catalog ownership coverage | Share of Resource and Component entities with an owner |

> **TODO:** Which three of these does leadership actually look at, and what are the targets? Without targets these are dashboards, not KPIs.
{: .prompt-warning }

## Scope, assumptions, constraints, and dependencies
{: #scope-assumptions-constraints-and-dependencies }

**In scope:** the portal (catalog, templates, TechDocs, search, custom plugins), a .NET middleware for data-heavy and scheduled work, and the integrations with Azure, Entra ID, GitHub, Jira and the operational tools.

**Out of scope:** owning the Azure landing zone or the Terraform modules themselves. The portal triggers infrastructure workflows that other repositories own.

**Assumptions:** everyone has an Entra identity; Entra groups are the source of truth for roles; teams will keep `catalog-info.yaml` files in their repos.

**Constraints:**

- Health-care data rules. Telemetry can contain PHI, so the backend redacts it for users outside the allowed location ([Security and Privacy](/posts/projects/oneplatform/06-security-and-privacy/#privacy-and-data-protection-requirements)).
- SOX/SOC evidence for access reviews and terminations.
- Internal-only network exposure.
- Backstage's release cadence: a minor release roughly every month, and we must keep up.

**Dependencies:** the Terraform repo that provisions the portal's own infrastructure, a charts repo watched by Argo CD, GitHub Apps per organization, and service principals with scoped Azure rights.

## Checklist
{: #checklist }

- [ ] Before-picture recorded: ticket volumes and turnaround for the top ten request types
- [ ] Executive sponsor and roadmap decision-maker named (role at least)
- [ ] Three headline KPIs chosen, with targets and an owner each
- [ ] Persona list reviewed against the 13 portal roles; no persona without a role
- [ ] Out-of-scope boundary with the infrastructure repos written down and agreed
- [ ] PHI and SOX/SOC constraints confirmed with security and compliance
- [ ] Adoption Insights dashboard shared with leadership monthly

{% include project-nav.html %}
