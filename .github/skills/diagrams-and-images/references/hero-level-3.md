# Hero image: Level 3 (Cloudflare Flux)

`COMMON=.github/skills/diagrams-and-images/common`, `SKILL=.github/skills/diagrams-and-images`.
Run everything from the repo root.

## 0. Prerequisites

- `.env` in the repo root with `CF_ACCOUNT_ID` and `CF_API_TOKEN` (see `.env.example`; `.env` is
  gitignored and Jekyll never publishes dotfiles). If either is missing, `generate.py` says so.
  Tell the user where to get them (Cloudflare dashboard → Workers & Pages for the account ID;
  My Profile → API Tokens → a token with *Workers AI* permission) and stop.
- Python `requests` (already installed). No python-dotenv needed.

## 1. Read the post

```bash
python3 $COMMON/post_context.py <post>
```

Use `title`, `tags`, `headings` and `excerpt` to decide **what the post is actually about**, and
`palette` (accent colors + `scene` hint) for the look.

## 2. Write the Flux prompt (Claude's main job)

One or two sentences, built from:
1. **Subject**: a concrete visual metaphor for the topic (see the scene ideas in
   [hero-level-2.md](hero-level-2.md); e.g. Terraform state → "a glowing blueprint of modular blocks
   locked inside a translucent vault").
2. **Style**: pick one and keep it across a series: `isometric 3D illustration`, `clean flat vector
   illustration`, `cinematic digital art`, or `photographic`.
3. **Brand palette**: "deep navy background, <accent name> and <accent2 name> neon accents"
   (translate the hex values in `palette` into color words).
4. **Composition**: "subject on the right third, dark empty negative space on the left, wide
   landscape composition". The left side gets the title overlay.
5. **Quality cues**: "soft volumetric light, high detail, sharp focus".

Always end with: **"no text, no letters, no logos, no watermark"**. Flux garbles text, and the
title and logos come from the overlay. Never ask for real brand logos, real people, or
copyrighted characters.

## 3. Generate

```bash
python3 $SKILL/scripts/hero-ai/generate.py "<prompt>" -o hero-preview/<slug>-flux.jpg [--steps 6] [--seed N]
```

The output is 1024×1024 and is cover-cropped to 1.91:1 by the overlay step, so keep the
subject vertically centered. Open the JPG (open it and look at it) and check: does it depict the topic,
is the left side calm, and is there any stray pseudo-text? If it misses, adjust the prompt (more
concrete subject, stronger negative-space cue) or change the seed, and retry (max 3 attempts).

## 4. Brand overlay, save and front matter

```bash
python3 $COMMON/hero.py <post> --background hero-preview/<slug>-flux.jpg            # preview
python3 $COMMON/hero.py <post> --background hero-preview/<slug>-flux.jpg --write --alt "<what it shows> - <topic>"
```

Check the preview (open it and look at it) first: the title must be crisp over the scrim and the subject
visible on the right. If the post already has its own (non-generic) image, ask before using `--force`.

## 5. Report

Give the image path, front-matter diff, **the exact prompt and seed** (so the user can re-run or
tweak), and the number of attempts. Never commit.
