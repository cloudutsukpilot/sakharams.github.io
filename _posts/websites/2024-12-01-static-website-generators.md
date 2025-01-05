---
title: Static Website Generators
categories: [website, jekyll]
tags: [Website, Jekyll ]
image: /assets/img/website/chirpy-posts.jpg
description: What are Static Site Generators? Review few examples and use cases for static sites.
---

## Introduction

- Websites today are becoming leaner, faster and more agile. And visitors demand quick and seamless experiences.
- Dynamic websites have made web a magnificent place but they have their pitfalls.
- Statistics say 70% of today’s WordPress installations are vulnerable to known exploits (and WordPress powers more than 25% of the web).
- Some common problems Wordpress users face:
  - My blog loading slowly.
  - My blog crashing during peak periods.
  - My blog becoming infected with malware.

- WordPress is basically a content management framework, whereas Jekyll is just a blogging platform.

### Static Site Generators

- A static site generator takes dynamic content and data and generate static HTML/ JavaScript/CSS files that can be deployed to the server.
- Static sites are only HTML, CSS, and JavaScript files. Of course, they also include images like JPEG and GIF, graphic files like SVG and WebGL, or data formats like JSON or XML.
- Static sites are delivered to the end user exactly as they are on the server. There is no server-side generation at runtime.
- Because there is no server-side language to speak to a database, there is no database. 
- There can be data stored as files or via an external service. This means that if you need common features like user registration/login, this would need to be via an external service!

### Example: Jekyll

![Jekyll Static Static Generator](/assets/img/website/jekyll.png)

### Benefits of Static Sites

1. **Performance**
    - Static files can be served fast  as there is no server-side processing and no database to connect. 
    - Additionally, web servers will automatically set caching headers (such as Last-Modified) for static files, which reduce bandwidth usage.

2. **Security**
    - Static websites are immune to the most common attacks, as they do not contain dynamic content.

3. **Content versioning**
    - Since your entire site, from configuration to content, is filebased, it is very easy to keep all aspects of it within a version control system like Git.

4. **Simplicity**
    - Building and maintaining websites is incredibly simple.

5. **Versioning**
    - Storing content in flat, text files, makes them ideal to be used with version control systems, such as Git.
    - Utilizing a static site generator means you can build websites with modern frameworks, and workflows, with a high degree of productivity and efficiency

6. **Use markdown**
    - Because static sites are developed locally, you can play around with the site to your heart’s content without affecting the live site.

7. **Hosting**
    - Since no server-side language is required, hosting requires no complicated setup or maintenance, making it cheap and easy. In fact, there are even free options, like GitHub pages.

### Use Cases

- Blogs (most frequent use case for a static site engine)
- Informational sites
- Landing pages
- Selling pages
- Company pages
- Documentation
- Portfolio

### Features

- Even the most basic content site, like a personal blog, generally has dynamic aspects: commenting, feedback or contact forms and search, to name just a few
- There are numerous services, both free and paid, that offer the ability to add dynamic aspects into static pages. 

### Markdown

- Markdown has become a de facto part of the static site stack.
- Markdown is a simple way to add formatting like headers, bold, bulleted lists, and so on to plain text.
- It is a shorthand way to write HTML and is the default tool to write post and page content in most static site generators.