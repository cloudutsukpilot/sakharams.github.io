#!/usr/bin/env python3
"""Validate an explorable diagram (_data/diagrams/<post folders>/<name>.yml) before building the site.

Structural checks only: layout is computed in the browser by ELK, so overlaps and readability are
checked by scripts/preview.cjs. Icons, colours, kinds, protocols and card names are read from
assets/js/diagram.js, so this file cannot drift from the engine.

  python3 validate.py _data/diagrams/<post folders>/<name>.yml

Exit code 1 if there are errors.
"""
import re
import shutil
import subprocess
import sys
from pathlib import Path

import yaml

HERE = Path(__file__).resolve()
ROOT = next((d for d in HERE.parents if (d / "assets/js/diagram.js").exists()), None)
SRC = (ROOT / "assets/js/diagram.js").read_text() if ROOT else ""


def block(name):
    m = re.search(r"const " + name + r" = (\{.*?\n  \});", SRC, re.S)
    return m.group(1) if m else ""


ICONS = set(re.findall(r"^\s+(\w+): '<", block("ICONS"), re.M))
PALETTE = set(re.findall(r"(\w+): '#", block("PALETTE")))
KINDS = set(re.findall(r"(\w+): \['#", block("KINDS")))
PROTO_KIND = dict(re.findall(r"(\w+): '(\w+)'", block("PROTO_KIND")))
CARDS = set(re.findall(r"^    (\w+): \{ title:", block("CARDS"), re.M))
TONES = {"fail", "ok", "warn"}
DIRECTIONS = {"right", "down", "left", "up"}
ID_RE = re.compile(r"^[a-z0-9][a-z0-9_-]*$")
# A component's panel (const FACTS and STATUS in diagram.js): `summary` and `how` are required, plus a `url` or an
# `api`; `where` and `when` are optional short chips. `status` (and `phase`) sit on the component itself.
FACT_KEYS = re.findall(r"'(\w+)'", (re.search(r"const FACTS = (\[.*?\]);", SRC) or [None, ""])[1]) or [
    "summary", "how", "where", "when", "url", "api"]
STATUSES = set(re.findall(r"(\w+): '", (re.search(r"const STATUS = (\{.*?\});", SRC) or [None, ""])[1])) or {
    "built", "planned", "deferred", "external"}
FACT_REQUIRED = ["summary", "how"]
FACT_LIMITS = {"summary": 200, "how": 280, "where": 60, "when": 60}
OLD_FACTS = {"what": "summary", "why": "summary"}


def proto_kind(e):
    return e.get("kind") or PROTO_KIND.get(re.split(r"[\s/+.-]", str(e.get("proto") or "").upper())[0])


def validate(data, path):
    errors, warns = [], []
    E, W = errors.append, warns.append
    if not data.get("title"):
        E("missing `title`")
    if not data.get("nodes"):
        E("missing `nodes`")
        return errors, warns
    for key in ("accent", "accent2"):
        if key in data and not re.fullmatch(r"#[0-9A-Fa-f]{6}", str(data[key])):
            E(f"`{key}` must be #RRGGBB")

    nodes, parent, depth = {}, {}, {}

    def walk(n, par, d):
        nid = n.get("id")
        if not nid:
            E(f"component without id: {str(n)[:80]}")
            return
        if nid in nodes:
            E(f"duplicate id `{nid}`")
        if not ID_RE.match(str(nid)):
            E(f"id `{nid}`: use lowercase letters, digits, - and _ (it appears in URLs)")
        if not n.get("label"):
            E(f"`{nid}` needs a label")
        nodes[nid], parent[nid], depth[nid] = n, par, d
        icon = n.get("icon")
        if icon and re.search(r"[/.]", str(icon)):
            if ROOT and not (ROOT / "assets/img/icons" / str(icon).lstrip("/")).is_file():
                E(f"`{nid}`: logo {icon!r} not found under assets/img/icons/")
        elif icon and icon not in ICONS:
            E(f"`{nid}`: unknown icon {icon!r} (built-in: {', '.join(sorted(ICONS))})")
        if n.get("color") and n["color"] not in PALETTE and not re.fullmatch(r"#[0-9A-Fa-f]{6}", str(n["color"])):
            E(f"`{nid}`: color must be one of {sorted(PALETTE)} or #RRGGBB")
        if n.get("tone") and n["tone"] not in TONES:
            E(f"`{nid}`: tone must be one of {sorted(TONES)}")
        if n.get("direction") and n["direction"] not in DIRECTIONS:
            E(f"`{nid}`: direction must be one of {sorted(DIRECTIONS)}")
        if n.get("direction") and not n.get("children"):
            W(f"`{nid}`: direction only affects groups (components with children)")
        if len(str(n.get("label", ""))) > 28:
            W(f"`{nid}`: label is long ({len(n['label'])} chars); keep it short and put the rest in `sub` or `detail`")
        if len(str(n.get("detail", ""))) > 900:
            W(f"`{nid}`: detail is {len(n['detail'])} chars; the panel reads best under ~600")
        cfg = n.get("config")
        if cfg is not None:
            code = cfg if isinstance(cfg, str) else cfg.get("code", "")
            if not code:
                E(f"`{nid}`: config needs `code`")
            elif len(str(code).splitlines()) > 80:
                W(f"`{nid}`: config is {len(str(code).splitlines())} lines; show the relevant part")
        facts = n.get("facts")
        status = n.get("status")
        if status is not None and status not in STATUSES:
            E(f"`{nid}`: status must be one of {sorted(STATUSES)}")
        if n.get("phase") is not None and status not in ("planned", "deferred"):
            W(f"`{nid}`: `phase` only shows with status planned or deferred")
        if status is None and not n.get("children"):
            no_status.append(nid)
        if facts is None:
            no_facts.append(nid)
        elif not isinstance(facts, dict):
            E(f"`{nid}`: facts must be a mapping of {', '.join(FACT_KEYS)}")
        else:
            for k in facts:
                if k in OLD_FACTS:
                    E(f"`{nid}`: fact `{k}` was merged into `{OLD_FACTS[k]}` (one lead sentence: what it is and why it's here)")
                elif k not in FACT_KEYS:
                    E(f"`{nid}`: unknown fact `{k}` (use {', '.join(FACT_KEYS)})")
            missing = [k for k in FACT_REQUIRED if not str(facts.get(k) or "").strip()]
            if missing:
                W(f"`{nid}`: facts lack {', '.join(missing)}")
            if not (facts.get("url") or facts.get("api")):
                W(f"`{nid}`: facts need a `url` or an `api` (say what reaches it when it has no address of its own)")
            for k, lim in FACT_LIMITS.items():
                v = facts.get(k)
                text = " ".join(map(str, v)) if isinstance(v, list) else str(v or "")
                if len(text) > lim:
                    W(f"`{nid}`: `{k}` is {len(text)} chars; keep it under ~{lim}" + (" (it shows as a chip)" if k in ("where", "when") else ""))
            url = facts.get("url")
            if isinstance(url, dict):
                for label, u in url.items():
                    if not re.match(r"https?://", str(u)):
                        E(f"`{nid}`: url `{label}` must be an http(s) address (use a list item for a note)")
                    if len(str(label)) > 24:
                        W(f"`{nid}`: url label `{label}` is long; it is a button")
        if not n.get("children") and not n.get("detail") and not n.get("config") and not facts:
            W(f"`{nid}`: a leaf without `facts` or `detail` gives readers nothing when clicked")
        for c in n.get("children") or []:
            walk(c, nid, d + 1)

    no_facts, no_status = [], []
    for n in data["nodes"]:
        walk(n, None, 0)
    if no_facts:
        shown = ", ".join(f"`{x}`" for x in no_facts[:8]) + (f" and {len(no_facts) - 8} more" if len(no_facts) > 8 else "")
        W(f"{len(no_facts)} component(s) without `facts` (summary, how, url/api; where, when): {shown}")
    if no_status:
        shown = ", ".join(f"`{x}`" for x in no_status[:8]) + (f" and {len(no_status) - 8} more" if len(no_status) > 8 else "")
        W(f"{len(no_status)} leaf component(s) without `status` (built, planned, deferred, external): {shown}")

    def ancestors(i):
        out = []
        while parent.get(i):
            i = parent[i]
            out.append(i)
        return out

    groups = [i for i, n in nodes.items() if n.get("children")]
    max_level = max([depth[g] + 1 for g in groups], default=0)
    if data.get("level", 1) > max_level:
        E(f"`level: {data.get('level')}` is deeper than the diagram ({max_level})")
    names = data.get("levels")
    if names and len(names) != max_level + 1:
        W(f"`levels` has {len(names)} names but the slider has {max_level + 1} positions (0..{max_level})")

    # How many components each level shows (level 0 should be a handful: about 3 to 9).
    for lvl in range(max_level + 1):
        # View-only components are not in the main view, so they don't count here.
        shown = [i for i in nodes if depth[i] <= lvl and all(depth[a] < lvl for a in ancestors(i))
                 and not any(nodes[x].get("views") for x in [i] + ancestors(i))]
        leaves = [i for i in shown if not (nodes[i].get("children") and depth[i] < lvl)]
        # The deepest level shows everything by design (explored by zooming); earlier levels should
        # stay readable at a glance.
        if lvl < max_level and len(leaves) > 45:
            W(f"level {lvl} shows {len(leaves)} components; nest more so each level stays readable")

    top = len(data["nodes"])
    if top > 10:
        W(f"level 0 shows {top} components; group them so the overview has about 3 to 9")

    edge_ids = set()
    modes = [m["id"] for m in (data.get("tour") or {}).get("modes", [])] or ["default"]
    for i, e in enumerate(data.get("edges") or []):
        eid = e.get("id", f"e{i}")
        if eid in edge_ids:
            E(f"duplicate edge id `{eid}`")
        edge_ids.add(eid)
        a, b = e.get("from"), e.get("to")
        if a not in nodes or b not in nodes:
            E(f"edge `{eid}`: unknown end {a!r} -> {b!r}")
            continue
        if a == b or a in ancestors(b) or b in ancestors(a):
            E(f"edge `{eid}`: {a} -> {b} joins a component to its own group, so it is never drawn")
        if e.get("kind") and e["kind"] not in KINDS:
            E(f"edge `{eid}`: kind must be one of {sorted(KINDS)}")
        if e.get("proto") and not proto_kind(e):
            W(f"edge `{eid}`: no kind known for proto {e['proto']!r}; set kind:")
        if not e.get("proto") and not e.get("kind") and not e.get("label"):
            W(f"edge `{eid}`: no proto, kind or label, so the arrow explains nothing")
        why = str(e.get("why") or "").strip()
        if not why:
            E(f"edge `{eid}` ({a} -> {b}): needs `why`: 1-2 short sentences on when this path is used or why it exists")
        elif len(why) > 220:
            W(f"edge `{eid}`: `why` is {len(why)} chars; keep it to 1-2 short sentences (under ~220)")
        if e.get("port") is not None and not (isinstance(e["port"], int) and 0 < e["port"] < 65536):
            E(f"edge `{eid}`: port must be 1..65535")
        for c in e.get("cards") or []:
            if c not in CARDS:
                E(f"edge `{eid}`: unknown card {c!r} (cards: {sorted(CARDS)})")
        if e.get("tone") and e["tone"] not in TONES:
            E(f"edge `{eid}`: tone must be one of {sorted(TONES)}")

    # Views (tabs) for cross-cutting connections.
    views = {v.get("id") for v in data.get("views") or []}
    for v in data.get("views") or []:
        if not v.get("id") or not ID_RE.match(str(v["id"])):
            E(f"view {v!r}: needs an id (lowercase, digits, - and _)")
        if not v.get("label"):
            E(f"view `{v.get('id')}`: needs a label (the tab text)")
        if v.get("icon") and v["icon"] not in ICONS:
            E(f"view `{v.get('id')}`: icon must be a built-in icon")
    only_in = {}  # component -> the views it is limited to (its own or an ancestor's)
    for nid, n in nodes.items():
        for x in [nid] + ancestors(nid):
            if nodes[x].get("views"):
                only_in[nid] = set(nodes[x]["views"])
                break
        for v in nodes[nid].get("views") or []:
            if v not in views:
                E(f"`{nid}`: views lists unknown view {v!r} (views: {sorted(views)})")
    main_count = 0
    per_view = {v: 0 for v in views}
    for i, e in enumerate(data.get("edges") or []):
        eid = e.get("id", f"e{i}")
        vl = [e["view"]] if isinstance(e.get("view"), str) else list(e.get("view") or [])
        for v in vl:
            if v not in views:
                E(f"edge `{eid}`: view {v!r} is not defined in `views`")
            else:
                per_view[v] += 1
        if e.get("main") and not vl:
            W(f"edge `{eid}`: `main: true` only matters together with `view:`")
        if not vl or e.get("main"):
            main_count += 1
        for end in (e.get("from"), e.get("to")):
            lim = only_in.get(end)
            if lim and not (set(vl) & lim):
                E(f"edge `{eid}`: `{end}` only exists in views {sorted(lim)}, so the edge must be in one of them (view: …)")
            if lim and e.get("main"):
                E(f"edge `{eid}`: `{end}` only exists in views {sorted(lim)}, so the edge cannot be `main: true`")
        streaming = e.get("stream") if e.get("stream") is not None else proto_kind(e) in ("stream", "telemetry")
        if vl and not e.get("main") and streaming and not any(only_in.get(x) for x in (e.get("from"), e.get("to"))):
            W(f"edge `{eid}`: an always-on stream between main-view components is hidden from the main view; add `main: true` so its moving dots show")
    if main_count > 45:
        W(f"the main view has {main_count} arrows; move cross-cutting ones (logs, secrets, DNS, image pulls) into `views`")
    for v, c in per_view.items():
        if c < 2:
            W(f"view `{v}` has {c} arrow(s); a tab should reveal at least 2 to 3, or drop it")

    # Scenarios (use cases). A legacy single `tour:` counts as one scenario.
    scenarios = list(data.get("scenarios") or [])
    if data.get("tour"):
        scenarios.append({"id": "tour", "title": data["tour"].get("title", "tour"), **data["tour"]})
    seen = set()
    edge_by = {e.get("id", f"e{i}"): e for i, e in enumerate(data.get("edges") or [])}
    for sc in scenarios:
        sid = sc.get("id")
        name = f"scenario {sid!r}"
        if not sid or not ID_RE.match(str(sid)):
            E(f"{name}: needs an id (lowercase, digits, - and _)")
        if sid in seen:
            E(f"{name}: duplicate scenario id")
        seen.add(sid)
        if not sc.get("title"):
            E(f"{name}: needs a title (it is the picker button)")
        tm = sc.get("modes") or [{"id": "default"}]
        mode_ids = [m["id"] for m in tm]
        if len(tm) > 2:
            E(f"{name}: at most two modes")
        if len(tm) == 2 and not tm[1].get("label"):
            E(f"{name}: the second mode needs a label (the checkbox text)")
        steps = sc.get("steps") or []
        if not steps:
            E(f"{name}: has no steps")
        if len(steps) > 12:
            W(f"{name}: {len(steps)} steps; a use case reads best in 3 to 10 (split it into two use cases)")
        for k, st in enumerate(steps):
            tag = f"{name} step {k + 1} ({st.get('title', '?')!r})"
            if not st.get("title") or not st.get("text"):
                E(f"{tag} needs a title and text")
            if st.get("when") and st["when"] not in mode_ids:
                E(f"{tag}: when {st['when']!r} is not one of this scenario's modes {mode_ids}")
            eids = st.get("edges") or []
            for eid in eids:
                if eid not in edge_ids:
                    E(f"{tag}: unknown edge `{eid}`")
            for nid in st.get("lights") or []:
                if nid not in nodes:
                    E(f"{tag}: unknown component `{nid}`")
            # One action per step: several arrows are fine only when they happen together, i.e. they
            # share a component (fan-out from one sender or fan-in to one receiver).
            known = [edge_by[x] for x in eids if x in edge_by]
            if len(known) > 1 and not set.intersection(*[{e["from"]} for e in known]) and not set.intersection(*[{e["to"]} for e in known]):
                E(f"{tag}: its arrows ({', '.join(eids)}) neither start nor end at the same component, so it combines separate actions; split it into one step per action")
            if len(str(st.get("text", ""))) > 230:
                W(f"{tag}: caption over ~230 chars")
            # The banner line: what this step does, short.
            if not st.get("action"):
                E(f"{tag}: needs `action`, the short banner line saying what the step does (\"Keycloak ↔ core-db: read your account\")")
            elif len(str(st["action"])) > 90:
                W(f"{tag}: action is {len(st['action'])} chars; keep the banner line under ~90")
            if st.get("result") and st["result"] not in ("success", "done", "fail"):
                E(f"{tag}: result must be success, done or fail")
            # A path is a chain of hops: each must start where the previous one ended.
            prev = None
            for ref in st.get("path") or []:
                rev = str(ref).startswith("~")
                pid = str(ref)[1:] if rev else str(ref)
                if pid not in edge_by:
                    E(f"{tag}: path has unknown edge `{pid}`")
                    prev = None
                    continue
                e = edge_by[pid]
                start, end = (e["to"], e["from"]) if rev else (e["from"], e["to"])
                if prev and start != prev:
                    E(f"{tag}: path hop `{ref}` starts at `{start}` but the previous hop ended at `{prev}`; a path must be one continuous route")
                prev = end
        # Every request that gets a reply should show the reply travelling back (~id), and a use case
        # should end with its outcome (`result`).
        for mode in mode_ids:
            mine = [st for st in steps if not st.get("when") or st["when"] == mode]
            if mine and not mine[-1].get("result"):
                W(f"{name} ({mode}): the last step has no `result` (success / done / fail), so the outcome is not shown")
            fwd, back = [], set()
            for st in mine:
                for ref in list(st.get("edges") or []) + list(st.get("path") or []):
                    r = str(ref)
                    (back.add(r[1:]) if r.startswith("~") else fwd.append(r))
            for r in dict.fromkeys(fwd):
                e = edge_by.get(r)
                if not e or e.get("oneway"):
                    continue
                if proto_kind(e) in (None, "request", "data", "control") and r not in back:
                    W(f"{name} ({mode}): `{r}` ({e['from']} -> {e['to']}) never shows its response; add `~{r}` to a later path, or mark the edge `oneway: true` if nothing comes back")
    return errors, warns


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    path = sys.argv[1]
    if shutil.which("ruby"):
        r = subprocess.run(["ruby", "-ryaml", "-e", "YAML.load_file(ARGV[0])", path], capture_output=True, text=True)
        if r.returncode:
            print(f"ERROR Ruby/Jekyll cannot parse this YAML: {r.stderr.strip().splitlines()[0][:300]}")
            sys.exit(1)
    data = yaml.safe_load(Path(path).read_text())
    if not SRC:
        print("ERROR assets/js/diagram.js not found (run from the repo)")
        sys.exit(1)
    errors, warns = validate(data, path)
    for w in warns:
        print(f"WARN  {w}")
    for e in errors:
        print(f"ERROR {e}")
    print(f"{'FAILED' if errors else 'OK'}: {len(errors)} error(s), {len(warns)} warning(s) in {path}")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
