---
layout: post
title: GitHub Actions - Introduction
categories: [devops, cicd, github actions]
tags: [DevOps, CICD, Github Actions]
---

## Introduction

- GitHub Actions is a continuous integration and continuous delivery (CI/CD) platform that allows you to automate your build, test, and deployment pipeline. 
- You can create workflows that build and test every pull request to your repository, or deploy merged pull requests to production.
- GitHub Actions goes beyond just DevOps and lets you run workflows when other events happen in your repository.
- GitHub provides Linux, Windows, and macOS virtual machines to run your workflows, or you can host your own self-hosted runners in your own data center or cloud infrastructure.

### Components of GitHub Actions

- You can configure a GitHub Actions workflow to be triggered when an event occurs in your repository, such as a pull request being opened or an issue being created. 
- Your workflow contains one or more jobs which can run in sequential order or in parallel. 
- Each job will run inside its own virtual machine runner, or inside a container, and has one or more steps that either run a script that you define or run an action, which is a reusable extension that can simplify your workflow.

![Actions Overview](/assets/img/devops/cicd/githubactions/overview-actions-.webp)

1. **Workflow**
    - A workflow is a configurable automated process that will run one or more jobs. 
    - Workflows are defined by a YAML file checked in to your repository and will run when triggered by an event in your repository, or they can be triggered manually, or at a defined schedule.
    - Workflows are defined in the `.github/workflows` directory in a repository. A repository can have multiple workflows, each which can perform a different set of tasks such as:
        + Building and testing pull requests.
        + Deploying your application every time a release is created.
        + Adding a label whenever a new issue is opened.
    - You can reference a workflow within another workflow.

2. **Events**
    - An event is a specific activity in a repository that triggers a workflow run. For example, an activity can originate from GitHub when someone creates a pull request, opens an issue, or pushes a commit to a repository. 
    - You can also trigger a workflow to run on a schedule, by posting to a REST API, or manually.

3. **Jobs**
    - A job is a set of steps in a workflow that is executed on the same runner.
    - Each step is either a shell script that will be executed, or an action that will be run. 
    - Steps are executed in order and are dependent on each other.
    - Since each step is executed on the same runner, you can share data from one step to another. For example, you can have a step that builds your application followed by a step that tests the application that was built.

    - You can configure a job's dependencies with other jobs; by default, jobs have no dependencies and run in parallel. 

4. **Actions**
    - An action is a custom application for the GitHub Actions platform that performs a complex but frequently repeated task. 
    - Use an action to help reduce the amount of repetitive code that you write in your workflow files. 
    - An action can pull your Git repository from GitHub, set up the correct toolchain for your build environment, or set up the authentication to your cloud provider.

5. **Runners**
    - A runner is a server that runs your workflows when they're triggered. 
    - Each runner can run a single job at a time. 
    - GitHub provides Ubuntu Linux, Microsoft Windows, and macOS runners to run your workflows. Each workflow run executes in a fresh, newly-provisioned virtual machine.
    - GitHub also offers larger runners, which are available in larger configurations. 
    - If you need a different operating system or require a specific hardware configuration, you can host your own runners.
