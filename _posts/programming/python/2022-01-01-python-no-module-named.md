---
layout: post
title: Python - No module named
categories: [python]
tags: [Python]
---


Error:
ModuleNotFoundError: No module named 'dotenv'

Reason:
The virtual environment for Python was not created/set.

Solution:
1. Create a new python virtual environment:
    python3 -m venv ~/pythonvenv/

2. List the contents of the directory and verify the permissions:
ls -al ~/pythonvenv/

3. Install the required module: 
pip3 install python-dotenv
OR
python -m pip install {package_name}

4. Source the new virtual environment:
source ~/pythonvenv/bin/activate

5. Upgrade the Pip:
pip install --upgrade pip