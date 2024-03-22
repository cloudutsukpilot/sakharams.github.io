---
layout: post
title: Linux Command Cheatsheet
categories: [operating systems, linux]
tags: [operating systems, linux, cheatsheet]
---


#### Hardware Information

| lscpu | Processor | 
| free | Memory | 
| df / du | Storage | 

#### Processes:

| ps -A/-e |  all running processes in the system | 
| ps ef | detailed overview in  full format | 
| ps eF | detailed overview in  extra full format |
| ps a | This option prints the running processes from all users. | 
| ps u | This option shows user or owner column in output. | 
| ps x | This option prints the processes those have not been executed from the terminal. | 


#### Operating System
```bash
cat /etc/os-release
lsb_release -a
hostnamectl
```


#### Memory Utilization

| cat /proc/meminfo | Displays system's memory usage | 
| free -m | Displays total amount of free and used physical and swap memory, buffers and caches used by kernel in MB | 
| free -g | Same as above in GB | 
| top | Displays dynamic real-time information about running tasks | 


#### Disks

| fdisk -l | To list the different partitions |
| lsblk | To list the block devices | 

#### Disk Space Utilization

| df -h | Disk Usage in Human Readble Format | 
| du -sh * | Disk Usage at the folder level |
| du -s * | sort -n | To get the largest folders and files | 

#### Directories
| mkdir | To create a directory | 
| rm <dir-name> -r | To remove a directory | 

#### User Management

| cat /etc/passwd | To list all the users on the host | 

#### Firewall

| sudo ufw allow <portno> | To allow ports via firewall | 
| sudo ufw status | To check the status of the firewall | 

To check if a port is open
nc -v cloudutsuk.com 443

#### DNS

| dig domain.com | To retrieve information about DNS Nameservers | 


#### Logging

| dmesg | Prints the messages provided by device drivers. | 
| cat /var/log/syslog | To get the system logs | 


#### Common Commands

| echo -n '<string>' | openssl base64 | To encode a string to base64 |