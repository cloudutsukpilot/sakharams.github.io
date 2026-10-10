#!/usr/bin/env python3
"""Publish a project's architecture decision records (ADRs) on the blog.

The ADRs live as MADR files (`NNNN-kebab-title.md` with front matter id, title, status, date,
deciders, related_repos) in the project's own repo, which is usually private. This script reads them,
scrubs anything private and writes two things:

  _data/project_adrs/<slug>.yml   the log: id, title, status, date, anchor, repos (used by the
                                  project-adr-log.html include and the index's Architecture Decisions tile)
  the ADR post                    `_posts/projects/<slug>/<date>-architecture-decision-records.md`
                                  (`project_adrs: true`); only the text between `<!-- adr:begin -->`
                                  and `<!-- adr:end -->` is replaced, so the hand-written intro stays.
                                  The post is created with a starter intro if it doesn't exist.

Links between ADRs become anchors in the post (#adr-NNNN); other relative links keep only their text.
Scrubbed: email addresses, GUIDs, GitHub tokens, AWS keys and links into private GitHub repos (anything
under github.com/<org>/ except the public repos listed in PUBLIC_REPOS). Each scrub is reported, so fix
the source ADR rather than relying on it.

Usage (from the repo root):
  python3 sync_adrs.py <slug> --src ../homelab-gitops/docs/adr   # first run (stores the source name)
  python3 sync_adrs.py <slug>                                     # later runs: source from the data file
  python3 sync_adrs.py <slug> --check                             # exit 1 if the blog copy is behind
"""
import argparse
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[4]
NAME = re.compile(r"^(\d{4})-[a-z0-9-]+\.md$")
BEGIN, END = "<!-- adr:begin -->", "<!-- adr:end -->"
PUBLIC_REPOS = {"sakharams.github.io", "helm-charts", "argocd", "azure-func-github-ci-cd"}
SCRUB = [
    (re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"), "[email removed]", "email"),
    (re.compile(r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b"), "[id removed]", "GUID"),
    (re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b"), "[token removed]", "GitHub token"),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "[key removed]", "AWS key"),
]
PRIVATE_LINK = re.compile(r"\[([^\]]+)\]\((https?://github\.com/[^/\s)]+/([^/\s)]+)[^)]*)\)")
SECTIONS = ["Context", "Decision", "Considered options", "Consequences", "Related"]


def scrub(text, where, report):
    for rx, repl, label in SCRUB:
        text, n = rx.subn(repl, text)
        if n:
            report.append(f"{where}: {n} {label}(s) removed")

    def link(m):
        if m.group(3) in PUBLIC_REPOS:
            return m.group(0)
        report.append(f"{where}: link to private repo {m.group(3)} reduced to its text")
        return m.group(1)
    return PRIVATE_LINK.sub(link, text)


def load(src):
    adrs = []
    for path in sorted(p for p in src.glob("*.md") if NAME.match(p.name)):
        text = path.read_text()
        m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
        if not m:
            sys.exit(f"{path}: no front matter")
        fm = yaml.safe_load(m.group(1)) or {}
        body = text[m.end():]
        sections, current = {}, None
        for line in body.splitlines():
            h = re.match(r"^## (.+?)\s*$", line)
            if h:
                current = h.group(1)
                sections[current] = []
            elif current:
                sections[current].append(line)
        adrs.append({
            "id": str(fm["id"]), "title": str(fm["title"]), "status": str(fm["status"]),
            "date": str(fm["date"]), "repos": list(fm.get("related_repos") or []),
            "sections": {k: "\n".join(v).strip() for k, v in sections.items()},
            "file": path.name,
        })
    if not adrs:
        sys.exit(f"no NNNN-*.md ADRs in {src}")
    return adrs


def badge(status):
    m = re.match(r"superseded by (\d{4})", status)
    if m:
        return (f'<span class="adr-status adr-status-superseded">Superseded by '
                f'<a href="#adr-{m.group(1)}">ADR-{m.group(1)}</a></span>')
    return f'<span class="adr-status adr-status-{status}">{status.capitalize()}</span>'


def render_body(adrs, report):
    files = {a["file"]: a["id"] for a in adrs}
    out = [BEGIN, "{% raw %}"]
    for a in adrs:
        out += ["", f"## ADR-{a['id']}: {a['title']}", f"{{: #adr-{a['id']} }}", "",
                f"{badge(a['status'])} <span class=\"adr-meta text-muted\">{a['date']} · "
                + ", ".join(f"`{r}`" for r in a["repos"]) + "</span>"]
        names = [s for s in SECTIONS if s in a["sections"]] + [s for s in a["sections"] if s not in SECTIONS]
        for name in names:
            text = a["sections"][name]
            text = re.sub(r"\]\((\d{4}-[a-z0-9-]+\.md)(#[^)]*)?\)",
                          lambda m: f"](#adr-{files[m.group(1)]})" if m.group(1) in files else m.group(0), text)
            text = re.sub(r"\[([^\]]+)\]\((?!https?://|#)[^)]+\)", r"\1", text)
            text = scrub(text, f"ADR {a['id']} {name}", report)
            out += ["", f"#### {name}", "", text]
    out += ["", "{% endraw %}", END]
    return "\n".join(out)


def data_file(adrs, source, report):
    lines = ["# Generated by .claude/skills/cloudutsuk-project/scripts/sync_adrs.py. Don't edit by hand:",
             "# change the ADR in its repo and re-run the script.",
             f"source: {source}", "adrs:"]
    for a in adrs:
        title = scrub(a["title"], f"ADR {a['id']} title", report)
        lines.append(f"  - {{id: \"{a['id']}\", title: {yaml.safe_dump(title, default_style='"', width=1000).strip()}, "
                     f"status: {a['status']}, date: {a['date']}, anchor: adr-{a['id']}, "
                     f"repos: [{', '.join(a['repos'])}]}}")
    return "\n".join(lines) + "\n"


def new_post(card, slug, adrs, source):
    first = min(a["date"] for a in adrs)
    name = card.get("name", slug)
    tag = card.get("tag", name)
    return f"""---
layout: post
title: "{name}: Architecture Decision Records"
date: {first} 00:30:00 +0530
categories: [projects, {slug}]
tags: [Projects, {tag}, Architecture, ADR]
description: "Every architecture decision behind {name}, with its context, the options considered and the consequences."
project: {slug}
project_adrs: true
---

Every significant decision in {name} is written down as an architecture decision record (ADR): what
forced the decision, what was decided, which options lost and why, and what it costs. This post is the
full log, generated from the project's repo (`{source}`), so it always matches what the project works to.

<!-- more -->

{{% include project-nav.html %}}

## How to read this log
{{: #how-to-read-this-log }}

- **Proposed** decisions are still waiting on evidence, such as a spike or a baseline; **accepted** ones
  are what the platform is built to. A changed decision never edits an accepted ADR: a new ADR replaces
  it and the old one is marked **superseded**, with a link forward, so the history stays.
- Each ADR names the repos it affects. The summary table is in the
  [Technical Architecture](/posts/projects/{slug}/05-technical-architecture/#architectural-decision-records) post.

{BEGIN}
{END}

{{% include project-nav.html %}}
"""


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("slug")
    ap.add_argument("--src", help="ADR folder (default: ../<source> from the data file)")
    ap.add_argument("--check", action="store_true", help="exit 1 if the blog copy differs from the source")
    args = ap.parse_args()

    card_path = ROOT / "_data" / "projects" / f"{args.slug}.yml"
    if not card_path.exists():
        sys.exit(f"{card_path} not found")
    card = yaml.safe_load(card_path.read_text()) or {}
    data_path = ROOT / "_data" / "project_adrs" / f"{args.slug}.yml"
    old_data = yaml.safe_load(data_path.read_text()) if data_path.exists() else {}
    if args.src:
        src = Path(args.src).resolve()
    elif old_data.get("source"):
        src = (ROOT.parent / old_data["source"]).resolve()
    else:
        sys.exit("first run needs --src <folder with the NNNN-*.md ADRs>")
    if not src.is_dir():
        sys.exit(f"{src} is not a folder (clone the repo next to this one, or pass --src)")
    source = f"{src.parents[1].name}/{src.parent.name}/{src.name}" if src.parent.name == "docs" else src.name

    adrs = load(src)
    report = []
    data = data_file(adrs, source, report)
    body = render_body(adrs, report)

    post_dir = ROOT / "_posts" / "projects" / args.slug
    posts = sorted(post_dir.glob("*-architecture-decision-records.md"))
    if posts:
        post_path, post = posts[0], posts[0].read_text()
        if BEGIN not in post or END not in post:
            sys.exit(f"{post_path}: markers {BEGIN} / {END} not found")
    else:
        post_path = post_dir / f"{min(a['date'] for a in adrs)}-architecture-decision-records.md"
        post = new_post(card, args.slug, adrs, source)
    new = post[:post.index(BEGIN)] + body + post[post.index(END) + len(END):]

    for line in report:
        print(f"scrub  {line}")
    rel = lambda p: p.relative_to(ROOT)
    if args.check:
        stale = [rel(p) for p, text in ((data_path, data), (post_path, new))
                 if not p.exists() or p.read_text() != text]
        for p in stale:
            print(f"stale  {p}")
        print(f"{len(adrs)} ADR(s) in {source}; " + ("blog copy is behind" if stale else "blog copy is current"))
        return 1 if stale else 0
    data_path.parent.mkdir(parents=True, exist_ok=True)
    data_path.write_text(data)
    post_path.write_text(new)
    counts = {}
    for a in adrs:
        key = a["status"].split()[0]
        counts[key] = counts.get(key, 0) + 1
    print(f"wrote {rel(data_path)} and {rel(post_path)}: {len(adrs)} ADR(s) "
          + ", ".join(f"{v} {k}" for k, v in sorted(counts.items())))
    return 0


if __name__ == "__main__":
    sys.exit(main())
