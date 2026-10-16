---
layout: post
title: "State of DevOps: Operations and Observability"
date: 2026-10-05 00:14:00 +0530
categories: [projects, state-of-devops]
tags: [Projects, State of DevOps, Observability, Operations]
description: "Running State of DevOps: job and data-freshness alerts, health probes, runbooks, and the HPA design that turns the single dashboard replica into two to three."
project: state-of-devops
project_step: 14
image:
  path: /assets/img/projects/state-of-devops/14-operations-and-observability.webp
  alt: "State of DevOps: Operations and Observability - Projects hero image"
---

Operating State of DevOps is mostly about one question asked every morning: **did last night's jobs
run, and is today's data complete?** The dashboard can be perfectly healthy while showing yesterday's
numbers, and nobody notices until someone quotes them in a meeting. So observability here starts with
data freshness, not CPU graphs. It ends with fixing the one known availability gap: the dashboard runs
as a single replica.

<!-- more -->

{% include project-nav.html %}

## Application and infrastructure monitoring
{: #application-and-infrastructure-monitoring }

Three layers to watch, in order of how often they cause trouble:

| Layer | Signals |
|---|---|
| **Jobs** | Last successful run per CronJob, run duration against its schedule window, failed Job pods, `BackoffLimitExceeded` |
| **Data** | Today's folder exists per domain and org, `generated_at` in `metadata.json` is today, `home-overview.json` written after 07:00 UTC |
| **Dashboard** | Pod ready, request latency and 5xx rate, Redis hit rate, Azure Files read latency |

Kubernetes already exposes the job signals (kube-state-metrics has `kube_cronjob_status_last_successful_time`
and `kube_job_status_failed`). The data signals need a small check, which fits naturally in the
summary generator since it reads everything anyway.

> **TODO:** What monitoring stack covers this cluster today (Azure Monitor Container Insights,
> Prometheus and Grafana, something else)?
{: .prompt-warning }

## Logging and log retention
{: #logging-and-log-retention }

Every component logs through the shared `setup_logging`, which is the right place to enforce structure:
JSON lines with `component`, `org`, `run_date` and, for the API, `path` and `status`. With that, "show
me everything the repo analyzer logged about org X last night" is one query.

Retention follows two needs: short for debugging (30 days of application logs is plenty) and longer for
audit-relevant events (who created which Jira story, deployment history), which should follow the
organization's audit log policy.

## Metrics and dashboards
{: #metrics-and-dashboards }

An operations dashboard for the tool itself (not to be confused with the tool) needs only a few panels:

- A grid of CronJobs × last 7 days, green or red per run.
- Job duration per run, with the schedule window drawn as a line.
- Data freshness per domain: hours since last `generated_at`.
- Dashboard API p95 latency and error rate; replicas over time once the HPA is on.
- GitHub API rate limit remaining per GitHub App installation.

The last panel is the early warning for most job failures: when an App runs out of budget, every job
using it fails at once.

## Distributed tracing
{: #distributed-tracing }

Tracing has limited value here. Requests are short (browser → FastAPI → Redis or Azure Files), and the
jobs are batch processes, not chains of services. OpenTelemetry auto-instrumentation for FastAPI is
cheap to add and would show where slow requests spend their time (Redis miss versus file reads), but
I'd do it after the job and data alerts, not before.

## Health checks
{: #health-checks }

The dashboard has `GET /api/health` for its probes. Two refinements make it more useful:

- Keep the **liveness** probe dumb (the process responds), so a slow file share doesn't restart pods.
- Make **readiness** check its dependencies lightly: Redis reachable, `/data` mounted and readable.
  A pod that can't read the share shouldn't receive traffic, and with two or more replicas the others
  keep serving.

For the jobs, the "health check" is the CronJob status plus the data freshness check above.

## Alerting and escalation
{: #alerting-and-escalation }

| Alert | Condition | Severity | Goes to |
|---|---|---|---|
| Job failed | Any daily CronJob's last run failed | Warning | DevOps Teams channel |
| Data stale | `home-overview.json` not written by 08:00 UTC | High | DevOps Teams channel + owner |
| Dashboard down | No ready pods for 5 minutes | High | DevOps on-call during business hours |
| Rate limit low | An App below 10% of its hourly budget | Warning | DevOps Teams channel |
| Backup missing | No share snapshot in 26 hours | Warning | DevOps Teams channel |

Escalation stays inside the DevOps team: this is a business-hours service, and nothing here justifies
waking anyone up.

> **TODO:** Which alerts exist today, and where do they go?
{: .prompt-warning }

## Availability and performance targets
{: #availability-and-performance-targets }

The targets agreed with stakeholders:

- **Data freshness:** today's data available by 08:00 UTC on 95% of days.
- **Dashboard availability:** 99.5% during business hours.
- **Performance:** Home under 1 second (one pre-computed file); analysis tabs under 3 seconds at p95
  with a warm cache.

The single replica makes the availability target hard to meet: every node drain, AKS upgrade or pod
reschedule is an outage of a minute or two. That's the main reason for the autoscaling change below,
more than load.

## Operational runbooks
{: #operational-runbooks }

The three runbooks used most:

```bash
# 1. Re-run a failed job for today
kubectl create job --from=cronjob/devops-repo-analyzer rerun-$(date +%s) -n cronjobs
kubectl logs -f job/rerun-<id> -n cronjobs

# 2. Regenerate the Home page after a re-run
kubectl create job --from=cronjob/devops-summary-generator resum-$(date +%s) -n cronjobs

# 3. Check what's on the share for today
kubectl exec -n state-of-devops deploy/devops-state-dashboard -- \
  ls /data/devops-state/summaries/$(date -u +%Y/%m/%d)/
```

Each should become a `task` (for example `task rerun -- devops-repo-analyzer`), in line with the
project's rule that every operation goes through the Taskfile. More runbooks are listed in
[Documentation](/posts/projects/state-of-devops/15-documentation-and-knowledge-transfer/#operations-runbooks).

## Incident and problem management
{: #incident-and-problem-management }

Incidents here are rarely outages; they're **wrong or missing numbers**. The incident process should
treat them that way: when a number is wrong, first put a note on the dashboard (or hide the tab through
`/api/sidebar-config`), then fix, re-run the affected days, and remove the note.

Problem management is where the recurring causes go: rate-limit exhaustion, the clock-based schedule
letting trends read stale input, a GitHub API change. Each recurrence should end in a change to the
design, not just another re-run.

## Capacity and cost monitoring
{: #capacity-and-cost-monitoring }

**Dashboard autoscaling.** The chart already has the values, but no template uses them:

```yaml
# values.yaml today
replicaCount: 1
autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 3
  targetCPUUtilizationPercentage: 80
```

The change is a HorizontalPodAutoscaler template, a PodDisruptionBudget, and different defaults:

```yaml
# devops-state-dashboard/helm/templates/hpa.yaml
{% raw %}{{- if .Values.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "devops-state-dashboard.fullname" . }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "devops-state-dashboard.fullname" . }}
  minReplicas: {{ .Values.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.autoscaling.maxReplicas }}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.autoscaling.targetCPUUtilizationPercentage }}
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ include "devops-state-dashboard.fullname" . }}
spec:
  minAvailable: 1
  selector:
    matchLabels:
      {{- include "devops-state-dashboard.selectorLabels" . | nindent 6 }}
{{- end }}{% endraw %}
```

```yaml
# values.yaml (AKS)
autoscaling:
  enabled: true
  minReplicas: 2        # 2, not 1: the point is surviving node drains
  maxReplicas: 3
  targetCPUUtilizationPercentage: 70
```

The Deployment template should also skip `replicas:` when autoscaling is enabled (otherwise every
ArgoCD sync fights the HPA), and spread pods across nodes with a `topologySpreadConstraints` on
`kubernetes.io/hostname`. The helper names above follow the usual Helm scaffold; match them to the
chart's `_helpers.tpl`.

Three things make this safe for this app specifically:

- **Shared cache.** Redis is Azure Cache for Redis, outside the pods, so every replica sees the same
  cache.
- **Shared data.** The Azure Files volume is ReadWriteMany, so extra pods mount it with no storage
  changes. The one write path to watch is the dormant-users upload, which two pods could race on.
- **Cache warmer.** It runs on each pod's startup, so scaling to three warms three times. The work is
  idempotent and Redis absorbs it, but a short Redis lock (`SET warm:<date> NX EX 600`) avoids the
  duplicate load.

Keep `values-local.yaml` at `enabled: false` with one replica, since k3d gains nothing from it.

**Cost.** The cost analyzer already reports GitHub, JFrog and Azure spend for the organization. The
project's own cost (job pods, one to three dashboard pods, the share, Redis) should appear in the same
view, tagged as its own line.

## Checklist
{: #checklist }

- [ ] Alerts on job failure, stale data and dashboard down, each fired once on purpose
- [ ] Data freshness check written by the summary generator and shown on Home
- [ ] Structured JSON logs with component, org and run date
- [ ] Readiness probe checks Redis and the `/data` mount; liveness stays simple
- [ ] HPA and PDB templates added; `autoscaling.enabled: true`, min 2, max 3 in AKS values
- [ ] Deployment omits `replicas:` when autoscaling is on; pods spread across nodes
- [ ] Cache warmer guarded with a Redis lock
- [ ] Re-run and regenerate runbooks available as tasks

{% include project-nav.html %}
