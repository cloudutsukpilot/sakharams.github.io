---
layout: post
title: ☸️ Kubernetes - Architecture
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
image: /assets/img/devops/orchestration/kubernetes/kubernetes-architecture.png
description: What elements make Kubernetes the most comprehensive and powerful container orchestration platform?
---

## ☸️ Kubernetes Architecture

Kubernetes (K8s) is an open-source platform designed to automate the deployment, scaling, and operation of application containers. Understanding the architecture of Kubernetes helps in comprehending how it orchestrates containerized workloads effectively.

This blog will cover both high-level and low-level container runtimes, as well as detailed insights into the control plane and node components of a Kubernetes cluster. Additionally, we will explore how Kubernetes ensures high availability with its etcd raft consensus and API load balancer.

- Below are the main component of an kubernetes architecture:

| K8 Component      | Details                                                                                          |
|-------------------|--------------------------------------------------------------------------------------------------|
| Worker Nodes      | Physical or Virtual / On-Premise or Cloud nodes which hosts applications in form of pods and containers. |
| Master Nodes      | Managing, planning, Scheduling and monitoring the worker nodes with the help of control plane components. |
| ETCD              | Database which stores the information about the containers in the key-value pair.                |
| Kube-scheduler    | Identifies a right node (based on size, constraints, free space, etc) to place a containers     |
| Controller-Manager| - `Node-Controller`: Onboarding new nodes to the cluster                                        |
|                   | - `Replication-Controller`: To make sure desires nodes are available at all times               |
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

### Low-Level v/s High-Level Container Runtimes

1. **What is a Low-Level Container Runtime?**
    - A low-level container runtime is responsible for directly interacting with the operating system to manage containers.
    - It is the software that is used to run containers and handle their lifecycle, such as starting, stopping, and pausing containers.
    - These runtimes often communicate with the operating system kernel and hardware resources to allocate the necessary resources for container execution.

    - **Functions of a Low-Level Container Runtime:**
      - `Container Creation and Execution`: Initiates container processes by interacting with the operating system's kernel.
      - `Resource Management`: Manages resources such as CPU, memory, and disk for containers.
      - `Isolation`: Ensures containers are isolated from each other and the host system.
      - `Image Management`: Pulls container images and manages their storage locally.
    - **Examples**:
      - `runc` is a popular example of a low-level container runtime used in Kubernetes.

2. **What is a High-Level Container Runtime?**
    - A high-level container runtime provides a layer of abstraction over the low-level runtime and interfaces with the Kubernetes components.
    - It is responsible for managing container workloads within the cluster, including orchestration tasks like starting and stopping containers across multiple nodes.
    - High-level runtimes manage container networking, storage, and interactions with higher-level system components like the container orchestration system.

    - **Functions of a High-Level Container Runtime:**
      - `Container Orchestration`: Works with Kubernetes to schedule and manage containers across nodes.
      - `Networking and Volume Management`: Manages networking between containers and persistent storage.
      - `Interfacing with Container Images`: Pulls container images and runs them according to Kubernetes specifications.
      - `Handling Health Checks`: Monitors the health of containers and restarts them if necessary.
    - **Examples**:
      - `containerd` is an example of a high-level container runtime used in Kubernetes.

### Kubernetes Control Plane Components

The control plane is the brain of a Kubernetes cluster. It makes global decisions about the cluster (e.g., scheduling), as well as detecting and responding to cluster events (e.g., starting up a new pod when a deployment’s replicas field is unsatisfied).

1. **etcd:**
     - A distributed key-value store that holds all cluster data.
     - It's used to store and retrieve the cluster’s configuration, state, and metadata.

2. **Kube-API Server:**
    - The API server is the central management point that exposes Kubernetes APIs and handles the communication between the Kubernetes control plane and nodes.
    - It acts as a gateway for all REST requests to the cluster and ensures authentication, authorization, and communication between various Kubernetes components.

3. **Kube-Scheduler:**
    - The scheduler watches for newly created pods and selects which node they should run on based on resource availability and other constraints.

4. **Kube-Proxy:**
    - The proxy maintains network rules that allow communication to and from the pods across nodes.
    - It ensures the correct routing of traffic to services and containers within the cluster.
    - It supports multiple protocols such as TCP, UDP, and SCTP.

5. **CoreDNS:**
    - CoreDNS is a flexible and extensible DNS server that provides DNS-based service discovery within Kubernetes.
    - It resolves DNS queries for services, helping pods communicate with each other by name rather than IP.

6. **Controller Manager:**
    - The controller manager runs controllers that monitor the state of the cluster.
    - It includes controllers like the deployment controller, replica set controller, and stateful set controller.
    - These controllers ensure that the desired state of the system is maintained.

7. **Cloud Controller Manager:**
    - The cloud controller manager integrates Kubernetes with the underlying cloud provider infrastructure, allowing Kubernetes to manage cloud resources like load balancers, volumes, and networking.

8. **Kubelet:**
    - The kubelet is an agent that runs on each control plane and ensures that containers are running in the pod.
    - It watches for pod specifications in the node and reports the status to the API server.
    - The kubelet monitors directories such as `/etc/kubernetes/manifests` (*static pod definitions*) and `/var/lib/kubelet` (for container runtimes and local storage).

### Flow of Operations in the Control Plane

- The flow of operations in the control plane is as follows:
    `Scan Directory -> Kubelet -> Containerd -> runc`

1️⃣ The kubelet monitors the specified directories on the node for pod specifications.
2️⃣ When it detects a new pod, it communicates with containerd (the high-level runtime) to launch a container.
3️⃣ containerd in turn uses runc (the low-level runtime) to run the container on the node.

### Kubernetes Node Components

Nodes are the workers in a Kubernetes cluster that run the containerized applications. Each node runs several essential components that enable it to run applications and report back to the control plane.

1. **Kubelet:**
    - The kubelet is an agent that runs on each node and ensures that containers are running in the pod.
    - It watches for pod specifications in the node and reports the status to the API server.
    - The kubelet monitors directories such as `/etc/kubernetes/manifests` (*static pod definitions*) and `/var/lib/kubelet` (for container runtimes and local storage).

2. **Containerd:**
    - A high-level container runtime that is responsible for managing containers' lifecycle on the node.
    - It communicates with low-level runtimes like runc.

3. **runc:**
    - The low-level runtime used by containerd to run the actual containers on the node.

4. **Pod:**
    - A pod is the smallest deployable unit in Kubernetes.
    - It consists of one or more containers that share the same network namespace and storage volumes.

5. **Service:**
    - A Kubernetes Service exposes a set of pods to external traffic, enabling reliable communication.
    - It ensures that traffic is correctly routed to the pods, even as pods are created or terminated.

6. **Kube-Proxy:**
    - The kube-proxy manages network traffic routing between services and pods.
    - It works by maintaining rules for the various protocols (TCP, UDP, SCTP) and directs traffic accordingly.

### High Availability in Kubernetes

Kubernetes ensures high availability of its control plane and application workloads through several key mechanisms:

1. **etcd Raft Consensus:**
    - etcd uses the Raft consensus protocol to ensure that all data across multiple etcd instances is consistent.
    - In the event of a failure of one etcd instance, the other instances can continue to serve the data.

2. **API Load Balancer:**
    - The Kubernetes API server is typically exposed behind a load balancer.
    - This ensures that multiple instances of the API server are accessible and that there is no single point of failure.

### Conclusion

Kubernetes architecture is built with scalability, high availability, and reliability in mind. Understanding the role of container runtimes, control plane components, and node elements is essential for efficiently deploying and managing applications within a Kubernetes cluster.

By leveraging its high availability features like etcd Raft consensus and API load balancing, Kubernetes ensures that applications remain available even in the face of failures.
