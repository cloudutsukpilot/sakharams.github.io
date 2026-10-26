---
layout: post
title: "Job Hunter Agent: Implementation"
date: 2026-10-22 00:09:00 +0530
categories: [projects, job-hunter-agent]
tags: [Projects, Job Hunter Agent, Implementation]
description: "How Job Hunter Agent was built in two days and grown from real use: edit-based tailoring, deterministic checks, the MCP integration and the debt I know about."
project: job-hunter-agent
project_step: 9
image:
  path: /assets/img/projects/job-hunter-agent/09-implementation.webp
  alt: "Job Hunter Agent: Implementation - Projects hero image"
---

The first version of resume tailoring asked the model to rewrite my 28,000-character resume. It timed out
at 180 seconds, and when it did finish it had quietly "improved" a few facts. The rewrite into line edits
that code applies is the best summary of how this project was implemented: let the model suggest, let
deterministic code decide.

<!-- more -->

{% include project-nav.html %}

## Sprint or iteration planning
{: #sprint-or-iteration-planning }

No sprints. Two build days, then iterations of a few hours, each started by a concrete annoyance from
using the app (see [Prioritization approach](/posts/projects/job-hunter-agent/03-product-planning/#prioritization-approach)).
Each iteration ended with the change deployed and checked in the live app, so there was never a pile of
unreleased work. The phase tables in
[Product roadmap](/posts/projects/job-hunter-agent/03-product-planning/#product-roadmap) are the record.

## Feature development
{: #feature-development }

The features where the implementation choice mattered most:

| Feature | Implementation choice |
|---|---|
| Resume tailoring | The model returns `ResumeEdits` (original line, revised line, reason); `apply_edits` applies only edits whose original is a whole line or a unique substring of one. Anything else is skipped, so nothing new can be added |
| Truthfulness checks | Pure functions: numbers in the output not in the original; changes that don't quote the original; posting terms (tools, capitalised phrases with their acronym) the output adds that the resume lacks |
| Shortlist confidence | The same ATS scorer re-scores the *tailored* resume; an independent check rather than the optimizer grading itself |
| Job evaluation on demand | Scores and drafts whatever the score; replaces drafts and contacts on the same application; refuses approved or applied ones |
| Per-profile schedules | One APScheduler job per enabled profile, re-synced on every profile change; a lock serializes runs |
| Company facts | Parsed from LinkedIn's About page by label, Wikidata matched by website, Google News RSS; refreshed after a week |

```python
target = _norm(_PREFIX.sub("", change.original))
matches = [i for i, line in enumerate(lines) if _norm(_PREFIX.sub("", line)) == target]
if len(matches) == 1:
    i = matches[0]
    prefix = _PREFIX.match(lines[i]).group(1)                     # keep the bullet, swap the text
    lines[i] = prefix + _PREFIX.sub("", change.revised.strip())
```

## API and UI implementation
{: #api-and-ui-implementation }

The API is one router module with thin handlers: validate, call the pipeline, wrap long work in
`track(...)` so it appears in the run history. The UI is three static files. Two patterns carried most
of it:

- An `el(tag, attrs, ...children)` helper that builds DOM safely, so a posting's text can never become
  markup.
- Render functions per section (`skillsView`, `confidenceView`, `companyView`, `profileRow`) that take
  data and return elements; a reload is just calling them again.

## Database and infrastructure implementation
{: #database-and-infrastructure-implementation }

One `Repository` protocol (`insert`, `update`, `get`, `list`, `delete`) with two implementations: an
in-memory dict for development and tests, and Supabase through `supabase-py` wrapped in
`asyncio.to_thread`. The same tests run against both. Infrastructure is declarative in homelab-gitops:
the Deployment with its sidecar and init container, a PVC, the Ingress, a NetworkPolicy and an
ExternalSecret, all described in
[Hosting](/posts/projects/job-hunter-agent/05-technical-architecture/#hosting-and-deployment-model).

## Integration development
{: #integration-development }

The integrations each needed one hard-won fix:

- **MCP 2.x:** the client yields a 2-tuple and results use `is_error` / `structured_content`, unlike most
  examples. Wrapped once in `LinkedInClient`.
- **LinkedIn job pages:** the model sometimes misread the hiring company, so the header is parsed by
  position and the model is only a fallback. Company tools need the slug from the page's references,
  not the display name.
- **LinkedIn in Kubernetes:** the sign-in needed an explicit `--chrome-path`, a home folder owned by the
  browser's user on the volume, and a login run with `kubectl exec` inside the running container (a
  separate login pod fought Argo CD's sync).
- **Wikidata:** HTTP 403 until the User-Agent identified the tool and a contact URL.

## Technical debt tracking
{: #technical-debt-tracking }

Known debt, kept visible here rather than in a tracker:

| Debt | Cost of leaving it |
|---|---|
| Traces aren't exported in production (no OTLP endpoint set) | Slow runs are hard to break down |
| No pacing between LinkedIn requests inside a run | A burst of page loads per profile |
| `accept_warnings` isn't stored on the application | Can't tell later which approvals overrode flags |
| Re-scoring adds a second `job_scores` row; reads take the newest | Harmless now, confusing later |
| Single default user despite per-row `user_id` | Multi-user needs auth-to-RLS wiring |
| UI has no automated tests | Regressions caught by eye |

## Code reviews
{: #code-reviews }

Every diff was read before it was pushed, and three things got extra care: anything in
`truthfulness.py`, anything touching auth, and every SQL migration. The scanners in the build pipeline
(Semgrep, Bandit, Gitleaks, Trivy) are the second reviewer. A review rule I'd keep: a change to the
truthfulness checks needs a test built from a real draft that motivated it (the BYOK and "Mentions Own"
cases are both tests now).

## Developer documentation
{: #developer-documentation }

- `README.md`: what it does, quick start, API table, configuration, sign-in, LinkedIn setup.
- `docs/architecture.md`, `docs/testing.md`, `docs/plan.md`, `docs/evaluation.md`.
- Module docstrings that explain contracts, for example why `apply_edits` can't add lines.
- This playbook for the decisions and the reasons.

## Checklist
{: #checklist }

- [ ] Every feature in the table has a test that pins its rule
- [ ] Debt table reviewed when a phase starts
- [ ] OTLP endpoint configured so traces leave the pod
- [ ] Pacing between LinkedIn requests added
- [ ] `accept_warnings` stored with the approval
- [ ] README and docs updated in the same commit as the code

{% include project-nav.html %}
