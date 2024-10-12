---
layout: post
title: Backstage.io - Features
categories: [PlatformEngg, Backstage]
categories: [Platform Engineering, Backstage]
---

## Introduction

- Backstage offers five core functionalities:
  - Software Catalog
  - Scaffolder - Software Templates
  - TechDocs - Documentation Generator
  - Kubernetes Cluster Visualizer
  - Search - Cross-Ecosystem Search Capabilities.
  - Plugins

### Software Catalog

- The Catalog’s objective is to map all software assets in your organization, including websites, APIs, libraries, and resources, in a centralized directory.
- The Catalog tracks each asset's metadata, ownership, and dependencies, resulting in a software graph that surfaces orphaned entities.
- The Catalog is flexible enough to host a wide variety of software assets, known as entities in Backstage.
- Because a website is very different from a data processing pipeline, entities can be differentiated by kind. Moreover, even within kinds of entities, you can define types.
- The Catalog is powered by metadata stored in YAML files, which describe the kind, type, name, owner, and more details of a single entity per file.
- These files are commonly stored along their respective codebase, such that it gets updated frequently.
- Tracking ownership and dependencies is one of the strongest use cases for the Catalog. - These are also declared in the YAML file describing a software component. Only a single team can be the component owner, and this team must be registered in the Catalog as an entity as well.
- As for dependencies, Backstage lets you define how the component depends on another entity and what it exposes so others can consume it.
- The software graphs that result from this metadata can surface problems like orphaned entities, which means they do not have a parent. 
- Furthermore, given that a great deal of information about all your software assets is stored in the Catalog, you can extract insights such as maturity readiness or security warnings.

### Scaffolder

- One major use case for Backstage is helping onboard new team members and promoting golden paths among regular contributors.
- The Scaffolder provides your developers with the ability to execute software templates that initialize repositories with skeleton code and predefined settings.
- The Scaffolder is a perfect place for new engineers to jump into the development process right away.
- You could, for example, set up a template to Create Node/React Website in your Scaffolder, which sets up a repository with CI/CD and analytics baked in from the beginning.
- When the new developers use the software template, they’ll get a deploy-ready service that will allow them to familiarize themselves with the tools and feel productive with a few clicks instead of having to wander aimlessly through your tech ecosystem.
- A software template is defined in a YAML file that specifies parameters and steps to execute.
- Backstage will generate a UI in the Scaffolder based on the parameters that you specify in your software template.
- For the steps, you can leverage built-in actions for common fetch operations, but you can also define your own.
- Templates are stored in the Catalog under a template kind.
- Furthermore, all components initialized by the Scaffolder are automatically added to the Catalog.
- Therefore, there’s a virtuous cycle between the Scaffolder and the Catalog that promotes discoverability and standardization.

### TechDocs

- A major win for teams using Backstage is that they get a centralized hub for all their documentation.
- TechDocs is the framework’s documentation-as-code solution; it takes markdown files and transforms them into static pages.
- TechDocs follows the same principle as the Catalog metadata files: stay close to the source code to stay accurate.
- TechDocs are written as markdown files in the repository where the entity that they document is kept.
- Then, the TechDocs Backstage plugin fetches these files from all services, generates static pages, and publishes them.
- TechDocs lets developers focus on writing instead of managing the publishing process.
- It will take care of gathering the different sources and building the pages, including navigation and any other UI elements needed.
- The build process is flexible to accommodate complex logic, allowing developers to choose to build the docs locally for some services while letting TechDocs build it on the runtime in others.

### Kubernetes Cluster Visualizer

- Backstage ships with a plugin that helps developers visualize the state of the clusters for each service.
- The tool helps understand the health of the service’s clusters at a glance, including development, staging, and production environments.
- The Kubernetes plugin is tied to the Catalog. It shows information about the clusters associated with a service registered in the catalog.
- To enable it, you must tell Backstage how to discover your clusters, whether that is by reading information that exists already in the Catalog or by fetching it directly from GKE or another custom Kubernetes cluster supplier.

### Search

- Search is the most recent addition to Backstage’s framework.
- Search allows developers to find information across their ecosystem by leveraging your search engine of preference and lets you customize how things are indexed and presented to the user.
- Search is quite customizable. For starters, the plugin allows you to bring your own search engine, although ElasticSearch is the officially maintained engine.
- Search ships with a rudimentary query translator that turns the user’s input into a fully formed query, but you’re allowed to customize it to your engine and use cases better.
- You’re also welcome to customize the search results page and what each result looks like.
- Under the hood, Search searches “documents” that represent entities, documentation pages, or any other thing that you put into Backstage.
- These documents are consumed through streams exposed by a Collator.
- Collators define what can be found by defining, indexing, and collecting documents.
- Currently, collators are available for the Catalog, TechDocs, and Stack Overflow. You can define your collators too.


### Adaptability Through Plugins

- So far, all the features we’ve seen are implemented as plugins but are maintained by the Backstage team and considered core features of the framework.
- But a few dozen community plugins are available, and even plugins that extend other plugins.
- Community plugins either extend a core feature, add new functionalities, or integrate with a vendor.
- There’s a handful of plugins that extend the Catalog, for instance, a plugin that generates graphs that show the relationship between entities or an Okta plugin that ingests users and teams as entities.
- Added functionalities range from repository badges to generating API documentation.
- Most plugins bring information from vendors into Backstage, such as PagerDuty incidents and ArgoCD statuses.
- Additionally, you can write your own plugins for internal use or contribute them back to the community.
