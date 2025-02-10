---
layout: post
title: Kubernetes - Init Containers in a Pod
categories: [devops, orchestration, kubernetes, hands-on]
tags: [Hands-On]
image: /assets/img/common/assignment.png
description: Lab assignment for creating a init container in a pod using kubectl
---

### Prerequisites

- Kubernetes
- kubectl

### Assignment

- Lets start by creating a pod which will have a init container which will echo a countdown from 120 to 0 every second.

1️⃣ Create a K8 manifest yaml to deploy a pod with two containers.

```sh
cat <<EOF > init-container-demo.yaml
apiVersion: v1
kind: Pod
metadata:
  name: mypod
spec:
  initContainers:
  - name: init-countdown
    image: busybox
    command: ['sh', '-c', 'for i in \$(seq 90 -1 0); do echo init-countdown: \$i; sleep 1; done']

  containers:
  - name: main-container
    image: busybox
    command: ['sh', '-c', 'while true; do count=\$((count + 1)); echo main-container: sleeping for 30 seconds - iteration \$count; sleep 30; done']
EOF
```

2️⃣ Create a pod using the manifest file

    ```sh
    kubectl apply -f ./init-container-demo.yaml
    ```

3️⃣ Verify that the pod was created and check the number of containers under `Ready` column

    ```sh
    kubectl get pods -o wide
    ```

4️⃣ Lets watch the logs from init container first and then the logs from the main container.

    ```sh
    until kubectl logs pod/mypod -c init-countdown --follow --pod-running-timeout=5m; do sleep 1; done; until kubectl logs pod/mypod -c main-container --follow --pod-running-timeout=5m; do sleep 1; done
    ```

5️⃣ Exit the main container using `Ctrl+c` and check if the init container pod has exited.

    ```sh
    kubectl get pods -o wide
    ```
  
### CleanUp

```sh
kubectl delete -f init-container-demo.yaml --now
rm init-container-demo.yaml
```