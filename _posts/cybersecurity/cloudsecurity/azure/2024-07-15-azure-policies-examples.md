---
layout: post
title: Azure Policies - Examples
categories: [cybersecurity, cloudsecurity]
tags: [CyberSecurity, Cloud Security, Examples]
---

## Introduction
- Azure Policies are broadly categorised into below:
   + Asset Management
   + Backup and Recovery
   + Data Proetection
   + DevOps Security
   + Endpoint Security
   + Governance and Strategy
   + Identiy Management
   + Incident Response
   + Logging and Threat Detection
   + Network Security 
   + Postsure and Vulnerability Management
   + Privileged Access

### Category Specific Examples
- Below are few examples based on the categories:
1. **Asset Management**
- `Audit VMs that do not use managed disks`: Ensures all virtual machines are using managed disks.
- `Allowed Resource Types`: Restricts the types of resources that can be deployed in the environment.

2. **Backup and Recovery**
- `Require Azure Backup on VMs`: Ensures that virtual machines have backup configured.
- `Audit missing Azure Backup Recovery Services vaults`: Identifies VMs that do not have an associated Recovery Services vault for backup.

3. **Data Protection**
- `Require secure transfer for storage accounts`: Enforces secure transfer to ensure data is encrypted in transit.
- `Audit unencrypted SQL databases`: Identifies SQL databases that do not have encryption enabled.

4. **DevOps Security**
- `Ensure that Azure DevOps projects have required policies`: Ensures that DevOps projects comply with specified security policies.
- `Audit usage of deprecated Azure DevOps APIs`: Identifies usage of deprecated APIs within Azure DevOps projects.

5. **Endpoint Security**
- `Enforce Windows Defender antivirus protection on VMs`: Ensures that Windows Defender is enabled and running on all VMs.
- `Require disk encryption on endpoint devices`: Ensures that all endpoint devices have disk encryption enabled.

6. **Governance and Strategy**
- `Enforce tag and its value on resources`: Requires a specific tag and value to be applied to resources for better management.
- `Allowed locations`: Restricts the geographical locations where resources can be deployed.

7. **Identity Management**
- `Require multi-factor authentication (MFA) for all users`: Ensures that all users have MFA enabled.
- `Audit usage of legacy authentication protocols`: Identifies accounts using outdated and less secure authentication methods.

8. **Incident Response**
- `Require diagnostic settings on resources`: Ensures that diagnostic logs are enabled and configured for resources.
- `Ensure security alerts are enabled`: Ensures that security alerts are configured and active for critical resources.

9. **Logging and Threat Detection**
- `Deploy diagnostic settings for VMs to Log Analytics`: Automatically deploys diagnostic settings to VMs for centralized logging.
- `Enable advanced threat protection on storage accounts`: Ensures that advanced threat protection is enabled on all storage accounts.

10. **Network Security**
- `Restrict public IP addresses on NICs`: Ensures that network interfaces do not have public IP addresses.
- `Require NSG on subnets`: Ensures that network security groups are applied to all subnets for traffic filtering.

11. **Posture and Vulnerability Management**
- `Audit vulnerabilities in VMs`: Identifies VMs with known vulnerabilities based on installed software and configurations.
- `Require VM extensions for security monitoring`: Ensures that security monitoring extensions are installed on VMs.

12. **Privileged Access**
- `Require Just-In-Time (JIT) access for VM management`: Ensures that VMs are configured for JIT access to limit the time window for administrative access.
- `Audit privileged role assignments`: Regularly reviews and audits assignments of privileged roles to ensure appropriate access levels.

### Examples based on Resources Types

1. **Compute**

   - `Virtual Machines (VMs)`
      + Enforce the use of managed disks.
      + Ensure that the OS disk is encrypted.
      + Monitor and audit the installation of endpoint protection solutions on VMs.
      + Ensure that the latest OS patches are applied.
      + Restrict RDP and SSH access to VMs using just-in-time (JIT) VM access.

   - `Azure Kubernetes Service (AKS)`
      + Ensure AKS clusters use RBAC (Role-Based Access Control).
      + Restrict access to the Kubernetes dashboard.
      + Ensure network policies are in place to control traffic between pods.
      + Ensure AKS uses Azure AD for cluster authentication.
      + Enforce the use of managed identities.

2. **Storage**

   - `Azure Storage Accounts`
      + Ensure that storage account access keys are periodically regenerated.
      + Require secure transfer to storage accounts.
      + Monitor for the use of shared access signatures (SAS).
      + Ensure that the storage account public access is disallowed.
      + Enforce encryption of data at rest.

   - `Azure SQL Database`
      + Ensure SQL databases have auditing enabled.
      + Enforce the use of TLS for SQL database connections.
      + Ensure SQL databases use transparent data encryption (TDE).
      + Enforce vulnerability assessments and periodic scans.
      + Ensure firewall rules are configured to restrict access.

3. **Networking**

   - `Virtual Networks (VNet)`
      + Ensure VNets are configured with NSGs (Network Security Groups) for inbound and outbound traffic filtering.
      + Enforce the use of private IP addresses for Azure services.
      + Ensure VPN gateways are used to securely connect on-premises networks to Azure VNets.
      + Enforce the use of service endpoints for Azure services.

   - `Application Gateway`
      + Ensure WAF (Web Application Firewall) is enabled on the Application Gateway.
      + Monitor for the use of SSL/TLS certificates on Application Gateways.
      + Enforce the use of private IP addresses for the Application Gateway.

4. **Identity and Access Management (IAM)**

   - `Azure Active Directory (AAD)`
      + Enforce MFA (Multi-Factor Authentication) for all users.
      + Ensure privileged identities are protected with Azure AD Privileged Identity Management (PIM).
      + Monitor and audit administrative activity.
      + Enforce conditional access policies.
      + Ensure user risk policy and sign-in risk policy are configured.

5. **Security and Monitoring**

   - `Azure Security Center (ASC)`
      + Ensure ASC Standard pricing tier is enabled.
      + Enforce security configurations on virtual machines.
      + Ensure security alerts are enabled and monitored.
      + Enforce compliance with regulatory standards.

   - `Azure Monitor`
      + Ensure log analytics workspaces are configured for data collection.
      + Monitor for anomalies and suspicious activity.
      + Enforce diagnostic settings on all Azure resources.
      + Ensure alert rules are configured for critical operations.

6. **Management and Governance**

   - `Azure Policy`
      + Ensure policies are in place to enforce tagging of resources.
      + Enforce policies to ensure resources comply with naming conventions.
      + Monitor and enforce policies for resource configurations.

   - `Azure Blueprints`
      + Use blueprints to deploy compliant environments.
      + Enforce policy assignments through blueprints.
      + Ensure RBAC roles are assigned through blueprints for consistency.

7. **Application Services**

   - `App Services`
      + Ensure HTTPS only is enabled for web apps.
      + Enforce authentication on app services.
      + Monitor and enforce the use of the latest runtime stack for web apps.
      + Ensure web app diagnostic logs are enabled.

   - `Azure Functions`
      + Ensure function apps require HTTPS.
      + Monitor for the use of managed identities in function apps.
      + Enforce application insights for monitoring function apps.
   