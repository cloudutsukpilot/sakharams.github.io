---
layout: post
title: "Cloud Security Services: AWS vs Azure vs Google Cloud"
date: 2026-10-09 00:40:00 +0530
categories: [cloud]
tags: [Cloud, AWS, Azure, GCP, Security]
image: /assets/img/cloud/cloud-security-services.webp
description: "WAF, DDoS, key and secrets management, network firewalls, posture management and SIEM: what each security service does on AWS, Azure and Google Cloud."
---

Most cloud breaches aren't sophisticated. They're a storage bucket left public, an access key committed to GitHub,
a VM with RDP open to the internet, or an alert that fired and nobody read. The providers give you a big toolbox to
prevent exactly these failures, but the toolbox is split across a dozen services with names that don't line up
between clouds. This post sorts the security category into the jobs it does and compares how AWS, Azure and Google
Cloud cover each one.

<!-- more -->

## What the security category covers

Cloud security runs on the **shared responsibility model**. The provider secures the physical data centres,
hardware, hypervisor and the managed services themselves. You secure everything you configure: identities, network
exposure, data, keys, workloads and how you respond to incidents. The services in this category are the tools for
your half.

I find it easiest to group them by the job they do:

| Job | Question it answers |
|---|---|
| Edge protection (WAF, DDoS) | Can attackers knock over or exploit my public endpoints? |
| Key management | Who controls the keys that encrypt my data? |
| Secrets management | Where do passwords and API keys live, if not in code? |
| Network firewalls | What traffic can move between networks and to the internet? |
| Posture and threat detection | What's misconfigured, and is anyone exploiting it right now? |
| SIEM and SOC | How do we collect, correlate and respond to security events? |

Identity, which is the most important security control in the cloud, has its own
[identity and governance post](/posts/cloud/cloud-identity-governance-services/).

## Web application firewall and DDoS protection

Anything public-facing needs two layers of protection. **DDoS protection** absorbs volumetric attacks at the network
level. All three providers give you a baseline for free, and paid tiers add application-layer protection, attack
telemetry, expert support and cost protection for the scale-out during an attack. A **WAF** inspects HTTP requests
and blocks common exploits (SQL injection, XSS, known bad bots) and abusive patterns.

Put the WAF as close to the edge as possible: on the CDN or global load balancer rather than on each regional app.
Start in detection mode, tune out false positives against real traffic, then switch to prevention. Turning on
blocking mode on day one is a reliable way to block your own users.

{% include cloud-topic-tabs.html cat="security" topic="waf" %}

## Encryption key management

Every major cloud service encrypts data at rest by default with provider-managed keys. Key management services let
you use **customer-managed keys** instead, which gives you control over rotation, access policies and, importantly,
the ability to revoke access by disabling a key. Regulated industries often require this, and some require keys
held in hardware security modules (HSMs) or even outside the provider entirely.

Customer-managed keys aren't free in effort. If you delete or lose access to a key, the data it protects is gone.
Use soft-delete and purge protection, restrict who can manage keys, and alert on key disable or delete events.

{% include cloud-topic-tabs.html cat="security" topic="kms" %}

## Secrets management

Connection strings, API tokens, certificates and passwords don't belong in source code, container images or plain
environment variables in a pipeline. Secrets managers store them encrypted, control access with IAM, log every read,
and can rotate them automatically.

Better still is not having the secret at all. Managed identities (Azure), IAM roles (AWS) and service accounts with
workload identity (Google) let your code authenticate to cloud services without any stored credential. Use a secrets
manager for what's left: third-party API keys, database passwords for engines that don't support identity auth, and
TLS certificates.

{% include cloud-topic-tabs.html cat="security" topic="secrets" %}

There's an Azure deep dive in the [Azure Key Vault post](/posts/cloud/azure/security/azure-key-vault/).

## Managed network firewalls

Security groups and NSGs filter traffic per resource or subnet, and they're enough for many workloads. Larger
estates usually add a **central firewall** in a hub network to inspect traffic between spokes, to on-premises and to
the internet, with features such as FQDN filtering, intrusion prevention and TLS inspection.

Google takes a different approach here. Cloud NGFW enforces policy in the VPC fabric itself instead of routing
traffic through an appliance, which removes a whole class of routing headaches.

{% include cloud-topic-tabs.html cat="security" topic="firewall" %}

## Posture management and threat detection

This is the category that catches the public bucket, the open RDP port and the over-privileged role before someone
else does. **Cloud security posture management** (CSPM) continuously checks your configuration against benchmarks
such as CIS and your own policies. **Threat detection** watches logs and runtime signals for signs of compromise:
API calls from unusual locations, crypto-mining, credential exfiltration.

Turn these on early, across every account, subscription and project, and route findings to a place where someone
actually looks at them. The tools are good. The most common failure is a backlog of thousands of unread findings.

{% include cloud-topic-tabs.html cat="security" topic="posture" %}

> AWS now has two services with "Security Hub" in the name. The original was renamed **Security Hub CSPM**, and a
> new **Security Hub**, which correlates findings from GuardDuty, Inspector and CSPM, became generally available in
> December 2025. They use different finding formats (ASFF vs OCSF), so check which one a tutorial means.
{: .prompt-info }

## SIEM and security operations

A SIEM collects security logs from everywhere (cloud control planes, identity providers, endpoints, firewalls,
SaaS apps), correlates them into incidents, and drives investigation and automated response. Here the providers
diverge most. Microsoft and Google sell full SIEM/SOAR products. AWS provides a security data lake and leaves the SIEM
to OpenSearch or partners.

{% include cloud-topic-tabs.html cat="security" topic="siem" %}

## Comparing the providers

- **Microsoft** has the most integrated suite: Defender for Cloud plus Sentinel plus Entra ID, all covering
  multi-cloud. It's a strong choice for Microsoft-centric organisations.
- **AWS** has the most granular building blocks (GuardDuty, Inspector, Macie, Detective, Security Hub) and a huge
  partner ecosystem, but you assemble more of it yourself.
- **Google** stands out on edge protection (Cloud Armor on Google's front end), Google Security Operations' scale,
  and Mandiant threat intelligence.

## Common pitfalls

- **Enabling tools in one account only.** Attackers go for the forgotten sandbox. Enable posture and threat
  detection organisation-wide, with auto-enrol for new accounts.
- **Alert fatigue.** Thousands of low-severity findings bury the critical ones. Triage by severity and
  exposure, suppress what you've accepted, and assign owners.
- **Long-lived keys.** Access keys and service account keys leak. Prefer roles, managed identities and
  workload identity federation, and alert when new long-lived keys are created.
- **WAF in prevention mode without tuning.** Expect false positives on day one. Log first, tune, then block.
- **No break-glass plan.** Know how you'll get in when SSO is down or an attacker has locked accounts, and
  test it.

## Conclusion

Security tooling is only useful when it's switched on everywhere and someone acts on what it finds. A sensible
baseline on any cloud: edge WAF and DDoS protection for public apps, customer-managed keys where regulation demands
them, secrets in a vault (or better, no secrets at all), central network inspection for larger estates, and posture
management plus threat detection enabled across the whole organisation. Pick one this week (posture management is
usually the quickest win), turn it on everywhere, and fix the top ten findings. All the services side by side are in
the [Security comparison](/cloud/#security).

## References

- [AWS Security Hub GA announcement](https://aws.amazon.com/blogs/aws/aws-security-hub-now-generally-available-with-near-real-time-analytics-and-risk-prioritization/)
- [Amazon GuardDuty documentation](https://docs.aws.amazon.com/guardduty/)
- [AWS Key Management Service](https://docs.aws.amazon.com/kms/)
- [Microsoft Defender for Cloud documentation](https://learn.microsoft.com/azure/defender-for-cloud/)
- [Microsoft Sentinel documentation](https://learn.microsoft.com/azure/sentinel/)
- [Azure Key Vault overview](https://learn.microsoft.com/azure/key-vault/general/overview)
- [Google Cloud Armor](https://cloud.google.com/armor/docs)
- [Security Command Center](https://cloud.google.com/security-command-center/docs)
