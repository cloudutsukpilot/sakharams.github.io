---
layout: post
title: Terraform Best Practices
categories: [devops, orchestration, terraform]
tags: [DevOps, Orchestration, Terraform]
image: /assets/img/devops/orchestration/terraform/terraform-posts.jpg
description: Terraform Best Practices
---

## Introduction

As you start using Terraform more extensively, it becomes critical to follow best practices around structure, testing, collaboration, security, and reusability. Adhering to best practices will improve efficiency, reduce errors, and make your Terraform code more maintainable.

### Terraform Best Practices across the following key areas

1. Directory structure and organization  
2. Modular design  
3. Testing  
4. Collaboration and sharing  
5. Security  
6. Reusability  
7. Tool integration  
8. Documentation  
9. Deployment  
10. Cost estimation  
11. Version control  
12. Backend configuration  
13. Input and output variables  
14. Code formatting and linting  
15. Logging and monitoring  
16. Error handling  
17. Production readiness  

### Directory Structure and Organization

- A proper directory structure is critical for organizing and scaling your Terraform configuration.
- Here are some best practices around structuring your Terraform code:
  - Separate infrastructure into environments (dev, staging, prod) with separate state files and data sources. This allows easy promotion of configs across environments.
  - Modularize configs by infrastructure layers (network, compute, database etc.) or features to improve readability and reusability. Each module should handle one feature or layer.
  - Use a root module to call child modules to avoid cluttering the root with all config details. The root module should only handle global resources, variables, outputs etc.
  - Place shared modules in a separate /modules folder and reference them in environment modules. Shared modules ensure reusability.
  - Create one folder per environment (/dev, /staging, /prod) containing that environment’s main.tf, variables.tf etc. files.
  - Here is an example directory structure:

    ```sh
    project-name
    ├── modules
    │   ├── vpc
    │   │   ├── main.tf
    │   ├── compute
    │   │   ├── main.tf 
    ├── prod
    │   ├── main.tf
    │   ├── variables.tf
    │   ├── output.tf
    ├── dev
    │   ├── main.tf
    │   ├── variables.tf
    │   ├── output.tf
    ```

  - This directory layout ensures environment isolation, modularity, and sharing of common modules across environments.

### Modular Design

- Modular design allows you to break your Terraform config into reusable, composable blocks called modules. Modules improve code organization, reusability, abstraction, and encapsulation.
- Here are some best practices around using modules effectively:

  - Encapsulate infrastructure layers (network, compute, DB etc.) into separate modules with input variables and outputs.
  - Use modules extensively to avoid duplication. Identical resources should be modules to ensure consistency.
  - Make modules as self-contained as possible with least dependencies on other modules. Loosely coupled modules are easier to recompose.
  - Avoid hardcoded values in modules. Pass them as input variables instead to make modules reusable.
  - Design modules to be used as building blocks, so infrastructure can be composed from modules.
  - Place reusable modules in a central modules directory and reference them in other configurations.
  - Use module outputs instead of data sources to access module attributes to hide module internals.
  - Version modules using semantic versioning for easier upgrades and governance.
  - Here is an example module layout:

  ```sh
  project-name
  ├── modules
  │   ├── vpc
  │   │   ├── main.tf
  │   │   ├── variables.tf 
  │   │   ├── output.tf
  │   ├── compute
  │   │   ├── main.tf
  │   │   ├── variables.tf
  │   │   ├── output.tf
  ```

  - Treating modules as code units improves Terraform usage significantly.

### Testing

- Testing infrastructure code is critical to prevent errors and ensure reliable deployments. 
- Here are some best practices around testing Terraform code:

  - Use Terratest to test modules and infrastructure behavior with automated tests e.g. checking module outputs, testing eventual consistency etc.
  - Build a Terraform testing framework for integration testing (modules working together), regression testing (against code upgrades) and contract testing (module inputs/outputs).
  - Use Terraform workspaces to test modules in isolation without affecting existing infrastructure. Terraform Cloud also provides ephemeral test environments.
  - Set up a CI/CD pipeline to run Terratest suite on all commits and pull requests. This enables regular automated testing.
  - Perform negative testing e.g. invalid variable values, unacceptable module versions etc. to ensure robust failure modes.
  - Include test cases for module boundaries e.g. min/max values for variables, max resource count etc. to validate guard rails.
  - Use linting with terraform fmt to enforce code style and make tests more reliable due to less variability.
  - Automated testing is key to identifying issues early and having confidence in infrastructure changes.

### Collaboration and Sharing

- Collaborating effectively is key to successful infrastructure delivery in teams.
- Here some some best practices around collaborating on Terraform code:

  - Use Terraform Cloud workspaces for state sharing and locking across a team. Remote state storage facilitates collaboration.
  - Implement permissions and code review enforcement via VCS integrations (GitHub etc.) to ensure accountability for changes.
  - Share modules via public/private module registries like Terraform Cloud or Terraform Registry for reuse across teams/orgs.
  - Use semantic versioning for shared modules to avoid unexpected changes impacting dependent configurations.
  - Treat modules like internal SDKs shared and supported by platform teams. Publish updates responsibly after testing integrations.
  - For composable infrastructure, maintain module integrity contracts around inputs and outputs for reliability.
  - Document modules extensively with input/output vars, best practices per cloud to support usage across teams.
  - With some governance and tools for sharing, Terraform usage can be scaled across large teams and organizations.

### Security

- Incorporating security practices into Terraform code is critical for safe infrastructure provisioning by avoiding exposure to risks and threats.
- Here are some security best practices:

  - Use variable types e.g. string for sensitive values to avoid exposure inside state file or logs. Store actual values in vault.
  - Encrypt and backup remote state file to avoid loss of state or leaks of sensitive infrastructure details in the state.
  - Scan providers, modules etc. during CI/CD before use in configurations to detect vulnerabilities early.
  - Restrict state access only to automation tooling to prevent access by individual users directly. This avoids accidental state corruption.
  - Enable logging, secret detection etc. during CI/CD to audit Terraform configuration changes.
  - Run terraform plan with read-only access while creating resources to avoid accidental resource creation/deletion during planning.
  - Enforce code reviews for infrastructure changes along with automated policy checks to catch issues earlier.
  - Security practices enable teams to scale infrastructure safely by reducing risks as usage grows across environments.

### Reusability

- Reusable components allow teams to build reliable infrastructure faster through composition vs starting from scratch. 
- Here are some best practices around reusability:

  - Build modular components with reusability as the first principle. Standardize interfaces using inputs and outputs.
  - Encapsulate complexity inside modules rather than repeating boilerplate code everywhere for the same types of resources.
  - Prefer composition of reusable certified modules over individual resource configuration even for simple cases to avoid “one-off” non-reusable components.
  - Maintain centralized repositories of reusable modules shared across teams like an internal SDK avoiding duplication of foundational components.
  - Define module APIs explicitly with semantic versioning to avoid breaking consumers across versions avoiding unnecessary refactoring.
  - Provide integrated experience via validated reference architectures using certified modules avoiding gluing modules on an ad hoc basis.
  - Invest in modules built and supported by platform teams as “certified modules” serving as the building blocks for the organization.
  - Designing infrastructure solutions with reusability as a first principle accelerates delivery for all teams by standardization and composition.

### Tool Integration

- Integrating complementary tooling into the Terraform workflow multiplies productivity through automation around workflows spanning authoring, testing, collaboration, governance etc.
- Here are some useful integrations worth setting up:

  - `Version control (Git)` — For change tracking, collaboration, review enforcement. Also enables advanced GitOps workflows.
  - `CI/CD platforms (Jenkins, CircleCI)` — For test automation, policy enforcement, deployment pipelines integrated with the Git commit and PR workflows.
  - `Cloud IDEs (GitHub Codespaces)` — For authoring, collaborating and testing workflows with integrated experience without local environment setup.
  - `Linters (tflint)` — For policy-as-code enforcement, style checks etc. in the PR verification pipeline to catch issues early.
  - `Terraform cloud` — For remote state management, access controls, variables management across environments and workspaces.
  - The workflow tool integrations amplify productivity around Terraform configurations and fill vital gaps such as policy checks, automated testing etc. with the GitOps workflows.

### Documentation

- Extensive documentation is critical for infrastructure code discoverability, onboarding, coordination across teams and general usability even for modules intended for internal use.
- Here are some documentation best practices:

  - Document modules using the Terraform registry format with inputs, outputs, usage, examples etc. Treat documentation as first-class citizens.
  - Use README markdown files for developer/user documentation including pre-reqs, faqs, links, diagrams etc. Makes modules more discoverable.
  - Provide annotated code comments for classes of resources provisions, data lookups performed, nested module calls etc to make the code more understandable without having to decode it.
  - Embed documentation for key config decisions with links to design docs or product requirements early on while context is fresh. Serves as vital context later during troubleshooting,   - hand-overs etc.
  - Over-communicate warnings, gotchas etc. to lower user expectations e.g. max resource thresholds before use, key requirements like IAM permissions needed for successful provisioning.
  - Good documentation serves as project tribal knowledge that is vital as teams scale and institutional knowledge gets fragmented or lost due to attrition.

### Deployment

- Standardizing and automating Terraform deployment improves reliability and efficiency significantly.
- Some key practices include:

  - Fully automate deployments via CI/CD pipelines invoking Terraform commands rather than local ad-hoc execution. Applies across dev, staging and prod.
  - Implement blue-green deployments via Terraform workspaces when possible to reduce risks and downtime during rollouts.
  - Wrap Terraform runs in pre/post hooks during CI/CD to check dependencies like credentials, test tooling etc. before deployments.
  - Encapsulate cloud credentials, attributes only during runtime to maximize security. Avoid checking-in creds even encrypted.
  - Implement deployment gates and health checks to catch failures early before they cascade downtime across interconnected systems.
  - Follow blast radius minimization principle across modules, test groups etc. to confine failures during changes or new feature rollout.
  - Automation and disciplined processes around standardized deployment patterns drive efficiency, lower risks during rollouts across environments for infrastructure or application code changes.

### Cost Estimation

- Infrastructure costs can pile up quickly if left unchecked.
- Here are some tips around keeping cloud costs in control:

  - Use Terraform cost estimation capabilities before provisioning resources to get size of bill and fine tune configs.
  - Configure budgets alerts, quota limits etc. as code via Terraform as guard rails before deploying to new stages like production.
  - Monitor budgets vs actual spend after deployment and tune resources right-sized if significant deltas seen due to real world load vs guesses.
  - Configure auto-scaling rules carefully based on demand patterns not just thresholds to optimize cloud resource costs.
  - Combine base images, bulk asset loading, caching layers etc. to optimize cloud resource needs.
  - Enforce tagging standards via code for ownership, environments etc. Terraform enables bulk tagging.
  - Continuous cost optimization should be baked into infrastructure management to avoid surprise bills.

### Version Control

- Maintaining Terraform config in VCS brings discipline, collaboration benefits common for software code:

  - Enforce code reviews for all changes to keep quality high and minimize configuration drift across environments.
  - Maintain config skew across environments close to zero by requiring changes to be applied first in lower stages like dev vs directly in prod.
  - Use commit statuses, branch protections etc. to ensure changes follow intended workflows before getting applied. For example, mandatory tests passing or approvals.
  - Track configs across environments to troubleshoot issues faster by comparing versions or roll back easily.
  - Treat infrastructure configs with same rigor as application code changes since they can directly impact application reliability and availability.
  - Version control brings software engineering safety nets to infrastructure changes via mature practices around control, traceability and collaboration.

### Backend Configuration

- Choosing the right backend and configuring it appropriately avoids state related risks down the road:

  - Use Terraform cloud as backend by default even for smaller projects to benefit from always fresh state, access controls, change history etc.
  - Setup remote state storage with locking to allow concurrent runs. Local file backend limits collaboration.
  - Restrict direct state access expect for automation driven flows to minimize mistakes leading to state corruption or inconsistencies.
  - Enabled both local and remote state backups to aid recovery in disasters without data loss which can be painful to recover from.
  - Secure access keys for remote state with short lifetimes and least privilege permissions to minimize blast radius of any credential compromises.
  - Don’t overlook proper state management since recovering from state issues might need tremendous effort risking infrastructure integrity.

### Input and Output Values

- Standardizing usage of input and output variables establishes consistency across modules. It also avoids hardcoding values making modules non-reusable.
- Best practices around managing inputs and outputs:

  - Define input variables for all hardcoded values exposed by modules to consumers. Avoid internal values leaking outside.
  - Set input variable defaults internally to avoid forcing consumers to supply every variable. Sensible defaults reduce friction.
  - Describe input variables extensively in documentation with validation rules, type constraints etc.to establish contracts upfront.
  - Define output values to expose all data consumers may need outside the module to access state or attributes of the managed infrastructure.
  - Mark sensitive variables accordingly so values don’t leak accidentally in logs, state etc. Encrypt via ‘TF_VARS’ if required.
  - Follow Terraform recommended naming like snake_case for vars/outputs, using underscores, lowercase etc improve consistency.
  - Well defined interfaces using vars and outputs aid discoverability, loose coupling and interoperability across independently maintained modules.

### Code Formatting and Linting

- Formatting standards like ordering of blocks, indentation, whitespace usage etc improve code quality and readability over time as configurations grow large spanning hundreds of resources.
- Here are some code styling best practices worth implementing:

  - Use terraform fmt in your CI/CD pipeline to auto format configs and reduce noise in diffs when reviewing code changes. Enforces standards.
  - Adopt linting via tflint or checkov by embedding in pre-commit hooks to catch issues early before submitting pull requests or running plans.
  - Setup IDE integrations with linters to provide real-time feedback on styling issues, deprecated syntax usage, unused declarations etc as you write configs.
  - Disable auto formatting capabilities of editors and rely exclusively only terraform fmt for formatting to prevent fragmenting of styles.
  - Coding guidelines avoid frustrating inconsistencies, improves code quality and avoids common mistakes enforced uniformly before they enter the codebase.

### Logging and Monitoring

- Insight into infrastructure state and changes is vital for debugging issues faster and meeting compliance needs:

  - Enable resource level logging across modules and aggregate via services like Splunk, Datadog etc. for single pane of glass visibility.
  - Monitor infrastructure configuration changes by integrating Terraform usage with config management databases/tools like ServiceNow etc.
  - Export resource details created by Terraform to config management databases containing CI, CMDB records for enterprise systems.
  - Integrate Terraform state storage backends like Terraform Cloud with internal systems to expose current infrastructure state for governance needs.
  - Logging and monitoring transforms infrastructure into code managed akin to service interfaces and APIs by bringing uniformity across user initiated changes, fault detection and repair.

### Error Handling

- Robust error handling ensures system integrity and avoids progressing in unsound state potentially leading to catastrophic subsequent failures:
- Incorporation error handling best practices:

  - Implement pre and post conditions around Terraform module invocations during CI/CD to validate environment health, dependencies etc before and after runs.
  - Make modules resilient by embedding assertions extensively to catch failures early before they cascade or leave infrastructure in invalid state.
  - Unit test modules for negative scenarios by passing invalid configurations to verify failures are handled elegantly.
  - Leverage Object lifecycle hooks like create_before_destroy for blue-green deployments during failures/replacements.
  - Exercise rollback workflows from backups to validate recovery process periodically before encountering real failures needing rollbacks.
  - With integration complexity, anticipating and planning for failure pathways improves system resilience significantly for mission critical systems.

### Production Readiness

- Additional measures should be undertaken before exposing any infrastructure or application changes directly to production to minimize risks amidst real usage:

  - Validate production readiness via orchestrated health checks at infrastructure and application levels to fail early in case of any gaps.
  - Exercise rollback workflows periodically on lower environments before needing them in production to ensure availability under product failures.
  - Implement canary deployments to production touching subset of users allowing rapid detection of issues at scale before impacting all users.
  - Establish internal SLAs around production grade infrastructure related to durability, availability, scalability, performance metrics etc modeled as code.
  - Test infrastructure recovery procedures frequently — disaster simulations across availability zones, regions by inducing controlled failures.
  - Automate production smoke tests, replicating production load on staging to catch issues proactively.
  - Enforce mandatory ops reviews or runbooks sign off for changes touching production or mission critical pathways.
  - Hardening for production reduces risks of issues in production significantly through release gating and battle testing similar to war games.

### Conclusion

Adopting Terraform best practices across critical areas such as testing, collaboration, tool integration etc. improves efficiency, scaling and reliability of infrastructure automation significantly while lowering risks.

Treating infrastructure configurations with the same rigor as application code will yield dividends similar to software disciplines around quality, collaboration and compliance over time.
