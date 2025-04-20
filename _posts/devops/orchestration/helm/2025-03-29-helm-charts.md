---
layout: post
title: Helm Charts
categories: [devops, orchestration, helm]
tags: [DevOps, Orchestration, Helm]
image: /assets/img/devops/orchestration/helm/helm-posts.avif
description: Explore Helm Charts
---

## Introduction

A Helm chart is a structured collection of files defining a Kubernetes application.

### Why build our own charts?

- `Off-the-shelf, well-maintained charts may not exist` for your specific application.
- `Versioning` makes it easier to upgrade and rollback the many related objects of an application.
- `Custom charts` allow you to define deployment configurations tailored to your app.
- `Enforce organizational policies and best practices`, allowing teams to standardize how applications are deployed within your organization.
- `Control over all Kubernetes resources and their configurations`, with the possibility of implementing custom logic in the templates.
- `Reuse existing charts` (either community or private) as dependencies for complex applications, while following best practices.
- `Templating`: Avoids redundant YAML definitions by using reusable templates.
- `Dependency Management`: Helps manage application dependencies efficiently.

### Helm Chart Structure

- A Helm chart is a structured collection of files defining a Kubernetes application. The typical structure of a Helm chart looks like this:

```yaml
mychart/
├── charts/             # Subcharts (dependencies)
├── templates/          # Templated YAML files
│   ├── /tests          # Tests to be executed using helm test     
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── _helpers.tpl    # Reusable template functions
│   ├── ingress.yaml    # Ingress resource (optional)
│   └── NOTES.txt       # Post-installation instructions
├── values.yaml         # Default configuration values
├── Chart.yaml          # Metadata about the chart
├── README.md           # Documentation
└── Notes.txt           # Contents printed upon successful chart installation or upgrade.
```

### Key Files Explained

| **File/Directory** | **Description**                                                                 |
|---------------------|------------------------------------------------------------------------------- |
| `Chart.yaml`        | Contains metadata like name, version, and description of the chart.            |
| `values.yaml`       | Defines the default values for templates.                                      |
| `templates/`        | Contains Kubernetes resource templates with placeholders.                      |
| `charts/`           | Holds dependencies (subcharts).                                                |
| `README.md`         | Provides documentation about the chart.                                        |

- **Chart.yaml**
  - A YAML file containing metadata about the chart. Among other fields, allows us to set:
  - `apiVersion`: The chart API version (vl or v2). For Helm 3, use v2.
  - `name`: The name of the chart
  - `version`: The version of the chart (uses •semantic versioning).
  - `description`: A brief description of the chart.
  - `type`: Type of chart (e.g., application or library).
  - `keywords`: A list of keywords representative of the project.
  - `dependencies`: A list of other charts that the current chart depends on.

### Creating Your First Helm Chart

- Let’s create a simple Helm chart for a web application.

`Step 1: Install Helm`

- Ensure Helm is installed on your machine:

```sh
helm version
```

`Step 2: Create a Helm Chart`

- Run the following command to create a new chart:

```sh
helm create mychart
```

`Step 3: Modify values.yaml`

- Update values.yaml to define custom values:

```yaml
replicaCount: 2
image:
  repository: nginx
  tag: latest
  pullPolicy: IfNotPresent
service:
  type: ClusterIP
  port: 80
```

`Step 4: Install the Helm Chart`

- Deploy the chart to a Kubernetes cluster:

```sh
helm install my-release ./mychart
```

`Step 5: Verify the Deployment`

- Check the installed release:

```sh
helm list
```

`Step 6: Upgrade or Uninstall`

- Upgrade the release:

```sh
helm upgrade my-release ./mychart
```

- Uninstall the release:

```sh
helm uninstall my-release
```

### Conclusion

Helm charts simplify Kubernetes application deployment by providing a structured approach to packaging, managing, and upgrading applications. Whether you are deploying microservices, databases, or entire applications, Helm offers a scalable and maintainable solution.