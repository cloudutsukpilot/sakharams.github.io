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

1️⃣ Create a K8 manifest yaml to deploy a pod with two containers.

```sh
cat <<EOF > ./sidecar-container-demo.yaml
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: null
  labels:
    run: mypod
  name: mypod
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
        echo "$(date +'%T') — Hello from the sidecar";
        sleep 5;
        if [ -f /tmp/crash ]; then exit 1; fi;
      done
    resources: {}
  dnsPolicy: ClusterFirst
  restartPolicy: Always
status: {}
EOF
```

2️⃣ Create a pod using the manifest file

    ```sh
    kubectl apply -f ./sidecar-container-demo.yaml
    ```

3️⃣ Verify that the pod was created and check the number of containers under `Ready` column

    ```sh
    kubectl get pods -o wide
    ```

4️⃣ Use the describe command to verify that the pod has 2 containers

    ```sh
    kubectl describe pod/mypod
    ```

5️⃣ Run another pod to verify that the mypod is working as expected

    ```sh
    kubectl run -it --rm --image=curlimages/curl --restart=Never curl -- http://<pod-ip>
    ```
    
6️⃣ Verify if the sidecar is generating logs as per the instructions

    ```sh
    kubectl logs pod/mypod -c sidecar
    ```

7️⃣ Crash the sidecar container and verify the pod status. You will notice that pod has restarted once and is now in running state as per the `restartPolicy`.

    ```sh
    kubectl exec -it mypod -c sidecar -- touch /tmp/crash
    ```

    ```sh
    kubectl get pods
    ```

8️⃣ Check the logs of the sidecar container which was intentionally crashed (you can check the timestamps to identify the issue. You wont see any error in this example)

    ```sh
    kubectl logs pod/mypod -c sidecar --previous
    ```

### Clean-Up

```sh
kubectl delete -f ./sidecar-container-demo.yaml --now
rm ./sidecar-container-demo.yaml
```
