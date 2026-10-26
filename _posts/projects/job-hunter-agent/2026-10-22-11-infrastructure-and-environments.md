---
layout: post
title: "Job Hunter Agent: Infrastructure and Environments"
date: 2026-10-22 00:11:00 +0530
categories: [projects, job-hunter-agent]
tags: [Projects, Job Hunter Agent, Infrastructure, IaC]
description: "Two environments for Job Hunter Agent, a laptop and the homelab platform cluster, plus the configuration, secrets, DNS and capacity that connect them."
project: job-hunter-agent
project_step: 11
image:
  path: /assets/img/projects/job-hunter-agent/11-infrastructure-and-environments.webp
  alt: "Job Hunter Agent: Infrastructure and Environments - Projects hero image"
---

Job Hunter Agent has two environments and no staging, and that's a decision rather than an omission. The
laptop runs everything with fakes or the real model on demand; production is one pod on the homelab
platform cluster. The thing a staging environment would protect, the LinkedIn account, can't be
duplicated anyway.

<!-- more -->

{% include project-nav.html %}

## Development environment
{: #development-environment }

My laptop: `make dev` serves the API and UI on `127.0.0.1:8000` with in-memory storage and sign-in
off; the LLM is the same LiteLLM gateway as production, with its own virtual key. Optional extras are a
local Supabase in Docker (`make supabase-start`) and a local LinkedIn MCP server with its own browser
session on `127.0.0.1:8765`. Details in
[Local development setup](/posts/projects/job-hunter-agent/08-development-preparation/#local-development-setup).

## Test or QA environment
{: #test-or-qa-environment }

CI is the test environment: GitHub-hosted runners run the unit tests, start a throwaway local Supabase
with every migration, and build the image. It's created and destroyed on every push, so it can't drift.

## Staging environment
{: #staging-environment }

None, deliberately. A staging copy would need a second LinkedIn session (a second account breaks
LinkedIn's terms; sharing one doubles the traffic) and a second Supabase project. The risk staging would
catch (a bad deploy) is covered by fast rollback: revert the digest commit in homelab-gitops and Argo CD
goes back. Schema changes are the exception, and they're additive so the old image keeps working.

## Production environment
{: #production-environment }

| Piece | Where |
|---|---|
| App + LinkedIn sidecar | `platform` k3d cluster, namespace `job-hunter`, one pod |
| URL | `https://jobs.platform.home.cloudutsuk.com` (tailnet) |
| LLM | LiteLLM on the `ai` cluster |
| Identity, secrets | Keycloak and OpenBao on the `core` cluster |
| Database | Supabase cloud, free tier |
| Registry | Zot on `core`, `platform/job-hunter-agent` |

## Infrastructure as code
{: #infrastructure-as-code }

- **homelab-gitops** `apps/job-hunter/`: Deployment, PVC, Service, Ingress, NetworkPolicy, ExternalSecret,
  registry pull secret, Kustomization with the image digest; `clusters/platform/job-hunter.yaml` is the
  Argo CD Application.
- **infra-local**: the Keycloak client (`configure-realm.sh`) and `host/job-hunter/configure.sh`, which
  fills OpenBao (Keycloak secret, session key, LiteLLM key, Supabase, Slack webhook) without printing
  anything.
- **job-hunter-agent**: `supabase/migrations/` for the schema.

The one manual step is pasting new migrations into the Supabase SQL editor.

## Networking and DNS
{: #networking-and-dns }

Traefik ingress with TLS from Let's Encrypt; ExternalDNS publishes the name to the homelab's internal DNS.
cert-manager uses Cloudflare DNS-01, and getting the first certificate needed one fix: with split DNS,
cert-manager's own lookups saw the internal zone and failed, so it now checks DNS-01 records against public
resolvers only (`--dns01-recursive-nameservers-only`). Inside the pod, the app reaches the sidecar on
`127.0.0.1:8080`; nothing else can.

## Compute, storage, and databases
{: #compute-storage-and-databases }

| Container | Requests | Limit | Notes |
|---|---|---|---|
| `app` | 50m CPU, 192 MiB | 768 MiB | Read-only root filesystem, non-root |
| `linkedin` | 100m CPU, 1 GiB | 3 GiB | Chromium; `/dev/shm` is a 1 GiB memory volume, counted in the limit |
| init `home-dir` | 10m, 16 MiB | 64 MiB | Creates the browser's home folder on the volume |

The LinkedIn container was OOMKilled at 2 GiB during its first real search; 3 GiB has held since.
Storage is a 2 GiB `local-path` PVC for the browser profile. The database is Supabase Postgres, outside
the cluster.

## Configuration and secret management
{: #configuration-and-secret-management }

Non-secret settings are plain env vars in the Deployment (model, URLs, schedule default, timezone,
LinkedIn limits). Secrets come from OpenBao `kv/platform/job-hunter` through one ExternalSecret, refreshed
hourly. One gotcha: env vars from a Secret are read at container start, so a new or rotated secret needs
a pod restart after the ExternalSecret syncs.

## Environment parity
{: #environment-parity }

| Aspect | Laptop | Production |
|---|---|---|
| Code and image | Source | Same code, signed image |
| LLM | Same gateway and model | Same |
| Storage | Memory (or local Supabase) | Supabase cloud |
| Sign-in | Off | Keycloak |
| LinkedIn | Off by default | Sidecar |
| Schedule | Off | Per profile |

The biggest gap is storage; the CI Supabase test closes most of it.

## Capacity and quota planning
{: #capacity-and-quota-planning }

The limits that matter aren't CPU: LinkedIn's tolerance (about 6 searches and up to 30 job pages a day
across three profiles), the local model's throughput (one request at a time is fine), and Supabase's free
tier (database size and inactivity rules).

The Supabase free plan, as of October 2026:

| Limit | Free plan | What it means here |
|---|---|---|
| Database size | 500 MB | The real ceiling: postings and drafts are text, a few MB per hundred jobs; retention keeps it flat |
| Egress | 5 GB a month (plus 5 GB cached) | The UI and the nightly export; far below |
| Active projects | 2 | This is one |
| Pausing | After a week without activity | The daily upkeep job queries it every day |
| Backups, point-in-time recovery | None | Hence the app's own nightly export |

I check the database size on the Supabase dashboard once a month. Once it passes 400 MB, retention gets
shorter, or postings that were never drafted get a retention period of their own.

## Checklist
{: #checklist }

- [ ] No-staging decision recorded, with rollback as the safety net
- [ ] Every manifest change in homelab-gitops through a PR
- [ ] Secrets only in OpenBao; pod restarted after a rotation
- [ ] Memory limits reviewed after any MCP server upgrade
- [ ] Supabase usage checked monthly
- [ ] Migrations applied in Supabase before the code that needs them merges

{% include project-nav.html %}
