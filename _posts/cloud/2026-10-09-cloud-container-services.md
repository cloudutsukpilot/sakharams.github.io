---
layout: post
title: "Cloud Container Services: AWS vs Azure vs Google Cloud"
date: 2026-10-09 00:43:00 +0530
categories: [cloud]
tags: [Cloud, AWS, Azure, GCP, Containers, Kubernetes]
image: /assets/img/cloud/cloud-container-services.webp
description: "Managed Kubernetes, serverless containers, registries and OpenShift: what each container service is for and how EKS, AKS, GKE and friends compare."
---

You've got a Dockerfile and an image that works on your laptop. Now every cloud offers you at least four ways to
run it, and the choice you make on day one tends to stick for years. Pick Kubernetes too early and a three-person
team spends half its time on cluster upgrades. Pick something too simple and you rebuild the platform eighteen
months later. This post maps the container landscape on AWS, Azure and Google Cloud: what each kind of service is
for, where they overlap, and how to choose.

<!-- more -->

## What the container category covers

Containers package an application with its dependencies into an image that runs the same way everywhere. The
cloud container category is everything you need to **store those images and run them at scale**:

- **Orchestration.** Something has to decide which machine runs which container, restart failures, roll out
  new versions and scale replicas. Kubernetes is the industry standard, but not the only option.
- **Compute.** The machines underneath, either VMs you manage or serverless capacity the provider manages.
- **Registries.** Private, scanned, replicated storage for your images.
- **Networking and security glue.** Ingress, service-to-service networking, workload identity and policy.
  These are mostly covered in the [networking](/posts/cloud/cloud-networking-services/) and
  [security](/posts/cloud/cloud-security-services/) posts.

The key question isn't "which cloud?" but "how much platform do we want to own?" That leads to three tiers:
managed Kubernetes (you own a lot), simpler orchestrators and serverless containers (you own very little), and
the compute engines that sit underneath both.

## Managed Kubernetes

EKS, AKS and GKE all give you a conformant Kubernetes cluster where the provider runs the control plane (API
server, etcd, scheduler) and you run workloads on nodes. You get the whole Kubernetes ecosystem (Helm, operators,
service meshes, GitOps with Argo CD or Flux), and your manifests stay mostly portable across clouds.

What you also get is Kubernetes. Version upgrades roughly three times a year, add-on compatibility, node image
patching, network policy, ingress controllers, capacity planning. Managed doesn't mean maintenance-free. All three
providers have pushed hard on modes that take the node layer off your plate: GKE Autopilot, EKS Auto Mode and AKS
Automatic. For most new clusters I'd start there, and only drop to fully self-managed node pools when you need
something they don't support.

Kubernetes earns its complexity when you run many services, need the ecosystem (operators for databases, Kafka,
ML tooling), want the same platform on-premises and in the cloud, or have a platform team to own it. If none of
those are true, look at the next section first.

{% include cloud-topic-tabs.html cat="containers" topic="kubernetes" %}

There's a lot more to AKS specifically in the [AKS series](/posts/cloud/azure/containers/aks/aks/), and the
[ACI vs ACA vs AKS comparison](/posts/cloud/azure/containers/aci-vs-aca-vs-aks/) covers the Azure choice in detail.

## Simpler container hosting

Each provider also offers a way to run containers as long-lived services **without** exposing Kubernetes. You
describe the image, CPU and memory, scaling rules and ingress. The platform does the rest.

This is where I'd put most small and medium teams. Cloud Run in particular is hard to beat: push an image, get an
HTTPS endpoint that scales to zero. Azure Container Apps gets close, and adds Dapr and event-driven scaling via
KEDA. Amazon ECS takes a different approach. It's a full orchestrator, simpler than Kubernetes and deeply wired
into AWS, but you still think in clusters, services and task definitions.

> AWS closed App Runner to new customers in April 2026 and recommends **ECS Express Mode** as the replacement for
> the "just run my container" use case. If you're on App Runner today it keeps working, but don't start anything
> new on it.
{: .prompt-warning }

{% include cloud-topic-tabs.html cat="containers" topic="orchestration" %}

## Serverless container compute

This row is about the compute **underneath** an orchestrator. Instead of running a fleet of VMs (nodes) and
packing containers onto them, you ask for capacity per task or pod and the provider finds it.

The trade-off is control and price versus operational effort. Serverless compute removes node patching, scaling
and bin-packing, and it isolates each workload in its own micro-VM. In return, per-unit cost is usually higher than
a well-utilised node, some features aren't available (privileged containers, DaemonSets, GPUs on some options),
and startup can be slower. For spiky workloads and small teams the trade is usually worth it. For a large, steady
cluster run by people who know what they're doing, managed nodes are cheaper.

{% include cloud-topic-tabs.html cat="containers" topic="serverless" %}

## Container registries

Every container platform needs a private registry, and every cloud has a good one. Keep your registry in the same
region as your clusters (or replicate it there). Cross-region image pulls are slow and you pay egress for them.

The features worth caring about are vulnerability scanning on push, immutable tags, lifecycle policies to delete
old images (registries quietly grow to terabytes), replication for multi-region, and identity-based pulls so
clusters don't need stored credentials.

{% include cloud-topic-tabs.html cat="containers" topic="registry" %}

> Turn on tag immutability for production repositories. Without it, someone can push a new image as `v1.4.2` and
> your next deployment silently runs different code from what you tested.
{: .prompt-tip }

## Managed OpenShift

Red Hat OpenShift is Kubernetes plus an opinionated developer and security layer: built-in CI/CD, image builds,
a stricter default security model and a large operator catalogue. Enterprises that run OpenShift on-premises often
want the same experience in the cloud, and AWS and Azure both offer jointly supported managed versions.

{% include cloud-topic-tabs.html cat="containers" topic="openshift" %}

## How to choose

A quick heuristic that works for most teams:

| Situation | Start with |
|---|---|
| A handful of stateless HTTP services, small team | Cloud Run, Azure Container Apps, or ECS (Express Mode) on Fargate |
| Event-driven workers, jobs, scale-to-zero | Cloud Run jobs, Container Apps jobs, ECS tasks on Fargate |
| Dozens of services, platform team, need the ecosystem | GKE (Autopilot), AKS (Automatic), EKS (Auto Mode) |
| Already standardised on OpenShift | ROSA or Azure Red Hat OpenShift |
| One-off container, CI agent, quick test | Azure Container Instances, Cloud Run jobs, an ECS task |

Between providers, GKE is still the most refined Kubernetes experience, AKS has the cheapest entry point and the
best Entra ID story, and EKS has the deepest integration with the rest of AWS. Pick the cloud for other reasons,
then pick the tier inside it.

## Common pitfalls

- **Adopting Kubernetes for one app.** If you have three services and no platform engineers, the cluster
  becomes the product. Use serverless containers until you outgrow them.
- **Skipping upgrades.** All three providers retire Kubernetes versions on a fixed schedule. Fall too far
  behind and you're forced into a multi-version jump under pressure, or onto paid extended support.
- **No resource requests.** Without CPU and memory requests, the scheduler can't place pods sensibly and
  autoscalers make bad decisions. On GKE Autopilot, requests are also what you're billed for.
- **Long-lived credentials in pods.** Use workload identity (EKS Pod Identity, AKS Workload Identity, GKE
  Workload Identity Federation) instead of mounting access keys.
- **Registry sprawl.** Images in Docker Hub, three ECRs and someone's personal registry. Pick one per
  environment, replicate where needed, and block pulls from unknown registries with admission policy.

## Conclusion

Containers give you portability, but the platform you run them on is the real decision. Start with the simplest
tier that meets your needs, which for most teams is Cloud Run, Azure Container Apps or ECS on Fargate. Move to
managed Kubernetes when the number of services, the need for its ecosystem, or a hybrid requirement justifies it.
As a next step, take one service and deploy it to the serverless option on your cloud. If that's painless, you
may not need a cluster yet. The full side-by-side list is in the [Containers comparison](/cloud/#containers).

## References

- [Amazon EKS documentation](https://docs.aws.amazon.com/eks/)
- [Amazon ECS documentation](https://docs.aws.amazon.com/ecs/)
- [AWS App Runner availability change](https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html)
- [Azure Kubernetes Service documentation](https://learn.microsoft.com/azure/aks/)
- [Azure Container Apps documentation](https://learn.microsoft.com/azure/container-apps/)
- [GKE documentation](https://cloud.google.com/kubernetes-engine/docs)
- [Cloud Run documentation](https://cloud.google.com/run/docs)
- [Artifact Registry documentation](https://cloud.google.com/artifact-registry/docs)
