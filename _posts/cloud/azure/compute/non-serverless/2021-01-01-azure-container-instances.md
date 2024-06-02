---
layout: post
title: Azure Container Instances
categories: [cloud, azure, compute, non-serverless]
tags: [Cloud, Azure, Compute, Non-Serverless]
---

## Introduction
- Azure Container Instances (ACI) is a service that allows you to run Docker containers on Azure without managing the underlying infrastructure. 
- ACI is designed for simplicity and rapid deployment, making it ideal for scenarios where you need to quickly run containers without the overhead of provisioning and managing VMs or orchestrators like Kubernetes.

### Key Features of Azure Container Instances
1. `Fast Startup`: Quickly deploy and run containers without the need to manage VMs or orchestrators.
2. `Public and Private Network Options`: Deploy containers with a public IP address or within a private virtual network.
3. `Custom Sizes`: Specify the exact amount of CPU cores and memory you need.
4. `Linux and Windows Support`: Run both Linux and Windows containers.
5. `Persistent Storage`: Attach Azure File shares to your containers to persist data.
6. `Secure`: Integrate with Azure Active Directory, Managed Identity, and virtual networks for secure deployment.
7. `Billing Per Second`: Pay only for the resources you use, billed per second.

### Environmental Variables
- When creating or updating a container instance, specify environment variables in the "Environment variables" section.


