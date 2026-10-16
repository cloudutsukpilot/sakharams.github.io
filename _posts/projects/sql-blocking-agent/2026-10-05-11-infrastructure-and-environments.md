---
layout: post
title: "SQL Blocking Agent: Infrastructure and Environments"
date: 2026-10-05 00:11:00 +0530
categories: [projects, sql-blocking-agent]
tags: [Projects, SQL Blocking Agent, Infrastructure, IaC]
description: "SQL Blocking Agent environments: local SQL Express, PR previews and development on AKS, production on AKS in dry-run, all built from one Helm chart."
project: sql-blocking-agent
project_step: 11
image:
  path: /assets/img/projects/sql-blocking-agent/11-infrastructure-and-environments.webp
  alt: "SQL Blocking Agent: Infrastructure and Environments - Projects hero image"
---

The SQL Blocking Agent's infrastructure is small: one pod, two databases on an existing management
server, a model deployment, a storage container. Its environments still need care, because each one
differs in exactly the setting that matters most: whether a `KILL` is real. This post lays out where it
runs, what each environment is for, and how they're kept in step.

<!-- more -->

{% include project-nav.html %}

## Development environment
{: #development-environment }

Two meanings, both in use:

- **A developer's laptop:** SQL Server Express, `LOCAL=true`, the developer's `az login` for Azure AI
  Foundry, console telemetry, `DRY_RUN` on unless deliberately testing the action path. This is where the
  live kill harness runs.
- **The development environment on AKS:** deployed by the promote workflow through Argo CD after each
  release, at the latest development version (v1.0.34 at the time of writing). It monitors
  non-production SQL Servers.

Development runs with **real kills** (`DRY_RUN=false`) against non-production servers, with human
approval. That makes it the place where the action path is proven before production ever kills.

## Test or QA environment
{: #test-or-qa-environment }

There's no separate QA environment. Its role is played by **PR preview deployments**: CI can build a
preview image and chart for a pull request and deploy it into development, and a teardown workflow
removes it when the PR closes. The promote workflow asks before replacing an active preview. That's a
good pattern for a single-replica agent, with one caution: only one poller may watch a given server at a
time, so a preview and the regular development deployment shouldn't both monitor the same server.

## Staging environment
{: #staging-environment }

There's no staging either: `versions.yaml` tracks `development` and `production` only. For this agent I
think that's acceptable, because production itself is running in dry-run and acts as the staging step
for decision quality. Once real kills are on in production, a staging step becomes more useful: a
production-like deployment in dry-run, watching production servers, running the next version's
decisions side by side with production's.

## Production environment
{: #production-environment }

| Setting | Value |
|---|---|
| Platform | AKS, deployed by Argo CD from the Helm chart |
| Version | v1.0.6 (`versions.yaml`) |
| Replicas | 1 (no leader lock yet) |
| Run mode | `loop` |
| `DRY_RUN` | `true` |
| `REQUIRE_HUMAN_APPROVAL` | `true` (mandatory) |
| State | AgentConfigDB and AgentLogDB on the SQL Server management server |
| Identity | Azure Workload Identity; secrets from Key Vault through External Secrets |
| Telemetry | Application Insights when deployed (`LOCAL=false`) |

## Infrastructure as code
{: #infrastructure-as-code }

The agent's Kubernetes resources are code: the Helm chart (`Deployment`, `ServiceAccount`,
`SecretStore`, `ExternalSecret`, `ConfigMap`, `Service`, `NetworkPolicy`, `PodDisruptionBudget`) with a
`values.schema.json`, published to the registry and synced by Argo CD from environment values in Git.

The Azure resources around it (AI Foundry deployment, storage account and container, Key Vault, role
assignments for the workload identity) are managed as code too, through
[Y-IaC](/tags/y-iac/), the shared Terraform and Terragrunt platform: they're declared in YAML in an
infra repository and go through the same plan, policy gates and approved apply as any other
infrastructure.

The database objects are T-SQL scripts in `sql/`, applied by the database team.

## Networking and DNS
{: #networking-and-dns }

- **To SQL Servers:** private IP connectivity from AKS to the monitored servers and the management
  server, on fixed ports so the NetworkPolicy and firewalls can be specific.
- **To Azure services:** Foundry, Blob Storage and Key Vault, ideally through private endpoints.
- **To SMTP:** the internal relay.
- **Inbound:** only the approval API, through a private ingress with TLS terminated at the controller,
  restricted to the DBA network.

The Helm design record still lists the exact SQL ports and egress destinations as open. Until they're
filled in, the NetworkPolicy can't be as tight as it should be.

## Compute, storage, and databases
{: #compute-storage-and-databases }

- **Compute:** one pod; a polling daemon that's idle between DMV queries and busy for a few seconds per
  LLM call. CPU and memory requests are still to be set per environment.
- **Storage:** none on the pod that matters. Reports in the container's `reports/` folder are ephemeral;
  the Blob upload is the durable copy.
- **Databases:** AgentConfigDB and AgentLogDB on the existing management SQL Server; the chart doesn't
  create or migrate them.

## Configuration and secret management
{: #configuration-and-secret-management }

| Kind | Mechanism |
|---|---|
| Non-secret settings (poll interval, dry-run, approval, models, endpoints) | Helm values → ConfigMap → env |
| Secrets (SQL logins) | Key Vault → External Secrets (`SecretStore` with workload identity) → env |
| Per-server settings and policy | AgentConfigDB tables, refreshed every minute |
| LLM model names and thinking levels | Env vars per agent (the deployment guide also shows them stored in Key Vault) |

The rule: anything that changes kill behavior is in Git (Helm values) or in the database team's tables,
never set by hand on a running pod.

## Environment parity
{: #environment-parity }

The same image and chart run everywhere, which gives good structural parity. The real gap is
**version parity**: development is at v1.0.34 and production at v1.0.6. Production (released 10 September)
already has the pre-kill identity check and the system-session protection policy, but not the
transaction-safe `KILL` connection, connection strings in AgentConfigDB, the R11 protected-login change,
the `gpt-5-mini` switch or the approval reviewer field. Dry-run limits the risk, but the decisions production
records are being made by older code than the code that will eventually kill. The dry-run review should
use the version that will go live.

## Capacity and quota planning
{: #capacity-and-quota-planning }

| Resource | What drives it |
|---|---|
| Azure AI Foundry quota (tokens per minute) | Incidents per minute across all servers, three calls each |
| Pod CPU and memory | Number of pollers and concurrent incidents |
| SQL connections | One reader connection per poll per server; more during diagnostics |
| AgentLogDB growth | Incidents per day, report snapshot size |

> **TODO:** What's the expected number of monitored servers and incidents per day? Those two numbers size
> the Foundry quota and the pod.
{: .prompt-warning }

## Checklist
{: #checklist }

- [x] Development runs real kills with approval; production stays in dry-run
- [ ] Previews and development never poll the same server at once
- [ ] Production is promoted to the current development version before the dry-run review
- [x] Azure resources around the agent are managed as code (Y-IaC)
- [ ] NetworkPolicy egress lists exact SQL ports and service endpoints
- [ ] Pod requests and limits are set per environment
- [ ] Foundry quota is sized for peak incidents

{% include project-nav.html %}
