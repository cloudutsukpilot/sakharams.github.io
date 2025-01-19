---
layout: post
title: Kubernetes - Namespaces
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
image: /assets/img/devops/orchestration/kubernetes/k8-namespaces.png
description: Explore the fundamental aspects of namespaces in Kubernetes
---

## Introduction

Kubernetes namespaces provide a way to organize and manage resources within a Kubernetes cluster. By creating logical separations, namespaces help teams achieve isolation, resource constraints, and efficient management in multi-tenant environments.

### Default Namespaces in Kubernetes

- When a Kubernetes cluster is created, it comes with a set of predefined namespaces:

1. `default`: The default namespace is used for resources that don’t explicitly specify a namespace.
2. `kube-system`: This namespace is reserved for Kubernetes system components, such as the API server, scheduler, and controller manager.
3. `kube-public`: A special namespace that is readable by all users, even those without authentication. It’s often used for cluster-wide public information, such as a ConfigMap with public cluster information.
4. `kube-node-lease`: Contains Lease objects associated with each node, which are used for node heartbeats.

- These namespaces provide a baseline structure for organizing system-level and user-level resources.

### Sample YAML

  ```yaml
  apiVersion: v1
  kind: Namespace
  metadata:
    name: my-namespace
  ```

### Kubernetes API Objects and Namespaces

- Namespaces in Kubernetes scope API objects to a specific logical group. Common API objects that are scoped to namespaces include:
  - Pods
  - Services
  - Deployments
  - ConfigMaps
  - Secrets

### ResourceQuotas

- ResourceQuotas enforce resource usage limits for a namespace.
- By setting a quota, you can restrict the number of CPU, memory, or other resources that can be consumed by objects within a namespace.
- For example:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-resources
  namespace: dev
spec:
  hard:
    requests.cpu: "10"
    requests.memory: "20Gi"
    limits.cpu: "20"
    limits.memory: "40Gi"
```

### LimitRanges

- LimitRanges define default resource limits and requests for containers in a namespace.
- This ensures that pods without explicit resource definitions don’t overwhelm the cluster.
- For example:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: cpu-mem-limit-range
  namespace: dev
spec:
  limits:
  - default:
      cpu: "500m"
      memory: "512Mi"
    defaultRequest:
      cpu: "200m"
      memory: "256Mi"
    type: Container
```

### Role-Based Access Control (RBAC) in Relation to Namespaces

- RBAC controls access to Kubernetes resources by assigning permissions to users, groups, or service accounts.
- The relationship between RBAC and namespaces is essential for securing multi-tenant clusters:
  - `Role`: Grants permissions within a specific namespace.
  - `ClusterRole`: Grants permissions across the entire cluster.
  - `RoleBinding`: Associates a Role with a user, group, or service account within a namespace.
  - `ClusterRoleBinding`: Associates a ClusterRole with a user, group, or service account cluster-wide.

- Example of a Role and RoleBinding:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: dev
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "watch", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: dev
subjects:
- kind: User
  name: jane-doe
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

### Namespaced vs Non-Namespaced Kubernetes Components

- In Kubernetes, some resources are namespaced, while others are not. 
- Understanding this distinction is crucial for cluster management:
- **Namespaced Components**
  - Pods
  - ConfigMaps
  - Secrets
  - Services
  - Deployments

- These components exist within a specific namespace and can be isolated accordingly.

- **Non-Namespaced Components**
  - Nodes
  - PersistentVolumes
  - ClusterRoles
  - ClusterRoleBindings
  - Namespaces (as they are top-level entities)
- Non-namespaced components typically have cluster-wide significance.

### Listing and Checking Namespace Scope

- To list all resources in a specific namespace, use:

```sh
kubectl get all -n <namespace>
```

- To list all namespaces:

```sh
kubectl get namespaces
```

- To check if a resource is namespaced or not, you can run:

```sh
kubectl api-resources --namespaced=true
kubectl api-resources --namespaced=false
```

- These commands help you quickly identify the scope of Kubernetes resources.

### Common use-cases for using namespaces

1. **Resource Management**
    - You can allocate resources among the different namespaces, effectively creating a form of quota for teams or projects.
    - This helps prevent one team or project from using up all the resources.

2. **Access Control**
    - You can use Kubernetes Role-Based Access Control (RBAC) to control who can access what within each namespace.
    - This allows you to isolate teams or projects from each other, providing a level of security.

3. **Environment Isolation**
    - You can use namespaces to create isolated environments for different stages of your application lifecycle, like development, testing, and production.
    - Each environment can have its own set of resources, configurations, and access controls.

4. **Organizational Efficiency**:
    - Namespaces can reflect your organization's structure, with each department, team, or user getting their own namespace.
    - This can make it easier to manage and locate resources.

5. **Multi-tenancy**:
    - If you're a service provider, you can use namespaces to create a multi-tenant environment, where each tenant has their own isolated namespace.

### Conclusion

Namespaces are a cornerstone of Kubernetes resource management, enabling logical separation and governance. By understanding their interplay with API objects, RBAC, and resource quotas, you can effectively manage multi-tenant clusters and ensure efficient resource utilization. Whether you're deploying applications or securing access, namespaces play a pivotal role in organizing and managing your Kubernetes workloads.
