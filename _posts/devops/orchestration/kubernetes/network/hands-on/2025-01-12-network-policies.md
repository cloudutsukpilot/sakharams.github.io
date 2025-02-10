---
layout: post
title: Kubernetes - Network Policies
categories: [devops, orchestration, kubernetes, hands-on]
tags: [Hands-On]
image: /assets/img/common/assignment.png
description: Lab assignment for creating a network policies using kubectl
---

### Prerequisites

- Kubernetes
- kubectl

### Assignment

- Explore how Network Policies can help isolate pods and control their communication within a Kubernetes cluster.

- Create an nginx pod:

```sh
kubectl run nginx --image=nginx
```

- Expose the nginx pod as a service with a ClusterIP

```sh
kubectl expose pod/nginx --port=80
```

- Test the accessibility of the nginx service.
- Run a temporary curl pod and use it to send a request to the nginx service.

```sh
kubectl run --rm -i --tty curl --image=curlimages/curl:8.4.0 --restart=Never -- sh
```

- Once in the curl pod, use curl to request the nginx page. Notice that there are no restrictions, and the nginx service responds:

```sh
curl nginx.default.svc.cluster.local
```

```sh
exit
```

- Implement a Network Policy to restrict access to the nginx pod.
- Create a policy that allows access to the nginx pod only from pods with specific labels.

```sh
cat <<EOF > networkpolicy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-nginx-access
  namespace: default
spec:
  podSelector:
    matchLabels:
      run: nginx
  policyTypes:
    - Ingress
  ingress:
    - from:
      - podSelector:
          matchLabels:
            run: curl
EOF
```sh

```sh
kubectl apply -f networkpolicy.yaml
```

- Test the network policy.
- Start another curl pod which we'll be using to accessing the nginx service again.
- Since this pod has the label 'run:curl', it should be allowed by the network policy.

```sh
kubectl run --rm -i --tty curl --image=curlimages/curl --restart=Never -- sh
```

- Describe the pod to confirm the label assigned to the pod in a new tab:

```sh
kubectl describe pod/curl | more
```

- In the curl pod, use curl to test access. The request should succeed, demonstrating the network policy's effect:

```sh
curl nginx.default.svc.cluster.local
```

```sh
exit
```

- Test with a pod that doesn't match the network policy criteria.
- Create a new curl pod with a different name, which results in a different label.
- This pod should not be able to access the nginx service.

```sh
kubectl run --rm -i --tty curl2 --image=curlimages/curl --restart=Never -- sh
```

- Inside the curl2 pod, again, attempt to access the nginx service using curl.
- The request should be blocked by the network policy, illustrating how Network Policies can be used to control access in a Kubernetes cluster:

```sh
curl nginx.default.svc.cluster.local
```

```sh
exit
```

- CleanUp

```sh
kubectl delete pod nginx; kubectl delete service nginx; kubectl delete networkpolicy allow-nginx-access; rm -rf networkpolicy.yaml
```