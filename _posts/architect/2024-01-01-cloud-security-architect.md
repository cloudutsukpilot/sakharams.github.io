---
layout: post
title: Cloud Security Architect
categories: [cloud, security]
tags: [Cloud, Cloud Security, Architect]
---

Best Practices for Cloud Security:
 
Understand the Shared Responsibility Model	List Below
Secure the Perimeter	•	Virtual Network Segmentation based on workloads
•	Restrict traffic between these segments
•	Implement WAF - SQL Injection, Cross-site scripting
•	Implement Firewall - Multi-layer DDoS defense Strategy, IDS, IPS
Monitor for Misconfigurations	•	Enable Cloud Security Posture Management (CSPM)
•	Align with specific standards - CIS, OWASP
Use Identity & Access Management	•	Implement RBAC, SSO
•	Follow principle of least privilege
Enable Security Posture Visibility	•	Add tools to report breaches like data exfiltration, event threat detection, IAM account hijacks, crypto-mining, etc.
Implement Cloud Security Policies	•	Implementing organisation wide restrictions using policies to auto enforce compliance standards
Secure Your Containers	•	Create industry-standard security baselines 
•	Continuous monitoring with advance AI and ML 
Perform Vulnerability Assessment and Remediation	•	Continuously scan workloads for vulnerabilities
•	Reporting and Auto-remediation
Implement Zero Trust	•	Segmentation and allowing minimal communication between different services.
•	Any and all the activities should be monitored, logged and analysed for anomalies.
Train Your Employees	•	Implement a Cybersecurity Training Program
Use Log Management & Monitoring	•	Enable Logging capabilities to get full visibility
•	Turn on notifications for any unusual activity
Conduct Audits and Penetration Testing	•	To determine if the security measures in place are enough to protect the system
•	Regular Security Audits 
Encrypt Your Data	•	Enable data encryption to conceal it from unauthorized users.
Meet Compliance Requirements	•	Meet compliance in every steps of process
Execute Your Incident Response Plan	•	Design an incident response plan to remediate the situation, avoid operational disruptions and recover any lost data
 
 
Shared Responsibility Model:
 
Element	SaaS	PaaS	IaaS
Application Security	CSP	User	User
Platform Security	CSP	CSP	User
Infrastructure	CSP	User	CSP
Endpoint Security	User	User	User
Data Security / Data Protection	User	User	User
Network Security	CSP	CSP	User
User Security	User	User	User
Containers and Cloud Workloads	User	User	User
APIs and Middleware	CSP	User	User
Code	User	User	User
Virtualization	CSP	CSP	User
 
 
Major Security Threats in Cloud Infrastructure:
 
Account Comprise	An account can be compromised as the result of a brute-force attack, credential stuffing, password spraying, or simply poor password practices of the account’s owner.
Social Engineering	A cyber attacker may trick an employee into providing access to critical systems and data using many social engineering techniques, ex. Phishing.
Shadow IT	Employees in your organization installing and using cloud applications and services not authorized by the cybersecurity team.
Malicious Insider Activity	Malicious insiders in your organization can cause data loss, disrupt systems, install malware, and steal intellectual property.
Unintentional Insider Activity	Employees may be unwittingly responsible for data breaches, account compromise, and vulnerability exploits in organizations with low cybersecurity awareness.
