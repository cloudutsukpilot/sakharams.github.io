---
layout: post
title: "Azure Service Bus Queues and Topics: Experiments"
date: 2026-10-22 00:06:00 +0530
categories: [labs, azure-service-bus-lab]
tags: [Labs, Azure Service Bus Lab, Azure, Service Bus, Messaging]
description: "Perform an action, predict the signal, then check the dashboard and explain what changed (Azure Service Bus Queues and Topics lab)."
lab: azure-service-bus-lab
lab_part: 6
image:
  path: /assets/img/labs/azure-service-bus-lab/06-experiments.webp
  alt: "Azure Service Bus Queues and Topics: Experiments - Labs hero image"
---

Seven experiments, from "one order goes through" to "a poison order is parked and repaired" and "a
key is refused". Each one is a single action on the shop: you predict what Service Bus will do, make
the change, then read the answer off the Shop page and the dashboard. By the end you'll have seen
every behaviour the queue and topic were configured for in Part 3, on purpose.

<!-- more -->

{% include lab-nav.html %}

## How to Run an Experiment
{: #how-to-run-an-experiment }

Each card below gives the goal, the command, a question to answer *before* you run it, how long to
wait, and what to look for on which panel. The loop is always the same:

1. Read the goal and answer the prediction question.
2. Do the action: the button on the Shop or Playground page, or the `make exp-<id>` target from the
   lab repo, which does the same through the API.
3. Wait the stated time: metrics are exported every 10 s, and Tempo's search lags up to a minute
   ([Signal Timing](/posts/labs/azure-service-bus-lab/05-monitor/#signal-timing)).
4. Look at the Shop page and the panels named in the card, then compare with your prediction.

`make verify-<id>` asks mon's Grafana whether the expected signal arrived, and exits non-zero if it
didn't. Run the experiments in order: 6 repairs what 5 breaks, and 4 leaves three fulfillment pods
running (`make reset` puts it back to one).

> **TODO:** Capture every experiment against Azure and mon with `capture.cjs`, and replace each
> "What the screenshots show" with what the images show (cloud lab: needs the author's go-ahead to
> create the namespace). Until then the notes below each card come from a run of the same code against
> Microsoft's Service Bus emulator on 2026-10-21, without Grafana; they say so where they do.
{: .prompt-warning }

## Experiment 1: Follow one order through a queue and a topic
{: #exp-one-order }

{% include lab-experiment.html id="one-order" %}

### What the screenshots show

> **TODO:** Not captured yet. Describe the Shop page's order card and the trace waterfall from the
> real run.
{: .prompt-warning }

In the emulator run, one 120 USD order produced one trace with 13 spans: `POST /api/shop/orders` and
`orders send` on `sblab-web`, `orders process`, `charge card` and `order-events send` on
`sblab-fulfillment`, then `billing process`, `shipping process`, a second `order-events send` (the
`OrderShipped` event) and two `email process` spans on `sblab-subscribers`. The fulfillment log had
`event=order.received ... delivery_count=0` followed by `event=order.completed`.

### Why it happens

The root of the trace is the browser's POST to checkout, and checkout's HTTP response went back long
before the rest of the trace happened: everything after `orders send` is asynchronous. The trace holds
together only because each producer writes a `traceparent` into the message's application properties
and each consumer starts its span from it
([Instrumentation](/posts/labs/azure-service-bus-lab/02-write-the-code/#instrumentation)). Service Bus
itself sits invisibly between the PRODUCER and CONSUMER spans; the gap between them is the time the
message waited in the queue or subscription.

`delivery_count=0` isn't a bug: the Python SDK reports the AMQP header, which counts *earlier*
deliveries. The Shop page shows it as "attempt 1 (delivery count 0)".

## Experiment 2: Fan one event out through subscription filters
{: #exp-fan-out }

{% include lab-experiment.html id="fan-out" %}

### What the screenshots show

> **TODO:** Not captured yet. Give the bar gauge's per-subscription numbers and the analytics step
> from the real run.
{: .prompt-warning }

In the emulator run with a 120 USD and an 800 USD order, only the 800 USD one reached fraud-review,
and its handler logged `riskLevel=high (set by the subscription's rule action)`. Each order produced
one billing, one shipping and two email deliveries, and nothing read analytics: a peek at
`order-events/analytics` later returned 12 messages, two for each of the six orders sent by then.

### Why it happens

The topic doesn't route; it copies. For every message that arrives on `order-events`, Service Bus
evaluates each subscription's rules against the message's properties and writes an independent copy
into each subscription that matches
([the rules in up.sh](/posts/labs/azure-service-bus-lab/03-set-up-infrastructure/#the-cluster)).
billing's and shipping's correlation filters want `subject = OrderConfirmed`, email's SQL filter takes
both subjects, fraud-review's wants `total > 500` as well, and analytics' `$Default` takes
everything. The rule action runs on fraud-review's copy only, which is why the property appears there
and nowhere else.

The copies are independent from then on: billing completing its copy does nothing to email's, and
analytics' copies wait whether or not anyone ever reads them. A subscription is a durable queue, not a
live feed.

## Experiment 3: Send the same order twice
{: #exp-duplicate }

{% include lab-experiment.html id="duplicate" %}

### What the screenshots show

> **TODO:** Not captured yet. Give the sent-vs-completed numbers from the real run.
{: .prompt-warning }

In the emulator run, the order sent twice was received and completed once: one `received` line and
one `completed` line in its card, after a `sent ... twice, same MessageId` line.

### Why it happens

`orders` has duplicate detection with a 10-minute window. Service Bus keeps the MessageIds it has
accepted in that window, and when a second message arrives with one of them, it acknowledges the send
(so the sender sees success) and throws the message away. Checkout uses the order id as the MessageId
([Checkout](/posts/labs/azure-service-bus-lab/02-write-the-code/#the-application)), so a retried request
or a double-click produces the same id.

That's the important part: duplicate detection compares ids, not bodies. A sender that generated a
fresh random id on every attempt would get no protection at all. And it only covers the window; an
exactly-once outcome over longer periods is the consumer's job (an idempotent handler, or a record of
processed ids).

## Experiment 4: Drain a flash sale with competing consumers
{: #exp-competing-consumers }

{% include lab-experiment.html id="competing-consumers" %}

### What the screenshots show

> **TODO:** Not captured yet (the emulator run had one fulfillment process). Describe the timelapse's
> two slopes, the per-pod split and the wait-time panel from the real run.
{: .prompt-warning }

### Why it happens

All three pods receive from the same queue. Each receive locks one message for that pod, so the others
can't get it; when the pod completes it, the message is deleted. Nothing coordinates the pods with each
other, Service Bus hands out messages to whoever asks. That's the competing consumers pattern, and it
is why fulfillment scales by adding replicas with no code change.

Two settings make the split fair. `prefetch_count=0` stops a pod from pulling and locking messages it
hasn't started, and each pod takes one message at a time (`max_message_count=1`). The first pod
completes more than the others because it was alone for the first 30 seconds. While the backlog lasts,
panel 10's wait time climbs: orders are fine, just late, and the customer's checkout never noticed.

## Experiment 5: Dead-letter a poison message
{: #exp-poison }

{% include flow-anim.html id="labs/azure-service-bus-lab/dead-letter" %}

{% include lab-experiment.html id="poison" %}

### What the screenshots show

> **TODO:** Not captured yet. Describe the dead-letter stat, the order card and the log lines from the
> real run.
{: .prompt-warning }

In the emulator run, the order with the declined card was received three times, with delivery counts
0, 1 and 2, and abandoned each time with `reason="card declined"`. Peeking the dead-letter sub-queue
then showed it with `delivery count 3`, reason `MaxDeliveryCountExceeded` and description
`Message could not be consumed after 3 delivery attempts.`

### Why it happens

`abandon_message` gives the message back at once and Service Bus increments its delivery count. When
the count reaches the queue's max delivery count (3,
[set in up.sh](/posts/labs/azure-service-bus-lab/03-set-up-infrastructure/#the-cluster)), the broker
moves the message to the queue's dead-letter sub-queue, `orders/$DeadLetterQueue`. The worker never
decides that; it can't even tell that a given attempt is the last.

Without a max delivery count, a poison message would loop for ever, taking a worker's time on every
pass. A lock that expires (a crashed pod) counts as a delivery too, so a message that kills its worker
is also dead-lettered after three tries. The dead-letter queue has no time to live: a message waits
there until someone receives it.

## Experiment 6: Repair and resubmit a dead-lettered order
{: #exp-resubmit }

{% include lab-experiment.html id="resubmit" %}

### What the screenshots show

> **TODO:** Not captured yet. Describe the dead-letter panel going back to zero and the order card
> from the real run.
{: .prompt-warning }

In the emulator run, **Resubmit** returned `{"resubmitted":["ord-29fbf1"]}`; the order was then
confirmed, billed, emailed and shipped, and the dead-letter sub-queue was empty.

### Why it happens

A dead-lettered message can't be moved back. The resubmit code receives it from the dead-letter
sub-queue in peek-lock mode, sends a copy to `orders` with `manualApproval=true` (so the payment step
accepts it), and completes the dead letter only after that send succeeded
([Getting a dead letter back](/posts/labs/azure-service-bus-lab/02-write-the-code/#the-application)).
If it crashed in between, the dead letter would still be there.

The copy has a new MessageId (`<order id>-retry-<random>`). With the original id it would be dropped
silently: the order was first sent minutes ago, well inside the 10-minute duplicate-detection window
that protected you in Experiment 3. The same feature that saves you from double-clicks can swallow a
repair.

## Experiment 7: Try to send with a listen-only key
{: #exp-least-privilege }

{% include lab-experiment.html id="least-privilege" %}

### What the screenshots show

> **TODO:** Not captured yet. The emulator doesn't check SAS rights, so this one can only be seen on
> Azure. Describe the 401 and the stat panel from the real run.
{: .prompt-warning }

### Why it happens

A connection string is a shared access policy's name and key. The client signs a token with the key,
and Service Bus checks the policy's rights, Send, Listen or Manage, when you open a sender, a receiver
or a management call. `shop-listener` has only Listen, so the send is refused with an authorization
error, and the app returns it to the page as a 401.

This is why each Deployment gets only the keys it needs
([Application Manifests](/posts/labs/azure-service-bus-lab/03-set-up-infrastructure/#application-manifests)):
a leaked fulfillment pod can read orders and publish events, but it can't create, delete or
reconfigure anything. In production you'd go further, with Microsoft Entra ID roles scoped to single
queues or topics, and no keys at all.

## Check Your Understanding
{: #check-your-understanding }

<details markdown="1">
<summary>A fulfillment pod is killed with an order locked. What happens to that order, and when?</summary>

Nothing until its 30-second lock expires. Then it's available again with its delivery count one
higher, and another pod (or the restarted one) receives it. If that happened three times, it would be
dead-lettered like the poison order.

</details>

<details markdown="1">
<summary>A handler needs 45 seconds per order, on a queue with a 30-second lock. What goes wrong, and what are two fixes?</summary>

The lock expires while the handler is still working, so Service Bus hands the order to another pod,
and the first pod's complete fails with a lock-lost error: the order is processed twice and counts a
delivery each time. Either renew the lock while working (`renew_message_lock`, or the SDK's
`AutoLockRenewer`), or raise the queue's lock duration (up to 5 minutes). The Playground's **renew
lock** button is the first fix by hand.

</details>

<details markdown="1">
<summary>Why is a dead-lettered order resubmitted with a new MessageId, but a double-clicked order isn't given one?</summary>

For the double-click you *want* the second message dropped: same order, same id. For the resubmit you
want the copy processed, but the original id is still inside the duplicate-detection window, so it
needs a different one.

</details>

<details markdown="1">
<summary>Three pods share the orders queue. How would you make sure all orders of one customer are processed in order?</summary>

Use a session-enabled queue with the customer id as SessionId. A receiver then locks a whole session,
and messages in it are delivered in order to that receiver only, while other sessions go to other
pods. Try it on `playground-sessions` in the Playground.

</details>

{% include lab-nav.html %}
