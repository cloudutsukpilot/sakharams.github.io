---
layout: post
title: "Cloudutsuk Platform: Product Planning"
date: 2026-10-10 00:03:00 +0530
categories: [projects, cloudutsuk-platform]
tags: [Projects, Cloudutsuk Platform, Planning, Roadmap]
description: "Seven phases for the Cloudutsuk Platform, each ending usable: foundation, GitOps and CI/CD, monitoring, portal and labs, cost, local LLM and RAG, alert agent."
project: cloudutsuk-platform
project_step: 3
image:
  path: /assets/img/projects/cloudutsuk-platform/03-product-planning.webp
  alt: "Cloudutsuk Platform: Product Planning - Projects hero image"
---

The trap with a platform like this is building the fun part first: the chatbot, the agent. Without SSO,
GitOps and monitoring underneath, they'd be demos I'd have to rebuild. So the plan goes bottom up, and
every phase ends with something I actually use. The other rule is that this playbook gets updated at the
end of every phase, so the blog never describes a platform that doesn't exist.

> **Living playbook.** Phase status is tracked below and on the
> [project index](/tags/cloudutsuk-platform/). Areas that need facts from the build (security,
> infrastructure, CI/CD, operations and the rest) are added as their phase completes.
{: .prompt-info }

<!-- more -->

{% include project-nav.html %}

## Product roadmap
{: #product-roadmap }

| Phase | Delivers | Depends on | Status |
|---|---|---|---|
| 0. Foundation | This playbook, animated diagrams (design gate), ADRs 0001–0035, 3 new repos, `core` cluster (Keycloak, OpenBao, PowerDNS, Zot registry), `mon`, `platform` and `ai` clusters, External Secrets everywhere, internal DNS and TLS, GPU spike, DNS on Cloudflare, tunnel + Access, boot unit, heartbeat, backup bucket | none | In progress |
| 1. GitOps + CI/CD | Central Argo CD, `homelab-gitops` app-of-apps, ARC runners, BuildKit, the Zot registry in `core`, reusable build workflow with security gates (Gitleaks, Semgrep, Trivy, Checkov, Hadolint, SBOM, Cosign), Kyverno, PostSync smoke tests | 0 | Not started |
| 3a. Quality baseline | Playwright journeys, Schemathesis on every service, nightly OWASP ZAP, Locust load scenarios, Performance and Security dashboards, first performance baseline | 3 | Not started |
| 2. Central monitoring | `mon` with LGTM and Alertmanager; host exporters (node, GPU, Docker, blackbox); a monitoring pack on every cluster (OTel collectors, kube-state-metrics, ServiceMonitors); ready-made dashboards and mixin alerts; labs moved onto it | 1 | Not started |
| 3. Portal + labs | Backstage custom image through CI, SSO, Labs plugin, lab runner, `deploy:` blocks, Dashboard tab on the blog | 1, 2 | Not started |
| 4. Inventory + cost | Four collectors, `lab` tag, AWS cost allocation tags, Inventory & Cost plugin, budget alerts | 3 | Not started |
| 5. Local LLM + RAG + chat | `ai` cluster: vLLM chat and embeddings behind a LiteLLM gateway; Qdrant, Redis cache, rag-ingest, rag-api, Chat plugin | 3 | Not started |
| 6. Alert agent | sre-agent webhook, multi-cluster access, RAG and `mon` tools, eval suite from lab experiments | 2, 5 | Not started |

**Phase 0 progress:**
- [x] Playbook areas 1, 2, 3 and 5 written, with the system, network and commit-to-deploy diagrams and the data model (2026-10-10)
- [x] `infra-local`, `homelab-gitops` and `homelab-services` created through `infra-github` (2026-10-11)
- [x] Repo starter files and ADRs 0001–0035 written in `homelab-gitops` (2026-10-11)
- [x] ADRs synced to the blog, with a log table and an index tile (2026-10-11)
- [x] `homelab` network (172.30.0.0/24) and the empty `core` cluster created from `infra-local`, with a Headlamp and Popeye "doctor" for every cluster (2026-10-11)
- [ ] OpenBao, PowerDNS, Zot and Keycloak in `core`; `mon`, `platform` and `ai` clusters up
- [x] GPU-in-k3d test: vLLM runs inside k3d, two models share the GPU by time-slicing (2026-10-11)
- [x] DNS moved from GoDaddy to Cloudflare; every record checked, the blog unaffected (2026-10-11)
- [ ] Cloudflare Tunnel and Access
- [ ] Boot unit, heartbeat and backup bucket

## MVP definition
{: #mvp-definition }

The MVP is **phases 0 to 3**. At that point I can:
- sign in from anywhere with SSO
- see every lab
- deploy or destroy one with a click
- watch it in one Grafana
- ship changes to the platform itself through CI and Argo CD

Cost, chat and the agent are valuable, but they're layers on top. The MVP is also the point where this
playbook gains its Security, Infrastructure, CI/CD and Operations posts, because by then there's
something real to describe.

## Release milestones
{: #release-milestones }

Each phase ends with the same exit steps:
1. Its verification passes.
2. New decisions are written as ADRs and synced to the blog.
3. The playbook posts are updated, and the card's status moves on (Planning, then In progress, then Live).

| Milestone | Exit check |
|---|---|
| M0 Design approved | The three animated diagrams are approved; `nvidia-smi` works in a test pod (or the plain-container fallback is accepted); cloudutsuk.com still serves after the DNS move |
| M1 Commit to deploy | A commit to a hello-world service ends with an Argo CD app Synced and Healthy on the new SHA |
| M2 One Grafana | A lab's signals appear in `mon` without changing the lab; killing a pod fires an alert |
| M3 MVP | Deploy and Destroy from the portal create and delete a cluster and register it in Argo CD |
| M4 Cost | Portal cost matches each provider's console within a day; a `lab`-tagged resource rolls up under its lab |
| M5 Chat | A new post is cited after "Re-index now"; the same question again hits the cache |
| M6 Agent | An injected lab fault produces an RCA in Slack that cites the right doc; evals pass |

> **TODO:** Target dates per milestone. Dates aren't set yet; add them once phase 0 shows how fast the
> work goes.
{: .prompt-warning }

## Backlog structure
{: #backlog-structure }

Epics map one to one to phases, and each epic lives in the repo that does most of the work:

| Epic | Main repo | Example stories |
|---|---|---|
| Foundation | `infra-local`, `infra-github` | Create repos; k3d clusters via `k3d_config_cluster`; GPU spike |
| GitOps + CI/CD | `homelab-gitops` | App-of-apps; ARC runner scale set; image tag write-back |
| Monitoring | `homelab-gitops` | LGTM values; ApplicationSet for lab collectors; Watchdog heartbeat |
| Portal + labs | `self-service-portal`, `homelab-services` | Auth providers; Labs plugin; lab-runner lock and admission control |
| Inventory + cost | `homelab-services` | Azure collector; AWS collector; GCP billing export; DGX power estimate |
| RAG + chat | `homelab-services` | Incremental ingest; semantic cache; Chat plugin with citations |
| Alert agent | `sre-agent` | Alertmanager webhook; RAG tool; eval cases from lab experiments |
| Playbook | this blog | Area posts per phase; ADR sync; diagrams |

Issues live on GitHub in each repo, labelled by epic.

## Prioritization approach
{: #prioritization-approach }

Dependencies come first, then whatever removes the most risk. That's why phase 0 includes a GPU-in-k3d
spike before anything is built on top of it. If vLLM can't see the GB10 inside k3d, ADR 0010 switches to
running it as a plain container on the shared Docker network. Better to learn that in week one than in
phase 5. Inside a phase, I pick the story that makes the phase's exit check pass soonest, and polish
waits.

## Budget and resource planning
{: #budget-and-resource-planning }

| Item | Cost |
|---|---|
| Platform hosting (DGX, Cloudflare free plan, GitHub free self-hosted runner minutes) | $0 |
| Backups (Cloudflare R2 free tier, 10 GB) | $0 |
| Dead-man's switch (free heartbeat service) | $0 |
| AWS Cost Explorer API (about one call a day) | about $0.30 a month |
| GCP billing export to BigQuery | Inside the free tier, expected |
| Cloud labs | Only while deployed, capped by the TTL |
| Electricity for the DGX | TODO |

The real constraint isn't money. It's memory on the DGX (see
[Scalability](/posts/projects/cloudutsuk-platform/05-technical-architecture/#scalability-and-performance-strategy))
and my evenings.

> **TODO:** What's the electricity tariff per kWh? It's needed for the DGX's own line in the cost
> dashboard.
{: .prompt-warning }

## Risk and dependency management
{: #risk-and-dependency-management }

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| GPU not usable inside k3d on arm64 | Closed 2026-10-11 | | The test passed: vLLM runs inside k3d on the GB10 |
| Some images have no arm64 build | Medium | Delays | Check every chart's images in phase 0; build our own where needed |
| DNS move breaks the blog | Low | The blog goes offline | DNS-only records for GitHub Pages; check `curl -I` before and after |
| Memory exhaustion | Medium | Monitoring or the portal starves | Budget table, limits, PriorityClasses, lab admission control |
| Self-hosted runners abused | Low | Code execution on the DGX | Private repos only; ephemeral runners |
| Prompt injection through logs reaches the agent | Medium | A bad change proposed | Read-only RBAC; approval for every change; fixes as PRs |
| Scope creep | High | Nothing ships | MVP is phases 0–3; new ideas go to the backlog via change control |

## Change-control process
{: #change-control-process }

There's one decider, so this stays light:

1. **A change that alters a decision** gets a new ADR in `homelab-gitops` that supersedes the old one, in
   the same PR as the code.
2. **A new feature** becomes a backlog issue tagged with its phase. It doesn't join the current phase
   unless it unblocks the exit check.
3. **A change to the diagrams** is made in the same change as its ADR, so the blog never shows the old
   design.
4. **At the end of each phase**, the playbook is updated, and that's the point where changes become
   public.

## Checklist
{: #checklist }

- [ ] Phase 0 exit check passed and status moved in this table
- [ ] Milestone dates added once phase 0 is done
- [ ] Electricity tariff recorded
- [ ] Epics created as GitHub issues in each repo
- [x] GPU spike result written into ADR 0010
- [ ] arm64 image check done for every planned chart
- [ ] This post and the project card status updated at the end of every phase

{% include project-nav.html %}
