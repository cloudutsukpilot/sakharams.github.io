---
layout: post
title: "RAG on Cloud: Infrastructure and Environments"
date: 2026-11-18 00:11:00 +0530
categories: [projects, rag-on-cloud]
tags: [Projects, RAG on Cloud, Infrastructure]
description: "One sandbox environment in eastus, eighteen resources through the platform's Terraform, a 100 a month budget, and a Search service that comes and goes."
project: rag-on-cloud
project_step: 11
image:
  path: /assets/img/projects/rag-on-cloud/11-infrastructure-and-environments.webp
  alt: "RAG on Cloud: Infrastructure and Environments - Projects hero image"
---

A lab doesn't need dev, test, staging and production; it needs one environment that can disappear and come back
the same. Since 2026-11-22 that environment exists: eighteen resources in one resource group, applied from `main`
through the platform's Terraform. Most of this post is about keeping the rebuild boring, and about the one resource,
the Search service, that bills by the hour whether I'm using it or not.
This post describes Azure; AWS and GCP get the same shape (one dev environment, Terraform through their own
IaC repos, no long-lived credentials) in [Phases 7 and 8](/posts/projects/rag-on-cloud/03-product-planning/#phase-7-steps).

<!-- more -->

{% include project-nav.html %}

## Development environment
{: #development-environment }

Two places count as "dev":

- **My machine.** The API runs with `uvicorn` and `DefaultAzureCredential` picks up my `az login`, so local runs
  use the real Azure services with my own RBAC roles (Search Service Contributor, Search Index Data Contributor,
  Storage Blob Data Contributor, Foundry User, all applied). No emulators: Search, the knowledge base and Foundry
  have none worth testing against.
- **A sandbox subscription in a separate Entra tenant.** One resource group, `dv-rg-rag-01`, with every resource in
  the [architecture](/posts/projects/rag-on-cloud/05-technical-architecture/#system-context-and-component-architecture).
  The plan put it in the platform's own dev subscription; the stack went to the sandbox instead (ADR 0012), and
  that tenant brings rules of its own: an Azure Policy that denies `GlobalStandard` model deployments, its own
  required tags, its own users for role assignments, and its own service principal for CI.

**The sandbox subscription is the lab's home for the whole Azure part** (decided 2026-11-23). It keeps
the lab's spend and access apart from the platform's subscriptions, and its tenant brings an enterprise policy set
(denied `GlobalStandard` deployments, required tags) that the lab has to work with, which is closer to how a RAG
system gets built at work than the platform's own dev subscription. The cost is Phase 5: it builds its own network and
private DNS zones there instead of reusing the platform's.

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
| Modules: Search service (new for this lab), budget (new), and the existing Foundry, storage, identity and monitoring modules | The platform's shared module | Merge to the shared module |
| Stack `development/rag-on-cloud` | `infra-azure` | Plan on PR, apply on merge to `main` ([CI/CD](/posts/projects/rag-on-cloud/12-cicd-and-release-management/#deployment-automation)) |
| Index, data source, skillset, indexer, knowledge source, knowledge base | Lab repo, JSON | `make index` (REST, Entra token) |
| Container image and app revision | Lab repo | GitHub Actions |

The stack is one `resources.yaml`. The shared module turns each top-level key into a Terragrunt unit, wires the
units together through their dependencies, and applies them in that order. Press play to watch it, or tick the box
to replay the first apply, which stopped two resources short:

{% include flow-anim.html id="projects/rag-on-cloud/azure-stack-apply" %}

A trimmed view of the file, showing the choices that matter (the full file has every resource):

```yaml
azurerm_cognitive_deployment:
  - name: text-embedding-3-small
    cognitive_account_name: dv-ais-rag-01
    model: {format: OpenAI, name: text-embedding-3-small, version: "1"}
    sku: {name: Standard, capacity: 50}            # not GlobalStandard: the tenant's policy denies it
  - name: gpt-5-mini
    cognitive_account_name: dv-ais-rag-01
    model: {format: OpenAI, name: gpt-5-mini, version: "2025-08-07"}
    sku: {name: DataZoneStandard, capacity: 50}    # no regional Standard for this model in eastus

azurerm_search_service:          # emptied by a PR between sessions (ADR 0008)
  - name: dv-srch-rag-01
    resource_group_name: dv-rg-rag-01
    sku: basic
    local_authentication_enabled: false
    semantic_search_sku: free
    identity:
      type: UserAssigned          # roles exist before the service, and survive its removal
      user_assigned_identities:
        - name: dv-id-rag-search-01
```

Names follow the platform's pattern: environment prefix `dv`, a resource-type code, the lab, and a number
(`dv-srch-rag-01`, `dv-ais-rag-01`). Storage accounts can't have hyphens, hence `dvstragcorpus01`.

## Networking and DNS
{: #networking-and-dns }

Phases 0 to 4 use the services' public endpoints with Entra ID on every call (ADR 0005), so there's no network
to build yet, and none exists: the stack has no VNet. That will change in Phase 5, and the sandbox makes it more
work than planned. The plan was to reuse the platform's dev network and the private DNS zones it already has for
Foundry and OpenAI. Those live in the other tenant, and private endpoints and DNS zone links don't cross tenants, so
Phase 5 now builds its own:

| Piece | Status |
|---|---|
| VNet and private-endpoint subnet in the sandbox subscription | Phase 5 step 1 |
| `privatelink.search.windows.net`, `privatelink.blob.core.windows.net` | Phase 5 step 1 |
| `privatelink.cognitiveservices.azure.com`, `privatelink.openai.azure.com`, `privatelink.services.ai.azure.com` | Phase 5 step 1 (the platform's copies are in the other tenant) |
| Private endpoints and Search shared private links | Phase 5 step 2 |

## Compute, storage, and databases
{: #compute-storage-and-databases }

What's deployed today (18 resources), and what's still to come:

| Resource | Name | SKU or plan | Why |
|---|---|---|---|
| Azure AI Search | `dv-srch-rag-01` | Basic, one replica, one partition | Lowest tier where indexers can use a managed identity (ADR 0004); about $0.10 an hour |
| Semantic ranker | on the Search service | Free plan | The monthly allowance should cover eval runs; checked in Phase 1 |
| Foundry account and project | `dv-ais-rag-01`, `dv-aip-rag-01` | S0, local auth off | Model deployments, agents, evaluations |
| Embedding deployment | `text-embedding-3-small` | `Standard`, 50K tokens a minute | Pay per token, no idle cost |
| Chat deployment | `gpt-5-mini` | `DataZoneStandard`, 50K tokens a minute | Pay per token, no idle cost (ADR 0013) |
| Storage and container | `dvstragcorpus01`, `posts` | Standard LRS, hot, shared key off | A few MB of Markdown |
| Search identity | `dv-id-rag-search-01` | User-assigned | Read the posts, call the embedding model |
| Log Analytics and Application Insights | `dv-log-rag-01`, `dv-appi-rag-01` | Pay-as-you-go, 30 days, 1 GB a day cap | Small ingestion |
| Budget | `dv-budget-rag-01` | 100 a month | Notifications at 50%, 80% and forecast 100% |
| Container Apps | Phase 1 step 5 | Consumption, min replicas 0 | No idle cost |
| Container registry | Phase 1 step 5 | Basic | One image |

## Configuration and secret management
{: #configuration-and-secret-management }

Configuration is endpoints and names: Search endpoint and index name, Foundry project endpoint and deployment
names, knowledge base name, Application Insights connection string. Terraform writes them into the Container
App's environment; `make` targets read them from Terraform outputs for local runs. There are no secrets to manage
([Security and Privacy](/posts/projects/rag-on-cloud/06-security-and-privacy/#secrets-and-key-management)).

The deploying identity is the one exception, and it isn't the lab's secret to keep. CI plans and applies with the
sandbox subscription's service principal, whose credentials live in the infra repo's GitHub secrets beside the
platform's other subscriptions. I'd move it to a federated credential (OIDC) so there's no client secret at all, but
that's a platform-wide change rather than one for this lab.

## Environment parity
{: #environment-parity }

Local and hosted runs call the same Azure services; the only differences are the identity (my user vs the
app's managed identity) and the network path. The identity difference is exactly what catches missing role
assignments, so the hosted smoke test always runs once after a deploy, even when local runs pass.

There's a third identity worth remembering: the CI service principal that applies the stack. The role-assignment
lookups (my user, by object ID) run with its credentials in the sandbox tenant, so it needs to read users there.

## Capacity and quota planning
{: #capacity-and-quota-planning }

| Limit | Why it matters | Plan |
|---|---|---|
| Model deployment tokens per minute | Eval runs send bursts of questions | 50K tokens a minute per deployment; the harness throttles. Raise capacity only if an eval run hits 429s |
| Basic Search storage and index count | Index versions side by side | Fine for a few hundred posts and two versions |
| Semantic ranker free allowance | Every semantic query counts | Count queries per eval run; switch plans only if needed |
| Indexer runtime on Basic | Rebuild time after each restore | Measured in Phase 0 step 4 |
| Search service creation | Every session starts by recreating it | About ten minutes on the first apply; part of the session start |

Quota held for the embedding deployment: the apply created it at 50K tokens a minute without a quota request.

The chat deployment went the same way: gpt-5-mini on `DataZoneStandard` at 50K tokens a minute applied on 2026-11-23
without a quota request.

## Checklist
{: #checklist }

- [x] Search module merged in the shared module
- [x] Stack applied from `main` (2026-11-22)
- [ ] Region feature check done (semantic ranker, agentic retrieval)
- [x] Local auth confirmed off on the live services (2026-11-23: Foundry, Search, App Insights; storage shared key off)
- [x] Chat deployment and budget applied (2026-11-23)
- [ ] Search removed and restored through PRs, rebuild time recorded
- [ ] Local runs work with my roles; hosted smoke test passes with the app's identity
- [ ] Phase 5 network and DNS zones planned in the sandbox subscription

{% include project-nav.html %}
