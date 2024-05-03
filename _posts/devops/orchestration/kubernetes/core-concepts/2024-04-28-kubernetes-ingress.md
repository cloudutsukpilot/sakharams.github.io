---
layout: post
title: Kubernetes - Ingress
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
---

## Introduction:
- Ingress is an API object that manages external access to the services in a cluster. 
It provides HTTP and HTTPS routing to services based on the request host or path.

    ![K8-Architecture](/assets/img/devops/orchestration/kubernetes/k8-ingress.jpeg)

- Key features of Ingress:

#### 1. Path-based routing: 
- Ingress allows you to route traffic to services based on the HTTP URL path. 
- This means you can route traffic to different services based on the requested URL.

#### 2. Host-based routing: 
- You can also route traffic based on the host or domain name in the HTTP request header.

#### 3. Load balancing: 
- Ingress can distribute network traffic to multiple pods to ensure no single pod is overwhelmed.

#### 4. SSL/TLS termination: 
- Ingress allows you to terminate SSL/TLS encryption at the load balancer before traffic reaches the pods, offloading the encryption overhead from the pods.

#### 5. Rewriting and redirection: 
- Ingress rules can rewrite and redirect HTTP requests, changing the URL path before forwarding the request to the service.

- To use Ingress, you need an Ingress controller. 
- The Ingress controller is responsible for implementing the Ingress rules and managing the traffic routing. 
- There are several third-party Ingress controllers available, such as NGINX, Traefik, and HAProxy.
- Sample YAML:
    ```
    apiVersion: extensions/v1beta1
    kind: Ingress
    metadata:
      name: my-ingress
    spec:
      backend:
        serviceName: other
        servicePort: 8080
      rules:
      - host: foo.mydomain.com
        http:
          paths:
          - backend:
              serviceName: foo
              servicePort: 8080
      - host: mydomain.com
        http:
          paths:
          - path: /bar/*
            backend:
              serviceName: bar
              servicePort: 8080
    
    ```


