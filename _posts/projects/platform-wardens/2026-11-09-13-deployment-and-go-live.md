---
layout: post
title: "Platform Wardens: Deployment and Go-Live"
date: 2026-11-09 00:13:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Deployment, Go-Live]
description: "Go-live in Platform Wardens is per agent: an 18-item admission checklist, a deploy that's a gitops commit, and the shadow stage as a launch that can't act."
project: platform-wardens
project_step: 13
---

Platform Wardens doesn't have one go-live; every agent has its own, and it happens twice. The first time
the agent is deployed in the shadow stage, live but unable to act. The second time it's promoted to a
level where people act on what it says. The deploy is the easy part (a digest in gitops); the readiness
review is where an agent is held back.

<!-- more -->

{% include project-nav.html %}

## Production readiness review
{: #production-readiness-review }

The standard's admission checklist must be all "yes" before an agent is built, and it's reviewed again
before it goes live. Each item points at a file in the agent's folder:

| # | Item | Answered in |
|---|---|---|
| 1 | A function or workflow shown not to solve it | `docs/why-an-agent.md` |
| 2 | Purpose in one sentence; what it will never do | `purpose`, `neverDoes` |
| 3 | Owner and independent reviewer named | `owner`, `reviewer` |
| 4 | Own identity, task-based roles, no shared or personal credentials | `identity` |
| 5 | Every tool scoped and on the reviewed list | `tools` |
| 6 | Action catalog by level, with reversibility | `actionCatalog` |
| 7 | Retrieved content as data; prompts versioned | `stages/*.prompt.md` |
| 8–11 | Schemas with correlation id; coordination pattern justified; memory absent or approved; telemetry and run record | Contracts, docs, framework |
| 12 | At least 30 real cases with thresholds | `evaluation`, `evals/scenarios/` |
| 13 | Cost ceilings per run and per day, enforced in code | `costCeiling` |
| 14 | Kill switch exists, assigned and tested | `killSwitch`, `docs/runbook.md` |
| 15–18 | Threat model confirmed; dependencies; README; retirement steps | `docs/` |

Being honest about the homelab: items 1, 12 and 14 aren't fully met for the agents in shadow today.
Drift's why-an-agent is the template, it has 10 cases, and its runbook's kill-switch section is unfilled.

## Go-live checklist
{: #go-live-checklist }

For an agent entering the shadow stage on `wardens`:

- [ ] The manifest validates and `lifecycle.stage: shadow`; the registry routes it
- [ ] The image is built, signed and its digest committed to `apps/<agent>/values.yaml`
- [ ] Its namespace, service account, NetworkPolicy, ExternalSecrets and kill-switch ConfigMap exist
- [ ] Its LiteLLM keys (model and MCP-only) and its GitHub App or Entra app are in place
- [ ] A console sample run under the incident workflow finishes with a run record
- [ ] Its findings reach the right Slack audience
- [ ] It shows on the four dashboards, and its schedule (if any) shows its next fire

## Deployment runbook
{: #deployment-runbook }

Shipping a new agent, the path the system diagram's "Ship a new agent" use case replays:

1. Copy `templates/agent/` to `agents/<domain>/<agent>/`, fill in the manifest and README header, add
   it to the workspace members.
2. Add `.github/workflows/<agent>.yaml` (tests, then the reusable build on `main`).
3. In `homelab-gitops`, add `apps/<agent>/values.yaml` for the shared `wardens-agent` chart and its
   Argo CD Application in `clusters/wardens/`.
4. Seed its secrets in OpenBao under `kv/wardens/` and create its identities (GitHub App,
   Entra app with a federated credential in `infra-azure`).
5. Merge. The build commits the digest; Argo CD deploys; the worker registers its schedules at start.

> **TODO:** Steps 3 and 4 are by hand and across three repos. Is a golden path (ADR-0022's self-service
> template) planned for the homelab, or only for the Azure target?
{: .prompt-warning }

## Data migration plan
{: #data-migration-plan }

An agent brings no data. The only migration on go-live is the state store's schema, which runs as its
own Job before anything uses it (see [CI/CD](/posts/projects/platform-wardens/12-cicd-and-release-management/#database-deployment-strategy)).
An agent's first live runs are where its eval set grows: every run people score as wrong becomes a case.

## Smoke tests
{: #smoke-tests }

| Smoke test | Proves |
|---|---|
| `/healthz` on the console, relays and consumer | The edge is up |
| A console sample under the incident workflow | Routing, the worker, the model, notify and the run record end to end |
| `mcp_check` run in the agent's pod | Granted MCP tools work and the server's log names the agent and the trace id; an ungranted one is refused |
| A test alert (`WardensRoutingTest`) | The alert route reaches incident triage through the bus with one trace |

## Monitoring and alert validation
{: #monitoring-and-alert-validation }

Each alert is checked by making it fire once, on purpose, before it's trusted: a test denial at the tool
point should fire the P1 guardrail alert in Slack with its runbook link; pausing the drift schedule
should fire the paused-schedule alert; the bus restart fired `WardensIngressBusReset` exactly once when
it was first deployed. The rules themselves are unit-tested with promtool.

> **TODO:** The test denial and the paused-schedule checks are still to do (Platform Phase 6 steps 17
> and 18). Record the dates here when they've fired.
{: .prompt-warning }

## Support team readiness
{: #support-team-readiness }

On the homelab the support team is the author, so readiness means the runbook is filled in before it's
needed at 3 am: who can pull the kill switch, how, what it leaves behind, how to restore, and the common
situations (cost ceiling reached, the worker refusing an unpriced model, a task stuck in `working`,
approvals timing out). Drift's runbook has one situation written so far: the unpriced model.

## User and stakeholder communications
{: #user-and-stakeholder-communications }

Notifications go to audiences configured in `notify.yaml` (each an alias for one or more Slack channels,
Teams webhooks or mailboxes), so a new agent's messages land where its domain already looks. A go-live
is announced the same way the agents speak: a short message saying what the agent does, its level, and
that people score every run while it's in shadow.

## Cutover and rollback plan
{: #cutover-and-rollback-plan }

There's no cutover from an old system for most agents: they add a finding where there was none. Where
there is one (the daily drift scan already posts a Teams card from the pipeline), both run side by side,
which is also the cheapest gate evidence. Rollback, fastest first:

1. Engage the kill switch (within 60 seconds; open draft PRs stay drafts).
2. Set `quarantined: true` so it isn't routable.
3. Revert the digest commit in gitops.

## Launch decision and sign-off
{: #launch-decision-and-sign-off }

A gate is a decision with a stop option: the sponsor decides, on evidence the owner presents and the
independent reviewer confirms, and it's recorded as a `gates/0N-*.md` file in the agent's folder in the
same PR as the manifest change. The lifecycle design has CI refuse a level increase in the action
catalog without a matching promote file. On the homelab the sponsor and owner are the same person, which is exactly why the reviewer
has to be a different account.

## Checklist
{: #checklist }

- [ ] Every agent in shadow has its 18 admission items answered, or the gaps listed
- [ ] The go-live checklist above is run for each new agent
- [ ] Each alert has fired once on purpose, with the date recorded
- [ ] Every agent's runbook has its kill-switch section filled in and tested
- [ ] Gate decisions are files in `gates/`, merged with the manifest change
- [ ] The deployment steps in gitops and the infra repos are written down for the next agent

{% include project-nav.html %}
