---
layout: post
title: "Platform Wardens: Support and Maintenance"
date: 2026-11-09 00:16:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Support, Maintenance]
description: "Who supports Platform Wardens' agents, how a wrong answer becomes an eval case, and how models, prompts and dependencies change without breaking running workflows."
project: platform-wardens
project_step: 16
---

Maintaining an agent is different from maintaining a service in one way that matters: its behaviour can
change without a line of its code changing. A new model version, a renamed model, a reworded prompt or a
new tool can each make yesterday's good agent wrong today. So in Platform Wardens any of those changes is
treated as a release, and it re-runs the agent's evals before it ships.

<!-- more -->

{% include project-nav.html %}

## Support model and ownership
{: #support-model-and-ownership }

| Part | Owner | On the homelab |
|---|---|---|
| The framework, contracts, shared tools | Framework owner | The author |
| Each agent | Its owner, from the domain that uses it most | The author; each manifest names a different reviewer |
| A common agent | The team that uses it most; reviewer from another domain | Same |
| The `wardens` cluster | The platform | The Cloudutsuk Platform |

The proposed fleet-operations decision ([ADR-0021](/posts/projects/platform-wardens/architecture-decision-records/#adr-0021))
spells out who owns each kind of failure and the review cadence once there's more than one team.

## Service-level objectives
{: #service-level-objectives }

No SLOs are agreed yet. The candidates, from the design and the measures in the vision:

| Candidate SLO | Why it matters |
|---|---|
| Scheduled runs that start and finish on time | Drift is useless if it's a day late |
| Time to first diagnosis for an alert | The point of incident triage |
| Kill switch stops within 60 seconds | Safety; already a design limit |
| Runs within their cost ceiling | Budget; already enforced |

> **TODO:** Which of these become SLOs, with what targets and windows? The repo leaves targets to the
> sponsor.
{: .prompt-warning }

## Incident response
{: #incident-response }

When an agent misbehaves: contain first (kill switch, quarantine), then look at the run record and the
trace for that correlation id, then decide whether to demote, fix or retire. Demotion needs no gate: any
owner, reviewer or the framework owner can lower an action's level. When the wardens platform itself
fails (Temporal, the state store, the bus), the alerts and their runbooks lead, and the agents' work
waits rather than being lost (see [Resilience](/posts/projects/platform-wardens/05-technical-architecture/#resilience-and-disaster-recovery)).

## Bug triage
{: #bug-triage }

Two kinds of bug, two paths:

- **The code is wrong** (a tool, a stage, the framework): an issue and a PR with a test, like any repo.
- **The agent's answer is wrong** (a misclassified drift, a bad diagnosis): that run becomes a new eval
  case with the right expected outcome, and the fix has to pass it without breaking the others. Every
  production run the agent got wrong becomes a case; that's how the eval set grows toward 30.

## Patch and upgrade management
{: #patch-and-upgrade-management }

| Upgrading | Care needed |
|---|---|
| Temporal SDK or server | Replay recorded histories before merging; workflow changes behind `workflow.patched` |
| Pydantic AI | The agent's evals re-run; typed outputs re-validated |
| The model | A new model or version is a re-evaluation; workers refuse a model with no price |
| Base images | The image gates catch CVEs (an `apt` CVE needed a newer package in the first week) |
| Kubernetes on `wardens` | The Cluster Upgrade Readiness agent's own report covers it |

The homelab's chat model being renamed is a good example: the drift worker refused to start
(`UnpricedModelError`) until the new name had a price. A failure at start is the right failure.

## Dependency updates
{: #dependency-updates }

One `uv.lock` for the workspace, updated deliberately; CI fails on a stale lock. Packages added with the
MCP client only take releases at least 14 days old, moved forward on purpose when upgrading. Upstream
tool definitions from MCP servers are pinned by hash, so a server changing a tool's description is
noticed, not absorbed.

## Security remediation
{: #security-remediation }

The image gates block a vulnerable image from being pushed, so remediation is a PR that fixes the
finding and a rebuild. A finding in an agent's behaviour (an injection that worked, a tool called
outside its scope) is handled as a safety failure: it blocks promotion, and it becomes an eval case and a
denial test with its allowed twin.

## Performance optimization
{: #performance-optimization }

Most of an agent's time is the model, so the levers are the model's: a smaller or local model for a
stage that only classifies, thinking turned off and responses capped where reasoning adds nothing
(Stack Author's chat does both), and waking the model at the start of a conversation so the person
doesn't wait on a cold start. Deterministic stages do everything code can do, which is also the cheapest
optimisation.

## Backup verification
{: #backup-verification }

A nightly dump of both Postgres databases goes to another host, kept seven nights, alerted if late.

> **TODO:** Has a restore been tested? Record the date, the dump used and how long the restore took,
> and repeat it after any schema change.
{: .prompt-warning }

## Disaster recovery testing
{: #disaster-recovery-testing }

The disaster that's been rehearsed by accident is the worker pod being replaced mid-run, which Temporal
handles. The ones still to rehearse: restoring the state store from a dump, recreating the `wardens`
cluster from code (any change to a k3d cluster's rendered config recreates it), and the bus's emulator
losing its storage (checkpoints are per hub instance, so a restart is read from the start and the
duplicate starts are refused by workflow id).

## Technical debt management
{: #technical-debt-management }

The module table's *Not yet* column is the debt list, and it's updated in the PR that closes an item.
Agent-level debt sits in each agent's folder: missing eval cases, a template why-an-agent, a runbook
with blanks. Proposed decisions that the build has already proven are debt too, until they're accepted.

## Checklist
{: #checklist }

- [ ] Every model, prompt, tool or policy change re-runs the agent's evals
- [ ] Every wrong production answer becomes an eval case
- [ ] SLOs are agreed and on a dashboard
- [ ] A state store restore has been tested and timed
- [ ] Recreating `wardens` from code has been rehearsed
- [ ] The *Not yet* column is current

{% include project-nav.html %}
