---
layout: post
title: Terraform Complex Type Variables
categories: [devops, orchestration, terraform]
tags: [DevOps, Orchestration, Terraform]
---

#### List

| list(string) | The values in the list are of type “string.” | 
| list(number) |  The values in the list are of type “number” (integer or floating-point). |
| list(bool)   | The values in the list are of type “bool” (true or false). |
| list(list)   | The values in the list are lists (arrays) containing elements of the same type. |
| list(set)    | The values in the list are sets containing unique elements of the same type. | 
| list(object({ ... })) |  The values in the list are objects (complex data structures) that must conform to a specific structure defined by the object’s attributes. |

#### Map

| map(string) | The values in the map are of type “string.” | 
| map(number) |  The values in the map are of type “number” (integer or floating-point). |
| map(bool)   | The values in the map are of type “bool” (true or false). |
| map(list)   | The values in the map are lists (arrays) containing elements of the same type. |
| map(set)    | The values in the map are sets containing unique elements of the same type. | 
| map(object({ ... })) |  The values in the map are objects (complex data structures) that must conform to a specific structure defined by the object’s attributes. |

#### List of Objects
```hcl
# Declaration
variable "userlist" {
  type = list(object({
    id = string
    name = string
    city = string
  }))
}

# Example
userlist = [
    {
        id = "1"
        name = "john"
        city = "newyork"
    },
    {
        id = "2"
        name = "jane"
        city = "california"
    },
]
```



#### Map of Objects
```hcl
# Declaration
variable "mapofobjects" {
  type = map(object({
    name = string
    age = number
    city = string
    vaccinated = bool
  }))
  
}

# Example
# Example
mapofobjects = {
    user1 = {
      name = "John"
      age = 32
      city = "New York"
      vaccinated = true
    }
    user2 = {
      name = "Jane"
      age = 31
      city = "San Jose"
      vaccinated = false
    }
    user3 = {
      name = "Mary"
      age = 30
      city = "San Francisco"
      vaccinated = true
    }
  }

# Output
output "mapofobjects" {
    value = [for user in var.mapofobjects : user ]
}
```