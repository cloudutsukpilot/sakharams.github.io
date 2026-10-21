---
layout: post
title: "Y-IaC: Support and Maintenance"
date: 2026-10-05 00:16:00 +0530
categories: [projects, y-iac]
tags: [Projects, Y-IaC, Support, Maintenance]
description: "Supporting Y-IaC: tiered ownership between consumers and platform, triage by blast radius, provider and tool upgrades, and backup and DR drills for state."
project: y-iac
project_step: 16
image:
  path: /assets/img/projects/y-iac/16-support-and-maintenance.webp
  alt: "Y-IaC: Support and Maintenance - Projects hero image"
---

Keeping Y-IaC running is mostly keeping up. It has 175 modules on 20 provider pins, plus Terraform,
Terragrunt, TFLint, Wiz CLI, Python and a dozen GitHub Actions, and every one of them releases on its own
schedule. Support has a twist as well. Many problems reported against the platform are really YAML
problems, and the ones that really are platform problems tend to hit many consumers at once. This post
sets out who does what, and the cadence that keeps the platform current.

<!-- more -->

{% include project-nav.html %}

## Support model and ownership
{: #support-model-and-ownership }

| Tier | Who | Handles |
|---|---|---|
| 0 | The CLI itself | Error report with a catalog match and a suggested fix |
| 1 | Consumer team | YAML mistakes, their own credentials, their own drift |
| 2 | Platform maintainers | Shared-path bugs, module defects, workflow failures, releases |
| 3 | Cloud, network, identity owners | Subscriptions, quotas, private networking, RBAC |
| Security | Security team | Blocked gates, exceptions, findings |

Tier 0 is the cheapest support there is, and the error catalog is how it grows. After-hours support is
consumer-owned for workloads; the platform team only needs out-of-hours cover if a release can break
production applies, which pinned tags prevent.

The DevOps team owns platform support and on-call. Business-hours cover is enough while production
consumers pin release tags, because a new release can't reach them unannounced.

## Service-level objectives
{: #service-level-objectives }

Response and restoration targets for what the platform team owns (proposals, to be agreed):

| Issue | First response | Restore or workaround |
|---|---|---|
| Shared CLI failure blocking many consumers | 1 hour | Pin-back ref within 1 hour |
| Workflow failure in the shared path | 4 working hours | 1 working day |
| State access problem caused by platform config | 4 working hours | 1 working day |
| Critical security finding in platform code | 1 working day | Per [security remediation](#security-remediation) |
| Module defect, one consumer affected | 1 working day | Next patch release |

These sit alongside the platform SLIs in
[Operations](/posts/projects/y-iac/14-operations-and-observability/#availability-and-performance-targets).

## Incident response
{: #incident-response }

The platform-specific incident is "a release broke consumers". The response, in order:

1. **Contain.** Announce the last good ref; consumers pin it. Consumers on tags are already safe.
2. **Assess.** List applies that ran on the bad ref (workflow history by ref) and check their plans for
   unexpected changes.
3. **Fix.** Revert in Y-IaC, or patch forward with a test that reproduces the problem.
4. **Recover.** For any unintended change that was applied, revert by YAML and apply, or restore state.
5. **Learn.** Post-incident review within a week; the result is a test, a validation rule or a catalog
   entry.

## Bug triage
{: #bug-triage }

Triage on three axes: severity, affected provider or module, and **blast radius** (how many consumers).

| Blast radius | Typical cause | Priority |
|---|---|---|
| All consumers | `root.hcl`, bootstrap, CLI core, workflow template | Top |
| All users of a provider | Provider block, provider version, credential resolution | High |
| Users of one module | Module or unit template | Normal |
| One consumer | Their YAML or config | Consumer's own queue, with help |

First question in every triage: can it be reproduced in a scratch consumer with the same YAML? If yes,
it's ours. If it only happens in their subscription, it's often permissions, quota or policy.

## Patch and upgrade management
{: #patch-and-upgrade-management }

The upgrade cadence I'd run:

| Component | Pinned in | Cadence |
|---|---|---|
| Terraform providers | `config/providers.yaml` (20 entries) | Monthly review; majors as their own release |
| Terraform | Compatibility workflow (1.13.2), `required_version >= 1.9.8` | Quarterly |
| Terragrunt | Compatibility workflow (0.83.2), `setup-environment` | Quarterly; read release notes for `stack` changes |
| TFLint, kubelogin, Wiz CLI | `setup-environment` | Quarterly; pin Wiz instead of latest |
| Python | 3.12 target | Annual, with the next minor tested in CI first |

Every bump goes through the compatibility workflow. A provider major (the pin is now azurerm 5.0.0, while
`root.hcl`'s fallback still says 4.57.0, which is worth aligning) also gets a migration note per affected module, and consumers that can't move yet use
`override_versions`.

## Dependency updates
{: #dependency-updates }

Automate the noticing, not the merging. Dependabot (or Renovate) on the Y-IaC repo for Python packages and
GitHub Actions, with weekly grouped PRs. Provider and tool versions can be watched by Renovate's custom
managers for `providers.yaml`. Every update PR still goes through tests and, for providers, a
compatibility run, because "minor" provider releases do change plan output.

## Security remediation
{: #security-remediation }

| Severity | Remediation target (proposal) | Exception |
|---|---|---|
| Critical | 7 days | Security approval, 30-day maximum |
| High | 30 days | Security approval, 90-day maximum |
| Medium | 90 days | Platform owner |
| Low | Backlog | n/a |

Every exception has a scope, owner, justification, compensating control and expiry date. An expired
exception without renewal is treated as a new finding. That applies both to findings in Y-IaC's own code
and to findings the gates raise against consumer plans.

## Performance optimization
{: #performance-optimization }

Where time goes in a run, and the levers:

- **Python start-up and bootstrap:** the content hash skips the sync when nothing changed.
- **Provider downloads:** the plugin cache; cache it across runs on self-hosted runners.
- **Plan time:** dependency waves run in parallel; avoid giant stacks by splitting by lifecycle.
- **CI wall-clock:** change detection plans only changed stacks.
- **Drift scan:** the heaviest job; stagger consumers if API throttling appears.

Measure first, with the numbers from [Performance testing](/posts/projects/y-iac/10-quality-assurance/#performance-and-load-testing).

## Backup verification
{: #backup-verification }

Backups that haven't been restored are hopes. Monthly, pick one consumer and one unit at random:

1. Confirm versioning is on for its backend.
2. Download the previous version of the unit's state.
3. Restore it into a scratch backend and run a plan against it.
4. Record the result and time taken.

The DevOps team owns the state storage accounts and runs the monthly check. Versioning is already on in
Azure Blob storage, and a restore has been rehearsed.

## Disaster recovery testing
{: #disaster-recovery-testing }

DR scenarios worth exercising once a year:

| Scenario | Exercise |
|---|---|
| State container deleted | Restore from soft delete or versioning; plan clean |
| Y-IaC repo unavailable | Consumers run from a mirror or the last synced copy; how long until blocked? |
| CI credentials revoked | Rotate or re-federate; time to first successful plan |
| Region outage for state storage | GRS or cross-region replica; re-point the backend |

The second one is interesting: consumers carry a synced copy of the shared module, so local runs keep
working for a while without the upstream repo. CI does not, because it checks out by ref.

## Technical debt management
{: #technical-debt-management }

The debt list lives in [Implementation](/posts/projects/y-iac/09-implementation/#technical-debt-tracking).
Maintenance is where it gets paid: the 20% of each iteration, plus a deprecation rule for modules and
interfaces. Deprecate with a CHANGELOG notice and a warning printed by the CLI for at least two releases,
then remove in a major version. Unused modules (no consumer `resources.yaml` references them) are the
first candidates.

## Checklist
{: #checklist }

- [ ] Support tiers and contacts are published
- [ ] SLO proposals are agreed or replaced
- [ ] A bad-release incident runbook exists
- [ ] Dependabot or Renovate covers Python, Actions and provider pins
- [ ] Remediation targets and exception rules are approved by security
- [ ] Monthly state restore check is scheduled with an owner
- [ ] Annual DR exercise is on the calendar
- [ ] A deprecation policy (two releases of warnings) is written

{% include project-nav.html %}
