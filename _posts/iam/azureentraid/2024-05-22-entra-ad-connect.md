---
layout: post
title: Entra ID - Entra AD Connect
categories: [iam, entraid]
tags: [Identity and Access Management(IAM), Entra ID]
---

## Introduction
- Azure AD Connect is a Microsoft service designed to synchronize on-premises directories, such as Active Directory, with Azure Active Directory (Azure AD). 
- This synchronization allows organizations to provide a unified identity for users across their on-premises and cloud environments, ensuring consistent identity and access management.

![Entra AD Connect](/assets/img/iam/azureentraid/microsoft-entra-connect.png)

### Key features and components of Azure AD Connect:

1. `Directory Synchronization`:
- Syncs user accounts, groups, and other directory objects between on-premises Active Directory and Azure AD. 
- This ensures that user information is consistent across both environments.

2. `Single Sign-On (SSO)`: 
- Enables users to sign in once and access both on-premises and cloud-based applications without needing to authenticate again. 
- This improves the user experience and enhances security.

3. `Password Synchronization`: 
- Syncs password hashes from on-premises Active Directory to Azure AD, allowing users to use the same password for both environments. 
- This feature ensures a seamless user experience.

4. `Pass-Through Authentication`: 
- Allows users to authenticate directly against on-premises Active Directory without storing passwords in the cloud. 
- This provides an additional layer of security.

5. `Hybrid Identity`: 
- Supports scenarios where some applications and services remain on-premises while others are in the cloud. 
- Azure AD Connect helps manage identities across these hybrid environments.

6. `Custom Synchronization Rules`: 
- Allows administrators to create custom synchronization rules to meet specific organizational needs, providing flexibility in how data is synchronized.

7. `Health Monitoring`: 
- Azure AD Connect Health provides monitoring and insights into the health of the synchronization service, helping administrators identify and resolve issues quickly.

### Types of Synchronization:

1. `Password Hash Synchronization (PHS)`:
- Description: Synchronizes the password hashes from on-premises Active Directory to Azure AD.
- Use Case: Allows users to use the same password for both on-premises and cloud resources, providing a seamless sign-in experience.

2. `Pass-Through Authentication (PTA):`
- Description: Passes user authentication requests from Azure AD to on-premises Active Directory in real-time, without storing passwords in the cloud.
- Use Case: Provides a secure way to authenticate users directly against on-premises Active Directory, ensuring passwords are not stored in the cloud.

3. `Federation with Active Directory Federation Services (AD FS)`:
- Description: Uses AD FS to provide single sign-on (SSO) and federation capabilities, enabling users to authenticate using their on-premises credentials.
- Use Case: Ideal for organizations that require complex authentication scenarios or need to use third-party identity providers.

4. `Device Writeback`:
- Description: Synchronizes device objects from Azure AD back to on-premises Active Directory.
- Use Case: Allows devices registered in Azure AD to be recognized by on-premises Active Directory, enabling scenarios such as Conditional Access.

5. `Group Writeback`:
- Description: Synchronizes Office 365 groups from Azure AD back to on-premises Active Directory.
- Use Case: Ensures that group memberships are consistent across both environments, allowing on-premises applications to use Office 365 groups.

6. `User Writeback`:
- Description: Synchronizes user objects from Azure AD back to on-premises Active Directory.
- Use Case: Useful in hybrid scenarios where user data needs to be consistent across both environments.

7. `Azure AD App and Attribute Filtering`:
- Description: Filters which users, groups, and attributes are synchronized from on-premises Active Directory to Azure AD.
- Use Case: Helps reduce the synchronization scope, ensuring that only relevant data is synchronized.

8. `Password Writeback`:
- Description: Allows users to change or reset their passwords in Azure AD and have those changes written back to on-premises Active Directory.
- Use Case: Enables self-service password reset functionality for users, improving the user experience and reducing helpdesk workload.

### Azure AD Connect Components 

| Component | Description | 
| --------- | ----------- |
| Azure AD Connect sync component | This is installed on the on-premise environment |
| Azure AD Connect sync service | This service runs in Azure AD |

### Microsoft Entra Cloud Sync 
- Microsoft Entra Cloud Sync is a lightweight, cloud-based solution for synchronizing on-premises directories (such as Active Directory) with Microsoft Entra ID (formerly Azure AD). 
- It is designed to provide seamless and automatic synchronization of user identities, groups, and other directory objects to the cloud.
- Key Features:
1. `Lightweight Agent`: Uses a lightweight agent installed on-premises to handle synchronization tasks.
2. `Automatic Updates`: The agent is updated automatically by Microsoft, reducing administrative overhead.
3. `Scalability`: Supports multiple agents for high availability and scalability.
4. `Filtered Synchronization`: Allows for filtering which objects and attributes to synchronize.
5. `Password Hash Synchronization`: Supports synchronizing password hashes, enabling users to use the same password for both on-premises and cloud services.
6. `Simplified Management`: Managed through the Microsoft Entra ID portal, providing a simplified and centralized management interface.

- Use Cases:
1. Organizations with lightweight or decentralized IT environments.
2. Scenarios where minimal infrastructure changes are desired.
3. Companies needing to synchronize specific subsets of directory objects.