---
layout: post
title: Kubernetes - Namespaces
categories: [devops, orchestration, kubernetes]
tags: [Hands-On]
image: /assets/img/common/assignment.png
description: Lab assignment for creating namespaces using kubectl
---

### Prerequisites

- Kubernetes
- kubectl

### Assignment

- Lets start by creating a pod in the default namespace and then in a user defined namespace.

1️⃣ List all the resources created in the K8 cluster and review the existing namespaces.

```sh
kubectl get all -A
```

2️⃣ List all the namespaces.

```sh
kubectl get namespaces
```

3️⃣ Run a pod without specifying a namespace run in the default namespace.

```sh
kubectl run nginx --image=nginx
```

4️⃣ Create a user defined namespace and run a pod inside that namespace.

```sh
kubectl create namespace mynamespace
kubectl -n mynamespace run nginx --image=nginx
kubectl -n mynamespace get pods
```

5️⃣ Change the default namespace from `default` to a user defined namespace.

```sh
kubectl config set-context --current --namespace=mynamespace
kubectl config view
```
  
### CleanUp

```sh
kubectl delete namespace mynamespace --now
```
