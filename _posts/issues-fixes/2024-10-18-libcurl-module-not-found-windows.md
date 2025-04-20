---
layout: post
title: Libcurl - Module Not Found - Windows
categories: [issues-fixes]
tags: [Fixies, Jekyll, Ruby, Curl]
image: /assets/img/issues-fixes/issues-fixes-posts.jpg
description: Libcurl - Module Not Found - Windows
---

### Error Messages

- `ERROR`: Could not open library libcurl: Failed with error 126: The specified module could not be found.
- `ERROR`: Could not open library libcurl.dll: Failed with error 126.
- `ERROR`: Could not open library libcurl.so.4: Failed with error 126.
- `ERROR`: Could not open library libcurl.so.4.dll: Failed with error 126.

### System Configuration

- Operating System: Windows 10 / 11
- Ruby Version: 3.4 (x64, UCRT)
- Task: htmlproofer executed via Taskfile

### Command

```bash
bundle exec htmlproofer _site --disable-external --ignore-urls "/^http:\/\/127.0.0.1/,/^http:\/\/0.0.0.0/,/^http:\/\/localhost/"
```

### What does this error mean?

- This error indicates that the ffi gem, used by htmlproofer and other Ruby tools, is attempting to load the native libcurl library to make HTTP requests, but Windows can't locate the required .dll file in the system path or Ruby environment.

### Why did this error occur?

- Ruby on Windows does not ship with libcurl.dll by default, but some gems that depend on FFI (like htmlproofer) expect it to be present.
- As a result, the execution fails when the dynamic library is not found in the expected location (/bin, System32, or Ruby's own bin folder).

### Solution

- To fix this, we need to download libcurl.dll manually and place it where Ruby can access it.

- Steps to Fix the Error

1. Download cURL for Windows.
    - Visit: https://curl.haxx.se/windows/
    - Choose the 64-bit version (or 32-bit if your Ruby is 32-bit)
    - Download the .zip archive

2. Locate the required DLL:
    - Open the downloaded .zip file
    - Navigate to the `bin/` folder inside
    - Find the file `libcurl-x64.dll` (or similar)

3. Rename and place the DLL:
    - Rename the file to `libcurl.dll` (if necessary)
    - Find the path of Ruby installation using:

    ```sh
    Get-Command ruby
    ```

    - Move or copy it to the bin folder of your Ruby installation

4. Verify it works:

    - Re-run your command:

    ```sh
    bundle exec htmlproofer _site --disable-external
    ```

5. The LoadError related to libcurl should now be resolved.
