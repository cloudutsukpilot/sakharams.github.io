# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Cloudutsuk** (cloudutsuk.com) — a Jekyll-based technical blog built on the [Chirpy theme](https://github.com/cotes2020/jekyll-theme-chirpy) (`jekyll-theme-chirpy ~> 7.2`). It covers cloud, DevOps, security, AI, and related topics. Deployed automatically to GitHub Pages via GitHub Actions on push to `main`.

## Commands

```bash
# Install dependencies (first time or after Gemfile changes)
bundle install

# Serve locally
JEKYLL_ENV=production bundle exec jekyll serve

# Build site
bundle exec jekyll b -d "_site"

# Test HTML (run after building)
bundle exec htmlproofer _site --disable-external --ignore-urls "/^http:\/\/127.0.0.1/,/^http:\/\/0.0.0.0/,/^http:\/\/localhost/"

# Full test + push workflow (uses Taskfile)
task update
```

## Creating Posts

All posts live under `_posts/<category>/YYYY-MM-DD-title.md`. The category folder name maps directly to the post's `categories:` front matter.

**Required front matter:**
```yaml
---
layout: post
title: "Post Title"
categories: [category-name]
tags: [Tag1, Tag2]
image:
  path: /assets/img/<category>/image.png
  alt: Image description
---
```

Optional front matter: `math: true` (MathJax), `mermaid: true` (Mermaid diagrams), `pin: true` (pin to top).

- Post images go in `assets/img/<category>/` matching the post's category folder
- Use `<!-- more -->` as the excerpt separator for index page summaries
- Internal post links: `[Link Name](/posts/<category>/<filename-without-date-and-extension>)`
- Reference `_posts/templates/2021-01-01-post-template.md` for full syntax examples (prompts, code blocks, tables, Mermaid charts, etc.)

## Architecture

- **Theme**: Chirpy handles all layout/styling via `_layouts/default.html` and the gem. Direct theme customization is minimal.
- **`_config.yml`**: Primary site config — title, URL (`https://cloudutsuk.com`), social links, analytics (Google Analytics `G-T7MV8KTJXC`), comments (Giscus), pagination (10 per page), permalink pattern (`/posts/:categories/:title/`).
- **`_data/`**: YAML data files for contact and share configurations.
- **`_includes/`**: AdSense partial HTML snippets injected into layouts.
- **`_tabs/`**: Navigation tab pages (About, Archives, Categories, Tags).
- **`pages/`**: Custom standalone pages (asp-journaling, asp-modernisation).
- **`assets/img/`**: Images organized by category, mirroring the `_posts/` category structure.
- **CI/CD**: `.github/workflows/pages-deploy.yml` — builds with Ruby 3.3, runs htmlproofer, runs SonarQube scan, then deploys to GitHub Pages. Triggers on push to `main`/`master`.

## Supported Content Features

Chirpy supports these directly in post Markdown:
- **Mermaid diagrams**: fenced code blocks with ` ```mermaid `
- **Math**: LaTeX via MathJax when `math: true` in front matter
- **Prompts**: `{: .prompt-tip }`, `{: .prompt-info }`, `{: .prompt-warning }`, `{: .prompt-danger }`
- **YouTube embeds**: `{% include embed/youtube.html id='VIDEO_ID' %}`
- **Chirpy-style image sizing**: `{: width="..." height="..." .w-50 .left/.right/.normal}`
