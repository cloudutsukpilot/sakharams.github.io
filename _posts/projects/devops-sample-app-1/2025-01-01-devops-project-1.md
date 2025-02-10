---
layout: post
title: DevOps - Complete CI/CD Project
categories: [projects, devops]
tags: [Projects, DevOps]
image: /assets/img/devops/devops-posts.webp
description: A complete CI-CD project to build and deploy a sample app using docker, helm and kubernetes.
---

## Project Overview

1. **Full-Stack Application**
    - `Frontend`: React.js
    - `Backend`: FastAPI (Python)

2. **Docker Setup**
    - Create Dockerfiles for both frontend and backend services.

3. **GitHub Actions Pipeline**
    - `Dev Deployment`: Deploy daily at midnight from the dev branch to the dev cluster.
    - `QA Deployment`: Deploy every Monday from the release branch to the QA cluster.
    - `Prod Deployment`: Deploy on Thursday from the QA release to the prod cluster with manual approval for prod.

4. **Helm Charts for Kubernetes Deployment**
    - Define Helm charts for both frontend and backend deployments.

5. **Release Strategy**
    - `Dev`: Automatic deployment to dev.
    - `QA`: Create a release every Monday and deploy it to QA.
    - `Prod`: Deploy to prod on Thursday after QA validation with manual approval.
