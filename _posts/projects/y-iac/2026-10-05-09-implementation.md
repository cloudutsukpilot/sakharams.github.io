---
layout: post
title: "Y-IaC: Implementation"
date: 2026-10-05 00:09:00 +0530
categories: [projects, y-iac]
tags: [Projects, Y-IaC, Implementation]
description: "How Y-IaC changes are built: the eight-step change sequence, adding a module end to end, CLI and integration work, and a concrete technical debt list."
project: y-iac
project_step: 9
image:
  path: /assets/img/projects/y-iac/09-implementation.webp
  alt: "Y-IaC: Implementation - Projects hero image"
---

Most Y-IaC work is small and repetitive: add a resource type, fix a unit template, tighten an error
message. The trick is that a small change in a shared path still lands in every consumer. So
implementation here is less about writing code fast and more about following the same sequence every
time, so that nothing reaches a consumer unannounced.

<!-- more -->

{% include project-nav.html %}

## Sprint or iteration planning
{: #sprint-or-iteration-planning }

There's already a backlog seed in the repo: `terragrunt_shared_module-stories.json` holds an epic and 92
stories (one per module family, plus CLI, workflow and policy work), all still marked pending. Importing
them into the tracker is the first planning task, because right now the work is real but invisible.

For iterations I'd use two-week cycles with a fixed split:

| Share | Work |
|---|---|
| ~50% | Roadmap items from the current [milestone](/posts/projects/y-iac/03-product-planning/#release-milestones) |
| ~30% | Consumer requests (new resource types, fixes) |
| ~20% | Debt and "Pending Verification" items |

The 20% is not optional. On a shared platform, debt compounds across consumers.

The DevOps team does this work alongside its other platform duties, so the split is a share of the
team's Y-IaC capacity in each iteration rather than a separate team's sprint.

## Feature development
{: #feature-development }

Every change follows the same eight steps, from the guide:

1. Confirm the contract, affected consumers, risk and acceptance criteria.
2. Change the smallest owning piece: one module, one CLI component, one workflow or one config file.
3. Add or update focused tests and fixtures.
4. Update the module README, import example, troubleshooting guide and CHANGELOG if users will notice.
5. Run focused validation, then the relevant test category.
6. Run cross-module or compatibility checks if a shared interface changed.
7. Review generated output and confirm plans stay non-destructive in a scratch consumer.
8. Merge through the PR gates and announce the change.

Step 7 is the one that catches what tests don't. Generated output (`terragrunt.stack.hcl`, `provider.tf`)
is the real interface consumers depend on, so a diff of generated files before and after the change is
the best review artifact there is.

## API and UI implementation
{: #api-and-ui-implementation }

Y-IaC's "API and UI" is the CLI. A new CLI capability touches a predictable set of files:

| Piece | File |
|---|---|
| Argument | `cli/parser.py` |
| Validation | `cli/arg_validation.py` |
| Environment export | `cli/env_export.py` (if `root.hcl` or a gate needs it) |
| Dispatch | `cli/dispatch.py` → `handlers/` |
| Banner | `cli/banner.py` (show the new choice before running) |
| Tests | `tests/test_cli_*.py`, `test_cli_dispatch.py` |
| Docs | `docs/getting-started/05` and `06`, plus `09` if consumers configure it |

The rule I'd keep: CLI arguments map to environment variables in one table (`TARGET_ENV_MAP` in
`env_export.py`), so `root.hcl`, the gates and the CLI all read the same names.

## Database and infrastructure implementation
{: #database-and-infrastructure-implementation }

Adding a module is the most common infrastructure task. For a new Azure type, end to end:

```text
cloud/azure/terraform/azurerm_example/
├── main.tf          # for_each over a map input
├── variables.tf     # typed map(object({...})) with optional() defaults
├── outputs.tf       # ids and names, keyed like the input
├── data.tf          # optional lookups
├── README.md        # inputs, outputs, YAML example, import command
└── best-practices.md
                     # no provider or backend block: root.hcl generates both

cloud/azure/terragrunt/azurerm_example/
└── terragrunt.hcl   # include root, read resources.yaml + common_vars, map to inputs,
                     # dependency blocks with mock_outputs where needed
```

Then: run `python tools/validate_terraform_module.py` for the module (fmt, init without backend,
provider schema, validate, TFLint, README checks, `terragrunt hcl format --check`), add the type to
`config/resource_categories.yaml` (multi-file stacks are checked by the `resource_file_placement` OPA
policy, so every type needs exactly one category), and plan it from a scratch consumer.

The `.github/prompts/` and `.github/skills/` new-resource guides encode this so assistants and people
build modules the same way.

## Integration development
{: #integration-development }

Integrations (gates, Jira, Teams, new providers) follow one pattern in the code that's worth
preserving: **optional and fail-soft, unless configured to block.** The runner loads a gate through
`_invoke_optional_gate`, so a missing tool or module warns instead of crashing, and enforcement level
decides whether a finding blocks.

For a new provider family (for example a new SaaS provider):

1. Add its version to `config/providers.yaml`.
2. Add a `needs_<provider>` flag, `required_providers` entry and provider block to `template/root.hcl`,
   reading credentials from env vars only.
3. Route its modules: under `providers/` if the environment name selects it (`PROVIDER_ENVIRONMENTS` in
   `generators/source_paths.py`), under `cloud/` otherwise.
4. Teach `environment/` how to pre-flight its credentials.
5. Document it in `docs/providers/`.

`provider-onboarding.prompt.md` covers the same steps for assisted work.

## Technical debt tracking
{: #technical-debt-tracking }

Debt I found reading the repo, each with impact and a retirement condition:

| Item | Impact | Retire when |
|---|---|---|
| Generated `provider.tf` interpolates secrets as literals | Secrets in `.terragrunt-cache/` and binary plans | Providers read env vars directly or use OIDC |
| `values` written to every unit but unused by 132 cloud templates | Two sources of truth for the same data | Templates read `values`, or the generator stops writing them |
| `python/` legacy layout and fallback import in the stub | Two code paths to maintain | Every consumer has re-synced to the `src/` layout |
| `python_delete/` and `template/terragrunt-cicd.yamls` | Confusion about what's live | Deleted |
| Template comment says "Daily drift detection", cron is weekly | Misleading operators | Comment or cron fixed |
| Default ZPA customer ID hard-coded in `root.hcl` | Tenant identifier in shared code | Read from env only |
| `terragrunt-compatibilty.yaml` filename typo | Annoying, and referenced in docs | Renamed with a redirect note |
| Reusable workflow refs are `placeholder-org/placeholder-repo@main` in the template | Rewritten by bootstrap, but a broken template if copied by hand | Template documents this loudly |
| "Pending Verification" CHANGELOG items | Unverified behavior in production paths | Verified in a consumer or reverted |
| `ITEMS_TO_FIX.md` notes (error hints, Terraform version check) | Small UX gaps | Moved into the tracker and closed |

I'd keep this table in the repo as a tracked issue list, reviewed every iteration.

## Code reviews
{: #code-reviews }

What a reviewer checks on a Y-IaC PR, in order of how often it catches something:

1. **Consumer impact.** Which `resources.yaml` files use this type? Will their plan change?
2. **Generated output diff.** Attach the before and after of `terragrunt.stack.hcl` or `provider.tf` when
   they change.
3. **Backward compatibility** of module inputs and YAML shapes.
4. **Tests** for the behavior, including the failure path.
5. **Security**: secrets, permissions, new external calls.
6. **Docs and CHANGELOG.**

CODEOWNERS should require a second maintainer on `template/`, `config/providers.yaml`,
`generators/` and `environment/`, because those touch every consumer.

## Developer documentation
{: #developer-documentation }

The developer docs that exist and should stay current with the code:

- `docs/getting-started/05-python-scripts-overview.md` and `06-python-package-structure.md` for the
  package.
- `12-cli-init-reconfigure-flow.md`, a function-by-function trace of one command, which the animated
  walkthroughs in [Technical Architecture](/posts/projects/y-iac/05-technical-architecture/#system-context-and-component-architecture)
  are based on.
- `07` and `08`, worked module-creation examples.
- `docs/features/` for individual features (state-lock release, duplicate detection, module validation,
  credential resolution, visualization).

Module docstrings in `src/` are good enough to generate an API reference; I'd add that to the docs site.

## Checklist
{: #checklist }

- [ ] The 92 stories in the stories file are imported into the tracker
- [ ] Iteration split (roadmap, requests, debt) is agreed
- [ ] Generated-output diffs are required on PRs that change generation
- [ ] The technical debt table is a tracked issue list with owners
- [ ] `python_delete/` and the stray `.yamls` workflow are removed
- [ ] CODEOWNERS requires two maintainers on shared-path folders
- [ ] Provider onboarding steps are documented in one place

{% include project-nav.html %}
