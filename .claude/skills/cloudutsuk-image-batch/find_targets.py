#!/usr/bin/env python3
"""Find posts under a folder that need a hero image, and optionally render them all (Level 1).

Usage:
    python3 find_targets.py _posts/devops/orchestration/terraform            # list (default)
    python3 find_targets.py _posts/cloud --mode missing                      # only posts with no image
    python3 find_targets.py _posts/devops --limit 10 --json                  # machine-readable
    python3 find_targets.py _posts/devops/orchestration/terraform --run      # render + update front matter
    python3 find_targets.py <folder> --run --preview-dir /tmp/heroes         # render previews only
    python3 find_targets.py <folder> --run --jobs 10                         # parallel renders

Modes:
    missing  - no `image:` in front matter, or it points at a file that does not exist
    generic  - image is a shared banner (used by 2+ posts, or under /assets/img/common/)
    both     - missing + generic (default). Post-specific images are never touched.
"""
import argparse
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

COMMON = Path(__file__).resolve().parent.parent / "cloudutsuk-image-common"
sys.path.insert(0, str(COMMON / "lib"))
from cloudutsuk import POSTS, ROOT, post_context  # noqa: E402

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("folder", nargs="?", default="_posts")
ap.add_argument("--mode", choices=["missing", "generic", "both"], default="both")
ap.add_argument("--limit", type=int, default=0)
ap.add_argument("--json", action="store_true")
ap.add_argument("--run", action="store_true", help="render each target with hero.py")
ap.add_argument("--jobs", type=int, default=6, help="parallel renders with --run (default 6)")
ap.add_argument("--preview-dir", help="with --run: write previews here instead of assets/img + front matter")
a = ap.parse_args()

folder = (ROOT / a.folder).resolve()
if not folder.is_dir() or POSTS.resolve() not in [folder, *folder.parents]:
    sys.exit(f"{a.folder} is not a folder under _posts/.")

targets = []
for p in sorted(folder.rglob("*.md")):
    if "templates" in p.relative_to(POSTS).parts[:1]:
        continue
    c = post_context(str(p))
    missing = not c["current_image"] or not c["current_image_exists"]
    generic = c["current_image_is_generic"]
    if (a.mode in ("missing", "both") and missing) or (a.mode in ("generic", "both") and generic and not missing):
        targets.append({"post": c["post"], "title": c["title"], "reason": "missing" if missing else
                        f"generic ({c['current_image']} x{c['current_image_shared_by']})",
                        "icon": c["icons"][0] if c["icons"] else None, "target": c["target_image"]})
    if a.limit and len(targets) >= a.limit:
        break

if a.json:
    print(json.dumps(targets, indent=2))
elif not a.run:
    for t in targets:
        print(f"- {t['post']}\n    {t['reason']}; icon: {t['icon'] or 'motif'} -> {t['target']}")
    print(f"\n{len(targets)} post(s) need a hero image in {a.folder} (mode={a.mode}).")

if a.run:
    def render(t):
        cmd = [sys.executable, str(COMMON / "hero.py"), t["post"]]
        if a.preview_dir:
            cmd += ["--out", str(Path(a.preview_dir) / (Path(t["target"]).name))]
        else:
            cmd += ["--write"]
        return t, subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)

    ok, failed = 0, []
    with ThreadPoolExecutor(max_workers=max(1, a.jobs)) as pool:
        for t, r in pool.map(render, targets):
            if r.returncode == 0:
                ok += 1
                print(f"OK   {t['post']}", flush=True)
            else:
                failed.append(t["post"])
                print(f"FAIL {t['post']}\n     {(r.stderr or r.stdout).strip().splitlines()[-1:]}", flush=True)
    print(f"\nRendered {ok}/{len(targets)}." + (f" Failed: {len(failed)}" if failed else ""))
