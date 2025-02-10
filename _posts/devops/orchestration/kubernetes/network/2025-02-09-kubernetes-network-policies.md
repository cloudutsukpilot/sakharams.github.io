---
layout: post
title: Kubernetes - Network Policies
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
image: /assets/img/devops/orchestration/kubernetes/networking/network-policies.webp
description: Explore Kubernetes Network Policies in detail, understand their significance, and learn how to implement them effectively.
---

## Introduction

Kubernetes is a powerful container orchestration platform that simplifies deployment and management of applications. However, managing network security within a Kubernetes cluster is crucial to ensure that workloads communicate only as intended. Kubernetes Network Policies enable fine-grained control over inter-pod communication, allowing administrators to enforce security rules efficiently.

### What are Kubernetes Network Policies?

- A Network Policy is a Kubernetes resource that defines rules for allowing or blocking network traffic between pods within a cluster.
- By default, all pods in Kubernetes can communicate freely with each other.
- Network Policies enable administrators to restrict communication based on factors such as pod labels, namespaces, and IP blocks.

### Why Use Network Policies?

- Network Policies are essential for:
  - `Enhancing security`: Prevent unauthorized communication between services.
  - `Compliance and governance`: Enforce security policies to comply with regulatory requirements.
  - `Minimizing attack surface`: Reduce exposure of sensitive services to potential attackers.
  - `Isolating workloads`: Ensure that applications communicate only with required components.

### How Network Policies Work

- Network Policies work by defining rules that control traffic ingress (incoming) and egress (outgoing) from a pod.
- These rules use pod labels, namespaces, and IP ranges to determine which traffic is allowed or denied.
- Key Components of a Network Policy
  - `Pod Selector`: Defines which pods the policy applies to using labels.
  - `Ingress Rules`: Specifies allowed incoming traffic.
  - `Egress Rules`: Specifies allowed outgoing traffic.
  - `Policy Types`: Defines whether the policy controls Ingress, Egress, or both.

### Creating a Network Policy

- Let's create a simple Network Policy to allow traffic only from specific pods.

#### Step 1: Define a Network Policy

- Create a YAML file (network-policy.yaml) with the following content:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-app-access
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: my-app
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              role: frontend
      ports:
        - protocol: TCP
          port: 80
```

#### Step 2: Apply the Network Policy

- Run the following command to apply the policy:

```sh
kubectl apply -f network-policy.yaml
```

#### Step 3: Verify the Policy

- To check applied Network Policies, use:

```sh
kubectl get networkpolicy
```

- You can describe the policy in detail:

```sh
kubectl describe networkpolicy allow-app-access
```

### Example Use Cases

1. Deny All Traffic by Default

    - A common security best practice is to deny all traffic by default and explicitly allow required communication.

    ```yaml
    apiVersion: networking.k8s.io/v1
    kind: NetworkPolicy
    metadata:
      name: deny-all
      namespace: default
    spec:
      podSelector: {}
      policyTypes:
        - Ingress
        - Egress
    ```

2. Allow Egress Traffic to a Specific External Service

    - Allow pods to communicate only with an external database server.

    ```yaml
    apiVersion: networking.k8s.io/v1
    kind: NetworkPolicy
    metadata:
      name: allow-db-egress
      namespace: default
    spec:
      podSelector:
        matchLabels:
          app: backend
      policyTypes:
        - Egress
      egress:
        - to:
            - ipBlock:
                cidr: 192.168.1.100/32
          ports:
            - protocol: TCP
              port: 5432
     ```

### Network Policy Limitations

- Not all Kubernetes networking solutions support Network Policies (e.g., Calico, Cilium, and WeaveNet support them, but some CNI plugins do not).
- Does not apply to host-networked pods.
- Only controls pod-to-pod traffic (not external internet access unless explicitly defined).

### Conclusion

Kubernetes Network Policies provide a robust mechanism for securing inter-pod communication within a cluster. By defining clear ingress and egress rules, administrators can enforce security best practices, limit attack surfaces, and ensure compliance with organizational policies.
