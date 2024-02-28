---
layout: page
title: Push a Docker Image to DockerHub
---

Prerequisites:
- Docker Installed

#### Step 1: Create the DockerFile
```docker
# Use an existing base image with Python installed
FROM python:3.9

# Install Ansible
RUN \
    apt-get update &&\
    apt-get install -y --no-install-recommends ansible
    
# Install Terraform
RUN \
    echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
    https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
    tee /etc/apt/sources.list.d/hashicorp.list

# Remove Temp Files
RUN \
    rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Set the entry point, if needed
# ENTRYPOINT ["python", "app.py"]

# Set default command to start Python shell, if needed
CMD ["python"]
```

#### Step 2: Build the Image
```bash
docker build -t py-tf-ansible:latest . 
```

#### Step 3: Verify that the image was created
```
docker image ls
```

#### Step 3: Login into Docker Hub
a. Create a PAT token by logging into the DockerHub Portal. 
 - Profile Menu -> Account Settings -> Security -> New Access Token
b. Authenticate with the access token
```bash
docker login --username <user_name>
```

#### Step 4: Push the image to a private repository
```bash
docker tag py-tf-ansible:latest:latest <user_name>/<repository_name>:latest

docker push <user_name>/<repository_name>:latest
```