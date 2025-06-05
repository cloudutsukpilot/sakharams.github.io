---
layout: post
title: Terraform Variables
categories: [devops, orchestration, terraform]
tags: [DevOps, Orchestration, Terraform]
image: /assets/img/devops/orchestration/terraform/terraform-posts.jpg
description: Terraform Variables
---

### Type Constraints

Primitive Types:

| string | A sequence of Unicode characters. |
| number | A numeric value |
| bool | Either true or False |

### Constructors:

A. Collection Types:

| list | A sequence of values identified by consective whole numbers starting with zero. |
| map | A collection of values where each is identified by a string label. |
| set | A collection of UNIQUE values that do not have any secondary identifiers or ordering |

B. Structural Types

| Object | A collection of names attributes that each have their own type |
| Tuple | A sequence of elements identified by consecutive whoe numbers starting with zero, where each element has its own type |

### Differences

| Set | Similar to lists and tuples, but does not contains duplicate values and ordering of elements is lost |
| List | Lists are mutable, which means you can add, remove, or modify elements after the list is created |
| Tuples | Tuples are immutable, which means they cannot be changed once created |

### Declaration and Examples

#### String

- Declaration

```hcl
variable "city" {
  type = string
}
```

- Example
city = "california"

- Output

```hcl
output "string" {
    value = var.city
}
```

#### Number

- Declaration

```hcl
variable "age" {
  type = number
}
```

- Example
age = 32

- Output

```hcl
output "number" {
    value = var.age
}
```

#### Boolean

- Declaration

```hcl
variable "flag" {
  type = bool
}

- Example
flag = true

# Output

```hcl
output "bool" {
    value = var.flag
}
```

#### List

```hcl
# Declaration
variable userlist {
    type = list(string)
}

# Example
userlist = ["john", "jane", "mary"]

# Output
output "list" {
    value = [for user in var.userlist: user]
}
```

#### Map
```hcl
# Declaration
variable userdetails {
    type = map()
}

# Example
userdetails = {
    john = 32
    jane = 31
    mary = 30
}

# Output
output "map" {
    value = [for user in var.userdetails: user]
}

output "map_filtered" {
    value = [var.userdetails["john"]]
}
```

#### Set
```hcl
# Declaration
variable "usernames" {
  type = set(string)
}

# Example
# Set Example
usernames = [
    "john",
    "jane",
]

# Output
output "set" {
    value = [for user in var.usernames: user]
}
```

#### Object
```hcl
# Declaration
variable user = Object({
    name = string
    age = number
})

# Example
user1 = ({
    name = "John"
    age = 32
})

# Output
output "object" {
    value = "${var.objectuserdetails}"
}
```

#### Tuple
```hcl
# Declaration
variable "tupleuserdetails" {
  type = tuple([string, number, bool])
}

# Example
tupleuserdetails = [ "john", 32 , true ]

# Output
output "tuple" {
    value = "${var.tupleuserdetails}"
}
```
