---
layout: post
title: "eBPF Lab: Set Up the Infrastructure"
date: 2026-10-11 00:03:00 +0530
categories: [labs, ebpf-lab]
tags: [Labs, eBPF Lab, eBPF, Cilium, Hubble, Tetragon, Falco, OpenTelemetry, Kubernetes]
description: "The cluster, the app manifests and the observability stack that receives the signals (eBPF Lab lab)."
lab: ebpf-lab
lab_part: 3
---

Running eBPF tools inside k3d means running them inside Docker containers that share one kernel with
everything else on the machine. This part goes through the cluster definition, the storage that survives
a rebuild, the app manifests, and how each eBPF tool is set up and scoped. Every k3d-specific
workaround is called out where it appears. At the end you'll know what `make up` is about to build, and why.

<!-- more -->

{% include lab-nav.html %}

## The Cluster
{: #the-cluster }

`k3d/cluster.yaml` creates one server and one agent on the homelab's Docker network:

```yaml
apiVersion: k3d.io/v1alpha5
kind: Simple
metadata:
  name: lab-ebpf
servers: 1
agents: 1
image: rancher/k3s:v1.35.5-k3s1
network: homelab
kubeAPI:
  hostIP: 127.0.0.1
  hostPort: "6450"
ports:
  - port: 127.0.0.1:8091:30091   # demo web app
    nodeFilters: [server:0]
  - port: 127.0.0.1:8092:30092   # Hubble UI
    nodeFilters: [server:0]
  - port: 127.0.0.1:8093:30093   # Falcosidekick UI
    nodeFilters: [server:0]
volumes:
  - volume: /srv/homelab/labs/ebpf-lab:/var/lib/lab-storage
    nodeFilters: [server:0]
  - volume: /srv/homelab/k3s/registries.yaml:/etc/rancher/k3s/registries.yaml
    nodeFilters: [server:*, agent:*]
options:
  k3s:
    extraArgs:
      - arg: --flannel-backend=none
        nodeFilters: [server:*]
      - arg: --disable-network-policy
        nodeFilters: [server:*]
      - arg: --disable-kube-proxy
        nodeFilters: [server:*]
      - arg: --disable=traefik
        nodeFilters: [server:*]
      - arg: --disable=servicelb
        nodeFilters: [server:*]
      - arg: --cluster-cidr=10.100.0.0/16
        nodeFilters: [server:*]
      - arg: --service-cidr=10.101.0.0/16
        nodeFilters: [server:*]
      - arg: --cluster-dns=10.101.0.10
        nodeFilters: [server:*]
```

What each part does:

- **No CNI, no kube-proxy, no policy controller.** `--flannel-backend=none`, `--disable-kube-proxy`
  and `--disable-network-policy` leave networking empty for Cilium. Until Cilium runs, the nodes stay
  `NotReady`. Traefik and ServiceLB are off too; the app is reached through NodePorts.
- **Ports straight to NodePorts** on the server node, all bound to 127.0.0.1. These mappings are fixed
  when the cluster is created; changing one means `make rebuild`.
- **Two nodes** so that some traffic crosses between nodes over VXLAN, which Hubble marks `to-overlay`.
- **The PV folder**: `/srv/homelab/labs/ebpf-lab` on the host is mounted into the server node only, at
  `/var/lib/lab-storage`. No pod mounts it directly (see [Application Manifests](#application-manifests)).
- **`registries.yaml`** sends image pulls through the homelab's Zot mirror. After the first pull, a
  rebuild pulls from the local mirror instead of the internet.
- **Ranges 10.100/10.101**, the first pair reserved for labs on the shared network.

### A BPF filesystem in each node

`make node-prep` runs `scripts/node-prep.sh` after the cluster is created:

```bash
# Cilium pins its maps in a BPF filesystem at /sys/fs/bpf and needs it to be a *shared* mount so
# the pinned maps survive agent restarts and are visible to its other pods. A k3d node is a Docker
# container whose /sys has no bpffs, so we mount a fresh one inside each node (not the host's).
for n in $(docker ps --filter "label=k3d.cluster=$CLUSTER" --filter "label=k3d.role" --format '{{.Names}}' | grep -v serverlb); do
  docker exec "$n" sh -c '
    if [ "$(stat -f -c %T /sys/fs/bpf 2>/dev/null)" != "bpf_fs" ]; then
      mount bpffs /sys/fs/bpf -t bpf
    fi
    mount --make-shared /sys/fs/bpf
    # …
  '
done
```

Docker drops these mounts when a node container restarts, so run `make node-prep` again after a
`k3d cluster start`.

### Cilium

`helm/cilium-values.yaml`, installed by `make cilium` from the vendored 1.20.2 chart:

```yaml
kubeProxyReplacement: true
k8sServicePort: 6443

socketLB:
  enabled: true
  hostNamespaceOnly: true

ipam:
  mode: kubernetes

routingMode: tunnel
tunnelProtocol: vxlan

hubble:
  enabled: true
  relay:
    enabled: true
  ui:
    enabled: true
    service:
      type: NodePort
      nodePort: 30092
  metrics:
    enabled:
      - dns
      - drop
      - tcp
      - flow
      - "httpV2:labelsContext=source_namespace,source_workload,destination_namespace,destination_workload"
    serviceMonitor:
      enabled: false
```

The settings that matter, and the reasons in the values file:

- **`kubeProxyReplacement: true`** makes Cilium's eBPF programs do Service load balancing. The Makefile
  passes `k8sServiceHost` as the server node's address on the homelab network: with no kube-proxy, nothing
  can translate the API server's ClusterIP before Cilium itself is running.
- **`socketLB.hostNamespaceOnly: true`** is the nested-container setting. k3d nodes have a private cgroup
  namespace, so socket-level load balancing attached to the cgroup root never saw pod sockets: pods could
  reach the API server on its node IP but not on 10.101.0.1. With this set, pod traffic to Services is
  translated by the tc programs on each pod's veth instead.
- **`routingMode: tunnel` with VXLAN** keeps pod-to-pod traffic between the two node containers
  independent of the Docker bridge's routing.
- **Hubble metrics** are enabled, but nothing scrapes them: the ServiceMonitor is off, because Cilium
  installs before the monitoring pack brings the ServiceMonitor CRD. Flows are read through the UI and
  `hubble observe`.

### DNS for pods on the homelab network

`make dns` applies `k8s/dns/coredns-custom.yaml`:

```yaml
data:
  upstream.override: |
    forward . 1.1.1.1 8.8.8.8
  home.server: |
    home.cloudutsuk.com:53 {
      errors
      cache 30
      forward . 172.30.0.1:1053
    }
```

k3d points every node's resolver at the network gateway, which inside a node is Docker's embedded
resolver, and pods can't use it: lookups time out. That broke Falco's rule download on the first build.
So CoreDNS forwards public names to public resolvers and the internal zone to the homelab's PowerDNS on
port 1053.

### Joining the platform

`make monitoring` registers the cluster with the platform:

```makefile
monitoring: ## Join the homelab platform: monitoring pack from Argo CD, OTLP token (lab contract v2)
	$(HOMELAB_INFRA)/host/labs/lab.sh register $(CLUSTER) dashboards
	@# OBI sends straight to the gateway (helm/obi-values.yaml), so it needs the token in its namespace.
	$(KUBECTL) create namespace obi --dry-run=client -o yaml | $(KUBECTL) apply -f -
	$(KUBECTL) -n monitoring get secret otlp-token -o jsonpath='{.data.token}' | base64 -d \
	  | $(KUBECTL) -n obi create secret generic otlp-token --from-file=token=/dev/stdin --dry-run=client -o yaml \
	  | $(KUBECTL) apply -f -
```

`lab.sh register` (in infra-local) does four things: it adds the cluster to Argo CD on the `platform`
cluster with the label `homelab/addons=monitoring`, copies the shared labs OTLP token into
`monitoring/otlp-token`, loads `dashboards/ebpf-lab.json` into `mon`'s Grafana (folder Labs), and waits
until Argo CD reports cert-manager and the four monitoring-pack apps `Synced/Healthy`.

## Application Manifests
{: #application-manifests }

### Storage that outlives the cluster

`k8s/storage/storage.yaml` defines a StorageClass with no provisioner and two PersistentVolumes:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: lab-local
provisioner: kubernetes.io/no-provisioner   # static only: nothing is created on demand
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Retain
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: ebpf-lab-redis
  labels: {lab: ebpf-lab}
spec:
  capacity: {storage: 1Gi}
  accessModes: [ReadWriteOnce]
  persistentVolumeReclaimPolicy: Retain
  storageClassName: lab-local
  claimRef: {namespace: demo, name: redis-data}
  local:
    path: /var/lib/lab-storage/redis
  nodeAffinity:
    required:
      nodeSelectorTerms:
        - matchExpressions:
            - {key: kubernetes.io/hostname, operator: In, values: [k3d-lab-ebpf-server-0]}
```

The PV's name, path and `claimRef` are fixed, and its node is pinned. After `make rebuild`, the new
cluster gets a PV with the same name over the same folder, reserved for the same claim, so Redis finds
its old append-only file. `Retain` means deleting the claim never deletes the folder. The second PV,
`ebpf-lab-falco-ui-redis`, does the same for the Falcosidekick UI's event store.

### The app

`k8s/app/app.yaml` creates namespace `demo` and three Deployments. The claim names its PV explicitly:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-data
  namespace: demo
spec:
  storageClassName: lab-local
  volumeName: ebpf-lab-redis
  accessModes: [ReadWriteOnce]
  resources:
    requests: {storage: 1Gi}
```

Redis runs as the host user that owns `/srv/homelab` and writes every change to its append-only file:

```yaml
    spec:
      securityContext: {runAsUser: 1000, runAsGroup: 1000, runAsNonRoot: true}
      containers:
        - name: redis
          image: redis:7.4.2-alpine
          args: ["--appendonly", "yes", "--dir", "/data"]
          readinessProbe: {exec: {command: [redis-cli, ping]}, periodSeconds: 5}
          resources: {requests: {cpu: 20m, memory: 32Mi}, limits: {memory: 128Mi}}
```

The `Recreate` strategy keeps a single writer on the ReadWriteOnce volume. That `redis-cli ping` probe
runs every 5 seconds, and Tetragon sees each one as a process execution; the dashboard filters them out.

The API has two replicas spread across the nodes, so some requests cross nodes:

```yaml
spec:
  replicas: 2                          # spread over both nodes, so some traffic crosses VXLAN
  template:
    spec:
      topologySpreadConstraints:
        - {maxSkew: 1, topologyKey: kubernetes.io/hostname, whenUnsatisfiable: ScheduleAnyway,
           labelSelector: {matchLabels: {app: api}}}
      containers:
        - name: api
          image: ebpf-lab/api:dev
          imagePullPolicy: Never
          env: [{name: REDIS_ADDR, value: "redis:6379"}]
          readinessProbe: {httpGet: {path: /healthz, port: 8080}, periodSeconds: 5}
          resources: {requests: {cpu: 20m, memory: 16Mi}, limits: {memory: 64Mi}}
```

`web` is one replica behind a NodePort Service on 30091. Its readiness probe also hits `/healthz`; those
probes are the steady `/healthz` lines in the dashboard's request panels.

## Observability Stack
{: #observability-stack }

Two different paths leave the lab, plus two local UIs.

**The monitoring pack** (installed by Argo CD): the agent collector, a DaemonSet in namespace
`monitoring`, tails every pod's log file and scrapes the kubelet and cAdvisor on its node; the cluster
collector scrapes kube-state-metrics and the API server. Both add `k8s.cluster.name=lab-ebpf` and send
OTLP to the gateway on `mon`. Tetragon's and Falco's JSON events travel this way, as log lines.

**OBI, straight to the gateway.** OBI must run on the host network (its context propagation needs it).
In this nested setup, Cilium translates neither Service addresses nor host ports for host-network
sockets, so OBI can't reach `agent-collector.monitoring`. It can't resolve `mon`'s names either: the node's
resolver is Docker's. So OBI sends OTLP/HTTPS to `https://otlp.mon.home.cloudutsuk.com` itself, with the
labs token, and `make obi` adds a host alias for that name at `mon`'s fixed ingress address:

```makefile
	$(KUBECTL) -n obi patch ds obi --type merge -p \
	  '{"spec":{"template":{"spec":{"hostAliases":[{"ip":"172.30.0.3","hostnames":["otlp.mon.home.cloudutsuk.com"]}]}}}}'
```

Tetragon and OBI hit the same API-server problem as Cilium, for the same reason: they run on the host
network, where the API's ClusterIP doesn't answer. The Makefile sets `KUBERNETES_SERVICE_HOST` to the
server node's address for both. Without it, OBI has no pod metadata and its namespace rule matches nothing.

### Scoping Tetragon and Falco to the lab

Both see every process on the host. `helm/tetragon-values.yaml` exports only the demo namespace:

```yaml
tetragon:
  clusterName: lab-ebpf
  exportAllowList: |-
    {"namespace":["demo"], "event_set":["PROCESS_EXEC", "PROCESS_EXIT", "PROCESS_KPROBE", "PROCESS_TRACEPOINT", "PROCESS_LSM"]}
  enableProcessCred: true
  enableProcessNs: true
export:
  mode: stdout
```

Falco keeps its stock rules (they're part of the comparison) and adds two lab rules in
`helm/falco-values.yaml`, both limited to `k8s.ns.name = "demo"`:

```yaml
    - rule: Shell in demo pod
      condition: >
        spawned_process and container and k8s.ns.name = "demo"
        and proc.name in (sh, bash, ash, dash)
      output: >
        Shell in demo pod (user=%user.name uid=%user.uid cmdline=%proc.cmdline
        pod=%k8s.pod.name ns=%k8s.ns.name container=%container.name parent=%proc.pname)
      priority: WARNING
      tags: [ebpf_lab, shell, mitre_execution]

    - rule: Network tool in demo pod
      condition: >
        spawned_process and container and k8s.ns.name = "demo"
        and proc.name in (wget, curl, nc, ncat)
      # … priority: CRITICAL, tags: [ebpf_lab, network, mitre_command_and_control]
```

The stock rules are not scoped. They fire for processes anywhere on the host, which is why the
Falcosidekick UI's totals run into the tens of thousands while the lab's own events are a handful. The
Grafana panel keeps only lines tagged `ebpf_lab`. Falco uses the modern eBPF probe
(`driver.kind: modern_ebpf`) and gets pod names from k3s's containerd.

### How each signal is collected

{% include flow-anim.html id="labs/ebpf-lab/signal-paths" %}

### The dashboard

`dashboards/ebpf-lab.json` (uid `ebpf-lab`) is loaded into `mon` by `lab.sh register`. Part 5 goes
through it panel by panel. To change it, edit the JSON and run `make monitoring` again; Grafana's sidecar
on `mon` picks it up within a minute.

## Ports and Endpoints
{: #ports-and-endpoints }

| What | URL or port | How it's exposed |
|---|---|---|
| The app | <http://127.0.0.1:8091> | k3d maps host 8091 to NodePort 30091 on the server node; Cilium forwards it to `web` |
| Hubble UI | <http://127.0.0.1:8092> | NodePort 30092 |
| Falcosidekick UI | <http://127.0.0.1:8093> (login `admin` / `admin`, the chart's default) | NodePort 30093 |
| Kubernetes API | `127.0.0.1:6450`, context `k3d-lab-ebpf` | k3d's server load balancer |
| Grafana (mon) | `https://grafana.mon.home.cloudutsuk.com`, Dashboards › Labs › eBPF lab | The homelab's `mon` cluster, Keycloak sign-in |
| OBI's Prometheus endpoint | port 9090 on each node | `make obi-metrics` port-forwards it |
| OTLP gateway (outbound) | `https://otlp.mon.home.cloudutsuk.com` (172.30.0.3) | Used by OBI and the agent collector |

All four host ports bind to 127.0.0.1, so nothing in the lab, including the Falcosidekick UI's default
login, is reachable from the network.

## Check Your Understanding
{: #check-your-understanding }

<details markdown="1">
<summary>Why does the cluster stay <code>NotReady</code> right after <code>k3d cluster create</code>?</summary>

k3s starts with `--flannel-backend=none`, so there's no CNI until `make cilium` installs one. The kubelet
reports the node not ready while the network plugin is missing.

</details>

<details markdown="1">
<summary>What makes the rebuilt cluster's Redis find the old data, and what would break it?</summary>

The PV `ebpf-lab-redis` is recreated with the same name and path, with `claimRef` reserving it for
`demo/redis-data`, and the claim names `volumeName: ebpf-lab-redis`. Change the folder, the PV name or the
node name in its affinity (for example by renaming the cluster) and the new claim would bind to an empty
folder or stay `Pending`.

</details>

<details markdown="1">
<summary>Why does OBI send to the gateway's public name instead of to the agent collector like everything else?</summary>

OBI runs on the host network, and in this nested k3d setup Cilium doesn't translate Service addresses for
host-network sockets, so the collector's Service is unreachable from OBI. It sends to the gateway
directly, with a host alias because the node's resolver doesn't know the internal zone.

</details>

<details markdown="1">
<summary>The Falcosidekick UI shows tens of thousands of Critical events. Is the lab under attack?</summary>

No. Falco's stock rules aren't limited to namespace `demo`, and its eBPF probe sees the whole host's
syscalls, including the other homelab clusters. The lab's own rules are tagged `ebpf_lab`; filter on that.

</details>

{% include lab-nav.html %}
