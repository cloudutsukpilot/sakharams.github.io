---
layout: post
title: Azure Storage Public Blob Leaks
categories:
- cybersecurity
tags:
- security
- AzureSecurity
- CloudEngineering
- DevOps
description: Discover how misconfigured Azure Storage containers expose sensitive
  data to the public internet and learn the Terraform fix to secure them.
image:
  path: /assets/img/cybersecurity/azure-storage-public-blob-leaks.webp
  alt: "Azure logo beside the title: public blob leaks from misconfigured Azure Storage containers"
---
<!-- Written by shorts-studio from the short "Azure Blob Leak: Fix Public Access" on 2026-11-16; review before merging. -->

> Watch the short: [Azure Blob Leak: Fix Public Access](https://youtube.com/shorts/HgKRDJk4wxY)

## The problem

Imagine you are a DevOps engineer on-call. You receive an alert from a security monitoring tool indicating a spike in egress traffic from your Azure Storage Account. Upon investigation, you discover that a specific container holding sensitive customer PII (Personally Identifiable Information) is being accessed by thousands of unique IP addresses.

The terrifying part? These requests are not coming through your application backend. There are no logs in your API gateway, no authentication headers in your application logs, and no Azure AD tokens being validated. The data is being downloaded directly from the storage layer.

When you inspect the storage container, you find that the "Public access level" is set to `Container`. This means anyone with the URL can list the blobs and download them without any credentials. A colleague had previously generated a Shared Access Signature (SAS) token for a partner integration but accidentally left the container permission at `Container` instead of `Blob`. Even worse, the storage account setting `Allow Blob Public Access` was never explicitly disabled.

This is a classic configuration drift scenario. A well-intentioned configuration change, combined with a lack of guardrails at the account level, has exposed your data to the entire internet. The blast radius is immediate, and the remediation requires a multi-layered approach involving infrastructure-as-code (IaC), identity management, and network security.

## How Why are my blobs public works

To understand how this happens, we must look at the hierarchy of access controls in Azure Storage. There are three distinct layers where public access can be enabled, and a failure at any layer can lead to exposure.

### 1. Storage Account Level Guardrail
At the highest level, every storage account has a setting called `Allow Blob Public Access`. By default, this is often enabled in new accounts to facilitate easy onboarding. If this setting is `true`, it acts as a master switch. Even if you configure a container to be private, this setting can sometimes override expectations or allow specific types of anonymous access depending on the configuration. Disabling this at the account level is the most effective way to prevent accidental leaks across all containers within that account.

### 2. Container Level Permission
If the account level allows public access, the next layer is the container. Each container has a `PublicAccess` property with three possible values:
*   `Off`: No anonymous access. Only authenticated users with appropriate permissions can read.
*   `Blob`: Anonymous read access is allowed for blobs within the container, but not for listing the container or its metadata.
*   `Container`: Anonymous read access is allowed for blobs and for listing the containers and blobs within the container. This is the most dangerous setting because it allows attackers to enumerate your entire dataset.

### 3. Object Level Permissions
Finally, individual blobs can have their own permissions. However, if the container is set to `Container` or `Blob`, the object-level permissions are largely irrelevant for anonymous access, as the container level grants the read privilege.

The mechanism of the leak described in the scenario works because the `Allow Blob Public Access` at the account level was `true`, and the container was explicitly set to `Container`. This created a direct path from the internet to the data, bypassing your application’s authentication logic entirely. The application expected Azure AD tokens, but the storage endpoint accepted anonymous HTTP GET requests.

## In practice

The most robust way to manage storage access is through Infrastructure as Code (IaC) and Azure RBAC (Role-Based Access Control). Relying on the Azure Portal for configuration changes is a primary cause of drift.

### Terraform Configuration Example

Below is a secure Terraform configuration that demonstrates how to lock down a storage account. Note the explicit disabling of public access and the use of RBAC instead of shared keys or SAS tokens for application access.

```hcl
resource "azurerm_storage_account" "secure_storage" {
  name                     = "securestorageacct001"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  # Critical: Disable public access at the account level
  allow_blob_public_access = false

  network_rules {
    default_action             = "Deny"
    ip_rules                   = ["YOUR_OFFICE_IP/32"]
    virtual_network_subnet_ids = [azurerm_subnet.app_subnet.id]
  }
}

resource "azurerm_storage_container" "data_container" {
  name                  = "sensitive-data"
  storage_account_name  = azurerm_storage_account.secure_storage.name
  container_access_type = "private" # Explicitly set to private

  # Ensure no inheritance of public access settings
  metadata = {
    secure = "true"
  }
}

# Grant access to the App Service via Managed Identity
resource "azurerm_role_assignment" "app_read_access" {
  scope                = azurerm_storage_account.secure_storage.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azurerm_app_service.main.identity[0].principal_id
}
```

### Trade-offs

*   **Security vs. Convenience:** Disabling `allow_blob_public_access` breaks any existing workflows that rely on public URLs for static assets (like images or scripts). You will need to migrate these to a CDN or a private container with SAS tokens if temporary access is needed.
*   **Complexity of RBAC:** Moving from shared keys to Azure AD/RBAC requires your applications to be updated to support Azure AD authentication. This adds complexity to the application code but significantly improves security posture.
*   **Network Rules:** Enabling `default_action = "Deny"` in network rules ensures that only specific IPs or virtual networks can reach the storage account. This adds operational overhead for managing IP allow-lists but prevents access from the public internet entirely.

## Common mistakes

Engineers frequently make the following errors when configuring Azure Storage:

1.  **Assuming Container Privacy is Enough:** Setting a container to `private` is good, but if `allow_blob_public_access` is still `true` at the account level, it can create confusion and potential edge cases. Always disable it at the account level.
2.  **Using Shared Keys in Code:** Hardcoding or storing storage account keys in application code or environment variables is a major security risk. Keys provide full access to the storage account. If leaked, an attacker has total control. Use Managed Identities and RBAC instead.
3.  **Over-Granting SAS Tokens:** When Shared Access Signatures are necessary, they are often created with overly broad permissions (e.g., `Read, Write, Delete`) and long expiration times. Always use the principle of least privilege and short lifespans.
4.  **Manual Portal Changes:** Making changes via the Azure Portal bypasses your CI/CD pipeline and version control. These changes are not auditable and can be overwritten by subsequent deployments. All changes should be made via Terraform or ARM/Bicep templates.
5.  **Ignoring Default Containers:** Azure creates default containers like `$logs`, `$web`, and `$batch`. These often have default permissions that might be more permissive than your custom containers. Ensure these are also secured.

## Interview angle

In technical interviews, particularly for DevOps, Cloud Engineering, or Security roles, this topic is used to assess your understanding of defense-in-depth and identity management.

**Question:** "How would you prevent accidental public exposure of data in Azure Storage, and how would you secure access for your applications?"

**Strong Short Answer:**
"First, I would enforce a policy at the storage account level by setting `allow_blob_public_access` to `false`. This is the most effective guardrail against accidental leaks. Second, I would avoid using shared keys or SAS tokens for application access. Instead, I would use Azure Managed Identities and assign Azure RBAC roles, such as `Storage Blob Data Reader`, to the application’s identity. This ensures that access is tied to the application’s identity and can be audited. Finally, I would ensure all storage configurations are managed via Infrastructure as Code to prevent drift and manual errors."

## Takeaway

The root cause of public blob leaks is rarely a sophisticated attack; it is usually a configuration oversight. The combination of `allow_blob_public_access = true` at the account level and `Container` level permissions on a specific container creates an open door.

To secure your data:
1.  **Disable Public Access:** Always set `allow_blob_public_access` to `false` at the storage account level.
2.  **Use RBAC:** Replace shared keys and SAS tokens with Azure AD authentication and RBAC roles for application access.
3.  **Automate:** Manage all storage configurations through Terraform or similar IaC tools. Never make manual changes via the portal.
4.  **Monitor:** Use tools like Microsoft Defender for Cloud or Cloudanix to continuously audit your storage accounts for public exposure.

By implementing these controls, you ensure that your data remains private by default, and access is granted only to authorized identities through a secure, auditable channel.
