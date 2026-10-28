#!/usr/bin/env python3
"""Scaffold a Cloudutsuk hands-on lab: the lab card and one skeleton post per part.

Reads the parts and topics from _data/lab_framework.yml and writes:
  _data/labs/<slug>.yml                                  lab card + experiments (step 1: you fill it in)
  _posts/labs/<slug>/<date>-<NN>-<part slug>.md           one post per part, `##` per topic

Part 6 (experiments) gets one `## Experiment N: <title>` + `{: #exp-<id> }` section per experiment
in the card, each with the experiment include and two SCAFFOLD markers for the explanation. So design
the experiments in the card first, then scaffold the posts. Experiments added to the card later are
appended to the existing post with --add-experiments.

<slug> is the lab tag slugified the way Jekyll does it, so /tags/<slug>/ finds the card.
Every body is a `<!-- SCAFFOLD: ... -->` marker that Claude replaces; check.py fails while any is left.

Usage (from the repo root):
  python3 scaffold.py card  --name "OTel Static Site" [--tag "..."] [--summary "..."] [--repo PATH]
  python3 scaffold.py posts --name "OTel Static Site" [--tag "..."] [--tags "OpenTelemetry,Grafana"]
                            [--date 2026-10-08] [--parts 1,2,6] [--add-experiments] [--dry-run] [--force]
"""
import argparse
import datetime as dt
import re
import sys
from pathlib import Path

import yaml

ROOT = Path.cwd()
FRAMEWORK = ROOT / "_data" / "lab_framework.yml"

# Extra guidance per topic anchor, appended to the SCAFFOLD marker.
HINTS = {
    "what-you-will-build": "The finished system in plain words and why it is worth building. End with the "
                           "lab repo path/URL and the one command that brings it up.",
    "prerequisites": "Table: tool, version used, check command (`docker version`, `k3d version`...), plus free "
                     "host ports and rough RAM/disk. Cloud labs: cost and the account access needed.",
    "architecture": "Animated diagram of the request path and signal path (cloudutsuk-flow-anim, "
                    "id labs/<slug>/architecture) plus a component table: component, role, where it runs.",
    "building-blocks": "One short card per technology the lab uses (language, framework, server, gateway, "
                       "datastore, container/orchestration, observability pieces): what it is in 2-3 sentences, "
                       "why this lab uses it, where it appears (file/manifest link). Link existing deeper blog "
                       "posts where they exist (check the URL). A table or ### per tech.",
    "what-you-will-learn": "4-6 concrete outcomes, each tied to the experiment that proves it (link #exp-<id>).",
    "repository-layout": "Tree of the lab repo with one line per file, quoted from the real repo.",
    "the-application": "Walk the real application code: what it does, the important lines (quote them), why.",
    "instrumentation": "How the code emits each signal (SDK, module, exporter, sidecar). Quote the config. "
                       "Explain emit vs scrape vs collect for this lab.",
    "build-the-image": "The Dockerfile line by line (table), the build command and how the image reaches "
                       "the cluster (k3d image import, registry...).",
    "the-cluster": "Cluster config quoted and explained: nodes, port mappings, what is fixed at create time.",
    "application-manifests": "Deployment/Service/Ingress (or compose) quoted and explained, probes and "
                             "resources included.",
    "observability-stack": "Collector receivers/processors/exporters per pipeline, backend (LGTM or other), "
                           "dashboard provisioning. Animated pipeline diagram if it adds clarity.",
    "ports-and-endpoints": "Table of every URL/port the learner uses: what it is, how it is exposed.",
    "bring-it-up": "The exact commands (`make up`), roughly how long the first run takes and why.",
    "verify-the-rollout": "Commands to check pods/rollouts and the expected output (quote real output).",
    "smoke-test": "curl/browser checks for each endpoint with the expected response.",
    "common-failures": "Table: symptom, cause, fix. Only failures you hit or that the setup clearly invites.",
    "open-the-dashboard": "Where the dashboard lives, time picker, variables, refresh. Wide screenshot of the "
                          "whole dashboard (captured, listed in the card as a shot of a 'tour' experiment or "
                          "embedded as a plain image under assets/img/labs/<slug>/).",
    "panel-by-panel": "Table: panel, query, what it answers, what normal looks like here.",
    "explore-queries": "The ad-hoc queries worth knowing for each backend (PromQL, LogQL, TraceQL), with what "
                       "each returns in this lab.",
    "signal-timing": "Why signals arrive late: scrape interval, batch delay, log tailing. Give the numbers "
                     "from this lab's config. This sets the `wait` of every experiment.",
    "how-to-run-an-experiment": "The loop: read the goal, predict, run the action, wait, look, explain. "
                                "Mention the `make exp-*` targets and that every screenshot was captured "
                                "from a real run (give the capture date from the card).",
    "the-full-signal-path": "Recap of one request end to end with the animated diagram (reuse or extend the "
                            "architecture one), now that the reader has seen each hop in a dashboard.",
    "what-the-experiments-showed": "One line per experiment: what it proved. Link each #exp-<id>.",
    "limits-of-this-setup": "Honest list: ephemeral storage, single node, no auth, sampling... from the real config.",
    "taking-it-to-production": "What you would change and why: HA backends, retention, sampling, security, "
                               "alerting, cost. Recommendations, framed as such.",
    "tear-down": "`make down` and what it deletes (data included). Cloud labs: verify nothing is left billing.",
    "go-further": "3-5 follow-up exercises the reader can try alone, each with the signal they should expect.",
}


def slugify(text):
    """Jekyll's default `slugify`: lowercase, runs of non-alphanumerics become one hyphen."""
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def yaml_str(text):
    return '"' + text.replace("\\", "\\\\").replace('"', '\\"') + '"'


def experiment_section(n, exp):
    return [
        f"## Experiment {n}: {exp['title']}",
        f"{{: #exp-{exp['id']} }}",
        "",
        f'{{% include lab-experiment.html id="{exp["id"]}" %}}',
        "",
        "### What the screenshots show",
        "",
        f"<!-- SCAFFOLD: exp {exp['id']} observed. Look at the captured images and describe what actually "
        "changed, panel by panel, with the real numbers/IDs visible in them. Compare with the prediction. -->",
        "",
        "### Why it happens",
        "",
        f"<!-- SCAFFOLD: exp {exp['id']} explanation. Trace the cause through the stack (which component "
        "emitted what, how it travelled, why the delay). Link the part that set it up. -->",
        "",
    ]


def post_text(name, tag, slug, part, date, extra_tags, experiments, closing):
    tags = ["Labs", tag] + [t for t in extra_tags if t not in ("Labs", tag)]
    title = f"{name}: {part['title']}"
    lines = [
        "---",
        "layout: post",
        f"title: {yaml_str(title)}",
        f"date: {date} 00:{part['id']:02d}:00 +0530",
        f"categories: [labs, {slug}]",
        f"tags: [{', '.join(tags)}]",
        f"description: {yaml_str(part['summary'].rstrip('.') + ' (' + name + ' lab).')}",
        f"lab: {slug}",
        f"lab_part: {part['id']}",
        "---",
        "",
        f"<!-- SCAFFOLD: intro. 2-4 sentences: what this part of the {name} lab does and what the reader "
        "will have (or see) at the end of it. Address the reader as 'you'. -->",
        "",
        "<!-- more -->",
        "",
        "{% include lab-nav.html %}",
        "",
    ]
    for topic in part["topics"]:
        anchor = slugify(topic)
        lines += [
            f"## {topic}",
            f"{{: #{anchor} }}",
            "",
            f"<!-- SCAFFOLD: {topic}. {HINTS.get(anchor, 'Apply it to this lab, quoting the real repo.')} "
            "Unknown facts become a TODO callout, never a guess. -->",
            "",
        ]
    if part.get("experiments"):
        for n, exp in enumerate(experiments, 1):
            lines += experiment_section(n, exp)
    lines += [
        f"## {closing}",
        f"{{: #{slugify(closing)} }}",
        "",
        "<!-- SCAFFOLD: 3-5 questions about this part, each as "
        '<details markdown="1"><summary>Question</summary> answer </details>. -->',
        "",
        "{% include lab-nav.html %}",
        "",
    ]
    return "\n".join(lines)


CARD = """\
# Hands-on lab card for /tags/{slug}/ (see _includes/lab-index.html).
# Created by the cloudutsuk-learning-lab skill. `experiments` drive the experiment cards in part 6,
# the index tiles and scripts/capture.cjs. `brief` is the author's request, not rendered.
name: {name}
tag: {tag}
summary: {summary}
status: Draft            # Draft | Built | Published
created: '{date}'
level: Beginner          # Beginner | Intermediate | Advanced
duration: TODO           # e.g. "about 60 minutes"
category: hands-on-labs  # Projects tab group (_data/project_catalog.yml)
lab_category: TODO       # Labs tab group: an id from _data/lab_catalog.yml (observability, ...)
clouds: [agnostic]       # azure | aws | gcp | agnostic
repo:
  path: {repo}           # the lab repo, relative to ~/gitrepos (not rendered; the lab runner rejects ~)
  # url: https://github.com/<owner>/<repo>   # rendered as a "Lab code" chip once public
deploy:                  # read by the lab runner so the portal's Labs page can deploy the lab (not rendered)
  targets: {{up: up, down: down, status: status}}   # plain Make target names in repo.path
  memory_gb: TODO        # admission control: what the running lab uses (docker stats), rounded up
  ports: [8081, 3002]    # every host port the lab publishes (same as endpoints)
  # ttl_hours: 4         # cloud labs only: auto-destroy after this many hours
platform:
  runtime: k3d           # k3d | docker-compose | kind | aks | eks | gke ...
  observability: OpenTelemetry Collector + Grafana LGTM
  cost: free-local       # anything else is shown as a warning on the index
facts: []                # optional extra chips: - {{label: Stack, value: nginx, OpenTelemetry}}
endpoints:               # what the reader opens; capture.urls uses the same names
  site: http://localhost:8081
  grafana: http://localhost:3002
capture:
  urls:
    site: http://localhost:8081
    grafana: http://localhost:3002
  viewport: {{width: 1440, height: 900}}
  color_scheme: dark
  window: 15m            # ${{from}} = experiment start minus this; ${{to}} = capture time
  settle_ms: 3000        # extra wait after network idle before each screenshot
  preflight: make status # must exit 0 before anything is captured (run in the lab repo)
  cooldown: 30           # seconds between experiments, so one burst is not in the next "before"
experiments: []
# - id: ping                       # lowercase, digits, hyphens; anchor #exp-ping, files ping-<shot>.webp
#   title: Run a traced request
#   goal: See one click become a browser span and an nginx span in the same trace.
#   signals: [traces, logs, metrics]
#   action:
#     say: Click **Fetch /ping.json** on the site.
#     run: make exp-ping           # shell, run in the lab repo; omit for browser-only actions
#     browser:                     # optional browser steps capture.cjs performs
#       url: site:/
#       steps: [{{click: "#ping"}}, {{wait_for_text: "HTTP 200"}}]
#   predict: How many spans do you expect in the trace, and from which services?
#   wait: 20                       # seconds before the "after" shots (scrape/batch delay)
#   verify: make verify-ping       # optional; non-zero exit marks the run as failed
#   look_for:
#     - {{signal: traces, where: Dashboard › Trace search, query: '{{ resource.service.name = "x" }}', expect: ...}}
#   shots:
#     - {{name: before, phase: before, url: "grafana:/d/<uid>/?orgId=1&kiosk&from=${{from}}&to=${{to}}",
#        alt: ..., caption: ...}}
#     - {{name: after, phase: after, url: "...", selector: '[data-viz-panel-key="panel-4"]', alt: ..., caption: ...}}
#     - {{name: live, phase: during, timelapse: {{seconds: 60, every: 5}}, url: "...", wide: true, alt: ..., caption: ...}}
brief: |
  TODO: the author's request and answers, verbatim (not shown on the site).
"""


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("what", choices=["card", "posts"])
    ap.add_argument("--name", required=True, help="Lab display name")
    ap.add_argument("--tag", help="Tag used on every post (default: --name)")
    ap.add_argument("--summary", default="", help="One or two sentences for the index and Projects tab")
    ap.add_argument("--repo", default="TODO", help="Local path of the lab repo")
    ap.add_argument("--tags", default="", help="Comma list of extra topic tags for the posts")
    ap.add_argument("--date", help="Post date YYYY-MM-DD (default: today in IST, the site timezone)")
    ap.add_argument("--parts", help="Comma list of part ids to scaffold (default: all)")
    ap.add_argument("--add-experiments", action="store_true",
                    help="Append sections for experiments missing from an existing part 6 post")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true", help="Overwrite existing files")
    args = ap.parse_args()

    if not FRAMEWORK.exists():
        sys.exit(f"Run from the repo root: {FRAMEWORK} not found")
    framework = yaml.safe_load(FRAMEWORK.read_text())

    tag = args.tag or args.name
    slug = slugify(tag)
    if not slug:
        sys.exit("The tag has no letters or digits to build a slug from")
    if re.search(r"[,\[\]:#{}]", tag):
        sys.exit("The tag must not contain , [ ] : # { } (it goes into a YAML flow list)")
    if (ROOT / "_data" / "projects" / f"{slug}.yml").exists():
        sys.exit(f"_data/projects/{slug}.yml exists: a project playbook already owns /tags/{slug}/. Pick another tag.")
    date = args.date or dt.datetime.now(dt.timezone(dt.timedelta(hours=5, minutes=30))).date().isoformat()

    card_path = ROOT / "_data" / "labs" / f"{slug}.yml"
    post_dir = ROOT / "_posts" / "labs" / slug
    outputs = []

    if args.what == "card":
        if card_path.exists() and not args.force:
            print(f"keep   {card_path.relative_to(ROOT)} (exists)")
        else:
            summary = args.summary or "TODO: one or two sentences on what the reader builds and observes."
            outputs.append((card_path, CARD.format(slug=slug, name=args.name, tag=tag, date=date,
                                                   summary=yaml_str(summary), repo=args.repo)))
    else:
        if not card_path.exists():
            sys.exit(f"{card_path.relative_to(ROOT)} not found: run `scaffold.py card` and design the experiments first")
        card = yaml.safe_load(card_path.read_text()) or {}
        experiments = card.get("experiments") or []
        ids = [e.get("id") for e in experiments]
        bad = [i for i in ids if not i or not re.fullmatch(r"[a-z0-9-]+", str(i))]
        if bad or len(set(ids)) != len(ids):
            sys.exit(f"experiment ids must be unique and match [a-z0-9-]+: {ids}")
        parts = framework["parts"]
        if args.parts:
            wanted = {int(p) for p in args.parts.split(",") if p.strip()}
            parts = [p for p in parts if p["id"] in wanted]
        extra_tags = [t.strip() for t in args.tags.split(",") if t.strip()]
        closing = framework["closing"]["title"]
        for part in parts:
            existing = sorted(post_dir.glob(f"*-{part['id']:02d}-{part['slug']}.md"))
            if existing and part.get("experiments") and args.add_experiments:
                text = existing[0].read_text()
                missing = [(n, e) for n, e in enumerate(experiments, 1) if f"{{: #exp-{e['id']} }}" not in text]
                if not missing:
                    print(f"keep   {existing[0].relative_to(ROOT)} (all experiments present)")
                    continue
                block = "\n".join(sum((experiment_section(n, e) for n, e in missing), []))
                marker = f"## {closing}\n"
                if marker not in text:
                    sys.exit(f"{existing[0]}: no '## {closing}' heading to insert before")
                outputs.append((existing[0], text.replace(marker, block + "\n" + marker, 1)))
                continue
            if existing and not args.force:
                print(f"keep   {existing[0].relative_to(ROOT)} (exists)")
                continue
            if part.get("experiments") and not experiments:
                print(f"note   part {part['id']}: the card has no experiments yet; scaffolding without them")
            path = existing[0] if existing else post_dir / f"{date}-{part['id']:02d}-{part['slug']}.md"
            outputs.append((path, post_text(args.name, tag, slug, part, date, extra_tags, experiments, closing)))

    for path, text in outputs:
        if args.dry_run:
            print(f"would  {path.relative_to(ROOT)}")
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
        print(f"write  {path.relative_to(ROOT)}")

    print(f"\nslug={slug} tag={tag!r} index=/tags/{slug}/ card=_data/labs/{slug}.yml posts=_posts/labs/{slug}/")


if __name__ == "__main__":
    main()
