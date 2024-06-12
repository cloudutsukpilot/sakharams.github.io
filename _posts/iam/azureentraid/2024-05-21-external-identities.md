---
layout: post
title: Entra ID - External Identities
categories: [iam, entraid]
tags: [Identity and Access Management(IAM), Entra ID]
---

## Introduction
- External identities refer to the identities of users who are not part of your organization but need to access your resources.
- This includes partners, suppliers, customers, or any other external stakeholders. 
- External identities enable organizations to provide secure and controlled access to their applications and resources for external users. 

### Key Components of External Identities
1. **Guest Users (B2B Collaboration)**
- `Guest Access`: External users can be invited as guest users to your directory. They can access resources such as documents, sites, and applications.
- `Invitation Process`: Guests receive an invitation email and can use their existing credentials (e.g., their organizational or personal accounts) to access your resources.
- `Collaboration`: Allows collaboration with external partners, suppliers, and other stakeholders within your internal resources like SharePoint, Teams, and other apps.


![B2B Collaboration](/assets/img/iam/azureentraid/business-to-business-collaboration.png)


2. **External Users (B2C Collaboration)**
- `Customer Identity and Access Management (CIAM)`: External identities for B2C (Business to Customer) scenarios enable organizations to provide secure access to their applications and services for customers.
- `Identity Providers`: Supports various identity providers like social accounts (Google, Facebook), enterprise accounts (Microsoft, LinkedIn), and local accounts (email signup).

### Features of External Identities
1. **Seamless Integration**
- `Single Sign-On (SSO)`: External users can use their existing credentials to sign in, providing a seamless access experience.
- `Multiple Identity Providers`: Supports integration with multiple identity providers, allowing users to sign in with credentials they are familiar with.

2. **Security and Compliance**
- `Conditional Access`: Apply conditional access policies to ensure external users meet your security requirements, such as requiring multi-factor authentication (MFA).
- `Terms of Use`: Require external users to accept terms of use before accessing resources.
- `Access Reviews`: Regularly review and manage the access of external users to ensure only necessary users retain access.

3. **Scalability**
- `Large Scale Collaboration`: Supports large-scale collaboration scenarios, making it easy to manage access for a large number of external users.
- `Custom Branding`: Customize sign-in and sign-up experiences to match your organization’s branding.

4. **Lifecycle Management**
- `Automated User Provisioning`: Automate the provisioning and deprovisioning of external users to streamline user management.
- `Access Management`: Manage the lifecycle of external user access, including invitation, onboarding, periodic reviews, and offboarding.

5. **Customization and Flexibility**
- `Custom Policies`: Create custom policies to meet specific business requirements for external collaboration.
- `Integration with External Apps`: Integrate with external applications and services, allowing external users to access a wide range of resources.

### Use Cases for External Identities
1. `Partner Collaboration`: Allow partners to access specific resources like documents, projects, and collaboration tools.
2. `Supplier Access`: Provide suppliers with access to necessary data and applications for supply chain management.
3. `Customer Portals`: Enable customers to sign up and access your services using their preferred identity providers.
4. `External Contractors`: Allow contractors temporary access to internal applications and data during their engagement period.


### Microsoft Entra ID
- Microsoft Entra External ID refers to specific features and functionalities within the Microsoft Entra ID platform designed to manage external identities. 
- It is a part of the broader External Identities concept and includes capabilities that facilitate secure external user collaboration and access management.

![External ID](/assets/img/iam/azureentraid/external-id.png)

- Organizations and developers can use External ID in an external tenant as their CIAM solution when publishing their apps to consumers and business customers.
- You can create a separate Microsoft Entra tenant in an external configuration, which allows you to manage your apps and user accounts separately from your workforce. 
- Within this tenant, you can easily configure custom-branded sign-up experiences and user management features:
- External ID B2B collaboration allows your workforce to collaborate with external business partners. 
- You can invite anyone to sign in to your Microsoft Entra organization using their own credentials so they can access the apps and resources you want to share with them. 
- Use B2B collaboration when you need to let business guests access your Office 365 apps, software-as-a-service (SaaS) apps, and line-of-business applications. 


### "Workforce" and "External" Tenants
- A `workforce tenant` configuration is a standard Microsoft Entra tenant that contains your employees, internal business apps, and other organizational resources. In a workforce tenant, your internal users can collaborate with external business partners and guests using B2B collaboration.
- An `external tenant` configuration is used exclusively for apps you want to publish to consumers or business customers. This distinct tenant follows the standard Microsoft Entra tenant model, but is configured for consumer scenarios. It contains your app registrations and a directory of consumer or customer accounts.


### Related Technologies
1. `B2B direct connect`
- B2B direct connect lets you create two-way trust relationships with other Microsoft Entra organizations to enable the Teams Connect shared channels feature.
- When two organizations mutually enable B2B direct connect, users authenticate in their home organization and receive a token from the resource organization for access. 


2. `Azure Active Directory B2C`
- Azure Active Directory B2C (Azure AD B2C) is Microsoft's legacy solution for customer identity and access management. 
- Azure AD B2C includes a separate consumer-based directory that you manage in the Azure portal through the Azure AD B2C service. 


3. `Multitenant Applications`
- A multitenant organization is an organization that has more than one instance of Microsoft Entra ID. 
- Multitenant organizations use a one-way synchronization service in Microsoft Entra ID, called cross-tenant synchronization. 
- Cross-tenant synchronization enables seamless collaboration for a multitenant organization. 