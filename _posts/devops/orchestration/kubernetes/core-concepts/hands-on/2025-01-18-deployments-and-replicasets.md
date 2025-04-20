---
layout: post
title: Kubernetes - Deployments and ReplicaSets
categories: [devops, orchestration, kubernetes, hands-on]
tags: [Hands-On]
image: /assets/img/common/assignment.png
description: Lab assignment for creating namespaces using kubectl
---

### Prerequisites

- Kubernetes
- kubectl

### Assignment

- Lets start by creating a deployment and inspect the repliacesets.

1️⃣  Create a simple deployment using nginx using imperative command and also create a manifest file.

```sh
kubectl create deployment nginx --image=nginx --dry-run=client -o yaml | tee nginx-deployment.yaml | kubectl apply -f -
```

2️⃣ List all the deployments and replicasets.

```sh
kubectl get deployment
kubectl get replicaset
```

3️⃣ Query the pods and check that these pods will be named with the name of the deployment, replicaSet and a unique identifier.

```sh
kubectl get pods -o wide
```

4️⃣ Check the initial rollout history and annote this to make use of this record.

```sh
kubectl rollout history deployment/nginx
kubectl annotate deployment/nginx kubernetes.io/change-cause="initial deployment"
kubectl rollout history deployment/nginx
```

5️⃣ Scale the number of replicas and monitor the change.

```sh
kubectl scale deployment/nginx --replicas=10; watch kubectl get pods -o wide
kubectl get deployment -o wide
```

6️⃣ Modify the nginx-deployment.yaml file to increase the replica count to 12.

```yaml
cat <<EOF > nginx-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  creationTimestamp: null
  labels:
    app: nginx
  name: nginx
spec:
  replicas: 12
  selector:
    matchLabels:
      app: nginx
  strategy: {}
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx
        name: nginx
        resources: {}
status: {}
EOF
```

```sh
kubectl apply -f nginx-deployment.yaml; watch kubectl get pods -o wide
kubectl get deployments -o wide
```

7️⃣ Check if the rollout history has changed.

```sh
kubectl rollout history deployment/nginx
```

8️⃣ Modify the deployment to use a different image nginx:stable and check the rollout history.

```sh
cat <<EOF > nginx-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  creationTimestamp: null
  labels:
    app: nginx
  name: nginx
spec:
  replicas: 12
  selector:
    matchLabels:
      app: nginx
  strategy: {}
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx:stable
        name: nginx
        resources: {}
status: {}
EOF
```

```sh
kubectl apply -f nginx-deployment.yaml && kubectl rollout status deployment/nginx
```

```sh
kubectl get deployments -o wide
```

9️⃣ Annotate the newly added entry in the rollout history.

```sh
kubectl annotate deployment/nginx kubernetes.io/change-cause="change image to nginx:stable"
```

```sh
kubectl rollout history deployment/nginx
```

🔟 Change the image using CLI and watch the rollout status.

```sh
kubectl set image deployment/nginx nginx=nginx:alpine && kubectl rollout status deployment/nginx
```

```sh
kubectl annotate deployment/nginx kubernetes.io/change-cause="change image to nginx:alpine"
```

```sh
kubectl rollout history deployment/nginx
```

1️⃣1️⃣. Describe the deployment to check the reference to the new and old replicasets.

```sh
kubectl describe deployment/nginx
```

```sh
kubectl get replicaset -o wide
```

1️⃣2️⃣. Change the image name to an invalid value and verify how it safeguards the deployment.

```sh
kubectl set image deployment/nginx nginx=nginx:bananas && watch kubectl get pods -o wide
```

```sh
kubectl annotate deployment/nginx kubernetes.io/change-cause="change image to nginx:bananas - failed"
```

```sh
kubectl describe deployment/nginx
```

1️⃣3️⃣. Undo the change using rollout option.

```sh
kubectl rollout undo deployment/nginx && kubectl rollout status deployment/nginx
```

```sh
````

1️⃣4️⃣. Undo Rollout to a specific version and check the rollout history.

```sh
kubectl rollout undo deployment/nginx --to-revision=1 && kubectl rollout status deployment/nginx
```

```sh
kubectl get replicaset -o wide
```

```sh
kubectl rollout history deployment/nginx
```

### CleanUp

```sh
kubectl delete deployment/nginx --now
```
