---
layout: post
title: "Y-IaC: User Experience and Design"
date: 2026-10-05 00:04:00 +0530
categories: [projects, y-iac]
tags: [Projects, Y-IaC, UX, Design]
description: "Y-IaC has no screens, so its UX is the YAML a consumer writes, the CLI banner, error messages, workflow summaries and the persona-based docs."
project: y-iac
project_step: 4
image:
  path: /assets/img/projects/y-iac/04-user-experience-and-design.webp
  alt: "Y-IaC: User Experience and Design - Projects hero image"
---

Y-IaC doesn't have a single screen, and it still has a user experience. It's the YAML a consumer
writes, the banner the CLI prints before it touches anything, the error message at 6 pm when a plan
fails, and the summary a reviewer reads before approving an apply. If any of those is confusing, people
route around the platform, and a shared platform that people route around isn't shared any more.

<!-- more -->

{% include project-nav.html %}

## Information architecture
{: #information-architecture }

There are two structures a user has to learn: the consumer repository layout and the docs.

The consumer layout is the more important one, because folder names *are* configuration. The path
`environments/<cloud>/<environment>/<stack>/` is parsed by `root.hcl` (the cloud folder picks the backend
namespace) and by the CLI (the three `--cloud`, `--environment`, `--stack` arguments map one to one):

```text
infra-aws/
├── config.yaml                    # backend + workflow settings for this repo
├── entrypoint.py                  # identical stub in every consumer
└── environments/
    └── aws/
        ├── root.hcl               # written by bootstrap, never edited
        └── dev/
            ├── common_vars.yaml   # account, providers, tags, gates
            └── hello-world/
                └── resources.yaml # what to create
```

The docs follow personas, through `docs/getting-started/README.md`: choose a persona, then follow
numbered guides (01 onboard a consumer, 02 add a module, 03 modify a module, 04 CI/CD, 05 and 06 Python
internals, 09 consumer config reference, 12 the CLI init flow). That numbering is good; I'd keep new
guides in it rather than adding loose files to `docs/`.

## User flows
{: #user-flows }

The main flows, as the user experiences them:

| Persona | Flow |
|---|---|
| Consumer | Edit `resources.yaml` → local plan → PR → read summary → merge → approve apply |
| Contributor | Add module + unit template → run validator → add tests → PR |
| Maintainer | Change Python or workflow → pytest, ruff → compatibility run → release note |
| Operator | Read failed run → error report suggests a fix → rerun, release lock, or import |

The consumer flow is the one to keep short. Today a consumer never writes HCL, never touches a backend
block and never edits a pipeline. The animated walkthroughs in
[Technical Architecture](/posts/projects/y-iac/05-technical-architecture/#system-context-and-component-architecture)
show everything that happens behind that one command, and the point of the design is that the consumer
doesn't need to know it.

## Wireframes and prototypes
{: #wireframes-and-prototypes }

There's nothing to wireframe in the usual sense, but there are two artifacts I'd prototype before
changing them, because they're what users actually look at:

1. **The execution banner** (`cli/banner.py`). It shows the command, cloud, environment, stack, backend,
   providers, cache decision and working directory before anything runs. A mock-up in a PR description
   is enough to review a change to it.
2. **The plan summary** (`reporting/plan_summary.py` and the summary workflow). A per-unit table of
   add/change/destroy plus gate outcomes.

For a new YAML shape, the prototype is a sample `resources.yaml` in the PR. If the sample is awkward to
write, the shape is wrong, whatever the module looks like.

## Visual design and design system
{: #visual-design-and-design-system }

The "design system" here is consistency of terminal output and docs:

- **Status words and symbols together.** `✅ passed`, `❌ failed`, `⚠️ skipped`. The symbol helps scanning;
  the word carries the meaning.
- **Box-drawn error panels** for configuration errors. `root.hcl` already does this for a missing backend
  entry: a framed message with the repo name, what's missing and four numbered fixes.
- **Colour for emphasis only**, through `core/console.py`. Output must still read correctly in a CI log
  with colours stripped.
- **One terminology list**: stack, unit, resource type, consumer, shared module. "Stack" means the folder
  under an environment, never a Terraform workspace.

The module reference site (generated docs on GitHub Pages) is the one visual surface, and it uses the
generator's default theme. That's fine; nobody chooses an IaC platform for its fonts.

## Interaction patterns
{: #interaction-patterns }

- **Safe by default.** Plan is the default action for a manual CI run. Destroy plans first, prints a
  warning naming what it will remove, and only proceeds when you type `yes` in full.
- **Opt-in for risky automation.** Releasing a stale state lock only happens with `AUTO_RELEASE_LOCK`
  set, and only for locks older than `LOCK_MIN_AGE_MINUTES`.
- **Passthrough, not reinvention.** Unknown flags such as `-reconfigure` or `-upgrade` go straight to
  Terraform after Terragrunt's `--` separator, so Terraform knowledge still applies.
- **Predictable generation.** Generated files carry an "AUTO-GENERATED, do not edit" header, and the
  user's own files (`resources.yaml`, `common_vars.yaml`) are only read, never rewritten.
- **Fail before acting.** Validation (paths, provider-stack fit, subscription mapping, duplicate
  resources) runs before authentication and before Terragrunt starts.

## Responsive behavior
{: #responsive-behavior }

For a CLI, "responsive" means two things. First, output must work in an 80-column terminal and in a
GitHub Actions log, which wraps differently. Wide tables belong in the job summary (Markdown), not in
the console. Second, the CLI should behave the same on a laptop and on a runner. It does, by design:
`entrypoint.py` only differs in where it looks for the shared module (`GITHUB_ACTIONS=true` means
`./terragrunt_shared_module`, otherwise the sibling folder).

## Accessibility design
{: #accessibility-design }

- No information by colour or emoji alone, as above.
- Diagrams in the docs have accompanying text. The animated diagrams in this playbook have a caption per
  step and a no-JavaScript fallback list.
- Error messages are plain sentences with a concrete next action, which helps screen-reader users and
  everyone else equally.
- Markdown docs use real headings and tables, not screenshots of tables.

## Usability testing
{: #usability-testing }

The guide suggests three test participants, and I agree with the choice:

1. **A new consumer** onboards a scratch repo from `01-onboard-consumer-repo.md` alone.
2. **A module contributor** adds a small module from `02-add-new-module.md`.
3. **An operator** diagnoses a deliberately broken plan (wrong subscription, stale lock, missing backend).

Watch, don't help, and write down every time someone needs to ask a person. Each of those moments is
tribal knowledge that becomes a backlog item in the Documentation track.

So far onboarding has gone through the DevOps team, so nobody has yet onboarded a consumer from the docs
alone. That makes session 1 the most valuable one to run first.

## Content and messaging
{: #content-and-messaging }

Every message the CLI prints should answer three questions: what happened, why, and what to do next.
The missing-backend error in `root.hcl` is the model:

```text
❌ ERROR: Backend Configuration Missing
Repository: infra-example
⚠️  Backend configuration not found in config.yaml
📝 Action Required:
   1. Open: terragrunt_shared_module/config/config.yaml
   2. Add backend configuration for repo: infra-example
   ...
```

The error catalog (`config/error_message_and_solutions.yaml`) extends this to known Terraform and
provider errors. I'd treat each support question as a candidate catalog entry.

## Checklist
{: #checklist }

- [ ] Consumer folder layout is documented with a single annotated tree
- [ ] Banner and plan summary changes are reviewed with a mock-up in the PR
- [ ] Every status symbol in CLI output sits next to a status word
- [ ] A terminology list (stack, unit, consumer, shared module) is in the docs
- [ ] Three usability sessions are run and findings logged as backlog items
- [ ] Every new error path prints what happened, why and what to do next
- [ ] Recurring support questions are added to the error catalog

{% include project-nav.html %}
