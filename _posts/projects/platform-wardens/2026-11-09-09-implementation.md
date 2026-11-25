---
layout: post
title: "Platform Wardens: Implementation"
date: 2026-11-09 00:09:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Implementation]
description: "How Platform Wardens was built: one reference agent end to end, a framework grown from what agents needed, then split into a library and one repo per agent."
project: platform-wardens
project_step: 9
image:
  path: /assets/img/projects/platform-wardens/09-implementation.webp
  alt: "Platform Wardens: Implementation - Projects hero image"
---

Platform Wardens wasn't built framework-first. terraform-drift was taken end to end (schedule, model,
handoff, Slack, draft PR) while the framework grew underneath it, and every framework feature after
that was pulled in by an agent that needed it. Once there were six agents, the framework was hardened
into a versioned library and every agent moved to a repository of its own. The result is a framework
with a long "not yet" column, which is fine: that column is written down per module, and nothing in it
pretends to be done.

<!-- more -->

{% include project-nav.html %}

## Sprint or iteration planning
{: #sprint-or-iteration-planning }

There are no sprints. The unit of work is a roadmap step, and the unit of change is a pull request that
names its step. Large steps get a plan in `docs/plans/` with phases and a Progress table, and the
Progress table is the status of record (the event bus had eight phases; the web search server seven;
the move to one repository per agent ten, phases 0 to 9). In the repo's first two and a half weeks that
came to about 95 merged pull requests, 154 by 2026-11-17, and the pull request counter passed #390 by
2026-11-25; most of them small: one behaviour, its tests and its docs.

Picture a step like "terraform-drift merges its pull request after a Slack approval"
([ADR-0047](/posts/projects/platform-wardens/architecture-decision-records/#adr-0047)). It became a
decision and a plan with six steps: the framework's approve-then-act workflow (released in wardens
0.9.0), the agent's two level 2 actions (warden-terraform-drift 0.3.0), the deploy (its registry entry,
approved in the console, and the level 2 rule in wardens-deploy), the owner's steps (a GitHub App
permission, a Slack link), and a live check on a development stack. That's pull requests in four repos,
with the plan's row updated as each merged. The repo-per-agent plan ran the same way: the owner let it
go through the phases, merging its own pull requests, and stop only for an owner decision, a `sudo`
command or a failure it couldn't fix.

## Feature development
{: #feature-development }

The order things were built in, and what pulled each one in:

| Built | Pulled in by |
|---|---|
| Contracts, registry, guardrails, durable workflows, model access | terraform-drift's first end-to-end run |
| Scheduled runs from the manifest | Drift's weekly, then daily, run after the scan |
| Handoffs as child tasks, one message per incident | Drift handing each stack to the Change Correlator |
| GitHub App tokens, draft PRs | Drift's codify recommendation |
| The operator console | Tuning drift's prompts with the same task a schedule sends |
| The GitHub webhook | Not waiting a day after a scan found drift |
| Framework metrics, a trace per incident, dashboards | Not knowing what a run had done or cost |
| Conversations in one workflow | Stack Author |
| Rules-first routing, the Alertmanager webhook | Incident triage |
| The event bus | Webhooks holding a thread per request while waiting on Temporal |
| MCP client and `mcp-guard` | The first shared tool, web search |
| The incident view, console sends through the bus | An operator couldn't see one incident while it ran, and a console send skipped the path an alert takes |
| A versioned library, one repository per agent, wardens-deploy | 44 of 154 merges changing the framework and an agent in one PR, and practices followed by convention instead of enforced |
| Team chat: cell channels, threads as sessions, `/wardens ask` | An incident's reasoning visible only to the one person in the console |
| Approve then act, Slack approval cards | A drift run that recommended a revert asked nobody to approve it, so a person had to find it and act by hand |
| Registry approvals asked by CI, then the sync started by the console | The owner pasting manifests into the console and committing `approval.json` by hand; then a five-minute cron GitHub ran hours late |
| GitHub org change events, AWS CloudTrail, Jira tickets | The Change Correlator answering "who changed it" only for Azure, and never "why" |
| The console's Home tab, Approvals list and phone app | Checking the fleet and pressing Approve from a phone, without opening Grafana |

Each of those pieces is a function an agent calls. The call map below follows two agents into the framework:
terraform-drift (deterministic stages and two LLM stages) and stack-author (a chat with tools). Open a level
to see the files, then the functions; every function's panel gives its file and line. Pick a use case and press play to
watch one call travel, and tick **Details** to read what each check decides and what happens when it says no. It was
traced on 2026-11-09 and updated on 2026-11-16 and 11-18, when the agents were still folders in the monorepo, so the
file and line numbers are from that layout; the calls into `wardens` are the same in the agents' own repositories.

{% include diagram.html id="projects/platform-wardens/call-map" %}

Tracing the calls found three gaps the docs had glossed over. One is closed and the diagram draws the other two as
they are:

- Guardrail point 1 runs when the console, a webhook or the router builds a task, but not when a schedule fires.
- The MCP client is built and the gateway is live, but no agent stage calls it yet.
- Closed on 2026-11-16: stack-author's model had no circuit breaker, because its worker built the model without
  naming the agent. It names it now, and its tools get the manifest and the audit log, so their bounds are checked.

## API and UI implementation
{: #api-and-ui-implementation }

Agents have no API of their own; the edges are small HTTP servers in `wardens-services`, which agents
never install:

| Endpoint | Module | Answers |
|---|---|---|
| `POST /github` | `webhooks.github.receiver` (relay mode) | 202 started, 200 ignored or duplicate, 401 bad signature, 413 over 1 MB, 503 when the bus won't take it |
| Alerts | `webhooks.alerts` (relay mode) | Bearer token, then the same answers |
| `/slack/events`, `/slack/interactions`, `/slack/commands` | `webhooks.slack.relay` | Slack's signature and a 5-minute timestamp checked on the raw body, then published; the app's own posts are dropped |
| The console | `console` | Home, Agents, Incidents, the Author chat, Approvals, Memory, feedback and calibration pages; `/healthz` is the only path without sign-in |
| `/approvals` | `console` with `approval_endpoint` | Registry entries and level 2 actions waiting for a decision; a decision is signed or signalled and audited |
| `POST /api/registry-approvals`, `GET /api/registry-approvals/decided` | `console` | agent-ci asks for a registry approval; wardens-deploy's sync reads the signed records. Each takes only its own workflow's GitHub OIDC token |
| `GET /api/evals/feedback` | `console` | A page of one agent's verdicts for the nightly evals, through the read-only database role |

The console started as one HTML page and is still a small package of routes, but it grew where people
asked for it: a Home tab with tiles for the last 24 hours, 7 or 30 days (approvals waiting, executions and
their success rate, p95 run time, model cost, tool calls) built from the same PromQL as the Grafana fleet
dashboards, an Approvals list with "Waiting for you" and a count in the sidebar, and a manifest and
service worker so it installs on a phone, with an **Update now** button when a newer build is out.

## Database and infrastructure implementation
{: #database-and-infrastructure-implementation }

The `wardens` cluster, Temporal on `wardens-db`, the state store and the per-agent chart were built
through the Cloudutsuk Platform's
[Phase 6](/posts/projects/cloudutsuk-platform/03-product-planning/#phase-6-steps) (steps 7 to 12 and 22).
On the framework side, `wardens.state.postgres` added numbered migrations and stores for run records,
dedupe claims, the kill switch, the audit log, memory and artifacts, all chosen by `WARDENS_STATE_DSN`;
without it, the local file stores are used, which keeps local development free of a database. Twenty
migrations by wardens 0.10.0; the later ones are GitHub change events, action claims, verdicts and judge
samples, approval requests, the read-only roles, and team chat's links, threads, turns and expiry.

The split added infrastructure of its own: `wardens-deploy` (a Helm chart at its root that renders the
registry and config ConfigMaps), the router's own image and app, and homelab-gitops `agent-ci.yaml` as
the only way an agent image is built. Packages now come through the homelab's Nexus proxy: locally after
loading the Nexus account, in CI with a sign-in through OpenBao, and in image builds as BuildKit
secrets.

## Integration development
{: #integration-development }

The first real integration test was the drift-to-correlator handoff on a real portal deletion: drift
found the resource gone, handed the stack to the Change Correlator, and the message said who deleted it,
when and with which client. Drift and then the correlator took 27 seconds end to end. Integration work since has followed the
same pattern: build against recorded fixtures, then prove it once live and write down what happened.

Some integrations needed two tries, and the build log says so: delta-temporality metrics reached Mimir as
one sample per run and left every `rate()` panel empty until the workers sent cumulative metrics, and the
Event Hubs emulator's storage needed path-style URLs before the bus would run in the cluster.

The level 2 live check took three scans before the merge case passed (2026-11-23). The first ended in
"investigate" because the classifier's model call ran past 600 seconds: the chat model was scaled to zero
and still waking. The second classified the change correctly, but the YAML patcher refused, because the
tags were a block map and it patched only single-line values. The third opened the draft PR, asked in
the devops channel, the owner approved in Slack, and the agent squash-merged it. The revert case had
already passed the day before: approved in Slack, apply dispatched, the test tag gone. Both gaps became
the next agent release (block-map patches, and one more try when the model was asleep), and a card that
lost its console button showed that a pod reading config once at start needs a restart when the config
changes, which is why Reloader now rolls those pods.

## Technical debt tracking
{: #technical-debt-tracking }

Debt is tracked where the code is: the framework README's module table has an *Implemented* and a *Not
yet* column for every module. A sample of what's open:

| Module | Not yet |
|---|---|
| `guardrails` | Production stores for the kill switch and audit on the Azure target |
| `telemetry` | A scheduled-run interval gauge; feedback, recommendation and judge-calibration metrics |
| `llm` | Content-safety capabilities; logical model profiles |
| `routing` | A measured classifier threshold (until the routing eval runs on the real model, unmatched alerts go to a person); domain supervisors |
| `handoff` | The open decision on routing handoffs back through the top router |
| `state` | The incident workflow holding it; agents and the console using the stores beyond run records |
| `eval` | Cross-agent scenarios; a `postCheck` after an act |
| `runtime` | A Teams chat adapter; a production dedupe store |
| `docs` | check-agent requiring the written agent docs (design, model card, evaluation, data) once each agent has them |

Some of the debt is about the split itself: an agent's own `config/` and prompts still resolve from its
source tree, the release workflow's bump job is off until a repository variable turns it on (the owner
runs `wardens bump` until then), and the call map above still shows the monorepo's paths. Some agent docs are debt too:
drift's why-an-agent and ROI are still the template.

## Code reviews
{: #code-reviews }

Review checks the architecture first: no `temporalio` or model client outside their one module, no I/O
in `workflow.py`, act tools never in a model's tool set, schemas changed by expand then contract, and
the conformance matrix and module table updated. Then the agent's behaviour: is the eval set re-run,
does a new denial test have its allowed twin, does the README still match the manifest.

Since the split, much of that list is a command instead of a reviewer's memory. `lint-imports` and
pyright fail the framework's CI; `wardens check-agent` runs in every agent's CI and refuses a manifest,
folder layout, import, pin or agent card that breaks the rules; `wardens docs check` fails when a module
has no row in the tables or a link is broken; and `wardens release check` fails a contract tightening or
a stricter check-agent rule that isn't named as breaking. The org is on GitHub Free, so nothing can be a
required check: the owner reads the run before merging. Each agent repository has a `CLAUDE.md` with
its own rules, and there is still no pull request template.

## Developer documentation
{: #developer-documentation }

Three layers, each for a different question:

- **Why:** `docs/project-goal.md`, the rationale for Pydantic AI and Temporal, the decision log.
- **What:** the 27 design categories with the conformance matrix, the framework's module table,
  `contracts/README.md` for the cross-field rules, and a map of what an agent needs and where `wardens`
  provides it. Each agent repository adds its own README, design, generated agent card and changelog.
- **How:** the how-docs (routing, guardrails, ingress, MCP calls, run records, state, durable execution,
  model access, building an agent), each a short Q&A, and the system diagram's use cases replay them.

## Checklist
{: #checklist }

- [ ] Every PR names its roadmap step, and a framework change adds a CHANGELOG line
- [ ] The call map is re-traced on the agents' own repositories
- [ ] Every large step has a plan with a Progress table
- [ ] The module table's *Not yet* column is updated in the PR that closes an item
- [ ] Each integration is proven once live and the result written down
- [ ] Drift's why-an-agent and ROI are filled in
- [ ] The architectural review checks that no command covers are in a PR template

{% include project-nav.html %}
