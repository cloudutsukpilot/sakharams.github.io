---
layout: post
title: Container Volumes
categories: [devops, orchestration, containers]
tags: [DevOps, Orchestration, Containers]
image: /assets/img/devops/containers/container-posts.webp
description: In this blog, we'll explore container volumes and their types.
---

## Container Volumes

- Volumes provide a mechanism to persist data generated or used by containers.
- Unlike ephemeral storage within a container, volumes allow data to persist even when the container stops or is removed.

### Types of Container Volumes

### 1. Anonymous Volumes

- Automatically created and managed by the container runtime.

### 2. Named Volumes

- Explicitly created by users and easily reused by multiple containers.

### 3. Bind Mounts

- Link specific host directories or files to a container.

### Why Use Volumes?

- Retain data across container restarts or updates.
- Share data between multiple containers.
- Decouple data storage from the container runtime.

### Managing Volumes

1. Create a Named Volume

    ```sh
    container-cli volume create my_data_volume
    ```

2. Run a Container with the Volume

    ```sh
    container-cli run --name app2 -v my_data_volume:/data my_app_image
    ```

3. Inspect the Volume

    ```sh
    container-cli volume inspect my_data_volume
    ```

4. List All Volumes

    ```sh
    container-cli volume list
    ```
