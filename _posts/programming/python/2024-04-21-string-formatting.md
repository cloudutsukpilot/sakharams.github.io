---
layout: post
title: Python - String Formatting
categories: [python]
tags: [Python]
---


#### Casting
- Converting one data type to another.

1. Implicit
- Will be done automatically
- Example: `2 * 1.5` Output: `3.0`
  + The value 2 is converted to float automatically

2. Explicit
- Has to be specified using built-in functions.
- Example: `int_value = int(1.5)`
  + The float value 1.5 is converted to int with the loss of the decimal value.

| Function | Description |
| --- | --- |
| `int()` | Converts a specified value into an integer |
| `float()` | Converts a specified value into a floating point number |
| `str()` | Converts a specified value into a string |
| `list()` | Converts a specified value into a list |
| `tuple()` | Converts a specified value into a tuple |
| `set()` | Converts a specified value into a set |
| `dict()` | Converts a specified value into a dictionary |
| `bool()` | Converts a specified value into a boolean |
| `complex()` | Converts a specified value into a complex number |
| `bytes()` | Converts a specified value into a bytes object |
| `bytearray()` | Converts a specified value into a bytearray object |


#### String Formatting

- It is the way you can creating string with dynamic content, incorporating variables, expressions, or values within a string.

```
x = 10
y = 20
s = x + y
print("the first number is",x,"the second number is",y,"Sum is",s)
```

1. str.format()

```
message = "the first number is {}, the second number is {}, and sum is {}".format(x,y,s)
print()message
```

2. F-string
```
message = "the first number is {x}, the second number is {y}, and sum is {s}"
print()message
```