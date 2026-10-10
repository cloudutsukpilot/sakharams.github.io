---
layout: post
title: "State of DevOps: Requirements Gathering"
date: 2026-10-05 00:02:00 +0530
categories: [projects, state-of-devops]
tags: [Projects, State of DevOps, Requirements]
description: "What the State of DevOps scorecard must check, how fresh and fast it must be, and the non-PHI and audit rules that shaped the first release."
project: state-of-devops
project_step: 2
image:
  path: /assets/img/projects/state-of-devops/02-requirements-gathering.webp
  alt: "State of DevOps: Requirements Gathering - Projects hero image"
---

The requirements for State of DevOps didn't come from a workshop. They came from the questions people
kept asking the DevOps team: which repos have no CODEOWNERS, which pipelines skip security scans, how
many Dependabot alerts are open, what are we paying JFrog. Each recurring question became a check, and
each check became a requirement with an owner, a schedule and an output file.

<!-- more -->

{% include project-nav.html %}

## Functional requirements
{: #functional-requirements }

The system has two halves: jobs that measure, and a dashboard that shows. The functional requirements
fall out of that split.

| # | The system must… | Delivered by |
|---|---|---|
| F1 | Collect repository metadata for every repo in four orgs, incrementally | `github-data-collector` (ETag-based) |
| F2 | Audit repo hygiene: branching, rulesets, CODEOWNERS, docs, secrets, environments, properties, PR health | `devops-repo-analyzer` sub-analyzers |
| F3 | Audit CI/CD: workflows present, security scanning, coverage uploads | `devops-pipeline-analyzer` |
| F4 | Audit infrastructure as code: Terraform and JFrog usage | `devops-infra-analyzer` |
| F5 | Report GHAS: code scanning, secret scanning, Dependabot | `devops-ghas-analyzer` |
| F6 | Check enterprise-level compliance and security policies | `devops-enterprise-analyzer` |
| F7 | Report cost from GitHub seats, JFrog and Azure | `devops-cost-analyzer` |
| F8 | Compute daily, weekly and monthly trends | `devops-trends-analyzer` |
| F9 | Flag new repos (last 30 days) and stale repos (365 days inactive), and notify Teams | `github-new-repositories`, `github-stale-repositories` |
| F10 | Scan container and package registries weekly, with SBOM lookups | the two registry scanners |
| F11 | Show all of it in a browser, per org and per repo | `devops-state-dashboard` |
| F12 | Turn a finding into a Jira story from the UI | `POST /api/jira/create-story` |

## Non-functional requirements
{: #non-functional-requirements }

The non-functional requirements are modest on purpose. This is an internal reporting tool, not a
transaction system, and over-engineering it would have slowed the solo build down.

- **Freshness:** data no older than one day for daily analyzers, one week for weekly reports. All
  daily jobs finish by about 07:00 UTC, before the working day starts in most of the organization.
- **Speed:** the Home tab must feel instant. That requirement is why `devops-summary-generator` exists:
  the home page reads one pre-computed JSON file instead of scanning every analyzer output.
- **API friendliness:** stay inside GitHub rate limits with retries and backoff (`tenacity`),
  ETag-based incremental collection, and throttling in the registry scanners (for example a 1 s delay
  to respect the 100 requests/minute SBOM limit).
- **Security:** no long-lived credentials in images; secrets from Azure Key Vault via External
  Secrets; GitHub access through per-org GitHub Apps.
- **Portability:** the whole stack runs on a laptop in k3d with the same Helm charts as AKS.
- **Availability:** best effort, business hours. A missed nightly run is annoying, not an incident.

The agreed targets are 99.5% dashboard availability in business hours and today's data ready by
08:00 UTC on 95% of days (the full set is in
[Support and Maintenance](/posts/projects/state-of-devops/16-support-and-maintenance/#service-level-objectives)).
The 99.5% is what sets how far the autoscaling and redundancy work in
[Operations and Observability](/posts/projects/state-of-devops/14-operations-and-observability/#availability-and-performance-targets)
has to go.

## User journeys and use cases
{: #user-journeys-and-use-cases }

Three journeys cover most of the value:

1. **"Are we getting better?"** An executive opens Home, reads the headline numbers, switches to
   Trends, picks *monthly*, and sees whether CODEOWNERS coverage or open alerts moved.
2. **"What's wrong with this org?"** A DevOps engineer opens Repository Analysis, picks an org, sorts
   repos by failing checks, opens a repository detail page, and clicks *Create Jira story* on a
   finding. The story lands in the right backlog with the repo, component and description filled in.
3. **"What can we clean up?"** On Monday morning the Teams channel gets the stale repository report;
   someone opens the Stale Repos tab, filters, and starts the archive conversation with owners.

Journeys like these are a good argument for what the frontend actually does: tabs that map
one-to-one to analyzers, rather than a generic query builder nobody would use.

## Acceptance criteria
{: #acceptance-criteria }

A useful habit for a project shaped like this is one acceptance-criteria template for every
analyzer, so "done" means the same thing for each new job:

```gherkin
Given the analyzer's schedule has passed
When I list /data/devops-state/<domain>/<org>/<YYYY>/<MM>/<DD>/
Then there is one JSON file per expected output and a metadata.json with generated_at
And the dashboard tab for <domain> shows today's date for every org
And a repo with a known gap (test fixture) is reported as failing that check
```

For the dashboard the criteria were behavioural: Home loads from the summary file alone, every tab
handles "no data for today" without crashing, and the Jira button creates exactly one story per click.

## Business rules
{: #business-rules }

The rules that decide pass or fail live in each component's `config.yaml`, not in code, because they
change more often than the code does. Examples:

- A repository is **stale** after 365 days without a push (`pushed_at`), configurable, with an
  alternative mode that uses the default branch's last commit date.
- Repos can be **exempted** from stale checks by name or topic, with wildcards.
- **Forks and archived repos** are excluded from new-repo and registry reports.
- Internal reusable workflow repositories are exempt from package scanning.
- GHAS components (code scanning, secret scanning, Dependabot) can each be switched on or off.
- Cost uses configurable price knobs (seat price per user per month, JFrog storage and transfer rates).

## Reporting and analytics requirements
{: #reporting-and-analytics-requirements }

Reporting is the product, so the requirements were specific:

- Per-org summaries and per-repo detail for repo, pipeline and infra analysis.
- Trends at three resolutions: daily (30 days), weekly (7 weeks), monthly (30 months).
- Filters by date on org repository lists, so you can look at any past day's snapshot.
- Weekly push reports to Microsoft Teams for new and stale repositories.
- New repos available with 7, 15 and 30-day filters (the collector looks back 30 days).

> **TODO:** Do executives get anything pushed to them (a weekly email or a Teams digest of the
> headline numbers), or is it pull-only through the dashboard?
{: .prompt-warning }

## Accessibility and localization requirements
{: #accessibility-and-localization-requirements }

The users are internal and work in English, so localization is out of scope. Dates are stored and
shown in UTC, which is the one localization decision that matters: the jobs, the folder names and the
"today" the dashboard asks for must all agree.

Accessibility deserves an explicit requirement here because charts
come from Recharts, which needs care (colour-blind-safe palettes, labels and a table alternative) to be
usable by everyone. I cover what I'd add in
[User Experience and Design](/posts/projects/state-of-devops/04-user-experience-and-design/#accessibility-design).

> **TODO:** Was accessibility part of the original requirements, or has the dashboard been
> checked with a screen reader or an automated tool?
{: .prompt-warning }

## Regulatory, legal, and compliance requirements
{: #regulatory-legal-and-compliance-requirements }

The organization works under HIPAA and PCI and goes through regular IT audits, so the dashboard has
two compliance jobs: stay compliant itself, and help everyone else prove compliance.

- **Itself:** process only non-PHI data. Repository metadata, pipeline configuration, alert counts and
  spend are not PHI. Source code and issue bodies could contain anything, so the requirement for every
  analyzer is to store findings and counts, never copied content.
- **For others:** checks include organization-specific rules and certification-driven ones such as
  HIPAA-specific checks, and the dated daily outputs double as audit evidence.

> **TODO:** Which specific HIPAA, PCI or SOC controls do the enterprise and repo checks map to? A
> control-to-check table would make this the strongest audit artifact in the project.
{: .prompt-warning }

## Prioritization and release scope
{: #prioritization-and-release-scope }

With one developer, the order of work has to follow value per day of effort. Looking at the
dependencies, the sensible order is:

1. **Collection, repo analysis and the dashboard shell**: everything else reads the collected data,
   and repo hygiene is the most common question.
2. **Pipeline and GHAS analysis**: the next most visible gaps, and the ones security cares about.
3. **Trends and the summary generator**: trends need a few weeks of history before they mean anything.
4. **Cost, enterprise, registry scanners, new and stale reports, Jira integration.**

> **TODO:** Is this the order the analyzers actually shipped in, and what did the first release
> contain on go-live day?
{: .prompt-warning }

A rule worth keeping either way: a new analyzer ships only with a tab that shows its output. Data
nobody can see doesn't change anyone's behaviour.

## Checklist
{: #checklist }

- [ ] Each recurring "can you check…" question mapped to a functional requirement and an analyzer
- [ ] Freshness and Home-page speed targets written down
- [ ] Pass/fail rules live in `config.yaml`, with exemptions documented
- [ ] Acceptance criteria template applied to every analyzer
- [ ] Non-PHI rule reviewed: analyzers store findings and counts, not content
- [ ] Control-to-check mapping for HIPAA and PCI started
- [ ] Release order agreed, with "no analyzer without a tab" as the rule

{% include project-nav.html %}
