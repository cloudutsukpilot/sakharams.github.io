---
layout: post
title: "SQL Blocking Agent: User Experience and Design"
date: 2026-10-05 00:04:00 +0530
categories: [projects, sql-blocking-agent]
tags: [Projects, SQL Blocking Agent, UX, Design]
description: "The SQL Blocking Agent's user experience is an approval banner, a CLI, an email and an RCA report. Designing each so a DBA can trust a KILL decision fast."
project: sql-blocking-agent
project_step: 4
image:
  path: /assets/img/projects/sql-blocking-agent/04-user-experience-and-design.webp
  alt: "SQL Blocking Agent: User Experience and Design - Projects hero image"
---

The SQL Blocking Agent has no web UI, and that was a choice. Its users are DBAs in the middle of an
incident, and what they need is evidence, fast: who is blocking, how many are waiting, what killing it
would cost, and why the agent thinks what it thinks. So the "screens" are an approval banner, a
four-command CLI, an email and an HTML report, each designed around one question the DBA is asking.

<!-- more -->

{% include project-nav.html %}

## Information architecture
{: #information-architecture }

Everything the agent produces hangs off one key: the cycle's **correlation ID**. It appears in the logs,
the approval banner, the audit rows, the report filename and the email, so a DBA can go from the email
to the report to the audit rows to the raw logs without guessing.

| Artifact | Question it answers | Where |
|---|---|---|
| Approval banner | "Should I let it kill this session?" | Agent log, `approve.py show` |
| DBA email | "What happened, and do I need to act?" | Inbox |
| HTML RCA report | "Why did it happen, and how do we stop it recurring?" | Blob Storage, linked from the email |
| Audit tables | "What did the agent do, and who approved it?" | AgentLogDB |
| Cycle summary | "Is the agent healthy and what did it cost?" | Logs and telemetry |

## User flows
{: #user-flows }

The flow that matters most is the DBA's approval, because it's where a person and the agent share a
decision. Step through it, or tick the box to see a deny or timeout:

{% include flow-anim.html id="projects/sql-blocking-agent/approval-flow" %}

The other flows are simpler: the DBA reads an `ALERT_ONLY` email and decides whether to act by hand; the
DBA lead adjusts thresholds or adds a protected login in AgentConfigDB and sees it take effect within a
minute; the DevOps engineer adds a server row and watches a new poller start.

## Wireframes and prototypes
{: #wireframes-and-prototypes }

The approval banner is the screen most worth designing on paper, because it's read under pressure. This
mock-up lays out the fields the code includes (server, SPID, login, database, wait, victims, risk,
scenario, log usage, plan availability, safety rating, decision reason, diagnosis) in reading order; the
values are illustrative:

```text
=== KILL APPROVAL REQUIRED ===  id: 3f9c2a1b   corr: 347eb4a1
Server     : <server>           Database : <db>
Head SPID  : 76  login: batch_job_usr   wait: 42 s   victims: 12
Risk       : MEDIUM   Scenario: #6 Orphaned connection / open transaction
Log used   : 3 %      Rollback safety: SAFE          Plan: available (Query Store)
Decision   : KILL  (rule: LLM, reason: ...)
Diagnosis  : ...
Approve:  python approve.py approve 3f9c2a1b "note"
Deny:     python approve.py deny    3f9c2a1b "reason"
Times out in 300 s -> ALERT_ONLY
```

The design rule: everything needed to decide is on one screen, the commands to act are printed
underneath, and the safe default is spelled out.

## Visual design and design system
{: #visual-design-and-design-system }

The HTML report and email share one structure: decision and kill status first, then incident details,
key findings, root cause, business impact, recommendations, decision rationale and token usage. Severity
and decision are always written as words (`KILL`, `ALERT_ONLY`, `SKIP`; `CRITICAL`, `HIGH`), with colour
only as a second signal. Recommendations are numbered P1 to P4 with T-SQL in code blocks, because DBAs
copy them.

## Interaction patterns
{: #interaction-patterns }

- **Deny by default.** No answer within the timeout is a deny.
- **Reasons are first-class.** `approve` takes an optional note and `deny` takes a reason; both land in
  the decision reason and the audit trail.
- **Read before act.** `approve.py list` and `show <id>` exist so nobody approves an ID they haven't read.
- **One decision per KILL.** Approvals are keyed by the cycle's correlation ID, so an approval can't be
  applied to a different incident.
- **Dry-run is visible.** In dry-run the action records `kill_executed = false` with `dry_run = true`,
  so the audit trail never confuses a simulated kill with a real one. The email and report should say so
  just as plainly.

## Responsive behavior
{: #responsive-behavior }

DBAs don't need to approve from a phone: they work from email and Microsoft Teams at their desks. The
email has an HTML body with a plain-text fallback and links to the full report rather than embedding it.
The agent sends email today; posting the same summary to the DBA team's Teams channel would be a small
addition (there's no Teams integration in the code yet), and it would put incidents where the team
already talks.

## Accessibility design
{: #accessibility-design }

Plain text works with screen readers and in every terminal, and the banner is plain text. Reports use
headings and tables rather than images of tables, decisions are words not colours, and email has a text
alternative. The one thing to keep checking is that dynamic content (SQL text, login names) stays
escaped, which the notification code already does before rendering.

## Usability testing
{: #usability-testing }

The most useful test is a **tabletop exercise** with the database team: replay three real dry-run
incidents, show the banner and report, and ask the DBA to decide before revealing the agent's decision.
Measure agreement, time to decide, and every question they had to ask that the banner didn't answer.
Each unanswered question is a banner field to add.

> **TODO:** Has the database team reviewed the approval banner and RCA report format? Their feedback is
> the best usability data this project can get.
{: .prompt-warning }

## Content and messaging
{: #content-and-messaging }

The RCA agent writes the words people read most, so its prompt is effectively the style guide:

- an executive summary first, two or three sentences;
- root cause in DBA terms (the KB scenario and the evidence), not model speculation;
- business impact in application terms (how many sessions, how long);
- P1 to P4 recommendations, each with a concrete T-SQL or configuration change.

Two rules I'd add to the prompt: never claim a cause the diagnostics don't support, and say "unknown"
rather than guess. A wrong root cause in an otherwise good report costs trust fast.

## Checklist
{: #checklist }

- [ ] The approval banner layout is reviewed with the database team
- [ ] A tabletop exercise on three dry-run incidents is run and findings logged
- [ ] Dry-run kills are clearly labelled in emails and reports
- [ ] The RCA prompt says "unknown" rather than guessing a cause
- [ ] A Teams notification alongside the email is considered
- [ ] The correlation ID appears in every artifact

{% include project-nav.html %}
