---
layout: page
Title: Terraform Iterators
---

Using for_each on a list of strings
Using for_each on a list of objects
Using for_each to combine two lists
Using for_each in a nested block
Using for_each as a conditional

1. Using for_each on a list of strings

locals {
  ip_addresses = ["10.0.0.1", "10.0.0.2"]
}

resource "example" "example" {
  for_each   = toset(local.ip_addresses)
  ip_address = each.key
}
2. Using for_each on a list of objects

locals {
  virtual_machines = [
    {
      ip_address = "10.0.0.1"
      name       = "vm-1"
    },
    {
      ip_address = "10.0.0.1"
      name       = "vm-2"
    }
  ]
}    

resource "example" "example" {
  for_each   = {
    for index, vm in local.virtual_machines:
    vm.name => vm # Perfect, since VM names also need to be unique
    # OR: index => vm (unique but not perfect, since index will change frequently)
    # OR: uuid() => vm (do NOT do this! gets recreated everytime)
  }
  name       = each.value.name
  ip_address = each.value.ip_address
}
3. Using for_each to combine two lists

locals {
  domains = [
    "https://example.com",
    "https://stackoverflow.com"
  ]
  paths = [
    "/one",
    "/two",
    "/three"
  ]
}
    
resource "example" "example" {
  # Loop over both lists and flatten the result
  urls = flatten([
    for domain in local.domains : [
      for path in local.paths : {
        domain = domain
        path   = path
      }
    ]
  ]))
}
4. Using for_each on a nested block

# Using the optional() keyword makes fields null if not present
variable "routes" {
  type = list(
    name   = string
    path   = string
    config = optional(object({
      cache_enabled = bool
      https_only    = bool
    }))
  default = []
}

resource "example" "example" {
  name = ...
  
  dynamic "route" {
    for_each = {
      for route in var.routes :
      route.name => route
    }
    content {
      # Note: <top_level_block>.value.<object_key>
      name = route.value.name
    }
    
    dynamic "configuration" {
      # Note: <top_level_block>.value.<optional_object_key>
      for_each = route.value.config != null ? [1] : []
      content {
        cache_enabled = route.value.config.cache_enabled
        https_only    = route.value.config.https_only
      }
    }
  }
5. Using for_each as a conditional

variable "deploy_example" {
  type        = bool
  description = "Indicates whether to deploy something."
  default     = true
}

# Using count and a conditional, for_each is also possible here.
# See the next solution using a for_each with a conditional.
resource "example" "example" {
  count      = var.deploy_example ? 0 : 1
  name       = ...
  ip_address = ...
}

variable "enable_logs" {
  type        = bool
  description = "Indicates whether to enable something."
  default     = false
}

resource "example" "example" {
  name       = ...
  ip_address = ...

  # Note: dynamic blocks cannot use count!
  # Using for_each with an empty list and list(1) as a readable alternative. 
  dynamic "logs" {
    for_each = var.enable_logs ? [] : [1]
    content {
      name     = "logging"
    }
  }
}