---
layout: post
title: Helm Commands
categories: [devops, orchestration, helm]
tags: [DevOps, Orchestration, Helm, CMDsheet]
image: /assets/img/devops/orchestration/helm/helm-posts.avif
description: Helm CMDsheet
---

## Commonly Used Helm Commands with Examples

Helm is a powerful package manager for Kubernetes, simplifying the deployment and management of applications. 

### Commonly Used Commands

| Command                  | Description                                      | Example                                   |
|--------------------------|--------------------------------------------------|-------------------------------------------|
| `helm repo add`          | Add a new Helm chart repository.                | `helm repo add stable https://charts.helm.sh/stable` |
| `helm repo update`       | Update information of available charts locally. | `helm repo update`                        |
| `helm search repo`       | Search for charts in the Helm repositories.     | `helm search repo nginx`                  |
| `helm install`           | Install a Helm chart.                           | `helm install my-release stable/nginx`    |
| `helm upgrade`           | Upgrade a release to a new chart or version.    | `helm upgrade my-release stable/nginx`    |
| `helm rollback`          | Roll back a release to a previous revision.     | `helm rollback my-release 1`              |
| `helm list`              | List all Helm releases.                         | `helm list`                               |
| `helm uninstall`         | Uninstall a Helm release.                       | `helm uninstall my-release`               |
| `helm show values`       | Display the default values of a chart.          | `helm show values stable/nginx`           |
| `helm template`          | Render chart templates locally without installing. | `helm template my-release stable/nginx`   |

### Helm Chart Management

| Command                  | Description                                      | Example                                   |
|--------------------------|--------------------------------------------------|-------------------------------------------|
| `helm list`              | List all Helm releases.                         | `helm list`                               |
| `helm status`            | Display the status of a Helm release.           | `helm status my-release`                  |
| `helm history`           | Show the history of a Helm release.             | `helm history my-release`                 |
| `helm upgrade`           | Upgrade a release to a new chart or version.    | `helm upgrade my-release stable/nginx`    |
| `helm rollback`          | Roll back a release to a previous revision.     | `helm rollback my-release 1`              |
| `helm uninstall`         | Uninstall a Helm release.                       | `helm uninstall my-release`               |
| `helm test`              | Run tests for a release.                        | `helm test my-release`                    |
| `helm get all`           | Fetch all information about a release.          | `helm get all my-release`                 |
| `helm get values`        | Retrieve the values of a release.               | `helm get values my-release`              |
| `helm get manifest`      | Fetch the manifest of a release.                | `helm get manifest my-release`            |
| `helm get hooks`         | Retrieve the hooks of a release.                | `helm get hooks my-release`               |
| `helm get notes`         | Fetch the notes of a release.                   | `helm get notes my-release`               |
| `helm diff`              | Compare a release with a new chart or version.  | `helm diff upgrade my-release stable/nginx` |

### Helm Repo

| Command                  | Description                                      | Example                                   |
|--------------------------|--------------------------------------------------|-------------------------------------------|
| `helm repo add`          | Add a new Helm chart repository.                | `helm repo add stable https://charts.helm.sh/stable` |
| `helm repo update`       | Update information of available charts locally. | `helm repo update`                        |
| `helm repo list`         | List all configured Helm chart repositories.    | `helm repo list`                          |
| `helm repo remove`       | Remove a Helm chart repository.                 | `helm repo remove stable`                 |
| `helm repo index`        | Generate an index file for a chart repository.  | `helm repo index ./charts`                |

### Helm Search

| Command                  | Description                                      | Example                                   |
|--------------------------|--------------------------------------------------|-------------------------------------------|
| `helm search hub`        | Search for charts on the Helm Hub.              | `helm search hub nginx`                   |
| `helm search repo`       | Search for charts in the Helm repositories.     | `helm search repo mychart`                |
| `helm search repo -l`    | List all versions of a chart in the repository. | `helm search repo mychart -l`             |
| `helm search repo --versions` | Show all chart versions in the repository. | `helm search repo mychart --versions`     |
| `helm search repo --regexp`   | Search charts using a regular expression.  | `helm search repo '^mychart.*'`           |

### Helm Install

| Command                  | Description                                      | Example                                   |
|--------------------------|--------------------------------------------------|-------------------------------------------|
| `helm install`           | Install a Helm chart.                           | `helm install my-release stable/nginx`    |
| `helm install --dry-run` | Simulate an install without making changes.      | `helm install my-release stable/nginx --dry-run` |
| `helm install --set`     | Override chart values during installation.       | `helm install my-release stable/nginx --set key=value` |
| `helm install --values`  | Use a custom values file for installation.       | `helm install my-release stable/nginx --values custom-values.yaml` |
| `helm install --namespace` | Specify the namespace for the release.         | `helm install my-release stable/nginx --namespace my-namespace` |
| `helm install --version` | Install a specific version of a chart.           | `helm install my-release stable/nginx --version 1.2.3` |