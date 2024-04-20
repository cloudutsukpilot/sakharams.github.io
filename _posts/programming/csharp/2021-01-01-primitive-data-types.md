---
layout: post
title: Primitive Data Types
categories: [programming, csharp]
tags: [Programming, CSharp]
---

# Primitive Data Types

- Primitive data types are the main built-in types, and could be used to build other data types.

| Type | Description | Declaration | Naming Conventions | 
| ---- | ----------- | ----------- | ------------------ | 
| Variables | A name given to a storage location in memory | int number; <br> int Number = 1; |	CamelCase | 
| Constants	| An immutable value (cannot be changed) | const float pi = 3.14f; | PascalCase |
| Real Numbers | To declare numerical value	| float number = 1.2f; <br> decimal number = 1.2m; | CamelCase|




## Primitive Types:

| Type | C# Type | .NET Type | Bytes | Range |
| ---- | ------- | --------- | ----- | ----- | 
| Integral Numbers | byte | Byte | 1 | 0 to 255 | 
|   | short | Int16 | 2 | -32,768 to 32,767 |
|   |	int | Int32 | 4 | -2.1B to 2.1B |
|   | long | Int64 | 8 | � | 
| Real Numbers | float | Single | 4 | -3.4 x 10-38 to 3.4 x 10-38 |
|   | double | Double | 8 | � |
|   | decimal | Decimal | 16 | -7.9x10-28 to 7.9x10-28 | 
| Character | char | Char  | 2 | Unicode Characters | 
| Boolean | bool | Boolean | 1| True/False |

## Common Terms
1. Overflowing
- Overflow is an operation that occurs when a calculation produces a result that is greater in magnitude than that which a given register or storage location can store or represent.

2. Scope
- Scope is where a constant or variable has meaning.


## Type Conversion:
 - A conversion of data type can be performed based on type compatibility and data compatibilty.

| Conversion Type | Description | Example |
| --------------- | ----------- | ------ |
| Implicit Conversion | The compiler will make conversion | int i = 1; <br> Int b = i; |
| Explicit Conversion |	We ask the compiler to convert the data type | int i = 1; <br>	byte b = (byte) i; | 
| Non-Compatible Conversion | Some data types cannot be converted into one another | var stringvariable = "1234"; <br>	byte b = Convert.ToByte(stringvariable); |


##  Type Conversion Methods
| Method | Description | Syntax |
| ------ | ----------- | ------ |
| Parsing | Used to convert string type date to primitive value type. | Console.Write("Enter any number : "); <br> var number = int.Parse(Console.ReadLine()); <br> Console.WriteLine($"You have entered : {number}"); |
| ConvertClass | Used to convert one primitive type to another type. | string num = "23"; <br> int number = Convert.ToInt32(num); |
| Explicit Cast Operator() | Used with non-primitive types to up level or down level casting | int num1, num2; <br> float avg;  <br> num1 = 10; <br> num2 = 21;  <br> avg = (float)(num1 + num2) / 2;  <br> Console.WriteLine($"average is : {avg}"); |


## Data Types - Value and Reference Type

| Value Type | Reference Type | 
| ---------- | -------------- | 
| Fixed in size | Not fixed in size |
| Value types are stored in stack | Reference types are stored in managed heap |
| Actual values of data are stored in stack | A reference to the heap is stored in stack | 
| If you assign a value of a variable to another, it will create two copies. | If you assign a value of a varaible to another, it will refer to the same copy | 
| Example: All Primitive Data types (except string and object), struct and enum | Example: string, object, class, interface and delegate | 




## Operators
| Operator Type | Operator | Syntax | 
| ------------- | -------- | ------ |
| Arithmetic Operators | Add + | a + b |
|  | Subtract -  | a - b |	
|  | Multiply *	| a * b |
|  | Divide /	| a / b |
|  | Remainder %	| a % b |
|  | Increment ++ | a++ |
|  | Decrement -- | a-- |
| Comparison Operators | Equal == | a == b |
|  | Not Equal !=  | a != b |	
|  | Greater than >  | a > b |	
|  | Greater than or equal to >=  | a >= b  |	
|  | Less than <  | a < b |	
|  | Less than or equal to <=  | a <= b  |	
| Assignment Operators | Assignment = | a = 2 |
|  | Addition Assignment +=  |  a += 3 is same as a = a + 3 |	
|  | Subtraction Assignment -=  | a -= 3 is same as a = a - 3 |	
|  | Multiplication Assignment *=  | a *= 3 is same as a = a * 3 |	
|  | Division Assignment /=  | a /= 3 is same as a = a / 3 |	
| Logical Operators | And &&   | a < 5 && b > 2 |		
|  | Or ||  | a < 5 || b > 2 |		
|  | Not !  | !(a < 5 && b > 2) |	
| Bitwise Operators | And &  | (a & b) |		
|  | Or |  | (a | b) |
|  | XOR ^ | (a ^ b) | 
|  | Complement ~ | (~a ) |
|  | Left Shift << | (a << 2)|
|  | Right Shift >> | (a >> 2) |

