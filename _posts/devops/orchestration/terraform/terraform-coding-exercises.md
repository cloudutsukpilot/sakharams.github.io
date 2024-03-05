---
layout: post
title: Terraform Coding Exercises
---

1. Write a piece of code which demonstrates use of locals.

    ```hcl
    locals {
    bucket_name = "bucket1"
    env         = "dev"
    }

    resource "aws_s3_bucket" "my_test_bucket" {
    bucket = local.bucket_name
    acl    = "private"
    
    tags = {
        Name        = local.bucket_name
        Environment = local.env
    }
    }
    ```

2. Write a piece of code which would demostrate the use of dependencies.

    ```hcl
    resource "aws_s3_bucket" "example" { }

    resource "aws_instance" "example_c" {
    ami           = data.aws_ami.amazon_linux.id
    instance_type = "t2.micro"

    depends_on = [aws_s3_bucket.example]
    }

    module "example_sqs_queue" {
    source  = "terraform-aws-modules/sqs/aws"
    version = "3.3.0"

    depends_on = [aws_s3_bucket.example, aws_instance.example_c]
    }
    ```

3. Write a piece of code which demostrates usage of multi cloud providers in the same state file.

    providers.tf
    ```hcl
    terraform {
    required_version = ">= 0.13"
    required_providers {
        azurerm = {
        source = "hashicorp/azurerm"
        version = "2.45.1"
        }
        aws = {
        source = "hashicorp/aws"
        version = "2.13.2"
        }
    }
    }

    provider "azurerm" {
    features {}
    }
    ```

    main.tf
    ```hcl
    resource "azurerm_public_ip" "publicip" {
    name                = "myTFPublicIP-robert"
    location            = "west europe"
    resource_group_name = azurerm_resource_group.rg.name
    allocation_method   = "Static"
    }

    resource "cloudflare_record" "foobar" {
    zone_id = "example.com"
    name    = "www"
    value   = azurerm_public_ip.publicip.ip_address
    type    = "A"
    ttl     = 3600
    }
    ```

4. Write a piece of code which demostrates usage of different subcriptions in azure.

    providers.tf
    ```hcl
    provider "azurerm" {
    alias = "dev"
    subscription_id = var.dev_sub_id
    features {}
    }

    provider "azurerm" {
    alias = "prod"
    subscription_id = var.prod_sub_id
    features {}
    }
    ```

    main.tf
    ```hcl
    resource azurerm_resource_group "prod_rg" {
    provider = azurerm.prod
    name     = "E1-PROD-RG"
    location = "eastus"
    }
    ```