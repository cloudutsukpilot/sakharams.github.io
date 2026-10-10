---
layout: post
title: "Cloud Database Services: AWS vs Azure vs Google Cloud"
date: 2026-10-09 00:38:00 +0530
categories: [cloud]
tags: [Cloud, AWS, Azure, GCP, Databases, NoSQL]
image: /assets/img/cloud/cloud-database-services.webp
description: "Managed relational, distributed SQL, NoSQL and caching: what each database family is for and how RDS, Azure SQL, Cloud SQL, DynamoDB, Cosmos DB and others compare."
---

The fastest way to lose a weekend in the cloud is to run your own database on a VM and discover, during an outage,
that the backups were never tested. Managed databases fix that problem, but they bring a new one: every provider
offers a dozen of them, and choosing the wrong family (a document store for heavily relational data, a single-region
SQL engine for a global app) is expensive to undo. This post sorts cloud databases into four families, explains what
each is for, and compares the AWS, Azure and Google Cloud options.

<!-- more -->

## What managed databases give you

A managed database service takes over the undifferentiated work: provisioning, patching, backups and point-in-time
restore, replication and failover, monitoring, and often scaling. You keep schema design, query tuning, access
control and capacity choices.

That doesn't mean "no DBA". It means your DBA time goes on data modelling and performance instead of applying
patches at 2 am. Unless you need an engine or extension the cloud doesn't offer, or have very specific tuning or
licensing reasons, use the managed service.

The families:

| Family | Data model | Best for | Watch out for |
|---|---|---|---|
| Managed relational | Tables, SQL, transactions | Most business applications | Vertical scaling limits, single region |
| Distributed relational | SQL across many nodes or regions | Global scale with strong consistency | Cost, latency of global writes |
| NoSQL | Key-value, document, wide-column | Massive scale, simple access patterns, flexible schema | Designing for queries up front |
| In-memory cache | Key-value in RAM | Sub-millisecond reads, sessions, rate limits | It's a cache: plan for loss |

## Managed relational databases

This is where most applications should start. You get MySQL, PostgreSQL, SQL Server (and on AWS, Oracle and Db2)
with the provider handling backups, high availability across zones, read replicas and minor version patching.

PostgreSQL has become the default choice for new workloads on all three clouds. It's open source, has a huge
extension ecosystem (PostGIS, pgvector for AI embeddings, TimescaleDB), and every provider runs a strong managed
version. SQL Server shops will find Azure the most natural home: Azure SQL Database for new apps, SQL Managed Instance
for lift-and-shift.

{% include cloud-topic-tabs.html cat="databases" topic="relational" %}

> Test a restore, not just a backup. Restore last night's backup to a new instance once a quarter and time it.
> That number is your real recovery time.
{: .prompt-tip }

## Cloud-native and distributed relational

When one primary node can't keep up, or you need writes in several regions with strong consistency, classic managed
databases hit a wall. This family rethinks the architecture: storage separated from compute, distributed across
zones or regions, and scaled horizontally.

Aurora and AlloyDB keep the familiar MySQL and PostgreSQL interfaces but swap in a distributed storage layer, giving
faster failover, more replicas and better throughput. Spanner (and AWS's newer Aurora DSQL) go further with
horizontally scalable, strongly consistent SQL across regions. They're the right answer for global financial
ledgers, inventory and gaming backends, and overkill for most line-of-business apps.

{% include cloud-topic-tabs.html cat="databases" topic="distributed" %}

## NoSQL databases

NoSQL databases trade relational flexibility for predictable performance at massive scale. You model data around
access patterns ("get all orders for customer X, newest first") rather than normalised tables, and in return reads
and writes stay fast whether you have a thousand items or a hundred billion.

The flavours:

- **Key-value and document** (DynamoDB, Cosmos DB, Firestore). JSON-like items with flexible schemas.
  Great for user profiles, carts, catalogues, IoT state and mobile backends.
- **Wide-column** (Bigtable, Cassandra API on Cosmos DB, Amazon Keyspaces). Huge sparse tables keyed by row,
  ideal for time series and very high write rates.

The hardest part of NoSQL is design, not operations. DynamoDB single-table design and Cosmos DB partition keys reward
careful up-front modelling and punish guesswork with hot partitions and throttling. If you can't list your access
patterns yet, a relational database is probably the safer start.

{% include cloud-topic-tabs.html cat="databases" topic="nosql" %}

## In-memory caching

A cache sits in front of a database (or a slow API) and serves repeated reads from memory in well under a
millisecond. It's also the standard home for session state, rate-limit counters, leaderboards and pub/sub
signalling.

Two industry shifts are worth knowing. After Redis changed its licence in 2024, AWS and Google adopted **Valkey**, the
open-source fork, as their default cache engine. And Microsoft is retiring Azure Cache for Redis in favour of
**Azure Managed Redis**.

{% include cloud-topic-tabs.html cat="databases" topic="cache" %}

> Azure Cache for Redis is closed to new customers, and from 1 October 2026 existing customers can't create new
> instances either. Basic, Standard and Premium retire on 30 September 2028, and the Enterprise tiers in March 2027.
> Plan the move to Azure Managed Redis now.
{: .prompt-warning }

## Comparing the providers

- **AWS** has the broadest catalogue: every major engine on RDS, Aurora, DynamoDB, plus specialist services
  (Neptune for graphs, Timestream for time series, DocumentDB, Keyspaces). If you need something specific, it's
  probably there.
- **Azure** is the natural home for SQL Server, and Cosmos DB is the most flexible globally distributed NoSQL
  service, with multiple APIs and tunable consistency.
- **Google Cloud** leads on distributed SQL with Spanner, and AlloyDB is a strong PostgreSQL option. BigQuery
  also blurs the line between database and warehouse (see the
  [analytics post](/posts/cloud/cloud-analytics-services/)).

## Common pitfalls

- **Connection storms.** Serverless functions and autoscaled containers can open thousands of connections and
  exhaust a relational database. Use connection pooling (RDS Proxy, PgBouncer, built-in poolers).
- **Over-provisioning for peaks.** Use serverless or autoscaling tiers for spiky workloads, and stop non-production
  databases outside working hours where the service allows it.
- **Single-AZ production.** It's cheaper until the zone has a bad day. Enable zone-redundant HA for anything that
  matters.
- **Choosing NoSQL for flexibility.** "Schemaless" doesn't mean "no design". Unclear access patterns plus NoSQL
  usually means expensive scans later.
- **Public endpoints.** Put databases on private networking and disable public access. See the
  [networking post](/posts/cloud/cloud-networking-services/) on private endpoints.

## Conclusion

Default to a managed PostgreSQL (or SQL Server on Azure) for business applications. Reach for Aurora, AlloyDB or
Hyperscale when a single node strains, Spanner when you truly need global strongly consistent writes, NoSQL when you
know your access patterns and need massive scale, and a cache when reads are hot and repeated. A useful next step:
for each database you run, write down its recovery time and recovery point objectives, then check whether the current
configuration actually meets them. The side-by-side list is in the [Databases comparison](/cloud/#databases).

## References

- [Amazon RDS documentation](https://docs.aws.amazon.com/rds/)
- [Amazon Aurora documentation](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/)
- [Amazon DynamoDB documentation](https://docs.aws.amazon.com/dynamodb/)
- [Azure SQL documentation](https://learn.microsoft.com/azure/azure-sql/)
- [Azure Cosmos DB documentation](https://learn.microsoft.com/azure/cosmos-db/)
- [Azure Cache for Redis retirement](https://azure.microsoft.com/products/cache)
- [Cloud SQL](https://cloud.google.com/sql/docs), [Spanner](https://cloud.google.com/spanner/docs), [AlloyDB](https://cloud.google.com/alloydb/docs)
- [Memorystore](https://cloud.google.com/memorystore/docs)
