---
layout: post
title: gcloud - SSL CERTIFICATE_VERIFY_FAILED
categories: [issues-fixes]
tags: [Fixies, gcloud, OpenSSL]
---

## Command:
gcloud info --run-diagnostics


## Error Messages:
```
ERROR: Reachability Check failed.
    httplib2 cannot reach https://cloudresourcemanager.googleapis.com/v1beta1/projects:
[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate (_ssl.c:1000)

    httplib2 cannot reach https://www.googleapis.com/auth/cloud-platform:
[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate (_ssl.c:1000)

    requests cannot reach https://cloudresourcemanager.googleapis.com/v1beta1/projects:
HTTPSConnectionPool(host='cloudresourcemanager.googleapis.com', port=443): Max retries exceeded with url: /v1beta1/projects (Caused by SSLError(SSLCertVerificationError(1, '[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate (_ssl.c:1000)')))

    requests cannot reach https://www.googleapis.com/auth/cloud-platform:
HTTPSConnectionPool(host='www.googleapis.com', port=443): Max retries exceeded with url: /auth/cloud-platform (Caused by SSLError(SSLCertVerificationError(1, '[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate (_ssl.c:1000)')))
```

### System Configuration:
- Operating System: MacOS
 

### What steps resulted in this error?
1. Initializing the gcloud cli
```bash
gcloud info --run-diagnostics
```

### What does this error mean?
- The error you are encountering suggests that your gcloud command-line tool is having trouble verifying the SSL certificate for the Google Cloud Platform endpoint.

### Why did this error occur?
- The SSL certificate verification process has failed because the local system could not verify the certificate of the server.
- This is a common issue when using corporate networks or private certificates that are not included in the default certificate store.

### Solution
- Follow the below steps to resolve the issue:

1. Obtain the Corporate Certificate:
- Ensure you have the corporate certificate file, typically with a .crt or .pem extension.

2. Locate the Python installation Directory:
```sh
which python
/opt/anaconda3/bin/python
```

3. Copy the Corporate Certificate to default CA certificate of Conda Environment (similar approach can be used for other python environment):
- Copy your corporate certificate to the Conda environment's ssl directory. Assuming your Conda base environment is in /Users/your-username/anaconda3, you would do something like this:
```sh
sudo cat /path/to/CorportaCACertificate.pem >> /opt/anaconda3/ssl/cacert.pem
```

4. Configure gcloud to use the Conda python environment and set the environmental variable for requests and httplib
```sh
export CLOUDSDK_PYTHON=/opt/anaconda3/bin/python3
export CURL_CA_BUNDLE=/opt/anaconda3/ssl/cacert.pem
export HTTPLIB2_CA_CERTS=/opt/anaconda3/ssl/cacert.pem
export REQUESTS_CA_BUNDLE=/opt/anaconda3/ssl/cacert.pem
```

5. Persist the Configuration:
- To make sure the configuration is persistent across shell sessions, add the environment variable to your shell profile (e.g., .zshrc, .bashrc, or .bash_profile):
```sh
echo 'export CLOUDSDK_PYTHON=/opt/anaconda3/bin/python3' >> ~/.zshrc
echo 'export CURL_CA_BUNDLE=/opt/anaconda3/ssl/cacert.pem' >> ~/.zshrc
echo 'export HTTPLIB2_CA_CERTS=/opt/anaconda3/ssl/cacert.pem' >> ~/.zshrc
echo 'export REQUESTS_CA_BUNDLE=/opt/anaconda3/ssl/cacert.pem' >> ~/.zshrc
source ~/.zshrc
```

6. Verify the Configuration:
- Ensure the environment variable is set correctly:
```sh
echo $CLOUDSDK_PYTHON
echo $CURL_CA_BUNDLE
echo $HTTPLIB2_CA_CERTS
echo $REQUESTS_CA_BUNDLE
```

7. Test the gcloud Commands:
- Try running a gcloud command to verify if the setup works correctly:
```sh
gcloud info --run-diagnostics
```
