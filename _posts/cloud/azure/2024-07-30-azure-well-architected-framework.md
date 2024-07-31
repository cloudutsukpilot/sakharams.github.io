---
layout: post
title: Azure Well-Architected Framework
categories: [cloud, azure, architect]
tags: [Cloud, Azure, Architect]
---

## Introduction
- The Azure Well-Architected Framework is a design framework that can improve the quality of a workload by helping it to:
    + Be resilient, available, and recoverable.
    + Be as secure as you need it to be.
    + Deliver a sufficient return on investment.
    + Support responsible development and operations.
    + Accomplish its purpose within acceptable timeframes.

- `Primary objective` of the Well-Architected Framework is to set you up for success when you deploy your workload on Azure.
    + Successful implementation
    + Confidence in success
    + Understand tradeoffs and risks
    + Optimize over time

- [Azure Well-Architected Review Tool](https://learn.microsoft.com/en-us/assessments/?id=azure-architecture-review&mode=pre-assessment)

- `Five Pillars of Azure Well-Architected Framework`
    1. [Cost Optimization](#1-cost-optimization)
    2. [Operational Excellence](#2-operational-excellence)
    3. [Performance Efficiency](#3-performance-efficiency)
    4. [Reliability](#4-reliability)
    5. [Security](#5-security)

- `Applicability of the Framework`
    + During the initial design and subsequent interactions.
    + Design modules, irrespective of the technology used.
    + Applicable to cloud-native and migrating existing systems.

- `Design Principles`
    + Enable Architectural Evolution (No architecture is static)
    + Use Data to make decisions
    + Educate & enable
    + Automate

### Deliverable Tasks

- [ ] `Develop an architecture design specification` that's accompanied by diagrams as a structured packet. The specification must meet the workload's functional and nonfunctional requirements and include provisions for routine, ad hoc, and emergency operations.
- [ ] `Create architecture design diagrams` that illustrate all aspects of system design, from a broad overview to detailed dimensions such as network and identity.
- [ ] `Maintain an architecture decision record (ADR)` that contains justifications for architectural decisions that are made during the design process.
- [ ] `Collaborate with the workload team during implementation` to provide clarity and recommendations about the implementation sequence. This collaboration helps you maximize learning and make improvements from the outset. Also renegotiate requirements with stakeholders, if needed.
- [ ] `Support modeling exercises` that provide contextualized information about workload concerns. The contextualized information can cover costs, application health, and other areas.
- [ ] `Provide optimization recommendations` that are based on observations of usage patterns and changes in workload functionality or cloud provider changes.
- [ ] `Participate in audit, compliance, and confidence reviews` to provide a valuable perspective to external parties who have the authority to conduct reviews.
- [ ] `Be a consultant during change reviews` to provide insight into the estimated cost of change and its feasibility.


### Pillars of Azure Well-Architected Framework

| Pillar | Workload concern | Apply the principles |
| Reliability | Resiliency, availability, recovery | Design for business requirements, resilience, recovery, and operations, while keeping it simple. | 
| Security | Data protection, threat detection, and mitigation | Protect confidentiality, integrity, and availability. |
| Cost Optimization | Cost modeling, budgets, reduce waste | Optimize on usage and rate utilization while keeping a cost-efficient mindset. | 
| Operational Excellence | Holistic observability, DevOps practices	| Streamline operations with standards, comprehensive monitoring, and safe deployment practices. | 
| Performance Efficiency | Scalability, load testing | Scale horizontally, test early and often, and monitor the health of the solution. |


### 1. Cost Optimization
- Cost optimization refers to ensuring that the money your organization spends is being used to the maximum. 
- Cloud services provide computing as a utility. 
- Technologies in the cloud are provided under a service model, to be consumed on-demand. 
- This on-demand service offering drives a fundamental change that directly affects planning, bookkeeping, and organizing.
- Design Principles:

1. `Plan and Estimate Cost`
    - Its important to get estimates of your costs
    - What is to be estimated?  
        + Resources to move
        + Resources to develop/redevelop
        + Sizing the resources 
        + Selection of services
    - Use Pricing Calculator to estimate and plan cost

2. `Provision with Optimization`
    - Provisioning services that are optimized for cost from the outset can reduce your work effort in the future.
    - Reduce rework in the future
    - How to acheive?
        + Select services as per required SLA which allows adjusting it
        + Use reserved instances
        + Use Bring-You-Own-License offers
        + Move from IaaS to PaaS

3. `Use Monitoring and Analytics`
    - Monitor your usage to optmize cost
    - How to achieve?
        + Use Cost Management tools & Billing statements to understand money spent
        + Identify and fix anomalies from reports
        + Conduct regular cost reviews to check resource requirement
4. `Maximize Efficient of Cloud Spend`
    - Identify & eliminiating unnecessary expenses
    - How to achieve this?
        + Adjust the spending on resources
        + Move service to a cost-effective tier
        + Apply optimization that can reduce cost (Eg. caching)
        
- <a href="https://learn.microsoft.com/en-us/azure/well-architected/cost-optimization/checklist" class="mx-2">**Recommendations**</a> 
    
### 2. Operational Excellence
- Operation Excellence refer to ensuring that there is full visibility into how the application is running, and ensuring the best experience for the users. 
- It includes making the development and release practices more agile, which allows the business to quickly adjust to changes. 
- By improving, operational capabilities, we can have faster development and release cycles, and a better experience for the users.
- Design Principles:

1. `Design and Build with DevOps`
    - Design, build & orchestrate with modern practices
    - How to achieve this?
        + Use DevOps features
        + Use Infrastructure as Code (IAC)
        + Automate Testing
        + Automate Builds suing CI

2. `Use Monitoring and Analytics`
    - Use monitoring & analytics to gain operational insights
    - It helps to identify performance issues & cost inefficiencies
    - Easier to troubleshoot issues
    - How to achieve this?
        + Thorough monitoring, logging and instrumentation system
        + Use Azure services for monitoring and logging
        + Correlate Events

3. `Use Automation to Reduce Efforts and Errors`
    - Human mandays efforts are expensive and error prone
    - How to achieve this?
        + Use service-specific automation features
        + Use Azure Pipelines for CI & CD
        + Use ARM templates for provisioning

4. `Testing`
    - Include testing in the application deployment & ongoing operations
    - It helps identify performance issues & security vulnerabilities
    - Uncover issues with infrastructure deployments
    - How to achieve this?
        - Developer Tests
        - Penetration Testing
        - Chaos Engineering

### 3. Performance Efficiency
- Performance efficiency refers to matching the resources available to an application with the demand that is being received. 
- It includes scaling resources, identifies and optimize potential bottlenecks, and optimizing application code for peak performance.
- Design Principles:

1. `Scale Resources`
    - Scale the resources based on demand
    - Scale up(Vertical) or Scale out(Horizontal)
    - Dynamically allocate resource to match the performance requirements
    - How to achieve this?
        + Azure Autoscale
        + Azure Logic Apps
        + Azure Functions

2. `Optimize Network Performance`
    - Network performance can affect the response time of the application
    - How to achieve this?
        + Minimise latency and throughput
        + Adding messaging layer using Azure Service Bus, Azyre Event Hubs, Azyre Queue Storage, etc
        + Cache network related data using Azure CDN
        + Use network monitoring & diagnostics using Azure Network Watcher or Azure Monitor.

3. `Optimize Storage Performance`
    - Optiming the storage medium enchances the performance of the application.
    - How to achieve this?
        + Partitioning using Azure Blob Storage
        + Caching using services like Azure Cache for Redis
        + Choosing the right type of storage

4. `Identify Performance Bottlenecks`
    - Monitor and track the bottlenectks happening in the system
    - How to achieve this?
        + Use application performance management tools like Application Insights, Azure Monitor, Azure Log Analytics, etc
        + Leverage Azure services to find bottlenecks like Azure Network Watcher, Azure Storage Analytics, etc
        + Monitor the entire stack

### 4. Reliability
- Designing for reliability includes maintaining uptime through small-scale incidents and temporary conditions like partial network outages, ensuring that the application can handle localized failures by integrating high availability into each component of the application, and eliminating single points of failure. 
- It also focuses on recovery from data loss and from larger-scale disasters. 
- It protects the business from financial losses that result from downtime and lost data. 
- This also includes ensuring that the systems are available to the end-users and can recover from any failures.
- Design Principles:

1. `High Availability`
    - Avoid a single point of failure
    - The system continues to perform with little to no impact
    - How to achieve this?
        + Add redundancy as per SLA. Eg. Azure VM, AKS, etc
        + Load Balancing using Azure Load Balancer, Azure App Service, etc.

2. `Fault Tolerance`
    - Recover from data loss
    - Involves active intervention to restore the system
    - This may involve some downtime or permanent data loss.
    - How to achieve this?
        + Recovery Time Objective (RTO) - Maximum duration of acceptable downtime.
        + Recovery Point Objective (RPO) - Maximum duration of acceptable data loss measured in unit of time.



### 5. Security
- Data is the most valuable piece of an organization’s technical footprint. 
- Security is all about protecting the data that an organization possesses, stores, and transmits. 
- It includes authenticating and protecting the application and data from network vulnerabilities through tools like encryption.
- Design Principles:

1. `Defence in Depth`

    ![Defence-in-depth](/assets/img/cloud/azure/defence-in-depth.png)

    - Use Multi-layered approach to securing your environment
    - Protection from Common Threats:


    | Security Level      | Common Attacks                     | Azure Services                                                        |
    |---------------------|------------------------------------|----------------------------------------------------------------------|
    | Physical security   | Unauthorised access                | Biometric access, 24/7 surveillance, strict access policies           |
    | Policies & access   | Exposure of credentials            | Azure Active Directory, Azure Key Vault                               |
    | Perimeter           | Denial of Service (DoS) attacks    | Azure Firewall, Azure DDoS                                            |
    | Networking          | Unnecessary ports open             | Azure Virtual Network and NSGs                                        |
    | VM/Compute          | Malware                            | Azure Security Center, Azure Update Management, Azure Bastion         |
    | Applications        | Malicious code injection           | Azure Web Application Firewall, Azure API Management, Azure CDN       |
    | Data                | Exposed encryption keys, weak encryption | Azure Storage Service Encryption, Azure Disk Encryption         |


2. `Shared Security Responsibility`
    - The cloud shared responsibility model defines the division of security and compliance responsibilities between the cloud service provider (CSP) and the customer. 
    - While the CSP is responsible for securing the underlying infrastructure, such as physical security and network controls, the customer is responsible for securing their data, applications, and configurations within the cloud environment. 
    - This collaboration ensures a comprehensive approach to cloud security.