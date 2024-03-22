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


#### To check the disk space utilization

| df -h | Disk Usage in Human Readble Format | 
| du -sh * | Disk Usage at the folder level |
| du -s * | sort -n | To get the largest folders and files | 


#### User Management
To list all the users on the host
cat /etc/passwd



### Directories
To list the disk space usage:
df

To list the different partitions 
fdisk -l

To list the block devices
lsblk



#### To add a directory

#### To remove a directory




#### Firewall
To allow ports via firewall

sudo ufw allow <portno>
sudo ufw status

To check if a port is open
nc -v cloudutsuk.com 443

#### DNS
To retrieve information about DNS Nameservers

dig cloudutsuk.com


#### Logging
| dmesg | Prints the messages provided by device drivers. | 
| cat /var/log/syslog | To get the system logs | 



#### To encode a string to base64
echo -n '<string>' | openssl base64