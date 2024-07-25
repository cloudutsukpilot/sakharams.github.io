---
layout: post
title: Security Groups and Firewalls
categories: [architect, cloud, network]
tags: [Cloud, Cloud Architect, Security Architect, Cloud Security]
---


## Introduction
- Here are a few commonly used examples of Security Groups and Firewalls in Azure, AWS, and GCP

### AWS
1. **Security Groups**
- `Web Server Security Group`
    + Purpose: Allow HTTP and HTTPS traffic from the internet and restrict SSH access to specific IP ranges.
    + Technologies/Terms: EC2, Security Group, HTTP, HTTPS, SSH, CIDR, Source IP.
- `Application Server Security Group`
    + Purpose: Allow traffic from the web server security group on application-specific ports and deny all other inbound traffic.
    + Technologies/Terms: EC2, Security Group, Custom TCP Ports, Source Security Group.
- `Database Server Security Group`
    + Purpose: Allow traffic from the application server security group on database-specific ports and deny all other inbound traffic.
    + Technologies/Terms: RDS, Security Group, Custom TCP Ports, Source Security Group.

2. **Firewalls**
- `AWS Network Firewall`
    + Purpose: Provide centralized protection against threats at the VPC level, with stateful inspection, intrusion prevention, and deep packet inspection.
    + Technologies/Terms: VPC, Stateful Inspection, Intrusion Prevention, Deep Packet Inspection.
- `Web Application Firewall (WAF)`
    + Purpose: Protect web applications from common web exploits such as SQL injection and cross-site scripting.
    + Technologies/Terms: CloudFront, API Gateway, ALB, WAF, Rules, SQL Injection, XSS.

### Azure
1. **Network Security Groups (NSGs)**
- `Web Subnet NSG`
    + Purpose: Allow inbound HTTP and HTTPS traffic from the internet and restrict RDP/SSH access to specific IP ranges.
    + Technologies/Terms: VNet, NSG, HTTP, HTTPS, RDP, SSH, CIDR, Source IP.
- `Application Subnet NSG`
    + Purpose: Allow traffic from the web subnet on specific ports and deny all other inbound traffic.
    + Technologies/Terms: VNet, NSG, Custom TCP Ports, Source Subnet.
- Database Subnet NSG
    + Purpose: Allow traffic from the application subnet on database-specific ports and deny all other inbound traffic.
    + Technologies/Terms: VNet, NSG, Custom TCP Ports, Source Subnet.

2. **Firewalls**
- `Azure Firewall`
    + Purpose: Provide centralized network security with high availability and unrestricted cloud scalability. Supports both application and network-level filtering rules.
    + Technologies/Terms: VNet, Firewall, Application Rules, Network Rules, Threat Intelligence.
- `Web Application Firewall (WAF)`
    + Purpose: Protect web applications from common web vulnerabilities and attacks.
    + Technologies/Terms: Application Gateway, Front Door, WAF, Rules, SQL Injection, XSS.

### GCP
1. **Firewall Rules**
- `Web Server Firewall Rule`
    + Purpose: Allow HTTP and HTTPS traffic from the internet and restrict SSH access to specific IP ranges.
    + Technologies/Terms: VPC, Firewall Rules, HTTP, HTTPS, SSH, CIDR, Source IP.
- `Application Server Firewall Rule`
    + Purpose: Allow traffic from the web server on specific ports and deny all other inbound traffic.
    + Technologies/Terms: VPC, Firewall Rules, Custom TCP Ports, Source Tags.
- `Database Server Firewall Rule`
    + Purpose: Allow traffic from the application server on database-specific ports and deny all other inbound traffic.
    + Technologies/Terms: Cloud SQL, Firewall Rules, Custom TCP Ports, Source Tags.

2. **Firewalls**
- `GCP Firewall`
    + Purpose: Provide network security with flexible rules for controlling traffic to and from VMs.
    + Technologies/Terms: VPC, Firewall Rules, Ingress, Egress, Tags, Service Accounts.
- `Cloud Armor`
    + Purpose: Protect applications from DDoS attacks and common web application vulnerabilities.
    + Technologies/Terms: Load Balancing, Cloud Armor, WAF, DDoS Protection, Rules, SQL Injection, XSS.

    