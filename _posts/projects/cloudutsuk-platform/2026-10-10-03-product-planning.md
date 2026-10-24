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
| 1. GitOps + CI/CD | Central Argo CD, `homelab-gitops` app-of-apps, ARC runners, BuildKit, the Zot registry in `core`, reusable build workflow with security gates (Gitleaks, Semgrep, Trivy, Checkov, Hadolint, SBOM, Cosign), Kyverno, PostSync smoke tests | 0 | Done 2026-10-13 (Argo CD and Zot came early, in Phase 0) |
| 1a. Multi-cluster management | Karmada trial, then the Karmada control plane in `platform` (installed by Argo CD), pull-mode agents on every cluster, the shared add-ons moved from ApplicationSets to Karmada propagation and override policies, lab runner registers and removes labs | 1 | Not started |
| 3a. Quality baseline | Playwright journeys, Schemathesis on every service, nightly OWASP ZAP, Locust load scenarios, Performance and Security dashboards, open-source DefectDojo as the central findings store, OWASP Dependency-Track for SBOMs, first performance baseline | 3 | Not started |
| 2. Central monitoring | `mon` with LGTM and Alertmanager; host exporters (node, GPU, Docker, blackbox); a monitoring pack on every cluster (OTel collectors, kube-state-metrics, ServiceMonitors); ready-made dashboards and mixin alerts; labs moved onto it | 0 | Done 2026-10-15 |
| 2a. Chaos engineering | Open-source LitmusChaos: ChaosCenter and its MongoDB in `core`, chaos agents on target clusters by an ApplicationSet (labs first), the experiment library in `homelab-gitops`, a Chaos dashboard in Grafana, first game day | 1, 2 | Not started |
| 3. Portal + labs | Backstage custom image through CI, SSO, Labs plugin, lab runner, `deploy:` blocks, Dashboard tab on the blog | 1, 2 | In progress (started 2026-10-13, alongside Phase 2) |
| 4. Inventory + cost | Four collectors, `lab` tag, AWS cost allocation tags, OpenCost on every k3d cluster with custom DGX prices, Inventory & Cost plugin, budget alerts | 2, 3 | Not started |
| 5. Local LLM + RAG + chat | `ai` cluster: vLLM chat and embeddings behind a LiteLLM gateway; KEDA scaling on-demand models to zero when idle; Qdrant, Redis cache, rag-ingest, rag-api, Chat plugin | 3 | In progress (started 2026-10-15) |
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
| 1 | ARC in `platform` through Argo CD: the scale-set controller (chart 0.14.2) and two runner scale sets. `homelab` is registered with the org (private repos only, ephemeral pods, no host access). `homelab-iac` is registered with `infra-local` alone and gets Docker and cluster access for its IaC jobs (ADR 0040) | `homelab-gitops`, `infra-local` | A workflow job runs on each scale set, including one of `infra-local`'s queued IaC jobs | Done (2026-10-12: `homelab` ran build-set jobs; `homelab-iac` ran all 15 Terragrunt plans of `infra-local` PR #2, 14 with no changes and 1 expected change. The shared module needed three fixes for arm64 self-hosted runners (L042). Controller image pinned by digest for Kyverno) |
| 1a | GitHub App for ARC (repo Administration read/write, Metadata read, org Self-hosted runners read/write), installed on the org; its ID, installation ID and private key in OpenBao at `platform/ci` | GitHub, `infra-local` | The ExternalSecret in `arc-runners` reports `SecretSynced` and both scale sets show as online runners in GitHub | Done (2026-10-11: `cloudutsuk-arc-runners`, created through the manifest flow with `infra-local/host/github/create-app.py`, installed on the org; the ExternalSecret is `SecretSynced`) |
| 1b | Docker access through a mutual-TLS endpoint (ghostunnel on the `homelab` bridge, ADR 0040) and cluster access for `homelab-iac`, plus the IaC jobs' own secrets: Azure login for the state backend and the shared-module read token; `config.yaml` runner set to `homelab-iac` | `infra-local` | A plan job for a k3d stack finishes on `homelab-iac` | Done (2026-10-12: in `infra-local` PR #2 all 15 Helm plans ran on `homelab-iac` with the kubeconfig and the `homelab-iac-state` principal, and the `network` stack's plan refreshed the Docker network through the mTLS endpoint, `CN=homelab-iac` in ghostunnel's log, no changes) |
| 1c | OpenBao JWT auth for GitHub OIDC: a push role bound to `main` and a read-only role for pull requests (ADR 0019, ADR 0034, ADR 0043) | `infra-local` | A `main` job logs in and gets the Zot push credentials; a PR job is refused them | Done (2026-10-12: `host/openbao/configure-ci.sh`. Role `main` is bound to the org, self-hosted runners, `refs/heads/main` and the reusable workflow itself, so no other workflow can read the push key. Role `pr` reads only the pull key; secrets sit in a new `ci/` area no cluster store can read. A throwaway PR was refused role `main` on `job_workflow_ref` and got 403 for the push key; the first `main` build signed in as `main` and pushed) |
| 2 | BuildKit and the reusable build workflow: build, push to Zot, commit the new digest to `homelab-gitops` | `homelab-gitops`, `homelab-services` | A workflow run pushes an image and opens the digest commit | Done (2026-10-12: one rootless BuildKit v0.33.0 in `platform`, reachable only from the runner namespace, used through `docker buildx` with the remote driver; `build-image.yaml` in `homelab-gitops` builds on every run, pushes and commits the digest with `kustomize edit set image` on `main` (ADR 0043). `hello-world` in `homelab-services` went through it: image pushed to `platform/hello-world`, digest committed to `apps/hello-world` by the writer App. The first push got 401 from a newline in the credential (L044)) |
| 2a | Write access for the digest commit: a second GitHub App limited to Contents read/write on `homelab-gitops`, its key in OpenBao | GitHub, `infra-local` | A workflow job mints a short-lived token and pushes a commit to `homelab-gitops` | Done (2026-10-12: `cloudutsuk-gitops-writer`, created with `create-app.py` (`manifests/gitops-writer.json`) and installed on `homelab-gitops` only; key at `ci/gitops-writer`. The `promote` job signs the App JWT with openssl, asks for a token limited to `homelab-gitops` and `contents: write`, pushes the commit and revokes the token) |
| 3 | Hello-world service through the whole path | `homelab-services`, `homelab-gitops` | A commit ends with an Argo CD app Synced and Healthy on the new SHA | Done (2026-10-12: FastAPI `hello-world` in `homelab-services`, deployed to `platform` from `homelab-gitops/apps/hello-world`, pulled with a `zot-pull` secret that External Secrets builds from `shared/zot-pull`. A code commit to `main` was built and pushed in 64 s; the digest commit followed, and Argo CD rolled it out 5.5 minutes after the push (its 3-minute poll). The app was Synced and Healthy and the pod answered with that commit's SHA. Kyverno's six Audit policies all pass for it) |
| 4 | Security gates in the reusable workflow: Gitleaks, Semgrep, Bandit, Trivy, Checkov, Conftest, Hadolint, Syft SBOM, Cosign signing | `homelab-gitops`, `homelab-services` | The hello-world service passes every gate and its image is signed | Done (2026-10-12: every run of `build-image.yaml`, pull requests included, passes Gitleaks (full history), Semgrep, Bandit, Trivy (dependencies, config), Checkov, Conftest with shared Dockerfile rules and Hadolint before building. BuildKit exports an OCI layout that Trivy scans and Syft turns into a CycloneDX SBOM, and on `main` crane pushes those same bytes, Cosign signs them and attests the SBOM. hello-world passes every gate, and its deployed image's signature and SBOM attestation verify with the committed public key. A deliberately bad commit (unpinned base image, root user, `shell=True`) was blocked by six gates before anything was built. Reports: job summary and a `security-reports` artifact (ADR 0032, 0033 as built) |
| 4a | Cosign key in OpenBao's transit engine and a signing policy only `main` builds can use (ADR 0033) | `infra-local` | `cosign sign` with the transit key works from a `main` job and fails from a PR job | Done (2026-10-12: transit key `cosign` (ECDSA P-256, not exportable) set up by `configure-ci.sh`; only the `main` role, bound to the reusable workflow, may sign. `build-image.yaml` signs every `main` image with Cosign v3.1.3 (`hashivault://cosign`, no transparency log); the signature is a Sigstore bundle stored as an OCI referrer in Zot and verifies with the committed public key. In a throwaway PR, role `main` was refused and role `pr` got 403 from the transit sign call. First try failed: Cosign signs at `transit/sign/cosign/sha2-256`, so the policy needs the sub-path) |
| 4b | `homelab` runner image with the CI tools baked in (ADR 0044): stock actions-runner plus the pinned scanners, built and signed by `build-image.yaml`, rolled out by hand | `homelab-gitops` | Gate jobs on the `homelab` runners use the baked tools and skip the downloads | Done (2026-10-12: tool set in `ci/tools` (sha256-pinned binaries, hash-locked Python tools, one installer); `platform/actions-runner` builds through `build-image.yaml`, signed with an SBOM attestation, and runs the `homelab` scale set, pulled from Zot. The tools step went from 2 to 7.5 minutes to under a second; a gated pull request build takes 45 s and a full `main` build with deploy commit about 70 s. The image gate only reports for this image: 255 fixable CVEs in the stock runner and in the newest tool releases can only be fixed upstream (ADR 0044) |
| 4c | Unit tests and lint in each service's pull request gate (ADR 0031): a `test` job runs ruff and pytest from the locked workspace before the image job, which needs it | `homelab-services` | A failing test or lint finding fails the PR before anything is built | Done (2026-10-13: hello-world's workflow runs Ruff (lint and format) and pytest from `uv.lock` in a `test` job that the image job needs. In a throwaway pull request a deliberately broken assertion failed the job in 13 s and the image job never started; on `main` the job takes 13 s. Found while writing the CI/CD area: the tests existed, but nothing in CI ran them) |
| 5 | Kyverno in every Argo CD-managed cluster (`platform`, `mon`, `ai`; labs once they register) through an ApplicationSet, and ADR 0033's policies in Audit mode first; each moves to Enforce once its policy reports are clean or its exceptions are written down. Signature checks wait for step 4a, the registry rule for step 3 | `homelab-gitops` | Kyverno is Healthy everywhere and the hello-world app passes its policies | Done (2026-10-12: Kyverno 1.19.1 Synced and Healthy on platform, mon and ai; seven CEL policies. `disallow-latest-tag`, `restrict-image-registries` and `verify-image-signatures` deny at admission; the last checks the Cosign signature and the signed SBOM of every `platform/*` and `labs/*` image. hello-world passes all seven. Tested by dry runs: `:latest`, an unmirrored registry, an unsigned image and an image signed without an SBOM were denied, and a signed image was admitted; CI jobs still start on the signed runner image. One written exception (Argo CD's Redis registry). Kyverno resolves an image index to amd64, so images are now built as single arm64 manifests. The other four policies stay in Audit, with their third-party violations listed in the chart's README (step 5a)) |
| 5a | Move the four Audit policies (`require-image-digest`, `pod-security-restricted`, `require-read-only-root-fs`, `require-requests-limits`) to Deny: chart values for digests, security contexts and resources, written exceptions for what can't comply (BuildKit, Velero's node agent), and Argo CD's Redis image through Zot in infra-local | `homelab-gitops`, `infra-local` | Every Kyverno policy is in Deny and its reports are clean or excepted | Done (2026-10-13: all seven policies deny on platform, mon and ai, and the reports are clean. Every add-on meets them through its chart values: public images pinned by their upstream digest, restricted security contexts, read-only roots and requests with a memory limit, Helm hook jobs included. Argo CD's Redis comes from Docker Hub through Zot, and Mimir's data reaches its pod through a PV instead of a hostPath. Four written exceptions: rootless BuildKit, the log-tailing agent collector, Velero's node agent, and the runners' writable home. Server-side dry runs on all three clusters denied an unpinned image, root, a hostPath, a writable root and missing limits (also in a Deployment) and admitted a compliant pod. Kyverno's chart ships with exceptions off at admission while reports still honour them, so CI runners were refused for 19 minutes until the feature was turned on (L051). Every Argo CD app now retries with `refresh` (ADR 0033 as built)) |
| 6 | PostSync smoke-test pattern | `homelab-gitops` | The hello-world PostSync test runs, and a failing test fails the sync | Done (2026-10-12: `apps/hello-world/smoke-test.yaml`, a PostSync hook Job with a pinned curl image, checks `/readyz`, `/` and that the revision is a commit SHA, and passes every Kyverno policy. A Service pointed at a wrong port left the Deployment Healthy but failed the test and the sync. Argo CD then kept retrying the broken commit and ignored the fix, until `syncPolicy.retry.refresh` made the next retry sync the fix a minute after it was pushed. No automatic rollback: a failed test fails the sync, and the rollback is a revert (ADR 0031 as built)) |
| 7 | Phase 1 exit: ADRs synced, CI/CD area written with the commit-to-deploy diagram and the testing and security matrix, roadmap ticked | this blog | M1's exit check passes | Done (2026-10-13: M1 passed again on the live system: a hello-world commit was Healthy on its SHA 8 min 25 s after the push. The CI/CD and Release Management area is written with the commit-to-deploy diagram (now as built) and the testing and security matrix; ADRs synced; the Phase 1 readiness review is in Deployment and Go-Live) |

### Phase 2 steps
{: #phase-2-steps }

Phase 2 runs alongside Phase 1 (decided 2026-10-11): its third-party charts install through the Argo CD that Phase 0
already runs and need no CI, so it depends on Phase 0 only.

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | `mon` workloads through Argo CD: LGTM, gateway collector, Alertmanager | `homelab-gitops` | Grafana on `mon` serves a valid certificate and its data sources are healthy | Done (2026-10-12: Mimir with its Alertmanager, Loki, Tempo, Grafana with Keycloak sign-in and the OTLP gateway on `mon`, ADR 0041; valid certificates, all four data sources healthy, a metric, log and trace sent to `otlp.mon.home.cloudutsuk.com` arrived with their cluster label) |
| 2 | Host exporters: node-exporter, DCGM, cAdvisor, blackbox | `infra-local` | Every exporter target is up in `mon` | Done (2026-10-12: node-exporter, DCGM, Docker cAdvisor and blackbox as a Compose project in infra-local `host/exporters`, on 172.30.0.1; all 10 targets up in `mon` as cluster `dgx`. The GB10 reports 11 DCGM fields, no framebuffer, XID or row-remap fields) |
| 3 | Monitoring-pack ApplicationSet for every cluster, labs included: OTel Operator, collectors, kube-state-metrics, ServiceMonitor CRDs | `homelab-gitops` | The kubernetes-mixin dashboards show every cluster in the cluster drop-down | Done (2026-10-12: OTel Operator, kube-state-metrics, Prometheus CRDs and two collectors with a target allocator on `platform`, `mon` and `ai`, each sending with its own token, ADR 0042; the cluster drop-down lists all three and the mixin's recording rules fill. Labs join with contract v2, step 5) |
| 4 | Fleet, Kubernetes and Platform dashboard folders and the mixin alert rules, as code (ADR 0027) | `homelab-gitops` | No "No data" panels for deployed components; fleet memory per cluster matches `docker stats`; killing a pod fires an alert | Done (2026-10-13: Kubernetes, Fleet and Platform folders in Grafana. The Platform folder holds Argo CD, External Secrets, Kyverno, Traefik and cert-manager at the versions that run, plus Velero backups and the OpenTelemetry collectors written here; their metrics come from ServiceMonitors switched on in each chart, a Traefik PodMonitor and the collectors' own. 195 alert rules, including Argo CD drift, ExternalSecret failures, OpenBao sealed, Velero backups and a cluster that stops reporting. Alertmanager sends warnings and critical alerts to Slack and the Watchdog to healthchecks.io, both tested. `scripts/panel_check.py` ran 925 panel queries across every cluster: none empty without a listed reason. Per-cluster memory matches the host's Docker view within 1-2%; a crash-looping pod raised KubePodCrashLooping (2026-10-12). Database alerts wait for the first database. 2026-10-15: an `alertmanager-sync` Job also loads the Alertmanager config through Mimir's API after each sync and hourly, so Grafana's Alerting pages show the contact points and policies (L070)) |
| 4a | AI dashboard folder and alert rules, as code (ADR 0027): DCGM GPU, vLLM and LiteLLM dashboards vendored and pinned, GPU and vLLM alert rules | `homelab-gitops` | The AI folder shows data for the `ai` cluster's GPUs and models; a stopped vLLM pod fires an alert | Done (2026-10-13: the embeddings model from ADR 0010 (Qwen3-Embedding-0.6B on vLLM 0.24) runs in `ai`, the first app of the new `cluster-ai`, and passes all seven Kyverno policies without an exception. Under light traffic every AI / vLLM panel has data and the host's DCGM exporter shows the GPU working (the `ai` cluster's GPU is the DGX's one GB10, ADR 0026). A model server that isn't running fires VLLMNotServing: on the first deploy the pod couldn't pull its 22 GB image for 15 minutes while Zot mirrored it, the alert fired after its 10 minutes and reached Slack, and it resolved when the pod became ready. VLLMTargetDown missed it once the pod was gone (L059). LiteLLM's dashboard fills in Phase 5) |
| 5 | Lab contract v2: the lab cluster joins the `homelab` network, the lab card gets `deploy.memory_gb` and `deploy.ports`, OTLP goes to `mon` with no bundled LGTM; learning-lab skill updated | this blog | The contract is documented and new labs are created to it | Done (2026-10-14: the contract is written in the learning-lab skill and in [Infrastructure and Environments](/posts/projects/cloudutsuk-platform/11-infrastructure-and-environments/#lab-contract-v2), and the skill's new default template `k3d-platform` scaffolds labs to it. A lab made from the template went through `make up`, its first metrics were verified in `mon`, and `make down` left nothing behind. The eBPF lab runs on it, with metrics, logs and traces in `mon`. The host scripts wait on an infra-local PR) |
| 6 | Migrate the two existing labs to contract v2 and update their posts' setup steps | lab repos, this blog | `make up` on each lab gets the monitoring pack and its signals appear in `mon` | Done (2026-10-14: both labs ran `make up` from scratch on the homelab network and registered themselves with `infra-local/host/labs/lab.sh`; Argo CD installed cert-manager and the monitoring pack, and `make down` unregisters first. The OpenTelemetry lab is now cluster `lab-otel` with no bundled LGTM: its Collector sends to mon's gateway with the shared labs token, its dashboard is in Grafana's Labs folder, the Trace Lab page queries mon through nginx with a Viewer token, and all six verify targets pass against mon. The eBPF lab's metrics, pod logs and OBI traces and RED metrics arrive under cluster `lab-ebpf`; OBI sends straight to the gateway because host-network pods in nested Cilium reach neither Services nor mon's names (L065). Every query in both cards, the posts and the lab repos is filtered on the lab's cluster (L067). The OpenTelemetry lab's posts describe the new setup; the eBPF lab's posts aren't written yet. Lab repos left uncommitted for review) |
| 7 | Phase 2 exit: ADRs synced, Operations and Observability area started with real dashboard screenshots, roadmap ticked | this blog | M2's exit check passes | Done (2026-10-15: M2 passed. The eBPF lab's metrics, logs and traces reach `mon` with nothing lab-specific on the platform: it joins through its own `make up`. A crash-looping test pod on `ai` raised KubePodNotReady after its 15 minutes, then KubePodCrashLooping, both routed to Slack, and both cleared within 6 minutes of deleting it. The [Operations and Observability](/posts/projects/cloudutsuk-platform/14-operations-and-observability/) area is written with real dashboard screenshots; ADRs synced) |

### Phase 3 steps
{: #phase-3-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | Backstage custom image built through CI and deployed by Argo CD, with its database: `platform-db` (Postgres 17, database `backstage`, ADR 0035) and Velero's nightly dump of it | `self-service-portal`, `homelab-gitops` | A portal commit redeploys Backstage | Done (2026-10-13: a portal commit was live on its new digest, with the smoke test passed, 9 min 44 s after the merge. The portal runs on `platform` at its internal address with a valid certificate, and Kyverno admits the signed image by digest. `platform-db` holds its 21 plugin schemas, and its backup dump was tested by hand. The Labs page lists the blog's three labs. Tests run in a Dockerfile stage on BuildKit, because the runners have no compilers) |
| 2 | Keycloak sign-in for the portal (needs Phase 0 step 11): a confidential `portal` client, groups in the Backstage identity, a permission policy (reads for everyone signed in, changes and lab deploys for `platform-admins`), guest removed | `self-service-portal`, `infra-local`, `homelab-gitops` | Sign-in works through Keycloak with both brokers | In progress (2026-10-13: sign-in works through Keycloak and the Entra ID broker; guest is off; the permission policy gives changes and lab deploys to `platform-admins` only. Left: the Google broker, deferred since Phase 0) |
| 3 | Labs plugin (frontend and `labs-backend`) on the lab-runner API contract | `self-service-portal` | The Labs page lists every lab and drives the lab runner | Done (2026-10-14: deployed in the portal; it lists the blog's labs and drives the lab runner. Deploy and Destroy worked from the portal. A pull request keeps a job's log across page reloads) |
| 4 | Lab runner: deploy and destroy, admission control, TTL, Argo CD cluster registration, streamed logs | `homelab-services` | Deploy and Destroy from the portal create and delete the cluster and register and unregister it in Argo CD | Done (2026-10-14: installed on the DGX as a host service on the homelab bridge, with the portal connected through a token from OpenBao. M3 passed from the portal: Deploy of the OpenTelemetry lab ran its `make up` in 8 min 48 s, registered `lab-otel` in Argo CD with its monitoring pack Healthy, and the lab's metrics, logs and traces checks passed in `mon`. Destroy ran `make down` in 2 s and removed the cluster, its registration and its dashboard. Admission control refused a deploy whose ports were taken. Follow-ups: reconcile labs started outside the runner through their `status` target; turn Deploy off on the card when ports are taken; the runner's records move to `platform-db` later) |
| 4a | Lab hostnames: a labs gateway (Traefik on the host, bridge address `172.30.0.5`, reachable over the tailnet), one wildcard DNS record `*.labs.home.cloudutsuk.com`, a Let's Encrypt wildcard certificate per lab, and routes that `lab.sh register` writes for each Service a lab publishes, so lab UIs open by name from anywhere on the tailnet | `infra-local`, this blog | `https://hubble-ui.ebpf.labs.home.cloudutsuk.com` opens the eBPF lab's Hubble UI from a tailnet device with a valid certificate, and the route goes away with `make down` | In progress (2026-10-15) |
| 4b | Sign Argo CD's webhook: a GitHub webhook secret for Argo CD (`webhook.github.secret` in `argocd-secret`, its value from OpenBao, never in git), and the build workflow's promote job signs its push event with it (`X-Hub-Signature-256`). Today the endpoint accepts unsigned events, which can only trigger a refresh | `infra-local`, `homelab-gitops` | An unsigned or wrongly signed event to Argo CD's webhook is refused, and a portal or hello-world build still refreshes Argo CD right after its digest commit | Planned (2026-10-15) |
| 5 | `deploy:` blocks on the lab cards | this blog | Every deployable lab card has one and the lab runner reads it | Done (2026-10-11: both lab cards have one and the runner's card loader accepts them; the learning-lab skill scaffolds and checks it) |
| 6 | Argo CD plugin in the portal, with the application groups of step 6a as tabs | `self-service-portal` | Each app's sync and health status shows in the portal, one tab per group | Not started |
| 6a | Application groups (ADR 0047): one Argo CD AppProject per area (`platform`, `monitoring`, `security`, `ai`, `labs`), each allowing only its own sources and clusters, mirrored as the label `homelab/group` on every Application; a Group variable and a Groups row on Grafana's Argo CD dashboard. Codefresh's Application Groups were considered and rejected: they show only in Codefresh's hosted UI and need an account, a tunnel and a non-expiring admin token | `homelab-gitops` | Every Application except the app-of-apps is in its group's project and Synced; the Argo CD UI filters by group; the dashboard's Groups row shows each group | Done (2026-10-15: 54 Applications in five groups (monitoring 20, security 12, platform 11, ai 6, labs 5), all Synced with no spec errors; the app-of-apps stay in `default`; Grafana's Group variable and Groups row show the same counts from Mimir) |
| 7 | Dashboard tab on the blog | this blog | TODO: decide what the tab shows | Not started |
| 8 | Lab-deploy sequence and portal user-journey diagrams | this blog | Both are drawn and in the Diagrams lane | Not started |
| 8a | Monitoring the monitoring: ServiceMonitors for Mimir (with its ruler and Alertmanager), Loki, Tempo and Grafana in `mon`; their upstream mixin dashboards in a Monitoring folder; and an Alerts overview dashboard (rules configured, normal, pending and firing, alerts by group, severity and cluster, notifications sent and failed) | `homelab-gitops` | The Monitoring folder has no unexplained empty panels and the Alerts overview's counts match Grafana's alert rule list | Done (2026-10-15: ServiceMonitors for Mimir, Loki, Tempo and Grafana (about 12,000 series); 22 mixin dashboards pointed at the single binaries, plus Alerts overview and LGTM health, in a Monitoring folder; an alert-rule inventory makes 118 rules = normal + pending + firing + Watchdog; `panel_check.py` lists a reason for every empty panel. The mixins' alerts aren't used: they assume microservices) |
| 8b | Hermes Agent (Nous Research) on `platform`: the gateway and its dashboard at `hermes.platform.home.cloudutsuk.com`, signed in through Keycloak for `platform-admins` only, with the chat model through LiteLLM (`gpt-oss-20b` at 64k, then `qwen3.5-35b-a3b` at 128k, ADR 0048, ADR 0049) | `homelab-gitops`, `infra-local` | A platform admin signs in and chats with Hermes; anyone else is refused | In progress (2026-10-16: deployed. Hermes v0.21.5 runs as uid 10000 without its s6 init, Synced and Healthy; vllm-chat at 64k; Keycloak client `hermes` behind the `browser platform-admins only` flow (infra-local #12); the URL serves a Let's Encrypt certificate and redirects to Keycloak; a chat through Hermes, LiteLLM and vLLM answered in 6 s. Left: a platform admin signs in from a browser) |
| 8c | Platform status dashboard: one Grafana page, the home dashboard, that says whether every tool, endpoint and service is up and healthy: a blackbox probe for every route and host tool on the Homelab links page (status, HTTP code, latency, certificate days left), scrape coverage per cluster (a job that should be there and isn't), Argo CD apps not Healthy or not Synced, workloads not ready or crash-looping, platform components (LGTM, gateway, collectors, Traefik, cert-manager, External Secrets, Kyverno, Velero, host exporters) and firing alerts | `homelab-gitops`, `infra-local` | Every tool on the Homelab links page has a row; a stopped service turns its row red within 2 minutes; nothing is red without a reason | In progress (2026-10-21) |
| 8d | Cloudflare Pages publish token: `create-token.sh pages` creates a token with Pages Write only (no zone access), keeps it in OpenBao and sets it with the account ID as Actions secrets on the site's repo, so a GitHub workflow can publish a static site to Cloudflare Pages without anyone copying the token | `infra-local` | The site's deploy workflow publishes to `pages.dev` with the token; the value never appears on screen | In progress (2026-10-25: the script's `pages` type is written; waiting for its first run and the site's deploy workflow) |
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
| 5a | Central findings store: open-source DefectDojo (OWASP, BSD-3) in `platform`, so the scan results outlive the 30-day `security-reports-<image>` artifact (ADR 0032 names it as the gap). `build-image.yaml` re-imports every report (Gitleaks, Semgrep, Bandit, Trivy, Checkov, Hadolint, the CycloneDX SBOM) through the API, one product per repo; sign-in through Keycloak; its token and database password in OpenBao. Its own database or `platform-db` is decided in the step's ADR | `homelab-gitops`, `infra-local` | Every CI run, pull requests included, lands its findings in DefectDojo, de-duplicated across runs, and `platform-admins` can open them with SSO | Not started (2026-10-16: version 3.4.101 checked: the django and nginx images are built for arm64, Helm chart 1.9.57) |
| 5b | SBOM inventory: OWASP Dependency-Track (Apache-2.0) in `platform`. Today the signed CycloneDX SBOMs sit in Zot as attestations and nothing shows their contents. `build-image.yaml` uploads each `main` build's SBOM (the attested one) through the API, one project per image with the git SHA as the version; Dependency-Track re-checks every SBOM against new CVEs daily, applies licence and component policies, and sends its findings to DefectDojo (step 5a). Sign-in through Keycloak; it needs PostgreSQL (its own or `platform-db`, decided in the step's ADR) | `homelab-gitops`, `infra-local` | Every `main` image's components, licences and open CVEs are visible in one dashboard, and a new CVE in a running image shows up without a rebuild | Not started (2026-10-16: version 5.2.0 checked: the apiserver and frontend images are built for arm64, Helm chart 2.8.0, PostgreSQL only) |
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
| 1 | `ai` workloads: vLLM chat and embeddings behind the LiteLLM gateway; first chat model and its licence chosen in an ADR | `homelab-gitops` | The gateway answers an authenticated client and the model ADR is accepted | In progress (2026-10-15: ADR 0046 proposes gpt-oss-20b, Apache 2.0, in a 0.17 slice of unified memory, about 21 GB, because the DGX had 39 GB free rather than the 81 GB planned. Tested in `ai` on the exact manifest: weights 13.8 GiB, KV cache 113,900 tokens, answers in 2 s, tool calls work, about 50 tokens a second. Every request first failed on a tokenizer file the non-root pod couldn't download (L069). LiteLLM v1.103.1, `ai-db`, `vllm-chat` and their Argo CD apps are written; LiteLLM was tested read-only and non-root against Postgres, with 401 without a key and a virtual key limited to its models. JWT auth is Enterprise-only, so callers get virtual keys (ADR 0029). Left: seed the OpenBao secrets, sync, call the gateway with a virtual key over HTTPS, accept ADR 0046. 2026-10-16: secrets seeded, LiteLLM and `ai-db` running, Hermes Agent called the gateway with its own virtual key over HTTPS. gpt-oss-20b then broke long tool-calling runs on malformed Harmony output, so ADR 0049 replaces it with Qwen3.5-35B-A3B (FP8, Apache 2.0, 3B active, 128k context, about 44 GB) in the same `vllm-chat` app; ADR 0046 is superseded) |
| 2 | Qdrant and the Redis cache | `homelab-gitops` | Both are Healthy in `ai` | In progress (2026-10-15: Qdrant 1.19.1 (API key, UI at `qdrant.ai.home.cloudutsuk.com`) and Redis 8.10.2 (password; its plain image includes the Query Engine RedisVL needs) are written, each on a static PV and with a NetworkPolicy admitting only the `rag` namespace. Left: seed their secrets and sync) |
| 3 | `rag-ingest`: incremental indexing every 6 hours plus "Re-index now" | `homelab-services` | Re-index now picks up a new post | Not started |
| 4 | `rag-api`: semantic cache, hybrid retrieval, citations | `homelab-services` | The same question asked twice hits the cache | Not started |
| 5 | Chat plugin with citations and "View trace" | `self-service-portal` | The chat cites the new post and "View trace" opens its trace | Not started |
| 6 | Arize Phoenix | `homelab-gitops` | Phoenix shows the full trace for a cache miss and a cache hit | Not started |
| 7 | Golden question set and evaluation runs: a scheduled job scores the chat model and the RAG pipeline on a fixed question set and publishes the scores to Mimir for an "Evaluations" row in Grafana. Text quality against reference answers (exact match, BLEU, ROUGE-N and ROUGE-L, BERTScore, COMET; perplexity from the model's log-probabilities) and RAG quality with a judge model (faithfulness and hallucination rate, answer relevancy, context recall, context precision). Speed and efficiency (TTFT, inter-token latency, throughput, latency, tokens and cost) come from serving metrics on AI / Model performance and usage (done 2026-10-16) | `homelab-services`, `homelab-gitops` | An eval run scores every golden question and the scores show in Grafana per model and run | Not started (serving metrics done 2026-10-16) |
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
