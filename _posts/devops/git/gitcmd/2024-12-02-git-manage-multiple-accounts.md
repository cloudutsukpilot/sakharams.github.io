---
layout: post
title: Git - Manage Multiple Accounts
categories: [devops, git]
tags: [DevOps, Git]
---


## Introduction

- You can manage multiple GitHub/Gitlab accounts using the SSH configuration file and unique keys.

### Steps

1. Create multiple SSH keys for each of the git accounts:

    ```sh
    ssh-keygen -t rsa -b 4096 -C "apurvagiri90@gmail.com" -f ~/.ssh/apurvag/id_rsa
    ssh-keygen -t rsa -b 4096 -C "sakharamshinde@gmail.com" -f ~/.ssh/sakharams/id_rsa
    ```

2. Update/Create the ~/.ssh/config and add the below contents:

    - Sample GitRepo's:

    ```sh
    git@github.com:apurvangiri/apurvangiri.github.io.git
    git@github.com:cloudutsukpilot/developerportal.git
    ```

    ```sh
    # Configuration for apurvangiri/apurvangiri.github.io
    Host github-apurvangiri
        HostName github.com
        User git
        IdentityFile ~/.ssh/apurvag/id_rsa
        IdentitiesOnly yes

    # Configuration for cloudutsukpilot/developerportal
    Host github-cloudutsuk
        HostName github.com
        User git
        IdentityFile ~/.ssh/sakharams/id_rsa
        IdentitiesOnly yes
    ```

3. Set the remote for the Git Repo to the respective host names:

    ```sh
    git remote set-url origin git@github-apurvangiri:apurvangiri/apurvangiri.github.io.git
    git remote set-url origin git@github-cloudutsuk:cloudutsukpilot/developerportal.git
    ```

4. Executing the git pull/push commands will use the respective keys in order to authenticate the git servers.
