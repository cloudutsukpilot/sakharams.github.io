---
layout: post
title: GitHub Clone
categories: [devops, git, github]
tags: [devops, git, github, ssh]
---

### Switch Repository from HTTPS to SSH

1. Copoy the public from your laptop using the below command:

    ```bash
    cat ~/.ssh/id_rsa.pub
    ```

2. If there is not key present, create a new ssh key using the below commands and provide the inputs requesting during creation (file path and passphrase):

    > Be careful of overriding any existing keys saved to the default location ~/.ssh/.
    {: .prompt-warning }

    ```bash
    $ ssh-keygen -t rsa -b 4096 -C "your-email@yourdomain.com"
    Generating public/private rsa key pair.
    Enter file in which to save the key (/c/Users/your.user/.ssh/id_rsa):
    Enter passphrase (empty for no passphrase):
    Enter same passphrase again:
    ```



3. Once the key is generated, copy the content of the public key using the command provided in step 1. 

4. Upload the key to your github profile:

    a. Navigate to Github.com -> Login -> Click on your Profile Picture (top right) -> Settings
    b. Click on SSH and GPG Keys -> New SSK Key
    c. Provide a friendly name and paste the copied content of the public key.
    d. Click on Add SSH key

5. Clone the github repository using the SSH URL:

    ```bash
    git clone git@github.com:<profilename>/<reponame>.github.io.git
    ```


<br />
### Switch from HTTPS to SSH Authentication

1. Confirm if the current authentication to your github repository is using HTTPS:
    ```bash
    $ git remote -v
    origin  https://github.com/<profilename>/<reponame>.github.git (fetch)
    origin  https://github.com/<profilename>/<reponame>.github.git (push)
    ```

2. Remove the existing remote origin whcih contains the https configuration:
    ```bash
    git remote rm origin
    ```

3. Add the new remote origin wiht the new ssh configuration:
    ```bash
    git remote add origin git@github.com:<prfilename>/<reponame>.github.git
    ```

4. Confirm if the git has changed to new ssh conighration:
    ```bash
    $ git remove -v
    origin  git@github.com:<profilename>/<reponame>.github.io.git (fetch)
    origin  git@github.com:<profilename>/<reponame>.github.io.git (push)
    ```