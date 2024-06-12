---
layout: post
title: Azure - Secure Hybrid Network
categories: [cloud, azure, networking]
tags: [Cloud, Azure, Networking]
---

## Introduction
- This reference architecture shows a secure hybrid network that extends an on-premises network to Azure. The architecture implements a perimeter network, also called a DMZ, between the on-premises network and an Azure virtual network. 
- All inbound and outbound traffic passes through Azure Firewall.

![Secure Hybrid Network](/assets/img/cloud/azure/secure-hybrid-network-dmz.png)

- The architecture consists of the following aspects:
    + 1. `On-premises network` - A private local-area network implemented in an organization.
    + 2. `Azure virtual network` - The virtual network hosts the solution components and other resources running in Azure. Virtual network routes define the flow of IP traffic within the Azure virtual network. In the diagram, there are two user-defined route tables.
    + 3. `Gateway` - The gateway provides connectivity between the routers in the on-premises network and the virtual network. The gateway is placed in its own subnet.
    + 4. `Azure Firewall` - Azure Firewall is a managed firewall as a service. The Firewall instance is placed in its own subnet.
    + 5. `Network security groups` - Use security groups to restrict network traffic within the virtual network.
    + 6. `Azure Bastion` - Azure Bastion allows you to log into virtual machines (VMs) in the virtual network through SSH or remote desktop protocol (RDP) without exposing the VMs directly to the internet. Use Bastion to manage the VMs in the virtual network.