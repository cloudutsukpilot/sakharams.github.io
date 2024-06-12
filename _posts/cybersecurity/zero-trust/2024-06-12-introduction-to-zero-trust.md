---
layout: post
title: Introduction to Zero Trust
categories: [cybersecurity]
tags: [CyberSecurity]
---

## Introdution
- Zero Trust is an end-to-end security strategy that monitors and controls the six main pillars of security: identity, endpoints, applications, network, infrastructure, and data.

![Zero Trust](/assets/img/cybersecurity/zero-trust/zero-trust.png)

- In practice, the "trust no one and verify everything" rule suggests that every request, device, or user must not be trusted and should be treated as a potential threat until verified by strong authentication methods, before allowing access to the network. 
- This also means that users and devices are only allowed access to the specific applications or data that they need.

### Key Principles of Zero Trust:
1. `Verify explicitly`: 
- Zero Trust requires strict identity verification for every user and device attempting to access resources. 
- With Zero Trust, the identity verification of users and devices is a continuous process, often at multiple levels. 
- This ensures the constant monitoring and validating of who can access what.

2. `Use least privilege access`: 
- The principle of least privilege access ensures that user access is minimized with Just-In-Time (JIT) and Just-Enough-Access (JEA). 
- This means only granting access to systems and applications to authorized users for specific tasks for a minimum time.

3. `Assume breach`: 
- This principle assumes attackers are already in your network and are looking to move laterally and get to get more information. 
- It embodies a deny-all approach and uses real-time monitoring to assess every request against known behaviors to limit and control access. 
- Assume breach is the mindset of creating the necessary segregation of access to contain the damage to a small area, and in doing so, minimizing the impact to your business.


### Zero Trust Components

1. `Identities`
- An identity in the Zero Trust approach is defined as users, services, and the credentials used by applications, and Internet of Things (IoT) devices. 
- In the Zero Trust approach, identities control and administer access to critical data and resources. 
- This means that when an identity attempts to access a resource, organizations must verify it through strong authentication methods, ensure access is compliant and typical for that identity, and enforce least privilege access principles.

2. `Endpoints`
- An endpoint is any device that connects to your network whether in the cloud, on-premises, or remotely. 
- They include devices issued by the organization, IoT devices, smartphones, BYODs, and partner and guest devices. 
- In the Zero Trust approach, the security policies are enforced uniformly across all endpoints. This is because when an identity is granted access to a resource, data can stream across different endpoints. 
- If the endpoints aren't secure, this can create a huge risk.

3. `Applications`
- Applications are productivity tools through which users access their data. 
- Knowing how these apps and their application programming interfaces work is essential to understanding, managing, and controlling the flow of data. 
- All apps used across your digital estate should be given tightly controlled in-app permissions and be monitored for abnormal behavior.

4. `Networks`
- Networks represent the means to access our data. 
- Using network access controls and monitoring user and device behavior in real time can provide insights and visibility into threats and help cybercriminals to move laterally across your network. 
- Network segmentation, using threat detection and prevention tools, and encrypting network traffic will reduce the likelihood of an attack and mitigate the fallout from a breach.

5. `Infrastructure`
- Your infrastructure covers every aspect of the digital domain, from on-premises servers to cloud-based virtual machines. 
- The main focus and consideration for infrastructure is to manage the configuration and keep software updated. 
- A robust configuration management approach will ensure that all deployed devices meet the minimum security and policy requirements.

6. `Data`
- Understanding your data and then applying the correct level of access control is essential if you want to protect it. 
- By limiting access, and by implementing strong data usage policies, and using real-time monitoring, you can restrict or block sharing of sensitive data and files.
