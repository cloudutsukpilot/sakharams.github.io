---
layout: post
title: DevOps Architect
categories: [devsecops]
tags: [DevOps, DevSecOps, Architect]
---


DevSecOps:

Stage	Description	Tools
IDE Plugins	•	IDE extensions that can work like spellcheck and help to avoid basic mistakes at the earliest stage of coding . 	DevSkim, JFrog Eclipse, and Snyk
Pre-Commit Hooks	•	Tools from this category prevent you from committing sensitive information like credentials into your code management platform. 	 git-hound, git-secrets and repo-supervisor
Secrets Management Tools	•	Allow you to control which service has access to what password specifically. 	AWS, Microsoft, and Google
Static Application Security Testing (SAST) 	•	SAST is about checking source-code (when the app is not running). 
•	Unfortunately, they take longer to run and often result in a lot of false positives, and can’t be applied to all coding languages. 
•	Best practice is to do incremental code tests during the weekdays and scan the whole code during the weekend.	Checkmarx, ECG, DerScanner
Source Composition Analysis (SCA) 	•	SCA tools look at libraries that you use in your project and flag the ones with known vulnerabilities. 	GitHub, BlackDuck and Synx
Dynamic Application Security Testing (DAST)	•	DAST is testing running applications. 
•	It provides less false positives than SAST but is similarly time-consuming.	Rapid1, Contrast Security, Acunetix, SonarCube
Interactive Application Security Testing (IAST) 	•	It combines SAST and DAST elements by placing an agent inside the application and performing real-time analysis anywhere in the development process. 
•	As a result, the test covers both the source code and all the other external elements like libraries and APIs 
•	However, this kind of testing can have an adverse impact on the performance of the app.	Contrast Security, Synopsis, VeraCode
Secure infrastructure as code 	•	Used to scan Docker images that you download from public repositories.	Cliar, Dockscan, Anchore, tfsec, kube-sec
Compliance as code	•	It will turn your compliance rules and policy requirements into automated tests. 	KitchenCI, ServerSPEC, CHEF INSPEC
Runtime application self-protection (RASP)	•	It allows applications to run continuous security checks and react to attacks in real-time by getting rid of the attacker (e.g. closing his session) and alerting your team about the attack. 
•	Similarly to IAST, it can hurt app performance. 	Signal Sciences, Trend Micro, Imperva 
Web Application Firewall (WAF) 	•	It lets you define specific network rules for a web application and filter, monitor, and block HTTP traffic to and from a web service when it corresponds to known patterns of attacks like, e.g. SQL injection. 	Azure WAF, AWS WAF, GCP WAF, Cloudflare, Imperva and Wallarm
Monitoring tools 	•	DevSecOps takes it to the next level and covers not only things like downtime, but also security threats.	Datadog, PerfOps, Nagios
Chaos engineering	•	Tools from this category allow you to test your app under different scenarios and patch your holes before problems emerge. 	 Gremlin, ChaosToolkit
Vulnerability management 	•	 These tools help you identify the holes in your security systems. They classify weaknesses by the potential impact of malicious attacks taking advantage of them so that you can focus on fixing the most dangerous ones. 
•	Some of the tools might come with addons automatically fixing found bugs. 	Hacker, Archery, Qualys
