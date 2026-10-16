---
layout: post
title: "DotNet Build: dotnet CLI, MSBuild, NuGet and CI"
categories: [devops, build-tools, dotnet]
tags: [DevOps, Build-Tools, DotNet, CSharp, MSBuild, NuGet, SAST, SCA]
description: How the dotnet build command, MSBuild and NuGet build .NET applications, which files they need, how to lint, scan and test, and a complete GitHub Actions pipeline.
mermaid: true
image:
  path: /assets/img/devops/build-tools/dotnet/dotnet-build.webp
  alt: "DevOps pipeline loop motif with the title DotNet Build"
---

When working with .NET applications, the `dotnet build` command is the essential tool that compiles
your code and prepares it for execution. Whether you are developing a console application, a web
API or a large enterprise solution, the `dotnet` CLI (a front end for MSBuild and NuGet) is the
build system you will use locally and in CI.

<!-- more -->

This post is part of [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/).
{: .prompt-info }

## At a glance

| Category | Common tools |
|---|---|
| Build tools | `dotnet` CLI, MSBuild, Visual Studio Build Tools; build scripting with Cake, NUKE or FAKE (F#) |
| Package registry | NuGet, nuget.org, Azure Artifacts, GitHub Packages, Artifactory / ProGet |
| Build files | `*.csproj` / `*.fsproj` / `*.vbproj`, `*.sln` / `*.slnx`, `Directory.Build.props`, `Directory.Packages.props`, `global.json`, `nuget.config`, `packages.lock.json` |
| Lint and format | .NET (Roslyn) analyzers, StyleCop.Analyzers, `dotnet format`, `.editorconfig` |
| SAST (open source) | Roslyn security analyzers, Semgrep, CodeQL, SonarQube Community Build |
| SAST (commercial) | Checkmarx One, OpenText Fortify, Veracode, Snyk Code, SonarQube Server |
| SCA | NuGet audit (built into restore), `dotnet list package --vulnerable`, OWASP Dependency-Check, Trivy, Snyk, Mend, Black Duck |
| Frameworks | ASP.NET Core, Blazor, .NET MAUI, Worker Services, Entity Framework Core |
| Test and coverage | xUnit, NUnit, MSTest; Coverlet + ReportGenerator |
| Build output | `.dll` / `.exe`, publish folder, NuGet package (`.nupkg`), container image |
| CI cache | `~/.nuget/packages` |

## How the build works

### What is dotnet build?

- `dotnet build` restores dependencies, compiles the source code and produces the binaries for your
  application.
- It writes intermediate outputs to `obj/` and the final assemblies to `bin/<Configuration>/<TFM>/`,
  which can then be run, tested or published.

In CI, each stage of the [generic build pipeline](/posts/devops/build-tools/language-build-ecosystem/#generic-pipeline) maps to a dotnet CLI command, plugin or scanner. Press play, or step through it:

{% include flow-anim.html id="devops/build-tools/dotnet/dotnet-ci-pipeline" %}

### Key functions of dotnet build

- **Compiles the project**: converts the source code into assemblies (`.dll`, `.exe`).
- **Restores dependencies**: runs `dotnet restore` implicitly unless you pass `--no-restore`.
  Since .NET 8, restore also runs **NuGet audit** and warns about packages with known
  vulnerabilities.
- **Runs analyzers**: Roslyn code-quality and code-style analyzers run during compilation, so lint
  and part of SAST happen inside the build.
- **Handles configurations and frameworks**: Debug (default) or Release, and one or more target
  frameworks (TFMs) such as `net10.0`.

### Basic usage

```sh
dotnet build                                   # Debug build of the project/solution in the current folder
dotnet build MySolution.sln                    # build every project in a solution
dotnet build --configuration Release           # optimised build
dotnet build --framework net8.0                # one target framework of a multi-targeted project
```

### Understanding a sample CI command

A commonly used command for building a .NET solution in a GitHub Actions workflow is:

{% raw %}
```sh
dotnet build ${{ inputs.SOLUTION_FILE_PATH }} -c Release --configfile 'src/NuGet.Config'
```
{% endraw %}

- {% raw %}`${{ inputs.SOLUTION_FILE_PATH }}`{% endraw %}: a workflow input holding the path to the
  solution or project file.
- `-c Release`: builds the Release configuration. The default is Debug.
- `--configfile 'src/NuGet.Config'`: uses a specific NuGet configuration so the correct package
  sources and authentication settings apply during the implicit restore.

## Build files

| File | Purpose | Commit? |
|---|---|---|
| `*.csproj` / `*.fsproj` / `*.vbproj` | SDK-style project: target framework, packages, build properties | Yes |
| `*.sln` / `*.slnx` | Groups projects into a solution | Yes |
| `Directory.Build.props` | Shared MSBuild properties for every project below the folder | Yes |
| `Directory.Packages.props` | Central package management: one version per package | Yes |
| `global.json` | Pins the .NET SDK version | Yes |
| `nuget.config` | Package sources and source mapping | Yes, credentials via env vars |
| `packages.lock.json` | Locked dependency graph (`RestorePackagesWithLockFile`) | Yes |
| `.editorconfig` | Code style and analyzer severities | Yes |
| `bin/`, `obj/` | Build output and intermediates | No |

## Commands by category

```bash
dotnet restore --locked-mode                     # restore exactly what packages.lock.json says
dotnet build -c Release --no-restore             # build
dotnet format --verify-no-changes                # lint / format check
dotnet build -c Release -warnaserror             # analyzers (incl. security rules) as a gate
dotnet list package --vulnerable --include-transitive   # SCA report
dotnet test -c Release --no-build --collect:"XPlat Code Coverage"   # tests + coverage (Coverlet)
dotnet CycloneDX MySolution.sln -o sbom          # SBOM (dotnet tool install --global CycloneDX)
dotnet publish src/Api -c Release -o out         # deployable output
dotnet pack -c Release -o nupkgs                 # NuGet package
```

## Minimal project

```xml
<!-- Directory.Build.props: applies to every project in the repo -->
<Project>
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <AnalysisLevel>latest-recommended</AnalysisLevel>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
    <RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>
    <NuGetAudit>true</NuGetAudit>
    <NuGetAuditMode>all</NuGetAuditMode>  <!-- include transitive packages -->
  </PropertyGroup>
</Project>
```

```xml
<!-- src/Api/Api.csproj -->
<Project Sdk="Microsoft.NET.Sdk.Web">
  <ItemGroup>
    <PackageReference Include="Serilog.AspNetCore" Version="8.0.3" />
  </ItemGroup>
</Project>
```

```json
{
  "sdk": { "version": "10.0.100", "rollForward": "latestFeature" }
}
```

With `TreatWarningsAsErrors` on, NuGet audit warnings (`NU1901`–`NU1904`) fail the build when a
vulnerable package is restored, which turns SCA into a gate without extra tooling.
{: .prompt-tip }

## Frameworks

| Framework | Start a project |
|---|---|
| ASP.NET Core Web API | `dotnet new webapi -n Api` |
| Blazor | `dotnet new blazor -n Web` |
| .NET MAUI | `dotnet new maui -n App` |
| Worker Service | `dotnet new worker -n Worker` |
| Entity Framework Core | `dotnet add package Microsoft.EntityFrameworkCore.SqlServer` then `dotnet ef migrations add Init` |
| Tests (xUnit) | `dotnet new xunit -n Api.Tests` |

## CI with GitHub Actions

{% raw %}
```yaml
name: dotnet-ci
on: [push, pull_request]
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          global-json-file: global.json
          cache: true                          # keyed on packages.lock.json
          cache-dependency-path: '**/packages.lock.json'

      - run: dotnet restore --locked-mode
      - run: dotnet format --verify-no-changes --no-restore
      - run: dotnet build -c Release --no-restore
      - run: dotnet test -c Release --no-build --collect:"XPlat Code Coverage"
      - run: dotnet list package --vulnerable --include-transitive
      - run: dotnet publish src/Api -c Release --no-build -o out

      - uses: actions/upload-artifact@v4
        with:
          name: api
          path: out/
```
{% endraw %}

### SonarQube code analysis

If you use SonarQube, the scanner wraps the build so it can collect compiler and analyzer output:

```sh
dotnet sonarscanner begin /k:"MyProject" /d:sonar.host.url="http://localhost:9000"
dotnet build
dotnet sonarscanner end
```

## Best practices

- **Run `dotnet restore` separately** in CI so the package cache is reused, then build and test with
  `--no-restore` / `--no-build`.
- **Pin the SDK** with `global.json` and **lock packages** with `packages.lock.json` +
  `--locked-mode`.
- **Centralise settings** in `Directory.Build.props` and package versions in
  `Directory.Packages.props`.
- **Treat warnings as errors** so analyzer findings and NuGet audit results gate the build.
- **Use package source mapping** in `nuget.config` to prevent dependency confusion between public
  and private feeds.
- **Use `dotnet clean`** (or a fresh checkout in CI) to avoid stale binaries.
- **Publish containers without a Dockerfile** using `dotnet publish /t:PublishContainer` when the
  default base images are acceptable.

## Related posts

- [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/)
- [SonarQube](/posts/devsecops/sonarqube/sonarqube-getting-started/)
- [JFrog Artifactory](/posts/artifacts/jfrog-artifactory/)
