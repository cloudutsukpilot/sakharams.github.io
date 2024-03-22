---
layout: post
title: GitLab - Git Clone with 2FA Enabled
categories: [devops, cicd, gitlab]
tags: [devops, cicd, gitlab, 2FA]
---

### Instructions to login into GitLab when 2FA is enabled

A. Create an Access Token:
1. Log in into the GitLab account;
2. Go to the Preferences section (hover the profile image and wait for the menu).
3. Go to Access Tokens
4. Now here you can create a temporary token; if you need to pull/push you must enable read_repository and write_repository flags.
5. A token is shown in the page. Don't close or refresh the page, or you won't be able to retrieve the same token again!!!

B. Clone the Repository
1. Open a terminal and run the git clone command with https:
```
git clone https://<gitlab-server-name>/<gitlab-repository>.git
```
2. Once you press enter, you will be prompted for password
4. Paste the Personal Access Token (PAT) that you created above and the repo should be cloned.




