---
layout: post
title: Troubleshooting Tips Per Topic
categories: [certification, cka]
tags: [Certification]
image: /assets/img/devops/orchestration/kubernetes/kubernetes-posts.png
description: Troubleshooting Tips Per Topic
---

## CKA Tips

- In this section we'll provide some tips on how troubleshoot issues based on CKA topics.

### General Tips

1. Use `tail` and `grep` to follow the logs real time.
2. Always make a copy of the any files before modifying.
3. Set up the environment before starting the exam

```sh
alias k=kubectl                         # will already be pre-configured

export do="--dry-run=client -o yaml"    # k create deploy nginx --image=nginx $do

export now="--force --grace-period 0"   # k delete pod x $now
```

### Apiserver Crash/Misconfiguration

| File           | Location                                             |
| -------------- | ---------------------------------------------------- |
| Configuration  | `/etc/kubernetes/manifests/kube-apiserver.yaml`      |
| Logs           | `/var/log/pods`                                      |
|                | `/var/log/containers`                                |
|                | `crictl ps` and `crictl logs <containerid>`          |
|                | `docker ps` and `docker ps <containerid>`            |
| Kubelet Config | `/var/lib/kubelet/`                                  |
| Kubelet Logs   | `/var/log/syslog` or `journalctl`                    |

### systemctl commands

| Command                         | Description                           |
| ------------------------------- | ------------------------------------- |
| `systemctl cat <service_name>`  | To check the service configuration    |
