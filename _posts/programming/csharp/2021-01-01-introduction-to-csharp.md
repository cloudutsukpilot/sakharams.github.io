---
layout: post
title: Introduction to CSharp
categories: [Programming, csharp]
tags: [Programming, CSharp]
---

# Introduction to C#


## Difference between C# & .NET
- C# is a programming language.
- .NET is a framework for building applications on Windows.
- .NET framework consists of:

	1. Common Language Runtime(CLR)
		- CLR is used to convert the Intermediate Language (IL) code into the Native code which can be executed on the underlying hardware.
		- The process of converting IL code to Native code is called Just in Time(JIT) compilation.
	
	2. Class Library
		- A class library file is a collection of classes and namespaces in C# without any entry point method like 'Main'. 
		- Once we create a class library file it can be used in the C# project and classes inside it can be used as required.

## Architecture of .NET Applications:
- Application consists of building blocks called classes.
- Class contains data/fields and methods.
	* Class: Car
	* Data:  Make, Model, Color
	* Methods: Start (), Move ()
- Namespace is a container for related classes to organize large number of classes in a application.
- Assembly is a container of related namespaces and can be an exe or dll file.
- While compiling an application, the complier build one or more assemblies depending upon the code partition.



## C# Program Structure:
```
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MyFirstCSharpProgram
{
	class Program
	{
		static void Main(string[] args)
		{
			// My first comment in C#
			Console.WriteLine("Hello World...");
		}
	}
}
```

| Line No.s | Description | 
| --------- | ----------- |
| Lines 1-4 | The using keyword is used to include the System and other namespaces in the programs. | 
| Line 6    | This is a namespace declaration. A namespace is collection of classes. Ex. The MyFirstCSharpProgram namespace contains the class Program. | 
| Line 8    | This is the class declaration, the class Program contains the data and method definitions that your program uses. <br> Classes generally would contain more than one methods. <br> Methods define the behaviour of the class. However, the Program class has only one method Main. | 
| Line 10   | It defines the Main method, which is the entry point for all C# programs. The Main method states what the class will do when executed. | 


## Data Types in C#
- A data type specifies the size and type of variable values.
- There are two types of data type in C#: 

| Type | Description | Example |
| ---- | ----------- | ------- |
| Primitive | Primitive data types are the main built-in types. | byte <br> short <br> int <br> float <br> double <br> long <br> char <br> bool <br> datetime <br> string <br> object |
| Non-Primitive | Non-Primitive data types are user defined data types. | class <br> struct <br> enum <br> interface <br> delegate <br> array |