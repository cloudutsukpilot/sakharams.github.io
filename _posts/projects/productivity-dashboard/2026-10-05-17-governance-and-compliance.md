---
layout: post
title: "Productivity Dashboard: Governance and Compliance"
date: 2026-10-05 00:17:00 +0530
categories: [projects, productivity-dashboard]
tags: [Projects, Productivity Dashboard, Governance, Compliance]
description: "Governing an AI system that writes about employees: who decides data scope and use in reviews, audit trails for summaries, access reviews, vendor terms and evidence."
project: productivity-dashboard
project_step: 17
image:
  path: /assets/img/projects/productivity-dashboard/17-governance-and-compliance.webp
  alt: "Productivity Dashboard: Governance and Compliance - Projects hero image"
---

Governance for the Productivity Dashboard is mostly about decisions that aren't technical: what
data about people is collected, who may read summaries about them, and how those summaries may be used
in performance reviews. HR, legal and privacy reviewed the system; good governance keeps that review
true as prompts, data scope and audiences change over time.

<!-- more -->

{% include project-nav.html %}

## Project governance
{: #project-governance }

| Forum | Cadence | Decides |
|---|---|---|
| Maintainers' iteration review | Every 2 weeks | Backlog, releases, prompt tuning |
| Data-use review (HR, legal, privacy, sponsor, prompt owner) | Quarterly, and on any scope change | What's collected, who reads what, use in reviews |
| Sponsor check-in | Quarterly | Roadmap, onboarding of new teams, AI budget |

The data-use review is the forum that most projects of this kind lack, and the one that keeps the
original HR, legal and privacy review from going stale.

> **TODO:** Is there a standing forum for data-use decisions today, or was the review a one-time
> sign-off?
{: .prompt-warning }

## Decision-making and approval authorities
{: #decision-making-and-approval-authorities }

| Decision | Approver |
|---|---|
| Code change | Code owner, CI green |
| Prompt or model change | Prompt owner plus a summary reader (for example a manager) |
| Production promotion | Reviewer on the production environment |
| Adding a team or POD | Maintainers, on the manager's request |
| **New data field or source** | Data-use review |
| **Change to readership or use in reviews** | HR, legal and privacy |

## Audit requirements
{: #audit-requirements }

Because summaries feed performance reviews, it should be possible to answer later: *what did the
summary say, when, which version wrote it, and from what data?* The pieces mostly exist:

- Dated summaries on the share, kept (today) indefinitely.
- Raw collector data for the same dates.
- Image tags per release, which include the prompts.

The missing link is recording the generator version, model deployment and generation time in each
summary (a small front-matter block at the top of `summary.md` would do), plus a log of every
regeneration. With those, any summary used in a review can be traced end to end.

## Access reviews
{: #access-reviews }

Quarterly:

- who can read the UI (and, if restricted, individual summaries);
- who can exec into pods or read the share directly, which bypasses any UI rules;
- who can read Key Vault secrets (GitHub App keys, Jira token, AI key);
- GitHub App permissions per org, and the Jira account's permissions;
- maintainers and code owners of the repo and the GitOps repo.

## License management
{: #license-management }

Open-source dependencies (FastAPI, React, Vite, Tailwind, `react-markdown` and the rest) are permissive;
a license check in CI keeps them that way. The other "license" here is the AI service's terms: Azure
OpenAI is used under the organization's Azure agreement, and Microsoft's stated terms for the service
are that customer prompts and outputs aren't used to train its models. That's worth recording in the
project docs, because it's the first question people ask about AI and employee data.

## Compliance reporting
{: #compliance-reporting }

For an employee-data system, the useful compliance artefact is a short **processing record**: purpose
(automating status updates; input to reviews), data categories (GitHub and Jira work activity, no PHI),
people concerned (configured employees), recipients (all readers of the UI), retention, processors
(Microsoft for Azure OpenAI and Azure storage; GitHub; Atlassian), and safeguards (transparency,
self-access, review fair-use rules).

> **TODO:** Is a record like this kept as part of the HR, legal and privacy review? Which jurisdictions'
> employee-data rules apply to the people summarized?
{: .prompt-warning }

## Data governance
{: #data-governance }

- **Scope:** collector field lists are the source of truth for what's collected; they change only
  through the data-use review, and a data-scope page mirrors them.
- **Classification:** per-person data and user summaries are confidential; team, epic and POD summaries
  internal.
- **Retention:** to be set by the review and enforced by a pruning job (none today).
- **Quality:** coverage and accuracy measured monthly; inaccuracies corrected and logged.

The gap between intent and configuration found while writing this series (Jira comment bodies are
collected by default though the intent is to exclude them, see
[Security and Privacy](/posts/projects/productivity-dashboard/06-security-and-privacy/#privacy-and-data-protection-requirements))
is exactly what a data-scope page would catch.

## Vendor and third-party management
{: #vendor-and-third-party-management }

| Vendor | Role | Data |
|---|---|---|
| GitHub | Source of code activity | Read via org GitHub Apps |
| Atlassian (Jira Cloud) | Source of ticket activity | Read via API token |
| Microsoft (Azure OpenAI) | Writes the summaries | Work activity in prompts; summaries out |
| Microsoft (AKS, Azure Files, Key Vault) | Hosting, storage, secrets | Everything stored |
| JFrog | Images and charts | No personal data |

All are platforms the organization already uses; the new data flow is work activity into Azure OpenAI,
which is the one to document clearly.

## Policy enforcement
{: #policy-enforcement }

Policies only matter if something enforces them:

- **Data scope:** a CI check that fails when a collector's field list changes without the data-scope
  page changing.
- **Readership:** SSO at the ingress, and restrictions on direct share access.
- **Retention:** a pruning job, once the rules exist.
- **Fair use in reviews:** written guidance for reviewers, linked from every user page.

## Evidence collection
{: #evidence-collection }

For an internal audit or a dispute about a specific summary, the evidence pack is: the summary file,
the collector files it was built from, the generator version and model deployment, the regeneration log,
and the data-use review decision in force at the time. Packaging that as a task makes the answer to
"how was this produced?" minutes of work instead of days.

## Checklist
{: #checklist }

- [ ] Standing data-use review with HR, legal, privacy, sponsor and prompt owner
- [ ] Approval authorities documented, including data scope and review use
- [ ] Generator version, model and time recorded in every summary
- [ ] Quarterly access review, including direct share access
- [ ] AI service data terms recorded in the project docs
- [ ] Processing record kept with the review outcome
- [ ] Data-scope CI check and pruning job in place

{% include project-nav.html %}
