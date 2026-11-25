---
layout: page
title: DevSecOps
icon: fas fa-cloud
order: 6
---

{% comment %}
  Topic cards come from _data/devsecops_topics.yml (groups, categories, items), rendered by
  _includes/topic-grid.html with the Cloud tab's styles.
{% endcomment %}

## Introduction

DevSecOps (development, security and operations) builds security into every stage of delivery instead of
checking it at the end. Code is scanned as it is written, dependencies and infrastructure as code are
checked in the pipeline, running applications are tested, and the cloud they run on is watched for
misconfigurations and threats.

Read more in the [DevSecOps overview]({% post_url devsecops/2021-01-01-devsecops %}).

## Topics and tools

{% include topic-grid.html data="devsecops_topics" %}
