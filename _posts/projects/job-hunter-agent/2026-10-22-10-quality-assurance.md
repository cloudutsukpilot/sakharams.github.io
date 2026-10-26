---
layout: post
title: "Job Hunter Agent: Quality Assurance"
date: 2026-10-22 00:10:00 +0530
categories: [projects, job-hunter-agent]
tags: [Projects, Job Hunter Agent, Testing, QA]
description: "How Job Hunter Agent is tested without calling LinkedIn or the model: fakes for every outside system, a Supabase integration test, regression tests built from real drafts."
project: job-hunter-agent
project_step: 10
image:
  path: /assets/img/projects/job-hunter-agent/10-quality-assurance.webp
  alt: "Job Hunter Agent: Quality Assurance - Projects hero image"
---

Testing an agent that calls a slow local model and a website that bans bots has one rule: the test suite
must never call either. Every outside system has a fake, the suite runs in about two seconds, and the real
model is exercised separately, on purpose, with a script and an evaluation.

<!-- more -->

{% include project-nav.html %}

## Unit testing
{: #unit-testing }

52 tests with pytest and FastAPI's `TestClient`, against the in-memory repository. The fakes in
`tests/conftest.py`:

| Fake | Stands in for | Can simulate |
|---|---|---|
| `FakeLLM` | LiteLLM | Any score, invented numbers, invented contacts |
| `FakeSource` | LinkedIn search | Fixed postings (duplicate, excluded, repost), a failing source |
| `FakeIntel` | LinkedIn company pages and people | A failing company page |
| `FakeFacts` | Wikidata and Google News | A failing Wikidata |

What they pin: the filters, every truthfulness rule, `apply_edits`, status transitions, profile rules
(unique names, valid cron), run recording (including a run that raises), scheduling one job per profile,
the Slack message text, and evaluate / re-evaluate.

```bash
make test        # ~2 s, no network
make lint
```

## Integration testing
{: #integration-testing }

`tests/test_supabase.py` runs the whole flow (profiles, resumes, discover, draft, review, run history)
against a real Supabase. CI starts a local Supabase in Docker, applies every migration and runs it, so a
migration that doesn't apply fails the build. Locally: `make supabase-start && make test-supabase`. It
skips cleanly without the environment.

## Contract testing
{: #contract-testing }

The contract that breaks is LinkedIn's, through the MCP server. `tests/test_linkedin.py` feeds recorded
payload shapes to the parsers: job IDs from search results, the job-page header, the company slug from
references, profile links from the people list. Three more tests start a small local MCP server and
check the real client against it: tools are listed, account actions are refused, and known job IDs are
skipped before any detail call. When the MCP server or LinkedIn changes shape, these fail first. The LLM's contract is the Pydantic schema; a reply that doesn't fit is retried once, then fails
that job.

## End-to-end testing
{: #end-to-end-testing }

Two kinds, both manual on purpose:

- `make smoke`: sample jobs through the real local model and the real API, printing the review.
- Live checks after each deploy: discovery capped at 2 postings with an in-memory store (nothing saved),
  the Keycloak round trip in a browser, a Slack test message.

Automating end-to-end against LinkedIn would mean automated LinkedIn traffic in CI, which is exactly what
the volume rules forbid.

## Regression testing
{: #regression-testing }

Every bug from real use became a test with the real shape of the failure:

- The model added OpenTelemetry and Backstage to a skills line → posting-term check test.
- "Mentions Bring / Own / Keys" for "Bring Your Own Key (BYOK)" → phrase-with-acronym test.
- A DOCX resume lost its tables (4.9k of 28k characters read). Fixed in the parser, but the upload
  test's DOCX has no table, so this one still lacks its regression test.
- Placeholders like "[Name]" in outreach notes → validator test.

## Performance and load testing
{: #performance-and-load-testing }

Load isn't the risk; latency per LLM call is. I measured instead of load-testing: a draft with a
28k-character resume finished well inside the 300 s timeout once tailoring returned edits, and a capped
live discovery of 2 postings took 23 s. A full scheduled run takes minutes per profile, unattended.

## Security testing
{: #security-testing }

Auth tests cover 401 for API calls without a session, the browser redirect, refusal for users outside
`platform-admins`, and open-redirect protection on `next`. On every image build: Gitleaks, Semgrep,
Bandit, Trivy, Checkov, Conftest and Hadolint. No penetration test; the app is on a private tailnet.

## Accessibility testing
{: #accessibility-testing }

Manual only: keyboard through the tabs and forms, and the icon-plus-colour status check. No automated
tool (axe) yet; adding it to the headless screenshot step would be cheap.

## Compatibility testing
{: #compatibility-testing }

Each UI change was rendered in headless Chromium at 1300–1600 px and at 390 px, in light and dark
themes. Firefox and Safari weren't tested; the UI uses only standard DOM and CSS grid.

## User acceptance testing
{: #user-acceptance-testing }

I'm the only user, so acceptance is mine and it's ongoing: each feature was accepted in the live app with
real postings, and several were changed after acceptance (the skills chips became a table, the
applicant-count filter was removed). The evaluation over six real postings and three tailoring modes was
the formal acceptance of the drafting quality.

## Test data and test environment management
{: #test-data-and-test-environment-management }

- `examples/`: sample jobs, real public postings saved as JSON, and resumes (a generic one and my derived
  versions).
- The fakes generate everything else per test, in memory, so tests never share state.
- The local Supabase is reset with `make supabase-reset`; the integration test cleans its rows before and
  after.
- No production data is copied into tests.

## Checklist
{: #checklist }

- [ ] Suite stays under five seconds and offline
- [ ] Every real-world bug lands as a test with its real shape (DOCX tables still missing)
- [ ] Integration test green against a fresh Supabase on every PR
- [ ] Contract tests updated when the MCP server is upgraded
- [ ] Evaluation re-run after prompt or model changes
- [ ] axe check added to the screenshot step

{% include project-nav.html %}
