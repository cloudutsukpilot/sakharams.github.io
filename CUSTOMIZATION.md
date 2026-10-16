# Customizations

Changes this site makes on top of the default
[jekyll-theme-chirpy](https://github.com/cotes2020/jekyll-theme-chirpy) theme (currently 7.6.0, loaded
as a gem). Files with the same path as a theme file replace the theme's copy, so keep them in sync
when upgrading. `test/theme_sync_test.rb` fails if an override is missing any upstream line.

Run `task test-custom` after a build to check everything below.

## Theme file overrides

| File | Upstream file | What's changed |
|---|---|---|
| `_layouts/default.html` | yes | AdSense blocks; trending tags shown above recently updated in the side panel |
| `_includes/refactor-content.html` | yes | Mermaid fullscreen wrapper, button and script appended |
| `_includes/topbar.html` | yes | Post breadcrumb shows the category path |
| `assets/css/jekyll-theme-chirpy.scss` | yes | Wider content limit, table, Mermaid and fullscreen styles; imports `_sass/expedition-map.scss` |

## AdSense

- Partials: `_includes/adsense_center.html` (slot 6737025706),
  `adsense_panel_sidebar_top.html` (5632661749), `adsense_panel_sidebar_center.html` (3945510714),
  `adsense_panel_sidebar_bottom.html` (8587523376). Publisher `ca-pub-3247366555534455`.
- Placement (in `_layouts/default.html`):
  - `#center-bottom` below the main content on home, posts, tab pages and 404. Not on
    categories, tags or archives, whose layouts don't go through the content-refactor branch.
  - `#sidebar-top` between trending tags and recently updated.
  - `#sidebar-center` after recently updated.
  - `#sidebar-bottom` at the end of the panel, after the table of contents on posts.
- `ads.txt` at the site root.

## Mermaid fullscreen viewer

- `_includes/refactor-content.html` wraps each `language-mermaid` block in `.mermaid-wrapper` with a
  `.mermaid-fullscreen-btn`, and adds a script only on pages with diagrams.
- Fullscreen is a fixed-position overlay toggled by a CSS class, not the browser Fullscreen API,
  which is unreliable in embedded browsers. Esc closes it.
- The script also removes duplicate `pre.mermaid` renders.
- The script must contain no `//` or `/* */` comments. `compress_html` puts it on one line, so a
  comment would swallow the rest of the code.
- Styles: `pre.mermaid` scrolls horizontally instead of shrinking; `.is-fullscreen` overlay;
  `body.mermaid-fullscreen-open` stops page scrolling.

## Expedition Map (site map)

Interactive map of every post at `/posts/sitemap/map/` (pinned post) and the `/map/` sidebar tab
(same map, canonical URL points at the post). Each **country** is a main topic, each **state** a
subtopic, sized by post count.

- `_data/expedition_map.yml`: the 9 countries (name, icon, color), `routes` from raw category paths
  to `country` or `country/state` (longest prefix wins), `skip`, and display `names`.
  A post can be placed explicitly with `map: country/state` in its front matter.
- `_plugins/expedition_map.rb`: builds `site.data.expedition_atlas` (country › state › posts, with
  districts from the next category level) at build time. New posts appear automatically; a post whose
  top category has no route lands in "Uncharted Territory" and `test/expedition_map_test.rb` fails.
- `_includes/expedition-map.html`: header stats and search, map stage, travel guide, passport chips,
  and the server-rendered Atlas (works without JavaScript and on screens under 850px, where the
  map is hidden). Hides the post's cover image on the map page.
- `assets/js/expedition-map.js`: draws the Atlas as a Voronoi treemap (d3 + d3-voronoi-treemap from
  jsDelivr) with a seeded layout, cached in `localStorage`. Click a country to zoom, a state to list
  its posts (district filter: chips, or a dropdown above 6). Search filters map and Atlas.
  Deep links `#devops` / `#devops/cicd`; Esc returns to the world view.
- Background: a real world map (Natural Earth projection, `world-atlas` country outlines via
  `topojson-client`, Antarctica omitted) under semi-transparent topic regions. If it fails to load,
  the topic map still works on a plain ocean.
- Fullscreen: button in the map's top-right corner. A fixed overlay (header, map and travel guide)
  plus the browser Fullscreen API when available. Esc zooms out first, then exits. `.xm` must not use
  `container-type`, which would trap the overlay inside the article.
- `_sass/expedition-map.scss`: styles, built on Chirpy's theme variables (light and dark).

## Hands-on labs

Written by the `cloudutsuk-learning-lab` skill (`.claude/skills/cloudutsuk-learning-lab/`).

- `_layouts/tag.html` (also renders project playbook indexes): a tag whose slug has a card in
  `_data/labs/<slug>.yml` renders `_includes/lab-index.html` (parts from `_data/lab_framework.yml`,
  topic deep links, experiment tiles with the first captured screenshot as thumbnail). Projects win if
  both cards exist; the skill refuses that case.
- `_includes/lab-experiment.html`: the experiment card in a post (signals, action, prediction, "Look
  for" table that stacks on phones, before/after/animated screenshots). A screenshot renders only when
  `_data/lab_shots/<slug>.json` lists it; otherwise a dashed "not captured yet" box shows.
- `_includes/lab-nav.html`: Previous / lab index / Next bar (reuses `.project-nav` styles).
- `_sass/lab.scss`: lab accent (`#22d3ee` / `#a3e635`, the `labs` entry in the image skills'
  `brand.json`), signal chips, experiment cards, screenshot grid. Imported after `project-index`.
- Projects tab: `_includes/projects-catalog.html` also lists `_data/labs/*.yml` under the
  `hands-on-labs` category (`_data/project_catalog.yml`), with `projects-catalog-tile.html` showing
  "N of 7 parts · M experiments". Category jump links are now only shown for categories that have
  tiles, so an empty category never leaves a dead `#anchor`.
- Expedition Map: `labs` routes to Homelab & Projects › Hands-on Labs (`_data/expedition_map.yml`).
- **Labs tab** (`_tabs/labs.md`, order 10.5, right after Projects): `_includes/labs-catalog.html` renders one
  section per category in `_data/lab_catalog.yml` (empty ones say "No labs here yet", so their jump links
  never dangle) and one tile per lab card, placed by its `lab_category`, with links to the lab index,
  every written part and every experiment. Styles: `.labs-catalog` / `.lc-*` in `_sass/lab.scss`.

## Layout and styling

- **Post breadcrumb.** Chirpy shows `Home › <post title>` on posts. `_includes/topbar.html` inserts
  the post's `categories:` in between (`Home › devops › build-tools › swift › <title>`), each linked
  to its `/categories/<slug>/` page. Other pages are unchanged.
- **Fluid width.** `$main-content-max-width` is raised from 1250px to 1920px, so content fills wide
  screens instead of staying fixed from 1650px up. `#back-to-top` and the `search` margin are
  recalculated for content narrower than the limit.
- **Tables.** `.table-wrapper` cells use `padding: .4rem 1rem`, 95% font size and wrapping text.

## Configuration (`_config.yml`)

- Post permalinks `/posts/:categories/:title/` (theme default: `/posts/:title/`). The categories list
  sets the URL, so changing a post's categories breaks inbound links.
- `excerpt_separator: "<!-- more -->"`.
- Comments via Giscus (`sakharams/giscus`, category "Announcements").
- Google Analytics `G-T7MV8KTJXC`.
- "Edit this post" link enabled, pointing to `cloudutsukpilot/sakharams.github.io` on `main`.
- Favicons are cached by the service worker (`swcache: true` default for `assets/img/favicons`).
- Extra `exclude` entries for repo tooling (`AGENTS.md`, `CLAUDE.md`, `Taskfile.yml`, `test`,
  `changelog`, `venv`, `hero-preview` and others).
- `CNAME`: `cloudutsuk.com`.

## Data and navigation

- `_data/contact.yml`: sidebar icons for GitHub, X (Twitter), email and RSS.
- `_data/share.yml`: share buttons for Twitter, Facebook, Telegram and LinkedIn (LinkedIn added).
- `_tabs/`: `map` (Expedition Map, first after Home), custom landing tabs `devops`, `cloud`, `devsecops`, `artificialintelligence`,
  `professional-journey`, `projects`, `labs`, in addition to the theme's `about`, `archives`, `categories`
  and `tags`.
- `pages/`: standalone project pages (`asp-journaling`, `asp-modernisation`).

## Content conventions

- GitHub Actions `${{ ... }}` expressions in posts must be inside `{% raw %}` ... `{% endraw %}`,
  otherwise Liquid renders them as empty text. `test/config_test.rb` enforces this.

## Tooling

- `Taskfile.yml`: `test-site` (htmlproofer), `test-custom` (Minitest suite), `start-local` /
  `stop-local`, setup and service tasks.
- `test/`: Minitest suite that checks the built `_site` (`SITE_DIR=` to point elsewhere).
- `.github/workflows/pages-deploy.yml`: Ruby 3.3, htmlproofer, customization tests, SonarQube scan.
- `_plugins/posts-lastmod-hook.rb.disabled`: the starter's last-modified hook, turned off.
