---
layout: post
title: Introduction to Shell Scripting
categories: [Programming, Shell]
tags: [Shell]
---

## Introduction
- Shell scripting is an essential skill for anyone working in Unix or Linux environments. 
- A shell script is a program written for the shell, or command-line interpreter, of an operating system. 
- It automates repetitive tasks and can combine various commands to execute complex processes. 
- There are different types of shell scripting, variable types, operators, and data structures that can be leveraged to write effective scripts.

### Types of Shell Scripting
1. `Bash (Bourne Again Shell)`: 
    - One of the most common shell types used in Linux environments. 
    - It's an extension of the Bourne shell and provides features like command-line editing and job control.

2. `Sh (Bourne Shell)`: 
    - The original Unix shell developed by Stephen Bourne, and it serves as the foundation for many other shells like Bash and Korn shell.

3. `Zsh (Z Shell)`: 
    - A powerful shell similar to Bash but with additional features such as built-in spell checking and improved scripting capabilities.

4. `Csh (C Shell)`: 
    - The C shell's syntax is similar to the C programming language, and it provides features like command history and job control.

5. `Ksh (Korn Shell)`: 
    -A high-performance shell developed by David Korn, it blends features of the Bourne and C shells.


## Variables
- Variables in shell scripts are containers for storing data, and they do not require a specific data type declaration(default - string). 

```sh
#!/bin/bash
name="Scripting"
echo "The topic is $name"
```

## Operators
- Operators allow you to perform operations like arithmetic, comparisons, assignments, and more. Shell scripting supports a wide variety of operators.

1. **Arithmetic Operators**
- Arithmetic operations can be done using the expr command or $((...)) syntax.

```bash
#!/bin/bash
a=10
b=5
sum=$((a + b))
echo "Sum: $sum"
```

- Common arithmetic operators:
    + + (Addition)
    + - (Subtraction)
    + * (Multiplication)
    + / (Division)
    + % (Modulus)

2. **Comparison Operators**
- Comparison operators are used to compare values, typically integers, in a script. These comparisons are often used in if statements.

```bash
#!/bin/bash
a=10
b=20

if [ $a -eq $b ]; then
    echo "a is equal to b"
else
    echo "a is not equal to b"
fi
```

- Common comparison operators:
    + -eq (Equal to)
    + -ne (Not equal to)
    + -gt (Greater than)
    + -lt (Less than)
    + -ge (Greater than or equal to)
    + -le (Less than or equal to)

3. **Assignment Operators**
- Assignment operators assign values to variables.

```bash
#!/bin/bash
a=10
a+=5  # Equivalent to a = a + 5
echo "a: $a"
Operators like +=, -=, *=, /=, and %= perform the respective operations and then assign the result to the variable.
```

4. **Logical Operators**
- Logical operators are used to combine conditions.

```bash
#!/bin/bash
a=10
b=20

if [[ $a -lt 15 && $b -gt 15 ]]; then
    echo "Both conditions are true"
fi
```

- Common logical operators:
    + && (Logical AND)
    + || (Logical OR)
    + ! (Logical NOT)

5. **Bitwise Operators**
- Bitwise operators perform bit-level operations.

```bash
#!/bin/bash
a=5  # Binary: 101
b=3  # Binary: 011
result=$((a & b))  # Bitwise AND
echo "Result of AND: $result"
```

- Bitwise operators:
    + & (AND)
| (OR)
^ (XOR)
<< (Left shift)
>> (Right shift)
6. Identity Operators
Identity operators are used to compare whether two objects refer to the same object.

bash

#!/bin/bash
a="hello"
b="hello"

if [ "$a" == "$b" ]; then
    echo "a and b are identical"
fi