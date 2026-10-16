---
layout: post
title: "Productivity Dashboard: Implementation"
date: 2026-10-05 00:09:00 +0530
categories: [projects, productivity-dashboard]
tags: [Projects, Productivity Dashboard, Implementation]
description: "Implementing the Productivity Dashboard: parallel per-person generation, a provider-agnostic AI client, branch-to-story linking, UI-launched refresh Jobs, and the debt list."
project: productivity-dashboard
project_step: 9
image:
  path: /assets/img/projects/productivity-dashboard/09-implementation.webp
  alt: "Productivity Dashboard: Implementation - Projects hero image"
---

Implementation on the Productivity Dashboard splits cleanly into two kinds of work. There's ordinary
software (collectors, file layouts, a FastAPI app, Helm charts), and there's prompt work, which looks
like editing text files and behaves like changing business logic for every person at once. The first
five months were one person doing both; this post covers the patterns that made that manageable and
the debt that's left.

<!-- more -->

{% include project-nav.html %}

## Sprint or iteration planning
{: #sprint-or-iteration-planning }

For a project whose output is read every morning, the iteration that works is short and output-led:
each iteration ends with a change someone can *read*, such as a better weekly summary, a new view or a
new POD. Prompt tuning, which the brief describes as ongoing, fits best as a standing slot in every
iteration rather than a one-off project.

> **TODO:** What cadence did the solo phase follow, and how does the team plan work now?
{: .prompt-warning }

## Feature development
{: #feature-development }

Most features are one of three things:

1. **A new summary level or period**: a generator (or a prompt in an existing one) plus a page or tab.
2. **A new grouping**: PODs are the example, a cross-team view defined entirely by a Jira label and a
   member list in configuration.
3. **A prompt improvement**: tighter instructions, better grouping, less filler.

The user generator shows the core pattern: per-person work in parallel, each person independent.

```python
# Sketch of the per-person fan-out; real names differ
with ThreadPoolExecutor(max_workers=config.max_parallel_users) as pool:   # MAX_PARALLEL_USERS, default 4
    futures = {pool.submit(generate_for_user, person, target_date, period): person
               for person in people_from_env()}
    for future in as_completed(futures):
        log_result(futures[future], future.exception())
```

One failed person doesn't fail the run, and the parallelism is the knob to turn against the AI
deployment's rate limit.

## API and UI implementation
{: #api-and-ui-implementation }

The backend is four services behind FastAPI routes: `StorageClient` (filesystem in k3d, Azure Files in
AKS), `SearchService` (full text across summaries), `CacheService` (Redis) and `RefreshService`.

Refresh is the interesting one: the UI creates a Kubernetes Job that runs a generator for one target.
Built safely, it takes only identifiers and fills a fixed template:

```python
# Sketch: only known identifiers reach the Job spec
def start_refresh(kind: str, target: str, date: str) -> str:
    if kind not in GENERATOR_IMAGES or target not in known_targets(kind):
        raise HTTPException(400, "unknown refresh target")
    job = job_template(image=GENERATOR_IMAGES[kind],
                       env={"TARGET_USER" if kind == "user" else "TARGET": target,
                            "TARGET_DATE": date, "FORCE_REGENERATE": "true"})
    return batch_api.create_namespaced_job("productivity", job).metadata.name
```

The frontend is page-per-level (`HomePage`, `UserDetailPage`, `TeamDetailPage`, `EpicDetailPage`,
`PodPage`) with shared components for filters, tabs, Markdown rendering, timeline, search, refresh and
export.

## Database and infrastructure implementation
{: #database-and-infrastructure-implementation }

No database: storage is the `/data` layout built by `path_utils` (`build_user_path`,
`build_date_path`, `build_summary_path`). Infrastructure is Helm: a chart per collector and generator
(CronJob plus `configYaml`), the UI chart (Deployment, Service, Ingress, ConfigMap, Redis Deployment
and Service, Role and RoleBinding, PV/PVC), and `productivity-shared-infra` for the ClusterSecretStore,
ExternalSecrets and the shared volume.

## Integration development
{: #integration-development }

Two integrations carry most of the logic:

- **`BaseAIClient`**: one interface over Azure OpenAI, OpenAI and LM Studio (which speaks the
  OpenAI-compatible API), selected by `ai_provider`. Generators never import a provider SDK directly,
  which is what makes local development free and provider changes a config change.
- **`GitHubLinker`** in the epic collector: maps branch names to Jira story keys so code work shows up
  under the right epic. The usual rule is a key pattern in the branch name:

```python
STORY_KEY = re.compile(r"\b([A-Z][A-Z0-9]+-\d+)\b")      # e.g. PROJ-1234-add-retry
def story_for_branch(branch: str) -> str | None:
    m = STORY_KEY.search(branch.upper())
    return m.group(1) if m else None
```

It works because the branch naming convention already includes the Jira key, which is a nice example
of a team habit making automation possible.

## Technical debt tracking
{: #technical-debt-tracking }

| Debt | Why it matters | Covered in |
|---|---|---|
| UI runs 1 replica; `autoscaling` values unused | Outage on every node drain | [Operations](/posts/projects/productivity-dashboard/14-operations-and-observability/#capacity-and-cost-monitoring) |
| No retention or pruning of personal data | Policy and storage growth | [Data](/posts/projects/productivity-dashboard/07-data-and-integration/#data-retention-and-deletion) |
| Collected data scope differs from the stated intent (comments) | Privacy | [Security](/posts/projects/productivity-dashboard/06-security-and-privacy/#privacy-and-data-protection-requirements) |
| Search scans files | Slows as history grows | [Architecture](/posts/projects/productivity-dashboard/05-technical-architecture/#scalability-and-performance-strategy) |
| Team moves split a person's history | Incomplete monthly summaries | [Data](/posts/projects/productivity-dashboard/07-data-and-integration/#data-migration-and-reconciliation) |
| Jobs ordered by clock (except the team wait) | Late collector means stale summaries | [Continuous Improvement](/posts/projects/productivity-dashboard/18-continuous-improvement/#architecture-reviews) |
| No frontend tests | UI regressions unnoticed | [QA](/posts/projects/productivity-dashboard/10-quality-assurance/#unit-testing) |
| Source and prompts duplicated in `prod-*/` and `productivity-tools/`; images build from the latter | Edits to the wrong copy silently do nothing | [Development Preparation](/posts/projects/productivity-dashboard/08-development-preparation/#repository-and-branching-strategy) |
| Docs drifted (charts, POD generator name) | Wrong instructions | [Documentation](/posts/projects/productivity-dashboard/15-documentation-and-knowledge-transfer/#architecture-documentation) |

## Code reviews
{: #code-reviews }

Code reviews here have two modes. Ordinary code is reviewed as usual. **Prompt changes** are reviewed by
reading output: the PR shows old and new summaries for the same few people and days, and the reviewer
judges accuracy, tone and format. A prompt diff on its own tells you almost nothing about what the
model will write.

## Developer documentation
{: #developer-documentation }

The repo docs cover each cronjob (inputs, outputs, env, prompts), the storage layout, the UI API and the
tech stack. The missing pages, in order of value:

1. How to add a person, team or POD (the configuration steps, end to end).
2. How to change a prompt safely (local run with LM Studio, side-by-side samples, review).
3. How to add a new summary level.

## Checklist
{: #checklist }

- [ ] Prompt tuning has a standing slot in each iteration
- [ ] Per-person generation isolated so one failure doesn't stop the run
- [ ] Refresh accepts only known identifiers and a fixed Job template
- [ ] All AI calls go through `BaseAIClient`
- [ ] Tech-debt table kept as a labelled Jira epic
- [ ] Prompt PRs include before/after samples
- [ ] "Add a person, team or POD" guide written

{% include project-nav.html %}
