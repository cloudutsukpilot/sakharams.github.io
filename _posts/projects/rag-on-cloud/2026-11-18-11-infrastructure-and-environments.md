---
layout: post
title: "RAG on Cloud: Infrastructure and Environments"
date: 2026-11-18 00:11:00 +0530
categories: [projects, rag-on-cloud]
tags: [Projects, RAG on Cloud, Infrastructure]
description: "One dev environment in one region, all Terraform through the platform's shared module, and a Search service that comes and goes between lab sessions."
project: rag-on-cloud
project_step: 11
image:
  path: /assets/img/projects/rag-on-cloud/11-infrastructure-and-environments.webp
  alt: "RAG on Cloud: Infrastructure and Environments - Projects hero image"
---

A lab doesn't need dev, test, staging and production; it needs one environment that can disappear and come back
the same. Most of this post is about making that rebuild boring, and about the one resource, the Search service,
that bills by the hour whether I'm using it or not.
This post describes Azure; AWS and GCP get the same shape (one dev environment, Terraform through their own
IaC repos, no long-lived credentials) in [Phases 7 and 8](/posts/projects/rag-on-cloud/03-product-planning/#phase-7-steps).

<!-- more -->

{% include project-nav.html %}

## Development environment
{: #development-environment }

Two places count as "dev":

- **My machine.** The API runs with `uvicorn` and `DefaultAzureCredential` picks up my `az login`, so local runs
  use the real Azure services with my own RBAC roles. No emulators: Search, the knowledge base and Foundry have
  none worth testing against.
- **The Azure dev subscription.** One resource group with every resource in the
  [architecture](/posts/projects/rag-on-cloud/05-technical-architecture/#system-context-and-component-architecture).

## Test or QA environment
{: #test-or-qa-environment }

There isn't one, and I don't think a lab needs one. Experiments that would break the main index (a new analyzer,
a different chunk size) go into a second index version in the same Search service, `blog-chunks-v2`, and the API
picks the index by config. That's a test environment at the level where the risk actually is.

## Staging environment
{: #staging-environment }

Not applicable: there's no audience to protect from a bad release. If the API ever becomes a public demo, a
second Container Apps revision with traffic split (0% until checked) gives a staging slot without a second stack.

## Production environment
{: #production-environment }

Also not applicable in the usual sense. The nearest thing to production is the eval run that produces a results
file I'll publish; it runs against the same environment, after warming the app so cold starts don't distort the
latency numbers.

## Infrastructure as code
{: #infrastructure-as-code }

Everything goes through the platform's Terraform, like every other Azure stack (ADR 0003):

| Layer | Where | Applied by |
|---|---|---|
| Azure AI Search module | Shared module, new | Merge to the shared module |
| Stack `development/rag-on-cloud` | `infra-azure` | Plan on PR, apply on merge to `main` |
| Index, data source, skillset, indexer, knowledge source, knowledge base | Lab repo, JSON | `make index` (REST, Entra token) |
| Container image and app revision | Lab repo | GitHub Actions |

The stack's `resources.yaml` follows the existing Foundry stack's shape:

```yaml
azurerm_search_service:          # emptied by a PR between sessions (ADR 0008)
  - name: <search-name>
    resource_group_name: <rg>
    location: eastus
    sku: basic
    local_authentication_enabled: false
    semantic_search_sku: free
    identity:
      type: SystemAssigned
```

## Networking and DNS
{: #networking-and-dns }

Phases 0 to 4 use the services' public endpoints with Entra ID on every call (ADR 0005), so there's no network
to build yet. Phase 5 adds private endpoints in the dev subscription's existing private-endpoint subnet, and
private DNS zones beside the ones already in the connect subscription for Foundry and OpenAI:

| Zone | Exists today |
|---|---|
| `privatelink.cognitiveservices.azure.com` | Yes |
| `privatelink.openai.azure.com` | Yes |
| `privatelink.services.ai.azure.com` | Yes |
| `privatelink.search.windows.net` | No, Phase 5 step 1 |
| `privatelink.blob.core.windows.net` | No, Phase 5 step 1 |

## Compute, storage, and databases
{: #compute-storage-and-databases }

| Resource | SKU or plan | Why |
|---|---|---|
| Azure AI Search | Basic, one replica, one partition | Lowest tier where indexers can use a managed identity (ADR 0004) |
| Semantic ranker | Free plan | The monthly allowance should cover eval runs; checked in Phase 1 |
| Foundry model deployments | Pay-per-token deployment type | No idle cost |
| Storage | Standard LRS, hot | A few MB of Markdown |
| Container Apps | Consumption, min replicas 0 | No idle cost |
| Container registry | Basic | One image |
| Log Analytics | Pay-as-you-go | Small ingestion |

## Configuration and secret management
{: #configuration-and-secret-management }

Configuration is endpoints and names: Search endpoint and index name, Foundry project endpoint and deployment
names, knowledge base name, Application Insights connection string. Terraform writes them into the Container
App's environment; `make` targets read them from Terraform outputs for local runs. There are no secrets to manage
([Security and Privacy](/posts/projects/rag-on-cloud/06-security-and-privacy/#secrets-and-key-management)).

## Environment parity
{: #environment-parity }

Local and hosted runs call the same Azure services; the only differences are the identity (my user vs the
app's managed identity) and the network path. The identity difference is exactly what catches missing role
assignments, so the hosted smoke test always runs once after a deploy, even when local runs pass.

## Capacity and quota planning
{: #capacity-and-quota-planning }

| Limit | Why it matters | Plan |
|---|---|---|
| Model deployment tokens per minute | Eval runs send bursts of questions | Set the deployment's capacity to cover a full run; the harness throttles |
| Basic Search storage and index count | Index versions side by side | Fine for a few hundred posts and two versions |
| Semantic ranker free allowance | Every semantic query counts | Count queries per eval run; switch plans only if needed |
| Indexer runtime on Basic | Rebuild time after each restore | Measured in Phase 0 step 4 |

> **TODO:** Model quota in the chosen region: is there enough tokens-per-minute quota in the dev subscription for
> both deployments, or does it need a quota request?
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] Search module merged in the shared module
- [ ] Stack applied from `main`, region feature check done
- [ ] Search removed and restored through PRs, rebuild time recorded
- [ ] Local runs work with my roles; hosted smoke test passes with the app's identity
- [ ] Deployment capacity covers a full eval run
- [ ] Phase 5 DNS zones planned beside the existing AI zones
- [ ] Budget alert in place

{% include project-nav.html %}
