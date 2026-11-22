---
layout: post
title: "RAG on Cloud: Product Planning"
date: 2026-11-18 00:03:00 +0530
categories: [projects, rag-on-cloud]
tags: [Projects, RAG on Cloud, Planning]
description: "The phased roadmap for the Azure RAG lab: foundations, standard RAG, agentic RAG, evaluation, homelab comparison, private networking."
project: rag-on-cloud
project_step: 3
image:
  path: /assets/img/projects/rag-on-cloud/03-product-planning.webp
  alt: "RAG on Cloud: Product Planning - Projects hero image"
---

The order of this roadmap comes from one rule: nothing gets compared until it can be measured. Azure goes first
and sets the pattern; AWS and GCP reuse its cloud-neutral core. So the golden
question set arrives in Phase 1, before any agent, and the agentic modes come after standard RAG has a baseline
to beat.

<!-- more -->

{% include project-nav.html %}

## Product roadmap
{: #product-roadmap }

| Phase | Delivers | Depends on | Status |
|---|---|---|---|
| 0 Foundations | Plan, ADRs, a Search module for the shared Terraform, the Azure stack, an idle-cost switch | Nothing | In progress |
| 1 Standard RAG | Corpus sync, index as code, golden set v0, the API locally, then on Container Apps | Phase 0 | Not started |
| 2 Agentic RAG | Knowledge base, Foundry agent over MCP, Agent Framework agent, a four-mode comparison | Phase 1 | Not started |
| 3 Evaluation and monitoring | `make eval`, evaluation in CI, tracing and dashboard, alerts | Phase 1 (runs alongside 2) | Not started |
| 4 Homelab comparison | The golden set through the homelab RAG, and the write-up | Phase 3, and the homelab's own RAG | Blocked |
| 5 Private networking | Private endpoints, shared private links, Container Apps in the VNet, parity check | Phase 3 | Not started |
| 6 Azure write-up | The RAG on Azure blog post | Phases 1–5 | Not started |
| 7 AWS | The same system on Bedrock Knowledge Bases, from the shared core | Phase 3 | Not started |
| 8 GCP | The same system on Vertex AI RAG Engine, from the shared core | Phase 7 | Not started |
| 9 Cross-cloud comparison | One eval run over Azure, AWS, GCP and the homelab, and the write-up | Phases 4, 7, 8 | Not started |

Each phase's steps are below. Step numbers never change; a step split later becomes `3a`, `3b`.

### Phase 0 steps
{: #phase-0-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | Lab repo, plan, first ADRs; playbook areas 1, 2, 3, 5, 6, 7 and 11 | lab repo, this blog | Plan merged; playbook passes its checks | Done (2026-11-21: playbook published) |
| 2 | Azure AI Search module for the shared Terraform (identity, local auth off, semantic ranker plan, optional private endpoint) | shared module | Merged with an example | Done (2026-11-19) |
| 3 | The Azure stack: resource group, Foundry account and project, embedding and chat deployments, Search (Basic), storage and container, Log Analytics, Application Insights, identity, role assignments | infra-azure | Applied from `main`; local auth reported off; region supports every feature used | In progress (2026-11-22: applied, 16 resources, in a sandbox subscription in a separate tenant; 2026-11-23: chat model gpt-5-mini applied, 18 resources; local auth confirmed off. Left: the region check for agentic retrieval) |
| 4 | Idle-cost switch for the Search service, and a budget alert | infra-azure, lab repo, shared module | Search removed and restored through PRs; the index rebuilt from the corpus | In progress (2026-11-23: budget of 100 a month applied, with a new budget module in the shared Terraform. Left: the remove and restore cycle, which needs `make index`) |
| 5 | Repo skeleton for three clouds: a shared core with three small interfaces (retriever, generator, agent mode), corpus prep, eval, the Azure adapter and a fake adapter for tests | lab repo | Tests pass against the fake adapter | Not started |

### Phase 1 steps
{: #phase-1-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | Corpus sync from the blog to the corpus container, front matter as metadata | lab repo | Blob count equals published post count | Not started |
| 2 | Index as code: data source, index, skillset, indexer, vectorizer, semantic configuration | lab repo | Indexer run with zero failures; a hybrid query returns chunks with their URL | Not started |
| 3 | Golden question set v0, shared with the homelab RAG; retrieval scored for four modes | lab repo | hit@5 and MRR table for keyword, vector, hybrid, hybrid + semantic | Not started |
| 4 | The API locally: FastAPI and Agent Framework, hybrid + semantic, citations, streaming | lab repo | Answers a golden question with citations and no key in config | Not started |
| 5 | The API on Container Apps with its managed identity and Entra sign-in | lab repo, infra-azure | Signed-in calls answer; anonymous calls get 401 | Not started |

### Phase 2 steps
{: #phase-2-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | Foundry IQ knowledge source and knowledge base over the same index | lab repo | Answers a multi-part golden question with references | Not started |
| 2 | Foundry Agent Service agent using the knowledge base over MCP | lab repo | Cites blog URLs in the playground and through the SDK | Not started |
| 3 | Agent Framework agent with search as a tool, with iteration and time limits | lab repo | Tool calls show in the trace | Not started |
| 4 | Four-mode comparison: quality, latency, tokens, tool calls, cost | lab repo | Comparison table published in the results | Not started |

### Phase 3 steps
{: #phase-3-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | `make eval` with Foundry evaluations per mode, results versioned | lab repo | One command writes a dated results file | Not started |
| 2 | Evaluation in CI for changes to prompts, chunking or the index | lab repo | A deliberately worse prompt fails the check | Not started |
| 3 | Tracing and dashboard: latency, tokens and cost per mode, zero-result rate | lab repo, infra-azure | Every mode shows after an eval run | Not started |
| 4 | Alerts on errors, p95 latency and budget | infra-azure | A forced failure fires and resolves | Not started |

### Phase 4 steps
{: #phase-4-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | Golden set through the homelab RAG with the same scorer | lab repo | Both systems in one table | Blocked (waits on the homelab's ingest, API and golden set, [platform Phase 5](/posts/projects/cloudutsuk-platform/03-product-planning/#phase-5-steps)) |
| 2 | Comparison write-up: quality, latency, cost | lab repo, this blog | Comparison section published | Not started |

### Phase 5 steps
{: #phase-5-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | A VNet, a private-endpoint subnet and the private DNS zones in the lab's own subscription (the platform's network and zones are in another tenant, ADR 0012) | infra-azure | Zones linked to the lab's VNet | Not started |
| 2 | Private endpoints for Foundry, Search and Storage; shared private links for the indexer; public access off | infra-azure | Indexer runs with public access off everywhere | Not started |
| 3 | Container Apps environment inside the lab's VNet | infra-azure | The API answers over the private path | Not started |
| 4 | Parity check on the golden set | lab repo | Scores within noise of the public setup | Not started |

### Phase 6 steps
{: #phase-6-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | RAG on Azure blog post and the areas the Azure phases give facts for | this blog | Published | Not started |

### Phase 7 steps
{: #phase-7-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | AWS choices as ADRs: region, vector store, hosting, caller auth | lab repo | ADRs accepted | Not started |
| 2 | Terraform modules AWS needs (roles, Knowledge Base, vector store, registry, host, OIDC) | shared module | Merged | In progress (2026-11-19: all but the host and a budget merged) |
| 3 | AWS dev stack with no long-lived access keys and a budget alert | infra-aws | Applied from `main` | In progress (2026-11-19: stack written, planned only) |
| 4 | Ingestion through a Knowledge Base sync from the corpus bucket | lab repo | Every post ingested | Not started |
| 5 | AWS adapter: Knowledge Base retrieval, Bedrock chat; retrieval table | lab repo | Results for the golden set | Not started |
| 6 | The same image hosted on AWS with caller auth | lab repo, infra-aws | Authenticated calls answer | Not started |
| 7 | Agentic modes on AWS | lab repo | Tool calls in the trace | Not started |
| 8 | Eval, tracing and idle cost on AWS | lab repo, infra-aws | Dated results file | Not started |
| 9 | Optional private networking | infra-aws | Answers with public access off | Planned |

### Phase 8 steps
{: #phase-8-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | GCP choices as ADRs: project and region, retrieval backend, hosting, caller auth | lab repo | ADRs accepted | Not started |
| 2 | Terraform modules GCP needs (service accounts, bucket, registry, Cloud Run, workload identity) | shared module | Merged | In progress (2026-11-19: all but a budget merged) |
| 3 | GCP dev stack with no service account keys and a budget alert | infra-gcp | Applied from `main` | In progress (2026-11-19: stack written, planned only) |
| 4 | Ingestion into a RAG Engine corpus from the corpus bucket | lab repo | Every post imported | Not started |
| 5 | GCP adapter: RAG Engine retrieval, Gemini chat; retrieval table | lab repo | Results for the golden set | Not started |
| 6 | The same image on Cloud Run with caller auth | lab repo, infra-gcp | Authenticated calls answer | Not started |
| 7 | Agentic mode on GCP | lab repo | Tool calls in the trace | Not started |
| 8 | Eval, tracing and idle cost on GCP | lab repo, infra-gcp | Dated results file | Not started |
| 9 | Optional private networking | infra-gcp | Answers with public access off | Planned |

### Phase 9 steps
{: #phase-9-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | One eval run over every mode on all three clouds and the homelab | lab repo | One comparison table | Not started |
| 2 | Cross-cloud write-up, remaining playbook areas, interview post | this blog | Published | Not started |

## MVP definition
{: #mvp-definition }

The MVP is the end of Phase 1: **one question in, a grounded answer with working citations out, keyless, from
Terraform and index-as-code, with a retrieval baseline on the golden set.** That last part is what makes it an
MVP for a lab rather than a demo. Without the baseline, Phase 2 has nothing to compare against.

What the MVP deliberately leaves out: agents, CI evaluation gates, dashboards beyond the default Application
Insights views, and private networking.

## Release milestones
{: #release-milestones }

| Milestone | Exit check |
|---|---|
| M0 Foundations | The stack applies from `main`, local auth is off everywhere, and Search can be removed and restored |
| M1 MVP | The Phase 1 done-when checks pass and the retrieval table exists |
| M2 Agentic | The four-mode comparison table exists |
| M3 Measured | Evaluation runs in CI and the dashboard shows every mode |
| M4 Compared | The homelab row is in the comparison table |
| M5 Private | Parity check passes with public access off |
| M6 AWS | AWS results file exists for every AWS mode |
| M7 GCP | GCP results file exists for every GCP mode |
| M8 Cross-cloud | The comparison table covers three clouds and the homelab |

**Pace and dates** (set 2026-11-23): about five hours a week, in sessions, which is what the
idle-cost switch is designed around. M0 by the end of November 2026, M1 by the end of December 2026. Later
milestones get dates when M1 lands, from how long Phases 0 and 1 actually took rather than from a guess now.

## Backlog structure
{: #backlog-structure }

Phases and steps are the backlog; there's no separate tool. The plan in the lab repo has one row per step with a
Progress table, and this post keeps one line per step for readers. Work outside a step (a bug, an idea) goes into
the plan's open questions or becomes a new lettered step, never silent extra scope.

## Prioritization approach
{: #prioritization-approach }

Two rules decide the order:

1. **Measure before you compare.** The golden set and retrieval scores come before any agent.
2. **Cheapest learning first.** Index tuning (chunk size, hybrid vs vector, semantic ranker) costs almost nothing
   per experiment; agentic runs cost model tokens per question; private networking costs setup time and money
   for little new RAG knowledge. So they come in that order.

## Budget and resource planning
{: #budget-and-resource-planning }

The cost shape, from the services' billing models:

| Item | Billing | Idle cost |
|---|---|---|
| Azure AI Search, Basic | Per hour while it exists | Yes: the main one, removed between sessions |
| Semantic ranker | Free plan with a monthly allowance, then per query | No |
| Foundry model deployments | Per token | No |
| Agentic retrieval | Retrieval tokens, plus model tokens for query planning | No |
| Storage, Log Analytics, Application Insights | Per GB stored and ingested | Small |
| Container Apps (consumption) | Per use, scales to zero | Near zero |

The cap is **100 a month** for the lab's resource group, set for a proof of concept (2026-11-23). The arithmetic
behind it: Search Basic is about $0.10 an hour, roughly $74 if it's never removed, which leaves about a quarter of the
budget for tokens, storage and logs. Models are small and pay per token (`gpt-5-mini` for chat, ADR 0013), so a
few hundred eval questions cost cents, not dollars. The budget emails at 50% and 80% of actual spend, and when the
month's forecast passes 100%. That last one matters most: it fires while Search is still running, before the money
is spent. The remove-and-restore switch is what keeps the real bill well under the cap; the budget is the backstop.

A budget notifies, it doesn't stop anything. If it fires, the response is the same PR that ends a session: remove
the Search service.

## Risk and dependency management
{: #risk-and-dependency-management }

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Region lacks a feature (semantic ranker, agentic retrieval, a model) | Medium | Stack has to move | Check every feature for the region before Phase 0 step 3 |
| Preview APIs change (portal agentic retrieval, project connections) | High | Rework | Use the GA `2026-10-01` REST API where possible; pin SDK versions |
| Search left running | Medium | Wasted spend | Idle-cost switch and budget alert |
| Homelab RAG not ready | High | Phase 4 slips | Phase 4 is last before networking and blocked explicitly |
| Small corpus hides differences | Medium | Weak conclusions | State it in every result; add hard multi-post questions |
| The shared interfaces fit Azure only | Medium | Rework when AWS starts | Keep them small; accept a revision in Phase 7 |
| Managed pipelines chunk differently | High | Cross-cloud results compare pipelines, not stores | Align chunk settings where possible; say so in every result |
| Terraform modules missing for AWS and GCP | Certain | Two module steps before each cloud | Planned as Phase 7 and 8 step 2 |

## Change-control process
{: #change-control-process }

A change to scope or order goes through the plan first: a PR that edits the plan's phase table and this post
together, plus an ADR if it changes a decision. Adding a step inside a phase only needs the new row. Moving work
between phases or adding a phase needs an ADR, because the reason is what future me will want to know.

## Checklist
{: #checklist }

- [ ] Every phase has numbered steps with a checkable done-when
- [ ] The golden set lands before any agentic step
- [x] Budget cap set and budget alert planned (100 a month)
- [ ] Region feature check scheduled before the stack is applied
- [ ] Phase 4's dependency on the homelab tracked as Blocked
- [ ] Hours per week and an M1 target month agreed
- [ ] Change control (plan PR plus ADR) followed for scope changes

{% include project-nav.html %}
