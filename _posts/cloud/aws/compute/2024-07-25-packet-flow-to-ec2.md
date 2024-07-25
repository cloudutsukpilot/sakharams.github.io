---
layout: post
title: Packet Flow to EC2 Instance
categories: [cloud, aws]
tags: [Cloud, Amazon Web Services(AWS)]
---

## Introduction
- How does a traffic flow from internet to an EC2 instance inside VPC: 

1. User - Public Internet
2. Public Internet - Internet Gateway
3. IGW - Public Subnet
4. Public Subnet - Elastic Load Balancer
5. ELB -> Routing Table
6. Routing Table - Private Subnet
7. Private Subnet - Network ACL
8. NACL - Security Group
9. Security Group - EC2 Instance
10. EC2 Instance - Application

![Packet Flow Diagram](/assets/img/cloud/aws/compute/packet-flow/packet-flow-diagram.jpeg)


### 1. User Initiates Request:
- The user, from their browser or application, sends a request to access the application hosted on an EC2 instance.

### 2. Public Internet:
- The request travels through the public internet to reach the AWS infrastructure.

### 3. Internet Gateway (IGW):
- The request hits the Internet Gateway associated with the VPC. The IGW enables communication between instances in the VPC and the internet.

### 4. Public Subnet:
- The IGW routes the traffic to the public subnet. The public subnet contains resources (ELB) that have public IP addresses and are accessible from the internet.

### 5. Elastic Load Balancer (ELB):
- If the application uses an Elastic Load Balancer (such as ALB or NLB), the request first reaches the ELB. The ELB distributes incoming application traffic across multiple targets (EC2 instances) in one or more Availability Zones, improving the application's availability and fault tolerance.

### 6. Routing Table:
- The routing table associated with the public subnet directs the traffic to the appropriate destination. The route table contains rules that determine the path of the network traffic.

### 7. Network Address Translation (NAT) Gateway(Optional): 
- If the traffic is meant for instances in private subnets that require internet access for outgoing connections a NAT Gateway might be involved. However, for incoming traffic to a publicly accessible application, the NAT Gateway is not typically used.

### 8. Network ACL (NACL):
- The traffic passes through Network ACLs (stateless firewalls) associated with the public subnet. 
- NACLs provide an additional layer of security by allowing or denying traffic to and from the subnet.

### 9. Private Subnet:
- If the target EC2 instance resides in a private subnet, the load balancer forwards the request to the instance within this subnet. 
- Private subnets do not have direct access to the internet and are used for internal resources.

### 10. Security Group:
- The traffic is subject to Security Group rules (stateful firewalls) associated with the EC2 instance. 
- Security Groups control inbound and outbound traffic at the instance level.

### 11. EC2 Instance:
- Finally, the request reaches the EC2 instance where the application is hosted. 
- The instance processes the request and sends back the response following the same path in reverse order.

### 12. Application Response:
- The application on the EC2 instance generates a response, which travels back through the security group, private subnet, NACL, load balancer, public subnet, Internet Gateway, and then to the public internet, eventually reaching the user.