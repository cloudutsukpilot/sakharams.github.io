---
layout: post
title: Kubernetes - Secrets
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
image: /assets/img/devops/orchestration/kubernetes/core-concepts/kubernetes-secrets.png
description: Dive into Kubernetes Secrets
---

## Introduction

Kubernetes Secrets are a secure way to manage sensitive information such as passwords, API keys, TLS certificates, and other confidential data. By separating secrets from application code, Kubernetes ensures that sensitive data is handled securely and efficiently.

### What is a Secret?

- A Secret in Kubernetes is an API object that stores sensitive data in key-value pairs.
- Secrets are designed to improve the security of your cluster by avoiding the need to hardcode sensitive information into your application images or configurations.

### Key Features

1. `Secure Storage`: Secrets are stored in base64-encoded format in etcd, which can be secured further using encryption.
2. `Fine-Grained Access Control`: Use Role-Based Access Control (RBAC) to restrict access to Secrets.
3. `Flexibility`: Secrets can be consumed as environment variables, files mounted in volumes, or directly accessed by the application.

### Types of Secrets in Kubernetes

- Kubernetes supports several types of Secrets to cater to different use cases:

1. **Opaque Secrets**

    - `Definition`: The default type for arbitrary key-value pairs.
    - `Example`:

    ```yaml
    apiVersion: v1
    kind: Secret
    metadata:
      name: opaque-secret
    type: Opaque
    data:
      username: dXNlcm5hbWU=  # base64-encoded "username"
      password: cGFzc3dvcmQ=  # base64-encoded "password"
    ```

    - `Use Case`: Storing generic secrets like database credentials, API tokens, or application keys.

2. **TLS Secrets**

    - `Definition`: Used to store TLS certificates and keys.
    - `Example`:

    ```yaml
    apiVersion: v1
    kind: Secret
    metadata:
      name: tls-secret
    type: kubernetes.io/tls
    data:
      tls.crt: <base64-encoded-cert>
      tls.key: <base64-encoded-key>
    ```

    - `Use Case`: Managing TLS/SSL termination for HTTPS communication in Ingress resources.

3. **Docker Config Secrets**

    - `Definition`: Used to authenticate to private Docker registries.
    - `Example`:

    ```yaml
    apiVersion: v1
    kind: Secret
    metadata:
      name: docker-config-secret
    type: kubernetes.io/dockerconfigjson
    data:
      .dockerconfigjson: <base64-encoded-docker-config>
    ```

    - `Use Case`: Pulling images from private Docker registries.

4. **Basic Authentication Secrets**

    - `Definition`: Used to store credentials for basic authentication.
    - `Example`s:

    ```yaml
    apiVersion: v1
    kind: Secret
    metadata:
      name: basic-auth-secret
    type: kubernetes.io/basic-auth
    data:
      username: dXNlcm5hbWU=  # base64-encoded "username"
      password: cGFzc3dvcmQ=  # base64-encoded "password"
    ```

    - `Use Case`: Storing basic auth credentials for accessing services.

5. **SSH Authentication Secrets**

    - `Definition`: Used to store SSH private keys.
    - `Example`:

    ```yaml
    apiVersion: v1
    kind: Secret
    metadata:
      name: ssh-auth-secret
    type: kubernetes.io/ssh-auth
    data:
      ssh-privatekey: <base64-encoded-private-key>
    ```

    - `Use Case`: Authenticating with SSH-enabled services or Git repositories.

### Difference Between ConfigMaps and Secrets

| **Feature**         | **ConfigMap**                                | **Secret**                                   |
|----------------------|----------------------------------------------|---------------------------------------------|
| **Purpose**         | Store non-sensitive configuration data.      | Store sensitive or confidential information.|
| **Data Encoding**   | Plaintext                                   | Base64-encoded.                            |
| **Security**        | Less secure; no encryption by default.       | More secure; can be encrypted in etcd.     |
| **Use Case**        | Environment variables, app settings.         | Passwords, API keys, TLS certificates.     |
| **Immutability**    | Supports immutability.                       | Supports immutability.                     |

### Real-World Use Cases of Secrets

1. **Database Credentials**
    - Store usernames and passwords for database connections.
    - Example: A MySQL Pod consuming a Secret for authentication.

    ```yaml
    apiVersion: v1
    kind: Secret
    metadata:
      name: db-credentials
    type: Opaque
    data:
      username: dXNlcm5hbWU=  # "username"
      password: cGFzc3dvcmQ=  # "password"
    ```

2. **TLS Termination**
    - Manage certificates and private keys for secure communication.
    - Example: An Ingress controller using a TLS Secret.

3. **Private Docker Registry Authentication**
    - Authenticate to pull images from private registries.
    - Example: A Pod specifying an imagePullSecrets referencing a Docker Config Secret.

    ```yaml
    apiVersion: v1
    kind: Pod
    metadata:
      name: private-registry-pod
    spec:
      containers:
      - name: my-container
        image: private-registry.com/my-image:latest
      imagePullSecrets:
      - name: docker-config-secret
    ```

4. **SSH Key Management**
    - Securely access Git repositories for CI/CD workflows.
    - Example: A Deployment using an SSH Secret for Git clone operations.

### Best Practices for Using Secrets

1. `Enable Encryption`: Configure etcd encryption for enhanced security.
2. `Use RBAC`: Limit access to Secrets to only necessary users and services.
3. `Immutable Secrets`: Mark Secrets as immutable to prevent accidental changes.
4. `External Secret Management`: Integrate with tools like HashiCorp Vault or AWS Secrets Manager for advanced secret management.
5. `Avoid Hardcoding`: Never hardcode sensitive information into container images or source code.

### Conclusion

Kubernetes Secrets provide a robust and secure way to manage sensitive information in your cluster. By leveraging different types of Secrets, you can handle various use cases such as authentication, encryption, and secure communication. With best practices like enabling encryption and using RBAC, you can ensure your Secrets remain protected.
