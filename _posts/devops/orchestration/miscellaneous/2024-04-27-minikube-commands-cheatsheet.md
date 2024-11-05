---
layout: post
title: Minikube CMDsheet
categories: [devops, orchestration, miscellaneous]
tags: [Minikube, CMDsheet]
---


### Common Commands

| Command |Description |
| `minikube start` |To start the cluster |
| `minikube status` |To check the status |
| `minikube stop` |To stop the cluster |
| `minikube delete` |To delete the cluster |
| `minikube logs` |To access the logs |
| `minikube version` |To get the version |
| `minikube ip` |To get the IP address of the running cluster |
| `minikube dashboard` |To access the dashboard |
| `minikube pause` |To pause the cluster |
| `minikube unpause` |To resume the cluster |
| `minikube service list` |To list the services running on the cluster |
| `minikube start --nodes 2` |To start minikube with multiple nodes |
| `minikube start -p <profile_name>` |To run multiple clusters with different profiles |
| `minikube update-check` |To check if there are any updates available for minikube |

### Profiles

| `minikube profile list` |To list the profiles |
|  `minikube start -p <profile_name>` |To run multiple cluster with profiles |
| `minikube start -p profileX` |To switch between profiles |

### Nodes

| `minikube node add ` |To add node to cluster |
| `minikube node add -p <profile_name>` |To add node to cluster to a specific profile |
| `kubectl get nodes ` |To list the number of nodes in the cluster |

### File Operations

| `minikube cp <source> <destination> ` | To Copy a file to the minikube cluster |










