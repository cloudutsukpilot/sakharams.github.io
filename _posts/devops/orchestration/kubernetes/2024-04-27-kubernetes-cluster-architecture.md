---
layout: post
title: Kubernetes Cluster - Architecture
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
---

## Cluster Architecture

![K8-Architecture](/assets/img/devops/orchestration/kubernetes/k8-architecture.png)


| K8 Component      | Details                                                                                          |
|-------------------|--------------------------------------------------------------------------------------------------|
| Worker Nodes      | Physical or Virtual / On-Premise or Cloud nodes which hosts applications in form of pods and containers. |
| Master Nodes      | Managing, planning, Scheduling and monitoring the worker nodes with the help of control plane components. |
| ETCD              | Database which stores the information about the containers in the key-value pair.                |
| Kube-scheduler    | Identifies a right node (based on size, constraints, free space, etc) to place a containers     |
| Controller-Manager| - Node-Controller: Onboarding new nodes to the cluster | 
| | - Replication-Controller: To make sure desires nodes are available at all times |
| Kube-apiserver    | Exposes the K8 api to perform management operations on the K8 cluster.                          |
| Kubelet           | Kubelet is an engine which runs on each node and listens to the kupe-api server for any instructions |
| Kube-proxy        | This services enables communication between the containers                                       |


- The master is made of multiple components like 

| K8 Component              | Details                                                                                         |
|---------------------------|------------------------------------------------------------------------------------------------ |
| Kube-scheduler            | Responsible for scheduling pods on the nodes                                                    |
| Kube-apiserver            | Exposes the K8 api to perform management operations on the K8 cluster.                          |
| etcd (Distributed Database) | All the configuration changes, deployments details, scaling operations details, etc.          |
| Kube-controller-manager   | Used to manage the health of the k8 cluster                                                     |

- By default, a Kubernetes cluster has one master, but it is possible to set up a multi-master Kubernetes cluster.
- A node, previously known as a minion, is a worker machine, usually a VM, but can also be a bare-metal machine. 
- Each node comprises the required services used by the master to manage pods. e.g., Kubelet, the container runtime, and kube-proxy.


