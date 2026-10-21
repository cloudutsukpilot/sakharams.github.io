---
layout: post
title: "State of DevOps: Infrastructure and Environments"
date: 2026-10-05 00:11:00 +0530
categories: [projects, state-of-devops]
tags: [Projects, State of DevOps, Infrastructure, IaC]
description: "State of DevOps environments from k3d on a laptop to AKS: Helm values per environment, PR preview deploys, Azure Files, Redis and capacity planning."
project: state-of-devops
project_step: 11
image:
  path: /assets/img/projects/state-of-devops/11-infrastructure-and-environments.webp
  alt: "State of DevOps: Infrastructure and Environments - Projects hero image"
---

State of DevOps runs the same Helm charts in three places: a k3d cluster on a laptop, a development
AKS cluster where open pull requests can be previewed, and production AKS behind ArgoCD. Keeping those
three close is what lets one person change a cronjob on a Tuesday evening and trust it in production on
Wednesday morning.

<!-- more -->

{% include project-nav.html %}

## Development environment
{: #development-environment }

The development environment is **k3d** (k3s in Docker) with a bundled local registry:

```bash
task local-start                      # k3d/create-cluster.sh: cluster k8cron-cluster, secrets, file share
task build-state-of-devops-all        # docker build every component
task import-state-of-devops-all       # k3d image import (no local registry)
task state-of-devops-deploy-local     # shared infra + one helm upgrade --install per cronjob
```

The `k3d/` folder holds the scripts behind those tasks: create, restart and clean up the cluster, set
up local secrets, and set up the file share resources so `/data` is a host bind mount. That last part
is underrated: you can open last night's analyzer output on the laptop with `ls` and `jq` instead of
`kubectl exec`.

## Test or QA environment
{: #test-or-qa-environment }

There's no separate QA cluster. Testing follows the ladder from
[Quality Assurance](/posts/projects/state-of-devops/10-quality-assurance/#integration-testing): local
Python with dry-run, then k3d, then the development AKS cluster.

The development cluster is also where **PR preview deploys** run, currently piloted on
`devops-cost-analyzer`. When CI is green on a PR that changes a preview-enabled service, a
"Review deployments" approval appears on the run (with a 15-minute watchdog that cancels it if nobody
answers). Once approved, the image is built as `<svc>:pr-<number>` and ArgoCD is pointed at it with a
Helm parameter override, without committing to the GitOps repo. Closing the PR removes the override, and
a nightly sweep catches anything missed. It's a neat way to get a QA environment per PR without
maintaining one.

## Staging environment
{: #staging-environment }

For a read-only reporting tool, a full staging copy of production is hard to justify: the jobs read the
same real GitHub orgs, so a staging cluster would mostly duplicate API traffic. The development cluster
with PR previews covers most of what staging would.

The one thing staging would add is a place to run **a new analyzer version against production-sized
data** before its numbers go on the dashboard. A cheaper equivalent is running the new version in the
development cluster writing to a separate path (for example `/data/devops-state-canary/`) and diffing
against production for a few days.

> **TODO:** Is there a staging environment today, or is it development cluster then production?
{: .prompt-warning }

## Production environment
{: #production-environment }

| Resource | Production setting |
|---|---|
| Cluster | AKS, managed by ArgoCD (one application per component) |
| Namespaces | `cronjobs` (13 jobs), `state-of-devops` (dashboard) |
| Images | JFrog Artifactory, tagged with the 7-character Git SHA and `:latest` on `main` |
| Ingress | nginx with SSL redirect, internal hostname |
| Storage | Azure File Share; jobs via `cron-jobs-data-pvc`, dashboard via its own PV and PVC (ReadWriteMany, mounted read-write) |
| Cache | Azure Cache for Redis (TLS port 6380) |
| Identity | Workload Identity on `cron-jobs` and `state-of-devops` ServiceAccounts |
| Secrets | External Secrets Operator from Azure Key Vault |

> **TODO:** Is production on a dedicated AKS cluster or a shared platform cluster, and which team owns
> the cluster itself?
{: .prompt-warning }

## Infrastructure as code
{: #infrastructure-as-code }

Kubernetes resources are fully in code: Helm 3 charts per component, the `cronjob-library` library
chart for shared templates, and `cronjob-shared-infra` for the ServiceAccount, ExternalSecrets and the
shared PVC. Promoted values live in a separate GitOps apps repository that ArgoCD watches.

The Azure resources underneath (storage account and file share, Redis, Key Vault, Workload Identity
federated credentials) are a different story. For the enterprise scorecard phase they should be in
Terraform too, and the project's own infra analyzer already checks other repos for Terraform; it should
pass its own check.

> **TODO:** How are the Azure resources (storage account, Redis, Key Vault, identities) provisioned
> today: Terraform, portal, or a platform team's modules?
{: .prompt-warning }

## Networking and DNS
{: #networking-and-dns }

- One internal DNS name for the dashboard, pointing at the nginx ingress controller's internal load
  balancer, with TLS and SSL redirect.
- No inbound traffic to cronjobs; they only need egress to GitHub, JFrog, Azure management endpoints,
  Teams and Jira.
- Locally, traefik in k3d plus a port-forward to `127.0.0.1:8000`.

Egress is worth writing down as an allow-list, because it doubles as documentation of every external
dependency (see
[Security and Privacy](/posts/projects/state-of-devops/06-security-and-privacy/#network-security)).

## Compute, storage, and databases
{: #compute-storage-and-databases }

| Workload | Requests → limits | Pattern |
|---|---|---|
| Analyzers | `200m / 512Mi` → `1000m / 1Gi` | Short-lived pods, once a day |
| Collectors, summary generator | `100m / 256Mi` → `500m / 512Mi` | Short-lived pods |
| Dashboard | `100m / 128Mi` → `500m / 512Mi` | One long-running pod (to become 2 to 3) |

Storage is one Azure File Share mounted as `/data`, which suits this workload: many small JSON files,
written once, read many times, by pods in two namespaces. There's no relational database; Redis is a
cache only, so losing it costs speed, not data.

## Configuration and secret management
{: #configuration-and-secret-management }

Configuration is `config.yaml` in the image, overridden by a ConfigMap from the chart's `configYaml`
value; environment differences are in `values.yaml` versus `values-local.yaml`. Secrets come from Key
Vault through External Secrets in AKS, and from `values-local.yaml` or `kubectl create secret` (via the
`setup-local-secrets.sh` script) in k3d.

The rule that keeps this manageable: **no environment-specific values in `config.yaml`**. Org lists,
thresholds and toggles are the same everywhere; only endpoints, identities and hostnames differ, and
those belong in the values files.

## Environment parity
{: #environment-parity }

Parity is good where it's cheap and deliberately broken where it isn't:

| Aspect | k3d | AKS | Parity |
|---|---|---|---|
| Helm charts and templates | Same | Same | Full |
| Images | Same Dockerfiles, local tags | JFrog tags | Full (build), different registry |
| Storage | Host bind mount | Azure Files | Different driver, same paths |
| Secrets | Local secrets | External Secrets | Different source, same secret names |
| Ingress | traefik | nginx | Different, rarely matters |
| Redis | `redis:7-alpine` pod | Azure Cache for Redis | Different, TLS only in AKS |

The Redis row is the one most likely to bite: TLS on 6380 in AKS and plain 6379 locally means the TLS
code path is only exercised in the cloud.

## Capacity and quota planning
{: #capacity-and-quota-planning }

The binding constraint isn't CPU or storage, it's **GitHub API rate limits**. Each GitHub App
installation has its own hourly budget, so per-org Apps spread the load, and the central collector with
ETags keeps repeated calls cheap (a `304 Not Modified` response to a conditional request does not count against the rate limit).

Other quotas to plan for:

- **Schedule window:** all daily jobs must finish between 02:00 and 07:00 UTC; job duration should be
  tracked against that window as orgs grow.
- **Azure Files:** capacity grows linearly with daily outputs kept forever (see retention in
  [Data and Integration](/posts/projects/state-of-devops/07-data-and-integration/#data-retention-and-deletion)).
- **Dashboard:** replicas and requests sized from the load test, once autoscaling is on.

## Checklist
{: #checklist }

- [ ] k3d environment created with one task, data visible on the host
- [ ] PR preview deploys extended beyond the cost analyzer pilot
- [ ] Decision recorded on staging (or the canary-path alternative)
- [ ] Azure resources defined in Terraform
- [ ] Egress allow-list documented and enforced
- [ ] No environment-specific values in any `config.yaml`
- [ ] Redis TLS path tested locally
- [ ] GitHub rate-limit usage per App tracked, with headroom

{% include project-nav.html %}
