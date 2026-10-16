---
layout: post
title: "OnePlatform: Documentation and Knowledge Transfer"
date: 2026-10-05 00:15:00 +0530
categories: [projects, oneplatform]
tags: [Projects, OnePlatform, Documentation]
description: "How OnePlatform documents itself: TechDocs in the portal, C4 diagrams plus a machine-readable architecture model for humans and AI, per-feature docs and tiered onboarding."
project: oneplatform
project_step: 15
image:
  path: /assets/img/projects/oneplatform/15-documentation-and-knowledge-transfer.webp
  alt: "OnePlatform: Documentation and Knowledge Transfer - Projects hero image"
---

OnePlatform's documentation has two readers: people, and the AI assistant that writes much of the code. Writing for the second one forced a discipline that helps the first. Routing tables answer "where does this change go?", a machine-readable model lists every node and edge, and docs are updated in the same PR as the code. This post maps what exists and where.

<!-- more -->

{% include project-nav.html %}

## Product documentation
{: #product-documentation }

The product documentation is the portal itself plus TechDocs. Each template carries its own instructions (what happens, how long, who approves) in an expandable panel, and each dashboard starts with a header explaining what it shows. TechDocs, built externally and published to storage, holds longer guides for teams whose repos publish docs, including the middleware's.

> **TODO:** Is there a "What is OnePlatform" landing doc for new employees (not contributors), listing what they can do on day one by role? If not, it's the most useful page to write next, and the feature catalog is its outline.
{: .prompt-warning }

## User guides
{: #user-guides }

User guidance lives as close to the action as possible:

- **In-template instructions** for every self-service template.
- **A five-step guided tour** on the service map, the densest page in the portal.
- **Approval guidance** on the Copilot license page for each approver role (Finance, DevOps, cost-centre owner).
- **TechDocs guides** for teams integrating with the platform, such as the notifications API guide for CI pipelines and monitoring tools.

I prefer this to a separate user manual, which goes stale the first time a form changes.

## API documentation
{: #api-documentation }

- **Internal portal APIs:** documented through typed API client interfaces and, per feature, in ARCHITECTURE.md with routes and payloads.
- **Middleware API:** feature docs list every endpoint with method, path and purpose; published as TechDocs.
- **Integration contracts:** the HITL contract v1 and the notifications API guide include full request and response examples.
- **Other teams' APIs:** the portal's API Explorer shows API entities from the catalog. For one partner API, an automated workflow pulls fresh OpenAPI definitions from each environment and opens a PR when they change, so the catalog's API docs don't drift.

## Architecture documentation
{: #architecture-documentation }

The portal's architecture docs are layered:

| Layer | Purpose | Loaded by |
|---|---|---|
| Routing skill | "Where do I go for this change?" tables for plugins, routes, permissions, templates | AI assistant, automatically |
| Focused diagrams | C4 L1 to L3, plugin dependency graph, RBAC, scaffolder flows, PHI and monitoring | Humans; AI on request |
| Machine-readable model | Node and edge registry, RBAC YAML, action taxonomy, route map, change-impact rules | AI before structural changes |
| Per-feature ARCHITECTURE.md | One feature's components, APIs, data and flows | Anyone touching that feature |
| Deep references | PHI filtering framework, service map architecture | Specialists |

The change-impact rules are the part I'd copy into any portal. "Modify a backend plugin's router → affects all frontend plugins consuming that API, permission checks and the API contract → run affected frontend tests, check permission mappings." Reviewers use them as a checklist too.

## Deployment instructions
{: #deployment-instructions }

A deployment process doc walks through development, staging and production releases with exact workflow names, inputs and the image reference format. It also has a table of which input builds which revision. The middleware has equivalent docs for migrations (per context, with both connection-string and App Configuration options). Both are summarized in this playbook's [go-live runbook](/posts/projects/oneplatform/13-deployment-and-go-live/#deployment-runbook).

## Operations runbooks
{: #operations-runbooks }

This is the thinnest layer. Operational knowledge exists, spread across feature docs: the FinOps integrity and recovery rules, the local-dev optimization notes, the PHI rule change procedure. It isn't collected into runbooks. The table in [Operations](/posts/projects/oneplatform/14-operations-and-observability/#operational-runbooks) is a first cut that should move into `docs/runbooks/`.

## Troubleshooting guides
{: #troubleshooting-guides }

What exists: setup troubleshooting in the getting-started and Dev Container guides; a scripts inventory documenting every repository script and what it's for; FinOps recovery behaviour ("when costs are complete but tags are not, the next run repairs tags"). What's missing: a portal-user troubleshooting page ("my template failed: what now?").

## Support procedures
{: #support-procedures }

Covered in [Support and Maintenance](/posts/projects/oneplatform/16-support-and-maintenance/#support-model-and-ownership). From a documentation angle, every template should link to where to ask for help, and every failure notification should include it.

> **TODO:** Where should users go for help (Teams channel, service desk category)? Once known, add it to the common template instructions and the failure notification text.
{: .prompt-warning }

## Onboarding documentation
{: #onboarding-documentation }

The onboarding guide is tiered so nobody reads everything up front:

| Tier | When | Reads |
|---|---|---|
| 0 | Day 1 | README, one setup path, local Key Vault secrets, PostgreSQL (WSL only), `dev` vs `dev:local` |
| 1 | Week 1 | Contributor instructions, architecture index, system overview diagrams; skim the model |
| 2 | Before the first change | Build-decision guide, one task-specific developer guide |
| 3 | Before the first PR | Unit, integration, E2E and Sonar testing docs |
| 4 | Only when needed | RBAC, scaffolder flows, PHI, license workflow reuse, feature history |

It names the build-decision guide as the single most important doc for a new contributor, because it stops redundant plugins before they start.

## Training materials
{: #training-materials }

> **TODO:** Are there training sessions or recordings for portal users (by role) or for new contributors? If there were demos when features launched, link them from the feature catalog entries.
{: .prompt-warning }

For contributors, the repository prompts are themselves training material: running `/feature-planner` on a small idea shows a new engineer the whole process in an afternoon.

## Checklist
{: #checklist }

- [ ] "What is OnePlatform" landing doc for users, by role
- [ ] Every template links to where to get help
- [ ] Runbooks collected in `docs/runbooks/` from feature docs
- [ ] User troubleshooting page for failed template runs
- [ ] Change-impact rules reviewed whenever a new plugin type appears
- [ ] Architecture docs updated in the same PR as structural changes
- [ ] Training or demo recordings linked from feature catalog entries

{% include project-nav.html %}
