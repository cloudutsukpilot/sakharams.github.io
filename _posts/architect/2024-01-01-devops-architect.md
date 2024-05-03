---
layout: post
title: DevOps Architect
categories: [devops]
tags: [DevOps, Architect]
---

- DevOps can be defined as a philosophy for software development with the primary goal as reducing mean-time-to-change (MTTC) and mean-time-to-recovery (MTTR) for moving new features or bug fixes into production for incorporating customers’ feedback in the faster manner.

## Measure Success of DevOps:
 
| MTTC | MTTC is the time taken to move the product features from idea inception stage to production. | 
| | MTTC is calculated by dividing the time it takes to make a change by the number of changes made. |
| MTTR | MTTR is the time taken to move the production bugs fixes back into the production. |
| Frequency of release | |
| Mean-time-to-incident (MTTI) | MTTI is a metric that measures how quickly problems occur. | 


## Topics for DevOps Architect:
1.	DevOps & DevSecOps concepts
2.	Setting up DevOps implementation
3.	DevOps reference architecture
4.	DevOps reference implementation
5.	Continuous delivery concepts & reference architecture
6.	Technologies (Tools & Frameworks)

## Difference between Agile and DevOps

| Characteristics | Agile | DevOps | 
| --------------- | ----- | ------ |
| Work Scope | Only Agility | Automation needed along with Agility |
| Focus Area | Main priority is Time and deadlines | Quality and Time management are of equal priority | 
| Feedback Source | Customers	| Self (tools used for monitoring) | 
| Practices or Processes followed | Practices like Agile Kanban, Scrum, etc., are followed | Processes and practices like Continuous Development (CD), Continuous Integration (CI), etc., are followed |
| Development Sprints or Release cycles | Release cycles are usually smaller | Release cycles are smaller, along with immediate feedback. |
| Agility | Only development agility is present | Both in operations and development, agility is followed | 


## Challenges:
- Database migrations and new features are common challenges increasing the complexity of DevOps pipelines.

## Solutions:
- Feature flags are a common way of dealing with incremental product releases inside of CI environments.
- Define a convention that all migrations must be backwards compatible.


## Steps for DevOps Implementation:

**1. Goal Setting**
- Stakeholders across the enterprise should understand DevOps/DevSecOps and agree on common goals to reduce MTTC and MTTR
- Definition of DONE:
    + Agile: Creating a software which could be demonstrated at the end of the sprint
    + DevOps: Creating a software which could be demonstrated in the environment resembling production, at the end of the sprint

**2. Assessment**
- Development methodologies across different teams
- Application & technology landscape across different product lines
- Governance & related processes
- People expertise

**3. Gap analysis**
- Identify the gaps in all of the above fronts which could come in the way of DevOps implementation/rollout

**4. DevOps  Maturity model**
- Create enterprise DevOps maturity model covering the TO-BE state of enterprise at different levels of DevOps maturity model realization for the organization
    + Ad-Hoc: Perform ad-hoc tasks such as build automation, environment provisioning automation on-demand.
    +  Organized or Planned: Plan the DevOps project roadmap; As part of planning, choose development methodologies, team, tools & frameworks to be used, required teams’ training/mentoring, etc.
    +  Align & Assess: Implement proof-of-concept for one or two teams covering key aspects of DevOps implementation. Learn lessons and change the plan appropriately to be used for major rollout across different teams in the organization.
    +  Institutionalization: Roll out the DevOps/DevSecOps implementation across different teams in the organization.
    +  Continuous Improvement: Learn the lessons and continuously improve the DevOps processes.
    

**5. DevOps Implementation Roadmap**
- Create a DevOps implementation project roadmap covering some of the following aspects:
    + People
        * Training
        * Education
        * Documentation
    + Process
        * Code check-in by developers leading to activation of WebHooks triggering CI Builds
        * App compilation & building of deployment artifacts
        * Deployment artifacts upload in artifact repository
        * Test environment provisioning
        * App artifacts deployment across different test environments
        * Run the unit tests/integration on Test Environments
        * App artifacts production deployment
 
    + Governance and Processes 
        * Azure Policies
        * Microsoft Defender for Cloud
 
    + Technology & Tools:
        
        | Configuration management | Chef, Puppet, Ansible | 
        | Continuous integration | Jenkins |
        | Code repositories	| Git |
        | Container technologies | Docker, Kubernetes |
        | Artifacts repository | Nexus Repository Manager, JFrog Artifactory |
 
**6. DevOps Implementation Plan**
- Create a DevOps implementation plan across different teams and also enterprise-wide

**7. Implement & Govern**
- Roll out the DevOps with one or two teams, check the progress at regular intervals, align the implementation plan appropriately. Once lessons learned, plan the enterprise-wide rollout and execute as per the plan.




## Deployment Patterns:
 
| Blue and Green | In blue green deployments you have two identical environments. The “green” environment hosts the current production system. Deployment happens in the “blue” environment. |
| Canary Deployments | Canary releases are releases that roll out specific features to a subset of users to reduce the risk involved in releasing new features. |


## Different Types of DevOps Implementation:
 
**1. Ad-Hoc Automation-related Implementation**
- Automation of following phases/milestones of software development lifecycle. All of the below would impact positively on reducing MTTC and MTTR.
    + Build
    + Test (Unit tests, integration tests, security tests)
    + Deployment
    + Environment provisioning

**2. Team, Culture & KPIs Alignment**
- Alignment of teams and related culture to have developers, QA professionals, IT/OPs professionals, and Security professionals form part of the product team. 
- Thus, the agile product teams get transformed to include IT/Ops and Security staff members and inclusion of tasks in sprints for both security and IT/Ops staff members. 
- The primary goal for the whole team from DevOps or DevSecOps perspective is to ensure that software changes and bug fixes should be taken faster to the customer. 
- And, the DevOps or DevSecOps KPIs (Key Performance Indicators) of the product teams can be measured in form of the time taken to deliver software changes and bug fixes in the production. 
 
 
 **3. Continuous Delivery**
 - Continuous delivery of software using some of the following:
    + Automation: Automation of different phases of SDLC as mentioned in the above point.
    + Application Architecture Alignment: Alignment of application architecture to have a greater number of modular components/services; Microservices styled architecture is one of the popular choices
    + Technologies Alignment: Adoption of technologies which could be used to achieve continuous delivery of software changes across different environments in local premises or in cloud infrastructure.
    + People Alignment: Teams are trained appropriately to adapt to work with each other to achieve common goals related to the reduction of MTTC, MTTR and greater frequency of releases.


## Branching Strategies:
 
**1. Release branching**
- We can clone the develop branch to create a Release branch once it has enough functionality for a release. 
- This branch kicks off the next release cycle, thus no new features can be contributed beyond this point. The things that can be contributed are documentation generation, bug fixing, and other release-related tasks. 
- The release is merged into master and given a version number once it is ready to ship. 
- It should also be merged back into the development branch, which may have evolved since the initial release.

**2. Feature branching**
- This branching model maintains all modifications for a specific feature contained within a branch. 
- The branch gets merged into master once the feature has been completely tested and approved by using tests that are automated.

**3. Task branching**
- In this branching model, every task is implemented in its respective branch. 
- The task key is mentioned in the branch name.
- We need to simply look at the task key in the branch name to discover which code implements which task.




## DevOps Architect Responsibilities:
 
**1. DevOps Strategy and Planning**	
- DevOps Architects are responsible for developing and implementing the overall DevOps strategy and roadmap for the organization. 
- This includes defining the goals and objectives of the DevOps initiative, creating a plan for implementing DevOps practices and aligning the DevOps strategy with the overall business goals and objectives.

**2. Toolchain and Automation**
- DevOps Architects are responsible for selecting and implementing appropriate tools and technologies to support DevOps practices. 
- This includes setting up and managing CI/CD pipelines, implementing automation frameworks, and integrating various DevOps tools for continuous integration, continuous delivery, configuration management, and monitoring.

**3. Collaboration and Communication**
- DevOps Architects foster a culture of collaboration and communication between development, operations, and other cross-functional teams. 
- They work closely with different stakeholders to establish effective communication channels, promote transparency, and ensure smooth coordination among teams throughout the software development lifecycle.

**4. Cloud and Infrastructure Management**
- DevOps Architects are responsible for designing and managing the cloud and infrastructure architecture to support the DevOps practices. 
- This includes provisioning and managing cloud resources, implementing infrastructure-as-code (IaC) practices, and optimizing the infrastructure for scalability, security, and performance.

**5. Continuous Improvement**
- DevOps Architects drive a culture of continuous improvement by regularly reviewing and analyzing DevOps processes and practices. 
- They identify areas for improvement, implement changes, and monitor the effectiveness of the DevOps initiatives to achieve better efficiency, quality, and productivity.

**6. Leadership and Mentoring**
- DevOps Architects provide leadership and guidance to development and operations teams, acting as a mentor and coaches. 
- They provide technical expertise, guidance on best practices, and support in implementing DevOps processes and tools, while also fostering a positive work culture and nurturing talent within the organization.

**7. Risk Management and Security**
- DevOps Architects ensure that DevOps practices and processes adhere to security and compliance requirements. 
- They implement appropriate security measures and risk management practices to protect the organization's data, applications, and infrastructure from potential threats and vulnerabilities.
 
 
 
## DevOps Checklist:
 
**1. Culture**
+ [x] Ensure business alignment across organizations and teams - To avoid conflicts
+ [x] Ensure that your team understands your software life cycle - To know what to do and plan
+ [x] Reduce cycle time - From ideas to useable software
+ [x] Review and improve processes - regular reviews
+ [x] Do proactive planning
+ [x] Learn from failures - Learn and share
+ [x] Optimize for speed, and collect data 
+ [x] Allow time for learning - Build new skills
+ [x] Document operations - Architecture, Process, Automated Tasks, Recovery Procedures, Maintenance Procedures, Code Comments
+ [x] Share knowledge. 

**2. Development**
+ [x] Provide developers with production-like environments - Early detection of problems
+ [x] Ensure that all authorized team members can provision infrastructure and deploy applications - Automated Setup
+ [x] Instrument each application for insight - Instrumentation for application monitoring
+ [x] Track your technical debt
+ [x] Consider pushing updates directly to production - Feature Toggle, Canary Release

**3. Testing**
+ [x] Automate testing.
+ [x] Test for failures. 
+ [x] Test in production. 
+ [x] Automate performance testing to identify performance problems early. - Set Accepted Performance Metrics
+ [x] Perform capacity testing - Define Maximum limits
+ [x] Perform automated security penetration testing. 
+ [x] Perform automated business continuity testing - Test cases for backup recovery and failures.

**4. Release**
+ [x] Automate deployments.
+ [x] Use continuous integration. 
+ [x] Consider using continuous delivery. 
+ [x] Make small, incremental changes - Limit potential effects and simply understanding/debugging problems
+ [x] Control exposure to changes to end users - Use feature toggles
+ [x] Implement release management strategies to reduce deployment risk - Canary or Blue Green Deployments
+ [x] Document all changes. 
+ [x] Consider making infrastructure immutable. 

**5. Monitoring**
+ [x] Make systems observable - Health endpoints, Common and consistent schema
+ [x] Aggregate and correlate logs and metrics - Corelation
+ [x] Implement automated alerts and notifications.
+ [x] Monitor assets and resources for expirations.

**6. Management**
+ [x] Automate operations tasks - Consistent execution and quality
+ [x] Take an infrastructure-as-code approach to provisioning.
+ [x] Consider using containers.
+ [x] Implement resiliency and self-healing - retry functions, failover
+ [x] Have an operations manual. 
+ [x] Document on-call procedures.
+ [x] Document escalation procedures for third-party dependencies.
+ [x] Use configuration management. 
+ [x] Get an Azure support plan and understand the support process.
+ [x] Follow least-privilege principles when you grant access to resources.
+ [x] Use Azure role-based access control. 
+ [x] Use a bug tracking system to track problems. 
+ [x] Manage all resources in a change management system.
+ [x] Use checklists.
