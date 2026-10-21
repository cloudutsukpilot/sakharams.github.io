"""
blog.py - blog-awareness for the hero image and diagram workflows.

Knows how the Jekyll/Chirpy repo is laid out, so every image skill can:
  * resolve a post (path, slug or title fragment) and read its front matter,
  * derive the content signals an image should express (title, category path,
    tags, headings, excerpt),
  * pick the house palette for the post's top-level category (brand.json),
  * find matching tool icons in assets/img/icons/ and rasterize them,
  * compute the conventional hero-image location (assets/img/<post folders>/<slug>.<ext>),
  * update the post's `image:` front matter without disturbing anything else.

Pure stdlib + PyYAML + Pillow. cairosvg is optional (needed only for SVG icons).
"""
from __future__ import annotations

import io
import json
import re
from functools import lru_cache
from pathlib import Path

import yaml
from PIL import Image

COMMON_DIR = Path(__file__).resolve().parent.parent
BRAND_FILE = COMMON_DIR / "brand.json"
Loader = getattr(yaml, "CSafeLoader", yaml.SafeLoader)


# --------------------------------------------------------------------------- repo
def find_repo_root(start: Path | None = None) -> Path:
    """Walk up from `start` (or this file, then cwd) to the Jekyll root."""
    candidates = [start] if start else [Path(__file__).resolve(), Path.cwd()]
    for c in candidates:
        for p in [c, *c.parents]:
            if (p / "_config.yml").is_file() and (p / "_posts").is_dir():
                return p
    raise SystemExit("Could not find the Jekyll repo root (_config.yml + _posts/).")


ROOT = find_repo_root()
POSTS = ROOT / "_posts"
ICONS = ROOT / "assets" / "img" / "icons"


def hexrgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


@lru_cache(maxsize=1)
def site_config() -> dict:
    """The Jekyll _config.yml (title, url), used to fill brand names left empty in brand.json."""
    f = ROOT / "_config.yml"
    try:
        return yaml.load(f.read_text(), Loader=Loader) or {}
    except (OSError, yaml.YAMLError):
        return {}


@lru_cache(maxsize=1)
def brand() -> dict:
    """brand.json, with an empty site.name taken from _config.yml `url` (host) and an empty
    default.label from `title`, so the same kit works on any Jekyll site."""
    b = json.loads(BRAND_FILE.read_text())
    cfg = site_config()
    if not b["site"].get("name"):
        url = str(cfg.get("url") or "")
        b["site"]["name"] = url.split("://", 1)[-1].strip("/") or str(cfg.get("title") or "")
    if not b["default"].get("label"):
        b["default"]["label"] = str(cfg.get("title") or b["site"]["name"].split(".")[0].title())
    return b


def palette_for(category: str) -> dict:
    """Brand entry for a top-level category, colors converted to RGB tuples."""
    b = brand()
    entry = dict(b["default"])
    entry.update(b["categories"].get(category, {}))
    out = dict(entry)
    for k in ("accent", "accent2"):
        out[k] = hexrgb(entry[k])
    for k in ("ink", "text", "muted"):
        out[k] = hexrgb(b["site"][k])
    out["accent_hex"], out["accent2_hex"] = entry["accent"], entry["accent2"]
    out["site"] = b["site"]["name"]
    return out


# --------------------------------------------------------------------------- posts
def split_front_matter(text: str) -> tuple[str, str]:
    """Return (front_matter_text, body). Front matter excludes the --- fences."""
    if not text.startswith("---"):
        return "", text
    end = text.find("\n---", 3)
    if end == -1:
        return "", text
    fm = text[text.index("\n") + 1:end + 1]
    body = text[end + 4:].lstrip("\n")
    return fm, body


def read_front_matter(path: Path) -> dict:
    fm, _ = split_front_matter(path.read_text(encoding="utf-8", errors="replace"))
    try:
        data = yaml.load(fm, Loader=Loader) or {}
        return data if isinstance(data, dict) else {}
    except yaml.YAMLError:
        return {}


def image_path_of(fm: dict) -> str | None:
    img = fm.get("image")
    if isinstance(img, dict):
        img = img.get("path")
    return str(img).strip() if img else None


def all_posts() -> list[Path]:
    return sorted(p for p in POSTS.rglob("*.md")
                  if "templates" not in p.relative_to(POSTS).parts[:1])


@lru_cache(maxsize=1)
def image_usage() -> dict[str, int]:
    """How many posts reference each image path. >1 means a shared/generic banner."""
    counts: dict[str, int] = {}
    for p in all_posts():
        ip = image_path_of(read_front_matter(p))
        if ip:
            ip = "/" + ip.lstrip("/")
            counts[ip] = counts.get(ip, 0) + 1
    return counts


def resolve_post(query: str) -> Path:
    """Accept a path, a slug, or a title fragment; return the single matching post."""
    p = Path(query)
    for cand in (p, ROOT / p):
        if cand.is_file():
            return cand.resolve()
    q = query.lower().strip()
    slug_hits = [x for x in all_posts() if slug_of(x) == q or x.stem == q]
    if len(slug_hits) == 1:
        return slug_hits[0]
    hits = [x for x in all_posts()
            if q in x.stem.lower() or q in str(read_front_matter(x).get("title", "")).lower()]
    if len(hits) == 1:
        return hits[0]
    if not hits:
        raise SystemExit(f"No post matches {query!r}.")
    listing = "\n".join(f"  {h.relative_to(ROOT)}" for h in hits[:25])
    raise SystemExit(f"{len(hits)} posts match {query!r} - pass the path instead:\n{listing}")


def slug_of(path: Path) -> str:
    return re.sub(r"^\d{4}-\d{2}-\d{2}-", "", path.stem)


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(s).lower())


# --------------------------------------------------------------------------- icons
# icon key aliases: what the post/tag/folder may say -> icon key (normalized file stem)
ALIASES = {
    "kubernetes": "kuberentes", "k8s": "kuberentes", "kubectl": "kuberentes", "cka": "kuberentes",
    "ansible": "redhatansible",
    "entraid": "azuread", "azureentraid": "azuread", "azureactivedirectory": "azuread", "aad": "azuread",
    "aws": "amazonwebservices", "amazon": "amazonwebservices",
    "gcp": "googlecloudplatform", "googlecloud": "googlecloudplatform",
    "microsoftazure": "azure",
    "arm": "azureresourcemanager", "armtemplates": "azureresourcemanager", "bicep": "azureresourcemanager",
    "cloudformation": "awscloudformation",
    "postgres": "postgresql", "sqlserver": "mssql",
    "linux": "linuxos", "ubuntu": "ubuntuos", "debian": "debianos",
    "zap": "owaspzap", "githubaction": "githubactions",
    "vm": "virtualmachine", "virtualmachines": "virtualmachine",
    "functionapp": "functionapps", "azurefunctions": "functionapps", "appservice": "appservices",
    "acr": "containerregistry", "vnet": "virtualnetwork", "loganalytics": "loganalyticsworkspace",
    "hyperv": "hyperv", "vsphere": "vmware", "esxi": "vmware",
}
# broad category glyphs: only used when nothing specific matched
GENERIC_ICONS = {"cloud", "devops", "databases", "iam", "operatingsystem", "monitoring",
                 "orchestration", "configurationmanagement", "virtualization", "coding",
                 "folder", "user", "diagrams", "server", "sso"}


@lru_cache(maxsize=1)
def icon_index() -> dict[str, Path]:
    idx: dict[str, Path] = {}
    if not ICONS.is_dir():
        return idx
    for f in sorted(ICONS.rglob("*")):
        if f.suffix.lower() not in {".svg", ".png", ".jpg", ".jpeg", ".webp"}:
            continue
        key = norm(re.sub(r"-18$", "", f.stem))
        # prefer the "-18" brand icons (first seen wins, so keep shortest path)
        if key not in idx or len(str(f)) < len(str(idx[key])):
            idx[key] = f
    return idx


def _lookup(token: str) -> str | None:
    idx = icon_index()
    t = norm(token)
    if not t:
        return None
    t = ALIASES.get(t, t)
    return t if t in idx else None


def match_icons(segments: list[str], tags: list[str], title: str) -> list[Path]:
    """Ranked icon matches: specific before generic; folder > tags > title."""
    words = re.findall(r"[A-Za-z0-9+#.]+", title)
    title_tokens = words + [a + b for a, b in zip(words, words[1:])]
    seen, specific, generic = set(), [], []
    for tok in [*reversed(segments), *tags, *title_tokens]:
        key = _lookup(tok)
        if key and key not in seen:
            seen.add(key)
            (generic if key in GENERIC_ICONS else specific).append(icon_index()[key])
    return specific + generic


def load_icon(path: Path, px: int) -> Image.Image:
    """Rasterize an icon (SVG via cairosvg, or bitmap) to an RGBA image ~px wide."""
    if path.suffix.lower() == ".svg":
        try:
            import cairosvg
        except ImportError as e:  # pragma: no cover
            raise RuntimeError("cairosvg not installed - run: "
                               "pip install --user --break-system-packages cairosvg") from e
        png = cairosvg.svg2png(url=str(path), output_width=px)
        img = Image.open(io.BytesIO(png)).convert("RGBA")
    else:
        img = Image.open(path).convert("RGBA")
    img.thumbnail((px, px), Image.LANCZOS)
    return img


def svg_available() -> bool:
    try:
        import cairosvg  # noqa: F401
        return True
    except Exception:
        return False


# --------------------------------------------------------------------------- context
def _headings(body: str, limit=12) -> list[str]:
    hs = re.findall(r"^#{2,3}\s+(.+?)\s*#*$", body, flags=re.M)
    return [re.sub(r"[`*_]", "", h).strip() for h in hs][:limit]


def _excerpt(body: str, n=700) -> str:
    body = re.sub(r"```.*?```", " ", body, flags=re.S)
    body = re.sub(r"\{%.*?%\}|\{:.*?\}|<[^>]+>|!\[[^\]]*\]\([^)]*\)", " ", body)
    body = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", body)
    body = re.sub(r"^#+.*$|^\s*[|>-].*$", " ", body, flags=re.M)
    return re.sub(r"\s+", " ", body).strip()[:n]


def as_list(v) -> list[str]:
    if v is None:
        return []
    if isinstance(v, str):
        return [s.strip() for s in v.split(",") if s.strip()]
    return [str(x) for x in v]


def post_context(query: str, ext: str = "webp") -> dict:
    path = resolve_post(query)
    text = path.read_text(encoding="utf-8", errors="replace")
    fm_text, body = split_front_matter(text)
    try:
        fm = yaml.load(fm_text, Loader=Loader) or {}
    except yaml.YAMLError:
        fm = {}
    rel = path.relative_to(POSTS)
    segments = list(rel.parts[:-1])
    category = segments[0] if segments else "default"
    slug = slug_of(path)
    title = str(fm.get("title") or slug.replace("-", " ").title())
    tags = as_list(fm.get("tags"))
    current = image_path_of(fm)
    current_norm = "/" + current.lstrip("/") if current else None
    shared_by = image_usage().get(current_norm, 0) if current_norm else 0
    target = Path("assets/img", *segments, f"{slug}.{ext}")
    icons = match_icons(segments, tags, title)
    pal = palette_for(category)
    kicker_parts = [pal["label"]] + ([segments[-1].replace("-", " ")] if len(segments) > 1 else [])
    return {
        "repo_root": str(ROOT),
        "post": str(path.relative_to(ROOT)),
        "slug": slug,
        "title": title,
        "description": fm.get("description"),
        "category": category,
        "segments": segments,
        "categories_fm": as_list(fm.get("categories")),
        "tags": tags,
        "headings": _headings(body),
        "excerpt": _excerpt(body),
        "current_image": current_norm,
        "current_image_shared_by": shared_by,
        "current_image_is_generic": bool(current_norm) and (shared_by > 1 or "/common/" in current_norm),
        "current_image_exists": bool(current_norm) and (ROOT / current_norm.lstrip("/")).is_file(),
        "target_image": str(target),
        "target_url": "/" + str(target),
        "kicker": " · ".join(k.upper() for k in kicker_parts),
        "icons": [str(i.relative_to(ROOT)) for i in icons],
        "svg_icons_supported": svg_available(),
        "palette": {"label": pal["label"], "accent": pal["accent_hex"], "accent2": pal["accent2_hex"],
                    "motif2d": pal["motif2d"], "scene": pal["scene"]},
        "alt_suggestion": f"{title} - {pal['label']} hero image",
    }


# --------------------------------------------------------------------------- front matter edit
def set_front_matter_image(post: Path, url: str, alt: str) -> tuple[str, str]:
    """Replace (or insert) the top-level `image:` block. Returns (old_text, new_text).

    Handles both shapes used in this repo:
        image: /assets/img/x.png            (string form)
        image:\n  path: ...\n  alt: ...     (mapping form)
    and always writes the mapping form. Every other line is preserved byte-for-byte.
    """
    text = post.read_text(encoding="utf-8")
    if not text.startswith("---"):
        raise SystemExit(f"{post} has no front matter.")
    lines = text.split("\n")
    close = next(i for i in range(1, len(lines)) if lines[i].rstrip() == "---")
    alt_q = '"' + alt.replace("\\", "\\\\").replace('"', '\\"') + '"'
    block = ["image:", f"  path: {url}", f"  alt: {alt_q}"]
    start = next((i for i in range(1, close) if re.match(r"^image\s*:", lines[i])), None)
    if start is None:
        new = lines[:close] + block + lines[close:]
    else:
        end = start + 1
        while end < close and lines[end].startswith((" ", "\t")):
            end += 1
        new = lines[:start] + block + lines[end:]
    new_text = "\n".join(new)
    return text, new_text


def apply_hero(ctx: dict, image: str, alt: str, force: bool = False, dry_run: bool = False) -> str:
    """Validate and write the `image:` block for ctx's post. Returns a unified diff.

    Rules: the file must exist; it must sit under /assets/img/<category>/; a post-specific
    image (used only by this post) is kept unless force=True. Shared/generic banners
    (2+ posts, or /assets/img/common/) are replaced freely.
    """
    import difflib
    url = "/" + image.lstrip("/")
    if not (ROOT / url.lstrip("/")).is_file():
        raise SystemExit(f"Refusing: {url} does not exist on disk.")
    if not url.startswith(f"/assets/img/{ctx['category']}/"):
        raise SystemExit(f"Refusing: {url} is outside /assets/img/{ctx['category']}/ (post category).")
    cur = ctx["current_image"]
    if (cur and cur != url and ctx["current_image_exists"]
            and not ctx["current_image_is_generic"] and not force):
        raise SystemExit(f"Refusing: post already has its own image {cur}. Use --force to replace it.")
    post = ROOT / ctx["post"]
    old, new = set_front_matter_image(post, url, alt)
    diff = "".join(difflib.unified_diff(old.splitlines(True), new.splitlines(True),
                                        fromfile=ctx["post"], tofile=ctx["post"], n=1))
    if not dry_run and old != new:
        post.write_text(new, encoding="utf-8")
    return diff or "(front matter already up to date)"
