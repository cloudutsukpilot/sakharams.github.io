---
layout: post
title: "Platform Wardens: Interview Questions"
date: 2026-11-09 00:30:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Interview Prep, Architecture]
description: "Interview answers about Platform Wardens as architect, developer, DevOps and SRE: durable agents, guardrails in code, evals, delivery and the gaps."
project: platform-wardens
project_interview: true
---

Every answer below is about Platform Wardens as it's built today on the homelab, drawn from the code and
the playbook, in four voices: architect, developer, DevOps and SRE. Pick a role in the "Answer as" bar,
read the answer, then follow its Deeper links to the section that backs it up. Where the honest answer is
"not measured yet", the answer says so, and that's usually the strongest thing to say in the room.

*Platform Wardens is a framework for operations agents that do the routine DevOps, SRE and DBA work up to
the decision, with every action gated in code, every run durable and recorded, and autonomy earned one
action at a time.*

<!-- more -->

{% include project-nav.html %}

{% include project-iq-roles.html %}

## Project Overview and Your Role
{: #project-overview-and-your-role }

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q1">
<summary>Walk me through a frontend or backend application you designed and built end to end.</summary>

<div class="iq-role" data-role="architect" markdown="1">

I'd talk about Platform Wardens, a framework for agents that do routine DevOps, SRE and DBA work up to
the point of decision. It's a backend system: there's no product UI, the "frontend" is a Slack message,
a draft pull request and a small operator console.

End to end, I took one agent, terraform-drift, all the way through: a daily schedule after the drift
scan, deterministic stages that read the plans, one model stage that writes the explanation, a handoff to
a second agent that says who changed the resource, one Slack message per incident, and a draft PR that
codifies the change. The framework grew underneath it: contracts, a registry from manifests, Temporal
workflows, guardrails at four points, a run record and a trace per incident.

The trade-off I'd name: building the framework around one real agent instead of designing it all first
meant a long "not yet" list per module, but every module that exists was needed by something running.

Deeper: [system diagram](/posts/projects/platform-wardens/05-technical-architecture/#system-context-and-component-architecture), [what pulled each piece in](/posts/projects/platform-wardens/09-implementation/#feature-development).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Concepts I'd walk through, each tied to the code:

- **Temporal workflow vs activity:** `workflow.py` is deterministic (no I/O, clock or model); `activities.py` does the I/O so each step retries on its own.
- **An `Activities` protocol** decouples the workflow from Temporal, so the same `run(task, acts)` runs in unit tests with fakes.
- **Pydantic AI** inside one stage: typed output, validation retries; a failure falls back to "unknown".
- **Manifest-driven registry:** the agent exists because its `manifest.yaml` validates.

The heart of drift's workflow is plain async Python:

```python
async def run(task: TaskContext, acts: Activities) -> RunOutcome:
    if await acts.kill_switch_engaged():
        return done(stopped="kill switch engaged")
    scope = await acts.resolve_scope(repository)
    if scope.out_of_scope:
        return done(stopped="out of scope: " + "; ".join(scope.out_of_scope))
    scan = await acts.select_run(repository, task.inputs.driftScanRunId, ...)
```

```bash
uv sync
uv run --directory agents/devops/terraform-drift pytest -q tests/unit
uv run python -m wardens.runtime.console --dev-server
```

The gotcha: `worker.py` must do no I/O at import, because Temporal's sandbox re-imports it.

</div>

<div class="iq-role" data-role="devops" markdown="1">

From the delivery side, an agent is an image and a values file:

- **Build:** one GitHub Actions workflow per image with path filters; on `main` it calls the platform's reusable build (Gitleaks, Semgrep, Trivy, Checkov, Hadolint, SBOM, Cosign), pushes a multi-arch image to the registry, and commits the digest to gitops.
- **Deploy:** Argo CD syncs `apps/<agent>/values.yaml` with a shared `wardens-agent` chart to the `wardens` k3d cluster.
- **Config and secrets:** env vars in values; secrets from OpenBao through External Secrets.

```yaml
wardens-agent:
  agent: terraform-drift
  image:
    digest: "sha256:…"          # written by CI on every main build
  env:
    WARDENS_LLM_PROVIDER: openai-compatible
    WARDENS_LLM_BASE_URL: https://<llm-gateway>/v1
  secretEnv:
    - {name: WARDENS_LLM_API_KEY, path: wardens/terraform-drift, property: litellm_api_key}
```

```bash
kubectl --context k3d-wardens -n terraform-drift get pods
kubectl --context k3d-wardens -n terraform-drift logs deploy/terraform-drift -f
argocd app get terraform-drift
```

The gap: there's no staging cluster; the shadow stage in production is the staging.

</div>

</details>

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q2">
<summary>What business problem did it solve, and how did you know it was working?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Operations work has the same shape in every domain: a signal, evidence from three systems, correlation
with what changed, a recommendation, a person's decision, a check. Only the decision really needs a
person. The goal is for agents to absorb everything up to that decision, at L0 (observe) and L1
(recommend) in v1, while people build and govern the agents.

How I know it's working is the honest part. The design defines six measures (coverage, toil absorbed,
quality, speed, cost, reuse) with a hard floor: zero safety failures. What I can show today is
qualitative: drift explains each drifted attribute and the Change Correlator says who changed it, in one
message, within seconds of the run starting.

> **TODO:** Baselines and targets aren't set: drift's why-an-agent and ROI documents are still templates.
> The first number to get is drift's time to outcome by hand versus with the agent.
{: .prompt-warning }

Deeper: [goals](/posts/projects/platform-wardens/01-vision-and-business-context/#goals-objectives-and-expected-outcomes), [measures](/posts/projects/platform-wardens/01-vision-and-business-context/#success-metrics-and-business-kpis).

</div>

</details>

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q3">
<summary>What was your role, and which architectural decisions did you own?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I'm the author and, on the homelab, every role at once: sponsor, framework owner and agent owner. The
standard requires an independent reviewer from a different team, so a second account reviews and is
named in every manifest; the registry refuses a manifest where owner and reviewer are the same.

The decisions I owned and would defend:

| Decision | Why |
|---|---|
| Three layers: Pydantic AI in a stage, Temporal for durability, `wardens` for rules | Each does one job; no framework's own loop to fight |
| Autonomy per action, enforced in code | A prompt is not a control |
| A2A-shaped contracts with `additionalProperties: false` | Unlisted fields and actions are impossible |
| One agent per capability | "What changed?" is built once |
| Rules-first routing, then a classifier, then a person | Predictable for known alerts |

I also reversed one: the framework went Pydantic AI, then Microsoft Agent Framework, then back.

Deeper: [ADR log](/posts/projects/platform-wardens/05-technical-architecture/#architectural-decision-records).

</div>

<div class="iq-role" data-role="developer" markdown="1">

As the developer I owned the framework's module boundaries and wrote the reference agent. The rules I
enforced in review, because they're what make the design work:

- **Only `wardens.durable` imports `temporalio`.** Agents call `define_workflow` and never see Temporal.
- **Only `wardens.llm` builds a model client.** One place for the provider, the cost limit and the tool guard.
- **Act tools are never in a model's tool set.** `GuardedToolset` passes declared read tools only.
- **Placeholders are refused.** A value in `<...>` is unset; `WorkerSettings` won't start with one.

```python
if tool["kind"] == "act" and caller == "llm":
    return ToolDecision(False, "act_from_llm",
        f"{name!r} is an act tool: only a deterministic stage may call it")
```

```bash
uv run --directory framework pytest -q tests/test_tool_calls.py
```

The gap I'd own: the import rules are enforced by review, not by a lint rule, so a careless PR could
break them.

</div>

<div class="iq-role" data-role="devops" markdown="1">

On the delivery side I owned the deployment standard: nothing deploys from the wardens repo. CI builds
and signs, then commits a digest to gitops, and Argo CD deploys with one shared chart. That decision is
recorded as a platform ADR, along with the `wardens` cluster, self-hosted Temporal and an identity per
agent.

What that looks like per agent:

- A Kubernetes namespace, service account, NetworkPolicy, ExternalSecrets and a kill-switch ConfigMap, all from the chart.
- The service account federated to its own Entra app, so Azure calls need no stored secret.
- Its own GitHub App, with a read token set and an optional write set (`GITHUB_APP_WRITE=true`) for draft PRs.

```bash
kubectl --context k3d-wardens get ns | grep -E 'terraform-drift|change-correlator|stack-author'
kubectl --context k3d-wardens -n terraform-drift get externalsecret,networkpolicy,configmap
```

The gotcha: adding an agent still touches three repos by hand (wardens, gitops, the infra repo for its
Entra app).

</div>

</details>

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q4">
<summary>Who were the users and stakeholders, and how did their needs shape the design?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The users are people who already have too many tabs open, so the design meets them where they work:

| User | Needs | Design response |
|---|---|---|
| On-call engineer | What's wrong and what changed, before opening a terminal | One message per incident with the correlator's "who and when" |
| Infra owner | Drift explained, a ready fix | A draft PR on the stack's `resources.yaml` |
| Agent builder | Not re-solving routing, identity, retries, audit | A template and a framework API |
| Operator | Trust: what ran, cost, what was refused | Dashboards, run records, the kill switch |

The stakeholder need that shaped the most was trust: nobody accepts an agent acting on production because
it sounds confident. So autonomy is earned per action with evidence, a person presses every button that
changes something, and demotion needs no meeting.

Deeper: [personas](/posts/projects/platform-wardens/01-vision-and-business-context/#target-users-and-personas), [interaction patterns](/posts/projects/platform-wardens/04-user-experience-and-design/#interaction-patterns).

</div>

</details>

## System Design and Architecture
{: #system-design-and-architecture }

<details class="project-iq" markdown="1" id="system-design-and-architecture-q1">
<summary>If you had to design this application from scratch on a whiteboard, with a frontend, a backend and a data store, how would you approach it?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I'd reframe it first: the "frontend" is notifications and a console, the "backend" is workflows, and
the data store is a run-record store plus Temporal's history. On a whiteboard:

1. **Edges:** alerts, GitHub webhooks, schedules and a console become one thing: a root task with a correlation id, a requester and limits.
2. **Routing:** rules by capability, a classifier for the rest, a person below the threshold.
3. **Durable execution:** each agent is a workflow over stages; only investigation stages call a model.
4. **Guardrails** at submission, tool call, policy and action, in code.
5. **Records:** a run record, an audit chain, one trace per incident.
6. **Out:** one message per incident, a draft PR.

If the interviewer insists on the classic three tiers: a React SPA for findings and approvals, a FastAPI
service over Postgres, a queue for runs. I'd still put Temporal in the middle, because a run that waits
a day for an approval isn't a request.

Deeper: [architecture](/posts/projects/platform-wardens/05-technical-architecture/#system-context-and-component-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

I'd start from the contracts, because everything else is shaped by them:

- **Task** (capability, inputs, requester, `maxAutonomyLevel`, cost limit, `parentTaskId`).
- **Artifact** (a finding or a proposed action), referenced from tasks, never summarised.
- **Run record** written once at the end, linked by `correlationId`.
- **Manifest** per agent: capabilities, tools (read or act), schedules, action catalog.

Then the agent shape: a deterministic `run(task, acts)` over stages, with I/O behind an `Activities`
protocol so it can be tested without Temporal or a network.

```bash
ls contracts/schemas/          # task, message, artifact, finding, proposed-action, run-record, agent-manifest …
uv run --directory framework pytest -q tests/test_runtime.py
```

The gotcha on a whiteboard: it's tempting to let the model choose the next step. Here routing, retries,
approvals and policy checks are all code; the model only explains.

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q2">
<summary>What are the main components, and how are responsibilities split between them?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Three layers with one job each, and the `wardens` package split into ten modules:

| Component | Responsibility |
|---|---|
| `runtime` | Registry from manifests, root tasks, entry points, the console |
| `routing` | Capability routing: rules, classifier, person |
| `handoff` | Child tasks with hop budgets; limits only narrow |
| `durable` | Temporal workflows, incident workflow, approval wait, schedules |
| `guardrails` | Autonomy, approval policy, kill switch, audit |
| `llm` | Every model call, cost limits, guarded tools, MCP |
| `state`, `telemetry`, `notify`, `eval` | Stores, traces and run records, messages, scoring |

Agents own only their domain logic: stages, tools, policies. They import the public API of `wardens`
and nothing else. The split means a security reviewer can read `guardrails` once instead of every agent.

Deeper: [components](/posts/projects/platform-wardens/05-technical-architecture/#system-context-and-component-architecture), [agent anatomy](/posts/projects/platform-wardens/08-development-preparation/#project-structure).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Inside an agent, responsibility is split by what can be retried and what must be deterministic:

| File | Does | Must not |
|---|---|---|
| `workflow.py` | Orders the stages | Do I/O, read the clock, call a model |
| `activities.py` | The I/O, each a retryable activity | Decide the flow |
| `stages/` | Domain logic; prompts as `*.prompt.md` beside them | Call act tools from a model |
| `tools/` | Read and act tools, separate | Exceed the manifest's scope |
| `policies/` | Hard gates in code | Be loosened by a model |
| `entrypoint.py` | The only module touching contracts | Send an invalid record |

```python
from wardens.durable import ActivityOptions, AgentBinding, define_task_workflow, define_workflow
from wardens.notify import Notification, Section, Table
```

The gotcha: Temporal's sandbox re-imports `worker.py`, so the manifest is loaded in a passthrough module
and cached before any workflow runs.

</div>

<div class="iq-role" data-role="devops" markdown="1">

At runtime the components are separate deployments in the `wardens` cluster:

| Deployment | Namespace |
|---|---|
| Console, alerts relay, hooks relay, Event Hubs emulator, ingress consumer, router | `wardens-console` |
| Temporal and its Postgres | Temporal, `wardens-db` |
| The state store | `wardens-state-db` |
| One worker per agent | One namespace each |
| Web search MCP server with `mcp-guard` sidecar | `mcp-web-search` |

Each agent worker has its own task queue, so one slow agent can't starve another, and its own
NetworkPolicy and service account.

```bash
kubectl --context k3d-wardens get deploy -A | grep -v kube-system
kubectl --context k3d-wardens -n wardens-console get pods
```

The gap: everything runs as a single replica on one homelab host. The target plan's two replicas for
shared agents aren't there yet.

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q3">
<summary>Which non-functional requirements drove the architecture the most?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Safety first, then durability, then observability, in that order:

1. **Unlisted actions must be impossible.** That drove an empty action catalog by default, schemas with `additionalProperties: false`, act tools never callable by a model, and four guardrail points in code.
2. **Containment within 60 seconds.** A kill switch that fails closed, plus quarantine and identity revocation.
3. **Durability.** Runs wait hours for scans and days for approvals, which is why Temporal is in the middle rather than a queue.
4. **Observable by default.** Every run gets a run record and a trace; gates read that evidence.
5. **Cost as a limit.** A ceiling per run becomes token limits; workers refuse an unpriced model.

Throughput barely mattered: a few runs a day. Bursts matter more, which is what the event bus at the edge is for.

Deeper: [NFRs](/posts/projects/platform-wardens/02-requirements-gathering/#non-functional-requirements).

</div>

<div class="iq-role" data-role="sre" markdown="1">

From the operations side, the requirements I'd hold the system to are the ones I can alert on:

- **Golden signals per agent:** runs (traffic), failed runs (errors), run duration against its deadline (latency), task-queue backlog and pollers (saturation).
- **Containment:** the kill switch stops an agent within 60 seconds; it's a design limit, and I want it drilled.
- **Burst:** 1,000 alerts and 5,000 GitHub events, nothing lost, runs started within 5 minutes. That's a load-test target still to run.
- **Schedules:** a missed or paused schedule is an alert, because a drift run that silently doesn't happen looks like "no drift".

```bash
kubectl --context k3d-wardens -n wardens-console logs deploy/wardens-ingress --since=10m
# Temporal UI: workflows by status; Grafana: the workflow operations dashboard
```

The gap: none of these is an agreed SLO yet; they're design limits and alert thresholds.

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q4">
<summary>Which architectural options did you consider and reject, and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Several, and the log records them:

| Rejected | Why |
|---|---|
| Microsoft Agent Framework for every agent | Tried and reversed: Pydantic AI inside a stage plus Temporal gave typed output and durability without a framework loop to work around |
| Agents chatting in a group | Not allowed in production; at most two coordinating levels |
| A model choosing the next step | Routing, retries, approvals and policy checks are code |
| Guardrails in the prompt | Not a control; everything is code or permissions |
| Service Bus at the edges | Superseded: Event Hubs at the ingress edge, Temporal as the work queue |
| A message bus between agents | Temporal is the only transport inside; the bus is only at the edge |
| A per-team agent | One agent per capability, shared across domains |

The one I'd discuss longest is the order of preference: a function, then a workflow, then one agent,
then several. Most "agent" ideas fail at step one, and that's a good outcome.

Deeper: [ADR log](/posts/projects/platform-wardens/05-technical-architecture/#architectural-decision-records), [framework choice](/posts/projects/platform-wardens/05-technical-architecture/#technology-and-framework-selection).

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q5">
<summary>Monolith, modular monolith or microservices, what did you choose and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

A modular monolith for the framework, and a separate deployable per agent. The `wardens` package is one
Python package with ten modules and strict boundaries; agents are separate images, workers and task
queues.

Why not microservices for the framework: the modules share contracts and run inside the same worker
process; splitting routing or guardrails into services would add network hops and failure modes to every
tool call. Why not one monolith for agents: each needs its own identity, permissions, kill switch and
release cadence, and a slow or broken agent must not affect another.

The edges (relays, consumer, console, router) are small separate deployments, because they scale and fail
differently from workers.

Deeper: [hosting](/posts/projects/platform-wardens/05-technical-architecture/#hosting-and-deployment-model).

</div>

<div class="iq-role" data-role="developer" markdown="1">

In code it's one uv workspace: the `framework` package and each agent as a workspace member, one
`uv.lock`, one `.venv`. Agents depend on `wardens` by path, so a framework change is tested against every
agent in the same PR.

- **Module boundaries:** agents import only the public API; two modules own the risky dependencies (`durable` for Temporal, `llm` for models).
- **Why it stays a monolith:** guardrail point 2 runs inside the model call's tool loop; a network hop there would be a new failure mode on every call.

```toml
[tool.uv.workspace]
members = ["framework", "agents/devops/terraform-drift", "agents/devops/change-correlator", …]
```

```bash
uv sync --frozen
uv run --directory framework pytest -q
```

The gotcha: a new agent with a `pyproject.toml` must be added to `members` or it silently isn't part of
the workspace.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Deployment-wise each agent is its own service: its own image, built only when a file in it changes,
deployed by its own Argo CD Application with the shared chart.

- **Path filters:** the workflow triggers on `framework/**`, `contracts/**`, the agent's folder, `uv.lock`, and skips READMEs, changelogs and docs; prompts still count.
- **Images from the repo root,** because they need the workspace lock, `framework/` and `contracts/`.

```bash
docker buildx build -f agents/devops/terraform-drift/Dockerfile .
```

The trade-off: a framework change rebuilds every image that contains it. That's correct (every agent is
re-tested), but there's no canary: every worker takes the new framework at once.

</div>

</details>

## Technology Choices
{: #technology-choices }

<details class="project-iq" markdown="1" id="technology-choices-q1">
<summary>Which technologies did you use across the stack, and why those?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Layer | Choice | Why |
|---|---|---|
| Language | Python 3.12, uv workspace | The model and ops ecosystems are there |
| Model calls | Pydantic AI | Typed output with validation retries, provider from config |
| Durability | Temporal (self-hosted) | Runs that survive restarts, timers for approvals, schedules |
| Contracts | JSON Schema, A2A-shaped | Language-neutral, strict |
| Models | Local models via LiteLLM on the homelab | No provider path for data; cost tracked at Foundry prices |
| Telemetry | OpenTelemetry GenAI conventions | One trace per incident across processes |
| Tools | MCP behind a gateway and a guard | Shared tools with per-agent grants |
| Edge | Event Hubs emulator | Bursts absorbed; same API as Azure |
| Deploy | k3d, Argo CD, a shared Helm chart | The platform's standard |

Deeper: [technology selection](/posts/projects/platform-wardens/05-technical-architecture/#technology-and-framework-selection).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The concepts I'd show from the code:

- **Pydantic models everywhere:** inputs, model output, tool arguments; validation failure means retry or "unknown".
- **Pydantic AI `Agent` per stage** with a typed `output_type`, built only by `wardens.llm`.
- **Temporal Python SDK** behind `wardens.durable`: `define_workflow`, activities with `ActivityOptions`, signals for approvals.
- **`usage_limits`** turns the remaining budget into a token limit:

```python
price = prices.get(model)
if max(price) == 0:                 # a free (self-hosted) model
    return UsageLimits(request_limit=request_limit)
tokens = int(remaining_usd / max(price) * 1_000_000)   # every token at the dearer rate
return UsageLimits(request_limit=request_limit, total_tokens_limit=max(tokens, 1))
```

```bash
uv run --directory framework pytest -q tests/test_llm_limits.py
```

The gotcha: with no price configured, `usage_limits` only warns and the ceiling isn't enforced on that
call, which is why workers refuse an unpriced model at start.

</div>

<div class="iq-role" data-role="devops" markdown="1">

The delivery stack is the homelab platform's:

- **k3d** cluster `wardens`, created by Terragrunt in the infra repo.
- **Argo CD** in the platform cluster; **Helm** with one shared `wardens-agent` chart.
- **Zot** registry; **Cosign** signatures; **Kyverno** admitting digest-pinned images only.
- **OpenBao + External Secrets** for secrets; **cert-manager** for Let's Encrypt certificates.
- **Temporal** self-hosted on its own Postgres, UI behind Keycloak.
- **ARC runners** on the homelab for CI.

```bash
helm template charts/wardens-agent -f apps/terraform-drift/values.yaml | kubectl apply --dry-run=server -f -
kubectl --context k3d-wardens -n temporal get pods
```

The gap: the Event Hubs emulator is a development emulator running in production on the homelab; it's
fine for the volume, but its storage and checkpoints are fragile across restarts.

</div>

</details>

<details class="project-iq" markdown="1" id="technology-choices-q2">
<summary>How do you evaluate and choose between competing technologies?</summary>

<div class="iq-role" data-role="architect" markdown="1">

I write down what the choice has to do in this system, try the options against it, and record it as a
decision with the options considered. For the agent framework that meant: typed output with retries,
staying inside one stage, provider from configuration, and not owning orchestration.

The honest example is that I got it wrong once. Pydantic AI was chosen, then Microsoft Agent Framework,
then Pydantic AI again. The second choice looked better on paper (a fuller framework); in practice its
orchestration overlapped with Temporal's, and I'd be fighting two loops. Writing each step down as a
decision made the reversal cheap.

For a provider's own MCP server, the rule is an acceptance test: we use it only where it passes ours.

Deeper: [selection](/posts/projects/platform-wardens/05-technical-architecture/#technology-and-framework-selection), [vendors](/posts/projects/platform-wardens/17-governance-and-compliance/#vendor-and-third-party-management).

</div>

<div class="iq-role" data-role="developer" markdown="1">

As a developer I evaluate a library by writing the smallest real slice with it and its tests:

- **Does it keep typed boundaries?** Pydantic AI returns a validated model or retries; that decided it.
- **Can I test it offline?** Pydantic AI's `TestModel` and Temporal's local test environment both let the suites run with no network.
- **Can I pin and replay?** Temporal's replay of recorded histories is what makes changing workflow code safe.
- **Does it fit one place?** If a library would leak into every agent, it goes behind a framework module first.

```python
from pydantic_ai.models.test import TestModel   # agent tests never call a live model
```

```bash
uv add --package wardens <library>   # then pin; new MCP-related packages only take 14-day-old releases
```

The gotcha: new packages bring transitive dependencies; the 14-day rule applies only to the ones listed.

</div>

</details>

<details class="project-iq" markdown="1" id="technology-choices-q3">
<summary>Where did you build, and where did you buy or reuse?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Bought or reused (open source): Temporal for durability, Pydantic AI for model calls, LiteLLM as the
model and MCP gateway, SearXNG for web search, the whole homelab platform (Argo CD, Grafana stack,
OpenBao, Keycloak).

Built: the parts that are the product, which are the rules. The registry and manifest validation,
guardrails at four points, handoff limits that only narrow, the run record, the eval harness, the
routing rules, and `mcp-guard`, a small sidecar that checks each agent's grant per tool, because no MCP
server did that the way we needed.

The line I drew: build what enforces trust, reuse what moves bytes.

Deeper: [selection](/posts/projects/platform-wardens/05-technical-architecture/#technology-and-framework-selection), [third parties](/posts/projects/platform-wardens/17-governance-and-compliance/#vendor-and-third-party-management).

</div>

<div class="iq-role" data-role="devops" markdown="1">

The one piece I built and run that people expect to buy is `mcp-guard`, deployed as a sidecar in the
web-search MCP server's pod in its own namespace. LiteLLM signs a short-lived token per MCP call, and the
guard:

1. Verifies the token's signature, issuer, audience and expiry against LiteLLM's JWKS.
2. Takes the calling agent from `act.sub` and checks it against its own allow list and the token's `scope`.
3. Filters `tools/list` to what that agent may see.
4. Logs agent, run, trace id, tool and decision, then forwards with the server's own static token.

```bash
kubectl --context k3d-wardens -n mcp-web-search get pods          # mcp-searxng and mcp-guard in one pod
kubectl --context k3d-wardens -n mcp-web-search logs deploy/mcp-web-search -c mcp-guard --since=1h
```

Its image is built and signed like an agent's, and the allow list it reads is generated from the agents'
manifests, so a grant is a reviewed change. The gotcha: it's a second check behind LiteLLM's grants,
on purpose, so a misconfigured gateway still can't reach a tool the agent wasn't granted.

</div>

</details>

## Frontend Architecture
{: #frontend-architecture }

<details class="project-iq" markdown="1" id="frontend-architecture-q1">
<summary>How is the frontend (or user-facing interface) structured, in terms of framework, routing, components and state?</summary>

<div class="iq-role" data-role="architect" markdown="1">

There's no frontend framework, and that was a decision, not an omission. People meet the agents in Slack,
in GitHub and in a small operator console. The console is one HTML page served by the framework, with
plain JavaScript calling a few JSON endpoints; there's no routing library and no client state beyond the
page.

Why: the console's job is to send a task the way a trigger would and show what the run did. Every agent
appears in it from its manifest and samples, so adding an agent needs no UI work. A React app would be
more UI to secure and maintain for three screens.

If the interviewer wants the classic answer: for an approvals UI with many users I'd build a React SPA
with routes for runs, approvals and agents, server state through a query library, and the same JSON API.

Deeper: [information architecture](/posts/projects/platform-wardens/04-user-experience-and-design/#information-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The console is `wardens.runtime.console`: a standard-library `BaseHTTPRequestHandler` with an asyncio
loop on a background thread for the Temporal client, and `console.html` (about 500 lines) for the page.

Concepts, mapped to what it actually uses:

- **Single page, no router:** tabs (Send, recent runs, Author/Chat) switch sections of one page.
- **Data fetching:** `fetch` with `redirect: "manual"`, so an expired sign-in shows as a redirect instead of silently loading the login page into a JSON call.
- **Forms:** the sample picker fills an editable JSON task; **Preview** shows the exact envelope before **Send**.
- **State:** the page holds only what's on screen; runs are read back from Temporal.

```javascript
const res = await fetch(path, {...opts, redirect: "manual"});
```

```bash
uv run python -m wardens.runtime.console --dev-server     # http://127.0.0.1:8765
```

The gotcha: it binds to 127.0.0.1 and signs no one in; hosted, the oauth2-proxy sidecar does the sign-in.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-architecture-q2">
<summary>How does the user interface handle loading, errors and large data sets?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Runs take seconds to minutes, so "loading" is really "a workflow is running". The console shows each
recent run with its status and, when it finishes, what it did, including when it did nothing and why
("No output: out of scope: …"). For an incident it lists each child task (the agent, then its handoffs)
with its own findings and any refused handoff.

Errors are shown as the framework's own reasons: a task refused at guardrail point 1 says why; a sample
that breaks its input schema is refused before it's sent.

Large data sets don't reach the UI: findings travel by reference, a run's result is a short summary plus
its artifacts, and Slack gets one message per incident with a table per stack. If Slack rejects a table,
the message is resent as bullets.

Deeper: [interaction patterns](/posts/projects/platform-wardens/04-user-experience-and-design/#interaction-patterns), [the Slack message](/posts/projects/platform-wardens/04-user-experience-and-design/#visual-design-and-design-system).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The patterns in code:

- **Async status:** Send returns the workflow id at once; the page polls the run's view until it's done.
- **A short outcome per run:** agents return `ChildResult.summary`, the incident workflow collects one per child (`IncidentOutcome.summaries`), and `run_view` turns that into lines for the page.
- **Validation before send:** the data part is validated against the capability's input schema, and channel constraints may only be lowered (`_narrow`).
- **Errors as types:** `Unauthenticated` (401), `NotYours` (another person's conversation), `Refused` (a guardrail or schema reason) map to clear responses.

```python
class Refused(Exception):
    ...
def _narrow(constraints: dict[str, Any], narrow: dict[str, Any]) -> None:
    ...   # a sample may lower maxAutonomyLevel or costLimitUsd, never raise them
```

```bash
uv run --directory framework pytest -q tests/test_console.py   # builds a task from every sample in the repo
```

The gap: polling, not push; fine for a few operators.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-architecture-q3">
<summary>How do you keep the frontend fast and accessible?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Fast is easy at this size: one page, no framework bundle, JSON endpoints that read from Temporal. The work
that matters for speed is on the agent side: deterministic stages first, the model only where judgment is
needed, and Stack Author waking the model at the start of a conversation so the person doesn't wait on a
cold start.

Accessible means: text on every button, status in words rather than colour, tables with header rows,
clickable choices that also accept a typed number. Slack and GitHub carry the rest, which is one reason
they were chosen.

The honest gap: nothing has been tested with a screen reader, and the kill switch lives in the console,
so keyboard-only use of that form should be checked.

Deeper: [accessibility](/posts/projects/platform-wardens/04-user-experience-and-design/#accessibility-design), [responsive behaviour](/posts/projects/platform-wardens/04-user-experience-and-design/#responsive-behavior).

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **No bundle:** `console.html` is served as is; no build step, no client framework.
- **Choices as buttons:** Stack Author's questions come with choices from `config/targets.yaml`; the person clicks or types a number or a name, and free text still works.
- **Cold start hidden:** the conversation wakes the model at the start and shows that it's starting.
- **Capped responses, thinking off** for the chat model where reasoning adds nothing.

```bash
curl -s http://127.0.0.1:8765/healthz
```

The gotcha: the slow part a user feels is the model on the homelab GPU, not the page; the fix is in the
stage (smaller output, fewer turns), not the frontend.

</div>

<div class="iq-role" data-role="sre" markdown="1">

What I'd watch for the console as a user-facing service:

- **Availability:** `/healthz` (no sign-in) for the probe; the oauth2-proxy sidecar's own health.
- **Latency users feel:** the model's call time, from `chat` spans with real start and end times, per agent, on the model usage dashboard.
- **Errors:** 401s from the proxy (sign-in problems) versus refusals from the console (guardrail reasons), which are expected.

```bash
kubectl --context k3d-wardens -n wardens-console get pods
kubectl --context k3d-wardens -n wardens-console logs deploy/wardens-console -c oauth2-proxy --since=30m
```

The gap: there's no SLO on the console; on the homelab a few operators use it, and the agents don't
depend on it to run.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-architecture-q4">
<summary>How is the frontend built, configured per environment and served?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The console is built into its own image from the framework, plus every agent's manifest, input schemas
and samples, but no agent code. It's served on two names: an internal one behind Keycloak, and a public
one through the Cloudflare tunnel behind Access and then Keycloak. Configuration per environment is
environment variables: the user header to trust, the incident queue, the Temporal address.

The design point: the console can't run an agent; it can only start the same workflow a trigger starts,
on the real workers, with the signed-in person as the requester.

Deeper: [hosting](/posts/projects/platform-wardens/05-technical-architecture/#hosting-and-deployment-model), [names](/posts/projects/platform-wardens/11-infrastructure-and-environments/#networking-and-dns).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Configuration the console reads:

| Variable | Effect |
|---|---|
| `WARDENS_CONSOLE_USER_HEADER=X-Forwarded-Email` | Take the requester from the proxy; 401 without it |
| `WARDENS_CONSOLE_INCIDENT_QUEUE` | Where incident-mode runs go (the drift worker on the homelab) |
| `WARDENS_CONSOLE_USER` | The requester locally (default: the OS user) |

```bash
uv run python -m wardens.runtime.console --incident-worker      # local, with an incident worker
docker build -f framework/console.Dockerfile -t wardens-console .
```

The gotcha: a hosted console refuses a `person` requester other than the signed-in user, but allows
framework identities such as `drift-scan-trigger`, so a sample can replay exactly what a trigger sends.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Delivery for the console:

- **Image:** `framework/console.Dockerfile`, built by `wardens-console.yaml`, which also runs the framework tests on every framework change.
- **Chart:** the shared `wardens-web` chart, with an oauth2-proxy sidecar (Keycloak client, platform admins only) in the same pod.
- **Routing:** Traefik ingress with a Let's Encrypt certificate; the public name through the Cloudflare tunnel with Access in front.

```bash
kubectl --context k3d-wardens -n wardens-console get ingress
argocd app get wardens-console
```

The gap: the public name adds a second sign-in (Access, then Keycloak). It's deliberate defence in depth,
and slightly annoying.

</div>

</details>

## Backend and API Design
{: #backend-and-api-design }

<details class="project-iq" markdown="1" id="backend-and-api-design-q1">
<summary>How do CRUD operations work in the backend, from request to persisted data?</summary>

<div class="iq-role" data-role="architect" markdown="1">

There's no CRUD in the usual sense; the system's "writes" are runs. A request becomes a root task, the
task becomes a workflow, and the workflow's end writes one run record and its artifacts. Nothing is
updated in place: a run record is written once, the audit log is append-only, and a retried activity that
inserts the same run id changes nothing.

The one place with something like an update is the kill switch and dedupe claims in the state store, and
those are tiny rows with explicit owners.

If the interviewer wants CRUD: Stack Author is the closest, because it creates, updates or deletes
entries in a stack's `resources.yaml`. But it never writes directly; it proposes a diff and opens a draft
PR, and a person merges.

Deeper: [data model](/posts/projects/platform-wardens/05-technical-architecture/#data-architecture-and-data-models), [schema](/posts/projects/platform-wardens/07-data-and-integration/#database-schema-and-migrations).

</div>

<div class="iq-role" data-role="developer" markdown="1">

From request to persisted data, in code:

1. An entry point builds the root task (`create_root_task`): schema-validated data, channel constraints, dedupe, guardrail point 1.
2. `durable` starts the agent's task workflow or the incident workflow.
3. Activities do the I/O; stages produce findings and proposed actions.
4. The run-record activity writes once to Postgres (`WARDENS_STATE_DSN`), or the local file if Postgres can't be reached.

```python
# wardens.state.postgres: a run record is written once
# a retried activity inserts the same run id and changes nothing;
# when Postgres can't be reached, the sink writes the local file, logs an error,
# and wardens.run_record.fallbacks counts it (an alert fires)
```

```bash
WARDENS_STATE_DSN=postgresql://… uv run python -m wardens.state.migrate
uv run --directory framework pytest -q tests/test_state_postgres.py
```

The gotcha: `psycopg` is imported where it's used, because `wardens.state` is also imported inside
Temporal's workflow sandbox.

</div>

</details>

<details class="project-iq" markdown="1" id="backend-and-api-design-q2">
<summary>How did you design the API, in terms of style, resources, versioning, pagination and errors?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The API between components isn't REST; it's task, message and artifact, shaped after the A2A data model,
carried by Temporal. Versioning is `schemaVersion` on every record; errors are task states
(`rejected` with a reason, `input-required`, `failed`) rather than status codes.

Only the edges are HTTP, and they're deliberately small:

| Edge | Answers |
|---|---|
| `POST /github` | 202 started, 200 ignored or duplicate, 401 bad signature, 413 too large, 503 can't accept |
| Alerts relay | Bearer token, same answers |
| Console | JSON for send, preview, runs and chat; `/healthz` |

There's no pagination problem because nothing lists unbounded data: the console shows recent runs, and
everything else is by correlation id.

Deeper: [integration architecture](/posts/projects/platform-wardens/05-technical-architecture/#api-and-integration-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Contracts in `contracts/schemas/`**, draft 2020-12, `additionalProperties: false`, validated on write and on read.
- **Idempotent starts:** the workflow id derives from the source (`incident-drift-<owner>-<repo>-<run>` for a drift scan), so a redelivery answers `{"duplicate": …}`.
- **Signature before parsing:**

```python
def signature_valid(secret, body, header):
    """GitHub's X-Hub-Signature-256: `sha256=` + HMAC-SHA256 of the raw body, compared in constant time."""
    ...
    return hmac.compare_digest(expected, header.removeprefix("sha256="))
```

```bash
WARDENS_GITHUB_WEBHOOK_SECRET=$(openssl rand -hex 32) \
  uv run python -m wardens.runtime.github_webhook --host 127.0.0.1 --port 8080
uv run --directory framework pytest -q tests/test_github_webhook.py
```

The gotcha: one JSON log line per delivery is written whole under a lock, because concurrent deliveries
once interleaved their lines.

</div>

</details>

<details class="project-iq" markdown="1" id="backend-and-api-design-q3">
<summary>How is the backend structured internally, and where does background work run?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Internally it's ten framework modules and one package per agent; background work is all of it. Every run
is a Temporal workflow on the agent's own worker and task queue, so "background" isn't a separate
system: the webhooks answer at once, and the work happens on workers at their own pace.

Scheduled work is declared in the manifest (`schedules[]`) and created as Temporal Schedules by the
framework at worker start, with an explicit time zone, an overlap policy, a catch-up window and jitter.

The trade-off: Temporal is a big dependency for a homelab. It earns its place with runs that survive
restarts, approvals that wait for days and schedules in the same system.

Deeper: [components](/posts/projects/platform-wardens/05-technical-architecture/#system-context-and-component-architecture), [the bus](/posts/projects/platform-wardens/07-data-and-integration/#event-and-messaging-contracts).

</div>

<div class="iq-role" data-role="developer" markdown="1">

A schedule is data in the manifest, not code:

```yaml
schedules:
  - id: daily-infra-azure
    capability: terraform.drift.explain
    cron: "0 8 * * *"
    timezone: UTC
    overlap: skip                 # a run still going makes the next fire a no-op
    catchupWindowMinutes: 1440    # after an outage, a missed day still runs within a day
    jitterSeconds: 300
    incident: true                # under the incident workflow, so handoffs run
```

`sync_schedules` creates or updates `<agent>-<id>` at worker start; each fire is a fresh root task on
the `schedule` channel with its own correlation id.

```bash
uv run --directory framework pytest -q tests/test_schedules.py
temporal schedule list --namespace wardens
```

The gotcha: renaming a schedule's id leaves the old Temporal schedule behind; `sync_schedules` doesn't
delete it, so it's removed once by hand.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Each agent's worker is a Deployment from the shared chart, polling its own task queue. Nothing listens on
a port in a worker; it only connects out to Temporal, the model gateway, the state store and the APIs it
reads, which keeps its NetworkPolicy short.

```bash
kubectl --context k3d-wardens -n terraform-drift get deploy,pods
temporal task-queue describe --task-queue terraform-drift --namespace wardens
```

The router (the classifier for unmatched alerts and chat's Auto) is its own worker too, so a slow model
call there doesn't hold up an agent. The gap: one replica each; a worker restart delays runs, it doesn't
lose them.

</div>

</details>

<details class="project-iq" markdown="1" id="backend-and-api-design-q4">
<summary>How do you validate input and keep operations safe to repeat?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Input is validated at every boundary, and nothing is trusted because it came from inside:

- Schemas with `additionalProperties: false` on every record.
- The webhooks read only allowlisted fields (for alerts, allowlisted labels; never annotations).
- Model output validated as a typed model; failure falls back to "unknown".
- Retrieved content (plans, commits, logs) quoted as data, tested by injection cases.

Safe to repeat: workflow ids derived from the source event, so a redelivery is a no-op; run records
written once; act tools idempotent on retry (drift's draft PR re-checks the patch hash and the kill
switch before writing, and keeps at most one open PR per stack); approvals bound to the action's
idempotency key.

Deeper: [secure coding](/posts/projects/platform-wardens/06-security-and-privacy/#input-validation-and-secure-coding), [delivery](/posts/projects/platform-wardens/07-data-and-integration/#event-and-messaging-contracts).

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Point 2 on every tool call** (`check_tool_call`): declared tool, no act tool from a model, declared parameters only, and the tool's `bounds`.
- **Act tools run once unless idempotent:** retry policies come from `failureBehavior`.
- **Stack Author's button sends the hash of the diff on the page,** so the agent opens exactly what the person saw, or refuses.

```python
undeclared = sorted(set(args) - set(parameters))
if undeclared:
    return ToolDecision(False, "undeclared_parameters",
                        f"undeclared parameters for {name}: {undeclared}")
```

```bash
uv run --directory framework pytest -q tests/test_tool_calls.py
```

The gotcha: a missing argument isn't point 2's business (the tool's schema handles it); point 2 only
refuses what's undeclared or out of bounds.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Repeat-safety is what makes redeliveries and restarts boring:

- **GitHub redelivers** from the App's page: the workflow id is fixed per run, so a second start answers "duplicate".
- **Alert repeats:** the workflow id derives from the alert group key and its earliest `startsAt`, so a re-notification starts nothing.
- **Bus restarts:** the emulator's checkpoints are per hub instance, so a restart is read from the start, and the duplicate starts are refused the same way.
- **A worker dies mid-run:** Temporal resumes from the last completed activity.

```bash
kubectl --context k3d-wardens -n wardens-console logs deploy/wardens-ingress --since=1h | grep duplicate
```

The gap: the redelivery job for lost GitHub deliveries is planned; until then the daily schedule is the
fallback.

</div>

</details>

## Database and Data Modeling
{: #database-and-data-modeling }

<details class="project-iq" markdown="1" id="database-and-data-modeling-q1">
<summary>Which data store did you choose, and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Postgres, twice, for two different jobs. `wardens-db` is Temporal's, and treated as resettable: workflow
history is replay, not a record. `wardens-state-db` holds what has to outlive Temporal: run records,
artifacts, dedupe claims, the kill switch, the audit log and memory.

Why Postgres: the data is small, relational enough (records linked by correlation id), needs
transactions for the audit chain, and the platform already runs it well. Why separate: I wanted to be
able to wipe Temporal without losing a single audit event, and to give each writer its own role.

The alternative I'd mention: on Azure the audit log goes to Azure Data Explorer, append-only.

Deeper: [data architecture](/posts/projects/platform-wardens/05-technical-architecture/#data-architecture-and-data-models).

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Selected by configuration:** `WARDENS_STATE_DSN` set means Postgres; unset means local file stores, so tests and laptops need no database.
- **Driver:** `psycopg` async connections, `autocommit=True`, `connect_timeout=5`; one connection per operation, no pool.
- **Advisory locks:** one so two schema jobs take turns, one to order appends to the audit chain.

```python
_MIGRATION_LOCK = 7_207_736_001     # two schema jobs at once take turns
_AUDIT_LOCK = 7_207_736_002         # orders appends to the one audit chain
```

```bash
uv run --directory framework pytest -q tests/test_state_postgres_stores.py
```

The gotcha: no pool is fine at a few runs a minute; with more agents it'd be the first thing to change.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Both databases are Postgres in the `wardens` cluster, each its own app in gitops with its credentials
from OpenBao. The state store's schema is applied by a Job (`wardens-state-schema-0006`) running
`python -m wardens.state.migrate` from the console image, in a sync wave after its secrets.

```bash
kubectl --context k3d-wardens -n wardens-state-db get pods,jobs
kubectl --context k3d-wardens -n wardens-state-db logs job/wardens-state-schema-0006
```

Backups today: a nightly dump of both to another host, kept seven nights, alerted if late, until Velero
covers `wardens`. The gap: the restore hasn't been tested.

</div>

</details>

<details class="project-iq" markdown="1" id="database-and-data-modeling-q2">
<summary>How is the data modeled, and how did the access patterns shape the model?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The model is the contracts: task, artifact (finding or proposed action), run record, audit event, all
linked by `correlationId`. The access patterns are simple and shaped the tables directly:

| Access | Shape |
|---|---|
| "Show me this incident" | Everything by correlation id |
| "Is this alert a duplicate?" | Dedupe claim by key, with an `until` |
| "Is the kill switch on for this agent?" | One row per agent, read before each step |
| "Has the audit chain been tampered with?" | Ordered events with a hash of the previous one |
| Retention | `expires_at` on every row that expires |

No joins across agents, no reporting queries in the hot path; dashboards come from metrics, not from
these tables.

Deeper: [data model](/posts/projects/platform-wardens/05-technical-architecture/#data-architecture-and-data-models), [retention](/posts/projects/platform-wardens/07-data-and-integration/#data-retention-and-deletion).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Six numbered migrations, one table family each:

```text
0001_run_records.sql   0002_dedupe_claims.sql   0003_kill_switches.sql
0004_audit_events.sql  0005_memory_items.sql    0006_artifacts.sql
```

- **Expiry as data:** `expires_at` (or `until`) on rows that expire, so retention is one literal `DELETE … WHERE expires_at < now()` per table.
- **No SQL from strings:** the image build's Semgrep gate refuses it, so each statement is a literal.
- **Audit deletion only from the oldest end,** up to the first event still kept; a gap in the middle would read as tampering.

```bash
uv run python -m wardens.state.maintenance     # retention and the audit anchor
```

The gotcha: the confidential retention (30 days) applies by the record's classification, so the
classification has to be right at write time.

</div>

</details>

<details class="project-iq" markdown="1" id="database-and-data-modeling-q3">
<summary>How were schema changes and data migrations handled?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The framework owns the schema as numbered migrations, each applied in its own transaction by the owner
role, idempotent so migrating twice changes nothing. On the cluster a plain Job runs them, named after
the newest migration, because a Job can't change once created: a new migration means a new Job name and
an image that carries it. It's not an Argo CD hook, so self-heal never recreates a finished Job.

Data migrations haven't been needed: there's no legacy data. The run records that used to live in each
pod's scratch volume were lost with the pod; that's the problem the state store solved, not data it had
to move.

Deeper: [migrations](/posts/projects/platform-wardens/07-data-and-integration/#database-schema-and-migrations), [shipping them](/posts/projects/platform-wardens/12-cicd-and-release-management/#database-deployment-strategy).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Adding a migration:

1. Add `0007_<name>.sql` under `wardens/state/migrations/`.
2. Make it safe to re-run (it runs in a transaction; the migrate command records what's applied).
3. Use it from the store code, with a test against Postgres.

```bash
WARDENS_STATE_DSN=postgresql://… uv run python -m wardens.state.migrate
uv run --directory framework pytest -q tests/test_state_postgres.py
```

The gotcha: the code that needs the new table and the migration ship in different images (the agent and
the console's schema Job), so the store has to cope with the table not being there yet, or the deploy
order has to be explicit.

</div>

<div class="iq-role" data-role="devops" markdown="1">

In gitops, a new migration is a values change in two places: the schema Job's name and image digest, and
then the agents that use it.

```yaml
metadata:
  name: wardens-state-schema-0006          # renamed with each new migration
  annotations:
    argocd.argoproj.io/sync-wave: "1"      # after the password and pull secrets (wave 0)
```

```bash
argocd app sync wardens-state-db
kubectl --context k3d-wardens -n wardens-state-db get jobs
```

The gotcha: no `ttlSecondsAfterFinished` on the Job, on purpose; self-heal would recreate a deleted Job.

</div>

</details>

<details class="project-iq" markdown="1" id="database-and-data-modeling-q4">
<summary>How do you handle data retention, backup and restore?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Data | Kept |
|---|---|
| Run records | 180 days, 30 for confidential data |
| Audit log | 365 days, deleted only from the oldest end |
| Memory | Each item's own expiry, after review |
| Temporal history | Namespace retention; resettable |

Retention is a constant in the framework, so changing it is a reviewed code change. Backup is a nightly
dump of both databases to another host, seven nights kept, with an alert if late, until Velero backs up
the cluster. The audit chain's daily head is kept in `mon`, which is how a restore or a migration can be
checked for missing or altered events.

> **TODO:** A restore of the state store hasn't been tested; RPO is effectively a day today.
{: .prompt-warning }

Deeper: [retention](/posts/projects/platform-wardens/07-data-and-integration/#data-retention-and-deletion), [backup](/posts/projects/platform-wardens/07-data-and-integration/#backup-and-restore-strategy).

</div>

<div class="iq-role" data-role="devops" markdown="1">

- **Dumps:** a systemd service on the homelab host (from the infra repo's `host/backup/`) runs each database's `dump.sh` nightly and copies the dumps to another host, keeps seven, and an alert fires if the newest is late.
- **Retention in the database:** two CronJobs in `wardens-state-db` run `python -m wardens.state.maintenance` (expired rows, the audit anchor).
- **Planned:** Velero for the `wardens` cluster, like the other platform clusters.

```bash
systemctl list-timers | grep wardens-dumps                     # on the homelab host
kubectl --context k3d-wardens -n wardens-state-db get cronjobs
```

The gap: until Velero, the cluster's other state (the Event Hubs emulator's storage, ConfigMaps) is
rebuilt from git rather than restored, which is fine because none of it is a record.

</div>

<div class="iq-role" data-role="sre" markdown="1">

What I'd want before calling this done:

- **RPO/RTO agreed** for the state store, now that audit events live there (today: up to a day lost).
- **A tested restore,** timed, into a scratch database, and the audit chain verified against its anchors in `mon`.
- **The fallback watched:** when Postgres is down, run records go to the pod's scratch volume and `WardensRunRecordNotStored` fires; those files are lost with the pod.

```bash
pg_restore --list <dump-file> | head
# then: restore into a scratch database and run the audit-chain check against mon's anchor
```

The honest gap: the restore drill is still on the to-do list.

</div>

</details>

## Frontend, Backend and Database Communication
{: #frontend-backend-and-database-communication }

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q1">
<summary>How does the frontend connect to the backend?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Reframed: the "frontends" are Slack, GitHub and the console, and only the console calls the backend. It
calls JSON endpoints on the same pod, behind an oauth2-proxy sidecar that signs people in through
Keycloak and passes the user's email in a header. The console then talks to Temporal as a client: it
starts workflows, signals conversations and reads results.

Slack and GitHub are outputs: agents post with incoming webhooks and their own GitHub Apps. Nothing in
Slack calls back yet; the planned approval page will be the second inbound path from a person.

Deeper: [integration](/posts/projects/platform-wardens/05-technical-architecture/#api-and-integration-architecture), [sign-in](/posts/projects/platform-wardens/06-security-and-privacy/#authentication-and-authorization).

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Same-origin JSON** from `console.html` to the console's handler; `fetch` with `redirect: "manual"` to catch an expired sign-in.
- **Identity from the proxy:** `X-Forwarded-Email`, trusted only because the proxy is the only way into the pod.
- **Chat as signals:** starting a chat is a Send on the `console-chat` channel; each turn is a signal to that conversation's workflow, and only its starter can read or send.

```bash
curl -s -H 'X-Forwarded-Email: me@example.com' http://127.0.0.1:8765/healthz
```

The gotcha: the header is only safe because the console binds behind the proxy; run locally, it never
trusts a header unless `WARDENS_CONSOLE_USER_HEADER` is set.

</div>

<div class="iq-role" data-role="devops" markdown="1">

The path in Kubernetes: Traefik ingress (TLS ends there) → the pod's oauth2-proxy container → the console
container on localhost. Keycloak client `wardens-console`, platform admins only. From outside: Cloudflare
edge → tunnel → Traefik, with Access before Keycloak.

```bash
kubectl --context k3d-wardens -n wardens-console get ingress,svc
kubectl --context k3d-wardens -n wardens-console describe pod -l app.kubernetes.io/name=wardens-console | grep -A2 Containers
```

The gotcha: the internal name and the public name need both redirect URIs in the Keycloak client, or
one of them fails sign-in with a redirect error.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q2">
<summary>Trace a single user request from the browser to the data store and back.</summary>

<div class="iq-role" data-role="architect" markdown="1">

The request I'd trace is an operator sending drift's sample from the console:

1. Browser → Traefik (HTTPS) → oauth2-proxy (Keycloak session) → console.
2. Console: validate the data against the input schema, channel constraints, dedupe, guardrail point 1, root task with a correlation id and the person as requester.
3. Console → Temporal: start the incident workflow on the drift worker's queue, memo `submittedBy`.
4. Drift's worker: activities read GitHub and Azure with the agent's own identity; one stage calls the model through LiteLLM.
5. Handoff: a child task to the Change Correlator.
6. Each child writes its run record to `wardens-state-db`; one Slack message per incident.
7. The console polls Temporal and shows each task's findings.

One trace covers it, because the correlation id is the trace id.

Deeper: [user flows](/posts/projects/platform-wardens/04-user-experience-and-design/#user-flows), [tracing](/posts/projects/platform-wardens/14-operations-and-observability/#distributed-tracing).

</div>

<div class="iq-role" data-role="developer" markdown="1">

In the code, the pieces of that trace:

- `Console.build` → `create_root_task` (schema, constraints, dedupe, point 1).
- `wardens.incident` workflow → the agent's task workflow as a child → `plan_child_task` for the handoff (hop budget, limits capped at the target's grants).
- `wardens.llm.model_call` with `usage_limits` from the remaining budget; tools through `GuardedToolset`.
- The run-record activity → Postgres, or the local file.

```python
def span_id(kind: str, correlation_id: str, key: str) -> int:
    """The deterministic id of one span: the same inputs always give the same id. Never 0."""
    return int.from_bytes(hashlib.sha256(f"{kind}:{correlation_id}:{key}".encode()).digest()[:8], "big") or 1
```

That function is why spans from different processes join one trace without passing context around.

</div>

<div class="iq-role" data-role="sre" markdown="1">

To follow one request in production I'd start from the correlation id:

- **Tempo:** the trace with that id: `wardens.entry` → `wardens.incident` → `invoke_agent` per agent → `chat` and `execute_tool` spans with real times.
- **Temporal UI:** the workflow, its memo (`submittedBy`), each activity's attempts.
- **Run record:** evidence, decisions and cost, from the state store.

```bash
temporal workflow show --workflow-id <id> --namespace wardens
kubectl --context k3d-wardens -n terraform-drift logs deploy/terraform-drift --since=1h | grep <correlation-id>
```

The gap: structured log export isn't built, so logs aren't yet joined to the trace by field; grepping for
the id works but isn't a query.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q3">
<summary>How does the backend connect to the data store, and how are connections, timeouts and concurrency handled?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The backends are Temporal and Postgres, and both connections are designed to fail visibly rather than
hang:

- **Temporal:** agents never connect directly; `wardens.durable` does. Activities have timeouts and retry policies from the manifest's `failureBehavior`; act tools run once unless idempotent.
- **Postgres:** a short-lived connection per operation with a 5-second connect timeout; the run-record activity retries for about 15 seconds, then writes the local file and raises an alert rather than losing the outcome.
- **Concurrency:** each agent has its own worker and task queue; the incident workflow runs up to four children in parallel by default.

Deeper: [resilience](/posts/projects/platform-wardens/05-technical-architecture/#resilience-and-disaster-recovery).

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Connection per operation:** `psycopg.AsyncConnection.connect(dsn, autocommit=True, connect_timeout=5)` inside `async with`, so nothing leaks.
- **Transactions only where needed:** the audit append takes an advisory lock and a transaction; most writes are single autocommit inserts.
- **Temporal client:** created once per process by `wardens.durable.connect()`, which also exports the SDK's metrics when an OTLP endpoint is set.

```python
async with await _connect(self._dsn) as conn, conn.transaction():
    ...   # the audit chain: lock, read the previous hash, insert
```

The gotcha: Temporal's workflow sandbox imports `wardens.state`, so `psycopg` is imported inside the
functions that use it, never at module level.

</div>

<div class="iq-role" data-role="sre" markdown="1">

- **Saturation signals:** task-queue backlog and pollers per agent (workflow dashboard); running workflows by age from the worker observer.
- **Timeouts that alert:** a run near its deadline; a worker that stops polling.
- **Database:** `WardensRunRecordNotStored` when the fallback fires; the database's own down alert.

```bash
temporal task-queue describe --task-queue terraform-drift --namespace wardens
kubectl --context k3d-wardens -n wardens-state-db exec deploy/wardens-state-db -- psql -c 'select count(*) from pg_stat_activity'
```

The gap: no pool means connection storms are possible under a burst of finishing runs; at today's volume
it's never been close.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q4">
<summary>Where do you cache, and how do you keep cached data correct?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Very little is cached, on purpose: stale data in an agent's evidence is a wrong answer. What is cached:

| Cached | Kept correct by |
|---|---|
| The manifest, per worker process | Loaded at start; a manifest change is a new image |
| GitHub App installation tokens | Refreshed before expiry |
| MCP tool definitions | Pinned by SHA-256 at load and checked on every listing |
| Dedupe claims | An `until` timestamp; a repeat inside it attaches to the first task |

The model gateway and the homelab's Redis cache sit outside the agents. Evidence (plans, logs, Activity
Log) is always read fresh, with the agent's own identity, at the moment it's needed.

Deeper: [pinned tool definitions](/posts/projects/platform-wardens/06-security-and-privacy/#vulnerability-and-dependency-management).

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Tokens:** `GitHubAppTokens` mints installation tokens and refreshes them before they expire; `BearerTokenAuth` hands the current one to each request.
- **Tool definitions:** `mcp_toolset` pins each tool's `definitionSha256` at load and checks it on every listing, so a changed description is refused, not silently used.
- **Manifest:** cached in a passthrough module so the Temporal sandbox doesn't re-read files.

```bash
uv run --directory framework pytest -q tests/test_github_app.py tests/test_mcp.py
```

The gotcha: caching the manifest per process means a manifest-only change needs a new image and a
restart; there's no hot reload, deliberately.

</div>

<div class="iq-role" data-role="sre" markdown="1">

From operations, the cache that can bite is the dedupe claim: an alert that re-fires inside the cooldown
attaches to the first task instead of starting a new one. That's the point (no storm of incidents), but it
means a genuinely new problem with the same group key and start time looks like a duplicate.

```bash
kubectl --context k3d-wardens -n wardens-state-db exec deploy/wardens-state-db -- \
  psql -c "select key, until from wardens.dedupe_claims order by until desc limit 10"
```

The other one is token expiry: a worker that can't refresh its GitHub token fails its reads, and the run
fails visibly with the reason in the run record.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q5">
<summary>Where did you use synchronous and where asynchronous communication, and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Synchronous only where a person or a sender is waiting for an answer, and even then only for the check:

| Path | Style | Why |
|---|---|---|
| Webhook → relay | Sync, milliseconds | Check the signature or token, publish, answer 202 |
| Relay → bus → consumer | Async | Bursts absorbed; the consumer starts runs at Temporal's pace |
| Run itself | Async, durable | Minutes to days; survives restarts |
| Stage → model | Sync inside an activity | One call, with a cost limit and a circuit breaker |
| Agent → agent | Async child workflow | Limits narrow; artifacts by reference |
| Console → Temporal | Async start, then poll | The page doesn't hold a connection for a run |

The earlier design started the workflow inside the webhook request, and a burst held a thread per
request while each waited on Temporal; that's what the bus fixed.

Deeper: [event contracts](/posts/projects/platform-wardens/07-data-and-integration/#event-and-messaging-contracts).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The relay mode is the change that made the edge asynchronous:

- `--mode relay`: after the token or signature check, publish the bus form (a CloudEvents `IngressEvent`) and answer 202, or 503 when the hub won't take it.
- `--max-in-flight` caps concurrent requests in either mode.
- The consumer (`python -m wardens.runtime.ingress`) runs the same receivers as the direct path, with the same workflow ids, plus `sourceEventId`.

```bash
uv run python -m wardens.runtime.github_webhook --mode relay --max-in-flight 32
uv run --directory framework pytest -q tests/test_relay.py tests/test_ingress.py
```

The gotcha: the consumer must skip stale events after an outage, or a backlog of hour-old alerts would
start incidents that no longer matter.

</div>

</details>

## Integrations and Background Processing
{: #integrations-and-background-processing }

<details class="project-iq" markdown="1" id="integrations-and-background-processing-q1">
<summary>Which external systems does the application integrate with, and how?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| System | Direction | How |
|---|---|---|
| GitHub | In and out | Signed App webhooks in; an App per agent for reads and draft PRs |
| Azure | In | Resource Graph and Activity Log, read with the agent's federated Entra identity |
| Kubernetes | In | Read-only cluster access for upgrade readiness (short-lived tokens planned) |
| Alertmanager | In | Webhook with a bearer token, allowlisted labels only |
| LiteLLM | Out | Every model call and every MCP call, a key per agent |
| Slack, Teams, email | Out | Notifications; never fail a run |
| Web search | Out | An MCP server behind LiteLLM and `mcp-guard` |

The rule for a new one, from the Change Correlator's decision: use a provider's own MCP server only where
it passes our acceptance test; otherwise the agent reads the API itself, with its own identity.

Deeper: [integrations](/posts/projects/platform-wardens/07-data-and-integration/#external-systems-and-third-party-integrations).

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **GitHub App auth:** a JWT signed with the App's key becomes an installation token; `GitHubAppTokens` mints a read set (contents, actions, metadata) and, with `GITHUB_APP_WRITE=true`, a write set (contents, pull_requests) for `open_draft_pr` only.
- **Scoped reads:** drift's `download_plan_artifacts` reads only `_stack_path.txt` and `tfplan.json`, caps at 50 MB and refuses unsafe zip paths.
- **The shared module checkout:** a blobless sparse clone at the scan's commit, host git config ignored, deleted after the run.

```yaml
- name: download_plan_artifacts
  source: local
  kind: read
  scope: actions:read on allow-listed IaC repositories; _stack_path.txt and tfplan.json … 50 MB cap, unsafe zip paths refused
```

```bash
cd agents/devops/terraform-drift && GITHUB_READ_TOKEN=$(gh auth token) uv run python -m terraform_drift.worker run
```

The gotcha: without the App's write permission accepted, the write token set can't be minted and the
worker runs in shadow mode.

</div>

</details>

<details class="project-iq" markdown="1" id="integrations-and-background-processing-q2">
<summary>How do you handle rate limits, retries and partial failures from external APIs?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Partial failure is normal, so each layer has one job:

- **Activities** retry with policies from the manifest's `failureBehavior`; act tools run once unless they're idempotent.
- **Circuit breakers** per agent and dependency; the model endpoint is behind one, and `CircuitOpen` is never retried by an activity.
- **Partial results are results:** drift reports the stacks it explained, the ones skipped, and the ones whose plan job failed, rather than failing the whole run.
- **Notifications never fail a run.**
- **Rate limits** are per GitHub App installation, which one App per agent spreads.

The trade-off: retries inside activities hide flakiness; the metrics count attempts so it doesn't stay
hidden.

Deeper: [resilience](/posts/projects/platform-wardens/05-technical-architecture/#resilience-and-disaster-recovery).

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Retry policy from the manifest:** `failureBehavior` maps to Temporal retry policies in `wardens.durable`; act tools get `maximum_attempts=1` unless idempotent.
- **Breakers:** `wardens.guardrails.breaker` per dependency; `wardens.llm.with_breaker` wraps the model.
- **Partial outcome in the workflow:**

```python
failed = [(s, "plan job failed in the drift scan") for s in inventory.failed if not wanted or s in wanted]
outcome |= {"stacks_skipped": tuple(skipped)}
if not todo:
    return done(stacks_failed=tuple(failed))
```

```bash
uv run --directory framework pytest -q tests/test_breaker.py
```

The gotcha: a breaker that opens mid-run turns the stage's model call into its fallback ("unknown"),
which is correct but has to be visible in the run record, or a run looks fine with weak findings.

</div>

<div class="iq-role" data-role="sre" markdown="1">

What I watch: tool error rate per agent and tool, breaker state, and dead letters on the bus. The
runbook's common situation "tool error rate rising" means a dependency is degraded, and the first check is
the dependency, not the agent.

```bash
kubectl --context k3d-wardens -n terraform-drift logs deploy/terraform-drift --since=30m | grep -i -E 'breaker|retry|rate limit'
```

Failure I'd plan for: GitHub doesn't retry a webhook that got a 503, so a delivery lost while the bus was
refusing is gone until someone redelivers it from the App's page. The daily schedule is the fallback, and
a redelivery job is planned. The gap: no alert yet on "GitHub delivery answered 503".

</div>

</details>

<details class="project-iq" markdown="1" id="integrations-and-background-processing-q3">
<summary>How are scheduled and background jobs designed and coordinated?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Schedules are declared in each agent's manifest and created by the framework as Temporal Schedules, never
by cron jobs or agent code. Each fire is a fresh root task with its own correlation id, through the same
channel checks as any trigger. The fields force the decisions people forget: an explicit IANA time zone,
what happens when the previous run is still going (`overlap: skip` for drift), how far back to catch up
after an outage, and jitter so fleet-wide schedules don't all start at once.

Coordination between scheduled work: drift runs at 08:00 UTC, two hours after the drift scan it reads;
and an event-driven path (the webhook) starts it sooner when the scan found drift, with the schedule as
the fallback.

Deeper: [timing](/posts/projects/platform-wardens/12-cicd-and-release-management/#release-calendar), [proactive and reactive runs](/posts/projects/platform-wardens/05-technical-architecture/#system-context-and-component-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **`sync_schedules`** at worker start creates or updates `<agent>-<id>` for each `schedules[]` entry.
- **Each fire** runs the `wardens.schedule` workflow, which creates the root task and runs the agent's task workflow as a child, or the incident workflow when `incident: true`.
- **CI rejects** a schedule whose capability isn't the agent's, or whose time zone is unknown.

```bash
temporal schedule describe --schedule-id terraform-drift-daily-infra-azure --namespace wardens
temporal schedule trigger --schedule-id terraform-drift-daily-infra-azure --namespace wardens   # a manual fire
```

The gotcha: changing a schedule's id (weekly to daily) leaves the old Temporal schedule; it has to be
deleted once by hand.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Nothing scheduled lives in Kubernetes for the agents; Temporal owns it, so it's visible in one place and
survives a worker restart. The CronJobs that do exist are the database's own: daily retention and the
audit anchor in `wardens-state-db`.

```bash
kubectl --context k3d-wardens -n wardens-state-db get cronjobs     # wardens-state-retention, anchor
temporal schedule list --namespace wardens
```

What I check after a deploy: the schedules table on the workflow dashboard shows the next fire for
every schedule, and pausing one fires the paused-schedule alert. The gap: that alert hasn't been fired on
purpose yet.

</div>

</details>

## Security and Identity
{: #security-and-identity }

<details class="project-iq" markdown="1" id="security-and-identity-q1">
<summary>How do users authenticate, and how is authorization enforced?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Two kinds of principal. **People** sign in through Keycloak (an oauth2-proxy in front of the console,
platform admins only; Cloudflare Access first from outside), and the signed-in user becomes the task's
requester. **Agents** are their own principals: a Kubernetes service account federated to the agent's own
Entra app, and its own GitHub App. Never a person's credentials, never shared.

Authorization is four guardrail points in code: at submission (capability, level, cost, quarantine), on
every tool call (declared, no act tool from a model, parameters and bounds), at policy gates, and at
the action (catalog, owning domain, level, approval). The prompt is never one of them.

Deeper: [authentication and authorization](/posts/projects/platform-wardens/06-security-and-privacy/#authentication-and-authorization), [identity](/posts/projects/platform-wardens/05-technical-architecture/#identity-and-access-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Requester from the proxy header,** refused if missing; a `person` requester must be the signed-in user.
- **Point 1:** `check_submission` before a root task exists.
- **Point 2:** `check_tool_call` inside `GuardedToolset` for every model tool call; deterministic stages call it with `caller="stage"`.
- **Point 4:** `check_action` with the ownership map; a target owned by another domain becomes a suggested handoff.

```python
tools = {t["name"]: t for t in manifest.get("tools") or []}
tool = tools.get(name)
if tool is None:
    return ToolDecision(False, "undeclared_tool", f"tool {name!r} is not declared in the manifest")
```

```bash
uv run --directory framework pytest -q tests/test_tool_calls.py tests/test_autonomy_audit.py
```

The gap: inter-agent calls are authenticated by Temporal namespace and queue isolation only; whether tasks
should carry a signed caller assertion is still open.

</div>

<div class="iq-role" data-role="devops" markdown="1">

- **Workload identity:** the `wardens` cluster's service-account issuer is published as static discovery and JWKS files (a small Cloudflare Worker); each agent's Entra app has a federated credential for its service account, created in the infra repo.
- **GitHub:** an App per agent; its key in OpenBao.
- **People:** Keycloak client per app, oauth2-proxy sidecar.

```bash
kubectl --context k3d-wardens -n terraform-drift get sa terraform-drift -o yaml
curl -s https://<oidc-issuer>/wardens/.well-known/openid-configuration
```

The gotcha: the issuer must be publicly reachable for Entra to fetch the keys, so the Worker serves only
the two static files, with Access bypassed for those paths.

</div>

</details>

<details class="project-iq" markdown="1" id="security-and-identity-q2">
<summary>How are secrets and credentials managed?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Secrets live only in OpenBao under `kv/wardens/*`; External Secrets turns them into the Secrets pods read.
Gitops holds `ExternalSecret` objects only. Azure needs no stored secret at all (federation). GitHub
installation tokens are minted by the worker and refreshed before expiry. Each agent has two LiteLLM
keys, models and MCP-only, so one leaking can't be used for the other.

The rules that matter more than the store: no secret or sensitive attribute value in a prompt, a report
or a PR; Stack Author refuses to propose a value that looks like a secret; at L2, write credentials will be
just-in-time per approved action.

Deeper: [secrets](/posts/projects/platform-wardens/06-security-and-privacy/#secrets-and-key-management).

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Settings from the environment,** never from code; `WorkerSettings` refuses a placeholder.
- **Redaction:** `wardens.telemetry` strips secrets always, and per-label keys from `redaction.yaml`, from actions and evidence before telemetry or a run record.
- **Plans redacted before a model sees them** in drift; sensitive attributes never leave the tool.
- **Test fixtures** use obviously fake keys, listed in `.gitleaksignore` with a reason.

```bash
uv run --directory framework pytest -q tests/test_otel_redact.py
```

The gotcha: Gitleaks flagged Azurite's published development key in the local Event Hubs stack; it went
into `.gitleaksignore` by fingerprint, with the reason, rather than disabling the gate.

</div>

<div class="iq-role" data-role="devops" markdown="1">

```yaml
secretEnv:
  - {name: WARDENS_LLM_API_KEY,    path: wardens/terraform-drift, property: litellm_api_key}
  - {name: GITHUB_APP_PRIVATE_KEY, path: wardens/terraform-drift, property: github_app_private_key}
  - {name: WARDENS_MCP_API_KEY,    path: wardens/terraform-drift, property: litellm_mcp_api_key}
```

The chart turns `secretEnv` into an `ExternalSecret`; OpenBao entries are seeded by host scripts in the
infra repo (the MCP-only keys by their own script).

```bash
kubectl --context k3d-wardens -n terraform-drift get externalsecret
kubectl --context k3d-wardens -n terraform-drift describe externalsecret | grep -A3 Status
```

The gap: rotation is manual. A rotated LiteLLM key in OpenBao reaches the pod's Secret on the next
refresh, but the worker reads env vars at start, so it needs a restart.

</div>

</details>

<details class="project-iq" markdown="1" id="security-and-identity-q3">
<summary>How is sensitive data protected, and which compliance constraints applied?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Every manifest declares the most sensitive data class the agent may touch, how it's handled, and whether
it may reach a model. Redaction is code, tested per tool, and happens twice: before the model and before
telemetry. Run records reference inputs rather than copying them; confidential records are kept 30 days
instead of 180.

On the homelab the agents read infrastructure metadata, and the models are local. The compliance question
I'd raise for a real deployment: which data classes may reach an approved model endpoint at all; external
obligations override the framework.

> **TODO:** The data classification labels for the Azure target aren't decided in the repo.
{: .prompt-warning }

Deeper: [privacy](/posts/projects/platform-wardens/06-security-and-privacy/#privacy-and-data-protection-requirements), [compliance](/posts/projects/platform-wardens/02-requirements-gathering/#regulatory-legal-and-compliance-requirements).

</div>

<div class="iq-role" data-role="devops" markdown="1">

- **In transit:** TLS at Traefik with Let's Encrypt certificates; HTTPS between clusters; the tunnel from Cloudflare's edge. In-cluster hops are plaintext behind NetworkPolicies.
- **At rest:** the Postgres volumes on the homelab host's disk; dumps copied to another host.
- **Telemetry:** redacted at the source, so Loki and Tempo in `mon` never receive the raw values.

```bash
kubectl --context k3d-wardens -n terraform-drift get networkpolicy -o yaml | head -40
```

The gap: no disk encryption claim on the homelab volumes, and Temporal's frontend has no mTLS inside the
cluster; both are fine for a homelab and open decisions for the Azure target.

</div>

</details>

<details class="project-iq" markdown="1" id="security-and-identity-q4">
<summary>Which threats did you design against?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The OWASP Top 10 for Agentic Applications, with a control per risk, confirmed per agent:

| Threat | Main control |
|---|---|
| Goal hijack (prompt injection) | Retrieved content is data; deterministic goal-drift check before actions; injection eval cases |
| Tool misuse | Act tools never model-callable; declared parameters and bounds |
| Privilege abuse | An identity per agent; no credential in a handoff |
| Supply chain | Reviewed MCP servers, definitions pinned by hash, locked dependencies |
| Cascading failures | Hop and cost budgets, breakers, timeouts |
| Rogue agent | Kill switch within 60 seconds, quarantine, ownerless agents disabled |

Plus the edges: a spoofed webhook (HMAC before parsing), a poison event (dead-letter hub), a storm
(dedupe and rate limits).

Deeper: [threat model](/posts/projects/platform-wardens/06-security-and-privacy/#threat-modeling).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The control I'd show for prompt injection is architectural: the model can't choose an action.

- In drift, deterministic stages decide the recommendation kind; the model writes the rationale and classification only, validated by Pydantic, falling back to "unknown".
- `synthetic-injection-*` cases put an instruction inside a plan or a commit message and check nothing changes.
- Control evidence: every denial test has an allowed twin and fails when the control is removed.

```bash
ls agents/devops/terraform-drift/evals/scenarios/ | grep -i injection
uv run --directory agents/devops/terraform-drift pytest -q tests/unit -k injection
```

The gap: a model could still write a misleading rationale for a correct recommendation; that's caught by
people in shadow, not by code.

</div>

<div class="iq-role" data-role="devops" markdown="1">

- **Network:** a NetworkPolicy per agent with egress only to what it needs; the hooks path bypasses Access only because GitHub can't sign in, and the HMAC signature is checked before the body is parsed; over 1 MB is refused.
- **Images:** Gitleaks, Semgrep, Trivy, Checkov, Hadolint; signed; Kyverno admits digest-pinned images only.
- **Pods:** non-root, read-only root filesystem, restricted security context, no service-account token where it isn't needed.

```bash
kubectl --context k3d-wardens get clusterpolicy
cosign verify <registry>/platform/terraform-drift@sha256:… --key <cosign-pub>
```

The gotcha: the drift agent's container needs a writable scratch directory for the sparse clone; it's an
`emptyDir`, not a writable root.

</div>

</details>

## Performance and Scalability
{: #performance-and-scalability }

<details class="project-iq" markdown="1" id="performance-and-scalability-q1">
<summary>What load does the system handle, where are the bottlenecks, and how does it scale?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The load is small and bursty: a few scheduled runs a day, alerts in bursts, a handful of chats. A run
takes seconds to minutes, mostly waiting on a model or an API. So the bottlenecks are, in order: the GPU
behind the model gateway, external API rate limits, and Temporal's throughput far behind them.

It scales by isolation and back-pressure: a task queue per agent, the bus absorbing bursts at the edge
with the consumer starting runs at its own pace, up to four parallel children per incident, and a cost
ceiling per run as a hard limit.

> **TODO:** Expected run volume once incident triage takes every warning and critical alert isn't
> measured yet; that sets worker counts and model capacity.
{: .prompt-warning }

Deeper: [scalability](/posts/projects/platform-wardens/05-technical-architecture/#scalability-and-performance-strategy).

</div>

<div class="iq-role" data-role="sre" markdown="1">

- **Saturation:** task-queue backlog and pollers per agent; the bus's lag; GPU utilisation on the model host.
- **Latency:** `chat` span durations per agent and model; run duration against its deadline.
- **Burst target:** 1,000 alerts and 5,000 GitHub events, nothing lost, runs started within 5 minutes.

```bash
temporal task-queue describe --task-queue incident-triage --namespace wardens
kubectl --context k3d-wardens -n wardens-console logs deploy/wardens-ingress --since=10m | tail
```

The gap: the load test is designed (synthetic alert groups that match no rule, GitHub-shaped events that are
filtered) but hasn't run.

</div>

</details>

<details class="project-iq" markdown="1" id="performance-and-scalability-q2">
<summary>How would the design change at ten times the users or data?</summary>

<div class="iq-role" data-role="architect" markdown="1">

At ten times the runs, three things change:

1. **Models first.** One GPU host can't serve ten times the calls; I'd route classification stages to a smaller model and keep the large model for explanation, and on Azure use Foundry with per-agent quotas behind APIM.
2. **Workers scale out.** Workers are stateless; more replicas per task queue, with shared agents at two or more replicas and budgets per caller.
3. **The edge.** The emulator becomes real Event Hubs; storm mode and alert coalescing (planned) stop one outage becoming a thousand incidents.

What doesn't change: the contracts, the guardrails and the run record. That's the point of putting the
rules in the framework.

Deeper: [scalability](/posts/projects/platform-wardens/05-technical-architecture/#scalability-and-performance-strategy), [capacity](/posts/projects/platform-wardens/11-infrastructure-and-environments/#capacity-and-quota-planning).

</div>

<div class="iq-role" data-role="devops" markdown="1">

- **Replicas:** `replicas` in each agent's values; the chart's Deployment is stateless apart from its scratch volume.
- **Database:** connection pooling (today one connection per operation), then a managed Postgres on Azure.
- **Temporal:** history and matching shards sized for the workflow count; today a single small deployment.

```bash
kubectl --context k3d-wardens -n terraform-drift scale deploy/terraform-drift --replicas=2   # for a test; gitops is the source of truth
```

The gotcha: two drift workers would both register the same schedules at start; `sync_schedules` creates or
updates by id, so it's safe, but it's the kind of thing to test before relying on it.

</div>

<div class="iq-role" data-role="sre" markdown="1">

At ten times, I'd add before anything else:

- **SLOs** on time to first diagnosis and on scheduled runs on time, with error budgets.
- **Alert coalescing** so a cluster-wide outage is one incident, not hundreds.
- **Per-caller budgets** on shared agents, so one domain's storm can't starve another's investigations.
- **Capacity alerts** on task-queue backlog age, not just length.

```text
backlog age > 5 min for 10 min  → warning
model p95 call time > 2× baseline for 30 min → warning
```

The honest gap: today none of the per-caller budgets exist; the cost ceiling is per run and per day per
agent.

</div>

</details>

<details class="project-iq" markdown="1" id="performance-and-scalability-q3">
<summary>How did you measure and improve performance?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Measured with the same telemetry the gates use: `chat` spans with the real call times, run durations,
tokens and cost per run. The improvements so far were mostly about not calling the model:

- Deterministic stages decide; the model only explains.
- Stack Author wakes the model at the start of a conversation, shows it's starting, turns thinking off and caps responses.
- The webhooks moved to relay mode, so a burst no longer holds a thread per request while waiting on Temporal.
- `--max-in-flight` bounds concurrent requests at the edge.

Deeper: [what was built and why](/posts/projects/platform-wardens/09-implementation/#feature-development).

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Spans from run records:** `chat` spans carry the real start and end of each model call, so slow stages show in Tempo.
- **Thinking off and capped output** for chat turns that only ask a question.
- **Fewer calls:** classification is deterministic where code can do it; cicd-triage's core extracts and classifies the failure offline before any model call.

```bash
uv run --directory agents/devops/cicd-triage pytest -q tests/unit
```

The gotcha: live `chat` and `execute_tool` spans from Pydantic AI's hooks aren't built yet; spans are
written from the run record after the activity, so a hung call shows only when it ends.

</div>

<div class="iq-role" data-role="sre" markdown="1">

- **Before and after on the dashboard:** model usage and cost per agent, run durations, the bus's second-scale latency buckets (the defaults put every publish in one bucket, which hid everything).
- **Logs volume:** the Event Hubs SDK went from about 10,500 lines an hour to a few at WARNING, which made the consumer's real errors findable.

```promql
histogram_quantile(0.95, sum by (le) (rate(wardens_ingress_publish_seconds_bucket[5m])))
```

The gap: no latency SLO, so "improved" means "better than last week", not "within target".

</div>

</details>

## Reliability and Resilience
{: #reliability-and-resilience }

<details class="project-iq" markdown="1" id="reliability-and-resilience-q1">
<summary>What are the failure modes, and how does the system degrade when a part fails?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Part fails | System does |
|---|---|
| A worker pod | Temporal resumes from the last completed activity on a new pod |
| Temporal | Webhooks still answer; the bus keeps events; the consumer waits |
| The state store | Run records to the local file, counted and alerted |
| The model | Breaker opens; stages fall back to "unknown" or a template |
| GitHub delivery lost | The daily schedule still runs |
| The bus | Relays answer 503; GitHub won't retry, so redelivery is manual today |
| An agent misbehaves | Kill switch within 60 seconds, fails closed |

The design principle: degrade to "a person does it", never to "the agent guesses".

Deeper: [resilience](/posts/projects/platform-wardens/05-technical-architecture/#resilience-and-disaster-recovery).

</div>

<div class="iq-role" data-role="sre" markdown="1">

The failure I'd drill first is the kill switch, because it's the one that must work when everything else is
confusing: engage it from the console, confirm the agent's running workflows are cancelled and nothing new
starts within 60 seconds, and that the state it leaves is the manifest's `safeState` (for drift: no
workflow in flight, no new PRs, open drafts stay drafts).

```bash
kubectl --context k3d-wardens -n wardens-state-db exec deploy/wardens-state-db --   psql -U postgres -d wardens -c 'select * from wardens.kill_switches'
temporal workflow list --namespace wardens --query 'ExecutionStatus="Running"'
```

The gap: the drill isn't done and the runbook's "last tested" line is empty.

</div>

</details>

<details class="project-iq" markdown="1" id="reliability-and-resilience-q2">
<summary>What are the availability and recovery targets, and how are backup and disaster recovery handled?</summary>

<div class="iq-role" data-role="architect" markdown="1">

No agreed availability target yet; the design limits are a 60-second kill switch, runs started within 5
minutes of a burst, and a 2-hour deadline per drift run. Recovery: Temporal's database is resettable by
design, the state store is the one that matters, dumped nightly to another host and kept seven nights,
with Velero planned.

That gives an RPO of up to a day for run records and audit today, and an RTO nobody has measured, which
I'd say plainly in an interview. The first step is a timed restore.

> **TODO:** RPO and RTO for the state store are not agreed.
{: .prompt-warning }

Deeper: [DR testing](/posts/projects/platform-wardens/16-support-and-maintenance/#disaster-recovery-testing), [backup](/posts/projects/platform-wardens/07-data-and-integration/#backup-and-restore-strategy).

</div>

<div class="iq-role" data-role="devops" markdown="1">

- **Rebuild from code:** the cluster from Terragrunt, everything in it from gitops; secrets re-synced from OpenBao.
- **Data from dumps:** restore `wardens-state-db` from the newest dump; Temporal can start empty.
- **Gotcha:** any change to a k3d cluster's rendered config recreates the cluster, so a careless config change is itself a DR event.

```bash
kubectl --context k3d-wardens -n wardens-state-db exec -i deploy/wardens-state-db -- pg_restore -U postgres -d wardens < <dump>
argocd app sync -l cluster=wardens
```

The gap: the restore command above is what I'd run; it hasn't been rehearsed.

</div>

<div class="iq-role" data-role="sre" markdown="1">

What I'd put on a page before agreeing targets:

| Signal | Today |
|---|---|
| Scheduled runs on time | Paused or missed schedule alerts |
| Runs finishing | Failed runs, runs near deadline |
| Records stored | `WardensRunRecordNotStored` |
| Dumps fresh | Alert if the newest dump is late |

Then pick an SLO the users feel ("drift's findings by 09:00 UTC on 99% of days") and an RPO for audit
that matches how the audit is used (incident review needs the last day). The gap: none of these are
written as SLOs yet.

</div>

</details>

<details class="project-iq" markdown="1" id="reliability-and-resilience-q3">
<summary>How do you make jobs and deployments safe to retry?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Jobs: every start is keyed so a repeat is a no-op (workflow ids from the source event), every write is
once (run records), every act is idempotent or run once (drift re-checks the patch hash and the kill switch
before writing a branch, at most one open PR per stack), and approvals are bound to the action's
idempotency key.

Deployments: images by digest, so a redeploy is the same bytes; schema migrations idempotent, run by a Job
named after the newest migration; workflow code changes behind `workflow.patched` and replay-tested, so a
deploy mid-run doesn't break the run.

Deeper: [rollback](/posts/projects/platform-wardens/12-cicd-and-release-management/#rollback-and-roll-forward-procedures), [business rules](/posts/projects/platform-wardens/02-requirements-gathering/#business-rules).

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Deterministic workflow, retryable activities:** `workflow.py` has no I/O, so Temporal can replay it; activities are where retries happen.
- **`workflow.patched`** for any change to running workflow code, and a CI replay of recorded histories:

```python
# wardens/durable/incident.py: children run in parallel only for incidents started after the change
limit = incident.max_parallel if workflow.patched(PARALLEL_PATCH) else 1
```

```bash
uv run --directory framework pytest -q tests/test_durable.py   # includes replaying framework/tests/histories
```

The gotcha: the patch has to stay until every workflow that started before it has finished, which for an
approval wait can be days.

</div>

<div class="iq-role" data-role="devops" markdown="1">

- **Images by digest,** never tags; the gitops commit is the deploy and the rollback.
- **Schema Job** idempotent and named after the migration, not a hook, so self-heal can't re-run a different one.
- **Sync waves:** secrets before the schema Job, the schema before the apps that use it.

```bash
git -C homelab-gitops revert <digest-commit> && git -C homelab-gitops push
argocd app wait terraform-drift --health
```

The gap: no canary; a framework change rolls every worker at once.

</div>

</details>

## Testing and Quality
{: #testing-and-quality }

<details class="project-iq" markdown="1" id="testing-and-quality-q1">
<summary>What is your testing strategy across the frontend, backend and data?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Two halves. The code around the model is ordinary software: about 960 tests across the workspace, the
framework's against a local Temporal with toy agents, agents' with recorded fixtures and Pydantic AI's
`TestModel`; no test calls a live model. What the model says is evaluated, not unit-tested: eval sets per
action, scored against expected outcomes, re-run on any model, prompt, tool or policy change.

There's no frontend to speak of and the data layer is tested against Postgres. The honest gap is the eval
sets: every agent in shadow is short of the 30 cases per action the framework asks for.

Deeper: [testing](/posts/projects/platform-wardens/10-quality-assurance/#unit-testing), [evals](/posts/projects/platform-wardens/10-quality-assurance/#regression-testing).

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Toy agents** (`toy_agent.py`, `incident_agents.py`, `approval_agent.py`, `schedule_agent.py`) exercise the framework without a real agent's I/O.
- **`TestModel`** for every model stage; recorded fixtures for GitHub and Azure.
- **Replay** of recorded workflow histories.
- **Every console sample** built into a root task in CI.

```bash
uv run --directory framework pytest -q
WARDENS_SKIP_TEMPORAL=1 uv run --directory agents/devops/terraform-drift pytest -q tests/unit
```

The gotcha: the framework tests download a Temporal dev server once; on a runner without network that
first run fails.

</div>

</details>

<details class="project-iq" markdown="1" id="testing-and-quality-q2">
<summary>How do you test integrations with external systems?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Three levels. Recorded fixtures in unit tests (real API responses and logs, scrubbed), so behaviour against
the external system is pinned. A failure lab for CI/CD triage: a private repository with 17 seeded faults
across six build tools, each failing its own pipeline, so the agent reads real failed runs that nobody
minds. And one live run per new path on the homelab, written down: the drift-to-correlator handoff on a
real portal deletion, a test alert through the bus, the web-search grant refused to an agent without it.

The rule for a provider's own integration (an MCP server) is an acceptance test before it's used.

Deeper: [test data](/posts/projects/platform-wardens/10-quality-assurance/#test-data-and-test-environment-management), [integration](/posts/projects/platform-wardens/09-implementation/#integration-development).

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Harvesting cases:** drift's cases were harvested from real `infra-azure` scans into YAML with the expected classification and recommendation.
- **Deterministic scoring:** `evaluation.py` runs stages 3 to 9 on a case's stored inputs, with no GitHub or Azure access, and checks attribute, YAML key, classification, allowed kinds and forbidden actions.

```python
if forbidden:
    failures.append(f"forbidden actions proposed: {forbidden}")
```

```bash
uv run --directory agents/devops/terraform-drift python -m terraform_drift.evaluation
```

The gotcha: none of drift's 10 cases has labelled drift yet, so the most important behaviour is the least
measured.

</div>

<div class="iq-role" data-role="devops" markdown="1">

For integrations that only exist in the cluster, the smoke check runs in the agent's own pod, with its own
identity and keys:

```bash
kubectl --context k3d-wardens -n terraform-drift exec deploy/terraform-drift -- python -m wardens.runtime.mcp_check --manifest <path to manifest.yaml>
```

It proves a granted tool works and the server's log names the agent with the run's trace id, and that a
tool not granted is refused. The failure lab is managed as code in the GitHub org's IaC repo. The gap:
these checks are run by hand after a deploy, not by a pipeline.

</div>

</details>

<details class="project-iq" markdown="1" id="testing-and-quality-q3">
<summary>Which quality gates does code pass before it merges and ships?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Before merge: the workflow's tests on the homelab runner (`uv sync --frozen`, framework tests, the agent's
tests), and for a change to a model, prompt, tool or policy, the agent's evals, with no merge if the pass
rate falls or the false-action rate rises. Review by someone other than the author.

Before ship: the image gates (Gitleaks, Semgrep, Trivy, Checkov, Hadolint), an SBOM, a Cosign signature,
and Kyverno admitting only digest-pinned images. Then the lifecycle gates, which are evidence files, not
pipeline steps.

Deeper: [scanning](/posts/projects/platform-wardens/12-cicd-and-release-management/#static-analysis-and-security-scanning), [gates](/posts/projects/platform-wardens/12-cicd-and-release-management/#approval-gates).

</div>

<div class="iq-role" data-role="developer" markdown="1">

What a developer runs before pushing:

```bash
uv sync --frozen
uv run --directory framework pytest -q
uv run --directory agents/devops/<agent> pytest -q tests/unit
```

And the rules a reviewer checks: no `temporalio` or model client outside their module, no I/O in
`workflow.py`, schema changes with every caller, the conformance matrix and module table updated, the
README matching the manifest. The gap: there's no linter or PR template enforcing those; it's review.

</div>

<div class="iq-role" data-role="devops" markdown="1">

The pipeline gates, in order: tests on the self-hosted runner, then the reusable build's Gitleaks, Semgrep,
Trivy, Checkov and Hadolint, the SBOM and Cosign, the push to the registry, the digest commit, and Kyverno
at admission.

```bash
gh run list --workflow terraform-drift.yaml --limit 5
gh run view <id> --log-failed
```

The gotcha that bit twice: a CVE in a base image's `apt` blocked every build until the
image took the newer package, then Checkov needed an `apt-get upgrade` in the Dockerfile.

</div>

</details>

## Infrastructure and Environments
{: #infrastructure-and-environments }

<details class="project-iq" markdown="1" id="infrastructure-and-environments-q1">
<summary>Where and how is the application hosted, and why there?</summary>

<div class="iq-role" data-role="architect" markdown="1">

On its own k3d cluster, `wardens`, on the homelab PC, beside the platform's other clusters. It reuses
what the platform already runs instead of rebuilding it: models from `ai` through LiteLLM, telemetry to
`mon`, secrets from OpenBao in `core`, deploys from Argo CD in `platform`.

Why a cluster of its own: the agents get their own blast radius, their own NetworkPolicies and their own
service-account issuer for Azure federation, and the cluster can be rebuilt without touching the rest.
Why the homelab first: it's the real environment the agents have work in, with real drift, real alerts
and real failed pipelines, at the cost of electricity.

The Azure target is designed and not built: AKS per landing zone, Temporal on Azure Database for
PostgreSQL, Foundry behind APIM, Entra Workload ID, Key Vault.

Deeper: [production](/posts/projects/platform-wardens/11-infrastructure-and-environments/#production-environment), [hosting and deployment](/posts/projects/platform-wardens/05-technical-architecture/#hosting-and-deployment-model).

</div>

<div class="iq-role" data-role="devops" markdown="1">

- **Cluster:** k3d, API `172.30.0.1:6446`, load balancer `172.30.0.6`, created by Terragrunt in `infra-local`.
- **In it:** Temporal (`clusters/wardens/temporal.yaml` in gitops), `wardens-db`, `wardens-state-db`, `wardens-console`, one namespace per agent, `mcp-web-search`.
- **Workloads:** Deployments and Jobs with requests, a memory limit, read-only root, restricted security context.

```bash
kubectl --context k3d-wardens get ns
kubectl --context k3d-wardens get deploy -A | grep -v kube-system
```

The gotcha: k3d nodes are restarted with `k3d cluster stop/start`, never `docker restart`, which drops
the nodes' host aliases.

</div>

<div class="iq-role" data-role="sre" markdown="1">

What I'd watch about where it runs: it's one host. The PC going down takes the agents, Temporal and the
state store with it; the work waits rather than being lost (Temporal resumes, the daily schedule catches
up within a day), but nothing runs.

```bash
kubectl --context k3d-wardens get pods -A --field-selector=status.phase!=Running
k3d cluster list
```

Dependencies across clusters are the other risk: no models if `ai` or the GPU host is down (stages fall
back), no secrets refresh if `core` is down. The gap: no alert that names "the wardens cluster is
unreachable" as one thing rather than many failing targets.

</div>

</details>

<details class="project-iq" markdown="1" id="infrastructure-and-environments-q2">
<summary>Which environments exist, and how close is local development to production?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Three setups, one codebase:

| | Local | Homelab | Azure target |
|---|---|---|---|
| Temporal | Dev server | Self-hosted on Postgres | On Azure Database for PostgreSQL |
| Models | Any OpenAI-compatible endpoint | LiteLLM to local models | Foundry behind APIM |
| Secrets | Environment | OpenBao | Key Vault |

There's no shared test environment and deliberately no staging for agents: the shadow stage replaces it.
An agent runs on live inputs at L0, can't act, and people score each run, which is better evidence than a
staging copy. The code doesn't change between setups; only configuration does.

The trade-off: framework changes have no staging to catch them, only tests and history replay.

Deeper: [parity](/posts/projects/platform-wardens/11-infrastructure-and-environments/#environment-parity), [why no staging](/posts/projects/platform-wardens/11-infrastructure-and-environments/#staging-environment).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Local is close because the parts that differ are behind configuration:

```bash
uv run python -m wardens.runtime.console --dev-server     # console + local Temporal and its UI
cd agents/devops/terraform-drift && uv run python -m terraform_drift.worker run   # second terminal
```

- **Models:** `WARDENS_LLM_*` points at the homelab's LiteLLM or any OpenAI-compatible endpoint.
- **GitHub:** my own token for reads; without a write token nothing gets opened.
- **State:** run records and audit to local files unless `WARDENS_STATE_DSN` is set.

The gotcha: the local path never exercises federation or the GitHub App; those only run in the cluster.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Parity is kept by the chart: every agent is a wrapper over the shared `wardens-agent` chart, so the
differences between agents are values (image digest, schedules, secrets, egress), not templates.

```yaml
dependencies:
  - name: wardens-agent
    version: 0.1.6
    repository: file://../../charts/wardens-agent
```

```bash
helm template apps/terraform-drift | kubectl --context k3d-wardens diff -f - | head
```

The gap: the Azure target exists only on paper, so "parity" today is between a laptop and the homelab.

</div>

</details>

<details class="project-iq" markdown="1" id="infrastructure-and-environments-q3">
<summary>How is the infrastructure provisioned and configured?</summary>

<div class="iq-role" data-role="architect" markdown="1">

As code, split by what changes it:

| What | Where |
|---|---|
| The k3d cluster, network, host scripts | `infra-local` (Terragrunt) |
| Everything inside it | `homelab-gitops` (Argo CD) |
| Each agent's Entra app and federated credential | `infra-azure` |
| The OIDC issuer | A Cloudflare Worker serving the discovery and JWKS files |
| Secrets | OpenBao, seeded by host scripts |

Nothing in the wardens repo deploys anything; it builds images and writes digests. That split means a
change to an agent never needs cluster credentials in CI.

Deeper: [IaC](/posts/projects/platform-wardens/11-infrastructure-and-environments/#infrastructure-as-code), [configuration](/posts/projects/platform-wardens/11-infrastructure-and-environments/#configuration-and-secret-management).

</div>

<div class="iq-role" data-role="devops" markdown="1">

```bash
# the cluster (homelab PC)
cd /mnt/gitrepos/cloudutsuk/iac/infra-local && ~/.venvs/iac/bin/python entrypoint.py --cloud k3d --environment homelab --stack wardens --terragrunt plan
# the service-account issuer, after every rebuild of wardens
host/wardens/publish-oidc.sh --check
# secrets for the agents
host/wardens/configure.sh
```

Then Argo CD takes over from `clusters/wardens/*.yaml`. The gotcha: any change to the cluster's rendered
k3d config recreates it, and a recreated cluster has a new issuer key, so `publish-oidc.sh` has to run
again or every Azure call fails.

</div>

</details>

## CI/CD and Deployment
{: #ci-cd-and-deployment }

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q1">
<summary>Walk me through the pipeline from commit to production.</summary>

<div class="iq-role" data-role="architect" markdown="1">

1. A pull request runs the image's tests on the homelab runner (`uv sync --frozen`, framework and agent tests).
2. Review, merge to `main`.
3. The platform's reusable build: Gitleaks, Semgrep, Trivy, Checkov, Hadolint, a multi-arch image, an SBOM, a Cosign signature, a push to Zot.
4. The digest is committed to `homelab-gitops` (`apps/<agent>/values.yaml`).
5. Argo CD syncs `wardens`; Kyverno admits only the digest-pinned image.
6. Temporal hands running workflows to the new worker.

CI never talks to the cluster. Each image has its own workflow and builds only when its code changes.

Deeper: [build](/posts/projects/platform-wardens/12-cicd-and-release-management/#build-automation), [deployment](/posts/projects/platform-wardens/12-cicd-and-release-management/#deployment-automation).

</div>

<div class="iq-role" data-role="devops" markdown="1">

```yaml
jobs:
  test:
    runs-on: homelab
  build:
    uses: cloudutsukpilot/homelab-gitops/.github/workflows/build-image.yaml@main
```

- **Path filters:** docs-only changes build nothing; `*.prompt.md` counts as code.
- **Build context:** the repo root, because images need the workspace lock, `framework/` and `contracts/`.

```bash
gh run list --workflow terraform-drift.yaml --limit 5
argocd app get terraform-drift
```

The gotcha: a framework change rebuilds every image that contains it, so one PR can roll every worker.

</div>

</details>

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q2">
<summary>Which deployment strategy do you use, and how do you roll back?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Recreate-style rolling updates of stateless workers, made safe by Temporal: a running workflow continues
on the new worker from its last completed activity. The strategy that matters more is for behaviour, not
bytes: a new agent goes to shadow (L0) first, and promotion to a higher level is a gate with evidence
from that exact digest.

Rollback: revert the digest commit in gitops. But a misbehaving agent is stopped first with the kill
switch (within 60 seconds), and rolled back second.

> **TODO:** A rollback (revert the digest, confirm the old worker resumes a running workflow) hasn't been
> rehearsed on `wardens`.
{: .prompt-warning }

Deeper: [rollback](/posts/projects/platform-wardens/12-cicd-and-release-management/#rollback-and-roll-forward-procedures), [gates](/posts/projects/platform-wardens/12-cicd-and-release-management/#approval-gates).

</div>

<div class="iq-role" data-role="devops" markdown="1">

```bash
cd /home/sakharam/gitrepos/cloudutsuk/homelab-gitops && git revert <digest-commit> && git push
argocd app wait terraform-drift --health --timeout 300
```

- **No canary:** a framework change reaches every worker at once.
- **Sync waves:** secrets, then schema Jobs, then the apps.
- **Workflow code** behind `workflow.patched`, replayed against recorded histories in CI, so rolling forward or back doesn't break a waiting run.

The gap: the rollback path is the normal gitops one; it hasn't been rehearsed against a run in flight.

</div>

<div class="iq-role" data-role="sre" markdown="1">

How I'd know a deploy went wrong: run failures and "worker not polling" alerts within minutes, the
workflow dashboard's per-queue table, and the agent detail dashboard's runs by outcome before and after.

```bash
temporal task-queue describe --task-queue terraform-drift --namespace wardens
temporal workflow list --namespace wardens --query 'ExecutionStatus="Failed"' --limit 10
```

The order of operations when it does: kill switch if the agent might act wrongly, otherwise revert the
digest. The gap: no deploy annotations on the dashboards, so "after the deploy" is read from times.

</div>

</details>

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q3">
<summary>How do data and schema changes ship alongside application changes?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Two databases, two rules. Temporal's database is resettable by design: no business data, its schema Job
comes with the chart. The state store holds run records, the audit chain, kill switches and memory, so its
migrations are numbered, idempotent and forward-only, shipped in the console image and run by a Job named
after the newest migration (`wardens-state-schema-0006`), in a sync wave after secrets and before the apps.

Data shape changes are contract changes: every record carries `schemaVersion`, schemas reject unknown
fields, and a schema change ships with every caller in the same PR.

Deeper: [database deployment](/posts/projects/platform-wardens/12-cicd-and-release-management/#database-deployment-strategy), [schema and migrations](/posts/projects/platform-wardens/07-data-and-integration/#database-schema-and-migrations).

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Migrations** `0001` to `0006` in `wardens/state/migrations/`, applied under an advisory lock so two Jobs can't race.
- **Idempotent DDL** so a re-run is harmless.
- **Contracts first:** a change to `contracts/schemas/*.json` updates the Pydantic models and every caller together.

```sql
CREATE TABLE wardens.kill_switches (
```

```bash
uv run --directory framework pytest -q tests/test_state_postgres.py tests/test_state_postgres_stores.py
```

The gotcha: there's no down migration; a bad migration is fixed by the next one.

</div>

<div class="iq-role" data-role="devops" markdown="1">

The Job is named after the migration, not an Argo CD hook, so self-heal can't re-run a different one and
a new migration is a new Job:

```bash
kubectl --context k3d-wardens -n wardens-state-db get jobs
kubectl --context k3d-wardens -n wardens-state-db logs job/wardens-state-schema-0006
```

Order is a sync wave: the `ExternalSecret`, then the schema Job, then the console and agents that read
the tables. The gap: nothing stops an image that expects migration 0007 from starting before the 0007 Job
has run, apart from the wave order.

</div>

</details>

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q4">
<summary>How do you manage configuration and versions across environments?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The manifest is the source of truth for what an agent is and may do (capabilities, tools, level, schedules,
cost ceiling, kill-switch operators); CI checks it against the registry's rules. Everything that differs
per environment is configuration: environment variables, OpenBao paths, the values file in gitops. Code
never reads a hostname or a secret from itself; placeholders are refused.

Versions: each agent has `version` and a `CHANGELOG.md`, images are identified by digest, and the gitops
commit that changed the digest is the release record.

Deeper: [configuration](/posts/projects/platform-wardens/11-infrastructure-and-environments/#configuration-and-secret-management), [versioning](/posts/projects/platform-wardens/12-cicd-and-release-management/#versioning-and-release-notes).

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Manifest** in the agent's folder: the source of truth, validated by the JSON Schema and the registry's cross-field rules.
- **Settings** from the environment through `WorkerSettings`; a placeholder value is refused at start.
- **Model prices** are configuration too: a model with no price stops the worker (`UnpricedModelError`).

```bash
uv run --directory framework pytest -q tests/test_runtime.py tests/test_llm_providers.py
```

The gotcha that happened: the homelab's chat model was renamed, the new name had no price, and the drift
worker refused to start until it did. A failure at start is the right one.

</div>

<div class="iq-role" data-role="devops" markdown="1">

```yaml
# homelab-gitops apps/terraform-drift/values.yaml (shape)
wardens-agent:
  image: {repository: …/platform/terraform-drift, digest: sha256:…}   # written by CI
  secretEnv: [...]                                                   # OpenBao paths
```

- **Pinned:** images by digest, charts by version, Actions by commit SHA, Python by `uv.lock`.
- **One values file per agent;** the shared chart's version moves deliberately with its own changelog.

```bash
git -C homelab-gitops log --oneline -5 -- apps/terraform-drift/values.yaml
```

The gap: only one environment exists, so "across environments" is still a design.

</div>

</details>

## Monitoring and Observability
{: #monitoring-and-observability }

<details class="project-iq" markdown="1" id="monitoring-and-observability-q1">
<summary>How do you know the system is healthy in production?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Three layers, all in `mon`: the agents (runs, findings, cost, guardrail decisions, handoffs, kill switch),
Temporal (worker metrics, and an observer every 15 seconds for running workflows by age and each
schedule's last and next fire), and the platform (nodes, pods, the event bus).

Healthy means: scheduled runs fired and finished, nothing refused at the tool point, no run near its
deadline or over its cost ceiling, workers polling, no dead letters. Telemetry is a no-op without an endpoint and
never fails a run.

The trade-off: "healthy" for an agent also means "right", which telemetry can't tell; the shadow scores
and eval runs do.

Deeper: [monitoring](/posts/projects/platform-wardens/14-operations-and-observability/#application-and-infrastructure-monitoring).

</div>

<div class="iq-role" data-role="devops" markdown="1">

- **Telemetry path:** OTLP from the workers to the cluster's collector, then `mon`.
- **Dashboards as code** in gitops, checked by `scripts/dashboards.py --check`.
- **Health endpoints:** `/healthz` on the console, both relays and the consumer; workers have none.

```bash
python3 scripts/dashboards.py --check
curl -s https://<console-host>/healthz
```

The gotcha that became a rule: delta-temporality counters reached Mimir as one sample per run and left
every `rate()` panel empty, so workers export cumulative metrics.

</div>

<div class="iq-role" data-role="sre" markdown="1">

```promql
sum by (agent, final_state) (increase(wardens_runs_total[1d]))
```

I'd read, in order: Fleet operations (anything failing, refused or stuck), the Temporal dashboard
(schedules' next fire, workers polling), then model usage and cost. Panels read 0 rather than "No data"
for a counter that hasn't counted yet, so an empty panel means a problem.

The gap: no SLOs, so "healthy" is a set of alerts that are quiet, not an error budget.

> **TODO:** Availability and time-to-first-diagnosis targets aren't agreed.
{: .prompt-warning }

</div>

</details>

<details class="project-iq" markdown="1" id="monitoring-and-observability-q2">
<summary>What do you log, measure and alert on?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Signal | What |
|---|---|
| Traces | One per correlation id: ingress, incident, entry, agent, `chat`, `execute_tool` |
| Metrics | Runs, findings, tokens, cost, guardrail decisions, handoffs, approvals, kill switch, the bus |
| Logs | Structured where it matters (one JSON line per webhook delivery); prompts only at debug, redacted |
| Run records | The durable account of every run, separate from telemetry |
| Audit | Append-only, hash-chained, daily head in `mon` |

Alerts carry P1 to P4 and a runbook link: safety (a guardrail denial at the tool point is P1), reliability,
cost, approvals, the bus. Shadow agents' alerts are downgraded a priority.

Deeper: [alerting](/posts/projects/platform-wardens/14-operations-and-observability/#alerting-and-escalation), [tracing](/posts/projects/platform-wardens/14-operations-and-observability/#distributed-tracing).

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Deterministic span ids** so processes that never talk still join one trace:

```python
def span_id(kind: str, correlation_id: str, key: str) -> int:
    return int.from_bytes(hashlib.sha256(f"{kind}:{correlation_id}:{key}".encode()).digest()[:8], "big") or 1
```

- **Redaction** before telemetry, in `wardens.telemetry`.
- **GenAI semantic conventions** pinned, because they aren't stable.

The gap: `chat` and `execute_tool` spans are written from the run record after the activity, not live, so
a hung model call shows only when it ends.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Alert rules live in Mimir, tested with promtool, each with a priority and a runbook link:

```text
WardensRunRecordNotStored     records fell back to the local file
WardensIngressDown / RelayRefusing / LagHigh / DeadLettered / BusReset
a missed or paused schedule, a run near its deadline, a worker not polling
WardensDailyCostOverBudget / RunCostOverCeiling / CostPerRunAnomaly
```

```bash
promtool test rules <rules-test>.yaml
```

The gap: a paused-schedule alert and several runbook sections haven't been fired on purpose; the bus's
`BusReset` has, once, as expected.

</div>

</details>

<details class="project-iq" markdown="1" id="monitoring-and-observability-q3">
<summary>Walk me through how you would troubleshoot a production issue in this system.</summary>

<div class="iq-role" data-role="architect" markdown="1">

Contain first, then follow the correlation id. If an agent might act wrongly, the kill switch stops it
within 60 seconds. Then the correlation id is the trace id, so one search gives the whole path: was the
event received, filtered or refused at the edge; did the router start a run; which stage, tool or model
call failed; what the guardrails decided. The run record holds the evidence and decisions behind it.

Then decide: demote (no gate needed), fix, or retire. A wrong answer, as opposed to wrong code, becomes an
eval case.

Deeper: [incident response](/posts/projects/platform-wardens/16-support-and-maintenance/#incident-response), [problem management](/posts/projects/platform-wardens/14-operations-and-observability/#incident-and-problem-management).

</div>

<div class="iq-role" data-role="devops" markdown="1">

```bash
# did the event arrive?
kubectl --context k3d-wardens -n wardens-console logs deploy/wardens-hooks --since=1h | grep <delivery-id>
# did a run start?
temporal workflow list --namespace wardens --query 'WorkflowId STARTS_WITH "terraform-drift"' --limit 5
# what did it do?
temporal workflow show --workflow-id <id> --namespace wardens
```

Then Tempo by trace id, and the run record. The gotcha: GitHub doesn't retry a delivery the relay
answered with 503, so "nothing happened" can mean the bus was refusing at that moment.

</div>

<div class="iq-role" data-role="sre" markdown="1">

My order: is it one agent or all of them (Fleet dashboard), is it the platform (Temporal, the state
store, the bus, models), or is it the input (the drift scan that feeds the agent failed)?

A real one: a scheduled drift run had nothing to explain because the daily drift scan had failed before
planning. The agent was fine; the pipeline that feeds it wasn't. The lesson: an agent is only as good as
its inputs, and the scan's failure needs its own alert.

```bash
gh run list --repo cloudutsukpilot/infra-azure --workflow terragrunt-cicd.yaml --limit 3
```

The gap: that alert on the scan isn't built yet.

</div>

</details>

## Cost, Maintenance and Support
{: #cost-maintenance-and-support }

<details class="project-iq" markdown="1" id="cost-maintenance-and-support-q1">
<summary>What drives the cost of running the system, and how do you keep it under control?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The model is the cost driver; everything else is a small cluster. On the homelab the real cost is
electricity, so every model call is priced at what the same call would cost on Foundry. That makes the
ceilings mean something and makes an optimisation measurable before it matters.

Control is in code, not a monthly bill: a ceiling per run and per day in each manifest (drift: $0.50 a run,
$20 a day), checked at submission and on every model call; a handoff can't exceed the target agent's
ceiling; a model with no price stops the worker. The cheapest lever is design: decide in code, let the model
only explain.

Deeper: [cost optimisation](/posts/projects/platform-wardens/18-continuous-improvement/#cost-optimization), [cost monitoring](/posts/projects/platform-wardens/14-operations-and-observability/#capacity-and-cost-monitoring).

</div>

<div class="iq-role" data-role="devops" markdown="1">

- **`usage_limits`** in `wardens/llm/limits.py`: a free model gets only the request limit; an unpriced one only warns there, and the worker refuses it at start.
- **Prices** in configuration, per model.
- **Dashboard:** model usage and cost, per agent and model, against ceilings.

```yaml
costCeiling: {perRunUsd: 0.50, perDayUsd: 20}
```

The gap: per-caller budgets on shared agents don't exist yet, so one domain's storm could use another's
share of a common agent.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Alerts when a day's cost goes over its ceiling (and again at twice it), when the average run is over
the per-run ceiling, and when cost per run doubles against its 7-day average:

```promql
sum by (cluster, agent) (increase(wardens_run_cost_USD_sum[24h]))
  > on (cluster, agent) max by (cluster, agent) (wardens_agent_cost_ceiling_USD{period="day"})
```

What I'd look at when one fires: tokens per run (a prompt that grew), calls per run (a loop or retries),
the model mix (a stage that moved to the big model). The gap: the prices are estimates, so this protects
the shape of the spend, not a real invoice.

</div>

</details>

<details class="project-iq" markdown="1" id="cost-maintenance-and-support-q2">
<summary>How is the system maintained and supported after go-live?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Each agent has an owner and a reviewer from another domain; the framework has an owner; the cluster is
the platform's. Support is the operator role: score shadow runs, approve actions later, pull the kill
switch.

Two kinds of bug, two paths: wrong code gets an issue and a PR with a test; a wrong answer becomes a new
eval case the fix must pass. Upgrades with care: Temporal (replay histories first), Pydantic AI (re-run
evals), a model (a re-evaluation). The module table's *Not yet* column is the debt list.

Deeper: [ownership](/posts/projects/platform-wardens/16-support-and-maintenance/#support-model-and-ownership), [upgrades](/posts/projects/platform-wardens/16-support-and-maintenance/#patch-and-upgrade-management).

</div>

<div class="iq-role" data-role="devops" markdown="1">

- **One `uv.lock`,** updated deliberately; `uv sync --frozen` fails CI on a stale lock.
- **MCP client packages** only take releases at least 14 days old.
- **Base images:** the gates catch CVEs; an `apt` CVE needed a newer package before the base image had it, then Checkov needed `apt-get upgrade` instead of naming the package.

```bash
uv lock --upgrade-package pydantic-ai && uv run --directory framework pytest -q
```

The gap: no Renovate or Dependabot; updates are manual.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Runbooks per agent (`docs/runbook.md`) and a section per alert. Honest state: the template is good, most
content is thin. The first real entry came from a real failure: "worker exits at start with
`UnpricedModelError`".

What I'd add first: the kill-switch drill with its date, a restore test of the state store, and an
on-call note for "the bus is refusing".

> **TODO:** A restore of the state store hasn't been tested.
{: .prompt-warning }

</div>

</details>

## Leadership, Stakeholders and Governance
{: #leadership-stakeholders-and-governance }

<details class="project-iq" markdown="1" id="leadership-stakeholders-and-governance-q1">
<summary>How did you communicate the architecture and progress to stakeholders and executives?</summary>

<div class="iq-role" data-role="architect" markdown="1">

In layers, for different readers:

- **Executives:** executive summaries and a slide deck in the repo's `reports/`, built around the goal (agents do the routine work, people govern them) and the measures (coverage, toil absorbed, quality, speed, cost, reuse).
- **Engineers:** interactive system diagrams whose use cases replay one request through the real components, and design categories with what's decided and what's open.
- **Progress:** a phased roadmap with numbered steps and a status per step, and this public playbook, kept in step with each phase.

What worked best was showing the gates: a promotion is a file with evidence, so "can it act yet?" has a
document as its answer, not an opinion.

Deeper: [stakeholders](/posts/projects/platform-wardens/01-vision-and-business-context/#stakeholders-sponsors-and-decision-makers), [roadmap](/posts/projects/platform-wardens/03-product-planning/#phase-steps).

</div>

</details>

<details class="project-iq" markdown="1" id="leadership-stakeholders-and-governance-q2">
<summary>How do you document and govern architectural decisions?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Numbered decision records in the repo, in MADR shape (context, decision, options considered,
consequences), published in this playbook's ADR log. A design change needs a record; the record names the
options I didn't pick and why.

Governance is a reference standard the design conforms to, tracked category by category in a conformance
matrix, plus the lifecycle gates. Proposed records are reviewed against the build: seventeen came out of
the homelab build and a gap review against a public enterprise blueprint, and the review's job is to accept
the proven ones and supersede the disproven ones, as Event Hubs at the edge superseded Service Bus.

Deeper: [governance](/posts/projects/platform-wardens/17-governance-and-compliance/#project-governance), [architecture reviews](/posts/projects/platform-wardens/18-continuous-improvement/#architecture-reviews).

</div>

</details>

<details class="project-iq" markdown="1" id="leadership-stakeholders-and-governance-q3">
<summary>How did you bring other engineers onto the project?</summary>

<div class="iq-role" data-role="architect" markdown="1">

By making the reference agent the onboarding. A new contributor reads the README, then the repo's rules
(layers, import rules, determinism, manifest as source of truth, contracts first), then Terraform Drift
end to end, then the agent template and the how-doc on building an agent.

The structure does a lot of the teaching: the framework owns everything hard (durability, guardrails,
telemetry, the run record), so a new agent is mostly its manifest, its tools and its stages. The ownership
model asks for a reviewer from another domain on every agent, which spreads knowledge by design.

> **TODO:** How many engineers have built an agent on the framework besides the author, and how long did
> their first one take?
{: .prompt-warning }

Deeper: [onboarding](/posts/projects/platform-wardens/15-documentation-and-knowledge-transfer/#onboarding-documentation).

</div>

<div class="iq-role" data-role="developer" markdown="1">

What I'd hand a new developer on day one:

```bash
cp -r templates/agent agents/<domain>/<new-agent>
uv run python -m wardens.runtime.console --dev-server
cd agents/devops/terraform-drift && uv run pytest -q tests/unit
```

- **The rules that bite first:** no `temporalio` or model client outside their module, no I/O in `workflow.py`, act tools never model-callable, every denial test with an allowed twin.
- **The checklist:** manifest, README matching the manifest, eval cases, runbook, the conformance row.

The gap: no linter or PR template enforces those rules; review does.

</div>

</details>

## Lessons Learned and Trade-offs
{: #lessons-learned-and-trade-offs }

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q1">
<summary>What was the hardest technical problem, and how did you solve it?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Making one alert read as one story across processes that never call each other: the relay, the bus
consumer, the incident workflow, several agents' workers, all durable, all replayable. A normal trace
context can't cross a durable replay or an event bus cleanly.

The solution was to make the correlation id the trace id and derive every span id from it: a hash of the
span's kind, the correlation id and a key. Any process can write its spans after the fact and they join
the same trace, and a replay writes the same ids instead of duplicates.

The trade-off: spans are written from the run record after an activity finishes, not live, so a hung call
only appears when it ends.

Deeper: [tracing](/posts/projects/platform-wardens/14-operations-and-observability/#distributed-tracing).

</div>

<div class="iq-role" data-role="developer" markdown="1">

```python
def span_id(kind: str, correlation_id: str, key: str) -> int:
    return int.from_bytes(hashlib.sha256(f"{kind}:{correlation_id}:{key}".encode()).digest()[:8], "big") or 1   # never 0: OTel treats 0 as invalid
```

- **Trace id** from the correlation id, so the consumer and the workflow agree without passing context.
- **Idempotent writes:** a replayed activity produces the same span, not a second one.

```bash
uv run --directory framework pytest -q tests/test_tracing.py
```

The gap: live `chat` and `execute_tool` spans from the agent library's own hooks aren't built yet.

</div>

</details>

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q2">
<summary>What would you do differently if you started again?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Three things:

1. **Eval cases before the agent.** Every agent went into shadow short of the 30 cases per action the framework asks for; drift's 10 cases have no labelled drift yet.
2. **The edge as a bus from day one.** The webhooks first called Temporal directly, so a burst held a thread per request; relay mode through a bus fixed it, and Event Hubs replaced the first choice, Service Bus.
3. **Telemetry contracts first.** Delta counters and millisecond buckets on second-scale histograms both produced dashboards that looked fine and showed nothing.

What I'd keep: guardrails in code, the manifest as the source of truth, Temporal underneath.

Deeper: [retrospectives](/posts/projects/platform-wardens/18-continuous-improvement/#retrospectives), [what was built](/posts/projects/platform-wardens/09-implementation/#feature-development).

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Write the eval harness with the first stage,** not after the agent works; harvesting real cases later is slow.
- **Keep `workflow.py` tiny from the start;** every change to it later needs `workflow.patched` and replay tests.
- **Typed outputs everywhere** paid off; I'd add the "fall back to unknown" path to every model stage on day one, not after the first malformed answer.

```bash
uv run --directory agents/devops/terraform-drift python -m terraform_drift.evaluation
```

The gap that remains: cases are still being collected for every agent.

</div>

<div class="iq-role" data-role="devops" markdown="1">

- **One GitHub App per agent from the start,** rather than tokens first; it spreads rate limits and makes permissions reviewable.
- **Cumulative metrics and real histogram bounds** in the first dashboard PR.
- **The OIDC issuer step in the cluster's runbook,** since a recreated cluster silently breaks Azure federation until it's re-published.

```bash
host/wardens/publish-oidc.sh --check
```

The gap: secret rotation is still manual and needs a worker restart.

</div>

</details>

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q3">
<summary>What technical debt exists today, and how would you pay it down?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Debt | Paying it down |
|---|---|
| Eval sets below 30 cases per action | Every wrong production run becomes a case; harvest from the failure lab |
| Runbooks partly template | Fill from real incidents; kill-switch drill with a date |
| No restore or rollback rehearsal | Timed restore of the state store; revert a digest with a run in flight |
| No SLOs | Pick two the users feel, with targets |
| 17 proposed ADRs | Accept the proven, supersede the disproven |
| Inter-agent auth by namespace only | A decision on signed caller assertions |

The rule: debt lives in the module table's *Not yet* column and agents' folders, and closes in the PR that
fixes it.

Deeper: [debt](/posts/projects/platform-wardens/16-support-and-maintenance/#technical-debt-management).

</div>

<div class="iq-role" data-role="developer" markdown="1">

- **Live spans** from the agent library's hooks instead of writing them after the activity.
- **Structured log export** from the framework (it's in the telemetry module's *Not yet* column).
- **Connection pooling** in the state store (one connection per operation today).
- **A linter in CI;** today there's none.

```bash
grep -n "Not yet" -A40 framework/README.md | head -60
```

The order I'd pay it in: live spans first, because a hung call that's invisible until it ends is the
one that hurts during an incident.

</div>

<div class="iq-role" data-role="devops" markdown="1">

- **Manual secret rotation** with a restart: move to a reloader or a sidecar that re-reads.
- **No canary** for framework changes: one agent's worker on the new image first.
- **Redelivery** of GitHub webhooks lost while the bus refused: a job that asks GitHub for failed deliveries.
- **No dependency bot.**

```bash
gh api /app/hook/deliveries --jq '.[] | select(.status_code==503) | .id'   # with the App's JWT
```

The gap: these are written down, not scheduled.

</div>

</details>

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q4">
<summary>Where does the system go next, and how does the architecture support that?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Up the autonomy ladder and across domains, without changing the core:

1. **L2 actions with approval:** a named approver, parameters bound to the action's idempotency key, just-in-time write credentials. The first planned ones: drift's remediation PR for DevOps, and `KILL` of a head-blocker session after approval for DBA.
2. **More agents:** CI/CD triage out of build into shadow, the DBA domain's first agent (SQL blocking, designed), then the rest of the catalog.
3. **The Azure target:** AKS per landing zone, Foundry behind APIM, Entra Agent ID replacing the app registrations one to one.

The architecture supports it because the hard parts are in the framework: a new agent is a manifest, tools
and stages; a new environment is configuration; a higher level is a gate with evidence.

Deeper: [roadmap](/posts/projects/platform-wardens/03-product-planning/#product-roadmap), [hosting model](/posts/projects/platform-wardens/05-technical-architecture/#hosting-and-deployment-model).

</div>

</details>

{% include project-nav.html %}
