---
layout: post
title: Kubernetes Command Cheatsheet
categories: [devops, orchestration, kubernetes]
tags: [devops, orchestration, kubernetes, command cheatsheet]
---

#### Cluster Management

| kubectl cluster-info | Display endpoint information about the master and services in the cluster | 
| kubectl version | Display the Kubernetes version running on the client and server |
| kubectl config view | Get the configuration of the cluster | 
| kubectl api-resources | List the API resources that are available | 
| kubectl api-versions | List the API versions that are available | 
| kubectl get all --all-namespaces | List everything | 

#### Daemonsets(ds)

| kubectl get daemonset | List one or more daemonsets | 
| kubectl edit daemonset <daemonset_name> | Edit and update the definition of one or more daemonset | 
| kubectl delete daemonset <daemonset_name> | Delete a daemonset | 
| kubectl create daemonset <daemonset_name> | Create a new daemonset |
| kubectl rollout daemonset | Manage the rollout of a daemonset | 
| kubectl describe ds <daemonset_name> -n <namespace_name> | Display the detailed state of daemonsets within a namespace | 
 

#### Deployments(deploy)

| kubectl get deployment | List one or more deployments | 
| kubectl describe deployment <deployment_name> | Display the detailed state of one or more deployments | 
| kubectl edit deployment <deployment_name> | Edit and update the definition of one or more deployment on the server | 
| kubectl create deployment <deployment_name> | Create one a new deployment | 
| kubectl delete deployment <deployment_name> | Delete deployments | 
| kubectl rollout status deployment <deployment_name> | See the rollout status of a deployment | 
 

#### Events(ev)

| kubectl get events | List recent events for all resources in the system |
| kubectl get events --field-selector type=Warning | List Warnings only |
| kubectl get events --field-selector involvedObject.kind!=Pod | List events but exclude Pod events | 
| kubectl get events --field-selector involvedObject.kind=Node, involvedObject.name=<node_name> | Pull events for a single node with a specific name | 
| kubectl get events --field-selector type!=Normal | Filter out normal events from a list of events | 
 

#### Logs

| kubectl logs <pod_name> | Print the logs for a pod | 
| kubectl logs --since=1h <pod_name> | Print the logs for the last hour for a pod |
| kubectl logs --tail=20 <pod_name> | Get the most recent 20 lines of logs | 
| kubectl logs -f <service_name> [-c <$container>] | Get logs from a service and optionally select which container | 
| kubectl logs -f <pod_name> | Print the logs for a pod and follow new logs |
| kubectl logs -c <container_name> <pod_name> | Print the logs for a container in a pod |
| kubectl logs <pod_name> pod.log | Output the logs for a pod into a file named ‘pod.log’ | 
| kubectl logs --previous <pod_name> | View the logs for a previously failed pod | 

***kubetail***

| kubetail <pod_prefix> | Get logs for all pods named with pod_prefix | 
| kubetail <pod_prefix> -s 5m | Include the most recent 5 minutes of logs | 


#### Manifest Files 


| kubectl apply -f manifest_file.yaml | Apply a configuration to an object by filename or stdin. Overrides the existing configuration. | 
| kubectl create -f manifest_file.yaml | Create objects | 
| kubectl create -f ./dir | Create objects in all manifest files in a directory | 
| kubectl create -f ‘url’ | Create objects from a URL | 
| kubectl delete -f manifest_file.yaml | Delete an object | 


#### Namespaces(ns)

| kubectl create namespace <namespace_name> | Create namespace <name> | 
| kubectl get namespace <namespace_name> | List one or more namespaces | 
| kubectl delete namespace <namespace_name> | Delete a namespace | 
| kubectl describe namespace <namespace_name> | Display the detailed state of one or more namespace | 
| kubectl edit namespace <namespace_name> | Edit and update the definition of a namespace | 
| kubectl top namespace <namespace_name> | Display Resource (CPU/Memory/Storage) usage for a namespace | 

#### Nodes(no)

| kubectl taint node <node_name> | Update the taints on one or more nodes |
| kubectl get node | List one or more nodes |
| kubectl delete node <node_name> | Delete a node or multiple nodes |
| kubectl top node | Display Resource usage (CPU/Memory/Storage) for nodes |
| kubectl describe nodes \| grep Allocated -A 5 | Resource allocation per node |
| kubectl get pods -o wide \| grep <node_name> | Pods running on a node| 
| kubectl annotate node <node_name> | Annotate a node | 
| kubectl cordon node <node_name> | Mark a node as unschedulable | 
| kubectl uncordon node <node_name> | Mark node as schedulable |
| kubectl drain node <node_name> | Drain a node in preparation for maintenance |
| kubectl label node | Add or update the labels of one or more nodes |  

#### Pods(po)

| kubectl get pod | List one or more pod |
| kubectl delete pod <pod_name> | Delete a pod | 
| kubectl describe pod <pod_name> | Display the detailed state of a pods | 
| kubectl create pod <pod_name> | Create a pod | 
| kubectl exec <pod_name> -c <container_name> <command> | Execute a command against a container in a pod |
| kubectl exec -it <pod_name> /bin/sh| Get interactive shell on a a single-container pod |
| kubectl top pod | Display Resource usage (CPU/Memory/Storage) for pods | 
| kubectl annotate pod <pod_name> <annotation> | Add or update the annotations of a pod | 
| kubectl label pod <pod_name> | Add or update the label of a pod |

#### Replication Controllers(rc)

| kubectl get rc | List the replication controllers | 
| kubectl get rc --namespace=”<namespace_name>” | List the replication controllers by namespace | 

#### ReplicaSets(rs)

| kubectl get replicasets | List ReplicaSets | 
| kubectl describe replicasets <replicaset_name> | Display the detailed state of one or more ReplicaSets | 
| kubectl scale --replicas=[x]  | Scale a ReplicaSet | 
 

#### Secrets

| kubectl create secret | Create a secret | 
| kubectl get secrets | List secrets |
| kubectl describe secrets | List details about secrets | 
| kubectl delete secret <secret_name> | Delete a secret | 

#### Services(svc)

| kubectl get services | List one or more services |
| kubectl describe services | Display the detailed state of a service |
| kubectl expose deployment [deployment_name] | Expose a replication controller, service, deployment or pod as a new Kubernetes service |
| kubectl edit services | Edit and update the definition of one or more services | 

#### Service Accounts(sa)

| kubectl get serviceaccounts | List service accounts | 
| kubectl describe serviceaccounts | Display the detailed state of one or more service accounts | 
| kubectl replace serviceaccount | Replace a service account | 
| kubectl delete serviceaccount <service_account_name> | Delete a service account | 

#### StatefulSet(sts)

| kubectl get statefulset | List StatefulSet | 
| kubectl delete statefulset/[stateful_set_name] --cascade=false | Delete StatefulSet only (not pods) |

#### Common Options
In Kubectl you can specify optional flags with commands. Here are some of the most common and useful ones.

| -o | Output format |  For example if you wanted to list all of the pods in ps output format with more information. kubectl get pods -o wide | 
| -n | Shorthand for --namespace |  For example, if you’d like to list all the Pods in a specific Namespace you would do this command: kubectl get pods -n=[namespace_name] | 
| -f | Filename, directory, or URL to files to use to create a resource. |  For example when creating a pod using data in a file named newpod.json. kubectl create -f ./newpod.json |
| -l | Selector to filter on, supports ‘=’, ‘==’, and ‘!=’. | Example: | 
| -h | Help for kubectl | Example: kubectl get pods -h | 