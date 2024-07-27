---
layout: post
title: Azure - ExpressRoute
categories: [cloud, azure, networking]
tags: [Cloud, Azure, Networking]
---

## Introduction
- ExpressRoute lets you extend your on-premises networks into the Microsoft cloud over a private connection with the help of a connectivity provider. 
- ExpressRoute connections offer more reliability, faster speeds, consistent latencies, and higher security than typical connections over the Internet, because they don’t go over the public Internet.

![ExpressRoute](/assets/img/cloud/azure/networking/expressroute-connection.png)

### Key benefits
1. Layer 3 connectivity between your on-premises network and the Microsoft Cloud through a connectivity provider. Connectivity can be from an any-to-any (IPVPN) network, a point-to-point Ethernet connection, or through a virtual cross-connection via an Ethernet exchange.
2. Connectivity to Microsoft cloud services across all regions in the geopolitical region.
3. Global connectivity to Microsoft services across all regions with the ExpressRoute premium add-on.
4. Dynamic routing between your network and Microsoft via border gateway protocol (BGP).
5. Built-in redundancy in every peering location for higher reliability.
6. Connection uptime service level agreement (SLA).
7. Quality of Service (QoS) support for Skype for Business.


### Encryption over ExpressRoute
- Deploy Azure Virtual WAN to establish an IPsec/IKE VPN connection from your on-premises network to Azure over the private peering of an Azure ExpressRoute circuit to get an encrypted transit.

![ExpressRoute Encryption](/assets/img/cloud/azure/networking/expressroute-topology-and-routing.png)

- Traffic from On-Premises to Azure:
    + `Two Paths`: Traffic can travel either through an encrypted IPsec VPN path or a direct ExpressRoute path.
    + `Preference for Encryption`: To ensure encrypted communication, configure the network to prefer the VPN path over the ExpressRoute path.

- Traffic from Azure to On-Premises:
    + `Preferred Path`: Ensure Azure uses the encrypted VPN path by advertising specific network ranges differently:
        1. `Specific Prefixes`: Advertise detailed network ranges via VPN and broader ranges via ExpressRoute.
        2. `Separate Prefixes`: Advertise non-overlapping network ranges for VPN and ExpressRoute.