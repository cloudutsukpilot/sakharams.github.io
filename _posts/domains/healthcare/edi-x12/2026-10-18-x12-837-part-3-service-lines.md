---
layout: post
title: "X12 837 Part 3: Service Lines (Loop 2400)"
description: "Chapter 3: LX and SV1/SV2/SV3 service lines, modifiers and diagnosis pointers, line dates, line-level providers, pricing and adjudication (SVD/CAS)."
date: 2026-10-20 00:30:00 +0530
categories: [domains, healthcare, edi-x12]
tags: [Healthcare, USHealthcare, X12, Claims]
domain: healthcare
domain_topic: edi-x12
domain_order: 8
image:
  path: /assets/img/domains/healthcare/edi-x12/x12-837-part-3-service-lines.webp
  alt: "Cover image: X12 837 Part 3: Service Lines (Loop 2400)"
---

You go to the emergency room after a fall. A doctor examines you, someone takes an X-ray, and you leave with a cast. On the claim, those are three separate **service lines**, each with its own procedure code, charge, units and diagnosis pointer. Payers adjudicate at the line level, so this is where most of the money is decided.

This is the final part of the 837 series. It covers loop 2400 for professional, institutional and dental claims, then closes the file with the trailers. [Part 1](/posts/domains/healthcare/edi-x12/x12-837-part-1-header-loops/) and [Part 2](/posts/domains/healthcare/edi-x12/x12-837-part-2-claim-loop/) cover everything above it.

<!-- more -->

## LX: the line number

Each service line starts with `LX`, followed by its number: `LX*1~`, `LX*2~`. `LX` plus one SV segment are mandatory for every line.

## SV1: professional lines (837P)

```text
LX*1~
SV1*HC:99283*250*UN*1*23**1:2~
LX*2~
SV1*HC:73110:26*45*UN*1*23**1~
```

| Element | Meaning |
|---|---|
| `SV101-1` | Code qualifier: `HC` covers both CPT and HCPCS under HIPAA |
| `SV101-2` | Procedure code |
| `SV101-3`… | Up to four modifiers |
| `SV102` | Line charge |
| `SV103` | Unit basis: `UN` units or `MJ` minutes |
| `SV104` | Quantity |
| `SV105` | Place of service, if different from the claim's |
| `SV107` | Diagnosis pointers |

**Modifiers** refine a procedure. In line 2, `26` means the provider is billing only the **professional component** of the X-ray: reading and interpreting it. The facility that took the image would bill the **technical component** with `TC`. ([Medical coding basics](/posts/domains/healthcare/revenue-cycle/medical-coding-icd10-cpt-hcpcs/) has more on modifiers.)

**Diagnosis pointers** in `SV107` refer, by position, to the diagnoses listed in the claim's HI segment. The first pointer is the primary diagnosis for this line, and the rest follow in order of importance. In the example, the ER visit points to diagnoses 1 and 2, and the X-ray only to 1. A wrong pointer can get a line denied as not medically necessary, even when the right diagnosis is on the claim.

## SV2: institutional lines (837I)

```text
LX*1~
SV2*0450*HC:99284*1200*UN*1~
LX*2~
SV2*0320*HC:73110*2600.39*UN*1**600~
```

| Element | Meaning |
|---|---|
| `SV201` | **Revenue code**: the department or type of charge (`0450` emergency room, `0320` diagnostic X-ray, `0120` semi-private room) |
| `SV202` | Procedure code composite (same structure as `SV101`) |
| `SV203` | Line charge |
| `SV204` | Unit basis: `UN` units or `DA` days |
| `SV205` | Quantity |
| `SV207` | Non-covered charges on this line |

Revenue codes are what make institutional claims different: they place each charge in a hospital department, and they're often paired with CPT or HCPCS codes for a complete picture. In line 2, $600 of the $2,600.39 charge is marked non-covered (`SV207`), which the patient may have to pay.

## SV3: dental lines (837D)

```text
LX*1~
SV3*AD:D2740*1100*11***1*****1~
TOO*JP*3*M:O:D~
```

| Element | Meaning |
|---|---|
| `SV301` | `AD` (American Dental Association) plus the CDT procedure code |
| `SV302` | Line charge |
| `SV303` | Place of service |
| `SV304` | Oral cavity area, when the procedure isn't for a specific tooth: `00` entire mouth, `01` upper arch, `02` lower arch, `10`/`20`/`30`/`40` for the four quadrants |
| `SV305` | Prosthesis status: `I` initial placement, `R` replacement |
| `SV306` | Number of procedures |
| `SV311` | Diagnosis pointers |

**TOO** gives the tooth: `TOO01 = JP` (Universal National Tooth Designation System), `TOO02` the tooth number, and `TOO03` the surfaces worked on. Here, a crown (`D2740`) on tooth 3, covering the mesial, occlusal and distal surfaces.

## PWK at line level

Line-level `PWK` flags documentation that supports a specific line, such as a certificate of medical necessity for oxygen therapy or durable medical equipment. When a certificate is attached, the line usually also needs the therapy begin date (`DTP*463`).

## Line dates

| Qualifier | Date | Used on |
|---|---|---|
| `472` | Service date | P, I, D |
| `454` | Initial treatment | P |
| `304` | Last seen | P |
| `463` | Begin therapy | P |
| `471` | Prescription | P |
| `452` | Appliance placement | D |
| `196` / `198` | Treatment start / completion | D |

For dental lines using treatment start and completion dates, don't also send a service date on that line.

## Line references and notes

- `REF*6R`: line item control number, the provider's ID for this line, unique within the claim. Payers echo it on the 835, which makes posting easier.
- `REF*G1`: a line-specific prior authorisation number.
- `REF*9B` / `REF*9D`: repriced and adjusted repriced line numbers, from a repricer.
- `NTE`: a free-text note for this line.

## HCP: line repricing

As at claim level, repricers return line-level results in `HCP`: `HCP01` method, `HCP02` allowed amount, `HCP03` savings, `HCP13` reject reason. See [Claim Repricing](/posts/domains/healthcare/revenue-cycle/claim-repricing/).

## Line-level providers

Any line can name its own providers, using the same `NM1` codes as loop 2310: `DN` referring, `72` operating, `82` rendering, `77` service facility. That's useful when lines were performed by different people, for example a dental claim where line 2 was done by a different dentist from lines 1 and 3.

## SVD and CAS: what a previous payer did

When another payer has already processed the claim (coordination of benefits), each line can carry that payer's results:

```text
SVD*OTHER01*120*HC:99283**1~
CAS*CO*45*130~
DTP*573*D8*20251012~
```

| Element | Meaning |
|---|---|
| `SVD01` | Other payer's ID, matching loop 2330B |
| `SVD02` | Amount that payer paid for this line |
| `SVD03` | Procedure code the payer adjudicated, which can differ from the one billed |
| `SVD04` | Revenue code (837I only) |
| `SVD05` | Units paid |

If there's an SVD, there's usually a **CAS** explaining the adjustment. Here, `CO*45` means $130 was a contractual reduction (charge above the fee schedule). `DTP*573` is the date that payer adjudicated the line. The dental SVD uses `AD` instead of `HC`.

## The trailers

Every envelope that was opened gets closed, with counts the receiver checks:

```text
SE*48*0001~
GE*1*1~
IEA*1*000000001~
```

- **SE**: `SE01` = number of segments from `ST` to `SE`, inclusive; `SE02` = the `ST02` control number.
- **GE**: `GE01` = number of transaction sets in the group; `GE02` = the `GS06` group control number.
- **IEA**: `IEA01` = number of functional groups; `IEA02` = the `ISA13` interchange control number.

A count that's off by one rejects the whole set, which is why generators should compute them, never hard-code them.

## Common pitfalls

- **Line charges that don't add up.** The sum of line charges must equal `CLM02`.
- **Pointers to diagnoses that aren't there.** `SV107 = 3` when the claim has two diagnoses is a hard reject.
- **Units vs dosage.** Drug and supply codes are priced per unit, so 15 ml of contrast is `SV104 = 15`.
- **Missing `REF*6R`.** It's optional, but without it matching 835 payments to lines is harder.
- **An SVD with no matching 2330B payer.** `SVD01` has to point at a payer named in the claim.

## Conclusion

Loop 2400 holds the lines: `LX` numbers them, and `SV1`, `SV2` or `SV3` carry the procedure, charge, units and diagnosis pointers for professional, institutional and dental claims. Around them sit line dates, references, repricing, line-level providers and, for secondary claims, the previous payer's `SVD` and `CAS`. The trailers close the file with counts.

With all three parts, you can read any 837 file end to end. The payer's answer comes back on the 835.

## Further watching

From the [HealthTech Decoded](https://www.youtube.com/@HealthTechDecoded) channel:

- [Chapter 3: How to master X12 837 (loop 2400)](https://www.youtube.com/watch?v=mVOk1RlALoI)
- [Chapter 3: X12 837 service lines (short)](https://www.youtube.com/shorts/gb_8Je1V88Y)

## References

- [Stedi: X12 837P reference](https://www.stedi.com/edi/x12-005010/837)
- [X12: Claim Adjustment Reason Codes](https://x12.org/codes/claim-adjustment-reason-codes)

## Where this fits

**Level 3 · Health data exchange** › [Healthcare EDI (ANSI X12)](/domains/healthcare/#edi-x12)

- Previous: [X12 837 Part 2: The Claim Information Loop (2300)](/posts/domains/healthcare/edi-x12/x12-837-part-2-claim-loop/)
- Next: [X12 835: Claim Payment and Remittance Advice](/posts/domains/healthcare/edi-x12/x12-835-remittance/)
