---
layout: post
title: Python Entrypoint Explained
categories: [Programming, python]
tags: [Python]
image: /assets/img/programming/python/python-posts.png
---

## The `if __name__ == "__main__":` Statement

The `if __name__ == "__main__":` statement is a control mechanism that determines whether a Python file is being run directly as a script or being imported as a module into another file. It serves as the standard "entry point" idiom for Python programs.

## How It Works

Before executing your code, the Python interpreter automatically sets a few special variables. One of these variables is `__name__`.

### Running Directly
If you run a file using a terminal command like `python myscript.py`, Python assigns the string `"__main__"` to the `__name__` variable. The conditional statement evaluates to `True`, and the code block inside executes.

### Importing as a Module
If another Python file imports your file using `import myscript`, Python assigns the actual file name (`"myscript"`) to the `__name__` variable. The conditional statement evaluates to `False`, and the code block inside is completely skipped.

## Why We Use It

The primary benefit of this construct is code reusability and preventing unintended side effects. Without this check, any top-level executable code (like a function call, a print statement, or a script initialization) will run automatically the exact moment the file is imported elsewhere.

By utilizing this block, you can safely write a file that serves a dual purpose:

- It can be run standalone to execute specific logic or testing workflows.
- It can be imported by other scripts to reuse its functions and classes without triggering unwanted executions.

## Code Example

Consider a file named `calculator.py`:

```python
def add(a, b):
    return a + b

# This block only executes if you run 'python calculator.py' directly
if __name__ == "__main__":
    print("Running calculator.py directly!")
    # Quick test code
    result = add(5, 5)
    print(f"Test Result: {result}")
```

### Scenario A: Running Directly

If you execute this file from your terminal:

```bash
python calculator.py
```

**Output:**

```text
Running calculator.py directly!
Test Result: 10
```

### Scenario B: Importing into Another File

If you create a separate file named `main.py` and import the calculator:

```python
import calculator

print("Running main.py!")
print(calculator.add(3, 7))
```

**Output:**

```text
Running main.py!
10
```



