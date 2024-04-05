---
layout: post
title: Azure Functions
categories: [cloud, azure, serverless, azure functions]
tags: [cloud, azure, serverless, azure functions]
---

###  Introduction to Azure Functions:

- Azure Functions is a serverless compute service that allows you to run event-driven code without provisioning or managing infrastructure. 
- It supports multiple programming languages and integrates seamlessly with other Azure services.

#### Triggers and Bindings

**Triggers:**
- Triggers cause a function to run. 
- A trigger defines how a function is invoked and a function must have exactly one trigger. 
- Triggers have associated data, which is often provided as the payload of the function.
- Common Types:
    1. HTTP Trigger
    2. Time Trigger
    3. Blob Storage Trigger
    4. Queue Trigger

**Bindings:**
- Binding to a function is a way of declaratively connecting another resource to the function; bindings may be connected as input bindings, output bindings, or both. 
- Data from bindings is provided to the function as parameters.
- Binding Types:
    1. Input Binding
    2. Output Binding

#### Pricing Plans

| Consumption | Premium Plan | App Service | 
| ----------- | ------------ | ----------- |
| Billing: <br> a. Number of Executions <br> b. Executino Time <br> c. Memory Used <br> d. Free Quota per month <br> | Billing: <br> a. Number of Core Seconds <br> b. Memory Used <br> c. Pre-warmed instances <br> | Billing: <br> a. Pay for App Service resources <br> | 
| Use Case: <br> a. Apps requires scaling <br> b. Intermittent traffic <br> | Use Case: <br> a. Apps that run continously <br> b. Apps require more time | Use Case: <br> a. Existing under-utilized VM's <br> b. Custom images to run functions | 



#### Azure Function Benefits

- Easily run small pieces of code in clooud.
- Eliminate bolier plate code
- Use it to run code in different programming languages
- Only pay for the time the code runs
- Quickly creates prototypes at low cost

| Virtual Machines | Azure App Service | Azure Functions | 
| ---------------- | ----------------- | --------------- |
| Infrastructure as a Service(IaaS) | Platform as a Service(PaaS) | Function as a Service(FaaS) | 
| Pay for Instance Per Hour | Pay fixed montly cost for reserved instances | Pay only when fucntion runs | 
| Manual Scaling | Auto scales by adding server | Scales automatically | 

#### Azure Development Environments


#### Programming Language Support
- Below are the supported lanaguages in Azure Functions:
1. C#
2. JavaScript
3. F#
4. Java
5. Powershell
6. Python
7. TypeScript

