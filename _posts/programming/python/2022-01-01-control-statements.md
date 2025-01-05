---
layout: post
title: Python - Control Statements
categories: [Programming, python]
tags: [Python]
image: /assets/img/programming/python/python-posts.png
---

#### Control Statements:
1. Conditional Statements

| Conditional Statement | Description |
| --- | --- |
| `if` | An `if` statement is used to test an expression for truthiness and execute some code if the expression is true |
| `elif` | An `elif` (else if) statement is used to chain multiple conditions in an if statement. It executes its block of code if its condition is true and all previous conditions have been false |
| `else` | An `else` statement catches anything which isn't caught by the preceding conditions |
| `if...else` | An `if...else` statement provides an alternate block of code that is executed if the `if` condition is false |
| `if...elif...else` | An `if...elif...else` statement allows you to chain multiple conditions and provide an alternate block of code that is executed if all conditions are false |

2. Looping Statements

| Looping Statement | Description |
| --- | --- |
| `for` | A `for` loop is used for iterating over a sequence (that is either a list, a tuple, a dictionary, a set, or a string) |
| `while` | A `while` loop can execute a set of statements as long as a condition is true |
| `nested loops` | A nested loop is a loop inside a loop. The `for` loop and the `while` loop can be nested |
| `break` | The `break` statement can stop the loop before it has looped through all the items |
| `continue` | The `continue` statement can stop the current iteration of the loop, and continue with the next |
| `pass` | The `pass` statement is used as a placeholder for future code. When the `pass` statement is executed, nothing happens, but you avoid getting an error when empty code is not allowed |


#### Examples:

1. If elif else Statement:

    ```
    age = 18

    if age < 13:
        print("You are a child.")
    elif 13 <= age < 18:
        print("You are a teenager.")
    else:
        print("You are an adult.")
    ```

2. For Loop :

    ```
    # List of numbers
    numbers = [1, 2, 3, 4, 5]

    # variable to store the sum
    sum = 0

    # iterate over the list
    for num in numbers:
        sum = sum + num

    # print the sum
    print("The sum is", sum)
    ```

3. While Loop:

    ```
    # initial value of counter
    counter = 0

    # while loop
    while counter < 5:
        print("Counter is", counter)
        counter = counter + 1
    ```

4. Nested Loops:

    ```
    # Outer loop
    for i in range(3):
        print("Outer loop iteration:", i)
        
        # Inner loop
        for j in range(3):
            print("   Inner loop iteration:", j)
    ```