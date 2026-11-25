/*
 * Expedition Map: draws _includes/expedition-map.html's Atlas as a 3D globe (Three.js).
 * Countries (topics) and states (subtopics) are labels pinned to places on a real Earth; a
 * topic's area (used for hovering and for how close the camera flies) grows with its post count.
 * Drag to spin, scroll to zoom, hover for a card, click a topic to fly to it and a subtopic to
 * list its posts in the travel guide. Labels are buttons, so the map works from the keyboard.
 * Deep links: #devops, #devops/cicd. Small screens, no WebGL or no network: the Atlas list.
 */
(function () {
  'use strict';

  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';
  var WORLD_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
  var ANTARCTICA = '010';
  var TEX_W = 2048;
  var TEX_H = 1024;
  var DEG = Math.PI / 180;
  var FOV = 35;
  var WIDE = window.matchMedia('(min-width: 850px)');
  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var root = document.getElementById('expedition-map');
  if (!root) return;

  var viewer = root.querySelector('.xm-viewer');
  var fsBtn = root.querySelector('.xm-fs-btn');
  var stage = root.querySelector('.xm-stage');
  var mapBox = root.querySelector('.xm-map');
  var canvas = root.querySelector('.xm-map canvas');
  var labelLayer = root.querySelector('.xm-labels');
  var pop = root.querySelector('.xm-pop');
  var guide = root.querySelector('.xm-guide');
  var backBtn = root.querySelector('.xm-back');
  var search = root.querySelector('.xm-search input');
  var loading = root.querySelector('.xm-loading');

  var countries = readAtlas();
  var allPosts = [];
  var allStates = [];
  countries.forEach(function (c) {
    c.states.forEach(function (s) {
      allStates.push(s);
      s.posts.forEach(function (p) { allPosts.push(p); });
    });
  });

  var rendered = false;
  var current = { country: null, state: null, district: null };
  var searchHits = null; /* Set of states with a search match, or null */
  var hover = null; /* {country} or {state} */

  /* The country the globe is zoomed into; none while a search shows its hits worldwide. */
  function focus() {
    return searchHits ? null : current.country;
  }

  /* ---------- data ---------- */

  function readAtlas() {
    return Array.prototype.map.call(root.querySelectorAll('.xm-country'), function (el) {
      var country = {
        id: el.dataset.id, name: el.dataset.name, icon: el.dataset.icon,
        color: el.dataset.color, el: el, states: []
      };
      country.states = Array.prototype.map.call(el.querySelectorAll('.xm-state'), function (sEl) {
        var state = {
          id: sEl.dataset.id, name: sEl.dataset.name, url: sEl.dataset.url,
          country: country, el: sEl, posts: []
        };
        state.posts = Array.prototype.map.call(sEl.querySelectorAll('li'), function (li) {
          var a = li.querySelector('a');
          return {
            title: a.textContent, url: a.getAttribute('href'),
            date: li.querySelector('time').textContent, district: li.dataset.district,
            state: state, li: li
          };
        });
        return state;
      });
      country.count = country.states.reduce(function (n, s) { return n + s.posts.length; }, 0);
      return country;
    });
  }

  function findCountry(id) {
    return countries.filter(function (c) { return c.id === id; })[0] || null;
  }

  function findState(country, id) {
    return country && country.states.filter(function (s) { return s.id === id; })[0] || null;
  }

  function latest(posts, n) {
    return posts.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, n);
  }

  /* ---------- geography: where each topic sits on the globe ---------- */

  /* Topics on a golden-angle spiral between about 50°N and 40°S, so none sits on a pole
     and the big ones are far apart. Territory radius grows with the square root of posts. */
  function placeTopics() {
    var n = countries.length;
    var maxCount = Math.max.apply(null, countries.map(function (c) { return c.count; })) || 1;
    countries.forEach(function (c, i) {
      var t = (i + 0.5) / n;
      c.lat = Math.asin(0.76 - 1.4 * t) / DEG;
      c.lon = ((i * 137.508) % 360) - 180;
      c.radius = 6 + 13 * Math.sqrt(c.count / maxCount);
      /* Subtopics in an even grid centred on the topic, biggest first: one row of up to three,
         otherwise two columns. Columns sit far apart because labels are wider than tall. */
      var m = c.states.length;
      var cols = m <= 3 ? m : 2;
      var rows = Math.ceil(m / cols);
      var step = 1.9;
      var dLon = 4.2 * step;
      c.states.forEach(function (s, k) {
        var row = Math.floor(k / cols);
        var inRow = row === rows - 1 ? m - row * cols : cols;
        var col = k % cols;
        s.lat = c.lat + ((rows - 1) / 2 - row) * step;
        s.lon = c.lon + ((col - (inRow - 1) / 2) * dLon) / Math.cos(c.lat * DEG);
      });
      /* Half-size of the grid in degrees, plus room for the labels themselves. */
      c.halfH = ((rows - 1) / 2) * step + 1.2 * step;
      c.halfW = ((cols - 1) / 2) * dLon + 0.6 * dLon;
    });
  }

  /* Same convention as THREE.SphereGeometry's UVs, so markers line up with the texture. */
  function toVec(T, lat, lon, r) {
    var phi = (lon + 180) * DEG;
    var la = lat * DEG;
    return new T.Vector3(-Math.cos(phi) * Math.cos(la), Math.sin(la), Math.sin(phi) * Math.cos(la)).multiplyScalar(r || 1);
  }

  /* ---------- 3D scene ---------- */

  var T, renderer, scene, camera, globe, baseCtx, baseTex, land, borders;
  var worldDist = 3.6; /* set by resize() so the whole globe fits the frame */
  var halfFov = 0.3; /* the narrower of the vertical and horizontal half-angles */
  var halfV = 0.3, halfH = 0.3; /* vertical and horizontal half-angles of the camera */
  var TILT = 0.15; /* camera tilt when zoomed in, for a sense of depth */
  var view = { yaw: 0, pitch: 0.32, dist: worldDist, tilt: 0 };
  var goal = { yaw: 0, pitch: 0.32, dist: worldDist, tilt: 0 };
  var spin = { vx: 0, vy: 0 };
  var lastInteraction = 0;
  var pointerInside = false;
  var visible = true;
  var frameRequested = false;

  function render() {
    if (rendered || !WIDE.matches || !window.d3) return;
    rendered = true;
    stage.hidden = false;
    import(THREE_URL).then(function (mod) {
      T = mod;
      build();
      loading.remove();
      root.classList.add('xm-ready');
      applyHash();
    }).catch(function () {
      loading.textContent = 'The 3D globe needs WebGL and a network connection. The Atlas below lists every post.';
      rendered = false;
    });
  }

  function build() {
    placeTopics();
    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = T.SRGBColorSpace;
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(FOV, 1, 0.1, 100);

    scene.add(new T.AmbientLight(0xffffff, 1.6));
    var sun = new T.DirectionalLight(0xffffff, 1.6);
    sun.position.set(-3, 2, 4);
    scene.add(sun);

    globe = new T.Group();
    globe.rotation.order = 'XYZ';
    scene.add(globe);

    /* Earth: ocean, graticule and land drawn into an equirectangular canvas. */
    baseCtx = makeCanvas();
    baseTex = new T.CanvasTexture(baseCtx.canvas);
    baseTex.colorSpace = T.SRGBColorSpace;
    baseTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    drawBase();
    globe.add(new T.Mesh(new T.SphereGeometry(1, 128, 96),
      new T.MeshStandardMaterial({ map: baseTex, roughness: 0.85, metalness: 0.05 })));
    loadLand();

    scene.add(atmosphere());
    scene.add(stars());
    addLabels();

    /* Start with the biggest topic in view. */
    var first = countries[0];
    var aim = aimAt(first.lat, first.lon);
    view.yaw = goal.yaw = aim.yaw + 0.5;

    wireInput();
    new ResizeObserver(resize).observe(mapBox);
    resize();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) requestFrame(); }).observe(mapBox);
    }
    document.addEventListener('visibilitychange', requestFrame);
    requestFrame();
  }

  function makeCanvas() {
    var c = document.createElement('canvas');
    c.width = TEX_W;
    c.height = TEX_H;
    return c.getContext('2d');
  }

  function geoPath(ctx) {
    var projection = d3.geoEquirectangular().scale(TEX_W / (2 * Math.PI)).translate([TEX_W / 2, TEX_H / 2]);
    return d3.geoPath(projection, ctx);
  }

  function drawBase() {
    var ctx = baseCtx;
    var g = ctx.createLinearGradient(0, 0, 0, TEX_H);
    g.addColorStop(0, '#0a1a33');
    g.addColorStop(0.5, '#0d2445');
    g.addColorStop(1, '#0a1a33');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, TEX_W, TEX_H);
    var path = geoPath(ctx);
    ctx.beginPath();
    path(d3.geoGraticule10());
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.10)';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (land) {
      ctx.beginPath();
      path(land);
      ctx.fillStyle = '#1d3a52';
      ctx.fill();
      ctx.beginPath();
      path(borders);
      ctx.strokeStyle = 'rgba(148, 197, 230, 0.22)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    baseTex.needsUpdate = true;
  }

  /* The real world map; the globe still works (plain ocean) if it fails to load. */
  function loadLand() {
    if (!window.topojson) return;
    d3.json(WORLD_URL).then(function (topo) {
      var geo = topojson.feature(topo, topo.objects.countries);
      geo.features = geo.features.filter(function (f) { return f.id !== ANTARCTICA; });
      land = geo;
      borders = topojson.mesh(topo, topo.objects.countries, function (a, b) { return a !== b; });
      drawBase();
      requestFrame();
    }).catch(function () { /* offline or blocked */ });
  }

  function atmosphere() {
    var mat = new T.ShaderMaterial({
      vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 vN; void main(){ float i = pow(0.68 - dot(vN, vec3(0.0, 0.0, 1.0)), 3.0); gl_FragColor = vec4(0.18, 0.83, 0.75, 1.0) * i; }',
      side: T.BackSide, blending: T.AdditiveBlending, transparent: true, depthWrite: false
    });
    return new T.Mesh(new T.SphereGeometry(1.16, 64, 48), mat);
  }

  function stars() {
    var g = new T.BufferGeometry();
    var pts = [];
    var rand = mulberry32(7);
    for (var i = 0; i < 900; i++) {
      var u = rand() * 2 - 1, a = rand() * Math.PI * 2, r = 18 + rand() * 12;
      var s = Math.sqrt(1 - u * u);
      pts.push(r * s * Math.cos(a), r * u, r * s * Math.sin(a));
    }
    g.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
    return new T.Points(g, new T.PointsMaterial({ color: 0x9fb4d9, size: 0.06, transparent: true, opacity: 0.7 }));
  }

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- labels (buttons positioned over the canvas) ---------- */

  function addLabels() {
    countries.forEach(function (c) {
      var b = labelButton('xm-label xm-label-country', c.color, function () { selectCountry(c); });
      var i = document.createElement('i');
      i.className = c.icon;
      i.setAttribute('aria-hidden', 'true');
      b.appendChild(i);
      b.appendChild(el('span', 'xm-label-name', c.name));
      b.appendChild(el('span', 'xm-label-count', c.count));
      b.setAttribute('aria-label', c.name + ', ' + plural(c.count, 'post') + '. Fly to it on the globe');
      hoverable(b, { country: c });
      c.label = b;
      c.anchor = toVec(T, c.lat, c.lon, 1.01);
      c.states.forEach(function (s) {
        var sb = labelButton('xm-label xm-label-state', c.color, function () { selectState(s); });
        sb.appendChild(el('span', 'xm-label-name', s.name));
        sb.appendChild(el('span', 'xm-label-count', s.posts.length));
        sb.setAttribute('aria-label', c.name + ', ' + s.name + ', ' + plural(s.posts.length, 'post'));
        hoverable(sb, { state: s });
        s.label = sb;
        s.anchor = toVec(T, s.lat, s.lon, 1.01);
      });
    });
  }

  function labelButton(cls, color, onClick) {
    var b = button(cls, onClick);
    b.style.setProperty('--xm-color', color);
    labelLayer.appendChild(b);
    return b;
  }

  function hoverable(b, item) {
    var show = function () { setHover(item); showPop(item, b.getBoundingClientRect()); };
    b.addEventListener('mouseenter', show);
    b.addEventListener('focus', show);
    b.addEventListener('mouseleave', clearHover);
    b.addEventListener('blur', clearHover);
  }

  /* Project every candidate label, then place them biggest first and hide any that would
     overlap one already placed (the hovered and selected ones always win). */
  var tmp, tmpN, tmpC;
  function placeLabels() {
    tmp = tmp || new T.Vector3();
    tmpN = tmpN || new T.Vector3();
    tmpC = tmpC || new T.Vector3();
    var w = mapBox.clientWidth, h = mapBox.clientHeight;
    var candidates = [];
    function consider(item, btn, anchor, show, weight) {
      if (!show) { btn.hidden = true; return; }
      tmp.copy(anchor).applyMatrix4(globe.matrixWorld);
      /* Facing the camera? (dot of the surface normal with the direction to the camera) */
      var facing = tmpN.copy(tmp).normalize().dot(tmpC.copy(camera.position).sub(tmp).normalize());
      if (facing < 0.08) { btn.hidden = true; return; }
      tmp.project(camera);
      var x = (tmp.x + 1) / 2 * w, y = (1 - tmp.y) / 2 * h;
      if (x < 0 || x > w || y < 0 || y > h) { btn.hidden = true; return; }
      var on = hover && (hover.state === item || hover.country === item) || current.state === item;
      candidates.push({ btn: btn, x: x, y: y, facing: facing, weight: on ? 1e9 : weight });
    }
    countries.forEach(function (c) {
      consider(c, c.label, c.anchor, !focus(), c.count);
      c.states.forEach(function (s) {
        consider(s, s.label, s.anchor, focus() === c || (searchHits && searchHits.has(s)), s.posts.length);
      });
    });
    candidates.sort(function (a, b) { return b.weight - a.weight; });
    var placed = [];
    candidates.forEach(function (c) {
      var b = c.btn;
      if (b.hidden) b.hidden = false;
      if (!b._w) { b._w = b.offsetWidth; b._h = b.offsetHeight; }
      var r = { x0: c.x - b._w / 2 - 3, x1: c.x + b._w / 2 + 3, y0: c.y - b._h - 3, y1: c.y + 3 };
      var clash = placed.some(function (p) { return r.x0 < p.x1 && r.x1 > p.x0 && r.y0 < p.y1 && r.y1 > p.y0; });
      if (clash && c.weight < 1e9) { b.hidden = true; return; }
      placed.push(r);
      b.style.transform = 'translate(' + c.x.toFixed(1) + 'px,' + c.y.toFixed(1) + 'px) translate(-50%, -100%)';
      b.style.opacity = Math.min(1, (c.facing - 0.08) * 4).toFixed(2);
    });
  }

  /* ---------- hover card ---------- */

  function setHover(item) {
    var same = hover && item && hover.country === item.country && hover.state === item.state;
    if (same) return;
    hover = item;
    mapBox.style.cursor = item ? 'pointer' : '';
    styleLabels();
  }

  function clearHover() {
    setHover(null);
    pop.hidden = true;
  }

  function showPop(item, rect, x, y) {
    pop.textContent = '';
    var c = item.country || item.state.country;
    pop.style.setProperty('--xm-color', c.color);
    var head = el('div', 'xm-pop-head');
    var i = document.createElement('i');
    i.className = c.icon;
    i.setAttribute('aria-hidden', 'true');
    head.appendChild(i);
    head.appendChild(el('strong', null, item.state ? c.name + ' › ' + item.state.name : c.name));
    pop.appendChild(head);
    var posts = item.state ? item.state.posts : [].concat.apply([], c.states.map(function (s) { return s.posts; }));
    pop.appendChild(el('p', 'xm-pop-meta', item.state ? plural(posts.length, 'post') :
      plural(c.count, 'post') + ' · ' + plural(c.states.length, 'state')));
    var ul = el('ul');
    latest(posts, 3).forEach(function (p) { ul.appendChild(el('li', null, p.title)); });
    pop.appendChild(ul);
    pop.appendChild(el('p', 'xm-pop-hint', item.state ? 'Click to list its posts' : 'Click to fly there'));
    pop.hidden = false;

    var box = mapBox.getBoundingClientRect();
    var px = rect ? rect.left + rect.width / 2 - box.left : x;
    var py = rect ? rect.bottom - box.top + 8 : y + 18;
    var pw = pop.offsetWidth, ph = pop.offsetHeight;
    px = Math.max(8, Math.min(box.width - pw - 8, px - pw / 2));
    if (py + ph > box.height - 8) py = (rect ? rect.top - box.top : y) - ph - 10;
    pop.style.left = px + 'px';
    pop.style.top = Math.max(8, py) + 'px';
  }

  /* ---------- camera ---------- */

  function aimAt(lat, lon) {
    var v = toVec(T, lat, lon, 1);
    return { yaw: -Math.atan2(v.x, v.z), pitch: lat * DEG };
  }

  function wrap(a) {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  }

  function flyTo(country) {
    if (!country) {
      goal.dist = worldDist;
      goal.pitch = 0.32;
      goal.tilt = 0;
    } else {
      goal.tilt = TILT;
      var aim = aimAt(country.lat, country.lon);
      goal.yaw = view.yaw + wrap(aim.yaw - view.yaw);
      goal.pitch = aim.pitch;
      /* Close enough that the grid of subtopics fills the frame, in height and in width. */
      goal.dist = Math.max(1.6, /* never so close that only blurry ocean shows */
        1 + Math.sin(country.halfH * DEG) / 0.9 / Math.tan(halfV),
        1 + Math.sin(country.halfW * DEG) / 0.9 / Math.tan(halfH));
    }
    spin.vx = spin.vy = 0;
    requestFrame();
  }

  function resize() {
    var w = mapBox.clientWidth, h = mapBox.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    var v = FOV / 2 * DEG;
    halfV = v;
    halfH = Math.atan(Math.tan(v) * camera.aspect);
    halfFov = Math.min(halfV, halfH);
    /* The atmosphere reaches 1.16; leave a little space around it. */
    worldDist = 1.2 / Math.sin(halfFov);
    if (focus()) flyTo(focus()); else goal.dist = worldDist;
    if (!view.ready) { view.dist = goal.dist; view.ready = true; }
    requestFrame();
  }

  function requestFrame() {
    if (frameRequested || !renderer) return;
    frameRequested = true;
    requestAnimationFrame(frame);
  }

  function frame() {
    frameRequested = false;
    if (!visible || document.hidden) return;
    var idle = performance.now() - lastInteraction > 2500;
    if (!focus() && !dragging && !pointerInside && idle && !REDUCE && !searchHits) {
      goal.yaw += 0.0016;
    }
    if (!dragging && (spin.vx || spin.vy)) {
      goal.yaw += spin.vx;
      goal.pitch += spin.vy;
      spin.vx *= 0.92;
      spin.vy *= 0.92;
      if (Math.abs(spin.vx) < 1e-5 && Math.abs(spin.vy) < 1e-5) spin.vx = spin.vy = 0;
    }
    goal.pitch = Math.max(-1.25, Math.min(1.25, goal.pitch));
    var k = REDUCE ? 1 : 0.09;
    view.yaw += (goal.yaw - view.yaw) * k;
    view.pitch += (goal.pitch - view.pitch) * k;
    view.dist += (goal.dist - view.dist) * k;
    view.tilt += (goal.tilt - view.tilt) * k;
    globe.rotation.set(view.pitch, view.yaw, 0);
    /* World view: look at the centre. Zoomed in: look at the topic (the front of the globe)
       from a little below, for a sense of depth. */
    var f = view.tilt / TILT;
    var dd = view.dist - f;
    camera.position.set(0, -Math.sin(view.tilt) * dd, f + Math.cos(view.tilt) * dd);
    camera.lookAt(0, 0, f);
    globe.updateMatrixWorld();
    renderer.render(scene, camera);
    placeLabels();
    var moving = Math.abs(goal.yaw - view.yaw) + Math.abs(goal.pitch - view.pitch) +
      Math.abs(goal.dist - view.dist) + Math.abs(goal.tilt - view.tilt) > 1e-4;
    var autoSpin = !focus() && !REDUCE && !searchHits;
    if (moving || autoSpin || spin.vx || spin.vy) requestFrame();
  }

  /* ---------- input ---------- */

  var dragging = false;
  var down = null;

  function wireInput() {
    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      dragging = true;
      down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), moved: 0 };
      spin.vx = spin.vy = 0;
      canvas.setPointerCapture(e.pointerId);
      mapBox.classList.add('xm-grabbing');
      lastInteraction = performance.now();
    });
    canvas.addEventListener('pointermove', function (e) {
      lastInteraction = performance.now();
      if (dragging && down) {
        var dx = e.clientX - down.lx, dy = e.clientY - down.ly;
        down.lx = e.clientX;
        down.ly = e.clientY;
        down.moved += Math.abs(dx) + Math.abs(dy);
        var s = 0.0042 * Math.min(1, (view.dist - 1) / (worldDist - 1));
        goal.yaw += dx * s;
        goal.pitch += dy * s;
        view.yaw = goal.yaw;
        view.pitch = Math.max(-1.25, Math.min(1.25, goal.pitch));
        spin.vx = dx * s;
        spin.vy = dy * s;
        if (down.moved > 5) clearHover();
        requestFrame();
      }
    });
    canvas.addEventListener('pointerup', function (e) {
      if (!dragging) return;
      dragging = false;
      mapBox.classList.remove('xm-grabbing');
      if (REDUCE) spin.vx = spin.vy = 0;
      if (down && down.moved < 6) spin.vx = spin.vy = 0;
      down = null;
      requestFrame();
    });
    canvas.addEventListener('pointercancel', function () { dragging = false; down = null; mapBox.classList.remove('xm-grabbing'); });
    mapBox.addEventListener('scroll', function () { mapBox.scrollTop = 0; mapBox.scrollLeft = 0; });
    mapBox.addEventListener('pointerenter', function () { pointerInside = true; });
    mapBox.addEventListener('pointerleave', function () {
      pointerInside = false;
      lastInteraction = performance.now();
      if (!dragging) clearHover();
      requestFrame();
    });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      goal.dist = Math.max(1.35, Math.min(worldDist * 1.6, goal.dist * Math.exp(e.deltaY * 0.0012)));
      lastInteraction = performance.now();
      requestFrame();
    }, { passive: false });
  }

  /* ---------- selection ---------- */

  function refresh() {
    if (!renderer) return;
    styleLabels();
  }

  /* Highlight the hovered, selected and search-hit labels. */
  function styleLabels() {
    countries.forEach(function (c) {
      c.label.classList.toggle('xm-on', !!(hover && hover.country === c));
      c.states.forEach(function (s) {
        s.label.classList.toggle('xm-on', !!(current.state === s || (hover && hover.state === s)));
        s.label.classList.toggle('xm-hit', !!(searchHits && searchHits.has(s)));
      });
    });
    requestFrame();
  }

  function selectCountry(country, state) {
    current.country = country;
    current.state = state || null;
    current.district = null;
    if (renderer) {
      flyTo(country);
      backBtn.hidden = !country;
      root.classList.toggle('xm-zoomed', !!country);
      pop.hidden = true;
      refresh();
    }
    if (current.state) renderState(current.state);
    else if (country) renderCountry(country);
    else renderWorld();
    setHash();
  }

  function selectState(state) {
    if (current.country !== state.country) return selectCountry(state.country, state);
    current.state = state;
    current.district = null;
    refresh();
    renderState(state);
    setHash();
  }

  /* ---------- travel guide ---------- */

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function icon(cls) {
    var i = el('i', cls);
    i.setAttribute('aria-hidden', 'true');
    return i;
  }

  function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
  }

  function button(cls, onClick) {
    var b = el('button', cls);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  function postList(posts, limit) {
    var ul = el('ul', 'xm-posts');
    posts.slice(0, limit || posts.length).forEach(function (p) {
      var li = el('li');
      var a = el('a', null, p.title);
      a.href = p.url;
      li.appendChild(a);
      li.appendChild(el('time', null, p.date));
      ul.appendChild(li);
    });
    return ul;
  }

  function guideHeader(title, iconCls, color, sub) {
    var h = el('div', 'xm-guide-head');
    if (color) h.style.setProperty('--xm-color', color);
    var h3 = el('h3');
    if (iconCls) h3.appendChild(icon(iconCls));
    h3.appendChild(document.createTextNode(title));
    h.appendChild(h3);
    if (sub) h.appendChild(el('p', 'xm-sub', sub));
    return h;
  }

  function renderWorld() {
    guide.textContent = '';
    guide.appendChild(guideHeader('World atlas', 'fas fa-earth-americas', null,
      plural(allPosts.length, 'post') + ' across ' + countries.length + ' countries. ' +
      'Spin the globe and pick a country to explore it.'));
    var list = el('div', 'xm-choices');
    countries.forEach(function (c) {
      var b = button('xm-choice', function () { selectCountry(c); });
      b.style.setProperty('--xm-color', c.color);
      b.appendChild(icon(c.icon));
      b.appendChild(el('span', 'xm-name', c.name));
      b.appendChild(el('span', 'xm-count', c.count));
      list.appendChild(b);
    });
    guide.appendChild(list);
  }

  function renderCountry(c) {
    guide.textContent = '';
    guide.appendChild(guideHeader(c.name, c.icon, c.color,
      plural(c.count, 'post') + ' across ' + plural(c.states.length, 'state') + '.'));
    var list = el('div', 'xm-choices');
    var max = c.states[0] ? c.states[0].posts.length : 1;
    c.states.forEach(function (s) {
      var b = button('xm-choice', function () { selectState(s); });
      b.style.setProperty('--xm-color', c.color);
      b.style.setProperty('--xm-fill', (100 * s.posts.length / max) + '%');
      b.appendChild(el('span', 'xm-name', s.name));
      b.appendChild(el('span', 'xm-count', s.posts.length));
      list.appendChild(b);
    });
    guide.appendChild(list);

    var all = [];
    c.states.forEach(function (s) { all = all.concat(s.posts); });
    guide.appendChild(el('h4', null, 'Latest dispatches'));
    guide.appendChild(postList(latest(all, 5)));
  }

  function renderState(s) {
    var c = s.country;
    guide.textContent = '';
    var crumb = button('xm-crumb', function () { selectCountry(c); });
    crumb.appendChild(icon('fas fa-arrow-left'));
    crumb.appendChild(document.createTextNode(' ' + c.name));
    guide.appendChild(crumb);
    guide.appendChild(guideHeader(s.name, null, c.color, plural(s.posts.length, 'post')));

    var districts = {};
    s.posts.forEach(function (p) { if (p.district) districts[p.district] = (districts[p.district] || 0) + 1; });
    var names = Object.keys(districts).sort(function (a, b) { return districts[b] - districts[a] || (a < b ? -1 : 1); });
    var posts = s.posts;
    if (names.length > 1) {
      var label = function (name) { return name ? name + ' (' + districts[name] + ')' : 'All districts'; };
      var pickDistrict = function (name) { current.district = name; renderState(s); };
      if (names.length > 6) {
        var select = el('select', 'xm-district-select');
        select.setAttribute('aria-label', 'Filter by district');
        [null].concat(names).forEach(function (name) {
          var option = el('option', null, label(name));
          option.value = name || '';
          option.selected = current.district === name;
          select.appendChild(option);
        });
        select.addEventListener('change', function () { pickDistrict(select.value || null); });
        guide.appendChild(select);
      } else {
        var chips = el('div', 'xm-districts');
        [null].concat(names).forEach(function (name) {
          var b = button('xm-district', function () { pickDistrict(name); });
          b.textContent = name ? label(name) : 'All';
          b.setAttribute('aria-pressed', String(current.district === name));
          chips.appendChild(b);
        });
        guide.appendChild(chips);
      }
      if (current.district) posts = posts.filter(function (p) { return p.district === current.district; });
    }

    guide.appendChild(postList(posts));
    var browse = el('a', 'xm-browse', 'Browse the ' + s.name + ' category ');
    browse.href = s.url;
    browse.appendChild(icon('fas fa-arrow-right'));
    guide.appendChild(browse);
  }

  function renderResults(q, matches) {
    guide.textContent = '';
    guide.appendChild(guideHeader('Search: “' + q + '”', 'fas fa-magnifying-glass', null,
      matches.length ? plural(matches.length, 'post') + ' found' : 'Nothing charted here yet.'));
    var ul = el('ul', 'xm-posts');
    matches.slice(0, 60).forEach(function (p) {
      var li = el('li');
      var a = el('a', null, p.title);
      a.href = p.url;
      li.appendChild(a);
      li.appendChild(el('span', 'xm-where', p.state.country.name + ' › ' + p.state.name));
      ul.appendChild(li);
    });
    guide.appendChild(ul);
  }

  /* ---------- search (filters both the globe and the Atlas) ---------- */

  var searchTimer;
  function onSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      var q = search.value.trim().toLowerCase();
      var active = q.length >= 2;
      var matches = active ? allPosts.filter(function (p) { return p.title.toLowerCase().indexOf(q) !== -1; }) : [];

      countries.forEach(function (c) {
        var cHit = false;
        c.states.forEach(function (s) {
          var sHit = false;
          s.posts.forEach(function (p) {
            var show = !active || matches.indexOf(p) !== -1;
            p.li.hidden = !show;
            sHit = sHit || show;
          });
          s.el.hidden = active && !sHit;
          if (active) s.el.open = sHit;
          cHit = cHit || sHit;
        });
        c.el.hidden = active && !cHit;
        if (active) c.el.open = cHit;
      });

      searchHits = active ? new Set(matches.map(function (p) { return p.state; })) : null;
      if (renderer) {
        root.classList.toggle('xm-searching', active);
        if (active) {
          /* Show every match from the world view; clearing the search restores the previous view. */
          flyTo(null);
          root.classList.remove('xm-zoomed');
          backBtn.hidden = true;
          refresh();
        }
      }
      if (active) renderResults(search.value.trim(), matches);
      else selectCountry(current.country, current.state);
    }, 120);
  }

  /* ---------- deep links ---------- */

  function setHash() {
    var id = current.state ? current.country.id + '/' + current.state.id : current.country ? current.country.id : '';
    history.replaceState(null, '', id ? '#' + id : location.pathname + location.search);
  }

  function applyHash() {
    var parts = decodeURIComponent(location.hash.slice(1)).split('/');
    var country = findCountry(parts[0]);
    selectCountry(country, findState(country, parts[1]));
  }

  /* ---------- wiring ---------- */

  /* Back/forward and edited URLs; other anchors on the page (e.g. #atlas-title) are left alone. */
  window.addEventListener('hashchange', function () {
    var id = decodeURIComponent(location.hash.slice(1)).split('/')[0];
    if (renderer && (id === '' || findCountry(id))) applyHash();
  });

  backBtn.addEventListener('click', function () { selectCountry(null); });
  search.addEventListener('input', onSearch);

  /* ---------- fullscreen ----------
   * A fixed overlay toggled by a class (works in embedded browsers too), plus the browser's
   * Fullscreen API when available to hide the browser chrome. */

  var nativeFullscreen = false;

  function isFullscreen() {
    return viewer.classList.contains('xm-fullscreen');
  }

  function setFullscreen(on) {
    viewer.classList.toggle('xm-fullscreen', on);
    document.body.classList.toggle('xm-fullscreen-open', on);
    fsBtn.querySelector('i').className = on ? 'fas fa-compress' : 'fas fa-expand';
    fsBtn.setAttribute('aria-label', on ? 'Exit fullscreen' : 'View map fullscreen');
    fsBtn.title = on ? 'Exit fullscreen (Esc)' : 'Fullscreen';
    if (on && viewer.requestFullscreen) {
      viewer.requestFullscreen().then(function () { nativeFullscreen = true; }).catch(function () {});
    } else if (!on && nativeFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(function () {});
    }
    if (!on) nativeFullscreen = false;
    pop.hidden = true;
    if (renderer) resize();
  }

  fsBtn.addEventListener('click', function () { setFullscreen(!isFullscreen()); });

  /* The browser's own Esc (or F11) leaves native fullscreen; drop the overlay with it. */
  document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement && nativeFullscreen && isFullscreen()) setFullscreen(false);
  });

  /* Esc: zoom out first, then leave the overlay. */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !renderer) return;
    if (current.country && (isFullscreen() || viewer.contains(document.activeElement))) {
      selectCountry(null);
    } else if (isFullscreen()) {
      setFullscreen(false);
    }
  });

  root.querySelectorAll('.xm-passport a').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var country = findCountry(a.dataset.country);
      if (renderer && !stage.hidden && getComputedStyle(stage).display !== 'none') {
        e.preventDefault();
        selectCountry(country);
        stage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        country.el.open = true;
      }
    });
  });

  /* d3 and topojson load with `defer`; this script too, so they are ready here. */
  if (WIDE.addEventListener) WIDE.addEventListener('change', render);
  render();

  /* Small screens: a deep link opens that country in the Atlas instead. */
  if (!rendered && location.hash.length > 1) {
    var linked = findCountry(decodeURIComponent(location.hash.slice(1)).split('/')[0]);
    if (linked) linked.el.open = true;
  }
})();
