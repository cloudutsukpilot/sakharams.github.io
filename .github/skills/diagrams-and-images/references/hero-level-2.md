# Hero image: Level 2 (Three.js 3D render)

The pipeline is: post context → a 3D scene that *depicts the topic* → headless render at 1200×630 →
the branded text overlay (`hero.py --background`) → save and update front matter.

`COMMON=.github/skills/diagrams-and-images/common`, `SKILL=.github/skills/diagrams-and-images`,
`WORK=$HOME/.cache/visuals-scene-render` (override with `VISUALS_SCENE_DIR`).

## 1. Setup (idempotent)

```bash
bash $SKILL/scripts/hero-3d/setup.sh
```

It installs three@0.152.2, pngjs, sharp and headless `gl` into `$WORK`, and copies `pipeline.mjs` +
`validate.mjs` there. The bundled prebuilt `gl` binary is **linux-x64 only**. On this aarch64
machine setup compiles headless-gl from source, which needs these system headers once:

```bash
sudo apt-get install -y libxi-dev libglu1-mesa-dev libgl-dev libxext-dev libx11-dev pkg-config xvfb
```

If setup prints `SETUP FAILED`, show the user that command and stop. Offer Level 1 or Level 3
instead. Do not hand-roll a renderer.

## 2. Read the post and plan the scene

```bash
python3 $COMMON/post_context.py <post>
```

Turn the content into **one clear 3D subject**: concrete, simple, and recognizable at thumbnail size.
Start from `palette.scene` (the category hint), then specialize it with the title, tags and headings:

| Post is about… | Scene idea |
|---|---|
| Kubernetes / containers / Docker | stacked shipping-container cubes on a grid, a ship's-wheel ring (helm) above |
| Terraform / IaC / Pulumi | modular blocks assembling into a structure from a glowing blueprint plane |
| CI/CD, GitHub Actions, Jenkins | a conveyor track carrying cubes through gates/rings into a deploy pad |
| Cloud (Azure/AWS/GCP) services | soft low-poly clouds over a row of server racks with emissive LEDs |
| Databases | stacked cylinders (disks) with orbiting data particles |
| Security / IAM / Zero Trust | a shield or padlock with a key; a ring barrier around a core |
| Networking | nodes (spheres) connected by tubes, with packets (small emissive boxes) along them |
| AI / ML / LLM / agents | a glowing neural lattice (instanced spheres and lines) around a core orb |
| Monitoring (Prometheus/Grafana) | floating bar/line chart panels around a pulsing core |
| Linux / OS | a stylized terminal slab with a cursor block and layered kernel plates beneath |

Pick ONE style preset from [hero-3d-style-presets.md](hero-3d-style-presets.md) (usually **Dark Studio** or **Night**, which
match the blog's dark brand). Use the category `palette.accent` / `accent2` for the rim lights and
emissive accents so the render ties to Level 1 images. Read [hero-3d-geometry-recipes.md](hero-3d-geometry-recipes.md) for
any element it covers before inventing geometry.

**Composition rule (hard):** the overlay darkens the left ~60% for the title. Put the hero subject
in the **right third** (screen x ≈ 0.65–0.85), keep the left side calm (background/fog only), and
keep the subject's silhouette within 0.12–0.88 of the height.

**No text, logos or letters in the 3D scene.** Branding comes from the overlay.

## 3. Write `$WORK/scene.mjs`

```js
import { THREE, createRenderer, captureFrame, addStudioEnvironment,
         seededRandom, visibleHeightAt } from './pipeline.mjs';
const time = 2.0;
const { renderer, glContext, W, H, OUT_W, OUT_H } = createRenderer('og', { exposure: 1.2 });
const scene = new THREE.Scene();
// ... sky, lights (accent-colored rims), ground, hero subject offset to the right ...
await captureFrame({ renderer, glContext, scene, camera, W, H, OUT_W, OUT_H,
                     outPath: `${process.cwd()}/out.png` });
console.log('DONE');
```

Rules: use `seededRandom(seed)` only (never `Math.random()`), use `InstancedMesh` for 50+ repeats,
bake rotations into geometry, run the `visibleHeightAt` FOV check for background elements, no
post-processing, WebGL1 only, and three stays at 0.152.2.

## 4. Render and validate (mandatory)

```bash
cd $WORK && xvfb-run -a node scene.mjs
node validate.mjs out.png heroes.json     # one entry per named subject element, with its dominant hex
```

Also open `out.png` (open it and look at it). Fix and re-render (max 2 iterations) on: any hero element
FAIL, WASHED OUT / TOO DARK / LOW CONTRAST, or the subject cropped or sitting on the left half.

## 5. Brand overlay, save and front matter

Preview first:
```bash
python3 $COMMON/hero.py <post> --background $WORK/out.png [--title "…"] [--tags "…"]
```
Check `hero-preview/<slug>.webp` (title legible over the scrim, subject visible on the right). Then:
```bash
python3 $COMMON/hero.py <post> --background $WORK/out.png --write --alt "3D render of … - <topic>"
```
In overlay mode the matched tool icon appears as a small chip above the kicker. Pass `--no-icon`
to omit it. If the post already has its own (non-generic) image, ask before using `--force`.

## 6. Report

Give the image path, front-matter diff, the scene concept, preset, and any validation fixes. Never commit.
