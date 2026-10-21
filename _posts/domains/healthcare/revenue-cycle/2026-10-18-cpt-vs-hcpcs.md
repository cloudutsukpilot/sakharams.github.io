---
layout: post
title: "CPT vs HCPCS: Real Examples to Tell Them Apart"
description: "A practical guide with lab, office-visit and durable medical equipment examples, and why Medicare and commercial payers treat the code sets differently."
date: 2026-10-20 00:30:00 +0530
categories: [domains, healthcare, revenue-cycle]
tags: [Healthcare, USHealthcare, CPT, HCPCS, MedicalCoding]
domain: healthcare
domain_topic: revenue-cycle
domain_order: 4
image:
  path: /assets/img/domains/healthcare/revenue-cycle/cpt-vs-hcpcs.webp
  alt: "Cover image: CPT vs HCPCS: Real Examples to Tell Them Apart"
---

Most explanations of CPT and HCPCS read like they were written for coders who already know the answer. The HealthTech Decoded video on this topic uses a better analogy, which I'll borrow: think of a restaurant bill.

The dishes the chef cooks, the pizza, the pasta, the salad, are **CPT codes**: the services a doctor or other clinician performs. Everything else on the bill, the extra cheese, the takeaway box, the scooter that delivered it, is **HCPCS Level II**: supplies, drugs, equipment and transport. Both end up on the same bill.

<!-- more -->

## Two levels of one system

**HCPCS** (Healthcare Common Procedure Coding System, said "hick-picks") is the umbrella. It has two levels:

- **Level I** is **CPT** (Current Procedural Terminology), maintained by the American Medical Association. When people say "CPT code", they mean Level I.
- **Level II** is what people mean when they say "HCPCS code". CMS maintains it to cover items and services CPT doesn't, which Medicare and Medicaid still need to pay for.

So the question isn't really CPT *or* HCPCS. CPT is part of HCPCS, and a typical claim uses both.

## Telling them apart at a glance

| | CPT (Level I) | HCPCS Level II |
|---|---|---|
| Format | 5 digits: `70551` | A letter (A–V) + 4 digits: `A9579` |
| Describes | Medical, surgical and diagnostic services | Supplies, drugs, durable medical equipment, ambulance, some non-physician services |
| Who performs it | Physicians and other licensed clinicians, labs, facilities | Mostly suppliers and providers billing items, plus some services CPT doesn't cover |
| Maintained by | American Medical Association | CMS |

The shortcut that works almost every time: **starts with a letter → Level II; five digits → CPT**. (CPT Category II and III codes end in a letter, `F` or `T`, but they're four digits plus that letter, so they don't start with one.)

## What Level II covers

Level II codes are grouped by their first letter. Some you'll meet often:

- `A` codes: ambulance, medical and surgical supplies, and imaging agents such as `A9579` (gadolinium-based MRI contrast, per ml)
- `E` codes: durable medical equipment, such as `E1390` (an oxygen concentrator)
- `G` codes: temporary codes for professional services CMS needs before CPT has one
- `J` codes: injected and infused drugs, priced per dose unit
- `K` codes: more durable medical equipment, such as `K0001` (a standard wheelchair)
- `L` codes: orthotics and prosthetics
- `Q` codes: temporary codes, including some contrast agents and drugs

**DMEPOS** (durable medical equipment, prosthetics, orthotics and supplies) is the big category here: items patients use at home, like oxygen concentrators, CPAP machines, nebulisers, glucose monitors and wheelchairs.

## One hospital visit, both code sets

Here's a patient journey from the video, with each step labelled:

| Step | Code set |
|---|---|
| Specialist visit; surgery recommended | CPT (evaluation and management) |
| Radiology scans before surgery | CPT |
| Arrives by ambulance in an emergency | HCPCS Level II (`A04xx` ambulance codes) |
| The surgery | CPT |
| Syringes, gloves and drugs used during surgery | HCPCS Level II (or bundled into the facility charge) |
| An implant | HCPCS Level II (often a `C` or `L` code, depending on the setting) |
| Wheelchair and oxygen concentrator for home | HCPCS Level II (DMEPOS) |

The pattern holds: the procedure is CPT; most of what's used or supplied around it is Level II.

## The MRI example

Imaging shows the split clearly. An MRI's procedure code is CPT; the contrast agent injected to sharpen the image is HCPCS Level II.

| Service | CPT | Level II |
|---|---|---|
| Brain MRI without contrast | `70551` | – |
| Brain MRI with contrast | `70552` | Contrast, e.g. `A9579` per ml |
| Brain MRI without, then with contrast | `70553` | Contrast, e.g. `A9579` per ml |
| Pelvis MRI without, then with contrast | `72197` | Contrast, e.g. `A9579` per ml |

On a professional claim, both lines appear as service lines with the same `HC` qualifier, because HIPAA uses `HC` for both CPT and HCPCS codes:

```text
SV1*HC:70553*1450*UN*1***1~
SV1*HC:A9579*60*UN*15***1~
```

The second line bills 15 units of contrast, because `A9579` is priced per millilitre.

## Childbirth: another everyday example

For a delivery, CPT covers the obstetric care itself: routine prenatal visits, ultrasounds, and the delivery, whether vaginal or caesarean. Level II and facility codes pick up the ambulance, supplies, some drugs and some education and support services. Professional services go on the doctor's claim, while the hospital bills the stay, supplies and nursing on its institutional claim with revenue codes.

## Why Medicare and commercial payers differ

Level II was created because Medicare and Medicaid needed codes for things CPT didn't cover. CMS still adds temporary `G` and `Q` codes when it needs to pay for something new, often before a CPT code exists. Commercial payers usually accept Level II codes too, but they decide for themselves which ones to cover and how to price them. A `G` code that Medicare pays without a second thought might be denied by a commercial plan that expects a CPT code for the same service.

## Common mistakes

- **Treating "HCPCS" and "CPT" as competitors.** CPT is HCPCS Level I.
- **Billing contrast or drugs per item instead of per unit.** Level II drug and contrast codes are priced per dose unit; get the units wrong and you're off by a factor of ten.
- **Forgetting the payer's rules.** Medicare `G` codes may not be accepted by a commercial payer.
- **Missing the facility side.** In a hospital, many supplies are bundled into the facility's charge rather than billed separately.

## Conclusion

CPT is the main course: what the clinician does. HCPCS Level II covers what comes with it: supplies, drugs, equipment and transport. A letter at the front means Level II; five digits mean CPT. On a real claim you'll see both, side by side, under the same `HC` qualifier.

To see how codes are linked to diagnoses on a claim, read [Medical Coding Basics](/posts/domains/healthcare/revenue-cycle/medical-coding-icd10-cpt-hcpcs/).

## Further watching

From the [HealthTech Decoded](https://www.youtube.com/@HealthTechDecoded) channel:

- [How to never confuse CPT and HCPCS](https://www.youtube.com/watch?v=KRfZ11ehYK4)
- [CPT vs HCPCS codes easily understood (short)](https://www.youtube.com/shorts/RPYSmerwaE0)

## References

- [CMS: Healthcare Common Procedure Coding System (HCPCS)](https://www.cms.gov/medicare/coding-billing/healthcare-common-procedure-system)
- [AMA: CPT overview](https://www.ama-assn.org/practice-management/cpt)

## Where this fits

**Level 2 · Core workflows** › [Revenue cycle, coding and claims](/domains/healthcare/#revenue-cycle)

- Previous: [Medical Coding Basics: ICD-10-CM, CPT and HCPCS](/posts/domains/healthcare/revenue-cycle/medical-coding-icd10-cpt-hcpcs/)
- Next: [The Claim Lifecycle: From Submission to Adjudication](/posts/domains/healthcare/revenue-cycle/claim-lifecycle/)
