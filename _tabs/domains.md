---
layout: page
title: Domains
icon: fas fa-briefcase
order: 8
---

{% comment %}
  Domain cards come from _data/domains.yml; each active domain's learning path is a page under
  pages/domains/ that renders _data/domain_paths/<id>.yml with _includes/domain-path.html.
{% endcomment %}

Technology only makes sense once you know the business it runs. Each domain here is a learning path through
one industry: who the players are, how work and money move between them, the regulations they follow, and
the data standards and systems engineers build on. Topics run from basic to advanced, so you can start at
the top and stop where your work needs you to.

{% include domains-catalog.html %}
