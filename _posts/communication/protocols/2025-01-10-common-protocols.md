---
layout: post
title: Common Protocols
categories: [communication, protocols]
tags: [Communication, Protocols]
image: /assets/img/communication/common-protocols.jpg
description: List of common networking protocols used on daily basis. 
---

## Understanding Common Networking Ports and Their Use Cases

In the world of networking and IT infrastructure, understanding commonly used ports and their associated protocols is crucial. Each port serves as a gateway for specific services, enabling secure communication, application hosting, file transfers, and more. 

Here’s a detailed guide to some of the most commonly used ports, their purposes, and example tools.

### 1. SSH (Secure Shell)

- **Port**: `22`
- **Purpose**: Enables secure remote login and command execution on Linux servers.
- **Use Case**: Admin access to servers, deploying code, and configuration management.
- **Example Tool**: `ssh`, `scp`, `rsync`

### 2. HTTP (Hypertext Transfer Protocol)

- **Port**: `80`
- **Purpose**: Serves unencrypted web traffic.
- **Use Case**: Web applications, load balancing, reverse proxy setup.
- **Example Tool**: nginx, apache2.

### 3. HTTPS (Hypertext Transfer Protocol Secure)

- **Port**: `443`
- **Purpose**: Provides encrypted web traffic for secure communications.
- **Use Case**: Hosting secure web applications, SSL/TLS termination.
- **Example Tool**: nginx, apache2, letsencrypt.

### 4. FTP (File Transfer Protocol)

- **Port**: `21`
- **Purpose**: Transfers files between servers.
- **Use Case**: File transfer (though often replaced by SFTP for added security).
- **Example Tool**: vsftpd, proftpd.

### 5. SFTP (SSH File Transfer Protocol)

- **Port**: `22` (Shared with SSH)
- **Purpose**: Securely transfers files using SSH.
- **Use Case**: Secure file uploads/downloads to remote systems.

### 6. DNS (Domain Name System)
- **Port**: `53`
- **Purpose**: Resolves domain names to IP addresses.
- **Use Case**: Networking, troubleshooting, and service discovery.
- **Example Tool**: bind9, dnsmasq, systemd-resolved.

### 7. MySQL / MariaDB

- **Port**: `3306`
- **Purpose**: Default port for MySQL and MariaDB databases.
- **Use Case**: Database management and application backends.
- **Example Tool**: mysql, mariadb.

### 8. PostgreSQL

- **Port**: `5432`
- **Purpose**: Default port for PostgreSQL databases.
- **Use Case**: Application backends and data storage.
- **Example Tool**: postgresql.

### 9. Redis

- **Port**: `6379`
- **Purpose**: Default port for the Redis in-memory data store.
- **Use Case**: Caching, message brokering, and session management.
- **Example Tool**: redis-server.

### 10. MongoDB

- **Port**: `27017`
- **Purpose**: Default port for the MongoDB NoSQL database.
- **Use Case**: NoSQL data storage.
- **Example Tool**: mongod.

### 11. Jenkins

- **Port**: `8080`
- **Purpose**: Default port for the Jenkins CI/CD server.
- **Use Case**: Continuous integration and deployment pipelines.
- **Example Tool**: jenkins.

### 12. Docker

- **Port**: `2375` (unencrypted), `2376` (encrypted)
- **Purpose**: Default port for the Docker daemon's REST API.
- **Use Case**: Docker container orchestration and remote management.
- **Example Tool**: docker, docker-compose.

### 13. Kubernetes API Server

- **Port**: `6443`
- **Purpose**: Default port for the Kubernetes API server.
- **Use Case**: Kubernetes cluster management and service discovery.
- **Example Tool**: kubectl, helm.

### 14. ElasticSearch

- **Port**: `9200` (HTTP), 9300 (Internal communication)
- **Purpose**: Default port for Elasticsearch REST API and cluster communication.
- **Use Case**: Full-text search and log aggregation.
- **Example Tool**: elasticsearch.

### 15. RabbitMQ

- **Port**: `5672`
- **Purpose**: Default port for AMQP (Advanced Message Queuing Protocol).
- **Use Case**: Messaging queues and event-driven architectures.
- **Example Tool**: rabbitmq.

### Conclusion
Networking ports play a vital role in enabling communication across systems and applications. Whether you are an administrator managing servers, a developer deploying web applications, or an architect designing infrastructure, understanding these ports and their use cases is essential for seamless operations and security.

Have a favorite tool or use case for any of these ports? Share your thoughts in the comments!