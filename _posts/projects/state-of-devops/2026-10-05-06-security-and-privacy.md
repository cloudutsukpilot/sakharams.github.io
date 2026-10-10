---
layout: post
title: "State of DevOps: Security and Privacy"
date: 2026-10-05 00:06:00 +0530
categories: [projects, state-of-devops]
tags: [Projects, State of DevOps, Security, Privacy]
description: "Securing State of DevOps: read-only GitHub Apps, Workload Identity, Key Vault via External Secrets, path-safe APIs and a strict non-PHI data rule."
project: state-of-devops
project_step: 6
image:
  path: /assets/img/projects/state-of-devops/06-security-and-privacy.webp
  alt: "State of DevOps: Security and Privacy - Projects hero image"
---

A tool that can read the security posture of every repository in the organization is itself a target.
State of DevOps holds GitHub App keys for four organizations, a list of every repo without secret
scanning, and a button that writes to Jira. The security work for this project is mostly about making
sure that a dashboard meant to *find* gaps doesn't become one.

<!-- more -->

{% include project-nav.html %}

## Threat modeling
{: #threat-modeling }

A lightweight STRIDE pass over the components is enough for a system this size:

| Threat | Where | What could happen | Control |
|---|---|---|---|
| Spoofing | Dashboard users | Anyone on the network reads the findings or creates Jira stories | Entra ID sign-in through an enterprise app registration (see below) |
| Tampering | `/data` share | A compromised job or dashboard pod rewrites results | Jobs write only their own folders; the dashboard's mount is read-write today (it handles uploads), so a read-only mount plus a separate upload path is the fix |
| Repudiation | Jira endpoint | Stories created with no record of who asked | Log the requesting user on every create |
| Information disclosure | GHAS and secrets findings | A list of vulnerable repos is a map for an attacker | Restrict detail views, never store secret values |
| Denial of service | GitHub API | A runaway job exhausts the org's rate limit | Throttling, retries with backoff, concurrency limits |
| Elevation of privilege | GitHub App keys | A leaked key reads (or writes) across an org | Read-only App permissions, keys in Key Vault only |

The most interesting row is information disclosure. The value of the dashboard is that it makes gaps
visible, and so does an attacker's reconnaissance. Counts and pass/fail can be open to everyone; the
detail of *which* repo has an exposed secret should not be.

## Authentication and authorization
{: #authentication-and-authorization }

Machine identities are in good shape: per-org GitHub Apps with short-lived installation tokens, and
Azure Workload Identity on the `cron-jobs` and `state-of-devops` ServiceAccounts, so no job holds a
long-lived Azure credential in the normal path.

For people, the dashboard is meant to be open to everyone in the organization, which still means
*authenticated*: organization accounts only, never anonymous. Users sign in with **Entra ID through an
enterprise app registration**, so access follows the organization's identity lifecycle (joiners,
leavers, MFA and Conditional Access) with no local accounts to manage.

The next step I'd take is authorization on top of authentication, using the same registration: define
app roles (or emit group claims) and add one rule, that only a DevOps or security role can call
`POST /api/jira/create-story` and see secret scanning detail. Everyone else keeps the counts and
pass/fail.

## Secrets and key management
{: #secrets-and-key-management }

All secret material starts in Azure Key Vault and reaches pods through External Secrets Operator:

| Secret | Used by |
|---|---|
| `github-app-<org-slug>` (App ID, private key, installation ID) | Every GitHub-facing cronjob |
| `jira-secrets` (`JIRA_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`) | Dashboard Jira endpoint |
| `azure-storage-secret` (storage key) | Fallback for Azure Files auth |
| `teams-webhook-secret` | New and stale repository notifications |
| `JFROG_ACCESS_TOKEN` | Cost analyzer |

Two improvements I'd make: drop the storage account key fallback in production now that Workload
Identity works, since a storage key is all-or-nothing access to the share; and set a rotation date on
the GitHub App private keys and the Jira API token, tracked like any other expiring certificate.

## Encryption requirements
{: #encryption-requirements }

- **In transit:** HTTPS at the ingress with SSL redirect; HTTPS to GitHub, JFrog, Azure and Jira APIs;
  Redis over TLS on port 6380 (Azure Cache for Redis); SMB 3 encryption to Azure Files.
- **At rest:** Azure Files and Azure Cache for Redis are encrypted by the platform with
  Microsoft-managed keys; Key Vault holds the secrets.

> **TODO:** Do internal policies require customer-managed keys for storage that holds security
> findings? If so, the storage account needs a CMK configuration.
{: .prompt-warning }

## Network security
{: #network-security }

The dashboard is published on an internal hostname through nginx, and jobs only need outbound HTTPS.
That suggests a simple posture:

- Ingress reachable from the corporate network only, never the internet.
- Kubernetes NetworkPolicies: `cronjobs` pods get egress to the GitHub, JFrog, Azure and Teams
  endpoints and nothing inbound; the dashboard accepts traffic only from the ingress controller and
  talks only to Redis, Azure Files and Jira.
- Storage account and Redis behind private endpoints, not public ones.

> **TODO:** Which of these are in place today (NetworkPolicies, private endpoints for storage and
> Redis)?
{: .prompt-warning }

## Input validation and secure coding
{: #input-validation-and-secure-coding }

The dashboard's main input risk is easy to miss: org and repo names in URLs become **filesystem
paths**. `GET /api/organizations/{org}/repositories/{repo}` reads a file under `/data`, so a value like
`../../` must never reach `open()`. Today the read endpoints build paths straight from the URL
parameters (`Path(storage) / "devops-state" / "repo-analysis" / org / ...`) with no sanitizing; only the
dormant-users upload validates its input. The productivity jobs in the same repo already have a
`path_utils.sanitize_name` helper, but the dashboard doesn't use it. Every endpoint should go through
one helper that also checks the resolved path is still inside the data root:

```python
from pathlib import Path

DATA_ROOT = Path("/data/devops-state").resolve()

def safe_path(*parts: str) -> Path:
    path = DATA_ROOT.joinpath(*parts).resolve()
    if not path.is_relative_to(DATA_ROOT):
        raise HTTPException(status_code=400, detail="invalid path")
    return path
```

Pydantic models validate the Jira request body. The `date=` filter is a plain string today; typing
it as a date in the route signature lets FastAPI reject anything else with a 422.

## Vulnerability and dependency management
{: #vulnerability-and-dependency-management }

The pipeline already scans the project's own code: SonarQube runs per component in CI, and CodeQL
runs on changes and as a weekly full scan every Monday. Dependencies are pinned per component in
`requirements.txt` and in the frontend lockfile, and images use slim Python bases.

The irony to avoid is a dashboard that reports Dependabot alerts across four orgs while carrying its
own. The repo should meet every check it enforces: Dependabot on, secret scanning on, CODEOWNERS,
rulesets. Every CI image build already runs a JFrog Xray scan (`xray_scan: true` in the build job), and the
release workflow sets it again when it publishes; PR previews skip it to stay fast. What's left is agreeing which severities fail the build, and removing the
TLS shortcuts in the Dockerfile (npm `strict-ssl false`, pip `--trusted-host`) that let a tampered
package through at build time.

## Privacy and data-protection requirements
{: #privacy-and-data-protection-requirements }

The privacy rule is short: **only non-PHI data**. The system reads metadata about repositories,
workflows, alerts, packages and spend. It must never copy source content, issue or PR bodies, or
secret values into `/data`, even though the GitHub APIs it calls could return them.

Concretely, every analyzer should follow three rules:

- Store secret scanning results as counts and alert metadata, never the matched secret.
- Store repository descriptions and topics, but nothing from inside files.
- Put the finding in Jira stories created from the dashboard, not data copied from the repo.

> **TODO:** Has each analyzer been checked against these rules, especially the secrets
> sub-analyzer?
{: .prompt-warning }

Personal data is limited to GitHub logins (owners, reviewers, CODEOWNERS entries), which is
employee data and should be treated as internal.

## Audit logging
{: #audit-logging }

For a compliance tool, its own audit trail matters. The minimum I'd want:

- Dashboard access logs at the ingress (who, when, which endpoint), retained per the log policy.
- An application log line for every Jira story created: user, repo, component, story key.
- Kubernetes audit logs and ArgoCD history for every deployment change.
- `metadata.json` in every analyzer output, so any number can be traced to a job version and time.

## Security testing and incident response
{: #security-testing-and-incident-response }

Security testing for the project itself is SonarQube and CodeQL in CI, plus the checks in
[Quality Assurance](/posts/projects/state-of-devops/10-quality-assurance/#security-testing). The incident
most likely to matter is a leaked credential, so the runbook should cover it first:

1. Revoke: regenerate the GitHub App private key (or Jira token) and update Key Vault.
2. Rotate: External Secrets picks up the new value; restart affected CronJobs or the dashboard.
3. Review: check GitHub audit logs for the App's installation activity during the exposure window.
4. Record: note the incident and the evidence for the next audit.

> **TODO:** Who is the security contact for this system, and is it registered in the organization's
> incident response process?
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] Dashboard behind organization SSO; Jira and secret-detail views restricted to a group
- [ ] GitHub Apps have read-only permissions only
- [ ] Storage key fallback removed in production; rotation dates set for App keys and Jira token
- [ ] Every API path built through one sanitizing helper and checked against the data root (not done today)
- [ ] NetworkPolicies and private endpoints in place
- [ ] The repo passes every check the dashboard enforces
- [ ] Non-PHI rule verified: no secret values or file contents in `/data`
- [ ] Credential-leak runbook written and tested once

{% include project-nav.html %}
