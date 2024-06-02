---
layout: post
title: Azure Serverless
categories: [cloud, azure, serverless]
tags: [Cloud, Azure, Serverless]
---

##  Azure Serverless:
- Below are the serverless services offered by Azure:

| Category | Services | 
| -------- | -------- |
| Compute | Azure Functions, Azure App Service, Azure Kubernetes Services, Azure Container Apps | 
| Database | Cosmos DB, Azure SQL| 
| Storage | Azure Blob Storage |
| Monitoring | Azure Monitor |
| Analytics | Azure Stream Analytics | 
| Integration | Azure Logic Apps, API Management, Azure Event Grid, Azure Service Bus |
| DevOps | Azure DevOps | 
| AI & ML | Azure Machine Learning, Azure Cognitivie Services |


### Compute:
1. `Azure Functions`
- Azure Functions is a serverless compute service that allows you to run event-driven code without provisioning or managing infrastructure. 
- It supports multiple programming languages and integrates seamlessly with other Azure services.

### Integration:
1. `Azure Logic Apps`
- Azure Logic Apps is a cloud-based service that helps you automate and orchestrate tasks, business processes, and workflows. 
- It provides a visual designer to create workflows using a wide range of connectors and triggers.

2. `Azure Event Grid`
- Azure Event Grid is an event routing service that simplifies the development of event-driven applications. 
- It enables you to react to events from various sources and route them to different endpoints, such as Azure Functions, Logic Apps, or custom HTTP endpoints.

3. `Azure Event Hubs`
- Azure Event Hubs is a highly scalable and real-time data streaming platform. 
- It can ingest and process millions of events per second, making it ideal for scenarios like telemetry, IoT, and log aggregation.

4. `Azure Service Bus`
- Azure Service Bus is a messaging service that enables reliable and secure communication between applications and services. 
- It supports both publish-subscribe and message queueing patterns, making it suitable for building decoupled and scalable architectures.

5. `Azure Notification Hubs`
Azure Notification Hubs is a push notification service that helps you send personalized notifications to mobile devices, web browsers, and other platforms. 
- It provides features like audience segmentation, message tagging, and template-based notifications.

6. `Azure Durable Functions`
- Azure Durable Functions is an extension of Azure Functions that allows you to write stateful and long-running workflows. 
- It provides a programming model for building complex orchestrations and coordinating multiple function invocations.

7. `Azure API Management`
- Azure API Management is a fully managed service that helps you publish, secure, and manage APIs at scale. 
- It provides features like authentication, rate limiting, caching, and analytics to ensure the reliability and performance of your APIs.

8.  `Azure App Service`
- Azure App Service is a fully managed platform for building, deploying, and scaling web applications. 
- It supports multiple programming languages and frameworks, and provides features like automatic scaling, continuous deployment, and integration with other Azure services.

9. `Azure Static Web Apps`
- Azure Static Web Apps is a service that enables you to build and deploy modern web applications quickly. 
- It integrates with GitHub to automatically build and deploy your app whenever you push changes to your repository.

### Storage:
1. `Azure Cosmos DB`
- Azure Cosmos DB is a globally distributed, multi-model database service. 
- It provides support for various data models, including document, key-value, graph, and columnar, and offers guaranteed low latency and high availability.

2. `Azure Storage`
- Azure Storage is a scalable and durable cloud storage service. 
- It provides different storage options, such as Blob storage, File storage, Queue storage, and Table storage, to meet the needs of different types of applications.

### AL & ML:
1. `Azure Cognitive Services`
- Azure Cognitive Services is a collection of AI services that enable you to build intelligent applications. 
- It provides APIs for vision, speech, language, knowledge, and search, allowing you to add advanced capabilities to your applications with ease.

2. `Azure Machine Learning`
- Azure Machine Learning is a cloud-based service that helps you build, deploy, and manage machine learning models at scale. 
- It provides a comprehensive set of tools and frameworks to support the entire machine learning lifecycle.


### Azure Logic Apps vs Azure Web Apps vs Azure Functions

| Feature                 | Azure Logic Apps                                | Azure Web Apps                                     | Azure Functions                                      |
|-------------------------|-------------------------------------------------|---------------------------------------------------|------------------------------------------------------|
| **Primary Purpose**     | Automating workflows and integrating services   | Building, deploying, and scaling web applications | Running event-driven code                            |
| **State Management**    | Stateful                                        | Stateful                                          | Stateless                                             |
| **Scaling**             | Managed by Azure, designed for high scalability | Automatic and manual scaling                      | Automatically scales based on events                  |
| **Development Effort**  | Low-code/No-code with visual designer           | Traditional development                           | Code-based with minimal infrastructure management     |
| **Languages Supported** | N/A (Workflow orchestration)                    | .NET, Java, PHP, Node.js, Python, etc.            | C#, JavaScript, Python, Java, etc.                    |
| **Event Handling**      | Yes, with triggers and actions                  | No                                                | Yes, with various event triggers                      |
| **Integration**         | Extensive built-in connectors                   | Via APIs and SDKs                                 | Native integration with Azure services                |
| **Use Cases**           | Business process automation, data integration   | Enterprise web applications, APIs                 | Background processing, microservices, real-time data processing |
