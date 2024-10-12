---
layout: post
title: Backstage.io - Adoption
categories: [PlatformEngg, Backstage]
categories: [Platform Engineering, Backstage]
---

## Introduction

- This blog reviews the technology stack used by the framework, and touches on common deployment approaches.

### Technology Stack

- To work on your Backstage instance, you’ll be working with a lot of YAML, as YAML files are the primary source of metadata.
- For a basic setup, you’ll find it handy to have some knowledge of React to update your instance’s UI to include plugins.
- If you need custom processors or plugins, you’ll need a good understanding of Node, as it’s what powers Backstage’s backend. TypeScript is favored across the project.
- For local development, you can benefit from knowing how to use Docker. It will allow you to run a Backstage instance more efficiently or to build TechDocs before you deploy them, for example. Backstage uses YARN for package management.
- To follow up with the framework better, it’ll be handy for you to understand how monorepos work, as Backstage is implemented as such. 
- Backstage follows a Semantic Versioning schema, cutting minor versions once a month.

### Self-Hosted Backstage

- The advantage of self-hosted Backstage is that you have practically no limits on how much you customize your Backstage instance.
- Some go as far as using only the backend and constructing a frontend with their design system.
- The disadvantage of self-hosted Backstage is that your team will need to spend considerable effort learning about Backstage’s internals, upgrading the core libraries monthly, and each plugin when there’s a new release.

### Managed Backstage

- As with other open source projects, there is a commercial offering for managed and hosted Backstage by [Roadie.io](https://roadie.io/), an official Backstage partner.
- The advantage of managed Backstage is that you get a production instance and need no knowledge of React or Node.
- You set up all integrations and plugins through a UI and get all updates automatically. Effectively, this translates into needing fewer people to maintain your Developer Portal.