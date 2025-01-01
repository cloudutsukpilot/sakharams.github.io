---
layout: post
title: Azure Functions
categories: [cloud, azure, compute, serverless, azure functions]
tags: [Cloud, Azure, Compute, Serverless, Azure Functions]
---

## Introduction

- Azure Functions is a serverless compute service that allows you to run event-driven code without provisioning or managing infrastructure. 
- It supports multiple programming languages and integrates seamlessly with other Azure services.

### Triggers and Bindings

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

### Pricing Plans

| Consumption | Premium Plan | App Service |
| ----------- | ------------ | ----------- |
| Billing: <br> a. Number of Executions <br> b. Executino Time <br> c. Memory Used <br> d. Free Quota per month <br> | Billing: <br> a. Number of Core Seconds <br> b. Memory Used <br> c. Pre-warmed instances <br> | Billing: <br> a. Pay for App Service resources <br> |
| Use Case: <br> a. Apps requires scaling <br> b. Intermittent traffic <br> | Use Case: <br> a. Apps that run continously <br> b. Apps require more time | Use Case: <br> a. Existing under-utilized VM's <br> b. Custom images to run functions |

### Azure Function Benefits

1. `Simplified Programming Model`
    - Easily run small pieces of code in cloud.
    - Eliminate bolier plate code
2. `Choice of Language`
    - Use it to run code in different programming languages
3. `Pay-per-use Pricing Model`
    - Only pay for the time the code runs
4. `Bring Your Own Dependencies`
    - NPM, NuGet and other package managers
5. `Scales Automatically`
    - Parallel invocation to meet demand
6. `Open Source Code`
7. `Docker Runtime`
    - Run function runtime in docker on premise or in other clouds
8. `Serverless`
9. `Low Cost Prototyping`
    - Quickly creates prototypes at low cost

### Programming Language Support

- Below are the supported lanaguages in Azure Functions:
    1. C#
    2. JavaScript
    3. F#
    4. Java
    5. Powershell
    6. Python
    7. TypeScript

### Azure Function Authorization Levels

1. `Anonymous`
    - No Key required.
    - Function can be called by anyone on the internet.

2. `Function`
    - Function or host key is required.
    - Function is scoped to a specific function.
    - Host key is scoped to all the functions within function app.

3. `Admin`
    - Master Key required.
    - Provides admin level privileges.
    - Should not be shared or used in client applications.

### Use Cases

1. `API creation`
    - Quick secure API creation with HTTP triggers.

2. `Serverless Mobile and Web Backend`
    - API, Databases, Queues, etc.

3. `Real Time Stream Processing`
    - Analysis of telemetry data from cloud applications

4. `IoT Data Processing`
    - Analysis of IOT stream data

5. `ETL`
