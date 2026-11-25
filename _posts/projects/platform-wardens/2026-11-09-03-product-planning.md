---
layout: post
title: "Platform Wardens: Product Planning"
date: 2026-11-09 00:03:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Planning, Roadmap]
description: "Platform Wardens' roadmap: six phases from foundations to the first gated actions, a step table per phase with what's done, the MVP and how the plan changes."
project: platform-wardens
project_step: 3
image:
  path: /assets/img/projects/platform-wardens/03-product-planning.webp
  alt: "Platform Wardens: Product Planning - Projects hero image"
---

Platform Wardens has a plan written for a big Azure estate and three teams, and it's being built first
on one homelab by one person. This post keeps both honest: the phases come from the target plan, and
each phase's step table records what has actually been built on the homelab, with dates. The step that
matters most is the one nobody gets to skip: an agent earns each autonomy level with evidence, so the
roadmap is paced by evaluation gates, not by features.

<!-- more -->

{% include project-nav.html %}

## Product roadmap
{: #product-roadmap }

The target plan has six phases. Durations are indicative (about 56 weeks end to end for three teams,
each with an owner and two builders); a phase ends when its gate evidence is in, not on a date. Every
agent climbs the same lifecycle one gate at a time: Qualify (G0), Specify (G1), Build (G2), Shadow on
live inputs at L0 (G3), Promote (G4), then Operate. An agent that's new in phase *N* usually reaches
the shadow stage in *N* and is promoted in *N+1*, which is why every phase has both new and promote
work.

| Phase | Delivers | Depends on | Status |
|---|---|---|---|
| 0. Foundations | Standards and decision log, contracts, the `wardens` framework (registry, routing, handoff, durable execution, guardrails, model access, state, telemetry, notify, eval) as a versioned library with one repository per agent, a cluster to run it on, the operator console, the first shared read-only tool server, an activity inventory per domain | none | In progress (started 2026-10-23; the homelab cluster since 2026-11-01; the library split done 2026-11-20) |
| 1. First agent per domain | Terraform drift (DevOps), incident triage (SRE), SQL blocking or a storage agent (DBA), and the shared evidence agents they all call (change correlation, log investigation), all in the shadow stage | 0 | In progress (drift and change correlation in shadow since 2026-11-01, drift's draft PRs since 2026-11-15; a minimal incident triage since 2026-11-05) |
| 2. Second agents and handoffs | CI/CD failure triage, a second SRE and DBA agent, handoffs between domains, routing for alerts and chat; phase 1 agents promoted to L1 | 1 | In progress (started early: CI/CD triage and routing 2026-11-05, team chat in Slack live 2026-11-19) |
| 3. Complete the portfolio | Cluster upgrade readiness, capacity and cost, job failure analysis; kill-switch drills and an access review in the operate stage | 2 | In progress (cluster upgrade readiness built ahead of plan, 2026-11-03, deployed in shadow 2026-11-20) |
| 4. Expand each domain | Security finding triage, lifecycle cleanup, backup and restore, query performance; the L2 design approved | 3 | In progress (only the L2 design, for DevOps's first actions: [ADR-0047](/posts/projects/platform-wardens/architecture-decision-records/#adr-0047), 2026-11-21) |
| 5. First gated actions (L2) | The approval workflow and just-in-time write access in production; the first L2 action per domain | 4 | In progress (started early under an owner waiver: approve-then-act for every agent, and drift's merge and revert apply on development stacks, live 2026-11-23) |

The homelab deployment is part of the Cloudutsuk Platform playbook too: its
[Phase 6](/posts/projects/cloudutsuk-platform/03-product-planning/#phase-6-steps) builds the `wardens`
cluster and hosts these agents. Steps below that are done there say "Platform step N" and link to it,
so each piece of work has one row of record.

> **TODO:** Is the Azure target (AKS, self-hosted Temporal, Foundry behind APIM) still the plan after
> the homelab, or has the homelab become the product? It changes whether phases 4 and 5 keep their
> Azure components in [Infrastructure](/posts/projects/platform-wardens/11-infrastructure-and-environments/#environment-parity).
{: .prompt-warning }

### Phase steps
{: #phase-steps }

These tables are the source of truth for the build. A step is added to its phase **before** work on
it starts, and its status changes in the same change as the work. Numbers are never reused or
renumbered (a step slotted in later gets a letter); lessons, ADRs and commits refer to "Wardens
Phase N, step M". Phases 3 to 5 are refined when they start.

Two things changed how I work through these tables in the second half of November. Since 2026-11-20
every agent lives in its own `warden-<agent>` repository and imports `wardens` as a released library, so
a framework step now ends with a `wardens` release and a bump pull request in each agent repository, and
the *Repos* column names the agent's repository rather than a folder. And phase 5 started before phase 4
finished: decision 0047 waived the evidence floors for drift's two L2 actions on development and qa stacks,
so the approval workflow was built for real three weeks after drift went into shadow.

### Phase 0 steps
{: #phase-0-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | Adopt the reference standard as the conformance baseline: 27 design categories, each with its questions, and a decision log | `platform-wardens` | Every category has a page and a row in the conformance matrix | Done (2026-10-23) |
| 2 | Contracts first: JSON Schemas (draft 2020-12, A2A-shaped) for task, message, artifact, finding, proposed action, change event, run record and the agent manifest, with the cross-field rules | `platform-wardens` | Every record validates with `additionalProperties: false`, and the registry refuses an invalid manifest | Done (by 2026-11-01) |
| 3 | The `wardens` framework core: registry from manifests, routing by capability, handoff checks, Temporal workflows and the approval wait, guardrails with a fail-closed kill switch and hash-chained audit, model access with a cost ceiling, run records over OTLP, notifications, the eval harness | `platform-wardens` | Framework tests pass against a local Temporal, and terraform-drift runs end to end on it | Done (by 2026-11-01; the open items per module are tracked in the framework README) |
| 4 | A cluster to run it on: the `wardens` k3d cluster, Temporal on its own Postgres, a workload identity per agent, the deployment standard and the shared `wardens-agent` chart | `infra-local`, `homelab-gitops`, `infra-azure` | A test workflow completes and a pod gets an Entra token with no stored secret | Done (2026-11-02: Platform steps [7 to 10 and 12](/posts/projects/cloudutsuk-platform/03-product-planning/#phase-6-steps)) |
| 5 | The framework ready for a homelab: model provider from configuration (LiteLLM by default), Slack next to Teams, a configurable approval token issuer, GitHub App tokens | `platform-wardens` | Framework and drift tests pass against LiteLLM and a Slack webhook | Done (by 2026-11-19: drift's incidents run on the local models through LiteLLM and post to Slack, checked end to end with team chat. Platform step 11) |
| 6 | The operator console and the approval endpoint behind sign-in | `platform-wardens`, `homelab-gitops`, `infra-local` | An approval request opens the endpoint and the decision reaches the waiting workflow | Done (2026-11-22: a drift revert's approval was decided and the waiting workflow ran the apply; the console's Approvals page decides registry entries and level 2 actions. Platform steps 13a and 13c) |
| 6a | The console as a daily tool on a phone: a **Home** tab (approvals waiting, executions and success rate, failures, p95 run time, model cost, tool calls, per agent, over 24 hours, 7 or 30 days) with recent executions; an **Approvals** list for registry entries and level 2 actions, "Waiting for you" first, with a count in the sidebar; installable as an app (PWA) that shows its version and updates itself from the profile menu; chat that shows an ended conversation and a sent message's status | `platform-wardens`, `homelab-gitops` | On a phone, the installed app opens, shows Home, and an approval can be decided from it | Done (2026-11-24: PWA 2026-11-21, version and update 2026-11-22, Home and level 2 approvals 2026-11-22, chat fixes 2026-11-24; released in `wardens` 0.10.0) |
| 7 | A state store that outlives Temporal: run records, artifacts, dedupe claims, kill switch, audit log and memory on Postgres | `platform-wardens`, `homelab-gitops` | A run record survives a worker pod being replaced, and a kill switch from the console stops a run within 60 seconds | In progress (2026-11-05: run records stored; the rest built, not all wired. Platform step 22) |
| 8 | Observability: dashboards and alert rules for fleet, agent, model cost and Temporal; run and schedule metrics; a realistic price for self-hosted models | `platform-wardens`, `homelab-gitops` | A finished run shows on every dashboard, and a test denial fires the guardrail alert with its runbook | In progress (2026-11-04: live in `mon`. Platform steps 17 to 19) |
| 9 | An event bus at the front door: webhooks check and publish, one consumer starts runs at its own pace, with a dead-letter hub | `platform-wardens`, `homelab-gitops`, `infra-local` | A burst of 1,000 alerts and 5,000 GitHub events loses nothing and every expected run starts within 5 minutes | In progress (2026-11-06: both webhooks relay through the bus; console sends take the same path since 2026-11-16, Slack since 2026-11-19; the load test is next. Platform step 33) |
| 10 | The first shared tool server: web search over MCP behind the model gateway and a guard that checks each agent's grants | `platform-wardens`, `homelab-gitops`, `infra-local` | A granted tool works and is logged with the run's trace id; an ungranted one is refused twice | In progress (2026-11-06: live and checked; 2026-11-18: drift and Stack Author dropped grants no stage used, incident triage keeps its grant. Platform step 34) |
| 11 | An activity inventory per domain: what the work is, how often, how long, how risky, which data, whether a runbook exists | `platform-wardens` | Each domain's inventory scores its activities, and phase 1's agents come from the top of the list | Not started |
| 12 | The console's incident view: one correlation id as a flow or timeline of every step, from the event to the outcome; console sends take the ingress path; viewer, editor and admin roles ([ADR-0038](/posts/projects/platform-wardens/architecture-decision-records/#adr-0038)) | `platform-wardens`, `homelab-gitops` | A run sent from the console opens at once and looks exactly like one started by an alert | Done (2026-11-16; the plan's close-out is left) |
| 13 | One repository per agent, `wardens` as a versioned library ([ADR-0040](/posts/projects/platform-wardens/architecture-decision-records/#adr-0040)): the framework finds nothing by repo layout, the router gets its own image and is the only host of the incident workflow, two distributions (`wardens` and `wardens-services`), releases to the registry, `agent-ci` with attested images that Kyverno admits, the copier template with `wardens new-agent` and `wardens bump`, and all six agents moved out | `platform-wardens`, `warden-*`, `wardens-deploy`, `homelab-gitops`, `infra-github` | Every agent builds, tests and deploys from its own repository on a supported `wardens` release, and the plan's success criteria are measured | Done (2026-11-20: phases 0 to 9 closed, six agents on `wardens` 0.6.0, every success criterion met; now on 0.10.0) |
| 14 | `wardens-deploy`, the versioned registry: a published version never changes, contract checks per version pair, and a risk-raising entry waits for a reviewer's approval ([ADR-0042](/posts/projects/platform-wardens/architecture-decision-records/#adr-0042)); CI asks for that approval and a sync commits it after the reviewer presses Approve ([ADR-0048](/posts/projects/platform-wardens/architecture-decision-records/#adr-0048)) | `platform-wardens`, `wardens-deploy`, `homelab-gitops` | A risk-raising entry reaches every pod with nothing manual but the reviewer's press | Done (2026-11-22: terraform-drift 0.3.0 was the first entry through it) |
| 14a | The console starts the approvals sync right after an approval, with its own GitHub App, instead of waiting for a late cron ([ADR-0049](/posts/projects/platform-wardens/architecture-decision-records/#adr-0049)) | `platform-wardens`, `homelab-gitops`, `infra-local` | After Approve, the sync starts within a minute and merges the entry | In progress (2026-11-24: built and deployed; the live check waits for the next entry that needs an approval) |
| 15 | Evals that keep their history: each agent's accepted report beside its code and in the console's inspector ([ADR-0039](/posts/projects/platform-wardens/architecture-decision-records/#adr-0039)); a nightly run of every agent repository, live, with people's verdicts on production runs read through a read-only console endpoint ([ADR-0043](/posts/projects/platform-wardens/architecture-decision-records/#adr-0043), [0044](/posts/projects/platform-wardens/architecture-decision-records/#adr-0044), [0046](/posts/projects/platform-wardens/architecture-decision-records/#adr-0046)) | `platform-wardens`, `homelab-gitops` | Every agent has a nightly result and its gauges reach the eval alerts | In progress (2026-11-20: the nightly runs all six repositories, four pass; owner-confirmed labels and the first accepted reports are left) |

> **TODO:** Step 11 was written for three teams. On the homelab, is the inventory the author's own
> operations work (drift, alerts, CI failures, upgrades), or is it skipped until there's a team? The
> [vision post](/posts/projects/platform-wardens/01-vision-and-business-context/#stakeholders-sponsors-and-decision-makers)
> depends on the answer.
{: .prompt-warning }

### Phase 1 steps
{: #phase-1-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | Terraform drift explains drift between Azure and a stack's `resources.yaml` and recommends codify, revert or investigate, in shadow; started by a drift scan that finds drift (no schedule since 2026-11-09) | `warden-terraform-drift`, `homelab-gitops` | A run posts findings to Slack and writes a run record | Done (2026-11-19: a scoped scan's incident opened its thread in the devops channel; every infra-* repository is in scope since 2026-11-10. Platform step 13) |
| 2 | A drift scan that finds drift starts the drift agent at once, through the GitHub App's signed webhook | `platform-wardens`, `homelab-gitops`, `infra-local` | A drifted scan starts the incident within minutes; a clean scan, or one where stacks only failed to plan, starts nothing; an unsigned request gets 401 | Done (2026-11-10: the agent's only automatic start, checked end to end. Platform steps 13b and 13d) |
| 3 | Drift opens draft PRs after clean shadow runs (a draft PR counts as L1, decision 0013) | `warden-terraform-drift`, `homelab-gitops` | A drifted `infra-azure` stack gets a draft PR on its `resources.yaml` | Done (2026-11-15: the remove PR for a deleted DNS stack, citing its ticket; codify PRs since. Platform step 14) |
| 3a | Deletion decisions: a resource deleted outside Terraform becomes a remove-from-code or restore draft PR, decided from the ticket's intent ([ADR-0037](/posts/projects/platform-wardens/architecture-decision-records/#adr-0037)) | `warden-terraform-drift` | A deleted resource with a ticket that says "remove" gets a remove PR | Done (2026-11-15; linking a person's PR that already removes the entry isn't built) |
| 4 | Change Correlator: who changed or deleted a cloud resource, when and with which client; drift hands each stack's drift to it | `warden-change-correlator`, `homelab-gitops`, `infra-azure` | A drift finding for a portal deletion is followed by who, when and how | Done (2026-11-02. Platform step 15) |
| 4a | The Correlator for GitHub on the Free plan: the events API and a recorded webhook log ([ADR-0034](/posts/projects/platform-wardens/architecture-decision-records/#adr-0034)), then organisation-level objects (teams, members, property definitions) | `warden-change-correlator`, `platform-wardens`, `homelab-gitops` | A drifted GitHub setting is followed by who changed it and when | Done (2026-11-11; organisation events added 2026-11-22) |
| 4b | The Correlator for AWS: CloudTrail event history through a federated read-only role ([ADR-0035](/posts/projects/platform-wardens/architecture-decision-records/#adr-0035)); then GCP and Cloudflare | `warden-change-correlator`, `infra-aws` | A test change on an AWS stack is followed by who, when and how | In progress (the CloudTrail source and drift's AWS ids are built; the read-only identity is next) |
| 4c | Jira tickets as change evidence: candidates found by rules, ranked by the model ([ADR-0036](/posts/projects/platform-wardens/architecture-decision-records/#adr-0036)); a ticket that doesn't refer to the drifted resource adds nothing (the amendment of 2026-11-24) | `warden-change-correlator`, `warden-terraform-drift` | A drift finding names the ticket that covers it, or says the ticket holds no evidence | Done (2026-11-15; amendment live 2026-11-24) |
| 5 | Incident triage reached by an alert: the Alertmanager webhook, rules from alert labels, a minimal L0 agent | `warden-incident-triage`, `homelab-gitops`, `infra-local` | A test alert reaches the agent and Slack; another alert starts nothing | In progress (2026-11-05: the route works; 2026-11-19: the first agent in its own repository, the pilot of Phase 0 step 13. Platform steps 1 and 32) |
| 6 | Incident triage that investigates: read-only access to every cluster with short-lived tokens, RAG and `mon` tools, an eval suite from injected faults | `platform-wardens`, `homelab-gitops` | An RCA cites the right doc and metrics, and the evals pass | Not started (Platform steps 2 to 4) |
| 7 | A shared evidence agent (log investigation) that domain agents call through child tasks | `platform-wardens` | A spec that follows the framework, then a shadow run on `wardens` | Planned (Platform step 20) |
| 8 | A DBA agent: SQL blocking migrated onto the framework, or a storage agent | `platform-wardens` | The agent passes G2 and runs in shadow | Not started |

> **TODO:** The homelab has no SQL Server. Does phase 1's DBA agent wait for one (a lab cluster with
> SQL Server, or Postgres in its place), or does it move to a later phase?
{: .prompt-warning }

### Phase 2 steps
{: #phase-2-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | CI/CD triage, decisions: scope, stage, tool packs, and a fix PR's level set by what opening it can reach (decisions 0027, 0028) | `platform-wardens`, `homelab-gitops` | The decisions are merged | Done (2026-11-05. Platform step 23) |
| 2 | A failure lab: a repository with seeded faults in six build tools, for real logs and a safe first target | `infra-github`, a lab repo | Every seeded fault gives a real failed run | Done (2026-11-05. Platform step 26) |
| 3 | CI/CD triage, investigation: a deterministic core, an explanation stage, `workflow_run` on the webhook | `warden-cicd-triage` | Failed step and category meet their floors on real cases, offline | In progress (2026-11-05: the core and 42 real eval cases; 2026-11-20: its own GitHub App and a worker on `wardens`, still in the `build` stage, so not routable. Platform step 27) |
| 4 | CI/CD triage in shadow, then PR comments and fix PRs at L1 where opening reaches no secrets | `platform-wardens`, `homelab-gitops` | Two weeks and 30 reviewed failures meet the floors; a lab fix reaches verified and a person merges it | Planned (Platform steps 28, 29) |
| 5 | Routing beyond rules: a classifier on the local model for what no rule knows and for chat, below its threshold a person decides (decision 0029) | `platform-wardens` | The classifier's threshold is set from the routing evals, and chat's Auto proposes an agent | In progress (2026-11-05: 40 labelled requests; the threshold waits for a run against the real model) |
| 6 | Stack Author: a chat that turns a request into a terragrunt stack change and opens a draft PR on the person's button (decision 0026) | `warden-stack-author`, `homelab-gitops`, `infra-local` | A request ends in a draft PR with the plan's result in the conversation | In progress (2026-11-05; in shadow from its own repository since 2026-11-19; a conversation on the current worker is left. Platform steps 21, 21a) |
| 7 | Promote drift to L1 and the Change Correlator past G3 (it stays L0) | `warden-terraform-drift`, `warden-change-correlator` | Their G3 evidence is in and the manifests say so | Not started (drift's 30 cases wait for owner-confirmed labels; none count yet) |
| 8 | Team chat in Slack: one private channel per domain cell, incident threads and request threads as durable sessions, follow-up questions to the agent, Slack users linked to Keycloak accounts ([ADR-0041](/posts/projects/platform-wardens/architecture-decision-records/#adr-0041)) | `platform-wardens`, `wardens-deploy`, `homelab-gitops`, `infra-local` | A drift incident opens its thread in the devops channel and a linked person's follow-up gets an answer that names the run it read | In progress (C0 to C6 live 2026-11-19 and 2026-11-20; Slack confirms a link since 2026-11-22; the rest of the plan, C7 and C8, is planned) |

Stack Author wasn't in the original phase 2. It's the catalog's "environment request to PR" agent,
pulled forward because the homelab had a real need for it and it reuses drift's draft-PR path. Team chat
is the "routing for chat" half of this phase, and it came first because the L2 approvals in phase 5 needed
its Slack-to-Keycloak link to know who pressed a button.

### Phase 3 steps
{: #phase-3-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | Cluster Upgrade Readiness: removed APIs in use, node skew, fail-closed webhooks and backups, with an ordered upgrade plan; provider-neutral, k3s first (decision 0017) | `warden-cluster-upgrade-readiness`, `homelab-gitops` | A weekly run reports each cluster's blockers and plan | In progress (2026-11-03: runs locally against the k3d clusters; 2026-11-20: 0.3.0 deployed in shadow with a weekly schedule, reading only its own cluster; the other clusters need read-only access there. Platform step 16) |
| 2 | Capacity and cost analyst | `platform-wardens` | A spec that follows the framework | Planned (Platform step 20) |
| 3 | Kill-switch drills and an access review in the operate stage | `platform-wardens`, `homelab-gitops` | A drill stops a run in time and the review is recorded | Not started |

### Phase 4 steps
{: #phase-4-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | The L2 design: the first L2 action per domain, the just-in-time write mechanism and the approvers per action | `platform-wardens` | The design is an accepted decision | In progress (2026-11-21: [ADR-0047](/posts/projects/platform-wardens/architecture-decision-records/#adr-0047) sets DevOps's first two L2 actions and their approvers; SRE's and DBA's, and just-in-time write access, are open) |

### Phase 5 steps
{: #phase-5-steps }

| Step | Does | Repos | Done when | Status |
|---|---|---|---|---|
| 1 | A CI/CD fix PR opened after approval where opening reaches secrets | `warden-cicd-triage`, `homelab-gitops`, `infra-local` | An approved fix opens, its pipeline tests it and a person merges it | Planned (Platform step 30) |
| 2 | Approve then act, for every agent: the framework's ceiling goes to L2; a level 2 action is handed to its own workflow on the router, which posts a card with Approve and Deny buttons and what will change, accepts a press only from a Slack user linked to a member of the action's approver groups, waits up to 24 hours (expiry denies) and calls the agent's act once ([ADR-0047](/posts/projects/platform-wardens/architecture-decision-records/#adr-0047)) | `platform-wardens`, `wardens-deploy`, `homelab-gitops` | A test agent's level 2 action runs only after an approval, and is refused on a changed summary | Done (2026-11-22: `wardens` 0.9.0 and 0.9.1) |
| 3 | terraform-drift's first L2 actions, on development and qa stacks under an owner waiver until 2026-12-20 or 30 approved runs: `merge_drift_pr` (merge its own drift PR, which runs the apply) and `apply_stack_revert` (dispatch the stack's apply for a revert); production stays L1 | `warden-terraform-drift`, `wardens-deploy`, `homelab-gitops` | Approved in Slack, a development revert is applied and a development merge is made; a production stack gets no approval request | Done (2026-11-23: a revert applied 2026-11-22, a codify PR merged 2026-11-23; follow-ups checked live 2026-11-24; no stack has a qa environment yet, so level 2 runs on development stacks only) |

## MVP definition
{: #mvp-definition }

The MVP is **one agent that a person trusts enough to read every morning**, running on the real
framework, not a demo. That means terraform-drift at L1 on the homelab, with everything the framework
promises around it:

| In the MVP | Why it has to be there |
|---|---|
| An event-started run of terraform-drift, and the schedule path in the framework's tests | Proves both entry points (reactive and proactive) |
| A handoff to the Change Correlator | Proves child tasks, narrowing limits and one message per incident |
| Guardrails at submission, tool call and emit, and the kill switch | Autonomy enforced in code is the product; without it this is a script |
| A run record per run, a trace per incident, the dashboards | "Observable by default" is a design rule, not a phase |
| A draft PR as the recommendation | The L1 output people act on |

Out of the MVP, on purpose: L2 actions, the Azure target, every agent beyond the first domain's, and
long-term memory. Picture adding the approval workflow before anyone has watched drift's findings for
a few weeks: you'd be building the gate before you know what should go through it. That's roughly how it
played out: I'd read drift's findings for three weeks before the approval workflow went in, and by then I
knew exactly what should go through it (its own PR's merge, and one stack's apply) and what shouldn't
(anything in production).

> **TODO:** How many clean shadow runs (Platform step 14 says "two or three") make drift's MVP done,
> and who scores them?
{: .prompt-warning }

## Release milestones
{: #release-milestones }

Milestones follow the lifecycle gates, not versions. The framework is released as `wardens` (the first
release, 0.2.0, on 2026-11-18; 0.10.0 on 2026-11-25), and each agent has its own version, `CHANGELOG.md`
and registry entries, so "release" can mean three things: a framework release, an agent version that
reaches the registry, and an agent's stage or level changing in its manifest. Only the last one is a
milestone.

| Milestone | Means | Evidence |
|---|---|---|
| M0. Framework on a cluster | Phase 0 steps 3 and 4 | Done 2026-11-02 |
| M1. First agent in shadow | drift and the Change Correlator routable, schedules live | Done 2026-11-01 |
| M2. First L1 output delivered | drift opens a draft PR on a drifted stack | Done 2026-11-15 (Phase 1 step 3) |
| M3. First promotion | An agent passes G3 and G4 with at least 30 eval cases per action | Phase 2 step 7 |
| M4. Two domains composed | An alert in one domain hands off to an agent in another | Phase 2 |
| M5. First L2 action | An approved action runs, and its result is reported | Done 2026-11-22, ahead of plan and under a waiver: a development revert approved in Slack and applied (Phase 5 step 3) |

## Backlog structure
{: #backlog-structure }

There are three levels, and each lives where the work is done:

1. **Phases and steps** (this post) for what gets built and in what order.
2. **A plan per large piece of work** in the framework repo (`docs/plans/`: repo-per-agent, team chat,
   drift merge on approval, registry approval requests, the approvals sync, the incident view, the
   correlator for other clouds and others), each with its own Progress table that's the status of record
   for its detail, linked from its step. An index page lists them, and each piece of work has a feature
   file.
3. **Pull requests**, one per change, in whichever repository the change lives (the framework, an agent
   repository, `wardens-deploy`, the gitops repo), which name their plan step.

Each agent also keeps its gate evidence in its own folder (`gates/`, `evals/scenarios/`, `docs/`
with why-an-agent, runbook, threat model, ROI and retirement), so the backlog for "promote drift" is
the gaps in that folder, not a ticket.

## Prioritization approach
{: #prioritization-approach }

The plan scores each activity before it becomes an agent, and starts with the highest scores:

| Criterion | Favours starting when |
|---|---|
| Frequency × time per occurrence | High: much toil removed |
| Risk of being wrong at L0/L1 | Low: a person still decides |
| Read access to the data | Already available through a planned tool server |
| Known-good outcomes | Past tickets or incidents give at least 30 evaluation cases |
| Runbook exists | Yes: it becomes the instructions |
| Shared by more than one domain | Yes: build it once as a common agent |

Two rules sit on top. Anything with no judgment in it is a function or a workflow, not an agent
(certificate expiry, "did the backup succeed?"). And a capability two domains need is built as one
common agent before either domain agent grows it. That's why the Change Correlator came before any
SRE agent: "what changed?" is the first question in every domain.

## Budget and resource planning
{: #budget-and-resource-planning }

On the homelab the money is mostly the power bill: models run locally behind LiteLLM, Temporal and
both Postgres databases run in the `wardens` cluster, and the only cloud spend is the Azure
subscription the agents read. Model cost is still tracked as if it were real: each local model is
priced at what the same calls would cost on the production model in Microsoft Foundry, so the cost
ceiling per run, the dashboards and the ROI show a believable figure. Workers refuse a model with no
price.

The target plan assumes each team commits an agent owner and two builders for the whole plan, with one
platform engineer leading the Azure work in phase 0.

> **TODO:** What is the monthly budget for the Azure target (AKS, Foundry tokens, Postgres, Data
> Explorer for audit), and who funds it? Nothing in the repo sets one.
{: .prompt-warning }

## Risk and dependency management
{: #risk-and-dependency-management }

| Risk or dependency | Effect | What's done about it |
|---|---|---|
| The model is wrong and sounds sure | A bad recommendation looks credible | Deterministic stages decide the recommendation kind; the model writes the rationale only, validated, falling back to "unknown" |
| Retrieved content tries to instruct the agent | Prompt injection through a plan, a commit or a log | Retrieved content is data; injection scenarios are in the eval sets |
| Temporal or its database is down | No runs | The ingress consumer waits and the bus keeps the events; run records fall back to a local file |
| One person builds and reviews | No independent review, which the standard requires | A second account reviews; the owner and reviewer differ in every manifest |
| The homelab itself | Power, disks, one host | The platform's backups (Velero, nightly dumps) and its own alerts |
| Upstream tools change | Pydantic AI, Temporal SDK, LiteLLM versions | Pinned in `uv.lock`, replay tests for running workflows |
| An approved action does something other than what was shown | An approver presses Approve on one plan and a different one is applied | The card's change summary hash is bound into the approval; before acting, the agent re-checks the PR's head SHA (or `main` and the plan) and the kill switch, and does nothing if any differ |
| A merge's apply fails | The cloud is half changed | The run reports the apply's conclusion and never retries an apply by itself; production isn't in the waiver |
| A framework release breaks agents | Six repositories fail at once | `wardens release check` compares contracts and check-agent rules with the last release and every agent that pins it; a bump PR per agent, merged within minutes so far |

Dependencies on the Cloudutsuk Platform: the `mon` cluster for telemetry, the `ai` cluster for models,
OpenBao for secrets, Argo CD for deploys. Those are listed per step in its *Repos* column.

## Change-control process
{: #change-control-process }

1. New work that fits a phase gets a row in that phase's table first, with a checkable *Done when*.
2. Work that fits no phase is a roadmap change: it's written up as a decision in `docs/decisions/`
   with the options considered, then the phase table changes.
3. A change to an agent's model, prompt, tools or policy re-runs its eval suite before it's merged.
4. A schema change goes in the same PR as every caller.
5. A change to autonomy (a new action, a higher level) needs its own decision and gate evidence;
   nothing raises a level by editing a manifest alone. That's enforced now: the registry entry for such a
   manifest is risk-raising and waits for a cell reviewer's approval. The one exception to "gate
   evidence" is an owner waiver, which has to name its scope and its end in the decision and the
   manifest, as decision 0047 does.

## Checklist
{: #checklist }

- [ ] Every phase in the roadmap has a step table, and every step has a checkable *Done when*
- [ ] Each homelab step links to its Cloudutsuk Platform Phase 6 row instead of repeating its detail
- [ ] The MVP (drift at L1 with handoff, guardrails and a draft PR) is agreed
- [ ] Phase 0 step 11 (activity inventory) is decided for a one-person homelab
- [ ] The DBA agent's home (SQL Server lab or a later phase) is decided
- [ ] The Azure target's budget and owner are recorded
- [ ] Each running agent's `gates/` folder shows which gate it's at
- [ ] Drift's L2 waiver is reviewed before 2026-12-20, and phase 5 step 3 is gated as written after it
- [ ] Phase 0 step 14a's live check is recorded at the next registry approval
- [ ] Decisions that changed the plan are in the [ADR log](/posts/projects/platform-wardens/architecture-decision-records/)

{% include project-nav.html %}
