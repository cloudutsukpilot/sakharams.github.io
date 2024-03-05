---
layout: post
title: Email Journaling
categories: [projects, email journaling]
tags: [projects, email journaling]
---


#### Prerequisities:
- Gitlab Variables
    a. Azure SPN Credentials
    b. DockerHub Auth Config
        - Variable: 
        Key : DOCKER_AUTH_CONFIG
        Value: { "auths": { "https://index.docker.io/v1/": { "auth": "$DOCKER_AUTH" } }}
    Note: The value of $DOCKER_AUTH is 'echo -n "my_username:my_password" | base64'

- DockerHub Image 

#### Steps:
1. 