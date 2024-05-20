---
layout: post
title: Kubernetes - Services
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
---

## Introduction
- Kubernetes Services are an abstract way to expose an application running on a set of Pods as a network service. 
- They provide a stable and reliable way to communicate with or access the pods in a Kubernetes cluster. 
- Services enable loose coupling between dependent Pods.
-  Types of Services:

#### 1. ClusterIP	
- This creates a virtual IP inside the cluster to enable communication between different services.
- Internal to k8s cluster
            
    ![K8-Architecture](/assets/img/devops/orchestration/kubernetes/services/k8-services-clusterip.png)        

- Sample YAML:

    ```
    apiVersion: v1
    kind: Service
    metadata:  
      name: my-internal-service
    spec:
      selector:    
        app: my-app
      type: ClusterIP
      ports:  
      - name: http
        port: 80
        targetPort: 80
        protocol: TCP
    ```

#### 2. NodePort
- NodePort opens a specific port on all the Nodes and any traffic that is sent to the port is forwarded to the service.
- Access to Internet/Outside cluster.
    
    ![K8-Architecture](/assets/img/devops/orchestration/kubernetes/services/k8-services-nodeport.png)

- Sample YAML: 
    ```
    apiVersion: v1
    kind: Service
    metadata:  
      name: my-nodeport-service
    spec:
      selector:    
        app: my-app
      type: NodePort
      ports:  
      - name: http
        port: 80
        targetPort: 80
        nodePort: 30036
        protocol: TCP
    ```

#### 3. LoadBalancer	
- This service provisions a load balancer for your application in supported cloud providers (like Amazon Web Services(AWS), Google Cloud Platform(GCP), Azure, etc.)
-  It exposes the service externally using the load balancer. The external load balancer routes the traffic to backend Pods.

    ![K8-Architecture](/assets/img/devops/orchestration/kubernetes/services/k8-services-loadbalancer.png)

- Sample YAML:
    ```
    apiVersion: v1
    kind: Service
    metadata:
    name: my-loadbalancer-service
    spec:
    selector:
        app: my-app
    type: LoadBalancer
    ports:
        - protocol: TCP
        port: 80
        targetPort: 9376
    ```

#### 4. externalName
- To access externally hosted apps in k8s cluster
- From external/internal
- Example: Access AWS RDS database endpoint by application inside k8 cluster)

    ![K8-Architecture](/assets/img/devops/orchestration/kubernetes/services/k8-services-externalname.png)

- Sample YAML:
    ```
    apiVersion: v1
    kind: Service
    metadata:
    name: my-externalname-service
    spec:
    type: ExternalName
    externalName: my.database.example.com
    ```