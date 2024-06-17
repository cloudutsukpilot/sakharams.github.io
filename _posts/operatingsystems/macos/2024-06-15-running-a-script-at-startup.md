---
layout: post
title: MacOS - Running a script at Startup
categories: [operating systems, macos]
tags: [Operating Systems, MacOS]
---

## Steps to execute a script on startup:

1. Create the Shell Script:
- Create a file named start_jekyll.sh in your Jekyll site directory:

    ```sh
    nano /Users/Sakharam.Shinde/github/sakharams.github.io/start_jekyll.sh
    ```

2. Add the following content:

    ```sh
    #!/bin/bash
    cd /Users/Sakharam.Shinde/github/sakharams.github.io
    /usr/local/bin/bundle exec jekyll serve --watch > /tmp/jekyll-serve.log 2>&1
    ```

3. Make the script executable:

    ```sh
    chmod +x /Users/Sakharam.Shinde/github/sakharams.github.io/start_jekyll.sh
    ```

4. Create a the Plist File `~/Library/LaunchAgents/com.user.jekyllserve.plist`:
- Update the plist file to call the shell script:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.user.jekyllserve</string>
    <key>ProgramArguments</key>
    <array>
      <string>/Users/Sakharam.Shinde/github/sakharams.github.io/start_jekyll.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/jekyll-serve.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/jekyll-serve.log</string>
  </dict>
</plist>

4. Load the Launch Agent:
    
    ```sh
    launchctl load ~/Library/LaunchAgents/com.user.jekyllserve.plist
    ```

5. Verify and Check Logs:
    ```sh
    launchctl list | grep com.user.jekyllserve
    ```

6. Check the log file:

    ```sh
    tail -f /tmp/jekyll-serve.log
    ```

7. To unload the agent

    ```sh
    launchctl unload ~/Library/LaunchAgents/com.user.jekyllserve.plist
    ```

