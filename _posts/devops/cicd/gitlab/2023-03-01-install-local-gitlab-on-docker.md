---
layout: post
title: Install Local GitLab Server on Docker
categories: [devops, cicd, gitlab]
tags: [DevOps, CICD, Gitlab, Docker]
---

### Prerequisities

| ------------ | -------------- | 
| Operating System | MacOS | 
| OS Architecture | Arm64 | 
| Tools | Docker Desktop | 


### Step-by-Step Instruction to install Gitlab on Docker

1. Create a directory for the project:
    ```
    mkdir gitlab-on-docker
    cd gitlab-on-docker
    ```

2. Check the Docker Desktop configuration to get the allowed virtual file shares:
    - Navigate to Docker Desktop App -> Settings -> Resources -> File Sharing -> Virtual File Shares

    Note: Add a custom path which will be used to store the Gitlab configuration and data (pipelines,env's, variables, etc.)

3. Create an .env file in the same directory and the below path to define the Gitlab home directory (should be one of the allowed file share in docker desktop):
    ```
    export $GITLAB_HOME=/Users/<user-name>/gitlab-local
    ```

4. Create a docker-compose.yml and add the below content:

    ```
    version: '3.6'
    services:
    gitlab:
        image: gitlab/gitlab-ee:latest
        container_name: gitlab
        restart: always
        hostname: 'localhost'
        environment:
        GITLAB_OMNIBUS_CONFIG: |
            # Add any other gitlab.rb configuration here, each on its own line
            external_url 'http://localhost'
        ports:
        - '80:80'
        - '443:443'
        - '22:22'
        volumes:
        - '/$GITLAB_HOME/config:/etc/gitlab'
        - '/$GITLAB_HOME/logs:/var/log/gitlab'
        - '/$GITLAB_HOME/data:/var/opt/gitlab'
        shm_size: '256m'
    ```

5. Get the password
sudo cat $GITLAB_HOME/config/initial_root_password

6. Open the browser and navigate to https://localhost and you should land on the Gitlab Login page.
