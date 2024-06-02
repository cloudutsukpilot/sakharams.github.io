---
layout: post
title: Azure - Storage Account
categories: [cloud, azure, storage]
tags: [Cloud, Azure, Storage]
---

## Introduction
- An Azure Storage Account is a container that provides a namespace for Azure Storage services, allowing you to store data objects such as blobs, files, queues, tables, and disks. 
- It provides a unified way to manage different types of storage resources and ensures data is stored securely, highly available, and scalable.

### Types of Storage Account Services
- Azure Storage Accounts support various types of storage services, catering to different use cases:

1. **Blob Storage**
- `Blob Storage Account`: Optimized for storing massive amounts of unstructured data such as text or binary data.
    + `Hot`: Frequently accessed data.
    + `Cool`: Infrequently accessed data, stored for at least 30 days.
    + `Archive`: Rarely accessed data, stored for at least 180 days.

2. **File Storage**
- `Azure Files`: Managed file shares that can be accessed via SMB and NFS protocols. Suitable for replacing on-premises file servers.

3. **Queue Storage**
- `Queue Storage`: Enables the storage of large numbers of messages for asynchronous processing. Ideal for decoupling application components.

4. **Table Storage**
- `Table Storage`: NoSQL key-value store for rapid development using large amounts of structured data. Suitable for structured datasets.

5. **Disk Storage**:
- `Managed Disks`: Managed virtual hard disks for Azure VMs, offering simple, scalable, and high-performance disk storage.

### Authentication Methods to Access Storage Account
1. `Shared Key Authorization`:
- Uses storage account name and key for authentication.
- Provides full access to all resources in the storage account.
- Best for internal or backend services that need unrestricted access, but it should be managed carefully due to security risks.

2. `Shared Access Signatures (SAS)`:
- Offers a secure way to provide granular, temporary access to specific storage account resources. 
- Ideal for external clients, partners, or applications needing limited and controlled access.
- Types of SAS:
    + User Delegation SAS: Uses Azure AD credentials.
    + Service SAS: Grants access to storage services.
    + Account SAS: Grants access to resources at the account level.

3. `Azure Active Directory (Azure AD) Authentication`:
- Uses Azure AD to authenticate and authorize access to storage resources.
- Supports Role-Based Access Control (RBAC) for granular permissions.

4. `Managed Identities for Azure Resources`:
- Provides an identity for applications to use when connecting to Azure Storage without managing credentials.
- Supports both system-assigned and user-assigned managed identities.



### Supported Authentication Types

| Storage Type          | Shared Key | Shared Access <br> Signature (SAS) | Microsoft Entra ID | On-premises <br> Active Directory <br> Domain Services | Anonymous Public <br> Read Access |
|-----------------------|------------|-------------------------------|--------------------|----------------------------------------------|------------------------------|
| Azure Blobs           | Supported  | Supported                     | Supported          | Not supported                                | Supported                    |
| Azure Files (SMB)     | Supported  | Not supported                 | Supported (with Microsoft <br> Entra Domain Services <br> or Microsoft Entra Kerberos) | Supported (credentials must <br> be synced to Microsoft <br> Entra ID) | Not supported |
| Azure Files (REST)    | Supported  | Supported                     | Supported          | Not supported                                | Not supported                |
| Azure Queues          | Supported  | Supported                     | Supported          | Not supported                                | Not supported                |
| Azure Tables          | Supported  | Supported                     | Supported          | Not supported                                | Not supported                |


### Storage Account Access Key vs Shared Access Signatures
| Feature                     | Storage Account Access Key                               | Shared Access Signatures (SAS)                          |
|-----------------------------|----------------------------------------------------------|---------------------------------------------------------|
| **Access Level**            | Full access to all resources in the storage account      | Granular access to specific resources and operations     |
| **Security**                | Higher risk if exposed, as it provides full access       | More secure, limited access scope, and time-bound        |
| **Permissions**             | Unrestricted                                             | Customizable (read, write, delete, list, etc.)           |
| **Expiration**              | No expiration                                            | Can set start and end times                              |
| **IP Restrictions**         | Not available                                            | Can restrict to specific IP ranges                       |
| **Protocol Restrictions**   | Not available                                            | Can restrict to HTTPS                                    |
| **Use Cases**               | Full access for applications or services                 | Temporary, limited access for clients, partners, or specific operations |



