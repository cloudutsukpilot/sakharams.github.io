---
layout: post
title: Building Container Images
categories: [devops, orchestration, docker]
tags: [DevOps, Containers]
image: /assets/img/devops/containers/container-posts.webp
description: 
---

## Building Container Images

### Nginx Source Code: Compile and Build into a Container Image

- To start, we need to compile the Nginx source code and build it into a container image. Here are the steps:

1. Download the Nginx source code.
2. Create a Dockerfile to compile and build the Nginx source code.
3. Build the Docker image using the Dockerfile.

```Dockerfile
# Use an official image as a parent image
FROM ubuntu:20.04

# Set the working directory
WORKDIR /usr/src/nginx

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpcre3 \
    libpcre3-dev \
    zlib1g \
    zlib1g-dev \
    libssl-dev \
    wget

# Download Nginx source code
RUN wget http://nginx.org/download/nginx-1.21.6.tar.gz && \
    tar -zxvf nginx-1.21.6.tar.gz

# Compile Nginx
WORKDIR /usr/src/nginx/nginx-1.21.6
RUN ./configure && make && make install

# Expose port 80
EXPOSE 80

# Run Nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Optimize: Approaches for Optimization of our Container Image

- Optimizing your container image can lead to faster builds, smaller image sizes, and improved security. Here are some approaches:

1. `Use a smaller base image`: Start with a minimal base image like alpine.
2. `Reduce the number of layers`: Combine multiple commands into a single RUN statement.
3. `Clean up after installation`: Remove unnecessary files and packages after installation.
4. `Best Practices`: Using Labels, Reducing Layers, Non-Privileged Users
5. `Using Labels`: Add metadata to your image using labels.
6. `Reducing Layers`: Minimize the number of layers in your Dockerfile.
7. `Non-Privileged Users`: Run your application as a non-root user for better security.

```Dockerfile
# Use a smaller base image
FROM alpine:3.14

# Set the working directory
WORKDIR /usr/src/nginx

# Install dependencies and clean up
RUN apk add --no-cache \
    build-base \
    pcre-dev \
    zlib-dev \
    openssl-dev \
    wget && \
    wget http://nginx.org/download/nginx-1.21.6.tar.gz && \
    tar -zxvf nginx-1.21.6.tar.gz && \
    cd nginx-1.21.6 && \
    ./configure && make && make install && \
    apk del build-base wget && \
    rm -rf /var/cache/apk/* /usr/src/nginx/nginx-1.21.6.tar.gz

# Add labels
LABEL maintainer="your-email@example.com" \
      version="1.0"

# Create a non-root user
RUN addgroup -S nginx && adduser -S -G nginx nginx

# Expose port 80
EXPOSE 80

# Run Nginx as non-root user
USER nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Multi-Stage Builds: Separating Build Logic within a Container Image

- Multi-stage builds allow you to use multiple FROM statements in your Dockerfile, reducing the final image size by separating the build environment from the runtime environment.

```Dockerfile
# Stage 1: Build
FROM alpine:3.14 AS builder

WORKDIR /usr/src/nginx

RUN apk add --no-cache \
    build-base \
    pcre-dev \
    zlib-dev \
    openssl-dev \
    wget && \
    wget http://nginx.org/download/nginx-1.21.6.tar.gz && \
    tar -zxvf nginx-1.21.6.tar.gz && \
    cd nginx-1.21.6 && \
    ./configure && make

# Stage 2: Runtime
FROM alpine:3.14

WORKDIR /usr/src/nginx

COPY --from=builder /usr/src/nginx/nginx-1.21.6/objs/nginx /usr/local/bin/nginx

RUN addgroup -S nginx && adduser -S -G nginx nginx

EXPOSE 80

USER nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Cross Compilation: How to Build for AMD and ARM Simultaneously

- To build for multiple architectures, you can use Docker Buildx, which supports cross-compilation.

```sh
docker buildx create --use
docker buildx build --platform linux/amd64,linux/arm64 -t your-image:latest .
```

### Registries: Pushing our Container Image to a Remote Registry (Docker Hub)

- After building your image, you can push it to Docker Hub.

1. Login to Docker Hub:

    ```sh
    docker login
    ```

2. Tag your image:

    ```sh
    docker tag your-image:latest your-dockerhub-username/your-image:latest
    ```

3. Push your image:

    ```sh
    docker push your-dockerhub-username/your-image:latest
    ```

By following these steps, you can efficiently build, optimize, and deploy your container images