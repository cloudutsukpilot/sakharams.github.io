---
layout: post
title: Azure - Virtual Private Network (VPN) Connections
categories: [cloud, azure, networking]
tags: [Cloud, Azure, Networking]
---

## Introduction
- VPN connections in Azure are secure connections that use the public internet to connect your on-premises network, individual devices, or other virtual networks to Azure Virtual Networks (VNets). 
- Azure provides several types of VPN connections, each suited for different scenarios:
1. Point-to-Site (P2S) VPN
2. Site-to-Site (S2S) VPN
3. VNet-to-VNet VPN
4. ExpressRoute
- Virtual Network Gateway's often provide the infrastructure and functionality to establish and manage VPN connections. 
- Ex. A Virtual Network Gateway is used to create Site-to-Site (S2S) VPN connections between an Azure virtual network and an on-premises network or to establish Point-to-Site (P2S) VPN connections for individual clients/devices to connect securely to the Azure virtual network.
- A virtual network gateway subnet is a specialized subnet within a virtual network designed to host the virtual network gateway, providing isolation, routing capabilities, and enhanced security for network communication between the virtual network and external networks.

### Virtual Network Gateway
- Virtual Network Gateway is a resource that provides connectivity between an Azure Virtual Network (VNet) and other networks, including on-premises networks, other Azure VNets, or the internet. 
- Virtual Network Gateways are fundamental components for enabling hybrid cloud scenarios, secure remote access, and inter-VNet communication.
- Types of Virtual Network Gateways
1. VPN Gateway:
- Gateway Type: VPN
- Supported Connections: Point-to-Site (P2S), Site-to-Site (S2S), and VNet-to-VNet.
- SKUs: Basic, Standard, High Performance, Ultra Performance, and VpnGw1-5 (varying in throughput and connection limits).

2. ExpressRoute Gateway:
- Gateway Type: ExpressRoute
- Supported Connections: ExpressRoute circuits for private connectivity.
- SKUs: Standard, High Performance, Ultra Performance, offering different levels of throughput and scalability.


### 1. Point-to-Site (P2S) VPN

![Point-to-Site VPN Connnection](/assets/img/cloud/azure/point-to-site-vpn-connection.avif)

- Point-to-Site VPN is used to establish a secure connection from an individual client computer to an Azure Virtual Network (VNet). 
- This type of VPN is useful for remote workers who need to connect to the Azure resources from various locations.
- Key Features:
    + `Client-Based`:
    The connection is initiated from a client computer. Each client device establishes its own connection to the VNet.
    + `Scalability`:
    Suitable for a small number of clients needing intermittent access. Ideal for remote workers or small branch offices.
    + `Authentication`:
    Supports various authentication methods, including native Azure AD authentication, certificate-based authentication, and RADIUS servers.
    + `Protocol Support`:
    Uses Secure Socket Tunneling Protocol (SSTP), which works through most firewalls and Network Address Translation (NAT) devices, or OpenVPN, which is a more flexible option.
    + `Setup`:
    Typically easier and quicker to set up compared to S2S connections.

- Use Cases:
    + Remote employees needing secure access to Azure resources.
    + Developers needing to connect to Azure VNets for development and testing purposes.
    + Small offices or temporary locations where setting up a full S2S VPN might be impractical.

### 2. Site-to-Site (S2S) VPN

![Site-to-Site-VPN](/assets/img/cloud/azure/azure-Site-to-Site-VPN-connection.png)

- Site-to-Site VPN is used to establish a secure connection between an entire on-premises network (or another cloud network) and an Azure VNet. 
- This type of VPN is typically used to connect corporate networks to Azure.
- Key Features:
    + `Network-Based`:
    The connection is established between your on-premises VPN device and an Azure VPN gateway, allowing any device on the on-premises network to communicate with Azure resources without additional configuration.
    + `Scalability`:
    Suitable for connecting entire offices or data centers to Azure. Supports multiple S2S connections to different VNets or other on-premises locations.
    + `Authentication`:
    Uses Internet Protocol Security (IPsec) and Internet Key Exchange (IKE) for secure communication.
    + `Protocol Support`:
    IPsec/IKE VPN tunnels ensure secure encryption of data in transit.
    + `Setup`:
    Requires a compatible VPN device on-premises and appropriate configuration of both the on-premises device and the Azure VPN gateway.
- The Local Network Gateway in a Site-to-Site VPN setup serves as a configuration resource that defines and represents the on-premises network, enabling secure and reliable communication between the cloud virtual network and the on-premises network.
- The Local Network Gateway is associated with the Virtual Network Gateway in the cloud environment to establish the Site-to-Site VPN connection. The Virtual Network Gateway represents the virtual network in the cloud, while the Local Network Gateway represents the on-premises network.

- Use Cases:
    + Extending an on-premises network to Azure for hybrid cloud scenarios.
    + Connecting multiple branch offices or data centers to a centralized Azure VNet.
    + Securely accessing Azure resources from a corporate network without needing individual client configurations.


### 3. VNet-to-VNet VPN
- VNet-to-VNet VPN connects two or more VNets within Azure, either within the same region or across different regions. 
- This is useful for connecting different parts of your Azure infrastructure.
- Key Features:
    + Network-Based Connection: Establishes a secure tunnel between VNets.
    + Cross-Region Support: Allows connecting VNets in different regions.
- Use Case: Multi-region deployments, cross-region redundancy, or inter-VNet communication.

### 4. ExpressRoute
- ExpressRoute is not a VPN but an alternative to VPN that provides a dedicated, private connection between your on-premises network and Azure.
- Key Features:
    + Private Connection: Does not use the public internet.
    + High Bandwidth and Low Latency: Provides higher reliability, faster speeds, and lower latencies compared to VPN.
    + Direct Connectivity: Connects to Azure services directly.
- Use Case: Large-scale enterprise scenarios requiring high-performance connectivity, consistent network throughput, and low latency.


### How Virtual Network Gateways Work?
1. Deployment:
- A Virtual Network Gateway is deployed within a specific subnet called the gateway subnet in an Azure VNet.
- The gateway subnet contains the IP addresses used by the gateway services.

2. Configuration:
- For a VPN Gateway, you configure the type of VPN (Route-based or Policy-based) and set up the required connections (P2S, S2S, or VNet-to-VNet).
- For an ExpressRoute Gateway, you establish a private connection using an ExpressRoute circuit provided by a network service provider.

3. Authentication and Encryption:
- VPN Gateways use IPsec/IKE protocols to ensure secure, encrypted tunnels.
- ExpressRoute Gateways use dedicated circuits that do not traverse the public internet, enhancing security and reliability. 

### Use Cases for Azure VPN Connections
1. `Remote Access`: P2S VPN for remote employees accessing corporate resources in Azure.
2. `Hybrid Cloud`: S2S VPN for extending on-premises data centers to Azure.
3. `Disaster Recovery`: VNet-to-VNet VPN for setting up disaster recovery between Azure regions.
4. `Enterprise Connectivity`: ExpressRoute for high-performance, private connectivity between corporate networks and Azure.
