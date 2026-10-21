---
layout: post
title: "Python Build with pip, setuptools and build"
categories: [devops, build-tools, python]
tags: [DevOps, Build-Tools, Python, Pip, Setuptools, SAST, SCA]
description: The classic Python build workflow with pip, setuptools, build and twine, the files it needs, how to lint, scan and test, and a complete GitHub Actions pipeline.
mermaid: true
image:
  path: /assets/img/devops/build-tools/python/pip-setuptools-build.webp
  alt: "DevOps pipeline loop motif with the title Python with pip and setuptools"
---

The classic Python toolchain splits responsibilities between small tools: **pip** installs
packages, **setuptools** (or another backend) knows how to build a package, **build** is the
standard front end that calls the backend, and **twine** uploads the result. It is still the most
common setup in enterprise codebases and the base every newer tool builds on.

<!-- more -->

This post is part of [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/).
The modern lockfile-based alternative is covered in [uv and Poetry](/posts/devops/build-tools/python/uv-poetry-build/),
and deployment (Docker, AWS SAM, Azure Functions) in the
[Python Build and Deployment Tools Guide](/posts/devops/cicd/python-build-deploy/).
{: .prompt-info }

## At a glance

| Category | Common tools |
|---|---|
| Build tools | `build` (PyPA front end), setuptools, hatchling, flit; pip-tools for locking; tox / nox for task running |
| Package registry | PyPI, private Artifactory / Nexus / devpi |
| Build files | `pyproject.toml`, `requirements.txt`, `requirements.in`, `setup.cfg` / `setup.py` (legacy), `MANIFEST.in`, `tox.ini` |
| Lint and format | Ruff, Black, Flake8, Pylint, isort; mypy / Pyright for types |
| SAST (open source) | Bandit, Semgrep, CodeQL, SonarQube Community Build |
| SAST (commercial) | Checkmarx One, Veracode, Snyk Code, OpenText Fortify, SonarQube Server |
| SCA | pip-audit, Safety, OSV-Scanner, Trivy, Snyk Open Source, Mend, Black Duck |
| Frameworks | Django, Flask, FastAPI |
| Test and coverage | pytest, unittest, Hypothesis; coverage.py / pytest-cov |
| Build output | wheel (`.whl`), source distribution (`.tar.gz`) |
| CI cache | `~/.cache/pip` |

## How the build works

In CI, each stage of the [generic build pipeline](/posts/devops/build-tools/language-build-ecosystem/#generic-pipeline) maps to a pip and build command, plugin or scanner. Press play, or step through it:

{% include flow-anim.html id="devops/build-tools/python/pip-ci-pipeline" %}

- **Two separate flows.** *Libraries* are built into wheels and published; *applications* are
  usually installed from a pinned `requirements.txt` into a virtual environment or container.
- **PEP 517/518** made the backend pluggable: the `[build-system]` table tells any front end which
  backend to install and call. `python setup.py install` and `setup.py bdist_wheel` are deprecated.
- **pip-tools** (`pip-compile`) turns loose requirements in `requirements.in` into a fully pinned,
  hashed `requirements.txt`, which is the classic way to get a lockfile.

## Build files

| File | Purpose | Commit? |
|---|---|---|
| `pyproject.toml` | Build backend, project metadata, tool config (Ruff, pytest, mypy) | Yes |
| `requirements.in` | Top-level application dependencies (input for `pip-compile`) | Yes |
| `requirements.txt` | Fully pinned dependencies, ideally with `--hash` | Yes |
| `requirements-dev.txt` | Lint, test and scan tools | Yes |
| `setup.cfg` / `setup.py` | Legacy setuptools configuration | Yes, if still used |
| `MANIFEST.in` | Extra files to include in the sdist | Yes |
| `tox.ini` / `noxfile.py` | Test matrix across Python versions | Yes |
| `pip.conf` / `pip.ini` | Index URL for a private registry | Not with credentials |
| `.pypirc` | Upload credentials for twine | No |
| `dist/`, `build/`, `*.egg-info/`, `.venv/` | Outputs and environments | No |

## Commands by category

```bash
python -m venv .venv && . .venv/bin/activate     # isolated environment
pip install -r requirements.txt --require-hashes # reproducible install
pip-compile --generate-hashes requirements.in    # lock (pip-tools)
ruff check . && ruff format --check .            # lint + format
bandit -r src -ll                                # SAST
pip-audit -r requirements.txt                    # SCA
pytest --cov=src --cov-fail-under=80             # tests + coverage gate
cyclonedx-py requirements requirements.txt -o sbom.json   # SBOM
python -m build && twine check dist/*            # build wheel + sdist and validate metadata
```

## Minimal project

```toml
# pyproject.toml (src layout)
[build-system]
requires = ["setuptools>=75", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "demo"
version = "1.0.0"
requires-python = ">=3.11"
dependencies = ["requests>=2.32"]

[project.optional-dependencies]
dev = ["pytest", "pytest-cov", "ruff", "bandit", "pip-audit", "build", "twine"]

[tool.setuptools.packages.find]
where = ["src"]

[tool.pytest.ini_options]
addopts = "--cov=demo --cov-report=term-missing"

[tool.ruff]
line-length = 100
```

## Frameworks

| Framework | Start a project |
|---|---|
| Django | `pip install django && django-admin startproject mysite` |
| Flask | `pip install flask` then `flask --app app run` |
| FastAPI | `pip install "fastapi[standard]"` then `fastapi dev main.py` |

## CI with GitHub Actions

{% raw %}
```yaml
name: python-ci
on: [push, pull_request]
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.11', '3.12', '3.13']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
          cache: pip

      - run: pip install -e ".[dev]"
      - run: ruff check . && ruff format --check .
      - run: bandit -r src -ll
      - run: pip-audit
      - run: pytest --cov-fail-under=80
      - run: python -m build && twine check dist/*

      - uses: actions/upload-artifact@v4
        with:
          name: dist-${{ matrix.python-version }}
          path: dist/

  publish:
    if: startsWith(github.ref, 'refs/tags/v')
    needs: build
    runs-on: ubuntu-latest
    permissions:
      id-token: write                          # PyPI trusted publishing, no API token
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist-3.13
          path: dist/
      - uses: pypa/gh-action-pypi-publish@release/v1
```
{% endraw %}

## Best practices

- **Always use a virtual environment**; never `sudo pip install` on build agents.
- **Use the `src/` layout** so tests run against the installed package, not the working directory.
- **Pin with hashes** (`pip-compile --generate-hashes`, `pip install --require-hashes`) for
  applications; keep ranges in `pyproject.toml` for libraries.
- **Move configuration into `pyproject.toml`** and drop `setup.py` unless you need dynamic logic.
- **Use trusted publishing** to PyPI from CI instead of long-lived API tokens.
- **Build native wheels with cibuildwheel** when the package contains C extensions.
- **Route installs through a private index** (`PIP_INDEX_URL`) to cache and control packages.

## Related posts

- [Build Ecosystems by Programming Language](/posts/devops/build-tools/language-build-ecosystem/)
- [Python Build with uv and Poetry](/posts/devops/build-tools/python/uv-poetry-build/)
- [Python Build and Deployment Tools Guide](/posts/devops/cicd/python-build-deploy/)
- [Artifact Management](/posts/artifacts/artifact-management/)
