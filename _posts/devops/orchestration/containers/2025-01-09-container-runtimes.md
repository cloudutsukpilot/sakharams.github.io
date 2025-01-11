---
layout: post
title: Container Runtimes
categories: [devops, orchestration, containers]
tags: [DevOps, Containers]
image: /assets/img/devops/containers/container-posts.webp
description: What are container runtimes? How do they compare with Hypervisor and its use cases?
---

## Introduction

- Containers have revolutionized the way software is developed, deployed, and managed.
- In this blog post, we will explore how containers use the container runtimes for their lifecycle management.

### What are Container Engines?

- A container engine is a higher-level software that manages containers. 
- It provides the user interface, orchestration, and management capabilities for interacting with containers.
- It often includes features like building, managing, and running containers, and sometimes even networking and storage management.
- Example: `Docker Engine`

### What are Container Runtimes?

- A container runtime is the underlying component responsible for actually running and managing containers on the host system.
- It is responsible for the low-level tasks such as container lifecycle management (starting, stopping, and running containers), resource isolation (using namespaces and cgroups), and managing execution environments.
- Container runtime acts as a middle layer between the host OS and container instances. 
- Example: `containerd`, `CRI-O`, `runc`

### Responsibilities of Container Engine v/s Runtimes

| **Aspect**                | **Container Engine**                                 | **Container Runtime**                                    |
|---------------------------|------------------------------------------------------|----------------------------------------------------------|
| **Primary Function**       | Manages containers, including orchestration and interfaces. | Manages the lifecycle of containers (starting, stopping, running). |
| **Interaction Level**      | High-level abstraction; provides APIs and user interfaces. | Low-level abstraction; provides the environment for container execution. |
| **Container Creation**     | Builds container images and manages container orchestration. | Executes the container from an image provided by the engine. |
| **Container Lifecycle**    | Manages container deployment, updates, and scaling. | Handles starting, stopping, and maintaining container processes. |
| **Resource Management**    | Manages containerized application environments. Can include networking and storage management. | Manages resource isolation for containers using namespaces and cgroups. |
| **Isolation**              | Not typically responsible for isolation; it relies on runtimes. | Provides isolation between containers using Linux namespaces and cgroups. |
| **Networking**             | Manages networking between containers and outside environments (often integrated with orchestration). | Not typically responsible for networking; relies on container engine. |
| **Storage**                | Manages container storage and volume management.    | Not responsible for storage, uses external systems integrated by the engine. |
| **Orchestration**          | Orchestrates container deployment, scaling, and management (e.g., in Kubernetes or Docker Swarm). | Does not handle orchestration, relies on container engines or orchestration systems like Kubernetes. |
| **Example**                | Docker Engine, Podman, Docker Compose                 | containerd, runc, CRI-O, Kata Containers                 |


### Container Runtimes Categories

### **High-Level Container Runtimes**

- High-level container runtimes are responsible for managing the overall lifecycle of containers.
- They typically interact with container orchestration systems (like Kubernetes) and provide abstractions for users to deploy and manage containers.
- These runtimes focus on higher-level management tasks, including pulling container images, managing container processes, and networking.

#### 1. Docker Engine

![Docker Enginer](/assets/img/devops/containers/containerruntimes/docker-engine.png)

- Docker Engine is a high-level runtime that enables the creation and management of lightweight, isolated containers for applications and services. 
- It provides a simplified and consistent environment for running software, abstracting away the complexities of the underlying infrastructure. 
- Docker allows developers to package their applications with all their dependencies into a portable container, ensuring consistent behavior across different environments. 
- These containers are isolated from one another and can be easily deployed, scaled, and managed, making Docker a popular choice for deploying and running applications in various settings, from development to production environments.

#### 2. Podman

- It allows users to create, run, and manage containers for applications and services. 
- Podman is compatible with the Open Container Initiative (OCI) standards and can run Docker-formatted container images. 
- It provides a command-line interface and API for container management, including functions like creating, starting, stopping, and removing containers.
- One key distinction of Podman is that running containers does not require a separate daemon process. 
- It operates as a daemonless container engine, meaning it runs containers as individual processes without the need for a centralized daemon. 
- Podman interacts with the Linux kernel directly through runc.

#### 3. CRI-O

![CRI-O](/assets/img/devops/containers/containerruntimes/cri-o.png)
    
- CRI-O is another high-level runtime, specifically designed to run containers that adhere to the Kubernetes Container Runtime Interface (CRI) specification.
- It focuses on providing a lightweight, stable, and secure runtime environment for running containers within Kubernetes clusters.
- CRI-O enables the execution of containers by interacting with the Kubernetes control plane.
- It adheres to the CRI standard, which defines the interface between Kubernetes and the container runtime.
- This ensures compatibility and interoperability with Kubernetes, allowing users to seamlessly run and manage containers within their Kubernetes environments.
- Similar to Docker and Podman, CRI-O offers features such as container isolation, image management, and container lifecycle management.
- However, CRI-O is specifically tailored for Kubernetes deployments and is optimized for use within the Kubernetes ecosystem.
- It provides a minimal footprint, improved security, and compatibility with container images that adhere to the Open Container Initiative (OCI) standards.


### Low-Level Container Runtimes

- Low-level container runtimes are responsible for directly interacting with the operating system to create and manage containers.
- These runtimes handle the core functionality of containers, such as creating container images, setting up namespaces, cgroups, and providing the execution environment for containers.

#### 1. runc

- runc is a low-level runtime that implements the OCI runtime specification.
- It provides the foundation for running containers by orchestrating container execution and lifecycle management.
- runc is focused on simplicity, portability, and standardization, allowing different containerization platforms and tools to utilize a common runtime interface.

#### 2. crun

- crun is another low-level runtime in C that implements the OCI runtime specification.
- It is designed for lightweight and fast container execution, optimized for performance and resource efficiency.
- crun aims to be a simple and minimalistic alternative to runc, focusing on speed and minimal overhead.
- It provides a compatible runtime environment for running containers while prioritizing simplicity and performance.

#### 3. runhcs

- runhcs (runC with Hypervisor-based Containers) is an experimental project that extends the functionality of runC to support hypervisor-based containers, such as those utilizing the Kernel-based Virtual Machine (KVM).
- It leverages the same OCI runtime specification, allowing users to run containers with the added isolation and security benefits of a hypervisor.
- runhC aims to provide a consistent and familiar interface for managing containers while leveraging the capabilities of hardware virtualization.
- Please note that runhcs is an experimental project, and its adoption and usage may vary. Simply, you can understand as a Windows containers counterpart of runc.

#### 4. containerd

![Containerd Ecosystem](/assets/img/devops/containers/containerruntimes/containerd.png)

- Containerd is on the line between low-level and high-level.
- It actually leans more toward a high-level container runtime because it provides an API layer on top of an OCI-compatible runtime, but we will include it here because you don’t really interact with it directly.
- There’s always an external layer that you use to interact with it, such as a CLI (like nerdctl or ctr) or CRI on Kubernetes.
- It is one of the most popular option after Docker engine and it is a CNCF graduated project since 2019.

### Process-based vs VM-bases Runtimes

| **Process-based Runtimes**                               | **Virtual Machine (VM)-based Runtimes**                      |
|----------------------------------------------------------|--------------------------------------------------------------|
| Examples: Docker, Containerd, CRI-O                      | Examples: Kata, Firecracker                                   |
| Rely on operating system features such as namespaces and cgroups for container isolation and resource management. | Run containers within lightweight virtual machines using hypervisor technologies to create and manage VMs. |
| Lightweight                                              | Enhanced isolation and security                              |
| Provide fast startup times                               | Suitable for scenarios where strict isolation is a priority  |
| Suitable for most container workloads                    | Typically used in scenarios requiring strong isolation and security. |


### Uses Cases for Container Runtimes

- Here are some of the widely used container runtimes and their associated use cases:

| Docker | 	Containerd | CRI-O | rocket(rkt) | 
| ------ | ----------- | ----- | ----------- | 
| Development and testing environments	| Designed to be lightweight and focuses on executing containers reliably and efficiently | 	It is specifically designed to work with Kubernetes | Developed by CoreOS (now part of Red Hat) | 
| Enables the deployment of individual microservices | It is the default container runtime in Kubernetes | Provides a runtime environment optimized for Kubernetes-specific use cases | rkt emphasizes strong security features, such as container signature verification and isolation mechanisms | 
| Often used in CI/CD workflows | Can be used in container orchestration | | Security-focused deployments | 
| Deploying applications across different cloud providers or hybrid environments | It aims to provide a minimal runtime | | | 


