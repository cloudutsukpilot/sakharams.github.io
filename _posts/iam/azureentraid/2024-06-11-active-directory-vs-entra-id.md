---
layout: post
title: Active Directory vs Entra ID
categories: [iam, entraid]
tags: [Identity and Access Management(IAM), Entra ID]
---

## Comparison

### **Users**

1. **Provisioning: users**
    - **Active Directory**: Organizations create internal users manually or use an in-house or automated provisioning system.
    - **Microsoft Entra ID**: Adds support to automatically create users from cloud HR systems and provision identities in SCIM-enabled SaaS apps.
2. **Provisioning: external identities**
    - **Active Directory**: Organizations create external users manually as regular users in a dedicated external forest.
    - **Microsoft Entra ID**: Provides a special class of identity to support external identities, managed via Microsoft Entra B2B.
3.  **Entitlement management and groups**
    - **Active Directory**: Administrators make users members of groups; app/resource owners give groups access to apps/resources.
    - **Microsoft Entra ID**: Administrators can assign membership to groups manually or dynamically and use Entitlement management for access control.
4. **Admin management**
    - **Active Directory**: Uses domains, organizational units, and groups to delegate administrative rights.
    - **Microsoft Entra ID**: Provides built-in roles with role-based access control (RBAC) and supports Privileged Identity Management (PIM).
5. **Credential management**
    - **Active Directory**: Uses passwords, certificates, and smart card authentication; managed by password policies.
    - **Microsoft Entra ID**: Uses intelligent password protection, multifactor authentication, and passwordless technologies; offers self-service password reset.

### **Apps**

1. **Infrastructure apps**
    - **Active Directory**: Basis for many on-premises components like DNS, DHCP, etc.
    - **Microsoft Entra ID**: New control plane for accessing apps with Conditional Access controls.
2. **Traditional and legacy apps**
    - **Active Directory**: Uses LDAP, NTLM, Kerberos, etc.
    - **Microsoft Entra ID**: Provides access via Microsoft Entra application proxy.
3. **SaaS apps**
    - **Active Directory**: Requires federation systems like AD FS.
    - **Microsoft Entra ID**: Supports OAuth2, SAML, WS-* authentication for SaaS apps.
4. **Line of business (LOB) apps with modern authentication**
    - **Active Directory**: Uses AD FS.
    - **Microsoft Entra ID**: Configurable for modern authentication.
5.  **Mid-tier/Daemon services**
    - **Active Directory**: Uses service accounts or group Managed Service Accounts (gMSA).
    - **Microsoft Entra ID**: Provides managed identities for cloud workloads.

### **Devices**

1. **Mobile**
    - **Active Directory**: Doesn't natively support mobile devices without third-party solutions.
    - **Microsoft Entra ID**: Integrated with Microsoft Intune for mobile device management.
2. **Windows desktops**
    - **Active Directory**: Supports domain join and management via Group Policy, etc.
    - **Microsoft Entra ID**: Supports device join and management with Microsoft Intune.
3. **Windows servers**
    - **Active Directory**: Strong on-premises management capabilities.
    - **Microsoft Entra ID**: Managed with Microsoft Entra Domain Services and managed identities.
4.  **Linux/Unix workloads**
    - **Active Directory**: Doesn't natively support non-Windows without third-party solutions.
    - **Microsoft Entra ID**: Supports managed identities for cloud-based Linux/Unix VMs.

