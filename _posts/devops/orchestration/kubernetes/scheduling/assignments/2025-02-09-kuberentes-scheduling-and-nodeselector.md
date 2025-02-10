---
layout: post
title: Kubernetes - Scheduling and Node Selector
categories: [devops, orchestration, kubernetes]
tags: [Assignments]
image: /assets/img/common/assignment.png
description: Lab assignment for understanding scheduling in Kubernetes
---

### Prerequisites

- Kubernetes
- kubectl

### Assignment

- Create an nginx pod template that we'll later target with a custom scheduler:

```sh
kubectl run nginx --image=nginx -o yaml --dry-run=client | tee nginx_scheduler.yaml
```sh

- Review the pod.spec option known as schedulerName: 

```sh
kubectl explain pod.spec | more
```

- Update the `nginx_scheduler.yaml` file to include a schedulerName for a scheduler called `my-scheduler`:

```sh
cat <<EOF > nginx_scheduler.yaml
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: null
  labels:
    run: nginx
  name: nginx
spec:
  schedulerName: my-scheduler
  containers:
  - image: nginx
    name: nginx
    resources: {}
  dnsPolicy: ClusterFirst
  restartPolicy: Always
status: {}
EOF
```

- Create the nginx pod with the defined scheduler:

```sh
kubectl apply -f nginx_scheduler.yaml
```

- Review the pods status - Pod will be stuck in `pending` state as there is no scheduler called `my-scheduler` running:

```sh
kubectl get pods -o wide
```

- We're going to make use of a convenient code example that mimicks the functionality of a scheduler as a bash script, firstly install git and jq if required -

```sh
cat <<EOF> my-scheduler.sh
#!/bin/bash

echo "🚀 Starting the custom scheduler..."

while true; do
  # Get names of all nodes
  nodes=( $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}') )

  # Get unscheduled pods
  unscheduled_pods=$(kubectl get pods --all-namespaces -o json | jq -r '.items[] | select(.spec.schedulerName=="my-scheduler" and .spec.nodeName==null) | .metadata.namespace + "/" + .metadata.name')

  # Loop over unscheduled pods
  for pod in $unscheduled_pods; do
    # Select a random node
    node=${nodes[$RANDOM % ${#nodes[@]}]}

    # Split the pod into namespace and name
    IFS='/' read -r -a pod_parts <<< "$pod"
    namespace=${pod_parts[0]}
    name=${pod_parts[1]}

    # Create the binding YAML
    binding=$(cat <<EOF
apiVersion: v1
kind: Binding
metadata:
  name: $name
  namespace: $namespace
target:
  apiVersion: v1
  kind: Node
  name: $node
EOF
)

    echo "🎯 Attempting to bind the pod $name in namespace $namespace to node $node"

    # Bind the pod to the node using kubectl create, n.b. it is important that 
    # create is used vs apply as the Binding resource is a special resource that
    # is typically not created or managed directly by users
    echo "$binding" | kubectl create -f - > /dev/null

    echo "🎉 Successfully bound the pod $name to node $node"
  done

  # Sleep before next iteration
  sleep 1
done
EOF
```

- Run the script to schedule the pending pod (Use Ctrl+C to exit the script):

```sh
./my-scheduler.sh
```

- Review the pod status to confirm that the pods is scheduled on a node and is in running state: 

```sh
kubectl get pods -o wide
```

- Clean Up the pod

```sh
kubectl delete pod/nginx --now
```

### Schedule using nodeName

- An alternative way of scheduling is by directly specifying the nodeName in which to schedule the pod.

- Review the options for nodeName under pod.spec:

```sh
kubectl explain pod.spec | more
```

- Update the yaml so that it directly specifies a nodeName of worker-2:

```sh
cat <<EOF > nginx_scheduler.yaml
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: null
  labels:
    run: nginx
  name: nginx
spec:
  nodeName: worker-2
  containers:
  - image: nginx
    name: nginx
    resources: {}
  dnsPolicy: ClusterFirst
  restartPolicy: Always
status: {}
EOF
```

- Create the Pod and confirm the node on which it is scheduled:

```sh
kubectl apply -f nginx_scheduler.yaml
```

```sh
kubectl get pods -o wide
```

- Clean up the pod

```sh
kubectl delete pod/nginx --now
```

### nodeSelector

- An alternative approach is the use of `nodeSelector` which makes use of known labels, to select a node.
- Describe the node to check the labels assigned to the node:

```sh
kubectl describe node/worker-1 | more
```

- Use the label `kubernetes.io/hostname=worker-1` to target a node, update the yaml as follows: 

```sh
cat <<EOF > nginx_scheduler.yaml
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: null
  labels:
    run: nginx
  name: nginx
spec:
  nodeSelector:
    kubernetes.io/hostname: worker-1
  containers:
  - image: nginx
    name: nginx
    resources: {}
  dnsPolicy: ClusterFirst
  restartPolicy: Always
status: {}
EOF
```sh

- Create the pod and view the node on which the pod is scheduled:

```sh
kubectl apply -f nginx_scheduler.yaml
```

```sh
kubectl get pods -o wide
```

- Cleanup

```sh
kubectl delete pod/nginx --now; rm -rf simple-kubernetes-scheduler-example; rm -rf nginx_scheduler.yaml
```
