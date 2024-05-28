---
layout: post
title: Python - Input & Output Operations
categories: [programming, python]
tags: [Python]
---


#### Input from Command Line

```
user_input = input("Enter the value to save in the variable:")
print("Output is:", user_input)
```

- Changing the data types:
```
user_input1 = int(input("Enter the number 1:"))
user_input2 = int(input("Enter the number 2:"))
sum = user_input1 + user_input2
print("Sum is", sum)
```

#### Input from a storage/file

1. File Operations
```
fileobj = open(filename, mode)
fileobj.close()
```
- Modes:
  + r : read
  + w : write, create if file does not exist and overwrite if it exists
  + x : write only if file does not exist
  + a : append
- Second letter of mode:
  + t : text
  + b : binary

- Example:

    ```
    fileobj = open("example.txt", "wt")
    fileobj.write("The is the content of the text file")
    fileobj.close()
    ```

