---
layout: post
title: "Maven Build: Lifecycle, Build Files, Scanners and CI"
categories: [devops, build-tools, java]
tags: [DevOps, Build-Tools, Java, Maven, SAST, SCA]
description: How Maven builds Java projects, which files it needs, how to lint, scan and test with it, and a complete GitHub Actions pipeline.
mermaid: true
image:
  path: /assets/img/devops/build-tools/java/maven-build.webp
  alt: "DevOps pipeline loop motif with the title Maven Build"
---

Maven is the most widely used build tool for Java. It is declarative: you describe the project in
`pom.xml` and Maven runs a fixed lifecycle of phases, with plugins doing the actual work in each
phase. That predictability is why Maven is still the default in many enterprises and why it is
easy to standardise in CI.

<!-- more -->

This post is part of [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/).
The other common Java build tool is covered in [Gradle Build](/posts/devops/build-tools/java/gradle-build/).
{: .prompt-info }

## At a glance

| Category | Common tools |
|---|---|
| Build tool | Apache Maven 3.9+, Maven Wrapper (`mvnw`) |
| Package registry | Maven Central, private Artifactory / Nexus |
| Build files | `pom.xml`, `mvnw`, `.mvn/wrapper/maven-wrapper.properties`, `.mvn/maven.config`, `~/.m2/settings.xml` |
| Lint and format | Checkstyle, PMD, Spotless, Error Prone |
| SAST (open source) | SpotBugs + FindSecBugs, Semgrep, CodeQL, SonarQube Community Build |
| SAST (commercial) | Checkmarx One, OpenText Fortify, Veracode, Coverity, SonarQube Server |
| SCA | OWASP Dependency-Check, Trivy, Snyk, Mend, Black Duck, JFrog Xray |
| Frameworks | Spring Boot, Quarkus, Micronaut, Jakarta EE |
| Test and coverage | JUnit 5, Mockito, Testcontainers, Surefire / Failsafe, JaCoCo |
| Build output | `.jar`, `.war`, `.ear`, container image via Jib or Buildpacks |
| CI cache | `~/.m2/repository` |

## How the build works

Maven has three built-in lifecycles (`clean`, `default`, `site`). Running a phase runs every phase
before it in the same lifecycle, so `mvn verify` also compiles, tests and packages. Plugins bind
*goals* to phases: for example `maven-compiler-plugin:compile` runs in `compile`, and
`maven-surefire-plugin:test` runs in `test`.

In CI, each stage of the [generic build pipeline](/posts/devops/build-tools/language-build-ecosystem/#generic-pipeline) maps to a Maven command, plugin or scanner. Press play, or step through it:

{% include flow-anim.html id="devops/build-tools/java/maven-ci-pipeline" %}

- **verify** is the right CI target: it runs unit tests, integration tests (Failsafe) and any
  quality checks bound to `verify` (Checkstyle, SpotBugs, JaCoCo coverage rules).
- **install** is only needed when another local project depends on this one; avoid it in CI.
- **deploy** publishes to the repository in `<distributionManagement>`.

## Build files

| File | Purpose | Commit? |
|---|---|---|
| `pom.xml` | Project model: coordinates, dependencies, plugins, profiles | Yes |
| `mvnw`, `mvnw.cmd` | Maven Wrapper scripts, pin the Maven version | Yes |
| `.mvn/wrapper/maven-wrapper.properties` | Maven distribution URL and version for the wrapper | Yes |
| `.mvn/maven.config` | Default CLI flags (for example `-B -ntp`) | Yes |
| `.mvn/jvm.config` | JVM options for Maven itself | Yes |
| `~/.m2/settings.xml` | Mirrors, server credentials, proxies | No (CI generates it) |
| `~/.m2/toolchains.xml` | JDK locations for the toolchains plugin | No |
| `target/` | Build output | No (`.gitignore`) |

## Commands by category

```bash
./mvnw -B -ntp clean verify                      # build + test + bound checks
./mvnw -B checkstyle:check                       # lint
./mvnw -B com.github.spotbugs:spotbugs-maven-plugin:check   # SAST (FindSecBugs configured in pom)
./mvnw -B org.owasp:dependency-check-maven:check -DfailBuildOnCVSS=7   # SCA
./mvnw -B test jacoco:report                     # tests + coverage report
./mvnw -B org.cyclonedx:cyclonedx-maven-plugin:makeAggregateBom   # SBOM (target/bom.json)
./mvnw -B dependency:tree                        # inspect the dependency graph
./mvnw -B deploy -DskipTests                     # publish to the remote repository
```

## Minimal project

The `pom.xml` below builds a Java 21 jar, runs JUnit 5 tests, enforces 80% line coverage with
JaCoCo and runs SpotBugs with the FindSecBugs security rules during `verify`.

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>demo</artifactId>
  <version>1.0.0</version>

  <properties>
    <maven.compiler.release>21</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <!-- reproducible builds: fixed timestamp inside the jar -->
    <project.build.outputTimestamp>2026-01-01T00:00:00Z</project.build.outputTimestamp>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.11.4</version>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.jacoco</groupId>
        <artifactId>jacoco-maven-plugin</artifactId>
        <version>0.8.12</version>
        <executions>
          <execution><id>prepare</id><goals><goal>prepare-agent</goal></goals></execution>
          <execution><id>report</id><phase>verify</phase><goals><goal>report</goal></goals></execution>
          <execution>
            <id>check</id>
            <goals><goal>check</goal></goals>
            <configuration>
              <rules>
                <rule>
                  <element>BUNDLE</element>
                  <limits>
                    <limit><counter>LINE</counter><value>COVEREDRATIO</value><minimum>0.80</minimum></limit>
                  </limits>
                </rule>
              </rules>
            </configuration>
          </execution>
        </executions>
      </plugin>
      <plugin>
        <groupId>com.github.spotbugs</groupId>
        <artifactId>spotbugs-maven-plugin</artifactId>
        <version>4.8.6.6</version>
        <configuration>
          <plugins>
            <plugin>
              <groupId>com.h3xstream.findsecbugs</groupId>
              <artifactId>findsecbugs-plugin</artifactId>
              <version>1.13.0</version>
            </plugin>
          </plugins>
        </configuration>
        <executions>
          <execution><phase>verify</phase><goals><goal>check</goal></goals></execution>
        </executions>
      </plugin>
    </plugins>
  </build>
</project>
```

Plugin versions move quickly; check Maven Central for the latest release before copying.
{: .prompt-tip }

## Frameworks

| Framework | Start a Maven project |
|---|---|
| Spring Boot | `curl https://start.spring.io/starter.zip -d type=maven-project -d dependencies=web -o demo.zip` |
| Quarkus | `quarkus create app com.example:demo` |
| Micronaut | `mn create-app com.example.demo --build=maven` |
| Jakarta EE (WAR) | `mvn archetype:generate -DarchetypeArtifactId=maven-archetype-webapp -DgroupId=com.example -DartifactId=demo` |

## CI with GitHub Actions

{% raw %}
```yaml
name: maven-ci
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
          cache: maven                     # caches ~/.m2/repository

      - name: Build, test, coverage gate, SpotBugs
        run: ./mvnw -B -ntp verify

      - name: Dependency scan (SCA)
        run: ./mvnw -B -ntp org.owasp:dependency-check-maven:check -DfailBuildOnCVSS=7 -DnvdApiKey=${{ secrets.NVD_API_KEY }}

      - name: SBOM
        run: ./mvnw -B -ntp org.cyclonedx:cyclonedx-maven-plugin:makeAggregateBom

      - uses: actions/upload-artifact@v4
        with:
          name: demo
          path: |
            target/*.jar
            target/bom.json
```
{% endraw %}

OWASP Dependency-Check downloads the NVD database on first run. Without an NVD API key this is very
slow; request a free key and store it as a repository secret.
{: .prompt-warning }

## Best practices

- **Commit the wrapper** and call `./mvnw` everywhere so developers and CI use the same Maven version.
- **Run `verify`, not `install`,** in CI; bind quality checks (coverage, SpotBugs, Checkstyle) to
  `verify` so the build fails in one place.
- **Use `-B -ntp`** (batch mode, no transfer progress) for readable CI logs.
- **Centralise versions** with `<dependencyManagement>` and BOMs (`spring-boot-dependencies`,
  `junit-bom`); add `maven-enforcer-plugin` with `requireMavenVersion` and `dependencyConvergence`.
- **Mirror everything** through Artifactory or Nexus in `settings.xml` so builds do not hit Maven
  Central directly and credentials never live in `pom.xml`.
- **Never release `-SNAPSHOT` dependencies**; the enforcer `requireReleaseDeps` rule catches them.
- **Set `project.build.outputTimestamp`** for reproducible jars.

## Related posts

- [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/)
- [Gradle Build](/posts/devops/build-tools/java/gradle-build/)
- [Android Gradle Build](/posts/devops/build-tools/android/android-gradle-build/)
- [JFrog Artifactory](/posts/artifacts/jfrog-artifactory/)
- [SonarQube](/posts/devsecops/sonarqube/sonarqube-getting-started/)
