---
layout: post
title: Bastion Hosts
categories: [architect, cloud, network]
tags: [Cloud, Cloud Architect, Security Architect, Cloud Security]
---

## Introduction
- Bastion Hosts are critical components in cloud architectures for securely accessing virtual machines (VMs) and other resources within private networks.

### Azure Bastion
- Azure Bastion provides secure and seamless RDP and SSH connectivity to VMs directly through the Azure portal without exposing the VMs to public internet.
- Deploys in the virtual network (VNet) and uses an HTML5-based web client to establish secure RDP/SSH connections to VMs.

### AWS Bastion Host
- AWS Bastion Hosts (also known as Jump Servers) provide secure access to instances in private subnets of a Virtual Private Cloud (VPC).
- Typically, a managed EC2 instance configured as a bastion host is deployed in a public subnet, which then connects to instances in private subnets.

### GCP Cloud IAP (Identity-Aware Proxy) for SSH and RDP
- GCP’s Identity-Aware Proxy (IAP) for SSH and RDP provides a secure way to access VMs in private networks without needing a bastion host.
- IAP tunnels SSH and RDP traffic through Google's infrastructure, providing secure access based on IAM policies.
- Key Features
    + `No Bastion Host Required`: Eliminates the need for a dedicated bastion host by tunneling traffic through IAP.

### Comparison Table

| Feature                      | GCP Identity-Aware Proxy (IAP)                                 | Azure Bastion                                  | AWS Bastion Host (AWS Systems Manager Session Manager)          |
|------------------------------|----------------------------------------------------------------|------------------------------------------------|----------------------------------------------------------------|
| **Infrastructure**           | No bastion host required, uses Google's global infrastructure  | Managed service deployed within a VNet         | Managed service using Session Manager, no traditional bastion host needed |
| **Access Control**           | Based on IAM policies                                          | Managed via Azure portal                       | Based on IAM roles and policies                                |
| **Public IP Requirement**    | No public IP required for VMs                                  | No public IP required for VMs                  | No public IP required for instances                           |
| **Access Method**            | Browser-based access, SSH/RDP tunnels                          | Browser-based access via Azure portal          | Browser-based access via AWS Console, Session Manager plugin for CLI and SSH  |
| **Integration**              | Seamless integration with GCP services                         | Seamless integration with Azure services       | Seamless integration with AWS services                         |
| **Management**               | No bastion host to manage, fully managed by GCP                | Fully managed by Azure, minimal management     | Fully managed by AWS, minimal management required              |
| **Security**                 | Reduces attack surface, uses IAM for access control            | Reduces attack surface, uses secure connections| Reduces attack surface, uses IAM and encryption                |
| **Logging and Auditing**     | Integrated with Cloud Audit Logs                               | Integrated with Azure Monitor for logging      | Integrated with AWS CloudTrail, CloudWatch, and AWS Config     |
| **High Availability**        | Depends on Google's infrastructure                             | Designed for high availability                 | Designed for high availability, part of AWS Global Infrastructure |


### Key Features:
- `Logging and Monitoring`: Can be integrated with AWS CloudTrail, CloudWatch for logging and monitoring access activities.
- `No Public IP Required`: VMs do not need public IP addresses, reducing exposure to internet threats.
- `Secure Connectivity`: Provides secure and encrypted RDP and SSH connectivity via the CSP portal.
- `Platform Managed`: Fully managed service by CSP, reducing the need for manual maintenance.
- `Integrated Experience`: Accessible directly from the CSP portal, providing a seamless user experience.
- `IAM-Based Access`: Access is controlled via IAM/RBAC policies, providing fine-grained control over who can access which resources.

### Use Cases
1. Securely manage VMs in a private VNet.
2. Access VMs without exposing them to the internet.
3. Simplify RDP/SSH access management by using the CSP portal.
