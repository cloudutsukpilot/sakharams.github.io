---
layout: post
title: System Design Interview Questions
categories: [architect, system design]
tags: [Architect, System Design, Interview Questions]
image: /assets/img/architect/system-design/system-design-posts.png
description: System design interview questions by topic and difficulty - fundamentals, data and storage, caching and messaging, and classic design problems - with answers
interview_domain: system-design
interview_topic: System Design Fundamentals
interview_sections:
  System Design Fundamentals: { topic: System Design Fundamentals }
  "System Design Fundamentals: Advanced": { kind: scenario }
  "Data & Storage": { topic: Data & Storage }
  "Data & Storage: Advanced": { kind: scenario }
  "Caching & Messaging": { topic: Caching & Messaging }
  "Caching & Messaging: Advanced": { kind: scenario }
  Classic Design Problems: { topic: Classic Design Problems }
  "Classic Design Problems: Beginner": { kind: scenario }
  "Classic Design Problems: Intermediate": { kind: scenario }
  "Classic Design Problems: Advanced": { kind: scenario }
  "Classic Design Problems: Expert": { kind: scenario }
---

## System Design Interview Questions

System design questions for software, platform and architect interviews, grouped by topic and graded by
difficulty: the fundamentals and trade-offs, choosing and scaling data stores, caching and messaging, and
classic design problems. For the underlying concepts, see
[System Design - Building Blocks](/posts/architect/system%20design/system-design-building-blocks/).

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

## System Design Fundamentals

### System Design Fundamentals: Beginner

1. What do latency, throughput and availability mean, and how much downtime do "three nines" allow?

    - **Latency**: how long one request takes (report percentiles: p50, p95, p99, not averages)
    - **Throughput**: how many requests per second a system handles
    - **Availability**: the share of time (or requests) the system works correctly
    - 99.9% ("three nines") allows about 8.8 hours of downtime a year, or 43 minutes a month; 99.99% about 52 minutes a year; 99.999% about 5 minutes a year
    - Each extra nine costs a lot more (redundancy, automation, operations), so pick the target from what users and the business need
    - Availability of dependencies multiplies: a service relying on three 99.9% components in series is at best about 99.7%

### System Design Fundamentals: Intermediate

1. Explain the CAP theorem. Why is PACELC a more useful way to think about it?

    - **CAP**: when a network **p**artition happens, a distributed data store must choose between **c**onsistency (every read sees the latest write or gets an error) and **a**vailability (every request gets an answer, possibly stale)
    - Partitions are rare, so CAP says little about normal operation
    - **PACELC** adds: **E**lse (no partition), the trade-off is **L**atency versus **C**onsistency, because synchronous replication for strong consistency adds latency
    - Examples: Spanner and etcd choose consistency (PC/EC); Cassandra and DynamoDB (by default) favour availability and low latency (PA/EL), with tunable consistency
    - In interviews, pick per use case: payments and inventory need consistency, feeds and view counts can be eventually consistent

### System Design Fundamentals: Advanced

1. A service handles 1,000 requests per second today and must reach 100,000 within a year. Walk through how you'd scale it.

    - Measure first: per-request cost, the current bottleneck, and the read/write mix; scaling plans depend on it
    - Make the app tier stateless and scale it horizontally behind load balancers with autoscaling
    - Cut work per request: caching (CDN for static and cacheable content, Redis for hot data), connection pooling, efficient queries and indexes
    - Scale reads with replicas and caches; scale writes by partitioning (sharding) by a key that spreads load evenly
    - Move slow or non-urgent work to queues and background workers
    - Protect the system: rate limiting, backpressure, timeouts and circuit breakers so overload doesn't cascade
    - Grow in steps (10× at a time), load-testing each step, because new bottlenecks appear at each order of magnitude

### System Design Fundamentals: Expert

1. How do you design a multi-region active-active system, and what trade-offs do you accept?

    - Why: lower latency for global users and surviving a full regional outage
    - Route users to the nearest healthy region (anycast or geo-DNS), with capacity in each region to absorb another region's traffic
    - The hard part is data. Options: partition data by home region (each user's data has one writing region), multi-leader replication with conflict resolution (last-writer-wins, CRDTs), or a globally consistent database (Spanner, CockroachDB) with higher write latency
    - Decide per data type: strongly consistent for money and inventory (single home region or consensus), eventually consistent for profiles, feeds and analytics
    - Make operations idempotent and use unique IDs that don't collide across regions
    - Accept the costs: duplicated infrastructure, cross-region data transfer, complex testing, and failure modes such as split-brain; run regular regional failover drills

## Data & Storage

### Data & Storage: Beginner

1. When would you choose a SQL database, and when a NoSQL database?

    - **SQL (relational)**: structured data with relationships, ACID transactions, flexible queries and joins (PostgreSQL, MySQL); the default for most business data
    - **Key-value / wide-column** (DynamoDB, Cassandra): huge scale and predictable latency for known access patterns, limited querying
    - **Document** (MongoDB, Cosmos DB): flexible JSON documents that are read and written as a whole
    - **Graph** (Neo4j): highly connected data and relationship queries
    - **Search** (Elasticsearch, OpenSearch) and **time-series** (Prometheus, InfluxDB, TimescaleDB) for specialised queries
    - Start from the access patterns, consistency needs and scale; many systems combine a relational core with specialised stores

### Data & Storage: Intermediate

1. Explain replication and sharding. How does consistent hashing help with sharding?

    - **Replication** keeps copies of the same data on several nodes: leader-follower for read scaling and failover, synchronous or asynchronous (trading durability against write latency)
    - **Sharding** (partitioning) splits the data across nodes by a key, so each node holds only part of it; it scales writes and storage
    - Shard key choice is crucial: high cardinality and even load; a bad key creates hot shards
    - Plain `hash(key) % N` moves almost every key when N changes; **consistent hashing** places nodes and keys on a ring, so adding or removing a node moves only about 1/N of the keys, and virtual nodes even out the load
    - Costs of sharding: cross-shard queries and transactions become hard, and resharding needs careful tooling

### Data & Storage: Advanced

1. One tenant's traffic is driving the shared database to 90% CPU and hurting all other customers. What do you do?

    - Short term: confirm with per-tenant query metrics, then apply per-tenant rate limits or query quotas, and move that tenant's heavy reporting queries to a read replica
    - Fix the queries: missing indexes, N+1 patterns, unbounded scans in that tenant's workload
    - Cache that tenant's hot reads
    - Structural fix: isolate large tenants (their own shard, database or cell), keeping small tenants pooled, so one tenant can't affect everyone ("noisy neighbour")
    - Long term: a cell-based or tiered architecture, tenant-aware monitoring, and pricing that reflects heavy usage

### Data & Storage: Expert

1. How do you keep data consistent across microservices that each own a database? Compare two-phase commit and sagas.

    - **Two-phase commit (2PC)**: a coordinator asks every participant to prepare, then commit; strongly consistent, but blocking, slow and fragile when the coordinator or a participant fails, and many modern stores don't support it
    - **Saga**: a business transaction as a sequence of local transactions, each publishing an event; on failure, *compensating* actions undo earlier steps (refund the payment, release the stock)
    - Sagas are either choreographed (services react to each other's events) or orchestrated (a central workflow, e.g. Temporal or Step Functions); orchestration is easier to follow and debug
    - Make every step idempotent and use the **transactional outbox** so a database write and its event can't diverge
    - Accept that the system is eventually consistent, and design the UI and business rules for intermediate states ("payment pending")

## Caching & Messaging

### Caching & Messaging: Beginner

1. What is caching, and where can caches live in a typical web system?

    - A cache stores the result of expensive work (a database query, a rendered page, a computed value) in faster storage, so repeated requests are cheaper and quicker
    - Layers: the browser cache, a CDN at the edge, a reverse proxy, an in-process cache in the application, a distributed cache (Redis, Memcached), and the database's own buffer cache
    - The closer to the user, the bigger the latency win, but the harder it is to invalidate
    - The hard part is staleness: deciding how long data may be out of date (TTL) and how to invalidate it when it changes

### Caching & Messaging: Intermediate

1. Compare cache-aside, write-through and write-back caching, and queues versus pub/sub messaging.

    - **Cache-aside**: the app reads the cache, and on a miss reads the database and fills the cache; simple and common; data can be stale until TTL or invalidation
    - **Write-through**: writes go to the cache and the database together; reads are fresh, writes are slower
    - **Write-back**: writes go to the cache and are flushed to the database later; fast writes, risk of data loss if the cache fails
    - Eviction policies (LRU, LFU) decide what to drop when the cache is full
    - **Queue** (SQS, RabbitMQ): each message is processed by one consumer; for distributing work
    - **Pub/sub or log** (SNS, Kafka): each message goes to every subscriber or consumer group; for broadcasting events, and Kafka keeps a replayable history

### Caching & Messaging: Advanced

1. A very popular cache key expires and the database is suddenly flooded with identical queries. How do you prevent it?

    - This is a **cache stampede** (thundering herd): many requests miss at once and all go to the database
    - **Request coalescing / single flight**: only one request recomputes the value, others wait for it (a lock per key)
    - **Early or probabilistic refresh**: refresh hot keys in the background before they expire
    - **Jittered TTLs** so many keys don't expire at the same moment
    - **Serve stale while revalidating**: return the old value while one request refreshes it
    - Protect the database anyway: connection limits, load shedding, and a circuit breaker

### Caching & Messaging: Expert

1. How do you get effectively exactly-once processing in an event-driven system?

    - Networks and brokers deliver messages at least once, so true exactly-once delivery isn't available end to end; aim for exactly-once *effects*
    - **Idempotent consumers**: record processed message IDs (or use natural idempotency keys) in the same transaction as the side effect, and skip duplicates
    - **Transactional outbox** on the producer side: write the state change and the outgoing event in one database transaction; a relay publishes the outbox (e.g. with Debezium change data capture)
    - Kafka's idempotent producers and transactions give exactly-once *within* Kafka (read-process-write), not to external systems
    - Ordering: partition by entity key so events for one entity are processed in order
    - Plan for poison messages: retries with backoff, dead-letter queues, and replay tooling

## Classic Design Problems

### Classic Design Problems: Beginner

1. Design a URL shortener like bit.ly.

    - Requirements: create a short link for a long URL, redirect quickly, maybe custom aliases and expiry; reads vastly outnumber writes (e.g. 100:1)
    - Key generation: base62-encode a unique ID (from a counter service or pre-allocated ID ranges) or take a hash and handle collisions; 7 base62 characters give about 3.5 trillion codes
    - Storage: a key-value store (DynamoDB, Cassandra, or a sharded relational database) mapping code → URL and metadata
    - Redirects: HTTP 301 (cacheable by browsers) or 302 (lets you count every click); cache hot codes in Redis and at the CDN
    - Extras: analytics via asynchronous events to a stream, abuse protection (rate limits, malicious URL scanning)

### Classic Design Problems: Intermediate

1. Design a rate limiter for a public API.

    - Requirements: limits per API key or user (e.g. 100 requests per minute), low latency, works across many gateway instances, clear `429 Too Many Requests` responses with `Retry-After`
    - Algorithms: **token bucket** (allows bursts, smooth average; the most common), **leaky bucket**, **fixed window** (simple, bursts at window edges), **sliding window log or counter** (more accurate)
    - Shared state in Redis with atomic operations (Lua scripts or `INCR` with expiry) so all gateway instances see the same counts
    - Place it at the API gateway or edge; fall back to local limits if Redis is unavailable (fail open or closed, decided per API)
    - Different limits per plan, and monitoring of rejected requests per client

### Classic Design Problems: Advanced

1. Design the news feed for a social network with 100 million daily users.

    - Feed generation: **fan-out on write** (push new posts into each follower's feed cache) makes reads fast but is expensive for users with millions of followers; **fan-out on read** (pull at read time) is the reverse
    - Use a hybrid: push for normal users, pull for celebrities, merged at read time
    - Storage: posts in a sharded store; per-user feed lists of post IDs in Redis or a wide-column store; media in object storage behind a CDN
    - Ranking: a service that scores candidate posts (recency, affinity, engagement), and pagination with cursors
    - Asynchronous pipeline: new posts go through a queue to fan-out workers
    - Scale and reliability: cache aggressively, degrade gracefully (serve a cached feed if ranking is slow), and shard by user ID

### Classic Design Problems: Expert

1. Design a global chat system like WhatsApp for one billion users.

    - Connections: persistent WebSocket (or MQTT) connections to edge gateway servers in each region; a session service tracks which gateway holds each user's connection
    - Message flow: sender → gateway → chat service, which stores the message, then routes it to the recipient's gateway, or queues it for push notification if offline
    - Storage: messages in a wide-column store partitioned by conversation ID with time ordering; per-device delivery state for sent, delivered and read receipts
    - Ordering and delivery: per-conversation sequence numbers, at-least-once delivery with client-side de-duplication by message ID
    - Groups: fan-out per member for small groups; large groups use a different path
    - End-to-end encryption (Signal protocol): the server only relays ciphertext, which also limits server-side search and moderation
    - Global scale: users homed to a region, cross-region routing for conversations between regions, and graceful degradation during regional outages
