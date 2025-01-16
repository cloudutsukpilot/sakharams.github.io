---
layout: post
title: Docker - Building Container Images
categories: [devops, orchestration, docker]
tags: [Assignments]
image: /assets/img/common/assignment.png
description: Lab assignment for creating a container using containerd and docker.
---

### Prerequisites

- Docker

### Assignment

- Lets build a container using the github repository created for running a Matrix screensaver.
- Languages: C

1. Pull a base docker image 'alpine' - Ultrasmall and minimal image based on alpine linux (size: ~8MB)

    ```sh
    docker pull alpine
    ```

2. Verify if the images exists on your host

    ```sh
    docker images
    ```

3. Create a Dockerfile using the apline images

    ```sh
    cat <<EOF> ./Dockerfile
    FROM alpine

    LABEL org.opencontainers.image.authors="Sakharam Shinde"
    EOF
    ```

4. Build a docker image using the Dockerfile (Same as base image with just additional label)

    ```sh
    docker build -t sakharamshinde/cmatrix .
    ```

5. Verify if the new images is created with the defined tag.

    ```sh
    docker images
    ```

6. Create a container using the new image and ssh into the container

    ```sh
    docker run --rm -it sakharamshinde/cmatrix sh
    ```

7. Once we are into the shell of the container, execute below steps to get the cmatrix running inside the container.

    - Verify the Hostname

    ```sh
    hostname
    ```

    - Clone the Repository, `this will fail`

    ```sh
    # 
    git clone https://github.com/abishekvashok/cmatrix.git
    ```

8. Since git is not installed in the base image, we will install the git tool.

    ```sh
    apk update
    ```

    ```sh
    apk add git
    ```

    - Clone the repo

    ```sh
    git clone https://github.com/abishekvashok/cmatrix.git
    ```

    - Switch to the repo dir and check the contents

    ```sh
    cd cmatrix
    ```

    ```sh
    ls -l 
    ```

9. Similarly, install the required packages required to build the cmatrix screensave

    - Prepare compilation, will fail, missing autoconf

    ```sh
    autoreconf -i
    ```

    - Install autoconf

    ```sh
    apk add autoconf
    ```

    - Prepare compilation, will fail, missing automake

    ```sh
    autoreconf -i
    ```

    - Install automake

    ```sh
    apk add automake
    ```

    - Prepare compilation, will succeed, confirm with echo $?

    ```sh
    autoreconf -i
    ```

    - Verify it the install was successful

    ```sh
    echo $?
    ```

    - Prepare configure, will fail, missing compiler

    ```sh
    ./configure LDFLAGS="-static"
    ```

    - Install compiler

    ```sh
    apk add alpine-sdk
    ```

    - Prepare configure, will fail, missing dependencies

    ```sh
    ./configure LDFLAGS="-static"
    ```

    - Install dependencies and create missing directories

    ```sh
    apk add ncurses-dev ncurses-static
    ```

    ```sh
    mkdir -p /usr/lib/kbd/consolefonts /usr/share/consolefonts
    ```

    - Prepare configure, will succeed

    ```sh
    ./configure LDFLAGS="-static"
    ```

    - Compile and view result

    ```sh
    make
    ```

    - Check the created binary

    ```sh
    ls -l ./cmatrix
    ```

    - Run cmatrix

    ```sh
    ./cmatrix
    ```

10. Build a docker image for the cmatrix app using all the command used above.

    ```sh
    cat <<EOF> ./Dockerfile
    FROM alpine

    LABEL org.opencontainers.image.authors="Sakharam Shinde"

    RUN apk update

    RUN apk add git 

    RUN git clone https://github.com/abishekvashok/cmatrix.git .

    RUN cd cmatrix

    RUN apk add autoconf

    RUN apk add automake

    RUN autoreconf -i

    RUN apk add alpine-sdk

    RUN apk add ncurses-dev ncurses-static

    RUN mkdir -p /usr/lib/kbd/consolefonts /usr/share/consolefonts

    RUN ./configure LDFLAGS="-static"

    RUN make

    CMD ["./cmatrix"]

    EOF
    ```

    - Build a new image with the updated Dockerfile

    ```sh
    docker build -t sakharamshinde/cmatrix .
    ```

    - Run the new image, this will fail

    ```sh
    docker run --rm -it sakharamshinde/cmatrix
    ```

    - Specify the working directory for the Dockerfile

    ```sh
    cat <<EOF> ./Dockerfile
    FROM alpine

    LABEL org.opencontainers.image.authors="Sakharam Shinde"

    WORKDIR /cmatrix

    RUN apk update

    RUN apk add git 

    RUN git clone https://github.com/abishekvashok/cmatrix.git .

    RUN apk add autoconf

    RUN apk add automake

    RUN autoreconf -i

    RUN apk add alpine-sdk

    RUN apk add ncurses-dev ncurses-static

    RUN mkdir -p /usr/lib/kbd/consolefonts /usr/share/consolefonts

    RUN ./configure LDFLAGS="-static"

    RUN make

    CMD ["./cmatrix"]

    EOF
    ```

    - Build a new image with the updated Dockerfile

    ```sh
    docker build -t sakharamshinde/cmatrix .
    ```

    - Run the new image, this will succeed

    ```sh
    docker run --rm -it sakharamshinde/cmatrix
    ```

11. Check the size of the new image and inspect the layers

    ```sh
    docker images
    ```

    ```sh
    docker history sakharamshinde/cmatrix
    ```

12. To reduce the number of layers, we will combine common commands into one

    ```sh
    cat <<EOF> ./Dockerfile
    FROM alpine

    LABEL org.opencontainers.image.authors="Sakharam Shinde"

    WORKDIR /cmatrix

    RUN apk update --no-cache && \
        apk add git autoconf automake alpine-sdk ncurses-dev ncurses-static
        
    RUN git clone https://github.com/abishekvashok/cmatrix.git .
    
    RUN autoreconf -i
    
    RUN mkdir -p /usr/lib/kbd/consolefonts /usr/share/consolefonts
    
    RUN ./configure LDFLAGS="-static"

    RUN make
    
    CMD ["./cmatrix"]
    
    EOF
    ```

    - Build the image

    ```sh
    docker build -t sakharamshinde/cmatrix .
    ```

    - Run the new image

    ```sh
    docker run --rm -it sakharamshinde/cmatrix
    ```

13. Check the size of the image and inspect the layers

    ```sh
    docker images
    ```

    ```sh
    docker history sakharamshinde/cmatrix
    ```

14. To reduce the size further, we can combine all the RUN commands

    ```sh
    cat <<EOF> ./Dockerfile
    FROM alpine

    LABEL org.opencontainers.image.authors="Sakharam Shinde"

    WORKDIR /cmatrix

    RUN apk update --no-cache && \
    apk add git autoconf automake alpine-sdk ncurses-dev ncurses-static && \
    git clone https://github.com/abishekvashok/cmatrix.git . && \
    autoreconf -i && \
    mkdir -p /usr/lib/kbd/consolefonts /usr/share/consolefonts && \
    ./configure LDFLAGS="-static" && \
    make
    
    CMD ["./cmatrix"]
    
    EOF
    ```

    - Build the image

    ```sh
    docker build -t sakharamshinde/cmatrix .
    ```

    - Run the new image

    ```sh
    docker run --rm -it sakharamshinde/cmatrix
    ```

15. Check the size of the image and inspect the layers

    ```sh
    docker images
    ```

    ```sh
    docker history sakharamshinde/cmatrix
    ```

16. Build the image using multi-stage docker build

    ```sh
    cat <<EOF> ./Dockerfile
    # Build Container Image
    FROM alpine AS cmatrixbuilder 

    WORKDIR /cmatrix

    RUN apk update --no-cache && \
        apk add git autoconf automake alpine-sdk ncurses-dev ncurses-static && \
        git clone https://github.com/abishekvashok/cmatrix.git . && \
        autoreconf -i && \
        mkdir -p /usr/lib/kbd/consolefonts /usr/share/consolefonts && \
        ./configure LDFLAGS="-static" && \
        make

    # cmatrix Container Image
    FROM alpine

    LABEL org.opencontainers.image.authors="Sakharam Shinde" \

    RUN apk update --no-cache && \
        apk add ncurses-terminfo-base

    COPY --from=cmatrixbuilder /cmatrix/cmatrix /cmatrix

    CMD ["./cmatrix"]

    EOF
    ```

    - Build the image

    ```sh
    docker build -t sakharamshinde/cmatrixms .
    ```

    - Run the new image

    ```sh
    docker run --rm -it sakharamshinde/cmatrixms
    ```

17. Check the user running the container

    ```sh
    docker run --rm -it sakharamshinde/cmatrixms whoami
    ```

18. Run the container as a user instead of root

    ```sh
    cat <<EOF> ./Dockerfile
    # Build Container Image
    FROM alpine AS cmatrixbuilder 

    WORKDIR /cmatrix

    RUN apk update --no-cache && \
        apk add git autoconf automake alpine-sdk ncurses-dev ncurses-static && \
        git clone https://github.com/abishekvashok/cmatrix.git . && \
        autoreconf -i && \
        mkdir -p /usr/lib/kbd/consolefonts /usr/share/consolefonts && \
        ./configure LDFLAGS="-static" && \
        make
    
    # cmatrix Container Image
    FROM alpine
    
    LABEL org.opencontainers.image.authors="Sakharam Shinde" \

    RUN apk update --no-cache && \
        apk add ncurses-terminfo-base && \
        adduser -g "Sakharam" -s /usr/sbin/nologin -D -H sakharam

    COPY --from=cmatrixbuilder /cmatrix/cmatrix /cmatrix

    USER sakharam
    CMD ["./cmatrix"]
    EOF
    ```

    - Build the image

    ```sh
    docker build -t sakharamshinde/cmatrixms .
    ```

    - Run the new image

    ```sh
    docker run --rm -it sakharamshinde/cmatrixms
    ```

19. Run the container with entrpoint and commands

    ```sh
    cat <<EOF> ./Dockerfile
    # Build Container Image
    FROM alpine AS cmatrixbuilder 

    WORKDIR /cmatrix

    RUN apk update --no-cache && \
        apk add git autoconf automake alpine-sdk ncurses-dev ncurses-static && \
        git clone https://github.com/abishekvashok/cmatrix.git . && \
        autoreconf -i && \
        mkdir -p /usr/lib/kbd/consolefonts /usr/share/consolefonts && \
        ./configure LDFLAGS="-static" && \
        make
    
    # cmatrix Container Image
    FROM alpine
    
    LABEL org.opencontainers.image.authors="Sakharam Shinde" \

    RUN apk update --no-cache && \
        apk add ncurses-terminfo-base && \
        adduser -g "Sakharam" -s /usr/sbin/nologin -D -H sakharam

    COPY --from=cmatrixbuilder /cmatrix/cmatrix /cmatrix

    USER sakharam
    ENTRYPOINT ["./cmatrix"]
    CMD ["-b"]

    EOF
    ```

   - Build the image

    ```sh
    docker build -t sakharamshinde/cmatrixms .
    ```

    - Run the new image

    ```sh
    docker run --rm -it sakharamshinde/cmatrixms --help
    ```
