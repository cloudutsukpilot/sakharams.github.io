---
title: Set Up Google AdSense in Your Jekyll Chirpy Site
categories: [website, analytics]
tags: [Website, Analytics, Web Development, Google AdSense]
image: /assets/img/website/chirpy-google-adsense.png
description: Configuration changes required to integrate Google AdSense into your Jekyll Site(Chirpy Theme)
---

## Introduction

- This pages provides the steps to setup google adsense in your jekyll chirpy theme.
- Below are the step by step instructions:

### 1. Setup a Google AdSense Account

- Quickly sign up for AdSense using the following link: [Google AdSense](https://www.google.co.uk/intl/en/adsense/start/)

### 2 . Copy the default.html

- Copy the `_layouts/default.html` file from [jekyll-theme-chirpy](https://github.com/cotes2020/jekyll-theme-chirpy/blob/master/_layouts/default.html) and copy it in your repsitory under `_layouts`  folder (Create the folder if it does not exists).

### 3. Get AdSense Code

- Login into [Google AdSense](https://www.google.com/adsense) account.
- Click on `Ads` and then click on `Get Code` to get the AdSense code.

### 4. Paste AdSense Code in _includes folder

- Create a file under _includes folder (I named it adsense_center.html) and paste the Adsense code into the file. 
- If you are `ad unit` in Google AdSense to have Ads displayed at specific location, you can create multiple files(max 3) with different names.

### 5. Update default.html template

- Copy the _layouts/default.html from the [jekyll-theme-chirpy](https://github.com/cotes2020/jekyll-theme-chirpy/blob/master/_layouts/default.html) to your repository.
- Based on your requirement, you can place the `include` statement and the file name to get the ads displayed at specific locations.
- Please refer to the changes that I have made in my repository [Cloudutsuk.com Repo](https://github.com/cloudutsukpilot/sakharams.github.io/blob/main/_layouts/default.html).
- Please note that the ads will start appearing after 30 minutes or more.
