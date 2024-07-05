---
layout: post
title: Docker Desktop - MacOS - Platform Mismatch
categories: [issues-fixes]
tags: [Fixies, Docker Desktop, MacOS]
---

#### Problem:
Received an error while running docker images on MacOS. 

#### Error:
The requested image's platform (linux/amd64) does not match the detected host platform (linux/arm64/v8)

#### Cause:
The requested image was likely built for the Linux/amd64 platform, but the host platform where the Docker image is being executed is Linux/arm64/v8.


#### Solution:

- To resolve this issue, you may need to obtain a version of the image that is compatible with the host platform, or update the host platform to match the platform for which the image was built. 
- I was able to resolve the issue by enabling containerd in docker desktop:
- Steps:
1. Open Docker Desktop
2. Go to 'Settings' -> General
3. Enable 'Use containerd for pulling and storing images'