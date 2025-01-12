---
layout: post
title: Kubernetes - Pods
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
image: /assets/img/devops/orchestration/kubernetes/kubernetes-posts.png
description: Explore Pods - A smallest unit in Kubernetes
---

## Introduction to Pods

In Kubernetes, a Pod is the smallest deployable unit, acting as a single instance of a running application in the cluster. It represents a logical host for one or more containers, enabling them to share resources and communicate seamlessly. 

This blog will dive deep into Pods, their creation, networking, container relationships, and essential commands.

### What is a Pod?

A Pod encapsulates one or more containers that:
  
- Share the same network namespace (including the same IP address and port space).
- May share storage volumes.
- Are co-located and share resources.

Pods are designed to host tightly coupled applications that must run together on the same node. For example:

- A web server container and a logging container running side-by-side.
- A database container and a backup agent.

### How to Create Pods?

1. **Creating Pods via CLI**
    - To create a Pod interactively, use the kubectl command-line tool:

    ```bash
    kubectl run my-pod --image=nginx --restart=Never
    ```

    - `--image`: Specifies the container image to use.
    - `--restart=Never`: Ensures the Pod runs as a standalone unit and not part of a higher-level controller like a Deployment.

2. **Creating Pods with YAML**

    - You can define a Pod in YAML and create it using kubectl apply:

    ```yaml
    apiVersion: v1
    kind: Pod
    metadata:
      name: my-pod
    spec:
      containers:
        - name: nginx-container
          image: nginx
          ports:
            - containerPort: 80
    ```

    - Save this YAML as pod.yaml and apply it:

    ```bash
    kubectl apply -f pod.yaml
    ```

### Accessing Documentation for Pod Specifications

- Kubernetes provides built-in documentation for resource specifications using the kubectl explain command.
- For Pods:

```bash
kubectl explain pod
```

- To dig deeper into specific fields:

```bash
kubectl explain pod.spec.containers
```

### Executing Commands in a Running Pod

- Use the kubectl exec command to run commands inside a container of a running Pod:

```bash
kubectl exec -it my-pod -- /bin/bash
```

- `-it`: Opens an interactive terminal session.
- Replace `/bin/bash` with the command you want to execute.

### Pod Restart Policies

- Restart policies determine how Kubernetes handles Pod restarts.
- They are defined under spec.restartPolicy and apply to all containers in the Pod.
- The available options are:
  - `Always (default)`: Always restart containers if they fail.
  - `OnFailure`: Restart only if containers exit with a non-zero exit code.
  - `Never`: Never restart containers, regardless of their exit status.

- Example:

```yaml
spec:
  restartPolicy: OnFailure
```

### Declarative vs. Imperative Approaches

1. **Declarative Approach**
    - Define the desired state of the Pod in a YAML or JSON file.
    - Use kubectl apply to manage the resource.
    - Example:

    ```bash
    kubectl apply -f pod.yaml
    ```

2. **Imperative Approach**
    - Execute commands directly to create or modify resources.
    - Example:

    ```bash
    kubectl run my-pod --image=nginx --restart=Never
    ```

- Key Difference: Declarative is preferred for managing infrastructure as code, while imperative is suitable for quick, one-off operations.

### Networking in Pods

1. **Shared IP Address**
    - All containers in a Pod share the same network namespace, which includes:
      - `IP Address`: Containers in the same Pod communicate via localhost.
      - `Port Space`: Containers can expose ports without conflicting with other Pods.

2. **Pod-to-Pod Communication**
    - Kubernetes ensures that Pods can communicate with each other using their assigned IPs, without the need for NAT.
    - This is achieved through the CNI (Container Network Interface) plugins that implement flat networking across the cluster.

### Running Multiple Containers in a Pod

![Single vs Multi Container Pod](/assets/img/devops/orchestration/kubernetes/core-concepts/single-vs-multi-container-pod.webp)

- Share the same network namespace and storage volumes.
- Are used for tightly coupled workloads.
- Example YAML for multiple containers:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-container-pod
spec:
  containers:
    - name: app-container
      image: nginx
    - name: sidecar-container
      image: busybox
      command: ["sh", "-c", "while true; do echo Hello; sleep 5; done"]
```

### Accessing Logs in Pods

1. **Logs for a Particular Container**
    - To fetch logs from a specific container in a Pod:

    ```bash
    kubectl logs multi-container-pod -c app-container
    ```

    - `-c`: Specifies the container name.

2. **Logs from a Terminated Container**
    - To retrieve logs from a previously terminated container:

    ```bash
    kubectl logs multi-container-pod -c app-container --previous
    ```

### Sidecars and Init Containers

1. **Sidecars**
    - A sidecar container is a secondary container in a Pod that provides supplementary functionality to the primary container.
    - Common use cases include:
      - `Log forwarding` (e.g., Fluentd as a sidecar).
      - `Proxying traffic` (e.g., Envoy or Istio proxies).

    - *Implementation examples:*

    - `1. Log Enrichment for Monitoring and Analytics`
      - A web application (main application) that generates raw logs as part of its operation, such as access logs, error logs, or request traces.
      - These raw logs are not immediately ready for analysis because they need to be enriched, formatted, or processed (e.g., adding metadata like request latency, geolocation, or user agent parsing).
      - Instead of embedding the log processing logic into the main application, you can use a sidecar container to handle this task.
      - This decouples responsibilities and keeps the main application focused on its primary function.

      ```yaml
      apiVersion: v1
      kind: Pod
      metadata:
        name: sidecar-log-processing
        labels:
          app: sidecar-demo
      spec:
        containers:
          - name: main-app
            image: nginx:latest
            volumeMounts:
              - name: shared-logs
                mountPath: /var/log/app
            ports:
              - containerPort: 80
            command:
              - /bin/sh
              - -c
              - |
                echo "Starting main application..." && \
                while true; do echo "Raw log: Request received at $(date)" >> /var/log/app/raw.log; sleep 5; done

          - name: log-processor
            image: busybox:latest
            volumeMounts:
              - name: shared-logs
                mountPath: /var/log/app
            command:
              - /bin/sh
              - -c
              - |
                echo "Starting log processing..." && \
                while true; do \
                  if [ -f /var/log/app/raw.log ]; then \
                    while read -r line; do \
                      echo "$(date) [INFO] Processed log: $line" >> /var/log/app/processed.log; \
                    done < /var/log/app/raw.log; \
                    > /var/log/app/raw.log; \
                  fi; \
                  sleep 5; \
                done

        volumes:
          - name: shared-logs
            emptyDir: {}
      ```

    - `Explanation`:
      - *1. Main Application (main-app):*
        - Writes raw logs to /var/log/app/raw.log.
        - Simulates a typical application logging raw events (e.g., "Request received").
      - *2. Sidecar Container (log-processor):*
        - Reads raw logs from /var/log/app/raw.log.
        - Processes each log line by:
        - Adding a timestamp and log level ([INFO]).
        - Writing the processed logs to /var/log/app/processed.log.
        - Clears the raw logs after processing to avoid duplicate entries.
      - *3. Shared Volume:*
        - Enables communication between the main application and the sidecar container by sharing log files.

    - `2. Log Compression and Forwarding`

      - The main application generates high-volume logs in plain text format.
      - A sidecar container reads these logs, compresses them to save storage and bandwidth, and writes the compressed logs to the shared volume.
      - A log forwarder or external system can then pick them up for analysis.

      ```yaml
      apiVersion: v1
      kind: Pod
      metadata:
        name: sidecar-log-compression
        labels:
          app: sidecar-demo
      spec:
        containers:
          - name: main-app
            image: nginx:latest
            volumeMounts:
              - name: shared-logs
                mountPath: /var/log/app
            ports:
              - containerPort: 80
            command:
              - /bin/sh
              - -c
              - |
                echo "Starting main application..." && \
                while true; do echo "Raw log: Request received at $(date)" >> /var/log/app/raw.log; sleep 3; done

          - name: log-compressor
            image: busybox:latest
            volumeMounts:
              - name: shared-logs
                mountPath: /var/log/app
            command:
              - /bin/sh
              - -c
              - |
                echo "Starting log compression..." && \
                while true; do \
                  if [ -s /var/log/app/raw.log ]; then \
                    gzip -c /var/log/app/raw.log > /var/log/app/raw.log.$(date +%s).gz && \
                    echo "Compressed logs written to /var/log/app/" && \
                    > /var/log/app/raw.log; \
                  fi; \
                  sleep 10; \
                done

        volumes:
          - name: shared-logs
            emptyDir: {}
      ```

      - *Explanation:*
        - *1. Main Application (main-app):*
          - Simulates an application writing raw logs to /var/log/app/raw.log every 3 seconds.
        - *2.Sidecar Container (log-compressor):*
          - Periodically checks if /var/log/app/raw.log has content.
          - Compresses the raw log file using gzip, appending a timestamp to the filename (e.g., raw.log.1673014851.gz).
          - Clears the raw log file after compression to prevent duplication.
        - *3. Shared Volume:*
          - An emptyDir volume is used to share logs between the main application and the sidecar container.

2. **Init Containers**
    - Init containers are special containers that run before the main application containers start.
    - They are useful for setup tasks like:
      - Fetching configuration files.
      - Running database migrations.
    - Example:

    ```yaml
    apiVersion: v1
    kind: Pod
    metadata:
      name: pod-with-init
    spec:
      initContainers:
        - name: init-container
          image: busybox
          command: ["sh", "-c", "echo Initializing..."]
      containers:
        - name: app-container
          image: nginx
    ```

### Summary

By mastering these aspects of Pods, you gain a strong foundation for deploying and managing applications in Kubernetes. Understanding how Pods work is crucial for leveraging Kubernetes to its full potential.
