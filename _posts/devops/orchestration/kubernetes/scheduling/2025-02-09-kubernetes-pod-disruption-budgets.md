---
layout: post
title: Kubernetes - Pod Disruption Budgets
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
image: /assets/img/devops/orchestration/kubernetes/kubernetes-posts.png
description: Explore what PDBs are, how they work, and best practices for using them effectively.
---

## Introduction

In a Kubernetes cluster, workloads run as pods, which may be rescheduled or disrupted due to node maintenance, scaling events, or failures. However, for highly available applications, it is crucial to minimize service downtime during such disruptions. Kubernetes provides Pod Disruption Budgets (PDBs) to ensure that a minimum number of pods remain available during voluntary disruptions.

### What is a Pod Disruption Budget?

- A Pod Disruption Budget (PDB) is a Kubernetes object that limits the number of voluntary disruptions allowed for a set of pods.
- It ensures that a specified number or percentage of pods remain available when disruptions occur, preventing excessive downtime.

### Voluntary vs. Involuntary Disruptions

- `Voluntary Disruptions`: Planned events such as node upgrades, cluster scaling, or administrative actions.
- `Involuntary Disruptions`: Unexpected failures such as node crashes or network issues, which are not controlled by PDBs.

### How Pod Disruption Budgets Work

- A PDB defines policies that control how many pods can be disrupted at a given time.
- It ensures that Kubernetes components like the `Kubernetes Eviction API` and cluster `autoscalers` respect availability constraints before terminating or rescheduling pods.

### Defining a Pod Disruption Budget

- A PDB is defined using a YAML manifest, specifying the minimum available or maximum unavailable pods.
- Example: Ensuring at least one pod is always available

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: my-app
```

- `minAvailable: 1` ensures that at least one pod must remain available.
- `selector` targets the specific set of pods the PDB applies to.

- Example: Allowing only one pod to be unavailable

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      app: my-app
```

- `maxUnavailable: 1` ensures that at most one pod can be unavailable at a time.

### Applying and Managing PDBs

- To apply a PDB, use:

```sh
kubectl apply -f my-app-pdb.yaml
```

- To check the status of a PDB:

```sh
kubectl get poddisruptionbudget
```

- To describe a PDB:

```sh
kubectl describe poddisruptionbudget my-app-pdb
```

### Best Practices for Using PDBs

- `Ensure Sufficient Replicas`: PDBs are only effective if there are enough replicas to tolerate disruptions.
- `Use minAvailable or maxUnavailable, Not Both`: Define a clear policy to avoid conflicts.
- `Apply PDBs to Critical Workloads`: Ensure high availability for applications like databases and services with strict uptime requirements.
- `Monitor PDB Status`: Regularly check PDB status to ensure they are respected during cluster events.
- `Test PDBs Before Production Use`: Validate how PDBs behave during maintenance scenarios.

### Conclusion

Pod Disruption Budgets are an essential tool for maintaining application availability in Kubernetes during voluntary disruptions. By correctly defining and managing PDBs, you can ensure minimal downtime and a resilient infrastructure. Implement them wisely to enhance the stability of your workloads in Kubernetes.
