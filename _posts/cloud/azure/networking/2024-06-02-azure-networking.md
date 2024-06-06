---
layout: post
title: Azure - Networking Overview
categories: [cloud, azure, networking]
tags: [Cloud, Azure, Networking]
---

## Introduction
- Azure offers a comprehensive suite of networking services that cater to various aspects of cloud networking, security, and connectivity. 

### List of Services

1. `Azure Virtual Network (VNet)`
    - Description: Enables you to create isolated networks within Azure.
    - Key Features: Subnetting, network security groups (NSGs), virtual network peering, and private access to Azure services.
2. `Azure VPN Gateway`
    - Description: Provides secure site-to-site, point-to-site, and VNet-to-VNet connections.
    - Key Features: IPsec/IKE VPN, OpenVPN, and SSTP support.
3. `Azure ExpressRoute`
    - Description: Offers private, high-speed connections between on-premises networks and Azure data centers.
    - Key Features: Dedicated connectivity, predictable performance, and higher security.
4. `Azure Load Balancer`
    - Description: Distributes incoming network traffic across multiple servers.
    - Key Features: Layer 4 load balancing, high availability, and scalability for applications.
5. `Azure Application Gateway`
    - Description: A web traffic load balancer that provides application-level routing and load balancing.
    - Key Features: SSL termination, URL-based routing, and Web Application Firewall (WAF).
6. `Azure Traffic Manager`
    - Description: A DNS-based traffic load balancer for distributing traffic to services across global Azure regions.
    - Key Features: Geographic routing, priority routing, and weighted routing.
7. `Azure Front Door`
    - Description: A scalable and secure entry point for fast delivery of your global applications.
    - Key Features: Global HTTP load balancing, SSL offloading, application acceleration, and WAF.
8. `Azure CDN (Content Delivery Network)`
    - Description: Delivers high-bandwidth content to users globally.
    - Key Features: Caching, dynamic site acceleration, and HTTPS delivery.
9. `Azure DDoS Protection`
    - Description: Protects your Azure applications from Distributed Denial of Service (DDoS) attacks.
    - Key Features: Automatic attack detection and mitigation, real-time telemetry, and reporting.
10. `Azure Firewall`
    - Description: A managed, cloud-based network security service that protects your Azure Virtual Network resources.
    - Key Features: Threat intelligence-based filtering, network and application rules, and high availability.
11. `Azure Bastion`
    - Description: Provides secure and seamless RDP and SSH access to your virtual machines without exposing them to the public internet.
    - Key Features: Browser-based access, secure connectivity, and simplified management.
12. `Azure Private Link`
    - Description: Enables private connectivity to Azure services and your own services on the Azure platform.
    - Key Features: Private endpoints, secure access, and integration with on-premises networks.
13. `Azure Virtual WAN`
    - Description: Provides a unified and global network architecture for connecting your branches, data centers, and VNets.
    - Key Features: Centralized management, optimized routing, and secure connectivity.
14. `Azure DNS`
    - Description: Hosts your DNS domains and provides name resolution using Microsoft’s global network of DNS servers.
    - Key Features: High availability, fast performance, and DNSSEC support.
15. `Azure Route Server`
    - Description: Simplifies dynamic routing between network virtual appliances (NVAs) and your virtual network.
    - Key Features: BGP peering, automated routing, and seamless integration with Azure VNets.
16. `Azure Network Watcher`
    - Description: Provides tools to monitor, diagnose, and gain insights into your network.
    - Key Features: Connection monitoring, packet capture, and topology visualization.
17. `Azure Peering Service`
    - Description: Enhances customer connectivity to Microsoft services via a direct connection from service providers.
    - Key Features: Improved reliability, reduced latency, and route monitoring.



### Load Balancer vs Front-Door vs Traffic Manager vs Application Gateway

1. **Scope**
- `Azure Load Balancer` operates at the transport layer (Layer 4) and is primarily used for distributing traffic within a single region.
- `Azure Traffic Manager` operates at the DNS level and provides global load balancing across multiple regions or external endpoints.
- `Azure Front Door` operates at the application layer (Layer 7) and provides global HTTP load balancing with additional security and optimization features.
- `Azure Application Gateway` also operates at the application layer and is specifically designed for application-level routing and load balancing.

2. **Routing Methods**
- `Azure Load Balancer` uses simple load-balancing algorithms like round-robin and least-connections for distributing traffic.
- `Azure Traffic Manager` offers various routing methods such as geographic, priority, weighted, and performance-based routing.
- `Azure Front Door` supports URL-based routing, SSL offloading, and WAF capabilities.
- `Azure Application Gateway` supports URL-based routing, SSL termination, WAF, and session affinity.

3. **Protocols**
- `Azure Load Balancer` supports TCP and UDP traffic.
- `Azure Traffic Manager` works at the DNS level, routing traffic based on DNS queries.
- `Azure Front Door` and `Azure Application Gateway` support HTTP and HTTPS protocols for web traffic.

4. **Features**
- `Azure Load Balancer` focuses on load balancing and high availability at the transport layer.
- `Azure Traffic Manager` focuses on global load balancing, routing policies, and endpoint health monitoring.
- `Azure Front Door` offers advanced security features like WAF and DDoS protection, along with global routing and SSL offloading.
- `Azure Application Gateway` provides application-level routing, SSL termination, WAF, and session persistence for web applications.


### Service Endpoint vs Private Endpoint vs Private Link

| Feature                   | Service Endpoint                    | Private Endpoint                      | Private Link                          | Private Link Service                |
|---------------------------|--------------------------------------|---------------------------------------|---------------------------------------|-------------------------------------|
| **Definition**            | Extends VNet to Azure services       | Private IP address within VNet        | Includes Private Endpoint; Secure access to services over private network | Allows you to provide private endpoints for your service |
| **Connectivity**          | Direct connectivity from VNet        | Connects to specific Azure resources  | Access Azure services via Private Endpoint | Provides private access to your services from customers' VNets |
| **IP Address**            | Uses public IP of Azure service      | Uses private IP within VNet           | Uses Private Endpoint's private IP    | Uses private IPs provided by customers' VNets |
| **Security**              | Traffic stays on Azure backbone      | Traffic isolated from public internet | Traffic isolated from public internet | Traffic isolated from public internet |
| **Access Control**        | VNet and subnet-based                | Granular, based on private endpoint   | Granular, based on private endpoint   | Granular, based on private endpoint |
| **DNS Configuration**     | Not required                         | Requires private DNS configuration    | Requires private DNS configuration    | Requires private DNS configuration  |
| **Supported Services**    | Many PaaS services like Storage, SQL | Specific to individual PaaS services  | All services supported by Private Endpoints | Custom services hosted on your infrastructure |
| **Use Case**              | General access to Azure services     | Isolated access to specific resources | Secure, isolated access to Azure services | Provide secure, private access to your own services |
| **Suitable for**          | Enhancing security of service access | Sensitive data and secure connections | Compliance, data isolation, and secure access | Offering private access to your applications/services |
| **Example Services**      | Azure Storage, Azure SQL Database    | Azure SQL Database, Azure Storage     | Azure Storage, Azure SQL Database, Azure Cosmos DB | Custom services provided by ISVs or in-house apps |

### Use Cases

1. **Service Endpoint** 
    - Scenario: You have a VNet and want to securely access an Azure Storage account without exposing it to the public internet.
    - Implementation Steps:
        + a. Create a VNet and a subnet.
        + b. Enable the service endpoint for the desired Azure service on the subnet.
        + c. Configure the Azure service to allow access from the VNet.

2. **Private Endpoint**
    - Scenario: You have an Azure SQL Database that you want to securely access from your VNet without exposing it to the public internet.
    - Implementation Steps:
        + a. Create a private endpoint for the Azure SQL Database within your VNet.
        + b. Configure DNS to resolve the private endpoint.

3. **Private Link**
    - Scenario: You want to provide secure access to your Azure Storage account over a private network from both your VNet and on-premises network.
    - Implementation Steps:
        + a. Create a private endpoint for the desired Azure service.
        + b. Configure a private DNS zone to resolve the service's private endpoint.

4. **Private Link Service**
    - Scenario: You are an ISV providing a database service to multiple customers and want to offer secure access to your service via private endpoints
    - Implementation Steps:
        + a. Create a Private Link Service and expose your service via Private Link. 
        + b. Enable customers to create private endpoints in their VNets to access your service.
        + c. Configure DNS to resolve the private endpoint for customers.