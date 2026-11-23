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

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-19 · `rag-on-cloud`, `infra-azure`, `infra-aws`, `infra-gcp`, `terragrunt_shared_module`</span>

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

## ADR-0012: The Azure stack runs in a sandbox subscription in a separate Entra tenant
{: #adr-0012 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-22 · `rag-on-cloud`, `infra-azure`, `platform-as-code`</span>

#### Context

The plan put the lab in the platform's dev subscription, next to its other development stacks. When the stack was
applied (2026-11-22), the owner pointed it at a sandbox subscription in a different Entra tenant instead. That tenant
has its own Azure Policy, its own required tags, its own users and its own service principal for CI.

#### Decision

The `development/rag-on-cloud` stack in infra-azure deploys to the sandbox subscription (`default_subscription` in the
stack's `common_vars.yaml`). It declares no other subscriptions, so the platform's `connect` and `management`
subscriptions aren't used (platform-as-code gives unused aliases a placeholder).

#### Considered options

- The platform's dev subscription: the original plan; shares the dev VNet, private-endpoint subnet and the private DNS
  zones in the connect subscription.
- The sandbox subscription: chosen by the owner.

#### Consequences

- The tenant's Azure Policy applies at apply time and the plan doesn't see it. It denies AI model deployments on the
  `GlobalStandard` SKU, so deployments use `Standard` or `DataZoneStandard`. A mandatory OPA policy in
  platform-as-code repeats the rule for that tenant, so a plan fails first.
- Users in role assignments are looked up in that tenant, with the stack's own credentials.
- Trivy findings the lab accepts are listed once for the GitHub organisation, not per stack.
- Phase 5 (private networking) can't reuse the dev subscription's VNet or the connect subscription's DNS zones,
  which are in the other tenant. It needs its own VNet, subnet and private DNS zones in the sandbox subscription.
- The lab's bill and its budget sit in the sandbox subscription.

## ADR-0013: Chat model on Azure: gpt-5-mini, DataZoneStandard
{: #adr-0013 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-23 · `rag-on-cloud`, `infra-azure`</span>

#### Context

ADR 0006 left the chat model open (open question 2). The lab is a proof of concept over a few hundred blog posts:
answers are short and grounded in retrieved chunks, so a small model should do. The platform's terraform-drift agent
already prices its work against gpt-5-mini. The tenant the stack runs in denies `GlobalStandard` deployments
(ADR 0012), and in `eastus` gpt-5-mini is offered as `DataZoneStandard` but not as regional `Standard`.

#### Decision

Deploy `gpt-5-mini` (version `2025-08-07`) as `DataZoneStandard` with 50 thousand tokens per minute, beside the
`text-embedding-3-small` embedding deployment (`Standard`).

#### Considered options

- A larger chat model: better on hard multi-post questions, more cost per answer; revisit if the golden set shows
  generation, not retrieval, is the weak part.
- `GlobalStandard`: denied by the tenant's policy.

#### Consequences

- Pay per token, no idle cost; data stays in the US data zone.
- The cross-cloud model question (open question 3: same family everywhere or each cloud's own) is still open; the
  judge model for scoring stays fixed either way.

## ADR-0014: One chat model family on every cloud: OpenAI's
{: #adr-0014 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-23 · `rag-on-cloud`, `infra-aws`, `infra-gcp`</span>

#### Context

Phase 9 compares Azure, AWS, GCP and the homelab on one golden set (`eval/golden/`). Open question 3 asked whether
each cloud should use the same model family, which makes the comparison about retrieval and the platform, or each
cloud's own flagship, which is closer to what a team on that cloud would pick. The owner chose the same family where
possible (2026-11-23). The judge model that scores the answers is fixed either way.

What each cloud offers (checked 2026-11-23):

| Cloud | OpenAI model offered | Where |
|---|---|---|
| Azure | `gpt-5-mini` (ADR 0013); `gpt-oss-120b` only as `GlobalStandard`, which the tenant denies (ADR 0012) | `eastus`, `DataZoneStandard` |
| AWS Bedrock | `openai.gpt-oss-120b-1:0`, in-region (no cross-region inference profile) | `ap-south-1` and 15 other commercial regions |
| GCP Vertex AI | `gpt-oss-120b-maas` (Model as a Service, GA) | The `global` endpoint (and `us-central1`), not `asia-south1` |

GPT-5 models are not offered on Bedrock or Vertex AI.

#### Decision

Use OpenAI's family everywhere: `gpt-5-mini` on Azure (unchanged, ADR 0013), `gpt-oss-120b` on AWS through the
Bedrock Converse API in `ap-south-1`, and `gpt-oss-120b` on GCP through the Vertex AI `global` endpoint. Each cloud's
generator adapter takes the model from config, so the comparison can be re-run with another model without code
changes.

#### Considered options

- Each cloud's flagship (gpt-5-mini, Claude or Nova on Bedrock, Gemini on Vertex AI): realistic for a team on one
  cloud, but a score difference would mix the model with the retrieval and the platform.
- `gpt-oss-120b` on Azure too, for an identical model: blocked by the tenant's `GlobalStandard` deny.

#### Consequences

- AWS and GCP run the same model, so their results compare directly; Azure differs in model (gpt-5-mini, a closed
  model) and every comparison table says so in a note.
- On Bedrock, gpt-oss-120b isn't supported as a Knowledge Base's generation model. The plan already separates the
  two (Knowledge Base `Retrieve` for retrieval, `Converse` for the answer), so nothing changes.
- On GCP the model runs on the `global` endpoint while retrieval stays in `asia-south1` (ADR 0015). Questions and
  retrieved chunks are public blog text (ADR 0002), so where they are processed doesn't matter here.
- A model family's availability changes; each cloud's Phase 7/8 step 1 re-checks it before the first run.

## ADR-0015: AWS in ap-south-1, GCP in the cloudutsuk project in asia-south1
{: #adr-0015 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-23 · `rag-on-cloud`, `infra-aws`, `infra-gcp`</span>

#### Context

Open question 6 asked for the AWS region and the GCP project and region (Phase 7 and 8, step 1). The owner chose
`ap-south-1` for AWS, and for GCP the `cloudutsuk` project in an India region, or whichever is cheaper
(2026-11-23). The draft stacks (infra-aws #18, infra-gcp #14) already assume the dev AWS account in `ap-south-1`
and the `cloudutsuk` project in `asia-south1`.

What the regions offer (checked 2026-11-23):

| Need | `ap-south-1` (Mumbai) | `asia-south1` (Mumbai) | `asia-south2` (Delhi) |
|---|---|---|---|
| Chat model (ADR 0014) | `gpt-oss-120b` in-region | Through the `global` endpoint | Through the `global` endpoint |
| Embeddings | Titan Text Embeddings V2 in-region | Vertex AI embedding model: confirm in step 1 | Not checked |
| Managed RAG | Bedrock Knowledge Bases: Mumbai is listed for structured data stores; vector stores to confirm in step 1 | Vertex AI RAG Engine, Preview | Not offered |

#### Decision

- AWS: the existing dev account in `ap-south-1`.
- GCP: project `cloudutsuk`, region `asia-south1`. It is the only India region with Vertex AI RAG Engine, so
  `asia-south2` can't host the lab whatever it costs; the "cheaper" comparison doesn't arise.

#### Considered options

- `asia-south2` for GCP: no RAG Engine.
- A US region on either cloud (`us-east-1`, `us-central1`): more services and often lower prices, but the owner
  asked for India, and the lab's costs are small enough that region pricing won't decide anything.

#### Consequences

- RAG Engine in `asia-south1` is Preview: an API change or a missing feature there is recorded as a lesson, and
  falling back to Vertex AI Search (the other option in Phase 8 step 1) stays open.
- Phase 7 step 1 still confirms that a Bedrock Knowledge Base with a vector store (S3 Vectors, OpenSearch
  Serverless) can be created in `ap-south-1`, before the vector-store ADR.
- No resources are created yet: the owner starts AWS and GCP after the Azure testing is finished.

## ADR-0016: Enterprise ingestion: a pipeline per source in Data Factory, a medallion lake on ADLS Gen2, Search indexes the curated layer
{: #adr-0016 }

<span class="adr-status adr-status-proposed">Proposed</span> <span class="adr-meta text-muted">2026-11-23 · `rag-on-cloud`, `infra-azure`, `platform-as-code`</span>

#### Context

Phase 1 step 1 ingests one source, the blog, with a GitHub Actions job that cleans the posts and uploads them to
Blob; Search's indexer and skillset then chunk, embed and index them (ADR 0010). That is the right first slice, and
it is how a single team would start. It isn't how an enterprise runs RAG ingestion, and the owner asked for the
enterprise shape (2026-11-23): Azure's data services, several data sources, a pipeline per source, landing in a
storage account, and room to add sources without touching the others.

What an enterprise ingestion platform has to give, and the single-job sync doesn't:

| Need | Why it matters | The sync today |
|---|---|---|
| One pipeline per source, same contract | Sources fail, change and get owners independently | One job, one source |
| Raw copy kept (replay, audit) | Re-process after a cleaning bug without re-pulling from the source; prove what was indexed | Overwrites the cleaned copy only |
| A canonical document schema | Retrieval, citations and filters work the same whatever the source | Blog-shaped JSON |
| Format extraction (PDF, Office, HTML) | Most enterprise content isn't Markdown | Markdown only |
| Document-level permissions | Users must retrieve only what they may read | Everything is public |
| Lineage, run history, alerting, quarantine | Operate it; answer "where did this answer come from" | Workflow logs |
| Classification and PII checks | Keep sensitive data out of prompts and logs | Not needed for public posts |

#### Decision

Build the ingestion platform from Azure data services, in five layers:

1. **Source registry** (`sources/<id>.yaml` in this repo): connector, schedule or event trigger, owner,
   classification, extractor, permission model and retention per source. Adding a source is a registry entry plus,
   when needed, an extractor; CI generates and deploys its pipeline.
2. **Ingest (Azure Data Factory)**: one pipeline per source, generated from one parameterised template: copy from
   the source with the matching connector (HTTP/Git, REST, SharePoint, SQL, Blob/S3) into the raw zone. Schedule,
   tumbling-window or storage-event triggers. The factory itself is Terraform (infra-azure); pipelines, datasets and
   linked services are JSON in this repo, deployed by CI like the index objects (ADR 0003). Managed identities for
   Azure sources; Key Vault for the credentials a SaaS connector needs.
3. **Lake (ADLS Gen2, hierarchical namespace)**, one storage account with zones as containers:
   - `raw` (bronze): the source's bytes as fetched, `raw/<source>/<yyyy>/<mm>/<dd>/<run id>/…`, immutable, kept
     for replay (lifecycle to cool, then delete after the retention in the registry).
   - `curated` (silver): one canonical JSON document per source item (the `ragcorpus` schema plus `source_id`,
     `source_uri`, `content_hash`, `ingest_run_id`, `classification`, permission fields), `curated/<source>/…`.
     Directory ACLs per source.
   - `quarantine`: items that failed extraction or a quality gate, with the reason; an alert fires on any.
4. **Process (Azure Functions, Flex Consumption, Python)**: started by Data Factory after the copy (or by Event
   Grid on a raw blob): pick the extractor (Markdown: `ragcorpus`; PDF and Office: Azure AI Document Intelligence
   layout to Markdown; HTML), normalise to the canonical schema, run the quality gates (non-empty, language,
   size, duplicate hash), detect PII for non-public classifications (Azure AI Language), write `curated` or
   `quarantine`, emit lineage. The cleaning code already written for the blog becomes the Markdown extractor.
5. **Index (Azure AI Search)**: one indexer per source over `curated/<source>/`, sharing one skillset (Text Split
   and the embedding skill, integrated vectorization as in ADR 0010) and one index with `source_id` as a filterable
   facet. The ADLS Gen2 indexer ingests directory ACLs into permission fields (GA in REST `2026-10-01`), so queries
   are trimmed to what the caller may read. Each indexed source is also a Foundry IQ knowledge source of the
   agentic knowledge base (Phase 2), and systems that keep their own search and permissions (SharePoint, the web,
   an MCP server) are added as *remote* knowledge sources at query time instead of being copied.

The GitHub Actions sync stays as the blog's path until Phase 10 step 4 replaces it with the blog's Data Factory
pipeline; both write the same canonical document, so the index doesn't change.

#### Considered options

- **Microsoft Fabric (Data Factory pipelines, OneLake, notebooks)**: the strongest choice where an organisation
  already has a Fabric capacity: OneLake is a first-class Foundry IQ knowledge source and Fabric brings governance
  and sharing. Rejected for this lab because Fabric bills a capacity (an F SKU) by the hour, the lab's budget is 100
  a month (ADR 0008 removes even Search between sessions), and Data Factory is billed per activity run with no idle
  cost. The registry, zones and canonical schema carry over unchanged if the lab moves to Fabric later.
- **Search knowledge sources only (blob, SharePoint, OneLake generate their own indexer pipelines)**: the least
  code, but each source gets its own generated index with fixed object names, there is no raw zone, no canonical
  schema and no custom extraction or quality gates. Kept for remote sources, not for owned content.
- **Our own chunking and embedding in the Functions (push model)**: full control and portable vectors for other
  stores; it drops the managed indexing ADR 0010 chose to compare across clouds. Used only to produce the
  benchmark export in ADR 0017, not for the primary index.
- **Event-driven only (Event Grid to Functions, no Data Factory)**: cheaper for push sources, but no connectors for
  pull sources (SharePoint, SQL, REST), no run history, retries or backfill windows. Event Grid is still used inside
  the processing layer.
- **Databricks or Synapse Spark for processing**: built for large tabular transforms; document extraction at this
  scale needs neither a cluster nor its idle cost.

#### Consequences

- New resources (infra-azure, Phase 10 step 1): an ADLS Gen2 account with `raw`, `curated` and `quarantine`, a Data
  Factory, a Function app on Flex Consumption with its own identity, Event Grid on the lake, Key Vault, and a
  Document Intelligence account when the first PDF or Office source arrives. Platform-as-code has storage (with
  hierarchical namespace), Functions, Event Grid and Key Vault modules; **Data Factory needs a new module**.
- Idle cost stays near zero: Data Factory and Functions are consumption-billed, the lake is a few GB. Search stays
  the only hourly resource.
- Each source's owner, classification and permission model are explicit before it is ingested; a non-public source
  can't be added without a permission model, so the "public posts only" rule (ADR 0002) becomes a registry check
  instead of a convention.
- More moving parts to operate: Phase 10 includes run monitoring (Data Factory diagnostics to Log Analytics),
  reconciliation counts per source and a replay runbook.
- Search permission filtering needs callers' delegated Entra tokens; the API passes the signed-in user's token
  (Phase 1 step 5 adds Entra sign-in) in `x-ms-query-source-authorization`.

## ADR-0017: Retrieval speed: AI Search stays the vector store; measure per stage, cache semantically, compress vectors, benchmark alternatives
{: #adr-0017 }

<span class="adr-status adr-status-proposed">Proposed</span> <span class="adr-meta text-muted">2026-11-23 · `rag-on-cloud`, `infra-azure`, `platform-as-code`</span>

#### Context

The owner asked whether a vector database would speed up retrieval (2026-11-23). Azure AI Search already is one:
its vector fields use an HNSW graph, and it adds what a bare vector store lacks for RAG: hybrid keyword plus
vector search, the semantic reranker, integrated vectorization from indexers, document-level permission filters,
and Foundry IQ knowledge bases for agentic retrieval. So the question is really which part of an answer is slow and
which change makes it faster.

A RAG answer has five stages: embed the question, retrieve (vector and keyword), rerank, generate, and stream. On
an index of a few thousand chunks, retrieval is normally tens of milliseconds and reranking about a hundred or two;
generating the answer takes seconds. Moving the vectors to another store would speed up the smallest stage. That has
to be shown with measurements, not assumed, and the starting targets (p95 under 4 s standard, 15 s agentic) are
end-to-end.

#### Decision

1. **Measure each stage first.** The API records a span per stage (embed, retrieve, rerank, generate, first
   token) to Application Insights, and the eval harness reports p50 and p95 per stage and mode. Every change below
   must move a measured number.
2. **Keep Azure AI Search as the primary retrieval store**, and tune it before replacing it:
   - binary or scalar quantization with rescoring, and MRL truncation of `text-embedding-3-small` vectors
     (smaller index, faster vector queries, quality checked on the golden set);
   - hybrid search with the semantic reranker only where the golden set shows it pays for its latency;
   - filters on `source_id` and dates, a tuned `top_k`, and replicas when query volume needs them.
3. **Semantic cache in Azure Managed Redis (RediSearch module)**: before retrieval, look up the question's
   embedding among recent questions; above a similarity threshold, return the cached answer and citations.
   Partitioned by index version, prompt version and the caller's permission scope, with a TTL, so a cached answer
   never crosses permissions or survives a reindex. This removes retrieval and generation entirely for repeat
   questions: the largest saving available. The same instance holds agent conversation memory later.
4. **Stream tokens to the client** (time to first token is what a user feels).
5. **Benchmark the alternatives on the same data, as evidence**: export the curated corpus's chunks and vectors
   once (`gold/` zone, ADR 0016) and load them into Azure Cosmos DB for NoSQL (DiskANN vector index, BM25 and
   hybrid with RRF, serverless) and Azure Database for PostgreSQL (pgvector with DiskANN). Run the golden set's
   retrieval through each: hit@5, MRR, p50/p95 retrieval latency, cost per thousand queries, and idle cost. Record
   the result as an ADR update; switch only if a store beats AI Search on the measured stage without losing
   relevance or permission trimming.

#### Considered options

- **Move the vectors to a dedicated vector database now**: optimises the fastest stage, loses the semantic reranker,
  indexers and permission filters (each would be rebuilt by hand), and adds a second copy to keep in sync.
- **Cosmos DB for NoSQL as the primary store**: a good fit when the application's operational data already lives
  there (vectors beside the data, serverless, DiskANN); here the data is documents, so it's a benchmark candidate.
- **PostgreSQL with pgvector**: a good fit for relational data with a few vector columns; same reasoning.
- **Azure Managed Redis as the primary store**: very fast, but memory-priced and weak on relevance features; used for
  the cache, where its speed matters most.
- **Bigger Search tier now**: S1 adds partitions and memory; not needed at this corpus size. Revisit when the index
  or query rate grows.

#### Consequences

- New resources, created only for the sessions that need them (like Search, ADR 0008): an Azure Managed Redis
  instance with RediSearch (it can't be added after creation), and for the benchmark only, a Cosmos DB serverless
  account and a PostgreSQL flexible server that is stopped between sessions. Platform-as-code has PostgreSQL;
  Cosmos DB and Managed Redis need new modules.
- Redis has a fixed hourly price; with Search Basic the lab's budget (100 a month) holds only if both are removed
  between sessions. If the owner wants the cache always on, the budget needs to rise; that is an open question.
- The cache must be invalidated on every reindex and prompt change; the cache key includes both versions.
- The vector-store comparison becomes part of the public write-up, which is the useful part for readers: most
  "do I need a vector database" questions are answered by the per-stage latency table.

{% endraw %}
<!-- adr:end -->

{% include project-nav.html %}
