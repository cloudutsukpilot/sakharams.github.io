---
layout: post
title: Windows - CMD CMDsheet
categories: [operating systems, windows]
tags: [Operating Systems, Windows, CMDsheet]
---



### Process
| `Get-Process` | To list the process | 
| `wmic process list brief` | To list the running process | 
| `wmic process list full` | To list the running processes with more details | 
| `tasklist` | To list the running processes | 
| `wmic process where "name='ProcessName.exe'" call terminate` | To terminate the process | 


### Filtering
| `tasklist | findstr notepad` | To filter the running process | 