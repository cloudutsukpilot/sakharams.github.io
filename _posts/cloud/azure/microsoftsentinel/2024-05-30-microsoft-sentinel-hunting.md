---
layout: post
title: Microsoft Sentinel - Hunting
categories: [azure]
tags: [Cloud, Azure]
---

## Introduction
- Microsoft Sentinel Hunts, also known as "hunting queries," refer to proactive search activities conducted by security analysts to identify potential threats or indicators of compromise (IoCs) within their environment. 
- These hunts involve using custom queries to analyze data collected from various sources in Microsoft Sentinel to uncover suspicious activities that may not be detected by automated analytics rules. 

### Key Features of Microsoft Sentinel Hunts:
1. **Proactive Threat Detection**
- `Description`: Hunting is a proactive approach where security analysts actively search for signs of malicious activity rather than waiting for alerts to be generated.
- `Purpose`: Helps to identify advanced threats that may evade automated detection mechanisms.

2. **Custom Queries**
- `Description`: Hunts use custom queries written in Kusto Query Language (KQL) to search through the data ingested into Microsoft Sentinel.
- `Flexibility`: Allows analysts to tailor their searches to specific threat scenarios or indicators relevant to their environment.

3. **Built-In Hunting Queries**
- `Description`: Microsoft Sentinel provides a library of built-in hunting queries that cover common threat scenarios and patterns.
- `Use Cases`: Analysts can use these queries as-is or modify them to better suit their specific needs.

4. **Threat Intelligence Integration**
- `Description`: Hunting queries can incorporate threat intelligence feeds to search for known IoCs such as IP addresses, domains, or file hashes associated with malicious activities.
- `Enhancement`: Enriches hunting results with context from threat intelligence sources.

5. **Interactive Analysis**
- `Description`: Hunts are interactive and iterative, allowing analysts to refine their queries based on initial findings and delve deeper into suspicious activities.
- `Exploration`: Facilitates in-depth investigation and correlation of data across multiple sources.

### Common Use Cases for Hunts in Microsoft Sentinel:
1. **Suspicious Login Activities**
- `Example Query`: Identifying multiple failed login attempts followed by a successful login, which may indicate a brute-force attack.
- `Purpose`: Detect potential account compromises or unauthorized access attempts.

2. **Anomalous Network Traffic**
- `Example Query`: Searching for unusual outbound network connections to rare or suspicious domains.
- `Purpose`: Identify potential data exfiltration or command-and-control (C2) communication.

3. **Endpoint Behavior**
- `Example Query`: Detecting the execution of uncommon processes or commands on endpoints, which could indicate malware or unauthorized activities.
- `Purpose`: Uncover malicious actions taken on endpoints within the network.

4. **File Integrity Monitoring**
- `Example Query`: Monitoring changes to critical system files or configurations that should not frequently change.
- `Purpose`: Identify potential tampering or unauthorized modifications.

5. **User Behavior Analysis**
- `Example Query`: Looking for unusual patterns in user activity, such as access to sensitive data outside of normal working hours.
- `Purpose`: Detect insider threats or compromised user accounts.


### Benefits of Microsoft Sentinel Hunts
1. `Enhanced Visibility`: Provides deeper insights into potential threats that may not be captured by automated rules.
2. `Improved Threat Detection`: Helps to identify advanced and emerging threats through proactive exploration.
3. `Customization`: Allows security teams to tailor their threat hunting activities to their specific environment and threat landscape.
4. `Knowledge Sharing`: Built-in hunting queries and community contributions facilitate knowledge sharing and collaboration among security professionals.


### Steps to Conduct Hunts in Microsoft Sentinel:
1. `Define Objectives`: Determine the goals of the hunt, such as identifying specific threat types or investigating unusual activities.
2. `Create or Select Queries`: Write custom KQL queries or use built-in hunting queries to search for the defined objectives.
3. `Analyze Results`: Review and analyze the query results to identify suspicious activities or patterns.
4. `Refine Queries`: Adjust and refine queries based on initial findings to explore deeper or different aspects of the data.
5. `Document Findings`: Record the findings and any detected threats for further investigation and response.
6. `Take Action`: If threats are identified, initiate appropriate incident response actions, such as isolating affected systems or blocking malicious activities.