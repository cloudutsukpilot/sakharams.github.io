---
layout: post
title: "Productivity Dashboard: Operations and Observability"
date: 2026-10-05 00:14:00 +0530
categories: [projects, productivity-dashboard]
tags: [Projects, Productivity Dashboard, Observability, Operations]
description: "Operating the Productivity Dashboard: summary coverage and freshness, AI cost and quota, refresh Jobs, runbooks, and an HPA for the single UI replica."
project: productivity-dashboard
project_step: 14
image:
  path: /assets/img/projects/productivity-dashboard/14-operations-and-observability.webp
  alt: "Productivity Dashboard: Operations and Observability - Projects hero image"
---

The morning question for whoever runs the Productivity Dashboard is: **does everyone have a summary
for yesterday, and is it right?** A healthy pod and a green CronJob don't answer that. A wrong Jira
email means one person silently has no summary; a slow AI deployment means team summaries start before
user summaries finish. Observability here starts at coverage and ends at the one infrastructure gap
worth fixing: the UI runs as a single replica.

<!-- more -->

{% include project-nav.html %}

## Application and infrastructure monitoring
{: #application-and-infrastructure-monitoring }

| Layer | Signals |
|---|---|
| **Coverage** | People with collector data and a daily summary for yesterday, per team |
| **Jobs** | Last successful run per CronJob; run duration against its window; refresh Job failures |
| **AI** | Requests, tokens, throttling (429s) and latency per generator; cost per day |
| **UI** | `/api/health` (storage, cache, version), request latency and errors, search latency |

The shared infra chart already carries Grafana credentials, so dashboards can live there.

> **TODO:** What does the Grafana setup cover today, and which of these signals are on it?
{: .prompt-warning }

## Logging and log retention
{: #logging-and-log-retention }

Structured logs through the shared `setup_logging`, with component, person or team, date and period
on every line, make "why is this person's summary missing" one query. Two cautions for this project:

- Logs should record counts and IDs, not summary text or prompts. `VERBOSE_AI_LOGGING` is for local
  debugging only.
- Log retention should not outlive the agreed retention for the summaries themselves.

## Metrics and dashboards
{: #metrics-and-dashboards }

- Coverage heatmap: teams × last 14 days, % of people with a daily summary.
- Generator run time per job, with the next job's start time drawn on the chart (the team generator
  starts at 05:00 and waits at most 300 s for user summaries).
- Tokens and cost per day, split by user, team, epic and POD generators.
- Refresh requests per day and their success rate.
- AI throttling events.

## Distributed tracing
{: #distributed-tracing }

The interesting latency is inside the generators, not across services: per-person time split between
reading files, waiting on the AI and writing. A span per person with attributes for tokens and wait
time (OpenTelemetry, exported to the same backend as metrics) answers "why did today's run take twice as
long" directly. The UI's request path is short enough that tracing it is optional.

## Health checks
{: #health-checks }

`GET /api/health` already reports storage, cache and version, and `/api/storage-check` gives storage
diagnostics. Use them in two different probes:

- **Liveness**: process responds; nothing more, so a slow file share doesn't restart pods.
- **Readiness**: storage readable and Redis reachable.

For jobs, health is the CronJob status plus the coverage check.

## Alerting and escalation
{: #alerting-and-escalation }

| Alert | Condition | Goes to |
|---|---|---|
| Coverage drop | A team below 90% daily summaries by 06:00 UTC | Maintainers' channel |
| Generator failed | Any generator run failed | Maintainers' channel |
| Team ran early | Team generator timed out waiting for user summaries | Maintainers' channel |
| AI throttling | Sustained 429s from Azure OpenAI | Maintainers' channel |
| UI down | No ready pods for 5 minutes | On-call during business hours |
| Cost spike | Daily AI cost over 2× the 7-day average | Maintainers and the budget owner |

Business-hours escalation is enough; summaries can be regenerated later in the day.

## Availability and performance targets
{: #availability-and-performance-targets }

- **Coverage:** 95% of configured people have yesterday's daily summary by the start of the Americas'
  working day.
- **UI availability:** 99.5% in business hours.
- **Refresh:** a single-person refresh completes in a few minutes.

> **TODO:** Are there agreed targets for coverage and availability? These are suggested starting
> points.
{: .prompt-warning }

## Operational runbooks
{: #operational-runbooks }

```bash
# Regenerate one person's daily summary (the UI's Refresh does the same)
kubectl create job --from=cronjob/prod-user-summary-generator regen-$(date +%s) -n productivity
#   with TARGET_USER, TARGET_DATE and FORCE_REGENERATE=true set on the Job

# Re-collect missed days for everyone
#   run the collectors with days_to_collect=N and force_recollect=true

# Inspect what exists for a person and date
kubectl exec -n productivity deploy/productivity-ui -- \
  ls "/data/<dept>/<team>/Users/<user>/daily/$(date -u +%Y/%m/%d)"
```

Each belongs in the Taskfile as a named task, in line with the repo's "everything through `task`" rule.

## Incident and problem management
{: #incident-and-problem-management }

Incidents here are mostly **missing or wrong summaries**. The order of response: tell the affected
people or team, regenerate, then find the cause. Recurring causes go to problem management and get a
design fix: identity config errors (fix with a daily coverage check), AI throttling (fix with
parallelism or quota), clock-based ordering (fix with dependency triggers), prompt regressions (fix with
the regression set).

## Capacity and cost monitoring
{: #capacity-and-cost-monitoring }

**AI cost** is the main cost line and grows with every person added. Track tokens per summary type and
cost per person per month, and review it whenever a team or POD is onboarded.

**UI autoscaling.** The UI chart has the values but no template uses them:

```yaml
replicaCount: 1
autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 3
```

Add an HPA and a PodDisruptionBudget template (`autoscaling/v2`, CPU target from
`targetCPUUtilizationPercentage`, `minAvailable: 1`), set `enabled: true` and `minReplicas: 2` in the
AKS values, omit `replicas:` from the Deployment when autoscaling is on so ArgoCD doesn't fight the HPA,
and spread pods across nodes:

```yaml
# productivity-ui/helm/templates/hpa.yaml (helper names: match the chart's _helpers.tpl)
{% raw %}{{- if .Values.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "productivity-ui.fullname" . }}
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: {{ include "productivity-ui.fullname" . }} }
  minReplicas: {{ .Values.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.autoscaling.maxReplicas }}
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ include "productivity-ui.fullname" . }}
spec:
  minAvailable: 1
  selector:
    matchLabels: {{- include "productivity-ui.selectorLabels" . | nindent 6 }}
{{- end }}{% endraw %}
```

The specifics that make this safe for this app:

- **Redis** is its own Deployment, so every UI replica shares one cache.
- **Storage** is a read-only mount of a file share, which supports many readers.
- **Refresh status** must come from the Kubernetes Job API, not memory in one pod, so that whichever
  replica answers `/api/refresh/status` sees the same state.
- **Search** results cached in Redis are shared; uncached searches scan files on whichever pod receives
  them, which an index would make cheap on any replica.

Keep `values-local.yaml` at one replica.

> **TODO:** Is refresh status read from the Job API today, or tracked in the pod? It decides whether
> autoscaling is safe without code changes.
{: .prompt-warning }

## Checklist
{: #checklist }

- [ ] Coverage per team measured daily and alerted on
- [ ] AI tokens, throttling and cost per day on a dashboard
- [ ] Logs carry IDs and counts, never prompt or summary text
- [ ] Liveness simple; readiness checks storage and Redis
- [ ] Regenerate and re-collect runbooks available as tasks
- [ ] HPA and PDB added; min 2 replicas in AKS; refresh status confirmed stateless
- [ ] Cost reviewed at every team onboarding

{% include project-nav.html %}
