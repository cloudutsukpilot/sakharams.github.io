---
title: Jekyll - Build a Site
categories: [website, jekyll]
tags: [Website, Jekyll ]
image: /assets/img/website/chirpy-posts.jpg
---

## Introduction

- Jekyll can be used to create a stactic website for blogging.

### Step-by-Step Instructions

1. Install Jekyll on your host
    - Ref: https://jekyllrb.com/docs/installation/

2. Navigate to the folder and create a new site. This will create a folder called demosite with files like _config.yml, Gemfile, etc.

    ```sh
    jekyll new demosite
    ```

3. Run the Jekyll Server and browse the demo site on the displayed link.

    ```sh
    bundle exec jekyll serve
    ```

### Themes

- The Jekyll server uses a default theme called `minima` for generating the website. 
- You can find the location of the theme using the below command:

    ```sh
    bundle show <theme_name>
    ```

    ```sh
    > bundle show minima
    C:/Ruby31-x64/lib/ruby/gems/3.1.0/gems/minima-2.5.2
    ```

- 