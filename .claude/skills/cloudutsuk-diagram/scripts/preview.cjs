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
 * the start level, and (if the diagram has one) the tour. Screenshots: <view>-level<N>.png, card.png,
 * panel.png, edge-panel.png, expanded.png, tour.png. Exit code 1 if any check fails.
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
const BLOCK = /googlesyndication|googletagmanager|google-analytics|doubleclick|giscus|adservice/;

(async () => {
  const browser = await chromium.launch({ executablePath: args.chrome || process.env.CHROME });
  let failed = false;
  for (const v of VIEWS) {
    const page = await browser.newPage({ viewport: { width: v.width, height: v.width < 600 ? 820 : 1000 }, colorScheme: v.scheme });
    await page.route((u) => BLOCK.test(u.href), (r) => r.abort());
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
    await page.goto(stale.href, { waitUntil: 'load', timeout: 60000 }).catch(() => page.waitForLoadState('domcontentloaded'));
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
      const tabsBox = await page.$(`${sel} .dgm-views`).then((t) => (t ? t.boundingBox() : null));
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
        await coll.click();
        await page.waitForTimeout(1600);
        const after = await page.$$eval(`${sel} .dgm-group`, (x) => x.length);
        check(after > before, `click expands a component (groups ${before} → ${after})`);
        await fig.screenshot({ path: path.join(args.out, 'expanded.png') });
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
      // Zoom.
      const t0 = await page.$eval(`${sel} .dgm-view`, (g) => g.getAttribute('transform'));
      await page.click(`${sel} [data-act="zoom-in"]`);
      await page.waitForTimeout(300);
      check((await page.$eval(`${sel} .dgm-view`, (g) => g.getAttribute('transform'))) !== t0, 'zoom button changes the view');
      // Use cases close the open groups they don't use, and put the reader's layout back afterwards.
      if (info.tour) {
        const lvls = await page.$$(`${sel} .dgm-lvl`);
        await lvls[lvls.length - 1].click();
        await page.waitForFunction((s) => !document.querySelector(`${s}.is-stepping`), sel, { timeout: 20000 }).catch(() => {});
        await page.waitForTimeout(900);
        const openGroups = () => page.$$eval(`${sel} [data-kind="group"]`, (x) => x.length);
        const before = await openGroups();
        await page.click(`${sel} .dgm-scn`).catch(() => {});
        await page.click(`${sel} [data-act="next"]`);
        await page.waitForTimeout(1500);
        const during = await openGroups();
        const hidden = await page.$$eval(`${sel} .is-faded`, (x) => x.length);
        const tabOn = await page.$eval(`${sel} .dgm-vtab.is-on`, (b) => b.dataset.view).catch(() => null);
        check(hidden === 0 && (tabOn === '*' || !tabs.length), `while a use case runs Show all is on and nothing is faded (${hidden} faded, tab ${tabOn})`);
        await page.click(`${sel} [data-act="prev"]`);
        await page.waitForTimeout(1500);
        const after = await openGroups();
        if (during < before) check(true, `a use case closes groups it doesn't use (${before} → ${during} open)`);
        else note(`the first use case uses every open group (${before} open)`);
        check(after === before, `rewinding the use case restores the reader's layout (${after} of ${before} open groups)`);
      }
      // Use cases: the picker switches scenario, and Next animates a packet along the step.
      if (info.tour) {
        const scn = await page.$$(`${sel} .dgm-scn`);
        if (scn.length > 1) {
          const t0 = await page.$eval(`${sel} .dgm-step-title`, (x) => x.textContent);
          await scn[1].click();
          await page.waitForTimeout(1200);
          check((await page.$eval(`${sel} .dgm-step-title`, (x) => x.textContent)) !== t0, `use-case picker switches scenario (${scn.length} use cases)`);
        }
        await page.click(`${sel} [data-act="next"]`);
        const stepped = await page
          .waitForFunction((s) => document.querySelector(`${s} .dgm-pointer`), sel, { timeout: 8000, polling: 50 })
          .then(() => true, () => false);
        check(stepped, 'Next animates the step (a packet travels its arrow)');
        await fig.screenshot({ path: path.join(args.out, 'step-next.png') });
        check(await page.$eval(`${sel} .dgm-banner`, (b) => b.classList.contains('is-on') && b.textContent.length > 3), 'the action banner shows what the step does');
        // The last step of the first use case: its outcome is celebrated.
        await page.click(`${sel} .dgm-scn`).catch(() => {});
        await page.waitForTimeout(600);
        await page.click(`${sel} .dgm-dot:last-child`);
        const won = await page
          .waitForFunction((s) => document.querySelector(`${s} .dgm-burst`) && /is-(success|done|fail)/.test(document.querySelector(`${s} .dgm-banner`).className), sel, { timeout: 20000, polling: 100 })
          .then(() => true, () => false);
        check(won, 'the last step shows its outcome (banner + celebration)');
        await page.waitForTimeout(250);
        await fig.screenshot({ path: path.join(args.out, 'outcome.png') });
        await page.waitForTimeout(2500);
        await page.click(`${sel} [data-act="prev"]`);
        await page.waitForTimeout(300);
        await page.click(`${sel} .dgm-scn`).catch(() => {});
        await page.waitForTimeout(800);
        await page.click(`${sel} [data-act="play"]`);
        const moved = await page
          .waitForFunction((s) => document.querySelector(`${s} .dgm-pointer`), sel, { timeout: 15000, polling: 100 })
          .then(() => true, () => false);
        check(moved, 'tour plays (a pointer travels an arrow)');
        await page.waitForTimeout(600);
        await fig.screenshot({ path: path.join(args.out, 'tour.png') });
        await page.click(`${sel} [data-act="play"]`);
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
