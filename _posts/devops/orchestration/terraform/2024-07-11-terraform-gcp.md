---
layout: post
title: Terraform - GCP
categories: [devops, orchestration, terraform]
tags: [DevOps, Orchestration, Terraform]
---

## Introduction
- To get started with GCP using Terraform, we can follow these steps:

1. **Install Terraform**
- Download and install Terraform from the official Terraform website.

2. **Install Google Cloud SDK**
- Download and install the Google Cloud SDK.

3. **Authenticate with Google Cloud**
- Run `gcloud auth login` to authenticate your Google Cloud account.

4. **Set your project**
- Run `gcloud config set project [PROJECT_ID]` to set the GCP project.

5. **Create a Service Account**
- Go to the Google Cloud Console and navigate to IAM & Admin > Service Accounts.
- Create a new service account and download the JSON key file.

6. Set Up Terraform Configuration:
- Create a main.tf file with the following content:

```terraform
provider "google" {
  credentials = file("path/to/your-service-account-file.json")
  project     = "your-project-id"
  region      = "us-central1"
}

resource "google_compute_instance" "vm_instance" {
  name         = "test-instance"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-9"
    }
  }

  network_interface {
    network = "default"

    access_config {
    }
  }
}
```

7. Initialize and Apply Terraform Configuration:
- Run `terraform init` to initialize the configuration.
- Run `terraform apply` and follow the prompts to create resources.