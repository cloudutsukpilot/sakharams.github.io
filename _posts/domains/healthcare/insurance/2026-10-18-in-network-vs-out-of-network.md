---
layout: post
title: "In-Network vs Out-of-Network Providers"
description: "What a provider network is, how payers contract with providers, and why the same visit can cost very different amounts depending on network status."
date: 2026-10-20 00:30:00 +0530
categories: [domains, healthcare, insurance]
tags: [Healthcare, USHealthcare, ProviderNetworks, HealthInsurance]
domain: healthcare
domain_topic: insurance
domain_order: 2
image:
  path: /assets/img/domains/healthcare/insurance/in-network-vs-out-of-network.webp
  alt: "Cover image: In-Network vs Out-of-Network Providers"
---

Two patients get the same MRI at two different imaging centres down the road from each other. One pays a $50 copay; the other gets a bill for a few thousand dollars. Same scan, same plan. The difference is almost always **network status**: whether the provider has a contract with the patient's insurer.

This post explains what a provider network actually is, how it changes the price of care, and why it matters to anyone who handles claims data.

<!-- more -->

## What "in-network" means

An **in-network** provider has signed a contract with a payer. In that contract the provider agrees to:

- accept the payer's negotiated rate for each service (the **allowed amount**) as payment in full;
- bill the payer directly, and only collect the member's cost share from the member;
- follow the payer's rules on referrals, prior authorisation and documentation.

In return, the payer steers its members to that provider through lower copays and deductibles, and pays claims faster.

An **out-of-network** provider has no such contract. They can charge whatever they normally charge, and the payer has no agreed price to apply.

## How a provider joins a network

Joining a network takes two steps.

1. **Credentialing.** The payer checks the provider's licence, training, board certification, malpractice history and identifiers such as the National Provider Identifier (NPI).
2. **Contracting.** The two sides agree on rates and terms. Rates are often expressed as a fee schedule, a percentage of Medicare rates, or per-diem and case rates for hospitals.

Until both steps are complete, claims from that provider are treated as out-of-network. Credentialing gaps are a surprisingly common reason a "network" doctor gets paid like a stranger.

## Billed charges vs allowed amount

Every claim starts with the provider's **billed charge**, their list price. In-network, the payer replaces it with the contracted **allowed amount**. The difference is written off; the provider can't collect it from anyone.

Here's a simple in-network example:

| | Amount |
|---|---|
| Billed charge | $5,000 |
| Contracted allowed amount | $900 |
| Provider write-off | $4,100 |
| Split between plan and patient | $900 |

The $900 is then split between the plan and the patient according to the patient's deductible, coinsurance and copay. The step that turns $5,000 into $900 is called **repricing**, and it has its [own post](/posts/domains/healthcare/revenue-cycle/claim-repricing/).

## What happens out of network

Out of network, there's no contract to reprice against. What happens next depends on the plan type.

- **HMO and EPO plans** generally pay nothing for out-of-network care, apart from emergencies. The patient owes the full bill.
- **PPO and POS plans** pay something, usually based on what the plan considers a reasonable amount for that service in that area. Patients pay higher cost sharing, often a bigger coinsurance percentage and a separate, larger deductible.

Then comes the part that hurts. Because the provider never agreed to the payer's price, they can bill the patient for the gap between their charge and what the plan paid. That's **balance billing**.

## Balance billing and the No Surprises Act

Balance billing used to catch people who had no choice in the matter: an ambulance ride, an emergency room visit, or an out-of-network anaesthetist at an in-network hospital. The **No Surprises Act**, in force since 2022, protects patients in most of those situations:

- emergency services, wherever they're provided;
- non-emergency care from out-of-network providers at in-network facilities, such as anaesthesia, radiology and pathology;
- air ambulance services.

In those cases the patient pays in-network cost sharing, and the payer and provider settle the rest between themselves, through an independent dispute resolution process if needed. Planned out-of-network care, chosen by the patient, still isn't protected. I'll go deeper in the [No Surprises Act post](/posts/domains/healthcare/compliance/no-surprises-act-and-price-transparency/).

## Rental networks and repricers

Not every payer builds its own network. Smaller insurers and self-funded employer plans often **rent** a network: they pay a network company for access to its contracted rates. Claims from those providers go to a **repricer**, which applies the rented rates and sends the repriced claim back to the payer.

That adds a hop to the claim flow and a few extra fields to the claim file. Repricers return the allowed amount and the savings in the HCP segment of the X12 837 claim, which I cover in [837 Part 2](/posts/domains/healthcare/edi-x12/x12-837-part-2-claim-loop/).

## Network adequacy

Regulators require plans to have enough providers, close enough, in each specialty. That's **network adequacy**. It's the reason a plan can't sell an HMO with one cardiologist covering an entire state. Adequacy rules differ between Medicare Advantage, Medicaid managed care and marketplace plans, and payers spend real engineering effort on provider directories to prove they meet them.

## Why engineers should care

Network status touches almost every payer system:

- **Provider data management.** Contract effective dates, locations and identifiers all have to be right. A provider who moved offices without updating their record can suddenly look out-of-network.
- **Claim routing and pricing.** Network status decides which fee schedule applies, or whether the claim goes to a repricer at all.
- **Member cost sharing.** In- and out-of-network deductibles are usually tracked separately.
- **Directories.** Payers have to publish accurate provider directories, and wrong ones generate complaints and regulatory findings.

## Common pitfalls

- **Assuming a hospital's network status covers everyone in it.** Physicians who work at a hospital often bill separately and may not share its contracts.
- **Checking the network once.** Contracts end and providers move. Check network status before each planned service, not once a year.
- **Ignoring the line of business.** A provider can be in-network for an insurer's commercial plans but out-of-network for its Medicare Advantage plans.

## Conclusion

A network is a set of contracts. In-network, those contracts turn billed charges into allowed amounts, and patients pay their normal cost share. Out of network there's no agreed price, so patients pay more and can face balance billing unless the No Surprises Act applies.

The next step is to see how the allowed amount gets split. [Patient cost sharing](/posts/domains/healthcare/insurance/deductible-copay-coinsurance-out-of-pocket/) walks through a full year of bills.

## Further watching

From the [HealthTech Decoded](https://www.youtube.com/@HealthTechDecoded) channel:

- [Healthtech overview: PPO/HMO, in-network and out-of-network providers](https://www.youtube.com/watch?v=S4W1YR0GEQE)
- [How your $5,000 hospital bill becomes $900: claims repricing (short)](https://www.youtube.com/shorts/OUN1izJ2RhQ)

## References

- [CMS: No Surprises Act overview](https://www.cms.gov/nosurprises)

## Where this fits

**Level 1 · Foundations** › [Health insurance and plan types](/domains/healthcare/#insurance)

- Previous: [Health Plan Types: HMO vs PPO vs EPO vs POS vs HDHP](/posts/domains/healthcare/insurance/hmo-ppo-epo-pos-hdhp/)
- Next: [Patient Cost Sharing: Premium, Deductible, Copay, Coinsurance and Out-of-Pocket Max](/posts/domains/healthcare/insurance/deductible-copay-coinsurance-out-of-pocket/)
