---
layout: post
title: Azure Kubernetes Service
categories: [cloud, azure, containers]
tags: [Cloud, Azure, Containers]
---

## Introduction

### Container:
- A container is an atomic unit of software that packages up code, dependencies, and configuration for a specific application. 
- Containers allow you to split up monolithic applications into individual services that make up the solution. 
- This rearchitecting of our application enables us to deploy these separate services via containers.

![Containers Split](/assets/img/cloud/azure/containers/containers.png)

- Benefits:

1. `Immutability` - The unchanging nature of a container allows it to be deployed and run reliably with the same behavior from one compute environment to another. 
2. `Smaller Size` - A container is similar to a VM, but without the kernel for each machine. Instead, they share a host kernel.
3. `Lightweight` - The container always relies on the host installed OS for kernel-specific services. The lightweight property makes containers less resource-intensive, so installing multiple containers is possible within the same compute environment.
4. `Startup is fast` - Containers start up in few seconds, unlike VMs, which can take minutes to start.


### Container Management 
- A container has a distinct life cycle that exists as a temporary machine. 
- Its state passes through the stages of pending, running, and terminated. 
- Container management involves deploying, upgrading, monitoring, and removing containers. 

![Container Management](/assets/img/cloud/azure/containers/container-management.png)


### Kubernetes
- Kubernetes is a portable, extensible open-source platform for automating deployment, scaling, and the management of containerized workloads. 
- Kubernetes abstracts away complex container management and provides us with a declarative configuration to orchestrate containers in different compute environments. 

![Kubernetes Container Management](/assets/img/cloud/azure/containers/kubernetes-container-management.png)


- A Kubernetes deployment is configured as a cluster. A cluster consists of at least one primary machine or control plane and one or more worker machines. 


### Azure Kubernetes Service

![Azure Kubernetes Service](/assets/img/cloud/azure/containers/aks/aks-kubernetes-service.png)

- AKS manages your hosted Kubernetes environment and makes it simple to deploy and manage containerized applications in Azure. 
- Your AKS environment is enabled with features such as automated updates, self-healing, and easy scaling. 
- Azure manages the control plane of your Kubernetes cluster for free. 
- You manage the agent nodes in the cluster and only pay for the VMs on which your nodes run.


### Workload Deployment to AKS

![Workload Deployment to AKS](/assets/img/cloud/azure/containers/aks/workload-deployment-to-aks.png)


### Default Workloads Running on AKS
- `Namespace: kube-system` 
- `Kind: Deployment`

1. **CoreDNS**
- CoreDNS is a DNS server that provides DNS resolution for services and pods within the Kubernetes cluster. 
- It translates service names and domain names into IP addresses, allowing pods to discover and communicate with each other and with services.
- CoreDNS is usually configured to use a ConfigMap that defines its behavior and DNS rules.

2. **CoreDNS-Autoscaler**
- CoreDNS-Autoscaler is responsible for scaling the CoreDNS deployment based on the load. 
- It typically uses the metrics provided by the CoreDNS pods to determine when to scale up or down.

3. **Konnectivity-Agent**
- Konnectivity is a component used for connectivity between the control plane and the nodes in the cluster. 
- It helps facilitate communication between the API server and the nodes, especially in private clusters or clusters with advanced networking configurations.

4. **Metrics Server**
- Metrics Server is a cluster-wide aggregator of resource usage data, such as CPU and memory metrics. 
- Metrics Server scrapes metrics from the kubelet on each node and provides this data to the Kubernetes API server for use in autoscaling and monitoring.


### AKS Networking

1. `Network Plugin`: 
- Determines how networking is handled in the cluster (Azure CNI in this case).
    + `Azure CNI` provides advanced networking capabilities and integrates with Azure Virtual Network (VNet). It allows Kubernetes pods to have IP addresses from the VNet. 

2. `Network Policy`: 
- Controls inter-pod communication (Azure Network Policies).
    + `Azure` defines that Azure Network Policies will be used, which allows you to define rules to control traffic flow between pods in your AKS cluster.

3. `Service CIDR`: 
- This CIDR block is used to allocate IP addresses for Kubernetes services such as LoadBalancers, ClusterIP services, and others.

4. `DNS Service IP`: 
- This IP address is used by the cluster to resolve DNS queries for services and pods.

5. `Load Balancer SKU`: 
- Specifies the type of Azure Load Balancer used for the cluster.