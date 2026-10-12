# Intake: gather the facts, ask for what is missing

Every diagram, for any system or topic, starts here. The diagram is only as true as its data: the
engines draw whatever the YAML says, so a wrong port or an invented component ends up in front of
readers. This step collects the facts from the sources the user gave, and **asks the user** for the
ones that can't be found there.

`SKILL=.github/skills/diagrams-and-images`, `COMMON=$SKILL/common`, run from the repo root.

## 1. Find the source of truth

Use everything the user points to, in this order of trust:

| Source | How to read it |
|---|---|
| A post in this repo (path, slug, title fragment, or the file open in the editor) | `python3 $COMMON/post_context.py <post>` for title, palette and headings, then read the section the diagram belongs to. A Mermaid or ASCII diagram of the same flow there **is the spec** |
| A code or IaC repo (any folder, for example a lab repo next to this one) | README, architecture docs (`docs/`), Kubernetes manifests, Helm values, Compose files, Terraform, collector/proxy configs. Ports, service names and protocols come from these files |
| A design doc, ADR, ticket or pasted text | Read it fully; quote its names exactly |
| A topic only ("OAuth auth-code flow", "how a CDN works") | Textbook knowledge for well-known, vendor-neutral flows; product defaults from [protocols-ports.md](protocols-ports.md) |

Write down, in a scratch list, what each source tells you for the checklist below, and **where it came
from** (file and line, or "user said"). That list becomes the header comment of the YAML file.

## 2. Pick the diagram type

| The user wants to show… | Use | Workflow |
|---|---|---|
| A system, platform, architecture, topology, infrastructure, network, deployment, data flow, C4, "how the parts connect" | **Explorable diagram** (levels, views, use cases) | [diagram.md](diagram.md) |
| A short linear process (a pipeline, a handshake, a reconcile loop, an algorithm), 5 to 12 steps, one fixed picture | **Step-through animation** | [flow-anim.md](flow-anim.md) |
| Where things are: regions, latency, CDN edges, failover | Explorable diagram with `map:`, or a flow-anim geo map for a short latency story | [diagram.md](diagram.md) / [flow-anim.md](flow-anim.md#geo-maps) |
| A sequence (lifelines), class, ER, state, Gantt or mind map | A Mermaid block in the post (`mermaid: true` in its front matter); neither engine draws these | Chirpy's Mermaid support |
| Editing an existing diagram | The engine it already uses: `_data/diagrams/` → diagram.md, `_data/flow_anims/` → flow-anim.md | |

Default to the explorable diagram when in doubt: it handles small systems too, and flow-anim is
being retired ([diagram-plan.md](diagram-plan.md)).

## 3. Checklist: what the diagram needs

**Explorable diagram**

| # | Fact | Required? | Where it goes |
|---|---|---|---|
| 1 | What the diagram explains and who reads it (one sentence) | yes | `title`, level 0 |
| 2 | Components: the people, the system's parts and the external systems | yes | `nodes` |
| 3 | Where each component runs (edge, cluster, host, cloud account, SaaS), to group them | yes, for 8+ components | the tree / levels |
| 4 | What each leaf component does (1 to 4 sentences) | yes | `detail` |
| 5 | Which components talk to each other, in which direction | yes | `edges` |
| 6 | Each connection's protocol and port, and whether it is TLS | yes for arrows between systems | `proto`, `port`, `tls` |
| 7 | Why each connection exists or when it is used | yes | `why` |
| 8 | Cross-cutting plumbing (telemetry, identity/secrets, DNS/ingress, CI/CD) | if present | `views` |
| 9 | 1 to 6 activities to replay (sign in, deploy, an alert, a cache miss) and their hops in order, including replies | yes, at least 1 | `scenarios` |
| 10 | Real config snippets worth showing | optional | `config` |
| 11 | Where to embed it (a post, or a category folder) | yes | file path, include |

**Step-through animation**: #1, the ordered stages (5 to 12), the actor/system for each stage, the
protocol and port of each hop between systems, an alternative path if any (pass/fail, hit/miss), and
where to embed it.

**Hero images** need only the post; see the hero workflows.

## 4. Decide: fill in, or ask

- **Found in a source:** use it, and record where it came from.
- **A product default** (PostgreSQL 5432, Redis 6379, OTLP gRPC 4317): use it, and say "default port"
  in the step text and the header comment, unless the source suggests the system uses a custom
  port. Then ask.
- **Derivable by plain reasoning** (a browser reaches a public site over HTTPS 443): use it.
- **Anything else is missing or ambiguous:** ask. That covers which components exist, where they
  run, whether two components talk, the direction, a non-default port, whether a hop is encrypted,
  the order of steps, and which activities matter to the reader. **Never invent it.**

## 5. How to ask

Ask once, in a single message, before writing any YAML, and wait for the reply:

- **Only what you could not find.** Start with one line on what you already have ("From the README
  and manifests I have 9 components and 11 connections"), then the questions.
- **At most about 6 numbered questions,** the most important first. Group small ones ("Ports for:
  a) API → Redis, b) API → Postgres").
- **Offer a default for each** so the user can answer "yes to all": `3. Does the API reach Postgres
  directly, or through PgBouncer? (default: directly, 5432)`.
- **Offer choices** when the answer is one of a few (`Group by: a) cluster, b) team, c) environment`).
- If the reply leaves gaps, ask once more about only those. After two rounds, or if the user says "you
  decide", go ahead with the defaults, mark each assumption in the YAML header comment
  (`# Assumed: …`), and list them in the report.

Question bank (pick only what applies):

1. **Scope:** "Which part should the diagram cover: the whole platform, or only <subsystem>?"
2. **Audience and depth:** "Is this for newcomers (overview plus 1 or 2 levels) or engineers (down to
   individual services and config)?"
3. **Components:** "I found A, B, C. Is anything missing (a cache, a queue, an identity provider, an
   external SaaS)?"
4. **Placement:** "Where do these run? (default: grouped by cluster/host as in the manifests)"
5. **Connections:** "Does X call Y directly, or through Z? Which side starts the connection?"
6. **Protocols and ports:** "Which port does X listen on? (default: <product default>)" and "Is the
   X → Y hop TLS?"
7. **Use cases:** "Which 1 to 4 activities should the diagram replay? Suggested: <list from the source>"
8. **Alternative paths:** "Should a use case show a failure or fallback (cache miss, auth denied)?"
9. **Embedding:** "Embed it in <post>, after the section <heading>? Or create it standalone under
   `_data/diagrams/<category>/`?"

## 6. Hand over

Write the header comment of the data file from the scratch list: the source files, the user's
answers, the defaults and the assumptions. Then continue with step 1 of the chosen workflow.
