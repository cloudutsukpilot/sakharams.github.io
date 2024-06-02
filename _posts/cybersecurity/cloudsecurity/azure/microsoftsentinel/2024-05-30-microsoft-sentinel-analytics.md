---
layout: post
title: Microsoft Sentinel - Analytics
categories: [cloud, azure, sentinel]
tags: [Cloud, Azure, Sentinel]
---

## Introduction
- Analytics in Microsoft Sentinel refers to the use of advanced analytics rules and machine learning models to detect threats and anomalous activities across your monitored environment. 
- These analytics rules are designed to identify suspicious behaviors, patterns, and activities by analyzing the data collected from various sources. 

### Key components of Analytics in Microsoft Sentinel:

1. **Analytics Rules**
- `Scheduled Rules`: These rules run on a defined schedule and query the collected data to identify potential security threats based on predefined criteria. They generate alerts when specific conditions are met.
- `Custom Rules`: You can create your own custom rules tailored to your specific requirements and environment, allowing you to define unique detection logic.
- `Fusion Rules`: These are advanced correlation rules that use machine learning to analyze data across multiple data sources and identify complex multi-stage attacks.

2. **Machine Learning and Anomaly Detection**
- `Behavioral Analytics`: Uses machine learning models to learn the normal behavior of users and entities over time, and then identifies deviations from these patterns that could indicate potential threats.
- `Anomaly Detection`: Automatically detects anomalies in your data, such as unusual login attempts, abnormal data transfers, or unexpected changes in user behavior.

3. **Hunting Queries**
- `Proactive Hunting`: Allows security analysts to proactively search for threats and indicators of compromise (IoCs) in their environment using custom Kusto Query Language (KQL) queries.
- `Built-In Queries`: Sentinel provides a library of built-in hunting queries that can be used to identify specific types of threats or suspicious activities.

4. **Investigation and Response**
- `Incident Management`: Aggregates multiple related alerts into a single incident, making it easier to manage and investigate potential threats.
- `Automated Response`: Integration with playbooks (using Azure Logic Apps) to automate responses to detected threats, such as isolating a compromised device or blocking a malicious IP address.

5. **Threat Intelligence Integration**
- `Threat Intelligence`: Ingests threat intelligence data from various sources, including Microsoft Threat Intelligence and third-party providers, to enhance detection and correlation of threats.


### Common Rules used in Sentinel
1. **Suspicious Sign-In Activities**
- `Multiple Failed Sign-In Attempts`: Detects when multiple failed sign-in attempts occur within a short period, indicating potential brute-force attacks.
- `Sign-Ins from Unusual Locations`: Identifies sign-ins from locations that are unusual for a particular user, which might indicate a compromised account.

2. **Malware and Phishing Detection**
- `Malware Detected by Security Solutions`: Alerts when malware is detected by endpoint protection tools such as Microsoft Defender for Endpoint.
- `Phishing Email Detected`: Flags emails identified as phishing by security tools.

3. **Suspicious Azure Activity**
- `New Azure Resource Created by Unfamiliar User`: Detects when a new resource is created by a user who has not previously created resources, indicating potential misuse of credentials.
- `Unusual Administrative Activity`: Identifies unusual activities performed by administrative accounts, such as creating new admin users or modifying critical settings.

3. **Network Anomalies**
- `Unusual Outbound Traffic`: Monitors for unusual patterns or volumes of outbound traffic that could indicate data exfiltration.
- `Suspicious VPN Connections`: Detects connections to known malicious IP addresses or unusual VPN usage.

4. **File Integrity Monitoring**
- `Unauthorized File Changes`: Detects changes to critical files or configurations that should not normally be altered, indicating potential tampering.
- `Ransomware Activity`: Identifies patterns of file modifications that match known ransomware behaviors.

5. **Identity and Access Management**
- `Unusual Group Membership Changes`: Flags unusual changes to security group memberships, which could indicate privilege escalation.
- `Inactive Accounts Performing Actions`: Alerts when actions are performed by accounts that have been inactive for an extended period.

6. **Cloud Security**
- `Suspicious AWS or GCP Activities`: Monitors for suspicious activities in other cloud environments (e.g., AWS, GCP) integrated with Sentinel.
- `Unusual Azure Resource Access`: Detects access to Azure resources from unexpected sources or patterns.

7. **Data Exfiltration Detection**
- `Large Data Downloads`: Identifies large volumes of data being downloaded from sensitive locations.
- `Unusual Data Transfers`: Flags data transfers to unfamiliar or suspicious external destinations.

8. **Endpoint Security**
- `Privileged Process Execution`: Detects the execution of processes that require elevated privileges, which could indicate an attempt to gain unauthorized access.
- `Suspicious PowerShell Activity`: Monitors for suspicious PowerShell commands that are commonly used in attacks.

9. **Application Security**
- `Unauthorized API Access`: Identifies attempts to access APIs without proper authorization, indicating potential abuse or compromise.
- `Unusual Application Behavior`: Flags behaviors in applications that deviate from normal patterns, potentially indicating compromised applications.

