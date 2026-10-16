---
layout: page
title: Projects
icon: fas fa-project-diagram
order: 10
---

{% comment %}
  Tiles grouped by category with a cloud filter. Playbooks come from _data/projects/*.yml (created by
  the cloudutsuk-project skill; set `category` and `clouds` on each card). Categories, cloud filters and
  projects that aren't playbooks live in _data/project_catalog.yml.
{% endcomment %}
{% include projects-catalog.html %}
