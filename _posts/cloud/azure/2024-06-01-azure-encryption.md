---
layout: post
title: Azure - Encryption
categories: [azure]
tags: [Cloud, Azure]
---

## Introduction
- Azure provides several encryption options to protect data at rest, in transit, and during processing. 
- These encryption mechanisms ensure data confidentiality, integrity, and security across various Azure services and resources. 
- Below are the primary encryption options available in Azure:

### Encryption at Rest
1. **Azure Storage Service Encryption (SSE)**
- `Data Services`: Azure Blob Storage, Azure Queue Storage, Azure Table Storage, and Azure File Storage.
- `Encryption`: By default, data is encrypted using 256-bit AES encryption, which is FIPS 140-2 compliant.
- `Key Management`: Microsoft-managed keys by default; customers can use their own keys stored in Azure Key Vault (customer-managed keys).

2. **Azure Disk Encryption**
- `Data Services`: Azure Virtual Machine (VM) disks, including OS and data disks.
- `Encryption`: Uses BitLocker for Windows VMs and DM-Crypt for Linux VMs.
- `Key Management`: Integration with Azure Key Vault for managing encryption keys.

3. **SQL Database Encryption**
- `Transparent Data Encryption (TDE)`: Encrypts SQL databases, data warehouses, and Azure Synapse Analytics at rest.
- `Encryption`: Uses 256-bit AES encryption.
- `Key Management`: Managed by Azure (service-managed keys) or customer-managed keys stored in Azure Key Vault.

4. **Azure Cosmos DB Encryption**
- `Data Services`: Azure Cosmos DB.
- `Encryption`: Automatic encryption of data at rest using Microsoft-managed keys.
- `Key Management`: Option to use customer-managed keys in Azure Key Vault.

### Encryption in Transit
1. **Transport Layer Security (TLS)**
- `Data Services`: All Azure services that support data transmission over the network.
- `Encryption`: TLS 1.2 or later to encrypt data in transit between clients and Azure services.
- `Configuration`: Enabled by default for most Azure services, ensuring secure data transmission.

2. **VPN Encryption**
- `Data Services`: Site-to-Site VPN, Point-to-Site VPN, and ExpressRoute.
- `Encryption`: Uses IPsec for VPN connections and optional MACsec for ExpressRoute Direct.
- `Configuration`: Configured through Azure VPN Gateway or Network Security Group (NSG) settings.

### Client-Side Encryption
- `Data Services`: Azure Blob Storage, Azure Queue Storage, Azure Table Storage, and Azure File Storage.
- `Encryption`: Data is encrypted on the client side before being uploaded to Azure Storage.
- `Key Management`: Keys are managed by the client application, with options to store keys in Azure Key Vault.

### Double Encryption
- `Data Services`: Certain Azure services offer an additional layer of encryption to enhance security.
- `Encryption`: Uses two independent encryption algorithms and keys.
- `Key Management`: Can involve a combination of service-managed and customer-managed keys.

### Key Management
1. **Azure Key Vault**
- `Key Management`: Centralized key management solution for managing cryptographic keys, secrets, and certificates.
- `Integration`: Integrated with various Azure services for managing encryption keys.
- `Security`: Provides secure key storage, access control, and audit logging.