---
layout: post
title: Azure Policies
categories: [azure]
tags: [Cloud, Azure]
---

## Introduction
- Azure Policies are a governance tool within Microsoft Azure that allow you to create, assign, and manage policies to enforce rules and ensure compliance across your Azure resources. 
- Azure Policies help you to manage and maintain the security, compliance, and operational standards of your Azure environment by providing control over your resources' configurations and deployments. 


### Key Features of Azure Policies
1. `Policy Definitions`: 
- A policy definition expresses what to evaluate and what action to take. 
- Azure provides built-in policies, but you can also create custom policies to meet specific requirements. 
- Each policy definition has a unique JSON format that includes conditions and effects.

2. `Initiative Definitions`: 
- An initiative is a collection of policy definitions that are grouped together towards achieving a singular goal. 
- This helps in managing and assigning multiple policies together as a single unit.

3. `Assignment`: 
- A policy or initiative definition can be assigned to a specific scope, such as a management group, subscription, resource group, or individual resource. 
- The scope determines where the policy is enforced.

4. `Compliance`: 
- Azure Policies evaluate resources within their scope and provide a compliance report. 
- This helps you to identify resources that do not comply with your defined policies.

5. `Effects`: 
- Policies can have different effects based on their purpose. Common effects include:
    + Deny: Prevents a resource from being created or modified if it does not comply with the policy.
    + Audit: Creates a log entry for resources that are not compliant, without preventing their creation or modification.
    + AuditIfNotExists: Audits resources if a specified condition is not met.
    + DeployIfNotExists: Deploys a specified resource if it does not already exist.
    + Append: Adds additional settings or properties to a resource during creation or modification.

### Benefits of Using Azure Policies
1. `Consistency`: Enforce organizational standards across resources and ensure that all deployments are consistent.
2. `Compliance`: Maintain compliance with industry regulations and internal governance policies.
3. `Security`: Enhance the security posture of your environment by enforcing security best practices.
4. `Operational Efficiency`: Automate the enforcement of policies to reduce manual checks and interventions.
5. `Transparency`: Gain visibility into policy compliance and resource configurations through detailed reports.


### Common Examples of Azure Policies
1. `Enforce Tagging`: Ensure that all resources have specific tags applied.

    ```json
    {
    "policyRule": {
        "if": {
        "field": "tags",
        "exists": "false"
        },
        "then": {
        "effect": "deny"
        }
    },
    "parameters": {}
    }
    ```

2. `Restrict Resource Types`: Limit the types of resources that can be deployed.

    ```json
    {
    "policyRule": {
        "if": {
        "not": {
            "field": "type",
            "in": [
            "Microsoft.Compute/virtualMachines",
            "Microsoft.Storage/storageAccounts"
            ]
        }
        },
        "then": {
        "effect": "deny"
        }
    },
    "parameters": {}
    }
    ```

3. `Enforce Naming Conventions`: Ensure resources follow a specific naming pattern.

    ```json
    {
    "policyRule": {
        "if": {
        "not": {
            "field": "name",
            "like": "prod-*"
        }
        },
        "then": {
        "effect": "deny"
        }
    },
    "parameters": {}
    }
    ```

4. `Require Secure Transfer for Storage Accounts`: Ensure that storage accounts have secure transfer enabled.

    ```json
    {
    "policyRule": {
        "if": {
        "allOf": [
            {
            "field": "type",
            "equals": "Microsoft.Storage/storageAccounts"
            },
            {
            "field": "Microsoft.Storage/storageAccounts/supportsHttpsTrafficOnly",
            "equals": "false"
            }
        ]
        },
        "then": {
        "effect": "deny"
        }
    },
    "parameters": {}
    }
    ```

5. `Audit VMs without Managed Disks`: Audit virtual machines that are not using managed disks.

    ```json
    {
    "policyRule": {
        "if": {
        "allOf": [
            {
            "field": "type",
            "equals": "Microsoft.Compute/virtualMachines"
            },
            {
            "field": "Microsoft.Compute/virtualMachines/storageProfile.osDisk.managedDisk.id",
            "exists": "false"
            }
        ]
        },
        "then": {
        "effect": "audit"
        }
    },
    "parameters": {}
    }
    ```
