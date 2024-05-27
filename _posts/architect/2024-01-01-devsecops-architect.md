---
layout: post
title: DevSecOps Architect
categories: [architect, devsecops]
tags: [DevOps, DevSecOps, Architect]
---


## Different Stages in DevSecOps and corresponding Tools:

1. `IDE Plugins`
- IDE extensions that can work like spellcheck and help to avoid basic mistakes at the earliest stage of coding.
- Tools: DevSkim, JFrog Eclipse, and Snyk

2. `Pre-Commit Hooks`
- Tools from this category prevent you from committing sensitive information like credentials into your code management platform. 
- Tools: git-hound, git-secrets and repo-supervisor

3. `Secrets Management Tools`
- Allow you to control which service has access to what password specifically. 	
- Tools: Amazon Web Services(AWS), Microsoft, and Google

4. `Static Application Security Testing (SAST)`
- SAST is about checking source-code (when the app is not running).
- Unfortunately, they take longer to run and often result in a lot of false positives, and can’t be applied to all coding languages.
- Best practice is to do incremental code tests during the weekdays and scan the whole code during the weekend.
- Tools: Checkmarx, ECG, DerScanner

5. `Source Composition Analysis (SCA)`
- SCA tools look at libraries that you use in your project and flag the ones with known vulnerabilities.
- Tools: GitHub, BlackDuck and Synx

6. `Dynamic Application Security Testing (DAST)`
- DAST is testing running applications.
- It provides less false positives than SAST but is similarly time-consuming.
- Tools: Rapid1, Contrast Security, Acunetix, SonarCube

7. `Interactive Application Security Testing (IAST)`
- It combines SAST and DAST elements by placing an agent inside the application and performing real-time analysis anywhere in the development process.
- As a result, the test covers both the source code and all the other external elements like libraries and APIs
- However, this kind of testing can have an adverse impact on the performance of the app.
- Tools: Contrast Security, Synopsis, VeraCode

8. `Secure infrastructure as code`
- Used to scan Docker images that you download from public repositories.
- Tools: Cliar, Dockscan, Anchore, tfsec, kube-sec

9. `Compliance as code`
- It will turn your compliance rules and policy requirements into automated tests.
- Tools: KitchenCI, ServerSPEC, CHEF INSPEC

10. `Runtime application self-protection (RASP)`
- It allows applications to run continuous security checks and react to attacks in real-time by getting rid of the attacker (e.g. closing his session) and alerting your team about the attack.
- Similarly to IAST, it can hurt app performance.
- Tools: Signal Sciences, Trend Micro, Imperva 

11. `Web Application Firewall (WAF)`
- It lets you define specific network rules for a web application and filter, monitor, and block HTTP traffic to and from a web service when it corresponds to known patterns of attacks like, e.g. SQL injection.
- Tools: Azure WAF, AWS WAF, Google Cloud Platform(GCP), WAF, Cloudflare, Imperva and Wallarm

12. `Monitoring tools`
- DevSecOps takes it to the next level and covers not only things like downtime, but also security threats.
- Tools: Datadog, PerfOps, Nagios

13. `Chaos engineering`
- Tools from this category allow you to test your app under different scenarios and patch your holes before problems emerge.
- Tools: Gremlin, ChaosToolkit

14. `Vulnerability management`
- These tools help you identify the holes in your security systems. 
- They classify weaknesses by the potential impact of malicious attacks taking advantage of them so that you can focus on fixing the most dangerous ones.
- Some of the tools might come with addons automatically fixing found bugs.
- Tools: Hacker, Archery, Qualys
