---
layout: post
title: Microsoft Sentinel - Connectors
categories: [azure]
tags: [Cloud, Azure]
---

## Introduction
- Microsoft Sentinel offers a variety of connectors to integrate with different data sources, enabling comprehensive data collection and analysis across your enterprise environment. 
- These connectors help ingest security-related data from various services, applications, and devices into Microsoft Sentinel. 

### Types of Connectors
- Below are the different types of connectors in Microsoft Sentinel:

### 1. **Azure Services Connectors**
- `Azure Active Directory (Azure AD)`: Ingests logs related to user sign-ins, conditional access policies, and audit logs.
- `Azure Security Center (ASC)`: Imports security alerts and recommendations from Azure Security Center.
- `Azure Activity Logs`: Collects activity logs that provide insight into operations performed on resources in your Azure subscription.
- `Azure Key Vault`: Monitors access and operations on keys and secrets stored in Azure Key Vault.
- `Azure Firewall`: Collects logs from Azure Firewall, including application and network rule logs.
- `Azure DDoS Protection`: Ingests logs related to Distributed Denial of Service (DDoS) attacks and mitigation actions.

### 2. **Microsoft Services Connectors**
- `Microsoft 365 Defender`: Integrates data from Microsoft Defender for Endpoint, Microsoft Defender for Office 365, Microsoft Defender for Identity, and Microsoft Cloud App Security.
- `Microsoft Defender for Cloud`: Collects security alerts and recommendations from Microsoft Defender for Cloud.
- `Office 365`: Ingests activity logs from Exchange Online, SharePoint Online, and OneDrive for Business.
- `Microsoft Information Protection`: Collects information protection events and alerts.

### 3. **Third-Party Security Solutions**
- `Firewalls`: Connectors for third-party firewalls such as Palo Alto Networks, Check Point, Cisco ASA, Fortinet, etc.
- `Intrusion Detection and Prevention Systems (IDPS)`: Integrates data from systems like Snort, Suricata, and others.
- `Endpoint Protection`: Connectors for third-party endpoint protection solutions like Symantec, McAfee, and Trend Micro.
- `Threat Intelligence`: Ingests threat intelligence feeds from various third-party providers and platforms.

### 4. **SIEM and Security Appliances**
- `Syslog`: Collects data from any device or service that supports Syslog.
- `CEF (Common Event Format)`: Ingests data from devices and services that support the CEF standard, such as security appliances, network devices, and applications.
- `Windows Security Events`: Collects security events from Windows devices using the Windows Event Forwarding (WEF) mechanism.

### 5. **Custom Data Connectors**
- `Log Analytics Agents`: Collects data from various on-premises and cloud-based sources using the Log Analytics agent.
- `REST API`: Allows custom data ingestion from any source that can send data via REST API.
