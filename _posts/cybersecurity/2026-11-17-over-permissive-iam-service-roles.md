---
layout: post
title: Over-Permissive IAM Service Roles
date: 2026-11-17 09:49:33 +0530
categories:
- cybersecurity
tags:
- Security
- AWS
- IAM
- CloudSecurity
- DevOps
description: Learn how over-permissive IAM roles create security risks by granting
  excessive permissions. This incident war room walks through diagnosing the blast
  radius...
image: /assets/img/cybersecurity/over-permissive-iam-service-roles.webp
---
<!-- Written by shorts-studio from the short "Fixing Over-Permissive IAM Roles" on 2026-11-17, following the create-blog skill; review before merging. -->

> Watch the short: [Fixing Over-Permissive IAM Roles](https://youtube.com/shorts/2C9QjNa3D9s)
{: .prompt-tip }

The Lambda function executed successfully. The logs show a clean exit. But if you look closer at the IAM role attached to that function, you’ll see a policy that grants `s3:*` on `*`.

<!-- more -->

It’s a wildcard. It’s convenient. And it’s a ticking time bomb.

When a Lambda function is vulnerable to deserialization, command injection, or even just leaks its environment variables, an attacker doesn’t need to break into your server. They just need to steal the temporary credentials the function assumes. And if those credentials have broad permissions, the attacker has the keys to the kingdom.

This isn’t a hypothetical edge case. It’s the most common mistake I see in cloud security reviews: **over-permissive IAM service roles**.

In this post, we’ll break down why `s3:*` is dangerous, how to trim permissions using least-privilege principles, and how to enforce boundaries at the account level so that even if one function is compromised, the blast radius is contained.

## The Danger of Wildcards

IAM (Identity and Access Management) is the backbone of cloud security. In AWS, every resource (like a Lambda function) assumes an IAM role to interact with other services. The permissions attached to that role define what the function can do.

When developers attach a broad managed policy like `AmazonS3FullAccess` or write a custom policy with `Action: "s3:*"`, they are saying: *"This function can do anything to any S3 bucket."*

This is dangerous for three reasons:

1.  **Blast Radius:** If an attacker compromises the Lambda function, they inherit these permissions. They can read sensitive data, delete buckets, or exfiltrate information.
2.  **Misleading Errors:** Developers often start with broad permissions to avoid "Access Denied" errors during development. They might use `s3:GetObject` and get a 403, so they switch to `s3:*` to make it work. This masks the real issue: the function needs specific permissions, not all of them.
3.  **Lack of Visibility:** Broad permissions make it hard to audit. If a function only needs to read from one bucket, why does it have write access to all buckets?

## The Cost of Least Privilege

So, why do we keep doing it? Why not just write precise policies from day one?

Because least privilege is hard.

If a function needs to access an S3 object, and that object doesn’t exist, a strict `s3:GetObject` policy might return a misleading error or fail silently. Developers often resort to wildcards to avoid debugging these edge cases. It’s a trade-off: convenience vs. security.

But the cost of convenience is high. One compromised function can expose your entire account.

## How to Trim Permissions

The solution is to replace broad managed policies with least-privilege custom policies. Here’s how to do it.

### 1. Use IAM Access Analyzer

IAM Access Analyzer is a tool that helps you identify resources in your AWS account that are shared with an external entity. It also helps you generate least-privilege policies based on actual usage.

You can run Access Analyzer to scan your CloudTrail logs and generate a policy that grants only the permissions your functions actually used. This is a great starting point, but it’s not perfect.

> **Note:** Service Last Accessed Data tracks authentication, not authorization. This means denied attempts still update the timestamp. Always cross-reference with CloudTrail before cutting permissions.

### 2. Write Custom Policies

Once you have a draft policy from Access Analyzer, refine it. Remove any permissions that aren’t strictly necessary. For example, if a function only reads from a bucket, don’t grant `s3:PutObject`.

Here’s an example of a least-privilege policy for a Lambda function that reads from a specific S3 bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::my-specific-bucket/*"
    }
  ]
}
```

This policy is much safer than `s3:*`. If the function is compromised, the attacker can only read from `my-specific-bucket`.

### 3. Test with Policy Simulator

Before deploying the new policy, test it with the IAM Policy Simulator. This tool lets you simulate the effect of a policy on a specific action. Make sure to test edge cases, like missing objects or unauthorized actions.

> **Pro Tip:** Keep your policies lean. IAM has a policy size limit of 6,144 characters. If your policy is too large, you might be granting more permissions than you need.

## Enforcing Boundaries with SCPs

Even with least-privilege policies, mistakes happen. What if a developer accidentally attaches a broad policy? What if a new function is created with overly permissive permissions?

This is where Service Control Policies (SCPs) come in.

SCPs are a feature of AWS Organizations that let you set guardrails for your entire account. They act as a ceiling for what any IAM entity (including the root user) can do.

For example, you can create an SCP that denies `s3:*` for all users and roles, except for specific roles that need it. This ensures that even if a developer attaches a broad policy, the SCP will block it.

### How SCPs Work

SCPs are evaluated in a stack:

1.  **Permissions Boundary:** The maximum permissions an IAM entity can have.
2.  **IAM Policy:** The permissions attached to the IAM entity.
3.  **Resource Policy:** The permissions attached to the resource (e.g., S3 bucket policy).
4.  **SCP:** The maximum permissions allowed for the account.

An explicit deny in any layer rejects the action, even if the role’s own policy allows it. This means SCPs are a powerful tool for containing the blast radius.

## The Interview Angle

This topic is a favorite for cloud security interviews. Here’s how it’s typically asked:

**Question:** *"A Lambda function was compromised, and the attacker used its credentials to access S3. The function’s role had `s3:*` permissions. How would you prevent this?"*

**Strong Answer:** *"First, I’d replace the broad `s3:*` policy with a least-privilege custom policy that only grants the specific actions the function needs, such as `s3:GetObject` on a specific bucket. I’d use IAM Access Analyzer to generate a draft policy based on CloudTrail logs, then refine it. Finally, I’d enforce boundaries at the account level using Service Control Policies (SCPs) to prevent any role from having overly broad permissions, even if a developer accidentally attaches a broad policy."*

## Conclusion

Over-permissive IAM service roles are a common but critical security risk. By replacing broad managed policies with least-privilege custom policies, enforcing boundaries with Service Control Policies, and using IAM Access Analyzer for validation, you can significantly reduce the blast radius of a compromised function.

Remember: temporary credentials are not a silver bullet. If the role has broad permissions, the attacker has broad access.

Start trimming those wildcards today. Your future self (and your security team) will thank you.
