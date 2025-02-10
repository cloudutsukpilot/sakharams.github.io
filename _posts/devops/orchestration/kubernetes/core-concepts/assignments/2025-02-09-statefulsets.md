---
layout: post
title: Kubernetes - StatefulSets
categories: [devops, orchestration, kubernetes]
tags: [Assignments]
image: /assets/img/common/assignment.png
description: Lab assignment for creating statefulSets using kubectl
---

### Prerequisites

- Kubernetes
- kubectl

### Assignment

- Create a StatefulSet with the help of a Deployment file(No easy of creatinga statefulset from CLI):

```sh
kubectl create deployment nginx --image=nginx --replicas=3 --dry-run=client -o yaml | tee statefulset.yaml
```

- Modify the file to change it to a StatefulSet:

```sh
cat <<EOF > statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  creationTimestamp: null
  labels:
    app: nginx
  name: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  serviceName: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx
        name: nginx
EOF
```

```sh
kubectl apply -f statefulset.yaml
```

- Review the statefulset and the created pods:

```sh
kubectl get statefulset
```

```sh
kubectl get pods -o wide
```

- *Note*: If a pod in a statefulset was removed, causing a restart, whilst the ip may change, the name will stay consistent. 

- Delete pod/nginx-2

```sh
kubectl delete pod/nginx-2 --now
```

```sh
kubectl get pods -o wide
```

- Using statefulsets service functionality, we'll create a headless service called nginx:

```sh
kubectl create service clusterip --clusterip=None nginx
```

```sh
kubectl get service
```

- Review the our endpoint slices:

```sh
kubectl get endpoints
```

```sh
kubectl get endpoints/nginx -o yaml
```

- Let's check this from the viewpoint of a pod, we'll run a curlimages/curl container:

```sh
kubectl run --rm -i --tty curl --image=curlimages/curl:8.4.0 --restart=Never -- sh
```

- And let's curl our statefulset service name -

```sh
curl nginx-1.nginx.default.svc.cluster.local
```

```sh
exit
```

- Take a look at the statefulset yaml, you'll notice that the updateStrategy/rollingUpdate has a partition value of 0:

```sh
kubectl get statefulset/nginx -o yaml | more
```

- Edit the existing statefulset to change the partition value to 2 but, the following command will do the equivalent:

```sh
kubectl patch statefulset/nginx -p '{"spec":{"updateStrategy":{"rollingUpdate":{"partition":2}}}}'
```

- We will set the image to nginx:alpine and watch the rollout:

```sh
kubectl set image statefulset/nginx nginx=nginx:alpine && kubectl rollout status statefulset/nginx
```

- Because of the partition value, the rollout only took place on nginx-2, we can verify this with the following commands (check the image) -

```sh
kubectl describe pod/nginx-1 | more
```

```sh
kubectl describe pod/nginx-2 | more
```

### StatefulSet Persistent Storage

- Update our statefulset to include a dynamic volume:

```sh
cat <<EOF > statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  labels:
    app: nginx
  name: nginx
spec:
  selector:
    matchLabels:
      app: nginx
  serviceName: nginx
  replicas: 3
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx
        name: nginx
        volumeMounts:
        - name: nginx
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: nginx
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: "local-path"
      resources:
        requests:
          storage: 1Gi
EOF
```

- And we will recycle our statefulset:

```sh
kubectl delete -f statefulset.yaml && kubectl apply -f statefulset.yaml
```

- Watch our pods start, press ctrl-c to exit:

```sh
watch --differences kubectl get pods -o wide
```

- And we can verify that we have an individual pvc and pv for each pod -

```sh
kubectl get pvc
```

```sh
kubectl get pv
```

- We'll execute a shell into nginx-0:

```sh
kubectl exec -it nginx-0 -- bash
```

- Create some data:

```sh
cd /data; touch this_is_nginx-0; ls -l
```

```sh
exit
```

- Let's delete the pod and watch it be recreated:

```sh
kubectl delete pod/nginx-0 --now; watch --differences kubectl get pods -o wide
```

- And if we execute a shell again:

```sh
kubectl exec -it nginx-0 -- bash
```

- We can verify that our data still exists -

```sh
ls /data
```

```sh
exit
```

- And we can take this further, we can delete the entire statefulset:

```sh
kubectl delete -f statefulset.yaml
```

- Our pvc and pv will still exist:

```sh
kubectl get pvc; kubectl get pv
```

- And if we apply the statefulset again:

```sh
kubectl apply -f statefulset.yaml
```

- Check our pods are running:

```sh
kubectl get pods -o wide
```

- And exec back into the pod:

```sh
kubectl exec -it nginx-0 -- bash
```

- And check our data, we can confirm that it is available as expected:

```sh
ls /data
```

```sh
exit
```

- Cleanup:

```sh
kubectl delete statefulset/nginx --now; for i in 0 1 2; do kubectl delete pvc/nginx-nginx-$i --now; done; kubectl delete service/nginx; rm statefulset.yaml
```
