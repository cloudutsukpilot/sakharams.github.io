---
layout: post
title: Design Diagrams
categories: [architect]
tags: [Architect]
---

## Introduction
- Workload architecture is complex and multidimensional. 
- Each dimension type focuses on a specific aspect of the system by providing a level of detail that's specific to that dimension. 
- Having different types of diagrams allows for a comprehensive understanding of dimensions. 
- It helps encourage effective communication, problem-solving, and decision-making among stakeholders.

### 1. High-level system diagram
- A high-level system diagram serves as a broad overview of a whole workload or of a subsection within a workload. 
- It includes the main components, their relationships to each other, and the rough order in which data flows through the system. 
- Arrows show the direction of interaction.
- These diagrams are good for reaching a common understanding so that you can start deeper discussions or for stakeholder communication.

### 2. Block diagram
- A block diagram breaks down a workload into its major functional blocks. 
- The blocks are usually technology agnostic. 
- They refer to the functionality that's being performed instead of a specific component.
- For example, a block diagram might reference a "messaging bus" instead of a specific message-bus technology. 
- This type of diagram can help explain a system's structure, data flow, and processing flow without distracting the audience with fine details.

### 3. Component diagram
- A component diagram works like a block diagram but replaces generic functionality blocks with specific technologies. 
- It presents a detailed view with the goal of communicating the system's individual technology components and their relationships, such as client/server. 
- These diagrams are a sort of visual bill of materials for the scope of the diagram.

### 4. Deployment diagram
- A deployment diagram focuses on the deployment of infrastructure, commercial off-the-shelf (COTS) software, and custom code across the workload. 
- It shows how the software and code are distributed across the hosting infrastructure.

### 5. Data-flow diagram
- A data-flow diagram (DFD) illustrates how data moves through a system, which is useful when you're modeling data-centric systems. 
- In a diagram like this, it's a good idea to note if data is moved in batches or in real time to remove ambiguity.

### 6. Sequence diagram
- A sequence diagram depicts the communication exchanges between workload components over time. 
- It illustrates client/server relationships and their synchronous or asynchronous nature. 
- It also highlights dependencies in these exchanges and evaluates fault scenarios within them.

### 7. User-flow diagram
- A user-flow diagram focuses on a scoped interaction between workloads, users, or actors and the workload. 
- It's helpful for clarifying and visualizing functional requirements across various ways that a user and the user's data interact with the system.

### 8. Entity-relationship diagram
- An entity-relationship diagram (ERD) is a modeling diagram that represents the structure of a database or another storage system. 
- It shows the relationship between entities (such as tables) through industry-standard attributes and association symbology.

### 9. Network diagram
- A network diagram illustrates the solution from the perspective of the network that it runs on or interacts with. 
- These diagrams are useful in visualizing the workload's network segmentation, network points of failure, and key network transitions such as internet egress and ingress points.
- Network diagrams usually have a life past implementation. Network diagrams are often used in audits and incident response.

### 10. State diagram
- A state diagram is a specialized visualization. 
- It shows the state that a flow (or an individual component) is in. 
- It also shows how the flow transitions between states in response to conditions or events.

### 11. Flowchart
- Although it's not an architecture diagram specifically, a flowchart is another way to bring clarity to a design. 
- Flowcharts are often useful when they represent complex workflows or logic. 
- You can use them to help refine requirements and to help drive implementation choices.
- Flowcharts are useful to include in workload incident response plans to help highlight key decision points and their associated actions or notification channels.

