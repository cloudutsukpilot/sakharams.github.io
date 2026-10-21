---
layout: post
title: "OpenTelemetry End to End: Set Up the Infrastructure"
date: 2026-10-08 00:03:00 +0530
categories: [labs, opentelemetry-lab]
tags: [Labs, OpenTelemetry Lab, OpenTelemetry, Observability, Grafana, Kubernetes]
description: "The k3d cluster on the homelab network, the app manifests, Traefik's OTLP settings and the OpenTelemetry Collector pipelines that feed the homelab's mon cluster."
lab: opentelemetry-lab
lab_part: 3
image:
  path: /assets/img/labs/opentelemetry-lab/03-set-up-infrastructure.webp
  alt: "OpenTelemetry End to End: Set Up the Infrastructure - Labs hero image"
---

The code from Part 2 needs somewhere to run and somewhere to send its telemetry. This part covers the
cluster, the Kubernetes manifests for the five application pods, the two-line change that makes
Traefik part of every trace, and the Collector pipelines that turn three kinds of input into data
Grafana can query.

<!-- more -->

{% include lab-nav.html %}

## The Cluster
{: #the-cluster }

```yaml
# k3d/cluster.yaml
apiVersion: k3d.io/v1alpha5
kind: Simple
metadata:
  name: lab-otel
servers: 1
agents: 0
image: rancher/k3s:v1.35.5-k3s1
network: homelab
kubeAPI:
  hostIP: 127.0.0.1
  hostPort: "6451"
ports:
  - port: 127.0.0.1:8081:80      # site, via the bundled Traefik ingress
    nodeFilters: [loadbalancer]
volumes:
  - volume: /srv/homelab/k3s/registries.yaml:/etc/rancher/k3s/registries.yaml
    nodeFilters: [server:*]
options:
  k3s:
    extraArgs:
      - arg: --cluster-cidr=10.102.0.0/16
        nodeFilters: [server:*]
      - arg: --service-cidr=10.103.0.0/16
        nodeFilters: [server:*]
      - arg: --cluster-dns=10.103.0.10
        nodeFilters: [server:*]
```

One k3s server and no agents: a single-node cluster is enough, and it keeps the Collector DaemonSet
at exactly one pod. The cluster follows the homelab's lab contract v2:

- **`network: homelab`.** The cluster joins the Docker network every homelab cluster shares, so the
  platform's Argo CD can reach its API and its pods can reach the `mon` cluster.
- **Its own CIDR pair.** Pods get `10.102.0.0/16` and Services `10.103.0.0/16`, so they never overlap
  another cluster's on the shared network.
- **The registry mirror.** `registries.yaml` sends public image pulls through the homelab's Zot mirror.
- **Ports on localhost only.** `8081` goes to k3d's load balancer, which forwards to Traefik on port 80;
  the API is on `6451`. There is no Grafana port any more: Grafana is in `mon`.

The mappings are baked in when the cluster is created, which is why `make cluster` is a no-op for an
existing cluster:

```makefile
cluster: ## Create the k3d cluster (no-op if it already exists)
	@k3d cluster list $(CLUSTER) >/dev/null 2>&1 || k3d cluster create --config k3d/cluster.yaml
```

Pods resolve the homelab's internal names (`*.mon.home.cloudutsuk.com`) through one CoreDNS
addition, applied by `make dns`. Inside a k3d node the usual resolver doesn't know the internal zone,
so CoreDNS forwards just that zone to the homelab's PowerDNS:

```yaml
# k8s/dns/coredns-custom.yaml (data)
home.server: |
  home.cloudutsuk.com:53 {
    errors
    cache 30
    forward . 172.30.0.1:1053
  }
```

## Joining the Platform
{: #joining-the-platform }

`make monitoring` runs the homelab's registration script, then hands the lab its two tokens:

```makefile
monitoring: ## Join the homelab platform: monitoring pack, OTLP token, dashboard, Trace Lab token
	$(HOMELAB_INFRA)/host/labs/lab.sh register $(CLUSTER) dashboards
	# ...copies the OTLP token into observability/otlp-token and writes demo/grafana-proxy
```

`lab.sh register lab-otel dashboards` does four things:

1. Registers the cluster with the platform's Argo CD (label `homelab/addons=monitoring`), which
   installs cert-manager and the **monitoring pack**: OpenTelemetry collectors for the cluster's own
   Kubernetes metrics and every pod's raw logs, and kube-state-metrics.
2. Puts the shared labs OTLP token in Secret `monitoring/otlp-token`.
3. Loads every JSON file in `dashboards/` into `mon`'s Grafana, folder **Labs**.
4. Waits until the monitoring pack is healthy.

The Makefile then copies the OTLP token for the lab's own Collector, and asks `lab.sh grafana-token`
for a read-only Grafana token for the Trace Lab page (see below). `make down` runs
`lab.sh unregister` first, which removes all of it.

## Application Manifests
{: #application-manifests }

Everything for the app lives in the `demo` namespace, applied by Kustomize (`k8s/app/`):

| Workload | Image | Port | Probes | Notes |
|---|---|---|---|---|
| `static-site` | `static-site:dev` + `nginx/nginx-prometheus-exporter:1.5.3` | 80, 9113 | `GET /healthz` | Two containers: nginx, and a sidecar reading `stub_status` on loopback |
| `api` | `trace-lab-api:dev` | 8000 | `GET /healthz` | `BACKEND_URL=http://backend:8000/data` |
| `backend` | `trace-lab-backend:dev` | 8000 | `GET /healthz` | `REDIS_URL=redis://redis:6379/0`, SQLite at `/tmp/trace-lab.sqlite3` |
| `redis` | `redis:7.4-alpine` | 6379 | `redis-cli ping` | `--save "" --appendonly no`: no persistence at all |

Each Deployment has a Service of the same name, so the API reaches the backend at `http://backend:8000`
through cluster DNS. One Ingress splits the traffic by path:

```yaml
# k8s/app/static-site.yaml (Ingress)
spec:
  ingressClassName: traefik
  rules:
    - http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api
                port:
                  name: http
          - path: /
            pathType: Prefix
            backend:
              service:
                name: static-site
                port:
                  name: http
```

Because the page and the API share one origin (`localhost:8081`), the browser's `fetch('/api/demo')`
needs no CORS and the trace header goes along with it.

**Traefik joins the trace.** k3s installs Traefik itself, so the lab doesn't deploy it; it reconfigures
it with a `HelmChartConfig`, which k3s merges into its own chart values:

```yaml
# k8s/traefik/helmchartconfig.yaml
spec:
  valuesContent: |-
    additionalArguments:
      - "--tracing=true"
      - "--tracing.serviceName=state-site-traefik"
      - "--tracing.otlp=true"
      - "--tracing.otlp.http.endpoint=http://otel-collector.observability.svc.cluster.local:4318/v1/traces"
      - "--metrics.otlp=true"
      - "--metrics.otlp.serviceName=state-site-traefik"
      - "--metrics.otlp.http.endpoint=http://otel-collector.observability.svc.cluster.local:4318/v1/metrics"
```

Tracing and metrics are separate switches: with only `--tracing`, Traefik appears in waterfalls but
there are no `traefik_*` metrics, and the reverse. The lab turns on both.

## Observability Stack
{: #observability-stack }

The `observability` namespace has one workload, the Collector (a DaemonSet running
`otel/opentelemetry-collector-contrib:0.162.0`). There is no storage or Grafana in the lab: the
Collector sends everything to the homelab's `mon` cluster. Step through what happens inside it:

{% include flow-anim.html id="labs/opentelemetry-lab/collector-pipeline" %}

The receivers, from `k8s/observability/otel-collector-config.yaml`:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  file_log:
    include:
      - /var/log/pods/demo_static-site-*/nginx/*.log
    include_file_path: true      # the container operator reads pod metadata from the path
    start_at: beginning
    operators:
      - type: container          # CRI format + k8s.* resource attributes from the path
      - type: json_parser        # access log lines are JSON; error log lines are not
        if: body startsWith "{"
        parse_to: attributes
        on_error: send_quiet
        trace:
          trace_id:
            parse_from: attributes.trace_id
          span_id:
            parse_from: attributes.span_id

  # file_log/api: the same, for /var/log/pods/demo_api-*/api/*.log

  prometheus:
    config:
      scrape_configs:
        - job_name: state-site-nginx
          scrape_interval: 15s
          static_configs:
            - targets: [static-site.demo.svc.cluster.local:9113]
```

Three details make the lab work:

- **Why a DaemonSet with `runAsUser: 0`.** Pod logs are files on the node, under `/var/log/pods`. The
  Collector mounts that path read-only from the host, and it must run on every node that has pods
  (here, one) and as root to read them.
- **The `trace` block in `json_parser`.** It copies the `trace_id` and `span_id` fields from each JSON
  line into the log record's own trace context. That is what makes a Loki line *belong* to a trace,
  rather than just mention one.
- **Five pipelines, one exporter.** `traces` and `metrics` take OTLP (and the scrape); `logs` takes
  OTLP; `logs/nginx` and `logs/api` take the two file readers, each with a `resource` processor that
  inserts `service.name` (a file has no idea which service wrote it). All five also run
  `resource/cluster` and send to one exporter, the homelab's gateway:

```yaml
processors:
  resource/cluster:
    attributes:
      - key: k8s.cluster.name
        value: lab-otel
        action: upsert

exporters:
  otlp_http/mon:
    endpoint: https://otlp.mon.home.cloudutsuk.com
    headers:
      Authorization: "Bearer ${env:OTLP_TOKEN}"   # Secret observability/otlp-token
```

`mon` holds every homelab cluster's data, and the gateway turns `k8s.cluster.name` into a `cluster`
label. So every query in this lab filters on the lab: `cluster="lab-otel"` in PromQL (where the
service name becomes the `job` label), `k8s_cluster_name="lab-otel"` in LogQL and
`resource.k8s.cluster.name = "lab-otel"` in TraceQL.

**The dashboard.** `dashboards/static-site.json` is a plain Grafana dashboard whose queries use `mon`'s
data sources (`mimir`, `loki`, `tempo`) and the lab's cluster filter. `lab.sh register` loads it into
`mon`'s Grafana as **OpenTelemetry lab: static site signals** in the **Labs** folder, so it's there as
soon as the lab is up, and removes it when the lab goes.

**The Trace Lab proxy.** The page's **This request in Grafana** panel calls `/grafana-api/loki/`,
`/grafana-api/tempo/` and `/grafana-api/prometheus/` on the site itself. nginx forwards those to
`mon`'s Grafana data source API and adds a Viewer token from Secret `demo/grafana-proxy`, so the browser
never sees it. That token can query data but change nothing, and the site listens on localhost only.

## Ports and Endpoints
{: #ports-and-endpoints }

| URL or address | What it is | Exposed by |
|---|---|---|
| <http://localhost:8081/> | The page | k3d load balancer → Traefik → `static-site` Service |
| <http://localhost:8081/api/demo> | The API (JSON with `trace_id`) | Traefik → `api` Service (Ingress path `/api`) |
| <https://grafana.mon.home.cloudutsuk.com/d/lab-otel-signals> | The lab's dashboard in the homelab's Grafana (Keycloak sign-in) | the `mon` cluster |
| `otel-collector.observability.svc:4317` / `:4318` | OTLP gRPC / HTTP into the Collector | ClusterIP Service |
| `/v1/traces` on the site | The browser's OTLP endpoint, proxied by nginx to `:4318` | nginx location |
| `static-site.demo.svc:9113/metrics` | nginx metrics in Prometheus format | exporter sidecar |
| `https://otlp.mon.home.cloudutsuk.com` | OTLP into `mon` (Tempo, Loki, Mimir), labs token | the homelab's gateway |
| `/grafana-api/*` on the site | Read-only queries to `mon`'s Grafana, for the Trace Lab page | nginx locations |

## Check Your Understanding
{: #check-your-understanding }

<details markdown="1">
<summary>Why is the Collector a DaemonSet and not a Deployment?</summary>

It reads pod log files from the node's filesystem (`/var/log/pods`). A DaemonSet guarantees one
Collector on every node, so every pod's logs are local to some Collector.

</details>

<details markdown="1">
<summary>What would you lose if the <code>trace</code> block were removed from the file_log receivers?</summary>

The log lines would still arrive in Loki with `trace_id` as an ordinary attribute, but the log records
wouldn't carry trace context, so Grafana couldn't link them to traces natively. You'd be back to
copying IDs by hand.

</details>

<details markdown="1">
<summary>If you changed the site's host port from 8081 to 9090 in cluster.yaml, what else must you do?</summary>

Recreate the cluster (`make rebuild`), because k3d applies port mappings only at creation, and change
`deploy.ports` on the lab card so the lab runner knows. The telemetry already in `mon` stays.

</details>

{% include lab-nav.html %}
