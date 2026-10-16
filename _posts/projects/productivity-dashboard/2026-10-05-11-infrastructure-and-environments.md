---
layout: post
title: "Productivity Dashboard: Infrastructure and Environments"
date: 2026-10-05 00:11:00 +0530
categories: [projects, productivity-dashboard]
tags: [Projects, Productivity Dashboard, Infrastructure, IaC]
description: "Productivity Dashboard environments from k3d with a local LLM to AKS with Azure OpenAI: Helm charts, shared infra, Azure Files, and AI quota as the real capacity limit."
project: productivity-dashboard
project_step: 11
image:
  path: /assets/img/projects/productivity-dashboard/11-infrastructure-and-environments.webp
  alt: "Productivity Dashboard: Infrastructure and Environments - Projects hero image"
---

The Productivity Dashboard runs the same charts on a laptop and in AKS, with one deliberate difference
that shapes everything else: the AI. Locally the generators talk to a model in LM Studio; in production
they talk to Azure OpenAI. Most environment differences are plumbing (storage driver, ingress, secrets),
but this one changes the *output*, so it gets special treatment in how environments are tested and
compared.

<!-- more -->

{% include project-nav.html %}

## Development environment
{: #development-environment }

k3d (k3s in Docker) with the `productivity` namespace, a local PVC `productivity-data-pvc` backed by
the host filesystem, traefik ingress on `summaries.local.dev`, and LM Studio on the host reachable from
pods at `host.k3d.internal:1234`.

```bash
task k3d-create
task productivity-build-all && task productivity-import-all
task productivity-deploy-local
task port-forward-productivity-ui     # http://127.0.0.1:9000
docker exec k3d-k8cron-cluster-server-0 ls /data      # browse summaries directly
```

Reading generated Markdown straight from the host is the fastest feedback loop for prompt work. More
on k3d in [k3d](/posts/homelab/orchestration/kubernetes/k3d/).

## Test or QA environment
{: #test-or-qa-environment }

QA follows the repo's three testing layers (local Python, k3d, AKS). The GitOps repository has
development and production environments; the development AKS environment is where components are
promoted first after a release, and where Azure OpenAI behaviour can be checked before production.

> **TODO:** Does the development environment use its own Azure OpenAI deployment and synthetic or
> limited people data, or does it summarize real people too?
{: .prompt-warning }

## Staging environment
{: #staging-environment }

A full staging copy of production would summarize the same real people a second time, which doubles
AI cost and personal-data processing for little gain. Two cheaper alternatives cover what staging would:

- **Prompt and model canaries:** run a new prompt or model in development for a few people who
  volunteer, writing to a separate path, and compare with production output.
- **Golden-week regression** (see
  [Quality Assurance](/posts/projects/productivity-dashboard/10-quality-assurance/#regression-testing))
  on synthetic data before any release.

## Production environment
{: #production-environment }

| Resource | Production |
|---|---|
| Cluster | AKS, ArgoCD-managed |
| Namespace | `productivity`: CronJobs, UI Deployment, Redis, ConfigMap, Role |
| Images | JFrog Artifactory |
| Ingress | nginx, internal hostname, service port 80 → 9000 |
| Storage | Azure File Share mounted at `/data` through the shared PV/PVC |
| AI | Azure OpenAI deployment |
| Identity | Workload Identity on the `productivity` ServiceAccount |
| Secrets | External Secrets from Azure Key Vault via a ClusterSecretStore |

## Infrastructure as code
{: #infrastructure-as-code }

Kubernetes resources are all Helm: a chart per collector and generator, the UI chart, and
`productivity-shared-infra` for the ClusterSecretStore, ExternalSecrets (GitHub App, GitHub PAT, Jira,
storage, JFrog registry, Grafana) and the shared volume. Promoted values live in the GitOps repository
that ArgoCD watches; generator schedules live in the UI chart's values.

> **TODO:** How are the Azure resources (storage account and share, Azure OpenAI deployment, Key
> Vault, identities) provisioned: Terraform, portal, or a platform team?
{: .prompt-warning }

## Networking and DNS
{: #networking-and-dns }

- One internal DNS name for the UI on the nginx ingress controller, with TLS.
- Egress from jobs to GitHub, Jira Cloud and the Azure OpenAI endpoint; nothing inbound.
- The UI needs the Kubernetes API (for refresh Jobs) and Redis inside the namespace.
- Locally: traefik and `summaries.local.dev`, or a port-forward to `127.0.0.1:9000`.

## Compute, storage, and databases
{: #compute-storage-and-databases }

| Workload | Pattern |
|---|---|
| Collectors (3) | Short-lived pods, once a day |
| Generators (4) | Short-lived pods; mostly waiting on the AI API, so light on CPU |
| Refresh Jobs | On demand, one target each |
| UI | One long-running pod (to become 2 to 3) |
| Redis | Its own Deployment and Service in the chart |

Storage is one Azure File Share: many small JSON and Markdown files, written by jobs and read by the UI.
There's no database; Redis is a cache.

## Configuration and secret management
{: #configuration-and-secret-management }

Per-component `config.yaml` (or `src/config.py`) holds defaults; Helm `configYaml` overrides them; the UI
chart's `config` block becomes the ConfigMap read by `/api/config`. People and teams are environment
variables. Secrets come from Key Vault through External Secrets in AKS, and from `kubectl create secret`
or `existingSecret` values locally. `values.yaml` and `values-local.yaml` must stay in step.

## Environment parity
{: #environment-parity }

| Aspect | k3d | AKS | Parity |
|---|---|---|---|
| Charts | Same | Same | Full |
| Storage | Host-backed PVC | Azure Files | Same paths |
| Ingress | traefik | nginx | Rarely matters |
| Secrets | Local secrets | External Secrets | Same names |
| **AI model** | **LM Studio, local model** | **Azure OpenAI** | **Different output** |

The last row is the important one. A prompt that works well on a small local model may behave
differently on the production model, and the reverse. Local runs prove the plumbing and the rough
format; accuracy has to be checked against the production model family, on synthetic data, before a
prompt ships.

## Capacity and quota planning
{: #capacity-and-quota-planning }

The binding limit is the **Azure OpenAI deployment's quota** (tokens and requests per minute), followed
by GitHub and Jira API rate limits. Each new team adds people × periods × (user, plus a share of team,
epic and POD) summaries. Plan with:

- tokens per summary type (measured from logs, without logging the content);
- the generator window (04:00 to 05:00 UTC for users) divided by summaries per run;
- `MAX_PARALLEL_USERS` set so the peak stays under the quota.

> **TODO:** What quota does the Azure OpenAI deployment have, and how close to it does the 04:00 run
> get?
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] k3d with LM Studio documented as the default dev loop
- [ ] Development environment's AI deployment and data scope decided
- [ ] Canary path for prompt and model changes instead of a full staging copy
- [ ] Azure resources defined as code
- [ ] Prompts validated on the production model family before release
- [ ] AI quota and generator window tracked as teams are added
- [ ] `values.yaml` and `values-local.yaml` in sync

{% include project-nav.html %}
