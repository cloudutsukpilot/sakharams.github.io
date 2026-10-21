---
layout: post
title: "State of DevOps: Quality Assurance"
date: 2026-10-05 00:10:00 +0530
categories: [projects, state-of-devops]
tags: [Projects, State of DevOps, Testing, QA]
description: "Testing State of DevOps: a local Python, k3d and AKS ladder, dry-run mode, fixture repos for every check, and file contracts between jobs and the dashboard."
project: state-of-devops
project_step: 10
image:
  path: /assets/img/projects/state-of-devops/10-quality-assurance.webp
  alt: "State of DevOps: Quality Assurance - Projects hero image"
---

For most software a bug means something breaks. For State of DevOps a bug usually means a **wrong
number**, and nothing breaks at all. The dashboard renders, the chart looks fine, and an executive
could conclude that CODEOWNERS coverage dropped overnight when only a parser changed. So the test strategy for this project is less
about "does it run" and more about "can we trust what it says".

<!-- more -->

{% include project-nav.html %}

## Unit testing
{: #unit-testing }

Every component has a `tests/` folder (the repo analyzer has `test_main.py`, the shared clients in
`cronjobs/common/` have their own, and the dashboard backend tests its config), and CI points
SonarQube at those tests per component.

The unit tests worth having in this codebase are the ones around **decisions**:

- each sub-analyzer's pass/fail logic against small hand-written repo payloads;
- date-folder path building, including UTC day boundaries and ISO weeks;
- the stale-repo threshold and exemption wildcards;
- `GitHubAppTokenManager` refreshing tokens before the 5-minute expiry buffer.

```python
def test_repo_without_codeowners_fails():
    client = FakeGitHub(files={"README.md"})
    result = CodeownersAnalyzer(client, config={}).analyze("org-a", {"name": "svc-x"})
    assert result["has_codeowners"] is False
```

> **TODO:** What is unit test coverage per component today? The frontend has no test files yet, so
> `react-scripts test` currently has nothing to run.
{: .prompt-warning }

## Integration testing
{: #integration-testing }

The project already has a well-defined integration ladder in its testing docs, and it's the right one:

| Layer | Answers | Speed |
|---|---|---|
| **1. Local Python** | Does the logic work against the real GitHub, Jira or JFrog APIs? | Seconds |
| **2. Local k3d** | Do the image, Helm chart, `configYaml`, secrets, mounts, RBAC and schedule work? | Minutes |
| **3. AKS** | Does the real path (ExternalSecrets, ArgoCD, Azure Files) work? | Slower |

The rule is to pick the lowest layer that answers your question. Layer 1 runs `src/main.py` directly
with `PYTHONPATH` pointing at `cronjobs/common/` and, crucially, with **dry-run** turned on in
`config.yaml`, so Jira and Teams side effects are logged instead of sent.

## Contract testing
{: #contract-testing }

The contracts in this system are files, so contract tests check files. For every folder a job writes,
a JSON Schema (or a Pydantic model shared between writer and readers) describes the shape:

```python
# Shared model, imported by the analyzer (writer) and the dashboard backend (reader)
class CodeownersResult(BaseModel):
    repo: str
    has_codeowners: bool
    path: str | None = None
```

The analyzer's tests validate what it writes against the model; the backend's tests load a sample file
through the same model. A renamed field then fails a test in CI instead of blanking a column in
production. The Jira create-story endpoint deserves one contract test against Jira's API shape too.

## End-to-end testing
{: #end-to-end-testing }

The end-to-end path is: collector → analyzer → aggregators → dashboard. In k3d it can be run on demand
instead of on the schedule:

```bash
task state-of-devops-deploy-local
kubectl create job --from=cronjob/github-data-collector e2e-collect -n cronjobs
kubectl create job --from=cronjob/devops-repo-analyzer  e2e-repo    -n cronjobs
kubectl create job --from=cronjob/devops-summary-generator e2e-sum  -n cronjobs
curl -s http://127.0.0.1:8000/api/home-overview | jq '.generated_at'
```

Against a small test org with known gaps, this is the one test that proves the whole chain. It's worth
wrapping as a `task e2e-state-of-devops` so it's one command, in keeping with the "everything is a task"
rule.

## Regression testing
{: #regression-testing }

The regression that matters is **a number changing when nothing in GitHub changed**. A golden-file test
catches it: keep a frozen snapshot of collector output for a test org, run every analyzer against it,
and compare the results with stored expected outputs. Any diff is either an intended rule change (update
the golden files in the same PR, and announce the change) or a regression.

## Performance and load testing
{: #performance-and-load-testing }

Two very different performance questions:

- **Jobs:** do all daily jobs finish inside their window (02:00 to 07:00 UTC) as orgs and repos grow?
  Track run duration per job and alert when one takes more than half its slot.
- **Dashboard:** does it stay fast with many users? Home reads one file, so load is mostly the analysis
  tabs. A short k6 or Locust run against `/api/organizations/{org}/repositories` with a cold and a
  warm Redis cache gives the numbers needed to size the
  [autoscaling](/posts/projects/state-of-devops/14-operations-and-observability/#capacity-and-cost-monitoring)
  settings.

> **TODO:** How long does each daily job take today, and how many concurrent dashboard users are
> typical (for example around an executive review)?
{: .prompt-warning }

## Security testing
{: #security-testing }

CI runs SonarQube per component and CodeQL on changes plus a weekly full scan. On top of that, the
security tests specific to this app are:

- path traversal attempts on every `{org}` and `{repo}` path parameter (`..%2F..%2F`, absolute paths);
- calling `POST /api/jira/create-story` without the required group membership once SSO is in place;
- confirming no secret values or file contents appear anywhere under `/data` (a grep in the e2e test);
- the JFrog Xray image scan that every CI build already runs, with an agreed severity threshold.

## Accessibility testing
{: #accessibility-testing }

An automated axe or Lighthouse accessibility run against the built React app in CI catches the basics
(contrast, labels, keyboard focus). Charts need a manual check: can the trend be read without colour,
and is there a table view? Details are in
[User Experience and Design](/posts/projects/state-of-devops/04-user-experience-and-design/#accessibility-design).

## Compatibility testing
{: #compatibility-testing }

The audience uses managed corporate laptops, so the browser matrix is short: current Edge and Chrome.
The compatibility that actually breaks things here is on the API side:

- GitHub API changes (deprecated fields, new rate-limit headers): pin API versions where GitHub
  supports it (`X-GitHub-Api-Version`).
- Python base image upgrades (3.11 to 3.12): run the golden-file regression suite on both.
- Kubernetes upgrades on AKS: CronJob API and Helm chart compatibility, checked in k3d first.

## User acceptance testing
{: #user-acceptance-testing }

For a measurement tool, user acceptance means a **domain owner agrees the numbers are right**. Before a
new analyzer's tab is switched on through `/api/sidebar-config`, someone who knows that domain (security
for GHAS, finance or the platform owner for cost) checks five repos or line items against the source
system and signs off.

> **TODO:** Who signs off new analyzers today, and was there a UAT step before the cost or GHAS tabs
> went live?
{: .prompt-warning }

## Test data and test environment management
{: #test-data-and-test-environment-management }

- **Test org:** a small GitHub organization (or a set of repos) with deliberate gaps: no CODEOWNERS,
  no branch protection, an archived repo, a stale repo, a fork. Every check has a repo that fails it.
- **Golden snapshots:** frozen collector output for that org, versioned in the repo.
- **Environments:** local Python, then k3d (`values-local.yaml`), then AKS, as in the ladder above.
- **Secrets:** a git-ignored `.env` per cronjob for layer 1; never real production tokens in tests.

## Checklist
{: #checklist }

- [ ] Unit tests for every sub-analyzer's pass/fail logic
- [ ] Frontend tests started (at least the API client and the Jira modal)
- [ ] Dry-run on by default for local runs
- [ ] Shared models validate every file contract on both sides
- [ ] `task e2e-state-of-devops` runs the whole chain against a test org
- [ ] Golden-file regression suite in CI
- [ ] Job durations tracked against their schedule windows
- [ ] Domain owner sign-off before any new tab is switched on

{% include project-nav.html %}
