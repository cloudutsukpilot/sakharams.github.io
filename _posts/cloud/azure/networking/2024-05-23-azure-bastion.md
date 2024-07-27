---
layout: post
title: Azure - Bastion
categories: [cloud, azure, networking]
tags: [Cloud, Azure, Networking]
---

## Introduction
- Azure Bastion is a fully managed service that provides secure and seamless RDP (Remote Desktop Protocol) and SSH (Secure Shell) connectivity to virtual machines (VMs) directly through the Azure portal. 
- It eliminates the need for exposing VMs to the public internet, thereby enhancing security. 

### Key Features of Azure Bastion
1. `Secure Access`:
- Provides secure and seamless RDP and SSH connectivity to your VMs without exposing them to the public internet.
- Uses SSL to protect the remote connection, ensuring a secure communication channel.

2. `Managed Service`:
- Fully managed by Azure, which means you don't need to worry about managing the infrastructure or scaling the service.

3. `No Public IP Needed`:
- VMs do not require public IP addresses for remote access. This reduces the attack surface by keeping your VMs within your private virtual network.

4. `Browser-Based Access`:
- You can access your VMs directly through the Azure portal using a web browser, eliminating the need for any additional RDP or SSH clients.

5. `Network Security`:
- Integrates with Azure Network Security Groups (NSGs) to provide additional layers of security.
- Ensures that all traffic remains within the Azure backbone network, enhancing security and reducing exposure to potential threats.

### Benefits of Using Azure Bastion
1. `Enhanced Security`:
- Reduces exposure to potential attacks by eliminating the need for public IP addresses on your VMs.
- Provides a secure, encrypted connection over SSL.
2. `Simplified Management`:
- Simplifies remote access to your VMs, as you can use the Azure portal for RDP and SSH sessions.
- Eliminates the need to manage and maintain jump boxes or bastion hosts.

3. `Cost-Effective`:
- Reduces costs associated with maintaining additional infrastructure for secure remote access.
- Pricing is based on the number of instances and the duration of use, allowing for cost-effective scaling.

4. `Seamless Integration`:
- Integrates seamlessly with your existing Azure environment, providing a consistent and unified experience for managing and accessing VMs.

### How It Works
1. `Deployment`:
- Deploy Azure Bastion to your virtual network. This creates a bastion host in a dedicated subnet called "AzureBastionSubnet".
- Ensure the subnet has the appropriate NSG rules to allow inbound and outbound traffic for Azure Bastion.

2. `Accessing VMs`:
- Once deployed, you can use the Azure portal to connect to any VM in the virtual network via RDP or SSH.
- Simply navigate to the VM in the Azure portal and click "Connect" to start an RDP or SSH session through Azure Bastion.

### AzureBastionSubnet 
- Is a specific subnet within an Azure virtual network that is required for deploying the Azure Bastion service.
- Provides a dedicated, isolated, and secure environment for the service.