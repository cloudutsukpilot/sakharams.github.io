---
layout: post
title: Kubernetes - Role Based Access Control (RBAC)
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
image: /assets/img/devops/orchestration/kubernetes/kubernetes-posts.png
description: Explore the Kubernetes RBAC mechanism to improve the security posture of a K8 cluster.
---

## Introduction

- Kubernetes RBAC (Role-Based Access Control) is a crucial security mechanism that governs how users, applications, and services interact with cluster resources. By defining permissions through roles and bindings, Kubernetes ensures that only authorized entities can perform specific actions.

### What is RBAC?

- RBAC is a security framework in Kubernetes that restricts access to cluster resources based on defined roles and permissions.
- It allows administrators to implement the principle of least privilege, ensuring that users and services have only the necessary permissions to perform their tasks.

### Key RBAC components

1. **Role**
    - A Role defines a set of permissions within a specific namespace. It specifies which resources can be accessed and what actions can be performed.
    - Example:

    ```yaml
    apiVersion: rbac.authorization.k8s.io/v1
    kind: Role
    metadata:
    namespace: dev
    name: pod-reader
    rules:
    - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]
    ```

2. **ClusterRole**
    - A ClusterRole is similar to a Role but applies across the entire cluster, not just a single namespace.
    - Example:

    ```yaml
    apiVersion: rbac.authorization.k8s.io/v1
    kind: ClusterRole
    metadata:
    name: cluster-admin
    rules:
    - apiGroups: [""]
    resources: ["*"]
    verbs: ["*"]
    ```

3. **RoleBinding**
    - A RoleBinding assigns a Role to a user, group, or service account within a specific namespace.
    - Example:

    ```yaml
    apiVersion: rbac.authorization.k8s.io/v1
    kind: RoleBinding
    metadata:
    name: pod-reader-binding
    namespace: dev
    subjects:
    - kind: User
    name: johndoe
    apiGroup: rbac.authorization.k8s.io
    roleRef:
    kind: Role
    name: pod-reader
    apiGroup: rbac.authorization.k8s.io
    ```

4. **ClusterRoleBinding**
    - A ClusterRoleBinding grants cluster-wide permissions by binding a ClusterRole to a user, group, or service account.
    - Example:

    ```yaml
    apiVersion: rbac.authorization.k8s.io/v1
    kind: ClusterRoleBinding
    metadata:
    name: cluster-admin-binding
    subjects:
    - kind: User
    name: admin
    apiGroup: rbac.authorization.k8s.io
    roleRef:
    kind: ClusterRole
    name: cluster-admin
    apiGroup: rbac.authorization.k8s.io
    ```

### Managing RBAC in Kubernetes

1. **Checking Roles and Bindings**
    - To list Roles and RoleBindings in a namespace:

    ```sh
    kubectl get roles -n dev
    ```

    ```sh
    kubectl get rolebindings -n dev
    ```

    - To check ClusterRoles and ClusterRoleBindings:

    ```sh
    kubectl get clusterroles
    ```

    ```sh
    kubectl get clusterrolebindings
    ```

2. **Verifying Access**
    - To verify a user's permissions:

    ```sh
    kubectl auth can-i get pods --as=johndoe -n dev
    ```

3. **Removing RBAC Permissions**
    - To delete a RoleBinding:

    ```sh
    kubectl delete rolebinding pod-reader-binding -n dev
    ```

    - To delete a ClusterRoleBinding:

    ```sh
    kubectl delete clusterrolebinding cluster-admin-binding
    ```

### Best Practices for Kubernetes RBAC

1. `Follow the Principle of Least Privilege` – Grant only the necessary permissions.
2. `Use Service Accounts for Automation` – Assign roles to service accounts instead of users where possible.
3. `Separate Roles for Users and Applications` – Avoid using the same roles for human users and workloads.
4. `Regularly Audit and Review Permissions` – Run kubectl auth can-i and check RBAC policies.
5. `Leverage Namespace Isolation` – Use namespace-specific roles to limit access to resources.
6. `Monitor and Log Access` – Enable audit logging in Kubernetes for tracking access requests.

#### Manual User Creation and Certificate Signing

- To manually create a user and grant access, follow these steps:

1. `Generate Private Key and Certificate Signing Request (CSR)`

    ```sh
    openssl genrsa -out user.key 2048
    ```

    ```sh
    openssl req -new -key user.key -out user.csr -subj "/CN=user1/O=dev-team"
    ```

2. `Create a Kubernetes CSR Object`

    ```yaml
    apiVersion: certificates.k8s.io/v1
    kind: CertificateSigningRequest
    metadata:
    name: user1-csr
    spec:
    groups:
    - system:authenticated
    request: $(cat user.csr | base64 | tr -d '\n')
    signerName: kubernetes.io/kube-apiserver-client
    usages:
    - client auth
    ```

    - Apply the CSR:

    ```sh
    kubectl apply -f user-csr.yaml
    ```

3. `Approve and Retrieve the Signed Certificate`

    ```sh
    kubectl certificate approve user1-csr
    ```

    ```sh
    kubectl get csr user1-csr -o jsonpath='{.status.certificate}' | base64 --decode > user.crt
    ```

4. `Configure kubeconfig for the New User`

    ```sh
    kubectl config set-credentials user1 --client-certificate=user.crt --client-key=user.key --embed-certs=true
    ```

    ```sh
    kubectl config set-context user1-context --cluster=my-cluster --user=user1
    ```

### Automating User and Group Management in Kubernetes

- Instead of manually creating users, organizations can automate user and group provisioning using external identity providers like LDAP, Dex, or OIDC.
- Assign users to groups in an identity provider and map those groups to RBAC roles in Kubernetes.
- Use ClusterRoleBinding to assign permissions at the cluster level.
