---
layout: post
title: DORA Metrics
categories: [devops]
tags: [DevOps]
---

## Introduction

- DevOps Research and Assessment (DORA) provides a standard set of DevOps metrics used for evaluating process performance and maturity. 
- These metrics provide information about how quickly DevOps can respond to changes, the average time to deploy code, the frequency of iterations, and insight into failures.

### DORA metrics?

- DORA metrics for DevOps teams focus on four critical measures:

1. `Change Lead Time`
    - This metric measures the time it takes for a code commit or change to be successfully deployed to production. It reflects the efficiency of your delivery pipeline.
2. `Deployment Frequency`
    - This metric measures how often application changes are deployed to production. Higher deployment frequency indicates a more efficient and responsive delivery process.
3. `Change Failure Rate`
    - This metric measures the percentage of deployments that cause failures in production, requiring hotfixes or rollbacks. A lower change failure rate indicates a more reliable delivery process.
4. `Mean Time To Restore`
    - This metric measures the time it takes to recover from a failed deployment. A lower recovery time indicates a more resilient and responsive system.

- You can set a baseline for your application's current perofrmance using [Dora Quick Check](https://dora.dev/quickcheck/)

### Benefits

- DORA metrics are crucial in helping DevOps teams:

1. Provide realistic response estimates
2. Improve work planning
3. Identify areas for improvement
4. Build consensus for technical and resource investments