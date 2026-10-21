/*
 * Flow animation player (_includes/flow-anim.html, data in _data/flow_anims/<post folders>/<name>.yml).
 * Draws nodes, lanes and edges as SVG from the JSON in each .flw figure, then plays the steps:
 * a pointer travels along each step's edges, drawing them in the accent colour, and the target
 * nodes light up when every edge into them has arrived. No dependencies.
 * Geo diagrams (`map:` in the data) draw a land outline (_data/flow_maps/<name>.json, injected by the
 * include) behind nodes placed by lat/lon, joined by curved arcs that keep streaming once lit.
 * Boxes are coloured (explicit `color`, else their icon's role, else by column), can carry an icon
 * (built-in line icon or a tool logo from assets/img/icons/), and arrows can carry a `proto`/`port` pill
 * and a communication `kind` colour (derived from `proto` when not set), listed in a legend.
 * Data format and routing rules: .claude/skills/cloudutsuk-flow-anim/SKILL.md (the validator in
 * that skill mirrors place() and route() below; keep them in sync).
 */
(() => {
  if (window.__flowAnim) return;
  window.__flowAnim = true;

  const NS = 'http://www.w3.org/2000/svg';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEEDS = [0.5, 1, 2];
  const DWELL_MS = 1500; // pause on each lit step
  const END_MS = 3500; // pause on the last step before looping
  const TONES = ['lit', 'fail', 'ok', 'warn'];
  let uid = 0;

  const make = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  };
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // Equirectangular projection for `map: {lon: [west, east], lat: [north, south], pad}`: the crop is
  // scaled uniformly to fit the viewBox (minus pad) and centred. Land data is in degrees (x = lon,
  // y = -lat), so the same transform places the outline.
  function projector(data) {
    const m = data.map;
    if (!m) return null;
    const [lon0, lon1] = m.lon || [-180, 180];
    const [lat0, lat1] = m.lat || [80, -58];
    const [VW, VH] = data.viewbox;
    const pad = m.pad ?? 20;
    const k = Math.min((VW - 2 * pad) / (lon1 - lon0), (VH - 2 * pad) / (lat0 - lat1));
    const ox = (VW - k * (lon1 - lon0)) / 2 - k * lon0;
    const oy = (VH - k * (lat0 - lat1)) / 2 + k * lat0;
    return { k, ox, oy, lon0, lon1, lat0, lat1, x: (lon) => ox + k * lon, y: (lat) => oy - k * lat };
  }

  // Nodes give x/y (centre) directly, col/row on data.grid, or lat/lon on data.map; w/h default to
  // the grid's node size (52 x 52 for a `site`).
  function place(n, grid, proj) {
    const g = grid || {};
    const geo = proj && n.lat != null && n.lon != null;
    const size = n.shape === 'site' ? 52 : null;
    return {
      ...n,
      x: n.x ?? (geo ? proj.x(n.lon) : g.x0 + n.col * g.dx),
      y: n.y ?? (geo ? proj.y(n.lat) : g.y0 + n.row * g.dy),
      w: n.w ?? size ?? g.w ?? 150,
      h: n.h ?? size ?? g.h ?? 56
    };
  }

  // Inside test used to trim curved edges at a node's border.
  function inside(n, [px, py]) {
    if (n.shape === 'site' || n.shape === 'circle') {
      return ((px - n.x) / (n.w / 2 + 2)) ** 2 + ((py - n.y) / (n.h / 2 + 2)) ** 2 <= 1;
    }
    return Math.abs(px - n.x) <= n.w / 2 + 2 && Math.abs(py - n.y) <= n.h / 2 + 2;
  }

  // Curved edge: a quadratic Bezier from centre to centre whose control point is the chord's midpoint
  // pushed sideways by `curve` x chord length (positive bows to the right of travel), trimmed at both
  // borders and sampled into a polyline so the pointer, trail and labels reuse the straight-line code.
  function arc(a, b, curve) {
    const [mx, my] = [(a.x + b.x) / 2, (a.y + b.y) / 2];
    const [cx, cy] = [mx - curve * (b.y - a.y), my + curve * (b.x - a.x)];
    const at = (t) => [
      (1 - t) ** 2 * a.x + 2 * (1 - t) * t * cx + t * t * b.x,
      (1 - t) ** 2 * a.y + 2 * (1 - t) * t * cy + t * t * b.y
    ];
    const edge = (n, lo, hi) => {
      // Bisect for the parameter where the curve crosses n's border (inside at lo, outside at hi).
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        if (inside(n, at(mid))) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    };
    const t0 = edge(a, 0, 0.5);
    const t1 = edge(b, 1, 0.5);
    const pts = [];
    for (let i = 0; i <= 32; i++) pts.push(at(t0 + ((t1 - t0) * i) / 32).map((v) => Math.round(v * 10) / 10));
    return pts;
  }

  // An edge curves when it sets `curve`, or by default (0.15) when both ends are placed by lat/lon.
  const curveOf = (e, a, b) =>
    e.points || e.exit || e.enter ? null : e.curve ?? (a.lat != null && b.lat != null && a.lon != null && b.lon != null ? 0.15 : null);

  // Named colours for `color:` (mirrored in validate.py PALETTE). They read on light and dark pages.
  const PALETTE = {
    blue: '#3B82F6', sky: '#0EA5E9', teal: '#14B8A6', green: '#22C55E', lime: '#84CC16', amber: '#F59E0B',
    orange: '#F97316', red: '#EF4444', rose: '#F43F5E', pink: '#EC4899', violet: '#8B5CF6', indigo: '#6366F1',
    slate: '#64748B'
  };
  // Boxes without `color` or a role icon take these in turn, one colour per column.
  const CYCLE = ['blue', 'violet', 'teal', 'amber', 'pink', 'sky', 'green', 'orange', 'indigo', 'rose'];
  // Role colour of each built-in *system* icon: people blue, edge/network teal, compute violet, data
  // amber, security rose, observability green, messaging pink. Process icons (code, gear, check, git,
  // package, rocket, clock, search, terminal) have no role, so pipeline stages keep per-column colours.
  const ROLE = {
    user: 'blue', users: 'blue', phone: 'blue', laptop: 'blue', browser: 'blue',
    globe: 'teal', router: 'teal', balancer: 'teal', firewall: 'teal', cloud: 'sky',
    server: 'violet', cpu: 'violet', cluster: 'violet', container: 'violet', function: 'violet', api: 'violet',
    database: 'amber', bucket: 'amber', queue: 'amber', file: 'amber', bolt: 'amber',
    lock: 'rose', key: 'rose', shield: 'rose', cert: 'rose',
    chart: 'green', bell: 'green',
    mail: 'pink', message: 'pink'
  };
  // Role colour of a library logo, by its folder under assets/img/icons/.
  const LOGO_ROLE = { databases: 'amber', devsecops: 'rose', iam: 'rose', cloud: 'sky', devops: 'orange', programming: 'indigo', operatingsystems: 'violet', virtualization: 'violet' };
  // Communication kinds for arrows (mirrored in validate.py KINDS / PROTO_KIND).
  const KINDS = {
    request: ['#3B82F6', 'Request / response'],
    stream: ['#14B8A6', 'Streaming'],
    event: ['#A855F7', 'Async event / message'],
    data: ['#F59E0B', 'Data access'],
    telemetry: ['#84CC16', 'Telemetry'],
    control: ['#EC4899', 'Control / security']
  };
  const PROTO_KIND = {
    HTTP: 'request', HTTPS: 'request', REST: 'request', GRPC: 'request', GRAPHQL: 'request', SOAP: 'request', H2: 'request', H3: 'request',
    WS: 'stream', WSS: 'stream', WEBSOCKET: 'stream', SSE: 'stream', RTMP: 'stream', WEBRTC: 'stream',
    AMQP: 'event', AMQPS: 'event', KAFKA: 'event', MQTT: 'event', MQTTS: 'event', NATS: 'event', STOMP: 'event', SQS: 'event', SNS: 'event', PUBSUB: 'event', WEBHOOK: 'event', SMTP: 'event',
    SQL: 'data', POSTGRESQL: 'data', POSTGRES: 'data', MYSQL: 'data', TDS: 'data', MSSQL: 'data', REDIS: 'data', RESP: 'data', MONGODB: 'data', CQL: 'data', NFS: 'data', SMB: 'data', S3: 'data', JDBC: 'data', ODBC: 'data',
    OTLP: 'telemetry', PROMETHEUS: 'telemetry', SYSLOG: 'telemetry', STATSD: 'telemetry', GELF: 'telemetry', LOKI: 'telemetry',
    DNS: 'control', TLS: 'control', OIDC: 'control', OAUTH: 'control', OAUTH2: 'control', SAML: 'control', LDAP: 'control', LDAPS: 'control', KERBEROS: 'control', SSH: 'control', NTP: 'control', BGP: 'control', RDP: 'control'
  };
  const kindOf = (e) => e.kind || PROTO_KIND[String(e.proto || '').toUpperCase().split(/[\s/+.-]/)[0]] || null;
  const colorOf = (c) => PALETTE[c] || c;

  // Icons, drawn in a 24 x 24 box centred on 0,0 (mirrored in validate.py ICONS).
  const ICONS = {
    server: '<rect x="-8" y="-9" width="16" height="8" rx="1.5"/><rect x="-8" y="1" width="16" height="8" rx="1.5"/><circle class="flw-ifill" cx="4" cy="-5" r="1.3"/><circle class="flw-ifill" cx="4" cy="5" r="1.3"/>',
    database: '<path d="M-8,-6 a8,3 0 0 1 16,0 v12 a8,3 0 0 1 -16,0 z"/><path d="M-8,-6 a8,3 0 0 0 16,0 M-8,0 a8,3 0 0 0 16,0"/>',
    user: '<circle cx="0" cy="-4" r="4.5"/><path d="M-8,9 a8,7.5 0 0 1 16,0"/>',
    users: '<circle cx="-3.5" cy="-4" r="3.5"/><path d="M-10,8 a6.5,6 0 0 1 13,0"/><circle cx="5" cy="-2" r="3"/><path d="M2.5,4.5 a5.5,5 0 0 1 8,3.5"/>',
    globe: '<circle cx="0" cy="0" r="9"/><ellipse cx="0" cy="0" rx="4" ry="9"/><path d="M-9,0 h18 M-7.5,-4.5 h15 M-7.5,4.5 h15"/>',
    cloud: '<path d="M-6,7 h12.5 a4.5,4.5 0 0 0 0.5,-9 a6.5,6.5 0 0 0 -12.5,-1.5 a5.2,5.2 0 0 0 -0.5,10.5 z"/>',
    phone: '<rect x="-5.5" y="-9.5" width="11" height="19" rx="2.5"/><path d="M-1.5,6.5 h3"/>',
    laptop: '<rect x="-7" y="-7" width="14" height="10" rx="1.5"/><path d="M-10,6.5 h20"/>',
    lock: '<rect x="-6.5" y="-1" width="13" height="10" rx="2"/><path d="M-4,-1 v-3 a4,4 0 0 1 8,0 v3"/>',
    bolt: '<path class="flw-ifill" d="M2,-10 L-6,1.5 H0 L-2,10 L6,-1.5 H0 Z"/>',
    queue: '<rect x="-9.5" y="-6" width="19" height="12" rx="2"/><path d="M-3,-6 v12 M3,-6 v12"/>',
    balancer: '<circle cx="0" cy="-7" r="2.5"/><path d="M0,-4.5 V0 M0,0 L-7,6 M0,0 V6 M0,0 L7,6"/><circle class="flw-ifill" cx="-7" cy="7.5" r="1.8"/><circle class="flw-ifill" cx="0" cy="7.5" r="1.8"/><circle class="flw-ifill" cx="7" cy="7.5" r="1.8"/>',
    browser: '<rect x="-10" y="-8" width="20" height="16" rx="2"/><path d="M-10,-3.5 h20"/><circle class="flw-ifill" cx="-7" cy="-5.8" r="0.9"/><circle class="flw-ifill" cx="-4.3" cy="-5.8" r="0.9"/>',
    api: '<circle cx="0" cy="0" r="3"/><path d="M0,-9 v6 M0,3 v6 M-9,0 h6 M3,0 h6"/><circle cx="0" cy="-9.5" r="1.2"/><circle cx="0" cy="9.5" r="1.2"/><circle cx="-9.5" cy="0" r="1.2"/><circle cx="9.5" cy="0" r="1.2"/>',
    code: '<path d="M-4,-7 L-10,0 L-4,7 M4,-7 L10,0 L4,7 M1.5,-9 L-1.5,9"/>',
    container: '<path d="M-9,-4 L0,-9 L9,-4 V5 L0,10 L-9,5 Z M-9,-4 L0,1 L9,-4 M0,1 V10"/>',
    cluster: '<path d="M0,-10 L8.7,-5 V5 L0,10 L-8.7,5 V-5 Z"/><circle cx="0" cy="0" r="3"/><path d="M0,-3 V-7 M2.6,1.5 L6,3.5 M-2.6,1.5 L-6,3.5"/>',
    gear: '<circle cx="0" cy="0" r="3.2"/><circle cx="0" cy="0" r="6.4"/><path d="M0,-10 v3.6 M0,6.4 v3.6 M-10,0 h3.6 M6.4,0 h3.6 M-7,-7 l2.5,2.5 M4.5,4.5 l2.5,2.5 M-7,7 l2.5,-2.5 M4.5,-4.5 l2.5,-2.5"/>',
    key: '<circle cx="-4.5" cy="0" r="4.5"/><path d="M0,0 H10 M6.5,0 v3.5 M9.5,0 v3"/>',
    shield: '<path d="M0,-10 L8,-6.5 V0.5 C8,5.5 4.5,8.5 0,10 C-4.5,8.5 -8,5.5 -8,0.5 V-6.5 Z"/><path d="M-3.5,0 L-1,2.8 L4,-2.8"/>',
    cert: '<rect x="-9" y="-9" width="18" height="12" rx="1.5"/><path d="M-5.5,-5 h11 M-5.5,-1.5 h6"/><circle cx="4" cy="5" r="3"/><path d="M2.5,7.5 L1.5,10.5 M5.5,7.5 L6.5,10.5"/>',
    git: '<circle cx="-5" cy="-7" r="2.3"/><circle cx="-5" cy="7" r="2.3"/><circle cx="5" cy="-2" r="2.3"/><path d="M-5,-4.7 V4.7 M5,0.3 C5,4 -1,3 -4,5.5"/>',
    chart: '<path d="M-10,9 H10 M-10,9 V-10"/><path d="M-7,4 L-2,-2 L2,1 L8,-7"/>',
    bell: '<path d="M-7,5 V-1 a7,7 0 0 1 14,0 V5 L9,7 H-9 Z"/><path d="M-2.5,9.5 a2.5,2 0 0 0 5,0"/>',
    search: '<circle cx="-2" cy="-2" r="6"/><path d="M2.5,2.5 L9,9"/>',
    clock: '<circle cx="0" cy="0" r="9"/><path d="M0,-5 V0 L3.5,2.5"/>',
    check: '<circle cx="0" cy="0" r="9"/><path d="M-4,0 L-1,3 L4.5,-3"/>',
    mail: '<rect x="-10" y="-7" width="20" height="14" rx="2"/><path d="M-10,-6 L0,1.5 L10,-6"/>',
    message: '<path d="M-9,-7 H9 V5 H-1 L-6,9 V5 H-9 Z"/>',
    file: '<path d="M-7,-10 H3 L8,-5 V10 H-7 Z M3,-10 V-5 H8"/><path d="M-4,1 h8 M-4,5 h8"/>',
    function: '<path d="M4.5,-9 C0.5,-9 0.5,-7 0,-3 L-2,7 C-2.5,9.5 -4.5,10 -7,10 M-5,-2 H5"/>',
    router: '<rect x="-10" y="1" width="20" height="8" rx="2"/><path d="M-5,1 V-3 M5,1 V-3 M-8,-6 a4,4 0 0 1 6,0 M2,-6 a4,4 0 0 1 6,0"/>',
    firewall: '<rect x="-10" y="-8" width="20" height="16" rx="1.5"/><path d="M-10,-2.7 h20 M-10,2.7 h20 M-3,-8 v5.3 M4,-2.7 v5.4 M-3,2.7 v5.3"/>',
    terminal: '<rect x="-10" y="-8" width="20" height="16" rx="2"/><path d="M-6,-3 L-2.5,0 L-6,3 M0,4 H5"/>',
    package: '<path d="M-9,-5 L0,-9.5 L9,-5 V5 L0,9.5 L-9,5 Z M-9,-5 L0,-0.5 L9,-5 M0,-0.5 V9.5 M-4.5,-7.2 L4.5,-2.7"/>',
    bucket: '<path d="M-8,-7 H8 L6,9 H-6 Z"/><path d="M-8,-7 a8,2.5 0 0 0 16,0"/>',
    rocket: '<path d="M0,-10 C5,-6 6,0 4,5 H-4 C-6,0 -5,-6 0,-10 Z"/><circle cx="0" cy="-3" r="1.8"/><path d="M-4,5 L-7,8 V3 M4,5 L7,8 V3 M-1.5,8 h3"/>',
    cross: '<circle cx="0" cy="0" r="9"/><path d="M-3.8,-3.8 L3.8,3.8 M3.8,-3.8 L-3.8,3.8"/>',
    cpu: '<rect x="-6" y="-6" width="12" height="12" rx="1.5"/><path d="M-3,-9 v3 M3,-9 v3 M-3,6 v3 M3,6 v3 M-9,-3 h3 M-9,3 h3 M6,-3 h3 M6,3 h3"/>'
  };
  // A logo is any icon value with a slash or an image extension: a path under assets/img/icons/.
  const isLogo = (icon) => /[/.]/.test(String(icon || ''));
  // Boxes with an icon keep it in a 30-wide strip on the left; the text centres in the rest.
  const ICON_STRIP = 30;
  // Centre of a corner icon chip (mirrored in validate.py corner_at).
  const cornerAt = (n) => [n.x - n.w / 2 + (n.shape === 'terminal' ? n.h / 2 : 12), n.y - n.h / 2 + (n.shape === 'cylinder' ? 2 : 0)];
  const iconSides = (shape) => !shape || shape === 'box' || shape === 'terminal' || shape === 'cylinder';

  const anchor = (n, side) =>
    ({
      right: [n.x + n.w / 2, n.y],
      left: [n.x - n.w / 2, n.y],
      top: [n.x, n.y - n.h / 2],
      bottom: [n.x, n.y + n.h / 2]
    })[side];

  function defaultSides(a, b) {
    if (Math.abs(a.y - b.y) < 1) return b.x > a.x ? ['right', 'left'] : ['bottom', 'bottom'];
    if (Math.abs(a.x - b.x) < 1) return b.y > a.y ? ['bottom', 'top'] : ['top', 'bottom'];
    return b.x > a.x ? ['right', 'left'] : ['left', 'right'];
  }

  // Orthogonal route between two nodes. Same exit and entry side makes a U (loops, back-edges).
  function route(a, b, e) {
    const [dx, dn] = defaultSides(a, b);
    const exit = e.exit || dx;
    const enter = e.enter || dn;
    const off = e.offset ?? 40;
    const s = anchor(a, exit);
    const t = anchor(b, enter);
    const horiz = (side) => side === 'left' || side === 'right';
    if (exit === enter) {
      if (exit === 'bottom' || exit === 'top') {
        const y = exit === 'bottom' ? Math.max(s[1], t[1]) + off : Math.min(s[1], t[1]) - off;
        return [s, [s[0], y], [t[0], y], t];
      }
      const x = exit === 'right' ? Math.max(s[0], t[0]) + off : Math.min(s[0], t[0]) - off;
      return [s, [x, s[1]], [x, t[1]], t];
    }
    if (horiz(exit) && horiz(enter)) {
      if (Math.abs(s[1] - t[1]) < 1) return [s, t];
      const mx = (s[0] + t[0]) / 2;
      return [s, [mx, s[1]], [mx, t[1]], t];
    }
    if (!horiz(exit) && !horiz(enter)) {
      if (Math.abs(s[0] - t[0]) < 1) return [s, t];
      const my = (s[1] + t[1]) / 2;
      return [s, [s[0], my], [t[0], my], t];
    }
    return horiz(exit) ? [s, [t[0], s[1]], t] : [s, [s[0], t[1]], t];
  }

  function measure(pts) {
    const segs = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      const len = Math.hypot(bx - ax, by - ay);
      segs.push({ ax, ay, bx, by, len, start: total });
      total += len;
    }
    return { segs, total };
  }

  function pointAt(m, d) {
    const seg = m.segs.find((s) => d <= s.start + s.len) || m.segs[m.segs.length - 1];
    const t = seg.len ? Math.min(Math.max((d - seg.start) / seg.len, 0), 1) : 0;
    return {
      x: seg.ax + (seg.bx - seg.ax) * t,
      y: seg.ay + (seg.by - seg.ay) * t,
      angle: (Math.atan2(seg.by - seg.ay, seg.bx - seg.ax) * 180) / Math.PI
    };
  }

  function drawIcon(g, icon, cx, cy, size, base) {
    if (isLogo(icon)) {
      // Tool logos sit on a light tile so dark logos stay visible on dark pages.
      const t = size + 4;
      make('rect', { class: 'flw-logo-tile', x: cx - t / 2, y: cy - t / 2, width: t, height: t, rx: 5 }, g);
      make('image', { class: 'flw-logo', href: base + String(icon).replace(/^\/+/, ''), x: cx - size / 2 + 2, y: cy - size / 2 + 2, width: size - 4, height: size - 4, preserveAspectRatio: 'xMidYMid meet' }, g);
    } else {
      const ic = make('g', { class: 'flw-icon', transform: `translate(${cx},${cy}) scale(${(size / 24).toFixed(3)})` }, g);
      ic.innerHTML = ICONS[icon] || ICONS.server;
    }
  }

  function drawNode(layer, n, base) {
    const g = make('g', { class: 'flw-node' + (n.tone ? ' flw-tone-' + n.tone : ''), style: `--flw-c: ${n.c}` }, layer);
    const { x, y, w, h } = n;
    if (n.shape === 'diamond') {
      make('polygon', { class: 'flw-shape', points: `${x},${y - h / 2} ${x + w / 2},${y} ${x},${y + h / 2} ${x - w / 2},${y}` }, g);
    } else if (n.shape === 'cylinder') {
      const ry = 8;
      const top = y - h / 2 + ry;
      make('path', { class: 'flw-shape', d: `M${x - w / 2},${top} a${w / 2},${ry} 0 0 1 ${w},0 v${h - 2 * ry} a${w / 2},${ry} 0 0 1 ${-w},0 z` }, g);
      make('path', { class: 'flw-rim', d: `M${x - w / 2},${top} a${w / 2},${ry} 0 0 0 ${w},0` }, g);
    } else if (n.shape === 'circle') {
      make('ellipse', { class: 'flw-shape', cx: x, cy: y, rx: w / 2, ry: h / 2 }, g);
    } else if (n.shape === 'site') {
      // A location or service on a map: halo rings (shown when lit), a disc, an icon, and the label
      // below the disc with a background-coloured outline so map lines never cut through it.
      const r = w / 2;
      g.classList.add('flw-site');
      make('circle', { class: 'flw-ring flw-ring-outer', cx: x, cy: y, r: r + 16 }, g);
      make('circle', { class: 'flw-ring', cx: x, cy: y, r: r + 9 }, g);
      make('circle', { class: 'flw-shape', cx: x, cy: y, r }, g);
      drawIcon(g, n.icon || 'server', x, y, (r / 26) * 24, base);
      const text = make('text', { class: 'flw-label flw-site-label', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g);
      let ty = y + r + 15;
      String(n.label).split('\n').forEach((line, i) => {
        if (i) ty += 17;
        make('tspan', { x, y: ty }, text).textContent = line;
      });
      (n.sub ? String(n.sub).split('\n') : []).forEach((line) => {
        ty += 16;
        make('tspan', { x, y: ty, class: 'flw-sub' }, text).textContent = line;
      });
      return g;
    } else {
      const rx = n.shape === 'terminal' ? h / 2 : 10;
      make('rect', { class: 'flw-shape', x: x - w / 2, y: y - h / 2, width: w, height: h, rx }, g);
    }
    // An icon on a box takes a strip on the left (the text centres in what is left), or with
    // `icon_pos: corner` sits as a chip on the top-left corner and takes no text width.
    const corner = n.icon && iconSides(n.shape) && n.icon_pos === 'corner';
    const withIcon = n.icon && iconSides(n.shape) && !corner;
    const tx = withIcon ? x + ICON_STRIP / 2 - 2 : x;
    if (withIcon) drawIcon(g, n.icon, x - w / 2 + 6 + 11, y + (n.shape === 'cylinder' ? 5 : 0), 22, base);
    // Label lines (17 apart), then optional `sub` lines in code font (16 apart), centred as one block.
    const lines = String(n.label).split('\n');
    const subs = n.sub ? String(n.sub).split('\n') : [];
    const rows = [...lines.map((t) => [t, 17, '']), ...subs.map((t) => [t, 16, 'flw-sub'])];
    const block = rows.slice(1).reduce((sum, r) => sum + r[1], 0);
    let ty = y - block / 2 + (n.shape === 'cylinder' ? 5 : 0);
    const text = make('text', { class: 'flw-label', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g);
    rows.forEach(([line, lh, cls], i) => {
      if (i) ty += lh;
      make('tspan', { x: tx, y: ty, ...(cls ? { class: cls } : {}) }, text).textContent = line;
    });
    if (corner) {
      const [cx, cy] = cornerAt(n);
      if (isLogo(n.icon)) drawIcon(g, n.icon, cx, cy, 20, base);
      else {
        make('circle', { class: 'flw-chip', cx, cy, r: 12 }, g);
        drawIcon(g, n.icon, cx, cy, 15, base);
      }
    }
    return g;
  }

  // Default edge-label spot: just above the middle of the longest horizontal segment, or right of
  // the longest vertical one.
  function labelSpot(m) {
    const seg = m.segs.reduce((a, b) => (b.len > a.len ? b : a));
    const mx = (seg.ax + seg.bx) / 2;
    const my = (seg.ay + seg.by) / 2;
    return seg.ay === seg.by ? [mx, my - 8, 'middle'] : [mx + 8, my + 4, 'start'];
  }

  // Map backdrop: a graticule every `map.graticule` degrees (default 30, 0 for none) and the land
  // outline, both clipped to the crop. Without the land data (wrong map name) only the grid shows.
  function drawMap(svg, defs, id, p, holder, m) {
    const g = make('g', { class: 'flw-map', 'clip-path': `url(#${id}-clip)`, 'aria-hidden': 'true' }, svg);
    const clip = make('clipPath', { id: `${id}-clip` }, defs);
    const [x0, y0, x1, y1] = [p.x(p.lon0), p.y(p.lat0), p.x(p.lon1), p.y(p.lat1)];
    make('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, rx: 10 }, clip);
    make('rect', { class: 'flw-map-sea', x: x0, y: y0, width: x1 - x0, height: y1 - y0, rx: 10 }, g);
    const step = m.graticule ?? 30;
    if (step > 0) {
      let d = '';
      for (let lon = Math.ceil(p.lon0 / step) * step; lon <= p.lon1; lon += step) d += `M${p.x(lon)},${y0}V${y1}`;
      for (let lat = Math.ceil(p.lat1 / step) * step; lat <= p.lat0; lat += step) d += `M${x0},${p.y(lat)}H${x1}`;
      make('path', { class: 'flw-graticule', d }, g);
    }
    const land = holder ? JSON.parse(holder.textContent).land : null;
    if (land) make('path', { class: 'flw-map-land', d: land, transform: `translate(${p.ox},${p.oy}) scale(${p.k})` }, g);
  }

  function init(root) {
    const data = JSON.parse(root.querySelector('.flw-data').textContent);
    const svg = root.querySelector('.flw-svg');
    const scroller = root.querySelector('.flw-scroll');
    const id = 'flw' + ++uid;

    // Defs: arrow markers (one per tone) and the glow filter for lit nodes.
    const defs = make('defs', {}, svg);
    for (const kind of ['base', ...TONES]) {
      const m = make('marker', { id: `${id}-${kind}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
      make('path', { d: 'M0,0 L10,5 L0,10 z', class: `flw-marker flw-marker-${kind}` }, m);
    }
    const glow = make('filter', { id: `${id}-glow`, x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs);
    make('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 5, result: 'b' }, glow);
    const merge = make('feMerge', {}, glow);
    make('feMergeNode', { in: 'b' }, merge);
    make('feMergeNode', { in: 'SourceGraphic' }, merge);

    const proj = projector(data);
    if (proj) drawMap(svg, defs, id, proj, root.querySelector('.flw-map-data'), data.map);

    const lanes = make('g', { class: 'flw-lanes' }, svg);
    for (const l of data.lanes || []) {
      make('rect', { class: 'flw-lane', x: l.x, y: l.y, width: l.w, height: l.h, rx: 12 }, lanes);
      make('text', { class: 'flw-lane-label', x: l.x + 14, y: l.y + 20 }, lanes).textContent = l.label;
    }

    const edgeLayer = make('g', { class: 'flw-edges' }, svg);
    const nodeLayer = make('g', { class: 'flw-nodes' }, svg);
    const pointerLayer = make('g', { class: 'flw-pointers' }, svg);

    // Box colour: explicit `color`, a tone, the icon's role, else one colour per column.
    const placed = data.nodes.map((raw) => place(raw, data.grid, proj));
    const cols = [...new Set(placed.map((n) => Math.round(n.x)))].sort((p, q) => p - q);
    const TONE_C = { fail: '#EF4444', ok: '#22C55E', warn: '#F59E0B' };
    const logoRole = (icon) => LOGO_ROLE[String(icon).replace(/^\/+/, '').split('/')[0]] || 'indigo';
    const base = root.dataset.iconBase || '/assets/img/icons/';
    const nodes = {};
    for (const n of placed) {
      const role = n.icon ? (isLogo(n.icon) ? logoRole(n.icon) : ROLE[n.icon]) : null;
      const auto = data.colors === 'accent' ? null : role || CYCLE[cols.indexOf(Math.round(n.x)) % CYCLE.length];
      n.c = n.tone ? TONE_C[n.tone] : colorOf(n.color || auto) || 'var(--flw-accent)';
      nodes[n.id] = { ...n, g: drawNode(nodeLayer, n, base) };
    }

    const edges = {};
    const usedKinds = new Set();
    const labelLayer = make('g', { class: 'flw-edge-labels' }, svg);
    for (const e of data.edges) {
      const a = nodes[e.from];
      const b = nodes[e.to];
      const curve = curveOf(e, a, b);
      const pts = e.points || (curve != null ? arc(a, b, curve) : route(a, b, e));
      const d = 'M' + pts.map((p) => p.join(',')).join(' L');
      const m = measure(pts);
      const tone = TONES.includes(e.tone) ? e.tone : 'lit';
      const arrow = e.arrow !== false;
      // Communication kind colours the trail, glow, dots, pill and arrowhead (tones still win).
      const kind = tone === 'lit' ? kindOf(e) : null;
      const kc = kind && KINDS[kind] ? KINDS[kind][0] : null;
      const kstyle = kc ? { style: `--flw-e: ${kc}` } : {};
      if (kc) usedKinds.add(kind);
      const marker = kc ? `k-${kind}` : tone;
      if (kc && !defs.querySelector(`#${id}-k-${kind}`)) {
        const mk = make('marker', { id: `${id}-k-${kind}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
        make('path', { d: 'M0,0 L10,5 L0,10 z', fill: kc }, mk);
      }
      // Streaming edges (default for curves) keep a glow and moving dots once the pointer has arrived.
      const flowing = (e.flow ?? curve != null) && !reduceMotion;
      const glow = flowing ? make('path', { class: `flw-edge-glow flw-tone-${tone}`, d, ...kstyle }, edgeLayer) : null;
      const baseEl = make('path', { class: 'flw-edge' + (e.dashed ? ' flw-dashed' : ''), d, ...(arrow ? { 'marker-end': `url(#${id}-base)` } : {}) }, edgeLayer);
      const lit = make('path', { class: `flw-edge-lit flw-tone-${tone}`, d, 'stroke-dasharray': `${m.total} ${m.total}`, ...kstyle }, edgeLayer);
      let flow = null;
      if (flowing) {
        flow = make('g', { class: `flw-flow flw-tone-${tone}`, style: `display:none;${kc ? `--flw-e:${kc}` : ''}` }, edgeLayer);
        const dur = `${Math.max(1.4, m.total / 140).toFixed(2)}s`;
        [0, 0.5].forEach((lag, i) => {
          const dot = make('circle', { r: i ? 3 : 4 }, flow);
          const begin = `-${(parseFloat(dur) * lag).toFixed(2)}s`;
          make('animateMotion', { dur, begin, repeatCount: 'indefinite', path: d }, dot);
          make('animate', { attributeName: 'opacity', values: '0.15;0.95;0.15', dur, begin, repeatCount: 'indefinite' }, dot);
        });
      }
      // `proto`/`port` become a code-font pill on the middle of the longest segment ("HTTPS :443");
      // a plain label then moves clear of it.
      const pillText = [e.proto, e.port != null ? `:${e.port}` : null].filter(Boolean).join(' ');
      let pill = null;
      let pillAt = null;
      if (pillText) {
        const seg = m.segs.reduce((p, q) => (q.len > p.len ? q : p));
        pillAt = e.proto_at || (curve != null ? (({ x, y }) => [x, y])(pointAt(m, m.total / 2)) : [(seg.ax + seg.bx) / 2, (seg.ay + seg.by) / 2]);
        const pw = pillText.length * 6.8 + 14;
        pill = make('g', { class: `flw-badge flw-proto flw-tone-${tone}`, ...kstyle }, labelLayer);
        make('rect', { x: pillAt[0] - pw / 2, y: pillAt[1] - 10, width: pw, height: 20, rx: 10 }, pill);
        make('text', { x: pillAt[0], y: pillAt[1], 'text-anchor': 'middle', 'dominant-baseline': 'central' }, pill).textContent = pillText;
      }
      // Labels on curves (or with `badge: true`) are pills centred on the line, like a latency figure.
      let badge = null;
      if (e.label && !pill && (e.badge ?? curve != null)) {
        const mid = pointAt(m, m.total / 2);
        const [bx, by] = e.label_at || [mid.x, mid.y];
        const bw = String(e.label).length * 7.4 + 16;
        badge = make('g', { class: `flw-badge flw-tone-${tone}`, ...kstyle }, labelLayer);
        make('rect', { x: bx - bw / 2, y: by - 11, width: bw, height: 22, rx: 7 }, badge);
        make('text', { x: bx, y: by, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, badge).textContent = e.label;
      } else if (e.label) {
        let [lx, ly, anchorText] = e.label_at ? [...e.label_at, 'middle'] : labelSpot(m);
        if (pill && !e.label_at) [lx, ly] = anchorText === 'middle' ? [pillAt[0], pillAt[1] - 16] : [pillAt[0] + 8, pillAt[1] + 22];
        make('text', { class: 'flw-edge-label', x: lx, y: ly, 'text-anchor': anchorText }, edgeLayer).textContent = e.label;
      }
      const pointer = make('g', { class: 'flw-pointer', style: 'display:none' }, pointerLayer);
      make('circle', { class: 'flw-halo', r: 14 }, pointer);
      make('path', { class: 'flw-head', d: 'M-9,-8 L11,0 L-9,8 L-4,0 z' }, pointer);
      edges[e.id] = { ...e, tone, marker, m, base: baseEl, lit, glow, flow, badge, pill, arrow, pointer };
    }
    // Badges sit above nodes and trails so the figures stay readable; pointers stay on top.
    svg.appendChild(labelLayer);
    svg.appendChild(pointerLayer);

    // Legend for the communication kinds in use, under the diagram.
    if (usedKinds.size) {
      const legend = document.createElement('div');
      legend.className = 'flw-legend';
      for (const k of Object.keys(KINDS).filter((x) => usedKinds.has(x))) {
        const item = document.createElement('span');
        item.style.setProperty('--flw-e', KINDS[k][0]);
        item.textContent = KINDS[k][1];
        legend.appendChild(item);
      }
      scroller.after(legend);
    }

    // Run modes: the checkbox switches between the first two. Steps with `when` belong to one mode.
    const modes = data.modes || [{ id: 'default' }];
    let mode = modes[0].id;

    // Player state. `k` is the last committed step; while `phase` is 'anim' the pointer is
    // travelling towards step k + 1.
    let steps = [];
    let k = 0;
    let phase = 'dwell';
    let t = 0;
    let playing = false;
    let speedIdx = 1;
    let lastNow = null;
    let touched = false;

    const caption = root.querySelector('.flw-caption');
    const controls = root.querySelector('.flw-controls');
    const dots = root.querySelector('.flw-dots');
    const playBtn = controls.querySelector('[data-act="play"]');

    function buildSteps() {
      steps = data.steps
        .filter((s) => !s.when || s.when === mode)
        .map((s) => {
          const es = s.edges || [];
          const lights = s.lights || [...new Set(es.map((eid) => edges[eid].to))];
          const maxLen = Math.max(0, ...es.map((eid) => edges[eid].m.total));
          return { ...s, edges: es, lights, maxLen };
        });
      dots.textContent = '';
      steps.forEach((s, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'flw-dot';
        b.setAttribute('aria-label', `Step ${i + 1}: ${s.title}`);
        b.addEventListener('click', () => {
          touched = true;
          jump(i);
        });
        dots.appendChild(b);
      });
    }

    function setCaption(i) {
      const s = steps[i];
      caption.querySelector('.flw-counter').textContent = `${i + 1}/${steps.length}`;
      caption.querySelector('.flw-step-title').textContent = s.title;
      caption.querySelector('.flw-step-text').textContent = s.text;
      [...dots.children].forEach((d, j) => {
        d.classList.toggle('is-done', j < i);
        d.classList.toggle('is-current', j === i);
      });
    }

    function render(dist) {
      const live = dist != null ? steps[k + 1] : null;
      const doneEdges = new Set();
      const litNodes = new Set();
      // A step with `clear: true` starts a fresh pass (a new loop iteration): earlier light is dropped.
      let from = 0;
      for (let i = 0; i <= k; i++) if (steps[i].clear) from = i;
      if (live && live.clear) from = k + 1;
      for (let i = from; i <= k; i++) {
        steps[i].edges.forEach((e) => doneEdges.add(e));
        steps[i].lights.forEach((n) => litNodes.add(n));
      }
      let active = new Set(live && live.clear ? [] : steps[k].lights);
      let followX = null;

      for (const e of Object.values(edges)) {
        const running = live && live.edges.includes(e.id);
        const reached = running ? Math.min(dist, e.m.total) : 0;
        // An edge already drawn stays lit while the pointer travels it again (loops).
        const drawn = doneEdges.has(e.id) ? e.m.total : reached;
        const arrived = drawn >= e.m.total;
        e.lit.style.strokeDashoffset = e.m.total - drawn;
        e.lit.style.opacity = drawn > 0 ? 1 : 0;
        if (e.arrow) e.base.setAttribute('marker-end', `url(#${id}-${arrived ? e.marker : 'base'})`);
        if (e.glow) e.glow.classList.toggle('is-on', arrived);
        if (e.flow) e.flow.style.display = arrived ? '' : 'none';
        if (e.badge) e.badge.classList.toggle('is-lit', drawn > 0);
        if (e.pill) e.pill.classList.toggle('is-lit', drawn > 0);
        if (running && reached > 0 && reached < e.m.total) {
          const p = pointAt(e.m, reached);
          e.pointer.style.display = '';
          followX = Math.max(followX ?? 0, p.x);
          e.pointer.setAttribute('transform', `translate(${p.x},${p.y}) rotate(${p.angle})`);
        } else {
          e.pointer.style.display = 'none';
        }
      }

      if (live) {
        const arrivedNow = live.lights.filter((nid) =>
          live.edges.filter((eid) => edges[eid].to === nid).every((eid) => dist >= edges[eid].m.total)
        );
        if (arrivedNow.length) {
          arrivedNow.forEach((n) => litNodes.add(n));
          active = new Set(arrivedNow);
        }
      }

      if (followX == null && active.size) followX = Math.max(...[...active].map((nid) => nodes[nid].x));
      follow(followX);

      for (const n of Object.values(nodes)) {
        n.g.classList.toggle('is-lit', litNodes.has(n.id));
        n.g.classList.toggle('is-active', active.has(n.id));
        if (active.has(n.id)) n.g.setAttribute('filter', `url(#${id}-glow)`);
        else n.g.removeAttribute('filter');
      }
    }

    // On narrow screens the diagram scrolls sideways; keep the pointer (or the lit node) in view.
    function follow(x) {
      const room = scroller.clientWidth;
      if (!(x > 0) || scroller.scrollWidth <= room) return;
      const px = (x / data.viewbox[0]) * svg.clientWidth;
      if (px < scroller.scrollLeft + 48 || px > scroller.scrollLeft + room - 48) {
        scroller.scrollLeft = px - room / 2;
      }
    }

    const duration = (i) => (reduceMotion ? 0 : 500 + steps[i].maxLen * 1.6);

    function commit(i) {
      k = i;
      phase = 'dwell';
      t = 0;
      render();
      setCaption(k);
    }

    function jump(i) {
      setPlaying(false);
      commit(Math.max(0, Math.min(i, steps.length - 1)));
    }

    function frame(now) {
      if (!playing) {
        lastNow = null;
        return;
      }
      const dt = lastNow == null ? 0 : Math.min(now - lastNow, 64) * SPEEDS[speedIdx];
      lastNow = now;
      t += dt;
      if (phase === 'dwell') {
        const atEnd = k >= steps.length - 1;
        if (t >= (atEnd ? END_MS : DWELL_MS)) {
          if (atEnd) {
            if (data.loop === false) {
              setPlaying(false);
              return;
            }
            commit(0);
          } else {
            phase = 'anim';
            t = 0;
            setCaption(k + 1);
          }
        }
      }
      if (phase === 'anim') {
        const D = duration(k + 1);
        const p = D ? Math.min(t / D, 1) : 1;
        if (p >= 1) commit(k + 1);
        else render(ease(p) * steps[k + 1].maxLen);
      }
      requestAnimationFrame(frame);
    }

    function setPlaying(on) {
      const was = playing;
      playing = on;
      playBtn.innerHTML = `<i class="fas fa-${on ? 'pause' : 'play'}" aria-hidden="true"></i>`;
      playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play');
      if (on && !was) {
        // Resuming from a paused mid-flight step continues from where it stopped.
        lastNow = null;
        requestAnimationFrame(frame);
      }
    }

    controls.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-act]');
      if (!btn) return;
      touched = true;
      switch (btn.dataset.act) {
        case 'play':
          if (!playing && k >= steps.length - 1) commit(0);
          setPlaying(!playing);
          break;
        case 'prev':
          jump(phase === 'anim' ? k : k - 1);
          break;
        case 'next':
          jump(k + 1);
          break;
        case 'restart':
          commit(0);
          setPlaying(true);
          break;
        case 'speed':
          speedIdx = (speedIdx + 1) % SPEEDS.length;
          btn.textContent = `${SPEEDS[speedIdx]}×`;
          break;
      }
    });
    controls.querySelector('[data-act="mode"]')?.addEventListener('change', (ev) => {
      touched = true;
      mode = ev.target.checked && modes[1] ? modes[1].id : modes[0].id;
      buildSteps();
      commit(0);
      setPlaying(true);
    });

    buildSteps();
    commit(0);
    root.classList.add('is-ready');
    caption.hidden = false;
    controls.hidden = false;

    // Autoplay while the diagram is on screen, until the reader takes control.
    if (!reduceMotion && data.autoplay !== false && 'IntersectionObserver' in window) {
      new IntersectionObserver(
        ([entry]) => {
          if (!touched) setPlaying(entry.isIntersecting);
        },
        { threshold: 0.35 }
      ).observe(root);
    }
  }

  const start = () => document.querySelectorAll('figure.flw').forEach(init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
