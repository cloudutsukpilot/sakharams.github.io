---
layout: post
title: Entra ID - Administrative Units
categories: [iam, entraid]
tags: [Identity and Access Management(IAM), Entra ID]
---

## Administrative Units

- Administrative Units (AUs) in Azure Active Directory (Azure AD) are a way to delegate administrative permissions to a subset of users.
-  They provide a level of scope that is smaller than an entire directory but can be larger than a single application.
- Here are some key points about Administrative Units:

1. `Delegation of Control`: 
- AUs allow you to delegate administrative control to a subset of your directory. 
- For example, you could create an AU for a specific department in your organization and delegate administrative control of that AU to the department's IT staff.

2. `Scope`: 
- AUs can contain users and groups, and you can assign roles to users or groups at the AU scope. 
- This means that a user with a role assigned at the AU scope can only manage the users and groups within that AU.

3. `Role Assignment`: 
- You can assign roles to users or groups at the AU scope. 
- This means that a user with a role assigned at the AU scope can only manage the users and groups within that AU.

4. `Use Cases`: 
- AUs are useful in scenarios where you need to delegate administrative control to a subset of your directory. 
- For example, in a large organization with multiple departments, you could create an AU for each department and delegate administrative control to the IT staff in each department.