---
title: Jekyll - Bundle Install - SSL Certificate Verification Error
categories: [website, jekyll]
tags: [Website, Jekyll ]
image: /assets/img/website/chirpy-posts.jpg
description: Solutions for resolving the SSL certification errors while installing gems using bundle.
---

## Problem Statement

- While installing the Jekyll Chirpy theme, you may encounter an SSL certificate verification error during the `bundle install` process. The error typically looks like this:

    ```sh
    Fetching source index from https://rubygems.org/
    Could not verify the SSL certificate for
    https://rubygems.org/quick/Marshal.4.8/jekyll-theme-chirpy-3.0.1.gemspec.rz.
    There is a chance you are experiencing a man-in-the-middle attack, but most
    likely your system doesn't have the CA certificates needed for verification. For
    information about OpenSSL certificates, see
    https://railsapps.github.io/openssl-certificate-verify-failed.html.
    ```

- This error occurs because Bundler cannot verify the SSL certificate for RubyGems.org. The underlying problem often stems from:

1. Outdated CA certificates on your system.
2. An outdated version of RubyGems or OpenSSL.
3. Network issues affecting SSL validation.

### Workaround Solution

- As a temporary fix, you can bypass SSL verification by modifying the source URL in your Gemfile:

1. Open the `Gemfile` in the root directory of your Jekyll project.
    - Locate the line specifying the source for gems:

    ```ruby
    source "https://rubygems.org"
    ```

2. Change it to use an unsecured HTTP URL:

    ```ruby
    source "http://rubygems.org"
    ```

3. Save the file.

4. Run the following command to install the required gems:

    ```bash
    bundle install
    ```

- This workaround forces Bundler to fetch gems over an unsecured connection, bypassing SSL certificate verification.
