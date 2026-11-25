# Cloudutsuk on Astro (prototype)

A prototype of cloudutsuk.com on [Astro](https://astro.build) with a new design. It starts from the
[AstroPaper](https://github.com/satnaing/astro-paper) theme (MIT, see `LICENSE`). It reads the blog's existing
files in place, so **no post is copied or converted**:

| Jekyll | How the prototype uses it |
|---|---|
| `_posts/**` | Astro content collection (`src/content.config.ts`), with the same URLs: `/posts/:categories/:title/`, `permalink:` overrides, Jekyll's date-from-file-name and untitled-post rules |
| `_includes/*.html` | Rendered unchanged with [LiquidJS](https://liquidjs.com) (`src/jekyll/site.ts`): flow animations, explorable diagrams, project and lab navigation, cloud tabs, lab experiments, interview tiles |
| `_data/**` | Loaded as `site.data` for those includes and for the home page |
| `_sass/*.scss` | Compiled as they are (`src/styles/jekyll-widgets.scss`); Chirpy's CSS variables are mapped to the new palette in `src/styles/theme.css` |
| `assets/` | Served at `/assets/` (symlink in `public/`) |
| `_tabs/about.md` | Rendered as the About page |
| Chirpy prompts, `{% raw %}`, kramdown `{: …}` | Handled by a remark plugin (`src/jekyll/remark-jekyll.ts`) |

Theme-gem includes that the posts use (`datetime.html`, `embed/youtube.html`, …) have small stand-ins in
`src/jekyll/includes/`.

## Run it

Needs Node 22.

```bash
cd astro
npm install
npm run dev                        # http://localhost:4321, the 21 sample posts in src/prototype-posts.json
npm run build && npm run preview   # production build with the search index
ALL_POSTS=1 npm run build          # every published post (about 1,850 pages)
```

## Checked so far

- `ALL_POSTS=1` builds every published post (1,075 post pages) and the tag pages, about 1,850 pages in under a minute
  and a half on the session machine.
- Every post URL and tag URL (522 tags) matches the Jekyll build exactly.
- `astro check` passes with 0 errors.

## Not done yet (what a full migration would add)

- Tabs and landing pages besides About: Cloud, DevOps, DevSecOps, AI, Domains, Labs, Projects, Map,
  Professional Journey and the interview index. They are Liquid pages, rendered the same way as About.
- Comments (Giscus), Google Analytics and AdSense.
- The `expedition_map` and `interview_index` Ruby plugins, rewritten in TypeScript.
- The repo's Claude skills and the GitHub Pages workflow, which still target Jekyll.
- Over time, native Astro components in place of the Liquid bridge where that helps.
