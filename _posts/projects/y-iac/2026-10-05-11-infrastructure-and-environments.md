---
layout: post
title: "Y-IaC: Infrastructure and Environments"
date: 2026-10-05 00:11:00 +0530
categories: [projects, y-iac]
tags: [Projects, Y-IaC, Infrastructure, IaC]
description: "Y-IaC environments on two levels: the platform's own dev-to-production path through consumer refs, and the consumer environments its modules build."
project: y-iac
project_step: 11
image:
  path: /assets/img/projects/y-iac/11-infrastructure-and-environments.webp
  alt: "Y-IaC: Infrastructure and Environments - Projects hero image"
---

"Environment" means two different things on this project, and mixing them up causes most of the
confusion. There are the platform's own environments: where a change to Y-IaC is developed, tested and
released. And there are the consumer environments that Y-IaC's modules create: dev, staging and
production subscriptions, accounts and orgs. This post keeps them apart and says what each one needs.

<!-- more -->

{% include project-nav.html %}

## Development environment
{: #development-environment }

For the platform, development is a laptop with Y-IaC and at least one consumer checked out side by side
([setup](/posts/projects/y-iac/08-development-preparation/#local-development-setup)). The CLI runs the
same way it does in CI, with three differences: it finds the shared module in the parent folder,
authenticates with the engineer's Azure CLI login by default, and can use a local backend.

For consumers, a dev environment is a folder like `environments/aws/dev/`. Its `common_vars.yaml` sets the
account, the providers and the tags:

```yaml
default_aws_account: management
common_tags:
  managed_by: terraform
providers:
  - aws
subscriptions: []
trivy_enabled: true
opa_enabled: true
```

For labs, `common_vars.yaml` can override the backend to `type: local`, and the state lands under
`~/tf-backend` (or `TF_BACKEND_BASE_PATH`), so experiments never touch shared state.

## Test or QA environment
{: #test-or-qa-environment }

The platform's test environment is the **compatibility workflow**: it clones consumers, symlinks the
branch's shared module into them, and plans every stack it finds. It needs read access to each consumer
repo (a token) and plan-level credentials for each subscription (`REPO_SUBSCRIPTION_MAPPING` maps repo to
subscription).

For apply-level testing, a sandbox consumer with its own subscription or account is the right place.
The cloudutsukpilot repos (`infra-aws`, `infra-github`, and the still-empty `infra-azure` and `infra-gcp`)
can play that role for each cloud.

There is a sandbox: the shared `config.yaml` has a backend entry for a DevOps sandbox repository in a
sandbox subscription. That's the natural place to apply release candidates before they reach other
consumers.

## Staging environment
{: #staging-environment }

Y-IaC has no staging deployment, because it isn't deployed. Its staging is **a consumer pinned to a
pre-release ref**. Today `infra-aws` points `iac_shared_module_ref` at a feature branch while that
branch is being trialled. Formalising it:

1. Tag a release candidate (`v1.4.0-rc.1`).
2. Point two or three volunteer consumers at it for a week.
3. Watch their plans, applies and drift results.
4. Tag the final release and announce it.

For consumers, a staging environment is a folder and a subscription like any other, plus a GitHub
environment with its own reviewers. The `infra-github` repo creates exactly these environments
(`development`, `staging`, `production`) for its managed repositories.

## Production environment
{: #production-environment }

For the platform, production is **every consumer on a released ref**. For consumers, it's their
production subscriptions, with these minimums:

- Remote state (azurerm, s3 or gcs) with versioning, never local.
- A GitHub environment with required reviewers on the apply job.
- Gate enforcement at the agreed level (likely mandatory for OPA in production).
- Credentials scoped to that subscription only; ideally OIDC.
- The weekly drift scan enabled, with Teams and Jira configured.

As a rule of thumb, any consumer whose state lives in a production container or subscription counts as
production-critical, and those should pin a release tag. The DevOps team keeps that list in the consumer
inventory.

## Infrastructure as code
{: #infrastructure-as-code }

The whole platform is IaC about IaC, which leads to a fair question: how is Y-IaC's *own*
infrastructure managed? It has very little:

| Infrastructure | Managed by |
|---|---|
| State storage accounts, buckets | Should be a bootstrap stack in an infra repo using Y-IaC (local state for the bootstrap itself) |
| GitHub repos, teams, environments, custom properties for consumers | `infra-github`, through Y-IaC's GitHub modules |
| Runners (if self-hosted) | A Y-IaC stack, or the runner team's own tooling |
| Secrets and variables in GitHub | Manual today; could be `github_actions_secret` via `infra-github` |

`infra-github` managing the other infra repos' settings is a nice bit of self-hosting: the platform's own
GitHub estate is declared in YAML and reviewed like everything else.

## Networking and DNS
{: #networking-and-dns }

The platform needs outbound HTTPS from runners to provider APIs, registries, backends and gate services.
If a consumer's state or resources sit behind private endpoints, it needs a self-hosted runner inside a
network that can resolve and reach them, plus private DNS zones for the storage endpoints.

For consumer infrastructure, the Azure modules cover the network building blocks (virtual networks,
subnets, NSGs and rules, private endpoints, private DNS zones, application gateways, ASGs), and
`network_security.rego` checks rules at plan time. DNS names and certificates stay consumer-owned.

## Compute, storage, and databases
{: #compute-storage-and-databases }

Platform compute is runner time: GitHub-hosted `ubuntu-latest` for the cloudutsukpilot consumers, and a
self-hosted Ubuntu runner where private network access is needed (the compatibility workflow uses one).
Platform storage is state: one container per consumer or subscription in Azure Blob, one bucket per
consumer in S3 (`infra-aws` uses S3 native locking via `use_lockfile`), one bucket and prefix in GCS.

Consumer compute, storage and data services come from the module catalog: AKS and node pools, VMs,
Linux web and function apps, container apps, storage accounts and shares, managed disks, Key Vault,
registries and more. Sizing is the consumer's decision; the OPA `allowed_vm_skus` policy limits which
SKUs are allowed at all.

## Configuration and secret management
{: #configuration-and-secret-management }

| Kind | Where | Who changes it |
|---|---|---|
| Platform defaults | Y-IaC `config/` | Platform team, by PR |
| Repo settings (backend, workflow ref, runner, gates) | Consumer `config.yaml` | Consumer team |
| Environment settings | `common_vars.yaml` | Consumer team |
| Resource declarations | `resources.yaml` or category files | Consumer team |
| Secrets | `.env` (local, ignored), GitHub secrets and variables (CI) | Consumer admins, platform for shared ones |

GitHub *variables* hold non-secret settings such as `IAC_RUNNER` and `JIRA_URL`; *secrets* hold
credentials (`ARM_CLIENT_SECRET`, `WIZ_CLIENT_SECRET`, `JIRA_API_TOKEN`). Organization-level secrets
with repository access lists keep the shared ones in one place.

## Environment parity
{: #environment-parity }

The design gives strong parity for free: dev, staging and production of a consumer use the same modules,
the same `root.hcl` and the same CLI at the same ref, and differ only in YAML. What legitimately
differs should be visible in the YAML diff between environment folders:

- size and count of resources;
- gate enforcement (advisory in dev, mandatory in production);
- reviewers on the GitHub environment;
- subscription and credentials.

What must not differ: the Y-IaC ref (all environments of one consumer should be on the same ref),
provider versions (unless an `override_versions` entry says why), and the Terraform and Terragrunt
versions.

## Capacity and quota planning
{: #capacity-and-quota-planning }

Two kinds of capacity matter:

- **Platform capacity:** CI minutes and runner concurrency (applies run one at a time per consumer; the
  compatibility workflow runs five in parallel), provider API rate limits during the drift scan, and
  state backend request rates.
- **Consumer quotas:** vCPU per region, public IPs, AKS node counts, storage accounts per subscription.
  These belong in a consumer's deployment readiness check before a high-scale or new-region change.

I'd add a pre-flight warning to the CLI for one cheap case: before planning a VM or node pool change in
Azure, compare requested cores to the regional quota and warn early.

## Checklist
{: #checklist }

- [ ] Sandbox subscription or account exists for applying release candidates
- [ ] Release candidates are trialled on volunteer consumers before tagging
- [ ] Production consumers pin a release tag
- [ ] State storage for each backend is created by a reviewed bootstrap stack
- [ ] Self-hosted runner requirements for private endpoints are documented
- [ ] All environments of one consumer use the same Y-IaC ref
- [ ] Gate enforcement per environment is visible in YAML
- [ ] Quota checks are part of readiness for large changes

{% include project-nav.html %}
