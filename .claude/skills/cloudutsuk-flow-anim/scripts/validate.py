#!/usr/bin/env python3
"""Validate a flow-animation data file (_data/flow_anims/<post folders>/<name>.yml) before building the site.

Mirrors projector(), place(), route() and arc() in assets/js/flow-anim.js, then checks references, geometry
(nodes inside the viewBox, no overlaps, labels that fit, edges that do not cut through other
nodes) and the step story (every node and edge used, pointers leave lit nodes).

  python3 validate.py _data/flow_anims/<post folders>/<name>.yml [--png out.png]

--png renders the final state (everything lit, pass mode) as a static PNG via cairosvg so the
layout can be eyeballed without a Jekyll build. Exit code 1 if there are errors.
"""
import argparse
import json
import math
import re
import sys
from pathlib import Path

import yaml

TONES = {"fail", "ok", "warn"}
SHAPES = {None, "box", "terminal", "diamond", "cylinder", "circle", "site"}
def _engine_tables():
    """Read ICONS, PALETTE, ROLE, LOGO_ROLE, CYCLE, KINDS and PROTO_KIND straight from
    assets/js/flow-anim.js, so the validator can never drift from the engine."""
    here = Path(__file__).resolve()
    js = next((d / "assets/js/flow-anim.js" for d in here.parents if (d / "assets/js/flow-anim.js").exists()), None)
    src = js.read_text() if js else ""

    def block(name):
        m = re.search(r"const " + name + r" = (\{.*?\n  \}|\[.*?\]);", src, re.S)
        return m.group(1) if m else ""

    icons = dict(re.findall(r"^\s+(\w+): '(<.*?)',?$", block("ICONS"), re.M))
    pairs = lambda name: dict(re.findall(r"(\w+): '([^']*)'", block(name)))
    kinds = {k: c for k, c, _ in re.findall(r"(\w+): \['(#[0-9A-Fa-f]{6})', '([^']*)'\]", block("KINDS"))}
    cycle = re.findall(r"'(\w+)'", block("CYCLE"))
    return icons, pairs("PALETTE"), pairs("ROLE"), pairs("LOGO_ROLE"), cycle, kinds, pairs("PROTO_KIND")


ICONS, PALETTE, ROLE, LOGO_ROLE, CYCLE, KINDS, PROTO_KIND = _engine_tables()
TONE_C = {"fail": "#EF4444", "ok": "#22C55E", "warn": "#F59E0B"}
ICON_STRIP = 30  # an icon on a box takes this strip on the left (mirrors ICON_STRIP in the engine)
ICON_SHAPES = {None, "box", "terminal", "cylinder", "site"}


def is_logo(icon):
    return bool(re.search(r"[/.]", str(icon or "")))


def corner_at(n):
    """Centre of a corner icon chip (mirror of cornerAt in the engine)."""
    return (n["x"] - n["w"] / 2 + (n["h"] / 2 if n.get("shape") == "terminal" else 12),
            n["y"] - n["h"] / 2 + (2 if n.get("shape") == "cylinder" else 0))


def kind_of(e):
    return e.get("kind") or PROTO_KIND.get(re.split(r"[\s/+.-]", str(e.get("proto") or "").upper())[0])


def pill_text(e):
    return " ".join(x for x in [e.get("proto"), f":{e['port']}" if e.get("port") is not None else None] if x)


CHAR_W = 8.0  # average glyph width of the 14px semi-bold node label, in viewBox units
SUB_W = 7.3  # glyph width of the 12px monospace `sub` line
LINE_H = 17
SUB_H = 16


def projector(data):
    m = data.get("map")
    if not m:
        return None
    lon0, lon1 = m.get("lon", [-180, 180])
    lat0, lat1 = m.get("lat", [80, -58])
    VW, VH = data["viewbox"]
    pad = m.get("pad", 20)
    k = min((VW - 2 * pad) / (lon1 - lon0), (VH - 2 * pad) / (lat0 - lat1))
    ox = (VW - k * (lon1 - lon0)) / 2 - k * lon0
    oy = (VH - k * (lat0 - lat1)) / 2 + k * lat0
    return {"k": k, "ox": ox, "oy": oy, "lon0": lon0, "lon1": lon1, "lat0": lat0, "lat1": lat1}


def place(n, grid, proj=None):
    g = grid or {}
    geo = proj and n.get("lat") is not None and n.get("lon") is not None
    size = 52 if n.get("shape") == "site" else None
    if "x" in n:
        x = n["x"]
    elif geo:
        x = proj["ox"] + proj["k"] * n["lon"]
    else:
        x = g.get("x0", 0) + n.get("col", 0) * g.get("dx", 0)
    if "y" in n:
        y = n["y"]
    elif geo:
        y = proj["oy"] - proj["k"] * n["lat"]
    else:
        y = g.get("y0", 0) + n.get("row", 0) * g.get("dy", 0)
    return {**n, "x": x, "y": y, "w": n.get("w", size or g.get("w", 150)), "h": n.get("h", size or g.get("h", 56))}


def inside(n, p):
    if n.get("shape") in ("site", "circle"):
        return ((p[0] - n["x"]) / (n["w"] / 2 + 2)) ** 2 + ((p[1] - n["y"]) / (n["h"] / 2 + 2)) ** 2 <= 1
    return abs(p[0] - n["x"]) <= n["w"] / 2 + 2 and abs(p[1] - n["y"]) <= n["h"] / 2 + 2


def arc(a, b, curve):
    mx, my = (a["x"] + b["x"]) / 2, (a["y"] + b["y"]) / 2
    cx, cy = mx - curve * (b["y"] - a["y"]), my + curve * (b["x"] - a["x"])

    def at(t):
        return ((1 - t) ** 2 * a["x"] + 2 * (1 - t) * t * cx + t * t * b["x"],
                (1 - t) ** 2 * a["y"] + 2 * (1 - t) * t * cy + t * t * b["y"])

    def border(n, lo, hi):
        for _ in range(24):
            mid = (lo + hi) / 2
            if inside(n, at(mid)):
                lo = mid
            else:
                hi = mid
        return (lo + hi) / 2

    t0, t1 = border(a, 0, 0.5), border(b, 1, 0.5)
    return [tuple(round(v, 1) for v in at(t0 + (t1 - t0) * i / 32)) for i in range(33)]


def curve_of(e, a, b):
    if e.get("points") or e.get("exit") or e.get("enter"):
        return None
    if "curve" in e:
        return e["curve"]
    geo = all(n.get(k) is not None for n in (a, b) for k in ("lat", "lon"))
    return 0.15 if geo else None


def point_at(pts, frac):
    total = sum(math.dist(p, q) for p, q in zip(pts, pts[1:]))
    d = total * frac
    for p, q in zip(pts, pts[1:]):
        seg = math.dist(p, q)
        if d <= seg and seg:
            t = d / seg
            return (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)
        d -= seg
    return pts[-1]


def site_label_box(n):
    """Text block under a `site` disc: label lines (17 apart) then sub lines (16 apart)."""
    lines = str(n.get("label", "")).split("\n")
    subs = str(n["sub"]).split("\n") if n.get("sub") else []
    w = max([len(l) * CHAR_W for l in lines] + [len(l) * SUB_W for l in subs])
    top = n["y"] + n["h"] / 2 + 15 - 9
    bottom = top + 18 + (len(lines) - 1) * LINE_H + len(subs) * SUB_H
    return (n["x"] - w / 2, top, n["x"] + w / 2, bottom)


def find_map(name, start):
    for d in [Path(start).resolve(), *Path(start).resolve().parents]:
        f = d / "_data" / "flow_maps" / f"{name}.json"
        if f.exists():
            return f
    return None


def anchor(n, side):
    return {
        "right": (n["x"] + n["w"] / 2, n["y"]),
        "left": (n["x"] - n["w"] / 2, n["y"]),
        "top": (n["x"], n["y"] - n["h"] / 2),
        "bottom": (n["x"], n["y"] + n["h"] / 2),
    }[side]


def default_sides(a, b):
    if abs(a["y"] - b["y"]) < 1:
        return ("right", "left") if b["x"] > a["x"] else ("bottom", "bottom")
    if abs(a["x"] - b["x"]) < 1:
        return ("bottom", "top") if b["y"] > a["y"] else ("top", "bottom")
    return ("right", "left") if b["x"] > a["x"] else ("left", "right")


def route(a, b, e):
    dx, dn = default_sides(a, b)
    ex, en = e.get("exit", dx), e.get("enter", dn)
    off = e.get("offset", 40)
    s, t = anchor(a, ex), anchor(b, en)
    horiz = lambda side: side in ("left", "right")
    if ex == en:
        if ex in ("bottom", "top"):
            y = max(s[1], t[1]) + off if ex == "bottom" else min(s[1], t[1]) - off
            return [s, (s[0], y), (t[0], y), t]
        x = max(s[0], t[0]) + off if ex == "right" else min(s[0], t[0]) - off
        return [s, (x, s[1]), (x, t[1]), t]
    if horiz(ex) and horiz(en):
        if abs(s[1] - t[1]) < 1:
            return [s, t]
        mx = (s[0] + t[0]) / 2
        return [s, (mx, s[1]), (mx, t[1]), t]
    if not horiz(ex) and not horiz(en):
        if abs(s[0] - t[0]) < 1:
            return [s, t]
        my = (s[1] + t[1]) / 2
        return [s, (s[0], my), (t[0], my), t]
    return [s, (t[0], s[1]), t] if horiz(ex) else [s, (s[0], t[1]), t]


def box(n, pad=0):
    return (n["x"] - n["w"] / 2 - pad, n["y"] - n["h"] / 2 - pad, n["x"] + n["w"] / 2 + pad, n["y"] + n["h"] / 2 + pad)


def seg_hits_box(p, q, b):
    """Axis-aligned segment p-q crosses the interior of box b (shrunk 3 units)."""
    x0, y0, x1, y1 = b[0] + 3, b[1] + 3, b[2] - 3, b[3] - 3
    if abs(p[1] - q[1]) < 0.5:  # horizontal
        lo, hi = sorted((p[0], q[0]))
        return y0 < p[1] < y1 and lo < x1 and hi > x0
    if abs(p[0] - q[0]) < 0.5:  # vertical
        lo, hi = sorted((p[1], q[1]))
        return x0 < p[0] < x1 and lo < y1 and hi > y0
    # diagonal: sample it
    return any(x0 < p[0] + (q[0] - p[0]) * t / 20 < x1 and y0 < p[1] + (q[1] - p[1]) * t / 20 < y1 for t in range(1, 20))


def on_boundary(pt, n, tol=3):
    x0, y0, x1, y1 = box(n)
    inside = x0 - tol <= pt[0] <= x1 + tol and y0 - tol <= pt[1] <= y1 + tol
    near = min(abs(pt[0] - x0), abs(pt[0] - x1), abs(pt[1] - y0), abs(pt[1] - y1)) <= tol
    return inside and near


def validate(data, path="."):
    errors, warns = [], []
    E, W = errors.append, warns.append

    for key in ("title", "viewbox", "nodes", "edges", "steps"):
        if key not in data:
            E(f"missing top-level key `{key}`")
    if errors:
        return errors, warns, {}, {}
    for key in ("accent", "accent2"):
        if key in data and not re.fullmatch(r"#[0-9A-Fa-f]{6}", str(data[key])):
            E(f"`{key}` must be a #RRGGBB colour, got {data[key]!r}")
    VW, VH = data["viewbox"]
    proj = projector(data)
    if data.get("map"):
        m = data["map"]
        if not isinstance(m, dict):
            E("`map` must be a mapping such as {name: world, lon: [-130, 150], lat: [65, -45]}")
            return errors, warns, {}, {}
        if not find_map(m.get("name", "world"), path):
            E(f"map {m.get('name', 'world')!r}: no _data/flow_maps/{m.get('name', 'world')}.json (run scripts/build_map.py)")
        lon, lat = m.get("lon", [-180, 180]), m.get("lat", [80, -58])
        if not (-180 <= lon[0] < lon[1] <= 180) or not (90 >= lat[0] > lat[1] >= -90):
            E(f"map crop lon {lon} / lat {lat}: use lon [west, east] in -180..180 and lat [north, south]")
        k = proj["k"]
        used_w, used_h = k * (lon[1] - lon[0]), k * (lat[0] - lat[1])
        if VW - used_w > 80 or VH - used_h > 80:
            W(f"map crop fills {used_w:.0f}x{used_h:.0f} of the {VW}x{VH} viewBox; set viewbox height to about {round(40 + 960 * (lat[0] - lat[1]) / (lon[1] - lon[0]))} for this crop")

    nodes = {}
    for raw in data["nodes"]:
        nid = raw.get("id")
        if not nid:
            E(f"node without id: {raw}")
            continue
        if nid in nodes:
            E(f"duplicate node id `{nid}`")
        if "x" not in raw and "col" not in raw and "lon" not in raw:
            E(f"node `{nid}` needs x/y, col/row or lat/lon")
        if ("lat" in raw or "lon" in raw) and not data.get("map"):
            E(f"node `{nid}` uses lat/lon but there is no `map`")
        icon = raw.get("icon")
        if icon and is_logo(icon):
            root = next((d for d in [*Path(path).resolve().parents, *Path(__file__).resolve().parents]
                         if (d / "assets/img/icons").is_dir()), None)
            if root and not (root / "assets/img/icons" / str(icon).lstrip("/")).is_file():
                E(f"node `{nid}`: logo {icon!r} not found under assets/img/icons/ (run scripts/enrich.py --find <name>)")
        elif icon and icon not in ICONS:
            E(f"node `{nid}`: unknown icon {icon!r} (built-in: {sorted(ICONS)}, or a path under assets/img/icons/)")
        if icon and raw.get("shape") not in ICON_SHAPES:
            E(f"node `{nid}`: icons are not drawn on shape {raw.get('shape')!r} (no room); drop `icon` or use a box")
        if raw.get("color") and raw["color"] not in PALETTE and not re.fullmatch(r"#[0-9A-Fa-f]{6}", str(raw["color"])):
            E(f"node `{nid}`: color {raw['color']!r} must be one of {sorted(PALETTE)} or #RRGGBB")
        if ("col" in raw or "row" in raw) and not data.get("grid"):
            E(f"node `{nid}` uses col/row but there is no `grid`")
        if raw.get("shape") not in SHAPES:
            E(f"node `{nid}`: unknown shape {raw.get('shape')!r} (use {sorted(s for s in SHAPES if s)})")
        if raw.get("tone") and raw["tone"] not in TONES:
            E(f"node `{nid}`: unknown tone {raw['tone']!r} (use {sorted(TONES)})")
        nodes[nid] = place(raw, data.get("grid"), proj)

    for nid, n in nodes.items():
        x0, y0, x1, y1 = box(n)
        if x0 < 4 or y0 < 4 or x1 > VW - 4 or y1 > VH - 4:
            E(f"node `{nid}` ({x0:.0f},{y0:.0f})-({x1:.0f},{y1:.0f}) is outside the {VW}x{VH} viewBox")
        if n.get("shape") == "site":
            # The label sits under the disc, so its own checks replace the in-shape ones below.
            lb = site_label_box(n)
            if lb[0] < 2 or lb[2] > VW - 2 or lb[3] > VH - 2:
                E(f"node `{nid}`: label under the site leaves the viewBox ({lb[0]:.0f},{lb[1]:.0f})-({lb[2]:.0f},{lb[3]:.0f})")
            if lb[2] - lb[0] > 170:
                W(f"node `{nid}`: label is ~{lb[2] - lb[0]:.0f} wide; keep site labels short (a city or region code)")
            for oid, o in nodes.items():
                if oid == nid:
                    continue
                ob = site_label_box(o) if o.get("shape") == "site" else None
                for other in [box(o, 2)] + ([ob] if ob else []):
                    if lb[0] < other[2] and other[0] < lb[2] and lb[1] < other[3] and other[1] < lb[3]:
                        E(f"node `{nid}`: its label overlaps node `{oid}` or its label; zoom the map crop or move one")
                        break
            continue
        lines = str(n.get("label", "")).split("\n")
        subs = str(n["sub"]).split("\n") if n.get("sub") else []
        if subs and n.get("shape") in ("diamond", "circle"):
            E(f"node `{nid}`: `sub` is not supported on {n['shape']} nodes (no room); put it in the caption")
        corner = n.get("icon") and n.get("icon_pos") == "corner" and n.get("shape") in ICON_SHAPES - {"site"}
        strip = ICON_STRIP + 12 if n.get("icon") and n.get("shape") in ICON_SHAPES and not corner else 0
        if n.get("icon_pos") not in (None, "left", "corner"):
            E(f"node `{nid}`: icon_pos must be left or corner")
        if corner:
            cx, cy = corner_at(n)
            if cx - 13 < 0 or cy - 13 < 0:
                E(f"node `{nid}`: its corner icon leaves the viewBox; move the node down/right or use icon_pos: left")
            for oid, o in nodes.items():
                ob = box(o, 1)
                if oid != nid and ob[0] < cx + 13 and cx - 13 < ob[2] and ob[1] < cy + 13 and cy - 13 < ob[3]:
                    E(f"node `{nid}`: its corner icon overlaps node `{oid}`")
        for s_line in subs:
            if len(s_line) * SUB_W > n["w"] - 14 - strip:
                E(f"node `{nid}` sub {s_line!r} (~{len(s_line) * SUB_W:.0f}) is wider than the node allows (~{n['w'] - 14 - strip:.0f}{' beside its icon' if strip else ''}); shorten it or widen the node")
        # Diamonds and circles narrow away from the middle; measure at the text block's top/bottom.
        if n.get("shape") in ("diamond", "circle"):
            half = len(lines) * LINE_H / 2
            usable = n["w"] * (1 - 2 * half / n["h"]) * (1 if n.get("shape") == "diamond" else 1.15) - 8
        else:
            usable = n["w"] - 16 - strip
        widest = max(len(l) for l in lines) * CHAR_W
        if widest > usable:
            E(f"node `{nid}` label line {max(lines, key=len)!r} (~{widest:.0f}) is wider than the node allows (~{usable:.0f}{' beside its icon' if strip else ''}); add a \\n or widen it")
        if len(lines) * LINE_H + len(subs) * SUB_H + 10 > n["h"] * (0.75 if n.get("shape") == "diamond" else 1):
            E(f"node `{nid}`: {len(lines)} label + {len(subs)} sub lines do not fit height {n['h']}")
        if len(lines) > 3:
            W(f"node `{nid}` has {len(lines)} label lines; keep labels to 1-2 short lines")

    ids = list(nodes)
    for i, a in enumerate(ids):
        for b in ids[i + 1 :]:
            A, B = box(nodes[a], 6), box(nodes[b], 6)
            if A[0] < B[2] and B[0] < A[2] and A[1] < B[3] and B[1] < A[3]:
                E(f"nodes `{a}` and `{b}` overlap (or are closer than 12 units)")

    for lane in data.get("lanes", []) or []:
        lx, ly = lane["x"] + 14, lane["y"] + 8
        lbox = (lx, ly, lx + len(lane["label"]) * 7.5 * 1.1, ly + 16)
        for nid, n in nodes.items():
            b = box(n)
            if b[0] < lbox[2] and lbox[0] < b[2] and b[1] < lbox[3] and lbox[1] < b[3]:
                W(f"lane label {lane['label']!r} sits under node `{nid}`")

    edges = {}
    for e in data["edges"]:
        eid = e.get("id")
        if not eid:
            E(f"edge without id: {e}")
            continue
        if eid in edges:
            E(f"duplicate edge id `{eid}`")
        if e.get("from") not in nodes or e.get("to") not in nodes:
            E(f"edge `{eid}` references unknown node(s) {e.get('from')!r} -> {e.get('to')!r}")
            continue
        if e.get("tone") and e["tone"] not in TONES:
            E(f"edge `{eid}`: unknown tone {e['tone']!r}")
        if e.get("kind") and e["kind"] not in KINDS:
            E(f"edge `{eid}`: kind {e['kind']!r} must be one of {sorted(KINDS)}")
        if e.get("proto") and not kind_of(e):
            W(f"edge `{eid}`: no communication kind known for proto {e['proto']!r}; set kind: ({'|'.join(KINDS)})")
        if e.get("port") is not None and not (isinstance(e["port"], int) and 0 < e["port"] < 65536):
            E(f"edge `{eid}`: port must be a number from 1 to 65535, got {e['port']!r}")
        for side in ("exit", "enter"):
            if side in e and e[side] not in ("left", "right", "top", "bottom"):
                E(f"edge `{eid}`: {side} must be left/right/top/bottom")
        a, b = nodes[e["from"]], nodes[e["to"]]
        curve = curve_of(e, a, b)
        if curve is not None and not isinstance(curve, (int, float)):
            E(f"edge `{eid}`: curve must be a number (0.15 is a gentle arc, 0 straight, negative bows the other way)")
            curve = 0.15
        if curve is not None and abs(curve) > 0.6:
            W(f"edge `{eid}`: curve {curve} is very strong; 0.1 to 0.35 reads best")
        pts = [tuple(p) for p in e["points"]] if e.get("points") else arc(a, b, curve) if curve is not None else route(a, b, e)
        if e.get("points"):
            if not on_boundary(pts[0], a):
                W(f"edge `{eid}` starts at {pts[0]}, not on the border of `{a['id']}`")
            if not on_boundary(pts[-1], b):
                W(f"edge `{eid}` ends at {pts[-1]}, not on the border of `{b['id']}`")
        for p in pts:
            if not (0 <= p[0] <= VW and 0 <= p[1] <= VH):
                E(f"edge `{eid}` leaves the viewBox at {p}")
        cut = set()
        for p, q in zip(pts, pts[1:]):
            if curve is None and abs(p[0] - q[0]) > 0.5 and abs(p[1] - q[1]) > 0.5:
                W(f"edge `{eid}` has a diagonal segment {p}->{q}; prefer orthogonal routes")
            for nid, n in nodes.items():
                if nid in (e["from"], e["to"]):
                    continue
                if nid not in cut and seg_hits_box(p, q, box(n)):
                    cut.add(nid)
                    hint = "change `curve` (larger, or negative to bow the other way)" if curve is not None else "set exit/enter/offset or explicit points"
                    E(f"edge `{eid}` ({e['from']}->{e['to']}) cuts through node `{nid}`; {hint}")
        pill = pill_text(e)
        pill_at = None
        if pill:
            if e.get("proto_at"):
                pill_at = tuple(e["proto_at"])
            elif curve is not None:
                pill_at = tuple(point_at(pts, 0.5))
            else:
                sg = max(zip(pts, pts[1:]), key=lambda pq: math.dist(*pq))
                pill_at = ((sg[0][0] + sg[1][0]) / 2, (sg[0][1] + sg[1][1]) / 2)
            pw = len(pill) * 6.8 + 14
            pb = (pill_at[0] - pw / 2, pill_at[1] - 10, pill_at[0] + pw / 2, pill_at[1] + 10)
            if pb[0] < 2 or pb[1] < 2 or pb[2] > VW - 2 or pb[3] > VH - 2:
                E(f"edge `{eid}` pill {pill!r} is cut off by the viewBox edge at {tuple(round(v) for v in pill_at)}; set proto_at on a segment further in")
            for lane in data.get("lanes", []) or []:
                lx, ly = lane["x"] + 14, lane["y"] + 8
                lbox = (lx, ly, lx + len(lane["label"]) * 7.5 * 1.1, ly + 16)
                if lbox[0] < pb[2] and pb[0] < lbox[2] and lbox[1] < pb[3] and pb[1] < lbox[3]:
                    W(f"edge `{eid}` pill {pill!r} covers the lane label {lane['label']!r}; set proto_at")
            for nid, n in nodes.items():
                hits = [box(n, 2)] + ([site_label_box(n)] if n.get("shape") == "site" else [])
                if any(h[0] < pb[2] and pb[0] < h[2] and h[1] < pb[3] and pb[1] < h[3] for h in hits):
                    E(f"edge `{eid}` pill {pill!r} (~{pw:.0f} wide) overlaps node `{nid}`; give the arrow a segment at least {pw + 20:.0f} long, or set proto_at")
            for oid, o in edges.items():
                if o.get("pill_box") and o["pill_box"][0] < pb[2] and pb[0] < o["pill_box"][2] and o["pill_box"][1] < pb[3] and pb[1] < o["pill_box"][3]:
                    E(f"edge `{eid}` pill {pill!r} overlaps the pill on edge `{oid}`; set proto_at on one")
        badge = e.get("label") and not pill and e.get("badge", curve is not None)
        if badge:
            bx, by = e.get("label_at") or point_at(pts, 0.5)
            bw = len(str(e["label"])) * 7.4 + 16
            lb = (bx - bw / 2, by - 11, bx + bw / 2, by + 11)
            for nid, n in nodes.items():
                hits = [box(n, 2)] + ([site_label_box(n)] if n.get("shape") == "site" else [])
                if any(h[0] < lb[2] and lb[0] < h[2] and h[1] < lb[3] and lb[1] < h[3] for h in hits):
                    W(f"edge `{eid}` badge {e['label']!r} overlaps node `{nid}` or its label; change `curve` or set label_at")
        elif e.get("label"):
            # Same default spot as labelSpot() in the engine; 12px bold labels are ~7 units per char.
            seg = max(zip(pts, pts[1:]), key=lambda pq: math.dist(*pq))
            horizontal = abs(seg[0][1] - seg[1][1]) < 0.5
            mx, my = (seg[0][0] + seg[1][0]) / 2, (seg[0][1] + seg[1][1]) / 2
            lw = len(e["label"]) * 7
            if e.get("label_at"):
                lx, ly = e["label_at"]
                lb = (lx - lw / 2, ly - 11, lx + lw / 2, ly + 3)
            elif pill_at and horizontal:  # label moves above the pill
                lb = (pill_at[0] - lw / 2, pill_at[1] - 27, pill_at[0] + lw / 2, pill_at[1] - 13)
            elif pill_at:  # vertical: below-right of the pill
                lb = (pill_at[0] + 8, pill_at[1] + 15, pill_at[0] + 8 + lw, pill_at[1] + 29)
            elif horizontal:
                lb = (mx - lw / 2, my - 19, mx + lw / 2, my - 5)
            else:
                lb = (mx + 8, my - 7, mx + 8 + lw, my + 7)
            for nid, n in nodes.items():
                b = box(n, 2)
                if b[0] < lb[2] and lb[0] < b[2] and b[1] < lb[3] and lb[1] < b[3]:
                    W(f"edge `{eid}` label {e['label']!r} overlaps node `{nid}`; shorten it, set label_at, or give the edge more room")
        edges[eid] = {**e, "pts": pts, "curved": curve is not None, "is_badge": bool(badge), "pill": pill, "pill_at": pill_at,
                      "pill_box": pb if pill else None}

    # Another arrow running underneath a pill makes the pill look like it belongs to that arrow.
    for eid, e in edges.items():
        pb = e.get("pill_box")
        if not pb:
            continue
        inner = (pb[0] + 2, pb[1] + 2, pb[2] - 2, pb[3] - 2)
        for oid, o in edges.items():
            if oid == eid:
                continue
            if any(seg_hits_box(p, q, (inner[0] - 3, inner[1] - 3, inner[2] + 3, inner[3] + 3)) for p, q in zip(o["pts"], o["pts"][1:])):
                W(f"edge `{oid}` runs underneath the {e['pill']!r} pill of edge `{eid}`; move that pill with proto_at")

    # Labels and badges must not sit on another arrow's protocol pill.
    for eid, e in edges.items():
        if not e.get("label"):
            continue
        pts = e["pts"]
        lw = len(str(e["label"])) * 7
        if e.get("label_at"):
            lx, ly = e["label_at"]
            lb = (lx - lw / 2, ly - 11, lx + lw / 2, ly + 3)
        elif e["is_badge"]:
            bx, by = point_at(pts, 0.5)
            lb = (bx - lw / 2 - 8, by - 11, bx + lw / 2 + 8, by + 11)
        else:
            continue
        for oid, o in edges.items():
            pb = o.get("pill_box")
            if oid != eid and pb and lb[0] < pb[2] and pb[0] < lb[2] and lb[1] < pb[3] and pb[1] < lb[3]:
                W(f"edge `{eid}` label {e['label']!r} overlaps the {o['pill']!r} pill on edge `{oid}`; move label_at or proto_at")

    modes = data.get("modes") or [{"id": "default"}]
    mode_ids = [m["id"] for m in modes]
    if len(modes) > 2:
        E("at most two `modes` are supported (the checkbox switches between them)")
    if len(modes) == 2 and not modes[1].get("label"):
        E("the second mode needs a `label` (it is the checkbox text)")

    used_nodes, used_edges = set(), set()
    for mode in mode_ids:
        lit = set()
        steps = [s for s in data["steps"] if not s.get("when") or s.get("when") == mode]
        if not steps:
            E(f"mode `{mode}` has no steps")
            continue
        for i, s in enumerate(steps):
            label = f"step {i + 1} ({s.get('title', '?')!r}, mode {mode})"
            if s.get("clear"):
                lit = set()
            if not s.get("title") or not s.get("text"):
                E(f"{label} needs a title and text")
            if len(str(s.get("text", ""))) > 230:
                W(f"{label}: caption is {len(s['text'])} chars; aim for under ~200 so the layout does not jump")
            es = s.get("edges", []) or []
            if i == 0 and es:
                W(f"{label}: the first step usually only lights the start node (`lights: [..]`)")
            if i > 0 and not es:
                W(f"{label} has no edges, so nothing moves")
            for eid in es:
                if eid not in edges:
                    E(f"{label} references unknown edge `{eid}`")
                    continue
                used_edges.add(eid)
                if i > 0 and edges[eid]["from"] not in lit:
                    W(f"{label}: edge `{eid}` starts from `{edges[eid]['from']}`, which is not lit yet")
            lights = s.get("lights") or [edges[eid]["to"] for eid in es if eid in edges]
            for nid in lights:
                if nid not in nodes:
                    E(f"{label} lights unknown node `{nid}`")
                lit.add(nid)
                used_nodes.add(nid)
        for s in data["steps"]:
            if s.get("when") and s["when"] not in mode_ids:
                E(f"step {s.get('title')!r} has when: {s['when']!r}, not one of the modes {mode_ids}")
    for nid in nodes:
        if nid not in used_nodes:
            W(f"node `{nid}` is never lit by any step")
    for eid in edges:
        if eid not in used_edges:
            W(f"edge `{eid}` is never travelled by any step")
    return errors, warns, nodes, edges


def node_color(n, data, cols):
    """Mirror of the engine's box colour: color > tone > icon role > column cycle."""
    if n.get("tone"):
        return TONE_C[n["tone"]]
    if n.get("color"):
        return PALETTE.get(n["color"], n["color"])
    if data.get("colors") == "accent":
        return None
    icon = n.get("icon")
    role = (LOGO_ROLE.get(str(icon).lstrip("/").split("/")[0], "indigo") if is_logo(icon) else ROLE.get(icon)) if icon else None
    return PALETTE.get(role or CYCLE[cols.index(round(n["x"])) % len(CYCLE)])


def to_png(data, nodes, edges, out, out_base="."):
    VW, VH = data["viewbox"]
    acc = data.get("accent", "#38BDF8")
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VW} {VH}" width="{VW}" height="{VH}" font-family="DejaVu Sans, sans-serif">',
         '<defs><marker id="m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="' + acc + '"/></marker></defs>',
         f'<rect width="{VW}" height="{VH}" fill="#ffffff"/>']
    proj = projector(data)
    if proj:
        p = proj
        x0, y0 = p["ox"] + p["k"] * p["lon0"], p["oy"] - p["k"] * p["lat0"]
        x1, y1 = p["ox"] + p["k"] * p["lon1"], p["oy"] - p["k"] * p["lat1"]
        o.append(f'<clipPath id="mc"><rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}" rx="10"/></clipPath><g clip-path="url(#mc)">')
        o.append(f'<rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}" rx="10" fill="#f8fafc"/>')
        step = data["map"].get("graticule", 30)
        if step > 0:
            lon = math.ceil(p["lon0"] / step) * step
            while lon <= p["lon1"]:
                gx = p["ox"] + p["k"] * lon
                o.append(f'<line x1="{gx}" y1="{y0}" x2="{gx}" y2="{y1}" stroke="#e5e7eb" stroke-width="0.6"/>')
                lon += step
            lat = math.ceil(p["lat1"] / step) * step
            while lat <= p["lat0"]:
                gy = p["oy"] - p["k"] * lat
                o.append(f'<line x1="{x0}" y1="{gy}" x2="{x1}" y2="{gy}" stroke="#e5e7eb" stroke-width="0.6"/>')
                lat += step
        mf = find_map(data["map"].get("name", "world"), out_base)
        if mf:
            land = json.loads(mf.read_text())["land"]
            o.append(f'<path d="{land}" transform="translate({p["ox"]},{p["oy"]}) scale({p["k"]})" fill="{acc}" fill-opacity="0.07" stroke="{acc}" stroke-opacity="0.45" stroke-width="{0.9 / p["k"]}"/>')
        o.append("</g>")
    for l in data.get("lanes", []) or []:
        o.append(f'<rect x="{l["x"]}" y="{l["y"]}" width="{l["w"]}" height="{l["h"]}" rx="12" fill="#f3f4f6"/>')
        o.append(f'<text x="{l["x"] + 14}" y="{l["y"] + 20}" font-size="12" font-weight="700" fill="#6b7280">{l["label"].upper()}</text>')
    badges = []
    for e in edges.values():
        col = TONE_C.get(e.get("tone")) or (KINDS.get(kind_of(e)) or acc)
        if e.get("pill"):
            px, py = e["pill_at"]
            pw = len(e["pill"]) * 6.8 + 14
            badges.append(f'<rect x="{px - pw / 2}" y="{py - 10}" width="{pw}" height="20" rx="10" fill="#fff" stroke="{col}"/>'
                          f'<text x="{px}" y="{py + 4}" font-size="11" font-weight="700" font-family="DejaVu Sans Mono, monospace" fill="{col}" text-anchor="middle">{e["pill"]}</text>')
        d = "M" + " L".join(f"{x},{y}" for x, y in e["pts"])
        dash = ' stroke-dasharray="6 5"' if e.get("dashed") else ""
        arrow = ' marker-end="url(#m)"' if e.get("arrow", True) else ""
        o.append(f'<path d="{d}" fill="none" stroke="{col}" stroke-width="3"{dash}{arrow}/>')
        if e["is_badge"]:
            bx, by = e.get("label_at") or point_at(e["pts"], 0.5)
            bw = len(str(e["label"])) * 7.4 + 16
            badges.append(f'<rect x="{bx - bw / 2}" y="{by - 11}" width="{bw}" height="22" rx="7" fill="#fff" stroke="{col}"/>'
                          f'<text x="{bx}" y="{by + 4}" font-size="12" font-weight="700" font-family="DejaVu Sans Mono, monospace" fill="{col}" text-anchor="middle">{e["label"]}</text>')
        elif e.get("label"):
            seg = max(zip(e["pts"], e["pts"][1:]), key=lambda pq: math.dist(*pq))
            lx, ly = e.get("label_at") or ((seg[0][0] + seg[1][0]) / 2, (seg[0][1] + seg[1][1]) / 2 - 8)
            o.append(f'<text x="{lx}" y="{ly}" font-size="12" font-weight="700" fill="#6b7280" text-anchor="middle">{e["label"]}</text>')
    cols = sorted({round(n["x"]) for n in nodes.values()})
    for n in nodes.values():
        x, y, w, h = n["x"], n["y"], n["w"], n["h"]
        col = node_color(n, data, cols) or acc
        style = f'fill="{col}" fill-opacity="0.12" stroke="{col}" stroke-width="2"'
        shape = n.get("shape")
        if shape == "site":
            r = w / 2
            o.append(f'<circle cx="{x}" cy="{y}" r="{r + 9}" fill="{col}" fill-opacity="0.14"/><circle cx="{x}" cy="{y}" r="{r}" {style}/>')
            icon = ICONS.get(n.get("icon"), ICONS["server"]).replace('class="flw-ifill"', f'fill="{col}" stroke="none"')
            o.append(f'<g transform="translate({x},{y}) scale({r / 26})" fill="none" stroke="{col}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{icon}</g>')
            lb = site_label_box(n)
            o.append(f'<rect x="{lb[0] - 3}" y="{lb[1]}" width="{lb[2] - lb[0] + 6}" height="{lb[3] - lb[1]}" rx="4" fill="#fff" fill-opacity="0.85"/>')
            ty = y + r + 15 + 5
            for i, line in enumerate(str(n.get("label", "")).split("\n")):
                ty += LINE_H if i else 0
                o.append(f'<text x="{x}" y="{ty}" font-size="14" font-weight="600" fill="#1f2937" text-anchor="middle">{line}</text>')
            for line in str(n["sub"]).split("\n") if n.get("sub") else []:
                ty += SUB_H
                o.append(f'<text x="{x}" y="{ty}" font-size="12" font-family="DejaVu Sans Mono, monospace" fill="{col}" text-anchor="middle">{line}</text>')
            continue
        if shape == "diamond":
            o.append(f'<polygon points="{x},{y - h / 2} {x + w / 2},{y} {x},{y + h / 2} {x - w / 2},{y}" {style}/>')
        elif shape == "circle":
            o.append(f'<ellipse cx="{x}" cy="{y}" rx="{w / 2}" ry="{h / 2}" {style}/>')
        else:
            rx = h / 2 if shape == "terminal" else 8 if shape == "cylinder" else 10
            o.append(f'<rect x="{x - w / 2}" y="{y - h / 2}" width="{w}" height="{h}" rx="{rx}" {style}/>')
        tx = x
        if n.get("icon") and shape in ICON_SHAPES:
            ix, iy = x - w / 2 + 17, y + (5 if shape == "cylinder" else 0)
            tx = x + ICON_STRIP / 2 - 2
            if is_logo(n["icon"]):
                o.append(f'<rect x="{ix - 13}" y="{iy - 13}" width="26" height="26" rx="5" fill="#fff" stroke="{col}"/><text x="{ix}" y="{iy + 4}" font-size="9" fill="{col}" text-anchor="middle">logo</text>')
            else:
                ic = ICONS.get(n["icon"], ICONS["server"]).replace('class="flw-ifill"', f'fill="{col}" stroke="none"')
                o.append(f'<g transform="translate({ix},{iy}) scale({22 / 24})" fill="none" stroke="{col}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{ic}</g>')
        rows = [(l, LINE_H, 'font-size="14" font-weight="600" fill="#1f2937"') for l in str(n.get("label", "")).split("\n")]
        rows += [(l, SUB_H, f'font-size="12" font-family="DejaVu Sans Mono, monospace" fill="{col}"') for l in (str(n["sub"]).split("\n") if n.get("sub") else [])]
        ty = y - sum(r[1] for r in rows[1:]) / 2 + 5
        for i, (line, lh, attrs) in enumerate(rows):
            ty += lh if i else 0
            o.append(f'<text x="{tx}" y="{ty}" {attrs} text-anchor="middle">{line}</text>')
    o.extend(badges)
    o.append("</svg>")
    try:
        import cairosvg
    except ImportError:
        svg = Path(out).with_suffix(".svg")
        svg.write_text("".join(o))
        print(f"cairosvg not installed, wrote {svg} instead (pip install --user --break-system-packages cairosvg)")
        return
    cairosvg.svg2png(bytestring="".join(o).encode(), write_to=str(out))
    print(f"preview: {out}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("file")
    ap.add_argument("--png", help="write a static final-state PNG of the layout here")
    args = ap.parse_args()
    data = yaml.safe_load(Path(args.file).read_text())
    # Jekyll parses _data with Ruby's Psych, which is stricter than PyYAML (e.g. ",," in a flow map).
    import shutil
    import subprocess
    if shutil.which("ruby"):
        r = subprocess.run(["ruby", "-ryaml", "-e", "YAML.load_file(ARGV[0])", args.file], capture_output=True, text=True)
        if r.returncode:
            print(f"ERROR Ruby/Jekyll cannot parse this YAML: {r.stderr.strip().splitlines()[0][:300]}")
            print(f"FAILED: 1 error(s) in {args.file}")
            sys.exit(1)
    errors, warns, nodes, edges = validate(data, Path(args.file).parent)
    for w in warns:
        print(f"WARN  {w}")
    for e in errors:
        print(f"ERROR {e}")
    if args.png and nodes:
        to_png(data, nodes, edges, args.png, Path(args.file).parent)
    print(f"{'FAILED' if errors else 'OK'}: {len(errors)} error(s), {len(warns)} warning(s) in {args.file}")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
