---
layout: post
title: "eBPF Lab: Understand and Review"
date: 2026-10-11 00:07:00 +0530
categories: [labs, ebpf-lab]
tags: [Labs, eBPF Lab, eBPF, Cilium, Hubble, Tetragon, Falco, OpenTelemetry, Kubernetes]
description: "What the experiments proved, where this setup stops, and what production would change (eBPF Lab lab)."
lab: ebpf-lab
lab_part: 7
---

You've now seen each eBPF tool do its job, and two of them do less than their configuration promised.
This part puts the whole path back together, lists what each experiment proved, is honest about where
this nested, shared-kernel setup stops, and suggests what you'd change for production. It ends with how
to tear the lab down and five things to try on your own.

<!-- more -->

{% include lab-nav.html %}

## The Full Signal Path
{: #the-full-signal-path }

{% include flow-anim.html id="labs/ebpf-lab/architecture" %}

One visit, end to end, now that you've seen every hop:

1. `curl 127.0.0.1:8091/api/visits` reaches NodePort 30091. Cilium's eBPF translates it to the web pod;
   there is no kube-proxy ([Experiment 1](/posts/labs/ebpf-lab/06-experiments/#exp-cilium-cni)).
2. nginx connects to the `api` Service. Cilium picks one of two API pods on the web pod's veth, and
   about half the time the packet leaves through VXLAN to the other node. Hubble records each flow with
   both identities.
3. The API sends `INCR visits` to Redis, if the policy from
   [Experiment 2](/posts/labs/ebpf-lab/06-experiments/#exp-identity-policy) allows its identity (it
   does; web's doesn't).
4. Redis appends the write to a file on a static PV, outside the cluster
   ([Experiment 7](/posts/labs/ebpf-lab/06-experiments/#exp-rebuild-persists)).
5. OBI times the HTTP and Redis calls from the kernel and pushes metrics once a minute and spans in batches
   to `mon`'s gateway, directly, because it lives on the host network
   ([Experiments 3](/posts/labs/ebpf-lab/06-experiments/#exp-obi-red-metrics) and
   [4](/posts/labs/ebpf-lab/06-experiments/#exp-obi-traces)).
6. If anyone runs a shell or a download tool in a demo pod, Tetragon and Falco write JSON events to
   stdout; the monitoring pack's agent tails them to Loki
   ([Experiments 5](/posts/labs/ebpf-lab/06-experiments/#exp-falco-shell) and
   [6](/posts/labs/ebpf-lab/06-experiments/#exp-tetragon-enforce)).
7. In `mon`, everything carries `cluster="lab-ebpf"`, and the lab's dashboard reads all of it.

## What the Experiments Showed
{: #what-the-experiments-showed }

| Experiment | What it proved |
|---|---|
| [1. See every flow without kube-proxy](/posts/labs/ebpf-lab/06-experiments/#exp-cilium-cni) | Cilium load-balances Services in eBPF with zero iptables Service rules, and Hubble shows every hop, including which ones crossed nodes (`to-overlay`) |
| [2. Drop a connection by identity](/posts/labs/ebpf-lab/06-experiments/#exp-identity-policy) | A policy keyed on labels drops web's SYN to Redis while the API's connections still work; Hubble names the verdict and the reason |
| [3. RED metrics from an app with no instrumentation](/posts/labs/ebpf-lab/06-experiments/#exp-obi-red-metrics) | OBI produces per-route rate, status and p95 latency and per-command Redis metrics for a Go service with no metrics code; they arrive once a minute |
| [4. A trace across web, api and redis](/posts/labs/ebpf-lab/06-experiments/#exp-obi-traces) | OBI joins services into one trace only when they run on the same node; a cross-node request splits into two traces |
| [5. Catch a shell in a container](/posts/labs/ebpf-lab/06-experiments/#exp-falco-shell) | A custom Falco rule catches a non-interactive `kubectl exec` that the stock rule misses, with pod and image metadata |
| [6. Kill a download before it starts](/posts/labs/ebpf-lab/06-experiments/#exp-tetragon-enforce) | Tetragon kills a process inside `execve()`; because `wget` never runs, Falco has nothing to report about it |
| [7. Delete the cluster and keep the data](/posts/labs/ebpf-lab/06-experiments/#exp-rebuild-persists) | A static local PV with a fixed name, path and `claimRef` brings the same data back after a full rebuild, with no `hostPath` in any pod |

## Limits of This Setup
{: #limits-of-this-setup }

- **One shared kernel.** Both k3d nodes, the other homelab clusters and the host itself share one kernel.
  Tetragon and Falco see all of it, which is why they need namespace filters, and why Falco's stock rules
  filled the Falcosidekick UI with tens of thousands of alerts that have nothing to do with the lab.
- **Nested networking.** Inside k3d's node containers, host-network pods can't use Service addresses,
  so Cilium, Tetragon and OBI are pointed at the API server's node address, and OBI exports straight to
  the gateway instead of through the agent collector.
- **Cilium's L7 policy doesn't work here.** The first design of Experiment 2 was an HTTP-aware policy
  allowing only `GET` on the API's read paths. Denied requests got Envoy's 403 and showed in Hubble as
  L7 drops, but allowed requests timed out at Envoy's upstream connection (503). Steering the replies in
  eBPF (TPROXY) and running Envoy inside the agent didn't fix it, so the policy is parked in
  `docs/l7-api-policy.k3d-limitation.yaml` and the experiment uses an L3/L4 policy. On real nodes this is
  a standard Cilium feature.
- **Traces split across nodes.** OBI's trace context didn't cross nodes in this setup (Experiment 4).
  Half the requests are two traces instead of one.
- **Hubble metrics aren't collected.** They're enabled, but their ServiceMonitor is off because Cilium
  installs before the monitoring pack brings the CRD. Flows stay inside the cluster.
- **The Tetragon policy matches a name.** `busybox wget` or a renamed copy gets past it.
- **Default credentials.** The Falcosidekick UI uses the chart's `admin:admin`. It's only reachable on
  127.0.0.1, which is the only reason that's acceptable.
- **Single instances.** One Redis, one Falcosidekick, one OBI per node, one copy of every data store.
  Redis's AOF is durable across rebuilds but there's no backup.
- **Viewer-only Grafana.** The lab's tooling uses a read-only token, so there's no Explore; the dashboard's
  **Trace** variable is the workaround.
- **No alerts.** Nothing pages on a Falco alert or a Tetragon kill; you have to look.

## Taking It to Production
{: #taking-it-to-production }

These are recommendations, not things this lab tested:

- **Run Cilium on real nodes** (VMs or bare metal) where L7 policy, socket-level load balancing and
  host-network Service access behave normally, and turn on Hubble's ServiceMonitor once the CRDs exist.
  Consider Cilium's own Hubble exporter if you need flow logs centrally.
- **Default-deny network policy per namespace**, then allow by identity, as Experiment 2 did for Redis.
- **Scope runtime security to your workloads and tune the stock rules.** Falco's out-of-the-box rules
  are a starting point; in this lab they produced far more noise than signal. Route Falco alerts through
  Falcosidekick to your alerting (Alertmanager, Slack) instead of a UI nobody watches.
- **Enforce on more than names.** For Tetragon, match on file identity or restrict executables with
  something designed for it, and start new policies in observe-only mode (no `Sigkill`) before you enforce.
- **Verify cross-node tracing before relying on it.** If OBI's context doesn't cross your network path,
  add OpenTelemetry SDKs (or an injection point such as the ingress) to the services where trace joins
  matter; keep OBI for the coverage it gives everything else.
- **Storage**: replace static local PVs with a replicated storage class or managed data stores, with
  backups. Static PVs are good for a lab that must survive a rebuild on one host, not for losing a node.
- **Resource limits** on the eBPF agents. They run privileged in every node; their memory counts against
  every node in the cluster.

## Tear Down
{: #tear-down }

```sh
make down
```

`make down` runs `lab.sh unregister lab-ebpf` (Argo CD forgets the cluster and removes its apps, and the
dashboard leaves `mon`), deletes the k3d cluster, removes any node containers k3d left behind and the
image volume, and fails if anything is still there.

What it keeps:

- `/srv/homelab/labs/ebpf-lab/redis` and `falco-ui-redis`: the next `make up` finds the same data. Delete
  the folders yourself for a clean start.
- The lab's data in `mon`: metrics, logs and traces with `cluster="lab-ebpf"` stay for `mon`'s retention
  (15 days).

`make rebuild` is `down` followed by `up`.

## Go Further
{: #go-further }

1. **Find where the cross-node INCR time goes.** Experiment 4 showed INCR at 9.74 ms when the API pod and
   Redis were on different nodes and 0.42 ms on the same node. Pin both API pods to the agent node, then
   to the server node, and compare
   `histogram_quantile(0.95, sum by (le) (rate(db_client_operation_duration_seconds_bucket{cluster="lab-ebpf"}[5m])))`.
   Look at Hubble's flows for the DNS lookup and TCP handshake that each new connection makes.
2. **Make every trace whole.** Delete one API pod and scale to one replica on web's node; run
   `make exp-obi-traces` and check that the split query in
   [Part 5](/posts/labs/ebpf-lab/05-monitor/#explore-queries) finds nothing new.
3. **Get past the Tetragon policy, then close it.** With the policy from Experiment 6 applied, run
   `kubectl exec deploy/web -- busybox wget -q -O /dev/null http://api:8080/healthz`. Expect no Tetragon
   kill, because the path passed to `execve` ends in `/busybox`. Then check whether Falco's *Network tool*
   rule fired and which process name it reports, and extend the Tetragon policy to catch it.
4. **Watch a DNS policy.** Write a CiliumNetworkPolicy that allows the API to reach only `redis` and DNS.
   Expect `DROPPED` flows in Hubble for anything else it tries, such as `nc` from a debug pod with the
   API's labels.
5. **Alert on enforcement.** Add a Loki alert rule in `mon` for
   `{k8s_cluster_name="lab-ebpf", k8s_container_name="export-stdout"} |= "SIGKILL"` and run Experiment 6
   again. Expect the alert in Grafana's alert list within a minute or two.

## Check Your Understanding
{: #check-your-understanding }

<details markdown="1">
<summary>Which of the four eBPF tools could you remove without losing any signal on the dashboard?</summary>

Cilium's Hubble isn't on the dashboard at all, but Cilium itself can't go: it's the cluster's network.
Of the others, each feeds its own panels (OBI the metrics and traces, Tetragon and Falco a log panel
each), so none can go without emptying a panel.

</details>

<details markdown="1">
<summary>Why is Falco alone not enough to stop the download in Experiment 6, and Tetragon alone not enough to tell you about Experiment 5?</summary>

Falco detects and reports; it doesn't block. Tetragon's policy in this lab only kills network tools; it
records every process in demo pods (Experiment 5's shell is in its events too), but it has no rule that
flags a shell as suspicious and no UI or alert that would tell you.

</details>

<details markdown="1">
<summary>A colleague says "OBI gives us distributed tracing for free". What would you add, based on this lab?</summary>

That it gives you spans for free, but whether they join into one trace depends on the path: in this lab,
only same-node calls joined. Test it on your network before you rely on it, and add SDK instrumentation
where whole traces matter.

</details>

<details markdown="1">
<summary>After <code>make down</code>, which data survives, and where?</summary>

The Redis counter and the Falcosidekick UI's events, in `/srv/homelab/labs/ebpf-lab` on the host; and
the lab's metrics, logs and traces in `mon` for its 15-day retention. Hubble's flows and everything else
inside the cluster are gone.

</details>

{% include lab-nav.html %}
