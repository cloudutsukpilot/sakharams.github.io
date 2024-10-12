---
layout: post
title: Arrays and Lists
categories: [Programming, csharp]
tags: [Programming, CSharp]
---

# Arrays and Lists

- An array in C# is a collection of elements of the same type stored in the exact memory location.
- There are different types of arrays:
	1. Single Dimensional Array - Single Row
	2. Multi-Dimensioal Array - Multiple Rows
	3. Jagged Array - Array of Arrays


## Single Dimensinal Array

```
// Declaring Array
var array = new int[5]{ 1, 2, 3, 4, 5 };

// Priting Array
foreach(var num in array)
    Console.WriteLine(num);
```

## Multi Dimensional Array

```
// Declaring Array
var arraysamesize = new int[3, 3];
var arraydiffsize = new int[3, 5];

// Printing Array
for (int i = 0; i < arraysamesize.GetLength(0); i++)
{
    for (int j = 0; j < arraysamesize.GetLength(1); j++)
    {
        Console.WriteLine(arraysamesize[i, j] + " ");
    }
}
```

## Jagged Array

```
// Decarling Array
var array = new int[2][];
array[0] = [1, 2, 3, 4, 5, 6];
array[1] = [7, 8, 9, 10];

// Printing Array
for (int i = 0; i < array.Length; i++)
{
    for (int j = 0; j < array[i].Length; j++)
    {
        System.Console.Write(array[i][j] + " ");
    }
    Console.WriteLine();
}
```



