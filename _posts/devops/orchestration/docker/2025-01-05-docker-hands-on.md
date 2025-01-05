---
layout: post
title: Docker - Hands On
categories: [devops, orchestration, docker]
tags: [DevOps, Orchestration, Docker]
image: /assets/img/devops/docker/docker-posts.jpg
description: Make your hands dirty with some docker related exercises.
---

## Docker - Hands On

### Docker Version

1. **Check the docker version installed on your machine**

    - Command:

    ```sh
    docker version
    ```

    - Output:

    ```sh
    Client:
      Version:           27.2.0
      API version:       1.47
      Go version:        go1.21.13
      Git commit:        3ab4256
      Built:             Tue Aug 27 14:17:17 2024
      OS/Arch:           windows/amd64
      Context:           desktop-linux

    Server: Docker Desktop 4.34.2 (167172)
    Engine:
      Version:          27.2.0
      API version:      1.47 (minimum version 1.24)
      Go version:       go1.21.13
      Git commit:       3ab5c7d
      Built:            Tue Aug 27 14:15:15 2024
      OS/Arch:          linux/amd64
      Experimental:     false
    containerd:
      Version:          1.7.20
      GitCommit:        8fc6bcff51318944179630522a095cc9dbf9f353
    runc:
      Version:          1.1.13
      GitCommit:        v1.1.13-0-g58aa920
    docker-init:
      Version:          0.19.0
      GitCommit:        de40ad0
    ```

    - Docker uses a client-server architecture, so the docker client and docker server can run independently.
    - Docker uses `containerd` container engine and `runc` as a container runtime.
    - `containerd`
      - A container runtime that manages the entire container lifecycle from image transfer to storage, execution, and supervision.
      - Role in Docker:
        - Acts as an abstraction layer between Docker's CLI/API and the lower-level runtimes (like runc).
        - Responsible for pulling images, managing container snapshots, and interacting with the underlying runtime.
      - Key Features:
        - Supports container creation and management.
        - Handles container storage and networking.
        - Provides advanced features like checkpoint/restore for containers.
      - Relation to Docker:
        - Docker relies on containerd to manage the high-level container lifecycle processes.
        - It ensures efficient and seamless interaction between the Docker engine and the OS-level runtime.
    - `runc`
      - A lightweight, low-level container runtime that implements the Open Container Initiative (OCI) Runtime Specification.
      - Role in Docker:
        - Directly interacts with the Linux kernel to create and run containers.
        - Configures namespaces, cgroups, and other Linux primitives required for container isolation and resource management.
      - Key Features:
        - Executes container processes in isolated environments.
        - Provides minimal overhead, improving performance.
        - Compatible with OCI standards, ensuring interoperability across tools.
      - Relation to Docker:
        - When you execute a docker run command, Docker:
        - Invokes containerd to manage the container lifecycle.
        - containerd calls runc to perform the actual setup and execution of the container on the system.
    - How do containerd and runc work together in Docker's Architecture:
      - Docker CLI/Daemon interacts with containerd for high-level container operations (e.g., creating, starting, and stopping containers).
      - containerd delegates the low-level container runtime tasks to runc, which handles the kernel-level operations for container isolation and execution.

2. **Check the configuration information about Docker**

- Command:

    ```sh
    docker info
    ```

- Output:

    ```sh
    Client:
      Version:    27.2.0
      Context:    desktop-linux
      Debug Mode: false
      Plugins:
        buildx: Docker Buildx (Docker Inc.)
          Version:  v0.16.2-desktop.1
          Path:     C:\Program Files\Docker\cli-plugins\docker-buildx.exe
        compose: Docker Compose (Docker Inc.)
          Version:  v2.29.2-desktop.2
          Path:     C:\Program Files\Docker\cli-plugins\docker-compose.exe
        debug: Get a shell into any image or container (Docker Inc.)
          Version:  0.0.34
          Path:     C:\Program Files\Docker\cli-plugins\docker-debug.exe
        desktop: Docker Desktop commands (Alpha) (Docker Inc.)
          Version:  v0.0.15
          Path:     C:\Program Files\Docker\cli-plugins\docker-desktop.exe
        dev: Docker Dev Environments (Docker Inc.)
          Version:  v0.1.2
          Path:     C:\Program Files\Docker\cli-plugins\docker-dev.exe
        extension: Manages Docker extensions (Docker Inc.)
          Version:  v0.2.25
          Path:     C:\Program Files\Docker\cli-plugins\docker-extension.exe
        feedback: Provide feedback, right in your terminal! (Docker Inc.)
          Version:  v1.0.5
          Path:     C:\Program Files\Docker\cli-plugins\docker-feedback.exe
        init: Creates Docker-related starter files for your project (Docker Inc.)
          Version:  v1.3.0
          Path:     C:\Program Files\Docker\cli-plugins\docker-init.exe
        sbom: View the packaged-based Software Bill Of Materials (SBOM) for an image (Anchore Inc.)
          Version:  0.6.0
          Path:     C:\Program Files\Docker\cli-plugins\docker-sbom.exe
        scout: Docker Scout (Docker Inc.)
          Version:  v1.13.0
          Path:     C:\Program Files\Docker\cli-plugins\docker-scout.exe

    Server:
      Containers: 3
        Running: 1
        Paused: 0
        Stopped: 2
      Images: 8
      Server Version: 27.2.0
        Storage Driver: overlayfs
        driver-type: io.containerd.snapshotter.v1
      Logging Driver: json-file
      Cgroup Driver: cgroupfs
      Cgroup Version: 1
      Plugins:
        Volume: local
        Network: bridge host ipvlan macvlan null overlay
        Log: awslogs fluentd gcplogs gelf journald json-file local splunk syslog
      Swarm: inactive
      Runtimes: nvidia runc io.containerd.runc.v2
      Default Runtime: runc
      Init Binary: docker-init
      containerd version: 8fc6bcff51318944179630522a095cc9dbf9f353
      runc version: v1.1.13-0-g58aa920
      init version: de40ad0
      Security Options:
        seccomp
        Profile: unconfined
      Kernel Version: 5.15.153.1-microsoft-standard-WSL2
      Operating System: Docker Desktop
      OSType: linux
      Architecture: x86_64
      CPUs: 12
      Total Memory: 7.607GiB
      Name: docker-desktop
      ID: bdca1064-96c9-4253-b78a-a55e08270f42
      Docker Root Dir: /var/lib/docker
      Debug Mode: false
      HTTP Proxy: http.docker.internal:3128
      HTTPS Proxy: http.docker.internal:3128
      No Proxy: hubproxy.docker.internal
      Labels:
        com.docker.desktop.address=npipe://\\.\pipe\docker_cli
      Experimental: false
      Insecure Registries:
        hubproxy.docker.internal:5555
        127.0.0.0/8
      Live Restore Enabled: false
    ```

### Running Containers

1. **Run a `ubuntu` container using interactive terminal**

    ```sh
    docker run -it ubuntu bash
    ```

2. **Run a `ubuntu` container and get the output of file `/etc/os-release` and remove the container**

    ```sh
    docker run --rm ubuntu cat /etc/os-release
    ```

3. **Run a `nginx` container in background and remove it when stopped**

    ```sh
    docker run -d --rm nginx
    ```

4. **Run a `nginx`container in the background and expose the port**

    ```sh
    docker run -d --rm -P nginx
    ```

5. **Run a `nginx` container in the background with a specific port**

    ```sh
    docker run -d --rm -p 12334:80 nginx
    ```

6. **Run a `nginx` container in the background in interactive mode and mount a volumne containing local folder. Make change to a the file and check if they are reflect on the nginx home page**

    ```sh
    cd C:\Users\Sakharam.Shinde
    mkdir homepage
    echo "Hello Nginx from Sakharam" > homepage/index.html
    docker run -d --rm -p 12334:80 -v C:/Users/Sakharam.Shinde/homepage:/usr/share/nginx/html nginx
    curl localhost:12334
    echo "Shinde" >> homepage/index.html
    curl localhost:12334
    ```
