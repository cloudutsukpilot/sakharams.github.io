---
layout: post
title: "Job Hunter Agent: Support and Maintenance"
date: 2026-10-22 00:16:00 +0530
categories: [projects, job-hunter-agent]
tags: [Projects, Job Hunter Agent, Support, Maintenance]
description: "Keeping Job Hunter Agent healthy over months: who owns what, upgrades for a pinned LinkedIn sidecar, dependency updates, backups that are actually restored, and the debt list."
project: job-hunter-agent
project_step: 16
image:
  path: /assets/img/projects/job-hunter-agent/16-support-and-maintenance.webp
  alt: "Job Hunter Agent: Support and Maintenance - Projects hero image"
---

The maintenance risk in Job Hunter Agent isn't my code, it's everything around it changing: LinkedIn's
pages, the MCP server, the local model, Supabase's free tier. Support and maintenance here mostly means
noticing those changes early and having a short, tested path back.

<!-- more -->

{% include project-nav.html %}

## Support model and ownership
{: #support-model-and-ownership }

| Piece | Owner | Support channel |
|---|---|---|
| App code, prompts, checks | Me | — |
| LinkedIn MCP server | Its open-source maintainers | Their releases and issues |
| LiteLLM gateway and model | Me (homelab `ai` cluster) | — |
| Platform (Argo CD, Keycloak, OpenBao, cert-manager) | Me (homelab) | — |
| Supabase | Supabase (free tier, best effort) | Their status page |

## Service-level objectives
{: #service-level-objectives }

Three SLOs, in [Availability and performance targets](/posts/projects/job-hunter-agent/14-operations-and-observability/#availability-and-performance-targets):
90% of scheduled runs complete over 7 days, every profile succeeds within 4 days, and the UI answers 99%
of probes. Each has an alert in Slack; a run that finishes with errors is reported there the same day.

## Incident response
{: #incident-response }

1. **Notice:** a Slack message with errors, or no message at a scheduled time.
2. **Contain:** if LinkedIn looks unhappy (429s, redirects), turn profiles off in Setup before anything
   else; the account matters more than a day's postings.
3. **Diagnose:** run history errors → `/healthz` → pod status and logs.
4. **Fix and verify:** the runbook in [Operations](/posts/projects/job-hunter-agent/14-operations-and-observability/#operational-runbooks).
5. **Learn:** a lesson and, where possible, a test.

## Bug triage
{: #bug-triage }

| Severity | Example | When |
|---|---|---|
| Critical | A draft with a false claim passes the checks | Same day: fix the check, add a test |
| High | Scheduled runs fail every time | Same day |
| Medium | Wrong company figures, missing research | This week |
| Low | Cosmetic UI issues | When convenient |

Anything that could make me send something untrue outranks everything else.

## Patch and upgrade management
{: #patch-and-upgrade-management }

- **LinkedIn sidecar:** pinned by version and digest; upgrade only to a release at least two weeks old,
  read its notes for session or tool changes, re-run the contract tests, check memory after the first
  search.
- **App base images:** pinned by digest; bumped deliberately, scanned by Trivy on every build.
- **Model:** changing the model means re-running the evaluation on the six saved postings before it's used
  for real drafts.

## Dependency updates
{: #dependency-updates }

Dependabot opens the PRs every Monday: Python packages, GitHub Actions (by SHA) and the base images, with a
14-day cooldown (see [Security](/posts/projects/job-hunter-agent/06-security-and-privacy/#vulnerability-and-dependency-management)).
I read the release notes, let CI run, and merge; the merge builds through the security gates like any
other change.
The MCP SDK deserves care: its 2.x client changed the API once already.

## Security remediation
{: #security-remediation }

Findings from the build gates block the image, so remediation happens before anything ships: upgrade the
dependency, or, for a false positive, suppress the single finding by fingerprint with a comment. A leaked
credential follows the rotation steps in
[Security testing and incident response](/posts/projects/job-hunter-agent/06-security-and-privacy/#security-testing-and-incident-response).

## Performance optimization
{: #performance-optimization }

Done so far: tailoring by line edits instead of a full rewrite; skipping known job IDs before any page
load; caching company research for a week. Next candidates: drafting jobs concurrently (the model
handles one request at a time well, so the gain is limited), and trimming prompts for the long resume.

## Backup verification
{: #backup-verification }

A backup I haven't restored is a guess. The drill is a runbook in the repo (`docs/runbooks/restore.md`),
done on a Saturday morning once a quarter, in about 30 minutes:

1. Copy the newest nightly export out of the pod.
2. Restore it into a clean local Supabase with `python -m hunter.maintenance restore`, and compare the
   row counts with the live app's totals.
3. Open the restored data in a local copy of the app, with LinkedIn turned off so a restored schedule
   can't use the real session.
4. Check that last night's Velero backup holds both volumes, `linkedin` and `backups`.
5. Delete the local copy and log the result.

| Drill | Date |
|---|---|
| First | Saturday 2026-10-31 |
| Then quarterly | 2027-01-30, 2027-04-24, 2027-07-31, 2027-10-30 |

Preparing the drill found a real problem before any drill ran. Velero's file-system backups had been
failing on the `platform` and `ai` clusters since their servers were hardened with a read-only root
filesystem: Kopia writes its repository config under the home directory (`mkdir /home/cnb/udmrepo:
read-only file system`). Every nightly backup there ended `PartiallyFailed`, without volume data. So the
LinkedIn session had never actually been copied, despite the volume's backup annotation. The fix is a
writable home (an `emptyDir`) for the Velero server. The first drill's step 4 is the proof that it worked.

## Disaster recovery testing
{: #disaster-recovery-testing }

The realistic disasters are losing the PVC (sign in again: 5 minutes) and losing the Supabase project
(a new project, the migrations, then the newest export: under an hour, losing at most a day). The
quarterly drill rehearses the second. The first is cheaper to redo by hand than to rehearse.

## Technical debt management
{: #technical-debt-management }

The debt table lives in [Implementation](/posts/projects/job-hunter-agent/09-implementation/#technical-debt-tracking).
I review it when a phase starts and pick at least one item per phase, so it shrinks rather than grows.

## Checklist
{: #checklist }

- [ ] Sidecar upgrade procedure followed for the next release
- [ ] Evaluation re-run after any model change
- [ ] First restore drill done (2026-10-31) and logged in the runbook
- [ ] Velero's nightly backup on `platform` shows both job-hunter volumes
- [ ] One debt item closed per phase
- [ ] Profiles turned off first when LinkedIn shows 429s

{% include project-nav.html %}
