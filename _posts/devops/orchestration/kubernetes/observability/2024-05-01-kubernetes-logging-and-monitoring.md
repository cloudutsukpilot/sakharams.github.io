---
layout: post
title: Kubernetes - Logging and Monitoring
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
---

## Introduction 

- Monitoring is a crucial aspect of maintaining the reliability, availability, and performance of your Kubernetes clusters. 
- Below is a brief overview of the few monitoring solutions::

1. `cAdvisor`: 
- cAdvisor (Container Advisor) is a built-in component of Kubelet that provides metrics about CPU, memory, network usage, and filesystem information for containers in a pod. 
- These metrics are exposed via the Kubelet API and are available to the Metrics Server or other monitoring solutions.

2. `Metrics Server`: 
- The Metrics Server is a in-memory scalable, efficient source of container resource metrics for Kubernetes built-in autoscaling pipelines. 
- It collects resource metrics from Kubelet and exposes them in Kubernetes API server through Metrics API. 
- Metrics Server is not meant for non-autoscaling purposes. For example, don't use it to forward metrics to monitoring solutions, or as a source of monitoring solution metrics.
- Example: `kubectl top`

3. `Prometheus`: 
- An open-source monitoring system with a dimensional data model, flexible query language, efficient time series database and modern alerting approach.

4. `Grafana`: 
- An open-source platform for time series analytics. It can visualize the data stored in Prometheus and alert on specific metrics.

5. `Datadog`: 
- A commercial monitoring service that provides a comprehensive view of the entire stack, including Kubernetes.

6. `New Relic`: 
- A commercial application performance monitoring tool that also provides Kubernetes monitoring.

6. `Elastic Stack (ELK Stack)`: 
- Elasticsearch for search, Logstash for centralized logging and Kibana for visualization. 
- It can be used to monitor Kubernetes as well.

7. `Dynatrace`: 
- A commercial software intelligence platform that provides AIOps, cloud infrastructure monitoring, and digital experience management, including Kubernetes monitoring.

8. `Sysdig`: 
- A commercial tool that provides unified security, monitoring, and forensics for containers and microservices.

9. `Splunk`: 
- A commercial tool used for searching, monitoring, and examining machine-generated big data.

9. `Jaeger`: 
- An open-source, end-to-end distributed tracing system for cloud-native apps.
