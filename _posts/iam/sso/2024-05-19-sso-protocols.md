---
layout: post
title: Single Sign On (SSO) Protocols
categories: [iam, sso]
tags: [IAM, SSO]
---

Several protocols are used for Single Sign-On (SSO) implementations. Here are some of the most common ones:

1. `Security Assertion Markup Language (SAML)`: 
- SAML is an XML-based standard used to exchange authentication and authorization data between parties. 
- In SSO, it allows a user to log in once and gain access to different applications without needing to log in again.

2. `OpenID Connect (OIDC)`: 
- OIDC is a simple identity layer on top of the OAuth 2.0 protocol. 
- It allows clients to verify the identity of the end-user based on the authentication performed by an authorization server.

3. `OAuth 2.0`: 
- While OAuth 2.0 is not an SSO protocol in itself, it is often used in conjunction with OIDC for SSO. 
- OAuth 2.0 is a protocol that allows a user to grant a third-party website or application access to their information, without sharing their credentials.

4. `Kerberos`: 
- Kerberos is a network authentication protocol designed to provide strong authentication for client/server applications. 
- It uses secret-key cryptography to authenticate users to network services, which means passwords are never actually sent over the network.

5. `JSON Web Token (JWT)`: 
- JWT is an open standard for securely transmitting information between parties as a JSON object. 
- This information can be verified and trusted because it is digitally signed. 
- JWTs can be used for authentication, and secure information exchange.

6. `WS-Federation`: 
- WS-Federation is a protocol that allows users to authenticate across different organizations or domains. 
- It's often used in enterprise scenarios and is part of the larger WS-Security framework.