---
layout: post
title: Kubernetes - Extension Points
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
image: /assets/img/devops/orchestration/kubernetes/kubernetes-posts.png
description: Understand the different plugins categories.
---

- Kubernetes scheduler uses a set of plugins to determine the scheduling of pods.
- These plugins are categorized into several stages know as extension points:

1. `QueueSort`
    - Provides the logic to sort pods in the scheduling queue.
    - Example: PrioritySort

2. `PreFilter`
    - These plugins are used to pre-process or check information about the pod or the cluster before filtering.
    - Example: NodeResourcesFit, PodTopologySpread, InterPodAffinity

3. `Filter`
    - These plugins are used to filter out nodes that cannot run the Pod.
    - Examples: NodeUnschedulable, TaintToleration, NodeAffinity, NodeResourcesFit, VolumeBinding

4. `PostFilter`
    - These plugins are called after Filter phase, but only when no feasible nodes were found for the pod.
    - Example: DefaultPreemption

5. `PreScore`
    - These plugins are used to perform any work required before scoring.
    - Example: InterPodAffinity, PodTopologySpread, TaintToleration

6. `Score`
    - These plugins provide a score to each node that has passed the filtering phase to prioritize them for scheduling.
    - Examples: NodeAffinity, InterPodAffinity, NodeResourcesBalancedAllocation, NodeResourcesLeastAllocated, VolumeBinding, PodTopologySpread

7. `Reserve`
    - This is an informational extension point that happens once the scheduler has assumed a pod will be scheduled to a node, useful to trigger pre-emptive actions.
    - Example: VolumeBinding

8. `Permit`
    - These plugins can prevent or delay the binding of a Pod.
    - Examples: VolumeBinding, PodTopologySpread

9. `PreBind`
    - These plugins perform any work required before a pod is bound.
    - Example: VolumeBinding

10. `Bind`
    - These plugins bind a pod to a Node. Bind plugins are called in order and once one has done the binding, the remaining plugins are skipped.
    - Example: DefaultBinder

11. `PostBind`
    - This is an informational extension point that is called after a pod has been bound.
    - No default plugins.

12. `Unreserve`
    - This is an informational extension point that is called if a pod was reserved and then rejected in a later phase.
    - Example: VolumeBinding
