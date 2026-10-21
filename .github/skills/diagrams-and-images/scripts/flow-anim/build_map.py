#!/usr/bin/env python3
"""Build the land outline used by geo flow animations (`map:` in a _data/flow_anims/ file).

Downloads Natural Earth 110m land (public domain), simplifies it (Douglas-Peucker) and writes
_data/flow_maps/world.json as one SVG path in degree units: x = longitude, y = -latitude. The engine
(assets/js/flow-anim.js) places that path with a translate/scale, so any `map.lon`/`map.lat` crop
reuses the same data. Run from the repo root; it only needs re-running to change the detail level.

  python3 build_map.py [--tolerance 0.25] [--source FILE_OR_URL]
"""
import argparse
import json
import urllib.request
from pathlib import Path

URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson"
OUT = Path("_data/flow_maps/world.json")


def simplify(pts, tol):
    """Douglas-Peucker on a list of (x, y)."""
    if len(pts) < 3:
        return pts
    (ax, ay), (bx, by) = pts[0], pts[-1]
    dx, dy = bx - ax, by - ay
    norm = (dx * dx + dy * dy) ** 0.5 or 1e-9
    best, idx = 0.0, 0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]
        d = abs(dy * px - dx * py + bx * ay - by * ax) / norm if (dx or dy) else ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
        if d > best:
            best, idx = d, i
    if best <= tol:
        return [pts[0], pts[-1]]
    return simplify(pts[: idx + 1], tol)[:-1] + simplify(pts[idx:], tol)


def fmt(v):
    s = f"{v:.1f}".rstrip("0").rstrip(".")
    return "0" if s == "-0" else s


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--tolerance", type=float, default=0.25, help="simplification in degrees (default 0.25)")
    ap.add_argument("--source", default=URL)
    args = ap.parse_args()
    if args.source.startswith("http"):
        with urllib.request.urlopen(args.source, timeout=60) as r:
            geo = json.load(r)
    else:
        geo = json.loads(Path(args.source).read_text())

    parts, kept = [], 0
    for f in geo["features"]:
        g = f["geometry"]
        polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        for poly in polys:
            for ring in poly:
                pts = simplify([(lon, -lat) for lon, lat in ring], args.tolerance)
                if len(pts) < 4:  # specks
                    continue
                kept += len(pts)
                parts.append("M" + "L".join(f"{fmt(x)},{fmt(y)}" for x, y in pts[:-1]) + "Z")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "source": "Natural Earth 110m land (public domain), simplified by .github/skills/diagrams-and-images/scripts/flow-anim/build_map.py",
        "units": "degrees: x = longitude, y = -latitude",
        "land": "".join(parts),
    }) + "\n")
    print(f"wrote {OUT}: {len(parts)} rings, {kept} points, {OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
