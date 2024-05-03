---
layout: post
title: Cloud Architect
categories: [cloud]
tags: [Cloud, Architect]
---

Architecture Styles:

Architecture style             Description
N-tier    N-tier is a traditional architecture for enterprise applications where dependencies are managed by dividing the application into layers that perform logical functions, such as presentation, business logic, and data access. 
Web-queue-worker         In this style, the application has a web front end that handles HTTP requests and communicates over asynchronous message queue with a back-end worker that performs CPU-intensive tasks or long-running operations. 
Microservices     A microservices application is composed of many small, independent services which are loosely coupled and communicate using APIs.
Event-driven architecture              Event-Driven Architectures use a publish-subscribe (pub-sub) model, where producers publish events, and consumers subscribe to them. 
Big data Big data divides a very large dataset into chunks, performing parallel processing across the entire set, for analysis and reporting. 
Big compute       Big compute, also called high-performance computing (HPC), makes parallel computations across a large number (thousands) of cores.


Architecture style             Dependency management           Domain type
N-tier    Horizontal tiers divided by subnet             Traditional business domain. Frequency of updates is low.
Web-queue-worker         Front and backend jobs, decoupled by async messaging. Relatively simple domain with some resource intensive tasks.
Microservices     Vertically (functionally) decomposed services that call each other through APIs.   Complicated domain. Frequent updates.
Event-driven architecture              Producer/consumer. Independent view per sub-system. IoT and real-time systems.
Big data Divide a huge dataset into small chunks. Parallel processing on local datasets.       Batch and real-time data analysis. Predictive analysis using ML.
Big compute       Data allocation to thousands of cores.     Compute intensive domains such as simulation.




Best Practices for Cloud Applications:

API Design           - Design web APIs to support platform independence by using standard protocols and agreed-upon data formats. 
                - Promote service evolution so that clients can discover functionality without requiring modification.
                - Improve response times and prevent transient faults by supporting partial responses and providing ways to filter and paginate data.
API Implementation        - Implement web APIs to be efficient, responsive, scalable, and available. 
                - Make actions idempotent, support content negotiation, and follow the HTTP specification. 
                - Handle exceptions, and support the discovery of resources. 
                - Provide ways to handle large requests and minimize network traffic.
Autoscaling         - Design apps to dynamically allocate and de-allocate resources to satisfy performance requirements and minimize costs.
Background Jobs              - Implement batch jobs, processing tasks, and workflows as background jobs.
Caching - Improve performance by copying data to fast storage that's close to apps.
                - Cache data that you read often but rarely modify. 
                - Manage data expiration and concurrency. 
Content Delivery Network            - Use content delivery networks (CDNs) to efficiently deliver web content to users and reduce load on web apps. 
                - Overcome deployment, versioning, security, and resilience challenges.
Data Partitioning               - Partition data to improve scalability, availability, and performance, and to reduce contention and data storage costs. 
                - Use horizontal, vertical, and functional partitioning in efficient ways.
Data Partitioning Strategies          - Shard your data to distribute loads, reduce latency, and support horizontal scaling.
Host name preservation - Preserve the original HTTP host name between a reverse proxy and its back-end web application
Message encoding considerations             - Use asynchronous messages to exchange information between system components.
                - Choose the payload structure, encoding format, and serialization library that work best with your data.
Monitoring and Diagnostics         - Track system health, usage, and performance with a monitoring and diagnostics pipeline. 
                - Turn monitoring data into alerts, reports, and triggers that help in various situations.
Retry guidance for specific services           - Use, adapt, and extend the retry mechanisms to develop a robust app for managing temporary issues with connections, operations, and resources.
Transient fault handling - Handle transient faults caused by unavailable networks or resources. 
                - Overcome challenges when developing appropriate retry strategies. 
                - Avoid duplicating layers of retry code and other anti-patterns.


Cloud Services for implementing best practices:

Best Practice       Azure
Scalability            


Terraform Best Practices:
Start your project using remote state for TF state life
Practice a consistent structure and naming convention
Keep resource modules as plain as possible
Don't hardcode values that can be passed as variables or discovered using data sources
Use data sources and terraform_remote_state specifically as a glue between infrastructure modules within the composition


