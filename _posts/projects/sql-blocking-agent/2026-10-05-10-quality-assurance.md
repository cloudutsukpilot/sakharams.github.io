---
layout: post
title: "SQL Blocking Agent: Quality Assurance"
date: 2026-10-05 00:10:00 +0530
categories: [projects, sql-blocking-agent]
tags: [Projects, SQL Blocking Agent, Testing, QA]
description: "Testing an agent that can kill sessions: 240 unit tests, negative tests per gate, a live kill harness, LLM output checks, and dry-run as acceptance testing."
project: sql-blocking-agent
project_step: 10
image:
  path: /assets/img/projects/sql-blocking-agent/10-quality-assurance.webp
  alt: "SQL Blocking Agent: Quality Assurance - Projects hero image"
---

For most software, a missed bug means a broken feature. For this agent, the worst bug is a `KILL` that
shouldn't have happened, so the test strategy is lopsided on purpose: far more effort goes into proving
what the agent *won't* do than what it will. The repo has 240 unit tests across 32 files, end-to-end
tests against a real SQL Server, and a harness that performs a real kill and restores the database
afterwards.

<!-- more -->

{% include project-nav.html %}

## Unit testing
{: #unit-testing }

The unit tests map onto the architecture:

| Area | Test files |
|---|---|
| Detection and diagnostics | `test_detection.py`, `test_locks.py`, `test_log_safety.py`, `test_plan_cache.py`, `test_query_store.py` |
| Governance | `test_determination_gates.py`, `test_exclusion_window.py`, `test_incident_cooldown.py` |
| Action path | `test_action_agent.py`, `test_sql_executor.py`, `test_sql_validator.py`, `test_sql_connection.py` |
| LLM layer and cost | `test_llm.py`, `test_rca.py`, `test_usage.py`, `test_workflow_cost_controls.py` |
| Config | `test_load_multi_server_configs.py`, `test_target_server_overrides.py`, `test_main_config_reload.py` |
| Output | `test_audit_log.py`, `test_report_renderer.py`, `test_notifications.py`, `test_notification_tool.py`, `test_blob_storage.py` |
| Approval and telemetry | `test_router.py`, `test_telemetry.py` |
| Temporal | `test_temporal_app.py`, `test_temporal_scheduling.py` |

They run in CI through the shared SonarQube workflow, which executes them for coverage. They import
`pyodbc`, so even unit tests need the unixODBC system library, which that runner provides.

> **TODO:** What's the current pass count and coverage of `tests/unit`? The troubleshooting guide still
> quotes an older run (65 passing, 4 failing in `test_audit_log.py`), which predates most of today's
> 240 tests.
{: .prompt-warning }

## Integration testing
{: #integration-testing }

`tests/e2e/test_end_to_end.py` runs a full cycle in dry-run against a local SQL Server, with human
approval turned off so it runs unattended. `tests/e2e/setup_databases.py` creates AgentConfigDB and
AgentLogDB for it. That's the integration test that proves the nodes, the state model, the SQL and the
LLM calls work together. It needs a SQL Server and model access, so it's a pre-release check rather than
a per-commit one.

## Contract testing
{: #contract-testing }

Three contracts deserve contract-style tests:

- **LLM output schemas.** The Pydantic models for Analyzer, Determination and RCA are the contract with
  the model. A test that feeds recorded model responses through validation catches a schema change that
  would otherwise surface as retries in production.
- **Platform One report v1.** `tools/pf1_report_contract.py` validates field and count limits and the
  1 MiB cap; fixtures for "valid", "too large" and "unsupported version" lock that down.
- **The approval API.** `test_router.py` covers the endpoints `approve.py` depends on.

## End-to-end testing
{: #end-to-end-testing }

`tests/e2e/test_live_kill.py` is the real thing: it creates a blocker and a victim, runs the cycle, issues
a real `KILL`, validates, writes audit rows and renders the report. The July live run analysis documents
it working: blocker SPID 76, victim SPID 79, decision `KILL`, kill status `SUCCESS`, audit and report
confirmed. That run also found and fixed two harness problems (a missing stored procedure and an
SQL-auth path), which is exactly why the harness exists.

Recommendation: run it before every release that touches the action path, in a disposable SQL Server
container in CI.

## Regression testing
{: #regression-testing }

The regressions that would hurt most:

1. A gate that stops firing. Each gate needs a test where it fires and the decision is final, with no LLM
   decision call.
2. The pre-kill identity check accepting a mismatch (reused SPID).
3. The `@@TRANCOUNT` guard: a connection still in a transaction must abort, not kill.
4. Timeout behavior: no approval must mean `ALERT_ONLY`.
5. Prompt changes shifting decisions. Keep a small set of recorded incidents and compare decisions before
   and after any prompt or model change.

## Performance and load testing
{: #performance-and-load-testing }

Load here means monitored servers and concurrent incidents, not requests per second. What to measure:

| Measure | Why |
|---|---|
| DMV poll duration per server | Must stay well under the 15 s poll interval |
| Cycle duration with blocking (three LLM calls) | Sets detection-to-email time |
| Memory with N pollers | Sizes the pod for one replica |
| Behavior with N simultaneous incidents | Shared model quota and approval API |

`test_workflow_cost_controls.py` already guards the cost side (cooldown, bounded retries). A simple load
test with 20 fake servers returning canned DMV rows would answer the sizing questions the Helm design
record leaves open.

## Security testing
{: #security-testing }

- Negative tests per hard gate and for the protection policy (session ID boundary at 50 and 51,
  non-user processes, unknown values failing closed, `ProtectedLogins`).
- A prompt-injection fixture: SQL text instructing the model to kill, with gates and approval still
  governing the outcome.
- Escaping tests: SQL text with HTML in the email and report.
- The approval API rejects unknown IDs and can't approve twice.
- SonarQube in CI for code-level findings.

## Accessibility testing
{: #accessibility-testing }

Light, because the outputs are text: check the email's plain-text part reads correctly, the HTML report
works with images off and without colour, and decisions and risks appear as words.

## Compatibility testing
{: #compatibility-testing }

| Dimension | Range |
|---|---|
| Python | 3.11 to 3.13 (`requires-python`) |
| SQL Server targets | IaaS (SQL login), Azure SQL PaaS and Managed Instance (Entra token) |
| SQL Server versions | DMVs and Query Store availability differ by version; Query Store falls back to plan cache |
| ODBC driver | 18 in the image |
| Model | `gpt-5-mini` default; any model change re-runs the recorded-incident comparison |

> **TODO:** Which SQL Server versions and editions do the monitored servers run? Query Store and some DMV
> columns depend on it.
{: .prompt-warning }

## User acceptance testing
{: #user-acceptance-testing }

Production dry-run *is* the acceptance test. Every cycle records what the agent would have done; the
database team reviews a sample and marks each decision as "agree", "would have killed earlier",
"would not have killed" or "wrong root cause". The go/no-go for real kills is a threshold on that review,
for example 100% agreement on every `KILL` the agent proposed, and no gate misses.

## Test data and test environment management
{: #test-data-and-test-environment-management }

- Local SQL Server Express, with `setup_databases.py` and the numbered scripts.
- `trigger_blocking_test.py` and `scenario_nonapp_blocker.py` create blocking on demand, including the
  case where the victim isn't an application account (to prove R11).
- A `BlockingTest` table and an `svc_appaccount` login provisioned by the live harness.
- Forced real-kill runs change runtime settings temporarily (the July run lowered the poll interval to
  5 s and the kill threshold to 1 s, and turned dry-run off), then restore them. That restore step
  belongs in a script, not in someone's memory.
- No production data in tests; recorded incidents for prompt comparison are sanitized first.

## Checklist
{: #checklist }

- [ ] The Sonar job running the unit tests is a required PR check
- [ ] Current pass count and coverage are published; the old numbers are removed from the docs
- [ ] Every hard gate and protection rule has a negative test
- [ ] A prompt-injection fixture exists
- [ ] Recorded incidents are compared before and after prompt or model changes
- [ ] The live kill harness runs in a disposable SQL Server container before releases
- [ ] The dry-run review rubric and go/no-go threshold are agreed

{% include project-nav.html %}
