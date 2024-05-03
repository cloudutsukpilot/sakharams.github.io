---
layout: post
title: Kubernetes - Scheduling
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
---

## Introduction

1. Manual Scheduling
2. Labels & Selectors
3. Resource Limits
4. Daemon Sets
5. Multiple Schedulers
6. Scheduler Events
7. Configure Kubernetes Scheduler


### Manual Scheduling
- Manual scheduling in Kubernetes involves directly assigning a Pod to a Node without the use of a scheduler by specifying the nodeName field in the Pod's spec.
- It is not recommended to use manual scheduling as:
    + It does not take into account the resource requirements of the Pod or the capacity of the Node. 
    + It does not provide any failover capabilities.
    + It does not scale well. 


### Labels & Selectors
- Used to label & filter objects based on different categories and criteria.
- Annotations: Used to record other details for informational purpose.

    ```
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


### Taints And Tolerations
- Taints and Tolerations work together to ensure that Pods are not scheduled onto inappropriate Nodes.
- Taints are applied to Nodes and represent conditions that a Pod should avoid.
- Tolerations are applied to Pods and allow (but do not require) the Pods to schedule onto Nodes with matching Taints.
- Taints and Tolerations does not guarantee that taint resistant pods will be always be placed on tainted nodes.
- By default, a taint is already set on the master node to prevent user pods deployed on the master node.
- To taint a node:
    
    ```
    kubectl taint nodes node-name key=value:taint-effect
    kubectl taint nodes node1 app=blue:NoSchedule
    ```
- To remove taint from a node:

    ```
    kubectl taint nodes controlplane node-role.kubernetes.io/control-plane:NoSchedule-
    ```

- There are three taint-effects
    + a. `NoSchedule`: The pods will not be scheduled on the node.
    + b. `PreferNoSchedule`: The system will try to avoid placing a pod on the node, but it is not guaranteed.
    + c. `NoExecute`: The new pods will not be scheduled on the node and existing pods will be evicted if they do not tolerate the taint.

- To add tolerations to a pod:

    ```
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



### Node Selectors
- Nodes can be labelled with the specific key-value and the pod definition can be updated to use the specific node as shown below:

- To label the node:
    ```
    kubectl label nodes <node-name> <key>=<value>
    kubectl label nodes node1 size=large
    ```
- Sample YAML:
    ```
    apiVersion: 
    kind: Pod
    metadata : 
        name : myapp—pod 
    spec : 
        containers : 
        — name: data—processor 
          image: data—processor 
        nodeSe1ector : 
            size: Large 
    ```

### Node Affinity
- Node Affinity in Kubernetes is a set of rules used by the scheduler to determine where a Pod can be placed. 
- It allows you to set conditions on which nodes are eligible to be scheduled based on the labels on the nodes.
- There are two types of Node Affinity:

1. Required (`requiredDuringSchedulingIgnoredDuringExecution`): 
- The scheduler will not place the Pod unless the condition is met. 
- This is similar to nodeSelector, but allows for more complex expressions.

2. Preferred (`preferredDuringSchedulingIgnoredDuringExecution`): 
- The scheduler will try to place the Pod according to the condition, but it's not guaranteed.

- Sample YAML:
    ```
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

-  Taints and Tolerations along with Node Affinity can be used to achieve complex requirements.
    

### Resource Limits
- Resource limits in Kubernetes are used to control the amount of compute resources that a Pod or Container can use. 
- There are two types of resource settings:
    1. `Requests`:
    - This is the amount of a resource that the system will guarantee to the container or pod. 
    - Kubernetes uses this value to decide on which nodes to place the Pod.

    2. `Limits`: 
    - This is the maximum amount of a resource that a container can use. 
    If a container exceeds this limit, it might be terminated and restarted, depending on the specific resource and the container's restartPolicy.

- Resource limits can be set for both CPU and memory.
    1. `CPU` is specified in CPU units, with 1 CPU equivalent to 1 AWS vCPU, 1 GCP Core, 1 Azure Core, or 1 Hyperthread on a bare-metal Intel processor.
    2. `Memory` is specified in bytes, and can be expressed in fixed-point integers or as a decimal using one of these suffixes: E, P, T, G, M, K, Ei, Pi, Ti, Gi, Mi, Ki.

- Default Limits for a Container: 1 vCPU - 512Mi
- A container cannot use more CPU than specified limit.
- A container can use more memory than the specified limit, however it is terminated if it continuously uses more memory that the limit.

- Sample YAML:
    ```
    apiVersion: v1
    kind: Pod
    metadata:
    name: myapp-pod
    spec:
    containers:
    - name: myapp-container
        image: myapp
        resources:
        requests:
            memory: "64Mi"
            cpu: "250m"
        limits:
            memory: "128Mi"
            cpu: "500m"
    ```

- The default and max limits and requests can be set at the namespace level using the `kind: LimitRange`.

    ```
    apiVersion: v1
    kind: LimitRange
    metadata:
        name: resource-limits
    spec:
        limits:
        - default:
            memory: 512Mi
            cpu: "1"
          defaultRequest:
            memory: 256Mi
            cpu: "0.5"
          type: Container
    ```

### Daemon Sets
- DaemonSets in Kubernetes are used to ensure that some or all nodes run a copy of a Pod. 
- This is particularly useful for deploying system-wide tasks such as log collection, monitoring, or network proxies.
- When a new node is added to the cluster, the Pod is added to the node.
- When a node is removed from the cluster, the Pod is garbage collected/removed from the node.

- Sample YAML:
    ```
    apiVersion: apps/v1
    kind: DaemonSet
    metadata:
        name: my-daemonset
    spec:
      selector:
        matchLabels:
          name: my-daemonset
      template:
          metadata:
            labels:
              name: my-daemonset
          spec:
            containers:
            - name: my-daemonset-container
              image: my-daemonset-image
    ```


### Static Pods
- The pods created by the kubelet with the help of the definition files in the designated folder, without intervention of master node(if exists) are called static pods.
- A single node with kubelet installed can create pods with the help of definition files placed in /etc/kubernetes/manifests.
- To get the path to the configuration file:
    ```
    ps -ef | grep kubelet | grep "\--config"
    ```

- To get the location of static folder
    ```
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

    ```
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

    ```
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
