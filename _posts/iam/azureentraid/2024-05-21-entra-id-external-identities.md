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