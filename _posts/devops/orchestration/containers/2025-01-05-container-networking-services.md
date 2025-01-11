---
layout: post
title: Container Networking Services
categories: [devops, orchestration, containers]
tags: [DevOps, Containers]
image: /assets/img/devops/containers/container-posts.webp
description: In this blog, we'll explore container networking services and their types.
---

## Container Networking

- Networking allows containers to communicate with each other, the host system, and external systems.
- It abstracts the complexity of underlying network configurations, enabling seamless communication across different environments.

### Types of Container Networks

### 1. Bridge Networks

- Provide isolated communication between containers on the same host.
- Containers within the same network can communicate using their container names.

### 2. Host Networks

- Containers share the host’s network stack for higher performance in certain scenarios.

### 3. Isolated Networks

- Completely disables external communication, isolating the container.

### 4. Overlay Networks

- Enable container communication across multiple hosts in distributed setups.

### 5. Custom Networks

- User-defined networks tailored for specific use cases.

### Managing Networks using Container CLI

1. Create a Custom Bridge Network

   ```sh
   container-cli network create my_custom_network
   ```

2. Run a Container in the Custom Network

   ```sh
   container-cli run --name app1 --network my_custom_network my_app_image
   ```

3. Inspect the Network

   ```sh
   container-cli network inspect my_custom_network
   ```
