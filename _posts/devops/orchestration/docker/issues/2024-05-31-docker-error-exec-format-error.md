---
layout: post
title: Docker Error - exec format error
categories: [devops, orchestration, docker]
tags: [DevOps, Orchestration, Docker]
---


Task: 
Installing Istio using the below commands on a MaCOS:
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.9.0 TARGET_ARCH=x86_64 sh -
cd istio-1.9.0
export PATH=$PWD/bin:$PATH
istioctl install --set profile=demo -y
- The istiod pods is in crashloopback state with the error "exec format error"


Error:
exec format error

Reason:
The "exec format error" usually occurs when the shell cannot execute a script due to an issue with its format.

Solution:
The istio version that was being deployed on the Kubernetes cluster did not support the api version.