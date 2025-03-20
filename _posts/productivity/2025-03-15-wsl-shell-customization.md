---
layout: post
title: WSL Shell Customization
categories: [ Productivity, WSL ]
image: /assets/img/productivity/productivity-tools.avif
description: Customizations for WSL Shell
---

## Supercharge Your Command Line with oh-my-zsh and plugins

- The command line can be one of your most powerful tools during development, if you take the time to explore its capabilities.
- Even better, you can extend its functionality with some amazing tools.
- In this post, I’ll introduce my favorites tools and plugins to improve your productivity.

### oh-my-zsh: A Game Changer for Shell Customization

I’ve always enjoyed tweaking my command line configurations, but adding new functionality often meant diving back into my setup and figuring out where to insert new logic. That all changed when I discovered oh-my-zsh.

- **Why oh-my-zsh?**
  - Oh-my-zsh makes it incredibly easy to manage shell configurations, apply beautiful themes, and extend functionality with plugins.
  - Best of all, it has a thriving community that shares customizations and plugins to enhance the experience.

- **Installation**
  - Getting started with oh-my-zsh is simple:
    - [Install Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
    - [Install zsh](https://github.com/ohmyzsh/ohmyzsh/wiki/Installing-ZSH)
    - [Install oh-my-zsh](https://github.com/ohmyzsh/ohmyzsh#basic-installation)

- **Favorite Features**
  - `Enhanced Tab Completion`: Unlike traditional tab completion, oh-my-zsh allows you to navigate completion options using arrow keys.
  - `fc Command`: This built-in feature opens your last command in an editor, allowing you to modify and re-run it effortlessly.
  - `Pre-installed Plugins`: It comes with plugins for commonly used tools like Git, Docker, and Kubernetes, offering useful aliases and extended tab completion.
  - `Easy Plugin Installation`: Installing a new plugin usually requires just two steps—cloning a repository and adding it to the .zshrc file.

## Plugins

### 1. fzf: A Powerful Fuzzy Finder

fzf is a general-purpose command-line fuzzy finder that makes searching through files, history, and other data effortless.

- **Installation**
  - Follow the official [install guide](https://github.com/junegunn/fzf#installation)
  - To enable it, add `fzf` to your `~/.zshrc` file and reload the shell(`source ~/.zshrc` OR `exec zsh`).

- **How to Use**
  - Many shells provide a history search feature via Ctrl+R, but it’s often time consuming.
  - Instead of scrolling endlessly through past commands, fzf allows you to fuzzy-search command history instantly using `Ctrl+R`.

- **Why fzf?**
  - `Fuzzy Filtering`: You can quickly filter through any list of data by typing part of the content.
  - `Works with Piped Data`: Easily filter file content or command outputs using pipes.
  - `Customizable Look`: With the right settings, you can make it stand out visually. I below the below settings to be added to your `~/.zshrc` file:

    ```sh
    `export FZF_DEFAULT_OPTS='--height 40% --layout=reverse --border'`
    ```

### 2. zsh-autosuggestions

- Another great plugin to pair with fzf is zsh-autosuggestions, which provides real-time command suggestions as you type.
- If you frequently use the same commands, this will save you time.
- Accepting a suggestion is as simple as pressing the right arrow key.

- **Installation**
  - Follow the [install guide](https://github.com/zsh-users/zsh-autosuggestions/blob/master/INSTALL.md).
  - To enable it, add `zsh-autosuggestions` to your `~/.zshrc` file and reload the shell(`source ~/.zshrc` OR `exec zsh`).

- **How to Use**
  - Just start typing the command and it will automatically start showing suggestions based on the history.

### 3. fzf-tab

- While zsh already offers navigable tab completion, the fzf plugin does not always integrate seamlessly.
- This is where fzf-tab comes in, ensuring fzf works in all completion scenarios.

- **Installation**
  - Follow the official [install guide](https://github.com/Aloxaf/fzf-tab#install).
  - Add `fzf-tab` to your `.zshrc` plugin list.

- **How to Use**
  - When you start typing the commands, hit the `Tab` key to get auto completions.

### 4. kube-ps1

- A script that lets you add the current Kubernetes context and namespace configured on kubectl to your Bash/Zsh prompt strings (i.e. the $PS1).
- Inspired by several tools used to simplify usage of kubectl

- **Installation**
  - Follow the [install guide](https://github.com/jonmosco/kube-ps1).
  - To enable it, add `kube-ps1` to your `~/.zshrc` file and reload the shell(`source ~/.zshrc` OR `exec zsh`).
  
- **How to Use**
  - Whenever you connect to a Kubernetes cluster, the cluster name and the current namespace is displayed on the shell.
  - To disable it temporary, use `kubeoff`.
  - To enable it again, use `kubeon`

### 5. OhMyZsh Full-autoupdate

- **Installation**
  - Follow the [install guide](https://github.com/Pilaton/OhMyZsh-full-autoupdate)

### 6. zsh-history-substring-search

- **Installation**
  - Follw the [install guide](https://github.com/zsh-users/zsh-history-substring-search)

### 7. zsh-syntax-highlighting

- **Installation**
  - Follow the [install guide](https://github.com/zsh-users/zsh-syntax-highlighting)

### My zsh config

```sh
# ~/.zshrc
plugins=(git kubectl docker npm kube-ps1 ohmyzsh-full-autoupdate kube-ps1 azure fzf fzf-tab zsh-history-substring-search zsh-autosuggestions zsh-syntax-highlighting)
```

### Conclusion

If you’re looking to improve your command line experience, oh-my-zsh and fzf are fantastic tools that can significantly boost productivity. With enhanced history search, better tab completion, and autosuggestions, these tools make navigating the terminal a breeze.

Give them a try, tweak your setup, and happy coding!