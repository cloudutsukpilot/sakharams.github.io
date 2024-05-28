---
layout: post
title: Azure - Network Security Groups (NSG)
categories: [azure]
tags: [Cloud, Azure]
---

# Introduction to Network Security Groups
- Network Security Groups (NSGs) in Azure are used to control network traffic to and from Azure resources within an Azure Virtual Network (VNet). 
- They contain security rules that allow or deny inbound and outbound traffic based on various criteria. 

### Key Components of NSGs:

1. Security Rules:

- Name: A unique identifier for the rule within the NSG.
- Priority: A number between 100 and 4096 that determines the order of rule processing. Lower numbers are processed first.
- Direction: Specifies whether the rule applies to inbound or outbound traffic.
- Source: Defines the source of the traffic. It can be an IP address, CIDR block, service tag, or application security group (ASG).
- Source Port Ranges: Specifies the source port or range of ports. Can include single ports (e.g., 80), ranges (e.g., 1024-65535), or * for all ports.
- Destination: Defines the destination of the traffic. Similar to the source, it can be an IP address, CIDR block, service tag, or ASG.
- Destination Port Ranges: Specifies the destination port or range of ports. Similar to source port ranges.
- Protocol: Specifies the protocol to which the rule applies. Options are TCP, UDP, ICMP, or * for all protocols.
- Access: Determines whether the traffic is allowed or denied. Options are Allow or Deny.
- Description: An optional field to provide a description of the rule.

2. Default Security Rules:

NSGs come with default rules that allow or deny traffic. These rules cannot be deleted but can be overridden by higher priority rules.
- AllowVNetInBound: Allows inbound traffic within the VNet.
- AllowAzureLoadBalancerInBound: Allows inbound traffic from Azure's load balancer.
- DenyAllInBound: Denies all other inbound traffic.
- AllowVNetOutBound: Allows outbound traffic within the VNet.
- AllowInternetOutBound: Allows outbound traffic to the internet.
- DenyAllOutBound: Denies all other outbound traffic.

3. Associations:
- NSGs can be associated with subnets or individual network interfaces (NICs) of virtual machines.
- When associated with a subnet, the rules apply to all resources within that subnet.
- When associated with a NIC, the rules apply to the specific VM network interface.

4. Service Tags:
- Simplify the creation of security rules by using predefined tags for well-known Azure services (e.g., Internet, VirtualNetwork, AzureLoadBalancer).

5. Application Security Groups (ASGs):
- Group virtual machine NICs to apply security rules based on application tiers or workloads instead of explicit IP addresses.


### Stateful Nature of NSG
- The stateful nature of Azure Network Security Groups (NSGs) refers to their ability to automatically allow response traffic for any allowed inbound or outbound connection. 
- In simpler terms, if an NSG rule permits traffic in one direction, the return traffic for that connection is automatically permitted in the opposite direction, without needing an explicit rule to allow the return traffic.
- Example Scenarios:
    + `Inbound Traffic`: 
        - If you have an inbound rule that allows HTTP traffic (port 80) from the internet to a web server in your VNet, the NSG will allow the initial inbound request. 
        - The stateful nature of the NSG ensures that the response traffic from the web server back to the client is automatically allowed, without needing an explicit outbound rule for this return traffic.
    + `Outbound Traffic`: 
        - If you have an outbound rule that allows SSH traffic (port 22) from your VM to an external server, the NSG will allow the initial outbound request. 
        - The stateful nature of the NSG ensures that the response traffic from the external server back to your VM is automatically allowed, without needing an explicit inbound rule for this return traffic.

### Multiple NSG's Association
- When you have Network Security Groups (NSGs) associated with both a subnet and a Network Interface Card (NIC) in Azure, the rules from both NSGs are applied, and the most restrictive rule takes precedence. 
- Rule Application Order
1. Subnet NSG:
- The NSG associated with the subnet applies its rules to all traffic entering and leaving any NICs within that subnet.
2. NIC NSG:
- The NSG associated with a specific NIC applies its rules only to the traffic for that particular NIC.
