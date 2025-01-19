---
layout: post
title: Kubernetes - Jobs and CronJobs
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
image: /assets/img/devops/orchestration/kubernetes/kubernetes-posts.png
description: Dive into Kubernetes Jobs and CronJobs
---


## Introduction

Kubernetes provides powerful features for managing workloads that run to completion, known as Jobs and CronJobs. These are crucial for tasks such as batch processing, scheduled tasks, and data migrations. Let’s dive into their details, explore configurations, and discuss real-world use cases.

### Kubernetes Jobs

- A Kubernetes Job is used to create and manage one or more Pods that run tasks until they are completed successfully.
- Once a Job finishes, the Pods it created are automatically cleaned up (unless configured otherwise).

### Key Concepts of Jobs

1. **Completions**
    - `Definition`: Specifies the total number of tasks that need to be completed for the Job to finish.
    - ``Example`: If completions: 3 is set, Kubernetes ensures three Pods run and complete successfully, one after another or in parallel.

2. **Parallelism**
    - `Definition`: Defines how many Pods can run simultaneously to complete the Job.
    - `Example`: If parallelism: 2 and completions: 4 are set, two Pods will run concurrently until the total of four completions is reached.

### Sample Job YAML

- Here is an example of a Job to perform a simple task (e.g., printing a message):

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: example-job
spec:
  completions: 3
  parallelism: 2
  template:
    metadata:
      name: example-job
    spec:
      containers:
      - name: example-task
        image: busybox
        command: ["echo", "Processing task"]
      restartPolicy: Never
```

- Explanation:
  - `completions: 3`: The Job requires three successful completions.
  - `parallelism`: 2: Up to two Pods will run concurrently.
  - `restartPolicy`: Never: Pods won't restart on failure.

### Real-World Use Cases for Jobs

1. `Data Processing`: Running a one-time script to process a batch of data.
2. `Database Migration`: Executing schema updates for a database.
3. `Backup Jobs`: Triggering one-off backups of critical data.

### Kubernetes CronJobs

- A CronJob in Kubernetes is used for running Jobs on a schedule.
- It’s analogous to cron in Unix/Linux systems.

### Key Features of CronJobs

1. `Scheduled Execution`: Uses cron-like syntax to define the schedule.
2. `Concurrency Policy`: Determines if multiple instances of a Job can run simultaneously or if new Jobs should wait.
3. `Allow`: Allows overlapping jobs.
4. `Forbid`: Ensures only one Job runs at a time.
5. `Replace`: Replaces a running Job with a new one.

### Sample CronJob YAML

- Here is an example of a CronJob to run a task every 5 minutes:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: example-cronjob
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      completions: 1
      parallelism: 1
      template:
        spec:
          containers:
          - name: scheduled-task
            image: busybox
            command: ["echo", "Scheduled task running"]
          restartPolicy: Never
```

- Explanation:
  - `schedule`: "*/5 * * * *": Runs the Job every 5 minutes.
  - `completions: 1`: Each scheduled run completes a single task.
  - `parallelism: 1`: Ensures only one Pod runs at a time for the Job.

### Real-World Use Cases for CronJobs

1. `Scheduled Reports`: Generating daily or weekly reports.
2. `Log Rotation`: Cleaning up old logs at regular intervals.
3. `System Monitoring`: Sending periodic health checks to external systems.

### Completions vs. Parallelism: A Closer Look

- `Completions`: Represents the total work to be done. For example, if you need to process 10 files, completions: 10 ensures that the task is completed 10 times.
- `Parallelism`: Controls how many Pods work simultaneously. Setting parallelism: 5 ensures 5 Pods process the tasks concurrently, reducing total execution time.
- By default, the `successfulJobsHistoryLimit` field in a CronJob specification is set to 3, meaning that up to three successfully completed jobs are kept for historical tracking purposes.
- Similarly, the `failedJobsHistoryLimit` defaults to 1, keeping one failed job for analysis.
- Example: If you need to process 20 files and want to use 4 Pods concurrently:

```yaml
spec:
  completions: 20
  parallelism: 4
```

- Kubernetes will:
  - Start 4 Pods initially.
  - As each Pod completes its task, it starts another until all 20 tasks are completed.

### Summary

| **Feature**       | **Job**                                  | **CronJob**                              |
|--------------------|------------------------------------------|------------------------------------------|
| **Purpose**       | Run tasks to completion once.            | Schedule recurring tasks.                |
| **Key Configs**   | `completions`, `parallelism`, `restartPolicy`. | `schedule`, `jobTemplate`, `concurrencyPolicy`. |
| **Example**       | Database migrations, one-off backups.    | Log rotation, daily reporting.           |

### Conclusion

Jobs and CronJobs are essential tools in Kubernetes for batch processing and scheduled tasks. They’re flexible, scalable, and integrate seamlessly with Kubernetes infrastructure. Whether you’re running one-time jobs or recurring tasks, Kubernetes makes it easy to manage them efficiently.
