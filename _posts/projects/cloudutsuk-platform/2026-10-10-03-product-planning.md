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
| 0. Foundation | This playbook, animated diagrams (design gate), ADRs (0001 onward), 3 new repos, `core` cluster (Keycloak, OpenBao, PowerDNS, Zot registry), `mon`, `platform` and `ai` clusters, External Secrets everywhere, internal DNS and TLS, GPU spike, DNS on Cloudflare, private remote access through Tailscale, boot unit, heartbeat, backup bucket | none | Done 2026-10-11 |
| 1. GitOps + CI/CD | Central Argo CD, `homelab-gitops` app-of-apps, ARC runners, BuildKit, the Zot registry in `core`, reusable build workflow with security gates (Gitleaks, Semgrep, Trivy, Checkov, Hadolint, SBOM, Cosign), Kyverno, PostSync smoke tests | 0 | In progress (Argo CD and Zot came early, in Phase 0) |
| 1a. Multi-cluster management | Karmada trial, then the Karmada control plane in `platform` (installed by Argo CD), pull-mode agents on every cluster, the shared add-ons moved from ApplicationSets to Karmada propagation and override policies, lab runner registers and removes labs | 1 | Not started |
| 3a. Quality baseline | Playwright journeys, Schemathesis on every service, nightly OWASP ZAP, Locust load scenarios, Performance and Security dashboards, first performance baseline | 3 | Not started |
| 2. Central monitoring | `mon` with LGTM and Alertmanager; host exporters (node, GPU, Docker, blackbox); a monitoring pack on every cluster (OTel collectors, kube-state-metrics, ServiceMonitors); ready-made dashboards and mixin alerts; labs moved onto it | 1 | Not started |
| 2a. Chaos engineering | Open-source LitmusChaos: ChaosCenter and its MongoDB in `core`, chaos agents on target clusters by an ApplicationSet (labs first), the experiment library in `homelab-gitops`, a Chaos dashboard in Grafana, first game day | 1, 2 | Not started |
| 3. Portal + labs | Backstage custom image through CI, SSO, Labs plugin, lab runner, `deploy:` blocks, Dashboard tab on the blog | 1, 2 | Not started |
| 4. Inventory + cost | Four collectors, `lab` tag, AWS cost allocation tags, OpenCost on every k3d cluster with custom DGX prices, Inventory & Cost plugin, budget alerts | 2, 3 | Not started |
| 5. Local LLM + RAG + chat | `ai` cluster: vLLM chat and embeddings behind a LiteLLM gateway; KEDA scaling on-demand models to zero when idle; Qdrant, Redis cache, rag-ingest, rag-api, Chat plugin | 3 | Not started |
| 6. Alert agent | sre-agent webhook, multi-cluster access, RAG and `mon` tools, eval suite from lab experiments (faults injected with LitmusChaos) | 2, 2a, 5 | Not started |

### Phase steps
{: #phase-steps }

These tables are the source of truth for the build. A step is added to its phase **before** any work on
it starts, and its status changes in the same change as the work. Step numbers are never reused or
renumbered (a step slotted in later gets a letter, such as `9a`); lessons, ADRs and commits refer to
them as "Phase N, step M". Phases 1 to 6 are broken down from the plan. Their steps will be refined
as each phase starts, but the numbers stay.

### Phase 0 steps
{: #phase-0-steps }

Before step 1: playbook areas 1, 2, 3 and 5 were written with the system, network and commit-to-deploy
diagrams and the data model (2026-10-10), and `infra-local`, `homelab-gitops` and `homelab-services`
were created through `infra-github` (2026-10-11).

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | Repo skeletons (READMEs, pre-commit, layouts) and ADRs 0001–0035 | `infra-local`, `homelab-gitops`, `homelab-services` | Files are in place and the ADR front-matter check passes | Done (2026-10-11) |
| 2 | ADRs on the blog: sync script, ADR post, log table, index tile | this blog | The ADR post renders, htmlproofer passes, the sync `--check` is clean | Done (2026-10-11) |
| 3 | DGX prerequisites: k3d, Helm, Argo CD CLI, OpenBao CLI, age, SOPS, cloudflared; host folders; overlapping containers stopped | `infra-local` | Every tool prints its version; free memory matches the budget (moved to mid-range, ADR 0010) | Done (2026-10-11) |
| 4 | GPU-in-k3d spike: k3s image with the NVIDIA toolkit, device plugin with time-slicing, vLLM chat and embeddings side by side | `infra-local` | ADR 0010 is accepted | Done (2026-10-11) |
| 5 | Move DNS from GoDaddy to Cloudflare: export every record, change nameservers, compare | Cloudflare | `curl -I https://cloudutsuk.com` is 200 and every record matches | Done (2026-10-11) |
| 6 | `homelab` network (172.30.0.0/24) and the `core` cluster through the new `docker_network` and `k3d_config_cluster` units; Headlamp and Popeye "doctor" | `infra-local`, shared Terragrunt module | `k3d cluster list` shows `core` and its load balancer publishes on 172.30.0.1 | Done (2026-10-11) |
| 6a | Doctor link inventory: one page listing every cluster's Ingress, IngressRoute and HTTPRoute URLs and published ports, each checked once, regenerated with `run.sh refresh` | `infra-local` | The page lists every route in every k3d cluster as a clickable link with its status | Done (2026-10-11) |
| 7 | OpenBao in `core`: Helm release, init, unseal from a root-only key file, KV v2, offline key copy | `infra-local` | `bao status` is unsealed after a cluster restart | Done (2026-10-11) |
| 8 | cert-manager (Let's Encrypt through Cloudflare DNS-01), PowerDNS, ExternalDNS, split DNS on the DGX | `infra-local` | `bao.core.home.cloudutsuk.com` resolves on the host and in a pod and serves a valid certificate | Done (2026-10-11) |
| 9 | External Secrets in `core` and the ClusterSecretStore pattern | `infra-local` | An ExternalSecret reports `SecretSynced` | Done (2026-10-11) |
| 10 | Zot registry in `core`: HTTPS, anonymous pull-through mirror, push and pull accounts, retention | `infra-local` | A node pulls a public image through the mirror; a pushed test image pulls with the pull account | Done (2026-10-11) |
| 11 | Keycloak in `core`: Google and Entra as identity brokers, realm, groups, one client per UI and per service | `infra-local` | Login works with both brokers | Done 2026-10-11 (Keycloak, realm, groups and the Entra broker; I signed in with Entra to `kubectl` on `mon` and to OpenBao; deferred: Google, `core`'s own OIDC until its next rebuild, one client per app as each arrives, revoking OpenBao's root token) |
| 12 | `mon`, `platform` and `ai` clusters, each with External Secrets, its OpenBao Kubernetes-auth mount, CoreDNS forwarding and k3s OIDC flags | `infra-local` | Each cluster syncs an ExternalSecret; a lab-scoped store can't read `platform/*` | Done 2026-10-11 (`mon`, `platform`, and `ai` on the GPU image with 4 time-sliced GPUs; each syncs its own secrets and is refused the others', pulls through Zot, trusts Keycloak) |
| 13 | Argo CD in `platform`: repo credentials from OpenBao, every cluster registered, app-of-apps from `homelab-gitops`, ApplicationSets for External Secrets, ExternalDNS and cert-manager | `infra-local`, `homelab-gitops` | Every app is Synced and Healthy | Done 2026-10-11 (Argo CD in `platform` with Keycloak sign-in; `mon` and `ai` registered from OpenBao; the app-of-apps on `main` installs cert-manager, ExternalDNS and their settings on `platform`, `mon` and `ai`: 11 apps Synced and Healthy) |
| 14 | Private remote access through Tailscale (ADR 0037): the DGX as a subnet router for the `homelab` bridge, split DNS for `home.cloudutsuk.com`, an access policy for my devices only. Replaces the Cloudflare tunnel and Access, whose Zero Trust team asks for a payment method | `infra-local`, Tailscale | From my phone on mobile data, an internal UI loads with a valid certificate after a Keycloak sign-in; `kubectl` works from my laptop; another Tailscale user can't reach the bridge | Done 2026-10-11 (my phone on mobile data reaches the internal UIs with valid certificates; deferred until the laptop is back: `kubectl` from it, and the other-user denial test) |
| 15 | Resilience basics: boot unit (start `core`, unseal, start the rest, re-apply the k3d host aliases that Docker drops on restart), heartbeat, and nightly backups with Velero (ADR 0039): database and OpenBao dumps taken by pre-backup hooks, encrypted by Velero's file-system backup and kept in an Azure Blob container. R2 is out because it asks for a payment method | `infra-local`, `infra-azure` | A reboot brings everything back unsealed; a missed heartbeat alerts; a nightly backup succeeds in every cluster and last night's `core` dumps restore into a throwaway cluster | Done 2026-10-11 (boot unit installed and run; heartbeat pinging healthchecks.io; Velero in `core`, `platform` and `ai`, first backups complete, a web UI over them; deferred: the reboot test and the first restore test) |
| 16 | Phase 0 exit: verification list, roadmap ticked, playbook updated (areas 11 and 13 scaffolded), card moved to In progress | this blog | M0's exit check passes | Done 2026-10-11 (verification list run; card moved to In progress) |

### Phase 1 steps
{: #phase-1-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | ARC in `platform` through Argo CD: the scale-set controller (chart 0.14.2) and two runner scale sets. `homelab` is registered with the org (private repos only, ephemeral pods, no host access). `homelab-iac` is registered with `infra-local` alone and gets Docker and cluster access for its IaC jobs (ADR 0040) | `homelab-gitops`, `infra-local` | A workflow job runs on each scale set, including one of `infra-local`'s queued IaC jobs | In progress (2026-10-11: controller and both scale sets Synced and Healthy in Argo CD and registered with GitHub; old `infra-local` plan jobs already ran on `homelab` (lesson L034); `homelab-iac` waits for step 1b) |
| 1a | GitHub App for ARC (repo Administration read/write, Metadata read, org Self-hosted runners read/write), installed on the org; its ID, installation ID and private key in OpenBao at `platform/ci` | GitHub, `infra-local` | The ExternalSecret in `arc-runners` reports `SecretSynced` and both scale sets show as online runners in GitHub | Done (2026-10-11: `cloudutsuk-arc-runners`, created through the manifest flow with `infra-local/host/github/create-app.py`, installed on the org; the ExternalSecret is `SecretSynced`) |
| 1b | Docker and cluster access for `homelab-iac`, plus the IaC jobs' own secrets: Azure login for the state backend and the shared-module read token; `config.yaml` runner set to `homelab-iac` | `infra-local` | A plan job for a k3d stack finishes on `homelab-iac` | Not started |
| 1c | OpenBao JWT auth for GitHub OIDC: a push role bound to `main` and a read-only role for pull requests (ADR 0019, ADR 0034) | `infra-local` | A `main` job logs in and gets the Zot push credentials; a PR job is refused them | Not started |
| 2 | BuildKit and the reusable build workflow: build, push to Zot, commit the new digest to `homelab-gitops` | `homelab-gitops`, `homelab-services` | A workflow run pushes an image and opens the digest commit | Not started |
| 2a | Write access for the digest commit: a second GitHub App limited to Contents read/write on `homelab-gitops`, its key in OpenBao | GitHub, `infra-local` | A workflow job mints a short-lived token and pushes a commit to `homelab-gitops` | Not started |
| 3 | Hello-world service through the whole path | `homelab-services`, `homelab-gitops` | A commit ends with an Argo CD app Synced and Healthy on the new SHA | Not started |
| 4 | Security gates in the reusable workflow: Gitleaks, Semgrep, Bandit, Trivy, Checkov, Conftest, Hadolint, Syft SBOM, Cosign signing | `homelab-gitops`, `homelab-services` | The hello-world service passes every gate and its image is signed | Not started |
| 4a | Cosign key in OpenBao's transit engine and a signing policy only `main` builds can use (ADR 0033) | `infra-local` | `cosign sign` with the transit key works from a `main` job and fails from a PR job | Not started |
| 5 | Kyverno in every cluster through an ApplicationSet | `homelab-gitops` | Kyverno is Healthy everywhere and the hello-world app passes its policies | Not started |
| 6 | PostSync smoke-test pattern | `homelab-gitops` | The hello-world PostSync test runs, and a failing test fails the sync | Not started |
| 7 | Phase 1 exit: ADRs synced, CI/CD area written with the commit-to-deploy diagram and the testing and security matrix, roadmap ticked | this blog | M1's exit check passes | Not started |

### Phase 2 steps
{: #phase-2-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | `mon` workloads through Argo CD: LGTM, gateway collector, Alertmanager | `homelab-gitops` | Grafana on `mon` serves a valid certificate and its data sources are healthy | Not started |
| 2 | Host exporters: node-exporter, DCGM, cAdvisor, blackbox | `infra-local` | Every exporter target is up in `mon` | Not started |
| 3 | Monitoring-pack ApplicationSet for every cluster, labs included: OTel Operator, collectors, kube-state-metrics, ServiceMonitor CRDs | `homelab-gitops` | The kubernetes-mixin dashboards show every cluster in the cluster drop-down | Not started |
| 4 | Fleet, Kubernetes and Platform dashboard folders and the mixin alert rules, as code (ADR 0027) | `homelab-gitops` | No "No data" panels for deployed components; fleet memory per cluster matches `docker stats`; killing a pod fires an alert | In progress (2026-10-11: kubernetes and node mixins vendored and pinned, rules checked with promtool; not applied until `mon` exists) |
| 4a | AI dashboard folder and alert rules, as code (ADR 0027): DCGM GPU, vLLM and LiteLLM dashboards vendored and pinned, GPU and vLLM alert rules | `homelab-gitops` | The AI folder shows data for the `ai` cluster's GPUs and models; a stopped vLLM pod fires an alert | In progress (2026-10-11: vendored and checked against vLLM 0.24 and dcgm-exporter 4.5.2 metric names; not applied until `mon` exists) |
| 5 | Lab contract v2: the lab cluster joins the `homelab` network, the lab card gets `deploy.memory_gb` and `deploy.ports`, OTLP goes to `mon` with no bundled LGTM; learning-lab skill updated | this blog | The contract is documented and new labs are created to it | Not started |
| 6 | Migrate the two existing labs to contract v2 and update their posts' setup steps | lab repos, this blog | `make up` on each lab gets the monitoring pack and its signals appear in `mon` | Not started |
| 7 | Phase 2 exit: ADRs synced, Operations and Observability area started with real dashboard screenshots, roadmap ticked | this blog | M2's exit check passes | Not started |

### Phase 3 steps
{: #phase-3-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | Backstage custom image built through CI and deployed by Argo CD | `self-service-portal`, `homelab-gitops` | A portal commit redeploys Backstage | Not started |
| 2 | Keycloak sign-in for the portal (needs Phase 0 step 11) | `self-service-portal` | Sign-in works through Keycloak with both brokers | Not started |
| 3 | Labs plugin (frontend and `labs-backend`) on the lab-runner API contract | `self-service-portal` | The Labs page lists every lab and drives the lab runner | In progress (built and tested end to end, not deployed, 2026-10-11) |
| 4 | Lab runner: deploy and destroy, admission control, TTL, Argo CD cluster registration, streamed logs | `homelab-services` | Deploy and Destroy from the portal create and delete the cluster and register and unregister it in Argo CD | In progress (built with tests, not installed, 2026-10-11) |
| 5 | `deploy:` blocks on the lab cards | this blog | Every deployable lab card has one and the lab runner reads it | Done (2026-10-11: both lab cards have one and the runner's card loader accepts them; the learning-lab skill scaffolds and checks it) |
| 6 | Argo CD plugin in the portal | `self-service-portal` | Each app's sync and health status shows in the portal | Not started |
| 7 | Dashboard tab on the blog | this blog | TODO: decide what the tab shows | Not started |
| 8 | Lab-deploy sequence and portal user-journey diagrams | this blog | Both are drawn and in the Diagrams lane | Not started |
| 9 | Phase 3 exit (MVP): ADRs synced, Security, Infrastructure, CI/CD and Operations areas brought up to date, roadmap ticked | this blog | M3's exit check passes | Not started |

### Phase 3a steps
{: #phase-3a-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | Playwright journeys for the portal | `self-service-portal` | The journeys run in CI and pass | Not started |
| 2 | Schemathesis on every service | `homelab-services` | Every service's PR gate runs it against its OpenAPI spec | Not started |
| 3 | Nightly OWASP ZAP scan | `homelab-gitops` | The nightly scan runs and its findings reach the Security dashboards | Not started |
| 4 | Locust load scenarios and the first performance baseline | `homelab-services` | The baseline is recorded and SLO targets are set from it (ADR 0020 accepted) | Not started |
| 5 | Performance and Security dashboard folders | `homelab-gitops` | Both folders are provisioned in `mon` with data | Not started |
| 6 | Phase 3a exit: QA area written, roadmap ticked | this blog | Every step above is done | Not started |

### Phase 4 steps
{: #phase-4-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | Azure, AWS and GCP collectors (GCP through the billing export), every 6 hours plus "Sync now" | `homelab-services` | Each provider's resources and cost land in the inventory database | Not started |
| 2 | DGX collector with a power-based cost estimate | `homelab-services` | The DGX has its own cost line (needs the electricity tariff) | Not started |
| 3 | `lab` tag convention and AWS cost allocation tag activation | cloud IaC repos | A `lab`-tagged resource is attributed to its lab | Not started |
| 4 | Inventory & Cost plugin in the portal | `self-service-portal` | Portal cost matches each provider's console within a day; Sync now refreshes the data | Not started |
| 5 | Budget alerts | `homelab-gitops` | A budget threshold fires an alert (TODO: thresholds) | Not started |
| 6 | Phase 4 exit: ADRs synced, playbook updated, roadmap ticked | this blog | M4's exit check passes | Not started |

### Phase 5 steps
{: #phase-5-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | `ai` workloads: vLLM chat and embeddings behind the LiteLLM gateway; first chat model and its licence chosen in an ADR | `homelab-gitops` | The gateway answers an authenticated client and the model ADR is accepted | Not started |
| 2 | Qdrant and the Redis cache | `homelab-gitops` | Both are Healthy in `ai` | Not started |
| 3 | `rag-ingest`: incremental indexing every 6 hours plus "Re-index now" | `homelab-services` | Re-index now picks up a new post | Not started |
| 4 | `rag-api`: semantic cache, hybrid retrieval, citations | `homelab-services` | The same question asked twice hits the cache | Not started |
| 5 | Chat plugin with citations and "View trace" | `self-service-portal` | The chat cites the new post and "View trace" opens its trace | Not started |
| 6 | Arize Phoenix | `homelab-gitops` | Phoenix shows the full trace for a cache miss and a cache hit | Not started |
| 7 | Golden question set for RAG evals | `homelab-services` | An eval run scores every golden question | Not started |
| 8 | `rag-chat` data-flow diagram | this blog | It's drawn and in the Diagrams lane | Not started |
| 9 | Phase 5 exit: ADRs synced, playbook updated, roadmap ticked | this blog | M5's exit check passes | Not started |

### Phase 6 steps
{: #phase-6-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | Alertmanager webhook into the sre-agent | `sre-agent`, `homelab-gitops` | A firing alert reaches the agent | Not started |
| 2 | Read-only multi-cluster access with short-lived tokens | `sre-agent`, `homelab-gitops` | The agent's Kubernetes token expires after 15 minutes and it can't change anything | Not started |
| 3 | RAG and `mon` tools for the agent | `sre-agent` | An RCA cites the right lab doc and the metrics behind it | Not started |
| 4 | Eval suite built from lab experiments | `sre-agent` | The evals pass | Not started |
| 5 | Alert-agent incident diagram | this blog | It's drawn and in the Diagrams lane | Not started |
| 6 | Phase 6 exit: ADRs synced, playbook updated, card moved to Live | this blog | M6's exit check passes | Not started |

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
| M1a One placement | A new cluster labelled `lab` gets the shared add-ons from Karmada with no other change; Argo CD shows them Healthy through Karmada; removing the cluster removes them. If the trial fails, the ApplicationSets stay and this milestone is dropped |
| M2 One Grafana | A lab's signals appear in `mon` without changing the lab; killing a pod fires an alert |
| M2a Chaos | A pod-delete experiment from ChaosCenter in `core` runs on a lab, its probe passes, and the fault and its alert show side by side in Grafana; no experiment can target a node |
| M3 MVP | Deploy and Destroy from the portal create and delete a cluster and register it in Argo CD |
| M4 Cost | Portal cost matches each provider's console within a day; a `lab`-tagged resource rolls up under its lab; every k3d cluster's OpenCost reports, and a lab's DGX cost and cloud cost show together |
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
| GitOps + CI/CD | `homelab-gitops` | App-of-apps; ARC runner scale sets (`homelab` for builds, `homelab-iac` for `infra-local`); image tag write-back |
| Monitoring | `homelab-gitops` | LGTM values; ApplicationSet for lab collectors; Watchdog heartbeat |
| Multi-cluster management | `homelab-gitops`, `homelab-services` | Karmada trial; control plane values; propagation and override policies per add-on; lab runner `register` and `unregister` |
| Chaos engineering | `homelab-gitops` | ChaosCenter Helm values in `core`; agent ApplicationSet; experiment library with probes; game-day runbook |
| Portal + labs | `self-service-portal`, `homelab-services` | Auth providers; Labs plugin; lab-runner lock and admission control |
| Inventory + cost | `homelab-services`, `homelab-gitops` | Azure collector; AWS collector; GCP billing export; DGX power estimate; OpenCost in the monitoring pack with custom DGX prices; daily OpenCost allocation into `COST_DAILY` |
| RAG + chat | `homelab-services`, `homelab-gitops` | Incremental ingest; semantic cache; Chat plugin with citations; KEDA ScaledObject for each on-demand model |
| Alert agent | `sre-agent` | Alertmanager webhook; RAG tool; eval cases from lab experiments |
| Later (deferred) | a new lab repo, then `infra-local` | Cilium on k3d as a lab first; the long-lived clusters only if the lab passes ([why deferred](/posts/projects/cloudutsuk-platform/05-technical-architecture/#cilium-considered-deferred)) |
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
| Backups (Velero to an Azure Blob container, Cool tier, under 1 GB) | a few cents a month |
| Dead-man's switch (healthchecks.io free plan) | $0 |
| AWS Cost Explorer API (about one call a day) | about $0.30 a month |
| GCP billing export to BigQuery | Inside the free tier, expected |
| Cloud labs | Only while deployed, capped by the TTL |
| Electricity for the DGX | TODO |

The real constraint isn't money. It's memory on the DGX (see
[Scalability](/posts/projects/cloudutsuk-platform/05-technical-architecture/#scalability-and-performance-strategy))
and my evenings.

> **TODO:** What's the electricity tariff per kWh? It's needed for the DGX's own line in the cost
> dashboard, and for OpenCost's custom prices on every k3d cluster.
{: .prompt-warning }

## Risk and dependency management
{: #risk-and-dependency-management }

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| GPU not usable inside k3d on arm64 | Closed 2026-10-11 | | The test passed: vLLM runs inside k3d on the GB10 |
| Some images have no arm64 build | Medium | Delays | Check every chart's images in phase 0; build our own where needed |
| DNS move breaks the blog | Low | The blog goes offline | DNS-only records for GitHub Pages; check `curl -I` before and after |
| Memory exhaustion | Medium | Monitoring or the portal starves | Budget table, limits, PriorityClasses, lab admission control |
| A chaos experiment hits the whole DGX (node stress on k3d, a fault in `core`) | Low | Every cluster, and the desktop, at once | Pod-level faults only; annotation check; `core` only in a planned game day; ChaosCenter LAN-only and admins only |
| ChaosCenter adds memory and a MongoDB to `core` | Medium | `core` is less small and stable (ADR 0025) | Measure it in the spike; if it doesn't fit, ChaosCenter moves to `mon` and only the agents stay |
| Karmada duplicates what Argo CD already does and costs ~2.5 GB | Medium | Two tools to learn and debug for the same fan-out | Narrow role (shared add-ons only); a trial with an exit check; ApplicationSets stay as the fallback; first to go if memory is tight |
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

- [x] Phase 0 exit check passed and status moved in the roadmap table (2026-10-11)
- [ ] Milestone dates added once phase 0 is done
- [ ] Electricity tariff recorded
- [ ] Epics created as GitHub issues in each repo
- [x] GPU spike result written into ADR 0010
- [ ] arm64 image check done for every planned chart, including LitmusChaos and its MongoDB
- [ ] Every step added to its phase's table before work on it starts, and its status updated with the work
- [ ] ADR for LitmusChaos in `core` written in `homelab-gitops` and synced
- [ ] ADR for OpenCost on every k3d cluster written in `homelab-gitops` and synced
- [ ] ADR for KEDA (on-demand models in `ai`) written in `homelab-gitops` and synced
- [ ] ADR for Karmada written in `homelab-gitops`, and accepted or dropped after the phase 1a trial
- [ ] This post and the project card status updated at the end of every phase

{% include project-nav.html %}
