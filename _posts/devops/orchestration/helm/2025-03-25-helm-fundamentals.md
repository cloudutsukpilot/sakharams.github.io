---
layout: post
title: Helm Fundamentals
categories: [devops, orchestration, helm]
tags: [DevOps, Orchestration, Helm]
image: /assets/img/devops/orchestration/helm/helm-posts.avif
description: Explore Helm fundamentals, ArtifactHub, Helm repositories, chart installation, dependency management, setting values, and release upgrades.
---

## Helm Fundamentals: Managing Kubernetes Deployments with Helm

Helm is the de facto package manager for Kubernetes, simplifying application deployment and management.

### Exploring ArtifactHub and Helm Repositories

- ArtifactHub is a central repository where users can discover and share Helm charts, operators, and other Kubernetes resources.
- It allows users to browse and search for Helm charts maintained by the community and official providers.
- Visit [ArtifactHub](https://artifacthub.io/) to explore available charts and their documentation.

### Managing Helm Repositories with the Helm CLI ⚙️

- Helm repositories store and distribute Helm charts.
- The default Helm repository is Helm’s official stable repository, but users can add custom repositories.

- **Adding a Helm Repository**

  ```sh
  helm repo add bitnami https://charts.bitnami.com/bitnami
  ```

- **Listing Available Repositories**

  ```sh
  helm repo list
  ```

- **Updating the Helm Repository**

  ```sh
  helm repo update
  ```

## Installing Charts ⚡

- **Installing the WordPress Helm Chart**
  - Let’s install the WordPress Helm chart from the Bitnami repository:

    ```sh
    helm install my-wordpress bitnami/wordpress
    ```

  - This deploys WordPress in a Kubernetes cluster with default configurations.

- **Exploring the Default WordPress Chart Configuration**
  - After installation, you can check the installed resources:

    ```sh
    kubectl get all
    ```

  - To inspect the default configuration:

    ```sh
    helm show values bitnami/wordpress
    ```

### Uninstalling Helm Charts and Cleaning Up Resources

- To uninstall the WordPress deployment:

  ```sh
  helm uninstall my-wordpress
  ```

- This removes the release but not persistent volumes. To delete all associated resources, manually remove PVCs:

  ```sh
  kubectl delete pvc --all
  ```

### Managing Chart Dependencies ⚙️

- Helm charts can have dependencies on other charts, defined in the Chart.yaml file.
- To manage dependencies:

- **Adding Dependencies to Chart.yaml**

  ```sh
  dependencies:
    - name: mysql
      version: "8.0.0"
      repository: "https://charts.bitnami.com/bitnami"
  ```

- **Updating Dependencies⚡**

- Run the following command to fetch and update dependencies:

  ```sh
  helm dependency update
  ```

### Setting Values

- **Setting Custom Values via the Helm CLI**
  - You can override default values while installing a chart: ⚙️️

    ```sh
    helm install my-wordpress bitnami/wordpress --set wordpressUsername=admin,wordpressPassword=secret
    ```

- **Setting Custom Values via Files ✍️**
  - Instead of passing values in CLI, store them in a file:
  
    ```sh
    wordpressUsername: admin
    wordpressPassword: secret
    ```

  - Install the chart with:

    ```sh
    helm install my-wordpress bitnami/wordpress -f custom-values.yaml
    ```

### Release Upgrades and Rollbacks ⏳

- **Upgrading Helm Releases: Setting New Values ⚙️**

  - Modify values and upgrade the release:

    ```sh
    helm upgrade my-wordpress bitnami/wordpress --set wordpressEmail=admin@example.com
    ```

- **Upgrading Helm Releases: Setting New Chart Versions **

  - To upgrade to a specific version:

    ```sh
    helm upgrade my-wordpress bitnami/wordpress --version 10.1.0
    ```

- **Rollbacks in Helm ⏪**

  - If an upgrade fails, roll back to a previous version:

    ```sh
    helm rollback my-wordpress 1
    ```

  - Check revision history with:

    ```sh
    helm history my-wordpress
    ```

- **Upgrading Helm Releases: Useful CLI Flags⚡**

  - `--atomic`: Rollback automatically if the upgrade fails.
  - `--dry-run`: Preview changes before applying.
  - `--debug`: Get detailed error logs.

  - Example:

    ```sh
    helm upgrade my-wordpress bitnami/wordpress --set wordpressTitle="My Blog" --atomic --debug
    ```

### Conclusion

Helm simplifies Kubernetes deployments, allowing users to manage applications efficiently. From discovering charts on ArtifactHub to managing values, dependencies, and rollbacks, Helm provides powerful tools to streamline Kubernetes operations. ⚡

Try out Helm in your cluster and explore its potential!
