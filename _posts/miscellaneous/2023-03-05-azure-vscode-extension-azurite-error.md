---
layout: post
title: Error while debugging Azure Functions Locally
categories: [azure, vscode]
tags: [Azure, VSCode, Errors]
---

#### Problem:
Received an error while trying to debug an Azure Function locally in VSCode.

#### Error:
Failed to verify "AzureWebJobsStorage" connection specified in "local.settings.json". Is the local emulator installed and running?

#### Cause:
To run Logic App or Azure Function locally, you must have a storage emulator. Azurite extension was installed in VSCode, but it was not in running state.

#### Solution:

1. Open the command palette, press F1 in Visual Studio Code and execute the following command:
```
    Azurite: Start
```