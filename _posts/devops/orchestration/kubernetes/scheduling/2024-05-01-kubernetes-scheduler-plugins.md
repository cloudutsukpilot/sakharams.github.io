---
layout: post
title: Kubernetes - Scheduler Plugins
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
---

## Introduction

- Kubernetes scheduler uses a set of plugins to determine the scheduling of pods. 
- Below are few examples:

1. `PrioritySort`: 
- This plugin provides the logic to sort Pods in the scheduling queue based on their priority.

2. `NodeResourcesFit`: 
- This plugin checks if a node has enough resources to meet the resource requirements of the Pod.

3. `PodTopologySpread`: 
- This plugin helps to spread Pods evenly across different topology domains, such as regions, zones, nodes, and other user-defined topology domains.

4. `InterPodAffinity`: 
- This plugin implements rules that govern whether or not Pods should be placed in the same topological domain as other Pods they're related to based on labels.

5. `NodeUnschedulable`: 
- This plugin filters out nodes that have their .spec.unschedulable field set to true.

6. `TaintToleration`: 
- This plugin ensures that there is a match between the taints on a node and the tolerations declared by a Pod.

7. `NodeAffinity`: 
- This plugin filters nodes based on the node affinity scheduling preferences declared by Pods.

8. `VolumeBinding`: 
- This plugin checks if a node has the necessary volumes that a Pod requests, and can bind them if necessary.

9. `DefaultPreemption`: 
- This plugin selects a node where a Pod can run and preempts other Pods on the node if necessary.

10. `NodeResourcesBalancedAllocation`: 
- This plugin favors nodes that would obtain a more balanced resource usage if the Pod is scheduled there.

11. `NodeResourcesLeastAllocated`: 
- This plugin favors nodes with fewer allocated resources, promoting better resource utilization and spreading the load more evenly.

12. `DefaultBinder`: 
- This plugin binds a Pod to a Node. It is the final step in the scheduling process.