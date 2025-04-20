---
layout: post
title: Minikube Error - Failed to pull image 
categories: [issues-fixes]
tags: [Fixies, Orchestration, Kubernetes, Minikube, OpenSSL, Errors]
image: /assets/img/issues-fixes/issues-fixes-posts.jpg
description: Minikube Error - Failed to pull image 
---

### Environment

- Operating System: MacOS
- Orchestration Tool: Minikube

### Actions

- While deploying a sample app on the minikube cluster using a image stored in dockerhub, the error was encountered.

### Error

- Failed to pull image "<dockerhub-username>/<repository>:<tag>": Error response from daemon: Get "https://registry-1.docker.io/v2/": tls: failed to verify certificate: x509: certificate signed by unknown authority

### Reason

- The system on which minikube was running was behind the corporate proxy.

### Solution

1. Copy the corporate certificate to the Minikube directory

```sh
cp <path-to-corporate-cert>  ~/.minikube/certs/
```

2. Restart Minikube

```
minikube stop
minikube start
```