---
layout: post
title: Linux Mounting an Azure File Share - mount error 13 - Permission denied
categories: [issues-fixes]
tags: [Fixies, Operating Systems, Linux, Azure]
image: /assets/img/issues-fixes/issues-fixes-posts.jpg
description: Linux Mounting an Azure File Share - mount error 13 - Permission denied
---

### Issue:
Getting an error while mounting the Azure file share on a virtual machine using sudo mount command.

### Error:
mount error(13): Permission denied Refer to the mount.cifs(8) manual page (e.g. man mount.cifs)

### Cause
While mounting a second Azure file share on a linux host:
sudo mount -t cifs <azure-file-share-location> /share2 -o vers=3,username=<username>,password=<password>,dir_mode=0777,file_mode=0777,serverino,nosharesock,actimeo=30

### Solution
Steps taken to resolve the issue:
1. Tried adding the security mode with NT Lan Manager Security Support Provider (sec=ntlmssp) - Failed
sudo mount -t cifs <azure-file-share-location> /share2 -o vers=3,username=<username>,password=<password>,dir_mode=0777,file_mode=0777,serverino,nosharesock,actimeo=30,sec=ntlmssp 

2. The username and password for the storage account was inccorect. After updating the correct username and password, the Azure file share was mounted on the VM.