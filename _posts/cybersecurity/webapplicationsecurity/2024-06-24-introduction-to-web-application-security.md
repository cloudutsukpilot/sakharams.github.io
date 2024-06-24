---
layout: post
title: Introduction to Web Application Security
categories: [cybersecurity, webapplicationsecurity]
tags: [CyberSecurity, Web Application Security]
---

## Introduction
- Web application security is the practice of protecting websites, applications, and APIs from attacks. 
- It is a broad discipline, but its ultimate aims are keeping web applications functioning smoothly and protecting business from cyber vandalism, data theft, unethical competition, and other negative consequences.
- The global nature of the Internet exposes web applications and APIs to attacks from many locations and various levels of scale and complexity. 
- As such, web application security encompasses a variety of strategies and covers many parts of the software supply chain.

### Common Web Application Security Risks

1. `Zero-day vulnerabilities`: 
- These are vulnerabilities unknown to an application’s makers, and which thus do not have a fix available. 
- We now see more than 20,000 zero-day vulnerabilities every year. 
- Attacks look to exploit these vulnerabilities quickly, and often follow up by seeking to evade protections put in place by security vendors.

2. `Cross site scripting (XSS)`: 
- XSS is a vulnerability that allows an attacker to inject client-side scripts into a webpage in order to access important information directly, impersonate the user, or trick the user into revealing important information.

3. `SQL injection (SQLi)`:
- SQLi is a method by which an attacker exploits vulnerabilities in the way a database executes search queries. 
- Attackers use SQi to gain access to unauthorized information, modify or create new user permissions, or otherwise manipulate or destroy sensitive data. 

4. `Denial-of-service (DoS) and distributed denial-of-service (DDoS) attacks`: 
- Through a variety of vectors, attackers are able to overload a targeted server or its surrounding infrastructure with different types of attack traffic. 
- When a server is no longer able to effectively process incoming requests, it begins to behave sluggishly and eventually deny service to incoming requests from legitimate users.

5. `Memory corruption`: 
- Memory corruption occurs when a location in memory is unintentionally modified, resulting in the potential for unexpected behavior in the software. 
- Bad actors will attempt to sniff out and exploit memory corruption through exploits such as code injections or buffer overflow attacks.

6. `Buffer overflow`: 
- Buffer overflow is an anomaly that occurs when software writing data to a defined space in memory known as a buffer. Overflowing the buffer’s capacity results in adjacent memory locations being overwritten with data. 
- This behavior can be exploited to inject malicious code into memory, potentially creating a vulnerability in the targeted machine.

6. `Cross-site request forgery (CSRF)`: 
- Cross site request forgery involves tricking a victim into making a request that utilizes their authentication or authorization. 
- By leveraging the account privileges of a user, an attacker is able to send a request masquerading as the user. 
- Once a user’s account has been compromised, the attacker can exfiltrate, destroy or modify important information. 
- Highly privileged accounts such as administrators or executives are commonly targeted.

7. `Credential stuffing`: 
- Attackers may use bots to quickly input large numbers of stolen username and password combinations into a web application’s login portal. 
- If credential stuffing gives the attacker access to a real user’s account, they may steal the user’s data or make fraudulent purchases in the user’s name.

8. `Page scraping`: 
- Attackers may also use bots to steal content from webpages on a large scale. 
- They may use this content to gain a pricing advantage over a competitor, imitate the page owner for malicious purposes, or other reasons.

9. `API abuse`: 
- APIs, or Application Programming Interfaces, are software that allow two applications to communicate with each other. 
- Like any type of software, they may have vulnerabilities that allow attackers to send malicious code into one of the applications or intercept sensitive data as it moves from one application to another. 
- This is an increasingly common attack type as API use increases. 
- The OWASP API Top ten list succinctly summarized key API security risks organizations face today.

10. `Shadow APIs`: 
- Development teams work quickly to meet business objectives, frequently building and publishing APIs without informing security teams. 
- These unknown APIs may expose sensitive company data, operating in the “shadows” as security teams tasked with protecting APIs are unaware of their existence.

11. `Third-party code abuse`: 
- Many modern web applications use a variety of third-party tools — for example, an ecommerce site using a third-party payment processing tool. 
- If attackers find a vulnerability in one of these tools, they may be able to compromise the tool, and steal the data it processes, prevent it from functioning, or use it to inject malicious code elsewhere in the application. 
- Magecart attacks, which skim credit card data from payment processors, are an example of this attack type. 
- These attacks are also considered to be browser supply chain attacks.

12. `Attack surface misconfigurations`: 
- An organization’s attack surface is its entire IT footprint that could be susceptible to cyberattacks: servers, devices, SaaS, and cloud assets that are accessible from the Internet. 
- This attack surface can remain vulnerable to attack due to certain elements being overlooked or misconfigured.

### Important Web Application Security Strategies:

1. `DDoS mitigation`: 
- DDoS mitigation services sit between a server and the public Internet, using specialized filtration and extremely high bandwidth capacity to prevent surges of malicious traffic from overwhelming the server. 
- These services are important because many modern DDoS attacks deliver enough malicious traffic to overwhelm even the most resilient servers.

2. `Web Application Firewall (WAF)`: 
- Which filter out traffic known or suspected to be taking advantage of web application vulnerabilities. 
- WAFs are important because new vulnerabilities emerge too quickly and quietly for nearly all organizations to catch on their own.

3. `API gateways`: 
- Which help identify overlooked ‘shadow APIs,’ and block traffic known or suspected to target API vulnerabilities. 
- They also help manage and monitor API traffic. 

4. `DNSSEC`: 
- A protocol which guarantees a web application’s DNS traffic is safely routed to the correct servers, so users are are not intercepted by an on-path attacker.

5. `Encryption certificate management`: 
- In which a third party manages key elements of the SSL/TLS encryption process, such as generating private keys, renewing certificates, and revoking certificates due to vulnerabilities. 
- This removes the risk of those elements going overlooked and exposing private traffic.

6. `Bot management`: 
- Which uses machine learning and other specialized detection methods to distinguish automated traffic from human users, and prevent the former from accessing a web application.

7. `Client-side security`: 
- Which checks for new third-party JavaScript dependencies and third-party code changes, helping organizations catch malicious activity sooner.

8. `Attack surface management`: 
- Actionable attack surface management tools should provide a single place to map your attack surface, identify potential security risks, and mitigate risks with a few clicks.

### What application security best practices should organizations expect from their vendors?
- Web developers can design and build applications in ways that prevent attackers from accessing private data, fraudulently accessing user accounts, and performing other malicious actions. 
- The OWASP Top 10 list captures the most common application security risks developers should be aware of. 
- Practices to prevent these risks include:

1. `Requiring input validation`: 
- Blocking improperly formatted data from passing through the application’s workflows helps prevent malicious code from entering the application via an injection attack.

2. `Using up-to-date encryption`: 
- Storing user data in an encrypted fashion, along with using HTTPS to encrypt transmission of inbound and outbound traffic, helps prevent attackers from stealing data.

3. `Offering strong authentication and authorization`: 
- Building in and enforcing controls for strong passwords, offering multi-factor authentication options including hard keys, offering access control options, and other practices make it harder for attackers to fraudulently access user accounts and move laterally within your application.

4. `Keeping track of APIs`: 
- Tools exist to identify overlooked ‘shadow APIs’ that could constitute an attack surface, but API security becomes easier when APIs never get overlooked in the first place.

5. `Documenting code changes`: 
- Which helps security and developer teams fix newly introduced vulnerabilities sooner.