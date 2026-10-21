---
layout: post
title: "HIPAA Explained: Covered Entities, Business Associates and the Rules"
description: "What HIPAA requires, who it applies to, and its Privacy, Security, Breach Notification, Enforcement and Transactions rules, plus the Omnibus update."
date: 2026-10-20 00:30:00 +0530
categories: [domains, healthcare, compliance]
tags: [Healthcare, USHealthcare, HIPAA, Compliance]
domain: healthcare
domain_topic: compliance
domain_order: 1
image:
  path: /assets/img/domains/healthcare/compliance/hipaa-explained.webp
  alt: "Cover image: HIPAA Explained: Covered Entities, Business Associates and the Rules"
---

Ever wondered why a clinic won't read your test results over the phone, or why every email with your lab report is password-protected? That's HIPAA. One overheard conversation or one misdirected email can lead to a federal investigation, and fines for repeated failures run into the millions. For anyone building software that touches health data, HIPAA isn't background reading. It decides how you store, share, log and encrypt everything.

This post covers what HIPAA protects, who has to comply, its rules, the 2013 Omnibus changes, and what counts as a violation.

<!-- more -->

## What HIPAA is

The **Health Insurance Portability and Accountability Act** is a federal law passed in **1996**. It was originally about letting people keep insurance when changing jobs (the "portability" part), but its lasting impact comes from the "administrative simplification" rules it created: privacy, security, and standard electronic transactions.

## What it protects: PHI

HIPAA protects **protected health information (PHI)**: information that identifies a person *and* relates to their health, their care or payment for it. That includes information created or shared while providing care, and in some research settings. Stored or sent electronically, it's called **ePHI**.

What makes information identifying? HIPAA lists 18 identifiers, including:

- names and addresses smaller than a state;
- dates related to a person (birth, admission, discharge), except the year;
- phone numbers and email addresses;
- Social Security numbers, medical record numbers and health plan member IDs;
- device identifiers, IP addresses and URLs;
- full-face photographs and biometric identifiers.

A lab result on its own isn't PHI. A lab result next to a name or member ID is.

## Who must comply

HIPAA applies to two groups.

**Covered entities** deal with PHI directly:

- **health plans**: insurers, HMOs, Medicare, Medicaid, employer group health plans;
- **health care clearinghouses**, which convert and route health data;
- **health care providers** who send health information electronically for transactions such as claims.

**Business associates** are people and companies that do work for a covered entity and handle PHI along the way: billing companies, claims processors, IT and cloud providers, consultants, and anyone building EDI or claims software. They must sign a **business associate agreement (BAA)**, and since 2013 they're directly liable for violations too.

A simple example: in a clinic, the doctors, nurses and phlebotomists work for a covered entity. The company that runs the patient app showing lab results, and the vendor that sends claims electronically, are business associates.

## The rules

HIPAA's requirements are split into rules, each with a different job.

| Rule | What it governs | One-line version |
|---|---|---|
| Privacy Rule | Who can use or see PHI, and when; patients' rights to their records | Don't share without a reason or permission |
| Security Rule | Administrative, physical and technical safeguards for ePHI | Lock it down |
| Breach Notification Rule | When and how to report a breach of unsecured PHI | Tell people quickly |
| Enforcement Rule | Investigations and civil money penalties | Penalties apply |
| Transactions and Code Sets Rule | Standard formats for electronic transactions, such as X12 and ICD-10 | Everyone speaks the same language |
| Unique Identifiers Rule | Standard IDs, such as the NPI for providers and the EIN for employers | One ID per entity |

A few details worth knowing:

- The **Privacy Rule** allows PHI to be used for treatment, payment and healthcare operations without a patient's authorisation, but requires only the **minimum necessary** for other purposes. It also gives patients the right to see and get a copy of their records.
- The **Security Rule** requires a documented **risk analysis**, access controls, audit logs, integrity controls and transmission security. Encryption is technically "addressable", but in practice it's expected everywhere.
- The **Breach Notification Rule** requires notifying affected individuals without unreasonable delay, and no later than **60 days** after discovery. Breaches affecting 500 or more people must also be reported to HHS, and to the media in the affected area.
- The **Transactions and Code Sets Rule** is why claims are sent in **X12 5010** format and diagnoses in ICD-10. It's the reason the [EDI posts](/posts/domains/healthcare/edi-x12/healthcare-edi-x12-introduction/) in this series exist.

## The 2013 Omnibus Rule

The **Omnibus Final Rule** of 2013 updated HIPAA to match the HITECH Act of 2009. Its main changes:

- **Business associates became directly liable** for compliance, as did their subcontractors.
- **Tiered civil penalties** were introduced, based on the level of fault, from "didn't know" to "wilful neglect, not corrected".
- **Stricter breach notification**: any impermissible disclosure is presumed to be a breach unless a risk assessment shows a low probability that PHI was compromised.
- **Stronger patient rights**: selling PHI or using it for most marketing now requires authorisation, and patients can get electronic copies of their records.

## What counts as a violation

Violations usually come from process failures, not hackers. Common causes found in enforcement actions:

- no proper, organisation-wide **risk analysis**;
- inadequate **workforce training** on handling PHI;
- **impermissible disclosures**, such as faxes to the wrong number, emails to the wrong patient, or records left visible;
- **missing BAAs** with vendors who handle PHI;
- ignoring patients' **right of access** to their own records;
- **late breach reporting**.

Penalties are set per violation and capped per year, with the caps adjusted for inflation. For the most serious tier, the annual cap is now over $2 million per provision violated. Settlements with HHS often include a multi-year corrective action plan, which can cost more than the fine.

## What it means for engineers

- **Sign a BAA** with every vendor that touches PHI, including your cloud provider.
- **Encrypt** data at rest and in transit, and manage keys properly.
- **Log access** to PHI and review the logs.
- Apply **least privilege** to every role, service account and API.
- Use **de-identified data** in development and testing. [De-identifying PHI in X12 files](/posts/domains/healthcare/healthtech-engineering/deidentify-phi-in-x12-with-python/) shows one way to do that.

## Conclusion

HIPAA protects identifiable health information, applies to covered entities and their business associates, and is enforced through six rules covering privacy, security, breach notification, enforcement, transactions and identifiers. The 2013 Omnibus Rule made vendors directly liable and stiffened penalties. In practice, it's the seat belt for health data: easy to ignore until something goes wrong.

## Further watching

From the [HealthTech Decoded](https://www.youtube.com/@HealthTechDecoded) channel:

- [Do you know all 6 HIPAA rules?](https://www.youtube.com/watch?v=O9Ci1DOeet4)
- [HIPAA: the law protecting your personal health records (short)](https://www.youtube.com/shorts/3WVdQ2BWHdw)

## References

- [HHS: Summary of the HIPAA Privacy Rule](https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html)
- [HHS: Summary of the HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
- [HHS: Breach Notification Rule](https://www.hhs.gov/hipaa/for-professionals/breach-notification/index.html)
- [HHS: Omnibus HIPAA Rulemaking](https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/combined-regulation-text/omnibus-hipaa-rulemaking/index.html)

## Where this fits

**Level 2 · Core workflows** › [HIPAA, privacy and regulation](/domains/healthcare/#compliance)

- Previous: [Prior Authorization: The Step-by-Step Workflow](/posts/domains/healthcare/utilization-management/prior-authorization-workflow/)
- Next: [PHI, the 18 Identifiers and the Minimum Necessary Standard](/posts/domains/healthcare/compliance/phi-and-minimum-necessary/)
