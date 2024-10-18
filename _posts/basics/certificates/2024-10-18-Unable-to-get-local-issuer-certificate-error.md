---
layout: post
title: Certifiates - Unable to get local issue certificate
categories: [basics, certificates]
tags: [Basics, Certificates]
---

## Introduction

- The “unable to get local issuer certificate” error is related to issues with SSL/TLS certificates. 
- It indicates that the certificate chain could not be verified back to a trusted root certificate authority. 
- This error typically occurs in web browsers when connecting to a website/tool that is using an untrusted or invalid SSL certificate.

### What Causes the Unable to Get Local Issuer Certificate Error?

- There are a few common causes for the “unable to get local issuer certificate” error:

1. **Expired Certificate**
    - SSL/TLS certificates have a validity period and expire after a certain date.
    - If the certificate expires, the browser will no longer trust it and will display the “unable to get local issuer certificate” error. 
    - The website/tool needs to renew their SSL certificate to resolve this issue.

2. **Self-Signed Certificate**
    - A self-signed certificate is signed by the entity that generated the certificate rather than a trusted certificate authority. 
    - Browsers do not inherently trust self-signed certificates, so they will show the “unable to get local issuer certificate” error. 
    - The website/tool needs to install a valid SSL certificate signed by a trusted authority.

3. **Certificate Authority Not Trusted**
    - Browsers and operating systems ship with a pre-installed set of trusted root certificates from major certificate authorities. 
    - If the website’s certificate was issued by a certificate authority that is not trusted by the browser or OS, it will result in the error. 
    - The CA needs to be added to the trust stores to resolve this.

4. **Incorrect Certificate Chain**
    - SSL certificates rely on an intermediate certificate chain to verify trust back to a root CA. 
    - If the certificate chain is not properly installed on the web server, it will break the chain of trust and trigger the error. 
    - The correct intermediate certificate chain needs to be installed.

5. **Domain Mismatch**
    - The domain name the certificate is issued for must match the domain the browser is trying to connect to. 
    - If there is a mismatch, the certificate cannot be verified and will fail with the “unable to get local issuer certificate” error. 
    - The website needs to get an updated certificate issued for the correct domain name.

6. **Revoked Certificate**
    - If a certificate authority determines a certificate has been compromised, they can revoke that certificate. 
    - Revoked certificates will no longer be trusted and result in the error. 
    - The website operator will need to replace the revoked certificate with a new valid one.

### When Does the Unable to Get Local Issuer Certificate Error Occur?

- The “unable to get local issuer certificate” error will occur when first attempting to connect to a website over HTTPS and the initial SSL/TLS handshake fails.
- The error prevents the webpage from loading further and displays an alert or warning in the browser. 
- Depending on the browser, the exact wording may vary slightly but will indicate the certificate chain could not be verified.

### How to Fix the Unable to Get Local Issuer Certificate Error?

- Fixing the “unable to get local issuer certificate” error requires investigating the cause and addressing the underlying certificate issue:

1. `Renew Expired Certificate`
    - If the certificate is expired, renew the SSL certificate from the certificate authority. Install the new valid certificate on the web server.

2. `Install Trusted Certificate`
    - For self-signed or untrusted authority certificates, obtain and install a certificate from a trusted authority like Let’s Encrypt, Comodo, Digicert or GoDaddy.

3. `Install Intermediate Certificates`
    - Make sure any required intermediate certificates are installed on the server to complete the chain of trust.

4. `Correct Domain Name Mismatch`
    - Request and install a new certificate that matches the correct domain name the site should be accessed at.

5. `Replace Revoked Certificate`
    - If the certificate was revoked, get a new certificate installed on the web server.

6. `Update Trust Stores`
    - On client computers and devices, make sure root certificates are up-to-date so CAs will be trusted.
    - Once the underlying issue is addressed, the browser should be able to verify the certificate chain and trust the connection, eliminating the error.

7. `Bypassing the Unable to Get Local Issuer Certificate Error`
    - While fixing the certificate issue is recommended, there are ways to bypass the error in some browsers:
        - Chrome — Type “thisisunsafe” on the error screen and click “Advanced” then “Proceed”.
        - Firefox — Click “Advanced” then “Accept the Risk and Continue”.
        - Safari — Go to Preferences > Advanced and enable “Show Develop menu”. From Develop menu, choose “Disable Certificate Validation”.
        - IE — Click “Continue to this website” on the error page.
    - This will allow you to access the site but leaves you open to potential security risks from the invalid certificate. Use bypass methods at your own risk.

### Potential Risks of Bypassing the Error

- Bypassing certificate errors rather than fixing them comes with some risks:
    - Man-in-the-Middle Attack — An attacker could intercept the insecure connection and monitor or modify traffic.
    - Spoofing — The invalid certificate could be used to spoof or impersonate the real website.
    - Data Exposure — Traffic sent over the connection could be decrypted and accessed by others.
    - Malware — The invalid certificate could be tied to malware or phishing sites instead of the real site.
- When possible, it’s always preferable to fix the root cause of the certificate error rather than simply bypass it. 
- Valid certificates signed by trusted authorities protect users and website owners.

### How to Prevent the Unable to Get Local Issuer Certificate Error?

- To avoid “unable to get local issuer certificate” errors in the future, website owners should:

    + Purchase SSL certificates from known, trusted authorities
    + Make sure to renew certificates before they have a chance to expire
    + Properly install intermediate certificate chains
    + Keep private keys safe to avoid compromise
    + Request certificates using the exact domain name used by the site
    + Monitor certificate authority trust and update as needed
    + Replace certificates that get revoked or compromised
    + Use Certificate Transparency to detect and avoid mistakenly issued certificates

- Following best practices for SSL deployment, maintenance, and monitoring will help prevent issues that lead to the error.


### References Links:
