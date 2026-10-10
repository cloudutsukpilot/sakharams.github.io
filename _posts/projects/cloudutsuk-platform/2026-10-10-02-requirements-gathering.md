---
layout: post
title: "Cloudutsuk Platform: Requirements Gathering"
date: 2026-10-10 00:02:00 +0530
categories: [projects, cloudutsuk-platform]
tags: [Projects, Cloudutsuk Platform, Requirements]
description: "What the Cloudutsuk Platform must do (inventory, cost, labs, monitoring, chat, alert agent) and how well it must do it on a single DGX Spark."
project: cloudutsuk-platform
project_step: 2
image:
  path: /assets/img/projects/cloudutsuk-platform/02-requirements-gathering.webp
  alt: "Cloudutsuk Platform: Requirements Gathering - Projects hero image"
---

The requirements for this platform came from one long message, and the hard part wasn't collecting them.
It was noticing which ones pull against each other. "Public with SSO" and "no hosting cost" meet in
Cloudflare's free plan. "Run a local LLM" and "run several lab clusters" compete for the same 121 GB of
memory. Those tensions shaped the non-functional requirements more than any feature did.

> **Living playbook.** These requirements are the planning baseline. Changes go through the
> [change-control process](/posts/projects/cloudutsuk-platform/03-product-planning/#change-control-process)
> and this post is updated at the end of each phase.
{: .prompt-info }

<!-- more -->

{% include project-nav.html %}

## Functional requirements
{: #functional-requirements }

| ID | Requirement |
|---|---|
| F1 | Sign in with Google or Entra ID; only allowlisted accounts get in |
| F2 | List every resource on the DGX (k3d clusters, containers, GPU use), in Azure, AWS and GCP |
| F3 | Show cost per resource, grouped by lab, repo and environment, with a "last synced" time |
| F4 | Refresh inventory and cost every 6 hours, plus a manual "Sync now" |
| F5 | List every lab from the blog's lab cards, with status, links and estimated cost |
| F6 | Deploy or destroy a lab with one click, with streamed logs; cloud labs ask for confirmation |
| F7 | Every lab cluster sends traces, metrics and logs to one central monitoring cluster |
| F8 | Dashboards and alert rules in that monitoring cluster cover every cluster |
| F9 | A chatbot answers questions about my setup from the repos and live data, with citations |
| F10 | The knowledge base re-indexes every 6 hours, plus a manual "Re-index now" |
| F11 | Answers to repeated questions come from a semantic cache |
| F12 | The chatbot runs on a local model served on the DGX |
| F13 | An alert triggers an agent that investigates with the LLM and the knowledge base and posts an RCA |
| F14 | Any change the agent proposes needs my approval and goes through GitOps |
| F15 | A commit to a platform repo builds an image locally and Argo CD deploys it |
| F16 | Architecture decisions are recorded as ADRs and published on the blog |

## Non-functional requirements
{: #non-functional-requirements }

The platform runs on one machine, so these requirements aim at recovery and visibility rather than
redundancy. The reasoning is in
[Resilience and disaster recovery](/posts/projects/cloudutsuk-platform/05-technical-architecture/#resilience-and-disaster-recovery).

| Attribute | Requirement |
|---|---|
| Cost | $0 a month to host the platform; cloud labs have a TTL (default 4 hours) |
| Availability | Portal 99% monthly (proposed); I'm alerted from outside the DGX when it's down |
| Recovery | RTO 1 hour, RPO 24 hours; clusters restart on their own after a reboot |
| Capacity | Fits in ~121 GB unified memory; a deploy that would exceed the budget is refused |
| Performance | Chat time to first token under 3 s at p95 (proposed); alert to RCA under 5 minutes |
| Security | Two SSO gates; read-only credentials for inventory and the agent; no inbound ports |
| Freshness | Inventory and knowledge at most 6 hours old, shown in the UI |
| Degradation | Stale data shows a badge instead of an error; chat works without the LLM in retrieval-only mode |
| Operability | Every platform component sends OTEL signals to the `mon` cluster |
| Maintainability | Everything rebuilds from git; chart and image updates come as PRs |

## User journeys and use cases
{: #user-journeys-and-use-cases }

**"What's costing me money?"** I open the portal on my phone. Cloudflare asks for my Google login, and
Backstage opens on the Inventory page. The cost view grouped by lab shows the Azure private endpoint lab
still running from yesterday. I click Destroy, confirm, and watch the logs stream until it's gone.

**"Try a lab from the blog."** I open the Labs tab and pick the OpenTelemetry lab. The tile shows it needs
about 4 GB and there's room. One click runs `make up`, and the lab runner registers the new cluster with
Argo CD. A minute later its traces show up in the central Grafana.

**"Where did I set that?"** I ask the chatbot which subnet the Azure dev VNet uses. It answers from the
`infra-azure` YAML and links the file.

**"Something broke at night."** A lab pod crash-loops and Alertmanager fires. The SRE agent reads the pod's
events and logs, finds the lab's runbook in the knowledge base and posts a root cause in Slack, with a
proposed fix waiting for my approval.

(These are target journeys, not things that have happened yet.)

## Acceptance criteria
{: #acceptance-criteria }

- **F1:** Given an account not on the allowlist, when it signs in, Cloudflare Access denies it, and so does
  Backstage if the edge policy is bypassed.
- **F3:** Given a resource tagged `lab=azure-private-endpoint-lab`, when costs sync, its cost appears under
  that lab within one sync cycle of the provider publishing it.
- **F6:** Given a lab is deploying, when Deploy is clicked again, the second request is refused (per-lab lock).
- **F6:** Given less free memory than the lab's declared size plus headroom, when Deploy is clicked, the
  deploy is refused with the reason shown.
- **F7:** Given a new lab cluster, when it's registered, its signals appear in `mon` without changing the
  lab's own code.
- **F10:** Given a new post is pushed, when "Re-index now" runs, the chatbot can cite it.
- **F13:** Given an injected fault from a lab experiment, an RCA citing the right lab doc is posted within
  5 minutes.
- **F14:** No change is made to any cluster without an approval record.

## Business rules
{: #business-rules }

- Cloud labs always show their estimated cost before deploy, and destroying one always needs a confirmation.
- A cloud lab past its TTL warns 30 minutes before, then is destroyed (with confirmation, or automatically if enabled).
- Only one deploy or destroy runs per lab at a time.
- The agent never writes to a cluster directly. Fixes become PRs to `homelab-gitops`.
- `_posts/private/` and `.env*` files are never indexed.
- Self-hosted CI runners only serve private repos.

## Reporting and analytics requirements
{: #reporting-and-analytics-requirements }

The reports I want are views over the inventory store and `mon`, not a separate BI tool:

- **Cost:** by cloud, by lab, by repo, by day, for the last 30 days, with a running month-to-date total.
- **Labs:** deploys, destroys, failures and average deploy time per lab.
- **Platform health:**
  - SLO burn rate
  - vLLM tokens per second
  - semantic cache hit rate
  - ingest lag (newest commit not yet indexed)
  - sync failures per provider
- **Agent:** alerts received, RCAs posted, approvals given or rejected.
- **RAG pipeline:** a trace per question in Arize Phoenix (cache hit or miss, retrieved chunks and scores, prompt, tokens, latency per step), an embeddings map, and retrieval-relevance and hallucination evals.

## Accessibility and localization requirements
{: #accessibility-and-localization-requirements }

There's one user and one language, so localization is out of scope. Accessibility still matters a little:
Backstage's Material UI components are keyboard navigable, and custom plugins should keep that. The
animated diagrams on this blog already have a text fallback for readers without JavaScript.

## Regulatory, legal, and compliance requirements
{: #regulatory-legal-and-compliance-requirements }

There's no regulated data here, so no formal compliance regime applies. Two rules come close:

- **Public repo hygiene.** This blog's repo is public. Subscription and tenant IDs, Cloudflare account and
  tunnel IDs, email allowlists and private repo URLs stay out of it.
- **Provider terms.** Cloud APIs are used with read-only roles, and the local model is used under its
  licence.

> **TODO:** Which model licence applies once the model is chosen (for example Apache 2.0 for gpt-oss or
> Qwen3)? Record it in ADR 0010.
{: .prompt-warning }

## Prioritization and release scope
{: #prioritization-and-release-scope }

The order follows dependencies, not wish-list priority:

1. **Must first:** F1 (SSO), F15 (CI/CD and GitOps) and F16 (ADRs). Everything else ships through them.
2. **Then:** F7 and F8 (central monitoring), so every later piece is observable from day one.
3. **Then:** F5 and F6 (labs), then F2 to F4 (inventory and cost).
4. **Then:** F9 to F12 (local LLM, RAG, chat).
5. **Last:** F13 and F14 (the alert agent), because it needs monitoring, RAG and the LLM.

The phases are in
[Product Planning](/posts/projects/cloudutsuk-platform/03-product-planning/#release-milestones).

## Checklist
{: #checklist }

- [ ] F1–F16 reviewed and each mapped to a phase
- [ ] Proposed NFR targets (99% portal, 3 s first token, 5 min RCA) confirmed or replaced
- [ ] Every lab card has a `deploy:` block with its memory size
- [ ] TTL default for cloud labs agreed
- [ ] Acceptance criteria turned into tests as each phase is built
- [ ] Model licence recorded in ADR 0010
- [ ] This post updated at the end of each phase

{% include project-nav.html %}
