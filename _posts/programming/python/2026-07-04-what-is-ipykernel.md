---
layout: post
title: Kernel and ipykernel
categories: [Programming, python]
tags: [Python]
image: /assets/img/programming/python/python-posts.png
---

# What Even *Is* a Kernel? (And Why `ipykernel` Isn't the Same Thing as a `venv`)

If you've spent any time in Jupyter notebooks or VS Code's interactive Python window, you've probably clicked a little dropdown in the top-right corner that says something like "Select Kernel." Maybe you clicked it, got confused by a list of Python versions and environments, picked one that looked right, and moved on with your life.

Fair enough. I did that for way too long too. But once I actually sat down and figured out what a kernel *is*, what `ipykernel` does, and how it's totally different from a virtual environment (`venv`), a lot of confusing behavior in my day-to-day Python work suddenly made sense. So let's break it down properly — no hand-waving.

## First, the boring-but-important definition: what is a "kernel"?

The word "kernel" gets overloaded in computing, so let's separate two meanings up front:

1. **OS kernel** — the core of your operating system (Linux, Windows, macOS) that manages hardware, memory, and processes. That's *not* what we're talking about here.
2. **Notebook/computational kernel** — a separate running process that actually *executes your code* and sends the results back to whatever interface you're using (Jupyter Notebook, JupyterLab, VS Code, Google Colab, etc.).

This blog is about #2. Think of a kernel as the "engine" sitting behind the scenes. The notebook interface (the cells, the markdown, the pretty UI) is just the dashboard. The kernel is the actual engine doing the work.

## How does a kernel actually work?

Here's the mental model that finally made it click for me:

1. You open a notebook and start a kernel (this happens automatically, or you pick one from that dropdown).
2. The kernel is its own independent process, running somewhere in the background — it has its own memory, its own imported packages, its own variables.
3. When you run a cell, your notebook interface doesn't execute the code directly. Instead, it sends the code to the kernel over a messaging protocol (Jupyter uses ZeroMQ sockets under the hood).
4. The kernel executes the code, keeps track of all your variables and state, and sends back the results — text output, errors, plots, dataframes, whatever — which the interface then renders nicely for you.
5. This is *why* your variables stick around between cells, even if you scroll up and rerun an old cell — the kernel remembers everything until you restart it.

This also explains a very common "why is this happening" moment: if you delete a variable's cell but its value still works elsewhere, that's because the kernel's memory doesn't automatically forget things just because you deleted the cell from view. Restarting the kernel is the "turn it off and on again" of the notebook world — and it fixes a shocking number of "impossible" bugs.

## So what is `ipykernel` specifically?

`ipykernel` is the actual Python package that implements the "kernel" for Python code in Jupyter-style environments. When you see:

```bash
pip install ipykernel
```

you're installing the piece of software that lets Jupyter (or VS Code, or Colab) talk to a Python interpreter using that kernel protocol I mentioned above.

In short:
- **Jupyter/notebook protocol** = the messaging system (language-agnostic — there are kernels for R, Julia, C++, etc.)
- **`ipykernel`** = the Python-specific implementation of that protocol, built on top of IPython (the "I" in `ipykernel` literally stands for IPython)

When you register a kernel with a command like:

```bash
python -m ipykernel install --user --name=my_project_env --display-name "Python (my_project_env)"
```

you're essentially telling Jupyter/VS Code: "Here's a Python interpreter, wrapped in `ipykernel`, that you can list in your kernel picker and use to run notebooks."

That's it. `ipykernel` isn't magic — it's a translator between "Jupyter wants to run this cell" and "here's a normal Python process actually running that code."

## Okay, but how is this different from a `venv`?

This is the part that trips people up the most, and honestly, it tripped me up too — because both `ipykernel` and `venv` show up in that same "which Python am I using" mental space. But they solve completely different problems.

**A `venv` (virtual environment) is about isolation of *dependencies*.**

When you run:

```bash
python -m venv myenv
source myenv/bin/activate
pip install pandas numpy
```

You're creating an isolated folder with its own Python interpreter copy and its own `site-packages`. This means the `pandas` version in `myenv` doesn't clash with a different `pandas` version installed globally or in another project's `venv`. It's purely about **not polluting your dependencies across projects**.

A `venv` has *no idea* what a notebook is. It doesn't know about cells, kernels, or Jupyter messaging protocols. It's just a sandboxed Python installation.

**`ipykernel` is about *exposing* an interpreter to the notebook interface.**

`ipykernel` doesn't care about isolating packages — it cares about letting a notebook UI talk to *some* Python interpreter and execute code in it, keeping state alive between cells.

Here's the relationship that finally made sense to me:

> A `venv` is the isolated room with your tools in it. `ipykernel` is the phone line that lets the notebook call into that room and ask someone to use those tools.

You can absolutely have a `venv` with zero notebook capability — it just runs `.py` scripts normally. And you *need* `ipykernel` installed **inside** that `venv` (or globally) if you want that specific environment to show up as a selectable kernel in Jupyter or VS Code.

That's the workflow that actually works well in practice:

```bash
python -m venv myenv          # create isolated environment
source myenv/bin/activate      # activate it
pip install ipykernel pandas   # install ipykernel INSIDE the venv, plus your real deps
python -m ipykernel install --user --name=myenv --display-name "Python (myenv)"
```

Now, when you open a notebook and pick "Python (myenv)" from the kernel list, you're telling the notebook: "run my code using the interpreter and packages from this specific `venv`, communicated through `ipykernel`."

## A quick side-by-side, because I love a good table

| | `venv` | `ipykernel` |
|---|---|---|
| **What it is** | An isolated Python environment (interpreter + packages) | A package that implements the Jupyter kernel protocol for Python |
| **Problem it solves** | "I don't want project A's dependencies fighting with project B's" | "I want a notebook interface to run my Python code and keep state" |
| **Where it lives** | A folder on disk (`myenv/`) | A Python package installed inside an environment |
| **Notebook-aware?** | No, has no concept of cells or kernels | Yes, this is its entire purpose |
| **Can exist without the other?** | Yes — plenty of venvs never touch a notebook | Sort of — but it needs *some* interpreter/environment to run in, often a venv |

## The human part: why this confused me for so long

Honestly? I think the reason kernels and virtual environments get muddled together is that VS Code and Jupyter show them in basically the same dropdown menu. You click "Select Kernel," and up pops a list that mixes global interpreters, conda environments, and venvs — all labeled as if they're the same *kind* of thing. They're not. One is an isolation mechanism, the other is a communication mechanism, and the UI just happens to let you pick both from the same spot because, in practice, a "kernel" almost always *wraps* an environment.

The moment that finally made it click for me was debugging a "ModuleNotFoundError" that made zero sense — I had `pandas` installed, I could `pip show pandas` and see it right there in my terminal... but the notebook still couldn't find it. Turns out I had `pandas` installed in my system Python, but the *kernel* I'd selected was pointing at a totally different `venv` that never got `pandas` installed in the first place. Two completely separate concepts, silently working against each other, and nothing about the error message told me that's what was happening.

So if you take one thing away from this: when your notebook can't find a package, don't just ask "did I `pip install` it?" — ask "did I `pip install` it into the environment that my *currently selected kernel* is actually running?" Those are not always the same question, and realizing that saved me a lot of head-scratching.

## TL;DR

- A **kernel** is a background process that actually executes your notebook code and remembers your variables between cells.
- **`ipykernel`** is the Python package that lets Jupyter/VS Code talk to a Python interpreter using the kernel protocol.
- A **`venv`** isolates your project's dependencies — it has nothing to do with notebooks by itself.
- To use a `venv` as a notebook kernel, you install `ipykernel` *inside* that `venv` and register it so it shows up in the kernel picker.
- When something feels "wrong" in a notebook (missing packages, weird stale variables), check whether you're actually pointed at the environment you *think* you are — that single check resolves most kernel-related headaches.
