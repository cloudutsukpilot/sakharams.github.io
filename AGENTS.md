# AGENTS.md — Cloudutsuk (cloudutsuk.com)

Jekyll technical blog built on the [Chirpy theme](https://github.com/cotes2020/jekyll-theme-chirpy)
(`jekyll-theme-chirpy ~> 7.2`, see [Gemfile](Gemfile)). Deployed to GitHub Pages by
[.github/workflows/pages-deploy.yml](.github/workflows/pages-deploy.yml) on push to `main`.
Site: <https://cloudutsuk.com>.

## Commands (prefer [Taskfile.yml](Taskfile.yml) over ad-hoc shells)

| Task | What it does |
|---|---|
| `task setup-local` | One-shot local setup: installs Ruby/Bundler + gems to `$HOME/.local/share/gem`. Never `bundle install` with `sudo`. |
| `task start-local` [`PORT=4001`] | Background `jekyll serve` on `:4000`, logs at `/tmp/jekyll-server.log`. |
| `task stop-local` | Kills the background server. |
| `task test-site` | `bundle exec htmlproofer _site --disable-external …` — same flags as CI. |
| `task update` | Runs `test-site` then `git add/commit/push origin main`. Never runs on its own — user-invoked. |

Fallbacks when tasks fail:

- Build: `JEKYLL_ENV=production bundle exec jekyll b -d "_site"`.
- Wrappers [tools/run.sh](tools/run.sh) / [tools/test.sh](tools/test.sh) hardcode
  `PATH=$HOME/.local/share/gem/ruby/3.2.0/bin:$PATH`. CI runs **Ruby 3.3**
  ([pages-deploy.yml](.github/workflows/pages-deploy.yml)), so on 3.3.x locally use
  `bundle exec …` directly rather than the wrappers.

## Repo-specific rules

- **Never edit `_site/` or `.jekyll-cache/`.** Both are generated. Bad htmlproofer runs are almost
  always fixed by `rm -rf _site .jekyll-cache && bundle exec jekyll b -d "_site"`, not by editing
  the output.
- **Never edit `_config_ref.yml`.** It is a reference snapshot. [_config.yml](_config.yml) is
  authoritative (site title, `url: https://cloudutsuk.com`, GA `G-T7MV8KTJXC`, Giscus comments,
  10-per-page pagination, permalink pattern `/posts/:categories/:title/`).
- **Posts live at `_posts/<category>/YYYY-MM-DD-<slug>.md`.** The folder name MUST equal the
  `categories:` front-matter value. Category images live in `assets/img/<category>/` mirroring the
  post folder. The allowed category set is exactly the subfolders that already exist under
  [_posts/](_posts/) — reuse one; do not invent a new category without explicit user consent.
  Full authoring rules (front matter shape, image paths, permalink form, Chirpy prompt/embed
  syntax) are enforced automatically for `_posts/**/*.md` via
  [.github/instructions/posts.instructions.md](.github/instructions/posts.instructions.md); see
  [_posts/templates/2021-01-01-post-template.md](_posts/templates/2021-01-01-post-template.md) for
  a syntax reference.
- **AdSense partials** in [_includes/](_includes/) (`adsense_*.html`) are injected by the theme via
  [_layouts/default.html](_layouts/default.html). Do not add tracking/ads elsewhere — extend the
  existing `adsense_*.html` includes.
- **Standalone pages** live in [pages/](pages/); navigation tabs in [_tabs/](_tabs/).
- **Data files** in [_data/](_data/) (`contact.yml`, `share.yml`) drive footer/share links.

## CI/CD

[.github/workflows/pages-deploy.yml](.github/workflows/pages-deploy.yml) on push to `main`/`master`:

1. `actions/checkout@v5` → `ruby/setup-ruby@v1` (Ruby 3.3, `bundler-cache: true`).
2. Build: `bundle exec jekyll b -d "_site${{ base_path }}"` with `JEKYLL_ENV=production`.
3. Test: `bundle exec htmlproofer _site --disable-external --ignore-urls "…localhost…"`.
4. `SonarSource/sonarqube-scan-action@v7` using `SONAR_TOKEN` — config in
   [sonar-project.properties](sonar-project.properties).
5. `actions/upload-pages-artifact@v4` → `actions/deploy-pages@v5`.

Any htmlproofer failure fails the deploy. Triage locally with the
[htmlproofer-triage skill](.github/skills/htmlproofer-triage/SKILL.md) — it maps
`_site/**/*.html` failures back to the offending source file.

## Chat customizations in this repo

| File | Trigger |
|---|---|
| [.github/instructions/posts.instructions.md](.github/instructions/posts.instructions.md) | Auto-attached when editing `_posts/**/*.md`. |
| [.github/prompts/new-post.prompt.md](.github/prompts/new-post.prompt.md) | Slash command `/new-post <title> [category]`. |
| [.github/skills/htmlproofer-triage/SKILL.md](.github/skills/htmlproofer-triage/SKILL.md) | Slash command `/htmlproofer-triage` or on-demand when htmlproofer fails. |

## graphify (optional, only if present)

When `graphify-out/graph.json` exists, prefer `graphify query "<question>"`,
`graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over raw grep for
architecture/structure questions. Use `graphify-out/wiki/index.md` for navigation and
`graphify-out/GRAPH_REPORT.md` only for broad review. Run `/graphify` in Copilot Chat to build or
refresh the graph. Fall back to source-file reads when the graph is missing or stale.
