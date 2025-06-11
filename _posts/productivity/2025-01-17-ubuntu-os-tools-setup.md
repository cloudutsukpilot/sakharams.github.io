---
layout: post
title: Ubuntu OS - Tools Setup
categories: [ Productivity, Ubuntu Tools ]
tags: [Productivity, Ubuntu Tools ]
image: /assets/img/productivity/productivity-tools.avif
description: List of tools to install while setting up a new host/laptop.
---


1. **Update and Upgrade System**

    ```sh
    sudo apt update && sudo apt upgrade -y
    ```

2. **Install VSCode**

    ```sh
    sudo snap install --classic code
    ```

    - Sign in to GitHub to sync all extensions, preferences, and other settings.

3. **Install DevOps Tools**

    - `Refer`: [Install Terraform](https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli)

    ```sh
    sudo apt-get install -y terraform
    ```

    ```sh
    sudo snap install kubectl --classic
    sudo apt-get install -y postman
    curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
    sudo apt-get install -y kubectx
    ```

    ```sh
    curl -LO https://github.com/ahmetb/kubectx/releases/latest/download/kubens
    chmod +x kubens
    sudo mv kubens /usr/local/bin/
    ```

    ```sh
    DIVE_VERSION=$(curl -sL "https://api.github.com/repos/wagoodman/dive/releases/latest" | grep '"tag_name":' | sed -E 's/.*"v([^"]+)".*/\1/')
    curl -fOL "https://github.com/wagoodman/dive/releases/download/v${DIVE_VERSION}/dive_${DIVE_VERSION}_linux_amd64.deb"
    sudo apt install ./dive_${DIVE_VERSION}_linux_amd64.deb
    ```

    - For `terragrunt`:

      ```sh
      curl -L https://github.com/gruntwork-io/terragrunt/releases/latest/download/terragrunt_linux_amd64 -o terragrunt
      chmod +x terragrunt
      sudo mv terragrunt /usr/local/bin/
      ```

    - For `azure-kubelogin`:

      ```sh
      VERSION=$(curl --silent "https://api.github.com/repos/int128/kubelogin/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
      curl -LO "https://github.com/int128/kubelogin/releases/download/$VERSION/kubelogin_linux_amd64.zip"
      sudo apt install unzip
      unzip kubelogin_linux_amd64.zip
      chmod +x kubelogin
      sudo mv kubelogin /usr/local/bin/
      export PATH=$PATH:"/usr/local/bin"
      ```

      ```sh
      KUBIE_VERSION=$(curl -s https://api.github.com/repos/sbstp/kubie/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
      curl -LO https://github.com/sbstp/kubie/releases/download/${KUBIE_VERSION}/kubie-linux-amd64
      chmod +x kubie-linux-amd64
      sudo mv kubie-linux-amd64 /usr/local/bin/kubie
      ```

4. **Install Azure Tools**

    ```sh
    curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
    sudo apt-get install -y azure-functions-core-tools-4
    ```

5. **Install Git**

    ```sh
    sudo apt-get install -y git
    ```

6. **Install GitHub CLI**

    ```sh
    type -p curl >/dev/null || sudo apt install curl -y
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
    sudo chmod go
