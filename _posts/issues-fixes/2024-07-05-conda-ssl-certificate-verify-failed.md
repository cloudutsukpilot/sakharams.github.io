---
layout: post
title: Conda - SSL CERTIFICATE_VERIFY_FAILED
categories: [issues-fixes]
tags: [Fixies, Conda, OpenSSL]
image: /assets/img/issues-fixes/issues-fixes-posts.jpg
description: Conda - SSL CERTIFICATE_VERIFY_FAILED
---

## Command

conda create -p venv python==3.10
conda update conda

## Error Messages

```
Exception: HTTPSConnectionPool(host='repo.anaconda.com', port=443): Max retries exceeded with url: /pkgs/main/osx-arm64/repodata.json.zst (Caused by SSLError(SSLCertVerificationError(1, '[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate (_ssl.c:1006)')))
```

### System Configuration

- Operating System: MacOS

### What steps resulted in this error?

1. Creating an virtual environment using Conda:

```bash
conda create -p venv python==3.10
```

### What does this error mean?

- This error means that there was a timeout while trying to reach the repo.anaconda.com server.

### Why did this error occur?

- The SSL certificate verification process has failed because the local system could not verify the certificate of the server.
- This is a common issue when using corporate networks or private certificates that are not included in the default certificate store.

### Solution

- Follow the below steps to resolve the issue:

1. Obtain the Corporate Certificate:
    - Ensure you have the corporate certificate file, typically with a .crt or .pem extension.

2. Locate the Conda Environment Directory:
    - Find the Conda environment directory where you need to add the certificate. You can use the following command to get the base environment directory:

    ```sh
    conda info --base
    ```

3. Copy the Corporate Certificate to Conda Environment:
    - Copy your corporate certificate to the Conda environment's ssl directory. Assuming your Conda base environment is in /Users/your-username/anaconda3, you would do something like this:

    ```sh
    cp /path/to/your/corporate_certificate.crt /Users/your-username/anaconda3/ssl/certs/
    ```

    > Create the directory /anaconda3/ssl/certs/ if it does not exist.
    {: .prompt-tip }

4. Configure Conda to Use the Corporate Certificate:

    - Conda needs to be configured to recognize and use the certificate for SSL connections. Set the environment variable REQUESTS_CA_BUNDLE to the path of the certificate:

    ```sh
    export REQUESTS_CA_BUNDLE=/Users/your-username/anaconda3/ssl/certs/corporate_certificate.crt
    ```

5. Persist the Configuration:

    - To make sure the configuration is persistent across shell sessions, add the environment variable to your shell profile (e.g., .zshrc, .bashrc, or .bash_profile):

    ```sh
    echo 'export REQUESTS_CA_BUNDLE=/Users/your-username/anaconda3/ssl/certs/corporate_certificate.crt' >> ~/.zshrc
    source ~/.zshrc
    ```

6. Verify the Configuration:

    - Ensure the environment variable is set correctly:

    ```sh
    echo $REQUESTS_CA_BUNDLE
    ```

7. Test the Conda Commands:
    - Try running a Conda command to verify if the setup works correctly:

    ```sh
    conda update conda
    ```
