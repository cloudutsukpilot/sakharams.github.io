---
layout: post
title: Helm - Flappy Burd
categories: [devops, orchestration, helm]
tags: [Assignments]
image: /assets/img/common/assignment.png
description: Lab assignment for creating a helm chart for flappy-bird
---

### Prerequisites

- Kubernetes
- kubectl
- helm
- git
- tree

### Assignment

- Install git and tree:

```sh
apt update && apt install -y git tree
```

- Install Helm:

```sh
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

```sh
helm version
```

- Create a Helm Chart:

```sh
helm create flappy-app
```

- Navigate into the newly created flappy-app directory and explore the Helm chart's structure.

```sh
cd flappy-app
```

```sh
tree
```

- Now, customize the Chart.yaml file.
- This file contains key information about our Helm chart, such as the chart name and description.
- Edit the file to set the description to `Flappy Dock Game Helm chart` (without quotes) and leave the version as it's default:

```sh
vim Chart.yaml
```

- Modify the values.yaml file to set the image repository to `spurin/flappy-dock` and use the `latest` tag (again without quotes for both). 
- Also, disable the serviceAccount by setting its related boolean values to false.

```sh
vim values.yaml
```

- Package the Helm chart for distribution. This step demonstrates Helm's versatility in chart management and version control -

```sh
helm package .
```

- Deploy the application using the packaged Helm chart. This showcases Helm's ability to manage applications from packaged charts, which is useful for version control and distribution:

```sh
helm install flappy-app ./flappy-app-0.1.0.tgz
```

- Helm would have provided us with some convenient commands, for ease we can run these as follows, this will also set up a port-forward to our application (you may need to retry if the app isn't running) -

```sh
export POD_NAME=$(kubectl get pods --namespace default -l "app.kubernetes.io/name=flappy-app,app.kubernetes.io/instance=flappy-app" -o jsonpath="{.items[0].metadata.name}"); export CONTAINER_PORT=$(kubectl get pod --namespace default $POD_NAME -o jsonpath="{.spec.containers[0].ports[0].containerPort}"); echo "Visit http://127.0.0.1:8080 to use your application"; kubectl --namespace default port-forward $POD_NAME 8080:$CONTAINER_PORT
```

- Bring up a new tab to the Reverse Proxy and select the following - Control Plane ➜ 127.0.0.1 ➜ 8080 and then press Go, have some fun with the game and when complete, move back to the previous tab and press ctrl-c

- Explore the deployed Kubernetes resources to understand how Helm interacts with Kubernetes. Check the deployment, pods, and services created by our Helm chart -

```sh
kubectl get deployment; echo; kubectl get pods; echo; kubectl get svc
```

- Check whats showing from a helm viewpoint:

```sh
helm list
```

- And then, let's uninstall the Helm chart to clean up the deployed resources -

```sh
helm uninstall flappy-app
```

Finally, let's clean up the environment -

```sh
cd ..; rm -rf flappy-app
```