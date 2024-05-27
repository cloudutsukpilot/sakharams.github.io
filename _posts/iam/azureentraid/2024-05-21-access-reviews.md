---
layout: post
title: Entra ID - Access Reviews
categories: [iam, entraid]
tags: [Identity and Access Management(IAM), Entra ID]
---

## Access Reviews
- Access reviews in Microsoft Entra ID (formerly Azure Active Directory) are a crucial governance feature that helps organizations ensure that only the right people have access to critical resources. 
- Access reviews are used to review and manage user access to applications and resources, ensuring compliance with organizational policies and regulatory requirements.

### Key Features of Access Reviews
1. `Regular Review Cycles`
- Administrators can set up periodic reviews to ensure that access rights are re-evaluated regularly. 
- This helps in maintaining up-to-date access control.

2. `Automated Recommendations`
- Entra ID can provide recommendations based on user activity, such as suggesting the removal of access for inactive users. 
- This automation helps streamline the review process.

3. `Multi-level Reviews`
- Access reviews can involve multiple reviewers, such as managers, application owners, or even the users themselves. 
- This ensures a thorough evaluation from different perspectives.

4. `Customizable Review Scope`
- Reviews can be targeted at specific groups, applications, or even individual users. 
- This flexibility allows for tailored reviews based on the sensitivity of the resource or user group.

5. `Integration with Governance Policies`
- Access reviews can be integrated with broader identity governance policies, including conditional access and identity protection, to enforce security policies dynamically based on review outcomes.

6. `Notifications and Reminders`
- Automated notifications and reminders can be sent to reviewers to ensure timely completion of reviews, helping to maintain compliance and security.

7. `Reporting and Audit Trails`
- Detailed reports and audit logs are available for tracking the outcomes of access reviews, providing transparency and accountability for compliance purposes.

### Types of Access Reviews
1. `User Access Reviews`
- Review access for users in specific groups or roles. 
- This is often used to ensure that only current employees or authorized personnel have access to certain resources.

2. `Application Access Reviews`
- Review access permissions for users who have access to specific applications. 
- This ensures that application access is restricted to authorized users only.

3. `Guest Access Reviews`
- Review access for guest users who are external to the organization. 
- This is important for managing access granted to partners, vendors, or temporary contractors.

### Steps to Create and Manage Access Reviews
1. `Plan the Review`
- Determine the scope, frequency, and reviewers for the access review. Decide which groups, roles, or applications need to be reviewed.

2. `Create the Review`
- In the Entra ID portal, navigate to the Access Reviews section and create a new review. Specify the review details, such as the name, description, start date, and recurrence.

3. `Select Reviewers`
- Choose who will perform the reviews. This can be users' managers, application owners, or selected administrators.

4. `Define Review Settings`
- Configure the review settings, such as whether to enable recommendations, send reminders, and allow self-review by users.

5. `Launch the Review`
- Start the review process. Reviewers will receive notifications to perform their reviews.

6. `Monitor Progress`
- Track the progress of the review through the Entra ID portal. Administrators can send reminders or extend the review period if needed.

7. `Review Completion`
- Once the review is complete, reviewers submit their decisions. Administrators can then apply the review results, such as removing access for users who no longer need it.

8. `Generate Reports`
- Access detailed reports and audit logs to document the review process and outcomes. These reports are useful for compliance audits and internal reviews.

### Benefits of Access Reviews
1. `Enhanced Security`
- Regular access reviews help identify and remove unnecessary or outdated access rights, reducing the risk of unauthorized access.

2. `Compliance and Governance`
- Access reviews help organizations meet regulatory requirements and internal governance policies by ensuring that access controls are regularly assessed and enforced.

3. `Operational Efficiency`
- Automated recommendations and notifications streamline the review process, saving time and reducing the administrative burden on IT and security teams.

4. `Improved Visibility`
- Access reviews provide visibility into who has access to what resources, enabling better management and oversight of access controls.

