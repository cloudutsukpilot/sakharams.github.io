---
layout: post
title: "Platform Wardens: Quality Assurance"
date: 2026-11-09 00:10:00 +0530
categories: [projects, platform-wardens]
tags: [Projects, Platform Wardens, Testing, QA]
description: "How Platform Wardens is tested: about 960 tests on a local Temporal, recorded fixtures instead of live models, eval sets per action, and the shadow stage as acceptance."
project: platform-wardens
project_step: 10
image:
  path: /assets/img/projects/platform-wardens/10-quality-assurance.webp
  alt: "Platform Wardens: Quality Assurance - Projects hero image"
---

Testing an agent has two halves that need different tools. The code around the model (routing,
guardrails, workflows, tools) is ordinary software and gets ordinary tests, in every repository. What the
model says is not, so it gets evaluation sets scored against expected outcomes, re-run whenever the
model, prompt, tools or policy change, and once a night against the live model. Neither half calls a live
model in pull-request CI.

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

Those counts are from before the split. Since 2026-11-20 each agent's suite lives and runs in its own
`warden-<agent>` repository, through the shared `agent-ci` workflow, against the signed `wardens` wheel
it pins; platform-wardens keeps the framework, services and mcp-guard suites and runs them in one
pull-request job. On 2026-11-17 the framework suite ran 627 tests against the installed wheel, outside
the checkout, which is the test that proves an agent will see the same library CI saw.

Agent unit tests use Pydantic AI's `TestModel` and recorded fixtures (plans, CI logs, API responses), so
a test never depends on what a model happens to answer today.

## Integration testing
{: #integration-testing }

The framework tests run against a real local Temporal (the SDK downloads the dev server once) with toy
agents: `toy_agent.py`, `incident_agents.py` for handoffs and parallel children, `approval_agent.py` for
the approval wait and the approve-then-act workflow, `schedule_agent.py` for schedules. That's how
timeouts, retries, the approval timeout that denies, a press from someone outside the approver group, an
approval bound to a different change summary, and incident-level messages are tested without a real
agent's I/O.

`WARDENS_SKIP_TEMPORAL=1` skips those tests for a quick local loop; CI always runs them.

## Contract testing
{: #contract-testing }

- Every record type has a JSON Schema, and both the producer and the reader validate against it.
- A schema change is made in the same PR as every caller, and it re-triggers every agent's evals.
- The console test builds a root task from **every sample in the repo**, so a sample that no longer
  matches its capability's input schema fails CI.
- The registry's cross-field rules (owner and reviewer differ, act tools in the action catalog,
  schedules naming a real capability) are tested with a valid manifest and a broken twin of it.
- **Across repositories:** `wardens-deploy` CI checks every declared handoff for each agent's two newest
  versions (the deployed one and the rollback), validating the producer's sample against the consumer's
  input schema ([ADR-0042](/posts/projects/platform-wardens/architecture-decision-records/#adr-0042)).
  `wardens release check` compares the schemas and the check-agent rules with the last release and runs
  the rules on every agent repository that pins it, so a tightening that would break an agent fails
  before it ships.

## End-to-end testing
{: #end-to-end-testing }

End to end means a real run on the `wardens` cluster, done by hand once per new path and written down:
the drift-to-correlator handoff on a real portal deletion, a test alert reaching incident triage through
the bus with one trace from the relay to the agent, the web-search tool granted to one agent and refused
to another, twice. The operator console is the tool for repeating them: it sends the same root task a
trigger sends.

The level 2 path got the most careful one, with a test tag put on a development resource group each
time and removed after:

| Check | Result |
|---|---|
| A development revert, approved in Slack | The agent dispatched the stack's apply, it went green, the tag was gone (2026-11-22) |
| A second card for the same drift, denied in the console | Nothing acted on it |
| A development codify, with a Jira key in a commit under the stack | Two scans failed for good reasons first (the classifier's model was scaled to zero and ran past its timeout; the YAML patcher refused a block map), then a draft PR, approved in Slack and squash-merged, apply green (2026-11-23) |
| The same with a block-map tag, after both fixes | The model woke in 390 s, the PR changed one line, approved and merged (2026-11-24) |
| Stacks outside the waiver's environments | Revert proposed, no approval request |
| qa | Dropped: no repository has a qa environment yet |

> **TODO:** These end-to-end checks are still by hand. Should a nightly synthetic run (a console sample
> under the incident workflow) become a smoke test with an alert when it fails?
{: .prompt-warning }

## Regression testing
{: #regression-testing }

Two kinds. **Workflow regressions:** recorded histories of running workflows are replayed in CI, and
changes to running workflow code go behind `workflow.patched`, so a deploy can't break a run that's
waiting on an approval. **Behaviour regressions:** `wardens.eval` compares a run of the eval set with a
baseline; a merge is blocked if the pass rate falls or the false-action rate rises. Every production run
the agent got wrong becomes a new case.

| Eval set (case files on 2026-11-25) | Cases | Scores |
|---|---|---|
| terraform-drift | 37: real cases harvested from scans of infra-azure, infra-github, infra-local and infra-cloudflare, two injection cases, three level 2 cases (a development stack hands off; production, and a stack whose `main` moved, ask for nothing) | Attribute, YAML key, classification, allowed recommendation kinds, forbidden actions, and safety for hand-offs |
| cicd-triage | 59: 42 real and 17 from the failure lab | Failed step and category against their floors |
| Stack Author | 12 scripted conversations | Questions asked, module read before a proposal, secrets and path escapes refused |
| Change Correlator | 9: two real, seven synthetic (GitHub objects, an injection in a ticket, nothing recorded) | Who, when, client, ticket |
| incident-triage | 2 | The finding, and an injection in an alert name |
| Routing (in `wardens-deploy`) | 44 labelled requests | The classifier's threshold recommendation |

The case format is a contract now, and only real cases **confirmed by the agent's owner** count toward
promotion; the library decides that from the label, not the agent. No case anywhere is owner-confirmed
yet, so every agent counts zero toward the floor of 30 per action, however many files it has. On the
homelab the agents went into shadow anyway, to collect real cases from live runs, which bends the
lifecycle rule that asks for 30 before shadow. Labelling is the biggest testing gap, and promotion stays
blocked until it's closed. Drift's level 2 actions didn't wait for it: the owner's waiver
([ADR-0047](/posts/projects/platform-wardens/architecture-decision-records/#adr-0047)) is written into
its evaluation doc, so its eval report says why no promotion gate ran.

### Accepted reports and the nightly run
{: #accepted-reports-and-the-nightly-run }

Each agent commits its **accepted eval report** (`evals/accepted.json`) when a reviewed change moves its
scores, and every later run compares itself with it
([ADR-0039](/posts/projects/platform-wardens/architecture-decision-records/#adr-0039)); the console's
inspector shows those scores beside the thresholds. None of the six agents has committed one yet,
which is on the same list as the labels. The eval gate in `agent-ci` fails on a safety
failure, a regression against the accepted report of the same model family, or a failed threshold in a
recorded run.

Every night `evals-nightly.yaml` in platform-wardens checks out each agent repository listed in the
registry at `main`, verifies the wheel it pins and runs its own eval set against the live model
([ADR-0046](/posts/projects/platform-wardens/architecture-decision-records/#adr-0046)); the gauges go to
Mimir, where the eval alerts read them. It also reads people's Right and Wrong verdicts on production
runs through a read-only console endpoint, with a GitHub OIDC token instead of a database password
([ADR-0044](/posts/projects/platform-wardens/architecture-decision-records/#adr-0044)). Unlabelled and
unconfirmed cases print a warning in the summary; they never change a score.

The first live nightly over the agent repositories (2026-11-20) passed four agents and failed two, the
same two as the last monorepo nightly, so not a regression of the move. Both failures are about the
cases, not the agents: ten of drift's cases pin a shared module under an anonymised org name no token can
clone, and Stack Author's scripted turns carry a placeholder where the person's message should be.

> **TODO:** Repin or drop drift's ten unclonable cases, and give Stack Author live or recorded-only
> cases, so the nightly result means something for both.
{: .prompt-warning }

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
- **Hand-offs are not acts.** An eval caught the framework counting drift's hand-off for approval as an
  act with no grant, which failed its safety gate; a hand-off now passes safety only when it names a
  level 2 catalog entry bound to a granted act tool, from a task at level 2, and any other hand-off is a
  safety failure (`wardens` 0.9.1).
- A red-team exercise before the first L2 action, in the target plan; drift's waiver went ahead without
  one (see [Security testing and incident response](/posts/projects/platform-wardens/06-security-and-privacy/#security-testing-and-incident-response)).

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
| Routing cases | 44 hand-labelled requests, in `wardens-deploy` |
| Fixtures | Recorded API responses and logs, with secrets and identifiers scrubbed |

The test environment is the developer's machine with a local Temporal; there's no shared test cluster
(see [Infrastructure](/posts/projects/platform-wardens/11-infrastructure-and-environments/#test-or-qa-environment)).
Agent tests and evals read frozen copies of the deploy config and of the registry entries they depend on
(drift keeps the Change Correlator's published entry, byte for byte, to run the handoff contract check
on the pair), so an agent repository tests without a `wardens-deploy` checkout.

## Checklist
{: #checklist }

- [ ] Every package's tests pass with `uv sync --frozen` in CI
- [ ] No test calls a live model
- [ ] Every action has at least 30 owner-confirmed eval cases before G3
- [ ] Every agent has a green nightly result, and a committed accepted report
- [ ] Recorded workflow histories are replayed before a workflow change merges
- [ ] Every denial test has its allowed twin
- [ ] The bus load test has run and its result is recorded
- [ ] Shadow-run scores are recorded for every run

{% include project-nav.html %}
