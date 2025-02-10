---
layout: post
title: Kubernetes - Jobs and CronJobs
categories: [devops, orchestration, kubernetes]
tags: [Hands-On]
image: /assets/img/common/assignment.png
description: Lab assignment for creating jobs and cronjobs using kubectl
---

### Prerequisites

- Kubernetes
- kubectl

### Assignment

- Lets start by creating a job to calculate pi using perl image and then a cronjob.

### Job

1️⃣  Create a job to calculate pi using the perl image.

```sh
kubectl create job calculatepi --image=perl:5.34.0 -- "perl" "-Mbignum=bpi" "-wle" "print bpi(2000)"
```

```sh
watch kubectl get jobs
```

2️⃣ Describe the job and check if it has completed.

```sh
PI_POD=$(kubectl get pods | grep calculatepi | awk {'print $1'}); echo $PI_POD
```

```sh
kubectl logs $PI_POD
```

3️⃣ Capture the pod IP and check the logs to see the pi value calculated by the job.

```sh
CLUSTER_IP=$(kubectl get services | grep ClusterIP | grep nginx | awk {'print $3'}); echo $CLUSTER_IP
```

```sh
curl $CLUSTER_IP
```

```sh
kubectl delete job/calculatepi
```

4️⃣ Capture the yaml file from our pi job and include the completions and parallelism.

```sh
kubectl create job calculatepi --image=perl:5.34.0 --dry-run=client -o yaml -- "perl" "-Mbignum=bpi" "-wle" "print bpi(2000)" | tee calculatepi.yaml
```

```sh
cat <<EOF > calculatepi.yaml
apiVersion: batch/v1
kind: Job
metadata:
  creationTimestamp: null
  name: calculatepi
spec:
  completions: 20
  parallelism: 5
  template:
    metadata:
      creationTimestamp: null
    spec:
      containers:
      - command:
        - perl
        - -Mbignum=bpi
        - -wle
        - print bpi(2000)
        image: perl:5.34.0
        name: calculatepi
        resources: {}
      restartPolicy: Never
status: {}
EOF
```

```sh
kubectl apply -f calculatepi.yaml && sleep 1 && watch kubectl get pods -o wide
```

```sh
PI_POD=$(kubectl get pods | grep calculatepi | tail -1 | awk {'print $1'}); kubectl logs $PI_POD
```

5️⃣ Delete the job and check if the pods are deleted.

```sh
kubectl delete job/calculatepi
```

```sh
kubectl get pods -o wide
```

### CronJobs

1️⃣ Create a job to calculate pi using the perl image with a schedule.

```sh
kubectl create cronjob calculatepi --image=perl:5.34.0 --schedule="* * * * *" -- "perl" "-Mbignum=bpi" "-wle" "print bpi(2000)"
```

```sh
watch kubectl get jobs
```

2️⃣ Edit the yaml file to include completions and parallelisms(`completions:20` and `parallelism:5`).

```sh
kubectl edit cronjob/calculatepi
```

```sh
watch kubectl get jobs
```

3️⃣ Delete the cronjobs.

```sh
kubectl delete cronjob/calculatepi
```

```sh
kubectl get jobs
```

```sh
kubectl get pods
```