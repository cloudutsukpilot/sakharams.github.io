---
layout: post
title: "Platform Wardens: Infrastructure and Environments"
date: 2026-11-09 00:11:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Infrastructure, IaC]
description: "Where Platform Wardens runs: a laptop with a local Temporal, the homelab's wardens k3d cluster, and the planned Azure AKS target, all defined as code."
project: platform-wardens
project_step: 11
---

Platform Wardens has two real environments today: a developer's machine with a local Temporal, and the
`wardens` k3d cluster on the homelab, which is production for everything the agents do. There's no
staging cluster, and the reason is the lifecycle: a new agent runs in production at L0 in the shadow
stage, where it can't change anything, and that is its staging.

<!-- more -->

{% include project-nav.html %}

## Development environment
{: #development-environment }

A laptop with Python 3.12 and uv. `uv run python -m wardens.runtime.console --dev-server` starts the
operator console and a local Temporal with its UI; each agent's worker runs in a second terminal. Models
come from the homelab's LiteLLM (or any OpenAI-compatible endpoint) through `WARDENS_LLM_*`, GitHub reads
use the developer's own token, and without a write token nothing gets opened. Run records and audit go to
local files unless `WARDENS_STATE_DSN` points at a database.

## Test or QA environment
{: #test-or-qa-environment }

There isn't a shared one. Tests run against a local Temporal started by the test suite, with toy agents
and recorded fixtures (see [Quality Assurance](/posts/projects/platform-wardens/10-quality-assurance/#integration-testing)).
The CI/CD triage agent's failure lab is the closest thing to a QA target: a private repository whose
seeded faults give real failed runs that nobody minds an agent reading.

## Staging environment
{: #staging-environment }

Deliberately none, for agents. The shadow stage replaces it: the agent is deployed to `wardens`, runs on
live inputs at L0, and people score every run. That gives more realistic evidence than a staging copy
would, at no risk, because L0 can't act. Framework changes are the exception that a staging cluster
would catch, and today those are caught by the framework tests and replay before merge.

> **TODO:** Should framework changes get a canary (one agent's worker on the new image first) before
> every worker takes them? Today a framework change rebuilds every image that contains it.
{: .prompt-warning }

## Production environment
{: #production-environment }

The `wardens` k3d cluster on the homelab PC, API `172.30.0.1:6446`, load balancer `172.30.0.6`:

| Namespace or app | Runs |
|---|---|
| Temporal | Frontend, history, matching, worker services, the UI behind Keycloak |
| `wardens-db` | Temporal's Postgres (resettable) |
| `wardens-state-db` | Run records, artifacts, dedupe, kill switch, audit, memory |
| `wardens-console` | The console, the alerts and hooks relays, the Event Hubs emulator, the ingress consumer, the router worker (the classifier) |
| One per agent | terraform-drift, change-correlator, stack-author, incident-triage: a worker each |
| `mcp-web-search` | SearXNG's MCP server with `mcp-guard` as a sidecar |

It depends on the other platform clusters: models from `ai`, telemetry to `mon`, secrets from `core`,
deploys from Argo CD in `platform`.

The Azure target adds non-production and production landing zones, each with its own AKS cluster,
self-hosted Temporal on Azure Database for PostgreSQL, Foundry behind APIM, Entra Workload ID, Key
Vault and Azure Data Explorer for audit.

## Infrastructure as code
{: #infrastructure-as-code }

| What | Repo |
|---|---|
| The k3d cluster, its network and host setup | `infra-local` (Terragrunt `k3d_config_cluster`, host scripts) |
| Everything inside it: Temporal, databases, the console, each agent | `homelab-gitops` (Argo CD; the shared `wardens-agent` chart, `apps/<agent>/values.yaml`) |
| Each agent's Entra app and its federated credential | `infra-azure` |
| The OIDC issuer for the cluster's service accounts | A small Cloudflare Worker serving static discovery and JWKS files |

Nothing in the wardens repo deploys; it builds images and writes digests.

## Networking and DNS
{: #networking-and-dns }

| Name | What | Reached from |
|---|---|---|
| `console.wardens.home.cloudutsuk.com` | Operator console | The home network and Tailscale, behind Keycloak |
| `console.cloudutsuk.com` | The same console | Anywhere, through the Cloudflare tunnel, Access then Keycloak |
| `hooks.cloudutsuk.com/github` | GitHub webhook relay | GitHub, through the tunnel; Access bypassed, signature checked |
| `oidc.cloudutsuk.com/wardens` | Service-account issuer discovery | Entra, publicly |

Internal names resolve through the platform's PowerDNS and ExternalDNS, certificates come from
cert-manager with Let's Encrypt, and each agent's NetworkPolicy allows egress only to what it needs.

## Compute, storage, and databases
{: #compute-storage-and-databases }

Every workload is a Kubernetes Deployment or Job with requests and a memory limit (Kyverno enforces
both on the platform clusters), a read-only root filesystem and a restricted security context. The two
Postgres databases are the only stateful parts that matter; the Event Hubs emulator keeps its own
storage and checkpoints. Models don't run here at all: they run on the GPU host behind LiteLLM.

> **TODO:** What are the requests and limits per agent worker, and how much headroom does the homelab
> PC have for more agents? Record them here and in [Capacity](#capacity-and-quota-planning).
{: .prompt-warning }

## Configuration and secret management
{: #configuration-and-secret-management }

Configuration is in the agent's chart values (environment variables from `apps/<agent>/values.yaml`),
and secrets in OpenBao under `kv/wardens/*`, delivered by External Secrets. A host script in
`infra-local` seeds the OpenBao entries the cluster needs. The kill switch is a ConfigMap per agent,
plus the state store's switch that operators flip from the console.

## Environment parity
{: #environment-parity }

The repo's deployment category compares each component across three setups:

| Component | Local | Homelab | Azure target |
|---|---|---|---|
| Temporal | Dev server | Self-hosted on Postgres | Self-hosted on Azure Database for PostgreSQL |
| Models | Any OpenAI-compatible endpoint | LiteLLM to local models | Foundry behind APIM, keyless |
| Identity | Developer's own tokens | Service account federated to Entra, GitHub Apps | Entra Workload ID |
| Secrets | Environment | OpenBao | Key Vault |
| Telemetry | Optional OTLP | `mon` (Grafana, Mimir, Loki, Tempo) | Application Insights, Log Analytics, managed Prometheus, Managed Grafana |
| Notifications | Slack webhook | Slack | Teams |

The code doesn't change across them; only configuration does. That's the point of the provider from
configuration and the angle-bracket placeholders.

## Capacity and quota planning
{: #capacity-and-quota-planning }

The limits that bite first are model capacity and cost, not the cluster. Each agent has a cost ceiling
per run that becomes token limits, and local models are priced at what the same calls would cost on the
production model in Foundry, so the numbers mean something before there's a bill. GitHub API rate limits
apply per GitHub App installation, which is another reason for one App per agent.

> **TODO:** How many concurrent model calls can the GPU host serve for the agents alongside the
> platform's own chat and RAG? That caps how many incidents can run in parallel.
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] A fresh laptop can run the console, a worker and the tests
- [ ] Every component of `wardens` is in `infra-local` or `homelab-gitops`; nothing by hand
- [ ] Every agent has its own namespace, service account, NetworkPolicy and kill switch
- [ ] Requests and limits per worker are recorded, with the host's headroom
- [ ] Model concurrency for the agents is measured
- [ ] The parity table is updated when a component changes

{% include project-nav.html %}
