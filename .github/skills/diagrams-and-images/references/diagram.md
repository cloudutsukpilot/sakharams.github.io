# Explorable diagrams

Status and roadmap: [diagram-plan.md](diagram-plan.md). Engine: [assets/js/diagram.js](../../../../assets/js/diagram.js)
(model, levels, ELK layout, SVG, pan/zoom, panel, protocol cards, tour, geo),
[_includes/diagram.html](../../../../_includes/diagram.html), [_sass/diagram.scss](../../../../_sass/diagram.scss).
Reference diagram: [examples/explorable-web-shop.yml](examples/explorable-web-shop.yml) (3 levels,
2 views, 12 arrows, 2 use cases). For a large real one, open the biggest file under `_data/diagrams/`. Do not edit the engine for one
diagram. `SKILL=.github/skills/diagrams-and-images`, run from the repo root.

## Inputs

Works for **any system**: a cloud or homelab platform, a Kubernetes lab, an application's request
path, a data pipeline, a network, an identity flow, an ML serving stack. Run the
[intake](intake.md) first. It collects the facts below from whatever source the user gives (a post,
a repo, a design doc, a pasted description, or just a topic) and **asks the user** for what is
missing, instead of inventing it.

- **Source of truth:** the post, repo or document the diagram explains, or the user's answers. Never
  invent facts, ports or configuration.
- **Components** and where each one runs (for the tree), **connections** with protocol and port (for
  the arrows), cross-cutting concerns (for the views) and **use cases** (for the scenarios).
- Optional: the starting level, a second mode for a use case (such as "simulate an alert"), a geo
  backdrop.

**Where the file goes:** `_data/diagrams/<post folders>/<name>.yml`, mirroring `_posts/` like
`assets/img/`. The include id is that path without `.yml`. With no post, use the existing top-level
`_posts/` category that fits the topic (`_data/diagrams/cloud/<name>.yml`); never invent a category.

## Workflow

### 1. Model the system as a tree

Think C4: **level 0** is the system in its context (people, the system, external systems: about 3 to
9 components). Each level below opens one more layer: clusters or containers → areas → services →
components. Rules:

- Group by **where things run** first (edge, clusters, external SaaS), then by **purpose** (portal,
  RAG, model serving). A group with 2 to 7 children reads best. If a level would show more than about
  45 components, add an intermediate group.
- Every leaf has a `detail` (1 to 4 sentences of Markdown: what it does, what it owns, anything a
  reader would ask). Add `config` only when the post or the repo gives the real snippet; copy it
  exactly and say where it comes from in `title`.
- Groups can have `detail` too (shown with the ⓘ button on the open frame).
- `direction: down` on a group stacks its children top to bottom. Use it when a group would otherwise
  be a very wide row (for example a host with 6 or more clusters).

### 2. Connect the deepest components

Write each arrow between the **deepest** components that really talk to each other. When a group is
collapsed, the engine redraws the arrow to the group and merges parallel arrows (`HTTPS ×3`,
`2 links`), so one data set serves every level.

- **`why` on every arrow (required).** 1 or 2 short sentences, under about 220 characters, saying
  **when this path is used or why it exists**, from the reader's point of view: "Used right after a lab
  cluster is created: the runner registers it with Argo CD so GitOps can deploy to it." Start with the
  trigger (`Used when…`, `Every 6 hours…`, `Always on:`, `On a cache miss…`, `Planned:`), then the
  purpose. It is the first thing the hover card and the panel show (for a merged arrow, each
  connection's own reason). Facts only, from the post; the validator rejects an arrow without one.
- **Protocol and port** on every arrow between systems: `proto: PostgreSQL, port: 5432`. Use the
  post's values. Otherwise use the product's default port and say "default" in the tour caption.
  Defaults and kinds: [protocols-ports.md](protocols-ports.md).
- **TLS:** `HTTPS`, `WSS`, `AMQPS`, `MQTTS`, `LDAPS` and port 443 imply TLS. Set `tls: true` where
  the post says a hop is encrypted (for example "every cross-cluster call is HTTPS"). The hover card
  then shows the TLS 1.3 handshake.
- **Kind and colour** come from `proto`. Set `kind:` when there is no protocol or it is unusual:
  request, stream, event, data, telemetry or control.
- **Movement:** streams and telemetry get continuous moving dots automatically (`stream: true/false`
  overrides). WebSocket (`WS`/`WSS`) moves both ways (`both: true` for other duplex links).
- **Cards:** chosen from `proto`. `cards: [tcp, tls, http]` overrides; the names are tcp, tls, http,
  websocket, sse, grpc, kafka, amqp, mqtt, webhook, oauth, kerberos, stream and query.
- `label` is a short verb or note (`sync`, `every 6 h`). `detail` on an edge shows in its card and
  panel. Flow-map values that contain a comma must be quoted (`label: "metrics, logs, traces"`).

### 2b. Views (tabs) for cross-cutting connections

Logs to a collector, audit trails, metrics scrapes, secret fetches, DNS lookups and image pulls connect
almost everything to everything; drawn all the time they bury the main flows. Put them in **views**:
tabs at the top centre of the canvas (`Main flows`, one tab per view, then a built-in `Show all`). The
main view shows only the main request flows; a view tab reveals its hidden arrows, highlights them with
the components they touch, and dims the rest. `Show all` draws every view's arrows and components with
nothing dimmed (combine it with the deepest level button to see literally everything).

```yaml
views:
  - {id: observability, label: Observability, icon: chart}
  - {id: security, label: Security, icon: lock}
  - {id: networking, label: Networking, icon: router}
nodes:
  - {id: core-otel, label: OTel collector, icon: chart, views: [observability], detail: "…"}   # only shown in that view
edges:
  - {id: kc_logs, from: keycloak, to: core-otel, view: observability, kind: telemetry, why: "…"}
  - {id: access_kc, from: access, to: keycloak, view: security, main: true, why: "…"}     # main flow, also highlighted in Security
```

- **Which view:** telemetry (logs, metrics, traces, audit, alerts plumbing) → `observability`;
  identity, tokens, secrets, certificates, policy → `security`; DNS, tunnels, ingress, image pulls,
  network paths → `networking`. Add a view (for example `data`) only when it has at least 3 arrows
  that would otherwise clutter the main view. 2 to 5 views is the right range.
- **Delivery view.** When the system has a build and deploy path, add a `cicd` view (label `CI/CD`,
  icon `rocket`) that follows one change **from commit to running workload**: the developer's push to
  the repo, the CI runner picking up the job, secrets for the job, test and scan gates, the image
  build, the push to the registry, the GitOps/manifest commit, the deploy tool syncing, it applying to
  the target cluster, and the cluster pulling the image. Add any of those arrows that are missing
  (usually the push and the apply). Arrows already in the main view get `view: cicd` plus
  `main: true`; ones also in another view get a list (`view: [security, cicd]`). Its use case
  ("Code to cluster") walks the same path and ends at the running workload.
- `view:` on an edge (a name or a list) puts it in that view and **hides it from the main view**.
  Add `main: true` when it is also a main flow (it stays visible and is highlighted in the view).
- `views:` on a component shows it **only** in those views (a sidecar, a per-cluster collector, an
  ExternalDNS instance). Its arrows must be in one of the same views.
- **Always-on streams stay visible.** A continuous telemetry or data stream whose two ends are both
  main-view components (a cluster's collector → the gateway, gateway → Loki/Mimir/Tempo, app → its
  trace store) gets `main: true` as well as its view, so its moving dots run on the main diagram. Only
  streams that touch a view-only component (a per-cluster collector, an audit sink) are hidden from it.
- The main view should stay readable: keep it to the request flows the use cases tell, plus those
  streams. The validator warns when the main view has more than about 45 arrows.
- A use case step may use any view's arrows. While a use case runs `Show all` is selected: every
  view's components and arrows are on the canvas (nothing faded), and the reader's tab comes back after.

### 3. Use cases (scenarios)

Guided stories are **use cases**, chosen from what the post explains: signing in to the portal,
seeing cost, deploying something, monitoring, a chat request, an ingest job, the SRE agent handling an
alert, a release. The reader picks one from a row of buttons; Play runs it, and auto-play then moves
on to the next use case. After the last use case the player stops (`loop: true` at the top level starts
again from the first). While a use case runs, each step opens the groups its components sit in and
closes the open groups that neither it nor a later step uses, so the packet is easy to follow; when
the player finishes (or is rewound to the start) the diagram goes back to the level, open groups, view
tab and zoom the reader had. Clicking a level, a component or a view tab mid-way keeps the reader's
new layout instead. Rules:

- **One activity per use case.** Never mix two activities (for example "sign in" and "inventory
  sync") in one scenario. A 17-step tour of everything is the wrong shape; split it into use cases of
  3 to 10 steps.
- **One action per step.** Each step is one hop: a request, a write, a callback. Several arrows in
  one step are fine only when they happen at the same time from one sender or into one receiver
  (fan-out or fan-in). The validator rejects a step whose arrows share no component.
- **Show every path the packet takes, including the way back.** A request that gets a reply shows
  the reply travelling back: `path: [kc_db, ~kc_db]` sends the packet to core-db and back (a green
  return packet). `path` hops run one after another and must form one continuous route; `~id` runs
  an arrow backwards. A response that crosses several components returns hop by hop:
  `path: [~cf_bs, ~cf_tun, ~access_tun, ~u_cf]`. If an arrow is missing for a real hop (the request
  goes Access → Tunnel), add the arrow; never let a packet jump. Mark fire-and-forget arrows
  `oneway: true` (a commit, a Slack post, `make up`); the validator flags any other request whose
  response never comes back.
- **A banner line for every step:** `action`, under about 90 characters, saying what is happening
  right now ("Keycloak ↔ core-db: read your account and groups"). It shows at the bottom of the canvas.
- **End with the outcome:** the last step of each use case (and of each mode) has `result: success`,
  `done` or `fail` plus a short `outcome` ("Signed in to the portal"). The engine celebrates it at the
  last hop's target (`at: <id>` overrides): confetti, a ring and a check for success; a red cross and
  a shake for fail; the banner turns green or red with the outcome.
- Order steps as the data really flows (credentials before the call that needs them, the request
  before the reply).
- A use case can have two modes for an alternative path (`Cache miss` / `Simulate a cache hit`), with
  `when:` on the steps of one path.
- Every step has a `title` (2 to 5 words) and `text` (1 or 2 sentences, under about 200 characters)
  naming the protocol and port where it matters.

```yaml
scenarios:
  - id: login
    title: Sign in to the portal
    summary: "How a browser reaches the portal: two sign-ins, no open port at home."
    modes: [{id: normal, label: Normal}, {id: alt, label: "Simulate …"}]   # optional
    steps:
      - {title: You open the portal, action: "Browser opens portal.example.com", text: "…", lights: [you]}
      - {title: HTTPS to Cloudflare, action: "Browser → Cloudflare Access: GET / (443)", text: "…", edges: [u_cf]}
      - {title: Look up your account, action: "Keycloak ↔ core-db: read your account", text: "…", path: [kc_db, ~kc_db]}
      - {title: Portal page returns, action: "Backstage → … → browser: the portal page", text: "…",
         path: [~cf_bs, ~cf_tun, ~access_tun, ~u_cf], result: success, outcome: "Signed in to the portal"}
```

The use cases are listed in a sidebar on the left of the canvas (a scrolling row on phones).
Playback: Play / Pause; Next and Previous **animate** the step (packets travel its arrows, then its
targets light up); clicking a step dot does the same; each step opens the groups it needs and moves
the camera to them. A single legacy `tour:` still works as one use case.

### 4. Write, validate, embed

```bash
python3 $SKILL/scripts/diagram/validate.py _data/diagrams/<id>.yml
```

Fix every error and warning. Embed with `{% include diagram.html id="<id>" %}` on its own line with a
blank line before and after. When it replaces a flow-anim include of the same diagram, swap the line
(after the user has approved the conversion).

### 5. Check in a real browser

Other sessions rebuild `_site` at the same time, so build into a private folder:

```bash
SITE=/tmp/dgm-site && rm -rf $SITE && JEKYLL_ENV=production bundle exec jekyll b -d $SITE --disable-disk-cache
(cd $SITE && python3 -m http.server 4123 >/dev/null 2>&1 &)
eval "$(bash $SKILL/scripts/setup-browser.sh)"
CHROME=$CHROME node $SKILL/scripts/diagram/preview.cjs --work $WORK --url http://localhost:4123/<permalink> --id <id> --out /tmp/dgm-<name>
pkill -f "http.serve[r] 4123"
```

Checked: layout at every level with no overlapping components, expand on click, the protocol card on
hover, the detail panel, zoom, the start level (ignoring an old URL parameter), the tour, no script errors, no foreign styling and no
raw Markdown leaking, in light, dark and phone views. Open and look at at least `light-desktop-level1.png`, the
deepest level, `card.png`, `panel.png`, `tour.png` and `step-next.png`. Then run htmlproofer on the same folder.

### 6. Report

The data file and include line, the levels and what each shows, the tour, and the screenshots you
read. Never commit.

## Data format

| Key | Notes |
|---|---|
| `title`, `accent`, `accent2` | accent = slider, tour trail and focus; accent2 = the tour pointer |
| `level` | Level shown on every load (default 1; use 1 unless the post needs another). `levels: [names]` names the level buttons (Level 0 … deepest), one per level |
| `direction` | Root flow (default `right`); per group `direction: down` |
| `wrap`, `aspect` | `wrap: true` wraps a long single chain into rows (ELK MULTI_EDGE) |
| `min_zoom` | Opening zoom floor (default 0.62): large diagrams open at a readable zoom on their start |
| `nodes` | Tree: `{id, label, sub?, icon?, color?, tone?, detail?, config?, direction?, views?, children?}`. `views`: shown only in those view tabs. `id`: lowercase, digits, `-` and `_` (appears in URLs). `icon`: built-in name or a logo path under `assets/img/icons/` (`python3 $SKILL/scripts/flow-anim/enrich.py --find <word>` lists logos; see [icons.md](icons.md)). `config`: `{title, lang, code}` |
| `views` | Tabs for cross-cutting connections: `[{id, label, icon?}]`; the main view (`Main flows`) is always first and `Show all` (id `*`, built in) last; don't define a view with id `*` |
| `edges` | `{id, from, to, why, view?, main?, oneway?, proto?, port?, kind?, tls?, stream?, both?, cards?, label?, detail?, dashed?, tone?, when?}`. `why` (required): when the path is used or why it exists; `detail`: an extra technical note (auth, token lifetime) |
| `scenarios` | Use cases: `[{id, title, summary?, modes?, steps: [{title, action, text, edges?, path?, lights?, when?, clear?, result?, outcome?, at?}]}]`. `edges` run together, `path` hops one after another (`~id` = response travelling back). `loop: true` at the top level makes auto-play start again after the last use case (default: stop and restore the reader's layout) |
| `map` | Geo backdrop `{name: world, lon: [w, e], lat: [n, s], width, height}`; nodes use `lat`/`lon` |

Colours: explicit `color` (blue, sky, teal, green, lime, amber, orange, red, rose, pink, violet, indigo,
slate or `#RRGGBB`), else `tone`, else the icon's role, else one per top-level component.

## How it behaves (for writing good data)

- **Layout:** ELK `layered`, left to right. Each open group is laid out on its own (compact), and arrows
  that cross groups leave through ports on the group borders, so their routes also arrange the groups.
- **Level buttons:** the toolbar has one button per level (`Level 0`, `Level 1`, … with the level's name). Clicking one walks there a layer at a time, each layer opening or closing with its own animation; a new click cancels a walk in progress.
- **Opening view:** the whole diagram if it fits at a readable size, else a readable zoom on its start
  (drag to explore; ⤢ fits everything).
- **Interaction:** wheel zoom needs Ctrl/⌘ (or a trackpad pinch) so the page still scrolls; in
  fullscreen the wheel zooms directly. ⤢ asks the browser for real fullscreen (Esc leaves it) and
  falls back to a full-window overlay; either way the canvas takes all the height the player leaves. Hovering a component highlights its arrows. Keyboard: Tab to a
  component, Enter to open it; the arrow keys pan and + / − / 0 zoom.
- **Every load opens at the start level** (`level`, default 1 = one layer below the overview) on the
  main view. Nothing is kept in the URL; keep `level: 1` unless the post asks for another start.

## Changing the engine

Update `diagram.js`, `diagram.scss` and this file together. `validate.py` reads ICONS, PALETTE, KINDS,
PROTO_KIND and CARDS from `diagram.js`. Check a new property or class name is not already used (`this.view` is the canvas group; `.dgm-view` its class). Re-run `preview.cjs` for every diagram in use
(`grep -rl "diagram.html" _posts _tabs *.md`). Keep every class and id prefixed `dgm-`.
