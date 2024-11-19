---
layout: post
title: Terrastruct
categories: [devops, dac, diagrams]
tags: [DevOps, Diagram as Code(DAC)]
---

## Introduction

- Terrastruct/D2 Studio is the diagramming tool for developers to power all your visual documentation.

### Installation

- Easiest way to install is with the below script:

    ```sh
    curl -fsSL https://d2lang.com/install.sh | sh -s --
    ```

- Using Go:

    ```sh
    go install oss.terrastruct.com/d2@latest
    ```

### Export file types

- D2 currently supports SVG, PNG and PDF exports

### Layout Engines

1. `dagre` (default, bundled):
    - A fast, directed graph layout engine that produces layered/hierarchical layouts.
    - Based on Graphviz's DOT algorithm.

2. `ELK` (bundled):
    - A directed graph layout engine particularly suited for node-link diagrams with an inherent direction and ports.

3. `TALA` (binary):
    - Novel layout engine designed specifically for software architecture diagrams.
    - Requires separate install, visit the Github page for more.

### Commands

- To generate the diagram from the code:

    ```sh
    d2 -w dev_architecture.d2 dev_architecture.svg
    ```

- To generate the diagram from the code with specific layout:

    ```sh
    d2 --layout elk -w dev_architecture.d2 dev_architecture.svg
    ```

### References

- [GitHub](https://github.com/terrastruct/d2?tab=readme-ov-file#quickstart)
- [TALA](https://github.com/terrastruct/TALA)
