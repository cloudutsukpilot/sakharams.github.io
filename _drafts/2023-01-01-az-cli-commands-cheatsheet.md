---
layout: post
title: Az CLI Login with Micrsoft Graph
categories: [cloud, azure, az cli]
tags: [cloud, azure, az cli, microsoft graph]
---

### Error: 
The token needs to be in JWS or JWE Compact Serialization Format

```
$accessToken = az account get-access-token --query accessToken
$accessTokenSecure = ConvertTo-SecureString $accessToken -AsPlainText -Force
Connect-MgGraph -AccessToken $accessTokenSecure
```

```
$accessToken = (az account get-access-token --query accessToken).replace('"','')
$accessTokenSecure = ConvertTo-SecureString $accessToken -AsPlainText -Force
Connect-MgGraph -AccessToken $accessTokenSecure
```

### Error: 
Get-MgApplication_List: Access token validation failure. Invalid audience.