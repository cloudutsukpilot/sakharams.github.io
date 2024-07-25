---
layout: post
title: Security Principles 
categories: [architect, cloud, security]
tags: [Cloud, Cloud Architect, Security Architect, Cloud Security]
---

## Introduction

### 1. **Least Privilege**
- Least privilege is a security principle that ensures users, systems, and applications are granted the minimum level of access – or permissions – necessary to perform their functions. 
- The goal is to limit potential damage in case of accidental, unauthorized, or malicious activities.
- **Key Concepts**:
    + `Minimal Access`: Users and systems are given only the permissions they need to accomplish their tasks, and nothing more.
    + `Role-Based Access Control (RBAC)`: Assigning permissions based on roles rather than individuals. Each role is associated with the minimum permissions required for that role.
    + `Regular Review`: Periodically reviewing and adjusting access rights to ensure they remain aligned with current job requirements and organizational policies.

- **Benefits**:
    + `Reduced Attack Surface`: Limiting access reduces the opportunities for attackers to exploit systems and data.
    + `Mitigated Insider Threats`: Minimizing permissions decreases the risk of insider threats, whether intentional or accidental.
    + `Improved Compliance`: Many regulatory standards mandate the implementation of least privilege.

### Implementation in CSP's:
#### **Azure**
* `Use Azure Active Directory (AAD)`: Implement role-based access control (RBAC) using Azure AD to assign users to roles with the minimum permissions required.
* `Assign Roles at the Appropriate Scope`: Use scopes (management group, subscription, resource group, resource) to limit the extent of permissions.
* `Use Just-In-Time (JIT) Access`: Enable Azure AD Privileged Identity Management (PIM) to provide temporary privileged access.
* `Review and Audit Access`: Regularly review access assignments and audit logs to ensure compliance with least privilege principles.
* `Implement Azure Policy`: Use policies to enforce tagging and resource constraints.

#### **AWS**
* `Use AWS Identity and Access Management (IAM)`: Create IAM roles and policies to grant the minimum permissions necessary for users and applications.
* `Apply IAM Policies at the Appropriate Level`: Use resource-level permissions to limit access to specific resources.
* `Enable AWS IAM Access Analyzer`: Identify resources accessible from outside your AWS account.
* `Use AWS Organizations`: Implement service control policies (SCPs) to manage permissions across multiple accounts.
* `Review IAM Policies Regularly`: Audit IAM policies and permissions regularly using AWS IAM Access Analyzer and AWS Config rules.

#### **GCP**
* `Use Google Cloud IAM`: Create IAM roles and policies to assign the minimum permissions necessary for users and applications.
* `Apply IAM Policies at the Appropriate Scope`: Use projects, folders, and organizations to limit the scope of permissions.
* `Enable IAM Recommender`: Use IAM Recommender to provide least privilege recommendations.
* `Use Google Cloud Policy Intelligence`: Identify and manage overly permissive access.
* `Regularly Review IAM Policies`: Audit IAM policies and permissions using Cloud Asset Inventory and Cloud Audit Logs.

### 2. **Defense in Depth**
- Defense in depth is a security strategy that employs multiple layers of defense to protect systems and data. 
- This approach ensures that if one layer fails, additional layers continue to provide protection, reducing the likelihood of a successful attack.

- Key Concepts:
    + `Multiple Layers`: Implementing a variety of protective measures at different levels (e.g., network, application, data).
    + `Redundancy`: Overlapping security measures so that failure of one does not compromise overall security.
    + `Comprehensive Coverage`: Addressing security across all aspects of the IT environment, including physical security, network security, endpoint security, application security, and data security.

- Benefits:
    + `Increased Resilience`: Multiple layers of security make it harder for attackers to penetrate systems.
    + `Delay and Detection`: Attackers may be delayed and detected as they encounter successive layers of defense.
    + `Flexible Response`: Different layers can be adapted to emerging threats without compromising overall security.

### Implementation in CSP's:
#### **Azure**
* `Network Security Groups (NSGs)`: Implement NSGs to control inbound and outbound traffic to resources.
* `Azure Firewall and DDoS Protection`: Use Azure Firewall and Azure DDoS Protection to protect against network threats.
* `Azure Security Center`: Enable Azure Security Center for continuous security assessment and recommendations.
* `Implement Virtual Network (VNet) Peering and Service Endpoints`: Use VNet peering and service endpoints for secure communication.
* `Deploy Azure Bastion`: Use Azure Bastion to securely manage VMs without exposing them to the public internet.

#### **AWS**
* `Security Groups and Network ACLs`: Use security groups and network ACLs to control traffic to resources.
* `AWS WAF and Shield`: Implement AWS WAF (Web Application Firewall) and AWS Shield for protection against web exploits and DDoS attacks.
* `AWS Security Hub`: Enable AWS Security Hub for continuous security assessment and recommendations.
* `Use VPC Peering and PrivateLink`: Implement VPC peering and AWS PrivateLink for secure inter-VPC communication.
* `Deploy AWS Systems Manager Session Manager`: Use Session Manager for secure access to EC2 instances without the need for public IPs.

#### **GCP**
* `VPC Firewall Rules`: Configure VPC firewall rules to control traffic to resources.
* `Cloud Armor`: Implement Cloud Armor for protection against web attacks.
* `Security Command Center`: Enable Security Command Center for continuous security assessment and recommendations.
* `Use VPC Service Controls`: Implement VPC Service Controls to protect services from unauthorized access.
* `Deploy Identity-Aware Proxy (IAP)`: Use IAP to control access to applications running on GCP.

### 3. **Zero Trust**
- Zero Trust is a security model that assumes that threats could exist both inside and outside the network. 
- It advocates for verifying every request as though it originates from an open network, rather than assuming trust based on network location.

- Key Concepts:
    + `Verify Explicitly`: Always authenticate and authorize based on all available data points, including user identity, location, device health, service or workload, data classification, and anomalies.
    + `Least Privilege Access`: Limit user access with Just-In-Time (JIT) and Just-Enough-Access (JEA), risk-based adaptive policies, and data protection.
    + `Assume Breach`: Minimize the blast radius and segment access. Verify end-to-end encryption and use analytics to detect and respond to anomalies in real-time.

- Benefits:
    + `Improved Security Posture`: Treating every request as potentially malicious ensures stricter control and monitoring.
    + `Adaptive to Modern Workflows`: Supports remote work, BYOD (Bring Your Own Device), and cloud environments where traditional perimeter security is less effective.
    + `Enhanced Monitoring and Response`: Continuous verification and adaptive access policies improve the ability to detect and respond to threats.

### Implementation in CSP's:
#### **Azure**
* `Azure AD Conditional Access`: Implement Conditional Access policies to enforce access controls based on conditions such as user location, device state, and risk level.
* `Azure AD Multi-Factor Authentication (MFA)`: Require MFA for all users to add an extra layer of security.
* `Use Azure Bastion for Secure VM Access`: Ensure secure access to VMs without exposing them to the public internet.
* `Enable Azure Information Protection`: Classify and protect documents and emails by applying labels.
* `Implement Azure Sentinel`: Use Azure Sentinel for intelligent security analytics and threat detection.

#### **AWS**
* `AWS IAM Identity Center (formerly AWS Single Sign-On)`: Centralize access control using IAM Identity Center.
* `Enable AWS IAM MFA`: Require MFA for all users to enhance security.
* `Use AWS PrivateLink`: Ensure secure access to AWS services without exposing them to the public internet.
* `Implement AWS Macie`: Discover and protect sensitive data using Amazon Macie.
* `Enable GuardDuty and Detective`: Use GuardDuty for continuous threat detection and Amazon Detective for investigation.

#### **GCP**
* `Identity-Aware Proxy (IAP)`: Use IAP to enforce identity and context-based access controls to applications.
* `Enable Multi-Factor Authentication (MFA)`: Require MFA for all users to increase security.
* `Use BeyondCorp Enterprise`: Implement BeyondCorp for zero trust access to resources without traditional VPNs.
* `Enable Data Loss Prevention (DLP)`: Discover and protect sensitive data using Cloud DLP.
* `Implement Chronicle Security Analytics`: Use Chronicle for advanced threat detection and investigation.

