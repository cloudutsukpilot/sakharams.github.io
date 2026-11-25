---
layout: page
title: About Me
icon: fas fa-info-circle
order: 12
---

{% comment %}
  Portfolio-style About page. Styles: `.ap-*` in assets/css/jekyll-theme-chirpy.scss (Chirpy theme
  variables, so it follows light/dark mode). The stack table is _data/about_stack.yml; featured work is
  read from _data/projects/*.yml and _data/labs/*.yml, so new playbooks and labs show up here on their own.
  Career facts mirror _tabs/professional-journey.md. Update both together.
{% endcomment %}

<section class="ap-hero" aria-label="Introduction">
  <span class="ap-watermark" aria-hidden="true">Sakharam</span>
  <div class="ap-hero-text">
    <p class="ap-eyebrow">Cloud &amp; Platform Architect <span>·</span> Platform Engineering <span>·</span> AI</p>
    <p class="ap-name">Sakharam<span class="ap-dot">.</span></p>
    <p class="ap-tagline">I build <strong>platforms engineers want to use</strong>, and <strong>AI that is safe to run in production</strong>.</p>
    <p class="ap-lead">15+ years across Azure, AWS and GCP, from Exchange and SQL Server to platform engineering, DevSecOps, SRE and agentic AI. I'm currently Principal Platform Engineer at Evolent in Pune, India.</p>
    <div class="ap-cta">
      <a class="ap-btn ap-btn-primary" href="{{ '/projects/' | relative_url }}"><i class="fas fa-project-diagram" aria-hidden="true"></i> See my work</a>
      <a class="ap-btn" href="https://www.linkedin.com/in/sakharamshinde/" target="_blank" rel="noopener"><i class="fab fa-linkedin" aria-hidden="true"></i> Let's connect</a>
      <a class="ap-btn" href="{{ '/professional-journey/' | relative_url }}"><i class="fas fa-route" aria-hidden="true"></i> Full journey</a>
    </div>
  </div>
  <div class="ap-hero-photo">
    <img src="{{ site.avatar | relative_url }}" alt="Sakharam Shinde" width="220" height="220" />
    <div class="ap-now">
      <span class="ap-pulse" aria-hidden="true"></span>
      <span><strong>Now</strong><br />Principal Platform Engineer · Evolent</span>
    </div>
  </div>
</section>

<ul class="ap-stats" aria-label="At a glance">
  <li><strong>15+</strong><span>years in the field</span></li>
  <li><strong>3</strong><span>clouds: Azure, AWS, GCP</span></li>
  <li><strong>175</strong><span>Terraform modules on a shared IaC platform</span></li>
  <li><strong>{{ site.data.about_certifications | size }}</strong><span>certifications</span></li>
</ul>

## What I do

<div class="ap-cards">
  <div class="ap-card">
    <i class="fas fa-layer-group" aria-hidden="true"></i>
    <h3>Platform engineering</h3>
    <p>GitHub Enterprise standards, reusable CI/CD, Terraform and Terragrunt platforms, and a Backstage developer portal, so teams get self-service with guardrails built in.</p>
  </div>
  <div class="ap-card">
    <i class="fas fa-shield-alt" aria-hidden="true"></i>
    <h3>DevSecOps &amp; compliance</h3>
    <p>GHAS, Wiz, SonarQube and CIS-hardened golden images, plus delivery work for FedRAMP, SOC, PCI DSS and HIPAA.</p>
  </div>
  <div class="ap-card">
    <i class="fas fa-heartbeat" aria-hidden="true"></i>
    <h3>SRE &amp; observability</h3>
    <p>SLIs and SLOs, incident response, DORA metrics with Apache DevLake, and Prometheus, Grafana and OpenTelemetry stacks that show what is actually happening.</p>
  </div>
  <div class="ap-card">
    <i class="fas fa-robot" aria-hidden="true"></i>
    <h3>Agentic AI</h3>
    <p>AI products with deterministic safety gates and humans in the loop, such as an agentic SQL incident responder and AI-generated work summaries. I also lead AI enablement across IT.</p>
  </div>
  <div class="ap-card">
    <i class="fas fa-users" aria-hidden="true"></i>
    <h3>People</h3>
    <p>I've hired and coached a team of eight DevOps engineers, run the DevOps Learning Series and started an internship program. Most of the job is people.</p>
  </div>
  <div class="ap-card">
    <i class="fas fa-pen-nib" aria-hidden="true"></i>
    <h3>Writing &amp; labs</h3>
    <p>This blog is where I learn in public: hands-on labs with real screenshots, project playbooks and notes on Cloud, DevOps, Security and AI.</p>
  </div>
</div>

## The periodic table of my stack

<p class="ap-hint">Filter by group, or hover or tap a tile to see where I use it.</p>

<div class="ap-ptable" data-ptable>
  <div class="ap-legend" role="toolbar" aria-label="Filter the stack by group">
    <button type="button" class="active" data-group="all">All</button>
    {%- for g in site.data.about_stack.groups %}
    <button type="button" data-group="{{ g.id }}" style="--el: {{ g.color }}">{{ g.name }}</button>
    {%- endfor %}
  </div>
  <ol class="ap-elements">
    {%- assign n = 0 -%}
    {%- for g in site.data.about_stack.groups -%}
      {%- for e in g.items -%}
        {%- assign n = n | plus: 1 %}
    <li class="ap-el" tabindex="0" data-group="{{ g.id }}" data-note="{{ e.note | escape }}" data-name="{{ e.name | escape }}" style="--el: {{ g.color }}">
      <span class="ap-el-num">{{ n }}</span>
      <span class="ap-el-sym">{{ e.sym }}</span>
      <span class="ap-el-name">{{ e.name }}</span>
    </li>
      {%- endfor -%}
    {%- endfor %}
  </ol>
  <p class="ap-el-detail" aria-live="polite"><strong>{{ n }} elements.</strong> Pick one to see how I use it.</p>
</div>

## Featured work

<div class="ap-work">
  {%- for entry in site.data.projects -%}
    {%- assign slug = entry[0] -%}{%- assign p = entry[1] -%}
    {%- if p.hidden != true and p.status != "Planning" %}
  <a class="ap-work-item" href="{{ '/tags/' | append: slug | append: '/' | relative_url }}">
    <span class="ap-work-kind"><i class="fas fa-book-open" aria-hidden="true"></i> Playbook · {{ p.status }}</span>
    <strong>{{ p.name }}</strong>
    <span>{{ p.summary | strip_html | truncate: 150 }}</span>
  </a>
    {%- endif -%}
  {%- endfor -%}
  {%- for entry in site.data.labs -%}
    {%- assign slug = entry[0] -%}{%- assign p = entry[1] %}
  <a class="ap-work-item" href="{{ '/tags/' | append: slug | append: '/' | relative_url }}">
    <span class="ap-work-kind"><i class="fas fa-flask" aria-hidden="true"></i> Hands-on lab</span>
    <strong>{{ p.name }}</strong>
    <span>{{ p.summary | strip_html | truncate: 150 }}</span>
  </a>
  {%- endfor %}
</div>

## Career at a glance

<ol class="ap-career">
  <li class="current"><span class="ap-career-when">2024 to now</span><strong>Evolent</strong><span>Principal Platform Engineer, previously Director and Principal DevOps Engineer</span></li>
  <li><span class="ap-career-when">2023 to 2024</span><strong>Veritas Technologies</strong><span>Principal SRE</span></li>
  <li><span class="ap-career-when">2019 to 2023</span><strong>Xoriant Solutions</strong><span>Senior Technical Lead</span></li>
  <li><span class="ap-career-when">2017 to 2019</span><strong>SS&amp;C Technologies</strong><span>Manager</span></li>
  <li><span class="ap-career-when">2017</span><strong>Datavail Infotech</strong><span>Senior Database Administrator</span></li>
  <li><span class="ap-career-when">2011 to 2017</span><strong>Wipro</strong><span>SQL Server Technical Lead &amp; Trainer, Exchange / Office 365 Consultant</span></li>
</ol>

<p>Role-by-role details, projects and responsibilities are on <a href="{{ '/professional-journey/' | relative_url }}">Professional Journey</a>.</p>

## Certifications

<div class="ap-certs">
  {%- for c in site.data.about_certifications %}
  <figure>
    <img src="{{ c.img | relative_url }}" alt="{{ c.name }}" loading="lazy" />
    <figcaption>{{ c.name }}</figcaption>
  </figure>
  {%- endfor %}
</div>

## Recognition &amp; community

<ul class="ap-chips">
  <li><strong>1st prize</strong> Xoriant Hackathon 2021, Closed-Loop Incident Management</li>
  <li><a href="https://www.linkedin.com/feed/update/urn:li:activity:7112419458870095872/" target="_blank" rel="noopener"><strong>Xor Super Squad</strong></a> Xoriant · 2023</li>
  <li><strong>Ninja</strong> Xoriant · 2023</li>
  <li><strong>Titan Award</strong> Xoriant · 2022</li>
  <li><strong>Innovate Idea</strong> Xoriant · 2020</li>
  <li><strong>Star Performer</strong> Xoriant · 2019</li>
  <li><strong>Ace It Award</strong> SS&amp;C · 2018</li>
  <li><a href="https://www.dataplatformgeeks.com/sakharam-shinde/" target="_blank" rel="noopener"><strong>Regional Mentor &amp; Speaker</strong></a> DataPlatformGeeks, Mumbai</li>
  <li><a href="https://www.sqlservergeeks.com/data-platform-day-mumbai-chennai-november-24-2018-resources-pics/" target="_blank" rel="noopener"><strong>Speaker</strong></a> SQL Server Query Store, Data Platform Day 2018</li>
</ul>

## Away from the keyboard

When I'm not at a keyboard, I go on day trips by bicycle to enjoy the weather and stay fit. My longest ride so far is 80 km.

<section class="ap-connect">
  <p class="ap-name ap-name-sm">Let's build something<span class="ap-dot">.</span></p>
  <p>Open to conversations about platform engineering, DevSecOps, SRE and agentic AI.</p>
  <div class="ap-cta">
    <a class="ap-btn ap-btn-primary" href="https://www.linkedin.com/in/sakharamshinde/" target="_blank" rel="noopener"><i class="fab fa-linkedin" aria-hidden="true"></i> LinkedIn</a>
    <a class="ap-btn" href="https://github.com/{{ site.github.username }}" target="_blank" rel="noopener"><i class="fab fa-github" aria-hidden="true"></i> GitHub</a>
    <a class="ap-btn" href="{{ '/labs/' | relative_url }}"><i class="fas fa-flask" aria-hidden="true"></i> Labs</a>
  </div>
</section>

<script>
  (function () {
    var root = document.querySelector('[data-ptable]');
    if (!root) return;
    var buttons = root.querySelectorAll('.ap-legend button');
    var els = root.querySelectorAll('.ap-el');
    var detail = root.querySelector('.ap-el-detail');
    var initial = detail.innerHTML;
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        var g = b.getAttribute('data-group');
        buttons.forEach(function (x) { x.classList.toggle('active', x === b); });
        els.forEach(function (el) {
          el.classList.toggle('dim', g !== 'all' && el.getAttribute('data-group') !== g);
        });
      });
    });
    function show(el) {
      var group = root.querySelector('.ap-legend button[data-group="' + el.getAttribute('data-group') + '"]');
      detail.textContent = '';
      var s = document.createElement('strong');
      s.textContent = el.getAttribute('data-name') + (group ? ' · ' + group.textContent : '');
      detail.appendChild(s);
      detail.appendChild(document.createTextNode(' ' + el.getAttribute('data-note')));
    }
    els.forEach(function (el) {
      el.addEventListener('mouseenter', function () { show(el); });
      el.addEventListener('focus', function () { show(el); });
      el.addEventListener('click', function () { show(el); });
    });
    root.querySelector('.ap-elements').addEventListener('mouseleave', function () {
      if (!root.contains(document.activeElement) || !document.activeElement.classList.contains('ap-el')) detail.innerHTML = initial;
    });
  })();
</script>
