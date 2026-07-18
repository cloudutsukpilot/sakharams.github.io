---
layout: post
title: Minikube - The two-node minikube cluster that refused to become two nodes
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
image: /assets/img/devops/orchestration/kubernetes/kubernetes-posts.png
description: A detailed look into the challenges faced while setting up a two-node Minikube cluster and how to troubleshoot them.
---

# The two-node minikube cluster that refused to become two nodes

*Sakharam Shinde — July 7, 2026*

I'd like to say I spent a productive Monday morning shipping features. What I
actually spent it on was a single `minikube node add` command that took a
scenic route through the Kubernetes stack, the Azure Files CSI driver, and my
company's Zscaler proxy before finally working.

If you're running minikube behind a corporate proxy and you've ever seen this
line hang for the better part of a coffee break, this post is for you:

```text
🐳  Preparing Kubernetes v1.30.4 on Docker 29.2.1 ...
🔎  Verifying Kubernetes components...
```

## The setup — or how we got into this

I was moving our State-of-DevOps setup off k3d and onto minikube. On k3d, we
mount a real Azure File Share into `/data` inside the cluster so cronjobs can
share collected data with the dashboard. That means installing the Azure Files
CSI driver into the cluster, the same way k3d does it in
[`k3d/create-cluster.sh`](../../k3d/create-cluster.sh).

I copied that install step into
[`minikube/create-cluster.sh`](../../minikube/create-cluster.sh), ran it, and
smugly waited for a green tick. Instead I got:

```text
0/1 nodes are available: 1 node(s) didn't have free ports for the requested
pod ports. preemption: 0/1 nodes are available: 1 node(s) didn't have free
ports for the requested pod ports.
```

One of the two `csi-azurefile-controller` replicas was stuck `Pending`. The
other was happily running. The single-node minikube cluster had exactly one
node's worth of ports to offer, and the driver wanted two.

## Why the CSI driver wants two nodes

A quick look at the deployment made the "why" obvious:

```yaml
spec:
  template:
    spec:
      hostNetwork: true
      containers:
        - name: azurefile
          ports:
            - containerPort: 29614   # /metrics
              protocol: TCP
```

`hostNetwork: true` + a fixed port `29614` = **one pod per node, max**. On a
2-node k3d cluster the two replicas each grab their own node's port 29614 and
go about their day. On a 1-node minikube profile, the second replica sits
`Pending` forever because there's no second node to put it on. Kubernetes did
exactly what it said it would do; I just hadn't read the fine print.

I had two ways out:

1. Scale the controller down to `replicas=1`. It's a fine choice for a dev
   cluster — one replica works, you just lose leader-election redundancy that
   nobody was going to notice on a laptop anyway.
2. Add a second node so the controller can run the way its authors intended.

I went with option 2. This is a dev environment that will grow more workloads
over time, and pretending we're production while running on a single node has
a way of masking bugs that only surface when you finally scale up.

Adding a node in minikube is a one-liner:

```bash
minikube node add -p state-of-devops
```

## The part where nothing worked for 20 minutes

That command ran. And ran. And ran.

```text
😄  Adding node m02 to cluster state-of-devops as [worker]
👍  Starting "state-of-devops-m02" worker node in "state-of-devops" cluster
🚜  Pulling base image v0.0.50 ...
🔥  Creating docker container (CPUs=4, Memory=2200MB) ...
🌐  Found network options:
    ▪ HTTP_PROXY=http://165.225.120.36:80
    ▪ NO_PROXY=localhost,127.0.0.1,::1,192.168.1.19
❗  Failing to connect to https://registry.k8s.io/ from inside the minikube container
🐳  Preparing Kubernetes v1.30.4 on Docker 29.2.1 ...
🔎  Verifying Kubernetes components...
```

And that was it. `Verifying Kubernetes components...` for as long as I was
willing to stare at the terminal.

The temptation here is to blame `registry.k8s.io`. It's right there in the
output shouting about a failing connection. It looks like the smoking gun.
It is a red herring.

Here's what's actually happening inside that container. When minikube starts a
new node it:

1. Boots a container with your `HTTP_PROXY` / `NO_PROXY` env vars threaded
   through (so anything inside can reach the outside world through Zscaler).
2. Starts `kubelet` on that container.
3. `kubelet` reaches out to the existing control-plane API server at
   `https://192.168.58.2:8443` to say "hi, I'd like to join."

Step 3 is where the whole thing falls apart. `192.168.58.2` is a **private
docker network address on my laptop**. But `NO_PROXY` doesn't list it, so
`kubelet` dutifully sends the API-server traffic to `http://165.225.120.36:80`
— my corporate Zscaler proxy — and asks it to please route TLS-encrypted
Kubernetes API traffic to a private IP on the same machine Zscaler will never
be able to reach.

Zscaler shrugs. `kubelet` times out. The join never happens. `Verifying
Kubernetes components...` stays on the screen until the heat death of the
universe (or until I hit Ctrl-C, whichever came first).

The `registry.k8s.io` warning is a separate pre-flight probe from a different
code path; it's noisy but not fatal. The actual failure is silent, which is
somehow worse.

## The fix, once you can see it

Once the mental model clicked, the fix was small. Everything private on my
laptop that new nodes need to reach — the docker network the profile lives
on, the pod CIDR, the service CIDR, in-cluster DNS — needs to be in
`NO_PROXY`:

```bash
export NO_PROXY="$NO_PROXY,192.168.58.0/24,192.168.49.0/24,10.244.0.0/16,10.96.0.0/12,.svc,.svc.cluster.local"
export no_proxy="$NO_PROXY"
```

What each range does:

| CIDR / suffix | What it covers |
|---|---|
| `192.168.58.0/24` | The docker network my `state-of-devops` profile is on. Both `192.168.58.2` (control plane) and `192.168.58.3` (new node) live here. |
| `192.168.49.0/24` | Default minikube docker network for other profiles. |
| `10.244.0.0/16` | Pod CIDR — kindnet / kubenet default. |
| `10.96.0.0/12` | Service CIDR — the Kubernetes default. |
| `.svc`, `.svc.cluster.local` | In-cluster DNS suffixes for Services. |

Then delete the half-built broken node and try again:

```bash
minikube node delete state-of-devops-m02 -p state-of-devops
minikube node add -p state-of-devops
```

This time:

```text
🐳  Preparing Kubernetes v1.30.4 on Docker 29.2.1 ...
🔎  Verifying Kubernetes components...
✅  Node state-of-devops-m02 successfully joined the cluster
```

The `Verifying Kubernetes components...` line still appeared. But this time
it *left*. That's how you know it's working.

## The bug behind the bug: no CNI

Except it *wasn't* working. Not yet. Six minutes after that ✅ I got:

```text
❌  Exiting due to GUEST_NODE_ADD: failed to add node: wait 6m0s for node:
   waiting for node to be ready: WaitNodeCondition: context deadline exceeded
```

`kubectl get nodes` confirmed it: `m02` was `NotReady`. Kubelet described the
condition helpfully:

```text
NetworkPluginNotReady: cni plugin not initialized
```

I scrolled back through the earlier `minikube node add` output and there,
several screens up, was a warning I had skimmed past both times:

```text
❗  Cluster was created without any CNI, adding a node to it might cause broken networking.
```

Well.

Here's what happened. When minikube starts a **single-node** profile, its
default `--cni=auto` resolves to *no CNI at all* — the container bridge
handles pod networking just fine when there's only one host. When you start
a **multi-node** profile from scratch (`--nodes>=2`), that same `auto`
resolves to `kindnet` and installs it. The choice is baked in at cluster
creation time.

My `state-of-devops` profile predated the `MK_NODES` change in the script.
It had been created single-node, without a CNI. Adding `m02` to it later
meant:

1. `kubelet` on `m02` joined the API server ✓ (thanks, `NO_PROXY`).
2. `kubelet` looked for a CNI plugin to set up pod networking. There wasn't
   one.
3. `kubelet` marked the node `NotReady` with `NetworkPluginNotReady`.
4. minikube waited its full 6 minutes for `Ready`, gave up, exited.

You can't retroactively install a CNI on a running minikube cluster in any
way that isn't fragile. The reliable answer is: recreate the profile with
`--nodes=N` from the start, so `--cni=kindnet` is applied at bootstrap.

I updated `create-cluster.sh` to be explicit about it:

```bash
if [[ "$MK_NODES" -ge 2 ]]; then
    CNI_ARG=(--cni=kindnet)
else
    CNI_ARG=()
fi
minikube start -p "$PROFILE" \
    --kubernetes-version="$K8S_VERSION" \
    --nodes="$MK_NODES" \
    "${CNI_ARG[@]}" \
    ...
```

And, because the same script also handles the "profile already exists, just
add nodes" upgrade path, I added a hard fail with a clear message when the
running profile has no CNI, instead of triggering the same 6-minute hang for
the next person:

```text
ERROR: profile 'state-of-devops' has 1 node(s) but no CNI installed
       (currently: 'auto'). Adding a worker node will make it join but stay
       NotReady forever, then time out after 6 min with GUEST_NODE_ADD.

       Recreate the profile from scratch so kindnet is bootstrapped correctly:

           minikube delete -p state-of-devops
           MK_NODES=2 PROFILE=state-of-devops bash minikube/create-cluster.sh
```

Then I did exactly that:

```bash
minikube delete -p state-of-devops
MK_NODES=2 PROFILE=state-of-devops bash minikube/create-cluster.sh
```

And this time it actually worked:

```text
NAME                  STATUS   ROLES           AGE   VERSION
state-of-devops       Ready    control-plane   3m    v1.30.4
state-of-devops-m02   Ready    <none>          2m    v1.30.4

NAME                                        READY   STATUS    NODE
csi-azurefile-controller-xxxxxxx-aaaaa      5/5     Running   state-of-devops
csi-azurefile-controller-xxxxxxx-bbbbb      5/5     Running   state-of-devops-m02
```

Both nodes `Ready`. Both CSI controller replicas `Running`, one per node,
each holding its own port 29614. Which is what I'd been trying to get to
since roughly two coffees ago.

## Things I learned (or was reminded of)

**Proxies don't understand your private networks.** Any environment that
passes `HTTP_PROXY` through to containers needs a matching `NO_PROXY` that
lists every internal address range those containers might talk to. Missing
even one is enough for something upstream to hang forever without a useful
error message.

**"Failing to connect to registry.k8s.io" is almost never the actual problem.**
It's a pre-flight probe that fails easily behind a TLS-intercepting proxy
because the probe doesn't trust the proxy's cert. Meanwhile the *real* image
pulls happen through `HTTP_PROXY` and succeed. When you see that warning,
scroll past it and look for what actually stopped.

**Single-node k8s hides a lot of bugs.** The CSI controller happily running
one of its two intended replicas on the single-node cluster looked "fine" in a
Helm install log. You only find out something is wrong when you `kubectl
describe` the Pending pod, or when the primary replica crashes and there's no
warm secondary to take over. If your dev cluster doesn't at least *look* like
your prod cluster, you'll ship these problems to prod.

**Every warning you skimmed past is worth reading again after you get stuck.**
The CNI warning had been in the `minikube node add` output *both times* I
ran it — before and after the `NO_PROXY` fix. I ignored it the first time
because everything failed before it mattered. I ignored it the second time
because I was already celebrating. The debugging clock finally moved when I
went back and re-read the output slowly, this time assuming that any yellow
`❗` I hadn't understood was potentially the answer.

**When something hangs, look at what it's talking to, not what it's saying.**
The most useful debugging move here wasn't reading more minikube output. It
was noting the source and destination IPs of the traffic that had to happen
next — `kubelet` at `192.168.58.3` talking to the API server at
`192.168.58.2` — and asking whether the network policy in play would allow
that. It wouldn't. Everything else followed.

## The final script change

I baked three things into `minikube/create-cluster.sh`:

- `MK_NODES=2` by default, with `--cni=kindnet` explicitly applied when
  creating a multi-node profile so we don't quietly regress if minikube's
  `--cni=auto` heuristic changes.
- A guard in the "add nodes to an existing profile" path that refuses to run
  against a CNI-less cluster, with a clear message and the exact commands to
  recreate it. Six-minute silent hangs deserve to be replaced with two-line
  loud errors.
- Reconciliation of `csi-azurefile-controller` back to `replicas=2` on every
  run, so a laptop that briefly ran on one node during troubleshooting
  automatically returns to the intended two-replica setup once it has two
  nodes again.

Anyone else on the team will get the multi-node experience automatically —
and if their profile is still on the old single-node layout, the script will
tell them exactly what to do instead of hanging on them.

Which was, if we're honest, the whole point of writing it down. Every hour I
spent on this is an hour someone else on the team now doesn't have to. That
math is one of the more satisfying things about writing about the debugging,
even when — especially when — the bug itself was mostly me and a proxy
misunderstanding each other for twenty minutes, followed by me and a
one-line CNI warning misunderstanding each other for six more.

Time for lunch.
