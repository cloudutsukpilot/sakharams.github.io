---
layout: post
title: Kubernetes - Pod Disruption Budgets
categories: [devops, orchestration, kubernetes, hands-on]
tags: [Hands-On]
image: /assets/img/common/assignment.png
description: Lab assignment for understanding PDB's in Kubernetes
---

### Prerequisites

- Kubernetes
- kubectl

### Assignment

- Let's create a simple deployment with multiple replicas to see how they distribute across different nodes:

```sh
kubectl create deployment nginx --image=nginx --replicas=5
```

- With the deployment created, check how the replicas are spread across the control-plane and worker nodes:

```sh
kubectl get pods -o wide
```

- Simulate a voluntary disruption. Use the kubectl cordon command to make a node unschedulable, and then delete the pods on that node.
- This will demonstrate how Kubernetes handles pod rescheduling when a node becomes unavailable.

```sh
kubectl cordon control-plane && kubectl delete pods -l app=nginx --field-selector=spec.nodeName=control-plane --now
```

- Recheck the pods to observe how they are rescheduled -

```sh
kubectl get pods -o wide
```

- Now, repeat the cordon and delete process for the pods on worker-1:

```sh
kubectl cordon worker-1 && kubectl delete pods -l app=nginx --field-selector=spec.nodeName=worker-1 --now
```

- Recheck the pods again to observe how they are rescheduled, they should all be running on worker-2:

```sh
kubectl get pods -o wide
```

- Familiarise yourself with the kubectl drain command:

```sh
kubectl drain --help | more
```

- Introduce a more disruptive scenario by draining worker-2 using the kubectl drain command. This simulates a scenario like node maintenance, where the node is taken offline, and observe the impact on pod availability:

```sh
kubectl drain worker-2 --delete-emptydir-data=true --ignore-daemonsets=true
```

- Check the deployment and pod status to observe how the disruption has affected the application's availability. This will highlight the limitations of relying solely on replicas for high availability.

```sh
kubectl get deployment; echo; kubectl get pods -o wide
```

- Uncordon all the nodes to make them available for scheduling again. This step is important to bring the cluster back to a normal state before introducing Pod Disruption Budgets:

```sh
kubectl uncordon control-plane worker-1 worker-2
```

- Recheck the pods again:

```sh
kubectl get pods -o wide
```

- Now, explore the creation of a Pod Disruption Budget. First, describe the existing deployment to understand its configuration and use that information to set up the PDB:

```sh
kubectl describe deployment/nginx | more
```

- Create a Pod Disruption Budget for the nginx deployment, ensuring that a minimum of 2 pods are always available:

```sh
kubectl create pdb nginx --selector=app=nginx --min-available=2
```

- Test the PDB by cordoning all nodes and attempting to drain them. This will demonstrate how the PDB prevents excessive disruptions that could compromise application availability, this loop will continue, once run, move on to the next step -

```sh
kubectl cordon control-plane worker-1 worker-2; kubectl drain control-plane worker-1 worker-2 --delete-emptydir-data=true --ignore-daemonsets=true
```

- In a new control-plane root user tab, uncordon worker-1 and worker-2 and then switch back to the previous tab, this will allow Kubernetes to reschedule pods and adhere to the PDB requirements.
- This step shows how Kubernetes manages to maintain the minimum number of available pods specified in the PDB (this can take some time for the environment to normalise):

```sh
kubectl uncordon worker-1 worker-2
```

- Finally, uncordon the control-plane and clean up the environment by deleting the deployment and the Pod Disruption Budget:

```sh
kubectl uncordon control-plane; kubectl delete deployment/nginx pdb/nginx --now
```
