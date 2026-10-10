---
layout: post
title: "Android Gradle Build: AGP, Build Variants, Signing and CI"
categories: [devops, build-tools, android]
tags: [DevOps, Build-Tools, Android, Kotlin, Gradle, SAST, SCA]
description: How Android apps are built with Gradle and the Android Gradle Plugin, which files are involved, how to lint, scan, test and sign, and a complete GitHub Actions pipeline.
mermaid: true
image:
  path: /assets/img/devops/build-tools/android/android-gradle-build.webp
  alt: "DevOps pipeline loop motif with the title Android Builds with Gradle and AGP"
---

Android apps are built with **Gradle** and the **Android Gradle Plugin (AGP)**. AGP adds Android
specific steps to a normal JVM build: resource compilation, DEX conversion, code shrinking with R8,
packaging into an APK or Android App Bundle (AAB) and signing. Kotlin is the default language, with
Jetpack Compose for UI.

<!-- more -->

This post is part of [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/).
General Gradle concepts are covered in [Gradle Build](/posts/devops/build-tools/java/gradle-build/), and the iOS side in
[iOS Build with Xcode and SwiftPM](/posts/devops/build-tools/swift/xcode-swiftpm-build/).
{: .prompt-info }

## At a glance

| Category | Common tools |
|---|---|
| Build tools | Gradle + Android Gradle Plugin, Android SDK command-line tools, fastlane |
| Package registry | Google Maven, Maven Central, private Artifactory / Nexus |
| Build files | `settings.gradle.kts`, `build.gradle.kts` (root + module), `gradle.properties`, `gradle/libs.versions.toml`, `AndroidManifest.xml`, `proguard-rules.pro`, `gradlew`, `local.properties` |
| Lint and format | Android Lint, ktlint, detekt |
| SAST (open source) | Android Lint security checks, MobSF / mobsfscan, Semgrep, CodeQL (Kotlin/Java) |
| SAST (commercial) | NowSecure, Guardsquare AppSweep, Checkmarx One, Veracode, Snyk Code, SonarQube Server |
| SCA | OWASP Dependency-Check, Snyk, Mend, Trivy, GitHub dependency submission |
| Frameworks | Jetpack Compose, Android Jetpack (Room, Navigation, WorkManager), Hilt, Retrofit; cross-platform: Kotlin Multiplatform, Flutter, React Native |
| Test and coverage | JUnit, Robolectric, Espresso, Compose UI tests; JaCoCo, Kover |
| Build output | `.apk` (install / testing), `.aab` (Google Play), `.aar` (libraries), R8 `mapping.txt` |
| CI cache | `~/.gradle/caches`, `~/.gradle/wrapper` |

## How the build works

In CI, each stage of the [generic build pipeline](/posts/devops/build-tools/language-build-ecosystem/#generic-pipeline) maps to a Android Gradle command, plugin or scanner. Press play, or step through it:

{% include flow-anim.html id="devops/build-tools/android/android-gradle-ci-pipeline" %}

- **Build variants** = build types (`debug`, `release`) × product flavors (`free`, `paid`,
  `staging`, `prod`). Every variant gets its own tasks, for example `assembleProdRelease` or
  `bundleStagingDebug`.
- **R8** removes unused code and obfuscates names in release builds; keep the generated
  `mapping.txt` to de-obfuscate crash reports.
- **App Bundles (`.aab`)** are required for Google Play; Play generates optimised APKs per device
  and signs them with the app signing key (Play App Signing), while you sign uploads with an upload
  key.

## Build files

| File | Purpose | Commit? |
|---|---|---|
| `settings.gradle.kts` | Modules, plugin and dependency repositories | Yes |
| `build.gradle.kts` (root) | Plugin versions applied to modules | Yes |
| `app/build.gradle.kts` | `android {}` block: SDK levels, variants, signing, dependencies | Yes |
| `gradle/libs.versions.toml` | Version catalog (AGP, Kotlin, libraries) | Yes |
| `gradle.properties` | `android.useAndroidX`, JVM args, caching flags | Yes |
| `AndroidManifest.xml` | Components, permissions, app metadata | Yes |
| `proguard-rules.pro` | R8 keep rules | Yes |
| `lint.xml`, `lint-baseline.xml` | Android Lint configuration and baseline | Yes |
| `local.properties` | Local SDK path | No |
| `*.jks` / `*.keystore` | Upload signing key | Never (store in secrets) |
| `google-services.json` | Firebase config | Depends on policy (not a secret, but environment-specific) |

## Commands by category

```bash
./gradlew assembleDebug                          # debug APK
./gradlew lint                                   # Android Lint (incl. security checks)
./gradlew ktlintCheck detekt                     # Kotlin lint (ktlint + detekt plugins)
mobsfscan app/src/main                           # SAST (MobSF static rules)
./gradlew dependencyCheckAnalyze                 # SCA (OWASP plugin)
./gradlew testDebugUnitTest                      # JVM unit tests (incl. Robolectric)
./gradlew koverHtmlReport                        # coverage (Kover)
./gradlew connectedDebugAndroidTest              # instrumented tests on an emulator/device
./gradlew bundleRelease                          # signed .aab for Google Play
```

## Minimal project

```kotlin
// app/build.gradle.kts
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.example.demo"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.demo"
        minSdk = 26
        targetSdk = 35
        versionCode = (System.getenv("BUILD_NUMBER") ?: "1").toInt()
        versionName = "1.0.0"
    }

    signingConfigs {
        create("release") {
            storeFile = file(System.getenv("KEYSTORE_PATH") ?: "upload.jks")
            storePassword = System.getenv("KEYSTORE_PASSWORD")
            keyAlias = System.getenv("KEY_ALIAS")
            keyPassword = System.getenv("KEY_PASSWORD")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("release")
        }
    }

    buildFeatures { compose = true }
    lint { warningsAsErrors = true; abortOnError = true }
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.material3)
    testImplementation(libs.junit)
}
```

## Frameworks

| Framework | Start a project |
|---|---|
| Jetpack Compose | Android Studio → New Project → Empty Activity (Compose) |
| Hilt (DI) | Add `com.google.dagger.hilt.android` plugin + `hilt-android` dependency |
| Kotlin Multiplatform | Generate at `kmp.jetbrains.com` |
| Flutter | `flutter create app && flutter build appbundle` |
| React Native | `npx @react-native-community/cli init App` then `cd android && ./gradlew bundleRelease` |

## CI with GitHub Actions

{% raw %}
```yaml
name: android-ci
on: [push, pull_request]
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest                     # Android SDK is preinstalled on hosted Ubuntu runners
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'
      - uses: gradle/actions/setup-gradle@v4

      - run: ./gradlew lint ktlintCheck detekt
      - run: ./gradlew testDebugUnitTest koverXmlReport

      - name: Decode upload keystore
        if: github.ref == 'refs/heads/main'
        run: echo "${{ secrets.UPLOAD_KEYSTORE_B64 }}" | base64 -d > upload.jks

      - name: Signed App Bundle
        if: github.ref == 'refs/heads/main'
        run: ./gradlew bundleRelease
        env:
          BUILD_NUMBER: ${{ github.run_number }}
          KEYSTORE_PATH: ${{ github.workspace }}/upload.jks
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}

      - uses: actions/upload-artifact@v4
        if: github.ref == 'refs/heads/main'
        with:
          name: release
          path: |
            app/build/outputs/bundle/release/*.aab
            app/build/outputs/mapping/release/mapping.txt
```
{% endraw %}

## Best practices

- **Use Play App Signing**: keep only the upload key in CI secrets, so a leaked key can be reset.
- **Never commit keystores or `local.properties`**; read signing values from environment variables.
- **Enable R8 (`isMinifyEnabled`) for release** and archive `mapping.txt` with every build.
- **Make Android Lint a gate** (`warningsAsErrors`) and use a baseline file for legacy issues.
- **Derive `versionCode` from CI** (run number) so every upload is unique.
- **Run instrumented tests selectively** (emulators are slow on CI); rely on Robolectric and
  Compose tests for most coverage, and use Firebase Test Lab or a device farm for the rest.
- **Keep AGP, Kotlin and the Compose BOM in the version catalog** and update them together.

## Related posts

- [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/)
- [Gradle Build](/posts/devops/build-tools/java/gradle-build/)
- [iOS Build with Xcode and SwiftPM](/posts/devops/build-tools/swift/xcode-swiftpm-build/)
