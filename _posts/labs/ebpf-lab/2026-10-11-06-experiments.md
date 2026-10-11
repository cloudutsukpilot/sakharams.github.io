---
layout: post
title: "eBPF Lab: Experiments"
date: 2026-10-11 00:06:00 +0530
categories: [labs, ebpf-lab]
tags: [Labs, eBPF Lab, eBPF, Cilium, Hubble, Tetragon, Falco, OpenTelemetry, Kubernetes]
description: "Perform an action, predict the signal, then check the dashboard and explain what changed (eBPF Lab lab)."
lab: ebpf-lab
lab_part: 6
---

<!-- SCAFFOLD: intro. 2-4 sentences: what this part of the eBPF Lab lab does and what the reader will have (or see) at the end of it. Address the reader as 'you'. -->

<!-- more -->

{% include lab-nav.html %}

## How to Run an Experiment
{: #how-to-run-an-experiment }

<!-- SCAFFOLD: How to Run an Experiment. The loop: read the goal, predict, run the action, wait, look, explain. Mention the `make exp-*` targets and that every screenshot was captured from a real run (give the capture date from the card). Unknown facts become a TODO callout, never a guess. -->

## Experiment 1: See every flow without kube-proxy
{: #exp-cilium-cni }

{% include lab-experiment.html id="cilium-cni" %}

### What the screenshots show

<!-- SCAFFOLD: exp cilium-cni observed. Look at the captured images and describe what actually changed, panel by panel, with the real numbers/IDs visible in them. Compare with the prediction. -->

### Why it happens

<!-- SCAFFOLD: exp cilium-cni explanation. Trace the cause through the stack (which component emitted what, how it travelled, why the delay). Link the part that set it up. -->

## Experiment 2: Drop a connection by identity
{: #exp-identity-policy }

{% include lab-experiment.html id="identity-policy" %}

### What the screenshots show

<!-- SCAFFOLD: exp identity-policy observed. Look at the captured images and describe what actually changed, panel by panel, with the real numbers/IDs visible in them. Compare with the prediction. -->

### Why it happens

<!-- SCAFFOLD: exp identity-policy explanation. Trace the cause through the stack (which component emitted what, how it travelled, why the delay). Link the part that set it up. -->

## Experiment 3: RED metrics from an app with no instrumentation
{: #exp-obi-red-metrics }

{% include lab-experiment.html id="obi-red-metrics" %}

### What the screenshots show

<!-- SCAFFOLD: exp obi-red-metrics observed. Look at the captured images and describe what actually changed, panel by panel, with the real numbers/IDs visible in them. Compare with the prediction. -->

### Why it happens

<!-- SCAFFOLD: exp obi-red-metrics explanation. Trace the cause through the stack (which component emitted what, how it travelled, why the delay). Link the part that set it up. -->

## Experiment 4: A trace across web, api and redis
{: #exp-obi-traces }

{% include lab-experiment.html id="obi-traces" %}

### What the screenshots show

<!-- SCAFFOLD: exp obi-traces observed. Look at the captured images and describe what actually changed, panel by panel, with the real numbers/IDs visible in them. Compare with the prediction. -->

### Why it happens

<!-- SCAFFOLD: exp obi-traces explanation. Trace the cause through the stack (which component emitted what, how it travelled, why the delay). Link the part that set it up. -->

## Experiment 5: Catch a shell in a container
{: #exp-falco-shell }

{% include lab-experiment.html id="falco-shell" %}

### What the screenshots show

<!-- SCAFFOLD: exp falco-shell observed. Look at the captured images and describe what actually changed, panel by panel, with the real numbers/IDs visible in them. Compare with the prediction. -->

### Why it happens

<!-- SCAFFOLD: exp falco-shell explanation. Trace the cause through the stack (which component emitted what, how it travelled, why the delay). Link the part that set it up. -->

## Experiment 6: Kill a download before it starts
{: #exp-tetragon-enforce }

{% include lab-experiment.html id="tetragon-enforce" %}

### What the screenshots show

<!-- SCAFFOLD: exp tetragon-enforce observed. Look at the captured images and describe what actually changed, panel by panel, with the real numbers/IDs visible in them. Compare with the prediction. -->

### Why it happens

<!-- SCAFFOLD: exp tetragon-enforce explanation. Trace the cause through the stack (which component emitted what, how it travelled, why the delay). Link the part that set it up. -->

## Experiment 7: Delete the cluster and keep the data
{: #exp-rebuild-persists }

{% include lab-experiment.html id="rebuild-persists" %}

### What the screenshots show

<!-- SCAFFOLD: exp rebuild-persists observed. Look at the captured images and describe what actually changed, panel by panel, with the real numbers/IDs visible in them. Compare with the prediction. -->

### Why it happens

<!-- SCAFFOLD: exp rebuild-persists explanation. Trace the cause through the stack (which component emitted what, how it travelled, why the delay). Link the part that set it up. -->

## Check Your Understanding
{: #check-your-understanding }

<!-- SCAFFOLD: 3-5 questions about this part, each as <details markdown="1"><summary>Question</summary> answer </details>. -->

{% include lab-nav.html %}
