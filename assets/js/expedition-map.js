/*
 * Expedition Map: draws _includes/expedition-map.html's Atlas as an interactive map.
 * Countries (topics) and states (subtopics) are Voronoi-treemap regions sized by post count.
 * Click a country to zoom in, click a state to list its posts in the travel guide.
 * Deep links: #devops, #devops/cicd. A real world map (Natural Earth, world-atlas) sits underneath.
 */
(function () {
  'use strict';

  var W = 1000;
  var H = 560;
  var SEED = 20251001;
  var CACHE_KEY = 'xm-layout-v2';
  var WORLD_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
  var ANTARCTICA = '010';
  var WIDE = window.matchMedia('(min-width: 850px)');

  var root = document.getElementById('expedition-map');
  if (!root) return;

  var viewer = root.querySelector('.xm-viewer');
  var fsBtn = root.querySelector('.xm-fs-btn');
  var stage = root.querySelector('.xm-stage');
  var svg = root.querySelector('svg');
  var guide = root.querySelector('.xm-guide');
  var tooltip = root.querySelector('.xm-tooltip');
  var backBtn = root.querySelector('.xm-back');
  var search = root.querySelector('.xm-search input');
  var loading = root.querySelector('.xm-loading');

  var countries = readAtlas();
  var allPosts = [];
  countries.forEach(function (c) {
    c.states.forEach(function (s) {
      s.posts.forEach(function (p) { allPosts.push(p); });
    });
  });

  var rendered = false;
  var current = { country: null, state: null, district: null };
  var world, statePaths, countryPaths, stateLabels;
  var zoomScale = 1;

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

  /* ---------- layout ---------- */

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* An irregular convex "continent" inside the globe outline (the treemap needs a convex clip). */
  function continent(rand) {
    var points = [];
    for (var i = 0; i < 48; i++) {
      var a = (i / 48) * Math.PI * 2;
      var r = 0.86 + rand() * 0.14;
      points.push([W / 2 + Math.cos(a) * 440 * r, H / 2 + Math.sin(a) * 245 * r]);
    }
    return d3.polygonHull(points);
  }

  function signature() {
    return countries.map(function (c) {
      return c.id + ':' + c.states.map(function (s) { return s.id + '=' + s.posts.length; }).join(',');
    }).join('|');
  }

  function computeLayout() {
    var sig = signature();
    try {
      var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && cached.sig === sig) return cached.layout;
    } catch (e) { /* storage unavailable */ }

    var rand = mulberry32(SEED);
    var clip = continent(rand);
    var hierarchy = d3.hierarchy({
      children: countries.map(function (c) {
        return {
          id: c.id,
          children: c.states.map(function (s) {
            /* Dampen size differences so one-post states stay clickable. */
            return { id: c.id + '/' + s.id, weight: Math.pow(s.posts.length, 0.8) + 1.2 };
          })
        };
      })
    }).sum(function (d) { return d.weight || 0; });

    d3.voronoiTreemap()
      .clip(clip)
      .prng(rand)
      .convergenceRatio(0.005)
      .maxIterationCount(80)(hierarchy);

    var layout = { clip: round(clip), regions: {} };
    hierarchy.descendants().forEach(function (node) {
      if (node.depth > 0) layout.regions[node.data.id] = round(node.polygon);
    });

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ sig: sig, layout: layout }));
    } catch (e) { /* storage unavailable */ }
    return layout;
  }

  function round(polygon) {
    return polygon.map(function (p) { return [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]; });
  }

  /* ---------- drawing ---------- */

  function pathOf(polygon) {
    return 'M' + polygon.map(function (p) { return p.join(','); }).join('L') + 'Z';
  }

  function area(polygon) {
    return Math.abs(d3.polygonArea(polygon));
  }

  function shore(clip, scale, rand) {
    var c = d3.polygonCentroid(clip);
    var pts = clip.map(function (p) {
      var k = scale + (rand() - 0.5) * 0.012;
      return [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k];
    });
    return d3.line().curve(d3.curveCatmullRomClosed.alpha(0.5))(pts);
  }

  function render() {
    if (rendered || !WIDE.matches || !window.d3 || !d3.voronoiTreemap) return;
    rendered = true;
    stage.hidden = false;

    /* Let the "Charting the map…" message paint before the layout work. */
    setTimeout(function () {
      var layout = computeLayout();
      draw(layout);
      loading.remove();
      root.classList.add('xm-ready');
      applyHash();
    }, 30);
  }

  function draw(layout) {
    var s = d3.select(svg);
    var rand = mulberry32(SEED + 1);

    world = s.append('g').attr('class', 'xm-world');
    drawEarth(world.append('g').attr('class', 'xm-earth'));
    var shoreG = world.append('g').attr('class', 'xm-shore');
    [1.045, 1.02].forEach(function (k) { shoreG.append('path').attr('d', shore(layout.clip, k, rand)); });
    drawCompass(s.append('g').attr('class', 'xm-compass').attr('transform', 'translate(56,' + (H - 56) + ')'));

    var states = [];
    countries.forEach(function (c) {
      c.polygon = layout.regions[c.id];
      c.states.forEach(function (st, i) {
        st.polygon = layout.regions[c.id + '/' + st.id];
        st.shade = 0.3 + 0.28 * ((i * 7) % 5) / 4;
        states.push(st);
      });
    });

    statePaths = world.append('g').attr('class', 'xm-states-layer').selectAll('path')
      .data(states).enter().append('path')
      .attr('class', 'xm-region')
      .attr('d', function (d) { return pathOf(d.polygon); })
      .style('fill', function (d) { return d.country.color; })
      .style('fill-opacity', function (d) { return d.shade; })
      .attr('role', 'button')
      .attr('aria-label', function (d) { return d.country.name + ', ' + d.name + ', ' + d.posts.length + ' posts'; })
      .on('mouseenter', function (e, d) { showTip(e, d.country.name + ' › ' + d.name, d.posts.length); })
      .on('mousemove', moveTip)
      .on('mouseleave', hideTip)
      .on('click', function (e, d) { activate(d); })
      .on('keydown', function (e, d) { if (isActivate(e)) { e.preventDefault(); activate(d); } });

    countryPaths = world.append('g').attr('class', 'xm-borders').selectAll('path')
      .data(countries).enter().append('path')
      .attr('class', 'xm-border')
      .attr('d', function (d) { return pathOf(d.polygon); })
      .attr('role', 'button')
      .attr('aria-label', function (d) { return d.name + ', ' + d.count + ' posts. Open on map'; })
      .on('keydown', function (e, d) { if (isActivate(e)) { e.preventDefault(); selectCountry(d); } });

    var labels = world.append('g').attr('class', 'xm-country-labels').selectAll('g')
      .data(countries).enter().append('g')
      .attr('class', 'xm-country-label')
      .attr('transform', function (d) { var c = d3.polygonCentroid(d.polygon); return 'translate(' + c + ')'; });
    labels.each(function (d) {
      var size = Math.max(13, Math.min(24, Math.sqrt(area(d.polygon)) / 9));
      var g = d3.select(this);
      g.append('text').attr('class', 'xm-cname').attr('font-size', size).text(d.name);
      g.append('text').attr('class', 'xm-ccount').attr('font-size', size * 0.62).attr('dy', size * 0.95)
        .text(d.count + ' posts');
    });

    stateLabels = world.append('g').attr('class', 'xm-state-labels');
    setTabStops();
  }

  /* Real world map underneath; the topic map still works if it fails to load. */
  function drawEarth(g) {
    if (!window.topojson) return;
    var projection = d3.geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], { type: 'Sphere' });
    var path = d3.geoPath(projection);
    g.append('path').attr('class', 'xm-ocean').attr('d', path({ type: 'Sphere' }));
    g.append('path').attr('class', 'xm-graticule').attr('d', path(d3.geoGraticule10()));
    d3.json(WORLD_URL).then(function (topo) {
      var countriesGeo = topojson.feature(topo, topo.objects.countries);
      countriesGeo.features = countriesGeo.features.filter(function (f) { return f.id !== ANTARCTICA; });
      g.append('path').attr('class', 'xm-geo-land').attr('d', path(countriesGeo));
      g.append('path').attr('class', 'xm-geo-borders')
        .attr('d', path(topojson.mesh(topo, topo.objects.countries, function (a, b) { return a !== b; })));
    }).catch(function () { /* offline or blocked: keep the plain ocean */ });
  }

  function drawCompass(g) {
    g.append('circle').attr('r', 30);
    g.append('path').attr('d', 'M0,-40L7,0L0,40L-7,0Z');
    g.append('path').attr('class', 'xm-compass-ew').attr('d', 'M-40,0L0,-6L40,0L0,6Z');
    g.append('text').attr('y', -46).text('N');
  }

  function isActivate(e) {
    return e.key === 'Enter' || e.key === ' ';
  }

  function activate(state) {
    if (current.country !== state.country) selectCountry(state.country);
    else selectState(state);
  }

  /* ---------- tooltip ---------- */

  function showTip(e, label, count) {
    tooltip.textContent = '';
    var strong = document.createElement('strong');
    strong.textContent = label;
    tooltip.appendChild(strong);
    tooltip.appendChild(document.createTextNode(' · ' + count + (count === 1 ? ' post' : ' posts')));
    tooltip.hidden = false;
    moveTip(e);
  }

  function moveTip(e) {
    var box = stage.querySelector('.xm-map').getBoundingClientRect();
    tooltip.style.left = (e.clientX - box.left + 14) + 'px';
    tooltip.style.top = (e.clientY - box.top + 14) + 'px';
  }

  function hideTip() {
    tooltip.hidden = true;
  }

  /* ---------- selection ---------- */

  function zoomTo(country) {
    var t = 'translate(0,0) scale(1)';
    var k = 1;
    if (country) {
      var xs = country.polygon.map(function (p) { return p[0]; });
      var ys = country.polygon.map(function (p) { return p[1]; });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
      var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      k = Math.min(4, 0.86 * Math.min(W / (x1 - x0), H / (y1 - y0)));
      t = 'translate(' + (W / 2 - k * (x0 + x1) / 2) + ',' + (H / 2 - k * (y0 + y1) / 2) + ') scale(' + k + ')';
    }
    zoomScale = k;
    world.transition().duration(650).ease(d3.easeCubicInOut).attr('transform', t);
    drawStateLabels(country);
  }

  /* Label sizes are in screen pixels, so they read the same inline and in fullscreen. */
  function drawStateLabels(country) {
    stateLabels.selectAll('*').remove();
    if (!country) return;
    var z = zoomScale * (svg.getBoundingClientRect().width / W || 1);
    country.states.forEach(function (s) {
      if (area(s.polygon) * z * z < 5200) return;
      var c = d3.polygonCentroid(s.polygon);
      var g = stateLabels.append('g').attr('class', 'xm-state-label').attr('transform', 'translate(' + c + ')');
      g.append('text').attr('font-size', 14 / z).text(s.name);
      g.append('text').attr('class', 'xm-scount').attr('font-size', 11.5 / z).attr('dy', 13.5 / z).text(s.posts.length);
    });
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (rendered) drawStateLabels(current.country); }, 150);
  });

  function selectCountry(country, state) {
    current.country = country;
    current.state = state || null;
    current.district = null;
    if (rendered) {
      zoomTo(country);
      backBtn.hidden = !country;
      root.classList.toggle('xm-zoomed', !!country);
      countryPaths.classed('xm-active', function (d) { return d === country; });
      statePaths
        .classed('xm-faded', function (d) { return country && d.country !== country; })
        .classed('xm-active', function (d) { return d === current.state; });
      setTabStops();
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
    if (rendered) statePaths.classed('xm-active', function (d) { return d === state; });
    renderState(state);
    setHash();
  }

  function setTabStops() {
    if (!statePaths) return;
    countryPaths.attr('tabindex', current.country ? -1 : 0);
    statePaths.attr('tabindex', function (d) { return current.country && d.country === current.country ? 0 : -1; });
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
      'Pick a country on the map to explore it.'));
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

    var latest = [];
    c.states.forEach(function (s) { latest = latest.concat(s.posts); });
    latest.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    guide.appendChild(el('h4', null, 'Latest dispatches'));
    guide.appendChild(postList(latest, 5));
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
      var pick = function (name) { current.district = name; renderState(s); };
      if (names.length > 6) {
        var select = el('select', 'xm-district-select');
        select.setAttribute('aria-label', 'Filter by district');
        [null].concat(names).forEach(function (name) {
          var option = el('option', null, label(name));
          option.value = name || '';
          option.selected = current.district === name;
          select.appendChild(option);
        });
        select.addEventListener('change', function () { pick(select.value || null); });
        guide.appendChild(select);
      } else {
        var chips = el('div', 'xm-districts');
        [null].concat(names).forEach(function (name) {
          var b = button('xm-district', function () { pick(name); });
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

  /* ---------- search (filters both the map and the Atlas) ---------- */

  var searchTimer;
  function onSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      var q = search.value.trim().toLowerCase();
      var active = q.length >= 2;
      var matches = active ? allPosts.filter(function (p) { return p.title.toLowerCase().indexOf(q) !== -1; }) : [];
      var hitStates = new Set(matches.map(function (p) { return p.state; }));

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

      if (rendered) {
        root.classList.toggle('xm-searching', active);
        statePaths.classed('xm-hit', function (d) { return active && hitStates.has(d); });
        if (active) {
          /* Show every match; clearing the search restores the previous view. */
          zoomTo(null);
          root.classList.remove('xm-zoomed');
          backBtn.hidden = true;
          statePaths.classed('xm-faded', false).classed('xm-active', false);
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
    if (rendered && (id === '' || findCountry(id))) applyHash();
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
    hideTip();
    if (rendered) drawStateLabels(current.country);
  }

  fsBtn.addEventListener('click', function () { setFullscreen(!isFullscreen()); });

  /* The browser's own Esc (or F11) leaves native fullscreen; drop the overlay with it. */
  document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement && nativeFullscreen && isFullscreen()) setFullscreen(false);
  });

  /* Esc: zoom out first, then leave the overlay. */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !rendered) return;
    if (current.country && (isFullscreen() || viewer.contains(document.activeElement))) {
      selectCountry(null);
    } else if (isFullscreen()) {
      setFullscreen(false);
    }
  });

  root.querySelectorAll('.xm-passport a').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var country = findCountry(a.dataset.country);
      if (rendered && !stage.hidden && getComputedStyle(stage).display !== 'none') {
        e.preventDefault();
        selectCountry(country);
        stage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        country.el.open = true;
      }
    });
  });

  if (WIDE.addEventListener) WIDE.addEventListener('change', render);
  render();

  /* Small screens: a deep link opens that country in the Atlas instead. */
  if (!rendered && location.hash.length > 1) {
    var linked = findCountry(decodeURIComponent(location.hash.slice(1)).split('/')[0]);
    if (linked) linked.el.open = true;
  }
})();
