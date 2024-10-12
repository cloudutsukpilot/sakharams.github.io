---
layout: post
title: Gem Install Jeykll - Certificate Verify Failed
categories: [issues-fixes]
tags: [Fixies, Jekyll, Ruby, OpenSSL]
---

## Error Messages:
- ERROR: SSL verification error at depth 2: unable to get local issuer certificate (20)
- ERROR: You must add certificate to your local trusted store
- ERROR: SSL_connect returned=1 errno=0 state=SSLv3 read server certificate B: certificate verify failed

### System Configuration:
- Operating System: Windows
- Version: 10


### What steps resulted in this error?
1. Installing the Jekyll static site generator using gem:
```powershell
gem install jekyll
```

2. Upgrading RubyGems using the self-update command:
```powershell
gem update --system
```


### What does this error mean?
- This error means that your machine was unable to establish a secure connection to RubyGems.org over SSL.

### Why did this error occur?
- The ruby installation on the machine did not trust the Zscalar certificate which was installed on the machine.

### Solution
- For ruby to trust the Zscalar certificate, we need to add the cert to its certs folder.
- We can identify the path of the ruby certs fodler and the copy the certificate.
1. Obtain the Corporate Certificate (e.g., Zscaler certificate) from CertMgr -> Trusted Root Certification Authority -> Zscalar Root CA

2. Convert the .cer to .pem :
```powershell
openssl x509 -inform der -in source_cert.cer -out target_cert.pem
```

3. Locate the Certs Directory:
```powershell
ruby -ropenssl -e "puts OpenSSL::X509::DEFAULT_CERT_DIR"
```

4. Add the Certificate to Ruby's Trusted Certificates:
```powershell
Copy-Item /<path-to-corporate-cert>/zscalar.pem <path-to-certs-directory>/zscalar.pem
```

5. Update the Gems system and Install Jekyll
```
gem udpate --system
gem install jekyll
```



