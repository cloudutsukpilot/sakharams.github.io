---
layout: post
title: "Y-IaC: Security and Privacy"
date: 2026-10-05 00:06:00 +0530
categories: [projects, y-iac]
tags: [Projects, Y-IaC, Security, Privacy]
description: "Y-IaC security: threat model for a shared CLI, CI identities, secrets that leak into generated provider.tf, plan redaction, OPA, Wiz and Trivy gates."
project: y-iac
project_step: 6
image:
  path: /assets/img/projects/y-iac/06-security-and-privacy.webp
  alt: "Y-IaC: Security and Privacy - Projects hero image"
---

A defect in Y-IaC doesn't stay in Y-IaC. The same `root.hcl`, the same CLI and the same workflows run
in every consumer, so a security mistake here is copied into every repository on its next sync. That
makes security a release requirement for the shared path, not a review someone does once a year. This
post covers the threat model, where the credentials actually go, and the gates that check every plan.

<!-- more -->

{% include project-nav.html %}

## Threat modeling
{: #threat-modeling }

The assets worth protecting are cloud control (who can create or destroy), state (which can contain
secrets and reveals the estate), and the shared code itself (which every consumer executes). A
STRIDE-style pass over the main surfaces:

| Surface | Threat | Current control | Gap |
|---|---|---|---|
| Shared module ref | A malicious or broken change reaches every consumer | PR review, CODEOWNERS, consumers pin a ref | Many consumers may track `main` |
| CI identity | Leaked client secret gives standing cloud access | GitHub secrets | Long-lived secrets; no OIDC yet |
| Generated `provider.tf` | Secrets written as literals into `.terragrunt-cache/` and the binary plan | Plan JSON redaction | The binary plan and cache are not redacted |
| State backend | Read access reveals resources and sensitive attributes | Per-repo container or bucket, separate backend credentials | Access reviews not defined |
| Consumer YAML | Wrong subscription targeted | Repo-to-subscription guardrail | Unmapped repos are unrestricted |
| Runtime dependencies | Unpinned install at run time | `entrypoint.py` installs only when missing | Version ranges, not pins |
| Gate tools | Tool fetched as "latest" changes behavior | Installed by `setup-environment` | Wiz CLI defaults to latest when unpinned |
| Plan artifacts | Artifacts leak infrastructure detail | Artifact retention defaults | Retention and access not defined |

The third row is the one I'd fix first; details in [Secrets and key management](#secrets-and-key-management).

## Authentication and authorization
{: #authentication-and-authorization }

Authentication comes from the environment the CLI runs in (the full table is in
[Technical Architecture](/posts/projects/y-iac/05-technical-architecture/#identity-and-access-architecture)):
an engineer's Azure CLI login locally, a service principal from `.env` with `--use-service-principal`,
and a service principal from GitHub secrets in CI. Backend credentials (`BACKEND_*`) are kept separate
from deployment credentials when `backend_auth_alias` is set.

Authorization has three layers:

1. **GitHub.** Who can merge to a consumer's `main`, and who is a required reviewer on its environments.
2. **Repo-to-subscription guardrail** (`validation/repository.py`). A repo listed with
   `allowed_subscriptions` can only deploy to those. A repo with no entry is unrestricted, deliberately,
   so onboarding doesn't need a platform change. I'd flip that default once all consumers are mapped.
3. **Cloud RBAC** on the service principals.

My recommendation for CI is OIDC federated credentials (`azure/login` with `id-token: write`, and the
AWS and GCP equivalents), with one federated credential per consumer repo and environment. That removes
the long-lived `ARM_CLIENT_SECRET` and makes the subject claim (`repo:org/infra-x:environment:production`)
part of the authorization.

OIDC federated credentials are the recommended direction for every subscription, including production.
Workload identity federation is supported by Entra ID, AWS IAM and GCP, so it needs no new tooling,
only one federated credential per consumer repo and environment.

## Secrets and key management
{: #secrets-and-key-management }

The rule is simple and mostly followed: no secret ever appears in YAML. Credentials only arrive through
environment variables, from `.env` locally (git-ignored) or from GitHub secrets in CI (`secrets: inherit`
from the consumer workflow).

The exception is in how `root.hcl` renders providers. It writes, for example:

```hcl
provider "azurerm" {
  client_secret = "${get_env("ARM_CLIENT_SECRET", "")}"
}
```

Terragrunt resolves `get_env` when it generates the file, so the rendered `provider.tf` under
`.terragrunt-cache/` holds the secret as a literal, and Terraform records it in the binary plan. The
redaction module (`reporting/redaction.py`) scrubs it from plan JSON before Wiz, Trivy, OPA or artifact
upload, and its own docstring says the cache and binary plan are not protected.

The fix is at the source: drop the credential arguments from the generated provider blocks and let each
provider read its standard environment variables (`ARM_CLIENT_SECRET`, `AWS_*`, `GOOGLE_*`) directly.
The same applies to the per-subscription aliases, which can use `client_id_file_path` or OIDC. With
OIDC, there's no secret to leak in the first place.

## Encryption requirements
{: #encryption-requirements }

- **In transit:** all provider, backend, GitHub, Jira and Teams calls are HTTPS.
- **State at rest:** Azure Storage encrypts by default; the S3 backend template sets `encrypt = true`
  (and `infra-aws` uses S3 native locking with `use_lockfile: true`); GCS encrypts by default.
- **Resources the modules create:** enforced by policy rather than hope. `storage_encryption.rego` denies
  storage accounts with public network access or public nested items in any environment.

Platform-managed encryption is acceptable for state as the default. Customer-managed keys in Key Vault
are worth it only for consumers whose state holds regulated data (for example healthcare workloads),
where an auditor may expect control of the key lifecycle.

## Network security
{: #network-security }

The platform's own network exposure is small: outbound HTTPS from laptops and runners to provider APIs,
backends, GitHub, registries and the gate tools. The questions are where runners live and what they can
reach:

- GitHub-hosted runners (`ubuntu-latest`) can't reach private endpoints. Any consumer whose state storage
  or resources are behind private endpoints needs a self-hosted runner in a network that can.
- Self-hosted runners should be ephemeral, per job, so one consumer's job can't leave anything behind
  for the next.
- For the infrastructure the modules create, `network_security.rego` checks NSG rules, and Zscaler
  modules plus `domain_allowlist.rego` cover private access.

## Input validation and secure coding
{: #input-validation-and-secure-coding }

Everything the CLI receives is validated before anything runs: path existence, provider and stack
combinations, required parameters, target account resolution, the repo-subscription mapping and a lint
of `resources.yaml` for duplicate or malformed declarations. Validation runs before authentication, so a
typo never gets as far as a cloud login.

Secure coding rules I'd hold the Python package to:

- Subprocesses are built as argument lists (`core/shell.py`), never as shell strings with interpolated
  user input.
- YAML is loaded with the safe loader only.
- Paths from YAML or arguments are resolved and checked to stay inside the repo before use.
- Errors are raised as typed exceptions (`core/errors.py`) with a hint, never swallowed.
- `ruff` runs in CI (`python-quality.yaml`), including its security rules if enabled.

## Vulnerability and dependency management
{: #vulnerability-and-dependency-management }

Four kinds of dependency, each with its own risk:

| Dependency | Pinned? | Recommendation |
|---|---|---|
| Terraform providers | Yes, `config/providers.yaml` | Keep; bump through the compatibility workflow |
| Python packages | Ranges in `pyproject.toml` / `requirements.txt` | Add a lock file for CI |
| GitHub Actions | Tags such as `actions/checkout@v5` | Pin third-party actions to commit SHAs |
| CLI tools (Terragrunt, TFLint, Wiz CLI) | Versions set in `setup-environment`; Wiz defaults to latest | Pin all, cache the binaries |

On top of that, the Y-IaC repo itself should run dependency scanning (Dependabot or equivalent) and
GitHub Advanced Security code scanning; the repo already documents GHAS policies in
`docs/github-advanced-security-policies.md`.

## Privacy and data-protection requirements
{: #privacy-and-data-protection-requirements }

Y-IaC doesn't process personal data, but its artifacts can still be sensitive:

- **State** can contain secrets (generated passwords, keys) and always reveals resource names, addresses
  and tags.
- **Plan JSON and logs** reveal the same, plus diffs of attributes.
- **Jira drift tickets and Teams messages** carry repo names, stack names and change counts.

So the rules are: classify these as internal-confidential at minimum, restrict who can read state and
artifacts, keep resource tags free of personal data, and never paste plan output into public issues. Any
workload-level privacy requirement (data residency, for example) is enforced through
`region_restrictions.rego` and the consumer's subscription choice.

## Audit logging
{: #audit-logging }

The audit trail for a change is already spread across systems; what's missing is a rule for keeping it.

| Event | Evidence | System |
|---|---|---|
| Intent | PR, YAML diff, reviewer | GitHub |
| Plan | Plan files, plan JSON, gate results, summary | Workflow artifacts |
| Approval | Environment approval record | GitHub deployments |
| Apply | Apply log, plan-after-apply | Workflow run |
| State change | Blob or object versions | Backend |
| Cloud action | Activity log, CloudTrail, audit logs | Cloud provider |
| Drift | Ticket with fingerprint and history | Jira |

Plan artifacts are uploaded with `retention-days: 7`, which is sensible for files that contain sensitive
diffs and far shorter than an auditor will want.

Recommendation: keep raw plan files short (the current 7 days), and export a small evidence record per
production apply (see [Evidence collection](/posts/projects/y-iac/17-governance-and-compliance/#evidence-collection))
to an immutable, time-based retention container for **six years**, matching the regulatory baseline in
[Requirements](/posts/projects/y-iac/02-requirements-gathering/#regulatory-legal-and-compliance-requirements).

## Security testing and incident response
{: #security-testing-and-incident-response }

Testing happens on two levels. On every plan, the gates run: OPA (10 policies across Azure, global and
Zscaler packages, including tags, naming, regions, VM SKUs and storage exposure), Trivy for
misconfigurations and secrets, or Wiz, chosen with `iac_scanner`. Each gate can be advisory,
soft-mandatory or mandatory. For the platform code, `tests/test_opa.py`, `test_validation_gates.py` and
the redaction tests cover the security paths, and negative-path tests should prove a mandatory gate
really blocks.

For incidents, the platform-specific scenarios to rehearse:

1. **Leaked CI secret.** Rotate the service principal secret, check cloud activity logs for its use,
   then move that consumer to OIDC.
2. **Malicious or broken shared change.** Consumers pin to the last good ref; revert in Y-IaC; review
   every apply since the bad commit.
3. **State exposed.** Rotate any secrets found in state; review backend access logs.

Vulnerability disclosure, remediation SLAs and exception expiry are covered in
[Governance](/posts/projects/y-iac/17-governance-and-compliance/#policy-enforcement).

## Checklist
{: #checklist }

- [ ] Generated provider blocks stop interpolating secrets; providers read env vars directly
- [ ] CI uses OIDC federated credentials per consumer repo and environment
- [ ] Every consumer has an `allowed_subscriptions` entry, then the guardrail default flips to deny
- [ ] Third-party actions are pinned to SHAs; Wiz CLI and other tools are pinned
- [ ] State and artifact access is restricted and reviewed
- [ ] Evidence retention period is set and long-term export is in place if needed
- [ ] Each gate's enforcement level is decided per environment and documented
- [ ] The three incident scenarios have a written runbook

{% include project-nav.html %}
