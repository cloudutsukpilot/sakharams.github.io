---
layout: post
title: "Gradle Build: Phases, Build Files, Scanners and CI"
categories: [devops, build-tools, java]
tags: [DevOps, Build-Tools, Java, Kotlin, Gradle, SAST, SCA]
description: How Gradle builds JVM projects, which files it needs, how to lint, scan and test with it, and a complete GitHub Actions pipeline.
mermaid: true
image:
  path: /assets/img/devops/build-tools/java/gradle-build.webp
  alt: "DevOps pipeline loop motif with the title Gradle Build"
---

Gradle is the main alternative to Maven on the JVM and the only build tool for Android. Builds are
written as code (Kotlin or Groovy DSL) and modelled as a graph of tasks. Incremental builds, the
build cache and the configuration cache make Gradle fast on large multi-project repositories.

<!-- more -->

This post is part of [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/).
For the declarative alternative see [Maven Build](/posts/devops/build-tools/java/maven-build/).
{: .prompt-info }

## At a glance

| Category | Common tools |
|---|---|
| Build tool | Gradle 8+, Gradle Wrapper (`gradlew`) |
| Package registry | Maven Central, Gradle Plugin Portal, private Artifactory / Nexus |
| Build files | `settings.gradle.kts`, `build.gradle.kts`, `gradle.properties`, `gradle/libs.versions.toml`, `gradlew`, `gradle/wrapper/gradle-wrapper.properties` |
| Lint and format | Spotless, Checkstyle, PMD, ktlint and detekt (Kotlin) |
| SAST (open source) | SpotBugs + FindSecBugs, Semgrep, CodeQL, SonarQube Community Build |
| SAST (commercial) | Checkmarx One, OpenText Fortify, Veracode, SonarQube Server |
| SCA | OWASP Dependency-Check plugin, Trivy, Snyk, Mend, Black Duck, GitHub dependency submission |
| Frameworks | Spring Boot, Micronaut, Ktor, Quarkus |
| Test and coverage | JUnit 5, Kotest, Mockito / MockK, JaCoCo, Kover |
| Build output | `.jar`, `.war`, distribution zip, container image via Jib |
| CI cache | `~/.gradle/caches`, `~/.gradle/wrapper` (handled by `gradle/actions/setup-gradle`) |

## How the build works

Every Gradle build runs in three phases. Tasks are then executed in dependency order, and a task
whose inputs and outputs have not changed is skipped (`UP-TO-DATE`) or restored from the build cache
(`FROM-CACHE`).

In CI, each stage of the [generic build pipeline](/posts/devops/build-tools/language-build-ecosystem/#generic-pipeline) maps to a Gradle command, plugin or scanner. Press play, or step through it:

{% include flow-anim.html id="devops/build-tools/java/gradle-ci-pipeline" %}

- `build` = `assemble` (produce artifacts) + `check` (tests and verification tasks).
- Plugins such as `jacoco`, `checkstyle` or SpotBugs add tasks and hook them into `check`.
- `--configuration-cache` caches the configuration phase; `--build-cache` reuses task outputs
  between machines.

## Build files

| File | Purpose | Commit? |
|---|---|---|
| `settings.gradle.kts` | Root project name, included subprojects, plugin and dependency repositories | Yes |
| `build.gradle.kts` | Plugins, dependencies and task configuration per project | Yes |
| `gradle.properties` | Build flags (`org.gradle.caching=true`, JVM args) | Yes (no secrets) |
| `gradle/libs.versions.toml` | Version catalog: one place for all dependency and plugin versions | Yes |
| `gradlew`, `gradlew.bat`, `gradle/wrapper/*` | Wrapper scripts, jar and pinned Gradle version | Yes |
| `gradle/verification-metadata.xml` | Dependency checksum / signature verification | Yes |
| `buildSrc/` or `build-logic/` | Convention plugins shared by subprojects | Yes |
| `~/.gradle/gradle.properties` | Repository credentials, signing keys | No |
| `build/`, `.gradle/` | Outputs and local caches | No (`.gitignore`) |

## Commands by category

```bash
./gradlew build                                  # compile + test + check
./gradlew spotlessCheck                          # format check
./gradlew spotbugsMain                           # SAST (com.github.spotbugs plugin)
./gradlew dependencyCheckAnalyze                 # SCA (org.owasp.dependencycheck plugin)
./gradlew test jacocoTestReport                  # tests + coverage
./gradlew cyclonedxBom                           # SBOM (org.cyclonedx.bom plugin)
./gradlew dependencies --configuration runtimeClasspath   # inspect the dependency graph
./gradlew build --scan                           # publish a Build Scan for troubleshooting
```

## Minimal project

A version catalog plus a Kotlin DSL build script with coverage, SpotBugs, Dependency-Check and SBOM.

```toml
# gradle/libs.versions.toml
[versions]
junit = "5.11.4"

[libraries]
junit-bom = { module = "org.junit:junit-bom", version.ref = "junit" }

[plugins]
spotbugs = { id = "com.github.spotbugs", version = "6.0.26" }
dependencycheck = { id = "org.owasp.dependencycheck", version = "11.1.1" }
cyclonedx = { id = "org.cyclonedx.bom", version = "1.10.0" }
```

```kotlin
// build.gradle.kts
plugins {
    java
    jacoco
    alias(libs.plugins.spotbugs)
    alias(libs.plugins.dependencycheck)
    alias(libs.plugins.cyclonedx)
}

group = "com.example"
version = "1.0.0"

java { toolchain { languageVersion = JavaLanguageVersion.of(21) } }

repositories { mavenCentral() }

dependencies {
    testImplementation(platform(libs.junit.bom))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
    finalizedBy(tasks.jacocoTestReport)
}

tasks.jacocoTestCoverageVerification {
    violationRules { rule { limit { minimum = "0.80".toBigDecimal() } } }
}
tasks.check { dependsOn(tasks.jacocoTestCoverageVerification) }

dependencyCheck { failBuildOnCVSS = 7.0f }
```

Plugin versions move quickly; check the Gradle Plugin Portal for the latest release before copying.
{: .prompt-tip }

## Frameworks

| Framework | Start a Gradle project |
|---|---|
| Spring Boot | `curl https://start.spring.io/starter.zip -d type=gradle-project-kotlin -d dependencies=web -o demo.zip` |
| Micronaut | `mn create-app com.example.demo --build=gradle_kotlin` |
| Ktor | Generate at `start.ktor.io`, or `ktor new` with the Ktor CLI |
| Quarkus | `quarkus create app com.example:demo --gradle-kotlin-dsl` |

## CI with GitHub Actions

{% raw %}
```yaml
name: gradle-ci
on: [push, pull_request]
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
      - uses: gradle/actions/setup-gradle@v4   # caching + wrapper validation

      - name: Build, test, coverage gate, SpotBugs
        run: ./gradlew build

      - name: Dependency scan (SCA)
        run: ./gradlew dependencyCheckAnalyze
        env:
          NVD_API_KEY: ${{ secrets.NVD_API_KEY }}

      - name: SBOM
        run: ./gradlew cyclonedxBom

      - uses: actions/upload-artifact@v4
        with:
          name: demo
          path: |
            build/libs/*.jar
            build/reports/bom.json
```
{% endraw %}

To pass the NVD key from the environment, read it in the build script:
`dependencyCheck { nvd { apiKey = System.getenv("NVD_API_KEY") } }`.
{: .prompt-tip }

## Best practices

- **Commit and validate the wrapper**; `setup-gradle` checks the wrapper jar checksum automatically.
- **Use a version catalog** (`libs.versions.toml`) and **convention plugins** in `build-logic/`
  instead of copying configuration into every subproject or using `allprojects {}`.
- **Use Java toolchains** so the JDK used to compile is declared in the build, not inherited from
  the machine.
- **Turn on caching**: `org.gradle.caching=true` and `org.gradle.configuration-cache=true` in
  `gradle.properties`; use a remote build cache for large teams.
- **Enable dependency verification** (`./gradlew --write-verification-metadata sha256 help`) to
  detect tampered artifacts.
- **Keep credentials out of the repo**: read them from `~/.gradle/gradle.properties` or environment
  variables.

## Related posts

- [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/)
- [Maven Build](/posts/devops/build-tools/java/maven-build/)
- [Android Gradle Build](/posts/devops/build-tools/android/android-gradle-build/)
- [JFrog Artifactory](/posts/artifacts/jfrog-artifactory/)
