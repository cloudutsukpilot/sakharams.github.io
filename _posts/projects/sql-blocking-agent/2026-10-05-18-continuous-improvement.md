---
published: false
layout: post
title: "SQL Blocking Agent: Continuous Improvement"
date: 2026-10-05 00:18:00 +0530
categories: [projects, sql-blocking-agent]
tags: [Projects, SQL Blocking Agent, Improvement]
description: "Improving the SQL Blocking Agent from evidence: dry-run decision reviews, RCA quality, LLM cost, recurring blockers, and lessons for the org's next agents."
project: sql-blocking-agent
project_step: 18
image:
  path: /assets/img/projects/sql-blocking-agent/18-continuous-improvement.webp
  alt: "SQL Blocking Agent: Continuous Improvement - Projects hero image"
---

The best measure of this agent won't be how many sessions it kills. It'll be how many blocking incidents
stop happening because someone acted on its RCA. And as the platform engineering org's first agentic AI
project, it has a second output: the lessons that make the next agent faster and safer to build.

<!-- more -->

{% include project-nav.html %}

## Product analytics
{: #product-analytics }

AgentLogDB already holds what's needed:

| Question | Source |
|---|---|
| Which servers block most, and when? | `BlockingEventLog` by server and hour |
| Which head-blocker patterns recur (login, program, query)? | `BlockingEventLog` grouped |
| Which rules decide most outcomes? | Decision rule on audit rows |
| How often do DBAs agree with proposed kills? | Approvals vs denials |
| Are recommendations being acted on? | Recurrence of the same pattern after an RCA |

The last one is the real product metric. A recurring pattern with a P1 recommendation that's months old
is a conversation for the application owner, and the agent has already written the evidence.

## User feedback
{: #user-feedback }

The database team is the user and the domain expert. I'd capture feedback in two cheap ways: a
"was this RCA right?" link in the email that records yes, partly or no with the correlation ID, and a
monthly half-hour review of the dry-run decisions they disagreed with. Every disagreement is either a
prompt change, a new gate, or a threshold change.

## Retrospectives
{: #retrospectives }

Worth holding after the real-kill pilot and after any incident in the agent. A useful framing for this
project: for each decision the agent got wrong, which layer should have caught it? The diagnostics
(missing fact), the gates (missing rule), the LLM (wrong judgement on good facts), or the human (approved
anyway)? The answer says where to invest.

## Reliability reviews
{: #reliability-reviews }

Monthly: servers silently unmonitored (any minutes without a successful cycle), cycle error rates by
cause, kill validation outcomes, LLM failures and the fallbacks they triggered. Silence is the reliability
risk that matters most for a monitoring agent, so "minutes unmonitored" is the headline number.

## Cost optimization
{: #cost-optimization }

The agent is already cost-conscious: three LLM calls only when there's blocking, cooldown, one retry, and
per-agent model and thinking-level settings. The migration from LangChain to Pydantic AI was partly
motivated by cost visibility. Next steps:

- compare RCA quality at a lower thinking level; the RCA is the longest output;
- track tokens per incident by agent and alert on spikes;
- check whether the Analyzer needs all diagnostics for every scenario, or whether the KB scenario can
  skip some.

> **TODO:** What's the monthly LLM spend for the agent today? A baseline makes the optimizations above
> measurable.
{: .prompt-warning }

## Security reviews
{: #security-reviews }

Quarterly, with security: the approval API's access control, the `KILL` login's reach, the workload
identity's roles, the prompt-injection tests, and what SQL text is sent to the model. Before each
expansion of real kills to more servers, a short review of the new servers' protected logins and
exclusion windows.

## Architecture reviews
{: #architecture-reviews }

The questions to revisit twice a year:

- **HA:** is it time for a leader lock and more than one replica?
- **Durability:** should production move to Temporal mode, with Platform One approvals?
- **Approval UX:** CLI, Platform One page, or a Teams card?
- **Model:** is `gpt-5-mini` still the right default per agent?
- **Reuse:** which parts (the LLM wrapper, structured output, gate pattern, approval router, audit and
  report pipeline) should become a shared library for the next agents?

The last question is where this project pays off beyond SQL Server.

## Roadmap refinement
{: #roadmap-refinement }

Re-rank the [roadmap](/posts/projects/sql-blocking-agent/03-product-planning/#product-roadmap) quarterly
using the dry-run review results, the database team's feedback, reliability and cost data. Safety items
always stay ahead of features.

Some lessons from this first agentic AI project that I'd carry into the next one:

1. **Put the LLM where judgement and language matter, nowhere else.** Three narrow calls, each returning
   one validated object.
2. **Encode the experts' rules as code before asking a model anything.** The gates came from the
   database team, and they're the reason the agent can be trusted.
3. **Make "no answer" safe.** Timeout means deny; LLM failure means `ALERT_ONLY`.
4. **Run in dry-run in production first.** It turns decision quality into something you can measure.
5. **Choose the smallest framework that does the job.** Pydantic AI replaced LangChain and LangGraph with
   less code and better guarantees.

## Decommissioning and end-of-life planning
{: #decommissioning-and-end-of-life-planning }

The agent would retire if a platform capability (for example a managed database advisor) did the same job
with comparable safety, or if it were folded into a shared agent platform. Either way the steps are the
same: switch to dry-run, stop the pollers, drop or disable the `KILL` login on every server first, keep
AgentLogDB and the Blob reports for the audit retention period, then remove the deployment, the
workload identity's roles and the secrets.

## Checklist
{: #checklist }

- [ ] A recurring-pattern report goes to application owners monthly
- [ ] "Was this RCA right?" feedback is captured per incident
- [ ] Monthly reliability review uses "minutes unmonitored" as its headline
- [ ] LLM spend has a baseline and a per-incident trend
- [ ] Reusable parts are identified for the next agent
- [ ] Lessons learned are written up for the platform engineering org
- [ ] The decommissioning order (KILL login first) is documented

{% include project-nav.html %}
