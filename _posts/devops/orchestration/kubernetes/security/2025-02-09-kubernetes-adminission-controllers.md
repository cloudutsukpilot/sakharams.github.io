---
layout: post
title: Kubernetes - Admission Controllers
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
image: /assets/img/devops/orchestration/kubernetes/kubernetes-posts.png
description: Dive deep into Kubernetes Admission Controllers, their types, how they work, and how to configure them effectively for better security and governance.
---

## Introduction

Kubernetes is a powerful container orchestration platform, but with great power comes the need for strict control over workloads. Admission Controllers play a crucial role in enforcing policies and governance on objects being created, updated, or deleted within a Kubernetes cluster. These controllers act as gatekeepers, ensuring that only compliant workloads are admitted.

### What Are Admission Controllers?

- Admission Controllers are built-in components in Kubernetes that intercept API requests before they are persisted in etcd.
- They provide an additional layer of security and policy enforcement by evaluating the request and either accepting, modifying, or rejecting it based on predefined rules.

### Types of Admission Controllers

- Kubernetes Admission Controllers are categorized into two main types:

1. **Mutating Admission Controllers**

    - These controllers can modify an incoming request before it is persisted.
    - They are commonly used to inject labels, add sidecar containers, or modify security policies.
    - Example: `MutatingAdmissionWebhook`, `PodSecurityPolicy` (deprecated).

2. **Validating Admission Controllers**

    - These controllers only validate requests and can either approve or deny them without modification.
    - They enforce compliance and security policies.
    - Example: `ValidatingAdmissionWebhook`, `ResourceQuota`.

### How Admission Controllers Work

- A user submits a request to the Kubernetes API server.
- The API server authenticates and authorizes the request.
- The request is then passed to Admission Controllers for validation or modification.
- If all admission controllers approve the request, it is persisted in etcd and executed.
- If any admission controller rejects the request, an error is returned to the user.

### Commonly Used Admission Controllers

1. **NamespaceLifecycle**
    - Prevents the creation of objects in deleted or non-existent namespaces.

2. **PodSecurity (Replacement for PodSecurityPolicy)**
    - Enforces security policies at the pod level based on predefined profiles.

3. **LimitRanger**
    - Ensures resource limits are set for pods and containers to prevent overutilization.

4. **ResourceQuota**
    - Enforces quotas on CPU, memory, and other resources at the namespace level.

5. **MutatingAdmissionWebhook & ValidatingAdmissionWebhook**
    - Allow external webhooks to modify or validate requests dynamically.

### Configuring Admission Controllers

- Admission Controllers are enabled via the `--enable-admission-plugins` flag in the API server configuration. 
- Example:

```sh
kube-apiserver --enable-admission-plugins=NamespaceLifecycle,LimitRanger,PodSecurity,MutatingAdmissionWebhook,ValidatingAdmissionWebhook
```

- To disable an admission controller, use:

```sh
kube-apiserver --disable-admission-plugins=ServiceAccount
```

### Using Webhooks for Custom Admission Control

- Admission webhooks allow organizations to implement custom validation and mutation logic.
- Example of a simple validating webhook configuration:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: example-webhook
webhooks:
  - name: validate.example.com
    clientConfig:
      service:
        name: validation-service
        namespace: default
        path: /validate
    rules:
      - apiGroups: ["*"]
        apiVersions: ["*"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
```

### Best Practices for Admission Controllers

1. `Use Webhooks Wisely`: Webhooks introduce latency; ensure they are performant and highly available.
2. `Enable Security Policies`: Use PodSecurity and ResourceQuota to enforce best practices.
3. `Audit Admission Decisions`: Log admission controller decisions for debugging and security auditing.
4. `Test Before Enabling`: Always test custom admission controllers in a staging environment.
5. `Ensure High Availability`: If using webhooks, ensure redundant instances are running to avoid disruptions.

### Conclusion

Admission Controllers are a critical component of Kubernetes, providing policy enforcement, security, and governance for workloads. By leveraging built-in controllers and webhooks, administrators can ensure that clusters remain secure and compliant.

Understanding and configuring Admission Controllers correctly can help enforce best practices, prevent misconfigurations, and improve security in your Kubernetes environment.