---
layout: post
title: Helm - Package and Publish Chart
categories: [devops, orchestration, helm]
tags: [DevOps, Orchestration, Helm]
image: /assets/img/devops/orchestration/helm/helm-posts.avif
description: In this guide, we'll create a Helm chart for Nginx, package it, publish it to GitHub Pages, and then use it to install Nginx on a Kubernetes cluster.
---

## Deploying Nginx using a Helm Chart Hosted on GitHub Pages

Helm is a powerful package manager for Kubernetes that allows you to define, package, and distribute applications as Helm charts.

### Prerequisites

- A GitHub account
- A Kubernetes cluster (minikube, kind, or a cloud provider cluster)
- Helm
- kubectl installed and configured to access the cluster
- git and GitHub CLI (gh) installed

### Steps to package and publish a helm chart

**Step 1: Create the Nginx Helm Chart**

```sh
helm create nginx-chart
```

```sh
cd nginx-chart
```

- This creates a directory structure like:

```yaml
nginx-chart/
├── charts/
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── _helpers.tpl
│   ├── hpa.yaml
│   ├── ingress.yaml
│   ├── NOTES.txt
├── Chart.yaml
├── values.yaml
```

- Modify values.yaml to customize the deployment:

```sh
replicaCount: 2
image:
  repository: nginx
  tag: latest
  pullPolicy: IfNotPresent
service:
  type: LoadBalancer
  port: 80
```

**Step 2: Package the Helm Chart**

```sh
helm package nginx-chart
```

- This generates a `.tgz file`, e.g., `nginx-chart-0.1.0.tgz`.

**Step 3: Create a GitHub Repository for the Helm Chart**

```sh
gh repo create helm-charts --public --description "Helm charts repository"
```

```sh
cd helm-charts
```

````sh
git init
```

```sh
git remote add origin https://github.com/<your-username>/helm-charts.git
```

- Move the .tgz package into this repository and create an index.yaml file:

```sh
helm repo index . --url https://<your-username>.github.io/helm-charts/
```

- Commit and push the changes:

```sh
git add .
git commit -m "Added Nginx Helm chart"
git push origin main
```

**Step 4: Publish the Helm Chart to GitHub Pages**

- Enable GitHub Pages in your repository:
  - Go to Settings → Pages.
  - Under "Branch", select main and / (root).
  - Click "Save".

- Your Helm chart will be available at:

```output
https://<your-username>.github.io/helm-charts/index.yaml
```

**Step 5: Add and Use the Remote Helm Chart**

- Add your repository:

```sh
helm repo add myrepo https://<your-username>.github.io/helm-charts/
```

```sh
helm repo update
```

- Install Nginx using the chart:

```sh
helm install my-nginx myrepo/nginx-chart --namespace default --create-namespace
```

- Verify the installation:

```
kubectl get pods,svc,deploy,rs
```


### Conclusion

You have successfully created an Nginx Helm chart, packaged it, published it to GitHub Pages, and used it to install Nginx on a Kubernetes cluster. This approach can be used for deploying other applications as well. Happy Helm charting!