---
layout: post
title: Securing Network in Azure
categories: [cloud, security, network]
tags: [Cloud Security, Security Architect]
---

## Introduction
- Major cloud providers have a comprehensive suite of tools and services to secure your network infrastructure. 
- These options cover various aspects of network security, including access control, traffic monitoring, threat detection, and data protection. 
- Below are the implementation steps:
1. `Assess and Plan`: 
- Start by assessing your current network security posture and defining your security requirements.
2. `Implement Network Segmentation`: 
- Use VPCs/VNets, subnets, and firewall rules to segment and isolate your network resources.
3. `Deploy Firewalls and WAF/Cloud Armor`: 
- Implement firewall rules and WAF/Cloud Armor to protect against network and application-layer threats.
4. `Enable Threat Detection and Monitoring`: 
- Activate Security Tools and Cloud Monitoring for continuous threat detection and monitoring.
5. `Use Private Connectivity Options`: 
- Leverage cloud specific services available to secure private connections to cloud services and on-premises networks.
6. `Manage Access and Permissions`: 
- Use IAM to define and enforce access control policies, ensuring least privilege access.
7. `Encrypt Data`: 
- Apply encryption for data at rest and in transit using services available in cloud services.
8. `Continuous Monitoring and Improvement`: 
- Use Cloud Monitoring & Logging to continuously monitor your network security posture and make improvements as needed.


![Networking CheatSheet](/assets/img/architect/networking-cheatsheet.webp)



### Securing Network in Azure
- Azure provides a comprehensive set of options to secure your network, ensuring protection from various threats and vulnerabilities.
- These options cover multiple aspects of network security, including access control, traffic monitoring, threat detection, and data protection. 
- Below are the key options available to secure your network in Azure:

1. **Network Security Groups (NSGs)**
- `Traffic Filtering`: NSGs allow you to create and manage inbound and outbound security rules to filter traffic to and from Azure resources.
- `Rule-Based Segmentation`: Use NSGs to segment your network by defining rules that allow or deny traffic based on source, destination, port, and protocol.

2. **Azure Firewall**
- `Centralized Network Protection`: A managed firewall service that provides centralized protection for your Azure Virtual Network (VNet) resources.
- `Threat Intelligence`: Integrates with threat intelligence feeds to block traffic from known malicious IP addresses and domains.
- `Application Rules`: Supports application-level filtering rules to control outbound traffic based on fully qualified domain names (FQDNs).

3. **Web Application Firewall (WAF)**
- `Application Security`: Protects web applications from common threats such as SQL injection, cross-site scripting (XSS), and other OWASP Top 10 vulnerabilities.
- `Integration with Application Gateway`: Available as part of Azure Application Gateway to provide WAF capabilities for web applications hosted in Azure.

4. **Just-in-Time (JIT) VM Access**
- `Temporary Access Control`: Limits exposure of VMs by allowing inbound traffic only when needed and for a specified duration.
- `Controlled Access`: Administrators can specify allowed IP addresses and access duration to ensure secure, controlled access to VMs.

5. **Azure Bastion**
- `Secure Remote Access`: Provides secure RDP and SSH connectivity to your VMs directly from the Azure portal without exposing them to the public internet.
- `Managed Service`: Eliminates the need for public IP addresses on VMs, reducing the attack surface.

6. **Virtual Network (VNet) Security**
- `VNet Peering`: Allows secure connectivity between VNets, enabling traffic to flow between them while maintaining isolation and security controls.
- `Service Endpoints`: Extends VNet identity to Azure services, restricting service access to your VNet and reducing exposure to the public internet.

7. **Private Link**
- `Private Connectivity`: Enables private access to Azure services, providing secure connectivity without exposing data to the public internet.
- `Enhanced Security`: Uses private IP addresses within your VNet, ensuring that data stays within the Azure network.

8. **DDoS Protection**
- `Standard Protection`: Provides advanced protection against distributed denial-of-service (DDoS) attacks for your Azure applications and services.
- `Adaptive Tuning`: Automatically adjusts protection parameters based on traffic patterns and threat intelligence.

9. **Azure VPN Gateway**
- `Secure Site-to-Site Connection`s: Establishes secure connections between on-premises networks and Azure VNets using IPsec/IKE VPN tunnels.
- `Point-to-Site VPN`: Allows secure connections from individual client devices to Azure VNets, enabling remote access.

10. **ExpressRoute**
- `Private Connectivity`: Provides a dedicated, private connection between your on-premises infrastructure and Azure, bypassing the public internet.
- `Enhanced Security and Performance`: Offers greater reliability, lower latency, and higher security compared to standard internet connections.

11. **Azure Security Center**
- `Continuous Monitoring`: Provides continuous assessment and monitoring of your network security posture.
- `Security Recommendations`: Offers actionable recommendations to improve security configurations and mitigate risks.

12. **Azure Sentinel**
- `Cloud-Native SIEM`: A security information and event management (SIEM) system that provides advanced threat detection and response capabilities.
- `Integration with Azure Services`: Aggregates security data from various Azure services for comprehensive threat analysis.

13. **Azure Monitor and Network Watcher**
- `Network Monitoring`: Azure Monitor and Network Watcher provide tools to monitor, diagnose, and gain insights into your network traffic and performance.
- `Traffic Analytics`: Helps identify network anomalies and potential security issues through detailed traffic analysis.

14. **Encryption**
- `Data Encryption in Transit`: Ensures that data transmitted between Azure resources and external clients is encrypted using TLS/SSL.
- `Encryption at Rest`: Uses Azure Storage Service Encryption (SSE) to automatically encrypt data stored in Azure Storage accounts.

###  Securing Network in AWS
- Below are the key options available to secure your network in AWS:

1. **Virtual Private Cloud (VPC)**
- `VPC Configuration`: Create an isolated virtual network to launch your AWS resources in. Define subnets, route tables, and gateways to control traffic flow.
- `Subnet Segmentation`: Use public and private subnets to segregate resources based on their access needs.

2. **Security Groups**
- `Instance-Level Firewall`: Acts as a virtual firewall for your EC2 instances to control inbound and outbound traffic. Security groups operate at the instance level and allow you to define rules based on IP addresses, ports, and protocols.

3. **Network Access Control Lists (NACLs)**
- `Subnet-Level Firewall`: Provides an additional layer of security at the subnet level. NACLs control inbound and outbound traffic to and from subnets and are stateless, meaning you must define rules for both directions.

4. **AWS Firewall Manager**
- `Centralized Firewall Management`: Simplifies the management and maintenance of firewall rules across your organization. It integrates with AWS WAF, AWS Shield, and AWS Network Firewall to provide a unified security policy management solution.

5. **AWS WAF (Web Application Firewall)**
- `Application Security`: Protects your web applications from common threats such as SQL injection, cross-site scripting (XSS), and other OWASP Top 10 vulnerabilities.
- `Custom Rules`: Create custom rules to filter out specific traffic patterns and protect against targeted attacks.

6. **AWS Network Firewall**
- `Managed Network Protection`: Provides a managed firewall service to protect your VPCs from network-based threats. Supports stateful inspection, intrusion prevention, and application-layer filtering.

7. **AWS Shield**
- `DDoS Protection`: Provides advanced protection against distributed denial-of-service (DDoS) attacks. AWS Shield Standard is included at no extra cost, while AWS Shield Advanced offers enhanced DDoS protection and response capabilities.

8. **Amazon GuardDuty**
- `Threat Detection`: Continuously monitors your AWS accounts, workloads, and data stored in S3 for potential threats using machine learning and anomaly detection.
- `Automated Response`: Integrates with AWS Security Hub and AWS Lambda to automate threat response and remediation.

9. **AWS PrivateLink**
- `Private Connectivity`: Enables private access to AWS services and your own services over a dedicated connection within your VPC, avoiding exposure to the public internet.

10. **AWS Direct Connect**
- `Dedicated Network Connection`: Provides a dedicated, private connection from your on-premises network to AWS, bypassing the public internet. Offers greater bandwidth, lower latency, and more consistent network performance.

11. **AWS Transit Gateway**
- `Centralized Network Management`: Simplifies the management of multiple VPCs, AWS accounts, and on-premises networks by acting as a central hub for network traffic routing.

12. **VPC Endpoints**
- `Private Access to AWS Services`: Allows you to privately connect your VPC to supported AWS services and VPC endpoint services, ensuring traffic does not leave the AWS network.

13. **Elastic Load Balancing (ELB)**
- `Traffic Distribution and Security`: Distributes incoming traffic across multiple targets (EC2 instances, containers, IP addresses) and integrates with security features like AWS WAF and SSL/TLS termination.

14. **Amazon VPC Traffic Mirroring**
- `Network Traffic Analysis`: Captures and inspects network traffic in your VPCs for security analysis and monitoring. Useful for threat detection and troubleshooting.

15. **Encryption**
- `Data Encryption at Rest and in Transit`: AWS provides various encryption options, such as server-side encryption (SSE) for S3, EBS encryption, RDS encryption, and Key Management Service (KMS) for managing encryption keys.
TLS/SSL: Secure data in transit using TLS/SSL for encrypted communication between clients and AWS services.

17. **Monitoring and Logging**
- `Amazon CloudWatch`: Monitors your AWS resources and applications, providing detailed metrics and logs for performance and operational data.
- `AWS CloudTrail`: Records API calls made on your account, providing audit logs for security analysis and compliance.
- `VPC Flow Logs`: Captures information about IP traffic going to and from network interfaces in your VPC, aiding in traffic analysis and troubleshooting.


### Securing Network in GCP
- Below are the key options available to secure your network in GCP:

1. **Virtual Private Cloud (VPC)**
- `VPC Configuration`: Create an isolated virtual network to host your GCP resources. Define subnets, route tables, and gateways to control traffic flow.
- `Subnet Segmentation`: Use public and private subnets to segregate resources based on their access needs.

2. **Firewall Rules**
- `Traffic Filtering`: Firewall rules control inbound and outbound traffic to and from your VPC. Define rules based on IP addresses, ports, and protocols to allow or deny traffic.

3. **Identity and Access Management (IAM)**
- `Access Control`: Manage access to GCP services and resources securely. Define granular permissions and policies to control who can access what resources and under what conditions.
- `Service Accounts`: Use service accounts to provide identity for virtual machines and applications to interact with GCP services securely.

4. **Cloud Armor**
- `DDoS Protection`: Protects your applications from distributed denial-of-service (DDoS) attacks and other web application vulnerabilities.
- `Custom Rules`: Create custom rules to filter traffic and protect against specific threats.

5. **Cloud DNS**
- `Secure DNS Management`: Provides secure, reliable, and scalable Domain Name System (DNS) resolution for your applications.
- `DNSSEC`: Supports DNS Security Extensions (DNSSEC) to protect against DNS spoofing and cache poisoning attacks.

6. **Cloud Load Balancing**
- `Traffic Distribution and Security`: Distributes incoming traffic across multiple targets (VM instances, containers) and integrates with security features like Cloud Armor and SSL/TLS termination.

7. **Private Google Access**
- `Private Connectivity`: Allows instances in your VPC to connect to Google services without using public IP addresses, reducing exposure to the public internet.

8. **VPC Service Controls**
- `Perimeter Security`: Protects your resources by defining a security perimeter around your GCP services to prevent data exfiltration and unauthorized access.
- `Access Levels`: Use access levels to define who can access resources based on contextual attributes like IP address or device security status.

9. **Google Cloud VPN**
- `Secure Site-to-Site Connections`: Establishes secure connections between on-premises networks and GCP VPCs using IPsec VPN tunnels.
- `High Availability VPN`: Provides high availability and automatic failover for your VPN connections.

10. **Cloud Interconnect**
- `Dedicated Network Connection`: Provides a dedicated, private connection between your on-premises network and GCP, bypassing the public internet. Offers greater bandwidth, lower latency, and more consistent network performance.

11. **Cloud IDS (Intrusion Detection System)**
- `Threat Detection`: Provides network-based threat detection to help identify and respond to potential threats targeting your VPC networks.

12. **Google Cloud Firewall Insights**
- `Firewall Rule Analysis`: Provides insights into the effectiveness of your firewall rules, helping you optimize your firewall policies and improve security.

13. **Encryption**
- `Data Encryption in Transit`: Ensures that data transmitted between GCP services and external clients is encrypted using TLS/SSL.
Encryption at Rest: Uses Google-managed keys, customer-managed keys (CMEK), or customer-supplied encryption keys (CSEK) to encrypt data stored in GCP services.

14. **Cloud Monitoring and Logging**
- `Monitoring`: Provides detailed metrics and monitoring for your GCP resources and applications. Use Google Cloud's operations suite (formerly Stackdriver) to monitor and log network activities.
- `Logging`: Collects and analyzes logs from your applications and infrastructure to detect and respond to potential security incidents.

15. **Security Command Center**
- `Unified Security Management`: Provides a centralized view of your GCP security posture, offering actionable insights and recommendations to improve security.
