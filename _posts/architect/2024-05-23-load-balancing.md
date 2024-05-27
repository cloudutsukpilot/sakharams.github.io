---
layout: post
title: Cloud Load Balancers
categories: [architect]
tags: [Archiect]
---


- Efficient load balancing is vital for optimizing the performance and availability of your applications in the cloud.
- However, managing load balancers can be overwhelming, given the various types and configuration options available.
- In today's multi-cloud landscape, mastering load balancing is essential to ensure seamless user experiences and maximize resource utilization, especially when orchestrating applications across multiple cloud providers. 
- Having the right knowledge is key to overcoming these challenges and achieving consistent, reliable application delivery.


![Load Balancing](/assets/img/architect/cloud-loadbalancer-cheatsheet.webp)

- In selecting the appropriate load balancer type, it's essential to consider factors such as 
    + Application traffic patterns
    + Scalability requirements 
    + Security considerations. 
- By carefully evaluating your specific use case, you can make informed decisions that enhance your cloud infrastructure's efficiency and reliability.


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
