---
layout: post
title: Microsoft Azure Virtual Networks
categories: [cloud, azure]
tags: [Cloud, Azure]
---

## Introduction
- Azure Virtual Network (VNet) and subnets are fundamental components of the Azure networking infrastructure that allow you to securely connect Azure resources to each other, the internet, and on-premises networks.

![Azure Virtual Networks and Subnets](/assets/img/cloud/azure/azure-virtual-networks-and-subnets.webp)

### Azure Virtual Network (VNet)
- Azure Virtual Network (VNet) is a representation of your own network in the cloud. 
- It enables many types of Azure resources to securely communicate with each other, the internet, and on-premises networks.

### Key Features and Benefits:

1. `Isolation and Segmentation`:
- Provides network isolation by default, enabling you to create isolated networks.
- You can further segment your VNet into subnets to organize and secure your resources.

2. `Secure Communication`:
- Allows communication between Azure resources within the same VNet.
- Supports secure communication with on-premises networks through VPN or ExpressRoute connections.

3. `Custom IP Addressing`:
- You can define your own private IP address space using public and private addresses.

4. Subnets:
- VNets can be divided into subnets for organizational and security purposes.

5. Network Security:
- You can use Network Security Groups (NSGs) to control inbound and outbound traffic at the subnet or NIC level.

6. Integration with Azure Services:
- Many Azure services can be deployed into a VNet, providing network security and connectivity.

7. Service Endpoints and Private Link:
- Enables secure access to Azure services over a private IP within the VNet.

## Azure Subnets
- Subnets are segments within an Azure VNet that allow you to divide your network into smaller, manageable sections. 
- Subnets enable you to organize and secure your resources effectively.

### Key Features and Benefits:
1. `IP Address Management`:
= Each subnet within a VNet is defined by a unique IP address range.
- Subnets help in organizing resources based on their functions and security requirements.

 2. `Isolation and Security`:
- Subnets can be used to isolate different parts of your application, enhancing security.
- You can apply NSGs to subnets to control traffic flow and enforce security policies.

3. `Resource Allocation`:
- Resources such as virtual machines (VMs) and Azure services can be placed in different subnets according to their roles and functions.

4. `Network Security Groups (NSGs)`:
- NSGs can be associated with subnets to control inbound and outbound traffic at the subnet level.
- You can define security rules to allow or deny traffic based on source/destination IP address, port, and protocol.

5. `Routing`:
- Subnets can be configured with custom route tables to control traffic routing within the VNet and to external networks.

6. `Service Endpoints`:
- You can enable service endpoints on subnets to secure Azure service resources to only the VNet.

### How VNets and Subnets Work Together
- VNet: Acts as the overall container for your network in Azure, with its own address space.
- Subnets: Divide the VNet into smaller sections, each with its own address range.
- Example
    + Consider a scenario where you have a VNet with an address space of 10.0.0.0/16. You can divide this VNet into subnets like so:

        Subnet1: 10.0.0.0/24
        Subnet2: 10.0.1.0/24
        Subnet3: 10.0.2.0/24

    + Each subnet can host different types of resources and apply different security rules.

### Use Cases
1. Isolating Different Application Tiers:
- Use separate subnets for web, application, and database tiers, applying NSGs to each subnet to enhance security.

2. Hybrid Connectivity:
- Establish secure connections between on-premises networks and Azure VNets using VPN Gateway or ExpressRoute, and organize resources within subnets for efficient management.

3. Microservices Architectures:
- Deploy different microservices in different subnets to provide network isolation and security controls.

4. Compliance and Regulatory Requirements:
- Use subnets to segment your network and apply security controls to meet compliance requirements.


### Virtual Network Peering
- Azure Virtual Network Peering is a feature that allows you to connect two or more virtual networks (VNets) within the same Azure region or across different Azure regions. 
- This connectivity is seamless and appears as a single network, enabling resources in different VNets to communicate with each other as if they were part of the same network.

### Key Features and Benefits of Azure VNet Peering
1. Low Latency and High Bandwidth:
- Provides high-bandwidth, low-latency connectivity between peered VNets.

2. Private IP Communication:
- Allows direct communication using private IP addresses without the need for public internet routing.

3. Transitive Peering:
- Supports transit routing across peered VNets, enabling traffic to flow through an intermediary VNet if configured correctly.

4. Network Security:
- You can still use Network Security Groups (NSGs) to control the flow of traffic between resources in peered VNets.

5. No Gateway Required:
- VNet peering does not require a VPN gateway, reducing the complexity and cost of setting up the connection.

6. Cross-Region Peering:
- Supports peering across different Azure regions, enabling global connectivity for your applications.

7. Full Mesh Topology:
- Enables a full mesh network topology, where each VNet can connect to every other VNet in a peering relationship.

8. Resource Access:
- Allows you to access resources across VNets, such as virtual machines, databases, and other services.

### Use Cases for VNet Peering
1. Multi-Region Deployments:
- Connect VNets across different Azure regions to enable cross-region redundancy and disaster recovery.

2. Separation of Concerns:
- Use separate VNets for different departments or applications within an organization, peering them to allow secure communication.

3. Centralized Services:
- Host centralized services (like shared databases or authentication services) in one VNet and peer other VNets to it for access.

4. Hybrid Networking:
- Integrate on-premises networks with multiple Azure VNets, peering them for seamless connectivity.

5. Microservices Architecture:
- Deploy different microservices in separate VNets and peer them to enable communication.