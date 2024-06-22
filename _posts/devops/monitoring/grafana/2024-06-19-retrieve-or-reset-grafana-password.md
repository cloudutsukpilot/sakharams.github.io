---
layout: post
title: Introduction to Grafana as a Monitoring Tool in DevOps
categories: [devops, monitoring, grafana]
tags: [DevOps, Monitoring, Grafana]
---

## Kube-stack-prometheus

### Retrieve Grafana Password
kubectl get secret prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo

### Reset Grafana Password
kubectl exec --namespace monitoring -it $(kubectl get pods --namespace monitoring -l "app.kubernetes.io/name=grafana" -o jsonpath="{.items[0].metadata.name}") -- grafana cli admin reset-admin-password yourNewPasswordHere