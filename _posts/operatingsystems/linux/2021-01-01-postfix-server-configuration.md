---
layout: post
title: Postfix Server Configuration
categories: [operating systems, linux]
tags: [Operating Systems, Linux]
---



To check the debian configuration for postfix:
```bash
debconf-show postfix | grep postfix
```

Postfix Configuration File Location
```bash
/etc/postfix/main.cf
```

To check the logs:
/var/log/mail.log

To check the postfix service status
sudo postfix status