#!/usr/bin/env python3
"""Check a Cloudutsuk project playbook against _data/project_framework.yml.

Errors (exit 1): missing data file or fields, a post with wrong front matter, a topic heading or its
`{: #anchor }` missing (the index deep-links to it, htmlproofer fails on a dead anchor), leftover
SCAFFOLD markers, a missing `image:` file, or the nav include missing.
The interview post (framework `interview:`) is checked the same way: every category heading and anchor,
every bank question as a `<summary>` inside `<details class="project-iq" markdown="1">`, and, once the post
uses role answers, one `<div class="iq-role" data-role="...">` per role the bank lists for that question.
Report only: missing areas or interview post (the index shows them as "Not written yet"), word counts, TODO callouts,
and phrases that read as machine-written.

Usage (from the repo root):  python3 check.py <slug> [--areas 1,2,5,interview] [--allow-scaffold]
"""
import argparse
import re
import sys
from pathlib import Path

import yaml

ROOT = Path.cwd()
BANNED = [
    "delve", "dive deep", "let's dive", "fast-paced", "ever-evolving", "it's important to note",
    "game-changer", "game changer", "unlock the power", "unleash", "seamless", "leverage",
    "navigate the complexities", "in conclusion", "whether you're a beginner", "happy coding",
    "in today's", "robust",
]


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def split_front_matter(text):
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    if not m:
        return None, text
    return yaml.safe_load(m.group(1)), m.group(2)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("slug")
    ap.add_argument("--areas", help="Only check these area ids and/or `interview`")
    ap.add_argument("--allow-scaffold", action="store_true", help="Don't fail on SCAFFOLD markers")
    args = ap.parse_args()

    framework = yaml.safe_load((ROOT / "_data" / "project_framework.yml").read_text())
    errors, notes = [], []

    data_file = ROOT / "_data" / "projects" / f"{args.slug}.yml"
    tag = None
    if not data_file.exists():
        errors.append(f"{data_file.relative_to(ROOT)} is missing")
    else:
        card = yaml.safe_load(data_file.read_text()) or {}
        for field in ("name", "tag", "summary"):
            if not card.get(field):
                errors.append(f"data file: `{field}` is empty")
        tag = card.get("tag")
        if tag and slugify(str(tag)) != args.slug:
            errors.append(f"data file: tag {tag!r} slugifies to {slugify(str(tag))!r}, not {args.slug!r}")
        facts = card.get("facts") or []
        labels = [str(f.get("label", "")).lower() for f in facts]
        if "team" in labels:
            errors.append("data file: drop the `Team` fact (team details stay in the posts, not on the card)")
        if "architecture" not in labels:
            notes.append("data file: no `Architecture` fact linking to the architecture diagram")
        for f in facts:
            if f.get("url") and not str(f["url"]).startswith(f"/posts/projects/{args.slug}/"):
                notes.append(f"data file: fact {f.get('label')!r} links outside this project: {f['url']}")
        dtypes = {t["id"] for t in (framework.get("diagrams") or {}).get("types", [])} | {"other"}
        listed = set()
        for d in card.get("diagrams") or []:
            if d.get("type") not in dtypes:
                errors.append(f"data file: diagram {d.get('title')!r} has unknown type {d.get('type')!r} (use one of {sorted(dtypes)})")
            if not str(d.get("url", "")).startswith(f"/posts/projects/{args.slug}/"):
                errors.append(f"data file: diagram {d.get('title')!r} must link to a post of this project, not {d.get('url')!r}")
            if d.get("diagram"):
                listed.add(d["diagram"])
                if not (ROOT / "_data" / "flow_anims" / f"{d['diagram']}.yml").exists():
                    errors.append(f"data file: diagram {d.get('title')!r} points at a missing flow-anim {d['diagram']!r}")
        embedded = set()
        for post in (ROOT / "_posts" / "projects" / args.slug).glob("*.md"):
            embedded |= set(re.findall(r'flow-anim\.html\s+id="([^"]+)"', post.read_text()))
        if embedded - listed:
            notes.append(f"data file: diagrams embedded but not in `diagrams:` (run scripts/diagrams.py {args.slug} --write): {', '.join(sorted(embedded - listed))}")
        todo_card = [k for k, v in card.items() if "TODO" in yaml.safe_dump(v)]
        if todo_card:
            notes.append(f"data file: TODO left in {', '.join(todo_card)}")

    post_dir = ROOT / "_posts" / "projects" / args.slug
    areas = framework["areas"]
    interview = framework.get("interview")
    if args.areas:
        tokens = {a.strip() for a in args.areas.split(",") if a.strip()}
        if "interview" not in tokens:
            interview = None
        wanted = {int(a) for a in tokens - {"interview"}}
        areas = [a for a in areas if a["id"] in wanted]

    rows = []
    for area in areas:
        matches = sorted(post_dir.glob(f"*-{area['id']:02d}-{area['slug']}.md"))
        if not matches:
            notes.append(f"area {area['id']:>2} {area['title']}: not written")
            continue
        path = matches[0]
        rel = path.relative_to(ROOT)
        fm, body = split_front_matter(path.read_text())
        if fm is None:
            errors.append(f"{rel}: no front matter")
            continue
        if fm.get("layout") != "post":
            errors.append(f"{rel}: layout must be post")
        if fm.get("categories") != ["projects", args.slug]:
            errors.append(f"{rel}: categories must be [projects, {args.slug}]")
        if fm.get("project") != args.slug:
            errors.append(f"{rel}: project must be {args.slug}")
        if fm.get("project_step") != area["id"]:
            errors.append(f"{rel}: project_step must be {area['id']}")
        if tag and tag not in (fm.get("tags") or []):
            errors.append(f"{rel}: tags must include the project tag {tag!r}")
        image = fm.get("image")
        image_path = image.get("path") if isinstance(image, dict) else image
        if image_path and not (ROOT / image_path.lstrip("/")).exists():
            errors.append(f"{rel}: image {image_path} does not exist")
        elif not image_path:
            notes.append(f"{rel}: no hero image yet")
        if "<!-- more -->" not in body:
            errors.append(f"{rel}: no <!-- more --> excerpt separator")
        if "{% include project-nav.html %}" not in body:
            errors.append(f"{rel}: no {{% include project-nav.html %}}")
        for topic in area["topics"]:
            anchor = slugify(topic)
            if not re.search(rf"^## {re.escape(topic)}\s*\n\{{: #{anchor} \}}", body, re.M):
                errors.append(f"{rel}: missing '## {topic}' followed by '{{: #{anchor} }}'")
        scaffold = body.count("<!-- SCAFFOLD")
        if scaffold and not args.allow_scaffold:
            errors.append(f"{rel}: {scaffold} SCAFFOLD marker(s) left")
        prose = re.sub(r"```.*?```|<!--.*?-->|\{%.*?%\}|\{:.*?\}", " ", body, flags=re.S)
        words = len(re.findall(r"[A-Za-z0-9']+", prose))
        todos = len(re.findall(r"\*\*TODO", body))
        lower = prose.lower()
        banned = sorted({b for b in BANNED if b in lower})
        if banned:
            notes.append(f"{rel}: reads as generated: {', '.join(banned)}")
        rows.append((area["id"], area["title"], words, todos, scaffold))

    if interview:
        matches = sorted(post_dir.glob(f"*-{interview['slug']}.md"))
        if not matches:
            notes.append(f"{interview['title']}: not written (index shows the tile as 'Not written yet')")
        else:
            path = matches[0]
            rel = path.relative_to(ROOT)
            fm, body = split_front_matter(path.read_text())
            fm = fm or {}
            if fm.get("layout") != "post":
                errors.append(f"{rel}: layout must be post")
            if fm.get("categories") != ["projects", args.slug]:
                errors.append(f"{rel}: categories must be [projects, {args.slug}]")
            if fm.get("project") != args.slug:
                errors.append(f"{rel}: project must be {args.slug}")
            if fm.get("project_interview") is not True:
                errors.append(f"{rel}: project_interview must be true")
            if "project_step" in fm:
                errors.append(f"{rel}: must not have project_step (it isn't one of the areas)")
            if tag and tag not in (fm.get("tags") or []):
                errors.append(f"{rel}: tags must include the project tag {tag!r}")
            image = fm.get("image")
            image_path = image.get("path") if isinstance(image, dict) else image
            if image_path and not (ROOT / image_path.lstrip("/")).exists():
                errors.append(f"{rel}: image {image_path} does not exist")
            elif not image_path:
                notes.append(f"{rel}: no hero image yet")
            if "<!-- more -->" not in body:
                errors.append(f"{rel}: no <!-- more --> excerpt separator")
            if "{% include project-nav.html %}" not in body:
                errors.append(f"{rel}: no {{% include project-nav.html %}}")
            role_ids = {r["id"] for r in interview.get("roles", [])}
            uses_roles = 'class="iq-role"' in body
            if uses_roles and "{% include project-iq-roles.html %}" not in body:
                errors.append(f"{rel}: role answers need {{% include project-iq-roles.html %}} after the nav include")
            missing_roles = 0
            blocks = re.split(r'(?=<details class="project-iq")', body)
            for cat in interview["categories"]:
                anchor = slugify(cat["title"])
                if not re.search(rf"^## {re.escape(cat['title'])}\s*\n\{{: #{anchor} \}}", body, re.M):
                    errors.append(f"{rel}: missing '## {cat['title']}' followed by '{{: #{anchor} }}'")
                for q in cat["questions"]:
                    text = q if isinstance(q, str) else q["q"]
                    roles = ["architect"] if isinstance(q, str) else (q.get("roles") or ["architect"])
                    pat = rf'<details class="project-iq" markdown="1"[^>]*>\s*\n<summary>{re.escape(text)}</summary>'
                    block = next((b for b in blocks if re.match(pat, b)), None)
                    if block is None:
                        errors.append(f"{rel}: missing question in a project-iq <details>: {text!r}")
                        continue
                    if not uses_roles:
                        continue
                    block = block.split("</details>")[0]
                    present = re.findall(r'<div class="iq-role" data-role="([a-z-]+)" markdown="1">', block)
                    for r in present:
                        if r not in role_ids:
                            errors.append(f"{rel}: unknown role {r!r} in {text!r}")
                    for r in roles:
                        if r not in present:
                            missing_roles += 1
                            errors.append(f"{rel}: no {r} answer for {text!r}")
            if not uses_roles:
                notes.append(f"{rel}: role answers not written yet (architect-only answers)")
            if body.count('<div class="iq-role"') > body.count("</div>"):
                errors.append(f"{rel}: an iq-role <div> is not closed")
            opened, closed = body.count("<details"), body.count("</details>")
            if opened != closed:
                errors.append(f"{rel}: {opened} <details> but {closed} </details>")
            scaffold = body.count("<!-- SCAFFOLD")
            if scaffold and not args.allow_scaffold:
                errors.append(f"{rel}: {scaffold} SCAFFOLD marker(s) left")
            prose = re.sub(r"```.*?```|<!--.*?-->|\{%.*?%\}|\{:.*?\}|<[^>]+>", " ", body, flags=re.S)
            lower = prose.lower()
            banned = sorted({b for b in BANNED if b in lower})
            if banned:
                notes.append(f"{rel}: reads as generated: {', '.join(banned)}")
            rows.append(("IQ", interview["title"], len(re.findall(r"[A-Za-z0-9']+", prose)),
                         len(re.findall(r"\*\*TODO", body)), scaffold))

    if rows:
        print(f"{'#':>2}  {'area':<40} {'words':>6} {'TODOs':>6} {'scaffold':>8}")
        for r in rows:
            print(f"{r[0]:>2}  {r[1]:<40} {r[2]:>6} {r[3]:>6} {r[4]:>8}")
        print(f"    {'total':<40} {sum(r[2] for r in rows):>6} {sum(r[3] for r in rows):>6}\n")
    for n in notes:
        print(f"note   {n}")
    for e in errors:
        print(f"ERROR  {e}")
    print(f"\n{len(errors)} error(s), {len(notes)} note(s); index: /tags/{args.slug}/")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
