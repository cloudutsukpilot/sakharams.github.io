#!/usr/bin/env python3
"""Render a cover image for a Cloudutsuk blog post using Pillow.

Example:
  make_cover.py --title "Terraform State Locking" --subtitle "Safe concurrent applies with Azure Blob" \
      --category devops --tags Terraform,Azure --size 1200x675 --out assets/img/devops/x.webp
  make_cover.py --measure assets/img/devops/orchestration/terraform/terraform-posts.jpg
"""
import argparse
import hashlib
import math
import random
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# (background top, background bottom, accent) per top-level category; unknown categories hash into this list.
PALETTES = {
    "devops": ("#0b1e3a", "#12375e", "#38bdf8"),
    "devsecops": ("#1f0b2e", "#3b1450", "#f472b6"),
    "cloud": ("#0a2540", "#0f4c81", "#60a5fa"),
    "cloudnative": ("#062a2e", "#0b4f55", "#2dd4bf"),
    "cybersecurity": ("#1a0a0a", "#4a1111", "#f87171"),
    "iam": ("#141b2e", "#27335a", "#a5b4fc"),
    "artificialintelligence": ("#140b33", "#2e1a6b", "#c084fc"),
    "agenticai": ("#120a2a", "#34176e", "#e879f9"),
    "aicodingtools": ("#0f1a2a", "#1d3557", "#fbbf24"),
    "mlops": ("#0d1f1a", "#14463a", "#34d399"),
    "networking": ("#0b1d2b", "#10405f", "#22d3ee"),
    "databases": ("#1a1408", "#4a3510", "#fbbf24"),
    "programming": ("#111827", "#1f2a44", "#4ade80"),
    "architect": ("#101828", "#243b63", "#93c5fd"),
    "finops": ("#0d1f12", "#1a4a26", "#86efac"),
    "homelab": ("#1c1208", "#4a2c0e", "#fb923c"),
}
FALLBACK = [("#0f172a", "#1e3a5f", "#38bdf8"), ("#1a1030", "#3b2170", "#a78bfa"),
            ("#0b2320", "#0f4a44", "#5eead4"), ("#231208", "#5a2a10", "#fdba74")]

FONT_BOLD = ["DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
             "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]
FONT_REG = ["DejaVuSans.ttf", "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]


def font(candidates, size):
    for c in candidates:
        try:
            return ImageFont.truetype(c, size)
        except OSError:
            continue
    return ImageFont.load_default(size)


def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def wrap(draw, text, fnt, max_w):
    lines, cur = [], ""
    for word in text.split():
        trial = f"{cur} {word}".strip()
        if draw.textlength(trial, font=fnt) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def render(a):
    W, H = map(int, a.size.lower().split("x"))
    s = W / 1200  # scale factor relative to the 1200px design
    seed = int(hashlib.md5(a.title.encode()).hexdigest(), 16)
    rnd = random.Random(seed)
    top, bot, acc = PALETTES.get(a.category.lower(), FALLBACK[seed % len(FALLBACK)])
    top, bot, acc = rgb(top), rgb(bot), rgb(acc)

    # Diagonal gradient background.
    img = Image.new("RGB", (W, H))
    px = img.load()
    for y in range(H):
        for x in range(0, W):
            t = (x / W * 0.35 + y / H * 0.65)
            px[x, y] = tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3))

    # Soft accent glow on the right.
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cx, cy, r = int(W * 0.78), int(H * 0.45), int(H * 0.55)
    gd.ellipse((cx - r, cy - r, cx + r, cy + r), fill=acc + (70,))
    glow = glow.filter(ImageFilter.GaussianBlur(int(120 * s)))
    img = Image.alpha_composite(img.convert("RGBA"), glow)

    # Network-graph motif (seeded by title so every post differs).
    motif = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    md = ImageDraw.Draw(motif)
    nodes = [(rnd.uniform(W * 0.58, W * 0.97), rnd.uniform(H * 0.08, H * 0.92)) for _ in range(16)]
    for i, (x1, y1) in enumerate(nodes):
        for x2, y2 in sorted(nodes, key=lambda n: math.dist(n, (x1, y1)))[1:3]:
            md.line((x1, y1, x2, y2), fill=acc + (90,), width=max(1, int(2 * s)))
    for i, (x, y) in enumerate(nodes):
        rr = (6 if i % 3 else 11) * s
        md.ellipse((x - rr, y - rr, x + rr, y + rr), fill=acc + (200 if i % 3 == 0 else 130,))
    # A few hexagons for a "cloud/infra" feel.
    for _ in range(3):
        hx, hy, hr = rnd.uniform(W * 0.62, W * 0.92), rnd.uniform(H * 0.15, H * 0.85), rnd.uniform(30, 60) * s
        pts = [(hx + hr * math.cos(math.pi / 3 * k), hy + hr * math.sin(math.pi / 3 * k)) for k in range(6)]
        md.polygon(pts, outline=acc + (150,), width=max(1, int(3 * s)))
    img = Image.alpha_composite(img, motif)

    d = ImageDraw.Draw(img)
    left, max_w = int(70 * s), int(W * 0.56)

    # Category chip.
    label = " / ".join(a.categories.split(",")) if a.categories else a.category
    f_chip = font(FONT_BOLD, int(22 * s))
    cw = d.textlength(label.upper(), font=f_chip)
    y = int(70 * s)
    d.rounded_rectangle((left, y, int(left + cw + 36 * s), int(y + 44 * s)), radius=int(22 * s), fill=acc + (255,))
    d.text((left + 18 * s, y + 22 * s), label.upper(), font=f_chip, fill=top, anchor="lm")
    y += int(80 * s)

    # Title: shrink until it fits in 4 lines.
    for size in range(76, 34, -4):
        f_title = font(FONT_BOLD, int(size * s))
        lines = wrap(d, a.title, f_title, max_w)
        if len(lines) <= 4:
            break
    lh = int(f_title.size * 1.18)
    for ln in lines:
        d.text((left, y), ln, font=f_title, fill=(255, 255, 255))
        y += lh
    y += int(18 * s)
    d.rectangle((left, y, left + 90 * s, y + 6 * s), fill=acc)
    y += int(30 * s)

    if a.subtitle:
        f_sub = font(FONT_REG, int(28 * s))
        for ln in wrap(d, a.subtitle, f_sub, max_w)[:2]:
            d.text((left, y), ln, font=f_sub, fill=(203, 213, 225))
            y += int(f_sub.size * 1.35)

    # Tag pills + site name along the bottom.
    f_tag = font(FONT_REG, int(22 * s))
    tx, ty = left, H - int(80 * s)
    for tag in [t.strip() for t in a.tags.split(",") if t.strip()][:4]:
        tw = d.textlength(tag, font=f_tag)
        if tx + tw + 32 * s > left + max_w:
            break
        d.rounded_rectangle((int(tx), int(ty), int(tx + tw + 32 * s), int(ty + 40 * s)), radius=int(20 * s),
                            outline=acc, width=max(1, int(2 * s)))
        d.text((tx + 16 * s, ty + 20 * s), tag, font=f_tag, fill=(226, 232, 240), anchor="lm")
        tx += tw + 48 * s
    f_site = font(FONT_BOLD, int(22 * s))
    d.text((W - int(40 * s), H - int(40 * s)), "cloudutsuk.com", font=f_site, fill=(226, 232, 240), anchor="rs")

    out = img.convert("RGB")
    kw = {"quality": 85} if a.out.lower().endswith((".webp", ".jpg", ".jpeg")) else {"optimize": True}
    out.save(a.out, **kw)
    print(f"wrote {a.out} ({W}x{H})")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--measure", help="print WIDTHxHEIGHT of an existing image and exit")
    p.add_argument("--title")
    p.add_argument("--subtitle", default="")
    p.add_argument("--category", default="", help="top-level category, picks the colour palette")
    p.add_argument("--categories", default="", help="comma list shown in the chip, e.g. devops,terraform")
    p.add_argument("--tags", default="")
    p.add_argument("--size", default="1200x675")
    p.add_argument("--out")
    a = p.parse_args()
    if a.measure:
        w, h = Image.open(a.measure).size
        print(f"{w}x{h}")
        return
    if not (a.title and a.out):
        p.error("--title and --out are required")
    render(a)


if __name__ == "__main__":
    sys.exit(main())
