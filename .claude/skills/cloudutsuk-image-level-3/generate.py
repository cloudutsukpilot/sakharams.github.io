#!/usr/bin/env python3
"""Generate a background image with Cloudflare Workers AI (flux-1-schnell).

Reads CF_ACCOUNT_ID and CF_API_TOKEN from the environment or from the nearest .env
(walking up from the current directory). No python-dotenv needed.

Usage:
    python3 generate.py "<optimized prompt>" -o /tmp/bg.jpg [--steps 6] [--seed 42]

The output is Flux's native 1024x1024 JPG. Feed it to
cloudutsuk-image-common/hero.py --background to get the branded 1200x630 hero.
"""
import argparse
import base64
import os
import sys
from pathlib import Path

import requests

MODEL = "@cf/black-forest-labs/flux-1-schnell"


def load_env():
    for d in [Path.cwd(), *Path.cwd().parents]:
        f = d / ".env"
        if f.is_file():
            for line in f.read_text().splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
            return f
    return None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("prompt")
    ap.add_argument("-o", "--output", default="flux.jpg")
    ap.add_argument("--steps", type=int, default=6, help="1-8; flux-schnell is tuned for few steps (default 6)")
    ap.add_argument("--seed", type=int, help="fix the seed to make a result reproducible")
    a = ap.parse_args()

    load_env()
    acct, token = os.environ.get("CF_ACCOUNT_ID"), os.environ.get("CF_API_TOKEN")
    if not acct or not token:
        sys.exit("Missing CF_ACCOUNT_ID / CF_API_TOKEN - add them to the repo's .env (see .env.example).")

    body = {"prompt": a.prompt, "steps": max(1, min(8, a.steps))}
    if a.seed is not None:
        body["seed"] = a.seed
    resp = requests.post(f"https://api.cloudflare.com/client/v4/accounts/{acct}/ai/run/{MODEL}",
                         headers={"Authorization": f"Bearer {token}"}, json=body, timeout=120)
    try:
        data = resp.json()
    except ValueError:
        sys.exit(f"Cloudflare API error (HTTP {resp.status_code}): {resp.text[:300]}")
    img = (data.get("result") or {}).get("image")
    if not img:
        sys.exit(f"Cloudflare API error (HTTP {resp.status_code}): {data.get('errors') or data}")
    out = Path(a.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(base64.b64decode(img))
    print(f"Saved {out}  - steps={body['steps']} seed={a.seed}  prompt={a.prompt!r}")


if __name__ == "__main__":
    main()
