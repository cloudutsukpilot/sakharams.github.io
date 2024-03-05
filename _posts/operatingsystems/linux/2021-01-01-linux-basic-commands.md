---
layout: post
title: Linux Basic Commands
categories: [operating systems, linux]
tags: [operating systems, linux]
---


#### To get the list of processes running on the linux host:

| ps -A/-e |  all running processes in the system | 
| ps ef | detailed overview in  full format | 
| ps eF | detailed overview in  extra full format |
| ps a | This option prints the running processes from all users. | 
| ps u | This option shows user or owner column in output. | 
| ps x | This option prints the processes those have not been executed from the terminal. | 



#### To check the operating system
```bash
cat /etc/os-release
lsb_release -a
hostnamectl
```


#### To check the memory utilization

cat /proc/meminfo
free -m
free -g
top
htop

#### To check the disk space utilization
df -h
du -a /var | sort -n -r | head -n 10


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