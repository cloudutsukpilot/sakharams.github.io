---
layout: post
title: Networking Interview Questions
categories: [networking]
tags: [Networking, DNS, Service Mesh, Interview Questions]
image: /assets/img/networking/networking-posts.jpg
description: Networking interview questions by topic and difficulty for DevOps and SRE roles - fundamentals, DNS, load balancing and TLS, service mesh and cloud networking - with answers
interview_domain: networking
interview_topic: Networking Fundamentals
interview_sections:
  Networking Fundamentals: { topic: Networking Fundamentals }
  "Networking Fundamentals: Advanced": { kind: scenario }
  DNS: { topic: DNS }
  "DNS: Advanced": { kind: scenario }
  "Load Balancing & TLS": { topic: Load Balancing & TLS }
  "Load Balancing & TLS: Advanced": { kind: scenario }
  Service Mesh: { topic: Service Mesh }
  "Service Mesh: Advanced": { kind: scenario }
  Cloud Networking: { topic: Cloud Networking }
  "Cloud Networking: Advanced": { kind: scenario }
---

## Networking Interview Questions

Networking questions for DevOps, SRE and platform interviews, grouped by topic and graded by difficulty: the
fundamentals every engineer needs, DNS, load balancing and TLS, service meshes such as Istio and Envoy, and
networking in the cloud.

- **Beginner**: definitions and the "why"; expected of anyone starting in the area.
- **Intermediate**: how things work and the trade-offs; expected of an engineer who works with them day to day.
- **Advanced**: senior level; production scenarios across several layers.
- **Expert**: staff / lead level; design at scale, guardrails for many teams, judgment.

<!-- more -->

Pick a topic and a level to jump to its questions:

{% include interview-tiles.html %}

Other interview question banks: [DevOps](/posts/devops/interview%20questions/devops-interview-questions/),
[SRE](/posts/devops/sre/sre-interview-questions/), [Kubernetes](/posts/devops/orchestration/kuberentes/kuberentes-interview-questions/),
[Cloud](/posts/cloud/cloud-interview-questions/), [Networking](/posts/networking/networking-interview-questions/),
[AI Infrastructure](/posts/mlops/ai-infrastructure-interview-questions/), [DevSecOps](/posts/devsecops/devsecops-interview-questions/),
[Cloud Security Architect](/posts/architect/cloud%20security/cloud-security-architect-interview-questions/),
[System Design](/posts/architect/system%20design/system-design-interview-questions/), and
[all questions by domain and difficulty](/tags/interview-questions/).

## Networking Fundamentals

### Networking Fundamentals: Beginner

1. What is the difference between TCP and UDP? Give a use case for each.

    - **TCP** is connection-oriented: a three-way handshake, ordered and reliable delivery with retransmission, flow and congestion control
    - **UDP** is connectionless: no handshake, no delivery or ordering guarantee, lower overhead and latency
    - TCP suits web traffic (HTTP/1.1, HTTP/2), databases, SSH, file transfer
    - UDP suits DNS queries, video and voice calls, gaming, and QUIC (which builds HTTP/3 on UDP and adds its own reliability)

### Networking Fundamentals: Intermediate

1. What happens, at the network level, when you type `https://example.com` into a browser and press Enter?

    - The browser checks its caches, then the OS resolver asks a recursive DNS resolver for `example.com`, which walks root → `.com` → the authoritative server and returns the IP
    - A TCP connection is opened to port 443 (three-way handshake), or QUIC over UDP for HTTP/3
    - TLS handshake: client hello with SNI, the server sends its certificate chain, the browser validates it, both agree on keys
    - The browser sends the HTTP request; on the way it may pass a CDN edge, a load balancer and a reverse proxy before reaching the application
    - The response comes back, the browser parses HTML and fetches further resources, reusing the connection where possible
    - Interviewers like candidates who mention where each step can fail and how to time it (`curl -w` for DNS, connect, TLS and first byte)

### Networking Fundamentals: Advanced

1. Small API responses work, but large responses hang until they time out, only for clients over a VPN. What's going on?

    - Classic symptom of an **MTU / path MTU discovery** problem: small packets fit, full-size packets are too big for a link on the path (VPN or tunnel overhead lowers the MTU)
    - Normally the router sends ICMP "fragmentation needed", and the sender lowers the packet size; if a firewall drops ICMP, large packets vanish silently (a "PMTU black hole")
    - Confirm: `ping -M do -s 1472 <host>` and lower sizes until it works; `tracepath` shows the path MTU; a packet capture shows retransmissions of full-size segments
    - Fix: allow ICMP type 3 code 4 (and ICMPv6 Packet Too Big), clamp TCP MSS on the VPN gateway, or lower the MTU on the tunnel interface
    - Same family of issues appears with overlay networks in Kubernetes (VXLAN, IPsec) when node and pod MTUs don't match

### Networking Fundamentals: Expert

1. Design an IP addressing plan for 200 VPCs across three regions plus on-prem data centres.

    - Start from the whole picture: on-prem ranges, partner connections, future acquisitions, and IPv6 plans; overlaps are the expensive mistake
    - Allocate hierarchically: a large block per region, carved into per-environment blocks, then per-VPC CIDRs of standard sizes (e.g. /20 or /21), so routes summarise cleanly
    - Reserve space for growth and for Kubernetes pod IPs (VPC CNI uses VPC addresses; secondary CIDRs or a non-routable range for pods help)
    - Use an IPAM (AWS VPC IPAM, Infoblox, NetBox) as the single source of truth, and let VPC creation request CIDRs from it automatically
    - Plan for overlaps you can't avoid (acquisitions, SaaS): private NAT, PrivateLink, or IPv6
    - Document and enforce: no hand-picked CIDRs, policy checks in the IaC pipeline

## DNS

### DNS: Beginner

1. What are the common DNS record types, and what does TTL control?

    - **A / AAAA**: name to IPv4 / IPv6 address
    - **CNAME**: an alias to another name (not allowed at the zone apex; providers offer ALIAS or ANAME records instead)
    - **MX**: mail servers; **TXT**: free text, used for SPF, DKIM, domain verification; **NS**: the authoritative servers for a zone; **SRV**: service host and port; **CAA**: which CAs may issue certificates
    - **TTL** is how long resolvers and clients may cache an answer: a long TTL means fewer queries and resilience to DNS outages, a short TTL means faster changes and failover
    - Lower the TTL well before a planned migration, then raise it again afterwards

### DNS: Intermediate

1. How does a DNS lookup resolve, and where can caching cause surprises?

    - The application asks the OS **stub resolver**, which asks a **recursive resolver** (ISP, corporate, 8.8.8.8, the VPC resolver, CoreDNS in Kubernetes)
    - The recursive resolver walks the hierarchy if it has nothing cached: root servers → TLD servers (`.com`) → the domain's **authoritative** servers, and caches each answer for its TTL
    - Caches exist at every layer: browser, OS, application runtime (the JVM caches DNS, sometimes forever), recursive resolvers
    - Surprises: clients ignoring TTLs, negative caching (an NXDOMAIN cached for the SOA's negative TTL), split-horizon DNS returning different answers inside and outside the network
    - In Kubernetes, `ndots:5` and search domains turn one lookup into several queries; use fully qualified names for external hosts

### DNS: Advanced

1. How do you handle DNS-level outages inside a service mesh without a full app redeploy?

    - Apps still resolve hostnames, so in-mesh traffic depends on DNS too
    - Istio DNS proxying: the sidecar answers for known services, reducing CoreDNS dependency
    - ServiceEntries with static addresses/endpoints for external dependencies, pushed as config
    - Scale/fix CoreDNS, add NodeLocal DNSCache
    - All of this is control-plane config, so no app redeploy is needed

2. 30% of devices in one region (e.g., EV chargers in Europe) report "backend unavailable", but cloud dashboards are green. How do you isolate DNS vs TLS vs routing drift?

    - Cloud dashboards see only traffic that arrives, so get device-side error codes: DNS timeout/NXDOMAIN, TLS handshake failure, TCP connect timeout
    - Segment the 30%: carrier/APN, country, firmware version, resolved IP
    - DNS: compare what affected vs healthy devices resolve; stale records, carrier resolvers
    - TLS: new intermediate CA not in the device trust store, expired cert on one LB IP, device client certs from one batch expiring together, TLS version/SNI
    - Routing: BGP/peering changes, anycast landing at the wrong PoP, IP allow-list changes on private APNs
    - Reproduce from an affected SIM/network: `dig`, `openssl s_client`, `mtr`

### DNS: Expert

1. Design global traffic management with DNS for a service running in four regions. What are its limits?

    - Routing policies in a managed DNS (Route 53, Azure Traffic Manager, Cloud DNS): latency-based or geolocation routing to the nearest healthy region, weighted routing for gradual shifts
    - Health checks per region on a real user path, so unhealthy regions drop out of answers automatically
    - TTLs of 30–60 s to balance failover speed against query volume and resolver behaviour
    - Limits: clients and resolvers that ignore TTLs, long-lived connections that never re-resolve, and resolvers far from the user making geo decisions inaccurate (EDNS Client Subnet helps)
    - For faster, more precise failover, put an anycast global load balancer or CDN in front (AWS Global Accelerator, Cloudflare, Azure Front Door), with DNS as the outer layer
    - Test failover regularly, and watch for a single DNS provider being a single point of failure (secondary DNS)

## Load Balancing & TLS

### Load Balancing & TLS: Beginner

1. What is the difference between a layer 4 and a layer 7 load balancer?

    - A **layer 4** load balancer works on TCP/UDP connections (IP and port); it's fast and protocol-agnostic but can't see HTTP (AWS NLB, Azure Load Balancer)
    - A **layer 7** load balancer understands HTTP: it routes by host, path or headers, terminates TLS, rewrites requests, and can do retries and sticky sessions (AWS ALB, NGINX, Envoy, Azure Application Gateway)
    - Use L4 for non-HTTP protocols, extreme throughput, static IPs or end-to-end TLS passthrough; L7 for web applications and APIs
    - Both need health checks so they only send traffic to healthy targets

### Load Balancing & TLS: Intermediate

1. Walk through a TLS handshake. What is SNI and what is the certificate chain for?

    - The client sends a ClientHello with supported versions and ciphers, and **SNI** (Server Name Indication): the host name it wants, so one IP can serve many certificates
    - The server answers with its certificate and the intermediate certificates (the **chain**); the client verifies that the chain leads to a trusted root CA, that the name matches and that nothing has expired or been revoked
    - Key exchange (ECDHE) creates shared session keys; TLS 1.3 does this in one round trip and supports 0-RTT resumption
    - **mTLS** adds a client certificate, so the server also verifies the client's identity (common inside service meshes)
    - Most TLS outages are operational: expired certificates, a missing intermediate, a wrong name, or old clients that don't support the server's settings

### Load Balancing & TLS: Advanced

1. After a certificate renewal, browsers work fine but some mobile apps and API clients fail with TLS errors. Why?

    - Most likely the server now sends an **incomplete chain**: the new leaf certificate is served without its intermediate. Browsers fill the gap from their cache or by fetching it (AIA); many apps, SDKs and older clients don't
    - Other candidates: the new certificate comes from a CA the clients don't trust yet, or that chains to a new root missing in old OS trust stores; certificate pinning in the mobile app pinned the old key; a changed key type (ECDSA vs RSA) that old clients can't use
    - Check with `openssl s_client -connect host:443 -servername host -showcerts` and an external TLS checker
    - Fix: serve the full chain (leaf + intermediates), keep pins on the CA or a backup key rather than the leaf, and test renewals against a matrix of real clients
    - Prevent: automated renewal (cert-manager, ACM), expiry monitoring, and a staging endpoint where new certificates go first

### Load Balancing & TLS: Expert

1. How would you design global load balancing for a latency-sensitive service in five regions?

    - Anycast entry points (a global load balancer or CDN) so users connect to the nearest edge, with TLS terminated at the edge to cut handshake latency
    - The edge routes to the closest healthy region, using active health checks and real latency data, and can shift percentages for gradual rollouts or drains
    - Regional layer 7 load balancers across zones, with connection draining and slow start for new targets
    - Failure handling: automatic regional failover with capacity headroom elsewhere, protection against retry storms (retry budgets), and load shedding when a region is overloaded
    - Session and data concerns: avoid sticky sessions across regions, keep state in replicated stores, decide which writes must stay in the home region
    - Observe per region and per edge: latency by user geography, error rates, and the share of traffic each region takes

## Service Mesh

### Service Mesh: Beginner

1. What is a service mesh, and what problems does it solve?

    - A service mesh is an infrastructure layer that handles service-to-service traffic, usually with a proxy (Envoy) next to each workload and a control plane that configures them (Istio, Linkerd, Cilium)
    - It gives every service, without code changes: mutual TLS and workload identity, traffic management (retries, timeouts, canary splits, circuit breaking), and uniform metrics and traces
    - Costs: extra latency and resources per proxy, operational complexity, and another component that can break traffic
    - It pays off with many services and strict security or traffic-control needs; a handful of services usually doesn't need one

### Service Mesh: Intermediate

1. How does mTLS work in Istio, and what is the difference between sidecar and ambient mode?

    - The control plane (istiod) acts as a certificate authority and issues each workload a short-lived certificate whose identity is its Kubernetes service account (a SPIFFE ID)
    - Proxies on both sides perform mutual TLS, so traffic is encrypted and each side knows who the other is; authorization policies then allow or deny calls by identity
    - `PeerAuthentication` sets the mode: `PERMISSIVE` accepts plain text and mTLS (useful during migration), `STRICT` requires mTLS
    - **Sidecar mode** injects an Envoy proxy into every pod; **ambient mode** uses a per-node proxy (ztunnel) for layer 4 and mTLS, plus optional waypoint proxies for layer 7, which removes sidecars and cuts resource use

### Service Mesh: Advanced

1. A new Envoy config rollout silently broke mTLS between edge and mesh. What's your RCA trace?

    - Scope the failing hop: edge gateway → sidecar?
    - Envoy access log response flags (`UF`, `URX`, "TLS error"), `ssl.handshake_error` stats
    - `istioctl proxy-config secret|cluster|listener` on gateway vs workload; `istioctl analyze`
    - Usual suspects: PeerAuthentication STRICT vs DestinationRule TLS mode mismatch, SNI/ALPN change, cert rotation/expiry, trust-root mismatch, min TLS version/ciphers
    - `openssl s_client` from the gateway pod
    - Diff the rollout in Git and correlate with timestamps
    - Why silent: no alert on handshake failures and no canary for config

2. You introduced a sidecar-based caching layer. Suddenly, tail latency spikes. Debug path?

    - A new hop plus resource contention: sidecar CPU limits cause throttling
    - Miss path costs lookup + origin; low hit ratio on long-tail keys; cold cache
    - Cache stampede at expiry: use request coalescing and jittered TTLs
    - GC/memory pressure and eviction churn in the sidecar
    - Smaller connection pool to origin than before
    - Split p99 by hit vs miss in traces; compare with a bypass flag

3. 504s on the playback service. Cloud LB shows healthy, mesh sidecars pass, but users can't stream. Triage?

    - Find which hop emits the 504: LB, ingress, Envoy (`UT` flag) or CDN
    - Health checks are shallow; test the real path: manifest → entitlement/DRM license → segments
    - Timeout chain mismatch: LB idle timeout vs Envoy route timeout (default 15s) vs app, and long-lived streaming requests
    - Slow dependency: DRM/licence, entitlement, origin storage
    - Retry storms amplifying load
    - Trace one failing session end to end

### Service Mesh: Expert

1. How would you implement fine-grained service discovery across 1000+ microservices using Envoy or Istio?

    - istiod builds the registry from Kubernetes Services plus ServiceEntries (VMs, external) and pushes it via xDS (CDS/EDS)
    - At scale, limit what each proxy receives: `Sidecar` resource, `exportTo`, `discoverySelectors`. Otherwise every Envoy holds the whole mesh
    - Fine-grained routing: VirtualService header/version matches, DestinationRule subsets, locality-aware LB, outlier detection
    - Multi-cluster: shared root of trust, east-west gateways
    - Consider ambient mode (ztunnel + waypoint) to drop per-pod sidecar overhead
    - Watch: xDS push latency, config rejections, Envoy memory

2. How would you use Envoy + Istio to route low-latency live streams differently from VOD without service restarts?

    - VirtualService matches on host/path/header (`/live/*` vs `/vod/*`) to different backends, applied dynamically via xDS
    - Live: tight timeouts, minimal retries, dedicated node pools, locality-aware LB
    - VOD: aggressive caching, longer timeouts, retries
    - Per-subset DestinationRule: connection pools, outlier detection
    - Weighted shifting for changes; verify with `istioctl proxy-config routes`

## Cloud Networking

### Cloud Networking: Beginner

1. What is the difference between a public and a private subnet, and how does a private instance reach the internet?

    - A **public subnet** has a route to an internet gateway; instances with public IPs there can be reached from the internet (subject to security groups)
    - A **private subnet** has no direct route to the internet gateway; its instances can't be reached from outside
    - Private instances reach the internet outbound through a **NAT gateway** in a public subnet, which hides their addresses
    - Better still for cloud services: **VPC endpoints** (gateway endpoints for S3 and DynamoDB, interface endpoints for others) keep traffic on the provider's network and avoid NAT costs
    - Put databases and application servers in private subnets; only load balancers and bastions (or nothing, with SSM Session Manager) in public ones

### Cloud Networking: Intermediate

1. When would you use VPC peering, a Transit Gateway or PrivateLink?

    - **VPC peering**: a direct, private link between two VPCs; simple and cheap, but not transitive, and a full mesh becomes unmanageable beyond a handful of VPCs
    - **Transit Gateway** (Azure Virtual WAN, GCP Network Connectivity Center): a regional hub that connects many VPCs and on-prem links with central route tables; for tens or hundreds of VPCs
    - **PrivateLink**: exposes one *service* from a VPC to consumers in other VPCs or accounts through an endpoint; no routing between the networks, and overlapping CIDRs are fine
    - Rule of thumb: PrivateLink to share a service, Transit Gateway to connect networks at scale, peering for a few VPCs with high traffic

### Cloud Networking: Advanced

1. Pods in an EKS cluster can't reach an RDS database in a peered VPC, but EC2 instances in the same subnets can. Where do you look?

    - The difference between pods and instances is the source IP: check whether pods use VPC IPs (AWS VPC CNI) or an overlay or custom networking with a secondary CIDR
    - If pods come from a secondary CIDR, the **route tables** in the database VPC and the peering need routes back to that range
    - The RDS **security group** must allow the pods' source: the pod CIDR, or the node or pod security group (with security groups for pods, the pod has its own)
    - Peering doesn't support transitive routing or overlapping CIDRs; check the pod range doesn't overlap the database VPC
    - Network ACLs on either side, and SNAT settings (`AWS_VPC_K8S_CNI_EXTERNALSNAT`) that change the source address
    - Test from a debug pod: `nc -vz <rds-endpoint> 5432`, and use VPC Reachability Analyzer and flow logs to see where packets are rejected

### Cloud Networking: Expert

1. Design the network for 100 AWS accounts and two on-prem data centres, with central egress and traffic inspection.

    - Hub and spoke: a Transit Gateway (or Cloud WAN for multiple regions) in a network account, shared to spoke accounts with AWS RAM; separate TGW route tables for production, non-production and shared services to segment traffic
    - Hybrid connectivity: Direct Connect with redundant links in two locations and a site-to-site VPN as backup, BGP for route exchange
    - Central egress VPC with NAT gateways and a firewall (AWS Network Firewall or a third-party appliance) for inspection and domain filtering; east-west inspection for traffic between sensitive segments
    - DNS: Route 53 Resolver inbound and outbound endpoints and shared resolver rules for hybrid name resolution; private hosted zones associated centrally
    - Centralised interface endpoints for AWS services, to cut NAT costs and keep traffic private
    - IPAM-managed, non-overlapping CIDRs; everything deployed as code with flow logs to a central log account
