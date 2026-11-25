---
layout: post
title: "Platform Wardens: Infrastructure and Environments"
date: 2026-11-09 00:11:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Infrastructure, IaC]
description: "Where Platform Wardens runs: a laptop with a local Temporal, the homelab's wardens k3d cluster fed by wardens-deploy, and the planned Azure AKS target, all as code."
project: platform-wardens
project_step: 11
image:
  path: /assets/img/projects/platform-wardens/11-infrastructure-and-environments.webp
  alt: "Platform Wardens: Infrastructure and Environments - Projects hero image"
---

Platform Wardens has two real environments today: a developer's machine with a local Temporal, and the
`wardens` k3d cluster on the homelab, which is production for everything the agents do. There's no
staging cluster, and the reason is the lifecycle: a new agent runs in production at L0 in the shadow
stage, where it can't change anything, and that is its staging.

<!-- more -->

{% include project-nav.html %}

## Development environment
{: #development-environment }

A laptop with Python 3.12, uv, Docker and the homelab's Nexus account (every package comes through that
proxy). `uv run python -m wardens_services.console.app --dev-server` in platform-wardens starts the
operator console and a local Temporal with its UI; an agent's worker runs from its own `warden-<agent>`
checkout in a second terminal, after `make wheels` has pulled the signed `wardens` wheel it pins from Zot.
Models come from the homelab's LiteLLM (or any OpenAI-compatible endpoint) through `WARDENS_LLM_*`, GitHub
reads use the developer's own token, and without a write token nothing gets opened. Run records and audit
go to local files unless `WARDENS_STATE_DSN` points at a database, and the deploy config comes from the
template's test copies unless `WARDENS_CONFIG_DIR` points at a wardens-deploy checkout.

## Test or QA environment
{: #test-or-qa-environment }

There isn't a shared one. Each repository tests itself: the framework and services against a local
Temporal started by the test suite, with toy agents and frozen copies of agent manifests; each agent repo
with scripted activities, `TestModel` and recorded fixtures (see
[Quality Assurance](/posts/projects/platform-wardens/10-quality-assurance/#integration-testing)).
The CI/CD triage agent's failure lab is the closest thing to a QA target: a private repository whose
seeded faults give real failed runs that nobody minds an agent reading.

## Staging environment
{: #staging-environment }

Deliberately none, for agents. The shadow stage replaces it: the agent is deployed to `wardens`, runs on
live inputs at L0, and people score every run. That gives more realistic evidence than a staging copy
would, at no risk, because L0 can't act.

Framework changes used to be the gap: a merge rebuilt every image at once. Since the split they're staged
by design instead of by a cluster:

- A release candidate (`0.3.0rc1`) can be tried on agents before the final release.
- The router and the console upgrade first, then each agent through its own bump pull request, which runs
  that agent's tests, replay and evals before it merges (decision 0040 rule 3).
- The router measures the `wardens` version each live worker reports: one minor behind is a warning, two
  behind is refused until the agent is bumped.

So a framework release reaches one agent at a time, at the pace its bump PRs merge, which is the canary I
wanted without a second cluster.

## Production environment
{: #production-environment }

The `wardens` k3d cluster on the homelab PC:

| Namespace or app | Runs |
|---|---|
| Temporal | Frontend, history, matching, worker services, the UI behind Keycloak |
| `wardens-db` | Temporal's Postgres (resettable) |
| `wardens-state-db` | Run records, artifacts, dedupe, kill switch, audit, memory, approvals, chat threads |
| `wardens-router` | The router worker, the only host of the incident and approve-then-act workflows: two replicas, a PodDisruptionBudget and its own kill switch |
| `wardens-console` | The console (also installable as a phone app), the alerts and hooks relays, the Event Hubs emulator, the ingress consumer |
| One per agent | terraform-drift, change-correlator, stack-author, incident-triage and cluster-upgrade-readiness in shadow; cicd-triage deployed in `build`, so not routable yet |
| `mcp-web-search` | SearXNG's MCP server with `mcp-guard` as a sidecar |

Every pod that reads agents gets two kinds of ConfigMap rendered from wardens-deploy, a second Argo CD
source for each app: `wardens-registry-<agent>` (every published version of that agent) and
`wardens-config` (the deploy config). An init container copies them into a tree that
`WARDENS_REGISTRY_DIR` and `WARDENS_CONFIG_DIR` name, and a sidecar swaps in a new tree when a new entry is
published, so the router picks it up without a restart.

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
| The registry of published agents and the deploy config | `wardens-deploy` (a Helm chart at its root, rendering the ConfigMaps) |
| The `warden-*` repositories, wardens-deploy and the teams that own them | `infra-github` (decision 0040's "repos and access as code") |
| Each agent's Entra app and its federated credential | `infra-azure` |
| The OIDC issuer for the cluster's service accounts | A small Cloudflare Worker serving static discovery and JWKS files |

Nothing deploys from platform-wardens. Each agent's own CI (homelab-gitops `agent-ci.yaml`) builds its
image and writes its digest into `apps/<agent>`; platform-wardens builds only the router, console and
`mcp-guard` images and the `wardens` wheel image.

## Networking and DNS
{: #networking-and-dns }

| Name | What | Reached from |
|---|---|---|
| An internal console name | Operator console | The home network and Tailscale, behind Keycloak; also the nightly eval runner, for one read-only endpoint |
| `console.cloudutsuk.com` | The same console, and the phone app | Anywhere, through the Cloudflare tunnel, Access then Keycloak |
| `hooks.cloudutsuk.com/github` | GitHub webhook relay | GitHub, through the tunnel; Access bypassed, signature checked |
| `oidc.cloudutsuk.com/wardens` | Service-account issuer discovery | Entra, publicly |

Internal names resolve through the platform's PowerDNS and ExternalDNS, certificates come from
cert-manager with Let's Encrypt, and each agent's NetworkPolicy allows egress only to what it needs.

## Compute, storage, and databases
{: #compute-storage-and-databases }

Every workload is a Kubernetes Deployment or Job with requests and a memory limit (Kyverno enforces
both on the platform clusters), a read-only root filesystem and a restricted security context. The two
Postgres databases are the only stateful parts that matter. The Event Hubs emulator keeps its
checkpoints in Azurite, which keeps nothing across a restart: when the Event Hubs pod was recreated on
2026-11-21 the consumer retried a missing checkpoint container every 15 seconds and read nothing until it
was restarted. Since `wardens` 0.10.0 it creates the container again before every read. Models don't run
here at all: they run on the GPU host behind LiteLLM.

> **TODO:** What are the requests and limits per agent worker, and how much headroom does the homelab
> PC have for more agents? Record them here and in [Capacity](#capacity-and-quota-planning).
{: .prompt-warning }

## Configuration and secret management
{: #configuration-and-secret-management }

Configuration is in the agent's chart values (environment variables from `apps/<agent>/values.yaml`)
plus the `wardens-config` ConfigMap from wardens-deploy, and secrets in OpenBao under `kv/wardens/*`,
delivered by External Secrets. A host script in `infra-local` seeds the OpenBao entries the cluster
needs. CI's publish and package credentials aren't GitHub secrets: a workflow signs in to OpenBao with
its OIDC token for a role bound to that workflow (`pr` for pull requests, `agent-ci` for an agent's
publish), and the GitHub Apps that tag releases and open bump pull requests keep their keys there too.
GitHub still holds a few repository secrets, such as a read-only token for checking out the agent repos and
the eval runs' own LiteLLM key.

Some services read `wardens-config` only at start, which bit during the level 2 live check: the chat egress
pod predated a `chat.yaml` change and dropped the approval card's console button until it was restarted.
Since 2026-11-23 Stakater Reloader rolls the Deployments that mount the ConfigMap whenever it changes. The kill switch is a
ConfigMap per agent, plus the state store's switch that operators flip from the console.

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

CI capacity bit before the cluster did. On 2026-11-18 a single framework PR started about 22 jobs on what
were then six shared `homelab` runners: 29 minutes of run time, 258 minutes in the queue. Two changes
fixed it: a pull request in platform-wardens now runs one job (see
[CI/CD](/posts/projects/platform-wardens/12-cicd-and-release-management/#automated-test-execution)), and
there are ten runners, still shared with every other repo on the homelab.

> **TODO:** How many concurrent model calls can the GPU host serve for the agents alongside the
> platform's own chat and RAG? That caps how many incidents can run in parallel.
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] A fresh laptop can run the console, a worker and the tests
- [ ] Every component of `wardens` is in `infra-local`, `homelab-gitops`, `wardens-deploy` or `infra-github`; nothing by hand
- [ ] Every pod reads the registry and deploy config from wardens-deploy, never from its image
- [ ] Every agent has its own namespace, service account, NetworkPolicy and kill switch
- [ ] Requests and limits per worker are recorded, with the host's headroom
- [ ] Model concurrency for the agents is measured
- [ ] CI queue time is watched as agents and repos are added
- [ ] The parity table is updated when a component changes

{% include project-nav.html %}
