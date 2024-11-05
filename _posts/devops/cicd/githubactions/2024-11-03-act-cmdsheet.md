---
layout: post
title: GitHub Actions - Act - CMDsheet
categories: [devops, cicd, github actions]
tags: [DevOps, CICD, Github Actions, CMDsheet]
---

## Introduction

- Act is a tool to run your GitHub Actions locally

- Benefits

  1. `Fast Feedback`
    - Rather than having to commit/push every time you want to test out the changes you are making to your .github/workflows/ files (or for any changes to embedded GitHub actions), you can use act to run the actions locally. 
    - The environment variables and filesystem are all configured to match what GitHub provides.

  2. `Local Task Runner` 
    - With act, you can use the GitHub Actions defined in your .github/workflows/ to replace your Makefile!

- Reference Guide: <https://nektosact.com/introduction.html>


### Command Line Arguments

| Run all workflows in .github/workflows | `act` |
| Run the workflows with `push` event | `act push` | 
| Run the workflows with `pull request` event | `act pull_request` |
| Run the workflows with `schedule` event | `act schedule` | 
| To list all workflows for a given event | `act -l pull_request` |
| To list all jobs in all workflows | `act -j 'test'` | 
| To pass inputs to the workflow | `act --input Name=somevalue` |
| To pass input file to the workflow | `act --input-file myvars.env` |
| To run in Offline mode | `act --action-offline-mode` |
