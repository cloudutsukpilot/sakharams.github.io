---
layout: post
title: "Platform Wardens: Deployment and Go-Live"
date: 2026-11-09 00:13:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Deployment, Go-Live]
description: "Go-live in Platform Wardens is per agent: an 18-item admission checklist, a merge in the agent's own repo, a registry entry, and shadow as a launch that can't act."
project: platform-wardens
project_step: 13
image:
  path: /assets/img/projects/platform-wardens/13-deployment-and-go-live.webp
  alt: "Platform Wardens: Deployment and Go-Live - Projects hero image"
---

Platform Wardens doesn't have one go-live; every agent has its own, and it happens twice. The first time
the agent is deployed in the shadow stage, live but unable to act. The second time it's promoted to a
level where people act on what it says, or, since terraform-drift's level 2 actions, where it acts after a
person presses Approve. The deploy is the easy part (a merge in the agent's own repository); the readiness
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

Being honest about the homelab: items 1 and 14 still aren't fully met for the agents in shadow. Drift's
why-an-agent is still the template, and its runbook's kill-switch section is written (who, how, within 60
seconds, what it leaves, how to restore) but has no timed test on the cluster yet. Item 12 has moved: drift
has 38 eval cases now, though some of the harvested ones are unlabelled or can't run, which is why its
nightly gate still fails.

## Go-live checklist
{: #go-live-checklist }

For an agent entering the shadow stage on `wardens`:

- [ ] The manifest validates, `lifecycle.stage: shadow`, and `check-agent` passes
- [ ] agent-ci on `main` pushed a signed, attested image, committed its digest to `apps/<agent>/values.yaml`
  and published the registry entry to wardens-deploy (with an approval record if it raised risk)
- [ ] Its namespace, service account, NetworkPolicy, ExternalSecrets and kill-switch ConfigMap exist, and the
  app mounts its wardens-deploy registry and config ConfigMaps
- [ ] The router reports the agent's measured `wardens` version as `current`
- [ ] Its LiteLLM keys (model and MCP-only) and its GitHub App or Entra app are in place
- [ ] A console sample run under the incident workflow finishes with a run record
- [ ] Its findings reach the right Slack audience
- [ ] It shows on the fleet, agent and cost dashboards, and its schedule (if any) shows its next fire

## Deployment runbook
{: #deployment-runbook }

Shipping a new agent, the path the system diagram's "Ship a new agent" use case replays:

1. Add the `warden-<agent>` repository and its owning teams in `infra-github` (repositories and access are
   code since the split).
2. Render the agent: `wardens new-agent sre/lock-watch --cell sre --dest ../warden-lock-watch` (the
   example from the repo's own docs). It writes the manifest (one capability, one read tool, level 0), the
   pin and digest, the Dockerfile, Makefile, CI calling agent-ci, `CODEOWNERS` from the cell, the doc set
   and the agent card, then runs `check-agent` on the result. Fill in the manifest and README header.
3. In `homelab-gitops`, add `apps/<agent>/` (a wrapper of the shared `wardens-agent` chart, with
   wardens-deploy as a second source for its ConfigMaps) and its Argo CD Application, then pass the gitops
   target to agent-ci.
4. Seed its secrets in OpenBao under `kv/wardens/` and create its identities (GitHub App, Entra app with a
   federated credential in `infra-azure`).
5. Merge. agent-ci pushes the image, commits the digest and publishes the first registry entry (the lowest
   version of an agent is its baseline, so it needs no approval); Argo CD deploys; the worker registers its
   schedules at start.

> **TODO:** Step 2 is the golden path now; steps 3 and 4 are still by hand across three repos. The plan
> measures the onboarding time when `sql-blocking` is made with `wardens new-agent`: record it here, and
> decide whether the gitops and identity steps get a template too.
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
| Kyverno's PolicyReports for the new pod | The image is signed and carries the agent-ci attestation (8 of 8 policies passed for terraform-drift and stack-author when they moved) |
| The router's log after a publish | `registry … reloaded: added …`, so the new entry reached the router without a restart |

## Monitoring and alert validation
{: #monitoring-and-alert-validation }

Each alert is checked by making it fire once, on purpose, before it's trusted: a test denial at the tool
point should fire the P1 guardrail alert in Slack with its runbook link; pausing a schedule (cluster-upgrade-
readiness's weekly one is the only agent schedule since drift moved to scan events) should fire the
paused-schedule alert; the bus restart fired `WardensIngressBusReset` exactly once when
it was first deployed. The rules themselves are unit-tested with promtool.

> **TODO:** The test denial and the paused-schedule checks are still to do (Platform Phase 6 steps 17
> and 18). Record the dates here when they've fired.
{: .prompt-warning }

## Support team readiness
{: #support-team-readiness }

On the homelab the support team is the author, so readiness means the runbook is filled in before it's
needed at 3 am: who can pull the kill switch, how, what it leaves behind, how to restore, and the common
situations. Drift's runbook now has a dozen: the cost ceiling, an unpriced model, a task stuck in
`working` behind a cold model, a level 2 card nobody answered (denied after 24 hours, nothing merged), an
approval refused because the pull request or plan changed, and the App missing `actions: write` for a
revert's apply. The platform's own procedures are in the console's run book: the quarterly restore drill,
hold and resume, registry approvals, production feedback, Slack account links and installing the console
as a phone app.

## User and stakeholder communications
{: #user-and-stakeholder-communications }

Notifications go to audiences configured in `notify.yaml` (each an alias for one or more Slack channels,
Teams webhooks or mailboxes), so a new agent's messages land where its domain already looks. A go-live
is announced the same way the agents speak: a short message saying what the agent does, its level, and
that people score every run while it's in shadow. A level 2 action adds a second kind of message: the
approval card in the domain's Slack channel, with what will change (from the plan), Approve and Deny
buttons for linked users, and a link to the console's Approvals page as the fallback.

## Cutover and rollback plan
{: #cutover-and-rollback-plan }

There's no cutover from an old system for most agents: they add a finding where there was none. Where
there is one (the daily drift scan already posts a Teams card from the pipeline), both run side by side,
which is also the cheapest gate evidence. Rollback, fastest first:

1. Engage the kill switch (within 60 seconds; open draft PRs stay drafts, and an approved act stops
   before it writes).
2. Set `quarantined: true` so it isn't routable.
3. Revert the digest commit in gitops.

For a level 2 action there's a gentler step before all of these: lower it to level 1 (drift: remove the
`levelTwo` block) and release, and the agent goes back to draft pull requests with no approval request.

## Launch decision and sign-off
{: #launch-decision-and-sign-off }

A gate is a decision with a stop option: the sponsor decides, on evidence the owner presents and the
independent reviewer confirms, and it's recorded as a `gates/0N-*.md` file in the agent's folder in the
same PR as the manifest change. The lifecycle design has CI refuse a level increase in the action
catalog without a matching promote file. On the homelab the sponsor and owner are the same person, which is exactly why the reviewer
has to be a different account. The registry adds a check the gate files can't: a manifest change that
raises risk isn't deployable until a reviewer approves its entry on the console, and the signed record
sits next to the entry in wardens-deploy.

### The first level 2 go-live
{: #the-first-level-2-go-live }

terraform-drift's merge-on-approval ([ADR-0047](/posts/projects/platform-wardens/architecture-decision-records/#adr-0047))
was the first launch where an agent changes something, and it went in the order I'd use again: the
framework release (approve-then-act in `wardens` 0.9.0), the agent release, the deploy config letting the
drift channels carry level 2, the registry entry with its approval, then the owner's steps (the App's
`actions: write`, a linked Slack account). The live check on 2026-11-23 used a development stack: a ticket
in a commit, a tag added by hand, three scoped scans. The first ended `investigate` because the chat model
was scaled to zero and didn't wake in time; the second classified the change but the YAML patcher refused
a block map; after reshaping the file, the third opened a draft PR and posted the card, the owner pressed
Approve in Slack, the agent squash-merged it and the `main` run was green with nothing to apply. Each
failure turned into a follow-up, not a workaround.

## Checklist
{: #checklist }

- [ ] Every agent in shadow has its 18 admission items answered, or the gaps listed
- [ ] The go-live checklist above is run for each new agent
- [ ] Each alert has fired once on purpose, with the date recorded
- [ ] Every agent's runbook has its kill-switch section filled in and tested
- [ ] Gate decisions are files in `gates/`, merged with the manifest change
- [ ] The deployment steps in gitops and the infra repos are written down for the next agent
- [ ] A level 2 action goes live on a non-production stack first, with a live check recorded

{% include project-nav.html %}
