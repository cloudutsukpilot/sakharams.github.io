---
layout: post
title: ArgoCD with k3d
categories: [devops, cicd, gitops, argocd]
tags: [DevOps, CICD, GitOps, ArgoCD]
image: /assets/img/devops/cicd/gitops/argocd/argocd-posts.png
description: Install ArgoCD on a k3d cluster with nginx deployment
---


# GitOps with ArgoCD

## Pre-requisites

- Tools
  - k3d
  - git
- Understanding of below technologies:
  - Git
  - Kubernetes
  - Containers
  - GitOps concepts

## Setup K3s Local Cluster

A. Create a cluster-config.yaml file:

```sh
cat <<EOF > cluster-config.yaml
apiVersion: k3d.io/v1alpha5
kind: Simple
servers: 1
agents: 2
EOF
```

B. Create a local K8 cluster

```sh
k3d cluster create argocd-cluster --config ./cluster-config.yaml
```

C. Verify if you are able to connect to the cluster.

```sh
kubectl get nodes
```

## Installing ArgoCD

1. Create a new namesapce

    ```sh
    kubectl create ns argocd
    ```

2. Deploy ArgoCD on Kuberntes

    ```sh
    curl -o install.yaml https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
    ```

    ```sh
    kubectl apply -n argocd -f install.yaml
    ```

    OR

    ```sh
    kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
    ```

3. Install ArgoCD CLI (Ref: https://argo-cd.readthedocs.io/en/stable/cli_installation/)

    ```sh
    brew install argocd
    ```

4. Verify the argocd and argocd cli version

    ```sh
    argocd version
    ```

    ```sh
    argocd version --client
    ```

5. Expose the ArgoCD service on NodePort

    ```sh
    kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort"}}'
    ```

    ```sh
    kubectl port-forward svc/argocd-server -n argocd 8080:443
    ```

6. Get the ArgoCD Username and Password

    ```sh
    kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d  && echo
    ```

## Setup a Git Repo and create nginx deployment

1. Create a repository in GitHub

2. Clone the repository

    ```sh
    git clone git@github.com:cloudutsukpilot/loony-argocd-repo.git
    ```

3. Create an nginx directory and nginx deployment files.

```sh
 mkdir nginx_yaml_files && cd nginx_yaml_files
```

```sh
cat <<EOF > deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  namespace: nginx
  labels:
    app: nginxi
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx
        name: nginx
EOF
```

```sh
cat <<EOF > service.yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    app: nginx
  name: nginx-service
  namespace: nginx
spec:
  ports:
  - port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: nginx
  type: NodePort
EOF
```

4. Push the new files to GitHub repository

```sh
git add .
```

```sh
git commit -m "Adding nginx files"
```

```
git push origin main
```

### Sync the Repo in ArgoCD and Verify the Deployment

1. Login into ArgoCD, and add the repository under Settings->Repositories using either https or ssh url of the git repository.
2. Once connected, create a new app in ArgoCD under Applications and enter the required fields
    - Application Name: simple-nginx-server
    - Repository URL: Select from the List
    - Path: nginx_yaml_files
    - Cluster URL: https://kubernetes.default.svc
3. Click on the `Create` button. Once created, sync the repo using the `SYNC` button to deploy the nginx deployment and service on the kubernetes cluster.
4. Using port-forward on the nginx service and verify that it is accessible in the browser.
5. Try changing the replicas in the git repo(push the changes) and manually sync the app in ArgoCD UI to view the changes replicated on the cluster.
6. In ArgoCD, navigate to the application the enable the option for auto-sync, under 
7. Again try increasing/decreasing the replicas in the git repository and watch the changes automatically deployed to the k3d cluster.

### CleanUp

1. Delete the k3d cluster

    ```sh
    k3d cluster delete argocd-cluster
    ```

2. Remove the files

    ```sh
    rm cluster-config.yaml
    ```

3. Delete the repository from github and local storage.