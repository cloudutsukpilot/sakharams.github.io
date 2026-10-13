# Lab anatomy: what a lab repo contains

Model: `~/gitrepos/observability/otel-static-site-k3d` (a static page on nginx, OpenTelemetry in the
browser and the server, OTel Collector, Grafana LGTM, all on k3d). Read its README, AGENTS.md and
`.github/skills/otel-static-site-guide/SKILL.md` once before building a new lab; they set the bar for
how much a lab explains.

## Lab contract v2 (the default)

Since homelab Phase 2 step 5 (2026-10-14), a k3d lab joins the Cloudutsuk platform instead of bundling
its own observability stack. What a lab must do, and what the platform does for it:

| The lab | The platform |
|---|---|
| k3d cluster named `lab-<short>`, on Docker network `homelab` | `lab.sh register` finds the server node's address there and registers it with Argo CD (label `homelab/addons=monitoring`) |
| Its own pod/service ranges, one pair per lab from 10.100 up (eBPF 10.100/10.101, OpenTelemetry 10.102/10.103, next 10.104/10.105) | No two labs that run together share a range (ADR 0030) |
| `kubeAPI` on `127.0.0.1:<port>` (6450 eBPF, 6451 OpenTelemetry, 6452 up for new labs), and every published host port in the card's `deploy.ports` | The lab runner refuses a deploy that clashes on a port or would push free memory below the headroom (`deploy.memory_gb`, ADR 0017) |
| `/srv/homelab/k3s/registries.yaml` mounted, so public images come through Zot | Zot mirrors docker.io, ghcr.io, quay.io and registry.k8s.io (ADR 0034) |
| CoreDNS forwards `home.cloudutsuk.com` to `172.30.0.1:1053` (`k8s/dns/coredns-custom.yaml`) | PowerDNS answers the internal zone; everything else goes to public resolvers |
| `make up` ends with `lab.sh register <cluster> dashboards`; `make down` starts with `lab.sh unregister` | Argo CD installs cert-manager and the monitoring pack (OTel Operator, agent and cluster collectors, kube-state-metrics); the shared `labs` OTLP token; the lab's dashboards in mon's Grafana, folder Labs |
| Apps send OTLP to `agent-collector.monitoring:4317/4318`; no Grafana, Loki, Tempo or Prometheus in the lab | The collectors add the pod's labels and `k8s.cluster.name`, and send to the gateway on `mon` |
| Every dashboard and `verify-*` query filters on the cluster | Labels: metrics `cluster`, logs `k8s_cluster_name`, traces `resource.k8s.cluster.name` |

Tools for the author, not the lab: `lab.sh` lives in `infra-local` (`~/gitrepos/iac/infra-local`, or
`HOMELAB_INFRA`). mon's Grafana needs a sign-in, so `capture.cjs` and `scripts/signal.sh` send the
read-only `lab-tools` token from `~/.config/homelab/grafana-labs-token` (infra-local
`host/monitoring/labs-grafana-token.sh`). A lab that needs a token inside the cluster (a page that
queries Grafana) gets its own with `lab.sh grafana-token <cluster>`.

Two exceptions found while moving the existing labs (2026-10-14):

- **Host-network senders** (eBPF agents such as OBI, which run with `hostNetwork: true`) can't reach
  `agent-collector.monitoring` in a lab whose CNI is Cilium inside k3d: nothing translates Service
  addresses for them, and they can't resolve mon's names. They send OTLP straight to the gateway,
  `https://otlp.mon.home.cloudutsuk.com`, with the labs token (copy `monitoring/otlp-token` into their
  namespace) and a `hostAliases` entry for `otlp.mon.home.cloudutsuk.com` → `172.30.0.3`.
- **The monitoring pack's settings for labs** (no OpenBao token, the OTel Operator's NetworkPolicies off)
  come from the ApplicationSets in `homelab-gitops`, through `templatePatch` on `helm.parameters`: a
  `valuesObject` can't be patched there, and trying broke the whole ApplicationSet. A lab changes none of
  this; it's listed so nobody "fixes" it in the lab.

What v2 doesn't cover: a lab meant to run on any laptop, without the homelab. Use the v1 template
`k3d-lgtm` for that (its own network, the `grafana/otel-lgtm` stack, Grafana on a host port); the
blog's `check.py` notes a v1 k3d lab but doesn't fail it.

## The layout (template `k3d-platform`)

```
<lab-repo>/
  app/                         the code the reader writes: source, Dockerfile (topic-specific)
  k3d/cluster.yaml             1 server on network homelab; app port → ingress; API port; pod/service ranges
  k8s/kustomization.yaml       app
  k8s/app/                     namespace, Deployment/Service/Ingress (OTLP to the agent collector)
  k8s/dns/coredns-custom.yaml  CoreDNS upstreams for pods on the homelab network
  dashboards/<slug>.json       the lab's dashboard (uid = lab slug), loaded into mon's Grafana, folder Labs
  scripts/signal.sh            metric|logs|traces query through mon's Grafana; exit 0 only with data
  Makefile                     up cluster dns build deploy monitoring status traffic down rebuild + exp-<id> / verify-<id>
  README.md  AGENTS.md         how to run it, how to work on it
  EXPERIMENTS.md               generated from the blog card (lab_repo.py sync), never hand-edited
```

`lab_repo.py new` copies this and fills: `__CLUSTER__` (default `lab-<slug without -lab>`), `__APP__`,
`__APP_NS__`, `__SERVICE__` (the OTel `service.name`), `__SITE_PORT__`, `__API_PORT__` (`--api-port`),
`__POD_OCTET__`/`__SVC_OCTET__` (`--range`, an even number: pods 10.<range>, services 10.<range+1>),
`__NAME__`, `__SLUG__`, `__SUMMARY__`; placeholders in file names too.

The v1 template `k3d-lgtm` has the same layout with `k8s/observability/` (grafana/otel-lgtm, a
Collector DaemonSet, the provisioned dashboard) instead of `dashboards/` and `k8s/dns/`, and Grafana on
`--grafana-port`.

## Rules that keep a lab runnable

- **Local and free by default.** `make up` on the homelab host with Docker, k3d, kubectl, make, curl
  and python3, and the platform running (v2). No registry: `k3d image import`. Pin every image tag.
- **Ports and ranges per lab.** k3d port mappings and pod/service ranges are fixed at cluster
  creation. Give each lab its own app ports, API port and range pair, so two labs can run side by side,
  and list every published host port in `deploy.ports`. `lab_repo.py new` warns when a port is
  already taken; `check.py` fails when `deploy.ports` misses one.
- **`make status` is the preflight.** It must fail when the app doesn't answer or the monitoring
  pack isn't Healthy (v1: when Grafana doesn't answer); capture.cjs refuses to run otherwise.
- **One `exp-<id>` target per experiment**, doing exactly what the post tells the reader to do
  (`curl` loops, `kubectl scale`, `kubectl delete pod`, a load generator…). Browser-only actions
  (clicking a button on the lab's page) go in the card's `action.browser` instead.
- **One `verify-<id>` target per experiment where possible**, built on `scripts/signal.sh`, e.g.
  `scripts/signal.sh traces '{ resource.service.name = "shop-api" && status = error }' 120`.
  A screenshot is only trusted when verify passed.
- **A page that explains itself** (optional but strong): like the otel lab's index.html, the app can
  show "what to look for" after each action. Keep its wording consistent with EXPERIMENTS.md.
- **The dashboard is part of the lesson.** One panel per thing an experiment asks the reader to look
  at, titled in plain words, with a short `rate()` window (1m) so changes show within a scrape or
  two. Use stable panel ids: capture selectors depend on them (`[data-viz-panel-key="panel-<id>"]`).
- **Recursion guards.** If the browser exports telemetry through the app's own server (same-origin
  `/v1/traces`), exclude that path from tracing and access logs, and ignore it in fetch/XHR
  instrumentation, as the otel lab does.
- **Commit before the final capture.** capture.cjs stores the lab's git revision with every
  screenshot; `-dirty` means the images may show code the posts don't describe.

## When the platform is not k3d

Record the choice in the card's `platform:` and adapt the template by hand:

| Topic needs | Runtime | Notes |
|---|---|---|
| One or two containers, no Kubernetes concepts | `docker-compose` | Keep `make up/down/status/exp-*`; join the `homelab` network and send OTLP to `https://otlp.mon.home.cloudutsuk.com` with the labs token, or bundle the LGTM image (v1) |
| Kubernetes behaviour (scheduling, HPA, probes, rollouts) | `k3d` (default) | Add metrics-server or KEDA as the topic requires |
| A different backend is the subject (Jaeger, Prometheus + Alertmanager, ELK) | `k3d` | Point `capture.urls` at that UI; signal.sh needs a matching query |
| A managed cloud service is the subject | `aks` / `eks` / `gke` | Terraform in `infra/`, `platform.cost` filled in, `make down` destroys everything |

Cloud labs: never run `make up`, an experiment or a capture against a cloud account without the
author's explicit go-ahead for that run. Until then the posts carry TODO callouts and the shots stay
"not captured yet".
