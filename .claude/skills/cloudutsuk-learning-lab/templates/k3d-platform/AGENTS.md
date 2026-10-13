# Agent guidance

## Project at a glance

Hands-on lab **__NAME__**: __SUMMARY__ It runs on a short-lived k3d cluster that joins the Cloudutsuk
homelab platform (lab contract v2): Argo CD installs the monitoring pack, and the signals go to the
`mon` cluster's Grafana. The written lab lives on cloudutsuk.com (__INDEX_URL__); its experiments are
defined in the blog repo's `_data/labs/__SLUG__.yml` and mirrored here in [EXPERIMENTS.md](EXPERIMENTS.md).

## Work safely and consistently

- `make up` ends with `make monitoring` (infra-local `host/labs/lab.sh register`); `make down` starts
  with `unregister`. Keep that order: Argo CD must stop managing the cluster before it disappears.
- No registry and no cloud account: images are built locally and imported with `k3d image import`.
  Public images come through the homelab's Zot mirror.
- Don't bundle Grafana, Loki, Tempo or Prometheus in the lab: apps send OTLP to
  `agent-collector.monitoring:4318` (or 4317), which forwards to `mon`.
- Every query in a dashboard or `verify-*` target filters on this cluster (`cluster`,
  `k8s_cluster_name` or `resource.k8s.cluster.name` = `__CLUSTER__`): the stores hold every cluster's data.
- Every experiment in EXPERIMENTS.md has an `exp-<id>` target and, where possible, a `verify-<id>`
  target using `scripts/signal.sh`. Keep target names in sync with the blog card; the blog's
  `check.py` fails on a missing target.
- Don't hand-edit EXPERIMENTS.md: change the card in the blog repo and run
  `lab_repo.py sync --lab __SLUG__` there.
- The card's `deploy.memory_gb` and `deploy.ports` (__SITE_PORT__ and __API_PORT__) are what the lab
  runner checks before `make up`; update them when the lab grows.

## Useful entry points

- [Makefile](Makefile): cluster, DNS, build, deploy, monitoring, status, experiments, teardown.
- [k3d/cluster.yaml](k3d/cluster.yaml): network, ports, pod and service ranges.
- [dashboards/__SLUG__.json](dashboards/__SLUG__.json): the lab dashboard in mon's Grafana.
- [k8s/app/app.yaml](k8s/app/app.yaml): the app's Deployment, Service and Ingress.
- [scripts/signal.sh](scripts/signal.sh): check a metric, log or trace reached `mon`.
