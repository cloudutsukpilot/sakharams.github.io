---
layout: post
title: "OpenTelemetry End to End: Write the Code"
date: 2026-10-08 00:02:00 +0530
categories: [labs, opentelemetry-lab]
tags: [Labs, OpenTelemetry Lab, OpenTelemetry, Observability, Grafana, Kubernetes]
description: "The browser SDK, the nginx OTel module, two auto-instrumented FastAPI services, a Redis hook and a manual SQLite span, file by file."
lab: opentelemetry-lab
lab_part: 2
image:
  path: /assets/img/labs/opentelemetry-lab/02-write-the-code.webp
  alt: "OpenTelemetry End to End: Write the Code - Labs hero image"
---

This part walks through the code that produces every signal you'll look at later. There's less of it
than you might expect: most of the tracing comes from configuration and auto-instrumentation, and the
few lines written by hand are there to teach something specific. By the end you'll know which file
creates which span.

<!-- more -->

{% include lab-nav.html %}

## Repository Layout
{: #repository-layout }

```text
otel-static-site-k3d/
  Makefile                    up, build, deploy, status, down, traffic + exp-*/verify-* targets
  EXPERIMENTS.md              the experiments from this lab (generated from the blog's lab card)
  app/
    Dockerfile                two stages: Node bundles otel.js, then nginx:1.30-otel serves the site
    nginx.conf                otel module, JSON access log, /v1/traces and /grafana-api proxies
    site/index.html           the page, its "Call /api/demo" button and its own Grafana lookups
    site/ping.json            a static JSON file
    web/otel.js               browser tracing setup (bundled into /otel.js)
    web/package.json          OpenTelemetry JS packages + esbuild
    api/main.py               FastAPI: GET /api/demo calls the backend, logs a JSON line
    api/Dockerfile            python:3.12-slim + opentelemetry-instrument
    backend/main.py           FastAPI: GET /data, Redis cache-aside over SQLite
    backend/Dockerfile        same base, Redis auto-instrumentation disabled (added by hand instead)
  k3d/cluster.yaml            one k3s server; host ports 8081 → ingress, 3002 → Grafana
  k8s/
    app/                      static-site (nginx + exporter sidecar), api, backend, redis, ingress
    traefik/                  HelmChartConfig: Traefik tracing + OTLP metrics
    observability/            grafana/otel-lgtm, Collector DaemonSet + config, the dashboard
  scripts/signal.sh           asks Grafana whether a metric, log or trace has arrived
```

## The Application
{: #the-application }

The application is deliberately boring, so the telemetry stands out. The API has one real endpoint.
It calls the backend, and if that call fails it answers `502` (experiment 6 depends on this):

```python
# app/api/main.py
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000/data")


@app.get("/api/demo")
async def demo():
    """Call the backend so one browser request crosses both application tiers."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(BACKEND_URL)
            response.raise_for_status()
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Backend request failed") from error
```

The backend implements **cache-aside**: look in Redis; on a miss, read the database and put the
result in the cache for 60 seconds.

```python
# app/backend/main.py
CACHE_TTL_SECONDS = 60
CACHE_KEY = "record:demo"


@app.get("/data")
def data():
    """Use Redis cache-aside; load the seeded record from SQLite on a miss."""
    current_span = trace.get_current_span()
    try:
        cached = _cache.get(CACHE_KEY)
    # …
    if cached is not None:
        return {"tier": "backend", "record": json.loads(cached), "source": "redis"}
    # … SQLite SELECT (below), then:
    _cache.setex(CACHE_KEY, CACHE_TTL_SECONDS, json.dumps(record))
    return {"tier": "backend", "record": record, "source": "database"}
```

The database is a SQLite file created at startup with one row, `("demo", "Hello from the database")`.
Calling the API twice in a row shows both paths. This is real output from the running lab:

```console
$ kubectl -n demo exec deploy/redis -- redis-cli DEL record:demo
$ curl -s localhost:8081/api/demo
{"tier":"api","backend":{"tier":"backend","record":{"id":"demo","message":"Hello from the database"},"source":"database"},"trace_id":"b81d488a4fa6592f755714ffbbe23461"}
$ curl -s localhost:8081/api/demo
{"tier":"api","backend":{"tier":"backend","record":{"id":"demo","message":"Hello from the database"},"source":"redis"},"trace_id":"ddb21b6ca807c1cbc67a3902333089be"}
```

`source` flips from `database` to `redis`, and every response hands you its `trace_id`.

## Instrumentation
{: #instrumentation }

Each tier gets its telemetry a different way. That's typical of real systems, so it's worth seeing
all four.

**Browser: the Web SDK, configured in code.** `otel.js` creates a tracer provider with a stable
service name, batches spans for two seconds, and sends them to a *same-origin* path:

```js
// app/web/otel.js
const OTLP_PATH = '/v1/traces';

const provider = new WebTracerProvider({
  resource: resourceFromAttributes({ 'service.name': 'state-site-browser' }),
  spanProcessors: [
    new BatchSpanProcessor(new OTLPTraceExporter({ url: OTLP_PATH }), {
      scheduledDelayMillis: 2000,
    }),
  ],
});
provider.register();

const ignoreUrls = [/\/v1\/traces$/, /\/grafana-api\//];
registerInstrumentations({
  instrumentations: [
    getWebAutoInstrumentations({
      '@opentelemetry/instrumentation-fetch': { ignoreUrls },
      '@opentelemetry/instrumentation-xml-http-request': { ignoreUrls },
    }),
  ],
});
```

The auto-instrumentations cover document load, user interactions, `fetch` and XHR. For same-origin
requests the fetch instrumentation adds the `traceparent` header, which starts the distributed
trace. `ignoreUrls` matters: without it, exporting spans (a `fetch` to `/v1/traces`) would create
more spans to export, forever.

**nginx: a module and five directives.**

```nginx
# app/nginx.conf
load_module modules/ngx_otel_module.so;
# …
  log_format json escape=json
    '{"time":"$time_iso8601","remote_addr":"$remote_addr",'
    '"method":"$request_method","uri":"$request_uri","status":"$status",'
    '"bytes":"$body_bytes_sent","request_time":"$request_time",'
    '"user_agent":"$http_user_agent",'
    '"trace_id":"$otel_trace_id","span_id":"$otel_span_id"}';

  otel_exporter {
    endpoint otel-collector.observability.svc.cluster.local:4317;
  }
  otel_service_name state-site-nginx;
  otel_trace on;
  otel_trace_context propagate;   # continue the browser's trace when it sends traceparent
# …
    location = /v1/traces {
      otel_trace off;
      access_log off;
      proxy_pass http://otel-collector.observability.svc.cluster.local:4318;
    }
```

`$otel_trace_id` in the log format is what lets you jump from an access-log line to its trace. The
`/v1/traces` location is the browser's export path, proxied to the Collector with tracing and logging
switched off (the same recursion guard, server-side). The page's own Grafana lookups under
`/grafana-api/` are excluded the same way.

**Python services: zero-code auto-instrumentation.** Neither `main.py` sets up a tracer provider. The
Dockerfile does it by starting Uvicorn through `opentelemetry-instrument` and configuring it with
environment variables:

```dockerfile
# app/api/Dockerfile
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    OTEL_SERVICE_NAME=state-site-api \
    OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector.observability.svc.cluster.local:4318 \
    OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf \
    OTEL_TRACES_SAMPLER=parentbased_always_on
# …
CMD ["opentelemetry-instrument", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

`opentelemetry-instrument` loads every installed instrumentation package
(`opentelemetry-instrumentation-fastapi` and `-httpx` in the API) before the app starts.
`parentbased_always_on` means "keep a trace if the caller kept it, otherwise sample everything", so a
browser-started trace is never cut in half.

**Backend: two pieces by hand.** The backend's Dockerfile sets
`OTEL_PYTHON_DISABLED_INSTRUMENTATIONS=redis` and instruments its one Redis client explicitly instead,
so it can attach a response hook that names the cache result:

```python
# app/backend/main.py
def _redis_response_hook(span, _instance, response):
    """Label Redis GET spans so cache hits and misses are obvious in Tempo."""
    if span.name == "GET":
        result = "hit" if response is not None else "miss"
        span.set_attribute("app.cache.result", result)
        span.update_name(f"GET (cache {result})")


RedisInstrumentor.instrument_client(_cache, response_hook=_redis_response_hook)
```

And because nothing instruments `sqlite3` here, the query gets a manual span with the standard
database attributes:

```python
with trace.get_tracer(__name__).start_as_current_span(
    "sqlite SELECT records"
) as db_span:
    db_span.set_attribute("db.system", "sqlite")
    db_span.set_attribute("db.operation", "SELECT")
    db_span.set_attribute("db.statement", "SELECT id, message FROM records WHERE id = ?")
```

**A log line that knows its trace.** The API prints one JSON line per completed request, reading the
trace and span IDs from the current span:

```python
span_context = trace.get_current_span().get_span_context()
trace_id = f"{span_context.trace_id:032x}" if span_context.is_valid else None
request_log = {
    "event": "api.demo.completed",
    "service_name": "state-site-api",
    "route": "/api/demo",
    "http_status_code": response.status_code,
    "trace_id": trace_id,
    "span_id": f"{span_context.span_id:016x}" if span_context.is_valid else None,
    "cache_source": backend.get("source"),
}
print(json.dumps(request_log, separators=(",", ":")), flush=True)
```

Note what's *not* here: the app doesn't send logs anywhere. It prints to stdout and the Collector
picks the line up from the node ([Part 3](/posts/labs/opentelemetry-lab/03-set-up-infrastructure/#observability-stack)).

## Build the Image
{: #build-the-image }

`make build` produces three images and imports them into the cluster, with no registry involved:

```makefile
build: ## Build the site, API, and backend images and import them into the cluster
	docker build -t $(IMAGE) app
	docker build -t $(API_IMAGE) app/api
	docker build -t $(BACKEND_IMAGE) app/backend
	k3d image import $(IMAGE) $(API_IMAGE) $(BACKEND_IMAGE) -c $(CLUSTER)
```

The site image is a two-stage build. Node exists only in the first stage; the final image is nginx
plus files:

```dockerfile
# app/Dockerfile
FROM node:22-alpine AS web
WORKDIR /src
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/otel.js ./
RUN npm run build

FROM nginx:1.30-otel
COPY nginx.conf /etc/nginx/nginx.conf
COPY site/ /usr/share/nginx/html/
COPY --from=web /src/dist/otel.js /usr/share/nginx/html/otel.js
EXPOSE 80
```

| Line | Why |
|---|---|
| `FROM node:22-alpine AS web` | A throwaway build stage with npm |
| `COPY package.json package-lock.json` then `npm ci` | Install exact versions; this layer is cached until the lockfile changes |
| `npm run build` | `esbuild otel.js --bundle --minify --target=es2020 --outfile=dist/otel.js`: npm imports become one browser file |
| `FROM nginx:1.30-otel` | A fresh stage with the OTel module; nothing from Node carries over |
| `COPY --from=web …/otel.js` | Only the bundle crosses stages |

The Python images are single-stage: `python:3.12-slim`, `pip install -r requirements.txt`, copy
`main.py`. The images are tagged `static-site:dev`, `trace-lab-api:dev` and `trace-lab-backend:dev`,
and the manifests use `imagePullPolicy: IfNotPresent` so Kubernetes uses the imported copies.

## Check Your Understanding
{: #check-your-understanding }

<details markdown="1">
<summary>What would happen if <code>ignoreUrls</code> were removed from otel.js?</summary>

Every export to `/v1/traces` is itself a `fetch`, so it would be traced, producing a new span that
needs exporting, which is another `fetch`… The browser would generate telemetry about sending
telemetry in a loop.

</details>

<details markdown="1">
<summary>The API's main.py never creates a tracer provider. Where do its spans come from?</summary>

From `opentelemetry-instrument`, the command the container starts with. It configures the SDK from
the `OTEL_*` environment variables and loads the FastAPI and HTTPX instrumentations before Uvicorn
imports the app.

</details>

<details markdown="1">
<summary>Why does the backend disable Redis auto-instrumentation and then instrument Redis by hand?</summary>

To attach a response hook. Instrumenting the client explicitly lets the backend see each GET's result
and rename the span `GET (cache hit)` or `GET (cache miss)`, which makes the two paths obvious in a
waterfall.

</details>

{% include lab-nav.html %}
