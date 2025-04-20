---
layout: post
title: Helm Lifecycle - From Development to Deployment
categories: [devops, orchestration, helm]
tags: [DevOps, Orchestration, Helm]
image: /assets/img/devops/orchestration/helm/helm-posts.avif
description: Helm Lifecycle - From Development to Deployment
---

## Helm Lifecycle: From Development to Deployment

Helm is a package manager for Kubernetes that simplifies application deployment, management, and scaling. Understanding the Helm lifecycle ensures efficient chart development, testing, and deployment. This guide covers:

- Creating a Helm Chart
- Implementing Kubernetes Templates
- Writing Automated Tests
- Packaging and Publishing Charts
- Deploying to Kubernetes
- CI/CD Integration

### Helm LifeCycle

![Helm LifeCycle](/assets/img/devops/orchestration/helm/helm-lifecycle.png)

### 1. **Creating a Helm Chart**

- To start, install Helm:

```sh
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

- Create a Helm chart:

```sh
helm create my-app
cd my-app
```

- Directory structure:

```yaml
my-app/
├── charts/
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
├── Chart.yaml
├── values.yaml
```

- Modify values.yaml:

```yaml
replicaCount: 2
image:
  repository: my-app
  tag: latest
  pullPolicy: IfNotPresent
service:
  type: LoadBalancer
  port: 80
```

### 2. **Implementing Kubernetes Templates**

- Helm templates use Go templating to define Kubernetes manifests dynamically.
- Example `templates/deployment.yaml`:

{% raw %}
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app: {{ .Release.Name }}
    spec:
      containers:
      - name: my-app
        image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
        ports:
        - containerPort: 80
```
{% endraw %}

- Render and validate templates:

```sh
helm template my-app ./
```

### 3. **Writing Automated Tests**

- Helm includes testing via helm test. Add a test in templates/tests/test-connection.yaml:

{% raw %}
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: "{{ .Release.Name }}-test"
spec:
  containers:
  - name: curl
    image: curlimages/curl
    command: ['curl', '--fail', 'http://my-app.default.svc.cluster.local']
```
{% endraw %}

- Run tests:

```sh
helm test my-app
```

### 4. **Packaging and Publishing Charts**

- Package the Helm chart:

```sh
helm package my-app
```

- Create an index file for a Helm repository:

```sh
helm repo index .
```

- Publish to GitHub Pages:

```sh
git add .
git commit -m "Publish Helm chart"
git push origin main
```

- Enable `GitHub Pages` under `Settings > Pages`, selecting `main` as the source.
- Add the repository:

```sh
helm repo add myrepo https://<your-username>.github.io/helm-charts/
helm repo update
```

### 5. **Deploying to Kubernetes**

- Install the Helm chart:

```sh
helm install my-app myrepo/my-app --namespace default --create-namespace
```

- Verify the deployment:

```sh
kubectl get pods
kubectl get svc
```

### 6. **CI/CD Integration**

- Use GitHub Actions for automated Helm chart deployment.
- Example `.github/workflows/helm-deploy.yml`:

```yaml
name: Helm Deploy
on:
  push:
    branches:
      - main
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout repository
      uses: actions/checkout@v3
    - name: Install Helm
      run: curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
    - name: Package Helm chart
      run: helm package my-app
    - name: Publish chart
      run: |
        helm repo index . --url https://<your-username>.github.io/helm-charts/
        git add .
        git commit -m "Update Helm chart"
        git push origin main
```

### Conclusion

By following the Helm lifecycle, you can efficiently create, test, package, publish, and deploy applications to Kubernetes. CI/CD automation ensures consistency and reliability in your deployments.