---
layout: page
title: ASP Journaling Infrastructure Automation
icon: fas fa-cloud
order: 6
---

### ASP Journaling Infrastructure Automation

- High Level Goals
- Architecture Diagram
- Automation Framework Design 
    + Automation Development Model
        * Stash Repositories Model
    + Infra Deployment Automation
    + Infrastructure as code data structure
    + Automation Pipelines
- References

### High Level Goals
- Define infrastructure and Application as code
- Updates to the infrastructure code should be code reviewed and unit tested
- Deployment of infrastructure to be made by automation pipelines
- Upgrade/updates to the infrastructure to be made by automation pipelines


### Architecture Diagram

![Email Journaling Architecture](/assets/img/projects/email-journaling/email-journaling-architecture.png)




### Automation Framework Design 
- Alta View automation framework is a workflow which combines infrastructure automation tools like Terraform/Ansible, Code Repository and pipeline tools like Stash/GitLab and Software development processes.
- The overall automation is broadly categorised in the following components.
    1. Infrastructure Deployment automation - This comprises of all of the Cloud infrastructure components like Vnets, Storage accounts, etc which are expected to be one time changes or less frequently changing
    2. Application Deployment automation - This comprises of deployment of the application software components like Journaling, configuring the mailboxes etc
    3. Monitoring infrastructure - Grafana, Prometheus


### Automation Development Model
- All deployments will be done from master branch with tags for specific environments
- Create branch with Jira ticket ID for any new development or deployment
- OPS test infra with minimum components will be available for testing with terraform plan
- Once the branch tests pass, the automation developer creates a Merge Request to Master


### Infra Deployment Automation
- Terraform is the tool of choice for defining and creating the infrastructure
- Ansible will be used to do the postfix server installation and mailbox configuration
- Base will be Terraform modules with DRY principle
- Folder structure defining environments (preprod, prod, dev, demo, etc)
- Sensitive data will be encrypted with Mozilla SOPS and stored in Git Repo. Example → Secrets


- This block defines the following as example. This will create:

 - 3 DNS Zones as defined by fqdn
    + Create MX records accordingly
- 3 postfix instances
    + Each instance will have a pair of VMs. One in each region defined as region1 and region2
    + VM details are defined in each VM block
    + 2 file shares - one as primary and other as secondary
- Ansible automation will create the following:
    + Setup postfix on each VM and configure the mailboxes as defined by customer/journaluser field
    + mount the respective fileshares





