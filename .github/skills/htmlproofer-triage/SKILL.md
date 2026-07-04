---
name: htmlproofer-triage
description: "Run htmlproofer against the built Jekyll site and map every failure back to the source _posts/**/*.md file. Use when: htmlproofer fails, CI 'Test site' step is red, broken links or missing images are reported, `task test-site` returns non-zero, or the user asks to fix htmlproofer errors."
argument-hint: "Optional: paste failing htmlproofer output to skip re-running"
---

# htmlproofer triage

Jekyll builds to `_site/`, and htmlproofer walks that generated HTML. Its errors reference paths
under `_site/**/*.html`, which do NOT exist in source. This skill runs the check and translates
each failure back to the authoring file the user actually edits.

## When to use

- `task test-site` exits non-zero locally.
- The `Test site` step of [.github/workflows/pages-deploy.yml](../../workflows/pages-deploy.yml)
  fails on a PR / push to `main`.
- User reports broken internal links, missing images, or bad `image.path` values.
- User asks to "fix htmlproofer" / "validate the site" / "check links".

## Prerequisites

- Ruby + Bundler installed. If `bundle exec htmlproofer` is not on PATH, run
  `task setup-local` (installs gems to `$HOME/.local/share/gem`, no sudo). Note the wrapper scripts
  in [tools/](../../tools/) hardcode Ruby 3.2.0's gem path — on Ruby 3.3.x prefer `bundle exec`
  directly.
- The site must be built. `task test-site` runs against an existing `_site/` — if it is missing,
  run `bundle exec jekyll b -d "_site"` first.

## Procedure

1. **Build if needed.** Check for `_site/index.html`. If absent or stale, run
   `JEKYLL_ENV=production bundle exec jekyll b -d "_site"`. Never edit `_site/` by hand.
2. **Run the proofer.** Prefer the task target — it uses the same flags as CI:

   ```bash
   task test-site
   ```

   Equivalent raw command:

   ```bash
   bundle exec htmlproofer _site \
     --disable-external \
     --ignore-urls "/^http:\/\/127.0.0.1/,/^http:\/\/0.0.0.0/,/^http:\/\/localhost/"
   ```

   Capture the full output. Do NOT pipe to `head`/`tail` before parsing — you will miss failures.

3. **Group failures by type.** htmlproofer output looks like:

   ```
   * At /home/.../.../_site/posts/<category>/<slug>/index.html:42:
     internally linking to /assets/img/<category>/foo.png, which does not exist
   ```

   Common categories to look for:
   - `does not exist` on `/assets/img/...` → missing image file.
   - `internally linking to /posts/...` → wrong slug or dead cross-post link.
   - `image ... does not have an alt attribute` → missing `image.alt` in front matter OR bare
     `![](…)` in body.
   - `tag ... is not valid HTML` → raw HTML/Markdown mismatch in body.

4. **Map `_site/` paths back to source.** For each failure:
   - `_site/posts/<category>/<slug>/index.html` → source is
     `_posts/<category>/YYYY-MM-DD-<slug>.md`. Use `grep_search` for the slug under `_posts/` if the
     date prefix is unknown.
   - `_site/<tab>/index.html` (about, archives, categories, tags) → source is `_tabs/<tab>.md`.
   - `_site/pages/<name>/index.html` → source is `pages/<name>.md`.
   - `_site/assets/img/<category>/<file>` referenced as missing → the _linker_ is the offending
     post, not the asset path itself. Search body + front matter for `<file>`.
5. **Present findings.** For each unique source file, print:

   ```
   _posts/<category>/YYYY-MM-DD-<slug>.md
     - <line hint or field>: <one-line failure summary>
   ```

   Group by file, not by failure. Include the exact htmlproofer message once per file.

6. **Propose fixes.** For each file, suggest the minimal edit. Common patterns:
   - Missing image: check `assets/img/<category>/`; either add the file, correct the extension, or
     update `image.path` / body `![alt](...)`.
   - Broken internal link: replace with the Chirpy permalink form
     `/posts/<category>/<slug>/` (trailing slash required).
   - Missing alt: add `alt:` to the `image:` block, or replace bare `![](…)` with `![alt](…)`.
   - Cross-category image path: rewrite `image.path` to `/assets/img/<category>/…` matching the
     post's own category folder (see [posts.instructions.md](../../instructions/posts.instructions.md)).
7. **Apply fixes** only after the user confirms — do not batch-edit posts without approval, and
   never modify files under `_site/` or `.jekyll-cache/`.
8. **Re-run `task test-site`** to confirm zero failures.

## Escalation

- If the same `_site/` path traces back to a _theme_ include (e.g. an `adsense_*.html` partial),
  the fix is in [\_includes/](../../../_includes/) rather than a post.
- If htmlproofer complains about the Chirpy gem's own assets, do not modify the gem — the site is
  likely built with a stale `_site/`; run a clean build:
  `rm -rf _site .jekyll-cache && JEKYLL_ENV=production bundle exec jekyll b -d "_site"`.
- If the failure is an external URL despite `--disable-external`, verify the failing URL is not
  actually a mis-typed _internal_ path missing its leading `/`.

## Do NOT

- Do NOT edit `_site/` to silence errors.
- Do NOT add ignore patterns to `task test-site` unless the user explicitly asks and understands
  the CI flags need to match.
- Do NOT run `task update` (which pushes) until htmlproofer is green locally.
