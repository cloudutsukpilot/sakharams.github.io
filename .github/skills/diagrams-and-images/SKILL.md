---
name: diagrams-and-images
description: "Create diagrams and hero images for a Jekyll (Chirpy) blog, for any system or topic. Diagrams: explorable architecture maps (levels of detail, expand/collapse, pan/zoom, icons and tool logos, protocol:port arrows, view tabs, animated use cases, geo maps) and step-through flow animations, written as YAML data, validated and checked in a real browser. Gathers facts from a post, repo, doc or brief and asks the user for anything missing. Hero images: 1200x630 WebP covers (code-designed default, Three.js 3D, or Cloudflare Flux AI) plus bulk backfill. Use for: architecture/system/C4/topology/network diagram, interactive/explorable/zoomable/drill-down diagram, animated flow or pipeline, geo/latency map, convert a Mermaid diagram, hero/cover/banner/OG image, backfill images."
argument-hint: "What to draw (a system, flow or topic) and where it comes from (a post, repo, doc or description); or the post that needs a hero image"
---

# Diagrams and hero images

One skill for every visual on the blog: diagrams in posts and hero images for posts. It is a
combined copy of the Claude Code diagram and image skills in `.claude/skills/`; keep the two copies
in step when one changes.

`SKILL=.github/skills/diagrams-and-images`, `COMMON=$SKILL/common`. Run every command from the repo
root.

## Pick the workflow

| The user wants… | Read |
|---|---|
| **Any diagram** (start here, always) | [references/intake.md](references/intake.md): find the facts, pick the diagram type, ask for what is missing |
| A system / architecture / platform / network map with levels, views and use cases (the default diagram) | [references/diagram.md](references/diagram.md) |
| A short step-through animation of a linear process, or edits to an existing `_data/flow_anims/` file | [references/flow-anim.md](references/flow-anim.md) |
| A hero / cover / OG image for one post (default level) | [references/hero-level-1.md](references/hero-level-1.md) |
| A 3D-rendered cover ("3D", "Three.js", "level 2") | [references/hero-level-2.md](references/hero-level-2.md) |
| An AI-illustrated or photographic cover ("Flux", "AI", "level 3") | [references/hero-level-3.md](references/hero-level-3.md) |
| Covers for many posts at once | [references/hero-batch.md](references/hero-batch.md) |

Supporting references: [icons.md](references/icons.md) (built-in icons, the logo library, shapes,
colours), [protocols-ports.md](references/protocols-ports.md) (default ports and communication kinds),
[layout-recipes.md](references/layout-recipes.md) (flow-anim layouts),
[image-common.md](references/image-common.md) (the shared kit),
[diagram-plan.md](references/diagram-plan.md) (engine design and status),
[examples/](references/examples/) (flow-anim samples). The reference explorable diagram is
[examples/explorable-web-shop.yml](references/examples/explorable-web-shop.yml) (3 levels, 2 views,
2 use cases, one with a cache hit/miss mode). For a large real one, open the biggest file under
`_data/diagrams/` (`ls -S $(find _data/diagrams -name '*.yml') | head -1`).

## Rules for every visual

1. **Facts come from a source, or from the user.** A post, a repo, a document, or the user's answers.
   When a component, connection, protocol, port or step can't be found, ask (see
   [intake.md](references/intake.md#5-how-to-ask)): one message, a few numbered questions, each with a
   suggested default. Never invent facts. Label product defaults and assumptions as such.
2. **Data, not code.** Diagrams are YAML under `_data/diagrams/` or `_data/flow_anims/`, mirroring
   `_posts/` folders. Don't edit the engines (`assets/js/diagram.js`, `assets/js/flow-anim.js`, their
   `_includes/` and `_sass/` files) for one diagram.
3. **Validate, then look.** Run the validator until it reports 0 errors and 0 warnings. Then check
   the result in a real browser with `preview.cjs`, or open the image for a hero, and look at the
   screenshots yourself. If a check couldn't run, say so. Never claim it passed.
4. **Site rules.** Never edit `_site/` or `.jekyll-cache/`. Build into a private folder
   (`/tmp/dgm-site`). Images go only under `assets/img/<post folders>/`. Use only the blog's own logos
   from `assets/img/icons/`. Run `task test-site` (htmlproofer) before calling it done.
5. **Never commit.** Report the files, the include line, and what the screenshots showed. The user
   publishes with `task update`.

## What lives where

| Path | Contents |
|---|---|
| `references/` | The workflows above, plus intake, icons, protocols, layouts, plan and examples |
| `scripts/diagram/` | `validate.py` (explorable diagram checks; reads the engine's tables) and `preview.cjs` (browser check at every level) |
| `scripts/flow-anim/` | `validate.py` (geometry, routing and PNG render), `preview.cjs`, `enrich.py` (icon picker, `--find <word>`), `build_map.py` (world outline) |
| `scripts/setup-browser.sh` | Installs playwright-core into `~/.cache/visuals-browser` and finds Chromium; prints `CHROME=… WORK=…` |
| `scripts/hero-3d/` | Three.js headless render: `setup.sh`, `lib/pipeline.mjs`, `validate.mjs` |
| `scripts/hero-ai/generate.py` | Cloudflare Workers AI (Flux) background (needs `CF_ACCOUNT_ID`, `CF_API_TOKEN` in `.env`) |
| `scripts/hero-batch/find_targets.py` | Finds posts missing a hero image and renders them in parallel |
| `common/` | `post_context.py`, `hero.py`, `set_hero_image.py`, `brand.json` (category palettes), `lib/` (design engine, repo awareness, icon aliases), `fonts/` (OFL), `examples/` (bespoke design samples) |
| `assets/webgl-abi127-linux-x64.node` | Prebuilt headless-gl binary used by `scripts/hero-3d/setup.sh` (linux-x64) |

Dependencies: Python 3 with Pillow, numpy, PyYAML and cairosvg (SVG logos and flow-anim PNGs); Ruby
and Bundler for the Jekyll build; Node and Chromium for `preview.cjs`; Node, three@0.152.2 and
`xvfb-run` for 3D covers.
