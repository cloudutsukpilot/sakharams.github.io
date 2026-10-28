#!/usr/bin/env python3
"""Check a Cloudutsuk hands-on lab against _data/lab_framework.yml and its card.

Errors (exit 1):
  card      missing fields, bad tag/slug, invalid experiments (ids, signals, action, look_for, shots)
  posts     wrong front matter, missing topic heading + `{: #anchor }`, missing experiment section
            (`## Experiment N: <title>` + `{: #exp-<id> }` + the lab-experiment include), missing nav
            include or excerpt separator, leftover SCAFFOLD markers, missing hero image file, a
            flow-anim include whose _data/flow_anims/<id>.yml does not exist
  shots     a shot in the card with no file in assets/img/labs/<slug>/ or no entry in
            _data/lab_shots/<slug>.json (skip with --allow-missing-shots while drafting)
  repo      a `make <target>` in an action, verify or preflight that the lab repo's Makefile lacks
  deploy    a `deploy:` block the lab runner would skip: repo.path missing or with ~, bad target names,
            targets the Makefile lacks, bad memory_gb, ports or ttl_hours (mirrors
            homelab-services/services/lab-runner/src/lab_runner/cards.py)
  contract  a k3d lab on lab contract v2 (k3d/cluster.yaml on network `homelab`) whose deploy.ports
            misses a published host port (the API port included), or whose Makefile never runs
            infra-local host/labs/lab.sh register and unregister
Notes: a k3d lab still on contract v1 (own network and Grafana), capture.urls grafana not pointing at
mon's Grafana on a v2 lab, no `deploy:` block (the portal can't deploy the lab), parts not written, no architecture animation, orphan screenshots, word counts, TODO callouts,
phrases that read as machine-written.

Usage (from the repo root):
  python3 check.py <slug> [--parts 1,6] [--allow-scaffold] [--allow-missing-shots]
"""
import argparse
import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path.cwd()
TARGET = re.compile(r"^[a-z0-9][a-z0-9_.-]{0,62}$")
SIGNALS = {"metrics", "logs", "traces", "profiles", "events"}
PHASES = {"before", "after", "during"}
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


def make_targets(makefile):
    targets = set()
    for line in makefile.read_text().splitlines():
        m = re.match(r"^([A-Za-z0-9_.%/-]+(?:\s+[A-Za-z0-9_.%/-]+)*)\s*:(?!=)", line)
        if m:
            targets.update(m.group(1).split())
    return targets


def check_card(card, slug, errors, notes):
    for field in ("name", "tag", "summary", "status"):
        if not card.get(field):
            errors.append(f"card: `{field}` is empty")
    lab_cat = card.get("lab_category")
    cat_ids = [c.get("id") for c in (yaml.safe_load((ROOT / "_data" / "lab_catalog.yml").read_text()) or {}).get("categories", [])] \
        if (ROOT / "_data" / "lab_catalog.yml").exists() else []
    if lab_cat not in cat_ids:
        errors.append(f"card: lab_category {lab_cat!r} is not an id in _data/lab_catalog.yml ({', '.join(cat_ids)})")
    tag = card.get("tag")
    if tag and slugify(str(tag)) != slug:
        errors.append(f"card: tag {tag!r} slugifies to {slugify(str(tag))!r}, not {slug!r}")
    todo = [k for k, v in card.items() if k != "brief" and "TODO" in yaml.safe_dump(v)]
    if todo:
        notes.append(f"card: TODO left in {', '.join(todo)}")
    cost = (card.get("platform") or {}).get("cost", "free-local")
    if cost != "free-local":
        notes.append(f"card: platform cost is {cost!r}; the index shows it as a warning")
    exps = card.get("experiments") or []
    if not exps:
        errors.append("card: no experiments (a lab needs at least one action → signal pair)")
    seen = set()
    for i, e in enumerate(exps, 1):
        eid = e.get("id")
        where = f"experiment {i} ({eid})"
        if not eid or not re.fullmatch(r"[a-z0-9-]+", str(eid)):
            errors.append(f"card: {where}: id must match [a-z0-9-]+")
        if eid in seen:
            errors.append(f"card: {where}: duplicate id")
        seen.add(eid)
        for field in ("title", "goal"):
            if not e.get(field):
                errors.append(f"card: {where}: `{field}` is empty")
        sigs = set(e.get("signals") or [])
        if not sigs:
            errors.append(f"card: {where}: list the `signals` it produces")
        elif sigs - SIGNALS:
            errors.append(f"card: {where}: unknown signals {sorted(sigs - SIGNALS)} (use {sorted(SIGNALS)})")
        action = e.get("action") or {}
        if not (action.get("say") or action.get("run") or action.get("browser")):
            errors.append(f"card: {where}: `action` needs say, run or browser")
        if not e.get("predict"):
            notes.append(f"card: {where}: no `predict` prompt")
        look = e.get("look_for") or []
        if not look:
            errors.append(f"card: {where}: `look_for` is empty")
        for l in look:
            if l.get("signal") not in SIGNALS:
                errors.append(f"card: {where}: look_for signal {l.get('signal')!r} unknown")
            if not l.get("expect"):
                errors.append(f"card: {where}: look_for entry without `expect`")
        shots = e.get("shots") or []
        if not shots:
            errors.append(f"card: {where}: no `shots` (every experiment shows a real screenshot)")
        names = set()
        for s in shots:
            n = s.get("name")
            if not n or not re.fullmatch(r"[a-z0-9-]+", str(n)):
                errors.append(f"card: {where}: shot name {n!r} must match [a-z0-9-]+")
            if n in names:
                errors.append(f"card: {where}: duplicate shot name {n!r}")
            names.add(n)
            if s.get("phase", "after") not in PHASES:
                errors.append(f"card: {where}: shot {n}: phase must be one of {sorted(PHASES)}")
            if s.get("phase") == "during" and not s.get("timelapse"):
                errors.append(f"card: {where}: shot {n}: a `during` shot needs `timelapse: {{seconds, every}}`")
            for field in ("url", "alt", "caption"):
                if not s.get(field):
                    errors.append(f"card: {where}: shot {n}: `{field}` is empty")
        if not any(s.get("phase", "after") != "before" for s in shots) and shots:
            errors.append(f"card: {where}: needs at least one after/during shot")
    return exps


def check_shots(card, slug, exps, errors, notes, allow_missing):
    img_dir = ROOT / "assets" / "img" / "labs" / slug
    manifest_path = ROOT / "_data" / "lab_shots" / f"{slug}.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    expected = set()
    missing = []
    for e in exps:
        for s in e.get("shots") or []:
            fname = f"{e.get('id')}-{s.get('name')}.webp"
            expected.add(fname)
            if not (img_dir / fname).exists() or fname not in manifest:
                missing.append(fname)
    if missing:
        msg = f"{len(missing)} screenshot(s) not captured: {', '.join(missing[:6])}{' …' if len(missing) > 6 else ''}"
        (notes if allow_missing else errors).append(msg + " (run scripts/capture.cjs)")
    orphans = sorted(set(manifest) - expected)
    if orphans:
        notes.append(f"orphan screenshots (in the manifest, not in the card): {', '.join(orphans)}; "
                     "delete the files and run capture.cjs --prune")
    failed = [k for k, v in manifest.items() if isinstance(v, dict) and v.get("verify") == "failed"]
    if failed:
        errors.append(f"screenshots captured from a run whose verify failed: {', '.join(failed)}")
    if manifest:
        dates = sorted({str(v.get("captured", ""))[:10] for v in manifest.values() if isinstance(v, dict)})
        notes.append(f"screenshots captured on: {', '.join(d for d in dates if d)}")
        revs = sorted({str(v.get("repo_rev", "unknown")) for v in manifest.values() if isinstance(v, dict)})
        if len(revs) > 1:
            notes.append(f"screenshots come from different lab revisions ({', '.join(revs)}); recapture all for one consistent run")
        if any(r.endswith("-dirty") for r in revs):
            notes.append("some screenshots were captured from uncommitted lab code; commit the lab repo and recapture")


def check_deploy(card, errors, notes):
    """The same rules the lab runner applies when it reads the card; returns the Make targets to check."""
    deploy = card.get("deploy")
    if deploy is None:
        notes.append("card: no `deploy:` block, so the portal's Labs page can't deploy this lab")
        return []
    if not isinstance(deploy, dict):
        errors.append("deploy: must be a mapping")
        return []
    repo = str((card.get("repo") or {}).get("path") or "")
    if not repo or repo.startswith("~"):
        errors.append(f"deploy: repo.path {repo!r} must be relative to ~/gitrepos (the lab runner rejects ~)")
    targets = deploy.get("targets") or {}
    if not isinstance(targets, dict):
        errors.append("deploy.targets: must be a mapping")
        targets = {}
    names = []
    for key, default in (("up", "up"), ("down", "down"), ("status", None)):
        name = targets.get(key, default)
        if name is None:
            continue
        if not isinstance(name, str) or not TARGET.match(name):
            errors.append(f"deploy.targets.{key}: {name!r} is not a plain Make target name")
        else:
            names.append((f"deploy.targets.{key}", name))
    try:
        if float(deploy.get("memory_gb") or 0) <= 0:
            notes.append("deploy.memory_gb: not set, so admission control can't reserve memory for the lab")
    except (TypeError, ValueError):
        errors.append(f"deploy.memory_gb: {deploy.get('memory_gb')!r} is not a number")
    ports = deploy.get("ports") or []
    if not isinstance(ports, list) or not all(isinstance(p, int) and 0 < p < 65536 for p in ports):
        errors.append(f"deploy.ports: {ports!r} must be a list of port numbers")
    elif not ports:
        notes.append("deploy.ports: empty, so the runner can't detect port clashes with other labs")
    ttl = deploy.get("ttl_hours")
    if ttl is not None and not (isinstance(ttl, (int, float)) and ttl > 0):
        errors.append(f"deploy.ttl_hours: {ttl!r} must be a positive number")
    return names


def repo_dir(raw):
    """A card's repo.path, relative to ~/gitrepos as the lab runner reads it (an absolute path still works)."""
    return Path.home() / "gitrepos" / Path(str(raw)).expanduser()


def check_repo(card, exps, errors, notes, deploy_targets=()):
    repo = (card.get("repo") or {}).get("path")
    if not repo or "TODO" in str(repo):
        notes.append("card: repo.path not set; skipped Makefile checks")
        return
    path = repo_dir(repo)
    if not path.exists():
        notes.append(f"lab repo {path} not found; skipped Makefile checks")
        return
    makefile = path / "Makefile"
    if not makefile.exists():
        notes.append(f"lab repo {path} has no Makefile")
        return
    targets = make_targets(makefile)
    cmds = [("capture.preflight", (card.get("capture") or {}).get("preflight"))]
    for e in exps:
        cmds += [(f"{e.get('id')}.action.run", (e.get("action") or {}).get("run")),
                 (f"{e.get('id')}.verify", e.get("verify"))]
    cmds += [(where, f"make {name}") for where, name in deploy_targets]
    for where, cmd in cmds:
        for t in re.findall(r"(?:^|[;&|]\s*)make\s+((?:[A-Za-z0-9_.-]+\s*)+)", cmd or ""):
            for name in t.split():
                if "=" in name or name.startswith("-"):
                    continue
                if name not in targets and not any("%" in x and re.fullmatch(x.replace("%", ".+"), name) for x in targets):
                    errors.append(f"{where}: `make {name}` has no target in {makefile}")
    for doc in ("README.md", "AGENTS.md"):
        if not (path / doc).exists():
            notes.append(f"lab repo has no {doc}")


MON_GRAFANA = "https://grafana.mon.home.cloudutsuk.com"


def check_contract(card, errors, notes):
    """Lab contract v2 (homelab Phase 2 step 5), judged from the lab repo's k3d/cluster.yaml."""
    repo = (card.get("repo") or {}).get("path")
    k3d = repo_dir(repo or "") / "k3d" / "cluster.yaml"
    if not repo or not k3d.exists():
        return
    try:
        cfg = yaml.safe_load(k3d.read_text()) or {}
    except yaml.YAMLError as e:
        errors.append(f"contract: {k3d} is not valid YAML ({e})")
        return
    if cfg.get("network") != "homelab":
        notes.append("contract: k3d lab on contract v1 (its own network and Grafana); v2 joins the homelab "
                      "platform (template k3d-platform, references/lab-anatomy.md)")
        return
    published = set()
    api = str((cfg.get("kubeAPI") or {}).get("hostPort") or "")
    if api.isdigit():
        published.add(int(api))
    for entry in cfg.get("ports") or []:
        parts = str(entry.get("port", "")).split(":")
        if len(parts) >= 2 and parts[-2].isdigit():
            published.add(int(parts[-2]))
    declared = set((card.get("deploy") or {}).get("ports") or [])
    missing = sorted(published - declared)
    if missing:
        errors.append(f"contract: host ports {missing} published by {k3d.name} are missing from deploy.ports "
                      "(the lab runner checks them for clashes)")
    makefile = k3d.parent.parent / "Makefile"
    text = makefile.read_text() if makefile.exists() else ""
    for action in ("register", "unregister"):
        if not re.search(rf"host/labs/lab\.sh\s+{action}\b", text):
            errors.append(f"contract: the Makefile never runs infra-local host/labs/lab.sh {action}")
    grafana = str(((card.get("capture") or {}).get("urls") or {}).get("grafana") or "")
    if grafana and not grafana.startswith(MON_GRAFANA):
        notes.append(f"contract: capture.urls.grafana is {grafana!r}; a v2 lab's dashboards are on {MON_GRAFANA}")


def check_post(path, part, slug, tag, exps, closing, errors, notes, allow_scaffold):
    rel = path.relative_to(ROOT)
    fm, body = split_front_matter(path.read_text())
    if fm is None:
        errors.append(f"{rel}: no front matter")
        return None
    if fm.get("layout") != "post":
        errors.append(f"{rel}: layout must be post")
    if fm.get("categories") != ["labs", slug]:
        errors.append(f"{rel}: categories must be [labs, {slug}]")
    if fm.get("lab") != slug:
        errors.append(f"{rel}: lab must be {slug}")
    if fm.get("lab_part") != part["id"]:
        errors.append(f"{rel}: lab_part must be {part['id']}")
    tags = fm.get("tags") or []
    if tag and tag not in tags:
        errors.append(f"{rel}: tags must include the lab tag {tag!r}")
    if "Labs" not in tags:
        errors.append(f"{rel}: tags must include Labs")
    image = fm.get("image")
    image_path = image.get("path") if isinstance(image, dict) else image
    if image_path and not (ROOT / str(image_path).lstrip("/")).exists():
        errors.append(f"{rel}: image {image_path} does not exist")
    elif not image_path:
        notes.append(f"{rel}: no hero image yet")
    if "<!-- more -->" not in body:
        errors.append(f"{rel}: no <!-- more --> excerpt separator")
    if "{% include lab-nav.html %}" not in body:
        errors.append(f"{rel}: no {{% include lab-nav.html %}}")
    for topic in part["topics"] + [closing]:
        anchor = slugify(topic)
        if not re.search(rf"^## {re.escape(topic)}\s*\n\{{: #{anchor} \}}", body, re.M):
            errors.append(f"{rel}: missing '## {topic}' followed by '{{: #{anchor} }}'")
    if part.get("experiments"):
        for n, e in enumerate(exps, 1):
            eid = e.get("id")
            if not re.search(rf"^## Experiment \d+: .+\n\{{: #exp-{re.escape(str(eid))} \}}", body, re.M):
                errors.append(f"{rel}: missing '## Experiment N: …' followed by '{{: #exp-{eid} }}' "
                              "(scaffold.py posts --add-experiments)")
            if f'{{% include lab-experiment.html id="{eid}" %}}' not in body:
                errors.append(f"{rel}: missing {{% include lab-experiment.html id=\"{eid}\" %}}")
        for eid in re.findall(r'lab-experiment\.html id="([^"]+)"', body):
            if eid not in {e.get("id") for e in exps}:
                errors.append(f"{rel}: lab-experiment include for unknown experiment {eid!r}")
    for fid in re.findall(r'flow-anim\.html id="([^"]+)"', body):
        if not (ROOT / "_data" / "flow_anims" / f"{fid}.yml").exists():
            errors.append(f"{rel}: flow-anim {fid!r} has no _data/flow_anims/{fid}.yml")
    if part["id"] == 1 and "flow-anim.html" not in body:
        notes.append(f"{rel}: no animated architecture diagram (cloudutsuk-flow-anim)")
    scaffold = body.count("<!-- SCAFFOLD")
    if scaffold and not allow_scaffold:
        errors.append(f"{rel}: {scaffold} SCAFFOLD marker(s) left")
    prose = re.sub(r"```.*?```|<!--.*?-->|\{%.*?%\}|\{:.*?\}|<[^>]+>", " ", body, flags=re.S)
    banned = sorted({b for b in BANNED if b in prose.lower()})
    if banned:
        notes.append(f"{rel}: reads as generated: {', '.join(banned)}")
    return (part["id"], part["title"], len(re.findall(r"[A-Za-z0-9']+", prose)),
            len(re.findall(r"\*\*TODO", body)), scaffold)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("slug")
    ap.add_argument("--parts", help="Only check these part ids")
    ap.add_argument("--allow-scaffold", action="store_true", help="Don't fail on SCAFFOLD markers")
    ap.add_argument("--allow-missing-shots", action="store_true", help="Don't fail on uncaptured screenshots")
    args = ap.parse_args()

    framework = yaml.safe_load((ROOT / "_data" / "lab_framework.yml").read_text())
    closing = framework["closing"]["title"]
    errors, notes = [], []

    card_path = ROOT / "_data" / "labs" / f"{args.slug}.yml"
    if not card_path.exists():
        print(f"ERROR  {card_path.relative_to(ROOT)} is missing")
        sys.exit(1)
    card = yaml.safe_load(card_path.read_text()) or {}
    if (ROOT / "_data" / "projects" / f"{args.slug}.yml").exists():
        errors.append(f"_data/projects/{args.slug}.yml also exists; the project index wins on /tags/{args.slug}/")
    exps = check_card(card, args.slug, errors, notes)
    check_shots(card, args.slug, exps, errors, notes, args.allow_missing_shots)
    check_repo(card, exps, errors, notes, check_deploy(card, errors, notes))
    check_contract(card, errors, notes)

    parts = framework["parts"]
    if args.parts:
        wanted = {int(p) for p in args.parts.split(",") if p.strip()}
        parts = [p for p in parts if p["id"] in wanted]
    post_dir = ROOT / "_posts" / "labs" / args.slug
    rows = []
    for part in parts:
        matches = sorted(post_dir.glob(f"*-{part['id']:02d}-{part['slug']}.md"))
        if not matches:
            notes.append(f"part {part['id']} {part['title']}: not written")
            continue
        row = check_post(matches[0], part, args.slug, card.get("tag"), exps, closing, errors, notes,
                         args.allow_scaffold)
        if row:
            rows.append(row)

    if rows:
        print(f"{'#':>2}  {'part':<32} {'words':>6} {'TODOs':>6} {'scaffold':>8}")
        for r in rows:
            print(f"{r[0]:>2}  {r[1]:<32} {r[2]:>6} {r[3]:>6} {r[4]:>8}")
        print(f"    {'total':<32} {sum(r[2] for r in rows):>6} {sum(r[3] for r in rows):>6}\n")
    for n in notes:
        print(f"note   {n}")
    for e in errors:
        print(f"ERROR  {e}")
    print(f"\n{len(errors)} error(s), {len(notes)} note(s); index: /tags/{args.slug}/")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
