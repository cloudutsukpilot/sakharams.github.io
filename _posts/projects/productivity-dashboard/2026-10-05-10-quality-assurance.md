---
layout: post
title: "Productivity Dashboard: Quality Assurance"
date: 2026-10-05 00:10:00 +0530
categories: [projects, productivity-dashboard]
tags: [Projects, Productivity Dashboard, Testing, QA]
description: "Testing an AI summary pipeline: unit tests for collection and paths, fact checks on generated text, prompt regression sets, model-version checks and people reviewing their own summaries."
project: productivity-dashboard
project_step: 10
image:
  path: /assets/img/projects/productivity-dashboard/10-quality-assurance.webp
  alt: "Productivity Dashboard: Quality Assurance - Projects hero image"
---

Testing the Productivity Dashboard means testing two very different things. The collectors, paths and
API are ordinary code with ordinary tests. The summaries are written by a language model, and their
failure mode isn't a crash, it's a confident sentence about work someone didn't do. The brief describes
accuracy as an ongoing process of tuning prompts and models. This post is about making that process
measurable.

<!-- more -->

{% include project-nav.html %}

## Unit testing
{: #unit-testing }

Each component has a `tests/` folder; the UI backend tests its configuration loading. The units that
deserve the most tests are the deterministic ones that summaries depend on:

- identity parsing from the `department_*` / `team_*_*` / `name_*_*_*` variables;
- `path_utils` for users, teams, PODs, dates and ISO weeks;
- aggregation of daily data into weekly and monthly inputs;
- POD filtering by Jira label;
- branch-name to story-key linking.

```python
def test_pod_filter_keeps_only_labelled_issues():
    issues = [{"key": "PROJ-1", "labels": ["POD-X"]}, {"key": "PROJ-2", "labels": []}]
    assert [i["key"] for i in filter_by_label(issues, "POD-X")] == ["PROJ-1"]
```

> **TODO:** What is unit test coverage per component? The frontend has no test files yet.
{: .prompt-warning }

## Integration testing
{: #integration-testing }

The repo's testing guide defines three layers, and they fit this project well:

| Layer | What it proves |
|---|---|
| Local Python | Collectors against real GitHub and Jira; generators against LM Studio |
| k3d | Images, charts, `configYaml`, secrets, mounts, RBAC for refresh Jobs, schedules |
| AKS | ExternalSecrets, ArgoCD, Azure Files and Azure OpenAI on the real path |

Running generators against a local model in the first two layers keeps integration testing free; the
third layer is where Azure OpenAI's own behaviour gets checked.

## Contract testing
{: #contract-testing }

The contracts are file shapes: `github.json`, `jira.json` and the summary layout. Shared Pydantic models
(or JSON Schemas), validated by the collectors' tests on write and the generators' tests on read, catch a
renamed field before a generator silently summarizes an empty list. The UI's `models.py` already defines
response models; the same idea extends to the files.

## End-to-end testing
{: #end-to-end-testing }

In k3d, against a sandbox Jira project and a test GitHub org, with LM Studio as the provider:

1. Run the GitHub and Jira collectors for two synthetic people.
2. Run the user generator, then the team generator.
3. Open the user and team pages, then press Refresh and wait for the Job to complete.

Wrapped as one `task`, this proves the whole chain, including the RBAC that lets the UI create Jobs.

## Regression testing
{: #regression-testing }

For AI output, regression testing compares **properties**, not text, since two runs never produce the
same words. Keep a fixed set of collector files (a "golden week" for a few synthetic people) and, for
every prompt or model change, check:

| Property | Check |
|---|---|
| Grounding | Every PR number and Jira key in the summary exists in the input |
| Coverage | Every merged PR and closed ticket in the input is mentioned |
| Format | Required sections present (Key Accomplishments, Code Contributions, Jira Activity) |
| No filler | None of the phrases the prompt forbids ("worked on Jira tickets", …) |
| No-activity day | Says so, and invents nothing |

Grounding and coverage are scriptable with a regex for keys. Together they catch most errors that would
matter in a review.

## Performance and load testing
{: #performance-and-load-testing }

The performance limit is the AI deployment's tokens-per-minute quota, not CPU. The test that matters
is: with all configured people, does the user generator finish inside its window (04:00 to 05:00 UTC)
at the current `MAX_PARALLEL_USERS`? Measure run time and peak tokens per minute, and rerun the test
whenever a team is onboarded. For the UI, a short load test on search shows when file scanning needs an
index.

> **TODO:** How long do the user and team generators take today, for how many people?
{: .prompt-warning }

## Security testing
{: #security-testing }

SonarQube and CodeQL in CI, plus project-specific tests: path traversal on name parameters, unknown
targets on `/api/refresh`, Markdown with raw HTML in a summary (it must not render as HTML), and a
prompt-injection line in a test Jira description that the summary must not obey. Details in
[Security and Privacy](/posts/projects/productivity-dashboard/06-security-and-privacy/#security-testing-and-incident-response).

## Accessibility testing
{: #accessibility-testing }

Automated axe or Lighthouse checks against the built Vite app, plus a manual pass on the summary page:
heading order in rendered Markdown, keyboard access to tabs and the table of contents, and announcement
of refresh progress.

## Compatibility testing
{: #compatibility-testing }

The compatibility risk specific to this project is **model versions**. When an Azure OpenAI deployment
moves to a new model version, every summary changes style, and sometimes accuracy. Treat a model change
like a dependency upgrade: run the golden-week regression set on old and new models and compare
before switching the deployment. The same applies to the Jira and GitHub APIs (field changes), checked
by the contract tests.

## User acceptance testing
{: #user-acceptance-testing }

The best testers are the people being summarized. They can see their own summaries, so they're the
first to notice something wrong. Turn that into a process:

- a "flag this summary" action on a person's own page;
- a monthly sample where a few people rate their summaries for accuracy and completeness;
- a manager check that team summaries match what they know happened.

The results become the accuracy KPI, and the input for the next round of prompt and model tuning.

> **TODO:** How is accuracy checked today during the ongoing tuning: spot checks by the team, feedback
> from people, or something else? And what have been the most common errors?
{: .prompt-warning }

## Test data and test environment management
{: #test-data-and-test-environment-management }

- Synthetic people in a sandbox Jira project and test GitHub org; never real colleagues' data in test
  fixtures.
- A frozen "golden week" of collector files for regression tests, versioned in the repo.
- LM Studio locally; a non-production Azure OpenAI deployment for model comparisons.
- Separate data paths per environment; k3d data never copied from production.

## Checklist
{: #checklist }

- [ ] Unit tests for identity, paths, aggregation, POD filters and branch linking
- [ ] Frontend tests started
- [ ] File contracts validated on write and read
- [ ] End-to-end task in k3d with LM Studio
- [ ] Golden-week regression set with grounding, coverage and format checks
- [ ] Model version changes go through the regression set first
- [ ] "Flag this summary" and a monthly accuracy sample in place
- [ ] Test fixtures use synthetic people only

{% include project-nav.html %}
