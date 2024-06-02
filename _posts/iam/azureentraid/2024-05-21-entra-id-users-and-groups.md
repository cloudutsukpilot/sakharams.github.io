---
layout: post
title: Entra ID - Users and Groups
categories: [iam, entraid]
tags: [Identity and Access Management(IAM), Entra ID]
---

## Introduction


### Groups
- Collections of user accounts, which simplify management and access control.
- Types of groups: 
    + `Security groups`: Manage member and device access
    + `Microsoft 365 groups`: Collaborative groups with shared resources like email, files
- Groups allow assigning permissions, applying policies, and managing resources collectively.

### Users:
- Individual accounts representing real persons or applications/services.
- Types: Internal users (employees), guest users (external collaborators).
- Can be added, removed, or managed within the Azure AD tenant.

### User(Member) v/s Guest User

1. `User (Member)`:
- These are typically employees in your organization.
- They are sourced from your organization's Azure AD directory.
- They have full access to Azure AD resources, depending on the permissions and roles assigned to them.
- They can be assigned any role in Azure AD, including administrative roles.
- They can create and own resources like Microsoft Teams, SharePoint sites, etc.

2. `Guest User`:
- These are typically external collaborators, such as partners or contractors.
- They are sourced from an external Azure AD directory or an external identity provider.
- Their access to Azure AD resources is limited and controlled by the inviting organization.
- They can't be assigned most administrative roles in Azure AD.
- They can't create or own resources like Microsoft Teams, SharePoint sites, etc., unless explicitly allowed by the inviting organization.


### Naming Policy for Groups:
- Azure Active Directory (Azure AD) provides a feature called Group Naming Policy which allows you to enforce a consistent naming strategy for groups created by users in your organization.
- This helps to maintain standardized naming conventions and makes it easier to manage and locate groups.
- The Group Naming Policy can include prefixes and/or suffixes.


### Roles
- Roles in Entra ID define a set of permissions for users, groups, or applications to manage resources. 
- They enable fine-grained access control and security.
- Types of Roles:

1. **Azure AD Roles**
- Scope: These roles are primarily for managing Azure Active Directory resources.
- Examples:
    + `Global Administrator`: Full access to manage Azure AD and Microsoft services.
    + `User Administrator`: Manage users and groups.
    + `Application Administrator`: Manage applications and their configurations.

2. **Azure Roles**
- Scope: These roles are used to manage Azure resources such as virtual machines, storage accounts, and databases.
- Examples:
    + `Owner`: Full access to all resources.
    + `Contributor`: Can create and manage all types of Azure resources but cannot grant access.
    + `Reader`: View all resources, but cannot make changes.

3. **Custom Roles**
- Can be created to fit specific needs, combining different permissions.
- Cannot be created from existing built-in roles, but can be created from existing custom roles.


### Office 365 Security Group
- An Office 365 security group is a collection of users, devices, and other security groups that are used for managing access to resources within the Office 365 environment. 
- These security groups help streamline access control and permissions management for various O365 services and applications.


###  Retention Period after deletion
| Entity              | Retention Days After Deletion | Notes                |
|-------------------  | ----------------------------- | -------------------- |
| User                | 30 days                       |  Can be recovered    |
| Security Group      | 0                             |  Cannot be recovered | 
| O365 Security Group | 30 days                       |  Can be recovered    |


### Types of Groups
1. **User Groups**
- `Security Groups`: These groups are used to manage access permissions to Azure resources and applications. They can contain users, service principals, or other security groups.
- `Office 365 Groups (Microsoft 365 Groups)`: These groups are used for collaboration within Microsoft 365 services such as Outlook, SharePoint, Teams, and OneDrive. They include a shared mailbox, calendar, document library, and other collaborative features.

2. **Application Groups**
- These groups are used to manage access for applications and services registered in Azure Active Directory (Azure AD). They can include users, groups, or devices that need access to the application.

3. **Service Principal Groups**
- A service principal is an identity used by an application or service to authenticate and access Azure resources. Service principal groups are used to manage access permissions for service principals.

4. **Device Groups**
- These groups are used to manage access and policies for devices registered in Azure AD. They can include devices such as Windows PCs, Macs, iOS devices, and Android devices.

5. **Role Groups**
- These groups are used to assign roles and permissions to users, groups, and service principals for managing access to Azure resources. RBAC groups are based on Azure built-in roles or custom roles.

6. **Dynamic Groups**
- These groups are automatically populated based on defined rules or queries, such as user attributes, group membership, or device properties. 
- Dynamic groups are useful for dynamically managing access based on changing conditions.
- A dynamic group can either be based on user or device membership. 
