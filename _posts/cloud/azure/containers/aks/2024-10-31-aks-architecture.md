---
layout: post
title: AKS Architecture
categories: [cloud, azure, containers, aks]
tags: [Cloud, Azure, Kubernetes, AKS]
image: /assets/img/cloud/azure/containers/aks/aks-posts.jpg
description: Explore the key architectural elements of AKS, including the control plane, node pools, networking, storage, and integrations.
---

## Introduction

As cloud-native adoption accelerates, Azure Kubernetes Service (AKS) has become one of the go-to managed Kubernetes solutions for deploying and managing containerized applications. But to make the most of AKS, it’s important to understand its architecture — how its components are structured and interact within Azure.

### What is AKS?

- AKS is a fully managed Kubernetes service provided by Microsoft Azure. It handles most of the operational complexity of running Kubernetes, including provisioning, upgrades, scaling, and monitoring.

### AKS Architecture Overview

- At a high level, AKS consists of two main components:
    - Control Plane (Managed by Azure)
    - Node Pools (Managed by you)


![AKS Architecture](/assets/img/cloud/azure/containers/aks/aks-architecture.jpg)

### 1. Control Plane

- The control plane is the brain of the Kubernetes cluster.
- In AKS, Azure fully manages the control plane — you don’t pay for it directly or manage it manually.
- The control plane is offered as Free and Standard tier.
- Components include:
    - `Kube-API Server`: Front door to the cluster.
    - `Scheduler`: Places workloads (pods) on the right nodes.
    - `Controller Manager`: Ensures cluster state matches the desired state.
    - `etcd`: The distributed key-value store for all cluster data.

- Key characteristics:
    - `No VM access`: You can’t access the control plane VMs.
    - `Automatic updates & patching`: Azure handles control plane maintenance.

### ⚙️ 2. Node Pools

- Node pools are sets of virtual machines (nodes) where your containers actually run.
- Each node is an Azure VM (e.g., Standard_D2s_v3).
- You can have multiple node pools (e.g., Linux and Windows).
- Use taints and labels to isolate workloads (e.g., GPU workloads).
- Nodes use the kubelet agent to communicate with the control plane.

- You’re responsible for:
    - Choosing VM sizes
    - Upgrading node pools
    - Managing node-level metrics, autoscaling, and OS updates

### 3. Networking in AKS

- AKS supports two networking models:
    - `Kubenet (Basic)`
        - IPs assigned to nodes; pods get internal IPs via NAT.
        - Simpler and consumes fewer IPs.

    - `Azure CNI (Advanced)`
        - Pods get IPs from Azure VNet directly.
        - Better integration with Azure services and NSGs.

- Other networking elements:
    - `Network policies`: Control pod-to-pod communication.
    - `DNS and CoreDNS`: For internal service resolution.
    - `Load Balancers`: Ingress/egress traffic is managed via Azure LBs or Ingress Controllers.

### 4. Storage Architecture

- Persistent storage options:
    - Azure Managed Disks for block storage
    - Azure Files for shared storage
    - Container Storage Interface (CSI) support
    
- Storage is defined in Kubernetes via:
    - Persistent Volumes (PV)
    - Persistent Volume Claims (PVC)

### 5. Security and Identity

- Entra ID integration for authentication.
- Role-Based Access Control (RBAC) for fine-grained permissions.
- Private clusters to restrict API access to within VNet.
- Pod-managed identities via Azure Workload Identity.

### 6. Monitoring and Logging

- AKS integrates seamlessly with:
    - Azure Monitor and Log Analytics
    - Container Insights for cluster-wide visibility
    - Prometheus/Grafana (self-managed or hosted)

- Common metrics:
    - Node CPU/memory usage
    - Pod status and restarts
    - Kubelet logs
    - Network IO

### 7. Autoscaling

- AKS supports three types of autoscaling:
    - `Cluster Autoscaler`: Adds/removes nodes.
    - `Horizontal Pod Autoscaler (HPA)`: Scales pods based on CPU/memory.
    - `Vertical Pod Autoscaler (VPA)`: Adjusts pod resource requests.
    - `Kubernetes Event Driven Autoscaling(KEDA)`: Adjusts resources based on application metrics

### 8. Ingress Controllers

- For HTTP traffic routing:
    - Use NGINX, Application Gateway Ingress Controller (AGIC), or Gateway API.
    - Allows you to expose services via Ingress resources.

### 9. Integrations

- `Azure Container Registry (ACR)`: Store private images.
- `Azure DevOps` or `GitHub Actions`: CI/CD pipelines.
- `Azure Key Vault`: Manage secrets securely.
- `Azure Policy`: Enforce compliance rules in AKS.

### 10. High Availability

- Use Availability Zones for resilient node pools.
    - Multi-zone clusters distribute workloads across zones.
    - Supports multi-region DR with backup/restore tools like Velero.

### ✅ Conclusion
Understanding AKS architecture is critical for designing scalable, secure, and cost-efficient containerized applications. While Azure takes care of the control plane, you still have fine-grained control over your worker nodes, networking, and integrations—giving you the flexibility of Kubernetes without its full operational complexity.