#!/usr/bin/env python3
"""Print the image-relevant context of a Cloudutsuk post as JSON.

Usage:
    python3 post_context.py _posts/devops/orchestration/terraform/2024-05-01-terraform-state.md
    python3 post_context.py terraform-state            # slug
    python3 post_context.py "remote state"             # title fragment (must be unique)
    python3 post_context.py <post> --ext png           # target extension (default webp)
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))
from cloudutsuk import post_context  # noqa: E402

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("post", help="post path, slug, or unique title fragment")
ap.add_argument("--ext", default="webp", choices=["webp", "png", "jpg"])
a = ap.parse_args()
print(json.dumps(post_context(a.post, a.ext), indent=2, ensure_ascii=False))
