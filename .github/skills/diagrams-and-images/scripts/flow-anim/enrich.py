#!/usr/bin/env python3
"""Add icons to the boxes of flow-animation data files.

For every box, terminal or cylinder node without an `icon`, pick one from its label and `sub`:
  1. a real tool logo from assets/img/icons/ (the blog's library, matched like the hero images do:
     file stems plus the ALIASES in common/lib/blog.py; generic glyphs skipped);
  2. otherwise a built-in line icon by keyword (KEYWORDS below; names must exist in the engine).
An icon is only added when the label and sub still fit beside it (same widths as validate.py).
The node's flow mapping (`{id: X, ...}`, on one line or several) is edited in place, so comments and
layout are kept. When the label is too wide for an icon beside it, the icon goes on the box's top-left
corner as a chip (`icon_pos: corner`), which takes no text width.

  python3 enrich.py <file.yml|dir> [...]           # dry run: show what would change
  python3 enrich.py <file.yml|dir> [...] --write   # apply
  python3 enrich.py --find kafka                   # list logos / built-in icons for a word
"""
import argparse
import re
import sys
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parents[1] / "common" / "lib"))
import validate as V  # noqa: E402

try:
    import blog as C  # noqa: E402
except Exception:  # Pillow missing etc.: logos are optional
    C = None

# First match wins; patterns run on the lower-cased "label sub" text.
KEYWORDS = [
    (r"\busers\b|\bcustomers\b|\bteam\b|\bemployees\b|\bvisitors\b", "users"),
    (r"\buser\b|\bclient\b|\bcustomer\b|\bemployee\b|\bcaller\b|\bperson\b|\bapprover\b|\bmanager\b", "user"),
    (r"\bbrowser\b|\bweb app\b|\bfrontend\b|\bfront end\b|\bspa\b|\bweb ui\b", "browser"),
    (r"\bmobile\b|\bphone\b|\bios\b|\bandroid\b|\bapp store\b|\btestflight\b|\bgoogle play\b", "phone"),
    (r"\blaptop\b|\bdeveloper\b|\bworkstation\b|\bdesktop\b|\bengineer\b", "laptop"),
    (r"\bfirewall\b|\bwaf\b|\bnsg\b", "firewall"),
    (r"load balanc|\blb\b|\bingress\b|\bgateway\b|\bproxy\b|front door|\balb\b|\bnlb\b|\bagfc\b", "balancer"),
    (r"\bdns\b|\binternet\b|\bcdn\b|\bedge\b", "globe"),
    (r"\bvnet\b|\bvpc\b|\bsubnet\b|\bnetwork\b|private endpoint|private link|\bpeering\b|\bnat\b|\bvpn\b|\brouter\b", "router"),
    (r"\bfail|\breject|\berror\b|\bdenied\b|\bblocked\b|\babort", "cross"),
    (r"\bscan|\bsast\b|\bsca\b|security|vulnerab|\baudit\b|\bguard\b|defender|threat|\bphi\b|\bgitleaks\b|\bsnyk\b|\btrivy\b|\bgrype\b", "shield"),
    (r"\bdeps\b|dependenc|\binstall\b|\brestore\b|\bfetch\b|\bcrates\b|\bsync\b|\bconan\b|\bpkg-config\b", "package"),
    (r"\bcache\b|\bredis\b|\bmemcached\b", "bolt"),
    (r"\bqueue\b|\btopic\b|\bkafka\b|\brabbit|\bbroker\b|\bservice bus\b|event hub|\bsqs\b|\bsns\b|pub/sub|\bmqtt\b|\bamqp\b|\bexchange\b|\boutbox\b", "queue"),
    (r"database|\bdb\b|\bsql\b|postgres|mysql|mongo|cosmos|dynamo|\bledger\b|\bwarehouse\b|\btable\b", "database"),
    (r"\bbucket\b|\bblob\b|\bstorage\b|\bs3\b|object store|registry|\brepo\b|repository|crates\.io|pypi|rubygems|npm registry|nuget|\bfeed\b|\bindex\b", "bucket"),
    (r"\bsecret|key vault|\bkms\b|\btoken\b|\bcredential|\bkeystore\b|upload key", "key"),
    (r"\btls\b|\bcert|\bmtls\b|\bhandshake\b|\bsign\b|signing|\bcosign\b", "cert"),
    (r"\bauth|\bidentity\b|\blogin\b|\boauth|\boidc\b|\bsso\b|\biam\b|\brbac\b|permission|\bpolicy\b|\bentra\b", "lock"),
    (r"\balert|\bnotif|\bpager|\bincident\b|\bon-call\b|\bescalat", "bell"),
    (r"monitor|metric|dashboard|grafana|prometheus|observab|\btrace|telemetry|\blogs?\b|\bcollector\b|\botel\b|\blgtm\b|\bkpi\b|\breport\b", "chart"),
    (r"\bemail\b|\bmail\b|\bsmtp\b", "mail"),
    (r"\bchat\b|\bmessage\b|\bslack\b|\bteams\b|\bwebhook\b|\bwebsocket\b|\bsse\b", "message"),
    (r"\bupload|\bdownload\b|\breceipt\b", "file"),
    (r"\bsearch\b|\blookup\b|\bquery\b", "search"),
    (r"\bschedule|\bcron\b|\btimer\b|\bwait\b|\binterval\b|\bretry\b|\btimeout\b|\bcutover\b|\bdeadline\b", "clock"),
    (r"\btest|\bverify\b|\bcheck\b|\bvalidat|\bapprov|\bgate\b|\breview\b|\bqa\b|\bpass\b|\bcoverage\b", "check"),
    (r"\bkubernetes\b|\bcluster\b|\baks\b|\beks\b|\bgke\b|\bk3d\b|\bk8s\b|node pool|\bnamespace\b", "cluster"),
    (r"\bcontainer|\bdocker\b|\bimage\b|\bpod\b|\bjib\b|\bko\b", "container"),
    (r"\bfunction\b|\blambda\b|serverless|\bjob\b|\bworker\b|\bbatch\b|\bpayroll\b", "function"),
    (r"\bdeploy|\bship\b|go-live|\brollout\b|\blaunch\b|\bpromot|\bpublish|\brelease\b", "rocket"),
    (r"\bgit\b|\bcommit\b|\bbranch\b|pull request|\bpr\b|\bmerge\b|\bsource\b|\bgithub\b|\bgitlab\b", "git"),
    (r"\bpackage\b|\bartifact\b|\bpack\b|\bwheel\b|\bjar\b|\bsbom\b|\bbundle\b|\barchive\b|\btarball\b|\bdistcheck\b|\bgem\b|\bcrate\b", "package"),
    (r"\blint|\bformat\b|\bcode\b|\bcompile\b|\bbytecode\b|\bparse\b|\bsyntax\b|\btype check|\bstatic analysis\b|\bclippy\b", "code"),
    (r"\bbuild\b|\bconfigure\b|\bresolve\b|\bmake\b|\bcmake\b|\bsetup\b", "gear"),
    (r"\bapi\b|\bendpoint\b|\brest\b|\bgrpc\b|\bgraphql\b|\bsoap\b", "api"),
    (r"\bcloud\b|\bazure\b|\baws\b|\bgcp\b|\bsaas\b", "cloud"),
    (r"\bvm\b|\bhost\b|\bmachine\b|\binstance\b|\bcompute\b|\bcpu\b|\bnode\b", "cpu"),
    (r"\bterminal\b|\bcli\b|\bshell\b|\bscript\b|\bcommand\b|\bprompt\b", "terminal"),
    (r"\bservice\b|\bbackend\b|\bserver\b|\bapp\b|\bapplication\b|\bmicroservice\b|\bagent\b|\bllm\b|\bmodel\b|\bworker\b", "server"),
    (r"\bfile\b|\bdocument\b|\bcsv\b|\bpdf\b|\bmanifest\b|\bconfig\b|\byaml\b|\bpyproject|\bgemfile|\bpom\.xml\b|\bcargo\.toml\b|\bpackage\.json\b|\.lock\b", "file"),
]


# Provider-wide logos are too vague for a single box ("Azure SQL" is not "Azure").
BROAD_LOGOS = {"azure", "microsoftazure", "amazonwebservices", "aws", "googlecloudplatform", "gcp", "cloud"}
# Library logos named after ordinary words ("billing queue", "static files") or a different vendor's
# generic concept ("private link", "API gateway", "load balancer"): never matched from a label.
WORD_LOGOS = {"billing", "batch", "files", "policy", "migrate", "workflows", "cli", "transform", "trace",
              "monitor", "automation", "budgets", "reservations", "advisor", "firewall", "loadbalancer",
              "waf", "pubsub", "privatelink", "apigateway", "shield", "lambda", "functions", "organizations",
              "dataflow", "glue", "lex", "pod" , "nodepool", "dns", "s3", "files", "eventarc", "iam", "rbac"}


def library_icon(text):
    """Best specific logo in assets/img/icons for the words in text, as a path relative to that folder."""
    if C is None:
        return None
    words = re.findall(r"[A-Za-z0-9+#.]+", text)
    tokens = words + [a + b for a, b in zip(words, words[1:])]
    for tok in tokens:
        key = C._lookup(tok)
        if key and key not in C.GENERIC_ICONS and key not in BROAD_LOGOS and key not in WORD_LOGOS:
            return str(C.icon_index()[key].relative_to(C.ICONS))
    return None


def builtin_icon(text):
    low = text.lower()
    for pat, icon in KEYWORDS:
        if re.search(pat, low) and icon in V.ICONS:
            return icon
    return None


def fits(n, w):
    strip = V.ICON_STRIP + 12
    lines = str(n.get("label", "")).split("\n")
    subs = str(n["sub"]).split("\n") if n.get("sub") else []
    return (max(len(l) for l in lines) * V.CHAR_W <= w - 16 - strip
            and all(len(s) * V.SUB_W <= w - 14 - strip for s in subs))


def mapping_span(text, nid):
    """(start, end) of the flow mapping `{ id: nid, ... }`, end = index of its closing brace."""
    m = re.search(r"\{\s*id:\s*[\"']?" + re.escape(str(nid)) + r"[\"']?\s*,", text)
    if not m:
        return None
    i, quote = m.start() + 1, None
    while i < len(text):
        ch = text[i]
        if quote:
            if ch == "\\":
                i += 1
            elif ch == quote:
                quote = None
        elif ch in "\"'":
            quote = ch
        elif ch == "}":
            return m.start(), i
        i += 1
    return None


def enrich(path, write):
    data = yaml.safe_load(path.read_text())
    grid = data.get("grid") or {}
    text = path.read_text()
    added, skipped = [], []
    for raw in data.get("nodes", []):
        if raw.get("icon") or raw.get("shape") not in (None, "box", "terminal", "cylinder"):
            continue
        hay = f"{raw.get('label', '')} {raw.get('sub', '')}".replace("\n", " ")
        icon = library_icon(hay) or builtin_icon(hay)
        if not icon:
            continue
        w = raw.get("w", grid.get("w", 150))
        corner = not fits(raw, w)
        span = mapping_span(text, raw["id"])
        if not span:
            skipped.append((raw["id"], icon + " (node mapping not found)"))
            continue
        val = f'"{icon}"' if "/" in icon or "." in icon else icon
        extra = f", icon: {val}" + (", icon_pos: corner" if corner else "")
        end = span[1]
        # keep the brace's own spacing: "...h: 56 }" -> "...h: 56, icon: x }"
        j = end
        while j > span[0] and text[j - 1] in " \t\n":
            j -= 1
        if text[j - 1] == ",":  # trailing-comma style ("h: 56,\n }"): keep it trailing
            extra = extra[1:] + ","
        text = text[:j] + extra + text[j:]
        added.append((raw["id"], icon + (" @corner" if corner else "")))
    if write and added:
        path.write_text(text)
    return added, skipped


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("paths", nargs="*")
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--find", help="show the logo and built-in icon a word would get")
    a = ap.parse_args()
    if a.find:
        print(f"logo:     {library_icon(a.find)}")
        print(f"built-in: {builtin_icon(a.find)}")
        if C:
            hits = [str(p.relative_to(C.ICONS)) for k, p in C.icon_index().items() if C.norm(a.find) in k]
            print("library matches:", ", ".join(sorted(hits)) or "none")
        print("all built-in:", ", ".join(sorted(V.ICONS)))
        return
    files = []
    for p in map(Path, a.paths):
        files += sorted(p.rglob("*.yml")) if p.is_dir() else [p]
    total = 0
    for f in files:
        added, skipped = enrich(f, a.write)
        total += len(added)
        if added or skipped:
            print(f"{f}: +{len(added)} " + " ".join(f"{i}={ic}" for i, ic in added)
                  + (f"   | no room: {' '.join(f'{i}({ic})' for i, ic in skipped)}" if skipped else ""))
    print(f"{'added' if a.write else 'would add'} {total} icon(s) in {len(files)} file(s)")


if __name__ == "__main__":
    main()
