---
layout: post
title: Windows OS - Tools Setup
categories: [ Productivity, Windows Tools ]
tags: [Productivity, Windows Tools ]
image: /assets/img/productivity/productivity-tools.avif
description: List of tools to install while setting up a new host/laptop.
---

## Windows OS - Tools Setup

1. **Install Chocolatey(Run as Admin)**

    ```sh
    Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    ```

2. **Install VSCode**

    ```sh
    choco install vscode -y
    ```

    - Sign-In into the GitHub to sync all the extensions, preferences and other settings.

3. **Install DevOps Tools**

    ```sh
    choco install kubernetes-cli -y
    ```

    ```sh
    choco install terragrunt -y
    ```

    ```sh
    choco install terraform -y
    ```

    ```sh
    choco install postman -y
    ```

    ```sh
    choco install azure-kubelogin -y
    ```

4. **Install Azure Tools**

    ```sh
    choco install azure-cli -y
    ```

    ```sh
    choco install azure-functions-core-tools -y
    ```

5. **Install Git**

    ```sh
    choco install git.install -y
    ```

6. **Install GitHub CLI**

    ```sh
    choco install gh -y
    ```

7. **Diagram Tools**

    ```sh
    choco install graphviz -y
    ```

8. **Productivity Tools**

    ```sh
    choco install meld -y
    ```

    ```sh
    choco install oh-my-posh -y
    Install-Module oh-my-posh -Scope CurrentUser
    ```

    ```sh
    choco install powertoys -y
    ```

    ```sh
    choco install go-task -y
    ```

    ```sh
    choco install grep -y
    ```

    ```sh
    choco install base64 -y
    ```

9. **OpenSSL**

    ```sh
    choco install openssl -y
    ```

10. **Programming**

    ```sh
    choco install python --version=3.12.6 -y
    ```

11. Install distro in WSL

    ```sh
    wsl.exe --install Ubuntu
    ```

12. **Jekyll Installation**

    ```sh
     # Download Jekyll and follow the instructions provided in below article
     # https://jekyllrb.com/docs/installation/windows/
     # Navigate to the website folder
     gem install jekyll bundler
     # To install the requirements for the Jekyll theme
     bundle install
    ```
