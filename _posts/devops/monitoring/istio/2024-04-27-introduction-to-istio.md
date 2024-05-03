---
layout: post
title: Introduction to Istio
categories: [devops, servicemesh, istio]
tags: [Service Mesh, Istio]
---


- Istio is a Service Mesh.
- A service mesh is a dedicated infrastructure layer for handling service-to-service communication in a microservices architecture. 
- It's responsible for the reliable delivery of requests through the complex topology of services that comprise a modern, cloud-native application.
- In practice, the service mesh provides a variety of features including:

1. `Traffic Management`: Such as load balancing, rate limiting, and circuit breaking.
2. `Service Discovery`: Helps new services find and communicate with each other.
3. `Security`: Provides authentication, authorization, and encryption of communication between services.
4. `Observability`: Provides insights into behavior of application and its dependencies, including metrics, logging, and tracing capabilities.
5. `Fault Injection and Testing`: Helps developers to test the resilience of the service network.


- Istio installs a proxy in each of the pods running on the kubernetes clusters.
- Control Plane/Istio Daemon: An istio pod is installed in the istio-system namespace and used to collect the telemetry of all the network calls.
- Data Plane: The proxies in all the pods collectively are called data plane. 

