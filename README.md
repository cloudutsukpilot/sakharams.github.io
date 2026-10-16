# Cloudutsuk — Blogging Site

Source for [cloudutsuk.com](https://cloudutsuk.com): a Jekyll blog on the
[Chirpy theme](https://github.com/cotes2020/jekyll-theme-chirpy) covering Cloud, DevOps and Security.
Posts live in `_posts/<category>/<sub-folders>/YYYY-MM-DD-<slug>.md`, and images in `assets/img/` (the
folders under `assets/img/` mirror the ones under `_posts/`). See [AGENTS.md](AGENTS.md) for repo rules,
commands and CI.

## Contents

- [Running the site locally](#running-the-site-locally)
  - [Prerequisites](#prerequisites)
  - [One-time setup](#one-time-setup)
  - [Start and stop the local server](#start-and-stop-the-local-server)
  - [Build and test like CI](#build-and-test-like-ci)
  - [Publishing](#publishing)
  - [Troubleshooting](#troubleshooting)
- [Writing a new post: `/create-blog`](#writing-a-new-post-create-blog)
- [Project playbooks: a tag, 18 posts and an index page](#project-playbooks-a-tag-18-posts-and-an-index-page)
- [Hands-on labs: runnable code, real screenshots, 7 posts](#hands-on-labs-runnable-code-real-screenshots-7-posts)
- [Images or animations: which skill?](#images-or-animations-which-skill)
- [Creating a hero image for a blog post](#creating-a-hero-image-for-a-blog-post)
  - [Pick a level](#pick-a-level)
  - [Ask Claude Code](#ask-claude-code)
  - [Or run the scripts yourself](#or-run-the-scripts-yourself)
  - [One-time setup for images](#one-time-setup-for-images)
  - [Customising the look](#customising-the-look)
- [Animated diagrams in a post](#animated-diagrams-in-a-post)

---

## Running the site locally

### Prerequisites

| Tool | Why | Install |
|---|---|---|
| Git | Clone the repo and the theme-assets submodule | `sudo apt install git` |
| [Task](https://taskfile.dev) (`task`) | Runs the shortcuts in [Taskfile.yml](Taskfile.yml) | `sudo snap install task --classic`, or see [taskfile.dev/installation](https://taskfile.dev/installation/) |
| Ruby 3.x + Bundler | Jekyll and the Chirpy theme are Ruby gems | Installed by `task setup-local` (below). CI uses **Ruby 3.3** |

Linux/WSL is the main path. On macOS install Ruby with Homebrew or rbenv, then run `bundle install`.

### One-time setup

```bash
git clone --recurse-submodules https://github.com/cloudutsukpilot/sakharams.github.io.git
cd sakharams.github.io

# Already cloned without submodules? Fetch the theme's static assets (assets/lib):
git submodule update --init

task setup-local
```

`task setup-local`:

- installs Ruby and the native build tools with `apt` if Ruby is missing (the only step that asks for your
  sudo password);
- installs Bundler and all gems into your home folder (`~/.local/share/gem/ruby/<version>`), so nothing
  else needs sudo;
- adds that folder's `bin` to your `PATH` in `~/.bashrc` and `~/.zshrc`;
- runs `bundle install`.

Open a new terminal afterwards (or `source ~/.zshrc`) so the new `PATH` is picked up. The task is safe to
re-run: it skips whatever is already installed.

> [!WARNING]
> Never run `bundle install` with `sudo`.

### Start and stop the local server

```bash
task start-local              # serves on http://127.0.0.1:4000 and opens the browser
task start-local PORT=4001    # use another port
task stop-local               # stop it
tail -f /tmp/jekyll-server.log
```

The server runs in the background with `JEKYLL_ENV=production` (so analytics and comments render the way
they do live) and rebuilds when you save a file. The first build takes about 60 seconds.

Prefer to keep it in the foreground, with live reload, and without production-only includes? Run:

```bash
bundle exec jekyll serve --livereload            # http://127.0.0.1:4000, Ctrl+C to stop
bundle exec jekyll serve --drafts --future       # also show _drafts/ and future-dated posts
```

Optional: `task add-alias` adds `start-cloudutsuk`, `stop-cloudutsuk`, `logs-cloudutsuk` and
`clear-cloudutsuk-logs` aliases to `~/.zshrc`, so you can start the site from any directory.

### Build and test like CI

The GitHub Pages deploy fails on any broken internal link or missing image, so run the same check before
pushing:

```bash
rm -rf _site .jekyll-cache
JEKYLL_ENV=production bundle exec jekyll build -d _site
task test-site                 # htmlproofer, same flags as CI
```

To trace a failure in `_site/**/*.html` back to the source post, use the
[htmlproofer-triage skill](.github/skills/htmlproofer-triage/SKILL.md). Never edit `_site/` or
`.jekyll-cache/`: they are generated.

### Publishing

Pushing to `main` deploys the site through
[.github/workflows/pages-deploy.yml](.github/workflows/pages-deploy.yml) (build → htmlproofer → SonarQube
→ GitHub Pages).

```bash
task test-site
task git-push -- "Add post on Terraform state locking"    # git add . && commit && push origin main
```

> [!NOTE]
> `task update` is meant to run `test-site` and then push, but it currently calls a task named `gp`
> that doesn't exist in [Taskfile.yml](Taskfile.yml). Use the two commands above until it's pointed at
> `git-push`.

### Troubleshooting

| Symptom | Fix |
|---|---|
| `bundle: command not found` after setup | Open a new terminal or `source ~/.zshrc` (or `~/.bashrc`) |
| `Gem::FilePermissionError … /var/lib/gems` | A gem was installed without `--user-install`. Re-run `task setup-local`; never use `sudo gem`/`sudo bundle` |
| Site has no styling or fonts / 404s under `/assets/lib/` | `git submodule update --init` |
| `certificate verify failed` / gem download timeouts | See the posts under [_posts/issues-fixes/](_posts/issues-fixes/) (Ruby/Jekyll SSL and timeout fixes) |
| Port 4000 already in use | `task stop-local`, or `task start-local PORT=4001` |
| Old content keeps showing, or htmlproofer reports odd errors | `rm -rf _site .jekyll-cache` and build again |
| [tools/run.sh](tools/run.sh) / [tools/test.sh](tools/test.sh) can't find gems | They hardcode the Ruby 3.2 gem path. On another Ruby version use `bundle exec …` directly |

---

## Writing a new post: `/create-blog`

`/create-blog` is a personal Claude Code skill installed at `~/.claude/skills/create-blog/` (it is
**not** stored in this repo, so it's only available on machines where it has been copied). Run it from
Claude Code:

```text
/create-blog Terraform state locking with Azure Blob Storage
```

It:

1. proposes the deepest matching `_posts/` folder, a title and a slug, and asks you to confirm (and whether
   to include a personal experience);
2. researches current facts for tool or service topics;
3. writes a 1500–3000 word, Chirpy-formatted post with the correct front matter;
4. generates a cover image with its own script (`~/.claude/skills/create-blog/scripts/make_cover.py`);
5. builds the site and runs htmlproofer.

It never commits. Publish with `task update` when you're happy.

> To give a new post the standard Cloudutsuk hero image instead of the `make_cover.py` cover, run
> the Level 1 image skill on it afterwards (below). It replaces the `image:` front matter.

---

## Project playbooks: a tag, 18 posts and an index page

The `cloudutsuk-project` skill ([.claude/skills/cloudutsuk-project/](.claude/skills/cloudutsuk-project/SKILL.md))
documents a whole project as a series. You give it a project name and a short brief, and it:

1. adds a **new tag** for the project (for example `Acme Shop` → `/tags/acme-shop/`);
2. writes **one post per area** of the 18-area framework (vision, requirements, planning, UX, architecture,
   security, data, dev prep, implementation, QA, infrastructure, CI/CD, go-live, operations, docs, support,
   governance, continuous improvement), with one section per topic. Posts are written in a first-person,
   opinionated voice and are specific to the project. Wherever the brief doesn't give a fact, a visible
   **TODO** callout asks you for it instead of guessing;
3. turns the **tag page into the project index**: clicking the tag on any of its posts opens
   `/tags/<project>/`, which shows the 18 areas grouped by phase, with links to each post and to every topic
   section, plus how many areas are written;
4. adds a Previous / Project index / Next bar to each post, lists the project on the **Projects** tab, and
   gives every post a Level 1 **hero image**;
5. checks the result and runs htmlproofer. It never commits.

```text
Create a project playbook for "Acme Shop": a B2C e-commerce site on Azure (AKS, PostgreSQL), team of 5, MVP in 4 months
Write the Security and Privacy and QA areas for the Acme Shop project
Fill in the TODOs in the Acme Shop playbook: availability target is 99.9%, budget is 8 lakh
```

| Piece | Where |
|---|---|
| The 18 areas, their topics, phases and icons (shared by all projects) | [_data/project_framework.yml](_data/project_framework.yml) |
| One card per project: name, tag, summary, status, facts, your brief | `_data/projects/<slug>.yml` |
| The posts | `_posts/projects/<slug>/<date>-<NN>-<area>.md` |
| Tag page → project index (any tag with a `_data/projects/` file) | [_layouts/tag.html](_layouts/tag.html), [_includes/project-index.html](_includes/project-index.html) |
| In-post navigation bar | [_includes/project-nav.html](_includes/project-nav.html) |
| Styles | [_sass/project-index.scss](_sass/project-index.scss) |

Tags without a `_data/projects/` file keep Chirpy's normal tag page. Each topic heading in a project post
carries a fixed anchor (`{: #functional-requirements }`) that the index links to, so don't rename topic
headings by hand; edit the topics in `_data/project_framework.yml` instead (see the skill's "Changing the
framework"). To scaffold or check a project yourself:

```bash
S=.claude/skills/cloudutsuk-project/scripts
python3 $S/scaffold.py --name "Acme Shop" --summary "..." --status Planning --dry-run
python3 $S/check.py acme-shop          # front matter, anchors, leftover placeholders, TODO and word counts
```

---

## Hands-on labs: runnable code, real screenshots, 7 posts

The `cloudutsuk-learning-lab` skill ([.claude/skills/cloudutsuk-learning-lab/](.claude/skills/cloudutsuk-learning-lab/SKILL.md))
turns a topic into a lab the reader builds and observes. The model is
`~/gitrepos/observability/otel-static-site-k3d` (nginx + OpenTelemetry + Grafana LGTM on k3d). You give
it a topic, and it:

1. designs **3–7 experiments** first: one action each (reload a page, send a burst, kill a pod), a
   prediction prompt, the signal to look for (panel, query, expected change) and the screenshots to take;
2. builds a **separate lab repo** from a k3d + OpenTelemetry Collector + Grafana LGTM template (app code,
   manifests, a provisioned dashboard, `make up/status/down`, one `make exp-<id>` and `make verify-<id>`
   per experiment). Another platform is used when the topic needs it;
3. **runs the lab and captures real screenshots**: before/after panel shots and animated WebP timelapses,
   taken with headless Chromium while each experiment runs, only kept when the verify step confirms the
   signal reached the backend. Claude reviews every image before describing it;
4. writes **7 posts** (overview and architecture, write the code, set up infrastructure, deploy, monitor,
   experiments, understand and review) with animated flow diagrams and an experiment card per experiment;
5. turns `/tags/<lab>/` into the **lab index** (parts, topics, experiment tiles with thumbnails) and adds
   the lab to the **Labs** tab (one tile per lab, grouped by category, linking every part and experiment)
   and to the Projects tab under **Hands-on Labs**. It checks the result and never commits.

```text
Create a hands-on lab on Kubernetes HPA autoscaling, observed in Grafana
Turn ~/gitrepos/observability/otel-static-site-k3d into a learning lab
Add an experiment to the OTel Static Site lab that shows a 500 error in traces and logs
Re-capture the screenshots for the OTel Static Site lab
```

| Piece | Where |
|---|---|
| The 7 parts and their topics (shared by all labs) | [_data/lab_framework.yml](_data/lab_framework.yml) |
| Lab card: name, tag, platform, capture settings, experiments | `_data/labs/<slug>.yml` |
| Screenshots and their manifest (size, capture time, verify result, lab revision) | `assets/img/labs/<slug>/`, `_data/lab_shots/<slug>.json` |
| The posts | `_posts/labs/<slug>/<date>-<NN>-<part>.md` |
| Tag page → lab index | [_layouts/tag.html](_layouts/tag.html), [_includes/lab-index.html](_includes/lab-index.html) |
| **Labs** tab: one tile per lab by category | [_tabs/labs.md](_tabs/labs.md), [_includes/labs-catalog.html](_includes/labs-catalog.html), categories in [_data/lab_catalog.yml](_data/lab_catalog.yml) |
| Experiment card, navigation bar | [_includes/lab-experiment.html](_includes/lab-experiment.html), [_includes/lab-nav.html](_includes/lab-nav.html) |
| Styles | [_sass/lab.scss](_sass/lab.scss) (reuses `_sass/project-index.scss`) |

To run the scripts yourself:

```bash
S=.claude/skills/cloudutsuk-learning-lab/scripts
python3 $S/scaffold.py card --name "OTel Static Site" --repo ~/gitrepos/observability/otel-static-site-k3d
python3 $S/lab_repo.py new --lab <slug> --app api --app-ns shop --site-port 8091 --grafana-port 3012
python3 $S/scaffold.py posts --name "OTel Static Site" --tags "OpenTelemetry,Grafana"
node $S/capture.cjs --lab <slug> --dry-run          # then without --dry-run, with the lab running
python3 $S/check.py <slug>                          # card, anchors, experiments, screenshots, Makefile targets
```

capture.cjs needs playwright-core and Chromium (`bash .claude/skills/cloudutsuk-flow-anim/scripts/setup.sh`)
and ffmpeg with libwebp.

---

## Images or animations: which skill?

| You want… | Ask for | Skill |
|---|---|---|
| A cover / social image for a post (default) | "hero image for `<post>`" | `cloudutsuk-image-level-1` |
| A 3D-rendered cover | "3D hero image for `<post>`" | `cloudutsuk-image-level-2` |
| An AI illustrated or photographic cover | "AI illustrated cover for `<post>`" | `cloudutsuk-image-level-3` |
| Covers for a whole folder | "backfill hero images for `_posts/<folder>`" | `cloudutsuk-image-batch` |
| An interactive architecture diagram: levels, expand/collapse, pan and zoom, view tabs, use cases a packet plays through | "interactive diagram of `<system>` for `<post>`" or `/cloudutsuk-diagram <brief>` | `cloudutsuk-diagram` |
| Edit an existing step-through animation (being replaced by `cloudutsuk-diagram`) | "update the animated diagram in `<post>`" | `cloudutsuk-flow-anim` |
| A whole project series with its own tag and index page | "create a project playbook for `<name>`: `<brief>`" | `cloudutsuk-project` |
| A hands-on lab: runnable repo, real dashboard screenshots, 7 posts | "create a hands-on lab on `<topic>`" | `cloudutsuk-learning-lab` |

Images are static covers rendered once. Animations explain a process inside the post and run in the
reader's browser. More detail: [.claude/skills/README.md](.claude/skills/README.md).

## Creating a hero image for a blog post

Four Claude Code skills in [.claude/skills/](.claude/skills/) generate on-brand hero images from a
post's **content**: its title, category folder, tags and headings. Every image is:

- **1200×630 WebP** (Chirpy / OpenGraph size), about 50 KB;
- saved to `assets/img/<post folders>/<slug>.webp`, for example
  `_posts/devops/orchestration/terraform/2021-01-01-terraform-backend.md` →
  `assets/img/devops/orchestration/terraform/terraform-backend.webp`;
- wired into the post as
  ```yaml
  image:
    path: /assets/img/devops/orchestration/terraform/terraform-backend.webp
    alt: "Terraform Backend - DevOps hero image"
  ```
- branded the same way: the category label, the title, tag chips and `cloudutsuk.com` in the category's
  colours, with the tool's icon from `assets/img/icons/` (or a category graphic when no icon matches).

### Pick a level

| Skill | How the image is made | Cost / needs | Use it for |
|---|---|---|---|
| `cloudutsuk-image-level-1` | Drawn in code (Pillow): gradients, shapes, real fonts, your icons | Free, offline, deterministic | **The default.** Clean, consistent covers |
| `cloudutsuk-image-level-2` | A Three.js 3D scene of the topic, rendered headlessly, plus the brand overlay | Free, local; one-time setup | "3D render" style covers |
| `cloudutsuk-image-level-3` | Cloudflare Workers AI (Flux) art from a prompt Claude writes, plus the brand overlay | Free tier; Cloudflare keys | Illustrated / photographic covers |
| `cloudutsuk-image-batch` | Level 1, for many posts at once | Free | Backfilling posts with no image or a shared banner |

### Ask Claude Code

Open Claude Code in this repo and ask in plain language. The right skill is picked from your wording:

```text
Create a hero image for _posts/devops/orchestration/terraform/2021-01-01-terraform-backend.md
Make a 3D hero image for the zero trust post                      # Level 2
Generate an AI illustrated cover for the agentic AI post          # Level 3
Backfill hero images for _posts/devops/orchestration/terraform    # batch
```

You can identify a post by its path, its slug (`terraform-backend`), or a unique part of its title. Claude
shows a preview before saving, so ask for tweaks such as a shorter title, different tags, another icon, or a
different motif.

Safety rules:

- A post that already has **its own** image is never overwritten without your confirmation.
- Shared banners (used by 2+ posts, e.g. `kubernetes-posts.png`) are replaced freely.
- The old banner files are never deleted.
- Nothing is committed.

### Or run the scripts yourself

```bash
C=.claude/skills/cloudutsuk-image-common

python3 $C/post_context.py terraform-backend           # what the image will be based on (JSON)
python3 $C/hero.py terraform-backend                   # preview -> hero-preview/terraform-backend.webp
python3 $C/hero.py terraform-backend --write           # save to assets/img/... + update front matter
```

Useful `hero.py` options:

| Option | Effect |
|---|---|
| `--title "Shorter Title"` | Override the displayed title (long titles are auto-fitted to ≤3 lines) |
| `--tags "State,Backends"` | Choose the tag chips (`--tags ""` for none) |
| `--icon assets/img/icons/...svg` / `--no-icon` | Force an icon, or use the category graphic |
| `--motif network\|stack\|pipeline\|shield\|blueprint\|orbit` | Pick the category graphic |
| `--background image.png` | Use a Level 2/3 image as the canvas, with the brand overlay on top |
| `--alt "..."` | Alt text for the front matter |
| `--force` | Replace a post's own (non-shared) image |

Bulk:

```bash
B=.claude/skills/cloudutsuk-image-batch/find_targets.py
python3 $B _posts/cloud                                # list posts needing an image
python3 $B _posts/cloud --run --preview-dir /tmp/h     # render previews only
python3 $B _posts/cloud --run --jobs 8                 # render + update front matter
```

`hero-preview/` is gitignored and excluded from the Jekyll build.

### One-time setup for images

| For | Do this |
|---|---|
| Tool icons (all levels) | `pip install --user --break-system-packages cairosvg`. Without it, images fall back to the category graphic |
| Level 2 (3D) | `sudo apt-get install -y libxi-dev libglu1-mesa-dev libgl-dev libxext-dev libx11-dev pkg-config xvfb`, then `bash .claude/skills/cloudutsuk-image-level-2/scripts/setup.sh` (from any directory; installs into `~/.cache/cloudutsuk-scene-render`) |
| Level 3 (Flux) | `cp .env.example .env` and fill in `CF_ACCOUNT_ID` and `CF_API_TOKEN` (Cloudflare token with *Workers AI* permission). `.env` is gitignored |

### Customising the look

- **Colours, category labels and scene hints** are set in
  [.claude/skills/cloudutsuk-image-common/brand.json](.claude/skills/cloudutsuk-image-common/brand.json),
  with one entry per top-level category.
- **New tool icon**: drop `<tool>-18.svg` into `assets/img/icons/<area>/`. It's matched against folder
  names, tags and title words. Map alternative names (e.g. `k8s` → Kubernetes) in `ALIASES` in
  [lib/cloudutsuk.py](.claude/skills/cloudutsuk-image-common/lib/cloudutsuk.py).
- More detail is in each skill's `SKILL.md` and the
  [common README](.claude/skills/cloudutsuk-image-common/README.md).

## Interactive architecture diagrams

One skill does the whole job: **`cloudutsuk-diagram`**
([.claude/skills/cloudutsuk-diagram/](.claude/skills/cloudutsuk-diagram/SKILL.md)). Invoke it with
`/cloudutsuk-diagram <what to draw, which post>` or just ask for an "interactive diagram". It reads the
post, models the components as levels, writes the data, validates it, embeds it in the post and checks
it in a real browser. You don't call any other skill. Example: the system architecture in
[Cloudutsuk Platform: technical architecture](_posts/projects/cloudutsuk-platform/2026-10-10-05-technical-architecture.md).

```text
/cloudutsuk-diagram architecture of the Azure private connectivity lab for its architecture post
Create an interactive diagram of the RAG pipeline for _posts/agenticai/…-rag.md
Add a CI/CD tab and a "rotate a secret" use case to the platform diagram
```

What the reader gets:

- **Levels:** opens at Level 1; Level 0 … N buttons open one layer at a time; click a component to
  expand or collapse it; the deepest components open a side panel with details.
- **Map:** drag to pan, Ctrl/⌘ + wheel or pinch to zoom, ⤢ for browser fullscreen.
- **Arrows:** protocol:port pills, a colour per kind of communication, moving dots for streams, and a
  hover card with the handshake (TLS, OAuth, WebSocket, Kafka …) and why the connection exists.
- **View tabs** at the top centre: Main flows, then views such as Networking, Observability,
  Security and CI/CD that reveal hidden cross-cutting arrows, and Show all.
- **Use cases** on the left: each plays one activity step by step; a packet travels every hop
  (green on the way back), a banner says what each step does, success is celebrated, unused groups
  collapse while it plays and your layout comes back after. Auto-play runs through all of them.

- Each diagram is a YAML file under [_data/diagrams/](_data/diagrams/) in folders that mirror the
  post's, embedded with `{% include diagram.html id="<post folders>/<name>" %}`.
- Shared code: [assets/js/diagram.js](assets/js/diagram.js),
  [_includes/diagram.html](_includes/diagram.html), [_sass/diagram.scss](_sass/diagram.scss).
- Check one yourself:
  `python3 .claude/skills/cloudutsuk-diagram/scripts/validate.py _data/diagrams/<folders>/<name>.yml`.

## Animated diagrams in a post (older; being replaced)

The `cloudutsuk-flow-anim` skill turns a topic (and optionally a post's Mermaid diagram) into an
animated flow: a pointer moves along the arrows, blocks light up, and a caption explains each step, with
play/pause/step/speed controls. Example: "The generic build pipeline" in
[the build ecosystem post](_posts/devops/build-tools/2026-10-01-language-build-ecosystem.md).

```text
Animate the pipeline diagram in _posts/devops/cicd/2026-07-07-python-build-deploy.md
Create an animated diagram of the OAuth authorization code flow for the IAM post
Make an animated GitOps reconcile loop (just give me the include line)
```

- Each diagram is a YAML file under [_data/flow_anims/](_data/flow_anims/), in folders that mirror the
  post's folders (like `assets/img/`). For example
  `_posts/devops/build-tools/…-language-build-ecosystem.md` uses
  `_data/flow_anims/devops/build-tools/generic-build-pipeline.yml`. Edit the captions or colours there;
  no code changes are needed.
- Embed one with `{% include flow-anim.html id="devops/build-tools/generic-build-pipeline" %}` (the id is
  the path under `_data/flow_anims/` without `.yml`).
- Supports pipelines, request paths, parallel stages, pass/fail gates (a checkbox switches runs) and
  feedback loops.
- Shared code: [assets/js/flow-anim.js](assets/js/flow-anim.js),
  [_includes/flow-anim.html](_includes/flow-anim.html), [_sass/flow-anim.scss](_sass/flow-anim.scss).
- Check a diagram yourself:
  `python3 .claude/skills/cloudutsuk-flow-anim/scripts/validate.py _data/flow_anims/<folders>/<name>.yml --png /tmp/x.png`.
