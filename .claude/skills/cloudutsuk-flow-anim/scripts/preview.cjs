#!/usr/bin/env node
/*
 * Screenshot a flow animation on the built site, the way a reader's Chrome sees it.
 * Real CDNs (Font Awesome, Bootstrap, fonts) are loaded; only ads/analytics are blocked, because a
 * stripped page hides CSS clashes (the `.fa` class collision was missed exactly that way).
 *
 *   node preview.cjs --url http://localhost:4123/posts/... --id <folders/name> --out <dir> \
 *        [--chrome PATH] [--work DIR]
 *
 * For dark desktop, light desktop and light phone it checks the figure is ready, full width, not
 * restyled by a theme/icon class, has every node drawn and logs no script errors. It saves
 * <view>-mid.png (pointer in flight), <view>-end.png (last step) and, when the data has two modes,
 * <view>-end-<mode2>.png. Exit code 1 if any check fails.
 */
const path = require('path');
const fs = require('fs');

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), [])
);
const work = args.work || process.env.CLOUDUTSUK_FLOW_DIR || path.join(process.env.HOME, '.cache/cloudutsuk-flow-anim');
const { chromium } = require(path.join(work, 'node_modules', 'playwright-core'));
if (!args.url || !args.id || !args.out) {
  console.error('usage: preview.cjs --url URL --id ID --out DIR [--chrome PATH]');
  process.exit(2);
}
fs.mkdirSync(args.out, { recursive: true });

const VIEWS = [
  { name: 'dark-desktop', scheme: 'dark', width: 1200 },
  { name: 'light-desktop', scheme: 'light', width: 1200 },
  { name: 'light-phone', scheme: 'light', width: 390 }
];
const BLOCK = /googlesyndication|googletagmanager|google-analytics|doubleclick|giscus|adservice/;

(async () => {
  const browser = await chromium.launch({ executablePath: args.chrome || process.env.CHROME });
  let failed = false;
  for (const v of VIEWS) {
    const page = await browser.newPage({ viewport: { width: v.width, height: 900 }, colorScheme: v.scheme });
    await page.route((u) => BLOCK.test(u.href), (r) => r.abort());
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(args.url, { waitUntil: 'load', timeout: 60000 }).catch(() => page.waitForLoadState('domcontentloaded'));
    // Chirpy follows the OS scheme unless a mode is stored; force it so both themes are covered.
    await page.evaluate((s) => document.documentElement.setAttribute('data-mode', s), v.scheme);

    const sel = `#flw-${args.id.replace(/\//g, '--')}`;
    // Markup in a caption (e.g. "<name>") can make kramdown swallow the rest of the post as raw HTML;
    // the symptom is literal kramdown syntax such as "{: #id }" or "## " showing up as text.
    const leaked = await page.evaluate(() => {
      const t = (document.querySelector('article') || document.body).innerText;
      return (t.match(/\{: #[\w-]+ \}|^#{2,4} \S/m) || [''])[0];
    });
    const fig = await page.$(sel);
    const checks = [];
    const check = (ok, msg) => {
      checks.push(`${ok ? 'ok  ' : 'FAIL'} ${msg}`);
      if (!ok) failed = true;
    };
    if (!fig) {
      check(false, `figure ${sel} not found (wrong id, or the include is missing from the post)`);
    } else {
      await fig.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      const info = await page.evaluate((s) => {
        const f = document.querySelector(s);
        const cs = getComputedStyle(f);
        const data = JSON.parse(f.querySelector('.flw-data').textContent);
        return {
          ready: f.classList.contains('is-ready'),
          width: f.getBoundingClientRect().width,
          parent: f.parentElement.getBoundingClientRect().width,
          display: cs.display,
          font: cs.fontFamily,
          transform: cs.textTransform,
          drawn: f.querySelectorAll('.flw-node').length,
          expected: data.nodes.length,
          modes: (data.modes || []).map((m) => m.id),
          clipped: f.querySelector('.flw-scroll').scrollWidth - f.querySelector('.flw-scroll').clientWidth
        };
      }, sel);
      check(info.ready, 'player initialised (is-ready)');
      check(info.width >= info.parent * 0.95, `figure is full width (${Math.round(info.width)} of ${Math.round(info.parent)}px)`);
      check(info.display === 'block' && !/awesome/i.test(info.font) && info.transform === 'none',
        `no foreign styling (display ${info.display}, font ${info.font.split(',')[0]}, text-transform ${info.transform})`);
      if (v.width >= 1000) check(info.clipped <= 1, `diagram fits the desktop column without sideways scrolling (${info.clipped}px over)`);
      check(info.drawn === info.expected, `all ${info.expected} nodes drawn (${info.drawn})`);

      const inFlight = await page
        .waitForFunction((s) => [...document.querySelectorAll(`${s} .flw-pointer`)].some((p) => p.style.display !== 'none'), sel, { timeout: 20000, polling: 50 })
        .then(() => true, () => false);
      check(inFlight, 'pointer animates (autoplay)');
      await page.waitForTimeout(350);
      await fig.screenshot({ path: path.join(args.out, `${v.name}-mid.png`) });

      await page.click(`${sel} .flw-dot:last-child`);
      await page.waitForTimeout(500);
      await fig.screenshot({ path: path.join(args.out, `${v.name}-end.png`) });

      if (info.modes.length > 1) {
        await page.check(`${sel} [data-act="mode"]`);
        await page.click(`${sel} .flw-dot:last-child`);
        await page.waitForTimeout(500);
        await fig.screenshot({ path: path.join(args.out, `${v.name}-end-${info.modes[1]}.png`) });
      }
    }
    check(!leaked, `post body renders as HTML${leaked ? ` (raw markdown leaked: ${JSON.stringify(leaked)})` : ''}`);
    check(errors.length === 0, `no script errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
    console.log(`[${v.name}]\n  ` + checks.join('\n  '));
    await page.close();
  }
  await browser.close();
  console.log(`${failed ? 'FAILED' : 'OK'}: screenshots in ${args.out}`);
  process.exit(failed ? 1 : 0);
})();
