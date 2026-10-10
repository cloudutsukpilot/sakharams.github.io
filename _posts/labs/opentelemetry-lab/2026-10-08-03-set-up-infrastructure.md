---
layout: post
title: "OpenTelemetry End to End: Set Up the Infrastructure"
date: 2026-10-08 00:03:00 +0530
categories: [labs, opentelemetry-lab]
tags: [Labs, OpenTelemetry Lab, OpenTelemetry, Observability, Grafana, Kubernetes]
description: "The k3d cluster, the app manifests, Traefik's OTLP settings and the OpenTelemetry Collector pipelines that feed Grafana LGTM."
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
  name: otel-demo
servers: 1
agents: 0
ports:
  - port: 8081:80          # site, via the bundled Traefik ingress
    nodeFilters: [loadbalancer]
  - port: 3002:30030       # Grafana, via NodePort
    nodeFilters: [server:0]
```

One k3s server and no agents: a single-node cluster is enough, and it keeps the Collector DaemonSet
at exactly one pod. The two port mappings are the only way in from your laptop. `8081` goes to k3d's
load balancer, which forwards to Traefik on port 80; `3002` goes straight to Grafana's NodePort
`30030` on the server node.

The mappings are baked in when the cluster is created, which is why `make cluster` is a no-op for an
existing cluster:

```makefile
cluster: ## Create the k3d cluster (no-op if it already exists)
	@k3d cluster list $(CLUSTER) >/dev/null 2>&1 || k3d cluster create --config k3d/cluster.yaml
```

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

The `observability` namespace has two workloads: the Collector (a DaemonSet running
`otel/opentelemetry-collector-contrib:0.162.0`) and `grafana/otel-lgtm:0.35.0`. Step through what
happens inside the Collector:

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
  inserts `service.name` (a file has no idea which service wrote it). All five send to one `otlp_grpc`
  exporter at `lgtm.observability.svc.cluster.local:4317`.

**Grafana LGTM and the dashboard.** The LGTM Deployment stores everything in `emptyDir` volumes and
mounts the dashboard from a ConfigMap that Kustomize generates from two files:

```yaml
# k8s/observability/kustomization.yaml
configMapGenerator:
  - name: static-site-dashboard
    files:
      - static-site-dashboard.json
      - static-site-dashboard-provider.yaml
  - name: otel-collector-config
    files:
      - config.yaml=otel-collector-config.yaml
generatorOptions:
  disableNameSuffixHash: true
```

The provider file tells Grafana to load the JSON at startup into a **Static Site** folder, so the
dashboard exists the moment Grafana is ready, with no clicking around.

## Ports and Endpoints
{: #ports-and-endpoints }

| URL or address | What it is | Exposed by |
|---|---|---|
| <http://localhost:8081/> | The page | k3d load balancer → Traefik → `static-site` Service |
| <http://localhost:8081/api/demo> | The API (JSON with `trace_id`) | Traefik → `api` Service (Ingress path `/api`) |
| <http://localhost:3002/> | Grafana (anonymous admin, local only) | NodePort `30030` on the `grafana` Service |
| `otel-collector.observability.svc:4317` / `:4318` | OTLP gRPC / HTTP into the Collector | ClusterIP Service |
| `/v1/traces` on the site | The browser's OTLP endpoint, proxied by nginx to `:4318` | nginx location |
| `static-site.demo.svc:9113/metrics` | nginx metrics in Prometheus format | exporter sidecar |
| `lgtm.observability.svc:4317` | OTLP into Tempo, Loki and Prometheus | ClusterIP Service |

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

Recreate the cluster (`make down && make up`), because k3d applies port mappings only at creation.
That also deletes the observability data.

</details>

{% include lab-nav.html %}
