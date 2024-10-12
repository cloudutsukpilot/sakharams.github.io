---
layout: post
title: Backstage.io - Architecture
categories: [PlatformEngg, Backstage]
categories: [Platform Engineering, Backstage]
---

## Introduction

- Backstage uses a three-layers model to explain how a Developer Portal is built using its framework.

![Backstage's Three-Layer Model](/assets/img/platformengg/backstage/backstage_3_layer_model.png)

### Core

- This is what the Backstage team maintains and releases as open source. 
- Unless you want to contribute to the project, you may not need to wrap your head around this piece from the beginning.

### App

- This app is the Developer Portal that you’ll make available to your developers. 
- While adopting Backstage, you’ll be interacting the most with this piece.

### Plugins

- To extend your instance’s functionality, you can install plugins into it. 
- Even basic functionality is abstracted as plugins, including the Catalog. So you’ll always be working with a handful of plugins.
- There are a few dozen community plugins available to integrate popular services. And you can create your own.
