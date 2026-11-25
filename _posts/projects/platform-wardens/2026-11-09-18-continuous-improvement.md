---
layout: post
title: "Platform Wardens: Continuous Improvement"
date: 2026-11-09 00:18:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Improvement]
description: "How Platform Wardens gets better: scored shadow runs, wrong answers turned into eval cases, cost against Foundry prices, and agents retired as deliberately as they start."
project: platform-wardens
project_step: 18
image:
  path: /assets/img/projects/platform-wardens/18-continuous-improvement.webp
  alt: "Platform Wardens: Continuous Improvement - Projects hero image"
---

Every agent in Platform Wardens is on probation, permanently. It climbs a level only with evidence and
can be demoted by any owner or reviewer without a gate. That makes improvement a loop rather than a
project: score the runs, turn the wrong answers into cases, change the prompt or the stage, re-run the
cases, and let the numbers decide whether the agent moves up, stays, or goes.

<!-- more -->

{% include project-nav.html %}

## Product analytics
{: #product-analytics }

The analytics are the six measures from the vision, read from run records and the dashboards:
coverage, toil absorbed, quality, speed, cost and reuse. The one that says most about the framework
itself is **reuse**: the share of runs that use at least one common agent or shared tool server. If it
stays near zero, the "one agent per capability" rule isn't paying off. Today the drift runs reuse the
Change Correlator, and the web search server is the first shared tool.

The day-to-day numbers moved into the console's **Home** tab: for the last 24 hours, 7 or 30 days,
approvals waiting (and waiting for me), executions and their success rate, what's running and what
failed, p95 run time, model cost, tool calls and errors, and approvals decided, with a row per agent that
links to its Grafana dashboard. It reads the same queries as the dashboards, so the two can't disagree;
it's just the view I open first.

## User feedback
{: #user-feedback }

In the shadow stage, feedback is the verdict people give each run: **Right** or **Wrong** from the
incident's inspector in the console. A wrong run carries a candidate eval case, blocks the agent's
promotion until the case is committed to its eval set or dismissed, and is listed on the Feedback tab;
the nightly evals read the verdicts through a read-only endpoint
([ADR-0044](/posts/projects/platform-wardens/architecture-decision-records/#adr-0044)). That closes the
loop from "this was wrong" to "this is a test" without anyone copying a run by hand.

Outside the verdicts, feedback has come from reading the agents' output in Slack: the drift message was
rebuilt into one message per incident with a "who and when" column, Stack Author learned to offer
clickable choices and only the clouds that can create what was asked, a chat answer now names the run it
read and when (after one called an incident from before a fix "the latest scan"), and the Change
Correlator says a ticket holds no evidence instead of quietly counting it.

> **TODO:** Should the verdict also be a button in the Slack thread, where people actually read the
> findings? The inspector is one more click away than most people will go.
{: .prompt-warning }

## Retrospectives
{: #retrospectives }

The homelab work is recorded as lessons in the Cloudutsuk Platform's
[lessons log](/posts/projects/cloudutsuk-platform/lessons-learned/). The ones that changed how the
framework is built:

- Delta-temporality metrics left every `rate()` panel empty; workers now export cumulative metrics.
- A daily drift scan failed before planning, so a scheduled run had no plans to explain: an agent is only
  as good as the pipeline that feeds it, and the scan's failure needs its own alert.
- An image gate (Gitleaks) flagged the published development key of Azurite, the storage emulator behind the local Event Hubs stack; known false
  positives go in an ignore file with a reason, not a disabled gate.

November added a few that changed the platform rather than one agent:

- **Twenty-two short jobs cost more in queue than in run time.** One framework PR started about 22 jobs on
  the shared runners: 29 minutes of work, 258 minutes of waiting. A pull request now runs one job that
  does every check in order, and keeps going after a failure so one run shows them all.
- **GitHub's five-minute cron isn't five minutes.** An approved registry entry sat for hours because the
  sync's schedule ran late; the console now starts the sync right after an approval, and the cron is the
  fallback ([ADR-0049](/posts/projects/platform-wardens/architecture-decision-records/#adr-0049)).
- **A process that reads config once at start needs a restart when it changes.** The approval card lost
  its console button because the chat egress pod predated the config change; Reloader now rolls every
  Deployment that mounts the shared deploy config.
- **A model scaled to zero looks like a broken stage.** Drift's classifier ran past its timeout while the
  local model woke up, and the run fell back to "investigate". Classify now tries once more, with a
  longer stage timeout, when the model was asleep.
- **A registry ConfigMap can outgrow `kubectl apply`.** With every version of every agent in it, the
  last-applied annotation passed 256 KiB; the wardens apps moved to server-side apply.

## Reliability reviews
{: #reliability-reviews }

The target plan has kill-switch drills and an access review in the operate stage, and a monthly measures
report per agent. Until then, the reliability review is the dashboards plus the alerts: runs failed,
schedules missed, runs near their deadline, workers not polling, dead letters on the bus.

## Cost optimization
{: #cost-optimization }

Cost is tracked at the price the same calls would cost on the production model in Foundry, so
optimisation is measured even though the homelab's real cost is electricity. The levers, in the order
they pay off: keep deciding in code and let the model only explain; use a smaller model for stages that
only classify; cap responses and turn thinking off where it doesn't help; cap each handoff's cost at the
target agent's ceiling. A workflow or a function beats an agent for anything with no judgment in it.

## Security reviews
{: #security-reviews }

Every agent's threat model is reviewed at Specify and at each gate; the plan puts a red-team exercise
before the first L2 action and a security review before any L3. Drift's L2 went live under a waiver
without the red team, so it's now owed before the waiver is extended or anything in production reaches
L2. Plans get a security review of their own: team chat's added four security questions before any code
(the Slack signature checked twice, opaque ids on buttons, among others). The cheapest continuous
security review is still the eval set: every injection that works becomes a case, and every guardrail
gets a denial test with its allowed twin.

## Architecture reviews
{: #architecture-reviews }

The decision log is the architecture review's output. Seventeen proposed records came out of the homelab
build and a gap review against a public enterprise blueprint for agentic platforms; the review's job now
is to move the proven ones to accepted and supersede the ones the build disproved (as 0030 superseded
0015 when Event Hubs replaced Service Bus at the edge). Later decisions amend earlier ones in place, with
the amendment dated in the record (0036's of 2026-11-24 on unrelated tickets), or a new record says what
it changes: 0047 put level 2 approvals in Slack, where team chat's decision had kept them console-only,
once the Slack-to-Keycloak link existed, and 0049 changed when 0048's sync runs.

Big plans get a review before they start: the one-repository-per-agent plan was reviewed against the
architecture on 2026-11-17 and its Python standards written down before any agent moved, and team chat
had an AI-architect review against that plan the day it was proposed.

## Roadmap refinement
{: #roadmap-refinement }

Phases 3 to 5 are refined when they start, and every step is added to its phase before work on it
starts. Several things have changed the plan from the original: Stack Author was pulled forward from the
catalog's third wave because the homelab needed it, Cluster Upgrade Readiness started in phase 0's
timeframe, the split into one repository per agent went into phase 0 because every later agent would
start from it, team chat came forward in phase 2, and phase 5's approval workflow started early under an
owner waiver for drift's development stacks. All are recorded in
[Product Planning](/posts/projects/platform-wardens/03-product-planning/#phase-steps).

## Decommissioning and end-of-life planning
{: #decommissioning-and-end-of-life-planning }

Retirement is a lifecycle stage with its own checklist (`docs/retirement.md` in every agent): identity
revoked and the revocation confirmed, registry entry retired, records archived, dependants notified. The
proposed release path ([ADR-0023](/posts/projects/platform-wardens/architecture-decision-records/#adr-0023))
adds "without leftovers": no service account, App, key, schedule or dashboard outlives the agent. An
agent with no owner is disabled, not left running.

> **TODO:** Which agent would be retired first if its measures don't improve, and what's the threshold?
> Writing it down before it's needed keeps the decision honest.
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] The six measures are on a dashboard per agent
- [ ] Shadow-run verdicts feed the eval sets, and wrong runs are accepted as cases or dismissed
- [ ] Drift's waiver ends with a written review: approved runs, denials, failed applies
- [ ] Lessons that change how agents are built are in the lessons log
- [ ] Proposed decisions are reviewed and moved to accepted or superseded
- [ ] Each agent's retirement checklist is filled in
- [ ] A retirement threshold is written down for each agent

{% include project-nav.html %}
