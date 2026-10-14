---
layout: post
title: "eBPF Lab: Write the Code"
date: 2026-10-11 00:02:00 +0530
categories: [labs, ebpf-lab]
tags: [Labs, eBPF Lab, eBPF, Cilium, Hubble, Tetragon, Falco, OpenTelemetry, Kubernetes]
description: "The application and its instrumentation, file by file (eBPF Lab lab)."
lab: ebpf-lab
lab_part: 2
---

The app in this lab is short on purpose: one nginx config, one HTML page and about a hundred lines of
Go. What makes it interesting is what isn't there. By the end of this part you'll know every file in the
repo, why the Go API has no telemetry code at all, and where its metrics and traces come from anyway.

<!-- more -->

{% include lab-nav.html %}

## Repository Layout
{: #repository-layout }

```text
ebpf-lab/
  app/
    api/main.go              the Go API: /api/visits, /api/items, /api/admin/reset, /healthz
    api/go.mod               module only; no dependencies
    api/Dockerfile           Go 1.25.1 build, distroless runtime
    web/default.conf         nginx: the page, and /api/ proxied to the api Service
    web/index.html           "Count a visit" page
    web/Dockerfile           nginx-unprivileged 1.29-alpine
  charts/                    Cilium 1.20.2, Tetragon 1.7.1, Falco 9.2.0 (with Falcosidekick 0.14.0), OBI 0.14.0
  dashboards/ebpf-lab.json   the lab's Grafana dashboard, loaded into mon (folder Labs)
  docs/l7-api-policy.k3d-limitation.yaml   an L7 policy kept for reference (see Part 7)
  helm/                      values for each chart: cilium, tetragon, falco, obi
  k3d/cluster.yaml           2 nodes, no CNI, no kube-proxy, homelab network, ports, PV folder
  k8s/app/app.yaml           namespace demo: redis (PVC), api (2 replicas), web (NodePort)
  k8s/dns/coredns-custom.yaml  CoreDNS upstreams that work from pods on the homelab network
  k8s/policies/              the CiliumNetworkPolicy (exp. 2) and Tetragon policy (exp. 6)
  k8s/storage/storage.yaml   StorageClass lab-local and the two static PVs
  scripts/node-prep.sh       mounts a shared BPF filesystem in each node container
  scripts/falco-summary.py, tetragon-summary.py   one line per event, for the terminal
  Makefile                   up/down/status, one target per tool, exp-* and verify-* per experiment
  EXPERIMENTS.md             generated from the blog's lab card
```

The charts are vendored as `.tgz` files, so `make up` installs exactly the versions the posts describe,
with or without network access to the chart repositories.

## The Application
{: #the-application }

### The API

`app/api/main.go` starts by saying what it's for:

```go
// demo-api: a deliberately plain HTTP service for the eBPF lab.
//
// There is no OpenTelemetry, no metrics library and no logging middleware in here on purpose:
// every request metric and trace you see for this service comes from eBPF (OpenTelemetry eBPF
// Instrumentation), every flow from Cilium/Hubble, every process event from Tetragon and Falco.
//
//	GET  /api/visits        INCR "visits" in Redis, return the count (the persistence check)
//	GET  /api/items         a small static list
//	POST /api/admin/reset   reset the counter (the L7 policy in experiment 2 blocks it)
//	GET  /healthz           liveness
```

> The comment on `/api/admin/reset` describes an L7 policy that the lab no longer applies; Part 7's
> [Limits](/posts/labs/ebpf-lab/07-understand-and-review/#limits-of-this-setup) explains why. Experiment 2
> uses an L3/L4 policy on Redis instead.
{: .prompt-info }

It doesn't even use a Redis client library. It speaks Redis's wire protocol (RESP) over a plain TCP
connection, one connection per command:

```go
// redisCmd sends one command in RESP and returns the reply line (":42", "+OK", "-ERR ...").
// A connection per call keeps it simple; at lab traffic levels that's fine.
func redisCmd(args ...string) (string, error) {
	conn, err := net.DialTimeout("tcp", redisAddr, 2*time.Second)
	if err != nil {
		return "", err
	}
	defer conn.Close()
	conn.SetDeadline(time.Now().Add(2 * time.Second))
	var b strings.Builder
	fmt.Fprintf(&b, "*%d\r\n", len(args))
	for _, a := range args {
		fmt.Fprintf(&b, "$%d\r\n%s\r\n", len(a), a)
	}
	// …
}
```

That matters later: OBI reports `db_operation_name="INCR"` and draws a Redis span without any library
to hook. It recognises the protocol on the socket.

The handler that experiments 3, 4 and 7 use increments the counter and says which pod answered:

```go
func visits(w http.ResponseWriter, r *http.Request) {
	reply, err := redisCmd("INCR", "visits")
	if err != nil || !strings.HasPrefix(reply, ":") {
		writeJSON(w, http.StatusBadGateway, map[string]any{"error": fmt.Sprint(err, reply)})
		return
	}
	n, _ := strconv.Atoi(strings.TrimPrefix(reply, ":"))
	writeJSON(w, http.StatusOK, map[string]any{"visits": n, "served_by": hostname})
}
```

`served_by` is the pod's hostname. With two API replicas on two nodes, it tells you which one Cilium
picked, which turns out to matter in [Experiment 4](/posts/labs/ebpf-lab/06-experiments/#exp-obi-traces).

The routes use the standard library's `http.ServeMux`; `main()` registers four handlers and listens on
`:8080`. `go.mod` has no `require` lines at all.

### The web tier

`app/web/default.conf` is the whole nginx configuration:

```nginx
server {
    listen 8080;
    location / { root /usr/share/nginx/html; index index.html; }
    location /api/ { proxy_pass http://api:8080; }
    location = /healthz { access_log off; return 200 "ok"; }
}
```

`proxy_pass http://api:8080` resolves the Service name through CoreDNS; the connection to the Service's
ClusterIP is then load-balanced by Cilium, not kube-proxy. `index.html` is one card with the visit
counter and a **Count a visit** button. Its script calls `/api/visits` once on load and once per click,
so every page load is itself a visit:

```js
async function hit(){
  const s=document.getElementById('status');
  try{ const r=await fetch('/api/visits'); const j=await r.json();
    document.getElementById('visits').textContent=j.visits;
    document.getElementById('pod').textContent=j.served_by; s.textContent='HTTP '+r.status;
  }catch(e){ s.textContent='error: '+e }
}
document.getElementById('hit').onclick=hit; hit();
```

## Instrumentation
{: #instrumentation }

There is none in the code, and that's the point of the lab. Each signal comes from a program in the
kernel, configured in `helm/` and the manifests, not in `app/`:

| Signal | Produced by | How it travels | Where you read it |
|---|---|---|---|
| Network flows (who talked to whom, verdict) | Cilium's datapath on each pod's veth | Hubble Relay, pulled by the UI | Hubble UI, `make hubble-flows` |
| HTTP and Redis RED metrics | OBI | OTLP push every 60 s, straight to `mon`'s gateway | Grafana: Mimir |
| Trace spans for HTTP and Redis | OBI | OTLP push in batches (15 s schedule delay) | Grafana: Tempo |
| Process executions, enforcement | Tetragon | JSON on its `export-stdout` container, tailed by the agent collector | Grafana: Loki, `make tetragon-events` |
| Rule alerts | Falco | JSON on stdout (tailed to Loki) and to Falcosidekick | Falcosidekick UI, Grafana: Loki |

### OBI: what "no code changes" means

OBI runs as a privileged DaemonSet on the host network. `helm/obi-values.yaml` tells it what to watch:

```yaml
contextPropagation:
  enabled: true    # inject traceparent so web → api → redis spans join one trace

config:
  data:
    # …
    extensions:
      obi:
        version: "2.0"
        # k8s.cluster.name on everything OBI sends; the gateway turns it into cluster="lab-ebpf".
        enrich:
          enrichers:
            kubernetes: {mode: enabled, cluster_name: lab-ebpf}
        capture:
          # Replaces the chart's catch-all include: only the lab's own app is instrumented, never
          # Cilium, Tetragon, Falco or (on this shared kernel) anything outside the cluster.
          rules:
            - name: include-demo-namespace
              action: include
              match:
                kubernetes:
                  namespace_glob: [demo]
                process:
                  exe_path_glob: ["*"]
```

Three things to notice:

- **The capture rule** limits OBI to processes in namespace `demo`: nginx, the Go API and Redis. Without
  it, the chart's default would instrument every process it finds on this shared kernel.
- **Service names** come from Kubernetes: OBI sets `service.name` to the workload (`api`, `web`, `redis`)
  and `service.namespace` to `demo`. Mimir's `job` label joins the two (`job="demo/api"`), and Grafana's
  trace view shows them the same way (`demo/api`).
- **`contextPropagation`** asks OBI to carry trace context between processes it watches. The comment
  in the values file promises one trace for web → api → redis. Experiment 4 tests that promise, and it
  holds only part of the time.

The exporters send OTLP/HTTP to the homelab's gateway with the shared labs token, which the pod gets
from a Secret:

```yaml
    meter_provider:
      readers:
        - periodic:
            interval: 60000
            exporter:
              otlp_http:
                endpoint: https://otlp.mon.home.cloudutsuk.com/v1/metrics
                encoding: protobuf
                default_histogram_aggregation: explicit_bucket_histogram
                headers: [{name: Authorization, value: "Bearer ${OTLP_TOKEN}"}]
        - pull:
            exporter:
              prometheus/development: {port: 9090}
# …
envValueFrom:
  OTLP_TOKEN:
    secretKeyRef: {name: otlp-token, key: token}
```

The metrics are pushed every 60 seconds; Part 5 shows what that does to dashboard timing. The second
reader keeps a Prometheus endpoint on port 9090 so `make obi-metrics` can check OBI locally without
`mon`.

Every other pod in the lab sends through the monitoring pack's agent collector. OBI can't, and Part 3
explains why it talks to the gateway directly.

### Emit, scrape or tail

- **Push (emit)**: OBI pushes OTLP. Nothing scrapes it from `mon`.
- **Tail**: Tetragon and Falco only write JSON lines to stdout. The platform's agent collector tails
  every pod's log file under `/var/log/pods`, so their events become Loki log lines with no exporter
  configured in either tool.
- **Pull**: Hubble's flows stay in Cilium's ring buffers (4,095 per node here) until the UI or
  `hubble observe` asks for them; they don't reach `mon` at all.

## Build the Image
{: #build-the-image }

`app/api/Dockerfile`:

```dockerfile
FROM golang:1.25.1-bookworm AS build
WORKDIR /src
COPY go.mod main.go ./
RUN CGO_ENABLED=0 go build -o /demo-api .

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /demo-api /demo-api
USER 65532
ENTRYPOINT ["/demo-api"]
```

| Line | Why |
|---|---|
| `golang:1.25.1-bookworm AS build` | A pinned Go toolchain, only for building |
| `COPY go.mod main.go` | The whole source; no dependencies to download |
| `CGO_ENABLED=0 go build` | A static binary that runs on an image with no libc |
| `distroless/static-debian12:nonroot` | No shell, no package manager, nothing to exec into |
| `USER 65532` | The image's non-root user |

`app/web/Dockerfile` copies `default.conf` and `index.html` onto `nginxinc/nginx-unprivileged:1.29-alpine`,
which runs nginx as uid 101 and listens on 8080. That uid shows up in Falco's and Tetragon's events in
Part 6.

The distroless API image has no shell, so the security experiments run their commands in the **web** pod,
whose Alpine image has `sh`, `wget` and `nc` (all busybox).

`make images` builds both and imports them into the cluster; there's no registry:

```makefile
images: ## Build the demo images and import them into the cluster (no registry)
	docker build -q -t ebpf-lab/api:dev app/api
	docker build -q -t ebpf-lab/web:dev app/web
	k3d image import ebpf-lab/api:dev ebpf-lab/web:dev -c $(CLUSTER)
```

The Deployments use `imagePullPolicy: Never`, so a missing import shows up as `ErrImageNeverPull` rather
than a pull from somewhere unexpected.

## Check Your Understanding
{: #check-your-understanding }

<details markdown="1">
<summary>OBI reports <code>db_operation_name="INCR"</code> for the API. Which library did it hook to know that?</summary>

None. The API writes RESP bytes to a TCP socket itself. OBI watches the socket traffic of processes in
namespace `demo`, recognises the Redis protocol and parses the command name from it.

</details>

<details markdown="1">
<summary>Why do the security experiments exec into <code>web</code> and not <code>api</code>?</summary>

The API image is distroless: it has no shell and no `wget`, so there's nothing to run. The web image is
Alpine with busybox, which gives the experiments `sh`, `wget` and `nc`.

</details>

<details markdown="1">
<summary>Why does a page load raise the visit counter, even without a click?</summary>

`index.html` calls `hit()` once when the script loads, and `hit()` fetches `/api/visits`, which runs
`INCR`. Every screenshot of the page is therefore also a visit.

</details>

<details markdown="1">
<summary>What would you change so OBI also instruments the Falco UI's Redis?</summary>

Add `falco` to the capture rule's `namespace_glob` (or another rule for it). OBI only instruments
processes that match an include rule; everything else on the kernel is ignored.

</details>

{% include lab-nav.html %}
