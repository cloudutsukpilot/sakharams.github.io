---
layout: post
title: Azure Key Vault
categories: [azure]
tags: [Cloud, Azure]
---

## Introduction
- Azure Key Vault is a cloud service provided by Microsoft Azure designed to securely store and manage sensitive information, such as secrets, encryption keys, and certificates. 
- It helps safeguard cryptographic keys and secrets used by cloud applications and services.

### Key Features of Azure Key Vault
1. **Secret Management**
- `Capabilities`: Securely store and tightly control access to tokens, passwords, certificates, API keys, and other secrets.
- `Benefits`: Simplifies tasks for developers, eliminating the need to store secrets in application code.

2. **Key Management**
- `Capabilities`: Create, import, manage, and use cryptographic keys for encryption and decryption. Supports both software and hardware-protected keys (HSM-backed).
- `Benefits`: Helps manage encryption keys used for data encryption across various Azure services.

3. **Certificate Management**
- `Capabilities`: Provision, manage, and deploy public and private SSL/TLS certificates.
- `Benefits`: Integrates with certificate authorities, automating certificate renewal and reducing the risk of service disruption due to expired certificates.

4. **Access Control**
- `Capabilities`: Fine-grained access policies based on Azure Active Directory (AAD) identities and roles.
- `Benefits`: Ensures only authorized users and applications can access the stored keys and secrets.

5. **Monitoring and Logging**
- `Capabilities`: Detailed logging and monitoring of key vault access and usage via Azure Monitor, Azure Security Center, and Azure Sentinel.
- `Benefits`: Enables auditing and compliance tracking, helping to identify and respond to unauthorized access attempts.

6. **Integration with Azure Services**
- `Capabilities`: Integrates seamlessly with various Azure services such as Azure App Service, Azure Functions, Azure VMs, and more.
- `Benefits`: Provides a centralized, secure repository for managing secrets and keys across different Azure services and applications.

### Use Cases for Azure Key Vault

1. **Storing Application Secrets**
- `Description`: Securely store sensitive information like database connection strings, API keys, and passwords that applications need at runtime.
- `Example`: A web application accessing a database uses Key Vault to store and retrieve the database connection string.

2. **Encrypting Data**
- `Description`: Manage encryption keys for encrypting and decrypting data in Azure Storage, SQL Database, or other services.
- `Example`: An Azure Storage account uses a key stored in Key Vault to encrypt its data at rest.

3. **Certificate Management**
- `Description`: Store and manage SSL/TLS certificates for web applications and services.
- `Example`: An Azure App Service uses Key Vault to store and automatically renew its SSL certificates.

4. **Securing DevOps Pipelines**
- `Description`: Store secrets and keys used in CI/CD pipelines to avoid hardcoding sensitive information in scripts and code repositories.
- `Example`: An Azure DevOps pipeline retrieves secrets from Key Vault to authenticate against various services during deployment.

5. **Hybrid and Multi-Cloud Security**
- `Description`: Use Key Vault to manage and store keys and secrets for applications running in hybrid or multi-cloud environments.
- `Example`: An on-premises application accesses a Key Vault to retrieve encryption keys for data encryption.

6. **Access Control and Compliance**
- `Description`: Enforce strict access controls and maintain compliance with regulatory requirements by using Key Vault’s access policies and logging capabilities.
- `Example`: A financial institution uses Key Vault to manage access to sensitive information and ensure compliance with industry regulations.

### Benefits of Using Azure Key Vault
1. `Enhanced Security`: Centralized management of sensitive information reduces the risk of exposure.
2. `Cost-Effective`: Reduces the need for costly on-premises hardware security modules (HSMs).
3. `Simplified Management`: Streamlines the management and lifecycle of keys and secrets.
4. `Compliance`: Helps meet compliance requirements by providing detailed access logs and secure storage.


### Key Vault Access
- `RBAC` is a method for managing access to resources within Azure by assigning roles to users, groups, or applications at a specific scope (subscription, resource group, or resource level).
- `Access Policies` are a way to define who or what has access to the secrets, keys, and certificates within a specific Key Vault. 
- RBAC controls who can manage the Key Vault resource itself (e.g., create, delete, modify the Key Vault), while Access Policies control who can access and manage the contents (secrets, keys, certificates) within the Key Vault.

### Key Vault Backup
- Below are the options available for backups:

1. **Key Vault Backup and Restore**
- `Manual Backup`: You can manually back up individual keys, secrets, or certificates from the Azure portal, using Azure PowerShell, or through the Azure CLI.
- `Manual Restore:` You can manually restore backed-up keys, secrets, or certificates using the Azure portal, Azure PowerShell, or Azure CLI.

2. **Soft Delete and Purge Protection**
- `Soft Delete`: When enabled, deleted keys, secrets, and certificates are retained in a "soft deleted" state for a configurable retention period (default is 90 days). During this period, you can recover (undelete) them.
- `Purge Protection`: When enabled, even after the soft delete retention period expires, objects cannot be permanently deleted (purged) without explicit approval, providing an additional layer of protection against accidental or malicious deletion.

3. **Azure Backup Integration**
- `Azure Backup`: Azure Backup can be used to back up the entire Key Vault. This service provides a managed and automated backup solution.


### Key Rotation
- Azure Key Vault key rotation is a process that ensures cryptographic keys are periodically updated to enhance security. 
- Key rotation helps mitigate risks associated with key compromise and ensures compliance with security policies.
- `Steps for Automatic Key Rotation`
    + a. Define Key Rotation Policy: You can define a rotation policy that specifies the rotation interval, expiry time, and actions to be taken before or after rotation.
    + b. Configure Key Rotation Policy:
        - Set Expiry: Define when the key should expire.
        - Rotation Interval: Specify how often the key should be rotated.
        - Actions: Define actions like notifying administrators or triggering automated processes upon key rotation.
    + c. Enable Key Rotation: Apply the rotation policy to the key.

- `Steps for Manual Key Rotation`
    + a. Create New Key Version: Generate a new version of the existing key in Azure Key Vault.
    + b. Update References: Update your applications and services to use the new key version. This often involves changing configuration settings or secrets that reference the key.
    + c. Validate: Ensure that the new key version is being used correctly by your applications.
    + d. Retire Old Key Versions: Disable or delete old key versions that are no longer needed to prevent their use.