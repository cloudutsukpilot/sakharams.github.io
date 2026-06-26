---
layout: post
title: CodeGraphContext - Map your Entire Codebase to Knowledge Graphs
categories: [ai coding tools, knowledgegraphs]
tags: [AI Coding Tools, Knowledge Graph]
---

# Visualize Your Codebase as a Graph with CodeGraphContext (CGC)

Ever stared at a large codebase and wished you could *see* how everything connects — which functions call what, where dead code hides, how your classes relate? That's exactly what **CodeGraphContext (CGC)** gives you: a queryable knowledge graph of your code, with a built-in visual browser.

This post covers what CGC is, how to install it, and how to set up a single shell command that indexes your project and launches the visual browser in one shot.

---

## What is CodeGraphContext?

CGC is an open-source CLI tool and MCP server that parses your source code and loads it into a graph database. Instead of reading files linearly, you can ask questions like:

- "What calls this function?"
- "What does this module depend on?"
- "Where is dead code hiding?"
- "Show me the full call chain from `main` to `process_data`."

It supports **23 programming languages** including JavaScript, TypeScript, Python, Java, Go, Rust, and more. Under the hood it uses [Tree-sitter](https://tree-sitter.github.io/) to parse your code into nodes (functions, classes, modules) and edges (calls, imports, inheritance) — then stores that graph in an embedded database you can query and visualize.

It works in two modes:

- **CLI toolkit** — analyze and query your code directly from the terminal
- **MCP server** — connect it to AI assistants like Claude, Cursor, or VS Code Copilot so they have deep structural context about your codebase

---

## Installation

### Prerequisites

- Python 3.10 or later
- `pipx` (recommended) or `pip`

### Install via pipx (recommended)

`pipx` installs CGC in an isolated environment but makes the `cgc` command globally available — no virtual environment juggling.

```bash
# Install pipx if you don't have it
sudo apt install pipx
pipx ensurepath

# Install CGC
pipx install codegraphcontext

# Verify
cgc --version
```

If `cgc` isn't found after install, run the upstream fix script:

```bash
curl -sSL https://raw.githubusercontent.com/CodeGraphContext/CodeGraphContext/main/scripts/post_install_fix.sh | bash
```

### Configure the database

CGC supports several graph database backends. The simplest for local use is **KuzuDB** — embedded, zero-config, works on all platforms.

```bash
cgc config db kuzudb
```

Also enable database deletion (needed for the clean-index workflow below):

```bash
echo "ALLOW_DB_DELETION=true" >> ~/.codegraphcontext/.env
```

### Verify everything works

```bash
cgc doctor
```

This runs a health check on your database, dependencies, and permissions.

---

## Core CLI commands

Once installed, the basic workflow looks like this:

```bash
# Index a project
cgc index .

# List all indexed projects
cgc list

# Find a function by name
cgc find name myFunction

# See who calls a function
cgc analyze callers myFunction

# Find unused code
cgc analyze dead-code

# Open the visual browser
cgc visualize
```

---

## The `cgcviz` shell function

Running `cgc index` and then `cgc visualize` every time gets tedious. The bigger problem is that CGC stores all indexed projects in a single shared database at `~/.codegraphcontext/`. If you've indexed multiple projects, the visualizer shows everything at once — which is noisy when you just want to explore one repo.

The solution: a small shell function that **wipes the DB, indexes just the current directory, and opens the visualizer** — giving you a clean, focused graph every time.

Add this to your `~/.zshrc` (or `~/.bashrc`):

```bash
cgcviz() {
  local target
  target="$(realpath "${1:-.}")"

  echo "Cleaning previous index..."
  printf "y\ndelete all\n" | cgc delete --all

  echo "Indexing ${target}..."
  cgc index "$target" || { echo "cgc index failed"; return 1; }

  echo "Opening visualizer..."
  cgc visualize
}
```

Then reload your shell:

```bash
source ~/.zshrc
```

### Usage

```bash
# Index and visualize the current directory
cgcviz

# Index and visualize a specific project
cgcviz ~/projects/my-app
```

CGC will print a URL like `http://localhost:8000` — click it to open the interactive graph in your browser.

### What it does, step by step

1. `cgc delete --all` — clears all previously indexed repos from the database. The `printf "y\ndelete all\n"` pipes the two confirmation prompts CGC requires so you don't have to type them manually.
2. `cgc index "$target"` — parses your code with Tree-sitter and loads it into KuzuDB.
3. `cgc visualize` — starts a local web server and opens the graph UI.

---

## Exploring the visual graph

Once the browser opens, you'll see your codebase rendered as an interactive node graph. Some things you can do:

- **Click any node** to inspect its properties — file path, function signature, line number
- **Search** for specific symbols using the search bar
- **Zoom and drag** to navigate large graphs
- **Switch layouts** between force-directed and hierarchical views

For power users, the CLI also generates standalone HTML visualizations for specific queries:

```bash
# Visualize all callers of a function
cgc analyze callers myFunction --viz

# Visualize class inheritance
cgc analyze tree MyClass --viz

# Visualize search results
cgc find pattern "Auth" --viz
```

Each `--viz` command generates a self-contained HTML file you can open in any browser, share with teammates, or save for documentation.

---

## Connecting to AI assistants (MCP)

CGC also works as an MCP (Model Context Protocol) server, giving AI coding assistants structural awareness of your codebase. To configure it for VS Code or Claude:

```bash
cgc mcp setup
```

The interactive wizard detects your IDE and writes the correct config. Once connected, you can ask your AI assistant things like "find all functions that call `validateToken`" and it will query the graph rather than just searching text.

---

## Where CGC stores data

Everything lives in `~/.codegraphcontext/` — CGC never writes anything into your project directories.

```
~/.codegraphcontext/
├── .env          # config (DB type, credentials)
├── kuzudb/       # graph database files
└── logs/         # indexing logs
```

To check disk usage:

```bash
du -sh ~/.codegraphcontext/
```

To see all currently indexed projects:

```bash
cgc list
```

---

## Further reading

- [GitHub repository](https://github.com/CodeGraphContext/CodeGraphContext)
- [Full CLI reference](https://github.com/CodeGraphContext/CodeGraphContext/blob/main/docs/CLI_COMPLETE_REFERENCE.md)
- [Official docs](https://codegraphcontext.github.io/CodeGraphContext/)