---
layout: post
title: Kubernetes - Storage
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
image: /assets/img/devops/orchestration/kubernetes/kubernetes-posts.png
description: Overview of key storage concepts in Kubernetes, including volumes, persistent volumes, dynamic provisioning, snapshots, and more.
---

## Introduction

Kubernetes (K8s) offers a robust and flexible storage system that allows workloads to manage and persist data efficiently. Understanding Kubernetes storage is crucial for running stateful applications reliably.

### Understanding Kubernetes Storage

- By default, containers are `ephemeral`, meaning any data stored inside a container is lost when the container restarts.
- Kubernetes provides multiple storage solutions to `persist` data, ensuring applications can store and retrieve data as needed.

### Types of Kubernetes Storage

- Kubernetes supports various storage options based on the use case:
  - `EmptyDir` – A temporary storage volume that exists as long as the pod runs. Once the pod is deleted, the data is lost.
  - `HostPath` – Uses the node’s local filesystem, which is useful for development but not recommended for production.
  - `Persistent Volumes (PVs) and Persistent Volume Claims (PVCs)` – A dynamic storage mechanism that allows applications to request persistent storage.
  - `ConfigMaps and Secrets` – Lightweight storage for configuration data and sensitive information.
  - `Storage Classes` – Enables dynamic provisioning of storage using cloud provider-specific backends.

### Volumes

- Kubernetes Volumes provide a way for containers to persist data beyond their lifecycle.
- Unlike ephemeral container storage, volumes exist independently of the container’s restart or termination.
- K8s supports multiple volume types such as emptyDir, hostPath, nfs, and configMap, among others.

### Persistent Volumes (PVs) and Persistent Volume Claims (PVC)

- A Persistent Volume (PV) is a cluster-wide storage resource that is provisioned independently of the pods.
- PVs provide a way to persist data beyond the lifecycle of a pod and support various backend storage solutions like NFS, Azure Disk, AWS EBS, and Google Persistent Disk.
- PVs are usually paired with Persistent Volume Claims (PVCs), which allow pods to request storage dynamically.
- A PVC is a request for storage by a pod. It abstracts the underlying storage, allowing applications to use storage without worrying about how it’s provisioned.

- PV Example:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: example-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: standard
  hostPath:
    path: "/mnt/data"
```

- PVC Example:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: example-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
```

### Projected Volumes

- Projected Volumes allow multiple volume sources (such as ConfigMaps, Secrets, and Downward API) to be combined into a single volume.
- This feature simplifies application configurations by mounting different data sources into a unified view inside a container.

### Ephemeral Volumes

- Ephemeral Volumes are temporary storage options designed to persist data only as long as a pod exists.
- Kubernetes provides various ephemeral volume types, including emptyDir, configMap, secret, and downwardAPI.
- These are useful for storing short-lived data that does not need to persist beyond a pod’s lifecycle.

### Storage Classes

- A StorageClass defines different types of storage available in a Kubernetes cluster.
- It allows dynamic provisioning of persistent volumes based on storage requirements like performance, cost, and replication policies.
- Each cloud provider offers different storage classes, such as standard, fast, or high-availability storage. Cloud providers like AWS, Azure, and GCP offer StorageClasses that create PVs on demand.
- Example:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: aws-ebs
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp2
```

- Common Storage Classes by Provider

| Cloud Provider | Storage Class Provisioner |
|----------------|---------------------------|
| AWS            | kubernetes.io/aws-ebs     |
| Azure          | kubernetes.io/azure-disk  |
| GCP            | kubernetes.io/gce-pd      |
| OpenShift      | kubernetes.io/cinder      |

### Volume Attributes Classes

- Volume Attributes Classes extend StorageClasses by enabling finer control over storage parameters.
- They allow users to define custom attributes for persistent volumes, such as encryption settings, IOPS limits, or specific performance requirements.

### Dynamic Volume Provisioning

- Dynamic Volume Provisioning enables automatic creation of persistent volumes when a PVC is requested.
- This eliminates the need for manual PV provisioning and improves scalability.
- The provisioner is defined in the StorageClass, and storage is allocated on demand.

### Volume Snapshots

- Volume Snapshots provide a mechanism to capture point-in-time copies of persistent volumes.
- This is useful for backup, disaster recovery, and data cloning.
- Snapshots can be created, restored, and managed using Kubernetes’ VolumeSnapshot API.

### Volume Snapshot Classes

- A Volume Snapshot Class defines parameters for volume snapshot operations, similar to how StorageClasses define parameters for PVs.
- It helps manage snapshot policies, such as retention rules and backup frequency.

### CSI Volume Cloning

- Container Storage Interface (CSI) Volume Cloning allows users to create a duplicate of an existing volume.
- Unlike snapshots, clones create a fully independent copy of the volume that can be modified without affecting the original.

### Storage Capacity

- Kubernetes provides Storage Capacity Awareness, which allows scheduling decisions based on available storage resources.
- This prevents pods from being scheduled on nodes where storage capacity is insufficient.

### Node-specific Volume Limits

- To ensure optimal performance and prevent resource exhaustion, Kubernetes enforces Node-specific Volume Limits.
- Each node has a predefined limit on how many volumes it can support, which depends on the underlying storage provider.

### Volume Health Monitoring

- Volume Health Monitoring helps detect and report issues related to storage performance, connectivity, and failures.
- Kubernetes integrates with CSI drivers to expose volume health metrics, allowing administrators to take corrective actions proactively.

### Windows Storage

- Kubernetes supports Windows-based storage for Windows nodes.
- Windows-compatible storage options include SMB shares, iSCSI, and CSI drivers for cloud storage.
- This enables Windows containers to leverage persistent storage efficiently within Kubernetes clusters.

### Conclusion

Storage is a critical component of Kubernetes that ensures data persistence for applications. Persistent Volumes (PVs) and Persistent Volume Claims (PVCs) allow applications to request storage without direct dependency on the underlying infrastructure. StorageClasses enable dynamic provisioning, making it easier to manage cloud-native storage solutions. By understanding these storage concepts, you can build scalable and resilient applications in Kubernetes.
