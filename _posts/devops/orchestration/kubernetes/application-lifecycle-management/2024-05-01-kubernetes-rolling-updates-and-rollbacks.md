---
layout: post
title: Kubernetes - Rolling Updates and Rollbacks
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
---

## Introduction:

- Updates and rollbacks refer to changes made to the application or its configuration that are running on the cluster.

1. Updates:
- An update is a process of deploying a new version of your application.
- With Rolling Updates, Kubernetes incrementally updates Pods instances with new ones. The update is done in such a way that no downtime is experienced.

    ```
    kubectl set image deployment/my-deployment my-container=my-image:1.2.3
    ```

2. Rollbacks
- A rollback is the operation of returning to a previous deployment version in case the new version of application is causing issues.
- Kubernetes keeps track of the changes made to the Deployment and allows you to rollback to a previous revision using the kubectl rollout undo command.

    ```
    kubectl rollout undo deployment/my-deployment
    ```
