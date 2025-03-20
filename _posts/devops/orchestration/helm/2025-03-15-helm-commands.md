---
layout: post
title: Helm Commands
categories: [devops, orchestration, helm]
tags: [DevOps, Orchestration, Helm]
image: /assets/img/devops/orchestration/helm/helm-posts.avif
description: Helm Commands
---

## Commonly Used Helm Commands with Examples

Helm is a powerful package manager for Kubernetes, simplifying the deployment and management of applications. In this blog, we will cover commonly used Helm commands, providing an example for each, explaining the output columns, and detailing the system changes where applicable.

### Commonly Used Commands

| Command                  | Description                                      |
|--------------------------|--------------------------------------------------|
| `helm repo add`          | Add a new Helm chart repository.                |
| `helm repo update`       | Update information of available charts locally. |
| `helm search repo`       | Search for charts in the Helm repositories.     |
| `helm install`           | Install a Helm chart.                           |
| `helm upgrade`           | Upgrade a release to a new chart or version.    |
| `helm rollback`          | Roll back a release to a previous revision.     |
| `helm list`              | List all Helm releases.                         |
| `helm uninstall`         | Uninstall a Helm release.                       |
| `helm show values`       | Display the default values of a chart.          |
| `helm template`          | Render chart templates locally without installing. |

### Understanding Helm Commands with --help

- Before diving into specific commands, you can use the `--help` flag to understand what a Helm command does.

```sh
helm install --help
```

- Example Output:

```output
Install a chart archive.

Usage:
  helm install [NAME] [CHART] [flags]

Flags:
  -f, --values stringArray   specify values in a YAML file
  --generate-name            generate a release name if not provided
  --set stringArray          set values on the command line
```

- This provides an overview of how to use the command, its arguments, and available flags.

### Installing a Helm Chart

- Command:

```sh
helm install my-release bitnami/nginx
```

- Example Output:

```output
NAME: my-release
LAST DEPLOYED: Fri Mar 15 12:30:00 2025
NAMESPACE: default
STATUS: deployed
REVISION: 1
NOTES:
...
```

- Output Column Details:
  - `NAME`: The name of the release.
  - `LAST DEPLOYED`: Timestamp of deployment.
  - `NAMESPACE`: Kubernetes namespace where the release is deployed.
  - `STATUS`: Indicates if the deployment was successful.
  - `REVISION`: The release version.

- System Changes:
  - A Kubernetes deployment for nginx is created along with associated services and pods.

### Listing Installed Helm Releases

- Command:

```sh
helm list
```

- Example Output:

```output
NAME        	NAMESPACE	REVISION	UPDATED         	STATUS  	CHART       	APP VERSION
my-release 	default  	1       	2025-03-15 12:30	deployed	nginx-13.2.9	1.21.6
```

- Output Column Details:
  - `NAME`: Name of the Helm release.
  - `NAMESPACE`: Kubernetes namespace.
  - `REVISION`: Number of times the release has been updated.
  - `UPDATED`: Last modification timestamp.
  - `STATUS`: Current status (e.g., deployed, failed, superseded).
  - `CHART`: Chart name and version.
  - `APP VERSION`: Application version of the installed chart.

- System Changes:
  - No changes; this command only fetches and displays release information.

### Upgrading a Helm Release

- Command:

```sh
helm upgrade my-release bitnami/nginx --set image.tag=latest
```

- Example Output:

```output
Release "my-release" has been upgraded. Happy Helming!

NAME: my-release
LAST DEPLOYED: Fri Mar 15 12:45:00 2025
NAMESPACE: default
STATUS: deployed
REVISION: 2
```

- System Changes:
  - The deployment is updated with the new nginx image tag.
  - The revision number is incremented.

### Rolling Back a Release

- Command:

```sh
helm rollback my-release 1
```

- Example Output:

```output
Rollback was a success! Happy Helming!
```

- System Changes:
  - The application is restored to revision 1.
  - Any changes introduced in newer revisions are undone.

### Uninstalling a Release

- Command:

```sh
helm uninstall my-release
```

- Example Output:

```sh
release "my-release" uninstalled
```

- System Changes:
  - All Kubernetes resources associated with my-release are deleted.

### Conclusion

Helm provides a straightforward way to manage Kubernetes applications. By understanding these commands and their effects, you can efficiently deploy, upgrade, and maintain your applications. Use helm --help to explore additional options and fine-tune your Helm workflows.