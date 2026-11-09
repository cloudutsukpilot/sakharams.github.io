---
layout: post
title: "Platform Wardens: Requirements Gathering"
date: 2026-11-09 00:02:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Requirements]
description: "What Platform Wardens must do and how well: entry points, routing, guardrails, run records, evals, and the rules that keep agents at L0 and L1."
project: platform-wardens
project_step: 2
---

The requirements for Platform Wardens come from an unusual place: a reference standard for multi-agent
systems, broken into 27 design categories, each with the questions it must answer. That makes the
"what must it do" easy to list. The hard part is the requirements that say what an agent must **never**
be able to do, because those have to hold even when the model is wrong.

<!-- more -->

{% include project-nav.html %}

## Functional requirements
{: #functional-requirements }

Grouped by the framework module that owns them:

| Area | The system shall |
|---|---|
| Entry points | Accept work from alerts, GitHub events, schedules and people; authenticate the requester, deduplicate, and create a root task with a correlation id and the channel's default limits |
| Routing | Route by capability: rules first, then a classifier, then a person when confidence is below the threshold |
| Registry | Load every agent from its manifest, refuse an invalid one, and route only to agents in shadow, promote or operate that aren't quarantined |
| Handoff | Let an agent hand work to another as a child task, with a hop budget, cycle checks, and limits that only narrow |
| Durable execution | Survive restarts mid-run, retry per activity, wait for approvals with a timeout that denies, and run schedules from manifests |
| Guardrails | Check every task at submission, every tool call, and every action at emit; enforce the kill switch; keep a hash-chained audit log |
| Models | Reach models only through `wardens.llm`, with the provider from configuration and a cost ceiling per run |
| Records | Write a run record for every run and one trace per incident |
| Notify | Send findings, approval requests and failure notices to Slack, Teams or email, and never fail a run because a notification failed |
| Evaluation | Score an agent's cases, block promotion on any unmeasured floor, and report regressions against a baseline |

Each agent then adds its own: terraform-drift shall explain each drifted attribute and recommend codify,
revert or investigate; the Change Correlator shall say who changed or deleted a resource, when and with
which client.

## Non-functional requirements
{: #non-functional-requirements }

| Quality | Requirement | Where it's checked |
|---|---|---|
| Safety | Unlisted actions are impossible: an empty action catalog by default, `additionalProperties: false` everywhere, act tools never callable by a model | Guardrail tests, evals with injection scenarios |
| Containment | The kill switch stops an agent within 60 seconds and fails closed | Phase 0 step 7's *Done when* |
| Durability | No run is lost to a pod restart | Temporal; worker restart tests |
| Burst handling | 1,000 alerts and 5,000 GitHub events lose nothing; every expected run starts within 5 minutes | The bus load test |
| Observability | Every run has a run record and OpenTelemetry GenAI spans; one trace per incident | Dashboards in `mon` |
| Cost | Every run stays within its ceiling; workers refuse a model with no price | `usage_limits`, the cost dashboard |
| Tool count | At most 13 tools per agent | Manifest schema |
| Determinism | `workflow.py` does no I/O, uses no clock, randomness or model | Code review; replay tests |
| Privacy | Secrets and per-label sensitive keys are redacted before a model or telemetry sees them | Redaction tests per tool |

> **TODO:** What availability does the homelab deployment need? The daily drift run tolerates an hour's
> outage; the SRE agents taking every critical alert may not.
{: .prompt-warning }

## User journeys and use cases
{: #user-journeys-and-use-cases }

The six journeys the system diagram replays, from the repo's how-to documents:

1. **Scheduled drift with a handoff.** At 08:00 UTC, two hours after the drift scan, terraform-drift
   reads the scan's plans, explains each drifted attribute, hands each stack to the Change Correlator,
   and one Slack message lists every stack with what, who, when, why and the next step.
2. **An alert or GitHub event through the bus.** A firing alert or a signed GitHub delivery is published
   to the bus, the consumer routes it by rule and starts the incident.
3. **An LLM stage behind guardrails.** A stage calls the model through LiteLLM; every tool call the model
   makes is checked against the manifest; shared tools go through MCP and `mcp-guard`.
4. **A chat with Stack Author.** A person asks for a resource, answers the agent's questions by clicking
   choices, sees the exact `resources.yaml` diff, and presses the button that opens a draft PR.
5. **Ship a new agent.** Copy the template, fill in the manifest, add the values file in gitops, merge;
   the build signs the image and Argo CD deploys it.
6. **A level 2 approval (planned).** The approver opens the request, signs in, sees the full parameters,
   and the workflow continues or times out to deny.

Try them in the [system diagram](/posts/projects/platform-wardens/05-technical-architecture/#system-context-and-component-architecture).

## Acceptance criteria
{: #acceptance-criteria }

Acceptance is per gate, and the gates are the same for every agent:

| Gate | Accepted when |
|---|---|
| G0 Qualify | A why-an-agent statement shows each simpler option (function, workflow, single model call) fails, with an owner and a business measure |
| G1 Specify | The manifest validates, the threat model is filled in row by row, and there are at least 30 eval cases per action |
| G2 Build | The evals meet their floors, the run record and the kill switch are proven |
| G3 Shadow | Live L0 runs scored by people meet the floors, with zero safety failures |
| G4 Promote | Evidence for the new level, an ROI write-up, and the reviewer's sign-off |

Written as a scenario for drift's first L1 output:

```gherkin
Given infra-azure's daily scan found a resource changed in the portal
When terraform-drift's scheduled run finishes
Then the Slack message names the stack, the attribute, who changed it and when
And a draft PR proposes either codifying the change or reverting it
And the run record links the findings, the plan and the cost
```

## Business rules
{: #business-rules }

These are code, not conventions:

- **Agents act only in their own domain.** Alerts go to SRE; a problem on another domain's system
  becomes a suggested handoff, and approvals go to the team that owns the system.
- **The owner and the reviewer are on different teams.** The registry refuses a manifest where they
  match.
- **A draft PR is an L1 recommendation.** A person always merges.
- **A fix PR's level depends on what opening it can reach.** Where opening a PR runs a pipeline that
  reaches secrets, it needs approval (L2); where it reaches none, it's L1.
- **Limits only narrow.** A child task's level and cost can't exceed its parent's or the target's own
  grants.
- **Unset is unset.** A configuration value in angle brackets is skipped or refused, never guessed.

## Reporting and analytics requirements
{: #reporting-and-analytics-requirements }

Four Grafana dashboards in `mon`: fleet operations, agent detail, model usage and cost, and Temporal
workflow operations, plus an event bus dashboard. Alert rules cover reliability, safety (a guardrail
denial is P1), cost, tools and approvals, each with a runbook link and a downgrade while an agent is in
shadow.

The target plan adds a **monthly measures report** per agent in the operate stage: runs, agreement
with people, false actions, cost per run and toil absorbed, which is what promotion and demotion
decisions read.

## Accessibility and localization requirements
{: #accessibility-and-localization-requirements }

This barely applies, and that's honest: the interfaces are Slack messages, draft PRs, a small operator
console and Grafana. Two things still matter. Slack messages use tables and plain text rather than
colour alone to show status, and the console's choices are buttons with text labels that also accept a
typed number. Everything is in English; there's no plan to localize an internal operations tool.

## Regulatory, legal, and compliance requirements
{: #regulatory-legal-and-compliance-requirements }

Every manifest declares the most sensitive data the agent may touch (`dataClassification.highest`),
how it's handled, and whether it may reach a model. Operational data looks harmless, but SQL text,
table names, error messages that echo row values and log lines can carry regulated content, and once it
reaches a prompt it sits in the model provider's path and in traces. So redaction happens before the
model and before telemetry, in code, tested per tool.

On the homelab the models are local, which removes the provider question but not the telemetry one.

> **TODO:** For the Azure target, which data classification labels apply and may any regulated content
> reach an approved model endpoint at all? The repo lists this as open, and external obligations
> override the framework.
{: .prompt-warning }

## Prioritization and release scope
{: #prioritization-and-release-scope }

| Must (v1) | Should | Won't (v1) |
|---|---|---|
| Framework core, guardrails, run records | Routing classifier with a measured threshold | Any L2 action in production |
| terraform-drift at L1 with handoffs | Event bus with storm mode and coalescing | Group chat between agents |
| Alert entry point and incident triage at L0 | Long-term memory with review | More than two coordinating levels |
| Dashboards and alerts | Stack Author and CI/CD triage at L1 | The Azure target in production |

The full order is in [Product Planning](/posts/projects/platform-wardens/03-product-planning/#phase-steps).

## Checklist
{: #checklist }

- [ ] Every functional requirement maps to a framework module or an agent's manifest
- [ ] Every non-functional requirement has a place it's checked
- [ ] Each running agent has a filled-in why-an-agent statement (drift's is still the template)
- [ ] Each action has at least 30 eval cases before G3
- [ ] Data classification is declared in every manifest
- [ ] The availability need for the SRE agents is agreed
- [ ] The business rules are covered by tests that fail when the rule is removed

{% include project-nav.html %}
