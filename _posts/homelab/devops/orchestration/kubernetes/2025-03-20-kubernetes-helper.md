---
layout: post
title: Kubernetes Helper 
categories: [homelab, docker]
tags: [HomeLab, Helper]
image: /assets/img/homelab/homelab-posts.png
description: Kubernetes Helper
---

## Docker Helper

## Operating System

| Operating System | Command |  
| ---------------- | ------- |  
| Ubuntu           | kubectl run -it --rm --image=ubuntu -- bash |  
| Debian           | kubectl run -it --rm --image=debian -- bash |  
| Windows          | kubectl run -it --rm --image=mcr.microsoft.com/windows/servercore:ltsc2022 -- cmd |  
| Alpine           | kubectl run -it --rm --image=alpine -- sh |  
| CentOS           | kubectl run -it --rm --image=centos -- bash |  
| Fedora           | kubectl run -it --rm --image=fedora -- bash |  
| Arch Linux       | kubectl run -it --rm --image=archlinux -- bash |  

### Linux Based Tools

| Tools       | Command                                      |
|-------------|----------------------------------------------|
| curl        | kubectl run -it --rm --image=curlimages/curl -- sh       |
| wget, ping  | kubectl run -it --rm --image=busybox -- sh            |
| netcat, nmap | kubectl run -it --rm --image=instrumentisto/nmap -- sh |
| traceroute, dig, tcpdump  | kubectl run -it --rm --image=nicolaka/netshoot -- sh |
| iperf       | kubectl run -it --rm --image=networkstatic/iperf3 --    |
| telnet      | kubectl run -it --rm --image=alpine -- sh           |

### DevOps

| Toolset         | Kubernetes Command                              |  
|-----------------|-------------------------------------------------|  
| Jenkins         | kubectl run -it --rm --image=jenkins/jenkins -- sh |  
| GitLab Runner   | kubectl run -it --rm --image=gitlab/gitlab-runner --  sh |  
| Ansible         | kubectl run -it --rm --image=williamyeh/ansible -- sh |  
| Terraform       | kubectl run -it --rm --image=hashicorp/terraform -- sh |  
| Kubernetes CLI  | kubectl run -it --rm --image=bitnami/kubectl -- sh |  
| Helm            | kubectl run -it --rm --image=alpine/helm --  sh |  
| AWS CLI         | kubectl run -it --rm --image=amazon/aws-cli -- sh |  
| Azure CLI       | kubectl run -it --rm --image=mcr.microsoft.com/azure-cli -- sh |  
| GCP CLI         | kubectl run -it --rm --image=google/cloud-sdk -- sh |  
| Vault           | kubectl run -it --rm --image=hashicorp/vault -- sh |  
| Consul          | kubectl run -it --rm --image=hashicorp/consul -- sh |  
| Packer          | kubectl run -it --rm --image=hashicorp/packer -- sh |  

### Programming Languages

| Programming Language | Kubernetes Command                              |  
|----------------------|-------------------------------------------------|  
| Python               | kubectl run -it --rm --image=python -- sh       |  
| Node.js              | kubectl run -it --rm --image=node -- sh         |  
| Ruby                 | kubectl run -it --rm --image=ruby -- sh         |  
| Go                   | kubectl run -it --rm --image=golang -- sh       |  
| Java                 | kubectl run -it --rm --image=openjdk -- sh      |  
| PHP                  | kubectl run -it --rm --image=php -- sh          |  
| Perl                 | kubectl run -it --rm --image=perl -- sh         |  
| Rust                 | kubectl run -it --rm --image=rust -- sh         |  
| .NET                 | kubectl run -it --rm --image=mcr.microsoft.com/dotnet/runtime -- sh |  
| R                    | kubectl run -it --rm --image=r-base -- sh       |  
| Julia                | kubectl run -it --rm --image=julia -- sh        |  
| Scala                | kubectl run -it --rm --image=hseeberger/scala-sbt -- sh |  
| Kotlin               | kubectl run -it --rm --image=gradle -- sh       |  
| Swift                | kubectl run -it --rm --image=swift -- sh        |  

### Conclusion

- Use these container images for troubleshooting issues while working with docker and kubernetes.
