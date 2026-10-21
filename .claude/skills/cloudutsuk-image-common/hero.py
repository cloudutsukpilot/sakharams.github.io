#!/usr/bin/env python3
"""Render a Cloudutsuk hero image (1200x630, Chirpy/OpenGraph size) for a blog post.

The house layout: category kicker, fitted title, tag chips and a cloudutsuk.com footer on
the left; on the right, the tool's icon (from assets/img/icons/) on a glowing tile, or -
when no icon matches - the category's procedural motif. Palette comes from brand.json.

Two modes:
  * design mode (default)      - everything drawn in code (Level 1).
  * --background IMG           - a Level 2 render / Level 3 Flux image fills the canvas and the
                                 same branded text block is laid over a dark scrim.

Usage:
    python3 hero.py <post>                          # preview -> ./hero-preview/<slug>.webp
    python3 hero.py <post> --write                  # save to assets/img/... and update front matter
    python3 hero.py <post> --background scene.png --write
    python3 hero.py <post> --title "Shorter Title" --tags "State,Backends" --no-icon --out x.png
Options: --icon PATH (force an icon), --motif network|stack|pipeline|shield|blueprint|orbit,
         --alt TEXT, --force (replace a post-specific image), --format webp|png.
"""
from __future__ import annotations

import argparse
import hashlib
import math
import random
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "lib"))
from cloudutsuk import GENERIC_ICONS, ROOT, apply_hero, load_icon, norm, palette_for, post_context  # noqa: E402
from render import Design  # noqa: E402

W, H = 1200, 630
MOTIFS = ("network", "stack", "pipeline", "shield", "blueprint", "orbit")


def mix(a, b, t):
    return tuple(int(round(a[i] * (1 - t) + b[i] * t)) for i in range(3))


class Hero:
    def __init__(self, ctx: dict, seed: int):
        self.ctx = ctx
        self.p = palette_for(ctx["category"])
        self.d = Design((W, H), supersample=2, background=self.p["ink"])
        self.rng = random.Random(seed)

    # ---- translucent drawing: engine draws are opaque, so composite a layer ----
    def layer(self, fn, blur=0):
        d = self.d
        lay = Image.new("RGBA", (d.Ws, d.Hs), (0, 0, 0, 0))
        fn(ImageDraw.Draw(lay), d)
        if blur:
            lay = lay.filter(ImageFilter.GaussianBlur(blur * d.ss))
        d.img = Image.alpha_composite(d.img, lay)

    def paste(self, img: Image.Image, cx, cy):
        d = self.d
        img = img.resize((img.width * d.ss, img.height * d.ss), Image.LANCZOS)
        d.img.alpha_composite(img, (int(d.X(cx) - img.width / 2), int(d.Y(cy) - img.height / 2)))

    # ------------------------------------------------------------------ backgrounds
    def design_background(self):
        d, p = self.d, self.p
        d.linear_gradient([(0, mix(p["ink"], p["accent2"], 0.06)), (1, p["ink"])], angle=0)
        d.overlay_glow((0.86, 0.18), p["accent"], 0.30, strength=0.30)
        d.overlay_glow((0.98, 0.98), p["accent2"], 0.28, strength=0.30)
        d.overlay_glow((0.02, 1.05), p["accent2"], 0.22, strength=0.12)
        # faint dot grid -> "technical" texture
        step = 26

        def dots(dr, dd):
            r = 1.1 * dd.ss
            for gy in range(step // 2, H, step):
                for gx in range(step // 2, W, step):
                    x, y = gx * dd.ss, gy * dd.ss
                    dr.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, 16))
        self.layer(dots)
        d.vignette(0.35, radius=0.9)

    def photo_background(self, path: Path):
        d, p = self.d, self.p
        img = Image.open(path).convert("RGB")
        scale = max(d.Ws / img.width, d.Hs / img.height)          # cover-fit
        img = img.resize((math.ceil(img.width * scale), math.ceil(img.height * scale)), Image.LANCZOS)
        left, top = (img.width - d.Ws) // 2, (img.height - d.Hs) // 2
        img = img.crop((left, top, left + d.Ws, top + d.Hs))
        d.set_rgb(np.asarray(img, np.float32))
        # left-to-right ink scrim keeps the text block legible on any render
        xx, _ = d.coords()
        t = np.clip(1 - (xx / d.Ws) / 0.70, 0, 1) ** 1.25
        a = (0.30 + 0.62 * t)[..., None]
        base = d.get_rgb()
        d.set_rgb(base * (1 - a) + np.array(p["ink"], np.float32) * a)
        d.overlay_glow((0.0, 1.0), p["accent2"], 0.25, strength=0.18)

    # ------------------------------------------------------------------ right side
    def icon_tile(self, icon: Image.Image, cx, cy, size_px, rings=True):
        d, p = self.d, self.p
        half_w, half_h = size_px / 2 / W, size_px / 2 / H
        if rings:
            d.overlay_glow((cx, cy), p["accent"], 0.15, strength=0.40)
            for i, (r, col) in enumerate([(0.135, p["accent"]), (0.170, p["accent2"]), (0.205, p["accent"])]):
                self.layer(lambda dr, dd, r=r, col=col, i=i: dr.ellipse(
                    [dd.X(cx) - dd.S(r), dd.Y(cy) - dd.S(r), dd.X(cx) + dd.S(r), dd.Y(cy) + dd.S(r)],
                    outline=(*col, 120 - 30 * i), width=int(2 * dd.ss)))
                ang = self.rng.uniform(0, 2 * math.pi)
                d.disk(cx + r * math.cos(ang), cy + r * math.sin(ang) * W / H, 0.006, col,
                       glow={"color": col, "size": 0.03 * d.Ws})
        # soft shadow + glass-white tile so dark brand icons stay visible
        self.layer(lambda dr, dd: dr.rounded_rectangle(
            [dd.X(cx - half_w), dd.Y(cy - half_h + 0.02), dd.X(cx + half_w), dd.Y(cy + half_h + 0.02)],
            radius=dd.S(0.03), fill=(0, 0, 0, 150)), blur=14)
        d.rect(cx - half_w, cy - half_h, cx + half_w, cy + half_h, (246, 248, 252), radius=0.03)
        self.layer(lambda dr, dd: dr.rounded_rectangle(
            [dd.X(cx - half_w), dd.Y(cy - half_h), dd.X(cx + half_w), dd.Y(cy + half_h)],
            radius=dd.S(0.03), outline=(*p["accent"], 200), width=int(3 * dd.ss)))
        self.paste(icon, cx, cy)

    def motif(self, kind, cx=0.79, cy=0.50):
        getattr(self, f"motif_{kind}")(cx, cy)

    def motif_orbit(self, cx, cy):
        d, p = self.d, self.p
        d.overlay_glow((cx, cy), p["accent"], 0.16, strength=0.45)
        for i, r in enumerate([0.07, 0.12, 0.17, 0.22]):
            col = p["accent"] if i % 2 == 0 else p["accent2"]
            d.arc(cx, cy, r, self.rng.uniform(0, 360), self.rng.uniform(200, 330) + 180, 3, col)
        d.gradient_sphere(cx, cy, 0.045, [mix(p["accent"], (255, 255, 255), 0.4), p["accent"], p["accent2"]],
                          shadow=False, glow=None)

    def motif_network(self, cx, cy):
        d, p = self.d, self.p
        d.overlay_glow((cx, cy), p["accent"], 0.18, strength=0.35)
        nodes = [(cx, cy)]
        while len(nodes) < 14:
            a, r = self.rng.uniform(0, 2 * math.pi), self.rng.uniform(0.06, 0.20)
            x, y = cx + r * math.cos(a), cy + r * math.sin(a) * W / H * 0.95
            if 0.66 < x < 0.97 and 0.10 < y < 0.90 and all(math.hypot(x - u, (y - v) * H / W) > 0.045 for u, v in nodes):
                nodes.append((x, y))

        def edges(dr, dd):
            for i, (x, y) in enumerate(nodes):
                near = sorted(range(len(nodes)), key=lambda j: math.hypot(nodes[j][0] - x, (nodes[j][1] - y) * H / W))[1:3]
                for j in near:
                    col = p["accent"] if (i + j) % 2 else p["accent2"]
                    dr.line([dd.X(x), dd.Y(y), dd.X(nodes[j][0]), dd.Y(nodes[j][1])], fill=(*col, 130), width=int(2 * dd.ss))
        self.layer(edges)
        for i, (x, y) in enumerate(nodes):
            col = p["accent"] if i % 3 else p["accent2"]
            r = 0.022 if i == 0 else self.rng.uniform(0.007, 0.013)
            d.disk(x, y, r, col, glow={"color": col, "size": 0.035 * d.Ws})
            if i == 0:
                d.disk(x, y, r * 0.45, (255, 255, 255))

    def motif_stack(self, cx, cy):
        d, p = self.d, self.p
        d.overlay_glow((cx, cy), p["accent"], 0.18, strength=0.35)
        w, h, th = 0.14, 0.085, 0.045                      # half-width, half-depth (y), slab thickness
        for k in range(3):
            y = cy + 0.17 - k * 0.135
            t = k / 2
            top = mix(p["accent"], p["accent2"], t)
            left, right = mix(top, p["ink"], 0.35), mix(top, p["ink"], 0.55)
            d.polygon([(cx - w, y), (cx, y + h), (cx, y + h + th * 2), (cx - w, y + th * 2)], left)
            d.polygon([(cx + w, y), (cx, y + h), (cx, y + h + th * 2), (cx + w, y + th * 2)], right)
            d.polygon([(cx, y - h), (cx + w, y), (cx, y + h), (cx - w, y)], top,
                      glow={"color": top, "size": 0.03 * d.Ws} if k == 2 else None)
            for j in range(3):                               # status LEDs
                d.disk(cx - w + 0.03 + j * 0.022, y + th * 1.25 + j * 0.0105, 0.0042, (255, 255, 255))

    def motif_pipeline(self, cx, cy):
        d, p = self.d, self.p
        d.overlay_glow((cx, cy), p["accent"], 0.18, strength=0.35)
        rx = 0.085                                           # infinity loop of two rings
        for side, col in ((-1, p["accent"]), (1, p["accent2"])):
            d.ring(cx + side * rx, cy, rx * 0.98, 14, col, glow={"color": col, "size": 0.04 * d.Ws})
        for i in range(8):
            a = i / 8 * 2 * math.pi
            side = -1 if i < 4 else 1
            x = cx + side * rx + rx * 0.98 * math.cos(a)
            y = cy + rx * 0.98 * math.sin(a) * W / H
            d.disk(x, y, 0.010, (255, 255, 255), glow={"color": p["accent"], "size": 0.02 * d.Ws})

    def motif_shield(self, cx, cy):
        d, p = self.d, self.p
        d.overlay_glow((cx, cy), p["accent"], 0.18, strength=0.40)

        def shield(s):                                   # s = half-width in px
            pts = [(-s, -1.05 * s), (0, -1.25 * s), (s, -1.05 * s), (s, 0.05 * s)]
            for i in range(1, 25):                       # right curve down to the point
                t = i / 24
                pts.append((s * (1 - t) ** 1.6, 0.05 * s + 1.3 * s * math.sin(t * math.pi / 2)))
            for i in range(23, 0, -1):                   # mirror back up the left side
                t = i / 24
                pts.append((-s * (1 - t) ** 1.6, 0.05 * s + 1.3 * s * math.sin(t * math.pi / 2)))
            pts.append((-s, 0.05 * s))
            return [(cx + x / W, cy + y / H) for x, y in pts]
        d.polygon(shield(150), mix(p["accent"], p["ink"], 0.55), glow={"color": p["accent"], "size": 0.05 * d.Ws})
        d.polygon(shield(132), mix(p["accent2"], p["ink"], 0.15))
        d.polygon(shield(120), mix(p["accent"], p["ink"], 0.10))
        d.disk(cx, cy - 0.04, 0.026, p["ink"])           # keyhole
        d.polygon([(cx - 0.013, cy - 0.03), (cx + 0.013, cy - 0.03), (cx + 0.022, cy + 0.10), (cx - 0.022, cy + 0.10)], p["ink"])

    def motif_blueprint(self, cx, cy):
        d, p = self.d, self.p
        x0, x1, y0, y1 = cx - 0.15, cx + 0.17, cy - 0.33, cy + 0.33

        def grid(dr, dd):
            for i in range(15):
                x = x0 + (x1 - x0) * i / 14
                dr.line([dd.X(x), dd.Y(y0), dd.X(x), dd.Y(y1)], fill=(*p["accent"], 38), width=dd.ss)
            for i in range(15):
                y = y0 + (y1 - y0) * i / 14
                dr.line([dd.X(x0), dd.Y(y), dd.X(x1), dd.Y(y)], fill=(*p["accent"], 38), width=dd.ss)
        self.layer(grid)
        boxes = [(cx - 0.085, cy - 0.20), (cx + 0.095, cy - 0.06), (cx - 0.07, cy + 0.17)]
        for (ax, ay), (bx, by) in zip(boxes, boxes[1:]):
            d.line(ax, ay, bx, ay, 3, p["accent2"])
            d.line(bx, ay, bx, by, 3, p["accent2"])
        for i, (bx, by) in enumerate(boxes):
            col = p["accent"] if i != 1 else p["accent2"]
            d.rect(bx - 0.055, by - 0.07, bx + 0.055, by + 0.07, mix(col, p["ink"], 0.7), radius=0.012)
            self.layer(lambda dr, dd, bx=bx, by=by, col=col: dr.rounded_rectangle(
                [dd.X(bx - 0.055), dd.Y(by - 0.07), dd.X(bx + 0.055), dd.Y(by + 0.07)],
                radius=dd.S(0.012), outline=(*col, 255), width=int(3 * dd.ss)))
            for k in range(3):
                d.rect(bx - 0.035, by - 0.03 + k * 0.03, bx + 0.035 - k * 0.012, by - 0.02 + k * 0.03, col, radius=0.004)

    # ------------------------------------------------------------------ left column
    def text_block(self, title, kicker, tags, icon_small: Image.Image | None):
        d, p = self.d, self.p
        x, col_frac = 0.065, 0.56
        # title: largest size (<=68) that wraps into <= 3 lines
        for size in range(68, 34, -2):
            lines = d.wrap(title, col_frac, role="grotesque", weight="bold", size=size)
            if len(lines) <= 3 and all(d.measure(l, role="grotesque", weight="bold", size=size)[0] <= col_frac * W for l in lines):
                break
        n, f = len(lines), col_frac                      # balance: narrowest column keeping n lines
        while n > 1 and f > 0.25 and len(d.wrap(title, f - 0.01, role="grotesque", weight="bold", size=size)) == n:
            f -= 0.01
        lines = d.wrap(title, f, role="grotesque", weight="bold", size=size)
        lh = size * 1.12
        k_size, chip_h = 17, 34
        blocks = (64 + 26 if icon_small is not None else 0) + (k_size + 26) + lh * len(lines) + (24 + chip_h if tags else 0)
        top = max(60, (H * 0.90 - blocks) / 2 + 10)
        y = top
        if icon_small is not None:                           # overlay mode: small icon chip
            d.rect(x, y / H, x + 64 / W, (y + 64) / H, (246, 248, 252), radius=0.012)
            self.paste(icon_small, x + 32 / W, (y + 32) / H)
            y += 64 + 26
        d.rect(x, (y + 4) / H, x + 28 / W, (y + 8) / H, p["accent"], radius=0.002)
        d.write(x + 40 / W, (y + k_size * 0.78) / H, kicker, role="mono", size=k_size, color=p["accent"], tracking=3)
        y += k_size + 26
        for ln in lines:
            d.write(x, (y + size * 0.86) / H, ln, role="grotesque", weight="bold", size=size, color=p["text"],
                    shadow=True)
            y += lh
        if tags:
            y += 24
            cx = x
            for t in tags:
                tw, _ = d.measure(t, role="mono", size=15)
                w = tw + 28
                if (cx + w / W) > x + col_frac:
                    break
                self.layer(lambda dr, dd, cx=cx, y=y, w=w: dr.rounded_rectangle(
                    [dd.X(cx), dd.Y(y / H), dd.X(cx + w / W), dd.Y((y + chip_h) / H)], radius=dd.S(chip_h / 2 / W),
                    fill=(*p["accent2"], 40), outline=(*p["accent2"], 170), width=int(1.5 * dd.ss)))
                d.write(cx + 14 / W, (y + chip_h / 2 + 5.5) / H, t, role="mono", size=15, color=mix(p["text"], p["accent2"], 0.25))
                cx += (w + 10) / W
        # footer
        d.disk(x + 5 / W, 0.905, 5 / W, p["accent"])
        d.write(x + 20 / W, 0.905 + 6 / H, p["site"], role="mono", size=17, color=p["muted"], tracking=1)
        return lines, size


def clean(text: str) -> str:
    """Drop emoji / pictographs / variation selectors the bundled fonts can't draw (they render as boxes)."""
    import unicodedata
    out = "".join(c for c in text if unicodedata.category(c) not in ("So", "Cn", "Co", "Cs")
                  and not 0xFE00 <= ord(c) <= 0xFE0F and c != "\u200d")
    return re.sub(r"\s+", " ", out).strip(" -\u2013\u2014:")


def pick_tags(ctx, override):
    if override is not None:
        return [t.strip() for t in override.split(",") if t.strip()][:4]
    skip = {s.lower().replace("-", "") for s in ctx["segments"]} | {ctx["palette"]["label"].lower().replace(" ", "")}
    title = ctx["title"].lower().replace(" ", "")
    tags = [t for t in ctx["tags"] if t.lower().replace(" ", "") not in skip and t.lower().replace(" ", "") not in title]
    return [clean(t) for t in tags[:3] if clean(t)]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("post")
    ap.add_argument("--background", help="Level 2/3 image to use as the canvas")
    ap.add_argument("--title")
    ap.add_argument("--kicker")
    ap.add_argument("--tags", help="comma list; '' for none")
    ap.add_argument("--icon", help="icon file to use instead of the auto-matched one")
    ap.add_argument("--no-icon", action="store_true")
    ap.add_argument("--motif", choices=MOTIFS)
    ap.add_argument("--format", default="webp", choices=["webp", "png"])
    ap.add_argument("--out", help="output file (default: hero-preview/<slug>.<fmt>, or the post's target with --write)")
    ap.add_argument("--write", action="store_true", help="save to assets/img/... and update the post's front matter")
    ap.add_argument("--alt")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()

    ctx = post_context(a.post, a.format)
    if (a.write and not a.force and ctx["current_image"] and ctx["current_image_exists"]
            and not ctx["current_image_is_generic"] and ctx["current_image"] != ctx["target_url"]):
        sys.exit(f"Refusing: post already has its own image {ctx['current_image']}. "
                 "Ask the user, then re-run with --force to replace it.")
    seed = int(hashlib.sha1(ctx["slug"].encode()).hexdigest()[:8], 16)
    np.random.seed(seed)
    hero = Hero(ctx, seed)

    icon_path = None
    if not a.no_icon:
        icon_path = Path(a.icon) if a.icon else (ROOT / ctx["icons"][0] if ctx["icons"] else None)
        if icon_path and not icon_path.is_absolute():
            icon_path = ROOT / icon_path
    specific = [i for i in ctx["icons"] if norm(Path(i).stem.replace("-18", "")) not in GENERIC_ICONS]
    is_vs = " vs" in ctx["title"].lower() and len(specific) >= 2 and not a.icon and not a.no_icon

    try:
        if a.background:
            hero.photo_background(Path(a.background))
            small = load_icon(icon_path, 44) if icon_path else None
            hero.text_block(clean(a.title or ctx["title"]), a.kicker or ctx["kicker"], pick_tags(ctx, a.tags), small)
        else:
            hero.design_background()
            if is_vs:
                hero.icon_tile(load_icon(ROOT / specific[0], 92), 0.72, 0.42, 140, rings=False)
                hero.icon_tile(load_icon(ROOT / specific[1], 92), 0.87, 0.60, 140, rings=False)
                hero.d.write(0.795, 0.55, "vs", role="serif_book", italic=True, size=44, color=hero.p["muted"], align="center")
            elif icon_path:
                hero.icon_tile(load_icon(icon_path, 124), 0.80, 0.50, 188)
            else:
                hero.motif(a.motif or ctx["palette"]["motif2d"])
            hero.text_block(clean(a.title or ctx["title"]), a.kicker or ctx["kicker"], pick_tags(ctx, a.tags), None)
    except RuntimeError as e:          # cairosvg missing -> typography + motif fallback
        print(f"WARNING: {e}; rendering without icon", file=sys.stderr)
        hero = Hero(ctx, seed)
        if a.background:
            hero.photo_background(Path(a.background))
        else:
            hero.design_background()
            hero.motif(a.motif or ctx["palette"]["motif2d"])
        hero.text_block(clean(a.title or ctx["title"]), a.kicker or ctx["kicker"], pick_tags(ctx, a.tags), None)

    if a.out:
        out = Path(a.out)
    elif a.write:
        out = ROOT / ctx["target_image"]
    else:
        out = Path.cwd() / "hero-preview" / f"{ctx['slug']}.{a.format}"
    out.parent.mkdir(parents=True, exist_ok=True)
    img = hero.d.render(grain=2.2, chroma=0.8, saturation=1.04)
    if out.suffix.lower() == ".webp":
        img.save(out, quality=88, method=6)
    else:
        img.save(out, optimize=True)
    print(f"Saved {out}  ({out.stat().st_size // 1024} KB, {img.width}x{img.height})")
    print(f"icon: {icon_path.relative_to(ROOT) if icon_path and not a.background else icon_path or 'none (motif: ' + (a.motif or ctx['palette']['motif2d']) + ')'}")

    if a.write:
        try:
            rel = out.resolve().relative_to(ROOT)
        except ValueError:
            sys.exit("--write needs the output inside the repo (omit --out or point it under assets/img/).")
        alt = a.alt or ctx["alt_suggestion"]
        print(apply_hero(ctx, str(rel), alt, force=a.force))


if __name__ == "__main__":
    main()
