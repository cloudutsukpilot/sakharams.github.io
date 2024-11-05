---
layout: post
title: AKS - Networking
categories: [cloud, azure, containers]
tags: [Cloud, Azure, Containers, Kubernetes, AKS]
---

## Introduction
- Azure Kubernetes Service (AKS) offers several networking models, each suited to different use cases and performance needs. 
- The primary networking options in AKS are Kubenet, Azure CNI, Azure CNI Overlay and Cilium CNI with Azure CNI.

### AKS Networking Basics

 - Kubernetes employs a virtual networking layer to manage access within and between your applications or their components:
    + `Kubernetes Nodes and Virtual Network`
        * Kubernetes nodes are connected to a virtual network.
        * This setup enables pods to have both inbound and outbound connectivity.
    + `Kube-proxy Component`
        * kube-proxy runs on each node and is responsible for providing the necessary network features.

- Kubernetes Functionalities:
    + `Load Balancer`: You can use a load balancer to distribute network traffic evenly across various resources.
    + `Ingress Controllers`: These facilitate Layer 7 routing, which is essential for directing application traffic.
    + `Egress Traffic Control`: Kubernetes allows you to manage and control outbound traffic from cluster nodes.
    + `Network Policies`: These policies enable security measures and filtering for network traffic in pods.

## Networking Models

1. `Overlay Network Model` 
    - Pods are given an IP address from a private, logically separate CIDR from the Azure virtual network subnet where AKS nodes are deployed. 
    - This model enables simpler, improved scalability when compared to the flat network model.

2. `Flat Network Model`: 
    - A flat network model in AKS assigns IP addresses to pods from a subnet from the same Azure virtual network as the AKS nodes. 
    - Any traffic leaving your clusters isn't SNAT'd, and the pod IP address is directly exposed to the destination. 
    - This model can be useful for scenarios like exposing pod IP addresses to external services.

### 1. Kubenet (Basic Networking)

- Kubenet is the simpler, default network model in AKS. 
- Each node gets an IP from the Azure VNet, while pods receive IPs from a separate NATed range.
- Pros:
    + Lower IP requirements, as only nodes get IPs from the VNet.
    + Simplicity and cost-effectiveness.
- Cons:
    + Reduced performance due to NAT.
    + Limited network integration and advanced networking features.
- `Use Case`: Ideal for smaller or dev clusters where IP conservation and simplicity are prioritized over performance.

### 2. Azure CNI (Advanced Networking)

- Assigns each pod a direct IP from the VNet, allowing it to fully integrate with Azure services.
- Pros:
    + Full VNet integration for direct connectivity with other Azure resources.
    + High performance and compatibility with NSGs, UDRs, and other network policies.
- Cons:
    + Requires a larger IP range, as every pod needs an IP in the VNet.
    + More management complexity in large, IP-limited VNets.
- `Use Case`: Best for production environments requiring VNet integration or on-prem connectivity.

### 3. Azure CNI Overlay

- Provides an overlay network, so pod IPs do not consume VNet space, avoiding IP exhaustion issues.
- Pros:
    + Conserves VNet IPs by using overlay networks for pods.
    + Benefits from VNet integration and Azure CNI performance.
- Cons:
    + Limited region availability and configurations, as it’s relatively new.
- `Use Case`: Ideal for large clusters facing VNet IP constraints but still needing VNet-level connectivity.

### 4. Cilium CNI with Azure CNI (eBPF-based Networking)

- Leverages eBPF (extended Berkeley Packet Filter) for efficient network packet processing, improving networking performance and scalability. 
- It can also be combined with Azure CNI for direct VNet connectivity.
- Pros:
    + High performance due to eBPF’s ability to handle networking directly in the Linux kernel.
    + Supports advanced network security policies and observability features.
    + Scales well, with reduced complexity for large, multi-tenant clusters.
- Cons:
    + Requires a learning curve, as eBPF and Cilium are relatively advanced topics.
    + Slightly more complex setup, especially when used alongside Azure CNI.
- `Use Case`: Ideal for large-scale production deployments needing high-performance, secure, and scalable networking with deep observability.

### 5. Hybrid Networking (BYO IP)

- Allows specific IP ranges for hybrid network integration, like connecting on-premises or multi-cloud networks.
- Pros:
    + Supports specific IP range configurations, allowing compliance with network policies.
- Cons:
    + Complex setup, often requires expertise for configuration and management.
- `Use Case`: Suitable for regulated environments needing specific IP ranges for hybrid or multi-cloud connectivity.

### 6. Networking Plugin Choice (Calico or Cilium for Policies)

- `Calico`: Works well with Azure CNI for network policy enforcement within the cluster.
- `Cilium`: Adds richer network policies, observability, and security capabilities using eBPF, especially useful for high-performance needs.
- `Use Case`: For enhanced network security, Calico or Cilium should be used to apply network policies.

### AKS Networking

1. `Network Plugin`
    - Determines how networking is handled in the cluster (Azure CNI in this case).
        - `Azure CNI` provides advance networking capabilities and integrates with Azure Virtual Network (VNet). It allows Kubernetes pods to have IP addresses from the VNet.

2. `Network Policy`
    - Controls inter-pod communication (Azure Network Policies).
        - `Azure` defines that Azure Network Policies will be used, which allows you to define rules to control traffic flow between pods in your AKS cluster.

3. `Service CIDR`
    - This CIDR block is used to allocate IP addresses for Kubernetes services such as LoadBalancers, ClusterIP services, and others.

4. `DNS Service IP`:
    - This IP address is used by the cluster to resolve DNS queries for services and pods.

5. `Load Balancer SKU`:
    - Specifies the type of Azure Load Balancer used for the cluster.