---
layout: post
title: "OnePlatform: Governance and Compliance"
date: 2026-10-05 00:17:00 +0530
categories: [projects, oneplatform]
tags: [Projects, OnePlatform, Governance, Compliance]
description: "OnePlatform as a governance tool: SOX/SOC access reviews, terminations, Copilot and license approvals, policy-as-code permissions and evidence that collects itself."
project: oneplatform
project_step: 17
image:
  path: /assets/img/projects/oneplatform/17-governance-and-compliance.webp
  alt: "OnePlatform: Governance and Compliance - Projects hero image"
---

Most projects treat governance as something done *to* them. OnePlatform is mostly governance done *by* it. It runs the quarterly user-access reviews, executes terminations across applications, routes Copilot licenses through Finance, and reports on VM compliance and license use. So this post has two halves: how the portal itself is governed, and how it produces evidence for everyone else.

<!-- more -->

{% include project-nav.html %}

## Project governance
{: #project-governance }

The portal is run as an internal product by the platform team. Work enters as Jira tickets, larger items get a PLAN that stakeholders can review before build, and the [feature catalog](/posts/projects/oneplatform/03-product-planning/#feature-catalog) is the record of what exists.

> **TODO:** Is there a steering group or regular review where stakeholders (security, finance, operations, engineering leadership) see the roadmap and approve priorities? How often?
{: .prompt-warning }

## Decision-making and approval authorities
{: #decision-making-and-approval-authorities }

| Decision | Who decides (as built) |
|---|---|
| Who may use a template or page | Role-to-permission mapping in the permission policy (code review by the platform team) |
| Who holds a role | Entra group membership; admins via the user access management template |
| What appears in each role's navigation | Admins, in the role-navigation admin page |
| A Copilot license | Finance, DevOps and the cost-centre owner; each decides deny, approve offset by a named budget item, or approve with no budget to cover (accepting overspend) |
| A Key Vault access grant | Approver on the request, then a vault-scope role assignment |
| A HITL action in an external workflow | An authorized reviewer in the portal inbox |
| Production release | Approver on the production GitHub environment |

The model I'd defend: role membership lives in Entra (where access reviews already look), and role *meaning* lives in code (where changes are reviewed and versioned).

## Audit requirements
{: #audit-requirements }

OnePlatform supports SOX/SOC controls on user access, and it has to be auditable itself. What it records:

- Every template run: who, when, inputs, each step's result.
- Every Jira ticket it creates or updates, with date-range queries.
- Every access-review decision, every termination per user and batch, every Copilot approval with chargeback fields.

> **TODO:** Which specific controls (by ID or name) rely on OnePlatform evidence, and has an auditor reviewed the portal's records yet? That's the strongest statement this playbook could make about compliance, and I won't guess it.
{: .prompt-warning }

## Access reviews
{: #access-reviews }

The enterprise user audit feature runs reviews end to end:

1. An audit manager **creates** an audit (applications, scope, user list by CSV import).
2. **Starts** it: managers get review pages for their direct reports, using the manager hierarchy.
3. **Reminders** go to managers who haven't finished.
4. Changes become **Jira tickets** for the application owners.
5. The closed audit, with decisions and tickets, is exported as **evidence**.

Two adjacent features close the loop. **Termination automation** removes a leaver's access across every configured application from one request. **90-day inactivity termination** finds idle accounts daily, sends escalating notices and can terminate at 90 days. And the portal's own roles are Entra groups, so they're reviewed by the same process.

## License management
{: #license-management }

License data is one of the portal's most-used report areas:

| License | What OnePlatform does |
|---|---|
| GitHub Enterprise seats | Grants via SSO group and org invitation; reports active users |
| GitHub Copilot | Tiered self-service requests with approvals; usage, AI credits and budgets per manager |
| GitHub Advanced Security | Active committers in the 90-day billing window |
| Visual Studio subscriptions, Docker Business | Seat reports enriched from Entra ID |

The useful thing is the join. Because GitHub logins and emails are synced to catalog users, a report can say "this licensed user left three months ago" or "this team's Copilot budget is 80% used".

## Compliance reporting
{: #compliance-reporting }

Reports that exist as portal pages: VM compliance, short-lived servers, database server inventory and growth, GHAS alert statistics, Copilot and license reports, FinOps reports with reconciliation line items, DORA metrics and State of DevOps scorecards. The scorecard checks were ported into the middleware's daily ingestion from the analyzers of the [State of DevOps](/tags/state-of-devops/) project. Each is registered as an insights template with its own permission, so access to a report is itself governed.

## Data governance
{: #data-governance }

The rules are in [Data and Integration](/posts/projects/oneplatform/07-data-and-integration/#data-ownership-and-classification): which data the portal owns versus copies, PHI redaction on the server, synthetic data only in tests, and minimal Graph fields in the catalog. The open item is retention for evidence data, which needs a number from compliance.

## Vendor and third-party management
{: #vendor-and-third-party-management }

OnePlatform depends on Backstage (open source, CNCF), community plugins (SonarQube, Statuspage), and vendor APIs (Microsoft, GitHub, Atlassian, Datadog). The risks we've actually hit are API retirements, like GitHub's legacy Copilot metrics API, and auth changes, like AI-credit billing needing a PAT instead of App auth. I'd keep a short register: dependency, owner, auth method, credential expiry, and the vendor's deprecation channel.

## Policy enforcement
{: #policy-enforcement }

Policies the portal enforces as code, not as guidance:

- **Permission policy:** role-to-permission maps, environment scoping (create Function Apps only in development; start VMs only in dev, QA and perf-test), hard blocks on catalog and template mutation.
- **PHI policy:** one config file, enforced on the server, fail closed.
- **Template guardrails:** naming checks, existence checks and prerequisites in actions before anything is created; Terraform in the target repos applies the organization's modules.
- **Approval policy:** multi-party approvals for licenses; team-level vault access instead of per-user secret access.

## Evidence collection
{: #evidence-collection }

The best property of a portal like this: evidence is a by-product. Nobody assembles screenshots for an access review, because the audit record *is* the evidence. For each control that relies on the portal, I'd document one query or export that produces the evidence on demand, so the next audit is a report run, not a project.

## Checklist
{: #checklist }

- [ ] Stakeholder review of roadmap and priorities on a fixed cadence
- [ ] Decision table above confirmed and published
- [ ] Controls relying on OnePlatform evidence listed, with one evidence query each
- [ ] Portal roles included in the enterprise access review
- [ ] Vendor and credential register with deprecation channels
- [ ] Evidence retention period set and enforced
- [ ] Each compliance report has an owner and a permission

{% include project-nav.html %}
