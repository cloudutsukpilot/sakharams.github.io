---
layout: post
title: DevOps Engineer - Interview Questions
categories: [devops, interview questions]
tags: [DevOps, Interview Questions]
image: /assets/img/devops/devops-posts.webp
description: DevOps engineer interview questions by topic and difficulty - general DevOps, Git, CI/CD and release, containers, Kubernetes and infrastructure as code - with answers
interview_domain: devops
interview_topic: General DevOps
interview_sections:
  General DevOps: { topic: General DevOps }
  "General DevOps: Advanced":
    questions:
      2: { kind: scenario }
  Git & Version Control: { topic: Git & Version Control }
  "Git & Version Control: Advanced": { kind: scenario }
  "Git & Version Control: Expert": { kind: scenario }
  CI/CD & Release: { topic: CI/CD & Release }
  "CI/CD & Release: Intermediate":
    questions:
      2: { kind: scenario }
  "CI/CD & Release: Advanced":
    questions:
      2: { kind: scenario }
  Containers & Docker: { topic: Docker }
  "Containers & Docker: Advanced": { kind: scenario }
  Kubernetes: { topic: Kubernetes }
  "Kubernetes: Advanced": { kind: scenario }
  Infrastructure as Code: { topic: Infrastructure as Code }
  "Infrastructure as Code: Advanced": { kind: scenario }
---
## Interview Questions on DevOps Role

Questions for DevOps engineer interviews, grouped by topic and graded by difficulty. The answers are
pointers: what a strong candidate should bring up, not a script.

- **Beginner**: definitions and the "why"; expected of anyone starting in DevOps.
- **Intermediate**: how things work and the trade-offs; expected of an engineer who runs them day to day.
- **Advanced**: senior level; production scenarios across several layers.
- **Expert**: staff / lead level; design at scale, guardrails for many teams, judgment.

<!-- more -->

Pick a topic and a level to jump to its questions:

{% include interview-tiles.html %}

Deeper question banks for each area live in their own posts:

- [Kubernetes Interview Questions](/posts/devops/orchestration/kuberentes/kuberentes-interview-questions/), [Docker](/posts/devops/orchestration/docker/docker-interview-questions/), [Terraform](/posts/devops/orchestration/terraform/terraform-interview-questions/), [Jenkins](/posts/devops/cicd/jenkins/interviewquestions/jenkins-interview-questions/), [GitLab](/posts/devops/cicd/gitlab/gitlab-interview-questions/)
- [SRE](/posts/devops/sre/sre-interview-questions/), [Cloud](/posts/cloud/cloud-interview-questions/), [Networking](/posts/networking/networking-interview-questions/), [AI Infrastructure](/posts/mlops/ai-infrastructure-interview-questions/), [DevSecOps](/posts/devsecops/devsecops-interview-questions/), [Cloud Security Architect](/posts/architect/cloud%20security/cloud-security-architect-interview-questions/), [System Design](/posts/architect/system%20design/system-design-interview-questions/)
- [All interview questions by domain and difficulty](/tags/interview-questions/)

## General DevOps

### General DevOps: Beginner

1. What are the day-to-day activities of an DevOps engineer?

    - `CI/CD Pipeline Management`: Automating builds, tests, and deployments.
    - `Infrastructure Automation`: Using tools like Terraform, AWS CloudFormation, or Ansible for provisioning resources.
    - `Monitoring and Alerting`: Setting up tools like Prometheus, Grafana, and CloudWatch to monitor system health.
    - `Container Management`: Using Docker and Kubernetes to run, manage, and scale containerized applications.
    - `Incident Management`: Troubleshooting issues and performing root cause analysis.
    - `Collaboration`: Coordinating with teams to optimize processes for development and deployment.

2. How can a DevOps engineer use Docker and Kubernetes in their daily activities?

    - `Docker`: Used to package applications into containers, ensuring consistent environments across different stages (dev, test, prod).
    - `Kubernetes`: Managed container orchestration, providing features like auto-scaling, self-healing, and deployment management, ensuring high availability and reliability.

### General DevOps: Intermediate

1. What are the DORA metrics, and how would you use them to measure a team's delivery performance?

    - Four metrics from the DORA research: **deployment frequency**, **lead time for changes** (commit to production), **change failure rate** (share of deployments causing a failure) and **time to restore service**
    - The first two measure speed (throughput), the last two measure stability; elite teams are good at both, which shows speed and stability aren't a trade-off
    - Collect them automatically from the systems of record: VCS and CI/CD for frequency and lead time, the incident tool for failures and restore time
    - Use them for a team to improve against its own baseline, never to rank teams or individuals (Goodhart's law: a target stops being a good measure)
    - Read them together: high frequency with a rising failure rate means quality gates are missing; long lead time usually means waiting (reviews, manual approvals, release trains), not slow builds

### General DevOps: Advanced

1. Tell me when you would deliberately choose NOT to automate something.

    - Rare tasks where building and maintaining the automation costs more than doing it by hand
    - Processes not yet understood: write the runbook and do it manually first
    - Irreversible, high-blast-radius actions that need judgment: automate execution, keep a human decision
    - When automation would hide a problem (auto-restarting a leaking service)
    - Systems about to be retired
    - Automation repeats mistakes at scale, so weigh that risk

2. A team deploys once a month using a two-day manual release checklist. Leadership wants daily deployments. How do you get them there?

    - Baseline first: map the release value stream, time each step, record the DORA metrics, and find where changes wait
    - Automate the checklist step by step, starting with the most error-prone: build once, versioned artifacts, scripted deploys, automated smoke tests
    - Shrink batch size: trunk-based development, short-lived branches, feature flags so deploy ≠ release
    - Build test confidence: a fast unit and contract test suite in CI; move manual regression to automated checks over a few sprints
    - Make deploys safe and boring: blue/green or canary, automated rollback, database migrations with expand/contract
    - Step the cadence up (monthly → weekly → daily) and replace the change board with automated evidence (tests, approvals in pull requests, audit trail)
    - The hard part is cultural: involve the people who own the checklist, keep them as reviewers of the automation, and celebrate the first boring deploy

### General DevOps: Expert

1. How would you design an internal developer platform so 50 product teams can ship without a central DevOps team becoming the bottleneck?

    - Treat the platform as a product: product manager, roadmap, user research with the teams, adoption and satisfaction metrics
    - Paved paths (golden paths): templates that create a repo, pipeline, infrastructure, observability and on-call setup for a new service in minutes (e.g. Backstage software templates)
    - Self-service through APIs, not tickets: infrastructure via vetted Terraform modules or Crossplane claims, environments on demand, secrets and DNS through the same interface
    - Guardrails instead of gates: policy-as-code, security scanning and cost limits built into the paved path, so the easy way is the compliant way
    - Thin, opinionated defaults with escape hatches for teams with special needs, and a clear support model for each
    - A team-topologies split: a platform team owns the platform, enabling teams coach, product teams own their services end to end ("you build it, you run it")
    - Measure success by lead time, onboarding time for a new service and engineer satisfaction, not by the number of tools the platform offers

## Git & Version Control

### Git & Version Control: Beginner

1. What is the difference between `git merge` and `git rebase`, and when would you use each?

    - `merge` joins two histories with a merge commit; history is preserved exactly as it happened, including the branch's existence
    - `rebase` replays your commits on top of another branch, giving a linear history; it rewrites commit hashes
    - Use rebase to update a *local* feature branch with the latest `main` and to clean up commits before review (`git rebase -i`)
    - Use merge (or squash-merge) to integrate a reviewed branch into `main`
    - Golden rule: never rebase commits that others have already pulled; it rewrites shared history and forces everyone to recover

### Git & Version Control: Intermediate

1. Compare trunk-based development with GitFlow. Which would you choose for a team doing continuous delivery, and why?

    - **GitFlow**: long-lived `develop` and `main`, plus feature, release and hotfix branches; suits versioned products with scheduled releases and several supported versions
    - **Trunk-based**: everyone integrates small changes into `main` at least daily, with short-lived branches (hours to a day or two); unfinished work hides behind feature flags
    - For continuous delivery, choose trunk-based: small batches merge with fewer conflicts, CI tests the real integrated code continuously, and `main` is always releasable
    - GitFlow's long-lived branches delay integration ("merge hell") and slow lead time, one of the DORA metrics
    - Prerequisites for trunk-based: fast reliable CI, good test coverage, feature flags, and branch protection with required reviews

### Git & Version Control: Advanced

1. Someone force-pushed to `main` and overwrote a day of commits from three engineers. How do you recover, and how do you stop it happening again?

    - Don't panic-push anything else; tell people not to pull, so their local clones keep the old commits
    - The lost commits still exist in any clone that fetched them: run `git reflog` or check `origin/main` on an engineer's machine or a CI runner's workspace from before the force-push
    - On GitHub, the push event in the repository activity log (or the Events API) shows the previous head SHA; open pull requests also keep `refs/pull/<n>/head`
    - Restore: `git push origin <old-sha>:main --force-with-lease`, then re-apply any legitimate new commits from the force-push on top
    - Prevent: branch protection on `main` (no force-push, no deletion, required pull requests and status checks), and teach `--force-with-lease` instead of `--force` for personal branches

### Git & Version Control: Expert

1. A monorepo has 3,000 engineers; clones take 20 minutes and checkouts dominate CI time. What do you do?

    - Measure first: repository size, number of refs, largest blobs and history depth (`git count-objects -vH`, `git-sizer`)
    - CI: shallow (`--depth 1`) and partial clones (`--filter=blob:none`), sparse checkout of only the paths a job needs, and a pre-warmed reference repo or cache on runners
    - Developers: partial clone plus sparse checkout (cone mode), `git maintenance start` for background prefetch and commit-graph, or Scalar, which bundles these settings
    - Move large binaries out of Git history (Git LFS or an artifact store), and rewrite history if a few huge blobs dominate the size
    - Build tooling that understands the monorepo (Bazel, Nx, Turborepo) so CI builds and tests only what changed
    - Server side: keep the number of refs under control, run regular repacks, and consider Git mirrors close to CI runners

## CI/CD & Release

### CI/CD & Release: Beginner

1. What is the difference between continuous integration, continuous delivery and continuous deployment?

    - **Continuous integration (CI)**: developers merge small changes into the main branch frequently, and every change is built and tested automatically, so integration problems surface within minutes
    - **Continuous delivery**: every change that passes the pipeline is *releasable*; deploying to production is a business decision, often a single button press
    - **Continuous deployment**: every change that passes the pipeline goes to production automatically, with no human approval
    - Each step builds on the previous one, and continuous deployment needs strong automated tests, monitoring and automatic rollback

### CI/CD & Release: Intermediate

1. Compare rolling, blue/green and canary deployments. When would you pick each?

    - **Rolling**: replace instances a few at a time (the Kubernetes Deployment default); no extra capacity, but old and new versions serve traffic together and rollback is another rollout
    - **Blue/green**: run the new version (green) next to the old (blue) and switch all traffic at once; instant rollback by switching back, but double capacity during the release, and database changes must work for both
    - **Canary**: send a small share of traffic (1%, 5%, 25%…) to the new version, compare its error rate and latency with the old one, then continue or roll back automatically (Argo Rollouts, Flagger)
    - Pick rolling for low-risk internal services, blue/green when you need instant cut-over and rollback, and canary for high-traffic user-facing services where you want real-traffic evidence before full release
    - All three need backward-compatible changes: the database and APIs must work with both versions during the transition

2. The CI/CD pipeline takes 40+ minutes. Your CTO wants it under 10 minutes without adding hardware. What will you optimise?

    **Scenario:** same runners, same budget. The interviewer wants a measure-first approach and concrete techniques (critical path, parallelism, caching, doing less work) rather than "buy bigger runners".

    **Step-by-step answer:**

    1. **Measure before changing anything.** Break the pipeline into stages and jobs and take the p50/p95 duration of each over the last few dozen runs. Find the critical path, separate *queue time* from *run time*, and count retries caused by flaky tests. Attack the biggest bars first.
    2. **Turn the sequence into a graph.** Most pipelines run stages one after another for no reason. Run lint, unit tests, SAST and the image build in parallel; use job-level dependencies (`needs:` in GitLab and GitHub Actions) instead of stage barriers. Shard the test suite by recorded timing (`parallel:` in GitLab, matrix jobs, `pytest-xdist`, Jest `--shard`).
    3. **Cache aggressively.** Dependency caches keyed on the lock file (npm, Maven `~/.m2`, NuGet, pip); Docker layer caching with BuildKit (`--cache-from`/`--cache-to` against the registry); a Dockerfile ordered so dependencies install before the source is copied; a tight `.dockerignore`; remote build caches (Gradle, Bazel, Nx, Turborepo).
    4. **Do less work per run.** Path filters and affected-project detection in monorepos; test-impact analysis; move the full end-to-end, performance and long regression suites to post-merge or nightly and keep a smoke e2e on pull requests; build once and promote the same artifact through environments instead of rebuilding per environment.
    5. **Remove waiting.** Shallow clones (`fetch-depth: 1`), no unnecessary LFS fetches, no `sleep`-based waits in deploy scripts (poll for readiness instead), no manual approvals in the middle of the CI path, environments deployed in parallel where it's safe.
    6. **Fix the slow tests themselves.** Quarantine and fix flaky tests (each retry doubles that job), reuse test containers and database snapshots instead of building fixtures each run, stub slow external services.
    7. **Keep it fast.** Track pipeline duration as a metric, set a per-stage time budget, and fail or alert when a change blows it.

    A typical outcome looks like this: caching −10 min, parallel jobs and test sharding −15 min, skipping unaffected services −8 min, removing waits −3 min. That takes 40 min down to under 10 with the same hardware, because most of the 40 minutes was idle runners and repeated work, not compute.

### CI/CD & Release: Advanced

1. Walk me through how you'd design a secure CI/CD pipeline that pushes code to both cloud and on-prem edge environments.

    - Source: branch protection, required reviews, CODEOWNERS, signed commits
    - Build: ephemeral isolated runners, pinned deps, SAST/SCA/secret scanning
    - Supply chain: SBOM, artifact signing (cosign), SLSA provenance, private registry
    - Identity: OIDC federation to cloud, no static keys, least privilege per environment
    - Edge: pull-based GitOps (Argo CD/Flux agent on site), outbound-only, tolerates flaky links
    - Verify signatures at admission (Kyverno / policy-controller)
    - Progressive rings of sites, auto-rollback, audit trail

2. A firmware build pipeline starts failing during artifact uploads. S3 shows no error, Jenkins logs are incomplete. Where do you start?

    - "No S3 error" means the request may never have reached S3, or data events aren't logged (CloudTrail data events are off by default)
    - Incomplete logs suggest the agent died mid-step: OOM, disk full, pod eviction, agent disconnect, step timeout
    - Check agent `dmesg`, `df`, controller logs, agent connectivity
    - Upload path: artifact size growth → multipart, proxy/NAT idle timeouts, MTU, STS token expiry during a long upload, VPC endpoint policy, KMS
    - Reproduce from the agent with `aws s3 cp --debug`
    - What changed: plugin update, agent image, artifact size

3. When engineers ship daily, how do you enforce release confidence without slowing innovation?

    - Small changes, trunk-based development, feature flags (deploy ≠ release)
    - Fast automated tests in the pipeline
    - Canaries with automated analysis on SLIs (Argo Rollouts/Flagger) and auto-rollback
    - Error-budget policy: when the budget is burned, reliability work comes first
    - Guardrails, not gates: paved paths and policy-as-code instead of manual CAB
    - Track DORA metrics (change failure rate, MTTR)

### CI/CD & Release: Expert

1. How would you secure the software supply chain so that a compromised dependency, plugin or CI runner can't ship malicious code to production?

    - Threat-model the pipeline: source, dependencies, build system, artifact store and deploy path are all targets (SolarWinds, Codecov and the `tj-actions` compromise are the reference cases)
    - Source: branch protection, required reviews by code owners, signed commits, and no direct pushes to release branches
    - Dependencies: lock files, an internal proxy registry, pinned versions, SCA scanning, and third-party CI actions pinned by commit SHA rather than tag
    - Build: ephemeral, isolated runners per job; no long-lived secrets on runners; short-lived cloud credentials via OIDC; separate build and deploy permissions
    - Artifacts: an SBOM and SLSA provenance attestation for every build, images signed with cosign (keyless via Sigstore), and promotion of the same digest through environments
    - Deploy: admission control verifies signatures and provenance before anything runs (Kyverno, Sigstore policy-controller)
    - Detect and respond: alert on unusual pipeline changes, audit logs for the CI system, and a rehearsed plan to revoke credentials and rebuild from a clean state

## Containers & Docker

### Containers & Docker: Beginner

1. What is the difference between `CMD` and `ENTRYPOINT` in a Dockerfile?

    - `ENTRYPOINT` defines the executable the container always runs; `CMD` provides default arguments (or a default command if there is no `ENTRYPOINT`)
    - Arguments to `docker run image <args>` replace `CMD`, but not `ENTRYPOINT` (that needs `--entrypoint`)
    - A common pattern: `ENTRYPOINT ["myapp"]` and `CMD ["--help"]`, so `docker run myapp --port 8080` passes flags to the app
    - Use the *exec form* (JSON array) so the process runs as PID 1 and receives signals such as SIGTERM; the shell form wraps it in `/bin/sh -c`, which doesn't forward signals, so graceful shutdown breaks

### Containers & Docker: Intermediate

1. How do you make a Docker image smaller and faster to build?

    - Multi-stage builds: compile in a full SDK image, copy only the output into a slim runtime image
    - Small base images: `-slim`, Alpine (watch musl compatibility) or distroless; fewer packages also means fewer CVEs
    - Order layers from least to most frequently changing: copy dependency manifests and install dependencies *before* copying the source, so code changes don't invalidate the dependency layer
    - A `.dockerignore` that excludes `.git`, build outputs and `node_modules`
    - Combine `RUN` steps and clean package caches in the same layer (`apt-get install … && rm -rf /var/lib/apt/lists/*`)
    - BuildKit cache mounts (`RUN --mount=type=cache,target=/root/.npm`) and a registry cache (`--cache-from`/`--cache-to`) for CI

### Containers & Docker: Advanced

1. A container works on your laptop but is `OOMKilled` in production with the same image. What do you check?

    - Limits: locally the container likely ran without a memory limit; in production the cgroup limit applies. Compare `docker inspect`/pod spec limits with real usage
    - Runtimes that size themselves from the host, not the container: older JVMs (set `-XX:MaxRAMPercentage`), Node.js heap (`--max-old-space-size`), Go `GOMEMLIMIT`, worker counts based on host CPUs
    - What counts against the limit: page cache under memory pressure, `tmpfs` and memory-backed `emptyDir` volumes, and sidecars in the same pod
    - Production data and traffic: larger payloads, more concurrent requests, bigger caches than on a laptop
    - Native memory leaks outside the managed heap (thread stacks, direct buffers, image libraries)
    - Evidence: `kubectl describe pod` (Last State: OOMKilled, exit code 137), `container_memory_working_set_bytes` over time, kernel OOM messages in `dmesg` on the node

### Containers & Docker: Expert

1. How would you harden container images and the container runtime for a regulated (PCI DSS / HIPAA) environment?

    - Images: minimal or distroless bases from a trusted internal registry, rebuilt on a schedule to pick up patches; no secrets baked in; an SBOM per image
    - Pipeline gates: vulnerability scanning with a severity policy, image signing, and admission control that only allows signed images from approved registries
    - Runtime: run as non-root, read-only root filesystem, drop all Linux capabilities and add back only what's needed, `allowPrivilegeEscalation: false`, seccomp `RuntimeDefault`, no privileged or host-namespace containers (Pod Security Standards "restricted")
    - Isolation: network policies with default deny, separate node pools for sensitive workloads, sandboxed runtimes (gVisor, Kata) where the risk justifies it
    - Detection: runtime threat detection (Falco, Tetragon), audit logs shipped to a SIEM
    - Evidence for auditors: policies as code in Git, scan and admission reports, and an exception process with expiry dates

## Kubernetes

### Kubernetes: Beginner

1. What is the difference between a Deployment, a Service and an Ingress?

    - **Deployment**: runs and updates a set of identical pods (through ReplicaSets), with rolling updates and rollback
    - **Service**: a stable virtual IP and DNS name in front of a changing set of pods selected by labels; types are `ClusterIP` (internal), `NodePort` and `LoadBalancer`
    - **Ingress**: HTTP(S) routing from outside the cluster to Services by host name and path, with TLS termination, implemented by an ingress controller (NGINX, Traefik, a cloud load balancer); the Gateway API is its successor
    - Together: the Deployment runs the pods, the Service gives them one address, and the Ingress exposes that address to users

### Kubernetes: Intermediate

1. What is the difference between resource requests and limits, and what happens when a pod exceeds each?

    - **Requests** are what the scheduler reserves on a node: a pod only lands on a node with enough unreserved capacity
    - **Limits** are the hard cap enforced at runtime by the kernel (cgroups)
    - Exceeding the CPU limit: the container is **throttled**, so it runs slower but keeps running
    - Exceeding the memory limit: the container is **OOMKilled** and restarted
    - Using more than the request (but under the limit) is allowed while the node has spare capacity; under node memory pressure those pods are evicted first
    - QoS classes follow from this: Guaranteed (requests = limits), Burstable, BestEffort (none set); BestEffort pods are evicted first
    - Common practice: always set requests; set memory limits; be careful with CPU limits on latency-sensitive services because of throttling

### Kubernetes: Advanced

1. Every rolling update causes a burst of 502 errors, even though the readiness probes pass. Why, and how do you fix it?

    - The race: when a pod is terminated, removing it from the Service endpoints and sending SIGTERM to the container happen *in parallel*; kube-proxy, the ingress controller and the cloud load balancer take a few seconds to stop sending it traffic, while the app may already be shutting down
    - Fix the shutdown: a `preStop` hook that sleeps 5–15 s (Kubernetes 1.30+ has a native `sleep` action), and an app that handles SIGTERM by finishing in-flight requests before exiting
    - Make `terminationGracePeriodSeconds` longer than the preStop sleep plus the drain time
    - Align load balancer settings: target deregistration delay, and keep-alive idle timeouts in the app longer than the proxy's, so the proxy doesn't reuse a connection the app just closed (a classic 502 cause)
    - Rollout settings: `maxUnavailable: 0` with `maxSurge` so capacity never drops, plus a `minReadySeconds` buffer
    - Verify with a load test during a rollout: zero 5xx is the target

    More Kubernetes questions: [Kubernetes Interview Questions](/posts/devops/orchestration/kuberentes/kuberentes-interview-questions/).

### Kubernetes: Expert

1. How would a small platform team run 40 Kubernetes clusters across several regions?

    - Standardise: every cluster built from the same code (Terraform or Cluster API), with the same baseline add-ons (CNI, ingress, cert-manager, observability agents, policy engine), versioned as one "cluster product"
    - GitOps for everything on the clusters: Argo CD ApplicationSets or Flux generate per-cluster deployments from a single repository, so drift is corrected automatically
    - Upgrade in waves: a canary cluster first, then by region and risk, with automated smoke tests between waves and a fixed upgrade calendar to stay within supported versions
    - Policy as code (Kyverno or Gatekeeper) applied fleet-wide for security and tenancy rules
    - Central observability: metrics, logs and traces shipped to a central backend with cluster labels, and SLOs per cluster
    - A clear tenancy model (namespace per team with quotas and RBAC, or cluster per team for strong isolation) and identity federated from the company IdP
    - Treat clusters as cattle: rebuilding a cluster from code should be routine, which also makes disaster recovery a tested path

## Infrastructure as Code

### Infrastructure as Code: Beginner

1. Terraform and Ansible can both automate infrastructure. When would you use each?

    - **Terraform** is declarative *provisioning*: you describe the cloud resources you want (networks, VMs, databases, DNS) and it creates, updates or deletes them to match, tracking them in a state file
    - **Ansible** is procedural *configuration management*: it connects to existing machines over SSH or WinRM and runs tasks (install packages, edit config files, restart services); it has no state file
    - Typical split: Terraform builds the infrastructure, Ansible (or cloud-init, or a baked image from Packer) configures what runs on the machines
    - With containers and managed services, there is less need for configuration management: immutable images replace in-place changes

### Infrastructure as Code: Intermediate

1. How do you structure Terraform for dev, staging and production without copy-pasting code?

    - Reusable **modules** hold the resource logic, versioned (Git tags or a private registry) and tested
    - A small **root module per environment** (or per environment and component) calls those modules with environment-specific inputs (`*.tfvars`)
    - **Separate state per environment** (and per component) so a mistake in dev can't touch production and plans stay fast
    - Promote changes by module version: dev uses `v1.4.0` first, production moves to it after testing
    - Workspaces suit identical, short-lived copies; for real environments with different settings and permissions, separate directories and backends are clearer
    - Tools such as Terragrunt reduce the remaining repetition (backend config, provider blocks)

### Infrastructure as Code: Advanced

1. Two pipelines ran `terraform apply` on the same state at the same time, and the state no longer matches reality. How do you recover, and how do you prevent it?

    - Stop all pipelines for that stack first
    - Find out why locking didn't work: a backend without locking, a lock disabled with `-lock=false`, or two different state files pointing at the same resources
    - Recover state: restore the last good version from backend versioning (S3 versioning, Azure blob snapshots) or push a locally saved `errored.tfstate`; keep a copy of the current one first
    - Reconcile: `terraform plan -refresh-only` shows the drift; `import` resources that exist but aren't in state, `state rm` entries for resources that no longer exist; re-plan until the plan shows only intended changes
    - Prevent: a backend with locking (S3 with `use_lockfile`, or DynamoDB on older versions; Azure blob leases; Terraform Cloud), pipeline concurrency limits per stack (`concurrency:` groups), and one pipeline (Atlantis, Terraform Cloud) as the only path to `apply`

### Infrastructure as Code: Expert

1. How would you introduce policy-as-code guardrails for infrastructure across 30 teams without blocking their delivery?

    - Start from real risks and incidents: public storage buckets, unencrypted databases, open security groups, untagged resources, expensive instance types
    - Write policies as tested code (OPA/Conftest, Sentinel, Checkov) in a versioned library with unit tests and a changelog
    - Roll out by enforcement level: advisory (warn in the pull request) → soft-mandatory (can be overridden with a reason) → hard-mandatory, announced in advance
    - Shift left: run the checks on `terraform plan` output in pull requests, so feedback arrives in minutes, not at audit time
    - Backstop at the cloud layer for what IaC can't catch: AWS SCPs, Azure Policy, GCP organisation policies
    - Make compliance the easy path: golden modules that already meet the policies, so most teams never see a violation
    - An exception process with an owner and an expiry date, and metrics on violations and exceptions per team to guide the next round
