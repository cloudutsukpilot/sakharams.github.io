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
