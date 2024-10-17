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

### 3. Make Configuration Changes

- Make the below configuration changes based on your needs:

1. Tile and Organization Name

  ```yaml
  app:
    title: Cloudutsuk Portal
    baseUrl: http://localhost:3000

  organization:
    name: Cloudutsuk
  ```

2. Add Postgres Database

- Add the below code to the app-config.local.yaml file to avoid commiting credentials to the repository.

  ```yaml
  # Backstage override configuration for your local development environment

  backend:
    database:
      connection:
        host: localhost
        # Default postgresql port, change accordingly to your case
        port: 5432
        user: postgres
        # The password you set earlier
        password: postgres
  ```

3. Enable Authentication

- Create a GitHub OAuth App and add the credentials in app-config.local.yaml file.
- Creating GitHub OAuth App:
  + Navigate to [GitHub’s settings](https://github.com/settings/applications/new) to create your OAuth App.
  + For “Homepage URL’, you’ll use your instance’s local URL http://localhost:3000.
  + As for “Authorization Callback URL”, point it to your local Backstage backend http://localhost:7007/api/auth/github/handler/frame.
  + Click “Register Application”, take note of the Client ID and Client Secret.
  + Once you click “Register Application”, take note of the Client ID and Client Secret.

- Add the below code to app-config.local.yaml file to enable authentication using GitHib:

```yaml
backend:
  database:
    # ...
auth:
  environment: development
  providers:
    github:
      development:
        clientId: YOUR-CLIENT-ID
        clientSecret: YOUR-CLIENT-SECRET
```

-  Open packages/app/src/App.tsx and add the following below the last import line.

```react
import { githubAuthApiRef } from '@backstage/core-plugin-api';
```

- 
