---
layout: post
title: "State of DevOps: Implementation"
date: 2026-10-05 00:09:00 +0530
categories: [projects, state-of-devops]
tags: [Projects, State of DevOps, Implementation]
description: "Building State of DevOps one analyzer at a time: the sub-analyzer pattern, Redis-memoized FastAPI endpoints, a Helm library chart and a visible tech-debt list."
project: state-of-devops
project_step: 9
image:
  path: /assets/img/projects/state-of-devops/09-implementation.webp
  alt: "State of DevOps: Implementation - Projects hero image"
---

Most of State of DevOps was implemented by one person, over 8 to 10 months, before the DevOps team
started contributing. Keeping that going for months depends on making the second analyzer cheaper than
the first, and the tenth cheaper still. This post is about the
patterns that did that, and the debt they left behind.

<!-- more -->

{% include project-nav.html %}

## Sprint or iteration planning
{: #sprint-or-iteration-planning }

Solo development doesn't need ceremonies, but it needs a cadence. The one I'd recommend for a project
like this is a two-week iteration with a single rule: **every iteration ends with a number someone can
see change.** A new check in the repo analyzer counts, a refactor alone doesn't.

With a team, the natural split follows the component boundaries: one person per analyzer per
iteration, and shared code changes reviewed by whoever owns `cronjobs/common/`.

> **TODO:** What cadence did the solo phase actually follow, and does the team now run sprints in Jira
> for this project?
{: .prompt-warning }

## Feature development
{: #feature-development }

Most features are **a new check**. The repo analyzer is built from sub-analyzers (branching,
documentation, codeowners, secrets, environments, properties, pr-health, rulesets, pull_request,
repository), and each one answers one family of questions for one repository. A new check slots into
that structure. In outline:

```python
# Sketch of the sub-analyzer shape; names simplified
class CodeownersAnalyzer:
    name = "codeowners"

    def __init__(self, client: GitHubAPIClient, config: dict):
        self.client, self.config = client, config

    def analyze(self, org: str, repo: dict) -> dict:
        paths = ["CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS"]
        found = next((p for p in paths if self.client.file_exists(org, repo["name"], p)), None)
        return {"repo": repo["name"], "has_codeowners": found is not None, "path": found}
```

The orchestration around it (iterate orgs, read the collector cache, call the sub-analyzers, write
`/data/devops-state/repo-analysis/{org}/{YYYY}/{MM}/{DD}/codeowners/`) is shared, so a new check is
mostly the `analyze` method plus a test.

A whole new domain (an analyzer per area of the future enterprise scorecard) repeats the same steps at a
larger scale: copy a component folder, change the domain name, add an output folder and a tab.

## API and UI implementation
{: #api-and-ui-implementation }

The backend is a FastAPI app with services behind the routes:

| Service | Responsibility |
|---|---|
| `storage_client` | Reads files from the local filesystem (k3d) or Azure Files (AKS) |
| `cache_client` | Redis memoization of expensive aggregations |
| `applications_service` | Application to Jira epic mappings from `applications/config/` |
| `ghas_service` | GHAS analyzer output |
| `cache_warmer` | Pre-fetches popular endpoints at startup |

The pattern that does most of the performance work is memoizing an aggregation by its inputs, which
here are the domain, org and date:

```python
# Sketch of the memoization idea; key includes the analysis date, so a new day is a new key
async def org_summary(domain: str, org: str, date: str) -> dict:
    key = f"summary:{domain}:{org}:{date}"
    if (hit := await cache.get(key)) is not None:
        return hit
    summary = await build_summary(domain, org, date)   # reads many JSON files; off the event loop via asyncio.to_thread
    await cache.set(key, summary, ttl=6 * 3600)
    return summary
```

Because data only changes once a day, the date in the key does the invalidation for free.

On the frontend, each domain gets an org list page and a repo detail page, wired through React Router,
with Axios calls wrapped in one API client and shared table chrome (`Pagination`, refresh buttons,
the Jira modal).

## Database and infrastructure implementation
{: #database-and-infrastructure-implementation }

There's no database to implement; storage is Azure Files, and the "schema" is the path layout built by
each job's storage client (see [Data and Integration](/posts/projects/state-of-devops/07-data-and-integration/#database-schema-and-migrations)).

The infrastructure implementation is Helm, in three layers:

- **`cronjob-library`**: a library chart with the CronJob and ConfigMap templates every job uses.
- **`cronjob-shared-infra`**: provisions the `cron-jobs` ServiceAccount, the ExternalSecrets and the
  shared PVC `cron-jobs-data-pvc` in the `cronjobs` namespace.
- **One chart per component**: mostly values, including the schedule, resources (analyzers request
  `200m / 512Mi` and limit at `1000m / 1Gi`; lighter jobs `100m / 256Mi` to `500m / 512Mi`) and
  `configYaml`.

The dashboard chart adds the Deployment, Service, Ingress, Redis, the Azure Files PV/PVC and its own
ServiceAccount for Workload Identity.

## Integration development
{: #integration-development }

Each external system got one shared client in `cronjobs/common/`, written once and reused everywhere:

| Module | Integration |
|---|---|
| `github_api_client.py` | GitHub REST + GraphQL, rate-limit aware, retries |
| `github_app_auth.py` | `GitHubAppTokenManager`: per-org App JWT, cached installation tokens |
| `fileshare_storage_client.py` | Azure Files with the credential chain |
| `jira_api_client.py`, `jira_story_creator.py` | Jira stories from the dashboard |
| `teams_notifier.py` | Teams webhook messages |

The biggest integration change was the move to a central collector: `github-data-collector` fetches the
shared repository data once with ETags, and the analyzers read it from `/data/github-data/` before
calling the API for anything domain-specific. If I were starting again, I'd build the collector first.

## Technical debt tracking
{: #technical-debt-tracking }

Debt in this project is known and listable, which is the best kind. The current list:

| Debt | Why it matters | Where it's addressed |
|---|---|---|
| Dashboard runs 1 replica; `autoscaling` values exist but no HPA template | No redundancy during node drains or upgrades | [Operations](/posts/projects/state-of-devops/14-operations-and-observability/#capacity-and-cost-monitoring) |
| Jobs ordered by clock, not by dependency | Trends can read yesterday's repo data | [Continuous Improvement](/posts/projects/state-of-devops/18-continuous-improvement/#architecture-reviews) |
| No pruning of daily outputs | Storage grows forever | [Data](/posts/projects/state-of-devops/07-data-and-integration/#data-retention-and-deletion) |
| Create React App is unmaintained | Build tooling will age out | [Continuous Improvement](/posts/projects/state-of-devops/18-continuous-improvement/#architecture-reviews) |
| Storage key fallback in production | Broad credential that isn't needed | [Security](/posts/projects/state-of-devops/06-security-and-privacy/#secrets-and-key-management) |
| Docs drifted (CRA vs Vite) | Contributors get wrong instructions | [Documentation](/posts/projects/state-of-devops/15-documentation-and-knowledge-transfer/#architecture-documentation) |

I'd keep this table as a Jira epic with a label, and spend roughly one iteration in five on it.

## Code reviews
{: #code-reviews }

During the solo phase there was nobody to review, which is the normal reality of one-person projects.
The substitutes are CI (SonarQube, CodeQL, tests) and a self-review pass the next day. With the team on board, the repo's `CODEOWNERS`
file gives every component a reviewer.

For this codebase, the review question that matters most isn't style: **"could this change move a
number on the dashboard?"** If yes, the PR needs a before/after comparison for at least one org, because
executives will notice the jump before the reviewer does.

## Developer documentation
{: #developer-documentation }

The developer docs that pay for themselves here are short and specific:

- `cronjobs.md`: one table per job with schedule, source, reads, writes and env.
- `storage.md`: the `/data` tree, so nobody invents a new path.
- `deployment.md`: the build / import / deploy trio and the roll-up tasks.
- Docstrings on the shared clients in `cronjobs/common/`, since everyone calls them.

What's missing is a "how to add an analyzer" page that walks the steps in
[Feature development](#feature-development) end to end. It's the most common task and the one a new
team member is most likely to get subtly wrong.

## Checklist
{: #checklist }

- [ ] Each iteration ends with a visible change on the dashboard
- [ ] New checks follow the sub-analyzer shape with a test fixture
- [ ] Expensive endpoints memoized in Redis with the date in the key
- [ ] Every external call goes through a shared client in `cronjobs/common/`
- [ ] Tech-debt table kept as a labelled Jira epic and reviewed each iteration
- [ ] PRs that can move a number include a before/after comparison
- [ ] "How to add an analyzer" guide written

{% include project-nav.html %}
