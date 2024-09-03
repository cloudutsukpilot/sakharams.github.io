---
layout: post
title: Cloud Load Balancers
categories: [architect]
tags: [Architect]
---

## Introduction to Load Balancers
- Efficient load balancing is vital for optimizing the performance and availability of your applications in the cloud.
- However, managing load balancers can be overwhelming, given the various types and configuration options available.
- In today's multi-cloud landscape, mastering load balancing is essential to ensure seamless user experiences and maximize resource utilization, especially when orchestrating applications across multiple cloud providers. 
- Having the right knowledge is key to overcoming these challenges and achieving consistent, reliable application delivery.

### Use Cases of Load Balancer

![Load Balancer Use Cases](/assets/img/architect/load-balancer-use-cases.jpeg)

### Load Balancers in CSP's
![Load Balancing](/assets/img/architect/cloud-loadbalancer-cheatsheet.webp)


### Routing Choices for an Web App

- Web App (HTTP/HTTPS) 
    + `Yes`
        * `Internet Facing`
            - `No` : 
                + `Application Gateway` is a Layer 7 (Application Layer) load balancer, ideal for HTTP(S) traffic.
                + It provides SSL offloading, URL-based routing, and Web Application Firewall (WAF) capabilities, but is generally used for single-region applications. 
            - `Yes`:
                + `Regional`: 
                    * `Application Gateway` is a Layer 7 (Application Layer) load balancer, ideal for HTTP(S) traffic.
                    * It provides SSL offloading, URL-based routing, and Web Application Firewall (WAF) capabilities, but is generally used for single-region applications.
                + `Global`: 
                    * `Azure Front Door + Application Gateway` provides global distribution, SSL offloading, and application-layer processing with advanced routing and security features across regions.
    + `No`                   
        * `Internet Facing`
            - `No`: 
                + `Azure Load Balancer` is used for non-HTTP(S) traffic, providing basic routing without advanced features.
            - `Yes`:
                + `Regional`: 
                    * `Azure Load Balancer` is a Layer 4 (TCP/UDP) load balancer, suitable for non-HTTP(S) traffic or basic routing needs without complex processing.
                + `Global`: 
                    * `Traffic Manager + Azure Load Balancer` handles global traffic with DNS-based routing (Traffic Manager) and distributes traffic within each region (Azure Load Balancer). 


### Use Cases:

1. **Application Gateway**

    - Use Case: `Single-Region HTTP(S) Applications`
        + `Scenario`: You have a web application deployed within a single Azure region, and you require advanced Layer 7 capabilities such as SSL offloading, URL-based routing, and Web Application Firewall (WAF) for added security.
        + `Example`: An online retail website deployed in the West US region that needs to protect against common web vulnerabilities and route requests based on URL paths (e.g., /products to one backend pool and /checkout to another).

2. **Azure Front Door**

    - Use Case: `Global HTTP(S) Applications on PaaS`
        + `Scenario`: You have a web application hosted on Platform as a Service (PaaS) offerings like Azure App Service or Azure Functions, and it needs to be globally distributed with performance optimization and load balancing.
        + `Example`: A content delivery platform using Azure Functions to serve content dynamically across different regions, requiring low-latency access for users worldwide.

3. **Azure Load Balancer**

    - Use Case: `Basic Load Balancing for Non-HTTP(S) Applications`
        + `Scenario`: Your application involves non-HTTP(S) traffic (e.g., RDP, SQL Server), and you need to balance this traffic across multiple virtual machines or other resources within a region.
        + `Example`: A database cluster that needs to balance incoming SQL traffic between multiple database servers to ensure high availability within a single region.

    - Use Case: `Internet-Facing Non-HTTP(S) Applications`
        + `Scenario`: You have an internet-facing application that doesn't involve HTTP(S) traffic, and it requires basic load balancing across multiple VMs or services.
        + `Example`: A multiplayer gaming server that balances UDP traffic across several servers to ensure a smooth gaming experience for users.

4. **Azure Front Door + Application Gateway**
    - Use Case: `Global HTTP(S) Applications Requiring Advanced Security and Routing`
        + `Scenario`: Your web application is deployed across multiple regions globally, and you need to manage traffic intelligently across these regions, with additional requirements for SSL offloading and advanced Layer 7 routing.
        + `Example`: A globally distributed e-commerce platform that needs to route traffic based on geographic proximity, balance loads across different regions, and apply security policies at the application layer.

    - Use Case: `Kubernetes-Based Applications with Global Reach`
        + `Scenario`: You're hosting microservices on Azure Kubernetes Service (AKS) across multiple regions and need to manage ingress traffic using a combination of Azure Front Door for global load balancing and Application Gateway as the ingress controller.
        + `Example`: A microservices-based SaaS application deployed on AKS, where traffic needs to be routed globally based on the user's location and managed with fine-grained security and routing rules within each Kubernetes cluster.

5. **Traffic Manager + Azure Load Balancer**

    - Use Case: `Global Non-HTTP(S) Applications`
        + `Scenario`: Your application is deployed globally across multiple Azure regions and needs to route non-HTTP(S) traffic (e.g., custom TCP or UDP protocols) based on geographic proximity or performance metrics.
        + `Example`: A global VoIP service that routes calls to the nearest or least congested region using Traffic Manager, with Azure Load Balancer distributing the load within each region.


- In selecting the appropriate load balancer type, it's essential to consider factors such as 
    + Application traffic patterns
    + Scalability requirements 
    + Security considerations. 


### Azure Front Door vs Application Gateway

| Feature |	Azure Front Door | Azure Application Gateway |
| ------- | ---------------- | ------------------------- |
| Primary Purpose | Global load balancing, <br> Performance optimization | Regional load balancing, <br> Application delivery | 
| Routing | Global, URL-based, path-based | Regional, URL-based, path-based | 
| SSL Offloading | Yes, at the edge | Yes, at the gateway | 
| WAF | Yes | Yes |
| Caching |Edge caching for acceleration | No |
| Global Distribution | Yes | No |
| Regional Distribution | No | Yes |
| Autoscaling | Yes | Yes |
| Custom Domains | Yes | Yes |
| DDoS Protection	| Yes	| Integrated with Azure DDoS Protection |
| Ideal Use Cases | Global applications <br> Low latency <br> Edge acceleration | Regional applications <br> Advanced Layer 7 routing <br> SSL offloading |


### Point-to-Site (P2S) vs Site-to-Site (S2S) VPNs

| Feature | Point-to-Site (P2S) VPN | Site-to-Site (S2S) VPN |
| Connection Type | Client computer to Azure VNet | On-premises network to Azure VNet |
| Use Case | Remote access for individuals | Connecting entire networks or offices to Azure | 
| Scalability | Suitable for a small number of users | Suitable for connecting large networks |
| Authentication | Certificate-based, Azure AD, RADIUS | IPsec/IKE | 
| Protocol Support | SSTP, OpenVPN | IPsec/IKE |
| Setup Complexity | Easier setup, primarily client-side configuration | More complex setup, requires configuration of VPN devices on both sides |
| Example Scenarios | Remote employees, developers needing access to VNets | Hybrid cloud, connecting multiple branches or data centers |
