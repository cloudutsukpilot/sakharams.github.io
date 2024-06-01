---
layout: post
title: Azure - Blob Storage
categories: [cloud, azure]
tags: [Cloud, Azure]
---

## Introduction
- Azure Blob Storage is a service for storing large amounts of unstructured data, such as text or binary data, that can be accessed via HTTP or HTTPS. 
- It is optimized for storing massive amounts of data and provides scalability, security, and cost-efficiency.

### Different Types of Azure Blob Storage
1. **Block Blobs**
- `Purpose`: Stores text and binary data, ideal for large objects like media files, documents, and backups.
- `Features`: Supports uploading large files efficiently in smaller blocks and can manage individual blocks.

2. **Append Blobs**
- `Purpose`: Optimized for append operations, suitable for log data and data streaming scenarios.
- `Features`: Designed for scenarios where data is added sequentially, such as logging or data collection.

3. **Page Blobs**
- `Purpose`: Stores random-access files, ideal for use as disks for virtual machines (Azure VMs).
- `Features`: Supports frequent read/write operations, making it suitable for disk storage and other I/O intensive applications.

4. **Immutable Blob Storage** 
- Immutable Blob Storage is a feature in Azure Blob Storage that allows you to store data in a write-once, read-many (WORM) manner, ensuring that once data is written, it cannot be modified or deleted for a specified retention period. 
- This feature is commonly used for compliance, regulatory, and data protection purposes, where data integrity and immutability are critical requirements.