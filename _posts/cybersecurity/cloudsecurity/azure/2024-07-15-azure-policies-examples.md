---
layout: post
title: Azure Policies - Examples
categories: [cybersecurity, cloudsecurity]
tags: [CyberSecurity, Cloud Security, Examples]
---

## Introduction
- The Azure Security Benchmark (ASB) provides a set of guidelines for securing Azure services.

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
   