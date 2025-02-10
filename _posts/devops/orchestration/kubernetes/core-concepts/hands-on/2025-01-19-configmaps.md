---
layout: post
title: Kubernetes - ConfigMaps
categories: [devops, orchestration, kubernetes]
tags: [Hands-On]
image: /assets/img/common/assignment.png
description: Lab assignment for creating configmaps using kubectl
---

### Prerequisites

- Kubernetes
- kubectl

### Assignment

- Lets start by creating a configmap to pass the environmental variables to the pod.

### Job

1️⃣  Create a ConfigMap with two entries using the --from-literal parameter.

```sh
kubectl create configmap colour-configmap --from-literal=COLOUR=red --from-literal=KEY=value
```

```sh
kubectl describe configmap/colour-configmap
```

```sh
kubectl delete configmap/colour-configmap
```

2️⃣ Use an alternative approach for creating the same ConfigMap.

```sh
cat <<EOF > configmap-colour.properties
COLOUR=green
KEY=value
EOF
```

```sh
cat configmap-colour.properties
```

```sh
kubectl create configmap colour-configmap --from-env-file=configmap-colour.properties
```

```sh
kubectl describe configmap/colour-configmap
```

3️⃣ Create a pod that dumps environmental variables and sleeps for infinity. Review the environmental variables dumped by the pod.

```sh
kubectl run --image=ubuntu --dry-run=client --restart=Never -o yaml ubuntu --command bash -- -c 'env; sleep infinity' | tee env-dump-pod.yaml
```

```sh
kubectl apply -f env-dump-pod.yaml
```

```sh
kubectl get pods
```

```sh
kubectl logs ubuntu
```

4️⃣ Update the pod definition to include the configmap using envFrom.

```sh
cat <<EOF > env-dump-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: null
  labels:
    run: ubuntu
  name: ubuntu
spec:
  containers:
  - command:
    - bash
    - -c
    - env; sleep infinity
    image: ubuntu
    name: ubuntu
    resources: {}
    envFrom:
    - configMapRef:
        name: colour-configmap
  dnsPolicy: ClusterFirst
  restartPolicy: Never
status: {}
EOF
```

```sh
cat <<EOF > calculatepi.yaml
apiVersion: batch/v1
kind: Job
metadata:
  creationTimestamp: null
  name: calculatepi
spec:
  completions: 20
  parallelism: 5
  template:
    metadata:
      creationTimestamp: null
    spec:
      containers:
      - command:
        - perl
        - -Mbignum=bpi
        - -wle
        - print bpi(2000)
        image: perl:5.34.0
        name: calculatepi
        resources: {}
      restartPolicy: Never
status: {}
EOF
```

```sh
kubectl apply -f env-dump-pod.yaml
```

5️⃣ The above command will fail as we can only update certain fields of a pod. Recreate the pod with the configmap.

```sh
kubectl delete -f env-dump-pod.yaml --now; kubectl apply -f env-dump-pod.yaml
```

```sh
kubectl logs ubuntu
```

6️⃣ Edit the configmap and change the color to red. Recreate the pod and verify the changes.

```sh
kubectl edit configmap/colour-configmap
```

```sh
kubectl delete -f env-dump-pod.yaml --now && kubectl apply -f env-dump-pod.yaml
```

```sh
kubectl logs ubuntu
```

7️⃣ Make the configmap immutable and update the color to purple. Try changing the color to yellow and confirm that if fails are configmap is immutable.

```sh
kubectl edit configmap/colour-configmap
```

```sh
kubectl delete -f env-dump-pod.yaml --now && kubectl apply -f env-dump-pod.yaml
```

```sh
kubectl logs ubuntu
```

8️⃣ Delete the pod and configmaps.

```sh
kubectl delete pod/ubuntu configmap/colour-configmap --now
```

```sh
rm configmap-colour.properties env-dump-pod.yaml
```
