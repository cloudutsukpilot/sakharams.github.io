---
layout: post
title: DevOps Tools
categories: [ Productivity, DevOps Tools ]
image: /assets/img/productivity/productivity-tools.avif
description: List of tools to improve productivity for DevOps Engineers.
---

## Windows OS - Tools Setup

### 1. **Chocolatey**

- Chocolatey is a package manager for Windows that simplifies software installation and management.
- Think of it as the Windows equivalent of apt or brew.
- With a single command, you can install and update thousands of applications, making it an indispensable tool for developers and IT admins.
- Install Chocolatey using the below command using Powershell (Run as Admin):

```sh
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### 2. **kubectx**

- kubectx makes switching between clusters and namespaces effortless.
- It saves you from repeatedly typing long commands by providing quick context switching, improving productivity in Kubernetes-heavy environments.
  
| Windows | `choco install kubectx -y` |
| MacOS   | `brew install kubectx`     |

### 3. **gping**

- Visualize network latency like never before with gping.
- It’s a modern replacement for ping, offering a real-time graph of latency.
- This is a must-have for developers and network admins troubleshooting connectivity issues or monitoring uptime.

```sh
choco install gping -y
```

### 4. **LazyDocker**

- Managing Docker containers, images, and volumes from the command line can be tedious.
- lazydocker simplifies the process with an intuitive TUI (text-based user interface), providing a centralized dashboard for all your Docker management needs.

```sh
choco install lazydocker -y
```

### 5. **btop**

- btop is an advanced resource monitor for your system.
- It displays CPU, memory, and network stats in a sleek, modern interface.
- Whether you’re debugging performance issues or just keeping tabs on your machine, btop makes system monitoring a delight.

```sh
brew install btop
```

### 6. **dive**

- dive is a fantastic tool for analyzing Docker image layers.
- It helps you pinpoint unnecessary bloat, optimize images, and reduce build times.
- For developers building lightweight containers, dive is an absolute game-changer.

```sh
choco install dive -y
```
