---
layout: post
title: Kubernetes - ConfigMaps
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
image: /assets/img/devops/orchestration/kubernetes/core-concepts/kubernetes-configmaps.png
description: Dive into Kubernetes ConfigMaps
---


## Introduction

Kubernetes ConfigMaps are a core resource for managing application configuration data. They decouple configuration from application code, making your applications more portable, manageable, and scalable.

### What is a ConfigMap?

- A ConfigMap is an API object used to store non-sensitive configuration data in key-value pairs.
- Applications running in Pods can consume this configuration data as environment variables, command-line arguments, or configuration files.

### Key Features

1. `Decoupling Configuration and Code`: Changes to configuration do not require rebuilding application containers.
2. `Flexibility`: Supports multiple ways of injecting data into applications.
3. `Dynamic Updates`: When not immutable, ConfigMaps allow live updates to configurations consumed by containers.

### Sample Example

- Here is a ConfigMap definition and how it can be consumed in a Pod:
  - ConfigMap Definition

  ```yaml
  apiVersion: v1
  kind: ConfigMap
  metadata:
    name: app-config
    namespace: default
  data:
    APP_ENV: "production"
    APP_PORT: "8080"
  ```

  - Consuming ConfigMap in a Pod

  ```yaml
  apiVersion: v1
  kind: Pod
  metadata:
    name: app-pod
  spec:
    containers:
    - name: app-container
      image: nginx
      env:
      - name: APP_ENV
        valueFrom:
          configMapKeyRef:
            name: app-config
            key: APP_ENV
      - name: APP_PORT
        valueFrom:
          configMapKeyRef:
            name: app-config
            key: APP_PORT
  ```

- Explanation:
  - The `env` section specifies environment variables populated from the ConfigMap `app-config`.
  - The keys `APP_ENV` and `APP_PORT` are injected as environment variables into the container.

### Immutable ConfigMap

- An immutable ConfigMap is a ConfigMap that cannot be changed after creation.
- This is useful for ensuring that configuration data remains consistent, reducing the risk of unintended changes or conflicts.
- Why Use Immutable ConfigMaps?
  - `Performance Improvement`: Kubernetes skips tracking changes for immutable ConfigMaps, resulting in better performance.
  - `Stability`: Prevents accidental or unauthorized changes to configuration data.
  - `Best Practice`: Ideal for production environments where stability is critical.
- To make a ConfigMap immutable, set immutable: true during creation:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: example-configmap
  namespace: default
immutable: true
data:
  key1: value1
  key2: value2
```

- Once an immutable ConfigMap is created, you cannot modify its contents. To update it, you must delete and recreate the ConfigMap.

### Real-World Use Cases of ConfigMaps

1. **Application Configuration**

    - Storing application settings, such as log levels, environment modes, or feature flags.
    - Example: A Java application using a ConfigMap to define JVM options.

2. **File Configuration**

    - Injecting configuration files into containers.
    - Example: An NGINX web server using a ConfigMap to define its nginx.conf file.

    ```yaml
    apiVersion: v1
    kind: ConfigMap
    metadata:
      name: nginx-config
    data:
      nginx.conf: |
        server {
          listen 80;
          server_name localhost;
          location / {
            root /usr/share/nginx/html;
            index index.html;
          }
        }
    ```

    - Consuming in a Pod:

    ```yaml
    apiVersion: v1
    kind: Pod
    metadata:
      name: nginx-pod
    spec:
      containers:
      - name: nginx-container
        image: nginx
        volumeMounts:
        - name: nginx-config-volume
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf
      volumes:
      - name: nginx-config-volume
        configMap:
          name: nginx-config
    ```

3. **Dynamic Configuration Updates**
    - Use ConfigMaps to update configurations dynamically (if not immutable) for scenarios like feature toggles or debugging modes.

4. **Shared Configuration Across Multiple Pods**
    - Store common configuration for multiple applications or services.

### Best Practices for Using ConfigMaps

1. `Use Immutable ConfigMaps`: For production workloads to ensure stability and improve performance.
2. `Separate Sensitive Data`: Use Secrets for sensitive information like passwords or API keys.
3. `Namespace Scoping`: Keep ConfigMaps scoped to the required namespace to avoid accidental misuse.
4. `Version Control`: Store ConfigMap YAMLs in version control systems for tracking changes.

### Conclusion

ConfigMaps in Kubernetes provide a flexible and efficient way to manage application configurations. By decoupling configuration from code, they make your workloads more adaptable and easier to manage. With immutability options and multiple ways of consumption, ConfigMaps are a critical tool for building reliable, scalable applications in Kubernetes.
