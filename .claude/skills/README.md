# Cloudutsuk skills: which one to use

| You want… | Skill | Makes | Needs |
|---|---|---|---|
| A cover/hero image for one post (the default) | `cloudutsuk-image-level-1` | Flat designed 1200×630 WebP: title, tags, tool icon | Nothing (offline) |
| A 3D-rendered cover | `cloudutsuk-image-level-2` | Three.js scene + brand overlay | One-time Node setup |
| An illustrated or photographic cover | `cloudutsuk-image-level-3` | Flux AI art + brand overlay | Cloudflare keys in `.env` |
| Covers for many posts at once | `cloudutsuk-image-batch` | Level 1 for every post missing one | Nothing |
| A **project series**: a tag, 18 area posts, an interview Q&A post and an index on the tag page | `cloudutsuk-project` | Posts in `_posts/projects/<slug>/`, card in `_data/projects/<slug>.yml` | Nothing; uses `cloudutsuk-image-batch` for covers |
| A **hands-on lab**: runnable repo, experiments run live with real dashboard screenshots and timelapses, 7 posts and an index on the tag page | `cloudutsuk-learning-lab` | Lab repo (template `k3d-lgtm`), card in `_data/labs/<slug>.yml`, posts in `_posts/labs/<slug>/`, screenshots in `assets/img/labs/<slug>/` | Docker, k3d, kubectl; Chromium + playwright-core (flow-anim setup.sh) and ffmpeg for capture; uses `cloudutsuk-flow-anim` and `cloudutsuk-image-batch` |
| An **animated diagram inside a post** | `cloudutsuk-flow-anim` | Step-through flow (YAML in `_data/flow_anims/<post folders>/`), drawn live in the browser | Nothing to publish; Chromium for the preview check |
| An **explorable diagram**: levels of detail, expand/collapse, pan and zoom, protocol cards, view tabs, use cases (one skill does everything; replacing flow-anim) | `cloudutsuk-diagram` | Tree of components in `_data/diagrams/<post folders>/`, laid out by ELK in the browser | Nothing to publish; Chromium for the preview check. Plan: `cloudutsuk-diagram/PLAN.md` |

Rule of thumb: **images** (`image-*`) are the post's cover and social card, so they are static and
rendered once. **Animations** (`flow-anim`) explain a process in the body of the post, so they are
interactive and run in the reader's browser. A post can have both. **Lab screenshots**
(`learning-lab`) are neither: they are captured from a real running lab and are evidence, so they are
never drawn or generated.

How to ask Claude Code:

- "Create a hero image for `_posts/.../terraform-backend.md`" → Level 1
- "Make a 3D cover for this post" → Level 2 · "AI illustrated cover" → Level 3
- "Backfill images for all posts in `_posts/devops`" → batch
- "Animate the pipeline diagram in this post" / "Create an animated diagram of OAuth auth-code flow
  for `<post>`" → flow-anim (give it a topic, and optionally the post to embed in)
- "Create a project playbook for Acme Shop: `<brief>`" → project
- "Create a hands-on lab on HPA autoscaling observed in Grafana" / "Turn `<demo repo>` into a learning
  lab" / "Re-capture the lab screenshots" → learning-lab

`cloudutsuk-image-common/` is the shared kit (post context, brand colours, fonts) used by all of them;
see its [README](cloudutsuk-image-common/README.md). Brand colours for every category live in
`cloudutsuk-image-common/brand.json` and are reused by the animations.

**GitHub Copilot copy.** The diagram and image skills above (`cloudutsuk-diagram`, `cloudutsuk-flow-anim`,
`cloudutsuk-image-*`) are combined into one Copilot skill,
[.github/skills/diagrams-and-images/](../../.github/skills/diagrams-and-images/SKILL.md). It has its own
copies of the scripts, fonts and brand kit, and adds a generic intake step (any system; asks the user
for missing facts). When you change a script or workflow here, make the same change there.
