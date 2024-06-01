---
layout: post
title: Introduction to DevSecOps
categories: [devsecops]
tags: [DevSecOps]
---

## Introduction
- DevSecOps is a software development approach that integrates security practices into the DevOps process. 
- It aims to ensure that security is not an afterthought but an integral part of the entire software development lifecycle.
- In traditional software development, security is often addressed at the end of the development process, leading to vulnerabilities and potential breaches.
- DevSecOps, on the other hand, emphasizes the collaboration and cooperation between development, operations, and security teams from the very beginning.
- By incorporating security practices early on, DevSecOps enables organizations to build secure and resilient systems. 
- It involves automating security testing, continuous monitoring, and implementing security controls throughout the development pipeline.
- One of the key principles of DevSecOps is shifting security left, which means addressing security concerns as early as possible in the development process. 
- This includes conducting security code reviews, performing static and dynamic analysis, and integrating security testing into the CI/CD pipeline.
- Another important aspect of DevSecOps is the use of infrastructure as code (IaC) and configuration management tools. 
- These tools allow for the definition and enforcement of security policies, making it easier to maintain a secure infrastructure.



### DevSecOps Tools


| Stages                                          | Tools                                                                |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| IDE Plugins                                     | DevSkim, JFrog Eclipse, Snyk                                         |
| Pre-Commit Hooks                                | git-hound, git-secrets, repo-supervisor                              |
| Secrets Management Tools                        | Amazon Web Services(AWS), Microsoft, Google                          |
| Static Application Security Testing (SAST)      | Checkmarx, ECG, DerScanner                                           |
| Source Composition Analysis (SCA)               | GitHub, BlackDuck, Synx                                              |
| Dynamic Application Security Testing (DAST)     | Rapid1, Contrast Security, Acunetix, SonarCube                       | 
| Interactive Application Security Testing (IAST) | Contrast Security, Synopsis, VeraCode                                |
| Secure infrastructure as code                   | Cliar, Dockscan, Anchore, tfsec, kube-sec                            |
| Compliance as code                              | KitchenCI, ServerSPEC, CHEF INSPEC                                   |
| Runtime application self-protection (RASP)      | Signal Sciences, Trend Micro, Imperva                                |
| Web Application Firewall (WAF)                  | Azure WAF, AWS WAF, GCP WAF, Cloudflare, Imperva and Wallarm         |
| Vulnerability management                        | Hacker, Archery, Qualys, Microsoft Defender                          |
