---
layout: post
title: "Platform Wardens: Vision and Business Context"
date: 2026-11-09 00:01:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Vision, Business]
description: "Why Platform Wardens exists: agents absorb routine DevOps, SRE and DBA work up to the decision, while people build, govern and run the agents."
project: platform-wardens
project_step: 1
---

Most operations tickets follow the same six steps: a signal arrives, someone collects evidence,
correlates it with what changed, writes a recommendation, a person approves it, and the result is
checked. Only the fifth step really needs a person. Platform Wardens is a framework for agents that do
the other five, for DevOps, SRE and DBA work, without ever being trusted further than the evidence
allows.

<!-- more -->

{% include project-nav.html %}

## Business problem and opportunity
{: #business-problem-and-opportunity }

Operations teams spend most of their week on work that is routine but not trivial. Drift between the
cloud and the code, a failed pipeline, an alert at 3 am, a blocking chain on a database: each one needs
someone to gather evidence from three systems before they can even decide what to do. A review of past
operations tickets across the three domains found the same themes in every team (provisioning and
change, access, troubleshooting, connectivity, data operations, monitoring, security, capacity and cost,
cleanup, reporting) and the same six-step shape under all of them.

The opportunity isn't "AI fixes production". It's narrower and more useful: **do all the work up to the
decision**, in a way a person can check quickly, and record what happened so the next decision is
easier. That's also why it's a framework and not one bot. The six steps are shared, so the stages,
contracts, guardrails and run record are built once, and each domain adds only its tools, policies and
remediation for the systems it owns.

On the homelab, the problem is real at a smaller scale: one person runs an Azure estate as code,
six k3d clusters plus short-lived labs, CI for many repos and a monitoring stack. The daily drift scan, the alerts
and the failed builds are the first work the agents take on.

## Goals, objectives, and expected outcomes
{: #goals-objectives-and-expected-outcomes }

The goal, as the repo states it:

> Agents do the day-to-day operational work of the DevOps, SRE and DBA teams. The three teams build,
> govern and run the agent framework instead of doing that work by hand.

"Replace" is the north star, not the first release. Autonomy is granted per action and climbs with
evidence:

| Horizon | What agents do | What people do |
|---|---|---|
| v1 | **L0** observe and explain, **L1** recommend: collect evidence, correlate, diagnose, draft the fix, the PR, the RCA | Read findings, decide and act |
| Next | **L2** act with approval, per action, after it passes its gate | Approve the exact action, with its full parameters |
| Later | **L3** act within bounds, only for actions that pass both reversibility tests | Review after the fact, set the bounds |
| Not in year one | L4 autonomous | — |

Two rules follow and shape every design choice: **one agent per capability, not per team** (work two
domains do the same way, such as "what changed?", is one common agent), and **start simple, then climb
in measured steps**.

## Stakeholders, sponsors, and decision-makers
{: #stakeholders-sponsors-and-decision-makers }

The framework's roles come from the reference standard it conforms to, and each one is a real job:

| Role | Holds | On the homelab |
|---|---|---|
| Sponsor | Sets targets, authorises promotions | The author |
| Framework owner | The `wardens` package, contracts, shared tools | The author |
| Agent owner | One agent: its evals, runbook, ROI, promotions and demotions | The author |
| Independent reviewer | Reviews another team's agent; must be on a different team from the owner | A second account, named in every manifest |
| Operators | Score shadow runs, approve L2 actions, use the kill switch | Platform admins in Keycloak |

The team rotation in the target plan (DBA reviews SRE, SRE reviews DevOps, DevOps reviews DBA)
guarantees the reviewer is never the owner's own team.

> **TODO:** For the Azure target, who is the named sponsor and framework owner, and who owns each
> domain's agents? The repo lists these as open.
{: .prompt-warning }

## Target users and personas
{: #target-users-and-personas }

| Persona | Wants | Touches |
|---|---|---|
| **The on-call engineer** | To know what's wrong and what changed before they open a terminal | The alert's Slack thread with the agent's findings |
| **The infra owner** | To see drift explained and a ready PR, not a raw plan | Draft PRs from terraform-drift; the daily message |
| **The agent builder** | To add an agent without re-solving routing, identity, retries and audit | The template, the framework API, the console |
| **The operator** | To trust the fleet: what ran, what it cost, what it refused | Grafana dashboards, run records, the kill switch |
| **The requester** | To ask for a standard change in plain words | Stack Author's chat in the console |

The first persona is the one the design optimises for. A finding that takes longer to read than the
problem takes to investigate by hand has failed, however correct it is.

## Success metrics and business KPIs
{: #success-metrics-and-business-kpis }

The repo defines six measures, tracked from the first wave of agents:

| Measure | Means |
|---|---|
| Coverage | Share of inventoried activities handled by an agent or a function, by domain and level |
| Toil absorbed | Engineer hours a week covered by agent runs, from each agent's ROI record |
| Quality | Agreement with the engineer's conclusion, false-action rate, and zero safety failures |
| Speed | Time to first diagnosis compared with the human baseline |
| Cost | Cost per run and per activity, within each agent's ceiling |
| Reuse | Share of runs that use at least one common agent or shared tool server |

Quality has a hard floor that isn't negotiable: any safety failure in the evaluation window blocks
promotion.

> **TODO:** What are the baselines and targets? The repo says "the sponsor sets the targets", and
> terraform-drift's why-an-agent and ROI documents still have empty baseline tables. Start with drift's
> time to outcome by hand versus with the agent.
{: .prompt-warning }

## Scope, assumptions, constraints, and dependencies
{: #scope-assumptions-constraints-and-dependencies }

**In scope for v1:** L0 and L1 agents for DevOps, SRE and DBA; the framework they share; the homelab
deployment; the Azure target design.

**Out of scope for v1:** any agent acting on its own (L2 and above), group chat between agents in
production, more than two coordinating levels, and anything with no judgment in it (certificate expiry,
"did the backup succeed?"), which is a function or a workflow, not an agent.

**Assumptions:** the assumed landscape is Azure, Kubernetes, SQL Server, Terraform (through terragrunt),
GitHub and a log store. On the homelab that becomes Azure, k3d, Postgres, Terragrunt, GitHub and the
platform's Grafana stack.

**Constraints:** autonomy enforced in code, never in prompts; at most 13 tools per agent; every agent
measured on at least 30 real cases before promotion; no person's or shared credentials.

**Dependencies:** the Cloudutsuk Platform (`mon`, `ai`, `core`, Argo CD), local models through
LiteLLM, the Azure subscription the agents read, and GitHub.

## Checklist
{: #checklist }

- [ ] The goal and the v1 horizon (L0 and L1 only) are written where every contributor sees them
- [ ] Each persona has at least one agent or screen designed for them
- [ ] Baselines exist for drift's time to outcome and cost per case
- [ ] Targets for the six measures are set and recorded
- [ ] The reviewer for every agent is someone other than its owner
- [ ] What's out of scope (L2+, group chat, non-judgment work) is checked at every G0
- [ ] Dependencies on the Cloudutsuk Platform are listed in each roadmap step

{% include project-nav.html %}
