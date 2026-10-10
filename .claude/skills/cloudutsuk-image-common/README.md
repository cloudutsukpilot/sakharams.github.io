# cloudutsuk-image-common

Shared kit for the `cloudutsuk-image-*` skills. It is not a skill itself (no SKILL.md). The level
skills call into it so every hero image is content-aware, on-brand, and saved by repo convention.

| File | Purpose |
|---|---|
| `post_context.py <post>` | JSON with title, category path, tags, headings, excerpt, matched icons, palette, current/target image paths. **Always run this first.** |
| `hero.py <post> [--background IMG] [--write]` | The house template: 1200×630 WebP, kicker + title + tag chips + `cloudutsuk.com` footer, with the tool icon tile or a category motif. `--background` lays the same branding over a Level 2/3 image. |
| `set_hero_image.py <post> <image> --alt …` | Writes the post's `image:` front matter (mapping form) with safety rules. |
| `brand.json` | Per-category palette (`accent`, `accent2`), `motif2d`, and a `scene` hint for 3D/Flux prompts. Edit this to restyle the whole blog. |
| `lib/cloudutsuk.py` | Repo awareness: post resolution, icon index + aliases, generic-banner detection, front-matter editing. |
| `lib/render.py`, `lib/fonts.py`, `fonts/` | The code-based design engine (from the Level 1 skill) and its OFL fonts. |

## Conventions enforced

- **Size**: 1200×630 (Chirpy / OpenGraph 1.91:1). **Format**: WebP q88 (~50 KB). Use `--format png` only if asked.
- **Location**: `assets/img/<post folder path>/<slug>.webp`, mirroring `_posts/`. For example,
  `_posts/devops/orchestration/terraform/2021-01-01-terraform-backend.md` →
  `assets/img/devops/orchestration/terraform/terraform-backend.webp`.
- **Front matter**: always the mapping form, `image: {path, alt}`. Shared banners (used by 2+ posts, or
  under `/assets/img/common/`) are replaced freely. A post-specific image is kept unless `--force` is given.
- **Icons**: from `assets/img/icons/` only (the blog's own library), shown on a light tile so dark logos stay
  visible. To teach a new tool, drop `<tool>-18.svg` into `assets/img/icons/<area>/` or add an alias in
  `ALIASES` (lib/cloudutsuk.py).
- Never commit. The user publishes with `task update`.

## Dependencies

Python 3 with Pillow, numpy, PyYAML (already present) and **cairosvg** for SVG icons:

```bash
pip install --user --break-system-packages cairosvg     # libcairo2 is already on the system
```

Without cairosvg, `hero.py` prints a warning and falls back to the category motif (no icon).
