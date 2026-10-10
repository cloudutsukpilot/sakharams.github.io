# Designing experiments and their screenshots

An experiment is the unit of learning in a lab: **one action → one signal you can point at →
an explanation of why**. A lab has 3–7 of them, ordered from "see that it works" to "see it break".

## A good experiment

- **One action.** Reload a page, send a burst, kill a pod, add latency, misconfigure one thing.
  If the post needs "and then", it's two experiments.
- **A visible, specific signal.** "The Requests stat goes from 464 to 472", not "metrics change".
  Pick a panel that shows it at a glance; add the panel to the dashboard if none does.
- **A prediction first.** `predict:` asks a question the reader can answer before looking ("How many
  spans, and which service is the root?"). The explanation then confirms or corrects it.
- **Honest timing.** `wait:` covers the slowest signal in it: scrape interval (15s) + one more
  scrape, browser batch delay (2s), log tailing (a few seconds). Monitor's Signal Timing section
  gives the numbers; experiments reuse them.
- **Verifiable.** `verify:` runs `make verify-<id>`, which asks the backend whether the signal
  exists (`scripts/signal.sh`). No verify means no proof the screenshot shows the effect.
- **Progression** that works for most topics:
  1. Baseline: the happy path produces each signal once (page load, one request).
  2. Correlation: one action shows up in two or three signals linked by an ID (trace ↔ log).
  3. Load: a burst and the metric that reacts (rate, latency, saturation). Timelapse.
  4. Failure: an error, a crash or a slow dependency, and how each signal shows it.
  5. Recovery or a fix: the signal going back to normal, and what made it.

Cover every signal the lab's title promises. If the lab says "metrics, logs and traces", at least
one experiment must screenshot each.

## Shots

Each shot is one file, `assets/img/labs/<slug>/<exp id>-<shot name>.webp`.

| Phase | When | Use for |
|---|---|---|
| `before` | before the action, same time window as after | a number or graph the action will change |
| `after` | after `wait`, once verify ran | the changed panel, a log line, a trace waterfall |
| `during` + `timelapse` | frames every N seconds while the action runs | anything that moves: rates, latency, pod counts. Becomes an animated WebP |

- **Before/after pairs share a URL and selector** so readers compare like for like; the `${from}`
  token pins the window start to the experiment start minus `capture.window`.
- **Shoot one panel, not the whole dashboard**, with `selector: '[data-viz-panel-key="panel-<id>"]'`
  (Grafana 11–13, kiosk mode). Mark wide panels (logs, waterfalls, timelapses) `wide: true`.
- **Timelapse frames are real.** Use `reload: true` so each frame re-queries with a fresh `${to}`,
  `every: 5` and `seconds` long enough to see the rise and the settle (60s for a 15s scrape).
  capture.cjs takes the first frame *before* starting the action, so frame 0 is the baseline.
- **Aim at the right item.** "First row" is fragile. Filter the dashboard (`&var-<name>=<value>`) and
  click by text (`[role="row"]:has-text("GET") a`). In the otel run, "first trace link" opened the
  page load's nginx trace instead of the click's trace; only reviewing the PNG caught it.
- **Traces:** open the waterfall by clicking a trace ID in the trace table panel, wait for
  `Service & Operation`, shoot `section[data-testid="data-testid Panel header Trace"]` with a taller
  `viewport` (about 1300px high).
- **alt** says what is in the image (for screen readers and when it fails to load); **caption** says
  what to notice. Neither repeats the experiment title.
- **Keep runs separate.** Set `capture.cooldown` (30s is a good start) so one experiment's burst
  isn't in the next one's "before".
- **Scope Explore shots to the experiment.** Use `${start}` (the experiment's start, epoch ms) as the
  range start in Explore URLs for trace, log and per-run metric shots. Then "first row in the trace
  table" can only be this run's trace, and an earlier burst can't dwarf this one's graph. Dashboard
  before/after pairs keep `${from}` (start minus `capture.window`) so there is a baseline.
- **Explore URLs are URL-encoded JSON** (`/explore?schemaVersion=1&orgId=1&panes={...}`). Generate
  them with a small script rather than by hand; result panels are
  `section[data-testid="data-testid Panel header <Graph|Logs|Table - Traces|Trace>"]`.

## Gotchas found running the OpenTelemetry lab

- **Tempo search lags ingestion** by up to about a minute. A trace that exists can't be *searched* yet,
  so a one-shot verify fails and a "click the first trace" shot opens an older trace. `signal.sh`
  retries (6 × 10 s by default); keep `verify` on every trace experiment so the after-shots wait.
- **Grafana renders only panels inside the viewport.** A selector on a panel below the fold times out;
  give that shot a `viewport` tall enough to include it.
- **A dashboard mounted with `subPath` never updates.** If the dashboard JSON changed since `lgtm`
  started, Grafana still serves the old one. Compare `/api/dashboards/uid/<uid>` with the JSON before
  capturing; restart `lgtm` (wipes telemetry) if they differ. The k3d-lgtm template mounts the JSON as
  a directory to avoid this.
- **`stub_status` counts everything** (kubelet probes, span exports), so an nginx request counter never
  rises by exactly "the files the page needs". Say so in the post; use the access log for exact counts.
- **Pages that look up their own telemetry** fill in stages (log first, trace spans later). A shot of
  such a page needs a wait, a refresh click and a `wait_for_text` on something from the deepest span.
- **Probe noise in logs.** Filter `/healthz` lines out (`!= "/healthz"` in Explore) or the panel shows
  nothing but probes.

## Reviewing a capture (always)

capture.cjs saves a PNG of every shot (the last frame for timelapses) and `report.json` in the review
folder. Read every PNG before writing a word about it:

1. Does it show the effect the caption claims? (right trace, right service, number actually changed)
2. Is anything sensitive visible? (real hostnames, tokens, emails; local lab data is fine)
3. Is it readable at blog width? (a 4-column table squeezed into 460px is not)
4. For timelapses, compare the first and last frames: is there visible movement?

If a shot is wrong, fix the card (URL, filter, selector, wait) and re-run that experiment with
`--only <id>`. Never describe what a screenshot "should" show; describe what it shows, with the real
numbers and IDs from it. If the lab's behaviour differs from the plan, change the post (or the lab),
not the description.

## YAML in the card

Double-quote every prose value (`goal`, `predict`, `expect`, `alt`, `caption`, `say`). A colon
followed by a space in a plain scalar (`Hint: count…`, `` `svc: GET` ``) is a YAML error. Single-quote
queries that contain double quotes (`'{service_name="x"} | json'`).
