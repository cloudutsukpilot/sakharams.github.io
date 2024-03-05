---
layout: post
title: Secure Shell Connection
---

Command to connect to a target host with a specfic ssh key
```bash
ssh username@targethost -i <path-to-private-key>
```

Update the below file to specify the parameters to be used for each target
~/.ssh/config

To delete the save keys of remote hosts, remove them from:
~/.ssh/known_hosts