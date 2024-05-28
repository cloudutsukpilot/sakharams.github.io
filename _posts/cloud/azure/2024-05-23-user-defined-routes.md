---
layout: post
title: Microsoft Azure  - User Defined Routes
categories: [azure]
tags: [Cloud, Azure]
---

## Introduction to UDRs
- User Defined Routes (UDRs) in Azure are custom routing rules that allow you to control the traffic flow within your Azure Virtual Network. 
- They enable you to override the default system routes provided by Azure, giving you the flexibility to direct network traffic according to specific needs. 

### Key Features of User Defined Routes
1. `Customization of Traffic Flow`:
- UDRs enable you to dictate how traffic is routed within your virtual network.
- Useful for directing traffic through network appliances like firewalls, network virtual appliances (NVAs), or VPN gateways for processing.

2. `Components of UDRs`:
- Route Table: A collection of custom routes you define.
- Destination: The address prefix of the destination network, specified in CIDR notation (e.g., 10.0.0.0/16).
- Next Hop Type: Specifies the next hop for the traffic, such as:
- Virtual Appliance: Directs traffic to a specific IP address, typically an NVA or firewall.
- Virtual Network Gateway: Routes traffic to an on-premises network through a VPN gateway.
- Internet: Sends traffic to the Internet.
- None: Drops the traffic.
- VNet Peering: Routes traffic to a peered virtual network.

3. `Route Table Association`:
- Route tables can be associated with one or more subnets within a virtual network.
- This association ensures that the routing rules apply to the traffic within those subnets.

### Use Cases for User Defined Routes
1. `Forced Tunneling`:
- Ensuring that all internet-bound traffic from a subnet goes through a security appliance for inspection and control.
2. `Traffic Isolation`:
- Segregating traffic between different subnets or virtual networks for enhanced security and management.
3. `Network Security`:
- Directing traffic through network security appliances to implement custom security policies.
4. `Optimized Routing`:
- Optimizing routing paths for better performance or to reduce costs by controlling how traffic flows within your network.

### Precedence and Application
- `Precedence Over System Routes`: UDRs take precedence over default system routes provided by Azure. If there is a conflict between a UDR and a system route, the UDR will be used.
- `Flexible Configuration`: UDRs allow for complex network configurations, catering to specific business needs and security requirements.

### Example Scenario
- Imagine you have a subnet within your virtual network where you want all outbound traffic to pass through a firewall for security inspection. 
- You can create a route table with a UDR that directs all traffic from that subnet to the firewall's IP address as the next hop. 
- Then, you associate this route table with the subnet, ensuring all traffic follows the defined route.

