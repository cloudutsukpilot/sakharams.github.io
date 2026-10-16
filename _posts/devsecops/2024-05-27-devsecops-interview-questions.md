---
layout: post
title: DevSecOps Interview Questions
categories: [devsecops]
tags: [DevSecOps, Interview Questions]
description: DevSecOps interview questions by topic and difficulty - fundamentals, pipeline security, secrets management, cloud and IaC security, container and Kubernetes security - with answers
interview_domain: devsecops
interview_topic: DevSecOps Fundamentals
interview_sections:
  DevSecOps Fundamentals: { topic: DevSecOps Fundamentals }
  "DevSecOps Fundamentals: Advanced": { kind: scenario }
  Pipeline Security: { topic: Pipeline Security }
  "Pipeline Security: Advanced": { kind: scenario }
  Secrets Management: { topic: Secrets Management }
  "Secrets Management: Intermediate":
    questions:
      2: { kind: scenario }
  "Secrets Management: Advanced": { kind: scenario }
  "Cloud & IaC Security": { topic: Cloud & IaC Security }
  "Cloud & IaC Security: Advanced": { kind: scenario }
  "Container & Kubernetes Security": { topic: Container & Kubernetes Security }
  "Container & Kubernetes Security: Advanced": { kind: scenario }
---

## DevSecOps Interview Questions

Questions for DevSecOps and security-minded DevOps interviews, grouped by topic and graded by difficulty:
the fundamentals, security checks in the pipeline, handling secrets, securing cloud and infrastructure as
code, and securing containers and Kubernetes.

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

## DevSecOps Fundamentals

### DevSecOps Fundamentals: Beginner

1. **What is DevSecOps, and why is it important**?
- DevSecOps is a cultural and technical approach that integrates security practices into the DevOps process. 
- It emphasizes collaboration between development, security, and operations teams to automate security integration at every phase of the software development lifecycle. 
- This approach ensures that security is not an afterthought but a continuous and shared responsibility, leading to more secure and resilient applications.

2. **What tools and technologies are commonly used in DevSecOps**?
- Common DevSecOps tools include:
    + `CI/CD Tools`: Jenkins, GitLab CI, Azure DevOps, CircleCI
    + `Security Tools`: SonarQube (SAST), OWASP ZAP (DAST), Snyk (SCA), Aqua Security (container security), HashiCorp Vault (secrets management)
    + `Monitoring and Logging`: Prometheus, Grafana, ELK Stack (Elasticsearch, Logstash, Kibana)
    + `Infrastructure as Code`: Terraform, Ansible, AWS CloudFormation
    + `Configuration Management`: Puppet, Chef, Ansible

### DevSecOps Fundamentals: Intermediate

1. **Can you describe a secure coding practice you follow**?
- One secure coding practice is input validation. Ensuring that all inputs are validated and sanitized helps prevent common vulnerabilities like SQL injection, cross-site scripting (XSS), and buffer overflows. This involves checking for expected data types, lengths, formats, and ranges before processing the input.

2. **How do you ensure continuous security improvement in a DevSecOps process**?
- Continuous security improvement can be ensured by:
    + `Feedback Loop`s: Implementing feedback loops from security incidents and regular assessments to continuously refine security practices.
    + `Automated Testing`: Integrating automated security testing tools in the CI/CD pipeline to identify and fix vulnerabilities early.
    + `Security Metrics`: Defining and tracking security metrics to measure the effectiveness of security practices and identify areas for improvement.
    + `Training`: Conducting regular security training and awareness programs for development and operations teams.
    + `Collaboration`: Fostering a culture of collaboration between development, security, and operations teams to ensure security is integrated at every stage of the development lifecycle.

### DevSecOps Fundamentals: Advanced

1. **Describe a security incident you handled and what you learned from it**.
- A security incident where our application was targeted by a SQL injection attack. We quickly identified the attack vector through our monitoring system, which alerted us to unusual database activity. We patched the vulnerability by implementing parameterized queries and conducted a thorough review of our codebase for similar issues. From this incident, we learned the importance of continuous security training for developers and the need for regular security code reviews and automated scanning tools to catch such vulnerabilities early."

### DevSecOps Fundamentals: Expert

1. How would you roll out DevSecOps across 40 product teams that see security as a blocker?

    - Start with the biggest real risks (incident history, threat models, audit findings), not a tool list
    - Make the secure way the easy way: paved-road pipelines and templates with scanning built in, sensible defaults and fast feedback in pull requests
    - A security champions programme: one trained engineer per team as the first point of contact, with time allocated and a community of practice
    - Introduce checks in stages: report-only first, tune out false positives, then block only high-confidence, high-severity findings
    - Measure outcomes the teams care about too: time to fix critical vulnerabilities, false-positive rate, pipeline time added
    - Security engineers as enablers: office hours, threat-modelling sessions, quick reviews; and a clear, time-bound exception process

## Pipeline Security

### Pipeline Security: Beginner

1. What is the difference between SAST, DAST, SCA and IaC scanning?

    - **SAST** (static application security testing): analyses source code for insecure patterns (injection, unsafe deserialisation) without running it; e.g. Semgrep, SonarQube, CodeQL, Checkmarx
    - **DAST** (dynamic testing): attacks the running application from outside like an attacker (OWASP ZAP, Burp Suite); finds runtime and configuration issues
    - **SCA** (software composition analysis): finds known vulnerabilities and licence issues in open-source dependencies (Dependabot, Snyk, Trivy, OWASP Dependency-Check)
    - **IaC scanning**: checks Terraform, Kubernetes manifests and Dockerfiles for misconfigurations (Checkov, tfsec / Trivy, KICS)
    - Plus **secret scanning** (gitleaks, GitHub secret scanning); each catches different issues, so pipelines combine them

### Pipeline Security: Intermediate

1. **How do you integrate security into a CI/CD pipeline**?
- Integrating security into a CI/CD pipeline involves:
    + `Static Application Security Testing (SAST)`: Scanning source code for vulnerabilities during the build process.
    + `Dynamic Application Security Testing (DAST)`: Testing running applications for security issues during the deployment phase.
    + `Software Composition Analysis (SCA)`: Checking for vulnerabilities in third-party libraries and dependencies.
    + `Container Security`: Scanning container images for vulnerabilities before deployment.
    + `Infrastructure as Code (IaC) Security`: Analyzing IaC scripts for security issues.
    + `Automated Security Tests`: Including security test cases in unit and integration tests.
    + `Compliance Checks`: Ensuring that deployments comply with organizational and regulatory standards.

### Pipeline Security: Advanced

1. The new scanner reports 400 critical vulnerabilities in a service that must release tomorrow. What do you do?

    - Don't block blindly and don't ignore it: triage fast
    - Deduplicate: many findings are the same CVE in one base image or library, so 400 findings may be 10 root causes
    - Check exploitability: is the vulnerable code reachable, is the package used at runtime, is the service exposed? Use EPSS and the CISA KEV list to spot what is actively exploited
    - Fix the cheap, high-impact ones now: a base-image bump or one dependency upgrade often clears most findings
    - For the rest, a documented risk acceptance with an owner and a deadline, plus mitigations (WAF rule, disabling a feature)
    - Afterwards: rebuild images regularly, enable automated dependency updates, and gate only on new, fixable criticals so the backlog can't block every release

### Pipeline Security: Expert

1. How do you enforce security gates across 200 repositories without slowing every team down?

    - Central, reusable pipeline components (GitHub reusable workflows, GitLab CI templates) maintained by the platform team, so every repo gets the same scans by default
    - Policy as code for gate decisions: block on new critical or high findings with a fix available, secrets, and critical IaC misconfigurations; report everything else
    - Risk-based tiers: stricter gates for internet-facing and regulated services, lighter ones for internal tools
    - Fast feedback: incremental scans on changed code in pull requests, full scans on a schedule
    - Exceptions as code: a suppression file with reason, owner and expiry date, reviewed by security
    - Central dashboards for findings per team and time to fix, so leadership sees trends without gates being the only lever

## Secrets Management

### Secrets Management: Beginner

1. Why shouldn't secrets be stored in code or plain configuration files, and where should they live?

    - Code is copied everywhere: every clone, fork, CI cache, backup and log of it now holds the secret, and Git history keeps it forever
    - Plain config files and baked container images leak the same way, and nobody knows who has seen them
    - Store secrets in a secrets manager (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, GCP Secret Manager): encrypted, access-controlled, audited and rotatable
    - Applications fetch them at runtime with their own identity, or receive them through a platform integration (External Secrets Operator, CSI secrets driver)
    - Even environment variables can leak (crash dumps, debug pages, `ps`), so prefer mounted files or direct API retrieval for sensitive values

### Secrets Management: Intermediate

1. **How do you handle secrets management in a DevSecOps pipeline**?
- Secrets management involves securely storing and accessing sensitive information like API keys, passwords, and tokens. Best practices include:
    + `Using a Secrets Management Tool`: Tools like HashiCorp Vault, AWS Secrets Manager, Azure Key Vault to securely store and access secrets.
    + `Environment Variables`: Injecting secrets into applications using environment variables, which are managed by the secrets management tool.
    + `Avoid Hardcoding`: Never hardcoding secrets in source code or configuration files.
    + `Access Control`: Implementing strict access controls and auditing to ensure that only authorized entities can access secrets.

2. A secret was accidentally committed to GitHub, and the repository has already been cloned. What are your exact next steps?

    **Scenario:** an AWS access key, database password or API token was pushed to GitHub. Teammates, CI runners, forks or, for a public repo, automated scrapers have already pulled it. The interviewer is checking one thing above all: do you know that deleting the commit doesn't help? Once a secret has left your machine it is compromised, so the fix is **revoke and rotate first, clean history second**.

    **Step-by-step answer:**

    1. **Assess for a minute, no longer.** What is the secret, what can it access (read-only key or admin?), where is it used, when was it pushed, and is the repository public or private? A public repo means assume it has already been harvested: bots scan GitHub within minutes.
    2. **Revoke or rotate immediately.** Issue a new credential, update every consumer through the secrets manager, then disable the old one. For a public leak, or a powerful credential, revoke *first* and accept a short outage; a few minutes of downtime is cheaper than a breach. Examples: deactivate and then delete the IAM access key, change the DB user's password, revoke the GitHub or SaaS token.
    3. **Investigate whether it was used.** Search the audit logs for the leaked credential between the push time and the revocation: CloudTrail filtered by the access key ID, database connection logs, the provider's audit log. Look for persistence: new IAM users, access keys, roles, Lambda functions, instances in unused regions. Any sign of misuse turns this into a security incident: hand over to the security team and follow the incident-response plan.
    4. **Remove it from the code and the history.** Move the value into a secrets manager or environment variable and add the file pattern to `.gitignore`. Rewrite history with `git filter-repo` (or BFG), force-push, and ask everyone with a clone to re-clone rather than pull. Ask GitHub Support to purge cached views and pull-request refs. Remember forks and existing clones keep the old commits, which is why rotation in step 2 is the real fix; this step is hygiene.
    5. **Close the gaps that let it happen.** Turn on GitHub secret scanning with push protection; add a pre-commit hook (`gitleaks`, `detect-secrets`) and the same scan in CI; replace long-lived CI keys with short-lived credentials via OIDC federation; keep `.env` files out of the repo with an `.env.example` template.
    6. **Write it up, blamelessly.** Timeline, exposure window, what the logs showed, what was rotated, which controls were added. The goal is a system where the mistake can't reach the remote again, not blaming the person who made it.

    ```sh
    # 2. Revoke (AWS example)
    aws iam update-access-key --user-name ci-deployer --access-key-id AKIA... --status Inactive
    aws iam delete-access-key --user-name ci-deployer --access-key-id AKIA...

    # 3. Was it used? (CloudTrail, last 90 days of management events)
    aws cloudtrail lookup-events --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIA... \
      --start-time 2026-10-01T00:00:00Z

    # 4. Purge from history (after rotation), then force-push
    git filter-repo --replace-text <(echo 'AKIA...==>REMOVED')
    git push --force --all && git push --force --tags
    ```

### Secrets Management: Advanced

1. A database password is shared by 30 services and must be rotated without downtime. How?

    - Use two credentials so there is never a moment when the only valid password is changing: create a second database user (or a second password where the database supports dual passwords)
    - Store the new credential in the secrets manager and roll services over to it gradually; services must reload secrets without a redeploy, or you restart them in a rolling fashion
    - Watch database logs for logins with the old credential; when none remain, disable and then delete it
    - Better long term: give each service its own database user (smaller blast radius, clearer audit), and use dynamic secrets (Vault database secrets engine) or IAM database authentication, so credentials are short-lived and rotate automatically
    - Automate the rotation (Secrets Manager rotation functions) and test it in staging regularly

### Secrets Management: Expert

1. How would you move an organisation towards "secretless" workloads?

    - Replace long-lived secrets with identity: workloads prove who they are with platform identity (IRSA / EKS Pod Identity, Azure workload identity, GCP workload identity, SPIFFE/SPIRE) and receive short-lived credentials
    - CI/CD uses OIDC federation to clouds and registries instead of stored keys
    - Databases and internal services accept identity-based auth (IAM database auth, mTLS with workload certificates)
    - Where a secret is unavoidable (third-party API keys), keep it in a secrets manager, scope it tightly and rotate it automatically
    - Inventory existing secrets (secret scanning, vault audit logs), migrate by risk, and set a policy that new services may not use static credentials
    - Monitor: alert on any use of long-lived keys and track their number down to zero

## Cloud & IaC Security

### Cloud & IaC Security: Beginner

1. What is Cloud Security Posture Management (CSPM), and what are typical misconfigurations it finds?

    - CSPM tools continuously scan cloud accounts against security best practices and compliance frameworks (CIS, PCI DSS, ISO 27001); e.g. AWS Security Hub, Microsoft Defender for Cloud, Prisma Cloud, Wiz
    - Typical findings: public storage buckets, security groups open to `0.0.0.0/0` on SSH or databases, unencrypted volumes and databases, logging disabled, IAM users without MFA, overly broad roles, unused access keys
    - They prioritise by exposure and sensitivity, and can auto-remediate simple issues
    - CSPM catches drift in running infrastructure; IaC scanning catches the same issues earlier, in pull requests

### Cloud & IaC Security: Intermediate

1. **What is Infrastructure as Code (IaC) and how does it contribute to security**?
- Infrastructure as Code (IaC) is the practice of managing and provisioning computing infrastructure using machine-readable configuration files. IaC contributes to security by:
    + `Consistency`: Ensuring that infrastructure is provisioned in a consistent manner, reducing the likelihood of configuration drift and human error.
    + `Version Control`: Storing IaC scripts in version control systems, allowing for tracking changes and rollback if necessary.
    + `Automated Testing`: Applying security checks and automated testing to IaC scripts before deployment.
    + `Compliance`: Facilitating compliance with security standards by codifying security policies and configurations.

2. **How do you ensure compliance with security standards and regulations in a DevSecOps environment**?
- Ensuring compliance involves:
    + `Automated Compliance Checks`: Integrating automated compliance tools into the CI/CD pipeline to enforce security policies and standards.
    + `Auditing and Logging`: Maintaining detailed logs and audit trails of all actions and changes to ensure accountability and traceability.
    + `Regular Assessments`: Conducting regular security assessments, audits, and penetration testing to identify and mitigate potential compliance issues.
    + `Training and Awareness`: Ensuring that all team members are trained on relevant security standards and regulations.
    + `Policy Enforcement`: Implementing and enforcing security policies and procedures through automated workflows and manual reviews.

3. **What are the common security challenges in cloud environments, and how do you address them**?
- Common security challenges in cloud environments include:
    + `Misconfigurations`: Addressed by using IaC to enforce consistent and secure configurations, and conducting regular audits.
    + `Data Breaches`: Mitigated by encrypting data at rest and in transit, implementing strong access controls, and monitoring for unauthorized access.
    + `Identity and Access Management (IAM)`: Ensuring robust IAM practices, including multi-factor authentication (MFA), least privilege access, and regular review of permissions.
    + `Compliance`: Using automated tools to enforce compliance with industry standards and regulations.
    + `Visibility`: Employing centralized logging and monitoring solutions to gain visibility into cloud activities and detect anomalies.

### Cloud & IaC Security: Advanced

1. You discover a public S3 bucket containing customer data. What are your next steps?

    - Contain immediately: block public access on the bucket (and turn on account-level Block Public Access), keeping a record of the original settings
    - Preserve evidence: bucket policy, ACLs, object list, and CloudTrail / S3 server access logs
    - Determine exposure: since when was it public, which objects, was anything downloaded (S3 access logs or CloudTrail data events, if enabled)?
    - Involve security, legal and privacy early: customer data exposure may trigger breach-notification duties (GDPR's 72 hours, state laws)
    - Find the root cause: who made it public and why (a CDN or partner integration?), then provide a safe alternative (CloudFront with origin access control, pre-signed URLs)
    - Prevent: Block Public Access enforced by SCP, IaC scanning, CSPM alerts, and data classification so sensitive buckets get extra controls

### Cloud & IaC Security: Expert

1. How would you make compliance (SOC 2, PCI DSS) continuous instead of a yearly audit scramble?

    - Map each control to technical checks: encryption, logging, access reviews, change management, vulnerability management
    - Prevent with policy as code in the pipelines (IaC checks) and at the cloud layer (SCPs, Azure Policy, admission control in Kubernetes)
    - Detect continuously with CSPM and config rules, with alerts and owners for drift
    - Collect evidence automatically: pipeline logs, approval records in pull requests, scan results and access reviews stored centrally (compliance automation tools such as Vanta, Drata, or in-house)
    - Scope reduction: keep regulated data in as few systems and accounts as possible (tokenisation for card data)
    - Treat audit findings like bugs: tracked, owned and fixed, with the controls tested between audits

## Container & Kubernetes Security

### Container & Kubernetes Security: Beginner

1. Why scan container images, and what do the scanners look for?

    - Images bundle an OS layer and application dependencies, so they inherit their vulnerabilities, often hundreds from an old base image
    - Scanners (Trivy, Grype, Snyk, cloud registry scanning) list packages and match them to CVE databases, and also flag secrets, misconfigurations (running as root) and licence issues
    - Scan in CI before pushing, in the registry continuously (new CVEs appear for old images), and at admission
    - The best fix is fewer packages: minimal or distroless base images and regular rebuilds

### Container & Kubernetes Security: Intermediate

1. What are Pod Security Standards, and which `securityContext` settings matter most?

    - Pod Security Standards define three levels: **privileged** (no restrictions), **baseline** (blocks known privilege escalations) and **restricted** (hardened best practice)
    - Pod Security Admission enforces them per namespace with labels (`pod-security.kubernetes.io/enforce: restricted`), in enforce, audit or warn mode
    - Key settings: `runAsNonRoot: true`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, drop all capabilities, `seccompProfile: RuntimeDefault`, no `privileged`, no host namespaces or `hostPath` mounts
    - Policy engines (Kyverno, Gatekeeper) add rules PSS doesn't cover: allowed registries, required labels, image signatures

### Container & Kubernetes Security: Advanced

1. You find a crypto-mining pod running in a production namespace. How do you respond?

    - Contain without destroying evidence: isolate the pod with a deny-all NetworkPolicy, cordon the node, and capture the pod spec, logs, image digest and, if possible, a memory or filesystem snapshot
    - Work out how it got there: who created it (Kubernetes audit logs), with which service account or user; common entries are an exposed dashboard, leaked kubeconfig, over-privileged service account, or a vulnerable app with a pod-create permission
    - Assess the blast radius: what the identity could access (secrets, cloud credentials through the node or IRSA), other compromised workloads, lateral movement
    - Eradicate: revoke and rotate credentials, remove the workload and any persistence (CronJobs, DaemonSets, webhooks), rebuild the affected nodes
    - Prevent: least-privilege RBAC, admission policies (allowed registries, signed images), runtime detection (Falco), egress network policies, and alerts on unusual CPU usage

### Container & Kubernetes Security: Expert

1. Design a zero-trust security model for a multi-tenant Kubernetes platform.

    - Identity everywhere: workload identity per service account, mTLS between services (service mesh or Cilium), and short-lived cloud credentials per workload
    - Default deny: NetworkPolicies denying all ingress and egress per namespace, with explicit allows; egress through controlled gateways
    - Admission control: Pod Security "restricted", only signed images from approved registries, required resource limits and labels
    - Least-privilege RBAC: no cluster-admin for tenants, namespace-scoped roles, short-lived access for humans via SSO
    - Runtime: detection (Falco, Tetragon), sandboxed runtimes for untrusted code, and node isolation for sensitive tenants
    - Secure the control plane: private API endpoint, audit logging to a SIEM, encrypted secrets (KMS), and a regular upgrade cadence
