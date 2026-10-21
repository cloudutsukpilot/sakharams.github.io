#!/usr/bin/env python3
"""Check a project's lessons-learned log before it's published.

The log is `_data/project_lessons/<slug>.yml` (rendered by _includes/project-lessons-log.html on the
project's Lessons Learned post, `project_lessons: true`). Every entry is checked for:

  - required fields: id, date, step, title, symptom, cause, fix, lesson (tags and adrs optional)
  - ids `L` + 3 digits, unique, in ascending order; dates ISO; adrs four-digit ids that exist in
    _data/project_adrs/<slug>.yml when that file exists
  - anything private, because the blog is public: emails, GUIDs, 32-hex IDs (Cloudflare zone and
    account IDs look like this), GitHub/Cloudflare/AWS tokens, links into private GitHub repos, and the
    words in ~/.config/cloudutsuk/lesson-denylist.txt (one per line, case-insensitive; kept outside
    the repo so the list itself is never published)

Usage (from the repo root):
  python3 .claude/skills/cloudutsuk-project/scripts/lessons.py <slug>          # check, exit 1 on errors
  python3 .claude/skills/cloudutsuk-project/scripts/lessons.py <slug> --next   # print the next free id
"""
import argparse
import datetime
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[4]
REQUIRED = ["id", "date", "step", "title", "symptom", "cause", "fix", "lesson"]
PUBLIC_REPOS = {"sakharams.github.io", "helm-charts", "argocd", "azure-func-github-ci-cd"}
PRIVATE = [
    (re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"), "email address"),
    (re.compile(r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b"), "GUID"),
    (re.compile(r"\b[0-9a-f]{32}\b"), "32-hex ID (zone/account ID?)"),
    (re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b"), "GitHub token"),
    (re.compile(r"\bcf[au]t_[A-Za-z0-9_-]{20,}\b"), "Cloudflare token"),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "AWS key"),
]
REPO_LINK = re.compile(r"github\.com/[^/\s)]+/([^/\s)#]+)")
DENYLIST = Path.home() / ".config" / "cloudutsuk" / "lesson-denylist.txt"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("slug")
    ap.add_argument("--next", action="store_true", help="print the next free lesson id and exit")
    args = ap.parse_args()

    path = ROOT / "_data" / "project_lessons" / f"{args.slug}.yml"
    if not path.exists():
        sys.exit(f"{path.relative_to(ROOT)} not found")
    lessons = (yaml.safe_load(path.read_text()) or {}).get("lessons") or []
    if args.next:
        nums = [int(l["id"][1:]) for l in lessons if re.fullmatch(r"L\d{3}", str(l.get("id", "")))]
        print(f"L{max(nums, default=0) + 1:03d}")
        return 0

    adr_path = ROOT / "_data" / "project_adrs" / f"{args.slug}.yml"
    adr_ids = None
    if adr_path.exists():
        adr_ids = {str(a["id"]) for a in (yaml.safe_load(adr_path.read_text()) or {}).get("adrs", [])}
    deny = []
    if DENYLIST.exists():
        deny = [w.strip().lower() for w in DENYLIST.read_text().splitlines() if w.strip() and not w.startswith("#")]

    errors, seen, last = [], set(), 0
    for n, lesson in enumerate(lessons, 1):
        where = f"lesson {lesson.get('id', f'#{n}')}"
        for field in REQUIRED:
            if not str(lesson.get(field) or "").strip():
                errors.append(f"{where}: missing {field}")
        lid = str(lesson.get("id", ""))
        if not re.fullmatch(r"L\d{3}", lid):
            errors.append(f"{where}: id must be L + 3 digits")
        else:
            if lid in seen:
                errors.append(f"{where}: duplicate id")
            if int(lid[1:]) <= last:
                errors.append(f"{where}: ids must ascend")
            seen.add(lid)
            last = int(lid[1:])
        try:
            datetime.date.fromisoformat(str(lesson.get("date")))
        except ValueError:
            errors.append(f"{where}: date must be YYYY-MM-DD")
        for adr in lesson.get("adrs") or []:
            if not re.fullmatch(r"\d{4}", str(adr)):
                errors.append(f"{where}: adr '{adr}' must be four digits in quotes")
            elif adr_ids is not None and str(adr) not in adr_ids:
                errors.append(f"{where}: ADR {adr} not in {adr_path.relative_to(ROOT)}")
        text = " ".join(str(v) for v in lesson.values())
        for rx, label in PRIVATE:
            if rx.search(text):
                errors.append(f"{where}: contains a {label}")
        for m in REPO_LINK.finditer(text):
            if m.group(1) not in PUBLIC_REPOS:
                errors.append(f"{where}: links to a private repo ({m.group(1)})")
        for word in deny:
            if word in text.lower():
                errors.append(f"{where}: contains a denylisted word")

    for e in errors:
        print(f"error  {e}")
    note = "" if DENYLIST.exists() else f" (no {DENYLIST} found: denylist not checked)"
    print(f"{len(lessons)} lesson(s) in {path.relative_to(ROOT)}, {len(errors)} error(s){note}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
