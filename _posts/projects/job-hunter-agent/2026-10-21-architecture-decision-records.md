---
layout: post
title: "Job Hunter Agent: Architecture Decision Records"
date: 2026-10-21 00:30:00 +0530
categories: [projects, job-hunter-agent]
tags: [Projects, Job Hunter Agent, Architecture, ADR]
description: "Every architecture decision behind Job Hunter Agent, with its context, the options considered and the consequences."
project: job-hunter-agent
project_adrs: true
image:
  path: /assets/img/projects/job-hunter-agent/architecture-decision-records.webp
  alt: "Job Hunter Agent: Architecture Decision Records - Projects hero image"
---

Every significant decision in Job Hunter Agent is written down as an architecture decision record (ADR): what
forced the decision, what was decided, which options lost and why, and what it costs. This post is the
full log, generated from the app's repo (`job-hunter-agent/docs/adr`), so it always matches what the app
is built to.

<!-- more -->

{% include project-nav.html %}

## How to read this log
{: #how-to-read-this-log }

- **Proposed** decisions are still waiting on evidence, such as a spike or a baseline; **accepted** ones
  are what the app is built to. A changed decision never edits an accepted ADR: a new ADR replaces
  it and the old one is marked **superseded**, with a link forward, so the history stays.
- Each ADR names the repos it affects. The summary table is in the
  [Technical Architecture](/posts/projects/job-hunter-agent/05-technical-architecture/#architectural-decision-records) post.

<!-- adr:begin -->
{% raw %}

## ADR-0001: Manual approval only: the agent never submits, connects or messages
{: #adr-0001 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-10-21 · `job-hunter-agent`</span>

#### Context

Applying is the one step with real consequences: a wrong or embarrassing application goes to a real
employer under my name, and LinkedIn restricts accounts that automate actions. The model also drifts
from the source resume (ADR 0004), so its output can't be trusted to go out unseen.

#### Decision

- The agent stops at a draft. Every application is created as `pending_review`, and the only moves are
  `pending_review → approved | rejected`, `approved → applied | rejected` and `rejected → pending_review`
  (`ALLOWED_TRANSITIONS` in `hunter/models.py`). `applied` is something I record after applying myself.
- No code path submits an application, sends a connection request or a message. The LinkedIn client refuses
  every tool outside a read-only allow-list (ADR 0005).
- Suggested contacts come with a drafted note that I may send by hand; the app never sends it.

#### Considered options

1. **Auto-apply above a score threshold**: fastest, but one bad draft reaches an employer, and it's the
   pattern LinkedIn's automation rules target.
2. **Auto-apply with a daily cap**: smaller blast radius, same two problems.
3. **Draft only, I approve and apply** (chosen).

#### Consequences

- Good: nothing leaves without my review; the account's risk is limited to reading.
- Good: the review page is where quality problems surface, so they get fixed.
- Bad: applying stays manual work, a few minutes per application.

#### Related

- [ADR 0004](#adr-0004)
- [ADR 0005](#adr-0005)

## ADR-0002: Local LLM through the homelab's LiteLLM gateway, not a cloud API
{: #adr-0002 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-10-21 · `job-hunter-agent`</span>

#### Context

Each drafted job takes about five model calls (score, tailor, re-score, letter, contacts) plus company
research, over a resume that holds my whole work history. The homelab already serves models on its own
GPU behind a LiteLLM gateway with a virtual key per client (homelab ADR 0029).

#### Decision

- All calls go to the homelab's LiteLLM gateway with the OpenAI SDK, using the app's own virtual key, model
  `qwen3.5-35b-a3b` (homelab ADR 0049), with JSON-schema output and thinking turned off for structured tasks.
- One repair retry when the output doesn't validate; a 300 s timeout per call.
- The model is a setting (`LLM_CHAT_MODEL`), so a cloud model behind the same gateway stays possible.

#### Considered options

1. **A cloud API (OpenAI, Anthropic)**: better models, but the resume and every posting leave the house,
   and cost grows with every run.
2. **Local model through LiteLLM** (chosen): free per call, data stays home, one gateway for keys and logs.
3. **Calling vLLM directly**: no per-client key, usage or rate limits.

#### Consequences

- Good: no per-call cost and no personal data sent to a third party.
- Good: the gateway's key, budget and logs apply to this app like any other client.
- Bad: a 35B mixture-of-experts model is slower and less careful than frontier models, so prompts are
  tighter, output is schema-checked, and ADR 0003 and 0004 exist.
- Bad: drafting depends on the homelab's GPU being up.

#### Related

- [ADR 0003](#adr-0003)
- [ADR 0004](#adr-0004)

## ADR-0003: Resume tailoring as line edits applied by code, not a regenerated resume
{: #adr-0003 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-10-21 · `job-hunter-agent`</span>

#### Context

The first resume optimizer asked the model to return the whole tailored resume. On a 28,000-character
resume that timed out at 180 s, and when it finished it silently reworded or dropped lines nobody asked
it to touch.

#### Decision

- The model returns a list of edits (`original` line, `revised` line, `reason`), schema-checked.
- Code applies an edit only when its `original` matches a line of the resume; edits that match nothing are
  dropped and reported.
- The review page shows the result as a diff against the original.

#### Considered options

1. **Regenerate the whole resume**: simplest prompt, but slow on long resumes and unreviewable.
2. **Line edits applied by code** (chosen).
3. **Template slots** (fill a fixed resume template): loses the layout and wording of my own resume.

#### Consequences

- Good: finishes well inside the 300 s timeout; untouched lines stay byte-for-byte.
- Good: every change is visible and has a reason.
- Bad: edits can't restructure the resume (reorder sections, merge roles); that stays manual.

#### Related

- [ADR 0002](#adr-0002)
- [ADR 0004](#adr-0004)

## ADR-0004: Deterministic truthfulness checks block approval
{: #adr-0004 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-10-21 · `job-hunter-agent`</span>

#### Context

The prompts forbid inventing facts, but live runs showed the model still adding tools the posting asks
for (for example "OpenTelemetry" into the skills line) and new numbers. A second model call to check the
first would share its blind spots.

#### Decision

- After tailoring and after the cover letter, plain code (`hunter/truthfulness.py`) compares the output with
  the original resume: numbers that weren't there, and terms the posting asks for that the resume never
  mentions (a phrase and its acronym count as one term).
- Any warning blocks approval. Approving anyway needs an explicit `accept_warnings` on that request; the
  flag isn't stored.
- Each warning says what was added and why it matters, in plain words.

#### Considered options

1. **Trust the prompt**: shown not to work.
2. **A second model as judge**: same blind spots, more latency.
3. **Deterministic checks that block** (chosen).

#### Consequences

- Good: invented skills and numbers can't slip through unseen; the checks are fast and testable.
- Bad: false positives (a synonym the resume uses in other words) cost a click to accept.
- Bad: the checks find additions, not subtle rewording of what a line claims.

#### Related

- [ADR 0001](#adr-0001)
- [ADR 0003](#adr-0003)

## ADR-0005: LinkedIn through an MCP sidecar with a read-only tool allow-list
{: #adr-0005 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-10-21 · `job-hunter-agent`</span>

#### Context

LinkedIn has no public jobs API for individuals. Searching and reading postings needs a signed-in browser
session, and the session is the account: anything that can drive it can also connect and message.

#### Decision

- `mcp-server-linkedin` (Apache-2.0) runs as a sidecar in the same pod, with its Chromium profile on a
  persistent volume, listening on `127.0.0.1:8080` only: it has no authentication, so it has no Service
  port and the NetworkPolicy admits only Traefik on the app's port.
- The app's client calls only tools in `READ_ONLY_TOOLS` (search, job details, company pages, employees,
  apply link) and refuses the rest, so no code path can message or connect.
- Volume is kept low: at most 5 postings per keyword per run, past week only, one run per profile per weekday.

#### Considered options

1. **Scrape LinkedIn directly**: brittle and the same account risk, with no tool boundary.
2. **A paid jobs API or aggregator**: costs money, lags, and still lacks company pages and people.
3. **The MCP server as a loopback sidecar with an allow-list** (chosen).

#### Consequences

- Good: one signed-in session, used only for reading, never reachable from outside the pod.
- Good: the MCP boundary makes the allowed actions a reviewable list.
- Bad: one browser means one replica and runs in sequence; Chromium needs up to 3 GiB.
- Bad: LinkedIn's page changes can break the server; an upgrade means re-checking the allow-list.

#### Related

- [ADR 0001](#adr-0001)
- [ADR 0007](#adr-0007)

## ADR-0006: Company figures only from published sources, never the model
{: #adr-0006 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-10-22 · `job-hunter-agent`</span>

#### Context

The review page shows each company's revenue, headcount over five years, products, location and news.
Asked for those figures, a model produces plausible numbers whether or not it knows them.

#### Decision

- Revenue and headcount by year come only from Wikidata, matched by the company's website domain from its
  LinkedIn page (so a common name can't match the wrong company), with the Wikidata item linked.
- Size, headquarters and products come from the LinkedIn About page, parsed by label.
- News comes from the Google News RSS feed (read with defusedxml).
- The model only summarises text it was given. When a source has no figure, the page shows none.
- Facts are refreshed when older than 7 days.

#### Considered options

1. **Ask the model**: confident and often wrong.
2. **A commercial company-data API**: accurate, but paid and rate-limited.
3. **Published open sources, shown with their source** (chosen).

#### Consequences

- Good: every figure is traceable to a source I can open.
- Bad: smaller and private companies often have no revenue or headcount data at all.

#### Related

- [ADR 0002](#adr-0002)

## ADR-0007: One scheduled job per search profile, spread through the day
{: #adr-0007 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-10-22 · `job-hunter-agent`</span>

#### Context

Each search profile (keywords, resume, mode, tone) used to run in one daily batch. A batch for three
profiles drove the LinkedIn browser for a long stretch, and a slow profile delayed the others.

#### Decision

- Each enabled profile has its own cron (or the default `SCHEDULE_CRON`) and its own APScheduler job,
  re-synced whenever a profile is created, changed or deleted.
- Profiles run hours apart on weekdays (08:00, 12:00 and 16:00 IST today); a lock makes a run that falls
  due during another wait, since there is one browser session.
- Jobs live in memory: a run whose time passes while the pod is down is skipped until its next slot
  (misfire grace one hour).
- A Slack message after each scheduled run says what was found and drafted, and any errors.

#### Considered options

1. **One daily batch for all profiles**: long bursts of LinkedIn traffic.
2. **A Kubernetes CronJob per profile**: a second pod would need the same browser session.
3. **An in-process job per profile** (chosen).

#### Consequences

- Good: LinkedIn traffic is spread across the day; each profile's result is reported on its own.
- Bad: a run missed during a restart isn't caught up; the freshness alert (ADR 0009) notices if that
  keeps happening.

#### Related

- [ADR 0005](#adr-0005)
- [ADR 0009](#adr-0009)

## ADR-0008: Six-month retention, and our own nightly export because Supabase's free plan has no backups
{: #adr-0008 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-10-22 · `job-hunter-agent`</span>

#### Context

Contact suggestions name real people, and rejected applications hold tailored copies of my resume; neither
is useful after a few months. Supabase's free plan takes no backups (they are a paid-plan feature) and
pauses a project after a week without activity.

#### Decision

- **Retention:** a daily upkeep job (`MAINTENANCE_CRON`, 03:30 IST) deletes contact suggestions and
  rejected applications older than `RETENTION_DAYS` (180), with the tailored resume, letter and model
  outputs behind them. The job itself stays, so a rejected posting isn't drafted again. 0 turns it off.
- **Backup:** the same job writes every table to a gzipped JSON export on a volume (`BACKUP_DIR`), newest 7
  kept. Velero's file-system backup copies that volume to the homelab's off-site Azure Blob container every
  night (kept 30 days, weekly copies 12 weeks; homelab ADR 0039).
- **Restore:** `python -m hunter.maintenance restore <file>` loads an export into an empty database with
  the migrations applied; the drill is in `docs/runbooks/restore.md`.
- **Keep-alive:** the job's queries every day keep the Supabase project active.
- It runs in the run history; Slack hears about it only when it fails.

#### Considered options

1. **Upgrade to a paid Supabase plan for backups**: daily backups kept 7 days, a monthly cost for a
   one-person tool.
2. **`supabase db dump` from a CronJob**: needs the database password in the cluster, which the app
   otherwise never needs (it uses the REST API).
3. **An export through the app's own API key, onto a volume Velero already backs up** (chosen).

#### Consequences

- Good: no new credentials; restore is tested in CI against a real Postgres.
- Good: personal data about third parties doesn't pile up.
- Bad: the export is logical (rows, not the schema): restore needs the migrations first, and the RPO is a day.
- Bad: retention deletes for good; an exported copy lives on in backups until they expire (at most 12 weeks).

#### Related

- [ADR 0009](#adr-0009)

## ADR-0009: Service level objectives for scheduled runs, and alerts on the platform
{: #adr-0009 }

<span class="adr-status adr-status-accepted">Accepted</span> <span class="adr-meta text-muted">2026-10-22 · `job-hunter-agent`</span>

#### Context

The app runs unattended. Slack says when a run finishes with errors, but nothing says when a run doesn't
happen at all (scheduler stopped, pod down at the slot), or when the pod is OOMKilled or crash-looping.

#### Decision

- The app serves Prometheus metrics on a port of its own (9464), outside the sign-in; the platform's
  collector scrapes it through a PodMonitor.
- **SLO 1, run completion:** 90% of scheduled runs over 7 days complete (status `succeeded` or `errors`).
  With three profiles on weekdays that's 15 runs a week, so one failed run is within budget and two are not.
- **SLO 2, freshness:** every scheduled profile has a fully successful run within the last 4 days (long
  enough to cover a weekend).
- **SLO 3, availability:** the UI's `/readyz` answers 99% of probes over 7 days.
- The window is 7 days because Mimir keeps 15 days of metrics.
- Alerts (homelab-gitops `alerts/platform/job-hunter.yaml`, Slack through Alertmanager):
  - SLO 1 below target;
  - a stale profile;
  - the upkeep job (retention, backup, keep-alive) not succeeding for 2 days;
  - the metrics endpoint down.
- Platform-wide alerts already cover crash-looping pods; an OOMKilled container alert was added for every
  namespace.

#### Considered options

1. **Slack run messages only**: silent when a run never starts.
2. **Multi-window burn-rate alerts**: designed for thousands of events; with 15 runs a week, one failure
   would trip every window.
3. **A simple ratio over 7 days, plus freshness** (chosen).

#### Consequences

- Good: a missed or broken schedule is noticed within days, not when I wonder where the drafts went.
- Bad: the targets are a first guess; revisit after a month of data.

#### Related

- [ADR 0007](#adr-0007)
- [ADR 0008](#adr-0008)

{% endraw %}
<!-- adr:end -->

{% include project-nav.html %}
