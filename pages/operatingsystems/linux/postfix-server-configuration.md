---
layout: page
title: Postfix Server Configuration
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