# __REPO__

__SUMMARY__

Companion code for the **__NAME__** hands-on lab on cloudutsuk.com (__INDEX_URL__).

```
TODO: one ASCII diagram of the request path and the signal path
```

## Prerequisites

Docker, [k3d](https://k3d.io) v5+, `kubectl`, `make`, `curl`, `python3`. Host ports __SITE_PORT__ and
__GRAFANA_PORT__ free. The first `make up` pulls about 2 GB of images.

## Run

```sh
make up        # create the cluster, build + import the image, deploy everything
make status    # pods, and a health check of the app and Grafana
make down      # delete the cluster (and all observability data)
```

- App: http://localhost:__SITE_PORT__
- Grafana: http://localhost:__GRAFANA_PORT__ (anonymous admin) → Dashboards → Labs → __NAME__

## Experiments

See [EXPERIMENTS.md](EXPERIMENTS.md): each one is an action (`make exp-<id>`), what to predict,
and what to look for in which panel. `make verify-<id>` checks the signal arrived.

## Layout

```
app/                 application source and Dockerfile
k3d/cluster.yaml     1 server; ports __SITE_PORT__ → ingress, __GRAFANA_PORT__ → Grafana NodePort
k8s/app/             Deployment, Service, Ingress
k8s/observability/   grafana/otel-lgtm, OpenTelemetry Collector (DaemonSet), dashboard
scripts/signal.sh    query Grafana's datasources (used by verify-* targets)
```

## Notes

- k3d port mappings are applied only when the cluster is created; `make down && make up` to change them.
- `grafana/otel-lgtm` keeps data in emptyDirs: it is a learning setup, not production.
- After changing anything under `app/`, run `make build deploy`.
