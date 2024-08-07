---
layout: post
title: Voting App on Azure Kubernetes Service
categories: [projects, voting-app]
tags: [Projects]
---


## Introduction

### Azure Kubernetes Service(AKS)

1. Network Design:

| Network               | CIDR         | IP Address Count |
|-----------------------|--------------|------------------|
| VNET CIDR             | 10.0.0.0/19  | 8192             |
| Subnet CIDR           |              |                  |
| Application Node Pool | 10.0.0.0/21  | 2048             |
| Monitoring Node Pool  | 10.0.8.0/22  | 1024             |
| System Node Pool      | 10.0.12.0/22 | 1024             |
| Database Node Pool    | 10.0.16.0/22 | 1024             | 