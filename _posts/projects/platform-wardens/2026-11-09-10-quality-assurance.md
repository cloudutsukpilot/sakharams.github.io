---
layout: post
title: "Platform Wardens: Quality Assurance"
date: 2026-11-09 00:10:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Testing, QA]
description: "How Platform Wardens is tested: about 960 tests on a local Temporal, recorded fixtures instead of live models, eval sets per action, and the shadow stage as acceptance."
project: platform-wardens
project_step: 10
---

Testing an agent has two halves that need different tools. The code around the model (routing,
guardrails, workflows, tools) is ordinary software and gets ordinary tests, about 960 of them. What the
model says is not, so it gets evaluation sets scored against expected outcomes, re-run whenever the
model, prompt, tools or policy change. Neither half calls a live model in CI.

<!-- more -->

{% include project-nav.html %}

## Unit testing
{: #unit-testing }

Every workspace package has its own pytest suite. On 2026-11-09 the counts were:

| Package | Tests |
|---|---|
| `framework` | 444 |
| terraform-drift | 276 |
| stack-author | 96 |
| cicd-triage | 78 |
| mcp-guard | 23 |
| change-correlator | 17 |
| incident-triage | 14 |
| cluster-upgrade-readiness | 10 |

Agent unit tests use Pydantic AI's `TestModel` and recorded fixtures (plans, CI logs, API responses), so
a test never depends on what a model happens to answer today.

## Integration testing
{: #integration-testing }

The framework tests run against a real local Temporal (the SDK downloads the dev server once) with toy
agents: `toy_agent.py`, `incident_agents.py` for handoffs and parallel children, `approval_agent.py` for
the approval wait, `schedule_agent.py` for schedules. That's how timeouts, retries, the approval timeout
that denies, and incident-level messages are tested without a real agent's I/O.

`WARDENS_SKIP_TEMPORAL=1` skips those tests for a quick local loop; CI always runs them.

## Contract testing
{: #contract-testing }

- Every record type has a JSON Schema, and both the producer and the reader validate against it.
- A schema change is made in the same PR as every caller, and it re-triggers every agent's evals.
- The console test builds a root task from **every sample in the repo**, so a sample that no longer
  matches its capability's input schema fails CI.
- The registry's cross-field rules (owner and reviewer differ, act tools in the action catalog,
  schedules naming a real capability) are tested with a valid manifest and a broken twin of it.

## End-to-end testing
{: #end-to-end-testing }

End to end means a real run on the `wardens` cluster, done by hand once per new path and written down:
the drift-to-correlator handoff on a real portal deletion, a test alert reaching incident triage through
the bus with one trace from the relay to the agent, the web-search tool granted to one agent and refused
to another, twice. The operator console is the tool for repeating them: it sends the same root task a
trigger sends.

> **TODO:** None of these end-to-end checks are automated. Should a nightly synthetic run (a console
> sample under the incident workflow) become a smoke test with an alert when it fails?
{: .prompt-warning }

## Regression testing
{: #regression-testing }

Two kinds. **Workflow regressions:** recorded histories of running workflows are replayed in CI, and
changes to running workflow code go behind `workflow.patched`, so a deploy can't break a run that's
waiting on an approval. **Behaviour regressions:** `wardens.eval` compares a run of the eval set with a
baseline; a merge is blocked if the pass rate falls or the false-action rate rises. Every production run
the agent got wrong becomes a new case.

| Eval set | Cases | Scores |
|---|---|---|
| terraform-drift | 10: 8 harvested from real `infra-azure` scans, 2 synthetic; none yet with labelled drift | Attribute, YAML key, classification, allowed recommendation kinds, forbidden actions |
| cicd-triage | 42 real cases (plus 17 from the failure lab), labels not yet confirmed by the owner | Failed step and category against their floors |
| Routing | 40 labelled requests | The classifier's threshold recommendation |

Every running agent is short of the framework's floor of 30 cases per action: drift has 10, Stack Author
9, the Change Correlator and incident triage 1 each. On the homelab they went into shadow anyway, to
collect real cases from live runs, which bends the lifecycle rule that asks for 30 before shadow. It's
the biggest testing gap, and promotion stays blocked until it's closed.

## Performance and load testing
{: #performance-and-load-testing }

The one load test planned is for the event bus: 1,000 synthetic alert groups posted to the alerts relay
(no rule matches, so nothing starts and nothing reaches Slack) and 5,000 GitHub-shaped events published
to the hub. Pass: nothing lost, the webhooks stay fast, every expected run starts within 5 minutes. It's
waiting on a go for the approach.

Model latency is measured, not load-tested: every `chat` span carries the real call times, and the cost
and model dashboard shows them per agent.

## Security testing
{: #security-testing }

- **Control evidence** ([ADR-0024](/posts/projects/platform-wardens/architecture-decision-records/#adr-0024)):
  every denial test has an allowed twin, names the exact denial, and fails when the control is removed.
- **Injection cases** in the eval sets: an instruction hidden in a plan or a commit message must change
  nothing.
- **Image gates** on every build: Gitleaks, Semgrep, Trivy, Checkov, Hadolint.
- **Alert rules** are tested with promtool, including the P1 guardrail-denial alert.
- A red-team exercise before the first L2 action, in the target plan.

## Accessibility testing
{: #accessibility-testing }

Not done, and low priority: the surfaces are Slack, GitHub, Grafana and a one-page console. The one
check worth adding is the console's forms with a keyboard only, since operators use it to engage the
kill switch.

## Compatibility testing
{: #compatibility-testing }

Images are built for both amd64 and arm64, because the homelab is moving its clusters from an arm64 host
to an x86 one while the models stay on the arm64 machine. The model provider is configuration, so the same
agent is tested against a mocked OpenAI-compatible endpoint; the Foundry and Anthropic paths share the
code but aren't exercised against the real services in CI.

## User acceptance testing
{: #user-acceptance-testing }

The shadow stage is UAT. An agent runs at L0 on live inputs, and the people who'd otherwise do the work
read and score every run. G3 needs those scores to meet the floors with zero safety failures. The target
plan adds side-by-side comparison with the incumbent tool and controlled fault injection (a lock induced
in non-production for the SQL blocking agent, a chaos experiment for incident triage) as evaluation
events.

## Test data and test environment management
{: #test-data-and-test-environment-management }

| Data | Where it comes from |
|---|---|
| Drift cases | Real drift scans of `infra-azure`, harvested into YAML with the expected outcome |
| CI/CD cases | A private failure lab with 17 seeded faults across six build tools, each failing its own pipeline |
| Routing cases | 40 hand-labelled requests |
| Fixtures | Recorded API responses and logs, with secrets and identifiers scrubbed |

The test environment is the developer's machine with a local Temporal; there's no shared test cluster
(see [Infrastructure](/posts/projects/platform-wardens/11-infrastructure-and-environments/#test-or-qa-environment)).

## Checklist
{: #checklist }

- [ ] Every package's tests pass with `uv sync --frozen` in CI
- [ ] No test calls a live model
- [ ] Every action has at least 30 eval cases before G3
- [ ] Recorded workflow histories are replayed before a workflow change merges
- [ ] Every denial test has its allowed twin
- [ ] The bus load test has run and its result is recorded
- [ ] Shadow-run scores are recorded for every run

{% include project-nav.html %}
