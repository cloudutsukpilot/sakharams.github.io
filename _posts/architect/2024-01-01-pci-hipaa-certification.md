---
layout: post
title: PCI HIPAA Certification
categories: [security, pci, hipaa]
tags: [Security, PCI, HIPAA]
---


## PCI HIPAA Certification
- Below is the list of topics and the respective questionaire for which evidence is requested from an organisation to get PCI HIPAA certified.

### Scoping 

| Questions | Components |
| --------- | ---------- |
| Office Locations | Cloud Service Providers |
| Env Locations - Data Centers Location | On-Premise Locations |
| Application List | 3rd Party Vendors |
| Asset List - App, DB, Storage | |
| Data Flow Diagram | |
| Architecture and Network Diagrams | |
| External IP Addresses | | 

### Network

| Questions | Components |
| --------- | ---------- |
| Rules configured in all the network devices | Firewall |
| Configuration for all network devices | Router |
| Justification for use of services, protocols and ports allowed in network devices | Application Gateway | 
| System generated Inbound and Outbound Access List | NAT Gateway |
| User List with the permissions to network devices | Virtual Network |
| Secured backup procedure for all network device configuration | |
| Change Management Process for network devices | |
| Semi-annual Compliant Reports for network devices | |
| Preventive measures for Anti-spoofing | |
| Stateful Inspection enabled on external firewalls | |
| Sample Inbound and Outbound Logs from network devices | |
| Samples from personal firewall with Firewall enabled | |

### Configuration Management

| Questions | Components |
| --------- | ---------- |
| User Access Review - Default account removed | Azure AD User List| 
| List of users and their roles | All Compute Resources in Azure |
| List of services and exposed ports running on all the systems | Azure Firewall |
|  Wireless Access Point - Firmware Version, Encryption, Defaults are changed | Web Application Firewall |
| Strong Encryption is implemented on all the devices | |
|  Additional Controls implementation for HTTP, FTP, Telnet, Specific SSL/TLS, SSH | |
| Configuration Scan evidence against hardening standards | |


### Data Encryption at rest

| Questions | Components |
| --------- | ---------- |
| Storage Location, Retention period, Secure data deletion, Encryption Details | Azure Keyvault |
| Evidence showing all the application assets are search for confidential data | Platform manged Keys |
| Confidential Data storage Location, Masking, User list having access | |
| Data Protection Methods (Encryption, Hashing, Truncation, Tokenization, etc) | | 
| Key Management Process, Hardware Security Modules | |

### Data Encryption in transit 

| Questions | Components |
| --------- | ---------- |
| Encryption used to transmit in-scope data over messaging technologies | Certificates, TLS|
| Encryption used to transmit in-scope data over any open or public communication channel | All resources transmitting data |

### Anti-Malware

| Questions | Components |
| --------- | ---------- |
| Anti-Virus Implementation Process and in Active Mode | Microsoft Defender for Cloud |
| Anti-Virus Server Management Console | |

### Application Security

| Questions | Components |
| --------- | ---------- |
| Code Review Process | CI, Git |
| Current Patch Levels and Upgrade Process | Application Upgrade | 
| Advisory Alerts and Analysis Process against Asset list | Compute Resources Upgrade |
| Secure Software Development Policy/Procedure | CIS Benchmark, OWASP |
| Process for generating test data | |
| Sample Change Requests for any security/configuration/app change | |
| Web Application Firewall | |
| Logical separation between Prod and Non-Prod environments | |
| Segregation of duties between users with Prod and Non-Prod access | |
| Secure Code Training | | 


### Logical Access

| Questions | Components |
| --------- | ---------- |
| Password Encryption | Azure AD |
| List of Users, Access Permission and Justification for acccess | Microsoft Authenticator |
| User creation, deletion and modification process and samples | |
| List of Vendors with remote access | |
| Evidence for Account lockout policy, lockout duration, timeout policy | |
| Evidence for Password length, complexity, history, expiry | |
| Current Active Connections on any system | |
| Evidence of MFA | |
| Organisation level Access Control Policy | |
| Recent Password Reset Forms/Requests | |

### Physical Security

| Questions | Components |
| --------- | ---------- |
| List of all Physical Locations | | 
| User Access Creation and Deletion Forms/Requests | |
| Visitor Access Procedure and Visitor Logs Samples | |
| Controls for physically securing data | |
| Records of media movement (if any) | |
| Physical Media Destruction Procedure | |
| List of Point-of-sale(POS) devices and their security and maintenance procedure | |

### Logging and Monitoring	

| Questions | Components |
| --------- | ---------- |
| Samples of alerts received and the response on the alerts | Log Analytics Workspace |
| Evidence of File Integrity Monitoring implementation | Azure Activity Log | 
| Daily Log Review Report | Monitoring Tools |
| Evidence of event logs | Azure Monitor | 
| Evidence of monitoring systems for critical security components | Microsoft Defender for Cloud | 
| Evidence of Audit Log Policy settings | 
| Evidence of Network Time Protocol (NTP) | 
| Evidence of Central SysLog Server	|


### Security Testing

| Questions | Components |
| --------- | ---------- |
| Internal Penetration Testing | |
| External Penetration Testing | |
| Internal Vulnerability Scans | |
| Methods used for Penetration Testing | |
| Quarterly Vulnerability Scan Report | |
| Configuration/Vulnerability Assessment Report | |

### Human Resources	

| Questions | Components |
| --------- | ---------- |
| Information Security Policy | |
| Information Security Awareness Training Material | |
| Employee Background Checks | |

### Policies and Procedures	

| Questions | Components |
| --------- | ---------- |
| Organization Information Security Policies | |
| Organizational Chart and their roles | |
| Acknowledge for responsibility of customer data | |
| Process of Clearing House | |
| Evidence of repairs and modification to physical facility | |
| Emergency Access Evidence | |
| Technology used for Remote Access. Ex. VPN | |
| Data movement policy | |
     

### Third Party Management

| Questions | Components |
| --------- | ---------- |
| List of 3rd party service providers | |
| Associated Compliance documentation for 3rd Party service providers | |
| Document due diligence for 3rd party service providers | |
| Incident Response	Organizations Incident Response Plan | |
| Incident Handling Training Records | |
| Evidence showing risk assessment includes breach notification | |
| Incidents are notified to Individuals in an acceptable time period | |
| Breach notification handling process and samples | |
| Process to notify breach incidents to stakeholders, business associate and law enforcement | |

### Business Continuity Plan/Disaster Recovery

| Questions | Components |
| --------- | ---------- |
| Enterprise Business Continuity Plan (BCP)/Disaster Recovery (DR) plan | Azure Site Recovery|
| Latest DR test results | Availability Sets and Zones |
| Data backup procedures | Azure Backup Service |
| Evidence showing environments are governed by enterprise security standards | |


### Risk Assessment	

| Questions | Components |
| --------- | ---------- |
| Risk Assessment Methodology | |
| Risk Assessment Report | |

### Governance + Compliance

| Questions | Components |
| --------- | ---------- |
| Organizational chart that shows the separation of duties between Operational and security/compliance roles | |



