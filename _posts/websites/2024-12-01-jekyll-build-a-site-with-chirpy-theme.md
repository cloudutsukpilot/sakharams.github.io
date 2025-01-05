---
title: Jekyll - Build a Site with Chirpy Theme
categories: [website, jekyll, chirpy]
tags: [Website, Jekyll, Chirpy ]
image: /assets/img/website/chirpy-posts.jpg
description: Learn how to build a personal blog/site using the Jekyll Chirpy theme.
---

## Introduction

- This article describe the step-by-step instructions to create a Jekyll site using the Chirpy theme.
- This setup uses the `Starter Template` method to create a Jekyll state site, as this approach simplifies upgrades, isolates unnecessary files, and is perfect for users who want to focus on writing with minimal configuration.

### Creating a Site Repository

1. Sign in to GitHub and navigate to the [starter](https://github.com/cotes2020/chirpy-starter).
2. Click the `Use this template` button and then select Create a new repository.
3. Name the new repository <username>.github.io, replacing username with your lowercase GitHub username.

### Setting up the Environment

1. **Using Dev Containers (Recommend for Windows)**

    - Dev Containers offer an isolated environment using Docker, which prevents conflicts with your system and ensures all dependencies are managed within the container.
    - Steps:
    a. Install Docker:
    - On Windows/macOS, install [Docker Desktop](https://www.docker.com/products/docker-desktop/).
    - On Linux, install [Docker Engine](https://docs.docker.com/engine/install/).
    b. Install [VS Code](https://code.visualstudio.com/) and the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers).
    c. Clone your repository:
    - For Docker Desktop: Start VS Code and [clone your repo in a container volume](https://code.visualstudio.com/docs/devcontainers/containers#_quick-start-open-a-git-repository-or-github-pr-in-an-isolated-container-volume).
    - For Docker Engine: Clone your repo locally, then [open it in a container via VS Code](https://code.visualstudio.com/docs/devcontainers/containers#_quick-start-open-an-existing-folder-in-a-container).
    d. Wait for the Dev Containers setup to complete.

2. **Setting up Natively (Recommended for Unix-like OS)**

    - For Unix-like systems, you can set up the environment natively for optimal performance, though you can also use Dev Containers as an alternative.
    - Steps:

      - a. Follow the [Jekyll installation guide](https://jekyllrb.com/docs/installation/) to install Jekyll and ensure Git is installed.
      - b. Clone your repository to your local machine.
      - c. If you forked the theme, install [Node.js](https://nodejs.org/) and run `bash tools/init.sh` in the root directory to initialize the repository.
      - d. Run command `bundle` in the root of your repository to install the dependencies.

### Usage

- Start the Jekyll Server Locally

    ```sh
    bundle exec jekyll s
    ```

- After a few seconds, the local server will be available at http://127.0.0.1:4000.

### Configuration

- Update the variables in _config.yml as needed. Some typical options include:
  - url
  - avatar
  - timezone
  - lang

- `Social Contact Options`
  - Social contact options are displayed at the bottom of the sidebar. 
  - You can enable or disable specific contacts in the _data/contact.yml file.

- `Customizing the Stylesheet`
  - To customize the stylesheet, copy the theme’s assets/css/jekyll-theme-chirpy.scss file to the same path in your Jekyll site, and add your custom styles at the end of the file.

- `Customizing Static Assets`
  - Static assets configuration was introduced in version 5.1.0.
  - The CDN of the static assets is defined in _data/origin/cors.yml.
  - You can replace some of them based on the network conditions in the region where your website is published.

### Deployment

- Before deploying, check the _config.yml file and ensure the url is configured correctly. 
- Now you can choose ONE of the following methods to deploy your Jekyll site.

#### **Deploy Using Github Actions**

1. Prepare the following:

    - If you’re on the GitHub Free plan, keep your site repository public.
    - If you have committed Gemfile.lock to the repository, and your local machine is not running Linux, update the platform list of the lock file:

    ```sh
    bundle lock --add-platform x86_64-linux
    ```

2. Configure the Pages service.

    - Go to your repository on GitHub. Select the Settings tab, then click Pages in the left navigation bar.
    - In the Source section (under Build and deployment), select `GitHub Actions` from the dropdown menu.
    - Push any commits to GitHub to trigger the Actions workflow.
    - In the Actions tab of your repository, you should see the workflow Build and Deploy running. Once the build is complete and successful, the site will be deployed automatically.
    - You can now visit the URL provided by GitHub to access your site.

#### Manual Build and Deployment

- For self-hosted servers, you will need to build the site on your local machine and then upload the site files to the server.
- Navigate to the root of the source project, and build your site with the following command:

```sh
JEKYLL_ENV=production bundle exec jekyll b
```

- Unless you specified the output path, the generated site files will be placed in the _site folder of the project’s root directory. 
- Upload these files to your target server.
