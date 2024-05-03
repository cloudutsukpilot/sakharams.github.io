---
layout: post
title: Kubernetes Deployment - YAML
categories: [devops, orchestration, kubernetes]
tags: [DevOps, Orchestration, Kubernetes]
---

## Deployment YAML:

- Kubernetes deployment Yaml contains the following main specifications.

#### 1. **apiVersion**
- This specifies the API version of the Kubernetes deployment object and varies between each K8 version.
- Kubernetes contains three API versions.

  | Alpha | This is the early release candidate. |
  | | It might contain bugs and there is no guarantee that it will work in the future. |
  | | Example: `scalingpolicy.kope.io/v1alpha1` |
  | Beta | The API’s become beta once its alpha tested. | 
  | | It will be in continuous development & testing until it becomes stable. |
  | | Beta versions will most likely go into the Kubernetes main APIs. |
  | | Example: `batch/v1beta1` |
  | Stable | The APIs which does not contain alpha and beta goes into the stable category. | 
  | | Only stable versions are recommended to be used in production systems. |
  | | Example: `apps/v1` |

- These APIs could belong to different API groups.

  | Kind | Version | 
  | POD	| v1 |
  | Service	| v1 |
  | ReplicaSet | apps/v1 | 
  | Deployment | apps/v1 | 
- Example:
  ```
  apiVersion: v1
  ```


####  2. kind
- Kind describes the type of the object/resource to be created. 
- In our case it's a deployment object. 
- Following are the main list of objects/resources supported by Kubernetes.

  | componentstatuses | configmaps | horizontalpodautoscalers | limitranges |
  | pods | resourcequotas | serviceaccounts | daemonsets |
  | deployments | ingress | namespaces | persistentvolumes |
  | replicasets | services | events | endpoints |
  | jobs | nodes | persistentvolumeclaims | replicationcontrollers |
- Example:
  ```
  kind: deployment
  ```

####  3. metadata
- It is a set of data to uniquely identify a Kubernetes object. 
- Following are the key metadata that can be added to an object.
  + a. **labels**: 
    * Key-value pairs primarily used to group and categorize deployment object. 
    * It is intended for an object to object grouping and mapping using selectors. 
    * For example, kubernetes service uses the pod labels in its selectors to send traffic to the right pods. 
  + b. **name**: 
    * It represents the name of the deployment to be created.
  + c. **namespace**: 
    * Name of the namespace where you want to create the deployment.
  + d. **Annotations**: 
    * key-value pairs like labels, however, used for different use cases. 
    * You can add any information to annotations. 
    * For example, you can have an annotation like "monitoring" : "true" and external sources will be able to find all the objects with this annotation to scrape its metrics. 
    * Objects without this annotation will be omitted.
  + e. There are other system generated metadata such us UUID, timestamp, resource version etc. that gets added to each deployment.
- Example:
  ```
  metadata:
    name: resource-name
    namespace: deployment-demo
    labels:
      app: web
      platform: java
      release: 18.0
    annotations:
      monitoring: true
      prod: true
  ```

#### 4. spec
- Under spec, we declare the desired state and characteristics of the object we want to have. 
- For example, in deployment spec, we would specify the number of replicas, image name etc. 
- Kubernetes will make sure all the declaration under the spec is brought to the desired state.
- Spec has three important subfields.
  + a. replicas: 
    * It will make sure the numbers of pods running all the time for the deployment. 
    
  + b. selector: 
    * It defines the labels that match the pods for the deployments to manage. 
    * Example:

  + c. template: 
    * It has its own metadata and spec. 
    * Spec will have all the container information a pod should have. 
    * Container image info, port information, ENV variables, command arguments etc. 

- Sample YAML:
  ```
  spec:
    replicas: 3
  selector:
      matchLabels:
        app: nginx    
  template:
      metadata:
        labels:
          app: nginx
      spec:
        containers:
          - image: nginx
            name: nginx
  ```
