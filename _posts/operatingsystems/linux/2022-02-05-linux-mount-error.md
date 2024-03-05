---
layout: post
title: Linux Mounting an Azure File Share - mount error 13 - Permission denied - 
categories: [operating systems, linux]
tags: [operating systems, linux, azure]
---


Error:
mount error(13): Permission denied Refer to the mount.cifs(8) manual page (e.g. man mount.cifs)

Why:
While mounting a second Azure file share on a linux host:
sudo mount -t cifs <azure-file-share-location> /share2 -o vers=3,username=<username>,password=<password>,dir_mode=0777,file_mode=0777,serverino,nosharesock,actimeo=30

Steps taken to resolve the issue:
1. Tried adding the security mode with NT Lan Manager Security Support Provider (sec=ntlmssp) - Failed
sudo mount -t cifs <azure-file-share-location> /share2 -o vers=3,username=<username>,password=<password>,dir_mode=0777,file_mode=0777,serverino,nosharesock,actimeo=30,sec=ntlmssp 

2. 