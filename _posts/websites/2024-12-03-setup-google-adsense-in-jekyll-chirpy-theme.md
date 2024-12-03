---
title: Set Up Google AdSense in Your Jekyll Chirpy Site
categories: [website, analytics]
tags: [Website, Analytics, Web Development]
image: /assets/img/website/google-jekyll.webp
alt: "Jekyll - Google AdSense" 
---

## Introduction

- This pages provides the steps to setup google adsense in your jekyll chirpy theme.
- Below are the step by step instructions:

### 1. Setup a Google AdSense Account

- Quickly sign up for AdSense using the following link: [Google AdSense](https://www.google.co.uk/intl/en/adsense/start/)

### 2 . Copy the default.html

- Copy the `_layouts/default.html` file from [jekyll-theme-chirpy](https://github.com/cotes2020/jekyll-theme-chirpy/blob/master/_layouts/default.html) and copy it in your repsitory under `_layouts`  folder (Create the folder if it does not exists).

### 3. Get AdSense Code

- Login into [Google AdSense](http://www.google.com/adsense) account.
- Click on `Ads` and then click on `Get Code` to get the AdSense code.

### 4. Paste AdSense Code in default.html

- Just before the end of <body> tag, paste the AdSense code.

```html
...
    <!-- AdSense Code -->
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3247366555534455"
    crossorigin="anonymous"></script>
  </body>
</html>
```
