---
name: cloudutsuk-flow-anim
description: >-
  Create an animated, step-through flow diagram for the Cloudutsuk blog (this Jekyll repo), in the
  algomaster.io style: a pointer travels the arrows lighting each block, with a caption per step and
  play/step/speed controls. Handles pipelines, request paths, fan-out/fan-in, pass/fail gates, loops,
  and "geo map" diagrams (regions, users or CDN edges pinned by lat/lon on a world map, joined by
  curved arcs with latency badges and streaming dots). Every box gets its own colour and, wherever one
  fits, an icon (built-in or a real tool logo); arrows between systems carry a protocol:port pill and are
  coloured by communication type (request, stream, event, data, telemetry, control). Writes the diagram as data in
  _data/flow_anims/<post folders>/<name>.yml, validates it, embeds it with
  {% include flow-anim.html id="<post folders>/<name>" %} and checks it in a real browser. Use when
  the user asks for an "animated diagram", "animation", "flow animation", an animated
  pipeline/flow/architecture, an animated Mermaid diagram, names this skill, or says "geo map",
  "world map", "global network", "latency map", "multi-region" or "regions on a map". For static
  hero images use the cloudutsuk-image-* skills.
---

# Cloudutsuk flow animation

A diagram is **data**, not code. Each one is a YAML file under `_data/flow_anims/` that the shared engine
renders: [assets/js/flow-anim.js](../../../assets/js/flow-anim.js) (player, SVG drawing, routing),
[_includes/flow-anim.html](../../../_includes/flow-anim.html) (markup, controls, no-JS fallback list) and
[_sass/flow-anim.scss](../../../_sass/flow-anim.scss) (theme-aware styles). Do not edit those for a single
diagram. Working reference: [_data/flow_anims/devops/build-tools/generic-build-pipeline.yml](../../../_data/flow_anims/devops/build-tools/generic-build-pipeline.yml)
(two lanes, fan-out/fan-in, gate with a fail mode). Loop reference:
[references/examples/gitops-reconcile-loop.yml](references/examples/gitops-reconcile-loop.yml). Systems
with protocols, ports, icons and communication colours:
[references/examples/request-path-ports.yml](references/examples/request-path-ports.yml).

`SKILL=.claude/skills/cloudutsuk-flow-anim`, `COMMON=.claude/skills/cloudutsuk-image-common`. Run
everything from the repo root. Below, `<id>` is the include id, i.e. `<post folders>/<name>`.

**Geo map (keyword "geo map").** When the user says "geo map", or the topic is about *where* things
are (latency between regions, multi-region failover, replication, CDN edges, data residency), build
the diagram on a world map: `map:`, `shape: site` nodes placed by `lat`/`lon`, curved edges. Follow
[Geo maps](#geo-maps) below on top of the normal workflow. Reference:
[references/examples/global-latency-map.yml](references/examples/global-latency-map.yml).

## Inputs

- **Topic** (required): what the diagram explains, e.g. "autoscaling", "OAuth authorization code flow",
  "Kubernetes pod scheduling". It may come with the stages the user wants.
- **Post** (optional): a path, slug or title fragment, or the file open in the editor. If given, the
  diagram is embedded there and the post's content is the source of truth.
- Optional: a `name` (default: kebab-case of the topic, such as `oauth-auth-code-flow`), a second run
  mode ("show the failure path", "show a cache miss"), or "replace the Mermaid diagram".

**Where the file goes** (same convention as hero images in `assets/img/`): the data file mirrors the
post's folders under `_posts/`, and the include `id` is that path without `.yml`:

| Post | Data file | Include id |
|---|---|---|
| `_posts/devops/build-tools/2026-10-01-language-build-ecosystem.md` | `_data/flow_anims/devops/build-tools/generic-build-pipeline.yml` | `devops/build-tools/generic-build-pipeline` |
| No post, topic in `iam` | `_data/flow_anims/iam/oauth-auth-code-flow.yml` | `iam/oauth-auth-code-flow` |

Without a post, use the top-level category folder that fits the topic (an existing `_posts/` folder;
never invent one). Folder and file names use only lowercase letters, digits and hyphens.

Ask only when the topic is too vague to pick the stages (for example "networking"). Otherwise design
it and let the user react to the result.

## Workflow

### 1. Gather context

- With a post: run `python3 $COMMON/post_context.py <post>` and take `palette.accent`/`palette.accent2`
  for `accent`/`accent2`. Read the section the diagram belongs to. If it has a Mermaid (or ASCII)
  diagram of the same flow, **that is the spec**: keep its nodes, edges and labels, and use the
  section's text or table for the captions.
- Topic only: use the category's colours from `$COMMON/brand.json` (`devops` is `#F97316`/`#8B5CF6`;
  `default` if unsure). Describe the flow the way the rest of the blog does: accurate and vendor-neutral
  unless the topic names a product. Never invent facts.
- Check `find _data/flow_anims -name '<name>.yml'` so the name is not already taken in that folder.

### 2. Write the story before the layout

List the steps first. Each step is one thing happening:

- **5 to 12 steps.** Step 1 lights the starting node only (`lights: [X]`, no edges).
- **`title`**: 2 to 5 words. **`text`**: one or two sentences, under about 200 characters. Answer "what
  happens and why it matters" (the build pipeline uses each stage's "what it answers" question).
- Parallel work is **one step with several edges** (the pointers move together and split).
- A join (a gate fed by three scans) is one step with all incoming edges. The node lights when the
  last one arrives.
- Alternatives (pass/fail, hit/miss, allow/deny) are **modes**: `modes: [{id: pass, label: "..."},
  {id: fail, label: "Simulate a failing gate"}]`, and the steps that belong to only one get
  `when: <mode id>`. The second mode's label is the checkbox text. At most two modes.
- Loops: a back-edge step (the pointer returns to an earlier node), then later steps may travel the
  same edges again. Add `clear: true` to a step to start a fresh iteration with all lights off.

### 3. Lay it out

Pick a pattern from [references/layout-recipes.md](references/layout-recipes.md) and follow its
coordinates. The rules:

- `viewbox: [1000, H]`, always 1000 wide. Choose H to fit (about 140 per row and 120 for a lane
  header, plus 30 margin). The article shows it at about 630 to 900 px; phones scroll sideways.
- Default node is 150 × 56 (`grid.w/h`). At most **6 nodes per row** (5 is easier to read), with gaps of 40 units or more. Never draw a long flow as one row: 10+ stages go in 3–4 lanes (recipe 8 in layout-recipes.md).
  Longer flows wrap into a second **lane** that continues left to right (see the build pipeline).
- Labels: 1 or 2 lines (`"Restore\ndependencies"`), about 16 characters per line at width 150. To name
  the tool on a block, use a one-line label plus `sub` (`label: "SAST", sub: "SpotBugs"`).
- Shapes: `box` (default), `terminal` (pill: start or end), `diamond` (decision), `cylinder` (database,
  repository, queue), `circle` (actor or event), `site` (a 52-unit disc with an `icon`, halo rings
  when lit and the label *under* it: a region, data centre, user or edge location; works without a
  map too). `tone: fail|ok|warn` colours a node or edge red, green or amber.
- Prefer `grid` + `col`/`row` and automatic routing. Use explicit `points` only for wrap connectors
  and buses.

### 3a. Colour, icons and protocols (always)

These three make a diagram readable at a glance; apply them to every diagram.

- **Every box has a colour.** The engine colours each box: explicit `color`, else a `tone`, else its
  icon's *role* colour, else one colour per column (so pipeline stages differ from each other). Set
  `color` when the meaning matters, by role: people/clients `blue`, edge/network `teal` (`sky` for
  cloud), compute/services `violet`, data/storage/queues `amber`, security/identity `rose`,
  observability `green`, messaging `pink`, external/third party `slate`, delivery `orange`. Names:
  blue, sky, teal, green, lime, amber, orange, red, rose, pink, violet, indigo, slate (or `#RRGGBB`).
  `colors: accent` at the top level turns this off (all boxes in the accent colour).
- **Every box gets an icon when one fits.** Run `python3 $SKILL/scripts/enrich.py <file> --write`
  after writing the YAML: it picks a real tool logo from `assets/img/icons/` (PostgreSQL, Grafana,
  Prometheus, Loki, Helm, Terraform, GitHub, Entra ID, AKS, Key Vault, …) or a built-in line icon by
  keyword, and places it left of the label, or as a chip on the top-left corner (`icon_pos: corner`)
  when the label needs the full width. Check its picks and override by hand where it guessed wrong
  (`python3 $SKILL/scripts/enrich.py --find <word>` lists candidates). Built-in icons: user, users,
  browser, phone, laptop, globe, router, balancer, firewall, cloud, server, cpu, cluster, container,
  function, api, database, bucket, queue, file, bolt (cache), lock, key, shield, cert, chart, bell,
  search, clock, check, cross, git, code, gear, terminal, package, rocket, mail, message. A logo is
  `icon: "<folder>/<file>.svg"` relative to `assets/img/icons/` (drawn on a light tile, so dark logos
  stay visible). Diamonds and circles take no icon.
- **Arrows between systems carry the protocol and port.** Whenever an arrow connects two systems
  (client to load balancer, service to database, app to broker, agent to collector), set
  `proto` and `port`: `{id: AP, from: API, to: PG, proto: PostgreSQL, port: 5432}` draws a
  `PostgreSQL :5432` pill on the line. Use the real values from the post (or
  [references/protocols-ports.md](references/protocols-ports.md) for well-known defaults, and say
  "default port" in the caption when the post does not pin it). Process arrows (pipeline stages,
  approvals) get no protocol. A pill needs a straight segment about its width + 20 long (the
  validator says how much); `proto_at: [x, y]` moves it. A plain `label` on the same arrow moves
  above the pill. The validator also flags pills cut off by the viewBox, pills on a lane label, and
  any other arrow running underneath a pill (it would look like that arrow's protocol). In a dense
  diagram where an arrow has no clear stretch for its pill, keep `kind:` (the colour still says what
  kind of traffic it is) and put the protocol and port in that step's caption instead.
- **Arrows are coloured by communication type** wherever they carry a protocol: request/response
  (HTTP, HTTPS, gRPC, GraphQL, SOAP) blue, streaming (WebSocket, SSE) teal, async event/message
  (Kafka, AMQP, MQTT, NATS, SQS, webhooks, SMTP) purple, data access (SQL, PostgreSQL, Redis, S3, NFS)
  amber, telemetry (OTLP, Prometheus scrape, syslog) lime, control/security (DNS, TLS, OAuth/OIDC,
  LDAP, SSH) pink. The kind is derived from `proto`; set `kind: request|stream|event|data|telemetry|control`
  when there is no protocol or it is unusual. A legend of the kinds used appears under the diagram.
  `tone: fail|ok|warn` still wins over the kind.

### 4. Write `_data/flow_anims/<post folders>/<name>.yml`

Start with a header comment naming the post it belongs to. Schema:

| Key | Notes |
|---|---|
| `title` | Used for the SVG's accessible label |
| `map` | Optional, geo diagrams: `{name: world, lon: [west, east], lat: [north, south], graticule: 30, pad: 20}`. Draws the land outline (`_data/flow_maps/<name>.json`) and a lat/lon grid, cropped to the box and scaled to fit the viewBox. Defaults: whole world, `lat: [80, -58]` |
| `accent`, `accent2` | `#RRGGBB`. accent = lit blocks and trails, accent2 = the moving pointer |
| `viewbox` | `[1000, H]` |
| `grid` | Optional: `{x0, y0, dx, dy, w, h}`. A node's centre is `x0 + col*dx`, `y0 + row*dy` (fractional and negative col/row are fine) |
| `lanes` | Optional background bands: `{label, x, y, w, h}`. The label sits at the top-left, so keep nodes 30 or more units below the lane top |
| `colors` | Optional: `accent` turns off per-box colours |
| `nodes` | `{id, label, sub?, x, y \| col, row \| lat, lon, w?, h?, shape?, icon?, icon_pos?, color?, tone?}`. `icon`: a built-in name or a logo path under `assets/img/icons/`; `icon_pos: left` (default, needs about 42 units of label width) or `corner`; `color`: a palette name or `#RRGGBB`. x/y is the **centre**; `lat`/`lon` (decimal degrees, needs `map`) projects onto the map. `sub` is an optional line in code font under the label, for the tool or command (`SpotBugs`, `npm ci`); about 18 characters at width 150; not on diamonds or circles |
| `edges` | `{id, from, to, exit?, enter?, offset?, points?, curve?, label?, label_at?, badge?, tone?, dashed?, arrow?, flow?, proto?, port?, proto_at?, kind?}`. `proto`/`port` draw a pill (`HTTPS :443`); `kind` sets the communication colour (derived from `proto` when omitted) |
| `modes` | Optional, see step 2 |
| `steps` | `{title, text, edges?, lights?, when?, clear?}`. `lights` defaults to the targets of `edges` |
| `loop`, `autoplay` | Optional, default `true`. Set `loop: false` to stop on the last step |

**Routing** (mirrored in `validate.py`):
- With no `exit`/`enter`, an edge goes right→left between nodes in the same row (elbow if rows differ),
  bottom→top in the same column, and a **U below** for a back-edge in the same row.
- Set `exit`/`enter` to `left|right|top|bottom` to choose sides. Equal sides make a U, pushed out by
  `offset` (default 40).
- `points` overrides everything: list the whole path from border to border.
- `curve: <number>` draws a smooth arc instead (a quadratic curve whose bulge is that fraction of the
  distance; positive bows to the right of travel, negative to the left, 0 is a straight line). Edges
  between two `lat`/`lon` nodes curve by default (0.15). A request and its reply between the same two
  nodes form a lens automatically, because reversing the direction flips the side.
- Curved edges also get, by default: a **badge** label (a pill centred on the line, for figures such
  as `~90ms`; `badge: false` gives a plain label, `badge: true` puts a pill on any edge) and **streaming**
  dots plus a soft glow once the pointer has arrived (`flow: false` turns them off, `flow: true` adds
  them to any edge, for an ongoing stream). `arrow: false` drops the arrowhead (links with no
  direction).
- Edge labels sit above the middle of the longest horizontal segment, or right of the longest vertical
  one. `label_at: [x, y]` moves them.

### 5. Validate and look at it

```bash
python3 $SKILL/scripts/validate.py _data/flow_anims/<id>.yml --png /tmp/flw-<name>.png
```

Fix **every** error and warning: overlaps, labels too wide (beside an icon too), edges cutting through
nodes, labels or protocol pills on top of nodes, unknown icons/logos/colours/kinds, ports out of range,
unlit nodes, pointers leaving nodes that are not lit yet. It also parses the file with Ruby, as Jekyll
does (PyYAML accepts things Psych rejects). Then Read the PNG (the final state
with everything lit) and judge it as a reader would. Without cairosvg it writes an SVG instead.

### 6. Embed

Captions may mention tags such as `<distributionManagement>`: the include escapes them. Never write
raw HTML into YAML text. An unescaped tag there once made kramdown swallow the rest of a post.

- With a post: put `{% include flow-anim.html id="<id>" %}` on its own line, with a blank line before and
  after, where the diagram belongs (usually after the section's intro sentence). If it replaces a
  Mermaid diagram of the same flow, remove that block. If the Mermaid diagram shows something
  different, keep it and ask. Leave `mermaid: true` in place, since other diagrams may need it.
- Without a post: do not edit any post. Give the user the include line.

### 7. Build and check in a real browser

Other sessions rebuild `_site` at the same time, so build into a private folder:

```bash
SITE=/tmp/flw-site && rm -rf $SITE && JEKYLL_ENV=production bundle exec jekyll b -d $SITE --disable-disk-cache
(cd $SITE && python3 -m http.server 4123 >/dev/null 2>&1 &)
eval "$(bash $SKILL/scripts/setup.sh)"        # prints CHROME=… WORK=…, or SETUP FAILED
CHROME=$CHROME node $SKILL/scripts/preview.cjs --url http://localhost:4123/<post permalink> --id <id> --out /tmp/flw-<name>
pkill -f "http.serve[r] 4123"                # brackets stop pkill matching its own shell
```

The post's permalink is `/posts/<categories joined by />/<slug without date>/`. preview.cjs loads the
real CDNs (Font Awesome, Bootstrap, fonts) and checks that the figure is ready, full width, not
restyled by theme classes, fully drawn, animating and free of script errors, and that the rest of the
post still renders as HTML (no leaked `{: #id }` or `## ` text), in dark, light and phone views. Read at least `dark-desktop-mid.png`, `light-desktop-end.png` and `light-phone-mid.png`, plus
the second-mode screenshot when there is one. Any `FAIL` must be fixed. If the page can't be served
or Chromium is missing, say so in the report. Don't claim the diagram was checked when it wasn't.

Then run `task test-site` (htmlproofer). Report only failures this change caused. Mention others
separately.

### 8. Report

Tell the user: the data file and the include line, where it was embedded (and anything removed), the
step count and modes, and what the screenshots showed. Never commit. The user publishes with
`task update`.

## Geo maps

The technique, taken from the algomaster.io "Latency - Global Network" diagram (a server-rendered
SVG: equirectangular map, quadratic arcs with control points pushed out from the chord by 0.15 of
its length, a glow underlay and two staggered SMIL `animateMotion` dots per arc, latency pills, and
region discs with halo rings and icons), built into this engine as data:

1. **Pick the crop.** Choose `map.lon`/`map.lat` to just contain the places plus some margin, then
   set the viewBox height to about `40 + 960 × (north − south) / (east − west)` (the validator prints
   the right number). The whole world (`[-180, 180]`, `[80, -58]`) suits intercontinental stories; a
   tighter crop (Europe is about `lon [-15, 35], lat [62, 34]`) separates nearby cities.
2. **Place real locations.** Use the real city of each region or site (US-East is northern Virginia,
   38.9/-77.4; EU-West Ireland, 53.3/-6.3; AP-South Mumbai, 19.1/72.9; AP-Southeast Singapore,
   1.35/103.8; Sydney -33.9/151.2; Frankfurt 50.1/8.7; Tokyo 35.7/139.7; São Paulo -23.5/-46.6).
   Name regions generically (`US-East`) unless the post is about one provider. If two sites collide,
   zoom the crop; do not move a site away from its city.
3. **Numbers are claims.** Latency on a badge must be a typical, rounded round-trip time (`~75ms`)
   and the caption should say "typical" or "about". Physics check: light in fibre covers about
   200 km per ms, so a round trip needs at least `distance_km / 100` ms. Never show a figure below
   that. Prefer ranges or "~" over precise-looking values.
4. **Story.** Same step rules as any diagram. Good geo stories: the slow path vs the fixed path as
   two modes (origin only vs nearest region, no CDN vs CDN, single region vs failover), replication
   hop by hop (`dashed: true` for asynchronous), a region going down (`tone: fail` on the site, then
   traffic re-routing).
5. **Validate.** Besides the usual checks, the validator flags site labels that overlap other sites,
   badges on top of nodes, and arcs cutting through a site. Fix with a different `curve` (sign or
   size) or `label_at`. The PNG shows the map, so judge the arcs there before building.

The land outline is Natural Earth 110m (public domain), stored once in `_data/flow_maps/world.json`
and injected only into pages whose diagram has `map:`. `scripts/build_map.py` regenerates it (for
example `--tolerance 0.15` for more coastline detail).

## Changing the engine

Only when a diagram needs something the format cannot express. Then update all of these together:
`flow-anim.js`; `validate.py` (`projector`/`place`/`route`/`arc`/`corner_at`/checks must mirror the
engine; ICONS, PALETTE, ROLE, LOGO_ROLE, CYCLE, KINDS and PROTO_KIND are read from `flow-anim.js`
automatically); `enrich.py` keywords if icons change; `flow-anim.scss`; the schema table above. Re-run `preview.cjs` for **every** diagram in use
(`grep -rl "flow-anim.html" _posts _tabs`). Keep every class, id and CSS variable prefixed `flw`. Short
generic names clash with the theme's libraries; `.fa` was taken by Font Awesome and broke the first
version.
