---
layout: post
title: "Cloudutsuk Platform: Lessons Learned"
date: 2026-10-11 00:40:00 +0530
categories: [projects, cloudutsuk-platform]
tags: [Projects, Cloudutsuk Platform, Lessons Learned, Troubleshooting]
description: "Every problem that cost real time while building the Cloudutsuk Platform on a DGX Spark: the symptom, the cause, the fix and what to do next time."
project: cloudutsuk-platform
project_lessons: true
image:
  path: /assets/img/projects/cloudutsuk-platform/lessons-learned.webp
  alt: "Cloudutsuk Platform: Lessons Learned - Projects hero image"
---

Building a platform on one machine from open-source parts means many small surprises: a resolver that
isn't the one you configured, a chart default meant for someone else's cluster, a token that can read
but not write. Each one cost an hour or more the first time. This post logs them as they happen, so they
cost nothing the second time.

<!-- more -->

{% include project-nav.html %}

## How this log works
{: #how-this-log-works }

- One entry per problem that took real time or would bite again: what was **seen**, the actual
  **cause**, the **fix** that went in, and the **lesson** to apply next time.
- Entries are added during the build, in the same change as the fix, and never rewritten later. The
  newest is first. Where a lesson changed a decision, it links to the matching
  [architecture decision record](/posts/projects/cloudutsuk-platform/architecture-decision-records/).
- The log feeds the retrospectives in Continuous Improvement (area 18) and the interview answers about
  what went wrong.

## Log
{: #log }

{% include project-lessons-log.html project="cloudutsuk-platform" %}

{% include project-nav.html %}
