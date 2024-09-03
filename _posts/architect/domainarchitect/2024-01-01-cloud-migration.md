---
layout: post
title: Cloud Migration
categories: [architect, cloud migration]
tags: [Cloud Migration, Architect]
---

## Cloud Migration

### Application Migration Checklist

1. **Assess Current Environment**
- Evaluate existing infrastructure, dependencies, and application performance to identify potential challenges and compatibility issues before migration.

2. **Define Migration Strategy**
- Choose an appropriate migration strategy (e.g., lift-and-shift, refactor, replatform) based on the application requirements and business goals.

3. **Backup Data**
- Ensure all critical data is backed up securely to avoid any loss during the migration process and to facilitate recovery if necessary.

4. **Plan Downtime**
- Schedule and communicate planned downtime to stakeholders, ensuring minimal disruption to users and business operations during the migration.

5. **Test Migration Process**
- Conduct thorough testing in a staging environment to validate that the migration process works as intended and that the application functions correctly post-migration.

6. **Monitor Post-Migration**
- After migration, monitor the application for performance, stability, and any issues to ensure it operates smoothly in the new environment.


### Database Migration Checklist

1. **Evaluate Current Database**
- Assess the current database structure, data types, and dependencies to identify potential challenges and ensure compatibility with the target environment.

2. **Select Migration Method**
- Choose the appropriate migration method (e.g., replication, ETL, backup-restore) based on data volume, complexity, and downtime tolerance.

3. **Backup Existing Data**
- Perform a complete backup of the current database to safeguard against data loss during the migration and enable a quick rollback if needed.

4. **Plan and Communicate Downtime**
- Schedule downtime for the migration, inform stakeholders, and ensure minimal disruption to operations during the migration process.

5. **Run Migration Tests**
- Conduct a dry run or test migration in a non-production environment to validate the process, ensuring data integrity and application functionality post-migration.

6. **Monitor and Optimize**
- After migration, closely monitor the database performance, check for any anomalies, and optimize queries or configurations as needed for the new environment.


### Migrations Needed After Company Acquisition

1. **Application Migration**
- Consolidate and integrate applications from both companies, ensuring compatibility and standardization across the merged organization.

2. **M365 Migration**
- Migrate Microsoft 365 services (e.g., email, SharePoint, Teams) to a unified tenant to streamline communication and collaboration.

3. **Database Migration**
- Merge, migrate, or consolidate databases, ensuring data integrity, consistency, and accessibility across the combined entity.

4. **Network Integration**
- Integrate and standardize network infrastructure, including VPNs, firewalls, and security protocols, to ensure secure and seamless connectivity.

5. **Identity and Access Management (IAM) Integration**
- Unify IAM systems to manage user identities, roles, and access permissions consistently across both organizations.

6. **Process Redefining**
- Align and redefine business processes, workflows, and policies to reflect the combined operations and achieve operational efficiency.

7. **Data Migration and Consolidation**
- Transfer, cleanse, and merge data from various sources, ensuring a single source of truth and consistent data governance across the organization.

8. **ERP/CRM System Migration**
- Consolidate or migrate ERP and CRM systems to maintain a unified view of financials, customer relationships, and supply chain operations.

9. **Security Policy Alignment**
- Harmonize cybersecurity policies and practices to protect against threats while maintaining compliance with regulatory requirements.

10. **IT Service Integration**
- Integrate IT service management tools and practices to ensure seamless IT support and incident management across the new organization.


### M365 Migration Checklist

1. **Assess Current Environment**
- Evaluate the existing Microsoft 365 (M365) environment, including the number of users, mailboxes, applications, and data. 
- Identify potential challenges such as legacy systems, custom configurations, and compliance requirements.

2. **Define Migration Strategy**
- Choose a migration strategy based on the organization's needs, such as staged migration, cutover migration, or hybrid migration. 
- Determine whether a third-party tool is needed and create a detailed migration plan, including timelines and resource allocation.

3. **Prepare the Target Environment**
- Set up and configure the target M365 environment, ensuring that it meets the organization’s requirements.
- This includes setting up user accounts, permissions, security policies, and configuring services like Exchange Online, SharePoint Online, and Teams.

4. **Backup Existing Data**
- Ensure that all critical data, including emails, documents, and settings, are backed up before starting the migration. 
- This safeguards against data loss during the process and enables recovery if necessary.

5. **User Communication and Training**
- Communicate the migration plan, timelines, and impact to all users. 
- Provide necessary training and resources to help users transition smoothly to the new environment.

6. **Perform Pilot Migration**
- Conduct a pilot migration with a small group of users or a specific department to test the process. 
- Validate that data, configurations, and user access are correctly migrated. Identify and address any issues before full-scale migration.

7. **Execute Full Migration**
- Proceed with the migration of all users, mailboxes, applications, and data. 
- Monitor the process closely to ensure that it runs smoothly, and address any issues that arise during the migration.

8. **Post-Migration Validation**
- After migration, verify that all data and services are functioning as expected. 
- This includes checking email flow, document accessibility, permissions, and configurations. 
- Ensure that users have the necessary access and that there are no disruptions to their work.

9. **Decommission Legacy Systems**
- Once the migration is successful and all data is validated, decommission the legacy systems that are no longer needed. 
- Ensure that any necessary data or configurations are archived for future reference.

10. **Ongoing Support and Optimization**
- Provide ongoing support to users as they adapt to the new M365 environment. 
- Monitor performance, address any post-migration issues, and optimize the environment for better efficiency and security. 
- Conduct a post-migration review to identify areas for improvement in future migrations.

### Benefits of migration to cloud:
1. Values to Business
    - Time to Market
    - Agility	
2. Lower Risk
    - No Prior (Upfront) Investment
    - Easy Rollback	Less 
3. Total Cost of Ownership
    - Std Estimation/Planning
    - More Scope for Automation
    - Less Cost on Infra
 
### Checklist for Migration:
 
1. Build a Business Case - Prepare as per the organisation need
2. Understand Application Portfolio - All the details about application and architecture
3. Migration Plan - Cover Technology, People, Process
4. Operating Plan - Define RACI for Apps, Infra in Design and Operation
5. Migration - Note learning and action items
6. Reach CSP's/Support for Help
7. Track till Closure
 
 
### Migration Framework:
 
1. Assessment (Migration Readiness Assessment)	
    + Business Case
    + Discovery
    + Business Need/Cost Estimation 

2. Readiness & Planning (Migration Readiness Planning)	
    + Migration Plan
    + Security
    + Operating Model 
    + Which team will own what responsibilities
    + Skills/Zones/Services Selection
    + Skills required for migration

3. Migration
    + Migrate
    + Integrate
    + Optimize

4. Operations	
    + Monitor
    + Test
    + Optimisation

 

### Current Cost Estimation:

1. `Server Costs`
    + `Hardware` - Server, Rack Infrastructure, PDU's, ToR Switches (+Maintenance)	
    + `Software` - OS, Virtualization Licenses 
    + `Overhead` - Space, Power, Cooling

2. `Storage Costs`	
    + `Hardware` - Storage Disks, HBA's, SAN/FC Switches	Storage Admin	
    + `Overhead` (Space, Power, Cooling)

3. `Network Cost`	
    + `Network Hardware` - Core/Aggregation, Switches, Bandwidth	Network Admin	
    + `Overhead` - Space, Power, Cooling

4. `IT Labor Costs`
    + Server Admin, Virtualization Admins	 	 
 
 
### Migration Strategy (6R's):
 
1. `Rehost`	
    - Like to Like Migration
    - Time saving, No app code change

2. `Replatform`	
    - Lift and Shift with some change
    - To have scalable app, app code change, add new cloud capabilities

3. `Refactor`	
    - Adopt Cloud Based Service
    - Some app code change, take advantage of devops

4. `Repurpose`	
    - Transform App Functionality

5. `Retire/Rebuild`
    - Retire from On-Premise
    - Build new app using Cloud native technology, take cloud benefits

6. `Retain`	
    - Retain Legacy EoL
 
 
### Migration Tools:

1. `Discovery Tools`
    - Discovery Connector
    - Discovery Agents

2. `Migration Tools`
    + DB Migration
    + Server Migration
    + ATADATA
    + CloudEndure
    + CloudBasic

3. `Migration Program`	
    + PS
    + Partner Solution
    + Accelerated Program

4. `Document and Support`
    + User Guide
    + Forum
 
 
 
 
### Migration Process:
 
| Steps	| Resources	| Tools | 
| ----- | --------- | ----- | 
| 1. Discovery/Assessment of Current <br> Env and Architecture	- Apps | - Databases <br> - VM's <br>  - 3rd Party Integrations <br> - Network <br> - Monitoring <br> - CI/CD <br> - Release Managment <br> - DevOps <br> - Backups <br> - Cost	| - TSO Logic/Migration Evaluator <br> - CART (Cloud Adoption Readiness Tool) | 
| 2. Readiness and Planning | <br> - AWS Migration Hub <br> - Application Discovery <br> - Control Tower | - Schema Conversion <br> - Landing Zone | 
| 3. Migration | - CloudEndure <br> - Server Migration <br> - Database Migration | - AWS Marketplace <br> - VMWare Cloud | 
| 4. Operations and Optimizations | - Managed Services  | - Management and Governance | 
 
 
### Benefits & Drawbacks

| Benefits | Drawbacks |
| Faster Deployment | Loss of Control | 
| Greater Security | Switching - Behavior/Training | 
| Less Complexity | Latency | 
| Ease of monitoring | |  
| Backup and Metrics  | | 
| Centralized Management - Single Pane of Glass | | 
| Reduced Costs - Scaling | |
| Use Cloud Specific features	Data Sensivity - Goverment Laws | |
| Small Setup | |


 
### Online Migration
- AWS Direct Connect
- Data Sync
- Storage Gateways
- S3 Transfer Acceleration
- Kinesis Firehose
- Partners
 
### Offline Migration
- Snowball
- Snowball Edge
- SnowMobile
 

### Problems faced during migration:

#### Databases
1. Foreign keys and secondary indexes are missing
2. Permissions Missing
3. Primary key violation errors occur when you restart a task

