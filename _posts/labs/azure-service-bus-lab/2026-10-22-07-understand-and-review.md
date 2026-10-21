---
layout: post
title: "Azure Service Bus Queues and Topics: Understand and Review"
date: 2026-10-22 00:07:00 +0530
categories: [labs, azure-service-bus-lab]
tags: [Labs, Azure Service Bus Lab, Azure, Service Bus, Messaging]
description: "What the experiments proved, where this setup stops, and what production would change (Azure Service Bus Queues and Topics lab)."
lab: azure-service-bus-lab
lab_part: 7
image:
  path: /assets/img/labs/azure-service-bus-lab/07-understand-and-review.webp
  alt: "Azure Service Bus Queues and Topics: Understand and Review - Labs hero image"
---

You've now pushed orders through a queue and a topic, broken them on purpose and fixed them. This
last part puts it back together: the whole path of an order and its signals, what each experiment
proved, what this setup deliberately leaves out, and what you'd change before real customers rely on
it. It ends with tearing the lab down, which stops the bill.

<!-- more -->

{% include lab-nav.html %}

## The Full Signal Path
{: #the-full-signal-path }

{% include flow-anim.html id="labs/azure-service-bus-lab/architecture" %}

Follow one order and every signal it leaves:

| Hop | What happens | Signal |
|---|---|---|
| Browser → checkout | `POST /api/shop/orders` | trace root (FastAPI span), log `order.sent`, feed line *sent* |
| Checkout → `orders` | AMQP send, MessageId = order id, `traceparent` in properties | span `orders send`, counter `sblab_messages_sent_total{entity="orders"}` |
| Waiting in `orders` | Azure holds it, active count +1 | gauge `sblab_entity_messages{entity="orders", state="active"}` |
| `orders` → fulfillment | peek-lock receive, 30 s lock | span `orders process` (parent: `orders send`), log `order.received` |
| Fulfillment → `order-events` | publish `OrderConfirmed`, then complete | spans `charge card`, `order-events send`; counter `settled{outcome="completed"}`; histogram `sblab_message_wait_seconds` |
| Topic → subscriptions | a copy per matching rule | gauges per subscription |
| Subscriptions → subscribers | one receiver each | spans `billing process`, `shipping process`, `email process`…, log `event.handled` |
| Shipping → `order-events` | publish `OrderShipped` | another `order-events send`; email gets a second copy |
| Every pod → mon | OTLP to the agent collector, then the gateway | everything above, filtered by `cluster = lab-servicebus` |

## What the Experiments Showed
{: #what-the-experiments-showed }

> **TODO:** Replace this list's emulator notes with what the captured Azure run showed (cloud lab:
> needs the author's go-ahead to run).
{: .prompt-warning }

| Experiment | It showed | So in practice |
|---|---|---|
| [1 One order](/posts/labs/azure-service-bus-lab/06-experiments/#exp-one-order) | Three services, no calls between them, one trace held together by `traceparent` in message properties | Propagate trace context yourself through any broker that doesn't |
| [2 Fan-out](/posts/labs/azure-service-bus-lab/06-experiments/#exp-fan-out) | The topic copies; each rule decides; a rule action changes one copy; unread subscriptions keep their copies | Add consumers as subscriptions with rules; watch for subscriptions nobody reads |
| [3 Duplicate](/posts/labs/azure-service-bus-lab/06-experiments/#exp-duplicate) | Two successful sends, one message, because the MessageId repeated inside the window | Derive MessageIds from business ids; make consumers idempotent anyway |
| [4 Competing consumers](/posts/labs/azure-service-bus-lab/06-experiments/#exp-competing-consumers) | More pods drain the same queue faster, each message to exactly one pod | Scale workers on queue depth (KEDA does this); keep prefetch low for slow handlers |
| [5 Poison](/posts/labs/azure-service-bus-lab/06-experiments/#exp-poison) | Abandon → delivery count +1 → dead-letter after the max, done by the broker | Set a max delivery count on every queue and subscription; alert on dead-letter counts |
| [6 Resubmit](/posts/labs/azure-service-bus-lab/06-experiments/#exp-resubmit) | Receive, send a fixed copy with a new MessageId, then complete | Write the repair tool before you need it |
| [7 Least privilege](/posts/labs/azure-service-bus-lab/06-experiments/#exp-least-privilege) | The broker enforces each key's rights | One identity per workload, with only the rights it uses |

The common thread: once a message is in Service Bus, the broker owns its fate. Your code decides
only how it settles each delivery; retries, the dead-letter move, copies to subscriptions, duplicate
drops and expiry all happen in Azure, which is why the lab reads Azure's own counts.

## Limits of This Setup
{: #limits-of-this-setup }

- **Keys, not identities.** The pods use connection strings from namespace-level policies. That's
  simple and visible, but a key is a long-lived secret; production would use Microsoft Entra ID.
- **At-least-once, not exactly-once.** Fulfillment publishes, then completes. A crash in between
  publishes `OrderConfirmed` twice, and the subscribers don't de-duplicate. Duplicate detection on the
  topic, or idempotent handlers keyed on the event's MessageId, would close that gap; this lab leaves
  it open so you can reason about it.
- **No transactions.** Service Bus can complete a received message and send a new one atomically
  (send-via a transfer queue), which would make "publish and complete" one step. The SDK supports it
  in .NET and Java; the Python SDK (7.14) has no transaction support, so the lab doesn't use them.
- **One region, Standard tier.** No geo-replication or disaster recovery pairing, no private endpoint
  (that's Premium), shared capacity, 256 KB messages.
- **The live feed is best effort.** Workers report steps to `shop-web` over HTTP and a lost report only
  means a missing line on the page. Don't build business logic on a side channel like it.
- **Counts poll every 5 s.** Fine for a dashboard, not for autoscaling decisions at sub-second speed.

## Taking It to Production
{: #taking-it-to-production }

What I'd change for a real shop, roughly in order of value:

1. **Managed identities and Entra ID roles** (Azure Service Bus Data Sender / Receiver, scoped to each
   queue or topic), and `disableLocalAuth` on the namespace so no key can be used at all.
2. **Idempotent consumers.** Record processed MessageIds (or make each handler's effect naturally
   repeatable) so a redelivery is harmless, and turn on duplicate detection on the topic too.
3. **Alerts on dead-letter counts** for every queue and subscription, and a runbook (and tool) for
   inspecting and resubmitting, like Experiment 6's.
4. **Autoscaling on queue depth** with KEDA's Azure Service Bus scaler, from zero when the queue is
   empty, instead of a fixed replica count.
5. **Lock renewal** (`AutoLockRenewer`) for handlers that can take longer than the lock duration.
6. **Infrastructure as code** with Bicep or Terraform instead of az CLI scripts, so a change to a
   filter or a max delivery count is reviewed like code.
7. **Premium** if you need VNet integration, private endpoints, large messages or predictable
   latency; plan for its cost.

## Tear Down
{: #tear-down }

```bash
make down
```

It leaves the platform (`lab.sh unregister`), deletes the k3d cluster, and runs `infra/down.sh`, which
deletes the resource group with the namespace and every message in it. Service Bus has no soft delete,
so nothing lingers and the namespace name is free again. `.state/` loses its connection strings and
the namespace name; the next `make up` creates a new namespace with a new suffix.

Check that nothing is left:

```bash
az group show -n rg-sb-lab -o none 2>/dev/null && echo "still there" || echo "gone"
```

From the portal's Labs page, **Destroy** does the same, and the lab runner does it by itself when the
4-hour TTL runs out.

## Go Further
{: #go-further }

- **Sessions.** Send messages with the same SessionId to `playground-sessions` and receive them in the
  Playground: one receiver gets a whole session, in order. Then think about which shop messages need
  per-customer ordering.
- **Auto-forwarding.** Set `--forward-to` on a subscription so its copies land in a queue, and the
  queue's receivers never know a topic was involved.
- **Message deferral.** In the Playground, defer a message and fetch it back by sequence number: the
  pattern for "this message arrived before the one it depends on".
- **KEDA.** Install KEDA in the lab cluster and scale `fulfillment` from 0 to 5 on the `orders` queue's
  length.
- More labs: the [OpenTelemetry lab](/tags/opentelemetry-lab/) goes deeper into traces, logs and metrics,
  and the [Azure Private Endpoint lab](/tags/azure-private-endpoint-lab/) shows how to reach an Azure
  service privately from the DGX.

## Check Your Understanding
{: #check-your-understanding }

<details markdown="1">
<summary>Which of these does Service Bus do for you, and which does your code do: retry a failed message, dead-letter it, de-duplicate within 10 minutes, make the handler idempotent?</summary>

Service Bus redelivers after an abandon or an expired lock, dead-letters after the max delivery count,
and drops duplicate MessageIds within the window. Making the handler idempotent is your code's job:
the broker can't know whether processing a message twice is harmful.

</details>

<details markdown="1">
<summary>Why is "publish the event, then complete the order" safer than the reverse, and what does it cost?</summary>

If the worker crashes between the two steps, the order is redelivered and the event may be published
twice, but nothing is lost. The reverse could complete the order and lose the event. The cost is that
downstream consumers must cope with duplicates.

</details>

<details markdown="1">
<summary>The lab bills about 0.35 USD a day even with no traffic. What is that for, and how do you stop it?</summary>

The Standard tier's hourly base charge for the namespace, whether or not messages flow. Deleting the
namespace stops it; `make down` deletes the whole resource group.

</details>

<details markdown="1">
<summary>You need billing to get every OrderConfirmed in order per customer, at scale. Which two features would you combine?</summary>

Sessions on billing's subscription (with the customer id as SessionId, set by the publisher), and
several billing receivers. Each receiver locks whole sessions, so each customer's events are handled in
order by one receiver at a time, while different customers are handled in parallel.

</details>

{% include lab-nav.html %}
