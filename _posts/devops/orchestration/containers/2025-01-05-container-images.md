---
layout: post
title: Container Images
categories: [devops, orchestration, containers]
tags: [DevOps, Containers]
image: /assets/img/devops/containers/container-posts.webp
description: Explore container images & their importance, related concepts like registries, tags, layers, union filesystems, and more.
---

## Demystifying Container Images: Understanding the Backbone of Containerization

Containerization has transformed modern software development, and at the core of this innovation lies container images. These immutable building blocks define how containers are created and operate.

### What Are Container Images?

- A container image is a lightweight, standalone, and executable package that includes everything needed to run a software application.
- This includes the application code, dependencies, libraries, configuration files, and even a runtime environment.
- Benefits:
  - `Reproducibility`: Container images ensure consistent application behavior across different environments (e.g., dev, test, prod).
  - `Portability`: Images can run anywhere a container runtime (e.g., Docker) is available, irrespective of the host OS or infrastructure.
  - `Efficiency`: By packaging only the necessary components, container images are lightweight and resource-efficient compared to traditional virtual machines.

### Containers v/s Container Images

| Container Images            | Containers                      |
|-----------------------------|----------------------------------|
| Immutable and static files  | Dynamic and running instances    |
| Serves as a blueprint for containers | Created from container images |
| Cannot execute on their own | Actively running software        |

- Think of container images as a recipe, and containers as the dish prepared using that recipe.

### Container Registries

- A container registry is a repository that stores and distributes container images.
- Developers push images to registries and pull them to run on their systems.
- Registries enable seamless collaboration, deployment, and scaling by acting as centralized repositories for container images.
- Popular Registries:

1. `Docker Hub`: A public registry with official and user-contributed images.
2. `Amazon Elastic Container Registry (ECR)`: AWS-native private registry.
3. `Google Artifact Registry`: Google Cloud's container registry.
4. `Azure Container Registry (ACR)`: Azure-native private registry.

### Container Image Tags

- Tags are labels applied to container images to identify their version or purpose.
- Tags make it easier to manage and retrieve images.
- Tags are flexible and user-defined, helping differentiate images without relying solely on long IDs.
- Examples of Tags:
  - `myapp:v1.0`: Indicates version 1.0 of the "myapp" container image.
  - `myapp:beta`: Marks an image as a beta version for testing.
- **Latest Tag**
  - The `latest tag` is the default tag assigned to an image when no specific tag is provided. It usually points to the most up-to-date or stable version of an image.
    - `Default Behavior`: When pulling an image (e.g., docker pull nginx), Docker assumes the latest tag.
    - `Convenience`: Simplifies deployment pipelines by always using the most current version.
  - However, relying on latest can lead to unpredictability in production.
  - Explicitly tagging images is often a better practice.

### Container Layers

- A container image is composed of layers, each representing changes made to the base image.
- Layers are stacked to form the complete image.
- Types of Layers:
  - `Base Layer`: The foundational layer, often an operating system (e.g., Ubuntu, Alpine).
  - `Intermediate Layers`: Reflect incremental changes, such as adding dependencies or files.
  - `Top Layer`: The writable layer where container-specific changes occur at runtime.
- Example: Container layers of an nginx docker image:

![Container Layers - Docker Pull](/assets/img/devops/containers/container-layers-docker-pull.png)

- You can also check the layers of an existing image using the below command.

```sh
docker manifest inspect nginx
```

- Output

```json
{
   "schemaVersion": 2,
   "mediaType": "application/vnd.oci.image.index.v1+json",
   "manifests": [
      {
         "mediaType": "application/vnd.oci.image.manifest.v1+json",
         "size": 2295,
         "digest": "sha256:c375ae41bb29c0615ab18452822fedf1981f8ba7a7b00508b3d901b7ab682947",
         "platform": {
            "architecture": "amd64",
            "os": "linux"
         }
      },
      {
         "mediaType": "application/vnd.oci.image.manifest.v1+json",
         "size": 841,
         "digest": "sha256:391a86ec6e96e8ed40f7201cdf4fbe4a2a4bba5922d3568a402afda337b26b61",
         "platform": {
            "architecture": "unknown",
            "os": "unknown"
         }
      },
      {
         "mediaType": "application/vnd.oci.image.manifest.v1+json",
         "size": 2297,
         "digest": "sha256:196f9bcafacdad03639bcdd52248fba0b9562c6a2728742dd035a172a1f1b7b4",
         "platform": {
            "architecture": "arm",
            "os": "linux",
            "variant": "v5"
         }
      },
      {
         "mediaType": "application/vnd.oci.image.manifest.v1+json",
         "size": 841,
         "digest": "sha256:3205d233ecc5d05f8949cc94eca7b8db7685d404eb4e9131258f7f4d64aa695d",
         "platform": {
            "architecture": "unknown",
            "os": "unknown"
         }
      },
      {
         "mediaType": "application/vnd.oci.image.manifest.v1+json",
         "size": 2297,
         "digest": "sha256:40bf717e70da6a418423bfd030c14fb35197c2f9e2e97133af04b04ee24a9727",
         "platform": {
            "architecture": "arm",
            "os": "linux",
            "variant": "v7"
         }
      },
      {
         "mediaType": "application/vnd.oci.image.manifest.v1+json",
         "size": 841,
         "digest": "sha256:0eb73ee8f8eabcc99ab393dc64bacd2a22116dd6172f565860d6318df634cb71",
         "platform": {
            "architecture": "unknown",
            "os": "unknown"
         }
      },
      {
         "mediaType": "application/vnd.oci.image.manifest.v1+json",
         "size": 2297,
         "digest": "sha256:7a11619197f4bd05d95a6df55858f1aeb9ffa109c56aa72cdadaf6e7e1e841e5",
         "platform": {
            "architecture": "arm64",
            "os": "linux",
            "variant": "v8"
         }
      },
      {
         "mediaType": "application/vnd.oci.image.manifest.v1+json",
         "size": 841,
         "digest": "sha256:3d4c1a3d89fadf8cae4d9032b6f414ddf702028596eea8f9555e393d3ea27200",
         "platform": {
            "architecture": "unknown",
            "os": "unknown"
         }
      },
      {
         "mediaType": "application/vnd.oci.image.manifest.v1+json",
         "size": 2294,
         "digest": "sha256:70ff939a0a5025cac70b564f97aa9edbd6c661d9ed884eff4d3eaf113cc678d1",
         "platform": {
            "architecture": "386",
            "os": "linux"
         }
      },
      {
         "mediaType": "application/vnd.oci.image.manifest.v1+json",
         "size": 841,
         "digest": "sha256:7fc61c28183d32d3726d1282ab2f7bab20aa0c33535734d77003d0f04510440b",
         "platform": {
            "architecture": "unknown",
            "os": "unknown"
         }
      },
      {
         "mediaType": "application/vnd.oci.image.manifest.v1+json",
         "size": 2298,
         "digest": "sha256:f8e9e0906e786568ad66178582233575a5d4cd94d025a4f7f9935ffa9ccd7d50",
         "platform": {
            "architecture": "mips64le",
            "os": "linux"
         }
      },
      {
         "mediaType": "application/vnd.oci.image.manifest.v1+json",
         "size": 567,
         "digest": "sha256:46a6b897920ec7498b48859c99cfdb581bd03a7d415cab3a2b253ba1ec3ee517",
         "platform": {
            "architecture": "unknown",
            "os": "unknown"
         }
      },
      {
         "mediaType": "application/vnd.oci.image.manifest.v1+json",
         "size": 2297,
         "digest": "sha256:beaa21f475982c345a75cee16134dee2c81ef055168ce083b0b5ce6ca3c33ca1",
         "platform": {
            "architecture": "ppc64le",
            "os": "linux"
         }
      },
      {
         "mediaType": "application/vnd.oci.image.manifest.v1+json",
         "size": 841,
         "digest": "sha256:8607d980b231ea127976c1fa1bdefe48130afc0c0b709ddcbac9db1482227c00",
         "platform": {
            "architecture": "unknown",
            "os": "unknown"
         }
      },
      {
         "mediaType": "application/vnd.oci.image.manifest.v1+json",
         "size": 2295,
         "digest": "sha256:22b5b11f3afe65d1d6db91173bbb7607698f32d5377c19dc16d614d62588bdbc",
         "platform": {
            "architecture": "s390x",
            "os": "linux"
         }
      },
      {
         "mediaType": "application/vnd.oci.image.manifest.v1+json",
         "size": 841,
         "digest": "sha256:121d7283d378093b7048494f97722601da07fd5f557f11cd61ca6a08052093b9",
         "platform": {
            "architecture": "unknown",
            "os": "unknown"
         }
      }
   ]
}
```

### Union Filesystems

- Docker uses a union filesystem to manage container layers efficiently.
- A union filesystem combines multiple directories into a single, unified view.
- `OverlayFS` in Docker:
  - `Read-Only Layers`: Base and intermediate layers are immutable.
  - `Writable Layer`: A thin, writable top layer is added when a container runs, allowing runtime modifications.
- This approach minimizes storage overhead by sharing read-only layers across containers while isolating their writable layers.

### Container Image Digests

- A digest is a SHA256 hash uniquely identifying the content of an image.
- Digests ensure image integrity and are immutable, making them ideal for deployment pipelines.
- Example: sha256:abc123...

### Container Image IDs

- An image ID is a unique identifier assigned to a container image.
- While IDs are more human-readable than digests, they are mutable and can change when the image is rebuilt.
- Key Difference:
  Digests guarantee immutability, while IDs provide convenience during development.

### Conclusion

Container images are the cornerstone of containerization, enabling portability, efficiency, and consistency in modern software development. By understanding key concepts like registries, tags, layers, and digests, developers can better manage their containerized applications. Tools like union filesystems and tagging strategies further enhance the usability and reliability of container images. Whether you're building microservices, deploying applications, or exploring DevOps workflows, mastering container images is an essential skill for every modern developer.
