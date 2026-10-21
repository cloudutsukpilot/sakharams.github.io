---
layout: post
title: "State of DevOps: Vision and Business Context"
date: 2026-10-05 00:01:00 +0530
categories: [projects, state-of-devops]
tags: [Projects, State of DevOps, Vision, Business]
description: "Why State of DevOps exists: replacing status-meeting opinions about DevOps best practices with daily numbers across four GitHub organizations."
project: state-of-devops
project_step: 1
image:
  path: /assets/img/projects/state-of-devops/01-vision-and-business-context.webp
  alt: "State of DevOps: Vision and Business Context - Projects hero image"
---

"How many of our repositories have branch protection?" For a long time the honest answer was "most of
them, I think." Progress on DevOps best practices was reported by people, in meetings, from memory, and
only the DevOps team could see the data that would settle the question. State of DevOps is the project I
built to make that answer a number that anyone can look up, and that goes up when we do the work.

<!-- more -->

{% include project-nav.html %}

## Business problem and opportunity
{: #business-problem-and-opportunity }

Across four GitHub organizations and the enterprise account, nobody had a single view of repo hygiene,
pipeline coverage, GitHub Advanced Security (GHAS) findings or platform cost. The raw data existed, but
it was spread across GitHub settings pages, security tabs, JFrog and Azure billing, and only the
DevOps team had the access to look at all of it.

So best-practice adoption was tracked the way most organizations track it: someone asked in a meeting,
someone else gave an update. Updates like "we're rolling out CODEOWNERS" are not wrong, but you can't
chart them, compare them month to month, or show them to an auditor.

The opportunity was bigger than a dashboard. If the state of every repository can be measured
automatically every day, then:

- progress becomes visible, and people can see the numbers climb after a push;
- gaps become a ranked list instead of a feeling;
- audit evidence for HIPAA, PCI and internal IT audits comes from a daily snapshot instead of a
  scramble the week before.

## Goals, objectives, and expected outcomes
{: #goals-objectives-and-expected-outcomes }

The goal I set was simple: **measure, don't ask.** Every best practice that can be checked through an
API should be checked by a job, not reported by a person.

| Objective | Outcome I expected |
|---|---|
| Daily, automated audit of repos, pipelines, IaC, GHAS and cost | No more manual status collection for these areas |
| One place anyone in the organization can look | Fewer "can you send me the numbers" requests to the DevOps team |
| History, not just a snapshot | Daily, weekly and monthly trends that show whether initiatives work |
| A path from finding to fix | Create a Jira story straight from a finding in the dashboard |
| A foundation for an enterprise scorecard | The same pattern reused for other teams' best practices |

That last row matters most long term. State of DevOps is deliberately the **first part** of a larger,
enterprise-wide effort: map the best practices of SRE, CloudOps, platform architecture, database and
other teams against the actual infrastructure, and derive one health score and progress card covering
best practices, security and compliance. I kept that in mind when choosing a design that adds a new
domain by adding a cronjob, not by rewriting the dashboard (see
[Technical Architecture](/posts/projects/state-of-devops/05-technical-architecture/#system-context-and-component-architecture)).

## Stakeholders, sponsors, and decision-makers
{: #stakeholders-sponsors-and-decision-makers }

The dashboard is open to everyone in the organization, but its real audience is the people who decide
where engineering effort goes: stakeholders and C-level executives who want to know whether the
organization is getting healthier, and where it isn't.

| Role | What they need from it |
|---|---|
| Executive sponsor (VP of Platform Engineering) / C-level | One page that says "better or worse than last month", plus audit readiness |
| Engineering and DevOps leadership | Which orgs and teams are behind, and on what |
| DevOps team (owners) | A working backlog of gaps, and proof that their rollouts landed |
| Security | GHAS coverage and open findings across orgs |
| Repository owners | What's wrong with *their* repo and how to fix it |

The executive sponsor is the **VP of Platform Engineering**, which fits: the enterprise scorecard
phase spans every platform team, not just DevOps.

> **TODO:** Who approves changes to what the scorecard measures (new checks, thresholds, exemptions)?
> Naming the decision-maker matters once scores start influencing priorities.
{: .prompt-warning }

## Target users and personas
{: #target-users-and-personas }

Three personas cover almost every visit:

- **The executive (weekly, 2 minutes).** Opens the Home tab, looks at the headline numbers and the
  trend lines, closes it. Needs it to load instantly, which is why the home page reads one
  pre-computed file (more in [Data and Integration](/posts/projects/state-of-devops/07-data-and-integration/)).
- **The DevOps engineer (daily, 20 minutes).** Drills from an org into a repository, checks a
  sub-analyzer's output, raises a Jira story, and checks the stale and new repository reports.
- **The repository owner (occasionally).** Arrives from a link or a Jira story, wants to see one
  repository's findings and what "good" looks like.

The executive persona is the one to design for first. If the first screen is slow or needs
explaining, the dashboard loses the audience that funds the follow-up work.

## Success metrics and business KPIs
{: #success-metrics-and-business-kpis }

The dashboard itself produces the metrics, so the KPIs are the trends of what the analyzers measure:

| Area | Example KPI the analyzers can produce |
|---|---|
| Repo hygiene | % of repos with branch protection / rulesets, CODEOWNERS, README and docs |
| Lifecycle | Number of stale repos (no push in 365 days), new repos per week |
| Pipelines | % of repos with CI, with security scanning, with coverage reporting |
| Security | Open code scanning, secret scanning and Dependabot alerts per org |
| Cost | GitHub seats, JFrog storage and transfer, Azure spend, month over month |
| Adoption of the tool | Dashboard visits, Jira stories created from findings |

> **TODO:** Which of these are the official KPIs, what were their baselines when the dashboard went
> live, and what targets were agreed? Numbers like "stale repos down from X to Y" are the strongest
> story this project has.
{: .prompt-warning }

## Scope, assumptions, constraints, and dependencies
{: #scope-assumptions-constraints-and-dependencies }

**In scope:** four GitHub organizations plus the enterprise account; repository, pipeline, IaC, GHAS,
enterprise-compliance and cost analysis; container and package registry scans; new and stale
repository reports; a read-only dashboard with Jira story creation.

**Out of scope (for this phase):** fixing findings automatically, and the other teams' best practices,
which belong to the enterprise scorecard phase.

**Constraints:**

- Only **non-PHI** data. The system reads metadata about repositories, pipelines and spend; it never
  needs patient data, and the design keeps it that way.
- Checks include organization-specific rules and certification-driven checks such as HIPAA-specific
  ones, so the rules have to be configurable rather than hard-coded.
- GitHub API rate limits shape the schedule and the data collection design.

**Assumptions and dependencies:** GitHub Apps installed on every org; JFrog and Azure Cost Management
APIs reachable; an AKS cluster with Azure Files, External Secrets Operator and ArgoCD already provided
by the platform.

## Checklist
{: #checklist }

- [ ] Problem statement agreed: "best-practice progress is reported, not measured"
- [ ] Executive sponsor and scorecard owner named
- [ ] Personas confirmed with at least one real executive and one repo owner
- [ ] Official KPIs chosen, with baselines captured on go-live day
- [ ] Non-PHI data rule written down and reviewed by security
- [ ] Scope boundary with the future enterprise scorecard documented
- [ ] Dependencies (GitHub Apps, JFrog, Azure Cost, AKS platform services) confirmed with their owners

{% include project-nav.html %}
