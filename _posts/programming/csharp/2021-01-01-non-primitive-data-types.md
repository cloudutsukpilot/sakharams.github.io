---
layout: post
title: Non-Primitive Data Types
categories: [programming, csharp]
tags: [Programming, CSharp]
---

# Non-Primitive Data Types

- Non-Primitive data types are user-defined data types created using primitive data types.
- Below are the different non-primitive data types:

## Classes
- A class combines the fields and methods(member function which defines actions) into a single unit. 
- In C#, classes support polymorphism, inheritance and also provide the concept of derived classes and base classes.

### Syntax
```
// Declaring Class
public class Dog
{

    // Field Variable
    public bool Age;
    public string Color;
    public string Name;

      // Member function or Method
      public void bark()
      {
          Console.WriteLine(� Woof Woof ");
      }
}
```

## Objects
- It is a basic unit of Object-Oriented Programming and represents real-life entities. 
- A typical C# program creates many objects and interact by invoking methods. 
- An object consists of : 
    1. State: It is represented by attributes of an object. It also reflects the properties of an object.
    2. Behavior: It is represented by the methods of an object. It also reflects the response of an object with other objects.
    3. Identity: It gives a unique name to an object and enables one object to interact with other objects.
- Example:

| Identity | State/Fields | Behaviour/Methods | 
| -------- | ------------ | ----------------- |
| Dog | Breed <br> Age <br> Color | Bark() <br> Sleep() <br> Eat() <br> Run() |

### Syntax
```
// Creating Object
var marshal = new Dog();

// Initializing Objects
marshal.Age = 5;
marshal.Name = "Marshal";
marshal.bark()

```
## Structure/Structs
- Structs are similar to classes in that they represent data structures that can contain data members and function members. 
- However, unlike classes, structs are value types and do not require heap allocation.

### Syntax
```
// Declaring Struct
public struct Coordinate
{
    public int x;
    public int y;
}
```

## Arrays
- An array in C# is a collection of elements of the same type stored in the exact memory location.
- There are different types of arrays:
    - Single Dimensional Array - Single Row
    - Multi-Dimensioal Array - Multiple Rows
    - Jagged Array - Array of Arrays

### Syntax
```
// Integer Array - Single Dimensional
int[] array= {10, 15,13,9,21};

// Integer Array - Multi Dimensional
int[,] array=new int[,] { {1,2,3}, {4,5,6}, {7,8,9} };

// Jagged Array
int[][] array=new int[2][];
array[0]=new int[6]{42,61,37,41,59,63};
array[1]=new int[4]{11,21,56,78};
```

## String
- A string is a sequence of characters.

### Syntax 
```
// Declaring String
string str = "C# Programming";
```
## Enums
- An enum is a special "class" that represents a group of constants (unchangeable/read-only variables).

### Syntax
```
// Declaring Enum
enum Level 
{
  Low,
  Medium,
  High
}

// Accessing Enum
Level myVar = Level.Medium;
Console.WriteLine(myVar);
```
