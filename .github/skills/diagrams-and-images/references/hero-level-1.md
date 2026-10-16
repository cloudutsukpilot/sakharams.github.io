# Hero image: Level 1 (code-based design)

Turn a blog post into a branded 1200×630 hero image built entirely from code (gradients, glow,
shapes, real fonts and the blog's own icon library), then wire it into the post.

Shared tooling lives in [`../common/`](../common/) (read [image-common.md](image-common.md) once). Below,
`COMMON=.github/skills/diagrams-and-images/common`, and all commands run from the repo root.

## Inputs

- **The post**: a path (`_posts/.../2024-..-slug.md`), a slug, or a unique title fragment. If the
  user is looking at a post in the editor, use that file. If nothing identifies a post, ask which one.
- Optional overrides: shorter title, kicker, tags to show, a specific icon or motif, "bespoke"
  (custom design instead of the template), "don't touch front matter".

## Workflow

### 1. Read the content (always)

```bash
python3 $COMMON/post_context.py <post>
```

From the JSON, note: `title`, `kicker`, `tags`, `headings`/`excerpt` (what the post is really
about), `icons` (best match first), `palette`, `current_image` + `current_image_is_generic`, and
`target_image`. If `title` is longer than about 70 characters, prepare a tighter display title that
keeps the key nouns (for example "Agentic AI: A Comprehensive Guide for Architects" becomes
"Agentic AI for Architects"). Never invent claims that aren't in the post.

If `current_image` is post-specific (`current_image_is_generic: false` and it exists), **tell the
user it already has its own image and ask before replacing** (then pass `--force`).

### 2. Render: house template (default)

```bash
python3 $COMMON/hero.py <post> [--title "…"] [--tags "A,B"] [--icon path] [--no-icon] [--motif M]
```

This writes a preview to `hero-preview/<slug>.webp` (gitignored). Template behavior:
- Left: accent bar and kicker (`DEVOPS · TERRAFORM`), then a bold title (balanced, ≤3 lines,
  auto-fitted), up to 3 tag chips, and the site-name footer (the host of `url` in `_config.yml`).
- Right: the first matched **specific** tool icon on a glowing white tile with orbit rings. If the
  title has "X vs Y" and two tool icons match, both are shown with a "vs". If no tool icon matches,
  the category motif is drawn instead: `network` (AI, networking, microservices), `stack` (cloud,
  databases, homelab), `pipeline` (devops, mlops), `shield` (security, IAM), `blueprint`
  (architecture, programming), or `orbit` (fallback).
- Generic icons (cloud, devops, iam…) are deliberately **not** used as the hero; a motif reads
  better. Pass `--icon assets/img/icons/...` to force one.

### 2b. Render: bespoke design (only when asked, or the template can't express the idea)

Write a script in a temp folder (outside the repo) that uses the engine with the post's palette and keeps the brand
frame: 1200×630, the category `accent`/`accent2` on the `ink` (#0B1020) ground, the kicker plus
site-name footer, and Instrument Sans (`grotesque`) for titles / DM Mono (`mono`) for labels.
The easiest route is to subclass or reuse `Hero` from `hero.py`:

```python
import sys; sys.path.insert(0, ".github/skills/diagrams-and-images/common"); sys.path.insert(0, ".github/skills/diagrams-and-images/common/lib")
from hero import Hero, W, H, mix
from blog import post_context, load_icon
ctx = post_context("<post>"); h = Hero(ctx, seed=7); d, p = h.d, h.p
h.design_background()
# ... custom right-side illustration with d.disk/ring/arc/rect/polygon/line/gradient_sphere,
#     h.layer(fn) for translucent strokes, h.paste(load_icon(path, px), cx, cy) for icons ...
h.text_block("Display Title", ctx["kicker"], ["Tag"], None)
d.render(grain=2.2, chroma=0.8).save("hero-preview/<slug>.webp", quality=88, method=6)
```

Engine reference: coordinates are fractions (x across, y down); radii are fractions of **width**;
stroke widths and font sizes are final px. Methods: `fill`, `linear_gradient`, `radial_gradient`,
`mesh_gradient`, `overlay_glow`, `vignette`, `disk`, `ellipse`, `ring`, `pie`, `arc`, `rect(radius=)`,
`line`, `polygon`, `intersection`, `gradient_sphere`, `write(x, y_baseline, text, role, weight, size,
color, align, tracking, glow, shadow)`, `text_block`, `fit_size`, `wrap`, `measure`. Fonts by role:
`grotesque`, `geometric`, `mono`, `mono_alt`, `serif`, `serif_book`, `display`, `techno`. Engine
draws are opaque, so use `Hero.layer()` for alpha. Gold-standard examples of the engine live in
`$COMMON/examples/` (synthwave poster, Bauhaus, quote card, soft carousel); borrow techniques, not their palettes.

### 3. Verify (mandatory)

Open the preview image and look at it and check:
- the title is fully visible and legible, nothing overlaps the right-side art, and there are no orphan words;
- the icon is the right tool (not a generic glyph standing in for a specific tool);
- the image fits the **content** of the post: if the headings show it is really about
  something else (for example a Terraform post that is really about Azure), override with
  `--icon` / `--motif` / `--kicker`.
Fix and re-render (at most 2 iterations), then show the final preview to the user.

### 4. Save + front matter

```bash
python3 $COMMON/hero.py <post> [same flags] --write [--alt "…"] [--force]
```

This saves to `target_image`, then rewrites the `image:` block to

```yaml
image:
  path: /assets/img/<folders>/<slug>.webp
  alt: "<alt>"
```

Every other front-matter line is left untouched, and a diff is printed. Write a meaningful `--alt`
(what the image shows plus the topic). The default is "<title> - <Category> hero image".

### 5. Report

Tell the user: the image path, the front-matter diff, which icon/motif was used and why. Remind
them to preview with `task start-local` and publish with `task update`. **Never commit.**

## Guardrails

- Only the blog's own icons (`assets/img/icons/`) appear as logos. Don't draw or approximate other
  brands' logos by hand; render the tool name as text instead.
- Images go under `assets/img/<category>/…` only. Never in `_posts/`, never in `_site/`.
- Don't delete the old shared banner file. Other posts still use it.
- If `post_context.py` reports `svg_icons_supported: false`, tell the user how to install cairosvg
  (README) and continue with the motif fallback.
