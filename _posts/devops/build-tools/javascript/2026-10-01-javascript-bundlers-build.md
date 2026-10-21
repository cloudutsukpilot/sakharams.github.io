---
layout: post
title: "JavaScript Bundlers: Vite, webpack, esbuild and tsc"
categories: [devops, build-tools, javascript]
tags: [DevOps, Build-Tools, JavaScript, TypeScript, Vite, Webpack, Esbuild]
description: How JavaScript and TypeScript code is compiled and bundled with tsc, Vite, webpack and esbuild, which config files they need, how to check and scan the output, and a GitHub Actions pipeline.
mermaid: true
image:
  path: /assets/img/devops/build-tools/javascript/javascript-bundlers-build.webp
  alt: "DevOps pipeline loop motif with the title Bundling JavaScript with Vite and webpack"
---

Once a package manager has installed dependencies, a **compiler or bundler** turns TypeScript, JSX
and modern JavaScript into files that browsers or Node.js can run. For front ends this means
bundling, tree shaking, code splitting and minification; for libraries and back ends it is often
just the TypeScript compiler.

<!-- more -->

This post is part of [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/).
Installing and locking dependencies is covered in [npm, pnpm and Yarn](/posts/devops/build-tools/javascript/npm-pnpm-yarn-build/).
{: .prompt-info }

## At a glance

| Category | Common tools |
|---|---|
| Compilers / transpilers | `tsc` (TypeScript), SWC, Babel, esbuild |
| Bundlers | Vite (Rollup / Rolldown for production), webpack, Rspack, Rollup, esbuild, Turbopack (Next.js), tsup (libraries) |
| Build files | `tsconfig.json`, `vite.config.ts`, `webpack.config.js`, `rollup.config.mjs`, `tsup.config.ts`, `.browserslistrc`, `.swcrc`, `babel.config.js` |
| Lint and format | ESLint + typescript-eslint, Prettier, Biome |
| SAST (open source) | Semgrep, CodeQL, `eslint-plugin-security`, SonarQube Community Build |
| SAST (commercial) | Checkmarx One, Veracode, Snyk Code, SonarQube Server |
| SCA | `npm audit`, Retire.js (for vendored browser libraries), OSV-Scanner, Snyk, Socket |
| Frameworks | React, Vue, Angular, Svelte, Next.js, Nuxt |
| Test and coverage | Vitest, Jest, Playwright, Cypress; V8 / Istanbul coverage |
| Bundle analysis | `rollup-plugin-visualizer`, `webpack-bundle-analyzer`, `source-map-explorer`, size-limit |
| Build output | `dist/` with hashed JS/CSS chunks, source maps, static assets |

## How the build works

In CI, each stage of the [generic build pipeline](/posts/devops/build-tools/language-build-ecosystem/#generic-pipeline) maps to a bundler command, plugin or scanner. Press play, or step through it:

{% include flow-anim.html id="devops/build-tools/javascript/bundler-ci-pipeline" %}

- **Bundlers do not type-check.** Vite, esbuild and SWC strip types for speed; run `tsc --noEmit`
  as a separate CI step or type errors reach production.
- **Content hashing** (`index-3f9a2c.js`) lets you cache assets forever and invalidate by filename.
- **Environment variables are baked in at build time.** Anything exposed to the client (`VITE_*`,
  `NEXT_PUBLIC_*`) ends up in the bundle; never put secrets there.

### Which tool when

| Situation | Typical choice |
|---|---|
| New SPA (React, Vue, Svelte) | Vite |
| Existing large app with custom loaders | webpack (or Rspack as a faster drop-in) |
| Node.js service or CLI as one file | esbuild |
| npm library with ESM + CJS + types | tsup or Rollup, plus `tsc` for `.d.ts` |
| Next.js / Nuxt / Angular | The framework's own builder (Turbopack/webpack, Vite, esbuild) |

## Build files

| File | Purpose | Commit? |
|---|---|---|
| `tsconfig.json` | TypeScript compiler options, `strict`, paths, target | Yes |
| `vite.config.ts` | Vite plugins, aliases, build target, chunking | Yes |
| `webpack.config.js` | Entries, loaders, plugins, optimisation | Yes |
| `rollup.config.mjs` / `tsup.config.ts` | Library output formats | Yes |
| `.browserslistrc` | Target browsers for CSS/JS transforms | Yes |
| `.env`, `.env.production` | Build-time variables | Only non-secret defaults |
| `dist/` | Build output | No |

## Commands by category

```bash
npx tsc --noEmit                                 # type check
npx vite build                                   # production bundle (Vite)
npx webpack --mode production                    # production bundle (webpack)
npx esbuild src/index.ts --bundle --platform=node --minify --outfile=dist/index.js   # single-file Node bundle
npx eslint . --max-warnings 0                    # lint
semgrep scan --config p/typescript --error       # SAST
npx vitest run --coverage                        # tests + coverage
npx source-map-explorer 'dist/assets/*.js'       # bundle size analysis
```

## Minimal project

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: 'hidden',          // generate maps for error tracking, don't link them publicly
    chunkSizeWarningLimit: 500,
  },
})
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

## Frameworks

| Framework | Start a project (and its builder) |
|---|---|
| React | `npm create vite@latest web -- --template react-ts` (Vite) |
| Vue | `npm create vue@latest` (Vite) |
| Angular | `npx @angular/cli new web` (esbuild-based application builder) |
| Svelte | `npx sv create web` (Vite) |
| Next.js | `npx create-next-app@latest web` (Turbopack / webpack) |

## CI with GitHub Actions

{% raw %}
```yaml
name: frontend-ci
on: [push, pull_request]
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm

      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx eslint . --max-warnings 0
      - run: npx vitest run --coverage
      - run: npx vite build
        env:
          VITE_API_URL: ${{ vars.API_URL }}   # public, non-secret value only

      - uses: actions/upload-artifact@v4
        with:
          name: web-dist
          path: dist/
```
{% endraw %}

## Best practices

- **Type-check separately** (`tsc --noEmit`) because the bundler will not fail on type errors.
- **Set a performance budget** (chunk size warning, size-limit) and fail the build when exceeded.
- **Generate source maps, but keep them private**: upload them to your error tracker instead of
  serving them publicly.
- **Build once, deploy many**: avoid environment-specific bundles where possible; load runtime
  config from a small `config.json` fetched at startup.
- **Keep secrets out of the bundle**; anything in client-side env vars is public.
- **Scan vendored libraries** (files copied into `public/`) with Retire.js, because `npm audit`
  cannot see them.

## Related posts

- [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/)
- [npm, pnpm and Yarn](/posts/devops/build-tools/javascript/npm-pnpm-yarn-build/)
- [GitHub Actions](/posts/devops/cicd/github%20actions/github-actions/)
