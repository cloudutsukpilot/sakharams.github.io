---
layout: post
title: "SQL Blocking Agent: Data and Integration"
date: 2026-10-05 00:07:00 +0530
categories: [projects, sql-blocking-agent]
tags: [Projects, SQL Blocking Agent, Data, Integration]
description: "SQL Blocking Agent data: config and audit databases, incident data sent to the LLM, report storage, the Platform One JSON contract, and retention."
project: sql-blocking-agent
project_step: 7
image:
  path: /assets/img/projects/sql-blocking-agent/07-data-and-integration.webp
  alt: "SQL Blocking Agent: Data and Integration - Projects hero image"
---

The SQL Blocking Agent reads more data than it writes, and most of what it reads is sensitive in a quiet
way: SQL text, login names, host names, execution plans. What it writes is the evidence trail for a
production change. Getting both right means knowing exactly where every field goes, from DMV to model
prompt to email.

<!-- more -->

{% include project-nav.html %}

## Data ownership and classification
{: #data-ownership-and-classification }

| Data | Owner | Classification (recommended) |
|---|---|---|
| `TargetServers`, `ProtectedLogins`, `ExclusionWindows` (AgentConfigDB) | Database team (content), DevOps (schema) | Confidential: connection details |
| DMV snapshots: sessions, SQL text, plans, locks | Database team (source systems) | Confidential: may contain literals |
| `BlockingEventLog`, `KillAuditLog`, `RCASnapshotLog` (AgentLogDB) | Database team | Confidential, audit evidence |
| HTML RCA reports (Blob) and emails | Database team | Confidential |
| Logs and telemetry | DevOps team | Internal, may contain SQL text |
| Prompts and model outputs | DevOps team | Same as the inputs they contain |

## Data retention and deletion
{: #data-retention-and-deletion }

Nothing in the repo sets retention, so these are the decisions to make:

| Data | Recommendation |
|---|---|
| Audit tables | Keep as long as change records are kept; partition or archive by month |
| RCA reports in Blob | Lifecycle policy: cool tier after 30 days, delete after the audit period |
| Logs and App Insights | Workspace retention; shorter if SQL text isn't masked |
| `reports/` folder in the container | Ephemeral; Blob is the durable copy |
| `IncidentCooldown` | Self-cleaning by age |

> **TODO:** How long must kill and RCA records be kept, and does the same period apply to Blob reports?
{: .prompt-warning }

## Database schema and migrations
{: #database-schema-and-migrations }

Schema changes are numbered T-SQL scripts in `sql/`, applied in order on the management server:

| Script | Purpose |
|---|---|
| `01_config_db.sql` | AgentConfigDB: `TargetServers`, `ProtectedLogins`, `ExclusionWindows` |
| `02_log_db.sql` | AgentLogDB: `BlockingEventLog`, `KillAuditLog`, `RCASnapshotLog` |
| `03_logins.sql` | The four least-privilege logins and grants |
| `04_incident_cooldown.sql` | Durable cooldown table (Temporal mode) |
| `05_config_schema_migration.sql` | Server type, login pattern and related columns |
| `06_connection_string_config.sql` | Connection strings moved into `TargetServers` |
| `07_remove_target_server_dry_run.sql` | `DryRun` becomes application-only, removed from the table |

The Helm chart deliberately doesn't run migrations; the databases are external. That keeps schema
changes a reviewed DBA action. I'd make each script idempotent (the later ones already guard with
`COL_LENGTH` checks) and record applied versions in a small table so environments can be compared.

The PostgreSQL migration is fully written up in the deployment guide but is out of scope: the agent's
stores stay on SQL Server.

## Data validation and quality
{: #data-validation-and-quality }

- **Configuration:** rows must be `IsActive = 1` and `Enabled = 1`; a failed refresh keeps the last good
  set; per-server values override environment defaults only for a known list of keys.
- **Detection:** the head blocker is found by walking the chain to its root, not by trusting a single row.
- **LLM output:** every response validated against a Pydantic schema, retried on failure.
- **State:** re-validated after every node.
- **Pre-kill:** the session's identity (SPID, login name, login time) is re-read and must match.
- **Platform One report:** field and count limits validated, body capped at 1 MiB.

## Import and export requirements
{: #import-and-export-requirements }

Import is configuration only: servers, protected logins and exclusion windows are added with T-SQL,
which the deployment guide prefers over a JSON file. Export is the reports (HTML and Markdown), the audit
tables, and in Temporal mode the JSON report to Platform One. A weekly CSV or dashboard over AgentLogDB
for the database team is the export I'd add next.

## External systems and third-party integrations
{: #external-systems-and-third-party-integrations }

| System | Data sent | Failure behavior |
|---|---|---|
| Monitored SQL Servers | DMV queries; `KILL` when approved | Cycle errors; pod stays ready |
| Azure AI Foundry | Incident facts, SQL text, plans, diagnostics | Retries, then deterministic fallback; no kill decision without it |
| Azure Blob Storage | HTML report | Upload failure is logged |
| SMTP relay | Email to the DBA team | Logged |
| Platform One (Temporal only) | Approval registration; JSON RCA report | Retries for 408, 429, 5xx (max 3); recorded as failed without changing the outcome |

## Event and messaging contracts
{: #event-and-messaging-contracts }

The best-specified contract in the project is the Platform One report: schema version `1`, a
`correlation_id` used as the idempotency key, UTC `generated_at`, and a report with server, decision,
risk, summary, root cause, impact, recommendations, blocked-session metadata and key findings. HTTP 201
and 200 (duplicate) both count as success; 409 and 422 are not retried. That level of precision is the
model for the other contracts, especially the DBA email, which today has no versioned shape.

## Backup and restore strategy
{: #backup-and-restore-strategy }

AgentConfigDB and AgentLogDB are ordinary SQL Server databases on the management server, so they belong
in the database team's normal backup plan. AgentConfigDB matters most for recovery: without it the agent
starts with no servers (fail closed). Blob reports need soft delete and versioning to be recoverable.
The agent itself is stateless in loop mode and is restored by Argo CD.

> **TODO:** Are AgentConfigDB and AgentLogDB included in the management server's backup and restore
> testing?
{: .prompt-warning }

## Data migration and reconciliation
{: #data-migration-and-reconciliation }

Two migrations happened already. Connection strings moved from environment variables into
`TargetServers.ConnectionString` (each row carries its own full string; the agent adds an Entra token
for PaaS and MI targets or the shared SQL login for IaaS). And `DryRun` moved out of the table into the
application environment, so dry-run is decided in Git by the deployment, not by a database row.

Reconciliation after a migration is simple and worth doing: for each active row, the agent's startup
log prints the loaded configuration, which can be compared with the table.

## Checklist
{: #checklist }

- [ ] Retention periods are set for audit tables, Blob reports and logs
- [ ] Blob lifecycle policy and soft delete are configured
- [ ] Applied migration scripts are recorded per environment
- [ ] AgentConfigDB and AgentLogDB restores are tested
- [ ] A weekly incident export or dashboard exists for the database team
- [ ] The DBA email has a documented, versioned shape

{% include project-nav.html %}
