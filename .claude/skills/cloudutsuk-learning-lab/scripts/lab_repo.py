#!/usr/bin/env python3
"""Create a lab repo from a template, and keep its EXPERIMENTS.md in sync with the blog card.

  new   Copy templates/<template>/ into the lab repo (default: the card's repo.path), filling the
        placeholders. Existing files are never overwritten (use --force to overwrite template files).
        `git init` is left to you. Prints a warning if a host port is already in use.
  sync  Write EXPERIMENTS.md in the lab repo from the card's experiments (what to do, what to
        predict, where to look, the verify target), so the repo and the posts never disagree.

Usage (from the blog repo root):
  python3 lab_repo.py new  --lab <slug> [--dest PATH] [--template k3d-platform] [--cluster NAME]
                           [--app NAME] [--app-ns NS] [--service NAME] [--site-port 8081]
                           [--api-port 6452] [--range 104] [--grafana-port 3002] [--dry-run] [--force]

Templates: k3d-platform (default, lab contract v2: joins the homelab platform, signals to mon; needs
--api-port and --range, a free pod/service pair from 10.100 up) and k3d-lgtm (v1: a self-contained
lab with its own Grafana stack, for labs meant to run anywhere; needs --grafana-port).
  python3 lab_repo.py sync --lab <slug> [--dest PATH]
"""
import argparse
import socket
import sys
from pathlib import Path

import yaml

ROOT = Path.cwd()
TEMPLATES = Path(__file__).resolve().parent.parent / "templates"
SITE = "https://cloudutsuk.com"


def load_card(slug):
    path = ROOT / "_data" / "labs" / f"{slug}.yml"
    if not path.exists():
        sys.exit(f"{path} not found: run scaffold.py card first (from the blog repo root)")
    return yaml.safe_load(path.read_text()) or {}


def dest_of(card, arg):
    raw = arg or (card.get("repo") or {}).get("path")
    if not raw or "TODO" in str(raw):
        sys.exit("No destination: pass --dest or set repo.path in the card")
    p = Path(str(raw)).expanduser()
    # A card's repo.path is relative to ~/gitrepos, as the lab runner reads it; --dest is relative to here.
    return (p if p.is_absolute() or arg else Path.home() / "gitrepos" / p).resolve()


def port_in_use(port):
    with socket.socket() as s:
        s.settimeout(0.3)
        return s.connect_ex(("127.0.0.1", int(port))) == 0


def cmd_new(args):
    card = load_card(args.lab)
    dest = dest_of(card, args.dest)
    src = TEMPLATES / args.template
    if not src.is_dir():
        sys.exit(f"unknown template {args.template!r}; have: {', '.join(p.name for p in TEMPLATES.iterdir())}")
    app = args.app or "app"
    v2 = args.template == "k3d-platform"
    if v2 and (args.range < 100 or args.range > 252 or args.range % 2):
        sys.exit("--range must be an even number from 100 to 252: pods 10.<range>, services 10.<range+1>")
    short = args.lab[: -len("-lab")] if args.lab.endswith("-lab") else args.lab
    default_cluster = (f"lab-{short}" if v2 else args.lab)[:20].strip("-")
    values = {
        "__SLUG__": args.lab,
        "__NAME__": card.get("name", args.lab),
        "__SUMMARY__": str(card.get("summary", "")).strip(),
        "__REPO__": dest.name,
        "__CLUSTER__": args.cluster or default_cluster,
        "__APP_NS__": args.app_ns,
        "__APP__": app,
        "__SERVICE__": args.service or f"{args.lab}-{app}",
        "__SITE_PORT__": str(args.site_port),
        "__GRAFANA_PORT__": str(args.grafana_port),
        "__API_PORT__": str(args.api_port),
        "__POD_OCTET__": str(args.range),
        "__SVC_OCTET__": str(args.range + 1),
        "__INDEX_URL__": f"{SITE}/tags/{args.lab}/",
    }
    written = kept = 0
    for f in sorted(p for p in src.rglob("*") if p.is_file()):
        rel = f.relative_to(src)
        for k in sorted(values, key=len, reverse=True):  # placeholders in file names too
            rel = Path(str(rel).replace(k, values[k]))
        out = dest / rel
        if out.exists() and not args.force:
            print(f"keep   {rel}")
            kept += 1
            continue
        text = f.read_text()
        # Longest keys first so __APP_NS__ is not eaten by __APP__.
        for k in sorted(values, key=len, reverse=True):
            text = text.replace(k, values[k])
        if args.dry_run:
            print(f"would  {rel}")
            continue
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(text)
        out.chmod(f.stat().st_mode)
        print(f"write  {rel}")
        written += 1
    ports = (("site", args.site_port), ("api", args.api_port)) if v2 else \
        (("site", args.site_port), ("grafana", args.grafana_port))
    for label, port in ports:
        if port_in_use(port):
            print(f"WARN   host port {port} ({label}) is in use now; another lab may own it. "
                  f"Pick a free one (--{label}-port) or stop the other cluster before `make up`.")
    print(f"\n{written} written, {kept} kept → {dest}")
    if v2:
        print("Next: write app/ (code + Dockerfile), adjust k8s/app/app.yaml and dashboards/*.json, add "
              "exp-*/verify-* targets, then `lab_repo.py sync`. In the card: deploy.ports "
              f"[{args.site_port}, {args.api_port}] and deploy.memory_gb; capture.urls app: "
              f"http://127.0.0.1:{args.site_port}, grafana: https://grafana.mon.home.cloudutsuk.com.")
    else:
        print("Next: write app/ (code + Dockerfile), adjust k8s/app/app.yaml, the collector config and "
              "dashboard.json, add exp-*/verify-* targets, then `lab_repo.py sync`. Set capture.urls in the "
              f"card to http://localhost:{args.site_port} and http://localhost:{args.grafana_port}.")


def md_inline(text):
    return " ".join(str(text or "").split())


def cmd_sync(args):
    card = load_card(args.lab)
    dest = dest_of(card, args.dest)
    if not dest.exists():
        sys.exit(f"{dest} does not exist (run `lab_repo.py new` first)")
    name = card.get("name", args.lab)
    lines = [
        f"# {name}: experiments",
        "",
        f"<!-- Generated from _data/labs/{args.lab}.yml in the blog repo by lab_repo.py sync. Don't edit by hand. -->",
        "",
        f"The full write-up, with real screenshots of each result: {SITE}/tags/{args.lab}/",
        "",
        "Each experiment is one action and the signal it should produce. Predict first, run it, wait the",
        "stated time (signals are batched, scraped and tailed, so they arrive late), then look.",
        "",
    ]
    for n, e in enumerate(card.get("experiments") or [], 1):
        action = e.get("action") or {}
        lines += [f"## {n}. {e.get('title', e.get('id'))}", "", md_inline(e.get("goal")), ""]
        lines += ["**Do this**", ""]
        if action.get("say"):
            lines += [md_inline(action["say"]), ""]
        if action.get("run"):
            lines += ["```sh", str(action["run"]).strip(), "```", ""]
        if e.get("predict"):
            lines += [f"**Predict:** {md_inline(e['predict'])}", ""]
        if e.get("wait"):
            lines += [f"**Wait:** about {e['wait']} seconds.", ""]
        look = e.get("look_for") or []
        if look:
            lines += ["**Look for**", "", "| Signal | Where | Query | Expect |", "|---|---|---|---|"]
            for l in look:
                q = str(l.get("query") or "").replace("|", "\\|")
                lines.append(f"| {l.get('signal')} | {md_inline(l.get('where'))} | {'`' + q + '`' if q else ''} | "
                             f"{md_inline(l.get('expect')).replace('|', chr(92) + '|')} |")
            lines.append("")
        if e.get("verify"):
            lines += [f"**Check it arrived:** `{e['verify']}`", ""]
    out = dest / "EXPERIMENTS.md"
    out.write_text("\n".join(lines).rstrip() + "\n")
    print(f"write  {out}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    n = sub.add_parser("new")
    n.add_argument("--lab", required=True)
    n.add_argument("--dest")
    n.add_argument("--template", default="k3d-platform")
    n.add_argument("--cluster")
    n.add_argument("--app")
    n.add_argument("--app-ns", default="lab")
    n.add_argument("--service")
    n.add_argument("--site-port", type=int, default=8081)
    n.add_argument("--grafana-port", type=int, default=3002)
    n.add_argument("--api-port", type=int, default=6452, help="k3d-platform: host port of the lab's Kubernetes API")
    n.add_argument("--range", type=int, default=104, help="k3d-platform: pods 10.<range>.0.0/16, services 10.<range+1>.0.0/16")
    n.add_argument("--dry-run", action="store_true")
    n.add_argument("--force", action="store_true")
    s = sub.add_parser("sync")
    s.add_argument("--lab", required=True)
    s.add_argument("--dest")
    args = ap.parse_args()
    cmd_new(args) if args.cmd == "new" else cmd_sync(args)


if __name__ == "__main__":
    main()
