---
layout: post
title: Cloud Interview Questions
categories: [cloud]
tags: [Cloud, AWS, FinOps, Interview Questions]
description: Cloud interview questions by topic and difficulty - fundamentals, compute and scaling, resilience and multi-region, cost and FinOps, and identity and access - with answers
interview_domain: cloud
interview_topic: Cloud Fundamentals
interview_sections:
  Cloud Fundamentals: { topic: Cloud Fundamentals }
  "Cloud Fundamentals: Advanced": { kind: scenario }
  "Compute & Scaling": { topic: Compute & Scaling }
  "Compute & Scaling: Advanced":
    questions:
      2: { kind: scenario }
  "Compute & Scaling: Expert":
    questions:
      2: { kind: scenario }
  "Resilience & Multi-Region": { topic: Resilience & Multi-Region }
  "Resilience & Multi-Region: Advanced": { kind: scenario }
  "Cost & FinOps": { topic: Cost & FinOps }
  "Cost & FinOps: Intermediate": { kind: scenario }
  "Cost & FinOps: Advanced": { kind: scenario }
  "Cloud Identity & Access": { topic: Cloud Identity & Access }
  "Cloud Identity & Access: Advanced": { kind: scenario }
---

## Cloud Interview Questions

Cloud platform questions for cloud engineer, DevOps and SRE interviews, grouped by topic and graded by
difficulty: the fundamentals, compute and scaling, designing for failure across zones and regions, keeping
the bill under control, and identity and access. Examples use AWS names; the ideas carry over to Azure and GCP.

- **Beginner**: definitions and the "why"; expected of anyone starting in the area.
- **Intermediate**: how things work and the trade-offs; expected of an engineer who works with them day to day.
- **Advanced**: senior level; production scenarios across several layers.
- **Expert**: staff / lead level; design at scale, guardrails for many teams, judgment.

<!-- more -->

Pick a topic and a level to jump to its questions:

{% include interview-tiles.html %}

Other interview question banks: [DevOps](/posts/devops/interview%20questions/devops-interview-questions/),
[SRE](/posts/devops/sre/sre-interview-questions/), [Kubernetes](/posts/devops/orchestration/kuberentes/kuberentes-interview-questions/),
[Cloud](/posts/cloud/cloud-interview-questions/), [Networking](/posts/networking/networking-interview-questions/),
[AI Infrastructure](/posts/mlops/ai-infrastructure-interview-questions/), [DevSecOps](/posts/devsecops/devsecops-interview-questions/),
[Cloud Security Architect](/posts/architect/cloud%20security/cloud-security-architect-interview-questions/),
[System Design](/posts/architect/system%20design/system-design-interview-questions/), and
[all questions by domain and difficulty](/tags/interview-questions/).

## Cloud Fundamentals

### Cloud Fundamentals: Beginner

1. What are IaaS, PaaS and SaaS? Give an example of each.

    - **IaaS** (infrastructure as a service): you rent virtual machines, networks and disks and manage everything from the OS up (EC2, Azure VMs, Compute Engine)
    - **PaaS** (platform as a service): you deploy code or containers and the provider runs the OS, runtime and scaling (Elastic Beanstalk, Azure App Service, Cloud Run)
    - **SaaS** (software as a service): a finished application you use (Microsoft 365, Salesforce, GitHub)
    - Moving from IaaS to SaaS you manage less and control less; serverless functions (Lambda) and managed databases sit between IaaS and PaaS
    - The trade-off is control and portability versus operational effort

### Cloud Fundamentals: Intermediate

1. Explain the shared responsibility model. Where does the line sit for a VM versus a managed database?

    - The provider secures the cloud itself: data centres, hardware, the hypervisor, the global network
    - The customer secures what they put *in* the cloud: data, identities and access, configuration, and whatever layers they manage
    - On a VM (IaaS) you own the OS, patching, firewall rules on the instance, the runtime and the app
    - On a managed database (RDS, Azure SQL) the provider patches the OS and engine and handles backups; you still own network exposure, authentication, encryption settings, and who can read the data
    - Most cloud breaches sit on the customer side: public buckets, over-privileged identities, leaked keys

### Cloud Fundamentals: Advanced

1. Forty teams share a single AWS account, with frequent permission clashes and no cost visibility. How do you move to a multi-account landing zone?

    - Design the structure: AWS Organizations with OUs by environment and risk (security, infrastructure, workloads-prod, workloads-nonprod, sandbox), one or more accounts per team and environment
    - Baseline every account automatically (Control Tower / Account Factory, or Terraform): centralised CloudTrail and Config, GuardDuty and Security Hub delegated to a security account, default VPC removed, budgets
    - Identity through IAM Identity Center (SSO) with permission sets, no IAM users
    - Networking: a hub (Transit Gateway or Cloud WAN) in a network account, with shared egress and inspection
    - Guardrails with SCPs (deny leaving the org, disabling logging, unapproved regions)
    - Migrate team by team: new workloads land in new accounts first, then move existing ones with a playbook, and finally lock down the old shared account

### Cloud Fundamentals: Expert

1. You're asked to migrate 500 on-prem applications to the cloud in 18 months. How do you plan it?

    - Discover and assess: inventory, dependencies (network flow data), owners, compliance needs, and the business value of each app
    - Pick a strategy per app with the 7 Rs: retire, retain, rehost (lift and shift), relocate, replatform, repurchase (SaaS), refactor; most apps start as rehost or replatform, a few critical ones get refactored
    - Build the landing zone, network connectivity (Direct Connect / ExpressRoute) and security baseline before the first wave
    - Group apps into waves by dependency, starting with low-risk ones to build a repeatable factory with runbooks and automation
    - A Cloud Centre of Excellence sets standards, trains teams and tracks progress; app teams own their migration
    - Plan the money: dual running costs during migration, commitments for stable workloads, and decommissioning data centre contracts on time
    - Track progress by apps migrated *and* by business outcomes (cost, release speed, incidents)

## Compute & Scaling

### Compute & Scaling: Beginner

1. When would you choose a virtual machine, a container or a serverless function?

    - **VM**: full control of the OS, legacy or licensed software, special kernels or drivers, long-running stateful workloads
    - **Container** (ECS, EKS, AKS, Cloud Run): packaged apps that start in seconds, consistent from laptop to production, good density; you (or the service) manage orchestration
    - **Serverless function** (Lambda, Azure Functions): event-driven, short tasks, spiky or low traffic; you pay per request and scale to zero, but have time limits, cold starts and less control
    - Many systems mix them: containers for core services, functions for glue and event handling, VMs for the odd legacy component

### Compute & Scaling: Intermediate

1. How does autoscaling work, and which metric should a service scale on?

    - An Auto Scaling Group (or VM scale set, or Kubernetes HPA) adds or removes instances between a minimum and maximum, based on a policy
    - **Target tracking** keeps a metric near a target (e.g. 50% CPU or 1,000 requests per target); **step scaling** reacts to alarm thresholds; **scheduled scaling** handles known peaks; **predictive scaling** forecasts from history
    - Scale on the metric that reflects load for *that* service: requests per instance for web tiers, queue depth or age for workers, CPU only when CPU really is the bottleneck
    - Mind the delays: instance boot time, health-check grace periods and cooldowns; warm pools or pre-baked images shorten them
    - Scale out fast and in slowly to avoid flapping

### Compute & Scaling: Advanced

1. App teams demand custom AMIs. What's your pre-prod vetting strategy at kernel and runtime level?

    - Golden-image pipeline (Packer / EC2 Image Builder); teams extend the base image rather than building from scratch
    - Kernel: supported by EKS/CNI, eBPF requirements (Cilium), cgroup v2, sysctls, GPU/driver modules
    - Runtime: containerd/kubelet versions, bootstrap script, CIS hardening, CVE scan, SBOM
    - Tests: canary node group, node joins, conformance (sonobuoy), e2e + load tests
    - Signed and versioned AMIs, progressive rollout per node group, rollback path, expiry policy

2. What happens when systemd units fail intermittently on EKS nodes? How do you detect and heal?

    - Detect: node-problem-detector (systemd/journald monitors) → node conditions/events; node_exporter systemd collector; central journald logs
    - Investigate: `systemctl status`, `journalctl -u <unit>`, ordering deps (`After=network-online.target`), OOM, disk
    - Heal: `Restart=on-failure` with backoff; if kubelet/containerd is affected, replace the node (node auto-repair, Karpenter, ASG health checks)
    - Fix the root cause in the AMI or launch template, not by hand on nodes

### Compute & Scaling: Expert

1. How would you design auto-scaling for 50M+ concurrent viewers across multiple Kubernetes clusters without over-provisioning?

    - Most bytes come from the CDN; scale origin and APIs only
    - Scale on leading indicators (concurrent sessions, in-flight requests) via KEDA/custom metrics, not CPU
    - Predictive/scheduled scaling for known events plus a reactive buffer
    - Cell-based architecture with per-cluster capacity limits and global LB
    - Node headroom: low-priority placeholder pods; slow scale-down (stabilisation windows)
    - Know per-pod capacity from load tests; degrade gracefully (lower bitrate) before adding capacity

2. During a big live final, a new region needs to come up "instantly". How do you pre-warm nodes and workloads with zero cold-start impact?

    - It isn't instant: provision ahead based on forecast
    - Region template in IaC; quotas raised; capacity reservations
    - Pre-warm: placeholder pods holding nodes, pre-pulled/baked images, warmed caches, LB pre-warming
    - Scheduled scale-up before the event; shift traffic gradually by weight
    - Load-test the region at target scale beforehand

## Resilience & Multi-Region

### Resilience & Multi-Region: Beginner

1. What are regions and availability zones, and how do you design an application to survive a zone failure?

    - A **region** is a geographic area (e.g. `eu-west-1`); an **availability zone** is one or more isolated data centres in that region, with independent power and networking, connected by low-latency links
    - Zones fail independently, so spread every tier across at least two (better three) zones: instances in an Auto Scaling Group over several zones, a load balancer across zones, a Multi-AZ database
    - Keep instances stateless, and store state in services that replicate across zones (managed databases, S3, EFS)
    - Have enough capacity in the remaining zones to absorb a lost zone's load (N+1)

### Resilience & Multi-Region: Intermediate

1. Compare the disaster recovery strategies: backup and restore, pilot light, warm standby and multi-site active-active.

    - **Backup and restore**: back up to another region and rebuild after a disaster; cheapest; RTO of hours, RPO up to the backup interval
    - **Pilot light**: data replicated continuously, core infrastructure defined but switched off or minimal; RTO tens of minutes
    - **Warm standby**: a scaled-down full copy runs in the second region and scales up on failover; RTO minutes
    - **Multi-site active-active**: both regions serve traffic all the time; RTO near zero, highest cost and complexity (data conflicts, global routing)
    - Choose per application from its RTO/RPO and the business cost of downtime, and test failover regularly; an untested DR plan usually fails

### Resilience & Multi-Region: Advanced

1. You're asked to ship multi-region failover in 2–3 weeks, and DNS-based routing is not allowed. Your plan?

    - Traffic layer without DNS: anycast static IPs (AWS Global Accelerator, GCP global LB, Front Door/Cloudflare), CDN origin failover, client-side endpoint lists, mesh locality failover for internal traffic
    - Week 1: scope critical paths, pick active-passive vs active-active, data replication strategy, agree RPO/RTO, second region via IaC
    - Week 2: traffic layer, health checks, automated failover
    - Week 3: game-day failovers, runbook, measure real RTO
    - Live events: pre-scaled second region, multi-origin CDN
    - AI inference: models preloaded and warm GPUs in both regions
    - State trade-offs explicitly to leadership

### Resilience & Multi-Region: Expert

1. In a multi-cloud setup, describe your approach to cross-cloud routing, IAM, and secret syncing.

    - Routing: global anycast/GSLB with health checks; private interconnect between clouds; mesh with a shared trust domain
    - IAM: one IdP, workload identity federation (OIDC), no long-lived keys; SPIFFE/SPIRE for workload identity
    - Secrets: one source of truth (Vault), synced to cloud stores via External Secrets Operator; dynamic secrets, automated rotation, audit
    - Consistency via IaC modules; watch egress costs

## Cost & FinOps

### Cost & FinOps: Beginner

1. What pricing models do cloud providers offer for compute, and when do you use each?

    - **On-demand**: pay by the second or hour, no commitment; for spiky, short-lived or unknown workloads
    - **Reserved Instances / Savings Plans** (Azure reservations, GCP committed use discounts): commit to 1 or 3 years of usage for up to ~70% off; for the steady baseline
    - **Spot / preemptible**: spare capacity at up to ~90% off that can be reclaimed at short notice; for fault-tolerant work such as batch, CI and stateless workers
    - Typical mix: commitments for the baseline, on-demand for the variable part, spot for interruptible jobs
    - Also: right-size before committing, and turn off non-production resources outside working hours

### Cost & FinOps: Intermediate

1. Your AWS bill spiked 3× overnight and no deployments happened. What's your step-by-step response?

    **Scenario:** yesterday's spend is three times the usual daily run rate, and the release calendar is empty. The interviewer wants to see that you (a) find the cost driver with data instead of guessing, (b) treat a possible credential compromise as a real option, and (c) know that "no deployments" doesn't mean "nothing changed": autoscaling, traffic, scheduled jobs, humans in the console and expiring discounts all change the bill.

    **Step-by-step answer:**

    1. **Confirm and size it.** In Cost Explorer, use daily granularity and group by *Service*, then *Usage type*, *Linked account* and *Region*. Cost Explorer lags by up to a day, so for hourly detail and resource IDs query the Cost and Usage Report (CUR) in Athena. Separate one-off charges (a Savings Plan or RI purchase, a Marketplace subscription, an annual support fee) from a new *run rate*.
    2. **Rule out a compromise early.** Spend in regions you never use, or a burst of large GPU/compute instances, usually means leaked credentials and crypto-mining. Check GuardDuty findings and CloudTrail for `RunInstances`, `CreateUser`, `CreateAccessKey`. If it looks like a compromise: deactivate the keys, deny the affected regions or principals with an SCP, and bring in the security team.
    3. **Find the change that wasn't a deployment.** Common culprits:
       - Autoscaling (ASG, Karpenter, HPA) reacting to a traffic spike, a bot or a retry storm
       - A crash loop or debug log level flooding CloudWatch Logs ingestion
       - NAT Gateway data processing: image pulls or S3 traffic going through NAT instead of a VPC endpoint
       - Cross-AZ or inter-region data transfer from a new replication or chatty service
       - A recursive Lambda trigger (an S3 event that writes back to the same bucket)
       - Batch, backfill or analytics jobs (an Athena or warehouse query scanning terabytes)
       - Manual console changes (CloudTrail by user) or Terraform drift
       - A Savings Plan or Reserved Instance that *expired*, so the same usage is now billed on-demand
    4. **Stop the bleeding without losing evidence.** Cap the ASG or NodePool maximum, disable the runaway trigger or job, block abusive traffic with WAF rules, lower log levels. Snapshot before you terminate anything you may need to investigate.
    5. **Communicate.** Give finance and leadership the cause, the estimated cost and the containment status. Open an AWS Support billing case; AWS sometimes grants credits for compromise or runaway-loop charges.
    6. **Prevent it.** AWS Budgets with alerts on *forecasted* spend; Cost Anomaly Detection monitors per service and per account; mandatory cost-allocation tags; SCPs restricting regions and instance families; VPC endpoints for S3, ECR and DynamoDB; log retention and sampling policies; alarms on NAT Gateway bytes processed.

### Cost & FinOps: Advanced

1. You notice surging NAT gateway costs, with no infra changes this week. What could silently trigger that?

    - NAT bills per GB processed, so traffic patterns changed
    - Image pulls from public registries (CrashLoopBackOff + `imagePullPolicy: Always`)
    - S3/DynamoDB traffic without gateway VPC endpoints
    - New release shipping logs or telemetry to external SaaS; a job re-downloading data; retry storms on an external API
    - Cross-AZ traffic to a NAT in another AZ
    - Compromise: crypto-miner or data exfiltration
    - Find top talkers with VPC Flow Logs and NAT `BytesOutToDestination`; fix with VPC endpoints, a pull-through cache, and NAT-bytes alarms

### Cost & FinOps: Expert

1. How would you build a FinOps practice for a company spending $2M a month on cloud?

    - Visibility first: mandatory cost-allocation tags or account-per-team structure, the Cost and Usage Report in a queryable store, and dashboards per team and product
    - Showback, then chargeback: teams see their own spend and trends, and later own it in their budgets
    - Unit economics: cost per order, per customer or per transaction, so growth and efficiency can be told apart
    - Optimisation loop: right-sizing, idle resource clean-up, storage tiering, spot adoption, architecture changes such as VPC endpoints; tracked as a backlog with owners
    - Commitment management centrally: Savings Plans and reservations sized to the stable baseline, reviewed monthly for coverage and utilisation
    - Guardrails: budgets and anomaly alerts per account, policies that block very expensive instance types without approval
    - FinOps is cross-functional: engineering, finance and product meet regularly; engineers make the cost decisions with data in front of them

## Cloud Identity & Access

### Cloud Identity & Access: Beginner

1. What is the difference between IAM users, groups and roles, and why are roles preferred?

    - An **IAM user** is an identity with long-term credentials (password, access keys)
    - A **group** is a collection of users that share policies
    - A **role** is an identity with permissions but no long-term credentials; it is *assumed* by a user, service or workload and returns short-lived credentials
    - Roles are preferred because temporary credentials expire automatically, can't be leaked as permanent keys, and work across accounts
    - Humans should sign in through SSO (IAM Identity Center, Entra ID) and assume roles; workloads use instance profiles, IRSA / Pod Identity on EKS, or managed identities on Azure

### Cloud Identity & Access: Intermediate

1. How do you apply least privilege in practice in a cloud account?

    - Start from what the workload actually needs: one role per workload, with policies scoped to specific actions and resources (ARNs), not `*`
    - Use conditions: source VPC or VPC endpoint, required tags, MFA for sensitive actions, specific regions
    - Generate and tighten policies from real activity (IAM Access Analyzer policy generation, last-accessed data), and remove unused permissions regularly
    - Permission boundaries let teams create roles without being able to grant more than the boundary allows
    - Separate duties: deployment roles can't read production data; read-only roles by default for humans, with time-bound elevation for changes

### Cloud Identity & Access: Advanced

1. A CI/CD system must deploy into 30 AWS accounts. How do you set up access without storing any long-lived keys?

    - Use OIDC federation: the CI provider (GitHub Actions, GitLab) issues a signed token per job, and each account trusts that identity provider
    - In each account, a deploy role whose trust policy only accepts tokens for the right repository, branch or environment (`sub` claim conditions)
    - Alternatively, one central CI role that assumes per-account deploy roles; either way, credentials last minutes and are scoped per account
    - Deploy roles have only the permissions the pipeline needs, ideally with a permission boundary, and production roles accept only protected branches or environments with approvals
    - Roll the roles out to all accounts with StackSets or Terraform, and alert on any `AssumeRole` from unexpected sources in CloudTrail

### Cloud Identity & Access: Expert

1. How would you design organisation-wide identity guardrails across hundreds of cloud accounts?

    - One identity source: the corporate IdP federated to the cloud (IAM Identity Center, Entra ID), with groups mapped to permission sets; no local IAM users
    - Preventive guardrails at the organisation level: SCPs or Azure Policy that deny disabling logging, creating IAM users or access keys, leaving the organisation, using unapproved regions
    - Resource control policies and data perimeters: only identities from your organisation can access your resources, only through expected networks
    - Privileged access: just-in-time, approved and time-bound elevation; a sealed break-glass account with alarms on any use
    - Detective controls: CloudTrail organisation trail, Access Analyzer for external access, alerts on privilege-escalation patterns (`iam:PassRole`, policy changes)
    - Regular access reviews, automated removal of unused roles and permissions, and policies managed as code with review
