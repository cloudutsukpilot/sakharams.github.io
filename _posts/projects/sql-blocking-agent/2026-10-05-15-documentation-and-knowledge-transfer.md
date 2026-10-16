---
layout: post
title: "SQL Blocking Agent: Documentation and Knowledge Transfer"
date: 2026-10-05 00:15:00 +0530
categories: [projects, sql-blocking-agent]
tags: [Projects, SQL Blocking Agent, Documentation]
description: "SQL Blocking Agent docs: 44,000 words in TechDocs, from architecture to troubleshooting, what's current, what's drifted, and how to onboard DBAs and engineers."
project: sql-blocking-agent
project_step: 15
image:
  path: /assets/img/projects/sql-blocking-agent/15-documentation-and-knowledge-transfer.webp
  alt: "SQL Blocking Agent: Documentation and Knowledge Transfer - Projects hero image"
---

The SQL Blocking Agent has about 44,000 words of documentation for a codebase you can read in an
afternoon. That ratio is deliberate: as the platform org's first agentic AI project, the docs are also
the playbook for the next one. The risk is the usual one for a fast-moving repo: some pages describe the
system as it was two migrations ago.

<!-- more -->

{% include project-nav.html %}

## Product documentation
{: #product-documentation }

The docs are MkDocs (TechDocs) in `sql-blocking-agent/docs/`, published to Backstage by `techdocs.yml`,
with the component registered in `catalog-info.yaml`. The navigation has five pages; the folder holds
more:

| Document | Purpose | State |
|---|---|---|
| `index.md` | What it is, safety model, where to start | Current |
| `ARCHITECTURE.md` | Implemented runtime, control flow, safety, data, reports | Current (describes the implementation only, by design) |
| `END_TO_END_PROCESS.md` | One cycle step by step, loop and Temporal | Mostly current; sections 2 and 3 have pasted fragments to clean up |
| `ENGINEER_GUIDE.md` | Setup and daily development | Large; check against current config |
| `ENGINEER_ONBOARDING_GUIDE.md` | Repository tour, file by file | Large and detailed |
| `DEPLOYMENT_MIGRATION.md` | Container Apps path, PostgreSQL, Key Vault, App Insights, Temporal | Partly superseded by AKS + Helm |
| `HELM_CHARTS.md` | Design record for the AKS chart | Current; several open items |
| `TROUBLESHOOTING.md` | Symptom-based runbook | Current; test numbers outdated |
| `WHY_PYDANTIC_AI.md` | Framework decision | Current |
| `DURABLE_AGENT.md`, `TEMPORAL_INTEGRATION_*.md` | Temporal design and implementation | Current for the optional mode |
| `live_run_analysis_20260710_second.md` | Evidence from a live kill | Historical record |

The two `.docx` files in the folder don't belong in TechDocs; one (`Governance_Rules_R1_R12.docx`) is a
truncated file that won't open.

## User guides
{: #user-guides }

The DBA is the user who has no guide yet. Everything for them is spread across engineer-facing pages.
A two-page **DBA guide** would cover: what the email and report mean, how to approve and deny
(`approve.py list | show | approve | deny`), what each decision and rule means, how to add a protected
login or an exclusion window, and how to change a server's thresholds.

## API documentation
{: #api-documentation }

The approval API is documented in the router's module docstring (endpoints, CLI examples, `curl` usage),
and FastAPI generates an OpenAPI page for free. The Platform One report contract is documented precisely
in ARCHITECTURE.md. The LLM "APIs", the three output schemas, are documented only in code; a table of
their fields in ARCHITECTURE.md would help reviewers of prompt changes.

## Architecture documentation
{: #architecture-documentation }

ARCHITECTURE.md and END_TO_END_PROCESS.md each carry a Mermaid flowchart of the cycle. The animated
version in [Technical Architecture](/posts/projects/sql-blocking-agent/05-technical-architecture/#system-context-and-component-architecture)
and the gate ladder in [Security and Privacy](/posts/projects/sql-blocking-agent/06-security-and-privacy/#threat-modeling)
follow the same flow. The missing piece is ADRs: the decisions are recorded inside long documents
(`WHY_PYDANTIC_AI.md`, the Helm design record) rather than as short, numbered records.

## Deployment instructions
{: #deployment-instructions }

There are two deployment stories in the docs: Azure Container Apps in DEPLOYMENT_MIGRATION.md (the
earlier recommended path) and AKS + Helm + Argo CD in HELM_CHARTS.md (what production runs). I'd add a
short note at the top of DEPLOYMENT_MIGRATION.md pointing to the AKS path as current, and keep the
Container Apps content as an alternative. The guide also still refers to `servers.json`, which no longer
exists: `TargetServers` is the only server list.

## Operations runbooks
{: #operations-runbooks }

TROUBLESHOOTING.md is a good runbook: it starts with "triage in 60 seconds" and "filter by one session",
then goes symptom by symptom with diagnostic queries. Additions are listed in
[Operations](/posts/projects/sql-blocking-agent/14-operations-and-observability/#operational-runbooks):
the kill switch and the post-kill review.

## Troubleshooting guides
{: #troubleshooting-guides }

The most useful sections are "It never kills" and "It kills too aggressively", which map symptoms to
gates and thresholds, and the kill-validation reference (`CONFIRMED_GONE`, `ROLLING_BACK`,
`STILL_PRESENT`, chain cleared or not). One correction needed: section 11 still says 65 tests pass and 4
fail, which predates the current 240-test suite.

## Support procedures
{: #support-procedures }

| Question | Who answers |
|---|---|
| "Why did the agent decide X?" | Database team, from the report and audit rows |
| "The agent didn't report a blocking incident" | DevOps, starting from the server's last cycle |
| "Please protect this login / pause during maintenance" | Database team, via `ProtectedLogins` or `ExclusionWindows` |
| "Add a server" | DevOps and database team, a `TargetServers` row |

> **TODO:** Where do people raise questions or requests about the agent: a Jira queue, a Teams channel,
> or directly with the DevOps team?
{: .prompt-warning }

## Onboarding documentation
{: #onboarding-documentation }

The Engineer Onboarding Guide is a thorough repository tour (over 10,000 words, with a file-by-file
table). For a new engineer, I'd recommend this order instead of reading it top to bottom: `index.md`,
`WHY_PYDANTIC_AI.md` (the reasoning), ARCHITECTURE.md (the system), then run the local loop and watch one
blocking incident end to end, then the onboarding guide as a reference.

## Training materials
{: #training-materials }

Because this is the org's first agentic AI project, it's worth a short internal talk built from these
docs: why three narrow LLM calls instead of an autonomous agent, why gates live in code, how human
approval works, and what the live run showed. For DBAs, a 30-minute walkthrough of a real (dry-run)
report and the approval CLI is the training that matters.

## Checklist
{: #checklist }

- [ ] A DBA guide exists (reading reports, approving, protected logins, exclusion windows)
- [ ] DEPLOYMENT_MIGRATION.md points to AKS as current and drops `servers.json`
- [ ] Troubleshooting test numbers are updated
- [ ] END_TO_END_PROCESS sections 2 and 3 are cleaned up
- [ ] `.docx` files are replaced with Markdown (rules R1 to R13)
- [ ] ADRs are extracted from the long design documents
- [ ] An internal talk on the agent's design is given

{% include project-nav.html %}
