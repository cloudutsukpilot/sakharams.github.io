---
layout: post
title: Dapr - Hello World
categories: [microservices, dapr]
tags: [Microservices, Dapr, CMDsheet]
image: /assets/img/microservices/dapr/dapr-posts.jpg
description: Dapr - Hello World
---

## Creating a .NET Hello World App Using Dapr

Dapr (Distributed Application Runtime) is a powerful tool that simplifies building microservices by providing capabilities like state management, service invocation, pub/sub messaging, and more. In this tutorial, we will create a simple .NET Hello World application using Dapr.

### Prerequisites

- Before starting, ensure you have the following installed:

- `.NET SDK`
- `Dapr CLI`
- `Docker (for local development)`

- Verify the installation:

```sh
dotnet --version
```

```sh
dapr --version
```

```sh
docker --version
```

### Creating a .NET Hello World App

#### Step 1: Create a .NET Web API Project

- Create a new .NET Web API project:

```sh
dotnet new webapi -n DaprHelloWorld -minimal
```

```sh
cd DaprHelloWorld
```

- Build and Run the application to verify:

```sh
dotnet build
```

```sh
dotnet run
```

- The API should be running on http://localhost:<port-no>
- Open another terminal and browse the API

```sh
curl http://localhost:<port-no>
```

- Stop the application

```sh
^c
```

#### Step 2: Add a Dapr Controller

Modify Program.cs to configure Dapr support:

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
var app = builder.Build();
app.UseAuthorization();
app.MapControllers();
app.Run();

Now, create a new controller HelloController.cs:

using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("hello")]
public class HelloController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok("Hello, Dapr!");
    }
}

Run the app again:

dotnet run

You should see Hello, Dapr! when you visit http://localhost:5000/hello.

Step 3: Run the Application with Dapr

Start the application with Dapr:

dapr run --app-id dapr-helloworld --app-port 5000 -- dotnet run

Check running Dapr services:

dapr list

You can invoke the service using Dapr:

dapr invoke --app-id dapr-helloworld --method hello --verb GET

Expected output:

Hello, Dapr!

Step 4: Deploy to Kubernetes (Optional)

To deploy on Kubernetes, initialize Dapr in Kubernetes mode:

dapr init --kubernetes

Create a Kubernetes deployment YAML (dapr-hello-deploy.yaml):

apiVersion: apps/v1
kind: Deployment
metadata:
  name: dapr-hello
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dapr-hello
  template:
    metadata:
      labels:
        app: dapr-hello
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "dapr-helloworld"
        dapr.io/app-port: "5000"
    spec:
      containers:
      - name: dapr-hello
        image: myrepo/dapr-hello:latest
        ports:
        - containerPort: 5000

Apply the deployment:

kubectl apply -f dapr-hello-deploy.yaml

Check running pods:

kubectl get pods

Conclusion

Congratulations! You have successfully built a .NET Hello World application using Dapr. You learned how to run the application locally and how to invoke it using Dapr. You also explored an optional step to deploy the app on Kubernetes.

Dapr simplifies microservices development by handling service invocation, state management, and more. Happy coding!