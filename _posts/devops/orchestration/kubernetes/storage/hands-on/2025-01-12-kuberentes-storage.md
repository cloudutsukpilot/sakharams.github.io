---
layout: post
title: Kubernetes - Storage
categories: [devops, orchestration, kubernetes, hands-on]
tags: [Hands-On]
image: /assets/img/common/assignment.png
description: Lab assignment for understanding storage in Kubernetes
---

### Prerequisites

- Kubernetes
- kubectl

### Assignment

- Create an ubuntu pod yaml with sleep infinity as a command:

```sh
kubectl run --image=ubuntu ubuntu -o yaml --dry-run=client --command sleep infinity | tee ubuntu_emptydir.yaml
```

- Update this specification so that it includes a volumeMount and an emptyDir volume:

```sh
cat <<EOF > ubuntu_emptydir.yaml
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: null
  labels:
    run: ubuntu
  name: ubuntu
spec:
  containers:
  - command:
    - sleep
    - infinity
    image: ubuntu
    name: ubuntu
    resources: {}
    volumeMounts:
    - mountPath: /cache
      name: cache-volume
  dnsPolicy: ClusterFirst
  restartPolicy: Always
  volumes:
  - name: cache-volume
    emptyDir: {
      medium: Memory,
    }
status: {}
EOF
```sh

```sh
kubectl apply -f ubuntu_emptydir.yaml
```

- Review the pods status and exce into it:

```sh
kubectl get pods -o wide
```

```sh
kubectl exec -it ubuntu -- bash
```

- Check the filesystem used by the `cache` directory - `tmpfs`:

```sh
cd cache; df -h .
```

- Check the performance of the memory based filesystem using `dd`:

```sh
dd if=/dev/zero of=output oflag=sync bs=1024k count=1000
```

```sh
exit
```

- When we get rid of this container it will also remove the emptyDir volume -

```sh
kubectl delete pod/ubuntu --now
```

### Persistent Storage

- Review the `storageclasses` specification available in our cluster and claim policies:

```sh
kubectl get storageclass
```

```sh
kubectl explain storageclass | more
```

- Create a persistent volume using the k3s storageClass of local-path:

```sh
cat <<EOF > manual_pv.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: manual-pv001
spec:
  storageClassName: local-path
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: "/var/lib/rancher/k3s/storage/manual-pv001"
    type: DirectoryOrCreate
EOF
```

```sh
kubectl apply -f manual_pv.yaml
```

- Check the available persistent volumes and note that the reclaim policy is set to Retain:

```sh
kubectl get pv
```

- Let's now create a manual `persistent volume claim` against this `persistent volume`:

```sh
cat <<EOF > manual_pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: manual-claim
spec:
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  resources:
    requests:
      storage: 10Gi
  storageClassName: local-path
  volumeName: manual-pv001
EOF
```sh

```sh
kubectl apply -f manual_pvc.yaml
```

- Check the persistent volume claim:

```sh
kubectl get persistentvolumeclaim
```

```sh
kubectl get pvc
```

### Dynamic PVC

- Create a dynamic version of our Persistent Volume Claim:

```sh
cat <<EOF > dynamic_pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dynamic-claim
spec:
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  resources:
    requests:
      storage: 10Gi
  storageClassName: local-path
EOF
```

```sh
kubectl apply -f dynamic_pvc.yaml
```

- Check the status of the pvc:

```sh
kubectl get pvc
```

```sh
kubectl describe pvc/dynamic-claim
```

- Check the pv and to understand to check if a pv is available for the recently created pvc:

```sh
kubectl get pv
```

- Create a new pod:

```sh
kubectl run --image=ubuntu ubuntu -o yaml --dry-run=client --command sleep infinity | tee ubuntu_with_volumes.yaml
```

- Modify this to include volumeMounts and volumes for both our manual and dynamic pvc's:

```sh
cat <<EOF > ubuntu_with_volumes.yaml
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: null
  labels:
    run: ubuntu
  name: ubuntu
spec:
  containers:
  - command:
    - sleep
    - infinity
    image: ubuntu
    name: ubuntu
    resources: {}
    volumeMounts:
    - mountPath: /manual
      name: manual-volume
    - mountPath: /dynamic
      name: dynamic-volume
  dnsPolicy: ClusterFirst
  restartPolicy: Always
  volumes:
    - name: manual-volume
      persistentVolumeClaim:
        claimName: manual-claim
    - name: dynamic-volume
      persistentVolumeClaim:
        claimName: dynamic-claim
status: {}
EOF
```

- As the k3s storageclass provisioner is very basic, we should use a nodeSelector to guide this pod to a specific node, check the labels for node/worker-1:

```sh
kubectl describe node/worker-1 | more
```

- And update the yaml to include a nodeSelector field:

```sh
cat <<EOF > ubuntu_with_volumes.yaml
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: null
  labels:
    run: ubuntu
  name: ubuntu
spec:
  nodeSelector:
    kubernetes.io/hostname: worker-1
  containers:
  - command:
    - sleep
    - infinity
    image: ubuntu
    name: ubuntu
    resources: {}
    volumeMounts:
    - mountPath: /manual
      name: manual-volume
    - mountPath: /dynamic
      name: dynamic-volume
  dnsPolicy: ClusterFirst
  restartPolicy: Always
  volumes:
    - name: manual-volume
      persistentVolumeClaim:
        claimName: manual-claim
    - name: dynamic-volume
      persistentVolumeClaim:
        claimName: dynamic-claim
status: {}
EOF
```

```sh
kubectl apply -f ubuntu_with_volumes.yaml
```

- Check that the pod is running:

```sh
kubectl get pod
```

- Check pv's, A dynamic pv will have been created, notice the reclaim policies for both:

```sh
kubectl get pv
```

- Check pvc's, they should now both be bound:

```sh
kubectl get pvc
```

- And let's write data to our volumes, access the pod with an interactive shell:

```sh
kubectl exec -it ubuntu -- bash
```

- And if we check both of these, they are mounted volumes -

```sh
cd /manual; df -h .; cd /dynamic; df -h .
```

- Let's write a text file to each of these and we'll exit -

```sh
echo hello > /manual/test.txt; echo hello > /dynamic/test.txt; exit
```

- As these are persistent volumes, if we delete the pod and recreate it:

```sh
kubectl delete pod/ubuntu --now && kubectl apply -f ubuntu_with_volumes.yaml
```

- And again access this pod:

```sh
kubectl exec -it ubuntu -- bash
```

- We can see that our files will still exist as our volumes are persistent:

```sh
cat /manual/test.txt; cat /dynamic/test.txt
```

```sh
exit
```

- Before we go, let's see what happens when we delete the pod and pvc's:

```sh
kubectl delete pod/ubuntu pvc/dynamic-claim pvc/manual-claim --now
```

- If we check our pv's, the manual one still exists as the Reclaim policy is set to Retain

```sh
kubectl get pv
```

- Finally we'll clean this up and remove our files:

```sh
kubectl delete pv/manual-pv001 --now; rm -rf dynamic_pvc.yaml manual_pv* ubuntu_emptydir.yaml ubuntu_with_volumes.yaml
```