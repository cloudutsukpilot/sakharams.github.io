---
layout: post
title: Docker vs Containerd
categories: [devops, orchestration, miscellaneous]
tags: [Docker, Containerd]
---

## Docker vs Containerd

## Docker vs Containerd

#### Container Runtime Interface (CRI)
- The Container Runtime Interface (CRI) is an API that defines the interface between container runtimes (like Docker and Containerd) and container orchestration systems (like Kubernetes). 
- It allows container orchestration systems to be agnostic to the underlying container runtime, enabling them to work with different container runtimes interchangeably.

#### Open Container Initiative (OCI)
- The Open Container Initiative (OCI) is an open governance structure and project under the Linux Foundation that aims to create open industry standards for container formats and runtime. 
- The OCI defines two main specifications: the Image Specification and the Runtime Specification. 
1. The Image Specification defines the format and structure of container images, including the filesystem layout and metadata. 
2. The Runtime Specification defines the standard interface between the container runtime and the operating system, specifying how containers should be created, executed, and managed.

#### Containerd
- Containerd is an industry-standard container runtime with an emphasis on simplicity, robustness, and portability.
- CRI compatible.

#### Docker
- Docker is an open-source platform that automates the deployment, scaling, and management of applications using containerization. 
- It allows you to package an application with all of its dependencies into a standardized unit for software development. 
- Docker provides a user-friendly interface (CLI and API) for users to interact with, while containerd operates in the background, handling the lower-level container management tasks.

#### Co-relation between Docker and Containerd
- Docker originally used its own container runtime, called docker, but later it started using containerd as its core container runtime. 
- containerd is a component of Docker that is responsible for managing containers, while Docker provides the high-level tooling and user interface on top of it.


| Docker | Containerd |
|--------|------------|
| Provides a complete container runtime environment | Provides a container runtime for managing and executing containers |
| Includes a high-level API and command-line interface | Offers a low-level API for container management |
| Supports container orchestration and networking features | Focuses solely on container execution and management |
| Includes built-in image management and distribution | Relies on external tools like CRI-O or BuildKit for image management |
| Suitable for developers and operators looking for a comprehensive container platform | Suitable for advanced users who want a lightweight container runtime |
