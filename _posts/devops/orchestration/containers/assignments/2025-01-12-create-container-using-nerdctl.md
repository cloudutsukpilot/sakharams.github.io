---
layout: post
title: 2. Create container using ContainerD & Nerdctl
categories: [devops, orchestration, containers]
tags: [Hands-On]
image: /assets/img/common/assignment.png
description: Lab assignment for creating a container using containerd and nerdctl.
---

### Prerequisites

- containerd
- nerdctl

### Assignment

- Lets start by creating a container for running a website in a container using containerd and nerdctl.

1. Create an index.html file for the website.

    ```sh
    mkdir mywebsite
    ```

2. Add content to the index.html file

    ```sh
    echo "<h1>Welcome to Containers!</h1>" > ./mywebsite/index.html   
    ```

3. Verify the content of the index.html file

    ```sh
    cat ./mywebsite/index.html
    ```

4. Create a Dockerfile to create an container

    ```sh
    touch  ./mywebsite/Dockerfile
    ```

5. Add the below steps in the Dockerfile

    ```sh
    cat <<EOF > ./mywebsite/Dockerfile
    # Use a lightweight web server base image
    FROM nginx:alpine

    # Copy the HTML file to the web server's root directory
    COPY index.html /usr/share/nginx/html/index.html

    # Expose the web server's port
    EXPOSE 80
    EOF
    ```

6. Build an image with nerdctl using the Dockerfile

    ```sh
    nerdctl build -t mywebsite-nerd:latest ./mywebsite
    ```

7. Verify if the images has been created

    ```sh
    nerdctl images
    ```

8. Run the Container using the image created in the previous step

    ```sh
    nerdctl run -d -p 8081:80 --name container-demo mywebsite-nerd:latest
    ```

9. Verify if the container is up and running

    ```sh
    nerdctl ps
    ```

10. Browse the Website using the port 8080

    ```sh
    /mnt/c/Program\ Files/Google/Chrome/Application/chrome.exe http://localhost:8080/
    ```
