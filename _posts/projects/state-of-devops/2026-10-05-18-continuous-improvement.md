---
layout: post
title: "State of DevOps: Continuous Improvement"
date: 2026-10-05 00:18:00 +0530
categories: [projects, state-of-devops]
tags: [Projects, State of DevOps, Improvement]
description: "Improving State of DevOps: lessons from centralizing collection, dependency-based scheduling, leaving Create React App, and growing into an enterprise health scorecard."
project: state-of-devops
project_step: 18
image:
  path: /assets/img/projects/state-of-devops/18-continuous-improvement.webp
  alt: "State of DevOps: Continuous Improvement - Projects hero image"
---

The best change made to State of DevOps after it went live wasn't a feature. Every cronjob used to
collect its own GitHub data, much of it the same; moving that into one central collector removed the
duplication, cut API calls and made every job simpler. That's the pattern I'd want for the project's
future too: look at what's repeated, centralize it, and let the specialized parts stay small. This last
post is about how the project keeps learning, and where it goes next.

<!-- more -->

{% include project-nav.html %}

## Product analytics
{: #product-analytics }

A tool that measures adoption should measure its own. The questions worth answering:

- How many people open the dashboard each week, and from which roles?
- Which tabs are used, and which never are (candidates to hide or merge)?
- How many Jira stories are created from findings, and how many of those get closed?

The third is the real product metric. Visits show interest; **closed remediation stories show impact**.
Ingress logs give visits per path without adding a tracking script, and the Jira integration already
knows which stories it created.

> **TODO:** Are dashboard visits or Jira stories created from the dashboard tracked today?
{: .prompt-warning }

## User feedback
{: #user-feedback }

Feedback channels should be where the users already are:

- A "Report a wrong number" link on every repo detail page, opening a Jira issue pre-filled with the
  repo, check and date. Wrong-number reports are the most valuable feedback this tool can get.
- The DevOps Teams channel for questions, where the weekly reports already land.
- A short question in the quarterly scorecard review: "which number do you look at, and which do you
  ignore?"

## Retrospectives
{: #retrospectives }

The project's own retrospective so far, as I'd write it:

| Went well | Would change | Try next |
|---|---|---|
| Files on a share: simple, debuggable, cheap | Shared collection should have been the first job, not a refactor | Dependency-based scheduling |
| One folder shape per job; everything is a task | Docs drifted (CRA vs Vite) | Docs reviewed in the same PR as code |
| Build once, re-tag to release | One dashboard replica for too long | HPA with min 2 |
| Pre-computed Home page | Jobs ordered by clock, not dependency | Completion markers per job |

With the DevOps team contributing, retrospectives every few iterations keep this table honest.

## Reliability reviews
{: #reliability-reviews }

Once a month, look at the SLOs from
[Support and Maintenance](/posts/projects/state-of-devops/16-support-and-maintenance/#service-level-objectives):
days data was late, job failures by cause, dashboard availability, wrong-number reports. Any cause that
appears twice gets a design fix rather than another re-run. The usual suspects for a system like this
are rate limits, the clock-based schedule, and a GitHub API change.

## Cost optimization
{: #cost-optimization }

The stack is already cheap; the main levers are:

- **Storage growth**: prune raw daily outputs past the audit retention period and keep trends forever.
- **Job right-sizing**: analyzers request `200m / 512Mi`; actual usage per run from metrics may allow
  smaller requests, or need bigger ones as orgs grow.
- **API efficiency**: more reads from the central cache, more GraphQL bulk queries, fewer live calls.

The cost analyzer already reports organization spend on GitHub, JFrog and Azure; the project's own line
should be visible there too, so its cost is as transparent as everything it measures.

## Security reviews
{: #security-reviews }

A yearly security review of the project itself should revisit the threat model in
[Security and Privacy](/posts/projects/state-of-devops/06-security-and-privacy/#threat-modeling), with
special attention to three things that change over time: GitHub App permissions (scope creep is easy
when adding a new check), who can see secret-scanning detail, and whether any analyzer has started
storing content rather than counts.

## Architecture reviews
{: #architecture-reviews }

The architecture changes I'd put on the table, in order:

1. **Dependency-based scheduling.** Today jobs are ordered by clock: the trends analyzer and repo
   analyzer both start at 05:00, and the summary generator assumes everything finished by 07:00. Each
   job writing a completion marker, and dependants waiting for it (or a small orchestrator such as Argo
   Workflows triggering the chain after the collector), turns an implicit order into an explicit one.
2. **Dashboard high availability.** The HPA and PDB design in
   [Operations and Observability](/posts/projects/state-of-devops/14-operations-and-observability/#capacity-and-cost-monitoring),
   minimum two replicas.
3. **Frontend build tooling.** Create React App is no longer maintained; moving to Vite is mostly
   configuration (entry point, env variable prefix, proxy) for an app of this size, and the dev-server
   proxy can point at `127.0.0.1` while at it.
4. **Typed file contracts.** Shared Pydantic models for every output, used by writers and readers.
5. **A generic analyzer interface** for the enterprise phase, so SRE, CloudOps, platform architecture
   and database checks plug in the same way.

## Roadmap refinement
{: #roadmap-refinement }

The roadmap's next horizon is the reason this project exists in its current shape: the **enterprise
health scorecard**. The plan is to map the best practices of other teams (SRE, CloudOps, platform
architecture, database and more) against the actual infrastructure and derive a score and progress card
for the health of the enterprise infrastructure, covering best practices, security and compliance. It
would help identify gaps, prioritize improvements, and keep adoption consistent enough to stand up in IT
audits and under HIPAA and PCI.

What State of DevOps teaches that phase:

- Start with checks people already argue about; they get attention.
- Centralize collection before multiplying analyzers.
- Show a trend, not a grade; a single score is useful for executives only if it can be broken down to
  the check that moved it.
- Every check needs a fix link and a Jira path, or it's just a list of complaints.

> **TODO:** Which team's best practices will the enterprise scorecard onboard first, and who owns the
> scoring model?
{: .prompt-warning }

## Decommissioning and end-of-life planning
{: #decommissioning-and-end-of-life-planning }

The most likely end of life for State of DevOps isn't shutdown, it's **absorption** into the enterprise
scorecard. Planning for that now is cheap:

- Keep the data layout documented and stable, so the scorecard can read years of DevOps history instead
  of starting from zero.
- Keep analyzers independent, so they can move one by one.
- When the dashboard is retired, keep the share snapshots for the audit retention period, export the
  trend series, revoke the GitHub Apps on every org, delete the Key Vault secrets, and remove the
  ArgoCD apps and the DNS name.

The trend history is the asset. Whatever replaces the dashboard should inherit it.

## Checklist
{: #checklist }

- [ ] Track visits per tab and Jira stories created and closed from findings
- [ ] "Report a wrong number" link on every repo page
- [ ] Retrospective table updated every few iterations
- [ ] Monthly reliability review; repeated causes get design fixes
- [ ] Storage pruning and job right-sizing reviewed
- [ ] Yearly security review of App permissions and stored content
- [ ] Dependency-based scheduling, HA dashboard and Vite migration on the roadmap
- [ ] Data layout kept stable for the enterprise scorecard to inherit

{% include project-nav.html %}
