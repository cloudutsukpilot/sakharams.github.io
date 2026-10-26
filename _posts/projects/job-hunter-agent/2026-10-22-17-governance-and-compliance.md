---
layout: post
title: "Job Hunter Agent: Governance and Compliance"
date: 2026-10-22 00:17:00 +0530
categories: [projects, job-hunter-agent]
tags: [Projects, Job Hunter Agent, Governance, Compliance]
description: "Light governance for a personal AI agent: who decides, what the platform enforces automatically, licences, LinkedIn's terms, and the evidence that the approval gate holds."
project: job-hunter-agent
project_step: 17
image:
  path: /assets/img/projects/job-hunter-agent/17-governance-and-compliance.webp
  alt: "Job Hunter Agent: Governance and Compliance - Projects hero image"
---

Governance for a one-person project sounds like theatre, but Job Hunter Agent has two things worth
governing: an AI that writes in my name, and a third party (LinkedIn) whose rules I'm bending. The
controls are light, and most of them are enforced by code or the platform rather than by discipline.

<!-- more -->

{% include project-nav.html %}

## Project governance
{: #project-governance }

I own the product, the code and the risk. The phase tables in
[Product planning](/posts/projects/job-hunter-agent/03-product-planning/#product-roadmap) are the single
record of what's planned and done; this playbook records the decisions and reasons. Changes to the
platform side go through pull requests even though I'm the only reviewer, so there's a dated record of
every change to how the app runs.

## Decision-making and approval authorities
{: #decision-making-and-approval-authorities }

| Decision | Who | Recorded in |
|---|---|---|
| Send an application | Me, per application, in the review queue | `applications.approved_at`, `applied_at` |
| Accept a truthfulness warning | Me, explicitly, at approval | Not stored yet (see [debt](/posts/projects/job-hunter-agent/09-implementation/#technical-debt-tracking)) |
| Add a source or tool | Me | Phase tables, README |
| Change the platform setup | Me, by merging a PR | homelab-gitops / infra-local history |
| Change the model | Me, after re-running the evaluation | `docs/evaluation.md` |

## Audit requirements
{: #audit-requirements }

No external audit applies. The internal question I want to answer at any time is "why does this
application say that?", and the data answers it: the original resume, the tailored version, the line
edits with their reasons, the warnings, and the agent run that produced them.

## Access reviews
{: #access-reviews }

Access to the app is membership of Keycloak's `platform-admins` group. A quarterly look at that group
covers the app and the rest of the platform at once. Keys: the LiteLLM virtual key is limited to one
model; the Supabase service key and Slack webhook are in OpenBao, readable only by the platform's
External Secrets.

## License management
{: #license-management }

The app's own code is private and unlicensed. Its dependencies are open-source (FastAPI, Pydantic, the
OpenAI SDK, supabase-py, APScheduler, Authlib, pypdf, python-docx, defusedxml and others), all
installed from `uv.lock`; the SBOM attested with each image lists them. The two
third-party pieces that aren't Python packages:

| Component | Licence | For this use |
|---|---|---|
| `mcp-server-linkedin` (the LinkedIn MCP server image) | Apache-2.0 | Free to use and run unmodified; the licence covers the code, not LinkedIn's terms, which still prohibit scraping (see [Requirements](/posts/projects/job-hunter-agent/02-requirements-gathering/)) |
| Qwen3.5-35B-A3B model weights | Apache-2.0 | Free to use, including commercially; nothing is redistributed, the model is only served inside the homelab |

## Compliance reporting
{: #compliance-reporting }

Nothing to report to anyone. The closest thing is the platform's own compliance: the build gates'
reports are uploaded with each image build, and Kyverno's admission decisions show the pod meets the
platform's policies.

## Data governance
{: #data-governance }

The classification and retention proposals are in
[Data and Integration](/posts/projects/job-hunter-agent/07-data-and-integration/#data-ownership-and-classification).
The governing rules: my resume goes only to the local model; other people's data (contact suggestions) is
used only to help me decide whom to contact myself; nothing generated is published without my approval.

## Vendor and third-party management
{: #vendor-and-third-party-management }

| Third party | Dependence | Exit |
|---|---|---|
| LinkedIn | Source of most postings; terms forbid scraping | Add postings by hand; Indeed source; stop the profiles |
| Supabase | Database, free tier | Postgres anywhere: same migrations, `supabase-py` swapped for a Postgres repository |
| `mcp-server-linkedin` maintainers | The scraper | Pinned version; fork if abandoned |
| Wikidata, Google News | Company facts and news | Optional; drafts don't depend on them |
| Slack | Run reports | Optional; email digest already exists |

## Policy enforcement
{: #policy-enforcement }

Enforced by machines, not by me remembering:

- **Platform (Kyverno, Conftest):** signed images from the allowed registry, digest pins, restricted pod
  security, read-only root filesystem, requests and limits.
- **App:** manual approval only (no code path submits anything), a read-only MCP tool allow-list,
  approval blocked while truthfulness warnings are unresolved, `platform-admins` checked on sign-in.
- **CI:** seven security gates before any image exists.

## Evidence collection
{: #evidence-collection }

If I ever had to show the approval gate works: the transition rules and their tests, the refusal message
in the UI, the absence of any submit path in the MCP allow-list (test
`test_client_lists_tools_and_refuses_account_actions`), and each application's timestamps. For the
platform: signed image digests, SBOM attestations, gate reports per build, and Argo CD's sync history.

## Checklist
{: #checklist }

- [ ] `platform-admins` membership reviewed quarterly
- [ ] Approvals with accepted warnings recorded
- [ ] Licences of the MCP server and the model noted
- [ ] Exit plan for Supabase tried on a copy once
- [ ] Policy list re-checked when the platform's Kyverno rules change

{% include project-nav.html %}
