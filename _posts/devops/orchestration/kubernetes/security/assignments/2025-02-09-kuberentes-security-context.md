---
layout: post
title: Kubernetes - Security Contexts
categories: [devops, orchestration, kubernetes]
tags: [Assignments]
image: /assets/img/common/assignment.png
description: Lab assignment for understanding security contexts in Kubernetes
---

### Prerequisites

- Kubernetes
- kubectl

### Assignment

- Create a Security Contexts which define privilege and access control settings for a Pod or Container.
- We will use a custom image that includes a rogue binary for demonstration purposes.
- This binary allows escalation from a normal user to root in a Kubernetes pod.

```sh
kubectl run ubuntu --image=spurin/rootshell:latest -o yaml --dry-run=client -- sleep infinity | tee ubuntu_secure.yaml
```

```sh
kubectl apply -f ubuntu_secure.yaml
```

- With the pod running, let's execute into it and observe the current user privileges. You'll notice that we have root access:

```sh
kubectl exec -it ubuntu -- bash
```

```sh
exit
```

- Modify our YAML file to include a Security Context that specifies running as a non-root user with a specific UID and GID:

```sh
cat <<EOF > ubuntu_secure.yaml
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: null
  labels:
    run: ubuntu
  name: ubuntu
spec:
  securityContext:
    runAsUser: 1000
    runAsGroup: 1000
  containers:
  - args:
    - sleep
    - infinity
    image: spurin/rootshell:latest
    name: ubuntu
    resources: {}
  dnsPolicy: ClusterFirst
  restartPolicy: Always
status: {}
EOF
```

- Let's replace the existing pod with our updated configuration. This replacement might take a little longer:

```sh
kubectl replace --force -f ubuntu_secure.yaml
```

- Let's exec into the pod again. This time, you'll observe that we're logged in as a non-root user:

```sh
kubectl exec -it ubuntu -- bash
```

- If we run id, this will confirm we are a non root user:

```sh
id
```

- However, if we run the /rootshell binary this will allow privilege escalation:

```sh
/rootshell
```

- We can even run commands that require root access like apt update -

```sh
apt update
```

- Repeat this command until we exit the container:

```sh
exit
```

- To further secure our pod, we will add an additional Security Context to the container specification, disallowing privilege escalation.:

```sh
cat <<EOF > ubuntu_secure.yaml
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: null
  labels:
    run: ubuntu
  name: ubuntu
spec:
  securityContext:
    runAsUser: 1000
    runAsGroup: 1000
  containers:
  - args:
    - sleep
    - infinity
    image: spurin/rootshell:latest
    name: ubuntu
    resources: {}
    securityContext:
      allowPrivilegeEscalation: false
  dnsPolicy: ClusterFirst
  restartPolicy: Always
status: {}
EOF
```

- Again, let's replace the pod with our new security settings:

```sh
kubectl replace --force -f ubuntu_secure.yaml
```

- Now, exec into the pod one more time:

```sh
kubectl exec -it ubuntu -- bash
```

- And try to escalate privileges, you can try this multiple times, the command will succeed but without root priviledge:

```sh
/rootshell
```

- And issue exit until we fully exit the container:

```sh
exit
```

- Finally, let's clean up by deleting the pod and removing the YAML file -

```sh
kubectl delete -f ubuntu_secure.yaml --now ; rm -rf ubuntu_secure.yaml
```