---
layout: post
title: "Y-IaC: Data and Integration"
date: 2026-10-05 00:07:00 +0530
categories: [projects, y-iac]
tags: [Projects, Y-IaC, Data, Integration]
description: "Data in Y-IaC is state, YAML, plans and evidence: who owns each, how long it's kept, how imports reconcile, and how state is backed up and restored."
project: y-iac
project_step: 7
image:
  path: /assets/img/projects/y-iac/07-data-and-integration.webp
  alt: "Y-IaC: Data and Integration - Projects hero image"
---

Y-IaC has no database, and that makes it easy to forget that it's full of data. Every unit has a state
file, every run produces plans and reports, and every consumer's YAML is a declaration of what should
exist. Lose a state file and Terraform thinks a production resource doesn't exist. This post is about
who owns each piece of that data, how it moves, and how we get it back.

<!-- more -->

{% include project-nav.html %}

## Data ownership and classification
{: #data-ownership-and-classification }

| Data | Owner | Classification (recommended) |
|---|---|---|
| Module source, unit templates, `root.hcl`, CLI, workflows | Platform team | Internal |
| Config catalog (`config/`: providers, policies, scanners, error catalog) | Platform team | Internal |
| Consumer YAML (`config.yaml`, `common_vars.yaml`, `resources.yaml`) | Consumer team | Internal; may reveal topology |
| Terraform state, one file per unit | Consumer team, stored in the consumer's backend | Confidential: can hold secrets |
| Plan files, plan JSON, summaries, logs | Consumer team, produced by shared workflows | Confidential |
| Drift tickets, Teams messages | Consumer team; platform owns the integration | Internal |
| The resources themselves | Cloud and service owners | Per workload |

The split matters when something goes wrong. If a state file is damaged, the consumer owns the recovery
decision, but the platform team owns the tooling and the runbook. That shared ownership should be in the
operating agreement, not discovered during the incident.

## Data retention and deletion
{: #data-retention-and-deletion }

| Data | Default today | Recommendation |
|---|---|---|
| State | Kept while the resource exists | Keep, with backend versioning; delete only after `destroy` and a grace period |
| State versions | Depends on backend settings | 30 to 90 days of versions, then lifecycle-delete |
| Workflow artifacts (plans, reports) | 7 days (`retention-days: 7`) | Keep short for plans (sensitive diffs); export summaries if needed for audit |
| Local `.terragrunt-cache/`, `.terragrunt-stack/` | Until the next run cleans it | Treat as disposable; never commit |
| Local state under `~/tf-backend` (labs) | Forever | Developer's responsibility |
| Jira drift tickets | Jira project retention | Follow the project's policy |

Deletion has one sharp edge: removing a stack folder from a consumer doesn't destroy anything. The
resources and their state stay where they are, now unmanaged. Decommissioning a stack is always
`destroy` first, folder second.

Following the regulatory baseline, production evidence records are kept for six years; non-production
for one year. Raw plan files stay at seven days in both cases.

## Database schema and migrations
{: #database-schema-and-migrations }

The "schemas" in Y-IaC are the YAML shapes and the Terraform state format. Both migrate:

- **YAML shapes.** When a module's input changes shape, the unit template should accept both the old and
  the new shape for at least one release (`try()` with a fallback is the usual pattern) and the
  CHANGELOG should say when the old shape stops working.
- **Resource addresses in state.** When a module renames or restructures a resource, use a `moved` block
  in the module so existing state follows without a destroy and create. Without it, every consumer's
  next plan shows a replacement.
- **State format.** Terraform upgrades the state format on write; a consumer that plans with a newer
  Terraform than another can't go back. Pin Terraform per consumer and upgrade deliberately.
- **Layout migrations.** The move from `python/lib/` to the `src/` package kept a fallback import in the
  stub, so consumers that hadn't re-synced kept working. That's the pattern to repeat.

## Data validation and quality
{: #data-validation-and-quality }

Validation happens before any data reaches Terraform:

- **Duplicate declarations.** YAML silently keeps the last of two identical keys, so two
  `azurerm_federated_identity_credential:` blocks in one file would quietly drop the first. The resources
  linter (`generators/resources_lint.py`) catches that before the stack is generated.
- **Empty or config-only files.** The stack generator rejects a `resources.yaml` that contains only
  scalars and no resource lists, with an example of what it expected.
- **Unit-level defaults.** Unit templates use `try()` with sensible defaults for optional fields, so a
  minimal YAML entry still produces a valid module input.
- **Module schema checks.** The module validator compares a module's resource arguments against the
  provider schema (`validation/schema.py`), catching arguments the pinned provider doesn't support.
- **Policy on the result.** OPA checks the plan, so even valid YAML that produces a non-compliant
  resource is caught.

What's missing is a formal schema per resource type. A JSON Schema generated from each module's
`variables.tf` would let editors validate `resources.yaml` as people type.

## Import and export requirements
{: #import-and-export-requirements }

**Import** brings existing resources under management without recreating them. Y-IaC supports it two
ways:

1. **Manual import** through the CLI's import action, with provider paths normalized by
   `import_id_normalization` in `config/config.yaml` (Azure returns `microsoft.insights` in some IDs;
   Terraform expects `Microsoft.Insights`).
2. **Auto-import** (`config/auto-import.yaml`, `handlers/terragrunt/auto_import.py`). For each supported
   type it describes how to find the real resource (for example `az group show --name {target.name}`),
   how to build the import ID, and when to ask for confirmation (`each`, `all` or `none`).

Either way, the acceptance test is the same: the next plan shows **no changes**. If it shows changes, the
YAML doesn't match reality yet and must be fixed before any apply.

**Export** is mostly plan JSON (for gates and reports) and the resource inventory visualization
(`--python visualize`, which writes `architecture.py` and an SVG under `docs/<name>/` without calling any
cloud API).

## External systems and third-party integrations
{: #external-systems-and-third-party-integrations }

| System | Direction | Auth | Failure behavior |
|---|---|---|---|
| Azure, AWS, GCP APIs | Out | Service principal or user login, keys, ADC | Plan fails; transient errors retried by `root.hcl` |
| GitHub API (github provider) | Out | `GH_TOKEN` | Plan fails |
| JFrog, Grafana, Zscaler ZPA, ArgoCD, Helm, Kubernetes | Out | Tokens and URLs from env | Plan fails for that unit |
| State backends | Both | `BACKEND_*` or same identity | Init fails; backend timeouts retried |
| Terraform registry | In | None | Init fails; plugin cache helps |
| Wiz | Out | `WIZ_CLIENT_ID`, `WIZ_CLIENT_SECRET` | Missing binary or credentials: warn and skip |
| Infracost | Out | API key | Gate skipped if disabled (default) |
| Microsoft Teams | Out | Webhook URL | Notification job fails, apply unaffected |
| Jira | Out | `JIRA_USERNAME`, `JIRA_API_TOKEN`, `JIRA_URL` | Job fails red; skips if config absent |

The "warn and skip" behavior for Wiz is worth a decision. It's friendly in development, but in a
production pipeline a missing scanner silently turns a mandatory gate into no gate.

## Event and messaging contracts
{: #event-and-messaging-contracts }

Three outbound messages have contracts that other people rely on:

- **Drift ticket (Jira).** One ticket per repository, summary `IaC Drift: <owner>/<repo>`, label
  `iac-drift`. A new finding comments on the open ticket; a closed ticket means a new one. Each body
  carries a fingerprint marker ({% raw %}`{{iac-drift-fingerprint:<hash>}}`{% endraw %}) so unchanged drift doesn't add
  duplicate comments. Priority escalates on destroys or failed stacks.
- **Teams notification.** Sent when drift is found or stacks fail to plan, from the same analysis
  outputs as the ticket.
- **GitHub to Jira webhook.** Runs after a PR plan (on open) and after an apply on `main`, linking the
  change to its ticket.

These contracts change when the workflow changes, so their shape belongs in the workflow docs
(`04g` and `04j` in `docs/getting-started/`) and changes belong in the CHANGELOG.

## Backup and restore strategy
{: #backup-and-restore-strategy }

State is the only data that can't be regenerated. YAML lives in Git; generated files are rebuilt on
every run; plans can be recomputed. So backup is about state:

| Backend | Backup mechanism | Restore |
|---|---|---|
| azurerm | Blob versioning and soft delete on the storage account | Promote a previous blob version, then plan to confirm |
| s3 | Bucket versioning | Restore the previous object version |
| gcs | Object versioning | Restore the previous generation |
| local | None (lab use only) | Rebuild or re-import |

Restore runbook outline: stop pipelines for that consumer, take a copy of the current state, restore the
previous version, run a plan, and expect it to show only the changes made since that version. If it
shows more, import or fix before any apply.

Versioning is on for the Azure Blob state storage, and a restore has been rehearsed. Repeating it on a
schedule keeps it that way (see [Backup verification](/posts/projects/y-iac/16-support-and-maintenance/#backup-verification)).

## Data migration and reconciliation
{: #data-migration-and-reconciliation }

Migrations Y-IaC has to support:

- **Moving resources between stacks** (`terragrunt state mv` across state files, or remove and import).
- **Changing a consumer's backend** (for example from local to azurerm): `init -migrate-state` per unit,
  then confirm every unit plans clean.
- **Renaming a stack folder**, which changes every state key under it because the key includes the unit
  path. Treat it as a backend migration, not a rename.
- **Adopting existing infrastructure** through import or auto-import.

Every migration ends with reconciliation: a plan per affected unit showing no unexpected changes, a
record of the original resource IDs, and the consumer and platform teams both signing off. The cutover
and rollback steps are owned jointly, as the guide says, and I'd write them per migration rather than
pretend one template fits all.

## Checklist
{: #checklist }

- [ ] Data classification for state, plans and artifacts is agreed and documented
- [x] Versioning is on for Azure Blob state storage; S3 and GCS to match
- [x] A state restore has been rehearsed; repeat it on a schedule
- [ ] Stack decommissioning is documented as destroy first, folder second
- [ ] Modules that restructure resources use `moved` blocks
- [ ] Wiz "warn and skip" is turned into a failure for production pipelines
- [ ] Drift ticket and Teams payload shapes are documented with the workflows
- [ ] A JSON Schema per resource type is on the backlog

{% include project-nav.html %}
