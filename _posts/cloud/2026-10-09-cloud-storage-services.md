---
layout: post
title: "Cloud Storage Services: AWS vs Azure vs Google Cloud"
date: 2026-10-09 00:42:00 +0530
categories: [cloud]
tags: [Cloud, AWS, Azure, GCP, Storage]
image: /assets/img/cloud/cloud-storage-services.webp
description: "Object, block, file and archive storage explained: what each type is for, and how S3, Azure Blob, Cloud Storage and their siblings compare."
---

Somebody needs "a place to put files", and three weeks later you find 40 TB of logs in a premium SSD volume
attached to a VM nobody remembers creating. Storage is the cloud category where picking the wrong type costs you
twice: once in performance, and again every month on the bill. The good news is that the types are the same
everywhere. Learn the four, and the AWS, Azure and Google Cloud services fall into place.

<!-- more -->

## The four kinds of cloud storage

Every provider offers the same four building blocks. The difference between them is **how you access the data**,
and that decides what it's good for:

| Type | Accessed as | Typical use | Scales to |
|---|---|---|---|
| Object | HTTP API, whole objects by key | Static assets, backups, data lakes, logs, media | Effectively unlimited |
| Block | A raw disk attached to one VM | OS disks, databases, anything needing a filesystem on a VM | Tens of TB per volume |
| File | A network share (NFS/SMB) mounted by many clients | Shared content, lift-and-shift apps, home directories | Hundreds of TB to PB |
| Archive | Object storage with slow or costly retrieval | Compliance retention, long-term backups | Effectively unlimited |

A rough rule: if an application can talk HTTP, use object storage, because it's the cheapest, most durable and
most scalable option. Block storage is for things that need a local-looking disk. File storage is for things that
need to share a filesystem and can't be rewritten to use objects.

Two concepts apply across all of them: **redundancy** (copies within a zone, across zones, or across regions, each
costing more) and **access tiers** (pay less to store, more to read). Getting those two settings right matters more
than which provider you're on.

## Object storage

Object storage is the backbone of the cloud. You put objects (any blob of bytes plus metadata) into a bucket or
container and fetch them by key over HTTPS. There are no disks to size and no filesystem to manage. Durability is
designed for eleven nines, and you pay per GB stored, per request, and for data leaving the region.

It's where static websites, user uploads, backups, log archives and data lakes live. Most analytics engines
(Athena, BigQuery, Synapse, Spark) query object storage directly. Treat it as the default home for any data that
isn't a database.

{% include cloud-topic-tabs.html cat="storage" topic="object" %}

> Block public access at the account or subscription level and open individual buckets only when you mean to.
> Accidentally public buckets are still one of the most common cloud data leaks.
{: .prompt-warning }

## Block storage for VMs

Block storage gives a VM what looks like a local disk: a raw volume you format with a filesystem. It's what your
OS disk is, and what self-managed databases want. It's attached to one VM at a time (with a few multi-attach
exceptions) and usually lives in a single availability zone.

Performance is the whole game here. Each provider sells tiers by IOPS, throughput and latency, and the newer tiers
(gp3, Premium SSD v2, Hyperdisk) let you buy performance separately from capacity. That's a big improvement on the
old model, where you had to over-provision gigabytes just to get IOPS.

One thing people miss: the VM size also caps disk throughput. A top-tier disk attached to a small VM won't deliver
its rated IOPS, so check both limits.

{% include cloud-topic-tabs.html cat="storage" topic="block" %}

## Managed file shares

File storage gives you a network filesystem that many machines can mount at once, over NFS (Linux) or SMB
(Windows). It's the bridge for applications that expect a shared drive: CMS uploads folders, legacy line-of-business
apps, home directories, shared configuration, some HPC and ML training pipelines.

It's also more expensive per GB than object storage and harder to scale for very high request rates. For new
applications I'd rather write to object storage directly. For lift-and-shift, managed file shares save a lot of
rewriting.

{% include cloud-topic-tabs.html cat="storage" topic="file" %}

You'll find more Azure detail in the posts on [Azure Files](/posts/cloud/azure/storage/azure-files/) and
[Azure NetApp Files](/posts/cloud/azure/storage/azure-netapp-files/).

## Archive storage

Archive storage is for data you must keep but almost never read: compliance records, old backups, raw footage,
seven-year audit trails. Storage costs drop to a fraction of a cent per GB per month. The catch is on the way out.

This is where the providers genuinely differ. Azure's Archive tier is offline: you rehydrate a blob before reading
it, which can take hours. AWS gives you a choice from instant to 48 hours, priced accordingly. Google keeps
millisecond access on every class and charges more per retrieval instead. All three have **minimum storage
durations** (90 to 365 days). Delete or move data earlier and you pay for the remainder anyway.

{% include cloud-topic-tabs.html cat="storage" topic="archive" %}

> Use lifecycle rules, not manual moves. A rule like "Cool after 30 days, Archive after 180, delete after 7 years"
> runs for free and doesn't depend on anyone remembering.
{: .prompt-tip }

## Comparing the providers

For storage, the three clouds are closer to identical than in any other category. The practical differences:

- **Ecosystem.** S3's API is the lingua franca. Lots of third-party tools speak S3 natively, and on-premises
  appliances often offer S3-compatible endpoints.
- **Simplicity.** Google Cloud Storage has the cleanest model: one API, every class online, multi-region
  without setting up replication.
- **Hybrid file shares.** Azure Files with File Sync is the easiest way to extend Windows file servers into the
  cloud.
- **High-performance file.** All three now offer NetApp-based options. AWS's FSx family has the broadest range
  (Lustre, Windows, ONTAP, OpenZFS).

## Common pitfalls

- **Forgetting egress.** Storing a petabyte is cheap. Serving it to the internet or another region is not. Put a
  CDN in front of public content and keep compute near the data.
- **Request costs on small objects.** Millions of tiny files mean millions of PUT and GET charges, and archive
  tiers add per-object overhead. Batch small files before archiving.
- **Snapshots that never die.** Volume snapshots accumulate quietly. Set retention policies, or use the
  provider's backup service, which manages them for you.
- **Wrong redundancy.** Locally redundant storage for the only copy of critical data is a risk; geo-redundant
  storage for scratch data is waste. Decide per dataset.
- **Ignoring immutability.** Ransomware targets backups. Object Lock, immutable blob policies and bucket lock
  make backup copies tamper-proof. Turn them on for backup buckets.

## Conclusion

Pick storage by access pattern first (object, block, file or archive), then by redundancy and tier. Use object
storage by default, block storage only for VM disks and self-managed databases, file shares for apps that truly need
them, and lifecycle rules to push old data down to archive automatically. A good next step: pull last month's
storage bill, sort by cost, and check whether your three biggest line items are on the right type and tier. For a
side-by-side list, see the [Storage comparison](/cloud/#storage).

## References

- [Amazon S3 storage classes](https://aws.amazon.com/s3/storage-classes/)
- [Amazon Glacier: no longer open to new customers](https://docs.aws.amazon.com/amazonglacier/latest/dev/introduction.html)
- [Amazon EBS volume types](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html)
- [Azure Blob Storage access tiers](https://learn.microsoft.com/azure/storage/blobs/access-tiers-overview)
- [Azure managed disk types](https://learn.microsoft.com/azure/virtual-machines/disks-types)
- [Cloud Storage classes](https://cloud.google.com/storage/docs/storage-classes)
- [Filestore overview](https://cloud.google.com/filestore/docs/overview)
