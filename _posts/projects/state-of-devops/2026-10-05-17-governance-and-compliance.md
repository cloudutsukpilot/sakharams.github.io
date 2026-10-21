---
layout: post
title: "State of DevOps: Governance and Compliance"
date: 2026-10-05 00:17:00 +0530
categories: [projects, state-of-devops]
tags: [Projects, State of DevOps, Governance, Compliance]
description: "State of DevOps as a compliance tool: dated daily evidence for HIPAA, PCI and IT audits, policy checks across orgs, and the governance of what gets measured."
project: state-of-devops
project_step: 17
image:
  path: /assets/img/projects/state-of-devops/17-governance-and-compliance.webp
  alt: "State of DevOps: Governance and Compliance - Projects hero image"
---

State of DevOps has a double role in governance. It's a system that has to be governed like any other,
and it's also one of the organization's governance tools: every night it checks repositories against
policy and writes down the result with a date. For a healthcare organization that answers to HIPAA, PCI
and regular IT audits, that dated record may be the most valuable thing the project produces.

<!-- more -->

{% include project-nav.html %}

## Project governance
{: #project-governance }

Governance should match the size of the thing being governed. For this project, three forums are
enough:

| Forum | Cadence | Decides |
|---|---|---|
| DevOps team iteration review | Every 2 weeks | Backlog order, releases, tech debt |
| Scorecard review with stakeholders | Monthly or quarterly | What's measured, thresholds, targets |
| Executive sponsor (VP of Platform Engineering) check-in | Quarterly | Roadmap, the enterprise scorecard phase, funding |

The second forum is the one that matters. Changing what's measured changes the numbers executives
watch, so it shouldn't happen in a PR with one reviewer.

> **TODO:** Which of these forums exist today, and who sits in the scorecard review?
{: .prompt-warning }

## Decision-making and approval authorities
{: #decision-making-and-approval-authorities }

| Decision | Who approves |
|---|---|
| Code change to a component | A code owner (CODEOWNERS), CI green |
| Release to dev | Merging the `versions.yaml` bump PR |
| Release to production | Reviewer on the `production` environment, then the promotion PR |
| New check, changed threshold, new exemption | Scorecard review (plus the domain owner, e.g. security for GHAS) |
| New org or new team's best practices (enterprise phase) | Executive sponsor (VP of Platform Engineering) |
| Access to restricted views (secret scanning detail) | Security |

The technical approvals already exist in the pipeline (see
[CI/CD](/posts/projects/state-of-devops/12-cicd-and-release-management/#approval-gates)); the
measurement approvals are the ones to formalize.

## Audit requirements
{: #audit-requirements }

Auditors usually ask for evidence that controls operated **over a period**, not just that they exist
today. The project is built to answer exactly that:

- Outputs are stored per day under `{org}/{YYYY}/{MM}/{DD}/`, so "show me branch protection status for
  repo X on 15 March" is a file path.
- Each output has a `metadata.json` with the job version and `generated_at`, which shows how the
  evidence was produced.
- History is kept indefinitely for the daily analyzers.

What an auditor will also ask is how the evidence is protected from change. Both the jobs and the
dashboard mount the share read-write today; a read-only dashboard mount and immutable snapshots of the
share, kept for the audit period, close that gap.

## Access reviews
{: #access-reviews }

Quarterly, review who and what can reach this system:

- **GitHub Apps:** permissions on each org (should be read-only), and which repos they're installed on.
- **Key Vault:** who can read the GitHub App private keys and the Jira token.
- **Kubernetes RBAC:** who can `exec` into pods or create Jobs in `cronjobs` and `state-of-devops`.
- **Dashboard:** members of the group allowed to create Jira stories and view secret-scanning detail.
- **Repository:** admins and code owners of the repo itself, and the apps repo ArgoCD watches.

The org-level access-review checks the analyzers already do for other repos (rulesets, CODEOWNERS,
environments) apply to this repo too.

## License management
{: #license-management }

Two sides:

- **Its own dependencies:** FastAPI, React, Recharts, Redis client, Azure SDKs and the rest are
  permissive (MIT, BSD, Apache 2.0). A license check in CI (for example `pip-licenses` and
  `license-checker` for npm) keeps it that way.
- **For the organization:** the package registry scanner already looks up SBOMs for packages across
  orgs. Licenses are in the SBOM, so a license-policy view (copyleft in internal packages, unknown
  licenses) is a natural next check.

## Compliance reporting
{: #compliance-reporting }

The dashboard has a Compliance tab backed by `/api/compliance/**` and the enterprise analyzer, which
checks enterprise-level compliance and security policies across the four orgs. Combined with the repo,
pipeline and GHAS analyzers, it covers the questions compliance teams ask most:

| Question | Source |
|---|---|
| Are default branches protected and changes reviewed? | Repo analyzer: branching, rulesets, PR health |
| Is code scanned for vulnerabilities and secrets? | GHAS analyzer, pipeline analyzer (security) |
| Are vulnerable dependencies tracked? | GHAS analyzer (Dependabot) |
| Does every repo have an owner? | Repo analyzer: CODEOWNERS |
| Are inactive assets cleaned up? | Stale repository report |

The checks include organization-specific rules and certification-driven ones such as HIPAA-specific
checks. A mapping from each check to the control it supports (HIPAA Security Rule safeguards, PCI DSS
requirements, internal IT controls) turns the Compliance tab into an audit artefact.

> **TODO:** Which HIPAA and PCI controls do the current checks map to? Even a partial table here would
> be the most useful thing to show auditors.
{: .prompt-warning }

## Data governance
{: #data-governance }

The data rules, in one place:

- **Non-PHI only.** Repository, pipeline, security-alert and cost metadata; never file contents, issue
  bodies or secret values.
- **Classification.** GHAS, enterprise and cost outputs are confidential; the rest internal
  ([Data and Integration](/posts/projects/state-of-devops/07-data-and-integration/#data-ownership-and-classification)).
- **One writer per folder.** Each domain's data has exactly one owning job.
- **Retention.** Daily outputs as long as audits need them; weekly reports 90 days.

## Vendor and third-party management
{: #vendor-and-third-party-management }

| Vendor | Used for | Data shared |
|---|---|---|
| GitHub (Enterprise) | Source of most data; GitHub Apps | Read access to org metadata |
| JFrog | Image and chart registry; cost data | Images; usage metrics read |
| Microsoft Azure | AKS, Files, Redis, Key Vault, Cost Management | Everything the system stores |
| Microsoft Teams | Weekly report notifications | Repo names in messages |
| Atlassian Jira | Stories from findings | Finding text |

All are platforms the organization already uses, so the project shouldn't need new vendor
onboarding. The only data that leaves
the organization's own tenants is what these platforms already hold.

## Policy enforcement
{: #policy-enforcement }

State of DevOps **detects** policy gaps; it doesn't enforce. That's deliberate for a first phase:
showing a gap and creating a Jira story is uncontroversial, while blocking someone's merge is not.
Enforcement belongs to GitHub itself, which the dashboard makes measurable:

- organization rulesets for branch protection, instead of per-repo settings;
- required workflows for security scanning;
- secret scanning push protection.

The dashboard then shows whether enforcement is working, which is the right division of labour.

## Evidence collection
{: #evidence-collection }

For an audit, evidence collection becomes a script rather than a scramble:

```bash
# Evidence pack: repo, pipeline and GHAS results for every org on the audit sample dates
for d in 2026/03/15 2026/06/15 2026/09/15; do
  for domain in repo-analysis pipeline-analysis ghas-analysis enterprise; do
    tar -rf evidence.tar /data/devops-state/$domain/*/$d
  done
done
sha256sum evidence.tar > evidence.tar.sha256
```

The files carry their own `metadata.json`, and the checksum shows nothing changed after collection.
Wrapped as a task, this replaces days of screenshots.

## Checklist
{: #checklist }

- [ ] Scorecard review forum set up for changes to what's measured
- [ ] Approval authorities documented, including measurement changes
- [ ] Immutable share snapshots kept for the audit period
- [ ] Quarterly access review of Apps, Key Vault, RBAC, dashboard group and repo admins
- [ ] License check in CI; license policy view planned from SBOM data
- [ ] Check-to-control mapping for HIPAA and PCI
- [ ] Evidence-pack task with checksums

{% include project-nav.html %}
