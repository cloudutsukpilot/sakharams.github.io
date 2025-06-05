---
layout: post
title: Ngrok - Securely Exposing Your Local App to the Internet
categories: [networking, reverse proxy]
tags: [Networking, Reverse Proxy]
image: /assets/img/networking/networking-posts.jpg
description: How to create a secure tunnel from a public internet URL to your local machine
---

### Introduction

Imagine you're building a web application on your local machine, and you want to demo it to a remote team member, test it on a mobile device, or connect it to a third-party webhook (like GitHub or Stripe). Normally, this would involve complex networking setup like configuring your router, firewall, and dynamic DNS.

Enter `Ngrok` — a tool that makes this ridiculously easy.

### What is Ngrok?

- Ngrok is a tool that creates secure tunnels from the public internet to your local machine.
- It acts as a reverse proxy, forwarding traffic from a public URL to a port on your localhost.

- Ngrok enables you to:
  - Expose local web servers to the internet
  - Securely share your work-in-progress with others
  - Receive webhooks from third-party services
  - Debug and replay HTTP traffic
  - Test APIs and websites from anywhere

### Use Cases of Ngrok

1. Webhook testing (Stripe, GitHub, Twilio, etc.)
2. Mobile app testing (connect to local APIs)
3. Remote demos and presentations
4. Cross-device development
5. Secure introspection with HTTPS tunnels
6. IoT device connectivity to local services

### How to Install Ngrok

`Step 1`: Sign Up

- Go to https://ngrok.com/ and sign up for a free account. This will give you an authtoken, which is needed to use the service.

`Step 2`: Download Ngrok

- Ngrok is available for macOS, Windows, and Linux.

```bash
# For Linux/macOS:
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-stable-linux-amd64.zip
unzip ngrok-stable-linux-amd64.zip
sudo mv ngrok /usr/local/bin
```

- Or use the [official installers](https://dashboard.ngrok.com/get-started/setup/linux) for your OS.

`Step 3`: Connect Your Account

- Once installed, connect Ngrok to your account using your authtoken:

```bash
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

### How to Expose a Local URL

- Let's say you're running a web server on http://localhost:5000.

- Start a tunnel:

    ```bash
    ngrok http 5000
    ```

- You'll see output like this:

    ```bash
    Forwarding                    https://abcd1234.ngrok.io -> http://localhost:5000
    ```

- You can now share https://abcd1234.ngrok.io with anyone, and they’ll be able to access your local server!

### Using a Static Domain (Custom Subdomain)

- Ngrok offers static domains for Pro plans and above.

- Example:

    ```bash
    ngrok http --subdomain=mydevapp 5000
    ```

- Output:

    ```bash
    https://mydevapp.ngrok.io -> http://localhost:5000
    ```

- Make sure your subdomain is available and your plan supports reserved domains.

### Bonus Features

1. `Inspect Requests`

- Ngrok has a built-in dashboard:

```cpp
http://127.0.0.1:4040
```

- It shows detailed request/response logs. Super helpful for debugging!

2. `HTTPS Support`

- Ngrok automatically provides HTTPS tunnels, even if your local server doesn't support it.

3. `Authentication`

- Secure your tunnel with basic auth:

```bash
ngrok http -auth="user:pass" 5000
```

4. `Ngrok Configuration File (~/.ngrok2/ngrok.yml)`

- You can define tunnels in a config file for easier reuse:

```yaml
authtoken: YOUR_AUTHTOKEN
tunnels:
  web:
    proto: http
    addr: 5000
    subdomain: mydevapp
```

- Start with:

```bash
ngrok start web
```

### Security Considerations

- Ngrok tunnels are temporary by default, unless reserved.
- Treat shared URLs like passwords — anyone with the URL can access your service.
- Always protect sensitive endpoints with authentication or IP whitelisting.

### Alternatives to Ngrok

- While Ngrok is popular, here are some alternatives:

| Tool                | Description                          |
|---------------------|--------------------------------------|
| LocalTunnel         | Open-source alternative to Ngrok      |
| Expose              | PHP-based tunneling tool              |
| Cloudflare Tunnel   | Free and secure from Cloudflare       |
| Tailscale Funnel    | Tunnels over WireGuard mesh           |
