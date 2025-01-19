---
layout: post
title: Kubernetes - API
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
image: /assets/img/devops/orchestration/kubernetes/kubernetes-api.webp
description: Understanding the Kubernetes API - Extending with CRDs, Listing Resource Types, and More
---

## Introduction

The Kubernetes API serves as the foundation of Kubernetes, enabling communication and management of cluster resources. It is through the Kubernetes API that users and tools interact with the system, making requests to create, modify, and retrieve information about objects in the cluster.

### What is the Kubernetes API?

- The Kubernetes API is the central communication layer of a Kubernetes cluster, responsible for managing and exposing the cluster's resources.
- It serves as the interface for all interactions with the Kubernetes system.
- Whether you're creating, updating, or querying resources, all requests go through the Kubernetes API server, which acts as the gatekeeper for managing the state of the cluster.

### Key Concepts of the Kubernetes API

1. **API Server**
    - The API server is the heart of the Kubernetes API.
    - It is the entry point for all client requests, including kubectl commands, the Kubernetes dashboard, and other tools.
    - The API server exposes RESTful APIs and handles tasks like validation, authentication, and authorization of incoming requests.

2. **Resources**
    - Kubernetes defines a wide range of objects (or resources) that users can interact with via the API.
    - These include Pods, Deployments, Services, ConfigMaps, and more.
    - Each resource is defined in the Kubernetes API and has its own set of operations (like get, create, update, delete).

3. **RESTful Interface**
    - The Kubernetes API follows REST (Representational State Transfer) principles.
    - This means that it uses standard HTTP methods like GET, POST, PUT, and DELETE to interact with resources.

4. **API Groups**
    - Kubernetes organizes its API into logical groupings called API groups. For example:
      - `core group` for essential resources like Pods and Services
      - `apps group` for Deployments, StatefulSets, etc.
      - `batch group` for CronJobs and Jobs
      - `extensions` for more advanced resources (though many have been migrated to specific API groups in newer Kubernetes versions).

5. **Resources and Versions**
    - Each resource in Kubernetes can have multiple versions, allowing backward compatibility as the API evolves.
    - Resources are typically accessed by their versioned endpoints, like `/api/v1/pods` or `/apis/apps/v1/deployments`.

6. **Custom Resources**
    - Kubernetes allows you to define your own resources via Custom Resource Definitions (CRDs).
    - These resources extend the Kubernetes API to handle application-specific objects that aren't covered by the default Kubernetes resources.

### How the Kubernetes API Works

![Kubernetes API Flow](/assets/img/devops/orchestration/kubernetes/kubernetes-api-flow.png)

- When you make a request (e.g., with kubectl or through an application), the request travels to the API server, which processes it and interacts with the cluster's etcd database to store or retrieve information.
- Here's a simplified breakdown of the flow:
  1. `Client Request`: You initiate a command (e.g., kubectl get pods).
  2. `API Server`: The API server receives the request and checks for authentication, authorization, and validation.
  3. `Etcd`: If the request requires modifying the cluster's state (like creating a Pod), the API server stores this information in etcd, the key-value store used by Kubernetes to maintain cluster state.
  4. `Controller Manager`: Controllers monitor the cluster state and ensure it matches the desired state. For example, the Deployment controller ensures the correct number of Pods are running.

### Key Features of the Kubernetes API

1. `Declarative Management`
    - Kubernetes follows a declarative approach.
    - Instead of specifying every action, you define the desired state of the system (e.g., "I want 3 replicas of a Deployment"), and Kubernetes ensures that the current state matches that.

2. `Versioning`
    - The Kubernetes API is versioned to ensure backward compatibility while still allowing for enhancements.
    - You interact with a specific API version, such as v1 for core resources or apps/v1 for deployments.

3. `Extensibility`
    - With CRDs, you can extend Kubernetes to manage application-specific resources, beyond the built-in types, by creating your own resource types.
    - This makes the API highly customizable and adaptable to various use cases.

4. `API Access`
    - The Kubernetes API is typically accessed through kubectl, but it is also available to internal Kubernetes components and external applications via HTTP requests.
    - It provides a RESTful interface for programmatic interactions.

### Example of Using the Kubernetes API

- Let’s look at an example of interacting with the Kubernetes API using kubectl:

1. `Creating a Pod`
    - To create a new Pod using the API, you would send a POST request to the `/api/v1/pods` endpoint, typically done via `kubectl apply`:

    ```bash
    kubectl apply -f pod.yaml
    ```

    - This creates a Pod resource in your cluster.

2. `Listing Pods`
    - To retrieve a list of Pods, you send a GET request to the `/api/v1/pods` endpoint:

    ```bash
    kubectl get pods
    ```

3. `Updating a Resource`
    - If you wanted to change the configuration of a Deployment, you would send a PUT request to the `/apis/apps/v1/deployments/{name}` endpoint:

    ```bash
    kubectl set image deployment/my-deployment my-container=my-image:v2
    ```

### Extending the Kubernetes API with Custom Resource Definitions (CRDs)

- While Kubernetes provides a wide variety of built-in resources like Pods, Deployments, and Services, many organizations require custom resources that are specific to their applications or use cases.
- This is where Custom Resource Definitions (CRDs) come into play.

### What Are Custom Resource Definitions (CRDs)?

- CRDs allow you to extend the Kubernetes API by defining your own custom resource types.
- These custom resources behave similarly to native Kubernetes objects, but they are defined by you, allowing for greater flexibility and control over how Kubernetes manages your workloads.
- For example, imagine you're building a custom application that requires managing Employee resources, which are not part of the Kubernetes API by default.
- You can create a Employee custom resource using a CRD and then manage it just like any other Kubernetes object.

### How to Use CRDs to Extend the Kubernetes API

1. **Define a CRD**

    - First, create a CustomResourceDefinition that describes the schema for your custom resource.
    - Example of defining a CRD for Employee:

    ```yaml
    apiVersion: apiextensions.k8s.io/v1
    kind: CustomResourceDefinition
    metadata:
      name: employees.mycompany.com
    spec:
      group: mycompany.com
      names:
        kind: Employee
        plural: employees
        singular: employee
        shortNames:
          - emp
      scope: Namespaced
      versions:
        - name: v1
          served: true
          storage: true
          schema:
            openAPIV3Schema:
              type: object
              properties:
                spec:
                  type: object
                  properties:
                    name:
                      type: string
                    department:
                      type: string
    ```

2. **Apply the CRD**

    - Once defined, apply the CRD to your cluster using kubectl apply:

    ```bash
    kubectl apply -f employee-crd.yaml
    ```

3. **Create Custom Resources**

    - After creating the CRD, you can now create and manage resources of the type Employee:

    ```yaml
    apiVersion: mycompany.com/v1
    kind: Employee
    metadata:
      name: john-doe
    spec:
      name: John Doe
      department: Engineering
    ```

   - Apply the resource

    ```bash
    kubectl apply -f employee-resource.yaml
    ```

4. **Interact with the Custom Resource**

    - You can interact with your custom resources just like built-in Kubernetes resources:

    ```bash
    kubectl get employees
    kubectl describe employee john-doe
    ```

    - With CRDs, you can extend the Kubernetes API to support a wide range of application-specific needs without modifying Kubernetes itself.

### Listing Resource Types in a Cluster

- To list all available resource types in a Kubernetes cluster, you can use the kubectl api-resources command.
- This command will display a list of resource types and their associated short names, API groups, and whether they are namespaced or not.

```bash
kubectl api-resources
```

- Example Output:

```bash
NAME                              SHORTNAMES   APIGROUP                             NAMESPACED   KIND
pods                              po           core                                true         Pod
services                          svc          core                                true         Service
deployments                       deploy       apps                                true         Deployment
statefulsets                      sts          apps                                true         StatefulSet
customresourcedefinitions         crd          apiextensions.k8s.io                false        CustomResourceDefinition
```

- This list includes both built-in and custom resources (like CRDs) in the cluster.
- To filter the list and focus on a specific group or type of resource, you can use the --api-group or --namespaced flags.

### The Use of --authorization-mode

- The --authorization-mode flag is used to specify how Kubernetes should handle authorization for incoming requests to the API server.
- It defines the mechanism for controlling access to cluster resources and plays a vital role in ensuring security.
- Common Authorization Modes
  - `RBAC (Role-Based Access Control)`: Allows fine-grained access control using roles and role bindings.
  - `ABAC (Attribute-Based Access Control)`: Authorizes requests based on attributes (like the user’s group or object attributes).
  - `Webhook`: Integrates external systems for authorization decisions.
- You can set the --authorization-mode flag in the API server configuration to specify the desired authorization mode.
- Example:

```bash
kube-apiserver --authorization-mode=RBAC
```

- This sets the API server to use RBAC for authorization, ensuring that only users or service accounts with the appropriate roles can access or modify resources.

### Request Journey to API Server

- When a request is made to the Kubernetes API server, it passes through several key stages before reaching its destination.
- These stages ensure that the request is properly authenticated, authorized, and processed.

1. **Authentication**

    - The first stage of the request process is authentication.
    - The API server verifies the identity of the user or service making the request, typically by checking credentials like tokens, certificates, or API keys.
    - If the request is not properly authenticated, it will be rejected.

    - `Token Authentication`: Most commonly used in Kubernetes, tokens are typically generated by the identity provider.
    - `Client Certificates`: Kubernetes supports mutual TLS for secure communication, where the client presents a certificate.
    - `Service Account Tokens`: For service accounts within the cluster, the API server uses tokens to authenticate requests.

2. **Authorization**

    - Once authenticated, the request is passed to the authorization stage, where the API server checks whether the authenticated user has the appropriate permissions to perform the requested action.
    - Kubernetes typically uses RBAC (Role-Based Access Control) to enforce authorization, but other models such as ABAC (Attribute-Based Access Control) or Webhook authorization can be used.

    - `RBAC`: Roles and role bindings define what users can do within a namespace or across the cluster.
    - `ABAC`: Policies based on attributes such as user roles or resource names.

3. **Admission Control**

    - After passing through authentication and authorization, the request reaches the admission control stage.
    - Admission controllers are plugins that can modify or reject requests before they are persisted to the API server.
    - This is where Kubernetes applies business logic, policy enforcement, and validation.

    - Examples of admission controllers include:
      - `NamespaceLifecycle`: Prevents requests that would create resources in non-existent namespaces.
      - `LimitRanger`: Ensures resources like CPU and memory are within defined limits.
      - `PodSecurityPolicy`: Enforces security policies on Pods.
    - If any admission controller rejects the request, the request is aborted, and no further processing occurs.

### Conclusion

The Kubernetes API is a critical component of the Kubernetes architecture, facilitating communication between the user, controllers, and the cluster. By extending the API with Custom Resource Definitions (CRDs), you can tailor Kubernetes to meet your specific application needs. Additionally, knowing how to list resource types, configure authorization modes, and understanding the stages a request goes through helps you better manage and secure your cluster.

Whether you're managing custom resources, securing your API server with --authorization-mode, or troubleshooting API requests, understanding the Kubernetes API is essential for optimizing your Kubernetes operations.
