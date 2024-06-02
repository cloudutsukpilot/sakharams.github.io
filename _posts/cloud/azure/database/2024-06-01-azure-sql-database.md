---
layout: post
title: Azure - SQL Database
categories: [cloud, azure, database]
tags: [Cloud, Azure, Database]
---

## Introduction
- Azure SQL Database is a fully managed Platform as a Service (PaaS) database engine that handles most of the database management functions such as upgrading, patching, backups, and monitoring without user involvement. 
- It is based on the latest stable version of the Microsoft SQL Server database engine and provides a high-availability, scalable database service with built-in intelligence.

### Offerings from Microsoft for SQL
- Microsoft offers several SQL database services, each designed to cater to different use cases:

1. **Azure SQL Database**
- `Single Database`: A fully managed, isolated database optimized for workloads when a single database is needed.
- `Elastic Pool`: A collection of databases with a shared set of resources, providing cost-effective multi-tenant usage patterns.

2. **Azure SQL Managed Instance**
- A fully managed instance of SQL Server that provides near 100% compatibility with the latest SQL Server (Enterprise Edition) database engine. 
- It combines the best features of SQL Database and SQL Server.

3. **SQL Server on Azure Virtual Machines**
- SQL Server installed and managed on Azure VMs. 
- This service provides full control over the SQL Server instance and the underlying operating system. 
- Ideal for lift-and-shift migrations requiring OS-level access.


### Authentication Methods for Azure SQL
1. `SQL Authentication`:
- Uses a username and password to authenticate. Credentials are managed within the SQL database.

2. `Azure Active Directory (Azure AD) Authentication`:
- Allows users to connect using their Azure AD credentials. It supports multi-factor authentication (MFA) and centralized identity management.

3. `Managed Identity Authentication`:
- Uses managed identities for Azure resources (system-assigned or user-assigned) to access Azure SQL Database without managing credentials directly.

4. `Windows Authentication (only for SQL Server on VMs and on-premises)`:
- Uses Active Directory credentials for authentication. This is not available for Azure SQL Database or Managed Instances.

### Encryption Options for Azure SQL
1. `Transparent Data Encryption (TDE)`:
- Encrypts data at rest by encrypting the database files, including backups using AES-256 encryption.
- TDE is enabled by default for Azure SQL Database and Managed Instances. 

2. `Always Encrypted`:
- Protects sensitive data by encrypting it both at rest and in use. 
- Encryption keys are never revealed to the SQL Server engine, making it suitable for highly sensitive data. 
- It supports encryption of selected columns.

3. `Transport Layer Security (TLS)`:
- Encrypts data in transit between the client application and the Azure SQL Database. 
- Azure SQL Database requires a minimum of TLS 1.2 for all connections.

4. `Cell-Level Encryption`:
- Encrypts individual data cells or columns within the database. This is managed at the application level and requires custom code to implement.


