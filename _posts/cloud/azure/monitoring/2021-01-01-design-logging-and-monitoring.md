---
layout: post
title: Azure - Design Logging and Monitoring
categories: [cloud, azure, architect, monitoring]
tags: [Cloud, Azure, Architect, Monitoring]
---

## Introduction
- To design a monitoring strategy that performs full-stack monitoring across all solutions that it uses. 

![Data Sources for Logging and Monitoring](/assets/img/cloud/azure/monitoring/azure-monitor.png)

### Things to Consider:
- `Things to consider when using Azure Monitor`:
    1. Consider data sources and data access. 
    2. Consider queries on Logs data. 
    3. Consider alerts based on Logs and Metrics data. 
    4. Consider Metrics Explorer to analyze metrics interactively. 

- `Things to consider when using Azure Monitor Logs workspaces`
    1. Consider your access control strategy
    2. Consider deployment model options: Centralized, Decentralized or Hybrid
    3. Consider access mode: Workspace-context or Resource-context
    4. Consider Azure RBAC and workspaces
    5. Consider scale and ingestion volume rate limit.

- `Things to consider when using Azure insights and Workbooks`
    1. Consider Azure Workbooks
    2. Consider Azure insights and data analysis.
    3. Consider combined data sources and visual reporting. 

- `Things to consider when using Azure Data Explorer`
    1. Consider native capabilities in Azure Monitor
    2. Consider features of Microsoft Sentinel
    3. Consider advantages of Azure Data Explorer

### Data Sources

![Data Sources](/assets/img/cloud/azure/monitoring/data-sources-for-logging-and-monitoring.png)

- `Application data` relates to your custom app code.
- `Operating system data` is from the Windows or Linux virtual machines that host your app.
- `Azure resource data` is from the operations of an Azure resource, such as a web app or a load balancer.
- `Azure subscription data` is about your subscription, including information about Azure health and availability.
- `Azure tenant data` describes your Azure organization-level services, such as Microsoft Entra ID.


### Types of Log Data:
1. `Metrics`
    - Numerical values collected at regular intervals
    - Lightweight, near real-time
    - Good for alerting and fast detection of issues
    - Usage:
        + Analyze, Alert, Chart, Automate, Retrieve, Export, Archive

2. `Logs`
    - Variety of data types
    - Each data type has its own structure
    - Can be queried(log queries)
    - Destinations for Log Data
        + View in Portal
        + Log Analytics
        + Storage
        + Event Hub


### End-to-End Monitoring Solution

![End-to-End Monitoring Solution](/assets/img/cloud/azure/analytics/end-to-end-monitoring-solution-using-data-explorer.png)