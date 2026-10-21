---
layout: post
title: "Azure Service Bus Queues and Topics: Write the Code"
date: 2026-10-22 00:02:00 +0530
categories: [labs, azure-service-bus-lab]
tags: [Labs, Azure Service Bus Lab, Azure, Service Bus, Messaging]
description: "The application and its instrumentation, file by file (Azure Service Bus Queues and Topics lab)."
lab: azure-service-bus-lab
lab_part: 2
image:
  path: /assets/img/labs/azure-service-bus-lab/02-write-the-code.webp
  alt: "Azure Service Bus Queues and Topics: Write the Code - Labs hero image"
---

This part reads the shop's code: a checkout that only sends, a worker that receives in peek-lock mode
and settles each order, subscribers that read a topic, and a playground that makes every Service Bus
call one HTTP request away. By the end you'll know which line of Python causes each thing the
experiments show.

<!-- more -->

{% include lab-nav.html %}

## Repository Layout
{: #repository-layout }

```
labs-azure/service-bus/
  app/
    Dockerfile                one image for the three workloads
    requirements.txt          azure-servicebus 7.14.3, FastAPI, OpenTelemetry
    sblab/
      config.py               entity names, the three connection strings, the client helper
      telemetry.py            metric instruments, traceparent in and out of messages, logfmt lines
      web.py                  Shop and Playground API, entity counts, live feed
      fulfillment.py          orders queue → order-events topic
      subscribers.py          one receiver per subscription
      activity.py             the workers' step reports for the Shop page's live feed
      emulator.py             dev loop only (see Build the Image)
      static/                 index.html + shop.js, playground.html + playground.js, app.css
  infra/                      az CLI: up.sh, outputs.sh, down.sh, lib.sh
  k3d/  k8s/  dashboards/     the cluster, the manifests, the Grafana dashboard
  scripts/                    signal.sh (verify-* targets), order.sh (place one order)
  dev/emulator/               an x86 developer loop on Microsoft's emulator
  Makefile  EXPERIMENTS.md  README.md  AGENTS.md
```

The app never creates a queue, topic or subscription: that's `infra/up.sh`'s job
([Part 3](/posts/labs/azure-service-bus-lab/03-set-up-infrastructure/#the-cluster)). The code only
sends, receives, settles and reads counts, which is what application code should be allowed to do.

## The Application
{: #the-application }

### Three keys, one per kind of work

`app/sblab/config.py` reads three connection strings. Each comes from a different shared access
policy, and each Deployment only gets the ones it needs:

```python
CONNECTION_STRINGS = {
    "sender": os.getenv("SB_SENDER", ""),
    "listener": os.getenv("SB_LISTENER", ""),
    "manager": os.getenv("SB_MANAGER", ""),
}
# …
def client(credential: str) -> ServiceBusClient:
    """A client (one AMQP connection) for one of the three shared access policies."""
    return ServiceBusClient.from_connection_string(CONNECTION_STRINGS[credential], transport_type=TRANSPORT)
```

A `ServiceBusClient` is one AMQP connection. Senders and receivers you get from it are *links* on that
connection, cheap to open and close. That's why checkout keeps one long-lived sender instead of
connecting per order.

### Checkout: send and return

`web.py` builds the order message. The two choices that matter are in the comments:

```python
def _order_message(order: dict, extra: dict | None = None, message_id: str | None = None) -> ServiceBusMessage:
    return ServiceBusMessage(
        json.dumps(order),
        # MessageId is what duplicate detection compares: the same id within the queue's window
        # (10 minutes) is accepted by the send and then silently dropped.
        message_id=message_id or order["id"],
        subject="PlaceOrder",
        content_type="application/json",
        application_properties={"orderId": order["id"], "region": order["region"],
                                "total": float(order["total"]), **(extra or {}), **inject_context()},
    )
```

The MessageId is the order id, so a retried checkout (or a double-click) produces the same id, which
is what [Experiment 3](/posts/labs/azure-service-bus-lab/06-experiments/#exp-duplicate) relies on. A
scheduled order uses `sender.schedule_messages(message, at)` instead of `send_messages`: Service Bus
stores it straight away but nobody can receive it before `at`.

### Fulfillment: peek-lock, then settle

`fulfillment.py` opens one receiver on `orders`:

```python
# prefetch_count=0: a worker holds only the message it is working on, so a second replica can
# take the next one straight away (prefetching would lock messages this pod hasn't started).
receiver = listener.get_queue_receiver(config.ORDERS_QUEUE, prefetch_count=0)
```

The default receive mode is **peek-lock**: the message is delivered and locked for the queue's lock
duration (30 s), but stays in the queue. The worker decides what happens to it:

```python
try:
    handle(message, topic_sender)
except Exception as error:  # noqa: BLE001 - any failure: give the message back
    span.record_exception(error)
    span.set_status(trace.StatusCode.ERROR, str(error))
    receiver.abandon_message(message)
    outcome = "abandoned"
    # …
else:
    receiver.complete_message(message)
    outcome = "completed"
```

`handle` charges the card and publishes `OrderConfirmed` *before* the worker completes the order. If
the pod dies between the publish and the complete, the lock expires, the order is delivered again, and
the event is published twice. That's **at-least-once** delivery, and why the event's MessageId is
stable (`<order id>-OrderConfirmed`) so a downstream service can recognise a repeat.

The always-declined card raises `PaymentDeclined` on every delivery, unless an operator has approved
the order:

```python
if order.get("card") == config.DECLINED_CARD and p.get("manualApproval") != "true":
    raise PaymentDeclined("card declined")
```

### The event: properties are for the broker

Subscription rules can read a message's system properties (subject, correlation id…) and its
application properties, never its body. So `order_event` copies everything a rule may select on into
application properties:

```python
return ServiceBusMessage(
    json.dumps({**order, "event": subject}),
    subject=subject,
    message_id=f"{order['id']}-{subject}",
    correlation_id=order["id"],
    content_type="application/json",
    application_properties={
        "orderId": order["id"],
        "customer": order["customer"],
        "region": order["region"],
        "total": float(order["total"]),
        **inject_context(),
    },
)
```

`total` is sent as a number on purpose: fraud-review's filter is `total > 500`, a numeric
comparison, so the property should be numeric too.

### Subscribers: one receiver per subscription

`subscribers.py` starts a thread per subscription, each with its own receiver:

```python
receiver = listener.get_subscription_receiver(config.EVENTS_TOPIC, subscription, prefetch_count=0)
```

From the receiver's point of view a subscription is a queue: the same peek-lock, settle calls, delivery
count and dead-letter sub-queue. The shipping handler publishes `OrderShipped` back to the same topic,
which only email's rule selects:

```python
def shipping(order: dict, p: dict, sender) -> str:
    if p.get("subject") != "OrderConfirmed":
        return "ignored"
    time.sleep(PACK_MS / 1000)
    with tracer.start_as_current_span("order-events send", kind=trace.SpanKind.PRODUCER):
        sender.send_messages(order_event({k: v for k, v in order.items() if k != "event"}, "OrderShipped"))
```

`analytics` has no thread unless `CONSUME_ANALYTICS=true`, so its copies accumulate.

### Getting a dead letter back

There is no "move back" call in Service Bus. `api_resubmit` in `web.py` does it in three steps:

```python
dlq = client.get_queue_receiver(config.ORDERS_QUEUE, sub_queue=ServiceBusSubQueue.DEAD_LETTER,
                                prefetch_count=0)
# …
sender.send_messages(_order_message(order, {"manualApproval": "true"},
                                    message_id=f"{order['id']}-retry-{uuid.uuid4().hex[:4]}"))
dlq.complete_message(message)
```

Receive from the dead-letter sub-queue, send a corrected copy, complete the dead letter. The copy gets
a new MessageId because the original is still inside the 10-minute duplicate-detection window and
would be dropped.

### The Playground: one call per button

Each Playground button maps to one SDK call:

| Button | SDK call |
|---|---|
| Send (batch, scheduled, with TTL, SessionId) | `send_messages(batch)`, `schedule_messages(msgs, at)` |
| Peek | `receiver.peek_messages(n)`: no lock, no delivery count change |
| Receive (peek-lock) | `receiver.receive_messages(n)` in `PEEK_LOCK` mode |
| Receive and delete | the same in `RECEIVE_AND_DELETE` mode |
| complete / abandon / dead-letter / defer / renew lock | `complete_message`, `abandon_message`, `dead_letter_message(reason=…)`, `defer_message`, `renew_message_lock` |
| Receive deferred by sequence | `receive_deferred_messages([seq])` |
| Sub-queue: dead-letter | a receiver with `sub_queue=ServiceBusSubQueue.DEAD_LETTER` |
| Session | a receiver with `session_id=…` (or `NEXT_AVAILABLE_SESSION`) |

A peek-locked message can only be settled by the receiver that locked it, over the same AMQP link. So
`pg_receive` keeps the receiver open in memory, keyed by a lock id, until you settle every message or
55 seconds pass:

```python
# Messages received in peek-lock mode stay locked to the receiver that got them, so the receiver is
# kept open (here, in memory) until the reader settles each message or the lock runs out.
_locks: dict[str, dict] = {}
```

Service Bus errors are returned as they are, because they are part of the lesson: a 401
`ServiceBusAuthorizationError` for a key without the right, a session queue refusing a message without
a SessionId.

## Instrumentation
{: #instrumentation }

### Trace context through the broker

Service Bus carries application properties untouched, so `telemetry.py` puts the current span's
context in and takes it out:

```python
def inject_context() -> dict[str, str]:
    """W3C traceparent for the current span, to put in a message's application properties.

    Service Bus carries application properties untouched, so the consumer can continue the same trace.
    """
    carrier: dict[str, str] = {}
    propagate.inject(carrier)
    return carrier
```

The consumer starts its span with that context as the parent:

```python
with tracer.start_as_current_span(
    "orders process",
    context=extract_context(message),
    kind=trace.SpanKind.CONSUMER,
    # …
```

So checkout's `orders send` (PRODUCER), fulfillment's `orders process` (CONSUMER) and the subscribers'
`billing process`, `email process`… all land in one trace. In a run against the emulator, one 120 USD
order produced a single trace with 13 spans across `sblab-web`, `sblab-fulfillment` and
`sblab-subscribers`.

### Metrics

Five instruments, named with their Prometheus suffix already so the names in Mimir are predictable:

| Metric | Type | Labels | Recorded by |
|---|---|---|---|
| `sblab_messages_sent_total` | counter | `entity` | every send |
| `sblab_messages_settled_total` | counter | `entity`, `outcome`, `worker` | every complete, abandon, dead-letter, defer |
| `sblab_process_duration_seconds` | histogram | `entity` | time a handler spent on one message |
| `sblab_message_wait_seconds` | histogram | `entity` | enqueue time to complete: how long the order waited |
| `sblab_entity_messages` | gauge | `entity`, `state` | the management API, every 5 s |

The last one is different. A receiver only ever sees the messages it gets, so nothing in the app's
own flow can tell you how many are *waiting*. `shop-web` polls the management API (Manage right) for
every queue's and subscription's runtime counts, active, dead-letter and scheduled, and exports them
as a gauge. The Shop and Playground pages show the same numbers.

### Logs

Every step is one logfmt line, so Loki can filter and parse it:

```text
event=order.received order_id=ord-29fbf1 delivery_count=1 worker=fulfillment-a
event=order.abandoned order_id=ord-29fbf1 delivery_count=1 reason="card declined" worker=fulfillment-a
```

(Lines from the emulator run.) `opentelemetry-instrument` with
`OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true` exports them over OTLP with the trace id and
span id attached, so a log line links to its trace.

## Build the Image
{: #build-the-image }

One image runs all three workloads; the Deployment picks the command:

```dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf \
    OTEL_TRACES_SAMPLER=parentbased_always_on \
    OTEL_METRIC_EXPORT_INTERVAL=10000 \
    OTEL_LOGS_EXPORTER=otlp \
    OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true \
    OTEL_PYTHON_LOG_CORRELATION=true

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY sblab ./sblab
RUN useradd --uid 10001 --no-create-home app
USER 10001
EXPOSE 8080
CMD ["opentelemetry-instrument", "uvicorn", "sblab.web:app", "--host", "0.0.0.0", "--port", "8080"]
```

`make build` builds it as `sblab:dev` and imports it into the cluster with `k3d image import`; there's
no registry.

### Working on the code without Azure

On an x86 machine you can run the app against Microsoft's Service Bus emulator, which has the same
entities in `dev/emulator/config.json`:

```bash
make dev-emulator      # the emulator and the SQL Server it needs, in Docker
make dev-web           # http://127.0.0.1:8080 against it
make dev-workers       # fulfillment and subscribers
```

I used it to test every Shop and Playground path before anything touched Azure. It isn't the lab,
and it differs in ways that matter here: it doesn't check SAS rights (so
[Experiment 7](/posts/labs/azure-service-bus-lab/06-experiments/#exp-least-privilege) can't work on
it), it caps TTLs at an hour and the duplicate window at 5 minutes, allows 10 connections, and its entity
counts don't parse in the Python SDK (the pages show `?`). It also can't run on the DGX Spark: the
SQL Server Linux image it needs is x86 only. The SDK's management client also always uses HTTPS,
which the emulator's port 5300 doesn't speak; `app/sblab/emulator.py` rewrites those URLs, and is only
imported when `SB_ADMIN` names the emulator.

## Check Your Understanding
{: #check-your-understanding }

<details markdown="1">
<summary>Why does fulfillment publish OrderConfirmed before it completes the queue message, and not after?</summary>

If it completed first and then crashed, the order would be gone from the queue with no event
published: billing and shipping would never hear of it. Publishing first means a crash leads to a
redelivery and possibly a second event, which a consumer can detect by MessageId. Losing a message is
worse than seeing it twice.

</details>

<details markdown="1">
<summary>What would change if fulfillment used prefetch_count=20?</summary>

Each pod would pull and lock up to 20 orders it hasn't started. With three pods, one could sit on 20
locked orders while the others idle, and if their locks ran out before it got to them they'd be
delivered again with a higher delivery count. Prefetch helps throughput for fast handlers; with slow
ones it hurts fairness.

</details>

<details markdown="1">
<summary>Why is the order total an application property and not just in the JSON body?</summary>

Subscription rules can't read the body. fraud-review's `total > 500` filter only sees properties, so
the value has to be copied there.

</details>

<details markdown="1">
<summary>The Playground keeps receivers open in memory. What happens to locked messages if you close the browser?</summary>

Nothing at once. After 55 seconds the app closes the receiver, and the messages become available
again when their lock duration ends, with their delivery count one higher. Service Bus never loses a
peek-locked message because a receiver went away.

</details>

{% include lab-nav.html %}
