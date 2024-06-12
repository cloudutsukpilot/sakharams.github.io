---
layout: post
title: Microsoft Defender for Cloud - Recommendations
categories: [cloud, azure, defenderforcloud]
tags: [Cloud, Azure, Defender for Cloud]
---

## Recommendations

### 1. 'container'
- Containers running in Azure should have vulnerability findings resolved

### 2. 'microsoft.apimanagement/service'
- API Management minimum API version should be set to 2019-12-01 or higher
- API Management services should use a virtual network
- API Management should disable public network access to the service configuration endpoints
- Azure API Management platform version should be stv2

### 3. 'microsoft.apimanagement/service/apis'
- API Management APIs should use only encrypted protocols
- 'microsoft.apimanagement/service/subscriptions'
- API Management subscriptions should not be scoped to all APIs

### 4. 'microsoft.cognitiveservices/accounts'
- Azure AI Services resources should have key access disabled (disable local authentication)
- Azure AI Services resources should restrict network access
- Cognitive Services should use private link

### 5. 'microsoft.compute/virtualmachines'
- Adaptive application controls for defining safe applications should be enabled on your machines
- Adaptive network hardening recommendations should be applied on internet facing virtual machines
- All network ports should be restricted on network security groups associated to your virtual machine
- Allowlist rules in your adaptive application control policy should be updated
- Authentication to Linux machines should require SSH keys
- Azure Backup should be enabled for virtual machines
- EDR configuration issues should be resolved on virtual machines
- EDR solution should be installed on Virtual Machines
- Guest Attestation extension should be installed on supported Windows virtual machines
- Guest Configuration extension should be installed on machines
- Install endpoint protection solution on virtual machines
- Internet-facing virtual machines should be protected with network security groups
- IP forwarding on your virtual machine should be disabled
- Linux virtual machines should enable Azure Disk Encryption or EncryptionAtHost.
- Log Analytics agent should be installed on virtual machines
- Machines should be configured securely
- Machines should be configured to periodically check for missing system updates
- Machines should have a vulnerability assessment solution
- Machines should have secrets findings resolved
- Machines should have vulnerability findings resolved
- Management ports of virtual machines should be protected with just-in-time network access control
- Management ports should be closed on your virtual machines
- Non-internet-facing virtual machines should be protected with network security groups
- Secure Boot should be enabled on supported Windows virtual machines
- System updates should be installed on your machines
- System updates should be installed on your machines (powered by Azure Update Manager)
- Virtual machines should be migrated to new Azure Resource Manager resources
- Virtual machines should encrypt temp disks, caches, and data flows between Compute and Storage resources
- vTPM should be enabled on supported virtual machines
- Vulnerabilities in security configuration on your Linux machines should be remediated (powered by Guest Configuration)
- Vulnerabilities in security configuration on your Windows machines should be remediated (powered by Guest Configuration)
- Windows Defender Exploit Guard should be enabled on machines
- Windows servers should be configured to use secure communication protocols
- Windows virtual machines should enable Azure Disk Encryption or EncryptionAtHost.

### 6. 'microsoft.compute/virtualmachines','microsoft.compute/virtualmachinescalesets'
- Virtual machines and virtual machine scale sets should have encryption at host enabled

### 7. 'microsoft.compute/virtualmachines','microsoft.operationalinsights/workspaces/onpremisemachines'
- Endpoint protection health issues on machines should be resolved

### 8. 'microsoft.compute/virtualmachinescalesets'
- Endpoint protection health issues on virtual machine scale sets should be resolved
- Endpoint protection should be installed on virtual machine scale sets
- Log Analytics agent should be installed on virtual machine scale sets
- System updates on virtual machine scale sets should be installed
- Virtual machine scale sets should be configured securely
- 'microsoft.compute/virtualmachinescalesets','microsoft.compute/virtualmachines'
- File integrity monitoring should be enabled on machines

### 9. 'microsoft.containerregistry/registries'
- Container registries should not allow unrestricted network access
- Container registries should use private link

### 10. 'microsoft.containerservice/managedclusters'
- Azure Kubernetes Service clusters should have Defender profile enabled
- Azure Kubernetes Service clusters should have the Azure Policy add-on for Kubernetes installed
- Azure running container images should have vulnerabilities resolved
- Container CPU and memory limits should be enforced
- Container images should be deployed from trusted registries only
- Container with privilege escalation should be avoided
- Containers sharing sensitive host namespaces should be avoided
- Containers should only use allowed AppArmor profiles
- Diagnostic logs in Kubernetes services should be enabled
- Immutable (read-only) root filesystem should be enforced for containers
- Kubernetes API server should be configured with restricted access
- Kubernetes clusters should be accessible only over HTTPS
- Kubernetes clusters should disable automounting API credentials
- Kubernetes clusters should not grant CAPSYSADMIN security capabilities
- Kubernetes clusters should not use the default namespace
- Least privileged Linux capabilities should be enforced for containers
- Privileged containers should be avoided
- Role-Based Access Control should be used on Kubernetes Services
- Running containers as root user should be avoided
- Services should listen on allowed ports only
- Usage of host networking and ports should be restricted
- Usage of pod HostPath volume mounts should be restricted to a known list to restrict node access from compromised containers

### 11. 'microsoft.dbforpostgresql/flexibleservers'
- Microsoft Defender for SQL should be enabled for unprotected PostgreSQL flexible servers

### 12. 'microsoft.documentdb/databaseaccounts'
- Azure Cosmos DB accounts should have firewall rules
- Azure Cosmos DB accounts should use Azure Active Directory as the only authentication method
- Azure Cosmos DB should disable public network access
- CosmosDB accounts should use private link

### 13. 'microsoft.eventhub/namespaces'
- Diagnostic logs in Event Hub should be enabled

### 14. 'microsoft.keyvault/vaults'
- Diagnostic logs in Key Vault should be enabled
- Firewall should be enabled on Key Vault
- Key vaults should have purge protection enabled
- Key vaults should have soft delete enabled

### 15. 'microsoft.network/applicationgateways'
- Web Application Firewall (WAF) should be enabled for Application Gateway

### 16. 'microsoft.network/virtualnetworkgateways'
- VPN gateways should use only Azure Active Directory (Azure AD) authentication for point-to-site users

### 17. 'microsoft.network/virtualnetworks'
- Azure DDoS Protection Standard should be enabled
- Network Watcher should be enabled
- Virtual networks should be protected by Azure Firewall

### 18. 'microsoft.network/virtualnetworks/subnets'
- Subnets should be associated with a network security group

### 19. 'microsoft.operationalinsights/workspaces/onpremisemachines'
- Endpoint protection should be installed on machines

### 20. 'microsoft.storage/storageaccounts'
- Secure transfer to storage accounts should be enabled
- Storage account public access should be disallowed
- Storage account should use a private link connection
- Storage accounts should be migrated to new Azure Resource Manager resources
- Storage accounts should prevent shared key access
- Storage accounts should restrict network access using virtual network rules

### 21. 'subscription'
- A maximum of 3 owners should be designated for subscriptions
- Accounts with owner permissions on Azure resources should be MFA enabled
- Accounts with read permissions on Azure resources should be MFA enabled
- Accounts with write permissions on Azure resources should be MFA enabled
- Auto provisioning of the Log Analytics agent should be enabled on subscriptions
- Blocked accounts with owner permissions on Azure resources should be removed
- Blocked accounts with read and write permissions on Azure resources should be removed
- Email notification for high severity alerts should be enabled
- Email notification to subscription owner for high severity alerts should be enabled
- Guest accounts with owner permissions on Azure resources should be removed
- Guest accounts with read permissions on Azure resources should be removed
- Guest accounts with write permissions on Azure resources should be removed
- Microsoft Defender for APIs should be enabled
- Microsoft Defender for App Service should be enabled
- Microsoft Defender for Azure SQL Database servers should be enabled
- Microsoft Defender for Containers should be enabled
- Microsoft Defender for Key Vault should be enabled
- Microsoft Defender for open-source relational databases should be enabled
- Microsoft Defender for Resource Manager should be enabled
- Microsoft Defender for servers should be enabled
- Microsoft Defender for SQL servers on machines should be enabled
- Microsoft Defender for Storage plan should be enabled with Malware Scanning and Sensitive Data Threat Detection
- Subscriptions should have a contact email address for security issues
- There should be more than one owner assigned to subscriptions

