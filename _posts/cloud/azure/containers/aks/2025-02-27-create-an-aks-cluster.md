---
layout: post
title: Create an AKS Cluster
categories: [cloud, azure, containers, aks]
tags: [Cloud, Azure, Kubernetes, AKS]
image: /assets/img/cloud/azure/containers/aks/aks-posts.jpg
Description`: Explore the different parameters and their purpose to create an AKS cluster and typical use cases.
---

## Introduction

When creating an Azure Kubernetes Service (AKS) cluster using Terraform, it's essential to understand the various parameters that influence the cluster's configuration. Below is the comprehensive list list of variables to customize your AKS deployment. 

### Core Configuration Parameters

#### Resource Group

- `Description`: Specifies the name of the Azure Resource Group where the AKS cluster will be deployed.
- `Need`: Resource groups help organize and manage related Azure resources.
- `Use Case`: Deploying multiple environments (e.g., dev, test, prod) in separate resource groups for isolation.

#### Location

- `Description`: Defines the Azure region for deploying the AKS cluster.
- `Need`: Choosing the appropriate region ensures compliance, latency optimization, and availability.
- `Use Case`: Deploying resources in the "East US" region to serve users in that geographic area.

#### AKS Cluster Name

- `Description`: Sets the name of the AKS cluster.
- `Need`: A unique identifier for the cluster within the resource group.
- `Use Case`: Naming the cluster "prod-aks-cluster" to indicate its purpose.

#### Kubernetes Version

- `Description`: Specifies the Kubernetes version for the cluster.
- `Need`: Allows selection of a specific Kubernetes version to ensure compatibility with applications.
- `Use Case`: Setting the version to "1.28" to leverage specific Kubernetes features.

#### SKU(sku_tier)

- `Description`: Defines the service tier for the AKS cluster (Free or Paid).
- `Need`: The Paid tier is required for SLA-backed uptime guarantees and certain advanced features.
- `Use Case`: Using the Paid SKU in production environments to ensure 99.95% SLA.

### Identity and Access Management

#### Identity Type

- `Description`: Determines the type of identity used by the AKS cluster (SystemAssigned or UserAssigned).
- `Need`: Manages access to Azure resources securely.
- `Use Case`: Using SystemAssigned for automatic identity management.

#### Entra ID Integration

- `Description`: Enables Entra ID integration for Role-Based Access Control (RBAC).
- `Need`: Integrates AKS authentication with Entra ID for centralized user management and access.
- `Use Case`: Enabling AAD integration to manage cluster access via Entra ID groups.

#### Role Baased Access Control(RBAC)(role_based_access_control_enabled)

- `Description`: Enables Kubernetes RBAC on the cluster.
- `Need`: Necessary for defining and enforcing granular access policies within Kubernetes.
- `Use Case`: Creating roles and bindings so that developers only have access to specific namespaces.

#### Entra ID Admin Group IDs

- `Description`: Lists the object IDs of Entra ID groups with admin access to the cluster.
- `Need`: Grants administrative permissions to specific groups.
- `Use Case`: Assigning the DevOps team group as cluster administrators.

#### Kubernetes Local Accounts (local_account_disabled)

- `Description`: Disables the local Kubernetes cluster admin account.
- `Need`: Enhances security by requiring Entra ID authentication only, removing access via the local admin credentials.
- `Use Case`: Enforcing enterprise security policies that prohibit the use of local admin accounts.

### Node Pool Configuration

#### Default/System Node Pool

- `Description`: Configures the default node pool for the AKS cluster.
- `Need`: Defines the initial set of nodes that run workloads.
- `Use Case`: Setting vm_size, node_count, and mode = "System" for running system components like CoreDNS and kube-proxy.

#### User Node Pools

- `Description`: Allows the addition of multiple node pools with specific configurations.
- `Need`: Supports workload segregation and scaling.
- `Use Case`: Creating a separate node pool for GPU-intensive tasks.

#### Linux Profile(linux_profile)

- `Description`: Specifies the admin username and SSH key for Linux nodes (used only in non-managed identity scenarios).
- `Need`: Required for node access when using non-managed systems or for troubleshooting directly on VMs.
- `Use Case`: Specifying SSH access credentials for custom node image scenarios or VM troubleshooting.

#### Confidential Computing(confidential_computing)

- `Description`: Enables confidential computing using hardware-backed trusted execution environments (TEEs).
- `Need`: Ensures that data is encrypted not only at rest and in transit, but also while in use.
- `Use Case`: Running financial or healthcare workloads that process sensitive information within secure enclaves.

### Networking Configuration

#### Network Profile

- `Description`: Defines the network settings for the AKS cluster, including network plugin and policies.
- `Need`: Customizes the networking model to fit organizational requirements.
- `Use Case`: Using the "azure" network plugin for advanced networking features.

| Parameter             | Description                                                                 |
|-----------------------|-----------------------------------------------------------------------------|
| `network_policy`      | Defines the network traffic rules for pod communication and security within the cluster. |
| `network_plugin`      | Specifies the container network interface (CNI) used to manage pod networking. |
| `network_plugin_mode` | Controls how IP addresses are assigned to pods, using either overlay or transparent modes. |
| `network_data_plane`  | Specifies the underlying data plane technology used to handle pod network traffic. |
| `load_balancer_sku`   | Determines the type of Azure Load Balancer used for exposing services outside the cluster. |
| `outbound_type`       | Defines how outbound internet traffic from the cluster nodes is routed. |
| `pod_cidr`            | Sets the IP address range for Kubernetes pods within the cluster. |
| `service_cidr`        | Defines the IP address range for Kubernetes services (ClusterIPs). |
| `dns_service_ip`      | Specifies the IP address used by the CoreDNS service within the service CIDR block. |

#### DNS Prefix

- `Description`: Sets the DNS prefix for the AKS cluster.
- `Need`: Determines the FQDN for the cluster's API server.
- `Use Case`: Setting the prefix to "prod-aks" resulting in "prod-aks.hcp.eastus.azmk8s.io".

#### Public FQDN for a Private Cluster(private_cluster_public_fqdn_enabled)

- `Description`: Allows a private AKS cluster to have a public DNS name that resolves to the private IP.
- `Need`: Useful when private access is needed, but a public DNS name simplifies client access (e.g., peered VNet scenarios).
- `Use Case`: Enabling internal users from another peered VNet to use the public FQDN for accessing the API server privately.

#### HTPP Proxy(http_proxy_config)

- `Description`: Specifies HTTP proxy settings for cluster nodes to access the internet through a proxy.
- `Need`: Required in secure environments with outbound internet traffic restrictions.
- `Use Case`: Routing all internet-bound traffic from AKS nodes through a corporate proxy for compliance.

#### Ingress(ingress_application_gateway)

- `Description`: Enables Azure Application Gateway as the ingress controller.
- `Need`: Provides a fully managed Layer 7 load balancer with WAF and autoscaling support.
- `Use Case`: Automatically routing external HTTP/S traffic into AKS using AGIC (Application Gateway Ingress Controller).

### Storage Configuration

#### Storage Profile(storage_profile)

- `Description`: Specifies the configuration for the CSI storage drivers and legacy drivers.
- `Need`: Manages persistent storage for pods using different Azure-backed storage options.
- `Use Case`: Enabling blob_csi_driver_enabled = true to allow pods to mount Azure Blob storage containers.

### Security and Compliance

#### Enable Private Cluster

- `Description`: Enables the creation of a private AKS cluster with no public endpoint.
- `Need`: Enhances security by restricting access to the API server.
- `Use Case`: Deploying a private cluster for internal applications.

#### Private DNS Zone ID

- `Description`: Specifies the ID of the private DNS zone for the cluster.
- `Need`: Manages DNS resolution for private clusters.
- `Use Case`: Integrating with an existing private DNS zone for name resolution.

#### Azure Policy Intergation(azure_policy_enabled)

- `Description`: Enables integration with Azure Policy for Kubernetes.
- `Need`: Enforces governance and compliance by applying Azure policies to cluster resources and workloads.
- `Use Case`: Automatically prevent the deployment of privileged containers or enforce naming conventions within Kubernetes.

#### OpenID Connect Provider/OIDC(oidc_issuer_enabled)

- `Description`: Enables OpenID Connect (OIDC) issuer URL on the AKS cluster.
- `Need`: Required for using workload identity and external authentication integrations with federated identity providers.
- `Use Case`: Allowing workloads in AKS to authenticate to Azure AD or other OIDC-compliant identity providers using federated identity.

#### Workload Identity(workload_identity_enabled)

- `Description`: Enables Azure AD workload identity, which lets Kubernetes workloads access Azure resources securely using federated identity.
- `Need`: Replaces the need for secrets or pod-managed identities with secure, native AAD integration.
- `Use Case`: Letting a Kubernetes pod securely access Azure Key Vault using federated workload identity.

#### Custom Certificates(custom_ca_trust_certificates_base64)

- `Description`: Accepts base64-encoded custom CA certificates to be trusted by the AKS nodes.
- `Need`: Required if internal services use self-signed certificates and the nodes/pods need to trust them.
- `Use Case`: Allowing workloads in AKS to connect to an internal private API using a self-signed certificate.

#### KeyVault Integration(key_management_service)

- `Description`: Configures integration with Azure Key Management Service (KMS) to encrypt Kubernetes secrets.
- `Need`: Enhances security by using customer-managed keys (CMK) to encrypt secrets at rest.
- `Use Case`: Regulatory compliance requirements mandating CMK for secrets in healthcare or financial apps.

#### KeyVault Secrets(key_vault_secrets_provider)

- `Description`: Enables the CSI driver to mount Azure Key Vault secrets as volumes in pods.
- `Need`: Secure and dynamic retrieval of secrets directly from Key Vault in Kubernetes workloads.
- `Use Case`: A pod that pulls its database password securely from Key Vault using the CSI driver.

#### Kubelet Identity(kubelet_identity)

- `Description`: Managed identity used by kubelets to interact with Azure resources like Key Vault and Azure Disks.
- `Need`: Required when using CSI drivers or cloud resources provisioned by the node (e.g., disk volumes).
- `Use Case`: Allowing nodes to mount Azure Disks that require authentication via the node identity.

#### Microsoft Defender(microsoft_defender)

- `Description`: Enables Microsoft Defender for Containers (formerly Azure Security Center).
- `Need`: Provides advanced threat protection, vulnerability scanning, and security alerts.
- `Use Case`: Enabling Defender in a production cluster to monitor container behavior and alert on suspicious activity.

#### Service Principal(service_principal)

- `Description`: Provides a service principal (client ID and secret) used by AKS to access Azure resources.
- `Need`: Essential if not using managed identities, especially in legacy setups.
- `Use Case`: Older environments where managed identity wasn’t used, and a manually created service principal is still in place.

### Monitoring

#### Monitor Metrics(monitor_metrics)

- `Description`: Enables and configures metric collection via Azure Monitor for containers.
- `Need`: Provides performance visibility and alerting for AKS workloads.
- `Use Case`: Enabling monitoring to track CPU/memory usage and receive alerts if thresholds are breached.

#### OMS Agent(oms_agent)

- `Description`: Enables the Azure Monitor Logs agent (Log Analytics).
- `Need`: Collects logs and metrics from nodes, containers, and control plane for observability.
- `Use Case`: Visualizing resource usage and troubleshooting failures using Azure Monitor dashboards and queries.

#### Service Mesh(service_mesh_profile)

- `Description`: Enables Open Service Mesh (OSM) integration with the AKS cluster.
- `Need`: Adds secure service-to-service communication, traffic management, and observability.
- `Use Case`: Managing communication between microservices with mutual TLS and traffic routing policies.

### Scaling

#### Auto Scaling(auto_scaler_profile)

- `Description`: Custom configuration for the Kubernetes cluster autoscaler.
- `Need`: Fine-tunes how quickly and efficiently the autoscaler adds/removes nodes.
- `Use Case`: Adjusting scale_down_delay_after_add to delay node scale-down after new nodes are added, preventing premature scale-down in bursty workloads.

#### Upgrades

#### Maintenance Window(maintenance_window)

- `Description`: Specifies when automatic upgrades and maintenance operations should be allowed.
- `Need`: Avoids disruptions during business-critical hours by restricting maintenance to certain time windows.
- `Use Case`: Scheduling upgrades on Saturdays between 2:00–4:00 AM when workloads are least active.

### AddOn Profiles

- `Description`: Configures managed add-ons like monitoring, ingress controllers, etc.
- `Need`: Enhances cluster functionality with integrated services.
- `Use Case`: Enabling the "http_application_routing" add-on for simplified ingress management.

### Tagging and Metadata

#### Tags(tags)

- `Description`: Applies custom tags to the AKS cluster and related resources.
- `Need`: Facilitates resource organization, cost management, and automation.
- `Use Case`: Tagging resources with "Environment: Production" and "Department: IT".

### Additional Parameters

#### Telemetry(enable_telemetry)

- `Description`: Controls the collection of telemetry data for the module.
- `Need`: Helps improve the module by providing usage insights.
- `Use Case`: Setting to false to disable telemetry in sensitive environments.

#### Lock

- `Description`: Applies a resource lock to prevent accidental deletion or modification.
- `Need`: Adds an extra layer of protection for critical resources.
- `Use Case`: Applying a "CanNotDelete" lock to the production AKS cluster.

#### Extensions (azurerm_kubernetes_cluster_extension)

- `Description`: Adds AKS cluster extensions such as Azure Arc, KEDA, Dapr, App Gateway Ingress Controller, etc.
- `Need`: Extends the cluster’s capabilities beyond default Kubernetes features.
- `Use Case`: Deploying the App Gateway Ingress Controller as an extension instead of managing it manually.

### Conclusion

Understanding and appropriately configuring these parameters ensures that your AKS cluster aligns with your organization's requirements for performance, security, and scalability.
