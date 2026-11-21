---
layout: post
title: "RAG on Cloud: Architecture Decision Records"
date: 2026-11-18 00:30:00 +0530
categories: [projects, rag-on-cloud]
tags: [Projects, RAG on Cloud, Architecture, ADR]
description: "Every architecture decision behind RAG on Cloud, with its context, the options considered and the consequences."
project: rag-on-cloud
project_adrs: true
image:
  path: /assets/img/projects/rag-on-cloud/architecture-decision-records.webp
  alt: "RAG on Cloud: Architecture Decision Records - Projects hero image"
---

Every significant decision in RAG on Cloud is written down as an architecture decision record (ADR): what
forced the decision, what was decided, which options lost and why, and what it costs. This post is the
full log, generated from the project's repo (`rag-on-cloud/docs/adr`), so it always matches what the project works to.

<!-- more -->

{% include project-nav.html %}

## How to read this log
{: #how-to-read-this-log }

- **Proposed** decisions are still waiting on evidence, such as a spike or a baseline; **accepted** ones
  are what the platform is built to. A changed decision never edits an accepted ADR: a new ADR replaces
  it and the old one is marked **superseded**, with a link forward, so the history stays.
- Each ADR names the repos it affects. The summary table is in the
  [Technical Architecture](/posts/projects/rag-on-cloud/05-technical-architecture/#architectural-decision-records) post.

<!-- adr:begin -->
{% raw %}

## ADR-0001: Record architecture decisions as MADR in rag-on-cloud
{: #adr-0001 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-18 · `rag-on-cloud`, `sakharams.github.io`</span>

#### Context

The lab spans this repo, `infra-azure` and the shared Terraform module, and its public playbook on the blog has to
stay in step with what is built. Decisions made during planning are easy to lose.

#### Decision

- Every significant decision is an ADR in `docs/adr/NNNN-kebab-title.md`, MADR with front matter (`id`, `title`,
  `status`, `date`, `deciders`, `related_repos`) and the sections Context, Decision, Considered options and
  Consequences.
- A changed decision gets a new ADR; the old one becomes `superseded by NNNN`.
- The blog publishes them with `sync_adrs.py rag-on-cloud`.

#### Considered options

- ADRs in the homelab-gitops platform log: rejected, this lab is not part of the homelab platform.
- Decisions only in the plan: rejected, the plan is a progress list and loses the reasons.

#### Consequences

- One more file per decision; the blog's ADR post is generated, never hand-edited.

## ADR-0002: The corpus is the blog's public posts
{: #adr-0002 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-18 · `rag-on-cloud`, `sakharams.github.io`</span>

#### Context

A RAG lab needs documents whose answers the author can judge, that are safe to send to a cloud service, and that
change often enough to exercise incremental indexing. The homelab RAG (Platform Phase 5) indexes the same blog.

#### Decision

Index the Markdown posts of `sakharams.github.io/_posts`, with front matter (title, URL, date, categories, tags) as
metadata. Liquid tags and includes are stripped before upload.

#### Considered options

- Microsoft's sample data sets: easy, but the author can't judge the answers and it can't be compared with the homelab.
- Private notes or work documents: rejected, nothing private goes into the lab.

#### Consequences

- Both systems can share one golden question set, which makes the homelab comparison fair.
- The corpus is small (hundreds of posts), so the lab says little about scale; that is stated in every result.

## ADR-0003: Azure resources through infra-azure; index objects as code in this repo
{: #adr-0003 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-18 · `rag-on-cloud`, `infra-azure`, `platform-as-code`</span>

#### Context

Every Azure resource on the platform is Terraform through the platform-as-code shared module, with plan on PR and
apply on `main`. Search data-plane objects (index, data source, skillset, indexer, knowledge source, knowledge base)
are not ARM resources and are not covered by the azurerm provider.

#### Decision

- Resources go in a new `infra-azure` stack, `environments/azure/development/rag-on-cloud`, using shared-module
  modules; a missing `azurerm_search_service` module is added to the shared module first.
- Data-plane objects are JSON in this repo (`index/`), applied by `make index` through the Search REST API with an
  Entra token.

#### Considered options

- azd or Bicep inside this repo: faster to start, but bypasses the platform's IaC, scanners and state.
- Terraform `restapi`/`azapi` for data-plane objects: possible, but ties index changes to an infra apply and slows
  iteration on chunking.

#### Consequences

- Two places to change for some features (a new skill may need a role assignment in infra-azure).
- Index changes are fast and reviewed in this repo's PRs.

## ADR-0004: Keyless access with Entra ID, managed identity and RBAC; Search on Basic
{: #adr-0004 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-18 · `rag-on-cloud`, `infra-azure`</span>

#### Context

The owner chose keyless access from the start. On Azure AI Search's Free tier, indexers can't use a managed identity
for outbound access, so a keyless indexer needs Basic or above.

#### Decision

- Local (key) authentication is off on Foundry, Search and Storage (shared key off).
- People and the API use Entra ID; the indexer and skillset use the Search service's managed identity; the API uses a
  user-assigned identity.
- Azure AI Search runs on Basic, with semantic ranker on its free plan.

#### Considered options

- Free tier with API keys and a storage connection string: cheapest, but keys in config and no managed identity.
- Standard S1: more capacity than a lab needs.

#### Consequences

- Search has an hourly cost while it exists, handled by ADR 0008.
- Every caller needs a role assignment; role names are listed in the plan.

## ADR-0005: Public endpoints first, private endpoints in a later phase
{: #adr-0005 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-18 · `rag-on-cloud`, `infra-azure`</span>

#### Context

Private endpoints for Foundry, Search and Storage need DNS zones, shared private links and a way to reach the VNet for
testing. They add cost and setup before anything works.

#### Decision

Phases 1 to 4 use public endpoints protected by Entra ID and RBAC. Phase 5 adds private endpoints, using the private
DNS zones in `production/connect-dns`, then proves parity on the golden set.

#### Considered options

- Private from the start: more realistic, but blocks learning RAG on networking work.
- Public forever: leaves out the most common enterprise requirement.

#### Consequences

- Phases 1 to 4 are reachable from the internet (with auth). No private data is indexed (ADR 0002), which keeps that
  acceptable.

## ADR-0006: Orchestrator: a shared FastAPI pipeline; Microsoft Agent Framework for the Azure agent mode
{: #adr-0006 }

<span class="adr-status adr-status-proposed">Proposed</span> <span class="adr-meta text-muted">2026-11-18 · `rag-on-cloud`</span>

#### Context

The outline lists Agent Framework, Semantic Kernel, LangChain or custom code. Microsoft's agentic RAG guidance uses
Agent Framework and Foundry Agent Service, and the same code base should serve both the standard pipeline and the
agent with search as a tool.

#### Decision

Revised 2026-11-19, while still proposed, after ADR 0009 made the repo multi-cloud.

- The standard pipeline is plain Python in `core` (FastAPI, the `Retriever` and `Generator` protocols); no agent
  framework is needed for a fixed search-then-generate sequence, and it must run unchanged on every cloud.
- The Azure agent mode (`providers/azure`) uses Microsoft Agent Framework with search as a tool. AWS and GCP agent
  modes use their own clouds' agent tooling (Phases 7 and 8), behind the same `AgentMode` protocol.
- The chat model is a deployment name in config, chosen in a later ADR.

#### Considered options

- Semantic Kernel: its agent features moved into Agent Framework.
- LangChain: portable, but a second abstraction over the Azure SDKs.
- Plain SDK code only: simplest for standard RAG, but the agentic path would be hand-built.

#### Consequences

- Python matches the homelab `rag-api`, so the scorer and prompts can be shared.
- Agent Framework is young; versions are pinned and upgrades tested against the golden set.

## ADR-0007: Standard and agentic RAG side by side over one index
{: #adr-0007 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-18 · `rag-on-cloud`</span>

#### Context

The lab's question is what agentic retrieval buys over a fixed pipeline, and at what latency and cost. Comparing them
on different indexes or data would confound the result.

#### Decision

One index serves four modes: standard RAG in the API, a Foundry IQ knowledge base, a Foundry Agent Service agent using
the knowledge base over MCP, and an Agent Framework agent with search as a tool. All are scored on the same golden
set.

#### Considered options

- Only standard RAG: misses half of the outline.
- Only Foundry Agent Service: hides the retrieval details the lab is meant to show.

#### Consequences

- Four modes to keep working; the eval harness runs them all per change.

## ADR-0008: Idle cost: remove only the Search service between sessions
{: #adr-0008 }

<span class="adr-status adr-status-proposed">Proposed</span> <span class="adr-meta text-muted">2026-11-18 · `rag-on-cloud`, `infra-azure`</span>

#### Context

Foundry deployments (pay per token), Storage, Application Insights and Container Apps on consumption cost little or
nothing idle. A Basic Search service is billed hourly whether used or not.

#### Decision

Keep the Search service in its own list in the stack's `resources.yaml`; a PR empties the list to remove it between
lab sessions and restores it to bring it back. The index is rebuilt from blob with `make index`. A budget alert backs
this up.

#### Considered options

- Destroy the whole stack between sessions: also loses role assignments and deployments that cost nothing idle.
- Leave it running: simplest; the cost is the open question for the owner.

#### Consequences

- Each session starts with a PR and an indexer run.
- Index and skillset definitions must stay complete in this repo, since the service is rebuilt often.

## ADR-0009: One repo: a cloud-neutral core with an adapter folder per cloud
{: #adr-0009 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-19 · `rag-on-cloud`</span>

#### Context

The owner wants the same RAG system on Azure, AWS and GCP in this repo (2026-11-19), sharing code where it is really
cloud-independent and using a folder per cloud where it isn't. Azure is built first. A fair comparison needs the
prompt, citations, API contract and scorer to be identical across clouds.

#### Decision

- `core/` holds what doesn't import a cloud SDK: models, three protocols (`Retriever`, `Generator`, `AgentMode`),
  prompt and citation building, the FastAPI app with `mode=`, telemetry setup.
- `corpus/` cleans the blog posts once and has one uploader per cloud; `eval/` holds the golden set, scorer and runner.
- `providers/<cloud>/` implements the protocols with that cloud's SDK and holds its managed-pipeline configuration.
- One Dockerfile; build arg `PROVIDER` installs only that cloud's adapter. `make <target> CLOUD=<cloud>` everywhere.
- A `fake` provider makes the core testable without any cloud.

#### Considered options

- A repo per cloud: duplicated API, prompts and scorer drift apart and the comparison stops being fair.
- A framework that abstracts every cloud (LangChain, LlamaIndex): hides exactly the native services the lab is meant
  to show.
- Fully shared code including ingestion: would replace each cloud's managed pipeline with my own, losing half the
  lesson.

#### Consequences

- The protocols must be designed with three clouds in mind while only Azure exists; they will change when AWS arrives,
  and that is expected.
- Each cloud adapter stays small; anything two adapters duplicate is a candidate for `core`.

## ADR-0010: Each cloud's native managed ingestion and retrieval; shared prompt, API and scorer
{: #adr-0010 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-19 · `rag-on-cloud`</span>

#### Context

Each cloud has a managed RAG pipeline: Azure AI Search indexers and skillsets with Foundry IQ knowledge bases, Amazon
Bedrock Knowledge Bases, and Vertex AI RAG Engine (or Vertex AI Search). The lab is about learning these, and
comparing them.

#### Decision

- Ingestion, chunking, embedding and retrieval use each cloud's managed service, configured from files in
  `providers/<cloud>/`.
- Generation, prompts, citations and scoring are shared, so differences in results come from retrieval and models, not
  from my code.
- The agentic mode on each cloud uses that cloud's native agent or agentic-retrieval service.

#### Considered options

- One self-built pipeline (own chunker, each cloud's embeddings and vector store): isolates the vector stores, but
  skips the managed services people actually choose between.
- Both: kept as a possible later experiment, not in scope now.

#### Consequences

- Chunking differs per cloud, so a retrieval result compares whole pipelines, not stores. Every result says so.
- Chunking settings are aligned across clouds as closely as each service allows, and recorded with the results.

## ADR-0011: Infrastructure in each cloud's IaC repo through the shared module
{: #adr-0011 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-19 · `rag-on-cloud`, `infra-azure`, `infra-aws`, `infra-gcp`, `platform-as-code`</span>

#### Context

ADR 0003 put Azure resources in infra-azure. AWS and GCP have their own Terragrunt repos (infra-aws, state in S3;
infra-gcp, state in GCS), each with only a hello-world network today, and the shared module has only networking and S3
modules for them.

#### Decision

- AWS resources go in an infra-aws dev stack and GCP resources in an infra-gcp dev stack, through the shared module,
  plan on PR and apply on `main`, like Azure.
- Missing modules are added to the shared module first (Phase 7 step 2, Phase 8 step 2).
- Data-plane objects that Terraform doesn't manage well (knowledge base sync jobs, RAG corpora and imports) are
  applied by `make index CLOUD=<cloud>` from this repo, as on Azure.
- No long-lived credentials on any cloud: managed identities, IAM roles and service accounts, and GitHub OIDC
  (federated credentials, an IAM OIDC provider, Workload Identity Federation).

#### Considered options

- CDK, CloudFormation or Deployment Manager per cloud: native, but three IaC styles and none of the platform's scanners.
- All three clouds in one IaC repo: breaks the platform's one-repo-per-provider layout.

#### Consequences

- Two module-building steps before AWS and GCP can start; the modules are reusable by the platform afterwards.

{% endraw %}
<!-- adr:end -->

{% include project-nav.html %}
