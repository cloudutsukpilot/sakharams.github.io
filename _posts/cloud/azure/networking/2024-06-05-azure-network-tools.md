---
layout: post
title: Azure Network Tools
categories: [cloud, azure, networking]
tags: [Cloud, Azure, Networking]
---

## Introduction
- Azure provides a variety of tools to troubleshoot network-related issues. 
- These tools are part of Azure Network Watcher, which offers capabilities to monitor, diagnose, and gain insights into your network infrastructure. 

- Below is the list of tools available:

### 1. **IP Flow Verify**
   - `Purpose`: Checks if a packet is allowed or denied by NSG rules.
   - `Usage`: Specify the VM, direction (inbound/outbound), source and destination IP addresses, ports, and protocol to verify traffic flow.

### 2. **Connection Troubleshoot**
   - `Purpose`: Diagnoses connectivity issues between a source and destination.
   - `Usage`: Specify the source VM, destination (can be an IP address, FQDN, or URI), and protocol to test connectivity and get hop-by-hop path information.

### 3. **Network Security Group (NSG) Flow Logs**
   - `Purpose`: Captures logs of IP traffic flowing through NSGs.
   - `Usage`: Enable NSG flow logs to analyze traffic patterns, detect anomalies, and troubleshoot network issues. Logs are stored in an Azure Storage account and can be analyzed using tools like Azure Monitor or third-party solutions.

### 4. **Next Hop**
   - `Purpose`: Determines the next hop for traffic destined to a specific IP address.
   - `Usage`: Specify the VM and destination IP to see the next hop and troubleshoot routing issues.

### 5. **VPN Troubleshoot**
   - `Purpose`: Diagnoses issues with Azure VPN Gateway connections.
   - `Usage`: Provides detailed information and troubleshooting steps for diagnosing and resolving common VPN gateway and connection issues.

### 6. **Packet Capture**
   - `Purpose`: Captures packets to and from a VM for deep-dive network traffic analysis.
   - `Usage`: Set up and configure packet capture sessions to collect network traffic data for analysis. Captured data is stored in an Azure Storage account.

### 7. **Topology**
   - `Purpose`: Visualizes the network topology of resources in a virtual network.
   - `Usage`: Provides a graphical representation of your network architecture, helping you understand and troubleshoot the network configuration.

### 8. **Connection Monitor**
   - `Purpose`: Monitors and tracks the connectivity status and performance of your network connections.
   - `Usage`: Create and configure connection monitors to track connectivity between endpoints, view latency, packet loss, and other metrics.

### 9. **Effective Security Rules**
   - `Purpose`: Shows the effective security rules applied to a network interface.
   - `Usage`: View and understand the combined effect of all NSGs and their rules applied to a VM's network interface.

### 10. **NSG Diagnostic**
  - `Purpose`: Provides detailed diagnostics information about NSG rules and their impact.
  - `Usage`: Run diagnostics to get a detailed report on NSG rule application and troubleshoot any rule-related issues.

### 11. **ExpressRoute Monitor**
  - `Purpose`: Monitors and diagnoses ExpressRoute circuits.
  - `Usage`: Provides visibility into the health, performance, and connectivity status of ExpressRoute circuits.

### 12. **Service Endpoint Monitor**
  - `Purpose`: Monitors the connectivity and performance of service endpoints.
  - `Usage`: Tracks and reports the status and performance of service endpoints configured within your virtual networks.

### 13. **Traffic Analytics**
  - `Purpose`: Provides insights and analysis of network traffic patterns.
  - `Usage`: Analyzes NSG flow logs to deliver insights on network traffic, identify security threats, and optimize network performance.

