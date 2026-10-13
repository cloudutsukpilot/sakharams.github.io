---
name: cloudutsuk-learning-lab
description: >-
  Create a hands-on learning lab on the Cloudutsuk blog (this Jekyll repo): from a topic, build a
  runnable lab repo (application code, a k3d cluster that joins the homelab platform and sends its
  signals to the platform's Grafana (lab contract v2) by default, a dashboard, a Makefile with one target per experiment), run it, perform each experiment
  and capture REAL dashboard screenshots and animated WebP timelapses with headless Chromium, then write
  a 7-part post series (overview and architecture, write the code, set up infrastructure, deploy,
  monitor, experiments, understand and review) under _posts/labs/<slug>/ with a lab index on
  /tags/<slug>/, experiment cards (action, prediction, what to look for, before/after screenshots and
  an explanation of what they show), animated flow diagrams, and a tile on the Projects tab. Use when the
  user asks for a "learning lab", "hands-on lab", "lab", "learning project", "tutorial project with
  screenshots", "set up, deploy, monitor and explain", "observe it in Grafana", wants an existing
  demo repo turned into a lab, wants experiments or screenshots added to or refreshed in a lab, or names
  this skill. For a delivery playbook of a real project use cloudutsuk-project instead.
---

# Cloudutsuk hands-on lab

A lab teaches by doing: **write it, deploy it, poke it, read the dashboards, explain what you saw.**
It is two things kept in sync:

| Piece | Where | Made by |
|---|---|---|
| Lab repo (code, cluster, observability, Makefile, EXPERIMENTS.md) | its own repo, e.g. `~/gitrepos/<area>/<lab>` | `lab_repo.py new` from `templates/k3d-platform/` (contract v2), then you |
| Parts and topics (7 parts, shared by every lab) | [_data/lab_framework.yml](../../../_data/lab_framework.yml) | Fixed |
| Lab card + experiments (the single source for posts, index, capture, EXPERIMENTS.md) | `_data/labs/<slug>.yml` | `scaffold.py card`, then you |
| Screenshots | `assets/img/labs/<slug>/<exp>-<shot>.webp` | `capture.cjs` (never by hand) |
| Screenshot manifest (size, capture time, verify result, lab git revision) | `_data/lab_shots/<slug>.json` | `capture.cjs` |
| One post per part | `_posts/labs/<slug>/<date>-<NN>-<part>.md` | `scaffold.py posts`, then you |
| Experiment card in a post | [_includes/lab-experiment.html](../../../_includes/lab-experiment.html) | `{% include lab-experiment.html id="<exp>" %}` |
| Lab index on `/tags/<slug>/` | [_layouts/tag.html](../../../_layouts/tag.html) → [_includes/lab-index.html](../../../_includes/lab-index.html) | Automatic when the card exists |
| Prev / index / next bar | [_includes/lab-nav.html](../../../_includes/lab-nav.html) | Scaffold adds it |
| Labs tab: one tile per lab, grouped by category, linking every part and experiment | [_tabs/labs.md](../../../_tabs/labs.md) → [_includes/labs-catalog.html](../../../_includes/labs-catalog.html), categories in [_data/lab_catalog.yml](../../../_data/lab_catalog.yml) | Automatic (`lab_category: <id>` in the card) |
| Projects tab tile ("Hands-on Labs") | [_includes/projects-catalog.html](../../../_includes/projects-catalog.html) | Automatic (`category: hands-on-labs`) |
| Styles | [_sass/lab.scss](../../../_sass/lab.scss) (+ project-index.scss) | Shared; don't edit for one lab |

`S=.claude/skills/cloudutsuk-learning-lab/scripts`. Run everything from the blog repo root.
`<slug>` is the lab tag through Jekyll's `slugify`; tag, card name and post folder must agree (the
scaffold guarantees it). A slug that already has `_data/projects/<slug>.yml` is refused.

Reference lab: **OpenTelemetry End to End**, card [_data/labs/opentelemetry-lab.yml](../../../_data/labs/opentelemetry-lab.yml)
and posts in `_posts/labs/opentelemetry-lab/`, built on `~/gitrepos/observability/otel-static-site-k3d`.
Copy its shot shapes: dashboard panels, Explore trace/log/metric shots, a page that shows its own
telemetry, a timelapse. [references/examples/otel-static-site.yml](references/examples/otel-static-site.yml)
is the smaller first version of that lab. Build Explore URLs with `scripts/explore_url.py`.

## 1. Gather the inputs

- **Topic** and what the reader should understand at the end (2–4 outcomes).
- **Name and tag** (default tag = name; no `, [ ] : # { }`).
- **Lab repo**: a new path (default `~/gitrepos/<area>/<slug>`) or an existing demo repo to adapt.
- **Level** (Beginner/Intermediate/Advanced) and **platform**. Default: a k3d cluster on lab contract
  v2: it joins the homelab platform, and its metrics, logs and traces go to mon's Grafana
  ([references/lab-anatomy.md](references/lab-anatomy.md#lab-contract-v2-the-default)). The topic may need
  something else (compose, another backend, a cloud service, a lab that must run without the homelab);
  see [references/lab-anatomy.md](references/lab-anatomy.md#when-the-platform-is-not-k3d).

Ask only for what's missing, in **one** AskUserQuestion call. For a cloud platform, also ask for the
go-ahead to create billable resources; without it, build and write everything but don't run it.

Then check: `ls _data/labs _data/projects _posts/labs 2>/dev/null`, `k3d cluster list` (which host
ports and pod/service ranges are taken), and whether the lab repo path exists. An existing card means **update**: read the
card, the posts and the repo, and only add what's missing. Confirm the plan in one line: tag, slug,
repo path, ports and range, experiment list.

## 2. Design the experiments first

```bash
python3 $S/scaffold.py card --name "<Name>" [--tag "<Tag>"] --summary "<1-2 sentences>" --repo <repo path>
```

Fill in `_data/labs/<slug>.yml`: `lab_category` (an id from `_data/lab_catalog.yml`; add a category
there only if none fits), level, duration, platform, endpoints/`capture.urls` (the lab's own
ports, and `grafana: https://grafana.mon.home.cloudutsuk.com`), the `deploy:` block (Make targets, `memory_gb` from `docker stats` once the lab runs, every
published host port including the API port, `ttl_hours` for cloud labs; `repo.path` must be absolute) that the platform's lab
runner reads so the portal can deploy the lab, and **3–7 experiments**. Before writing shots, read the "Gotchas" in
references/experiments.md (search lag, lazy panels, stale dashboards, probe noise). Design them following [references/experiments.md](references/experiments.md):
each with `goal`, `signals`, `action` (`say` + `run` and/or `browser`), `predict`, `wait`, `verify`,
`look_for` and `shots`. Copy shapes from the reference card. **Double-quote every prose value.**
Keep `brief:` as the author's words verbatim.

## 3. Build the lab repo

New repo:

```bash
python3 $S/lab_repo.py new --lab <slug> [--dest PATH] --app <name> --app-ns <ns> \
  --site-port <port> --api-port <port> --range <even number from 100>
```

Then, following [references/lab-anatomy.md](references/lab-anatomy.md):

1. Write `app/` (code + Dockerfile) and the instrumentation the topic is about.
2. Adapt `k8s/app/app.yaml` (OTLP to `agent-collector.monitoring:4318`) and `dashboards/<slug>.json`
   (one plainly titled panel per thing an experiment asks the reader to look at; stable panel ids;
   every query filtered on the lab's cluster).
3. Add `exp-<id>` and `verify-<id>` targets (verify via `scripts/signal.sh`). Replace `exp-example`.
4. `python3 $S/lab_repo.py sync --lab <slug>` to write EXPERIMENTS.md. Fill README's diagram.

Existing repo: don't restructure it. Add what's missing (exp/verify targets, `scripts/signal.sh`
from the template, EXPERIMENTS.md via sync) and leave its behaviour unchanged. Check `git status`
first. If someone else has uncommitted work there, stop and ask before touching it.

## 4. Run it

```bash
cd <repo> && make up && make status        # first run about 8 minutes, most of it the monitoring pack
make exp-<id> && sleep <wait> && make verify-<id>   # each experiment by hand once
```

Fix the lab until every experiment's verify passes by hand. `make verify-*` and `capture.cjs` need
`~/.config/homelab/grafana-labs-token` (infra-local `host/monitoring/labs-grafana-token.sh`). Check that
mon's Grafana serves the dashboard in the repo (`curl -s -H "Authorization: Bearer $(cat
~/.config/homelab/grafana-labs-token)" https://grafana.mon.home.cloudutsuk.com/api/dashboards/uid/<uid>`);
re-run `make monitoring` after changing it. Open Grafana yourself (or with a quick
Playwright screenshot) and check each panel shows the effect before automating it. Ask the author to
commit the lab repo (or commit it if they asked you to); captures record the revision and flag `-dirty`.

## 5. Capture the screenshots

```bash
bash .claude/skills/cloudutsuk-flow-anim/scripts/setup.sh      # once: playwright-core + Chromium path
CHROME=<path> node $S/capture.cjs --lab <slug> --dry-run         # resolved URLs and commands
CHROME=<path> node $S/capture.cjs --lab <slug> --review <scratchpad>/review
CHROME=<path> node $S/capture.cjs --lab <slug> --only <id> --review <scratchpad>/review   # redo one
```

It runs preflight, then per experiment: before shots → (timelapse first frame) → action → wait →
verify → after shots, writes WebP files and the manifest, and exits 1 on any failure.
**Read every PNG in the review folder** (the checklist in references/experiments.md). Wrong trace,
unchanged number, unreadable panel → fix the card or the lab and re-run that experiment. Note the
real numbers and IDs you see; the posts quote them.

## 6. Write the posts

```bash
python3 $S/scaffold.py posts --name "<Name>" [--tag "<Tag>"] --tags "<Topic>,<Tool>"
python3 $S/scaffold.py posts --name "<Name>" --add-experiments     # after adding experiments later
```

Read [references/voice.md](references/voice.md). For each part, replace every SCAFFOLD marker (each
carries a hint): quote the real repo, give copy-pasteable commands with real output, explain the why
at each hop. In part 6 write **What the screenshots show** and **Why it happens** under each card,
from the PNGs you reviewed. End every part with 3–5 Check Your Understanding questions with folded
answers. **Never rename or remove a `## Topic` + `{: #anchor }` pair or an `## Experiment N:` +
`{: #exp-<id> }` pair**: the index deep-links to them and htmlproofer fails on a dead anchor.

**Animated diagrams wherever something flows**, with
[cloudutsuk-flow-anim](../cloudutsuk-flow-anim/SKILL.md) (labs palette `#22D3EE` / `#A3E635`, data in
`_data/flow_anims/labs/<slug>/<name>.yml`, `{% include flow-anim.html id="labs/<slug>/<name>" %}`):

- Part 1 Architecture: always (`architecture`): request path and signal path, with emit/scrape/tail marked.
- Part 3 Observability Stack: the collector pipeline (receivers → processors → exporters → backends).
- Part 6: a short per-experiment animation where the path differs (e.g. a trace crossing services, a
  failure propagating), embedded above the experiment card.
- Part 7 Full Signal Path: reuse or extend the architecture animation.

Use Mermaid only for static structure (layouts, data models). Screenshots stay real; never draw a
"dashboard" by hand.

```bash
python3 $S/check.py <slug> --allow-scaffold --allow-missing-shots   # while writing
```

## 7. Hero images

```bash
python3 .claude/skills/cloudutsuk-image-batch/find_targets.py _posts/labs/<slug> --limit 3 --run --preview-dir <scratchpad>/heroes
python3 .claude/skills/cloudutsuk-image-batch/find_targets.py _posts/labs/<slug> --run --jobs 8
```

## 8. Verify

```bash
python3 $S/check.py <slug>                    # 0 errors: all shots captured, verify ok, no SCAFFOLD
rm -rf _site .jekyll-cache && JEKYLL_ENV=production bundle exec jekyll b -d _site
task test-site                                # htmlproofer, same as CI
```

Serve `_site` (`python3 -m http.server 4123 -d _site`) and screenshot `/tags/<slug>/`, the
experiments post (dark desktop and light phone) and `/projects/#hands-on-labs`. Check: the index's
experiment tiles have thumbnails, before/after shots sit side by side, animated WebPs play, the
"Look for" table stacks on a phone, no "Screenshot not captured yet" boxes remain. htmlproofer
failures under `_site/posts/labs/<slug>/` or `_site/tags/<slug>/` are yours; report others without
fixing them.

## 9. Report

Never commit the blog repo. Tell the user: the index URL (`https://cloudutsuk.com/tags/<slug>/`), the
lab repo path and revision the screenshots came from, posts written (count, words), experiments with
their verify results, screenshots and animations made, TODOs left, check.py and htmlproofer results.
Ask whether to leave the cluster running or run `make down` (it deletes the observability data).

## Changing a lab later

- **Lab code changed:** re-run the affected experiments with `capture.cjs --only`, re-read the PNGs,
  update the posts' quotes and explanations, then `lab_repo.py sync`.
- **New experiment:** add it to the card, add the make targets, sync, capture `--only <id>`, then
  `scaffold.py posts --add-experiments` and write its sections.
- **Removed experiment or shot:** delete its section and files, then `capture.cjs --prune` (with
  `--only` of any experiment) to drop it from the manifest.
- **Framework change** (`_data/lab_framework.yml`): adding a topic is safe (add the heading + anchor
  to existing labs by hand); renaming one breaks anchors, so update every lab and run check.py on each.
