---
layout: post
title: Network Segmentation
categories: [architect, cloud, network]
tags: [Cloud, Cloud Architect, Security Architect, Cloud Security]
---


## Introduction
- Network segmentation is the core of multi-layer defense in depth for modern services. 
- Segmentation slow down an attacker if he cannot implement attacks such as:

    + SQL-injections, see SQL Injection Prevention Cheat Sheet;
    + Compromise of workstations of employees with elevated privileges;
    + Compromise of another server in the perimeter of the organization;
    + Compromise of the target service through the compromise of the LDAP directory, DNS server, and other corporate services and sites published on the Internet.

- Segmentation will avoid the following situations:
    + Executing arbitrary commands on a public web server (NginX, Apache, Internet Information Service) prevents an attacker from gaining direct access to the database;
    + Having unauthorized access to the database server, an attacker cannot access CnC on the Internet.

### Content
- Three-layer network architecture
- Interservice interaction
- Network security policy

### Three-layer network architecture¶
- By default, developed information systems should consist of at least three components (**security zones**):
    + FRONTEND;
    + MIDDLEWARE;
    + BACKEND.

#### FRONTEND
- A frontend is a set of segments with the following network elements:
    + balancer;
    + application layer firewall;
    + web server;
    + web cache.

    ![Frontend Segments](/assets/img/architect/implementation/network-segmentation/frontend-segments.png)

#### MIDDLEWARE¶
- A middleware is a set of segments to accommodate the following network elements:
    + web applications that implement the logic of the information system (processing requests from clients, other services of the company and external services; execution of requests);
    + authorization services;
    + analytics services;
    + message queues;
    + stream processing platform.

    ![Middleware Segments](/assets/img/architect/implementation/network-segmentation/middleware-segments.png)

#### BACKEND
- A backend is a set of network segments to accommodate the following network elements:
    + SQL database;
    + LDAP directory (Domain controller);
    + storage of cryptographic keys;
    + file server.

    ![Backend Segments](/assets/img/architect/implementation/network-segmentation/backend-segments.png)

### Example of Three-layer network architecture¶
- The following example shows an organization's local network. The organization is called "Сontoso".

    ![Three Layered network Architecture](/assets/img/architect/implementation/network-segmentation/three-layered-network-architecture.png)

- The edge firewall contains 2 VLANs of FRONTEND security zone:
    + `DMZ Inbound` - a segment for hosting services and applications accessible from the Internet, they must be protected by WAF;
    + `DMZ Outgoing` - a segment for hosting services that are inaccessible from the Internet, but have access to external networks (the firewall does not contain any rules for allowing traffic from external networks).

- The internal firewall contains 4 VLANs:
    + `MIDDLEWARE` security zone contains only one VLAN with name APPLICATIONS - a segment designed to host information system applications that interact with each other (interservice communication) and interact with other services;
    + `BACKEND` security zone contains:
        * `DATABASES` - a segment designed to delimit various databases of an automated system;
        * `AD SERVICES` - segment designed to host various Active Directory services, in the example only one server with a domain controller Contoso.com is shown;
        * `LOGS` - segment, designed to host servers with logs, servers centrally store application logs of an automated system.


### Interservice interaction
- Usually some information systems of the company interact with each other.
- It is important to define a firewall policy for such interactions. 
- The base allowed interactions are indicated by the green arrows and prohibited interactions are incdicated by red in the image below: 

    ![Interservice Interaction](/assets/img/architect/implementation/network-segmentation/interservice-interaction.png)

- Key Points:
    + Access between FRONTEND and MIDDLEWARE segments of different information systems is prohibited;
    + Access from the MIDDLEWARE segment to the BACKEND segment of another service is prohibited (access to a foreign database bypassing the application server is prohibited).
    + Forbidden accesses are indicated by red arrows in the image below: Prohibited Interservice Communication

### Many applications on the same network
- If you prefer to have fewer networks in your organization and host more applications on each network, it is acceptable to host the load balancer on those networks. 
- This balancer will balance traffic to applications on the network. 
- In this case, it will be necessary to open one port to such a network, and balancing will be performed, for example, based on the HTTP request parameters. 

    ![Interservice Communication with balancing](/assets/img/architect/implementation/network-segmentation/many-applications-on-the-same-network.png)

- As you can see, there is only one incoming access to each network, access is opened up to the balancer in the network. 
- However, in this case, segmentation no longer works, access control between applications from different network segments is performed at the 7th level of the OSI model using a balancer.


### Network security policy
- The organization must define a "paper" policy that describes firewall rules and basic allowed network access. 
- This policy is at least useful:
    + network administrators;
    + security representatives;
    + IT auditors;
    + architects of information systems and software;
    + developers;
    + IT administrators.
- It is convenient when the policy is described by similar images. The information is presented as concisely and simply as possible.


#### Permissions for CI/CD
- The network security policy may define, for example, the basic permissions allowed for the software development system. 

    ![Permissions for CICD](/assets/img/architect/implementation/network-segmentation/permissions-for-cicd.png)

#### Secure logging
- It is important that in the event of a compromise of any information system, the logs should be protected by syslog server to prevent being modified by an attacker.
- The network security policy for this activity looks like this: 

    ![Secure Logging](/assets/img/architect/implementation/network-segmentation/secure-logging.png)

- In this example, we are also talking about application logs that may contain security events, as well as potentially important events that may indicate an attack.

#### Permissions for monitoring systems
- Suppose a company uses Zabbix as an IT monitoring system. 
- In this case, the policy might look like this: Zabbix-Example
    ![Permissions for Monitoring Systems](/assets/img/architect/implementation/network-segmentation/permissions-for-monitoring-systems.png)


References:
- https://cheatsheetseries.owasp.org/cheatsheets/Network_Segmentation_Cheat_Sheet.html
- https://github.com/sergiomarotco/Network-segmentation-cheat-sheet