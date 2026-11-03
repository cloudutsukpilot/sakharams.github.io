---
published: false
layout: post
title: "SQL Blocking Agent: Interview Questions"
date: 2026-10-06 00:30:00 +0530
categories: [projects, sql-blocking-agent]
tags: [Projects, SQL Blocking Agent, Interview Prep, Architecture]
description: "Software architect interview questions answered through the SQL Blocking Agent: deterministic gates, Pydantic AI on Azure AI Foundry, and human approval for every KILL."
project: sql-blocking-agent
project_interview: true
image:
  path: /assets/img/projects/sql-blocking-agent/interview-questions.webp
  alt: "SQL Blocking Agent: Interview Questions - Projects hero image"
---

The SQL Blocking Agent is the project I'd bring to any interview about **agentic AI in production**,
because its most important design decision is where the LLM is *not* allowed. Three of seven steps call
a model, none of them can run SQL or issue a `KILL`, and a human approves anything irreversible. It was
also our platform engineering org's first agentic AI project, so it doubles as a story about setting a
pattern. The questions below are generic; the answers are how I'd answer them with this project. Click a
question to open the answer, and follow the links to the playbook when the interviewer pushes for detail.

<!-- more -->

{% include project-nav.html %}

{% include project-iq-roles.html %}

The one-line pitch I open with: *"We built an agent that watches production SQL Servers for blocking
chains, finds the head blocker deterministically, uses an LLM to explain what's happening and recommend
an action, enforces hard safety rules in code, and only kills a session after a DBA approves, leaving an
audit trail and an RCA report for every incident."*

## Project Overview and Your Role
{: #project-overview-and-your-role }

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q1">
<summary>Walk me through a frontend or backend application you designed and built end to end.</summary>

<div class="iq-role" data-role="architect" markdown="1">

The SQL Blocking Agent is a long-running Python service on AKS. On each server's poll interval (set per server in
`TargetServers`) it runs a monitoring cycle:

1. **Detect** (deterministic): query `sys.dm_exec_requests`, walk the blocking chain to the head
   blocker, count victims.
2. **Analyze** (deterministic diagnostics, then one LLM call): log safety, plan cache, Query Store,
   locks, the matching Microsoft KB blocking scenario.
3. **Determine** (hard gates in code, then one LLM call only if no gate fires): `KILL`, `ALERT_ONLY` or
   `SKIP`, with risk, reason and the rule that decided.
4. **Approve** (human): a DBA approves or denies through a small FastAPI approval API or the
   `approve.py` CLI; no answer within the timeout means no kill.
5. **Act** (deterministic): re-check the session's identity, `KILL` on an autocommit connection, then
   validate the chain cleared.
6. **RCA** (one LLM call): root cause, business impact, P1 to P4 recommendations.
7. **Notify** (deterministic): immutable audit rows, HTML report to Blob Storage, email to the DBA team.

It's built on Pydantic AI with Azure AI Foundry (`gpt-5-mini` by default), keyless auth, and SQL Server
databases for configuration and audit. Production runs in **dry-run**; development runs real kills
against non-production servers.

Deeper: [System context](/posts/projects/sql-blocking-agent/05-technical-architecture/#system-context-and-component-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

How the code is laid out, as I'd walk a developer through it:

- **`main.py`** loads `.env`, configures telemetry, reads `TargetServers` and starts either loop mode
  (one asyncio poller per server plus a Uvicorn server for the approval API) or Temporal mode (a worker
  plus one Temporal Schedule per server).
- **`orchestrator/workflow.py`** is the state machine: `run_graph()` calls each node through `_step()`,
  which wraps it in a telemetry span and merges its dict of updates into a re-validated
  `BlockingAgentState`.
- **Nodes** in `src/agents/` (detector, analyzer, determination, action, rca, notifier); deterministic
  helpers in `src/tools/`.
- **One LLM entry point**: `ask_structured()` in `agents/llm.py`, a Pydantic AI `Agent` with a typed
  `output_type`.

```python
def _apply(state: BlockingAgentState, updates: dict) -> BlockingAgentState:
    if not updates:
        return state
    merged = {**state.model_dump(), **updates}
    return BlockingAgentState(**merged)
```

```bash
uv sync                              # then put AZURE_OPENAI_ENDPOINT, the DB connection strings etc. in .env
uv run python main.py
uv run pytest tests/unit -q
uv run python approve.py list
```

The gotcha: the state model doesn't set `extra="forbid"`, so a node returning a misspelled key is
silently dropped by the re-validation. One line of `model_config` turns that into an error.

</div>

<div class="iq-role" data-role="devops" markdown="1">

The deployable pieces:

- **One image** on `python:3.11-slim` with Microsoft's ODBC Driver 18 from the Microsoft apt repo, the
  organization's CA certificates installed with `update-ca-certificates`, and a combined CA bundle
  exported as `SSL_CERT_FILE` and `REQUESTS_CA_BUNDLE`, so TLS verification works behind the corporate
  proxy without turning it off.
- **One Helm chart**: Deployment (1 replica), ServiceAccount with workload identity, ConfigMap,
  `SecretStore` and `ExternalSecret`, Service on 8000, optional NetworkPolicy and PDB, and a
  `values.schema.json`.
- **Pipelines**: `ci.yaml` (build, Xray, SonarQube, chart, PR preview gate, release gate),
  `promote.yaml` (development or production), preview teardown, and TechDocs.

```bash
docker build -f sql-blocking-agent/Dockerfile -t sql-blocking-agent:local .
helm template sba sql-blocking-agent/helm -f sql-blocking-agent/helm/values.yaml | kubeconform -strict
kubectl logs -f deploy/<release> -n <namespace>
```

What I'd point out in an interview: the container runs with `readOnlyRootFilesystem: true`, user 999,
all capabilities dropped and `seccompProfile: RuntimeDefault`, with `emptyDir` for `/tmp` and the
reports folder. That's the hardening most Python services skip.

</div>

</details>

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q2">
<summary>What business problem did it solve, and how did you know it was working?</summary>

<div class="iq-role" data-role="architect" markdown="1">

SQL Server blocking is one of the most common causes of "the app is slow", and one of the most tedious
to handle by hand. A DBA has to notice it (usually after users do), walk the chain to the head blocker,
work out what that session is doing and whether killing it would trigger a long rollback, check the log,
isolation level, plan and whether the login must never be touched, then decide, act and write it up.

Steps one to four are mechanical and fast for software. The write-up is exactly what an LLM is good at.
The decision to kill is where a mistake costs data or an outage. So the design splits along that line:
**deterministic code for detection, safety checks and execution; an LLM for analysis and explanation; a
human for the irreversible step.**

How we know it's working: production has run in dry-run, polling target servers and sending reports to
the DBA team, and development has proven the full action path with real kills against non-production
servers. The live run on 10 July went from detection through a real `KILL`, validation, RCA and audit.

The metric I'd lead with long term isn't kills: it's **recurrence**. Are blocking patterns going away
because someone acted on the RCA?

> **TODO:** Add numbers from production dry-run: incidents detected per week, and how often the database
> team agreed with the proposed decision.
{: .prompt-warning }

Deeper: [Business problem](/posts/projects/sql-blocking-agent/01-vision-and-business-context/#business-problem-and-opportunity).

</div>

</details>

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q3">
<summary>What was your role, and which architectural decisions did you own?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The agent was built by our DevOps team in collaboration with the database team, who defined what "safe
to kill" means and approve every kill. As the first agentic AI project in the platform engineering org,
the architectural decisions mattered beyond this agent, because they became the template:

| ADR | Decision |
|---|---|
| 001 | Only Analyzer, Determination and RCA call the LLM; everything else is deterministic |
| 002 | Pydantic AI instead of LangChain + LangGraph |
| 003 | Direct `pyodbc`, no MCP server |
| 004 | Hard gates run before the LLM and can't be overridden |
| 005 | Human approval mandatory in production; timeout means deny |
| 006 | Keyless LLM auth with `DefaultAzureCredential` |
| 007 | Loop mode, single replica until a leader lock exists |
| 008 | AKS + Helm + Argo CD as the production platform |
| 009 | Agent state stays on SQL Server |
| 010 | Temporal optional and off in production |

ADR-001 is the one I'd defend in any room: *the LLM never acts*. Every destructive step is testable and
explainable without the model.

> **TODO:** Say which of these you personally led (for example the framework migration or the safety
> gates), and your role in the DevOps team.
{: .prompt-warning }

Deeper: [ADRs](/posts/projects/sql-blocking-agent/05-technical-architecture/#architectural-decision-records).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Developer decisions that shaped the code, and where they live:

- **Synchronous nodes, one async orchestrator.** Nodes are plain functions `(state, config) -> dict`, which
  makes them trivial to unit-test; the orchestrator awaits only the approval.
- **Validated LLM output.** `DeterminationLLMResult` uses `Literal["KILL", "ALERT_ONLY", "SKIP"]`, so the
  model can't invent a fourth decision.
- **Gates as a method returning a tuple** (`decision, risk, reason, rule, dba_approval_required`), checked
  in a fixed order before the LLM is called.
- **Dry-run in the decision, not only in the executor.** If the LLM says `KILL` and `dry_run` is on, the
  Determination node rewrites it to `ALERT_ONLY` with a `[DRY RUN]` prefix.

```python
if decision == "KILL" and self.config.get("dry_run", True):
    reason = "[DRY RUN] " + reason
    decision = "ALERT_ONLY"
```

A consequence worth knowing: in dry-run the approval path never runs, because nothing reaches the
`KILL` branch. So production dry-run tests decisions, not the approval flow; development (real kills)
is where approvals are exercised.

</div>

<div class="iq-role" data-role="devops" markdown="1">

What I owned on the delivery side:

- **Chart design**: one reusable chart with a schema, run mode as a value (`runMode: loop | temporal`),
  probes only in loop mode (Temporal mode has no HTTP server), secrets only through ExternalSecrets.
- **Identity**: workload identity on the ServiceAccount, used for Azure AI Foundry, Blob, Key Vault and
  Entra-authenticated SQL.
- **Promotion**: `versions.yaml` holds a `development` and a `production` version; `promote.yaml`
  updates the production entry in a PR, merges it, and dispatches the GitOps promotion, all behind the
  `production` GitHub environment.
- **PR previews** behind a `development` environment approval.

```bash
gh workflow run promote.yaml -f environment=production -f service=sql-blocking-agent -f version=v1.0.34
yq '.components."sql-blocking-agent"' versions.yaml
```

The one I'd change first: the chart's default values say `DRY_RUN: "false"` and `runMode: temporal`,
while the code defaults to `true` and `loop`. The safe default should be the same in every layer, and
the chart is the layer most likely to be deployed without overrides.

</div>

</details>

<details class="project-iq" markdown="1" id="project-overview-and-your-role-q4">
<summary>Who were the users and stakeholders, and how did their needs shape the design?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Group | Role | How it shaped the design |
|---|---|---|
| Database team | Domain experts; own the servers; approve kills | Their first requirement, "it must never make things worse", produced the gate ladder and deny-by-default |
| DevOps team | Built and run it | Helm, Argo CD, keyless auth, observability |
| Platform engineering org | Sponsor of the first agentic AI project | Reusable patterns, clear documentation |
| Application owners | Their sessions are the victims | RCA written in business-impact terms |
| Security | Identities, secrets, LLM data handling | Least-privilege logins, private approval API |

The DBA's working conditions drove the "UI". They're in the middle of an incident, so they need evidence
fast: who is blocking, how many are waiting, what killing would cost, and why the agent thinks so. That's
why the approval banner puts everything needed to decide on one screen with the approve and deny commands
printed underneath and the safe default spelled out. DBAs work from email and Teams at their desks, so
there's no mobile approval flow.

The other strong influence: the database team's domain knowledge became **code**, not prompts. Microsoft's
six KB blocking scenarios inform the analysis, and their safety rules became hard gates.

Deeper: [Stakeholders](/posts/projects/sql-blocking-agent/01-vision-and-business-context/#stakeholders-sponsors-and-decision-makers).

</div>

</details>

## System Design and Architecture
{: #system-design-and-architecture }

<details class="project-iq" markdown="1" id="system-design-and-architecture-q1">
<summary>If you had to design this application from scratch on a whiteboard, with a frontend, a backend and a data store, how would you approach it?</summary>

<div class="iq-role" data-role="architect" markdown="1">

For an agent that can change production, I'd start from the **blast radius**, not the model:

1. **List the irreversible actions** (`KILL`) and put a human and deterministic checks in front of each.
2. **Split work by what it needs:** facts (deterministic detection and diagnostics), judgement (LLM,
   structured output only), authority (human approval), execution (deterministic, re-validated).
3. **Constrain the LLM's interface:** it returns validated objects; it has no tools that run SQL.
4. **Make state explicit:** one Pydantic state object per cycle, re-validated after every step.
5. **Separate identities by power:** a reader, a killer, a config reader and an insert-only logger.
6. **Store configuration and audit in a database the DBAs already operate** (SQL Server).
7. **Make every artifact traceable** with one correlation ID.
8. **Ship it in dry-run first**, and earn the right to act.

The "frontend" here is deliberately minimal: an approval API, a CLI, an email and an HTML report. A web
inbox exists in the durable mode through the developer portal. The
[animated cycle diagram](/posts/projects/sql-blocking-agent/05-technical-architecture/#system-context-and-component-architecture)
is the picture I'd draw, with the three LLM steps highlighted.

</div>

<div class="iq-role" data-role="developer" markdown="1">

On the whiteboard I'd add the code contracts under each box:

1. **State as a Pydantic model** (`BlockingAgentState`), with `extra="forbid"` so typos fail.
2. **Nodes as pure-ish functions** returning updates; side effects (SQL, LLM, email) behind injectable
   callables (`query_sql`, `execute_kill_fn`) so tests pass fakes.
3. **LLM calls through one function** with a typed `output_type`, temperature 0 and a timeout.
4. **Gates before the LLM**, each returning a rule number so the audit says *which* rule decided.
5. **A kill function that re-checks identity** and works on its own connection.
6. **An approval primitive** that's an awaitable with a timeout (`asyncio.Event` locally, a Temporal
   signal durably).

```python
exec_result = execute_kill(
    SqlExecutorInput(monitor_conn_str=agent.monitor_conn_str, session_id=spid, login_name=login,
                     login_time=head.get("login_time"), protected_logins=cfg.get("protected_logins", []),
                     dry_run=cfg.get("dry_run", True)),
    query_sql=agent.query_sql,
    execute_kill_fn=lambda conn_str, session_id: default_execute_kill(conn_str, session_id, sql_type=agent.sql_type),
)
```

What I'd do differently from the start: make nodes `async` (or run them with `asyncio.to_thread`) so a
slow LLM call never holds the event loop that also serves approvals.

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q2">
<summary>What are the main components, and how are responsibilities split between them?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Component | Implementation | Calls the LLM? |
|---|---|---|
| Entry point | `main.py`: config, approval API, one poller per server | No |
| Orchestrator | `orchestrator/workflow.py`: a plain async state machine | No |
| State | `BlockingAgentState` Pydantic model, re-validated after every node | No |
| Configuration | Environment defaults plus `TargetServers` rows, refreshed every minute | No |
| Detection | DMVs, head blocker, victims | No |
| Analyzer | Deterministic diagnostics, then one structured call | **Yes** |
| Determination | Hard gates in code, then one structured call if no gate fired | **Yes** |
| Approval | FastAPI router and `approve.py` | No |
| Action | Pre-kill identity check, `KILL`, validation | No |
| RCA | Root cause and recommendations | **Yes** |
| Notification | Audit rows, report rendering, Blob upload, email | No |

Two structural rules hold it together:

- **Every LLM call goes through one function** (`ask_structured()` in `agents/llm.py`), so model,
  timeout, retries, token tracking and auth change in one place.
- **Deterministic tools never import the LLM module.** That rule keeps the safety boundary from eroding
  over time.

Two bounds keep a cycle predictable: at most one Analyzer to Determination retry, and an incident inside
its cooldown skips the LLM pipeline entirely.

Deeper: [Components](/posts/projects/sql-blocking-agent/05-technical-architecture/#system-context-and-component-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

How responsibilities map to modules:

| Module | Responsibility | Talks to |
|---|---|---|
| `tools/blocking_check.py` | `BLOCKING_SQL` over `sys.dm_exec_requests`, chain walk to the head blocker | Monitored server |
| `tools/log_safety.py`, `plan_cache.py`, `query_store.py`, `locks.py`, `scenario.py` | Diagnostics for the Analyzer | Monitored server |
| `agents/analyzer`, `determination`, `rca` | Prompt (`prompt.md`) + `ask_structured()` | Azure AI Foundry |
| `orchestrator/router.py` | `ApprovalRegistry` and the FastAPI app | DBAs |
| `tools/sql_query.py` | Identity re-check and `KILL` | Monitored server |
| `tools/audit_log.py`, `kill_rate.py`, `incident_cooldown.py` | Audit inserts, kill counts, durable cooldown | AgentLogDB |
| `tools/report_renderer.py`, `notification_tool/` | HTML/Markdown report, email | Blob, SMTP |

The rule "tools never import the LLM" is visible in imports: nothing under `src/tools/` imports
`agents.llm`.

```bash
grep -rn "agents.llm" src/tools/ || echo "boundary intact"
```

That grep is cheap enough to run in CI as an architecture test, and I'd add it, because the boundary
is the safety argument.

</div>

<div class="iq-role" data-role="devops" markdown="1">

The runtime split, in Kubernetes terms:

- **One Deployment, one container**, running either loop or Temporal mode.
- **Loop mode** exposes port 8000 (approval API and `/health`) through a ClusterIP Service, with
  liveness and readiness probes on `/health`.
- **Temporal mode** runs `python main.py` as a worker; the chart drops the port and the probes, and
  Temporal (a separate platform service) owns schedules and retries.
- **Everything external** is reached over the network: SQL Servers (ODBC, port 1433), Azure AI Foundry,
  Blob, the SMTP relay, Key Vault through External Secrets.

```bash
helm template sba sql-blocking-agent/helm --set runMode=loop | yq 'select(.kind=="Deployment") | .spec.template.spec.containers[0].livenessProbe'
helm template sba sql-blocking-agent/helm --set runMode=temporal | yq 'select(.kind=="Deployment") | .spec.template.spec.containers[0].livenessProbe'
```

Gotcha: in Temporal mode the pod has no probes at all, so a hung worker looks healthy to Kubernetes.
A small health endpoint in the worker process (or Temporal's worker heartbeat surfaced as a metric)
closes that gap.

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q3">
<summary>Which non-functional requirements drove the architecture the most?</summary>

<div class="iq-role" data-role="architect" markdown="1">

- **Safety over speed.** A wrong `SKIP` costs minutes; a wrong `KILL` can cost hours of rollback. Every
  ambiguity resolves toward not killing. This produced the gate ladder, deny-on-timeout and dry-run.
- **Deterministic where it matters.** Detection, gates, execution and audit must not depend on model
  output.
- **Structured LLM output only.** Every response validated against a Pydantic schema, with retries on
  schema errors. This drove the framework choice.
- **Bounded work per incident.** At most three LLM calls per analyzed cycle and one retry, plus a
  cooldown so a persistent blocker isn't re-analyzed on every poll.
- **No stored LLM keys.** `DefaultAzureCredential` with a bearer-token provider.
- **Fail closed on configuration.** No usable server rows at startup means no monitoring; a failed
  refresh keeps the last good set.
- **Single active poller per server.** Two pollers could double-detect and double-kill, which is why
  production is pinned to one replica.
- **Observable per incident.** One correlation ID across logs, telemetry, audit rows and reports.

Notice what's missing: throughput and latency. A quiet server costs one DMV query per poll and no tokens.

Deeper: [Non-functional requirements](/posts/projects/sql-blocking-agent/02-requirements-gathering/#non-functional-requirements).

</div>

<div class="iq-role" data-role="sre" markdown="1">

The NFRs as SLIs I'd actually measure:

| NFR | SLI |
|---|---|
| Safety | Kills executed without approval = 0; kills on protected sessions = 0 |
| Coverage | Minutes since the last completed cycle, per server |
| Bounded cost | Tokens per analyzed incident, LLM requests per cycle (should be ≤ 3, plus retries) |
| Fail-closed config | Cycles suppressed by `config_errors` (the workflow turns those into `ALERT_ONLY`) |
| Responsiveness | Time from detection to approval banner; approval API latency |

The design features that serve them: skip-don't-queue per server, cooldown keyed by SPID, login and
`query_hash` (300 seconds by default), a 300-second approval timeout that denies, and temperature 0
with a 300-second timeout on every LLM call.

```bash
kubectl logs deploy/<release> -n <ns> | grep -E "Cycle .* done: decision=" | tail -20
kubectl logs deploy/<release> -n <ns> | grep -c "within cooldown, skipping LLM"
```

Two gaps I'd raise: loop-mode LLM calls run on the event loop, so one slow call delays every server's
next cycle; and the R10 kill-rate check fails open on a query error. Both break the "fail toward safe"
rule in small ways.

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q4">
<summary>Which architectural options did you consider and reject, and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

- **LangChain + LangGraph.** The agent started there as a prototype. We moved to Pydantic AI because the
  job is three narrow LLM steps that each return one JSON object: manual fence-stripping and `json.loads`
  were fragile, two large dependency trees were used for about 5% of their surface, and token visibility
  wasn't built in. Prompts, gates and fallbacks didn't change; only the plumbing did.
- **A graph runtime.** The flow is linear with one bounded retry, so a plain async state machine is
  easier to read and test.
- **An MCP server or LLM tool-calling for SQL.** Rejected: we wanted full control of every SQL
  statement, including the `KILL` connection's transaction state, and no path from the model to SQL.
- **Letting the LLM decide everything.** Rejected. Hard gates (rollback too long, protected sessions, log
  thresholds, kill-rate limit, isolation level, application victims, maintenance windows) run first in
  code and are final.
- **Autonomous kills.** Rejected for production: human approval, with timeout as deny.
- **Multiple replicas now.** Deferred until a leader lock exists.
- **Moving the agent's stores to PostgreSQL.** Documented, but out of scope; the DBAs already operate SQL
  Server.
- **Temporal in production now.** Built and optional, but off until durability is needed.

Deeper: [Technology selection](/posts/projects/sql-blocking-agent/05-technical-architecture/#technology-and-framework-selection).

</div>

</details>

<details class="project-iq" markdown="1" id="system-design-and-architecture-q5">
<summary>Monolith, modular monolith or microservices, what did you choose and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

A **modular monolith**: one process, one container, one replica, with clearly separated modules for
agents, orchestration and deterministic tools. It runs one asyncio poller per monitored server and hosts
the small approval API in the same process.

Why not microservices? The cycle is a **sequential, stateful decision** about one incident, and the
dangerous part is consistency: the state that justified a kill must be exactly the state the action
re-checks. Splitting detection, analysis, approval and action into services would put that state on the
network, add partial-failure modes in the middle of a kill decision, and complicate auditing, all for no
scaling benefit (a quiet server costs one query per poll).

The modularity is enforced in code instead: one LLM entry point, deterministic tools that never import
the LLM module, Pydantic state re-validated between nodes.

The scaling path is horizontal *replicas of the same monolith*, partitioned by server, once a leader lock
or per-server lease exists. And for durability, the same modules run as **Temporal activities** in the
optional durable mode, with the approval wait as a durable signal and the `KILL` activity limited to a
single attempt.

Deeper: [Project structure](/posts/projects/sql-blocking-agent/08-development-preparation/#project-structure).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The modular monolith, as code:

- **Packages by role**: `agents/` (may call the LLM), `tools/` (deterministic), `orchestrator/` (state,
  routing, telemetry, Temporal), `models/` (schemas).
- **One process, two entry points**: `main.py` and `approve.py`.
- **Shared types** across modules: `HeadBlocker`, `BlockingAgentState`, the LLM result models.
- **The same nodes** run in-process (loop mode) or as Temporal activities (durable mode); only the
  driver changes.

```python
if run_mode == "temporal":
    await _run_temporal_mode(configs)
else:
    await _run_loop_mode(configs)
```

Gotchas of a monolith built this way: imports work through `sys.path.insert(0, "src")` in `main.py` and
`pythonpath = [".", "src"]` in pytest, so `src` isn't a package you can install; and module-level state
(`_recent_incidents`, the approval `registry`, the LLM background loop) is shared across all servers in
the process. That's fine with one replica and something to design around before scaling out.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Operationally, one container is one release unit:

- **One image, one chart, one version** in `versions.yaml` per environment.
- **Rolling update** with one replica means a short monitoring gap during a deploy; the chart sets
  `terminationGracePeriodSeconds: 60` so an in-flight cycle can finish.
- **Durable mode** needs a Temporal cluster, namespace and task queue (values `temporal.host`,
  `namespace`, `taskQueue`), which is the one extra platform dependency.

```bash
kubectl rollout status deploy/<release> -n <ns>
kubectl get deploy <release> -n <ns> -o jsonpath='{.spec.strategy}'
```

For a single-replica agent I'd set the Deployment strategy to `Recreate` rather than the default
rolling update: with `RollingUpdate`, the new pod can start polling before the old one stops, which
briefly means two pollers on the same servers, the exact thing the single-replica rule exists to avoid.

</div>

</details>

## Technology Choices
{: #technology-choices }

<details class="project-iq" markdown="1" id="technology-choices-q1">
<summary>Which technologies did you use across the stack, and why those?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Choice | Why | Trade-off |
|---|---|---|
| Python 3.11 to 3.13, `uv`, `ruff` | AI and SQL ecosystem; fast locked installs | |
| **Pydantic AI** | Native structured output, schema-validation retries, token usage, keyless Azure auth | Smaller ecosystem than LangChain |
| Pydantic models for all state | Every transition validated | |
| Plain async state machine | Linear flow with one bounded retry | Hand-written routing |
| `pyodbc` with ODBC Driver 18 | Full control of every statement and of the `KILL` connection | No tool abstraction |
| **Azure AI Foundry**, `gpt-5-mini` default | In the tenant, managed identity auth, per-agent model and thinking level by env var | Model changes need re-testing |
| FastAPI | Tiny, typed approval API | No auth yet |
| SQL Server (AgentConfigDB, AgentLogDB) | DBAs already operate it | |
| Azure Blob, SMTP | Report hosting and delivery | |
| Temporal (optional) | Durable cycles and approval waits | A server to run; off in production |
| AKS, Helm, Argo CD, External Secrets | The platform standard | |

The choice I'd explain first is **Pydantic AI**, because it addresses the real failure mode of LLM
integration: the output isn't the shape your code expects. Validated objects with automatic retries turn
"parse and hope" into a contract.

Deeper: [Technology selection](/posts/projects/sql-blocking-agent/05-technical-architecture/#technology-and-framework-selection).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The stack, with how each piece is used:

- **Pydantic AI** (`pydantic-ai-slim[openai]`): `Agent(model, output_type=..., instructions=...,
  model_settings=ModelSettings(temperature=0.0, timeout=300.0, thinking=...), retries=...)`.
- **OpenAI SDK** (`AsyncOpenAI`) against the Foundry `/openai/v1` endpoint, with an `api_key` callable
  that returns an Entra bearer token from `get_bearer_token_provider(DefaultAzureCredential(), scope)`.
- **pyodbc** with ODBC Driver 18; Entra tokens passed through `attrs_before={1256: token_struct}`.
- **FastAPI + Uvicorn** for the approval API, started inside the agent's event loop.
- **httpx** in `approve.py`; **temporalio** for durable mode; **logfire** and the Azure Monitor
  OpenTelemetry exporter for telemetry.
- **uv** for locked installs, **ruff**, **pytest** with `pytest-cov`.

```python
client = AsyncOpenAI(base_url=_ep, api_key=_async_token_provider, max_retries=http_max_retries)
return OpenAIResponsesModel(model_name, provider=OpenAIProvider(openai_client=client))
```

Gotcha: the image installs from `requirements.txt` while local development uses `uv.lock`, so the two
can drift. Exporting the lock (`uv export > requirements.txt`) in CI, or installing with `uv sync` in the
image, keeps them identical.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Platform technologies, and the settings that matter:

| Tech | Setting |
|---|---|
| AKS | 1 replica, requests 250m / 512Mi, limits 1 CPU / 1Gi |
| Workload identity | `azure.workload.identity/use: "true"` pod label |
| External Secrets | `SecretStore` (namespaced) on Key Vault, `refreshInterval: 1h` |
| Argo CD | Syncs the GitOps values; promotion through `promote.yaml` |
| JFrog | Image and chart registry; Xray and build scans in CI |
| Temporal | Optional, platform-hosted, namespace per environment |
| Application Insights | Through the Azure Monitor exporter, only when `LOCAL=false` |
| TechDocs | `mkdocs.yml` published by `techdocs.yml` |

```bash
kubectl get externalsecret,secretstore -n <ns>
kubectl get pod -n <ns> -l app.kubernetes.io/name=<chart-name> -o jsonpath='{.items[0].metadata.labels}'
```

Gotcha: `LOCAL` defaults to `true` in the code, which means "console only, send nothing". The chart sets
`LOCAL: "false"`; any deployment path that forgets it ships a service with no telemetry and no error
about it.

</div>

</details>

<details class="project-iq" markdown="1" id="technology-choices-q2">
<summary>How do you evaluate and choose between competing technologies?</summary>

<div class="iq-role" data-role="architect" markdown="1">

We wrote it down: the framework decision has its own document in the repo (`WHY_PYDANTIC_AI.md`), and
I'd use it as the example of how I evaluate.

The criteria came from the job, not the market:

1. **What does the job actually need?** Three narrow LLM steps, each returning one JSON object. Not
   tool-using agents, not long conversations.
2. **What fails today?** Manual JSON fence-stripping, brittle parsing, no token visibility.
3. **How much of the dependency do we use?** About 5% of two large frameworks, which is all cost and
   attack surface.
4. **Does it fit our identity model?** Keyless Azure auth mattered.
5. **What's the migration risk?** Prompts, gates and fallbacks stayed the same; only plumbing changed,
   so the risk was low and testable.

For the model itself, the criteria are different: inside the tenant (data handling), managed identity
(no keys), and **per-agent configurability**, so the RCA (the longest output) can use a different
thinking level from the Determination step. Any model change is compared on recorded incidents in
dry-run before switching.

</div>

<div class="iq-role" data-role="developer" markdown="1">

How the framework choice played out in code, which is the evidence I'd use:

- **Before**: LangChain + LangGraph, manual fence-stripping and `json.loads` of the model's text, then
  validation by hand.
- **After**: `Agent(output_type=DeterminationLLMResult)`. Pydantic AI asks for structured output, validates
  it, and feeds validation errors back to the model for up to `retries` attempts.
- **Token usage** comes back on `result.usage`, which `_log_usage()` records per agent.
- **Thinking level** is a model setting per agent (`LLM_THINKING_RCA=low`), not a code change.

```python
class DeterminationLLMResult(BaseModel):
    decision: Literal["KILL", "ALERT_ONLY", "SKIP"]
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    reason: str
    safety_check_passed: bool
    rule_triggered: int = 0
```

The evaluation habit I'd describe: write the target interface first (here, `ask_structured(system_prompt,
user_message, output_type, agent_name=...)`), then check which library gives it with the least code.
One leftover worth cleaning: the schema module's docstring still describes the old `ask_llm_json()` path.

</div>

</details>

<details class="project-iq" markdown="1" id="technology-choices-q3">
<summary>Where did you build, and where did you buy or reuse?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Bought (as a service):** the model, through Azure AI Foundry. **Reused:** Pydantic AI, FastAPI,
`pyodbc`, Temporal (optional), the platform (AKS, Argo CD, External Secrets, Key Vault, JFrog), the org's
reusable CI workflows, and Microsoft's documented KB blocking scenarios as domain knowledge.

**Built**, because nothing off the shelf encodes our safety policy:

- deterministic detection and the head-blocker walk;
- diagnostic tools (log safety, plan cache, Query Store, locks, scenario matching);
- the **governance gates** and the kill-rate limiter;
- the approval API and CLI;
- the transaction-safe `KILL` path and its validation;
- report rendering and audit logging.

What I'd point out: we deliberately **didn't** build a general agent framework, a tool-calling layer or
an MCP server. The value was in the policy and the safety path, not in agent plumbing. And we reused a
human-in-the-loop inbox from the developer portal for durable mode rather than building our own UI: the
[OnePlatform HITL contract](/posts/projects/oneplatform/07-data-and-integration/#event-and-messaging-contracts)
was built with this agent as its first consumer.

Deeper: [Integration development](/posts/projects/sql-blocking-agent/09-implementation/#integration-development).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Built versus reused, in pipeline and platform terms:

- **Reused workflows**: change detection, Docker build to JFrog with Xray and build scans, SonarQube,
  Helm chart publish, all from the org's reusable-workflows repository.
- **Reused platform**: AKS, Argo CD, External Secrets, Key Vault, workload identity, the platform's
  Temporal service, Application Insights.
- **Built for this repo**: the PR-preview gate (an approval on the `development` environment, then a
  preview build, chart and deploy), the release gate (an approval on a `release` environment that
  dispatches the development release), `promote.yaml`, and the preview teardown.

```bash
gh run list --workflow ci.yaml --limit 5
gh run view <run-id> --log | grep -E "preview-approval|release-approval"
```

Two things I'd tidy: CodeQL is present but commented out in `ci.yaml`, so code scanning isn't running for
this repo; and the SonarQube workflow is pinned to a feature branch of the shared repo. Both are
one-line changes with real security value.

</div>

</details>

## Frontend Architecture
{: #frontend-architecture }

<details class="project-iq" markdown="1" id="frontend-architecture-q1">
<summary>How is the frontend (or user-facing interface) structured, in terms of framework, routing, components and state?</summary>

<div class="iq-role" data-role="architect" markdown="1">

There's **no web UI, and that was a choice.** The users are DBAs in the middle of an incident, so each
"screen" answers one question they're asking, and all of them hang off one **correlation ID**:

| Artifact | Question it answers | Where |
|---|---|---|
| Approval banner | "Should I let it kill this session?" | Agent log, `approve.py show` |
| `approve.py` CLI | `list`, `show`, `approve`, `deny` | Terminal |
| DBA email | "What happened, and do I need to act?" | Inbox (HTML with plain-text fallback) |
| HTML RCA report | "Why, and how do we stop it recurring?" | Blob Storage, linked from the email |
| Audit tables | "What did the agent do, and who approved it?" | AgentLogDB |

Behind the CLI is a small FastAPI API: `GET /pending`, `GET /pending/{id}`,
`POST /approvals/{id}/approve`, `POST /approvals/{id}/deny`, `GET /health`. "State" for the user is the
pending-approval list. Each pending `KILL` gets its own random approval ID, which can be resolved
once, so an approval can't be applied to a different incident.

In the optional durable mode, approvals move to a **web inbox in the developer portal** through a
versioned human-in-the-loop contract, which is the right place for a richer UI rather than building one
into the agent.

If I were asked to build a dedicated UI, it would be a read-mostly incident list and detail page over
AgentLogDB, with approve and deny gated by an Entra group.

Deeper: [Information architecture](/posts/projects/sql-blocking-agent/04-user-experience-and-design/#information-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

There's no web framework, so the "frontend" concepts map onto a CLI, an API and documents:

- **CLI (`approve.py`)**: commands `list`, `show <id>`, `approve <id> [note]`, `deny <id> [reason]`,
  parsed from `sys.argv`; in loop mode it calls the HTTP API with `httpx`, in Temporal mode it lists
  workflows and sends the `submit_decision` signal.
- **API (FastAPI)**: `ApprovalRegistry` holds `PendingApproval` objects, each with an `asyncio.Event` the
  workflow awaits.
- **Views**: `format_kill_banner()` renders the same text banner in both run modes, so the operator sees
  identical fields whichever mode is running.
- **Documents**: `report_renderer.py` produces HTML and Markdown; the email has an HTML body with a
  plain-text alternative.

```python
@app.post("/approvals/{approval_id}/approve")
def approve(approval_id: str, body: dict = Body(default={})) -> dict:
    note = str((body or {}).get("reason", ""))
    if not registry.resolve(approval_id, "approve", note):
        raise HTTPException(status_code=404, detail="approval not found or already resolved")
```

Gotcha in that handler: it's a sync `def`, so FastAPI runs it in a thread pool, and `resolve()` calls
`asyncio.Event.set()` from that thread, which isn't thread-safe. Making the handlers `async def` (they
do no blocking work) fixes it.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-architecture-q2">
<summary>How does the user interface handle loading, errors and large data sets?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The interface problem here isn't volume, it's **pressure**: a DBA reading an approval during an incident.
So the design rules are about clarity and safe defaults.

- **Everything needed to decide is on one screen**: server, database, head SPID, login, wait time,
  victims, risk, KB scenario, log usage, rollback safety, plan availability, decision, rule and diagnosis.
  The approve and deny commands are printed underneath.
- **The safe default is spelled out**: "Times out in 300 s → ALERT_ONLY".
- **Read before act:** `list` and `show <id>` exist so nobody approves an ID they haven't read.
- **Reasons are first-class:** `approve` takes a note and `deny` a reason; both land in the audit trail.
- **Dry-run is visible:** the audit records `kill_executed = false` with `dry_run = true`, so a simulated
  kill is never confused with a real one.

**Errors** degrade safely: if the LLM fails, validation retries then deterministic fallbacks apply, and
no LLM decision means no kill. A failed Blob upload or email is logged but doesn't change the outcome.

**Large content** (SQL text, plans) goes into the HTML report, linked from the email rather than
embedded, and dynamic content is escaped before rendering.

Deeper: [Interaction patterns](/posts/projects/sql-blocking-agent/04-user-experience-and-design/#interaction-patterns).

</div>

<div class="iq-role" data-role="developer" markdown="1">

How the interface code handles the hard cases:

- **Waiting:** `request_approval()` wraps `pa.event.wait()` in `asyncio.timeout(timeout_seconds)`; a
  timeout returns `ApprovalResult(approved=False, outcome="TIMED_OUT")`, and `finally` removes the entry.
- **Errors:** unknown or already-resolved IDs return 404 from the API; `approve.py` catches
  `httpx.HTTPError` and prints it.
- **Read before act:** `GET /pending` returns a summary, `GET /pending/{id}` the full details.
- **Large data:** the banner truncates SQL to 240 characters and the Analyzer summary to 600; the HTML
  report shows up to 1,200 characters of SQL in a `<pre>`.
- **Escaping:** the report uses an `_esc()` helper and the email uses `html.escape`.

```python
try:
    async with asyncio.timeout(timeout_seconds):
        await pa.event.wait()
except asyncio.TimeoutError:
    return ApprovalResult(approved=False, outcome="TIMED_OUT",
                          reason=f"No response within {timeout_seconds}s")
finally:
    registry.remove(pa.id)
```

Gotcha: the approval ID is a random 8-character hex string, separate from the cycle's correlation ID,
and the banner shows only the approval ID. Showing both lets a DBA match the banner to the email and the
audit row without guessing.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-architecture-q3">
<summary>How do you keep the frontend fast and accessible?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Fast** means fast to *decide*, which is a content problem: the banner lists fields in reading order,
and the email leads with the decision and kill status before details. The report and email share one
structure: decision first, then incident details, key findings, root cause, business impact,
recommendations, decision rationale and token usage. Recommendations are numbered P1 to P4 with T-SQL in
code blocks, because DBAs copy them.

**Accessible** comes cheaply from the format choices:

- the banner and CLI are **plain text**, which works with screen readers and in every terminal;
- reports use **real headings and tables**, not images of tables;
- severity and decisions are **words** (`KILL`, `ALERT_ONLY`, `SKIP`; `CRITICAL`, `HIGH`), with colour
  only as a second signal;
- email has a **plain-text alternative**;
- dynamic content (SQL text, login names) is **escaped** before rendering, which is also a security
  property.

The usability test I'd run is a **tabletop exercise**: replay three dry-run incidents, show the banner and
report, and ask a DBA to decide before revealing the agent's decision. Every question they had to ask is a
missing banner field.

> **TODO:** Has the database team reviewed the banner and report format?
{: .prompt-warning }

Deeper: [Usability testing](/posts/projects/sql-blocking-agent/04-user-experience-and-design/#usability-testing).

</div>

<div class="iq-role" data-role="developer" markdown="1">

"Fast and accessible" for text interfaces is about layout and encoding:

- **Fixed reading order** in `format_kill_banner()`: server, SPID and login, wait and victims, risk and
  scenario, log usage, kill safety, SQL, decision, diagnosis, then how to respond.
- **Words, not colours**: decisions and severities are literal strings (`KILL`, `ALERT_ONLY`, `CRITICAL`).
- **Email** built with `EmailMessage`, HTML added with `add_alternative(..., subtype="html")`, so mail
  clients without HTML still get the text body; `starttls()` when the relay supports it.
- **Report** HTML with semantic headings and tables, and the SQL in `<pre>`.

```python
mime_message.add_alternative(message.body_html, subtype="html")
with smtplib.SMTP(smtp.host, smtp.port, timeout=smtp.timeout_seconds) as connection:
    ...
```

Gotcha: the HTML report's `_esc()` escapes `& < > "` but not `'`. That's safe for text nodes, which is
how it's used today; the standard library's `html.escape(quote=True)` handles both and is what the email
path already uses, so I'd use it in both places.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Responsiveness of the human loop, as SLIs:

| SLI | Why | How |
|---|---|---|
| Detection to banner | A DBA can't approve what they haven't seen | Log timestamps per correlation ID |
| Banner to decision | Approval health; long times mean the banner lacks a field | Audit rows |
| Approval timeouts | DBAs not reachable, or the banner isn't reaching them | Count of `TIMED_OUT` |
| API latency on `/pending` | The tool should answer instantly | Probe or synthetic call |

The SRE concern specific to this code: in loop mode the approval API shares the event loop with the
pollers, and LLM calls block that loop. During another server's Analyzer call, `approve.py` can hang for
as long as the call takes (up to the 300-second timeout). I'd measure that with a synthetic
`GET /pending` every minute and alert if it takes more than 5 seconds.

```bash
kubectl port-forward deploy/<release> 8000:8000 -n <ns> &
time curl -s http://127.0.0.1:8000/pending > /dev/null
```

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-architecture-q4">
<summary>How is the frontend built, configured per environment and served?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The user-facing parts are built into the **same container image** as the agent:

- the **approval API** is served by the agent process (FastAPI) and exposed as a ClusterIP
  `Service`; the chart has no Ingress, so it isn't reachable from outside the cluster;
- `approve.py` calls `127.0.0.1:<port>`, so DBAs reach the API through `kubectl port-forward` (or a
  private ingress added outside this chart) or with `curl`;
- the **HTML and Markdown reports** are rendered by `report_renderer.py` and uploaded to Azure Blob
  Storage; the email links to them.

**Per environment**, everything that differs is configuration in Helm values and secrets: the email
recipients (per server, from `TargetServers.DbaAlertEmail`), SMTP relay, Blob container, approval timeout,
`REQUIRE_HUMAN_APPROVAL`, and `DRY_RUN`. A `values.schema.json` makes a typo fail at render time.

One configuration detail I'd raise as a design smell: some defaults with real infrastructure names (the
report container URL, SMTP host) live in code. They should be required from configuration, so source
never encodes environment details.

Deeper: [Hosting model](/posts/projects/sql-blocking-agent/05-technical-architecture/#hosting-and-deployment-model).

</div>

<div class="iq-role" data-role="developer" markdown="1">

How the user-facing parts are configured in code:

- **API host and port** from `APPROVAL_API_HOST` (default `127.0.0.1`, set to `0.0.0.0` in the chart so
  the Service can reach it) and `APPROVAL_API_PORT` (8000).
- **CLI target** is `http://127.0.0.1:<APPROVAL_API_PORT>`, hard-coded host, so it's built for "same
  machine or port-forward".
- **Report storage** from `RCA_REPORT_CONTAINER_URL`; **email** from `SMTP_HOST`, `SMTP_PORT`,
  `SMTP_FROM` and per-server `DbaAlertEmail` overriding `DBA_EMAIL`.
- **Report format** rendered by `render_reports()` into HTML and Markdown strings, saved locally, then
  uploaded.

```bash
APPROVAL_API_HOST=127.0.0.1 APPROVAL_API_PORT=8000 uv run python main.py
uv run python approve.py show <approval-id>
```

Gotcha: a few infrastructure defaults are literal hostnames in code (the SMTP relay, the report
container) rather than required settings. A missing variable then silently points at a real server
instead of failing at startup; I'd make them required.

</div>

<div class="iq-role" data-role="devops" markdown="1">

How the user-facing parts are deployed:

- **Approval API**: container port 8000 named `http`, ClusterIP Service on 8000, only in loop mode.
- **No Ingress** in the chart; DBAs reach it with a port-forward:

```bash
kubectl port-forward -n <ns> svc/<release> 8000:8000
python approve.py list
```

- **Reports**: written to a `reports` volume (`emptyDir` by default, or an existing PVC) and uploaded
  to a Blob container with the pod's identity (`Storage Blob Data Contributor`).
- **Email** through the SMTP relay on port 25.
- **Per-environment config** in the ConfigMap rendered from `config:` values; `values.schema.json`
  validates types at render time.

If I were exposing approvals to DBA workstations, I'd add an internal Ingress with SSO in front
(oauth2-proxy annotations) and the API checking the forwarded identity, rather than relying on who can
run `kubectl port-forward`. Today the RBAC that allows port-forward in that namespace is the de facto
approver list, which should be written down until real auth exists.

</div>

</details>

## Backend and API Design
{: #backend-and-api-design }

<details class="project-iq" markdown="1" id="backend-and-api-design-q1">
<summary>How do CRUD operations work in the backend, from request to persisted data?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The agent has two real data paths, and they're deliberately asymmetric:

**Configuration (read, refreshed every minute):** `TargetServers`, `ProtectedLogins` and
`ExclusionWindows` in AgentConfigDB. DBAs **create and update** rows with T-SQL; the agent only
**reads** them (the setup script's `sql_agent_config` login has `SELECT` on `dbo`). Rows must be active and enabled; per-server
values override environment defaults only for a known list of keys; a failed refresh keeps the last good
set.

**Audit (insert only):** at the end of a cycle, the notifier writes to `BlockingEventLog`, `KillAuditLog`
and `RCASnapshotLog`. The setup script gives the logging login **`INSERT` only**, so the audit trail
is meant to be immutable **by permission**, not by convention. One catch I'd fix: the code also *reads*
AgentLogDB (the kill-rate count, the duplicate-kill check, durable cooldown) through the same connection,
so that connection needs `SELECT` too. A separate read connection keeps the writer insert-only.

**Approvals** are the one request-driven "create/update": `POST /approvals/{id}/approve` resolves the
pending decision in memory (loop mode) or sends a durable signal (Temporal mode), and the outcome is
written to the audit rows.

The general lesson I'd draw: when a table is evidence, grant only `INSERT`. And when configuration
controls a destructive system, let the people who own the risk edit it with their own tools, and make the
service a reader.

Deeper: [Data architecture](/posts/projects/sql-blocking-agent/05-technical-architecture/#data-architecture-and-data-models).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The data paths at code level:

- **Read config:** `load_multi_server_configs_with_status()` reads `TargetServers` rows; per cycle,
  `load_config()` re-reads `ProtectedLogins` and the per-server overrides. Overrides are applied only for
  the columns in `_SERVER_OVERRIDE_MAP` (`PollIntervalSeconds`, `KillThresholdMs`, `MinVictimCount`,
  `MaxKillsPerHour`, `DbaAlertEmail`), each with a caster.
- **Write audit:** `audit_log.py` holds parameterized `INSERT` statements for `BlockingEventLog`,
  `KillAuditLog` and `RCASnapshotLog`, executed with `?` placeholders through pyodbc.
- **Write early:** `KillAuditLog` is written inside the Action node, right after the kill, so a crash
  later in the cycle can't orphan a kill.
- **Dedupe:** before killing, `check_existing_kill()` looks for a row with the same correlation ID and
  SPID.

```python
_SERVER_OVERRIDE_MAP = {
    "PollIntervalSeconds": ("poll_interval_seconds", int),
    "KillThresholdMs":     ("kill_threshold_ms",     int),
    "MinVictimCount":      ("min_victim_count",      int),
    "MaxKillsPerHour":     ("max_kills_per_hour",    int),
    "DbaAlertEmail":       ("dba_email",             str),
}
```

Gotcha: the "insert-only" design and the code disagree. The dedupe check, the kill-rate count and the
durable cooldown (`MERGE` on `IncidentCooldown`) all read or update AgentLogDB through the same
connection, so the login it uses needs more than `INSERT`. Splitting a read connection from the
insert-only writer keeps the audit tables tamper-resistant.

</div>

</details>

<details class="project-iq" markdown="1" id="backend-and-api-design-q2">
<summary>How did you design the API, in terms of style, resources, versioning, pagination and errors?</summary>

<div class="iq-role" data-role="architect" markdown="1">

There are three APIs, and each was designed for its consumer:

**Approval API** (REST, FastAPI): `GET /health`, `GET /pending`, `GET /pending/{id}`,
`POST /approvals/{id}/approve`, `POST /approvals/{id}/deny`. Resources are keyed by an approval ID
created per pending `KILL`, actions are explicit verbs on that resource, and the bodies carry a note or reason. It's
small enough that the module docstring and FastAPI's OpenAPI page document it.

**The LLM "API"**: three Pydantic output schemas (Analyzer, Determination, RCA). This is the contract
I'd spend the most time on in an interview: the model must return a validated object, and a schema error
triggers a retry rather than a parse failure.

**Platform One report contract** (durable mode): the best-specified contract in the project. Schema
version `1`, `correlation_id` as the **idempotency key**, UTC `generated_at`, body capped at 1 MiB. HTTP 201
and 200 (duplicate) both count as success; 409 and 422 are not retried; 408, 429 and 5xx retry up to three
times. Failure is recorded without changing the incident's outcome.

**Versioning:** the external contract is versioned; the internal approval API ships with its only client.
**Pagination** isn't needed: pending approvals are few by nature.

The gap I'd name: the approval API has **no authentication** yet.

Deeper: [API architecture](/posts/projects/sql-blocking-agent/05-technical-architecture/#api-and-integration-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The approval API as code:

- **FastAPI app** built by `build_app()`, served by `uvicorn.Server(...).serve()` as a task in the agent's
  own event loop.
- **Routes**: `GET /health`, `GET /pending`, `GET /pending/{approval_id}`, `POST
  /approvals/{approval_id}/approve`, `POST /approvals/{approval_id}/deny`.
- **Bodies** are `dict = Body(default={})` with an optional `reason`; responses are plain dicts.
- **Errors**: 404 for unknown or already-resolved approvals; resolving twice is impossible because
  `resolve()` returns `False` once `decision` is set.
- **OpenAPI** at `/docs`, since the app doesn't turn it off.

```python
def resolve(self, approval_id: str, decision: str, reason: str = "") -> bool:
    pa = self._pending.get(approval_id)
    if pa is None or pa.decision is not None:
        return False
    pa.decision = decision
    pa.reason = reason or ""
    pa.event.set()
    return True
```

Improvements I'd make: a Pydantic request model (`class Decision(BaseModel): reason: str = Field("",
max_length=500)`) instead of a raw dict; `async def` handlers so `event.set()` runs on the loop thread;
and a `Depends(current_approver)` that reads an authenticated identity, so the audit records who
approved, not just that someone did.

</div>

</details>

<details class="project-iq" markdown="1" id="backend-and-api-design-q3">
<summary>How is the backend structured internally, and where does background work run?</summary>

<div class="iq-role" data-role="architect" markdown="1">

```text
sql-blocking-agent/
├── main.py            # config, approval API, one poller per server (or Temporal worker)
├── approve.py         # HITL CLI
├── src/agents/        # detector, analyzer, determination, action, rca, notifier, llm.py
├── src/orchestrator/  # workflow.py, state.py, config.py, router.py, telemetry.py, temporal_*
└── src/tools/         # blocking_check, log_safety, plan_cache, query_store, locks, scenario,
                       # sql_query, sql_validator, kill_rate, exclusion_window, audit_log, ...
```

The whole process **is** background work: one asyncio task per monitored server, each running cycles on
its poll interval. Rules that keep it predictable:

- **Skip, don't queue.** If a server's previous cycle is still running, the next tick is skipped.
- **Per-server isolation.** A slow server doesn't delay others.
- **Bounded per incident.** One retry, three LLM calls, then cooldown.
- **Blocking I/O:** SQL and LLM bridge code is synchronous. In Temporal mode activities run in a thread
  pool; in loop mode the nodes run on the event loop thread, so a long LLM call pauses the approval API
  and the other pollers until it returns. Moving node calls to `asyncio.to_thread` is the fix.
- **Configuration refresh** every minute, so a new server row starts a new poller.

The layering rule that matters most: **agents** may call the LLM, **tools** are deterministic and never
import it, and the **orchestrator** owns state transitions. Prompts live next to their agent as Markdown,
so prompt changes show up in diffs.

Deeper: [Scalability strategy](/posts/projects/sql-blocking-agent/05-technical-architecture/#scalability-and-performance-strategy).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Concurrency inside the process:

- **Loop mode:** `_run_loop_mode` starts Uvicorn as a task, then `_reconcile_loop_pollers` creates one
  `_server_poller` task per server. Each poller starts `_cycle_task` and waits on a `wake` event with a
  timeout equal to the poll interval; config changes set `wake` so the new interval applies at once.
- **Skip, don't queue:** if `current_task` isn't done, the tick logs "Previous cycle still running" and
  does nothing.
- **Blocking calls:** nodes are synchronous. `ask_structured()` submits the coroutine to a background
  event loop thread and waits with `.result()`, which keeps the HTTP connection pool alive between calls,
  but the calling thread (the main loop, in loop mode) still blocks for the whole call.

```python
def _run_coro_blocking(coro):
    return asyncio.run_coroutine_threadsafe(coro, _get_bg_loop()).result()
```

The fix is small and high-value: in `_step()`, run the node with `await asyncio.to_thread(fn, state,
config)`. Then an LLM call on one server no longer stalls the approval API or the other pollers.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Where background work runs, by mode:

| Mode | Scheduler | Work runs in | Health |
|---|---|---|---|
| Loop | asyncio pollers in the pod | The agent process | `/health` probes on port 8000 |
| Temporal | One Temporal Schedule per server, reconciled every config refresh | Activities on the worker in the pod | No probes in the chart |

Temporal activity settings, from `temporal_app.py`: node activities get `start_to_close_timeout` of 30
to 180 seconds with up to 3 attempts and backoff (2 to 30 seconds); the **Action activity gets
`maximum_attempts=1`**, so a kill is never retried by the platform.

```bash
temporal schedule list --namespace <ns>
temporal workflow list --namespace <ns> --query 'ExecutionStatus="Running"'
temporal workflow signal --workflow-id <id> --name submit_decision --input '{"approved":false,"reason":"test"}' --namespace <ns>
```

Ops gotcha: in Temporal mode the pod has no liveness probe, so a worker stuck on a hung connection stays
"Running". I'd alert on Temporal's schedule-to-start latency for the task queue, which rises when no
worker is polling.

</div>

</details>

<details class="project-iq" markdown="1" id="backend-and-api-design-q4">
<summary>How do you validate input and keep operations safe to repeat?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Validation, layer by layer:**

- **LLM output:** validated against a Pydantic schema, retried on failure; no valid decision means no kill.
- **State:** re-validated after every node, so a malformed update fails loudly instead of corrupting the
  next step.
- **Configuration:** only known override keys; empty configuration fails closed.
- **Untrusted text:** SQL text, login and program names from DMVs reach the model as data. The model
  can't call tools, and gates decide on facts, not prose, which neutralizes most prompt injection.

**Safe to repeat**, for the one action that isn't:

- **Pre-kill identity check:** SPID, `login_name` and `login_time` must still match what detection saw,
  because SPIDs get reused. Missing data fails closed.
- **Transaction-safe kill:** issued on an autocommit connection with `@@TRANCOUNT` checks.
- **Validation after:** `CONFIRMED_GONE`, `ROLLING_BACK` or `STILL_PRESENT`, plus whether the chain cleared.
- **Kill-rate limit** (R10) per server per hour, against runaway loops.
- **One approval ID per pending kill**, resolvable once, so one approval maps to one incident.
- In durable mode the **Action activity runs with a single attempt**: a kill is never retried
  automatically.

Everything else (detection, analysis, reports) is safe to repeat, which is why cooldown exists: to avoid
waste, not danger.

Deeper: [Data validation](/posts/projects/sql-blocking-agent/07-data-and-integration/#data-validation-and-quality).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Validation in code, from input to action:

- **LLM output**: `Literal` types on decision and risk, so `"Severe"` or `"KILL_NOW"` fail validation and
  Pydantic AI retries (`LLM_MAX_RETRIES`, default 2). After that, the Determination node catches the
  exception and returns `ALERT_ONLY`.
- **Config**: unknown `SQLType` raises `ValueError`; missing required env vars raise at startup;
  `config_errors` turns a cycle into `ALERT_ONLY` with LLM calls suppressed.
- **SQL**: every query is parameterized except `KILL`, which can't take a parameter, so the SPID is cast
  with `int()` first.
- **Kill identity**: `_validate_live_identity()` compares the live SPID's `login_name` and `login_time`
  with what detection saw.

```python
cursor.execute(f"KILL {int(session_id)}")
```

Repeat safety: `check_existing_kill(correlation_id, spid)` skips a duplicate kill for the same cycle; the
`KILL` connection is forced to autocommit and checked for `@@TRANCOUNT = 0`. Gotcha: `BlockingAgentState`
ignores unknown keys, so `{"decison": "KILL"}` from a buggy node would vanish silently. `extra="forbid"`
on the model makes that a test failure.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Safety controls as things I'd monitor:

| Control | Healthy signal | Failure signal |
|---|---|---|
| Identity re-check before `KILL` | `SKIPPED_IDENTITY_MISMATCH` occasionally | Never seen in months (is it running?) |
| Kill dedupe | No duplicate `KillAuditLog` rows per correlation ID | Duplicates |
| Kill-rate limit (R10) | Rule 10 firing when it should | `kill_rate_query_failed` in logs (the check failed open) |
| Approval timeout | Some `TIMED_OUT`, mostly decisions | Many timeouts: nobody is watching |
| LLM fallbacks | Rare | "Determination LLM failed -- defaulting to ALERT_ONLY" repeating |

```sql
SELECT CorrelationId, COUNT(*) FROM dbo.KillAuditLog GROUP BY CorrelationId HAVING COUNT(*) > 1;
SELECT KillStatus, COUNT(*) FROM dbo.KillAuditLog WHERE KillTimeUTC > DATEADD(DAY,-7,SYSUTCDATETIME()) GROUP BY KillStatus;
```

The one I'd fix before real kills: R10 treats a failed count as zero kills. For a safety limit, an
unknown count must be treated as "limit reached".

</div>

</details>

## Database and Data Modeling
{: #database-and-data-modeling }

<details class="project-iq" markdown="1" id="database-and-data-modeling-q1">
<summary>Which data store did you choose, and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**SQL Server**, in two databases on an existing management server:

- **AgentConfigDB:** `TargetServers` (connection string, SQL type, poll interval, kill threshold,
  minimum victims, max kills per hour, DBA alert email, active and enabled flags), `ProtectedLogins`,
  `ExclusionWindows`.
- **AgentLogDB:** `BlockingEventLog`, `KillAuditLog`, `RCASnapshotLog` (and `IncidentCooldown` for
  durable mode).

Plus **Azure Blob Storage** for HTML reports, and an in-memory `BlockingAgentState` per cycle.

Why SQL Server: the database team already operates, backs up and secures it, and they're the owners of the
configuration content and the audit evidence. They can edit thresholds and protected logins with T-SQL,
which they'd rather do than learn a new UI. Relational fits too: configuration rows per server, and audit
rows linked per incident.

What we considered: a PostgreSQL migration is fully documented, and explicitly **out of scope**. Moving
the stores would add an operational dependency without changing what the agent does.

Separate databases for config and audit is the design point I'd emphasize: different owners, different
permissions (read-only versus insert-only), and different retention.

Deeper: [Data architecture](/posts/projects/sql-blocking-agent/05-technical-architecture/#data-architecture-and-data-models).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Working with SQL Server from Python here:

- **pyodbc** with ODBC Driver 18; `connect_sql()` prefixes `DRIVER=` from `ODBC_DRIVER`, and attaches an
  Entra token as a pre-connect attribute for PaaS and Managed Instance targets:

```python
def _access_token_attribute() -> bytes:
    token = _default_credential().get_token(_SQL_SCOPE).token
    token_bytes = token.encode("utf-16-le")
    return struct.pack("=i", len(token_bytes)) + token_bytes
```

- **IAS (SQL on a VM)** targets get `UID`/`PWD` appended from `SQLLOGIN_USERNAME` and
  `SQLLOGIN_PASSWORD`, with `}` escaped.
- **Rows as dicts**: `BaseAgent.query_sql()` zips `cursor.description` with each row and turns `bytes`
  into hex (for `query_hash` and plan handles).
- **Short connections**: open per query with `timeout=10` (5 for config reads), closed by the context
  manager.

Gotcha: `DefaultAzureCredential().get_token()` is called on every connection. The credential caches
tokens, so it's cheap, but a misconfigured identity shows up as a connect failure deep inside a node
rather than at startup. A startup probe that opens one connection to each database fails earlier.

</div>

<div class="iq-role" data-role="devops" markdown="1">

The data stores as infrastructure:

- **AgentConfigDB and AgentLogDB** on a SQL server reached by `CONFIG_DB_CONNECTION_STRING` and
  `LOG_DB_CONNECTION_STRING` (`Encrypt=Yes;TrustServerCertificate=No`), with `SQL_AUTH_MODE=entra` in the
  chart, so the pod's workload identity is the database user.
- **Monitored servers** from `TargetServers.ConnectionString` and `SQLType`.
- **Blob container** for reports; **no PVC** by default (reports go to an `emptyDir` and are uploaded).

```sql
-- the Entra identity needs a contained user in each database it uses
CREATE USER [<managed-identity-name>] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [<managed-identity-name>];
```

```bash
az sql db list --server <server> --resource-group <rg> -o table
kubectl exec deploy/<release> -n <ns> -- python -c "import os; print(os.environ['SQL_AUTH_MODE'])"
```

Gotcha: with Entra auth, one managed identity is the user in AgentConfigDB, AgentLogDB and every
Entra-authenticated monitored server, so the least-privilege split in `03_logins.sql` (SQL logins) has
to be re-expressed as database roles for that identity, per database.

</div>

</details>

<details class="project-iq" markdown="1" id="database-and-data-modeling-q2">
<summary>How is the data modeled, and how did the access patterns shape the model?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Three access patterns shaped it:

1. **"Which servers do I watch, and with what limits?"** — read every minute. So `TargetServers` carries
   per-server overrides (poll interval, kill threshold, minimum victims, max kills per hour, alert email),
   and `ProtectedLogins` and `ExclusionWindows` hang off it.
2. **"What happened in this incident?"** — written once per cycle, read by DBAs and auditors. So
   `BlockingEventLog` is the incident row, with `KillAuditLog` (if a kill was attempted) and
   `RCASnapshotLog` linked to it.
3. **"What does this cycle know so far?"** — read and written by every node within seconds. That's not a
   table at all: it's the **in-memory Pydantic state** (detection data, analysis, decision, action
   results, approval, RCA, correlation ID, dry-run, errors), re-validated after every node.

Two modeling choices I'd point out:

- **Connection strings live in `TargetServers`**, but credentials for VM-hosted servers are appended at
  connect time from the environment, never stored in the row.
- **`DryRun` was removed from the table** and moved to the application environment, so whether the agent
  can kill is decided in Git by the deployment, not by a database row someone can edit.

Deeper: [Data migration](/posts/projects/sql-blocking-agent/07-data-and-integration/#data-migration-and-reconciliation).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The model in code and SQL:

- **`TargetServers`**: `ServerName`, `ConnectionString`, `SQLType` (`PAAS`/`MI`/`IAS`), nullable
  override columns (`PollIntervalSeconds`, `KillThresholdMs`, `MinVictimCount`, `MaxKillsPerHour`,
  `DbaAlertEmail`), active and enabled flags.
- **`ProtectedLogins`**: login names and patterns, optionally scoped to a server.
- **Audit tables** with a `CorrelationId`, `ServerName`, the decision, the rule, and `DryRun`.
- **In-memory state**: `BlockingAgentState` with typed fields (`Literal` for decision and severity,
  `Optional[int]` for `killed_spid`, `Optional[bool]` for `blocking_chain_cleared` where `None` means
  "not checked").

```python
blocking_chain_cleared:  Optional[bool] = None   # None = not checked; True = cleared; False = still blocking
remaining_blocker_count: int = 0
```

Design point I'd make: nullable override columns mean "inherit the environment default", which is a
clean way to model per-server settings, but it needs a test that `NULL` really falls through (there's
`test_target_server_overrides.py` for that). Missing: a `CHECK` constraint on `SQLType` in the table,
which today is only validated when the agent connects.

</div>

</details>

<details class="project-iq" markdown="1" id="database-and-data-modeling-q3">
<summary>How were schema changes and data migrations handled?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Numbered T-SQL scripts** in `sql/`, applied in order on the management server **by the database team**,
ahead of the release that needs them:

| Script | Purpose |
|---|---|
| `01_config_db.sql` / `02_log_db.sql` | Config and audit databases |
| `03_logins.sql` | The four least-privilege logins and grants |
| `04_incident_cooldown.sql` | Durable cooldown table |
| `05_config_schema_migration.sql` | Server type, login pattern and related columns |
| `06_connection_string_config.sql` | Connection strings into `TargetServers` |
| `07_remove_target_server_dry_run.sql` | `DryRun` becomes application-only |

The Helm chart **deliberately doesn't run migrations**: the databases are external, and a schema change
stays a reviewed DBA action. The ordering rule is **schema first, then code**, with every script additive
or guarded (the later ones use `COL_LENGTH` checks) so it's safe to re-run.

Improvements I'd make: every script idempotent, and a small applied-versions table so environments can be
compared, which is what Flyway or a migrations table would give you.

Two real migrations already happened (connection strings into the table; `DryRun` out of it), and the
reconciliation was simple: the agent's startup log prints the loaded configuration, which is compared with
the table.

Deeper: [Schema and migrations](/posts/projects/sql-blocking-agent/07-data-and-integration/#database-schema-and-migrations).

</div>

<div class="iq-role" data-role="developer" markdown="1">

How schema change shows up in code:

- **Guarded scripts**: from `05` on, scripts check `COL_LENGTH(...) IS NULL` before `ALTER TABLE ... ADD`
  and `IS NOT NULL` before a `DROP`, so re-running is safe. The first three use plain `CREATE`, so
  they're one-shot.
- **Fail closed instead of reading two shapes**: the code doesn't try to support old and new layouts at
  once. If `TargetServers` has no usable `ConnectionString` rows, startup logs "No monitored servers
  configured" and exits.
- **Config health**: runtime config carries `config_errors`; when present, the workflow suppresses LLM
  calls and reports `ALERT_ONLY` "until the configuration schema is repaired".

```sql
IF COL_LENGTH(N'dbo.TargetServers', N'DryRun') IS NOT NULL
    ALTER TABLE dbo.TargetServers DROP COLUMN DryRun;
```

What I'd add in code: a `SchemaVersion` table and a startup check (`SELECT MAX(Version)`) that refuses to
run if the database is older than the code expects, turning a confusing runtime error into a clear one.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Rolling out a schema change:

1. The database team applies the numbered script on the management server, in a quiet period.
2. Verify: `SELECT COL_LENGTH('dbo.TargetServers','SQLType')` and a row count.
3. Promote the agent version that needs it.
4. Check the startup log, which prints the loaded configuration and server list.

```bash
sqlcmd -S <server> -d AgentConfigDB -G -i sql/06_connection_string_config.sql     # -G = Entra auth
sqlcmd -S <server> -d AgentConfigDB -G -Q "SELECT ServerName, SQLType FROM dbo.TargetServers"
gh workflow run promote.yaml -f environment=development -f service=sql-blocking-agent -f version=v1.0.35
kubectl logs deploy/<release> -n <ns> | grep -E "Monitoring [0-9]+ server|Runtime config"
```

Why not a Helm hook or an init container: the databases are shared and owned by the DBAs, the agent's
identity shouldn't hold DDL rights, and a failed migration in a hook would block the deploy in a confusing
way. Keeping migrations a reviewed DBA step is slower and much safer.

</div>

</details>

<details class="project-iq" markdown="1" id="database-and-data-modeling-q4">
<summary>How do you handle data retention, backup and restore?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The agent itself is **stateless in loop mode** and restored by Argo CD; the data that matters is in the
two databases and Blob.

**Backup:** AgentConfigDB and AgentLogDB are ordinary SQL Server databases on the management server, so
they belong in the database team's normal backup plan. **AgentConfigDB matters most for recovery**:
without it the agent starts with no servers and fails closed (safe, but blind). Blob reports need soft
delete and versioning to be recoverable.

**Retention** isn't set in the repo yet, so these are my recommendations:

| Data | Recommendation |
|---|---|
| Audit tables | As long as change records are kept; partition or archive by month |
| RCA reports in Blob | Lifecycle policy: cool tier after 30 days, delete after the audit period |
| Logs and App Insights | Shorter, because they can contain SQL text and login names |
| `IncidentCooldown` | Self-cleaning by age |

The principle: **the audit tables are the long-term record**; logs are for troubleshooting and should
expire sooner, because they're more likely to carry sensitive literals.

> **TODO:** Are AgentConfigDB and AgentLogDB in the management server's backup and restore testing, and
> how long must kill and RCA records be kept?
{: .prompt-warning }

Deeper: [Backup](/posts/projects/sql-blocking-agent/07-data-and-integration/#backup-and-restore-strategy).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Retention and backup, as configuration:

- **Databases**: the server's backup policy (Azure SQL automated backups with point-in-time restore,
  or the DBA team's backup jobs for SQL on VMs). I'd confirm AgentConfigDB and AgentLogDB are in it.
- **Blob reports**: a lifecycle management policy (cool after 30 days, delete after the audit period),
  soft delete and versioning on the container.
- **Logs**: Application Insights retention set shorter than the audit tables.
- **Pod storage**: reports are written to an `emptyDir` before upload, so nothing in the pod needs backup.

```bash
az storage account blob-service-properties update --account-name <account> --enable-delete-retention true --delete-retention-days 30 --enable-versioning true
az storage account management-policy create --account-name <account> --resource-group <rg> --policy @lifecycle.json
az sql db ltr-policy show --server <server> --name AgentLogDB --resource-group <rg>
```

Gotcha: if Blob upload fails, the report exists only in the `emptyDir` and disappears with the pod. The
upload failure is logged, but the evidence is gone. A retry on next start, or a small PVC for unsent
reports, keeps it.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Recovery targets for the data:

| Data | RPO | RTO | Notes |
|---|---|---|---|
| AgentConfigDB | 15 min (PITR) | 1 hour | Without it the agent starts with no servers: safe but blind |
| AgentLogDB | 15 min (PITR) | 4 hours | Evidence; the agent keeps running without it, but audit writes fail |
| Blob reports | Soft delete window | Hours | Rebuildable from `RCASnapshotLog` only partially |
| In-flight approvals | Lost in loop mode | n/a | Durable in Temporal mode |

What I'd test quarterly: restore AgentConfigDB to a new database, point a development deployment at it,
and confirm the server list and protected logins load. A restore that has never been pointed at the
agent isn't a tested restore.

```bash
az sql db restore --dest-name AgentConfigDB-restore-test --name AgentConfigDB --server <server> \
  --resource-group <rg> --time "2026-10-05T06:00:00Z"
```

> **TODO:** Confirm the backup policy and retention for AgentConfigDB and AgentLogDB.
{: .prompt-warning }

</div>

</details>

## Frontend, Backend and Database Communication
{: #frontend-backend-and-database-communication }

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q1">
<summary>How does the frontend connect to the backend?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The "frontend" is the DBA's tools, and each connects differently:

- **`approve.py` and `curl` → approval API** over HTTP to a ClusterIP `Service`. The chart defines no
  Ingress and `approve.py` targets `127.0.0.1`, so in the cluster a DBA uses `kubectl port-forward`
  (a private ingress, if wanted, lives outside this chart). In loop mode the API lives in the agent process, so an
  approval resolves the in-memory pending decision directly.
- **Email → report:** the agent sends HTML email (with a plain-text fallback) through SMTP, linking to
  the report it uploaded to Blob Storage.
- **Audit queries:** DBAs query AgentLogDB with their own SQL tools.
- **Durable mode:** the agent registers an approval with the developer portal's HITL inbox; the portal
  shows it to authorized reviewers, and the decision comes back to the Temporal workflow as **one
  signal**. The portal, not the agent, owns the web UI and its authentication.

What I'd change before real kills in production: the approval API has **no authentication**. I'd require
an Entra ID token on every call, check membership of the DBA approver group, and record the authenticated
identity rather than a caller-supplied reviewer name.

> **TODO:** Is authenticating the approval API a hard prerequisite for enabling real kills, and is there a
> date?
{: .prompt-warning }

Deeper: [Authentication](/posts/projects/sql-blocking-agent/06-security-and-privacy/#authentication-and-authorization).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The client and server for approvals:

- **`approve.py`** uses `httpx.get/post` against `http://127.0.0.1:{APPROVAL_API_PORT}` with a 10-second
  timeout and prints JSON; `approve` and `deny` send `{"reason": ...}`.
- **The server** resolves the pending approval and sets its `asyncio.Event`; the awaiting cycle wakes and
  continues to the Action node or downgrades to `ALERT_ONLY`.
- **Temporal mode** swaps the transport: `approve.py` detects it and sends the `submit_decision` signal
  with the Temporal client instead of calling HTTP.

```python
resp = httpx.post(f"{BASE}/approvals/{argv[1]}/{cmd}",
                  json={"reason": reason}, timeout=10)
```

```bash
python approve.py list
python approve.py show 3fa2b1c9
python approve.py deny 3fa2b1c9 "rollback risk too high"
```

Gotcha: `BASE` is hard-coded to `127.0.0.1`, which is right for a laptop and for a port-forward, but
makes a shared approval endpoint impossible without editing the script. An `APPROVAL_API_URL` variable
would make the CLI usable against an internal ingress later.

</div>

<div class="iq-role" data-role="devops" markdown="1">

The network path for an approval, as deployed:

```text
DBA laptop → kubectl port-forward → Service (ClusterIP :8000) → pod :8000 (Uvicorn in the agent)
```

- **Who can approve** = who can `port-forward` in the namespace (RBAC `pods/portforward`).
- **No TLS** inside the tunnel beyond the kube API connection; the API speaks plain HTTP.
- **NetworkPolicy** support exists in the chart but is disabled by default.

```bash
kubectl auth can-i create pods/portforward -n <ns> --as <dba-user>
kubectl port-forward -n <ns> svc/<release> 8000:8000
```

What I'd ship before real kills: an internal Ingress with SSO at the edge, a NetworkPolicy allowing
port 8000 only from the ingress controller, and the API reading the authenticated identity header.
Until then, the RoleBinding that grants port-forward is effectively the approver group and should be
reviewed like one.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q2">
<summary>Trace a single user request from the browser to the data store and back.</summary>

<div class="iq-role" data-role="architect" markdown="1">

The interesting trace starts in the database, not the browser. One cycle, with an approved kill:

1. **Poll:** the server's poller (an identity with `VIEW SERVER STATE`) queries the DMVs.
2. **Detect:** walk the chain to the head blocker; count victims (the cycle already carries its
   8-character correlation ID from the moment it started).
3. **Analyze:** deterministic diagnostics, then `ask_structured()` → Azure AI Foundry (keyless) →
   validated Analyzer object.
4. **Determine:** gates in order: maintenance window (R13), protected sessions (R3, R2), rollback
   estimate (R1), log size (R9), log used % (R6), kill rate (R10), isolation (R12), application victims
   (R11). If none fires, one LLM call weighs the soft rules.
5. **Approve:** the banner prints; the DBA runs `approve.py show <id>`, then `approve <id> "note"` →
   `POST /approvals/{id}/approve` → the pending decision resolves.
6. **Act:** re-check SPID, login name and login time; `KILL` on an autocommit
   connection with `@@TRANCOUNT` checks; validate.
7. **RCA:** one LLM call for root cause and recommendations.
8. **Notify:** write audit rows to AgentLogDB; render and upload the report;
   email the DBA team.

Every step logs the correlation ID, so the email, report, audit rows and traces line up.

Deeper: [End-to-end flow](/posts/projects/sql-blocking-agent/04-user-experience-and-design/#user-flows).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The same trace, at code level:

1. `_server_poller` creates `_cycle_task`; `run_cycle` makes `correlation_id = str(uuid.uuid4())[:8]` and
   opens `session_scope` (every log line and span gets the ID).
2. `run_graph` → `_step("detection", detection_node, ...)` runs `BLOCKING_SQL` and walks
   `blocking_session_id` to the root.
3. Cooldown check on `spid|login|query_hash`; then the Analyzer and Determination loop (at most one retry).
4. `decision == "KILL"` → `_human_gate` → `request_approval()` awaits the event.
5. Approved → `action_node`: dedupe check, `execute_kill`, `validate_kill`, `write_kill_audit`.
6. `rca_node` → `send_lifecycle_notification(..., "after_rca")` → `notification_node` writes the event
   and RCA rows and uploads the report.

```python
if state.get("decision") == "KILL":
    state = await _human_gate(state, config)
else:
    _mark_incident(head)
```

Detail worth knowing: only non-`KILL` incidents are marked for cooldown. After a successful kill the
session is gone, so a reappearance is treated as a new incident and analyzed again.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Latency budget for one approved-kill cycle, and where it can stall:

| Step | Typical | Ceiling |
|---|---|---|
| Detection and diagnostics | Seconds | 10-second connect timeout per query |
| Analyzer + Determination | Tens of seconds | 300-second timeout each, plus 429 back-off (20, 40 s) |
| Approval | Human | 300-second timeout → `ALERT_ONLY` |
| Kill + validation | Seconds | 10-second connect timeout |
| RCA | Tens of seconds | 300 seconds |

The SRE observation: the ceilings add up to well over 15 minutes, while a blocking chain can clear on its
own in seconds. The re-check before the kill protects against acting on a stale picture, and the
validation step records `CONFIRMED_GONE` versus `ROLLING_BACK`, so the cost of slowness is a missed
opportunity, not a wrong kill.

```bash
kubectl logs deploy/<release> -n <ns> | grep "<correlation-id>"
```

What I'd measure per cycle: duration by node (the `node_span` telemetry already records it), and the
gap between the head blocker's wait time at detection and at the kill.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q3">
<summary>How does the backend connect to the data store, and how are connections, timeouts and concurrency handled?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Connections** are direct `pyodbc` with ODBC Driver 18. The setup script (`03_logins.sql`) defines
**four least-privilege logins**:

| Login | Grants | Used for |
|---|---|---|
| `sql_agent_reader` | `VIEW SERVER STATE` | Detection and diagnostics |
| `sql_agent_killer` | `VIEW SERVER STATE`, `ALTER ANY CONNECTION` | The `KILL` only |
| `sql_agent_config` | `SELECT` on `dbo` | AgentConfigDB |
| `sql_agent_logger` | `INSERT` on audit tables | AgentLogDB |

The intent is that reader and killer are separate, so a bug in diagnostics can't become a `KILL`.
The code doesn't enforce that yet: detection and the `KILL` share one connection per monitored server.
Azure SQL targets (PaaS, Managed Instance) get an Entra access token for the pod's identity; VM-hosted
servers use one shared SQL login from the secret store, appended at connect time. So today the killer's
power sits with whatever identity monitors the server; a second, kill-only connection string is the fix.

**The kill connection** is special: autocommit, with `@@TRANCOUNT` checks, so the `KILL` can never run
inside an open transaction of the agent's own.

**Concurrency:** one asyncio poller per server; if a cycle is still running, the next tick is skipped
rather than queued. In loop mode the synchronous SQL and LLM calls run on the event loop thread, so a
slow call delays other pollers and the approval API (Temporal mode runs them in activities). And the
global rule:
**one active poller per server**, which is why there's one replica.

**Timeouts:** the approval wait has a timeout that becomes `ALERT_ONLY`; LLM calls have timeouts and
validation retries, then deterministic fallbacks. A SQL connection failure is a cycle error that's logged
and alerted; the pod stays ready by design, so one unreachable server doesn't restart monitoring for all.

Deeper: [Identity and access](/posts/projects/sql-blocking-agent/05-technical-architecture/#identity-and-access-architecture).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Connection handling in code:

- **No pool**: `connect_sql()` opens a pyodbc connection per query (ODBC driver-manager pooling aside)
  and closes it in a `with` block. Simple and correct for a few queries per cycle.
- **Timeouts**: `timeout=10` for monitored-server queries, `timeout=5` for config reads.
- **The kill connection**: `autocommit=True`, then forced again (`conn.autocommit = True`) because a
  pooled ODBC connection can come back with autocommit off; then `@@TRANCOUNT` checks before `KILL`.

```python
with connect_sql(conn_str, autocommit=True, timeout=10, sql_type=sql_type) as conn:
    conn.autocommit = True
    cursor = conn.cursor()
    trancount = cursor.execute("SELECT @@TRANCOUNT").fetchval() or 0
```

- **Concurrency**: one cycle per server at a time; nodes are synchronous, and in loop mode they run on
  the event loop thread.

Gotcha: pyodbc's `timeout` on `connect()` is the login timeout, not a query timeout. A DMV query that
hangs on a struggling server can block longer than 10 seconds; setting `cursor.timeout` (or
`conn.timeout`) bounds the query itself.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Failure handling between the agent and its databases:

| Dependency | If unavailable | What I'd watch |
|---|---|---|
| Monitored server | `_cycle_task` logs "Cycle crashed" for that server; others continue | Consecutive failures per server |
| AgentConfigDB at startup | "No monitored servers configured" and the process exits | CrashLoopBackOff |
| AgentConfigDB at refresh | "TargetServers refresh failed; keeping the last known poller configuration" | Count of that line |
| AgentLogDB | Audit writes return errors into `state.errors`; R10 assumes 0 kills | `kill_rate_query_failed`, audit errors |

The probe question: `/health` returns `{"status": "ok"}` whatever the pollers are doing. I'd add a
per-server `last_cycle_completed_utc` map in the process and a `/health/pollers` endpoint that fails when
any active server is older than three poll intervals, and point the liveness probe at it only once it has
been stable in development (a flapping liveness probe restarts monitoring for every server).

```bash
kubectl logs deploy/<release> -n <ns> --since=1h | grep -c "Cycle crashed"
```

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q4">
<summary>Where do you cache, and how do you keep cached data correct?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Caching is minimal and deliberate, because stale data in a kill decision is dangerous.

| Cached | Where | Correctness |
|---|---|---|
| Configuration (`TargetServers`, protected logins, exclusion windows) | In memory, refreshed every minute | A failed refresh keeps the last good set; empty at startup fails closed |
| Incident cooldown | In memory (loop mode); `IncidentCooldown` table (Temporal mode) | Avoids re-analyzing the same incident every poll |
| LLM auth token | Bearer-token provider | Refreshed by the Azure identity library |

What's **never** cached is the thing that matters most: the session's identity before a kill. Detection
data could be seconds old by the time a DBA approves, so the action re-reads SPID, login name and login
time and refuses if they don't match. That's the core lesson: **cache for efficiency, re-verify before
anything irreversible**.

The known weakness: loop-mode cooldown is in memory, so a pod restart forgets it and re-analyzes active
incidents (wasting tokens, not causing harm). The fix is to use the `IncidentCooldown` table in loop mode
too.

Deeper: [Technical debt](/posts/projects/sql-blocking-agent/09-implementation/#technical-debt-tracking).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The caches in code:

- **`_recent_incidents`**: a module-level dict of `incident_key → time.monotonic()`, checked by
  `_in_cooldown()`; durable mode uses `IncidentCooldown` with a `MERGE ... WITH (HOLDLOCK)` upsert.
- **`@lru_cache`** on `build_model()` and `_get_agent()`, so each model client and typed agent is built
  once per process; the comment says model changes need a restart, and that's why.
- **A persistent background event loop** for LLM calls, so the `httpx` connection pool survives between
  calls (an earlier version that used `asyncio.run()` per call got "Connection error" on the second call).
- **Token provider**: `get_bearer_token_provider` caches and refreshes Entra tokens.

```python
def _incident_key(head: dict) -> str:
    return f"{head.get('session_id')}|{head.get('login_name')}|{head.get('query_hash', '')}"
```

Gotcha: `_recent_incidents` is never pruned, so it grows by one entry per distinct incident for the
life of the pod. That's small in practice, but a periodic sweep of entries older than the cooldown keeps
it bounded.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Cache correctness as an operational concern:

- **Cooldown hides incidents by design** for 300 seconds (`ANALYSIS_COOLDOWN_SECONDS`). The risk is a
  real escalation inside that window: the same head blocker with ten times the victims is still "in
  cooldown". I'd make the key include a victim-count band, or bypass cooldown when victims grow past a
  threshold.
- **Restart forgets loop-mode cooldown**, so a deploy during a long incident re-analyzes it (tokens, not
  harm).
- **Config cache**: the server list refreshes on `CONFIG_REFRESH_INTERVAL_MINUTES` (1 in code, 10 in the
  chart defaults), so a DBA disabling a server waits up to that long.

```bash
kubectl logs deploy/<release> -n <ns> | grep -E "within cooldown|TargetServers row (added|removed)"
```

The SRE rule I'd write into the runbook: when a DBA needs the agent to stop watching a server *now*,
disabling the row isn't enough within the refresh window; scaling the deployment to zero is the
immediate stop, and the row change is the durable one.

</div>

</details>

<details class="project-iq" markdown="1" id="frontend-backend-and-database-communication-q5">
<summary>Where did you use synchronous and where asynchronous communication, and why?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Synchronous within a cycle:** detection, diagnostics, LLM calls, gates, action and validation run in
order, because each step depends on the previous one's validated state, and the kill decision must be
made on one consistent picture.

**Asynchronous across servers:** one asyncio poller per server, so servers are independent and a slow one
doesn't delay the others.

**Asynchronous for the human:** approval is inherently async. In loop mode the cycle waits (with a
timeout) for the approval API to resolve the pending decision. In durable mode, the wait is a **Temporal
signal**, so it survives restarts, and the decision arrives from the developer portal's inbox as one
signal.

**Fire-and-record for notifications:** Blob upload, email and the portal report happen after the
decision; failures are logged and recorded but **never change the outcome**. With the portal report, 408,
429 and 5xx are retried up to three times, and the `correlation_id` makes retries idempotent.

The design principle: **synchronous where consistency protects safety, asynchronous where a human or an
external system is in the loop, and side effects after the decision can fail without undoing it.**

Deeper: [Event and messaging contracts](/posts/projects/sql-blocking-agent/07-data-and-integration/#event-and-messaging-contracts).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Sync and async, as implemented:

- **`run_graph` is `async`** only so it can `await` the approval; everything else in it is synchronous.
- **Approval** is an `asyncio.Event` with `asyncio.timeout()`; in durable mode it's
  `workflow.wait_condition(...)` on a value set by the `submit_decision` signal.
- **LLM calls** are async inside Pydantic AI, bridged to sync by `run_coroutine_threadsafe` on a dedicated
  loop thread.
- **Notifications** are synchronous calls after the decision, each in its own `try`, so a failed email or
  upload is logged and the cycle continues.

```python
@workflow.signal(name="submit_decision")
async def submit_decision(self, payload: DecisionSignal) -> None:
    if self._decision is None:
        self._decision = payload
```

The structural point I'd make in an interview: async/sync boundaries are where agent code goes wrong. Here
the boundary is in one place (`ask_structured`), which is good; the cost is that loop mode calls it from
the event loop thread. Running nodes with `asyncio.to_thread` keeps the single boundary and removes the
stall.

</div>

</details>

## Integrations and Background Processing
{: #integrations-and-background-processing }

<details class="project-iq" markdown="1" id="integrations-and-background-processing-q1">
<summary>Which external systems does the application integrate with, and how?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| System | Data sent | Auth | Failure behavior |
|---|---|---|---|
| Monitored SQL Servers | DMV queries; `KILL` when approved | Four scoped logins; Entra tokens for Azure SQL | Cycle error; pod stays ready |
| Azure AI Foundry | Incident facts, SQL text, plans, diagnostics | Workload identity (`Cognitive Services OpenAI User`) | Retries, then deterministic fallback; no kill without a decision |
| Azure Blob Storage | HTML report | Workload identity (`Storage Blob Data Contributor`) | Logged |
| SMTP relay | DBA email | Relay | Logged |
| Key Vault | Secrets | External Secrets with workload identity | Pod can't start without them |
| Developer portal (durable mode) | Approval registration; JSON RCA report | Service-to-service | Retries for 408, 429, 5xx (max 3) |
| Temporal (durable mode) | Workflow state, signals | Per-app connection | Durable by design |

The integration rule I'd highlight: **every LLM call goes through `ask_structured()`**, so model choice,
timeout, retries, token tracking and auth are one place, and the prompts live next to their agent as
Markdown.

The most common integration task is adding a diagnostic for the Analyzer: a read-only tool that returns a
typed result, new state fields, call it before the LLM, and, if it should *block* a kill, make it a
**deterministic gate**, never a prompt hint.

Deeper: [External systems](/posts/projects/sql-blocking-agent/07-data-and-integration/#external-systems-and-third-party-integrations).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Each integration in code:

| System | Library | Notes |
|---|---|---|
| SQL Server | pyodbc + ODBC 18 | Entra token via attribute 1256, or SQL login appended |
| Azure AI Foundry | Pydantic AI over `AsyncOpenAI` (Responses API) | `base_url` normalized to `/openai/v1`; bearer token callable |
| Blob | Azure SDK with `DefaultAzureCredential` | Upload of the rendered report |
| SMTP | `smtplib` + `EmailMessage` | HTML with text alternative; `starttls()` when supported |
| Portal HITL (durable) | HTTP with an API key | Versioned report contract, `correlation_id` as idempotency key |
| Temporal | `temporalio` | Schedules, workflows, signals, activities |

```python
_ep = endpoint.rstrip("/")
if not _ep.endswith("/openai/v1"):
    if _ep.endswith("/openai"):
        _ep = _ep[: -len("/openai")]
    _ep = _ep + "/openai/v1"
```

Gotcha: the portal integration authenticates with an API key from Key Vault (`HITL_PF1_AUTH_METHOD:
apiKey` in the chart), which is the one stored service credential in an otherwise keyless design. A
workload-identity token audience for the portal would remove it.

</div>

</details>

<details class="project-iq" markdown="1" id="integrations-and-background-processing-q2">
<summary>How do you handle rate limits, retries and partial failures from external APIs?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**The LLM:** Pydantic AI retries on schema-validation errors; transient errors retry within a timeout;
and if the model still fails, **deterministic fallbacks** apply. The safety property is that a failure
can only move toward *not* killing: no valid Determination output means no `KILL`. Token use is bounded
by design (three calls per analyzed cycle, one analysis retry, cooldown), so a blocking storm can't turn
into a token storm.

**Our own rate limit:** the **R10 kill-rate limiter** caps kills per server per hour. It's the defence
against a runaway loop, the agent equivalent of a circuit breaker on the most dangerous call.

**Partial failure after a decision:** report upload, email and the portal report can fail independently;
each is logged and recorded without changing the incident's outcome. The portal report retries 408, 429
and 5xx up to three times and doesn't retry 409 and 422, with the `correlation_id` making retries
idempotent.

**Partial failure across servers:** one poller per server, so an unreachable server is an error for that
server only.

**Configuration failure:** a failed refresh keeps the last good configuration rather than dropping
servers; an empty table at startup fails closed.

Deeper: [Resilience](/posts/projects/sql-blocking-agent/05-technical-architecture/#resilience-and-disaster-recovery).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Retry code for the LLM, the integration that rate-limits:

- **SDK retries off** (`LLM_HTTP_MAX_RETRIES=0`) so the wrapper controls back-off.
- **Validation retries** inside Pydantic AI (`retries`, default 2).
- **429 retries** in `ask_structured()`: up to `LLM_429_RETRIES` (2) more attempts, waiting the
  server's `retry-after-ms` or `retry-after` header if present, else 20 then 40 seconds.
- **Everything else** raises to the node, which falls back (`ALERT_ONLY` for Determination).

```python
server_wait = _retry_after_seconds(e)
wait = server_wait if server_wait is not None else _429_BASE_WAIT * (2.0 ** attempt)
await asyncio.sleep(wait)
```

Two gotchas: rate limits are detected partly by string matching (`"429" in str(e)`), which can
misfire on an error message that happens to contain "429"; checking the exception type
(`openai.RateLimitError`) is more precise. And because loop-mode calls block the event loop, a 40-second
back-off sleep (on the background loop) still holds the main loop for that long.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Partial-failure behaviour, as an SRE would chart it:

| Failure | Effect on this cycle | Effect on safety |
|---|---|---|
| Analyzer LLM fails | Falls back to the KB scenario guidance | None: gates still run |
| Determination LLM fails | `ALERT_ONLY` with "LLM unavailable" | Safe |
| RCA LLM fails | Report without RCA | None |
| Blob upload fails | Report only in the pod's `emptyDir` | Evidence at risk |
| Email fails | Logged; no alert to DBAs | Visibility lost |
| Kill-rate query fails | Treated as 0 kills | **Unsafe: limit off** |
| Audit insert fails | Errors in state, logged | Evidence lost |

```bash
kubectl logs deploy/<release> -n <ns> --since=24h | grep -E "LLM 429|defaulting to ALERT_ONLY|notification failed|kill_rate_query_failed" | sort | uniq -c
```

The alert I'd add first: email failures, because a broken relay means DBAs silently stop hearing about
blocking while the agent looks healthy.

</div>

</details>

<details class="project-iq" markdown="1" id="integrations-and-background-processing-q3">
<summary>How are scheduled and background jobs designed and coordinated?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Two run modes, sharing the same agents and tools:

**Loop mode (production):** `main.py` loads configuration, starts the approval API, and runs one asyncio
poller per server on its poll interval (`PollIntervalSeconds` per row, else `POLL_INTERVAL_SECONDS`).
Rules: skip a
tick if the previous cycle is still running; refresh configuration every minute; one replica only, because
there's no leader lock.

**Temporal mode (optional, off in production):** each cycle is a workflow and each step an activity. The
approval wait becomes a **durable signal**, so a half-finished approval survives a restart; cooldown moves
to a table; and the **Action activity runs with a single attempt**, so a kill is never retried
automatically. Schedules replace the in-process loop.

Why two modes? Loop mode is simple and enough while production is dry-run: losing one cycle to a restart
costs a missed report, not a bad kill. Durable mode is for the day an approved kill must survive a restart
mid-flight.

Coordination across replicas is the open problem: a distributed lock in AgentConfigDB (for example
`sp_getapplock`) or per-server leases would allow more than one replica without two pollers watching the
same server.

Deeper: [Durable mode](/posts/projects/sql-blocking-agent/05-technical-architecture/#resilience-and-disaster-recovery).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The loop-mode scheduler, in code:

```python
while not runtime["stop"].is_set():
    if current_task is not None and not current_task.done():
        log.info("[%s] Previous cycle still running — skipping this tick", server)
    else:
        current_task = asyncio.create_task(_cycle_task(server_config))
    try:
        await asyncio.wait_for(runtime["wake"].wait(),
                               timeout=max(1, int(server_config["poll_interval_seconds"])))
    except asyncio.TimeoutError:
        pass
    runtime["wake"].clear()
```

- **Reconciliation**: every refresh interval, `_reconcile_loop_pollers` stops pollers for removed or
  disabled rows, starts new ones, and wakes pollers whose config changed.
- **Exceptions** in a cycle are caught in `_cycle_task` and logged; the poller keeps going.
- **Temporal mode**: `reconcile_schedules()` creates, updates or deletes one Schedule per server, and
  Temporal handles overlap.

Gotcha: the code default `POLL_INTERVAL_SECONDS` is `6000`, 100 minutes, which looks like a typo. Any
server row without `PollIntervalSeconds` and any environment without the variable would be checked almost
never. A sane default (60) and a test asserting it would catch that.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Background work, from the platform side:

- **Loop mode** needs nothing but the pod. Changing a schedule is a `TargetServers` row update (picked up
  on the next refresh) or `POLL_INTERVAL_SECONDS` in values.
- **Temporal mode** needs the platform's Temporal frontend (`TEMPORAL_HOST`), a namespace per environment
  and a task queue. Schedules are created by the agent itself at startup and on refresh.

```bash
temporal operator namespace describe <ns>
temporal schedule describe --schedule-id <schedule-id> --namespace <ns>
temporal schedule toggle --schedule-id <schedule-id> --pause --reason "maintenance" --namespace <ns>
```

Operational gotcha: the agent reconciles schedules from `TargetServers` on every refresh (creating,
updating and deleting stale ones), so a manual change in the Temporal UI can be overwritten. I'd treat
the `TargetServers` row as the only durable way to stop monitoring a server, and check whether an
update resets a manual pause before relying on one.

</div>

</details>

## Security and Identity
{: #security-and-identity }

<details class="project-iq" markdown="1" id="security-and-identity-q1">
<summary>How do users authenticate, and how is authorization enforced?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The framing I use: an agent with `ALTER ANY CONNECTION` on production SQL Servers is **a privileged
automation account with an LLM attached**. The question isn't "is the model smart enough?" but "what's the
worst this identity can do, and what stands in the way?"

**Machine identities** are the strong part:

- workload identity for Azure AI Foundry, Blob and Key Vault, so **no LLM API keys exist**;
- four SQL logins split by power in the setup script (reader, killer, config reader, insert-only
  logger), though the code currently connects with one identity per database;
- Entra tokens for Azure SQL targets; a shared login for VM-hosted servers, from the secret store.

**Human authorization** is layered: hard gates decide what's even eligible; a DBA must approve any `KILL`;
timeout means deny; each approval ID resolves one pending decision, once.

**The honest gap:** the approval API has no authentication or authorization today. It's accepted only
while the API stays cluster-internal (a ClusterIP Service, no Ingress), and production is dry-run, so it isn't yet a path to a
real kill. Before real kills, I'd require an Entra ID token, check DBA approver group membership, and
record the **authenticated** identity, not a caller-supplied reviewer name.

> **TODO:** What's the plan and date for authenticating the approval API?
{: .prompt-warning }

Deeper: [Authentication and authorization](/posts/projects/sql-blocking-agent/06-security-and-privacy/#authentication-and-authorization).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Identity in code:

- **LLM**: `get_bearer_token_provider(DefaultAzureCredential(), "https://ai.azure.com/.default")`, passed to
  `AsyncOpenAI` as a callable `api_key`, so each request gets a fresh Entra token. There's no API-key path.
- **SQL**: `connect_sql()` decides per connection: Entra token for `PAAS`/`MI` targets (and for the agent's
  own databases when `SQL_AUTH_MODE=entra`), `UID`/`PWD` appended for `IAS`.
- **Humans**: none in code. The approval endpoints take no identity, and the audit records
  `human_decision` but not who.

How I'd add human auth in this codebase, with FastAPI dependencies:

```python
async def approver(authorization: str = Header(...)) -> str:
    claims = verify_entra_jwt(authorization.removeprefix("Bearer "), audience=API_AUDIENCE)
    if APPROVER_GROUP_ID not in claims.get("groups", []):
        raise HTTPException(status_code=403)
    return claims["preferred_username"]

@app.post("/approvals/{approval_id}/approve")
async def approve(approval_id: str, body: Decision, who: str = Depends(approver)) -> dict: ...
```

(`verify_entra_jwt` would wrap a JWKS check; that's the sketch, not existing code.) Then `who` goes into
`human_reviewer`, which the state model already has a field for.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Identity as deployed:

- **Workload identity**: the ServiceAccount (created by the chart) is federated to a managed identity, and
  the pod label `azure.workload.identity/use: "true"` injects the token file and client ID.
- **Roles for that identity**: `Cognitive Services OpenAI User` on the Foundry resource, `Storage Blob Data
  Contributor` on the report container, Key Vault secret read for External Secrets, and a contained
  database user in each Entra-authenticated database.
- **Human access** to approvals is whoever can port-forward to the pod.

```bash
az identity federated-credential list --identity-name <identity> --resource-group <rg> -o table
az role assignment list --assignee <client-id> --all -o table
kubectl get sa <release> -n <ns> -o yaml | grep azure.workload.identity
```

The gap I'd close at the platform layer first: one managed identity does everything (reads DMVs, kills,
writes audit, calls the model, uploads reports). Two identities, a monitor one and a kill-only one, with
the `KILL` connection using the second, would make "a diagnostics bug can't become a kill" true at the
identity level.

</div>

</details>

<details class="project-iq" markdown="1" id="security-and-identity-q2">
<summary>How are secrets and credentials managed?</summary>

<div class="iq-role" data-role="architect" markdown="1">

- **No LLM keys at all:** `DefaultAzureCredential` with a bearer-token provider, through the pod's workload
  identity.
- **SQL credentials and other secrets** come from Azure Key Vault through the **External Secrets
  Operator**, using a `SecretStore` authenticated by workload identity. Nothing sensitive is in Helm
  values.
- **Connection strings** live in `TargetServers`, but credentials for VM-hosted servers are appended at
  connect time from the environment, **never stored in the row**.
- **Setup scripts** use obvious placeholders (`ReplaceWithStrongPassword…`) so nobody ships a default.
- **Locally**, developers use their own `az login` for the model and a local SQL Server Express.

The gap I'd name: **rotation**. The shared SQL login for VM-hosted servers and the four agent logins
should rotate on a schedule, which the secret store makes painless. And the `KILL` login is the most
sensitive identity in the system, so it should exist **only on servers where real kills are enabled**,
not everywhere the agent watches.

Deeper: [Secrets](/posts/projects/sql-blocking-agent/06-security-and-privacy/#secrets-and-key-management).

</div>

<div class="iq-role" data-role="developer" markdown="1">

How secrets reach and leave the code:

- **Environment only**: `SQLLOGIN_USERNAME`/`SQLLOGIN_PASSWORD` (IAS targets), `SQL_USER`/`SQL_PASSWORD`
  (only with `SQL_AUTH_MODE=sql`), `APPLICATIONINSIGHTS_CONNECTION_STRING`, the portal API key.
- **Escaping**: passwords are wrapped in `{...}` with `}` doubled, so a password containing `;` can't
  inject connection-string attributes.
- **Local**: `.env` loaded by `python-dotenv` before any module reads the environment.

{% raw %}
```python
escaped_password = password.replace("}", "}}")
return f"{conn_str.rstrip()}{separator}UID={{{escaped_username}}};PWD={{{escaped_password}}};"
```
{% endraw %}

Gotcha: the ExternalSecret maps `CONFIGDB_USERNAME` and `CONFIGDB_PASSWORD`, but the code reads
`SQL_USER`/`SQL_PASSWORD` for the agent's own databases. With `SQL_AUTH_MODE=entra` they aren't used at
all; if someone switches to SQL auth, the names won't line up. One naming scheme, checked by a unit test
over the chart's secret keys, avoids the surprise.

</div>

<div class="iq-role" data-role="devops" markdown="1">

The secret plumbing:

- **`existingSecret: sql-blocking-agent-secrets`** referenced with `envFrom`, created by an
  `ExternalSecret` (`refreshInterval: 1h`) from a namespaced `SecretStore` that authenticates to Key Vault
  with workload identity.
- **Keys**: App Insights connection string, config DB credentials, the HITL API keys, the shared IAS SQL
  login.
- **No LLM key** anywhere.
- **Placeholders** in `03_logins.sql` (`ReplaceWithStrongPassword…`) so nobody runs it as-is.

```bash
kubectl get externalsecret -n <ns> -o wide
kubectl get secret sql-blocking-agent-secrets -n <ns> -o jsonpath='{.data}' | jq 'keys'
az keyvault secret set --vault-name <vault> --name sqllogin-password --value '<new>'   # rotate
kubectl rollout restart deploy/<release> -n <ns>                                        # env doesn't hot-reload
```

Gotcha: rotating the shared IAS login means changing it on every VM-hosted server at the same moment
as Key Vault, then restarting the pod. Two logins used alternately (create the new one everywhere,
switch Key Vault, restart, then drop the old one) avoids a monitoring gap.

</div>

</details>

<details class="project-iq" markdown="1" id="security-and-identity-q3">
<summary>How is sensitive data protected, and which compliance constraints applied?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The agent reads data that's sensitive in a quiet way: **SQL text** (which can contain literals), login
names, host names and execution plans. Some of that goes to the model, the reports and the logs, so I'd
classify by where it flows:

| Data | Classification | Protection |
|---|---|---|
| AgentConfigDB (connection details) | Confidential | Read-only login; DBA-owned |
| DMV snapshots, SQL text, plans | Confidential: may contain literals | Sent to a model **inside the tenant** |
| Audit tables | Confidential, audit evidence | Insert-only writer |
| RCA reports and emails | Confidential | Private Blob container; DBA distribution |
| Logs and telemetry | Internal, may contain SQL text | Shorter retention |

**Model data handling:** the model is Azure AI Foundry inside the organization's tenant, with managed
identity, which is the first question security asks about LLMs and production data.

**Compliance for a production change:** for any kill, an auditor should be able to answer, from records
alone, why the agent thought it was needed, which safety rules were checked, who approved and with what
note, what exactly was killed, whether it worked, and what the follow-up was. The audit rows plus the RCA
report answer all of that, once the approver's identity is authenticated.

Deeper: [Audit requirements](/posts/projects/sql-blocking-agent/17-governance-and-compliance/#audit-requirements).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Data protection controls in the platform:

| Data | Control in place | Gap |
|---|---|---|
| Traffic to SQL | `Encrypt=Yes;TrustServerCertificate=No` in connection strings | Local seed row uses `TrustServerCertificate=yes` (fine for a laptop only) |
| Traffic to the model | HTTPS with the organization's CA bundle (`SSL_CERT_FILE`, `REQUESTS_CA_BUNDLE`) | None |
| Reports | Private Blob container, identity-based upload | Retention policy not in the repo |
| Telemetry | Sent only when `LOCAL=false` and a connection string exists | App Insights retention to set |
| Container | Non-root (999), read-only root filesystem, no capabilities, seccomp default | NetworkPolicy off by default |
| Logs | SQL text and login names can appear | Shorter retention than audit |

```bash
kubectl get networkpolicy -n <ns>
az monitor app-insights component show --app <appi> -g <rg> --query retentionInDays
```

The default I'd change in the chart: `networkPolicy.enabled: true` with egress limited to SQL (1433),
HTTPS (443) for Foundry, Blob, Key Vault and the portal, SMTP (25) to the relay, and Temporal.

</div>

</details>

<details class="project-iq" markdown="1" id="security-and-identity-q4">
<summary>Which threats did you design against?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Threat | Control | Residual risk |
|---|---|---|
| The LLM proposes a harmful `KILL` | Hard gates first; human approval; no LLM tool runs SQL | Approver misreads evidence |
| **Prompt injection** via SQL text, login or program names | Output is a validated schema; no tools; gates decide on facts | A misleading RCA narrative |
| SPID reused by a new session before the kill | Pre-kill identity check (SPID, login name, login time) | None known |
| Kill on a protected or system session | `session_id <= 50`, non-user processes, `ProtectedLogins`; unknown fails closed | Missing protected entries |
| Runaway kills | R10 kill-rate limit | Limit set too high |
| Two replicas both act | Single replica until a leader lock | Someone scales the deployment |
| Unauthorized approval | Cluster-internal Service only (no Ingress in the chart) | No API auth yet; anyone who can port-forward can approve |
| Audit tampering | Logger can only `INSERT` | Admins on the management server |
| Credential leakage | Key Vault, External Secrets, keyless LLM | Shared SQL login for VMs |

Two I'd discuss in depth. **Prompt injection** is defused structurally: even if text in a DMV steered the
model, the model can't act, and the gates and human decide on facts. The residual risk is a misleading
narrative, not a kill. And **SPID reuse** is the classic subtle bug: a session ID can belong to a
different session by the time a human approves, so the action re-verifies identity.

Deeper: [Threat modeling](/posts/projects/sql-blocking-agent/06-security-and-privacy/#threat-modeling).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Threats with the code that addresses each, and where the code falls short:

| Threat | Code | Gap |
|---|---|---|
| SQL injection via SPID | `KILL {int(session_id)}` | None |
| SQL injection elsewhere | `?` parameters in every query | None seen |
| Prompt injection via SQL text | Typed `output_type`; gates before the LLM | The SQL text goes into the prompt unlabelled as data |
| SPID reuse | `_validate_live_identity()` on `login_name` and `login_time` | None |
| Duplicate kill in one cycle | `check_existing_kill(correlation_id, spid)` | Two pods could still race |
| Report XSS | `_esc()` / `html.escape` | `_esc` skips `'` |
| Silent state corruption | Re-validation in `_apply()` | Unknown keys ignored |
| Unsafe failure | Most fallbacks go to `ALERT_ONLY` | R10 fails open |

```python
except Exception as e:
    log.warning("[%s] kill_rate query failed: %s -- assuming 0", input.server_name, e)
    return KillRateOutput(kills_last_hour=0, errors=[f"kill_rate_query_failed: {e}"])
```

That last block is the one I'd change first: return a count that trips the limit, so an unknown answer
means "don't kill".

</div>

<div class="iq-role" data-role="devops" markdown="1">

Platform threats and controls:

| Threat | Today | Control to add |
|---|---|---|
| Unauthorized approval | Port-forward RBAC | SSO ingress plus API auth |
| Lateral movement from the pod | NetworkPolicy off by default | Egress allow-list |
| Compromised image | Xray and build scans in CI; CodeQL commented out | Re-enable CodeQL, fail on severity |
| Two pods both killing | 1 replica, rolling update default | `strategy: Recreate`; a lease |
| Over-privileged identity | One managed identity for everything | Split monitor and kill identities |
| Chart deployed without overrides | `DRY_RUN: "false"`, `runMode: temporal` defaults | Safe defaults in `values.yaml` |

```yaml
strategy:
  type: Recreate          # never two pollers during a rollout
```

```bash
kubectl get deploy <release> -n <ns> -o jsonpath='{.spec.strategy.type}'
```

The one with the best effort-to-value ratio is `Recreate`: a single line that removes the only window in
which two copies of the agent can watch the same servers.

</div>

</details>

## Performance and Scalability
{: #performance-and-scalability }

<details class="project-iq" markdown="1" id="performance-and-scalability-q1">
<summary>What load does the system handle, where are the bottlenecks, and how does it scale?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The load is **servers × poll frequency**, plus LLM work only when there's blocking:

- A quiet server costs **one DMV query per poll and no tokens**.
- An analyzed incident costs **three LLM calls**; the 10 July live run measured about **9.6k tokens** for
  one analyzed incident.
- Cooldown stops a persistent blocker from being re-analyzed on every poll.

Scaling within one process: one asyncio poller per server, skip-don't-queue when a cycle overruns. The
limit inside the process is that loop-mode nodes run on the event loop thread, so LLM calls on one server
serialize with every other server's polling.

**The bottleneck is replicas**, not CPU. Without a leader lock, two replicas would poll the same servers
and could both decide to kill, so production is pinned to one. The Helm record notes a requirement for up
to ten replicas, which has to wait for a distributed lock or per-server leases.

Latency that matters is **time to a DBA receiving the RCA**, which is the poll interval plus three LLM
calls plus approval time.

> **TODO:** How many SQL Servers does production monitor today, and what's the target time from blocking
> start to the RCA email?
{: .prompt-warning }

Deeper: [Scalability strategy](/posts/projects/sql-blocking-agent/05-technical-architecture/#scalability-and-performance-strategy).

</div>

<div class="iq-role" data-role="sre" markdown="1">

Load model and saturation points:

- **Per server per poll**: one `BLOCKING_SQL` query; diagnostics only when there's blocking.
- **Per analyzed incident**: Analyzer and Determination calls (one retry at most), then RCA. Measured in a
  live run at roughly 9.6k tokens for one incident.
- **Saturation 1, the event loop**: in loop mode, LLM calls block the loop, so N servers with simultaneous
  incidents are processed one LLM call at a time, and the approval API waits too.
- **Saturation 2, model quota**: 429 back-off of 20 then 40 seconds per call.
- **Saturation 3, the replica**: one pod by design.

```bash
kubectl top pod -n <ns> -l app.kubernetes.io/name=<chart-name>
kubectl logs deploy/<release> -n <ns> --since=1h | grep -c "Previous cycle still running"
```

"Previous cycle still running — skipping this tick" is the saturation signal I'd chart per server: it
means cycles take longer than the poll interval.

> **TODO:** How many servers does production monitor, and how often does that skip line appear?
{: .prompt-warning }

</div>

</details>

<details class="project-iq" markdown="1" id="performance-and-scalability-q2">
<summary>How would the design change at ten times the users or data?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Ten times the **servers** is the real question:

1. **Partition servers across replicas** with a lease per server (for example `sp_getapplock` in
   AgentConfigDB, or lease rows with expiry). Each replica claims servers; a dead replica's leases expire
   and another takes over. The single-poller-per-server rule holds, and replicas become possible.
2. **Durable mode** becomes more attractive: Temporal schedules per server distribute work naturally, and
   approvals survive restarts.
3. **LLM quota and cost:** at 10x servers, simultaneous incidents become likely (a shared dependency can
   block many databases at once). I'd add a global concurrency limit on LLM calls, keep cooldown in the
   database, and use per-agent model settings (a cheaper thinking level for the RCA, the longest output).
4. **Alert fatigue:** group related incidents (same login and program across servers) into one report.
5. **Heartbeats per server** become essential, because "silent server" is harder to notice among many.

Ten times the **DBAs** is mostly about the approval path: authenticated approvals, group-based
authorization, and moving approvals to the developer portal's web inbox in durable mode.

What doesn't change: the gates, the LLM boundary and the audit model.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Platform changes for 10x servers:

- **Leases first**: a lease row per server in AgentConfigDB (or `sp_getapplock`) so more than one replica
  can run, each claiming a subset.
- **Temporal mode** as the scale path: one Schedule per server, workers scale horizontally on the task
  queue, and the platform handles overlap.
- **Resources**: raise requests from 250m/512Mi once more servers share a process; the limit is mostly the
  event loop, not CPU.
- **Model capacity**: per-agent deployments (`LLM_MODEL_RCA` on a cheaper model) and quota per deployment.

```bash
kubectl scale deploy/<release> -n <ns> --replicas=2        # only after leases exist
temporal task-queue describe --task-queue sql-blocking-agent --namespace <ns>
```

Until leases exist, I'd add a guard in the chart: a `values.schema.json` rule that `replicaCount` must be
1 when `runMode` is `loop`, so the scale-out mistake fails at render time.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Reliability at 10x:

| Risk | Guardrail |
|---|---|
| Many incidents at once (a shared dependency blocks many databases) | A global concurrency limit on LLM calls; group incidents by login and program |
| Cycle time exceeds poll interval | Alert on "skipping this tick" per server |
| Alert fatigue for DBAs | One grouped email per root cause |
| More servers silently unmonitored | Per-server heartbeat SLO |
| Quota exhaustion | Token budget per hour, alert at 80% |

```bash
kubectl logs deploy/<release> -n <ns> --since=1h | grep "LLM 429" | wc -l
```

The SLO I'd set at that scale: 99% of active servers have a completed cycle within three poll intervals,
measured every minute. That's the number that tells you whether 10x worked.

</div>

</details>

<details class="project-iq" markdown="1" id="performance-and-scalability-q3">
<summary>How did you measure and improve performance?</summary>

<div class="iq-role" data-role="architect" markdown="1">

For an agent, "performance" is mostly **cost and boundedness**, and those were designed in:

| Improvement | Effect |
|---|---|
| LLM only on blocking | Quiet servers cost no tokens |
| Three calls per analyzed cycle, one retry max | Predictable cost per incident |
| Cooldown | No re-analysis of a persistent blocker every poll |
| Per-agent model and thinking level by env var | Tune the expensive step (RCA) independently |
| Move to Pydantic AI | Built-in token usage; fewer failed parses and retries |

**Measurement:** a token tracker reports totals per cycle and per agent, Pydantic AI instrumentation
(through Logfire) traces each agent run with tokens and retries, and the live-run analysis recorded the
baseline: three LLM requests per analyzed cycle and about 9.6k tokens for one analyzed incident.

**Next optimizations**, each measurable against that baseline: compare RCA quality at a lower thinking
level, alert on token spikes per incident, and check whether the Analyzer needs every diagnostic for every
KB scenario.

> **TODO:** What's the monthly LLM spend for the agent today?
{: .prompt-warning }

Deeper: [Cost optimization](/posts/projects/sql-blocking-agent/18-continuous-improvement/#cost-optimization).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Measuring and improving in code:

- **Token tracking**: `token_tracker.start_cycle()`, `record(agent, usage)` per call, `end_cycle()`, and a
  rendered table per cycle and per session; Logfire gets one line per agent response.
- **Per-node timing**: `node_span(name)` wraps each node in a span with the session ID.
- **Cost controls tested**: `test_workflow_cost_controls.py` checks that degraded config suppresses every
  LLM node and that cooldown runs the LLM pipeline once per incident.
- **Per-agent tuning**: `LLM_MODEL_*` and `LLM_THINKING_*` env vars, read at import time.

```python
AGENT_CONFIGS = {
    "analyzer": AgentLLMConfig(model=os.getenv("LLM_MODEL_ANALYZER", "gpt-5-mini"),
                               thinking=os.getenv("LLM_THINKING_ANALYZER", "medium")),
    ...
}
```

The improvement I'd make next in code: run nodes off the event loop. It doesn't make a single cycle
faster, but it lets cycles for different servers overlap, which is the real throughput limit with more
than a handful of servers.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Performance signals and targets:

| Signal | Source | Target |
|---|---|---|
| Cycle duration (no blocking) | Session summary event | Well under the poll interval |
| Cycle duration (analyzed) | Same | Under 2 minutes excluding approval |
| Tokens per analyzed incident | Token tracker | Baseline about 9.6k; alert at 2× |
| LLM 429s per hour | Logs | Near zero |
| Skipped ticks per server | Logs | Zero in steady state |

The session-summary event (`log_session_summary`) already carries decision, kill status, risk, errors,
duration and token totals per cycle, and goes to Application Insights when deployed, so a workbook over
that event is the dashboard.

```kusto
customEvents
| where name has "session"
| summarize p95_s = percentile(todouble(customDimensions.duration_s), 95) by bin(timestamp, 1h)
```

(The exact event and field names would need checking against the exporter's output; the query shape is
the point.)

</div>

</details>

## Reliability and Resilience
{: #reliability-and-resilience }

<details class="project-iq" markdown="1" id="reliability-and-resilience-q1">
<summary>What are the failure modes, and how does the system degrade when a part fails?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Failure | Behavior |
|---|---|
| `TargetServers` read fails | Keep current pollers; don't treat failure as "no servers" |
| Empty `TargetServers` at startup | Fail closed: no monitoring rather than guessing |
| LLM error or invalid output | Retries, then deterministic fallbacks; **no decision means no kill** |
| Approval never answered | Timeout downgrades to `ALERT_ONLY` |
| SQL connection fails | Cycle error for that server; pod stays ready |
| Pod restarts mid-cycle | Loop mode loses that cycle and the in-memory cooldown |
| Kill issued, session still there | `STILL_PRESENT` recorded and reported |

Every failure degrades **toward not killing**, with one exception I found in the code: the R10
kill-rate check treats a failed query as zero kills, so it fails open. That's the reliability principle
for a system with a destructive action (the safe state is inaction plus a report), and that one gate
should follow it too.

The failure mode I worry about most is the opposite one: **silence**. When a monitoring agent breaks, no
reports looks exactly like no blocking. And today's `/health` only proves the API answers HTTP, not that
pollers are polling. The fix is a **poller heartbeat** (a timestamp per server) checked by the liveness
probe and alerted on, with "minutes unmonitored" as the headline reliability number.

Deeper: [Resilience](/posts/projects/sql-blocking-agent/05-technical-architecture/#resilience-and-disaster-recovery).

</div>

<div class="iq-role" data-role="sre" markdown="1">

Failure modes and detection:

| Failure | Behaviour | Detection |
|---|---|---|
| Event loop blocked by an LLM call | All pollers and the approval API pause | Synthetic `GET /pending` latency |
| One server unreachable | "Cycle crashed" for that server | Consecutive failures per server |
| Config DB down at start | Process exits; pod restarts | CrashLoopBackOff alert |
| Kill-rate query fails | Limit treated as 0 (unsafe) | `kill_rate_query_failed` |
| Email relay down | DBAs not told | Notification failure count |
| Blob down | Report lost with the pod | Upload failure count |
| Temporal worker hung | No probes | Task-queue backlog |

The theme: the most dangerous failures don't crash anything. So I'd alert on log signals and synthetic
checks, not just pod state, and I'd test each alert once in development by causing the failure on
purpose (point the config DB at a bad host, block port 25 with a NetworkPolicy, and so on).

```bash
kubectl get pods -n <ns> -w
kubectl logs deploy/<release> -n <ns> --since=15m | grep -E "Cycle crashed|refresh failed|notification failed"
```

</div>

</details>

<details class="project-iq" markdown="1" id="reliability-and-resilience-q2">
<summary>What are the availability and recovery targets, and how are backup and disaster recovery handled?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The targets I proposed, to agree between the DevOps and database teams, measure **coverage and response**,
not uptime:

| Situation | Response | Restore |
|---|---|---|
| A server silently unmonitored | 30 minutes | 2 hours |
| Agent down for all servers | 15 minutes | 1 hour (redeploy or roll back) |
| Disputed decision | Next working day | Gate or threshold change in the next release |
| Failed kill validation | 30 minutes (database team) | Manual intervention |

**Recovery:** the agent is stateless in loop mode, so Argo CD restores it from Git. AgentConfigDB is the
critical dependency (without it the agent fails closed), so it belongs in the database team's backup and
restore testing; AgentLogDB is evidence; Blob reports need soft delete and versioning.

**Durability of in-flight work** is a deliberate trade-off: loop mode can lose a cycle mid-approval on a
restart, which is acceptable in dry-run. Temporal mode removes that risk when real kills make it matter.

**The kill switch** is part of recovery: flip `DRY_RUN` to `true` through Argo CD first, investigate
second.

> **TODO:** Are these targets agreed, and is there on-call coverage on both teams for the hours real kills
> will be enabled?
{: .prompt-warning }

Deeper: [SLOs](/posts/projects/sql-blocking-agent/16-support-and-maintenance/#service-level-objectives).

</div>

<div class="iq-role" data-role="devops" markdown="1">

DR as concrete steps:

1. **Agent**: Argo CD re-syncs the Deployment from Git; nothing stateful in the pod.
2. **Secrets**: External Secrets re-creates them from Key Vault.
3. **Databases**: restore AgentConfigDB and AgentLogDB (point-in-time on Azure SQL), then update the
   connection strings in values if the server name changed.
4. **Durable mode**: Temporal history lives in the platform's Temporal cluster; workflows resume on any
   worker.
5. **Kill switch**: `DRY_RUN: "true"` in values, merge, sync.

```bash
argocd app sync <app> && argocd app wait <app> --health
az sql db restore --dest-name AgentConfigDB --name AgentConfigDB --server <server> -g <rg> --time <utc>
kubectl logs deploy/<release> -n <ns> | grep -E "Monitoring [0-9]+ server|dry_run="
```

The DevOps detail that matters for the kill switch: `DRY_RUN` comes from the environment, which only
changes on a pod restart. The Deployment carries a `checksum/config` annotation over the ConfigMap, so
changing the value in Git rolls the pod on sync; the switch takes effect when the new pod starts.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Targets I'd hold, written as SLOs:

| SLO | SLI | Target |
|---|---|---|
| Coverage | Servers with a completed cycle in the last 3 poll intervals ÷ active servers | 99% of minutes |
| Safe decisions | Kills without approval, kills on protected sessions | 0 |
| Human loop | Approvals answered before timeout ÷ approval requests | 90% |
| Evidence | Cycles with audit rows ÷ analyzed cycles | 99.9% |
| Kill switch | Time from "flip DRY_RUN" to dry-run confirmed in logs | Under 10 minutes |

Error budget policy: if coverage burns its monthly budget, real kills pause (dry-run) until it's
restored, because an agent that's sometimes blind shouldn't be the one acting.

```bash
kubectl logs deploy/<release> -n <ns> | grep "dry_run=" | tail -1
```

> **TODO:** Confirm the agreed targets and the on-call hours for both teams.
{: .prompt-warning }

</div>

</details>

<details class="project-iq" markdown="1" id="reliability-and-resilience-q3">
<summary>How do you make jobs and deployments safe to retry?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Cycles are safe to repeat** except for one step, and that step is engineered separately:

- Detection, analysis and reporting are read-only or append-only; repeating them costs tokens, which
  cooldown limits.
- **The `KILL` is never retried automatically.** In durable mode the Action activity has a single
  attempt. Before acting, the session's identity is re-verified; after acting, the result is validated
  (`CONFIRMED_GONE`, `ROLLING_BACK`, `STILL_PRESENT`). `STILL_PRESENT` is reported to a human, not retried.
- External reports use the `correlation_id` as an **idempotency key**, so a retried upload is recognized
  as a duplicate.

**Deployments** are GitOps: the release workflow re-tags the tested image (no rebuild), publishes the
chart, and promotion opens a PR that Argo CD syncs. Rollback is promoting the previous version. Schema
scripts are additive or guarded, so re-running them is safe, and they're applied before the code that
needs them.

The deployment safety I'd point out: the **chart default `DRY_RUN: "false"`** differs from the code default
(`true`). A missing environment override would enable real kills, so the chart default should become
`"true"`. Safe defaults belong in every layer.

Deeper: [Rollout](/posts/projects/sql-blocking-agent/13-deployment-and-go-live/#deployment-runbook).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Retry safety in code:

- **Kill dedupe** keyed by correlation ID and SPID, checked before executing.
- **Audit written immediately** after the kill, before RCA and notification, so a crash can't lose the
  record of an irreversible action.
- **Temporal**: node activities retry up to 3 times with back-off; the Action activity has
  `RetryPolicy(maximum_attempts=1)`.
- **Validation result**, not a retry: `STILL_PRESENT` is reported.

```python
return await workflow.execute_activity(
    action_activity, node_input,
    start_to_close_timeout=timedelta(seconds=180),
    retry_policy=RetryPolicy(maximum_attempts=1),
)
```

Gotcha with that setting: if the activity times out after the `KILL` was sent but before the result came
back, Temporal records a failure and won't retry (good), but the workflow doesn't know whether the kill
happened. The validation step should run in a separate activity after a timeout too, so the outcome is
observed rather than assumed.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Deployment safety:

- **Re-tag, don't rebuild**: the release path re-tags the image built and scanned on `main`.
- **Production promotion**: `promote.yaml` (behind the `production` environment) writes the version into
  `versions.yaml` on a branch, opens a PR, approves and merges it with a release token, then dispatches the
  GitOps promotion.
- **Rollback**: promote the previous version the same way.
- **One replica**: use `Recreate` so a rollout never overlaps two pollers.

```bash
gh workflow run promote.yaml -f environment=production -f service=sql-blocking-agent -f version=v1.0.6
argocd app history <app>
```

Gotcha: the workflow approves its own PR (`gh pr review --approve`) before merging. The human gate is
the `production` environment's required reviewers, so those must be configured; otherwise production
promotion has no human in it at all.

</div>

</details>

## Testing and Quality
{: #testing-and-quality }

<details class="project-iq" markdown="1" id="testing-and-quality-q1">
<summary>What is your testing strategy across the frontend, backend and data?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Lopsided on purpose:** far more effort goes into proving what the agent *won't* do than what it will.
The repo has **over 230 unit tests in 29 files**, end-to-end tests against a real SQL Server, and a harness
that performs a **real kill** and restores the database afterwards.

| Area | Examples |
|---|---|
| Detection and diagnostics | Detection, locks, log safety, plan cache, Query Store |
| **Governance** | Determination gates, exclusion windows, incident cooldown |
| **Action path** | Action agent, SQL executor, validator, connection |
| LLM layer and cost | LLM wrapper, RCA, usage tracking, workflow cost controls |
| Config | Multi-server loading, per-server overrides, reload |
| Output | Audit log, report renderer, notifications, Blob |
| Approval and telemetry | Router, telemetry |

**LLM output** is tested as a contract: recorded model responses run through the Pydantic schemas, so a
schema change shows up as a test failure, not as retries in production. **Model changes** are compared on
recorded incidents in dry-run.

The habit I'd highlight: every safety change starts with the **policy in one sentence** (including how
missing data behaves), a baseline test run, then code in the deterministic tool, never in a prompt, then
tests for match, mismatch and missing values.

> **TODO:** What's the current pass count and coverage of the unit suite?
{: .prompt-warning }

Deeper: [Unit testing](/posts/projects/sql-blocking-agent/10-quality-assurance/#unit-testing).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The test suite, by intent:

- **Gates**: `test_determination_gates.py` drives `_check_hard_gates()` with small dicts and asserts the
  decision, rule number and reason, including boundaries (SPID 50 is still protected).
- **Action path**: executor, validator, connection tests with injected fakes (`query_sql`,
  `execute_kill_fn`), including `@@TRANCOUNT` handling and identity mismatch.
- **LLM layer**: `test_llm.py` covers `Retry-After` parsing and that the token provider runs in a worker
  thread, without calling a model.
- **Config**: multi-server loading, overrides, reload.
- **Output**: report renderer, notifications, Blob, audit log.
- **Temporal**: activities and scheduling without a Temporal server.

```python
def test_r3_boundary_protects_spid_50():
    agent = make_agent()
    gate = agent._check_hard_gates(make_state(), {"login_name": "app_user", "is_user_process": True}, spid=50)
    decision, risk, reason, rule, dba_approval = gate
    assert decision == "ALERT_ONLY" and rule == 3
```

```bash
uv run pytest tests/unit -q --cov=src --cov-report=term-missing
uv run ruff check .
```

Tests I'd add: one for R10 failing closed (today it would fail), one that a misspelled state key raises,
and one that the approval handlers set the event on the loop thread.

</div>

</details>

<details class="project-iq" markdown="1" id="testing-and-quality-q2">
<summary>How do you test integrations with external systems?</summary>

<div class="iq-role" data-role="architect" markdown="1">

- **SQL Server for real.** `tests/e2e/test_end_to_end.py` runs a full cycle in dry-run against a local SQL
  Server, with approval off so it runs unattended; `setup_databases.py` creates the config and audit
  databases for it.
- **The live kill harness.** `tests/e2e/test_live_kill.py` creates a blocker and a victim, runs the
  cycle, issues a **real `KILL`**, validates, writes audit rows and renders the report. The 10 July run
  documented it: blocker SPID 76, victim SPID 79, decision `KILL`, kill status `SUCCESS`. It also found
  two harness problems, which is exactly why it exists.
- **A blocking generator** (`trigger_blocking_test.py`) produces a full incident on demand in development.
- **Development runs real kills** against non-production servers, with approval, so the action path is
  proven continuously before production ever kills.
- **Contracts:** the portal report v1 has fixtures for valid, too large and unsupported version; the
  approval router has its own tests; LLM schemas are validated against recorded responses.
- **The model** is reached with the developer's own `az login` locally; Temporal unit tests need no server.

What I'd add: run the live harness in a pre-release CI job against a disposable SQL Server container.

Deeper: [End-to-end testing](/posts/projects/sql-blocking-agent/10-quality-assurance/#end-to-end-testing).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Integration tests as code:

- **`tests/e2e/setup_databases.py`** creates AgentConfigDB and AgentLogDB locally.
- **`tests/e2e/test_end_to_end.py`** sets up a table, runs a baseline cycle (no blocking expected),
  creates blocking, runs a cycle in dry-run, and checks the output.
- **`tests/e2e/test_live_kill.py`** sets `DRY_RUN=false` in-process, opens a blocker that holds an
  exclusive row lock for 120 seconds, waits so the victim's wait exceeds the threshold, runs one cycle, and
  checks the SPID is gone and the audit rows exist.
- **`trigger_blocking_test.py`** and `tests/e2e/sql/simulate_blocking.sql` create blocking on demand.

```bash
uv run python tests/e2e/setup_databases.py
uv run python tests/e2e/test_end_to_end.py
uv run python tests/e2e/test_live_kill.py      # real KILL against your local SQL Server
```

These are scripts run by hand (`async main()` with printed phases), not pytest tests, so CI doesn't run
them. Two clean-ups: wrap them as pytest tests behind a marker (`-m e2e`), and remove the stale
`LLM_API_KEY`/`LLM_BASE_URL` logging left from before keyless auth.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Running integration tests in CI, which isn't done today:

- **A SQL Server service container** in GitHub Actions
  (`mcr.microsoft.com/mssql/server:2022-latest`), with the ODBC driver already in the agent image.
- **The setup script**, then the end-to-end script in dry-run with `REQUIRE_HUMAN_APPROVAL=false`.
- **The LLM**: either a federated credential from GitHub to Azure for a test Foundry deployment, or a stub
  model for the CI job.

```yaml
services:
  mssql:
    image: mcr.microsoft.com/mssql/server:2022-latest
    env: { ACCEPT_EULA: "Y", MSSQL_SA_PASSWORD: "<from a CI secret>" }
    ports: ["1433:1433"]
```

```bash
docker run --rm --network host -e LOCAL=true -e DRY_RUN=true <image> python tests/e2e/test_end_to_end.py
```

PR previews are the other integration layer: the `development` environment approval deploys the PR's
image into development, where it watches non-production servers. The gotcha there is the single-poller
rule: a preview and the main development deployment must not watch the same server.

</div>

</details>

<details class="project-iq" markdown="1" id="testing-and-quality-q3">
<summary>Which quality gates does code pass before it merges and ships?</summary>

<div class="iq-role" data-role="architect" markdown="1">

1. **Local:** `ruff` with the repo config; the unit suite; the blocking generator for behaviour changes.
2. **CI** ("Build, Scan and Push") on changes under the component: the shared SonarQube workflow runs the
   unit tests for coverage; image build and push; Helm chart packaging.
3. **Review:** DevOps reviews every change, and **the database team reviews anything on the safety path**
   (gates, action, Determination prompt). Prompt changes are reviewed like code because they live next to
   their agent as Markdown.
4. **Release:** a release workflow bumps the version, re-tags the tested image, and opens its own PR.
5. **Development:** promotion to development, where real kills against non-production servers prove the
   action path.
6. **Production:** promotion runs in a protected `production` GitHub environment and opens a PR; Argo CD
   is the only thing that changes the cluster.
7. **Real-kill go-live** has its own readiness review and a one-off go-live board (both team leads plus
   security).

Gaps I'd close: make the test job a **required check** so a failing gate test blocks the merge, add
`helm lint` and schema validation, and pin reusable workflows to tags or SHAs (one references a feature
branch).

Deeper: [CI/CD](/posts/projects/sql-blocking-agent/12-cicd-and-release-management/#automated-test-execution).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Gates before merge, from the developer's side:

- **ruff** with the repo's `ruff.toml`.
- **pytest** with coverage, run inside the shared SonarQube workflow (so a failing test fails that job).
- **SonarQube** quality gate.
- **Review**: database team review for anything under the gates, action or Determination prompt.

What I'd add:

```bash
uv run ruff check . && uv run ruff format --check .
uv run pytest tests/unit -q --cov=src --cov-fail-under=80
uv run python -c "import subprocess,sys; sys.exit(subprocess.call(['grep','-rq','agents.llm','src/tools']) == 0)"
```

The last line is an architecture test: it fails if anything under `src/tools/` imports the LLM module.
I'd also add a CODEOWNERS entry that makes the database team required reviewers for
`src/agents/determination/`, `src/tools/sql_query.py` and `sql/`.

> **TODO:** Is the test job a required status check on `main`?
{: .prompt-warning }

</div>

<div class="iq-role" data-role="devops" markdown="1">

Pipeline gates as wired:

| Stage | Gate |
|---|---|
| PR | Change detection, build with Xray and build scans, SonarQube (tests), Helm chart package |
| PR, optional | "Deploy to Dev Env?" approval on the `development` environment → preview build, chart, deploy |
| Merge | Image pushed only on `main`; tagged `latest` |
| Release | "Create Release?" approval on a `release` environment → development release |
| Production | `promote.yaml` behind the `production` environment |

```bash
gh api repos/<owner>/<repo>/branches/main/protection | jq '.required_status_checks'
gh api repos/<owner>/<repo>/environments/production | jq '.protection_rules'
```

Gaps I'd close: CodeQL is commented out; the SonarQube workflow is pinned to a feature branch; there's no
`helm lint` or schema render in CI; and both approval jobs use `continue-on-error: true` so a rejection
doesn't turn the run red, which is intended, but means "green" doesn't imply "released".

</div>

</details>

## Infrastructure and Environments
{: #infrastructure-and-environments }

<details class="project-iq" markdown="1" id="infrastructure-and-environments-q1">
<summary>Where and how is the application hosted, and why there?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Setting | Production |
|---|---|
| Platform | AKS, deployed by Argo CD from one reusable Helm chart |
| Replicas | 1 (no leader lock yet) |
| Run mode | `loop` |
| `DRY_RUN` / `REQUIRE_HUMAN_APPROVAL` | `true` / `true` |
| State | AgentConfigDB and AgentLogDB on the SQL Server management server |
| Model | Azure AI Foundry (hosts the model, not the agent) |
| Identity and secrets | Workload identity; Key Vault through External Secrets |
| Telemetry | Application Insights |

The chart deploys only the agent: a `Deployment`, `ServiceAccount` with workload identity, `SecretStore`
and `ExternalSecret`, `NetworkPolicy`, `PodDisruptionBudget`, `ConfigMap`, and a `Service` for the
approval API. It doesn't deploy databases, Temporal or collectors.

Why AKS: the agent is a **long-running worker** with in-process pollers, which suits a Deployment rather
than serverless; it needs network paths to on-premises and Azure SQL; and the platform team already runs
AKS with Argo CD and External Secrets. Azure Container Apps (one always-on replica) was the earlier
recommended path and works the same way; AKS won because it's where the platform's ownership, policies and
GitOps already live.

The Azure resources around the agent are managed as code with our shared Terraform module platform.

Deeper: [Production environment](/posts/projects/sql-blocking-agent/11-infrastructure-and-environments/#production-environment).

</div>

<div class="iq-role" data-role="devops" markdown="1">

The deployed shape:

| Object | Setting |
|---|---|
| Deployment | 1 replica, `terminationGracePeriodSeconds: 60`, requests 250m/512Mi, limits 1/1Gi |
| Security context | `runAsNonRoot`, UID/GID 999, read-only root FS, all capabilities dropped, `RuntimeDefault` seccomp |
| Volumes | `emptyDir` for `/tmp` and `/app/reports` (or an existing PVC) |
| Service | ClusterIP 8000, loop mode only |
| Secrets | `SecretStore` + `ExternalSecret` → `sql-blocking-agent-secrets` |
| Optional | NetworkPolicy, PodDisruptionBudget (both off by default) |

```bash
helm get values <release> -n <ns>
kubectl get deploy,svc,externalsecret,secretstore,pdb,networkpolicy -n <ns>
```

Why a Deployment and not a CronJob: the agent keeps per-server pollers, an in-process approval API and an
in-memory cooldown, and it polls every few seconds; a CronJob's minimum one-minute schedule and cold start
per run don't fit.

> **TODO:** Confirm production's run mode, poll intervals and replica count in the GitOps values.
{: .prompt-warning }

</div>

<div class="iq-role" data-role="sre" markdown="1">

Hosting through an SRE lens:

- **Single replica is a deliberate single point of failure**: a node drain or a crash is a monitoring
  gap. With `RollingUpdate`, a deploy can also briefly run two pollers. I'd set `Recreate` and accept a
  gap of a pod start (seconds), measured.
- **PDB off by default**: with one replica, a PDB of `maxUnavailable: 1` changes nothing anyway; the real
  protection is fast restart plus an alert on "no ready pods for 2 minutes".
- **No probes in Temporal mode**: liveness has to come from Temporal metrics.
- **Resource limits** of 1 CPU and 1Gi are generous for a process that mostly waits; memory is the one to
  watch, since reports, plans and SQL text sit in memory per cycle.

```bash
kubectl get events -n <ns> --field-selector involvedObject.kind=Pod --sort-by=.lastTimestamp | tail
kubectl top pod -n <ns>
```

The availability number I'd report isn't pod uptime; it's "minutes any active server went unmonitored".

</div>

</details>

<details class="project-iq" markdown="1" id="infrastructure-and-environments-q2">
<summary>Which environments exist, and how close is local development to production?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Each environment differs in exactly the setting that matters most: **whether a `KILL` is real**.

| Environment | What it monitors | Kills |
|---|---|---|
| Laptop | Local SQL Server Express with a blocking generator | Real, against a local database (the live harness) |
| PR preview | Deployed into development per pull request | As development |
| Development (AKS) | Non-production SQL Servers | **Real**, with approval |
| Production (AKS) | Production SQL Servers | **Dry-run** |

**Local** is set up for the fastest learning loop: SQL Server Express, a script that creates a blocking
chain on demand, `LOCAL=true` for console telemetry, and your own `az login` for the model. You can watch
it kill a session on your own laptop.

**No staging**, deliberately: production in dry-run *is* the staging step for decision quality. Once real
kills are on in production, a staging deployment in dry-run, watching production servers and running the
next version's decisions side by side, becomes useful.

One caution for PR previews: only one poller may watch a given server, so a preview and the regular
development deployment must not monitor the same server.

Deeper: [Environments](/posts/projects/sql-blocking-agent/11-infrastructure-and-environments/#development-environment).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The local setup a developer runs:

1. SQL Server Express (or a container), then `uv run python tests/e2e/setup_databases.py`.
2. `.env` with `AZURE_OPENAI_ENDPOINT`, `CONFIG_DB_CONNECTION_STRING`, `LOG_DB_CONNECTION_STRING`,
   `SQL_AUTH_MODE`, `LOCAL=true`, `DRY_RUN=true`.
3. `az login`, so `DefaultAzureCredential` finds your developer identity for the model.
4. `uv run python main.py`, then `python trigger_blocking_test.py` in another terminal.

```bash
az login && uv sync
uv run python main.py
uv run python trigger_blocking_test.py
uv run python approve.py list
```

Parity notes: local uses Windows or SQL auth against a local instance (the seed row is `IAS` with
`Trusted_Connection=yes`), production uses Entra; local telemetry is console-only (`LOCAL=true` is the
code default); and set `POLL_INTERVAL_SECONDS` explicitly, because the code default is 6000 seconds.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Environments as deployed:

| Env | How | What it watches | `DRY_RUN` |
|---|---|---|---|
| Laptop | `python main.py` | Local SQL Server | Your choice |
| PR preview | `development` environment approval → preview image and chart in development | Non-production servers | As development |
| Development | Release gate → development promotion | Non-production servers | `false` (real kills, with approval) |
| Production | `promote.yaml` → GitOps | Production servers | `true` |

```bash
yq '.components."sql-blocking-agent"' versions.yaml      # development vs production version
gh run list --workflow pr-preview-teardown.yaml --limit 3
```

The gap that matters: production runs a much older version than development, so production dry-run
isn't evaluating the code that would get real kills. Promoting regularly, even in dry-run, keeps the
evidence relevant.

</div>

</details>

<details class="project-iq" markdown="1" id="infrastructure-and-environments-q3">
<summary>How is the infrastructure provisioned and configured?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Kubernetes resources** are one reusable Helm chart with a `values.schema.json` (so a typo fails at render
time), published to the registry and synced by Argo CD from per-environment values in Git.

**Azure resources** around the agent (identity, model access, storage, Key Vault) are managed as code with
our shared Terraform module platform.

**The databases** are external and owned by the database team; schema is the numbered `sql/` scripts,
applied by DBAs ahead of releases.

**Configuration** lives in three places, each with an owner:

| Where | What | Owner |
|---|---|---|
| Helm values (Git) | Run mode, `DRY_RUN`, approval required, timeouts, model per agent, endpoints | DevOps |
| AgentConfigDB | Servers, thresholds, protected logins, exclusion windows | Database team |
| Key Vault | Credentials | DevOps and database team |

The split I'd defend: the **kill switch is in Git** (a reviewed, audited PR), while **operational tuning
is in the database** where DBAs change it with T-SQL and see it take effect within a minute. That's why
`DryRun` was moved out of the table.

Deeper: [Infrastructure as code](/posts/projects/sql-blocking-agent/11-infrastructure-and-environments/#infrastructure-as-code).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Provisioning and configuration, by layer:

- **Helm chart** with `values.schema.json`, published to the registry by CI; GitOps values per
  environment.
- **ConfigMap** rendered from the `config:` map in values (every `KEY: "value"` becomes an env var).
- **Azure resources** (identity and federation, Foundry project and deployment, Blob, Key Vault, the SQL
  server for the agent's databases) through the organization's shared Terraform modules.
- **Databases**: numbered `sql/` scripts, applied by the database team.
- **Temporal namespace** per environment from the platform team.

```bash
helm lint sql-blocking-agent/helm
helm template sba sql-blocking-agent/helm -f values-production.yaml | kubeconform -strict -summary
```

Gotcha: values defaults contain real development hostnames, recipient addresses and endpoints. In a chart
that's published and reused, defaults should be empty and required by the schema, so a new environment
can't accidentally point at development's SQL server or email its DBAs.

</div>

</details>

## CI/CD and Deployment
{: #ci-cd-and-deployment }

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q1">
<summary>Walk me through the pipeline from commit to production.</summary>

<div class="iq-role" data-role="architect" markdown="1">

```text
PR       -> CI "Build, Scan and Push" (changes under sql-blocking-agent/**):
            image build + push to JFrog, SonarQube (runs the unit tests), Helm chart packaging
         -> optional PR preview deployed into development; torn down when the PR closes
merge    -> release workflow: version bump in versions.yaml, release branch + PR,
            re-tag the tested image (no rebuild), publish the chart
dev      -> promote workflow updates development values -> Argo CD syncs (real kills, approval)
prod     -> promote workflow in the protected `production` environment opens a PR
            -> merge -> Argo CD syncs (dry-run)
```

Properties I'd point out: every environment change is a **Git change** (`versions.yaml` and values);
production promotion opens a PR rather than pushing; **Argo CD is the only thing that changes the
cluster**; and re-tagging means the bytes that were tested are the bytes that ship. Docs publish to
Backstage TechDocs from the same repo.

What makes this pipeline different from an ordinary service: a new prompt or gate threshold can change
which sessions get killed, so the pipeline's job is not only "does it build" but **"does it still refuse
the right things"**. That's why gate tests and the database team's review sit on the path.

> **TODO:** When will production catch up from v1.0.6 to the current development line (v1.0.34), which
> includes the transaction-safe `KILL` path?
{: .prompt-warning }

Deeper: [Deployment automation](/posts/projects/sql-blocking-agent/12-cicd-and-release-management/#deployment-automation).

</div>

<div class="iq-role" data-role="devops" markdown="1">

The workflows in order:

1. **`ci.yaml` on a PR**: `detect-components`, then a matrix build through the shared Docker and JFrog
   workflow (`xray_scan: true`, `build_scan: true`, push only on `main`), SonarQube (runs the tests),
   chart detection and packaging.
2. **"Deploy to Dev Env?"** (`preview-approval`): an approval on the `development` environment, then
   `preview-build`, `preview-chart` and `preview-deploy` put the PR's image into development; a teardown
   workflow removes it when the PR closes.
3. **On merge**: the image is pushed and tagged `latest`; **"Create Release?"** (`release-approval`, on a
   `release` environment) dispatches the development release for each service listed in `versions.yaml`.
4. **`promote.yaml`** for production: update `versions.yaml`, PR, merge, dispatch the GitOps promotion,
   behind the `production` environment.
5. **Argo CD** syncs.

```bash
gh run list --workflow ci.yaml --limit 5
gh workflow run promote.yaml -f environment=production -f service=sql-blocking-agent -f version=v1.0.34
yq '.components."sql-blocking-agent"' versions.yaml
```

What I'd add: `helm lint` and a schema render in CI, CodeQL back on, and the shared workflows pinned to
tags. The current SonarQube reference is a feature branch.

</div>

</details>

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q2">
<summary>Which deployment strategy do you use, and how do you roll back?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The deployment itself is simple: one replica, GitOps, a rolling restart. The strategy that matters is the
**staged enablement of the dangerous capability**:

1. **Dry-run in production** (done): watch real servers, send real reports, kill nothing.
2. **Current code in production**, still dry-run.
3. **Dry-run review** with the database team: do they agree with the decisions?
4. **Real-kill pilot** on named servers, approval mandatory, kill-rate limit set low.
5. **Expand** server by server, each after a short review of its protected logins and exclusion windows.

It's a canary, but the unit of rollout is **capability per server**, not traffic.

**Rollback** has two levels:

- **Kill switch:** set `DRY_RUN=true` in the production values, merge, Argo CD syncs. First move for any
  doubt about decisions; investigate second. Tested once before the pilot.
- **Version rollback:** promote the previous version through the same workflow.

One design wrinkle I'd raise myself: because `DRY_RUN` is now application-wide, a one-server pilot needs
either a per-server override key or a separate pilot deployment that monitors only that server.

> **TODO:** Which of those two will the pilot use?
{: .prompt-warning }

Deeper: [Deployment runbook](/posts/projects/sql-blocking-agent/13-deployment-and-go-live/#deployment-runbook).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Rolling out a single-replica agent:

- **Strategy**: switch the Deployment to `Recreate`, so the old pod stops before the new one polls. With
  the default rolling update there's a short overlap where two pollers watch the same servers.
- **Capability rollout** is in values: `DRY_RUN`, `REQUIRE_HUMAN_APPROVAL`, the server list in
  `TargetServers`, and `MAX_KILLS_PER_HOUR` (set low for a pilot).
- **Rollback**: promote the previous version, or flip `DRY_RUN` to `"true"`; the ConfigMap checksum rolls
  the pod either way.

```bash
gh workflow run promote.yaml -f environment=production -f service=sql-blocking-agent -f version=<previous>
argocd app sync <app> && kubectl rollout status deploy/<release> -n <ns>
kubectl logs deploy/<release> -n <ns> | grep "dry_run=" | tail -1
```

For a one-server pilot, `DRY_RUN` being application-wide means a second release of the same chart, with
its own values and a `TargetServers` filter, is the cleanest option. That needs a way to scope which rows
each deployment reads, which the code doesn't have yet.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Release checks for an agent that can kill sessions:

| When | Check |
|---|---|
| Before promote | No pending approvals; not during a known peak or maintenance window |
| After rollout | First cycle per server completes; the "Runtime config" line shows the expected `dry_run` and approval settings |
| First day | Decision mix (KILL / ALERT_ONLY / SKIP by rule) compared with the previous week |
| Any doubt | Kill switch first, investigate second |

Rollback triggers agreed in advance: any kill without an approval record, any kill on a protected login,
cycle errors on more than one server, or a decision mix that shifts sharply after a prompt or model change.

```sql
SELECT DecisionTaken, RiskLevel, COUNT(*) FROM dbo.BlockingEventLog
WHERE EventTimeUTC > DATEADD(DAY,-1,SYSUTCDATETIME()) GROUP BY DecisionTaken, RiskLevel;
```

The table stores the decision and its reason but no rule number column, so "which rule fired" is parsed
from `DecisionReason` today; a `RuleTriggered` column would make this report exact.

</div>

</details>

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q3">
<summary>How do data and schema changes ship alongside application changes?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Separately, and first.** The agent's databases are deployed apart from the agent on purpose: the
numbered scripts in `sql/` are applied by the database team on the management server **ahead of** the
release that needs them. The rule is **schema first, then code**, and every script is additive or guarded
(`COL_LENGTH` checks) so the running version keeps working and re-runs are safe.

A concrete example: the current version expects connection strings in `TargetServers` and no `DryRun`
column, so scripts up to `07_remove_target_server_dry_run.sql` must be applied, during a quiet period,
before that version is promoted to production.

Why not run migrations from the Helm chart or at startup? Because the databases are shared, external and
owned by DBAs, and a schema change on the management server should be a reviewed DBA action, not a side
effect of a pod starting.

**Configuration data** (servers, thresholds, protected logins) changes independently of releases: DBAs edit
rows and the agent picks them up within a minute.

What I'd add: an applied-migrations table so each environment's schema version is queryable, and a startup
check that refuses to run against a schema older than the code expects.

Deeper: [Database deployment strategy](/posts/projects/sql-blocking-agent/12-cicd-and-release-management/#database-deployment-strategy).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Shipping a schema change with code:

- **Write the script** in `sql/` with the next number, guarded by `COL_LENGTH` or `OBJECT_ID` checks, so
  it can run twice.
- **Make the code tolerate absence where it's cheap**: e.g. a new optional column read with a default.
  Where it isn't, fail closed with a clear message, the way the agent exits when `TargetServers` has no
  usable `ConnectionString`.
- **Tests**: a unit test with the row shape before and after (the override tests already do this for
  nullable override columns).
- **PR description** says which script must be applied before promotion.

```sql
IF COL_LENGTH(N'dbo.TargetServers', N'NewSetting') IS NULL
    ALTER TABLE dbo.TargetServers ADD NewSetting INT NULL;
```

What I'd add: a `SchemaVersion` table and a check at startup that compares it with the version the code
expects, so "the script wasn't applied" is one clear log line instead of a SQL error in a node.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Coordinating schema and release:

1. PR contains the script and the code; review includes the database team.
2. After merge, the database team applies the script in development, then the development release goes out.
3. Before production promotion, the script is applied on the production management server.
4. Promotion; check the startup log.

```bash
sqlcmd -S <server> -d AgentConfigDB -G -i sql/0N_<change>.sql
gh workflow run promote.yaml -f environment=production -f service=sql-blocking-agent -f version=<v>
kubectl logs deploy/<release> -n <ns> | head -40
```

The pipeline doesn't enforce the order today. A cheap guard: a `requires_schema: 7` entry next to the
version in `versions.yaml`, and a step in `promote.yaml` that queries the target's schema version and
stops if it's lower.

</div>

</details>

<details class="project-iq" markdown="1" id="ci-cd-and-deployment-q4">
<summary>How do you manage configuration and versions across environments?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Versions** live in `versions.yaml` with a `development` and a `production` entry (v1.0.34 and v1.0.6 at
the time of writing). The release workflow re-tags the tested image with the version and publishes the
chart at the same version, so image, chart and Git agree.

**Configuration**, by layer:

| Layer | Examples | Changed by |
|---|---|---|
| Code defaults | `DRY_RUN=true` | Code review |
| Helm values per environment | Run mode, `DRY_RUN`, approval required and timeout, per-agent model and thinking level, endpoints | PR to the environment values; Argo CD |
| AgentConfigDB | Servers, poll interval, kill threshold, minimum victims, max kills per hour, alert email, protected logins, exclusion windows | DBAs with T-SQL; picked up within a minute |
| Key Vault | Credentials | Secret rotation |

Two rules I'd state: **safe defaults in every layer** (the chart default for `DRY_RUN` should match the
code's `true`), and **per-server overrides only for a known list of keys**, so a typo in a row can't
silently change behaviour.

The version gap is itself a risk worth naming: production running 28 versions behind development means it
lacks recent safety work. Promoting it is the first item on the roadmap.

Deeper: [Versioning](/posts/projects/sql-blocking-agent/12-cicd-and-release-management/#versioning-and-release-notes).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Configuration in code:

- **One loader** (`load_config`) builds the runtime dict from env vars with defaults, then layers
  `TargetServers` overrides and `ProtectedLogins` from the database.
- **Process-level keys preserved per cycle**: `_get_runtime_config` re-reads the DB each cycle but keeps
  run mode, approval and Temporal settings from the process.
- **Per-agent LLM settings** read at import (`AGENT_CONFIGS`), so they need a restart.
- **Defaults that matter**: `DRY_RUN=true`, `RUN_MODE=loop`, `APPROVAL_TIMEOUT_SECONDS=300`,
  `ANALYSIS_COOLDOWN_SECONDS=300`, `POLL_INTERVAL_SECONDS=6000` (the odd one).

```python
"dry_run": os.getenv("DRY_RUN", "true").lower() == "true",
"poll_interval_seconds": int(os.getenv("POLL_INTERVAL_SECONDS", "6000")),
```

Two improvements: a typed settings class (`pydantic-settings`) so a typo like `DRYRUN` fails at startup;
and `_get_runtime_config` is called twice per cycle (in `_cycle_task` and in the execute closure), which
doubles the config reads. Passing the first result through removes the second.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Versions and config across environments:

- **`versions.yaml`**: one component with a `development` and a `production` version; `promote.yaml`
  writes the production one.
- **Image tags**: `<sha>`-based from CI, `latest` on `main`, the version on release; previews get their
  own tag. `.release/sql-blocking-agent` records the source ref and image tag of the last release.
- **Values**: chart defaults in the repo, environment values in the GitOps repo.
- **Secrets**: Key Vault per environment through External Secrets.

```bash
cat .release/sql-blocking-agent
yq '.components."sql-blocking-agent"' versions.yaml
helm get values <release> -n <ns> -o yaml | yq '.config | {"DRY_RUN": .DRY_RUN, "runMode": .runMode}'
```

The default I'd fix in the chart: `values.yaml` has `DRY_RUN: "false"`, `runMode: temporal` and
development hostnames. Chart defaults should be the safest settings and empty endpoints, with the schema
requiring them, so only the environment values decide anything risky.

</div>

</details>

## Monitoring and Observability
{: #monitoring-and-observability }

<details class="project-iq" markdown="1" id="monitoring-and-observability-q1">
<summary>How do you know the system is healthy in production?</summary>

<div class="iq-role" data-role="architect" markdown="1">

An incident-response agent has an awkward property: **when it's broken, the symptom is silence.** No
reports looks exactly like no blocking. So health means proving, continuously, that every server is
still being watched.

| Signal | Why | Source today |
|---|---|---|
| Last successful cycle per server | Silence must be detectable | Cycle summary logs (not yet a metric) |
| Cycle errors per server | Connectivity, permissions, config | Cycle summary |
| Decisions per day by type and rule | Behaviour drift | Audit tables |
| Approval outcomes and time to decide | Human loop health | Audit rows, router logs |
| Kill validation results | `STILL_PRESENT` needs attention | `KillAuditLog` |
| LLM latency, retries, tokens | Cost and model health | Pydantic AI instrumentation, token tracker |

The gap I'd fix first: `GET /health` returns `{"status": "ok"}`, which proves the process answers HTTP,
not that pollers are polling. A **per-server heartbeat** timestamp, checked by the liveness probe and
alerted on as "minutes unmonitored", is the most important missing signal.

Every cycle has a short **correlation ID** in logs, telemetry spans, audit rows, report filename and cycle
summary, so one query shows a cycle end to end.

Deeper: [Monitoring](/posts/projects/sql-blocking-agent/14-operations-and-observability/#application-and-infrastructure-monitoring).

</div>

<div class="iq-role" data-role="devops" markdown="1">

What's wired for observability:

- **Logfire** for local console instrumentation (and Pydantic AI instrumentation).
- **OpenTelemetry to Application Insights** through `AzureMonitorTraceExporter`, enabled when
  `LOCAL=false` and `APPLICATIONINSIGHTS_CONNECTION_STRING` is set (it comes from the ExternalSecret).
- **Spans**: one per cycle (`cycle {session_id}`) and one per node (`node {node}`), with the cloud role
  name `SQL-Blocking-Agent`.
- **A session-summary event** per cycle with decision, kill status, risk, errors, duration and tokens.
- **Probes**: `/health` in loop mode only.

```bash
kubectl logs deploy/<release> -n <ns> | grep "Telemetry: sink="
kubectl exec deploy/<release> -n <ns> -- printenv LOCAL
```

What I'd add on the platform side: an alert on "no telemetry from the role in 15 minutes", which catches
both a dead agent and a misconfigured exporter, and Temporal task-queue metrics for durable mode.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Health means "every active server is being watched", so the SLIs are:

| SLI | Source | Alert |
|---|---|---|
| Minutes since last completed cycle, per server | Session-summary events | > 3 poll intervals |
| Cycles crashed per server | "Cycle crashed" logs | 3 in a row |
| Ticks skipped per server | "Previous cycle still running" | Sustained |
| Approval API responsiveness | Synthetic `GET /pending` | > 5 s |
| Kill validation outcomes | `KillAuditLog.KillStatus` | Any `STILL_PRESENT` |

`/health` returns `{"status": "ok"}` from the API, which proves the HTTP server answers and nothing more.
The per-server heartbeat is the missing signal.

```bash
kubectl port-forward deploy/<release> 8000:8000 -n <ns> &
curl -s -w ' %{time_total}s\n' http://127.0.0.1:8000/health
```

</div>

</details>

<details class="project-iq" markdown="1" id="monitoring-and-observability-q2">
<summary>What do you log, measure and alert on?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Log:** a startup line with the loaded configuration, server list, `dry_run` and the LLM auth mode; a
summary per cycle; token lines per LLM call; every approval decision; all with the correlation ID. Logs
can contain SQL text and login names, so they get **shorter retention** than the audit tables, which are
the long-term record. Locally telemetry is console-only; deployed, it goes to Application Insights.

**Measure** (the dashboard I'd build from AgentLogDB and Application Insights):

| Panel | Source |
|---|---|
| Minutes since last successful cycle, per server | Heartbeat |
| Incidents per server per day | `BlockingEventLog` |
| Decisions and which rule fired | Audit tables (the rule is in `DecisionReason`; no rule column yet) |
| Approvals: approved, denied, timed out; median time to decide | Audit rows |
| Kill validation outcomes | `KillAuditLog` |
| Tokens per day and per incident, by agent | Token tracker |
| Top recurring head-blocker patterns | `BlockingEventLog` grouped |

**Alert** before real kills: a server unmonitored, repeated cycle errors, failed kill validation
(`STILL_PRESENT`), LLM failures triggering fallbacks repeatedly, and token spikes. Each alert is fired once
on purpose in development before we rely on it.

Deeper: [Metrics](/posts/projects/sql-blocking-agent/14-operations-and-observability/#metrics-and-dashboards).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Logging and telemetry in code:

- **`session_scope(correlation_id, server)`** puts the 8-character correlation ID into context, so every
  log line and span in the cycle carries it.
- **`node_span(name)`** times each node and records `new_errors`.
- **Token lines** per agent call and a rendered table per cycle; a session table on shutdown.
- **`log_session_summary(...)`** emits one structured event per cycle.
- **SDK noise** turned down; the approval banner logged at WARNING so it stands out.

```python
with session_scope(correlation_id, config["server_name"]):
    final = await execute(initial_state, correlation_id)
    token_tracker.end_cycle()
    log_session_summary(correlation_id=correlation_id, server=config["server_name"], ...)
```

What I'd change: the banner and the Analyzer summary include SQL text, which can contain literals, and
they go to the same log stream as everything else. Logging a hash or the first line of SQL at INFO, with
the full text only in the report, keeps sensitive literals out of long-lived logs.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Alerts I'd configure before real kills, with severity:

| Alert | Condition | Severity |
|---|---|---|
| Server unmonitored | No completed cycle in 3 intervals | Page (business hours) |
| Kill not confirmed | `STILL_PRESENT` | Page the database on-call |
| Kill without approval record | Any | Page both teams |
| Kill-rate check failing | `kill_rate_query_failed` | Page (the limit is off) |
| LLM fallbacks | > 3 per hour | Ticket |
| Notification failures | Any in 15 minutes | Ticket |
| Token spike | > 2× baseline per incident | Ticket |

```kusto
traces
| where cloud_RoleName == "SQL-Blocking-Agent" and message has "kill_rate query failed"
| summarize count() by bin(timestamp, 5m)
```

Each alert fired once in development on purpose before it's trusted; an alert that has never fired is an
assumption.

</div>

</details>

<details class="project-iq" markdown="1" id="monitoring-and-observability-q3">
<summary>Walk me through how you would troubleshoot a production issue in this system.</summary>

<div class="iq-role" data-role="architect" markdown="1">

Say the database team says "the agent proposed killing a session we'd never kill":

1. **Contain first.** If there's any doubt about decisions, flip `DRY_RUN` to `true` through Argo CD,
   then investigate. (In production today it's already dry-run, which is exactly why.)
2. **Follow the correlation ID** from the email: logs and telemetry for the cycle, the audit rows (decision,
   reason with the rule, risk), the report, the approval note.
3. **Ask which layer should have caught it:**
   - **Diagnostics** (a missing fact, for example an unknown application login)?
   - **Gates** (a missing rule, for example the login should be in `ProtectedLogins`)?
   - **The LLM** (wrong judgement on good facts)?
   - **The human** (approved anyway)?
4. **Fix at the right layer.** Missing protection is a `ProtectedLogins` row or a new deterministic gate,
   never a prompt tweak. A judgement error is a prompt change compared on recorded incidents.
5. **Close with a test**, so the same decision can't recur.

Other common issues: a server with no reports (heartbeat, cycle errors, permissions for
the monitoring identity's `VIEW SERVER STATE`); no LLM output (identity role on Foundry, fallbacks firing); `STILL_PRESENT` after a
kill (rollback in progress, database team investigates).

Deeper: [Incident response](/posts/projects/sql-blocking-agent/16-support-and-maintenance/#incident-response).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Commands for "the agent proposed killing a session we'd never kill":

```bash
# 1. Contain
yq -i '.config.DRY_RUN = "true"' <gitops-values> && git commit -am "kill switch" && git push
argocd app sync <app>
# 2. Find the cycle
kubectl logs deploy/<release> -n <ns> --since=24h | grep "<correlation-id>"
# 3. What version and config was running?
argocd app history <app> | tail -3
kubectl logs deploy/<release> -n <ns> | grep "Runtime config" | tail -1
# 4. Was the login protected?
sqlcmd -S <mgmt-server> -d AgentConfigDB -G -Q "SELECT * FROM dbo.ProtectedLogins WHERE LoginName = '<login>'"
```

Then the fix goes where the miss was: a `ProtectedLogins` row (the database team, takes effect on the next
cycle's config read), a new gate in code (a release), or a prompt change compared on recorded incidents.
Gotcha: logs older than the pod are only in Application Insights, so step 2 uses a Kusto query on
`customDimensions` for the correlation ID once the pod has restarted.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Running the incident:

1. **Severity**: a wrong `KILL` proposal in dry-run is a near miss; in real-kill mode it's a P1.
2. **Contain**: dry-run on, confirm in the next "Runtime config" line.
3. **Timeline** from the correlation ID: detection facts, gates evaluated, LLM decision, approval outcome.
4. **Classify**: missing fact, missing rule, model judgement, or human approval.
5. **Fix at that layer**, then add a test with the recorded facts.
6. **Review**: blameless, with the database team; share the decision trace, not just the conclusion.

```bash
kubectl logs deploy/<release> -n <ns> | grep -E "Rule [0-9]+ triggered|Decision=" | grep "<server>"
```

The SRE lens I'd add: count near misses. Dry-run proposals the DBAs disagree with are the leading
indicator for real-kill incidents, and a weekly review of them is the cheapest safety process this
system can have.

</div>

</details>

## Cost, Maintenance and Support
{: #cost-maintenance-and-support }

<details class="project-iq" markdown="1" id="cost-maintenance-and-support-q1">
<summary>What drives the cost of running the system, and how do you keep it under control?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The infrastructure is small: one pod, two databases on an existing management server, a storage container
and a model deployment. **LLM tokens** are the variable cost, and they scale with **incidents**, not with
servers or time.

Controls designed in:

- **No blocking, no tokens.** A quiet server costs one DMV query per poll.
- **Three LLM calls per analyzed cycle**, at most one analysis retry.
- **Cooldown**, so a persistent blocker isn't re-analyzed on every poll.
- **Per-agent model and thinking level** by environment variable; the RCA is the longest output and the
  first candidate for a lower setting.
- **Token visibility** per cycle and per agent; the July live run measured about 9.6k tokens for one
  analyzed incident.

The migration from LangChain to Pydantic AI was partly about cost visibility: token usage became built in
instead of something we bolted on.

Next steps I'd take: alert on token spikes per incident, compare RCA quality at a lower thinking level,
and check whether every diagnostic is needed for every KB scenario.

> **TODO:** What's the monthly LLM spend for the agent?
{: .prompt-warning }

Deeper: [Cost optimization](/posts/projects/sql-blocking-agent/18-continuous-improvement/#cost-optimization).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Cost levers in configuration:

| Lever | Setting |
|---|---|
| Model per agent | `LLM_MODEL_ANALYZER`, `LLM_MODEL_DETERMINATION`, `LLM_MODEL_RCA` |
| Reasoning effort per agent | `LLM_THINKING_*` (`minimal` to `xhigh`; default `medium`) |
| Re-analysis | `ANALYSIS_COOLDOWN_SECONDS` (300; the code warns below that) |
| Validation retries | `LLM_MAX_RETRIES` (2) |
| 429 behaviour | `LLM_429_RETRIES`, `LLM_429_BASE_WAIT_SECONDS` |
| Compute | One pod, 250m / 512Mi requests |

```bash
kubectl set env deploy/<release> -n <ns> --list | grep -E "LLM_|COOLDOWN"      # read only; change in Git
az cognitiveservices account deployment list -g <rg> -n <foundry-account> -o table
```

The cheapest experiment: `LLM_THINKING_RCA=low` in development for two weeks, comparing RCA quality on
the same incidents. The RCA is the longest output, so it's where reasoning effort costs most.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Cost as something to monitor:

- **Tokens per analyzed incident** (baseline about 9.6k) and **tokens per day**, from the per-cycle
  token totals in the session-summary event.
- **LLM calls per incident**, which should be at most four (Analyzer, one retry, Determination, RCA)
  plus validation retries; more means retries or a cooldown problem.
- **Cooldown effectiveness**: "within cooldown, skipping LLM pipeline" lines per incident.

Guardrails: a daily token budget alert at 80%, and an alert when one incident uses more than twice the
baseline (usually a validation-retry loop or a huge SQL text in the prompt).

```bash
kubectl logs deploy/<release> -n <ns> --since=24h | grep -E "tokens — input" | wc -l
```

> **TODO:** What's the monthly LLM spend today?
{: .prompt-warning }

</div>

</details>

<details class="project-iq" markdown="1" id="cost-maintenance-and-support-q2">
<summary>How is the system maintained and supported after go-live?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Shared ownership, by design:**

| Area | Owner |
|---|---|
| Code, prompts, Helm chart, pipelines, AKS namespace | DevOps team |
| Monitored servers, thresholds, protected logins, exclusion windows | Database team |
| Approving or denying a `KILL` | Database team on-call |
| AgentConfigDB and AgentLogDB | Database team |
| Model deployment and quota | DevOps, with platform AI owners |
| Safety rule changes | Both teams together |

**Triage** orders by harm: safety (a gate didn't fire, wrong session targeted) first, with the kill switch
before anything else; then coverage (a server not polled); then quality (weak RCA, wrong scenario); then
cost; then cosmetics.

**Upgrades** are treated by risk: Python dependencies with `uv lock --upgrade` and the full suite;
**Pydantic AI in its own PR** with the recorded-incident comparison; **model or thinking-level changes**
compared on decisions in dry-run first, because model behaviour changes are behaviour changes.

**Support questions** are usually one of three things: the agent isn't working, a server isn't reachable,
or someone disagrees with a decision. Routing them correctly is most of the job.

> **TODO:** Are there named on-call rotations on both teams, and what hours do they cover?
{: .prompt-warning }

Deeper: [Support model](/posts/projects/sql-blocking-agent/16-support-and-maintenance/#support-model-and-ownership).

</div>

<div class="iq-role" data-role="devops" markdown="1">

Maintenance routines:

- **Dependencies**: `uv lock --upgrade` and the full suite; keep `requirements.txt` in sync with the lock
  (the image installs from `requirements.txt`).
- **Pydantic AI and OpenAI SDK** in their own PRs, compared on recorded incidents.
- **Base image and ODBC driver**: monthly rebuild; the Microsoft apt repo line is pinned to a Debian
  release, so a base-image Debian upgrade needs that line changed too.
- **Certificates**: the corporate CA files in `certs/` need refreshing before they expire.
- **Secrets**: the shared IAS login and portal API key rotated in Key Vault.

```bash
uv lock --upgrade && uv export --no-hashes > requirements.txt && uv run pytest tests/unit -q
for c in sql-blocking-agent/certs/*.crt; do openssl x509 -in "$c" -noout -enddate; done
```

Gotcha: the certificate expiry check isn't automated anywhere. A scheduled workflow running that loop and
failing within 60 days of expiry would prevent a sudden TLS failure to the model and the portal.

</div>

<div class="iq-role" data-role="sre" markdown="1">

Support model from the reliability side:

| Request | First step |
|---|---|
| "No reports from server X" | Heartbeat for X; "Cycle crashed" lines; monitoring identity's `VIEW SERVER STATE` |
| "It proposed a bad kill" | Kill switch, then the correlation-ID timeline |
| "Approve command hangs" | Port-forward alive? Event loop busy with an LLM call? |
| "Kill didn't clear blocking" | `STILL_PRESENT` or a new head blocker; database team takes over |
| "Too many emails" | Cooldown and grouping settings |

Toil to remove: the port-forward step for every approval (an internal endpoint with SSO), and manual
log-grepping for coverage (a heartbeat metric and dashboard).

```bash
kubectl get pods -n <ns> && kubectl logs deploy/<release> -n <ns> --since=10m | tail -50
```

> **TODO:** Are there named on-call rotations on both teams, and what hours do they cover?
{: .prompt-warning }

</div>

</details>

## Leadership, Stakeholders and Governance
{: #leadership-stakeholders-and-governance }

<details class="project-iq" markdown="1" id="leadership-stakeholders-and-governance-q1">
<summary>How did you communicate the architecture and progress to stakeholders and executives?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The message that won support was the **division of labour**: *deterministic code finds and acts, the LLM
explains, a human decides.* It answers the question every stakeholder had about agentic AI ("could it do
something stupid?") with an architecture, not a promise.

For different audiences:

- **The database team:** policy in plain sentences before code. Every safety change starts with the rule
  written as a sentence, including how missing data behaves, so DBAs can review it without reading
  Python.
- **Leadership and the platform org:** the roadmap as **earning the right to kill**, one piece of evidence
  at a time: dry-run in production, a decision review with DBAs, then a pilot. Production in dry-run is
  the plan, not a delay.
- **Security:** the agent as a privileged automation account with an LLM attached, with a threat table
  that lists residual risks honestly (including the unauthenticated approval API).
- **Future teams building agents:** about 44,000 words of documentation, including a written framework
  decision and live-run evidence, because this is the template for the next agent.

The evidence I'd show: the live run on 10 July, from detection through a real kill, validation, RCA and
audit.

Deeper: [Product roadmap](/posts/projects/sql-blocking-agent/03-product-planning/#product-roadmap).

</div>

</details>

<details class="project-iq" markdown="1" id="leadership-stakeholders-and-governance-q2">
<summary>How do you document and govern architectural decisions?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Decisions:** ten worth recording as ADRs, with ADR-001 ("the LLM never acts") the foundation. Some are
written up at length already (`WHY_PYDANTIC_AI.md`, the Helm design record); what's missing is short,
numbered records. I'd extract them so a reviewer can find "why no MCP server?" in one place.

**Governance for an AI system with production authority** has a second layer most services don't:

| Forum | Decides |
|---|---|
| Joint working group (DevOps + database) | Backlog, releases, thresholds, dry-run review |
| Change review per PR | Code, prompt and gate changes; database team on safety paths |
| Go-live board (one-off: both team leads, security) | Enabling real kills |
| Platform engineering leadership | Agentic AI direction, reuse of the pattern |

**Decision rights:** a specific `KILL` is approved by the database team on-call; gate rules, thresholds,
protected logins and exclusion windows belong to the database team; prompt and model changes to DevOps,
with database review for Determination; enabling real kills jointly by both leads, with security
consulted.

The principle I'd state: **the people who carry the risk own the rules**, and the people who build the
system own how the rules are enforced.

Deeper: [Governance](/posts/projects/sql-blocking-agent/17-governance-and-compliance/#project-governance).

</div>

</details>

<details class="project-iq" markdown="1" id="leadership-stakeholders-and-governance-q3">
<summary>How did you bring other engineers onto the project?</summary>

<div class="iq-role" data-role="architect" markdown="1">

Because it's the org's first agentic AI project, onboarding was designed for **the next agent's team**, not
only this one's.

- **"Watch it kill a session on your laptop" in the first hour:** local SQL Server Express, the blocking
  generator, `LOCAL=true` telemetry, your own `az login`. Nothing teaches the architecture faster.
- **Documentation as a playbook:** an engineer guide, a file-by-file onboarding guide, the architecture
  and end-to-end process, troubleshooting, the framework decision, the Helm design record, and live-run
  analysis, published to Backstage TechDocs.
- **Rules that keep the design intact:** one LLM entry point; deterministic tools never import the LLM;
  every model output and state transition is a Pydantic model; prompts live next to their agent.
- **Implementation trackers** for larger changes: scope, confirmed policy and test evidence written down
  with the ticket, so a newcomer can see how decisions were made.

What I'd improve: a short **DBA guide** (what the email and report mean, how to approve and deny, what each
rule means), because the DBAs are the users with no guide of their own yet, and a docs pass where pages
describe the system as it was two migrations ago.

Deeper: [Onboarding](/posts/projects/sql-blocking-agent/15-documentation-and-knowledge-transfer/#onboarding-documentation).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The developer onboarding path I'd give:

1. **Run it locally** against SQL Server Express: `setup_databases.py`, `.env`, `az login`,
   `main.py`, `trigger_blocking_test.py`, `approve.py`. Seeing a real kill on your own machine teaches the
   whole flow in an hour.
2. **Read in this order**: `workflow.py` (the flow), `determination/agent.py` (the gates), `sql_query.py`
   (the kill), `llm.py` (the only LLM entry point), `router.py` (approvals).
3. **First change**: a new diagnostic field, end to end: tool → state field → Analyzer prompt → test.
4. **Rules**: tools never import the LLM; every new safety signal is a gate, not a prompt hint; every
   model output is a Pydantic model.

```bash
uv sync && uv run pytest tests/unit -q
uv run python main.py
uv run python trigger_blocking_test.py
```

What I'd fix for newcomers: some module docstrings still use old names (`nodes/action_node.py`,
`tools/detection.py`, `ask_llm_json`) from before the Pydantic AI migration, which sends people looking
for files that don't exist.

</div>

</details>

## Lessons Learned and Trade-offs
{: #lessons-learned-and-trade-offs }

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q1">
<summary>What was the hardest technical problem, and how did you solve it?</summary>

<div class="iq-role" data-role="architect" markdown="1">

**Making an irreversible action safe when part of the reasoning comes from a probabilistic model.**

The solution was to stop asking "how do we make the model reliable enough?" and instead ask "how do we
make the model's mistakes harmless?":

1. **Facts are deterministic.** Detection, the head-blocker walk and diagnostics are code.
2. **Hard rules run first and are final.** Maintenance windows, protected sessions, rollback estimates,
   log thresholds, kill rate, isolation level and application victims are gates in code. The model only
   weighs the soft rules if none fires.
3. **The model returns validated objects** and has no tools; prompt injection can at worst mislead the
   narrative.
4. **A human approves**, with deny on timeout.
5. **The action re-verifies the world.** SPID, login name and login time must still match, because SPIDs
   are reused; the `KILL` runs on an autocommit connection with `@@TRANCOUNT` checks; the result is
   validated afterwards.
6. **Dry-run in production** to measure decision quality before enabling the capability.

The subtle bugs were in step 5, not in the AI: session identity can change between detection and approval,
and the kill connection's transaction state matters. Those are classic distributed-systems problems, and
they'd exist without an LLM.

Deeper: [ADR-001](/posts/projects/sql-blocking-agent/05-technical-architecture/#architectural-decision-records).

</div>

<div class="iq-role" data-role="developer" markdown="1">

The subtle bugs were in the action path, and they're visible in the code:

- **SPID reuse**: `_validate_live_identity()` compares `login_name` and `login_time` immediately before the
  kill, and missing values fail closed.
- **Transaction state on the kill connection**: a pooled ODBC connection can come back with autocommit
  off, and `KILL` fails inside a transaction, so the code forces autocommit and checks `@@TRANCOUNT`.
- **A lost connection pool** for LLM calls: running each call with `asyncio.run()` closed the event loop
  and left the `httpx` pool with dead connections, so the second agent call failed; a persistent background
  loop fixed it.

```python
with connect_sql(conn_str, autocommit=True, timeout=10, sql_type=sql_type) as conn:
    conn.autocommit = True     # a pooled ODBC connection can be handed back with autocommit off
    cursor = conn.cursor()
    trancount = cursor.execute("SELECT @@TRANCOUNT").fetchval() or 0
```

The lesson: in an agent, the AI part fails loudly (validation errors), while the plumbing fails subtly
(connection state, event loops, identity). Most of the testing effort belongs on the plumbing.

</div>

</details>

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q2">
<summary>What would you do differently if you started again?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Would change | Instead |
|---|---|
| Started on LangChain + LangGraph | Start with the smallest framework that gives structured output; we migrated to Pydantic AI anyway |
| Approval API without authentication | Entra token and group check from the first deployment |
| Chart default `DRY_RUN: "false"` | Safe defaults in every layer |
| No poller heartbeat | Heartbeat per server from day one; silence is the main failure mode |
| No leader lock | Per-server leases early, so replicas were never a question |
| Cooldown in memory in loop mode | The `IncidentCooldown` table in both modes |
| Production drifting far behind development | A regular promotion cadence |
| Decisions inside long documents | Short numbered ADRs |

What I'd **keep**: the LLM boundary (ADR-001), gates in code, deny-by-default approval, insert-only audit
logging, separate reader and killer identities (and finishing the wiring so the code uses them), dry-run first, and writing policy as a sentence before
writing code.

The broader lesson for agentic AI: **the agent framework is the easy part.** The architecture is in the
boundaries (what the model may influence, what it may never do), the identities, and the evidence trail.

Deeper: [Retrospectives](/posts/projects/sql-blocking-agent/18-continuous-improvement/#retrospectives).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Code-level changes I'd make from the start:

| Instead of | I'd do |
|---|---|
| Synchronous nodes on the event loop | `async` nodes or `asyncio.to_thread` from day one |
| `BlockingAgentState` ignoring unknown keys | `extra="forbid"` |
| Sync approval handlers setting an `asyncio.Event` | `async def` handlers |
| `sys.path.insert(0, "src")` | An installable package with `uv` |
| Gates as a method returning tuples | A list of small gate objects, each with its own test file |
| Literal hostnames as defaults | Required settings |
| One connection string for detect and kill | A kill-only connection |
| Safety checks that fail open on error | A rule: every gate fails closed, with a test per gate |

What I'd keep: one LLM entry point with typed output, injectable SQL callables for tests, and the
`@@TRANCOUNT`-checked kill connection.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Platform choices I'd make differently:

- **`strategy: Recreate`** from the first deploy.
- **Safe chart defaults**: `DRY_RUN: "true"`, `runMode: loop`, empty endpoints required by the schema.
- **NetworkPolicy on by default** with an egress allow-list.
- **Two identities**: monitor and kill.
- **Approval access through SSO**, not port-forward.
- **CodeQL and `helm lint`** in CI from the start, shared workflows pinned.
- **A regular promotion cadence**, so production never drifts far behind development.

```bash
helm template sba sql-blocking-agent/helm | yq 'select(.kind=="Deployment") | .spec.strategy'
```

What I'd keep: the hardened security context, ExternalSecrets with workload identity, the
`development`/`release`/`production` approval gates, and PR previews.

</div>

</details>

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q3">
<summary>What technical debt exists today, and how would you pay it down?</summary>

<div class="iq-role" data-role="architect" markdown="1">

| Debt | Why it matters | Fix |
|---|---|---|
| Chart default `DRY_RUN: "false"` (code default `true`) | A missing override would enable real kills | Chart default `"true"` |
| Approval API without authentication | Anyone on the network path could approve | Entra token plus DBA group check |
| No poller heartbeat | Liveness doesn't prove polling | Heartbeat checked by the probe |
| No leader lock | Can't run more than one replica | Distributed lock or per-server leases |
| Tests run only inside the Sonar job | A failing gate test may not block a merge | Required check |
| Production 28 versions behind | Lacks recent safety work | Promote |
| In-memory cooldown in loop mode | Restart re-analyzes active incidents | Use the table |
| Infrastructure names as code defaults | Environment details in source | Require from config |
| Docs drift (rules R1–R12 vs R13; old deployment path) | Wrong mental model | Docs pass |
| A reusable workflow pinned to a feature branch | CI can change underneath | Pin to tag or SHA |
| Detection and `KILL` share one connection identity | The reader/killer split exists only in the setup script | A kill-only connection string and login |
| Loop-mode nodes run on the event loop | A slow LLM call pauses approvals and other pollers | `asyncio.to_thread` around node calls |
| The R10 kill-rate check fails open (a query error counts as zero kills) | A broken log connection disables the runaway-kill limit | Treat a failed count as "limit reached" |

**Order:** anything that could cause an unsafe kill or an unauthorized approval **before** real kills
(`DRY_RUN` default, API auth, required tests, promotion); then anything that hides failure (heartbeat);
then scale (leader lock); then hygiene. The go-live readiness review for real kills is effectively the
paydown plan.

Deeper: [Technical debt](/posts/projects/sql-blocking-agent/09-implementation/#technical-debt-tracking).

</div>

<div class="iq-role" data-role="developer" markdown="1">

Code debt, ranked by safety impact:

| Debt | Location | Fix |
|---|---|---|
| R10 fails open | `tools/kill_rate.py` | Return a count that trips the limit on error |
| Detect and kill share one connection | `agents/action/agent.py` | Kill-only connection string |
| Nodes block the event loop | `orchestrator/workflow.py` `_step` | `asyncio.to_thread` |
| Approval handlers not thread-safe | `orchestrator/router.py` | `async def` |
| Unknown state keys dropped | `orchestrator/state.py` | `extra="forbid"` |
| `POLL_INTERVAL_SECONDS` default 6000 | `orchestrator/config.py` | Sensible default plus a test |
| No approver identity | `router.py` | Auth dependency, write `human_reviewer` |
| Stale docstrings and e2e LLM logging | Several | Clean-up PR |

Order: anything that could lead to an unsafe or unattributed kill first (rows 1, 2, 7), then anything that
hides or delays the human loop (3, 4), then correctness hygiene.

</div>

<div class="iq-role" data-role="devops" markdown="1">

Platform debt:

| Debt | Fix | Size |
|---|---|---|
| Chart defaults `DRY_RUN: "false"`, `runMode: temporal`, real hostnames | Safe, empty defaults | Small |
| Rolling update on a single-poller agent | `Recreate` | Trivial |
| No probes in Temporal mode | Worker health endpoint or task-queue alerts | Medium |
| NetworkPolicy and PDB off | Enable with an egress allow-list | Small |
| CodeQL commented out; Sonar pinned to a branch | Re-enable; pin to a tag | Small |
| No CI integration test | SQL Server service container job | Medium |
| Production far behind development | Promotion cadence | Process |
| Certificates in the image with no expiry check | Scheduled check | Small |

Most of these are small. I'd group them into the readiness review for real kills, since that review is
the moment people are already looking at risk.

</div>

</details>

<details class="project-iq" markdown="1" id="lessons-learned-and-trade-offs-q4">
<summary>Where does the system go next, and how does the architecture support that?</summary>

<div class="iq-role" data-role="architect" markdown="1">

The roadmap, in order:

1. **Promote** the current development line to production, still in dry-run.
2. **Review dry-run decisions** with the database team and agree go/no-go.
3. **Enable real kills** on a first set of servers, approval mandatory.
4. **High availability:** a leader lock, then more than one replica.
5. **Durable execution:** Temporal mode and portal approvals in production.
6. **An agent platform:** reuse the pattern for the next agentic AI use case.

The architecture supports it because the pieces were built for it: Temporal mode already exists with the
approval wait as a durable signal and the kill as a single-attempt activity; the portal's HITL contract is
versioned and published; per-agent model settings make model changes configuration; and every new safety
signal has a clear home (a deterministic gate).

The longer-term metric I'd hold it to isn't kills. It's **recurrence**: how many blocking patterns stop
happening because someone acted on an RCA. A recurring pattern with a months-old P1 recommendation is a
conversation for the application owner, and the agent has already written the evidence.

> **TODO:** Are there target dates for production catch-up and the first real kills?
{: .prompt-warning }

Deeper: [Product roadmap](/posts/projects/sql-blocking-agent/03-product-planning/#product-roadmap).

</div>

</details>

{% include project-nav.html %}
