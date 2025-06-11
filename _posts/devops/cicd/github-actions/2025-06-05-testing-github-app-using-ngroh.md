---
layout: post
title: GitHub App - Testing Locally
categories: [devops, cicd, github actions]
tags: [DevOps, CICD, Github Actions, CMDsheet]
image: /assets/img/devops/cicd/githubactions/github-actions-posts.jpg
description: Testing a GitHub App using Python and Ngrok
---

### Introduction

Below is the complete working FastAPI example that:

- Listens on port 3000
- Handles:
  - `POST /webhook` — for GitHub webhooks
  - `GET /callback` — for GitHub OAuth callback

### ✅ FastAPI Server Creation Steps

- Create a `main.py` file for FastAPI Server

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, PlainTextResponse
import uvicorn

app = FastAPI()

# POST /webhook endpoint
@app.post("/webhook")
async def webhook(request: Request):
    payload = await request.json()
    print(" Received webhook payload:", payload)
    return JSONResponse(content={"status": "received"}, status_code=200)

# GET /callback endpoint
@app.get("/callback")
async def callback(code: str = ""):
    print(f" OAuth callback code: {code}")
    return PlainTextResponse("OAuth callback received.", status_code=200)

if __name__ == "__main__":
    uvicorn.run("main:app", port=3000, reload=True)
```

- To Run

- Install FastAPI + Uvicorn:

```bash
pip install fastapi uvicorn
```

- Run the Server:

```bash
python main.py
```

- It will be available at http://localhost:3000

### Sample URLs

- `Webhook URL`
  - http://localhost:3000/webhook
  - Use this in your GitHub App to receive event payloads like pushes, PRs, etc.

- `Callback URL`
  - http://localhost:3000/callback?code=...
  - GitHub will redirect to this URL after the user authorizes your app.

- Expose with Ngrok (Optional for GitHub to reach your local server)

```bash
ngrok http 3000
```

- Use the generated public URLs (like https://abc123.ngrok.io/webhook) in your GitHub App setup.
