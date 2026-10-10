---
name: cloudutsuk-image-batch
description: >-
  Backfill Cloudutsuk hero images in bulk: scan a _posts/ folder (or the whole blog) for posts with
  no hero image or a shared/generic banner, then render an on-brand 1200x630 image for each with
  the Level 1 house template (free, offline, deterministic) and update each post's `image:` front
  matter. Use this skill when the user asks to generate/backfill/refresh/replace images for many
  posts, a whole category or folder, "all posts missing images", "posts using the generic
  banner", or similar bulk image work in this repo. For a single post use
  cloudutsuk-image-level-1 (or level-2/level-3 for 3D/AI art).
---

# Cloudutsuk hero images: batch backfill

`COMMON=.claude/skills/cloudutsuk-image-common`, `BATCH=.claude/skills/cloudutsuk-image-batch`.
Run from the repo root. The engine is `hero.py` (Level 1 template). Read
`../cloudutsuk-image-level-1/SKILL.md` for what the template does.

## 1. Scope

Get a folder from the user (for example `_posts/devops/orchestration/terraform`, `_posts/cloud`, or
`_posts` for everything) and a mode:
- `missing`: no `image:` at all, or the file it points to doesn't exist
- `generic`: uses a shared banner (2+ posts, or `/assets/img/common/…`)
- `both` (default)

Posts with their own specific image are **never** touched by this skill.

```bash
python3 $BATCH/find_targets.py <folder> [--mode both]
```

Show the user the count and a short sample of the list (reason, icon or motif, target path).
For more than about 30 posts, suggest going one category at a time so each diff is reviewable.
**Get explicit confirmation before writing.**

## 2. Sample preview

Render a few into a scratch folder (no repo changes) and show them to the user with the Read tool.
Combine them into one contact sheet if there are several:

```bash
python3 $BATCH/find_targets.py <folder> --limit 4 --run --preview-dir <scratchpad>/heroes
```

Look for: titles that are too long (more than 3 lines, or tiny type), wrong icons (a tool icon
on a post about something else), or motifs clashing with the title. Fix the root cause rather than
patching single images. Add an alias in `ALIASES` or an icon to `assets/img/icons/`, or adjust
`brand.json`, then re-preview. Posts that need a custom title or icon can be done afterwards
individually with `hero.py --title/--icon … --write`.

## 3. Run

```bash
python3 $BATCH/find_targets.py <folder> [--mode …] --run --jobs 8
```

Each post gets `assets/img/<folders>/<slug>.webp` (~50 KB) plus a rewritten `image:` block.
About 2 s per image per core. The whole blog (~650 posts) takes ~20 min at `--jobs 8`; for
large runs use Bash `run_in_background`. `FAIL` lines show the last error. Common causes are
broken front matter or a missing cairosvg (see the common README).

## 4. Verify

- Spot-check 3–5 written images with the Read tool, in different subfolders.
- `git status --short | head` and `git diff --stat`: only `_posts/**.md` front matter and new
  `assets/img/**.webp` files should change.
- Recommend running the site check before publishing:
  `rm -rf _site .jekyll-cache && JEKYLL_ENV=production bundle exec jekyll b -d _site && task test-site`
  (htmlproofer fails the deploy on any missing image).

## 5. Report

Report the posts updated and failed (with reasons), total size added, and which old shared banners
are now unused. List those banners, but **don't delete them** without asking. Never commit; the
user publishes with `task update`.
