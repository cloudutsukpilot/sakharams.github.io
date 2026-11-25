---
layout: post
title: "Platform Wardens: Architecture Decision Records"
date: 2026-10-08 00:30:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Architecture, ADR]
description: "Every architecture decision behind Platform Wardens, with its context, the options considered and the consequences."
project: platform-wardens
project_adrs: true
image:
  path: /assets/img/projects/platform-wardens/architecture-decision-records.webp
  alt: "Platform Wardens: Architecture Decision Records - Projects hero image"
---

Every significant decision in Platform Wardens is written down as an architecture decision record (ADR): what
forced the decision, what was decided, which options lost and why, and what it costs. This post is the
full log, generated from the project's repo (`platform-wardens/docs/decisions`), so it always matches what the project works to.

<!-- more -->

{% include project-nav.html %}

## How to read this log
{: #how-to-read-this-log }

- **Proposed** decisions are still waiting on evidence, such as a spike or a baseline; **accepted** ones
  are what the platform is built to. A changed decision never edits an accepted ADR: a new ADR replaces
  it and the old one is marked **superseded**, with a link forward, so the history stays.
- Each ADR names the repos it affects. The summary table is in the
  [Technical Architecture](/posts/projects/platform-wardens/05-technical-architecture/#architectural-decision-records) post.

<!-- adr:begin -->
{% raw %}

## ADR-0001: Autonomy level: tiered per action
{: #adr-0001 }

<span class="adr-status adr-status-superseded">Superseded by <a href="#adr-0007">ADR-0007</a></span> <span class="adr-meta text-muted">2026-10-08 · `platform-wardens`</span>

#### Context

Whether agents act in production or only diagnose and recommend drives most other open decisions: identity and RBAC scope, the approval workflow, guardrail depth, durability of state, and audit requirements. It had to be settled before those could be designed.

Both existing assets already sit near the boundary. Terraform drift detection opens a PR that a human merges. The SQL blocking agent has a dedicated "action" sub-agent with a mandatory approval gate.

#### Decision

Autonomy is assigned **per action (per tool), not per agent or globally**, on a tier scale. v1 ships tier 0 and tier 1 only. Tier 2 is granted to an individual tool only after that tool's action path has passed evaluation. The tier concept exists in the tool-permission schema from day one, even while nothing sits above tier 1.

```mermaid
flowchart LR
    T0[Tier 0: Diagnose<br/>read-only tools] --> T1[Tier 1: Recommend<br/>proposed action as artifact,<br/>human executes]
    T1 --> T2[Tier 2: Gated execute<br/>agent executes an allowlisted action<br/>after per-action human approval]
    T2 -.-> T3[Tier 3: Autonomous<br/>out of scope]
```

| Tier | Agent may | Human role |
| --- | --- | --- |
| 0 | Call read-only tools | None |
| 1 | Produce a proposed action (command, PR, runbook step) | Executes it |
| 2 | Execute an allowlisted action | Approves each execution |
| 3 | Execute without approval | Out of scope |

#### Considered options

- **Recommend-only everywhere**: rejected. It caps the value at a runbook generator with limited MTTR gains, and if the permission and state models are built without an execution path, adding execution later forces a re-architecture.
- **Gated execution from v1**: rejected. It puts identity, approval, and audit design on the critical path of the first release, and it would grant write access before any action path has been evaluated, contradicting "agents are evaluated before they are trusted".
- **Autonomy set per agent**: rejected. It is too coarse. One agent typically mixes harmless reads with a single risky write, so a per-agent grant over-permissions everything else that agent does.

#### Consequences

- v1 needs only read-only identities. Blast radius is limited to data exposure through read access.
- The tool-permission schema must carry a tier per tool per agent from the start. The design-reviewer should flag any write-capable tool without a tier-2 justification.
- Promoting a tool to tier 2 brings in requirements that v1 does not have:
  - write-scoped, ideally just-in-time, credentials
  - an approval bound to the exact action rather than the intent
  - durable state between approval and execution, so a crash cannot drop or duplicate the action
  - protection against running the same action twice, plus rollback or compensating actions
  - an audit trail strong enough for compliance
- **Failure mode to watch:** pressure to promote tools to tier 2 before evaluation coverage exists. The promotion criteria must be explicit.
- **Follow-up decisions:**
  - Tier-2 promotion criteria: the evaluation bar and who can authorise a promotion.
  - Identity and permissions, and Approval workflow, now only need to cover the tier-2 path in detail.

#### Related

- **Resolves open decision:** Autonomy level

## ADR-0002: Routing pattern: hierarchical per-domain supervisors, introduced lazily
{: #adr-0002 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-10-08 · `platform-wardens`</span>

#### Context

The expected number of specialists per domain is large enough that a single router choosing among all of them will eventually see its prompt grow unwieldy and its routing accuracy drop.

Two design principles pull the other way. Supervisors in front of domains with only one or two specialists add a hop (latency, cost, possible context loss) with no routing benefit. A supervisor per domain from day one also turns the DevOps/SRE/DBA groupings into agents, which risks the org-chart split the principles warn against.

#### Decision

The target architecture is **hierarchical**: a top-level router in front of per-domain supervisors, with each supervisor in front of its specialists. Supervisors are **introduced lazily**. A domain gets its own supervisor only once it has enough specialists to need one. Until then, its specialists register directly under the top-level router, with their domain kept as metadata.

```mermaid
flowchart TB
    subgraph Early[Early: domain below threshold]
        R1[Top-level router] --> A1[SRE triage]
        R1 --> A2[SQL blocking]
        R1 --> A3[Terraform drift]
    end
    subgraph Later[Later: SRE crosses threshold]
        R2[Top-level router] --> S[SRE supervisor]
        S --> B1[SRE triage]
        S --> B2[K8s troubleshooting]
        S --> B3[Log investigation]
        R2 --> B4[SQL blocking]
        R2 --> B5[Terraform drift]
    end
```

#### Considered options

- **Single supervisor only**: rejected. It doesn't scale to the expected number of specialists.
- **Hierarchical supervisors for every domain from day one**: rejected. Supervisors in front of one or two specialists add hops without improving routing, against "start with fewer agents than seems necessary". It also makes the domains into agents, against "split by task, not by org chart".
- **Event-driven triggering as the routing pattern**: reason not recorded. Alert and webhook triggers are still possible as an entry point; that is tracked under the separate Entry points decision.

#### Consequences

- **Agent contract:** the framework must treat "specialist" and "supervisor" as the same kind of routable node. Promoting a domain is then a change to the routing configuration, not changes to each specialist. Every specialist must carry domain metadata from the start.
- **Cost and latency:** each promoted domain adds one hop per request routed into it. This should be visible in tracing so the cost of a promotion can be measured.
- **Failure modes:**
  - **Routing gaps:** a supervisor that misroutes, or doesn't route at all, takes out every specialist behind it. Each supervisor needs its own evaluation scenarios before promotion.
  - **Lost context in cross-domain handoffs:** once domains have supervisors, SRE triage → SQL blocking may cross two supervisors. Handoff state must be explicit and structured, not reconstructed from conversation.
- **Permissions:** supervisors only route. They should hold no tool grants, so a supervisor adds no blast radius of its own.
- **Follow-up decisions** (still open):
  - the threshold for giving a domain its own supervisor (a specialist count, or measured routing accuracy)
  - the path for cross-domain handoffs: direct between specialists, or always through the top-level router

#### Related

- **Resolves open decision:** Routing pattern (partly; see Consequences)

## ADR-0003: Agent framework: Pydantic AI for all agents
{: #adr-0003 }

<span class="adr-status adr-status-superseded">Superseded by <a href="#adr-0005">ADR-0005</a></span> <span class="adr-meta text-muted">2026-10-09 · `platform-wardens`</span>

#### Context

The original direction assumed LangGraph. The SQL blocking agent, the most mature existing asset, migrated from LangChain/LangGraph to Pydantic AI and documented why (`agent-pydantic-sql-blocking/sql-blocking-agent/docs/WHY_PYDANTIC_AI.md`). The Terraform drift agent is still on LangGraph.

The design principles make every specialist narrow: a small tool set, mostly deterministic logic, and a few schema-bound LLM steps. That is the workload Pydantic AI was chosen for in the SQL blocking agent.

#### Decision

**Pydantic AI is the agent framework for every agent:** specialists, the top-level router, and domain supervisors. LangGraph is not used.

- All LLM calls go through `wardens.llm`, which wraps Pydantic AI. Agents never construct a model client themselves.
- LLM output is always a typed Pydantic model (`output_type`), with validation retries.
- Orchestration *within* an agent is a plain async state machine (`workflow.py`).
- Orchestration *between* agents (routing, handoff, shared state, approval) is framework code in `wardens`, not a graph library.
- Durable execution (Temporal) is out of scope for now.

#### Considered options

- **LangGraph (the original assumption)**: rejected. Rationale from WHY_PYDANTIC_AI.md:
  - It required manual JSON parsing and offered no built-in validation retries.
  - Its dependency tree is heavy relative to the small part each agent used.
  - Token and cost telemetry was not first-class.
  - The SQL agent's flow is nearly linear and doesn't need a general graph runtime.
- **Pydantic AI for agents with LangGraph for cross-agent orchestration**: rejected. It runs two orchestration models and two sets of state semantics side by side. Cross-agent coordination is framework-owned anyway (decision 0002).
- **Raw model SDK, no framework**: rejected. It would mean re-implementing structured-output validation, retries, and telemetry.

#### Consequences

**What gets easier**
- One typed boundary everywhere: tool I/O, LLM output, agent state, and contracts are all Pydantic models.
- Keyless auth to Azure AI Foundry via `DefaultAzureCredential` and workload identity.
- Per-agent token telemetry through Logfire and OpenTelemetry.
- The SQL blocking agent migrates without a framework rewrite.

**What the framework must build itself** (no LangGraph runtime to inherit):
- routing and handoff correctness (decision 0002)
- cycle and hop-budget enforcement
- human-approval interrupts
- persistence of incident state

**Durability gap.** With no checkpointer and Temporal out of scope:
- An agent crash mid-incident loses state that is in flight. That is acceptable at tiers 0–1 (decision 0001), because nothing is executed.
- Before any tool reaches tier 2, the framework needs durable state between approval and execution, per decision 0001.

**Revisit triggers** (adapted from WHY_PYDANTIC_AI.md §8): reconsider durable execution when either of these occurs:
- the first tool is promoted to tier 2
- incident workflows must resume across restarts

Pydantic AI's durable-execution integrations (Temporal, DBOS, Prefect) wrap the same agents, so this is an addition rather than a rewrite.

**Other risks and follow-up work**
- **Version churn.** Pydantic AI's API moves fast. Pin it in the workspace and upgrade all agents together.
- **Smaller ecosystem.** There are fewer prebuilt integrations than LangChain offers. Tools come from our own MCP servers anyway.
- **Migration work.** The Terraform drift agent must be ported from LangGraph when it moves into this repo.
- **Approval pattern.** Approval stays at the orchestrator level, not Pydantic AI's deferred-tool approval, because destructive actions are never LLM tool calls.
- **Model hosting stays open.** Pydantic AI is model-agnostic, so this decision doesn't constrain it.

#### Related

- **Status note:** (durable-execution clause earlier superseded by [0004](#adr-0004)). The choice of Pydantic AI was restored by [0012](#adr-0012).
- **Resolves open decision:** n/a (confirms the "Agent framework" assumption in the project's technical direction; replaces the original LangGraph assumption)

## ADR-0004: Durable execution: Temporal
{: #adr-0004 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-10-09 · `platform-wardens`</span>

#### Context

Decision 0003 chose Pydantic AI and deferred durable execution. That left a gap:
- A crash mid-incident loses state that is in flight.
- Approvals have no durable wait.
- Decision 0001 requires durable state between approval and execution before any tool reaches tier 2.

The SQL blocking agent already runs on Temporal in an opt-in mode (`docs/DURABLE_AGENT.md` in that repo), and a Temporal instance exists for it in dev.

#### Decision

Temporal is the framework's durable execution layer, used for checkpointing, human approval, retries, and incident history. It lives in the framework (`wardens.durable`). Agents do not import `temporalio`.

| Concept | Temporal mapping |
| --- | --- |
| Incident | Parent workflow; holds the shared incident state |
| Agent run (incl. a handoff target) | Child workflow on that agent's task queue |
| Stage (LLM or deterministic) | Activity with a bounded retry policy |
| Human approval | Signal plus a timed wait; **timeout = deny** |
| Pending approval visibility | Workflow query |

Temporal is the only execution mode. There is no second in-process loop mode as in the SQL blocking agent. Local development uses `temporal server start-dev`; tests use the time-skipping test environment.

```mermaid
sequenceDiagram
    participant I as Incident workflow (framework)
    participant T as SRE triage (child wf)
    participant B as SQL blocking (child wf)
    participant H as Approver
    I->>T: start child (triage task queue)
    T-->>I: findings + handoff request
    I->>I: handoff policy: registry, tier, hop budget
    I->>B: start child (sql-blocking task queue)
    B-->>I: proposed action (tier 1)
    I->>H: approval request
    H-->>I: signal approve / deny (timeout = deny)
    I->>I: audit record
```

#### Considered options

- **No durable execution (0003 as written)**: rejected. In-flight incidents and approvals are lost on restart, and it blocks tier 2.
- **Opt-in Temporal with an in-process loop mode, as in the SQL blocking agent**: rejected. Two execution paths means double the test surface, and an approval wait in loop mode isn't durable.
- **Pydantic AI `TemporalAgent` wrapping each agent**: rejected for now. Our stages mix deterministic gates and diagnostics around the LLM call, and the SQL blocking agent found running whole stages as activities cleaner (`DURABLE_AGENT.md`).
- **DBOS or Prefect** (also Pydantic AI integrations): reason not recorded beyond Temporal's existing use and instance in the organisation.
- **Hand-rolled database-backed state**: rejected. It would re-implement replay, timers, signals, and retries.

#### Consequences

**Agent code**
- `workflow.py` must be deterministic: no I/O, clocks, randomness, or LLM calls; it only sequences stages.
- Stage inputs and outputs must be serialisable, and must stay below the Temporal payload limits. Large artifacts such as plan XML and reports go to storage, with a reference in state.
- Stages must be idempotent or guarded. A retried activity must not run a destructive action twice.

**Approval and audit**
- A human approval survives redeploys.
- Approval timeouts fail safe to deny.
- Workflow history gives replayable incidents, which supports "everything is traceable". The immutable audit log stays the system of record for decisions.

**Operations and risk**
- Temporal becomes a critical platform dependency. If Temporal is unavailable, incidents can't start, though they don't run blind either. It needs HA, persistence and visibility storage (or Temporal Cloud), plus monitoring.
- Each agent's worker is deployed separately on its own task queue, which matches per-agent deployment. A missing worker leaves child workflows waiting, so each child needs a start-to-close timeout and an incident-level deadline.
- Workflow versioning is needed when `workflow.py` changes while incidents are in flight (Temporal patching or worker versioning).

**Follow-up decisions** (open):
- Temporal hosting: the existing self-hosted instance or Temporal Cloud, and namespaces per environment.
- Whether a Temporal child workflow becomes the cross-agent handoff transport, which would affect the Routing details decision.

#### Related

- **Status note:** (still in force under [0012](#adr-0012), which returns to Pydantic AI; 0012 explains how its Temporal integration relates to the alternatives below)
- **Resolves open decision:** n/a (supersedes the "durable execution out of scope" clause of [0003](#adr-0003))

## ADR-0005: Agent framework: Microsoft Agent Framework for all agents
{: #adr-0005 }

<span class="adr-status adr-status-superseded">Superseded by <a href="#adr-0012">ADR-0012</a></span> <span class="adr-meta text-muted">2026-10-12 · `platform-wardens`</span>

#### Context

Decision 0003 chose Pydantic AI, based on the SQL blocking agent's migration. Microsoft Agent Framework (MAF), the successor to Semantic Kernel and AutoGen, reached 1.0 GA for Python and .NET in April 2026. Its stable API covers:
- agents with first-party chat clients, including Microsoft Foundry and Azure OpenAI
- typed structured output
- middleware
- MCP tools
- a graph-based workflow engine with checkpointing and human-in-the-loop
- built-in multi-agent patterns: sequential, concurrent, handoff, group chat, Magentic-One

Its durable execution (the Durable Task extension on Durable Task Scheduler) is still prerelease for Python. Temporal remains the durable layer ([0004](#adr-0004)).

#### Decision

**MAF (`agent-framework` 1.x, Python) is the agent framework for every agent:** specialists, the top-level router, and domain supervisors. Pydantic AI and LangGraph are not used. Pydantic, the data-validation library, stays for all data models.

| Concern | How MAF is used |
| --- | --- |
| Model access | `wardens.llm` wraps MAF chat clients (Foundry / Azure OpenAI). Agents never construct a client. |
| Structured output | `response_format` set to a Pydantic model. `wardens.llm` validates `response.value` and retries when it is missing or invalid. |
| Cross-cutting concerns | MAF middleware: telemetry, token accounting, content safety, and tier checks on any LLM-callable tool |
| Shared tools | MAF's MCP support, against our `mcp-servers/` |
| Built-in orchestration and workflows | Allowed **only inside a single stage**, e.g. concurrent analysis by several LLM agents. Never used to sequence stages or route between agents. |
| Durability, approval, retries | Temporal, unchanged (0004). MAF workflow checkpointing and the Durable Task extension are not used. |
| Preview features | Not used in production paths. That includes Foundry hosted agents, the Durable Task extension, Foundry observability and evaluations, and the agent harnesses. |

#### Considered options

- **Pydantic AI (0003)**: superseded on the three grounds above. It works well in the SQL blocking agent; that agent's design patterns carry over, only the library changes.
- **LangGraph**: still rejected, for the reasons in 0003.
- **MAF with its Durable Task extension instead of Temporal**: rejected for now. The Python packages are prerelease, it would need a new backend (Durable Task Scheduler), and it would discard the proven Temporal pattern and the existing instance.
- **MAF workflows with their own checkpointing as the only durable layer**: rejected. Checkpoints alone don't give cross-service retries, timers, or long durable approval waits.

#### Consequences

**The rationale is only partly realised.** MAF's built-in orchestration helps only inside a stage. Stage sequencing and cross-agent coordination remain `wardens` and Temporal code, because routing must be deterministic and auditable (0002), and durability is Temporal's (0004).

**Two orchestration engines are now available, which invites misuse.** The rule is that MAF orchestration stays inside a stage, and the design reviewer flags any use outside one.

**A MAF workflow inside a stage has no durability of its own.** It runs within one Temporal activity, so a retry reruns all of it. Such a stage must be side-effect free (read-only tools and LLM calls only). Destructive actions are never part of it.

**`wardens.llm` must handle what Pydantic AI did for us:**
- validation retries
- per-agent token accounting

Telemetry moves from Logfire to OpenTelemetry, which MAF emits.

**Approval pattern unchanged.** Destructive actions stay deterministic stages behind a Temporal approval signal. MAF's tool-approval feature is not used for them.

**Migration work:**
- The SQL blocking agent ports from Pydantic AI: `ask_structured` and the usage tracker move to `wardens.llm` on MAF.
- The Terraform drift agent ports from LangGraph.

**Version risk.** The Python API changed shape before 1.0, e.g. `create_agent` became `as_agent`, and `response_format` moved from a keyword argument into `options`. Pin `agent-framework` 1.x in the workspace, upgrade all agents together, and avoid `--pre` extras.

**Model hosting stays open.** MAF supports Foundry, Azure OpenAI, OpenAI, Anthropic, Bedrock, Gemini, and Ollama.

**Revisit trigger.** When the Durable Task extension is GA for Python, evaluate replacing Temporal so the whole stack is MAF (would supersede 0004).

#### Related

- **Status note:** (Pydantic AI); earlier amended by [0009](#adr-0009) (group chat and Magentic restricted)
- **Resolves open decision:** n/a (supersedes [0003](#adr-0003))

#### Rationale

- **Fit with Azure and Foundry.** MAF has first-party Foundry and Azure OpenAI connectors and is aligned with the target runtime.
- **Built-in orchestration.** Workflows and multi-agent patterns come with the framework. Within the boundaries above, a stage that needs several LLM agents to collaborate doesn't need hand-written coordination.
- **Enterprise support.** It is Microsoft-backed, with stable 1.x APIs and long-term support, and it has a migration path from the Semantic Kernel and AutoGen code other teams may have.

## ADR-0006: Adopt the reference Multi-Agent Framework standard v1.1 as the conformance baseline
{: #adr-0006 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-10-21 · `platform-wardens`</span>

#### Context

Platform Engineering & Operations published *Multi-Agent Framework for Agentic AI: Reference Architecture and Implementation Standard*, v1.1 draft, 2026-10-06 (docx). Existing and future projects are assessed against it.

The repo already covered most of the same ground under its own names: tiers instead of autonomy levels, handoff requests instead of tasks, and 19 design categories instead of seven layers. It lacked several things the standard requires:
- a per-agent specification
- lifecycle gates
- a run record
- a tested kill switch
- per-agent cost ceilings
- reversibility ratings
- evaluation floors

v1.1 was issued for endorsement on 2026-10-13. Endorsement had not been confirmed when this record was written.

#### Decision

platform-wardens conforms to the standard, **v1.1 draft**. Where a repo document conflicts with the standard, the standard wins unless a decision record states the deviation and why. The repo may be stricter than the standard, but never looser.

Framework documentation is organised by the repo's design categories, not by the standard's layers. The original 19 categories are kept, and 8 categories the standard requires are added (20–27). Each category states the layer it belongs to. docs/framework/README.md holds the conformance matrix, which maps each section of the standard to a category, an artifact, and a status.

#### Considered options

- **Organise the docs by the seven layers:** rejected. The categories already map one to one onto `wardens` modules and decision records. Several layers span many modules; Layer 7 alone covers registry, identity, guardrails, audit, lifecycle and cost. The layer mapping is kept in every category doc and in the conformance matrix.
- **Treat the standard as advisory:** rejected. Projects are assessed against it, so every gap would surface at review instead of in design.
- **Copy the standard's text into the repo:** rejected. It has its own owner and revision history. The repo keeps the source document in `docs/reference/` and cites it by section.

#### Consequences

- The repo adopts the standard's vocabulary: task, message, artifact, run, run record, autonomy level, action catalog, kill switch, registry.
- Every agent carries more up-front artifacts: a specification in its manifest, a why-an-agent statement, a threat model, an ROI write-up, a runbook, retirement steps, and gate evidence. The agent template carries all of them.
- **Draft risk:** v1.1 may change before or at endorsement. When the endorsed version lands, re-run the conformance matrix and record any change in a new decision record.
- Follow-up records: [0007](#adr-0007) (autonomy levels), [0008](#adr-0008) (contracts), [0009](#adr-0009) (coordination patterns), [0010](#adr-0010) (observability stack), [0011](#adr-0011) (alert and approval routing).
- The standard adds open decisions: registry location, ownership of shared parts, A2A exposure, data classification, and named roles. They are tracked in section 10 of the project goal.
- Other references are reviewed against, not conformed to. The first is the AWS Enterprise Agentic AI Platform Blueprint (2026-11-03), which covers the platform side the standard leaves open; its accepted items become decision records [0018](#adr-0018) to [0025](#adr-0025).

#### Related

- **Resolves open decision:** n/a

## ADR-0007: Autonomy levels L0–L4, granted per action, with reversibility ratings
{: #adr-0007 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-10-21 · `platform-wardens`</span>

#### Context

Decision 0001 introduced a per-action tier scale (0 diagnose, 1 recommend, 2 gated execute, 3 autonomous and out of scope). The standard ([0006](#adr-0006), §8) defines five levels, a human role for each level, the controls each level requires, and two reversibility tests that gate the step to unsupervised execution. Keeping our own numbering would mean translating at every review.

#### Decision

Autonomy uses the standard's **L0–L4** scale and stays **granted per action**, as in 0001. Every write-capable action in an agent's action catalog carries a level and two reversibility ratings. An agent's level is the highest level in its catalog. Reads are not actions; they are tools of kind `read`.

| Level | Agent may | Human role | Was (0001) |
| --- | --- | --- | --- |
| **L0** Observe and explain | Read permitted sources; explain or classify | Operator: people do the work | Tier 0 |
| **L1** Recommend | Propose a specific action with reasoning (a `proposed-action` artifact) | Consultant: people decide and act | Tier 1 |
| **L2** Act with approval | Prepare an action and execute it after a named approver sees the full parameters | Approver | Tier 2 |
| **L3** Act within bounds | Execute pre-approved, reversible, low-consequence actions without waiting | Observer: after-the-fact review | Part of tier 3 |
| **L4** Autonomous within policy | Any catalog action within policy | Sets policy only | Part of tier 3 |

```mermaid
flowchart LR
    L0[L0 observe] --> L1[L1 recommend] --> L2[L2 act with approval] --> L3[L3 act within bounds] -.-> L4[L4 autonomous<br/>not authorised in year one]
    L3 -. demotion, no gate .-> L0
    L2 -. demotion, no gate .-> L0
```

Rules:
- **v1 ships L0 and L1 only**, unchanged from 0001. Amended 2026-11-21 by [0047](#adr-0047): L2 for terraform-drift's two merge and apply actions, on development and qa stacks, under an owner waiver of the floors below.
- **L2** is granted per action after that action path passes evaluation (floors below), has a proven rollback, and gets independent reviewer sign-off at the Promote gate.
- **L3** is granted only to actions rated reversible on **both** tests:
  - *action reversibility*: can the system change be undone?
  - *consequence reversibility*: can what happened in the world because of it be undone?

  L3 also requires a security review, technical enforcement of the bound (scope, rate, budget), a circuit breaker, anomaly alerting, and a weekly audit sample.
- **L4 is not authorised** for any agent in the standard's first year.
- **Demotion needs no gate.** The owner, the reviewer, or the framework owner can lower any action or agent at any time. The kill switch takes the agent to L0 and stops it (23).
- **Evidence floors for any promotion** (standard §10): at least 30 real cases in the evaluation set, zero safety failures in the evaluation window, a run record for every run, and cost within the ceiling.

#### Considered options

- **Keep tiers 0–3 with a mapping table:** rejected. Every review, manifest and run record would need translating, and tier 3 merged two levels with different controls (L3 bounded, L4 policy-only).
- **Grant autonomy per agent:** rejected, for the same reason as in 0001. One agent mixes harmless reads with a single risky write.

#### Consequences

- The manifest's `actionCatalog` carries `level`, `reversibility.action` and `reversibility.consequence` for every action (contracts). The `tier` field is gone.
- Everything 0001 required before tier 2 still applies to L2: write-scoped just-in-time credentials, approval bound to the exact action, durable state between approval and execution, idempotency, rollback, and audit.
- L3 is now a reachable target. Its extra controls (circuit breaker, bound enforcement, anomaly alerting) must be designed before the first L3 request, not after.
- 0001 gave tier 0 the human role "none". Under L0 the human is the operator who reads the output, so an L0 agent still needs a named recipient.
- **Still open:** the volume and accuracy each agent must show per level (the standard leaves this to the specification), and who holds the sponsor role that approves gates in this organisation. Tracked as "Promotion thresholds and authority" in `open-decisions.md`.
- **Failure mode to watch:** promoting on aggregate accuracy while one action is weak. Evidence is per action, not per agent.

#### Related

- **Resolves open decision:** Tier-2 promotion criteria (partly; see Consequences). Supersedes [0001](#adr-0001).
- **Written exception:** [0028](#adr-0028) (proposed): one approval covers `cicd-triage`'s bounded fix loop.
- **Refined by:** [0024](#adr-0024) (proposed): the evidence a promotion needs for each control (allowed twin, exact denial, mutation test), and [0023](#adr-0023) (proposed): G3 and G4 evidence comes from evaluating the deployed shadow worker.

#### Implementation note (2026-11-17, plan repo-per-agent phase 3 step 2)

The levels are enforced by the framework, not by each agent. `wardens.durable`'s binding
(guards.py) runs guardrail point 2 before every `Activities`
method the manifest declares as a tool, read or act; around every act tool it checks the kill switch first (fails
closed) and writes a `tool.act` audit event; and it runs point 4 (`check_action`: catalog, level within the task's
ceiling and the framework's, owning domain, goal drift) on every artifact an emitting activity returns and on what the
run returns, recording a refusal in the run record instead of raising it. A level 2 action still waits for approval
through the binding.

Since 2026-11-21 ([0047](#adr-0047), plan drift-merge-on-approval
step 2) `FRAMEWORK_MAX_LEVEL` is 2. Point 4 still caps each action at its own manifest level and the task's ceiling,
so only an agent whose manifest has a level 2 action can reach it, and only through the approve-then-act workflow
(`wardens.durable.approve_act`): the agent hands the proposed action over, a person in its `approvers` groups approves
it in Slack or the console, and the act runs once with the `ApprovedAction`, which the binding checks against what was
approved (10). Agent code never calls `check_action`, and `wardens check-agent` refuses a tool with no
`Activities` method, an act tool that isn't its own method, and an act client called outside one. Where each point
runs: 9.

## ADR-0008: Contracts follow the A2A data model: task, message, artifact
{: #adr-0008 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-10-21 · `platform-wardens`</span>

#### Context

The contracts were placeholders: `handoff-request`, `finding`, `proposed-action`. The standard (§7, principle 12) requires agents to cooperate only through three typed structures shaped like the A2A data model. Those are a **task** with a lifecycle state, a **message**, and an **artifact**, all carrying one correlation id. The standard also requires a run record (§10), and an agent specification shaped like an A2A agent card (§6).

Internally, handoffs run as Temporal child workflows ([0004](#adr-0004)). There is no external caller yet.

#### Decision

The shared schemas in `contracts/schemas/` are:

| Schema | Role |
| --- | --- |
| `common` | Shared definitions: correlation id, principal, autonomy level, task state, reversibility, message part |
| `task` | Unit of work: goal, capability, typed inputs, context references, constraints (deadline, cost limit, maximum autonomy level, hop budget), requester, lifecycle state with history |
| `message` | Data exchanged during a task, made of typed parts. Never carries instructions for another agent's model |
| `artifact` | Typed output of a task with a verification record. Content types: `finding`, `proposed-action`, `report` |
| `finding` | Artifact content: a diagnosis with evidence |
| `proposed-action` | Artifact content: an action from the catalog, with full parameters, level, reversibility and rollback |
| `run-record` | The people-readable record of one run (§10) |
| `agent-manifest` | The agent specification (§6), shaped so it can be published as an A2A agent card |

`handoff-request` is removed; a handoff is a `task` with a `parentTaskId`. Task states are the standard's seven: `submitted`, `working`, `input-required`, `completed`, `failed`, `canceled`, `rejected`.

**The transport stays Temporal.** The A2A wire protocol is used only where a task crosses a runtime, team or vendor boundary. That needs a thin adapter in the framework, built when the first such caller exists.

```mermaid
flowchart LR
    R[Requester<br/>person, router or agent] -- task --> F[wardens.handoff<br/>validate, policy, hop budget]
    F -- child workflow --> A[Agent entrypoint.py]
    A -- message: progress / input-required --> F
    A -- artifact: finding / proposed-action --> F
    F -- run record --> RR[(Run record store)]
    X[External A2A peer] -. A2A, signed card .-> AD[wardens A2A adapter<br/>later] -.-> F
```

#### Considered options

- **Keep repo-specific shapes and translate at an A2A adapter later:** rejected. The translation layer would be permanent, and the standard requires A2A-shaped records internally so a task can cross a boundary "without translation".
- **Use the A2A protocol internally (JSON-RPC/HTTP between agents):** rejected. It duplicates what Temporal already provides (durable handoff, retries, timeouts) and gives every agent an HTTP surface, against "an agent exposes no HTTP API of its own".

#### Consequences

- `entrypoint.py` maps `task` to agent state and returns artifacts. It is still the only agent module that imports contract types.
- **No progress means failed.** A task in `working` with no progress event past `constraints.progressIntervalSeconds` is treated as failed. This maps to Temporal activity heartbeat timeouts; the coordinator decides on retry.
- `input-required` gives agents a sanctioned way to ask instead of guessing (MAST FM-2.2). It is also the state a task sits in while waiting for approval.
- Every state change records a timestamp and the principal that caused it. The handoff layer enforces this, not the agent.
- **Context by reference.** Context crosses agent boundaries as `contextRefs` to whole artifacts and run records, not as summaries (principle 4). The receiving agent can always resolve a reference to the full evidence.
- Contract changes stay "contracts before code": a schema change lands with every caller and triggers every agent's evals. Each record carries `schemaVersion`.
- **Not modelled:** A2A's `auth-required` and `unknown` states. Add them if an external peer needs them.
- **Open:** when the first A2A boundary appears, and how agent cards are signed. Tracked as "A2A exposure".

#### Related

- **Resolves open decision:** n/a. Closes design-category gaps 2 (clarification status) and 10 (A2A alignment).

## ADR-0009: Coordination patterns: order of preference and restrictions
{: #adr-0009 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-10-21 · `platform-wardens`</span>

#### Context

Decision 0005 allowed any MAF multi-agent pattern inside a single side-effect-free stage, including group chat and Magentic-One. The standard (§5) is stricter:
- Group chat is not approved for production.
- Magentic-style open-ended planning is limited to L0/L1, with a person reviewing the progress ledger at each re-plan.
- Hierarchies are limited to two levels.
- A fixed order of preference applies before any agent is built.

#### Decision

**Order of preference.** It applies to every new capability, and the chosen step is recorded in the agent's why-an-agent statement:

1. a plain function
2. a workflow (stages in `workflow.py`, no LLM-chosen path)
3. a single agent
4. an orchestrator with workers
5. a hierarchy of at most two levels

Move down the list only when the previous option has demonstrably failed on the evaluation set.

| Pattern | Where it may run here | Required control |
| --- | --- | --- |
| Sequential chain | `workflow.py` | Programmatic check between stages; retry per stage |
| Routing | `wardens.routing` ([0002](#adr-0002)) | Router measured on its own (`evals/routing/`); fallback route to a person |
| Parallel sections or voting | `workflow.py`, or MAF concurrent inside one stage | Split only work with no shared decisions; **aggregate in code**, not through another model |
| Orchestrator and workers | MAF inside one side-effect-free stage | Plan visible before execution; typed worker outputs; context budget; iteration limit |
| Hierarchical | Top-level router plus lazy domain supervisors (0002) | **At most two coordinating levels.** No sub-supervisors. Raw traces available to the top level |
| Handoff between peers | Via `wardens.handoff` only | Fixed task contract; one owner per task at any moment; hop budget as loop counter |
| Evaluator and optimizer | Inside one stage | Maximum iterations; the evaluator uses a different prompt or model; a person checks irreversible outputs |
| **Group chat** | **Not in production.** Allowed in evaluation only | — |
| **Magentic (open-ended planner with ledger)** | Only in stages of agents whose highest level is L0 or L1 | Progress ledger written to the run record and reviewed by a person at each re-plan |
| Shared state (blackboard) | Not used | Would need a single writer per state element and a coordinator of last resort |

#### Considered options

- **Keep 0005 as written:** rejected. It permits group chat in production stages, which the standard forbids.
- **Ban Magentic outright:** not chosen. The standard allows it at L0/L1. The per-re-plan human review keeps it out of time-critical incident paths in practice, which is acceptable for investigative, non-urgent stages.

#### Consequences

- The design reviewer flags any MAF `GroupChat` in a production stage, any Magentic use in an agent with an L2+ action, and any third coordinating level.
- Supervisor designs carry a known risk: the standard cites 39–70% degradation on sequential reasoning tasks. Sequential cross-domain work such as SRE triage → SQL blocking therefore goes through a typed task with full context references, not a supervisor summarising between levels.
- "Aggregate in code" means concurrent analyses that disagree are resolved by deterministic rules or escalated to a person, never reconciled by a further LLM call (category 1).
- Everything else in 0005 stands.

#### Related

- **Status note:** carried over to Pydantic AI by [0012](#adr-0012), which maps the MAF patterns below to their Pydantic AI equivalents
- **Resolves open decision:** n/a. Amends [0005](#adr-0005).

## ADR-0010: Observability stack: Application Insights, Log Analytics and managed Prometheus, shown in Azure Managed Grafana
{: #adr-0010 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-10-28 · `platform-wardens`</span>

#### Context

Every model call, tool call and agent invocation must emit a trace with the shared correlation id (principle 10), and telemetry must land in the **existing monitoring stack** (§13). `wardens.telemetry` already emits OpenTelemetry (OTel) spans that follow the GenAI semantic conventions. An OTel collector runs in `wardens-system`, and metrics already go to Azure Monitor managed Prometheus. The backend for traces and logs was not chosen.

The DevOps, SRE and DBA teams already run Azure infrastructure on **Application Insights** and **Log Analytics workspaces**. Azure Monitor now accepts OTLP directly: an Application Insights resource with OTLP support creates the data collection rule and endpoints, stores traces and logs in Log Analytics (OTel semantic conventions) and metrics in an Azure Monitor workspace.

#### Decision

Telemetry goes to Azure Monitor over OTLP, and **Azure Managed Grafana is the single place for dashboards and alerting.**

| Signal | Path | Stored in | Queried with |
| --- | --- | --- | --- |
| Traces (agent, stage, model, tool, handoff, approval spans) | Pod → OTel collector → Application Insights OTLP endpoint | Log Analytics workspace | KQL (Application Insights views, Grafana) |
| Logs (structured JSON from agents and framework) | Pod → OTel collector → Application Insights OTLP endpoint | Log Analytics workspace | KQL |
| Agent metrics (cost, tokens, latency, tool errors, routing) | Pod → OTel collector → Application Insights OTLP endpoint | Azure Monitor workspace (managed Prometheus) | PromQL |
| Cluster metrics (node, pod, kube-state) | AKS `ama-metrics` add-on, remote write | Azure Monitor workspace | PromQL |
| Container stdout/stderr, Kubernetes events | AKS Container Insights (`ama-logs`), data collection rule | Log Analytics workspace (`ContainerLogV2`, `KubeEvents`) | KQL |
| Audit trail | Framework worker → ADX (11) | Azure Data Explorer | KQL |

```mermaid
flowchart LR
    P[Agent and framework pods<br/>wardens.telemetry] -- OTLP gRPC 4317 --> C[OTel collector<br/>wardens-system]
    C -- OTLP HTTP 443<br/>Workload ID --> AI[Application Insights<br/>OTLP support on]
    AI --> LAW[(Log Analytics<br/>traces, logs)]
    AI --> AMW[(Azure Monitor workspace<br/>metrics)]
    K[ama-metrics] --> AMW
    L[ama-logs] --> LAW
    LAW --> G[Azure Managed Grafana]
    AMW --> G
    ADX[(ADX audit)] --> G
    G -- alerts --> T[Teams: SRE on-call channel]
```

**Resources**

- **One Application Insights resource per environment for the framework** (non-prod, prod), separate from the application resources the agents investigate (for example CarePro), so agent telemetry never mixes with the telemetry under investigation.
- It is workspace-based, on a **Log Analytics workspace** in the landing zone. Use the organisation's existing workspace if its access model allows per-table RBAC for the framework tables; otherwise a dedicated workspace.
- Agent metrics use a separate Azure Monitor workspace from cluster metrics, as Azure Monitor requires for Application Insights with OTLP.

**Collector rules**

- Only the collector exports. Pods send OTLP to the collector and hold no Azure Monitor credentials.
- The collector authenticates with **its own Workload ID** (`azure_auth` extension) and holds **Monitoring Metrics Publisher** on the data collection rule. No connection string.
- Before export: redaction per data classification (24), `cumulativetodelta` for metrics (Application Insights needs delta temporality and exponential histograms), tail sampling that **keeps every error and every trace of a run that ended in a proposed action**, and samples successful runs.
- The GenAI semantic-convention version stays pinned in `wardens.telemetry` (12).

**Dashboards and alerting in Grafana**

- Data sources: managed Prometheus (PromQL), Azure Monitor / Log Analytics (KQL), Application Insights traces, ADX (audit). Grafana reads them with its managed identity.
- **Alert rules are Grafana-managed**, kept as code (Terraform) and reviewed like any change. Every alert goes to one Teams contact point, the **SRE on-call channel** ([0011](#adr-0011)).
- Required alert rules from Phase 0: cost per run over budget, p95 latency, tool error rate, breaker open, kill-switch activation, quarantine, shared-agent queue latency (shared agents), and telemetry ingestion stopped.
- **Watching the watcher:** one Azure Monitor alert outside Grafana fires when Grafana or the collector stops reporting (no data for 15 minutes), so a Grafana outage is not silent.

#### Considered options

- **Azure Monitor OpenTelemetry Distro in every agent process** (GA, exports straight to Application Insights): rejected as the default. Every pod would need the App Insights connection and egress to Azure Monitor, and redaction and sampling would be repeated in each agent instead of enforced once in the collector.
- **Collector `azuremonitorexporter` with a connection string** (GA): kept as the **fallback** if the OTLP ingestion path is not acceptable for production when Phase 0 closes. The connection string goes in Key Vault. Data lands in the classic Application Insights tables, so dashboards change.
- **Azure Monitor alerts instead of Grafana alerting:** rejected as the main mechanism, so dashboards and alerts share one set of queries and one review process. Used only for the watcher alert above.
- **Self-hosted backend (Tempo, Loki, OpenSearch):** rejected. It adds a stack to run and is not the teams' existing monitoring stack (§13).

#### Consequences

- Operators get Application Insights' transaction search, failures and agents views on agent traces, and the same data in Grafana, without new tools.
- Phase 0 builds: the Application Insights resource with OTLP support, the data collection rule and role assignment, the collector's identity, the Container Insights data collection rule, Grafana data sources, the first alert rules and the Teams contact point.
- Log Analytics is billed per GB ingested. Sampling and table plans (Basic logs for verbose agent logs) are set in Phase 0 and reviewed in the monthly measures report.
- **Telemetry is not the audit trail.** Sampled traces and retention limits never affect audit, which stays in ADX, or run records, which are never sampled.
- **Preview risk:** some OTLP-to-Application-Insights paths are marked preview by Microsoft. Before the Phase 0 exit gate, check the status of the collector path; if it is still preview and that blocks production, switch to the fallback exporter.
- **Open:** whether to adopt the Agent 365 SDK for agent telemetry; workspace retention per data class. Alert routing is decided in [0011](#adr-0011).

#### Related

- **Resolves open decision:** "Observability stack" in 12; "trace and log backend" in Phase 0.
- **Amended by:** [0025](#adr-0025) (proposed): the same dimensions on every span, metric, resource and gateway call; the collector marks spans without a cell as `unallocated`.

## ADR-0011: Alerts go to SRE; agents act only in their own domain; approvals go to that domain's team
{: #adr-0011 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-10-28 · `platform-wardens`</span>

#### Context

Two kinds of message reach people from the framework:
- **Alerts** about the framework and its agents: cost over budget, latency, tool errors, an open breaker, quarantine, a kill-switch activation, a shared-agent backlog, telemetry stopped ([0010](#adr-0010)).
- **Approval requests** for an L2 action: a person must approve the exact action before it runs ([0007](#adr-0007), 10).

These need different audiences. Alerts are about running the platform and need one owner who is always on call. An approval is about a change to a system, and the person approving must know that system.

#### Decision

**Alerts: all to the SRE on-call channel.**

- Every Grafana-managed alert rule uses one Teams contact point: the SRE on-call channel. There is no per-team alert routing.
- Alert labels still carry `agent`, `domain`, `capability` and `correlationId`, so SRE can see whose agent is affected and pull in the owning team.
- The Azure Monitor watcher alert (Grafana or the collector stopped reporting) also goes to SRE.

**Agents propose actions only on systems their own domain owns.**

- A problem on another team's system is a **handoff**, never a proposed action. An SRE agent that finds a SQL Server cause hands the issue to the DBA agent for that capability, which makes the recommendation. The SRE agent may say in its finding that the SQL side looks involved and pass the evidence by reference.
- **A system ownership map** decides which domain owns a system, not the agent. It maps system types and resources to `devops`, `sre` or `dba` (for example SQL Server instances → dba, AKS workloads → sre, Terraform and pipelines → devops), from resource tags and registry scopes. Boundary cases, such as the VM that hosts SQL Server, are decided once in the map.
- **Enforced twice:**
  - CI rejects a manifest whose `actionCatalog` targets systems outside the agent's `domain` in the ownership map.
  - At run time, `wardens.guardrails` rejects any `proposed-action` (L1 and above) whose target the map assigns to another domain, and turns it into a suggested handoff to that domain's capability. It is never dropped silently.
- **A fix that spans domains is one action per domain.** Each owning agent proposes its own part, the parent workflow orders them, and each part is approved by its own team. There is no combined approval for changes across domains.
- **No owning agent yet:** if no agent serves the needed capability in the owning domain, the agent reports the symptom with its evidence and escalates to that team's people. It never fills the gap itself.

**Approvals: to the team that owns the domain of the action.**

- The approval card goes to the approver group of the team that owns the domain of the action. Because agents act only in their own domain, that is always the `domain` of the agent that proposes the action:

| Action | Proposing agent | Domain | Approval goes to |
| --- | --- | --- | --- |
| Drift remediation PR | Terraform Drift Advisor | devops | DevOps approver group |
| `KILL` a head-blocker session | SQL Blocking Investigator | dba | DBA approver group |
| First SRE action (chosen in Phase 4) | Owning SRE agent | sre | SRE approver group |

- **The domain of the action decides, not where the incident started.** When an SRE alert is handed off to a DBA agent that proposes a SQL action, the DBA group approves it.
- `actionCatalog[].approvers` in each manifest names an Entra group of the owning domain team. CI rejects a level 2 action whose approver group does not belong to the agent's `domain`.
- **Shared agents never request approval.** They have no write roles and no actions at L2 (shared agents).
- The rules in 10 still apply: approver identity from the Teams/Entra sign-in, approver ≠ requester, binding to `idempotencyKey` and parameters, expiry, timeout = deny.
- SRE on call is told when an approval is requested or times out on an incident it is handling, for context only. SRE cannot approve another domain's action unless that person is also in the owning group.

```mermaid
flowchart LR
    G[Grafana alert rules] -- every alert --> SRE[SRE on-call channel]
    PA[proposed-action, level 2] --> D{domain of the action}
    D -- devops --> DV[DevOps approver group]
    D -- sre --> SR[SRE approver group]
    D -- dba --> DB[DBA approver group]
    DV & SR & DB -- signal approve / deny --> W[wardens.durable]
```

#### Considered options

- **Let an agent propose an action on another domain's system, approved by that domain's team:** rejected. The proposing agent was not built or evaluated for that system, and the approver would review an action from an agent outside their domain.

- **Alerts to the team that owns the agent:** rejected for now. It splits on-call for one platform across three channels, and the domain teams don't run the framework day to day.
- **Approvals to SRE on call, as the incident owner:** rejected. The approver must understand the target system, and a `KILL` on a SQL session or a Terraform change needs the domain's expertise.
- **Approvals to the team that raised the incident:** rejected. Handoffs cross domains, so the team that raised the incident is often not the team whose system changes.

#### Consequences

- One Teams contact point in Grafana; alert rules stay simple. SRE on call needs a runbook for each alert that names the owning team per agent.
- `wardens.notify` routes approval cards by the action's domain to that team's approval channel.
- Each team names an approver group in Entra before its first L2 action (Phase 4 L2 design).
- The schema check "approver group belongs to the agent's domain" is a cross-field rule for `contracts/README.md`.
- The system ownership map is a Phase 0 platform deliverable, kept with the registry and changed by review like any registry change.
- Cross-domain handoff pairs must be allow-listed in the registry before an agent can hand a problem to another domain (5).
- **Open:** who decides a disputed entry in the ownership map (proposed: the framework owner, 26).

#### Related

- **Resolves open decision:** "who is authorised per action" in 10 (the rule; the named groups are set per action). Closes "per-team alert routing" in [0010](#adr-0010).
- **Refined by:** [0021](#adr-0021) (proposed): alerts still go to SRE on-call; 0021 names the owner of the follow-up for each kind of failure.

## ADR-0012: Agent framework: Pydantic AI for all agents (return from MAF)
{: #adr-0012 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-10-31 · `platform-wardens`</span>

#### Context

Decision 0005 replaced Pydantic AI with Microsoft Agent Framework (MAF) on three grounds: fit with Azure and Foundry, built-in orchestration, and enterprise support. The feature comparison carried out afterwards (framework-comparison.md, researched 2026-10-14 against Pydantic AI 2.x and MAF 1.x) tested those grounds against this project's recorded decisions. It found:

- **Fit with Azure and Foundry.** This is real, but most of it doesn't apply here. The Foundry evaluations, tracing and hosted agents are Preview, and 0005 already excluded Preview features from production. Keyless auth to Foundry also works with Pydantic AI, as the SQL blocking agent shows.
- **Built-in orchestration.** Our rules confine it to a single side-effect-free stage (0005, 0009). They also ban group chat in production and limit Magentic to L0/L1. Most of the benefit is therefore never used.
- **Enterprise support.** This still favours MAF. It is the only ground that survives the comparison unchanged.

The comparison also found that MAF has **no Temporal integration**, while Pydantic AI has a first-party one. Temporal is our durable layer (0004), so this is the deciding factor (comparison, Appendix A, "Reading the appendix"). No agent has been ported to MAF yet. The SQL blocking agent still runs on Pydantic AI.

#### Decision

**Pydantic AI (`pydantic-ai-slim` 2.x, Python) is the agent framework for every agent:** specialists, the top-level router, and domain supervisors. MAF and LangGraph are not used. Pydantic, the data-validation library, stays for all data models.

| Concern | How Pydantic AI is used |
| --- | --- |
| Model access | `wardens.llm` wraps Pydantic AI models and providers (Azure OpenAI / Foundry through `AzureProvider` or a pre-built client with an Entra ID token provider). Agents never construct a model or a client. |
| Structured output | `output_type` set to a Pydantic model. Validation errors are fed back to the model and retried automatically, within a per-stage `retries` budget. Output validators hold the checks a schema can't express. |
| Cross-cutting concerns | Pydantic AI hooks and capabilities: telemetry, token and cost accounting, content safety, and level checks on any LLM-callable tool |
| Usage and cost limits | `UsageLimits` (requests, tool calls, tokens) on every run, set from the manifest. The per-request cost metric feeds the cost meter (15). |
| Shared tools | Pydantic AI's MCP client (`MCPToolset` / the `MCP` capability), against our `mcp-servers/` |
| Coordination inside a stage | Agent delegation and `pydantic-graph`, allowed **only inside a single side-effect-free stage** and within 0009's restrictions. Never used to sequence stages or route between agents. |
| Durability, approval, retries | Temporal, unchanged (0004): stage = activity, approval = signal. Pydantic AI's Temporal integration is the approved path if a stage needs per-model-call durability. Deferred-tool approval is not used for destructive actions. |
| Telemetry | OpenTelemetry from Pydantic AI (`Agent.instrument_all()` with our own `TracerProvider`) to Azure Monitor ([0010](#adr-0010)). Logfire is not used. |
| Testing | `TestModel`, `FunctionModel`, `Agent.override` and `ALLOW_MODEL_REQUESTS = False` in every agent's unit tests |
| Unstable features | Not used in production paths. That covers the harness package (0.x), the `beta` module, and the external `fasta2a` A2A bridge. |

#### Considered options

- **Keep MAF (0005):** rejected. Its three grounds were tested in the comparison. Built-in orchestration is mostly unused under 0009. The Foundry advantages are mostly Preview. Only enterprise support survives, and it doesn't outweigh writing and maintaining our own Temporal wrapping, validation retries, cost limits and test doubles.
- **MAF with its Durable Task extension instead of Temporal:** rejected. The Python packages are prerelease, it needs a new backend, and it would discard the Temporal pattern proven in the SQL blocking agent (0004).
- **Pydantic AI for most agents, MAF for agents that need FIDES:** rejected. Two agent frameworks double the `wardens.llm` surface, the test doubles and the upgrade work. FIDES is Experimental in any case.
- **LangGraph:** still rejected, for the reasons in 0003.

#### Consequences

**What we give up, and how we cover it** (the rows where the comparison favours MAF):

| MAF advantage | Mitigation |
| --- | --- |
| Keyless Entra ID auth is first-class (`credential=` throughout) | `wardens.llm` builds the Azure OpenAI client with a bearer-token provider and workload identity, as the SQL blocking agent does. One implementation, tested once. |
| FIDES, deterministic prompt-injection control (Experimental) | Our guarantees don't depend on the LLM: destructive actions are never LLM-callable, levels are enforced in code ([0007](#adr-0007)), and untrusted input is handled under 9 and 18. Re-evaluate if FIDES reaches GA. |
| Approval responses bound to the session by default | Not needed. Approval is a Temporal signal from an authenticated endpoint (0004, 10), never Pydantic AI's deferred-tool approval. |
| Native Foundry tracing and evaluations | Telemetry is plain OpenTelemetry to Azure Monitor (0010). Evaluations use Pydantic Evals. Foundry evaluators remain optional where they are GA. |
| Prebuilt orchestrations (sequential, concurrent, handoff, group chat, Magentic) | Not needed. Sequencing is `workflow.py`, routing is `wardens.routing` (0002), and concurrency inside a stage is `asyncio` or `pydantic-graph`, aggregated in code (0009). |
| Microsoft backing and long-term support | Pin `pydantic-ai-slim` 2.x in the workspace and upgrade all agents together. The commercial support offering is available if the company standards require a vendor contract. |

**0009 carries over unchanged in substance.** Its pattern table maps to Pydantic AI as follows: "MAF concurrent" becomes concurrent agent runs or `pydantic-graph` parallel steps inside one stage. "MAF inside one stage" (orchestrator and workers) becomes agent delegation or `pydantic-graph` inside one stage. Pydantic AI has no group chat or Magentic class. The restrictions apply to any equivalent we build, including the Subagents and Dynamic Workflow capabilities, which count as Magentic-style open-ended planning.

**`wardens.llm` gets smaller.** Validation retries, usage limits and the cost metric come from the library instead of our code.

**0004 stands.** Whole stages still run as activities. The 0004 alternative "Pydantic AI `TemporalAgent` wrapping each agent" stays rejected as the default. Its successor, `TemporalDurability`, may be used inside a stage that needs per-call durability, through `wardens.durable` only.

**Migration work:**
- The SQL blocking agent moves its `ask_structured` and usage tracker into `wardens.llm` with no framework change.
- The Terraform drift agent ports from LangGraph to Pydantic AI.

**Version risk.** v2 is recent (GA 2026-06-23) and releases often. Pin 2.x, keep the harness and `beta` modules out of production, and re-check class names against the docs before building (comparison, caveat).

**Revisit triggers:**
- MAF adds a first-party Temporal integration, or we move off Temporal (would supersede 0004).
- FIDES or an equivalent deterministic information-flow control reaches GA, and our own gates prove insufficient.
- Company standards require a Microsoft-supported agent framework.

#### Related

- **Resolves open decision:** n/a (supersedes [0005](#adr-0005); restores the choice made in [0003](#adr-0003), with Temporal from [0004](#adr-0004) and the coordination rules from [0009](#adr-0009))

#### Rationale: what Pydantic AI gives us over MAF

Each row comes from the comparison. The section numbers refer to framework-comparison.md.

| Benefit | Pydantic AI | MAF | Comparison |
| --- | --- | --- | --- |
| **First-party Temporal integration** (the deciding factor) | `TemporalDurability` capability, `PydanticAIPlugin`. Model requests, tool calls, MCP calls and argument validation run as activities, with no wrapper code. | None. We would write and maintain the activity wrapping ourselves. Its own durable layer (Durable Task extension) is prerelease for Python and needs a new backend. | §13; Appendix A |
| **Typed output with automatic validation retries** | Built in: the validation error is fed back and re-asked within a retry budget. Output validators can request a retry. Streaming yields validated partial output. | `response.value` may be `None`. No automatic retry is documented, so the retry logic would be ours. | §4; Appendix A |
| **More output types and modes** | Unions, scalars, `TypedDict`, dataclasses, output functions. Tool, native, prompted and text output modes. Prompted mode works with models that lack native structured output. | A Pydantic model or JSON schema only, and only where the model supports it natively. | §4 |
| **Cost and usage controls** | `UsageLimits` in core (requests, tool calls, tokens). Per-request estimated cost (`operation.cost`) in telemetry. `SpendLimits` in the harness. | None by design. The docs say to build input, output and rate limits yourself. | §9, §14; Appendix A |
| **Testing support** | `TestModel` (calls every tool from its schema), `FunctionModel` (scripted), `Agent.override`, `capture_run_messages`, and blocking real model calls in tests | No dedicated test model found. Thinner overall. | §16; Appendix A |
| **Typed dependency injection** | `Agent[Deps, Output]` with `RunContext[Deps]` passed to tools, instructions and validators | No typed dependency container. Runtime values go through kwargs or middleware context. | §2 |
| **Finer-grained interception** | Hooks at run, node, model request, tool validation, tool execution, output validation and event stream, each with before, after, wrap and error variants, plus per-hook timeouts | Middleware at three points: agent run, tool call, model call | §8 |
| **Richer tool retries and argument handling** | `ModelRetry` re-asks the model. `ToolFailed` reports a failure without spending the retry budget. Per-tool retry budgets. Argument validators run before approval. | Function-invocation loop; retry and back-off behaviour not documented | §5 |
| **Broader MCP client** | Sampling, elicitation, config-file loading with env-var expansion, error behaviour per server (`retry` / `failed` / `error`), and MCP calls as Temporal activities | Sampling deprecated; elicitation and config loading not documented | §7 |
| **Wider choice of providers and durable engines** | Very broad provider list. Temporal, DBOS, Prefect, Restate and AWS Lambda are all co-maintained. | Narrower provider list. One durable backend (Durable Task Scheduler). | §3, §13 |
| **Online evaluation** | Pydantic Evals is independent of the agent library and supports sampled grading in production as well as offline datasets | Local evaluators, plus Foundry evaluators that are partly Preview | §15 |
| **No vendor telemetry by default** | Nothing is sent to the vendor; Logfire is opt-in | Adds the framework name, version and a feature-usage token to the User-Agent on Foundry and Azure OpenAI calls (opt-out) | §10 |
| **Smaller install** | Slim package plus only the extras we use | The full package installs every integration | §1 |
| **Clear version policy** | No intentional breaking changes in minor releases. Deprecations are removed only in the next major. v1 gets security fixes until at least late December 2026. | Python minor releases have shifted behaviour (for example checkpoint changes in 1.13.0) | §1, §19 |
| **Lowest migration cost** | The SQL blocking agent already runs on it, so `ask_structured` and its usage tracker move into `wardens.llm` nearly as-is | Both existing agents would have to be ported | Appendix A |

## ADR-0013: An agent-opened draft pull request is a level 1 recommendation
{: #adr-0013 }

<span class="adr-status adr-status-proposed">Proposed</span> <span class="adr-meta text-muted">2026-10-31 · `platform-wardens`</span>

#### Context

Decision 0007 ships L0 and L1 only in v1. At L1 the agent proposes an action and people decide and act. The Terraform drift agent's most useful output is a change to a consumer repository's `resources.yaml`. As patch text in a `proposed-action`, a person has to copy it into a branch and open the pull request by hand. That step adds work and a chance for error, and no control: every control that matters sits after the pull request is opened.

The baseline is the IaC estate the agent was first built for: `platform-as-code` and its consumers: `infra-devops-sandbox` (the first target) and two more consumer repositories (checked 2026-10-31). In those repositories, opening a pull request changes nothing in Azure:

- A pull request runs `terragrunt plan` per changed stack, with the OPA gate (and Wiz and Infracost where a repository enables them).
- The organisation ruleset on default branches requires a pull request with one approval, dismisses stale approvals on push, and requires approval of the last push. No direct or force pushes.
- Apply runs only after merge, in the shared `terragrunt-cd` workflow. That workflow fails unless the target GitHub environment has a protection rule with required reviewers, and every deploy environment in both repositories has one.

#### Decision

A **draft** pull request opened by an agent is the delivery format of a level 1 `proposed-action`, not a level 2 action, when all of these hold:

- It is opened as a draft from a new branch named from the action's `idempotencyKey`. The agent never pushes to the default branch or to a branch it did not create.
- The agent's GitHub App can create branches, commits and pull requests only in repositories it is installed on that also match the organisation and name pattern in the agent's scope configuration (`config/scope.yaml`). It has no merge, approve, admin or workflow-dispatch permission, and it is never a bypass actor on a ruleset.
- It changes only the files the `proposed-action` names: the `resources.yaml` of a stack that the drift scan planned and the repository has not opted out of. Never any other file: workflows, `config.yaml`, `common_vars.yaml` or the shared module copy.
- The pull request body renders the `proposed-action`: drifted addresses, before and after values, classification, evidence links, and rollback (close the pull request).
- The change is applied only by the repository's existing CD path after a person merges.

The agent opens the pull request only after checking, on every run through the GitHub API, that the repository has, in addition to the organisation ruleset (otherwise it delivers patch text):

- A `CODEOWNERS` file names the owning team for `environments/`, and the ruleset requires code-owner review, so the approver knows the system ([0011](#adr-0011)).
- The pull request plan is a required status check, so a pull request whose plan fails or is blocked by a gate cannot be merged.

The manifest lists the action at `level: 1`, with both reversibility ratings `reversible`, through an `act` tool. CI rejects a level 1 act tool whose scope grants more than the above.

#### Considered options

- **Patch text only; a person opens the pull request (0007 as written):** rejected. It adds a manual copy step and no control.
- **Pull request as a level 2 action behind the Temporal approval signal:** rejected for v1. It approves twice (opening, then merging) a change that has no effect until merged, which feeds approval fatigue (10).

#### Consequences

- The drift use-case exclusion "No automatic PR creation" now reads "No pull request outside decision 0013; no merge, approval or apply".
- **No baseline repository meets the allow-list conditions yet** (2026-10-31, including `infra-devops-sandbox`): there is no `CODEOWNERS` file, code-owner review is off, and the plan is not a required check. Adding them is an onboarding task for each repository, owned by DevOps with the repository owners. Until then the agent delivers patch text only.
- At L1, the pull request review replaces the approval card that 0011 describes for L2. The reviewer comes from the owning team through `CODEOWNERS`, which matches the 0011 rule that the domain owning the system approves.
- Repositories and stacks are discovered, not listed. Installing the GitHub App on a repository is the org-admin decision that brings it into scope; a repository opts stacks out in `.github/drift-agent.yaml`. Each run record lists the repositories and stacks discovered and the commit checked.
- One open drift pull request per stack. New findings update it rather than opening another.
- A pull request closed without merge is the "rejected recommendation" signal in evaluation.
- **Failure mode to watch:** rubber-stamp merges. Track merge rate and time to review; a near-100% merge rate triggers a review, as for approvals.
- **Revisit** for any repository that applies on pull request open, or whose ruleset or environment protection is weakened: there the pull request is an action and needs L2.
- Supersedes, for drift, the autonomous import-and-commit plan in the shared module's `.github/prompts/ai-remediation-agent-plan.md`.

#### Related

- **Date note:** amended 2026-11-02: homelab on GitHub Free
- **Resolves open decision:** n/a (amends [0007](#adr-0007) on what counts as an action at L1)
- **Extended by:** [0028](#adr-0028) (proposed), for `cicd-triage` only: what a level 1 pull request may change depends on what opening it can reach.

#### Amendment: homelab on GitHub Free (2026-11-02)

The homelab organisation (`cloudutsukpilot`) is on GitHub Free. Private repositories there get no branch
protection or rulesets: GitHub refuses even to read them (`403 Upgrade to GitHub Pro or make this repository
public`), so the checks above can never pass. The owner accepts draft pull requests without them there:

- `config/scope.yaml` sets `draftPrWithoutBranchRules: true` on the organisation. The agent then opens draft
  pull requests when GitHub **refuses** the rules API. Rules that are readable but don't meet the checks
  above still mean patch text, and so does any organisation without the setting.
- **Pull request only, enforced in code.** Without a branch rule nothing in GitHub stops the App's
  `contents: write` from writing to the default branch, so `tools/draft_pr.py` refuses, before any write, a
  branch that isn't a new `drift/<stack>/<key>` branch or that is the default branch. The App still has no
  merge, approve, admin or workflow permission, and the agent never merges.
- Accepted risk: a bug in those guards could put a commit on the default branch, which the repository's CD
  applies. Review isn't enforced either: the owner merges every agent pull request by hand. Moving the
  organisation to GitHub Team (branch rules on private repositories) removes the exception; the setting
  can then go back to `false`.

## ADR-0015: Azure Service Bus at the edges only: event ingress and result egress
{: #adr-0015 }

<span class="adr-status adr-status-superseded">Superseded by <a href="#adr-0030">ADR-0030</a></span> <span class="adr-meta text-muted">2026-11-01 · `platform-wardens`</span>

#### Context

Today an event reaches the framework one way: an entry adapter receives it (alert webhook, Teams request, Temporal schedule), creates the root task and starts a Temporal workflow (16, [0004](#adr-0004)). Nothing publishes results except `wardens.notify` to people.

That holds while there are few sources and no system consumers. Phases 2–5 add more of both:

- **Sources:** Azure Monitor and Grafana alerts, App Insights, Jira or ServiceNow, GitHub Actions and the ITSM MCP work in Phase 2.
- **Consumers:** ITSM updates, the shared system of record (orchestrated-vs-decentralized comparison §7), and dashboards.

One webhook per source and one push per consumer would couple every source and consumer to the entry adapter's uptime. They would also leave no buffer or dead-letter queue, and no replay of what arrived.

The *Enterprise Multi-Agent Architecture Notebook* (v0.1, 2026-11-01) recommends a hybrid design: a broker for event distribution and Temporal for durable execution. The organisation already runs Azure Service Bus with managed identity (for example the shared Platform Engineering namespaces, SDO-17809).

The same notebook also lets agents subscribe to each other's result events. That is choreography, which [0009](#adr-0009) does not allow.

#### Decision

**Service Bus sits at the two edges of the framework, never between agents.**

```mermaid
flowchart LR
    SRC[Alerts, ITSM, CI, Azure events] --> IN[(Service Bus topic: wardens-ingress)]
    IN --> EA[wardens.runtime entry adapter]
    EA -->|start workflow, id from source event| T[Temporal: incident and agent workflows]
    T -->|handoffs: wardens.handoff, child workflows| T
    T -->|publish activity| OUT[(Service Bus topic: wardens-results)]
    OUT --> C[ITSM updater, system of record, dashboards]
```

| Concern | Rule |
| --- | --- |
| Who uses the bus | Only framework components. The entry adapter subscribes to `wardens-ingress`, and a `wardens.durable` publish activity sends to `wardens-results`. **Agents never publish or subscribe.** Agent-to-agent work stays on `wardens.handoff` and Temporal child workflows (0009). |
| Envelope | CloudEvents 1.0, structured JSON. `id` becomes the task's `sourceEventId`, `traceparent` (distributed-tracing extension) becomes the task's `traceparent`, and an optional `environment` attribute fills the task's `environment`. The payload is quoted as data and never used as instructions (18). |
| Ingress idempotency | The Temporal workflow id is derived from `source` + `id`. A duplicate delivery gets "workflow already started", and the adapter completes the message. Entry fingerprint dedupe still applies on top (16). |
| Ingress reliability | Peek-lock. The adapter completes the message only after the workflow start is acknowledged. After `maxDeliveryCount` (default 5) the message goes to the dead-letter queue. |
| Egress reliability | Publishing is a Temporal activity at the end of a run. Temporal's durable history gives outbox semantics. The Service Bus `messageId` is `runId:eventType`, with duplicate detection on the topic. |
| What is published | `run.completed`, `artifact.created` (finding, proposed-action, report) and `approval.decided`. Each carries ids, type, level, correlation id and a reference to the run record, **never the artifact body**. Consumers fetch the body with their own identity (24). |
| Dead letters | Any message in the dead-letter queue raises an alert to SRE on-call ([0011](#adr-0011)). An operator re-submits after diagnosis, following the runbook. Redrive is audited (11). |
| Identity | Managed identity only; SAS keys are disabled. The entry adapter has *Data Receiver* on its subscription only. The publisher has *Data Sender* on `wardens-results` only. Each consumer has *Data Receiver* on its own subscription. |
| Namespaces | One namespace per environment, in the platform landing zone. Topics and subscriptions are in IaC. |

**Local and Azure setups.** The bus sits behind two small protocols in `wardens.runtime`: `EventSource` (receive, complete, dead-letter) and `EventSink` (publish). They follow the existing `DedupeStore`/`MemoryDedupe` pattern. The protocols and the CloudEvents envelope are the same everywhere; only the adapter and the connection change. The full local vs Azure matrix for every component is in 19.

| | Local (laptop, `--dev-server`) | Azure (non-prod and prod) |
| --- | --- | --- |
| Broker | **Azure Service Bus emulator** (Microsoft's official Docker image, with its SQL container), in the local compose file | Azure Service Bus namespace per environment |
| Adapter | `ServiceBusSource` / `ServiceBusSink`: the same code as Azure | `ServiceBusSource` / `ServiceBusSink` |
| Topics and subscriptions | Emulator `Config.json`, kept in the repo next to the compose file | IaC (Terraform), with the same names |
| Authentication | Emulator connection string (`UseDevelopmentEmulator=true`). It is a local-only secret, never committed with real values | Managed identity and RBAC; SAS disabled |
| Unit tests | `MemoryBus` (in-process, implements both protocols); no container | — |

Why the emulator and not RabbitMQ or NATS locally: the emulator speaks the same AMQP protocol and SDK as the cloud service. Peek-lock, dead-letter queue, topics and filters are therefore exercised by the code that runs in Azure. RabbitMQ or NATS would need a second adapter with different semantics, which is the double test surface that [0004](#adr-0004) rejected for Temporal.

**Check before relying on it:** the emulator's published limitations. It has no Entra ID authentication and no management via ARM or SDK (`Config.json` only), entity counts are capped, and it is not for production. Verify duplicate detection and persistence across restarts against the current docs. Anything the emulator lacks is covered by a non-prod Azure namespace test in CI.

**When it is built: deferred, with a trigger.** The first source beyond the alert webhook and Teams, or the first system consumer of results, brings the bus in. Until then the webhook adapter stays, and the task fields this decision adds (`sourceEventId`, `causationId`, `traceparent`, `environment`) are filled from the webhook.

#### Considered options

- **Temporal only, no broker (current state):** kept until the trigger above. It is simplest while sources are few. It gives no buffer, no fan-out to consumers and no dead-letter queue for sources.
- **Event Grid instead of Service Bus:** not chosen as the core. Event Grid suits Azure resource events and can forward to the ingress topic. It has no peek-lock or sessions for our consumers.
- **Kafka or Event Hubs:** rejected. Our volume is business events (alerts, incidents, results), not telemetry streams. Telemetry stays in the observability stack ([0010](#adr-0010)), and high-volume signals are aggregated before they become an event.
- **Agents coordinate through bus events (choreography):** rejected. It conflicts with [0009](#adr-0009) (no blackboard, handoffs only through `wardens.handoff`) and with the hop and cost budgets in 05.

#### Consequences

- **Contracts:** tasks gain the optional fields `sourceEventId`, `causationId`, `traceparent`, `environment` and `replayOf`. The run record gains `terminationReason` and `replayOf`. The change is additive and the minor version stays compatible (04).
- **Replay** becomes possible from the bus (dead-letter queue or retained messages). It follows the replay rules in 07: the original `sourceEventId` is kept, with a new task id and `replayOf`.
- **Failure modes:**
  - **Bus outage:** sources buffer or retry, and webhook fallback stays available for alerts. A bus outage must never block the kill switch, which does not use the bus (23).
  - **Event storm:** the per-entry-point rate limit and fingerprint dedupe still apply.
  - **Poison message:** dead-letter queue and alert.
- **Cost:** a Standard tier namespace per environment. Premium only if isolation or private endpoints require it (platform owner).
- **Threat model:** add a spoofed event on the ingress topic (mitigated by sender RBAC plus the source allow-list in `entry-points.yaml`) and data leakage through result events (mitigated by references only).

#### Related

- **Status note:** (2026-11-06): Azure Monitor, Grafana and GitHub can't send to Service Bus, and Temporal already gives what its lock and duplicate detection would add
- **Resolves open decision:** "Entry points" in 16 (the transport for event sources; the channel list stays open). 0014 is reserved for the drift trigger referenced in framework/README.md.

## ADR-0016: Change evidence comes from the Change Correlator, which uses a provider's MCP server only where it passes our acceptance test
{: #adr-0016 }

<span class="adr-status adr-status-proposed">Proposed</span> <span class="adr-meta text-muted">2026-11-02 · `platform-wardens`</span>

#### Context

The drift scan of 2026-11-02 found the `development/microsoft-foundry` stack deleted outside Terraform: a resource group, a Foundry account and project, a model deployment and four role assignments. The agent reported, for each resource, "was deleted outside Terraform. Next step: investigate." The plan already says that. What a person needs is who did it, when, with which tool, and whether a ticket covers it.

The answer was in the Azure Activity Log. A query scoped to the deleted resource group returned the whole story in one place:
- one person deleted the project, the account, the four role assignments and then the resource group;
- they used the Azure portal, on 2026-11-01 between 15:52 and 16:03 UTC;
- every event carried one correlation id.

Two details shape the design:

- **Cascades:** the model deployment has no delete event of its own; it went with its account. Attribution has to walk up from a resource to its parents (deployment, account, resource group).
- **Scope the query:** a subscription-wide query hit the 5,000-event page limit without reaching these events. Filtering by resource group (or resource id) found them at once.

More agents will need the same evidence across Azure, AWS, GCP, Cloudflare and Jira. Three designs were weighed: a tool inside the drift agent, an MCP server we write, and an agent that uses the providers' own MCP servers.

We tested Microsoft's Azure MCP server (`@azure/mcp` 3.0.0, `--read-only`) on the same deletion. Its activity-log command (`monitor_activitylog_list`) takes a resource **name**, an optional resource type and a number of hours; it has no resource group or resource id filter. It resolves the name to a live resource first, so all three lookups (account, project, resource group) failed with `Resource '<name>' not found in subscription 'dev'`. It never queried the Activity Log. Its tools also have no equivalent of Resource Graph `resourcechanges`, which gives property-level changes with `changedBy`.

#### Decision

**1. The Change Correlator agent is the one place that answers "who changed this, when, how, and is there a ticket".**
- It is the shared agent already planned in phase 2 (capability `change.correlate`).
- Other agents ask it through `wardens.handoff`; `terraform.drift.explain → change.correlate` is already in `framework/config/handoff.yaml`.
- No agent queries audit logs on its own, and we do not build a change-evidence MCP server.

**2. Per provider, it uses the provider's MCP server only where that server passes our acceptance test.** Otherwise it uses a small read tool of its own, in its `tools/`.
- **Acceptance test:** two cases per provider, recorded in the Correlator's eval set:
  - a resource that was **deleted**, together with its parent;
  - a single **attribute** changed on a live resource.
- A server passes only if it returns the actor, the time and the client for both cases.
- **Moving a tool to an MCP server:** under the placement rule in 14, a tool of its own becomes an MCP server only if a second agent needs that raw tool, rather than the Correlator's answer.

| Source | Today | Why |
| --- | --- | --- |
| Azure | **Own tool:** Activity Log REST, filtered by resource id or resource group (90 days), plus Resource Graph `resourcechanges` (14 days, property-level) | Azure MCP server failed the deleted-resource case and has no property-level changes (tested 2026-11-02) |
| AWS | **Candidate:** the AWS Labs CloudTrail MCP server (`lookup_events`, 90 days of management events) | Searches events by resource name rather than resolving a live resource; run the acceptance test before adopting it |
| GCP | **Own tool:** Cloud Audit Logs, Admin Activity (400 days) | No Google-published MCP server for Cloud Logging found (2026-11-02) |
| Cloudflare | To test: Cloudflare's MCP servers against the account audit logs API | |
| GitHub | **Planned, [0034](#adr-0034):** the events API plus a webhook log the console records (the org audit-log API needs Enterprise Cloud; the org is on Free) | GitHub's MCP server not tested against the two cases yet: test it in step G1 |
| Jira | To test: Atlassian's MCP server against a JQL search of our own | Needs a Jira site and projects, which the infra repositories don't have yet (`jira.enabled: false`) |

**3. Lookups run from the Correlator's code, not from LLM tool calls.**
- For each resource, a fixed plan runs:
  1. Look up its events in the window.
  2. If there are none, look up its parents.
  3. Resolve each actor.
  4. Search for tickets.
- It calls MCP tools or its own tools as a client, the same way the drift agent calls GitHub today. Runs are therefore repeatable and testable, and raw event text stays out of the model's tool loop.
- **The LLM's job:**
  - judges which events are relevant;
  - matches tickets to the change;
  - writes the summary;
  - answers an operator's follow-up questions, where it may call the read tools itself, under the rules in 14.
- **Window:** from the stack's last successful apply to the scan's start, capped at the source's retention.

**4. One event shape for every provider.**
- `contracts/schemas/change-event.schema.json` defines it. Each event carries:
  - the source and the resource id;
  - `matchedBy`: the resource itself, or a parent that cascaded;
  - the operation (create / update / delete / action) and its status;
  - the time;
  - the actor: its kind (person / pipeline / other workload / unknown), id and display name;
  - the client (portal / CLI / Terraform / SDK / unknown);
  - the correlation id;
  - the property changes, where the source gives them;
  - links to related tickets.
- The Correlator returns a list of these, with a summary and its confidence, as a `finding`. It reports correlation, never proof of cause (phase 2 §5).
- **Known pipeline identities** (each infra repository's CI identity) are configuration, so "the infra-gcp pipeline" and "a person in the portal" are told apart.

**5. Identity and data handling.**
- **Identity:** the Correlator has its own identity under homelab ADR 0071:
  - an Entra app through workload identity federation, with Reader on the subscriptions (which includes the Activity Log and Resource Graph);
  - Graph `User.Read.All` and `Application.Read.All` to turn object ids into names;
  - read roles on other clouds as they are added.
- **Credentials:** each MCP server it uses runs in the Correlator's namespace with these same read-only credentials.
- **Personal data:** an actor's name or UPN is personal data.
  - It goes into the finding and the notification for people.
  - The model sees only the actor's kind, the client and whether a ticket matched.
  - The threat model, data classification (24) and the consumers' manifests say so.
- **When nothing is found** (no event in retention, or a source unavailable), the finding says that explicitly, with the window searched.

#### Considered options

- **A tool inside each agent (the drift agent's own Activity Log reader):** rejected. Every new agent would copy it, and the evidence would differ between agents.
- **A change-evidence MCP server we write and run:** rejected for now. It is a service to deploy, secure and keep up to date with every provider's API, and it duplicates the Correlator's job. The Correlator's own tools can become one later under the placement rule.
- **The Correlator calls providers' MCP servers through the LLM only:** rejected. The core lookup would be non-deterministic and hard to evaluate, and vendor tools fail on the main case (deleted resources).

#### Consequences

- **Drift findings:** they gain an actor, a time, a client and tickets once the Correlator is live. Until then the drift agent keeps reporting "investigate".
- **Change records:** a ticket the Correlator matches becomes the `change_record` that the drift gate already requires before codify.
- **Order of work:**
  1. The Correlator's Entra identity (ADR 0071).
  2. The Azure tools and the event schema.
  3. The drift → Correlator handoff.
  4. Jira, once a site and projects exist.
  5. The other clouds, each after its acceptance test.
- **First eval case:** the Foundry deletion of 2026-11-01 (one person in the portal, a cascade to the deployment and role assignments). The plan artifacts of drift scan run 41348526292 expire about 2026-11-09, so harvest them before then.
- **Vendor MCP servers we adopt** are pinned (`reviewedServerEntry`, `definitionSha256`). An upgrade blocks the Correlator until someone reviews it, and that review is the price of not maintaining the API client ourselves.
- **Deletions get proposals in the drift agent** (remove from code with a draft PR when intended; re-create by apply when not). That is a separate decision.

#### Related

- **Refines:** the Change Correlator in phase 2 §1.4 and stage 5 `correlate` in the terraform-drift build guide.

## ADR-0017: Cluster upgrade readiness: one provider-neutral agent, a small adapter per Kubernetes distribution
{: #adr-0017 }

<span class="adr-status adr-status-proposed">Proposed</span> <span class="adr-meta text-muted">2026-11-02 · `platform-wardens`</span>

#### Context

An upgrade of a Kubernetes cluster fails or hurts for reasons that are mostly the same everywhere:
- an API the workloads use is removed in the target version;
- nodes are too far behind the control plane;
- a PodDisruptionBudget or a single replica blocks a drain;
- an admission webhook whose backend is down rejects every write.

Only the version questions depend on who runs the control plane: which versions exist, which one to go to next, how nodes are upgraded, and what the provider already checks.

Measured on the homelab on 2026-11-02:
- **Versions:** all five k3d clusters (core, platform, mon, ai, wardens) run v1.35.5+k3s1. The k3s release channels say v1.35.9+k3s1 is the latest 1.35 patch, and `stable` is v1.36.5+k3s1.
- **Deprecated APIs:** every API server's `apiserver_requested_deprecated_apis` metric shows requests to deprecated APIs: Kyverno's `kyverno.io/v1` and `v2` policies on four clusters, and core `v1` Endpoints everywhere. None has a removal release set yet.

#### Decision

**One agent, `cluster-upgrade-readiness`, capability `k8s.upgrade.readiness`, L0 (a report). A deterministic workflow first (decision 0009 order of preference). It is proactive: a weekly schedule per fleet, and an operator can run it for one cluster.**

**1. Generic checks, the same for every conformant cluster** (Kubernetes API, read-only):

| Check | Source | Blocks the upgrade when |
|---|---|---|
| Deprecated APIs in use | `apiserver_requested_deprecated_apis` (the server's own record of requests, with `removed_release`) | the API is removed in or before the target version |
| Version skew | server version, and each node's kubelet version (skew policy: kubelet at most 3 minors older, never newer) | a node is outside the policy for the target |
| Drain blockers | PodDisruptionBudgets with `disruptionsAllowed: 0`, single-replica Deployments and StatefulSets, pods without a controller | warning: the upgrade waits or causes an outage |
| Webhooks that can wedge writes | validating and mutating webhooks with `failurePolicy: Fail` whose service has no ready endpoint | yes: writes, including the upgrade's own, fail |
| Upgrade path | the adapter's available versions | a minor version is skipped (one minor at a time) |

**2. One adapter per distribution** (version facts, and the provider's own checks where they exist):

| Adapter | Detects | Versions | Notes |
|---|---|---|---|
| `k3s` (first) | `+k3s` in the server version | k3s release channels: latest patch of the current minor, and `stable` | k3d clusters are recreated to change version (infra-local), so the plan includes the Velero backup and restore |
| `generic` | anything else | none: the target comes from the request | generic checks only |
| `aks`, `eks`, `gke` (later) | provider hints in the server version and node labels | AKS upgrade profile; EKS standard and extended support; GKE release channel | read the provider's own insights (EKS upgrade insights, GKE deprecation insights, AKS's stop on deprecated API usage) instead of recomputing them; each adapter passes the 0016-style acceptance test first |

**3. Access.**
- **Reads go through `kubectl get --raw`** with a kubeconfig context per cluster. kubectl already speaks every distribution's authentication (client certificates, exec plugins for EKS, GKE and AKS), so the agent needs no provider SDK.
- **Read-only, enforced by RBAC:** one ClusterRole with `get`/`list` on the resources above and `get` on `/metrics` and `/version`. No secrets.
- **Locally,** it uses the operator's contexts.
- **In the `wardens` cluster,** it needs short-lived read-only tokens for the other clusters: Phase 6 step 2, not built yet.

**4. Output.**
- **Findings:** one per cluster and check that fails.
- **Report:** one per cluster, with an ordered plan:
  1. fix blockers;
  2. patch the current minor;
  3. one minor at a time to the target;
  4. after each step, re-run the readiness check.
- **Notification:** a readable digest.
- **Later:** a model may write the plan's rationale and pick the relevant upstream release notes. The checks and the plan order stay deterministic.

#### Considered options

- **AKS-only agent:** rejected. There are no AKS clusters, and the generic checks don't depend on AKS.
- **A provider SDK or MCP server per provider for cluster reads:** rejected for the Kubernetes API, which kubectl covers. Provider APIs are used only in the adapters, for versions and insights.
- **Scanning manifests in git for deprecated APIs (pluto-style):** later, as an extra source. The API server's metric reflects real use and needs no deprecation list to keep up to date. A stored object that nobody requests is missed until then.

#### Consequences

- **Runs today:** the agent runs locally against the homelab clusters. In-cluster runs wait for Phase 6 step 2 (read-only multi-cluster access).
- **First real findings:**
  - patch 1.35.5 → 1.35.9;
  - minor 1.36.5 is available;
  - the Kyverno policy API versions and core v1 Endpoints are deprecated without a removal date. They are warnings until a removal release is set.
- **Upgrades stay human:** L0 only. L1 (draft PRs bumping the k3s image in infra-local) is a later decision, once the report has proved accurate.

#### Related

- **Replaces:** the AKS-only "AKS Upgrade Readiness" candidate in phase 3 §1.2. There is no AKS cluster in any subscription (2026-11-02), and the owner wants a proactive agent that also runs on the local homelab.

## ADR-0018: Models are reached only through a gateway the agent cannot bypass: profiles, a guardrail on every call, and no provider credential in the agent
{: #adr-0018 }

<span class="adr-status adr-status-proposed">Proposed</span> <span class="adr-meta text-muted">2026-11-03 · `platform-wardens`</span>

#### Context

15 says models are reached only through the platform owner's approved resource types, and `wardens.llm` is the only code that builds a model. That is a rule for agent code. Nothing outside the code enforces it:

- `wardens.llm` also accepts `anthropic` and `azure-openai` providers. A worker configured with them talks to a provider directly.
- On the homelab each agent has its own LiteLLM virtual key (`kv/wardens/<agent>`, `litellm_api_key`), but which models and budget the key allows isn't recorded anywhere in this repo.
- The `wardens-agent` chart allows HTTPS egress to anywhere, because agents call GitHub and Azure. A NetworkPolicy can't tell a model provider from GitHub by hostname.
- Manifests name deployments directly (`WARDENS_LLM_MODEL: qwen3.5-35b-a3b`), so a model change is a configuration edit, not a reviewed change.
- No content-safety check runs on model input or output.

The AWS blueprint makes the gateway non-bypassable, identity-bound and the single place for the model allow-list, guardrail, quotas and usage attribution. It also states that gateway rate limits are traffic shaping, not authorization.

#### Decision

**1. The agent holds no credential a model provider accepts.** This is the control that makes the gateway non-bypassable; network rules are a second layer.

- Outside local development, `wardens.llm` accepts only `openai-compatible` with a base URL from the platform's gateway list (`framework/config/models.yaml`). `anthropic` and `azure-openai` stay for local development and refuse to start when `WARDENS_ENVIRONMENT` is `shadow` or `operate`.
- Homelab: provider keys live only in LiteLLM's own OpenBao path. An agent's path (`kv/wardens/<agent>`) holds only its LiteLLM virtual key.
- Azure: the agent's Entra identity has no role on Foundry or Azure OpenAI. Only APIM's managed identity has `Cognitive Services OpenAI User`. APIM validates the agent's workload token (`validate-azure-ad-token`) and maps it to the agent.
- Egress is narrowed where the endpoints are fixed (the chart's `egress.extra` replaces `https: true`). It is defence in depth, not the control.

**2. Logical model profiles are the model allow-list.**

- Profiles (`fast-extraction`, `classification`, `complex-reasoning`, `summarisation`) are listed in `framework/config/models.yaml` with the gateway alias that serves each one per environment. Each profile names its primary and fallback deployment, which is gateway configuration, not agent configuration.
- `models[].primary` and `fallback` in a manifest name a profile. The registry refuses a manifest that names anything else.
- The agent's gateway key (LiteLLM virtual key, APIM product subscription) allows exactly the profiles its manifest names, with the agent's `perDayUsd` as the key's budget. The key is created from the manifest by the onboarding step ([0022](#adr-0022)), not by hand.
- Changing what a profile points to is a model change under 25: every agent that uses the profile is re-evaluated before the change reaches `operate`.

**3. A guardrail runs on every model call, at the gateway, and fails closed.**

- Homelab: a LiteLLM `pre_call` guardrail (prompt-injection and secret detection) on every `wardens-*` profile, plus a `post_call` check for secrets in output. Azure: APIM `llm-content-safety` policy with Prompt Shields.
- If the guardrail can't run, the gateway refuses the call. `wardens.llm` treats the refusal like a model failure: the stage takes its deterministic fallback, and the run record says why.
- Interventions are a metric (`wardens_guardrail_interventions_total` by agent and profile), so a spike pages through [0011](#adr-0011).

**4. Rate limiting is not authorization.** Gateway rate and token limits shape traffic and may fail open. The hard limits are the budgets `wardens.llm` enforces in code (15) and the provider quotas. No control may rely on a gateway rate limit to deny.

**5. Inference and tools are separate trust boundaries.** The gateway key or token is used for inference only. It is never a tool credential, and tool credentials ([0019](#adr-0019)) are never sent to the gateway. The boundary is separate tokens and audiences, not separate products: APIM may serve MCP from the same instance under its own audience ([0031](#adr-0031)).

#### Considered options

- **Egress allow-list as the main control:** rejected. NetworkPolicy has no hostnames, and agents need HTTPS to GitHub and Azure. An FQDN-aware egress proxy can come later as a second layer.
- **Agent-side guardrail in `wardens.llm`:** rejected as the main check. It runs inside the process it is meant to check, and every new provider would need it again. A small agent-side check (quoting untrusted data, 18) stays.
- **Manifests keep naming deployments:** rejected. A model change would bypass review and re-evaluation.

#### Consequences

- `wardens.llm`: profile resolution, the environment check on providers, and handling of guardrail refusals. Category 15's "Logical model profiles (target; not built)" becomes this decision.
- homelab-gitops: the LiteLLM profiles and guardrail settings in the `ai` cluster; a per-agent key created from the manifest with its allowed profiles and budget. infra-azure: APIM policies, and no Foundry role for agent identities.
- The run record already holds the model version; it also records the profile.
- A gateway outage stops every model call. Agents fall back to their deterministic stages, so findings degrade to "unknown" instead of failing silently. Gateway health is a platform SRE alert ([0021](#adr-0021)).
- Local development keeps direct providers, so an agent's behaviour against the real gateway is proven only in `shadow` ([0023](#adr-0023)).

#### Related

- **Resolves open decision:** "Logical model profiles" and "content safety" in 15; the inference half of the identity question in 08. Items C1, C2, C3, C9 and C10 of the blueprint gap review.

## ADR-0019: Tool calls are checked against the manifest inside the stage; an MCP gateway comes with the first shared MCP server
{: #adr-0019 }

<span class="adr-status adr-status-proposed">Proposed</span> <span class="adr-meta text-muted">2026-11-03 · `platform-wardens`</span>

#### Context

14 already requires one logged path for tool calls, read and act tools declared in the manifest, `mcp:` tools pinned by `definitionSha256`, and act tools that are never LLM-callable. Two things are still open:

- **Where the check runs.** Guardrail point 2 of 09 (check each tool call before it runs) is not built. `GuardedToolset` limits the LLM to declared read tools, but there is no per-call check of arguments against the tool's `scope`, and no per-call audit entry.
- **Whether tasks between agents carry a signed caller assertion,** or Temporal's isolation is enough.

The blueprint routes every tool call through a tool gateway that authenticates the calling runtime, derives its targets from approved catalog entries, and invokes only exact approved targets.

Today every tool is `source: local`, with no MCP servers deployed, and the agents run in one Temporal namespace (`wardens`) with one task queue per agent.

#### Decision

**Point 2 runs in `wardens`, inside the stage, for every tool call.**

- `GuardedToolset` gets a `before_tool_call` hook that refuses a call when:
  - the tool isn't in the manifest;
  - the tool is `kind: act` and an LLM issued the call;
  - the arguments fail the tool's parameter schema;
  - the target is outside the tool's declared `scope`.

  A refused call returns a structured error to the model and writes an audit entry. It never raises past the stage.
- Every call, allowed or refused, writes an `execute_tool` span with redacted arguments and the decision. This is the "one logged path" of category 14 while there is no gateway.
- Deterministic stages that call act tools go through the same check before the guardrails point 4 check at emit.

**An MCP gateway comes with the first MCP server shared by more than one agent.** From then on, every `mcp:` call goes through the gateway:

- it authenticates the agent's workload identity;
- it allows only the servers and tool hashes listed in the agent's manifest;
- it logs every call.

Point 2 stays in the stage as a second check. Which gateway product is chosen then, from the candidates that meet this contract.

**Between agents, Temporal isolation is enough for v1.** Child tasks are created only by `wardens.handoff` inside the incident workflow, in the one `wardens` Temporal namespace. Only agent workers hold Temporal client access, through namespaces labelled `homelab/wardens-agent=true` (homelab) or Workload ID (Azure). No signed caller assertion is added while all agents run in one Temporal namespace in one trust domain. Adding a namespace, a cluster, or an agent built outside this repo (27) reopens it.

#### Considered options

- **Deploy an MCP gateway now:** rejected for v1. There are no MCP servers yet, so it would gate nothing, and the gateway would become one more shared service to run.
- **Only `GuardedToolset` filtering, no per-call check:** rejected. It doesn't check arguments or scope, and leaves no per-call evidence.
- **Signed caller assertions on every task now:** rejected. It costs key management for no gain inside one namespace.

#### Consequences

- `wardens.llm.GuardedToolset` and `wardens.guardrails`: the point 2 hook, scope checks and audit entries. Category 09 point 2 moves from "not yet" to built when this lands.
- Each tool's `scope` must be machine-checkable (for example a list of repositories, subscriptions or name patterns), not prose. The template and the existing manifests change to match.
- Control tests for point 2 follow [0024](#adr-0024): an allowed call next to each refused one.
- The gateway choice is a future decision record, triggered by the first shared MCP server in the phase plan. That record is [0031](#adr-0031), which also decides whose credential each MCP server uses.

#### Related

- **Resolves open decision:** "MCP gateway product, or `wardens` middleware only" in 14; "inter-agent authentication" in 08. Items C4 and C9 of the blueprint gap review.

## ADR-0020: Domain cells: the unit of ownership, budget and blast radius above the agent
{: #adr-0020 }

<span class="adr-status adr-status-proposed">Proposed</span> <span class="adr-meta text-muted">2026-11-03 · `platform-wardens`</span>

#### Context

The blueprint scales by repeatable **workstream cells**, not by hand-configured agents. A cell has an owner, cost centre, data classification, on-call, budgets and lifecycle state, and nothing outside the pipeline can change it.

platform-wardens today has two levels and nothing between them:

- **Per agent:** its own Kubernetes namespace, service account, Entra identity, task queue, kill switch and budget. This is finer than a cell, and stays.
- **Platform-wide:** one cluster, one Temporal namespace (`wardens`), one gateway.

Ownership, budgets, cost reporting and approver groups are really per domain, because each team owns its agents ([0011](#adr-0011)). Today each agent restates them. A domain-level control that is missing (for example "stop all DBA agents", or "DBA spend this month") has to be done agent by agent.

#### Decision

**A cell is one domain's set of agents: `devops`, `sre`, `dba`, plus `common` for shared capability agents.** The manifest's `domain` decides the cell; shared capability agents (Change Correlator, Evidence Investigator) are in `common`, whatever team owns them.

A cell has:

| Item | Where it lives |
| --- | --- |
| Owner team, independent reviewer team, approver group, cost centre, on-call | `framework/config/cells.yaml` (one entry per cell); agent manifests inherit, and may only narrow |
| Daily budget across the cell's agents | `cells.yaml`; enforced by `wardens.llm` with the agent and incident budgets (15) |
| Highest data class the cell may handle | `cells.yaml`; the registry refuses an agent whose manifest exceeds it (24) |
| Kill switch for the whole cell | One ConfigMap per cell, checked with the agent's own switch; either one engaged stops acts (23) |
| Label on every resource and span | `wardens/cell: <cell>` ([0025](#adr-0025)) |
| Default egress and resource quota | Set per cell in homelab-gitops; per-agent namespaces stay |

What a cell is **not**:

- It is **not a Temporal namespace.** Cross-domain handoffs are child workflows, and Temporal runs a child workflow only in its parent's namespace. All cells share the `wardens` namespace; task queues stay per agent.
- It is **not a cluster or a subscription.** A cell can move to its own cluster later without changing manifests.

Nothing outside the pipeline changes a cell or its agents. `cells.yaml` and manifests change through pull requests reviewed by the cell's owner team and the framework owner.

#### Considered options

- **Per-agent only (today):** rejected. Domain-wide budgets, kill switches and cost reporting would stay manual.
- **One Temporal namespace per cell:** rejected while handoffs between domains are child workflows. Revisit if handoffs move to signals between namespaces.
- **One cluster per cell:** rejected for the homelab and v1. Too much to run for three teams.

#### Consequences

- New `framework/config/cells.yaml`, and registry checks: the cell exists, the manifest only narrows the cell's settings, and the data class is within the cell's limit.
- homelab-gitops: the cell label and a cell kill-switch ConfigMap in the `wardens-agent` chart; per-cell defaults in the wrapper charts. Azure keeps the namespace layout in the shared-agents phase doc.
- Cell spend, alerts and dashboards come from the `wardens/cell` label.
- Promotion and retirement still happen per agent ([0023](#adr-0023)); a cell has no stage of its own.

#### Related

- **Resolves open decision:** n/a (formalises the namespace layout in shared-agents-deployment §2). Item A2 of the blueprint gap review.

## ADR-0021: Platform ownership and fleet operations: who owns the shared parts, who owns each failure, and the review cadence
{: #adr-0021 }

<span class="adr-status adr-status-proposed">Proposed</span> <span class="adr-meta text-muted">2026-11-03 · `platform-wardens`</span>

#### Context

Category 26 defines roles per agent: owner, reviewer, operators and approvers. The shared parts have no owner:

- the registry and `framework/config`;
- the model gateway ([0018](#adr-0018));
- the eval harness;
- the templates ([0022](#adr-0022));
- Temporal;
- the telemetry pipeline.

[0011](#adr-0011) sends every alert to SRE on-call, but doesn't say who owns the follow-up for each kind of failure. Nothing schedules the recurring reviews, and no metric tells whether the platform itself is working: whether teams can ship agents on it, and how fast.

The blueprint separates platform engineering, product teams, security, platform SRE, cost owners and human approvers. It gives each failure class an owner and a first action, and fixes a review cadence.

#### Decision

**Platform roles.** Named people are recorded in `framework/config/ownership.yaml` under `platform:`; the people are still to be named (26).

| Role | Owns | Doesn't own |
| --- | --- | --- |
| Framework owner | `wardens`, contracts, registry rules, templates and their versions, the eval harness, this repo's `framework/` and `contracts/` | An agent's behaviour, prompts or evaluation set |
| Platform SRE | Temporal, the model gateway's health, the telemetry pipeline, the run-record and audit stores, rollback tooling, platform incidents | Model admission, guardrail settings |
| Security reviewer | The threat-model baseline, guardrail settings, the reviewed MCP server list, adversarial cases, exceptions | Day-to-day operation |
| Cost owner | Allocation labels, cell budgets, the monthly cost report, unallocated spend | Authorization changes (a budget breach is capped by budgets, never by changing access) |
| Cell owner (one per cell, [0020](#adr-0020)) | Its agents' code, prompts, tools, evals, data classification, agent incidents | Shared parts |

The platform roles and the agent roles follow the same rule: no person checks their own work.

**Who owns each failure.** Alerts still go to SRE on-call ([0011](#adr-0011)). SRE hands the follow-up to the owner below:

| Failure | Owner | First action |
| --- | --- | --- |
| An agent's quality regresses | Cell owner | Stop promotion; roll back to the last digest ([0023](#adr-0023)); add the case to the eval set |
| Model gateway degraded or refusing | Platform SRE | Check gateway health and quotas; agents fall back to deterministic stages meanwhile |
| Spike in guardrail interventions | Cell owner with the security reviewer | Correlate traces; classify (attack, false positive, data change); add an adversarial case; change policy only through review |
| Tool-call loop or runaway cost | Cell owner | Kill switch for the agent; budgets already cap it; fix and re-evaluate |
| Authorization anomaly across agents or cells | Security reviewer with platform SRE | Kill switch for the cell; revoke the identity; read the audit log |
| Missing telemetry or run records | Platform SRE | Fix the pipeline; an agent without run records is quarantined after 24 hours |
| Unallocated spend | Cost owner with the cell owner | Find the missing label; cap with the budget |

**Review cadence**, each producing a file under `reports/`:

- **Monthly:** cost and quota per cell, unallocated spend, SBOM and vulnerability findings, measures report per agent (category 17, Operate).
- **Quarterly:** access review of identities and grants against the manifests, kill-switch drill and rollback drill on one agent per cell, threat-model baseline.
- **On every behaviour change:** adversarial cases reviewed with the change ([0024](#adr-0024)).

**Platform product measures**, on one Grafana dashboard:

- time from intake to the first `shadow` deploy;
- share of agents on a supported template version;
- gate failure rate, by gate;
- rollback success rate;
- unallocated spend;
- time to retire an agent with zero leftovers.

#### Considered options

- **Each team owns the shared parts it uses most:** rejected. The registry and the gateway have no single heaviest user, and split ownership left them unowned.
- **Per-team alert routing:** rejected again, as in 0011. One on-call owner, then a named follow-up owner.

#### Consequences

- `ownership.yaml` gains a `platform:` section; the registry refuses to start if a platform role is unset outside local development.
- A fleet runbook (`docs/operations/fleet-runbook.md`) holds the failure table, with commands, and the cadence calendar.
- The dashboard needs the dimensions in [0025](#adr-0025).
- The sponsor names the people; until then, the framework owner holds the unnamed roles and the gap is reported in the monthly review.

#### Related

- **Resolves open decision:** open matter 1 of the standard, "who owns the shared parts once more than one team builds" (framework/README.md); the platform half of "named roles" in 26. Refines [0011](#adr-0011). Items A1, A8, A9 and A10 of the blueprint gap review.

## ADR-0022: Golden paths: versioned agent templates per shape, and onboarding from a self-service template
{: #adr-0022 }

<span class="adr-status adr-status-proposed">Proposed</span> <span class="adr-meta text-muted">2026-11-03 · `platform-wardens`</span>

#### Context

Every agent starts as a copy of `templates/agent/`. That template has no version, so it can't tell which agents are on an old layout. It fits one shape, while the agents built so far already have three:

- terraform-drift: scheduled, with a draft PR;
- change-correlator: a shared capability called by handoff;
- incident-triage: a reactive investigator, planned.

`templates/mcp-server/` is empty.

Onboarding an agent today touches four repos by hand:

- this repo: the manifest and the workspace member;
- infra-azure: the Entra identity;
- homelab-gitops: the wrapper chart and the image workflow;
- OpenBao: the gateway key and secrets.

The blueprint's golden paths are platform-maintained and versioned. Each carries the gateway clients, extension points, an eval corpus, dashboards, budgets and retirement steps. A self-service onboarding flow then removes the ticket queue.

#### Decision

**Three agent templates plus one MCP server template**, each under `templates/<path>/`:

| Template | Shape | Fixed parts |
| --- | --- | --- |
| `scheduled-advisor` | Proactive; runs on `manifest.schedules[]`; L0/L1 finding or draft PR | Schedule wiring, digest notification, draft-PR guard (0013) |
| `reactive-investigator` | Runs as a child of the incident workflow; returns findings and suggested handoffs | Handoff suggestions, context refs, routing samples |
| `shared-capability` | Called by capability from other agents; no schedule; depth-1 handoffs | Caller allow list, per-caller budgets (shared agents) |
| `mcp-server` | A reviewed MCP server for a data source | Read/act tool split, scoped credentials, definition hashing |

Every template carries the same contract:

- manifest;
- `workflow.py` over an `Activities` protocol;
- `worker.py`;
- eval scenarios, including the adversarial cases of [0024](#adr-0024);
- `gates/`;
- the docs set: why-an-agent, runbook, threat model, ROI, retirement;
- Dockerfile;
- image workflow.

**Templates are versioned.**

- Each template has a semantic version and a `CHANGELOG.md`. The manifest records `template: {name, version}`.
- The framework owner supports the current and the previous minor version. A template release lists the upgrade steps.
- The registry warns on an unsupported template version and refuses promotion to `operate` on it.

**Onboarding is a self-service template in the portal.** A Backstage scaffolder template in `self-service-portal` runs the steps in order, as pull requests:

1. **Intake:** the purpose, the why-an-agent statement and a risk tier (highest action level and data class).
2. **Agent folder:** in this repo, from the chosen golden path, with the manifest filled from the intake and the workspace member added.
3. **Identity:** in infra-azure.
4. **Wrapper chart:** in homelab-gitops, at `replicas: 0` until G2.
5. **Secrets:** the request for the agent's OpenBao path and gateway key, with profiles and budget taken from the manifest ([0018](#adr-0018)).

Nothing is applied without review. The scaffolder opens the pull requests; the normal reviewers merge them.

#### Considered options

- **One template with options:** rejected. The three shapes differ in wiring, not in settings, and options hide which parts are fixed.
- **A CLI instead of the portal:** kept as the fallback (`uv run wardens new …` calling the same generator). The portal is the front door because the platform already runs Backstage for its other services.
- **Templates for other agent frameworks (LangGraph, CrewAI):** rejected ([0012](#adr-0012)); outside agents use the adapter in 27.

#### Consequences

- `templates/agent/` becomes `templates/reactive-investigator/`, and the other two are derived from terraform-drift and change-correlator. Existing agents record `template: {name, version}` in their manifests.
- The manifest schema gains `template`; the registry check for supported versions is added.
- `self-service-portal` gains a scaffolder template, and the generator lives in this repo so the CLI and the portal produce the same output.
- The measure "share of agents on a supported template version" ([0021](#adr-0021)) comes from the registry.

#### Related

- **Date note:** onboarding steps updated 2026-11-20, see the note at the end
- **Resolves open decision:** n/a (extends the adoption steps in 17 and `templates/agent/`). Items A3 and A4 of the blueprint gap review.

#### Note (2026-11-20): onboarding is a new repository, not a folder

Decision [0040](#adr-0040) moved every agent into its own repository (plan
repo-per-agent phases 7 and 8; the monorepo's `agents/` folder was removed in #294). Step
2 of the onboarding above no longer adds a folder and a workspace member to this repo. The steps are now:

1. **Intake:** unchanged.
2. **Agent repository:** `wardens new-agent <domain>/<name> --cell <cell> --dest ../warden-<name>` renders the copier
   template (`copier.yml`, `templates/agent/`) into a new `cloudutsukpilot/warden-<name>` repository, with the manifest
   and README header filled from the answers and the `wardens` release and wheel image digest pinned. The GitHub
   repository itself is created as code in infra-github. Its CI calls homelab-gitops `agent-ci.yaml` (ADR 0111),
   which also publishes the agent's registry entry to cloudutsukpilot/wardens-deploy
   ([0042](#adr-0042)).
3. **Identity:** unchanged.
4. **Wrapper chart:** unchanged (homelab-gitops `apps/<name>/values.yaml`; agent-ci writes the image digest).
5. **Secrets:** unchanged.
6. **Staying current:** a new `wardens` release reaches the repository through `wardens bump`: a pull request (opened by
   `wardens-py.yaml`'s bump job when `WARDENS_BUMP_ENABLED` is on, else `wardens bump --open-pr` by hand) that moves the pin, the Dockerfile's wheel image digest and `uv.lock` together and runs
   `copier update`, so the template's version is the one in the repository's `.copier-answers.yml`.

One copier template (`templates/agent/`) is built so far, not the three shapes above; its version is the `wardens`
release it was rendered from. The rest of this decision (the shapes, the portal front door) is still proposed.

## ADR-0023: Release path: one digest promoted from shadow to operate on deployed evidence, with provenance, a behaviour hash, a rehearsed rollback and retirement without leftovers
{: #adr-0023 }

<span class="adr-status adr-status-proposed">Proposed</span> <span class="adr-meta text-muted">2026-11-03 · `platform-wardens`</span>

#### Context

Today an agent's image is built on `main` by homelab-gitops `build-image.yaml`:

- Trivy gates;
- a CycloneDX SBOM attested with Cosign;
- a signed image in Zot;
- the digest written into `apps/<agent>/values.yaml`;
- Argo CD deploys it.

There is one deployment per agent. Gaps:

- **No separate shadow deployment.** Lifecycle stage 3 (L0 live) and stage 5 (operate) run the same deployment, so a new digest reaches the live agent as soon as it is built.
- **Evaluation runs only in unit tests,** with `TestModel` and recorded fixtures. Nothing evaluates the deployed worker against the real gateway and model before a gate.
- **No provenance.** The build uses `--provenance=false`. Nothing ties a run to the exact prompts, manifest and tools that produced it, apart from the image digest.
- **No rehearsed rollback.**
- **Retirement is a checklist** (`templates/agent/docs/retirement.md`), with no check that nothing is left behind and no order in which grants are removed.

The blueprint deploys to non-prod, invokes and evaluates the deployed runtime, and approves production from that evidence. It samples during update and rollback, and retires in dependency order with an independent leftovers inventory.

#### Decision

**Two deployments per agent, one digest.**

| Deployment | Runs | Values file | Gets a new digest |
| --- | --- | --- | --- |
| `shadow` | Every build from `main`; L0 only, whatever the manifest allows; output to the shadow channel, never to approvers | `apps/<agent>/values-shadow.yaml` | Automatically, from `build-image.yaml` |
| `operate` | The promoted digest at the agent's granted levels | `apps/<agent>/values.yaml` | Only by a promotion pull request |

- Both run in the agent's namespace with separate task queues (`<agent>-shadow`, `<agent>`) and `WARDENS_ENVIRONMENT` set. A shadow worker cannot take operate tasks.
- A promotion pull request copies the shadow digest into `values.yaml` and adds the gate file with the evidence below. Argo CD deploys it after merge.

**Deployed evaluation is the gate evidence.** A workflow, `eval-deployed.yaml`, runs the agent's eval scenarios as tasks against the **shadow** worker: real gateway, real profiles, real guardrail. It writes `gates/eval-<digest>.json` with:

- the scores against the floors;
- the guardrail outcomes;
- cost per run (median and p95);
- the control evidence of [0024](#adr-0024).

A promotion pull request without a passing report for the same digest fails CI. Unit-test evals stay as the fast check on every pull request.

**Provenance and a behaviour hash.**

- `build-image.yaml` builds with SLSA provenance and attests it with the same Cosign key as the SBOM. Kyverno verifies it on `operate` namespaces.
- At build time, a **behaviour hash** is computed and baked into the image as a label: the SHA-256 of `manifest.yaml`, every `*.prompt.md`, the tool definitions and the template version. The worker writes it into every run record, so two runs can be compared knowing whether their behaviour inputs differed. A behaviour hash change triggers re-evaluation (25).

**Rollback is a digest revert, and it is rehearsed.**

- Rollback = revert the promotion pull request. Argo CD redeploys the previous digest. In-flight workflows finish on the worker version they started on (Temporal worker versioning, the "not yet" item in `durable`).
- Each cell rehearses one rollback per quarter ([0021](#adr-0021)), sampling a live task during the switch.

**Retirement runs in dependency order, then an inventory proves nothing is left.**

1. Remove the agent from routing (`lifecycle.stage: retired`), and from other agents' handoff allow lists.
2. Delete schedules, then scale both deployments to 0.
3. Remove grants on targets (repositories, subscriptions, databases), then the gateway key.
4. Remove the identity and federated credentials, then the OpenBao path.
5. Remove the gitops app; images in Zot age out by retention.
6. Archive run records and audit, which are never deleted at retirement.

`scripts/residue_inventory.py <agent>` checks each item independently: Temporal schedules, task-queue pollers, Entra app and federated credentials, role assignments, OpenBao path, gateway key, gitops app, namespace, dashboards. Retirement is done only when it reports zero. Its output is the G5 gate file.

#### Considered options

- **One deployment, and promotion by changing the manifest's level:** rejected. A new digest reaches operate without deployed evidence, which is today's gap.
- **A separate shadow cluster:** rejected for v1. Namespaces and task queues isolate enough at L0/L1; revisit before L2.
- **Evaluate only in CI with live models, not against the deployed worker:** rejected. It misses the gateway, the guardrail, identity and configuration, which is where the deployed behaviour differs.

#### Consequences

- homelab-gitops: a second Argo CD application per agent; `build-image.yaml` writes to `values-shadow.yaml` and turns on provenance; Kyverno verifies provenance on `operate`.
- `wardens.durable`: worker versioning; `WARDENS_ENVIRONMENT`, read by `wardens.llm` ([0018](#adr-0018)) and `wardens.runtime`.
- `wardens.telemetry`: the behaviour hash in the run-record schema (a contracts change, re-triggering evals).
- Shadow doubles the model calls of a scheduled agent while both run. Shadow budgets are set per cell ([0020](#adr-0020)).
- `templates/*/docs/retirement.md` points to the ordered steps and the inventory script.

#### Related

- **Resolves open decision:** "CI wiring" of evaluation in framework/README.md; how gates G3 and G4 of 17 get their evidence. Items A5, A6, A7 and C6 of the blueprint gap review.

## ADR-0024: Control evidence: every denial test has an allowed twin, names the exact denial, and fails when the control is removed; threat baseline adds OWASP LLM Top 10 and STRIDE
{: #adr-0024 }

<span class="adr-status adr-status-proposed">Proposed</span> <span class="adr-meta text-muted">2026-11-03 · `platform-wardens`</span>

#### Context

The framework's safety rests on controls:

- the kill switch;
- autonomy levels;
- the approval wait;
- the hop budget and cycle checks;
- the ownership map;
- the gateway allow-list and guardrail ([0018](#adr-0018));
- tool-call checks ([0019](#adr-0019)).

The tests show that each control denies. They don't show that the denial came from the control. A test that "passes" because of a misconfigured identity, a missing resource, a timeout or a validation error proves nothing about the control. A test whose control was deleted could still pass.

The blueprint's evidence rules, from live validation:

- an authentication failure isn't an authorization proof;
- a missing resource isn't a denial;
- a timeout or 5xx isn't a denial;
- each negative test needs an authorized positive twin in the same run;
- the denial must name the exact error;
- removing the control must make the test fail.

Category 18 uses the OWASP Top 10 for Agentic Applications as the baseline. It doesn't map the OWASP Top 10 for LLM Applications (model-level risks such as sensitive information disclosure, improper output handling, unbounded consumption). It also has no threat model for the platform services themselves.

#### Decision

**Rules for control evidence**, in framework tests, agent tests and the deployed evaluation ([0023](#adr-0023)):

1. **Twin.** Each denial case has an allowed twin in the same test run, with the same identity and setup, differing only in the input that the control judges. If the twin fails, the denial case counts as not run.
2. **Exact denial.** The assertion names the control's own outcome, for example:
   - `GuardrailDenied(reason="kill_switch")`;
   - `ApprovalExpired`;
   - `HandoffRefused(rule="hop_budget")`;
   - the gateway's guardrail error code.

   An exception type, a timeout, a 5xx, a missing resource or a validation error never counts as a denial.
3. **Mutation.** Each control has a mutation test that disables it (a fixture that patches the check to allow) and asserts that the denial case now **fails**. A control without a passing mutation test is "unproven" in the conformance matrix.
4. **No sensitive data in evidence.** Evidence files hold correlation ids, outcomes and reason codes. They never hold secrets, tokens, prompts or model output.

The controls in scope, each with a twin, an exact denial and a mutation test:

- the kill switch (agent and cell, [0020](#adr-0020));
- autonomy level per action;
- approval: expiry, self-approval, wrong group;
- the ownership map;
- hop budget, cycle and cost narrowing;
- the registry's refusal of non-routable agents;
- tool-call checks;
- gateway profile and guardrail.

**Threat baseline.** Category 18 adds:

- **OWASP Top 10 for LLM Applications:** each item mapped to a control, or to "not applicable" with a reason, next to the ASI01–10 table.
- **STRIDE for the platform services:** the model gateway, Temporal (frontend, history, UI), the approval endpoint, the operator console and the telemetry pipeline. One table per service, kept in `docs/framework/18-threat-model.md`.

Each agent's `docs/threat-model.md` still confirms the agentic and LLM rows for that agent.

#### Considered options

- **Keep denial-only tests:** rejected. They can pass for the wrong reason.
- **A separate red-team suite only:** kept, but in addition. The red-team exercise before L2 (18) finds new attacks; these rules prove the controls we already have.

#### Consequences

- `framework/tests`: twin and mutation tests for each control in scope; a shared fixture to disable one control at a time.
- `wardens.guardrails` and `wardens.handoff`: denials carry a stable reason code that tests and run records can name.
- `wardens.eval`: the deployed report counts a denial only with a passing twin.
- The conformance matrix gains an "evidence" column: proven (twin + exact + mutation), partial, unproven.
- Category 18 and the agent threat-model template gain the LLM Top 10 table; category 18 gains the STRIDE tables.

#### Related

- **Resolves open decision:** n/a (refines the evidence that [0007](#adr-0007), 13 and 18 require). Items C5 and C11 of the blueprint gap review.

## ADR-0025: One set of dimensions on every span, metric, resource and gateway call, so behaviour and cost can be sliced and reconciled per agent and cell
{: #adr-0025 }

<span class="adr-status adr-status-proposed">Proposed</span> <span class="adr-meta text-muted">2026-11-03 · `platform-wardens`</span>

#### Context

[0010](#adr-0010) decides where telemetry goes, and [0011](#adr-0011) says alert labels carry `agent`, `domain`, `capability` and `correlationId`. There is no fixed list of dimensions across spans, metrics, Kubernetes resources, gateway spend and Azure resources. So:

- Fleet views (all agents on a model, all runs of one image, all agents of one template version) need ad hoc joins.
- Cost is bounded per run, agent and incident, but not **attributed**. Gateway spend, cluster cost and Azure resource cost can't be added up per agent or cell, or checked against the run records' own cost.
- Some "not yet" items depend on this: live `chat` and `execute_tool` spans, the run-record store, and the run-wide budget across activities.

The blueprint uses a fixed tag contract (application, agent, tenant, cost centre, environment), the same dimensions in telemetry, budgets per application, and a monthly reconciliation against billing data.

#### Decision

**The dimensions.** The same keys everywhere; the OTel attribute name, and the label or tag name on resources:

| Dimension | OTel attribute | Kubernetes label / Azure tag / gateway metadata | Source |
| --- | --- | --- | --- |
| Agent | `wardens.agent.id` | `wardens/agent` | manifest `name` |
| Cell | `wardens.cell` | `wardens/cell` | manifest `domain` → [0020](#adr-0020) |
| Capability | `wardens.capability` | — (spans only) | task |
| Environment | `deployment.environment.name` | `wardens/environment` (`dev`, `shadow`, `operate`) | `WARDENS_ENVIRONMENT` ([0023](#adr-0023)) |
| Revision | `wardens.agent.revision` | — | image digest |
| Behaviour hash | `wardens.agent.behaviour_hash` | — | build ([0023](#adr-0023)) |
| Template | `wardens.template.version` | — | manifest `template` ([0022](#adr-0022)) |
| Model profile, model | `wardens.model.profile`, `gen_ai.request.model` | — | [0018](#adr-0018) |
| Tool | `gen_ai.tool.name` | — | tool call |
| Cost centre | `wardens.cost_centre` | `wardens/cost-centre` | `cells.yaml` |
| Correlation | `wardens.correlation_id` | — | root task |

- `wardens.telemetry` sets the resource-level dimensions once per worker and the call-level ones per span.
- The `wardens-agent` chart puts the labels on every object it creates.
- The gateway key carries agent, cell, environment and cost centre as metadata, so gateway spend rows have them.
- Azure resources created for an agent (identity, role assignments, APIM subscription) carry the same tags through infra-azure.
- A metric or span without `wardens.agent.id` and `wardens.cell` is a bug. The collector adds `wardens.cell = "unallocated"` to it, so unallocated spend is visible instead of lost.

**Cost attribution and reconciliation.**

- Every model call's tokens and estimated cost already go to the run record (15). They are also emitted as `wardens_cost_usd_total` with the dimensions above.
- **Monthly:** per agent and cell, gateway spend (LiteLLM spend logs, APIM token metrics) is compared with the run-record cost. A difference over 10% is investigated; usually it means calls outside a run or wrong prices in `prices.yaml`. The result goes into the monthly cost review ([0021](#adr-0021)).
- A **run-wide budget across activities** is held in the workflow, not per activity. Each activity is given the remaining budget and returns what it used. This closes the "not yet" item in `wardens.llm`.

**Cardinality.** `correlation_id`, `revision` and `behaviour_hash` are span attributes only, never metric labels.

#### Considered options

- **Derive dimensions from namespaces and service names at query time:** rejected. Gateway spend and Azure resources have no namespace, and shadow and operate share one.
- **Use Azure Cost Management alone for cost:** rejected. The homelab has no billing data, and whole-subscription totals aren't per agent.

#### Consequences

- `wardens.telemetry`: the resource and span attributes, and live `chat` and `execute_tool` spans from Pydantic AI's instrumentation (built in plan repo-per-agent phase 3 step 13).
- `wardens.durable` and `wardens.llm`: the run-wide budget.
- homelab-gitops: chart labels, the collector's `unallocated` default, a Grafana dashboard per cell, and the platform measures dashboard of 0021. infra-azure: tags on agent identities and APIM subscriptions.
- 0010's collector rules gain one step before export: add `wardens.cell = "unallocated"` when the attribute is missing.

#### Related

- **Resolves open decision:** n/a (amends [0010](#adr-0010); extends cost accounting in 15). Items C7 and C8 of the blueprint gap review.

## ADR-0026: A conversational agent is one Temporal workflow per conversation, and the first one authors stack changes
{: #adr-0026 }

<span class="adr-status adr-status-proposed">Proposed</span> <span class="adr-meta text-muted">2026-11-04 · `platform-wardens`</span>

#### Context

Adding a resource to a stack means finding the repository and the stack, reading a module's README and writing `resources.yaml` by hand. People want to describe the change and review the result. That needs back-and-forth: which cloud, which stack, which values. Every agent so far runs one task to the end with no person in between, so the framework has no way to hold a conversation.

#### Decision

**It's an agent.** `agents/devops/stack-author`, capability `iac.resource.author`. Its job is to turn a request into a `resources.yaml` change, and its only write is a draft pull request, which [0013](#adr-0013) counts as L1.

**One Temporal workflow per conversation.** `wardens.durable` gives any agent two more methods on its Activities protocol, answered in the workflow like `now`: `next_message(wait_seconds)`, backed by a `message` signal, and `publish(view)`, read through a `view` query.

- A conversation survives a worker restart and writes one run record.
- The page polls the query, because a local model's turn can outlast any request timeout.
- A message sent during a slow turn waits its turn.

It ends after 30 idle minutes, 40 messages, the cost ceiling, the 4-hour deadline, or the kill switch.

**The operator console is the entry point.** It gets an Author tab and a `console-chat` channel (L1, $1.00 for the whole conversation, no handoffs). The console already signs people in, and only the person who started a conversation can read it or send to it (checked against the `submittedBy` memo).

**The model proposes, code checks, the person decides.**

- The model has five read tools through `GuardedToolset`. Its output is typed: a question, or a proposal.
- `stages/prepare.py` checks a proposal and turns it into an exact diff. A rejected proposal goes back to the model with the reasons, twice at most.
- The write is a deterministic stage reached only by a `confirm` message, which carries the hash of the diff on the page. A hash that doesn't match opens nothing, and a change with deletes also needs an explicit acknowledgement.
- `open_draft_pr` checks the file, branch, hash and kill switch again, in code.

**What it may change:** add, update and delete in one stack's `resources.yaml`, for any cloud in `config/targets.yaml`, including a new stack inside an existing environment. A new environment needs a `common_vars.yaml`, which stays with people. `terragrunt.stack.hcl` is generated by the entrypoint, so it's never written. Module docs are read at `main` of the shared module.

**Blocks versus warnings.** A wrong path, unknown module, secret or inexact edit blocks the pull request. Keys that look missing or unknown only warn, because they come from a text scan of `terragrunt.hcl` that can't be exact across every module. The real check is the terragrunt plan the pull request triggers. The agent watches that plan and posts its counts and addresses, never its values, in the conversation.

**Memory.**

- **Short-term** is the workflow's typed state: the last 16 lines, short notes on what scrolled out, and the change on the table. Tool results stay out of it, and are read again when needed.
- **Long-term** (21) is `wardens.state.memory`: per person, their last cloud, stack and location, with source, expiry (90 days) and `reviewed: false`. Code writes it from a change the person confirmed, never from model text. It reaches the prompt marked as unreviewed and can't satisfy any check.

**The model is a setting.** The homelab uses the local model through LiteLLM. Foundry or Anthropic is `WARDENS_LLM_*`.

#### Considered options

- **Keep the conversation in the console's process and use Temporal only for the pull request:** simpler, but a console restart loses the conversation, and most of the run has no record.
- **Temporal updates instead of a signal and a query:** an update's caller waits for the turn, and a local model's turn outlasts that wait.
- **Let the model call `open_draft_pr` after asking for confirmation:** rejected. An act tool is never LLM-callable ([0007](#adr-0007)), and a model can be talked into skipping a question. The button can't.
- **Add-only for v1:** the owner wants edit and delete too. Both are still only a draft pull request, and the plan shows the effect. Delete is marked irreversible, and needs the extra acknowledgement.
- **Parse `variables.tf` as the input contract:** rejected. `terragrunt.hcl` maps YAML keys to inputs and they differ (`resource_tags` to `tags`), so `variables.tf` gives wrong answers about YAML keys.

#### Consequences

- A conversation's text stays in Temporal's history for the namespace's retention, and it reaches the model. The agent says so when someone pastes a secret, and refuses to put one in a pull request, but it can't unsee it.
- The model's quality on tool calling isn't measured yet. The eval scenarios cover the guards, not its judgment. A weak local model means more questions and rejected proposals, not unsafe pull requests.
- GitHub Free has no branch rules: the same accepted risk as [0013's amendment](#adr-0013), with its own `author/` guard in code. People merge by hand, and no CODEOWNERS routes the review yet.
- The long-term store is a file on the worker's volume. It's fine for advisory notes and not the shared store 21 still leaves open.

**Note (2026-11-18, plan repo-per-agent phase 3 step 11, [0040](#adr-0040) rule 13):** the store is now `wardens.memory_items` in the state database, with row-level security per agent, reached only through the binding's `acts.memory`; the file store remains for local runs without `WARDENS_STATE_DSN`. The three items have keys (`last_cloud`, `last_stack`, `last_location`), the binding sets their provenance (the run, the task and the proposed action), recalled items are in the run record's `inputsRead` and in a prompt block marked advisory, and people review and forget them on the console's Memory page. Items written before under the old keys are no longer recalled and expire within 90 days.

**Note (2026-11-18, plan repo-per-agent phase 3 step 16, owner decisions 2026-11-18):** a conversation is still one
workflow (one workflow id), but no longer always one Temporal run. Past Temporal's history threshold it continues as a
new run of the same workflow id instead of ending: the library carries its turns, first start, idle clock, limits,
spend and unread messages, and stack-author's own state (`ChatCarry`: the model's short-term memory whole, the page
transcript's tail with a line saying how many earlier messages it no longer shows, the diff on the table, the pull
requests and the plans being watched). No limit or budget resets; the daily budget is checked again when the new run
starts, and a spent one ends the conversation with a message. It still writes one run record, keyed by its first run
id and counting its runs. Its text now also crosses runs in the carried state, under the same retention.
07 has the details.

#### Related

- **Amended by:** [0029](#adr-0029): the agent is in `shadow` and can be routed to; a person still starts every conversation.
- **Relates to:** [0007](#adr-0007), [0012](#adr-0012), [0013](#adr-0013), homelab-gitops ADR 0076. Fills in the store for 21 with a file store for this agent only.

## ADR-0027: The CI/CD triage agent investigates a failed run in any pipeline stage, with code deciding and the model explaining
{: #adr-0027 }

<span class="adr-status adr-status-proposed">Proposed</span> <span class="adr-meta text-muted">2026-11-05 · `platform-wardens`</span>

#### Context

Phase 2 names a CI/CD Failure Investigator, and a draft plan names a CI/CD Failure Agent. A 30-day sweep of 13 repositories (1,333 runs, 315 failed) changed the design those documents assume:

- 39% of failures aren't IaC. In a sample of those, 53% were security gates and 14% a policy gate. The draft plan's eight categories have no entry for a gate.
- 12% of a random sample had no failed job to read, so a job-level trigger misses them.
- 55% of failed runs share a commit with another failed run, so one message per run would be noise.
- The Evidence Investigator and the GitHub MCP server that the documents depend on don't exist.
- No Maven, Gradle or active .NET pipeline exists in the org, so those can't be evaluated from real failures.

#### Decision

**It's one agent with one capability.** `agents/devops/cicd-triage`, capability `cicd.failure.explain`. It investigates and proposes; the action catalog separates what's granted ([0028](#adr-0028)).

**Trigger on `workflow_run`.** The agent's own GitHub App sends the event to the existing webhook path (homelab-gitops ADR 0082), and the agent re-reads the run from GitHub. Payload values never reach a prompt. A daily sweep covers lost deliveries.

**Code decides; the model explains and drafts.**

- Code finds the failed step, category, rerun safety, owner and attribution. The model can't change them.
- The model has no tools. A model failure gives a templated finding.
- The rerun line comes from a table. A job with side effects is always `unknown`.
- The `explain` stage stays only if an eval with and without it shows it clearly helps ([0009](#adr-0009)'s order of preference).

**Stage and tool packs.** `config/packs/<tool>.yaml` holds how to recognise a tool, its signatures, its report parser and its fix options. Adding a tool means a data file and test logs, with no change to the workflow or the tool count. Stages: lint, Sonar, SAST, dependency and image scan, secret scan, IaC and policy scan, package build and test, Docker build, image push, sign, digest commit, deploy, release, workflow and runner, external.

**One voice per cause, without a store.** A fingerprint is computed per run, and the lowest run id for a fingerprint on a commit speaks. Processing order doesn't matter, so no coordination is needed. The worst case is a duplicate, not a lost finding.

**Standards come from a catalog, not a diff against a repository.** `reusable-workflows/standards/catalog.yaml` holds rules with named check functions and accepted references. The agent checks only the workflow that failed. Fleet-wide scoring stays with the later Standards Agent, which reuses the catalog.

**A failure lab.** A private repository, `cicd-triage-lab`, with seeded faults gives real logs for tools the org doesn't use, and a safe first target for pull requests. Lab cases don't count toward the 30 real cases that promotion needs.

**Chat-based pipeline authoring is a separate, later agent.** It has a different trigger, identity and evaluation, and keeping the agent that reads untrusted logs apart from the one that writes pipelines limits what a poisoned log can reach. Stack-author and terraform-drift already split this way.

#### Considered options

- **A two-mode agent covering failures and standards:** rejected in the review of the plans. Different triggers, permissions and evaluation.
- **Trigger on `workflow_job`, as drift does:** rejected. No event for a run with no jobs, and it arrives while other jobs still run.
- **A signature library in PostgreSQL:** rejected. Every new store is new memory to secure and back up (review finding X2). Signatures live in git, and history comes from the Actions API.
- **A diff against `reusable-workflows`:** rejected. Only 2 of its 135 third-party actions are pinned to a SHA, and comparing with it would flag `build-image.yaml` callers, whose pipeline is stronger.
- **Depending on the Evidence Investigator and the GitHub MCP server:** rejected for now. Neither exists. Local read tools work, as terraform-drift and stack-author show.

#### Consequences

- `finding.schema.json` gains an optional `classification` object, which re-triggers every agent's evals.
- `wardens.runtime.github_webhook` is generalised beyond drift, and drift's behaviour must not change.
- A failure in Argo CD after the digest commit isn't a workflow run, so this agent can't see it. It belongs to `incident-triage`.
- Release strategy has no standard yet: nothing in the org defines canary, blue-green or rollback. Until it does, the agent can only recognise a failed release step and refuse to call a rerun safe.
- `docs/devops/agent-use-cases.md` and phase 2 are corrected in the same change.

#### Related

- **Relates to:** [0007](#adr-0007), [0009](#adr-0009), [0013](#adr-0013), [0028](#adr-0028), homelab-gitops ADR 0082 and ADR 0083. Plan: cicd-triage-implementation-plan.md.

## ADR-0028: A fix pull request's level depends on what opening it can reach; a person always merges
{: #adr-0028 }

<span class="adr-status adr-status-proposed">Proposed</span> <span class="adr-meta text-muted">2026-11-05 · `platform-wardens`</span>

#### Context

Decision 0013 counts a draft pull request as L1 because opening it changes nothing, and says that where a pull request has effects on open it needs L2. For terraform-drift, which edits only `resources.yaml`, opening changes nothing.

`cicd-triage` proposes code and workflow changes, written by a model that has just read logs anyone with push access can influence. A pull request from a branch in the same repository runs that branch's code and workflows as soon as it opens, with the repository's secrets, draft or not. So whether opening changes anything depends on the repository:

| Repository | Repo secrets | Pull request jobs | Reach on open |
| --- | --- | --- | --- |
| `job-hunter-agent`, `shorts-studio` | 0 | GitHub-hosted; the image job is skipped | Low |
| `self-service-portal` | 0 | Some self-hosted | The homelab network |
| `platform-as-code` | 2 | Plans with cloud credentials | High |
| `infra-local`, `infra-github`, `infra-azure` | 2, 6, 8 | Real plans | High |

GitHub can't close this gap. Its org policy limits `uses:`, not steps or jobs, and required reviewers and environment secrets aren't available on private repositories on the Free plan.

#### Decision

**A person always clicks Merge in the GitHub portal.** The agent has no merge or approve path, at any level.

**The level follows the reach.**

| Change | Level | Before the pull request opens | |
| --- | --- | --- | --- |
| Patch as text in a comment | L1 | Nothing | Nothing runs until a person commits it |
| Any fix in a **low-reach** repository | L1 | Reach check, code checks, LLM reviewer | 0013's reasoning holds |
| Any fix elsewhere, recipes included | L2 | Approval of the exact diff | Opening runs code that can reach secrets |
| Workflow files, in consumers and in `reusable-workflows` | L2, its own grant | Approval | Adds `workflows: write` |
| `platform-as-code/.github`, `template/terragrunt-cicd.yaml` | L2, its own grant | Approval | Plans run with cloud credentials |

**The low-reach check runs on every run, in code.** If any part fails, the fix goes to approval, or stays as text until L2 is available.

- **Reach:** no repo secrets by API, and every job that runs on a pull request, including called workflows, uses GitHub-hosted runners without `id-token: write`.
- **Files:** no central repository, no `infra-*`, no `.github/**`, and no dependency or lock file changes unless a recipe names the version.
- **Checks:** `prepare` passes and the reviewer doesn't flag it.

A repository that gains a secret or a self-hosted job drops off the path on its next run.

**Extension of 0013, for this agent only.** On the low-reach path, a level 1 pull request may change files that 0013 would not allow, within `fixScope`. All of 0013's other conditions stay: draft, a new branch of the agent's own, no merge or approve permission, and the homelab amendment's refusal in code of any other write. The CI check that rejects a level 1 act tool with wider scope learns this one case.

**One approval covers the fix loop. This is a written exception to [0007](#adr-0007),** which binds an L2 approval to exact parameters. The owner chose it on 2026-11-05: the loop must be able to iterate without a person at each step.

- The limit is `iterationLimit: 3` in config, and code refuses more than 5. It stops early on the same failure twice, a returning failure, a total diff above 5 files or 80 lines, a push by anyone else, or a closed pull request.
- `prepare` and the reviewer run on every commit, against the new patch and the whole branch diff. Each commit's diff is posted to the pull request and to Slack.
- This covers every file, including those that publish, sign or apply.

**Code checks every patch before anything moves.** Exact edits only; allowed paths; size limits; no gate weakening (ignore files, `# nosec`, skipped tests, `continue-on-error`, lowered thresholds); no new secret-shaped strings, fetches or package sources; static validation without executing anything.

**The LLM reviewer can only block.** A different model sees only the diff and no logs, so a poisoned log can't reach it. A flag sends the fix to approval, or to text if it's mid-loop. A pass skips nothing.

**Where a fix goes for IaC pipelines.** Shared workflows live in `platform-as-code/.github`. An `infra-*` workflow change gets the same change in `template/terragrunt-cicd.yaml` and in the failing repository's rendered `.github/workflows/terragrunt-cicd.yaml`, under one approval. Once that pull request is verified, the same change goes to the other `infra-*` repositories, covered by the first approval because the repositories and hunks are known. There's no loop on those, and a copy that has fallen behind is skipped and reported. `cloud/`, `providers/` and `src/` get a recommendation, never a pull request.

**Central changes must stay compatible.** No removed input, output or secret; no new required input without a default; no type change. A breaking change is written up as text, with the callers listed.

#### Considered options

- **Approval on every commit:** the safest, and consistent with 0007. Rejected by the owner: it defeats a loop that's meant to iterate.
- **Approval on every commit for files that publish, sign or apply only:** rejected by the owner. A branch can't reach OpenBao's role `main`, so these commits can't publish or apply; the remaining risk is at merge.
- **Approval before every pull request, everywhere:** the owner's first choice, then narrowed: where opening reaches nothing sensitive, a person's merge is check enough, and an approval adds work and no control. That is 0013's argument.
- **L3 for the low-reach path:** rejected. L3 executes an action. This one only recommends, and a person merges.
- **An LLM review as the gate instead of approval:** rejected. It's probabilistic, and LLM output is advisory in this framework.
- **Restricting steps or jobs in GitHub:** not available. Tightening `uses:` and requiring SHA pinning at org level is worth doing separately, but doesn't limit a `run:` line or a malicious test.

#### Consequences

- **Accepted risk, low-reach path:** a malicious test could read that repository's private source and its read-only `GITHUB_TOKEN`, and send them out.
- **Accepted risk, the loop:** a later commit runs in CI before anyone has read it, including in repositories with secrets, and its patch comes from logs of the agent's own last run. `prepare` and the reviewer block known patterns, not all possible ones. An approver approves the first diff, not the later ones.
- **Accepted risk, GitHub Free:** review and merge order can't be enforced. It rests on the App having no merge path, plus an alert on a `cicd-fix/` merge by another account.
- `FRAMEWORK_MAX_LEVEL` goes to 2 before any L2 action ships, with per-action grants still limiting. This is the framework's first L2 action, and low-reach pull requests ship before it.
- `model_fix_pr` and the other model actions rate `consequence: irreversible` once they run in CI. Low-reach fixes rate `reversible` on both tests.
- A pull request's green result doesn't always prove the fix. A step that runs only on `main` reports `green-not-exercised`, and the pull request stays a draft.
- Each action needs its own 30 real cases, per 0007.

#### Related

- **Relates to:** [0007](#adr-0007), [0011](#adr-0011), [0027](#adr-0027). **Extends** [0013](#adr-0013) for `cicd-triage` only.

## ADR-0029: Routing is rules first, then a classifier, then a person
{: #adr-0029 }

<span class="adr-status adr-status-proposed">Proposed</span> <span class="adr-meta text-muted">2026-11-05 · `platform-wardens`</span>

#### Context

Every task today names its capability in advance: a schedule, a GitHub webhook rule, or a person in the console. The router exists but nothing calls it, its threshold is a placeholder, and Alertmanager sends alerts only to Slack.

Two kinds of request are coming, and they differ:

- **Alerts are structured.** We write the alert rules, so their labels are known in advance. Their annotations can carry log lines or other text an attacker can influence.
- **Chat requests are free text.** No rule can match them, and the person asking is present to correct a wrong guess.

A capability's name also isn't enough to start work: each one has an input schema (`terraform.drift.explain` requires `repository` and `trigger`). A local model's turn can outlast any request timeout, so a model call can't sit inside a webhook or console request.

#### Decision

**The order is rules, then the classifier, then a person.** The router still selects a capability, never an agent name.

```mermaid
flowchart TB
    A[Alert] --> RU{Rule matches its labels?}
    RU -->|yes, agent routable| RUN[Start the agent]
    RU -->|yes, agent not routable| P[Person]
    RU -->|no| C{Classifier}
    CH[Chat in Auto] --> C
    C -->|alert: above threshold, inputs valid| RUN
    C -->|alert: anything else| P
    C -->|chat: its choice, shown to the person| S[Person presses Send]
    PIN[Chat with an agent selected] --> S
    S --> RUN
```

**Rules live in `config/routing.yaml`** and match allowlisted alert labels. The first match wins, and a bad file stops the receiver at startup, as `webhooks.yaml` does. A rule whose agent can't take work escalates and never falls through to the model: a rule states what we meant, and the closest other agent isn't that.

**Alerts arrive at `wardens.runtime.alert_webhook`.**

- Alertmanager keeps Slack (`continue: true`), so people see every alert whatever happens here.
- Escalating an unmatched alert means a log line and a metric, not a second message.
- Only allowlisted labels are read, never annotations, so no alert text reaches a prompt.
- Alertmanager has no request signing, so the receiver checks a bearer token.
- Only firing groups start work. The workflow id derives from the group key and the group's earliest `startsAt`, so a repeat notification starts nothing and a new firing episode does.

**The classifier runs in its own workflow, `wardens.route`,** on a small router worker. Rules run in the receiver itself, so rule-based routing works when LiteLLM is down. The same worker runs the incident workflow for routed alerts, which then doesn't depend on one agent's worker.

**The classifier proposes a capability and its inputs.** Code checks both: the capability must be among the routable candidates, and the inputs must pass its input schema. It has no tools. It gets the request as quoted data, and it's still a single model call rather than an agent.

**Alerts and chat fail differently.**

| | Alert | Chat |
|---|---|---|
| Unsure, invalid inputs, or model down | Escalates; Slack already has it | The page lists the agents as buttons |
| Threshold not measured | Classifier stays off; every unmatched alert escalates | Works: the threshold only decides whether one choice is preselected |
| Who starts the run | Code, above the threshold | The person, always, by pressing Send |

**The threshold comes from `evals/routing/`**, as category 02 requires, including "no capability" cases and overlapping requests. It stays a placeholder until those have run against the real model.

**The chat has one box and a selector.** `Auto` asks the classifier about the first message. Choosing an agent skips the classifier; the guardrails still apply. The selector is built from manifests: a capability with a `chat` block is a conversation. A new chat agent therefore needs a manifest and eval cases, with no console change.

**A conversation stays with one agent.** The router reads the first message only, because each conversation is one Temporal workflow with its own state ([0026](#adr-0026)). If the topic changes, the agent suggests a new conversation.

**Amends [0026](#adr-0026).** `stack-author` moves to `shadow` and can be routed to. A person still starts every conversation with a button, and its `console-chat` channel is unchanged.

**A minimal `incident-triage` proves the path.** `agents/sre/incident-triage` is L0 and has no model and no tools beyond reading its input: it records the alert it received as a finding and sends a notification. Its diagnosis (Phase 6 steps 2 to 4) is separate work. One rule routes a named test alert to it, so a real alert can be followed end to end without acting on production alerts.

### For the CI/CD author

A later chat agent will author pipelines ([0027](#adr-0027) already keeps that apart from the triage agent). It joins through the selector like any other chat agent.

**It may generate only from approved reusable workflows.** Its output calls a workflow from an allowlist at a pinned reference, with validated inputs. It writes no `run:` steps and no other `uses:`, and code rejects anything else before a pull request opens. This is a required check for that agent, because a pull request from a branch in the same repository runs that branch's workflows as soon as it opens, with the repository's secrets, draft or not ([0028](#adr-0028)). A draft pull request alone doesn't make such a change a safe L1 recommendation under [0013](#adr-0013).

#### Considered options

- **Classifier for everything, as category 16 first read:** rejected. Alerts need no judgment to route. It would put untrusted text in front of a model, cost a call per alert during a storm, and depend on LiteLLM during the incidents where it may be down.
- **Rules only:** rejected. Free text has nothing to match.
- **Chat selector only:** rejected. People must then know the agents, and that gets harder as agents are added.
- **Router only, no selector:** rejected. Some requests fit two agents ("a pipeline that deploys this stack"), and the person needs a way to say which.
- **Route on every chat turn:** rejected. A conversation's state belongs to one workflow, so switching mid-way loses it, and each turn would cost a model call.
- **Start chat runs automatically above the threshold:** rejected by the owner. It follows 0026: the model proposes, code checks, the person decides.
- **Run the classifier in the console process:** rejected. A local model's turn outlasts the request.
- **Merge `webhooks.yaml` into these rules:** left for later. It's already rule-based and matches GitHub payloads rather than labels; 0027 is generalising that receiver separately.

#### Consequences

- Classifier mistakes on alerts cost at most one run of an L0 or L1 agent, with constraints capped at the target's own grants. A mistake in chat costs a click.
- The router worker is one more deployment with a LiteLLM key, and needs its own run records and cost limit even though it isn't an agent.
- Label values are still input from outside, so they're length-capped, and a rule's inputs still pass the capability's schema.
- `stack-author` enters `shadow` with people checking its runs, which they do already because every change is a draft pull request.
- Until `evals/routing/` has run against the real model, an unmatched alert never reaches an agent.
- The manifest schema gains an optional `chat` block on a capability. The change re-triggers every agent's evals.

#### Related

- **Resolves open decision:** "Router implementation" in 02
- **Relates to:** [0002](#adr-0002), [0013](#adr-0013), [0015](#adr-0015), [0026](#adr-0026) (amended here), [0027](#adr-0027), [0028](#adr-0028), homelab-gitops ADR 0084.

## ADR-0030: Event Hubs at the ingress edge, Temporal as the work queue
{: #adr-0030 }

<span class="adr-status adr-status-proposed">Proposed</span> <span class="adr-meta text-muted">2026-11-06 · `platform-wardens`</span>

#### Context

Decision 0015 put Azure Service Bus at both edges. Its diagram had alerts publishing to the ingress topic, and that is the part that doesn't hold:

- **Azure Monitor action groups can't send to Service Bus.** Their action types are Automation runbook, Event Hubs, Functions, ITSM, Logic Apps, Webhook and Secure webhook. Event Hubs is the only broker, with managed identity and Private Link ([Microsoft Learn, action groups](https://learn.microsoft.com/azure/azure-monitor/alerts/action-groups), checked 2026-11-05).
- **Grafana and Alertmanager can't send to Service Bus either.** Grafana's contact points include Kafka REST Proxy, MQTT and Webhook, but neither Service Bus nor Event Hubs. A webhook with a SAS key in a header would work, but 0015 disables SAS.
- **GitHub only sends webhooks, and never retries a failed delivery.** A delivery that times out (10 seconds) or gets a 5xx stays failed unless someone redelivers it.

Today the two entry points (`wardens.runtime.alert_webhook`, `wardens.runtime.github_webhook`) route, build the task and start the Temporal workflow **inside the HTTP request**. They run on an unbounded `ThreadingHTTPServer`. A burst (an alert storm, or a busy CI day: the drift App receives about three `workflow_job` events per job in every installed repository) holds one thread per request while each waits on Temporal. A slow or restarting Temporal turns into lost GitHub deliveries.

Most of what 0015 wanted from Service Bus is already done by Temporal in this design:

| Service Bus feature | Already covered by |
|---|---|
| Duplicate detection | The workflow id derived from the event; Temporal refuses a second start |
| Per-message lock and redelivery | The consumer saves its checkpoint only after Temporal accepts the start |
| Work queue and buffer for the work itself | Temporal task queues |

What is missing is a place for **arrivals** to land quickly, so the HTTP edge can answer at once and the routing work happens at its own pace.

#### Decision

**Event Hubs is the only bus, at the ingress edge only. Temporal stays the work queue.**

```mermaid
flowchart LR
    AM[Alertmanager] -->|bearer token| R[wardens relay: check, filter, publish, 202]
    GH[GitHub App] -->|HMAC signature| R
    R --> H[(Event Hubs: wardens-ingress)]
    H --> C[wardens ingress consumer: rules, task, start workflow, checkpoint]
    C -->|after N failures| D[(wardens-ingress-dlq)]
    C --> T[Temporal task queues]
    T --> W[wardens workers and agents]
```

| Concern | Rule |
| --- | --- |
| Who uses the hub | Only framework components: the relay publishes, the ingress consumer reads. **Agents never publish or subscribe** (0009). |
| Relay | `wardens-alerts` and `wardens-hooks` keep their URLs and their checks (bearer token; HMAC before the body is parsed). They drop what no rule can use (a GitHub event other than a completed job on the allowlist; a resolved alert group), publish the rest and answer **202**. Concurrency is capped. |
| Hub unreachable | The relay answers **503** and does nothing else. Alertmanager retries. GitHub doesn't, so a redelivery job run as the App redelivers failed deliveries every hour. There is no direct-start fallback. |
| Envelope | CloudEvents 1.0, structured JSON. `id` is the source's id (`X-GitHub-Delivery`; Alertmanager's group key and start time). `traceparent` starts at the relay. Only the fields the rules read go in `data`; the payload stays untrusted data (18). |
| Partitioning | Partition key = alert group key, or repository. Order holds per key; different keys scale out. |
| Consumer | One consumer group, `wardens-router`. For each event: the existing rules (`wardens.routing.rules`), `Console.build`, the Temporal start with the existing workflow id, **then** the checkpoint. If Temporal is down, nothing is checkpointed and the consumer waits: backpressure, not loss. |
| Poison events | After 5 failed attempts, the event goes to `wardens-ingress-dlq` with the error, an alert fires, and the consumer moves on. Redrive is a runbook step, and it is audited. |
| Results | **No egress hub.** People get results through `wardens.notify`. A results hub is added when the first *system* consumer exists. |
| Telemetry | The consumer emits a `wardens.ingress` span from the relay's receive time to the workflow start, the root of the incident's trace (traces are keyed by correlation id, which exists only once the task is built, so the CloudEvent's `traceparent` is carried, not used to join). Metrics: received, published, rejected (relay); consumed by outcome, delay, dead-lettered, lag, resets (consumer). |

**Where the hub runs.**

| | Local (laptop) | Homelab (`wardens` cluster) | Azure (later) |
| --- | --- | --- | --- |
| Hub | Event Hubs emulator + Azurite (docker compose) | **Event Hubs emulator + Azurite in one pod** | Event Hubs namespace, Standard tier |
| Authentication | Emulator connection string | Emulator connection string from OpenBao; a NetworkPolicy lets only the relay and consumer reach it | Entra workload identity (already used by wardens pods); no keys |
| Checkpoints | Azurite | Azurite, in the same pod | Blob Storage |
| Unit tests | `MemoryBus` | — | — |

The adapter (`EventHubsSource` / `EventHubsSink`) is the same code everywhere; only the connection changes. Moving from the emulator to Azure is configuration plus IaC, and adds Azure Monitor action groups as a direct source.

#### Considered options

- **Keep Service Bus (0015):** no source in use can send to it without the same relay, and Azure Monitor can't send to it at all. Its lock, dead-letter queue and duplicate detection duplicate what Temporal and the workflow id already give.
- **Kafka (locally or in the homelab):** different semantics (offsets, no per-message settle, no dead-letter queue) would need a second adapter. Grafana's Kafka path needs a REST proxy that Azure Event Hubs doesn't offer. The volume (alerts, CI events) doesn't need it.
- **Azure Event Hubs for the homelab now:** chosen against by the owner for the homelab (2026-11-06). It stays the target for Azure deployments.
- **Fall back to a direct Temporal start when the hub is down:** rejected by the owner (2026-11-06) in favour of 503 plus GitHub redelivery, so there is one path to test.
- **Results egress hub:** deferred until a system consumer exists.

#### Consequences

- **The emulator isn't durable, and isn't supported for production.** Microsoft: "After a container restart, data and entities don't persist", and it has no metrics, no Entra authentication and no on-the-fly management. So:
  - Events accepted (202) but not yet read are lost if the emulator restarts. The consumer reads within seconds, so the window is short. Backstops: Alertmanager re-sends a firing group every `repeat_interval`, and the daily drift schedule re-checks drift. An emulator restart raises an alert.
  - Sequence numbers start again after a restart. Running the emulator and Azurite in one pod without persistence makes both reset together. The consumer also checks that a checkpoint isn't ahead of the partition's last sequence number; if it is, it reads from the start again, and it counts the reset.
  - The dashboard is built from wardens' own metrics, the emulator pod's health and its logs.
- **The HTTP edge stays thin.** A burst costs one publish per delivery, not one Temporal start; the noise filter drops most GitHub events before they reach the hub.
- **Behind the relay there is one path.** Rules, dedupe, task building and the classifier run in one consumer, whatever the source.
- **Contracts:** unchanged. The task fields 0015 added (`sourceEventId`, `causationId`, `traceparent`, `environment`, `replayOf`) are filled from the CloudEvent.
- **Replay:** possible from the hub within its retention, and from the dead-letter hub, keeping the original `sourceEventId` (07).
- **Kill switch:** never depends on the hub (23).
- **Threat model:** add a spoofed event on the hub (mitigated by the NetworkPolicy now, RBAC in Azure, and the source allow-list) and a poisoned event (dead-letter queue).

#### Related

- **Supersedes:** [0015](#adr-0015) (Azure Service Bus at the edges)
- **Relates to:** [0004](#adr-0004), [0009](#adr-0009), [0029](#adr-0029), 16, 19. Implementation plan: event-bus-ingress.

#### Note 2026-11-20: the webhook receiver runs two replicas and stops gracefully

Owner decision, after 307 failed GitHub deliveries in 72 hours (none of them lost an incident): some were the receiver's
single pod restarting during a rollout, with no drain.

- `wardens-hooks` runs **two replicas** with a PodDisruptionBudget of `minAvailable: 1` (homelab-gitops
  `apps/wardens-console`). Two replicas are safe: a delivery reaches one pod, the incident workflow id dedupes a
  redelivered one, and relay mode publishes to the same hub.
- **Graceful shutdown:** a 5-second preStop pause so Traefik stops sending to the pod first, then SIGTERM makes the
  receiver stop accepting, answer the requests in flight and close the hub producer
  (`wardens_services.webhooks.github.handler.drain_on_signal`, `serve_and_drain`).
- **Redelivery stays daily** (decision [0032](#adr-0032)), now over 70 hours, oldest
  first; hourly was considered and not taken.

## ADR-0031: MCP calls go through a gateway that checks the agent per tool; no server forwards the agent's token, and each shared MCP server reaches its backend with its own identity
{: #adr-0031 }

<span class="adr-status adr-status-proposed">Proposed</span> <span class="adr-meta text-muted">2026-11-06 · `platform-wardens`</span>

#### Context

[0019](#adr-0019) decided that an MCP gateway arrives with the first MCP server that more than one agent uses. The gateway authenticates the agent, allows only the servers and tool hashes in its manifest, and logs every call. It did not decide two things:
- which product;
- whose credential the MCP server uses to reach the backend.

That second question decides what the audit logs show.

**What the industry does (researched 2026-11-06, sources below):**

- **The MCP specification forbids token passthrough.** "MCP servers MUST NOT accept any tokens that were not explicitly issued for the MCP server." A server that needs a downstream API either holds its own credential or exchanges the caller's token for a new one (RFC 8693, or Entra on-behalf-of). Tokens are bound to one server (RFC 8707 `resource`, audience check).
- **Gateways are the usual control point.** Azure API Management (MCP support GA since November 2025), AWS AgentCore Gateway and agentgateway (Linux Foundation) all do the same job:
  - check the caller's token on the way in;
  - decide which servers, and sometimes which tools, the caller may use;
  - log every call;
  - attach a credential for the backend on the way out, from a vault (APIM credential manager, AgentCore Identity) or by token exchange.
- **Where the exchange happens is not settled.** AgentCore and agentgateway do it in the gateway. Traefik's guidance puts it in the MCP server and keeps the gateway for policy.
- **The same product often serves models and tools.** APIM's AI gateway does both. What the standards require is separate tokens and audiences, not separate products.
- **Other common practices:**
  - one short-lived identity per agent, never a shared key;
  - permissions per tool, denied by default;
  - tool definitions pinned by hash (OWASP MCP Top 10, MCP03);
  - every call logged with the agent, the person if there is one, the tool and a correlation id (CoSAI).

**What each log can show.** Four ways for an MCP server to reach an Azure backend:

| | How | Entra sign-in log | Azure Activity Log (writes only) | Gateway and MCP server logs |
| --- | --- | --- | --- | --- |
| A. Forward the agent's token | The agent's ARM token passes through gateway and server | Agent | Agent | Hold a token not issued to them, which they can't check |
| B. Shared server, its own identity | One server identity for every caller | Server | Server, for every agent | Agent and tool |
| C. Token exchange (on-behalf-of) | The server exchanges a person's token for one to the backend | Person | Person, with the server's app id in the claims | Agent, person and tool |
| D. Per-agent server | The server runs in the agent's namespace under the agent's service account and signs in as the agent (workload identity) | Agent | Agent | Agent and tool |

Two facts narrow the choice:

- **The Activity Log records only writes, deletes and actions.** A read-only tool leaves no Activity Log entry under any option. Its reads show up only in the Entra sign-in log (which identity got an ARM token) and in the gateway and server logs.
- **Entra on-behalf-of accepts only tokens that represent a user.** An unattended agent's app-only token can't be exchanged, so option C applies only when a person started the call.

**Today:** no MCP server is deployed. Every tool is `source: local`. The Change Correlator reads the Activity Log and Resource Graph with its own Entra identity through workload identity ([0016](#adr-0016), homelab ADR 0071).

#### Decision

**1. The agent calls the MCP gateway with a credential of its own, used only for MCP.** It is never the credential the agent uses for models ([0018](#adr-0018) point 5), and never a backend's.
- **Azure:** an Entra workload ID token whose audience is the MCP gateway's app registration. Each agent has an app role on that registration.
- **Homelab:** a LiteLLM virtual key for MCP only, separate from the agent's model key. It sits in the agent's OpenBao path next to the model key, as `litellm_mcp_api_key`, and is rotated on the same schedule. Each agent is its own LiteLLM team, so the team id names the agent. This is a long-lived secret, not a short-lived workload token. That is the same risk already accepted for model keys in 0018, and point 5 lists the way out.

**2. The gateway allows only what the manifest allows, per tool, and logs every call.**
- It denies by default.
- For each agent, the allow list holds the servers and tools of its `mcp:` entries, with their `definitionSha256`. It is generated from the manifest, not written by hand ([0022](#adr-0022)).
- Tools the agent may not call are also hidden from its `tools/list`.
- **Each call's log entry:**
  - the agent;
  - the person, when there is one;
  - the run id and trace id;
  - server, tool, redacted arguments, and the allow or deny decision.
- The check inside the stage ([0019](#adr-0019) point 2) stays as the second layer, and as the only layer locally.

**3. No hop forwards a token it was given.** Every MCP server checks that a token was issued for it, and refuses one that wasn't. Each `mcp:` tool in the manifest declares `credential: server | agent | person`, and the registry refuses a tool without one.

**The default is `server`.** One MCP server per backend serves every agent and reaches the backend with its own identity (option B). This follows the rule in 14: one MCP server per backend system, not one per agent.

| Mode | Use it for | How |
| --- | --- | --- |
| `server` (option B), **default** | Every tool, read or act, unless one of the exceptions below applies | The server has its own workload identity. It runs in its own namespace, signs in to the backend as itself, and serves every agent the gateway lets through |
| `agent` (option D), exception | A permission that only one agent may hold and that no other caller of the server should be able to use. A control that requires the backend's own audit to name the agent | The server runs in the agent's namespace under the agent's service account, and signs in to the backend as the agent. It accepts calls only from the gateway and serves only that agent |
| `person` (option C), exception | A tool called because a person asked, from the operator console or a chat follow-up, where the backend must name the person | The server exchanges the person's token through Entra on-behalf-of (Keycloak token exchange on the homelab). The person's token is never forwarded |

**Rules for a `server`-mode server**, because its identity is shared:

- **It knows which agent is calling.** The gateway calls the server with a token issued for the server, never with the agent's token:
  - **Homelab:** LiteLLM's `mcp_jwt_signer` guardrail (`pre_mcp_call`) signs every tool call with a short-lived RS256 JWT, issued for the server. The server checks the signature against LiteLLM's JWKS (`/.well-known/jwks.json`), so it doesn't have to trust a header. The token's claims (checked 2026-11-06, see Verification):
    - `act.sub` is the key's team, which is the agent;
    - `sub` is a hash of the virtual key;
    - `scope` names the tool being called (`mcp:tools/<tool>:call`).

    The run id and trace id can't be signed claims: claims come only from the caller's LiteLLM account and fixed values. They travel as plain headers instead (`X-Wardens-Run`, `traceparent`), listed in each server's `extra_headers`. Unsigned is acceptable because they only join logs and never decide access.
  - **Azure:** APIM calls the server with its managed identity, and sets `X-Wardens-Agent` and `X-Wardens-Run` from the claims of the agent token it validated.

  The server trusts those headers only on a request authenticated as the gateway. It refuses a call without them.
- **It checks each agent itself.** It keeps its own allow list of agents and tools, generated from the manifests like the gateway's, and checks every call against it (14: "the server enforces it with its own authorisation against the calling agent's identity"). The gateway is not the only check.
- **Reads and changes use separate identities.** A server with act tools runs two deployments, each with its own identity: one with read roles only for its read tools, and one with write roles for its act tools. Each identity's roles are limited to what its tools' declared `scope` covers across all agents, and are reviewed when a manifest widens a scope.
- **Act tools keep their other checks.** Act calls still come only from deterministic stages, after guardrails and approval (14, [0019](#adr-0019)).

For a backend without workload identity (a SaaS API key), the server keeps its credential in OpenBao (homelab) or Key Vault (Azure), never in the agent.

**4. One trace id joins the logs, and it is required.** In `server` mode the backend's audit names the server, so the trace id is the only link from a backend event to the agent. The run's trace id goes:

- into the gateway log, with the agent and the tool;
- into the server log, with the agent, the tool and the backend request id;
- into every backend call that accepts one (`x-ms-correlation-request-id` for Azure Resource Manager, which shows as the event's correlation id in the Activity Log);
- into the run record.

A server refuses a call that has no trace id. To answer "which agent made this Azure change", search the gateway log for the Activity Log event's correlation id. A control test proves this works ([0024](#adr-0024)).

**5. Products.**
- **Azure:** API Management. MCP is a separate API and product from the model API, with its own token audience. It may run on the same instance as the AI gateway: separate audiences meet point 5 of 0018. A shared outage is accepted, because a tool failure already falls back to the deterministic stage and the finding becomes "unknown".
  - APIM applies policies to every tool of an MCP server, not to each tool. So the per-tool allow list is enforced by one APIM MCP server per tool set, or by the stage check alone, until APIM supports per-tool policies.
- **Homelab:** the existing LiteLLM in the `ai` cluster, the same instance that serves models. This matches the Azure choice of one APIM instance.
  - **What it does:** per-key and per-team allow lists of MCP servers and tools, generated from the manifests; `mcp_jwt_signer` toward the servers (point 3); a log entry for every call.
  - **Separation from models:** separate virtual keys (point 1), and a signing key for `mcp_jwt_signer` in its own OpenBao path, rotated without touching the model keys.
  - **The signing key must be set.** It is loaded into `MCP_JWT_SIGNING_KEY` (a PEM, or a `file://` path). Without it, LiteLLM makes a key in memory that changes on every restart, which breaks tokens in flight and any second replica.
  - **Known gap: one audience for every server.** `audience` is a single setting for the whole guardrail, so a token signed for one MCP server is also accepted by another during its lifetime. The Verification test showed this. Mitigations:
    - `ttl_seconds: 60`;
    - tool names unique across servers;
    - each server refuses a token whose `scope` doesn't name one of its own tools.

    If a server needs a token bound to it alone, that is a trigger for the agentgateway fallback, which issues one per server.
  - **Who controls it:** the LiteLLM master key and admin UI stay with the platform owner. Anyone holding them could make a tool call look like any agent's, just as they can already spend any agent's model budget.
  - **Fallback: agentgateway** in the `wardens` cluster, if tool calls should later be isolated from the shared platform service, if a server needs a token bound to it alone (see the known gap above), or if a LiteLLM upgrade removes or licenses `mcp_jwt_signer`. It accepts the agents' projected service-account tokens (issuer `https://oidc.cloudutsuk.com/wardens`) instead of virtual keys, and exchanges them with the agent in the `act` claim. MCP servers only change the JWKS URL they trust.
- **Outside the clusters (the Spark or the homelab PC, with `uv run`):** no gateway. Servers run over stdio with your own credentials, and the stage check logs every call.

**6. When it starts.** The trigger of [0019](#adr-0019) is unchanged: the gateway is deployed with the first MCP server shared by more than one agent. With `server` as the default, that is the first MCP server built. A per-agent server (`credential: agent`) may come before the gateway. Until the gateway exists, the stage check is the logged path for it.

#### Considered options

- **Forward the agent's token (option A):** rejected. The MCP specification forbids it, and the gateway and server could not check a token that wasn't issued to them.
- **A per-agent server for every tool (option D as the default):** rejected as the default. Every Azure log would name the agent directly, but it needs one server deployment per agent per backend, which breaks "one MCP server per backend system" in 14. Kept as the `agent` exception.
- **Accepted cost of `server` as the default:**
  - **Who appears in Azure:** the Activity Log and the Entra sign-in log name the server, not the agent. Finding the agent takes a join on the trace id (point 4), so a lost trace id loses the attribution.
  - **Wider permissions:** the server's identity holds the combined permissions of all its callers' tools. That is mitigated by checking each agent in the server, by separate read and act identities, and by limiting roles to the declared scopes (point 3).
- **The gateway holds every backend credential (APIM credential manager, AgentCore Identity):** rejected. The gateway would hold write credentials for every backend, outside the server that understands them. Each server keeps its own.
- **A second LiteLLM instance in `wardens`, for MCP only:** not required. It would separate outages and admin rights from the shared platform service, but separate keys already keep model and tool credentials apart. The single APIM instance in Azure accepts the same shared outage. Moving to agentgateway is the step if isolation is wanted later.
- **agentgateway from the start:** kept as the fallback. Its advantage is short-lived workload tokens instead of virtual keys. Its cost is one more gateway to run, next to a LiteLLM that already has the agents' keys, teams and logs.
- **A separate APIM instance for MCP:** not required. Separate audiences and products give the separation that 0018 asks for, at a lower cost. It can be revisited if APIM outages become a problem.

#### Consequences

- **Manifest schema:** `mcp:` tools gain `credential: server | agent | person`, with `server` as the template's default. An `agent` or `person` tool states which exception applies.
- **`wardens.runtime`:** gets a token for the MCP gateway's audience. It sends the trace id on every MCP call and records the gateway's decision in the run record.
- **MCP server template (`templates/mcp-server/`):**
  - accepts calls only with a token issued for it, from the gateway;
  - reads the agent and run from the gateway, and refuses a call without them;
  - checks each agent against its own allow list;
  - sends the trace id to the backend;
  - can run as two deployments, read and act.
- **infra-azure:**
  - the MCP gateway app registration, and an app role for each agent;
  - an APIM API and product for MCP, with the policy that sets `X-Wardens-Agent` and `X-Wardens-Run`;
  - a workload identity per MCP server (read and act), with roles limited to its tools' scopes;
  - the gateway's own managed identity has no role on any backend, only on calling the servers.
- **homelab-gitops:**
  - LiteLLM in the `ai` cluster:
    - one team per agent, and an MCP-only virtual key for each agent, created from the manifest with its allowed servers and tools;
    - `mcp_jwt_signer` (`ttl_seconds: 60`, `audience: mcp`), with `MCP_JWT_SIGNING_KEY` from its own OpenBao path;
    - for each MCP server, `extra_headers: [x-wardens-run, traceparent]`;
    - a NetworkPolicy that lets the `ai` cluster reach the MCP servers in `wardens`;
  - each shared MCP server in its own namespace, with its own service account and Entra app (homelab ADR 0071).
- **Change Correlator:** no change for now. Its Azure tools stay its own. When a second agent needs raw Activity Log or Resource Graph reads, they move into a shared Azure MCP server in `server` mode, with Reader only.
- **Control tests ([0024](#adr-0024)):**
  - a call allowed next to one denied for a tool the manifest doesn't list, at the gateway and at the server;
  - a server refusing a token that wasn't issued for it, and a call without an agent or trace id;
  - an act tool's Activity Log entry whose correlation id finds the calling agent in the gateway log.
- **Category 14:** its "MCP gateway product" open item is resolved by this decision.

#### Related

- **Resolves open decision:** "MCP gateway product, or `wardens` middleware only" in 14, which [0019](#adr-0019) left to "a future decision record".
- **Refines:** [0018](#adr-0018) point 5 (inference and tools are separate trust boundaries) and the identity part of [0016](#adr-0016) §5.

#### Verification (2026-11-06)

**Code inspection.** In the running LiteLLM (v1.103.1, `ai` cluster), the guardrail is at `litellm/proxy/guardrails/guardrail_hooks/mcp_jwt_signer/`, and the proxy serves `/.well-known/jwks.json`. Its setup code has no licence check. Signing agents in with a JWT instead of a virtual key stays enterprise-only, so point 1 keeps virtual keys.

**Run test.** LiteLLM v1.103.1 from PyPI with Postgres, on the Spark outside the clusters, not the live instance. Setup:
- `mcp_jwt_signer` with a key from `MCP_JWT_SIGNING_KEY`;
- two FastMCP servers that check the JWKS (`azure_reader`, `other_server`);
- team `change-correlator`, and an MCP-only key granted `azure_reader` only.

| Check | Result |
| --- | --- |
| Agent key → LiteLLM → `azure_reader` | Allowed. The server verified the token: `act.sub: change-correlator`, `sub: apikey:<hash>`, `scope: mcp:tools/call mcp:tools/whoami:call`, `exp` 60 s after `iat`. `x-wardens-run` arrived through `extra_headers` |
| Agent key → LiteLLM → `other_server` (not granted) | Denied by LiteLLM ("User not allowed to call this tool"). The tool was not in the agent's tool list |
| Direct to the server, no token | Refused by the server |
| Direct to the server with the agent's virtual key as the bearer token | Refused by the server |
| Token signed for `azure_reader`, replayed directly to `other_server` | **Accepted.** Both servers trust `aud: mcp`. This is the known gap in point 5 |

The other LiteLLM methods ([MCP authentication](https://docs.litellm.ai/docs/mcp_authentication)) don't meet point 3:
- **Static auth** (`bearer_token`, `api_key`, `basic`, `static_headers`) sends one credential for every caller.
- **`extra_headers` / `x-mcp-*`** forward headers that nothing verifies.
- **Per-user credentials** are keyed by user, not by key or team.
- **On-behalf-of** (`oauth2_token_exchange`, with an `entra_obo` profile) needs a user token and has no fallback to client credentials. It is the candidate for `credential: person`.

#### Note (2026-11-18): `mcp-guard` logs through `wardens`

`mcp-guard`, the sidecar this decision puts in front of a third-party MCP server, was built without the framework: its
image installed neither `wardens` nor the contracts, and it set up its own logging (`logging.basicConfig`, one JSON
string per line). The owner decided on 2026-11-18 that it depends on `wardens` for its logs: `python -m mcp_guard`
calls `wardens.telemetry.configure("mcp-guard", <version>)`, so every line is a JSON line in the agents' format
(12: `timestamp`, `level`, `logger`, `message`, `service.name`, redacted),
with the guard's fields (`event`, `agent`, `sub`, `run`, `trace`, `method`, `tool`, `decision`, `reason`, `status`,
`ms`) at the top level instead of inside the message, and the node's collector parses it like any wardens line. Its
image builds `framework/` with it. Nothing else changes: it still checks the token, the agent and the tool itself, keeps
its own allow list and metrics, and is still not an agent (it has no manifest and stays in platform-wardens after the
split, decision [0040](#adr-0040)).

#### Sources

- [MCP specification: Security Best Practices (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices): token passthrough, confused deputy, scope minimisation.
- [Azure API Management: MCP server overview](https://learn.microsoft.com/en-us/azure/api-management/mcp-server-overview) and [Secure access to MCP servers](https://learn.microsoft.com/en-us/azure/api-management/secure-mcp-servers): tiers, policies apply per server, credential manager.
- [AWS AgentCore Gateway: outbound authorization](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-outbound-auth.html).
- [LiteLLM: MCP zero trust (`mcp_jwt_signer`)](https://docs.litellm.ai/docs/mcp_zero_trust) and [Gateway auth reference](https://docs.litellm.ai/docs/auth_overview): signed tool calls, JWKS, inbound JWT sign-in is enterprise-only. [MCP authentication](https://docs.litellm.ai/docs/mcp_authentication), [per-user credentials](https://docs.litellm.ai/docs/mcp_per_user_auth) and [OBO](https://docs.litellm.ai/docs/mcp_obo_auth): the alternatives in Verification.
- [agentgateway: token exchange, JWT assertion and Entra on-behalf-of](https://agentgateway.dev/blog/2026-07-12-agentgateway-token-exchange-jwt-assertion-entra-obo/).
- [Traefik: MCP Gateway best practices](https://doc.traefik.io/traefik-hub/mcp-gateway/guides/mcp-gateway-best-practices): exchange in the server, policy in the gateway.
- [CoSAI: A practical guide to MCP security](https://coalitionforsecureai.org/securing-the-ai-agent-revolution-a-practical-guide-to-mcp-security).
- [A gateway architecture for enterprise MCP authentication (arXiv)](https://arxiv.org/html/2608.10760v1): the `act` claim for agent-for-person calls.

## ADR-0032: The terraform-drift agent runs on drift events only, with no schedule
{: #adr-0032 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-09 · `platform-wardens`</span>

#### Context

Two things started the terraform-drift agent:

- **A Temporal schedule**, `daily-infra-azure` at 08:00 UTC. It analysed the newest completed drift scan of the last 7 days, whatever that scan found.
- **The GitHub webhook rule `drift-scan`**, which started the agent when the job `Drift Detection - Teams Notification` finished.

The Teams job runs when a scan found drift **or** a stack failed to plan. The analyze step also counts a plan error as drift (`drift_found`). So the agent ran on days with nothing to explain. For example, infra-azure run 42482427115 (2026-11-08) had 0 drifted stacks and 1 failed stack, and both triggers fired.

A run with no drift makes no model call, but it still:

- reads the run and downloads every plan artifact,
- clones the shared module,
- writes a run record,
- posts a "no drift" message every day.

The owner wants the agent to run only when drift is found, in any `infra-*` repository (2026-11-09).

#### Decision

1. **One trigger: a drift-only job in the pipeline.**
   - The shared module's analyze step has a new output, `resource_drift_found`. It is true only when a stack plans to add, change or destroy resources.
   - The template's new job `Drift Detection - Agent Trigger` runs only on that output. It has no permissions and does nothing; its job name is the contract.
   - The webhook rule `drift-scan` matches that job with conclusion `success`.
   - A scan where stacks only failed to plan starts nothing. The Teams card and JIRA ticket still report it.
2. **No schedule.** The agent's manifest has no `schedules`, and the Temporal schedule `terraform-drift-daily-infra-azure` is deleted.
3. **Every `infra-*` repository has the trigger job.** The webhook rule's `repositoryPattern` follows the agent's `config/scope.yaml`. A provider is added to both once the agent can read its plans and map its attributes, so a repository never starts a run that can only stop as "out of scope". How a provider is onboarded: [decision 0033](#adr-0033).
4. **A lost delivery is redelivered once a day.** GitHub never retries a webhook, and the schedule used to hide a lost delivery. `wardens.runtime.redeliver` runs as a Kubernetes CronJob every day. Signed in as the App, it lists the last 70 hours of deliveries (GitHub keeps 3 days) and sends again the newest attempt of every event that has no 2xx attempt, oldest event first, at most 100 per run. It gives up on an event after 3 failed redeliveries, or once its original delivery is older than the window, so a failure that repeats is not resent every day. This is phase 6 of the event-bus plan, run daily rather than hourly by the owner's choice. (Amended 2026-11-20: the job first looked back 26 hours and sent the newest events first, so events over the cap aged out of the next run's window and were lost, 64 on 2026-11-18; and it resent a deterministic failure every day until GitHub dropped it.)
5. **Each repository scans at its own time.** `drift_scan_cron` in its `config.yaml`; without it, the generator picks a fixed time per repository. Every repository used to queue at `0 6 * * *`, and GitHub started those runs about 6 hours late.
6. **One exception: the plans of the agent's own import PRs.** The webhook rule `own-pull-request-plan` starts the agent on a successful plan of a pull request on one of its own `drift/` branches. An object being imported that differs from the code (a tag set by hand) shows only in that plan, and the merge's apply would overwrite Azure's value; the agent comments on the PR and can add a codify to it. The owner considered removing the rule (only scans start the agent) and kept it (2026-11-10). A closed PR's plan stops the agent before any read.

#### Consequences

- **Fewer runs.** A day without drift costs nothing: no artifact download, no clone, no run record, no message.
- **Slower recovery from a lost delivery.** With a daily redelivery, a lost delivery's drift is explained up to a day late. Before, the next 08:00 schedule picked it up. The CronJob's failed Job and `wardens.github.redeliveries{result="failed"}` show when redelivery itself fails; `result="given_up"` counts events whose redeliveries kept failing.
- **The job name is an interface** between the shared module and platform-wardens. Renaming it in the template without changing `framework/config/webhooks.yaml` silently stops the agent. Tests on both sides pin the name.
- **Another agent can still have a schedule.** The framework keeps `wardens.durable.schedules`.
- **An operator can still start a run** from the console with a run id.

#### Related

- **Status note:** amended by the note of 2026-11-20 (a scan that found no drift leaves a small run)
- **Relates to:** [0016](#adr-0016), [0030](#adr-0030). Implementation plan: event-driven-drift-agent.

#### Note 2026-11-20: a scan that found no drift leaves a small run

Owner decision (team-chat C6, "A3a"). A team-chat ask reads the agent's latest completed run, and under this decision a
clean scan left none: on 2026-11-19 an ask described a drift incident from before the WAF rule's apply as the latest
state, though a newer scan (infra-cloudflare run 44634649995) had planned no changes. Point 1's "a scan with no drift
starts nothing" changes to "starts one small run that records it"; point 2 (no schedule) and the rest stand.

- **The signal is the analyze job, not a skipped Agent Trigger.** The webhook rule `scan-completed` matches "Drift
  Detection - Analyze Plans" with conclusion `success`. That job runs only on a drift scan (a schedule, or a dispatch
  with `drift_scan=true`). GitHub does send the Agent Trigger's `skipped` event (43 in the week to 2026-11-20 in the
  hooks' logs), but the same event comes from every ordinary plan and apply run, which the payload can't tell apart, and
  the receiver has no GitHub credential to ask. Matched on it, every push to `main` would start a run that, completed,
  becomes the agent's "latest" for the ask. The analyze job filters at no cost, and the agent still confirms what the
  run did.
- **No incident, a task alone.** The rule's `start: task` starts `terraform-drift.task` on the agent's queue, workflow
  id `<correlationId>-<taskId>` (the shape the ask reads runs by), with both ids derived from the rule, repository and
  run, so a redelivery starts nothing new (the drift path's dedupe per repository and run). The incident workflow
  always opens a chat thread and hands off; a clean scan needs neither, so it doesn't go through it rather than having
  its posts suppressed. `repositoryPattern` and `branchPattern` stay in step with `drift-scan`.
- **What the agent does (trigger `scan-completed`):** the kill switch, then the run by id (accepted only as a completed
  drift scan, as before), then one read of the run's jobs. When the Agent Trigger job ran, it records that the scan found
  resource drift and the drift-scan incident explains it. Otherwise it records "no drift in N stacks" and names each
  stack whose plan failed: those weren't checked, so they never count as clean. No plan artifact download, no clone, no
  model call, no handoff, no message (its notification is none; a failed run still goes to the escalation channel).
- **Cost:** two or three GitHub API reads and a run record per scan. The Consequences' "a day without drift costs
  nothing: no run record" no longer holds for the record.

## ADR-0033: Onboarding a new cloud or provider to the terraform-drift agent
{: #adr-0033 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-10 · `platform-wardens`</span>

#### Context

The agent started with Azure only. Step 8a made the parts that read plans and map attributes work for any
provider under the shared module's `cloud/` (the provider is the stack path's first segment,
`providers.py`). Steps 8b to 8f add infra-aws, infra-gcp, infra-cloudflare, infra-github and infra-local one
at a time. Decision 0032 says a repository joins the scope "once the agent can read its plans and map its
attributes", but not how to check that. The owner asked for the steps to be written down so that the next
cloud follows them too (2026-11-10).

#### Decision

A provider (a new cloud, or a new `infra-*` repository) is onboarded in **one pull request in
platform-wardens**, after the two prerequisites below, and only when every step of the checklist is done or
recorded as not applicable in that PR.

### Prerequisites (outside platform-wardens)

1. **The repository runs the shared module's pipeline** with the `Drift Detection - Agent Trigger` job and
   its own `drift_scan_cron` in `config.yaml` (decision 0032, points 1 and 5). Regenerate the workflow with
   the entrypoint; never edit it by hand.
2. **The GitHub App** `cloudutsuk-wardens-terraform-drift` is installed on the repository (it is installed on
   every org repository today). The scope check refuses a repository without it.

### Checklist (the onboarding PR)

1. **Coverage.** List the resource types the repository's `resources.yaml` files use, and check each against
   the attribute map built from the shared module's `main` (`build_map`). Write the result in the plan's
   Progress row as "mapped / used". A type the map can't read still gets findings; it only loses codify PRs.
   Extend the map or the YAML locator in the same PR when a used type has a unit pattern they don't parse
   yet. A pattern no repository uses waits.
2. **Provider-specific parts.** The Change Correlator ("who changed it") reads the providers in
   `providers.CORRELATED` (Azure; GitHub repositories since decision 0034, `CORRELATED_TYPES`). Import proposals and
   the `already_exists` check are Azure-only (`EXISTENCE_CHECKED`). For anything else they say "not checked". The webhook rule `own-pull-request-plan` (decision 0032, point 6) exists for import PRs, so it
   stays on Azure repositories too. Adding a provider to `CORRELATED` is its own decision: it needs a correlator source for that
   cloud's audit log first (decision 0016).
3. **Eval data.** Harvest a real scan with drift from the repository (`evals/harvest.py <repo> --run <id>`)
   and run the evals. If the repository has no drift, make a small, reversible change by hand (a tag on a
   test resource), with the owner's approval for that cloud, scan, harvest, then remove it. If neither is
   possible yet, the PR says so and the plan lists it under "What is left"; the scope is widened anyway,
   because findings work without it, but the step is not Done until the data is in.
4. **Scope.** Widen `config/scope.yaml`'s `repositoryPattern` and the webhook rule `drift-scan`'s
   `repositoryPattern` (`framework/config/webhooks.yaml`) together. A test checks that both accept the same
   repositories, so a repository can never start a run that stops as "out of scope".
5. **Stacks the scan can't see.** A stack whose plan runs somewhere that can't see its real objects (infra-local's
   Spark-only `network-gpu` and `gpu` stacks, planned on the homelab PC's runner) reports false drift. List it
   in the repository's opt-out file, `.github/drift-agent.yaml` (`skipStacks`), in a PR to that repository.
6. **Records.** The agent's `CHANGELOG.md`, the plan's Progress row, and the README's scope line.

### After the merge

7. **Deploy.** The image is built on `main` and its digest committed to homelab-gitops; Argo CD deploys both
   the console (the webhook rule) and the agent. Check the running digest.
8. **End-to-end check.** Dispatch a scan with `drift_scan=true` on the repository's `main`. With drift, the
   Agent Trigger job runs, the webhook starts `incident-drift-<repo>-<run>`, and the incident completes.
   Without drift, the trigger job is skipped and nothing starts. Record which one you saw in the plan.

#### Consequences

- Every provider goes through the same steps, and the plan shows what each one is missing (coverage, eval
  data) instead of a provider being "on" or "off".
- A provider can be in scope without eval data from its own repository. The plan keeps that visible until
  the data is harvested.
- The two `repositoryPattern`s stay in step through a test, not only a comment.
- Outside Azure the agent never says who changed something; that waits for a correlator source per cloud.

#### Related

- **Relates to:** [0032](#adr-0032) (point 3), [0016](#adr-0016). Implementation plan: event-driven-drift-agent, steps 8a to 8f.

## ADR-0034: Change evidence for GitHub on the Free plan: the events API, and a recorded webhook log
{: #adr-0034 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-10 · `platform-wardens`</span>

#### Context

The terraform-drift agent covers every `infra-*` repository since 2026-11-10, but "who changed it" works only
for Azure: the Change Correlator reads the Azure Activity Log and Resource Graph. The owner wants a source per
cloud, GitHub first (2026-11-10): infra-github has real drift today, and GitHub needs no new cloud account.

GitHub's organization audit log is the obvious source, but its REST API
(`GET /orgs/{org}/audit-log`) exists only on GitHub Enterprise Cloud. `cloudutsukpilot` is on the Free plan, and
the call returns 404 whatever the token's permissions (checked 2026-11-10). Two sources remain on Free:

- **The events API** (`GET /repos/{owner}/{repo}/events`, `GET /orgs/{org}/events`): read-only, at most 300
  events; GitHub documents 90 days but keeps older events of a quiet repository. Only some kinds of change. It has `PublicEvent` (a repository made public),
  `MemberEvent` (a collaborator added or removed), `CreateEvent` and `DeleteEvent`. It has nothing for settings,
  custom properties, teams or environments. It already answers today's case: `basic-ai-agent` was made public by
  a person on 2026-06-26 (`PublicEvent`).
- **Webhooks:** the org's GitHub App receives events with the acting user (`sender`) for repository settings
  (`repository`: edited, publicized, privatized, renamed, archived), collaborators (`member`), teams (`team`,
  `membership`), custom properties (`custom_property_values`), branch protection and rulesets. GitHub keeps
  deliveries only a few days, so they are useful as evidence only if we record them.

#### Decision

1. **Both sources, owner's choice (2026-11-10).** The Change Correlator gets a GitHub source that reads the
   events API for history and a recorded webhook log for everything from the day it is turned on.
2. **The existing App, `cloudutsuk-wardens-terraform-drift`.** It already receives the org's `workflow_job`
   events through the console's `POST /github`. It subscribes to the change events listed above, with the read
   permissions they need (org members, custom properties). The owner approves the new permissions in the org
   settings. No second App.
3. **The console records the change events; the correlator reads them.** `wardens.runtime.github_webhook`
   keeps a whitelisted summary of each change event (delivery id, event, action, repository, object, sender's
   login and type, time, and the changed fields' names and values from `changes`) in a `github_change_events`
   table in `wardens-state-db`, kept 400 days. Not the whole payload. A delivery id is stored once, so a
   redelivery is harmless.
4. **The correlator reads GitHub with a down-scoped token.** It signs in as the same App with its own copy of
   the App key in OpenBao (`kv/wardens/change-correlator`), and asks for an installation token limited to
   `metadata: read` (enough for the events API on private repositories). It reads the recorded log from
   `wardens-state-db` with a read-only role.
5. **A request names the object, not a URL.** A GitHub resource id is `github:<org>/<repo>` for a repository
   and `github:<org>/<repo>#<kind>/<name>` for something in it (an environment, a collaborator, a property); the
   drift agent builds it from the plan's `before`. The change event's `source` is `github-events` or
   `github-webhooks`.
6. **GitHub joins `providers.CORRELATED`** when the correlator answers the two acceptance cases of 0016 for it:
   the `basic-ai-agent` visibility change (events API) and one change made after the webhook log is on.
7. **The person stays out of models.** The sender's login is an actor id like a UPN: shown to people,
   masked in evals, never sent to a model (the correlator's `neverDoes`).

#### Consequences

- "Who changed it" for infra-github: visibility made public, collaborators and repository creation from the events
  API at once (as far back as the feed goes; making a repository private has no event); every subscribed kind from the day the webhook log is on; older changes of the
  other kinds stay "not found".
- One more thing to keep: a table in `wardens-state-db` with people's logins, kept 400 days. The threat model
  and the data inventory list it.
- The App's permissions widen to org-level reads. Its key is in two OpenBao paths; both rotate together.
- If the org ever moves to Enterprise Cloud, the audit-log API replaces both sources in this one tool.
- AWS (CloudTrail), GCP (Cloud Audit Logs) and Cloudflare (audit log API) each get their own decision when
  their turn comes; 0016's table lists the candidates.

#### Related

- **Relates to:** [0016](#adr-0016) (the Change Correlator), [0033](#adr-0033) (point 2: a provider joins `CORRELATED` by its own decision). Plan: correlator-other-clouds.

#### Note 2026-11-21: the organization's own objects, and five more events

The owner asked (2026-11-21) for "who changed it" on every kind of object infra-github manages, not only
repositories. The record already kept team and team-membership changes, but as organization rows (no repository)
that the correlator never read, and the App already sent `custom_property` (definitions), which nothing recorded.

1. **Five more events, no new permission.** The record also keeps `organization` (members added, invited, removed;
   the organization renamed), `custom_property` (the organization's property definitions), `team_add`,
   `branch_protection_configuration` and `security_and_analysis` (a repository's code security features). They need
   only the permissions the App was granted on 2026-11-11 (members, administration and custom properties read). The
   owner ticks the four events the App doesn't send yet in its settings; `custom_property` is already on.
2. **Rows of the organization are read too.** `ChangeLog.for_organization` returns the rows without a repository
   (`github:<org>` and `github:<org>#<kind>/<name>`: team, member, custom_property, org ruleset). The same agent role,
   the same table and the same 400 days.
3. **No email.** An invitation's email is never kept, only the invitee's login (or `unknown` for an invitation by
   email), like a collaborator's login.
4. **What stays without a source on Free:** repository settings GitHub doesn't document in `repository.edited`
   (it names topics, default branch, description and homepage; merge buttons, issues, wiki, projects,
   delete-branch-on-merge, auto-merge, Pages and vulnerability alerts are recorded only if GitHub sends them), environments, Actions secrets and
   variables, org settings, org webhooks, custom and organization roles, and a deleted or transferred repository (an
   App gets no `repository.deleted`). `GET /orgs/{org}/events` lists public events only and has no team or membership
   types, so it adds nothing to the repository feed. The audit log in the org's settings (180 days, export by hand)
   stays the owner's own check; its API is Enterprise Cloud only.

The trust and the retention of this decision don't change, so this is a note, not a new decision.

## ADR-0035: Change evidence for AWS: CloudTrail event history, through a federated read-only role
{: #adr-0035 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-12 · `platform-wardens`</span>

#### Context

AWS is next after GitHub (owner, 2026-11-10). infra-aws manages one stack today, `aws/dev/hello-world` (a VPC in
`ap-south-1`), and the shared module has units for VPCs, subnets, internet gateways, security groups and S3
buckets. Drift there is reported with "who changed it: not checked".

Every AWS account records management events in CloudTrail **event history** without any setup: 90 days, per
region, free, read with `cloudtrail:LookupEvents`. A trail (to S3 or CloudWatch Logs) keeps more and adds data
events, but costs storage and needs a bucket and a query engine; the correlator only needs management events.
Decision 0016 named two candidates: the AWS Labs CloudTrail MCP server, or `LookupEvents` directly.

The correlator has no AWS credentials, and the infra-aws CI signs in with static access keys. The wardens
cluster already has a public OIDC issuer (`https://oidc.cloudutsuk.com/wardens`, homelab ADR 0071) that Entra
trusts for the correlator's Azure identity.

#### Decision

1. **CloudTrail event history through `LookupEvents`, called directly.** A local read tool,
   `lookup_cloudtrail_events`, like the Azure and GitHub ones. Not the MCP server: it would add a second process
   for one call, and 0016 requires an acceptance test before any MCP source is used. No trail: 90 days of
   management events matches the Azure Activity Log's window.
2. **A federated read-only role, no keys.** infra-aws creates an IAM OIDC identity provider for
   `https://oidc.cloudutsuk.com/wardens` (audience `sts.amazonaws.com`) and a role `wardens-change-correlator`
   that only `system:serviceaccount:change-correlator:change-correlator` can assume, with one permission:
   `cloudtrail:LookupEvents` (it has no resource-level scoping). The pod gets a projected service account token
   for `sts.amazonaws.com` and `AWS_ROLE_ARN`; boto3 exchanges it with `AssumeRoleWithWebIdentity`. Nothing to
   store in OpenBao or rotate. The IAM units are new shared-module units; if infra-aws's CI keys can't create
   IAM objects, the owner applies that stack once.
3. **A request names the resource by its ARN.** `provider: aws`, `resourceId` the resource's ARN, which the drift
   agent takes from the plan's `arn` attribute. The correlator looks it up in the ARN's region (the default
   region, `ap-south-1`, for S3, whose ARNs have none) by the last part of the ARN (`vpc-0abc…`, the bucket
   name), which is CloudTrail's `ResourceName`.
4. **Mapping.** Read-only events are dropped; an `errorCode` marks the event failed. An event is a create or a
   delete only when it creates or deletes the requested kind of resource (`CreateVpc` for a VPC); a lifecycle
   event of another kind that names it (`CreateSubnet` names its VPC) is about a child and is left out; every
   other write (`CreateTags`, `ModifyVpcAttribute`, `PutBucketPolicy`) is an update of it. CloudTrail says who
   called which API, not the values before and after: only tag changes carry values.
5. **Actors.** An ARN listed in `config/actors.yaml` `awsPipelines` is that pipeline (infra-aws's CI user). Root,
   an IAM user and an IAM Identity Center session (`AWSReservedSSO_*` roles) are people; any other assumed role
   or AWS service is a workload. The client comes from the event: the console (`sessionCredentialFromConsole`,
   or a `console.`/`signin.` user agent), the AWS CLI (`aws-cli/`, CloudShell included), PowerShell, else an SDK.
   Like a UPN, the ARN is shown to people only and never sent to a model.
6. **AWS joins `providers.CORRELATED`** when the correlator, deployed with the role, names who made one change
   by hand to a resource in infra-aws (a tag on the `hello-world` VPC, workspace PENDING 8) from a direct
   `change.correlate` request. Then a dispatched infra-aws drift scan checks the handoff end to end. Until then
   the drift agent keeps saying "not checked" for AWS.

#### Consequences

- "Who changed it" for infra-aws's VPC, subnet, internet gateway, security group and S3 bucket units, 90 days
  back, in one region per resource. Other types stay "not checked" until they are listed.
- No secret to keep: the role trusts one service account of one cluster. If the cluster's issuer or signing key
  changes, Entra and AWS both need the new one.
- `LookupEvents` allows 2 calls a second per account and region; one call per resource, with boto3's standard
  retries, is enough for a drift run.
- Data events (S3 object reads and writes) and changes older than 90 days are not covered. A trail would add
  them, at a cost, if a case needs it.
- GCP (Cloud Audit Logs) and Cloudflare (audit log API) follow with their own decisions.

#### Related

- **Relates to:** [0016](#adr-0016) (the Change Correlator),

## ADR-0036: Jira tickets as change evidence in the Change Correlator
{: #adr-0036 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-15 · `platform-wardens`</span>

#### Context

The Correlator says who changed or deleted a resource, when and with which client, but not why. The owner wants
the drift agent to decide what to do about a deletion (restore it or remove it from code), and only a ticket
says whether a deletion was meant. The change-event contract has had a `tickets` field since 0016; nothing fills
it. The org now has a Jira Cloud site (`cloudutsuk.atlassian.net`) with project `CLOUD` for infra changes.

Tickets rarely carry an Azure resource id. People write the resource name in the summary or description, or put
the ticket key in the commit or pull request that changed the code. Free text varies, so a plain text match finds
candidates but can't tell "delete X" from "X is slow".

#### Decision

1. **Jira Cloud REST API, read only, called directly.** A local tool, `search_jira` (JQL search over the
   configured projects and issue reads), like the Azure, GitHub and AWS tools. A dedicated Jira user with the
   Viewer role on `CLOUD` and a classic API token, in OpenBao `kv/wardens/change-correlator` with the site and
   project keys. No Jira MCP server: one call shape, and 0016's acceptance test would apply.
2. **Candidates are found by rules.** (a) The resource's name or full id in the ticket text, among tickets
   updated in a window around the change; (b) a ticket key in a commit message or pull request that touched the
   drifted stack's folder in that window (`get_stack_commits`, the existing App with `contents: read` and
   `pull_requests: read`). Only keys from the configured projects. At most 10 candidates per resource.
3. **A model ranks the candidates and states the intent.** Per candidate: `covers` (the ticket asks for this
   change), `related` or `unrelated`; the intent (`remove`, `keep`, `unclear`); a quote from the ticket. Output
   is validated: only candidate keys, and the quote must appear in the ticket's text. On any model failure,
   timeout or cost ceiling, a rule match stands as `related` with intent `unclear`. The model never decides
   whether a change is evidence on its own: no candidate, no ticket.
4. **People's details never reach the model.** Assignee, reporter and comment authors are not sent; emails,
   `@`-mentions and Atlassian account ids are removed from the text first. The manifest's "never sends a
   person's name, UPN or object id to a model" stays, and `reachesModel` becomes true for ticket text only.
5. **Output without a contract change.** Keys that `covers` go in `ChangeEvent.tickets`. Every finding gets one
   evidence item per candidate kept (`source: search_jira`, `ref: jira:<key>`, the excerpt states match, intent
   and quote), which terraform-drift reads. A resource with no recorded change can still have a ticket.
6. **The drift handoff passes repository, stack and commit** in an optional `context` object of the
   `change.correlate` input, so 2(b) can run. Without it only 2(a) runs.

#### Consequences

- Drift findings and the decision in 0037 can say "CLOUD-12 asked for this deletion" or "no ticket found".
- A wrong ticket match misleads people: the excerpt always shows the quote, and the match is labelled
  correlation, not cause, like every Correlator answer.
- One more secret to rotate: Atlassian tokens expire within a year (PENDING.md has the date).
- The Correlator gets a model and a model key (cost ceiling raised to cover ranking).

#### Related

- **Relates to:** [0016](#adr-0016) (the Change Correlator; ticket

#### Amendment (2026-11-24): an unrelated ticket adds nothing

Live checks on CLOUD-3 found a ticket only through its key in a commit under the stack, and its text named neither the
resource nor the change. The owner decided: when a ticket doesn't refer to the drifted resource, by its exact name or
in other words (for example a key added to a commit by accident), the Correlator doesn't contribute it to the analysis.
It only says the ticket was found and Jira holds no evidence for the change: `ticket CLOUD-3 found, but no evidence for
this change in Jira`. The ranking prompt calls such a ticket `unrelated`; it is never in the answer's tickets, so it
changes neither the outcome nor terraform-drift's verdict, and terraform-drift shows the note as written
(warden-change-correlator 0.3.1, warden-terraform-drift 0.3.4).

## ADR-0037: Deletion decisions in terraform-drift: remove from code or restore
{: #adr-0037 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-15 · `platform-wardens`</span>

#### Context

A resource deleted outside Terraform became a finding and nothing else: "re-create it with an apply, or remove it
from resources.yaml if intended". On 2026-11-14 the owner deleted a resource group in the portal to stop a monthly
cost, and the agent reported it with who and when but couldn't say which of the two it should be. Until someone
edits the code, every apply of that stack re-creates the group.

The two fixes are both one-file changes to the stack's `resources.yaml`:

- **remove**: drop the entry, and the entries in the same file that can't exist without it (a private DNS zone
  whose `resource_group_name` is the deleted group). The plan then creates nothing.
- **restore**: the code is already right, but nothing runs the apply until the stack's files change. A dated
  comment line above the entry is a change that leaves the YAML the same, so the merge runs the apply.

Choosing between them needs to know whether the deletion was meant. Since 0036 the Change Correlator says who
deleted it and which Jira ticket covers it, with the intent the model read (`remove`, `keep`, `unclear`).

#### Decision

At the end of an incident, after the imports, terraform-drift runs `incident_deletions` for every deleted
resource. The decision is deterministic. A model's output only reaches it through the ticket intent, which 0036
already validates (a quote that really appears in the ticket):

| Evidence | What the agent does |
|---|---|
| A ticket covers the deletion with intent `remove` | Opens the **remove** draft PR, citing the ticket |
| A data-holding type (storage, Key Vault, databases, registries, …), another stack names it, no deletion in the audit log, or an entry the agent can't edit (nested types) | **Investigate**: no branches, the message says why |
| A ticket covers it with intent `keep` | Prepares both branches and asks, recommending **restore** |
| No covering ticket, and other entries in the stack name it | Prepares both, recommends **restore** |
| No covering ticket, nothing names it | Prepares both, recommends **remove** |

The covering-ticket row comes before the audit-log row: a ticket asking for removal decides even if the
deletion itself wasn't found (the Activity Log keeps 90 days).

- **Preparing a branch** means the change is committed on a new `drift/<stack>/<key>` branch and no pull request is
  opened. The message links GitHub's compare page, which fills the PR form from the commit message. A person who
  disagrees with both does nothing; the branches stay until someone deletes them.
- **Two new actions** at L1: `remove_deleted_pr` and `restore_deleted_pr`, both through the `open_draft_pr` tool and
  its guards (only `drift/` branches, only the stack's `resources.yaml`, the diff must match the proposed action's
  `patchSha256`, the kill switch read just before the first write). `neverDoes` is unchanged: the agent never
  merges, and never runs the apply a restore triggers.
- Both edits are line edits of the original text, checked by parsing: a removal must equal the original without
  exactly those entries, a restore must parse the same as the original. Anything else is "investigate".
- Data-holding types are never restored automatically: re-creating one gives an empty object, and the right fix may
  be a restore from backup. The agent doesn't prepare a remove either, so nobody merges away the only record of it.
- The message shows each deleted resource in plain sentences: what and where, what the next apply does, who and
  when, the ticket (or why none was found), what depends on it, the verdict and its reason, and the links.

#### Consequences

- The case that started this (a ticket asking for removal) needs one review and a merge instead of a person
  working out what the finding means and editing the file by hand.
- A wrong `remove` intent from the ranking opens a PR that removes an entry the owner wanted. It is a draft, its
  plan shows the change, and the ticket quote is in its body; the cost of a mistake is closing it.
- The agent writes branches it doesn't open PRs for. They appear in the repository's branch list until deleted.
- Not built yet: an open or merged pull request that already removes the entry should be linked instead of
  preparing branches. Today the one-open-drift-PR-per-stack rule returns the agent's own open PR for the stack,
  but a person's PR isn't found.

#### Related

- **Relates to:** [0013](#adr-0013) (a draft PR is the agent's recommendation, L1),

## ADR-0038: The console's incident view, console sends through the ingress hub, and console roles
{: #adr-0038 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-16 · `platform-wardens`</span>

#### Context

An operator could not see one incident from start to end while it ran. The console followed only the runs started
from that browser and showed tasks and artifacts after the workflow completed. Grafana's Correlation dashboard shows
the spans of one correlation id, but mostly after the fact, and Temporal's UI shows one workflow at a time without the
agents' stages, cost or guardrail results.

A Send from the console also took a different path from every other event. It built the root task and started a
workflow in the request, by default the agent's task workflow rather than the incident workflow, so it skipped the
ingress hub, the consumer, handoffs and the single digest message. What an operator tested was not what an alert or a
GitHub event runs.

Only two Keycloak groups were let into the hosted console, because it had no read-only mode: anyone who could open it
could start agent runs.

#### Decision

1. **An incident view in the console.** A third tab shows one incident, by correlation id or workflow id, as a Flow of
   blocks (the default) or a Timeline, with an inspector per step. It reads, it starts nothing. The document is a
   contract (`contracts/schemas/incident-view.schema.json`) built by `wardens.runtime.incidents` from three sources:
   the incident workflow's new read-only `view` query, its children's descriptions and histories
   (`wardens.durable.inspect`, the only place that reads Temporal for it), and the agents' run records. Tempo is not
   read; the page links to Grafana for spans. A guardrail point is shown only when a record proves its result.
2. **A console Send takes the ingress path.** The console validates the request (input schema, requester, channel
   policy, guardrail point 1) and publishes `com.cloudutsuk.wardens.console.task.submitted` to the ingress hub. The
   ingress consumer builds the root task with the same code, claims the dedupe key and always starts the incident
   workflow as `incident-<correlationId>`. The console chooses the correlation id, so the page opens the incident at
   once. The hub not taking the event is a 503 and nothing starts, as for the webhooks' relays. A direct mode runs the
   same receiver in the request, for a laptop without a hub. Conversations keep starting their agent's workflow
   directly: a conversation is one workflow with signals, not an incident.
3. **Three console roles from the sign-in proxy's groups header**: viewer (the catalogue, incidents, runs), editor
   (also Preview, Send, Chat), admin (also the kill switches). One table in the console says which permission each
   route needs; a route not in it is not served.

#### Considered options

- **Keep starting workflows from the console, but always the incident workflow.** Same view, no contract or consumer
  change, but a console send would still skip the hub, the consumer and the `wardens.ingress` span. Turned down by
  the owner on 2026-11-16.
- **Build the view from Tempo traces.** Agent spans are written from the run record when an agent ends, so the view
  would not be live, and spans may be sampled.
- **A Temporal search attribute for the correlation id.** It must be registered on the server first. The incident
  workflows carry `correlationId` in their memo instead, and the read model resolves a correlation id from the
  workflow id, the run records' `incidentWorkflowId`, or a bounded scan of recent incidents.

#### Consequences

- Every console Send is an incident: handoffs run and one digest message is sent, as for a real event.
- The ingress consumer must be deployed before a console switches to relay mode; an older consumer dead-letters the
  new event type. The consumer needs the console's incident queue and a state database role that can claim dedupe keys.
- A Send that is a duplicate of another task is reported by the consumer, not on the page.
- Cost, tool calls and output of an agent appear when it ends, because they come from its run record.
- Eval scores have no record the console can read yet; the inspector shows the manifest's thresholds and says so.
  Superseded by [0039](#adr-0039): the accepted report in the agent's folder.
- Viewer and editor groups can be let into the hosted console once it runs this code with the groups header.

#### Related

- **Relates to:** [0030](#adr-0030) (the ingress hub and consumer), [0026](#adr-0026)

## ADR-0039: The accepted eval report lives in the agent's folder, and console conversations are their starter's alone
{: #adr-0039 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-16 · `platform-wardens`</span>

#### Context

The console's inspector shows each agent's eval thresholds but no scores: an eval run printed its report and, at
most, wrote it to a file someone attached to a PR. Nothing kept the last accepted result, so `regressions` had no
baseline to compare with, and the console had nothing to read.

Decision 0038 also gave the console a viewer role. `GET /api/runs/<workflowId>` returned any run's result to anyone
who knew the id, including a conversation another person had with an agent.

#### Decision

1. **Each agent commits its accepted eval report as `agents/<domain>/<agent>/evals/accepted.json`**, a contract
   (`contracts/schemas/eval-report.schema.json`): agent version, when it ran, the model mode and name, the version of
   every prompt file, the case counts, metrics, verdicts, the thresholds they were judged against and the failed case
   ids. Summary only. An agent's eval runner writes it with `--accept` (`wardens.eval.accepted_report`,
   `write_accepted`); every run compares itself with it (`regressions`). It is reviewed in the PR that changed the
   prompt, model or code, and ships in the agent's image, so the console reads it from the registry's agent folder.
2. **The inspector shows the accepted scores beside the thresholds**, with a verdict per metric, and says whether
   the run's prompt versions (from its run record) are ones the report was measured on. The scores describe the
   agent, not the run, and the page says so.
3. **A conversation's or an Auto proposal's run is readable only by the person who started it**, whatever their
   role. Incidents, and runs with no starter (scheduled), stay readable by any viewer.

#### Considered options

- **A table in the state database written by an eval job.** Live and queryable, but it needs a job with database
  write access and the model credentials, a new migration and role, and a record that can disagree with the code
  in the image. Nothing runs evals on a schedule yet. Worth revisiting when online (sampled live) grading exists;
  the table would hold the same contract.
- **CI artifacts.** Expire, are not reviewed with the change, and the console can't read them.
- **Keep the scores out.** The inspector would keep showing thresholds that look like results.

#### Consequences

- An agent shows scores only after someone runs its eval set with a model and accepts it; until then the inspector
  says no accepted report is committed. terraform-drift's runner has `--accept`; the other agents' runners gain it
  when they get one.
- A `--model none` run can be accepted, and the file and the inspector say it measured the deterministic stages only.
- A broken `accepted.json` fails `read_accepted` (a bug to fix); the console logs it and leaves the scores out.
- A viewer can't read another person's conversation, and neither can an admin through this route.

#### Related

- **Relates to:** [0038](#adr-0038) (the incident view and console roles),

#### Note (2026-11-18, plan repo-per-agent phase 3 step 14)

The runner is now the library's: `wardens eval run <agent folder> --accept --accepted-by <who>` writes
`evals/accepted.json` for any agent whose manifest names an `evaluation.harness`, and terraform-drift's own
`evals/run.py` is gone. The report says how it was run: `model.mode` is `none`, `test`, `recorded` or `live` (`env`
stays for reports written before), with `repeats`, `passRate` and `safetyFailures`. What counts toward promotion
(`countedTowardPromotion`) is decided by the library from each case's label provenance (real and confirmed by the
manifest's owner), not by the agent. An accepted `test` or `none` run measures the workflow and the deterministic
stages only, as a `--model none` run did before.

#### Note (2026-11-18, plan repo-per-agent phase 3 step 14, production feedback)

The "table in the state database" alternative is now used for one thing the repo can't hold: people's verdicts on
production runs (`wardens.run_verdicts`, migration 0010). The scores stay in `evals/accepted.json`. `wardens eval run`
reads the verdicts and the report gains `feedback` (right and wrong per lifecycle stage, the wrong runs not yet
accepted as a case in the set or dismissed) and `promotionBlockers`, both optional in the eval-report contract (an
expansion). `promotionReady` is false while a wrong run is unresolved, or when the verdicts could not be read (no
state store, as in CI): an accepted report written there says so in `promotionBlockers`.

#### Note (2026-11-18, plan repo-per-agent phase 3 step 14, calibrated judges)

The report gains an optional `judges` block (an expansion of the eval-report contract): per judged measure, the judge
model and family, the rubric version, the judge's raw mean score and its calibration against people's scores. The
accepted report keeps it. A judged measure's value is in `metrics`, and so compared with the accepted report, only
while its judge is calibrated; people's calibration scores live in the state database (`wardens.judge_samples`,
migration 0011), like the production verdicts, not in the repo.

## ADR-0040: One repository per agent, with wardens as a versioned library
{: #adr-0040 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-17 · `platform-wardens`</span>

#### Context

platform-wardens is one uv workspace: the `wardens` framework, six agents, `mcp-guard`, the contracts, the shared
config and the docs share one tree, one lock and one CI. That made it fast to build the framework and the first agents
together, but:

- An agent can't be built, reviewed, released or owned on its own by its domain cell (0020), and a new agent starts as a
  folder in someone else's repo instead of a golden path of its own (0022).
- The framework has no versioned boundary. Agents import internal modules, the framework finds agents, prompts, config
  and samples by walking the repo layout, and 44 of the 154 merges up to 2026-11-17 changed the framework and an agent in
  one PR.
- Many of the platform's practices are followed by convention in agent code, not enforced by the library: guardrail
  calls, model limits, memory access, tracing, eval scoring, idempotency, heartbeats. In one tree a reviewer catches a
  slip; across seven repos nobody would.

#### Decision

Every agent moves to its own repository, `warden-<agent>`, and imports `wardens` as a versioned Python library. The
framework enforces the platform's practices through the library, a check command, a reusable CI workflow and a
template, not by sharing a folder tree. The owner's choices (the plan's "Owner's decisions" 1 to 11) are:

- **Repos:** `warden-terraform-drift`, `warden-change-correlator`, `warden-stack-author`, `warden-incident-triage`,
  `warden-cicd-triage`, `warden-cluster-upgrade-readiness`; `sql-blocking` is created from the template when built.
  `mcp-guard` isn't an agent and stays. Each repo starts fresh; its first commit names the platform-wardens commit it
  came from.
- **Distribution:** the `wardens` wheel is published to Zot inside a small signed FROM-scratch image,
  `platform/wardens-py:<version>`. An agent pins the version in `pyproject.toml` and the image digest in its
  Dockerfile, and copies the wheel in; there is no base image with wardens installed, so each agent keeps one lock.
- **Two distributions:** `wardens` (the agent SDK) and `wardens-services` (router, console, ingress, webhooks, approval
  endpoint). Agents install only `wardens`.
- **The console and the router get separate images;** the router (`wardens-router`) is the only host of the incident
  workflow.
- **Shared config that names several agents** moves to a new `wardens-deploy` repo that Argo CD reads directly,
  with a versioned registry of agent manifests.
- **One decision log**, here, for the framework and every agent.
- **The framework is hardened in the monorepo first** (plan phase 3), so agents move out already compliant. The pilot
  (`warden-incident-triage`) runs on the real pipeline, with no seed and no one-off CI.

### Rules every phase relies on

1. **Workflow changes are versioned.** Code that runs inside a workflow goes behind `workflow.patched` or worker
   versioning and passes a replay test against recorded histories before it ships.
2. **Contracts change by expand, then contract.** Contracts use `additionalProperties: false`, so a new field is first
   accepted by every consumer and only then emitted; a removal goes the other way. CI checks compatibility in both
   directions; a rename or removal is a major version.
3. **Upgrade order:** the router and the console first, then agents. The current and previous minor versions are
   supported.
4. **The framework version is measured, not declared:** each worker reports the `wardens` version it runs (from the
   installed wheel) in its Temporal build id and in every run record; the router reads it from the task queue's
   pollers. One minor behind is a warning window; two behind is refused with a reason until bumped.
5. **Risk-raising manifest changes need an approval record** from a person in the cell's reviewer group who isn't the
   requester: raising an autonomy or action level, adding an act tool, raising the data classification or a budget,
   widening `bounds`, egress or who may hand off to a capability. Enforced in `wardens-deploy` and by the router.
6. **Version bumps by a `wardens bump` script** run by the release workflow. Renovate is turned down for now (no repo
   uses a bot, and Renovate would need self-hosting to see Zot).
7. **Eval tiers:** every bump PR runs the deterministic evals and the replay test; model evals run on a schedule, on a
   manifest, prompt or model-stage change, and before a promotion.
8. **Control evidence** across repos comes from the registry (manifests, approval records, accepted eval reports per
   agent version) and the run records (0024).
9. **The org stays on GitHub Free.** Required reviews and status checks stay unavailable on private repos, so the
   guarantees come from the publish path, a Cosign attestation written only by `agent-ci.yaml`, Kyverno admission and
   the approval gate. The Team plan is the alternative that was turned down.
10. **Python standards:** python-standards. The public API of each subpackage
    (its `__all__`) is what semantic versioning covers; a moved or renamed public name keeps a shim with a
    `DeprecationWarning` for one minor version.
11. **Handoffs by consent, not a central list:** the source declares `handoffs.mayRequest`, the target capability
    declares `acceptsHandoffs.from` (`any` only on a capability with no act actions), the target's data classification
    is at least the source's, and today's checks still pass. Refusals have fixed reason codes (`not_requested`,
    `not_accepted`, `act_needs_named_source`, `classification`). `framework/config/handoff.yaml` goes.
12. **Cost budgets at four levels, by the library:** per model call (from what the run has left), per run, per
    incident (a running total; a handoff gets a share of what is really left) and per day per agent and per cell, with
    the manifest's `onReach`. LiteLLM key budgets sit just above `perDayUsd` as the hard stop.
13. **Long-term memory is bound to the manifest:** only through the binding, provenance set by the framework, reads
    recorded and marked advisory, unreviewed memory can't justify an action, review and forget in the console, row-level
    isolation per agent. Knowledge (runbooks, past RCAs) is a shared read-only retrieval capability, not memory.
14. **Limits come from the manifest and are applied by the library:** requests, tool calls and timeouts per stage, run
    and conversation, and incident breadth caps, under framework ceilings agents can only lower.
15. **Traces are complete per step and follow the data classification:** live per-request spans, every gateway call
    joined to its incident trace, prompt text kept only for agents at Internal or lower, tool outputs as size, hash and
    a redacted excerpt.
16. **Evaluations are owned by the library and gated in CI:** one case format with label provenance, the ten measures
    of 13 Evaluation computed from the run record (deterministic wherever code can
    check), calibrated judges only for measures of degree, every agent's deterministic evals gating its PRs, nightly
    live runs, production runs marked wrong becoming cases before promotion, a `postCheck` for every act.
17. **Tools are defined, fail and repeat safely through the library:** `wardens.tools` with required descriptions and a
    definition hash, one error taxonomy that tells the model what it can fix, retry policy from the manifest, and every
    act idempotent by a key the library claims before acting, with a declared guard.
18. **Durable execution has stated rules:** the checkpoint is the activity, so an LLM stage is read-only and short;
    every activity heartbeats; operators can hold and resume a run; long workflows continue as new; recovery is tested.
19. **Docs change with the code:** each step's PR updates the docs it makes stale, and each agent repo carries a fixed
    doc set, with an agent card generated from its manifest and checked in CI.

### Enforcement

Four layers, so no single one has to catch everything (plan section 13): the library runs the agent (the binding,
`stage`, the toolset, the clients); the router decides cross-agent matters (routing, handoffs, version window); the
build path (`agent-ci.yaml`, `wardens check-agent`, the attestation, a publish credential only `agent-ci` has); and
the platform (Kyverno `verifyImages`, LiteLLM, `mcp-guard`, the chart's kill switch and settings).

#### Considered options

- **Keep the monorepo, harden the framework only.** Gets the enforcement but not ownership by the cells, independent
  releases or a golden path per agent. The hardening is done first anyway, so this stays the fallback if the split
  stalls.
- **A base image with wardens installed, agents building `FROM` it.** wardens' dependencies would be installed before
  the agent's, so the agent's lock and the image could disagree on shared packages, and tests outside Docker would
  still need a wheel.
- **A Python package index (devpi, a hosted index).** One more service to run and secure; Zot already stores signed
  OCI artifacts and the agents' images.
- **Git submodules or a git dependency on platform-wardens.** No signed artifact, a GitHub token in every build, and
  no measured version.
- **An orchestrator agent that wraps every agent.** It can't see inside another process; enforcement belongs in the
  library the agent runs, with the router deciding only what crosses agents.
- **GitHub Team for required reviews and checks.** Turned down by the owner; the attestation and approval gate give the
  same guarantees for what matters.
- **Renovate for bumps.** Turned down for now (above).

#### Consequences

- About 55 to 65 PRs across platform-wardens, `wardens-deploy`, six agent repos, homelab-gitops, infra-local and
  infra-github; phase 3 (the hardening) is the largest.
- A change to the framework and an agent becomes a release, a bump PR and an agent PR. The hardening first, release
  candidates and `wardens bump` keep this short; the success criteria in the plan measure it.
- Agents lose access to internal framework modules; what they need is promoted to a public API with a deprecation
  window.
- The guarantees that GitHub Free can't give (required reviews, required checks) move to the publish path and
  admission, so a bypass of `agent-ci` produces an image Kyverno refuses.
- Decisions for every agent stay here; agent repos link to them.

#### Related

- **Relates to:** [0004](#adr-0004) (Temporal), [0012](#adr-0012)

#### Note (2026-11-18): how rule 2 is checked, and what counts as a major change

Plan phase 4 step 2 built the check rule 2 asks for: `wardens release check` (`wardens.release`, in
`.github/workflows/wardens-py.yaml` on every framework change) compares the contracts with the last final `wardens-v*`
release. Every schema change is either an **expansion** (the new schema accepts everything the released one did: an
optional property, a dropped `required`, a new enum value, a looser type or bound), which passes and is listed so
producers wait for consumers, or a **tightening** (the new schema refuses something the released one accepted, or the
check can't prove it doesn't: a changed `pattern`, `$ref` or `oneOf` branch counts). Rule 2 names renames and removals;
the check treats every tightening the same way, because each one breaks an older producer the same way: a contract step
must be named in `framework/CHANGELOG.md` by its `<schema>#<pointer>`, and ships only in a major version over the last
release. That includes making an expanded field required (`handoffs`, `memory.items[].key`), and it applies before 1.0
too, since rule 3 supports the previous minor version. Confirmed by the owner on 2026-11-18, before the first release (`0.2.0`). Release candidates are not a baseline: they are tried on agents,
not deployed.

#### Note (2026-11-18): where `agent-ci.yaml` lives, and its trust model

Recorded in homelab-gitops ADR 0111 (plan phase 4 steps 3 and 4). `agent-ci.yaml` lives in homelab-gitops next to
`build-image.yaml`, not here: that repo already holds the publish path's trust roots (the build workflow, Kyverno's
policies and public keys) and is open to the org's repositories for reusable workflows, which platform-wardens isn't.
What is specific to wardens stays in the `wardens` command it runs. GitHub's OIDC token names the innermost reusable
workflow, so `agent-ci.yaml` builds, pushes, signs and attests in its own jobs, with `build-image.yaml`'s steps shared as
composite actions. No agent code runs in a job that holds `id-token`: the tests, `check-agent`, replay and evals run in
a job without it, and the jobs that sign read the repository as data. OpenBao role `agent-ci` accepts only that file
at `refs/heads/main` from a `warden-*` repository and is the only role that can sign with the transit key `agent-ci`,
which signs the agent-ci attestation Kyverno will check (step 5); `build-image.yaml` refuses role `main` to `warden-*`
repositories.

#### Note (2026-11-20): owner self-approval of registry entries (rule 5)

Owner decision, in chat on 2026-11-20: "owner self approval is fine". The homelab has one real reviewer: the owner (the
second GitHub account, `sakharam2s`, is the same person), so rule 5's "a person who isn't the requester" could only be
met by pretending. Instead the record says honestly what happened:

- **Who is an owner:** a member of a Keycloak group the console sees in the person's groups header, like the reviewer
  groups: `wardens-owners` by default, `WARDENS_APPROVAL_OWNER_GROUPS` (comma-separated) in the console's values to
  change it. Not "whoever asked", and not a list of subjects in a config file: membership is assigned in one place
  (infra-local `host/keycloak/configure-realm.sh --grant`, homelab-gitops ADR 0078), and the console already resolves
  roles and reviewer groups from that header.
- **Owner does not imply reviewer:** the owner must still be in the cell's reviewer group (`wardens-<cell>-reviewers`).
  Being an owner lifts only the requester rule, so the record's `approver.group` stays a real reviewer group and a
  cell's reviewers stay the one list of who may decide for it.
- **Only with a reason, only registry entries, only approve:** the console's "Self-approve (owner)" needs a non-empty
  written reason (400 without), signs `selfApproved: true` and `selfApprovalReason` into `approval.json`, and audits
  `approval.self_granted`. A requester who isn't an owner still gets 403. Chat actions (`chat-action`) keep the
  two-person rule (the workflow's `wardens.guardrails` check), and nobody self-rejects.
- **The gate accepts it by default:** `wardens registry verify-approval` and the router accept a signed self-approval.
  `--require-two-person` or `WARDENS_APPROVAL_TWO_PERSON=true` refuse it, so wardens-deploy CI can require two people
  again without a release. A record whose approver is the requester but lacks the marker is always refused.

**Revisit** when a second real reviewer joins any cell: set `WARDENS_APPROVAL_TWO_PERSON=true` in wardens-deploy CI and
the router (or pass `--require-two-person`), and empty `wardens-owners`.

## ADR-0041: Team chat: one channel per cell, threads as durable sessions, Slack first
{: #adr-0041 }

<span class="adr-status adr-status-proposed">Proposed</span> <span class="adr-meta text-muted">2026-11-18 · `platform-wardens`</span>

#### Context

Today the only ways into wardens are the operator console, webhooks and schedules. Slack is outbound only, through
incoming webhooks. An incident's investigation is visible only in the console, and a console conversation can be read
only by the person who started it (0026), so the reasoning stays with one person instead of the on-call team. The
standard asks to "use existing collaboration and ticketing systems" (category
16). The AgentConnect comparison
(openagents.md) concluded: adopt the front door, not the engine. That means team
channels, a thread as a durable session, results posted back into the thread, and approval cards. It rejects channels
as the agent-to-agent bus, open-ended coding harnesses, and memory that agents write freely.

The owner's answers are in the plan, from 2026-11-18. They cover the channel shape, multi-agent threads, the platform,
identity, the classification ceiling, the Slack plan, and the security questions S1 to S4.

#### Decision

1. **One channel per domain cell** (`#wardens-devops`, `#wardens-sre`, `#wardens-dba`, `#wardens-common`), private,
   bound in a deploy config file `chat.yaml` (platform, channel id, classification ceiling, filters, open-thread cap).
   Each binding is a new `slackBot` channel kind on the cell's existing domain audience, so 0011's routing by domain
   and its approver audiences stay.
2. **One Slack app.** Agents post under their own name, set only from the registry, with a fixed "via wardens" line.
3. **Slack is first, behind a platform-neutral port.** A `ChatChannel` protocol and a `conversationRef`
   (`platform`, `workspace`, `channel`, `thread`) on the task. The chat events are normalized into two CloudEvent
   types. Teams is later work: Bot Framework through the tunnel or Azure Bot Service, an Entra app for the bot, and
   Adaptive Cards.
4. **A thread is a durable session.** A `wardens.thread` workflow runs on the router queue, one per thread. The
   router routes and waits, and never calls a model with an agent's identity. Follow-ups run as the agent's own
   read-only `<agent>.ask` capability, on its own queue, with its own key, budget and limits.
5. **Several agents in a thread, but only because a person asks.** Tagging an agent starts a new root task with
   `causationId` to the thread's incident. It passes the handoff consent and classification checks, plus the
   requester's editor role in the **target agent's cell**. The relay drops every bot post, so an agent never starts
   another through chat. Note on 0009: this is person-mediated routing, and group chat stays out of production.
6. **Inbound through the tunnel and the ingress hub.** The Slack Events API reaches `hooks.cloudutsuk.com/slack/*`
   (Access bypass; the signature is the authentication), then a relay, then Event Hubs, then the consumer. This is the
   same path as GitHub and alerts. Socket Mode was turned down.
7. **People are platform principals only through an explicit link.** The person signs in with Keycloak, using a
   single-use nonce sent to them alone. Roles per cell are read from Keycloak each time they are used. Matching on the
   Slack profile email was turned down.
8. **Visibility follows the cell channel's membership.** This amends 0026 for chat threads. A daily check compares
   each channel's members with its cell's Keycloak group.
9. **What chat may do.**
   - A linked viewer may ask.
   - A linked editor may start a task, bring in an agent, hold and resume.
   - A linked editor whose link was renewed in the last 7 days may confirm level 1, once a red-team exercise has
     passed.
   - **Level 2 is only in the console**, and the approver is identified only by an OIDC sign-in.
   - A manifest operator may engage the kill switch; it is never released from chat.
   - Effective level = min(manifest action level, the `chat` channel policy's cap, the requester's role cap, the
     framework's cap).
10. **Authorization at three points, each checking on its own:** the ingress consumer (the person and the channel),
    the router (agents and consent), and the agent's binding (manifest and level).
11. **The security architecture is the plan's section 2.7.** The owner chose the recommended options on 2026-11-18:
    - Slack's signature is checked again at the consumer from the forwarded raw body.
    - Buttons carry opaque ids only.
    - A message holding a secret is refused and never stored.
    - Thread turns are quoted as data with their author.
    - `ask`'s read tools are bound in code to the task's `contextRefs`.
    - Tools with `credential: person` are refused for chat.
    - **One chat egress worker holds the bot token** (S1).
    - **Chat text stays out of Temporal history**, which keeps only hashes and redacted excerpts (S2).
    - **Level 1 needs a link renewed in the last 7 days** (S3).
    - **The cell channels are private** (S4).
    - The output is filtered by the channel's **Internal** ceiling and by the reply's taint.
    - Every task carries `principal.via`, and every chat decision writes a hash-chained `chat.*` audit event.

#### Considered options

- **A channel per agent.** Turned down: it duplicates the domain audiences, splits a cell's on-call team, and needs a
  binding per agent.
- **One shared channel for all agents.** Turned down: too noisy, and every agent's data gets the same ceiling.
- **Agents tagging each other in a thread.** Turned down: it is group chat (0009), and it needs a loop guard.
- **The follow-up model stage on the router.** Turned down: the router would call models with another agent's key,
  budget and classification, outside that agent's run records and evals.
- **A bot per agent.** Turned down: more secrets and more tokens that can post, for a name that the registry can set.
- **A Temporal payload codec instead of keeping text out of history.** Turned down for now: a wider change that needs
  key management for every worker and the Temporal UI. It stays the later alternative.

#### Consequences

- The contracts and manifest fields come first (repo-per-agent phase 3 step 18, expand only): `conversationRef`,
  `principal.via`, the `chat` channel kind, the chat event types, `interaction.chat`, `capabilities[].acceptsChat`,
  and memory scopes. Agents leave the monorepo already compatible.
- New public route `hooks.cloudutsuk.com/slack/*`. New secrets in OpenBao `kv/wardens/slack`: the signing secret,
  read by the relay, and the bot token, read only by the egress.
- New state tables: `chat_links` (migration 0012), `chat_threads`, and chat message text by reference.
- Slack is a third-party processor outside the tenant. Content at most Internal is posted, and nothing regulated
  (category 24). For the Azure target, Teams in the tenant is the better
  data-residency fit.
- On the Slack Free plan, SSO and 2FA can't be forced, so level 1 is bounded by the 7-day link freshness. Slack keeps
  90 days of history, and the console keeps the record.
- Category docs updated: 08, 09,
  10, 11 and
  18 with this decision. 16, 20 and 21 follow step 18's own edits.

#### Related

- **Status note:** the note of 2026-11-20 sets how a thread closes and what an ask sees of it
- **Amends:** [0011](#adr-0011) (a `slackBot` channel on the domain audiences),
- **Relates to:** [0018](#adr-0018) (model gateway),

#### Note 2026-11-20: idle threads close after 15 minutes, and a reply resumes the whole thread

Owner request (2026-11-20): "reduce the idle timeout to 15 mins as temporal would just consume resources for no
reason", and a prompt in the same Slack thread must reach the thread "with the context of the complete thread and not
start from scratch; if required, store it in long term memory".

- **Idle close.** A thread waiting only on people (a thread from chat, or one reopened by a reply) closes after 15
  minutes with nothing (`FOLLOW_UP_IDLE`), instead of 24 hours, and posts nothing when it does: the next message
  resumes it. An incident thread whose incident hasn't ended keeps the 24-hour wait (`INCIDENT_WAIT`), because the
  incident's own events can take longer than 15 minutes (a cold Change Correlator takes about that long); closing
  early would drop its posts.
- **The whole thread on every ask.** Each answered question and the answer posted to it are kept in the state store
  by the router (migration 0018): `chat_turns` holds the thread's turns in order by message id and sha256, like
  Temporal history (no text), and the answer's text joins the people's in `chat_messages` as `wardens:<agent>`, so an
  ask reads it by id and hash exactly as it reads a question. Inside a running thread the answer joins the next ask's
  turns; a run that starts after a close reads the thread's last 20 turns first. The ask is told which turns are
  agents' earlier answers: context for what a question refers to, never a record and never instructions.
- **Why not long-term memory.** Category 21's memory (`memory_items`) is one agent's, manifest-gated, with row security
  per agent, and a thread spans agents (an incident thread has every agent that worked on it). The thread's history is
  chat state with chat's retention (30 days) and chat's grants, so it lives with the thread index and the message text.
- **What stays the same.** People's text never enters Temporal history. An answer is kept as the channel saw it:
  redacted, and only the egress's notice when it was above the channel's ceiling; an earlier answer tainted above the
  answering agent's classification is left out of its ask. The router and the agents share the `wardens_agent` login,
  so the database can't stop an agent from adding a row; every turn is quoted to the model as data and checked against
  the sha256 in the task. Threads started before the change (patch `team-chat-thread-context`) keep their 24-hour wait
  and closing post until they close.

**Expiry (same day).** The owner added: "The thread should eventually expire after 48hrs of idle time configurable and
no new comment will be allowed". A thread expires when 48 hours pass with no message (chat.yaml
`threadExpiryHours` per cell, 15 minutes to 30 days), measured from its last message (an incident thread's end counts
too; a row from before migration 0019 counts from its close, else its opening). The router keeps the last message and
the cell's expiry in the thread index (migration 0019), and the ingress consumer, which reads the index before it
routes a reply, refuses a message in an expired thread: its text isn't kept, nothing is routed or asked, and the first
such message gets one reply in the thread ("This thread expired after 48 hours without a message. Mention @wardens in
the channel to start a new one"), posted by a one-shot thread run because only the egress posts in a thread; later
messages are only audited (`chat.message.refused`) and logged, so an expired thread can't be made to flood the channel.
An incident thread whose incident is still running never expires. The index row now lives 30 days past the last
message, so it always outlives the expiry and an expired thread is refused rather than started anew.

## ADR-0042: wardens-deploy: an immutable versioned registry, publish by commit or pull request, contract checks per version pair
{: #adr-0042 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-19 · `platform-wardens`</span>

#### Context

Decision 0040 moves the config that names several agents, and a registry of agent manifests, to a new repository,
`wardens-deploy`, which Argo CD reads; each agent's `agent-ci` run publishes its entry there. The plan left open how an
entry is laid out and published, what "the entry matching the worker's version" means when there is none, which version
pairs the handoff contract checks cover, and how the monorepo keeps working while the files move.

#### Decision

1. **Layout of `wardens-deploy`:** `config/` (the files that name agents, cells or channels: `routing`, `entry-points`,
   `ownership`, `webhooks`, `redaction` and `chat`, `wardens.config.DEPLOY_FILES`), `registry/<agent>/<version>/`
   (manifest, `schemas/`, `samples/`, `evals/accepted.json`, `approval.json` when needed, `source.json`), `mcp/`
   (generated from the registry) and `evals/routing/cases.yaml`. Framework-only config (`limits`, `cells`,
   `mcp-servers`, `notify`) stays in the wheel.
2. **A published version never changes.** Publishing a version that is already there with other content is refused
   (raise the manifest's version); the same content publishes nothing, so a re-run is safe. `source.json` records the
   repository, commit, run and image digest that published it (control evidence, 0040 rule 8).
3. **Commit or pull request, failing closed.** `wardens registry publish` commits a non-risk-raising entry to `main` and
   opens a pull request on `registry/<agent>/<version>` for a risk-raising one, by
   `wardens.registry.diff.risk_reasons` (plan phase 5 step 4). A wardens without that function publishes **every**
   entry as a pull request: nothing skips review because the check is missing. The commit carries `mcp/` regenerated
   from the whole registry; a push that loses a race starts again from the new `main`.
4. **The router uses the entry for the version the worker reports** (`agent=<name>@<version>` in the build id, phase 4
   step 8): the registry keeps every version, and capability resolution and handoff planning use that version's
   manifest, so a rolled-back image is checked against its own. With no reported version, or no entry for it, the
   newest entry is used and the router logs it; that version's entry not serving the capability or not routable is
   refused (reason `registry_entry`). Refusing an unknown version instead would stop every agent whose entry isn't
   published yet, which is all of them until their repositories exist.
5. **Contract checks cover each agent's two newest versions**, the deployed one and the one a rollback goes back to,
   for every declared handoff (a source's `mayRequest` and a target that consents). The producer's evidence is its
   **producer samples**: `suggestedHandoffs` entries with `inputs` in any JSON under its entry's `samples/`
   (`samples/handoffs/*.json` by convention), each validated against the consumer's input schema; a declared handoff
   without one fails. Consent and classification are checked as the router decides them.
6. **The deterministic checks run in `wardens-deploy` CI** (`wardens registry check`, with a pinned `wardens`): the
   entries, the contracts, the config with the framework's own loaders, `mcp/` regenerated and compared, and the
   routing cases against the registry. The routing evals against the real model stay a manual run
   (`wardens registry routing-eval`): they cost model calls and need a gateway key, and the threshold is a reviewed
   change to `config/routing.yaml`.
7. **Transition:** `config_path` uses `$WARDENS_CONFIG_DIR/<name>` when the file is there and the packaged copy
   otherwise, until plan phase 5 step 7 removes the agent-naming files from the wheel. Until phase 5 step 6 mounts
   `wardens-deploy` into the pods, the packaged copies are what runs, so a change to one of those files is made in both
   places; the monorepo's `deploy/mcp/` stays generated and checked until the agents leave (phase 8 step 4).
8. **The `registry` job runs the `wardens` that `wardens-deploy` pins**, not the agent's: the job holds a write
   credential to `wardens-deploy`, so the publishing code is the version that repository's CI checks with, and the agent
   repository is read as data (YAML and JSON; no agent code runs).

#### Considered options

- **Fall back to the newest entry silently, or refuse an unknown version.** Silent hides a missing publish; refusing
  stops every agent until it has its own repository. Logged fallback, with the version's own entry when there is one.
- **Contract checks for every version in the registry.** The list only grows, and versions nothing can run any more
  would fail checks for nothing. Two covers the deployed version and its rollback (0040 rule 3's "current and previous").
- **Derive producer samples from the agents' code or eval outputs.** The registry holds no code, and eval outputs are
  not always present; a sample in the entry is what the consumer can see and check.
- **Treat a missing risk check as "not risk-raising".** Turned down: the gate must fail closed.

#### Consequences

- Each agent with a handoff keeps a producer sample next to its code; check-agent already checks its suggestions are
  in `mayRequest`.
- A risk-raising entry waits for a pull request merge, with the approval record of phase 5 step 4.
- Until phase 5 step 6, wardens-deploy is checked and published to but not yet what the pods read.

#### Related

- **Relates to:** [0040](#adr-0040) (repo per agent: rules 4, 5, 8 and

#### Note (2026-11-19): how the pods read this repository (phase 5 step 6, first for incident-triage)

Owner decision of 2026-11-19: Argo CD reads the private `wardens-deploy` with **its own read-only SSH deploy key**, the
pattern it already uses for homelab-gitops (recorded in homelab-gitops ADR 0038's note of 2026-11-19; infra-local
`host/argocd/deploy-key.sh --repo --kv` and the ExternalSecret `repo-wardens-deploy`). Not the `gitops-writer` App
(it can write), not a new read-only App (more to run for one repository).

The plan's kustomization became a **Helm chart at the repository root**: kustomize's `configMapGenerator` names every
file, so each `wardens registry publish` would have to edit it, while Helm's `.Files.Glob` reads `registry/` at render
time. It renders `wardens-registry-<agent>` (keys `<version>__<path>`) and `wardens-config`, at sync wave -1, as a
second source of each consuming Argo CD app; homelab-gitops `charts/wardens-agent` 0.1.7 copies the keys back to a tree
in an init container and sets `WARDENS_REGISTRY_DIR` and `WARDENS_CONFIG_DIR`. A pod reads the registry as it was when
it started; a new version of an agent comes with a new image, which restarts it.

#### Note (2026-11-20): the wheel stops carrying the deploy config (phase 5 step 7, wardens 0.6.0)

Rule 7's transition is over. The six `DEPLOY_FILES` are gone from `wardens/config/defaults/`; `config_path` refuses
one (`DeployConfigMissing`) unless its per-file variable or `$WARDENS_CONFIG_DIR` gives it, and `WorkerSettings`
refuses to start without `WARDENS_CONFIG_DIR`. Every loader reads the path at call time. Choices:

- **No fallback, not even to an empty map.** The ownership map and the redaction labels decide guardrail handoffs and
  what reaches telemetry, so a worker without them doesn't run (it would otherwise fail at its first guarded call, or,
  where a stage catches the error, take its fallback silently).
- **Test copies, not the wheel, for tests and evals.** platform-wardens' tests read `framework/tests/fixtures/config/`
  (a frozen copy of wardens-deploy `config/`). An agent repository gets template-owned copies of the three files a
  binding and its tests read (`ownership.yaml`, `redaction.yaml`, `entry-points.yaml`) in `tests/fixtures/config/`, a
  template-owned `tests/conftest.py` and a Makefile export that point `WARDENS_CONFIG_DIR` there unless set, and
  homelab-gitops agent-ci sets the same directory for `wardens eval run`. `evals-nightly.yaml` reads wardens-deploy's
  own `config/`. The agent copies change only with a template release; a real ownership or redaction change is made in
  wardens-deploy, and the copies follow when they matter to a test.

#### Note (2026-11-20): the router and console (phase 5 step 6 for the services)

The router and every pod on the console image (console, alerts, hooks, ingress consumer, Slack relay, chat egress and
the redeliver and membership jobs) read the registry and config the same way (homelab-gitops #363: wardens-deploy's
chart as a second source of `wardens-router` and `wardens-console` with no `agents` filter, `charts/wardens-web` 0.8.0's
`registry.configMaps` and `config.configMap` and its `wardens-web.deploy.*` helpers for the console's other pods). Their
images hold no registry any more, and `deploy/registry-moved/` and its `registry-required` check are gone. Two choices:

- **The services list every agent by name** (`registry.configMaps` in both apps), since a pod mounts a ConfigMap by
  name and nothing at render time sees what wardens-deploy holds. Not one combined ConfigMap of every agent: the 1 MiB
  limit would then cover every version of every agent. A new agent is added to both lists, as its own worker app is;
  `services/tests/test_service_registry_mounts.py` (pr.yaml, with checkouts of both repositories) fails when the lists
  differ, miss a deployed worker or a published agent, or name one wardens-deploy doesn't render (its pods couldn't start).
- **They read the registry once, at start**, like the agents. Unlike an agent, the router doesn't restart when an agent
  publishes a new version: until its next rollout (any image or values change, or `kubectl rollout restart`), a worker
  reporting that version is checked against the newest entry the router holds (`Registry.entry_for`), logged as a
  fallback. Not a sidecar that keeps copying and a router that reloads: more code for a case a rollout covers.

#### Note (2026-11-20): owner decision A2a, agent CI tests against the template's copies of the deploy config

Owner decision of 2026-11-20 (A2a), confirming the step 7 note above: an agent repository's CI (homelab-gitops
`agent-ci.yaml`, its tests and the eval gate) reads the template's test copies of `ownership.yaml` and
`redaction.yaml` in `tests/fixtures/config/`, not wardens-deploy's real `config/`. The nightly evals
(`evals-nightly.yaml`, decision [0046](#adr-0046)) read
the real config. So a pull request's verdict doesn't depend on another repository's state, and an ownership or
redaction change in wardens-deploy shows in an agent's results the next night, not in its pull requests; when a
change matters to a test, the template's copies follow in a template release.

#### Note (2026-11-20): the router and every pod follow newly published entries without a restart

Owner decision of 2026-11-20 (B5) reverses the second choice of the note above ("they read the registry once, at
start"). A pod now picks up a newly published entry within about two minutes of wardens-deploy's sync:

- **The ConfigMaps stay flat and are still copied into a tree**, because the keys (`<version>__<path>`) are only known
  when wardens-deploy's chart renders them, so the pod specs in homelab-gitops can't map them to paths with projected
  `items`, and the framework reads `<agent>/<version>/…`. The copy now writes each new tree beside the old one in the
  emptyDir and swaps a `current` symlink, which `WARDENS_REGISTRY_DIR` names; the init container makes the first tree
  before the app starts, and a native sidecar on the same image (`restartPolicy: Always`) copies again whenever the
  ConfigMap volumes change (kubelet updates them in about a minute; never mounted with `subPath`, which doesn't
  update). A reader sees the old tree or the new one, never a mix; the sidecar keeps the previous tree, so a reader
  still walking it isn't cut short. It runs in the router, every console pod (`charts/wardens-web`) and every agent
  worker (`charts/wardens-agent`), with no new image or wheel: the copy is the charts' inline Python.
- **The services reload cheaply**: the console, webhooks, ingress consumer and classifier already re-read the registry
  on every request; the router's incident and thread activities hold a `wardens.runtime.LiveRegistry`, which checks a
  fingerprint of the directory every `WARDENS_REGISTRY_RELOAD_SECONDS` (default 30), swaps a new registry in whole,
  logs the versions added and removed, and keeps the one read before when the new one can't be read, holds no agent or
  has a manifest newly failing the schema. An agent's worker reads its cell's manifests at each budget check, so the
  agents need no new wardens release; the router and console images build from platform-wardens `main`.

## ADR-0043: Owner decisions of 2026-11-19: check-agent rule changes are breaking, the nightly evals read the state store, and four interim choices kept
{: #adr-0043 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-19 · `platform-wardens`</span>

#### Context

Six choices were made as interim values while the repo-per-agent plan ran, each waiting for the owner:

1. whether the agent template ships the minimal eval harness by default (phase 4 step 6);
2. a gap in the release rule, found when `warden-ci-check` moved from wardens 0.2.0 to 0.3.0: 0.3.0's check-agent rule
   `doc-set` failed the agent until its manifest named `docs.readme`, `docs.changelog` and `docs.claudeMd`, fixed by
   hand (warden-ci-check #2). `wardens release check` classified schema changes, but not a new or stricter check-agent
   FAIL rule, so a minor release could break every agent's CI;
3. what the router does with an agent whose measured framework version it can't place (phase 4 step 8);
4. the `chat` entry point's limits (phase 3 step 18);
5. whether the nightly eval run may read the state store (phase 3 step 14), without which its reports say production
   feedback and judge calibration were "not checked";
6. the judge settings (phase 3 step 14).

#### Decision

1. **The template ships the minimal eval harness by default.** The copier question `eval_harness` stays default yes;
   `wardens new-agent --no-eval-harness` leaves it out. Without a harness agent-ci's eval gate passes a new agent with
   "no harness" and its first real cases have nothing to run on.
2. **A release that adds or tightens a check-agent FAIL rule that existing agents would fail is breaking**, like a
   contract step: it is named under **Breaking** in `framework/CHANGELOG.md` with its migration, and it ships only in a
   major version (rule 2: every schema tightening is a major, and so is this). `wardens bump` applies the fix in each
   agent's bump pull request, so an agent's CI doesn't fail by surprise after the bump:
   - `wardens release check` runs this checkout's check-agent rules on the agent folders as they were at the last final
     release (`agents/` at its `wardens-v*` tag; each passed check-agent then). A rule they now fail is listed and fails
     the check unless the `Unreleased` (or current) section names it (`` `doc-set` ``) under `### Breaking` with its
     migration: a bump migration for that rule released after the baseline, or the fix described in the entry with the
     word "migration" (for a fix that `copier update` brings). Once the version moves, it must be a major over the last
     release. `--no-rules` skips it (`wardens.release._rules`). Since 2026-11-20 (the agents left `agents/` in #294,
     so a later tag holds none) the baseline's agents are its agent template rendered fresh and every `warden-<agent>`
     main that pins it or newer (`--agent-repos`); no agent to run the rules on fails the check.
   - `wardens bump` applies every **bump migration** (`wardens.release._migrations.MIGRATIONS`: the release, the rule,
     a summary and a pure fix over the repository's files) whose release is after the agent's pin and at or before the
     target, after `copier update` and the pins; the pull request lists each one. The one known case is in:
     `0.3.0` / `doc-set` names README.md, CHANGELOG.md and CLAUDE.md in the manifest's `docs` and adds their rows to
     the agent card (what warden-ci-check #2 did by hand); a missing file is left to a person, with a note.
   - Limit: the baseline is the monorepo's agents. When the agents have left for their own repositories (phase 8), the
     check needs another baseline (the template rendered at the last release); until then the template-made repos are
     covered because their rules are the same as the monorepo agents'.
3. **The router routes an agent whose version it can't place, and alerts** (the current behaviour, kept): a worker
   newer than the router (`ahead`) is routed and `WardensAgentFrameworkVersionAhead` (P3) fires after an hour; an agent
   with no live worker (`absent`) or a reading that failed (`unknown`) is routed as before (the task waits on its
   queue), and `WardensAgentFrameworkVersionAbsent` / `WardensAgentFrameworkVersionUnknown` (P3, added with this
   decision in homelab-gitops) fire when it lasts 30 minutes. A worker without a wardens build id counts as 0.2.0.
   Refusing instead would stop an agent's tasks for a router-side reading problem; the alerts make it visible.
4. **The `chat` entry point keeps its limits for now:** level 0 by default (at most level 1 with a person's role), 0.25
   USD per request or follow-up, a 30-minute deadline and a hop budget of 1 (`entry-points.yaml`). They are accepted
   interim values. **Revisit** after real use: once team chat's thread workflow (team-chat C6) has run for 30 days, or
   sooner when a chat task hits one of these limits (`WardensAgentHittingLimits`, the run records' stop reasons).
5. **The nightly eval run reads the state store**, as its own read-only role: `wardens_eval` (migration 0015) may
   `SELECT` `run_verdicts` and `judge_samples` and nothing else. The console's role, the only one that could read them
   before, also writes kill switches, verdicts, samples, memory reviews, holds, chat links and approvals, which a CI job
   running agent code must not hold. The DSN reaches CI from OpenBao (`kv/ci/wardens-evals`, `state_dsn`) through a
   GitHub OIDC role, `wardens-evals`, bound to `evals-nightly.yaml` at `refs/heads/main` on a self-hosted runner; never
   a GitHub secret. `evals-nightly.yaml` reads it when the repository variable `WARDENS_EVALS_STATE_DB` is `true`, and
   revokes the OpenBao token before the agent's code runs. A live `--judge` run as `wardens_eval` reads calibration but
   can't set samples aside (an insert): judging in the nightly run is a later choice. The database is a ClusterIP in
   the `wardens` cluster and the ARC runner pod is on `platform`, so it is not reachable yet: how to reach it is a
   separate owner choice (the plan's phase 3 step 14 item lists the options); nothing is opened by this decision.
   **Amended 2026-11-19 by [0044](#adr-0044):** the owner chose option
   (d). The nightly run reads the verdicts from the console's read-only endpoint (`GET /api/evals/feedback`) with a
   GitHub OIDC token, and the console reads them as `wardens_eval`; the OpenBao role `wardens-evals` and
   `kv/ci/wardens-evals` are gone.
6. **The judge settings stay:** terraform-drift's judge is `gemma-4-26b-a4b` (Google's Gemma, another family than the
   agents' Qwen, on the homelab LiteLLM at no cost), declared for `intentResolution` and `narrativeQuality` with no
   threshold; a judged measure counts only while at least 80 % of at least 10 people-scored samples in 30 days agree
   with the judge within one point (`evaluation.judges`, per agent).
7. **Turning team chat on is not risk-raising by itself** (added 2026-11-19, a later owner decision the same day, given
   in chat). `wardens registry diff --risk` drops the rule `chat_enabled` (`interaction.chat.enabled` turning true, or
   a new chat `tools` entry), so such an entry needs no approval record. Reason: a chat `ask` is read-only and level 0:
   the framework caps the level at 0, refuses every tool that isn't `kind: read` (`ask_read_only`) and enforces the
   budget, the kill switch and holds; and the owner has no second reviewer account, so every agent that turned chat
   on waited on an approval nobody could give (terraform-drift 0.2.1, wardens-deploy #8, failed CI with
   `approval_missing` only for this). The rules that raise real risk stay exactly as they were: `chat_act_capability`
   (`acceptsChat` on an agent with act actions), `chat_level1_confirm` (`interaction.confirmFromChat`), and every
   other rule, including `budget_raised` and `limits_relaxed` on the chat budget and turns of an agent that already
   had chat on. Shipped in wardens 0.5.1; wardens-deploy CI checks with its pinned `tools/` version, so it takes effect
   there when that pin moves.

#### Considered options

- **Release rules: a static rule-set diff** (rule ids added since the tag). Turned down: a new rule every agent passes
  isn't breaking, and a stricter old rule keeps its id. Running the rules on the last release's agents finds exactly
  what the owner's rule names: what existing agents would fail.
- **Release rules: only print the fix in the CHANGELOG** (the person applies it). Turned down by the owner: six repos
  bump at once in phase 8, and each would fail its CI first.
- **Nightly state access as the console's role.** Works, but hands a CI job running agent code the console's writes.
- **A new read-only role later, the console's now.** Turned down: the role is one migration and one Job, and the
  network isn't there yet anyway.

#### Consequences

- A minor release can no longer carry a check-agent rule that the last release's agents fail; such a change waits for
  the next major (or is made a WARN first, then a FAIL in the major).
- Each such rule change comes with a bump migration or a template change, written in the same PR.
- homelab-gitops creates `wardens_eval` in the `wardens-state-roles` job (its password in OpenBao
  `kv/wardens/wardens-state-db` `eval_password`) before the schema job applies migration 0015. (infra-local's
  `configure-ci.sh` added the role `wardens-evals`, its policy and the `kv/ci/wardens-evals` copy; removed again with
  decision 0044.)
- The `chat` limits and the judge settings are no longer listed as waiting on the owner; the `chat` limits have a
  revisit trigger.

#### Related

- **Status note:** decision 5's way in amended by [0044](#adr-0044)
- **Decided by:** the owner, 2026-11-19 (six pending items in the workspace's PENDING.md and the plan's "Waiting on the
- **Relates to:** [0040](#adr-0040) (rules 2, 3, 4, 6 and 16),

## ADR-0044: The nightly evals read production feedback through a read-only console endpoint, not from Postgres
{: #adr-0044 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-19 · `platform-wardens`</span>

#### Context

Decision 0043 decision 5 let the nightly eval run (`evals-nightly.yaml`) read people's verdicts on runs, as its own
read-only role `wardens_eval`, with a DSN from OpenBao. It could not work yet: wardens-state-db is a ClusterIP in the
`wardens` cluster and the ARC runner pod that runs the job is on `platform`. The owner was offered four ways in:

- (a) a Traefik TCP route on the `wardens` load balancer's 443 with TLS and SNI to Postgres;
- (b) a 5432 port on the k3d load balancer (a changed k3d config recreates the cluster);
- (c) run the nightly job inside `wardens` (a runner scale set there, or a CronJob);
- (d) a read-only endpoint on the operator console, which is already served over HTTPS, that CI calls instead.

#### Decision

**(d), chosen by the owner on 2026-11-19.** No database port is opened and CI holds no database credential.

1. **The endpoint.** `GET /api/evals/feedback?agent=<name>&limit=<1..500>&after=<runId>` on the console
   (`wardens_services.console.routes.eval_feedback`) answers a page of one agent's verdicts with only what the eval
   report counts: run id, lifecycle stage, verdict, state and accepted case id, in run id order, with `next` when there
   is more. Corrections, candidate cases and people's names never leave the console here; the strings it does serve
   go through `redact_text`.
2. **Least privilege on the database.** The console reads that page on its own connection as `wardens_eval`
   (`WARDENS_EVAL_STATE_DSN`, migration 0015: `SELECT` on `run_verdicts` and `judge_samples`, nothing else), never as
   its own role `wardens_console`, which also writes kill switches, verdicts and approvals. A bug in the route can't
   write or read anything else. The `wardens_eval` role stays; only who holds its password changes (the console's
   pod, from OpenBao `kv/wardens/wardens-state-db` `eval_password`, through an ExternalSecret).
3. **A machine identity with no stored secret.** The job sends a GitHub Actions OIDC token, minted when the run reads
   the feedback (audience `wardens-console-evals`). The console checks GitHub's signature against its JWKS, the issuer,
   the audience, expiry, and the claims: `job_workflow_ref` is
   `cloudutsukpilot/platform-wardens/.github/workflows/evals-nightly.yaml@refs/heads/main`, `ref` is
   `refs/heads/main`, `runner_environment` is `self-hosted`, and `repository_owner_id` is the org's numeric id (the
   same binding as the OpenBao CI roles). Anything else is a 401; an unconfigured console refuses every token (503).
   A Keycloak client-credentials client was not used: it needs a client secret stored in GitHub.
4. **The sign-in proxy lets only this path through.** The oauth2-proxy sidecar skips its session check for
   `GET ^/api/evals/feedback$` (homelab-gitops `charts/wardens-web` `auth.skipAuthRoutes`, ADR 0113); the console
   answers that path before it reads the proxy's user or groups headers, so a browser's headers count for nothing
   there and every other route still needs a Keycloak session. The runner calls the internal name
   `console.wardens.home.cloudutsuk.com` (the `wardens` load balancer), not the public name behind Cloudflare Access.
5. **The switch stays `WARDENS_EVALS_STATE_DB`.** With it `true` (on `main`), `evals-nightly.yaml` sets
   `WARDENS_EVAL_FEEDBACK_URL` and `WARDENS_EVAL_FEEDBACK_AUDIENCE`, and `wardens.eval.load_feedback` reads through
   `wardens.eval.ConsoleFeedback` (every page, at most 20,000 verdicts per agent); any failure is "not checked" with
   its reason, as before. A person's run by hand with `WARDENS_STATE_DSN` (the console's role) still reads Postgres.
6. **Removed:** the job's OpenBao sign-in and DSN steps, the OpenBao role `wardens-evals`, its policy
   `ci-wardens-evals` and the `kv/ci/wardens-evals` DSN (infra-local `host/openbao/configure-ci.sh`,
   `WARDENS_EVALS_DB_HOST`): nothing reads them any more.
7. **Judge calibration is not served.** The nightly run doesn't pass `--judge`; judging in the nightly run stays a
   later choice (decision 0043), and would add its own page of `judge_samples` the same way.

#### Considered options

- **(a) and (b):** open a Postgres port beyond the cluster for one nightly read, and hand CI a database password; (b)
  also recreates the cluster.
- **(c):** keeps the database internal, but needs a second runner scale set (or a CronJob that can't post a GitHub job
  summary) in `wardens`, which runs agents, not CI.
- **The console's existing feedback API** (`/api/feedback/<agent>`): it needs a person's Keycloak session and the
  editor role, and serves corrections and candidate cases the eval report doesn't use.
- **A Keycloak client-credentials client:** a long-lived client secret in GitHub, and the console's proxy would need a
  service account in a console group, which would give it a person's role on every route.

#### Consequences

- The nightly feedback depends on the console being up; when it isn't, the report says "not checked" (promotion
  blocked, the gate unchanged).
- The console fetches GitHub's JWKS over HTTPS (its egress already allows 443) and caches the keys.
- A new machine caller of the console needs its own route and its own token check; this route is not a general API.

#### Related

- **Decided by:** the owner, 2026-11-19 (option (d) of the network choice decision 0043 decision 5 left open)
- **Amends:** [0043](#adr-0043) decision 5
- **Relates to:** plan repo-per-agent phase 3 step 14. homelab-gitops ADR 0113 (the

## ADR-0045: The release job tags with a GitHub App token and finishes a release idempotently
{: #adr-0045 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-19 · `platform-wardens`</span>

#### Context

The wardens 0.5.0 release run (44550983192, three attempts) built and signed `wardens-py:0.5.0`. Then its
"Tag and GitHub release" step failed each time with `HTTP 403: Resource not accessible by integration` from
`gh release create --target <sha>`, with `GITHUB_TOKEN` and `contents: write`. The owner created the tag and release by
hand, and the job's bump never ran.

The cause, from the evidence: GitHub refuses a ref (here a new tag) on a commit whose `.github/workflows` differ from
what the repository already has unless the token has the `workflows` permission, which `GITHUB_TOKEN` never has
(the same check that refuses a push of a workflow change; community reports describe it for tags on older commits).
Main moved from the release commit 316deb7 to ca68c23 (#288, which changes two workflows) at 15:07:23Z, and the
first release attempt started at 15:09:38Z. Every earlier release (0.2.0, 0.3.0, 0.4.0rc1, 0.4.0) ran while main was
still at its release commit or at a commit with the same workflows, and all of them passed, even though their ranges
since the last tag changed (0.2.0 to 0.3.0) and added (`pr.yaml`) workflow files. So it isn't the range since the last
tag (the first guess, deletions in wardens-v0.4.0..316deb7), but the tagged commit's workflows against main's at the
time. It needs only a workflow change merged in the minutes between a release merge and its release job.

Two more gaps: a re-run or a dispatch after the tag existed did nothing (`wardens release plan --dispatch` treated an
existing tag as "nothing to release", so the bump never ran), and a dispatch from a later main would have tagged that
later commit and rebuilt the image from it, whose version tag already names another build (refused, ADR 0105).

#### Decision

1. **A GitHub App token for the tag and release.** A new App, `cloudutsuk-wardens-release` (contents and workflows
   write, metadata read, no webhook), installed on platform-wardens only, key in OpenBao `kv/ci/wardens-release`,
   read with role `wardens-release` (bound like `wardens-bump` to `wardens-py.yaml` at `refs/heads/main` on a
   self-hosted runner; infra-local `host/openbao/configure-ci.sh`, `host/github/manifests/wardens-release.json`). The
   job mints a token for this repository only, with contents and workflows write, when the repository variable
   `WARDENS_RELEASE_APP` is `true`; otherwise it uses `GITHUB_TOKEN`, and a 403 prints the cause and the exact
   commands. No existing App fits: the bump App is installed on the `warden-*` repositories only, and the Apps
   installed everywhere (terraform-drift's, the targets refresh) belong to other jobs and have no workflows
   permission, which the tag check needs. The App never changes a workflow; workflows write is there only for the tag.
2. **Tag and document the release commit.** `wardens release plan` returns `commit`: the tag's commit when the tag
   exists, else the oldest first-parent commit of the newest run that has the version. The release job checks out
   that commit (CHANGELOG, `pdoc`) and creates the tag there, never at a later HEAD. The image is built only when the
   release commit is the run's own; otherwise the release uses the digest of `wardens-py:<version>` from Zot, and
   fails with what to re-run if there is none.
3. **Idempotent.** A tag that exists at the release commit is kept (at another commit: fail, a tag never moves); a
   release that exists gets only what it lacks (the API reference); then the bump runs. `wardens release plan
   --dispatch` returns `finish=true` (with `release=false`) for the newest version whose tag exists, so a dispatch on
   main finishes a release whose bump didn't run; the release and bump jobs run on `finish`. A push still releases
   only when the version moves, and a dispatch for an older version than the newest tag finishes nothing.

#### Consequences

- Until the owner creates the App and sets the variable, a release whose window contains a workflow change still
  fails at the tag; the owner tags by hand (the error prints the command) and dispatches the workflow, which finishes
  the rest. After that, no hand-made tag.
- The App can push to any branch of platform-wardens, workflow files included. Its key is readable only by
  `wardens-py.yaml` on main, and the token is narrowed to this repository and revoked at the end of the job.
- wardens 0.5.0's release lacked its API reference; it was added by hand from the release commit (the same `pdoc`
  command, `uv.lock` at 316deb7).

#### Related

- **Status note:** (the App is waiting for the owner; until then the job uses `GITHUB_TOKEN` and says what to do)
- **Decided by:** Claude, for the owner's request after wardens 0.5.0 ("fix the release job, so a release doesn't need a
- **Amends:** plan repo-per-agent phase 4 step 2 (how `wardens-py.yaml` creates the tag
- **Relates to:** [0040](#adr-0040) rule 6 (bumps), homelab-gitops ADR 0105

## ADR-0046: The nightly evals run every agent repository from platform-wardens' `evals-nightly.yaml`
{: #adr-0046 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-20 · `platform-wardens`</span>

#### Context

`evals-nightly.yaml` ran every agent folder under `agents/` live through LiteLLM each night, sent the eval gauges to
Mimir (`WardensEvalSafetyFailure`, `BelowThreshold`, `Regression` and `Stale` alert on them) and read production
feedback from the console (decision 0044). Phase 8 moved every agent to its own `warden-<agent>` repository, and #294
removed the last folder, so the job found no agents: green every night, and no agent had a nightly result. Each
agent's pull requests still run the deterministic tiers (test and recorded models) in homelab-gitops `agent-ci.yaml`;
only the live nightly tier had no home.

Two homes were possible:

- **(a)** a reusable nightly workflow in homelab-gitops that each agent repository calls on its own schedule (the
  agent-ci pattern), with a caller file in the copier template;
- **(b)** platform-wardens' own `evals-nightly.yaml` checking out each agent repository and running its set with the
  wardens wheel that repository pins.

#### Decision

**(b).** `evals-nightly.yaml` stays the one nightly eval run and goes over the agent repositories:

1. **Which agents:** the directories of wardens-deploy `registry/` (every agent with a published entry, the list the
   release job's bump uses), else a static list in the workflow. A new agent is in the nightly run once agent-ci has
   published its first entry; nothing in its repository has to change.
2. **Each agent as its repository's `main` and its own pin:** the job checks out `cloudutsukpilot/warden-<agent>` with
   `REPO_READ_TOKEN`, fetches and verifies the wheel image its Dockerfile pins (homelab-gitops `wardens-wheel`, OpenBao
   role `pr`, Zot pull only, the OpenBao token revoked before any agent code runs), `uv sync --frozen`, and runs
   `wardens eval run .` there, live on the schedule and on `repository_dispatch litellm-models-changed`, recorded on a
   dispatch by hand. The eval set, harness and thresholds are the agent's own, at the version of wardens it ships with.
3. **Nothing in decision 0044's trust changes:** the OIDC token the console checks is still minted by
   `platform-wardens/.github/workflows/evals-nightly.yaml@refs/heads/main`, so the console's
   `WARDENS_EVAL_READER_WORKFLOW`, its egress and the sign-in proxy's skip route stay as they are, and the live runs
   keep the one LiteLLM key (`WARDENS_EVAL_LITELLM_KEY`) with its own budget. No secret is copied into six
   repositories and no OpenBao role is added.
4. **One agent by hand:** `repository_dispatch` with event type `evals-run` and `client_payload` `{"agent": "<name>",
   "model": "recorded" | "live"}` runs one agent (the name must be in the list above). `workflow_dispatch` keeps no
   inputs (Checkov CKV_GHA_7).
5. **No artifacts:** the report goes to the job summary and the gauges to Mimir, as before; nothing is uploaded.

#### Considered options

- **(a) a reusable workflow per agent repository.** Each repository would own its schedule, but every one would need
  the LiteLLM key (six repository secrets, or an org secret every repository can read, or a new OpenBao role), and
  the console would have to accept a reusable workflow's token from six repositories and bind each repository to its
  own agent's verdicts: a console change, a redeploy and owner steps, for no gain in what is measured. Six schedules
  also spread the live load over the night instead of one queue on the ARC runners.
- **Running the agents' published images.** The images hold the agent and its wheel but not its eval set, harness
  dependencies or recordings in the layout `wardens eval run` reads, and they run as a worker, not a CLI.

#### Consequences

- The agent's `main` code runs in a job that holds `id-token: write`, as the agents' code did in the monorepo: it can
  mint this workflow's OIDC token, which only the console's feedback route and OpenBao role `pr` (Zot pull, any
  repository of the org) accept. A new OpenBao role bound to `evals-nightly.yaml` would widen that; bind any such role
  to another workflow.
- `REPO_READ_TOKEN` must be able to read every `warden-*` repository and wardens-deploy (a run says which it could
  not read, and that agent's job fails).
- An agent with no eval harness (cicd-triage, cluster-upgrade-readiness today) passes with "no harness yet" and sends
  no gauges, as before.

#### Related

- **Decided by:** the plan's owner session (the plan left the nightly run's home open after phase 8; no owner choice
- **Relates to:** plan repo-per-agent phase 3 step 14 ("Live-model runs") and phase 8;

#### Note (2026-11-20): owner decision A4a, the trust boundary stays as stated

Owner decision of 2026-11-20 (A4a): the nightly run keeps the trust boundary this decision states. Each agent
repository's `main` code runs in a job that holds `id-token: write` and the live LiteLLM key, as the agents' code did
in the monorepo; the owner accepted that rather than splitting the run into a job without the token (or one per
repository). What limits it stays as in the consequences above: the token is accepted only by the console's read-only
feedback route and OpenBao role `pr` (Zot pull), the OpenBao token is revoked before any agent code runs, and any new
OpenBao role must be bound to another workflow, never to `evals-nightly.yaml`. Revisit it if an agent repository gets a
writer outside the owner and the org's apps, or if a new role or route would accept this workflow's token.

## ADR-0047: terraform-drift merges its pull request, or runs a revert's apply, after a Slack approval (level 2)
{: #adr-0047 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-21 · `platform-wardens`</span>

#### Context

terraform-drift stops at level 1. For a change the code should take (codify, import, remove or restore a deleted
resource) it opens a draft pull request. For unauthorised drift it recommends a revert, which needs no code change:
the fix is re-running the stack's apply, which `run_stack_apply` (`granted: false`) leaves to a person. Then it sends
a Slack summary. Nobody is asked to approve anything, so a person has to find the PR, mark it ready and merge it, or
start the apply by hand. On 2026-11-21 the owner asked why the run on infra-azure `azure/development/homelab-velero`
(a hand-added `drift-test` tag, judged unauthorised drift, revert) opened no pull request and sent no approval
request.

Decision 0007 ships L0 and L1 only (`FRAMEWORK_MAX_LEVEL = 1`). It grants L2 per action after evidence floors
(at least 30 real cases, zero safety failures in the window) and a Promote gate. terraform-drift is in `shadow`.
The framework already has the L2 path: point 4 marks a level 2 action `needs-approval`, and the durable approval
wait sends an approval card, waits for the `approval` signal until it expires (expiry is a denial) and audits every
decision. Nothing uses it yet. Approving through Slack was ruled out in category 10 because a webhook can't tell
who clicked. Team chat (0041) has since built signed button presses and a Slack-user-to-Keycloak-principal link that
the console confirms.

#### Decision

1. **Merge on approval (L2).** terraform-drift gets two level 2 actions:
   - `merge_drift_pr`: its own pull request for codify, import, remove or restore is marked ready and squash-merged.
     The merge runs the stack's apply (terragrunt-cicd applies on `main`; on GitHub Free the "(Approval Required)" jobs
     are labels, not gates).
   - `apply_stack_revert`: for a revert, it dispatches terragrunt-cicd `apply` for that one stack on `main`.
   Before acting it checks again that the approval names exactly this action, that the PR's head SHA (or, for a
   revert, `main`'s SHA and the plan) is unchanged since the approval was requested, and that the kill switch is off.
   Any difference means nothing is merged or applied, and the run says why.
2. **Owner waiver of the evidence floors, development and qa only.** The framework ceiling goes to 2. terraform-drift
   may use the two L2 actions only on stacks whose environment is `development` or `qa`, for 30 days or 30 approved
   runs, whichever comes first. Then the 0007 floors and the Promote gate apply as written. Production, staging and
   every other environment stay L1: draft PR or recommendation, with no approval request. The waiver is recorded in
   the agent's manifest and in the eval report, not only here.
3. **Approve and Deny buttons in Slack, from linked users.** The approval card goes to the devops Slack channel with
   Approve and Deny buttons. A press counts only when it is a signed Slack request (as team chat checks today) and the
   Slack user has an active link to a Keycloak principal (decision 0041) in the action's approver groups. The approver
   is that principal, never a name in the request. Self-approval is allowed and recorded as `selfApproved`, because
   the owner is also the reviewer here. The card also links the console's /approvals page, which works without Slack.
4. **The card shows what will change, from the plan.** The approval card carries a plan summary, laid out like the
   GitHub summary of the drift scan run (the shared module's `platform_as_code.reporting.plan_summary`):
   - the stack and the counts line (`Plan: N to import, N to add, N to change, N to destroy`);
   - each resource with its action (`+` create, `~` update, `-` destroy, `-/+` replace, `<=` import);
   - for an update, the changed attributes before → after;
   - links to the scan run's summary and to the PR.
   Sensitive and unknown values show as `(sensitive)` and `(known after apply)`, never as values. The agent builds
   the summary from the `tfplan.json` it already reads. The summary's hash is part of what is approved, so an Approve
   press approves exactly the plan it showed. A revert's summary is the plan the apply will run: the same changes,
   reversed back to the code.
5. **The wait outlives the incident.** An approval waits up to 24 hours, which is longer than a drift incident's
   deadline (2 hours). The incident ends after the PR and the approval request. The approval and the act then run in
   their own durable workflow per proposed action, keyed by its idempotency key, which posts the result to the same
   Slack thread and the PR.

#### Considered options

- **PR and Slack message, the person merges (L1):** rejected by the owner. It keeps the clicks in GitHub.
- **Apply only for a revert:** rejected. PR fixes would still need a merge in GitHub.
- **Build now, enable after the floors:** rejected for development and qa. The waiver gets real approvals now, and
  production keeps the floors.
- **Console-only approval:** kept as the fallback link on the card. Slack buttons were chosen as the main path.

#### Consequences

- The framework's `FRAMEWORK_MAX_LEVEL` is 2. Point 4 still caps every action at its own manifest level and the
  task's ceiling, so no other agent changes until its manifest asks for level 2.
- The drift GitHub App needs `actions: write` (dispatching the apply) on top of `contents: write` and
  `pull_requests: write`. That is an owner step in the GitHub App settings, and each installation has to accept it.
- The manifest's `never` list stops saying "Merges ... a pull request" for its own drift PRs after an approval. It
  keeps "approves a pull request", "pushes to a default branch" and "edits a branch it did not create".
- The registry entry is risk-raising (new act tools, higher level), so wardens-deploy needs a signed approval for it
  (decision 0042).
- To watch: a merge whose apply fails. The run reports the apply's conclusion and never retries an apply by itself.

#### Related

- **Decided by:** the owner, 2026-11-21 (three choices: merge on approval; an owner waiver for development and qa
- **Relates to:** decisions [0007](#adr-0007) (autonomy levels), [0013](#adr-0013)

## ADR-0048: Registry approvals are requested by CI and committed when a reviewer approves
{: #adr-0048 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-22 · `platform-wardens`</span>

#### Context

A registry entry that raises risk over the agent's last one (decision 0040 rule 5) waits in a wardens-deploy pull
request until it has a signed `approval.json`. Until now a person made that record by hand: open the console's
Approvals page, paste the agent's current and new manifests, ask, approve (or self-approve as the owner), download
`approval.json` and commit it beside the entry. The owner asked (2026-11-22, on terraform-drift 0.3.0) that none of
that be manual: the manifests come from the publish itself, the console tells the reviewer a request is waiting, and
pressing Approve is the last step.

#### Decision

1. **CI asks.** The registry publish in homelab-gitops `agent-ci.yaml` (`wardens-registry-publish`), after it opens
   the pull request for a risk-raising entry, sends the agent's current entry (the highest version on wardens-deploy
   `main`, or none) and the new manifest to the console's machine route `POST /api/registry-approvals`, with a GitHub
   Actions OIDC token. The console checks the token (GitHub's issuer and keys, its own audience, the workflow
   `homelab-gitops/.github/workflows/agent-ci.yaml` at `refs/heads/main`, `refs/heads/main` of the caller, the
   organisation's id) and that the caller's repository is the agent's own (`cloudutsukpilot/warden-<name>`), then
   opens the request with `registry_request`, which computes the risk items itself. The requester is that workflow
   (`agent-ci:cloudutsukpilot/warden-<name>`), not a person, so any reviewer of the cell, the owner included, approves
   it the usual way: requester ≠ approver holds and no self-approval is needed. Asking again for the same entry hash
   returns the open or decided request (a re-run asks nothing new).
2. **The console tells the reviewer.** The Approvals page lists the pending requests, those the signed-in person may
   decide first ("Waiting for you"), and the console's header shows how many are waiting for them. A request links to
   its pull request.
3. **Approving is the last step.** A wardens-deploy workflow (`approvals-sync.yaml`, every five minutes and on demand)
   reads the approved registry requests from the console's machine route `GET /api/registry-approvals/decided` with
   its own OIDC token (audience, workflow `wardens-deploy/.github/workflows/approvals-sync.yaml` at `refs/heads/main`).
   For each with an open pull request `registry/<agent>/<version>` that has no `approval.json`, it writes the signed
   record beside the entry, runs `wardens registry verify-approval` and `wardens registry check` on the result, commits
   it to the pull request's branch and squash-merges the pull request. A record that does not verify is not committed,
   and the run fails with why. A rejection leaves the pull request open with the reviewer's comment on the console.
4. **Nothing is trusted more than before.** The signing key stays in the console. wardens-deploy's check still verifies
   every record against the entry's hash, so a record for a different entry than the one in the pull request fails.
   Neither machine route reads the sign-in proxy's headers; both answer 401 to a bad token and 503 when not
   configured, like the eval feedback route (decision 0044).

#### Consequences

- No copying manifests, downloading records or committing by hand; the reviewer's press is the only manual step, and a
  merge follows within about five minutes.
- The manual path (`/approvals`, paste, ask) stays for an entry published before this, or when CI can't reach the
  console.
- The sync merges to wardens-deploy `main` with that repository's own `GITHUB_TOKEN`; its commits start no other
  workflow, which is why the sync runs the checks itself before merging.
- Two more paths the sign-in proxy lets through without a session (homelab-gitops `wardens-web` `auth.skipAuthRoutes`).

#### Related

- **Amends:** [0040](#adr-0040) rule 5 (how the approval record is asked for
- **Plan:** registry-approval-requests

## ADR-0049: The console starts the approvals sync right after a registry approval
{: #adr-0049 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-11-24 · `platform-wardens`</span>

#### Context

Decision 0048 has wardens-deploy's `approvals-sync.yaml` commit an approved registry record and merge the entry's pull
request, on a `*/5` cron and on demand. GitHub starts scheduled workflows late and skips some under load: on
2026-11-23 terraform-drift 0.3.2's entry (wardens-deploy #23) was approved in the console and its pull request still
waited hours later, until the sync was dispatched by hand (merged 84763e4d). The reviewer's press was meant to be the
last step; a wait of hours, with the agent's deploy blocked behind it, breaks that.

Options considered:

1. **Dispatch from the console on approval** with its own small GitHub App (Actions write, wardens-deploy only).
2. **Reuse an existing App the console pods already hold** (the terraform-drift App, for the webhook and redelivery).
   Its key is the agent's identity, installed on every repository; using it for the console's own action would widen
   what that key does and blur the audit trail.
3. **A tighter cron or a polling loop elsewhere** (a CronJob in the cluster calling the API). Still needs a token with
   Actions write, adds a moving part, and only shortens the average wait.
4. **Keep dispatching by hand.** Puts a person back in the loop 0048 removed.

#### Decision

1. After a reviewer **approves** a registry request, the console sends `workflow_dispatch` (ref `main`) to
   `cloudutsukpilot/wardens-deploy` `.github/workflows/approvals-sync.yaml`. A rejection sends nothing: the sync
   only commits approved records. It is the registry kind's `OnDecided` hook
   (`wardens_services.approval_endpoint.registry_sync_hook`), run after the decision is stored.
2. **Best-effort.** The dispatch waits at most 15 seconds; any failure (no App configured, a refused token, GitHub
   unreachable) is logged as a warning and the approval stands. The cron stays as the fallback, so the worst case is
   what it was before.
3. **Its own identity.** A new GitHub App, `cloudutsuk-wardens-approvals-sync` (infra-local
   `host/github/manifests/wardens-approvals-sync.json`): Actions write and metadata read, no events, installed on
   wardens-deploy only. Its id, key and installation id live in OpenBao `kv/wardens/approvals-sync`; the console gets
   them through an ExternalSecret as `WARDENS_APPROVALS_SYNC_APP_ID`, `WARDENS_APPROVALS_SYNC_APP_PRIVATE_KEY` and
   `WARDENS_APPROVALS_SYNC_APP_INSTALLATION_ID`. Each token it mints is narrowed to `actions: write` on wardens-deploy.
   Unset, nothing is sent.
4. Nothing new is trusted: a dispatch only starts the same workflow at `main`, which reads the approved records with
   its own OIDC token and verifies each one before committing it (0048 point 4). Starting it when there is nothing
   to do costs one short run.

#### Consequences

- An approved entry merges within a few minutes of the press (the sync's own run time), not whenever GitHub runs the
  cron.
- One more App and secret to keep. The owner creates and installs it once (github-app-setup on the Spark).
- A burst of approvals starts several runs; the workflow's `concurrency` group runs them one after another and the
  later ones find nothing left to do.

#### Related

- **Amends:** [0048](#adr-0048) point 3 (when the sync
- **Plan:** approvals-sync-dispatch

{% endraw %}
<!-- adr:end -->

{% include project-nav.html %}
