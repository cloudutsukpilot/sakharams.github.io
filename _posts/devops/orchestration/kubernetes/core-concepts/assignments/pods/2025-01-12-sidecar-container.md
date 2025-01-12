---
layout: post
title: Kubernetes - Sidecar Containers in a Pod
categories: [devops, orchestration, kubernetes]
tags: [Assignments]
image: /assets/img/common/assignment.png
description: Lab assignment for creating a sidecar container in a pod using kubectl
---

### Prerequisites

- Kubernetes
- kubectl

### Assignment

- Lets start by creating a pod which will have a sidecar container which will print 'hello' every 5 seconds

1. Create a K8 manifest yaml for deploy a pod with two containers.

```sh
    cat <<EOF > ./sidecar-pod-demo.yaml
apiVersion: v1
kind: Pod
metadata:
  name: sidecar-pod-demo
labels:
  run: nginx-pod
  name: nginx-pod
spec:
containers:
- name: webserver
  image: nginx
  resources: {}
- name: sidecar
  image: ubuntu
  args:
  - /bin/sh
  - -c
  - |
  while true; do 
    echo "\$(date +'%T') — Hello from the sidecar"; 
    sleep 5; 
    if [ -f /tmp/crash ]; then exit 1; fi; 
  done
  resources: {}
dnsPolicy: ClusterFirst
restartPolicy: Always
EOF
```

2. Create a pod using the manifest file

    ```sh
    kubectl apply -f ./sidecar-pod-demo.yaml
    ```

3. 
