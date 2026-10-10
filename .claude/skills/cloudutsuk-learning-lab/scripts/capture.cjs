#!/usr/bin/env node
/*
 * Run a hands-on lab's experiments against the live stack and capture real screenshots.
 *
 *   node capture.cjs --lab <slug> [--only id1,id2] [--repo PATH] [--chrome PATH] [--work DIR]
 *                    [--review DIR] [--skip-actions] [--dry-run] [--prune]
 *
 * Reads _data/labs/<slug>.yml (run from the blog repo root). For each experiment, in order:
 *   1. `before` shots                      (dashboard state before the action)
 *   2. the action, while `during` shots run a timelapse in parallel:
 *        action.run      shell command in the lab repo (e.g. `make exp-ping`)
 *        action.browser  {url, steps[]} performed in a real page (clicks on the lab's own site)
 *   3. wait `wait` seconds                 (scrape interval / batch delay / log tailing)
 *   4. verify                              shell command in the lab repo; non-zero marks the run failed
 *   5. `after` shots
 * Shot URLs use the aliases in capture.urls ("grafana:/d/uid?...") and the tokens ${from} / ${to}
 * (epoch ms: experiment start minus capture.window, and the moment of the shot), so before/after
 * share one time window. A shot may set `selector` (element screenshot, e.g. one Grafana panel),
 * `steps` (clicks before the shot, e.g. open a trace), `viewport` ({width, height} for tall panels),
 * `window` (this shot's own look-back for ${from}, e.g. 4m),
 * `full_page`, `scale` (output width) and, for `during` shots, `timelapse: {seconds, every, fps, reload}`.
 *
 * Output:
 *   assets/img/labs/<slug>/<exp id>-<shot name>.webp   (animated WebP for timelapses, via ffmpeg)
 *   _data/lab_shots/<slug>.json                        {file: {w, h, animated, captured, verify}}
 *   <review>/<exp id>-<shot name>.png                  PNG copies (last frame for timelapses) to look at
 *   <review>/report.json                               what ran, timings, verify results
 * capture.cooldown (or --cooldown N) waits N seconds between experiments so one burst does not show
 * up in the next experiment's "before" shot.
 * Exit code 1 if preflight, an action, a verify or any shot failed.
 *
 * Needs playwright-core + Chromium (run ../../cloudutsuk-flow-anim/scripts/setup.sh once), ffmpeg
 * with libwebp, and python3 with PyYAML (used to read the card).
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, execFileSync } = require('child_process');

const args = {};
process.argv.slice(2).forEach((a, i, all) => {
  if (!a.startsWith('--')) return;
  const next = all[i + 1];
  args[a.slice(2)] = next && !next.startsWith('--') ? next : true;
});
if (!args.lab) {
  console.error('usage: capture.cjs --lab <slug> [--only ids] [--repo PATH] [--chrome PATH] [--review DIR] [--skip-actions] [--dry-run] [--prune]');
  process.exit(2);
}

const ROOT = process.cwd();
const slug = args.lab;
const cardPath = path.join(ROOT, '_data', 'labs', `${slug}.yml`);
if (!fs.existsSync(cardPath)) {
  console.error(`${cardPath} not found (run from the blog repo root)`);
  process.exit(2);
}
const card = JSON.parse(
  execFileSync('python3', ['-c', 'import sys,json,yaml;print(json.dumps(yaml.safe_load(open(sys.argv[1])),default=str))', cardPath]).toString()
);
const cap = card.capture || {};
const urls = cap.urls || card.endpoints || {};
const repo = path.resolve(String(args.repo || (card.repo && card.repo.path) || '.').replace(/^~(?=\/|$)/, os.homedir()));
const only = args.only ? String(args.only).split(',').map((s) => s.trim()) : null;
const experiments = (card.experiments || []).filter((e) => !only || only.includes(e.id));
const outDir = path.join(ROOT, 'assets', 'img', 'labs', slug);
const manifestPath = path.join(ROOT, '_data', 'lab_shots', `${slug}.json`);
const review = path.resolve(String(args.review || path.join(os.tmpdir(), `lab-capture-${slug}`)));
const windowMs = parseDuration(cap.window || '15m');
const settle = Number(cap.settle_ms || 3000);
const cooldown = Number(args.cooldown || cap.cooldown || 0);

function parseDuration(s) {
  const m = String(s).match(/^(\d+)\s*(ms|s|m|h)?$/);
  if (!m) return 15 * 60 * 1000;
  return Number(m[1]) * { ms: 1, s: 1000, m: 60000, h: 3600000 }[m[2] || 's'];
}

function resolveUrl(u, tokens) {
  let out = String(u);
  const m = out.match(/^([a-z][a-z0-9_-]*):(\/.*)?$/i);
  if (m && urls[m[1]]) out = urls[m[1]].replace(/\/$/, '') + (m[2] || '/');
  return out.replace(/\$\{(\w+)\}/g, (_, k) => (k in tokens ? String(tokens[k]) : `\${${k}}`));
}

function sh(cmd, label) {
  return new Promise((resolve) => {
    const started = Date.now();
    console.log(`  $ ${cmd}`);
    const p = spawn('bash', ['-lc', cmd], { cwd: repo, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => {
      const tail = out.trim().split('\n').slice(-8).join('\n');
      if (code !== 0) console.log(`    ${label} exited ${code}\n${tail.replace(/^/gm, '    | ')}`);
      resolve({ cmd, code, ms: Date.now() - started, tail });
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

function ffmpeg(argv) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...argv]);
}

async function runSteps(page, steps, tokens) {
  for (const step of steps || []) {
    const [kind] = Object.keys(step);
    const v = step[kind];
    if (kind === 'click') await page.locator(v).first().click();
    else if (kind === 'click_text') await page.getByText(v, { exact: false }).first().click();
    else if (kind === 'fill') await page.locator(v[0]).first().fill(String(v[1]));
    else if (kind === 'press') await page.keyboard.press(v);
    else if (kind === 'hover') await page.locator(v).first().hover();
    else if (kind === 'scroll') await page.locator(v).first().scrollIntoViewIfNeeded();
    else if (kind === 'wait_for') await page.locator(v).first().waitFor({ timeout: 60000 });
    else if (kind === 'wait_for_text') await page.getByText(v, { exact: false }).first().waitFor({ timeout: 60000 });
    else if (kind === 'wait') await page.waitForTimeout(Number(v));
    else if (kind === 'goto') await load(page, resolveUrl(v, tokens));
    else throw new Error(`unknown step ${kind}`);
  }
}

async function load(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  } catch (e) {
    // Grafana keeps a live websocket open, so networkidle may never fire; the settle wait covers it.
    if (!/Timeout/.test(String(e))) throw e;
  }
}

async function frame(page, shot, file) {
  if (shot.selector) await page.locator(shot.selector).first().screenshot({ path: file });
  else await page.screenshot({ path: file, fullPage: !!shot.full_page });
}

// Output size after scaling to `width` with ffmpeg's `scale=W:-2` (height rounded to even).
function scaled(png, width) {
  const { w, h } = pngSize(png);
  if (!width || width === w) return { w, h };
  return { w: width, h: Math.round((h * width) / w / 2) * 2 };
}

function toWebp(png, webp, shot) {
  const { w } = pngSize(png);
  const width = shot.scale || (w > 1600 ? 1600 : w);
  ffmpeg(['-i', png, ...(width !== w ? ['-vf', `scale=${width}:-2`] : []), '-c:v', 'libwebp', '-quality', '85', webp]);
  return scaled(png, width);
}

async function shoot(ctx, exp, shot, tokens, results, onFirstFrame = () => {}) {
  const name = `${exp.id}-${shot.name}`;
  const webp = path.join(outDir, `${name}.webp`);
  const png = path.join(review, `${name}.png`);
  const page = await ctx.newPage();
  if (shot.viewport) await page.setViewportSize(shot.viewport);
  // A shot may look back further or less far than capture.window: `window: 4m` sets its ${from}.
  if (shot.window) tokens = { ...tokens, from: tokens.start - parseDuration(shot.window) };
  const url = resolveUrl(shot.url, { ...tokens, to: Date.now() });
  const rec = { file: `${name}.webp`, phase: shot.phase || 'after', url, ok: false };
  try {
    await load(page, url);
    await runSteps(page, shot.steps, tokens);
    await page.waitForTimeout(settle);
    if (shot.timelapse) {
      const secs = Number(shot.timelapse.seconds || 60);
      const every = Number(shot.timelapse.every || 5);
      const frames = path.join(review, `${name}-frames`);
      fs.rmSync(frames, { recursive: true, force: true });
      fs.mkdirSync(frames, { recursive: true });
      const n = Math.max(2, Math.floor(secs / every) + 1);
      for (let i = 0; i < n; i++) {
        const t = Date.now();
        if (i > 0 && shot.timelapse.reload) {
          await load(page, resolveUrl(shot.url, { ...tokens, to: Date.now() }));
          await page.waitForTimeout(settle);
        }
        await frame(page, shot, path.join(frames, `f${String(i).padStart(3, '0')}.png`));
        if (i === 0) onFirstFrame();
        if (i < n - 1) await sleep(Math.max(0, every * 1000 - (Date.now() - t)));
      }
      // Hold the last frame so the end state is readable before the loop restarts.
      const last = path.join(frames, `f${String(n - 1).padStart(3, '0')}.png`);
      for (let k = 0; k < 3; k++) fs.copyFileSync(last, path.join(frames, `f${String(n + k).padStart(3, '0')}.png`));
      fs.copyFileSync(last, png);
      const { w } = pngSize(last);
      const width = shot.scale || (w > 1200 ? 1200 : w);
      ffmpeg(['-framerate', String(shot.timelapse.fps || 2), '-i', path.join(frames, 'f%03d.png'),
        '-vf', `scale=${width}:-2`, '-c:v', 'libwebp_anim', '-loop', '0', '-quality', '75', webp]);
      Object.assign(rec, scaled(last, width), { animated: true, frames: n });
    } else {
      await frame(page, shot, png);
      Object.assign(rec, toWebp(png, webp, shot));
    }
    Object.assign(rec, { ok: true, bytes: fs.statSync(webp).size, review_png: png });
    console.log(`  shot ${rec.file} ${rec.w}x${rec.h}${rec.animated ? ` animated (${rec.frames} frames)` : ''} ${Math.round(rec.bytes / 1024)} KB`);
  } catch (e) {
    rec.error = String(e.message || e).split('\n')[0];
    console.log(`  shot ${rec.file} FAILED: ${rec.error}`);
    try {
      await page.screenshot({ path: path.join(review, `${name}.error.png`) });
    } catch (_) {}
  } finally {
    onFirstFrame();
    await page.close();
  }
  results.push(rec);
  return rec;
}

async function main() {
  console.log(`lab ${slug}: ${experiments.length} experiment(s), repo ${repo}, review ${review}`);
  if (args['dry-run']) {
    for (const e of experiments) {
      console.log(`- ${e.id}: run=${(e.action || {}).run || '-'} browser=${!!(e.action || {}).browser} wait=${e.wait || 0}s verify=${e.verify || '-'}`);
      for (const s of e.shots || []) console.log(`    ${s.phase || 'after'} ${e.id}-${s.name}.webp ← ${resolveUrl(s.url, { from: 'FROM', to: 'TO' })}`);
    }
    return 0;
  }
  if (!fs.existsSync(repo)) throw new Error(`lab repo ${repo} not found (set repo.path in the card or pass --repo)`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(review, { recursive: true });
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });

  // Record which lab code produced the screenshots: a dirty or changed tree means the posts may
  // describe different code than the images show.
  let repoRev = 'unknown';
  try {
    const rev = execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD']).toString().trim();
    const dirty = execFileSync('git', ['-C', repo, 'status', '--porcelain']).toString().trim() ? '-dirty' : '';
    repoRev = rev + dirty;
  } catch (_) {}
  if (repoRev.endsWith('-dirty')) console.log(`  note: lab repo has uncommitted changes (${repoRev}); commit before the final capture`);
  const report = { lab: slug, started: new Date().toISOString(), repo, repo_rev: repoRev, experiments: [] };
  let failed = false;
  if (cap.preflight && !args['skip-actions']) {
    const pf = await sh(cap.preflight, 'preflight');
    report.preflight = pf;
    if (pf.code !== 0) {
      fs.writeFileSync(path.join(review, 'report.json'), JSON.stringify(report, null, 2));
      throw new Error('preflight failed: is the lab running? (make up)');
    }
  }

  const work = args.work || process.env.CLOUDUTSUK_FLOW_DIR || path.join(os.homedir(), '.cache/cloudutsuk-flow-anim');
  const { chromium } = require(path.join(work, 'node_modules', 'playwright-core'));
  const chrome = args.chrome || process.env.CHROME;
  const browser = await chromium.launch({ executablePath: chrome || undefined, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({
    viewport: cap.viewport || { width: 1440, height: 900 },
    colorScheme: cap.color_scheme || 'dark',
    deviceScaleFactor: 1,
  });

  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
  try {
    for (const [i, exp] of experiments.entries()) {
      if (i > 0 && cooldown > 0) {
        console.log(`\n  cooldown ${cooldown}s so the previous experiment's signal settles`);
        await sleep(cooldown * 1000);
      }
      console.log(`\n== ${exp.id}: ${exp.title}`);
      const t0 = Date.now();
      const tokens = { from: t0 - windowMs, start: t0 };
      const shots = [];
      const er = { id: exp.id, started: new Date(t0).toISOString(), shots };
      const by = (ph) => (exp.shots || []).filter((s) => (s.phase || 'after') === ph);

      for (const s of by('before')) await shoot(ctx, exp, s, tokens, shots);

      // Timelapses start first; the action waits for each one's first frame so frame 0 is "before".
      const firstFrames = [];
      const during = by('during').map((s) => {
        let ready;
        firstFrames.push(new Promise((r) => (ready = r)));
        return shoot(ctx, exp, s, tokens, shots, ready);
      });
      await Promise.all(firstFrames);
      const action = exp.action || {};
      if (!args['skip-actions']) {
        if (action.run) er.action = await sh(action.run, 'action');
        if (action.browser) {
          const page = await ctx.newPage();
          try {
            await load(page, resolveUrl(action.browser.url || 'site:/', tokens));
            await runSteps(page, action.browser.steps, tokens);
            await page.waitForTimeout(1500);
            er.browser = { ok: true };
          } catch (e) {
            er.browser = { ok: false, error: String(e.message || e).split('\n')[0] };
            console.log(`  browser action FAILED: ${er.browser.error}`);
          } finally {
            await page.close();
          }
        }
      }
      const waitMs = Number(exp.wait || 0) * 1000 - (Date.now() - t0);
      if (waitMs > 0) {
        console.log(`  waiting ${Math.round(waitMs / 1000)}s for signals`);
        await sleep(waitMs);
      }
      await Promise.all(during);
      if (exp.verify && !args['skip-actions']) er.verify = await sh(exp.verify, 'verify');
      for (const s of by('after')) await shoot(ctx, exp, s, tokens, shots);

      const verify = er.verify ? (er.verify.code === 0 ? 'ok' : 'failed') : 'none';
      const bad = (er.action && er.action.code !== 0) || (er.browser && !er.browser.ok) || verify === 'failed' || shots.some((s) => !s.ok);
      if (bad) failed = true;
      er.ok = !bad;
      for (const s of shots.filter((x) => x.ok)) {
        manifest[s.file] = { w: s.w, h: s.h, animated: !!s.animated, captured: new Date().toISOString(), verify, experiment: exp.id, repo_rev: repoRev };
      }
      report.experiments.push(er);
    }
  } finally {
    await browser.close();
  }

  if (args.prune) {
    const keep = new Set((card.experiments || []).flatMap((e) => (e.shots || []).map((s) => `${e.id}-${s.name}.webp`)));
    for (const k of Object.keys(manifest)) if (!keep.has(k)) delete manifest[k];
  }
  const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
  fs.writeFileSync(manifestPath, JSON.stringify(sorted, null, 2) + '\n');
  report.finished = new Date().toISOString();
  fs.writeFileSync(path.join(review, 'report.json'), JSON.stringify(report, null, 2));

  console.log('\nexperiment            result  shots');
  for (const e of report.experiments) {
    console.log(`${e.id.padEnd(21)} ${e.ok ? 'ok    ' : 'FAILED'}  ${e.shots.filter((s) => s.ok).length}/${e.shots.length}`);
  }
  console.log(`\nimages: ${path.relative(ROOT, outDir)}/  manifest: ${path.relative(ROOT, manifestPath)}  review PNGs: ${review}/`);
  return failed ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(`capture failed: ${e.message || e}`);
    process.exit(1);
  }
);
