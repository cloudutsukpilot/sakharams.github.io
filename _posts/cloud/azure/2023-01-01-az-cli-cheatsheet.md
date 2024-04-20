---
layout: post
title: Az CLI Commands - CheatSheet
categories: [cloud, azure, az cli]
tags: [Cloud, Azure, Az Cli, Cheatsheet]
---

# Shell
1. Get a single column from an array:
```
az ad app list --query "[].displayName"
```

2. Get multiple columns from an array
```
az ad app list --query "[].{Name:displayName, Created:createdDateTime}"
```

3. Filter the az command output and select specfic attribute:
```
az network public-ip list -g resourceGroupName --query "[?name=='publicIpResourceName'].ipAddress
az network vnet list --query "[?name=='vnet1'].subnets[].addressPrefix"
```