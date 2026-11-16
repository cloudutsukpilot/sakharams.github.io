---
name: create-blog
description: Write a full technical blog post for cloudutsuk.com from a prompt, place it as a Chirpy-formatted .md in the matching _posts/ folder of the sakharams.github.io repo, generate a matching cover image, and verify it with htmlproofer. Use when the user runs /create-blog or asks to write a new blog post/article for their site.
argument-hint: "<topic or prompt for the blog post>"
disable-model-invocation: true
---

# /create-blog

Write a complete, publishable blog post from the user's prompt (`$ARGUMENTS`) and save it in the right
folder of the Cloudutsuk Jekyll/Chirpy repo. The user commits and pushes themselves.

**Repo:** `/home/sakharam/gitrepos/cloudutsuk/sakharams.github.io` (use this absolute path even if the
current working directory is elsewhere). Read its `AGENTS.md` and `CLAUDE.md` before starting.

This skill lives in the blog repo (`.claude/skills/create-blog/`); `~/.claude/skills/create-blog` on the Spark is a
symlink to it, so `/create-blog` works from any folder. **shorts-studio uses it too** (see
[Used by shorts-studio](#used-by-shorts-studio)): a change here changes the posts the studio writes.

If `$ARGUMENTS` is empty, ask the user what the post should be about.

## 1. Pick the folder (propose, then confirm)

Posts are nested by topic, e.g. `_posts/devops/orchestration/terraform/`. Choose the **deepest existing
folder** that fits the topic:

```bash
cd /home/sakharam/gitrepos/cloudutsuk/sakharams.github.io
find _posts -type d -not -path '*/templates*' | sort
```

- Read the directory tree; never pick a folder from memory.
- Look at 2–3 existing posts in the candidate folder (titles and front matter) to confirm the fit and to
  copy their `categories:`, `tags:` and `image:` style.
- Use AskUserQuestion to confirm: offer the best folder first (marked Recommended) plus 1–2 alternatives.
  Also propose the post title and filename slug in the same question so the user confirms everything at
  once.
- In the same AskUserQuestion call, add an optional question: *"Any personal experience to include?"*
  (e.g. a production issue you hit, a migration you ran, a mistake you learned from, an opinion). Options:
  "No, keep it general" and "Yes, I'll describe it" (the user types it via Other). See step 3a for how it's used.
- **Do not create a new folder** unless the user explicitly approves it. If they approve one, create the
  matching `assets/img/<same/path>/` folder too.

## 2. Research (when useful)

For topics involving tools, cloud services, versions, CLI flags, APIs or pricing, use WebSearch/WebFetch
(and Microsoft Learn MCP tools for Azure/Microsoft topics) to check current facts. Prefer official docs.
Record the URLs you actually used for the References section. Skip research for evergreen concepts.

## 3. Write the post

**Path:** `_posts/<folder path>/YYYY-MM-DD-<slug>.md`, using today's date (`date +%F`). Slug: lowercase,
hyphen-separated, no punctuation. Check that the file doesn't already exist, and search `_posts` for posts
on the same topic. If there's a near-duplicate, tell the user before writing.

**Front matter** — match the sibling posts in the chosen folder:

```yaml
---
layout: post
title: "<Title>"
date: YYYY-MM-DD HH:MM:SS +0530
categories: [<one entry per folder level, copied from sibling posts>]
tags: [<PascalCase topical tags, 3–6>]
image: /assets/img/<path>/<slug>.webp
description: <one-sentence summary, ~150 chars, used for SEO and cards>
# mermaid: true   <- only if the body has a ```mermaid block
# math: true      <- only if the body uses $…$ / $$…$$
---
```

- `categories:` mirrors the folder path, e.g. `_posts/devops/orchestration/terraform/` →
  `[devops, orchestration, terraform]`. If siblings deviate (e.g. `[Programming, python]`), copy the
  siblings exactly. Categories drive the permalink `/posts/:categories/:title/`.
- `image:` points at the new cover generated in step 3b: `/assets/img/<path>/<slug>.webp`.

**Body** — a full article of roughly 1500–3000 words:

- An intro paragraph (what the reader will learn and why it matters), followed by `<!-- more -->` on its
  own line (this is the index-page excerpt separator).
- `##` / `###` sections that build logically. Include realistic, runnable code/config blocks with
  language hints, comparison tables where they help, and a Mermaid diagram for architectures or flows
  (and set `mermaid: true`). Keep diagrams readable in the ~700px article column (see the rules below).
- **Mermaid sizing (mandatory first line).** Every Mermaid flowchart starts with this init line, which
  fixes the font at 14px and the box size, and renders the diagram at its natural size. Without it,
  Mermaid emits `width="100%"` and the site CSS (`pre.mermaid svg { width: auto }`) stretches a
  narrow diagram to the full column, so the boxes and text get blown up to 3–4× size:
  ```text
  %%{init: {"themeVariables": {"fontSize": "14px"}, "flowchart": {"useMaxWidth": false, "nodeSpacing": 30, "rankSpacing": 40, "padding": 8, "wrappingWidth": 150}}}%%
  ```
  Boxes come out about 30 px tall per text line and at most 150 px wide (text wraps beyond that).
  For `sequenceDiagram` use `%%{init: {"themeVariables": {"fontSize": "14px"}, "sequence": {"useMaxWidth": false}}}%%`.
  Target a rendered diagram of **at most ~720 px wide and ~600 px tall**.
- **Diagram layout rules.** Never put more than **5–6 nodes in one row**. A single `flowchart LR` with
  10+ nodes renders as a thin strip of unreadable boxes. For longer flows, wrap them:
  - Group the stages into rows or phases with `flowchart TB` plus one `subgraph` per group, each with
    `direction LR` and 3–5 nodes, and connect **subgraph to subgraph** (`F --> D`), never a node inside
    one subgraph to a node inside another. Mermaid ignores a subgraph's `direction LR` as soon as any of
    its nodes links outside it, which collapses every row into one tall column of boxes:
    ```text
    %%{init: {"themeVariables": {"fontSize": "14px"}, "flowchart": {"useMaxWidth": false, "nodeSpacing": 30, "rankSpacing": 40, "padding": 8, "wrappingWidth": 150}}}%%
    flowchart TB
      subgraph F["Foundations"]
        direction LR
        A[Core concepts] --> B[Networking] --> C[Load balancing]
      end
      subgraph D["Data and scale"]
        direction LR
        E[Caching] --> G[Databases] --> H[Scaling]
      end
      F --> D
    ```
  - Or use columns: `flowchart TB` with short vertical chains side by side when the steps are naturally
    parallel tracks.
  - If the flow is a sequence the reader should step through (a pipeline, request path or roadmap),
    prefer an animated diagram via the `cloudutsuk-flow-anim` skill. It lays long flows out as several
    lanes, at most 5–6 nodes per row.
  - Keep labels to 1–2 short lines (about 16 characters each).
  - **Check the rendered size** after the build (step 4): in the built page each Mermaid SVG should be
    ≤ ~720 px wide, ≤ ~600 px tall, with 14px text. A diagram far taller than it is wide means a row
    collapsed into a column (see the subgraph rule above).
- Chirpy callouts on the line after a blockquote paragraph:
  `> text` then `{: .prompt-tip }` / `.prompt-info` / `.prompt-warning` / `.prompt-danger`.
- Link to related existing posts with `[Text](/posts/<cat1>/<cat2>/<slug>/)`. The slug is the filename
  without the date and `.md`; check the target exists. Never link to `_posts/...md` paths.
- End with `## Conclusion` and, if research was done, `## References` with the source URLs.
- Only reference images that exist on disk. No raw HTML that includes tracking scripts or ads.

Reference for syntax: `_posts/templates/2021-01-01-post-template.md`.

## 3a. Voice: make it read like a person wrote it

The post should sound like an experienced cloud/DevOps architect explaining something to a colleague,
not like generated documentation. Apply this while drafting, then do one pass over the finished draft
specifically for voice.

**Tone and structure**
- Open with a concrete hook: a problem, a symptom, a question readers actually search for ("Your
  `terraform apply` just failed with *Error acquiring the state lock* — here's why."). Never open with a
  dictionary definition or "In today's fast-paced world…".
- Write in first person ("I", "we") and talk to the reader as "you". Use contractions.
- Vary sentence and paragraph length. Mix prose with lists; don't turn every section into bullets.
  At least a few sections should be explained in paragraphs that reason through the *why*.
- Have opinions and say when something is a trade-off: "I'd pick X for most teams, unless…",
  "Honestly, this default is a trap." Call out gotchas, edge cases and what the docs gloss over.
- Include practical, earned-sounding detail: real error messages, the flag people forget, the order that
  actually works, what to check first when it breaks. A "Common pitfalls" or "What I'd do differently"
  section usually fits.
- Light humour or asides are fine in moderation; don't force them.
- End with a short, direct conclusion and a practical next step, not a generic recap.

**Honesty about experience (hard rule)**
- If the user shared a personal experience, weave it in naturally in their first-person voice (usually
  in the intro and/or a pitfalls section). Keep their facts; don't embellish numbers, companies or
  outcomes.
- If they didn't, **never invent personal anecdotes, clients, employers, incidents or metrics** presented
  as real ("Last year at my company we lost 3 days…"). Use clearly framed scenarios instead: "Picture
  this: two pipelines run `apply` at the same time…", or "A common way teams hit this is…".

**Phrases to avoid** (they read as AI-generated): "delve", "dive deep/let's dive in", "in today's
fast-paced/ever-evolving landscape", "it's important to note", "game-changer", "unlock/unleash the
power", "seamless(ly)", "robust" (unless literal), "leverage" (use "use"), "navigate the complexities",
"in conclusion", "whether you're a beginner or an expert", "Happy coding!", and em-dash-heavy sentences.
Also avoid bolding every other phrase and ending every section with a one-line summary.

## 3b. Generate the cover image

Create a new cover for every post with the bundled Pillow script (`scripts/make_cover.py` next to this
file, i.e. `.claude/skills/create-blog/scripts/make_cover.py` in this repo). It draws a gradient banner with the title,
a subtitle, the category path, tag pills, a network/hexagon motif seeded by the title, and `cloudutsuk.com`.

1. **Match the size of existing images.** Measure the image the sibling posts in the chosen folder use
   (their `image:` front matter), or the nearest parent folder's if there's none:
   ```bash
   python3 .claude/skills/create-blog/scripts/make_cover.py --measure assets/img/<path>/<sibling-image>
   ```
   Pillow can't read `.avif`, so skip those. If nothing measurable is found, use `1200x675`, the most
   common hero size on the site.
2. **Render it** into the image folder that mirrors the post folder (create the folder if missing):
   ```bash
   python3 .claude/skills/create-blog/scripts/make_cover.py \
     --title "<post title>" \
     --subtitle "<short hook, max ~90 chars; not the full description>" \
     --category <top-level category, picks the colour palette> \
     --categories <comma list matching the categories: front matter> \
     --tags <3–4 of the post's tags, comma-separated> \
     --size <WxH from step 1> \
     --out assets/img/<path>/<slug>.webp
   ```
3. **Look at the result** with the Read tool. If the title is cramped or anything overlaps, shorten the
   subtitle or pass a shorter `--title` (for example drop a trailing clause) and re-render.
4. Requires `python3` with Pillow. If Pillow is missing, fall back to reusing the sibling posts' image
   (or `/assets/img/common/assignment.png`) and tell the user.

## 4. Verify with htmlproofer

htmlproofer checks the built `_site/`, so the site must be rebuilt first or the new post won't be tested:

```bash
cd /home/sakharam/gitrepos/cloudutsuk/sakharams.github.io
command -v bundle >/dev/null || echo "NO_RUBY"
rm -rf _site .jekyll-cache
JEKYLL_ENV=production bundle exec jekyll b -d _site
bundle exec htmlproofer _site --disable-external \
  --ignore-urls "/^http:\/\/127.0.0.1/,/^http:\/\/0.0.0.0/,/^http:\/\/localhost/"
```

- If Ruby/Bundler isn't installed, skip this step and tell the user to run `task setup-local` once.
  Don't install anything yourself.
- If htmlproofer reports failures **in the new post's output**, fix the source `.md` and re-run. Report
  pre-existing failures in other posts without fixing them.
- Never edit `_site/`, `.jekyll-cache/` or `_config_ref.yml`.

## 5. Report

Do **not** `git add`, commit or push. Tell the user:

1. The path of the new post and its future URL: `https://cloudutsuk.com/posts/<categories>/<slug>/`.
2. The generated cover image's path and size (or which existing image was reused, and why).
3. The htmlproofer result (passed / failed with details / skipped because Ruby is missing).
4. Next step: `task update` (or their own git push) when they're ready to publish.

## Used by shorts-studio

shorts-studio (the Shorts video app) writes the follow-up post for a short whose topic has no post yet, and opens
it as a draft PR on this repo. For every post it reads this file from `main` through the GitHub API and follows it,
without a person to ask:

- It sends this whole file to its LLM as the writing rules, with a note that it runs **non-interactively**:
  sections **3** (front matter, body, Mermaid rules, callouts, links) and **3a** (voice, honesty, phrases to
  avoid) apply; steps 1, 2, 4 and 5 don't (no questions, no web research, no htmlproofer, it opens a PR instead
  of leaving files).
- **Step 1 (folder):** the short's category gives the folder (its first `blog.dirs` entry in shorts-studio's
  `config/categories.yaml`); `categories:` mirrors that path. No new folders.
- **Step 3a (experience):** there is never a personal experience to weave in, so the hard rule applies: framed
  scenarios only, no invented anecdotes, clients or metrics.
- **Links:** the LLM gets a list of existing posts from the topic tracker and may link only to those; any other
  `/posts/...` link is turned back into plain text.
- **Step 3b (cover):** it runs `scripts/make_cover.py` from this folder (read from `main` too) at `1200x675`, and
  commits the `.webp` next to the post. Keep the script's options (`--title --subtitle --category --categories
  --tags --size --out`) working, and keep it to Pillow and the standard library.
- The front matter (`date`, `categories`, `image`, `mermaid`) is written by the studio, not the LLM.

htmlproofer still runs in this repo's CI on the PR. Review the facts before merging.

