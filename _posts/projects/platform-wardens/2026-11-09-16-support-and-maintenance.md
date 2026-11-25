---
layout: post
title: "Platform Wardens: Support and Maintenance"
date: 2026-11-09 00:16:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Support, Maintenance]
description: "Who supports Platform Wardens' agents, how a wrong answer becomes an eval case, and how wardens releases, models and dependencies change without breaking running workflows."
project: platform-wardens
project_step: 16
image:
  path: /assets/img/projects/platform-wardens/16-support-and-maintenance.webp
  alt: "Platform Wardens: Support and Maintenance - Projects hero image"
---

Maintaining an agent is different from maintaining a service in one way that matters: its behaviour can
change without a line of its code changing. A new model version, a renamed model, a reworded prompt or a
new tool can each make yesterday's good agent wrong today. So in Platform Wardens any of those changes is
treated as a release, and it re-runs the agent's evals before it ships. Since the split into one
repository per agent there's a second kind of upgrade to maintain: the `wardens` library itself, which
reaches six repositories through bump pull requests.

<!-- more -->

{% include project-nav.html %}

## Support model and ownership
{: #support-model-and-ownership }

| Part | Owner | On the homelab |
|---|---|---|
| The framework, contracts, shared tools, releases | Framework owner | The author |
| Each agent's repository | Its owner, from the domain that uses it most; `CODEOWNERS` names the reviewer's team | The author; teams `devops` (owner) and `sre` (reviewer), managed as code in `infra-github` |
| The registry and deploy config (wardens-deploy) | People by pull request; entries by each agent's CI; risk-raising entries by the cell's reviewers | The author, with owner self-approval recorded as such while there's one real reviewer |
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

When an agent misbehaves: contain first (hold the incident from the console if it only needs a pause; the
kill switch and quarantine if it must stop), then look at the run record and the trace for that
correlation id, then decide whether to demote, fix or retire. Demotion needs no gate: any owner, reviewer
or the framework owner can lower an action's level, and for terraform-drift's level 2 actions that's
removing one block from its scope config. When the wardens platform itself
fails (Temporal, the state store, the bus), the alerts and their runbooks lead, and the agents' work
waits rather than being lost (see [Resilience](/posts/projects/platform-wardens/05-technical-architecture/#resilience-and-disaster-recovery)).

## Bug triage
{: #bug-triage }

Two kinds of bug, two paths:

- **The code is wrong** (a tool, a stage, the framework): an issue and a PR with a test, like any repo.
- **The agent's answer is wrong** (a misclassified drift, a bad diagnosis): someone presses **Wrong** on
  that step in the console's incident view and writes what it should have done. The run then blocks the
  agent's promotion until it's resolved on the **Feedback** tab: accepted as a new eval case (exported,
  completed and committed to the agent's repo) or dismissed with a reason. The fix has to pass the new case
  without breaking the others. **Right** counts too: it scores shadow runs.

The two can meet. In `wardens` 0.9.1 the eval measures counted a hand-off for approval as an act, so
terraform-drift's level 2 work failed its own eval gate on "safety". The agent wasn't wrong; the framework
was, and the fix was a patch release and a bump.

## Patch and upgrade management
{: #patch-and-upgrade-management }

| Upgrading | Care needed |
|---|---|
| `wardens` in an agent | The bump PR: pin, digest, `copier update` for template changes, any bump migrations, `uv lock`; then the agent's tests, replay and evals. A major is refused without `--allow-major` and prints what agents must change |
| The router and console | First, before agents (decision 0040 rule 3); the router supports the current and previous minor and refuses an agent two behind |
| Temporal SDK or server | Replay recorded histories before merging; workflow changes behind `workflow.patched` |
| Pydantic AI | The agent's evals re-run; typed outputs re-validated |
| The model | A new model or version is a re-evaluation; workers refuse a model with no price |
| Base images | The image gates catch CVEs; the template's `APT_REFRESH` date forces a fresh apt upgrade in every new or bumped agent |
| Kubernetes on `wardens` | The Cluster Upgrade Readiness agent's own report covers it |

The homelab's chat model being renamed is a good example: the drift worker refused to start
(`UnpricedModelError`) until the new name had a price. A failure at start is the right failure.

## Dependency updates
{: #dependency-updates }

Every repo (platform-wardens, wardens-deploy, each agent) now gets its routine updates from Renovate,
extending the homelab's shared rules, and installs only through the homelab's Nexus proxy. The age rule is
the same in both tools: Renovate's minimum release age and uv's `exclude-newer = "14 days"` are one
rolling two-week window. That took a correction. Until 2026-11-25 every new package also got a fixed date
in `[tool.uv.exclude-newer-package]`; those dates overrode the rolling window, so Renovate's Python group
couldn't lock newer ruff and import-linter releases. They were dropped, and a dated entry is now kept only
for a security fix taken early.

The `wardens` pin is the exception: Renovate never moves it, `wardens bump` does, because the version, the
image digest and the template have to move together. CI fails on a stale lock everywhere. Upstream tool
definitions from MCP servers are pinned by hash, so a server changing a tool's description is noticed, not
absorbed.

## Security remediation
{: #security-remediation }

The image gates block a vulnerable image from being pushed, so remediation is a PR that fixes the
finding and a rebuild. When the fix is a package younger than 14 days, it goes in as a dated exception
with the reason beside it, removed once the window passes it. A finding in an agent's behaviour (an injection that worked, a tool called
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

A nightly dump of both Postgres databases goes to another host, kept seven nights, alerted if late
(`WardensDumpTooOld`). The console's run book has a quarterly restore drill (January, April, July,
October, and after any change to the dumps or database versions): restore the newest night into a
throwaway Postgres with no network, then check the Temporal schema version, the namespaces, the newest
workflow and run record, and that every merged migration is there.

The first drill ran on 2026-11-18: a 21 MB dump restored in 2 seconds and passed. The accepted loss window
is up to a day of workflow history, the time since the last dump. When Velero runs on the `wardens`
cluster, the drill moves to restoring its copy of the same dumps.

## Disaster recovery testing
{: #disaster-recovery-testing }

Two disasters have been rehearsed by accident. The worker pod being replaced mid-run, which Temporal
handles. And the bus's emulator losing its storage: on 2026-11-21 the Event Hubs pod was recreated, the
consumer's checkpoint container went with it, and ingress read nothing until a restart. Re-reading from
the start was always safe (duplicate starts are refused by workflow id); stalling wasn't, and `wardens`
0.10.0 now recreates the container before every read. The restore drill covers the databases. Still to
rehearse: recreating the `wardens` cluster from code (any change to a k3d cluster's rendered config
recreates it), and the Velero copy once it exists.

## Technical debt management
{: #technical-debt-management }

The module table's *Not yet* column is the framework's debt list, updated in the PR that closes an item,
and the repo-per-agent plan closed with an "After the plan" list of what it didn't finish. Agent-level debt
sits in each agent's repository, and the nightly evals make most of it visible: terraform-drift has
unlabelled harvested cases and ten that can never run (they point at an anonymised module no token can
clone), stack-author's scripted cases have a placeholder where the person's message should be, and seven
old stack-author conversations no longer replay. Then there's the softer kind: a template why-an-agent,
a kill switch never timed on the cluster. Proposed decisions that the build has already proven are debt
too, until they're accepted.

## Checklist
{: #checklist }

- [ ] Every model, prompt, tool or policy change re-runs the agent's evals
- [ ] Every `wardens` release's bump PRs are merged within a week
- [ ] Every run marked Wrong is accepted as a case or dismissed with a reason
- [ ] SLOs are agreed and on a dashboard
- [ ] The quarterly restore drill runs, and each result is recorded in the run book
- [ ] Recreating `wardens` from code has been rehearsed
- [ ] The *Not yet* column is current

{% include project-nav.html %}
