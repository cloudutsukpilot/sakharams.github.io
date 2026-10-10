# Agent guidance

## Project at a glance

Hands-on lab **__NAME__**: __SUMMARY__ It runs on a local k3d cluster next to the Grafana LGTM
stack. The written lab lives on cloudutsuk.com (__INDEX_URL__); its experiments are defined in the blog
repo's `_data/labs/__SLUG__.yml` and mirrored here in [EXPERIMENTS.md](EXPERIMENTS.md).

## Work safely and consistently

- Keep the lab local-first: `make up` creates the cluster, builds and imports the image and applies
  the manifests. No registry, no cloud account.
- k3d host port mappings are fixed at cluster creation; `make down` deletes the cluster and its data.
- After changes under `app/`, run `make build deploy`.
- Every experiment in EXPERIMENTS.md has an `exp-<id>` target and, where possible, a `verify-<id>`
  target using `scripts/signal.sh`. Keep target names in sync with the blog card; the blog's
  `check.py` fails on a missing target.
- Don't hand-edit EXPERIMENTS.md: change the card in the blog repo and run
  `lab_repo.py sync --lab __SLUG__` there.
- Preserve the names used by log collection (`__APP_NS__` namespace, `/var/log/pods`) or update the
  Collector include path with them.

## Useful entry points

- [Makefile](Makefile): cluster, build, deploy, status, experiments, teardown.
- [k8s/observability/otel-collector-config.yaml](k8s/observability/otel-collector-config.yaml): receivers, pipelines, exporter.
- [k8s/observability/dashboard.json](k8s/observability/dashboard.json): the provisioned lab dashboard.
- [k8s/app/app.yaml](k8s/app/app.yaml): the app's Deployment, Service and Ingress.
- [scripts/signal.sh](scripts/signal.sh): check a metric, log or trace reached the backend.
