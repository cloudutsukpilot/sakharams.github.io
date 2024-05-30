---
layout: post
title: Network Components
categories: [basics]
tags: [Basics]
---

## Basics of Network Components

### **Router**
- `Function`: Routes data packets between different networks.
- `Use Cases`: Connecting multiple networks, directing internet traffic, establishing VPNs.
- `Security Benefits`: Network segmentation, access control, VPN support.

### **Switch**
- `Function`: Connects devices within a single network based on MAC addresses.
- `Use Cases`: Local network connectivity, VLAN segmentation, improving network performance.
- `Security Benefits`: VLAN support, port security, network monitoring.

### **Proxy Server**
- `Function`: Acts as an intermediary between clients and servers, handling requests on behalf of clients.
- `Use Cases`: Content caching, web filtering, anonymizing internet access.
- `Security Benefits`: IP address hiding, content filtering, malware scanning.

### **Wireless Access Point (WAP)**
- `Function`: Provides wireless network access to devices.
- `Use Cases`: Wireless connectivity, BYOD environments, extending network coverage.
- `Security Benefits`: Encryption (WPA3), access control (SSID broadcast control, MAC filtering).

![RP vs API vs LB](/assets/img/basics/network-components.jpeg)

### **Reverse Proxy**
- `Function`: Acts as an intermediary for requests from clients seeking resources from servers. It forwards client requests to the appropriate server and returns the server's response to the client.
- `Use Cases`: Enhancing security by hiding the server's IP address, providing load balancing, caching content, and facilitating secure communication (e.g., SSL termination).
- `Security Benefits`: Protects backend servers from direct exposure to the internet, helps mitigate DDoS attacks, and can enforce web application firewall (WAF) policies.

### **API Gateway**
- `Function`: Manages, secures, and routes API calls between clients and backend services. It can also handle tasks such as request validation, rate limiting, authentication, and authorization.
- `Use Cases`: Centralizing API management, simplifying client access to multiple services, applying consistent security policies, and transforming API requests and responses.
- `Security Benefits`: Enforces security policies like authentication and authorization, protects against API abuse (e.g., rate limiting), and provides monitoring and logging of API activities.

### **Load Balancer**
- `Function`: Distributes incoming network or application traffic across multiple servers to ensure no single server becomes overwhelmed, thereby improving the availability and reliability of applications.
- `Use Cases`: Enhancing the performance and availability of web applications, balancing traffic loads, and providing redundancy.
- `Security Benefits`: Can act as a point of enforcement for SSL/TLS encryption, helps mitigate certain types of DDoS attacks by distributing traffic, and improves overall system resilience.


### **Firewall**
- `Function`: Monitors and controls incoming and outgoing network traffic based on predetermined security rules.
- `Use Cases`: Protecting network perimeters, segmenting internal networks, controlling access to resources, and preventing unauthorized access.
- `Security Benefits`: Blocks malicious traffic, enforces access control policies, and prevents unauthorized access to network resources.

### **VPN Gateway**
- `Function`: Establishes secure connections between an on-premises network and an Azure virtual network over a public network using VPN protocols.
- `Use Cases`: Securely connecting remote offices or users to the corporate network, extending on-premises networks to the cloud.
- `Security Benefits`: Encrypts data in transit, protects data from interception, and ensures secure access to network resources.


### **Web Application Firewall (WAF)**
- `Function`: Protects web applications by filtering and monitoring HTTP requests and blocking malicious traffic.
- `Use Cases`: Protecting web applications from common web exploits like SQL injection, cross-site scripting (XSS), and other OWASP Top 10 vulnerabilities.
- `Security Benefits`: Shields applications from common web threats, provides logging and alerting for security events, and enforces security policies to protect web applications.

### **DNS Firewall**
- `Function`: Filters DNS queries to block access to known malicious domains and prevent data exfiltration through DNS.
- `Use Cases`: Blocking access to malicious sites, preventing DNS-based attacks, and enforcing acceptable use policies.
- `Security Benefits`: Protects against phishing and malware domains, prevents data exfiltration through DNS tunneling, and enhances overall network security.

### **Intrusion Detection System (IDS) / Intrusion Prevention System (IPS)**
- `Function`: Monitors network traffic for suspicious activity and potential threats; IDS alerts on detected threats while IPS can take action to block or mitigate them.
- `Use Cases`: Detecting and preventing network-based attacks, monitoring network traffic for anomalies, and enhancing threat detection capabilities.
- `Security Benefits`: Identifies and blocks malicious traffic, provides real-time threat detection, and enhances the overall security posture by preventing attacks.

### **Network Address Translation (NAT) Gateway**
- `Function`: Translates private IP addresses to public IP addresses (and vice versa) to enable communication between internal and external networks.
- `Use Cases`: Enabling internet access for resources with private IP addresses, conserving public IP addresses, and securing internal network architecture.
- `Security Benefits`: Hides internal IP addresses from external entities, reduces the attack surface by using fewer public IP addresses, and controls outbound traffic.

