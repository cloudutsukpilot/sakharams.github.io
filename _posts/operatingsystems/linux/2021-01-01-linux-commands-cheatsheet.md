---
layout: post
title: Linux Command CMDsheet
categories: [operating systems, linux]
tags: [Operating Systems, Linux, CMDsheet]
---


#### Hardware Information

| `lscpu` | Processor | 
| `free` | Memory | 
| `df / du` | Storage | 


#### Processes:

| `ps -A` or `ps -e` | List all processes running on the system |
| `ps ef` | Detailed overview in  full format | 
| `ps a` | Displays the running processes from all users | 
| `ps u` | Displays the running processes along with user or owner  | 
| `ps x` | Displays the processes those have not been executed from or attached to a terminal | 


#### Operating System

| `uname -a` | Display all system information, including machine name, kernel name, version, and other details |
| `lsb_release -a` | Display all LSB (Linux Standard Base) information, including the distribution name, version, codename, and ID |
| `cat /etc/os-release` | Display information about the operating system release |
| `hostnamectl` | Display system hostname settings, including the hostname, machine ID, boot ID, virtualization, kernel, architecture, and more |


#### Memory Utilization

| `cat /proc/meminfo` | Displays system's memory usage | 
| `free -m` | Displays total amount of free and used physical and swap memory, buffers and caches used by kernel in MB | 
| `free -g` | Same as above in GB | 
| `top` | Displays dynamic real-time information about running tasks | 
| `vmstat` | Report virtual memory statistics, including memory, swap, I/O, system activity, and CPU activity |


#### Disks

| `lsblk` | To list the block devices | 
| `iostat` | Report Central Processing Unit (CPU) statistics and input/output statistics for devices and partitions |
| `hdparm -I /dev/sda` | Display information about disk hardware information |
| `smartctl -a /dev/sda` | Display disk health |
| `ncdu` | Disk usage analyzer with an ncurses interface |
| `fdisk -l` | To list the different partitions |
| `du -h --max-depth=1 \| sort -hr`  | To get the size of each folder in the current directory | 
| `du -ah --max-depth=1` | To include hidden files in the size calculation | 

#### Disk Space Utilization

| `df -h` | Display disk usage in human-readable format |
| `du -sh <dir>` | Estimate file and directory space usage |
| `du -s * | sort -n` | Display the size of each file and directory sorted by size |

#### Directories

| `mkdir <dir>` | To create a directory | 
| `rmdir <dir>` | Remove an empty directory named `<dir>` |
| `rm -r <dir>` | Remove a directory named `<dir>` and its contents |
| `pwd` | Print the current working directory |
| `cd <dir>` | Change the current directory to dir |
| `ls` | List the contents of the current directory |
| `ls -l` | List the contents of the current directory in long format |
| `ls -a` | List all files, including hidden files |
| `ls -a --recursive` | List all files, including hidden files by looping through all the sub folders |
| `cp -r <dir1> <dir2>` | Copy directory `<dir1>` and its contents to `<dir2>` |
| `mv <dir1> <dir2>` | Move or rename directory `<dir1>` to `<dir2>` | 

#### User Management

| `whoami` | Display the username of the current user |
| `id <username>` | Display the user and group IDs of the specified user |
| `useradd <username>` | Create a new user |
| `userdel <username>` | Delete a user |
| `passwd <username>` | Change a user's password |
| `su - <username>` | Switch to another user account |
| `usermod -aG <groupname> <username>` | Add a user to a group |
| `groups <username>` | Display the groups a user is a part of |
| `cat /etc/passwd` | List all users on the system |
| `cat /etc/group` | List all groups on the system |

#### Firewall

| `sudo ufw enable` | Enable the firewall |
| `sudo ufw disable` | Disable the firewall |
| `sudo ufw status` | Check the status of the firewall |
| `sudo ufw allow <port/service>` | Allow traffic on specific port or service |
| `sudo ufw deny <port/service>` | Deny traffic on specific port or service |
| `sudo ufw delete allow <port/service>` | Delete an allow rule |
| `sudo ufw delete deny <port/service>` | Delete a deny rule |


#### Network 

| `nc -l <port>` | Listen for incoming connections on a specified port |
| `nc <hostname> <port>` | Connect to a specified hostname on a specified port |
| `nc -u <hostname> <port>` | Use UDP instead of the default TCP |
| `nc -v <hostname> <port>` | Operate in verbose mode, useful for debugging |
| `nc -z <hostname> <port>` | Scan for listening daemons, without sending any data |
| `nc -w <seconds> <hostname> <port>` | Timeout for connections after the specified number of seconds |

#### DNS

| `dig <domain>` | Query DNS name servers for your DNS lookup |
| `dig <domain> +short` | Get just the IP address for a domain |
| `dig -x <ip>` | Perform a reverse DNS lookup |
| `nslookup <domain>` | Query internet name servers interactively |
| `host <domain>` | Perform a simple DNS lookup |
| `whois <domain>` | Get whois information for a domain |


#### Logging

| `dmesg` | Display messages from the kernel ring buffer |
| `cat /var/log/syslog` | Display system logs |
| `tail -f /var/log/syslog` | Follow the system logs in real time |
| `journalctl` | Query the systemd journal |
| `journalctl -f` | Follow the systemd journal in real time |
| `journalctl -u <service>` | Show logs for a specific service |
| `less /var/log/syslog` | View system logs with paging |
| `grep 'error' /var/log/syslog` | Search for 'error' in system logs |

#### Common Commands

| `echo -n 'string-to-convert' \| openssl base64` | Encode a string to base64 |
| `echo -n 'string-to-decode' \| openssl base64 -d` | Decode a base64 string |
| `echo -n 'string-to-convert' \| md5sum` | Generate an MD5 hash of a string |
| `echo -n 'string-to-convert' \| sha256sum` | Generate a SHA-256 hash of a string |

#### OpenSSL

| `openssl version` | Display OpenSSL version |
| `openssl genrsa -out private.key 2048` | Generate a new private key |
| `openssl req -new -key private.key -out request.csr` | Generate a Certificate Signing Request |
| `openssl x509 -req -days 365 -in request.csr -signkey private.key -out certificate.crt` | Generate a self-signed certificate |
| `openssl rsa -in private.key -pubout -out public.key` | Extract the public key from a private key |
| `openssl s_client -connect <hostname>:<port>` | Connect to a server to obtain the SSL/TLS details |
| `openssl enc -aes-256-cbc -salt -in file.txt -out file.txt.enc` | Encrypt a file |
| `openssl enc -aes-256-cbc -d -in file.txt.enc -out file.txt` | Decrypt a file |
