---
layout: post
title: Dapr - CMDSheet
categories: [microservices, dapr]
tags: [Microservices, Dapr, CMDSheet]
image: /assets/img/microservics/dapr/dapr-posts.jpg
description: Commands Cheat Sheet
---

## Introduction

Dapr (Distributed Application Runtime) is an open-source project that simplifies the development of microservices-based applications by providing building blocks such as state management, pub/sub messaging, and service invocation. This blog explores essential Dapr commands that every developer should know.

### Installation

| `dapr --version` | To verify the installation |

### Initializing Dapr

| `dapr init` | Initialize it locally |
| `dapr init --kubernetes` | To initialize Dapr in Kubernetes mode |
| `dapr uninstall` | To uninstall Dapr |
| `dapr uninstall --kubernetes` | To uninstall from Kubernetes |

### Managing Dapr Applications

- Running a Dapr Application

```sh
dapr run --app-id myapp --app-port 5000 --dapr-http-port 3500 -- python app.py
```

- `--app-id` specifies a unique identifier for the app.
- `--app-port` defines the port where the app runs.
- `--dapr-http-port` assigns a port for Dapr sidecar HTTP communication.

- Stopping a Running Dapr App

```sh
dapr stop --app-id myapp
```

### Viewing Dapr Application Status

| `dapr list` | To list running Dapr instances |
| `dapr logs --app-id myapp` | To check the logs of a running Dapr application |

### State Management Commands

| `dapr state get statestore mykey` | To get the state from a state store |
| `dapr state save statestore mykey "myvalue"` | To save a state |
| `dapr state delete statestore mykey` | To delete a state |

### Service Invocation

- Dapr enables service-to-service communication. To invoke a method on another service:

```sh
curl -X POST http://localhost:3500/v1.0/invoke/myservice/method/mymethod -d '{"data":"hello"}' -H "Content-Type: application/json"
```

- Or using the Dapr CLI:

```sh
dapr invoke --app-id myservice --method mymethod --post --data '{"data":"hello"}'
```

### Pub/Sub Messaging

- To publish an event:

```sh
dapr publish --pubsub pubsub --topic mytopic --data '{"message": "hello world"}'
```

- To subscribe to a topic, define a subscriber service that listens for events.

### Observability & Debugging

| `dapr components -k` | Checking Component Status |
| `dapr config -k` | Checking Configuration |

### Enabling Tracing

- Enable tracing with the following:

```sh
dapr run --app-id myapp --app-port 5000 --enable-metrics --enable-tracing -- python app.py
```

### Dapr Dashboard

| `dapr dashboard` | To start the Dapr dashboard |
| `dapr dashboard -k` | If running in Kubernetes |

### Conclusion

Dapr CLI commands make it easy to develop, debug, and manage microservices. Whether you’re running applications locally or in Kubernetes, these commands will help you interact with Dapr’s features efficiently. Happy coding!
