---
description: "Chirpy blog post authoring rules. Applied automatically when editing or creating files under _posts/**/*.md. Enforces front-matter shape, category/folder coupling, and image-path conventions."
applyTo: "_posts/**/*.md"
---

# Post authoring rules

These rules apply to every Markdown file under [\_posts/](../../_posts/). Full authoring reference
lives in [AGENTS.md](../../AGENTS.md); this file only encodes the hard invariants an agent must
enforce while editing a post.

## Front matter — required fields

Every post must start with a YAML front-matter block containing at minimum:

```yaml
---
layout: post
title: "Post Title"
categories: [<category>]
tags: [Tag1, Tag2]
image:
  path: /assets/img/<category>/<image-file>
  alt: <alt text>
---
```

- `layout` MUST be `post`.
- `title` MUST be quoted if it contains a colon, apostrophe, or other YAML-significant character.
- `categories` MUST be a single-element list. The value MUST match the parent folder name exactly
  (case-sensitive). If the file is at `_posts/devsecops/2025-10-01-foo.md`, `categories:` MUST be
  `[devsecops]`. Never invent a new category value — reuse an existing folder under `_posts/`.
- `tags` should be PascalCase and topical (e.g. `Terraform`, `AzureAD`, `Kubernetes`).
- `image.path` MUST start with `/assets/img/<category>/` using the same `<category>` as the folder
  and the `categories` value. Do NOT point post images at `/assets/img/` root or a different
  category folder.
- `image.alt` is required for accessibility and htmlproofer.

## Optional front-matter flags

Add only when actually used in the body:

- `math: true` — enables MathJax rendering. Required for `$…$` / `$$…$$`.
- `mermaid: true` — enables Mermaid diagram rendering. Required for ` ```mermaid ` fences.
- `pin: true` — pins the post to the top of the index.
- `date: YYYY-MM-DD HH:MM:SS +0530` — override publish time (Chirpy defaults to filename date).

## Filename

Post filenames MUST match `YYYY-MM-DD-<slug>.md` where the date is real (not a placeholder like
`2021-01-01` outside of `_posts/templates/`). The slug should be lowercase, hyphen-separated, and
free of punctuation.

## Body conventions

- Place `<!-- more -->` immediately after the front matter (and any intro paragraph) so the index
  page can extract a clean excerpt.
- Use Chirpy prompt blocks for callouts: `{: .prompt-tip }`, `{: .prompt-info }`,
  `{: .prompt-warning }`, `{: .prompt-danger }` on the line _after_ the paragraph.
- Internal links to other posts use `[Text](/posts/<category>/<slug>/)` — Chirpy's permalink
  pattern; do NOT link to `_posts/...md` paths.
- Image references from the body use `![alt](/assets/img/<category>/<file>)` and MUST resolve on
  disk before commit — htmlproofer will fail the CI build otherwise.
- YouTube embeds: `{% include embed/youtube.html id='VIDEO_ID' %}`.
- For images with sizing, use Chirpy's classes:
  `![alt](/path.png){: width="800" height="400" .w-75 .normal }`.

## Do NOT

- Do NOT edit files under `_posts/templates/` when the user asked for a new post — those are
  syntax references, not real posts.
- Do NOT modify the generated copy under `_site/` — it will be rebuilt.
- Do NOT commit image binaries into `_posts/`; they belong in `assets/img/<category>/`.
