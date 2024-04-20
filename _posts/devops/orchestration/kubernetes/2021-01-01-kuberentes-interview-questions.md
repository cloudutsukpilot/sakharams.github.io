---
layout: post
title: Kubernetes Interview Questions
categories: [devops, orchestration, kuberentes]
tags: [DevOps, Orchestration, Kubernetes, Interview Questions]
---

#### Beginner

1. What is Kubernetes? Why should we use Kubernetes 
- Kubernetes is an open-source container orchestration tool or system that is used to automate tasks such as the management, monitoring, scaling, and deployment of containerized applications. 

2. What are Kubernetes alternatives?

    a.  Container as a Service (CaaS)—services | AWS Fargate and Azure Container Instances
    b.  Managed Kubernetes services | GKE, AKS, EKS
    c.  PaaS using Kubernetes—several providers |  OpenShift Container Platform and Rancher
    d.  Lightweight container orchestrators | Docker Swarm and Nomad

3. What is the difference between docker and kuberentes?
- Docker is an open-source platform used to handle software development. Its main benefit is that it packages the settings and dependencies that the software/application needs to run into a container, which allows for portability and several other advantages. 
- Kubernetes allows for the manual linking and orchestration of several containers, running on multiple hosts that have been created using Docker. 

4. What are the benefits of using Kubernetes?
- Kubernetes places control for the user where the server will host the container. It will control how to launch. So, Kubernetes automates various manual processes. 
- Kubernetes manages various clusters at the same time. 
- It provides various additional services like management of containers, security, networking, and storage. 
- Kubernetes self-monitors the health of nodes and containers. 
- With Kubernetes, users can scale resources not only vertically but also horizontally that too easily and quickly.

5. Which are the main components of Kubernetes architecture?

    a. Master Node | 
    b. Worker Node | 

6. What are different built-in APIs for workload management?

    | Deployment | Used to define the desired state of the environment |
    | ReplicaSet | Used to maintain a stable set of replica Pods running at any given time |
    | StatefulSet | Used to manage stateful applications - each pod has a unique identity and not interchangable |
    | DaemonSet |  Used to run a pod on every node in the Kubernetes cluster | 
    | Jobs | Used to create a pod and complete the task to its completion | 
    | CronJob | Used to perform regular scheduled actions such as backup, reporting, etcc. | 

7 . Explain the pod lifecycle.

    Pending | The Pod has been accepted by the Kubernetes cluster and is in process of downloading images and running containers | 
    Running | The Pod has been bound to a node and at least one container | 
    Succeeded | All containers in the pod have terminated in success and will not be restarted | 
    Failed | All containers are terminated and at least one has terminated in error | 
    Unknown | The state of the pod could not be obtained for some reason | 
| 



#### Intermediate
##### Advanced

1. Liveness and Readiness probe:

    a.  How to configure Liveness and Readiness probe for a service?  <br/>
    b.  What are different types of options available for Liveness and Readiness probes ?  <br/>
    c.  What if the service does not have a HTTP server? <br/>
    d.  If TCP probe is used, does it require additional configuration in the service apart from exposing the port? <br/>

