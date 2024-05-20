---
layout: post
title: Introduction to API's
categories: [communication, api]
tags: [Communication, API]
---

## Introduction to API's

- APIs act as the bridge between different software applications, allowing them to interact and share data efficiently. 
- Diffferent types of APIs:
1. REST API
2. SOAP
3. GraphQL. 


### REST API
- Representational State Transfer (REST) is an architectural style and protocol for building web services. 
- It is a popular approach for designing web application programming interfaces (APIs) because it emphasizes scalability, simplicity, and modifiability.
- They are resource-based: Each end-point corresponds to a specific resource, such as a user, a product, or a transaction.
- They use HTTP verbs: REST APIs implement the CRUD pattern using five HTTP methods:
    + GET: Reads data from a resource.
    + POST: Creates a new resource.
    + PUT: Updates an existing resource by replacing it.
    + PATCH: Updates an existing resource by modifying parts of it.
    + DELETE.

- They are stateless: Each REST request is self-contained. That’s great for scalability but nearly all web applications depend on external state storage to keep track of state that is too large or too complex to fit into request headers.
- They use workarounds to track state: Just as with web browsing, cookies and tokens provide a way to identify individual clients and authenticate them with a specific session.
- Responses are cacheable: Both clients and server-side components can cache responses, in part because they are stateless.
- Responses are synchronous: Following HTTP’s request-response pattern makes it harder to build REST APIs that rely on long-running connections.
- The server-side can be layered: So long as the endpoints stay the same, REST API clients have no visibility of what they’re interacting with. That means the backend architecture can involve caches, load balancers, edge nodes, and more.

### GraphQL
- GraphQL is a runtime and query language for APIs that allows clients to request and receive only the data they require, making it more efficient than REST. 
- With GraphQL, clients can specify the exact data they need and get it in a single request instead of making multiple requests to different endpoints as in REST. 
- It's a great choice for data-driven applications with complex and evolving data requirements.
- It may not be the best choice for applications that require strict data validation, applications that need to support a wide variety of clients, or user-facing apps like social media. 
- Still, it is an excellent alternative to REST in situations requiring flexible and efficient data retrieval and manipulation
- This is particularly true in applications with complex data models or mobile applications with limited connectivity.

### gRPC
- gRPC is an open-source framework developed by Google for building RPC APIs. 
- It allows developers to define service interfaces and generate client and server code in multiple programming languages. 
- gRPC uses protocol buffers and a language-agnostic data serialization format for efficient data transfer, making it ideal for high-performance applications.
- gRPC may not be the best choice for a large volume of data manipulation or for applications that need to support a wide variety of clients. 
- However, gRPC is known for its high performance and low overhead, making it a good pick for applications that require fast and efficient communication between services.

### WebSockets
- The WebSocket protocol enables bi-directional, real-time communication between clients and servers. 
- Unlike REST, which is request/response-based, WebSockets allow servers to push data to clients as soon as it becomes available, making it ideal for applications that require real-time updates, such as chat applications and online gaming.
- WebSockets may not be the best choice for applications that require complex data manipulation or for applications where scalability is a concern. 
- However, it shines where real-time communication and low latency are required, thanks to a full-duplex, persistent connection between client and server. REST uses a less efficient request/response model.

### MQTT
- MQTT is a lightweight, open-source messaging protocol designed for IoT devices. 
- It's a pub/sub protocol with a small packet size and low bandwidth, making it ideal for constrained networks and devices with limited processing power. 
- MQTT can also handle intermittent network connectivity and supports Quality of Service (QoS) levels to ensure reliable message delivery.
- It's not the best choice for complex interactions or data manipulation applications. But for use cases with lower bandwidth and battery life preservation — MQTT allows devices to "sleep" between messages, extending the battery life of IoT devices — it offers excellent capability.

### Event-Driven Architecture (EDA)
- In EDA, events trigger and communicate changes between different components or services within a system. 
- This allows for real-time and reactive data processing and can reduce the need for repeated polling of resources, which can be resource-intensive and time-consuming in REST-based systems.
- EDA is a good REST alternative for applications that require real-time data processing, scalability, and loose coupling between different components or services within a system. 
- It's also well-suited for microservices architectures, allowing each microservice to operate independently and communicate with other services through events. This enables better scalability, flexibility, and resilience of the overall system.

### FALCOR
- FALCOR is a JavaScript library developed by Netflix for building efficient and flexible APIs. 
- It uses a "path-based" approach to data retrieval, representing data as a graph of interconnected paths rather than individual resources accessed through HTTP requests.
- It offers benefits like:
    + WebSocket support, which allows real-time data updates to be pushed to clients without requiring repeated polling
    + Declarative data fetching, where the client specifies the data it needs and the API responds with the requested data. This simplifies the client-side code and reduces the amount of data sent over the network.


### Functions
- PubNub’s Functions are JavaScript event handlers that can be executed on in-transit PubNub messages or in the request/response style of a RESTful API over HTTPS. 
- For those who are familiar with Node.js and Express, the On Request event handler development is very similar. Functions can deploy new or additional real-time functionality like chat moderation and language translation.
- Run your code within our network or leverage our existing integrations to transform, re-route, augment, filter and aggregate messages to detect and block spammers, measure averages, and more. 
- All code is run at the edge for low latency and is robust enough that you don’t need to build your own infrastructure.