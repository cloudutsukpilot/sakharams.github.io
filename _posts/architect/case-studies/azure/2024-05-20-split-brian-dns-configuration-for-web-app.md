---
layout: post
title: Architectures - Use a split-brain DNS configuration to host a web app in Azure
categories: [cloud, azure]
tags: [Projects, Cloud, Azure]
---


#### Problem:

A company needs to host a web application with distinct traffic management for public and private users. The current infrastructure struggles with security, performance, and reliability, particularly in differentiating internal and external traffic routes.

#### Objective:

Implement a split-brain DNS architecture to:

Ensure secure, high-performance routing for public and private users.
Utilize Azure Front Door for public access and Azure Application Gateway for private access.
Integrate Azure DNS and ExpressRoute for seamless and secure traffic management.

#### Solution:

Reference:
Use a split-brain DNS configuration to host a web app in Azure
https://learn.microsoft.com/en-us/azure/architecture/example-scenario/networking/split-brain-dns
