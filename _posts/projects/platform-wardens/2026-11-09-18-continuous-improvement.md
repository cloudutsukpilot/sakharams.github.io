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

## User feedback
{: #user-feedback }

In the shadow stage, feedback is the score people give each run. Outside it, feedback has come from
reading the agents' output in Slack: the drift message was rebuilt into one message per incident with a
"who and when" column, and Stack Author learned to offer clickable choices and only the clouds that can
create what was asked.

> **TODO:** Is there a feedback button on the Slack message (agree, disagree, useful), or is the score
> recorded elsewhere? It's the cheapest source of eval cases once an agent leaves shadow.
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

Every agent's threat model is reviewed at Specify and at each gate; a red-team exercise comes before the
first L2 action and a security review before any L3. The cheapest continuous security review is the eval
set: every injection that works becomes a case, and every guardrail gets a denial test with its allowed
twin.

## Architecture reviews
{: #architecture-reviews }

The decision log is the architecture review's output. Seventeen proposed records came out of the homelab
build and a gap review against a public enterprise blueprint for agentic platforms; the review's job now
is to move the proven ones to accepted and supersede the ones the build disproved (as 0030 superseded
0015 when Event Hubs replaced Service Bus at the edge).

## Roadmap refinement
{: #roadmap-refinement }

Phases 3 to 5 are refined when they start, and every step is added to its phase before work on it
starts. Two things already changed the plan from the original: Stack Author was pulled forward from the
catalog's third wave because the homelab needed it, and Cluster Upgrade Readiness started in phase 0's
timeframe. Both are recorded in [Product Planning](/posts/projects/platform-wardens/03-product-planning/#phase-steps).

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
- [ ] Shadow-run scores feed the eval sets
- [ ] Lessons that change how agents are built are in the lessons log
- [ ] Proposed decisions are reviewed and moved to accepted or superseded
- [ ] Each agent's retirement checklist is filled in
- [ ] A retirement threshold is written down for each agent

{% include project-nav.html %}
