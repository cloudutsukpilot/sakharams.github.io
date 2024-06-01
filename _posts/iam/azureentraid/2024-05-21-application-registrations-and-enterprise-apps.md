---
layout: post
title: Entra ID - Application Registration and Enterprise Apps
categories: [iam, entraid]
tags: [Identity and Access Management(IAM), Entra ID]
---

### Entra ID App Registration
- App Registration in Entra ID is used to configure and register applications that you develop and want to integrate with Entra ID. 
- This registration process is essential for applications to authenticate and access resources securely.
- Key Features:

1. `Client ID and Secret`: Upon registering an app, it gets a unique client ID and can generate a client secret or certificate for authentication.
2. `Redirect URIs`: Specifies where the application should redirect users after authentication.
3. `API Permissions`: Defines what APIs the application can access and the required permissions.
4. `Certificates & Secrets`: Manages secrets, certificates, and keys used for authentication.
5. `Branding and Properties`: Configures the app's branding and general properties, such as name, logo, and publisher.

### Entra ID Enterprise Apps
- Enterprise Apps in Entra ID are pre-integrated applications available in the Entra ID application gallery or custom applications that your organization uses. 
- These can include SaaS applications, on-premises applications, and Line of Business (LOB) applications.
- Key Features:

1. `Single Sign-On (SSO)`: Configures SSO for the applications to enable seamless access for users.
2. `User and Group Assignments`: Manages which users or groups have access to the application.
3. `Conditional Access`: Applies policies to control access based on various conditions (e.g., user location, device status).
4. `Monitoring and Reports`: Provides insights and reports on application usage and access.

#### Differences and Correlations
1. Purpose:
App Registration: Focuses on registering apps you develop to enable them to use Entra ID for authentication and authorization.
Enterprise Apps: Focuses on integrating existing applications (often third-party) into your organization's Entra ID for access management.
2. Configuration:
App Registration: Configures app-specific settings like API permissions, secrets, and redirect URIs.
Enterprise Apps: Configures settings related to user access, SSO, and conditional access policies for the entire organization.
3. User Access:
App Registration: Usually does not involve direct user assignment but focuses on enabling the app to access APIs and resources.
Enterprise Apps: Involves assigning users and groups to the application to manage who can access it.
4. Management:
App Registration: Managed primarily by developers or application owners who need to integrate their app with Entra ID.
Enterprise Apps: Managed by IT administrators who oversee user access, security policies, and application integrations within the organization.
5. SSO and Conditional Access:
App Registration: While it can involve SSO configuration, it is more about the initial integration and permissions setup.
Enterprise Apps: Heavily involves SSO configuration and conditional access policies to control how users access the application.


### Application Registrations - Delegated Permissions
- Delegated permissions are used by applications that need to access resources on behalf of a signed-in user. 
- When an application has delegated permissions, it means that the application is acting on behalf of the user, and the permissions granted to the application are a subset of what the user can do.
- Key Points:
1. `User Consent`: Delegated permissions often require user consent. When a user signs in, they may be prompted to grant the application permissions to access resources on their behalf.
2. `Access Scope`: The application can only access resources that the signed-in user has access to and within the permissions granted.
3. `Common Use Cases`: Web applications, mobile apps, and other client applications that need to perform actions on behalf of the user (e.g., reading the user's email or accessing the user's calendar).

### Application Registrations - Application Permissions
- Application permissions (also known as "app-only" permissions or "on behalf of user") are used by applications that need to access resources without any user interaction. 
- These permissions are typically granted to applications that run as background services or daemons.
- Key Points:
1. `Admin Consent`: Application permissions usually require admin consent since they allow the application to access resources at a broader scope.
2. `Access Scope`: The application can access resources at the organizational level, independent of any particular user. The permissions granted are not limited to what any single user can do.
3. `Common Use Cases`: Background services, daemons, and any application that needs to perform tasks across multiple users or system-wide operations (e.g., reading all users' emails in an organization, running reports on organizational data).


#### Comparison and Use Cases

1. Delegated Permissions:

    Scenario: A user logs into a web application that needs to access their email to display a list of recent messages.
    Flow: The user signs in -> The app requests delegated permissions -> The user consents -> The app accesses the user's email.
    Example Permissions: Mail.Read, Calendars.Read.

2. Application Permissions:

    Scenario: A background service needs to archive all emails in the organization for compliance purposes.
    Flow: An admin grants the application permissions -> The app uses a client credential flow to authenticate -> The app accesses emails across the organization without user interaction.
    Example Permissions: Mail.ReadBasic.All, Calendars.ReadWrite.


#### Roles related to App Registration/Enterprise Apps

1. Global Administrator: Has access to all administrative features in Azure AD, as well as services that use Azure AD identities, such as Microsoft 365.
2. Cloud Application Administrator: Can manage all aspects of enterprise applications, including configuring SSO, assigning users, and managing app credentials.
3. Application Administrator: Can manage all applications, including configuring authentication and authorization settings.
4. Application Developer: Can register and manage their own applications and configure their own credentials.
5. Directory Readers: Can read basic directory information. Often used to grant read-only access to directory data.
6. User Administrator: Can manage all aspects of users and groups, including resetting passwords and managing licenses.
7. Reports Reader: Can read usage reports and sign-in logs.
8. Privileged Role Administrator: Manages role assignments in Azure AD, including roles related to enterprise applications.
9. Security Reader: Can view security-related features, such as reports and alerts, but cannot make changes.
10. Conditional Access Administrator: Can manage conditional access policies.


### Application Object vs Service Principal vs Managed Identity

1. `Application Object`: 
- Defines the application's identity and access needs globally in Azure AD.
- Assigned to non-Azure Resources 

2. `Managed Identity`: 
- Automatically managed identity for Azure resources, eliminating the need to manage credentials.
- Assigned to Azure Resources

3. `Service Principal`: 
- An instance of an Application Object in a tenant, used to grant the application access to resources.
- Both Application Object and Managed Identity indirectly create a SPN which is used to assign permissions.