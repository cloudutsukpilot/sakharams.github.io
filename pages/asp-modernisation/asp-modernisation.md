---
layout: page
title: ASP Infrastructure Platform Modernisation Architecture
icon: fas fa-cloud
order: 6
---

## ASP Infrastructure Platform Modernisation Architecture - POC

### Vision
- Design and Implement a scalable Infrastructure architecture for ASP
- Base platform infrastructure defined as code
- Easy customer onboarding with COPS

### Current Architecture

![Current Architecture](/assets/img/projects/asp-modernisation/current-asp-deployment-architecture-high-level.png)

### ASP Engineering – Modernization plan
- Transforming ASP Connector .Net framework architecture to .Net Core, thus providing following capabilities
    + Moving away from Windows Server as .Net core can run on Linux
    + Easy conversion of Linux process to Linux container
    + Containers can be orchestrated by Container Instances or AKS
- Moving StoreSite to containers from Azure App Service
- Pushing metrics, traces and logs to external agnostic systems like Azure Log Analytics, Loki
- Containerization of Journaling feature and deployment on Kubernetes

### ASP Modernization Proposed Model
- SRE team has studied the current ASP architecture. Considering the scalability requirements outlined in the Vision section, following design is proposed. 
- The new architecture will involve the following:
    + Infrastructure As Code Model. Desired state of the infrastructure will be designed as code, code reviewed and applied by automation
    + Isolated Tenant configuration per customer – can be achieved with network, compute isolation
    + Improved resource utilization – horizontal and vertical scaling capability utilizing the containerized approach and suitability with Kubernetes Service
    + Shortened software development cycles – ability to define deployment code outside of product code
    + Elastic Search Indexing is already containerized, StoreSite can be containerized soon
    + Would be Cloud Agnostic (No Vendor lock-in. Kubernetes services are available as Managed Cloud Offerings or Onpremises)

### Following will be the components involved:
1. Network Design
- VNets to be private only networks with no Public access
- Work with IT and Security team to identify sufficient Class A CIDR ranges for all of the VNets (10.0.0.0/8 as the main class A range and then the regional)
- A central VNet created in Azure also called as Hub VNet in one proposed region (US East as an example)
    + This VNet will host COPS server, COPS DB
    + Azure Bastion Service (Entry point for Operations to the Infrastructure)
    + Azure Firewall
- Every supported Azure Region (Where we have to onboard customers) will host a Spoke VNet
    + The Spoke VNets will have Utility Subnets (Loki, Qualys, etc)
    + Every Customer will have a customer specific Subnet - preferably having naming convention identifying the customer name (customer1-useast-subnet for example)
        * Each Subnet will have a Network Security Group configured to permit only allowed traffic. For example different customer subnets cannot talk with each other
        * Each Subnet can be configure to allow specific Azure Resources using Service Endpoints
        * Azure Resources can also be configured to allow traffic from specific subnets only
        * All customer resources like VMs, Nodepools, etc will be hosted in Customer specific subnets only
- VNet peerings (Interal Networking):
    + Hub VNet will be peered to all Spoke VNets
    + Inter Spoke Traffic Routing
        * As per requirement multiple Spoke VNets can also be peered with each other
        * It is recommended that inter VNet routing happens through Hub VNet by allowing transitive traffic and routing rules
    + Network Security Groups will anyway control the allowed network flow
- Azure Application Gateway with Web Access Firewall (WAF)
    + Azure Application Gateway is proposed to be the preferred load balancer (entry point) for the Customer Exposed StoreSite
    + There will be a Application Gateway in each region (VNet)
    + Azure Application Gateway will be configured with WAF as per the required security policy
    + For Commercial Cloud customers, we are proposing a single Application Gateway per region
        * Each App Gateway will have the customer specific frontend and backends configured
        * For example if customer1's primary region is eastus, then the customer specific listener will be on the eastus Application Gateway
        * The backend for the Application Gateway will be the StoreSite service


![Hub-Spoke Topology](/assets/img/projects/asp-modernisation/network-hub-spoke-high-level.png)


### ASP Compute Workload Design 
- With the Network layer defined, the ASP compute Workloads can be accomodated in the respecitve regional VNets. The new workload engine for containerized workloads can be 

- Azure Kubernetes Service (AKS)
    + AKS cluster can be deployed in each Region
    + Each customer will be configured with a customer specific kubernetes namespace
    + Network, Access security within Kubernetes can be configured at a namespace level
    + Customer Specific NodePools will be created for the compute requirements. These nodepools will host the containers (pods)
    + Since the nodepools will be in customer specific subnets, there will be network isolation

- Other ASP Resources 
    + The other ASP resources will be provisioned as per the existing model (COPS) with one change that they will be created with specific VNet and Subnet configurations
        * Azure SQL Database (Hub and Store DBs) - This can be provisioned as per current Model but with Private Only network enabled and private link with the respective VNet and customer Subnet
        * Azure Storage Accounts - These can be provisioned as per current Model but with Private Only network enabled and private link with the respective VNet and customer Subnet
        * Connector VMs - These will be placed in specific VNet and Subnets
        * Export VMs - These will be placed in specific VNet and Subnets
We are proposing a phased approach for the deployment of these resources

### Phase 1
In Phase 1, we will deploy the following resources:
- VNets and Subnets as per the design
- Hub VNet with Firewall and Bastion Service
- AKS cluster in respective regions
- Connector and Export VMs will be deployed in the new network model
- SQL DBs, Storage Accounts will be private only and allowed in specific VNets and subnets
- Attempt to containerize the following:
    + Search Service
        * Elastic Search component to be containerized
        * Nginx and Tika service are already containerized.
    + StoreSite service to be containerized 
        * StoreSite web app can be containerized
        * Web Jobs can be run as Kubernetes Jobs. Need to try this
    + Journaling
        * There is a parallel effort to containerize the Journaling service
- Create Kubernetes Manifests (Deployment YAMLs) for deploying the services on AKS

![Proposed K8S Architecture - Phase 1](/assets/img/projects/asp-modernisation/proposed-k8s-architecture-phase-1.png)

### Phase 2

![Proposed K8S Architecture - Phase 2](/assets/img/projects/asp-modernisation/proposed-k8s-architecture-phase-2.png)

### Plan:
- Build out Regional VNets (2 Regions for this POC), Hub and Spoke
- Subnets for Customer workloads
- Build out Kubernetes Clusters per region
- Build out NodePools in each subnet
- Have 3 customer ASP deployments in this environment spanning multiple regions

### Asks Needed from ASP Ops/Engg teams
1. In the dev environment, access to a working setup having multi region deployment
    - Connector VMs protecting Sharepoint and Office 365
    - Export VM
    - Search VM
2. Sharepoint and Office 365 test accounts


### Outcome:

- Demonstrate the SRE and Operation workflows for:
1. K8S Infrastructure deployment through Gitlab
2. ASP customer onboarding through COPS


