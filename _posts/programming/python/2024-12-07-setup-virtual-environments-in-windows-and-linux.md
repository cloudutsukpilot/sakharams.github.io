---
layout: post
title: Python - Setup Virtual Environment in Windows and Linux
categories: [Programming, python]
tags: [Python]
---

## Introduction

- A `Virtual Environment` is a Python environment, that is an isolated working copy of Python that allows you to work on a specific project without affecting other projects. 
- So basically it is a tool that enables multiple side-by-side installations of Python, one for each project.

### Creating a Python virtual environment in Linux

1. Install Pip on your host.

    ```sh
    sudo apt-get install python-pip
    ```

2. Then install `virtualenv` and check the version.

    ```sh
    pip install virtualenv
    virtualenv --version
    ```

3. Create a virtual environment now by providing a name.

    ```sh
    virtualenv virtualenv_name
    ```

4. This will create a folder named `virtualenv_name` will be created.  If you want to create a virtualenv for specific python version, type

    ```sh
    $ virtualenv -p /usr/bin/python3 virtualenv_name
    ```

    or

    ```sh
    virtualenv -p /usr/bin/python2.7 virtualenv_name
    ```

7. Now at last we just need to activate it, using command

    ```sh
    source virtualenv_name/bin/activate
    ```

8. Now you are in a Python virtual environment You can deactivate using

    ```sh
    deactivate
    ```

### Creating Python virtualenv in Windows

1. If python is installed in your system, then pip comes in handy. So simple steps are: 1) Install virtualenv using

    ```sh
    pip install virtualenv 
    ```

2. Now in which ever directory you are, this line below will create a virtualenv there

    ```sh
    python -m venv myenv
    ```

3. To active the virtual environment in the same directory, type the below command

    ```sh
    myenv\Scripts\activate
    ```

4. To deactive the virtual environment, type

    ```sh
    deactivate
    ```
