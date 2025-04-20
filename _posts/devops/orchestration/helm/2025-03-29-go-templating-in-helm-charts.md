---
layout: post
title: Go Templating in Helm Charts
categories: [devops, orchestration, helm]
tags: [DevOps, Orchestration, Helm]
image: /assets/img/devops/orchestration/helm/helm-posts.avif
description: Explore Go Templating in Helm Charts
---

## Introduction

- Helm uses Go templating to dynamically generate Kubernetes manifests. By leveraging Helm templates, you can create reusable, flexible configurations for your Kubernetes applications. In this blog, we will explore:
  - How to use values from values.yaml
  - Helm template objects like .Release and .Chart
  - Commonly used functions in Helm templating
  - Examples of using functions like lower and replace
  - Conditional statements (if-else) in Helm

### Using Values from values.yaml

{% raw %}
- Values from values.yaml can be referenced in template files using `{{ .Values }}`.
{% endraw %}

- `Example`: Accessing Values from values.yaml

- `values.yaml`

  ```yaml
  app:
    name: my-app
    replicaCount: 2
  ```

- `deployment.yaml` (inside `templates/` folder)

{% raw %}
  ```yaml
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: {{ .Values.app.name }}
  spec:
    replicas: {{ .Values.app.replicaCount }}
  ```
{% endraw %}

- When you run `helm template .`, Helm replaces placeholders with values from `values.yaml`.

### Using .Release and .Chart Objects

- **.Release Object**
  - The .Release object provides metadata about the Helm release.

    {% raw %}
    ```yaml
    metadata:
      name: {{ .Release.Name }}
      namespace: {{ .Release.Namespace }}
    ```
    {% endraw %}

  - `.Release.Name` → Name of the Helm release
  - `.Release.Namespace` → Namespace in which the chart is deployed

- **.Chart Object**
  - The `.Chart` object contains metadata from `Chart.yaml`.

    {% raw %}
    ```yaml
    metadata:
      labels:
        chart: "{{ .Chart.Name }}-{{ .Chart.Version }}"
    ```
    {% endraw %}

  - `.Chart.Name` → Name of the chart
  - `.Chart.Version` → Chart version

### Helm Templating Functions

- Helm includes several built-in functions for manipulating data. Some of the commonly used ones are:

| Function | Description                                           |
|----------|-------------------------------------------------------|
| lower    | Converts a string to lowercase                       |
| upper    | Converts a string to uppercase                       |
| replace  | Replaces a substring in a string                     |
| default  | Provides a default value if a variable is empty      |
| quote    | Wraps a string in quotes                             |
| ternary  | Returns one of two values based on a condition       |
| range    | Iterates over lists and maps                         |

- **Example 1: Using `lower` Function**

{% raw %}
```yaml
metadata:
  name: {{ .Values.app.name | lower }}
```
{% endraw %}

- If `app.name` in values.yaml is `MyApp`, this will render:

```yaml
metadata:
  name: myapp
```

- **Example 2: Using `replace` Function**

{% raw %}
```yaml
metadata:
  annotations:
    description: "{{ .Values.app.name | replace "-" "_" }}"
```
{% endraw %}

- If `app.name` is `my-app`, the result will be:

```yaml
metadata:
  annotations:
    description: "my_app"
```

### Example: Using range to Loop Through a List

- If you have a list of environment variables in values.yaml:

```yaml
env:
  - name: ENV
    value: production
  - name: DEBUG
    value: "false"
```

- You can iterate over them in your template:

{% raw %}
```yaml
env:
{{- range .Values.env }}
  - name: {{ .name }}
    value: {{ .value }}
{{- end }}
```
{% endraw %}

- This will generate:

```yaml
env:
  - name: ENV
    value: production
  - name: DEBUG
    value: "false"
```

- If you need to iterate over key-value pairs in a dictionary:

```yaml
config:
  app_name: MyApp
  debug: "true"
```

- You can use:

{% raw %}
```yaml
{{- range $key, $value := .Values.config }}
{{ $key }}: {{ $value }}
{{- end }}
```
{% endraw %}

- This will output:

```yaml
app_name: MyApp
debug: true
```

### Conditional Statements (if-else)

- Helm allows conditional rendering using `if, else, and end`.

- **Example: Using if-else to Enable Ingress**

`values.yaml`

```yaml
ingress:
  enabled: true
```

`ingress.yaml`

{% raw %}
```yaml
{{- if .Values.ingress.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ .Release.Name }}-ingress
spec:
  rules:
    - host: {{ .Release.Name }}.example.com
{{- else }}
# Ingress is disabled
{{- end }}
```
{% endraw %}

- If ingress.enabled is true, the ingress resource is created. Otherwise, the comment # Ingress is disabled appears in the rendered YAML.

### Conditional Operators for Template Logic

| Operator | Description                          | Example                                           |
|----------|--------------------------------------|---------------------------------------------------|
| eq       | Checks if two values are equal       | {% raw %} `{{ if eq .Values.env "production" }}` {% endraw %} |
| ne       | Checks if two values are not equal   | {% raw %} `{{ if ne .Values.env "development" }}` {% endraw %} |
| lt       | Checks if the first value is less than the second | {% raw %} `{{ if lt .Values.replicas 3 }}` {% endraw %}  |
| gt       | Checks if the first value is greater than the second | {% raw %} `{{ if gt .Values.replicas 1 }}` {% endraw %}  |
| le       | Checks if the first value is less than or equal to the second | {% raw %} `{{ if le .Values.replicas 5 }}` {% endraw %} |
| ge       | Checks if the first value is greater than or equal to the second | {% raw %} `{{ if ge .Values.replicas 2 }}` {% endraw %} |
| and      | Logical AND condition                | {% raw %} `{{ if and .Values.enabled .Values.ingress.enabled }}` {% endraw %} |
| or       | Logical OR condition                 | {% raw %} `{{ if or .Values.enabled .Values.backup.enabled }}`  {% endraw %} |

### Conclusion

Go templating in Helm provides powerful features for dynamic configuration. By using values from values.yaml, built-in objects like .Release and .Chart, common functions, and conditionals, you can create flexible Helm charts that adapt to different environments.

Mastering Helm templating will help you build robust and reusable Kubernetes deployments.
