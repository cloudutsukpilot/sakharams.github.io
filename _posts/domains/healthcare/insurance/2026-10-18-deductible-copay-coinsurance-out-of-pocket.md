---
layout: post
title: "Patient Cost Sharing: Premium, Deductible, Copay, Coinsurance and Out-of-Pocket Max"
description: "Why insured patients still get bills: a worked example of how a claim's allowed amount is split between the plan and the patient."
date: 2026-10-20 00:30:00 +0530
categories: [domains, healthcare, insurance]
tags: [Healthcare, USHealthcare, CostSharing, HealthInsurance]
domain: healthcare
domain_topic: insurance
domain_order: 3
image:
  path: /assets/img/domains/healthcare/insurance/deductible-copay-coinsurance-out-of-pocket.webp
  alt: "Cover image: Patient Cost Sharing: Premium, Deductible, Copay, Coinsurance and Out-of-Pocket Max"
---

You have good insurance, you paid your premium every month, and you still get a bill for $3,400 after an MRI. Most people's reaction is that something went wrong. Usually nothing did: that's cost sharing working as designed. Sometimes, though, the bill really is wrong. The creator of HealthTech Decoded describes being billed incorrectly twice and getting the charges removed only because they knew how the calculation works.

This post explains those rules, then walks through a full year of bills so you can check your own.

<!-- more -->

## Two kinds of payment: premiums and out-of-pocket

Healthcare payments fall into two buckets.

**Premiums** are paid every month to the insurer, by the employer, the individual or both. You pay them whether or not you use any care. They buy you coverage; they don't count toward anything else on this page.

**Out-of-pocket costs** are what the patient pays the provider when they actually get care, either at the visit or later when the bill arrives. They come in three forms: deductibles, coinsurance and copays.

## Deductible

The **deductible** is a fixed yearly amount the patient pays for covered, in-network services before the plan starts sharing costs. If your deductible is $3,000, you pay the first $3,000 of covered care yourself. It can be spread across many bills; it doesn't have to be one big payment.

Preventive care, such as annual check-ups and many screenings, is usually covered before the deductible.

## Coinsurance

**Coinsurance** is a percentage of the cost of a covered service. It only kicks in **after the deductible is met**, never before. With 40% coinsurance, you pay 40% of each bill and the plan pays 60%.

## Copay

A **copay** is a fixed amount per visit or service, for example $50 for a doctor's office visit. Unlike coinsurance, a copay applies regardless of the deductible: you pay it whether or not the deductible is met.

Plans differ on details. Some apply copays to office visits and coinsurance to procedures; some make certain services subject to both. Your plan's summary of benefits is the source of truth.

## Out-of-pocket maximum

The **out-of-pocket maximum** is the most you'll pay in a plan year for covered, in-network services. Deductibles, coinsurance and copays all count toward it. Once you hit it, the plan pays 100% of covered in-network services for the rest of the year. Premiums never count toward it.

## A worked example

Here's a patient with these plan settings for the year:

| Setting | Value |
|---|---|
| Out-of-pocket maximum | $5,000 |
| Deductible | $3,000 |
| Coinsurance | 40% patient, 60% plan |
| Copay per office visit | $50 |

Now a year of care, in order:

| # | Service | Cost | Patient pays | Why | Running out-of-pocket total |
|---|---|---|---|---|---|
| 1 | Doctor visit; MRI ordered | – | $50 | Copay | $50 |
| 2 | MRI | $4,000 | $3,400 | $3,000 deductible + 40% of the remaining $1,000 | $3,450 |
| 3 | Physical therapy visit | $500 | $200 | 40% coinsurance; deductible already met | $3,650 |
| 4 | Physical therapy visit | $500 | $200 | 40% coinsurance | $3,850 |
| 5 | Specialist (ENT) visit | – | $50 | Copay | $3,900 |
| 6 | Adenoid surgery | $6,000 | $1,100 | 40% would be $2,400, but only $1,100 is left under the maximum | $5,000 |
| 7+ | Any covered in-network care | – | $0 | Out-of-pocket maximum reached | $5,000 |

Service 6 is where people get caught. The coinsurance calculation says $2,400, but the patient only had $1,100 of room left under the maximum. A correct bill caps at $1,100. If you're charged $2,400, the payer's accumulator is wrong or the provider billed before the claim was adjudicated, and you should call.

Everything here is based on the **allowed amount**, not the provider's list price. The $4,000 MRI is the in-network allowed amount after repricing, which is explained in [Claim Repricing](/posts/domains/healthcare/revenue-cycle/claim-repricing/).

## How plan type changes the picture

Cost sharing depends on plan type and network.

- **HMO** plans usually have low copays and deductibles, and nothing counts for out-of-network care because it isn't covered.
- **PPO** plans often have one set of numbers for in-network and a separate, higher deductible and coinsurance for out-of-network, sometimes with its own out-of-pocket maximum.
- **HDHPs** have a high deductible and often no copays until it's met.

See [Health Plan Types](/posts/domains/healthcare/insurance/hmo-ppo-epo-pos-hdhp/) for the full comparison.

## Individual and family accumulators

Family plans track two totals at once: one for each person and one for the whole family. Once the family total is met, everyone is treated as having met it, even if one member hasn't spent a cent. An **embedded** deductible means each person also has their own, smaller limit inside the family one. Getting this logic wrong is one of the classic payer bugs.

## Reading your Explanation of Benefits

After each claim, the payer sends an **Explanation of Benefits (EOB)**. It isn't a bill, but it's the best tool you have for checking one. Look for:

- **billed amount** vs **allowed amount**, where the difference is the network discount;
- **plan paid**;
- **patient responsibility**, split into deductible, coinsurance and copay;
- the year-to-date totals toward your deductible and out-of-pocket maximum.

The provider's bill should match the patient responsibility on the EOB. If it doesn't, ask the provider why before paying.

## Common mistakes

- Paying a provider bill **before** the EOB arrives. You don't yet know what the plan allowed.
- Assuming coinsurance applies before the deductible. It doesn't.
- Forgetting that out-of-network costs may not count toward the in-network maximum.
- Not checking whether a bill already counted toward the out-of-pocket maximum.

## Conclusion

Premiums buy coverage. Deductibles, coinsurance and copays are what you pay when you use it, and the out-of-pocket maximum caps the total. Once you can work through a year like the one above, you can spot a wrong bill in about a minute.

On the payer side, all of this is computed during [claim adjudication](/posts/domains/healthcare/revenue-cycle/claim-lifecycle/), from data that arrives in the X12 837 claim.

## Further watching

From the [HealthTech Decoded](https://www.youtube.com/@HealthTechDecoded) channel:

- [Healthcare bills truth that no one tells you](https://www.youtube.com/watch?v=Qh4KGBifoK0)

## Where this fits

**Level 1 · Foundations** › [Health insurance and plan types](/domains/healthcare/#insurance)

- Previous: [In-Network vs Out-of-Network Providers](/posts/domains/healthcare/insurance/in-network-vs-out-of-network/)
- Next: [Employer Coverage, ERISA and the ACA Marketplace](/posts/domains/healthcare/insurance/employer-coverage-and-aca-marketplace/)
