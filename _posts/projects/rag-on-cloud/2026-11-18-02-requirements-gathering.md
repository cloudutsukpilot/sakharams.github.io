---
layout: post
title: "RAG on Cloud: Requirements Gathering"
date: 2026-11-18 00:02:00 +0530
categories: [projects, rag-on-cloud]
tags: [Projects, RAG on Cloud, Requirements]
description: "What the Azure RAG lab must do and how well: ingestion, four answer modes, keyless access, evaluation, and the limits I'm accepting."
project: rag-on-cloud
project_step: 2
image:
  path: /assets/img/projects/rag-on-cloud/02-requirements-gathering.webp
  alt: "RAG on Cloud: Requirements Gathering - Projects hero image"
---

The requirements for a lab are unusual: the system only has to work well enough to be measured. So most of what
follows is about making every answer traceable and every mode comparable, rather than about features.

<!-- more -->

{% include project-nav.html %}

## Functional requirements
{: #functional-requirements }

| ID | Requirement | Phase |
|---|---|---|
| FR-1 | Sync the blog's published posts to a storage container, with title, URL, date, categories and tags as metadata | 1 |
| FR-2 | Extract, chunk and embed the posts into a search index with text and vector fields | 1 |
| FR-3 | Re-index only changed posts on the next sync | 1 |
| FR-4 | Answer a question with standard RAG: one hybrid + semantic query, top chunks, chat model | 1 |
| FR-5 | Cite every answer with the post URLs (and section anchors where available) it used | 1 |
| FR-6 | Say "I couldn't find that on the blog" when retrieval returns nothing relevant, instead of answering from the model's memory | 1 |
| FR-7 | Answer through a Foundry IQ knowledge base (agentic retrieval) over the same index | 2 |
| FR-8 | Answer through a Foundry Agent Service agent that uses the knowledge base as an MCP tool | 2 |
| FR-9 | Answer through an Agent Framework agent with search as a tool, selectable per request (`mode=`) | 2 |
| FR-10 | Run the golden question set through every mode, and the homelab RAG, with one scorer | 1–4 |

## Non-functional requirements
{: #non-functional-requirements }

| ID | Area | Requirement |
|---|---|---|
| NFR-1 | Security | No API keys or connection strings: Entra ID tokens, managed identities and RBAC only; local auth off on Foundry, Search and Storage |
| NFR-2 | Reproducibility | Every Azure resource from Terraform in `infra-azure`; every index object from JSON in the lab repo |
| NFR-3 | Cost | Idle cost close to the Search service alone, and that removable between sessions |
| NFR-4 | Observability | Every request traced with mode, latency, tokens and retrieved document IDs |
| NFR-5 | Latency | p95 targets per mode, set after the baseline run |
| NFR-6 | Region | Every service in one region that supports semantic ranker, agentic retrieval and the chosen models |
| NFR-7 | Privacy | Only public content is indexed |

> **TODO:** Latency targets. Microsoft's guidance puts standard RAG at a few seconds and agentic RAG with several
> tool calls at several times that; what is acceptable for this lab's chat, per mode?
{: .prompt-warning }

## User journeys and use cases
{: #user-journeys-and-use-cases }

**UC-1, ask the blog.** A reader asks "how does the homelab back up its clusters?" The API returns a short answer
citing the Velero post and the infrastructure area of the platform playbook. If nothing relevant is found, it
says so.

**UC-2, compare modes.** I run `make eval` after changing the chunk size. The harness runs the golden set through
all four modes and writes a dated results file; the PR shows the difference from the last run.

**UC-3, rebuild after a break.** I restore the Search service through a PR, run `make index`, and the indexer
rebuilds the index from the corpus container. The first question works within the rebuild time measured in
Phase 0.

**UC-4, a new post.** I publish a post; the sync workflow uploads it; the next indexer run picks it up, and a
question about it cites it.

## Acceptance criteria
{: #acceptance-criteria }

Written as checks that can be run:

- **FR-2:** the indexer's last run reports zero failed documents, and every chunk has a non-empty vector.
- **FR-5:** for each golden question, every cited URL resolves on cloudutsuk.com.
- **FR-6:** five out-of-corpus questions in the golden set (for example about a product the blog never mentions)
  all get the "couldn't find" response.
- **FR-7 to FR-9:** each mode answers the golden set without errors, and its trace shows the tool calls.
- **NFR-1:** `az search service show` reports local auth disabled, the storage account has shared-key access off,
  and a search with an admin key fails.
- **NFR-3:** after the Search service is removed, the daily cost in Cost Management falls to the remaining
  resources' cost.

## Business rules
{: #business-rules }

- Answers come only from retrieved chunks; the system prompt forbids answering from general knowledge.
- A post with `published: false`, or anything under the blog's private folder, is never synced.
- Citations point to the public URL, never to the blob path.
- An answer quotes at most a short passage from any post; it links to the post for the rest.

## Reporting and analytics requirements
{: #reporting-and-analytics-requirements }

The "reports" are results files and one dashboard:

| Output | Content | Where |
|---|---|---|
| Retrieval results | hit@5 and MRR per retrieval mode | `results/` in the lab repo, dated |
| Answer evaluation | Groundedness, relevance, retrieval, completeness per answer mode | `results/`, plus Foundry's evaluation view |
| Operations dashboard | p50/p95 latency, tokens and cost per request, zero-result rate, per mode | Application Insights workbook |
| Comparison | Azure modes vs homelab RAG | The final write-up on this blog |

## Accessibility and localization requirements
{: #accessibility-and-localization-requirements }

The blog is English and so is the corpus, so the index, analyzers and semantic ranker are configured for English
only. There is no UI of my own in scope: the API is called from a terminal, the Foundry playground or the eval
harness. If a chat page is added later (see the TODO on a public demo in
[Vision](/posts/projects/rag-on-cloud/01-vision-and-business-context/#target-users-and-personas)), it should meet
the same accessibility bar as the blog itself: keyboard use, visible focus, and answers announced to screen
readers.

## Regulatory, legal, and compliance requirements
{: #regulatory-legal-and-compliance-requirements }

Light, because the data is public and mine. Two things still apply:

- **Model provider terms.** Azure OpenAI models in Foundry come with Microsoft's content filters and terms; the
  deployments keep the default content filter policy.
- **Copyright of quoted content.** Posts sometimes quote vendor docs. The short-quote rule in
  [Business rules](#business-rules) keeps answers from republishing large passages.

No personal data is processed beyond my own sign-in.

## Prioritization and release scope
{: #prioritization-and-release-scope }

MoSCoW, by phase:

| Priority | Items |
|---|---|
| Must (Phase 1) | FR-1 to FR-6, NFR-1 to NFR-4, NFR-6, NFR-7 |
| Should (Phases 2–3) | FR-7 to FR-10, evaluation in CI, the dashboard |
| Could (Phase 4–5) | Homelab comparison, private endpoints |
| Could (Phases 7–9) | The same system on AWS and GCP, and a cross-cloud comparison |
| Won't (now) | A chat UI, private documents |

The full sequence is in [Product Planning](/posts/projects/rag-on-cloud/03-product-planning/#product-roadmap).

## Checklist
{: #checklist }

- [ ] Each FR has a runnable acceptance check
- [ ] Latency targets set per mode after the baseline
- [ ] Out-of-corpus questions included in the golden set
- [ ] Unpublished and private posts excluded from the sync
- [ ] Region confirmed for semantic ranker, agentic retrieval and the models
- [ ] Keyless checks (local auth off, shared key off) automated
- [ ] MoSCoW split agreed with the phase plan

{% include project-nav.html %}
