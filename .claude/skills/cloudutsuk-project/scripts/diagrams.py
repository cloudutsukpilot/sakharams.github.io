#!/usr/bin/env python3
"""Fill the `diagrams:` list of a project card from the diagrams embedded in its posts.

The project index (/tags/<slug>/) shows a Diagrams lane built from the diagram types in
_data/project_framework.yml (`diagrams.types`) and the project's `diagrams:` list in
_data/projects/<slug>.yml. This script finds every `{% include flow-anim.html id="..." %}` (animated,
data in _data/flow_anims/) and `{% include diagram.html id="..." %}` (interactive, the cloudutsuk-diagram
skill, data in _data/diagrams/) in _posts/projects/<slug>/, links it to the nearest section anchor above it (`{: #anchor }`), takes the
title from the diagram's YAML and guesses its type from its name and the post's area. Entries without
a `diagram:` id (Mermaid diagrams or images added by hand) are kept as they are.

Usage (from the repo root):
  python3 diagrams.py <slug>            # print the block it would write
  python3 diagrams.py <slug> --write    # replace the card's diagrams: block
Review the guessed `type` values; anything that fits no type becomes `other` ("More diagrams").
"""
import argparse
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[4]
INCLUDE = re.compile(r'\{%\s*include\s+(flow-anim|diagram)\.html\s+id="([^"]+)"')
# Each include's data folder and the format the index shows for it.
KINDS = {"flow-anim": ("flow_anims", "animated"), "diagram": ("diagrams", "interactive")}
ANCHOR = re.compile(r'^\{:\s*#([a-z0-9-]+)\s*\}\s*$')

# (keyword in the diagram name, type) checked first; then the post's area decides.
NAME_TYPES = [
    ("network", "network"), ("architecture", "system-context"), ("commit-to-deploy", "cicd"), ("cicd", "cicd"), ("pipeline", "cicd"),
    ("release", "cicd"), ("promotion", "cicd"), ("sequence", "sequence"), ("auth", "identity"),
    ("identity", "identity"), ("login", "identity"), ("threat", "threat-model"), ("incident", "incident"),
    ("escalation", "incident"), ("deploy", "deployment"), ("journey", "user-journey"),
    ("data-flow", "data-flow"), ("rag-", "data-flow"), ("telemetry", "observability"),
    ("alert", "observability"),
]
AREA_TYPES = {4: "user-journey", 5: "sequence", 7: "data-flow", 12: "cicd", 14: "observability", 16: "incident"}


def guess_type(name, area):
    for key, dtype in NAME_TYPES:
        if key in name:
            return dtype
    return AREA_TYPES.get(area, "other")


def scan(slug, project_name=""):
    post_dir = ROOT / "_posts" / "projects" / slug
    found = []
    for post in sorted(post_dir.glob("*.md")):
        text = post.read_text()
        front = yaml.safe_load(text.split("---")[1]) or {}
        area = front.get("project_step")
        permalink = f"/posts/projects/{slug}/{re.sub(r'^\d{4}-\d{2}-\d{2}-', '', post.stem)}/"
        anchor = None
        for line in text.splitlines():
            m = ANCHOR.match(line.strip())
            if m:
                anchor = m.group(1)
            m = INCLUDE.search(line)
            if m:
                folder, fmt = KINDS[m.group(1)]
                did = m.group(2)
                data = ROOT / "_data" / folder / f"{did}.yml"
                title = (yaml.safe_load(data.read_text()) or {}).get("title") if data.exists() else None
                name = did.rsplit("/", 1)[-1]
                title = title or name.replace("-", " ")
                if project_name and title.startswith(project_name + " "):
                    title = title[len(project_name) + 1:]
                title = title[:1].upper() + title[1:]
                found.append({
                    "type": guess_type(name, area),
                    "title": title,
                    "url": permalink + (f"#{anchor}" if anchor else ""),
                    "diagram": did,
                    "format": fmt,
                })
    return found


def render(entries):
    out = ["diagrams:"]
    for e in entries:
        parts = [f"type: {e['type']}", f"title: {yaml.safe_dump(e['title'], default_style='\"').strip()}",
                 f"url: {e['url']}"]
        if e.get("diagram"):
            parts.append(f"diagram: {e['diagram']}")
        if e.get("format"):
            parts.append(f"format: {e['format']}")
        out.append("- {" + ", ".join(parts) + "}")
    return "\n".join(out) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("slug")
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()

    card_path = ROOT / "_data" / "projects" / f"{args.slug}.yml"
    if not card_path.exists():
        sys.exit(f"{card_path} not found")
    text = card_path.read_text()
    card = yaml.safe_load(text) or {}
    manual = [d for d in (card.get("diagrams") or []) if not d.get("diagram")]
    entries = scan(args.slug, card.get("name", "")) + manual
    block = render(entries)
    if not args.write:
        print(block, end="")
        return
    # Replace an existing top-level diagrams: block, or insert it before brief: (else append).
    text = re.sub(r"^diagrams:\n(?:(?:[ -].*)?\n)*", "", text, flags=re.M)
    if re.search(r"^brief:", text, flags=re.M):
        text = re.sub(r"^brief:", block + "brief:", text, count=1, flags=re.M)
    else:
        text = text.rstrip("\n") + "\n" + block
    card_path.write_text(text)
    print(f"wrote {len(entries)} diagram(s) to {card_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
