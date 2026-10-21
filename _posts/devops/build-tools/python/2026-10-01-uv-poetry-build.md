---
layout: post
title: "Python Build with uv and Poetry"
categories: [devops, build-tools, python]
tags: [DevOps, Build-Tools, Python, UV, Poetry, SAST, SCA]
description: The modern lockfile-based Python workflow with uv and Poetry, the files they need, how to lint, scan and test, and a complete GitHub Actions pipeline.
mermaid: true
image:
  path: /assets/img/devops/build-tools/python/uv-poetry-build.webp
  alt: "DevOps pipeline loop motif with the title Python with uv and Poetry"
---

**uv** and **Poetry** replace the pip + venv + pip-tools + build + twine combination with one tool
that manages the virtual environment, resolves and locks dependencies, builds and publishes. uv
(from Astral, written in Rust) has become the fast default for new projects; Poetry remains common
in existing codebases.

<!-- more -->

This post is part of [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/).
The classic workflow is covered in [pip, setuptools and build](/posts/devops/build-tools/python/pip-setuptools-build/).
{: .prompt-info }

## At a glance

| Category | Common tools |
|---|---|
| Project managers | uv, Poetry, PDM, Hatch |
| Build backends | hatchling, uv_build, poetry-core, pdm-backend, setuptools |
| Package registry | PyPI, private Artifactory / Nexus / devpi |
| Build files | `pyproject.toml`, `uv.lock` / `poetry.lock`, `.python-version`, `uv.toml`, `poetry.toml` |
| Lint and format | Ruff, mypy / Pyright |
| SAST (open source) | Bandit, Semgrep, CodeQL, SonarQube Community Build |
| SAST (commercial) | Checkmarx One, Veracode, Snyk Code, SonarQube Server |
| SCA | pip-audit (on an exported requirements file), OSV-Scanner (reads `uv.lock` / `poetry.lock`), Trivy, Snyk, Mend |
| Frameworks | FastAPI, Django, Flask |
| Test and coverage | pytest, pytest-cov |
| Build output | wheel (`.whl`), sdist (`.tar.gz`) |
| CI cache | `~/.cache/uv`, `~/.cache/pypoetry` |

## How the build works

In CI, each stage of the [generic build pipeline](/posts/devops/build-tools/language-build-ecosystem/#generic-pipeline) maps to a uv / Poetry command, plugin or scanner. Press play, or step through it:

{% include flow-anim.html id="devops/build-tools/python/uv-poetry-ci-pipeline" %}

- **The lockfile is universal**: it records versions for every platform and Python version, so
  the same lock works on developer laptops and Linux CI runners.
- **`sync` makes the environment match the lock exactly**, removing anything extra.
- **uv can also install Python itself** (`uv python install`), which removes the need for pyenv on
  build agents.

### Same task, two tools

| Task | uv | Poetry (2.x) |
|---|---|---|
| New project | `uv init demo` | `poetry new demo` |
| Add a dependency | `uv add fastapi` | `poetry add fastapi` |
| Add a dev dependency | `uv add --dev pytest` | `poetry add --group dev pytest` |
| Install from lock (CI) | `uv sync --locked` | `poetry sync` (fails if lock is stale) |
| Check lock is current | `uv lock --check` | `poetry check --lock` |
| Run a command | `uv run pytest` | `poetry run pytest` |
| Build | `uv build` | `poetry build` |
| Publish | `uv publish` | `poetry publish` |
| Export requirements | `uv export --format requirements-txt` | `poetry export` (plugin) |

## Build files

| File | Purpose | Commit? |
|---|---|---|
| `pyproject.toml` | Metadata, dependencies, dependency groups, backend, tool config | Yes |
| `uv.lock` / `poetry.lock` | Resolved versions and hashes for all platforms | Yes |
| `.python-version` | Python version used by uv / pyenv | Yes |
| `uv.toml` / `poetry.toml` | Tool settings (index URLs, venv location) | Yes, without credentials |
| `.venv/`, `dist/` | Environment and build output | No |

## Commands by category

```bash
uv sync --locked                                 # reproducible install (fails on stale lock)
uv run ruff check . && uv run ruff format --check .   # lint + format
uv run mypy src                                  # type check
uv run bandit -r src -ll                         # SAST
uv export --format requirements-txt --no-hashes -o req.txt && uvx pip-audit -r req.txt   # SCA
uv run pytest --cov=src --cov-fail-under=80      # tests + coverage gate
uvx --from cyclonedx-bom cyclonedx-py environment .venv -o sbom.json   # SBOM
uv build                                         # wheel + sdist
```

## Minimal project

```toml
# pyproject.toml for uv
[project]
name = "demo"
version = "1.0.0"
requires-python = ">=3.12"
dependencies = ["fastapi[standard]>=0.115"]

[dependency-groups]
dev = ["pytest", "pytest-cov", "ruff", "mypy", "bandit"]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

<details markdown="1">
<summary>Same project for Poetry 2.x</summary>

```toml
[project]
name = "demo"
version = "1.0.0"
requires-python = ">=3.12"
dependencies = ["fastapi[standard]>=0.115"]

[tool.poetry.group.dev.dependencies]
pytest = "*"
pytest-cov = "*"
ruff = "*"
bandit = "*"

[build-system]
requires = ["poetry-core>=2.0"]
build-backend = "poetry.core.masonry.api"
```

</details>

## Frameworks

| Framework | Start a project with uv |
|---|---|
| FastAPI | `uv init api && cd api && uv add "fastapi[standard]"` then `uv run fastapi dev main.py` |
| Django | `uv init site && cd site && uv add django` then `uv run django-admin startproject mysite .` |
| Flask | `uv init app && cd app && uv add flask` then `uv run flask --app app run` |

## CI with GitHub Actions

{% raw %}
```yaml
name: python-uv-ci
on: [push, pull_request]
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v5
        with:
          enable-cache: true                   # caches ~/.cache/uv keyed on uv.lock

      - run: uv python install                 # reads .python-version
      - run: uv sync --locked
      - run: uv run ruff check . && uv run ruff format --check .
      - run: uv run bandit -r src -ll
      - run: uv export --format requirements-txt --no-hashes -o req.txt && uvx pip-audit -r req.txt
      - run: uv run pytest --cov=src --cov-fail-under=80
      - run: uv build

      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
```
{% endraw %}

For Poetry, replace the uv steps with `pipx install poetry`, `poetry sync`, `poetry run pytest`
and `poetry build`, and cache `~/.cache/pypoetry` with `actions/setup-python` (`cache: poetry`).
{: .prompt-tip }

## Best practices

- **Commit the lockfile** and use `uv sync --locked` / `poetry sync` in CI so a stale lock fails.
- **Use dependency groups** for dev, test and lint tools instead of separate requirements files.
- **Pin Python** with `.python-version`, and let uv install it on runners.
- **Use `uvx`** for one-off tools (pip-audit, cyclonedx) so they do not end up in the project lock.
- **In containers**, copy `pyproject.toml` and the lockfile first, run `uv sync --locked --no-dev`,
  then copy the source, so the dependency layer stays cached.
- **Point both tools at your private index** (`[[tool.uv.index]]` or `poetry source add`) instead
  of PyPI directly.

## Related posts

- [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/)
- [Python Build with pip, setuptools and build](/posts/devops/build-tools/python/pip-setuptools-build/)
- [Python Build and Deployment Tools Guide](/posts/devops/cicd/python-build-deploy/)
