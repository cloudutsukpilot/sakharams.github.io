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
  const END_CARD_MS = 5000; // the step card stays this long after a use case's last step
  // Reading time for a step's `detail` while Details is on: about 250 words a minute, at most 25 s.
  const READ_MS_PER_WORD = 240;
  const READ_MAX_MS = 25000;
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
    mtls: { title: 'Mutual TLS handshake', msgs: [['>', 'ClientHello', 'cipher suites, key share, SNI'], ['<', 'ServerHello + Certificate + CertRequest', 'the server proves itself and asks for a client certificate'], ['>', 'Certificate + CertVerify + Finished', 'the client proves itself; anything else is refused']] },
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
    ssh: { title: 'SSH session', msgs: [['<>', 'SSH-2.0 version strings', 'both sides say which SSH they speak'], ['<>', 'KEXINIT + key exchange', 'Curve25519: a shared session key, never sent'], ['<', 'host key + signature', 'proves the server: checked against the pinned known_hosts'], ['>', 'NEWKEYS', 'from here everything is encrypted'], ['>', 'userauth publickey', 'the client signs with its private key'], ['<', 'USERAUTH_SUCCESS', 'the server knows the public key'], ['>', 'exec command', 'for git: git-upload-pack, then the pack data flows']] },
    wireguard: { title: 'WireGuard tunnel', msgs: [['>', 'handshake initiation', 'Noise IK: ephemeral key, static key, timestamp'], ['<', 'handshake response', 'both derive session keys in 1 round trip'], ['<>', 'encrypted packets both ways', 'over UDP; new keys every 2 minutes']] },
    kerberos: { title: 'Kerberos', msgs: [['>', 'AS-REQ', 'ask the KDC for a ticket-granting ticket'], ['<', 'AS-REP (TGT)', ''], ['>', 'TGS-REQ for a service', ''], ['<', 'TGS-REP (service ticket)', 'then AP-REQ to the service']] },
    stream: { title: 'Continuous stream', msgs: [['>', 'batch', 'sent as data arrives'], ['>', 'batch', ''], ['>', 'batch', 'the arrow keeps moving while data flows']] },
    query: { title: 'Request and reply', msgs: [['>', 'query / command', 'over a pooled TCP connection'], ['<', 'result', '']] }
  };
  // Short names for the groups on an exchange's bracket rail and the hover card's chain.
  const CARD_TAGS = { tcp: 'TCP', tls: 'TLS 1.3', mtls: 'mTLS', http: 'HTTP', websocket: 'WebSocket', sse: 'SSE', grpc: 'gRPC', kafka: 'Kafka', amqp: 'AMQP', mqtt: 'MQTT', webhook: 'Webhook', oauth: 'OIDC', ssh: 'SSH', wireguard: 'WireGuard', kerberos: 'Kerberos', stream: 'Stream', query: 'Query' };
  const GROUP_COLOURS = ['#0ea5e9', '#16a34a', '#a855f7', '#f59e0b', '#ec4899'];
  // Which cards an arrow gets, from its protocol (`cards:` on the edge overrides; `tls: true` adds TLS).
  // They play in order as one exchange: the connection, its security, then the conversation.
  function cardsFor(e) {
    if (e.cards) return e.cards.filter((c) => CARDS[c]);
    const p = protoKey(e.proto);
    const c = certsOf(e);
    // SSH and WireGuard bring their own encryption (keys, not TLS); DNS here is plain.
    const ownCrypto = ['SSH', 'WIREGUARD', 'DNS'].includes(p);
    const tls = !ownCrypto && (e.tls ?? (c ? !!c.server.length : ['HTTPS', 'WSS', 'AMQPS', 'MQTTS', 'LDAPS'].includes(p) || e.port === 443));
    const map = {
      HTTP: ['tcp', 'http'], HTTPS: ['tcp', 'tls', 'http'], REST: ['http'], GRAPHQL: ['http'], SOAP: ['http'],
      GRPC: ['tcp', 'grpc'], SSH: ['tcp', 'ssh'], WIREGUARD: ['wireguard'], WS: ['websocket'], WSS: ['websocket'], WEBSOCKET: ['websocket'], SSE: ['sse'],
      KAFKA: ['kafka'], AMQP: ['amqp'], AMQPS: ['amqp'], MQTT: ['mqtt'], MQTTS: ['mqtt'], WEBHOOK: ['tcp', 'webhook'],
      OIDC: ['tcp', 'oauth'], OAUTH: ['tcp', 'oauth'], OAUTH2: ['tcp', 'oauth'], KERBEROS: ['kerberos'], OTLP: ['tcp', 'stream'], PROMETHEUS: ['tcp', 'stream'], TCP: ['tcp'],
      POSTGRESQL: ['tcp', 'query'], POSTGRES: ['tcp', 'query'], MYSQL: ['tcp', 'query'], REDIS: ['tcp', 'query'], QDRANT: ['tcp', 'query'], TDS: ['tcp', 'query']
    };
    const list = [...(map[p] || [])];
    if (tls && !list.includes('tls')) list.splice(list.includes('tcp') ? 1 : 0, 0, 'tls');
    // A client certificate makes it mutual TLS.
    if (c?.client.length) list.splice(list.indexOf('tls'), 1, 'mtls');
    return list;
  }
  // An edge's `certs`: a catalog id (the server's), {server, client, note}, {none: "why no TLS"} or
  // {planned: "what is known"} for a hop whose TLS isn't designed yet.
  function certsOf(e) {
    const c = e.certs;
    if (c == null) return null;
    if (typeof c === 'string') return { server: [c], client: [], note: null, none: null, planned: null };
    return { server: [].concat(c.server ?? []), client: [].concat(c.client ?? []), note: c.note ?? null, none: c.none ?? null, planned: c.planned ?? null };
  }
  const CERT_TYPES = { public: 'Public CA', private: 'Private CA', cluster: 'Cluster CA', self: 'Self-signed', key: 'Keys, no certificate' };
  const CERT_FIELDS = [['by', 'Presented by'], ['issuer', 'Issued by'], ['key', 'Key'], ['valid', 'Validity'], ['stored', 'Stored in'], ['trust', 'Trusted because']];

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
  const CERT_KEYS = ['label', 'type', 'by', 'issuer', 'key', 'valid', 'stored', 'trust', 'note'];
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

  const ELK_SPACING = {
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

  // ---------------------------------------------------------------- stable layout
  // Push siblings apart around the ones that grew. items: [{bx, by, bw, bh, w, h}] = base center, base
  // size and current size (never smaller than the base). A sibling whose center lies right of a grown
  // box's base band moves right by half the extra width, left of it moves left, inside it stays (same
  // vertically). The grown box keeps its center. Each shift is monotone in position, so siblings that
  // did not overlap still don't, the order never changes, and closing the box undoes it exactly.
  function pushApart(items) {
    return items.map((s) => {
      let dx = 0;
      let dy = 0;
      for (const e of items) {
        const ew = e.w - e.bw;
        const eh = e.h - e.bh;
        if (ew > 0) {
          if (s.bx >= e.bx + e.bw / 2) dx += ew / 2;
          else if (s.bx <= e.bx - e.bw / 2) dx -= ew / 2;
        }
        if (eh > 0) {
          if (s.by >= e.by + e.bh / 2) dy += eh / 2;
          else if (s.by <= e.by - e.bh / 2) dy -= eh / 2;
        }
      }
      return { x: s.bx + dx, y: s.by + dy };
    });
  }

  // Local push (the default): only siblings that now collide move, straight away from the one that
  // pushes them, along the axis they were separated on in the base layout, keeping their base gap (up
  // to 80). Pushes cascade outward. Who gives way: a pinned box (the component just opened and its
  // open ancestors) never moves; an open one moves before a pinned one; a closed one moves first; among
  // equals, the one farther from the nearest open box. Each box starts where the previous step of the
  // open order left it (sx, sy; else its base center), so a box pushed earlier stays pushed. The result
  // depends only on the base layout and the open order, so closing a component puts everything back.
  // If it doesn't settle, pushApart.
  // items: [{bx, by, bw, bh, sx?, sy?, box: {x0, y0, x1, y1} (current, relative to the center), grown, pinned}]
  function pushLocal(items) {
    const n = items.length;
    const MAXGAP = 80;
    const pos = items.map((s) => ({ x: s.sx ?? s.bx, y: s.sy ?? s.by }));
    const grown = items.filter((s) => s.grown || s.pinned);
    if (!grown.length) return pos;
    const rank = items.map((s) => (s.pinned ? 0 : s.grown ? 1 : 2));
    const dist = items.map((s) => Math.min(...grown.map((g) => (g === s ? Infinity : Math.hypot(g.bx - s.bx, g.by - s.by)))));
    // The axis each pair was separated on in the base layout, its direction and the gap to keep.
    const pairs = [];
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const [a, b] = [items[i], items[j]];
        const gx = Math.abs(a.bx - b.bx) - (a.bw + b.bw) / 2;
        const gy = Math.abs(a.by - b.by) - (a.bh + b.bh) / 2;
        const ax = gx >= gy ? 'x' : 'y';
        const sign = Math.sign(ax === 'x' ? b.bx - a.bx : b.by - a.by) || 1;
        pairs.push({ i, j, ax, sign, gap: Math.min(Math.max(gx, gy), MAXGAP) });
      }
    const ext = (k, ax) => {
      const b = items[k].box;
      return ax === 'x' ? [pos[k].x + b.x0, pos[k].x + b.x1] : [pos[k].y + b.y0, pos[k].y + b.y1];
    };
    for (let round = 0; round < 200; round++) {
      let moved = false;
      for (const p of pairs) {
        const other = p.ax === 'x' ? 'y' : 'x';
        const [o0, o1] = ext(p.i, other);
        const [q0, q1] = ext(p.j, other);
        if (o1 + 4 <= q0 || q1 + 4 <= o0) continue; // side by side on the other axis: no conflict
        // Signed room between them along the axis (i before j in the direction `sign`).
        const [a0, a1] = ext(p.i, p.ax);
        const [b0, b1] = ext(p.j, p.ax);
        const room = p.sign > 0 ? b0 - a1 : a0 - b1;
        const need = p.gap - room;
        if (need <= 0.5) continue;
        // Who gives way.
        let mover;
        if (rank[p.i] !== rank[p.j]) mover = rank[p.i] > rank[p.j] ? p.i : p.j;
        else if (rank[p.i] === 0) continue; // two pinned boxes can't both stay; leave it to the check
        else mover = dist[p.i] > dist[p.j] ? p.i : p.j;
        const dir = mover === p.j ? p.sign : -p.sign;
        pos[mover][p.ax] += dir * need;
        moved = true;
      }
      if (!moved) {
        // Settled: make sure nothing overlaps (it shouldn't).
        for (let i = 0; i < n; i++)
          for (let j = i + 1; j < n; j++) {
            const [ix0, ix1] = ext(i, 'x');
            const [jx0, jx1] = ext(j, 'x');
            const [iy0, iy1] = ext(i, 'y');
            const [jy0, jy1] = ext(j, 'y');
            if (ix0 < jx1 && jx0 < ix1 && iy0 < jy1 && jy0 < iy1) return null;
          }
        return pos;
      }
    }
    return null;
  }

  // Binary min-heap of [cost, value] for the router.
  class Heap {
    constructor() {
      this.a = [];
    }
    push(c, v) {
      const a = this.a;
      a.push([c, v]);
      let i = a.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (a[p][0] <= a[i][0]) break;
        [a[p], a[i]] = [a[i], a[p]];
        i = p;
      }
    }
    pop() {
      const a = this.a;
      const top = a[0];
      const last = a.pop();
      if (a.length) {
        a[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1;
          const r = l + 1;
          let m = i;
          if (l < a.length && a[l][0] < a[m][0]) m = l;
          if (r < a.length && a[r][0] < a[m][0]) m = r;
          if (m === i) break;
          [a[m], a[i]] = [a[i], a[m]];
          i = m;
        }
      }
      return top;
    }
    get size() {
      return this.a.length;
    }
  }

  // Orthogonal arrows for the stable layout (ELK only routes graphs it places itself). Each arrow is an
  // A* search over a grid made of the lines just outside every box, the boxes' center lines and the
  // channels between them, with a penalty per bend and for running along another arrow. Then
  // overlapping parallel segments of different arrows are spread into lanes.
  // boxes: Map id -> {x, y, w, h}; routes: [{key, from, to, skip: Set of ids that don't block it}].
  const ROUTE_M = 10; // clearance around a box
  const BAND_LABEL_W = 168; // the band header column on the left of a top level with labelled bands
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // east, south, west, north
  function routeOrtho(boxes, routes, flow = 'right') {
    const M = ROUTE_M;
    const all = [...boxes.values()];
    const snap = (v) => Math.round(v * 2) / 2;
    const uniq = (vals) => [...new Set(vals.map(snap))].sort((p, q) => p - q);
    const lines = (lo, len) => {
      const edges = uniq(all.flatMap((b) => [b[lo] - M, b[lo] + b[len] + M]));
      const mids = [];
      // The middle of each channel wide enough to be worth it (arrows look best down the middle).
      for (let i = 1; i < edges.length; i++) if (edges[i] - edges[i - 1] > 24) mids.push((edges[i - 1] + edges[i]) / 2);
      return uniq([...edges, ...mids, ...all.map((b) => b[lo] + b[len] / 2)]);
    };
    const xs = lines('x', 'w');
    const ys = lines('y', 'h');
    const NX = xs.length;
    const NY = ys.length;
    const ix = new Map(xs.map((v, i) => [v, i]));
    const iy = new Map(ys.map((v, i) => [v, i]));
    // Grid indices strictly inside the range (lo, hi).
    const span = (vals, lo, hi) => {
      let i = 0;
      while (i < vals.length && vals[i] <= lo) i++;
      let j = i;
      while (j < vals.length && vals[j] < hi) j++;
      return [i, j];
    };
    const N = NX * NY;
    // How many boxes (grown by the clearance) cover each grid point, counted once for all arrows; an
    // arrow subtracts the few boxes that don't block it (its open ancestors).
    const range = new Map();
    const cover = new Uint16Array(N);
    for (const [id, b] of boxes) {
      const [x0, x1] = span(xs, b.x - M, b.x + b.w + M);
      const [y0, y1] = span(ys, b.y - M, b.y + b.h + M);
      range.set(id, [x0, x1, y0, y1]);
      for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) cover[j * NX + i]++;
    }
    // Arrows already on a grid segment: east of a point (H) and south of it (V).
    const usedH = new Uint16Array(N);
    const usedV = new Uint16Array(N);
    const usedOn = (cell, ncell) => (ncell === cell + 1 ? usedH[cell] : ncell === cell - 1 ? usedH[ncell] : ncell > cell ? usedV[cell] : usedV[ncell]);
    // Search state, reused by every arrow (stamp marks what this arrow has set).
    const best = new Float64Array(N * 4);
    const prev = new Int32Array(N * 4);
    const stamp = new Uint32Array(N * 4);
    let gen = 0;
    const BEND = 36;
    const SHARE = 0.6;
    const prefDir = { right: 0, down: 1, left: 2, up: 3 }[flow] ?? 0;
    const out = new Map();
    for (const r of routes) {
      const A = boxes.get(r.from);
      const B = boxes.get(r.to);
      if (!A || !B) continue;
      gen++;
      const skips = [...r.skip].map((id) => range.get(id)).filter(Boolean);
      const blockedAt = (cell) => {
        let c = cover[cell];
        if (!c) return false;
        const i = cell % NX;
        const j = (cell - i) / NX;
        for (const [x0, x1, y0, y1] of skips) if (i >= x0 && i < x1 && j >= y0 && j < y1) c--;
        return c > 0;
      };
      // Ports at the middle of each side; the arrow leaves (or arrives) straight through the clearance.
      const ports = (b) => {
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h / 2;
        return [
          { d: 0, p: [b.x + b.w, cy], o: [b.x + b.w + M, cy] },
          { d: 1, p: [cx, b.y + b.h], o: [cx, b.y + b.h + M] },
          { d: 2, p: [b.x, cy], o: [b.x - M, cy] },
          { d: 3, p: [cx, b.y], o: [cx, b.y - M] }
        ]
          .map((q) => ({ ...q, i: ix.get(snap(q.o[0])), j: iy.get(snap(q.o[1])) }))
          .filter((q) => q.i != null && q.j != null && !blockedAt(q.j * NX + q.i));
      };
      // Leaving along the flow (or arriving with it) is free; the other sides cost a little.
      const sideCost = (d, outgoing) => {
        const want = outgoing ? prefDir : (prefDir + 2) % 4;
        return d === want ? 0 : d === (want + 2) % 4 ? 2 * BEND : BEND * 0.6;
      };
      const starts = ports(A);
      const goals = ports(B);
      const goalAt = new Map(goals.map((g) => [g.j * NX + g.i, g]));
      const gx = goals.map((g) => xs[g.i]);
      const gy = goals.map((g) => ys[g.j]);
      const h = (i, j) => {
        let m = Infinity;
        for (let k = 0; k < gx.length; k++) m = Math.min(m, Math.abs(xs[i] - gx[k]) + Math.abs(ys[j] - gy[k]));
        return m;
      };
      const costOf = (st) => (stamp[st] === gen ? best[st] : Infinity);
      const setCost = (st, c, from) => {
        stamp[st] = gen;
        best[st] = c;
        prev[st] = from;
      };
      const heap = new Heap();
      starts.forEach((s, si) => {
        const st = (s.j * NX + s.i) * 4 + s.d;
        const c = M + sideCost(s.d, true);
        if (c < costOf(st)) {
          setCost(st, c, -1 - si); // negative: a start port
          heap.push(c + h(s.i, s.j), st);
        }
      });
      let found = null;
      let foundCost = Infinity;
      let guard = 0;
      while (heap.size && guard++ < 400000) {
        const [f, st] = heap.pop();
        if (f >= foundCost) break;
        const g = best[st];
        const d = st % 4;
        const cell = (st - d) / 4;
        const i = cell % NX;
        const j = (cell - i) / NX;
        if (f > g + h(i, j) + 1e-6) continue; // stale entry
        const goal = goalAt.get(cell);
        if (goal) {
          // Arrive moving into the box: the port's outward direction reversed.
          const inward = (goal.d + 2) % 4;
          const c = g + (d === inward ? 0 : d === goal.d ? 2 * BEND : BEND) + M + sideCost(goal.d, false);
          if (c < foundCost) {
            foundCost = c;
            found = { st, goal };
          }
        }
        for (let nd = 0; nd < 4; nd++) {
          if (nd === (d + 2) % 4) continue;
          const ni = i + DIRS[nd][0];
          const nj = j + DIRS[nd][1];
          if (ni < 0 || nj < 0 || ni >= NX || nj >= NY) continue;
          const ncell = nj * NX + ni;
          if (blockedAt(ncell)) continue;
          const len = Math.abs(xs[ni] - xs[i]) + Math.abs(ys[nj] - ys[j]);
          const c = g + len + (nd === d ? 0 : BEND) + usedOn(cell, ncell) * SHARE * len;
          const nst = ncell * 4 + nd;
          if (c < costOf(nst)) {
            setCost(nst, c, st);
            heap.push(c + h(ni, nj), nst);
          }
        }
      }
      let pts;
      if (found) {
        const cells = [];
        let st = found.st;
        let start = null;
        for (;;) {
          cells.push((st - (st % 4)) / 4);
          const p = prev[st];
          if (p < 0) {
            start = starts[-1 - p];
            break;
          }
          st = p;
        }
        cells.reverse();
        for (let k = 1; k < cells.length; k++) {
          const [a, b] = [Math.min(cells[k - 1], cells[k]), Math.max(cells[k - 1], cells[k])];
          if (b === a + 1) usedH[a]++;
          else usedV[a]++;
        }
        pts = [start.p, ...cells.map((c) => [xs[c % NX], ys[(c - (c % NX)) / NX]]), found.goal.p];
      } else {
        // No way around (not expected): a simple elbow between facing sides.
        const a = [A.x + A.w, A.y + A.h / 2];
        const b = [B.x, B.y + B.h / 2];
        const mx = (a[0] + b[0]) / 2;
        pts = [a, [mx, a[1]], [mx, b[1]], b];
      }
      out.set(r.key, simplify(pts));
    }
    spreadLanes(out, boxes, new Map(routes.map((r) => [r.key, [r.from, r.to]])));
    return out;
  }

  // Drop repeated and collinear points of an orthogonal path.
  function simplify(pts) {
    const out = [];
    for (const q of pts) {
      const last = out[out.length - 1];
      if (last && Math.abs(last[0] - q[0]) < 0.5 && Math.abs(last[1] - q[1]) < 0.5) continue;
      if (out.length >= 2) {
        const a = out[out.length - 2];
        const b = last;
        const vertical = Math.abs(a[0] - b[0]) < 0.5 && Math.abs(b[0] - q[0]) < 0.5;
        const horizontal = Math.abs(a[1] - b[1]) < 0.5 && Math.abs(b[1] - q[1]) < 0.5;
        if (vertical || horizontal) {
          out[out.length - 1] = [q[0], q[1]];
          continue;
        }
      }
      out.push([q[0], q[1]]);
    }
    return out;
  }

  // Overlapping parallel segments of different arrows on the same line are moved apart into lanes.
  // Moving a horizontal segment up or down only changes the length of its vertical neighbours (and
  // the other way round), so the paths stay orthogonal.
  // Lanes are as wide as the room allows (28, else 18, else 9), so arrows between the same two
  // components have space for their pills; a lane never moves into a component it doesn't attach to.
  function spreadLanes(paths, boxes, ends) {
    const leaves = [...boxes.entries()].filter(([, b]) => !b.group);
    const hitsBox = (key, axis, line, lo, hi) => {
      const [a, b] = ends.get(key) || [];
      return leaves.some(([id, r]) => {
        if (id === a || id === b) return false;
        const [r0, r1, s0, s1] = axis === 1 ? [r.y, r.y + r.h, r.x, r.x + r.w] : [r.x, r.x + r.w, r.y, r.y + r.h];
        return line > r0 - 2 && line < r1 + 2 && hi > s0 && lo < s1;
      });
    };
    for (const axis of [1, 0]) {
      // axis 1: horizontal segments (same y); axis 0: vertical segments (same x).
      const o = 1 - axis;
      const byLine = new Map();
      for (const [key, pts] of paths) {
        for (let k = 1; k < pts.length; k++) {
          const p = pts[k - 1];
          const q = pts[k];
          if (Math.abs(p[axis] - q[axis]) > 0.5) continue;
          const line = Math.round(p[axis]);
          if (!byLine.has(line)) byLine.set(line, []);
          byLine.get(line).push({ key, k, line: p[axis], lo: Math.min(p[o], q[o]), hi: Math.max(p[o], q[o]) });
        }
      }
      for (const group of byLine.values()) {
        group.sort((p, q) => p.lo - q.lo);
        let cluster = [];
        let reach = -Infinity;
        const flush = () => {
          const keys = [...new Set(cluster.map((s) => s.key))];
          if (keys.length > 1) {
            const offs = (gap) => keys.map((key, li) => (li - (keys.length - 1) / 2) * gap);
            const fits = (gap) =>
              offs(gap).every((off, li) => cluster.every((s) => s.key !== keys[li] || !hitsBox(s.key, axis, s.line + off, s.lo, s.hi)));
            const gap = [28, 18].find(fits) || 9;
            keys.forEach((key, li) => {
              const off = (li - (keys.length - 1) / 2) * gap;
              const pts = paths.get(key);
              const moved = new Set();
              for (const s of cluster) {
                if (s.key !== key) continue;
                for (const idx of [s.k - 1, s.k]) {
                  if (moved.has(idx)) continue;
                  moved.add(idx);
                  pts[idx][axis] += off;
                }
              }
            });
          }
          cluster = [];
        };
        for (const s of group) {
          if (cluster.length && s.lo >= reach - 0.5) flush();
          if (!cluster.length) reach = -Infinity;
          cluster.push(s);
          reach = Math.max(reach, s.hi);
        }
        if (cluster.length) flush();
      }
    }
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
      this.relayout({ fit: true, animate: false }).then(() => {
        root.classList.add('is-ready');
        // `zoom_lock: true` locks the zoom the diagram opened at (after the first fit, not before it).
        if (this.data.zoom_lock === true) this.setZoomLock(true);
      });
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
      this.bandLayer = make('g', { class: 'dgm-bands' }, this.view);
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

      // Sidebar: Levels (one button per level; clicking steps there layer by layer), then Views and Use
      // cases (buildViews, buildTour), each a collapsible menu; zoom, Fit and fullscreen at its foot.
      const bar = r.querySelector('.dgm-side-foot');
      const names = this.data.levels || [];
      const lv = this.menu('levels', 'Levels', 'Detail level');
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
      // Zoom lock: holds the current zoom. Buttons, Ctrl + scroll, pinch and +/- stop zooming, and the
      // camera moves of levels, Fit and use cases only pan. Dragging still moves around.
      this.zoomLockBtn = btn('zoom-lock', 'lock-open', 'Lock zoom');
      this.zoomLockBtn.classList.add('dgm-btn-zoomlock');
      this.zoomBtns = [btn('zoom-in', 'plus', 'Zoom in'), btn('zoom-out', 'minus', 'Zoom out')];
      this.setZoomLock(false);
      btn('fit', 'expand', 'Fit to view');
      btn('full', 'up-right-and-down-left-from-center', 'Fullscreen');
      bar.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-act]');
        if (!b) return;
        const a = b.dataset.act;
        if (a === 'zoom-lock') this.setZoomLock(!this.zoomLocked);
        if (a === 'zoom-in') this.userZoom(1.25);
        if (a === 'zoom-out') this.userZoom(0.8);
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
      this.setupPanelResize();
      this.card = r.querySelector('.dgm-card');
      this.card.addEventListener('pointerenter', () => clearTimeout(this.cardTimer));
      this.card.addEventListener('pointerleave', () => this.hideCard());

      this.bindPanZoom();
      this.bindFullscreen();
      this.buildViews();
      this.buildTour();
      this.bindSideToggle();
    }

    // The sidebar folds to a narrow strip that keeps only the zoom, Fit and fullscreen buttons; the
    // canvas takes the room and keeps its centre, and the choice is remembered in this browser.
    bindSideToggle() {
      const b = this.root.querySelector('[data-act="side-collapse"]');
      if (!b) return;
      const storeKey = `dgm-side-collapsed:${this.root.id}`;
      const set = (on, save) => {
        const W = this.stage.clientWidth;
        const H = this.stage.clientHeight;
        this.root.classList.toggle('is-side-collapsed', on);
        const label = on ? 'Show the sidebar' : 'Hide the sidebar';
        b.setAttribute('aria-expanded', on ? 'false' : 'true');
        b.setAttribute('aria-label', label);
        b.title = label;
        const dw = this.stage.clientWidth - W;
        const dh = this.stage.clientHeight - H;
        if (dw || dh) {
          cancelAnimationFrame(this.camRaf);
          this.cam = { ...this.cam, x: this.cam.x + dw / 2, y: this.cam.y + dh / 2 };
          this.applyCam();
        }
        if (save) try { localStorage.setItem(storeKey, on ? '1' : '0'); } catch (e) { /* storage blocked: lasts for this page only */ }
      };
      let saved = null;
      try {
        saved = localStorage.getItem(storeKey);
      } catch (e) { /* storage blocked */ }
      set(saved === '1', false);
      b.addEventListener('click', () => set(!this.root.classList.contains('is-side-collapsed'), true));
    }

    // A collapsible menu in the sidebar: its head toggles the items, and the reader's choice is
    // remembered per diagram in this browser. Returns the element that holds the items.
    menu(id, title, label) {
      const menus = this.root.querySelector('.dgm-side-menus');
      const sec = html('section', `dgm-menu dgm-menu-${id}`, menus);
      const head = html('button', 'dgm-menu-head', sec);
      head.type = 'button';
      head.innerHTML = `<span>${esc(title)}</span><span class="dgm-menu-meta"></span><i class="fas fa-chevron-down" aria-hidden="true"></i>`;
      const items = html('div', 'dgm-menu-items', sec);
      items.setAttribute('aria-label', label || title);
      items.id = `${this.root.id}-menu-${id}`;
      head.setAttribute('aria-controls', items.id);
      const key = `dgm-menu-${id}:${this.root.id}`;
      const set = (open, save) => {
        sec.classList.toggle('is-closed', !open);
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (save) try { localStorage.setItem(key, open ? '1' : '0'); } catch (e) { /* storage blocked: lasts for this page only */ }
      };
      let saved = null;
      try {
        saved = localStorage.getItem(key);
      } catch (e) { /* storage blocked */ }
      set(saved !== '0', false);
      head.addEventListener('click', () => set(sec.classList.contains('is-closed'), true));
      return items;
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
      this.openOrder = [];
      this.expanded = this.expandedForLevel(level);
      this.updateLevelLabel();
      await this.relayout({ fit: true });
    }

    async toggle(id) {
      const n = this.nodes.get(id);
      if (!n || !n.kids.length) return;
      this.before = null;
      const p = this.pos.get(id);
      const was = p && (p.c || [p.x + p.w / 2, p.y + p.h / 2]);
      this.openOrder = this.openOrder || [];
      if (this.expanded.has(id)) {
        // Collapse the whole subtree, so re-expanding starts tidy.
        const drop = (x) => {
          this.expanded.delete(x.id);
          this.openOrder = this.openOrder.filter((o) => o !== x.id);
          x.kids.forEach(drop);
        };
        drop(n);
      } else {
        this.expanded.add(id);
        this.openOrder.push(id);
      }
      // Stable layout: the component keeps its place on screen; the camera only zooms out if it must.
      await this.relayout(this.stable ? { anchor: id, was } : { focus: id });
    }

    // ---------------------------------------------------------------- view tabs
    buildViews() {
      if (!this.views.length) return;
      const bar = this.menu('views', 'Views');
      bar.classList.add('dgm-views');
      bar.setAttribute('role', 'tablist');
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

    // Stable layout (the default) keeps every component's center fixed; `layout: auto` lays the whole
    // visible graph out again with ELK on every change (the behaviour before 1.4).
    get stable() {
      return !this.data.map && this.data.layout !== 'auto';
    }

    // `arrange: flow` (top level for every container, or on one group): children in rows, left to
    // right then top to bottom, in the order they are written. Stable layout only.
    // Which band each child of a flow container sits in. `bands:` lists the container's bands top to
    // bottom ({id, label?, main?}); the main band (the one marked `main`, else the first) holds every
    // child without a `band:`. With no `band:` on any child (and `hubs` not false), a child that
    // receives arrows from 3 or more siblings and leads to at most one is a hub: it moves to an
    // unlabelled band of its own below the main one. links: each child's siblings by arrow (any view).
    bandPlan(cid, kids) {
      const node = cid === '__root' ? null : this.nodes.get(cid);
      const listed = ((node ? node.bands : this.data.bands) || []).map((b) => (typeof b === 'string' ? { id: b } : b));
      const childIn = (id) => {
        for (let n = this.nodes.get(id); n; n = n.parent) if ((n.parent ? n.parent.id : '__root') === cid) return n.id;
        return null;
      };
      const links = new Map(kids.map((k) => [k.id, new Set()]));
      const inFrom = new Map(kids.map((k) => [k.id, new Set()]));
      const outTo = new Map(kids.map((k) => [k.id, new Set()]));
      for (const e of this.edges) {
        const a = childIn(e.from);
        const b = childIn(e.to);
        if (!a || !b || a === b || !links.has(a) || !links.has(b)) continue;
        links.get(a).add(b);
        links.get(b).add(a);
        inFrom.get(b).add(a);
        outTo.get(a).add(b);
      }
      let bands = listed.length ? listed.slice() : [{ id: 'main' }];
      const main = Math.max(0, bands.findIndex((b) => b.main));
      const idx = new Map(bands.map((b, i) => [b.id, i]));
      const bandOf = kids.map((k) => (k.band != null && idx.has(k.band) ? idx.get(k.band) : main));
      const hubs = (node && node.hubs != null ? node.hubs : this.data.hubs) !== false;
      if (hubs && !kids.some((k) => k.band != null)) {
        const isHub = kids.map((k) => inFrom.get(k.id).size >= 3 && outTo.get(k.id).size <= 1);
        const count = isHub.filter(Boolean).length;
        if (count && count < kids.length) {
          bands = [...bands, { id: '__hubs' }];
          isHub.forEach((h, i) => {
            if (h) bandOf[i] = bands.length - 1;
          });
        }
      }
      const members = new Map();
      bandOf.forEach((b, i) => {
        if (!members.has(b)) members.set(b, []);
        members.get(b).push(i);
      });
      const order = [main];
      for (let b = main + 1; b < bands.length; b++) order.push(b);
      for (let b = main - 1; b >= 0; b--) order.push(b);
      return { bands, count: bands.length, main, bandOf, members, order, links, labelled: listed.some((b) => b.label) };
    }

    isFlow(cid) {
      if (!this.stable) return false;
      const n = cid === '__root' ? null : this.nodes.get(cid);
      return ((n && n.arrange) || this.data.arrange) === 'flow';
    }

    async relayout({ fit = false, focus = null, anchor = null, was = null, animate = true } = {}) {
      const token = (this.layoutToken = (this.layoutToken || 0) + 1);
      const vis = this.visibleEdges();
      this.vis = vis;
      const placed = this.data.map ? this.geoLayout() : this.stable ? await this.stableLayout(vis) : await this.elkLayout(vis);
      if (token !== this.layoutToken) return; // a newer layout started meanwhile
      this.render(placed, vis, animate && MOVE_MS > 0);
      this.regroup?.(); // lock mode groups steps by the closed components
      if (fit) this.overview(animate);
      else if (anchor && this.pos.has(anchor)) this.zoomToFit(anchor, was, animate);
      else if (focus && this.pos.has(focus)) this.focusOn([focus], animate);
      if (animate && MOVE_MS) await sleep(MOVE_MS + 30);
    }

    // Base layout of every container (the top level and each group), computed once: ELK places the
    // container's children as closed components, with every arrow (all views, all modes) lifted to the
    // children that hold its ends. Centers are kept; a group's are relative to its own center.
    baseLayouts() {
      if (this.basePromise) return this.basePromise;
      this.basePromise = (async () => {
        const elk = await loadElk();
        const containers = [{ id: '__root', kids: this.top, dir: this.data.direction, root: true }];
        for (const n of this.nodes.values()) if (n.kids.length) containers.push({ id: n.id, kids: n.kids, dir: n.direction });
        const childIn = (cid, id) => {
          for (let n = this.nodes.get(id); n; n = n.parent) if ((n.parent ? n.parent.id : '__root') === cid) return n.id;
          return null;
        };
        const base = new Map();
        await Promise.all(
          containers.map(async (C) => {
            const lifted = new Map();
            for (const e of this.edges) {
              const a = childIn(C.id, e.from);
              const b = childIn(C.id, e.to);
              if (!a || !b || a === b) continue;
              const key = `${a}>${b}`;
              if (!lifted.has(key)) lifted.set(key, { a, b, list: [] });
              lifted.get(key).list.push(e);
            }
            const graph = {
              id: 'g',
              layoutOptions: {
                ...ELK_SPACING,
                'elk.direction': (C.dir || 'right').toUpperCase(),
                ...(C.root
                  ? { 'elk.layered.wrapping.strategy': this.data.wrap ? 'MULTI_EDGE' : 'OFF', 'elk.aspectRatio': String(this.data.aspect || 1.6) }
                  : {})
              },
              children: C.kids.map((k) => {
                const s = this.leafSize(k);
                return { id: k.id, width: s.w, height: s.h };
              }),
              // Each arrow keeps room for its protocol pill, as in the full layout.
              edges: [...lifted.values()].map((l, i) => {
                const pill = this.pillText({ list: l.list });
                return { id: `b${i}`, sources: [l.a], targets: [l.b], ...(pill ? { labels: [{ text: pill, width: pill.length * 6.8 + 16, height: 22 }] } : {}) };
              })
            };
            let out;
            try {
              out = await elk.layout(graph);
            } catch (err) {
              console.warn('diagram: base layout retry without wrapping', err);
              graph.layoutOptions['elk.layered.wrapping.strategy'] = 'OFF';
              out = await elk.layout(graph);
            }
            const m = new Map();
            for (const c of out.children) m.set(c.id, { x: c.x + c.width / 2, y: c.y + c.height / 2, w: c.width, h: c.height });
            if (!C.root) {
              // Center a group's children on (0, 0): the group grows around its own center.
              let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
              for (const b of m.values()) {
                x0 = Math.min(x0, b.x - b.w / 2);
                x1 = Math.max(x1, b.x + b.w / 2);
                y0 = Math.min(y0, b.y - b.h / 2);
                y1 = Math.max(y1, b.y + b.h / 2);
              }
              for (const b of m.values()) {
                b.x -= (x0 + x1) / 2;
                b.y -= (y0 + y1) / 2;
              }
            }
            base.set(C.id, m);
          })
        );
        return base;
      })();
      return this.basePromise;
    }

    // Stable layout: each component sits at its base center. An open group's frame is centered on that
    // same point and sized to its children (laid out by its own base layout); the siblings it would
    // cover are pushed straight out (pushLocal). A component hidden by the view tab keeps its space.
    // The layout is replayed in the order components were opened: first what the level opened, then
    // each component the reader opened, starting from where the step before left everything, with that
    // component and its open ancestors pinned. So opening one never moves a box pushed earlier back,
    // and closing one gives back the layout from before it was opened.
    async stableLayout(vis) {
      const base = await this.baseLayouts();
      // The top level's labelled bands, as the last arrange step left them (drawn behind everything).
      let rootBands = null;
      let pinned = new Set();
      // Each step's positions: container id → child id → center, relative to the container's center.
      let prev = new Map();
      let cur = new Map();
      const PAD_X = 16;
      const TOP = 48;
      const BOTTOM = 16;
      // A component's drawn box relative to its center (box) and the size it reserves among its siblings
      // (w, h: symmetric around the center, so pushApart's growth is too). An open group's frame is
      // drawn tight around its visible children (a hidden one keeps its place but no frame around it).
      const frame = (n) => {
        const s = this.leafSize(n);
        if (!(this.expanded.has(n.id) && n.kids.some((k) => this.shown(k)))) {
          return { w: s.w, h: s.h, size: s, group: false, box: { x0: -s.w / 2, y0: -s.h / 2, x1: s.w / 2, y1: s.h / 2 } };
        }
        const items = arrange(n.id, n.kids);
        let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
        for (const it of items) {
          if (!it.f) continue;
          x0 = Math.min(x0, it.x + it.f.box.x0);
          x1 = Math.max(x1, it.x + it.f.box.x1);
          y0 = Math.min(y0, it.y + it.f.box.y0);
          y1 = Math.max(y1, it.y + it.f.box.y1);
        }
        x0 -= PAD_X;
        x1 += PAD_X;
        y0 -= TOP;
        y1 += BOTTOM;
        // Wide enough for the header (icon, label, sub, info and collapse buttons), as in the ELK layout.
        const minW = Math.ceil(Math.max(String(n.label).length * 8, String(n.sub || '').length * 6.8) + 110);
        if (x1 - x0 < minW) {
          // A flow group grows right and down from its closed box; any other group around its center.
          if (this.isFlow(n.id)) x1 = x0 + minW;
          else {
            const grow = (minW - (x1 - x0)) / 2;
            x0 -= grow;
            x1 += grow;
          }
        }
        if (y1 - y0 < 80) y1 = y0 + 80;
        const w = Math.max(2 * Math.max(-x0, x1), s.w);
        const h = Math.max(2 * Math.max(-y0, y1), s.h);
        return { w, h, group: true, items, box: { x0, y0, x1, y1 } };
      };
      // Flow arrangement (`arrange: flow`): children in model order, left to right in rows of `cols`,
      // rows top to bottom, each row top-aligned. Positions come from the current sizes, so an open
      // component pushes the ones after it in its row to the right and the rows below it down, and
      // closing it restores the layout exactly. A group's rows start at its closed box's top-left
      // corner, so it opens right and down from where it was. Hidden components keep their base space.
      const FLOW_GAP_X = 88;
      const FLOW_GAP_Y = 64;
      // Bands (`bands:` on the top level or a group, `band:` on a component) are horizontal swimlanes:
      // the main band holds the main path in rows as above; every other band is one row, stacked in
      // the order the bands are listed, with each component placed under (or over) the components it
      // connects to (the mean of their centers), keeping order and spacing. Components that many
      // siblings point at (hubs) go to their own band, so their arrows arrive from one side instead
      // of converging in the middle of the main path.
      const BAND_GAP = 104;
      const flowArrange = (cid, rows) => {
        const node = cid === '__root' ? null : this.nodes.get(cid);
        const cols = Math.max(1, (node ? node.cols : this.data.cols) || (node ? Math.min(rows.length, 4) : rows.length));
        let [ox, oy] = [0, 0];
        if (node) {
          const s = this.leafSize(node);
          ox = -s.w / 2 + PAD_X;
          oy = -s.h / 2 + TOP;
        }
        const boxOf = (r) => (r.f ? r.f.box : { x0: -r.bw / 2, y0: -r.bh / 2, x1: r.bw / 2, y1: r.bh / 2 });
        const plan = this.bandPlan(cid, rows.map((r) => r.k));
        const raw = new Array(rows.length);
        const cx = new Map();
        const heights = new Map();
        for (const bi of plan.order) {
          const idxs = plan.members.get(bi) || [];
          if (!idxs.length) continue;
          let bandH = 0;
          if (bi === plan.main) {
            // The main path: rows of `cols`, left to right, top to bottom, top-aligned.
            let [x, y, rowH] = [0, 0, 0];
            idxs.forEach((i, n) => {
              if (n && n % cols === 0) {
                x = 0;
                y += rowH + FLOW_GAP_Y;
                rowH = 0;
              }
              const box = boxOf(rows[i]);
              raw[i] = { x: x - box.x0, y: y - box.y0 };
              cx.set(rows[i].k.id, x + (box.x1 - box.x0) / 2);
              x += box.x1 - box.x0 + FLOW_GAP_X;
              rowH = Math.max(rowH, box.y1 - box.y0);
            });
            bandH = y + rowH;
          } else {
            // One row, in the order written; each component slides right to sit under (or over) the
            // center of what it connects to in the bands already placed, never past the next one.
            const want = idxs.map((i) => {
              const xs = [...(plan.links.get(rows[i].k.id) || [])].map((id) => cx.get(id)).filter((v) => v != null);
              return { i, at: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null };
            });
            let cursor = 0;
            for (const { i, at } of want) {
              const box = boxOf(rows[i]);
              const w = box.x1 - box.x0;
              const left = at == null ? cursor : Math.max(at - w / 2, cursor);
              raw[i] = { x: left - box.x0, y: -box.y0 };
              cx.set(rows[i].k.id, left + w / 2);
              cursor = left + w + FLOW_GAP_X;
              bandH = Math.max(bandH, box.y1 - box.y0);
            }
          }
          heights.set(bi, bandH);
        }
        // Stack the bands in their listed order.
        const top = new Map();
        let y = 0;
        const out = [];
        for (let bi = 0; bi < plan.count; bi++) {
          if (!heights.has(bi)) continue;
          top.set(bi, y);
          out.push({ band: plan.bands[bi], y0: y, y1: y + heights.get(bi) });
          y += heights.get(bi) + BAND_GAP;
        }
        const labelW = !node && plan.labelled ? BAND_LABEL_W : 0;
        if (!node) rootBands = plan.labelled ? out.map((b) => ({ ...b, y0: b.y0 + oy, y1: b.y1 + oy })) : null;
        return rows.map((r, i) => ({ x: ox + labelW + raw[i].x, y: oy + top.get(plan.bandOf[i]) + raw[i].y }));
      };
      const arrange = (cid, kids) => {
        const b = base.get(cid);
        const was = prev.get(cid);
        const rows = kids.map((k) => {
          const bb = b.get(k.id);
          const f = this.shown(k) ? frame(k) : null;
          const st = was && was.get(k.id);
          return { k, f, bx: bb.x, by: bb.y, bw: bb.w, bh: bb.h, sx: st && st.x, sy: st && st.y, w: f ? Math.max(f.w, bb.w) : bb.w, h: f ? Math.max(f.h, bb.h) : bb.h };
        });
        if (this.isFlow(cid)) {
          const pos = flowArrange(cid, rows);
          const out = rows.map((r, i) => ({ k: r.k, f: r.f, x: pos[i].x, y: pos[i].y }));
          cur.set(cid, new Map(out.filter((o) => o.f).map((o) => [o.k.id, { x: o.x, y: o.y }])));
          return out;
        }
        // Local push among the visible children; the guaranteed (roomier) push if it doesn't settle.
        const vis = rows.filter((r) => r.f);
        const local = pushLocal(vis.map((r) => ({ ...r, box: r.f.box, grown: r.f.group, pinned: r.f.group && pinned.has(r.k.id) })));
        const at = new Map();
        if (local) vis.forEach((r, i) => at.set(r, local[i]));
        else pushApart(rows).forEach((p, i) => at.set(rows[i], p));
        const out = rows.map((r) => ({ k: r.k, f: r.f, x: (at.get(r) || { x: r.bx }).x, y: (at.get(r) || { y: r.by }).y }));
        cur.set(cid, new Map(out.filter((o) => o.f).map((o) => [o.k.id, { x: o.x, y: o.y }])));
        return out;
      };
      const placed = { nodes: new Map(), edges: new Map() };
      const put = (items, ox, oy) => {
        for (const it of items) {
          if (!it.f) continue;
          const cx = ox + it.x;
          const cy = oy + it.y;
          const b = it.f.box;
          // c: the component's anchor point (its layout center; an open group's frame can sit off it).
          placed.nodes.set(it.k.id, { x: cx + b.x0, y: cy + b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0, c: [cx, cy], group: it.f.group, size: it.f.group ? undefined : it.f.size });
          if (it.f.group) put(it.f.items, cx, cy);
        }
      };
      // Replay the open order (this.expanded is swapped for each step and put back).
      const open = this.expanded;
      const order = (this.openOrder || []).filter((id, i, a) => open.has(id) && a.indexOf(id) === i);
      const first = new Set([...open].filter((id) => !order.includes(id)));
      let top;
      try {
        for (let t = 0; t <= order.length; t++) {
          this.expanded = t === order.length ? open : new Set([...first, ...order.slice(0, t)]);
          const pin = t ? order[t - 1] : null;
          pinned = new Set(pin && this.isVisible(this.nodes.get(pin)) ? [pin, ...this.ancestorsOf(pin).map((a) => a.id)] : []);
          prev = cur;
          cur = new Map();
          top = arrange('__root', this.top);
        }
      } finally {
        this.expanded = open;
      }
      put(top, 0, 0);
      if (rootBands && rootBands.length) {
        let x1 = 0;
        for (const p of placed.nodes.values()) x1 = Math.max(x1, p.x + p.w);
        const n = rootBands.length;
        placed.bands = rootBands.map((b, i) => ({
          label: b.band.label || '',
          id: b.band.id,
          x0: 0,
          x1: x1 + 40,
          y0: i ? (rootBands[i - 1].y1 + b.y0) / 2 : b.y0 - 44,
          y1: i < n - 1 ? (b.y1 + rootBands[i + 1].y0) / 2 : b.y1 + 44
        }));
      }
      // Arrows: an open group that holds either end doesn't block the arrow; every other box does.
      const routes = vis.map((v) => ({
        key: v.key,
        from: v.from,
        to: v.to,
        skip: new Set([...this.ancestorsOf(v.from), ...this.ancestorsOf(v.to)].map((a) => a.id))
      }));
      const paths = routeOrtho(placed.nodes, routes, this.data.direction || 'right');
      for (const v of vis) {
        const pts = paths.get(v.key);
        if (pts) placed.edges.set(v.key, { pts, label: null });
      }
      this.placeLabels(placed, vis);
      return placed;
    }

    // Layout: each open group is laid out on its own (compact), and an arrow that crosses group borders
    // is split into segments that leave through a port on each group's border (east side out, west
    // side in) and meet at the lowest group containing both ends. ELK routes every segment inside its
    // own group, and the segments between groups also decide how the groups are arranged.
    async elkLayout(vis) {
      const elk = await loadElk();
      const sizes = new Map();
      const spacing = ELK_SPACING;
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
        const room = this.labelRoom(v);
        const labelled = ids.length;
        seg(lca, from, ins.length ? ins[ins.length - 1][1] : v.to, room ? [room] : null);
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
      // ELK keeps room for each pill but not for the text label drawn above it, and labels of arrows in
      // different containers never see each other: check every spot as the stable layout does.
      this.placeLabels(placed, vis);
      return placed;
    }

    // Where each arrow's protocol pill and its text label (drawn just above the pill, or alone in the
    // middle of the arrow when it has no pill) go: the spot the layout suggested if it is free, else the
    // middle of the longest segment that is free, else the free spot nearest to it, else the spot with
    // the least overlap. Free means clear of components and of the pills and labels placed before; the
    // pill and the label are checked as two boxes, each as wide as its own text. Sets edges' `label`.
    placeLabels(placed, vis) {
      const leaves = [...placed.nodes.values()].filter((p) => !p.group);
      const taken = [];
      const area = (r, o) => Math.max(0, Math.min(r.x + r.w, o.x + o.w) - Math.max(r.x, o.x)) * Math.max(0, Math.min(r.y + r.h, o.y + o.h) - Math.max(r.y, o.y));
      // Overlap with components weighs more than with other pills and labels.
      const clash = (rs) => rs.reduce((s, r) => s + taken.reduce((t, o) => t + area(r, o), 0) + 2 * leaves.reduce((t, o) => t + area(r, o), 0), 0);
      const TS = [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9];
      for (const v of vis) {
        const pe = placed.edges.get(v.key);
        if (!pe || !pe.pts || pe.pts.length < 2) continue;
        const text = this.pillText(v);
        const caption = v.list.length === 1 ? v.list[0].label : null;
        if (!text && !caption) continue;
        const pw = text ? text.length * 6.8 + 14 : 0;
        const lw = caption ? String(caption).length * 6.6 + 8 : 0;
        // The boxes around a spot on the arrow (the label's text sits 18px above the pill's center,
        // or 8px above the arrow without a pill; 11px bold, about 12px tall).
        const boxes = (at) => [
          ...(text ? [{ x: at.x - pw / 2 - 2, y: at.y - 12, w: pw + 4, h: 24 }] : []),
          ...(caption ? [{ x: at.x - lw / 2, y: at.y - (text ? 18 : 8) - 11, w: lw, h: 14 }] : [])
        ];
        const pts = pe.pts;
        const cands = [];
        if (pe.label) {
          const q = nearestOnPath(measure(pts), pe.label.x, pe.label.y);
          cands.push({ x: q.x, y: q.y });
        }
        const segs = [];
        for (let k = 1; k < pts.length; k++) segs.push([pts[k - 1], pts[k], Math.abs(pts[k][0] - pts[k - 1][0]) + Math.abs(pts[k][1] - pts[k - 1][1])]);
        segs.sort((p, q) => q[2] - p[2]);
        for (const [p, q] of segs.slice(0, 3)) for (const t of TS) cands.push({ x: p[0] + (q[0] - p[0]) * t, y: p[1] + (q[1] - p[1]) * t });
        let best = null;
        for (const at of cands) {
          const rs = boxes(at);
          const score = clash(rs);
          if (!best || score < best.score) best = { at, rs, score };
          if (!score) break;
        }
        pe.label = best.at;
        taken.push(...best.rs);
      }
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

    // The room ELK keeps on an arrow (inline labels: centered on the line, where the pill is drawn) for
    // its pill and, when it has one, the text label 18px above the pill: the box is centered on the
    // line, so the label's height is kept on both sides.
    labelRoom(v) {
      const text = this.pillText(v);
      const caption = v.list.length === 1 ? v.list[0].label : null;
      if (!text && !caption) return null;
      const w = Math.max(text ? text.length * 6.8 + 16 : 0, caption ? String(caption).length * 6.6 + 8 : 0);
      return { text: text || String(caption), width: w, height: text ? (caption ? 58 : 22) : 38, layoutOptions: { 'elk.edgeLabels.inline': 'true' } };
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
      this.bandsBox = placed.bands ? { x0: placed.bands[0].x0, y0: placed.bands[0].y0, x1: placed.bands[0].x1, y1: placed.bands[placed.bands.length - 1].y1 } : null;
      const drawBands = () => {
        this.bandLayer.textContent = '';
        (placed.bands || []).forEach((b, i) => {
          const g = make('g', { class: 'dgm-band' + (i % 2 ? ' is-alt' : ''), 'data-band': b.id }, this.bandLayer);
          make('rect', { class: 'dgm-band-bg', x: b.x0, y: b.y0, width: b.x1 - b.x0, height: b.y1 - b.y0 }, g);
          make('rect', { class: 'dgm-band-head', x: b.x0, y: b.y0, width: BAND_LABEL_W - 28, height: b.y1 - b.y0 }, g);
          const lines = wrap(b.label, 16);
          const t = make('text', { class: 'dgm-band-label', x: b.x0 + (BAND_LABEL_W - 28) / 2, y: (b.y0 + b.y1) / 2 - ((lines.length - 1) * 17) / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g);
          lines.forEach((l, k) => {
            const sp = make('tspan', { x: b.x0 + (BAND_LABEL_W - 28) / 2, dy: k ? 17 : 0 }, t);
            sp.textContent = l;
          });
        });
      };
      const drawEdges = () => {
        drawBands();
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
      let pillAt = null;
      if (text) {
        const at = pe.label ? nearestOnPath(m, pe.label.x, pe.label.y) : pointAt(m, m.total / 2);
        pillAt = at;
        const w = text.length * 6.8 + 14;
        const inView = !!this.activeView && v.list.some((e) => e.viewList.includes(this.activeView));
        pill = make('g', { class: 'dgm-pill' + (inView ? ' is-view' : ''), transform: `translate(${at.x},${at.y})`, style: colour ? `--dgm-e: ${colour}` : '' }, this.pillLayer);
        make('rect', { x: -w / 2, y: -10, width: w, height: 20, rx: 10 }, pill);
        make('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' }, pill).textContent = text;
      }
      if (e0.label && v.list.length === 1) {
        // Just above the pill, so the two read together; else the middle of the arrow.
        const at = pillAt || (pe.label ? nearestOnPath(m, pe.label.x, pe.label.y) : pointAt(m, m.total * 0.5));
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
    cardHTML(v, panel = false) {
      const a = this.nodes.get(v.from);
      const b = this.nodes.get(v.to);
      const parts = [`<div class="dgm-card-head"><strong>${esc(a.label)}</strong> → <strong>${esc(b.label)}</strong></div>`];
      for (const e of v.list) {
        const kind = e.kind ? KINDS[e.kind][1] : '';
        const proto = [e.proto, e.port != null ? `port ${e.port}` : null].filter(Boolean).join(', ');
        const ends = v.list.length > 1 ? `<span class="dgm-card-ends">${esc(this.nodes.get(e.from).label)} → ${esc(this.nodes.get(e.to).label)}</span>` : '';
        parts.push(`<div class="dgm-card-row" style="--dgm-e:${e.kind ? KINDS[e.kind][0] : 'var(--dgm-muted)'}">${ends}<span class="dgm-card-proto">${esc(proto || e.label || 'link')}</span>${kind ? `<span class="dgm-card-kind">${esc(kind)}</span>` : ''}${e.label && proto ? `<span class="dgm-card-label">${esc(e.label)}</span>` : ''}${e.why ? `<div class="dgm-card-why">${markdown(e.why)}</div>` : ''}${e.detail ? `<div class="dgm-card-note">${markdown(e.detail)}</div>` : ''}${panel ? '' : this.certsHTML(e, false)}</div>`);
      }
      const cards = v.list.length === 1 ? cardsFor(v.list[0]) : [];
      if (cards.length && panel) parts.push(this.exchangeHTML(cards, a.label, b.label));
      else if (cards.length) parts.push(`<div class="dgm-card-chain">${cards.map((c) => esc(CARD_TAGS[c] || CARDS[c].title)).join(' → ')} <span>· click for the full exchange</span></div>`);
      // In the panel the certificates follow the exchange (the TLS step is where they are presented).
      if (panel) {
        for (const e of v.list) {
          const c = this.certsHTML(e, true);
          if (!c) continue;
          parts.push(v.list.length > 1 ? c.replace('<div class="dgm-sec">Certificates</div>', `<div class="dgm-sec">Certificates · ${esc(this.nodes.get(e.from).label)} → ${esc(this.nodes.get(e.to).label)}</div>`) : c);
        }
      }
      return parts.join('');
    }

    // Certificates on a connection: one line on the hover card, the full cards in the side panel.
    certsHTML(e, full) {
      const c = certsOf(e);
      if (!c) return '';
      const cat = this.data.certs || {};
      const inline = (t) => markdown(String(t)).replace(/^<p>|<\/p>$/g, '');
      if (c.planned && !c.server.length) {
        return full
          ? `<div class="dgm-certs"><div class="dgm-sec">Certificates</div><div class="dgm-cert dgm-cert-none dgm-cert-tbd"><b>Not decided yet</b> ${inline(c.planned)}</div></div>`
          : `<div class="dgm-card-cert is-none">Certificates: not decided yet</div>`;
      }
      if (c.none) {
        return full
          ? `<div class="dgm-certs"><div class="dgm-sec">Certificates</div><div class="dgm-cert dgm-cert-none"><b>No TLS</b> ${inline(c.none)}</div></div>`
          : `<div class="dgm-card-cert is-none">No TLS</div>`;
      }
      const rows = [...c.server.map((id) => ['Server', id]), ...c.client.map((id) => ['Client', id])].filter(([, id]) => cat[id]);
      if (!full) {
        const names = rows.map(([role, id]) => `${role === 'Client' ? 'client ' : ''}<code>${esc(cat[id].label || id)}</code>`).join(' + ');
        return names ? `<div class="dgm-card-cert"><span aria-hidden="true">🔒</span> ${names} <span class="dgm-card-cert-more">· click for details</span></div>` : '';
      }
      let h = '<div class="dgm-certs"><div class="dgm-sec">Certificates</div>';
      for (const [role, id] of rows) {
        const x = cat[id];
        const type = CERT_TYPES[x.type] || '';
        // Collapsed to its name; the details open on a click.
        h += `<details class="dgm-cert dgm-cert-${esc(x.type || 'public')}"><summary class="dgm-cert-head"><span class="dgm-cert-role">${role}</span><code>${esc(x.label || id)}</code>${type ? `<span class="dgm-cert-type">${type}</span>` : ''}</summary><dl>`;
        for (const [k, t] of CERT_FIELDS) if (x[k]) h += `<dt>${t}</dt><dd>${inline(x[k])}</dd>`;
        h += `</dl>${x.note ? `<div class="dgm-cert-note">${inline(x.note)}</div>` : ''}</details>`;
      }
      if (c.note) h += `<div class="dgm-cert-note">${inline(c.note)}</div>`;
      return h + '</div>';
    }

    // One exchange: every card's messages in order in a single sequence diagram, with a bracket rail on
    // the left grouping them (TCP, TLS 1.3, HTTP …). It plays on a loop; a click on a group replays from it.
    exchangeHTML(cards, left, right) {
      const W = 340, rail = 58, L = 84, R = W - 14, gap = 40, groupGap = 12, top = 30;
      const short = (t) => (String(t).length > 18 ? String(t).slice(0, 17) + '…' : t);
      let y = top, i = 0, rows = '', rail_ = '';
      cards.forEach((c, k) => {
        const col = GROUP_COLOURS[k % GROUP_COLOURS.length];
        const y0 = y + 8;
        const start = i;
        for (const [dir, text, note] of CARDS[c].msgs) {
          const yy = y + 30;
          const line = (x1, x2, dy = 0) => {
            const hx = x2 > x1 ? x2 - 7 : x2 + 7;
            return `<line class="dgm-ex-line" x1="${x1}" y1="${yy + dy}" x2="${x2}" y2="${yy + dy}"/><path class="dgm-ex-head" d="M${x2},${yy + dy} L${hx},${yy + dy - 4} L${hx},${yy + dy + 4} z"/>`;
          };
          const arrows = dir === '<>' ? line(L + 2, R - 2, -3) + line(R - 2, L + 2, 3) : dir === '>' ? line(L + 2, R - 2) : line(R - 2, L + 2);
          // Long labels are squeezed to fit between the lifelines (approximate glyph widths).
          const fit = (t, per) => (String(t).length * per > R - L - 10 ? ` textLength="${R - L - 10}" lengthAdjust="spacingAndGlyphs"` : '');
          rows += `<g class="dgm-ex-msg" data-i="${i}" data-g="${k}" style="--dgm-g:${col}">${arrows}<text class="dgm-ex-text" x="${(L + R) / 2}" y="${yy - 7}" text-anchor="middle"${fit(text, 6.2)}>${esc(text)}</text>${note ? `<text class="dgm-ex-note" x="${(L + R) / 2}" y="${yy + 15}" text-anchor="middle"${fit(note, 4.4)}>${esc(note)}</text>` : ''}</g>`;
          y += gap;
          i++;
        }
        const y1 = y + 2;
        rail_ += `<g class="dgm-ex-grp" data-g="${k}" data-start="${start}" data-title="${esc(CARDS[c].title)}" style="--dgm-g:${col}" tabindex="0" role="button" aria-label="Replay from ${esc(CARDS[c].title)}"><title>${esc(CARDS[c].title)}: click to replay from here</title><rect class="dgm-ex-band" x="0" y="${y0}" width="${W}" height="${y1 - y0}" rx="6"/><path class="dgm-ex-brk" d="M${rail - 4},${y0 + 2} h-6 v${y1 - y0 - 4} h6"/><text class="dgm-ex-tag" x="${rail - 14}" y="${(y0 + y1) / 2 + 4}" text-anchor="end">${esc(CARD_TAGS[c] || c)}</text></g>`;
        y += groupGap;
      });
      const H = y + 4;
      const svg = `<svg class="dgm-ex" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(cards.map((c) => CARDS[c].title).join(', then '))}">${rail_}<text class="dgm-seq-end" x="${L}" y="14" text-anchor="middle">${esc(short(left))}</text><text class="dgm-seq-end" x="${R}" y="14" text-anchor="end">${esc(short(right))}</text><line class="dgm-seq-life" x1="${L}" y1="22" x2="${L}" y2="${H - 4}"/><line class="dgm-seq-life" x1="${R}" y1="22" x2="${R}" y2="${H - 4}"/>${rows}</svg>`;
      return `<div class="dgm-exchange"><div class="dgm-ex-bar"><div class="dgm-sec">The exchange</div><span class="dgm-ex-cap"></span><button type="button" class="dgm-ex-toggle" aria-label="Pause">Pause</button></div>${svg}</div>`;
    }
    playExchange(holder) {
      clearTimeout(this.exTimer);
      const box = holder.querySelector('.dgm-exchange');
      if (!box) return;
      const msgs = [...box.querySelectorAll('.dgm-ex-msg')];
      const groups = [...box.querySelectorAll('.dgm-ex-grp')];
      const cap = box.querySelector('.dgm-ex-cap');
      const btn = box.querySelector('.dgm-ex-toggle');
      let i = 0;
      let paused = false;
      const show = (k) => {
        msgs.forEach((m, j) => {
          m.classList.toggle('is-done', j < k);
          m.classList.toggle('is-now', j === k);
        });
        const g = msgs[k]?.dataset.g;
        groups.forEach((x) => x.classList.toggle('is-on', x.dataset.g === g));
        const on = groups.find((x) => x.dataset.g === g);
        cap.textContent = on ? on.dataset.title : '';
      };
      const tick = () => {
        if (!box.isConnected || paused) return;
        if (i >= msgs.length) {
          show(msgs.length); // everything drawn; hold, then start again
          i = 0;
          this.exTimer = setTimeout(tick, 2800);
          return;
        }
        show(i++);
        this.exTimer = setTimeout(tick, 1150);
      };
      for (const g of groups) {
        const go = (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
          clearTimeout(this.exTimer);
          i = +g.dataset.start;
          if (reduceMotion || paused) return show(i);
          tick();
        };
        g.addEventListener('click', go);
        g.addEventListener('keydown', (ev) => (ev.key === 'Enter' || ev.key === ' ') && go(ev));
      }
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        paused = !paused;
        btn.textContent = paused ? 'Play' : 'Pause';
        btn.setAttribute('aria-label', btn.textContent);
        clearTimeout(this.exTimer);
        if (!paused) tick();
      });
      if (reduceMotion) {
        paused = true;
        btn.hidden = true;
        show(msgs.length);
        return;
      }
      tick();
    }

    showCard(v, ev) {
      clearTimeout(this.cardTimer);
      if (this.cardKey !== v.key) {
        this.card.innerHTML = this.cardHTML(v);
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
      this.endInspect();
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
      this.fitBox();
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
      this.endInspect();
      const body = this.panel.querySelector('.dgm-panel-body');
      body.innerHTML = this.cardHTML(v, true);
      this.playExchange(body);
      this.panel.hidden = false;
      this.root.classList.add('has-panel');
      this.fitBox();
      this.hideCard();
    }
    // The side panel can be resized: drag its inner edge (left on desktop, top on a phone), use the arrow
    // keys on the handle, or double-click it to reset. The size is a per-viewer convenience in localStorage.
    setupPanelResize() {
      const grip = document.createElement('div');
      grip.className = 'dgm-panel-grip';
      grip.tabIndex = 0;
      grip.setAttribute('role', 'separator');
      grip.setAttribute('aria-label', 'Resize the details panel');
      this.panel.after(grip);
      const phone = () => window.matchMedia('(max-width: 576px)').matches;
      const key = () => `dgm-panel-${phone() ? 'h' : 'w'}`;
      const set = (px, save = true) => {
        const box = this.stage.getBoundingClientRect();
        const ph = phone();
        const v = Math.round(Math.max(ph ? 140 : 260, Math.min(px, (ph ? box.height : box.width) * 0.94)));
        this.root.style.setProperty(ph ? '--dgm-panel-h' : '--dgm-panel-w', `${v}px`);
        grip.setAttribute('aria-orientation', ph ? 'horizontal' : 'vertical');
        if (save) try { localStorage.setItem(key(), v); } catch (e) { /* storage blocked: size lasts for this page only */ }
      };
      try {
        const w = +localStorage.getItem('dgm-panel-w');
        const h = +localStorage.getItem('dgm-panel-h');
        if (w) this.root.style.setProperty('--dgm-panel-w', `${w}px`);
        if (h) this.root.style.setProperty('--dgm-panel-h', `${h}px`);
      } catch (e) { /* no storage: default size */ }
      const current = () => (phone() ? this.panel.offsetHeight : this.panel.offsetWidth);
      grip.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        grip.setPointerCapture(ev.pointerId);
        this.root.classList.add('is-resizing');
        const move = (e) => {
          const box = this.stage.getBoundingClientRect();
          set(phone() ? box.bottom - e.clientY : box.right - e.clientX, false);
        };
        const up = () => {
          grip.removeEventListener('pointermove', move);
          this.root.classList.remove('is-resizing');
          set(current());
        };
        grip.addEventListener('pointermove', move);
        grip.addEventListener('pointerup', up, { once: true });
        grip.addEventListener('pointercancel', up, { once: true });
      });
      grip.addEventListener('keydown', (ev) => {
        const grow = phone() ? { ArrowUp: 1, ArrowDown: -1 } : { ArrowLeft: 1, ArrowRight: -1 };
        if (!(ev.key in grow)) return;
        ev.preventDefault();
        ev.stopPropagation();
        set(current() + grow[ev.key] * 32);
      });
      grip.addEventListener('dblclick', () => {
        this.root.style.removeProperty(phone() ? '--dgm-panel-h' : '--dgm-panel-w');
        try { localStorage.removeItem(key()); } catch (e) { /* nothing stored */ }
      });
      for (const t of ['click', 'wheel']) grip.addEventListener(t, (ev) => ev.stopPropagation());
    }
    // The player box sits left of an open side panel when the canvas has room for both; otherwise over the
    // panel's foot, and the panel gets that much room at its bottom, so all of its content scrolls into view.
    fitBox() {
      const box = this.root.querySelector('.dgm-banner');
      if (!box || !this.panel) return;
      const on = box.classList.contains('is-on') && this.root.classList.contains('has-panel');
      const tight = on && this.stage.clientWidth - this.panel.offsetWidth < box.offsetWidth + 24;
      this.root.classList.toggle('is-box-over-panel', tight);
      if (tight) this.root.style.setProperty('--dgm-box-h', `${box.offsetHeight + 12}px`);
    }
    // The side panel stops being the packet inspector (it no longer follows the steps).
    endInspect() {
      this.inspecting = false;
      this.panel.classList.remove('is-inspector');
    }
    closePanel() {
      this.endInspect();
      clearTimeout(this.exTimer);
      this.panel.hidden = true;
      this.root.classList.remove('has-panel');
      this.fitBox();
    }

    // ---------------------------------------------------------------- camera
    applyCam() {
      this.view.setAttribute('transform', `translate(${this.cam.x},${this.cam.y}) scale(${this.cam.k})`);
      this.root.style.setProperty('--dgm-zoom', this.cam.k);
    }
    // With the zoom locked, a camera move keeps the current zoom and centres on the point the move
    // aimed at, so it only pans.
    lockCam(to) {
      if (!this.zoomLocked || Math.abs(to.k - this.cam.k) < 1e-6) return to;
      const W = this.stage.clientWidth;
      const H = this.stage.clientHeight;
      const { k } = this.cam;
      const wx = (W / 2 - to.x) / to.k;
      const wy = (H / 2 - to.y) / to.k;
      return { k, x: W / 2 - k * wx, y: H / 2 - k * wy };
    }
    setZoomLock(on) {
      this.zoomLocked = on;
      const b = this.zoomLockBtn;
      if (b) {
        b.innerHTML = `<i class="fas fa-${on ? 'lock' : 'lock-open'}" aria-hidden="true"></i>`;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        const label = on ? 'Zoom locked: click to zoom in and out again' : 'Lock zoom at this level';
        b.setAttribute('aria-label', label);
        b.title = label;
      }
      for (const z of this.zoomBtns || []) z.disabled = on;
      this.root.classList.toggle('is-zoom-locked', on);
    }
    // A zoom the reader asked for (buttons, wheel, pinch, keys): refused while the zoom is locked.
    userZoom(f, cx, cy) {
      if (this.zoomLocked) return this.flashHint('Zoom is locked: unlock it at the foot of the sidebar to zoom');
      this.zoomBy(f, cx, cy);
    }
    flashHint(text) {
      const hint = this.root.querySelector('.dgm-hint');
      if (hint && text) hint.textContent = text;
      this.root.classList.add('show-hint');
      clearTimeout(this.hintTimer);
      this.hintTimer = setTimeout(() => this.root.classList.remove('show-hint'), 1400);
    }
    animateCam(to, animate = true) {
      cancelAnimationFrame(this.camRaf);
      to = this.lockCam(to);
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
      // While the player box is up (bottom right), frame what a step shows in the room left of it, when
      // the canvas is wide enough for that to help.
      const box = this.root.classList.contains('is-playing-box') && this.root.querySelector('.dgm-banner');
      const right = box && W > 720 ? box.offsetWidth + 16 : 0;
      const Wv = W - right;
      const k = Math.min(maxK, (Wv - 2 * pad) / Math.max(1, b.x1 - b.x0), (H - 2 * pad) / Math.max(1, b.y1 - b.y0));
      return { k, x: (Wv - k * (b.x1 + b.x0)) / 2, y: (H - k * (b.y1 + b.y0)) / 2 };
    }
    // Open on the whole diagram when it fits at a readable size, else at a readable zoom on its start
    // (left, top), like a map: drag to explore, Fit shows everything.
    // Everything on the canvas: the components and the band strips behind them.
    allBox() {
      const b = this.box([...this.pos.keys()]);
      const s = this.bandsBox;
      if (!b || !s) return b;
      return { x0: Math.min(b.x0, s.x0), y0: Math.min(b.y0, s.y0), x1: Math.max(b.x1, s.x1), y1: Math.max(b.y1, s.y1) };
    }
    overview(animate = true) {
      const b = this.allBox();
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
      const b = this.allBox();
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
    // After opening or closing a component: its anchor point stays at the same place on screen (if the
    // layout moved it at all, the camera follows by the same amount). Zoom out only if it doesn't
    // fit, around that point.
    zoomToFit(id, was, animate = true) {
      const p = this.pos.get(id);
      if (!p) return;
      const W = this.stage.clientWidth;
      const H = this.stage.clientHeight;
      const pad = 28;
      const top = 0;
      const { k } = this.cam;
      const [cx, cy] = p.c || [p.x + p.w / 2, p.y + p.h / 2];
      const [ox, oy] = was || [cx, cy];
      const sx = this.cam.x + k * ox;
      const sy = this.cam.y + k * oy;
      // Its center is off screen (opened from the keyboard after a pan): just bring it into view.
      if (sx < pad || sx > W - pad || sy < top + pad || sy > H - pad) return this.focusOn([id], animate);
      // Room on each side of the anchor point, against the component's extent on that side.
      const fitK = Math.min(
        k,
        (sx - pad) / Math.max(1, cx - p.x),
        (W - pad - sx) / Math.max(1, p.x + p.w - cx),
        (sy - top - pad) / Math.max(1, cy - p.y),
        (H - pad - sy) / Math.max(1, p.y + p.h - cy)
      );
      const nk = this.zoomLocked || fitK >= k - 1e-3 ? k : Math.max(0.2, fitK);
      const to = { k: nk, x: sx - nk * cx, y: sy - nk * cy };
      if (Math.abs(to.k - k) < 1e-3 && Math.abs(to.x - this.cam.x) < 0.5 && Math.abs(to.y - this.cam.y) < 0.5) return;
      this.animateCam(to, animate);
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
          if (!this.zoomLocked) this.zoomBy((pinch.k * d) / pinch.d / this.cam.k, (a.x + b.x) / 2 - box.left, (a.y + b.y) / 2 - box.top);
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
          const wantsZoom = ev.ctrlKey || ev.metaKey || this.root.classList.contains('is-full');
          // Locked: a plain scroll still scrolls the page; a zoom gesture says the zoom is locked.
          if (!wantsZoom) return this.flashHint(this.zoomLocked ? 'Zoom is locked' : 'Ctrl + scroll (or pinch) to zoom');
          ev.preventDefault();
          const box = st.getBoundingClientRect();
          this.userZoom(Math.exp(-ev.deltaY * 0.0022), ev.clientX - box.left, ev.clientY - box.top);
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
        } else if (ev.key === '+' || ev.key === '=') this.userZoom(1.2);
        else if (ev.key === '-') this.userZoom(1 / 1.2);
        else if (ev.key === '0') this.fit(true);
      });
      window.addEventListener('resize', () => {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => {
          this.fitBox();
          this.fit(false);
        }, 150);
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
    // Lock mode (the padlock, or `lock: true`) plays on the layout the reader has: their level, the
    // components they opened and their view tab. Nothing opens or closes; the camera still moves, and
    // a packet whose hop is inside a closed component (or on an arrow the tab hides) pulses it instead.
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
      this.locked = this.data.lock === true;
      const playBtn = ctl.querySelector('[data-act="play"]');
      // The Use cases menu is how a use case starts (a click plays it), so it is there even for one.
      const picker = this.menu('scn', list.length > 1 ? 'Use cases' : 'Use case');
      if (picker) picker.setAttribute('role', 'tablist');
      const modeLabel = ctl.querySelector('.dgm-toggle-mode');
      const modeBox = modeLabel && modeLabel.querySelector('input');
      const lockBtn = ctl.querySelector('[data-act="lock"]');
      // Details: the step card shows each step's `detail` (3 to 10 lines) instead of its short `text`.
      // `details: true` starts with it on; the reader's choice is remembered in this browser.
      const detailLabel = ctl.querySelector('.dgm-toggle-details');
      const detailBox = detailLabel && detailLabel.querySelector('input');
      // Offered whenever a step has a `detail` or makes a hop (Details then lists its hops).
      const hasDetail = list.some((x) => x.steps.some((y) => y.detail || (y.edges || []).length || (y.path || []).length));
      const detailKey = `dgm-details:${this.root.id}`;
      let stored = null;
      try {
        stored = localStorage.getItem(detailKey);
      } catch (e) { /* storage blocked: fall back to the diagram's default */ }
      this.details = hasDetail && (stored === null ? this.data.details === true : stored === '1');
      if (detailLabel) {
        detailLabel.hidden = !hasDetail;
        detailBox.checked = this.details;
      }
      const setLockIcon = () => {
        if (!lockBtn) return;
        lockBtn.innerHTML = `<i class="fas fa-${this.locked ? 'lock' : 'lock-open'}" aria-hidden="true"></i>`;
        lockBtn.setAttribute('aria-pressed', this.locked ? 'true' : 'false');
        lockBtn.title = this.locked ? 'Layout locked: use cases play on this layout. Click to let them open components' : 'Lock layout: play use cases without opening or closing components';
        this.root.classList.toggle('is-locked', this.locked);
      };
      setLockIcon();
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
      // The use case's steps as written (for the current mode). Each group of hops remembers its step's
      // action (the banner line while it runs) and each hop its step's packet, so both survive grouping.
      const rawOf = (scn, mode) =>
        scn.steps.filter((x) => !x.when || x.when === mode).map((x, i) => {
          const s = { ...x, edges: x.edges || [], groups: groupsOf(x), rawIdx: [i] };
          s.groups.forEach((g) => {
            g.action = s.action || s.title;
            g.forEach((l) => (l.pk = (s.packets && s.packets[l.rev ? `~${l.id}` : l.id]) || null));
          });
          return s;
        });
      // Lock mode plays on the reader's layout, so a step whose every hop starts and ends inside one closed
      // component only pulses it. Consecutive steps inside the same closed component become one step: one
      // card listing each of them, and fewer steps in the count. Opening the component (or unlocking) shows
      // them one by one again.
      const insideOf = (x) => {
        const legs = x.groups.flat();
        let c = null;
        for (const l of legs) {
          const a = this.repOf(l.from);
          if (!a || a !== this.repOf(l.to)) return null;
          if (c && c !== a) return null;
          c = a;
        }
        if (!legs.length) {
          const reps = (x.lights || []).map((id) => this.repOf(id));
          if (!reps.length || reps.some((r, k) => !r || r !== reps[0] || r.id === x.lights[k])) return null;
          c = reps[0];
        }
        return c;
      };
      const groupSteps = (raw) => {
        if (!this.locked) return raw;
        const out = [];
        for (let i = 0; i < raw.length; ) {
          const c = insideOf(raw[i]);
          let j = i + 1;
          if (c) while (j < raw.length && !raw[j].clear && insideOf(raw[j]) === c) j++;
          if (j - i < 2) {
            out.push(raw[i++]);
            continue;
          }
          const m = raw.slice(i, j);
          const last = m[m.length - 1];
          const lights = [...new Set(m.flatMap((y) => y.lights || []))];
          out.push({
            title: `Inside ${c.label}`,
            action: `${c.label}: ${m.length} steps inside it`,
            text: '',
            merged: m,
            inside: c.id,
            rawIdx: m.flatMap((y) => y.rawIdx),
            edges: [],
            groups: m.flatMap((y) => y.groups),
            lights: lights.length ? lights : undefined,
            clear: m[0].clear,
            result: last.result,
            outcome: last.outcome,
            at: last.at || (last.groups.length ? undefined : (last.lights || [])[0])
          });
          i = j;
        }
        return out;
      };
      const buildSteps = () => {
        this.rawSteps = rawOf(this.scn, this.mode);
        this.steps = groupSteps(this.rawSteps);
      };
      // The step count on each use case in the menu: what Play will show at the current layout.
      const updateCounts = () => {
        picker?.querySelectorAll('.dgm-scn').forEach((b, j) => {
          const scn = list[j];
          const n = scn === this.scn ? this.steps.length : groupSteps(rawOf(scn, (scn.modes || [{ id: 'default' }])[0].id)).length;
          const meta = b.querySelector('.dgm-scn-meta');
          if (meta) meta.textContent = `${n} step${n === 1 ? '' : 's'}`;
        });
      };
      // After a layout change or a lock toggle: group again, keep the place (the step holding the same
      // written step), refresh the card and the counts.
      this.regroup = () => {
        if (!this.rawSteps) return;
        const rawAt = (i) => (i != null && i >= 0 && this.steps[i] ? this.steps[i].rawIdx[this.steps[i].rawIdx.length - 1] : null);
        const k = rawAt(this.k);
        const run = rawAt(this.stepRunning);
        const before = this.steps.map((x) => x.rawIdx.join(',')).join('|');
        this.steps = groupSteps(this.rawSteps);
        const at = (r) => (r == null ? null : this.steps.findIndex((x) => x.rawIdx.includes(r)));
        if (k != null) this.k = at(k);
        if (run != null) this.stepRunning = at(run);
        updateCounts();
        if (before !== this.steps.map((x) => x.rawIdx.join(',')).join('|') && this.stepRunning != null) this.setCard(this.stepRunning);
      };
      // The box shows the current step; before the first step, the use case and its summary.
      this.setCaption = (i) => {
        if (i < 0) this.setIntro();
        else this.setCard(i);
      };
      // The player box in the canvas's bottom-right corner, the one place for the description and the
      // controls: the step's number, the use case and a close button; the step's title, the banner line
      // (what the step is doing, then its outcome) and its description: `text`, or `detail` while Details
      // is on (the box grows taller for it); the controls at its foot. It shows only while a use case
      // runs: a click on a use case opens it and plays, and it goes END_CARD_MS after the last step.
      const banner = this.root.querySelector('.dgm-banner');
      if (banner) {
        banner.insertAdjacentHTML('afterbegin', '<div class="dgm-banner-head"><span class="dgm-banner-n"></span><span class="dgm-banner-scn"></span><button type="button" class="dgm-banner-close" aria-label="Close the player" title="Stop and close"><i class="fas fa-xmark" aria-hidden="true"></i></button></div><div class="dgm-banner-title"></div><div class="dgm-banner-line" aria-live="polite"></div><div class="dgm-banner-text"></div>');
        // Clicks, drags and scrolls on the box are not pans or clicks on the canvas.
        for (const t of ['pointerdown', 'click', 'wheel', 'dblclick']) banner.addEventListener(t, (ev) => ev.stopPropagation());
      }
      const part = (c) => banner && banner.querySelector(`.dgm-banner-${c}`);
      this.showBox = (on) => {
        clearTimeout(this.endTimer);
        if (banner) banner.classList.toggle('is-on', on);
        this.root.classList.toggle('is-playing-box', on);
        this.fitBox();
      };
      // Close: stop, put the reader's layout back and hide the box.
      this.closeBox = () => {
        this.stop();
        this.showBox(false);
        return this.showStep(-1);
      };
      part('close')?.addEventListener('click', () => this.closeBox());
      // What Details adds to a step without a `detail`: each hop it makes, with the protocol and why.
      const hopsMd = (x) => {
        const seen = new Set();
        const rows = [];
        const legs = x.groups.flat();
        for (const l of legs) {
          // A reply whose request is in the same step adds nothing: the request's row covers both.
          if (seen.has(l.id) || (l.rev && legs.some((m) => !m.rev && m.id === l.id))) continue;
          seen.add(l.id);
          const a = this.nodes.get(l.from)?.label || l.from;
          const b = this.nodes.get(l.to)?.label || l.to;
          const proto = [l.e.proto, l.e.port != null ? `:${l.e.port}` : ''].join('') || l.e.label || '';
          const why = `${l.rev ? 'reply. ' : ''}${l.e.why || l.e.label || ''}`;
          rows.push(`- **${a} → ${b}**${proto ? ` (${proto})` : ''}${why ? `: ${String(why).replace(/\s+/g, ' ').trim()}` : ''}`);
        }
        for (const id of x.lights || []) {
          const n = this.nodes.get(id);
          if (n && !x.groups.flat().some((l) => l.from === id || l.to === id)) rows.push(`- **${n.label}**${n.sub ? `: ${n.sub}` : ''}`);
        }
        return rows.join('\n');
      };
      // A grouped step's description: each step it holds, numbered, with its text (its detail with Details on).
      const mergedMd = (x) =>
        x.merged
          .map((m, k) => {
            const d = this.details && this.detailOf(m);
            return d ? `**${k + 1} · ${m.title}**\n\n${d}` : `**${k + 1} · ${m.title}.** ${m.text || ''}`;
          })
          .join('\n\n');
      this.detailOf = (x) => {
        if (x.detail) return x.detail;
        const hops = hopsMd(x);
        return hops ? `${x.text || ''}\n\n${hops}` : '';
      };
      // ---- Packet inspector: what one hop of a step carries, layer by layer, in the side panel.
      // A hop's content: the step's `packets: {<edge id or ~id>: …}`, else the arrow's own `packet`
      // (the request) or `reply` (the response). Without one, the layers still say what the arrow knows.
      const packetOf = (x, l) => l.pk || (x && x.packets && x.packets[l.rev ? `~${l.id}` : l.id]) || (l.rev ? l.e.reply : l.e.packet) || null;
      this.packetOf = packetOf;
      const inspectBtn = ctl.querySelector('[data-act="inspect"]');
      const UDP = ['WIREGUARD', 'DNS', 'QUIC', 'UDP', 'NTP', 'STATSD', 'SYSLOG', 'SNMP'];
      const FIELDS = { grpc: 'Metadata', kafka: 'Headers', amqp: 'Properties', mqtt: 'Properties', query: 'Parameters' };
      this.pkOpen = new Set(['app', 'body']);
      const inline = (t) => markdown(String(t)).replace(/^<p>|<\/p>$/g, '');
      const dl = (rows) => `<dl class="dgm-pk-dl">${rows.filter(([, v]) => v != null && v !== '').map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`;
      const layer = (key, tag, name, sum, inner) =>
        `<details class="dgm-pk-layer" data-layer="${key}"${this.pkOpen.has(key) ? ' open' : ''}><summary><span class="dgm-pk-tag">${esc(tag)}</span><span class="dgm-pk-name">${esc(name)}</span><span class="dgm-pk-sum">${sum}</span></summary><div class="dgm-pk-body">${inner}</div></details>`;
      const security = (e, cards) => {
        const c = certsOf(e);
        const cat = this.data.certs || {};
        const name = (id) => `<code>${esc(cat[id]?.label || id)}</code>`;
        const p = protoKey(e.proto);
        if (cards.includes('tls') || cards.includes('mtls')) {
          return {
            tag: cards.includes('mtls') ? 'mTLS' : 'TLS',
            sum: cards.includes('mtls') ? 'Mutual TLS: both ends show a certificate' : 'TLS: encrypted on the wire',
            rows: [['Encrypted', 'Yes. The content below is what the receiver reads after decrypting it'], ['Server certificate', c?.server.map(name).join(', ')], ['Client certificate', c?.client.map(name).join(', ')], ['Note', c?.note ? inline(c.note) : null]],
            enc: true
          };
        }
        if (p === 'SSH') return { tag: 'SSH', sum: 'Encrypted with SSH session keys', rows: [['Encrypted', 'Yes, with keys both ends derived; no certificate']], enc: true };
        if (p === 'WIREGUARD') return { tag: 'WG', sum: 'Encrypted inside the WireGuard tunnel', rows: [['Encrypted', 'Yes, with the tunnel\'s session keys']], enc: true };
        if (c?.planned) return { tag: 'TLS?', sum: 'Not decided yet', rows: [['Plan', inline(c.planned)]] };
        if (c?.none) return { tag: 'None', sum: 'No TLS on this hop', rows: [['Why', inline(c.none)]] };
        return { tag: '?', sum: 'Not stated', rows: [['Encrypted', 'The diagram does not say this hop uses TLS']] };
      };
      const inspectHTML = (i, j) => {
        const x = this.steps[i];
        const legs = x.groups.flat();
        const where = `<div class="dgm-crumbs">${esc(this.scn.title || 'Use case')} › step ${i + 1}/${this.steps.length}: ${esc(x.title || '')}</div>`;
        if (!legs.length) return `${where}<div class="dgm-panel-head"><h4 style="--dgm-c:var(--dgm-accent2)">Packet inspector</h4></div><p class="dgm-pk-none">This step sends no packet: it ${esc((x.action || x.title || '').replace(/^./, (c) => c.toLowerCase()))}.</p>`;
        const l = legs[j];
        const e = l.e;
        const a = this.nodes.get(l.from);
        const b = this.nodes.get(l.to);
        const pk = packetOf(x, l);
        const cards = cardsFor(e);
        const p = protoKey(e.proto);
        const proto = [e.proto, e.port != null ? `:${e.port}` : ''].join('');
        let h = `${where}<div class="dgm-panel-head"><h4 style="--dgm-c:var(--dgm-accent2)">Packet inspector</h4><span class="dgm-pk-kind${l.rev ? ' is-back' : ''}">${l.rev ? 'Reply' : 'Request'}</span></div>`;
        if (legs.length > 1) {
          h += `<div class="dgm-pk-tabs" role="tablist">${legs.map((m, k) => `<button type="button" class="dgm-pk-tab${k === j ? ' is-on' : ''}${m.rev ? ' is-back' : ''}" role="tab" aria-selected="${k === j}" data-j="${k}">${k + 1}. ${esc(this.nodes.get(m.from)?.label || m.from)} → ${esc(this.nodes.get(m.to)?.label || m.to)}</button>`).join('')}</div>`;
        }
        h += `<div class="dgm-pk-route"><b>${esc(a?.label || l.from)}</b> <span aria-hidden="true">→</span> <b>${esc(b?.label || l.to)}</b>${proto ? ` <code>${esc(proto)}</code>` : ''}</div>`;
        const lead = pk?.summary || (l.rev ? `The reply. ${e.why || ''}` : e.why);
        if (lead) h += `<div class="dgm-lead">${markdown(String(lead))}</div>`;
        // Network: who talks to whom (component names; the diagram does not model addresses).
        const end = (n, id) => `${esc(n?.label || id)}${n?.sub ? ` <span class="dgm-pk-muted">${esc(n.sub)}</span>` : ''}${n?.facts?.where ? ` <span class="dgm-pk-muted">· ${inline([].concat(n.facts.where).join(' · '))}</span>` : ''}`;
        h += layer('net', 'IP', 'Network', `${esc(a?.label || l.from)} → ${esc(b?.label || l.to)}`, dl([['Source', end(a, l.from)], ['Destination', end(b, l.to)]]));
        // Transport: TCP or UDP and the ports (the server's port; the client's is a random ephemeral one).
        const tp = UDP.includes(p) ? 'UDP' : cards.length || p === 'TCP' || e.port != null ? 'TCP' : null;
        if (tp) {
          const srv = e.port != null ? String(e.port) : 'not stated';
          const eph = 'ephemeral (the OS picks one)';
          h += layer('tp', tp, 'Transport', e.port != null ? `${l.rev ? 'from' : 'to'} port ${e.port}` : tp, dl([['Protocol', tp], ['Source port', esc(l.rev ? srv : eph)], ['Destination port', esc(l.rev ? eph : srv)], ['Connection', tp === 'TCP' && cards.includes('tcp') ? 'Opened with the TCP handshake (or reused from a pool)' : null]]));
        }
        const sec = security(e, cards);
        h += layer('sec', sec.tag, 'Security', esc(sec.sum), dl(sec.rows));
        // Application: the protocol's message, then this packet's own content when the diagram has it.
        const app = [...cards].reverse().find((k) => !['tcp', 'tls', 'mtls'].includes(k));
        const msg = app && CARDS[app].msgs.find(([d]) => d === (l.rev ? '<' : '>')) || (app && CARDS[app].msgs.find(([d]) => d === '<>'));
        const label = FIELDS[app] || 'Headers';
        const fields = pk?.headers && typeof pk.headers === 'object' ? (Array.isArray(pk.headers) ? pk.headers.map((t) => String(t)) : Object.entries(pk.headers).map(([k, v]) => `${k}: ${v}`)) : [];
        let ai = dl([['Protocol', app ? esc(CARDS[app].title) : esc(e.proto || e.label || 'not stated')], ['Message', msg ? `${esc(msg[1])}${msg[2] ? ` <span class="dgm-pk-muted">(${esc(msg[2])})</span>` : ''}` : null]]);
        if (pk?.line || fields.length) {
          ai += `<div class="dgm-config dgm-pk-raw"><div class="dgm-config-head"><span>${pk.line ? 'Message' : label}</span></div><pre><code>${esc([pk.line, ...fields].filter(Boolean).join('\n'))}</code></pre></div>`;
        }
        h += layer('app', (app && CARD_TAGS[app]) || e.proto || 'App', 'Application', pk?.line ? `<code>${esc(String(pk.line).slice(0, 60))}</code>` : msg ? esc(msg[1]) : esc(e.label || ''), ai);
        const body = pk && pk.body != null ? (typeof pk.body === 'string' ? pk.body.replace(/\n+$/, '') : JSON.stringify(pk.body, null, 2)) : null;
        if (body != null) {
          const bytes = new TextEncoder().encode(body).length;
          const lang = pk.lang || (typeof pk.body === 'string' ? (/^\s*[[{]/.test(body) ? 'json' : 'text') : 'json');
          h += layer('body', 'Body', 'Payload', `${bytes} bytes · ${esc(lang)}`, `<div class="dgm-config dgm-pk-payload"><div class="dgm-config-head"><span>${esc(lang)} · ${bytes} bytes</span><button type="button" class="dgm-copy">Copy</button></div><pre><code>${esc(body)}</code></pre></div>`);
        }
        if (pk) {
          // Where it comes from: copied from `source`; with `illustrative` too, the shape follows the source and
          // the values are examples; `illustrative` alone, shortened or made up.
          const from = pk.source ? `<code>${esc(pk.source)}</code>` : '';
          const ill = '<span class="dgm-pk-ill">Illustrative</span>';
          const origin = pk.illustrative ? (from ? `${ill} the shape follows ${from}; the values are examples` : `${ill} shortened or made up to show the shape, not copied from a real request`) : from ? `Copied from ${from}` : '';
          const src = [pk.note ? `<div class="dgm-pk-note">${markdown(String(pk.note))}</div>` : '', origin ? `<div class="dgm-pk-src">${origin}</div>` : ''].join('');
          h += src;
          if (sec.enc && (body != null || pk.line)) h += '<div class="dgm-pk-src">On the wire this content is encrypted; the inspector shows it as the receiver reads it.</div>';
        } else {
          h += `<p class="dgm-pk-none">The diagram does not record what this ${l.rev ? 'reply' : 'request'} carries; the layers above show what its arrow says about it.</p>`;
        }
        return h;
      };
      // Open (or move) the inspector on step i's hop j. It follows the steps until another panel opens.
      // settle: the reader paused on this step to inspect it, so it counts as reached (lit, and Next or
      // Play go on from the step after it).
      this.inspect = (i, j = 0, settle = false) => {
        const x = this.steps[i];
        if (!x) return;
        if (settle) {
          if (this.k < i) {
            this.k = i;
            this.computeLit(i);
            this.applyLit();
          }
          // The box shows the same step (a pause before its card was drawn would leave the one before).
          this.stepRunning = i;
          this.showBox(true);
          this.setCaption(i);
          this.setBanner(x.action || x.title);
        }
        const legs = x.groups.flat();
        j = Math.max(0, Math.min(j, legs.length - 1));
        clearTimeout(this.endTimer);
        clearTimeout(this.exTimer);
        const body = this.panel.querySelector('.dgm-panel-body');
        body.innerHTML = inspectHTML(i, j);
        body.querySelectorAll('.dgm-pk-tab').forEach((t) => t.addEventListener('click', () => this.inspect(i, Number(t.dataset.j))));
        body.querySelectorAll('.dgm-pk-layer').forEach((d) =>
          d.addEventListener('toggle', () => {
            if (d.open) this.pkOpen.add(d.dataset.layer);
            else this.pkOpen.delete(d.dataset.layer);
          })
        );
        body.querySelector('.dgm-copy')?.addEventListener('click', (ev) => {
          const code = body.querySelector('.dgm-pk-payload code').textContent;
          navigator.clipboard?.writeText(code).then(() => (ev.target.textContent = 'Copied'));
        });
        this.inspectAt = { i, j };
        this.panel.hidden = false;
        this.panel.classList.add('is-inspector');
        this.root.classList.add('has-panel');
        this.fitBox();
        this.hideCard();
        this.inspecting = true;
      };
      this.setCard = (i) => {
        const x = this.steps[i];
        if (!banner || !x) return;
        if (inspectBtn) inspectBtn.disabled = !x.groups.flat().length;
        const long = x.merged ? mergedMd(x) : this.details && this.detailOf(x);
        part('n').textContent = `${i + 1}/${this.steps.length}`;
        part('title').textContent = x.merged ? `${x.title} · ${x.merged.length} steps` : x.title || '';
        part('scn').textContent = this.scn.title || 'Guided tour';
        // A blank line in `detail` starts a new paragraph; `- ` lines are a list.
        part('text').innerHTML = String(long || x.text || '').split(/\n\s*\n/).map((t) => markdown(t)).join('');
        part('text').scrollTop = 0;
        banner.classList.toggle('is-detailed', !!long);
        this.fitBox();
      };
      // Before the first step: the use case and its summary (the box itself opens and closes on its own).
      this.setIntro = () => {
        this.stepRunning = null;
        if (inspectBtn) inspectBtn.disabled = true;
        if (!banner) return;
        part('n').textContent = '';
        part('scn').textContent = this.scn.title || 'Guided tour';
        part('title').textContent = '';
        part('line').textContent = '';
        part('text').innerHTML = this.scn.summary ? markdown(this.scn.summary) : '';
        banner.classList.remove('is-run', 'is-success', 'is-fail', 'is-done', 'is-detailed');
      };
      this.setBanner = (text, state = 'run') => {
        if (!banner) return;
        if (!text) {
          if (this.stepRunning == null) this.setIntro();
          return;
        }
        const icon = { success: '✓ ', fail: '✗ ', done: '● ' }[state] || '';
        part('line').textContent = icon + text;
        banner.classList.remove('is-run', 'is-success', 'is-fail', 'is-done');
        banner.classList.add('is-on', `is-${state}`);
      };
      // How long auto-play stays on a step after its packets arrive: the usual pause, or, with Details
      // on, long enough to read the detail (time already spent on the step counts).
      this.dwell = (x) => {
        const base = DWELL_MS / this.speed;
        const d = x && (x.merged ? mergedMd(x) : this.details && this.detailOf(x));
        if (!d) return base;
        const words = String(d).split(/\s+/).filter(Boolean).length;
        const read = Math.min(READ_MAX_MS, words * READ_MS_PER_WORD) / this.speed;
        return Math.max(base, read - (performance.now() - (this.stepT0 || 0)));
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
        const view = this.showAll ? ALL_VIEWS : this.activeView;
        const same = b.view === view && b.level === this.level && b.expanded.size === this.expanded.size && [...b.expanded].every((id) => this.expanded.has(id));
        if (!same) {
          this.expanded = b.expanded;
          this.level = b.level;
          this.showAll = b.view === ALL_VIEWS;
          this.activeView = this.showAll ? null : b.view;
          this.markView();
          this.updateLevelLabel();
          await this.relayout({});
        }
        this.animateCam(b.cam);
      };
      // Put back the reader's layout (open groups, level, view) but keep the snapshot, so the camera
      // still returns at the end: used when lock mode is turned on in the middle of a use case.
      this.restoreLayout = async () => {
        const b = this.before;
        if (!b) return;
        await this.restoreBefore();
        this.before = b;
      };
      // Open the groups step i needs, and close the open ones that neither it nor a later step uses,
      // so the packet is easy to follow.
      this.ensureVisible = async (i) => {
        const x = this.steps[i];
        if (!x) return [];
        this.snapshot();
        // Locked: the layout stays as the reader left it; only the camera follows the packet.
        if (this.locked) return stepIds(x);
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
        // The step card covers the bottom of the canvas (unless it sits under it): frame the components above it.
        const card = this.stage.querySelector('.dgm-banner.is-on');
        const cover = card ? Math.min(card.offsetHeight + 16, this.stage.clientHeight * 0.45) : 30;
        const H = this.stage.clientHeight - cover;
        const pad = 60;
        const k = Math.min(1.3, (W - 2 * pad) / Math.max(1, b.x1 - b.x0), (H - 2 * pad) / Math.max(1, b.y1 - b.y0));
        this.animateCam({ k, x: (W - k * (b.x1 + b.x0)) / 2, y: (H - k * (b.y1 + b.y0)) / 2 });
      };
      // Packets travel one group at a time; within a group, along every arrow at once. Requests are
      // the accent2 pointer; responses (~) a green packet running backwards. 'stopped' if cancelled.
      // Where a leg has no arrow on the canvas: inside one closed component (or a group that holds the
      // other end), or on an arrow the view tab hides. Returns the component to pulse and a note.
      const hiddenLeg = (l) => {
        const a = this.repOf(l.from);
        const b = this.repOf(l.to);
        if (a && b && (a === b || this.ancestorsOf(b.id).includes(a) || this.ancestorsOf(a.id).includes(b))) {
          const outer = a === b || this.ancestorsOf(b.id).includes(a) ? a : b;
          return { rep: outer, note: `inside ${outer.label}` };
        }
        return { rep: b || a, note: 'on an arrow hidden in this view' };
      };
      const runGroup = (legs, token) =>
        new Promise((resolve) => {
          const runs = [];
          const hidden = [];
          for (const l of legs) {
            const el = this.edgeEls.get(`${this.repOf(l.e.from)?.id}>${this.repOf(l.e.to)?.id}`);
            if (el) runs.push({ ...el, rev: l.rev, leg: l });
            else hidden.push(hiddenLeg(l));
          }
          const x = this.steps[this.stepRunning];
          const line = legs.action || (x ? x.action || x.title : '');
          this.setBanner(hidden.length && line ? `${line} · ${[...new Set(hidden.map((h) => h.note))].join(', ')}` : line || null);
          const pulsed = [...new Set(hidden.map((h) => h.rep && this.nodeEls.get(h.rep.id)).filter(Boolean))];
          pulsed.forEach((el) => {
            el.classList.remove('is-pulsing');
            void el.getBoundingClientRect();
            el.classList.add('is-pulsing');
          });
          const unpulse = () => pulsed.forEach((el) => el.classList.remove('is-pulsing'));
          if (reduceMotion) {
            unpulse();
            return resolve();
          }
          if (!runs.length) {
            // Nothing to travel: hold for the time a short hop takes while the component pulses.
            const t0 = performance.now();
            const wait = (now) => {
              if (token !== this.run) {
                unpulse();
                return resolve('stopped');
              }
              if (now - t0 < 900 / this.speed) requestAnimationFrame(wait);
              else {
                unpulse();
                resolve();
              }
            };
            return requestAnimationFrame(wait);
          }
          const maxLen = Math.max(...runs.map((r) => r.m.total));
          const D = (600 + maxLen * 1.4) / this.speed;
          // Each hop is a packet: a small frame with a header strip and its protocol on it, a chevron in
          // front showing which way it travels (requests in accent2, replies green). It stays upright so
          // the protocol reads on any arrow; a press on it pauses the use case and opens the inspector.
          const legsOf = x ? x.groups.flat() : [];
          const ptrs = runs.map((r) => {
            const e = r.leg.e;
            const raw = String(e.proto || e.label || 'data').trim();
            const tag = raw.length > 10 ? raw.slice(0, 9) + '…' : raw;
            const w = Math.round(Math.max(34, 14 + tag.length * 6.6));
            const g = make('g', { class: 'dgm-packet' + (r.rev ? ' is-back' : '') + (x && packetOf(x, r.leg) ? ' has-content' : '') }, this.pointerLayer);
            make('title', {}, g).textContent = `${r.rev ? 'Reply' : 'Request'} (${raw}): click to inspect it`;
            make('rect', { class: 'dgm-packet-glow', x: -w / 2 - 5, y: -16, width: w + 10, height: 32, rx: 9 }, g);
            g._dir = make('path', { class: 'dgm-packet-dir', d: 'M-1,-5.5 L7,0 L-1,5.5 z' }, g);
            make('rect', { class: 'dgm-packet-body', x: -w / 2, y: -11, width: w, height: 22, rx: 3.5 }, g);
            make('path', { class: 'dgm-packet-hdr', d: `M${-w / 2},-4.5 V-7.5 Q${-w / 2},-11 ${-w / 2 + 3.5},-11 H${w / 2 - 3.5} Q${w / 2},-11 ${w / 2},-7.5 V-4.5 Z` }, g);
            make('text', { class: 'dgm-packet-tag', x: 0, y: 7, 'text-anchor': 'middle' }, g).textContent = tag;
            g._w = w;
            // pointerdown, not click: the packet moves away before a click would complete.
            g.addEventListener('pointerdown', (ev) => {
              ev.stopPropagation();
              ev.preventDefault();
              const i = this.stepRunning;
              this.stop();
              this.inspect(i, Math.max(0, legsOf.indexOf(r.leg)), true);
            });
            return g;
          });
          const t0 = performance.now();
          const tick = (now) => {
            if (token !== this.run) {
              ptrs.forEach((p) => p.remove());
              unpulse();
              return resolve('stopped');
            }
            const t = Math.min(1, (now - t0) / D);
            const dist = ease(t) * maxLen;
            runs.forEach((r, i) => {
              const d = Math.min(dist, r.m.total);
              const p = pointAt(r.m, r.rev ? r.m.total - d : d);
              ptrs[i].setAttribute('transform', `translate(${p.x},${p.y})`);
              // The chevron sits just outside the frame, on the side it travels towards.
              const ang = p.angle + (r.rev ? 180 : 0);
              const rad = (ang * Math.PI) / 180;
              const off = Math.abs(Math.cos(rad)) * (ptrs[i]._w / 2) + Math.abs(Math.sin(rad)) * 11 + 3;
              ptrs[i]._dir.setAttribute('transform', `rotate(${ang}) translate(${off},0)`);
              ptrs[i].style.display = d >= r.m.total ? 'none' : '';
              if (!r.rev) r.trail.style.strokeDashoffset = r.m.total - d;
              else r.trail.style.strokeDashoffset = 0;
            });
            if (t < 1) requestAnimationFrame(tick);
            else {
              ptrs.forEach((p) => p.remove());
              unpulse();
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
        clearTimeout(this.endTimer);
        if (i < 0 || !this.steps.length) {
          if (this.inspecting) this.closePanel();
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
        this.stepRunning = i;
        this.stepT0 = performance.now();
        const ids = await this.ensureVisible(i);
        if (token !== this.run) return 'stopped';
        this.pointerLayer.textContent = '';
        this.setCaption(i);
        if (this.inspecting && !this.panel.hidden) this.inspect(i, 0);
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
        // The box stays up through the use case and goes END_CARD_MS after its last step completes.
        if (i === this.steps.length - 1) this.endTimer = setTimeout(() => this.showBox(false), END_CARD_MS);
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
        this.showBox(true);
        if (this.k >= this.steps.length - 1) this.k = -1;
        while (this.playing) {
          const r = await this.showStep(this.k + 1, true);
          if (r === 'stopped' || !this.playing) break;
          const token = this.run;
          const last = this.k >= this.steps.length - 1;
          await sleep(last ? END_CARD_MS : this.dwell(this.steps[this.k]));
          if (token !== this.run || !this.playing) break;
          if (this.k >= this.steps.length - 1) {
            // End of the use case: Play runs only the one the reader picked. After its last step (and
            // the outcome's dwell) the diagram goes back to how the reader left it; `loop: true` plays
            // the same use case again instead.
            if (this.data.loop === true) {
              this.k = -1;
              continue;
            }
            this.stop();
            this.k = -1;
            this.setBanner(null);
            await this.restoreBefore();
            this.lit = empty();
            this.applyLit();
            this.setCaption(-1);
            break;
          }
        }
      };
      // Scenario picker.
      // keepPlaying: select without stopping the player.
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
        updateCounts();
        this.k = -1;
        this.lit = empty();
        this.applyLit();
        this.setCaption(-1);
      };
      if (picker) {
        if (list.length) {
          list.forEach((x, i) => {
            const b = html('button', 'dgm-scn', picker);
            b.type = 'button';
            b.innerHTML = `<span class="dgm-scn-title">${esc(x.title || 'Guided tour')}</span><span class="dgm-scn-meta">${x.steps.filter((y) => !y.when || y.when === (x.modes || [{}])[0].id).length} steps</span>`;
            b.title = x.summary || x.title;
            b.setAttribute('role', 'tab');
            // A click plays the use case from its first step, in the player box.
            b.addEventListener('click', () => {
              this.selectScenario(i);
              this.showBox(true);
              this.play();
            });
          });
          picker.hidden = false;
          this.root.classList.add('has-scenarios');
        } else picker.hidden = true;
      }
      ctl.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-act]');
        if (!b || b.dataset.act === 'mode' || b.dataset.act === 'details') return;
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
        if (a === 'lock') this.setLocked(!this.locked);
        if (a === 'inspect') {
          // Pause where the use case is and open the inspector on the current step's first hop.
          const i = this.stepRunning ?? this.k;
          this.stop();
          if (i != null && i >= 0) this.inspect(i, 0, true);
        }
      });
      // Turning lock on puts back the layout the reader had before the use case opened groups; turning
      // it off lets the use case open what it needs. Either way the current step runs again.
      this.setLocked = async (on) => {
        const wasPlaying = this.playing;
        this.stop();
        this.locked = on;
        setLockIcon();
        if (on) await this.restoreLayout();
        this.regroup();
        if (wasPlaying) {
          // Play again from the current step.
          this.k = Math.max(-1, this.k - 1);
          this.play();
        } else if (this.k >= 0) await this.showStep(this.k, true);
      };
      // Details on or off: the card switches at once; auto-play reads the new setting at the next pause.
      detailBox?.addEventListener('change', () => {
        this.details = detailBox.checked;
        try {
          localStorage.setItem(detailKey, this.details ? '1' : '0');
        } catch (e) { /* storage blocked: the choice lasts for this page only */ }
        if (banner && banner.classList.contains('is-on') && !banner.classList.contains('is-intro') && this.stepRunning != null) this.setCard(this.stepRunning);
      });
      modeBox?.addEventListener('change', () => {
        this.stop();
        this.mode = modeBox.checked && this.modes[1] ? this.modes[1].id : this.modes[0].id;
        buildSteps();
        updateCounts();
        this.relayout({}).then(() => this.showStep(-1));
      });
      this.selectScenario(0);
      capEl.hidden = true;
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
