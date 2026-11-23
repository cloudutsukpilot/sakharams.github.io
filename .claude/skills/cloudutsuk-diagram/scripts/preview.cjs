#!/usr/bin/env node
/*
 * Check an explorable diagram on the built site the way a reader's browser sees it (real CDNs:
 * Font Awesome, Bootstrap, fonts, ELK from jsDelivr; only ads and analytics are blocked).
 *
 *   node preview.cjs --url http://localhost:4123/<page>/ --id <folders/name> --out <dir> [--chrome PATH]
 *
 * In dark desktop, light desktop and light phone views it checks: the diagram lays out (is-ready), no
 * script errors, full width, no foreign styling, no raw Markdown leaking from the post, and at every
 * level no two components overlap (pills on top of components are reported too). On light desktop it
 * also clicks through: expand a component, hover an arrow (protocol card), open a detail panel, zoom,
 * the start level, the sidebar (menus, buttons at its foot, folding), the zoom lock and (if the diagram
 * has one) the player and the tour. Screenshots: <view>-level<N>.png, card.png, panel.png, edge-panel.png,
 * expanded.png, sidebar.png, zoom-locked.png, player-open.png, tour.png, collapsed.png. Exit code 1 if
 * any check fails.
 */
const path = require('path');
const fs = require('fs');

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), [])
);
const work = args.work || process.env.CLOUDUTSUK_DIAGRAM_DIR || path.join(process.env.HOME, '.cache/cloudutsuk-diagram');
const { chromium } = require(path.join(work, 'node_modules', 'playwright-core'));
if (!args.url || !args.id || !args.out) {
  console.error('usage: preview.cjs --url URL --id ID --out DIR [--chrome PATH]');
  process.exit(2);
}
fs.mkdirSync(args.out, { recursive: true });
const sel = `#dgm-${args.id.replace(/\//g, '--')}`;
const VIEWS = [
  { name: 'light-desktop', scheme: 'light', width: 1280, interact: true },
  { name: 'dark-desktop', scheme: 'dark', width: 1280 },
  { name: 'light-phone', scheme: 'light', width: 390 }
];
// Matched against the host only: a post's own path can name these (the GA4 post's slug has
// "google-analytics" in it), and aborting the page itself loads Chrome's error page instead.
const BLOCK = /googlesyndication|googletagmanager|google-analytics|doubleclick|giscus|adservice/;

(async () => {
  const browser = await chromium.launch({ executablePath: args.chrome || process.env.CHROME });
  let failed = false;
  for (const v of VIEWS) {
    const page = await browser.newPage({ viewport: { width: v.width, height: v.width < 600 ? 820 : 1000 }, colorScheme: v.scheme });
    await page.route((u) => BLOCK.test(u.hostname), (r) => r.abort());
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && !/ERR_FAILED|ERR_BLOCKED/.test(m.text()) && errors.push(m.text()));
    const checks = [];
    const check = (ok, msg) => {
      checks.push(`${ok ? 'ok  ' : 'FAIL'} ${msg}`);
      if (!ok) failed = true;
    };
    const note = (msg) => checks.push(`note ${msg}`);
    // A stale ?dgm-<id>=0~~~ (old builds saved the layout in the URL) must not change the start level.
    const stale = new URL(args.url);
    stale.searchParams.set(sel.slice(1), '0~~~');
    // A slow CDN may hold up 'load'; that is fine. Any other failure (404, refused, aborted) is not.
    const gone = await page.goto(stale.href, { waitUntil: 'load', timeout: 60000 }).then(
      (res) => (res && !res.ok() ? `HTTP ${res.status()}` : null),
      (e) => (e.name === 'TimeoutError' ? page.waitForLoadState('domcontentloaded').then(() => null) : e.message.split('\n')[0])
    );
    if (gone) {
      check(false, `page loads (${gone})`);
      console.log(`[${v.name}]\n  ` + checks.join('\n  '));
      await page.close();
      continue;
    }
    await page.evaluate((s) => document.documentElement.setAttribute('data-mode', s), v.scheme);
    const fig = await page.$(sel);
    if (!fig) {
      check(false, `figure ${sel} not found (wrong id, or the include is missing)`);
      console.log(`[${v.name}]\n  ` + checks.join('\n  '));
      await page.close();
      continue;
    }
    await fig.scrollIntoViewIfNeeded();
    const ready = await page.waitForSelector(`${sel}.is-ready`, { timeout: 40000 }).then(() => true, () => false);
    check(ready, 'diagram laid out (ELK loaded, is-ready)');
    await page.waitForTimeout(900);
    const info = await page.evaluate((s) => {
      const f = document.querySelector(s);
      const cs = getComputedStyle(f);
      const t = (document.querySelector('article') || document.body).innerText;
      return {
        width: f.getBoundingClientRect().width,
        parent: f.parentElement.getBoundingClientRect().width,
        display: cs.display,
        font: cs.fontFamily,
        leaked: (t.match(/\{: #[\w-]+ \}|^#{2,4} \S/m) || [''])[0],
        max: f.querySelectorAll('.dgm-lvl').length - 1,
        startOn: [...f.querySelectorAll('.dgm-lvl')].findIndex((b) => b.classList.contains('is-on')),
        start: Math.min(JSON.parse(f.querySelector('.dgm-data').textContent).level ?? 1, f.querySelectorAll('.dgm-lvl').length - 1),
        tour: !!f.querySelector('.dgm-controls')
      };
    }, sel);
    check(info.width >= info.parent * 0.95, `full width (${Math.round(info.width)} of ${Math.round(info.parent)}px)`);
    check(info.display === 'block' && !/awesome/i.test(info.font), `no foreign styling (${info.display}, ${info.font.split(',')[0]})`);
    check(info.startOn === info.start, `opens at its start level (level ${info.startOn}, expected ${info.start}), whatever the URL says`);
    check(!page.url().includes(sel.slice(1)), 'the old layout parameter is dropped from the URL');
    check(!info.leaked, `post body renders as HTML${info.leaked ? ` (leaked ${JSON.stringify(info.leaked)})` : ''}`);

    // Every level: no overlapping components; pills on components are reported.
    const levels = v.interact ? [...Array(info.max + 1).keys()] : [1];
    for (const lvl of levels) {
      // Level buttons step one layer at a time, so wait for the walk to finish.
      await page.click(`${sel} .dgm-lvl[data-level="${lvl}"]`);
      await page.waitForFunction((s) => !document.querySelector(s).classList.contains('is-stepping'), sel, { timeout: 30000 });
      await page.waitForTimeout(900);
      const r = await page.evaluate((s) => {
        const f = document.querySelector(s);
        // Compare in diagram units (independent of zoom): each leaf's translate + its hit box.
        const boxes = [...f.querySelectorAll('.dgm-node')].map((n) => {
          const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(n.style.transform) || [0, 0, 0];
          const h = n.querySelector('.dgm-hit');
          return { id: n.dataset.id, x: +m[1], y: +m[2], w: +h.getAttribute('width'), h: +h.getAttribute('height') };
        });
        const over = [];
        for (let i = 0; i < boxes.length; i++)
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i];
            const b = boxes[j];
            if (a.x + 3 < b.x + b.w && b.x + 3 < a.x + a.w && a.y + 3 < b.y + b.h && b.y + 3 < a.y + a.h) over.push(`${a.id}/${b.id}`);
          }
        const pills = [...f.querySelectorAll('.dgm-pill')].map((p) => {
          const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(p.getAttribute('transform')) || [0, 0, 0];
          const w = +p.querySelector('rect').getAttribute('width');
          return { x: +m[1] - w / 2, y: +m[2] - 10, w, h: 20, t: p.textContent };
        });
        let pillHits = 0;
        for (const p of pills) for (const b of boxes) if (p.x < b.x + b.w - 4 && b.x + 4 < p.x + p.w && p.y < b.y + b.h - 4 && b.y + 4 < p.y + p.h) pillHits++;
        return { leaves: boxes.length, groups: f.querySelectorAll('.dgm-group').length, links: f.querySelectorAll('.dgm-link').length, over, pillHits };
      }, sel);
      check(r.over.length === 0, `level ${lvl}: ${r.leaves} components, ${r.groups} groups, ${r.links} arrows, no overlaps${r.over.length ? ` (overlap: ${r.over.slice(0, 5).join(', ')})` : ''}`);
      if (r.pillHits) note(`level ${lvl}: ${r.pillHits} protocol pill(s) touch a component`);
      await fig.screenshot({ path: path.join(args.out, `${v.name}-level${lvl}.png`) });
    }

    if (v.interact) {
      await page.click(`${sel} .dgm-lvl[data-level="1"]`);
      await page.waitForFunction((s) => !document.querySelector(s).classList.contains('is-stepping'), sel, { timeout: 30000 });
      await page.waitForTimeout(900);
      const stage = await (await page.$(`${sel} .dgm-stage`)).boundingBox();
      // The player's tab hangs from the top of the canvas: only what is below it counts as in view.
      const tabsBox = await page.$(`${sel} .dgm-player-handle`).then((t) => (t ? t.boundingBox() : null));
      const topClear = tabsBox ? tabsBox.y + tabsBox.height - stage.y + 8 : 10;
      const visible = async (css) => {
        for (const el of await page.$$(`${sel} ${css}`)) {
          const r = await el.boundingBox();
          if (r && r.x > stage.x + 10 && r.y > stage.y + topClear && r.x + r.width < stage.x + stage.width - 10 && r.y + r.height < stage.y + stage.height - 10) return [el, r];
        }
        return [null, null];
      };
      // Expand on click.
      const [coll] = await visible('.dgm-node.is-collapsible');
      if (coll) {
        const before = await page.$$eval(`${sel} .dgm-group`, (x) => x.length);
        // Stable layout: component centers (diagram units) and the camera, before and after.
        const snap = () =>
          fig.evaluate((f) => {
            const d = f._dgm;
            const c = {};
            for (const [id, p] of d.pos) c[id] = p.c || [p.x + p.w / 2, p.y + p.h / 2];
            return { stable: d.stable, cam: { ...d.cam }, c };
          });
        const s0 = await snap();
        const cid = await coll.getAttribute('data-id');
        await coll.click();
        await page.waitForTimeout(1600);
        const after = await page.$$eval(`${sel} .dgm-group`, (x) => x.length);
        check(after > before, `click expands a component (groups ${before} → ${after})`);
        await fig.screenshot({ path: path.join(args.out, 'expanded.png') });
        if (s0.stable) {
          // Each component's anchor point (`c`, its layout center) on screen, before and after.
          const s1 = await snap();
          const scr = (s, id) => [s.cam.x + s.cam.k * s.c[id][0], s.cam.y + s.cam.k * s.c[id][1]];
          const [a, b] = [scr(s0, cid), scr(s1, cid)];
          const moved = Math.hypot(a[0] - b[0], a[1] - b[1]);
          check(moved < 2, `stable layout: the opened component stays where it was on screen (moved ${moved.toFixed(1)}px)`);
          const sign = (v) => (Math.abs(v) < 0.5 ? 0 : Math.sign(v));
          const flipped = Object.keys(s0.c).filter(
            (id) => id !== cid && s1.c[id] && [0, 1].some((i) => sign(s0.c[id][i] - s0.c[cid][i]) !== sign(s1.c[id][i] - s1.c[cid][i]))
          );
          check(!flipped.length, `stable layout: the others stay on their side of it${flipped.length ? ` (crossed: ${flipped.join(', ')})` : ''}`);
          await fig.evaluate((f, id) => f._dgm.toggle(id), cid);
          await page.waitForTimeout(1600);
          const s2 = await snap();
          const off = Object.keys(s0.c).filter((id) => !s2.c[id] || Math.hypot(s0.c[id][0] - s2.c[id][0], s0.c[id][1] - s2.c[id][1]) > 0.5);
          check(!off.length, `stable layout: closing it puts every component back${off.length ? ` (not back: ${off.join(', ')})` : ''}`);
          const back = Math.hypot(scr(s2, cid)[0] - a[0], scr(s2, cid)[1] - a[1]);
          check(back < 2, `stable layout: and on screen it is where it started (${back.toFixed(1)}px off)`);
          // Open it again, as the rest of the walk expects.
          await fig.evaluate((f, id) => f._dgm.toggle(id), cid);
          await page.waitForTimeout(1600);
        }
      } else note('no expandable component in view at level 1');
      // Protocol card on hover.
      const [, pr] = await visible('.dgm-pill');
      if (pr) {
        await page.mouse.move(pr.x + pr.width / 2, pr.y + pr.height / 2);
        await page.waitForTimeout(2200);
        const shown = await page.$eval(`${sel} .dgm-card`, (c) => !c.hidden && c.textContent.length > 10);
        check(shown, 'hovering an arrow shows its protocol card');
        check(await page.$eval(`${sel} .dgm-card`, (c) => !!(c.querySelector('.dgm-card-why') || '').textContent), 'the card says why the connection exists');
        await fig.screenshot({ path: path.join(args.out, 'card.png') });
        await page.mouse.move(2, 2);
        await page.waitForTimeout(400);
        // Click the pill: the side panel shows the connection with its certificates.
        await page.mouse.click(pr.x + pr.width / 2, pr.y + pr.height / 2);
        await page.waitForTimeout(700);
        const certs = await page.$eval(`${sel} .dgm-panel`, (p) => !p.hidden && { n: p.querySelectorAll('.dgm-cert').length, any: !!p.querySelector('.dgm-certs') });
        const ex = await page.$eval(`${sel} .dgm-panel`, (p) => ({ groups: [...p.querySelectorAll('.dgm-ex-grp .dgm-ex-tag')].map((t) => t.textContent), msgs: p.querySelectorAll('.dgm-ex-msg').length, on: !!p.querySelector('.dgm-ex-grp.is-on') }));
        if (ex.msgs) check(ex.groups.length > 0 && ex.on, `the arrow's panel plays one exchange: ${ex.groups.join(' → ')} (${ex.msgs} messages)`);
        if (certs && certs.any) check(certs.n > 0, `clicking an arrow opens its panel with ${certs.n} certificate card(s)`);
        else note('the clicked arrow has no `certs`');
        const order = await page.$eval(`${sel} .dgm-panel`, (p) => {
          const ex = p.querySelector('.dgm-exchange'); const c = p.querySelector('.dgm-certs');
          const d = p.querySelector('details.dgm-cert');
          if (d) d.querySelector('summary').click();
          return { first: !ex || !c || !!(ex.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING), closed: !d || !p.querySelector('details.dgm-cert[open]:not(:first-of-type)'), opens: !d || d.open };
        });
        check(order.first && order.opens, 'the exchange comes before the certificates, which open on a click');
        await fig.screenshot({ path: path.join(args.out, 'edge-panel.png') });
        await page.click(`${sel} .dgm-panel-close`).catch(() => {});
      } else note('no protocol pill in view at level 1');
      // Detail panel.
      const [leaf] = await visible('.dgm-node.has-detail:not(.is-collapsible)');
      if (leaf) {
        await leaf.click();
        await page.waitForTimeout(800);
        check(await page.$eval(`${sel} .dgm-panel`, (p) => !p.hidden && p.textContent.length > 20), 'clicking a component opens its detail panel');
        const facts = await page.$eval(`${sel} .dgm-panel`, (p) => p.querySelector('.dgm-facts') && {
          lead: !!p.querySelector('.dgm-lead')?.textContent.trim(), how: !!p.querySelector('.dgm-how'),
          reach: !!p.querySelector('.dgm-links, .dgm-api'), badge: p.querySelector('.dgm-status')?.textContent || '' });
        if (facts) check(facts.lead && facts.how && facts.reach, `the panel shows a lead sentence, how it works and a link or API${facts.badge ? ` (badge: ${facts.badge})` : ''}`);
        else note('the clicked component has no `facts`');
        await fig.screenshot({ path: path.join(args.out, 'panel.png') });
        await page.click(`${sel} .dgm-panel-close`);
      } else note('no detail component in view at level 1');
      // View tabs: each reveals and highlights its own arrows.
      const tabs = await page.$$eval(`${sel} .dgm-vtab`, (x) => x.map((b) => b.dataset.view));
      for (const v of tabs.filter(Boolean)) {
        await page.click(`${sel} .dgm-vtab[data-view="${v}"]`);
        await page.waitForTimeout(1800);
        const r = await page.evaluate((s) => {
          const f = document.querySelector(s);
          const boxes = [...f.querySelectorAll('.dgm-node')].map((n) => {
            const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(n.style.transform) || [0, 0, 0];
            const h = n.querySelector('.dgm-hit');
            return { x: +m[1], y: +m[2], w: +h.getAttribute('width'), h: +h.getAttribute('height') };
          });
          let over = 0;
          for (let i = 0; i < boxes.length; i++)
            for (let j = i + 1; j < boxes.length; j++) {
              const a = boxes[i];
              const b = boxes[j];
              if (a.x + 3 < b.x + b.w && b.x + 3 < a.x + a.w && a.y + 3 < b.y + b.h && b.y + 3 < a.y + a.h) over++;
            }
          return { hot: f.querySelectorAll('.dgm-link.is-view').length, links: f.querySelectorAll('.dgm-link').length, faded: f.querySelectorAll('.is-faded').length, over };
        }, sel);
        if (v === '*') check(r.faded === 0 && r.over === 0, `Show all draws every view's arrows (${r.links}), nothing faded, no overlaps`);
        else check(r.hot > 0 && r.over === 0, `view tab "${v}" highlights ${r.hot} arrow(s), no overlaps`);
        await fig.screenshot({ path: path.join(args.out, `view-${v === '*' ? 'all' : v}.png`) });
      }
      if (tabs.length) {
        await page.click(`${sel} .dgm-vtab[data-view=""]`);
        await page.waitForTimeout(1500);
      }
      // Sidebar: Levels, Views (if any) and Use cases (if more than one) are collapsible menus; the zoom,
      // Fit and fullscreen buttons sit at its foot and stay in view.
      const side = await page.$eval(sel, (f) => ({
        menus: [...f.querySelectorAll('.dgm-menu')].map((m) => m.className.match(/dgm-menu-(\w+)/)[1]),
        foot: [...f.querySelectorAll('.dgm-side-foot [data-act]')].map((b) => b.dataset.act),
        tabsOnCanvas: !!f.querySelector('.dgm-stage .dgm-vtab, .dgm-toolbar')
      }));
      check(side.menus[0] === 'levels' && !side.tabsOnCanvas && ['zoom-in', 'zoom-out', 'fit', 'full'].every((a) => side.foot.includes(a)),
        `sidebar menus ${side.menus.join(', ')}; ${side.foot.join(', ')} at its foot; nothing on top of the canvas`);
      const head = await page.$(`${sel} .dgm-menu-levels .dgm-menu-head`);
      await head.click();
      const shut = await page.$eval(`${sel} .dgm-menu-levels .dgm-menu-items`, (x) => !x.offsetParent);
      await head.click();
      const back = await page.$eval(`${sel} .dgm-menu-levels .dgm-menu-items`, (x) => !!x.offsetParent);
      check(shut && back, 'a menu head folds and unfolds its items');
      await fig.screenshot({ path: path.join(args.out, 'sidebar.png') });
      // Zoom.
      const t0 = await page.$eval(`${sel} .dgm-view`, (g) => g.getAttribute('transform'));
      await page.click(`${sel} [data-act="zoom-in"]`);
      await page.waitForTimeout(300);
      check((await page.$eval(`${sel} .dgm-view`, (g) => g.getAttribute('transform'))) !== t0, 'zoom button changes the view');
      // Zoom lock: the zoom buttons, Ctrl + scroll and Fit keep the scale; unlocking zooms again.
      const scale = () => page.$eval(`${sel} .dgm-view`, (g) => +/scale\(([^)]+)\)/.exec(g.getAttribute('transform'))[1]);
      await page.click(`${sel} [data-act="zoom-lock"]`);
      const k0 = await scale();
      const btnOff = await page.$eval(`${sel} [data-act="zoom-in"]`, (b) => b.disabled);
      const st = await page.$(`${sel} .dgm-stage`);
      const sb = await st.boundingBox();
      await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
      await page.keyboard.down('Control');
      await page.mouse.wheel(0, -400);
      await page.keyboard.up('Control');
      await page.click(`${sel} [data-act="fit"]`);
      await page.waitForTimeout(700);
      check(btnOff && Math.abs((await scale()) - k0) < 1e-3, 'zoom lock holds the scale (buttons off, Ctrl + scroll and Fit only pan)');
      await (await page.$(`${sel} .dgm-side-foot`)).screenshot({ path: path.join(args.out, 'zoom-locked.png') });
      await page.click(`${sel} [data-act="zoom-lock"]`);
      await page.click(`${sel} [data-act="zoom-in"]`);
      await page.waitForTimeout(300);
      check(Math.abs((await scale()) - k0) > 1e-3, 'unlocking the zoom lets the buttons zoom again');
      // The player is a drawer at the top of the canvas: hover its tab to open it, then press a control.
      const openPlayer = async () => {
        await page.hover(`${sel} .dgm-player-handle`);
        await page.waitForSelector(`${sel} .dgm-player.is-open .dgm-controls`, { state: 'visible', timeout: 3000 });
      };
      const ctl = async (a) => {
        await openPlayer();
        await page.click(`${sel} .dgm-controls [data-act="${a}"]`);
      };
      const goStep = (k) => page.$eval(sel, (f, i) => { f._dgm.stop(); f._dgm.showStep(i, true); }, k);
      const stepCount = () => page.$eval(sel, (f) => f._dgm.steps.length);
      // A diagram with `lock: true` opens locked: note it, and unlock for the unlocked checks below
      // (the lock-mode check turns it on again, and it is put back at the end).
      const startLocked = info.tour && (await page.$eval(`${sel}`, (f) => !!f.querySelector('[data-act="lock"][aria-pressed="true"]')));
      if (startLocked) {
        note('opens in lock mode (`lock: true`); unlocking for the unlocked use-case checks');
        await ctl('lock');
        await page.waitForTimeout(600);
        check(await page.$eval(`${sel} [data-act="lock"]`, (b) => b.getAttribute('aria-pressed') === 'false'), 'the padlock turns lock mode off');
      }
      // Use cases close the open groups they don't use, and put the reader's layout back afterwards.
      if (info.tour) {
        // Closed by default (and again once the pointer leaves); hovering the tab opens it; playing folds it away.
        await page.mouse.move(2, 2);
        await page.waitForTimeout(700);
        check(!(await page.$eval(`${sel} .dgm-player`, (x) => x.classList.contains('is-open'))), 'the player is folded into its tab at the top of the canvas');
        await openPlayer();
        const pos = await page.$eval(sel, (f) => {
          const st = f.querySelector('.dgm-stage').getBoundingClientRect();
          const c = f.querySelector('.dgm-controls').getBoundingClientRect();
          return { top: c.top - st.top, dots: !!f.querySelector('.dgm-dot'), cap: !!f.querySelector('.dgm-caption:not([hidden])'), n: f.querySelector('.dgm-step-n').textContent };
        });
        check(pos.top < 80 && !pos.dots && !pos.cap, `hovering the tab drops the controls down at the top (${Math.round(pos.top)}px), with a step count (${pos.n}) and no step dots or caption`);
        await fig.screenshot({ path: path.join(args.out, 'player-open.png') });
        const idle = await page.$eval(`${sel} .dgm-banner`, (b) => !b.classList.contains('is-on'));
        check(idle, 'no step card before a use case is played');
        const lvls = await page.$$(`${sel} .dgm-lvl`);
        await lvls[lvls.length - 1].click();
        await page.waitForFunction((s) => !document.querySelector(`${s}.is-stepping`), sel, { timeout: 20000 }).catch(() => {});
        await page.waitForTimeout(900);
        const openGroups = () => page.$$eval(`${sel} [data-kind="group"]`, (x) => x.length);
        const before = await openGroups();
        await page.click(`${sel} .dgm-scn`).catch(() => {});
        await ctl('next');
        await page.waitForTimeout(1500);
        const during = await openGroups();
        const hidden = await page.$$eval(`${sel} .is-faded`, (x) => x.length);
        const tabOn = await page.$eval(`${sel} .dgm-vtab.is-on`, (b) => b.dataset.view).catch(() => null);
        check(hidden === 0 && (tabOn === '*' || !tabs.length), `while a use case runs Show all is on and nothing is faded (${hidden} faded, tab ${tabOn})`);
        await ctl('prev');
        await page.waitForTimeout(1500);
        const after = await openGroups();
        if (during < before) check(true, `a use case closes groups it doesn't use (${before} → ${during} open)`);
        else note(`the first use case uses every open group (${before} open)`);
        check(after === before, `rewinding the use case restores the reader's layout (${after} of ${before} open groups)`);
      }
      // Lock mode: on level 1 with one group opened by hand, a use case plays without opening or
      // closing anything and without moving a component; the packet (or a pulse) still runs.
      if (info.tour && (await page.$(`${sel} [data-act="lock"]`))) {
        const lvls = await page.$$(`${sel} .dgm-lvl`);
        await lvls[Math.min(1, lvls.length - 1)].click();
        await page.waitForFunction((s) => !document.querySelector(`${s}.is-stepping`), sel, { timeout: 20000 }).catch(() => {});
        await page.waitForTimeout(900);
        // Open a closed group the reader can actually click (on the canvas, not under the page's sidebar).
        const closedId = await page.$eval(sel, (f) => {
          for (const n of f.querySelectorAll('.dgm-node.is-collapsible')) {
            const r = n.getBoundingClientRect();
            const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            if (hit && n.contains(hit)) return n.dataset.id;
          }
          return null;
        });
        if (closedId) {
          await page.click(`${sel} .dgm-node[data-id="${closedId}"]`);
          await page.waitForTimeout(1200);
        } else note('lock check: no closed group visible on the canvas to open first');
        const layout = () =>
          page.$eval(sel, (f) => ({
            open: [...f.querySelectorAll('.dgm-group')].map((g) => g.dataset.id).sort().join(','),
            pos: [...f.querySelectorAll('.dgm-node')].map((n) => `${n.dataset.id}@${n.style.transform}`).sort().join('|'),
          }));
        const before = await layout();
        await ctl('lock');
        await page.waitForTimeout(300);
        check(await page.$eval(`${sel} [data-act="lock"]`, (b) => b.getAttribute('aria-pressed') === 'true'), 'the padlock turns lock mode on');
        await page.click(`${sel} .dgm-scn`).catch(() => {});
        await page.waitForTimeout(600);
        const steps = Math.min(4, await stepCount());
        let same = true;
        let moved = false;
        for (let i = 0; i < steps; i++) {
          await ctl('next');
          const ran = await page
            .waitForFunction((s) => document.querySelector(`${s} .dgm-pointer, ${s} .is-pulsing`), sel, { timeout: 6000, polling: 50 })
            .then(() => true, () => false);
          moved ||= ran;
          if (i === 0) await fig.screenshot({ path: path.join(args.out, 'step-locked.png') });
          await page.waitForTimeout(2200);
          const now = await layout();
          same &&= now.open === before.open && now.pos === before.pos;
        }
        check(same, `lock mode keeps the layout through ${steps} step(s) (open groups: ${before.open || 'none'})`);
        check(moved, 'lock mode still moves a packet (or pulses a closed component)');
        for (let i = 0; i <= steps; i++) {
          await ctl('prev');
          await page.waitForTimeout(150);
        }
        await page.waitForTimeout(1200);
        check((await layout()).open === before.open, 'rewinding a locked use case leaves the layout as it was');
        if (!startLocked) {
          await ctl('lock');
          await page.waitForTimeout(600);
        }
      }
      // Use cases: the picker switches scenario, and Next animates a packet along the step.
      if (info.tour) {
        const scn = await page.$$(`${sel} .dgm-scn`);
        if (scn.length > 1) {
          const t0 = await page.$eval(sel, (f) => f._dgm.scn.title);
          await scn[1].click();
          await page.waitForTimeout(1200);
          check((await page.$eval(sel, (f) => f._dgm.scn.title)) !== t0, `use-case picker switches scenario (${scn.length} use cases)`);
        }
        await ctl('next');
        const stepped = await page
          .waitForFunction((s) => document.querySelector(`${s} .dgm-pointer`), sel, { timeout: 8000, polling: 50 })
          .then(() => true, () => false);
        check(stepped, 'Next animates the step (a packet travels its arrow)');
        await fig.screenshot({ path: path.join(args.out, 'step-next.png') });
        check(await page.$eval(`${sel} .dgm-banner`, (b) => b.classList.contains('is-on') && b.textContent.length > 3), 'the action banner shows what the step does');
        check(
          await page.$eval(`${sel} .dgm-banner`, (b) => b.querySelector('.dgm-banner-title').textContent.length > 1 && b.querySelector('.dgm-banner-text').textContent.length > 10),
          'the step card shows the step title and its description',
        );
        // Details: the box swaps the card's short text for the step's `detail` (3 to 10 lines).
        const box = await page.$(`${sel} .dgm-toggle-details:not([hidden]) input`);
        if (box) {
          // The first use case (and step, in its first mode) that has a `detail`.
          const found = await page.$eval(sel, (f) => {
            const d = JSON.parse(f.querySelector('.dgm-data').textContent);
            const scns = d.scenarios || [d.tour];
            for (let i = 0; i < scns.length; i++) {
              const mode = (scns[i].modes || [{ id: 'default' }])[0].id;
              const k = scns[i].steps.filter((x) => !x.when || x.when === mode).findIndex((x) => x.detail);
              if (k >= 0) return { i, k };
            }
            return null;
          });
          const pickers = await page.$$(`${sel} .dgm-scn`);
          if (found && pickers[found.i]) {
            await pickers[found.i].click();
            await page.waitForTimeout(1200);
          }
          const withDetail = found ? found.k : -1;
          if (withDetail >= 0) {
            const wasOn = await box.isChecked();
            const width = () => page.$eval(`${sel} .dgm-banner`, (b) => b.getBoundingClientRect().width);
            await goStep(withDetail);
            await page.waitForTimeout(2500);
            const w0 = await width();
            if (!wasOn) {
              await openPlayer();
              await box.click();
            }
            await page.waitForTimeout(400);
            const card = await page.$eval(`${sel} .dgm-banner`, (b) => {
              const st = b.closest('.dgm-stage').getBoundingClientRect();
              const r = b.getBoundingClientRect();
              return { on: b.classList.contains('is-detailed'), len: b.querySelector('.dgm-banner-text').textContent.length, inside: r.bottom <= st.bottom && r.height < st.height * 0.6, h: r.height, scn: b.querySelector('.dgm-banner-scn').textContent };
            });
            check(card.on && card.len > 60, `Details shows the step's longer description (${card.len} chars)`);
            check(card.inside && (await width()) >= w0, `with Details on, the same card on the canvas grows a little (${Math.round(card.h)}px high)`);
            await fig.screenshot({ path: path.join(args.out, 'step-details.png') });
            await openPlayer();
            await box.click();
            await page.waitForTimeout(300);
            const off = await page.$eval(`${sel} .dgm-banner`, (b) => ({ long: b.classList.contains('is-detailed'), inside: !!b.closest('.dgm-stage') }));
            check(!off.long && off.inside, 'unticking Details goes back to the short text, on the canvas');
            if (wasOn) {
              await openPlayer();
              await box.click();
            }
          } else note('Details box shown, but no use case has a step with `detail` in its first mode');
          // Every step of every use case (each mode): Details must change the card (its `detail`, or its hops).
          const same = await page.$eval(sel, (f) => {
            const d = f._dgm;
            const keep = { scn: d.scn, mode: d.mode, steps: d.steps, details: d.details };
            const out = [];
            for (const sc of d.data.scenarios || [d.data.tour]) {
              for (const m of sc.modes || [{ id: 'default' }]) {
                const steps = sc.steps.filter((x) => !x.when || x.when === m.id);
                steps.forEach((x, i) => {
                  const g = { ...x, groups: [] };
                  for (const ref of [...(x.edges || []), ...(x.path || [])]) {
                    const r = String(ref); const rev = r.startsWith('~'); const id = rev ? r.slice(1) : r; const e = d.edgeById.get(id);
                    if (e) g.groups.push([{ id, rev, e, from: rev ? e.to : e.from, to: rev ? e.from : e.to }]);
                  }
                  const long = d.detailOf(g);
                  if (!long || long.trim() === String(x.text || '').trim()) out.push(`${sc.id || sc.title} #${i + 1}`);
                });
              }
            }
            Object.assign(d, keep);
            return out;
          });
          check(same.length === 0, same.length ? `Details changes nothing on ${same.join(', ')}` : 'Details changes the card on every step');
        } else note('no step has `detail`, so there is no Details box');
        // The last step of the first use case: its outcome is celebrated.
        await page.click(`${sel} .dgm-scn`).catch(() => {});
        await page.waitForTimeout(600);
        await goStep((await stepCount()) - 1);
        const won = await page
          .waitForFunction((s) => document.querySelector(`${s} .dgm-burst`) && /is-(success|done|fail)/.test(document.querySelector(`${s} .dgm-banner`).className), sel, { timeout: 20000, polling: 100 })
          .then(() => true, () => false);
        check(won, 'the last step shows its outcome (banner + celebration)');
        await page.waitForTimeout(250);
        await fig.screenshot({ path: path.join(args.out, 'outcome.png') });
        // The card spans the canvas (no side panel open here) and goes 5 s after the last step.
        const span = await page.$eval(sel, (f) => {
          const st = f.querySelector('.dgm-stage').getBoundingClientRect();
          const b = f.querySelector('.dgm-banner').getBoundingClientRect();
          return { stage: Math.round(st.width), card: Math.round(b.width), panel: f.classList.contains('has-panel') };
        });
        check(span.panel || span.card >= span.stage - 40, `the step card spans the canvas (${span.card} of ${span.stage}px)`);
        await page.waitForTimeout(6500);
        check(await page.$eval(`${sel} .dgm-banner`, (b) => !b.classList.contains('is-on')), 'the step card goes about 5 s after the last step');
        await page.waitForTimeout(2500);
        await ctl('prev');
        await page.waitForTimeout(300);
        await page.click(`${sel} .dgm-scn`).catch(() => {});
        await page.waitForTimeout(800);
        await ctl('play');
        const moved = await page
          // a first step with no packet stays up to 25 s while Details is on (reading time), so wait past that
          .waitForFunction((s) => document.querySelector(`${s} .dgm-pointer`), sel, { timeout: 40000, polling: 100 })
          .then(() => true, () => false);
        check(moved, 'tour plays (a pointer travels an arrow)');
        // Play runs only the selected use case: after its last step it stops on the same use case.
        if (!(await page.$eval(sel, (f) => f._dgm.data.loop === true))) {
          const before = await page.$eval(sel, (f) => f._dgm.scn.id || f._dgm.scn.title);
          await page.$eval(sel, (f) => { const d = f._dgm; d.stop(); d.k = Math.max(-1, d.steps.length - 2); d.play(); });
          const ended = await page
            .waitForFunction((s) => !document.querySelector(s)._dgm.playing, sel, { timeout: 60000, polling: 250 })
            .then(() => true, () => false);
          const after = await page.$eval(sel, (f) => f._dgm.scn.id || f._dgm.scn.title);
          check(ended && after === before, `Play stops after the selected use case's last step (stayed on "${after}")`);
        }
        await page.mouse.move(5, 5);
        await page.waitForTimeout(700);
        check(!(await page.$eval(`${sel} .dgm-player`, (x) => x.classList.contains('is-open'))), 'the player folds away while the use case plays');
        await page.waitForTimeout(600);
        await fig.screenshot({ path: path.join(args.out, 'tour.png') });
        await ctl('play');
        // Collapsing the use-case sidebar and the player gives their room to the canvas; both come back.
        const stageW = () => page.$eval(`${sel} .dgm-stage`, (x) => x.clientWidth);
        const hasNav = await page.$(`${sel} [data-act="side-collapse"]`).then((x) => x && x.isVisible());
        if (hasNav) {
          const w0 = await stageW();
          await page.click(`${sel} [data-act="side-collapse"]`);
          await page.waitForTimeout(200);
          const w1 = await stageW();
          const scnHidden = await page.$$eval(`${sel} .dgm-scn`, (xs) => xs.every((x) => !x.offsetParent));
          check(w1 > w0 + 50 && scnHidden, `folding the sidebar widens the canvas (${w0} → ${w1}px)`);
        }
        const foot = await page.$$eval(`${sel} .dgm-side-foot .dgm-btn`, (xs) => xs.filter((x) => x.offsetParent).length);
        check(foot >= 4, `the folded sidebar keeps the zoom, Fit and fullscreen buttons (${foot})`);
        await fig.screenshot({ path: path.join(args.out, 'collapsed.png') });
        if (hasNav) await page.click(`${sel} [data-act="side-collapse"]`);
      }
    }
    if (v.interact) {
      // Fullscreen: the canvas takes the window's height, not a fixed one; Esc leaves.
      await page.click(`${sel} [data-act="full"]`);
      await page.waitForTimeout(900);
      const vh = page.viewportSize().height;
      const sh = await page.$eval(`${sel} .dgm-stage`, (x) => x.getBoundingClientRect().height);
      check(sh > vh * 0.6, `fullscreen gives the canvas the window's height (${Math.round(sh)} of ${vh}px)`);
      await fig.screenshot({ path: path.join(args.out, 'fullscreen.png') });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(600);
      if (await page.$eval(sel, (x) => x.classList.contains('is-full'))) await page.click(`${sel} [data-act="full"]`);
      await page.waitForTimeout(300);
      check(!(await page.$eval(sel, (x) => x.classList.contains('is-full'))), 'fullscreen closes again');
    }
    check(errors.length === 0, `no script errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
    console.log(`[${v.name}]\n  ` + checks.join('\n  '));
    await page.close();
  }
  await browser.close();
  console.log(`${failed ? 'FAILED' : 'OK'}: screenshots in ${args.out}`);
  process.exit(failed ? 1 : 0);
})();
