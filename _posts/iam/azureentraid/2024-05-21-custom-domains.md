---
layout: post
title: Entra ID - Custom Domains 
categories: [iam, entraid]
tags: [Identity and Access Management(IAM), Entra ID]
---

### Azure AD Custom Domains
1. `Adding a Custom Domain`: 
- You can add your organization's domain to Azure AD, but you must verify that you own the domain by adding a DNS entry at the domain registrar.

2. `Primary Domain`: 
- You can set one of your custom domains as the primary domain. New users will be created with user names in the primary domain.

3. `Multiple Domains`: 
- You can add multiple custom domains to your Azure AD. This can be useful if your organization has multiple domains for different purposes or regions.

4. `Domain Verification`: 
- Azure AD uses a TXT or MX record that you add to your DNS zone to verify domain ownership.

5. `Federation`: 
- If you have an on-premises Active Directory, you can federate your custom domain with Azure AD to enable single sign-on (SSO).

6. `Domain Removal`: 
- You can remove a custom domain from Azure AD, but you must first delete all dependencies on that domain within Azure AD.



### Azure Entra ID Licenses:
1. `Azure AD Free`: 
- This is the default edition that comes with a subscription to Microsoft services like Office 365, Dynamics CRM, etc. 
- It includes basic features like user and group management, on-premises directory synchronization, and single sign-on across Azure, Office 365, and many popular SaaS apps.

2. `Azure AD Office 365 Apps`: 
- This edition comes with a subscription to Office 365 Apps and includes features like self-service password change for cloud users, Azure AD Join for Windows 10 devices, and more.

3. `Azure AD Premium P1`: 
- This edition includes all the features of Azure AD Free and Office 365 Apps, plus additional features like self-service password reset for cloud users, group-based access management, conditional access based on group and location, and more.

4. `Azure AD Premium P2`: 
- This edition includes all the features of Azure AD Premium P1, plus additional features like Azure AD Identity Protection to detect potential vulnerabilities and risky accounts, Azure AD Privileged Identity Management to manage, control, and monitor access to important resources, and more.


### Naming Policy for Groups:
- Azure Active Directory (Azure AD) provides a feature called Group Naming Policy which allows you to enforce a consistent naming strategy for groups created by users in your organization.
- This helps to maintain standardized naming conventions and makes it easier to manage and locate groups.
- The Group Naming Policy can include prefixes and/or suffixes.

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
