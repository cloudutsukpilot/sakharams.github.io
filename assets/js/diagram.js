/*
 * Explorable diagrams (_includes/diagram.html, data in _data/diagrams/<post folders>/<name>.yml).
 *
 * A diagram is a tree of components. Level 0 shows the top-level components; each level expands one
 * more layer; clicking a component expands or collapses just that one. Components can carry `facts`
 * (what, how, when, where, why, url, api), `detail` (Markdown) and `config` (a snippet), shown in a
 * side panel. Layout is automatic (ELK layered,
 * left to right, wrapping top to bottom); the canvas pans and zooms like a map. Arrows attach to the
 * deepest components they connect; when a group is collapsed they are redrawn to it and merged.
 * Arrows carry a protocol pill, a colour per communication kind, continuous dots for streams (both
 * ways for WebSocket), and a hover card that animates the protocol's handshake or exchange.
 * An optional `tour` replays the old step-through stories: each step expands what it needs, moves the
 * camera there and sends a pointer along the arrows. `map:` puts lat/lon components on a world map.
 *
 * Data format: .claude/skills/cloudutsuk-diagram/SKILL.md (validate.py there reads the tables below).
 */
(() => {
  if (window.__cudDiagram) return;
  window.__cudDiagram = true;

  const NS = 'http://www.w3.org/2000/svg';
  const ELK_URL = 'https://cdn.jsdelivr.net/npm/elkjs@0.12.0/lib/elk.bundled.js';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEEDS = [0.5, 1, 2];
  const DWELL_MS = 1600;
  const ALL_VIEWS = '*'; // the Show all tab's id
  const MOVE_MS = reduceMotion ? 0 : 450;
  const DISC = 46; // icon disc diameter of a component, in diagram units

  // Named colours for `color:` (light and dark pages).
  const PALETTE = {
    blue: '#3B82F6', sky: '#0EA5E9', teal: '#14B8A6', green: '#22C55E', lime: '#84CC16', amber: '#F59E0B',
    orange: '#F97316', red: '#EF4444', rose: '#F43F5E', pink: '#EC4899', violet: '#8B5CF6', indigo: '#6366F1',
    slate: '#64748B'
  };
  const CYCLE = ['blue', 'violet', 'teal', 'amber', 'pink', 'sky', 'green', 'orange', 'indigo', 'rose'];
  // Role colour of each built-in system icon (process icons have none and take the cycle).
  const ROLE = {
    user: 'blue', users: 'blue', phone: 'blue', laptop: 'blue', browser: 'blue',
    globe: 'teal', router: 'teal', balancer: 'teal', firewall: 'teal', cloud: 'sky',
    server: 'violet', cpu: 'violet', cluster: 'violet', container: 'violet', function: 'violet', api: 'violet',
    database: 'amber', bucket: 'amber', queue: 'amber', file: 'amber', bolt: 'amber',
    lock: 'rose', key: 'rose', shield: 'rose', cert: 'rose',
    chart: 'green', bell: 'green',
    mail: 'pink', message: 'pink'
  };
  const LOGO_ROLE = { databases: 'amber', devsecops: 'rose', iam: 'rose', cloud: 'sky', devops: 'orange', programming: 'indigo', operatingsystems: 'violet', virtualization: 'violet' };
  const TONE_C = { fail: '#EF4444', ok: '#22C55E', warn: '#F59E0B' };
  // Communication kinds: colour and legend text.
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
    SQL: 'data', POSTGRESQL: 'data', POSTGRES: 'data', MYSQL: 'data', TDS: 'data', MSSQL: 'data', REDIS: 'data', RESP: 'data', MONGODB: 'data', CQL: 'data', NFS: 'data', SMB: 'data', S3: 'data', JDBC: 'data', ODBC: 'data', QDRANT: 'data',
    OTLP: 'telemetry', PROMETHEUS: 'telemetry', SYSLOG: 'telemetry', STATSD: 'telemetry', GELF: 'telemetry', LOKI: 'telemetry',
    DNS: 'control', TLS: 'control', OIDC: 'control', OAUTH: 'control', OAUTH2: 'control', SAML: 'control', LDAP: 'control', LDAPS: 'control', KERBEROS: 'control', SSH: 'control', NTP: 'control', BGP: 'control', RDP: 'control'
  };
  const protoKey = (p) => String(p || '').toUpperCase().split(/[\s/+.-]/)[0];
  const kindOf = (e) => e.kind || PROTO_KIND[protoKey(e.proto)] || null;
  const colorOf = (c) => PALETTE[c] || c;

  // Icons, drawn in a 24 x 24 box centred on 0,0.
  const ICONS = {
    server: '<rect x="-8" y="-9" width="16" height="8" rx="1.5"/><rect x="-8" y="1" width="16" height="8" rx="1.5"/><circle class="dgm-ifill" cx="4" cy="-5" r="1.3"/><circle class="dgm-ifill" cx="4" cy="5" r="1.3"/>',
    database: '<path d="M-8,-6 a8,3 0 0 1 16,0 v12 a8,3 0 0 1 -16,0 z"/><path d="M-8,-6 a8,3 0 0 0 16,0 M-8,0 a8,3 0 0 0 16,0"/>',
    user: '<circle cx="0" cy="-4" r="4.5"/><path d="M-8,9 a8,7.5 0 0 1 16,0"/>',
    users: '<circle cx="-3.5" cy="-4" r="3.5"/><path d="M-10,8 a6.5,6 0 0 1 13,0"/><circle cx="5" cy="-2" r="3"/><path d="M2.5,4.5 a5.5,5 0 0 1 8,3.5"/>',
    globe: '<circle cx="0" cy="0" r="9"/><ellipse cx="0" cy="0" rx="4" ry="9"/><path d="M-9,0 h18 M-7.5,-4.5 h15 M-7.5,4.5 h15"/>',
    cloud: '<path d="M-6,7 h12.5 a4.5,4.5 0 0 0 0.5,-9 a6.5,6.5 0 0 0 -12.5,-1.5 a5.2,5.2 0 0 0 -0.5,10.5 z"/>',
    phone: '<rect x="-5.5" y="-9.5" width="11" height="19" rx="2.5"/><path d="M-1.5,6.5 h3"/>',
    laptop: '<rect x="-7" y="-7" width="14" height="10" rx="1.5"/><path d="M-10,6.5 h20"/>',
    lock: '<rect x="-6.5" y="-1" width="13" height="10" rx="2"/><path d="M-4,-1 v-3 a4,4 0 0 1 8,0 v3"/>',
    bolt: '<path class="dgm-ifill" d="M2,-10 L-6,1.5 H0 L-2,10 L6,-1.5 H0 Z"/>',
    queue: '<rect x="-9.5" y="-6" width="19" height="12" rx="2"/><path d="M-3,-6 v12 M3,-6 v12"/>',
    balancer: '<circle cx="0" cy="-7" r="2.5"/><path d="M0,-4.5 V0 M0,0 L-7,6 M0,0 V6 M0,0 L7,6"/><circle class="dgm-ifill" cx="-7" cy="7.5" r="1.8"/><circle class="dgm-ifill" cx="0" cy="7.5" r="1.8"/><circle class="dgm-ifill" cx="7" cy="7.5" r="1.8"/>',
    browser: '<rect x="-10" y="-8" width="20" height="16" rx="2"/><path d="M-10,-3.5 h20"/><circle class="dgm-ifill" cx="-7" cy="-5.8" r="0.9"/><circle class="dgm-ifill" cx="-4.3" cy="-5.8" r="0.9"/>',
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
    cross: '<circle cx="0" cy="0" r="9"/><path d="M-3.8,-3.8 L3.8,3.8 M3.8,-3.8 L-3.8,3.8"/>',
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
    cpu: '<rect x="-6" y="-6" width="12" height="12" rx="1.5"/><path d="M-3,-9 v3 M3,-9 v3 M-3,6 v3 M3,6 v3 M-9,-3 h3 M-9,3 h3 M6,-3 h3 M6,3 h3"/>'
  };
  const isLogo = (icon) => /[/.]/.test(String(icon || ''));

  // Protocol cards: what happens on the wire, as a little sequence diagram. Each message is
  // [direction, text, note]: '>' client to server, '<' back, '<>' both ways (a stream).
  const CARDS = {
    tcp: { title: 'TCP handshake', msgs: [['>', 'SYN', 'client picks a sequence number'], ['<', 'SYN-ACK', 'server acknowledges and picks its own'], ['>', 'ACK', 'connection open; data can flow']] },
    tls: { title: 'TLS 1.3 handshake', msgs: [['>', 'ClientHello', 'cipher suites, key share, SNI'], ['<', 'ServerHello + Certificate + Finished', 'key share; certificate proves the server'], ['>', 'Finished', 'keys agreed in 1 round trip; data is now encrypted']] },
    http: { title: 'HTTP request', msgs: [['>', 'Request', 'method, path, headers, body'], ['<', 'Response', 'status, headers, body']] },
    websocket: { title: 'WebSocket', msgs: [['>', 'GET + Upgrade: websocket', 'starts as HTTP'], ['<', '101 Switching Protocols', 'same TCP connection, now full duplex'], ['<>', 'frames both ways', 'either side sends at any time']] },
    sse: { title: 'Server-Sent Events', msgs: [['>', 'GET Accept: text/event-stream', 'one long-lived request'], ['<', 'event: …', 'server pushes events'], ['<', 'event: …', 'client reconnects with Last-Event-ID']] },
    grpc: { title: 'gRPC over HTTP/2', msgs: [['>', 'HEADERS :path /svc/Method', 'one HTTP/2 stream per call'], ['<>', 'DATA (protobuf) both ways', 'unary, server, client or bidi streaming'], ['<', 'trailers grpc-status', 'call result']] },
    kafka: { title: 'Kafka produce / consume', msgs: [['>', 'Produce to topic partition', 'producer → broker'], ['<', 'ack (acks=all)', 'after replicas have it'], ['>', 'Fetch from offset', 'consumer pulls; commits its offset']] },
    amqp: { title: 'AMQP publish', msgs: [['>', 'basic.publish to exchange', 'routing key decides the queue'], ['<', 'confirm', 'broker has the message'], ['<', 'deliver to consumer → ack', 'removed from the queue on ack']] },
    mqtt: { title: 'MQTT', msgs: [['>', 'CONNECT', 'client id, keep-alive'], ['<', 'CONNACK', 'session ready'], ['>', 'PUBLISH topic (QoS 1)', 'broker forwards to subscribers'], ['<', 'PUBACK', 'at least once']] },
    webhook: { title: 'Webhook delivery', msgs: [['>', 'POST event (signed)', 'HMAC signature, event id'], ['<', '2xx', 'receiver stores it, works later'], ['>', 'retry with backoff', 'only if no 2xx; receiver dedupes by id']] },
    oauth: { title: 'OAuth 2 / OIDC code flow', msgs: [['>', 'redirect to /authorize', 'client id, scopes, PKCE challenge'], ['<', 'redirect back with code', 'after the user signs in'], ['>', 'POST /token (code + verifier)', 'back channel'], ['<', 'id_token, access_token', 'signed JWTs']] },
    kerberos: { title: 'Kerberos', msgs: [['>', 'AS-REQ', 'ask the KDC for a ticket-granting ticket'], ['<', 'AS-REP (TGT)', ''], ['>', 'TGS-REQ for a service', ''], ['<', 'TGS-REP (service ticket)', 'then AP-REQ to the service']] },
    stream: { title: 'Continuous stream', msgs: [['>', 'batch', 'sent as data arrives'], ['>', 'batch', ''], ['>', 'batch', 'the arrow keeps moving while data flows']] },
    query: { title: 'Request and reply', msgs: [['>', 'query / command', 'over a pooled TCP connection'], ['<', 'result', '']] }
  };
  // Which cards an arrow gets, from its protocol (`cards:` on the edge overrides; `tls: true` adds TLS).
  function cardsFor(e) {
    if (e.cards) return e.cards.filter((c) => CARDS[c]);
    const p = protoKey(e.proto);
    const tls = e.tls ?? (['HTTPS', 'WSS', 'AMQPS', 'MQTTS', 'LDAPS'].includes(p) || e.port === 443);
    const map = {
      HTTP: ['tcp', 'http'], HTTPS: ['tcp', 'tls', 'http'], REST: ['http'], GRAPHQL: ['http'], SOAP: ['http'],
      GRPC: ['grpc'], WS: ['websocket'], WSS: ['websocket'], WEBSOCKET: ['websocket'], SSE: ['sse'],
      KAFKA: ['kafka'], AMQP: ['amqp'], AMQPS: ['amqp'], MQTT: ['mqtt'], MQTTS: ['mqtt'], WEBHOOK: ['webhook'],
      OIDC: ['oauth'], OAUTH: ['oauth'], OAUTH2: ['oauth'], KERBEROS: ['kerberos'], OTLP: ['stream'], PROMETHEUS: ['stream'],
      POSTGRESQL: ['tcp', 'query'], POSTGRES: ['tcp', 'query'], MYSQL: ['tcp', 'query'], REDIS: ['query'], QDRANT: ['query'], TDS: ['tcp', 'query']
    };
    const list = [...(map[p] || [])];
    if (tls && !list.includes('tls')) list.splice(list.includes('tcp') ? 1 : 0, 0, 'tls');
    return list;
  }

  const make = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  };
  const html = (tag, cls, parent, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  };
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // A component's panel, by importance: a status badge (`status`, `phase`), `where` and `when` as chips,
  // a `summary` lead sentence (what it is and why it's here), `how` it works, `url` as link buttons and
  // `api` as copyable lines. `url` takes a string, a list, or a map of button label to address; `api`
  // takes a string or a list (Markdown; a bare address or one `code` span gets a Copy button).
  const FACTS = ['summary', 'how', 'where', 'when', 'url', 'api'];
  const STATUS = { built: 'Built', planned: 'Planned', deferred: 'Deferred', external: 'External' };
  const hasInfo = (n) => !!(n.detail || n.config || n.facts);

  // Small, safe Markdown: paragraphs, lists, **bold**, *italic*, `code`, [links](url). HTML is escaped.
  function markdown(src) {
    const inline = (t) =>
      esc(t)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]+)\)/g, '<a href="$2">$1</a>');
    const out = [];
    let list = null;
    for (const raw of String(src || '').split('\n')) {
      const line = raw.trimEnd();
      const li = line.match(/^\s*[-*] (.*)/);
      if (li) {
        if (!list) out.push((list = []));
        list.push(`<li>${inline(li[1])}</li>`);
        continue;
      }
      list = null;
      if (line.trim()) out.push(`<p>${inline(line)}</p>`);
    }
    return out.map((x) => (Array.isArray(x) ? `<ul>${x.join('')}</ul>` : x)).join('').replace(/<\/p><p>/g, ' ');
  }

  // Wrap a label into lines of at most `max` characters.
  function wrap(text, max) {
    const lines = [];
    for (const part of String(text).split('\n')) {
      let cur = '';
      for (const w of part.split(' ')) {
        if (cur && (cur + ' ' + w).length > max) {
          lines.push(cur);
          cur = w;
        } else cur = cur ? cur + ' ' + w : w;
      }
      lines.push(cur);
    }
    return lines;
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
    return { x: seg.ax + (seg.bx - seg.ax) * t, y: seg.ay + (seg.by - seg.ay) * t, angle: (Math.atan2(seg.by - seg.ay, seg.bx - seg.ax) * 180) / Math.PI };
  }
  function nearestOnPath(m, x, y) {
    let best = null;
    for (const s of m.segs) {
      const L2 = s.len * s.len || 1;
      const t = Math.max(0, Math.min(1, ((x - s.ax) * (s.bx - s.ax) + (y - s.ay) * (s.by - s.ay)) / L2));
      const px = s.ax + (s.bx - s.ax) * t;
      const py = s.ay + (s.by - s.ay) * t;
      const d = Math.hypot(px - x, py - y);
      if (!best || d < best.d) best = { d, x: px, y: py, along: s.start + s.len * t };
    }
    return best;
  }

  let elkPromise = null;
  function loadElk() {
    if (window.ELK) return Promise.resolve(new window.ELK());
    elkPromise =
      elkPromise ||
      new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = ELK_URL;
        s.onload = () => resolve(new window.ELK());
        s.onerror = () => reject(new Error('ELK failed to load'));
        document.head.appendChild(s);
      });
    return elkPromise;
  }

  // Equirectangular projection for `map: {lon: [west, east], lat: [north, south]}` (geo diagrams).
  function projector(map, VW, VH) {
    const [lon0, lon1] = map.lon || [-180, 180];
    const [lat0, lat1] = map.lat || [80, -58];
    const k = Math.min(VW / (lon1 - lon0), VH / (lat0 - lat1));
    return { k, lon0, lon1, lat0, lat1, x: (lon) => k * (lon - lon0), y: (lat) => k * (lat0 - lat) };
  }

  class Diagram {
    constructor(root) {
      this.root = root;
      this.data = JSON.parse(root.querySelector('.dgm-data').textContent);
      this.base = root.dataset.iconBase || '/assets/img/icons/';
      this.uid = root.id;
      this.svg = root.querySelector('.dgm-svg');
      this.stage = root.querySelector('.dgm-stage');
      this.cam = { x: 0, y: 0, k: 1 };
      this.pos = new Map(); // id -> {x, y, w, h} of the current layout
      this.lit = { nodes: new Set(), edges: new Set(), active: new Set() };
      this.buildModel();
      this.buildChrome();
      this.clearUrlState();
      this.relayout({ fit: true, animate: false }).then(() => root.classList.add('is-ready'));
    }

    // ---------------------------------------------------------------- model
    buildModel() {
      const d = this.data;
      this.nodes = new Map();
      this.top = [];
      let maxDepth = 0;
      const walk = (raw, parent, depth) => {
        const n = { ...raw, parent, depth, kids: [] };
        this.nodes.set(n.id, n);
        maxDepth = Math.max(maxDepth, depth);
        (raw.children || []).forEach((c) => n.kids.push(walk(c, n, depth + 1)));
        return n;
      };
      (d.nodes || []).forEach((raw) => this.top.push(walk(raw, null, 0)));
      // The deepest level is one past the deepest group (that level shows everything).
      this.maxLevel = Math.max(0, ...[...this.nodes.values()].filter((n) => n.kids.length).map((n) => n.depth + 1));
      // Views: `view:` puts an edge in one or more view tabs (hidden from the main view unless
      // `main: true`); `views:` on a component shows it only in those tabs.
      this.views = d.views || [];
      this.activeView = null;
      this.edges = (d.edges || []).map((e, i) => {
        const vl = [].concat(e.view || []);
        return { ...e, id: e.id || `e${i}`, kind: kindOf(e), viewList: vl, mainFlow: !vl.length || !!e.main };
      });
      this.edgeById = new Map(this.edges.map((e) => [e.id, e]));
      // Planned and deferred components get the warn tone unless they set their own.
      for (const n of this.nodes.values()) if (!n.tone && (n.status === 'planned' || n.status === 'deferred')) n.tone = 'warn';
      // Colours: explicit, tone, icon role, else by top-level position.
      let ci = 0;
      const colour = (n, inherited) => {
        const role = n.icon ? (isLogo(n.icon) ? LOGO_ROLE[String(n.icon).replace(/^\/+/, '').split('/')[0]] || 'indigo' : ROLE[n.icon]) : null;
        n.c = n.tone ? TONE_C[n.tone] : colorOf(n.color || role) || inherited || PALETTE[CYCLE[ci++ % CYCLE.length]];
        n.kids.forEach((k) => colour(k, n.kids.length > 1 && !k.color && !k.icon ? null : null));
      };
      this.top.forEach((n) => colour(n, null));
      this.level = Math.min(d.level ?? 1, this.maxLevel);
      this.expanded = this.expandedForLevel(this.level);
    }

    expandedForLevel(level) {
      return new Set([...this.nodes.values()].filter((n) => n.kids.length && n.depth < level).map((n) => n.id));
    }
    // A component limited to some views exists only while one of them is the active tab.
    // While a use case runs (showAll) every view's components and arrows are on the canvas.
    shown(n) {
      if (this.showAll) return true;
      for (let p = n; p; p = p.parent) if (p.views && !(this.activeView && p.views.includes(this.activeView))) return false;
      return true;
    }
    edgeShown(e) {
      return this.showAll || e.mainFlow || (this.activeView && e.viewList.includes(this.activeView));
    }
    isVisible(n) {
      if (!this.shown(n)) return false;
      for (let p = n.parent; p; p = p.parent) if (!this.expanded.has(p.id)) return false;
      return true;
    }
    // The visible component that stands for `id`: itself, or its nearest collapsed ancestor.
    repOf(id) {
      let n = this.nodes.get(id);
      if (!n || !this.shown(n)) return null;
      const chain = [];
      for (let p = n; p; p = p.parent) chain.unshift(p);
      for (const p of chain) if (!this.expanded.has(p.id) || p === n) return p;
      return n;
    }
    ancestorsOf(id) {
      const out = [];
      for (let p = this.nodes.get(id)?.parent; p; p = p.parent) out.push(p);
      return out;
    }

    // ---------------------------------------------------------------- chrome (controls, panel, card)
    buildChrome() {
      const r = this.root;
      this.view = make('g', { class: 'dgm-view' }, this.svg);
      this.defs = make('defs', {}, this.svg);
      if (this.data.map) this.mapLayer = make('g', { class: 'dgm-map' }, this.view);
      this.groupLayer = make('g', { class: 'dgm-groups' }, this.view);
      this.edgeLayer = make('g', { class: 'dgm-edges' }, this.view);
      this.nodeLayer = make('g', { class: 'dgm-nodes' }, this.view);
      this.pillLayer = make('g', { class: 'dgm-pills' }, this.view);
      this.pointerLayer = make('g', { class: 'dgm-pointers' }, this.view);
      const glow = make('filter', { id: `${this.uid}-glow`, x: '-40%', y: '-40%', width: '180%', height: '180%' }, this.defs);
      make('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 5, result: 'b' }, glow);
      const merge = make('feMerge', {}, glow);
      make('feMergeNode', { in: 'b' }, merge);
      make('feMergeNode', { in: 'SourceGraphic' }, merge);

      // Toolbar: one button per level (clicking steps there layer by layer), zoom, fit, fullscreen.
      const bar = r.querySelector('.dgm-toolbar');
      const names = this.data.levels || [];
      const lv = html('div', 'dgm-levels', bar);
      lv.setAttribute('role', 'group');
      lv.setAttribute('aria-label', 'Detail level');
      this.levelBtns = [];
      for (let i = 0; i <= this.maxLevel; i++) {
        const b = html('button', 'dgm-lvl', lv);
        b.type = 'button';
        b.dataset.level = i;
        b.innerHTML = `<span class="dgm-lvl-num">Level ${i}</span>${names[i] ? `<span class="dgm-lvl-name">${esc(names[i])}</span>` : ''}`;
        b.title = names[i] ? `Level ${i}: ${names[i]}` : `Level ${i}`;
        b.addEventListener('click', () => this.stepToLevel(i));
        this.levelBtns.push(b);
      }
      const btn = (act, icon, label) => {
        const b = html('button', 'dgm-btn', bar);
        b.type = 'button';
        b.dataset.act = act;
        b.setAttribute('aria-label', label);
        b.title = label;
        b.innerHTML = `<i class="fas fa-${icon}" aria-hidden="true"></i>`;
        return b;
      };
      btn('zoom-in', 'plus', 'Zoom in');
      btn('zoom-out', 'minus', 'Zoom out');
      btn('fit', 'expand', 'Fit to view');
      btn('full', 'up-right-and-down-left-from-center', 'Fullscreen');
      bar.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-act]');
        if (!b) return;
        const a = b.dataset.act;
        if (a === 'zoom-in') this.zoomBy(1.25);
        if (a === 'zoom-out') this.zoomBy(0.8);
        if (a === 'fit') this.fit(true);
        if (a === 'full') this.toggleFull();
      });
      this.updateLevelLabel();

      // Legend.
      this.legend = r.querySelector('.dgm-legend');
      const used = new Set(this.edges.map((e) => e.kind).filter(Boolean));
      for (const k of Object.keys(KINDS).filter((x) => used.has(x))) {
        const s = html('span', '', this.legend, KINDS[k][1]);
        s.style.setProperty('--dgm-e', KINDS[k][0]);
      }

      // Side panel and hover card.
      this.panel = r.querySelector('.dgm-panel');
      this.panel.querySelector('.dgm-panel-close').addEventListener('click', () => this.closePanel());
      this.card = r.querySelector('.dgm-card');
      this.card.addEventListener('pointerenter', () => clearTimeout(this.cardTimer));
      this.card.addEventListener('pointerleave', () => this.hideCard());

      this.bindPanZoom();
      this.bindFullscreen();
      this.buildViews();
      this.buildTour();
    }

    updateLevelLabel() {
      (this.levelBtns || []).forEach((b, i) => {
        b.classList.toggle('is-on', i === this.level);
        b.classList.toggle('is-below', i < this.level);
        b.setAttribute('aria-pressed', i === this.level ? 'true' : 'false');
      });
    }

    // Go to a level one layer at a time: each layer opens (or closes) with its own animation, so the
    // reader sees the diagram grow. A newer click cancels a walk in progress.
    async stepToLevel(target) {
      this.before = null;
      const walk = (this.levelWalk = (this.levelWalk || 0) + 1);
      this.root.classList.add('is-stepping');
      const dir = target > this.level ? 1 : -1;
      if (target === this.level) await this.setLevel(target);
      while (this.level !== target && walk === this.levelWalk) {
        await this.setLevel(this.level + dir);
        if (this.level !== target && walk === this.levelWalk) await sleep(reduceMotion ? 0 : 350);
      }
      if (walk === this.levelWalk) this.root.classList.remove('is-stepping');
    }

    async setLevel(level) {
      this.level = level;
      this.expanded = this.expandedForLevel(level);
      this.updateLevelLabel();
      await this.relayout({ fit: true });
    }

    async toggle(id) {
      const n = this.nodes.get(id);
      if (!n || !n.kids.length) return;
      this.before = null;
      if (this.expanded.has(id)) {
        // Collapse the whole subtree, so re-expanding starts tidy.
        const drop = (x) => {
          this.expanded.delete(x.id);
          x.kids.forEach(drop);
        };
        drop(n);
      } else this.expanded.add(id);
      await this.relayout({ focus: id });
    }

    // ---------------------------------------------------------------- view tabs
    buildViews() {
      if (!this.views.length) return;
      const bar = html('div', 'dgm-views', this.stage);
      bar.setAttribute('role', 'tablist');
      bar.setAttribute('aria-label', 'Views');
      const count = (id) => (id === ALL_VIEWS ? this.edges.length : this.edges.filter((e) => (id ? e.viewList.includes(id) : e.mainFlow)).length);
      // Main flows first, the diagram's views, then Show all (every view's arrows and components).
      [{ id: null, label: 'Main flows', icon: 'api' }, ...this.views, { id: ALL_VIEWS, label: 'Show all', icon: 'cluster' }].forEach((v) => {
        const b = html('button', 'dgm-vtab', bar);
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.dataset.view = v.id || '';
        b.innerHTML = `<svg viewBox="-12 -12 24 24" aria-hidden="true"><g class="dgm-icon">${ICONS[v.icon] || ICONS.api}</g></svg><span>${esc(v.label)}</span><span class="dgm-vtab-n">${count(v.id)}</span>`;
        b.title = v.id === ALL_VIEWS ? 'Every connection of every view' : v.id ? `${v.label}: show and highlight its connections` : 'The main request flows';
        b.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.before = null;
          this.setView(v.id);
        });
        b.addEventListener('pointerdown', (ev) => ev.stopPropagation());
      });
      this.viewBar = bar;
      this.markView();
    }
    markView() {
      this.viewBar?.querySelectorAll('.dgm-vtab').forEach((b) => {
        const on = this.showAll ? b.dataset.view === ALL_VIEWS : (b.dataset.view || null) === this.activeView;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      this.root.classList.toggle('has-view', !!this.activeView);
      this.root.classList.toggle('is-showall', !!this.showAll);
    }
    async setView(id) {
      id = id || null;
      const all = id === ALL_VIEWS;
      if (all ? this.showAll : id === this.activeView && !this.showAll) return;
      this.showAll = all;
      this.activeView = all ? null : id;
      this.markView();
      await this.relayout({});
      // Bring what the view highlights into view (after the arrows are drawn).
      await sleep(MOVE_MS ? 60 : 0);
      if (this.activeView && this.viewHot && this.viewHot.size) {
        const b = this.box([...this.viewHot]);
        if (b) this.animateCam(this.camFor(b, 1.2));
      } else if (!this.activeView) this.overview(true);
    }
    // In a view: its arrows and the components they touch stand out; everything else fades.
    applyView() {
      const hot = new Set();
      for (const { v, g } of this.edgeEls?.values() || []) {
        const inView = !!this.activeView && v.list.some((e) => e.viewList.includes(this.activeView));
        g.classList.toggle('is-view', inView);
        g.classList.toggle('is-faded', !!this.activeView && !inView);
        if (inView) [v.from, v.to].forEach((x) => hot.add(x));
      }
      for (const [id, el] of this.nodeEls || []) {
        const n = this.nodes.get(id);
        const own = !!(n && n.views && this.activeView && n.views.includes(this.activeView));
        el.classList.toggle('is-faded', !!this.activeView && el.dataset.kind === 'leaf' && !hot.has(id) && !own);
        el.classList.toggle('is-view', !!this.activeView && (hot.has(id) || own));
      }
      for (const el of this.pillLayer.querySelectorAll('.dgm-pill')) el.classList.toggle('is-faded', !!this.activeView && !el.classList.contains('is-view'));
      this.viewHot = new Set([...hot, ...[...(this.nodeEls || new Map()).keys()].filter((id) => this.nodes.get(id)?.views?.includes(this.activeView))]);
    }

    // ---------------------------------------------------------------- load state
    // Every load opens at the diagram's start level (`level`, default 1) with the main view. Older
    // builds kept the layout in the URL (?dgm-<id>=…); drop that parameter so it can't come back.
    clearUrlState() {
      try {
        const url = new URL(location.href);
        if (!url.searchParams.has(this.uid)) return;
        url.searchParams.delete(this.uid);
        history.replaceState(history.state, '', url);
      } catch (e) {
        /* the URL is cosmetic */
      }
    }

    // ---------------------------------------------------------------- layout
    leafSize(n) {
      const lines = wrap(n.label, 16);
      const sub = n.sub ? wrap(n.sub, 20) : [];
      const w = Math.max(DISC + 34, ...lines.map((l) => l.length * 7.6 + 14), ...sub.map((l) => l.length * 6.9 + 14));
      const h = 6 + DISC + 10 + lines.length * 16 + sub.length * 14 + 6;
      return { w: Math.ceil(w), h: Math.ceil(h), lines, sub };
    }

    // Visible arrows: each data edge redrawn between the components that stand for its ends; arrows
    // with the same ends (and direction) merge into one.
    visibleEdges() {
      const merged = new Map();
      for (const e of this.edges) {
        if (e.when && this.mode && e.when !== this.mode) continue;
        if (!this.edgeShown(e)) continue;
        const a = this.repOf(e.from);
        const b = this.repOf(e.to);
        if (!a || !b || a === b) continue;
        // A group that contains the other end would draw an arrow onto its own frame: skip it.
        if (this.ancestorsOf(b.id).includes(a) || this.ancestorsOf(a.id).includes(b)) continue;
        const key = `${a.id}>${b.id}`;
        if (!merged.has(key)) merged.set(key, { key, from: a.id, to: b.id, list: [] });
        merged.get(key).list.push(e);
      }
      return [...merged.values()];
    }

    async relayout({ fit = false, focus = null, animate = true } = {}) {
      const token = (this.layoutToken = (this.layoutToken || 0) + 1);
      const vis = this.visibleEdges();
      this.vis = vis;
      const placed = this.data.map ? this.geoLayout() : await this.elkLayout(vis);
      if (token !== this.layoutToken) return; // a newer layout started meanwhile
      this.render(placed, vis, animate && MOVE_MS > 0);
      if (fit) this.overview(animate);
      else if (focus && this.pos.has(focus)) this.focusOn([focus], animate);
      if (animate && MOVE_MS) await sleep(MOVE_MS + 30);
    }

    // Layout: each open group is laid out on its own (compact), and an arrow that crosses group borders
    // is split into segments that leave through a port on each group's border (east side out, west
    // side in) and meet at the lowest group containing both ends. ELK routes every segment inside its
    // own group, and the segments between groups also decide how the groups are arranged.
    async elkLayout(vis) {
      const elk = await loadElk();
      const sizes = new Map();
      const spacing = {
        'elk.algorithm': 'layered',
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.spacing.nodeNode': '24',
        'elk.layered.spacing.nodeNodeBetweenLayers': '44',
        'elk.spacing.edgeNode': '14',
        'elk.spacing.edgeEdge': '9',
        'elk.layered.spacing.edgeNodeBetweenLayers': '14',
        'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
        'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES'
      };
      const elkNode = new Map();
      const parentOf = new Map(); // visible tree: id -> container id ('__root' at the top)
      const build = (n, parent) => {
        parentOf.set(n.id, parent);
        let node;
        if (this.expanded.has(n.id) && n.kids.some((k) => this.shown(k))) {
          node = {
            id: n.id,
            layoutOptions: {
              ...spacing,
              'elk.padding': '[top=48,left=16,bottom=16,right=16]',
              'elk.direction': (n.direction || 'right').toUpperCase(),
              // Wide enough for the header (icon, label, sub, info and collapse buttons).
              'elk.nodeSize.constraints': 'MINIMUM_SIZE',
              'elk.nodeSize.minimum': `(${Math.ceil(Math.max(String(n.label).length * 8, String(n.sub || '').length * 6.8) + 110)}, 80)`
            },
            children: n.kids.filter((k) => this.shown(k)).map((k) => build(k, n.id)),
            edges: []
          };
        } else {
          const s = this.leafSize(n);
          sizes.set(n.id, s);
          node = { id: n.id, width: s.w, height: s.h };
        }
        elkNode.set(n.id, node);
        return node;
      };
      const root = {
        id: '__root',
        layoutOptions: {
          ...spacing,
          'elk.direction': (this.data.direction || 'right').toUpperCase(),
          'elk.hierarchyHandling': 'SEPARATE_CHILDREN',
          'elk.json.shapeCoords': 'ROOT',
          'elk.json.edgeCoords': 'ROOT',
          // Layers run left to right with components stacked top to bottom in each layer; wrapping a
          // long single chain into rows is opt-in (`wrap: true`).
          'elk.layered.wrapping.strategy': this.data.wrap ? 'MULTI_EDGE' : 'OFF',
          'elk.aspectRatio': String(this.data.aspect || 1.6)
        },
        children: this.top.filter((n) => this.shown(n)).map((n) => build(n, '__root')),
        edges: []
      };
      elkNode.set('__root', root);
      const chain = (id) => {
        const out = [];
        for (let p = parentOf.get(id); p; p = parentOf.get(p)) out.push(p);
        return out; // containers, innermost first, ending with '__root'
      };
      const addPort = (cid, pid, side) => {
        const c = elkNode.get(cid);
        (c.ports = c.ports || []).push({ id: pid, width: 1, height: 1, layoutOptions: { 'elk.port.side': side } });
        c.layoutOptions['elk.portConstraints'] = 'FIXED_SIDE';
      };
      const segments = new Map(); // visible edge key -> [segment ids in order, index of the labelled one]
      vis.forEach((v, vi) => {
        const ca = chain(v.from);
        const cb = chain(v.to);
        const lca = ca.find((x) => cb.includes(x));
        const upA = ca.slice(0, ca.indexOf(lca));
        const upB = cb.slice(0, cb.indexOf(lca));
        const ids = [];
        let from = v.from;
        let k = 0;
        const seg = (container, src, dst, labels) => {
          const id = `s${vi}_${k++}`;
          elkNode.get(container).edges.push({ id, sources: [src], targets: [dst], ...(labels ? { labels } : {}) });
          ids.push(id);
        };
        for (const X of upA) {
          const pid = `p${vi}_out_${X}`;
          addPort(X, pid, 'EAST');
          seg(X, from, pid);
          from = pid;
        }
        const ins = upB.map((Y) => {
          const pid = `p${vi}_in_${Y}`;
          addPort(Y, pid, 'WEST');
          return [Y, pid];
        });
        const pill = this.pillText(v);
        const labelled = ids.length;
        seg(lca, from, ins.length ? ins[ins.length - 1][1] : v.to, pill ? [{ text: pill, width: pill.length * 6.8 + 16, height: 22 }] : null);
        for (let i = ins.length - 1; i >= 0; i--) seg(ins[i][0], ins[i][1], i ? ins[i - 1][1] : v.to);
        segments.set(v.key, [ids, labelled]);
      });
      this.lastGraph = JSON.stringify(root); // for tooling (preview/layout experiments)
      let out;
      try {
        out = await elk.layout(root);
      } catch (err) {
        console.warn('diagram: layout retry without wrapping', err);
        root.layoutOptions['elk.layered.wrapping.strategy'] = 'OFF';
        out = await elk.layout(root);
      }
      const placed = { nodes: new Map(), edges: new Map() };
      const routed = new Map();
      const walk = (g) => {
        for (const c of g.children || []) {
          placed.nodes.set(c.id, { x: c.x, y: c.y, w: c.width, h: c.height, group: !!(c.children && c.children.length), size: sizes.get(c.id) });
          walk(c);
        }
        for (const e of g.edges || []) routed.set(e.id, e);
      };
      walk(out);
      for (const [key, [ids, labelled]] of segments) {
        const pts = [];
        let label = null;
        ids.forEach((sid, i) => {
          const e = routed.get(sid);
          for (const s of e?.sections || []) {
            const seq = [[s.startPoint.x, s.startPoint.y], ...(s.bendPoints || []).map((b) => [b.x, b.y]), [s.endPoint.x, s.endPoint.y]];
            for (const q of seq) {
              const last = pts[pts.length - 1];
              if (!last || Math.hypot(last[0] - q[0], last[1] - q[1]) > 0.5) pts.push(q);
            }
          }
          const lab = i === labelled && e && (e.labels || [])[0];
          if (lab) label = { x: lab.x + lab.width / 2, y: lab.y + lab.height / 2 };
        });
        placed.edges.set(key, { pts, label });
      }
      return placed;
    }

    geoLayout() {
      const m = this.data.map;
      const VW = m.width || 1000;
      const VH = m.height || 520;
      const p = projector(m, VW, VH);
      this.proj = p;
      const placed = { nodes: new Map(), edges: new Map() };
      for (const n of this.nodes.values()) {
        if (!this.isVisible(n)) continue;
        const s = this.leafSize(n);
        placed.nodes.set(n.id, { x: p.x(n.lon) - s.w / 2, y: p.y(n.lat) - DISC / 2 - 6, w: s.w, h: s.h, size: s, group: false });
      }
      for (const v of this.vis) {
        const a = placed.nodes.get(v.from);
        const b = placed.nodes.get(v.to);
        if (!a || !b) continue;
        const A = [a.x + a.w / 2, a.y + 6 + DISC / 2];
        const B = [b.x + b.w / 2, b.y + 6 + DISC / 2];
        const curve = v.list[0].curve ?? 0.15;
        const [mx, my] = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
        const [cx, cy] = [mx - curve * (B[1] - A[1]), my + curve * (B[0] - A[0])];
        const at = (t) => [(1 - t) ** 2 * A[0] + 2 * (1 - t) * t * cx + t * t * B[0], (1 - t) ** 2 * A[1] + 2 * (1 - t) * t * cy + t * t * B[1]];
        const r = DISC / 2 + 4;
        const pts = [];
        for (let i = 0; i <= 32; i++) {
          const q = at(i / 32);
          if (Math.hypot(q[0] - A[0], q[1] - A[1]) >= r && Math.hypot(q[0] - B[0], q[1] - B[1]) >= r) pts.push(q);
        }
        placed.edges.set(v.key, { pts, label: null });
      }
      return placed;
    }

    // ---------------------------------------------------------------- render
    pillText(v) {
      if (v.list.length > 1) {
        const protos = [...new Set(v.list.map((e) => e.proto).filter(Boolean))];
        return protos.length === 1 ? `${protos[0]} ×${v.list.length}` : `${v.list.length} links`;
      }
      const e = v.list[0];
      return [e.proto, e.port != null ? `:${e.port}` : null].filter(Boolean).join(' ');
    }

    edgeColour(v) {
      const kinds = [...new Set(v.list.map((e) => (e.tone ? null : e.kind)))];
      if (v.list.every((e) => e.tone) && v.list[0].tone) return TONE_C[v.list[0].tone];
      return kinds.length === 1 && kinds[0] ? KINDS[kinds[0]][0] : null;
    }

    markerFor(colour) {
      const key = (colour || 'base').replace('#', '');
      const id = `${this.uid}-m-${key}`;
      if (!this.defs.querySelector(`#${CSS.escape(id)}`)) {
        const mk = make('marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, this.defs);
        make('path', { d: 'M0,0 L10,5 L0,10 z', class: colour ? '' : 'dgm-marker-base', ...(colour ? { fill: colour } : {}) }, mk);
      }
      return `url(#${id})`;
    }

    render(placed, vis, animate) {
      const old = this.pos;
      this.pos = new Map(placed.nodes);
      // Components: reuse elements by id so they glide to their new place.
      this.nodeEls = this.nodeEls || new Map();
      const seen = new Set();
      for (const [id, p] of placed.nodes) {
        const n = this.nodes.get(id);
        seen.add(id);
        const kind = p.group ? 'group' : 'leaf';
        let el = this.nodeEls.get(id);
        if (el && el.dataset.kind !== kind) {
          el.remove();
          el = null;
        }
        if (!el) {
          el = p.group ? this.drawGroup(n) : this.drawLeaf(n, p.size);
          el.dataset.kind = kind;
          this.nodeEls.set(id, el);
          // New components grow out of where their parent (or old self) was.
          const from = old.get(id) || (n.parent && old.get(n.parent.id));
          if (from && animate) this.place(el, from, n, false);
          else if (animate) el.style.opacity = 0;
        }
        if (p.group) this.sizeGroup(el, n, p);
        else if (el.dataset.lines !== String(p.size.lines.length)) {
          // label wrap changed (not expected), redraw
        }
        requestAnimationFrame(() => {
          this.place(el, p, n, animate);
          el.style.opacity = '';
        });
      }
      for (const [id, el] of this.nodeEls) {
        if (seen.has(id)) continue;
        this.nodeEls.delete(id);
        const n = this.nodes.get(id);
        const to = n && this.repOf(id) && placed.nodes.get(this.repOf(id).id);
        if (animate && to) {
          this.place(el, { x: to.x + to.w / 2 - 10, y: to.y + to.h / 2 - 10, w: 20, h: 20 }, n, true);
          el.style.opacity = 0;
          setTimeout(() => el.remove(), MOVE_MS);
        } else el.remove();
      }
      // Arrows are redrawn once the components have arrived.
      this.edgeLayer.textContent = '';
      this.pillLayer.textContent = '';
      this.pointerLayer.textContent = '';
      this.edgeEls = new Map();
      const drawEdges = () => {
        for (const v of vis) {
          const pe = placed.edges.get(v.key);
          if (pe && pe.pts.length > 1) this.drawEdge(v, pe);
        }
        this.applyLit();
        this.applyView();
      };
      clearTimeout(this.edgeTimer);
      if (animate) {
        this.edgeLayer.style.opacity = 0;
        this.pillLayer.style.opacity = 0;
        this.edgeTimer = setTimeout(() => {
          drawEdges();
          this.edgeLayer.style.opacity = '';
          this.pillLayer.style.opacity = '';
        }, MOVE_MS);
      } else drawEdges();
      if (this.data.map && this.mapLayer && !this.mapDrawn) this.drawMap();
    }

    place(el, p, n, animate) {
      el.style.transition = animate ? `transform ${MOVE_MS}ms ease, opacity ${MOVE_MS}ms ease` : 'none';
      el.style.transform = `translate(${p.x}px, ${p.y}px)`;
      if (el.dataset.kind === 'group') {
        const rect = el.querySelector('.dgm-frame');
        rect.style.transition = animate ? `width ${MOVE_MS}ms ease, height ${MOVE_MS}ms ease` : 'none';
        rect.style.width = `${p.w}px`;
        rect.style.height = `${p.h}px`;
        el.querySelector('.dgm-toggle').setAttribute('transform', `translate(${p.w - 22}, 22)`);
      }
    }

    drawIcon(g, icon, cx, cy, size) {
      if (isLogo(icon)) {
        make('rect', { class: 'dgm-logo-tile', x: cx - size / 2, y: cy - size / 2, width: size, height: size, rx: size / 5 }, g);
        const pad = size * 0.14;
        make('image', { href: this.base + String(icon).replace(/^\/+/, ''), x: cx - size / 2 + pad, y: cy - size / 2 + pad, width: size - 2 * pad, height: size - 2 * pad, preserveAspectRatio: 'xMidYMid meet' }, g);
      } else {
        const ic = make('g', { class: 'dgm-icon', transform: `translate(${cx},${cy}) scale(${(size / 24).toFixed(3)})` }, g);
        ic.innerHTML = ICONS[icon] || ICONS.server;
      }
    }

    drawLeaf(n, s) {
      const g = make('g', { class: 'dgm-node' + (n.tone ? ' dgm-tone' : '') + (n.kids.length ? ' is-collapsible' : '') + (hasInfo(n) ? ' has-detail' : ''), tabindex: 0, role: 'button', style: `--dgm-c: ${n.c}`, 'data-id': n.id }, this.nodeLayer);
      const label = n.kids.length ? `${n.label}: expand` : hasInfo(n) ? `${n.label}: details` : n.label;
      g.setAttribute('aria-label', label);
      const cx = s.w / 2;
      const cy = 6 + DISC / 2;
      make('rect', { class: 'dgm-hit', x: 0, y: 0, width: s.w, height: s.h, rx: 10 }, g);
      if (n.kids.length) make('circle', { class: 'dgm-stack', cx: cx + 4, cy: cy + 4, r: DISC / 2 }, g);
      make('circle', { class: 'dgm-disc', cx, cy, r: DISC / 2 }, g);
      this.drawIcon(g, n.icon || (n.kids.length ? 'cluster' : 'server'), cx, cy, isLogo(n.icon) ? DISC * 0.62 : DISC * 0.56);
      const text = make('text', { class: 'dgm-label', 'text-anchor': 'middle' }, g);
      let ty = 6 + DISC + 10 + 11;
      s.lines.forEach((line) => {
        make('tspan', { x: cx, y: ty }, text).textContent = line;
        ty += 16;
      });
      s.sub.forEach((line) => {
        make('tspan', { x: cx, y: ty - 2, class: 'dgm-sub' }, text).textContent = line;
        ty += 14;
      });
      if (n.kids.length) {
        const b = make('g', { class: 'dgm-badge', transform: `translate(${cx + DISC / 2 - 2}, ${cy - DISC / 2 + 4})` }, g);
        make('circle', { r: 9 }, b);
        make('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' }, b).textContent = '+';
      } else if (hasInfo(n)) {
        const b = make('g', { class: 'dgm-badge dgm-badge-info', transform: `translate(${cx + DISC / 2 - 2}, ${cy - DISC / 2 + 4})` }, g);
        make('circle', { r: 8 }, b);
        make('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' }, b).textContent = 'i';
      }
      const act = () => (n.kids.length ? this.toggle(n.id) : this.openPanel(n));
      g.addEventListener('click', (ev) => {
        if (this.dragged) return;
        ev.stopPropagation();
        act();
      });
      g.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          act();
        }
      });
      g.addEventListener('pointerenter', () => this.hoverNode(n.id, true));
      g.addEventListener('pointerleave', () => this.hoverNode(n.id, false));
      return g;
    }

    drawGroup(n) {
      const g = make('g', { class: 'dgm-group', style: `--dgm-c: ${n.c}`, 'data-id': n.id }, this.groupLayer);
      make('rect', { class: 'dgm-frame', x: 0, y: 0, rx: 16 }, g);
      const head = make('g', { class: 'dgm-head', tabindex: 0, role: 'button', 'aria-label': `${n.label}: collapse` }, g);
      make('rect', { class: 'dgm-head-hit', x: 0, y: 0, width: 260, height: 40, rx: 14 }, head);
      make('circle', { class: 'dgm-head-disc', cx: 24, cy: 22, r: 14 }, head);
      this.drawIcon(head, n.icon || 'cluster', 24, 22, isLogo(n.icon) ? 18 : 17);
      const t = make('text', { class: 'dgm-head-label', x: 46, y: 21 }, head);
      t.textContent = n.label;
      if (n.sub) make('text', { class: 'dgm-head-sub', x: 46, y: 35 }, head).textContent = n.sub;
      const tog = make('g', { class: 'dgm-toggle' }, g);
      make('circle', { r: 10 }, tog);
      make('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' }, tog).textContent = '−';
      const collapse = (ev) => {
        if (this.dragged) return;
        ev.stopPropagation();
        this.toggle(n.id);
      };
      head.addEventListener('click', collapse);
      tog.addEventListener('click', collapse);
      head.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          this.toggle(n.id);
        }
      });
      if (hasInfo(n)) {
        const info = make('g', { class: 'dgm-toggle dgm-info', transform: 'translate(0,0)' }, g);
        make('circle', { r: 10 }, info);
        make('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' }, info).textContent = 'i';
        info.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.openPanel(n);
        });
        g._info = info;
      }
      return g;
    }

    sizeGroup(el, n, p) {
      if (el._info) el._info.setAttribute('transform', `translate(${p.w - 46}, 22)`);
    }

    drawEdge(v, pe) {
      const colour = this.edgeColour(v);
      const e0 = v.list[0];
      const pts = pe.pts;
      const d = 'M' + pts.map((q) => q.map((x) => Math.round(x * 10) / 10).join(',')).join(' L');
      const m = measure(pts);
      const g = make('g', { class: 'dgm-link', style: colour ? `--dgm-e: ${colour}` : '' }, this.edgeLayer);
      const dashed = v.list.every((e) => e.dashed);
      const hit = make('path', { class: 'dgm-link-hit', d }, g);
      const base = make('path', { class: 'dgm-link-line' + (dashed ? ' is-dashed' : '') + (colour ? ' has-kind' : ''), d, 'marker-end': this.markerFor(colour) }, g);
      const trail = make('path', { class: 'dgm-link-trail', d, 'stroke-dasharray': `${m.total} ${m.total}`, 'stroke-dashoffset': m.total }, g);
      // Continuous movement for streams; both directions for duplex protocols.
      const stream = v.list.some((e) => e.stream ?? ['stream', 'telemetry'].includes(e.kind));
      const both = v.list.some((e) => e.both ?? ['WS', 'WSS', 'WEBSOCKET'].includes(protoKey(e.proto)));
      if ((stream || both) && !reduceMotion) {
        const dur = `${Math.max(1.6, m.total / 120).toFixed(2)}s`;
        const dots = make('g', { class: 'dgm-flow' }, g);
        const lanes = both ? [false, true] : [false];
        lanes.forEach((rev) =>
          [0, 0.5].forEach((lag) => {
            const c = make('circle', { r: rev ? 3 : 3.6, class: rev ? 'is-back' : '' }, dots);
            make('animateMotion', { dur, begin: `-${(parseFloat(dur) * (lag + (rev ? 0.25 : 0))).toFixed(2)}s`, repeatCount: 'indefinite', path: d, ...(rev ? { keyPoints: '1;0', keyTimes: '0;1', calcMode: 'linear' } : {}) }, c);
          })
        );
      }
      const text = this.pillText(v);
      let pill = null;
      if (text) {
        const at = pe.label ? nearestOnPath(m, pe.label.x, pe.label.y) : pointAt(m, m.total / 2);
        const w = text.length * 6.8 + 14;
        const inView = !!this.activeView && v.list.some((e) => e.viewList.includes(this.activeView));
        pill = make('g', { class: 'dgm-pill' + (inView ? ' is-view' : ''), transform: `translate(${at.x},${at.y})`, style: colour ? `--dgm-e: ${colour}` : '' }, this.pillLayer);
        make('rect', { x: -w / 2, y: -10, width: w, height: 20, rx: 10 }, pill);
        make('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' }, pill).textContent = text;
      }
      if (e0.label && v.list.length === 1) {
        const at = pointAt(m, m.total * 0.5);
        const lab = make('text', { class: 'dgm-link-label', x: at.x, y: at.y - (pill ? 18 : 8), 'text-anchor': 'middle' }, this.pillLayer);
        lab.textContent = e0.label;
      }
      const show = (ev) => this.showCard(v, ev);
      for (const t of [hit, pill].filter(Boolean)) {
        t.addEventListener('pointerenter', show);
        t.addEventListener('pointermove', (ev) => this.moveCard(ev));
        t.addEventListener('pointerleave', () => this.hideCardSoon());
        t.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.openEdgePanel(v);
        });
      }
      this.edgeEls.set(v.key, { v, g, base, trail, m, pill });
    }

    drawMap() {
      const holder = this.root.querySelector('.dgm-map-data');
      const land = holder ? JSON.parse(holder.textContent).land : null;
      const p = this.proj;
      const W = p.k * (p.lon1 - p.lon0);
      const H = p.k * (p.lat0 - p.lat1);
      const clip = make('clipPath', { id: `${this.uid}-mapclip` }, this.defs);
      make('rect', { x: 0, y: 0, width: W, height: H, rx: 12 }, clip);
      this.mapLayer.setAttribute('clip-path', `url(#${this.uid}-mapclip)`);
      make('rect', { class: 'dgm-map-sea', x: 0, y: 0, width: W, height: H, rx: 12 }, this.mapLayer);
      if (land) make('path', { class: 'dgm-map-land', d: land, transform: `translate(${-p.k * p.lon0},${p.k * p.lat0}) scale(${p.k})` }, this.mapLayer);
      this.mapDrawn = true;
    }

    hoverNode(id, on) {
      for (const { v, g } of this.edgeEls?.values() || []) {
        const touch = v.from === id || v.to === id;
        g.classList.toggle('is-hot', on && touch);
        g.classList.toggle('is-dim', on && !touch);
      }
    }

    // ---------------------------------------------------------------- cards and panel
    cardHTML(v) {
      const a = this.nodes.get(v.from);
      const b = this.nodes.get(v.to);
      const parts = [`<div class="dgm-card-head"><strong>${esc(a.label)}</strong> → <strong>${esc(b.label)}</strong></div>`];
      for (const e of v.list) {
        const kind = e.kind ? KINDS[e.kind][1] : '';
        const proto = [e.proto, e.port != null ? `port ${e.port}` : null].filter(Boolean).join(', ');
        const ends = v.list.length > 1 ? `<span class="dgm-card-ends">${esc(this.nodes.get(e.from).label)} → ${esc(this.nodes.get(e.to).label)}</span>` : '';
        parts.push(`<div class="dgm-card-row" style="--dgm-e:${e.kind ? KINDS[e.kind][0] : 'var(--dgm-muted)'}">${ends}<span class="dgm-card-proto">${esc(proto || e.label || 'link')}</span>${kind ? `<span class="dgm-card-kind">${esc(kind)}</span>` : ''}${e.label && proto ? `<span class="dgm-card-label">${esc(e.label)}</span>` : ''}${e.why ? `<div class="dgm-card-why">${markdown(e.why)}</div>` : ''}${e.detail ? `<div class="dgm-card-note">${markdown(e.detail)}</div>` : ''}</div>`);
      }
      const cards = v.list.length === 1 ? cardsFor(v.list[0]) : [];
      if (cards.length) {
        parts.push(`<div class="dgm-tabs" role="tablist">${cards.map((c, i) => `<button type="button" role="tab" class="dgm-tab${i ? '' : ' is-on'}" data-card="${c}">${esc(CARDS[c].title)}</button>`).join('')}</div>`);
        parts.push(`<div class="dgm-seq-holder">${this.sequenceSVG(cards[0], a.label, b.label)}</div>`);
      }
      return parts.join('');
    }

    sequenceSVG(name, left, right) {
      const c = CARDS[name];
      const W = 300;
      const gap = 40;
      const H = 38 + c.msgs.length * gap;
      const L = 34;
      const R = W - 34;
      const short = (s) => (String(s).length > 16 ? String(s).slice(0, 15) + '…' : s);
      let out = `<svg class="dgm-seq" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.title)}">`;
      out += `<text class="dgm-seq-end" x="${L}" y="14" text-anchor="middle">${esc(short(left))}</text><text class="dgm-seq-end" x="${R}" y="14" text-anchor="middle">${esc(short(right))}</text>`;
      out += `<line class="dgm-seq-life" x1="${L}" y1="22" x2="${L}" y2="${H - 4}"/><line class="dgm-seq-life" x1="${R}" y1="22" x2="${R}" y2="${H - 4}"/>`;
      c.msgs.forEach(([dir, text, note], i) => {
        const y = 40 + i * gap;
        const delay = `animation-delay:${(i * 0.7).toFixed(1)}s`;
        const arrow = (x1, x2) => `<line class="dgm-seq-msg" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" style="${delay}" marker-end="url(#${this.uid}-seq-arrow)"/>`;
        if (dir === '<>') out += arrow(L + 2, R - 2) + arrow(R - 2, L + 2).replace(`y1="${y}"`, `y1="${y + 6}"`).replace(`y2="${y}"`, `y2="${y + 6}"`);
        else out += dir === '>' ? arrow(L + 2, R - 2) : arrow(R - 2, L + 2);
        out += `<text class="dgm-seq-text" x="${W / 2}" y="${y - 6}" text-anchor="middle" style="${delay}">${esc(text)}</text>`;
        if (note) out += `<text class="dgm-seq-note" x="${W / 2}" y="${y + 18}" text-anchor="middle" style="${delay}">${esc(note)}</text>`;
      });
      out += `<defs><marker id="${this.uid}-seq-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="dgm-seq-head"/></marker></defs></svg>`;
      return out;
    }

    wireTabs(holder, v) {
      holder.querySelectorAll('.dgm-tab').forEach((t) =>
        t.addEventListener('click', (ev) => {
          ev.stopPropagation();
          holder.querySelectorAll('.dgm-tab').forEach((x) => x.classList.toggle('is-on', x === t));
          const a = this.nodes.get(v.from).label;
          const b = this.nodes.get(v.to).label;
          holder.querySelector('.dgm-seq-holder').innerHTML = this.sequenceSVG(t.dataset.card, a, b);
        })
      );
    }

    showCard(v, ev) {
      clearTimeout(this.cardTimer);
      if (this.cardKey !== v.key) {
        this.card.innerHTML = this.cardHTML(v);
        this.wireTabs(this.card, v);
        this.cardKey = v.key;
      }
      this.card.hidden = false;
      this.moveCard(ev);
      this.edgeEls.get(v.key)?.g.classList.add('is-hot');
    }
    moveCard(ev) {
      const box = this.root.getBoundingClientRect();
      const cw = this.card.offsetWidth;
      const ch = this.card.offsetHeight;
      let x = ev.clientX - box.left + 16;
      let y = ev.clientY - box.top + 16;
      if (x + cw > box.width - 8) x = Math.max(8, ev.clientX - box.left - cw - 16);
      if (y + ch > box.height - 8) y = Math.max(8, ev.clientY - box.top - ch - 16);
      this.card.style.transform = `translate(${x}px, ${y}px)`;
    }
    hideCardSoon() {
      clearTimeout(this.cardTimer);
      this.cardTimer = setTimeout(() => this.hideCard(), 250);
    }
    hideCard() {
      this.card.hidden = true;
      for (const { g } of this.edgeEls?.values() || []) g.classList.remove('is-hot');
    }

    openPanel(n) {
      const body = this.panel.querySelector('.dgm-panel-body');
      const crumbs = this.ancestorsOf(n.id).reverse().map((a) => esc(a.label));
      const links = this.edges.filter((e) => e.from === n.id || e.to === n.id);
      const badge = STATUS[n.status] ? `<span class="dgm-status dgm-status-${n.status}">${STATUS[n.status]}${n.phase != null ? ` · phase ${esc(n.phase)}` : ''}</span>` : '';
      let h = `<div class="dgm-crumbs">${crumbs.join(' › ')}</div><div class="dgm-panel-head"><h4 style="--dgm-c:${n.c}">${esc(n.label)}</h4>${badge}</div>`;
      // With facts, the badge and chips carry what the canvas sub-label says, so it is not repeated.
      if (n.sub && !n.facts) h += `<div class="dgm-panel-sub">${esc(n.sub)}</div>`;
      if (n.facts) h += this.factsHTML(n.facts);
      if (n.detail) h += `<div class="dgm-md${n.facts ? ' dgm-notes' : ''}">${markdown(n.detail)}</div>`;
      if (n.config) {
        const cfg = typeof n.config === 'string' ? { code: n.config } : n.config;
        h += `<div class="dgm-config"><div class="dgm-config-head"><span>${esc(cfg.title || cfg.lang || 'config')}</span><button type="button" class="dgm-copy">Copy</button></div><pre><code>${esc(cfg.code || '')}</code></pre></div>`;
      }
      if (links.length) {
        h += '<div class="dgm-panel-links"><strong>Connections</strong><ul>';
        for (const e of links) {
          const other = this.nodes.get(e.from === n.id ? e.to : e.from);
          const proto = [e.proto, e.port != null ? `:${e.port}` : null].filter(Boolean).join(' ');
          h += `<li style="--dgm-e:${e.kind ? KINDS[e.kind][0] : 'var(--dgm-muted)'}">${e.from === n.id ? '→' : '←'} ${esc(other.label)}${proto ? ` <code>${esc(proto)}</code>` : ''}${e.label ? ` · ${esc(e.label)}` : ''}${e.why ? `<div class="dgm-link-why">${esc(e.why)}</div>` : ''}</li>`;
        }
        h += '</ul></div>';
      }
      body.innerHTML = h;
      body.querySelectorAll('.dgm-copy-api').forEach((b) => b.addEventListener('click', () => navigator.clipboard?.writeText(b.dataset.copy).then(() => (b.textContent = 'Copied'))));
      body.querySelector('.dgm-copy')?.addEventListener('click', (ev) => {
        const code = body.querySelector('.dgm-config code').textContent;
        navigator.clipboard?.writeText(code).then(() => (ev.target.textContent = 'Copied'));
      });
      this.panel.hidden = false;
      this.root.classList.add('has-panel');
      this.focusOn([n.id], true);
    }
    factsHTML(f) {
      const list = (v) => [].concat(v ?? []).filter((x) => x != null && String(x).trim()).map((x) => String(x).trim());
      const isUrl = (t) => /^https?:\/\/\S+$/.test(t);
      const inline = (t) => markdown(t).replace(/^<p>|<\/p>$/g, '');
      let h = '';
      const chips = [['where', 'Where'], ['when', 'When']].filter(([k]) => list(f[k]).length);
      if (chips.length) h += `<div class="dgm-chips">${chips.map(([k, t]) => `<span class="dgm-chip dgm-chip-${k}" title="${t}"><b>${t}</b> ${inline(list(f[k]).join(' · '))}</span>`).join('')}</div>`;
      if (list(f.summary).length) h += `<div class="dgm-lead">${markdown(list(f.summary).join(' '))}</div>`;
      if (list(f.how).length) h += `<div class="dgm-how"><div class="dgm-sec">How it works</div>${markdown(list(f.how).join('\n'))}</div>`;
      // Links: a map gives each button its label; a bare address is labelled by its host.
      const urls = f.url && typeof f.url === 'object' && !Array.isArray(f.url) ? Object.entries(f.url) : list(f.url).map((u) => [null, u]);
      const btns = urls.map(([label, u]) => {
        u = String(u).trim();
        if (!isUrl(u)) return `<span class="dgm-link-note">${inline(u)}</span>`;
        const name = label || u.replace(/^https?:\/\//, '').replace(/\/$/, '');
        return `<a class="dgm-btn" href="${esc(u)}" target="_blank" rel="noopener noreferrer" title="${esc(u)}">${esc(name)} <span aria-hidden="true">↗</span></a>`;
      });
      if (btns.length) h += `<div class="dgm-links">${btns.join('')}</div>`;
      const apis = list(f.api);
      if (apis.length) {
        h += `<div class="dgm-api"><div class="dgm-sec">API</div><ul>${apis.map((a) => {
          const code = isUrl(a) ? a : (a.match(/^`([^`]+)`$/) || [])[1];
          return `<li>${isUrl(a) ? `<code>${esc(a)}</code>` : inline(a)}${code ? `<button type="button" class="dgm-copy-api" data-copy="${esc(code)}" aria-label="Copy">Copy</button>` : ''}</li>`;
        }).join('')}</ul></div>`;
      }
      return h ? `<div class="dgm-facts">${h}</div>` : '';
    }
    openEdgePanel(v) {
      const body = this.panel.querySelector('.dgm-panel-body');
      body.innerHTML = this.cardHTML(v);
      this.wireTabs(body, v);
      this.panel.hidden = false;
      this.root.classList.add('has-panel');
      this.hideCard();
    }
    closePanel() {
      this.panel.hidden = true;
      this.root.classList.remove('has-panel');
    }

    // ---------------------------------------------------------------- camera
    applyCam() {
      this.view.setAttribute('transform', `translate(${this.cam.x},${this.cam.y}) scale(${this.cam.k})`);
      this.root.style.setProperty('--dgm-zoom', this.cam.k);
    }
    animateCam(to, animate = true) {
      cancelAnimationFrame(this.camRaf);
      if (!animate || reduceMotion) {
        this.cam = to;
        this.applyCam();
        return;
      }
      const from = { ...this.cam };
      const t0 = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - t0) / 450);
        const e = ease(t);
        this.cam = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, k: from.k + (to.k - from.k) * e };
        this.applyCam();
        if (t < 1) this.camRaf = requestAnimationFrame(step);
      };
      this.camRaf = requestAnimationFrame(step);
    }
    box(ids) {
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const id of ids) {
        const p = this.pos.get(id);
        if (!p) continue;
        x0 = Math.min(x0, p.x);
        y0 = Math.min(y0, p.y);
        x1 = Math.max(x1, p.x + p.w);
        y1 = Math.max(y1, p.y + p.h);
      }
      return x0 === Infinity ? null : { x0, y0, x1, y1 };
    }
    camFor(b, maxK = 1.6) {
      const W = this.stage.clientWidth;
      const H = this.stage.clientHeight;
      const pad = 28;
      // Keep clear of the view tabs at the top (and the banner at the bottom).
      const top = this.viewBar ? this.viewBar.offsetHeight + 16 : 0;
      const k = Math.min(maxK, (W - 2 * pad) / Math.max(1, b.x1 - b.x0), (H - 2 * pad - top) / Math.max(1, b.y1 - b.y0));
      return { k, x: (W - k * (b.x1 + b.x0)) / 2, y: top + (H - top - k * (b.y1 + b.y0)) / 2 };
    }
    // Open on the whole diagram when it fits at a readable size, else at a readable zoom on its start
    // (left, top), like a map: drag to explore, Fit shows everything.
    overview(animate = true) {
      const b = this.box([...this.pos.keys()]);
      if (!b) return;
      const c = this.camFor(b, 1.25);
      const minK = this.data.min_zoom || 0.62;
      if (c.k >= minK) return this.animateCam(c, animate);
      const H = this.stage.clientHeight;
      const k = minK;
      const fitsTall = (b.y1 - b.y0) * k < H - 40;
      this.animateCam({ k, x: 24 - k * b.x0, y: fitsTall ? (H - k * (b.y1 + b.y0)) / 2 : 24 - k * b.y0 }, animate);
    }
    fit(animate = true) {
      const b = this.box([...this.pos.keys()]);
      if (b) this.animateCam(this.camFor(b, 1.25), animate);
    }
    focusOn(ids, animate = true) {
      // Keep the current zoom unless the components would not fit; just bring them into view.
      const b = this.box(ids);
      if (!b) return;
      const W = this.stage.clientWidth;
      const H = this.stage.clientHeight;
      const k = Math.min(this.cam.k, this.camFor(b, 1.6).k);
      const sx = this.cam.x + 0;
      const inView = (bx, by) => bx * k + sx > 0 && bx * k + sx < W && by * k + this.cam.y > 0 && by * k + this.cam.y < H;
      if (k === this.cam.k && inView(b.x0, b.y0) && inView(b.x1, b.y1)) return;
      this.animateCam({ k, x: W / 2 - (k * (b.x0 + b.x1)) / 2, y: H / 2 - (k * (b.y0 + b.y1)) / 2 }, animate);
    }
    zoomBy(f, cx, cy) {
      const W = this.stage.clientWidth;
      const H = this.stage.clientHeight;
      cx = cx ?? W / 2;
      cy = cy ?? H / 2;
      const k = Math.max(0.15, Math.min(4, this.cam.k * f));
      const r = k / this.cam.k;
      this.cam = { k, x: cx - (cx - this.cam.x) * r, y: cy - (cy - this.cam.y) * r };
      this.applyCam();
    }

    // Leaving browser fullscreen (Esc) also closes the overlay; entering it needs a new fit.
    bindFullscreen() {
      document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement === this.root) this.nativeFull = true;
        else if (this.nativeFull) {
          this.nativeFull = false;
          this.toggleFull(false);
        }
        setTimeout(() => this.fit(true), 60);
      });
      document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape' && !this.nativeFull && this.root.classList.contains('is-full')) this.toggleFull(false);
      });
    }

    bindPanZoom() {
      const st = this.stage;
      const pts = new Map();
      let last = null;
      let pinch = null;
      st.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0 && ev.pointerType === 'mouse') return;
        pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        this.dragged = false;
        last = { x: ev.clientX, y: ev.clientY };
        if (pts.size === 2) {
          const [a, b] = [...pts.values()];
          pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: this.cam.k };
        }
      });
      st.addEventListener('pointermove', (ev) => {
        if (!pts.has(ev.pointerId)) return;
        pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        if (pts.size === 2 && pinch) {
          const [a, b] = [...pts.values()];
          const box = st.getBoundingClientRect();
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          this.zoomBy((pinch.k * d) / pinch.d / this.cam.k, (a.x + b.x) / 2 - box.left, (a.y + b.y) / 2 - box.top);
          this.dragged = true;
          return;
        }
        const dx = ev.clientX - last.x;
        const dy = ev.clientY - last.y;
        if (!this.dragged && Math.hypot(dx, dy) < 4) return;
        if (!this.dragged) st.setPointerCapture(ev.pointerId);
        this.dragged = true;
        last = { x: ev.clientX, y: ev.clientY };
        this.cam = { ...this.cam, x: this.cam.x + dx, y: this.cam.y + dy };
        this.applyCam();
        this.hideCard();
      });
      const end = (ev) => {
        pts.delete(ev.pointerId);
        if (pts.size < 2) pinch = null;
        setTimeout(() => (this.dragged = false), 0);
      };
      st.addEventListener('pointerup', end);
      st.addEventListener('pointercancel', end);
      // Wheel zooms with Ctrl/Cmd (and trackpad pinch), or freely in fullscreen; plain wheel scrolls the page.
      st.addEventListener(
        'wheel',
        (ev) => {
          if (!(ev.ctrlKey || ev.metaKey || this.root.classList.contains('is-full'))) {
            this.root.classList.add('show-hint');
            clearTimeout(this.hintTimer);
            this.hintTimer = setTimeout(() => this.root.classList.remove('show-hint'), 1200);
            return;
          }
          ev.preventDefault();
          const box = st.getBoundingClientRect();
          this.zoomBy(Math.exp(-ev.deltaY * 0.0022), ev.clientX - box.left, ev.clientY - box.top);
        },
        { passive: false }
      );
      st.addEventListener('click', () => {
        if (!this.dragged) this.hideCard();
      });
      st.addEventListener('keydown', (ev) => {
        const step = 60;
        const moves = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
        if (ev.target !== st) return;
        if (moves[ev.key]) {
          ev.preventDefault();
          this.cam = { ...this.cam, x: this.cam.x + moves[ev.key][0], y: this.cam.y + moves[ev.key][1] };
          this.applyCam();
        } else if (ev.key === '+' || ev.key === '=') this.zoomBy(1.2);
        else if (ev.key === '-') this.zoomBy(1 / 1.2);
        else if (ev.key === '0') this.fit(true);
      });
      window.addEventListener('resize', () => {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => this.fit(false), 150);
      });
    }

    // Real browser fullscreen when allowed; the fixed overlay stays as the fallback (and the layout).
    toggleFull(force) {
      const on = force ?? !this.root.classList.contains('is-full');
      if (on === this.root.classList.contains('is-full')) return;
      this.root.classList.toggle('is-full', on);
      try {
        if (on && !document.fullscreenElement && this.root.requestFullscreen) this.root.requestFullscreen().catch(() => {});
        else if (!on && document.fullscreenElement === this.root) document.exitFullscreen().catch(() => {});
      } catch {
        // the overlay alone is fine
      }
      document.body.classList.toggle('dgm-full-open', on);
      const b = this.root.querySelector('[data-act="full"] i');
      if (b) b.className = `fas fa-${on ? 'down-left-and-up-right-to-center' : 'up-right-and-down-left-from-center'}`;
      setTimeout(() => this.fit(true), 30);
    }

    // ---------------------------------------------------------------- lit state (tour)
    applyLit() {
      const litRep = (id) => {
        if (this.lit.nodes.has(id)) return true;
        const n = this.nodes.get(id);
        const has = (x) => this.lit.nodes.has(x.id) || x.kids.some(has);
        return !this.expanded.has(id) && n && n.kids.some(has);
      };
      for (const [id, el] of this.nodeEls || []) {
        el.classList.toggle('is-lit', litRep(id));
        const act = this.lit.active.has(id) || (this.nodes.get(id)?.kids.length && !this.expanded.has(id) && [...this.lit.active].some((a) => this.ancestorsOf(a).some((p) => p.id === id)));
        el.classList.toggle('is-active', !!act);
        if (act && el.dataset.kind === 'leaf') el.setAttribute('filter', `url(#${this.uid}-glow)`);
        else el.removeAttribute('filter');
      }
      for (const { v, trail, m, g } of this.edgeEls?.values() || []) {
        const on = v.list.some((e) => this.lit.edges.has(e.id));
        trail.style.strokeDashoffset = on ? 0 : m.total;
        g.classList.toggle('is-lit', on);
      }
    }

    // ---------------------------------------------------------------- scenarios (guided stories)
    // `scenarios:` is a list of use cases (sign in, deploy a lab, an alert, …), each one activity with
    // its own steps and optional modes; the reader picks one. A single legacy `tour:` is one scenario.
    // Every step change (play, next, previous, a dot) runs the step: packets travel its arrows, then
    // its targets light up. A newer action cancels an animation in flight.
    buildTour() {
      const list = (this.data.scenarios || (this.data.tour ? [{ id: 'tour', ...this.data.tour }] : [])).filter((x) => x.steps && x.steps.length);
      const capEl = this.root.querySelector('.dgm-caption');
      const ctl = this.root.querySelector('.dgm-controls');
      if (!list.length || !ctl) {
        capEl.querySelector('.dgm-step-text').textContent = 'Click a component to open it; drag to move around; Ctrl + scroll or pinch to zoom; hover an arrow for its protocol.';
        capEl.hidden = false;
        return;
      }
      this.scenarios = list;
      this.speed = 1;
      this.k = -1;
      this.playing = false;
      this.run = 0;
      const dots = ctl.querySelector('.dgm-dots');
      const playBtn = ctl.querySelector('[data-act="play"]');
      const picker = this.root.querySelector('.dgm-scenarios');
      const modeLabel = ctl.querySelector('.dgm-toggle-mode');
      const modeBox = modeLabel && modeLabel.querySelector('input');
      const empty = () => ({ nodes: new Set(), edges: new Set(), active: new Set() });
      const setPlayIcon = () => {
        playBtn.innerHTML = `<i class="fas fa-${this.playing ? 'pause' : 'play'}" aria-hidden="true"></i>`;
        playBtn.setAttribute('aria-label', this.playing ? 'Pause' : 'Play');
      };
      // A step moves packets in "groups": its `edges` all at once (fan-out / fan-in), then each hop of
      // its `path` one after another. `~id` in a path travels that arrow backwards (a response).
      const leg = (ref) => {
        const rev = String(ref).startsWith('~');
        const id = rev ? String(ref).slice(1) : String(ref);
        const e = this.edgeById.get(id);
        return e ? { id, rev, e, from: rev ? e.to : e.from, to: rev ? e.from : e.to } : null;
      };
      const groupsOf = (x) => {
        const g = [];
        const par = (x.edges || []).map(leg).filter(Boolean);
        if (par.length) g.push(par);
        (x.path || []).map(leg).filter(Boolean).forEach((l) => g.push([l]));
        return g;
      };
      const buildSteps = () => {
        this.steps = this.scn.steps.filter((x) => !x.when || x.when === this.mode).map((x) => ({ ...x, edges: x.edges || [], groups: groupsOf(x) }));
        dots.textContent = '';
        this.steps.forEach((x, i) => {
          const b = html('button', 'dgm-dot', dots);
          b.type = 'button';
          b.setAttribute('aria-label', `Step ${i + 1}: ${x.title}`);
          b.addEventListener('click', () => {
            this.stop();
            this.showStep(i, true);
          });
        });
      };
      this.setCaption = (i) => {
        if (i < 0) {
          capEl.querySelector('.dgm-counter').textContent = list.length > 1 ? 'Use case' : 'Tour';
          capEl.querySelector('.dgm-step-title').textContent = this.scn.title || 'Guided tour';
          capEl.querySelector('.dgm-step-text').textContent = `${this.scn.summary ? this.scn.summary + ' ' : ''}Press play, or step through with the arrows.`;
        } else {
          const x = this.steps[i];
          capEl.querySelector('.dgm-counter').textContent = `${i + 1}/${this.steps.length}`;
          capEl.querySelector('.dgm-step-title').textContent = x.title;
          capEl.querySelector('.dgm-step-text').textContent = x.text;
        }
        [...dots.children].forEach((d, j) => {
          d.classList.toggle('is-done', j < i);
          d.classList.toggle('is-current', j === i);
        });
      };
      // Banner at the bottom of the diagram: what the current step is doing, then its outcome.
      const banner = this.root.querySelector('.dgm-banner');
      this.setBanner = (text, state = 'run') => {
        if (!banner) return;
        if (!text) {
          banner.classList.remove('is-on');
          return;
        }
        const icon = { success: '✓ ', fail: '✗ ', done: '● ' }[state] || '';
        banner.textContent = icon + text;
        banner.className = `dgm-banner is-on is-${state}`;
      };
      this.computeLit = (k) => {
        if (k < 0) return (this.lit = empty());
        const nodes = new Set();
        const edges = new Set();
        let from = 0;
        for (let i = 0; i <= k; i++) if (this.steps[i].clear) from = i;
        for (let i = from; i <= k; i++) {
          const x = this.steps[i];
          x.groups.flat().forEach((l) => {
            edges.add(l.id);
            nodes.add(l.to);
          });
          (x.lights || []).forEach((id) => nodes.add(id));
        }
        const cur = this.steps[k];
        const last = cur.groups[cur.groups.length - 1] || [];
        this.lit = { nodes, edges, active: new Set(cur.lights || last.map((l) => l.to)) };
      };
      const stepIds = (x) => [...(x.lights || []), ...x.groups.flat().flatMap((l) => [l.from, l.to])];
      // Open the groups a step needs, so its components are visible.
      // Remember how the reader left the diagram before a use case changes it, and put it back after.
      this.snapshot = () => {
        if (!this.before) this.before = { expanded: new Set(this.expanded), level: this.level, view: this.showAll ? ALL_VIEWS : this.activeView, cam: { ...this.cam } };
      };
      this.restoreBefore = async () => {
        const b = this.before;
        if (!b) return;
        this.before = null;
        this.expanded = b.expanded;
        this.level = b.level;
        this.showAll = b.view === ALL_VIEWS;
        this.activeView = this.showAll ? null : b.view;
        this.markView();
        this.updateLevelLabel();
        await this.relayout({});
        this.animateCam(b.cam);
      };
      // Open the groups step i needs, and close the open ones that neither it nor a later step uses,
      // so the packet is easy to follow.
      this.ensureVisible = async (i) => {
        const x = this.steps[i];
        if (!x) return [];
        this.snapshot();
        // While a use case runs Show all is on: every component and arrow is shown, and groups
        // open and close around the packet instead.
        let changed = !this.showAll || !!this.activeView;
        this.showAll = true;
        this.activeView = null;
        this.markView();
        const ids = stepIds(x);
        const up = (list) => new Set(list.flatMap((id) => this.ancestorsOf(id).map((a) => a.id)));
        const later = up(this.steps.slice(i + 1).flatMap(stepIds));
        const next = up(ids);
        this.expanded.forEach((id) => later.has(id) && next.add(id));
        changed ||= next.size !== this.expanded.size || [...next].some((id) => !this.expanded.has(id));
        if (changed) {
          this.expanded = next;
          await this.relayout({});
        }
        return ids;
      };
      this.focusStep = (ids) => {
        const reps = [...new Set(ids.map((id) => this.repOf(id)?.id).filter(Boolean))];
        const b = this.box(reps);
        if (!b) return;
        const W = this.stage.clientWidth;
        const H = this.stage.clientHeight;
        const pad = 70;
        const k = Math.min(1.3, (W - 2 * pad) / Math.max(1, b.x1 - b.x0), (H - 2 * pad) / Math.max(1, b.y1 - b.y0));
        this.animateCam({ k, x: (W - k * (b.x1 + b.x0)) / 2, y: (H - k * (b.y1 + b.y0) - 30) / 2 });
      };
      // Packets travel one group at a time; within a group, along every arrow at once. Requests are
      // the accent2 pointer; responses (~) a green packet running backwards. 'stopped' if cancelled.
      const runGroup = (legs, token) =>
        new Promise((resolve) => {
          const runs = [];
          for (const l of legs) {
            const el = this.edgeEls.get(`${this.repOf(l.e.from)?.id}>${this.repOf(l.e.to)?.id}`);
            if (el) runs.push({ ...el, rev: l.rev });
          }
          if (!runs.length || reduceMotion) return resolve();
          const maxLen = Math.max(...runs.map((r) => r.m.total));
          const D = (600 + maxLen * 1.4) / this.speed;
          const ptrs = runs.map((r) => {
            const g = make('g', { class: 'dgm-pointer' + (r.rev ? ' is-back' : '') }, this.pointerLayer);
            make('circle', { class: 'dgm-halo', r: 13 }, g);
            make('path', { class: 'dgm-head', d: 'M-9,-8 L11,0 L-9,8 L-4,0 z' }, g);
            return g;
          });
          const t0 = performance.now();
          const tick = (now) => {
            if (token !== this.run) {
              ptrs.forEach((p) => p.remove());
              return resolve('stopped');
            }
            const t = Math.min(1, (now - t0) / D);
            const dist = ease(t) * maxLen;
            runs.forEach((r, i) => {
              const d = Math.min(dist, r.m.total);
              const p = pointAt(r.m, r.rev ? r.m.total - d : d);
              ptrs[i].setAttribute('transform', `translate(${p.x},${p.y}) rotate(${p.angle + (r.rev ? 180 : 0)})`);
              ptrs[i].style.display = d >= r.m.total ? 'none' : '';
              if (!r.rev) r.trail.style.strokeDashoffset = r.m.total - d;
              else r.trail.style.strokeDashoffset = 0;
            });
            if (t < 1) requestAnimationFrame(tick);
            else {
              ptrs.forEach((p) => p.remove());
              resolve();
            }
          };
          requestAnimationFrame(tick);
        });
      this.travel = async (x, token) => {
        for (const g of x.groups) {
          if ((await runGroup(g, token)) === 'stopped') return 'stopped';
          // Light each hop's target as the packet arrives.
          g.forEach((l) => this.lit.nodes.add(l.to));
          this.applyLit();
        }
      };
      // A small celebration at a component: confetti, a ring and a check for success; a red ring, a
      // cross and a shake for failure; a ring and a dot for "done".
      this.celebrate = (id, result) => {
        const rep = this.repOf(id)?.id;
        const p = rep && this.pos.get(rep);
        if (!p) return;
        const cx = p.x + p.w / 2;
        const cy = p.group ? p.y + 22 : p.y + 6 + DISC / 2;
        const colour = result === 'fail' ? '#EF4444' : result === 'done' ? 'var(--dgm-accent)' : '#22C55E';
        const g = make('g', { class: `dgm-burst is-${result}`, transform: `translate(${cx},${cy})` }, this.pointerLayer);
        const ring = make('circle', { class: 'dgm-burst-ring', r: DISC / 2, style: `stroke:${colour}` }, g);
        const badge = make('g', { class: 'dgm-burst-badge', transform: `translate(${DISC / 2 - 2},${-DISC / 2 + 2}) scale(0)` }, g);
        make('circle', { r: 11, style: `fill:${colour}` }, badge);
        make('path', { d: result === 'fail' ? 'M-4,-4 L4,4 M4,-4 L-4,4' : result === 'done' ? 'M-0.5,0 h1' : 'M-5,0 L-1.5,3.5 L5,-3.5', class: 'dgm-burst-mark' }, badge);
        const el = this.nodeEls.get(rep);
        el?.classList.add(result === 'fail' ? 'is-failing' : 'is-winning');
        const parts = [];
        if (result !== 'fail' && !reduceMotion) {
          const cols = ['#F472B6', '#FACC15', '#22C55E', '#3B82F6', '#A855F7', '#F97316'];
          for (let i = 0; i < 26; i++) {
            const a = (Math.PI * 2 * i) / 26 + Math.random() * 0.4;
            const v = 90 + Math.random() * 90;
            const r = make('rect', { width: 6, height: 3 + Math.random() * 4, rx: 1, style: `fill:${cols[i % cols.length]}` }, g);
            parts.push({ r, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 70, rot: Math.random() * 360, vr: (Math.random() - 0.5) * 720 });
          }
        }
        const t0 = performance.now();
        const tick = (now) => {
          const t = (now - t0) / 1000;
          ring.setAttribute('r', DISC / 2 + Math.min(1, t / 0.6) * 34);
          ring.style.opacity = String(Math.max(0, 1 - t / 0.7));
          badge.setAttribute('transform', `translate(${DISC / 2 - 2},${-DISC / 2 + 2}) scale(${Math.min(1, t / 0.25) * (1 + 0.25 * Math.sin(Math.min(1, t / 0.5) * Math.PI))})`);
          for (const q of parts) {
            const x = q.vx * t;
            const y = q.vy * t + 220 * t * t;
            q.r.setAttribute('transform', `translate(${x},${y}) rotate(${q.rot + q.vr * t})`);
            q.r.style.opacity = String(Math.max(0, 1 - t / 1.3));
          }
          if (t < 1.4) requestAnimationFrame(tick);
          else {
            parts.forEach((q) => q.r.remove());
            ring.remove();
            el?.classList.remove('is-winning', 'is-failing');
            setTimeout(() => g.remove(), 1600);
          }
        };
        requestAnimationFrame(tick);
      };
      // Show step i: earlier steps lit, the banner says what is happening, packets travel its hops,
      // then its targets light up and, for a step with `result`, the outcome is celebrated.
      this.showStep = async (i, animate) => {
        const token = ++this.run;
        if (i < 0 || !this.steps.length) {
          await this.restoreBefore();
          if (token !== this.run) return 'stopped';
          this.k = -1;
          this.lit = empty();
          this.applyLit();
          this.setCaption(-1);
          this.setBanner(null);
          return 'done';
        }
        i = Math.min(i, this.steps.length - 1);
        const x = this.steps[i];
        const ids = await this.ensureVisible(i);
        if (token !== this.run) return 'stopped';
        this.pointerLayer.textContent = '';
        this.setCaption(i);
        this.setBanner(x.action || x.title);
        this.focusStep(ids);
        this.computeLit(x.clear ? -1 : i - 1);
        this.applyLit();
        if (animate && !reduceMotion) {
          await sleep(450 / this.speed);
          if (token !== this.run) return 'stopped';
          if ((await this.travel(x, token)) === 'stopped') return 'stopped';
        }
        this.k = i;
        this.computeLit(i);
        this.applyLit();
        if (x.result) {
          const last = x.groups[x.groups.length - 1] || [];
          const at = x.at || (last[last.length - 1] || {}).to || (x.lights || [])[0];
          this.setBanner(x.outcome || x.action || x.title, x.result);
          if (animate && at) {
            // Glide to where the outcome lands, so the celebration is big enough to see.
            const p = this.pos.get(this.repOf(at)?.id);
            if (p) {
              const W = this.stage.clientWidth;
              const H = this.stage.clientHeight;
              const k = Math.max(this.cam.k, 1.05);
              this.animateCam({ k, x: W / 2 - k * (p.x + p.w / 2), y: H / 2 - k * (p.y + p.h / 2) - 20 });
              await sleep(reduceMotion ? 0 : 480);
              if (token !== this.run) return 'stopped';
            }
            this.celebrate(at, x.result);
          }
        }
        return 'done';
      };
      this.stop = () => {
        this.playing = false;
        this.run++;
        this.pointerLayer.textContent = '';
        setPlayIcon();
      };
      this.play = async () => {
        if (this.playing) return;
        this.playing = true;
        setPlayIcon();
        if (this.k >= this.steps.length - 1) this.k = -1;
        while (this.playing) {
          const r = await this.showStep(this.k + 1, true);
          if (r === 'stopped' || !this.playing) break;
          const token = this.run;
          await sleep(DWELL_MS / this.speed);
          if (token !== this.run || !this.playing) break;
          if (this.k >= this.steps.length - 1) {
            // End of this use case: auto-play moves on to the next one. After the last one the diagram
            // goes back to how the reader left it (loop: true starts again from the first instead).
            const cur = list.indexOf(this.scn);
            const next = (cur + 1) % list.length;
            if (next === 0 && this.data.loop !== true) {
              this.stop();
              this.k = -1;
              this.setBanner(null);
              await this.restoreBefore();
              this.lit = empty();
              this.applyLit();
              this.setCaption(-1);
              break;
            }
            if (list.length > 1) {
              this.selectScenario(next, true);
              const ids = await this.ensureVisible(0);
              if (token !== this.run || !this.playing) break;
              this.focusStep(ids);
              await sleep(DWELL_MS / this.speed);
              if (token !== this.run || !this.playing) break;
            }
            this.k = -1;
          }
        }
      };
      // Scenario picker.
      // keepPlaying: called by auto-play moving to the next use case, so the player keeps running.
      this.selectScenario = (i, keepPlaying = false) => {
        if (!keepPlaying) this.stop();
        this.scn = list[i];
        this.modes = this.scn.modes || [{ id: 'default' }];
        this.mode = this.modes[0].id;
        if (modeLabel) {
          modeLabel.hidden = this.modes.length < 2;
          modeBox.checked = false;
          modeLabel.querySelector('span').textContent = this.modes[1] ? this.modes[1].label : '';
        }
        picker?.querySelectorAll('.dgm-scn').forEach((b, j) => {
          b.classList.toggle('is-on', j === i);
          b.setAttribute('aria-selected', j === i ? 'true' : 'false');
        });
        buildSteps();
        this.k = -1;
        this.lit = empty();
        this.applyLit();
        this.setCaption(-1);
      };
      if (picker) {
        if (list.length > 1) {
          list.forEach((x, i) => {
            const b = html('button', 'dgm-scn', picker);
            b.type = 'button';
            b.innerHTML = `<span class="dgm-scn-title">${esc(x.title)}</span><span class="dgm-scn-meta">${x.steps.filter((y) => !y.when || y.when === (x.modes || [{}])[0].id).length} steps</span>`;
            b.title = x.summary || x.title;
            b.setAttribute('role', 'tab');
            b.addEventListener('click', async () => {
              this.selectScenario(i);
              const ids = await this.ensureVisible(0);
              this.focusStep(ids);
            });
          });
          picker.hidden = false;
          this.root.classList.add('has-scenarios');
        } else picker.hidden = true;
      }
      ctl.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-act]');
        if (!b || b.dataset.act === 'mode') return;
        const a = b.dataset.act;
        if (a === 'play') {
          if (this.playing) this.stop();
          else this.play();
        }
        if (a === 'prev') {
          this.stop();
          this.showStep(this.k - 1, true);
        }
        if (a === 'next') {
          this.stop();
          if (this.k < this.steps.length - 1) this.showStep(this.k + 1, true);
        }
        if (a === 'restart') {
          this.stop();
          this.showStep(-1).then(() => this.play());
        }
        if (a === 'speed') {
          this.speed = SPEEDS[(SPEEDS.indexOf(this.speed) + 1) % SPEEDS.length];
          b.textContent = `${this.speed}×`;
        }
      });
      modeBox?.addEventListener('change', () => {
        this.stop();
        this.mode = modeBox.checked && this.modes[1] ? this.modes[1].id : this.modes[0].id;
        buildSteps();
        this.relayout({}).then(() => this.showStep(-1));
      });
      this.selectScenario(0);
      capEl.hidden = false;
      ctl.hidden = false;
    }
  }

  const start = () =>
    document.querySelectorAll('figure.dgm').forEach((f) => {
      try {
        f._dgm = new Diagram(f);
      } catch (err) {
        console.error('diagram', f.id, err);
        f.classList.add('has-error');
      }
    });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
