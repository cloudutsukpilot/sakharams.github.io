---
layout: post
title: "Azure Service Bus Queues and Topics: Set Up the Infrastructure"
date: 2026-10-22 00:03:00 +0530
categories: [labs, azure-service-bus-lab]
tags: [Labs, Azure Service Bus Lab, Azure, Service Bus, Messaging]
description: "The cluster, the app manifests and the observability stack that receives the signals (Azure Service Bus Queues and Topics lab)."
lab: azure-service-bus-lab
lab_part: 3
image:
  path: /assets/img/labs/azure-service-bus-lab/03-set-up-infrastructure.webp
  alt: "Azure Service Bus Queues and Topics: Set Up the Infrastructure - Labs hero image"
---

The lab has two halves: a Service Bus namespace in Azure, made by one az CLI script, and a k3d
cluster on the DGX that runs the shop and joins the homelab platform. This part goes through both,
setting by setting, because every setting is something an experiment later tests. By the end you'll
know why the `orders` queue gives up after three deliveries and why fulfillment can't read Azure's
message counts.

<!-- more -->

{% include lab-nav.html %}

## The Cluster
{: #the-cluster }

### The Service Bus namespace

`infra/up.sh` creates everything in Azure, in one resource group, so `make down` is one
`az group delete`. The names come from `infra/lib.sh`, where the namespace gets a random suffix
because its name is also its global host name:

```bash
LOCATION="${LOCATION:-eastus}"
RG="${RG:-rg-sb-lab}"
# Standard, not Basic: Basic has queues only, no topics. Premium (dedicated capacity, VNet
# integration, large messages) costs about $670 a month and adds nothing these experiments need.
SKU="${SKU:-Standard}"
# …
  [ -f "$STATE/namespace" ] || echo "sblab-$(head -c 4 /dev/urandom | od -An -tx1 | tr -d ' \n')" > "$STATE/namespace"
```

The `orders` queue is where the shop's behaviour is decided:

```bash
# orders: a command queue. Peek-lock for 30 s, at most 3 deliveries before Service Bus dead-letters
# the message, duplicate detection on MessageId for 10 minutes, and expired orders dead-lettered
# rather than dropped.
sb queue create -n orders \
  --lock-duration PT30S --max-delivery-count 3 \
  --enable-duplicate-detection true --duplicate-detection-history-time-window PT10M \
  --default-message-time-to-live P1D --enable-dead-lettering-on-message-expiration true
```

| Setting | Value | What it means for an order |
|---|---|---|
| Lock duration | 30 s | A worker has 30 s to settle it before it is handed to someone else |
| Max delivery count | 3 | The third failed delivery sends it to the dead-letter queue ([Experiment 5](/posts/labs/azure-service-bus-lab/06-experiments/#exp-poison)) |
| Duplicate detection | 10 min | A second message with the same MessageId within 10 minutes is dropped ([Experiment 3](/posts/labs/azure-service-bus-lab/06-experiments/#exp-duplicate)). It can only be set when the queue is created |
| Default TTL | 1 day | An order nobody processes for a day expires |
| Dead-letter on expiry | on | ...and goes to the dead-letter queue instead of vanishing |

The topic and its subscriptions:

```bash
sb topic create -n order-events --default-message-time-to-live P1D

subscription() {   # name; every subscription starts with the $Default rule (TrueFilter: everything)
  sb topic subscription create --topic-name order-events -n "$1" \
    --lock-duration PT30S --max-delivery-count 5 \
    --default-message-time-to-live P1D --enable-dead-lettering-on-message-expiration true
}
rule() {           # subscription, rule name, then az flags for the filter (and action)
  local sub=$1 name=$2; shift 2
  az servicebus topic subscription rule delete -g "$RG" --namespace-name "$NAMESPACE" \
    --topic-name order-events --subscription-name "$sub" -n '$Default' -o none 2>/dev/null || true
  sb topic subscription rule create --topic-name order-events --subscription-name "$sub" -n "$name" "$@"
}

subscription billing
rule billing confirmed --filter-type CorrelationFilter --label OrderConfirmed
subscription shipping
rule shipping confirmed --filter-type CorrelationFilter --label OrderConfirmed
subscription fraud-review
rule fraud-review high-value --filter-type SqlFilter \
  --filter-sql-expression "sys.Label = 'OrderConfirmed' AND total > 500" \
  --action-sql-expression "SET riskLevel = 'high'"
subscription email
rule email customer-facing --filter-type SqlFilter \
  --filter-sql-expression "sys.Label IN ('OrderConfirmed', 'OrderShipped')"
subscription analytics            # keeps $Default: every event; nothing consumes it by default
```

Three kinds of rule:

- A **correlation filter** matches exact values of system or application properties (`--label` is the
  message's subject). It's a lookup, so it's the cheap one; use it when equality is enough.
- A **SQL filter** is an expression over properties: `sys.` for system properties, plain names for
  application ones. More expressive, more work for the broker.
- A **rule action** changes the copy that a rule lets in: fraud-review's copies get
  `riskLevel = 'high'`, the other subscriptions' copies don't.

A new subscription always comes with a `$Default` rule that matches everything, so `rule()` deletes it
first. Forget that and a filtered subscription receives every message anyway, because a message is
copied if *any* rule matches.

The two playground queues are plain except that `playground-sessions` has `--enable-session true`:
every message needs a SessionId, and a receiver locks a whole session at a time, which gives you FIFO
per session.

Last, the access policies, one per kind of work:

```bash
# Namespace-level policies. Each is a pair of keys plus a set of rights; a connection string made
# from one can do exactly those things and nothing else (experiment least-privilege).
sb namespace authorization-rule create -n shop-sender --rights Send
sb namespace authorization-rule create -n shop-listener --rights Listen
sb namespace authorization-rule create -n shop-manager --rights Manage Send Listen
```

`infra/outputs.sh` writes their connection strings to `.state/connections.env` with mode 600 (and the
names to `.state/lab.env`). Nothing secret is ever printed or committed.

> In production you'd use Microsoft Entra ID and managed identities instead of keys: role assignments
> such as *Azure Service Bus Data Sender* replace connection strings. Keys keep this lab independent of
> how the DGX is signed in to Azure.
{: .prompt-tip }

### The k3d cluster

`k3d/cluster.yaml` is the lab template's v2 cluster with this lab's numbers:

```yaml
metadata:
  name: lab-servicebus
servers: 1
agents: 0
image: rancher/k3s:v1.35.5-k3s1
network: homelab
kubeAPI:
  hostIP: 127.0.0.1
  hostPort: "6452"        # list it in the card's deploy.ports
ports:
  - port: 127.0.0.1:8095:80   # the app, through the bundled Traefik ingress
    nodeFilters: [loadbalancer]
# …
      - arg: --cluster-cidr=10.104.0.0/16
      - arg: --service-cidr=10.105.0.0/16
```

One server on the `homelab` Docker network, its own pod and service ranges (10.104/10.105, the next
free pair after the other labs), and public images pulled through the homelab's Zot mirror.
`k8s/dns/coredns-custom.yaml` sends everything but the internal zone to public resolvers, which is
what lets the pods resolve `<namespace>.servicebus.windows.net`.

## Application Manifests
{: #application-manifests }

`make secret` turns `.state/connections.env` into the Secret `shop/servicebus`. The three Deployments
in `k8s/app/app.yaml` each reference only the keys they need:

```yaml
# Three workloads from one image (app/Dockerfile). Each gets only the Service Bus keys it needs, from
# the Secret `servicebus` that `make secret` creates from .state/connections.env (never in git):
#   shop-web     sender (checkout), listener + manager (playground, entity counts)
#   fulfillment  listener (orders) + sender (order-events)
#   subscribers  listener (subscriptions) + sender (shipping publishes OrderShipped)
```

```yaml
# Competing consumers on the orders queue: `kubectl -n shop scale deploy/fulfillment --replicas=3`.
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fulfillment
spec:
  replicas: 1
  # …
          command: [opentelemetry-instrument, python, -m, sblab.fulfillment]
          env:
            - {name: OTEL_SERVICE_NAME, value: sblab-fulfillment}
            - {name: OTEL_EXPORTER_OTLP_ENDPOINT, value: http://agent-collector.monitoring.svc.cluster.local:4318}
            - {name: PROCESS_MS, value: "1500"}       # time to "charge the card" per order
            - {name: WEB_URL, value: http://shop-web.shop.svc.cluster.local}
            - {name: SB_SENDER, valueFrom: {secretKeyRef: {name: servicebus, key: SB_SENDER}}}
            - {name: SB_LISTENER, valueFrom: {secretKeyRef: {name: servicebus, key: SB_LISTENER}}}
```

The workers have no Service and no probe: nothing calls them. They only open outbound AMQP
connections to Azure, which is the other thing a queue buys you: a worker behind NAT, on a laptop or in
another cloud can take orders without anything being exposed. `shop-web` has a Service and an Ingress,
and `WEB_URL` is only for the Shop page's live feed (the workers post each step to it).

`shop-web` leaves its polling endpoints out of tracing, so traces show orders, not the page refreshing:

```yaml
- {name: OTEL_PYTHON_EXCLUDED_URLS, value: "healthz,api/entities,api/activity,internal/activity,api/shop/deadletters,static/.*"}
```

## Observability Stack
{: #observability-stack }

{% include flow-anim.html id="labs/azure-service-bus-lab/signal-path" %}

The lab runs no Grafana, Prometheus, Loki or Tempo. `make monitoring` runs infra-local's
`lab.sh register lab-servicebus dashboards`, which registers the cluster with Argo CD; Argo CD
installs the monitoring pack (OTel Operator, agent and cluster collectors, kube-state-metrics) and
loads `dashboards/azure-service-bus-lab.json` into mon's Grafana, folder Labs.

From there:

- **Traces and logs** are pushed by each process over OTLP/HTTP to `agent-collector.monitoring:4318`.
- **Metrics** are pushed the same way every 10 s (`OTEL_METRIC_EXPORT_INTERVAL=10000`).
- The agent collector adds the pod's Kubernetes labels and `k8s.cluster.name = lab-servicebus`, and
  forwards everything to mon's OTLP gateway with the shared labs token.
- In mon, metrics carry `cluster="lab-servicebus"`, logs `k8s_cluster_name="lab-servicebus"` and
  traces `resource.k8s.cluster.name = "lab-servicebus"`. Every query on the dashboard filters on them.

Azure Monitor has its own Service Bus metrics (incoming and outgoing messages, active and dead-lettered
counts), but this lab doesn't use them: they're per minute, they need another data source in Grafana,
and the app's own gauge gives the same counts every 5 s next to its traces and logs.

## Ports and Endpoints
{: #ports-and-endpoints }

| What | Where | Notes |
|---|---|---|
| Shop | http://127.0.0.1:8095/ | On the DGX; Traefik ingress in the cluster |
| Playground | http://127.0.0.1:8095/playground | |
| Shop from the tailnet | https://servicebus.labs.home.cloudutsuk.com/ | Through the labs gateway once the lab is registered |
| Kubernetes API | 127.0.0.1:6452 | `kubectl --context k3d-lab-servicebus` |
| Dashboard | https://grafana.mon.home.cloudutsuk.com | Dashboards → Labs → Azure Service Bus Queues and Topics |
| Service Bus | `<namespace>.servicebus.windows.net:5671` | AMQP over TLS, outbound from the pods |
| Service Bus management | `<namespace>.servicebus.windows.net:443` | HTTPS, entity counts |

8095 and 6452 are in the lab card's `deploy.ports`, so the portal's lab runner refuses to start the lab
when either is taken.

## Check Your Understanding
{: #check-your-understanding }

<details markdown="1">
<summary>You add a subscription with a SQL filter but forget to delete its $Default rule. What does it receive?</summary>

Every message. A subscription gets a copy when any of its rules matches, and `$Default` is a TrueFilter,
so your filter changes nothing.

</details>

<details markdown="1">
<summary>Why can't you turn duplicate detection on for the existing orders queue later?</summary>

`RequiresDuplicateDetection` can only be set when a queue or topic is created. You'd have to create a
new queue and move the senders and receivers to it, which is why it's decided up front in `up.sh`.

</details>

<details markdown="1">
<summary>The fulfillment pod has no Service. How do orders reach it?</summary>

They don't reach it; it fetches them. The pod opens an outbound AMQP connection to the namespace and
receives from the queue. Nothing needs to connect to the pod.

</details>

<details markdown="1">
<summary>Why does shop-web need the manager key, when checkout only sends?</summary>

For two other jobs: the entity counts come from the management API, which needs the Manage right, and
the Playground lets you pick any of the three keys. Checkout itself uses the sender key.

</details>

{% include lab-nav.html %}
