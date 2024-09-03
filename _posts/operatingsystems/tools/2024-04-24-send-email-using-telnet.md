---
layout: post
title: Send Email using Telnet with TLS and Authentication
categories: [Exchange]
tags: [Exchange, Telnet]
---


### Send Emails using Telnet

- We can use telnet to test and debug if a particular machine is able to send e-mail via an SMTP server. 
- Since SendGrid offer 100 free emails everyday, we will send emails using the SendGrid STMP server.

#### Installation

| Operating System | Commands | 
| ---------------- | -------- |
| Linux - Ubuntu/Debian | sudo apt-get update <br> sudo apt-get install telnet |
| Linux - CentOS/RHEL | sudo yum update <br> sudo yum install telnet |
| Linux - Fedora | sudo dnf update <br> sudo dnf install telnet | 
| Windows | Add-WindowsCapability -Online -Name Telnet.Client~~~~0.0.1.0 |
| MacOS | brew install telnet |


#### Telnet Commands to send an email:

**Step 1. Connecting to the SMTP server (SendGrid)**

| Port | Command | 
| ---- | ------- | 
| SMTP - 25 | `telnet smtp.domain.com 25` | 
| TLS - 587 | `openssl s_client -starttls smtp -connect smtp.sendgrid.com:587` | 
| | `openssl s_client -starttls smtp -ign_eof -crlf -connect smtp.sendgrid.com:587` | 
| SSL - 465 | `openssl s_client -connect smtp.sendgrid.com:465` | 

- If the connection is established, we should the similar response as below:
```
Trying 159.122.219.43…
Connected to smtp.sendgrid.net.
Escape character is ‘^]’.
220 SG ESMTP service ready at ismtpd0001p1lon1.sendgrid.net
```

> Please note that you might see additional information for SSL and TLS connections.
{: .prompt-warning }


**Step 2. Initiate the conversation**

- Type the below Extended Hello (EHLO) command with the domain name or IP address to initiate a conversation:
    ```
    EHLO domain.com
    ```
- The SMTP server will respond with the SMTP Service Extension list which includes supported capabilities and service extensions.
    ```
    250-smtp.sendgrid.net
    250-8BITMIME
    250-PIPELINING
    250-SIZE 31457280
    250-AUTH PLAIN LOGIN
    ```

**Step 3: Authentication**

- Before we authenticate to the server, the username and password needs to be converted into base64 format:
    ```
    $ echo -ne "username" | base64
    dXNlcm5hbWU=
    $ echo -ne "password" | base64
    cGFzc3dvcmQ=
    ```

1. Using `PLAIN`
The PLAIN mechanism expects a base64 encoded string containing both username and password, each prefixed with a NULL byte. To generate this string using the base64 binary, run this command:
    ```
    $ echo -ne "\0username\0password" | base64
    AHVzZXJuYW1lAHBhc3N3b3Jk
    AUTH PLAIN AHVzZXJuYW1lAHBhc3N3b3Jk
    235 Authentication successful
    ```

2. Using `AUTH LOGIN`
- You will be prompted for the username first, then the password. The entire conversation will look like this:

    ```
    334 VXNlcm5hbWU6
    dXNlcm5hbWU=
    334 UGFzc3dvcmQ6
    cGFzc3dvcmQ=
    235 Authentication successful
    ```

**Step4: Send the E-mail**
- Using the below commands, send an email:
    a. The sender (MAIL FROM)
    b. The recipient (RCPT TO)
    c. The message body (DATA)
    
- Once we are ready to send our message, we end with a single dot (.) character. 

    ```
    MAIL FROM: john@doe.com
    250 Sender address accepted
    rcpt to: mary@jane.com
    250 Recipient address accepted
    DATA
    354 Continue
    From: from@domain.com
    Subject: Test message!

    Hi,

    This is a test message!

    Best,
    John
    .
    250 Ok: queued as bazLUK4DEBqH25dH6iZuNg
    ```

> Note: if you connected with openssl instead of telnet, you have to make sure to type the rcpt to command in lowercase. Pressing R in the client session instructs openssl to renegotiate the TLS connection.
{: .prompt-warning }

**Step 5: End the session**
- Type QUIT to close the session.