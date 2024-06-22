---
layout: post
title: Ubuntu - Handy Commands
categories: [operating systems, ubuntu]
tags: [Operating Systems, Ubuntu]
---


## Handy Commands

### Network
- To get the private ip's for all the network devices
```
alias get-private-ips='ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '\''{print $2}'\'''
```