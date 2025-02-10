---
layout: post
title: Kubernetes - Resource Limits
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
image: /assets/img/devops/orchestration/kubernetes/kubernetes-posts.png
description: Explore what resource limits are, how they work, and best practices for configuring them.
---

## Introduction

Kubernetes provides powerful mechanisms to manage resource allocation and consumption within a cluster. One of the key aspects of resource management is resource limits, which help ensure fair usage, prevent resource exhaustion, and maintain application stability.

### What Are Resource Limits?

- Resource limits in Kubernetes define the maximum amount of CPU and memory (RAM) that a container can use.
- These limits prevent containers from consuming excessive resources, which could negatively impact other workloads running on the same node.
- Kubernetes uses the following resource constraints:
  - `Requests`:
    - The minimum amount of CPU and memory guaranteed for a container.
    - Kubernetes uses this value to decide on which nodes to place the Pod.
  - `Limits`:
    - The maximum amount of CPU and memory a container can use.
    - If a container exceeds this limit, it might be terminated and restarted, depending on the specific resource and the container's restartPolicy.

- Resource limits can be set for both CPU and memory.
    1. `CPU` is specified in CPU units, with 1 CPU equivalent to 1 AWS vCPU, 1 GCP Core, 1 Azure Core, or 1 Hyperthread on a bare-metal Intel processor.
    2. `Memory` is specified in bytes, and can be expressed in fixed-point integers or as a decimal using one of these suffixes: E, P, T, G, M, K, Ei, Pi, Ti, Gi, Mi, Ki.

- Default Limits for a Container: 1 vCPU - 512Mi

- Sample YAML:

    ```yaml
    apiVersion: v1
    kind: Pod
    metadata:
    name: myapp-pod
    spec:
    containers:
    - name: myapp-container
        image: myapp
        resources:
        requests:
            memory: "64Mi"
            cpu: "250m"
        limits:
            memory: "128Mi"
            cpu: "500m"
    ```

- The default and max limits and requests can be set at the namespace level using the `kind: LimitRange`.

    ```yaml
    apiVersion: v1
    kind: LimitRange
    metadata:
        name: resource-limits
    spec:
        limits:
        - default:
            memory: 512Mi
            cpu: "1"
          defaultRequest:
            memory: 256Mi
            cpu: "0.5"
          type: Container
    ```

### Understanding CPU and Memory Units

- `CPU`: Measured in millicores (m). 1000m = 1 CPU core. For example, 500m means half a core.
- `Memory`: Measured in bytes. Common units: Mi (Mebibytes) and Gi (Gibibytes). For example, 256Mi means 256 Mebibytes.

### What Happens When Limits Are Exceeded?

- `CPU Limits`
  - If a container exceeds its CPU limit, Kubernetes throttles it, slowing down execution but not terminating it.
  - A container cannot use more CPU than specified limit.

- `Memory Limits`
  - If a container exceeds its memory limit, Kubernetes kills it with an OutOfMemory (OOM) error.

### Why Set Resource Limits?

- Setting resource limits helps in:
  - `Preventing resource starvation`: Ensuring that no single container consumes all available resources.
  - `Avoiding performance degradation`: Preventing excessive memory or CPU usage from impacting other applications.
  - `Improving cluster stability`: Ensuring fair distribution of resources across workloads.
  - `Enabling auto-scaling`: Allowing Kubernetes to make better scheduling and scaling decisions.

### Best Practices for Setting Resource Limits

- `Use Resource Requests and Limits Together`: Requests ensure guaranteed minimum resources, while limits prevent excessive consumption.
- `Analyze Workload Resource Usage`: Use tools like kubectl top pods or Prometheus to monitor resource usage before setting limits.
- `Avoid Over-Provisioning`: Setting excessive requests can lead to inefficient resource utilization.
- `Use Horizontal Pod Autoscaler (HPA)`: Automatically scale pods based on CPU/memory usage.
- `Define Limits in ResourceQuota`: Enforce limits at the namespace level using ResourceQuota to prevent overallocation.
- Example:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: namespace-quota
  namespace: my-namespace
spec:
  hard:
    requests.cpu: "2"
    requests.memory: "2Gi"
    limits.cpu: "4"
    limits.memory: "4Gi"
```
