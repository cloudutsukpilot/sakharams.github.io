---
published: false
layout: post
title: "OnePlatform: Infrastructure and Environments"
date: 2026-10-05 00:11:00 +0530
categories: [projects, oneplatform]
tags: [Projects, OnePlatform, Infrastructure, Environments]
description: "Where OnePlatform runs: dev, staging and prod namespaces on AKS, internal ingress and DNS, PostgreSQL 16, Key Vault with workload identity, and parity gaps."
project: oneplatform
project_step: 11
image:
  path: /assets/img/projects/oneplatform/11-infrastructure-and-environments.webp
  alt: "OnePlatform: Infrastructure and Environments - Projects hero image"
---

OnePlatform deploys to three environments, but it reaches into many more. A template in the portal's *development* environment can start a VM in a QA subscription. So there are two kinds of environment to keep apart: the portal's own (development, staging, production) and the target environments its templates act on. This post covers the first and how the portal is scoped to the second.

<!-- more -->

{% include project-nav.html %}

## Development environment
{: #development-environment }

The portal's development environment is where every release lands first. The release workflow bumps the image tag in the charts repo and Argo CD deploys it, with no human step. It runs in its own AKS namespace with its own Key Vault, App Configuration store and identities. The middleware has a matching development deployment and Function App.

Templates in the portal's development environment act on non-production Azure targets only, the same as production does for most templates. The environment scoping lives in the permission policy, not in which portal you use.

## Test or QA environment
{: #test-or-qa-environment }

There's no separate QA deployment of the portal. Development plays that role: requesters and testers try features there after each release. Automated testing runs in CI against containers (PostgreSQL in Testcontainers, a minimal E2E backend with synthetic auth), not against a shared QA environment.

The "QA" that does exist is a *target*: QA and performance-test Azure subscriptions that templates such as Start VM are allowed to act on.

## Staging environment
{: #staging-environment }

Staging is the last stop before production. A promotion workflow copies the image tag that's in development into the staging values; nothing is rebuilt, so staging runs the exact image development ran. It has its own namespace, vault and identities, and the middleware has its own staging values and Function App.

> **TODO:** Does staging connect to production Entra groups and real GitHub orgs, or to test copies? It decides how realistic staging UAT is and how careful testers must be with templates there.
{: .prompt-warning }

## Production environment
{: #production-environment }

Production runs the portal with two replicas behind the internal ingress, and the middleware API through Helm. Production adds a container runtime defender to the namespace, and a GitHub environment approval guards promotion into it. Images are pulled from the private registry with a pull secret.

## Infrastructure as code
{: #infrastructure-as-code }

Three layers, each in its own repository:

| Layer | Repo | Tool |
|---|---|---|
| Portal's own infra: PostgreSQL 16 server, vaults, App Configuration, identities | Portal infrastructure repo | Terraform |
| Portal workloads: deployment, service, ingress per environment | Charts repo (Argo CD) and `manifests/` | Helm values, Kubernetes YAML |
| Middleware workloads | `HelmCharts/` in the middleware repo | Helm |
| Things templates create for users (Function Apps, Web Apps) | Infrastructure repos per resource type | Terraform via GitHub Actions |

The last row is the important one. The portal never holds Terraform state. It dispatches a workflow in the repo that does.

## Networking and DNS
{: #networking-and-dns }

- **Ingress:** an internal nginx ingress class for both apps, TLS terminated with certificates pulled from Key Vault by the ingress add-on. Long timeouts (up to an hour) and large request bodies are allowed on the middleware ingress for imports.
- **DNS:** a CoreDNS custom config forwards the corporate DNS zones to the internal resolvers, so pods can resolve on-premises SQL Servers and file servers by name.
- **Egress:** to Azure APIs, GitHub, Jira and tool APIs; package installs go through the private registry proxy.
- **CORS:** the middleware ingress allows only the portal origins and local development ports.

> **TODO:** Is egress restricted (firewall or proxy allow-list) from the AKS subnet? If so, list the destinations OnePlatform needs, since every new integration will need a rule.
{: .prompt-warning }

## Compute, storage, and databases
{: #compute-storage-and-databases }

| Component | Compute | State |
|---|---|---|
| Portal | AKS deployment, 2 replicas | PostgreSQL 16 (TLS required) |
| Middleware API | AKS deployment via Helm, 1 replica | Same PostgreSQL server, own schemas |
| Middleware Functions | Azure Function App | Blob Storage for cost exports |
| Telemetry | | Application Insights (portal and middleware) |

One gap: the portal manifests set no CPU or memory requests or limits, and the middleware sets them only in development (30m/100m CPU, 650/800 Mi memory). I'd set requests and limits in every environment from observed usage. Without them, a catalog ingestion spike can starve its neighbours on a shared node, or be evicted first.

## Configuration and secret management
{: #configuration-and-secret-management }

Per environment: one Key Vault, one App Configuration store (labels select the middleware's keys), one set of identities. The portal reads secrets as environment variables mounted from Key Vault by the CSI driver. The middleware reads App Configuration with Key Vault references through workload identity, and only two variables (`APPCONFIG_ENDPOINT`, `APPCONFIG_LABELS`) are set in Helm values. Local development reads the development vault with the developer's own login ([Security](/posts/projects/oneplatform/06-security-and-privacy/#secrets-and-key-management)).

## Environment parity
{: #environment-parity }

What's the same everywhere: the image (promotion copies the tag, never rebuilds), the chart, the config shape, and the identity model.

What differs, on purpose: catalog filters (local development narrows Graph ingestion to one group to start faster), notification and reminder flags (off locally), the runtime defender (production only), and replica counts.

What differs by accident and should be fixed: resource requests and limits (above), and a deployment path that is GitOps for development but still has a direct workflow path for staging and production ([CI/CD](/posts/projects/oneplatform/12-cicd-and-release-management/#deployment-automation)).

## Capacity and quota planning
{: #capacity-and-quota-planning }

The portal's load is mostly background: catalog providers for 22+ subscriptions, three GitHub orgs and Graph; Copilot and GHAS ingestion; App Insights backfill. Quotas that bite here are API rate limits, not CPU: GitHub's per-App rate limit and Azure Resource Graph and ARM throttling. Staggered schedules and per-subscription providers are the main controls, and the GitHub backfill has a deliberate delay between calls.

> **TODO:** Current node pool size, observed CPU and memory for the portal pods at peak and during ingestion, and whether GitHub rate limits have ever been hit. Those numbers set the requests and limits above.
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] Portal and target environments documented separately, with the scoping rules
- [ ] CPU and memory requests and limits set for portal and middleware in every environment
- [ ] Staging's connections to Entra and GitHub documented
- [ ] Egress allow-list documented if one exists
- [ ] One deployment path (GitOps) for all three environments
- [ ] Rate-limit headroom for GitHub and Azure monitored
- [ ] Infrastructure repo for the portal's own resources linked from the README

{% include project-nav.html %}
