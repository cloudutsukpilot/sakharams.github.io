---
layout: post
title: "Dunderly HR System: Infrastructure and Environments"
date: 2026-10-07 00:11:00 +0530
categories: [projects, dunderly]
tags: [Projects, Dunderly, Infrastructure, IaC]
description: "Dunderly HR environments: dev, test and prod in Bicep, a production staging slot instead of a fourth environment, private endpoints, and quotas that barely matter."
project: dunderly
project_step: 11
image:
  path: /assets/img/projects/dunderly/11-infrastructure-and-environments.webp
  alt: "Dunderly HR System: Infrastructure and Environments - Projects hero image"
---

Four environments is the textbook answer. For an HR system with ten concurrent users and a team of four,
it's one environment too many to pay for, patch and keep in step. Dunderly gets three (dev, test, prod),
and production's deployment slot plays the part of staging: the new build runs on production
infrastructure, against production configuration, before a single user sees it.

<!-- more -->

{% include project-nav.html %}

## Development environment
{: #development-environment }

Two kinds of "dev":

- **Local:** the .NET Aspire AppHost with SQL Server in a container and Azurite (see
  [Local development setup](/posts/projects/dunderly/08-development-preparation/#local-development-setup)).
  This is where most development happens.
- **Shared dev in Azure** (`rg-dunderly-hr-dev`): deployed from every merge to `main`. It proves the Bicep,
  the managed identities and the private networking work, which a laptop can't.

Dev uses the smallest SKUs: App Service B1 (no slots needed), SQL serverless with auto-pause after an hour,
Functions Flex Consumption, LRS storage. It holds only synthetic data. A budget alert at a low threshold
catches anything left running large.

## Test or QA environment
{: #test-or-qa-environment }

`rg-dunderly-hr-test` is where E2E tests, the ZAP scan, performance tests and UAT run. It's built from the
same Bicep as production with a parameter file that changes only sizes and names:

| Setting | Dev | Test | Prod |
|---|---|---|---|
| App Service plan | B1 | P0v3 | P0v3, 1 to 2 instances |
| Deployment slots | No | Yes (to rehearse swaps) | Yes |
| SQL serverless max vCores / auto-pause | 1 / 60 min | 2 / 60 min | 2 / off |
| Storage redundancy | LRS | LRS | GRS |
| Defender for Storage malware scanning | Off (fake scanner) | On | On |
| Data | Synthetic | Synthetic | Real |

Test has its own Entra app registrations and test users, and its own payroll outbound account, which the
payment system's **test** instance (if there is one) pulls from.

> **TODO:** Does the legacy payment system have a test instance? If not, file acceptance has to be checked
> by its owner manually from sample files, and the parallel run carries more weight.
{: .prompt-warning }

## Staging environment
{: #staging-environment }

No separate staging environment. The **staging slot** on the production App Service is staging:

- Same plan, VNet, private endpoints, managed identity permissions and Key Vault as production.
- A slot-sticky app setting (`Hr__IsStagingSlot=true`) turns off anything in the API that must only run
  once, such as scheduled cache warm-ups, while the build is waiting in the slot.
- Smoke tests run against it, then it's swapped in (see [Deployment automation](/posts/projects/dunderly/12-cicd-and-release-management/#deployment-automation)).

The Functions app has no slots on Flex Consumption; it deploys after the API swap, and its jobs are
idempotent, so a brief overlap is harmless. The trade-off: there's no long-lived staging copy of the data
for exploratory testing in prod-like conditions. Test covers that with synthetic data at production scale.

## Production environment
{: #production-environment }

`rg-dunderly-hr-prod` in West Europe (assumption A1), with these properties:

- Resource lock (`CanNotDelete`) on the resource group.
- Diagnostic settings on every resource send logs to the prod Log Analytics workspace.
- Only the deployment identity (via GitHub OIDC) and PIM-elevated admins can change anything.
- Defender for Cloud recommendations reviewed monthly.
- Public network access disabled on SQL and Key Vault; documents storage through private endpoint only.

A separate resource group, `rg-dunderly-hr-shared`, holds what outlives an environment: the Log Analytics
workspace and the action groups for alerts.

## Infrastructure as code
{: #infrastructure-as-code }

**Bicep with Azure Verified Modules** ([ADR-009](/posts/projects/dunderly/05-technical-architecture/#architectural-decision-records)),
in `infra/`:

```text
infra/
├── main.bicep              # subscription scope: resource group + modules
├── modules/                # thin wrappers: network, data, app, functions, monitoring
└── env/
    ├── dev.bicepparam
    ├── test.bicepparam
    └── prod.bicepparam
```

Every change goes through a PR with `az deployment sub what-if` output posted as a comment, and is applied
by the pipeline, never from a laptop. Portal changes in prod are treated as drift: a weekly scheduled
what-if reports differences.

```bash
az deployment sub what-if -l westeurope -f infra/main.bicep -p infra/env/prod.bicepparam
```

Why not Terraform? Equally valid, and this blog has plenty on it ([Terraform - Azure](/posts/devops/orchestration/terraform/terraform-azure/)).
For an Azure-only estate run by a .NET team, Bicep avoids a state file and its backend, and gets new Azure
features on day one.

## Networking and DNS
{: #networking-and-dns }

One VNet per environment, small address spaces (no peering needed):

| Subnet | Prod CIDR | Used by |
|---|---|---|
| `snet-app` | 10.40.1.0/26 | App Service and Functions VNet integration (delegated) |
| `snet-pe` | 10.40.2.0/27 | Private endpoints: SQL, documents Blob, payroll Blob, Key Vault, queues |

Private DNS zones (`privatelink.database.windows.net`, `privatelink.blob.core.windows.net`, and so on) are
linked to the VNet so the apps resolve private IPs. Public DNS: `hr.<company domain>` CNAME to Static Web
Apps, and `hr-api.<company domain>` to App Service, both with managed certificates.

> **TODO:** Dunderly's domain name and who manages its DNS; and, if a VPN to the server farm exists, its
> address ranges so the VNet doesn't overlap them.
{: .prompt-warning }

## Compute, storage, and databases
{: #compute-storage-and-databases }

Summarized from [Hosting](/posts/projects/dunderly/05-technical-architecture/#hosting-and-deployment-model),
with the reasoning per choice:

| Resource | Prod choice | Why this and not the alternative |
|---|---|---|
| API compute | App Service Linux P0v3 | Slots, VNet integration, cheaper than three S1s; containers or AKS would be overkill |
| Background compute | Functions Flex Consumption | Monthly and event-driven jobs; scales to zero |
| Web | Static Web Apps Standard | Static files, PR previews, custom domain |
| Database | Azure SQL serverless GP, max 2 vCores | Relational data, temporal tables, pay per use |
| Documents | StorageV2 GRS, hot tier, lifecycle to cool after 180 days | ~25 GB, rarely read after onboarding |
| Payroll files | StorageV2 GRS, immutable containers | Integrity and retention |

## Configuration and secret management
{: #configuration-and-secret-management }

Configuration comes from Bicep outputs into app settings: endpoints, client IDs, feature flags. Secrets, in
the rare case there are any, come from Key Vault references
(`@Microsoft.KeyVault(SecretUri=...)`), read by the app's managed identity. GitHub holds no Azure secrets:
the workflow uses OIDC with a federated credential per environment, and the only GitHub "secrets" are IDs
(tenant, subscription, client), which aren't sensitive. See [Secrets and key management](/posts/projects/dunderly/06-security-and-privacy/#secrets-and-key-management).

## Environment parity
{: #environment-parity }

Test and prod are built from the same Bicep and differ only in their parameter files, which are short
enough to diff by eye. The deliberate differences are sizes, redundancy, auto-pause and data. Everything
else (networking, identities, role assignments, diagnostic settings, policies) is identical.

Dev drifts slightly further (B1, no slots, fake scanner) to save money; that's acceptable because test is
the gate before prod, not dev. Local differs most (containers instead of PaaS), and the integration tests
use the same container images as local, so "works locally" and "works in CI" mean the same thing.

## Capacity and quota planning
{: #capacity-and-quota-planning }

Capacity is almost a non-question at this scale, but it's worth writing down why:

| Resource | Need (5-year) | Limit | Headroom |
|---|---|---|---|
| SQL storage | ~1 GB structured | Serverless GP up to TBs | Huge |
| Blob storage | ~25.5 GB | Petabytes | Huge |
| API instances | 1 to 2 | P0v3 scales out to many | Huge |
| Concurrent users | 10 (50 tested) | Bounded by SQL vCores | Large |

Quotas to check once per subscription: App Service Premium v3 cores in West Europe, Flex Consumption
availability in the region, and private endpoint counts (well below limits). The real capacity planning is
cost, covered in [Capacity and cost monitoring](/posts/projects/dunderly/14-operations-and-observability/#capacity-and-cost-monitoring).

## Checklist
{: #checklist }

- [ ] Create the three resource groups plus shared, with locks on prod.
- [ ] Write `main.bicep` and the three parameter files; run what-if in CI.
- [ ] Set up GitHub OIDC federated credentials per environment.
- [ ] Create private DNS zones and confirm resolution from App Service.
- [ ] Confirm the company domain, DNS owner and any VPN address ranges.
- [ ] Ask whether the payment system has a test instance.
- [ ] Check Premium v3 and Flex Consumption quota in West Europe.
- [ ] Schedule the weekly drift what-if.

{% include project-nav.html %}
