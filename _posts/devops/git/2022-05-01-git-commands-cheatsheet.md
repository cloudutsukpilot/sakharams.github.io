
---
layout: post
title: Git Commands - CheatSheet
categories: [devops, git, git commands]
tags: [devops, git, git commands, cheatsheet]
---


#### Hardware Information

| `git --version` | Check the git version | 
| `git init` | To initialize a directory | 
| `git remote add origin "https://<path-to-git-repository>"` | To add a remote directory to the newly initialized folder | 
| `git status` | To check if there are any uncommitted changes | 
| `git pull master` | To pull all the files from the remote repository to the local repository | 
| `git add filename` OR `git add .` | To add all or selected uncommitted changes |
| `git commit -m “commit msg”` | To commit with uncommitted changes |
| `git push -u “url” master` OR `git push -u origin master` | To push the changes to the master branch on the repo |
| `git clone https://<path-to-git-repository>` | To clone a directory from git providers |
| `git clone https://username:password@github.com/username/repository.git` | To clone the directory with username/password | 
| `git fetch` | To fetch the git repository to local |


#### Branches 
| `git branch` | To get the current git branch |
| `git branch -r` | To list all branches |
| `git checkout -b branch_path` | To create to a new branch |
| `git branch -D <local-branch>` | To remove branch from local directory |


| `git push origin [name_of_your_new_branch]` | To push the newly created branch to origin |

| `git checkout -b branch_path` | To create to a new branch |
| `git checkout -b branch_path` | To create to a new branch |
| `git checkout -b branch_path` | To create to a new branch |



| `git config --global --list` | Check all the global variables values | 

	
	
	- 
	
	
	- 
	
	
	- 
	
	
	- 
	
	
	
#### Cloning a Git Repository:
- To pull contents from a repository(github) and upload to another(gitlab):

1. Clone the repository to your local workspace and verify the files are download
```
git clone https://github.com/in28minutes/devops-master-class.git
```

2. To clone the directory with username/password:
```
git clone https://username@github.com/username/repository.git
git clone https://username:password@github.com/username/repository.git
```

3. Change the directory to the folder and remove the origin
- To check the origin
```
git remote -v
```
- To remove the origin
```
git remote rm origin
```

4. Add the new repository as origin to the cloned folder and push it to the master branch
```
git remote add origin https://gitlab.com/sakharamgit/devops.git
```

5. Push the changes to the destination repository:	
```
git push origin master  
```