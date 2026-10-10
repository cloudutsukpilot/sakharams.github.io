---
layout: post
title: "Build Ecosystems by Programming Language: Tools, Scanners, Frameworks and Files"
categories: [devops, build-tools]
tags: [DevOps, Build-Tools, DevSecOps, SAST, SCA, SBOM, Java, JavaScript, Python, Go, DotNet, CPP, Rust, Ruby, PHP, Swift, Kotlin]
description: A DevOps architect's and engineer's reference to the build tools, scan tools, frameworks and build files used by each major programming language.
published: true
mermaid: true
image:
  path: /assets/img/devops/build-tools/language-build-ecosystem.webp
  alt: "DevOps pipeline loop motif with the title Build Ecosystems by Programming Language"
---

Every language brings its own build ecosystem: a build tool, a package manager, a lockfile, a set of
linters, a test framework and a list of scanners that understand its dependency graph. A DevOps
architect has to standardise pipelines across all of them; a DevOps engineer has to make each one
build, test and scan reliably in CI. This post is a single reference for both: for each common
language it lists the build tools, scan tools, frameworks, the files each build tool expects, one
command per tool category and a minimal build file.

<!-- more -->

## Index
{: #index }

- [The generic build pipeline](#generic-pipeline)
- [At a glance: one row per language](#at-a-glance)
- Languages
  - [Java and Kotlin (JVM)](#java)
  - [JavaScript and TypeScript](#javascript)
  - [Python](#python)
  - [Go](#go)
  - [.NET (C#, F#, VB.NET)](#dotnet)
  - [C and C++](#cpp)
  - [Rust](#rust)
  - [Ruby](#ruby)
  - [PHP](#php)
  - [Mobile: Swift (iOS) and Kotlin (Android)](#mobile)
- [Cross-language scanners](#cross-language-scanners)
- [The architect's view](#architects-view)
- [Related posts](#related-posts)

## The generic build pipeline
{: #generic-pipeline }

The tools change per language, but the stages do not. Each language section below maps its tools onto
these stages.

{% include flow-anim.html id="devops/build-tools/generic-build-pipeline" %}

| Stage | What it answers | Tool category |
|---|---|---|
| Restore | Are dependencies pinned and reachable? | Package manager, lockfile, private registry proxy |
| Lint / format | Does the code follow the agreed style and avoid obvious bugs? | Linters, formatters, type checkers |
| Compile / bundle | Does it build, reproducibly? | Compiler, build tool, bundler |
| Test | Does it behave correctly, and how much is covered? | Test framework, coverage tool |
| SAST | Does *our* code contain vulnerable patterns? | Static application security testing |
| SCA | Do *our dependencies* have known CVEs or bad licences? | Software composition analysis |
| Secrets | Did anyone commit a key or token? | Secret scanners |
| Package / publish | What exactly did we ship, and can we prove it? | Packager, SBOM generator, signer, artifact repository |

## At a glance: one row per language
{: #at-a-glance }

| Language | Main build tool | Package manager | Key build files | Typical SAST / SCA | Test framework | Deep dive |
|---|---|---|---|---|---|---|
| [Java / Kotlin](#java) | Maven, Gradle | Maven Central | `pom.xml`, `build.gradle.kts` | SpotBugs + FindSecBugs, OWASP Dependency-Check | JUnit 5 | [Maven Build](/posts/devops/build-tools/java/maven-build/), [Gradle Build](/posts/devops/build-tools/java/gradle-build/) |
| [JavaScript / TypeScript](#javascript) | Vite, webpack, `tsc` | npm, pnpm, Yarn | `package.json`, lockfile | ESLint security plugins, `npm audit` | Jest, Vitest | [npm, pnpm and Yarn](/posts/devops/build-tools/javascript/npm-pnpm-yarn-build/), [JavaScript Bundlers](/posts/devops/build-tools/javascript/javascript-bundlers-build/) |
| [Python](#python) | `build`, uv, Poetry | pip, PyPI | `pyproject.toml` | Bandit, pip-audit | pytest | [pip, setuptools and build](/posts/devops/build-tools/python/pip-setuptools-build/), [uv and Poetry](/posts/devops/build-tools/python/uv-poetry-build/) |
| [Go](#go) | `go build` | Go modules | `go.mod`, `go.sum` | gosec, govulncheck | `go test` | [Go Build](/posts/devops/build-tools/go/go-build/) |
| [.NET](#dotnet) | `dotnet` CLI / MSBuild | NuGet | `*.csproj`, `*.sln` | Roslyn analyzers, NuGet audit | xUnit, NUnit | [DotNet Build](/posts/devops/build-tools/dotnet/dotnet-build/) |
| [C / C++](#cpp) | CMake + Ninja | Conan, vcpkg | `CMakeLists.txt` | cppcheck, Coverity | GoogleTest | [CMake, Ninja, Conan and vcpkg](/posts/devops/build-tools/cpp/cmake-build/), [Make and Autotools](/posts/devops/build-tools/cpp/make-autotools-build/) |
| [Rust](#rust) | Cargo | crates.io | `Cargo.toml`, `Cargo.lock` | Clippy, cargo-audit | `cargo test` | [Rust Build with Cargo](/posts/devops/build-tools/rust/cargo-build/) |
| [Ruby](#ruby) | Rake, Bundler | RubyGems | `Gemfile`, `Gemfile.lock` | Brakeman, bundler-audit | RSpec | [Bundler and Rake](/posts/devops/build-tools/ruby/bundler-rake-build/) |
| [PHP](#php) | Composer | Packagist | `composer.json`, `composer.lock` | PHPStan / Psalm, `composer audit` | PHPUnit | [Composer](/posts/devops/build-tools/php/composer-build/) |
| [Swift / Kotlin mobile](#mobile) | `xcodebuild`, Gradle (AGP) | SwiftPM, Maven | `Package.swift`, `build.gradle.kts` | MobSF, SwiftLint, Android Lint | XCTest, JUnit | [iOS](/posts/devops/build-tools/swift/xcode-swiftpm-build/), [Android Gradle Build](/posts/devops/build-tools/android/android-gradle-build/) |

Commercial platforms such as Checkmarx, OpenText Fortify, Veracode, Snyk, Black Duck and Mend
cover most of these languages; they are listed per language where they are commonly used and
compared in [Cross-language scanners](#cross-language-scanners).
{: .prompt-info }

## Java and Kotlin (JVM)
{: #java }

**Deep dive:** [Maven Build](/posts/devops/build-tools/java/maven-build/), [Gradle Build](/posts/devops/build-tools/java/gradle-build/)

The JVM ecosystem is dominated by Maven (declarative XML, convention over configuration) and Gradle
(Groovy or Kotlin DSL, incremental and cached builds). Always commit the wrapper (`mvnw`, `gradlew`)
so CI uses the same tool version as developers.

{% include flow-anim.html id="devops/build-tools/java/maven-ci-pipeline" %}

| Category | Common tools |
|---|---|
| Build tools | Maven, Gradle, Ant (+ Ivy), Bazel, sbt (Scala) |
| Package manager / registry | Maven Central, Gradle Plugin Portal, private Artifactory / Nexus |
| Build files | `pom.xml`, `.mvn/maven.config`, `mvnw`, `settings.xml`, `build.gradle` / `build.gradle.kts`, `settings.gradle.kts`, `gradle.properties`, `gradle/libs.versions.toml`, `gradlew`, `gradle/wrapper/gradle-wrapper.properties`, `build.xml`, `ivy.xml` |
| Lint and format | Checkstyle, PMD, SpotBugs, Error Prone, Spotless, ktlint and detekt (Kotlin) |
| SAST (open source) | SpotBugs + FindSecBugs, Semgrep, CodeQL, SonarQube Community Build |
| SAST (commercial) | Checkmarx One, OpenText Fortify, Veracode, Coverity, SonarQube Server |
| SCA / dependency scanning | OWASP Dependency-Check, Trivy, Grype, Snyk, Mend, Black Duck, JFrog Xray |
| Frameworks | Spring Boot, Quarkus, Micronaut, Jakarta EE, Ktor (Kotlin) |
| Test and coverage | JUnit 5, TestNG, Mockito, Testcontainers, JaCoCo |
| Build output | `.jar`, `.war`, `.ear`; container images via Jib or Cloud Native Buildpacks |
| CI cache | `~/.m2/repository`, `~/.gradle/caches`, `~/.gradle/wrapper` |

**One example per tool category**

```bash
mvn -B clean verify                              # build (Maven, batch mode)
./gradlew build                                  # build (Gradle wrapper)
mvn checkstyle:check                             # lint
mvn com.github.spotbugs:spotbugs-maven-plugin:check   # SAST (with FindSecBugs plugin configured)
mvn org.owasp:dependency-check-maven:check       # SCA
mvn test jacoco:report                           # test + coverage (JaCoCo plugin configured)
mvn compile jib:dockerBuild                      # container image without a Dockerfile
```

<details markdown="1">
<summary>Minimal <code>pom.xml</code></summary>

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>demo</artifactId>
  <version>1.0.0</version>
  <packaging>jar</packaging>

  <properties>
    <maven.compiler.release>21</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.11.4</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
</project>
```

</details>

<details markdown="1">
<summary>Minimal <code>build.gradle.kts</code></summary>

```kotlin
plugins {
    java
}

group = "com.example"
version = "1.0.0"

java {
    toolchain { languageVersion = JavaLanguageVersion.of(21) }
}

repositories { mavenCentral() }

dependencies {
    testImplementation(platform("org.junit:junit-bom:5.11.4"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test { useJUnitPlatform() }
```

</details>

## JavaScript and TypeScript
{: #javascript }

**Deep dive:** [npm, pnpm and Yarn](/posts/devops/build-tools/javascript/npm-pnpm-yarn-build/), [JavaScript Bundlers](/posts/devops/build-tools/javascript/javascript-bundlers-build/)

Node.js projects separate the **package manager** (npm, pnpm, Yarn, Bun) from the **build step**
(TypeScript compiler, bundler). The `scripts` block in `package.json` is the contract CI calls. Use
`npm ci` (or `pnpm install --frozen-lockfile`) in pipelines so the lockfile is enforced.

{% include flow-anim.html id="devops/build-tools/javascript/node-package-ci-pipeline" %}

| Category | Common tools |
|---|---|
| Build tools / bundlers | `tsc`, Vite, webpack, esbuild, Rollup, SWC, Turbopack; monorepos: Nx, Turborepo |
| Package manager / registry | npm, pnpm, Yarn, Bun; npmjs.com registry, private Artifactory / Verdaccio |
| Build files | `package.json`, `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` / `bun.lock`, `.npmrc`, `.nvmrc`, `tsconfig.json`, `vite.config.ts`, `webpack.config.js`, `eslint.config.js`, `.prettierrc`, `turbo.json`, `nx.json` |
| Lint and format | ESLint (+ typescript-eslint), Prettier, Biome |
| SAST (open source) | Semgrep, CodeQL, `eslint-plugin-security`, SonarQube Community Build |
| SAST (commercial) | Checkmarx One, Veracode, Snyk Code, OpenText Fortify, SonarQube Server |
| SCA / dependency scanning | `npm audit`, `pnpm audit`, Retire.js, OSV-Scanner, Trivy, Snyk Open Source, Socket, Mend, Black Duck |
| Frameworks | React, Angular, Vue, Svelte, Next.js, Nuxt; back end: Express, NestJS, Fastify |
| Test and coverage | Jest, Vitest, Mocha, Playwright, Cypress; coverage via Istanbul / `c8` / V8 |
| Build output | `dist/` bundle, npm package tarball (`.tgz`), container image |
| CI cache | `~/.npm`, pnpm store, `~/.cache/yarn`, `node_modules/.cache` |

**One example per tool category**

```bash
npm ci && npm run build                          # install from lockfile + build
npx eslint . --max-warnings 0                    # lint
npx prettier --check .                           # format check
semgrep scan --config p/javascript --error       # SAST
npm audit --audit-level=high                     # SCA
npx vitest run --coverage                        # test + coverage
npm pack                                         # package as .tgz
```

<details markdown="1">
<summary>Minimal <code>package.json</code></summary>

```json
{
  "name": "demo",
  "version": "1.0.0",
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "eslint .",
    "test": "vitest run --coverage"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "^3.0.0",
    "eslint": "^9.0.0",
    "typescript": "^5.6.0",
    "vitest": "^3.0.0"
  }
}
```

</details>

## Python
{: #python }

**Deep dive:** [pip, setuptools and build](/posts/devops/build-tools/python/pip-setuptools-build/), [uv and Poetry](/posts/devops/build-tools/python/uv-poetry-build/)

Python packaging has converged on **`pyproject.toml`** (PEP 517/518/621): it declares the build
backend (setuptools, hatchling, poetry-core, pdm-backend) and project metadata in one file.
`requirements.txt` is still common for applications that are not packaged. uv has become the fast
default for resolving, locking and building.

{% include flow-anim.html id="devops/build-tools/python/pip-ci-pipeline" %}

| Category | Common tools |
|---|---|
| Build tools | `build` (PyPA), setuptools, hatchling, Poetry, uv, PDM, Hatch; task runners: tox, nox |
| Package manager / registry | pip, uv, Poetry, Pipenv, conda; PyPI, private Artifactory / devpi |
| Build files | `pyproject.toml`, `requirements.txt`, `uv.lock`, `poetry.lock`, `Pipfile` / `Pipfile.lock`, `setup.py` / `setup.cfg` (legacy), `MANIFEST.in`, `tox.ini`, `noxfile.py`, `environment.yml`, `.python-version` |
| Lint and format | Ruff, Black, Flake8, Pylint, isort; type checking: mypy, Pyright |
| SAST (open source) | Bandit, Semgrep, CodeQL, SonarQube Community Build |
| SAST (commercial) | Checkmarx One, Veracode, Snyk Code, OpenText Fortify, SonarQube Server |
| SCA / dependency scanning | pip-audit, Safety, OSV-Scanner, Trivy, Snyk Open Source, Mend, Black Duck |
| Frameworks | Django, Flask, FastAPI; data/ML: pandas, PyTorch |
| Test and coverage | pytest, unittest, Hypothesis; coverage.py / pytest-cov |
| Build output | wheel (`.whl`), source distribution (`.tar.gz`), container image |
| CI cache | `~/.cache/pip`, `~/.cache/uv`, `~/.cache/pypoetry` |

**One example per tool category**

```bash
uv sync --locked && uv build                     # install from lockfile + build wheel/sdist
python -m build                                  # build (PyPA build, any backend)
ruff check . && ruff format --check .            # lint + format
mypy src                                         # type check
bandit -r src -ll                                # SAST (medium severity and above)
pip-audit                                        # SCA
pytest --cov=src --cov-fail-under=80             # test + coverage gate
```

<details markdown="1">
<summary>Minimal <code>pyproject.toml</code></summary>

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "demo"
version = "1.0.0"
requires-python = ">=3.11"
dependencies = ["fastapi>=0.115"]

[project.optional-dependencies]
dev = ["pytest", "pytest-cov", "ruff", "bandit", "pip-audit"]

[tool.ruff]
line-length = 100
```

</details>

## Go
{: #go }

**Deep dive:** [Go Build](/posts/devops/build-tools/go/go-build/)

Go ships its build system in the toolchain: `go build`, `go test`, `go vet` and modules need no extra
tool. Teams add a `Makefile` or Taskfile for orchestration and GoReleaser for cross-compiled
releases. Set `CGO_ENABLED=0` to get static binaries that fit in `scratch` or distroless images.

{% include flow-anim.html id="devops/build-tools/go/go-ci-pipeline" %}

| Category | Common tools |
|---|---|
| Build tools | `go build`, Make, Task, Mage, GoReleaser, Bazel (`rules_go`), ko (container images) |
| Package manager / registry | Go modules, `proxy.golang.org`, `GOPROXY` via Artifactory / Athens |
| Build files | `go.mod`, `go.sum`, `go.work`, `Makefile`, `Taskfile.yml`, `.goreleaser.yaml`, `.golangci.yml` |
| Lint and format | `gofmt`, `go vet`, golangci-lint, staticcheck |
| SAST (open source) | gosec, Semgrep, CodeQL, SonarQube Community Build |
| SAST (commercial) | Checkmarx One, Veracode, Snyk Code, OpenText Fortify, SonarQube Server |
| SCA / dependency scanning | govulncheck (reachability-aware), OSV-Scanner, Trivy, Grype, Snyk Open Source, Mend |
| Frameworks | `net/http`, Gin, Echo, Fiber, chi; gRPC-Go; Cobra (CLIs) |
| Test and coverage | `go test` (`testing`), testify, gomock; `go test -cover`, `go tool cover` |
| Build output | Single static binary; multi-arch archives via GoReleaser; images via ko |
| CI cache | `~/go/pkg/mod`, `~/.cache/go-build` |

**One example per tool category**

```bash
CGO_ENABLED=0 go build -trimpath -o bin/app ./cmd/app   # build
golangci-lint run                                # lint (bundles vet, staticcheck, ...)
gosec ./...                                      # SAST
govulncheck ./...                                # SCA (only reports reachable vulnerable code)
go test -race -coverprofile=cover.out ./...      # test + coverage
goreleaser release --snapshot --clean            # package multi-platform release
```

<details markdown="1">
<summary>Minimal <code>go.mod</code></summary>

```text
module github.com/example/demo

go 1.24

require github.com/gin-gonic/gin v1.10.0
```

</details>

## .NET (C#, F#, VB.NET)
{: #dotnet }

**Deep dive:** [DotNet Build](/posts/devops/build-tools/dotnet/dotnet-build/)

The `dotnet` CLI wraps MSBuild and NuGet. SDK-style project files are small, and
`Directory.Build.props` / `Directory.Packages.props` centralise settings and package versions across
a solution. Pin the SDK with `global.json`. Since .NET 8, `dotnet restore` runs NuGet audit and
warns about vulnerable packages. See also [DotNet Build](/posts/devops/build-tools/dotnet/dotnet-build/).

{% include flow-anim.html id="devops/build-tools/dotnet/dotnet-ci-pipeline" %}

| Category | Common tools |
|---|---|
| Build tools | `dotnet` CLI, MSBuild, Visual Studio Build Tools; build scripting: Cake, NUKE, FAKE (F#) |
| Package manager / registry | NuGet, nuget.org, Azure Artifacts, private Artifactory / ProGet |
| Build files | `*.csproj` / `*.fsproj` / `*.vbproj`, `*.sln` / `*.slnx`, `Directory.Build.props`, `Directory.Packages.props`, `global.json`, `nuget.config`, `packages.lock.json`, `.editorconfig`, `build.cake` |
| Lint and format | .NET (Roslyn) analyzers, StyleCop.Analyzers, `dotnet format` |
| SAST (open source) | Roslyn security analyzers, Semgrep, CodeQL, SonarQube Community Build |
| SAST (commercial) | Checkmarx One, OpenText Fortify, Veracode, Snyk Code, SonarQube Server |
| SCA / dependency scanning | NuGet audit, `dotnet list package --vulnerable`, OWASP Dependency-Check, Trivy, Snyk, Mend, Black Duck |
| Frameworks | ASP.NET Core, Blazor, .NET MAUI, Entity Framework Core, WPF / WinForms |
| Test and coverage | xUnit, NUnit, MSTest; Coverlet + ReportGenerator |
| Build output | `.dll` / `.exe`, `dotnet publish` folder, NuGet package (`.nupkg`), container image via `dotnet publish /t:PublishContainer` |
| CI cache | `~/.nuget/packages` |

**One example per tool category**

```bash
dotnet restore --locked-mode && dotnet build -c Release --no-restore   # build
dotnet format --verify-no-changes                # lint / format
dotnet build -c Release -warnaserror             # analyzers as a gate
dotnet list package --vulnerable --include-transitive   # SCA
dotnet test --collect:"XPlat Code Coverage"      # test + coverage (Coverlet)
dotnet pack -c Release -o out                    # package as .nupkg
```

<details markdown="1">
<summary>Minimal <code>Demo.csproj</code></summary>

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <AnalysisLevel>latest-recommended</AnalysisLevel>
    <RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>
  </PropertyGroup>
</Project>
```

</details>

## C and C++
{: #cpp }

**Deep dive:** [CMake, Ninja, Conan and vcpkg](/posts/devops/build-tools/cpp/cmake-build/), [Make and Autotools](/posts/devops/build-tools/cpp/make-autotools-build/)

C and C++ have no single standard build tool or package manager. CMake is the de facto meta-build
system (it generates Ninja, Make or MSBuild files), with Conan or vcpkg for dependencies. Because
dependencies are often vendored or built from source, SCA is harder than in other languages, and
commercial snippet-level scanners are common in regulated industries.

{% include flow-anim.html id="devops/build-tools/cpp/cmake-ci-pipeline" %}

| Category | Common tools |
|---|---|
| Build tools | CMake, Ninja, Make, Meson, Bazel, MSBuild, Autotools, SCons; compilers: GCC, Clang, MSVC; ccache / sccache |
| Package manager / registry | Conan, vcpkg, system packages (apt, dnf), Artifactory (Conan remote) |
| Build files | `CMakeLists.txt`, `CMakePresets.json`, `Makefile`, `meson.build`, `conanfile.txt` / `conanfile.py`, `vcpkg.json`, `configure.ac` / `Makefile.am`, `MODULE.bazel` / `BUILD.bazel`, `.clang-format`, `.clang-tidy` |
| Lint and format | clang-tidy, cppcheck, clang-format, cpplint, include-what-you-use |
| SAST (open source) | cppcheck, Flawfinder, CodeQL, Semgrep; runtime: ASan / UBSan / TSan, fuzzing with libFuzzer / AFL++ |
| SAST (commercial) | Coverity, Klocwork, Polyspace, CodeSonar, Parasoft C/C++test, OpenText Fortify, Checkmarx One, SonarQube Server |
| SCA / dependency scanning | Black Duck (snippet matching), Mend, Snyk (C/C++ unmanaged), Trivy / Grype on Conan or vcpkg manifests |
| Frameworks / libraries | Qt, Boost, POCO, gRPC, Abseil |
| Test and coverage | GoogleTest, Catch2, doctest, CTest; gcov / lcov / gcovr, `llvm-cov` |
| Build output | Executables, static (`.a` / `.lib`) and shared (`.so` / `.dll` / `.dylib`) libraries, Conan packages |
| CI cache | ccache directory, Conan cache (`~/.conan2`), vcpkg binary cache |

**One example per tool category**

```bash
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release && cmake --build build   # build
clang-tidy -p build src/*.cpp                    # lint (uses compile_commands.json)
cppcheck --enable=warning,performance --error-exitcode=1 src/   # SAST
conan install . --build=missing                  # restore dependencies
ctest --test-dir build --output-on-failure       # test
gcovr -r . --fail-under-line 80                  # coverage gate
```

<details markdown="1">
<summary>Minimal <code>CMakeLists.txt</code></summary>

```cmake
cmake_minimum_required(VERSION 3.25)
project(demo VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

add_executable(demo src/main.cpp)

enable_testing()
find_package(GTest REQUIRED)
add_executable(demo_tests tests/demo_test.cpp)
target_link_libraries(demo_tests GTest::gtest_main)
add_test(NAME demo_tests COMMAND demo_tests)
```

</details>

## Rust
{: #rust }

**Deep dive:** [Rust Build with Cargo](/posts/devops/build-tools/rust/cargo-build/)

Cargo is build tool, package manager, test runner and documentation generator in one. `rustup`
plus `rust-toolchain.toml` pins the compiler. Commit `Cargo.lock` for binaries and build with
`--locked` in CI. See also
[Rust Build and Deployment Tools Guide](/posts/devops/rust-build-deploy/).

{% include flow-anim.html id="devops/build-tools/rust/cargo-ci-pipeline" %}

| Category | Common tools |
|---|---|
| Build tools | Cargo, rustup, cargo-make, cross (cross-compilation), cargo-dist, maturin (Python extensions), Bazel (`rules_rust`) |
| Package manager / registry | Cargo, crates.io, private registries (Artifactory, Cloudsmith) |
| Build files | `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml`, `.cargo/config.toml`, `build.rs`, `rustfmt.toml`, `clippy.toml`, `deny.toml` |
| Lint and format | rustfmt, Clippy |
| SAST (open source) | Clippy (correctness and suspicious lints), Semgrep, CodeQL, cargo-geiger (`unsafe` usage) |
| SAST (commercial) | Snyk Code, Checkmarx One, Veracode |
| SCA / dependency scanning | cargo-audit (RustSec), cargo-deny (advisories, licences, bans), OSV-Scanner, Trivy, Snyk Open Source, Mend |
| Frameworks | Tokio, Axum, Actix Web, Rocket, Tauri, Leptos |
| Test and coverage | `cargo test`, cargo-nextest, proptest, criterion (benchmarks); cargo-llvm-cov, cargo-tarpaulin |
| Build output | Native binary, `.rlib`, crate package (`.crate`), Python wheel via maturin |
| CI cache | `~/.cargo/registry`, `~/.cargo/git`, `target/` (or sccache) |

**One example per tool category**

```bash
cargo build --release --locked                   # build
cargo fmt --check                                # format
cargo clippy --all-targets -- -D warnings        # lint as a gate
cargo audit                                      # SCA (RustSec advisories)
cargo deny check                                 # advisories, licences, banned crates
cargo llvm-cov --fail-under-lines 80             # test + coverage gate
```

<details markdown="1">
<summary>Minimal <code>Cargo.toml</code></summary>

```toml
[package]
name = "demo"
version = "1.0.0"
edition = "2024"
rust-version = "1.85"

[dependencies]
tokio = { version = "1", features = ["full"] }
axum = "0.8"

[profile.release]
lto = true
codegen-units = 1
```

</details>

## Ruby
{: #ruby }

**Deep dive:** [Bundler and Rake](/posts/devops/build-tools/ruby/bundler-rake-build/)

Bundler resolves and locks gems; Rake is the task runner. New Rails applications ship with Brakeman
and RuboCop already wired in, so the security and lint steps usually only need adding to CI.

{% include flow-anim.html id="devops/build-tools/ruby/bundler-rake-ci-pipeline" %}

| Category | Common tools |
|---|---|
| Build tools | Rake, Bundler, `gem build`; version managers: rbenv, rvm, asdf / mise |
| Package manager / registry | Bundler, RubyGems.org, private gem server (Artifactory, Gemfury) |
| Build files | `Gemfile`, `Gemfile.lock`, `*.gemspec`, `Rakefile`, `.ruby-version`, `config.ru`, `.rubocop.yml` |
| Lint and format | RuboCop, Standard, Reek |
| SAST (open source) | Brakeman (Rails), Semgrep, CodeQL, SonarQube Community Build |
| SAST (commercial) | Checkmarx One, Veracode, Snyk Code, SonarQube Server |
| SCA / dependency scanning | bundler-audit, OSV-Scanner, Trivy, Snyk Open Source, Mend |
| Frameworks | Ruby on Rails, Sinatra, Hanami |
| Test and coverage | RSpec, Minitest, Capybara; SimpleCov |
| Build output | `.gem` package, container image |
| CI cache | `vendor/bundle` (with `BUNDLE_PATH`) |

**One example per tool category**

```bash
bundle install --jobs 4 && bundle exec rake build   # install + build
bundle exec rubocop                              # lint
bundle exec brakeman --no-pager                  # SAST (Rails)
bundle exec bundle-audit check --update          # SCA
bundle exec rspec                                # test (SimpleCov loaded in spec_helper)
gem build demo.gemspec                           # package as .gem
```

<details markdown="1">
<summary>Minimal <code>Gemfile</code></summary>

```ruby
source "https://rubygems.org"

ruby "3.3.6"

gem "rails", "~> 8.0"

group :development, :test do
  gem "rspec-rails"
  gem "rubocop", require: false
  gem "brakeman", require: false
  gem "bundler-audit", require: false
  gem "simplecov", require: false
end
```

</details>

## PHP
{: #php }

**Deep dive:** [Composer](/posts/devops/build-tools/php/composer-build/)

Composer handles dependencies, autoloading and scripts. PHP is interpreted, so "build" usually means
installing production dependencies, optimising the autoloader and running static analysis (PHPStan
or Psalm), which also does much of the work a compiler does in other languages.

{% include flow-anim.html id="devops/build-tools/php/composer-ci-pipeline" %}

| Category | Common tools |
|---|---|
| Build tools | Composer (scripts + autoload), Phing, Box (PHAR packaging) |
| Package manager / registry | Composer, Packagist, private Satis / Private Packagist / Artifactory |
| Build files | `composer.json`, `composer.lock`, `auth.json`, `phpunit.xml.dist`, `phpstan.neon`, `psalm.xml`, `.php-cs-fixer.dist.php`, `phpcs.xml` |
| Lint and format | PHP_CodeSniffer, PHP-CS-Fixer, PHPStan, Psalm |
| SAST (open source) | Psalm taint analysis, Semgrep, SonarQube Community Build |
| SAST (commercial) | Checkmarx One, Veracode, Snyk Code, OpenText Fortify, SonarQube Server |
| SCA / dependency scanning | `composer audit`, Roave Security Advisories, OSV-Scanner, Trivy, Snyk Open Source, Mend |
| Frameworks | Laravel, Symfony, Laminas, WordPress, Drupal |
| Test and coverage | PHPUnit, Pest, Codeception; coverage via Xdebug or PCOV |
| Build output | `vendor/` + source deployed as a container image, PHAR archive |
| CI cache | Composer cache (`composer config cache-dir`) |

**One example per tool category**

```bash
composer install --no-dev --optimize-autoloader --no-interaction   # production build
vendor/bin/php-cs-fixer fix --dry-run --diff     # format check
vendor/bin/phpstan analyse src --level=6         # static analysis
vendor/bin/psalm --taint-analysis                # SAST (taint tracking)
composer audit                                   # SCA
vendor/bin/phpunit --coverage-text               # test + coverage
```

<details markdown="1">
<summary>Minimal <code>composer.json</code></summary>

```json
{
  "name": "example/demo",
  "type": "project",
  "require": {
    "php": "^8.3",
    "symfony/http-foundation": "^7.1"
  },
  "require-dev": {
    "phpunit/phpunit": "^11.0",
    "phpstan/phpstan": "^2.0"
  },
  "autoload": {
    "psr-4": { "App\\": "src/" }
  },
  "scripts": {
    "test": "phpunit",
    "analyse": "phpstan analyse src"
  }
}
```

</details>

## Mobile: Swift (iOS) and Kotlin (Android)
{: #mobile }

**Deep dive:** [iOS: Xcode and SwiftPM](/posts/devops/build-tools/swift/xcode-swiftpm-build/), [Android Gradle Build](/posts/devops/build-tools/android/android-gradle-build/)

Mobile builds add code signing, provisioning and store packaging on top of a normal build. iOS
builds need macOS runners with Xcode; Android builds run on any OS with the Android SDK and the
Android Gradle Plugin (AGP). fastlane is the common automation layer for both.

{% include flow-anim.html id="devops/build-tools/swift/xcode-ci-pipeline" %}

{% include flow-anim.html id="devops/build-tools/android/android-gradle-ci-pipeline" %}

| Category | iOS (Swift) | Android (Kotlin) |
|---|---|---|
| Build tools | Xcode / `xcodebuild`, Swift Package Manager, Tuist, fastlane | Gradle + Android Gradle Plugin, fastlane |
| Package manager | SwiftPM, CocoaPods (maintenance mode), Carthage | Gradle (Maven Central, Google Maven) |
| Build files | `Package.swift`, `Package.resolved`, `*.xcodeproj` / `*.xcworkspace`, `*.xcconfig`, `Info.plist`, `ExportOptions.plist`, `Podfile` / `Podfile.lock`, `Fastfile`, `Appfile` | `build.gradle.kts`, `settings.gradle.kts`, `gradle.properties`, `gradle/libs.versions.toml`, `AndroidManifest.xml`, `proguard-rules.pro`, `gradlew`, `Fastfile` |
| Lint and format | SwiftLint, SwiftFormat | Android Lint, ktlint, detekt |
| SAST (open source) | MobSF, Semgrep, CodeQL | MobSF, Semgrep, CodeQL, Android Lint security checks |
| SAST (commercial) | NowSecure, Checkmarx One, Veracode, Snyk Code, SonarQube Server | NowSecure, Guardsquare AppSweep, Checkmarx One, Veracode, Snyk Code |
| SCA | Snyk, Mend, OSV-Scanner (`Package.resolved`) | OWASP Dependency-Check, Snyk, Mend, Trivy |
| Frameworks | SwiftUI, UIKit, Combine | Jetpack Compose, Android Jetpack; cross-platform: Flutter, React Native, Kotlin Multiplatform |
| Test and coverage | XCTest, Swift Testing, XCUITest; Xcode coverage (`xccov`) | JUnit, Espresso, Robolectric; JaCoCo, Kover |
| Build output | `.xcarchive`, `.ipa` | `.apk`, `.aab` (Play Store) |
| CI cache | SwiftPM `.build/`, DerivedData, CocoaPods `Pods/` | `~/.gradle/caches`, `~/.gradle/wrapper` |

**One example per tool category**

```bash
# iOS
swift build -c release                           # build a Swift package
xcodebuild -scheme Demo -configuration Release archive -archivePath build/Demo.xcarchive   # app archive
swiftlint --strict                               # lint
xcodebuild test -scheme Demo -destination 'platform=iOS Simulator,name=iPhone 16' -enableCodeCoverage YES

# Android
./gradlew lint                                   # lint (Android Lint)
./gradlew testDebugUnitTest                      # unit tests
./gradlew bundleRelease                          # signed .aab for the Play Store
```

<details markdown="1">
<summary>Minimal <code>Package.swift</code></summary>

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "Demo",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [.library(name: "Demo", targets: ["Demo"])],
    targets: [
        .target(name: "Demo"),
        .testTarget(name: "DemoTests", dependencies: ["Demo"])
    ]
)
```

</details>

## Cross-language scanners
{: #cross-language-scanners }

Most organisations run one or two of these across every repository instead of a different scanner
per language. Language-specific tools above are still worth keeping because they understand the
language more deeply and run fast as pre-commit or PR checks.

| Tool | Type | Licence | Example |
|---|---|---|---|
| SonarQube (Community Build / Server / Cloud) | Code quality + SAST | Open source community build; commercial editions | `sonar-scanner -Dsonar.projectKey=demo` |
| Semgrep | SAST | Open source CE; commercial AppSec Platform | `semgrep scan --config auto --error` |
| CodeQL | SAST | Free for public repos; GitHub Advanced Security for private | GitHub code scanning default setup |
| Trivy | SCA, container, IaC, secrets | Open source | `trivy fs --scanners vuln,secret .` |
| Syft + Grype | SBOM + SCA | Open source | `syft dir:. -o cyclonedx-json > sbom.json && grype sbom:sbom.json --fail-on high` |
| OSV-Scanner | SCA | Open source | `osv-scanner scan source -r .` |
| OWASP Dependency-Check | SCA (strongest for Java and .NET) | Open source | `dependency-check --scan . --failOnCVSS 7` |
| Gitleaks / TruffleHog | Secrets | Open source | `gitleaks git .` |
| Dependabot / Renovate | Dependency updates | Free / open source | Config in `.github/dependabot.yml` or `renovate.json` |
| Snyk | SCA, SAST, container, IaC | Commercial (free tier) | `snyk test --severity-threshold=high` |
| Checkmarx One | SAST, SCA, IaC | Commercial | `cx scan create --project-name demo -s .` |
| OpenText Fortify | SAST, DAST | Commercial | `sourceanalyzer -b demo -scan -f demo.fpr` |
| Veracode | SAST, SCA, DAST | Commercial | Upload-and-scan or pipeline scan |
| Black Duck | SCA (incl. snippet / licence) and Coverity SAST | Commercial | `detect.sh` (Synopsys/Black Duck Detect) |
| Mend | SCA (+ Renovate) | Commercial | Unified agent / Mend CLI |
| JFrog Xray | SCA on stored artifacts | Commercial | Policies on Artifactory repositories |

More on several of these: [DevSecOps](/posts/devsecops/devsecops/),
[SonarQube](/posts/devsecops/sonarqube/sonarqube-getting-started/), [Snyk](/posts/devsecops/snyk/snyk/),
[Checkmarx](/posts/devsecops/checkmarx/checkmarx/) and [Fortify](/posts/devsecops/fortify/fortify/).

## The architect's view
{: #architects-view }

A DevOps architect rarely picks the build tool (the language community already has). The job is to
make many ecosystems behave the same way in the pipeline.

- **Golden pipeline templates.** Publish one reusable template per language (GitHub Actions reusable
  workflows, GitLab CI includes, Azure DevOps templates) with the same stages: restore, lint, build,
  test, SAST, SCA, package, publish. Teams only override parameters.
- **Pin everything.** Commit lockfiles (`package-lock.json`, `poetry.lock`, `Cargo.lock`,
  `packages.lock.json`, `go.sum`), wrappers (`mvnw`, `gradlew`) and toolchain files (`global.json`,
  `rust-toolchain.toml`, `.nvmrc`, `.python-version`). Builds should fail when the lockfile is out of
  date (`npm ci`, `--locked`, `--frozen-lockfile`, `--locked-mode`).
- **One artifact repository as proxy.** Route Maven, npm, PyPI, NuGet, Go, Cargo and container pulls
  through Artifactory or Nexus. It caches, blocks malicious packages and gives SCA a single choke
  point. See [Artifact Management](/posts/artifacts/artifact-management/) and
  [JFrog Artifactory](/posts/artifacts/jfrog-artifactory/).
- **Layered scanning.** Fast language-native tools on every PR (linters, `npm audit`, govulncheck,
  cargo-audit); a central platform (SonarQube, Snyk, Checkmarx, Fortify, Veracode) for governance and
  reporting; container and SBOM scanning after packaging.
- **Quality gates as policy.** Agree on thresholds once: no critical or high CVEs with a fix
  available, no new SAST findings above medium, coverage on new code at or above a set percentage, no
  secrets. Enforce them in the template, not in each repository.
- **SBOM and provenance.** Generate a CycloneDX or SPDX SBOM for every release
  (`cyclonedx-maven-plugin`, `@cyclonedx/cyclonedx-npm`, `cyclonedx-py`, `cyclonedx-gomod`,
  `cargo-cyclonedx`, CycloneDX for .NET, or Syft for everything), sign artifacts with Sigstore
  `cosign`, and record build provenance to reach the SLSA levels you need.
- **Reproducible, hermetic builds.** Prefer containerised build agents with pinned images, cache
  dependency directories (listed per language above), and avoid network access during the compile
  step where the toolchain allows it.

| Language | SBOM generator | Lockfile to commit | Toolchain pin |
|---|---|---|---|
| Java / Kotlin | `cyclonedx-maven-plugin`, CycloneDX Gradle plugin | Gradle lockfile (optional) | `mvnw`, `gradlew`, Gradle toolchains |
| JavaScript / TypeScript | `@cyclonedx/cyclonedx-npm` | `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` | `.nvmrc`, `engines`, `packageManager` |
| Python | `cyclonedx-py` | `uv.lock` / `poetry.lock` / pinned `requirements.txt` | `.python-version` |
| Go | `cyclonedx-gomod` | `go.sum` | `go` / `toolchain` lines in `go.mod` |
| .NET | CycloneDX for .NET | `packages.lock.json` | `global.json` |
| C / C++ | Conan / vcpkg SBOM, Syft | `conan.lock`, `vcpkg.json` baseline | Toolchain files, container image |
| Rust | `cargo-cyclonedx` | `Cargo.lock` | `rust-toolchain.toml` |
| Ruby | `cyclonedx-ruby`, Syft | `Gemfile.lock` | `.ruby-version` |
| PHP | `cyclonedx/cyclonedx-php-composer` | `composer.lock` | `require.php` in `composer.json` |
| Swift / Android | Syft, CycloneDX Gradle plugin | `Package.resolved`, Gradle lockfile | Xcode version on runner, `gradlew` |

## Related posts
{: #related-posts }

Language deep dives in this series:

- [Maven Build](/posts/devops/build-tools/java/maven-build/)
- [Gradle Build](/posts/devops/build-tools/java/gradle-build/)
- [npm, pnpm and Yarn](/posts/devops/build-tools/javascript/npm-pnpm-yarn-build/)
- [JavaScript Bundlers](/posts/devops/build-tools/javascript/javascript-bundlers-build/)
- [pip, setuptools and build](/posts/devops/build-tools/python/pip-setuptools-build/)
- [uv and Poetry](/posts/devops/build-tools/python/uv-poetry-build/)
- [Go Build](/posts/devops/build-tools/go/go-build/)
- [DotNet Build](/posts/devops/build-tools/dotnet/dotnet-build/)
- [CMake, Ninja, Conan and vcpkg](/posts/devops/build-tools/cpp/cmake-build/)
- [Make and Autotools](/posts/devops/build-tools/cpp/make-autotools-build/)
- [Rust Build with Cargo](/posts/devops/build-tools/rust/cargo-build/)
- [Bundler and Rake](/posts/devops/build-tools/ruby/bundler-rake-build/)
- [Composer](/posts/devops/build-tools/php/composer-build/)
- [iOS: Xcode and SwiftPM](/posts/devops/build-tools/swift/xcode-swiftpm-build/)
- [Android Gradle Build](/posts/devops/build-tools/android/android-gradle-build/)

Other related posts:

- [CI/CD](/posts/devops/cicd/cicd/)
- [Python Build and Deployment Tools Guide](/posts/devops/cicd/python-build-deploy/)
- [Rust Build and Deployment Tools Guide](/posts/devops/rust-build-deploy/)
- [Artifact Management](/posts/artifacts/artifact-management/)
- [DevSecOps](/posts/devsecops/devsecops/)
