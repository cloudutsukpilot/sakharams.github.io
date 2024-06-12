---
layout: post
title: Entra ID - Multi Factor Authentication (MFA)
categories: [iam, entraid]
tags: [Identity and Access Management(IAM), Entra ID]
---

## Introduction to MFA

- Multi-Factor Authentication (MFA) is a security measure that requires users to provide two or more verification factors to gain access to a resource such as an application, online account, or a VPN. 
- It is designed to provide an additional layer of security, reducing the likelihood of identity theft.
- Per User Multi-Factor Authentication (MFA) is a setting in Azure Active Directory where MFA is enabled on a per-user basis.


### MFA Methods

1. `Mobile App Notification`: Users receive a push notification on their mobile app (Microsoft Authenticator).
2. `Mobile App Verification Code`: Users use the Microsoft Authenticator app to generate a verification code.
3. `Phone Call`: Users receive a phone call to verify their identity.
4. `Text Message`: Users receive a text message with a verification code.
5. `OATH Hardware Token`: Users use a hardware token that generates OATH verification codes.


### Conditional Access Policies
- Conditional Access Policies in Multi-Factor Authentication (MFA) are a feature of Azure Active Directory. 
- They allow you to enforce certain conditions that must be met before a user is granted access to a resource.
- These conditions can be based on a variety of factors, including:

    1. `User or group membership`: You can target specific users or groups with a policy.
    2. `IP location`: You can require MFA for sign-ins from outside of your corporate network, for example.
    3. `Device platform`: You can target specific device platforms (like iOS, Android, Windows, etc.).
    4. `Application`: You can require MFA when accessing certain applications.
    5. `Risk level`: Using Azure AD Identity Protection, you can require MFA for sign-ins that are deemed risky.


#### **Conditions**
- `Users and Groups`:
    + Include/Exclude specific users, groups, or roles.
    + Examples: Specific user accounts, security groups, directory roles like Global Administrator.
- `Cloud Apps or Actions`:
    + Include/Exclude specific cloud applications or user actions.
    + Examples: Office 365, Salesforce, Azure Management.
- `Sign-In Risk`:
    + Include/Exclude based on sign-in risk levels (Low, Medium, High).
    + Sign-in risk is determined by Azure AD Identity Protection.
-  `Device Platforms`:
    + Include/Exclude specific device platforms (Windows, macOS, iOS, Android, etc.).
    + Useful for policies targeting specific types of devices.
- `Locations`:
    + Include/Exclude based on network locations (e.g., trusted IP addresses, country/region).
    + Examples: Block access from specific countries or allow access only from corporate network.
- `Client Apps`:
    + Include/Exclude based on the client app type (e.g., browser, mobile apps, desktop apps).
    + Examples: Block legacy authentication protocols, enforce policies only on mobile apps.
- `Device State`:
    + Include/Exclude based on device state (e.g., Compliant, Domain-joined).
    + Requires integration with Microsoft Endpoint Manager for device compliance information.

#### **Access Controls**
- `Grant Controls`:
    + Require one or more of the following controls to grant access:
        * Require multi-factor authentication (MFA).
        * Require device to be marked as compliant.
        * Require Hybrid Azure AD joined device.
        * Require approved client app.
        * Require app protection policy (preview).
- `Session Controls`:
    + Control user session behavior:
        * Sign-in frequency: Define how often users must reauthenticate.
        * Persistent browser session: Allow users to remain signed in on trusted devices.
        * Application Enforced Restrictions: Use app-specific controls to restrict user actions.
        * Cloud App Security (MCAS) session controls: Monitor and control sessions in real time.