---
layout: post
title: Microsoft Azure Application Gateway
categories: [cloud, azure, networking]
tags: [Cloud, Azure, Networking]
---

## Introduction
- A powerful service that provides layer 7 load balancing, SSL termination, and web application firewall capabilities.
- Azure Application Gateway is a scalable and highly available web traffic load balancer that enables you to manage and optimize the delivery of your web applications. 
- It acts as an entry point for your web traffic and distributes it across multiple backend servers, ensuring high availability and performance.

### How Application Gateway works?

![Application Gateway](/assets/img/cloud/azure/how-application-gateway-works.png)

1. Before a client sends a request to an application gateway, it resolves the domain name of the application gateway by using a Domain Name System (DNS) server. Azure controls the DNS entry because all application gateways are in the azure.com domain.

2. The Azure DNS returns the IP address to the client, which is the frontend IP address of the application gateway.

3. The application gateway accepts incoming traffic on one or more listeners. A listener is a logical entity that checks for connection requests. It's configured with a frontend IP address, protocol, and port number for connections from clients to the application gateway.

4. If a web application firewall (WAF) is in use, the application gateway checks the request headers and the body, if present, against WAF rules. This action determines if the request is valid request or a security threat. If the request is valid, it's routed to the backend. If the request isn't valid and WAF is in Prevention mode, it's blocked as a security threat. If it's in Detection mode, the request is evaluated and logged, but still forwarded to the backend server.

### Key Features

1. **Routing Features**
- `URL-based Routing`: Direct traffic to backend server pools based on the URL path/host of the request. This allows for more granular control over traffic distribution.
- `Multi-site Hosting`: Host multiple websites on a single Application Gateway instance by using multiple public IPs and routing traffic based on the host headers.
- `Path-based Routing`: Route requests to different backend pools based on the URL path in the request.

2. **Traffic Management**
- `Session Affinity`: Use cookies to ensure that requests from a client are always routed to the same backend server.
- `Round-robin Load Balancing`: Distribute incoming requests across all available backend servers in a round-robin fashion.
- `Custom Probes`: Configure health probes to monitor the health of backend instances and ensure traffic is only routed to healthy instances.

3. **SSL/TLS Termination and Management**
- `SSL Termination`: Offload SSL decryption/encryption to the Application Gateway to reduce the load on backend servers.
- `End-to-end SSL`: Ensure secure communication between clients and the Application Gateway as well as between the Application Gateway and backend servers.
- `SSL Policy`: Define SSL policies to control SSL protocols and cipher suites for improved security.

4. **Security Features**
- `Web Application Firewall (WAF)`: Protect web applications from common web vulnerabilities and attacks such as SQL injection, cross-site scripting (XSS), and others. The WAF can be deployed in either detection or prevention mode.
- `Firewall Rule Groups`: Create custom WAF rule groups and policies tailored to your specific security needs.
- `SSL Offload`: Offload SSL decryption from the backend servers to the Application Gateway.

5. **Application Performance and Optimization**
- `Connection Draining`: Gracefully remove backend instances by completing in-progress requests before deregistering them from the pool.
- `Autoscaling`: Automatically adjust the number of Application Gateway instances based on traffic load to ensure optimal performance.
- `Caching`: Integrate with Azure Front Door for caching and global load balancing capabilities.

6. **Monitoring and Diagnostics**
- `Access and Activity Logs`: Log request and response information, including client IP, request URI, and response status codes.
- `Metrics`: Monitor various metrics such as throughput, latency, failed requests, and more using Azure Monitor.
- `Diagnostics`: Enable diagnostic logging for deeper insights into the operation of the Application Gateway.

7. **Backend Pool Management**
- `Backend Pools`: Configure backend pools consisting of IP addresses or FQDNs of the backend servers.
- `Custom Health Probes`: Define custom health probes to check the health of backend instances.
- `Backend Pool Settings`: Configure connection settings, including timeout and connection limits.

8. **Rewrite Rules and Header Modification**
- `URL Rewrite`: Rewrite the URL of incoming requests before routing them to the backend pool.
- `Header Modification`: Add, remove, or modify HTTP headers in the request and response to meet specific application requirements.

9. **Integration with Other Azure Services**
- `Azure Active Directory (AAD)`: Integrate with AAD for authentication and authorization of requests.
- `Azure Key Vault`: Store and manage SSL certificates in Azure Key Vault for secure access by the Application Gateway.
- `API Management`: Combine with Azure API Management for enhanced API security and management features.

10. **Deployment Options**
- `Standard_v2 and WAF_v2`: Uses the Standard_v2 or WAF_v2 SKU for enhanced performance, autoscaling, and additional features.
- `Virtual Network Integration`: Deploy the Application Gateway in a virtual network for better control and integration with other Azure resources.


### Virtual Network (VNet) and Subnet Requirements
1. Existing VNet:
- You must have an existing VNet in which to deploy the Application Gateway. If you don’t have one, you can create a new VNet.
- Region: The VNet must be in the same region as the Application Gateway.

2. Subnet Requirements
- Dedicated Subnet: The Application Gateway must be deployed in a dedicated subnet. This subnet cannot contain any other resources like virtual machines (VMs) or other services.
- Subnet Size: The subnet must have a sufficient number of IP addresses to accommodate the Application Gateway and any additional configurations like autoscaling and instances. Azure recommends a subnet size of at least /28 for small deployments. For larger deployments or to accommodate future growth, a /27 or larger subnet might be more appropriate.
- Subnet IP Address Range: Ensure that the subnet has enough IP addresses to support the instances and scale units of the Application Gateway. Each instance requires an IP address. 

### Use Cases

- Azure Application Gateway is suitable for a wide range of scenarios, including:
    + Load balancing web traffic across multiple backend servers
    + SSL/TLS termination for secure communication
    + URL-based routing for microservices architectures
    + Web Application Firewall (WAF) protection for web applications

