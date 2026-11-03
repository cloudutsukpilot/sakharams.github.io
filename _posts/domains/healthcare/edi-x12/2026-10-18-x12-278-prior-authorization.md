---
layout: post
title: "X12 278: Prior Authorization Request and Response"
description: "How the 278 carries a prior authorization request to the payer and the decision back, with the key loops, segments and real examples."
date: 2026-10-20 00:30:00 +0530
categories: [domains, healthcare, edi-x12]
tags: [Healthcare, USHealthcare, X12, PriorAuthorization]
domain: healthcare
domain_topic: edi-x12
domain_order: 5
image:
  path: /assets/img/domains/healthcare/edi-x12/x12-278-prior-authorization.webp
  alt: "Cover image: X12 278: Prior Authorization Request and Response"
---

The 278 is the transaction behind "we're waiting on authorisation". It carries a provider's request for approval to the payer's utilization management organisation (UMO), and carries the decision back. Request and response use the **same transaction set**, with most of the same segments, so reading one teaches you most of the other.

This post walks through the 278's structure, the segments that differ between request and response, and a simplified example of each.

<!-- more -->

> This post covers the X12 side. For the business process behind it, start with [Prior Authorization: The Step-by-Step Workflow](/posts/domains/healthcare/utilization-management/prior-authorization-workflow/).
{: .prompt-tip }

## Request or response? Check BHT02

The 278 uses implementation guide `005010X217`. Right after `ST`, the **BHT** (beginning of hierarchical transaction) segment says which way the file is going:

| `BHT02` | Meaning |
|---|---|
| `13` | Request |
| `11` | Response |

`BHT01` is `0007` for the 278's hierarchy. A tracking reference in `BHT03` ties the response back to the request.

## The hierarchy

The 278 has more hierarchical levels than most transactions, and each one has its own `HL03` code:

| Loop | Level | `HL03` | Holds |
|---|---|---|---|
| 2000A | UMO (information source) | `20` | The payer or UMO that decides: `NM1*X3` |
| 2000B | Requester (information receiver) | `21` | The provider asking: `NM1*1P` or `NM1*FA` |
| 2000C | Subscriber | `22` | The member: `NM1*IL` |
| 2000D | Dependent | `23` | The patient, only if they aren't the subscriber: `NM1*QC` |
| 2000E | Patient event | `EV` | The admission or service episode being reviewed |
| 2000F | Service | `SS` | Line-level services within the event |

If the subscriber is the patient, loop 2000D is simply left out, and the patient event hangs off the subscriber. When a dependent is the patient, their relationship to the subscriber is carried in the dependent loop (`INS02`: `01` spouse, `19` child, and so on).

## The segments that matter

**TRN (trace number)** sits in the patient event loop. The requester assigns one when sending, and the payer echoes it in the response. It's how you track a request end to end.

**UM (health care services review information)** describes what's being reviewed, at the event level and again at each service:

- `UM01`: the request category: `AR` admission review, `HS` health services review, `SC` specialty care review;
- `UM02`: the certification type: `I` for initial, plus codes for extensions, revisions and appeals;
- `UM03`: the service type code;
- `UM04`: the facility or place of service code.

**HI** carries the diagnoses, **DTP** the proposed dates, and **SV1/SV2/SV3** in the service loop carry the procedure codes and units, just like on a claim.

### What's different in the response

Two segments carry the payer's answer.

**HCR (health care services review)** is the decision:

| `HCR01` | Meaning |
|---|---|
| `A1` | Certified in total |
| `A2` | Certified, partially |
| `A3` | Not certified |
| `A4` | Pended |
| `A6` | Modified |
| `C` | Cancelled |
| `CT` | Contact the payer |
| `NA` | No action required |

`HCR02` holds the **authorisation (certification) number** that goes on the later claim, and `HCR03` a reason code when the request isn't fully approved.

**AAA (request validation)** appears when the request itself couldn't be processed: an unknown member, a missing field, a provider the payer can't identify. `AAA01` is `N` (not valid), `AAA03` gives the reject reason (for example `72` for an invalid member ID, or `15` for missing required information), and `AAA04` suggests a follow-up action.

**Line beats event.** HCR and AAA can appear at the patient event level *and* at the service level. When both are present, the service-level answer wins for that line, because it's more specific. A payer might approve an event overall but deny one of its services.

## A simplified request

Here's a request for a lumbar spine MRI for a patient who is also the subscriber. The envelopes are omitted and values are illustrative:

```text
ST*278*0001*005010X217~
BHT*0007*13*REQ20251020001*20251020*0930~
HL*1**20*1~
NM1*X3*2*ACME HEALTH PLAN*****PI*12345~
HL*2*1*21*1~
NM1*1P*1*SMITH*JANE****XX*1234567893~
HL*3*2*22*1~
NM1*IL*1*DOE*JOHN****MI*W123456789~
DMG*D8*19800101*M~
HL*4*3*EV*1~
TRN*1*TRK0001*9012345678~
UM*HS*I*62*11:B~
DTP*AAH*D8*20251105~
HI*ABK:M5416~
HL*5*4*SS*0~
SV1*HC:72148**UN*1~
SE*17*0001~
```

The hierarchy goes UMO (1) → requester (2) → subscriber (3) → patient event (4) → service (5). There's no `HL*..*23`, because the patient is the subscriber. The event asks for a health services review (`HS`) of an MRI (service type `62`) in an office setting, for an event date of 5 November (`DTP*AAH`), for a diagnosis of lumbar radiculopathy. The service line asks for one unit of CPT `72148`.

## The matching response

The payer approves:

```text
BHT*0007*11*REQ20251020001*20251020*1015~
...
HL*4*3*EV*1~
TRN*2*TRK0001*9012345678~
HCR*A1*AUTH998877~
UM*HS*I*62*11:B~
DTP*AAH*D8*20251105~
HL*5*4*SS*0~
HCR*A1*AUTH998877~
SV1*HC:72148**UN*1~
```

`BHT02` is now `11`. `TRN01` changes to `2` (a referenced trace number) but keeps the requester's number, and both levels return `HCR*A1` with authorisation number `AUTH998877`. That number goes on the claim in `REF*G1`.

## A rejected request

If the member ID doesn't match anyone, the payer answers with AAA in the subscriber loop instead of a decision:

```text
HL*3*2*22*1~
NM1*IL*1*DOE*JOHN****MI*W123456780~
AAA*N**72*C~
```

`AAA03 = 72` means an invalid or missing member ID; `AAA04 = C` means "correct and resubmit".

## Notifications and inquiries

The same transaction set also handles:

- **notifications**, such as telling the payer a patient has been admitted;
- **inquiries** about an existing authorisation;
- **acknowledgments** confirming receipt.

They reuse the structure above with different BHT and UM values.

## Common pitfalls

- **Including loop 2000D when the subscriber is the patient.** It's a structural error.
- **Reading only the event-level HCR.** A service-level `A3` can deny one line inside an approved event.
- **Losing the trace number.** Without the TRN, matching asynchronous responses to requests becomes guesswork.
- **Assuming 278 coverage.** Many payers still require portals or fax for prior auth, despite the 278 standard. CMS now requires a FHIR prior authorisation API from many government-program payers by January 2027, which may change that.

## Conclusion

The 278 is one transaction set for both directions: `BHT02` tells you if it's a request (`13`) or response (`11`). Loops go from UMO to requester to subscriber, optional dependent, patient event (`EV`) and service (`SS`). The UM segment describes what's being reviewed; HCR returns the decision and authorisation number; AAA flags requests that couldn't be processed. Service-level answers override event-level ones.

The approved authorisation number goes on the claim, which is covered in [837 Part 2](/posts/domains/healthcare/edi-x12/x12-837-part-2-claim-loop/).

## Further watching

From the [HealthTech Decoded](https://www.youtube.com/@HealthTechDecoded) channel:

- [How EDI X12 278 works: prior authorization request and response](https://www.youtube.com/watch?v=dt7PB4jWZw0)
- [Why is prior authorization so complicated? Workflow + EDI 278](https://www.youtube.com/watch?v=uIPBsK4Gtn4)

## References

- [X12: 278 Health Care Services Review (transaction set list)](https://x12.org/products/transaction-sets)
- [CMS: Interoperability and Prior Authorization Final Rule (CMS-0057-F)](https://www.cms.gov/priorities/key-initiatives/burden-reduction/interoperability/policies-and-regulations/cms-interoperability-and-prior-authorization-final-rule-cms-0057-f)

## Where this fits

**Level 3 · Health data exchange** › [Healthcare EDI (ANSI X12)](/domains/healthcare/#edi-x12)

- Previous: [X12 270/271: Eligibility and Benefits Inquiry](/posts/domains/healthcare/edi-x12/x12-270-271-eligibility/)
- Next: [X12 837 Part 1: Submitter, Receiver, Provider, Subscriber and Patient Loops](/posts/domains/healthcare/edi-x12/x12-837-part-1-header-loops/)
