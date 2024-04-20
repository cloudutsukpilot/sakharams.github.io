---
layout: post
title: MacOS Environment Variables
categories: [operating systems, macos]
tags: [Operating Systems, MacOS]
---

* To display the list of currently set environment variables:
```bash
printenv
```

* To display the value of any specific environment variable:
```bash
echo $[variable name]
```

* To check the value of the PATH variable which stores a list of directories with executable files:
```bash
echo $PATH
```

* To set a temporary environment variable:
```bash
export [variable_name]=[variable_value]
```

* To add value to an existing environment variable:
```bash
export [existing_variable_name]=[new_variable_value]:$[existing_variable_name]
```
Example:
```bash
export PATH=/Users/exec/tok:$PATH
```


* To set permanent environment variable
1. Find the path to .bash_profile using:
```bash
~/.bash_profile
```
2. Open the .bash_profile file with a text editor and add the new environmental variable to the end of the file using:
```bash
export [variable_name]=[variable_value]
```
3. Save the file and refresh the terminal using the below command or restart the terminal.
```bash
source ~/.bash_profile
```

* To unset the environmental variable:
```bash
unset [variable =_name]
```

