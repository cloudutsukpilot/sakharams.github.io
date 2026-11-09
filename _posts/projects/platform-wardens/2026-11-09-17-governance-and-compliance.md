---
layout: post
title: "Platform Wardens: Governance and Compliance"
date: 2026-11-09 00:17:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Governance, Compliance]
description: "Governance in Platform Wardens is mostly code: lifecycle gates as files, autonomy in the manifest, owner and reviewer from different teams, and evidence from every run."
project: platform-wardens
project_step: 17
---

Governance for agents has a reputation for being a committee that slows things down. In Platform
Wardens most of it is a file in the right folder: a gate decision is a markdown file merged with the
manifest change it allows, an agent's level lives in its action catalog, and the evidence is the run
records and eval results the framework already produces. The committee still exists; it just reads
files instead of slides.

<!-- more -->

{% include project-nav.html %}

## Project governance
{: #project-governance }

The project conforms to a reference standard for multi-agent systems
([ADR-0006](/posts/projects/platform-wardens/architecture-decision-records/#adr-0006)), tracked category by
category in a conformance matrix. Changes to the plan go through the change-control process in
[Product Planning](/posts/projects/platform-wardens/03-product-planning/#change-control-process); changes
to the design go through a numbered decision record.

## Decision-making and approval authorities
{: #decision-making-and-approval-authorities }

| Decision | Who decides | On what |
|---|---|---|
| A lifecycle gate (G0 to G4) | The sponsor | Evidence from the owner, confirmed by the independent reviewer |
| Lowering a level (demotion) | Any owner, reviewer or the framework owner | No gate needed |
| An L2 action | A named approver in the owning domain's group, not the requester | The full parameters, bound to the action's idempotency key |
| The kill switch | The operators named in the manifest | Anything that looks wrong |
| A framework or design change | Framework owner, via a decision record | The options considered |

## Audit requirements
{: #audit-requirements }

Every task state change is recorded with a timestamp and the identity that caused it; every act-tool call
with its full (redacted) parameters; every approval names its approver; level changes, quarantine and
the kill switch are audit events too. An action doesn't run unless its pre-action audit event is
persisted. The log is append-only and hash-chained, with the chain's daily head kept in `mon`. See
[Audit logging](/posts/projects/platform-wardens/06-security-and-privacy/#audit-logging).

## Access reviews
{: #access-reviews }

At Specify, the identity is requested with its roles listed per tool, and the effective permissions are
reviewed as a whole (one tool's scope can look fine and the union can still be too much). In Operate,
access and permissions are reviewed quarterly. At retirement, the identity is revoked and the revocation
confirmed.

> **TODO:** No quarterly review has happened yet (the first agents went into shadow on 2026-11-01).
> When is the first one, and where is it recorded?
{: .prompt-warning }

## License management
{: #license-management }

The stack is open source: Temporal and Pydantic AI (MIT), OpenTelemetry (Apache 2.0), LiteLLM's open
core, SearXNG (AGPL 3.0) behind its MCP server. Running SearXNG unmodified as an internal service doesn't
trigger the AGPL's network clause the way modifying and serving it would.

> **TODO:** Is the dependency list's licence checked automatically (the SBOM is generated on every build),
> and are there any copyleft packages inside the agent images themselves?
{: .prompt-warning }

## Compliance reporting
{: #compliance-reporting }

The standard's monthly measures report per agent in Operate (runs, agreement with people, false actions,
cost, toil absorbed) is the compliance report: it's what a review body reads to keep, promote or demote
an agent. On the homelab, the dashboards hold the same numbers live.

## Data governance
{: #data-governance }

Every manifest declares its data classification and whether data may reach a model; redaction before the
model and before telemetry is code, tested per tool; run records reference inputs rather than copying
them; memory items carry classification, source, expiry and a review flag. External regulatory
obligations override the framework. See [Data and Integration](/posts/projects/platform-wardens/07-data-and-integration/#data-ownership-and-classification).

## Vendor and third-party management
{: #vendor-and-third-party-management }

| Third party | Managed by |
|---|---|
| Model providers | Reached only through the gateway; each model priced and versioned; a change is a re-evaluation ([ADR-0018](/posts/projects/platform-wardens/architecture-decision-records/#adr-0018)) |
| MCP servers | A reviewed list; tool definitions pinned by hash; the server reaches its backend with its own identity ([ADR-0031](/posts/projects/platform-wardens/architecture-decision-records/#adr-0031)) |
| A provider's own MCP server | Used only where it passes our acceptance test ([ADR-0016](/posts/projects/platform-wardens/architecture-decision-records/#adr-0016)) |
| Externally built agents | Held to the same manifest, identity and evaluation rules as our own |

## Policy enforcement
{: #policy-enforcement }

Policies are code, not prompts: the four guardrail points, the agents' `policies/`, the registry's
cross-field rules, Kyverno on the cluster (digest-pinned images, restricted security context, requests and
limits), the image gates in CI. A model may tighten a policy gate, never loosen it. Whether the
guardrail rules move to OPA once there are more of them and more owners is an open question; v1 keeps
them in Python, with tests.

## Evidence collection
{: #evidence-collection }

Evidence is collected as a side effect of running: the run record (evidence, decisions, cost), the trace,
the audit chain, the eval report. What the gates add is where it's filed: `gates/0N-*.md` in the agent's
folder, merged in the same PR as the manifest change. The proposed control-evidence rule
([ADR-0024](/posts/projects/platform-wardens/architecture-decision-records/#adr-0024)) makes a test count as
evidence only if it names the exact denial, has an allowed twin, and fails when the control is removed.

## Checklist
{: #checklist }

- [ ] Every gate decision is a file in `gates/`, merged with its manifest change
- [ ] Every manifest names an owner and a reviewer from different teams
- [ ] The first quarterly access review is scheduled
- [ ] Licences in the agent images are checked from the SBOM
- [ ] Every third party is reached through the gateway or the reviewed MCP list
- [ ] Proposed decisions the build has proven are moved to accepted

{% include project-nav.html %}
