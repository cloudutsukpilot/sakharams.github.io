---
layout: post
title: Kubernetes Interview Questions
categories: [devops, orchestration, kuberentes]
tags: [DevOps, Orchestration, Kubernetes, Interview Questions]
image: /assets/img/devops/orchestration/kubernetes/kubernetes-posts.png
description: Kubernetes interview questions from beginner to expert, with step-by-step answers and production troubleshooting scenarios
interview_domain: devops
interview_topic: Kubernetes
interview_sections:
  Scenario-based (Production):
    level: advanced
    questions:
      1: { level: intermediate }
      2: { level: intermediate }
      3: { level: intermediate }
      6: { level: intermediate }
      10: { level: expert }
      11: { level: expert }
---

## Kubernetes Interview Questions

### Beginner

1. What is Kubernetes? Why should we use Kubernetes?

    - Kubernetes (K8s) is an open-source container orchestration platform, originally built at Google and now maintained by the CNCF. It automates deploying, scaling, networking and healing containerised applications across a cluster of machines.
    - You describe the *desired state* in YAML (for example "3 replicas of this image, reachable on port 80"), and controllers continuously reconcile the *actual state* towards it.
    - Why use it:
        - Containers on one host are easy; hundreds of containers across many hosts need scheduling, restarts, service discovery, rolling updates and scaling, which Kubernetes provides out of the box
        - The same API and manifests work on any cloud or on-prem, so workloads stay portable
        - A large ecosystem (Helm, operators, service meshes, GitOps tools) builds on that one API
    - When *not* to use it: a single small app or a team without the skills to run it is often better served by a simpler platform (ECS, Cloud Run, Azure Container Apps, App Service).

2. What are Kubernetes alternatives?

    | Category | Examples |
    |---|---|
    | Managed container services without Kubernetes | AWS ECS, AWS Fargate, Azure Container Instances, Azure Container Apps, Google Cloud Run |
    | Managed Kubernetes (still Kubernetes, but the control plane is run for you) | Amazon EKS, Azure AKS, Google GKE |
    | Kubernetes-based PaaS / distributions | Red Hat OpenShift, Rancher (RKE2), VMware Tanzu |
    | Lightweight orchestrators | Docker Swarm, HashiCorp Nomad |
    | Lightweight Kubernetes for edge and dev | k3s, k3d, kind, MicroK8s |
    | Serverless functions | AWS Lambda, Azure Functions, Google Cloud Functions |

3. What is the difference between Docker and Kubernetes?

    - **Docker** builds and runs containers: it packages an application and its dependencies into an image (`docker build`) and runs containers from it on *one* host (`docker run`, Docker Compose).
    - **Kubernetes** orchestrates containers across *many* hosts: scheduling onto nodes, restarting failed containers, scaling, service discovery and load balancing, rolling updates and rollbacks, config and secrets.
    - They are complementary, not competitors: you typically build images with Docker and run them on Kubernetes. Docker's own orchestrator, Docker Swarm, is the direct Kubernetes competitor.
    - Since Kubernetes 1.24 (dockershim removed), nodes don't use Docker Engine at all. They run containers through a CRI runtime such as containerd or CRI-O. Images built with Docker still work because they are standard OCI images.

4. What are the benefits of using Kubernetes?

    - **Self-healing**: restarts crashed containers, replaces pods on failed nodes, and stops traffic to pods that fail readiness checks
    - **Scaling**: horizontal pod autoscaling (HPA) on CPU, memory or custom metrics, plus node autoscaling (Cluster Autoscaler, Karpenter)
    - **Zero-downtime releases**: rolling updates with `maxSurge` / `maxUnavailable`, and `kubectl rollout undo`
    - **Service discovery and load balancing**: stable Service names and IPs in front of changing pods, resolved by cluster DNS
    - **Declarative configuration**: desired state lives in Git (GitOps), so changes are reviewable and repeatable
    - **Efficient bin-packing**: the scheduler places pods by resource requests, which raises node utilisation
    - **Storage orchestration**: PersistentVolumes provisioned on demand through CSI drivers
    - **Config and secret management**: ConfigMaps and Secrets decoupled from images
    - **Portability and extensibility**: runs anywhere, and CRDs plus operators extend the API for databases, certificates, etc.

5. Which are the main components of Kubernetes architecture?

    A cluster has a **control plane** (formerly "master") that makes decisions, and **worker nodes** that run the workloads.

    | Layer | Component | What it does |
    |---|---|---|
    | Control plane | `kube-apiserver` | Front door of the cluster: every client and component talks to it over REST; handles authentication, authorisation and admission |
    | Control plane | `etcd` | Consistent key-value store holding all cluster state; only the API server talks to it |
    | Control plane | `kube-scheduler` | Assigns new pods to nodes based on requests, affinity, taints and spread constraints |
    | Control plane | `kube-controller-manager` | Runs reconciliation loops: Deployment, ReplicaSet, Node, Job, EndpointSlice controllers and more |
    | Control plane | `cloud-controller-manager` | Talks to the cloud provider: load balancers, node lifecycle, routes |
    | Worker node | `kubelet` | Agent on every node: watches pods assigned to it, starts them through the container runtime, runs probes and reports status |
    | Worker node | `kube-proxy` | Programs iptables/IPVS rules so Service IPs reach pods (some CNIs such as Cilium replace it) |
    | Worker node | Container runtime | containerd or CRI-O, called by the kubelet through the CRI |
    | Add-ons | CoreDNS, CNI plugin, metrics-server, ingress controller | Cluster DNS, pod networking, resource metrics for HPA, HTTP routing |

    On managed services (EKS, AKS, GKE) the provider runs the control plane; you manage the nodes and add-ons.

6. What are the different built-in APIs for workload management?

    | Resource | Use it for |
    |---|---|
    | Deployment | Stateless apps; manages ReplicaSets to give rolling updates and rollbacks |
    | ReplicaSet | Keeps N identical pods running; you rarely create one directly, a Deployment does |
    | StatefulSet | Stateful apps (databases, Kafka): stable pod names (`db-0`, `db-1`), ordered start/stop, a PersistentVolumeClaim per pod via `volumeClaimTemplates`, usually with a headless Service |
    | DaemonSet | One pod per node (or per matching node): log shippers, monitoring agents, CNI and CSI node plugins |
    | Job | Run pods until a task completes successfully (`completions`, `parallelism`, `backoffLimit`) |
    | CronJob | Create Jobs on a schedule: backups, reports, clean-ups |

    ReplicationController is the legacy predecessor of ReplicaSet and shouldn't be used in new manifests.

7. Explain the different stages in the pod lifecycle.

    - A pod's `status.phase` is one of five values:

        | Phase | Meaning |
        |---|---|
        | Pending | Accepted by the cluster, but not all containers are running yet: waiting to be scheduled, pulling images, or running init containers |
        | Running | Bound to a node, all containers created, and at least one is running, starting or restarting |
        | Succeeded | All containers exited with code 0 and won't be restarted (typical for Jobs) |
        | Failed | All containers have terminated and at least one failed (non-zero exit, or killed by the system) |
        | Unknown | The pod's state can't be obtained, usually because the node stopped reporting |

    - Each **container** also has a state: `Waiting`, `Running` or `Terminated`. Values you see in `kubectl get pods` such as `CrashLoopBackOff`, `ImagePullBackOff`, `ContainerCreating` and `OOMKilled` are container reasons, *not* pod phases. `Terminating` isn't a phase either: it means the pod has a deletion timestamp and is in its grace period.
    - Pod **conditions** track progress: `PodScheduled` → `Initialized` → `ContainersReady` → `Ready`. Only `Ready` pods receive Service traffic.
    - Shutdown sequence: the pod is removed from endpoints, the `preStop` hook runs, containers receive SIGTERM, and after `terminationGracePeriodSeconds` (default 30 s) they receive SIGKILL.

### Intermediate

1. What is the relation between Taints & Tolerations and Node Affinity?

    Both influence where the scheduler places pods, but from opposite directions:

    - **Node affinity** is set on the *pod* and *attracts* it to nodes with certain labels.
        - `requiredDuringSchedulingIgnoredDuringExecution`: a hard rule; the pod stays Pending if no node matches
        - `preferredDuringSchedulingIgnoredDuringExecution`: a soft rule with a weight; the scheduler tries but doesn't guarantee it
        - "IgnoredDuringExecution" means pods already running aren't evicted if node labels change later
    - **Taints** are set on *nodes* and *repel* pods; **tolerations** on a pod *allow* (but don't force) it onto a tainted node.
        - Effects: `NoSchedule` (no new pods without a toleration), `PreferNoSchedule` (avoid if possible), `NoExecute` (also evicts running pods that don't tolerate it, optionally after `tolerationSeconds`)
        - Kubernetes uses taints itself, e.g. `node.kubernetes.io/not-ready` and `node.kubernetes.io/unreachable`
    - **The relation:** a toleration doesn't attract and affinity doesn't repel. To *dedicate* nodes (GPU nodes, a team's node pool) you need both: a taint so other pods stay off, and node affinity plus a toleration so the intended pods land there and only there.

    ```yaml
    # Node: kubectl taint nodes gpu-node-1 dedicated=gpu:NoSchedule
    #       kubectl label nodes gpu-node-1 node-type=gpu
    spec:
      tolerations:
        - key: dedicated
          operator: Equal
          value: gpu
          effect: NoSchedule
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: node-type
                    operator: In
                    values: [gpu]
    ```

2. If I use `kubectl proxy` to expose a service on my local machine and can access it via `localhost:port`, can I also access this service from a remote computer using the host machine's IP address?

    - **No, not by default.** `kubectl proxy` binds to `127.0.0.1:8001`, so only the local machine can reach it.
    - Also note what it is: `kubectl proxy` proxies the **Kubernetes API server**, authenticated with *your* kubeconfig credentials. A Service is reached through the API path `http://localhost:8001/api/v1/namespaces/<ns>/services/<svc>:<port>/proxy/`. It is a debugging tool, not a way to publish an application.
    - Ways to allow remote access, from quick-and-dirty to production:

        - **Bind the proxy to all interfaces** (lab use only):

            ```sh
            kubectl proxy --address=0.0.0.0 --accept-hosts='.*'
            ```

            Anyone who can reach that port can then call the Kubernetes API *as you*, with your permissions. Never do this on a shared network.

        - **Port-forward to the Service** (dev and debugging):

            ```sh
            kubectl port-forward svc/my-app 8080:80 --address 0.0.0.0
            ```

        - **NodePort Service:** opens a port (30000–32767) on every node:

            ```sh
            kubectl expose deployment my-app --type=NodePort --port=80 --target-port=8080
            kubectl get svc my-app -o jsonpath='{.spec.ports[0].nodePort}'
            # then browse to http://<node-ip>:<node-port>
            ```

        - **LoadBalancer Service or Ingress / Gateway API** (production): the cloud provider assigns an external IP, or an ingress controller routes HTTP(S) by host and path with TLS:

            ```sh
            kubectl expose deployment my-app --type=LoadBalancer --port=80 --target-port=8080
            ```

### Advanced

1. Liveness, readiness and startup probes: how do you configure them, what probe options exist, what if the service has no HTTP server, and does a TCP probe need extra configuration in the Service?

    **a. How do you configure liveness and readiness probes?**

    - Probes are defined per container in the pod spec and run by the **kubelet** on the node:
        - **Liveness**: "is the process stuck?" If it fails `failureThreshold` times, the kubelet **restarts the container**
        - **Readiness**: "can it serve traffic right now?" If it fails, the pod is **removed from Service endpoints**; no restart
        - **Startup**: "has it finished booting?" Liveness and readiness are held off until it succeeds, so slow-starting apps aren't killed during start-up
    - Liveness should check only the process itself, never shared dependencies such as the database: a DB blip would otherwise restart every pod at once. Readiness can check what the pod needs to serve, with short timeouts.

    ```yaml
    containers:
      - name: api
        image: myorg/api:1.4.2
        ports:
          - name: http
            containerPort: 8080
        startupProbe:
          httpGet: { path: /healthz, port: http }
          periodSeconds: 5
          failureThreshold: 30        # up to 150 s to boot
        livenessProbe:
          httpGet: { path: /healthz, port: http }
          periodSeconds: 10
          timeoutSeconds: 2
          failureThreshold: 3
        readinessProbe:
          httpGet: { path: /ready, port: http }
          periodSeconds: 5
          failureThreshold: 2
    ```

    **b. What options are available for the probes?**

    - Four probe mechanisms:

        | Mechanism | Succeeds when |
        |---|---|
        | `httpGet` | The HTTP response code is 200–399 (supports `path`, `port`, `scheme: HTTPS`, `httpHeaders`) |
        | `tcpSocket` | A TCP connection to the port can be opened |
        | `exec` | The command run inside the container exits with code 0 |
        | `grpc` | The app answers the standard gRPC Health Checking Protocol with `SERVING` (GA since Kubernetes 1.27) |

    - Timing fields (defaults in brackets): `initialDelaySeconds` (0), `periodSeconds` (10), `timeoutSeconds` (1), `successThreshold` (1, and must be 1 for liveness and startup), `failureThreshold` (3), plus a probe-level `terminationGracePeriodSeconds` for liveness and startup.

    **c. What if the service doesn't have an HTTP server?**

    - Use a **`tcpSocket`** probe if the app listens on a port (databases, message brokers, raw TCP services).
    - Use an **`exec`** probe to run a meaningful check inside the container, e.g. `pg_isready`, `redis-cli ping`, or a check that a heartbeat file was touched recently by a worker with no port at all. Exec probes fork a process every period, so keep them cheap.
    - Use a **`grpc`** probe for gRPC services that implement the standard health service.

    ```yaml
    livenessProbe:
      exec:
        command: ["sh", "-c", "pg_isready -U postgres -h 127.0.0.1"]
      periodSeconds: 10
    readinessProbe:
      tcpSocket:
        port: 5432
      periodSeconds: 5
    ```

    **d. If a TCP probe is used, does it need additional configuration in the Service apart from exposing the port?**

    - **No.** Probes don't go through the Service at all. The kubelet on the node connects directly to the **pod IP** and port. The Service only consumes the *result*: a pod that fails readiness is removed from the Service's EndpointSlices.
    - The port doesn't even have to be listed in `containerPort` when you probe it by number; you only need `containerPort` with a `name` if the probe refers to the port by name.
    - What *does* matter:
        - The app must listen on `0.0.0.0` or the pod IP, not `127.0.0.1`, or the kubelet's connection is refused
        - A TCP probe only proves the port accepts connections; a deadlocked process that still holds the socket open passes. Prefer `exec`, `grpc` or `httpGet` when you need a deeper check
        - With a service mesh sidecar (e.g. Istio), the mesh rewrites probes so they reach the app; check the mesh's probe settings if probes behave differently with the sidecar injected

2. What happens in the Kubernetes cluster when a `kubectl` command is executed?

    Take `kubectl apply -f deployment.yaml` as the example:

    1. **kubectl** reads the kubeconfig (cluster URL, credentials, context), validates the manifest on the client side, and sends an HTTPS REST request to the **kube-apiserver**.
    2. **Authentication**: who are you? Client certificate, bearer token, or OIDC / cloud IAM (EKS, AKS, GKE).
    3. **Authorisation**: may you do this? Usually RBAC: can this user `create` / `patch` `deployments` in this namespace?
    4. **Admission control**: *mutating* admission adds defaults and may inject sidecars; then schema validation; then *validating* admission enforces policies (ResourceQuota, Pod Security, OPA Gatekeeper / Kyverno).
    5. The object is **persisted to etcd** and kubectl reports `deployment.apps/my-app created`. At this point nothing is running yet.
    6. **Controllers react** through watches on the API server: the Deployment controller creates a ReplicaSet, and the ReplicaSet controller creates Pod objects (each going through the API server and etcd again).
    7. The **scheduler** sees pods with no `nodeName`, picks a node for each, and writes a binding back to the API server.
    8. The **kubelet** on that node, which watches for pods assigned to it, calls the container runtime (containerd / CRI-O) through the CRI: it creates the pod sandbox, the **CNI** plugin assigns the pod IP, the **CSI** driver mounts volumes, images are pulled, and init containers then app containers start. The kubelet then runs the probes.
    9. The kubelet **reports pod status** to the API server. Once the pod is Ready, the EndpointSlice controller adds its IP to matching Services and **kube-proxy** (or the CNI) updates the forwarding rules.

    - Key points interviewers look for: only the API server talks to etcd; components don't push instructions to each other but *watch* the API server and reconcile; and read commands such as `kubectl get` stop after authentication and authorisation, then read from the API server's cache or etcd.

3. How are pods scheduled in a Kubernetes cluster with multiple nodes?

    1. **Pod created** with no `spec.nodeName`. A pod that already has `nodeName` set bypasses the scheduler.
    2. **Scheduling queue**: pods are ordered by priority (`PriorityClass`), so higher-priority pods are scheduled first.
    3. **Filtering (predicates)**: nodes that *can't* run the pod are removed:
        - Not enough allocatable CPU or memory for the pod's **requests** (requests, not actual usage)
        - `nodeSelector` or required node affinity doesn't match
        - Taints the pod doesn't tolerate
        - Host port conflicts, volume zone or topology constraints, hard `topologySpreadConstraints`, required pod (anti-)affinity
    4. **Scoring (priorities)**: each remaining node gets a weighted score from plugins such as resource balance (least allocated by default), preferred node affinity, preferred pod (anti-)affinity, soft topology spread, and image locality (the image is already on the node). The highest score wins, and ties are broken randomly. In large clusters only a percentage of feasible nodes is scored, for speed.
    5. **No feasible node?** The scheduler tries **preemption**: it evicts lower-priority pods to make room. Otherwise the pod stays `Pending` with a `FailedScheduling` event, which the Cluster Autoscaler or Karpenter watches to add nodes.
    6. **Reserve, permit and bind**: resources are reserved, volumes bound, and the pod is **bound** to the node (`nodeName` written through the API server). From there the kubelet takes over.

    ```sh
    kubectl describe pod <pod> | sed -n '/Events/,$p'   # FailedScheduling reasons, e.g. "0/5 nodes are available: 3 Insufficient cpu, 2 node(s) had untolerated taint"
    ```

### Scenarios: Intermediate

Expected of any engineer who runs workloads on Kubernetes: a methodical walk along the request path.

1. A deployment succeeded, but traffic is still going to the old version. Explain exactly where you start debugging.

    **Scenario:** the pipeline is green, `kubectl rollout status` (or `helm upgrade`) reports success, yet users, and your own `curl`, still get the previous build. The interviewer wants to see you separate "the rollout command exited 0" from "new pods are serving real traffic", and walk the path from the image to the user's browser one hop at a time.

    **Step-by-step answer:**

    1. **Prove what "old version" means.** Hit an endpoint that returns the build version or commit SHA (`/version`, a response header). Check the response headers for cache hits (`x-cache`, `age`) and for which pod answered. Compare a request from inside the cluster with one through the public URL: if the inside one is new, the problem is in front of the cluster.
    2. **Confirm what actually rolled out.** `kubectl get rs -l app=<app>` shows whether a new ReplicaSet was created at all. Compare the image *digest* each pod runs, not just the tag. Usual causes here:
       - The pod template didn't change (same tag, values not updated), so "success" meant "nothing to do"
       - A mutable tag (`:latest`, `:v1`) with `imagePullPolicy: IfNotPresent`, so nodes reuse the cached old image
       - Deployed to the wrong cluster, namespace or kube-context
       - GitOps (Argo CD / Flux) reverted the manual change because Git still holds the old version
    3. **Check that the new pods are behind the Service.** `kubectl get endpointslices -l kubernetes.io/service-name=<svc>` and compare the IPs with the new pods. Look for a selector that still pins the old release (`version: blue`), or an old Deployment/ReplicaSet that is still scaled up and matched by the same selector.
    4. **Walk the routing layer outward.** Ingress or Gateway rule pointing at `myapp-v1`; canary weights still at 100/0 (Argo Rollouts, Flagger, an Istio `VirtualService` or `DestinationRule` subset); a cloud load balancer whose blue/green target group was never swapped; DNS for a blue/green cutover still resolving to the old environment because of TTL or client-side caching.
    5. **Check the caches.** The CDN serving a cached `index.html` or JS bundle (needs an invalidation), browser cache, service workers, static assets uploaded to S3 by a separate step that didn't run.
    6. **Check long-lived connections.** gRPC, HTTP/2 and WebSocket clients keep connections pinned to old pods until they reconnect; session affinity or sticky cookies do the same.
    7. **Check the application layer.** A feature flag that still hides the new behaviour, or config read once at start-up.

    **Fix and prevention:** deploy by immutable tag or digest; add a post-deploy smoke test that calls the *public* URL and asserts the expected version; define "deployment succeeded" as "the new version is verified serving traffic", not "the apply command exited 0".

    ```sh
    kubectl get rs -l app=myapp -n prod
    kubectl get pods -l app=myapp -n prod \
      -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[0].imageID}{"\n"}{end}'
    kubectl get endpointslices -n prod -l kubernetes.io/service-name=myapp -o wide
    curl -sI https://app.example.com/version | grep -iE 'x-cache|age|x-version'
    ```

### Scenarios: Advanced

Senior level: you have to reason about several layers at once and know their defaults.

1. A Kubernetes application is healthy according to `kubectl get pods`, but users report 504 errors. Walk me through your troubleshooting flow.

    **Scenario:** every pod is `Running` and `Ready`, there are no restarts, yet a share of user requests end in `504 Gateway Timeout`. The interviewer wants you to know that a 504 is never produced by the app itself: some proxy in front of it waited for an answer and gave up. "Ready" only proves the readiness probe passes, not that real requests finish in time.

    **Step-by-step answer:**

    1. **Scope it.** All endpoints or one? All users or one region? Constant or since a specific time, a deploy, a scaling event? Pull the 5xx rate and latency per route.
    2. **Find which hop returned the 504.** Check the response headers and error page (`server: awselb/2.0`, NGINX, Envoy). On AWS compare `HTTPCode_ELB_5XX_Count` with `HTTPCode_Target_5XX_Count` and look at `TargetResponseTime`. In ingress-nginx logs look for `upstream timed out (110)`; in Envoy access logs look for the `UT` response flag.
    3. **Line up the timeouts along the chain.** CDN → LB idle timeout (ALB default 60 s) → ingress `proxy-read-timeout` (ingress-nginx default 60 s) → mesh route timeout → app server timeout → DB or HTTP client timeout. When a request legitimately takes 65 s, the outermost 60 s timeout fires. Timeouts should get *shorter* as you move inwards, so the inner layer fails first with a clear error.
    4. **Check whether the app is slow and the probe hides it.** The readiness probe hits `/healthz`, which doesn't touch the database or third-party APIs. Look at p99 latency per endpoint and at traces. Look at saturation: thread pools, DB connection pools, queue depth.
    5. **Check CPU throttling and pauses.** A pod with a CPU limit can be Ready yet throttled for most of each period (`container_cpu_cfs_throttled_periods_total`); long GC pauses look the same.
    6. **Test the network path from the proxy to the pod.** `kubectl exec` into an ingress pod and `curl` the pod IP and the ClusterIP with timing. A NetworkPolicy or security group that *drops* packets shows up as a timeout, not a refusal. Also check for a full conntrack table and stale kube-proxy rules on one node.
    7. **Correlate with endpoint churn.** If the 504s cluster around rollouts or scale-in, pods are being removed while the load balancer still sends them traffic. Add a `preStop` sleep and graceful shutdown, and align the target group's deregistration delay with `terminationGracePeriodSeconds`.

    **Mitigate first, then fix:** roll back if it started with a change, scale out if it's saturation, and raise a timeout only when the slow work is legitimate (better: make it asynchronous). Afterwards, alert on 5xx and latency SLOs measured at the edge, add synthetic checks on real user journeys, and make readiness reflect "can serve requests" without making it fail on every dependency blip.

    ```sh
    kubectl -n ingress-nginx logs deploy/ingress-nginx-controller | grep -E ' 504 |upstream timed out'
    kubectl -n prod exec -it deploy/netshoot -- \
      curl -s -o /dev/null -w 'connect=%{time_connect} ttfb=%{time_starttransfer} total=%{time_total}\n' \
      http://myapp.prod.svc.cluster.local:8080/api/orders
    kubectl top pods -n prod -l app=myapp
    ```

### Scenarios: Expert

Staff / lead level: restoring service under pressure, explaining why staging didn't catch it, and changing the process.

1. A Kubernetes cluster upgrade works in staging but corrupts CoreDNS in production. How do you approach patching and restoring service?

    **Scenario:** after a control-plane and add-on upgrade, CoreDNS pods in production crash-loop, or run but return `SERVFAIL` and wrong answers. Every service-to-service call depends on DNS, so this is effectively a cluster-wide outage. The same upgrade passed in staging. The interviewer wants a restore-first plan, a clear view of what can and can't be rolled back, and an answer to "why didn't staging catch it?".

    **Step-by-step answer:**

    1. **Declare the incident and stop the rollout.** Halt any other cluster upgrades in flight and freeze deploys. If you have another healthy cluster or region, shift traffic to it now; that buys time for everything below.
    2. **Get the facts in two minutes.** CoreDNS pod status, logs and events; the current `coredns` ConfigMap; the image version. Typical causes:
       - A managed add-on update overwrote a customised Corefile (stub domains, forwarders to on-prem DNS, `rewrite` rules) that exists only in production
       - A plugin or option removed in the new CoreDNS version (e.g. `proxy` → `forward`), so CoreDNS refuses to start
       - Missing RBAC for EndpointSlices (CoreDNS 1.8+ watches `discovery.k8s.io` EndpointSlices)
       - The `loop` plugin detecting a forwarding loop because nodes resolve via `127.0.0.53` (systemd-resolved)
       - Memory limits too low for production query volume, so CoreDNS is OOMKilled
    3. **Restore DNS without touching the control plane.** Managed control planes (EKS, AKS, GKE) generally can't be downgraded, so fix forward on CoreDNS, which is just a Deployment in `kube-system`:
       - Re-apply the last known-good Corefile from Git or a pre-upgrade backup
       - If the new image is the problem, roll the CoreDNS Deployment back to the previous version, after checking it supports the new API server version
       - Scale replicas up so the deployment survives restarts; NodeLocal DNSCache, if present, keeps answering cached names in the meantime
    4. **Verify from inside the cluster.** Resolve `kubernetes.default`, an internal service, an on-prem zone and an external name from pods on several nodes. Watch the application error rate fall. Restart workloads that crashed or cached failed lookups while DNS was down.
    5. **Explain why staging passed.** Diff staging and production: Corefile customisations, managed vs self-managed add-on, query volume, node OS image and `resolv.conf`, the version you upgraded *from*, admission policies. The answer is almost always "staging is not production-like for this component".
    6. **Prevent it.** Keep the Corefile in Git and manage it through the same GitOps path in every environment; back up `kube-system` ConfigMaps before upgrades; on EKS update add-ons with `--resolve-conflicts PRESERVE`; upgrade the control plane and add-ons as separate, gated steps; run a DNS smoke test as a gate after each step; canary upgrades on the lowest-risk production cluster first, or blue/green clusters; read the CoreDNS release notes for plugin deprecations; give CoreDNS a PodDisruptionBudget and proportional autoscaling.

    ```sh
    kubectl -n kube-system get pods -l k8s-app=kube-dns -o wide
    kubectl -n kube-system logs -l k8s-app=kube-dns --tail=50
    kubectl -n kube-system get configmap coredns -o yaml > coredns-now.yaml
    kubectl apply -f git/kube-system/coredns-configmap.yaml       # last known-good Corefile
    kubectl -n kube-system rollout undo deployment/coredns         # only if the image is at fault
    kubectl run dnscheck --rm -it --image=busybox:1.36 --restart=Never -- nslookup kubernetes.default
    ```

### Scenario-based (Production)

1. How would you debug a pod stuck in `ContainerCreating`? What are your next 3 CLI commands?

    - `kubectl describe pod <pod> -n <ns>`: read the Events (FailedMount, FailedCreatePodSandBox, Pulling)
    - `kubectl get events -n <ns> --sort-by=.lastTimestamp`: wider context (PVC, node, CNI)
    - `kubectl get pod <pod> -o wide`, then on that node: `journalctl -u kubelet`, `crictl pods`
    - Usual causes: CNI failure or pod IP exhaustion (VPC CNI), PVC not bound / volume Multi-Attach error, missing Secret/ConfigMap, very large image still pulling

2. One node keeps killing workloads. What evidence do you collect before touching it?

    - `kubectl describe node`: conditions (MemoryPressure, DiskPressure, PIDPressure), allocatable vs requests
    - Pod termination reasons: `OOMKilled`, `Evicted`, exit codes; node events
    - On the node: `journalctl -u kubelet`, `dmesg` (kernel OOM killer, hardware/ECC/NIC errors), `df` on nodefs/imagefs
    - Pods without requests/limits acting as noisy neighbours
    - Compare its instance type, AMI and kernel with healthy nodes
    - Cordon (don't reboot) to stop new scheduling and keep the evidence; then drain and replace

3. Pods are Ready. Service endpoints exist. Users still receive 503. Where do you start?

    - Find who returns the 503: cloud LB, ingress controller, mesh sidecar, or the app itself
    - Bisect hops: `kubectl port-forward` to the pod → curl the ClusterIP from another pod → ingress → LB
    - Service `targetPort` vs container port; app listening on `127.0.0.1` only
    - Ingress pointing at the wrong service/port; controller logs show "no endpoints"
    - NetworkPolicy blocking the ingress controller namespace
    - Mesh: Envoy response flags (`UH`, `UF`), mTLS mode mismatch, outlier ejection/circuit breaker
    - LB target-group health (instance vs IP mode); app-level rate limiting or overload

4. DNS works from your laptop but fails intermittently inside Kubernetes. What layers do you isolate?

    - Pod `resolv.conf`: `ndots:5` + search domains multiply queries per lookup
    - CoreDNS: replicas, CPU/OOM, logs, `coredns_dns_request_duration_seconds`
    - conntrack race on parallel UDP A/AAAA lookups (classic 5 s timeouts); conntrack table full
    - Upstream resolver limits (e.g., AWS VPC resolver packets-per-second per ENI)
    - NetworkPolicy blocking port 53 (UDP *and* TCP)
    - Test with a netshoot pod (`dig`) on different nodes; fix with NodeLocal DNSCache, FQDN with trailing dot, lower `ndots`

5. Gradual increase in latency across the NGINX ingress, but CPU/memory are stable. Next move?

    - Compare `$request_time` vs `$upstream_response_time` in access logs: both high → backend; gap → ingress itself
    - Gradual means something is accumulating: connections, TIME_WAIT, conntrack entries, ephemeral ports
    - Upstream keepalive not configured, so there's a new connection per request
    - `worker_connections` limit, frequent config reloads from endpoint churn
    - CPU throttling of the controller pod despite low average CPU
    - Log volume/disk, TLS session cache

6. HPA refuses to scale even though Prometheus shows CPU > 80–90%. Root cause and fix?

    - `kubectl describe hpa`: conditions AbleToScale / ScalingActive / ScalingLimited, `FailedGetResourceMetric`
    - HPA uses metrics-server, not Prometheus; is the `v1beta1.metrics.k8s.io` APIService available?
    - HPA % is relative to *requests*; Prometheus often shows % of node or limit. No requests set means no scaling
    - Multi-container pods: a low-usage sidecar dilutes the average (use `ContainerResource` metrics)
    - Already at `maxReplicas`; stabilisation window / scale-up policies; unready pods excluded
    - HPA did scale, but new pods are Pending: cluster capacity, ResourceQuota, autoscaler limits

7. How would you monitor HPA scaling decisions in real time and detect metrics-server lag?

    - `kubectl get hpa -w`, HPA events
    - kube-state-metrics: desired vs current replicas; alert when they differ for N minutes
    - metrics-server: APIService availability, scrape errors, `--metric-resolution` (default 15 s), `kubectl top` timestamps
    - HPA sync period (15 s) + scrape interval + adapter rule interval (prometheus-adapter/KEDA) = total reaction lag

8. Walk through advanced probe configurations to detect business-logic failures, not just HTTP 200.

    - `startupProbe` for slow boot; readiness = "can I serve?" (model loaded, cache warm, critical config valid)
    - Liveness must stay shallow; never check shared dependencies (a DB blip would restart every pod)
    - Readiness endpoint can validate a cheap internal invariant with strict timeouts
    - Exec and gRPC probes for non-HTTP services; tune `timeoutSeconds`, `periodSeconds`, `failureThreshold`
    - Real business failures are better caught by synthetic transactions and SLO alerts than by probes

9. What's your approach to multi-zone pod affinity/anti-affinity so a node or zone failure doesn't break regional SLAs?

    - `topologySpreadConstraints` on `topology.kubernetes.io/zone` (maxSkew 1) plus hostname spread
    - Preferred pod anti-affinity on hostname
    - PodDisruptionBudgets; one node group per AZ for the autoscaler
    - Capacity for N-1 zones: the remaining zones must absorb the lost zone's load
    - Stateful: zonal volumes (EBS) pin pods to a zone; plan replicas per zone

10. Explain how you'd leverage eBPF + Cilium to enforce network policies at runtime, and the advantages over traditional CNIs.

    - eBPF programs in the kernel; policies keyed on label-based security identities, not pod IPs
    - No long iptables chains; map lookups scale with cluster size; kube-proxy replacement
    - L7-aware policies (HTTP, gRPC, Kafka) and DNS/FQDN egress policies
    - Hubble: flow visibility with drop reasons
    - Tetragon: process/syscall-level runtime enforcement
    - Caveats: kernel version requirements, a different debugging toolset

11. You deployed a Cilium update, and inter-pod communication breaks for one namespace. How do you confirm the root cause?

    - One namespace points to namespace-specific config: CiliumNetworkPolicy, default-deny, namespace labels feeding identities
    - `hubble observe --namespace <ns> --verdict DROPPED`: drop reason (policy denied, etc.)
    - `cilium status`, `cilium-dbg endpoint list` (policy enforcement state, identities), `cilium-dbg policy get`
    - Upgrade notes: changed policy semantics/defaults, endpoints not regenerated after upgrade
    - Confirm: test pod in that namespace vs another; reproduce in staging; roll back

12. Helm rollback worked. App still broken. Logs silent. What now?

    - Helm rolls back manifests only, not DB schema/data, external secrets/config, CRDs or PVs
    - Verify what's actually running: image digests, `kubectl rollout status`, ConfigMaps (pods not restarted after a config change)
    - Silent logs: is traffic arriving at all? Service selectors/endpoints, ingress, NetworkPolicy, mesh
    - Broken log pipeline (fluent-bit) or log level
    - Out-of-band changes: feature flags, dependencies
    - Use traces/metrics; `kubectl exec` and curl locally

13. Your Karpenter setup just doubled costs overnight. Fix it without disrupting autoscaling.

    - What changed: NodePool spec, new workload, inflated requests, spot capacity unavailable → on-demand fallback
    - Consolidation off or set to `WhenEmpty`; `do-not-disrupt` annotations or strict PDBs blocking consolidation
    - Instance requirements too broad (large or expensive families)
    - Fix: NodePool `limits`, tighter instance families/capacity types, consolidation `WhenEmptyOrUnderutilized` with disruption budgets (rate/schedule), right-size requests
    - Track cost per namespace/NodePool (Kubecost) with alerts
