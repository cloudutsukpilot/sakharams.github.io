---
layout: post
title: Introduction to Kubernetes
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
image: /assets/img/devops/orchestration/kubernetes/kubernetes-posts.png
description: Why Kubernetes is the most popular container orchestration tool?
---

## Introduction

- Kubernetes is an open-source container orchestration platform that automates the deployment, scaling, and management of containerized applications. 
- It was originally developed by Google and is now maintained by the Cloud Native Computing Foundation (CNCF).

### What is Kubernetes?

- Kubernetes, often referred to as K8s (pronounced "kates"), provides a platform for automating the deployment, scaling, and management of containerized applications.
- It abstracts the underlying infrastructure and provides a consistent API for managing containers across different environments, such as on-premises data centers, public clouds, and hybrid clouds.

### Cluster Architecture

![Kubernetes Cluster Architecture](/assets/img/devops/orchestration/kubernetes/kubernetes-cluster-architecture.svg)

- `Nodes`
  - Kubernetes runs your workload by placing containers into Pods to run on Nodes.
  - A node may be a virtual or physical machine, depending on the cluster.
- `Controllers`
  - In Kubernetes, controllers are control loops that watch the state of your cluster, then make or request changes where needed.
  - Each controller tries to move the current cluster state closer to the desired state.
- `Cloud Controller Manager`
  - The cloud-controller-manager is a Kubernetes control plane component that embeds cloud-specific control logic.
  - The cloud controller manager lets you link your cluster into your cloud provider's API, and separates out the components that interact with that cloud platform from components that only interact with your cluster.
- `Container Runtime Interface (CRI)`
  - The Container Runtime Interface (CRI) is the main protocol for the communication between the kubelet and Container Runtime.
  - You need a working container runtime on each Node in your cluster, so that the kubelet can launch Pods and their containers.
- `Garbage Collection`
  - Garbage collection is a collective term for the various mechanisms Kubernetes uses to clean up cluster resources.
  - This allows the clean up of resources like the following:
    - Terminated pods
    - Completed Jobs
    - Objects without owner references
    - Unused containers and container images
    - Dynamically provisioned PersistentVolumes with a StorageClass reclaim policy of Delete
    - Stale or expired CertificateSigningRequests (CSRs)
    - Node Lease objects

### Containers

| Images | A container image represents binary data that encapsulates an application and all its software dependencies. |
| Container Environment | The Kubernetes Container environment provides several important resources to Containers: |
| | a. A filesystem, which is a combination of an image and one or more volumes. |
| | b. Information about the Container itself. | 
| | c. Information about other objects in the cluster. |
| RuntimeClass | RuntimeClass is a feature for selecting the container runtime configuration. |
| | The container runtime configuration is used to run a Pod's containers. |
| Container | Containers are the lowest level of microservice and has its own filesystem, share of CPU, memory, process space, and more. |
| | These are placed inside of the pods and need external IP addresses to view any outside processes. |

### Kubernetes Objects

| Namespaces | In Kubernetes, namespaces provides a mechanism for isolating groups of resources within a single cluster and are required when different teams or projects share a Kubernetes cluster. |
| | Any number of namespaces are supported within a cluster, each logically separated from others but with the ability to communicate with each other. |
| Labels & Selectors | Labels and Selectors are the standard method to group things together in Kubernetes. |
| | We can filter the objects based on the criteria like class, kind, and functions. |
| | Labels are the properties attached to each item/object. Selector helps us to filter the items/objects which have labels attached to them | 
| Annotation | Kubernetes annotations are a type of metadata that you attach to your Kubernetes objects, such as ReplicaSets and Pods. |
| | In particular, annotations are key-value maps. |
| | Annotations let you organize your application into sets of attributes that correspond to how you think about that application. |

### Workloads

| Pods | Pod is a collection of containers that can run on a host. | 
| Init Container | A Pod can have multiple containers running apps within it, but it can also have one or more init containers, which are run before the app containers are started. |
| | Init containers are exactly like regular containers, except: Init containers always run to completion. |
| Multi Container Pods | If you have to run two or more containers in a pod, then the pod created to place these containers is called a Multi Container Pod. |
| Ephemeral Containers | A special type of container that runs temporarily in an existing Pod to accomplish user-initiated actions such as troubleshooting. |
| Deployments | A Kubernetes Deployment tells Kubernetes how to create or modify instances of the pods that hold a containerized application. |
| | Deployments can help to efficiently scale the number of replica pods, enable the rollout of updated code in a controlled manner, or roll back to an earlier deployment version if necessary. |
|  | Deployments are well suited for stateless applications, | 
| ReplicaSet | A ReplicaSet (RS) is a Kubernetes object that ensures there is always a stable set of running pods for a specific workload | 
| | The ReplicaSet configuration defines a number of identical pods required, and if a pod is evicted or fails, creates more pods to compensate for the loss, thus ensuring the availability of the application. | 
| StatefulSet | StatefulSet is the workload API object used to manage stateful applications. |
| | Manages the deployment and scaling of a set of Pods, and provides guarantees about the ordering and uniqueness of these Pods | 
|  DaemonSet | DaemonSet is a Kubernetes feature that lets you run a Kubernetes pod on all cluster nodes that meet certain criteria. | 
| | Every time a new node is added to a cluster, the pod is added to it, and when a node is removed from the cluster, the pod is removed |
| Job | A job in Kubernetes is a supervisor for pods that run for a certain time to completion, for example a calculation or a backup operation. | 
| | A job is executed as a pod. Unlike most pods, however, the pod spawned by a job does not continue to run, but will instead reach a "Completed" state. |
| CronJob | A CronJob starts one-time Jobs on a repeating schedule. | 
| | CronJob is meant for performing regular scheduled actions such as backups, report generation, and so on. |
| Stateless and Stateful | Stateless means that no past data nor state is stored or needs to be persistent when a new container is created. |
| | Stateful application involve some databases and a process to read and/or write to it. |

### Services, Load Balancing and Networking

| Services | Service is a method for exposing a network application that is running as one or more Pods in your cluster, thus allowing to serve traffic through a permanent address/URL. |
| Endpoints | Endpoints in Kubernetes is a resource to track the IP addresses of the objects or pods which are dynamically assigned to it and which works as a service selector which matches a pod label by adding the IP addresses to the endpoints and these points can be viewed using software kubectl get endpoints. |
| Ingress | An API object that manages external access to the services in a cluster, typically HTTP. |
| | Ingress may provide load balancing, SSL termination and name-based virtual hosting. |
| Ingress Controllers | In order for the Ingress resource to work, the cluster must have an ingress controller running. |
| EndpointSlices | Kubernetes' EndpointSlice API provides a way to track network endpoints within a Kubernetes cluster. | 
| | EndpointSlices offer a more scalable and extensible alternative to Endpoints. | 
| Network Policies | NetworkPolicies are an application-centric construct which allow you to specify how a pod is allowed to communicate with various network "entities" over the network. |
| DNS for Services and Pods | Kubernetes creates DNS records for Services and Pods. You can contact Services with consistent DNS names instead of IP addresses. |
| Topology Aware Routing | Topology Aware Routing adjusts routing behavior to prefer keeping traffic in the zone it originated from. |
| | In some cases this can help reduce costs or improve network performance. |
| Service Internal Traffic Policy | Service Internal Traffic Policy enables internal traffic restrictions to only route internal traffic to endpoints within the node the traffic originated from. |
| | The "internal" traffic here refers to traffic originated from Pods in the current cluster. |
| | This can help to reduce costs and improve performance. |

### Storage

| Volumes | A Kubernetes volume is a directory containing data accessible to containers in a given pod. |
| Persistent Volume (PV) | A Kubernetes persistent volume (PV) is an object that allows pods to access persistent storage on a storage device, defined via a Kubernetes StorageClass. |
| | Unlike regular volumes, which are transient in nature, PVs are persistent, supporting stateful application use cases. |
| Persistent Volume Claim (PVC)	| A PersistentVolumeClaim (PVC) is a request for storage from the persistent volume made by a user. |
| Projected Volumes | A projected volume maps several existing volume sources into the same directory. |
|  | Currently, the following types of volume sources can be projected: |
| | a. Secret |
| | b. downwardAPI |
| | c. configMap | 
| | d. serviceAccountToken | 
| Ephemeral Volumes	| Ephemeral volumes follows pod's lifetime and get created and deleted along with the Pod. |
| | Kubernetes supports several different kinds of ephemeral volumes for different purposes: |
| | a. emptyDir: empty at Pod startup, with storage coming locally from the kubelet base directory (usually the root disk) or RAM |
| | b. configMap, downwardAPI, secret: inject different kinds of Kubernetes data into a Pod |
| | c.CSI ephemeral volumes: similar to the previous volume kinds, but provided by special CSI drivers which specifically support this feature |
| | d. generic ephemeral volumes, which can be provided by all storage drivers that also support persistent volumes |
| StorageClass | A StorageClass provides a way for administrators to describe the "classes" of storage they offer. | 
| | Storage classes can define properties of storage systems such as: |
| | • Speed (for example, SSD vs. HDD storage) |
| | • Quality of service levels | 
| | • Backup or replication policies |
| | • Type of file system |
| Dynamic Volume Provisioning | Dynamic volume provisioning allows storage volumes to be created on-demand. |
| Volume Snapshots | A VolumeSnapshot represents a snapshot of a volume on a storage system. |
| Volume Snapshot Classes | VolumeSnapshotClass provides a way to describe the "classes" of storage when provisioning a volume snapshot. | 
| CSI Volume Cloning | The CSI Volume Cloning feature adds support for specifying existing PVCs in the dataSource field to indicate a user would like to clone a Volume. |
| Provisioners | A StorageClass object contains a provisioner that decides which volume plugin is used to provision PersistentVolumes. Admins must specify this field. |
| | Kubernetes provides internal and external provisioners. |

### Configuration

| ConfigMaps | A ConfigMap is an API object used to store non-confidential data in key-value pairs. |
| | Pods can consume ConfigMaps as environment variables, command-line arguments, or as configuration files in a volume. |
| Secrets | A Secret is an object that contains a small amount of sensitive data such as a password, a token, or a key. |
| Resource Management | When you specify a Pod, you can optionally specify how much of each resource a container needs and how much is the maximum limit (Requests and limits). |
| | CPU, Memory |
| Kubeconfig | kubeconfig files are used to organize information about clusters, users, namespaces, and authentication mechanisms. |

### Security

| 4C's of Cloud Native security | Cloud -> Cluster -> Container -> Code | 
| | https://kubernetes.io/docs/concepts/security/overview/ |
| Role/ClusterRole | An RBAC Role or ClusterRole contains rules that represent a set of permissions. |
| | Permissions are purely additive (there are no "deny" rules). |
| | A Role always sets permissions within a particular namespace; when you create a Role, you have to specify the namespace it belongs in |
| RoleBinding/ClusterRoleBinding | A RoleBinding grants permissions within a specific namespace whereas a ClusterRoleBinding grants that access cluster-wide. |
| | A RoleBinding may reference any Role in the same namespace. |
| | Alternatively, a RoleBinding can reference a ClusterRole and bind that ClusterRole to the namespace of the RoleBinding. | 
| Startup Probes | Both liveness & readiness probes are used to control the health of an application. |
| | Startup Probe indicates whether the application running in the container has started. |
| Liveliness Probe | The Liveness Probe serves as a diagnostic check to confirm if the container is alive. |
| Readiness Probes | Readiness Probe ensures that the container is healthy to serve incoming traffic. |
| | Failing liveness probe will restart the container, whereas failing readiness probe will stop our application from serving traffic. |

### Policies

| Limit Ranges | Using Kubernetes resource quotas, administrators (also termed cluster operators) can restrict consumption and creation of cluster resources (such as CPU time, memory, and persistent storage) within a specified namespace. |
| Quotas | A resource quota, defined by a ResourceQuota object, provides constraints that limit aggregate resource consumption per namespace. |
| | It can limit the quantity of objects that can be created in a namespace by type, as well as the total amount of compute resources that may be consumed by resources in that namespace. |
| Process ID Limits And Reservations | Kubernetes allow you to limit the number of process IDs (PIDs) that a Pod can use. |
| | You can also reserve a number of allocatable PIDs for each node for use by the operating system and daemons (rather than by Pods). |
| Node Resource Managers | In order to support latency-critical and high-throughput workloads, Kubernetes offers a suite of Resource Managers. |
| | The managers aim to co-ordinate and optimise node's resources alignment for pods configured with a specific requirement for CPUs, devices, and memory (hugepages) resources. |

### Scheduling, Pre-emption and Eviction

| Kubernetes Scheduler |  |
| Assigning Pods to Nodes |  |
| Pod Overhead |  |
| Pod Topology Spread Constraints |  |
| Taints and Tolerations |  |
| Scheduling Framework |  |
| Dynamic Resource Allocation |  |
| Scheduler Performance Tuning |  |
| Resource Bin Packing for Extended Resources |  |
| Pod Scheduling Readiness |  |
| Descheduler |  |

### Cluster Administration

| Certificates | When using client certificate authentication, you can generate certificates manually through easyrsa, openssl or cfssl |
| Managing Resources | Organizing resource configurations |
| | Bulk operations in kubectl |
| | Canary deployments |
| | Updating annotations |
| | Scaling your application |
| | In-place updates of resources <br> a. kubectl apply <br> b. kubectl edit <br> c. kubectl patch |
| | Disruptive updates | 
| | Updating your application without a service outage |
| Cluster Networking | Networking is a central part of Kubernetes, but it can be challenging to understand exactly how it is expected to work. There are 4 distinct networking problems to address: |
| | 1. Highly-coupled container-to-container communications: this is solved by Pods and localhost communications. |
| | 2. Pod-to-Pod communications: Use CNI Plugins |
| | 3. Pod-to-Service communications |
| | 4. External-to-Service communications |
| Logging Architecture | The easiest and most adopted logging method for containerized applications is writing to standard output and standard error streams. | 
| | Cluster-level logging architectures require a separate backend to store, analyze, and query logs. |
| Metrics for Kubernetes System | System component metrics can give a better look into what is happening inside them. Metrics are particularly useful for building dashboards and alerts. |
| System Logs | System component logs record events happening in cluster, which can be very useful for debugging. |
| | klog is the Kubernetes logging library. klog generates log messages for the Kubernetes system components. |
| Traces For Kubernetes | System component traces record the latency of and relationships between operations in the cluster. |
| System Components	| Kubernetes components emit traces using the OpenTelemetry Protocol with the gRPC exporter and can be collected and routed to tracing backends using an OpenTelemetry Collector. |
| Proxies in Kubernetes	| kubectl proxy | 
| | apiserver proxy |
| | kube proxy |
| | Proxy/Load-balancer in front of apiserver(s) | 
| | Cloud Load Balancers on external services | 
| Installing Addons	| Add-ons extend the functionality of Kubernetes. |
| | Example: calico, knitter, Multus, etc. |

### Extending Kubernetes

| Container Storage Interface (CSI) plugins | Container Storage Interface (CSI) plugins provide a way to extend Kubernetes with supports for new kinds of volumes. |
| | The volumes can be backed by durable external storage, or provide ephemeral storage, or they might offer a read-only interface to information using a filesystem paradigm. |
| Device plugins | Device plugins allow a node to discover new Node facilities (in addition to the built-in node resources such as cpu and memory), and provide these custom node-local facilities to Pods that request them. |
| | Ex. GPUs, high-performance NICs, FPGAs, InfiniBand adapters, etc. |
| Container Network Interface (CNI) plugins | A network plugin allow Kubernetes to work with different networking topologies and technologies. |
| | Your Kubernetes cluster needs a network plugin in order to have a working Pod network and to support other aspects of the Kubernetes network model. |
| Custom Resources | Custom resources are extensions of the Kubernetes API. | 
| Kubernetes API Aggregation Layer | The aggregation layer allows Kubernetes to be extended with additional APIs, beyond what is offered by the core Kubernetes APIs. |
