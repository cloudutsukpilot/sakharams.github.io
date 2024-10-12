---
layout: post
title: Backstage.io - Local Setup
categories: [PlatformEngg, Backstage]
categories: [Platform Engineering, Backstage]
---

## Introduction

- Refererce : <https://backstage.io/docs/getting-started/>

### Prerequisities

- Unix Based Operating System
- GNU-like Build Environment
- curl or wget
- Node.js
- yarn
- docker
- git
- Admin Rights

## Installation Steps

### 1. Create your Backstage App

- Run the below command to generate the backstage app and enter the app name.

```npx
npx @backstage/create-app@latest
```

- This command will create a new directory with a Backstage app inside with the below structure:

```plaintext
app
├── app-config.yaml
├── catalog-info.yaml
├── package.json
└── packages
    ├── app
    └── backend
```

- Below are details of important files:
  + `app-config.yaml`: Main configuration file for the app.
  + `catalog-info.yaml`: Catalog Entities descriptors.
  + `package.json`: Root package.json for the project.
  + `packages/`: Lerna leaf packages or "workspaces".
    * `packages/app/`: An fully functioning Backstage frontend app, that acts as a good starting point for you to get to know Backstage.
    * `packages/backend/`: We include a backend that helps power features such as Authentication, Software Catalog, Software Templates and TechDocs amongst other things.

### 2. Run the Backstage app

- Navigate to the application directory and start the app using the below command and should open the Backstage UI in the default browser.
- This command will run both the frontend and backend as separate processes in the same window.

```yarn
yarn dev
```
