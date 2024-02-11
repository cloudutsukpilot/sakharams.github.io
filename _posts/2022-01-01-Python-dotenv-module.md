---
layout: post
title: Python dotenv module
---


Error:
ModuleNotFoundError: No module named 'dotenv'

Reason:
Python env was not set 

Solution:
python3 -m venv ~/pythonvenv/
ls -al ~/pythonvenv/
pip3 install python-dotenv
source ~/pythonvenv/bin/activate
pip install --upgrade pip