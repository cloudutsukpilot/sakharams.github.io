---
name: cloudutsuk-project
description: >-
  Create a project playbook on the Cloudutsuk blog (this Jekyll repo): from a project name and a
  short brief, add a new tag for the project, write one post per area of the 18-area project
  framework in _data/project_framework.yml (vision, requirements, planning, UX, architecture,
  security, data, dev prep, implementation, QA, infrastructure, CI/CD, go-live, operations, docs,
  support, governance, continuous improvement), each with a `##` section per topic, written in
  a human, first-person voice and specific to the project, with visible TODO callouts wherever the
  brief doesn't give the facts. Also writes an Interview Questions post: a generic question bank
  (design, frontend, backend, database, frontend-backend-database communication, security, deployment,
  monitoring and more) answered in first person from architect, developer, DevOps and SRE
  perspectives (role tabs per question, grounded in the project's source code when available), shown
  as an Interview Prep tile on the index. Clicking the project's tag opens /tags/<project>/, which shows the
  project index (areas grouped by phase, deep links to every topic, the interview tile); the project
  is also listed on the Projects tab. Also adds Level 1 hero images. Use this skill when the user asks to create,
  start, scaffold or document a "project", "project playbook", "project plan posts", "project
  blogs/series" or "project tag with an index page", to fill in or extend an existing playbook, to
  add or update a project's "interview questions" / "interview prep" post or its developer, DevOps or
  SRE answers, or names this skill. For a single standalone post use /create-blog instead.
---

# Cloudutsuk project playbook

A project playbook is **a tag plus 18 area posts, one interview post and one data file**:

| Piece | Where | Made by |
|---|---|---|
| Framework (18 areas, their topics, phases, icons) | [_data/project_framework.yml](../../../_data/project_framework.yml) | Fixed; shared by all projects |
| Project card (name, tag, summary, status, facts, brief) | `_data/projects/<slug>.yml` | `scaffold.py`, then you fill it in |
| One post per area | `_posts/projects/<slug>/<date>-<NN>-<area slug>.md` | `scaffold.py` skeleton, then you write it |
| Interview question bank (categories, questions, the roles each is answered for) | `interview:` in [_data/project_framework.yml](../../../_data/project_framework.yml) | Fixed; shared by all projects |
| Role tabs and "Answer as" filter | [_includes/project-iq-roles.html](../../../_includes/project-iq-roles.html) | Included once in the interview post |
| Interview post | `_posts/projects/<slug>/<date>-interview-questions.md` | `scaffold.py` skeleton, then you answer it (step 5) |
| Interview Prep tile on the index | [_includes/project-index.html](../../../_includes/project-index.html) | Automatic when the post exists (`project_interview: true`) |
| Project index on `/tags/<slug>/` | [_layouts/tag.html](../../../_layouts/tag.html) → [_includes/project-index.html](../../../_includes/project-index.html) | Automatic when the data file exists |
| Prev / index / next bar in each post | [_includes/project-nav.html](../../../_includes/project-nav.html) | Automatic (the scaffold adds the include) |
| Diagram types (system architecture, network, data flow, sequence, identity, threat model, data model, deployment, CI/CD, telemetry, incident, user journey) | `diagrams:` in [_data/project_framework.yml](../../../_data/project_framework.yml) | Fixed; shared by all projects |
| Diagrams lane on the index (one tile per type, "Not drawn yet" until the project has one, plus "More diagrams" for `type: other`) | `diagrams:` list in `_data/projects/<slug>.yml`, rendered by [_includes/project-index.html](../../../_includes/project-index.html) | `scripts/diagrams.py <slug> --write` after every new or moved diagram |
| Architecture decision records (optional): ADR post, log table, Architecture Decisions tile | ADRs as MADR files in the project's own repo; `_data/project_adrs/<slug>.yml`, `<date>-architecture-decision-records.md` (`project_adrs: true`), [_includes/project-adr-log.html](../../../_includes/project-adr-log.html) | `scripts/sync_adrs.py <slug>` (see [ADRs](#adrs-optional)) |
| Projects tab entry | [_tabs/projects.md](../../../_tabs/projects.md) loops over `_data/projects/` | Automatic |
| Styles | [_sass/project-index.scss](../../../_sass/project-index.scss) | Shared; don't edit for one project |

`<slug>` is the project tag run through Jekyll's `slugify` (`Acme Shop` → `acme-shop`). The tag page
looks for `_data/projects/<tag | slugify>.yml`, so the tag on the posts, the data file name and the
post folder must all agree. The scaffold guarantees that; don't rename one by hand.

`S=.claude/skills/cloudutsuk-project/scripts`. Run everything from the repo root.

## 1. Gather the inputs

You need:

- **Project name.** It becomes the display name and, by default, the tag (`--tag` to differ, for
  example name "Acme Shop Replatform", tag "Acme Shop"). No `, [ ] : # { }` in the tag.
- **A brief.** What the project is, who it's for, the problem, the stack/cloud, team, timeline,
  constraints (compliance, budget, deadlines), and the stage it's at (idea, in progress, live).
  The brief is the only source of project facts, so a thin brief means more TODOs.
- **Status** for the card: `Planning`, `In progress`, `Live` or `Retired`.
- Optionally, **personal experience** to weave in, and **which areas** to write now (default: all 18
  plus the interview post; `interview` is a valid `--areas` value).

If the user gave only a name, ask for the rest in **one** AskUserQuestion call: the brief (they
type it via Other), status, and "any personal experience to include?" (options "No, keep it to the
brief" / "Yes, I'll describe it"). Then check for collisions:

```bash
ls _data/projects/ _posts/projects/ 2>/dev/null
grep -rl "tags:.*<Tag>" _posts | head      # tag already used by unrelated posts?
```

If `_data/projects/<slug>.yml` exists, this is an **update** of an existing playbook: read the card
and the existing posts, and only scaffold missing areas (the scaffold skips existing files). If the
tag is already used by unrelated posts, those will show under "Other posts tagged …" on the index;
tell the user and suggest a more specific tag.

Confirm the plan in one line before writing: tag, slug, folder, index URL, number of posts.

## 2. Scaffold

```bash
python3 $S/scaffold.py --name "<Name>" [--tag "<Tag>"] --summary "<1-2 sentences>" \
  --status "<Status>" [--areas 1,2,5,interview]
```

For an existing project that only needs the interview post: `--name "<Name>" --areas interview`.

This writes the data file and one skeleton post per area. Each skeleton already has the correct front
matter (`categories: [projects, <slug>]`, `tags: [Projects, <Tag>, …]`, `project`, `project_step`, a
date of today at `00:NN` IST so the areas sort in order), the `<!-- more -->` separator, the nav
include at the top and bottom, and **one `## <Topic>` heading per topic followed by
`{: #<topic-slug> }`**. The index deep-links to those anchors, and htmlproofer fails the deploy on a
dead anchor, so **never rename, reorder away or delete a topic heading or its anchor line.** Every
body is a `<!-- SCAFFOLD: … -->` marker for you to replace.

## 3. Fill in the project card

Edit `_data/projects/<slug>.yml`: a crisp `summary`; 3–6 `facts` (label/value chips shown on the index,
for example Type, Stack, Hosting, Delivery, Timeline); and `brief`, the user's brief **verbatim** (it's not
rendered; it's the record the posts are written from). Leave a fact out rather than writing TODO in it.

- **Set `category` and `clouds`** (top-level keys, not facts) so the project lands in the right tile group
  on the Projects tab: `category` is one of the ids in
  [_data/project_catalog.yml](../../../_data/project_catalog.yml) (`platform-engineering`, `ai-automation`,
  `devops-kubernetes`, `solution-architecture`), and `clouds` lists `azure`, `aws`, `gcp` or `agnostic`.
  A project without a known category still shows, under "More projects".
- **Never add a `Team` fact.** Team size and who built it belong in the posts (where the brief gives
  them), not on the card. `check.py` fails on it.
- **Always keep the `Architecture` fact** the scaffold adds (when area 5 is scaffolded). A fact with a
  `url` renders as a link chip, so it sits next to Type, Stack and Hosting and jumps to the diagram:

  ```yaml
  - label: Architecture
    value: System diagram
    url: /posts/projects/<slug>/05-technical-architecture/#system-context-and-component-architecture
  ```

  Point it at the anchor of the section that holds the system diagram (the default above). `url` must
  be a page in this project; htmlproofer fails the deploy on a dead link or anchor.

## 4. Write the posts

Read [references/voice.md](references/voice.md) first. Then, for each post in area order:

1. Replace the intro marker with 2–4 sentences: a hook specific to this project and area.
2. Replace each topic marker with that topic **applied to this project**: the decision or
   recommendation, the reasoning, and something concrete (a table, a short checklist, a config or
   command snippet, a diagram, an example user story, an ADR stub). Aim for roughly 120–300 words
   per topic. If a topic barely applies, say why in a few sentences.

   **Diagrams: animated wherever feasible.** Anything that *flows* (system context and data flow,
   request paths, pipelines, CI/CD and release flow, deployment and rollback, incident response,
   support escalation, reconcile or feedback loops) is an animated diagram made with the
   [cloudutsuk-flow-anim](../cloudutsuk-flow-anim/SKILL.md) skill: data in
   `_data/flow_anims/projects/<slug>/<name>.yml`, embedded with
   `{% include flow-anim.html id="projects/<slug>/<name>" %}`. Follow that skill's workflow
   (validate, browser check) and use the Projects palette (`#F472B6` / `#FACC15`). Area 5's system
   context section always gets one (`system-architecture`); the card's Architecture link points to it.
   **Keep the Diagrams lane current.** After adding or moving any animated diagram, run
   `python3 $S/diagrams.py <slug> --write`. It lists every embedded diagram in the card's `diagrams:`
   with its section anchor, title and a guessed `type`. Check the types it guessed, because anything
   that fits no type becomes `other`, which shows under "More diagrams". Mermaid diagrams and images
   are added to `diagrams:` by hand, without `diagram:`, and the script keeps them. Aim to cover the
   types that matter for the project, at least `system-context`, `network`, `data-flow` and `cicd`,
   and treat the lane's "Not drawn yet" tiles as a to-do list.
   Use Mermaid (`mermaid: true` in front matter) only where animation adds nothing: static
   structures such as ER/data models, class or state charts, Gantt timelines and org/ownership trees,
   or a flow too large for the animation format (more than ~14 nodes or 12 steps).
3. Wherever a fact is missing from the brief, write a visible TODO callout that asks the precise
   question (format in voice.md). Never fill the gap with a made-up number, name or date.
4. Replace the checklist marker with 5–10 `- [ ]` items specific to the project.
5. Refine `description:` in front matter to one specific sentence (~150 chars) for this project.
6. Link related posts of the same project by their URL and anchor, for example
   `/posts/projects/<slug>/05-technical-architecture/#identity-and-access-architecture`, and existing
   blog posts that go deeper on a tool (check the target exists).

Keep decisions consistent across posts: once area 5 picks the hosting model, areas 11–14 use it. Keep
a short running list of decisions and open TODOs as you go, and reuse it.

Write the posts one after another in this session. After every few posts, run the checker so
mistakes don't compound:

```bash
python3 $S/check.py <slug> --allow-scaffold     # while writing
```

## 5. Write the interview post

Write it **after** the area posts (or, for an existing playbook, after reading all 18), because every
answer is drawn from them. The audience is the author preparing for interviews for architect,
developer, DevOps and SRE roles: answers are what they'd *say*, in first person, about this project.

Each bank question lists the **roles** it's answered for (`q` plus `roles`, architect always first). The
skeleton has one `## <Category>` + `{: #<anchor> }` per category, the role include after the nav, and one
block per question with one role div per listed role:

```markdown
<details class="project-iq" markdown="1" id="<category-anchor>-q<N>">
<summary>The bank's question, verbatim</summary>

<div class="iq-role" data-role="architect" markdown="1">

Architect answer…

</div>

<div class="iq-role" data-role="developer" markdown="1">

Developer answer…

</div>

</details>
```

**Read [references/roles.md](references/roles.md) before writing role answers.** In short: the architect
answer is the decision and the trade-off; developer, DevOps and SRE answers each give a **concept
checklist tied to this project's code** (for React: SPA, components, JSX, router, props, state, effects
and lifecycle, hooks, context, virtual DOM, `key`, events, forms, conditional rendering), a short real
snippet, the **common commands**, and one honest gap. If the project's source repo is available (ask
for the path), read it read-only first and prefer what the code does over what the docs say; when they
disagree, fix the architect answer too and tell the user. Redact identifiers as the playbook does.

**Never reword a `<summary>`, or rename or remove a category heading or anchor.** The bank is generic
on purpose so every project answers the same questions, and check.py and the index tile match them
exactly. You may add up to two project-specific questions per category after the bank's questions
(same block shape, next `qN`, with an architect div at least).

1. Replace the intro marker with a short hook, then a one-line pitch of the project in italics (the
   sentence the author would open an interview with).
2. Answer each question in 120–250 words: the direct answer first, then the reasoning and the trade-off
   an architect would name, then something concrete (a table, a request trace, a command or snippet).
   End with `Deeper:` links to the playbook sections that back it up
   (`/posts/projects/<slug>/<NN>-<area slug>/#<topic anchor>`).
3. **Reframe, never skip.** If a category doesn't literally apply (no database, no frontend, a CLI
   instead of a UI), answer through the project's equivalent and say so: "there's no database; the
   store is dated JSON on a file share, and here's why", "the user interface here is a CLI and YAML".
   Then say how you'd design it if the interviewer insists on the classic case. Interviewers reward the
   reasoning more than the textbook answer.
4. Answers must stay true to the brief and the playbook: no new numbers, dates or outcomes. Where an
   interviewer would expect a fact the playbook marks TODO (KPI baselines, SLO agreement, team size),
   put a TODO callout inside the answer that asks for it. Name known gaps and debt honestly; owning
   them is a strong interview answer.
5. Keep the voice rules from [references/voice.md](references/voice.md). Don't embed a
   `flow-anim.html` inside `<details>` (it lays out while hidden); link to the area post's diagram
   instead. Mermaid, tables, code blocks and callouts work inside `<details markdown="1">`.

```bash
python3 $S/check.py <slug> --areas interview --allow-scaffold   # while writing
```

## 6. Hero images

Use the batch image skill on the project folder (Level 1, free, offline); follow
[../cloudutsuk-image-batch/SKILL.md](../cloudutsuk-image-batch/SKILL.md) (preview a few, then run):

```bash
python3 .claude/skills/cloudutsuk-image-batch/find_targets.py _posts/projects/<slug> --limit 3 --run --preview-dir <scratchpad>/heroes
python3 .claude/skills/cloudutsuk-image-batch/find_targets.py _posts/projects/<slug> --run --jobs 8
```

The batch picks up the interview post too. For it alone:
`python3 .claude/skills/cloudutsuk-image-common/hero.py <post> --tags "Interview Prep,Architecture" --motif blueprint --write`.

If the title is too long on the card, pass a shorter `--title` for that post with
`.claude/skills/cloudutsuk-image-common/hero.py <post> --title "…" --write`.

## 7. Verify

```bash
python3 $S/check.py <slug>                       # must end with 0 error(s)
rm -rf _site .jekyll-cache && JEKYLL_ENV=production bundle exec jekyll b -d _site
task test-site                                   # htmlproofer, same as CI
```

- Fix every check.py error. Read its notes: areas not written, posts with zero TODOs on a thin brief
  (suspicious: facts may have been invented), and flagged phrases.
- htmlproofer failures in `_site/posts/projects/<slug>/` or `_site/tags/<slug>/` are yours to fix.
  Report failures elsewhere without fixing them.
- Look at the index: serve `_site` (`python3 -m http.server 4123 -d _site` in the background) and
  screenshot `http://127.0.0.1:4123/tags/<slug>/` with headless Chromium, or ask the user to open it
  with `task start-local`. Check that all written areas link and "N of 18 areas written" is right, and
  that the Interview Prep tile links its categories (it says "Not written yet" without the post).
- Open the interview post: every question folds open, and tables and callouts inside render (no raw
  `|` or `{: .prompt-warning }` text). Role tabs appear in each question, the "Answer as" bar switches
  every question at once, and with JavaScript off all roles show stacked with labels.

## 8. Report

Never commit. Tell the user:

1. The tag, the index URL `https://cloudutsuk.com/tags/<slug>/`, and the posts written (count, total words).
2. The TODO callouts left, grouped by area (and in the interview post), so they can answer them
   (offer to fold the answers in).
3. Hero images created, and the check.py and htmlproofer results.
4. Next step: review, then `task update` (or their own push) to publish.

## ADRs (optional)

For a project whose decisions are recorded as ADRs in its own repo (MADR files `NNNN-kebab-title.md`
with front matter `id`, `title`, `status`, `date`, `deciders`, `related_repos` and the sections Context,
Decision, Considered options, Consequences, optionally Related), publish them instead of retyping:

```bash
python3 $S/sync_adrs.py <slug> --src ../<repo>/docs/adr   # first run; stores the source in the data file
python3 $S/sync_adrs.py <slug>                            # every later run (each phase's playbook update)
python3 $S/sync_adrs.py <slug> --check                    # exit 1 if the blog copy is behind the repo
```

- It writes `_data/project_adrs/<slug>.yml` (the log) and the ADR post. In the post only the text
  between `<!-- adr:begin -->` and `<!-- adr:end -->` is generated; the intro and "How to read this log"
  are yours. The first run creates the post; give it a hero image (step 6) with `--tags "Architecture,ADR"`.
- Each ADR is `## ADR-NNNN: <title>` with the anchor `{: #adr-NNNN }`; links between ADRs become those
  anchors. Never hand-edit the generated block: fix the ADR in its repo and re-run.
- It scrubs emails, GUIDs, tokens, keys and links into private GitHub repos, and prints every scrub. A
  scrub means the source ADR holds something private: fix it there.
- Put `{% include project-adr-log.html project="<slug>" %}` in area 5's *Architectural decision records*
  section. The index shows the Architecture Decisions tile (counts per status, proposed ADRs listed)
  only when the data file exists, so projects without ADRs are unaffected.

## Changing the framework

Areas and topics live only in `_data/project_framework.yml`. Adding a topic or area is safe: run the
scaffold with `--areas <id>` for new areas, and add the new `## Topic` + `{: #anchor }` by hand to
existing posts. Renaming or removing a topic changes the anchor the index links to: update every
existing project's post, then run `check.py` for each project in `_data/projects/`.

The interview bank lives under `interview:` in the same file. Adding a question or a category is safe:
add the `<details>` block (or `## Category` + anchor) to every existing interview post and answer it.
Adding a role to a question's `roles` list makes check.py require that role's div in every post that
already uses role answers (posts with architect-only answers get a note instead).
Rewording a question or renaming a category breaks check.py (and, for categories, the tile's
deep links) until every project's interview post is updated the same way.
