---
layout: post
title: "Y-IaC: Operations and Observability"
date: 2026-10-05 00:14:00 +0530
categories: [projects, y-iac]
tags: [Projects, Y-IaC, Observability, Operations]
description: "Operating Y-IaC: watching platform health separately from workload health, logs and retention, drift as the main signal, SLO proposals and runbooks."
project: y-iac
project_step: 14
image:
  path: /assets/img/projects/y-iac/14-operations-and-observability.webp
  alt: "Y-IaC: Operations and Observability - Projects hero image"
---

When Y-IaC is healthy, nobody notices it. When it isn't, the first symptom is a consumer's plan failing,
and the first question is always the same: is this my YAML, my cloud, or the platform? Operations for
Y-IaC is about answering that question fast, which means watching the platform separately from the
workloads it builds. The drift loop does most of the watching today.

<!-- more -->

{% include project-nav.html %}

## Application and infrastructure monitoring
{: #application-and-infrastructure-monitoring }

Two layers, deliberately kept apart:

| Layer | Signals | Owner |
|---|---|---|
| Platform health | Workflow success rate, duration, queue time, cancellations, failure category; gate outcomes; compatibility results; lock errors; backend availability | Platform team |
| Workload health | Resource metrics, diagnostic logs, alerts on the infrastructure the modules created | Consumer team |

A spike in failed plans across five consumers on the same day is a platform signal. One consumer's
failing plan after a portal change is a workload signal. The failure category is what tells them apart,
which is why the error catalog matters operationally, not just for support.

Not centrally yet: each failure surfaces in the consumer that hit it, and the DevOps team sees it there.
Collecting workflow run data from the GitHub API is the first step toward the dashboard below.

## Logging and log retention
{: #logging-and-log-retention }

What's logged and where:

- **CLI logs** through `core/logging_config.py`, to the console and the workflow log.
- **Terragrunt output**, streamed through the log processor (`reporting/log_processor.py`), which
  shortens timestamps, abbreviates unit names (`[.terragrunt-stack/azurerm_windows_virtual_machine]`
  becomes `[azwvm]`) and prefixes, so a 30-unit stack log stays readable.
- **Workflow logs** in GitHub Actions, kept for the repository's log retention setting.
- **Reports** (summary, error report, final report) as job summaries and artifacts.

Two rules: never print credentials or sensitive provider attributes (the redaction module handles plan
JSON; the CLI must not echo `ARM_*` values), and set log retention to match the evidence decision from
[Security and Privacy](/posts/projects/y-iac/06-security-and-privacy/#audit-logging).

## Metrics and dashboards
{: #metrics-and-dashboards }

The dashboard I'd build first, from GitHub Actions run data across consumers:

| Panel | Metric |
|---|---|
| Plan success rate | Successful / total plan jobs per day, per consumer |
| Apply success rate | Same for apply jobs |
| Plan-after-apply clean rate | Runs with zero changes after apply |
| Failure categories | Count by error catalog entry (auth, lock, provider, YAML, gate) |
| Gate outcomes | Pass, advisory finding, blocked, overridden |
| Drift | Stacks with drift, tickets open, ticket age |
| Duration | p50 and p95 plan time per changed stack |
| Adoption | Consumers per Y-IaC ref (how many are on the latest release) |

Grafana is already a Y-IaC provider target, so the dashboard itself can be declared as code in a
consumer.

## Distributed tracing
{: #distributed-tracing }

There's no request path to trace; a run is one process tree on one runner. The closest equivalent is
correlation: every run already exports Git runtime metadata (`reporting/git_info.py`), and the summary
links the commit, the run and the artifacts. I'd add one run ID that appears in the CLI banner, the
Terragrunt log prefix, the plan summary, the Jira comment and the Teams message, so one search finds
everything about a run. Full OpenTelemetry tracing would be overkill here.

## Health checks
{: #health-checks }

The platform's health checks are pre-flight checks the CLI already runs before any Terraform call:
Terragrunt installed and reporting a version, credentials resolvable for the backend and the target
subscription, the stack folder present, a backend entry found. A scheduled "canary" run would turn these
into a health signal: plan one tiny stack in each cloud every day, against the latest release, and alert
if it fails. `infra-aws`'s hello-world stack is a ready-made canary for AWS.

## Alerting and escalation
{: #alerting-and-escalation }

Drift is the main alert today, and it's a loop rather than a one-off notification. Step through it:

{% include flow-anim.html id="projects/y-iac/drift-loop" %}

Two details worth knowing. The consumer template's comment says "Daily drift detection", but the cron is
`0 6 * * 0`, which is **weekly, Sundays at 06:00 UTC**. One of them should change. And the Jira
integration keeps one ticket per repository, adds comments rather than duplicates, and uses a
fingerprint to stay quiet when drift hasn't changed, which keeps alert fatigue down.

Escalation path I'd propose:

| Signal | First responder | Escalate to |
|---|---|---|
| Drift ticket | Consumer owner | Platform if the cause is a module or provider |
| Failed plan in one consumer | Consumer owner | Platform if the error is in the shared path |
| Failed plans across consumers | Platform maintainer | Platform owner; announce a pin-back ref |
| Gate blocked | Change author | Security for an exception |

## Availability and performance targets
{: #availability-and-performance-targets }

Classic availability doesn't fit a CLI. These are the targets that do, as proposals:

| SLI | Proposed SLO |
|---|---|
| Plans failing because of the platform (not YAML or cloud) | Under 2% of plan runs per month |
| Time to a pin-back ref after a bad release | Under 1 hour |
| Plan-after-apply clean rate | 99% |
| Drift ticket age (median) | Under 10 working days |
| p95 plan time for a single-stack change | Agreed per largest stack |

These are my proposed starting targets for the DevOps team; review them after one quarter of real data.

## Operational runbooks
{: #operational-runbooks }

The runbooks operators need most, with what exists:

| Situation | Starting point |
|---|---|
| State lock stuck | `docs/features/auto-release-state-lock.md`; `--auto-release-lock` with an age guard |
| Backend config missing | The `root.hcl` error message lists the four fixes |
| Wrong subscription or missing credentials | `docs/features/provider-credential-resolution.md` |
| Provider lookup or dependency mock errors | `.github/skills/diagnose-terragrunt-failure/` and the troubleshoot prompt |
| Terragrunt errors in general | `docs/troubleshooting/terragrunt.md` |
| Drift ticket | Revert by apply, or adopt by PR |
| Import an existing resource | `docs/importing_resources.md` |

What's missing is a runbook for the platform's own incidents: a bad release reaching consumers.

## Incident and problem management
{: #incident-and-problem-management }

Severity for platform incidents:

| Sev | Example | Response |
|---|---|---|
| 1 | A release causes destructive plans or blocks all applies | Announce pin-back ref immediately; revert; review applies since the release |
| 2 | Plans fail for many consumers; no destructive effect | Pin-back or hotfix within the day |
| 3 | One provider family or module broken | Fix in the next patch release |
| 4 | Cosmetic, docs | Backlog |

Problem management means the recurring causes: each recurring failure becomes an error catalog entry, a
validation rule, or a test, so the same incident can't happen twice in the same way.

## Capacity and cost monitoring
{: #capacity-and-cost-monitoring }

Platform cost is mostly CI minutes, multiplied by consumers and by the weekly drift scan. Watch minutes
per consumer per month and runner queue time; if the drift scan dominates, scan production weekly and
non-production fortnightly.

Workload cost is the bigger number, and Infracost is the tool already wired in, but disabled by default.
Turning it on in advisory mode for every consumer would at least put a monthly cost delta on every plan
summary, which is cheap insight. Thresholds and blocking can come later.

## Checklist
{: #checklist }

- [ ] Platform and workload signals are on separate dashboards
- [ ] Workflow run data is collected centrally across consumers
- [ ] A daily canary plan runs per cloud against the latest release
- [ ] The drift cron and its comment agree
- [ ] SLOs are agreed and published
- [ ] A bad-release runbook exists with a pin-back procedure
- [ ] Infracost is enabled in advisory mode
- [ ] A single run ID appears in logs, summaries, Jira and Teams

{% include project-nav.html %}
