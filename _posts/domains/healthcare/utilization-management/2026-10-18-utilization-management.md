---
layout: post
title: "Utilization Management Explained"
description: "How payers review whether care is medically necessary (prospective, concurrent and retrospective review) and why it leads to denials."
date: 2026-10-20 00:30:00 +0530
categories: [domains, healthcare, utilization-management]
tags: [Healthcare, USHealthcare, UtilizationManagement, Payers]
domain: healthcare
domain_topic: utilization-management
domain_order: 1
image:
  path: /assets/img/domains/healthcare/utilization-management/utilization-management.webp
  alt: "Cover image: Utilization Management Explained"
---

Here's a situation that catches people out: a patient with good coverage is admitted to hospital in severe pain, stays two nights, and later receives a large bill because the insurer decided the inpatient stay "wasn't medically necessary". The creator of HealthTech Decoded describes exactly this happening to them. Nothing was wrong with their coverage. What they ran into was **utilization management**.

This post explains what utilization management (UM) is, the three kinds of review, who performs them, and how they lead to denials.

<!-- more -->

## What utilization management is

Utilization management is the set of techniques payers use to check that care is **necessary, appropriate and efficient** before, during or after it happens. It became widespread in the 1980s, when US healthcare costs started rising much faster than before, and payers needed a way to control spending without simply cutting benefits.

UM asks three questions about a proposed or delivered service:

1. Is it **medically necessary** for this patient's condition?
2. Is it delivered in the **right setting**? (For example, could this inpatient stay have been an outpatient observation visit?)
3. Is it **efficient**, without duplicate tests or treatment that runs longer than needed?

The answers rely on evidence-based clinical guidelines. Most payers license commercial criteria sets such as **InterQual** or **MCG**, and add their own medical policies on top.

## The three types of review

Reviews are classified by when they happen relative to the care.

### Prospective review (before care)

**Prospective review**, better known as **prior authorisation** or pre-authorisation, happens before treatment starts. The provider submits the proposed treatment and supporting clinical information, and the payer approves, modifies or denies it. Its main purpose is to avoid unnecessary or duplicate services.

Prospective review is **never required for emergency admissions**. You don't need permission to go to the emergency room. Prior auth has its own [step-by-step post](/posts/domains/healthcare/utilization-management/prior-authorization-workflow/).

### Concurrent review (during care)

**Concurrent review** happens while the patient is being treated, typically starting within 24 to 72 hours of an inpatient admission and repeating during the stay. Reviewers check:

- whether continued inpatient care is still needed;
- level-of-care changes, such as moving a patient from intensive care to a regular room;
- **discharge planning**, so the patient leaves when clinically ready and has the right follow-up care in place.

Concurrent review is where "additional days not approved" decisions come from.

### Retrospective review (after care)

**Retrospective review** happens after treatment is complete. It assesses whether the care was appropriate, effective and well timed, and is often used when deciding a claim or handling a denial. Retrospective findings also feed back into the evidence used for future reviews.

| Review | When | Main purpose | Typical outcome |
|---|---|---|---|
| Prospective | Before care | Avoid unnecessary or duplicate care | Authorisation number or denial |
| Concurrent | During care | Right level of care, length of stay and discharge | Days approved or denied |
| Retrospective | After care | Confirm appropriateness before or after payment | Claim paid, adjusted or denied |

## Who does the reviewing

Reviews are performed by a **utilization management organisation (UMO)**. It's either a department inside the payer or an external company the payer contracts with. A UMO's team includes nurses, physicians, specialists and sometimes independent review organisations. Nurses usually apply the criteria first; only a physician can make an adverse decision based on medical necessity, and the provider can ask for a **peer-to-peer** conversation with that physician.

## What gets reviewed

UM usually focuses on high-cost or high-variation services:

- inpatient admissions, and the number of days approved;
- admissions to skilled nursing facilities, and their length of stay;
- home health visits;
- high-cost imaging, such as MRI, CT and PET scans;
- specialty drugs and infusions;
- some outpatient surgeries and therapies;
- referrals to specialists, in some plans.

## How UM leads to denials

Most UM-related denials trace back to a few causes:

- **No prior authorisation** for a service that required one.
- **Not medically necessary**: the documentation didn't meet the criteria.
- **Wrong level of care**: an inpatient admission that the payer thinks should have been outpatient observation. This is the one that produces big surprise bills, because observation and inpatient stays are billed and covered differently.
- **Extra days not approved** during concurrent review.

Each of these can be appealed, and many denials are overturned on appeal when the provider supplies better documentation.

## Where it shows up in data

On the electronic side, UM requests and decisions travel as **X12 278** transactions between providers and UMOs: requests, responses, notifications of admission, and inquiries. The authorisation number from an approved 278 goes on the claim in `REF*G1`, and the payer matches it during adjudication. I go through the 278 in [its own post](/posts/domains/healthcare/edi-x12/x12-278-prior-authorization/).

## Patient tips

- Ask whether a planned admission or test needs **prior authorisation**, and who's responsible for getting it. It's usually the provider.
- If you're in hospital, ask whether you're admitted as an **inpatient** or held under **observation**. It changes what you pay.
- If a stay or service is denied, ask for the reason in writing, and appeal. The provider's documentation often decides the outcome.

## Conclusion

Utilization management is how payers check that care is necessary, in the right setting and efficient: before it happens (prospective), while it happens (concurrent) and after it's done (retrospective). It controls cost and reduces inappropriate care, and it's also why covered services sometimes get denied.

Next, follow a request end to end in [Prior Authorization: The Step-by-Step Workflow](/posts/domains/healthcare/utilization-management/prior-authorization-workflow/).

## Further watching

From the [HealthTech Decoded](https://www.youtube.com/@HealthTechDecoded) channel:

- [Why our medical claims get denied: utilisation management explained](https://www.youtube.com/watch?v=2sU_Mx6s4TA)

## Where this fits

**Level 2 · Core workflows** › [Utilization management and prior authorization](/domains/healthcare/#utilization-management)

- Previous: [Coordination of Benefits: When a Patient Has Two Plans](/posts/domains/healthcare/revenue-cycle/coordination-of-benefits/)
- Next: [Prior Authorization: The Step-by-Step Workflow](/posts/domains/healthcare/utilization-management/prior-authorization-workflow/)
