---
layout: post
title: Ruby/Jeykll - Certificate Verify Failed
categories: [issues-fixes]
tags: [Fixies, Jekyll, Ruby, OpenSSL]
---

## Error Messages:
- ERROR: SSL verification error at depth 2: unable to get local issuer certificate (20)
- ERROR: You must add certificate to your local trusted store
- ERROR: SSL_connect returned=1 errno=0 state=SSLv3 read server certificate B: certificate verify failed

### System Configuration:
- Operating System: MacOS
- Version: 14.3
- Name: Darwin


### What steps resulted in this error?
1. Installing the Jekyll static site generator using gem:
```bash
gem install jekyll
```

2. Upgrading RubyGems using the self-update command:
```bash
gem update --system
```


### What does this error mean?
- This error means that your machine was unable to establish a secure connection to RubyGems.org over SSL.

### Why did this error occur?
- The openssl installed on the machine did not trust the Zscalar certificate which was installed on the machine.

### Solution
- For openssl to trust the Zscalar certificate, we need to add the cert to its trusted folder.
- We can identify the path of the openssl certs fodler and the copy the certificate:
```bash
openssl version -d
cp /<path-to-cert>/cert.pen /opt/homebrew/etc/openssl@3/certs
```



