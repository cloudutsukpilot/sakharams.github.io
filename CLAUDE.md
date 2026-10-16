# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

[AGENTS.md](AGENTS.md) is the primary instruction file for this repo (commands, repo rules, CI). Read it
first; this file only adds what it doesn't cover.

## What this is

A content-only Jekyll blog (cloudutsuk.com) on the Chirpy theme, loaded as a gem (`jekyll-theme-chirpy`)
rather than vendored. Almost all work is writing/editing Markdown under `_posts/`. Local overrides of the
theme live in `_layouts/`, `_includes/`, `_tabs/`, and `_data/`; anything not present there comes from the
gem. `assets/lib` is a git submodule (chirpy-static-assets) — run `git submodule update --init` if it's empty.

## Build / verify

There is no test suite beyond htmlproofer. To verify a change:

```bash
rm -rf _site .jekyll-cache
JEKYLL_ENV=production bundle exec jekyll b -d _site
task test-site     # htmlproofer, same flags as CI
```

Any broken internal link or missing image fails the GitHub Pages deploy. Use
[.github/skills/htmlproofer-triage/SKILL.md](.github/skills/htmlproofer-triage/SKILL.md) to map a failing
`_site/**/*.html` back to its source post. `task start-local` serves on :4000 (logs in `/tmp/jekyll-server.log`).

## Post conventions (as actually practiced)

Full rules: [.github/instructions/posts.instructions.md](.github/instructions/posts.instructions.md) and the
new-post workflow in [.github/prompts/new-post.prompt.md](.github/prompts/new-post.prompt.md).

- Posts are nested by topic, e.g. `_posts/devops/orchestration/terraform/…`. In practice the `categories:`
  list mirrors the folder path (`[devops, orchestration, terraform]`), even though posts.instructions.md
  describes a single-element list. Follow the pattern used by sibling posts in the same folder.
- Permalinks are `/posts/:categories/:title/`, so the categories list determines the URL — internal links
  between posts must match it. Changing a post's categories breaks inbound links.
- Images go under `assets/img/<top-level-category>/…` (subfolders mirror post folders), never in `_posts/`.
- `<!-- more -->` is the excerpt separator for the index page.
- `_drafts/` holds unpublished posts; `_posts/templates/` is syntax reference only.
- Hands-on labs (`cloudutsuk-learning-lab` skill) live in `_posts/labs/<slug>/` with `lab:`/`lab_part:`
  front matter; their card is `_data/labs/<slug>.yml` and the runnable code is a separate repo named in
  the card's `repo.path`. Screenshots under `assets/img/labs/<slug>/` (and `_data/lab_shots/<slug>.json`)
  come only from `capture.cjs` runs against the live lab. A tag with a lab card renders the lab index on
  `/tags/<slug>/`; a slug can't be both a project and a lab. The **Labs** tab (`_tabs/labs.md`) lists every
  lab card as a tile under its `lab_category` (categories in `_data/lab_catalog.yml`).

## Private posts

`_posts/private/` is git-ignored: posts there are never committed or deployed, but Jekyll still reads
them locally. Use it for personal notes that must not end up in this public repo (e.g. job-application
fit analyses). Give each post `published: false` as a second guard. `task start-local` already serves with
`--unpublished --future`, so they show locally; CI (`jekyll b` with no flags) never builds them.

`--future` is needed when the filename date is today (Jekyll can treat it as future before the day's
timestamp passes). Never move a post out of `_posts/private/` or link to it from a public page without
the user asking.
- Nav tabs in `_tabs/` (e.g. `devops.md`, `cloud.md`) are curated landing pages for top-level categories.
