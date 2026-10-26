---
layout: post
title: "Job Hunter Agent: Documentation and Knowledge Transfer"
date: 2026-10-22 00:15:00 +0530
categories: [projects, job-hunter-agent]
tags: [Projects, Job Hunter Agent, Documentation]
description: "Where Job Hunter Agent's knowledge lives: the README, docs folder, manifest comments, in-app text and this playbook, and what each is for."
project: job-hunter-agent
project_step: 15
image:
  path: /assets/img/projects/job-hunter-agent/15-documentation-and-knowledge-transfer.webp
  alt: "Job Hunter Agent: Documentation and Knowledge Transfer - Projects hero image"
---

Documentation for a tool only I use sounds optional until the LinkedIn session expires three months from
now and I have to remember how the in-cluster sign-in works. Most of Job Hunter Agent's docs are written
for that future me, at the moment I'd need them.

<!-- more -->

{% include project-nav.html %}

## Product documentation
{: #product-documentation }

The README opens with what the tool does and what it never does (submit, connect, message), then the
features, the quick start and the configuration. The [Vision](/posts/projects/job-hunter-agent/01-vision-and-business-context/)
and [Requirements](/posts/projects/job-hunter-agent/02-requirements-gathering/) posts here are the longer
product story.

## User guides
{: #user-guides }

The UI carries most of the user guide, by design: each section has a one-line explanation (what the
schedule does, how Evaluate picks its resume, why drafts keep their resume text), empty states say what to
do next, and warnings explain how to resolve them. The README's "In the UI" paragraph walks the full flow
from profile to "I applied". For mode choices there's an explanation in plain words:
keyword weaves in missing keywords, skills only reorders the skills section, experience rephrases bullets.

## API documentation
{: #api-documentation }

FastAPI generates OpenAPI from the Pydantic models, served at `/docs` (behind sign-in). The README has a
table of the main calls. Docstrings on the route functions become the descriptions, so they're written for
a reader: "Score and draft this job now with its profile's resume, mode and tone; re-evaluating replaces
the drafts and puts it back in the review queue."

## Architecture documentation
{: #architecture-documentation }

`docs/architecture.md` in the repo (pipeline steps, agents, data model, LinkedIn integration) and
[Technical Architecture](/posts/projects/job-hunter-agent/05-technical-architecture/) here, with the
animated system diagram. Manifests in homelab-gitops start with a comment block explaining the pod's shape
and why: loopback-only sidecar, single writer, `Recreate`.

## Deployment instructions
{: #deployment-instructions }

`homelab-gitops/apps/job-hunter/README.md`: files, order of setup (Keycloak client, secrets, schema,
image, LinkedIn sign-in), operating notes. `infra-local/host/job-hunter/configure.sh` documents its own
flags in its header. The release path is in [CI/CD](/posts/projects/job-hunter-agent/12-cicd-and-release-management/).

## Operations runbooks
{: #operations-runbooks }

The runbook table in [Operations](/posts/projects/job-hunter-agent/14-operations-and-observability/#operational-runbooks)
covers the situations that have actually happened. The LinkedIn sign-in, the most fiddly one, is in both
the gitops README and the [deployment runbook](/posts/projects/job-hunter-agent/13-deployment-and-go-live/#deployment-runbook).

## Troubleshooting guides
{: #troubleshooting-guides }

Symptoms I'd search for, with the cause:

| Symptom | Likely cause |
|---|---|
| `LinkedInError: MCPError: SSE stream ended without a response` | The sidecar's Chromium was OOMKilled mid-call |
| Redirect loop or HTTP 429 from LinkedIn | A copied session, or too much traffic |
| `Could not find the table 'public.runs'` | A migration not applied in Supabase |
| Company facts empty for a big company | Wikidata didn't match the website, or refused the request |
| A warning about a capitalised word | A common word the check doesn't know; add it to the common-words list with a test |

## Support procedures
{: #support-procedures }

There's no support desk. The procedure is: check the run history and Slack message, then `/healthz`, then
pod status and logs, then the runbook. Anything new becomes a runbook row and, if it cost real time, a
lesson.

## Onboarding documentation
{: #onboarding-documentation }

For a future contributor (or me on a new laptop): the README's quick start gets to a working UI with only
an LLM key; `docs/testing.md` explains the fakes; the Makefile's `help` target lists every task. This
playbook is the "why" tour.

## Training materials
{: #training-materials }

Not needed for one user. If the tool were shared, a two-minute screen recording of the review flow would
do more than a manual: open the queue, read the skills table, resolve a warning, approve, apply.

## Checklist
{: #checklist }

- [ ] README's API and configuration tables match the code
- [ ] Every runbook row tried once
- [ ] Troubleshooting table updated with each new error message
- [ ] Manifest header comments current after each change
- [ ] Playbook posts updated in the same change as the code

{% include project-nav.html %}
