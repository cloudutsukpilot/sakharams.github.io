---
layout: post
title: "C++ Build with CMake, Ninja, Conan and vcpkg"
categories: [devops, build-tools, cpp]
tags: [DevOps, Build-Tools, CPP, CMake, Conan, Vcpkg, SAST, SCA]
description: How CMake builds C and C++ projects with Ninja and Conan or vcpkg, which files it needs, how to lint, scan, test and cover, and a complete GitHub Actions pipeline.
mermaid: true
image:
  path: /assets/img/devops/build-tools/cpp/cmake-build.webp
  alt: "DevOps pipeline loop motif with the title C++ Build with CMake"
---

C and C++ have no official build tool or package manager, but **CMake** has become the de facto
standard: it generates native build files (Ninja, Make, Visual Studio) from one portable
description, and integrates with **Conan** or **vcpkg** for dependencies. Most modern C++ projects,
and nearly every IDE, expect a `CMakeLists.txt`.

<!-- more -->

This post is part of [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/).
Legacy and Unix-style builds are covered in [Make and Autotools](/posts/devops/build-tools/cpp/make-autotools-build/).
{: .prompt-info }

## At a glance

| Category | Common tools |
|---|---|
| Build tools | CMake (meta-build), Ninja (fast executor), Make, MSBuild; ccache / sccache for compiler caching |
| Compilers | GCC, Clang, MSVC |
| Package managers | Conan 2, vcpkg, CMake `FetchContent` |
| Build files | `CMakeLists.txt`, `CMakePresets.json`, `cmake/*.cmake`, `conanfile.txt` / `conanfile.py`, `conan.lock`, `vcpkg.json`, `vcpkg-configuration.json`, `.clang-format`, `.clang-tidy` |
| Lint and format | clang-tidy, clang-format, cppcheck, include-what-you-use |
| SAST (open source) | cppcheck, clang-tidy security checks, Clang Static Analyzer, CodeQL, Semgrep, Flawfinder |
| SAST (commercial) | Coverity, Klocwork, Polyspace, CodeSonar, Parasoft C/C++test, Fortify, Checkmarx One, SonarQube Server |
| Runtime checks | AddressSanitizer, UndefinedBehaviorSanitizer, ThreadSanitizer, libFuzzer / AFL++ |
| SCA | Black Duck (snippet matching), Mend, Snyk (unmanaged C/C++), Trivy / Grype on Conan / vcpkg manifests |
| Frameworks / libraries | Qt, Boost, gRPC, Abseil, fmt, spdlog |
| Test and coverage | GoogleTest, Catch2, doctest, CTest; gcov + gcovr / lcov, `llvm-cov` |
| Build output | Executables, `.a` / `.lib`, `.so` / `.dll` / `.dylib`, CPack packages (`.deb`, `.rpm`, `.tar.gz`, `.zip`) |
| CI cache | ccache directory, `~/.conan2`, vcpkg binary cache |

## How the build works

In CI, each stage of the [generic build pipeline](/posts/devops/build-tools/language-build-ecosystem/#generic-pipeline) maps to a CMake command, plugin or scanner. Press play, or step through it:

{% include flow-anim.html id="devops/build-tools/cpp/cmake-ci-pipeline" %}

- **Configure** reads `CMakeLists.txt`, detects the compiler, finds packages and writes native
  build files into a separate build folder (out-of-source).
- **Build** runs Ninja, which compiles only what changed.
- **`compile_commands.json`** (from `CMAKE_EXPORT_COMPILE_COMMANDS`) is what clang-tidy, cppcheck
  and IDEs use to know the exact compiler flags.
- **Presets** (`CMakePresets.json`) put generator, build type, toolchain and cache variables in a
  file, so CI and developers run the same configuration with `cmake --preset release`.

## Build files

| File | Purpose | Commit? |
|---|---|---|
| `CMakeLists.txt` | Targets, sources, dependencies, tests (one per directory) | Yes |
| `CMakePresets.json` | Shared configure / build / test presets | Yes |
| `CMakeUserPresets.json` | Personal presets | No |
| `cmake/*.cmake` | Helper modules and toolchain files | Yes |
| `conanfile.txt` / `conanfile.py` | Conan dependencies and generators | Yes |
| `conan.lock` | Locked Conan dependency graph | Yes |
| `vcpkg.json`, `vcpkg-configuration.json` | vcpkg manifest and registry baseline | Yes |
| `.clang-format`, `.clang-tidy` | Format and lint rules | Yes |
| `build/` | Generated build tree | No |

## Commands by category

```bash
conan install . --output-folder=build --build=missing   # dependencies (Conan)
cmake --preset release                           # configure
cmake --build --preset release                   # build
clang-tidy -p build src/*.cpp                    # lint + bugprone/cert checks
cppcheck --project=build/compile_commands.json --error-exitcode=1   # SAST
ctest --preset release --output-on-failure       # tests
cmake --preset coverage && cmake --build --preset coverage && ctest --preset coverage && gcovr -r . --fail-under-line 80   # coverage gate
cpack --config build/CPackConfig.cmake -G TGZ    # package
```

## Minimal project

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.25)
project(demo VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

add_executable(demo src/main.cpp)
target_compile_options(demo PRIVATE
  $<$<CXX_COMPILER_ID:GNU,Clang>:-Wall -Wextra -Werror>
  $<$<CXX_COMPILER_ID:MSVC>:/W4 /WX>)

include(FetchContent)
FetchContent_Declare(googletest
  URL https://github.com/google/googletest/archive/refs/tags/v1.15.2.tar.gz)
FetchContent_MakeAvailable(googletest)

enable_testing()
add_executable(demo_tests tests/demo_test.cpp)
target_link_libraries(demo_tests GTest::gtest_main)
include(GoogleTest)
gtest_discover_tests(demo_tests)

install(TARGETS demo)
include(CPack)
```

```json
{
  "version": 6,
  "configurePresets": [
    {
      "name": "release",
      "generator": "Ninja",
      "binaryDir": "build",
      "cacheVariables": { "CMAKE_BUILD_TYPE": "Release" }
    },
    {
      "name": "coverage",
      "generator": "Ninja",
      "binaryDir": "build-cov",
      "cacheVariables": { "CMAKE_BUILD_TYPE": "Debug", "CMAKE_CXX_FLAGS": "--coverage" }
    }
  ],
  "buildPresets": [
    { "name": "release", "configurePreset": "release" },
    { "name": "coverage", "configurePreset": "coverage" }
  ],
  "testPresets": [
    { "name": "release", "configurePreset": "release" },
    { "name": "coverage", "configurePreset": "coverage" }
  ]
}
```

## Frameworks and libraries

| Library | Add it to a CMake project |
|---|---|
| Qt 6 | `find_package(Qt6 REQUIRED COMPONENTS Widgets)` + `target_link_libraries(app Qt6::Widgets)` |
| Boost | `find_package(Boost REQUIRED COMPONENTS filesystem)` + `Boost::filesystem` |
| fmt / spdlog | `vcpkg add port fmt` or Conan `fmt/11.0.2`, then `find_package(fmt)` |
| gRPC | `find_package(gRPC CONFIG REQUIRED)` + `gRPC::grpc++` |
| GoogleTest | `FetchContent` (as above) or `find_package(GTest)` |

## CI with GitHub Actions

{% raw %}
```yaml
name: cmake-ci
on: [push, pull_request]
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: sudo apt-get update && sudo apt-get install -y ninja-build cppcheck clang-tidy gcovr
      - uses: hendrikmuhs/ccache-action@v1.2
        with:
          key: ${{ runner.os }}-release

      - name: Configure and build
        run: |
          cmake --preset release -DCMAKE_CXX_COMPILER_LAUNCHER=ccache
          cmake --build --preset release
      - run: cppcheck --project=build/compile_commands.json --error-exitcode=1
      - run: ctest --preset release --output-on-failure

      - name: Sanitizer build
        run: |
          cmake -S . -B build-asan -G Ninja -DCMAKE_BUILD_TYPE=Debug -DCMAKE_CXX_FLAGS="-fsanitize=address,undefined"
          cmake --build build-asan
          ctest --test-dir build-asan --output-on-failure

      - uses: anchore/sbom-action@v0           # SBOM of the source tree (Syft)
        with:
          path: .
          format: cyclonedx-json
```
{% endraw %}

## Best practices

- **Build out of source** (`-B build`) and never commit the build tree.
- **Use target-based CMake** (`target_link_libraries`, `target_compile_options`) instead of global
  `include_directories` / `add_definitions`.
- **Put configuration in presets** so CI and developers share one source of truth.
- **Pin dependencies**: Conan lockfiles, a vcpkg `builtin-baseline`, or `FetchContent` with a fixed
  tag or URL hash.
- **Treat warnings as errors** and run a separate sanitizer job (ASan/UBSan) in CI.
- **Cache compiler output** with ccache or sccache; it is the biggest CI speed-up for C++.
- **Plan SCA explicitly**: manifest scanners only see what Conan/vcpkg declare, so vendored code needs
  snippet-level scanning (Black Duck) or a maintained inventory.

## Related posts

- [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/)
- [C and C++ Build with Make and Autotools](/posts/devops/build-tools/cpp/make-autotools-build/)
- [DevSecOps](/posts/devsecops/devsecops/)
