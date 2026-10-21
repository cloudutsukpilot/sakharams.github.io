---
layout: post
title: "Rust Build with Cargo: Build Files, Scanners and CI"
categories: [devops, build-tools, rust]
tags: [DevOps, Build-Tools, Rust, Cargo, SAST, SCA]
description: How Cargo builds, tests and secures Rust projects, which files it needs, how to lint and audit dependencies, and a complete GitHub Actions pipeline.
mermaid: true
image:
  path: /assets/img/devops/build-tools/rust/cargo-build.webp
  alt: "DevOps pipeline loop motif with the title Rust Build with Cargo"
---

**Cargo** is Rust's build tool, package manager, test runner, benchmark runner and documentation
generator in one. Combined with `rustup` for toolchains and a small set of community subcommands
(`cargo-audit`, `cargo-deny`, `cargo-llvm-cov`), it covers the whole build pipeline with very little
glue.

<!-- more -->

This post is part of [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/).
Cross-compilation, publishing and deployment patterns are covered in the
[Rust Build and Deployment Tools Guide](/posts/devops/rust-build-deploy/).
{: .prompt-info }

## At a glance

| Category | Common tools |
|---|---|
| Build tools | Cargo, rustup, cargo-make, cross (cross-compilation in containers), cargo-zigbuild, cargo-dist, maturin (Python extensions), Bazel (`rules_rust`) |
| Package registry | crates.io, private registries (Artifactory, Cloudsmith, Kellnr) |
| Build files | `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml`, `.cargo/config.toml`, `build.rs`, `rustfmt.toml`, `clippy.toml`, `deny.toml` |
| Lint and format | rustfmt, Clippy |
| SAST (open source) | Clippy, Semgrep, CodeQL, cargo-geiger (counts `unsafe`) |
| SAST (commercial) | Snyk Code, Checkmarx One, Veracode |
| SCA | cargo-audit (RustSec), cargo-deny (advisories, licences, bans, sources), OSV-Scanner, Trivy, Snyk, Mend |
| Frameworks | Tokio, Axum, Actix Web, Rocket, Tauri, Leptos, clap (CLIs) |
| Test and coverage | `cargo test`, cargo-nextest, proptest, criterion (benchmarks); cargo-llvm-cov, cargo-tarpaulin |
| Build output | Native binary, static library, `.crate` package, Python wheel (maturin) |
| CI cache | `~/.cargo/registry`, `~/.cargo/git`, `target/` (via `Swatinem/rust-cache`) or sccache |

## How the build works

In CI, each stage of the [generic build pipeline](/posts/devops/build-tools/language-build-ecosystem/#generic-pipeline) maps to a Cargo command, plugin or scanner. Press play, or step through it:

{% include flow-anim.html id="devops/build-tools/rust/cargo-ci-pipeline" %}

- **Profiles** control optimisation: `dev` (fast compile, debug info) and `release`
  (`opt-level = 3`); tune `lto` and `codegen-units` for smaller, faster release binaries.
- **Features** turn optional code and dependencies on or off; CI should build with the feature
  sets you ship (`--all-features`, `--no-default-features`).
- **`build.rs`** runs before compiling the crate (code generation, linking native libraries); it
  executes arbitrary code at build time, so review it in dependencies.
- **`--locked`** makes Cargo fail instead of updating `Cargo.lock`, which keeps CI reproducible.

## Build files

| File | Purpose | Commit? |
|---|---|---|
| `Cargo.toml` | Package metadata, dependencies, features, profiles, workspace members | Yes |
| `Cargo.lock` | Exact dependency versions and checksums | Yes (for binaries and, nowadays, libraries too) |
| `rust-toolchain.toml` | Pinned Rust version, components (clippy, rustfmt), targets | Yes |
| `.cargo/config.toml` | Registry mirrors, linker, target flags, aliases | Yes, without tokens |
| `build.rs` | Build script | Yes |
| `rustfmt.toml`, `clippy.toml` | Format and lint settings | Yes |
| `deny.toml` | cargo-deny policy (allowed licences, banned crates, advisory ignores) | Yes |
| `target/` | Build output | No |

## Commands by category

```bash
cargo build --release --locked                   # build
cargo fmt --all --check                          # format check
cargo clippy --all-targets --all-features -- -D warnings   # lint as a gate
cargo audit                                      # SCA (RustSec advisory database)
cargo deny check                                 # advisories + licences + bans + sources
cargo nextest run                                # tests (faster runner); or cargo test
cargo llvm-cov --fail-under-lines 80             # coverage gate
cargo cyclonedx --format json                    # SBOM (cargo-cyclonedx)
cargo publish --dry-run                          # validate the crate package
```

## Minimal project

```toml
# Cargo.toml
[package]
name = "demo"
version = "1.0.0"
edition = "2024"
rust-version = "1.85"

[dependencies]
axum = "0.8"
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }

[profile.release]
lto = true
codegen-units = 1
strip = true
```

```toml
# rust-toolchain.toml
[toolchain]
channel = "1.85"
components = ["clippy", "rustfmt"]
```

```toml
# deny.toml (minimal cargo-deny policy)
[advisories]
version = 2

[licenses]
version = 2
allow = ["MIT", "Apache-2.0", "BSD-3-Clause", "ISC", "Unicode-3.0"]

[bans]
multiple-versions = "warn"
```

## Frameworks

| Framework | Start a project |
|---|---|
| Axum | `cargo new api && cd api && cargo add axum tokio -F tokio/full` |
| Actix Web | `cargo new api && cd api && cargo add actix-web` |
| Tauri (desktop) | `cargo install create-tauri-app && cargo create-tauri-app` |
| clap (CLI) | `cargo new cli && cd cli && cargo add clap -F derive` |

## CI with GitHub Actions

{% raw %}
```yaml
name: rust-ci
on: [push, pull_request]
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy, rustfmt
      - uses: Swatinem/rust-cache@v2

      - run: cargo fmt --all --check
      - run: cargo clippy --all-targets --all-features --locked -- -D warnings
      - run: cargo test --locked
      - uses: EmbarkStudios/cargo-deny-action@v2   # advisories, licences, bans
      - run: cargo build --release --locked

      - uses: actions/upload-artifact@v4
        with:
          name: demo
          path: target/release/demo
```
{% endraw %}

## Best practices

- **Pin the toolchain** in `rust-toolchain.toml` and set `rust-version` (MSRV) in `Cargo.toml`.
- **Build with `--locked`** in CI and commit `Cargo.lock`.
- **Make Clippy a gate** with `-D warnings`; allow specific lints in code with a reason rather than
  disabling them globally.
- **Use cargo-deny** as the single SCA and licence policy, and run `cargo audit` on a schedule so
  new advisories surface even without code changes.
- **Cache wisely**: `Swatinem/rust-cache` or sccache; `target/` grows large, so prune old artifacts.
- **Strip and optimise release binaries** (`strip = true`, `lto`, `codegen-units = 1`) and build
  with musl or in distroless images for small containers.

## Related posts

- [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/)
- [Rust Build and Deployment Tools Guide](/posts/devops/rust-build-deploy/)
- [Go Build](/posts/devops/build-tools/go/go-build/)
