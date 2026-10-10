---
layout: post
title: "Dunderly HR System: Documentation and Knowledge Transfer"
date: 2026-10-07 00:15:00 +0530
categories: [projects, dunderly]
tags: [Projects, Dunderly, Documentation]
description: "Dunderly HR docs: task-based user guides, an architecture doc that grew out of the 2023 case study, payroll runbooks, and a handover plan for a team of four."
project: dunderly
project_step: 15
image:
  path: /assets/img/projects/dunderly/15-documentation-and-knowledge-transfer.webp
  alt: "Dunderly HR System: Documentation and Knowledge Transfer - Projects hero image"
---

The 2023 case study listed "Write Architecture Document" as step 6 and a cost estimate as its only content.
For a system that a team of four builds and maybe two people maintain afterwards, documentation isn't a
deliverable at the end; it's what lets the system survive the day one of those people moves on. The
question every doc here answers is: "If I'd never seen this before, could I do my job with this page?"

<!-- more -->

{% include project-nav.html %}

## Product documentation
{: #product-documentation }

A short product overview for anyone new to the system (HR, IT, auditors): what it does, who uses it, what
it deliberately doesn't do (payroll calculation, recruitment), and how it fits with the legacy payment
system. Two pages, with the [system diagram](/posts/projects/dunderly/05-technical-architecture/#system-context-and-component-architecture)
and the role table. It lives on the HR intranet page and in the repo as `docs/product.md`.

## User guides
{: #user-guides }

Task-based, one page per task, by role, with screenshots that are refreshed each release (Playwright takes
them during the E2E run, so they never go stale):

| Role | Guides |
|---|---|
| Everyone | Sign in; check your leave balance; request leave; view your documents |
| Manager | Approve leave; raise a salary change; withdraw a request |
| HR admin | Add an employee; upload a document; deactivate a leaver; set leave entitlements |
| HR manager | Approve or reject a salary request; approve a payroll run |
| Payroll operator | Prepare and review the monthly run; check delivery status |

Each guide starts with the outcome ("You'll have requested leave and your manager will be notified"), then
numbered steps, then "What if…" for the two or three common problems. In-app help links point to the
matching guide.

## API documentation
{: #api-documentation }

The OpenAPI document is generated from the code on every build, so it can't drift. Endpoints carry
summaries, examples and the roles that can call them. In dev, an interactive UI (Scalar) sits on top; in
test and prod the document is published but the UI isn't exposed.

The API has one consumer today (the Blazor app), so this is mostly for developers. It becomes important
the day another system wants HR data, for example Entra ID provisioning on the
[roadmap](/posts/projects/dunderly/03-product-planning/#product-roadmap).

## Architecture documentation
{: #architecture-documentation }

`docs/architecture.md` is the 2023 case study's "architecture document", grown up:

1. Context: what Dunderly needs and why (from [Vision](/posts/projects/dunderly/01-vision-and-business-context/)).
2. Requirements summary, including the case study's numbers (10 users, 500 employees, 25.5 GB).
3. C4 context and container diagrams.
4. Key flows: salary approval, payroll run, document upload.
5. Decisions: links to every ADR, including what changed from the 2023 design and why.
6. Cost: the 2023 estimate and the current one.
7. Known risks and debt.

It's reviewed at each [architecture review](/posts/projects/dunderly/18-continuous-improvement/#architecture-reviews)
and updated in the same PR as any change that alters a diagram.

## Deployment instructions
{: #deployment-instructions }

Normal deployments are the pipeline's job (see [CI/CD](/posts/projects/dunderly/12-cicd-and-release-management/)),
so the instructions document what a human does around it:

- How to approve a production deployment, and what to check first (release notes, payroll freeze).
- How to swap back.
- How to deploy a hotfix during the payroll freeze (label, approver).
- How to build a new environment from scratch with Bicep (used for DR and for the migration rehearsal
  environment).
- How to install or update the pickup agent on the payment server.

## Operations runbooks
{: #operations-runbooks }

The runbook list is in [Operational runbooks](/posts/projects/dunderly/14-operations-and-observability/#operational-runbooks).
The standard each one meets:

- A trigger (alert name or situation) at the top.
- Exact commands or portal paths, copy-pasteable.
- A verification step after each action.
- A "stop and escalate if…" line.
- Last tested date. A runbook nobody has run in a year is a guess; the payroll ones are effectively
  tested monthly, the DR one at each DR test.

## Troubleshooting guides
{: #troubleshooting-guides }

Symptom-first, for L1 and L2:

| Symptom | Likely cause | First check |
|---|---|---|
| "I can't sign in" | MFA or Conditional Access (non-compliant device) | Entra sign-in logs for the user |
| "I don't see the HR menu" | Role not assigned or token cached | Entra group membership; sign out and in |
| "My leave balance looks wrong" | Missing entitlement for the year or an unapproved entry | Leave ledger for the employee |
| "Document says pending" | Scan delayed | Document status and Defender event in the last hour |
| "Payroll shows Picked up but not Delivered" | Agent couldn't write the receipt | Agent event log on the payment server |

Each row links to a fuller article in the KB.

## Support procedures
{: #support-procedures }

How a ticket moves, who owns what, and the response targets are in
[Support and Maintenance](/posts/projects/dunderly/16-support-and-maintenance/#support-model-and-ownership).
The documentation side: a ticket template that asks for the page, the time and the correlation ID; canned
answers for the top ten questions; and a rule that any question asked three times becomes a KB article.

## Onboarding documentation
{: #onboarding-documentation }

For a new developer joining the team, a first-week path in `docs/onboarding.md`:

1. Day 1: access (repo, Azure dev subscription, dev Entra tenant), run it locally with one command.
2. Day 2: read the architecture doc and the ADRs; walk through the three key flows in the debugger.
3. Day 3: pick a `good-first-issue`; pair on the PR.
4. Day 4: shadow a deployment to prod.
5. Day 5: read the payroll runbooks; if it's payroll week, shadow the run.

For a new HR staff member: the user guides for their role plus a 30-minute walkthrough with a colleague.

## Training materials
{: #training-materials }

| Audience | Format | Length | When |
|---|---|---|---|
| HR team | Hands-on session in test with realistic tasks | 2 hours | Week 15 (before UAT) |
| Payroll operator + HR manager | Walkthrough of a full payroll run, including a failure | 1 hour | Week 15 and before the first live run |
| Managers | Live session + recording | 30 min | Week before rollout to managers |
| Employees | Two-minute video + the user guide | — | With the go-live email |
| HR service desk (L1) | Session on support tasks and escalation | 90 min | Before go-live |
| App team (L2) | Runbook drills | Ongoing | Monthly |

## Checklist
{: #checklist }

- [ ] Write the two-page product overview.
- [ ] Generate user-guide screenshots from the Playwright run.
- [ ] Turn the 2023 case study and the ADRs into `docs/architecture.md`.
- [ ] Add "last tested" dates to every runbook.
- [ ] Write the top ten KB articles before go-live.
- [ ] Record the employee video and the manager session.
- [ ] Write the developer onboarding path.

{% include project-nav.html %}
