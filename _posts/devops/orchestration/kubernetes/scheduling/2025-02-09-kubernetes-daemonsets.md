---
layout: post
title: Kubernetes - DaemonSets
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
image: /assets/img/devops/orchestration/kubernetes/kubernetes-posts.png
description: Explore what DaemonSets are, their use cases, and how to configure them.
---

## Introduction

Kubernetes provides various mechanisms to deploy and manage applications efficiently. One such important controller is DaemonSet, which ensures that specific pods run on every node in a cluster. DaemonSets are commonly used for deploying cluster-wide system services such as logging, monitoring, and networking components. In this blog, we’ll .

### What is a DaemonSet?

- A DaemonSet is a Kubernetes controller that ensures that a pod runs on every node (or a subset of nodes) in a cluster.
- When a new node is added to the cluster, Kubernetes automatically schedules the DaemonSet pod on that node.
- Similarly, when a node is removed, the corresponding DaemonSet pod is also terminated.
- This is particularly useful for deploying system-wide tasks such as log collection, monitoring, or network proxies.

### Key Features of DaemonSets

- Ensures that a specific pod runs on all (or selected) nodes.
- Automatically deploys new pods when nodes join the cluster.
- Removes pods when nodes are deleted.
- Supports updates using rolling updates or manual deletion and recreation.

### Use Cases for DaemonSets

- DaemonSets are useful for running system-level services across all nodes. Common use cases include:

1. **Logging Agents**

    - To collect logs from all nodes, DaemonSets can deploy log collectors like Fluentd or Filebeat.

    ```yaml
    apiVersion: apps/v1
    kind: DaemonSet
    metadata:
      name: fluentd-daemonset
    spec:
      selector:
        matchLabels:
          name: fluentd
      template:
        metadata:
          labels:
            name: fluentd
        spec:
          containers:
          - name: fluentd
            image: fluent/fluentd
    ```

2. **Monitoring Agents**

    - Tools like Prometheus Node Exporter or Datadog agents use DaemonSets to gather system metrics.

    ```yaml
    apiVersion: apps/v1
    kind: DaemonSet
    metadata:
      name: node-exporter
    spec:
      selector:
        matchLabels:
          app: node-exporter
      template:
        metadata:
          labels:
            app: node-exporter
        spec:
          containers:
          - name: node-exporter
            image: prom/node-exporter
    ```

3. **Networking Components**

    - Networking tools like Cilium, Calico, and Kube-proxy use DaemonSets to manage networking across all nodes.

4. **Security and Compliance**

    - Security monitoring tools like Falco or antivirus scanners ensure compliance by running on all nodes.

### How to Create a DaemonSet?

- A DaemonSet is defined using a YAML configuration similar to a Deployment but without replicas. 
- The key components include:
  - `Selector`: Identifies pods managed by the DaemonSet.
  - `Template`: Defines the pod specification.
  - `Update Strategy`: Defines how pods are updated.

- Basic DaemonSet Example

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: my-daemonset
spec:
  selector:
    matchLabels:
      app: my-daemon
  template:
    metadata:
      labels:
        app: my-daemon
    spec:
      containers:
      - name: my-daemon-container
        image: my-daemon-image
```

### Controlling DaemonSet Placement

- By default, DaemonSets deploy pods on all nodes. You can control placement using:

1. **Node Selectors**

    - Use nodeSelector to deploy DaemonSets only on nodes with specific labels.

    ```yaml
    spec:
      template:
        spec:
          nodeSelector:
            dedicated: monitoring
    ```

2. **Tolerations and Taints**

    - Use tolerations to allow DaemonSets to run on tainted nodes.

    ```yaml
    spec:
      template:
        spec:
          tolerations:
          - key: "node-role.kubernetes.io/master"
            effect: "NoSchedule"
    ```

3. **Affinity Rules**

    - Use affinity rules to fine-tune pod scheduling.

    ```yaml
    spec:
      template:
        spec:
          affinity:
            nodeAffinity:
              requiredDuringSchedulingIgnoredDuringExecution:
                nodeSelectorTerms:
                - matchExpressions:
                  - key: "node-role"
                    operator: "In"
                    values:
                    - worker
    ```

### Updating a DaemonSet

- Kubernetes allows updating DaemonSets using `RollingUpdate` or `OnDelete` strategies.

```yaml
spec:
  updateStrategy:
    type: RollingUpdate
```

### Conclusion

DaemonSets play a critical role in managing system-wide services in Kubernetes. By ensuring pods run on all or specific nodes, they provide essential functionality for logging, monitoring, networking, and security. Understanding how to configure and control DaemonSets enables better cluster management and improved reliability.
