---
layout: post
title: Python - String Formatting
categories: [Programming, python]
tags: [Python, string formatting, f-strings, str.format]
image: /assets/img/programming/python/python-posts.png
---

## What is String Formatting in Python?

String formatting is the process of creating strings with dynamic content by incorporating variables, expressions, or values within a string literal. It allows you to build complex strings by inserting values at specific positions.

### Basic Example

```python
x = 10
y = 20
s = x + y

# Using comma separation (simplest but limited)
print("The first number is", x, "the second number is", y, "Sum is", s)

# Output: The first number is 10 the second number is 20 Sum is 30
```

---

## String Formatting Methods in Python

Python provides several methods for string formatting:

### 1. **Old-Style `%` Operator** (Python 2+)
The oldest method, inspired by C's `printf()` function.

```python
name = "Alice"
age = 25
balance = 1234.567

# Single value
print("Hello, %s!" % name)  # Hello, Alice!

# Multiple values (using tuple)
print("Name: %s, Age: %d" % (name, age))  # Name: Alice, Age: 25

# Dictionary interpolation
person = {"name": "Alice", "age": 25}
print("Hello, %(name)s! You're %(age)d years old." % person)

# Number formatting
print("Balance: $%.2f" % balance)  # Balance: $1234.57
print("Hex: %x" % 255)  # Hex: ff
print("Octal: %o" % 64)  # Octal: 100
```

**Format Specifiers for `%` operator:**
- `%s` - String
- `%d` or `%i` - Decimal integer
- `%f` - Floating-point number
- `%.2f` - Floating-point with 2 decimal places
- `%x` - Hexadecimal (lowercase)
- `%X` - Hexadecimal (uppercase)
- `%o` - Octal
- `%e` - Scientific notation

---

### 2. **`str.format()` Method** (Python 3+)
A more flexible and readable approach.

```python
name = "Alice"
age = 25
balance = 1234.567

# Positional arguments
print("Hello, {}! You're {} years old.".format(name, age))

# Indexed arguments
print("Hello, {1}! You're {0} years old.".format(age, name))

# Named arguments
print("Hello, {name}! You're {age} years old.".format(name=name, age=age))

# Dictionary unpacking
person = {"name": "Alice", "age": 25}
print("Hello, {name}! You're {age} years old.".format(**person))

# Number formatting
print("Balance: ${:.2f}".format(balance))  # Balance: $1234.57
print("Comma separator: {:,}".format(1234567890))  # 1,234,567,890

# Alignment and padding
print("{:<10}".format("left"))   # left      
print("{:>10}".format("right"))  #      right
print("{:^10}".format("center")) #   center   
print("{:*^10}".format("center"))# ***center***
```

**Format Specification Mini-Language:**
- `{:d}` - Decimal integer
- `{:f}` - Floating-point (default 6 decimals)
- `{:.2f}` - Floating-point with 2 decimals
- `{:>10}` - Right-aligned in 10 chars
- `{:<10}` - Left-aligned in 10 chars
- `{:^10}` - Centered in 10 chars
- `{:+f}` - Show sign for both positive and negative
- `{: }` - Space for positive, minus for negative

---

### 3. **F-Strings** (Python 3.6+) ⭐ **RECOMMENDED**
The most modern, readable, and performant method.

```python
name = "Alice"
age = 25
balance = 1234.567

# Basic interpolation
print(f"Hello, {name}! You're {age} years old.")

# Expressions in f-strings
print(f"Next year you'll be {age + 1}")

# Function calls
print(f"Name in uppercase: {name.upper()}")

# Conditional expressions
print(f"Result: {'Even' if age % 2 == 0 else 'Odd'}")

# Number formatting
print(f"Balance: ${balance:.2f}")  # Balance: $1234.57
print(f"Comma separator: {1234567890:,}")  # 1,234,567,890

# Alignment and padding
print(f"{'left':<10}")   # left      
print(f"{'right':>10}")  #      right
print(f"{'center':^10}") #   center   

# Self-documenting (Python 3.8+)
value = 42
print(f"{value=}")  # value=42

# Debugging example
x, y = 10, 20
print(f"x={x}, y={y}, sum={x+y}")  # x=10, y=20, sum=30
```

**F-String Conversion Flags:**
- `{variable!s}` - Calls `str()` on the variable
- `{variable!r}` - Calls `repr()` on the variable
- `{variable!a}` - Calls `ascii()` on the variable

```python
class Person:
    def __init__(self, name):
        self.name = name
    
    def __str__(self):
        return f"Person named {self.name}"
    
    def __repr__(self):
        return f"Person('{self.name}')"

p = Person("Alice")
print(f"{p!s}")  # Person named Alice
print(f"{p!r}")  # Person('Alice')
```

---

## Advanced F-String Features (Python 3.12+)

### Quotation Mark Reuse
```python
person = {"name": "Alice", "age": 25}
# Python 3.12 allows reusing quotes in embedded expressions
print(f"Hello, {person["name"]}! You're {person['age']} years old.")
```

### Backslash Support
```python
words = ["Hello", "World"]
print(f"{'\n'.join(words)}")
# Hello
# World
```

### Inline Comments
```python
data = {"value": 42}
result = f"Value: {data['value']  # Get the value from dictionary}"
```

---

## Performance Comparison

F-strings are generally faster than other methods:

| Method | Execution Time (1M iterations) |
|--------|-------------------------------|
| F-string | ~87 ms |
| % operator | ~91 ms |
| str.format() | ~145 ms |

```python
import timeit

name = "Jane"
age = 25

print("F-string:", timeit.timeit(f"f'Hello, {name}! You're {age} years old.'", number=1000000))
print("% operator:", timeit.timeit("'Hello, %s! You're %s years old.' % (name, age)", number=1000000))
print("str.format():", timeit.timeit("'Hello, {}! You're {} years old.'.format(name, age)", number=1000000))
```

---

## When to Use Each Method

| Method | Best For |
|--------|----------|
| **F-strings** | Python 3.6+, most cases, especially with expressions and debugging |
| **str.format()** | Pre-Python 3.6 code, internationalization (templates), complex formatting |
| **% operator** | Simple cases, legacy code, logging (lazy evaluation) |

### Special Cases

1. **Logging** - Use `%` for lazy evaluation:
   ```python
   import logging
   logging.warning("Error: %s", error_message)  # Only formats if warning level is enabled
   ```

2. **SQL Queries** - Never use string formatting directly! Use parameterized queries:
   ```python
   # BAD: cursor.execute(f"SELECT * FROM users WHERE name = '{name}'")
   # GOOD: cursor.execute("SELECT * FROM users WHERE name = %s", (name,))
   ```

3. **Internationalization** - Use `str.format()` with templates:
   ```python
   greeting_template = "{greeting} Pythonista!"
   print(greeting_template.format(greeting="Good Morning"))
   ```

---

## Common Formatting Examples

### Numbers
```python
# Decimal, binary, octal, hexadecimal
num = 42
print(f"Decimal: {num:d}")
print(f"Binary: {num:b}")    # 101010
print(f"Octal: {num:o}")     # 52
print(f"Hex: {num:x}")       # 2a

# Floating-point formatting
pi = 3.14159265
print(f"2 decimals: {pi:.2f}")    # 3.14
print(f"Scientific: {pi:e}")      # 3.14e+00
print(f"Percentage: {0.856:%}")   # 85.600000%

# Sign display
print(f"Positive: {+42:+f}")  # +42.000000
print(f"Negative: {-42:-f}")  # -42.000000
```

### Strings
```python
text = "Hello"
print(f"Left aligned: '{text:<10}'")   # 'Hello     '
print(f"Right aligned: '{text:>10}'")  # '     Hello'
print(f"Centered: '{text:^10}'")       # '  Hello   '

# Truncation
long_text = "Hello World"
print(f"{long_text:.5}")  # Hello
```

### Dates and Times
```python
from datetime import datetime

now = datetime.now()
print(f"Date: {now:%Y-%m-%d}")
print(f"Time: {now:%H:%M:%S}")
print(f"Full: {now:%Y-%m-%d %H:%M:%S}")

# Custom format
print(f"{now:%A, %B %d, %Y}")  # Wednesday, June 25, 2026
```

### Nested F-Strings (Python 3.12+)
```python
width = 10
value = 42
print(f"Value: {value:{width}d}")  # Value:         42
```

---

## Best Practices

1. **Use f-strings for Python 3.6+** - They're the most readable and performant
2. **Group related formatting** - Keep format specifiers consistent
3. **Use descriptive variable names** - Makes code self-documenting
4. **Avoid `import *` with string modules** - Use explicit imports
5. **Consider locale for international apps** - Use `locale.format()` for user-facing numbers

---

## Conclusion

Python provides multiple ways to format strings, each with its own advantages:

- **F-strings** are the modern standard (Python 3.6+)
- **str.format()** offers flexibility and works in older Python versions
- **% operator** is legacy but still useful for specific cases like logging

Choose the method that best fits your Python version, readability needs, and performance requirements. For new code, f-strings are generally the best choice due to their clarity, speed, and feature-rich syntax.
