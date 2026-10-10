---
layout: page
title: Cloud
icon: fas fa-cloud
order: 4
---

## Introduction to Cloud Computing

Cloud computing means renting compute, storage, networking and higher-level services from a provider over
the internet instead of buying and running the hardware yourself. You provision what you need in minutes,
scale it up or down with demand, and pay only for what you use. The three largest public clouds are
[Amazon Web Services (AWS)](/posts/cloud/aws/aws/), [Microsoft Azure](/posts/cloud/azure/microsoft-azure/) and
[Google Cloud Platform (GCP)](/posts/cloud/gcp/gcp/). Each offers several hundred services, and most of
them map closely onto one another.

**Service models.** Who manages what:

- `IaaS` (Infrastructure as a Service): virtual machines, disks and networks. You manage the OS and everything above it.
- `PaaS` (Platform as a Service): a managed runtime for your code or data (app platforms, managed databases). The provider runs the OS and middleware.
- `SaaS` (Software as a Service): a finished application delivered over the internet on a subscription.
- `Serverless / FaaS`: run functions or containers on demand with no servers to manage, billed per request or per second.

**Deployment models.** Where it runs:

- `Public cloud`: shared provider infrastructure (AWS, Azure, GCP).
- `Private cloud`: infrastructure dedicated to one organisation, on-premises or hosted.
- `Hybrid cloud`: public and private connected, with workloads and data moving between them.
- `Multi-cloud`: services from more than one provider, for best-of-breed choices or to reduce lock-in.

**Why teams adopt it:** elastic scalability, little up-front capex, pay-as-you-go pricing, less hardware
maintenance, built-in redundancy across regions and zones, and managed security controls. Under the
shared responsibility model, the provider secures the cloud itself and you secure what you put in it.

## Service Categories

Every provider groups its catalogue into the same broad categories:

| Category | What it covers |
|---|---|
{% for cat in site.data.cloud_compare.categories %}| [{{ cat.title }}](#{{ cat.id }}) | {{ cat.summary }} |
{% endfor %}

## Compare Services by Category

Each section below lists the main services from AWS, Azure and Google Cloud for that category, side by
side. Click a tile to open its article.

{% include cloud-compare.html %}

## Learn More

- [Introduction to Cloud](/posts/cloud/cloud/)
- [Microsoft Azure](/posts/cloud/azure/microsoft-azure/)
- [Amazon Web Services](/posts/cloud/aws/aws/)
- [Google Cloud Platform](/posts/cloud/gcp/gcp/)
- [Cloud Interview Questions](/posts/cloud/cloud-interview-questions/)
