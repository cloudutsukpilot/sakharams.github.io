---
published: false
layout: post
title: "OnePlatform: Data and Integration"
date: 2026-10-05 00:07:00 +0530
categories: [projects, oneplatform]
tags: [Projects, OnePlatform, Data, Integration]
description: "OnePlatform's data: what the catalog ingests, middleware schemas and migrations, the FOCUS cost import with integrity gates, and its integration contracts."
project: oneplatform
project_step: 7
image:
  path: /assets/img/projects/oneplatform/07-data-and-integration.webp
  alt: "OnePlatform: Data and Integration - Projects hero image"
---

Most of what OnePlatform shows, it doesn't own. Users come from Entra, repos from three GitHub organizations, resources from more than twenty Azure subscriptions, costs from FOCUS exports, job history from SQL Server. The portal's job is to bring that together without corrupting it. The data it *does* own, audits, approvals and terminations, is the data compliance will ask about. This post separates the two and shows how each is handled.

<!-- more -->

{% include project-nav.html %}

## Data ownership and classification
{: #data-ownership-and-classification }

| Data | System of record | OnePlatform holds | Classification |
|---|---|---|---|
| Users, groups, job titles, usage location | Entra ID | Catalog copy, refreshed every 10 min | Internal, PII (light) |
| Repos, teams, `catalog-info.yaml` | GitHub | Catalog copy | Internal |
| Azure resources and tags | Azure Resource Manager | Catalog copy per subscription | Internal |
| Telemetry (exceptions, dependencies) | Application Insights | Pass-through with cache; PHI filtered | **May contain PHI** |
| Cost (FOCUS) | Azure cost exports | Imported copy plus views | Confidential (financial) |
| Access audits, decisions | **OnePlatform middleware** | Owned | Confidential, compliance evidence |
| Termination logs | **OnePlatform middleware** | Owned | Confidential, compliance evidence |
| Copilot requests and approvals | **OnePlatform portal** | Owned | Internal, financial |
| Role-nav maps, fragments, alerts, notifications | **OnePlatform portal** | Owned | Internal |

The rule that follows: copies can be rebuilt, owned data needs backups and retention rules.

## Data retention and deletion
{: #data-retention-and-deletion }

Retention that's set in code or config today:

- Notifications: one year.
- Application Insights backfill for relations and dashboards: 90 days.
- GHAS active committers: the rolling 90-day billing window.
- SQL schedule compliance: 60 days of audit history.
- Catalog: `orphanStrategy: keep`, so an entity whose source disappears stays until someone removes it. I'd revisit this. Kept orphans make "who owns this?" lie.

What isn't set: retention for user audits, termination logs, Jira audit and cost data.

> **TODO:** Retention periods for audit evidence (user audits, terminations, Copilot approvals) and for imported cost data. Compliance usually wants a number of years here, and the design should purge after it.
{: .prompt-warning }

## Database schema and migrations
{: #database-schema-and-migrations }

**Portal:** each backend plugin owns its tables and ships Knex migrations, which Backstage runs at plugin startup. An integration test runs every owned migration against a real PostgreSQL 16 container, so a broken migration fails CI rather than a deploy.

**Middleware:** each feature has its own EF Core `DbContext`, schema and migrations folder (`UserAudits`, `FinOps`, `JiraAudits`, `FileMonitoring`, `TerminationAutomation`, …). Migrations are **applied deliberately, never at app startup**. A pair of workflows builds the migration bundle and applies it per environment:

```bash
# add a migration for one context (from the repo root)
dotnet ef migrations add <Name> --context UserAuditDbContext \
  --project src/Middleware.Services --startup-project src/Middleware.Api
```

Destructive changes use the swap pattern. The FinOps reconciliation migrations build replacement views, then swap names in one transaction, so rollback restores the previous views.

## Data validation and quality
{: #data-validation-and-quality }

The FinOps import is the clearest example of treating quality as a gate, not a report:

{% include flow-anim.html id="projects/oneplatform/finops-import" %}

"100% integrity" there means every manifest, blob, row count and tag record matched, not that the totals looked right. Elsewhere: catalog entities go through processors that validate locations exist; template inputs are validated by actions before anything runs; Zod validates request bodies in newer backend plugins.

## Import and export requirements
{: #import-and-export-requirements }

- **Imports:** FOCUS cost CSVs (gzip) from Blob Storage; CSV user lists into access audits; SharePoint-hosted Excel matrices for validation; State of DevOps results; sprint stories from Jira.
- **Exports:** audit results to CSV and as Jira attachments; data grids export to CSV; termination results per batch.

Imports are idempotent by design. Per-blob status means a rerun skips completed blobs, and a partial tag failure is repaired from stored data on the next run.

## External systems and third-party integrations
{: #external-systems-and-third-party-integrations }

| System | Direction | Identity | Used for |
|---|---|---|---|
| Entra ID / Microsoft Graph | Read, some write | App registration | Users and groups into the catalog; group membership changes, which is also how Artifactory, SonarQube and GitHub SSO access is granted; role assignment lookups |
| Azure ARM, Monitor, Cost, Log Analytics | Read, write | Service principals | Resource ingestion, VM start, role assignments, metrics, logs, cost |
| GitHub (three orgs, enterprise) | Read, write | One GitHub App per org; PAT where required | Discovery, repos, teams, invitations, workflows, Copilot, GHAS, billing |
| Jira Cloud | Write | OAuth 2.0 client credentials | Tickets for audits, late files, approvals |
| SQL Server | Read (dynamic write for terminations) | SQL logins from Key Vault | Agent jobs, monitoring, termination per app |
| SonarQube, Statuspage, Datadog | Read | Tokens | Entity page cards |
| Ansible, Zscaler | Write | API credentials | Close files, network policy |
| SMTP | Send | Relay | Reminders, approvals |
| Temporal | Signal | Per-app connection config | HITL decisions |

## Event and messaging contracts
{: #event-and-messaging-contracts }

Three contracts other teams build against:

**GitHub webhooks into the portal.** An org-membership event completes Copilot provisioning: once the invited user joins, the seat is assigned. Webhooks authenticate with their own static token.

**Notifications API.** CI pipelines and monitoring tools can send in-app notifications to users or groups with a per-environment bearer token. Messages appear in the sidebar with a toast.

**HITL approvals (v1).** An external Temporal workflow registers an approval, OnePlatform shows it to authorized reviewers, and the decision comes back as **one** Signal:

```json
// POST /api/temporal-hitl/hitl/register  (service-to-service auth)
{ "source_app": "agent-one", "temporal_namespace": "agent-namespace",
  "task_queue": "agent-task-queue", "temporal_workflow_id": "workflow-123",
  "signal_name": "hitl_decision",
  "context": { "title": "Review this request", "details": "…" },
  "expires_at": "2026-08-14T13:00:00.000Z" }

// Signal payload sent back to the workflow
{ "decision": "approved", "reviewer": "reviewer@example.com", "comment": "…" }
```

The first consumer is the [SQL Blocking Agent](/tags/sql-blocking-agent/), whose KILL approvals and RCA reports land in this inbox.

## Backup and restore strategy
{: #backup-and-restore-strategy }

Recommended split, following the ownership table: back up the PostgreSQL server with point-in-time restore. Treat the catalog as rebuildable (re-ingestion takes hours, not days). Test restore of the owned schemas, which are audit, termination, Copilot requests, role maps and fragments, at least quarterly.

> **TODO:** The repos don't say how the PostgreSQL server is backed up or whether a restore has been tested. What's the backup retention and the last tested restore date?
{: .prompt-warning }

## Data migration and reconciliation
{: #data-migration-and-reconciliation }

OnePlatform has done several in-place migrations without downtime, and the pattern was the same each time:

| Migration | From → to | How |
|---|---|---|
| SQL monitoring config | Azure Storage Tables → middleware PostgreSQL endpoints | Service wrappers and mapping adapters kept the UI unchanged |
| Copilot license requests | Table storage (v1) → PostgreSQL with approvals (v2) | v2 action added; v1 retained for backward compatibility |
| Historical data | Blob archives → middleware | One-off historical migration Function |
| Catalog ingestion | One provider → one per subscription | Same entity refs, so no orphans |

Reconciliation is built into FinOps. Monthly reports include *Marketplace*, *Reservations* and *Untagged* line items, so reports add up to billed cost and nothing disappears into a missing tag.

## Checklist
{: #checklist }

- [ ] Ownership table agreed: which data OnePlatform owns versus copies
- [ ] Retention periods set and purges implemented for owned evidence data
- [ ] Catalog orphan strategy reviewed (keep vs delete)
- [ ] Every middleware migration applied by workflow, never at startup
- [ ] Backup retention documented and a restore of owned schemas tested
- [ ] Notifications and HITL contracts versioned and published to consuming teams
- [ ] Per-integration credential owner and expiry tracked

{% include project-nav.html %}
