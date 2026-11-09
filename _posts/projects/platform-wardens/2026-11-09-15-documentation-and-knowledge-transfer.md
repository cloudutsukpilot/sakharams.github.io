---
layout: post
title: "Platform Wardens: Documentation and Knowledge Transfer"
date: 2026-11-09 00:15:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Documentation]
description: "Platform Wardens' docs: 27 design categories, a decision log, how-docs, per-agent folders and a manifest that's the source of truth everything else restates."
project: platform-wardens
project_step: 15
image:
  path: /assets/img/projects/platform-wardens/15-documentation-and-knowledge-transfer.webp
  alt: "Platform Wardens: Documentation and Knowledge Transfer - Projects hero image"
---

Platform Wardens is documented more heavily than it's coded, and on purpose: an agent framework is a
set of promises (what an agent can never do, who decides, what gets recorded), and a promise nobody can
find isn't one. The rule that keeps the docs honest is that the manifest is the source of truth, and
every README and diagram restates it rather than inventing its own version.

<!-- more -->

{% include project-nav.html %}

## Product documentation
{: #product-documentation }

| Document | Answers |
|---|---|
| `README.md` | What the framework is, the three layers, the agents and their status, getting started |
| `docs/project-goal.md` | The goal, the v1 horizon, the proposed catalog, the complexity ladder |
| `docs/phases/` | The phased plan for the Azure target |
| This playbook | The same, for a reader outside the repo, kept in step with each phase |

## User guides
{: #user-guides }

The users are operators, infra owners and requesters, and their guides are short: each agent's README
says how to use it ("open the Author tab of the console and describe the change"), what it does and
doesn't do, and how to run it locally. The console's samples double as a guide: each one is a request
with a title and a description that shows what the agent expects.

## API documentation
{: #api-documentation }

The framework's API for agents is its public Python surface; `framework/README.md` documents it module
by module with what's built and what isn't. The contracts are the API between everything else: the JSON
Schemas in `contracts/schemas/` plus `contracts/README.md` for the cross-field rules a schema can't
express. The edges (webhooks, the console) are documented with their status codes in the framework
README.

## Architecture documentation
{: #architecture-documentation }

- **27 design categories** (topology, routing, contracts, identity, guardrails, approval, audit,
  evaluation, threat model, deployment, kill switch and more), each with what it decides, the standard's
  requirements, the design, failure modes and what's open.
- **The conformance matrix** against the reference standard.
- **The decision log**, published here as the
  [ADR log](/posts/projects/platform-wardens/architecture-decision-records/).
- **Interactive diagrams** built from `diagram.yml`: the platform as built (ported into
  [Technical Architecture](/posts/projects/platform-wardens/05-technical-architecture/#system-context-and-component-architecture)),
  an incident flow across three domains, the hybrid model and the Azure target.

## Deployment instructions
{: #deployment-instructions }

Deployment is documented where it happens: `deploy/README.md` in the wardens repo points to
`homelab-gitops`, whose `apps/<agent>` folders and the shared `wardens-agent` chart hold the real
configuration, and the Cloudutsuk Platform playbook records each step. The repo's how-to on building
an agent ends with shipping it. See [Deployment runbook](/posts/projects/platform-wardens/13-deployment-and-go-live/#deployment-runbook).

## Operations runbooks
{: #operations-runbooks }

One per agent (`docs/runbook.md`) and one runbook section per alert. They're the weakest part of the
docs today: the template is good, the content is thin. See
[Operational runbooks](/posts/projects/platform-wardens/14-operations-and-observability/#operational-runbooks).

## Troubleshooting guides
{: #troubleshooting-guides }

The how-docs are written as questions people actually ask: how routing works, how guardrails work, how
an MCP call is checked, how run records and state work, how ingress works, how durable execution works,
how model access works, how to build an agent. Each one is short, and the system diagram's use cases
replay most of them, so "why didn't my alert start anything?" has a page and an animation.

## Support procedures
{: #support-procedures }

Support is the operator role: score shadow runs, approve L2 actions (later), pull the kill switch. The
procedure for each is in the agent's runbook and the kill-switch design (quarantine, cancel, revoke,
scale to zero, disable identity). Escalation goes to the agent's `escalation` audience in its manifest.

## Onboarding documentation
{: #onboarding-documentation }

For a new contributor, in this order:

1. `README.md`, then `CLAUDE.md` for the rules that span files (layers, the import rules, determinism,
   the manifest as source of truth, contracts first).
2. `agents/devops/terraform-drift/`, the reference agent end to end.
3. `templates/agent/` and the how-doc on building an agent.
4. The design category for whatever they're about to change, and its row in the conformance matrix.

## Training materials
{: #training-materials }

There's no course. The repo has executive summaries and a slide deck under `reports/`, and the
interactive diagrams are the closest thing to training: each use case walks one request through the real
components with the protocol on every hop. The [interview questions](/posts/projects/platform-wardens/interview-questions/)
post in this playbook doubles as a self-test.

## Checklist
{: #checklist }

- [ ] Every agent's README header matches its manifest
- [ ] The conformance matrix and module table are updated with each framework change
- [ ] Every decision is a numbered record and synced to the ADR log here
- [ ] Every agent's runbook is filled in beyond the template
- [ ] The system diagram is re-ported after each phase step that changes it
- [ ] A new contributor can ship a toy agent from the onboarding order alone

{% include project-nav.html %}
