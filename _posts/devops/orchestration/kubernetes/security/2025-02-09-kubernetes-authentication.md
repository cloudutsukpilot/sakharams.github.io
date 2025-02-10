---
layout: post
title: Kubernetes - Authentication
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
image: /assets/img/devops/orchestration/kubernetes/kubernetes-posts.png
description: How does the authentication works when you run a kubectl command?
---

## Understanding Authentication in Kubernetes

- When working with Kubernetes, we often use kubectl commands to interact with the cluster. But how does Kubernetes know who we are and whether we have the right permissions?
- Authentication in Kubernetes relies on a kubeconfig file, which stores authentication details such as user credentials, clusters, and contexts. By running the following command, we can inspect our current configuration:

```sh
kubectl config view
```

- For a more detailed view, including redacted or omitted information, we can use:

```sh
kubectl config view --raw
```

### Kubeconfig Structure

- A kubeconfig file consists of the following key components:

1. `Contexts`: Defines the current Kubernetes cluster and the associated user.
2. `Clusters`: Specifies the API server and certificate authority (CA) details.
3. `Users`: Contains authentication credentials such as client certificates or tokens.

- For example, a context in the kubeconfig file may look like this:

```yaml
contexts:
  - name: default
    context:
      cluster: default
      user: default
```

- Here, we have a context named default that references a cluster named default and a user named default.

### Certificate Authority and Authentication

- When a Kubernetes cluster is created, a Certificate Authority (CA) is also set up.
- The CA verifies the authenticity of the API server and prevents man-in-the-middle attacks.
- The kubeconfig file references the CA's public certificate to establish secure communication.
- To inspect the CA certificate, we can decode its base64 representation:

```sh
echo <base64-certificate> | base64 -d
```

- Kubernetes also uses client certificates and private keys to authenticate users.
- The kubeconfig file contains client-certificate-data and client-key-data, which represent the user’s credentials.

### Decoding Client Certificates

- To view the client certificate, we can decode it as follows:

```sh
echo <base64-client-certificate> | base64 --decode | openssl x509 -text -noout
```

- This command reveals the Common Name (CN) and Organization (O) fields, which are essential in Kubernetes authentication:
  - `CN (Common Name)`: Represents the user’s identity.
  - `O (Organization)`: Represents the user’s group membership.

- For example, a user might have the following details:
  - `CN=system:admin`
  - `O=system:masters`
