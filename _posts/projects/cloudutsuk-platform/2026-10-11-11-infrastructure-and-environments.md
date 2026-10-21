---
layout: post
title: "Cloudutsuk Platform: Infrastructure and Environments"
date: 2026-10-11 00:11:00 +0530
categories: [projects, cloudutsuk-platform]
tags: [Projects, Cloudutsuk Platform, Infrastructure, IaC]
description: "Four k3d clusters on one DGX Spark, built with Terragrunt: network, DNS, secrets, storage, backups and the memory budget behind them."
project: cloudutsuk-platform
project_step: 11
image:
  path: /assets/img/projects/cloudutsuk-platform/11-infrastructure-and-environments.webp
  alt: "Cloudutsuk Platform: Infrastructure and Environments - Projects hero image"
---

Every environment in this project lives on one machine: the DGX Spark under my desk, with 121 GB of
unified memory that the GPU shares with everything else. So "environments" here isn't a row of cloud
accounts; it's four long-lived k3d clusters, some short-lived ones, and a lot of care about what each is
allowed to cost. This post describes what Phase 0 actually built on 2026-10-11, not a plan.

<!-- more -->

{% include project-nav.html %}

## Development environment
{: #development-environment }

There's no separate development cluster for the platform, and I don't want one yet. Development happens
in three places, each cheaper than a permanent environment:

| Where | What runs there | Lifetime |
|---|---|---|
| My workstation (the DGX itself) | Service code under test: the lab runner's 29 tests, the portal's Labs plugin with `yarn dev` | Per session |
| Throwaway k3d clusters | Spikes: the GPU-in-k3d test, chart experiments | Minutes to hours, then `k3d cluster delete` |
| Lab clusters (`lab-<slug>`) | The blog's hands-on labs, each with its own `make up` / `make down` | Until the lab's TTL |

A throwaway cluster costs about 0.5 to 1 GB just for its k3s server, so I create one when a change can
break a long-lived cluster (a new CRD, a new kind of storage) and delete it the same day. Everything a
spike proves goes back into code: the GPU spike became the custom k3s image the `ai` cluster now runs
on, and its findings are in [ADR 0010](/posts/projects/cloudutsuk-platform/architecture-decision-records/#adr-0010).

## Test or QA environment
{: #test-or-qa-environment }

Testing of the platform's own services runs in CI, not in a standing QA cluster. From Phase 1 the
self-hosted GitHub Actions runners (ARC, in `platform`) run unit, integration and API tests, then the
security gates, before an image reaches Zot. Phase 3a adds Playwright journeys, Schemathesis, a nightly
ZAP scan and Locust load scenarios
([Product Planning](/posts/projects/cloudutsuk-platform/03-product-planning/#phase-3a-steps)).

For infrastructure, the "test" step is the plan. Every Terragrunt stack is planned before it's applied,
and the plan is read: for a k3d cluster it shows the rendered k3d config, and any change to it means the
cluster is rebuilt ([ADR 0006](/posts/projects/cloudutsuk-platform/architecture-decision-records/#adr-0006)).
That one rule caught the difference between adding a load-balancer port (in place) and adding a host
alias (a rebuild) more than once today.

## Staging environment
{: #staging-environment }

There's no staging environment, and that's a deliberate trade-off rather than an oversight. A copy of
the four long-lived clusters would need roughly another 20 to 30 GB of memory, which the
[memory budget](#capacity-and-quota-planning) doesn't have while a chat model is loaded.

What stands in for staging:

- **Plan first, always** (Terragrunt and Argo CD's diff).
- **Changes that can't be undone in place go to a throwaway cluster first**, as described above.
- **Backups before risky changes**: Velero can take an on-demand backup of any cluster in under a
  minute ([Production environment](#production-environment)).

> **TODO:** Is a single `platform-next` k3d cluster worth its memory once the portal has users other
> than me? It would let Backstage upgrades and new plugins run against real Keycloak and OpenBao before
> `platform` gets them.
{: .prompt-warning }

## Production environment
{: #production-environment }

Production is the four long-lived clusters, all created by `infra-local` and all on the `homelab`
Docker network:

| Cluster | Holds | Memory cap | Ingress address | API |
|---|---|---|---|---|
| `core` (boots first) | OpenBao, Keycloak and its Postgres, PowerDNS, Zot, cert-manager, External Secrets, ExternalDNS | 6 GB | 172.30.0.1 | 172.30.0.1:6441 |
| `platform` | Argo CD, the Velero UI; later Backstage, the lab runner, the SRE agent | 12 GB | 172.30.0.2 | 172.30.0.1:6442 |
| `mon` | Its bootstrap only; LGTM and Alertmanager arrive in Phase 2 | 10 GB | 172.30.0.3 | 172.30.0.1:6443 |
| `ai` (GPU image) | 4 time-sliced GPUs; vLLM, the gateway and the RAG stack in Phase 5 | 16 GB | 172.30.0.4 | 172.30.0.1:6444 |

Nothing in production is reachable from the internet. My own devices reach it over a private Tailscale
network ([ADR 0037](/posts/projects/cloudutsuk-platform/architecture-decision-records/#adr-0037)), and
every UI signs in through Keycloak.

Two host services keep production honest. A **boot unit** starts `core` first, unseals OpenBao, starts
the rest and re-adds the k3d host aliases Docker drops on restart
([lesson L026](/posts/projects/cloudutsuk-platform/lessons-learned/#lesson-l026)). A **heartbeat** pings
healthchecks.io every five minutes while OpenBao answers healthy, so a silent DGX emails me. Backups run
nightly with Velero ([Compute, storage, and databases](#compute-storage-and-databases)).

## Infrastructure as code
{: #infrastructure-as-code }

Everything is code, split by what owns its lifecycle:

| Repo | Owns | Tooling |
|---|---|---|
| `infra-local` | The `homelab` network, the four clusters, each cluster's bootstrap Helm releases, host units and scripts | Terragrunt on the shared module (`docker_network`, `k3d_config_cluster`, `helm_release`) |
| `homelab-gitops` | Everything after bootstrap, through Argo CD's app-of-apps; the ADRs | Argo CD ApplicationSets |
| `infra-azure` | The backup storage account | Terragrunt, the same shared module |
| `infra-github` | The platform's GitHub repos | Terragrunt |

Bootstrap releases are what must exist before Argo CD, or what restoring `core` can't wait for:
OpenBao, External Secrets, cert-manager, PowerDNS, Keycloak, Zot, Velero
([ADR 0036](/posts/projects/cloudutsuk-platform/architecture-decision-records/#adr-0036)). Each is one
folder with a `resources.yaml`, its values and its ExternalSecrets, applied with:

```bash
venv/bin/python entrypoint.py --cloud k3d --environment homelab --provider helm \
  --stack core --resource openbao --terragrunt plan     # then apply
```

State lives in an Azure storage account, so losing the DGX's disk doesn't lose the record of what built
it. Charts are pinned by version and digest, at least 14 days old, and third-party charts that aren't
published as OCI are pushed into Zot after their digest is checked
([lesson L031](/posts/projects/cloudutsuk-platform/lessons-learned/#lesson-l031)).

## Networking and DNS
{: #networking-and-dns }

The network plan is fixed and boring on purpose
([ADR 0030](/posts/projects/cloudutsuk-platform/architecture-decision-records/#adr-0030)):

- **One bridge, `homelab`, 172.30.0.0/24.** The gateway 172.30.0.1 belongs to `core` (DNS, the registry
  and its ingress); `platform`, `mon` and `ai` each get their own address (.2, .3, .4), added to the
  bridge by a host unit. Docker hands out container addresses only from .128 upward.
- **Unique pod and service ranges per cluster** (10.10/10.11 for `core`, 10.20/10.21 for `platform`,
  10.30/10.31 for `mon`, 10.40/10.41 for `ai`), so routes between clusters are never ambiguous.
- **Internal DNS:** PowerDNS in `core` is authoritative for `home.cloudutsuk.com`. ExternalDNS in each
  cluster writes its own names, such as `velero.platform.home.cloudutsuk.com`. The DGX uses split DNS;
  pods reach PowerDNS through CoreDNS forwarding to 172.30.0.1:1053, because k3d redirects port 53 on
  the gateway to Docker's own resolver inside every node.
- **Certificates:** real Let's Encrypt certificates through a Cloudflare DNS-01 challenge; Cloudflare
  holds only the public zone and the challenge records.
- **Remote access:** the DGX advertises 172.30.0.0/24 to my tailnet, and the tailnet sends
  `home.cloudutsuk.com` lookups to PowerDNS, so my phone sees the same names and certificates as the DGX.

The [network diagram](/posts/projects/cloudutsuk-platform/05-technical-architecture/#network-layout) walks
the request path step by step.

## Compute, storage, and databases
{: #compute-storage-and-databases }

**Compute** is k3d nodes as Docker containers, one server per cluster, each with a memory cap. The `ai`
cluster runs on a custom k3s image with the NVIDIA container toolkit and shares the GB10 GPU four ways by
time-slicing; there's no MIG on this GPU.

**Storage** is host paths under `/srv/homelab`, one folder per stateful component, so rebuilding a
cluster keeps its data: OpenBao's raft store, PowerDNS's SQLite zone, Zot's images, `core-db` for
Keycloak, and folders ready for Mimir, Loki, Tempo and Grafana in `mon`.

**Databases:** one Postgres 17.10 in `core` (`core-db`, Keycloak's realm). `platform-db` and `ai-db`
arrive with Backstage and the RAG stack.

**Backups** ([ADR 0039](/posts/projects/cloudutsuk-platform/architecture-decision-records/#adr-0039)):
Velero runs in `core`, `platform` and `ai` and writes nightly (kept 30 days) and weekly (kept 12 weeks)
to an Azure Blob container on the Cool tier. Velero can't copy host-path volumes, so in `core` a small
dump pod takes application-consistent copies first: a `pg_dump` of every database, through a read-only
role, and an OpenBao snapshot, through the pod's own Kubernetes login and a snapshot-only policy. Velero
then uploads those, encrypted with a password only OpenBao and my offline kit hold. The first run saved
714 objects and 328 KB of dumps from `core`. A web UI at `velero.platform.home.cloudutsuk.com` shows every
cluster's backups, when they ran and how big they are.

## Configuration and secret management
{: #configuration-and-secret-management }

No secret value is in git
([ADR 0023](/posts/projects/cloudutsuk-platform/architecture-decision-records/#adr-0023)). OpenBao in
`core` holds them all in one KV store, one folder per cluster plus `shared/`. Every cluster runs External
Secrets with its own Kubernetes-auth mount and a policy that reads only its own folder; I checked that
`mon` gets a 403 on `core/*`.

The rest is careful plumbing:

- **Unseal keys** sit in a root-only file on the DGX, with an encrypted offline copy. The boot unit
  unseals from that file.
- **Day-to-day changes** use a periodic admin token, and since today an OpenBao sign-in through Keycloak.
  The root token is break-glass only.
- **Scripts never print a secret:** values move through pipes and 0600 temp files. For example, the
  storage account key goes from Azure straight into OpenBao, and the Keycloak client secrets are
  generated once and never rotated by a re-run.
- **Configuration** is values files in `infra-local` and manifests in `homelab-gitops`, reviewed as
  plans and diffs.

> **TODO:** When should the OpenBao root token be revoked? It's blocked on switching
> `configure-core.sh` from the root token to the admin token.
{: .prompt-warning }

## Environment parity
{: #environment-parity }

With one production per cluster, parity is about the clusters matching each other, and the labs matching
what they'll run on:

- **The same k3s version everywhere** (v1.35.5), with `ai` adding only the GPU toolkit to that image.
- **The same bootstrap set in every cluster:** External Secrets, its secret store, DNS forwarding,
  sign-in through Keycloak (`oidc-rbac`) and Velero. After bootstrap, Argo CD's ApplicationSets install
  cert-manager and ExternalDNS the same way on `platform`, `mon` and `ai`.
- **The same image path:** every node pulls public images through the Zot mirror from one shared
  `registries.yaml`.
- **Labs** join the same network and send telemetry to `mon` (lab contract v2, below), instead of
  each lab bundling its own Grafana stack.

The deliberate exception is `core`: Argo CD doesn't manage it, so it keeps working when `platform` is
down ([ADR 0038](/posts/projects/cloudutsuk-platform/architecture-decision-records/#adr-0038)).

### Lab contract v2
{: #lab-contract-v2 }

A hands-on lab is a short-lived k3d cluster that its own repo's `make up` creates and `make down`
deletes. Until Phase 2, every lab also ran its own Grafana, Loki, Tempo and Prometheus. The contract
v2 (Phase 2 step 5) is what a lab does to use the platform's monitoring instead, and what the platform
does in return:

| The lab | The platform |
|---|---|
| Creates its cluster on the shared `homelab` Docker network, named `lab-<short>` | A host script registers the cluster with Argo CD, labelled for labs |
| Keeps its own pod and service ranges, one pair per lab from 10.100 up, so two labs can run side by side | Argo CD installs only cert-manager and the monitoring pack there: the OpenTelemetry Operator, the agent and cluster collectors, kube-state-metrics |
| Lists every host port it publishes, the Kubernetes API's included, and the memory it needs, in its card's `deploy:` block | The lab runner refuses a deploy that clashes on a port or would leave the host short of memory ([ADR 0017](/posts/projects/cloudutsuk-platform/architecture-decision-records/#adr-0017)) |
| Pulls public images through the Zot mirror and resolves the internal zone through PowerDNS | Same mirror and DNS as every other cluster |
| Sends its apps' OTLP to the in-cluster agent collector | The collectors label everything with the cluster's name and forward it to `mon` with the shared `labs` token |
| Ships its dashboards as JSON in its repo | They're loaded into `mon`'s Grafana, folder Labs, at registration and removed when the lab leaves |
| Publishes its UIs as NodePort Services on localhost ports | A labs gateway gives each one a name and a certificate on the tailnet, such as `https://hubble-ui.ebpf.labs.home.cloudutsuk.com` ([ADR 0045](/posts/projects/cloudutsuk-platform/architecture-decision-records/#adr-0045)) |
| Leaves the platform first in `make down`, then deletes the cluster | Argo CD stops managing the cluster before it disappears |

Every query in a lab's dashboards and checks filters on its cluster, because `mon` holds every
cluster's signals: `cluster` on metrics, `k8s_cluster_name` on logs, `resource.k8s.cluster.name` on
traces. The screenshot tooling and the labs' `verify` targets read `mon`'s Grafana with a read-only
service-account token, since Grafana there needs a Keycloak sign-in.

As built (2026-10-14): the eBPF lab runs on it, and its metrics, logs and traces reach `mon`. A lab
scaffolded from the learning-lab skill's new template went from `make up` to its first verified
metric in `mon` in about 8 minutes, most of it the monitoring pack's first install. Its `make down`
left nothing behind in Argo CD or Grafana. A lab that has to run without the homelab still uses the
v1 template, with its own Grafana stack.

## Capacity and quota planning
{: #capacity-and-quota-planning }

Memory is the only quota that matters on this box. The DGX doubles as my desktop, which left about
81 GB free, so the platform plans for about 75 GB (the mid-range budget in
[ADR 0010](/posts/projects/cloudutsuk-platform/architecture-decision-records/#adr-0010)):

| Consumer | Budget |
|---|---|
| Chat model (vLLM, starting size) | ~30 GB planned; ~21 GB built (gpt-oss-20b, ADR 0046); ~44 GB since 2026-10-16 (Qwen3.5-35B-A3B, ADR 0049) |
| Embeddings, gateway, RAG stack | ~7 to 11 GB |
| `core`, `platform`, `mon` | ~16 to 21 GB |
| Lab clusters, in total | ~10 GB |
| CI builds, in bursts | ~4 to 8 GB |

Two catches shape how I measure it. GPU memory on the GB10 is unified system memory that isn't charged
to any container, so per-cluster figures undercount `ai` by the size of its vLLM slices; the host's
`free -g` is the real total. And a k3d cluster costs 0.5 to 1 GB before any workload runs, which is why
labs need admission control in the lab runner rather than good intentions.

Disk isn't a constraint (3.3 TB free), and the cloud side is cents a month for backups.

> **Measured 2026-10-15, chat model loaded (Phase 5 step 1).** gpt-oss-20b in a 0.17 slice: host
> `MemAvailable` fell by about 22 GB when it loaded, and with it running the DGX had 26 GB available. That
> was with the embeddings model, every long-lived cluster, the eBPF lab and the desktop running. Free
> memory is well below the 81 GB this plan assumed, which is why the chat slice started smaller.
{: .prompt-info }

> **TODO:** Set the lab runner's admission limit from this measurement, once the rest of Phase 5 (Qdrant,
> Redis, the RAG services, Phoenix) is running and measured.
{: .prompt-warning }

## Checklist
{: #checklist }

- [x] `homelab` network and the four long-lived clusters created from `infra-local` (2026-10-11)
- [x] Every cluster syncs its own secrets from OpenBao and is refused another cluster's
- [x] Internal names resolve on the DGX, in every cluster and over the tailnet, with valid certificates
- [x] Boot unit and heartbeat installed; nightly Velero backups in `core`, `platform` and `ai`
- [ ] Reboot test: everything comes back unsealed, with host aliases and the tailnet route
- [ ] First restore test of `core`'s dumps into a throwaway cluster
- [ ] OpenBao root token revoked after `configure-core.sh` moves to the admin token
- [ ] Memory budget confirmed with the chat model loaded
- [ ] Decision on a `platform-next` cluster before the portal gets other users

{% include project-nav.html %}
