---
layout: post
title: Azure Networking
categories: [cloud, azure, networking]
tags: [Cloud, Azure, Networking]
---

## Introduction


### Service Endpoint vs Private Endpoint vs Private Link

| Feature                   | Service Endpoint                    | Private Endpoint                      | Private Link                          | Private Link Service                |
|---------------------------|--------------------------------------|---------------------------------------|---------------------------------------|-------------------------------------|
| **Definition**            | Extends VNet to Azure services       | Private IP address within VNet        | Includes Private Endpoint; Secure access to services over private network | Allows you to provide private endpoints for your service |
| **Connectivity**          | Direct connectivity from VNet        | Connects to specific Azure resources  | Access Azure services via Private Endpoint | Provides private access to your services from customers' VNets |
| **IP Address**            | Uses public IP of Azure service      | Uses private IP within VNet           | Uses Private Endpoint's private IP    | Uses private IPs provided by customers' VNets |
| **Security**              | Traffic stays on Azure backbone      | Traffic isolated from public internet | Traffic isolated from public internet | Traffic isolated from public internet |
| **Access Control**        | VNet and subnet-based                | Granular, based on private endpoint   | Granular, based on private endpoint   | Granular, based on private endpoint |
| **DNS Configuration**     | Not required                         | Requires private DNS configuration    | Requires private DNS configuration    | Requires private DNS configuration  |
| **Supported Services**    | Many PaaS services like Storage, SQL | Specific to individual PaaS services  | All services supported by Private Endpoints | Custom services hosted on your infrastructure |
| **Use Case**              | General access to Azure services     | Isolated access to specific resources | Secure, isolated access to Azure services | Provide secure, private access to your own services |
| **Suitable for**          | Enhancing security of service access | Sensitive data and secure connections | Compliance, data isolation, and secure access | Offering private access to your applications/services |
| **Example Services**      | Azure Storage, Azure SQL Database    | Azure SQL Database, Azure Storage     | Azure Storage, Azure SQL Database, Azure Cosmos DB | Custom services provided by ISVs or in-house apps |
