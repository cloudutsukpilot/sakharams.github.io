---
layout: post
title: AKS - Default Workloads
categories: [cloud, azure, containers]
tags: [Cloud, Azure, Containers, Kubernetes, AKS]
---

## Introduction

### Default Workloads Running on AKS

- `Namespace: kube-system`
- `Kind: Deployment`

1. **CoreDNS**
    - CoreDNS is a DNS server that provides DNS resolution for services and pods within the Kubernetes cluster. 
    - It translates service names and domain names into IP addresses, allowing pods to discover and communicate with each other and with services.
    - CoreDNS is usully configured to use a ConfigMap that defines its behavior and DNS rules.

2. **CoreDNS-Autoscaler**
    - CoreDNS-Autoscaler is responsible for scaling the CoreDNS deployment based on the load. 
    - It typically uses the metrics provided by the CoreDNS pods to determine when to scale up or down.

3. **Konnectivity-Agent**
    - Konnectivity is a component used for connectivity between the control plane and the nodes in the cluster. 
    - It helps facilitate communication between the API server and the nodes, especially in private clusters or clusters with advanced networking configurations.

4. **Metrics Server**
    - Metrics Server is a cluster-wide aggregator of resource usage data, such as CPU and memory metrics. 
    - Metrics Server scrapes metrics from the kubelet on each node and provides this data to the Kubernetes API server for use in autoscaling and monitoring.
