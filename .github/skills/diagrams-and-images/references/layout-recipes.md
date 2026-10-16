# Layout recipes

Coordinates are in viewBox units (always 1000 wide). Node x/y is the centre; the default node is
150 × 56. Start from the closest recipe, then run `validate.py --png` and adjust.

## 1. Straight pipeline (up to 6 stages)

One row. Five nodes: `grid: {x0: 100, y0: 60, dx: 200, dy: 0, w: 150, h: 56}`, cols 0 to 4, so
`viewbox: [1000, 120]`. Six nodes: `x0: 90, dx: 164, w: 136`. All edges route automatically.

```yaml
grid: {x0: 100, y0: 60, dx: 200, dy: 0, w: 150, h: 56}
nodes:
  - {id: A, label: "Commit", col: 0, row: 0, shape: terminal}
  - {id: B, label: "Build", col: 1, row: 0}
edges:
  - {id: AB, from: A, to: B}
```

## 2. Long pipeline in two lanes

More than 6 stages: lane 1 holds the first stages, and lane 2 continues **left to right** underneath.
The wrap connector runs from the last lane-1 node's bottom, down into the gap between the lanes,
left to x = 35, then down and into the first lane-2 node. Use explicit `points` for it. Reference:
`_data/flow_anims/devops/build-tools/generic-build-pipeline.yml` (lanes at y 8 to 130 and 205 to 492, wrap at y = 165).

```yaml
lanes:
  - {label: "Build", x: 8, y: 8, w: 984, h: 122}
  - {label: "Verify and publish", x: 8, y: 205, w: 984, h: 160}
edges:
  - {id: EF, from: E, to: F, points: [[900, 103], [900, 165], [35, 165], [35, 270], [55, 270]]}
```

## 3. Fan-out and fan-in (parallel stages)

Stack the parallel nodes in one column, 70 apart (`h: 46`). Fan-out from a node on their left is
automatic (elbows from its right side). Fan-in to a node on their right is automatic too. Put all
the parallel edges in **one step** each way. The join node lights when the last pointer arrives.

```yaml
- {id: F, label: "SAST", x: 330, y: 200, h: 46}
- {id: G, label: "SCA", x: 330, y: 270, h: 46}
- {id: H, label: "Secrets", x: 330, y: 340, h: 46}
```

## 4. Decision with two outcomes (modes)

A `diamond` (w 110, h 84) with the main path continuing right (`label: "pass"`) and the other outcome
below it (`exit: bottom` is automatic when the target is in the same column, with `tone: fail` on the
edge and the target). Declare `modes`, and mark the steps that belong to only one outcome with `when`.

```yaml
modes:
  - {id: pass, label: "Gate passes"}
  - {id: fail, label: "Simulate a failing gate"}
edges:
  - {id: IX, from: I, to: X, label: "fail", tone: fail}
steps:
  - {edges: [IX], when: fail, title: "Fail the build", text: "..."}
  - {edges: [IJ], when: pass, title: "Package", text: "..."}
```

Other uses: cache hit or miss, authorised or denied, healthy or failing over.

## 5. Request and response (round trip)

Put the request path along one row (Client → Load balancer → Service → Database). Draw the response
as **one** edge from the last node back to the first with `exit: bottom, enter: bottom, offset: 50,
tone: ok, label: "response"`. It routes as a U under the row. If the response path must show each hop,
use one back-edge per hop with growing offsets (40, 60, 80) so the U's nest without overlapping.
Leave about 90 units below the row for them.

### 5a. Systems with protocols and ports

When arrows carry `proto`/`port` pills, space connected systems so each pill has a straight segment
of its width + 20: `HTTPS :443` needs about 100 units, `PostgreSQL :5432` about 145. In a row, use
`dx` of 240 to 290 with node width 120 to 150. For a service that fans out to several backends, put
the backends in a column to its right and route the outer ones with `exit: top` / `exit: bottom` and
`enter: left`, so every pill sits on its own long horizontal segment. Reference:
`references/examples/request-path-ports.yml` (Browser, load balancer, API, then PostgreSQL, Kafka and
an OTel Collector: four communication kinds and a legend).

## 6. Feedback loop

Lay the loop out as a row. A back-edge from the last node to an earlier one in the same row routes as
a U below automatically (`offset: 50` gives room for a label). Later steps can travel edges that are
already lit: the trail stays and only the pointer moves. A side outcome of a decision (such as "in
sync") goes above the diamond (`row: -1`), so it never crosses the U. Reference:
`references/examples/gitops-reconcile-loop.yml`. Use `clear: true` on a step to show a second,
separate iteration from a dark diagram.

Autoscaling, as a loop: `Traffic → Metrics → Alarm (diamond) → Scale out → Instances → (back-edge)
Metrics`, with a second mode for scale-in (`when: scale-in`, the alarm's other branch going down).

## 7. Architecture with tiers (top to bottom)

When the story flows downward (User → Edge → App → Data), use a grid with `dx` for the columns inside
a tier and `dy: 130` between tiers. Same-column edges route bottom→top automatically. Use lanes as
tier bands (`Edge`, `Application`, `Data`).

## 8. Long sequence or roadmap (10+ stages)

Never put a long sequence in one row. Split it into **3–4 lanes of at most 5 nodes**, one lane per
phase, each read left to right. Reference: `_data/flow_anims/architect/system-design/system-design-roadmap.yml`
(18 stages, 4 lanes). Use `grid: {x0: 130, y0: 78, dx: 185, dy: 155, w: 140, h: 56}`, and lanes at
`x: 40, w: 952, h: 120`, with y stepping by 155 (8, 163, 318, 473; `viewbox: [1000, 600]` for four
lanes). Start the lanes at x = 40 so the wrap connectors run in the left margin at x = 22 and never
cross a lane label:

```yaml
- {id: DE, from: D, to: E, points: [[685, 106], [685, 145], [22, 145], [22, 233], [60, 233]]}
```

One step per stage is fine here, even past 12 steps. Quote edge ids that YAML reads as booleans
(`"NO"`, `"ON"`, `"YES"`, `"OFF"`), both in `edges` and in the steps.

## 8. Geo map (regions, latency, replication)

Keyword "geo map". No grid: `map:` plus `shape: site` nodes at real `lat`/`lon`, edges curve on their
own. Reference: `references/examples/global-latency-map.yml` (US-East, EU-West, AP-South,
AP-Southeast and a user in Sydney; "origin only" vs "nearest region" modes).

```yaml
viewbox: [1000, 460]
map: {name: world, lon: [-100, 160], lat: [64, -50]}
nodes:
  - {id: us, label: "US-East", sub: "origin", shape: site, icon: server, lat: 38.9, lon: -77.4}
  - {id: user, label: "User", sub: "Sydney", shape: site, icon: user, lat: -33.9, lon: 151.2}
edges:
  - {id: req, from: user, to: us, label: "~200ms", tone: warn, curve: -0.22}
  - {id: res, from: us, to: user, tone: warn, curve: 0.1}
```

- Sites need about 70 units between centres, and room under each for its label (about 35 units).
- A long arc that passes over other sites: flip the sign of `curve` or raise it (0.2 to 0.35).
- Request and reply between the same pair: give both the same sign of bulge *relative to the map*
  (opposite `curve` signs, because the direction is reversed) to nest them, or leave both at the
  default for a lens.
- `site` nodes also work without a map, for icon-led architecture sketches (User, CDN, Origin).

## Checklist before validating

- Every system-to-system arrow has `proto` and `port`; every box has an icon where one fits (run
  `scripts/flow-anim/enrich.py --write`, then check its picks).

- No row holds more than 5–6 nodes. More stages than that means more lanes (recipes 2 and 8).

- Nothing is placed above the top 30 units of a lane (the lane label is there).
- Edge labels sit on segments that are at least the label's width (about 7 units per character) plus
  10 long.
- Pointers only leave lit nodes, so every step's edges start from something lit earlier.
- The first step has no edges. Every node and edge is used by some step.
