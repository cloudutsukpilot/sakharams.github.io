---
layout: post
title: "RAG on Cloud: Lessons Learned"
date: 2026-11-18 00:40:00 +0530
categories: [projects, rag-on-cloud]
tags: [Projects, RAG on Cloud, Lessons Learned, Troubleshooting]
description: "What went wrong while building RAG on Cloud, starting with the Azure stack: the symptom, the cause, the fix and what to check next time."
project: rag-on-cloud
project_lessons: true
image:
  path: /assets/img/projects/rag-on-cloud/lessons-learned.webp
  alt: "RAG on Cloud: Lessons Learned - Projects hero image"
---

The first apply of the Azure stack is a good example of why this log exists. The plan was green, every gate passed,
and the apply still stopped two resources short, once on a policy the plan can't see and once on a role that had
quietly been renamed. Each entry here records one such problem as it's fixed, so it costs nothing the second time.

<!-- more -->

{% include project-nav.html %}

## How this log works
{: #how-this-log-works }

- One entry per problem that took real time or would bite again: what was **seen**, the actual **cause**, the
  **fix** that went in, and the **lesson** to apply next time.
- Entries are added during the build, in the same change as the fix, and never rewritten later. The newest is
  first. Where a lesson changed a decision, it links to the matching
  [architecture decision record](/posts/projects/rag-on-cloud/architecture-decision-records/).
- The step names match the [roadmap](/posts/projects/rag-on-cloud/03-product-planning/#phase-0-steps), so you can
  see where in the build each one happened.

## Log
{: #log }

{% include project-lessons-log.html project="rag-on-cloud" %}

{% include project-nav.html %}
