---
layout: post
title: Kubernetes - RBAC Service Accounts
categories: [devops, orchestration, kubernetes]
tags: [Hands-On]
image: /assets/img/common/assignment.png
description: Lab assignment for understanding RBAC for service accounts in Kubernetes
---

### Prerequisites

- Kubernetes
- kubectl

### Assignment

- Creating a simple pod with curlimages/curl:

```sh
kubectl run curl --image=curlimages/curl:8.4.0 -- sleep infinity
```

- Inspect the pod, you will see Service Account at the top and it will be assigned the value of default

```sh
kubectl describe pod/curl | more
```

- Kubectl exec into the curlimages/curl container with a sh shell

```sh
kubectl exec -it curl -- sh
```

- We can capture the default ServiceAccount token that has been assigned to the pod by accessing the token file that is available through /var/run/secrets/kubernetes.io, all pods receive API information in this way, via the pods filesystem -

```sh
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
```

```sh
echo $TOKEN
```

- Using this token, we can query the API using curl, for example we could query the /api/v1/pods endpoint. We will use the convenient DNS name of https://kubernetes.default.svc which is setup by default for convenience to allow pods to communicate with the API. If you attempt this at this stage, access will be restricted as there are no access permissions with the default account -

```sh
curl --header "Authorization: Bearer $TOKEN" --insecure https://kubernetes.default.svc/api/v1/pods
```

- Exit the pod, and clean-up

```sh
exit
kubectl delete pod/curl --now
```

- Let’s create a pod-serviceaccount:

```sh
kubectl create serviceaccount pod-serviceaccount
```

- Create a ClusterRole or Role as per our video with the desired resources and verbs. We’ll re-use the example we used for deadpool -

```sh
kubectl create clusterrole cluster-pod-manager --verb=list,get,create,delete --resource='pods'
```

- Create a ClusterRoleBinding/RoleBinding, again we’ll re-use the deadpool example but instead of specifying a user, we’ll specify a serviceaccount, the format for this is namespace:serviceaccount

```sh
kubectl create clusterrolebinding cluster-pod-manager --clusterrole=cluster-pod-manager --serviceaccount=default:pod-serviceaccount
```

- This time we’ll re-create the Pod but we’ll specify our serviceaccount. Sadly it isn’t possible to specify a serviceaccount as part of the CLI but, we can inject this into the yaml on the fly as follows -

```sh
kubectl run curl --image=curlimages/curl:8.4.0 --overrides='{ "spec": { "serviceAccount": "pod-serviceaccount" } }' -- sleep infinity
```

- If we describe the pod, this time we will see pod-serviceaccount as the service account -

```sh
kubectl describe pod/curl | more
```

- Kubectl exec into the curlimages/curl container with an sh shell -

```sh
kubectl exec -it curl -- sh
```

- Again, capture the default ServiceAccount token that has been assigned to the pod by accessing the token file that is available through /var/run/secrets/kubernetes.io -

```sh
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
```

```sh
echo $TOKEN
```

- Using this token, attempt to query the /api/v1/pods endpoint as the pod-serviceaccount, this time it will be successful -

```sh
curl --header "Authorization: Bearer $TOKEN" --insecure https://kubernetes.default.svc/api/v1/pods
```

- Exit the pod, and clean-up all of the resources -

```sh
exit
```

```sh
kubectl delete pod/curl serviceaccount/pod-serviceaccount clusterrole/cluster-pod-manager clusterrolebinding/cluster-pod-manager --now
```
