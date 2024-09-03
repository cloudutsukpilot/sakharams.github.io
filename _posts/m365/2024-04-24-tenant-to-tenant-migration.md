---
layout: post
title: Tenant to Tenant Migration
categories: [m365, migration ]
tags: [M365, Migration]
---

## Introduction
- For tenant-to-tenant M365 migrations, we need to decide on the architecture approach based on the scenario.
- Source Tenant: Contoso
- Desination Tenant: Fabrikam


| Business Scenario | Architecture Scenario | Architecture Approach | 
| ----------------- | --------------------- | --------------------- | 
| `I sold a business unit and` <br> `brand identity` <br> Contoso users will continue to be <br> known as user@contoso.com. | `Tenant-to-tenant migration` <br> `without rebranding` <br> Identities will migrate to a target <br> tenant and will keep the existing <br> domain as part of the migration. | `Single-Event Migration` <br> - Almost everything is migrated in a single <br> event. Higher risk, shorter timeline. <br> - Avoid single-event migrations larger than <br> 15,000 users or 7 TB of site content. <br> - Data volumes, network bandwidth, and <br> helpdesk capacity can be limiting factors to <br> scale. Consider using an alternate <br> temporary domain for a phased migration if <br> you are unable to accommodate a single <br> event. | 
| `I sold a business unit and the` <br> `business unit will adopt the` <br> `target company’s branding` <br> Contoso users will be known as <br> user@fabrikam.com | `Tenant-to-tenant migration `<br> `with rebranding` <br> Identities will migrate to a new target <br> tenant and will change the brand <br> identity as part of the migration. | `Single-event migration` (same as above)|
| | | `Phased migration` <br> Gradual migration of users, services, and <br> data. Source domains are not transferred. <br> Users assume new target domains. Lower <br> risk, longer timeline. <br> Coexistence limitations can cause issues. |
| `I need to split users across two` <br> `tenants` My company cannot use the <br> registered (*.onmicrosoft.com) <br> tenant name <br> I’m moving from a <br> commercial <br> tenant to Microsoft Cloud for <br> Government | `Cloud tenant move` <br> Identities remain in the source tenant, <br> but all users in the <br> affected domain <br> and all workloads are moved to a new <br> cloud tenant. | `Tenant move or split` <br> Similar to single-event migration, except <br> this does not include migrating accounts to <br> a new on-premises AD DS forest. For tenant <br> splits, this approach is not intended for <br> long-term coexistence. <br> Migration event includes additional work to <br> re-establish existing identities to the new <br> tenant. | 
