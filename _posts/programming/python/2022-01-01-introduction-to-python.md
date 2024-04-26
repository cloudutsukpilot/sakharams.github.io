---
layout: post
title: Introduction to Python
categories: [python]
tags: [Python]
---

#### Variables
- Variables are containers for storing the data values, with which we can further reference and manipulate the values.
- Literals are values used in Python. Types are:

| Data Type | Value | Description |
| --- | --- | --- |
| Numeric | Integer | Whole numbers |
| | Float | Decimal number |
| | Complex | Contains real and imaginary part |
| Boolean | True | Represents the truth value |
| | False | Represents the false value |
| Collection | List | Ordered and changeable collection |
| | Tuples | Ordered and unchangeable collection |
| | Dictionary | Unordered, changeable and indexed collection |
| | Sets | Unordered and unindexed collection |
| String | Sequence of Characters | A sequence of Unicode characters |
| Special | None | Represents the absence of value |
| | Not a Number (NaN) | Represents a numeric value that is undefined or unrepresentable |

#### Operators in Python

| Operator Type | Operator | Description |
| --- | --- | --- |
| **Arithmetic Operators** | Addition: `+` | Adds values on either side of the operator |
| | Subtraction: `-`  | Subtracts right hand operand from left hand operand |
| | Multiplication: `*`  | Multiplies values on either side of the operator |
| | Division: `/`  | Divides left hand operand by right hand operand |
| | Modulus: `%` | Divides left hand operand by right hand operand and returns the remainder |
| | Exponentiation: `**` | Performs exponential (power) calculation on operators |
| | Floor Division: `//` | The division of operands where the result is the quotient in which the digits after the decimal point are removed |
| **Comparison Operators** | Equal to: `==` | Returns True if both operands are equal |
| | Not equal to: `!=` | Returns True if operands are not equal |
| | Greater than: `>` | Returns True if left operand is greater than the right one |
| | Less than: `<` | Returns True if left operand is less than the right one |
| | Greater than or equal to: `>=` | Returns True if left operand is greater than or equal to the right one |
| | Less than or equal to: `<=` | Returns True if left operand is less than or equal to the right one |
| **Assignment Operators** | Assign: `=` | Assigns values from right side operands to left side operand |
| | Add and assign: `+=` | It adds right operand to the left operand and assign the result to left operand |
| | Subtract and assign: `-=` | It subtracts right operand from the left operand and assign the result to left operand |
| | Multiply and assign: `*=` | It multiplies right operand with the left operand and assign the result to left operand |
| | Divide and assign: `/=` | It divides left operand with the right operand and assign the result to left operand |
| | Modulus and assign: `%=` | It takes modulus using two operands and assign the result to left operand |
| | Floor division and assign: `//=` | It performs floor division on operators and assign value to the left operand |
| | Exponent and assign: `**=` | Performs exponent calculation on operators and assign value to the left operand |
| **Logical Operators** | Logical AND: `and` | Returns True if both the operands are true |
| | Logical OR: `or` | Returns True if either of the operands is true |
| | Logical NOT: `not` | Returns True if operand is false (complements the operand) |
| **Bitwise Operators** | Bitwise AND: `&` | Performs bitwise AND operation |
| | Bitwise OR: `|` | Performs bitwise OR operation |
| | Bitwise NOT: `~` | Inverts all the bits |
| | Bitwise XOR: `^` | Performs bitwise exclusive OR operation |
| | Bitwise right shift: `>>` | Shift right by pushing copies of the leftmost bit on the left, and let the rightmost bits fall off |
| | Bitwise left shift: `<<` | Shift left by pushing zeros in from the right and let the leftmost bits fall off |
| **Identity Operators** | `is` | Returns True if both variables are the same object |
| | `is not` | Returns True if both variables are not the same object |
| **Membership Operators** | `in` | Returns True if a sequence with the specified value is present in the object |
| | `not in` | Returns True if a sequence with the specified value is not present in the object |


#### Collection Object - Strings:

**Common Operations:**
1. Concatenation
    ```
    x = "Hello"
    y = " Python"
    print(x+y)
    ```
2. Repetition
    ```
    x = "Hello "
    print(x*2)
    ```
3. Membership Operators
    ```
    x = "hello python"
    if "hello" in x:
        print(True)
    else:
        print(False)
    ```
4. Length
    ```
    x = "hello python"
    print(len(x))
    ```
5. Indexing
    ```
    x = "hello python"
    print(x[0])
    print(x[6])
    ```
6. Slicing
    ```
    x = "hello python"
    x[1:7]
    ```

**Builtin Functions**

| Function | Description |
| --- | --- |
| `strip()` | Returns a copy of the string with both leading and trailing characters removed |
| `lower()` | Converts all uppercase characters in a string into lowercase characters and returns it |
| `upper()` | Converts all lowercase characters in a string into uppercase characters and returns it |
| `len()` | Returns the number of items in an object |
| `type()` | Returns the type of an object |
| `print()` | Prints the specified message to the screen |
| `input()` | Reads a line from input, converts it to a string and returns it |
| `int()` | Converts a specified value into an integer |
| `str()` | Converts a specified value into a string |
| `float()` | Converts a specified value into a floating point number |
| `list()` | Converts a specified value into a list |
| `dict()` | Converts a specified value into a dictionary |
| `set()` | Converts a specified value into a set |
| `sorted()` | Returns a sorted list from the specified iterable |
| `range()` | Returns a sequence of numbers, starting from 0 by default, and increments by 1 (also default), and stops before a specified number |
| `sum()` | Returns the sum of all items in an iterable |
| `max()` | Returns the item with the highest value in an iterable |
| `min()` | Returns the item with the lowest value in an iterable |


#### Data Structures

| Data Structure | Description | Example |
| --- | --- | --- |
| List | A collection which is ordered and mutable. Allows duplicate members. | `[1, 2, 3, 4, 5]` |
| Tuple | A collection which is ordered and immutable. Allows duplicate members. | `(1, 2, 3, 4, 5)` |
| Set | A collection which is unordered and unindexed. No duplicate members. | `{1, 2, 3}` |
| Dictionary | A collection which is unordered, changeable and indexed. No duplicate members. | `{'name': 'John', 'age': 30}` |
| String | A collection of characters. | `"Hello, World!"` |

**List Comprehension**
- List comprehension is a concise and expressive way to create lists in python.
- It provides a more compact syntax for creating lists by specifying the elements of the list and the conditions under which they should be included.
- Sytax:
  + new_list = [expression `for` item `in` iterable `if` condition ]
- Example:

    ```
    x = [1, 2, 3, 4, 5, 6, 7, 8]

    result = []
    for i in x:
        result.append(i**2)
    print(result)
    ```
- Using List Comprehension
    ```
    x = [1, 2, 3, 4, 5, 6, 7, 8]
    result = [i**2 for i in x]
    print(result)
    ```
    **OR**
    ```
    x = [1, 2, 3, 4, 5, 6, 7, 8]
    result = [i**2 for i in x if i%2==0]
    print(result)
    ```

**Buit-in Functions - Lists**

| Function | Description |
| --- | --- |
| `append()` | Adds an element at the end of the list |
| `clear()` | Removes all the elements from the list |
| `copy()` | Returns a copy of the list |
| `count()` | Returns the number of elements with the specified value |
| `extend()` | Add the elements of a list (or any iterable), to the end of the current list |
| `index()` | Returns the index of the first element with the specified value |
| `insert()` | Adds an element at the specified position |
| `pop()` | Removes the element at the specified position |
| `remove()` | Removes the item with the specified value |
| `reverse()` | Reverses the order of the list |
| `sort()` | Sorts the list |

**Buit-in Functions - Tuples**

| Function | Description |
| --- | --- |
| `count()` | Returns the number of times a specified value occurs in a tuple |
| `index()` | Searches the tuple for a specified value and returns the position of where it was found |

**Buit-in Functions - Sets**

| Function | Description |
| --- | --- |
| `add()` | Adds an element to the set |
| `clear()` | Removes all the elements from the set |
| `copy()` | Returns a copy of the set |
| `difference()` | Returns a set containing the difference between two or more sets |
| `difference_update()` | Removes the items in this set that are also included in another, specified set |
| `discard()` | Remove the specified item |
| `intersection()` | Returns a set, that is the intersection of two other sets |
| `intersection_update()` | Removes the items in this set that are not present in other, specified set(s) |
| `isdisjoint()` | Returns whether two sets have a intersection or not |
| `issubset()` | Returns whether another set contains this set or not |
| `issuperset()` | Returns whether this set contains another set or not |
| `pop()` | Removes an element from the set |
| `remove()` | Removes the specified element |
| `symmetric_difference()` | Returns a set with the symmetric differences of two sets |
| `symmetric_difference_update()` | inserts the symmetric differences from this set and another |
| `union()` | Return a set containing the union of sets |
| `update()` | Update the set with the union of this set and others |

**Buit-in Functions - Dictionary**

| Function | Description |
| --- | --- |
| `clear()` | Removes all the elements from the dictionary |
| `copy()` | Returns a copy of the dictionary |
| `fromkeys()` | Returns a dictionary with the specified keys and value |
| `get()` | Returns the value of the specified key |
| `items()` | Returns a list containing a tuple for each key value pair |
| `keys()` | Returns a list containing the dictionary's keys |
| `pop()` | Removes the element with the specified key |
| `popitem()` | Removes the last inserted key-value pair |
| `setdefault()` | Returns the value of the specified key. If the key does not exist: insert the key, with the specified value |
| `update()` | Updates the dictionary with the specified key-value pairs |
| `values()` | Returns a list of all the values in the dictionary |