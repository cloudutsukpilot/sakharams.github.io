# __REPO__

__SUMMARY__

Companion code for the **__NAME__** hands-on lab on cloudutsuk.com (__INDEX_URL__).

```
TODO: one ASCII diagram of the request path and the signal path
```

## Prerequisites

This lab runs on the Cloudutsuk homelab (lab contract v2): its cluster joins the platform's `homelab`
Docker network, and its metrics, logs and traces go to the platform's monitoring cluster (`mon`)
instead of a Grafana of its own.

- Docker, [k3d](https://k3d.io) v5+, `kubectl`, `make`, `curl`, `python3`.
- The homelab running, with `infra-local` checked out at `~/gitrepos/iac/infra-local` (or set
  `HOMELAB_INFRA`), and kube contexts `k3d-platform` and `k3d-mon`.
- `~/.config/homelab/grafana-labs-token` for `make verify-*` (infra-local
  `host/monitoring/labs-grafana-token.sh`).
- Host ports __SITE_PORT__ (app) and __API_PORT__ (Kubernetes API) free.

## Run

```sh
make up        # cluster, DNS, image, app, then join the platform (monitoring pack from Argo CD)
make status    # the app answers and the monitoring pack is Healthy
make down      # leave the platform, then delete the cluster
```

- App: http://127.0.0.1:__SITE_PORT__
- Dashboard: https://grafana.mon.home.cloudutsuk.com, Dashboards → Labs → __NAME__

## Experiments

See [EXPERIMENTS.md](EXPERIMENTS.md): each one is an action (`make exp-<id>`), what to predict,
and what to look for in which panel. `make verify-<id>` checks the signal reached `mon`.

## Layout

```
app/                    application source and Dockerfile
k3d/cluster.yaml        1 server on the homelab network; port __SITE_PORT__ → ingress, API on __API_PORT__
k8s/app/                Deployment, Service, Ingress (OTLP to the agent collector in `monitoring`)
k8s/dns/                CoreDNS upstreams for pods on the homelab network
dashboards/__SLUG__.json  the lab's dashboard, loaded into mon's Grafana by `make monitoring`
scripts/signal.sh       query mon's Grafana (used by verify-* targets)
```

## Notes

- The pod and service ranges (10.__POD_OCTET__.0.0/16, 10.__SVC_OCTET__.0.0/16) are this lab's own; another
  lab running at the same time uses a different pair.
- After changing anything under `app/`, run `make build deploy`.
