/**
 * Jekyll compatibility layer for the Astro prototype.
 *
 * The blog's posts stay in ../_posts and its data in ../_data. This module gives Astro the same view of
 * them that Jekyll had: `site.data` (every YAML/JSON file under _data, nested by folder), `site.posts`
 * (front matter plus the Jekyll URL `/posts/:categories/:title/`), and a Liquid engine that renders the
 * existing `_includes/*.html` unchanged, with the Jekyll filters those includes use.
 */
import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";
import { Liquid } from "liquidjs";
import { marked } from "marked";

export const REPO_ROOT = path.resolve(process.cwd(), "..");
export const POSTS_DIR = path.join(REPO_ROOT, "_posts");
const DATA_DIR = path.join(REPO_ROOT, "_data");
const INCLUDES_DIR = path.join(REPO_ROOT, "_includes");
// Stand-ins for includes that came from the Chirpy theme gem (datetime.html, embed/youtube.html, ...).
const SHIM_INCLUDES_DIR = path.resolve(process.cwd(), "src/jekyll/includes");
// _config.yml has a comment written without a space (`[giscus]# ...`) that Ruby's YAML accepts but
// js-yaml doesn't; add the space before parsing.
const CONFIG = yaml.load(
  fs.readFileSync(path.join(REPO_ROOT, "_config.yml"), "utf8").replace(/\]#/g, "] #")
) as Record<string, unknown>;

// ---------- front matter and URLs ----------

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function readFrontMatter(file: string): Record<string, any> {
  const m = fs.readFileSync(file, "utf8").match(FM_RE);
  if (!m) return {};
  try {
    return (yaml.load(m[1]) as Record<string, any>) ?? {};
  } catch {
    return {};
  }
}

// Jekyll only publishes files named YYYY-MM-DD-title (so 2024-6-22-x.md is skipped).
export const FILE_RE = /^(\d{4}-\d{2}-\d{2})-(.+)\.(md|markdown)$/;

/** Jekyll's slugify in "default" mode, as used for :title and :categories. */
export function jekyllSlug(s: string, lower = true): string {
  return (lower ? String(s).toLowerCase() : String(s))
    .replace(/[^a-zA-Z0-9._~!$&'()+,;=@]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** jekyll-archives' tag slug ("default" mode): every run of non-alphanumerics becomes one hyphen. */
export function jekyllTagSlug(s: string): string {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function asList(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String);
  return String(v).split(/\s+/).filter(Boolean);
}

/** `/posts/:categories/:title/`, the permalink pattern in _config.yml. */
export function postUrl(file: string, fm: Record<string, any>): string {
  if (typeof fm.permalink === "string") return fm.permalink.replace(/\/?$/, "/");
  const base = path.basename(file);
  const m = base.match(FILE_RE);
  const title = fm.slug ?? (m ? m[2] : base.replace(/\.[^.]+$/, ""));
  // Jekyll lowercases the categories in a URL but keeps the file name's own capitals in :title.
  const cats = asList(fm.categories ?? fm.category).map(c => encodeURIComponent(c.toLowerCase()));
  return `/posts/${[...cats, jekyllSlug(title, false)].join("/")}/`;
}

export function postDate(file: string, fm: Record<string, any>): Date {
  if (fm.date) return new Date(fm.date);
  const m = path.basename(file).match(FILE_RE);
  return m ? new Date(`${m[1]}T00:00:00+05:30`) : new Date(0);
}

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Posts Jekyll publishes: dated file names outside _posts/private (published: false is filtered later). */
export function isPublishedPostFile(file: string): boolean {
  const rel = path.relative(POSTS_DIR, file).split(path.sep);
  return FILE_RE.test(path.basename(file)) && rel[0] !== "private";
}

// ---------- site object ----------

let siteCache: Record<string, any> | undefined;

function loadData(): Record<string, any> {
  const data: Record<string, any> = {};
  for (const file of walk(DATA_DIR)) {
    const ext = path.extname(file);
    if (![".yml", ".yaml", ".json"].includes(ext)) continue;
    const parts = path.relative(DATA_DIR, file).slice(0, -ext.length).split(path.sep);
    let node = data;
    for (const p of parts.slice(0, -1)) node = node[p] ??= {};
    const raw = fs.readFileSync(file, "utf8");
    node[parts[parts.length - 1]] = ext === ".json" ? JSON.parse(raw) : yaml.load(raw);
  }
  return data;
}

export function getSite(): Record<string, any> {
  if (siteCache) return siteCache;
  const posts = walk(POSTS_DIR)
    .filter(isPublishedPostFile)
    .map(file => {
      const fm = readFrontMatter(file);
      const post: Record<string, any> = { ...fm, path: file, url: postUrl(file, fm), date: postDate(file, fm), categories: asList(fm.categories), tags: asList(fm.tags) };
      return post;
    })
    .filter(p => p.published !== false)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  siteCache = { ...CONFIG, data: loadData(), posts, baseurl: "" };
  return siteCache;
}

// ---------- Liquid ----------

const engine = new Liquid({
  root: [INCLUDES_DIR, SHIM_INCLUDES_DIR],
  extname: "",
  jekyllInclude: true,
  dynamicPartials: false,
  strictFilters: false,
  strictVariables: false,
  cache: true,
});

const rel = (u: unknown) => {
  const s = String(u ?? "");
  return /^[a-z]+:\/\//i.test(s) || s.startsWith("#") ? s : `/${s.replace(/^\/+/, "")}`;
};

engine.registerFilter("relative_url", rel);
engine.registerFilter("absolute_url", (u: unknown) => `${String(CONFIG.url ?? "")}${rel(u)}`);
engine.registerFilter("jsonify", (v: unknown) => JSON.stringify(v ?? null));
engine.registerFilter("markdownify", (v: unknown) => marked.parse(String(v ?? ""), { async: false }) as string);
engine.registerFilter("slugify", (v: unknown) => jekyllSlug(String(v ?? "")));
engine.registerFilter("push", (arr: unknown, v: unknown) => [...(Array.isArray(arr) ? arr : []), v]);
engine.registerFilter("number_of_words", (v: unknown) => String(v ?? "").split(/\s+/).filter(Boolean).length);

/** Render one `_includes/<name>` with Jekyll's `include.*` params and the current `page`. */
export async function renderInclude(
  name: string,
  params: Record<string, unknown>,
  page: Record<string, any>,
  scope: Record<string, unknown> = {}
): Promise<string> {
  const site = getSite();
  const file = [INCLUDES_DIR, SHIM_INCLUDES_DIR].map(d => path.join(d, name)).find(f => fs.existsSync(f));
  if (!file) return `<!-- include ${name} has no Astro counterpart in the prototype -->`;
  const tpl = engine.parse(fs.readFileSync(file, "utf8"), file);
  return engine.render(tpl, { ...scope, site, page, include: params });
}

/** Render a Jekyll page (e.g. _tabs/about.md): Liquid first, then Markdown, as Jekyll does. */
export async function renderJekyllPage(relPath: string): Promise<{ data: Record<string, any>; html: string }> {
  const file = path.join(REPO_ROOT, relPath);
  const src = fs.readFileSync(file, "utf8");
  const m = src.match(FM_RE);
  const data = m ? ((yaml.load(m[1]) as Record<string, any>) ?? {}) : {};
  const body = m ? src.slice(m[0].length) : src;
  const liquid = await engine.parseAndRender(body, { site: getSite(), page: data });
  return { data, html: marked.parse(liquid, { async: false }) as string };
}
