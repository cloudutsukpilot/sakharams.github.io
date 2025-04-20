---
layout: post
title: Helm v/s Kustomize
categories: [devops, orchestration, helm]
tags: [DevOps, Orchestration, Helm]
image: /assets/img/devops/orchestration/helm/helm-posts.avif
description: 
---

## Introduction

- `Helm` is a powerful tool for managing Kubernetes applications, offering features like templating, dependency management, and version control. It is ideal for teams looking to package and distribute applications efficiently.

### Kustomize

- Kustomize is a configuration customization tool for Kubernetes clusters. It allows administrators to make declarative changes using untemplated files, leaving original manifests untouched.
- All customization specifications are contained within a kustomization.yaml file, which superimposes specifications on top of existing manifests to generate custom versions of resources.
- Kustomize also ships with resource generators (secretGenerator and configMapGenerator) that use environment files or key-value pairs to create secrets and ConfigMaps.
- To inject these secrets and ConfigMaps into Kubernetes infrastructure, you define them within the customization file using secretGenerator and configMapGenerator fields, with attributes that specify source files or key-value pairs.

### Helm

- Helm is a package manager for Kubernetes that simplifies the deployment and management of applications by using charts, which are pre-configured application templates.
- It allows administrators to define reusable templates and manage application configurations using values files, enabling consistent deployments across environments.
- Helm supports dependency management, making it easier to manage complex applications with multiple components.
- With features like versioning and rollback, Helm ensures better control over application lifecycle management in Kubernetes.

### Helm v/s Kustomize

| Dimension         | Helm                                                                 | Kustomize                                                                 |
|-------------------|----------------------------------------------------------------------|---------------------------------------------------------------------------|
| Overall purpose   | Package manager for Kubernetes with support for templating, dependency management, and versioning of applications. | Customize existing Kubernetes YAML manifests by overlaying changes also defined in YAML. |
| Complexity        | More complex to work with, since it introduces the need to learn Go templates and the overall structure of charts. | Simpler to work with, since it leverages only native YAML constructs and does not introduce templating languages. |
| Customization features | Full templating system with conditionals, loops, functions, and variable substitution. | Strategic merge patches, JSON patches, name prefixes/suffixes, common labels, and annotations. |
| Use-cases         | - Packaging and managing applications and their dependencies <br> - Versioning of applications <br> - More advanced customizations via templates and values files. | - Managing environment-specific customizations (e.g., dev, staging, prod) <br> - Applying patches and modifications without duplicating YAML |

### Example

![Helm vs Kustomize](/assets/img/devops/orchestration/helm/helm-vs-kustomize.png)

- Sample Directory Structure:

  - **Kustomize**

    ```sh
    hello—world/
    |__ base
    |   |__ deployment. yaml
    |   |__ kustomization. yaml
    |__ overlays
    |   |__production/
    |      |__replica—count. yaml
    |      |__kustomization. yaml
    |   |__dev/
    |      |__replica—count. yaml
    |      |__kustomization. yaml
    ```

  - **Helm**

    ```sh
    hello-world-chart/
    |__ charts/                   # (Optional) Subcharts if needed
    |__ templates/                # Contains YAML templates for Kubernetes manifests
    |   |__ deployment.yaml       # Equivalent to `base/deployment.yaml`
    |   |__ _helpers.tpl          # Helm template helpers (e.g., naming conventions)
    |   |__ NOTES.txt             # Chart notes
    |__ values.yaml               # Default values (like base configurations)
    |__ values-production.yaml    # Equivalent to overlays/production configs
    |__ values-dev.yaml           # Equivalent to overlays/dev configs
    |__ Chart.yaml                # Helm chart metadata
    |__ README.md   
    ```
