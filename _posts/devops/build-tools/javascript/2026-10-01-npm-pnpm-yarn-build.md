---
layout: post
title: "npm, pnpm and Yarn: Node.js Package Managers in the Build"
categories: [devops, build-tools, javascript]
tags: [DevOps, Build-Tools, JavaScript, TypeScript, NodeJS, npm, pnpm, Yarn, SCA]
description: How npm, pnpm and Yarn install, lock and run Node.js projects, which files they need, how to scan dependencies, and a complete GitHub Actions pipeline.
mermaid: true
image:
  path: /assets/img/devops/build-tools/javascript/npm-pnpm-yarn-build.webp
  alt: "DevOps pipeline loop motif with the title Node Package Managers: npm, pnpm, Yarn"
---

In the JavaScript world the **package manager** (npm, pnpm, Yarn, Bun) is the entry point of every
build: it installs dependencies from a lockfile, runs the `scripts` defined in `package.json` and
publishes packages. The actual compile/bundle step is a separate tool, covered in
[JavaScript Bundlers](/posts/devops/build-tools/javascript/javascript-bundlers-build/).

<!-- more -->

This post is part of [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/).
{: .prompt-info }

## At a glance

| Category | Common tools |
|---|---|
| Package managers | npm (bundled with Node.js), pnpm, Yarn (Berry / v4), Bun |
| Monorepo tools | npm / pnpm / Yarn workspaces, Nx, Turborepo, Lerna |
| Registry | npmjs.com, GitHub Packages, private Artifactory / Verdaccio |
| Build files | `package.json`, lockfile, `.npmrc`, `.nvmrc`, `pnpm-workspace.yaml`, `.yarnrc.yml` |
| Lint and format | ESLint, Prettier, Biome |
| SAST (open source) | Semgrep, CodeQL, `eslint-plugin-security`, SonarQube Community Build |
| SAST (commercial) | Checkmarx One, Veracode, Snyk Code, SonarQube Server |
| SCA | `npm audit`, `pnpm audit`, OSV-Scanner, Trivy, Snyk Open Source, Socket, Mend, Black Duck |
| Frameworks | Express, NestJS, Fastify, Next.js |
| Test and coverage | Jest, Vitest, Node test runner (`node --test`), Istanbul / `c8` |
| Build output | npm tarball (`.tgz`), `node_modules` + app for container images |
| CI cache | `~/.npm`, pnpm store, Yarn cache |

## How the build works

In CI, each stage of the [generic build pipeline](/posts/devops/build-tools/language-build-ecosystem/#generic-pipeline) maps to a npm (or pnpm / Yarn) command, plugin or scanner. Press play, or step through it:

{% include flow-anim.html id="devops/build-tools/javascript/node-package-ci-pipeline" %}

- **Install from the lockfile in CI.** `npm ci`, `pnpm install --frozen-lockfile` and
  `yarn install --immutable` fail if `package.json` and the lockfile disagree.
- **Layouts differ.** npm and Yarn classic hoist packages into a flat `node_modules`; pnpm uses a
  content-addressable store with symlinks (strict, no phantom dependencies); Yarn Berry can use
  Plug'n'Play with no `node_modules` at all.
- **Install scripts run arbitrary code.** `preinstall` / `postinstall` scripts of dependencies run
  on your build agent, which is the main supply-chain risk in this ecosystem.

### Same task, three package managers

| Task | npm | pnpm | Yarn (v4) |
|---|---|---|---|
| Install from lockfile | `npm ci` | `pnpm install --frozen-lockfile` | `yarn install --immutable` |
| Add a dependency | `npm install express` | `pnpm add express` | `yarn add express` |
| Run a script | `npm run build` | `pnpm build` | `yarn build` |
| Audit | `npm audit` | `pnpm audit` | `yarn npm audit` |
| Why is this installed? | `npm explain lodash` | `pnpm why lodash` | `yarn why lodash` |
| Publish | `npm publish` | `pnpm publish` | `yarn npm publish` |
| Lockfile | `package-lock.json` | `pnpm-lock.yaml` | `yarn.lock` |

## Build files

| File | Purpose | Commit? |
|---|---|---|
| `package.json` | Name, version, dependencies, `scripts`, `engines`, `packageManager` | Yes |
| `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` | Exact resolved versions with integrity hashes (commit exactly one) | Yes |
| `.npmrc` | Registry URLs, scoped registries, settings like `ignore-scripts` | Yes, with tokens as `${NPM_TOKEN}` |
| `.nvmrc` / `.node-version` | Node.js version for nvm, fnm, `setup-node` | Yes |
| `pnpm-workspace.yaml` | pnpm workspace packages and settings | Yes |
| `.yarnrc.yml`, `.yarn/releases/` | Yarn Berry config and pinned Yarn binary | Yes |
| `node_modules/` | Installed packages | No |

## Commands by category

```bash
npm ci                                           # reproducible install from lockfile
npm run lint                                     # lint (ESLint via package.json script)
semgrep scan --config p/nodejs --error           # SAST
npm audit --audit-level=high --omit=dev          # SCA for production dependencies
npm audit signatures                             # verify registry signatures / provenance
npm test -- --coverage                           # tests + coverage
npx @cyclonedx/cyclonedx-npm --output-file sbom.json   # SBOM
npm pack                                         # package as .tgz
npm publish --provenance --access public         # publish with build provenance
```

## Minimal project

```json
{
  "name": "@example/api",
  "version": "1.0.0",
  "type": "module",
  "packageManager": "pnpm@10.4.0",
  "engines": { "node": ">=22" },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "eslint .",
    "test": "vitest run --coverage",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^5.0.0"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "^3.0.0",
    "eslint": "^9.0.0",
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  }
}
```

```ini
# .npmrc — private registry for one scope, token from the environment
@example:registry=https://artifactory.example.com/artifactory/api/npm/npm-virtual/
//artifactory.example.com/artifactory/api/npm/npm-virtual/:_authToken=${NPM_TOKEN}
engine-strict=true
```

## Frameworks

| Framework | Start a project |
|---|---|
| Express | `npm init -y && npm install express` |
| NestJS | `npx @nestjs/cli new api` |
| Fastify | `npm init fastify` |
| Next.js | `npx create-next-app@latest web` |

## CI with GitHub Actions

{% raw %}
```yaml
name: node-ci
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
          cache: npm                         # use pnpm/action-setup first for pnpm

      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm audit --audit-level=high --omit=dev
      - run: npm run build
      - run: npx @cyclonedx/cyclonedx-npm --output-file sbom.json

      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: |
            dist/
            sbom.json

  publish:
    if: startsWith(github.ref, 'refs/tags/v')
    needs: build
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write                        # required for --provenance
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          registry-url: https://registry.npmjs.org
      - run: npm ci && npm run build
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```
{% endraw %}

## Best practices

- **Commit exactly one lockfile** and install with the frozen/immutable flag in CI.
- **Pin the package manager** with the `packageManager` field and the Node.js version with `.nvmrc`.
- **Treat install scripts as untrusted.** Consider `ignore-scripts=true` in CI (and allow-list the
  packages that need them), and use pnpm's `onlyBuiltDependencies` / `minimumReleaseAge` settings.
- **Proxy the registry** through Artifactory or Nexus and route scoped packages to the private
  registry to prevent dependency confusion.
- **Audit production dependencies** with `--omit=dev` as a gate, and keep a scheduled full audit.
- **Publish with provenance** and verify it with `npm audit signatures`.
- **Automate updates** with Dependabot or Renovate, grouped so PRs stay reviewable.

## Related posts

- [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/)
- [JavaScript Bundlers: Vite, webpack, esbuild and tsc](/posts/devops/build-tools/javascript/javascript-bundlers-build/)
- [Artifact Management](/posts/artifacts/artifact-management/)
- [Snyk](/posts/devsecops/snyk/snyk/)
