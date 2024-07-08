---
layout: post
title: AZ 500 - Azure Security Engineer Associate
categories: [certification, azure]
tags: [Certification]
---

## AZ-500 Certification Skills

1. **Manage identity and access (25–30%)**
- Manage Microsoft Entra identities
- Manage Microsoft Entra authentication
- Manage Microsoft Entra authorization
- Manage Microsoft Entra application access

2. **Secure networking (20–25%)**
- Plan and implement security for virtual networks
- Plan and implement security for private access to Azure resources
- Plan and implement security for public access to Azure resources

3. **Secure compute, storage, and databases (20–25%)**
- Plan and implement advanced security for compute
- Plan and implement security for storage
- Plan and implement security for Azure SQL Database and Azure SQL Managed Instance

4. **Manage security operations (25–30%)**
- Plan, implement, and manage governance for security
- Manage security posture by using Microsoft Defender for Cloud
- Configure and manage threat protection by using Microsoft Defender for Cloud
- Configure and manage security monitoring and automation solutions


### AZ-500 Question and Answers

### Secure Networking
1. You want to secure the communication between users and your Azure App Service application. Which security protocol should be implemented to encrypt data in transit?
  + [ ] HTTP
  + [ ] SFTP
  + [x] SSL/TLS
  + [ ] UDP

2. Which of the following Azure services offers built-in Distributed Denial of Service (DDoS) protection to secure your applications?
  + [ ] Azure Firewall
  + [ ] Correct selection
  + [x] Azure Application Gateway
  + [x] Azure DDoS Protection
  + [x] Azure Front Door

3. Which of the following are suitable solutions for securely connecting on-premises networks to Azure virtual networks?
  + [ ] Virtual Network Peering
  + [x] VPN Gateway
  + [x] Azure ExpressRoute
  + [ ] Network Watcher
  + [x] ExpressRoute with VPN failover

4. You notice some unauthorized traffic in your Azure environment and want to understand the flow of traffic through your Network Security Group (NSG). Which Azure feature should you use to diagnose this?
  + [ ] NSG diagnostics
  + [ ] User-defined routes (UDRs)
  + [x] NSG flow logs
  + [ ] Application Security Group (ASG)

5. You need to restrict access to your Azure Storage account such that it can only be accessed from a specific subnet within your Azure Virtual Network. Which feature should you utilize?
  + [ ] Private Link services
  + [x] Virtual Network (VNet) Service Endpoints
  + [ ] Azure Functions
  + [ ] Azure SQL Managed Instance

6. When setting up connectivity to a PaaS service securely over a private IP in your VNet, which Azure features can be used?
  + [ ] Virtual Network Service Endpoints
  + [x] Private Link
  + [x] Private Endpoints
  + [ ] Azure Functions

7. You are deploying a high-security application in Azure and need to ensure it operates in an isolated and highly secure network environment. Which Azure service provides this capability?
  + [ ] Azure SQL Managed Instance
  + [ ] Service Endpoints
  + [ ] Private Endpoints
  + [x] App Service Environment (ASE)

8. You're designing the network infrastructure for an Azure-based application and you want to restrict traffic between two virtual machines based on their roles within the application. Which of the following should you implement?
  + [ ] Virtual Network Peering
  + [ ] User-defined routes (UDRs)
  + [ ] Network Security Groups (NSGs)
  + [x] Application Security Groups (ASGs)

9. Your company has two separate Azure regions that need to share resources. You want to ensure low-latency, private connectivity between these regions. Which of the following should you set up?
  + [x] Microsoft Azure Virtual WAN
  + [x] Global Virtual Network Peering
  + [ ] VPN Gateway
  + [ ] Network Security Groups (NSGs)

10. You are monitoring your Azure infrastructure for potential network issues between VMs. You want to analyze the inbound and outbound traffic to and from Network Security Groups (NSGs). Which tool should you utilize?
  + [ ] Network Watcher
  + [ ] VPN Gateway logging
  + [ ] NSG Flow Logs
  + [x] IP flow verify

11. You want to ensure that your Azure Storage account is only accessible from a specific virtual network. Which of the following Azure features would you implement?
  + [ ] Virtual Network Peering
  + [ ] Private Link services
  + [x] Virtual Network Service Endpoints
  + [ ] Private Endpoints

12. You're looking to securely access Azure PaaS services over a private connection. Which of the following Azure features should you implement to achieve this?
  + [ ] Virtual Network Peering
  + [x] Private Endpoints
  + [x] Private Link services
  + [ ] Virtual Network Service Endpoints

13. You are deploying an Azure SQL Managed Instance in your environment. To enhance security, you want to ensure that the Managed Instance is not directly accessible from the public Internet but only from your virtual network. What should you configure?
  + [ ] App Service Environment (ASE)
  + [ ] Virtual Network Service Endpoints
  + [ ] Network Integration for Azure Functions
  + [x] A dedicated subnet within the Virtual Network

14. Which Azure service would you primarily utilize to manage security for web applications against common web-based threats, such as SQL injection and cross-site scripting?
  + [ ] Azure Firewall
  + [ ] Azure Front Door
  + [ ] Azure Application Gateway
  + [x] Web Application Firewall (WAF)

15. You are planning to design a robust application infrastructure in Azure that provides DDoS protection, TLS termination, and URL-based routing. Which of the following Azure services would you likely incorporate in your design?
  + [ ] Azure Firewall
  + [x] Azure Front Door
  + [x] Azure DDoS Network Protection
  + [x] Azure Application Gateway

16. You are designing a virtual network in Azure. For fine-grained control over traffic that flows within the subnet, you plan to use a specific Azure feature. Which of the following would you implement?
  + [ ] Virtual Network Peering
  + [ ] User-Defined Routes (UDRs)
  + [ ] Azure Virtual WAN
  + [ ] Virtual Network Gateway
  + [x] Network Security Groups (NSGs)

17. Which of the following are features or functionalities associated with Network Security Groups (NSGs) in Azure?
  + [x] Filtering traffic between virtual networks
  + [ ] Associating with a secured virtual hub
  + [x] Protocol
  + [ ] Routing mechanisms for UDRs

18. You are setting up a hybrid connection between your on-premises network and Azure. You want to ensure the connection is private and doesn't go over the public Internet. Which Azure service would you implement for this?
  + [ ] Azure VPN Gateway
  + [ ] Network Watcher
  + [x] ExpressRoute
  + [ ] Virtual Network Peering

19. When integrating Azure App Service with an Azure virtual network, which feature enables the App Service to access resources in the virtual network?
  + [ ] Service Endpoints
  + [ ] Private Link
  + [x] VNet Integration
  + [ ] Private DNS Zone

20. You are tasked with securing access to an Azure SQL Managed Instance. Which of the following can be used to secure and limit access to the instance from the internet?
  + [ ] Virtual Network Service Endpoints
  + [x] Azure Firewall
  + [x] Private Link services
  + [ ] Azure Front Door
  + [ ] DMZ
  + [ ] IP whitelisting

21. In an Azure App Service Environment (ASE), what provides the primary layer of network defense against malicious internet traffic?
Network Watcher
  + [ ] Network Security Group (NSG)
  + [ ] Application Gateway
  + [ ] Traffic Manager
  + [x] Azure Firewall

22. For end-to-end encryption in Azure App Service, which of the following configurations ensures that inbound and outbound traffic from your app is encrypted?
  + [x] HTTPS Only
  + [ ] Managed Service Identity
  + [ ] IP Restrictions
  + [ ] Custom Domain SSL

23. Which of the following Azure services provides both a global acceleration Content Delivery Network (CDN) and Web Application Firewall (WAF) capabilities?
  + [x] Azure Front Door
  + [ ] Azure Application Gateway
  + [ ] Azure DDoS Protection Standard
  + [ ] Azure Traffic Manager

24. You are tasked with limiting the inbound traffic to a specific application within your Azure virtual network. Which Azure resource should you configure?
  + [ ] Application Security Groups
  + [ ] Virtual Network Peering
  + [x] Network Security Groups (NSGs)
  + [ ] Virtual WAN


25. You have an Azure virtual network named VNet1. VNet1 is in a resource group named RG1. VNet1 contains the following two subnets:
Subnet1: 10.0.1.0/24
Subnet2: 10.0.2.0/24
You need to configure access to a storage account named sa1 in a resource group named RG2. The solution must ensure that sa1 can only be accessed from Subnet2.
What should you run?
Select only one answer.
    + [ ] az network nsg rule create -g RG1 --nsg-name NSG1 -n RULE1 --priority 400 --source-address-prefixes VirtualNetwork --destination-address-prefixes Storage --destination-port-ranges '*' --direction Outbound --access Allow --protocol Tcp
    + [ ] az network nsg rule create -g RG1 --nsg-name NSG1 -n RULE1 --priority 400 --source-address-prefixes VirtualNetwork --destination-address-prefixes Storage --destination-port-ranges '*' --direction Outbound --access Allow --protocol Udp
    + [ ] az storage account network-rule add --resource-group "RG1" --account-name "SA1" --ip-address "10.0.2.0"
    + [x] az storage account network-rule add --resource-group "RG2" --account-name "SA1" --ip-address "10.0.2.0/24" az storage account update --default-action deny --name sa1 --resource-group RG2

26. You have an Azure subscription that contains two virtual networks named VNet1 and VNet2 and a user named Admin1.
You plan to create a custom Azure RBAC role named Role1 and assign Role1 to Admin1.
You need to ensure that Admin1 can create network peering between VNet1 and VNet2.
Which two permissions should you add to Role1? Each correct answer presents part of the solution.
Select all answers that apply.
  + [ ] Microsoft.ClassicNetwork/virtualNetworks/peer/action
  + [ ] Microsoft.Network/privateDnsZones/*
  + [ ] Microsoft.Network/virtualNetworks/join/action
  + [x] Microsoft.Network/virtualNetworks/peer/action
  + [x] Microsoft.Network/virtualNetworks/virtualNetworkPeerings/write


27. You have an Azure subscription that contains the following resources:
<br> Two virtual networks
<br> VNet1: Contains two subnets
<br> VNet2: Contains three subnets
<br> Virtual machines: Connected to all the subnets on VNet1 and VNet2
<br> A storage account named storage1
<br> You need to identify the minimal number of service endpoints that are required to meet the following requirements:
<br> Virtual machines that are connected to the subnets of VNet1 must be able to access storage1 over the Azure backbone.
<br> Virtual machines that are connected to the subnets of VNet2 must be able to access Microsoft Entra tenant over the Azure backbone.
<br> How many service endpoints should you recommend?
Select only one answer.
  + [ ] 2
  + [ ] 3
  + [ ] 4
  + [x] 5

    > A service endpoint is configured for a specific server at the subnet level. Based on the requirements, you need to configure two service endpoints for Microsoft.Storage on VNet1 because VNet1 has two subnets and three service endpoints for Microsoft.AzureActiveDirectory on VNet2 because VNet2 has three subnets. The minimum number of service endpoints that you must configure is five
    {: .prompt-tip}

### Secure Compute, Storage and Databases

1. To allow secure and seamless Remote Desktop Protocol (RDP) connectivity to your Azure virtual machines directly from the Azure portal without any exposure of the public IPs on your virtual machines, which service should you use?
  + [ ] Azure API Management
  + [x] Azure Bastion
  + [ ] Azure Kubernetes Service (AKS)
  + [ ] Azure Disk Encryption (ADE)

2. Which of the following solutions can help enhance the security of Azure Kubernetes Service (AKS) cluster?
  + [ ] Just-in-Time VM access
  + [ ] Azure Disk Encryption (ADE)
  + [x] Azure Network Policies
  + [x] Kubernetes RBAC

3. For storing and managing container images and Helm charts securely within the Azure instance, which Azure service should you use?
  + [ ] Azure Kubernetes Service (AKS)
  + [ ] Azure Container Apps (ACAs)
  + [ ] Azure Container Instances (ACIs)
  + [x] Azure Container Registry (ACR)

4. You are setting up a new Azure Storage account and need to ensure that only specific virtual networks and IP addresses can access it. Which feature of the storage account should you configure?
+ [ ] Application Security Groups (ASGs)
+ [ ] Network Security Groups (NSGs)
+ [x] Storage account firewalls and virtual networks
+ [ ] Azure Blob Storage versioning

5. Your organization stores sensitive files on Azure Blob Storage. To enhance the security of this data, you're asked to implement an extra layer of encryption in addition to the default encryption provided by Azure Storage. Which feature will you enable?
  + [x] Infrastructure Encryption
  + [ ] Customer-Managed Key (CMK)
  + [ ] Bring Your Own Key (BYOK)
  + [ ] Azure Queue storage protection

6. To ensure data resiliency and protection against accidental deletion in Azure Blob Storage, which of the following features can be enabled?
  + [x] Soft delete
  + [ ] Immutable storage
  + [x] Blob versioning
  + [ ] Customer-Managed Key (CMK)
  + [ ] Locally Redundant Storage (LRS)
  + [x] Immutable Blobs

7. Which of the following Azure services doesn't enable you to authenticate a database using Microsoft Entra ID?
  + [ ] Azure SQL Database
  + [x] Azure Database for MariaDB
  + [ ] Azure SQL Managed Instance
  + [ ] SQL Server on Windows Azure VMs
  + [ ] Azure Cosmos DB for PostgreSQL

8. You have been assigned to enhance the security and compliance of your organization's Azure SQL Database. Which of the following measures can you adopt to encrypt data and audit database operations?
+ [x] Transparent Data Encryption (Encryption-at-rest)
+ [x] Transport Layer Security (Encryption-in-transit)
+ [ ] Soft Delete
+ [x] Auditing
+ [x] Advanced Threat Protection

9. Your company wants to ensure that administrators can securely and seamlessly RDP and SSH to their Azure virtual machines directly from the Azure portal. Which Azure service should be implemented to achieve this?
  + [ ] Azure Kubernetes Service (AKS)
  + [x] Azure Bastion
  + [ ] Azure Disk Encryption (ADE)
  + [ ] Azure API Management

10. You are tasked with ensuring that your Azure Kubernetes Service (AKS) is secure and can be monitored effectively. Which of the following configurations would be most suitable?
  + [x] Process Windows Server/Linux node updates
  + [x] Secure access to the API server and cluster nodes
  + [x] Monitor Azure Kubernetes Service (AKS) with Azure Monitor
  + [ ] Monitor AKS with Azure Container Instances (ACIs) metrics.

11. You have an application that needs access to an Azure Blob Storage. Which method provides identity-based authentication and authorization for your Azure services?
  + [ ] Shared access signature (SAS)
  + [x] Entra ID
  + [ ] Storage account access keys
  + [ ] Anonymous public read access

12. To enhance data protection in your Azure Storage account, which of the following methods can be employed to safeguard against accidental data deletions and modifications?
  + [x] Soft delete
  + [x] Immutable storage
  + [ ] Azure Queues
  + [x] Versioning


13. Your company is concerned about the security of data at rest in Azure Storage. They want to implement additional encryption on top of Azure’s built-in encryption. Which feature should you enable?
  + [ ] Bring your own key (BYOK)
  + [ ] Soft delete
  + [ ] Versioning
  + [x] Doubly encrypt data with infrastructure encryption
  + [ ] Bitlocker


14. Your organization wants to use an identity-based approach for authenticating to Azure SQL databases. Which method should you employ?
  + [ ] SQL Server authentication
  + [ ] Windows integrated authentication
  + [x] Microsoft Entra authentication
  + [ ] API key authentication

15. You have a responsibility to maintain security and compliance over sensitive data in your organization. Which of the following can you implement in Azure SQL Database to ensure the protection of this data at rest and during operations?
  + [x] Transparent Database Encryption (TDE)
  + [x] Always Encrypted
  + [ ] Microsoft Purview governance portal
  + [x] Dynamic Data masking
  + [ ] End-to-end encryption
  + [ ] Data Anonymization


16. When working with Azure storage, which feature can you use to ensure that the data you store remains tamper-proof and non-erasable for a specified retention period?
  + [ ] Storage account firewalls
  + [ ] Azure Blob versioning
  + [ ] Soft delete for Azure Blobs
  + [x] Immutable storage for Azure Blob

17. What are the factual assertions when setting up an Azure file share for a corporate team?
  + [x] Azure Files can authenticate to Microsoft Entra Domain Services.
  + [ ] Azure Files cannot authenticate to on-premises Active Directory Domain Services.
  + [ ] Azure Files can use RBAC for share-level or directory/file permissions.

18. While configuring security for your Azure Kubernetes Service (AKS), which of the following measures would you undertake to ensure network isolation and security monitoring for the containers?
  + [x] Use Azure Network Policies
  + [x] Enable Azure Monitor and Azure Security Center integration
  + [ ] Configure Azure Disk Encryption for AKS nodes
  + [ ] Configure API Management for AKS

19. To enable double encryption for your Azure Storage data at rest, which of the following options should you use?
  + [x] Enable Infrastructure Encryption
  + [ ] Azure Security Center
  + [ ] Managed Keys
  + [ ] Azure Key Vault

20. What is the simplest method for a company to ensure the secure storage of its media files?
  + [ ] Create a shared access signature (SAS) for each user and delete the SAS to prevent access.
  + [x] Create stored access policies for each container to enable revocation of access or change of duration.
  + [ ] Periodically regenerate the account key to control access to the files.
  + [ ] BYOK
  + [x] Use Azure Blob Storage with Service-Side Encryption

21. To leverage your organization's key management standards and ensure that Azure doesn't have access to keys, which of the following configurations should you use for your Azure Storage?
  + [ ] Azure Managed Keys
  + [ ] Service Managed Keys
  + [x] Customer Managed Keys
  + [ ] RBAC keys

22. Your company is focusing on enhancing data protection in Azure SQL databases. To encrypt data at rest, which feature should you implement?
Dynamic Data Masking
  + [ ] Always Encrypted
  + [x] Transparent Database Encryption (TDE)
  + [ ] Microsoft Entra authentication

23. Which of the following are typical use cases for the Microsoft Purview governance portal?
  + [x] Automating data discovery and classification
  + [ ] Real-time Data Processing
  + [x] Tracking data lineage across multi-cloud environments
  + [ ] Data Analytics

24. For an App Service web application that utilizes an SQL database, what are the necessary configuration steps to allow users to authenticate to the database using their Microsoft Entra credentials?
  + [ ] Create an SQL Database Administrator
  + [ ] Create a Microsoft Entra Database Administrator
  + [x] Create users in each database

25. You have sensitive data columns in an Azure SQL database that should not be exposed in their entirety to some of the application users. Which feature should you use to hide this sensitive data in result sets?
  + [ ] Standard query filters
  + [ ] Regular indexing
  + [ ] Always Encrypted
  + [x] Dynamic Data Masking

26. You need to configure the IP firewall of an Azure Cosmos DB account. The solution must meet the following requirements:
    <br> Allow an Azure App Service web app to access the account.
    <br> Allow a user named User1 to access the account from the Azure portal.
    <br> Block all other access to the account.
<br> Which two actions should you perform? Each correct answer presents part of the solution. Select all answers that apply.
  + [x] Add the IP address of User1 to the allowed IP address range of the Azure Cosmos DB account.
  + [x] Add the web app’s outbound IP addresses to the allowed IP address range of the Azure Cosmos DB account.
  + [ ] Select Allow access from Azure Portal.
  + [ ] Sign in as User1 and select Add my current IP to the allowed IP address range.

27. You have an Azure App Service web app named App1.
You need to configure network controls for App1. App1 must only allow user access through Azure Front Door.
Which two components should you implement? Each correct answer presents part of the solution.
Select all answers that apply.
  + [x] access restrictions based on service tag
  + [ ] access restrictions based on the IP address of Azure Front Door
  + [ ] application security groups
  + [x] header filters

28. You are implementing an Azure Kubernetes Service (AKS) cluster for a production workload.
You need to ensure that the cluster meets the following requirements:
<br> Provides the highest networking performance possible
<br> Manages ingress traffic by using Kubernetes tools
<br> What should you use?
Select only one answer.
  + [ ] CNI networking with Azure load balancers
  + [x] CNI networking with ingress resources and controllers
  + [ ] Kubenet networking with Azure load balancers
  + [ ] Kubenet networking with ingress resources and controllers

29. You have an Azure Kubernetes Service (AKS) cluster named AKS1.
You are configuring network isolation for AKS1.
You need to limit which IP addresses can access the Kubernetes control plane.
What should you do?
Select only one answer.
  + [x] Configure API server authorized IP ranges.
  + [ ] Configure Azure Front Door.
  + [ ] Customize CoreDNS for AKS.
  + [ ] Implement Open Service Mesh AKS add-on.

30. You have an Azure Blob storage account named sa1 and an app named App1. A binary file named File1 is stored in sa1.
You need to share File1 with a customer. The solution must limit access to the IP address that the customer used when completing a purchasing flow in App1. Other users must be prevented from accessing File1.
What should you configure?
Select only one answer.
  + [x] a SAS token that includes the signedIP field
  + [ ] a storage account firewall
  + [ ] an Azure Front Door IP restriction rule
  + [ ] network conditions to Conditional Access
  <br>
    > Configuring a SAS token that includes the signedIP field specifies an IP address or a range of IP addresses from which to accept requests. 
    > This configuration is required for specific IP and specific storage account. Eliminate the services which allow access to all IP's or to all files in storage accont.
    {: .prompt-tip}

31. You enable Always Encrypted for an Azure SQL database.
Which scenario is supported?
Select only one answer.
  + [ ] copying data from one column to another
  + [ ] creating columns that have the XML data type
  + [x] encrypting existing data
  + [ ] using dynamic data masking

    > Encrypting existing data is supported. 
    {: .prompt-tip}

32. You implement dynamic data masking for an Azure Synapse Analytics workspace.
You need to provide only a user named User1 with the ability to see the data.
What should you do?
Select only one answer.
  + [ ] Create a Conditional Access policy for Azure SQL Database, and then grant access.
  + [x] Grant the UNMASK permission to User1.
  + [ ] Use the ALTER TABLE statement to drop the masking function.
  + [ ] Use the ALTER TABLE statement to edit the masking function.

    > ALTER statements affects the table for all users. Conditional Access Policy will only provide permissions to sign in
    {: .prompt-tip}

33. You have an application that securely shares files hosted in Azure Blob storage to external users by using an account SAS.
One of the SAS tokens is compromised.
How should you stop the compromised SAS token from being used?
Select only one answer.
  + [x] Regenerate the storage account access keys.
  + [ ] Set the Allow public anonymous access to setting for the storage account.
  + [ ] Set the Secure transfer required property for the storage account.
  + [ ] Switch to managed identities.

    > The aim here is to invalidate the existing SAS key.
    {: .prompt-tip}

34. You have a resource group named RG1 that contains 10 virtual machines.
You need to raise an alert any time the average CPU time for RG1 exceeds 80 percent.
How should you configure the alert?
Select only one answer.
  + [ ] Create an alert rule for each virtual machine and set the number of violations to 10.
  + [ ] Create an alert rule for each virtual machine and split by dimension on the virtual machine name.
  + [x] Create an individual alert rule and split by dimension on the resource group name.
  + [ ] Create an individual alert rule for CPU time and set the number of violations to 10.

35. You create a role by using the following JSON.
```
  {
    "Name": "Virtual Machine Operator",
    "Id": "88888888-8888-8888-8888-888888888888",
    "IsCustom": true,
    "Description": "Can monitor and restart virtual machines.",
    "Actions": [
      "Microsoft.Storage/*/read",
      "Microsoft.Network/*/read",
      "Microsoft.Compute/virtualMachines/start/action",
      "Microsoft.Compute/virtualMachines/restart/action",
      "Microsoft.Authorization/*/read",
      "Microsoft.ResourceHealth/availabilityStatuses/read",
      "Microsoft.Resources/subscriptions/resourceGroups/read",
      "Microsoft.Insights/alertRules/*",
      "Microsoft.Insights/diagnosticSettings/*",
      "Microsoft.Support/*"
    ],
    "NotActions": [],
    "DataActions": [],
    "NotDataActions": [],
    "AssignableScopes": ["/subscriptions/*"]
  }
```
A user that is part of the new role reports that they are unable to restart a virtual machine by using a PowerShell script.
What should you do to ensure that the user can restart the virtual machine?
Select only one answer.
  + [x] Add Microsoft.Compute/*/read to the list of Actions in the role.
  + [ ] Add Microsoft.Compute/virtualMachines/login/action to the list of DataActions in the custom role.
  + [ ] Ask the user to restart the virtual machine by using the Azure portal.
  + [ ] Instruct the user to sign out and back in to their account.

    > The role needs read access to virtual machines to restart them. 
    {: .prompt-tip}

36. You have an application that runs on-premises on a Linux virtual machine. The application uses a connection string to connect to an Azure storage account.
You need to test the application by using data from the storage account. The solution must ensure that the application can only access the storage account during a five-day test period.
Which authentication method should you use to access the storage account?
Select only one answer.
  + [x] a SAS
  + [ ] a storage account access key
  + [ ] Microsoft Entra
  + [ ] on-premises Active Directory Domain Services (AD DS)

    > You can specify a policy with expiration time by using a SAS key. A shared key, Microsoft Entra, and on-premises AD DS does not allow you to specify a time period.
    {: .prompt-tip}

37. You need to implement access control for Azure Files. The solution must provide the highest level of security.
What should you use?
Select only one answer.
  + [x] Microsoft Entra
  + [ ] a storage account key
  + [ ] SAS

    > Microsoft Entra is supported by Azure Files and follows the principle of least privilege. SAS is unsupported by Azure Files. A storage account key is supported by Azure Files, but it does not follow the principle of least privilege.
    {: .prompt-tip}

38. You have an Azure SQL Database server named Server1 that contains a database named DB1.
You create an auditing policy for DB1.
After a few weeks, you create five more databases in Server1. You then create a new auditing policy for Server1.
You notice that auditing entries for DB1 are duplicated.
You need to ensure that auditing entries for all existing and future databases are not duplicated.
What should you do?
Select only one answer.
  + [ ] Configure the policy used in DB1 with the same settings as the policy on Server1.
  + [ ] Configure the policy used on Server1 with the same settings as the policy in DB1.
  + [ ] Create a policy for each of the five new databases.
  + [x] Disable auditing for DB1.

39. You plan to deploy storage accounts and limit the use of shared access key access by using Azure Policy.
Which two effects in an Azure policy will audit any attempts to use shared access keys? Each correct answer presents a complete solution.
Select all answers that apply.
  + [x] Audit
  + [ ] DeployIfNotExists
  + [x] Deny
  + [ ] Disabled

    > Disabled disables the evaluation of the policy and DeployIfNotExists is unsupported.
    {: .prompt-tip}

40. You have an Azure solution that uses a key in Azure Key Vault to encrypt data stored in an Azure SQL database.
You need to design a solution that automatically generates a new key in SQL and stores it in the key vault whenever the key vault requires a key rotation. The solution must minimize costs.
What should you include in the solution?
Select only one answer.
  + [ ] Azure Event Grid and a web app
  + [x] Azure Event Grid and Azure Functions
  + [ ] Log Analytics and a web app
  + [ ] Log Analytics and Azure Functions

    > Event Grid can capture key rotation events from Key Vault and trigger an Azure function to generate a new key in SQL and store it in Key Vault. 
    {: .prompt-tip}

41. You have an Azure App Service web app named App1.
Users authenticate to App1 by using Microsoft Entra.
You plan to implement network security controls for App1.
You need to ensure that only authenticated users from your corporate network can sign in to App1. The solution must not require the configuration of virtual network rules.
Which two actions should you perform? Each correct answer presents part of the solution.
Select all answers that apply.
  + [x] Configure App Service authentication.
  + [ ] Configure application security groups.
  + [ ] Configure an Azure Front Door IP restriction rule.
  + [x] Configure network conditions to Conditional Access.

    > You can configure the network conditions to Conditional Access, ensuring that the location is determined by the public IP address a client provides to Microsoft Entra or the GPS coordinates provided by the Microsoft Authenticator app. You need to configure App Service authentication, specifically the Action to take when request is not authenticated option. Application security groups are unsupported by web apps and configuring a Front Door IP restriction rule does not affect sa1.
    {: .prompt-tip}

42. You have an Azure subscription that contains a virtual network named VNet1.
You plan to deploy an Azure App Service web app named Web1.
You need to be able to deploy Web1 to the subnet of VNet1. The solution must minimize costs.
Which pricing plan should you use for Web1?
Select only one answer.
  + [ ] Basic
  + [ ] Premium
  + [x] Isolated
  + [ ] Shared

    > Only the Isolated pricing plan (tier) can be deployed to a virtual network subnet. With other pricing plans, inbound traffic is always routed to the public IP address of the web app, while web app outbound traffic can reach the endpoints on a virtual network.
    {: .prompt-tip}

43. You have an Azure subscription that contains a virtual network named VNet1.
VNet1 contains the following subnets:
<br> Subnet1: Has a connected virtual machine
<br> Subnet2: Has a Microsoft.Storage service endpoint
<br> Subnet3: Has subnet delegation to the Microsoft.Web/serverFarms service
<br> Subnet4: Has no additional configurations
<br> You need to deploy an Azure SQL managed instance named managed1 to VNet1.
To which subnets can you connect managed1?
Select only one answer.
  + [x] Subnet4 only
  + [ ] Subnet3 and Subnet4 only
  + [ ] Subnet2 and Subnet4 only
  + [ ] Subnet2, Subnet3, and Subnet4 only
  + [ ] Subnet1, Subnet2, Subnet3, and Subnet4

    > You can deploy an SQL managed instance to a dedicated virtual network subnet that does not have any resource connected. The subnet can have a service endpoint or can be delegated for a different service. 
    {: .prompt-tip}


44. You have the following security policy deployed to an Azure subscription.
```
  policyRule: {
    if: {
      allOf: [
        {
          field: "type",
          equals: "Microsoft.Storage/storageAccounts"
        },
        {
          field: "Microsoft.Storage/storageAccounts/allowSharedKeyAccess",
          equals: "true"
        }
      ]
    },
    then: {
      effect: "Deny"
    }
  }
```
You successfully deploy a new storage account.
Which statements is true?
Select only one answer.
  + [ ] Accessing the data by using SAS tokens is enabled.
  + [ ] Accessing the data in the storage account is enabled for users that have the Storage Account Contributor role.
  + [x] Usage of Microsoft Entra authentication is enforced.
  + [ ] Usage of the storage account shared key is allowed.

    > Enforcing Microsoft Entra authentication prevents using shared keys, and leaves only data plane RBAC as an authentication option.
    {: .prompt-tip}

45. You need to implement a key management solution that supports importing keys generated in an on-premises environment. The solution must ensure that the keys stay within a single Azure region.
What should you do?
Select only one answer.
  + [ ] Apply the Keys should be the specified cryptographic type RSA or EC Azure policy.
  + [ ] Disable the Allow trusted services option.
  + [ ] Implement Azure Key Vault Firewall.
  + [x] Implement Azure Key Vault Managed HSM(Hardware Security Module).

    > Key Vault Managed HSM supports importing keys generated in an on-premise HSM. Also, managed HSM does not store or process customer data outside the Azure region in which the customer deploys the HSM instance. On-premises-generated keys are still managed, after implementing Key Vault Firewall. Enforcing HSM-backed keys does not enforce them to be imported. Disabling the Allow trusted services option does not have a direct impact on key importing.
    {: .prompt-tip}

46. You need to enable encryption at rest by using customer-managed keys (CMKs).
Which two services support CMKs? Each correct answer presents a complete solution.
Select all answers that apply.
  + [x] Azure Blob storage
  + [ ] Azure Disk Storage
  + [x] Azure Files
  + [ ] Azure NetApp Files
  + [ ] Log Analytics workspace

47. You have a storage account that contains multiple containers, blobs, queues, and tables.
You need to create a key to allow an application to access only data from a given table in the storage account.
Which authentication method should you use for the application?
Select only one answer.
  + [ ] SAS
  + [ ] shared
  + [x] service SAS
  + [ ] user delegation SAS
    
    > A SAS service is the only type of authentication that provides control at the table level. <br> User delegation SAS is only available for Blob storage. <br> SAS and shared allow access to the entire storage account.
    {: .prompt-tip}

48. You have an Azure Storage account.
You plan to prevent the use of shared keys by using Azure Policy.
Which two access methods will continue to work? Each correct answer presents a complete solution.
Select all answers that apply.
  + [ ] SAS account SAS
  + [ ] service SAS
  + [x] Storage Blob Data Reader role
  + [x] user delegation

    > The Storage Blob Data Reader role uses Microsoft Entra to authenticate. <br> User delegation SAS is a method that uses Microsoft Entra to generate a SAS. <br> Both methods work whether the shared keys are allowed or prevented. <br> Service SAS and account SAS use shared keys to generate.
    {: .prompt-tip}

49. You need to provide public anonymous access to a file in an Azure Storage account. The solution must follow the principle of least privilege.
Which two actions should you perform? Each correct answer presents part of the solution.
Select all answers that apply.
  + [x] For the container, set Public access level to Blob.
  + [ ] For the container, set Public access level to Container.
  + [ ] For the storage account, set Blob public access to Disabled.
  + [x] For the storage account, set Blob public access to Enabled.

    > Unless prevented by another setting, setting Public access level to Blob allows public access to the blob only. Setting Blob public access to Enabled is a prerequisite for setting the access level of container or blob. Setting Blob public access to Disabled prevents any public access and setting Public access level to Container also allows any current and future blobs in the container, which does not follow the principle of least privilege.
    {: .prompt-tip}

50. You have an Azure subscription that contains the following resources:
<br> A virtual machine named VM1 that has a network interface named NIC1
<br> A virtual network named VNet1 that has a subnet named Subnet1
<br> A public IP address named PubIP1
<br> A load balancer named LB1
<br> You create a network security group (NSG) named NSG1.
<br> To which two resources can you associate NSG1? Each correct answer presents a complete solution.
Select all answers that apply.
  + [ ] LB1
  + [x] NIC1
  + [ ] PubIP1
  + [x] Subnet1
  + [ ] VM1
  + [ ] VNet1

51. You need to allow only Microsoft Entra-authenticated principals to access an existing Azure SQL database.
Which three actions should you perform? Each correct answer presents part of the solution.
Select all answers that apply.
  + [x] Add a Microsoft Entra administrator.
  + [x] Assign your account the SQL Security Manager built-in role.
  + [ ] Connect to the database by using Microsoft SQL Server Management Studio (SSMS).
  + [x] Connect to the database by using the Azure portal.
  + [ ] Select Support only Microsoft Entra authentication for this server.
    
    > Adding a Microsoft Entra administrator and assigning your account the SQL Security Manager built-in role are prerequisites for enabling Microsoft Entra-only authentication. <br> A connection to the data plane of the logical server is not needed.
    {: .prompt-tip}


### Manage Identity and Access

1. Which feature of Microsoft Entra ID is primarily used to set up multi-factor authentication for enhanced security of user accounts?
  + [x] Conditional Access
  + [ ] Access Reviews
  + [ ] Security Groups
  + [ ] Directory Services


2. Your organization works with various partners and vendors. You want to allow these external users to access specific company resources without creating a user account for them in your domain. Which features of Microsoft Entra External ID should you leverage?
  + [x] B2B collaboration
  + [x] Azure AD B2C
  + [ ] Entra ID Joined Devices
  + [ ] Entra ID Group Memberships

3. An organization wants to set up alerts for suspicious activities, like multiple failed sign-in attempts. Which feature of Microsoft Entra ID can be used to achieve this?
  + [ ] Identity Governance
  + [ ] Entra ID Access Reviews
  + [x] Identity Protection
  + [ ] Entra ID Directory Roles

4. Which Microsoft service allows users to access several applications using a single set of credentials?
  + [ ] Entra ID Join
  + [ ] Entra ID Passwordless
  + [x] Microsoft Entra seamless single sign-on
  + [ ] Entra ID Password Protection

5. Your organization is looking to increase its security posture. Which of the following would you implement to reduce the reliance on passwords and increase account security?
  + [ ] Entra ID B2C
  + [x] Multi-factor Authentication (MFA)
  + [x] Passwordless Authentication
  + [ ] Entra ID Directory Roles

6. Which of the following is designed to ban certain passwords from being used, ensuring users avoid easily guessable and vulnerable passwords?
  + [ ] Entra ID Identity Protection
  + [ ] Entra ID Password Protection
  + [x] Global banned password list/Custom banned password list
  + [ ] Entra ID B2B

7. Which Azure service allows you to manage and provide time-limited access to Entra ID roles and Azure resources?
  + [ ] Entra Join
  + [ ] Entra Password Protection
  + [ ] Entra Conditional Access
  + [x] Entra Privileged Identity Management (PIM)

8. You are tasked with assigning roles for Azure resources and Entra ID. Which of the following can be used to assign built-in roles for both?
  + [ ] Entra ID User settings
  + [ ] Azure Policy
  + [x] Azure RBAC
  + [x] Microsoft Entra roles
  + [x] Entra Privileged Identity Management (PIM)

9. What is the primary use case for Azure Managed Identity and how does it enhance the security of Azure resources?
  + [x] Azure Managed Identity is primarily used to provide an Azure service with an automatically managed identity in Azure AD. It allows the service to authenticate to any service that supports Azure AD authentication, without needing credentials in the code, thereby enhancing security by eliminating the need for developers to manage credentials.
  + [ ] Azure Managed Identity is primarily used to increase the processing speed of Azure services and it enhances security by encrypting all data.
  + [ ] Azure Managed Identity is primarily used to provide a graphical user interface for managing Azure resources and it enhances security through multi-factor authentication.
  + [ ] Azure Managed Identity is primarily used to monitor the performance of Azure resources and it enhances security by regularly scanning for vulnerabilities.

10. You're setting up an application to use Microsoft Entra ID for authentication. Which of the following are essential components you would need to create or configure in Microsoft Entra ID?
  + [x] Application Registration
  + [x] OAuth 2.0
  + [ ] Azure Policy
  + [x] OpenID Connect

11. A developer needs to access Azure Blob Storage from an application without embedding credentials in the application. Which feature should you recommend for this purpose?
  + [ ] Security Principals
  + [ ] OAuth permission grants
  + [ ] Service Principals
  + [x] Managed Identities


12. A company has developed an enterprise application and wants to register it in Microsoft Entra ID. They also want to limit the application's access to specific resources. Which of the following should the developer configure?
  + [x] Service Principals
  + [x] Permission scopes
  + [ ] OAuth permission grants
  + [ ] Microsoft Entra Application Proxy

13. Which feature in Entra ID helps detect potential vulnerabilities affecting your organization's identities, configures automated responses, and investigates suspicious activities?
  + [ ] Microsoft Entra External ID
  + [ ] Entra Join
  + [ ] Microsoft Identity Platform
  + [x] Entra ID Identity Protection

14. Which of the following are considered best practices when securing users in Entra ID?
  + [x] Use strong authentication
  + [ ] Assign users Global Administrators
  + [x] Apply the Principle of Least Privilege
  + [ ] Use the same password for multiple applications
  + [x] Use Modern Authentication
  + [ ] Patching workstations
  + [ ] Using a secure network connection

15. In Entra ID, when should you consider using external identities?
  + [ ] When you want to merge two directories
  + [x] Consumer-Facing Apps
  + [ ] Security Concerns
  + [ ] Google Integration

16. Which feature in Entra ID provides a risk-based conditional access policy at the user level to secure against potential attacks on identities?
  + [ ] Microsoft Identity Manager
  + [ ] Sign-in risk-based Conditional Access policy
  + [ ] Microsoft Entra Verified ID
  + [x] User risk-based Conditional Access policy


17. For enhanced security, which of the following should you implement in conjunction with Entra ID?
  + [x] Passwordless authentication
  + [ ] Block users when they become risky
  + [x] Multi-factor authentication (MFA)
  + [ ] Using the same password for multiple applications

18. When integrating third-party applications with Entra ID, which feature ensures users do not need to remember additional passwords and reduces the number of prompts during authentication?
  + [ ] Passwordless Authentication
  + [ ] Conditional Access
  + [ ] Multi-factor authentication (MFA)
  + [x] Single Sign-On

19. Which of the following can be assigned roles in Azure?
  + [x] Service Principals
  + [ ] Guest users
  + [ ] Applications
  + [ ] Network Security Groups
  + [ ] External users

20. Which of the following tasks are associated with Microsoft Entra Privileged Identity Management (PIM)?
  + [x] Assigning time-limited role assignments
  + [ ] Automatically providing access to all users
  + [x] Conducting access reviews for users and groups
  + [ ] Configuring password reset policies
  + [ ] Implementing role-based access control

21. You are managing application registrations in Microsoft Entra ID. For a newly developed internal application, you need to ensure that only users within your organization can access the application. Which setting should you configure?
  + [ ] User assignment
  + [ ] Application properties
  + [x] Supported account types
  + [ ] Identity Provider Configuration

22. Which of the following are primary functions of service principals in the context of Entra ID?
  + [x] Serve as an identity for applications to interact with Entra ID
  + [x] Grant OAuth permissions for external apps
  + [x] Assign permissions to specific resources within Azure
  + [ ] Generate personal access tokens for users

23. A security administrator is securing users in Microsoft Entra ID. Which of the following is NOT a recommended practice?
  + [ ] Enabling multi-factor authentication (MFA)
  + [ ] Assigning privileged roles only when required
  + [x] Sharing user credentials between team members for easy access
  + [ ] Regularly reviewing sign-in logs for suspicious activities

24. You want to provide access to an application for partners who do not have accounts in your Entra ID tenant. Which of the following should you consider?
  + [ ] Internal identities
  + [ ] Managed identities
  + [x] B2B collaboration
  + [ ] External identities

25. Which of the following are features of Microsoft Entra Identity Protection?
  + [x] Risk-based conditional access policies
  + [ ] Vulnerability scans of Azure resources
  + [x] Investigate risk events using relevant and contextual information
  + [x] Leverage automated risk detection
  + [ ] Network security

26. A security administrator wants to enhance the organization's user identity verification process. Which feature in Microsoft Entra should be utilized?
  + [ ] Single Sign-On (SSO)
  + [x] Password Protection
  + [ ] Verified ID

    > Password Protection helps enhance security by preventing users from choosing weak or easily guessable passwords.
      {: .prompt-tip}

27. Which of the following authentication methods are considered passwordless?
  + [x] Microsoft Authenticator app
  + [ ] Security Questions
  + [x] FIDO2 security keys
  + [ ] SMS-based One-Time Password (OTP)
  + [x] Windows Hello for Business

28. Your organization is planning to centralize authentication for several applications. Which solution enables users to authenticate once and gain access to multiple applications?
  + [ ] Password Protection
  + [ ] Multi-Factor Authentication
  + [ ] Passwordless Authentication
  + [x] Single Sign-On (SSO)

29. You are tasked with assigning permissions to an Azure resource group. Which of the following is the most appropriate method to assign these permissions?
  + [ ] Assign a built-in role in Microsoft Entra ID
  + [ ] Configure Conditional Access policies
  + [x] Azure role-based access control (Azure RBAC)
  + [ ] Implement Microsoft Entra Permissions Management

30. A company is implementing enhanced security controls. Which of the following actions can help in managing temporary, 'just-in-time' elevated access to Azure resources and Microsoft Entra ID, and also periodically reviewing access rights?
  + [ ] Configure Azure role permissions for subscriptions
  + [ ] Implement Microsoft Entra Permissions Management
  + [x] Configure Microsoft Entra Privileged Identity Management (PIM)
  + [ ] Configure role management and access reviews in Microsoft Entra

31. You have a Microsoft Entra tenant that syncs with the on-premises Active Directory Domain Service (AD DS) domain and uses Microsoft Entra Domain Services.
You have an application that runs on user devices by using the credentials of the signed-in user. The application accesses data in Azure Files by using REST calls.
You need to configure authentication for the application in Azure Files by using the most secure authentication method.
Which authentication method should you use?
Select only one answer.
  + [ ] Microsoft Entra
  + [x] SAS
  + [ ] shared key
  + [ ] on-premises Active Directory Domain Service (AD DS)

    > Identify the option which supports REST API calls and which provides access to a single application.
    {: .prompt-tip}

32. You have an Azure subscription that contains a user named Admin1.
You need to ensure that Admin1 can access the Regulatory compliance dashboard in Microsoft Defender for Cloud. The solution must follow the principle of least privilege.
Which two roles should you assign to Admin1? Each correct answer presents part of the solution.
Select all answers that apply.
  + [ ] Global Reader
  + [x] Resource Policy Contributor
  + [x] Security Admin
  + [ ] Security Reader

33. You configure Microsoft Sentinel to connect to different data sources.
You are unable to configure a connector that uses an Azure Functions API connection.
Which permissions should you change?
Select only one answer.
  + [x] read and write permissions for Azure Functions
  + [ ] read and write permissions for the workspaces used by Microsoft Sentinel
  + [ ] read permissions for Azure Functions
  + [ ] read permissions for the workspaces used by Microsoft Sentinel

34. You have an Azure tenant that contains a user named User1 and an Azure key vault named Vault1. Vault1 is configured to use Azure role-based access control (RBAC).
You need to ensure that User1 can perform actions on keys in Vault1 but cannot manage permissions. The solution must follow the principle of least privilege.
Which role should you assign to User1?
Select only one answer.
  + [x] Key Vault Crypto Officer
  + [ ] Key Vault Crypto User
  + [ ] Key Vault Reader
  + [ ] Key Vault Secrets Officer
  + [ ] Key Vault Secrets User

35. You have a workload in Azure that uses a virtual machine named VM1. VM1 is in a resource group named RG1.
You need to create and assign an identity to VM1 that will be used to access Azure resources. Other virtual machines must be able to use the same identity.
Which PowerShell script should you run?
Select only one answer.
  + [ ] New-AzUserAssignedIdentity -ResourceGroupName RG1 -Name VMID $vm = Get-AzVM -ResourceGroupName RG1 -Name VM1 Update-AzVM -ResourceGroupName RG1 -VM $vm -IdentityType UserAssigned -IdentityID "/subscriptions/<SUBSCRIPTION ID>/resourcegroups/RG1/providers/Microsoft.ManagedIdentity/userAssignedIdentities/VM1"
  + [x] New-AzUserAssignedIdentity -ResourceGroupName RG1 -Name VMID $vm = Get-AzVM -ResourceGroupName RG1 -Name VM1 Update-AzVM -ResourceGroupName RG1 -VM $vm -IdentityType UserAssigned -IdentityID "/subscriptions/<SUBSCRIPTION ID>/resourcegroups/RG1/providers/Microsoft.ManagedIdentity/userAssignedIdentities/VMID"
  + [ ] $vm = Get-AzVM -ResourceGroupName RG1 -Name VM1 Update-AzVM -ResourceGroupName RG1 -VM $vm -IdentityType SystemAssigned
  + [ ] $vm = Get-AzVM -ResourceGroupName RG1 -Name VM1 Update-AzVM -ResourceGroupName RG1 -VM $vm -IdentityType SystemAssignedUserAssigned

36. You manage external guest users in a Microsoft Entra tenant. The tenant uses the default settings.
Which capability is available to the guest users?
Select only one answer.
  + [x] Invite other guests.
  + [ ] Read all directory information.
  + [ ] Read subscriptions.
  + [ ] Register new applications.

    > Guest cannot read all directory information, register new applications, or read subscriptions.
    {: .prompt-tip}
  
37. You manage Microsoft Entra tenant.
You disable the Users can register applications option in Microsoft Entra.
A user reports that they are unable to register an application.
You need to ensure that that the user can register applications. The solution must follow the principle of least privilege.
What should you do?
Select only one answer.
  + [x] Assign the Application Developer role to the user.
  + [ ] Assign the Authentication Administrator role to the user.
  + [ ] Assign the Cloud App Security Administrator role to the user.
  + [ ] Enable the Users can register applications option.

38. You create a web API and register the API as a Microsoft Entra application.
You need to expose a function in the API to ensure that administrators must provide consent to apps that use the API.
What should you add to your app registration?
Select only one answer.
  + [ ] a client application
  + [ ] a permission
  + [x] a scope
  + [ ] an application ID URI

    > A scope is used to request content to run a given function in an API. 
    {: .prompt-tip}

39. You are managing permission scopes for a Microsoft Entra app registration.
What are three OpenID Connect scopes that you can use? Each correct answer presents a complete solution.
Select all answers that apply.
  + [ ] address
  + [x] email
  + [x] offline_access
  + [x] openID
  + [ ] phone

40. You have an Azure SQL database, an Azure key vault, and an Azure App Service web app.
You plan to encrypt SQL data at rest by using Bring Your Own Key (BYOK).
You need to create a managed identity to authenticate without storing any credentials in the code. The managed identity must share the lifecycle with the Azure resource it is used for.
What should you implement?
Select only one answer.
  + [x] a system-assigned managed identity for an Azure SQL logical server
  + [] a system-assigned managed identity for an Azure web app
  + [ ] a system-assigned managed identity for Azure Key Vault
  + [ ] a user-assigned managed identity

41. You have a Microsoft Entra tenant that uses the default setting.
You need to prevent users from a domain named contoso.com from being invited to the tenant.
What should you do?
Select only one answer.
  + [ ] Deploy Microsoft Entra Privileged Identity Management (PIM).
  + [ ] Edit the Access review settings.
  + [x] Edit the Collaboration restrictions settings.
  + [ ] Enable security defaults.

42. You need to provide an administrator with the ability to manage custom RBAC roles. The solution must follow the principle of least privilege.
Which role should you assign to the administrator?
Select only one answer.
  + [ ] Contributor
  + [ ] Owner
  + [ ] Privileged Role Administrator
  + [x] User Access Administrator

    > User Access Administrator is the least privileged role that grants access to Microsoft.Authorization/roleDefinition/write. <br> Contributor does not have access to Microsoft.Authorization/roleDefinition/write. Privileged Role Administrator grants access to manage role assignments in Microsoft Entra, and all aspects of Microsoft Entra Privileged Identity Management (PIM). This is not an RBAC role.
    {: .prompt-tip}

43. You need to grant an application access to read connection strings stored in Azure Key Vault. The solution must follow the principle of least privilege.
Which role assignment should you use?
Select only one answer.
  + [ ] Key Vault Crypto Officer
  + [ ] Key Vault Reader
  + [ ] Key Vault Secrets Officer
  + [x] Key Vault Secrets User

    > Key Vault Secrets User allows read access to secret content. Key Vault Crypto Officer allows the user to perform actions on encryption keys, not secrets. Key Vault Reader allows the user to read the metadata of key vaults and its certificates, keys, and secrets, but not to read sensitive values, such as secret contents or key material. Key Vault Secrets Officer does not follow the principle of least privilege.
    {: .prompt-tip}

44. You need to delegate the ability to configure sign-in risk policies. The solution must follow the principle of least privilege.
Which role should you assign?
Select only one answer.
  + [ ] Authentication Administrator
  + [ ] Authentication Policy Administrator
  + [x] Conditional Access Administrator
  + [ ] Security Administrator

45. You need to provide an administrator with the ability to configure access reviews in Microsoft Entra Privileged Identity Management (PIM). The solution must follow the principle of least privilege.
Which role should you assign to the administrator?
Select only one answer.
  + [ ] Global Administrator
  + [ ] Privileged Authentication Administrator
  + [x] Privileged Role Administrator
  + [ ] Security Administrator

46. You have a Microsoft Entra tenant and an Amazon Web Services (AWS) account.
You plan to implement Microsoft Entra Permissions Management to manage the permissions granted to all the identities across Microsoft Entra ID and AWS.
You purchase the required license for Permissions Management.
You need to use Permissions Management to manage permissions in Microsoft Entra ID and AWS.
What should you configure first?
Select only one answer.
  + [ ] Azure subscription
  + [ ] Cloud Infrastructure Entitlement Management (CIEM) enterprise application
  + [ ] controller
  + [x] Data Collectors
  + [ ] Microsoft Entra role assignment

    > To start using Entra Permission Management you first need to configure data collection from the Permission Management portal. This will enable you to onboard services such as Azure, AWS and Google Cloud. All other items can be configured after you enable data collection.
    {: .prompt-tip}

  47. You have a Microsoft Entra tenant that uses the default settings.
You are configuring the Microsoft Entra External collaboration settings.
You need to ensure that only users that are assigned Microsoft Entra administrative roles can invite guests.
What should you do?
Select only one answer.
  + [ ] Enable security defaults.
  + [ ] In User Permissions, set Members can invite to No.
  + [x] Set Admins and users in the guest inviter role can invite to Yes.
  + [ ] Set Guest user access restrictions to Guest user access is restricted to properties and memberships of their own directory objects.

    > Setting Admins and users in the guest inviter role can invite to Yes allows users to invite guests. Security defaults do not affect guest invitation privileges. The Guest user access is restricted to properties and memberships of their own directory objects setting does not affect guests’ permissions to invite guests. Setting Members can invite to Yes allows non-admin members of your directory to invite guests. Another setting can still override this one.
    {: .prompt-tip}

48. You have an Azure key vault that is configured with Azure role-based access control permission model.
You need to ensure that a user can read and write keys to the Key Vault. The solution must follow the principle of least privilege.
Which role should you assign to the user?
Select only one answer.
  + [ ] Key Vault Certificates Officer
  + [x] Key Vault Crypto Officer
  + [ ] Key Vault Crypto Service Encryption User
  + [ ] Key Vault Secrets Officer

    > Key Vault Crypto Officer has all the permissions to the secrets in Key Vault. Key Vault Certificates Officer has all the permissions to certificates only, not keys. Key Vault Crypto Service Encryption User can only read keys. Key Vault Secrets Officer has all the permissions to secrets only.
    {: .prompt-tip}

49. You create an Azure role that contains the following permissions.
```
  "permissions": [
    {
      "actions": [
        "Microsoft.Network/publicIPAddresses/read",
        "Microsoft.Network/virtualNetworks/read",
        "Microsoft.Network/loadBalancers/read",
        "Microsoft.Network/networkInterfaces/read",
        "Microsoft.Compute/virtualMachines/*/read",
        "Microsoft.HybridCompute/machines/*/read"
      ],
      "notActions": [],
      "dataActions": [
        "Microsoft.Compute/virtualMachines/login/action"
      ],
      "notDataActions": []
    }
  ],
```
Which three actions can be performed by users that are assigned the role? Each correct answer presents a complete solution.
Select all answers that apply.

  + [x] Sign in as a regular user to a virtual machine in an Azure subscription.
  + [ ] Sign in as a regular user to an Azure Arc-connected virtual machine.
  + [ ] Sign in as an administrator to a virtual machine in an Azure subscription.
  + [ ] Sign in as an administrator to an Azure Arc-connected virtual machine.
  + [x] View the attributes of a virtual machine in an Azure subscription.
  + [x] View the attributes of an Azure Arc-connected virtual machine.

    > Microsoft.Compute/virtualMachines/*/read allows a user to view the attributes of a virtual machine in an Azure environment. <br> Microsoft.HybridCompute/Machines/*/read allows a user to view the attributes of a virtual machine in an Azure Arc subscription. <br> Microsoft.Compute/virtualMachines/login/action allows a user to sign in as a regular user to a virtual machine in an Azure subscription.
    {: .prompt-tip}

50. You are managing permission consent for Microsoft Entra app registration.
Which component displays the publisher domain?
Select only one answer.
  + [ ] app name
  + [ ] Microsoft 365 certification
  + [ ] publisher information
  + [x] publisher name and verification

    > The publisher displays more app info as it becomes available, including the publisher name, publisher domain, date created, certification details, and reply URLs. Publisher information, Microsoft 365 certification, and app name do not display publisher domain information.
    {: .prompt-tip}
  
51. You create an application named App1 in an Azure tenant.
You need to host the application as a multitenant application for any users in Azure, while restricting non-Azure accounts.
You need to allow administrators in other Azure tenants to add the application to their gallery.
Which CLI command should you run?
Select only one answer.
  + [ ] az ad app create –display-name app1 –sign-in-audience AzureADandPersonalMicrosoftAccount
  + [x] az ad app create –display-name app1--sign-in-audience AzureADMultipleOrgs
  + [ ] az webapp auth-classic update -r rg1 -n app1 --action LoginWithAzureActiveDirectory
  + [ ] az webapp auth openid-connect add -r rg1 -n app1 --provider-name p1

    > The CLI commands requiring a web app do not create a gallery entry for the application
    {: .prompt-tip}

52. You create a Microsoft Entra app registration.
You need to consent to the use of a given API in your app for all users.
What should you add to your app registration?
Select only one answer.
  + [ ] a client application
  + [x] a permission
  + [ ] a scope
  + [ ] an application ID URI

    > A permission allows the application to use a given API. A scope is used to request consent to run a given function on an API. An application ID URI does not handle permissions.
    {: .prompt-tip}

53. You have a sneaking suspicion that there are users trying to sign in to resources which are inaccessible to them.
You decide to create an Azure Log Analytics query to confirm your suspicions. The query will detect unsuccessful user sign-in attempts from the last few days.
You want to make sure that the results only show users who had failed to sign-in more than five times.
Which of the following should be included in your query?
  + [ ] The EventID and CountIf() parameters.
  + [ ] The ActivityID and CountIf() parameters.
  + [x] The EventID and Count() parameters.
  + [ ] The ActivityID and Count() parameters.

### Manage Security Operations
1. When creating and managing sensitive data such as API keys and database connection strings in Azure, which service should you primarily use?
  + [ ] Azure Blueprint
  + [ ] Azure Policy
  + [ ] Azure Landing Zone
  + [x] Azure Key Vault

2. Which of the following can be done using Azure Key Vault?
  + [x] Secrets Management
  + [ ] Deploying compliant environments
  + [x] Key Management
  + [ ] Assigning security policies at the subscription level
  + [x] Integrate with Other Azure Services

3. Within Microsoft Defender for Cloud, which feature provides a consolidated view of the security posture of your cloud environments, allowing you to assess your environment's security based on Microsoft's best practices?
  + [ ] Secure Inventory
  + [ ] External Attack Surface Management
  + [x] Secure Score
  + [ ] Compliance Framework
  + [ ] Vulnerability Assessment

4. You're responsible for ensuring that your organization's cloud infrastructure complies with industry standards. Which of the following tasks can you accomplish with Microsoft Defender for Cloud?
  + [x] Monitor external assets for vulnerabilities
  + [x] Add industry-specific regulatory standards
  + [ ] Connect to multi-cloud environments
  + [ ] Deploy resources in hybrid environments

5. You're setting up Microsoft Defender for Cloud to enhance the security posture of your organization's Azure services. Which of the following can you directly enable workload protection for?
  + [x] Azure Storage
  + [x] Azure Resource Manager
  + [ ] Entra ID
  + [x] Azure DNS
  + [x] Databases
  + [x] Servers

6. You're working as an Azure Security Specialist and have received an alert regarding a potential vulnerability on one of your servers. Which service in Microsoft Defender for Cloud should you use to evaluate this vulnerability scan?
  + [ ] Microsoft Defender for Storage
  + [ ] Microsoft Defender for Containers
  + [x] Microsoft Defender for Server
  + [ ] Microsoft Defender for Key Vault

7. You are managing a hybrid cloud environment with Entra ID and an on-premises Active Directory. You need to ensure that highly privileged Entra ID roles are only assigned when necessary and are automatically revoked after a specific period. Which Azure service or feature should you use to achieve this?
  + [x] Entra Privileged Identity Management (PIM)
  + [ ] Entra Conditional Access Policies
  + [ ] Entra Identity Protection
  + [ ] Entra Role-Based Access Control (RBAC)


8. You are asked to set up a monitoring solution for security events in your Azure environment. You decide to leverage Azure Monitor and Microsoft Sentinel. Which of the following actions would you take for a holistic monitoring solution?
  + [ ] Use Azure Monitor to collect data on application performance
  + [x] Configure data connectors in Microsoft Sentinel to integrate various data sources
  + [x] Create and customize analytics rules in Microsoft Sentinel to detect specific patterns
  + [ ] Modify Microsoft Defender for Cloud to integrate with Azure Monitor
  + [x] Configure Data Collection

9. You're tasked with enhancing the database security in your organization's Azure environment. To achieve this, you decide to utilize Microsoft Defender for Cloud capabilities specific to Azure SQL Database. Which of the following actions would be most appropriate to ensure the security of your Azure SQL Database?
  + [x] Enable Microsoft Defender for Azure SQL Database to detect potential vulnerabilities and threats
  + [ ] Implement workflow automation to automate DevOps processes
  + [ ] Configure Microsoft Defender for Containers to protect your SQL container deployments
  + [ ] Activate Microsoft Defender for App Service to monitor your database-hosted web apps

10. You've been assigned the task of enhancing the security posture of your Azure environment. You decide to leverage Microsoft Defender for Cloud. Which of the following actions would you take to ensure a holistic security configuration for your Azure resources?
  + [x] Enable Microsoft Defender for Storage to protect data within Blob Storage
  + [x] Configure Microsoft Defender for Servers to assess the health of your virtual machines
  + [ ] Use Microsoft Defender for Cloud to automate DevOps workflows
  + [x] Set up workflow automation in Microsoft Defender for Cloud to automate responses to specific security alerts
  + [ ] Neglecting Non-Azure Resources


11. You are tasked with monitoring and protecting your external assets in Azure. You also want to add custom compliance initiatives tailored to your organization's requirements. Which of the following actions would you take?
  + [x] Use Microsoft Defender External Attack Surface Management to identify and monitor external assets
  + [x] Add custom initiatives in Microsoft Defender for Cloud
  + [ ] Implement Azure Inventory for external asset monitoring
  + [ ] Add industry standards using Azure Multi-cloud Connector

12. Your organization needs to assess its Azure resources for compliance against various security frameworks. Which of the following Azure services provides security best practices and makes recommendations based on your Azure configurations?
  + [ ] Microsoft Defender External Attack Surface Management
  + [ ] Azure Inventory
  + [ ] Microsoft Defender for Cloud Secure Score
  + [x] Azure Advisor

13. You are setting up a secure infrastructure for your organization's data in Azure. Which of the following actions are critical to ensuring the confidentiality, integrity, and availability of your secrets and cryptographic keys?
  + [x] Create and configure an Azure Key Vault
  + [ ] Deploy resources using a landing zone
  + [x] Enable key rotation for stored keys
  + [ ] Use Azure Blueprint to assign a landing zone
  + [x] RBAC for management plane


14. You are tasked with ensuring that your organization's Azure resources are compliant with company standards. Using Azure services, which tool would allow you to evaluate the configuration settings of Azure resources against defined requirements?
  + [ ] Azure Blueprint
  + [ ] Azure Key Vault
  + [x] Azure Policy
  + [ ] Azure Landing Zone


15. You need to centralize the management of security configurations for multiple Azure subscriptions. Which Azure service should you utilize to ensure consistent application of configurations?
  + [x] Azure Management Groups
  + [ ] Azure Policy
  + [ ] Azure Blueprint
  + [ ] Azure Landing Zone

16. Your company is deploying an application that requires a secure way to manage application secrets. You are asked to set up a solution that allows for secure secret management, certificate management, and the ability to automate the backup and recovery of these items. Which of the following should you configure?
  + [ ] Azure Blueprint
  + [x] Azure Key Vault
  + [x] Configure key rotation in Azure Key Vault
  + [ ] Recovery Services Vault
  + [ ] Azure Backup
  + [x] Configure backup and recovery in Azure Key Vault

17. You're assessing the overall security posture of your Azure environment. Which tool in Azure provides you with a numeric value indicating the percentage of security best practices you've adhered to?
  + [ ] Azure Security Center Alerts
  + [ ] Microsoft Defender for Cloud Secure Score
  + [ ] Azure Compliance Manager
  + [x] Azure Advisor Score


18. You are working on enhancing the compliance metrics for your organization in Microsoft Defender for Cloud. You need to both evaluate compliance against the GDPR framework and add a custom security measure. Which of the following steps should you undertake?
  + [x] Assess compliance against security frameworks in Microsoft Defender for Cloud
  + [x] Add a GDPR standard to Microsoft Defender for Cloud
  + [x] Add custom initiatives to Microsoft Defender for Cloud
  + [ ] Monitor Azure Security Center Alerts
  + [ ] Remove the current GDPR standard for Microsoft Defender for Cloud
  + [ ] Install the Microsoft Defender for Cloud agent

19. You are tasked with enhancing the security of various Azure services in your organization. Which of the following actions can you perform using Microsoft Defender for Cloud?
  + [x] Enable Microsoft Defender for Azure SQL Database
  + [x] Respond to security alerts generated by Microsoft Defender for Cloud
  + [ ] Configure a Virtual Network Gateway in Azure
  + [x] Evaluate vulnerability scans from Microsoft Defender for Server
  + [x] Automate workflows in response to threats detected by Microsoft Defender for Cloud
  + [ ] Install the Microsoft Defender for Cloud agent


20. You are an Azure security specialist who has been tasked with setting up and maintaining security monitoring within the organization. Which of the following tasks can be accomplished with Microsoft Sentinel?
  + [x] Monitor security events using Azure Monitor Logs
  + [x] Automate response to specific security threats
  + [x] Customize analytics rules to identify potential threats
  + [ ] Setting up a cross-Workspace Capability
  + [x] Evaluate and manage generated alerts

21. Your company has deployed several Azure virtual networks. You are tasked with implementing a solution to monitor and analyze the network traffic to and from these virtual networks, specifically for detecting any advanced security threats.
  + [ ] Azure Firewall with threat intelligence-based filtering
  + [ ] Azure Network Security Groups (NSGs)
  + [ ] Azure Application Gateway with Web Application Firewall (WAF)
  + [x] Azure Sentinel with the integration of Azure Network Watcher
  
22. You are operating in a cloud-only environment. Users have computers that run either Windows 10 or 11. The users are located across the globe. You need to secure access to a point-to-site (P2S) VPN by using multi-factor authentication (MFA). Which authentication method should you implement? Select only one answer. 
  + [ ] Authenticate by using Active Directory Domain Services (AD DS).
  + [x] Authenticate by using native Microsoft Entra authentication.
  + [ ] Authenticate by using native Azure certificate-based authentication.
  + [ ] Authenticate by using RADIUS.

23. You have an Azure subscription that contains a network security group (NSG) named NSG1. You plan to add a security rule named Rule1 to NSG1 that will allow incoming RDP traffic. You need to ensure that the other security rules of NSG1 cannot override Rule1. Which priority setting should you use for Rule1? Select only one answer.
  + [ ] 0
  + [ ] 1
  + [x] 100
  + [ ] 1,000
  + [ ] 65,000

24. You have a virtual network that contains an Azure Kubernetes Service (AKS) workload and an internal load balancer. Multiple virtual networks are managed by multiple teams. You are unable to change any of the IP addresses. You need to ensure that clients from virtual networks in your Azure subscription can access the AKS cluster by using the internal load balancer. What should you do? Select only one answer.
  + [ ] Create a private link endpoint on the virtual network and instruct users to access the cluster by using a private link endpoint on their virtual network.
  + [x] Create a private link service on the virtual network and instruct users to access the cluster by using a private link endpoint in their virtual networks.
  + [ ] Create virtual network peering between the virtual networks to allow connectivity.
  + [ ] Create VPN site-to-site (S2S) connections between the virtual networks to allow connectivity.

25. You have an Azure subscription that contains a virtual machine named VM1 and a storage account named storage1. You need to ensure that VM1 can access storage1 over the Azure backbone network. What should you implement? Select only one answer.
  + [ ] a subnet
  + [ ] a VPN gateway
  + [ ] private endpoints
  + [x] service endpoints

26. You have an Azure subscription that contains the following resources: 
    <br> A web app named WebApp1 in the West US Azure region
    <br> A virtual network named VNet1 in the West US 3 Azure region
    <br> You need to integrate WebApp1 with VNet1.
<br>What should you implement first? Select only one answer.
  + [ ] a service endpoint
  + [x] a VPN gateway
  + [ ] Azure Front door
  + [ ] peering

    > WebApp1 and VNet1 are in different regions and cannot use regional integration; you can use only gateway-required virtual network integration.
    {: .prompt-tip }

27. You host a web app on an Azure virtual machine. Users access the app through a public load balancer.
You need to offload SSL traffic to the web app at the edge.
What should you do?
Select only one answer.
  + [ ] Configure an Azure firewall and switch access to the app via an internal load balancer.
  + [ ] Configure Azure Application Gateway.
  + [x] Configure Azure Front Door and switch access to the app via an internal load balancer.
  + [ ] Configure Azure Traffic Manager with performance traffic routing.

28. You have an Azure subscription that contains a web app named WebApp1.
You need to recommend a web traffic security and management solution. The solution must meet the following requirements:
Support SSL off-loading.
Provide host header routing.
Provide application load balancing
What should you include in the recommendation?
Select only one answer.
  + [x] Azure Application Gateway
  + [ ] Azure Front Door
  + [ ] Azure Load Balancer
  + [ ] Azure Traffic Manager

29. You have an Azure subscription that contains an Azure container registry named ACR1 and a user named User1.
You need to ensure that User1 can administer images in ACR1. The solution must follow the principle of least privilege.
Which two roles should you assign to User1? Each correct answer presents part of the solution.
Select all answers that apply.
  + [x] AcrDelete
  + [ ] AcrImageSigner
  + [ ] AcrPull
  + [x] AcrPush
  + [ ] Contributor
  + [ ] Reader

    > To administer images in ACR1, a user must be able to push and pull images to ACR1 and delete images from ACR1.
    {: .prompt-tip }

30. You have an Azure subscription that contains an Azure Kubernetes Service (AKS) cluster named AKS1 and a user named User1.
You need to ensure that User1 has access to AKS1 secrets. The solution must follow the principle of least privilege.
Which role should you assign to User1?
Select only one answer.
  + [ ] Azure Kubernetes Service RBAC Admin
  + [ ] Azure Kubernetes Service RBAC Cluster Admin
  + [ ] Azure Kubernetes Service RBAC Reader
  + [x] Azure Kubernetes Service RBAC Writer

    > Azure Kubernetes Service RBAC Reader does not have access to secrets.
    {: .prompt-tip } 

31. You have an Azure subscription.
You plan to use the az aks create command to deploy an Azure Kubernetes Service (AKS) cluster named AKS1 that has Microsoft Entra integration.
You need to ensure that local accounts cannot be used on AKS1.
Which flag should you use with the command?
Select only one answer.
  + [x] disable-local-accounts
  + [ ] generate-ssh-keys
  + [ ] kubelet-config
  + [ ] windows-admin-username

32. You create an Azure policy by using the following snippet.
```
"then": {
    "effect": "",
    "details": [{
        "field": "Microsoft.Storage/storageAccounts/networkAcls.ipRules",
        "value": [{
            "action": "Allow",
            "value": "134.5.0.0/21"
        }]
    }]
}
```
You need to ensure that the policy is applied whenever a new storage account is created or updated. There is no managed identity assigned to the policy initiative.
Which effect should you use?
Select only one answer.
  + [x] Append
  + [ ] Audit
  + [ ] DeployIfNotExists
  + [ ] Modify

    > We need an option to add property to the storage account. DeployIfNotExists is used to deploy resources.
    {: .prompt-tip}


33. You create a new Azure subscription.
You need to ensure that all the resources created in the subscription have a tag named CostCenter and an associated value.
You create a custom policy that uses the following snippet.
```
  "if": {
    "allOf": [{
        "field": "type",
        "equals": "Microsoft.Resources/subscriptions/resourceGroups"
      },
      {
        "field": "tags['CostCenter']",
        "exists": false
      }
    ]
  },
  "then": {
    "effect": ""
  }
```
Which effect should you use in line 13?
Select only one answer.
  + [ ] Append
  + [ ] DeployIfNotExists
  + [x] Deny
  + [ ] Modify

    > We need to deny creation if the tag does not exist.
    {: .prompt-tip}

34. You are configuring an Azure Policy in your environment.
You need to ensure that any resources that are missing a tag named CostCenter inherit a value from a resource group.
You create a custom policy that uses the following snippet.
```
  "policyRule": {
      "if": {
          "field": "tags['CostCenter']",
          "exists": "false"
      },
      "then": {
          "effect": "modify",
          "details": {
              "roleDefinitionIds": [
                  "/providers/microsoft.authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c"
              ],
              "operations": [{
                  "operation": "addOrReplace ",
                  "field": "tags['CostCenter']",
                  "value": "[resourcegroup().tags['CostCenter']]"
              }]
          }
      }
  }
```
Which policy mode should you use?
Select only one answer.
  + [ ] all
  + [ ] Append
  + [ ] DeployIfNotExists
  + [x] indexed

35. You have an Azure subscription.
You need to recommend a solution that uses crawling technology of Microsoft to discover and actively scan assets within an online infrastructure. The solution must also discover new connections over time.
What should you include in the recommendation?
Select only one answer.
  + [ ] a Microsoft Defender for Cloud custom initiative
  + [x] Microsoft Defender External Attack Surface Management (EASM)
  + [ ] Microsoft Defender for Servers
  + [ ] the Microsoft cloud security benchmark (MCSB)

36. You plan to scan all the virtual machines in an Azure subscription for vulnerabilities by using Microsoft Defender for Cloud.
You need to deploy the necessary agents by using the least amount of administrative effort.
What should you do?
Select only one answer.
  + [ ] Assign a custom Azure policy that uses a DeployIfNotExists rule to the subscription.
  + [ ] Enable the Microsoft Defender for Cloud plans option in the Environment settings of Defender for Cloud.
  + [ ] Execute the remediation steps from the Machines should have vulnerability findings resolved recommendation in the Recommendations settings of Defender for Cloud.
  + [x] Turn on the vulnerability assessment for machines in the Environment settings of Defender for Cloud.

37. You set Periodic recurring scans to ON while implementing a Microsoft Defender for SQL vulnerability assessment.
How often will the scan be triggered?
Select only one answer.
  + [ ] at a recurrence that you configure
  + [ ] once a day
  + [ ] once a month
  + [x] once a week

    > This is the default value set by Microsoft and cannot be changed
    {: .prompt-tip}

38. You are implementing Microsoft Defender for SQL vulnerability assessments.
In which two locations can users view the results? Each correct answer presents a complete solution.
Select all answers that apply.
  + [x] an Azure Blob storage account
  + [ ] an Azure Event Grid instance
  + [x] Microsoft Defender for Cloud
  + [ ] Microsoft Teams

39. You configure a Linux virtual machine to send Syslog data to Microsoft Sentinel.
You notice that events for the virtual machine are duplicated in Microsoft Sentinel.
You need to ensure that the events are not duplicated.
Which two actions should you perform? Each correct answer presents part of the solution.
Select all answers that apply.
  + [x] Disable the synchronization of the Log Analytics agent with the Syslog configuration in Microsoft Sentinel.
  + [ ] Disable the Syslog daemon from listening to network messages.
  + [ ] Enable the Syslog daemon to listen to network messages.
  + [x] Remove the entry used to send CEF messages from the Syslog configuration file for the virtual machine.
  + [ ] Stop the Syslog daemon on the virtual machine.

    > Stopping the Syslog daemon on the virtual machine will stop the virtual machine from sending both Syslog and CEF messages
    {: .prompt-tip}

40. You have custom alert rules in Microsoft Sentinel. The rules exceed the query length limitations.
You need to resolve the issue.
Which function should you use for the rule?
Select only one answer.
  + [ ] ADX functions
  + [ ] Azure functions with a timer trigger
  + [ ] stored procedures
  + [x] user-defined functions

    > You can use user-defined functions to overcome the query length limitation.
    {: .prompt-tip}

41. You are collecting Azure activity logs to Azure Monitor. The retention period for Azure Monitor logs is set to 30 days.
To meet compliance requirements, you need to send a copy of the Azure activity logs to your SOC partner.
What should you do?
Select only one answer.
  + [ ] Configure a workspace retention policy.
  + [ x Configure diagnostic settings and send the logs to Azure Event Hubs.
  + [ ] Configure diagnostic settings and send the logs to Azure Storage.
  + [ ] Install the Microsoft Sentinel security information and event management (SIEM) connector.

    > Configuring diagnostic settings and sending the logs to Event Hubs will enable log export to the SOC partner. Configuring a workspace retention policy and diagnostic settings and sending the logs to Azure Storage does not export the logs outside of Azure. Installing the SIEM connector enables Microsoft Sentinel to import the logs from the on-premises SIEM.
    {: .prompt-tip}

42. You are designing an Azure solution that stores encrypted data in Azure Storage.
You need to ensure that the keys used to encrypt the data cannot be permanently deleted until 60 days after they are deleted. The solution must minimize costs.
What should you do?
Select only one answer.
  + [ ] Store keys in an HSM-protected key vault that has soft delete and purge protection enabled.
  + [ ] Store keys in an HSM-protected key vault that has soft delete enabled.
  + [x] Store keys in a software-protected key vault that has soft delete and purge protection enabled.
  + [ ] Store keys in a software-protected key vault that has soft delete enabled and purge protection disabled.

    > Software-protected key vaults are less expensive than HSM-protected key vaults. Purge protection prevents keys from being permanently deleted for a certain number of days.
    {: .prompt-tip}

43. You configure Microsoft Entra to use multi-factor authentication (MFA) by using the Microsoft Authenticator app.
You need to ensure that users are required to use the Microsoft Authenticator app when accessing Azure from new devices or locations.
Which type of Microsoft Entra ID Protection policy should you configure?
Select only one answer.
  + [ ] sign-in risk policy with administrator remediation
  + [x] sign-in risk policy with self-remediation
  + [ ] user risk policy with administrator remediation
  + [ ] user risk policy with self-remediation

    > User risk policies are triggered for users that have specific risk levels due to issues such as password leaks.
    {: .prompt-tip}

44. You need to configure passwordless authentication. The solution must follow the principle of least privilege.
Which role should assign to complete the task?
Select only one answer.
  + [ ] Authentication Administrator
  + [ ] Authentication Policy Administrator
  + [x] Global Administrator
  + [ ] Security Administrator

45. You have a Microsoft Entra tenant.
You need to recommend a passwordless authentication method. The solution must support near-field communication (NFC) devices.
Which two authentication methods should you recommend? Each correct answer presents a complete solution.
Select all answers that apply.
  + [x] FIDO2 security keys
  + [ ] OATH software tokens
  + [ ] voice call verification
  + [x] Windows Hello for Business

46. You have an Azure subscription.
You plan to deploy Microsoft Entra Verified ID.
You need to identify which administrative roles are required for the solution. The solution must follow the principle of least privilege.
Which three roles should you identify? Each correct answer presents part of the solution.
Select all answers that apply.
  + [x] Application Administrator
  + [x] Authentication Policy Administrator
  + [x] Contributor
  + [ ] Global Administrator
  + [ ] Privileged Authentication Administrator
  + [ ] User Administrator

    > The Authentication Policy Administrator role can configure policies and create and manage verified credentials. The Application Administrator role is used to complete app registrations, including granting admin consent. The Contributor role is required to manage all the resources in the subscription. 
    {: .prompt-tip}

47. You have a Microsoft Entra tenant.
You need to recommend a passwordless authentication solution.
Which three authentication methods should you include in the recommendation? Each correct answer presents a complete solution.
Select all answers that apply.
  + [x] FIDO2 security keys
  + [ ] OATH software tokens
  + [ ] SMS verification
  + [x] the Microsoft Authenticator app
  + [ ] voice call verification
  + [x] Windows Hello for Business

    > The remaining options do not support passwordless authentication.
    {: .prompt-tip}

48. You need to ensure that users signing in to the Azure portal are prompted to sign in every 48 hours.
What should you configure?
Select only one answer.
  + [ ] Microsoft Entra Privileged Identity Management (PIM)
  + [ ] Conditional Access App Control
  + [ ] Conditional Access Persistent browser session
  + [x] Conditional Access Sign-in frequency


49. You are evaluating the Azure Policy configurations to identify any required custom initiatives and policies.
You need to run workloads in Azure that are compliant with the following regulations:
FedRAMP High
PCI DSS 3.2.1
GDPR
ISO 27001:2013
For which regulation should you create custom initiatives?
Select only one answer.
  + [ ] FedRAMP High
  + [x] GDPR
  + [ ] ISO 27001:2013
  + [ ] PCI DSS 3.2.1

    > GDPR compliance initiatives are not yet available in Azure.
    {: .prompt-tip}

50. You need to implement an Azure Policy initiative to monitor and enforce compliance for a payment processing service.
Which policy initiative should you use?
Select only one answer.
  + [ ] Azure Security Benchmark
  + [ ] CIS controls
  + [ ] NIST SP 800-53
  + [x] PCI DSS

    > The PCI DSS standard covers credit card payment processing. Azure Security Benchmark controls are part of generic Azure Security Benchmark and are not industry specific. The CIS and NIST controls are not industry specific.
    {: .prompt-tip}

51. You have an Azure subscription.
You need to assign a security policy to the subscription.
Which Microsoft Defender for Cloud setting should you use?
Select only one answer.
  + [x] Environment settings
  + [ ] Security posture
  + [ ] Security solutions
  + [ ] Workload protections


52. You have a data connector for Microsoft Sentinel.
You need to configure the connector to collect logs from Conditional Access in Microsoft Entra.
Which log should you connect to Microsoft Sentinel?
Select only one answer.
  + [x] activity logs
  + [x] audit logs
  + [x] provisioning logs
  + [x] sign-in logs

53. You have an Azure subscription that contains a web app named WebApp1 and a virtual network named VNet1.
VNet1 contains the following subnets:
<br> Subnet1: Connected to a virtual machine
<br> Subnet2: Has a Microsoft.Storage service endpoint
<br> Subnet3: Has subnet delegation to the Microsoft.Sql/managedInstances service
<br> Subnet4: Has no additional configurations
<br> You need to integrate WebApp1 with VNet1.
To which subnets can you connect WebApp1?
Select only one answer.
  + [ ] Subnet4 only
  + [x] Subnet2 and Subnet4 only
  + [ ] Subnet3 and Subnet4 only
  + [ ] Subnet2, Subnet3, and Subnet4 only
  + [ ] Subnet1, Subnet2, Subnet3, and Subnet4

    > You can integrate a web app only to a dedicated subnet of a virtual network that does not have any connected resources. The subnet can have service endpoints, but subnet delegation should either not be configured or must be configured to the Microsoft.Web/serverFarms service
    {: .prompt-tip}

54. You are designing a solution that must meet FIPS 140-2 Level 3 compliance in Azure.
Where should the solution maintain encryption keys.
Select only one answer.
  + [x] a managed HSM
  + [ ] a software-protected Azure key vault
  + [ ] an Azure SQL Manage Instance database
  + [ ] an HSM-protected Azure key vault

    > A managed HSM is level 3-compliant. An HSM-protected key vault is level 2-compliant. A software-protected key vault is level 1-complaint. SQL is not FIPS 104-2 level 3 compliant.
    {: .prompt-tip}

55. You are configuring automatic key rotation for an encryption key stored in Azure Key Vault.
You need to implement an alert to be triggered five days before the keys are rotated.
What should you use?
Select only one answer.
  + [ ] an action group alert
  + [ ] Application Insights
  + [x] Azure Event Grid
  + [ ] Microsoft Defender for Key Vault

    > Using Event Grid triggers the Microsoft.KeyVault.CertificateNearExpiry event. Key Vault cannot be monitored by using Application Insights. Defender for Key Vault is used to alert for unusual and unplanned activities. Key Vault key expiration cannot be monitored by using action group alerts.
    {: .prompt-tip}

56. You have a Linux virtual machine in an on-premises datacenter that is used as a forwarder for Microsoft Sentinel by using CEF-formatted logs.
The timestamp on events retrieved from the forwarder is the time the agent on the forwarder received the event, not the time the event occurred on the system it came from.
You need to ensure that Microsoft Sentinel receives the time the event was generated.
What should you do?
Select only one answer.
  + [ ] Run cef_gather_info.py on CEF forwarder.
  + [ ] Run cef_gather_info.py on each system that sends events to the forwarder.
  + [ ] Run TimeGenerated.py on each system that sends events to the forwarder.
  + [x] Run TimeGenerated.py on the CEF forwarder.

57. Your company uses Azure DevOps with branch policies configured.
Which of the following is TRUE with regards to branch policies? (Choose all that apply.)
  + [x] It enforces your team's change management standards.
  + [ ] It controls who can read and update the code in a branch.
  + [x] It enforces your team's code quality.
  + [ ] It places a branch into a read-only state.