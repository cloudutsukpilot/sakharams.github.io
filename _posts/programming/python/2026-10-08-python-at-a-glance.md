---
layout: post
title: "Python at a Glance: What Actually Happens When You Run Your Code"
date: 2026-10-08 10:00:00 +0530
categories: [Programming, python]
tags: [Python, CPython, Bytecode, VirtualEnvironments, Pip]
image: /assets/img/programming/python/python-at-a-glance.webp
description: A beginner's map of Python, covering the interpreter, bytecode, the standard library, pip and PyPI, virtual environments, editors, versions and what people build with it.
---

Python is easy to read, and that's both its best feature and a small trap. Most beginners learn the
syntax quickly and then hit a wall of confusing problems: a `__pycache__` folder appears out of nowhere,
a typo only blows up in production, or `pip install` for one project quietly breaks another. None of
these are syntax problems. They come from the system *underneath* the language, and once you can see
that system the confusion mostly goes away.

This post is the mental map I wish beginners got on day one: what the interpreter does with your file,
why Python catches some errors so late, what the standard library and PyPI give you, why virtual
environments are not optional, and which editor and version to pick.

<!-- more -->

## Python is more than the language

When people say "Python", they usually mean a few different things at once:

| Piece | What it is | What it does for you |
|---|---|---|
| **The language** | The syntax and rules: `def`, `for`, indentation, and so on | How you express instructions |
| **The interpreter** | The program that reads and runs your code (usually CPython) | Turns your text file into a running program |
| **The standard library** | Hundreds of modules that ship with every Python install | Files, JSON, HTTP, dates, regex, SQLite, without installing anything |
| **The package ecosystem** | Packages on PyPI, installed with `pip` | Everything the standard library doesn't cover |

Take the most boring program there is:

```python
print("Hello, world")
```

That one line hides a lot. You didn't write code to talk to the terminal, encode the characters or get
pixels onto the screen. The runtime did all of that. The same goes for the standard library: it
already knows how to read files, walk folders, parse JSON, call HTTP endpoints, work with dates and
time zones, run regular expressions and talk to a SQLite database:

```python
import json
import sqlite3
from datetime import date
from pathlib import Path

config = json.loads(Path("config.json").read_text())
db = sqlite3.connect("app.db")
print(f"Loaded {len(config)} settings on {date.today():%d %b %Y}")
```

Four imports and no installs. Python's motto for this is "batteries included", and it's accurate. It's
the main reason Python feels fast to learn: the platform has already solved the common problems, so
you write less code to get something working.

## Interpreted, not compiled (in the way you might expect)

This is where Python differs from Java or C, and it's worth understanding properly because it changes
how you should work.

In Java or C there's an explicit compile step. You write code, run the compiler, it checks every name
and type in the whole program, and if anything is wrong you find out **before** the program runs.

Python has no build step that you trigger. You run `python app.py` and it starts. Under the hood it
does still compile (more on that in a moment), but there's no up-front pass that checks every name in
every function. A misspelled variable inside a function is only noticed when that line actually
executes.

Picture a typo in the handler for a button that users rarely click. Everything you test works. The bug
sits there quietly until someone finally clicks that button. Step through it below, then tick the
checkbox to see the same bug with a test in place:

{% include flow-anim.html id="programming/python/when-errors-surface" %}

That's the trade-off. You get speed and flexibility: edit, run, see the result, with no waiting on a
compiler. You lose the safety net a compiler gives you. My honest take is that this makes tests
more important in Python than in compiled languages, not less. Your tests are the thing that walks
through every path the compiler would have checked.

Here's what that bug looks like, and the cheapest possible test that catches it:

```python
# shop.py
def apply_discount(total: float, percent: float) -> float:
    discounted = total * (1 - percent / 100)
    return round(totl, 2)   # typo: Python won't complain until this line runs
```

```python
# test_shop.py
from shop import apply_discount

def test_apply_discount():
    assert apply_discount(200, 10) == 180.0
```

```text
$ pytest -q
F
E   NameError: name 'totl' is not defined
1 failed in 0.03s
```

> Type hints plus a checker such as `mypy` or `pyright` (which VS Code's Pylance uses) give you back a
> good chunk of that compile-time safety. They would flag `totl` the moment you type it. They're
> optional, but worth turning on early.
{: .prompt-tip }

## What happens when you run a Python file

So what does the interpreter actually do with your `.py` file? Three things, all automatically:

1. **Parse**: read the source text and build a syntax tree. Syntax errors (a missing colon, bad
   indentation) are caught here, before anything runs.
2. **Compile to bytecode**: turn that tree into bytecode, a compact set of low-level instructions
   for the Python virtual machine. Bytecode isn't machine code; it's portable across CPUs.
3. **Execute**: the Python virtual machine runs the bytecode, one instruction at a time.

For modules you **import**, CPython also saves the bytecode into a `__pycache__` folder as `.pyc`
files, so the next import can skip steps 1 and 2. Use the checkbox to compare a first run with a
cached import:

{% include flow-anim.html id="programming/python/python-execution-pipeline" %}

Those `__pycache__` folders aren't clutter or broken files. They're a cache, and Python rebuilds them
whenever the source changes. Keep them out of Git (`__pycache__/` belongs in every `.gitignore`), but
there's no need to delete them by hand.

You can see the bytecode yourself with the standard library's `dis` module:

```python
import dis

def greet(name):
    return "Hello, " + name

dis.dis(greet)
```

```text
  RESUME                   0
  LOAD_CONST               1 ('Hello, ')
  LOAD_FAST                0 (name)
  BINARY_OP                0 (+)
  RETURN_VALUE
```

(The exact instructions vary a little between Python versions.)

### The Python virtual machine

"Virtual machine" sounds like something you install, but it isn't. The Python VM is the part of the
interpreter that loops over bytecode instructions and carries them out. It ships inside the
interpreter, it's running every time you run a script, and you'll never interact with it directly.

### CPython, and why Python is "slow"

The interpreter almost everyone uses is **CPython**, the reference implementation written in C and
downloaded from python.org. When people say "Python" they nearly always mean CPython.

Historically CPython has executed bytecode instruction by instruction rather than compiling hot code to
native machine code the way the Java JVM's JIT does. That's a big part of why pure-Python number
crunching is slower than Java or C. Recent releases have started closing that gap (3.13 added an
experimental JIT and later versions keep improving it), but don't pick Python for raw CPU speed.

For most real applications that doesn't matter much. A typical web request or script spends most of its
time *waiting*: on the network, a database query or the disk. Shaving microseconds off the Python part
doesn't change that. And the heavy maths in data and ML work runs inside libraries like NumPy and
PyTorch, which are written in C, C++ and CUDA.

Other implementations exist, such as **PyPy**, which has a JIT and can be much faster for long-running,
pure-Python workloads. For learning and for most production work, though, use CPython and don't worry
about the rest.

## Libraries vs frameworks

The ecosystem is huge, and it helps to know which of two kinds of tool you're looking at.

A **library** is a toolbox. You import it and call it when you need it, so you stay in control of the
flow:

- `requests` (or `httpx`) for calling websites and APIs
- `pandas` for working with tables of data, like a programmable spreadsheet
- `Pillow` for opening, resizing and converting images

```python
import requests

resp = requests.get("https://api.github.com/repos/python/cpython", timeout=10)
resp.raise_for_status()
print(resp.json()["stargazers_count"])
```

A **framework** is a skeleton. It owns the overall flow, and you fill in the pieces it calls:

- **Django** is the full-featured option for web apps: URL routing, ORM and models, authentication, an
  admin panel and templates. You write views and models, and Django orchestrates the rest.
- **Flask** is lighter, with less structure and more freedom to choose your own pieces.
- **FastAPI** is newer and built around type hints. It's quick to develop with and generates OpenAPI
  docs automatically.

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/hello/{name}")
def hello(name: str):
    return {"message": f"Hello, {name}"}
```

You never call `hello()` yourself; the framework does when a request arrives. The short version is:
**you call a library, a framework calls you.** Knowing which one you're using tells you where your code
fits and who's responsible for what.

## pip and PyPI

Third-party packages live on **PyPI**, the Python Package Index, which hosts hundreds of thousands of
projects. **pip** is the installer that ships with Python and downloads them:

```bash
python -m pip install requests
python -m pip install "django>=5,<6"
python -m pip freeze > requirements.txt
```

If you come from .NET, this is NuGet. From Java, it's Maven Central plus the dependency part of Maven.

> Prefer `python -m pip` over a bare `pip`. It guarantees you're installing into the same Python
> you'll run with, which avoids a whole class of "I installed it but it says module not found"
> problems.
{: .prompt-info }

Modern alternatives like **uv** and **Poetry** do the same job and add lockfiles, dependency
resolution and project management on top. They're covered in
[Python Build with uv and Poetry](/posts/devops/build-tools/python/uv-poetry-build/), and the classic
toolchain in [Python Build with pip, setuptools and build](/posts/devops/build-tools/python/pip-setuptools-build/).

## Virtual environments: the thing that trips everyone up

This deserves its own section, because environments confuse beginners more than almost anything else
in Python.

Without a virtual environment, `pip` installs packages into one shared location for that Python
installation. Every project on the machine sees the same packages. That works until two projects need
different versions of the same package. Only one version can be installed in that shared folder, so
installing for one project silently replaces the version the other one depends on.

A **virtual environment** fixes this by giving each project its own isolated folder with its own
packages. Use the checkbox to see the shared-install version of the story:

{% include flow-anim.html id="programming/python/virtual-environments" %}

The built-in tool is `venv`:

```bash
# create one per project, inside the project folder
python3 -m venv .venv

# activate it (Linux/macOS)
source .venv/bin/activate
# ...or on Windows PowerShell
.venv\Scripts\Activate.ps1

# now pip installs only into this project
python -m pip install requests
which python     # points at .venv/bin/python
deactivate
```

Tools like **uv** and **Poetry** create and manage the environment for you. Whichever you use, the
rule is the same: **one project, one environment**. If someone tells you to always use a virtual
environment, listen to them. It saves hours of "but it works on my machine". There's a step-by-step
setup guide in [Setup Virtual Environment in Windows and Linux](/posts/programming/python/setup-virtual-environments-in-windows-and-linux/),
and if you use notebooks, [Kernel and ipykernel](/posts/programming/python/what-is-ipykernel/) explains
how environments and Jupyter kernels relate.

> On recent Debian, Ubuntu and Homebrew Pythons, a global `pip install` is refused with
> `error: externally-managed-environment`. That's not a bug. The system is telling you to use a venv.
{: .prompt-warning }

## Where to write Python

You only *need* the interpreter and a text editor. Everything else is convenience, but good
convenience:

| Tool | Best for | Notes |
|---|---|---|
| **VS Code** + Python extension | Most people, most projects | Free, fast, cross-platform. Completion, debugging, linting (think spell-check for code), venv detection and notebook support |
| **PyCharm** | Larger codebases, Django and Flask work | A full IDE with deep project understanding, refactoring, test runners and database tools. Free and paid tiers |
| **Jupyter notebooks** | Data exploration, ML experiments, teaching | Run code in cells and see results inline. Great for exploring, poor for building applications |
| **Terminal + any editor** | Quick scripts, servers over SSH | `python script.py` is all you need |

If you're unsure, start with VS Code. Point it at your project's `.venv` and most of the friction goes
away.

## Which version should you use?

The version story is refreshingly simple compared to some languages:

- **Python 2 is dead.** It reached end of life on 1 January 2020. If a tutorial uses `print "hello"`
  without parentheses, close the tab; it's out of date.
- **Python 3 is the only Python.** A new minor version ships every October, and each one gets about
  five years of support: roughly two years of bug fixes, then security fixes only.
- **Right now (October 2026)** 3.14 is the current stable release and 3.13 is still very common.
  3.12 still gets security fixes but is no longer a good choice for new projects. **Python 3.15** is
  in its final release-candidate stage, with the final release scheduled for 9 October 2026.

For a new project, use the latest stable release from python.org (or the one before it if a key
library hasn't published wheels for the newest version yet).

> Don't build on the Python that came with your OS. macOS and many Linux distributions ship a
> "system Python" that the OS itself relies on and that's often older than you want. Install your own
> from python.org or use a version manager such as `pyenv` (or `uv python install`), so you control
> exactly which version each project runs on.
{: .prompt-danger }

```bash
pyenv install 3.14
pyenv local 3.14        # writes .python-version for this project
python --version
```

## What people actually build with Python

**Web apps and APIs.** Django and Flask are the established frameworks; FastAPI is the popular newer
choice for APIs. Many startups and mid-size companies pick Python for the backend because getting
features out quickly matters more to them than raw throughput.

**Data science, machine learning and AI.** This is where Python dominates. NumPy, pandas,
scikit-learn, PyTorch, TensorFlow, Jupyter and nearly every LLM SDK are Python-first. If you want to
work in data or AI, Python is close to unavoidable.

**Automation and scripting.** This is how many people discover Python: renaming a thousand files,
scraping a website, cleaning a spreadsheet, sending a batch of emails. The code is short and a
library already exists for nearly every chore:

```python
from pathlib import Path

for i, photo in enumerate(sorted(Path("photos").glob("*.jpg")), start=1):
    photo.rename(photo.with_name(f"holiday-{i:04d}.jpg"))
```

**DevOps, science, education and internal tools.** Ansible, cloud SDKs and CLIs, CI glue scripts,
research code and countless internal dashboards are written in Python.

Where it's usually *not* the first choice: native mobile apps and high-performance game engines. For
almost everything else it's either the top choice or a serious contender.

## Common beginner pitfalls

- **Installing packages with no venv active.** Check with `which python` (or `where python` on
  Windows) before you `pip install`.
- **Having two Pythons and mixing them up.** `pip` installs into one interpreter and `python` runs
  another. `python -m pip` avoids this.
- **Trusting that "it ran" means "it works".** Only the lines that actually executed were checked.
  Write tests for the other paths.
- **Committing `.venv/` or `__pycache__/`.** Both are generated. Commit `requirements.txt` or
  `pyproject.toml` plus a lockfile instead.
- **Following Python 2 tutorials.** If you see `print` without parentheses or `urllib2`, find a newer
  source.

## Conclusion

Put together: you write Python, the interpreter compiles it to bytecode, the virtual machine runs that
bytecode, the standard library covers the common jobs, pip and PyPI cover the rest, and virtual
environments keep each project's dependencies apart.

Python's strength isn't raw speed. It's how quickly you get from an idea to working code. Once you know
how the interpreter runs your code, why tests matter so much in a dynamic language and how
environments keep things clean, it stops feeling like a beginner's language and starts feeling like
the professional tool it is. A good next step is to create a project folder, make a `.venv`, install
`requests` and `pytest`, and write one small script with one test.

## References

- [The Python Tutorial (docs.python.org)](https://docs.python.org/3/tutorial/)
- [venv: creation of virtual environments](https://docs.python.org/3/library/venv.html)
- [dis: disassembler for Python bytecode](https://docs.python.org/3/library/dis.html)
- [Status of Python versions](https://devguide.python.org/versions/)
- [PEP 790: Python 3.15 release schedule](https://peps.python.org/pep-0790/)
- [Python 3.15.0rc3 release](https://www.python.org/downloads/release/python-3150rc3/)
- [PyPI: the Python Package Index](https://pypi.org/)
