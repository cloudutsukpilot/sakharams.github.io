---
layout: post
title: Kubernetes - StatefulSets
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
image: /assets/img/devops/orchestration/kubernetes/kubernetes-posts.png
description: Explore StatefulSets in detail, understand their importance, and see how to use them effectively in Kubernetes.
---

## Introduction

Kubernetes is widely used for orchestrating containerized applications, but not all workloads are stateless. Some applications, like databases, message queues, and distributed storage systems, require persistent identities and stable network endpoints. This is where StatefulSets come into play.

### What is a StatefulSet?

- A StatefulSet is a Kubernetes workload API object used to manage stateful applications.
- Unlike Deployments, which are used for stateless workloads, StatefulSets ensure that each pod has a unique, stable identity and persistent storage, even when restarted or rescheduled.
- StatefulSets are specifically designed for stateful applications that require stable network identities, persistent storage, and ordered deployment or scaling

### Key Features of StatefulSets

- `Stable Network Identity` – Each pod in a StatefulSet has a unique and stable hostname in the format `pod-name-<ordinal>`, which remains unchanged even if the pod is rescheduled.
- `Ordered, Predictable Deployment and Scaling` – Pods in a StatefulSet are created and deleted sequentially in order, following a defined sequence.
- `Stable Persistent Storage` – Each pod is associated with a persistent volume claim (PVC) that retains data even when the pod is deleted or rescheduled.
- `Graceful Rolling Updates` – Updates to StatefulSet pods happen in a controlled, sequential manner to avoid disruptions.

### When to Use StatefulSets?

- StatefulSets are ideal for applications that require:
  - `Persistent data storage` (e.g., databases like MySQL, PostgreSQL, MongoDB, Cassandra, etc.)
  - `Stable network identity` (e.g., applications that require a fixed hostname or DNS record)
  - `Ordered deployment and scaling` (e.g., applications that rely on a startup sequence)
  - `Ordered updates and termination` (e.g., applications that require a controlled rollout and rollback process)

### Components of a StatefulSet ⚙️

- A StatefulSet consists of the following components:

1. `Pods` - Individual instances of an application, each with a unique identity.
2. `Persistent Volume Claims (PVCs)` - Storage associated with each pod that persists data beyond the lifecycle of the pod.
3. `Headless Service` - A Service without a cluster IP that provides stable DNS entries for StatefulSet pods.
4. `Ordinal Index` - Each pod is assigned a numeric index (starting from 0) that determines its order in the StatefulSet.

### StatefulSets vs. Deployments: Similarities & Differences ⚖️

| Feature         | StatefulSet                                      | Deployment                          |
|-----------------|--------------------------------------------------|-------------------------------------|
| Pod Identity    | Stable, with unique names (e.g., web-0, web-1)   | Ephemeral, all pods are identical   |
| Storage         | Uses persistent volumes attached to specific pods| Typically uses ephemeral storage    |
| Scaling         | Follows an ordered scaling strategy              | Scales pods randomly                |
| Network Identity| Pods have stable DNS names                       | Pods share a common service name    |
| Rolling Updates | Updates happen in sequence, ensuring stability   | Updates occur in parallel           |

### How StatefulSets Depend on Services for Naming

- StatefulSets rely on Headless Services (spec.clusterIP: None) to provide stable network identities.
- Instead of a single service name resolving to multiple IPs, each pod gets a stable DNS entry.

### Creating a StatefulSet in Kubernetes ⚙️

- Let's deploy a simple StatefulSet running an Nginx web server.

#### Step 1: Define a Headless Service

- Create a YAML file (nginx-service.yaml) for a headless service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-headless
  labels:
    app: nginx
spec:
  ports:
    - port: 80
      name: web
  clusterIP: None  # Headless service
  selector:
    app: nginx
```

```sh
kubectl apply -f nginx-service.yaml
```

#### Step 2: Define the StatefulSet

- Create a YAML file (nginx-statefulset.yaml) for the StatefulSet:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: nginx
spec:
  serviceName: "nginx-headless"
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80
        volumeMounts:
        - name: www
          mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
  - metadata:
      name: www
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 1Gi
```

```sh
kubectl apply -f nginx-statefulset.yaml
```

#### Step 3: Verify the StatefulSet ✅

- Check the pods:

```sh
kubectl get pods -l app=nginx
```

- You should see something like:

```sh
NAME      READY   STATUS    RESTARTS   AGE
nginx-0   1/1     Running   0          10s
nginx-1   1/1     Running   0          10s
nginx-2   1/1     Running   0          10s
```

- Describe a specific pod to see its details:

```sh
kubectl describe pod nginx-0
```

#### Step 4: Accessing the Pods

- Since we used a headless service, each pod will have a DNS record following this pattern:

```sh
nginx-0.nginx-headless.default.svc.cluster.local
nginx-1.nginx-headless.default.svc.cluster.local
nginx-2.nginx-headless.default.svc.cluster.local
```

- You can exec into a pod and test connectivity:

```sh
kubectl exec -it nginx-0 -- /bin/sh
```

```sh
curl nginx-1.nginx-headless
```

### Scaling a StatefulSet

- To scale up the StatefulSet:

```sh
kubectl scale statefulset nginx --replicas=5
```

- To scale down:

```sh
kubectl scale statefulset nginx --replicas=2
```

### Deleting a StatefulSet ⚠️

- To delete the StatefulSet but retain its persistent storage:

```sh
kubectl delete statefulset nginx --cascade=orphan
```

- To remove both the StatefulSet and its associated PVCs:

```sh
kubectl delete statefulset nginx
kubectl delete pvc -l app=nginx
```

### How Naming Works

- Each pod in a StatefulSet follows a predictable naming convention:

`web-0, web-1, web-2, etc.`

- DNS format: `<pod-name>.<service-name>.<namespace>.svc.cluster.local`
- Example: web-0.web.default.svc.cluster.local

### Use Cases for StatefulSets

- Databases (MySQL, PostgreSQL, MongoDB)
- Distributed Caches (Redis, etcd, Consul)
- Message Brokers (Kafka, RabbitMQ)
- Monitoring Systems (Prometheus with persistent data)

### Conclusion

StatefulSets provide a way to manage stateful applications in Kubernetes by ensuring stable pod identities, persistent storage, and ordered deployment. Unlike Deployments, which are designed for stateless applications, StatefulSets cater to applications requiring stable network endpoints and persistent volumes. Understanding the role of Headless Services is key to leveraging StatefulSets effectively.
