---
layout: post
title: ArgoCD - Deploy an Application
categories: [devops, cicd, argocd]
tags: [DevOps, CICD, ArgoCD]
---

## Introduction
-  Below is detailed application.yaml file for deploying an application using Argo CD. 
- This YAML defines an Argo CD Application resource, which specifies the source of the application, the destination Kubernetes cluster, and various configurations for syncing and deploying the application.

```
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-application
  namespace: argocd  # Namespace where Argo CD is installed
spec:
  # Source repository details
  source:
    repoURL: 'https://github.com/my-org/my-repo.git'  # Git repository URL
    targetRevision: 'main'  # Git branch, tag, or commit hash to deploy
    path: 'manifests'  # Path to the Kubernetes manifests within the repo
    # Optional: Specify Helm chart details if using Helm
    helm:
      valueFiles:
        - values.yaml
      parameters:
        - name: image.tag
          value: "v1.2.3"

  # Destination cluster details
  destination:
    server: 'https://kubernetes.default.svc'  # URL of the Kubernetes API server
    namespace: my-namespace  # Namespace where the application will be deployed

  # Sync policy for automated deployment
  syncPolicy:
    automated:
      prune: true  # Automatically delete resources that are no longer tracked
      selfHeal: true  # Automatically apply changes when they are detected
    syncOptions:
      - CreateNamespace=true  # Automatically create namespace if it doesn't exist

  # Optional: Define resource-specific health checks
  healthChecks:
    - group: apps
      kind: Deployment
      name: my-deployment
      namespace: my-namespace
      failureCondition: status.availableReplicas < 1
      successCondition: status.availableReplicas > 0

  # Optional: Set resource limits or enable garbage collection
  project: default  # Argo CD Project the application belongs to (use 'default' if no custom project)
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas

  # Optional: Sync waves to control resource deployment order
  syncWave: 0  # Resources in lower waves will sync before those in higher waves
```

### Key Sections Explained:

1. **Source**:
- `repoURL`: The URL of the Git repository where your application's Kubernetes manifests or Helm charts are stored.
- `targetRevision`: The branch, tag, or commit hash to deploy from the repository.
- `path`: The directory within the repository that contains the Kubernetes manifests.
- `helm`: Specifies Helm-related configurations if the application uses Helm charts. You can define values and parameters here.

2. **Destination**:
- `server`: The API server URL of the target Kubernetes cluster. https://kubernetes.default.svc is typically used for in-cluster deployments.
- `namespace`: The Kubernetes namespace where the application will be deployed. It will be created automatically if it doesn't exist and if CreateNamespace=true is set in syncOptions.

3. **Sync Policy**:
- `automated`: Specifies if the application should automatically sync with the Git repository. Enabling prune will remove resources not defined in the Git repository, and selfHeal will automatically fix any drift between the Git repository and the live state.
- `syncOptions`: Includes additional options like auto-creating namespaces.

4. **Health Checks**:
- Custom health checks for resources such as Deployments can be specified to ensure they are in a healthy state post-deployment.

5. **Project**:
- Defines the Argo CD project to which the application belongs. By default, applications belong to the default project.

6. **Ignore Differences**:
- Allows ignoring specific fields in resources when comparing live state with desired state. For example, you might ignore the replicas field in a Deployment to avoid unnecessary syncs.

7. **Sync Wave**:
- Controls the order in which resources are applied. Resources in lower waves are applied first, which can be useful for managing dependencies between resources.