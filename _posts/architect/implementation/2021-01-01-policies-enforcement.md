---
layout: post
title: Governance & Compliance - Policy Enforcement
categories: [architect, cloud, network]
tags: [Cloud, Cloud Architect, Security Architect, Cloud Security]
---

## Introduction
- Policies are essential for maintaining governance and compliance in cloud environments, helping to enforce best practices and security standards.

### General
1. `Restrict Allowed Resource Types`: Restricts the types of resources that can be deployed to ensure compliance with organizational standards.
2. `Enforce Tagging`: Requires specific tags and values on resources for better management and organization.
3. `Restrict Deployment Locations`: Limits the geographical regions where resources can be deployed to comply with data residency requirements.
4. `Audit Deprecated Resource Usage`: Monitors and reports on the usage of deprecated resource types to ensure up-to-date infrastructure.
5. `Require Specific Resource Naming Conventions`: Enforces resource naming conventions to maintain consistency and manageability.

### Compute
1. `Enforce Use of Managed Disks for VMs`: Ensures all virtual machines use managed disks for better performance and reliability.
2. `Require HTTPS for Web Applications`: Ensures web applications and services only accept HTTPS traffic to secure data in transit.
3. `Prohibit Public IPs on VMs`: Ensures virtual machine instances do not have public IP addresses to reduce the attack surface.
4. `Restrict Public Access to Serverless Functions`: Ensures that serverless functions (e.g., AWS Lambda, Azure Functions, GCP Cloud Functions) are not publicly accessible.
5. `Disable Serial Port Access on VMs`: Prevents the use of serial ports for interactive access to virtual machines to enhance security.

### Monitoring
1. `Deploy Diagnostic Settings for VMs`: Automatically deploys diagnostic settings for virtual machines to centralize logging and monitoring.
2. `Monitor Resource Utilization`: Tracks and reports on resource utilization metrics (e.g., CPU, memory, disk) to optimize performance and cost.
3. `Enable Activity Logs for Resources`: Ensures that activity logs are enabled for resources to track changes and access events.
4. `Set Up Alert Rules for Critical Metrics`: Configures alert rules for critical metrics to notify administrators of potential issues in real-time.
5. `Ensure Log Retention Policies`: Enforces retention policies for logs to ensure compliance with regulatory requirements and organizational policies.


### Storage
1. `Enforce Secure Transfer for Storage`: Ensures that data transfer to storage services is secure and encrypted in transit.
2. `Prohibit Public Read Access on Storage Buckets`: Ensures that storage buckets (e.g., S3, Azure Blob, GCP Cloud Storage) do not allow public read access to protect data privacy.
3. `Enforce Encryption on Storage Data`: Ensures that all data stored in storage services is encrypted to protect data at rest.
4. `Monitor Storage Utilization`: Tracks and reports on storage utilization to manage costs and capacity effectively.
5. `Require Versioning for Critical Data`: Enforces versioning on critical data storage to protect against accidental deletions and data corruption.

### Databases
1. `Require Threat Detection on Databases`: Ensures that threat detection is enabled on databases to monitor and alert on suspicious activities.
2. `Enforce Database Encryption`: Ensures that database instances are encrypted to protect sensitive data.
3. `Require Automated Backups for Databases`: Ensures that automated backups are enabled for databases to support data recovery.
4. `Restrict Database Access to Specific Networks`: Ensures that database access is limited to specific networks or IP ranges to enhance security.
5. `Monitor Database Performance Metrics`: Tracks and reports on database performance metrics to optimize and maintain performance.

#### Backup
1. `Enforce VM Backup Configuration`: Ensures that virtual machines have backup configurations in place to support data recovery.
2. `Require Encrypted Snapshots`: Ensures that snapshots of virtual machines are encrypted to protect data.
3. `Monitor Backup Compliance`: Tracks and reports on backup compliance to ensure all critical resources are backed up.
4. `Enforce Retention Policies for Backups`: Ensures that backups are retained according to defined policies to meet regulatory requirements.
5. `Automate Backup Verification`: Periodically verifies backups to ensure they are complete and recoverable.

### IAM (Identity and Access Management)
1. `Require MFA for Root Accounts`: Ensures that multi-factor authentication is enabled for root accounts to enhance security.
2. `Enforce MFA for IAM Users`: Ensures that IAM users have multi-factor authentication enabled for secure access.
3. `Enforce Specific IAM Policies`: Ensures that specific IAM policies are applied to resources to control access.
4. `Monitor IAM Policy Changes`: Tracks and reports on changes to IAM policies to maintain security and compliance.
5. `Restrict IAM Role Assignments`: Limits the assignment of IAM roles to authorized users and services to control access.

### Networking
1. `Ensure Security Group Usage`: Ensures that security groups are attached to resources to control network traffic.
2. `Prohibit Open Ports`: Ensures that only necessary ports are open on network resources to minimize exposure.
3. `Enforce Network Segmentation`: Ensures that network segments are used to isolate and protect sensitive resources.
4. `Monitor Network Traffic`: Tracks and reports on network traffic to detect and respond to anomalies.
5. `Require Network Encryption`: Ensures that network traffic is encrypted to protect data in transit.

### Security
1. `Enforce OS Login for VMs`: Ensures that operating system login is used for virtual machines to enhance access security.
2. `Require Security Patches`: Ensures that security patches are applied to resources to protect against vulnerabilities.
3. `Monitor Security Compliance`: Tracks and reports on security compliance to ensure adherence to policies and standards.
4. `Restrict Access to Sensitive Resources`: Limits access to sensitive resources to authorized users and services only.
5. `Automate Security Incident Response`: Implements automated responses to security incidents to mitigate risks quickly.

### Kubernetes
1. Ensure K8 clusters use RBAC (Role-Based Access Control).
2. Restrict access to the Kubernetes dashboard.
3. Ensure network policies are in place to control traffic between pods.
4. Ensure K8 uses Azure AD/IAM for cluster authentication.
5. Enforce the use of managed identities.