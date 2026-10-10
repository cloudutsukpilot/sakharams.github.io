#!/usr/bin/env python3
"""Scaffold a Cloudutsuk project playbook: the project data file and one skeleton post per area.

Reads the 18 areas and their topics from _data/project_framework.yml and writes:
  _data/projects/<slug>.yml                                   project card for the tag index page
  _posts/projects/<slug>/<date>-<NN>-<area slug>.md           one post per area, `##` per topic
  _posts/projects/<slug>/<date>-interview-questions.md         interview prep: `##` per question category,
                                                              one <details> per question (framework `interview:`)

<slug> is the project tag slugified the way Jekyll does it, so /tags/<slug>/ finds the data file.
Every section body is a `<!-- SCAFFOLD: ... -->` marker that Claude replaces with real content;
check.py fails while any marker is left.

Usage (from the repo root):
  python3 scaffold.py --name "Acme Shop" [--tag "Acme Shop"] [--summary "..."] [--status Planning]
                      [--date 2026-10-05] [--areas 1,2,5,interview] [--dry-run] [--force]
"""
import argparse
import datetime as dt
import re
import sys
from pathlib import Path

import yaml

ROOT = Path.cwd()
FRAMEWORK = ROOT / "_data" / "project_framework.yml"


def slugify(text):
    """Jekyll's default `slugify`: lowercase, runs of non-alphanumerics become one hyphen."""
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def yaml_str(text):
    return '"' + text.replace("\\", "\\\\").replace('"', '\\"') + '"'


def post_text(project, tag, slug, area, date):
    tags = ["Projects", tag] + [t for t in area["tags"] if t not in ("Projects", tag)]
    title = f"{project}: {area['title']}"
    lines = [
        "---",
        "layout: post",
        f"title: {yaml_str(title)}",
        f"date: {date} 00:{area['id']:02d}:00 +0530",
        f"categories: [projects, {slug}]",
        f"tags: [{', '.join(tags)}]",
        f"description: {yaml_str(area['summary'].rstrip('.') + ' for ' + project + '.')}",
        f"project: {slug}",
        f"project_step: {area['id']}",
        "---",
        "",
        f"<!-- SCAFFOLD: intro. 2-4 sentences with a concrete hook: what {area['title'].lower()} means for "
        f"{project} specifically and the one decision or risk that matters most here. -->",
        "",
        "<!-- more -->",
        "",
        "{% include project-nav.html %}",
        "",
    ]
    for topic in area["topics"]:
        lines += [
            f"## {topic}",
            f"{{: #{slugify(topic)} }}",
            "",
            f"<!-- SCAFFOLD: {topic}. Apply it to {project}: decisions, examples, a table or checklist "
            "where it helps. Unknown facts become a TODO callout, never a guess. -->",
            "",
        ]
    lines += [
        "## Checklist",
        "{: #checklist }",
        "",
        f"<!-- SCAFFOLD: checklist. 5-10 `- [ ]` items someone could tick off for {project} "
        f"before calling {area['title'].lower()} done. -->",
        "",
        "{% include project-nav.html %}",
        "",
    ]
    return "\n".join(lines)


ROLE_HINTS = {
    "architect": "First person: the answer, the trade-off, and Deeper links to the playbook.",
    "developer": "Concept checklist for the stack, each tied to this codebase, a short real snippet, common commands.",
    "devops": "Build, packaging, environments, secrets, CI/CD and GitOps as implemented, with the commands.",
    "sre": "SLIs and SLOs, monitoring, alerting, probes, capacity, failure modes and the runbook steps.",
}


def question_parts(question):
    """A bank question is either a plain string (architect only) or {q: text, roles: [...]}."""
    if isinstance(question, str):
        return question, ["architect"]
    return question["q"], question.get("roles") or ["architect"]


def interview_text(project, tag, slug, interview, date):
    tags = ["Projects", tag] + [t for t in interview["tags"] if t not in ("Projects", tag)]
    lines = [
        "---",
        "layout: post",
        f"title: {yaml_str(project + ': ' + interview['title'])}",
        f"date: {date} 00:30:00 +0530",
        f"categories: [projects, {slug}]",
        f"tags: [{', '.join(tags)}]",
        f"description: {yaml_str('Software architect interview questions and answers drawn from ' + project + '.')}",
        f"project: {slug}",
        "project_interview: true",
        "---",
        "",
        f"<!-- SCAFFOLD: intro. 2-4 sentences: how to use this page to talk about {project} in an architect "
        "interview, and the one-line pitch of the project you'd open with. -->",
        "",
        "<!-- more -->",
        "",
        "{% include project-nav.html %}",
        "",
        "{% include project-iq-roles.html %}",
        "",
    ]
    for cat in interview["categories"]:
        lines += [f"## {cat['title']}", f"{{: #{slugify(cat['title'])} }}", ""]
        for i, question in enumerate(cat["questions"], 1):
            text, roles = question_parts(question)
            lines += [
                f'<details class="project-iq" markdown="1" id="{slugify(cat["title"])}-q{i}">',
                f"<summary>{text}</summary>",
                "",
            ]
            for role in roles:
                lines += [
                    f'<div class="iq-role" data-role="{role}" markdown="1">',
                    "",
                    f"<!-- SCAFFOLD: {role} answer. {ROLE_HINTS.get(role, '')} See references/roles.md. -->",
                    "",
                    "</div>",
                    "",
                ]
            lines += ["</details>", ""]
    lines += ["{% include project-nav.html %}", ""]
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--name", required=True, help="Project display name, e.g. 'Acme Shop'")
    ap.add_argument("--tag", help="Tag used on every post (default: --name)")
    ap.add_argument("--summary", default="", help="One or two sentences for the index and Projects tab")
    ap.add_argument("--status", default="Planning", help="Planning | In progress | Live | Retired")
    ap.add_argument("--date", help="Post date YYYY-MM-DD (default: today in IST, the site timezone)")
    ap.add_argument("--areas", help="Comma list of area ids and/or `interview` to scaffold (default: all)")
    ap.add_argument("--dry-run", action="store_true", help="Print what would be written")
    ap.add_argument("--force", action="store_true", help="Overwrite existing files")
    args = ap.parse_args()

    if not FRAMEWORK.exists():
        sys.exit(f"Run from the repo root: {FRAMEWORK} not found")
    framework = yaml.safe_load(FRAMEWORK.read_text())
    areas = framework["areas"]
    want_interview = "interview" in framework
    if args.areas:
        tokens = {a.strip() for a in args.areas.split(",") if a.strip()}
        want_interview = want_interview and "interview" in tokens
        wanted = {int(a) for a in tokens - {"interview"}}
        areas = [a for a in areas if a["id"] in wanted]

    tag = args.tag or args.name
    slug = slugify(tag)
    if not slug:
        sys.exit("The tag has no letters or digits to build a slug from")
    if re.search(r"[,\[\]:#{}]", tag):
        sys.exit("The tag must not contain , [ ] : # { } (it goes into a YAML flow list)")
    if args.date:
        date = args.date
    else:
        date = dt.datetime.now(dt.timezone(dt.timedelta(hours=5, minutes=30))).date().isoformat()

    data_file = ROOT / "_data" / "projects" / f"{slug}.yml"
    post_dir = ROOT / "_posts" / "projects" / slug
    outputs = []
    if not data_file.exists() or args.force:
        card = {
            "name": args.name,
            "tag": tag,
            "summary": args.summary or "TODO: one or two sentences on what this project is and who it is for.",
            "status": args.status,
            "created": date,
            "facts": [
                {"label": "Type", "value": "TODO"},
                {"label": "Stack", "value": "TODO"},
                {"label": "Hosting", "value": "TODO"},
            ]
            + (
                [{
                    "label": "Architecture",
                    "value": "System diagram",
                    "url": f"/posts/projects/{slug}/05-technical-architecture/"
                    "#system-context-and-component-architecture",
                }]
                if any(a["id"] == 5 for a in areas)
                else []
            ),
            "brief": "TODO: the project brief exactly as the author gave it (not shown on the site).\n",
        }
        header = (
            f"# Project playbook card for /tags/{slug}/ (see _includes/project-index.html).\n"
            "# Created by the cloudutsuk-project skill. `facts` are shown as chips on the index;\n"
            "# `brief` is the author's own description and is the source of truth for the posts.\n"
        )
        outputs.append((data_file, header + yaml.safe_dump(card, sort_keys=False, allow_unicode=True, width=100)))
    else:
        print(f"keep   {data_file.relative_to(ROOT)} (exists)")

    for area in areas:
        existing = list(post_dir.glob(f"*-{area['id']:02d}-{area['slug']}.md"))
        if existing and not args.force:
            print(f"keep   {existing[0].relative_to(ROOT)} (exists)")
            continue
        path = existing[0] if existing else post_dir / f"{date}-{area['id']:02d}-{area['slug']}.md"
        outputs.append((path, post_text(args.name, tag, slug, area, date)))

    if want_interview:
        interview = framework["interview"]
        existing = list(post_dir.glob(f"*-{interview['slug']}.md"))
        if existing and not args.force:
            print(f"keep   {existing[0].relative_to(ROOT)} (exists)")
        else:
            path = existing[0] if existing else post_dir / f"{date}-{interview['slug']}.md"
            outputs.append((path, interview_text(args.name, tag, slug, interview, date)))

    for path, text in outputs:
        if args.dry_run:
            print(f"would  {path.relative_to(ROOT)}")
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
        print(f"write  {path.relative_to(ROOT)}")

    print(f"\nslug={slug} tag={tag!r} index=/tags/{slug}/ posts={post_dir.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
