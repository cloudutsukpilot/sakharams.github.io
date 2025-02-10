---
layout: post
title: Kubernetes - Scheduling
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
image: /assets/img/devops/orchestration/kubernetes/kubernetes-posts.png
description: Dive into how scheduling works in Kubernetes and explore various ways to control pod placement.
---

## Introduction

Kubernetes is a powerful container orchestration system that efficiently manages application workloads. At the heart of Kubernetes' workload management is scheduling, which ensures that applications (in the form of pods) are assigned to appropriate nodes within the cluster. The kube-scheduler is the core component responsible for this critical task, making decisions based on resource availability, constraints, and custom policies.

### Understanding Kubernetes Scheduling

#### **Pod Creation and Scheduling**

- When a pod is created, if a specific node is not assigned, the kube-scheduler takes charge of finding the best node for the pod. The scheduler evaluates multiple factors, including:

  - `Resource availability`: Ensuring the node has sufficient CPU and memory.
  - `Constraints`: Checking node affinity/anti-affinity rules, taints, and tolerations.
  - `Cluster policies`: Ensuring compliance with defined scheduling rules.

- Once the scheduler selects a suitable node, it binds the pod to that node. The kubelet running on the assigned node then starts the pod, ensuring that it runs as expected.

#### Scheduling Process: Filtering, Scoring, and Binding

- The kube-scheduler follows three key steps to make scheduling decisions:
  - `Filtering`:
    - The scheduler eliminates nodes that do not meet the pod's requirements.
    - For example, if a pod requires 2GB of memory and a node has only 1GB available, that node is filtered out.
  - `Scoring`:
    - The remaining nodes are ranked based on predefined scoring functions.
    - These functions consider factors like resource availability, node topology, and custom-defined rules.
    - The node with the highest score is selected.
  - `Binding`:
    - The scheduler creates a binding object, linking the pod to the selected node.
    - This updates the pod’s nodeName field, marking the scheduling process as complete.
    - The kubelet on the assigned node then starts the pod.

### Pod Placement Strategies

1. **Node Affinity and Anti-Affinity**

    - Kubernetes allows you to influence pod placement through node affinity and anti-affinity rules.
    - Node Affinity in Kubernetes is a set of rules used by the scheduler to determine where a Pod can be placed.
    - It allows you to set conditions on which nodes are eligible to be scheduled based on the labels on the nodes.
    - `Node Affinity`: Specifies preferred or required node selection criteria.
    - `Pod Anti-Affinity`: Prevents pods from running on the same node, enhancing availability.
    - There are two types of Node Affinity:
      - Required (`requiredDuringSchedulingIgnoredDuringExecution`):
            - The scheduler will not place the Pod unless the condition is met.
            - This is similar to nodeSelector, but allows for more complex expressions.
      - Preferred (`preferredDuringSchedulingIgnoredDuringExecution`):
            - The scheduler will try to place the Pod according to the condition, but it's not guaranteed.

    - Sample YAML:

    ```yaml
    apiVersion: v1
    kind: Pod
    metadata: 
        name: myapp-pod 
    spec: 
        containers: 
        - name: data-processor 
            image: data-processor 
        affinity:
            nodeAffinity: 
            requiredDuringSchedulingIgnoredDuringExecution: 
                nodeSelectorTerms: 
                - matchExpressions: 
                - key: size 
                    operator: In 
                    values: 
                    - Large
    ```

    - Taints and Tolerations along with Node Affinity can be used to achieve complex requirements.

2. **Taints and Tolerations**

    - Taints and Tolerations work together to ensure that Pods are not scheduled onto inappropriate Nodes.
    - `Taints` are applied to Nodes and represent conditions that a Pod should avoid.
    - `Tolerations` are applied to Pods and allow (but do not require) the Pods to schedule onto Nodes with matching Taints.
    - Taints and Tolerations does not guarantee that taint resistant pods will be always be placed on tainted nodes.
    - By default, a taint is already set on the master node to prevent user pods deployed on the master node.
    - To taint a node:

    ```sh
    kubectl taint nodes node-name key=value:taint-effect
    ```

    ```sh
    kubectl taint nodes node1 app=blue:NoSchedule
    ```

    - To remove taint from a node:

    ```sh
    kubectl taint nodes controlplane node-role.kubernetes.io/control-plane:NoSchedule
    ```

    - There are three taint-effects
        a. `NoSchedule`: The pods will not be scheduled on the node.
        b. `PreferNoSchedule`: The system will try to avoid placing a pod on the node, but it is not guaranteed.
        c. `NoExecute`: The new pods will not be scheduled on the node and existing pods will be evicted if they do not tolerate the taint.

    - To add tolerations to a pod:

    ```yaml
    apiVersion: 
    kind: Pod 
    metadata: 
        name: myapp—pod 
    spec: 
        containers: 
            name: nginx—container 
            image: nginx 
        tolerations: 
            key: "app"
            operator: "Equal" 
            value: "blue" 
            effect: "NoSchedule"
    ```

3. **Labels & Selectors**

    - Kubernetes uses labels and selectors to control pod placement by matching pods with nodes that have specific labels.
    - `Labels`: Key-value pairs assigned to nodes and pods.
    - `Selectors`: Used to filter nodes based on labels.
    - `Annotations`: Used to record other details for informational purpose.

    ```yaml
    apiVersion: apps/v1
    kind: Deployment
    metadata:
        name: my-deployment
    spec:
        replicas: 3
        selector:
          matchLabels:
          app: my-app
        template:
          metadata:
          labels:
            app: my-app
        spec:
            containers:
            - name: my-container
              image: nginx
    ```

    - spec.`selector.matchLabels` : Specifies the labels that the Deployment will use to find which Pods to manage. In this case, it will manage Pods that have the label app: my-app.
    - spec.template.metadata.`labels` : Specifies the labels that will be applied to the Pods created by this Deployment. In this case, each Pod will have the label app: my-app.

4. **Assigning Pods to Specific Nodes**

    - You can bypass the scheduler altogether by assigning a pod directly to a node using the nodeName field in the pod specification.
    - Example:

    ```yaml
    apiVersion: v1
    kind: Pod
    metadata:
    name: direct-assignment
    spec:
    nodeName: worker-node-2
    containers:
    - name: nginx
        image: nginx
    ```

### Custom Schedulers

- Kubernetes allows the creation of custom schedulers to implement specific scheduling logic.
- Custom schedulers interact with the Kubernetes API to assign pods to nodes.
- Example: Running a simple custom scheduler as a Bash script:

```sh
#!/bin/bash
PENDING_PODS=$(kubectl get pods --field-selector=status.phase=Pending -o jsonpath='{.items[*].metadata.name}')
NODES=$(kubectl get nodes -o jsonpath='{.items[*].metadata.name}')

for pod in $PENDING_PODS; do
  node=$(echo $NODES | awk '{print $1}')
  kubectl patch pod $pod -p '{"spec":{"nodeName":"'$node'"}}'
done
```

- This script fetches pending pods and randomly assigns them to available nodes using the kubectl patch command.

### Manual Scheduling

- Manual scheduling in Kubernetes involves directly assigning a Pod to a Node without the use of a scheduler by specifying the nodeName field in the Pod's spec.
- It is not recommended to use manual scheduling as:
  - It does not take into account the resource requirements of the Pod or the capacity of the Node.
  - It does not provide any failover capabilities.
  - It does not scale well.

### Static Pods

- The pods created by the kubelet with the help of the definition files in the designated folder, without intervention of master node(if exists) are called static pods.
- A single node with kubelet installed can create pods with the help of definition files placed in `/etc/kubernetes/manifests`.
- To get the path to the configuration file:

    ```sh
    ps -ef | grep kubelet | grep "\--config"
    ```

- To get the location of static folder

    ```sh
    grep -i static /var/lib/kubelet/config.yaml
    ```

| Static PODs | DaemonSets |
| ----------- | ---------- |
| Created by the Kubelet  | Created by Kube-API server (DaemonSet Controller) | 
| Deploy Control Plane components as Static Pods  | Deploy Monitoring Agents, Logging Agents on nodes |
| Ignored by the Kube-Scheduler  | Ignored by the Kube-Scheduler |

### Multiple Schedulers

- We can have multiple schedulers running on kubernetes and we can specify the scheduler name while deploying the pods.
- Assigning a particular scheduler for a pod:

    ```yaml
    apiVersion: v1
    kind: Pod
    metadata:
    name: annotation-default-scheduler
    labels:
        name: multischeduler-example
    spec:
    schedulerName: default-scheduler
    containers:
    - name: pod-with-default-annotation-container
        image: registry.k8s.io/pause:2.0

    ```

### Scheduler Profiles

- Scheduler profiles in Kubernetes allow you to configure the behavior of the scheduler. 
- Each profile is associated with a separate scheduling queue, allowing you to have multiple configurations of the scheduler running simultaneously.

- A profile contains the following fields:

1. `schedulerName`:
    - The name of the scheduler associated with this profile. This is used when assigning a scheduler to a Pod, as shown in your excerpt.

2. `plugins`:
    - This allows you to enable, disable, or reorder the scheduling plugins that are used in the scheduling process. 
    - Plugins include things like Filter, Score, PreFilter, PostFilter, Reserve, PreBind, PostBind, Unreserve, and Permit.

3. `pluginConfig`:
    - This allows you to configure the behavior of the plugins.

- Sample YAML:

    ```yaml
    apiVersion: kubescheduler.config.k8s.io/v1beta1
    kind: KubeSchedulerConfiguration
    profiles:
    - schedulerName: default-scheduler
        plugins:
        score:
            disabled:
            - name: NodeResourcesLeastAllocated
            enabled:
            - name: NodeResourcesMostAllocated
    ```

### Scheduler Events

- Configure Kubernetes Scheduler

Ref:
https://jvns.ca/blog/2017/07/27/how-does-the-kubernetes-scheduler-work/
