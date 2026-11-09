---
layout: post
title: "Platform Wardens: Implementation"
date: 2026-11-09 00:09:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Implementation]
description: "How Platform Wardens was built: one reference agent end to end first, then the framework grown from what it needed, with the debt tracked per module."
project: platform-wardens
project_step: 9
image:
  path: /assets/img/projects/platform-wardens/09-implementation.webp
  alt: "Platform Wardens: Implementation - Projects hero image"
---

Platform Wardens wasn't built framework-first. terraform-drift was taken end to end (schedule, model,
handoff, Slack, draft PR) while the framework grew underneath it, and every framework feature after
that was pulled in by an agent that needed it. The result is a framework with a long "not yet" column,
which is fine: that column is written down per module, and nothing in it pretends to be done.

<!-- more -->

{% include project-nav.html %}

## Sprint or iteration planning
{: #sprint-or-iteration-planning }

There are no sprints. The unit of work is a roadmap step, and the unit of change is a pull request that
names its step. Large steps get a plan in `docs/plans/` with phases and a Progress table (the event bus
had eight phases; the web search server seven). In the repo's first two and a half weeks that came to
about 95 merged pull requests, most of them small: one behaviour, its tests and its docs.

Picture a step like "a drift scan that finds drift starts the agent at once". It became a decision, a
webhook module, a chart change, a tunnel route and a gitops values change, each its own PR, in three
repos, with the step's row updated as each merged.

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

Each of those pieces is a function an agent calls. The call map below follows two agents into the framework:
terraform-drift (scheduled, deterministic stages and two LLM stages) and stack-author (a chat with tools). Open a level
to see the files, then the functions; every function's panel gives its file and line. Pick a use case and press play to
watch one call travel, and tick **Details** to read what each check decides and what happens when it says no.

{% include diagram.html id="projects/platform-wardens/call-map" %}

Tracing the calls found three gaps the docs had glossed over, and the diagram draws them as they are:

- Guardrail point 1 runs when the console, a webhook or the router builds a task, but not when a schedule fires.
- stack-author's model has no circuit breaker: its worker builds the model without naming the agent.
- The MCP client is built and the gateway is live, but no agent stage calls it yet.

## API and UI implementation
{: #api-and-ui-implementation }

Agents have no API of their own; the framework's edges are small HTTP servers in the `wardens.runtime`
package:

| Endpoint | Module | Answers |
|---|---|---|
| `POST /github` | `github_webhook` (relay mode) | 202 started, 200 ignored or duplicate, 401 bad signature, 413 over 1 MB, 503 when the bus or Temporal won't take it |
| Alerts | `alert_webhook` (relay mode) | Bearer token, then the same answers |
| The console | `console` | Send, preview, recent runs, the Author tab, Auto; `/healthz` is the only path without sign-in |
| The approval endpoint | `durable` (core only) | Verifies the OIDC token and signals the workflow; not hosted yet |

The console is one HTML page from the framework, which is all it needs to be.

## Database and infrastructure implementation
{: #database-and-infrastructure-implementation }

The `wardens` cluster, Temporal on `wardens-db`, the state store and the per-agent chart were built
through the Cloudutsuk Platform's
[Phase 6](/posts/projects/cloudutsuk-platform/03-product-planning/#phase-6-steps) (steps 7 to 12 and 22).
On the framework side, `wardens.state.postgres` added numbered migrations and stores for run records,
dedupe claims, the kill switch, the audit log, memory and artifacts, all chosen by `WARDENS_STATE_DSN`;
without it, the local file stores are used, which keeps local development free of a database.

## Integration development
{: #integration-development }

The first real integration test was the drift-to-correlator handoff on a real portal deletion: drift
found the resource gone, handed the stack to the Change Correlator, and the message said who deleted it,
when and with which client. Drift and then the correlator took 27 seconds end to end. Integration work since has followed the
same pattern: build against recorded fixtures, then prove it once live and write down what happened.

Some integrations needed two tries, and the build log says so: delta-temporality metrics reached Mimir as
one sample per run and left every `rate()` panel empty until the workers sent cumulative metrics, and the
Event Hubs emulator's storage needed path-style URLs before the bus would run in the cluster.

## Technical debt tracking
{: #technical-debt-tracking }

Debt is tracked where the code is: the framework README's module table has an *Implemented* and a *Not
yet* column for every module. A sample of what's open:

| Module | Not yet |
|---|---|
| `durable` | Hosting for the approval endpoint and its page |
| `guardrails` | Production stores for the kill switch and audit on the Azure target |
| `telemetry` | Live `chat` and `execute_tool` spans from hooks; structured log export |
| `llm` | Content-safety capabilities; a run-wide budget across activities; logical model profiles |
| `routing` | A measured classifier threshold; domain supervisors |
| `state` | The incident workflow holding it; agents using every store beyond run records |
| `eval` | Cross-agent scenarios; rubric-judge scoring; CI wiring |
| `runtime` | A Teams chat adapter; a production dedupe store |

Some agent docs are debt too: drift's why-an-agent and ROI are still the template.

## Code reviews
{: #code-reviews }

Review checks the architecture first: no `temporalio` or model client outside their one module, no I/O
in `workflow.py`, act tools never in a model's tool set, schemas changed with every caller, and the
conformance matrix and module table updated. Then the agent's behaviour: is the eval set re-run, does a
new denial test have its allowed twin, does the README still match the manifest.

The repo has no pull request template yet, so these checks live in the contributor notes. A short
template would make them harder to skip.

## Developer documentation
{: #developer-documentation }

Three layers, each for a different question:

- **Why:** `docs/project-goal.md`, the rationale for Pydantic AI and Temporal, the decision log.
- **What:** the 27 design categories with the conformance matrix, the framework's module table,
  `contracts/README.md` for the cross-field rules.
- **How:** the how-docs (routing, guardrails, ingress, MCP calls, run records, state, durable execution,
  model access, building an agent), each a short Q&A, and the system diagram's use cases replay them.

## Checklist
{: #checklist }

- [ ] Every PR names its roadmap step
- [ ] Every large step has a plan with a Progress table
- [ ] The module table's *Not yet* column is updated in the PR that closes an item
- [ ] Each integration is proven once live and the result written down
- [ ] Drift's why-an-agent and ROI are filled in
- [ ] The architectural review checks are in a PR template

{% include project-nav.html %}
