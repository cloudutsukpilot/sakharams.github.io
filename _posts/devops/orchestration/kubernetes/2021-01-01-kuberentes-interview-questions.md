---
layout: post
title: Kubernetes Interview Questions
categories: [devops, orchestration, kuberentes]
tags: [DevOps, Orchestration, Kubernetes, Interview Questions]
image: /assets/img/devops/orchestration/kubernetes/kubernetes-posts.png
description: Kubernetes Interview Questions
---

## Kubernetes Interview Questions

### Beginner

1. `What is Kubernetes? Why should we use Kubernetes?`

    ```sh
    - Kubernetes is an open-source container orchestration tool or system that is used to automate tasks such as the management, monitoring, scaling, and deployment of containerized applications. 
    ```

2. `What are Kubernetes alternatives?`

    ```sh
    a.  Container as a Service (CaaS)—services | AWS Fargate and Azure Container Instances
    b.  Managed Kubernetes services | GKE, AKS, EKS
    c.  PaaS using Kubernetes—several providers |  OpenShift Container Platform and Rancher
    d.  Lightweight container orchestrators | Docker Swarm and Nomad
    ```

3. `What is the difference between docker and kuberentes?`

    ```sh
    - Docker is an open-source platform used to handle software development. Its main benefit is that it packages the settings and dependencies that the software/application needs to run into a container, which allows for portability and several other advantages. 
    - Kubernetes allows for the manual linking and orchestration of several containers, running on multiple hosts that have been created using Docker. 
    ```

4. `What are the benefits of using Kubernetes?`

    ```sh
    - Kubernetes places control for the user where the server will host the container. It will control how to launch. So, Kubernetes automates various manual processes. 
    - Kubernetes manages various clusters at the same time. 
    - It provides various additional services like management of containers, security, networking, and storage. 
    - Kubernetes self-monitors the health of nodes and containers. 
    - With Kubernetes, users can scale resources not only vertically but also horizontally that too easily and quickly.
    ```

5. `Which are the main components of Kubernetes architecture?`

    ```sh
    a. Master Node | 
    b. Worker Node | 
    ```

6. `What are different built-in APIs for workload management?`

    ```sh
    | Deployment | Used to define the desired state of the environment |
    | ReplicaSet | Used to maintain a stable set of replica Pods running at any given time |
    | StatefulSet | Used to manage stateful applications - each pod has a unique identity and not interchangable |
    | DaemonSet |  Used to run a pod on every node in the Kubernetes cluster | 
    | Jobs | Used to create a pod and complete the task to its completion | 
    | CronJob | Used to perform regular scheduled actions such as backup, reporting, etcc. | 
    ```

7. `Explain the different stages in the pod lifecycle.`

    ```sh
    Pending | The Pod has been accepted by the Kubernetes cluster and is in process of downloading images and running containers | 
    Running | The Pod has been bound to a node and at least one container | 
    Succeeded | All containers in the pod have terminated in success and will not be restarted | 
    Failed | All containers are terminated and at least one has terminated in error | 
    Unknown | The state of the pod could not be obtained for some reason | 
    ```

### Intermediate

1. `What is the relation between Taints & Tolerations and Node Affinity?`

    ```sh
    Node Affinity 
        - Is a property of Pods that allows you to specify what type of Nodes they can be scheduled on based on labels on the Nodes. 
        - It's like "Node Preferences". 
        - There are two types of Node Affinity:
            1. Required: The scheduler will not place the Pod unless the condition is met.
            2. Preferred: The scheduler will try to place the Pod according to the condition, but it's not guaranteed.
    
    Taints and Tolerations 
        - Taints and Tolerations work together to ensure that Pods are not scheduled onto inappropriate Nodes.
        - Taints are applied to Nodes and represent conditions that a Pod should avoid.
        - Tolerations are applied to Pods and allow (but do not require) the Pods to schedule onto Nodes with matching Taints.
    Use Case:
        - Use Node Affinity when you want to ensure Pods are scheduled on specific types of Nodes.
        - Use Taints and Tolerations when you want to prevent certain Pods from being scheduled on specific Nodes.
    ```

2. `If I use kubectl proxy to expose a service on my local machine and can access it via localhost:port, can I also access this service from a remote computer using the host machine's IP address?`

    - No, you cannot directly access the service from a remote machine using the host's IP address when exposing it via kubectl proxy.
    - kubectl proxy only listens on localhost by default
    - When you run kubectl proxy, it only binds to 127.0.0.1 (localhost), making the API accessible only on the local machine.
    - kubectl proxy is mainly used for interacting with the Kubernetes API, not for exposing services to external systems.
    - How to Expose the Service for Remote Access?

    ✅ `Option 1`: Use kubectl proxy with --address=0.0.0.0
    - If you want to allow remote access to kubectl proxy, you can run:

    ```sh
    kubectl proxy --address=0.0.0.0 --accept-hosts='.*'
    ```

    - This will bind the proxy to all available network interfaces.
    - Remote machines can then access it via http://<host-ip>:<port>.
    ⚠️ Security Warning: This exposes the Kubernetes API server proxy without authentication.

    ✅ `Option 2`: Use a NodePort Service
    - If you want to expose a Kubernetes service (not just the API), use a NodePort:

    ```sh
    kubectl expose deployment my-app --type=NodePort --port=80 --target-port=8080
    ```

    - Find the assigned NodePort:

    ```sh
    kubectl get svc my-app -o=jsonpath='{.spec.ports[0].nodePort}'
    ```

    - Access it from a remote machine using:

    ```sh
    http://<host-ip>:<node-port>
    ```

    ✅ `Option 3`: Use LoadBalancer (Cloud Provider)
    - If running in the cloud, you can expose the service via a LoadBalancer:

    ```sh
    kubectl expose deployment my-app --type=LoadBalancer --port=80 --target-port=8080
    ```

    - The cloud provider will assign an external IP.

### Advanced

1. Liveness and Readiness probe:

    ```sh
    a.  How to configure Liveness and Readiness probe for a service?  <br/>
    b.  What are different types of options available for Liveness and Readiness probes ?  <br/>
    c.  What if the service does not have a HTTP server? <br/>
    d.  If TCP probe is used, does it require additional configuration in the service apart from exposing the port? <br/>
    ```

2. What happens in the kubernetes cluster when a kubectl command is executed?

    ```sh
    - Below tasks are executed in sequence:
        1. Authenticate User 
        2. Validate Request 
        3. kube-api server creates a pod object and update the user that the pod is being created. 
        4. kube-api server updates the information about the pod object in the etcd database (Pod object is not assigned to any node).
        5. kube-scheduler continuously monitors the API server and find a new pod with no node assigned.
        6. kube-scheduler identifies the right node to deploy the pod and update the kube-api server.
        7. kube-api server updates the information in etcd cluster.
        8. kube-api server passes the information to the kubelet on the selected node.
        9. kubelet creates the pod on the node and instructions the runtime engine (docker) to deploy the application image.
        10. kubelet updates the kube-api server about the status of pod creation, which is then updated in the etcd cluster.
    ```

3. How are the pods scheduled in a kubernetes cluster with multiple nodes?

    ```sh
    Below are the phases through which a pod goes before it is scheduled:
    
    1. The user starts a new pod.

    2. Scheduler Queue: 
    - Pod is added to the scheduling queue. Based on the priority given to the pod it starts to schedule the pod PriorityClasses.

    3. Filtering: 
    - In this phase nodes that cannot schedule the pod are filtered based on resource limits, taints & tolerations, etc.

    4. Scoring: 
    - In this phase, the scheduler scores the nodes filtered based on the free space available before and after scheduling and then assigns a score. The node with the highest score is taken.

    5. Binding: 
    - In this phase, the pod is bound to the node with the highest score and now the pod is finally scheduled.
    ```

