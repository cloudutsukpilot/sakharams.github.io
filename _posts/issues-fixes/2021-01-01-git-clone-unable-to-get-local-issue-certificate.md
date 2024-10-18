---
layout: post
title: Git Clone - Unable to get local issue certificate
categories: [issues-fixes]
tags: [Fixies, Git, OpenSSL]
---

## Error Messages:

- fatal: unable to access 'https://github.com/org/repo-name.git/': SSL certificate problem: unable to get local issuer certificate

### System Configuration:

- Operating System: Windows 
- Version: 11

### What steps resulted in this error?

- Trying to clone a repository from github.com

    ```bash
    git clone https://github.com/org/repo-name.git/
    ```

### What does this error mean?

- This error means that your machine was unable to establish a secure connection to GitHub.com over SSL.

### Why did this error occur?

- In Corporate environemts, there are proxies installed which intercept all the traffic using Zscalar certificates.
- The openssl certificate installed on the machine for Git did not trust the Zscalar certificate which was installed on the machine.


### Solution 1

1. Git clone uses OpenSSL for HTTPS Transport and it can be switch to Secure Channel using the below command.
    ```cmd
    git config --global http.sslbackend schannel
    ```
2. By switching, Git will use the Windows certificate store and should not require (and, in fact, should ignore) the http.sslCAInfo configuration setting.

3. Try to clone the repository again and it should work.

### Solution 2

1. For openssl used by the Git to trust the Zscalar certificate, we need to add the Zscalar certificate to the openssl trusted certificate.

2. Export the Zscalar certificate from certmgr in Windows. Normally added to the 'Trusted Root Certification Authorities -> Certificates'. While exporting the certificate, select 'Base 64 encoded X.500 (.CER)' format and save it to a tempoary folder.

3. Identify the path of the openssl certs folder for Git and the take the backup of the existing certificate `ca-bundle.crt`. Normarlly, the default path would be `C:\Program Files\Git\mingw64\etc\ssl\certs`.

4. Open the Zscalar certificate in Notepad and copy the contents. Open the `ca-bundle` certificate with Notepad and copy the content at the end and save it.

5. Try to clone the repository again and it should work.
