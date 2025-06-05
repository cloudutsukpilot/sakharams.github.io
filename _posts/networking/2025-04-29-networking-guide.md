---
layout: post
title: Networking Guide
categories: [networking, guide]
tags: [Networking, Guide]
image: /assets/img/networking/networking-posts.jpg
description: Networking Guide
---

## Networking Guide

- `Networking Introduction and Binary Maths`
  - Introduction to networking concepts
  - Basics of binary mathematics in networking
- `OSI and TCP/IP Model`
  - Understanding the OSI model
  - Exploring the TCP/IP model and its protocols
- `IPv4 Addressing and Subnetting`
  - IPv4 addressing fundamentals
  - Subnetting techniques and calculations
- `Router Components and IOS Basics`
  - Components of a router
  - Basics of Cisco IOS (Internetwork Operating System)
- `Packet Forwarding and Routing`
  - How packets are forwarded in a network
  - Static routing and default routing concepts
- `Implementing DHCP`
  - Configuring and managing DHCP (Dynamic Host Configuration Protocol)
- `Network Time Protocol (NTP)`
  - Introduction to NTP and its role in network time synchronization
- `Analysing Topology using CDP and LLDP`
  - Using CDP (Cisco Discovery Protocol) and LLDP (Link Layer Discovery Protocol) for network topology analysis
- `System Message Logging (Syslog)`
  - Configuring syslog for system message logging and monitoring
- `Dynamic Routing`
  - Overview of dynamic routing protocols
  - Configuring and managing dynamic routing
- `Open Shortest Path First (OSPF)`
  - Understanding OSPF and its features
  - Configuring and troubleshooting OSPF
- `Access-List (ACL)`
  - Introduction to access control lists (ACLs)
  - Implementing ACLs for network security
- `Network Address Translation (NAT)`
  - Explaining network address translation (NAT) concepts
  - Configuring and managing NAT
- `Switching and Ethernet Fundamentals`
  - Fundamentals of switching technology
  - Basics of Ethernet networks
- `Cisco Hierarchical LAN Design`
  - Understanding Cisco's hierarchical LAN design model
- `VLAN, Trunking, and Inter-VLAN Routing`
  - Configuring VLANs and trunking in network switches
  - Implementing inter-VLAN routing
- `Data and Voice VLAN Concepts`
  - Differentiating data and voice VLANs
  - Configuring and managing voice VLANs
- `Dynamic Trunking Protocol (DTP)`
  - Understanding Dynamic Trunking Protocol (DTP) and its role in trunk negotiation
- `Spanning-Tree Protocol (STP)`
  - Explaining Spanning Tree Protocol (STP) and its purpose
  - Configuring and troubleshooting STP
- `EtherChannel`
  - Configuring and managing EtherChannel for link aggregation
- `Switch Stacking`
  - Understanding switch stacking and its benefits
  - Configuring and managing switch stacks
- `Power Over Ethernet (PoE)`
  - Introduction to Power over Ethernet (PoE) technology
  - Configuring and managing PoE on switches
- `First Hop Redundancy Protocol (FHRP)`
  - Explaining First Hop Redundancy Protocol (FHRP) concepts
  - Configuring and managing HSRP (Hot Standby Router Protocol)
- `IPv6`
  - Introduction to IPv6 addressing and features
  - Configuring and managing IPv6 networks
- `Wireless Basics (RF Signals and Modulation)`
  - Understanding wireless RF signals and modulation techniques
- `Wireless Fundamentals`
  - Exploring wireless network fundamentals
  - Configuring basic wireless settings
- `Cisco Wireless Architectures`
  - Overview of Cisco wireless architectures
  - Configuring and managing wireless networks
- `Securing Wireless Networks`
  - Implementing security measures for wireless networks
  - Configuring wireless security protocols
- `Building a Wireless LAN`
  - Planning and deploying a wireless LAN infrastructure
- `Security Architectures and Threats`
  - Understanding network security architectures
  - Identifying common security threats and vulnerabilities
- `Firewall Basics & NGFW`
  - Introduction to firewalls and their functions
  - Exploring Next-Generation Firewalls (NGFW)
- `DHCP Snooping`
  - Configuring DHCP snooping to prevent unauthorized DHCP server attacks
- `Dynamic ARP Inspection`
  - Implementing Dynamic ARP Inspection (DAI) for ARP protection
- `Port Security`
  - Configuring and managing port security on network switches
- `WAN Architecture`
  - Exploring Wide Area Network (WAN) architectures
  - Understanding WAN connectivity options
- `Internet VPN Fundamentals`
  - Introduction to Internet VPN (Virtual Private Network) technologies
  - Configuring and managing VPN connections
- `Quality of Service (QoS)`
  - Basics of Quality of Service (QoS) and its importance
- `Introduction to Controller-Based Networking`
  - Understanding controller-based network architectures
  - Exploring Cisco's controller-based networking solutions
- `Cisco Software Defined Access (SDA)`
  - Overview of Cisco Software Defined Access (SDA) architecture and benefits
- `Introduction to Data Formats (JSON, XML, and YAML)`
  - Explaining the basics of data formats such as JSON, XML, and YAML
- `Introduction to API`
  - Understanding Application Programming Interfaces (APIs) and their role in network management
- `Understanding REST API`
  - Exploring Representational State Transfer (REST) APIs and their usage
- `Understanding Ansible, Puppet, and Chef`
  - Introduction to network automation tools like Ansible, Puppet, and Chef

### LABS

#### Verifying the basic IOS commands

Lab 1: Taking console of Router
Lab 2: IOS Modes on devices
Lab 3: Use of various show Commands
Lab 4: Use of copy, write, erase and delete command
Lab 5: Configuring various Passwords on devices
Lab 6: Configuring an IPv4 address on a Router
Lab 7: Configuring Telnet, SSH, DHCP, DNS, HTTP services on a Router
Lab 8: Backup and Restoration of Configuration
Lab 9: Performing Password Recovery on a router
Lab 10: Backup and Restoration of IOS on a router

#### Verifying the Operations of “Static Routing”

Lab 11: Configuring Static Routing on two routers using Next Hop IP Address and Self Exit Interface Number
Lab 12: Configuring Static Host Route on Router
Lab 13: Configuring Static Routing on three routers
Lab 14: Changing AD Value of a Static Route – Path Preference; Static Floating Route
Lab 15: Configuring Static Default Route on Router
Lab 16: Configuring Static Discard Route on Router

#### Verifying the Operations of “Open Shortest Path First” Protocol

Lab 17: Configuring Single Area OSPF on router using network command
Lab 18: Enabling OSPF using ip ospf <process-id> area <area-id> command in interface
mode
Lab 19: Verification of OSPF routing table, neighbor table and database table along with
the routing protocol
Lab 20: Verifying an OSPF process on interfaces in detail
Lab 21: Changing Hello and Dead Interval on interfaces
Lab 22: Changing Interface Cost using ip ospf cost command on interface
Lab 23: Use of ip ospf mtu-ignore command on interface
Lab 8: Changing OSPF network type on interface using ip ospf network command
Lab 9: Changing OSPF Priority on interface using ip ospf priority command
Lab 10: Shutting down the OSPF process on interface by using ip ospf shutdown command
Lab 11: Debugging the OSPF adjacency by using debug ip ospf adj command
Lab 12: Changing reference-bandwidth for cost calculation
Lab 13: Flooding default route information using default-information originate and defaultinformation originate always command
Lab 14: Defining an administrative distance value using distance command
Lab 15: Controlling the forwarding of packets over multiple paths using maximum-paths
Lab 16: Using passive-interface command to suppress update information
Lab 17: Changing router-id for OSPF process using router-id command
Lab 18: Shutting down the OSPF process by shutdown command.
Lab 19: Configuring Multi Area OSPF on router using network command
Lab 20: Using show ip ospf border-routers command to verify ABRs and ASBRs

#### Verifying the Operations of “Static Routing” for IPv6

Lab 1: Configuring IPv6 Static Routing on two routers using Next Hop IP Address
Lab 2: Configuring IPv6 Static Host Route on Router
Lab 3: Configuring IPv6 Static Routing on three routers
Lab 4: Changing AD Value of an IPv6 Static Route – Path Preference; Static Floating Route
Lab 5: Configuring IPv6 Static Default Route on Router
Lab 6: Verifying the newly installed Static routes by show ipv6 route command
Lab 7: Ping and Traceroute to check the reachability

#### Verifying the basic operations of Switching

Lab 1: Mac Address-table verification
Lab 2: Adding and Clearing an entry from Mac Address-table
Lab 3: Changing the aging time of mac address table
Lab 4: assign IP address on VLAN interface to take backup and recover the configuration
and IOS.

#### Verifying the Operations of “Virtual Local Area Network”

Lab 1: Creating and renaming Access and Voice VLANs on a switch
Lab 2: Assigning VLAN membership to switchports
Lab 3: Verifying VLAN information by show vlan brief command

### Verifying the Operations of “Trunk, DTP”

Lab 1: Configuring access and trunk ports on switches
Lab 2: Defining trunk encapsulation protocol; Dot1q, ISL or negotiate
Lab 3: Verifying trunk ports by show interfaces trunk command
Lab 4: Changing Native VLAN and removing a VLAN from allowed VLAN list on trunk ports
Lab 5: Using DTP for trunking by using switchport mode dynamic auto/desirable command
Lab 6: Turning off trunk negotiation by switchport nonegotiate command

#### Verifying the Operations of “Inter-VLAN Routing”

Lab 1: Configuring Inter-VLAN Routing using Router
Lab 2: Configuring Inter-VLAN Routing using Layer 3 Switch

#### Verifying the Operations of “Spanning-Tree Protocol”

Lab 1: Verifying Spanning Tree Protocol operation for loop avoidance
Lab 2: Changing Spanning-Tree mode using spanning-tree mode command
Lab 3: Manipulating Root Bridge election process by using root primary / secondary and
priority command
Lab 4: Manipulating Root Port / Designated port election by changing Cost, Bridge Priority
and Port Priority
Lab 5: Configuring spanning-tree portfast feature for rapid convergence

#### Verifying the Operations of “Layer-2 Security”

Lab 1: Configuring and verifying Port-Security on switchports
Lab 2: Performing err-disable recovery of switchports
Lab 3: Configuring BPDU Guard feature on switches

#### Verifying the Operations of “Access-Control Lists”

Lab 1: Creating and defining permit/deny statements in a standard ACL on router using
access-list command
Lab 2: Applying Standard Access Control List on router interface using ip access-group
command
Lab 3: Verifying the reachability after applying standard ACL
Lab 4: Editing existing ACL using ip access-list standard command
Lab 5: Allowing specific IPs to remotely access the router by using ACL with access-class
command in line VTY mode
Lab 6: Creating and defining permit/deny statements in an extended ACL on router using
access-list command
Lab 7: Applying extended Access Control List on router interface using ip access-group
command
Lab 8: Verifying the reachability after applying extended ACL
Lab 9: Editing existing ACL using ip access-list extended command
Lab 10: Blocking services like HTTP, HTTPs, FTP, DNS, DHCP etc with extended ACL by
using port numbers of services
Lab 11: Configuring and applying named ACL on router
Lab 12: Configuring IPv6 access-list and applying on proper interface.

#### Verifying the Operations of “Network Address Translation”

Lab 1: Defining Inside and Outside interface for NAT
Lab 2: Configuring Static NAT on a router
Lab 3: Configuring Dynamic NAT for a range of private IP addresses
Lab 4: Configuring Port Address Translation
Lab 5: Verifying NAT using show ip nat translations and show ip nat statistics command
Lab 6: Debugging the NAT translations by using debug ip nat command
Lab 7: Clearing older translations using clear ip nat translations * command

#### Verifying the Operations of “Hot Standby Router Protocol”

Lab 1: Configuring HSRP using standby <group no> <ip> command
Lab 2: Enabling HSRP Preempt using standby <group no> preempt command
Lab 3: Changing HSRP priority on interface by standby <group no> priority <0-255> command
Lab 4: Tracking and Interface using standby <group no> track command
Lab 5: Configuring and verifying ICMP echo-based IP SLA.
Lab 6: Creating a track object for tracking the SLA, interface and route
Lab 7: Using the track object in HSRP to track the reachability to the IP
Lab 8: Changing HSRP group name by standby <group no> <name> command

#### Verifying the Operations of “Management Protocols”

Lab 1: Configuring CDP and LLDP on Switches
Lab 2: Verifying CDP and LLDP Status using show cdp neighbors and show lldp neighbors command
Lab 3: Configuring and Verifying NTP server on router using NTP master and NTP server command
Lab 4: Enabling SNMP on router by using snmp-server community command
Lab 5: Using logging host command on a router for capturing log messages on Syslog server