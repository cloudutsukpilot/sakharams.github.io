---
layout: post
title: "RAG on Cloud: Vision and Business Context"
date: 2026-11-18 00:01:00 +0530
categories: [projects, rag-on-cloud]
tags: [Projects, RAG on Cloud, Vision]
description: "Why I'm building RAG end to end on Azure over this blog's own posts: what it should teach, who it's for, and how I'll know it worked."
project: rag-on-cloud
project_step: 1
image:
  path: /assets/img/projects/rag-on-cloud/01-vision-and-business-context.webp
  alt: "RAG on Cloud: Vision and Business Context - Projects hero image"
---

Every vendor demo of retrieval-augmented generation answers a question about a hotel brochure and stops there.
I want to know what the Azure version costs, where it breaks, and whether the "agentic" flavour is worth its
extra seconds, so I'm building it end to end over something I can actually judge: the posts on this blog.

<!-- more -->

{% include project-nav.html %}

## Business problem and opportunity
{: #business-problem-and-opportunity }

There's no paying customer here, and I'd rather say so up front. The "business" is my own learning and the
architecture work I do for others: when someone asks "should we build RAG on Azure AI Search or roll our own
vector store?", I want to answer from something I've run, not from a slide.

The opportunity has three parts:

- **Azure's RAG stack changed a lot in a year.** Azure AI Search is now presented as Foundry IQ, knowledge bases
  and agentic retrieval became generally available in the `2026-10-01` REST API, and Foundry Agent Service can
  call a knowledge base over MCP. The docs describe each piece; I want to see them wired together.
- **I already have a homelab RAG on the way.** The [Cloudutsuk Platform](/posts/projects/cloudutsuk-platform/03-product-planning/#phase-5-steps)
  plans `rag-ingest` and `rag-api` over Qdrant and local models, indexing the same blog. Two implementations over
  one corpus make an honest comparison possible.
- **Standard vs agentic RAG is a live design question.** Microsoft's own guidance says an agentic request can take
  several times longer than a single search plus generation. I'd like my own numbers on my own data.

## Goals, objectives, and expected outcomes
{: #goals-objectives-and-expected-outcomes }

| Goal | Objective | Outcome I expect to show |
|---|---|---|
| Build it properly | Every resource through the platform's Terraform, index definitions as code, no keys | A stack that can be removed and rebuilt from the repo |
| Understand retrieval | Score keyword, vector, hybrid and hybrid + semantic on the same questions | A table that says which mode finds the right post, and how often |
| Compare architectures | Standard RAG, a Foundry IQ knowledge base, a Foundry agent and an Agent Framework agent over one index | Quality, latency and cost per request side by side |
| Compare platforms | The same golden questions through the homelab RAG | Azure vs local on quality, latency and running cost |
| Share it | Playbook and a write-up on this blog | Posts someone else can follow |

The deliverable that matters most is the comparison table, not the chat endpoint. A RAG demo that answers
"what is Argo CD?" proves nothing; a table that shows hybrid + semantic finding the right post more often than
vector alone, at a stated cost, is something I can reuse in a design review.

## Stakeholders, sponsors, and decision-makers
{: #stakeholders-sponsors-and-decision-makers }

This is a one-person lab, so the roles collapse onto me, and that's worth naming because it changes how
decisions are recorded:

| Role | Who | What they decide |
|---|---|---|
| Sponsor and budget owner | Me | Whether the Azure bill is worth it |
| Architect and builder | Me | Everything in the [ADR log](/posts/projects/rag-on-cloud/05-technical-architecture/#architectural-decision-records) |
| Reviewer | Me, a day later, through PRs | Whether a change merges |
| Readers | People who follow this blog | Nothing, but they're who the write-up is for |

With no second reviewer, the safeguards are mechanical: plan on every infrastructure PR, an evaluation run on
every change to prompts or chunking, and ADRs written before the code they describe.

## Target users and personas
{: #target-users-and-personas }

Two personas, and neither is a "customer":

- **The architect (me, and readers like me).** Wants to know which retrieval mode to recommend and what it costs.
  Reads the results tables and the ADRs, may never call the API.
- **The reader with a question.** Wants to ask "how did you set up split DNS for the homelab?" and get an answer
  with a link to the post that explains it. This is the user the chat endpoint is built for.

**The API stays owner-only** (decided 2026-11-23). Readers get the published results, the comparison
tables and the ADRs, not a live endpoint. An open endpoint in front of pay-per-token models needs rate limits, abuse
handling and a hard cost cap, and building those isn't what this lab is about. If that changes, the design is sign-in
for readers through Container Apps authentication with Entra External ID, a per-user daily question quota in the API,
and the budget scaling the app to zero when it's hit.

## Success metrics and business KPIs
{: #success-metrics-and-business-kpis }

The metrics are about the lab teaching something, measured on a fixed golden question set:

| Metric | How it's measured | Target |
|---|---|---|
| Retrieval hit rate | The expected post is in the top 5 chunks (hit@5), per retrieval mode | TODO |
| Groundedness | Foundry evaluation of each answer against its retrieved chunks | TODO |
| Latency | p50 and p95 per mode, from Application Insights | TODO |
| Cost per question | Tokens and search calls per request, priced | TODO |
| Rebuild time | Time from an empty resource group to a working index | TODO |

> **TODO:** I haven't set targets yet, and I'd rather set them after the first baseline run than invent them.
> Which of these should become a pass/fail gate in CI, and at what threshold?
{: .prompt-warning }

## Scope, assumptions, constraints, and dependencies
{: #scope-assumptions-constraints-and-dependencies }

**In scope:** Azure first, then AWS and GCP; standard RAG, agentic RAG, evaluation and monitoring, the homelab comparison,
and private networking as a late phase.

**Out of scope:** private or work documents (the corpus is public by design), a polished chat UI, multi-tenant
access, and fine-tuning.

**Assumptions:** the blog's few hundred posts are enough to show differences between retrieval modes, even if
they say little about scale. Microsoft Learn's current docs reflect the services as they are when I build.

**Constraints:** a personal budget, so idle cost matters; keyless access from day one; Terraform through the
platform's shared module, not the portal.

**Dependencies:**

- A Terraform module for Azure AI Search, which the shared module doesn't have yet.
- The homelab RAG services, still to be built in the platform's Phase 5, for the comparison phase.

**Clouds:** Azure first, then the same system on AWS and GCP from the same repo. What doesn't depend on a cloud
(the API, prompts, citations, the scorer) is written once; what does (ingestion, retrieval, models, agents) lives in
a folder per cloud. The last phase compares all three and the homelab on one question set.

## Checklist
{: #checklist }

- [ ] The comparison table, not the chat endpoint, is agreed as the main deliverable
- [x] Personas confirmed: owner-only API (2026-11-23)
- [ ] Success metrics have targets after the first baseline run
- [ ] Corpus fixed as the blog's public posts (ADR 0002)
- [ ] The homelab dependency (platform Phase 5) is tracked in the roadmap
- [ ] Azure, AWS and GCP phases sequenced, Azure first
- [ ] A monthly budget cap is set

{% include project-nav.html %}
