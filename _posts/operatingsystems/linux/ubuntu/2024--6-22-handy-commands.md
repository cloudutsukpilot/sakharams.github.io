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


### Nginx
- To manage Nginx server
```
alias nginx-logs='sudo tail -f /var/log/nginx/access.log'
alias nginx-reload='sudo nginx -s reload'
alias nginx-edit-default='sudo vi /etc/nginx/sites-enabled/default'
```