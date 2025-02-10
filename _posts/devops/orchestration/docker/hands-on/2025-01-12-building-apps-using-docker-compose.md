---
layout: post
title: 1. Build Apps using Docker-Compose
categories: [devops, orchestration, docker]
tags: [Hands-On]
image: /assets/img/common/assignment.png
description: Lab assignment for creating a app using docker-compose.
---

### Prerequisites

- Docker
- Docker-Compose

### Assignment

- Lets build an app which has a frontend and backend using docker compose.

1. Create a docker-compose file to save the configuration of the app

    ```sh
    cat <<EOF> docker-compose.yaml
    version: "3.9"

    services:
      backend:
        image: backend-app:latest # Replace with your backend image
        build:
          context: ./backend
          dockerfile: Dockerfile # Adjust if your Dockerfile has a different name
        ports:
          - "5000:5000" # Exposes the backend on port 5000
        environment:
          - DATABASE_URL=postgres://user:password@db:5432/appdb
        depends_on:
          - db # Ensures the database service starts before the backend
        networks:
          - app-network

      frontend:
        image: frontend-app:latest # Replace with your frontend image
        build:
          context: ./frontend
          dockerfile: Dockerfile # Adjust if your Dockerfile has a different name
        ports:
          - "3000:3000" # Exposes the frontend on port 3000
        environment:
          - REACT_APP_API_URL=http://backend:5000 # URL of the backend service
        depends_on:
          - backend # Ensures the backend starts before the frontend
        networks:
          - app-network

      db:
        image: postgres:15 # Replace with your preferred database image/version
        environment:
          POSTGRES_USER: user
          POSTGRES_PASSWORD: password
          POSTGRES_DB: appdb
        volumes:
          - db_data:/var/lib/postgresql/data
        networks:
          - app-network

    networks:
      app-network:
        driver: bridge

    volumes:
      db_data:
    EOF
    ```

2. Create Dockerfile for backend container:

    ```sh
    cat <<EOF> ./backend/Dockerfile
    # Use the official Python image as the base
    FROM python:3.11-slim

    # Set the working directory in the container
    WORKDIR /app

    # Copy the application code into the container
    COPY . .

    # Install Python dependencies
    RUN pip install --no-cache-dir -r requirements.txt

    # Expose the backend's port
    EXPOSE 5000

    # Command to run the application
    CMD ["python", "app.py"]
    EOF
    ```

    ```sh
    cat <<EOF> ./backend/requirements.txt
    Flask==2.2.5
    psycopg2-binary==2.9.6  # PostgreSQL driver
    EOF
    ```

    ```sh
    cat <<EOF> ./backend/app.py
    from flask import Flask, jsonify

    app = Flask(__name__)

    @app.route("/")
    def home():
        return jsonify({"message": "Welcome to the backend API!"})

    @app.route("/data")
    def data():
        return jsonify({"data": "This is some data from the backend!"})

    if __name__ == "__main__":
        app.run(host="0.0.0.0", port=5000)
    EOF
    ```

3. Create a Dockerfile for frontend container.

    ```sh
    cat <<EOF> ./frontend/Dockerfile
    # Use the official Node.js image as the base
    FROM node:18-alpine

    # Set the working directory in the container
    WORKDIR /app

    # Copy package.json and package-lock.json
    COPY package*.json ./

    # Install Node.js dependencies
    RUN npm install

    # Copy the rest of the application code
    COPY . .

    # Build the React app
    RUN npm run build

    # Serve the build using a lightweight server
    RUN npm install -g serve

    # Expose the frontend's port
    EXPOSE 3000

    # Command to start the frontend
    CMD ["serve", "-s", "build", "-l", "3000"]
    EOF
    ```

    ```sh
    cat <<EOF> ./frontend/package.json
    {
      "name": "frontend-app",
      "version": "1.0.0",
      "private": true,
      "dependencies": {
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "react-scripts": "5.0.1",
        "axios": "^1.5.0"
      },
      "scripts": {
        "start": "react-scripts start",
        "build": "react-scripts build",
        "test": "react-scripts test",
        "eject": "react-scripts eject"
      }
    }
    EOF
    ```

    ```sh
    cat <<EOF> ./frontend/src/App.js
    import React, { useEffect, useState } from "react";
    import axios from "axios";

    function App() {
      const [data, setData] = useState("");

      useEffect(() => {
        // Call the backend API
        axios.get("http://backend:5000/data")
          .then(response => setData(response.data.data))
          .catch(error => console.error("Error fetching data:", error));
      }, []);

      return (
        <div style={{ textAlign: "center", padding: "50px" }}>
          <h1>Frontend React App</h1>
          <p>Message from Backend: {data || "Loading..."}</p>
        </div>
      );
    }

    export default App;
    EOF
    ```

    ```sh
    cat <<EOF> ./frontend/public/index.html
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Frontend App</title>
    </head>
    <body>
      <div id="root"></div>
    </body>
    </html>
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
