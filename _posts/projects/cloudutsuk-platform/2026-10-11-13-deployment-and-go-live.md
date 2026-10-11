---
layout: post
title: "Cloudutsuk Platform: Deployment and Go-Live"
date: 2026-10-11 00:13:00 +0530
categories: [projects, cloudutsuk-platform]
tags: [Projects, Cloudutsuk Platform, Deployment, GoLive]
description: "How the platform's foundation went live on 2026-10-11, how it's deployed and rolled back, and what the MVP launch in Phase 3 needs."
project: cloudutsuk-platform
project_step: 13
image:
  path: /assets/img/projects/cloudutsuk-platform/13-deployment-and-go-live.webp
  alt: "Cloudutsuk Platform: Deployment and Go-Live - Projects hero image"
---

There's no launch day for a platform that only I use, and that's exactly why I wanted a go-live
discipline anyway: on 2026-10-11 the foundation (four clusters, secrets, DNS, sign-in, GitOps, remote
access and backups) became something other phases build on, and from then on breaking it costs real
work. This post records how Phase 0 was signed off, how things get deployed and rolled back, and what
the MVP launch in Phase 3 still needs.

<!-- more -->

{% include project-nav.html %}

## Production readiness review
{: #production-readiness-review }

Each phase ends with a readiness review: its steps' *Done when* checks, re-run against the live
system rather than taken from memory. Phase 0's ran on 2026-10-11:

| Check | Result |
|---|---|
| `core`, `mon`, `platform` and `ai` exist and are Ready | Pass |
| Every ClusterSecretStore is Valid; every ExternalSecret synced (23 across four clusters) | Pass |
| A cluster can't read another cluster's secrets (`mon` on `core/*`) | Pass (403) |
| Internal names resolve on the DGX and from pods in `mon`, `platform` and `ai`; HTTPS with a valid certificate | Pass |
| Argo CD: every app Synced and Healthy (11) | Pass |
| Sign-in through Keycloak with Entra ID: `kubectl` on `mon`, OpenBao | Pass |
| My phone on mobile data reaches the internal UIs over Tailscale | Pass |
| Velero's storage location Available in all three clusters; first backups Completed | Pass |
| The blog still answers on `https://cloudutsuk.com` after the DNS move | Pass |
| Reboot brings everything back unsealed | Deferred |
| Sign-in with Google; `kubectl` from the laptop; another tailnet user denied | Deferred |

Deferred checks aren't failures, but they're written down with a reason in the
[Phase 0 steps](/posts/projects/cloudutsuk-platform/03-product-planning/#phase-0-steps), so they don't
quietly turn into "done".

## Go-live checklist
{: #go-live-checklist }

The real go-live is the MVP at the end of Phase 3, when the portal and labs are usable
([MVP definition](/posts/projects/cloudutsuk-platform/03-product-planning/#mvp-definition)). The
checklist I'd hold it to:

- Every Phase 1 to 3 step shows *Done* with its date, and the deferred Phase 0 checks are closed or
  explicitly accepted.
- The portal signs in through Keycloak only; no local accounts are left enabled.
- The reboot test passes with the portal and lab runner in place.
- A restore of last night's backup works: Keycloak's realm and an OpenBao secret come back in a
  throwaway cluster.
- Alerts reach me: the heartbeat, and from Phase 2 the `mon` alerts for backups, certificates, sealed
  OpenBao and Argo CD drift.
- Deploying a lab beyond the memory budget is refused with a clear message.
- The playbook posts describe what's running, with no stale TODO callouts for things that now exist.

> **TODO:** Will anyone besides me use the portal at MVP? If so, the checklist needs their accounts in
> Keycloak's `viewers` group and a short how-to for them.
{: .prompt-warning }

## Deployment runbook
{: #deployment-runbook }

There are exactly two ways anything reaches a cluster, and the runbook is which one applies:

| What | Path | Rollout |
|---|---|---|
| Clusters, and what must exist before Argo CD (OpenBao, Keycloak, Zot, Velero and the like) | `infra-local`, Terragrunt | Plan, read it, apply |
| Everything else: apps, monitoring, the AI stack | A commit to `homelab-gitops` | Argo CD syncs within three minutes |

For a bootstrap release, the steps are:

```bash
# 1. plan, and read it: "update in-place" is fine; "must be replaced" on a cluster means a rebuild
venv/bin/python entrypoint.py --cloud k3d --environment homelab --provider helm \
  --stack platform --resource velero-ui --terragrunt plan
# 2. apply
venv/bin/python entrypoint.py ... --terragrunt apply
# 3. verify: pods Ready, ExternalSecrets synced, the endpoint answers
kubectl --context k3d-platform -n velero-ui get pods,externalsecret,certificate
```

Two rules from Phase 0 belong in every deploy. Restart a k3d node only with `k3d cluster stop/start`,
never `docker restart`, which drops the host aliases
([lesson L026](/posts/projects/cloudutsuk-platform/lessons-learned/#lesson-l026)). And a chart whose
objects use its own CRDs is split into two releases, the second applied after the first
([lesson L030](/posts/projects/cloudutsuk-platform/lessons-learned/#lesson-l030)).

## Data migration plan
{: #data-migration-plan }

Phase 0 had one real migration: moving `cloudutsuk.com`'s DNS from GoDaddy to Cloudflare. Every record
was exported first, compared with `dig` after the move, and the old zone was left in place for a week as
a fallback. The blog never went down.

The migrations still ahead are small and planned in their phases:

- **Labs to contract v2 (Phase 2):** the two existing labs join the `homelab` network and send telemetry
  to `mon` instead of bundling their own Grafana stack. Their posts' setup steps change with them.
- **The old `otel-demo` cluster** retires when its lab moves.
- **Inventory history (Phase 4)** starts empty; there's no older cost data to bring in.

There's no user data to migrate. Keycloak's realm and OpenBao's secrets were created fresh, and the
Velero backups are what would move them if the DGX were ever replaced.

## Smoke tests
{: #smoke-tests }

Today's smoke tests are the checks in the [readiness review](#production-readiness-review), run by hand
after a change. They're cheap and they caught real problems: the first `mon` secret store was checked
before CoreDNS had loaded its forwarding
([lesson L022](/posts/projects/cloudutsuk-platform/lessons-learned/#lesson-l022)).

Three are already automated:

- The **boot unit** checks after every boot that `core` is up, OpenBao unsealed and Tailscale routing.
- The **heartbeat** checks OpenBao's health every five minutes.
- **Velero** checks its storage location every minute.

Phase 1 adds the real pattern: an Argo CD **PostSync** job per app that calls the app's health and one
real request, and marks the sync failed if they don't answer
([Phase 1 steps](/posts/projects/cloudutsuk-platform/03-product-planning/#phase-1-steps)).

## Monitoring and alert validation
{: #monitoring-and-alert-validation }

Until `mon` has its LGTM stack (Phase 2), the only alert is the heartbeat, and it covers the failure
that matters most at this stage: the DGX going silent. It pings healthchecks.io every five minutes while
OpenBao answers healthy, and pings the check's failure URL with the reason when it doesn't, so a sealed
OpenBao emails me as fast as a power cut does.

An alert that has never fired is a guess, so each one gets validated once:

- **Heartbeat:** I'll stop the timer for 15 minutes and expect the email.
- **From Phase 2:** each mixin alert and each platform rule (backups older than 26 hours, sealed
  OpenBao, certificate expiry, Argo CD out of sync) gets fired once on purpose, and the Watchdog alert
  proves the alert pipeline itself is alive.

> **TODO:** Run the heartbeat test (stop `homelab-heartbeat.timer`, wait for the email, start it again)
> and note the delay you saw.
{: .prompt-warning }

## Support team readiness
{: #support-team-readiness }

The support team is me, so readiness means being able to fix things at 11 pm without remembering how
they were built. That's covered by:

- **Runbooks in the repos:** `infra-local`'s README and each `host/` folder's README (OpenBao, DNS,
  network, boot, heartbeat, backups).
- **The why:** the ADR log and the [lessons learned](/posts/projects/cloudutsuk-platform/lessons-learned/).
- **A local view that needs no sign-in:** Headlamp and Popeye on the DGX, plus a link page of every
  route and the external services (Tailscale, Cloudflare, healthchecks.io, Azure).
- **Break-glass when Keycloak or `core` is down:** SSH to the DGX, over the tailnet or the home
  network; the local admin accounts sealed in the offline kit.

The SRE agent (Phase 6) will take the first look at alerts, but it only proposes fixes; I still approve
them.

## User and stakeholder communications
{: #user-and-stakeholder-communications }

The audience is readers of this blog, so the communication channel is this playbook. Every phase ends by
updating the posts with what was actually built, ticking the roadmap and moving the project card's
status, which is what this post is part of. Phase 0's foundation moved the card from *Planning* to
*In progress* on 2026-10-11.

Decisions are published as ADRs and problems as lessons, so a reader can follow not just what was
built but why, and what went wrong on the way. Nothing private goes out: no IDs, keys, tailnet names or
private repo links (the ADR and lessons scripts check for them).

## Cutover and rollback plan
{: #cutover-and-rollback-plan }

Rollback depends on which deployment path the change took:

| Change | Rollback |
|---|---|
| An app in `homelab-gitops` | `git revert` the commit; Argo CD syncs the previous state |
| A bootstrap release | Re-apply the previous values from git (`helm rollback` only as an emergency, then fix git) |
| A cluster setting that rebuilds the cluster | Rebuild from the previous `resources.yaml`; host-path data survives, then re-apply its releases |
| Lost or corrupted data | Velero restore of the dumps, then `pg_restore` or `bao operator raft snapshot restore` |
| DNS | Cloudflare keeps the zone history; the GoDaddy zone was the fallback during the move |

The worst case is losing the DGX's disk. The plan: new hardware, `infra-local` rebuilds the clusters from
git and remote state, the offline kit unseals OpenBao, and Velero brings back last night's dumps. That
path is only a plan until the first restore test has run.

## Launch decision and sign-off
{: #launch-decision-and-sign-off }

I make the call, against written criteria rather than a feeling: a phase is signed off when every one of
its steps shows *Done* with a date, or *Deferred* with a reason, and its readiness review has been re-run
on the live system. Phase 0 was signed off that way on 2026-10-11, with five deferred items (the reboot
test, the two laptop tests over Tailscale, Google sign-in, and `core`'s own Keycloak sign-in, which waits
for its next rebuild).

The MVP launch at the end of Phase 3 uses the same rule plus the [go-live checklist](#go-live-checklist),
and it doesn't happen with an open item from the "worst case" path: no restore test, no launch.

## Checklist
{: #checklist }

- [x] Phase 0 readiness review run on the live system and recorded (2026-10-11)
- [x] Card moved to *In progress*; roadmap and Phase 0 steps updated
- [ ] Heartbeat alert fired once on purpose
- [ ] Reboot test passed
- [ ] First restore test of `core`'s backup into a throwaway cluster
- [ ] PostSync smoke tests on every app (Phase 1)
- [ ] Every Phase 2 alert fired once on purpose
- [ ] MVP go-live checklist passed and signed off (Phase 3)

{% include project-nav.html %}
