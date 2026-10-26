---
layout: post
title: "Job Hunter Agent: Deployment and Go-Live"
date: 2026-10-22 00:13:00 +0530
categories: [projects, job-hunter-agent]
tags: [Projects, Job Hunter Agent, Deployment, GoLive]
description: "How Job Hunter Agent went live on the homelab: the readiness checks, the in-cluster LinkedIn sign-in, the smoke tests and the rollback that never had to be used."
project: job-hunter-agent
project_step: 13
image:
  path: /assets/img/projects/job-hunter-agent/13-deployment-and-go-live.webp
  alt: "Job Hunter Agent: Deployment and Go-Live - Projects hero image"
---

Job Hunter Agent's go-live had one step no pipeline could do: signing in to LinkedIn inside the cluster,
by hand, in a browser running in a pod. Everything else (image, secrets, certificate, sign-in gate) was
automated and checked before that, so the manual step was the last one and the easiest to retry.

<!-- more -->

{% include project-nav.html %}

## Production readiness review
{: #production-readiness-review }

| Question | Answer at go-live |
|---|---|
| Does it run as the platform requires? | Signed, digest-pinned image; non-root; read-only roots; requests and limits; restricted pod security |
| Who can reach it? | Keycloak `platform-admins` only, checked twice; NetworkPolicy admits Traefik on 8000 only |
| Can it act on my behalf? | No: read-only MCP tools, no submit path, manual approval |
| Are secrets out of git? | Yes, OpenBao → ExternalSecret |
| Does it survive a restart? | Browser session on a PVC; data in Supabase |
| How do I know it works? | `/healthz`, run history, Slack after each scheduled run |
| How do I undo a release? | Revert the digest commit |

## Go-live checklist
{: #go-live-checklist }

- [x] Keycloak client `job-hunter` and secrets in `kv/platform/job-hunter`
- [x] Supabase schema applied; integration test passed against it, test rows cleaned up
- [x] Image built through all seven gates, signed, promoted
- [x] Argo CD Synced/Healthy; certificate issued by Let's Encrypt
- [x] API without a session returns 401; a browser is redirected to Keycloak
- [x] Supabase and the LLM reachable from inside the pod
- [x] LinkedIn signed in inside the cluster; `--status` valid after a pod restart
- [x] A capped live discovery from the cluster

## Deployment runbook
{: #deployment-runbook }

Normal releases are automatic (push to `main`). The manual runbook is for the LinkedIn session, needed once
and again whenever LinkedIn expires it:

```bash
ctx="--context k3d-platform -n job-hunter"
kubectl $ctx exec deploy/job-hunter -c linkedin -- sh -c \
  'nohup python -m linkedin_mcp_server --login --login-viewer \
     --chrome-path=<image chromium path> > /tmp/login.log 2>&1 &'
sleep 30; kubectl $ctx exec deploy/job-hunter -c linkedin -- tail -3 /tmp/login.log   # viewer URL
kubectl $ctx port-forward deploy/job-hunter 6080:6080                                 # keep running
# open the printed vnc_lite URL, sign in (2FA included); the viewer closes once the profile is saved
```

Why it looks like this, from three failed attempts: the image's entrypoint starts a display that clashes
with the running server's, so `python` is called directly; the browser refused to install itself into a
world-writable `/tmp`, so `--chrome-path` points at the one in the image; and the volume is root-owned,
so an init container creates a home folder the browser's user owns. A separate login pod fought Argo CD,
which kept scaling the app back up. And never copy a session from a laptop: LinkedIn rejected one with a
redirect loop and then HTTP 429.

## Data migration plan
{: #data-migration-plan }

Nothing to migrate at go-live; Supabase started empty apart from the schema. My resumes were loaded
afterwards through the same code path as the Upload button (the master resume as DOCX, two derived
versions as text). Later schema changes follow the order in
[Database deployment strategy](/posts/projects/job-hunter-agent/12-cicd-and-release-management/#database-deployment-strategy).

## Smoke tests
{: #smoke-tests }

| Check | How | Result at go-live |
|---|---|---|
| Probe | `GET /readyz` from inside the pod | 200 |
| Auth gate | `curl` without a cookie | 401; browser redirected to Keycloak |
| Certificate | `openssl s_client` | Let's Encrypt chain, verifies |
| LinkedIn session | `python -m linkedin_mcp_server --status` in the sidecar | Valid, also after restart |
| Discovery | 1 search, 2 postings, in-memory store | 2 postings in 23 s, nothing stored |
| Slack | `POST /notifications/slack/test` | Sent |

## Monitoring and alert validation
{: #monitoring-and-alert-validation }

What exists: Argo CD health, the platform's cluster monitoring, the app's run history, and a Slack message
after every scheduled run, which works as a heartbeat (no message at 08:00 means something's wrong).

The first OOMKill was found from a user-visible error, not an alert. Checking why:
- **Crash loops:** the platform already alerted on them in every namespace (the Kubernetes mixin's
  `KubePodCrashLooping`).
- **OOM kills:** nothing alerted. A container killed once and restarted never reaches a crash loop.

So the platform gained `ContainerOOMKilled`, for every namespace, which fires on the first kill. The app
also gained its own alerts (see [Operations](/posts/projects/job-hunter-agent/14-operations-and-observability/#alerting-and-escalation)),
and the blackbox exporter now probes its `/readyz`. All of them reach Slack through the platform's
Alertmanager, and each has a promtool test.

## Support team readiness
{: #support-team-readiness }

The support team is me. Readiness meant writing the README sections I'd need at 11 pm: sign-in, health,
volume limits, upgrading the sidecar. They live next to the manifests in homelab-gitops.

## User and stakeholder communications
{: #user-and-stakeholder-communications }

One user, so communication is the UI itself: the tagline "Manual approval only. Nothing is submitted for
you.", empty states that say what to do, and Slack run reports. No announcement was needed.

## Cutover and rollback plan
{: #cutover-and-rollback-plan }

No cutover: there was no previous system, just me searching by hand, which kept working the whole time.
Rollback for a bad release is reverting the digest commit; rollback for the whole project is deleting the
Argo CD application. Neither touches LinkedIn or my applications already sent.

## Launch decision and sign-off
{: #launch-decision-and-sign-off }

The launch criterion was "the review queue shows a real draft for a real posting, discovered from the
cluster, behind my Keycloak sign-in". It was met on 2026-10-22, and I signed off by using it.

## Checklist
{: #checklist }

- [ ] LinkedIn sign-in runbook tried again from scratch (session expiry will force it)
- [ ] Smoke tests scripted so they run after every release
- [x] Alert for OOMKilled or crash-looping pods in place (`ContainerOOMKilled` is new)
- [ ] Slack silence at a scheduled time noticed and investigated
- [ ] Rollback by revert tried once

{% include project-nav.html %}
