/*
 * Interactive 3D scenes (_includes/scene3d.html, data in _data/scenes3d/<post folders>/<name>.yml).
 *
 * A scene is a list of parts. Each part is one clickable thing (a monitor, a GPU, a cable) built from
 * simple shapes (box, rounded box, cylinder, torus, sphere, screen). The reader orbits with a drag,
 * pans with right-drag or Shift-drag, zooms with Ctrl + scroll or a pinch, hovers a part to name it and
 * clicks it to open its specs in a side panel. Optional extras: an Explode slider (parts with
 * `explode:` move apart), cables with travelling packets, pinned labels, auto-rotate and RGB fans.
 * Three.js is loaded on demand from jsDelivr the first time a scene scrolls into view.
 *
 * Data format: the comment at the top of _includes/scene3d.html.
 */
(() => {
  if (window.__cudScene3d) return;
  window.__cudScene3d = true;

  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DEG = Math.PI / 180;
  let threePromise = null;
  const loadThree = () => (threePromise ||= import(THREE_URL));

  const PALETTE = {
    blue: '#3B82F6', sky: '#0EA5E9', teal: '#14B8A6', green: '#22C55E', lime: '#84CC16', amber: '#F59E0B',
    orange: '#F97316', red: '#EF4444', rose: '#F43F5E', pink: '#EC4899', violet: '#8B5CF6', indigo: '#6366F1',
    slate: '#64748B', black: '#111317', graphite: '#2A2D33', silver: '#B8BCC4', gold: '#C9B48A', white: '#F1F3F5',
    wood: '#6B4A33', nvidia: '#76B900'
  };
  const col = (c, fb = '#888888') => PALETTE[c] || c || fb;

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Inline Markdown for panel text: `code`, **bold**, [text](url).
  const md = (s) => esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => /^(https?:\/\/|\/)/.test(u) ? `<a href="${u}">${t}</a>` : t);

  function boot() {
    const figs = document.querySelectorAll('figure.s3d:not([data-s3d-init])');
    figs.forEach((fig) => {
      fig.setAttribute('data-s3d-init', '');
      const start = () => new Scene3D(fig).start().catch((err) => {
        console.error('scene3d:', err);
        fig.classList.add('is-failed');
        const msg = fig.querySelector('.s3d-loading');
        if (msg) msg.textContent = '3D view unavailable in this browser (WebGL or network). The parts list below has every detail.';
      });
      if (!('IntersectionObserver' in window)) return start();
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { io.disconnect(); start(); }
      }, { rootMargin: '300px' });
      io.observe(fig);
    });
  }

  class Scene3D {
    constructor(fig) {
      this.fig = fig;
      this.data = JSON.parse(fig.querySelector('.s3d-data').textContent);
      this.stage = fig.querySelector('.s3d-stage');
      this.toolbar = fig.querySelector('.s3d-toolbar');
      this.panel = fig.querySelector('.s3d-panel');
      this.panelBody = fig.querySelector('.s3d-panel-body');
      this.tip = fig.querySelector('.s3d-tip');
      this.pins = fig.querySelector('.s3d-pins');
      this.chips = fig.querySelector('.s3d-chips');
      this.parts = [];
      this.byId = {};
      this.explodeT = 0;
      this.explodeTarget = 0;
      this.showCables = this.data.cables_on !== false;
      this.showPins = this.data.pins_on !== false;
      this.autoRotate = !reduceMotion && this.data.autorotate !== false;
      this.visible = true;
      this.dirty = true;
      this.clock = 0;
    }

    async start() {
      const T = (this.T = await loadThree());
      const d = this.data;
      const canvas = document.createElement('canvas');
      canvas.className = 's3d-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      this.stage.prepend(canvas);
      const r = (this.renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true }));
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      r.shadowMap.enabled = true;
      r.shadowMap.type = T.PCFSoftShadowMap;
      r.outputColorSpace = T.SRGBColorSpace;
      r.toneMapping = T.ACESFilmicToneMapping;
      r.toneMappingExposure = d.exposure || 1.05;

      const scene = (this.scene = new T.Scene());
      const cam = (this.camera = new T.PerspectiveCamera(d.camera?.fov || 38, 1, 0.5, 20000));
      scene.add(new T.HemisphereLight(0xffffff, 0x3a3f4a, 1.25));
      const sun = new T.DirectionalLight(0xffffff, 2.1);
      const L = d.light || [120, 260, 180];
      sun.position.set(L[0], L[1], L[2]);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      const S = d.shadow_extent || 200;
      Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 2000 });
      sun.shadow.bias = -0.0005;
      scene.add(sun);
      const fill = new T.DirectionalLight(0xcfe0ff, 0.6);
      fill.position.set(-L[0], L[1] * 0.5, -L[2]);
      scene.add(fill);

      if (d.floor !== false) {
        const size = d.floor_size || 600;
        const floor = new T.Mesh(new T.CircleGeometry(size / 2, 64), new T.ShadowMaterial({ opacity: 0.22 }));
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = d.floor_y || 0;
        floor.receiveShadow = true;
        scene.add(floor);
        if (d.floor_color) {
          const f2 = new T.Mesh(new T.CircleGeometry(size / 2, 64),
            new T.MeshStandardMaterial({ color: col(d.floor_color), roughness: 0.95, transparent: true, opacity: 0.55 }));
          f2.rotation.x = -Math.PI / 2;
          f2.position.y = (d.floor_y || 0) - 0.05;
          scene.add(f2);
        }
      }

      (d.parts || []).forEach((p) => this.addPart(p));
      this.cableGroup = new T.Group();
      scene.add(this.cableGroup);
      this.packets = [];
      (d.cables || []).forEach((c) => this.addCable(c));
      this.cableGroup.visible = this.showCables;

      // Camera: spherical coordinates around a target.
      const c = d.camera || {};
      this.home = { pos: new T.Vector3(...(c.pos || [220, 180, 260])), target: new T.Vector3(...(c.target || [0, 40, 0])) };
      this.target = this.home.target.clone();
      this.sph = new T.Spherical().setFromVector3(this.home.pos.clone().sub(this.target));
      this.minR = c.min || this.sph.radius * 0.25;
      this.maxR = c.max || this.sph.radius * 2.5;
      this.maxPolar = (c.max_polar || 88) * DEG;
      this.homeR = this.sph.radius;

      this.raycaster = new T.Raycaster();
      this.buildToolbar();
      this.buildChips();
      this.buildPins();
      this.bindInput();
      this.resize();
      new ResizeObserver(() => this.resize()).observe(this.stage);
      new IntersectionObserver((es) => { this.visible = es[0].isIntersecting; if (this.visible) this.loop(); }).observe(this.stage);
      this.panel.querySelector('.s3d-panel-close').addEventListener('click', () => this.select(null));
      document.addEventListener('fullscreenchange', () => {
        this.fig.classList.toggle('is-full', document.fullscreenElement === this.fig);
        this.resize();
      });
      this.fig.classList.add('is-ready');
      this.loop();
    }

    // ---- building -------------------------------------------------------------------------------
    material(s, p) {
      const T = this.T;
      const m = new T.MeshStandardMaterial({
        color: col(s.color || p.color),
        metalness: s.metal ?? p.metal ?? 0.15,
        roughness: s.rough ?? p.rough ?? 0.55,
        emissive: new T.Color(col(s.emissive || '#000000')),
        emissiveIntensity: s.glow ?? (s.emissive ? 1 : 0)
      });
      if (s.opacity != null || p.opacity != null) { m.transparent = true; m.opacity = s.opacity ?? p.opacity; }
      m.userData.baseEmissive = m.emissive.clone();
      m.userData.baseIntensity = m.emissiveIntensity;
      return m;
    }

    roundedBox(w, h, d, r, axis) {
      const T = this.T;
      // Rounded rectangle in the face that `axis` looks at, extruded along `axis`.
      const [a, b, depth] = axis === 'z' ? [w, h, d] : axis === 'x' ? [d, h, w] : [w, d, h];
      r = Math.max(0.01, Math.min(r, a / 2 - 0.01, b / 2 - 0.01));
      const s = new T.Shape();
      const x = -a / 2, y = -b / 2;
      s.moveTo(x + r, y);
      s.lineTo(x + a - r, y); s.quadraticCurveTo(x + a, y, x + a, y + r);
      s.lineTo(x + a, y + b - r); s.quadraticCurveTo(x + a, y + b, x + a - r, y + b);
      s.lineTo(x + r, y + b); s.quadraticCurveTo(x, y + b, x, y + b - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      const g = new T.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 6 });
      g.translate(0, 0, -depth / 2);
      if (axis === 'y' || !axis) g.rotateX(-Math.PI / 2);
      if (axis === 'x') g.rotateY(Math.PI / 2);
      return g;
    }

    screenTexture(sc) {
      const T = this.T;
      const cv = document.createElement('canvas');
      const W = 1024, H = Math.round(1024 / (sc.aspect || 2.4));
      cv.width = W; cv.height = H;
      const g = cv.getContext('2d');
      const bg = col(sc.bg, '#0B0F14'), fg = col(sc.fg, '#C9F5D0'), ac = col(sc.accent, '#76B900');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      const style = sc.style || 'terminal';
      if (style === 'wallpaper') {
        // Concentric arcs, a nod to the green DGX OS wallpaper.
        for (let i = 0; i < 26; i++) {
          g.strokeStyle = i % 2 ? ac : '#1f3d0a';
          g.lineWidth = 14;
          g.beginPath();
          g.arc(W * 0.78, H * 0.62, 30 + i * 22, Math.PI * 0.9, Math.PI * 1.9);
          g.stroke();
        }
      } else if (style === 'dashboard') {
        g.fillStyle = fg; g.font = 'bold 34px sans-serif'; g.fillText(sc.title || 'Dashboard', 24, 50);
        const cols = 4, pw = (W - 24 * (cols + 1)) / cols;
        for (let i = 0; i < 8; i++) {
          const x = 24 + (i % cols) * (pw + 24), y = 80 + Math.floor(i / cols) * ((H - 110) / 2);
          const ph = (H - 130) / 2;
          g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x, y, pw, ph);
          g.strokeStyle = [ac, '#38BDF8', '#F59E0B', '#EC4899'][i % 4]; g.lineWidth = 4; g.beginPath();
          for (let k = 0; k <= 20; k++) {
            const yy = y + ph * (0.75 - 0.45 * Math.abs(Math.sin((k + i * 3) * 0.55)) * ((k % 5) / 5 + 0.4));
            k ? g.lineTo(x + (pw * k) / 20, yy) : g.moveTo(x, yy);
          }
          g.stroke();
        }
      } else if (style !== 'off') {
        if (sc.title) {
          g.fillStyle = ac; g.fillRect(0, 0, W, 44);
          g.fillStyle = '#0B0F14'; g.font = 'bold 26px monospace'; g.fillText(sc.title, 16, 31);
        }
        g.font = '24px monospace';
        (sc.lines || []).forEach((l, i) => {
          g.fillStyle = l.startsWith('$') ? ac : fg;
          g.fillText(l, 18, (sc.title ? 84 : 40) + i * 34);
        });
      }
      const t = new T.CanvasTexture(cv);
      t.colorSpace = T.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    }

    makeShape(s, p) {
      const T = this.T;
      let geo;
      const sz = s.size || [10, 10, 10];
      switch (s.type || 'box') {
        case 'rbox': geo = this.roundedBox(sz[0], sz[1], sz[2], s.radius ?? 2, s.axis || 'y'); break;
        case 'cyl': geo = new T.CylinderGeometry(s.r ?? 5, s.r2 ?? s.r ?? 5, s.h ?? 10, s.seg || 32); break;
        case 'torus': geo = new T.TorusGeometry(s.r ?? 5, s.tube ?? 0.6, 12, 48); break;
        case 'sphere': geo = new T.SphereGeometry(s.r ?? 5, 24, 16); break;
        case 'screen': geo = new T.PlaneGeometry(sz[0], sz[1]); break;
        default: geo = new T.BoxGeometry(sz[0], sz[1], sz[2]);
      }
      let mat;
      if (s.type === 'screen') {
        const sc = s.screen || {};
        mat = new T.MeshBasicMaterial({ map: this.screenTexture({ aspect: sz[0] / sz[1], ...sc }), toneMapped: false });
        mat.userData.screen = true;
      } else {
        mat = this.material(s, p);
      }
      const m = new T.Mesh(geo, mat);
      if (s.pos) m.position.set(...s.pos);
      if (s.rot) m.rotation.set(s.rot[0] * DEG, s.rot[1] * DEG, s.rot[2] * DEG);
      m.castShadow = s.type !== 'screen' && s.shadow !== false;
      m.receiveShadow = true;
      if (s.rgb) m.userData.rgb = s.rgb === true ? 0 : s.rgb;
      return m;
    }

    addPart(p) {
      const T = this.T;
      const g = new T.Group();
      g.name = p.id;
      (p.shapes || [{ type: p.type, size: p.size, radius: p.radius, axis: p.axis }]).forEach((s) => {
        const m = this.makeShape(s, p);
        m.userData.part = p.info === false ? null : p;
        g.add(m);
      });
      if (p.rot) g.rotation.set(p.rot[0] * DEG, p.rot[1] * DEG, p.rot[2] * DEG);
      const base = new T.Vector3(...(p.pos || [0, 0, 0]));
      g.position.copy(base);
      this.scene.add(g);
      const rec = { p, g, base, ex: new T.Vector3(...(p.explode || [0, 0, 0])) };
      if (p.info !== false) { this.parts.push(rec); this.byId[p.id] = rec; }
      if (p.explode) this.hasExplode = true;
    }

    addCable(c) {
      const T = this.T;
      const pts = c.points.map((q) => new T.Vector3(...q));
      const curve = new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.2);
      const color = col(c.color, '#38BDF8');
      const tube = new T.Mesh(new T.TubeGeometry(curve, Math.max(24, pts.length * 16), c.r || 0.45, 8, false),
        new T.MeshStandardMaterial({ color, roughness: 0.4, emissive: new T.Color(color), emissiveIntensity: 0.35 }));
      tube.userData.part = c.info === false ? null : { id: c.id, label: c.label, group: 'Cables', facts: c.facts, color: c.color };
      tube.material.userData.baseEmissive = tube.material.emissive.clone();
      tube.material.userData.baseIntensity = 0.35;
      this.cableGroup.add(tube);
      if (tube.userData.part) { const rec = { p: tube.userData.part, g: tube, cable: true }; this.parts.push(rec); this.byId[c.id] = rec; }
      if (!reduceMotion && c.packets !== 0) {
        const n = c.packets || 2;
        for (let i = 0; i < n; i++) {
          const dot = new T.Mesh(new T.SphereGeometry((c.r || 0.45) * 2.2, 12, 8),
            new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
          dot.userData.dot = { curve, off: i / n, speed: c.speed || 0.18, back: !!c.both && i % 2 };
          this.cableGroup.add(dot);
          this.packets.push(dot);
        }
      }
    }

    // ---- UI -------------------------------------------------------------------------------------
    button(icon, label, act, pressed) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 's3d-btn';
      b.dataset.act = act;
      b.innerHTML = `<i class="fas fa-${icon}" aria-hidden="true"></i><span>${esc(label)}</span>`;
      if (pressed != null) b.setAttribute('aria-pressed', String(pressed));
      this.toolbar.appendChild(b);
      return b;
    }

    buildToolbar() {
      this.button('rotate-left', 'Reset view', 'reset');
      this.rotBtn = this.button('arrows-spin', 'Auto-rotate', 'rotate', this.autoRotate);
      if (this.hasExplode) {
        const w = document.createElement('label');
        w.className = 's3d-explode';
        w.innerHTML = `<i class="fas fa-up-right-and-down-left-from-center" aria-hidden="true"></i><span>${esc(this.data.explode_label || 'Explode')}</span><input type="range" min="0" max="100" value="0" aria-label="Explode the parts apart">`;
        this.slider = w.querySelector('input');
        this.slider.addEventListener('input', () => { this.explodeTarget = this.slider.value / 100; this.kick(); });
        this.toolbar.appendChild(w);
      }
      if ((this.data.cables || []).length) this.cableBtn = this.button('plug', 'Cables', 'cables', this.showCables);
      if (this.parts.some((r) => r.p.pin)) this.pinBtn = this.button('tag', 'Labels', 'pins', this.showPins);
      this.button('expand', 'Fullscreen', 'full');
      this.toolbar.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-act]');
        if (!b) return;
        const act = b.dataset.act;
        if (act === 'reset') this.reset();
        if (act === 'rotate') { this.autoRotate = !this.autoRotate; b.setAttribute('aria-pressed', String(this.autoRotate)); }
        if (act === 'cables') { this.showCables = !this.showCables; this.cableGroup.visible = this.showCables; b.setAttribute('aria-pressed', String(this.showCables)); }
        if (act === 'pins') { this.showPins = !this.showPins; this.pins.hidden = !this.showPins; b.setAttribute('aria-pressed', String(this.showPins)); }
        if (act === 'full') this.toggleFull();
        this.kick();
      });
    }

    buildChips() {
      const groups = {};
      this.parts.forEach((r) => { (groups[r.p.group || 'Parts'] ||= []).push(r); });
      Object.entries(groups).forEach(([name, recs]) => {
        const row = document.createElement('div');
        row.className = 's3d-chip-row';
        row.innerHTML = `<span class="s3d-chip-head">${esc(name)}</span>`;
        recs.forEach((r) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 's3d-chip';
          b.dataset.part = r.p.id;
          b.style.setProperty('--s3d-dot', col(r.p.dot || r.p.color, '#64748B'));
          b.textContent = r.p.label;
          b.addEventListener('click', () => this.select(r.p.id, true));
          row.appendChild(b);
        });
        this.chips.appendChild(row);
      });
    }

    buildPins() {
      this.pinEls = [];
      this.parts.filter((r) => r.p.pin && !r.cable).forEach((r) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 's3d-pin';
        el.textContent = typeof r.p.pin === 'string' ? r.p.pin : r.p.label;
        el.addEventListener('click', () => this.select(r.p.id, true));
        this.pins.appendChild(el);
        this.pinEls.push({ el, r, off: new this.T.Vector3(...(r.p.pin_at || [0, 0, 0])) });
      });
      this.pins.hidden = !this.showPins;
    }

    select(id, focus) {
      const prev = this.selected;
      this.selected = id ? this.byId[id] : null;
      this.fig.querySelectorAll('.s3d-chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.part === id)));
      [prev, this.selected].forEach((r) => r && this.paint(r));
      if (!this.selected) { this.panel.hidden = true; this.kick(); return; }
      const p = this.selected.p, f = p.facts || {};
      const specs = (f.specs || []).map(([k, v]) => `<tr><th>${md(k)}</th><td>${md(v)}</td></tr>`).join('');
      this.panelBody.innerHTML =
        `<p class="s3d-panel-group">${esc(p.group || '')}</p><h4>${esc(p.label)}</h4>` +
        (f.model ? `<p class="s3d-panel-model">${md(f.model)}</p>` : '') +
        (f.summary ? `<p class="s3d-panel-lead">${md(f.summary)}</p>` : '') +
        (specs ? `<table class="s3d-specs"><tbody>${specs}</tbody></table>` : '') +
        (f.note ? `<p class="s3d-panel-note">${md(f.note)}</p>` : '') +
        (f.source ? `<p class="s3d-panel-src">Source: ${md(f.source)}</p>` : '');
      this.panel.hidden = false;
      this.panel.scrollTop = 0;
      if (focus && !this.selected.cable && !reduceMotion) {
        const box = new this.T.Box3().setFromObject(this.selected.g);
        this.tween = { from: this.target.clone(), to: box.getCenter(new this.T.Vector3()), t: 0 };
      }
      this.autoRotate = false;
      this.rotBtn?.setAttribute('aria-pressed', 'false');
      this.kick();
    }

    // Highlight: hovered or selected parts glow in the accent colour.
    paint(r) {
      if (!r) return;
      const on = r === this.selected || r === this.hovered;
      const accent = new this.T.Color(col(this.data.accent, '#38BDF8'));
      r.g.traverse((o) => {
        const m = o.material;
        if (!m || m.userData.screen || !m.userData.baseEmissive) return;
        if (on) { m.emissive.copy(accent); m.emissiveIntensity = (r === this.selected ? 0.4 : 0.25) * (m.transparent ? 0.4 : 1); }
        else { m.emissive.copy(m.userData.baseEmissive); m.emissiveIntensity = m.userData.baseIntensity; }
      });
    }

    reset() {
      this.target.copy(this.home.target);
      this.sph.setFromVector3(this.home.pos.clone().sub(this.home.target));
      this.sph.radius = this.homeR * this.fit();
      this.explodeTarget = 0;
      if (this.slider) this.slider.value = 0;
      this.select(null);
    }

    toggleFull() {
      if (document.fullscreenElement) return document.exitFullscreen();
      if (this.fig.requestFullscreen) this.fig.requestFullscreen().catch(() => this.fig.classList.toggle('is-full'));
      else this.fig.classList.toggle('is-full');
      this.resize();
    }

    // ---- input ----------------------------------------------------------------------------------
    bindInput() {
      const el = this.renderer.domElement;
      const ptrs = new Map();
      let mode = null, moved = 0, last = null, pinch = 0;
      const stop = () => { this.touched = true; if (this.autoRotate) { this.autoRotate = false; this.rotBtn?.setAttribute('aria-pressed', 'false'); } };
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      el.addEventListener('pointerdown', (e) => {
        el.setPointerCapture(e.pointerId);
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        mode = ptrs.size === 2 ? 'pinch' : (e.button === 2 || e.shiftKey ? 'pan' : 'rotate');
        moved = 0; last = { x: e.clientX, y: e.clientY };
        if (mode === 'pinch') { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
      });
      el.addEventListener('pointermove', (e) => {
        if (!ptrs.has(e.pointerId)) { this.hover(e); return; }
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (mode === 'pinch' && ptrs.size === 2) {
          const [a, b] = [...ptrs.values()];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinch) this.zoom(pinch / dist);
          pinch = dist; moved += 10; stop(); return;
        }
        const dx = e.clientX - last.x, dy = e.clientY - last.y;
        last = { x: e.clientX, y: e.clientY };
        moved += Math.abs(dx) + Math.abs(dy);
        if (moved < 4) return;
        stop();
        if (mode === 'rotate') {
          this.sph.theta -= dx * 0.006;
          this.sph.phi = Math.min(this.maxPolar, Math.max(0.08, this.sph.phi - dy * 0.006));
        } else if (mode === 'pan') this.pan(dx, dy);
        this.kick();
      });
      const up = (e) => {
        ptrs.delete(e.pointerId);
        if (mode && mode !== 'pinch' && moved < 4 && e.type === 'pointerup') this.click(e);
        if (!ptrs.size) mode = null;
      };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', () => { this.setHover(null); this.tip.hidden = true; });
      el.addEventListener('wheel', (e) => {
        const full = this.fig.classList.contains('is-full');
        if (!e.ctrlKey && !e.metaKey && !full) { this.flashHint(); return; }
        e.preventDefault();
        stop();
        this.zoom(Math.exp(e.deltaY * 0.0015));
      }, { passive: false });
      this.stage.addEventListener('keydown', (e) => {
        const k = e.key;
        if (k === 'ArrowLeft') this.sph.theta += 0.12;
        else if (k === 'ArrowRight') this.sph.theta -= 0.12;
        else if (k === 'ArrowUp') this.sph.phi = Math.max(0.08, this.sph.phi - 0.08);
        else if (k === 'ArrowDown') this.sph.phi = Math.min(this.maxPolar, this.sph.phi + 0.08);
        else if (k === '+' || k === '=') this.zoom(0.85);
        else if (k === '-') this.zoom(1.18);
        else if (k === '0') this.reset();
        else if (k === 'Escape') this.select(null);
        else return;
        e.preventDefault(); stop(); this.kick();
      });
    }

    zoom(f) {
      this.sph.radius = Math.min(this.maxR, Math.max(this.minR, this.sph.radius * f));
      this.kick();
    }

    pan(dx, dy) {
      const T = this.T, cam = this.camera;
      const k = (this.sph.radius * Math.tan((cam.fov * DEG) / 2) * 2) / this.stage.clientHeight;
      const right = new T.Vector3().setFromMatrixColumn(cam.matrix, 0).multiplyScalar(-dx * k);
      const upv = new T.Vector3().setFromMatrixColumn(cam.matrix, 1).multiplyScalar(dy * k);
      this.target.add(right).add(upv);
    }

    flashHint() {
      const h = this.fig.querySelector('.s3d-hint');
      h.classList.add('is-on');
      clearTimeout(this.hintT);
      this.hintT = setTimeout(() => h.classList.remove('is-on'), 1200);
    }

    pick(e) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const v = new this.T.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      this.raycaster.setFromCamera(v, this.camera);
      const objs = [];
      this.scene.traverse((o) => { if (o.isMesh && o.userData.part && o.visible && (o.parent.visible ?? true)) objs.push(o); });
      const hit = this.raycaster.intersectObjects(objs, false).find((h) => h.object.parent.visible && h.object.userData.part);
      return hit ? this.byId[hit.object.userData.part.id] : null;
    }

    hover(e) {
      if (this.hoverRaf) return;
      this.hoverRaf = requestAnimationFrame(() => {
        this.hoverRaf = 0;
        const r = this.pick(e);
        this.setHover(r);
        if (r) {
          const rect = this.stage.getBoundingClientRect();
          this.tip.textContent = r.p.label + (r.p.facts?.model ? ` · ${r.p.facts.model.replace(/`/g, '')}` : '');
          this.tip.style.left = `${e.clientX - rect.left + 14}px`;
          this.tip.style.top = `${e.clientY - rect.top + 14}px`;
          this.tip.hidden = false;
        } else this.tip.hidden = true;
      });
    }

    setHover(r) {
      if (r === this.hovered) return;
      const prev = this.hovered;
      this.hovered = r;
      this.renderer.domElement.style.cursor = r ? 'pointer' : 'grab';
      this.paint(prev); this.paint(r); this.kick();
    }

    click(e) {
      const r = this.pick(e);
      this.select(r ? r.p.id : null, false);
    }

    // ---- render loop ----------------------------------------------------------------------------
    resize() {
      const w = this.stage.clientWidth, h = this.stage.clientHeight;
      if (!w || !h) return;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      // A tall canvas (phones) shows less width, so step back until the scene fits again.
      if (!this.touched) this.sph.radius = Math.min(this.maxR, this.homeR * this.fit());
      this.kick();
    }

    fit() { return this.camera.aspect < 1.25 ? Math.min(1.9, 1.25 / this.camera.aspect) : 1; }

    kick() { this.dirty = true; this.loop(); }

    loop() {
      if (this.raf || !this.visible) return;
      this.raf = requestAnimationFrame((now) => {
        this.raf = 0;
        const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
        this.last = now;
        this.clock += dt;
        let busy = false;
        if (this.autoRotate) { this.sph.theta += dt * 0.18; busy = true; }
        if (Math.abs(this.explodeT - this.explodeTarget) > 0.001) {
          this.explodeT += (this.explodeTarget - this.explodeT) * Math.min(1, dt * 8);
          busy = true;
        } else this.explodeT = this.explodeTarget;
        this.parts.forEach((r) => { if (!r.cable) r.g.position.copy(r.base).addScaledVector(r.ex, this.explodeT); });
        if (this.tween) {
          this.tween.t = Math.min(1, this.tween.t + dt * 2.5);
          const k = 1 - Math.pow(1 - this.tween.t, 3);
          this.target.lerpVectors(this.tween.from, this.tween.to, k);
          if (this.tween.t >= 1) this.tween = null;
          busy = true;
        }
        if (this.showCables && this.packets.length) {
          this.packets.forEach((d) => {
            const u = d.userData.dot;
            let t = (this.clock * u.speed + u.off) % 1;
            if (u.back) t = 1 - t;
            d.position.copy(u.curve.getPointAt(t));
          });
          busy = true;
        }
        if (!reduceMotion) {
          this.scene.traverse((o) => {
            if (o.userData.rgb == null) return;
            o.material.emissive.setHSL((this.clock * 0.08 + o.userData.rgb) % 1, 0.9, 0.55);
            o.material.color.copy(o.material.emissive);
            busy = true;
          });
        }
        this.camera.position.copy(this.target).add(new this.T.Vector3().setFromSpherical(this.sph));
        this.camera.lookAt(this.target);
        this.camera.updateMatrixWorld();
        this.renderer.render(this.scene, this.camera);
        this.placePins();
        this.dirty = false;
        if (busy) this.loop();
      });
    }

    placePins() {
      if (!this.showPins || !this.pinEls) return;
      const w = this.stage.clientWidth, h = this.stage.clientHeight;
      const v = new this.T.Vector3();
      const camDir = new this.T.Vector3();
      this.camera.getWorldDirection(camDir);
      this.pinEls.forEach(({ el, r, off }) => {
        v.copy(r.g.position).add(off);
        const toPin = v.clone().sub(this.camera.position);
        v.project(this.camera);
        const behind = toPin.dot(camDir) < 0 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05;
        el.hidden = behind;
        if (!behind) el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
        el.classList.toggle('is-on', this.selected === r);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
