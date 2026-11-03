---
layout: post
title: "Medical Coding Basics: ICD-10-CM, CPT and HCPCS"
description: "The three code sets on every claim (diagnoses, procedures and supplies), plus modifiers and how codes link together."
date: 2026-10-20 00:30:00 +0530
categories: [domains, healthcare, revenue-cycle]
tags: [Healthcare, USHealthcare, MedicalCoding, ICD10, CPT]
domain: healthcare
domain_topic: revenue-cycle
domain_order: 3
image:
  path: /assets/img/domains/healthcare/revenue-cycle/medical-coding-icd10-cpt-hcpcs.webp
  alt: "Cover image: Medical Coding Basics: ICD-10-CM, CPT and HCPCS"
---

Every claim answers two questions in code: **why** did the patient need care, and **what** did the provider do about it? The "why" is a diagnosis code; the "what" is a procedure code. Get either wrong and the claim is denied, underpaid, or (worse) paid and later clawed back in an audit.

This post maps the code sets you'll see on US claims, what each one is for, and how they link together on a claim.

<!-- more -->

## The code sets at a glance

| Code set | Answers | Used on | Format | Maintained by |
|---|---|---|---|---|
| ICD-10-CM | Why: diagnoses, symptoms | All claims | 3–7 characters, starts with a letter (`J18.9`) | CDC / NCHS (US clinical modification) |
| ICD-10-PCS | What: inpatient procedures | Inpatient hospital claims | Exactly 7 characters (`5A1945Z`) | CMS |
| CPT (HCPCS Level I) | What: services and procedures by clinicians | Professional and outpatient claims | 5 digits (`99213`) | American Medical Association |
| HCPCS Level II | What: supplies, drugs, equipment, ambulance and some services | Professional, outpatient and supplier claims | A letter + 4 digits (`A9579`) | CMS |
| Revenue codes | Where in the hospital: department or type of charge | Institutional claims | 4 digits (`0450`) | National Uniform Billing Committee |

## ICD-10-CM: the diagnosis

**ICD-10-CM** (International Classification of Diseases, 10th revision, Clinical Modification) describes the patient's condition. Codes start with a letter and get more specific as they get longer:

- `J18.9`: pneumonia, unspecified organism
- `E11.9`: type 2 diabetes without complications
- `I10`: essential (primary) hypertension
- `R05.9`: cough, unspecified

Every claim needs at least one diagnosis, and payers use those diagnoses to judge **medical necessity**: does the diagnosis justify the procedure? An MRI billed with a diagnosis that doesn't support it is a quick denial.

On institutional claims, diagnoses come in roles: the **admitting** diagnosis (why the patient was admitted), the **principal** diagnosis (the main condition treated), and **other** diagnoses (comorbidities such as diabetes). From those, plus procedures, age and discharge status, a grouper assigns a **DRG** (diagnosis-related group), which drives payment for many inpatient stays.

## ICD-10-PCS: inpatient procedures

**ICD-10-PCS** is used only for procedures during an **inpatient** hospital stay. Each code is exactly seven characters, and every position means something: section, body system, operation, body part, approach, device and qualifier. For example, `5A1945Z` means respiratory ventilation for 24 to 96 consecutive hours.

Outpatient and professional claims don't use PCS. They use CPT and HCPCS.

## CPT: the clinician's services

**CPT** (Current Procedural Terminology), owned by the American Medical Association, covers what doctors and other clinicians do. It has three categories:

- **Category I:** five-digit codes for most services and procedures, such as `99213` (an office visit for an established patient) and `71046` (a two-view chest X-ray).
- **Category II:** codes ending in `F`, used to track quality measures. They aren't paid.
- **Category III:** codes ending in `T`, for new and emerging technology.

Office visits and other consultations use **evaluation and management (E/M)** codes, whose level depends on how complex the medical decision-making was, or how much time it took.

## HCPCS Level II: everything around the service

**HCPCS** (Healthcare Common Procedure Coding System, pronounced "hick-picks") has two levels. Level I *is* CPT. Level II, maintained by CMS, fills the gaps CPT leaves: things Medicare and Medicaid need to pay for that aren't a clinician's procedure.

- `A9579`: gadolinium-based MRI contrast, per ml
- `K0001`: standard wheelchair
- `E1390`: oxygen concentrator
- `A0427`: emergency ambulance, advanced life support level 1
- `J` codes: drugs given by injection or infusion, priced per unit of dose

[CPT vs HCPCS](/posts/domains/healthcare/revenue-cycle/cpt-vs-hcpcs/) goes through more examples, including how both appear on one claim.

## Modifiers: changing a code's meaning

A **modifier** is a two-character code attached to a CPT or HCPCS code to add detail without inventing a new code. Common ones:

| Modifier | Meaning | Example |
|---|---|---|
| `26` | Professional component only | The radiologist reading a chest X-ray |
| `TC` | Technical component only | The facility taking the X-ray |
| `25` | A separate E/M service on the same day as a procedure | An office visit plus a minor procedure |
| `59` | Distinct procedural service | Two procedures that would normally be bundled |
| `LT` / `RT` | Left or right side | Knee injections |

Modifiers change payment: `26` and `TC` split one procedure's price between the doctor and the facility. A missing or wrong modifier is a very common denial reason.

## Linking diagnoses to procedures

A claim isn't just two lists of codes. Each service line **points** at the diagnoses that justify it. In the X12 837 professional claim, diagnoses are listed once at the claim level (the `HI` segment), and each service line refers to them by position with **diagnosis pointers**:

```text
HI*ABK:J189*ABF:E119*ABF:I10~
LX*1~
SV1*HC:99213*150*UN*1***1:2~
LX*2~
SV1*HC:71046*120*UN*1***1~
```

Line 1, the office visit, points at diagnoses 1 and 2 (pneumonia and diabetes). Line 2, the chest X-ray, points only at pneumonia. If the pointers are wrong, a payer can deny a line as not medically necessary even though the right diagnosis is on the claim. [837 Part 3](/posts/domains/healthcare/edi-x12/x12-837-part-3-service-lines/) covers the service line segments in detail.

## Institutional extras: revenue codes and bill types

Hospital (institutional) claims add **revenue codes**, which say which department or kind of charge each line belongs to. For example, `0450` is the emergency room, `0300` is the lab and `0120` is a semi-private room. Outpatient hospital lines usually carry both a revenue code and a CPT or HCPCS code.

## Common pitfalls

- **Codes change every year.** ICD-10-CM updates each October, and CPT and HCPCS on their own schedules. Systems need versioned code tables keyed by date of service.
- **Specificity matters.** Unspecified codes are allowed but invite denials and audits when a more specific code exists.
- **CPT is licensed.** Using CPT descriptions in software requires a licence from the AMA; the codes themselves are widely published, but the descriptors aren't free to redistribute.
- **ICD-10-PCS vs CPT.** Using PCS on outpatient claims, or CPT for inpatient facility procedures, is a structural error.

## Conclusion

ICD-10-CM says why; CPT, HCPCS Level II and (for inpatient stays) ICD-10-PCS say what. Modifiers refine a procedure, revenue codes place it in the hospital, and diagnosis pointers tie each line to its reason. Together, those codes decide whether a claim is paid and how much.

Next, see [CPT vs HCPCS](/posts/domains/healthcare/revenue-cycle/cpt-vs-hcpcs/) with real examples.

## Further watching

From the [HealthTech Decoded](https://www.youtube.com/@HealthTechDecoded) channel:

- [How to never confuse CPT and HCPCS](https://www.youtube.com/watch?v=KRfZ11ehYK4)

## References

- [CMS: ICD-10 code sets](https://www.cms.gov/medicare/coding-billing/icd-10-codes)
- [CMS: HCPCS Level II coding overview](https://www.cms.gov/medicare/coding-billing/healthcare-common-procedure-system)
- [AMA: CPT overview](https://www.ama-assn.org/practice-management/cpt)

## Where this fits

**Level 2 · Core workflows** › [Revenue cycle, coding and claims](/domains/healthcare/#revenue-cycle)

- Previous: [Patient Registration and Eligibility & Benefits Verification](/posts/domains/healthcare/revenue-cycle/eligibility-and-benefits-verification/)
- Next: [CPT vs HCPCS: Real Examples to Tell Them Apart](/posts/domains/healthcare/revenue-cycle/cpt-vs-hcpcs/)
