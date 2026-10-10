#!/usr/bin/env python3
"""Point a post's `image:` front matter at a hero image (path + alt). Never commits.

Usage:
    python3 set_hero_image.py <post> /assets/img/devops/x/slug.webp --alt "Alt text"
    python3 set_hero_image.py <post> <image> --alt "..." --dry-run    # show diff only
    python3 set_hero_image.py <post> <image> --alt "..." --force      # replace a post-specific image

Safety rules:
  * the image file must already exist on disk (htmlproofer fails the deploy otherwise);
  * the image must live under /assets/img/<post's top-level category>/ (repo convention);
  * a post-specific image (used by only this post) is kept unless --force is given;
    shared/generic banners (used by 2+ posts, or under /assets/img/common/) are replaced freely.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))
from cloudutsuk import apply_hero, post_context  # noqa: E402

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("post")
ap.add_argument("image", help="repo-relative or site-absolute path, e.g. /assets/img/cloud/x.webp")
ap.add_argument("--alt", required=True)
ap.add_argument("--dry-run", action="store_true")
ap.add_argument("--force", action="store_true")
a = ap.parse_args()

ctx = post_context(a.post)
print(apply_hero(ctx, a.image, a.alt, force=a.force, dry_run=a.dry_run))
if not a.dry_run:
    print(f"Updated {ctx['post']}")
