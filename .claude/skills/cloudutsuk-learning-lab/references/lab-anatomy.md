# Lab anatomy: what a lab repo contains

Model: `~/gitrepos/observability/otel-static-site-k3d` (a static page on nginx, OpenTelemetry in the
browser and the server, OTel Collector, Grafana LGTM, all on k3d). Read its README, AGENTS.md and
`.github/skills/otel-static-site-guide/SKILL.md` once before building a new lab; they set the bar for
how much a lab explains.

## The layout (template `k3d-lgtm`)

```
<lab-repo>/
  app/                         the code the reader writes: source, Dockerfile (topic-specific)
  k3d/cluster.yaml             1 server; host ports → ingress (app) and NodePort 30030 (Grafana)
  k8s/kustomization.yaml       observability + app
  k8s/app/                     namespace, Deployment/Service/Ingress (app.yaml is a starting point)
  k8s/observability/
    lgtm.yaml                  grafana/otel-lgtm 0.35.0 (Grafana, Loki, Tempo, Prometheus, Pyroscope)
    otel-collector.yaml        Collector Contrib DaemonSet (reads /var/log/pods)
    otel-collector-config.yaml otlp + file_log + prometheus receivers → otlp_grpc to lgtm
    dashboard.json             the lab's provisioned dashboard (uid = lab slug, folder "Labs")
    dashboard-provider.yaml    file provider for it
  scripts/signal.sh            metric|logs|traces query through Grafana; exit 0 only with data
  Makefile                     up cluster build deploy status traffic down + exp-<id> / verify-<id>
  README.md  AGENTS.md         how to run it, how to work on it
  EXPERIMENTS.md               generated from the blog card (lab_repo.py sync), never hand-edited
```

`lab_repo.py new` copies this and fills: `__CLUSTER__`, `__APP__`, `__APP_NS__`, `__SERVICE__`
(the OTel `service.name`), `__SITE_PORT__`, `__GRAFANA_PORT__`, `__NAME__`, `__SLUG__`, `__SUMMARY__`.

## Rules that keep a lab runnable

- **Local and free by default.** `make up` from a clean machine with Docker, k3d, kubectl, make,
  curl and python3. No registry: `k3d image import`. Pin every image tag.
- **Ports per lab.** k3d port mappings are fixed at cluster creation. Give each lab its own pair
  (8081/3002 is the otel lab; pick e.g. 8091/3012 for the next) so two labs can run side by side.
  `lab_repo.py new` warns when a port is already taken.
- **`make status` is the preflight.** It must fail when the app or Grafana does not answer;
  capture.cjs refuses to run otherwise.
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

## When the platform is not k3d + LGTM

Record the choice in the card's `platform:` and adapt the template by hand:

| Topic needs | Runtime | Notes |
|---|---|---|
| One or two containers, no Kubernetes concepts | `docker-compose` | Keep `make up/down/status/exp-*`; same LGTM image via compose |
| Kubernetes behaviour (scheduling, HPA, probes, rollouts) | `k3d` (default) | Add metrics-server or KEDA as the topic requires |
| A different backend is the subject (Jaeger, Prometheus + Alertmanager, ELK) | `k3d` | Point `capture.urls` at that UI; signal.sh needs a matching query |
| A managed cloud service is the subject | `aks` / `eks` / `gke` | Terraform in `infra/`, `platform.cost` filled in, `make down` destroys everything |

Cloud labs: never run `make up`, an experiment or a capture against a cloud account without the
author's explicit go-ahead for that run. Until then the posts carry TODO callouts and the shots stay
"not captured yet".
