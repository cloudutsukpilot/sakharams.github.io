---
layout: post
title: "Health Plan Types: HMO vs PPO vs EPO vs POS vs HDHP"
description: "How each plan type trades off cost, choice of provider and referral rules, with examples of which one fits which patient."
date: 2026-10-20 00:30:00 +0530
categories: [domains, healthcare, insurance]
tags: [Healthcare, USHealthcare, HMO, PPO, HealthInsurance]
domain: healthcare
domain_topic: insurance
domain_order: 1
image:
  path: /assets/img/domains/healthcare/insurance/hmo-ppo-epo-pos-hdhp.webp
  alt: "Cover image: Health Plan Types: HMO vs PPO vs EPO vs POS vs HDHP"
---

"Is it an HMO or a PPO?" is usually the first question a front-desk person asks after your name, and it decides a lot: which doctors you can see, whether you need a referral, and how big your bill will be. For anyone building healthcare software it matters just as much, because plan type drives eligibility responses, referral checks and how claims get priced.

This post compares the five plan types you'll meet: HMO, PPO, EPO, POS and the high-deductible health plan (HDHP).

<!-- more -->

## Why plan types exist at all

Every plan type answers the same question: how much freedom does the member get in choosing providers, and what do they pay for it?

Payers sign contracts with a set of providers, their **network**, who agree to negotiated rates. The payer wants members to use those providers because care costs less. A plan type is the set of rules the payer uses to steer members toward the network. Tight rules buy lower premiums; loose rules cost more.

## HMO: health maintenance organization

An HMO gives the lowest premiums in exchange for the most rules.

- **In-network only.** Out-of-network care isn't covered, except for emergencies.
- **A primary care physician (PCP) as gatekeeper.** Each member picks a PCP, who handles routine care.
- **Referrals required.** To see a specialist, the member needs a referral from their PCP. Without one, the specialist visit usually isn't covered.
- **Low cost sharing.** Monthly premiums are lower, and copays and deductibles tend to be lower too.

HMOs suit people who are happy with a local network and don't mind going through their PCP. They frustrate people who travel a lot or already have specialists they want to keep seeing.

## PPO: preferred provider organization

A PPO is the HMO's opposite.

- **Out-of-network care is covered**, at a higher cost to the member. That's useful when you're travelling or your preferred doctor isn't in the network.
- **No referrals.** Members can book a specialist directly.
- **Higher cost.** Premiums are higher, and copays, deductibles and coinsurance are higher too, especially out of network.

A PPO member who goes out of network also risks **balance billing**: the provider hasn't agreed to the payer's rates, so they may bill the patient for the difference between their charge and what the plan allows. Federal law now blocks that for most emergencies and some surprise situations, but it still applies to planned out-of-network care.

## EPO and POS: the hybrids

Two hybrids sit between the extremes.

An **EPO (exclusive provider organization)** keeps the HMO's network rule (no out-of-network coverage except emergencies) but drops the referral requirement. You stay in network, but you can go straight to a specialist. Premiums usually land between HMO and PPO.

A **POS (point of service)** plan works the other way round. It has an HMO-style PCP and referrals, but it pays something for out-of-network care, at a higher cost. The member chooses at the "point of service" whether to stay in network.

## HDHP: the high-deductible plan

An HDHP isn't really a network model; it's a cost-sharing design that can sit on top of a PPO or an HMO network. The deductible is high and the premium is low. If the plan meets the IRS rules for minimum deductible and maximum out-of-pocket limits (they change every year), the member can open a **health savings account (HSA)** and put pre-tax money aside for medical costs.

HDHPs work well for healthy people who rarely need care, and for people who want the tax advantage. They hurt when an unexpected bill arrives early in the year, before the deductible is met.

## Side by side

| | HMO | EPO | POS | PPO | HDHP |
|---|---|---|---|---|---|
| Out-of-network covered | Emergencies only | Emergencies only | Yes, higher cost | Yes, higher cost | Depends on the network |
| PCP referral needed | Yes | No | Yes | No | Depends on the network |
| Premium | Lowest | Low to medium | Medium | Highest | Low |
| Deductible | Low | Low to medium | Medium | Medium to high | High |
| Flexibility | Low | Medium | Medium | High | Depends on the network |

If you remember one line from the table, make it this one: **you buy flexibility with premiums**.

## Which plan fits which patient

A few common situations:

- A young, healthy person who rarely sees a doctor: an HDHP with an HSA, or an HMO if they want predictable copays.
- A family with a trusted paediatrician and a couple of specialists: a PPO, or an EPO if all those doctors are in the network.
- Someone who travels for work or splits the year between two states: a PPO, because out-of-network cover matters.
- Someone with a chronic condition who wants care coordinated by one doctor: an HMO or POS, where the PCP keeps the full picture.

## How plan type shows up in systems

This is where the topic stops being consumer advice and becomes an engineering concern.

- **Eligibility responses.** When a provider checks coverage with an [X12 270/271 transaction](/posts/domains/healthcare/edi-x12/x12-270-271-eligibility/), the response carries the plan's coverage type and whether services need a referral or authorisation.
- **Referral and authorisation checks.** HMO and POS plans need the referral on file before the specialist visit. Missing referrals are a classic cause of denied claims.
- **Claim pricing.** In-network and out-of-network claims are priced against different rate sheets, which is why the same procedure can produce very different [repriced amounts](/posts/domains/healthcare/revenue-cycle/claim-repricing/).
- **Cost-sharing accumulators.** HDHPs need accurate deductible tracking. If the accumulator is wrong, the patient gets billed the wrong amount, and that's a support call you don't want.

## Common misunderstandings

- **"HMO means cheaper."** Premiums are cheaper. Going out of network on an HMO can make your bill far larger, because the plan may pay nothing.
- **"PPO means no limits."** PPOs still have a network. Out-of-network care costs more and can lead to balance billing.
- **"An HDHP is a plan type like HMO."** It's a cost design. Ask which network it uses.
- **"Emergencies follow the plan rules."** Emergency care is covered at in-network cost sharing regardless of plan type.

## Conclusion

Plan types are the payer's levers for steering members to its network: referrals, network limits and cost sharing. HMO and PPO are the two ends of that scale, EPO and POS sit in between, and an HDHP is a cost-sharing design layered on top.

Once you know the plan type, the next question is how much the member actually pays. That's [deductibles, copays and coinsurance](/posts/domains/healthcare/insurance/deductible-copay-coinsurance-out-of-pocket/).

## Further watching

From the [HealthTech Decoded](https://www.youtube.com/@HealthTechDecoded) channel:

- [Healthtech overview: PPO/HMO, in-network and out-of-network providers](https://www.youtube.com/watch?v=S4W1YR0GEQE)

## Where this fits

**Level 1 · Foundations** › [Health insurance and plan types](/domains/healthcare/#insurance)

- Previous: [Healthcare Identifiers: NPI, TIN, Taxonomy, Payer ID and Member ID](/posts/domains/healthcare/ecosystem/healthcare-identifiers-npi-tin-member-id/)
- Next: [In-Network vs Out-of-Network Providers](/posts/domains/healthcare/insurance/in-network-vs-out-of-network/)
