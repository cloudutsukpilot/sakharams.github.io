---
layout: post
title: Docker Helper 
categories: [homelab, docker]
tags: [HomeLab, Helper]
image: /assets/img/homelab/homelab-posts.png
description: Docker Helper
---

## Docker Helper

## Operating System

| Operating System | Command |  
| ---------------- | ------- |  
| Ubuntu           | docker run -it --rm ubuntu bash |  
| Debian           | docker run -it --rm debian bash |  
| Windows          | docker run -it --rm mcr.microsoft.com/windows/servercore:ltsc2022 cmd |  
| Alpine           | docker run -it --rm alpine sh |  
| CentOS           | docker run -it --rm centos bash |  
| Fedora           | docker run -it --rm fedora bash |  
| Arch Linux       | docker run -it --rm archlinux bash |  

### Linux Based Tools

| Tools       | Command                                      |
|-------------|----------------------------------------------|
| curl        | docker run -it --rm curlimages/curl sh       |
| wget, ping  | docker run -it --rm busybox sh            |
| netcat, nmap | docker run -it --rm instrumentisto/nmap sh |
| traceroute, dig, tcpdump  | docker run -it --rm nicolaka/netshoot sh |
| iperf       | docker run -it --rm networkstatic/iperf3    |
| telnet      | docker run -it --rm alpine sh           |

### DevOps

| Toolset         | Docker Image                              |  
|-----------------|-------------------------------------------|  
| Jenkins         | docker run -it --rm jenkins/jenkins       |  
| GitLab Runner   | docker run -it --rm gitlab/gitlab-runner  |  
| Ansible         | docker run -it --rm williamyeh/ansible    |  
| Terraform       | docker run -it --rm hashicorp/terraform   |  
| Kubernetes CLI  | docker run -it --rm bitnami/kubectl       |  
| Helm            | docker run -it --rm alpine/helm          |  
| AWS CLI         | docker run -it --rm amazon/aws-cli        |  
| Azure CLI       | docker run -it --rm mcr.microsoft.com/azure-cli |  
| GCP CLI         | docker run -it --rm google/cloud-sdk      |  
| Vault           | docker run -it --rm hashicorp/vault       |  
| Consul          | docker run -it --rm hashicorp/consul      |  
| Packer          | docker run -it --rm hashicorp/packer      |  

### Programming Languages

| Programming Language | Docker Command                              |  
|----------------------|---------------------------------------------|  
| Python               | docker run -it --rm python bash            |  
| Node.js              | docker run -it --rm node bash              |  
| Ruby                 | docker run -it --rm ruby bash              |  
| Go                   | docker run -it --rm golang bash            |  
| Java                 | docker run -it --rm openjdk bash           |  
| PHP                  | docker run -it --rm php bash               |  
| Perl                 | docker run -it --rm perl bash              |  
| Rust                 | docker run -it --rm rust bash              |  
| .NET                 | docker run -it --rm mcr.microsoft.com/dotnet/runtime bash |  
| R                    | docker run -it --rm r-base bash            |  
| Julia                | docker run -it --rm julia bash             |  
| Scala                | docker run -it --rm hseeberger/scala-sbt bash |  
| Kotlin               | docker run -it --rm gradle bash            |  
| Swift                | docker run -it --rm swift bash             |  

### Conclusion

- Use these container images for troubleshooting issues while working with docker and kubernetes.