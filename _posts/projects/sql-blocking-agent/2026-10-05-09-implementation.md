---
layout: post
title: "SQL Blocking Agent: Implementation"
date: 2026-10-05 00:09:00 +0530
categories: [projects, sql-blocking-agent]
tags: [Projects, SQL Blocking Agent, Implementation]
description: "How the SQL Blocking Agent is built: ticket-sized safety changes with trackers, adding a gate or diagnostic, integrations, and a concrete technical debt list."
project: sql-blocking-agent
project_step: 9
image:
  path: /assets/img/projects/sql-blocking-agent/09-implementation.webp
  alt: "SQL Blocking Agent: Implementation - Projects hero image"
---

Most changes to this agent are small and safety-shaped: a stricter pre-kill check, a new protection
signal, one more field on the approval banner. The repo shows a habit worth copying. Each one gets a
ticket, an implementation tracker with the confirmed policy written down before the code, and a
baseline test run recorded at the start. This post describes that way of working, and lists the debt
that's accumulated alongside it.

<!-- more -->

{% include project-nav.html %}

## Sprint or iteration planning
{: #sprint-or-iteration-planning }

Work is planned as Jira tickets (the `SDO-*` keys in branch names) delivered by the DevOps team with the
database team reviewing anything that touches a kill. Releases have been frequent: 34 development
versions between June and the end of September 2026. I'd keep a simple iteration rhythm:

| Share | Work |
|---|---|
| ~50% | The next milestone (production catch-up, dry-run review, real kills) |
| ~30% | Database team requests (new diagnostics, report changes, thresholds) |
| ~20% | Debt from the list below |

## Feature development
{: #feature-development }

The implementation trackers show the pattern. Take SDO-16692, strengthening the pre-kill check:

1. **Scope in one sentence:** permit `KILL` only when the original SPID still exists and its live
   `login_name` and `login_time` match what detection saw.
2. **Baseline:** record the current test command and result before changing anything (18 tests passing
   in the touched files).
3. **Confirmed policy:** write the rule in plain words, including how missing data behaves (fail closed).
4. **Implement** in the deterministic tool, never in a prompt.
5. **Prove it:** unit tests for match, mismatch and missing values; live harness if the action path
   changed.
6. **Document** in ARCHITECTURE and Troubleshooting.

The order matters: policy before code. When the rule is written as a sentence first, the database team
can review it without reading Python.

## API and UI implementation
{: #api-and-ui-implementation }

The "UI" is the approval API, the CLI, the banner and the reports. Changes there touch a known set of
files: `orchestrator/router.py` (endpoints), `approve.py` (CLI), the approval details the orchestrator
builds, `tools/report_renderer.py` (HTML, Markdown, summary line) and the email templates in the
notification tools. A recent example is the reviewer field, added to the approval flow and shown in the
post-RCA email. Every change here should keep two properties: dynamic content escaped, and the correlation
ID visible.

## Database and infrastructure implementation
{: #database-and-infrastructure-implementation }

**Database:** a new configuration column or table is a new numbered script in `sql/`, written to be safe
to re-run, plus the loader change in `orchestrator/config.py` and, if it's per-server, the key added to
the override list. Audit changes go in `02_log_db.sql` and need an `INSERT` grant for the logger.

**Infrastructure:** the Helm chart in `helm/`, published by CI and deployed by Argo CD. A new setting is a
values key, a ConfigMap or ExternalSecret entry, and a `values.schema.json` update so a typo fails at
render time rather than at 3 am.

## Integration development
{: #integration-development }

Adding a new diagnostic for the Analyzer is the most common integration task:

1. Write a read-only tool in `src/tools/` that runs as `sql_agent_reader` and returns a typed result.
2. Add its fields to `BlockingAgentState`.
3. Call it from the Analyzer before the LLM call, and add the fields to the prompt context.
4. If it should affect safety, make it a deterministic gate in Determination, not a prompt hint.
5. Test it with a fixture DMV result.

Step 4 is the important design decision every time. Anything that should *block* a kill belongs in code.

## Technical debt tracking
{: #technical-debt-tracking }

| Item | Why it matters | Fix |
|---|---|---|
| Chart default `DRY_RUN: "false"` (code default `true`) | A missing environment override would enable real kills | Chart default `"true"` |
| No leader lock | Can't run more than one replica safely | Distributed lock in AgentConfigDB (for example `sp_getapplock`) |
| No poller heartbeat | Liveness only proves the API answers, not that polling advances | Heartbeat timestamp checked by the liveness probe |
| Approval API has no authentication | Anyone on the network path could approve | Entra token plus DBA group check |
| Tests run in CI only inside the Sonar job | A failing gate test may not block a merge | Make it a required check |
| Production 28 versions behind development | Production lacks recent safety work | Promote |
| Loop-mode cooldown is in memory | A restart re-analyzes active incidents | Use the `IncidentCooldown` table in loop mode too |
| Defaults with real infrastructure names (report container URL, SMTP host) in code | Environment details in source | Require them from config |
| `Governance_Rules_R1_R12.docx` is a truncated 148-byte file | The rules' "official" document can't be opened | Replace with Markdown; note R13 |
| Docs drift: README says R1–R12, code has R13; deployment guide still mentions `servers.json` and recommends Container Apps | Readers learn the wrong thing | Docs pass |
| A reusable workflow pinned to a feature branch | CI can change underneath you | Pin to a tag or SHA |

## Code reviews
{: #code-reviews }

A reviewer on this repo checks, in order: does this change what the agent is allowed to kill? If yes, a
database team reviewer and a negative test are required. Does any deterministic tool now depend on model
output? Then it's rejected. Is there a new LLM call? It needs a reason. Then the usual: tests, docs,
escaping, correlation ID.

## Developer documentation
{: #developer-documentation }

The Engineer Guide covers setup and daily work, and the Onboarding Guide is a 10,000-word repository
tour with a file-by-file table. The Troubleshooting guide is organized by symptom, starting with "triage
in 60 seconds", which is the right shape. The gap is a single "how to add a gate" and "how to add a
diagnostic" recipe, which this post's two lists could become.

> **TODO:** Which of the debt items above are already ticketed, and which should go into the next
> iteration?
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] Every debt item above has a ticket and an owner
- [ ] The Sonar job that runs the tests is a required check on pull requests
- [ ] The chart's `DRY_RUN` default is `"true"`
- [ ] The governance rules document is replaced with Markdown including R13
- [ ] "Add a gate" and "add a diagnostic" recipes are in the Engineer Guide
- [ ] Policy-before-code trackers stay the norm for safety changes

{% include project-nav.html %}
