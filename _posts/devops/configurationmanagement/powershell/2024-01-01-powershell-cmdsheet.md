---
layout: post
title: Powershell Commands - CMDSheet
categories: [devops, configuration management, powershell]
tags: [DevOps, Configuration Management, Powershell, CMDsheet]
---

## Powershell CMDSheet

- PowerShell provides an extensive set of commands to handle various administrative and scripting tasks.
- Below is a categorized list of PowerShell commands commonly used by system administrators and IT professionals.

### File System Management

| Command       | Description                                      |
| ------------- | ------------------------------------------------ |
| `Get-ChildItem` | Lists files and directories in the specified path. |
| `New-Item`    | Creates a new file or directory.                 |
| `Remove-Item` | Deletes files or directories.                    |
| `Copy-Item`   | Copies files or directories.                     |
| `Move-Item`   | Moves files or directories.                      |

Example:

```powershell
Get-ChildItem -Path C:\Scripts -Recurse
```

### Service Management

| Command         | Description                          |
| --------------- | ------------------------------------ |
| `Get-Service`   | Lists all services on the system.    |
| `Start-Service` | Starts a specific service.           |
| `Stop-Service`  | Stops a specific service.            |
| `Restart-Service`| Restarts a specific service.        |

Example:

```powershell
Restart-Service -Name "Spooler"
```

### Process Management

| Command       | Description                  |
| ------------- | ---------------------------- |
| `Get-Process` | Lists running processes.     |
| `Stop-Process`| Stops a running process.     |
| `Start-Process`| Starts a new process.       |

Example:

```powershell
Get-Process | Where-Object { $_.CPU -gt 100 }
```

### Environment Variables

| Command                                 | Description                          |
| --------------------------------------- | ------------------------------------ |
| `$Env:<Variable>`                       | Accesses environment variables.      |
| `[Environment]::SetEnvironmentVariable` | Sets a new environment variable.     |

Example:

```powershell
$Env:Path
[Environment]::SetEnvironmentVariable("MyVar", "Value", "User")
```

### Networking

| Command            | Description                              |
| ------------------ | ---------------------------------------- |
| `Test-Connection`  | Pings a remote system.                   |
| `Get-NetIPAddress` | Retrieves network adapter IP configurations. |
| `New-NetIPAddress` | Assigns a static IP address.             |

Example:

```powershell
Test-Connection -ComputerName "google.com" -Count 3
```

### User and Group Management

| Command              | Description                        |
| -------------------- | ---------------------------------- |
| `Get-LocalUser`      | Lists local user accounts.         |
| `New-LocalUser`      | Creates a new local user.          |
| `Add-LocalGroupMember` | Adds a user to a local group.     |

Example:

```powershell
Get-LocalUser
```

### File Parsing

- **JSON**

  ```powershell
  # Parse JSON file
  $jsonContent = Get-Content -Path .\data.json | ConvertFrom-Json
  $jsonContent
  ```

- **YAML**

  - Install the powershell-yaml module:

  ```powershell
  Install-Module -Name powershell-yaml
  ```

  - Parse YAML:

  ```powershell
  $yamlContent = Get-Content -Path .\data.yaml | ConvertFrom-Yaml
  $yamlContent
  ```

- **CSV**

  ```powershell
  # Parse CSV file
  $csvContent = Import-Csv -Path .\data.csv
  $csvContent
  ```

- **XML**

  ```powershell
  # Parse XML file
  $xmlContent = [xml](Get-Content -Path .\data.xml)
  $xmlContent
  ```

### Operators

- **For Loop**

  ```powershell
  for ($i = 1; $i -le 5; $i++) {
    Write-Output "Number: $i"
  }
  ```

- **Do-While Loop**

  ```powershell
  $count = 1
  do {
      Write-Output "Count: $count"
      $count++
  } while ($count -le 5)
  ```

- **ForEach**

  ```powershell
  $items = 1..5
  foreach ($item in $items) {
      Write-Output "Processing item: $item"
  }
  ```

### Miscellaneous Commands

| Command         | Description                        |
| --------------- | ---------------------------------- |
| `Get-EventLog`  | Retrieves system event logs.       |
| `Export-Clixml` | Exports data to an XML file.       |
| `Export-Csv`    | Exports data to a CSV file.        |

Example:

```powershell
Get-EventLog -LogName System -Newest 10 | Export-Csv -Path .\eventlog.csv -NoTypeInformation
```
