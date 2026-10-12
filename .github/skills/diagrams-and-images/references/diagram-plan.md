# Plan: explorable diagrams (replacing flow-anim)

Status: **in use** (milestones 0 to 6 done; migration started) · Owner: Claude Code sessions in this repo · Started 2026-10-10

## Goal

Replace the step-through `flow-anim` diagrams with **explorable diagrams**:

- **Levels of detail.** Components nest. Level 0 shows the top-level parts (for example "CI/CD"). Each
  level opens one more layer (GitHub CI + Argo CD → workflows and Argo CD components → …). Clicking a
  component opens or closes just that one, down to the deepest level.
- **Detail at the bottom.** The deepest components can carry an explanation (Markdown) and a
  configuration snippet, shown in a side panel with a copy button.
- **A map, not a picture.** Drag to pan, Ctrl/⌘ + scroll or pinch to zoom, fit and fullscreen buttons.
- **Icons over boxes.** Each component is a resizable icon disc (built-in icon or a tool logo) with its
  label underneath. An open group is a light frame with a header icon.
- **Placement.** Left to right, then wrapping top to bottom, computed automatically.
- **Arrows that explain the connection.**
  - A protocol pill (`HTTPS :443`) and a colour per communication kind.
  - Continuous moving dots where data flows all the time (OTLP, streams), both ways for WebSocket.
  - A hover or tap card that animates what happens on the wire: TLS 1.3 handshake, TCP 3-way
    handshake, WebSocket upgrade, SSE, gRPC streaming, Kafka, AMQP, MQTT, webhook retries,
    OAuth/OIDC, Kerberos.
- **Use cases (scenarios).** Separate guided stories, one activity each (sign in, deploy a lab, an alert, …), picked from buttons; auto-play runs them in turn; Next / Previous animate each step. (Replaces the single mixed tour.)
- **View tabs.** Cross-cutting arrows (logs and audit to collectors, secrets, DNS, image pulls) live in views (Observability, Security, Networking…) shown as tabs at the top centre; a tab reveals and highlights its arrows and view-only components and dims the rest, so the main view stays readable.
- **Optional guided tour.** The old play/step story with captions and pass/fail modes. Each step opens
  the components it needs, moves the camera there and runs a pointer along the arrows.
- **Geo backdrop.** Components pinned by lat/lon on the world map (the 2 existing geo diagrams).

## Decisions (agreed 2026-10-10)

| Question | Decision |
|---|---|
| Relation to flow-anim | **Replace it.** New engine; flow-anim is retired after migration |
| Rendering and layout | **Own SVG engine + ELK.js** (elkjs 0.12.0 from jsDelivr, ~470 KB gzip, loaded only on pages with a diagram). Not G6 or Cytoscape: our pills, cards, colours and animations would have to be rebuilt in their APIs |
| Deepest-level text and config | **Side panel** beside the diagram (bottom sheet on phones) |
| Tour | **Kept, optional:** explore by default, Play runs the story |
| Migration | **Pilot first** (one large architecture diagram), convert the other 70 after approval |
| Geo maps | **Kept** as a map backdrop |
| Protocol cards in v1 | TLS + TCP, WebSocket / SSE / gRPC, Kafka / AMQP / MQTT / webhooks, OAuth/OIDC / Kerberos |

## Design

### Files

| File | Role |
|---|---|
| `assets/js/diagram.js` | Engine: model, levels, ELK layout, SVG rendering, pan/zoom, panel, cards, tour, geo |
| `_includes/diagram.html` | Markup: stage, toolbar, legend, caption, tour controls, panel, card, no-JS fallback (nested list) |
| `_sass/diagram.scss` | Theme-aware styles (light and dark), prefix `dgm-` (never a short generic class: `.fa` broke flow-anim once) |
| `_data/diagrams/<post folders>/<name>.yml` | One file per diagram, folders mirror the post, like `assets/img/` |
| `.github/skills/diagrams-and-images/` | SKILL.md, `scripts/diagram/validate.py`, `scripts/diagram/preview.cjs`, `references/diagram.md`, this plan (`references/diagram-plan.md`). Original Claude Code copy: the diagram skill in `.claude/skills/` |

Usage in a post: `{% include diagram.html id="<post folders>/<name>" %}`.

### Data model (YAML)

```yaml
title: Example platform
level: 1                         # level shown on load
levels: [Overview, Clusters, Services, Components]   # optional names for the slider
nodes:                           # a tree; `children` nest
  - id: homelab
    label: Homelab
    sub: DGX Spark
    icon: server                 # built-in name or a logo path under assets/img/icons/
    color: violet                # optional; else icon role colour, else by position
    detail: "Markdown text for the side panel"
    config: {title: values.yaml, lang: yaml, code: "…"}
    children: [...]
edges:                           # attach to the deepest components; redrawn to visible ancestors
  - {id: u_cf, from: you, to: access, proto: HTTPS, port: 443}        # cards: TCP, TLS, HTTP
  - {id: labs_mon, from: collector, to: otel-gw, proto: OTLP gRPC, port: 4317}   # streams: moving dots
  - {from: chat, to: ws, proto: WSS, port: 443}                        # dots both ways
  - {from: a, to: b, kind: event, stream: true, cards: [kafka], detail: "edge note"}
tour:                            # optional
  modes: [{id: normal, label: Normal}, {id: alert, label: Simulate an alert}]
  steps:
    - {title: …, text: …, edges: [u_cf], lights: [...], when: alert, clear: true}
map: {name: world, lon: [-130, 150], lat: [65, -45]}   # optional geo backdrop (nodes use lat/lon)
```

### Behaviour

- **Visible graph.** A component is shown when all its ancestors are open. An edge is drawn between
  the visible components that stand for its two ends (each end itself, or its nearest closed
  ancestor). Edges with the same visible ends merge into one, with a "×N" or "N links" pill, and the
  hover card lists each one. An edge whose ends fall inside one closed component is hidden.
- **Levels.** Level L opens every group above depth L. A row of `Level 0 … N` buttons sets it, walking there one layer at a time (each layer animates open or closed). Clicking a group toggles it,
  and closing a group closes its subtree.
- **State in the URL.** `?<figure id>=level~opened~closed`, so a link reopens the same view.
- **Layout.**
  - ELK `layered`, direction RIGHT, `hierarchyHandling: INCLUDE_CHILDREN` (edges across groups),
    `json.shapeCoords/edgeCoords: ROOT` (absolute coordinates), orthogonal routing.
  - Edge labels reserve room for the pills.
  - `wrapping.strategy: MULTI_EDGE` with an aspect ratio of 1.6 (left to right, then the next row
    down). It falls back to no wrapping if ELK rejects it for nested graphs.
- **Animation.** Components glide to their new places, new ones grow out of their parent, closed ones
  shrink into it, and arrows fade in once everything has arrived.
- **Camera.** Fit on level change. Keep the clicked component in view on expand. Fit the step's
  components during the tour.
- **Accessibility.**
  - Components are focusable buttons (Enter opens them); the arrow keys pan and `+` / `-` / `0` zoom.
  - Reduced motion: no moving dots and instant transitions.
  - Without JavaScript, a nested list of components with their details and tour steps.

## Milestones

- [x] **0. Research and decisions** (C4 / IcePanel / Ilograph patterns; ELK, G6 and Cytoscape compared)
- [x] **1a. Engine verified in Node:** ELK nested layout, cross-group edges, label space, ROOT
  coordinates, wrapping of long chains (10-stage chain becomes 3 rows)
- [x] **1b. Engine core:** `diagram.js` (model, levels, layout, render, pan/zoom, panel, cards, tour,
  geo), `diagram.html`, `diagram.scss`
- [x] **2. Pilot data:** a large architecture diagram under `_data/diagrams/projects/`, built
  from the post and the current flow-anim version. Levels: 0 overview → 1 clusters → 2 services →
  3 components → detail panel. No invented configuration: a node gets a `config` snippet only where
  the post defines it
- [x] **3. Preview page:** unlisted `/diagram-pilot/` (sitemap off). The post itself is not touched
  while another session is editing it
- [x] **4. Tooling:**
  - `validate.py`: tree, ids, edge ends, every level's visible graph, icons, kinds, cards, ports,
    tour references, Ruby YAML parse
  - `preview.cjs`: real-browser checks at every level (no overlapping components or pills, expand on
    click, slider, zoom, hover card, panel, tour runs, no script errors; dark, light, phone)
- [x] **5. SKILL.md** for the explorable diagram workflow ([diagram.md](diagram.md)) (workflow, schema, protocol table, layout guidance)
- [x] **6. Review with the user**, then swap the pilot into the 05-technical-architecture post
  (2026-10-11; `/diagram-pilot/` deleted). Every load now opens at the start level (Level 1); the
  URL no longer keeps the layout.
- [ ] **7. Migration** (after approval):
  - done by hand: `labs/azure-private-endpoint-lab/architecture` (parts 1 and 7 of the lab), 5
    levels, views Networking/Security/Observability/Provisioning, 6 use cases. Its old
    `_data/flow_anims/labs/azure-private-endpoint-lab/architecture.yml` is unused; the lab's
    `dns-resolution` flow-anim (parts 3 and 6) is still flow-anim
  - a converter for the other 70 flow-anim files: flat nodes become a tree where lanes or groups
    exist, steps become the tour, lanes become top-level groups, `points`/coordinates are dropped
    in favour of ELK
  - re-check each one in the browser
- [ ] **8. Retire flow-anim:**
  - remove `flow-anim.js` / `.scss` / `.html`, `_data/flow_anims/` and the flow-anim skill
  - update the READMEs and the skills index
  - keep `_data/flow_maps/world.json` (the geo backdrop)

## Pilot findings (2026-10-10)

- **Layout:** with one global layout (`INCLUDE_CHILDREN`) the groups ballooned: about 5% of the
  area was used at level 2. Laying out each group on its own (`SEPARATE_CHILDREN`) is 3 to 4 times
  more compact, but ELK then returns **no route** for arrows that cross groups. The fix is in the
  engine: those arrows are split into segments through **ports** on the group borders, so every
  segment is routed and the arrows between groups also arrange the groups.
- **Shape:** `direction: down` on a wide group (Homelab) took level 1 from 2296×628 to 1682×1033.
- **Wrapping:** wrapping into rows by default made arrows loop across the whole width. It is now
  opt-in (`wrap: true`), for long single chains only.
- **Opening view:** larger diagrams open at a readable zoom (0.62 or more) on their start rather than
  shrinking to fit, like a map.
- **Density:** the platform pilot gained an "Areas" level (Portal / Platform services; RAG / Model
  serving), giving 5 levels: 7 → 17 → 29 → 42 → 45 components.
- **Browser check** (`preview.cjs`): every level without overlaps, expand, card, panel, zoom, URL
  state and tour all pass, with no script errors, in light, dark and phone views.

- **Use cases (2026-10-11):** the single 17-step tour mixed activities. It is now 8 scenarios
  (sign in, resources and cost, deploy a lab, monitoring, chat with a cache-hit mode, ingest, SRE
  agent, release), one action per step; the validator rejects a step whose arrows share no component
  (it flagged 8 such steps in the old tour). Next / Previous / dots animate the step; auto-play moves
  through all use cases.

- **Full round trips (2026-10-11):**
  - Use cases sit in a sidebar left of the canvas.
  - Steps can run a sequential `path` in which `~id` sends a green response packet back, so a
    request's reply is visible; the sign-in now returns hop by hop to the browser.
  - An `action` banner line shows on every step.
  - `result` + `outcome` end each use case with a celebration (confetti and a check for success, a
    red shake for failure); the camera glides to the outcome first.
  - The validator checks that each path is one continuous route, and flags requests whose response
    never comes back (unless `oneway: true`) and use cases without a result. It caught a missing
    Access → Tunnel hop in the pilot.

- **View tabs (2026-10-11):**
  - `views:` add tabs at the top centre (Main flows, Networking, Observability, Security). A tab
    reveals its hidden arrows and view-only components (per-cluster OTel collectors, ExternalDNS,
    External Secrets in ai), highlights them, fades the rest and moves the camera to them.
  - Use-case steps switch to the view they need.
  - The pilot's main view dropped from 41 to 37 arrows while gaining 16 cross-cutting ones: Keycloak
    events and OpenBao audit to the core collector, every collector to mon, gateway to Loki, Mimir
    and Tempo, OpenBao tokens for Argo CD, the agent and the runner, DNS, and image pulls.
  - The browser check caught `this.view` clashing with the canvas group of the same name (zoom
    broke); the tab state is now `activeView` and the tab class is `.dgm-vtab`.
- **Player focus and fullscreen (2026-10-11):**
  - While a use case runs, each step opens the groups it needs and closes open groups that neither
    it nor a later step uses (pilot: 16 → 5 open groups). When auto-play finishes the last use case,
    or the use case is rewound, the reader's level, open groups, view tab and zoom come back. A
    manual level, component or tab click mid-way keeps the reader's layout. Auto-play now stops after
    the last use case (`loop: true` to keep going).
  - ⤢ asks for real browser fullscreen (Esc leaves) on top of the overlay, and the canvas row now
    flexes to fill the height (before, the stage kept its page height and left blank space under
    the player).
  - Always-on telemetry streams between main-view components (lab collector → gateway, gateway →
    Loki/Mimir/Tempo, RAG → Phoenix) are back in Main flows with `main: true`, so their dots move
    on the main diagram; the validator warns when such a stream is hidden.
  - Use cases no longer switch view tabs (that faded and hid components mid-run): while one runs,
    every view's components and arrows are shown and Show all is selected; the tab returns after.
  - Tabs gained a built-in **Show all** (every view's arrows and components, nothing faded) and the
    pilot a **CI/CD** view from commit to running pods: new `you_push` (git push) and Argo CD `apply`
    arrows, and the "Code to cluster" use case now runs push → CI → OpenBao → gates → Zot → digest
    commit → sync → apply → image pull.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| ELK weight (~470 KB gzip) | Loaded on demand, only on pages with a diagram; cached by jsDelivr |
| Re-layout moves distant components after an expand | Animated transitions; camera keeps the clicked component in view; layout follows model order (`considerModelOrder`) for stability |
| ELK wrapping with nested groups | Automatic fallback to no wrapping; the `wrap: false` / `aspect:` data options |
| Dense levels | The validator warns when a level shows more than about 25 components; split with more nesting |
| Concurrent sessions editing the same post | Pilot on its own page; build into a scratch folder, not the shared `_site` |
| Losing flow-anim features in migration | Tour, modes, pills, kinds, icons, geo and the validator checks are all carried over before retirement |
