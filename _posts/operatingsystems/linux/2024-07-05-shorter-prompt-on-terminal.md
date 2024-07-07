---
layout: post
title: Shorter Prompt on Terminal
categories: [operating systems, linux]
tags: [Operating Systems, Linux]
---

## Introduction
- To get shorter prompt on the linux terminal using zsh (Oh my Zsh), you can add the below config to the ~/.zshrc file. 

1. Disable Conda's Default Prompt Modification:
- You need to configure Conda to not modify the prompt by itself. Add the following line to your .zshrc:
```sh
conda config --set changeps1 False
```

2. Customize the Conda Prompt Modifier:
- Define and use a custom function to display only the basename of the Conda environment directory.

3. Ensure the Custom Function is Integrated Correctly:
- Modify your .zshrc to ensure your custom function is used correctly.

### Final Content in ~/.zshrc

```sh 
# ~/.zshrc

# Disable Conda's default prompt modification
conda config --set changeps1 False

# Initialize Conda if not already initialized
if [ -f "$HOME/anaconda3/etc/profile.d/conda.sh" ]; then
    . "$HOME/anaconda3/etc/profile.d/conda.sh"
fi

# Function to shorten Conda environment display
conda_prompt_modifier_short() {
    if [ -n "$CONDA_PREFIX" ]; then
        echo "($(basename "$CONDA_PREFIX")) "
    fi
}

# Use the custom function in the prompt
autoload -U add-zsh-hook
load_conda_env_prompt() {
    CONDA_PROMPT_MODIFIER=$(conda_prompt_modifier_short)
}
add-zsh-hook precmd load_conda_env_prompt

# Customize the prompt
export PROMPT='${CONDA_PROMPT_MODIFIER}%F{cyan}%n@%m%f %F{yellow}%1~%f %F{magenta}git:(%F{red}%1(vcs_branch)%f%F{magenta})%f %F{green}%#%f '

# Source the changes
source ~/.zshrc
```