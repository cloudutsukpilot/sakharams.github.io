---
layout: post
title: Cloud Migration
categories: [cloud migration]
tags: [Cloud Migration, Architect]
---

## Cloud Migration

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
 
  Build a Business Case - Prepare as per the organisation need
  Understand Application Portfolio - All the details about application and architecture
  Migration Plan - Cover Technology, People, Process
  Operating Plan - Define RACI for Apps, Infra in Design and Operation
  Migration - Note learning and action items
  Reach CSP's/Support for Help
  Track till Closure
 
 
Migration Framework:
 
Assessment
(Migration Readiness Assessment)	•	Discovery
•	Business Need/Cost Estimation 
Readiness & Planning 
(Migration Readiness Planning)	•	Business Case
•	Migration Plan
•	Security
•	Operating Model 
•	Which team will own what responsibilities
•	Skills/Zones/Services Selection
•	Skills required for migration
Migration	•	Migrate
•	Integrate
•	Optimized
Operations	•	Monitor
•	Test
•	Optimisation
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
Current Cost Estimation:
 
 
 
Server Costs	Hardware - Server, Rack Infrastructure, PDU's, ToR Switches (+Maintenance)	Software - OS, Virtualization Licenses (+Maintenance)	Overhead (Space, Power, Cooling)
Storage Costs	Hardware - Storage Disks, HBA's, SAN/FC Switches	Storage Admin	Overhead (Space, Power, Cooling)
Network Cost	Network Hardware - Core/Aggregation, Switches, Bandwidth	Network Admin	Overhead (Space, Power, Cooling)
IT Labor Costs	Server Admin, Virtualization Admins	 	 
 
 
Migration Strategy (6R's):
 
Rehost	•	Like to Like Migration
•	Time saving, No app code change
Replatform	•	Lift and Shift with some change
•	To have scalable app, app code change, add new cloud capabilities
Refactor	•	Adopt Cloud Based Service
•	Some app code change, take advantage of devops
Repurpose	•	Transform App Functionality
Retire/Rebuild	•	Retire from On-Premise
•	- build new app using Cloud native technology, take cloud benefits
Retain	•	Retain Legacy EoL
 
 
Migration Tools:
 
Discovery Tools	•	Discovery Connector
•	Discovery Agents
Migration Tools	•	DB Migration
•	Server Migration
•	ATADATA
•	CloudEndure
•	CloudBasic
Migration Program	•	PS
•	Partner Solution
•	Accelerated Program
Document and Support	•	User Guide
•	Forum
 
 
 
 
Migration Process:
 
Steps	Resources	Tools
1. Discovery/Assessment of current Env and architecture	- Apps
- Databases
- VM's
- 3rd Party Integrations
- Network
- Monitoring
- CI/CD
- Release Managment
- DevOps
- Backups
- Cost	TSO Logic/Migration Evaluator
CART (Cloud Adoption Readiness Tool) 
2. Readiness and Planning	 	- AWS Migration Hub
- Application Discovery
- Control Tower
- Schema Conversion
- Landing Zone
3. Migration	 	- CloudEndure
- Server Migration
- Database Migration
- AWS Marketplace
- VMWare Cloud
4. Operations and Optimizations	- Managed Services
- Management and Governance	 
 
 
Benefits	Drawbacks
Faster Deployment
Greater Security 
Less Complexity
Ease of monitoring
Backup and Metrics 
Centralized Management - Single Pane of Glass
Reduced Costs - Scaling
Use Cloud Specific features	Data Sensivity - Goverment Laws
Small Setup 
Latency 
Loss of Control
Switching - Behavior/Training
 
 
Online Migration
- AWS Direct Connect
- Data Sync
- Storage Gateways
- S3 Transfer Acceleration
- Kinesis Firehose
- Partners
 
Offline Migration
- Snowball
- Snowball Edge
- SnowMobile
 
Problems faced during migration:
Foreign keys and secondary indexes are missing
Permissions Missing
Primary key violation errors occur when you restart a task

