---
title: Bitbucket Git Clone with MFA Enabled
categories: [devops, git, bitbucket]
tags: [DevOps, Git, Bitbucket, MFA]
---

In this post, we will go through the stpes that you can follow to clone a Bitbucket git repository to your local machine when multi factor authentication (MFA) is enabled on your Bitbucket account.

Since we have MFA enabled on the Bitbucket account, we cannot clone the git repository directly. Instead, we can use tokens to authenticate git operations to the respository.


1. Login into your bitbucket repository.
2. Navigate to Profile -> Manage Account -> HTTP Access Tokens.
3. Create a tocket with appropiate name and selected the required permissions which will be associated with the token.
4. Once the tocken is generated, please save it in a secure place as it is visible only once.
4. On your machine, type the below command and enter the tocken as your password:
```bash
git clone <repository_rule>
Username for <repository_url> : 
Password for <username>: 
```
5. The git repository should be cloned to your machine in the current directory.