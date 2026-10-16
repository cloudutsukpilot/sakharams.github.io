---
layout: post
title: "Cloudutsuk Platform: Vision and Business Context"
date: 2026-10-10 00:01:00 +0530
categories: [projects, cloudutsuk-platform]
tags: [Projects, Cloudutsuk Platform, Vision, Business]
description: "Why I'm building a self-hosted control plane on a DGX Spark for every Cloudutsuk lab, cloud resource and its cost, and how I'll know it worked."
project: cloudutsuk-platform
project_step: 1
image:
  path: /assets/img/projects/cloudutsuk-platform/01-vision-and-business-context.webp
  alt: "Cloudutsuk Platform: Vision and Business Context - Projects hero image"
---

Every lab on this blog leaves something running somewhere: a k3d cluster on the DGX, a WireGuard VM in
Azure, a private endpoint with its own DNS zone. Today the only inventory is my memory, and the only cost
report is the monthly bill. The Cloudutsuk Platform is my answer: one login, one page that shows what's
running and what it costs, and a button to deploy or destroy any lab. On top of that, a monitoring
cluster watches everything, and an assistant knows my repos as well as I do.

> **Living playbook.** This project is being built in phases, and these posts are written before the
> code. I'll update every post as each phase lands, replacing TODOs with what actually happened. The
> status on the [project index](/tags/cloudutsuk-platform/) shows where it stands.
{: .prompt-info }

<!-- more -->

{% include project-nav.html %}

## Business problem and opportunity
{: #business-problem-and-opportunity }

The "business" here is a personal lab and a blog, but the problem is the same one platform teams solve
at work. It's real sprawl across four places:

- **Local:** k3d clusters and containers on the DGX Spark.
- **Azure, AWS and GCP:** resources created from the `infra-*` repos and by the labs.
- **Knowledge:** blog posts, lab cards and repos that say how all of it fits together.
- **Signals:** each lab ships its own Grafana, so there's no single place to see whether anything is broken.

The cost of this is easy to name. A forgotten cloud lab keeps billing. A broken lab cluster goes
unnoticed until I open it. Answering "where did I configure that?" means grepping six repos.

The opportunity is that most of the pieces already exist:
- a Backstage app
- an SRE agent with Kubernetes diagnosis and Slack approvals
- a Terragrunt module library ([Y-IaC](/tags/y-iac/))
- labs that already follow a `make up` / `make down` contract
- a DGX Spark with enough GPU to serve a decent model locally

The project mostly wires these together. As a bonus, it doubles as a reference platform I can write
about.

## Goals, objectives, and expected outcomes
{: #goals-objectives-and-expected-outcomes }

| Goal | Objective | Outcome I'm after |
|---|---|---|
| See everything | Inventory of DGX, Azure, AWS and GCP resources in one portal, refreshed every 6 hours or on demand | No surprise resources |
| Know the cost | Cost per resource, grouped by lab and repo | No surprise bills; each lab shows its real running cost |
| Labs on demand | Deploy or destroy any blog lab with one click | A lab goes from blog post to running in minutes, and away again just as fast |
| One place to watch | A central k3d monitoring cluster receives OTEL from every lab cluster, with alerts | A broken lab pages me; I don't find it by accident |
| Ask, don't grep | A chatbot answers questions from my repos and live data, on a local model | Answers cite the file they came from |
| Self-healing help | An agent investigates every alert and proposes a fix for approval | The first diagnosis is done before I open a terminal |
| Zero hosting cost | Everything runs on the DGX; public access through the Cloudflare free plan | $0 a month for the platform itself |

## Stakeholders, sponsors, and decision-makers
{: #stakeholders-sponsors-and-decision-makers }

This is a one-person project, so the usual stakeholder map collapses. I'm the sponsor, architect,
developer, operator and only user. That still leaves two things worth writing down.

First, **decisions need a record even with one decider.** Six months from now I won't remember why the
LLM runs outside k3d or why runners only serve private repos. Every significant decision gets an ADR
(see [Architectural decision records](/posts/projects/cloudutsuk-platform/05-technical-architecture/#architectural-decision-records)).

Second, **blog readers are an indirect audience.** They never log in, but they read this playbook and the
labs the platform deploys. Anything published has to be safe to make public: no tenant IDs, tunnel IDs or
allowlists.

## Target users and personas
{: #target-users-and-personas }

| Persona | Who | What they need from the platform |
|---|---|---|
| The operator | Me, at the desk or on my phone | What's running, what it costs, is anything broken, and a way to fix it |
| The lab author | Me, writing a new lab | A cluster that's already wired into monitoring, and a place for the lab to appear with Deploy/Destroy |
| The learner | A blog reader | Clear playbook posts and labs that describe a real, working platform. They don't use the portal |
| The on-call agent | The SRE agent | Read access to clusters, logs and runbooks, plus a human to approve changes |

The design is for a single human user. Multi-user features such as teams, roles or per-user quotas are
out of scope, though SSO means another person could be added later.

## Success metrics and business KPIs
{: #success-metrics-and-business-kpis }

These are the measures I'll track once the platform runs. The targets are proposals until the first
month of data:

| Metric | How it's measured | Proposed target |
|---|---|---|
| Hosting cost of the platform | Cloudflare + GitHub bills | $0 |
| Inventory coverage | Resources in the portal vs. each provider's console | 100% of tagged resources |
| Lab deploy time | Lab runner job duration, click to Healthy | TODO after the first labs are measured |
| Forgotten cloud resources | Cloud labs past their TTL | 0 |
| Alert to diagnosis | Alertmanager timestamp to RCA posted in Slack | Under 5 minutes |
| Chat answer quality | Share of answers with a correct citation in a monthly spot check | TODO |
| Portal availability | SLO burn-rate dashboard in `mon` | 99% monthly |

> **TODO:** What do you spend on cloud labs per month today? That baseline is what "no surprise bills"
> gets measured against.
{: .prompt-warning }

## Scope, assumptions, constraints, and dependencies
{: #scope-assumptions-constraints-and-dependencies }

**In scope (v1):**
- inventory and cost for the DGX, Azure, AWS and GCP
- the labs catalog with deploy and destroy
- central monitoring and alerts
- local CI/CD with GitOps
- a RAG chatbot on a local model
- the alert-driven agent
- this playbook and its ADRs

**Out of scope:**
- multi-user features
- high availability across hosts
- running anything paid in the cloud for the platform itself

**Constraints:**
- **No hosting spend.** GitHub Pages stays static, and only the free Cloudflare plan is used.
- **One machine.** The DGX Spark has about 121 GB of unified memory shared with the GPU.
- **Public posts.** Everything on the blog must be safe to publish.

**Assumptions:**
- cloudutsuk.com's DNS can move from GoDaddy to Cloudflare without breaking GitHub Pages. *Confirmed
  2026-10-11: moved, every record matched, the blog kept serving over HTTPS.*
- vLLM can use the GB10 GPU, inside k3d or as a plain container.

**Dependencies:**
- [Y-IaC](/tags/y-iac/) (`terragrunt_shared_module`) for the cluster and tag conventions.
- `infra-github` to create the new repos.
- The existing `self-service-portal` and `sre-agent` repos.
- The lab cards in this blog, which become the lab registry.

## Checklist
{: #checklist }

- [ ] Goals and the v1 scope agreed (this post), and out-of-scope items written down
- [ ] Baseline monthly cloud-lab spend recorded, so the cost goal can be measured
- [ ] Proposed metric targets confirmed or changed after the first month of data
- [x] DNS move from GoDaddy to Cloudflare confirmed as acceptable for the blog
- [ ] Every public post checked for IDs, allowlists and private URLs before publishing
- [ ] This post revisited at the end of each phase

{% include project-nav.html %}
