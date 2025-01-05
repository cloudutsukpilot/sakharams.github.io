---
layout: post
title: Python - Building Blocks of Python
categories: [Programming, python]
tags: [Python]
image: /assets/img/programming/python/python-posts.png
---

#### Functions:
- Group of statements that performs a specific task.
- Syntax:

    ```
    def function_name(parameters):
        statement(s)
        return result
    ```

#### Modules:
- A module is a file containing the python definitions & statements.
- Modules have .py extensions and help us logically organize the code.
- Example:
  + my_module.py
  ```
  def greet(name):
    print(f"Hello {name} , Welcome !!!")
  age = 25
  ```

  + main.py
  ```
  import my_module
  my_module.greet("John")
  print(my_module.age)
  ```

#### Classes:
- A class is user-defined blueprint or prototype from which objects are created.
- Objects:
  + A instance of a class with values
- Class Attributes:
  + Reflects the properties of an Objects
- Class Methods:
  + Reflects the behaviour of objects
- Sytax:
  ```
  class MyClass:
    # Class varaible
    class_variable = "I am a class variable"

    # Constructur (initializer) method
    def __init__(self, attribute1, attribute2):
      self.attribute1 = attribute1
      self.attribute2 = attribute2
      
    # Instance Method
    def display_attributes(self):
      print(f"Attribute 1: {self.attribute1})"
      print(f"Attribute 2: {self.attribute2})"
      
    # Another Instance Method
    def modity_attributes(self, new_value1, new_value2):
      self.attribute1 = new_value1
      self.attribute2 = new_value2

  
  # Creating Objects from Class

  # Creating objects:
  obj1 = MyClass("john","doe")
  obj2 = MyClass("kevin","shark")

  # Accessing attributes and method
  print(obj1.attribute1)
  obj2.attribute1

  # Modifying the objects
  obj1.modity_attributes("jane","smith")
  ```
    

#### Scripts:



#### Libraries:
- Library is a collection of modules that provides pre-written and reusable code to perform specific tasks.
- Example:
  ```
  import pandas as pd
  pd.read_csv("dataset.csv")
  ```


#### Python Packages
