---
layout: post
title: Terragrunt Errors
categories: [devops, iac, terragrunt]
tags: [DevOps, IAC, Terragrunt]
---

## Introduction

- Below is the list of common Terragrunt Errors and Solutions.

1. **Dependency Error**
    - `Error`:

        ```sh
         Module ./aks has external dependency ../../entraid/resources/group
        Should Terragrunt apply the external dependency? (y/n)
        ```

    - `Cause`:
        + 
    - `Solution`:

2. **Operating System Mismatch**
    - `Error`:

        ```sh
        Error running hook tflint with message: exec: "echo": executable file not found in %PATH% prefix=
        ```

    - `Cause`:
        + The `before_hook` for terraform was configured on run using the default shell on the linux operating system. 
        + The error was generated while executing the code on Powershell.
        + Code causing the error:

            ```sh
            terraform {
                before_hook "tflint" {
                    commands     = ["init"]
                    execute      = ["echo"]
                    run_on_error = false
                }
            }
            ```

        + `Solution`:
            + Changed the code to use CMD as the default shell for execution.

            ```sh
            terraform {
                before_hook "tflint" {
                    commands     = ["init"]
                    execute      = ["cmd", "/c", "echo", "Running tflint"]
                    run_on_error = false
                }
            }
            ```
