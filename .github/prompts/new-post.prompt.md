---
description: "Scaffold a new Chirpy blog post: validate the category against existing _posts/* folders, then create the post file with correct front matter and the matching assets/img/<category>/ folder."
name: "New Cloudutsuk post"
argument-hint: "<post title> [category]"
agent: "agent"
---

# New Cloudutsuk post

You are scaffolding a new post for this Jekyll + Chirpy blog. Follow every step; do NOT skip
validation.

## Inputs

The user may pass the title and optional category as arguments. If either is missing, ask for them
using the ask-questions tool (a single question with both fields is fine). Also ask for:

- **Tags** (comma-separated, PascalCase, e.g. `Terraform, Azure`) — optional but recommended.
- **Extras**: whether the post needs `math: true`, `mermaid: true`, or `pin: true`. Default all to
  false unless the user opts in.

## Validation (must run before creating anything)

1. List the existing category folders under [\_posts/](../../_posts/). The set of valid categories
   is exactly the subfolder names there (e.g. `cloud`, `devops`, `devsecops`, `agenticai`,
   `aicodingtools`, `architect`, `artificialintelligence`, `basics`, `certification`, `cloudnative`,
   `communication`, `comparison`, `cybersecurity`, `databases`, `finops`, `homelab`, `iam`,
   `issues-fixes`, `m365`, `microservices`, `mlops`, `networking`, `operatingsystems`,
   `platformengg`, `productivity`, `programming`, `projects`, `templates`, `virtualization`,
   `websites`). Do not read this list from memory — read the directory.
2. If the user's category does not match one of those folder names exactly (case-sensitive), STOP
   and ask them to pick from the actual list. Do not invent a new category unless the user
   explicitly says "create a new category `<name>`", in which case create both
   `_posts/<name>/` and `assets/img/<name>/` before proceeding.
3. Slugify the title: lowercase, spaces → hyphens, drop punctuation other than `-`.
4. Use today's date in `YYYY-MM-DD` format (system date, not a hardcoded year).

## File to create

Path: `_posts/<category>/YYYY-MM-DD-<slug>.md`

Front matter (fill from inputs; omit the optional lines when the user did not opt in):

```yaml
---
layout: post
title: "<Original Title as provided>"
date: YYYY-MM-DD HH:MM:SS +0530
categories: [<category>]
tags: [<Tag1>, <Tag2>]
image:
  path: /assets/img/<category>/<slug>.png
  alt: <one-line description of the hero image>
# math: true
# mermaid: true
# pin: true
---

<!-- more -->

## Overview

<one-paragraph intro>

## <Section>

<content>
```

Rules:

- `categories:` value MUST match the folder name exactly (case-sensitive).
- The `image.path` MUST live under `/assets/img/<category>/` — the same category as the post folder.
- Keep the `<!-- more -->` separator right after the front matter; it drives the index-page excerpt.
- Use Chirpy prompt blocks (`{: .prompt-tip }`, `.prompt-info`, `.prompt-warning`, `.prompt-danger`)
  where relevant. See [\_posts/templates/2021-01-01-post-template.md](../../_posts/templates/2021-01-01-post-template.md)
  for full syntax.

## Companion assets folder

Ensure `assets/img/<category>/` exists. If it does not (only possible for a brand-new category),
create it and add a `.placeholder` file so git tracks the empty directory. Do NOT copy or generate
image binaries — remind the user to drop `<slug>.png` (or update the `image.path` extension) into
that folder before publishing.

## Do NOT

- Do NOT touch `_site/`, `.jekyll-cache/`, or `_config_ref.yml`.
- Do NOT commit or push. The user runs `task update` when they are ready.
- Do NOT run `bundle install` or `task setup-local` as part of scaffolding — this prompt is
  content-only.

## Output

After creating the file, print:

1. The relative path of the new post.
2. The relative path of the image folder and the exact filename the user needs to drop in.
3. A one-line reminder: `Run 'task start-local' to preview, then 'task update' to publish.`
