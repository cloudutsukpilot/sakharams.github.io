---
layout: post
title: Microsoft Azure
categories: [cloud, azure]
tags: [Cloud, Azure]
---

## Introduction
- Microsoft Azure is a cloud computing platform and service provided by Microsoft. 
- It offers a wide range of cloud services that enable organizations to build, deploy, and manage applications and services through Microsoft-managed data centers.

![Azure Services CheatSheet](/assets/img/cloud/azure/azure-services-cheatsheet.gif)

### Summary of Services

| Category         | Serverless Services                             | Non-Serverless Services                           |
|------------------|-------------------------------------------------|----------------------------------------------------|
| Compute          | Azure Functions                                 | Azure Virtual Machines                             |
|                  | Azure Logic Apps                                | Azure Virtual Machine Scale Sets                   |
|                  | Azure Event Grid                                | Azure Kubernetes Service (AKS)                     |
|                  |                                                 | Azure Container Instances (ACI)                    |
| Storage          | Azure Blob Storage                              |                                                     |
|                  | Azure Queue Storage                             |                                                     |
|                  | Azure Table Storage                             |                                                     |
| Database         | Azure Cosmos DB                                 | Azure SQL Database                                 |
|                  |                                                 | Azure Database for MySQL                           |
|                  |                                                 | Azure Database for PostgreSQL                      |
|                  |                                                 | Azure SQL Managed Instance                         |
| App Services     | Azure App Service (Web Apps, API Apps, etc.)    |                                                     |
|                  | Azure Logic Apps                                |                                                     |
|                  |                                                 | Azure App Service Environment                      |
| Networking       | Azure CDN                                       | Azure Virtual Network (VNet)                       |
|                  |                                                 | Azure ExpressRoute                                 |
|                  |                                                 | Azure Load Balancer                                |
| Identity         | Azure Active Directory (AAD)                     |                                                     |
|                  |                                                 | Azure Active Directory B2C                         |
| Analytics        | Azure Stream Analytics                          | Azure HDInsight                                   |
|                  | Azure Data Lake Analytics                        | Azure Databricks                                   |
|                  |                                                 | Azure Synapse Analytics <br> (formerly SQL Data Warehouse)|
| Security         | Azure Key Vault                                 | Azure Security Center                              |
|                  |                                                 | Azure Firewall                                     |
|                  |                                                 | Azure DDoS Protection                              |
| Monitoring       | Azure Monitor                                   | Azure Application Insights                         |
|                  | Azure Log Analytics                             |                                                     |


### Categorization:

1. `Compute`:
- Azure offers a variety of compute services for running applications and workloads, including Azure Functions for event-driven serverless computing, Azure Virtual Machines for full control over virtualized resources, and Azure Kubernetes Service (AKS) for containerized applications.

2. `Storage`:
- Azure provides scalable and durable storage options like Azure Blob Storage, Azure Queue Storage, and Azure Table Storage for storing and managing data in the cloud, along with Azure Files and Azure Disk Storage for file sharing and virtual machine disks.

3. `Database`:
- Azure offers a range of database services, including Azure Cosmos DB for globally distributed NoSQL databases, Azure SQL Database for relational databases, and Azure Database for MySQL and Azure Database for PostgreSQL for open-source database management.

4. `App Services`:
- Azure App Service enables the deployment and management of web applications, APIs, and mobile backends, while Azure Logic Apps provides workflow automation and integration capabilities.

5. `Networking`:
- Azure Networking encompasses services such as Azure Virtual Network (VNet) for creating isolated networks, Azure ExpressRoute for dedicated private connections, and Azure Load Balancer for distributing traffic across resources.

6. `Identity`:
- Azure Identity services, including Azure Active Directory (AAD) and Azure Active Directory B2C, offer identity and access management solutions for securing applications and resources.

7. `Analytics`:
- Azure Analytics services like Azure Stream Analytics, Azure Data Lake Analytics, and Azure Databricks enable real-time data processing, big data analytics, and advanced data warehousing solutions.

8. `Security`:
- Azure Security services such as Azure Key Vault, Azure Security Center, Azure Firewall, and Azure DDoS Protection provide secure storage, threat protection, network security, and defense against distributed denial-of-service attacks.

9. `Monitoring`:
- Azure Monitoring services like Azure Monitor and Azure Log Analytics offer comprehensive monitoring, logging, and insights into the performance, health, and security of Azure resources and applications.

### Benefits of Azure

1. `Scalability` - Azure allows you to scale your applications and services based on demand. You can easily increase or decrease resources to meet your workload requirements.
2. `Reliability` - Azure offers high availability and fault tolerance, ensuring that your applications and services are always up and running.
3. `Security - Azure provides robust security features, including identity and access management, encryption, and threat detection. It helps you protect your data and comply with industry regulations.
4. `Cost-Effectiveness` - Azure offers flexible pricing options, allowing you to pay only for the resources you use. It helps you optimize costs and reduce infrastructure expenses.


### Azure Service Region Dependency

| Region Dependent             | Region Agnostic               |
|------------------------------|------------------------------ |
| Azure Virtual Machines       | Azure DevTest Labs            |
| Azure App Service            | Azure DevOps	               | 
| Azure Blob Storage           | Azure Functions Premium Plan  |	
| Azure SQL Database           | Azure Information Protection  |
| Azure Cosmos DB              | Azure Load Testing	           |
| Azure Key Vault              | Azure Machine Learning	       |
| Azure Functions              | Azure Maps	                   |
| Azure Traffic Manager        | Azure Notification Hubs       |
| Azure Container Instances    | Azure Resource Manager        |
| Azure Virtual Network        | Azure Sentinel                |
| Azure Load Balancer          | Azure Speech                  |
| Azure CDN                    | Azure Text Analytics          |
| Azure DNS                    | Azure Time Series Insights    |
| Azure Kubernetes Service     | Azure Translator              |
| Azure Storage Account        | Azure Virtual WAN             |
| Azure Cognitive Services     | Azure VMware Solution         |
| Azure SQL Data Warehouse     | Azure VPN Gateway             | 
| Azure Redis Cache            | Azure Web Apps                |
| Azure Data Lake Storage      |                               |
| Azure Container Registry     |                               |
| Azure Event Hubs             |                               |
| Azure Service Bus            |                               |
| Azure Search                 |                               |
| Azure Logic Apps             |                               |
| Azure Stream Analytics       |                               |
| Azure DevOps Services        |                               |
| Azure Active Directory       |                               |
| Azure Monitor                |                               |
| Azure Data Factory           |                               |
| Azure Synapse Analytics      |                               |
| Azure IoT Hub                |                               |
| Azure Security Center        |                               |
| Azure API Management         |                               |
| Azure Backup                 |                               |
| Azure Site Recovery          |                               |
| Azure Databricks             |                               |


