---
layout: post
title: "Medicare vs Medicaid, and Dual-Eligible Members"
description: "A side-by-side comparison of the two programs, and how coverage and claims work for people who qualify for both."
date: 2026-10-20 00:30:00 +0530
categories: [domains, healthcare, government-programs]
tags: [Healthcare, USHealthcare, Medicare, Medicaid]
domain: healthcare
domain_topic: government-programs
domain_order: 3
image:
  path: /assets/img/domains/healthcare/government-programs/medicare-vs-medicaid-dual-eligibles.webp
  alt: "Cover image: Medicare vs Medicaid, and Dual-Eligible Members"
---

"Medicare or Medicaid?" sounds like a trivia question until a patient walks in with both cards. Then you need to know which one pays first, what the second one picks up, and how the claim moves between them. Around 12 million people qualify for both, and they're among the most complex and expensive members in the system.

This post puts the two programs side by side, then explains dual eligibility.

<!-- more -->

## Side by side

| | Medicare | Medicaid |
|---|---|---|
| Funded by | The federal government | The federal government and the states, jointly |
| Run by | CMS (Original Medicare) or private plans (Medicare Advantage) | Each state, often through private managed care plans |
| Based on | Age (65+), disability or ESRD | Need: income, and for some groups, assets |
| Income test | No | Yes, mostly MAGI |
| Premiums | Part A usually free; Part B and D premiums | None or very low |
| Cost sharing | Deductibles and coinsurance (Part B is 20%) | Minimal, with some services exempt |
| Core benefits | Hospital (A), medical (B), drugs (D) | Mandatory hospital, physician, lab, home health, nursing facility and children's benefits, plus state options |
| Long-term care | Short skilled-nursing stays only | Yes, the largest payer of long-term care |
| Dental and vision | Not in Original Medicare | Optional; many states cover them |
| Enrollment | Fixed windows (initial, general, open enrollment) | Any time of year |
| Same everywhere? | Mostly yes | No, it varies by state |

The pattern is easy to remember: Medicare is about **age**, Medicaid is about **need**. Medicare is uniform; Medicaid is 50-plus variations on a theme.

## Eligibility in a nutshell

**Medicare:** you're 65 or older and you or your spouse paid Medicare taxes for at least 10 years, for premium-free Part A. Younger people qualify after 24 months of Social Security disability benefits, or with end-stage renal disease or ALS. If you're 65 but paid Medicare taxes for less than 10 years, you can still enroll, but you pay a premium for Part A. Details are in [Medicare Explained](/posts/domains/healthcare/government-programs/medicare-explained/).

**Medicaid:** your income (usually MAGI) is under the state's limit, you live in the state, and you meet citizenship or immigration rules. Details are in [Medicaid and CHIP Explained](/posts/domains/healthcare/government-programs/medicaid-and-chip-explained/).

## Dual eligibility

A **dual-eligible** member qualifies for both: typically an older person or someone with a disability who also has a low income. Some duals get full Medicaid benefits; others are "partial duals", for whom Medicaid only pays Medicare premiums and, sometimes, cost sharing, through Medicare Savings Programs.

For full duals, the two programs split the work:

- **Medicare pays first** for services it covers: hospital, physician, drugs.
- **Medicaid pays second**, covering Medicare's deductibles and coinsurance, and services Medicare doesn't cover, especially long-term care.

Medicaid is the **payer of last resort**: it only pays after every other source, including Medicare and any private coverage.

## How the claim moves: crossovers

In Original Medicare, a dual-eligible claim doesn't have to be sent twice. After Medicare's contractor processes it, the claim is forwarded automatically to the state Medicaid program or its MCO. That's a **crossover claim**, and it carries Medicare's adjudication results so Medicaid can work out what's left.

In the X12 837 claim format, the secondary payer sees the primary's results in the "other subscriber" loops (2320 and 2330) and at line level in SVD and CAS segments. I cover those in [837 Part 2](/posts/domains/healthcare/edi-x12/x12-837-part-2-claim-loop/) and [837 Part 3](/posts/domains/healthcare/edi-x12/x12-837-part-3-service-lines/).

## D-SNPs: one plan for both

Coordinating two programs is messy for members too: two cards, two sets of rules, two member service lines. **Dual Eligible Special Needs Plans (D-SNPs)** are Medicare Advantage plans designed for duals. They coordinate with, or fully integrate, the member's Medicaid benefits, so the member deals with one plan instead of two. CMS has been pushing toward more integrated plans, where the same organisation runs both the Medicare and the Medicaid side.

## Where systems get it wrong

Duals expose every weakness in eligibility and claims systems:

- **Wrong payer order.** Billing Medicaid first gets the claim denied. Medicare is primary for covered services.
- **Partial vs full duals.** A partial dual's Medicaid coverage doesn't include full benefits, so systems that just check "has Medicaid: yes" make wrong decisions.
- **Changing status.** Medicaid eligibility can lapse when income or paperwork changes while Medicare stays in place.
- **Balance billing.** Providers usually can't bill duals for Medicare cost sharing, even when Medicaid pays less than the full amount.
- **Two ID numbers.** The member has a Medicare Beneficiary Identifier (MBI) and a separate Medicaid ID. Matching them is a data quality problem in its own right.

## Conclusion

Medicare is federal and based on age or disability; Medicaid is state-run and based on need. When someone qualifies for both, Medicare pays first and Medicaid covers what's left, usually through automatic crossover claims or an integrated D-SNP.

To see how coverage rules are changing, read the [2027 Medicaid changes](/posts/domains/healthcare/government-programs/medicaid-changes-2027-obbba/).

## Further watching

From the [HealthTech Decoded](https://www.youtube.com/@HealthTechDecoded) channel:

- [Medicare and Medicaid overview and their differences](https://www.youtube.com/watch?v=7THF-Zy3Yh8)

## References

- [CMS: About the Medicare-Medicaid Coordination Office](https://www.cms.gov/medicare/medicaid-coordination/about)
- [Medicare.gov: Help paying costs (Medicare Savings Programs)](https://www.medicare.gov/basics/costs/help/medicare-savings-programs)

## Where this fits

**Level 1 · Foundations** › [Government programs](/domains/healthcare/#government-programs)

- Previous: [Medicaid and CHIP Explained](/posts/domains/healthcare/government-programs/medicaid-and-chip-explained/)
- Next: [The 2027 Medicaid Changes Under the One Big Beautiful Bill Act](/posts/domains/healthcare/government-programs/medicaid-changes-2027-obbba/)
